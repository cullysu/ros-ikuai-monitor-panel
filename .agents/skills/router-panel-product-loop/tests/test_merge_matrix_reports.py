#!/usr/bin/env python3
"""Focused regression coverage for strict matrix-report aggregation."""

from __future__ import annotations

import json
import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any


WORKSPACE = Path(__file__).resolve().parents[4]
MERGER = WORKSPACE / ".agents/skills/router-panel-product-loop/scripts/merge_matrix_reports.py"
VIEWPORT = {"name": "desktop", "width": 1366, "height": 768}


def load_merger_module() -> Any:
    spec = importlib.util.spec_from_file_location("merge_matrix_reports", MERGER)
    if spec is None or spec.loader is None:
        raise RuntimeError("unable to load merge_matrix_reports module")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class MergeMatrixReportsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.candidate = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=WORKSPACE, text=True
        ).strip()
        self.tempdir = tempfile.TemporaryDirectory(dir=WORKSPACE / "_acceptance")
        self.root = Path(self.tempdir.name)

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def report(
        self,
        *,
        scenario: str = "single",
        candidate: str | None = None,
        checks: list[dict[str, Any]] | None = None,
        failures: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        cell = {
            "profile": "public",
            "scaleScenario": scenario,
            "section": "overview",
            "viewportKey": "desktop=1366x768",
            "viewport": VIEWPORT,
            "pass": True,
        }
        browser = {
            "profile": "public",
            "scaleScenario": scenario,
            "requestedSection": "overview",
            "viewport": VIEWPORT,
            "pass": True,
        }
        return {
            "checks": checks if checks is not None else [{"name": "runtime", "pass": True}],
            "failures": failures if failures is not None else [],
            "warnings": [],
            "browserChecks": [browser],
            "pass": True,
            "exitCodeShouldFail": False,
            "matrix": {
                "commit": candidate or self.candidate,
                "failed": 0,
                "total": 1,
                "passed": 1,
                "complete": True,
                "cells": [cell],
            },
        }

    def write_report(self, name: str, value: dict[str, Any]) -> Path:
        path = self.root / name
        path.write_text(json.dumps(value), encoding="utf-8")
        return path

    def merge(self, reports: list[Path], scenarios: str = "single") -> subprocess.CompletedProcess[str]:
        output = self.root / "merged.json"
        command = [
            sys.executable,
            str(MERGER),
            "--workspace",
            str(WORKSPACE),
            "--output",
            str(output.relative_to(WORKSPACE)),
            "--candidate",
            self.candidate,
            "--profile",
            "public",
            "--scenarios",
            scenarios,
            "--sections",
            "overview",
            "--viewports",
            "desktop=1366x768",
            *[str(path.relative_to(WORKSPACE)) for path in reports],
        ]
        return subprocess.run(command, cwd=WORKSPACE, text=True, capture_output=True, check=False)

    def test_rejects_applicable_false_check_when_failures_are_empty(self) -> None:
        source = self.write_report(
            "false-check.json",
            self.report(checks=[{"name": "real regression", "pass": False}]),
        )

        result = self.merge([source])

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("applicable check failed", result.stderr)
        self.assertFalse((self.root / "merged.json").exists())

    def test_rejects_nested_false_pass_even_when_flat_check_is_green(self) -> None:
        source = self.write_report(
            "nested-false-check.json",
            self.report(checks=[{
                "name": "runtime wrapper",
                "pass": True,
                "detail": {"childContract": {"pass": False}},
            }]),
        )

        result = self.merge([source])

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("report contains nested pass=false", result.stderr)
        self.assertFalse((self.root / "merged.json").exists())

    def test_rejects_failure_list_that_would_otherwise_be_cleared(self) -> None:
        source = self.write_report(
            "failure-list.json",
            self.report(failures=[{"name": "hidden failure", "pass": False}]),
        )

        result = self.merge([source])

        self.assertNotEqual(result.returncode, 0)
        self.assertRegex(result.stderr, r"failures must be empty|matrix\.complete must be true")
        self.assertFalse((self.root / "merged.json").exists())

    def test_rejects_checkpoint_failure_instead_of_greenwashing_it(self) -> None:
        checkpoint = {
            "name": "unified release scenario matrix covers required scenarios",
            "pass": False,
            "detail": {
                "commit": self.candidate,
                "currentRequestedComplete": True,
                "currentRequiredComplete": False,
                "aggregateComplete": False,
                "releaseMatrixComplete": False,
            },
        }
        report = self.report(checks=[checkpoint], failures=[checkpoint])
        report["matrix"].update({
            "requestedComplete": True,
            "complete": False,
            "coveredScenarios": ["single"],
            "passedScenarios": ["single"],
        })
        source = self.write_report("checkpoint-failure.json", report)

        result = self.merge([source])

        self.assertNotEqual(result.returncode, 0)
        self.assertRegex(result.stderr, r"failures must be empty|matrix\.complete must be true")
        self.assertFalse((self.root / "merged.json").exists())

    def test_preserves_explicit_not_applicable_check_without_failing_merge(self) -> None:
        not_applicable = {
            "name": "WAN trend is unavailable for this scenario",
            "applicable": False,
            "status": "not_applicable",
            "pass": None,
            "reason": "No current snapshot exists.",
        }
        source = self.write_report(
            "not-applicable.json",
            self.report(checks=[{"name": "runtime", "pass": True}, not_applicable]),
        )

        result = self.merge([source])

        self.assertEqual(result.returncode, 0, result.stderr)
        merged = json.loads((self.root / "merged.json").read_text(encoding="utf-8"))
        self.assertTrue(merged["pass"])
        self.assertEqual(merged["failures"], [])
        self.assertIn(not_applicable, merged["checks"])

    def test_final_merged_truth_is_derived_from_assembled_tree(self) -> None:
        source = self.write_report("valid.json", self.report())
        result = self.merge([source])

        self.assertEqual(result.returncode, 0, result.stderr)
        merged = json.loads((self.root / "merged.json").read_text(encoding="utf-8"))
        self.assertTrue(merged["pass"])
        self.assertFalse(merged["exitCodeShouldFail"])

        # The finalizer must fail closed if a future change adds a nested
        # evidence failure after the input checks have already passed.
        merged["detail"] = {"postAssemblyEvidence": {"pass": False}}
        load_merger_module().finalize_merged_truth(merged)
        self.assertFalse(merged["pass"])
        self.assertTrue(merged["failures"])

    def test_finalizer_cannot_clear_reported_failure_or_incomplete_matrix(self) -> None:
        merged = self.report()
        merged["failures"] = [{"name": "required child omitted", "pass": True}]
        merged["matrix"]["complete"] = False
        merged["matrix"]["requestedComplete"] = False

        load_merger_module().finalize_merged_truth(merged)

        self.assertFalse(merged["pass"])
        self.assertTrue(merged["exitCodeShouldFail"])
        self.assertTrue(any(failure["name"] == "merged reported failures" for failure in merged["failures"]))
        self.assertTrue(any(failure["name"] == "merged matrix completeness" for failure in merged["failures"]))

    def test_rejects_invalid_not_applicable_shape(self) -> None:
        source = self.write_report(
            "invalid-not-applicable.json",
            self.report(checks=[{"name": "opaque skip", "applicable": False, "pass": False}]),
        )

        result = self.merge([source])

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("invalid not_applicable shape", result.stderr)

    def test_rejects_candidate_mismatch(self) -> None:
        source = self.write_report(
            "wrong-candidate.json",
            self.report(candidate="0" * 40),
        )

        result = self.merge([source])

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("matrix.commit", result.stderr)

    def test_rejects_root_false_even_when_children_are_green(self) -> None:
        report = self.report()
        report["pass"] = False
        source = self.write_report("root-false.json", report)

        result = self.merge([source])

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("report.pass must be true", result.stderr)
        self.assertFalse((self.root / "merged.json").exists())

    def test_rejects_exit_code_failure_even_when_root_is_green(self) -> None:
        report = self.report()
        report["exitCodeShouldFail"] = True
        source = self.write_report("exit-code-failure.json", report)

        result = self.merge([source])

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("exitCodeShouldFail must be false", result.stderr)
        self.assertFalse((self.root / "merged.json").exists())

    def test_rejects_incomplete_matrix_even_when_cells_are_green(self) -> None:
        report = self.report()
        report["matrix"]["complete"] = False
        source = self.write_report("incomplete-matrix.json", report)

        result = self.merge([source])

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("matrix.complete must be true", result.stderr)
        self.assertFalse((self.root / "merged.json").exists())

    def test_rejects_duplicate_and_missing_cells(self) -> None:
        first = self.write_report("single.json", self.report())
        duplicate = self.write_report("duplicate.json", self.report())

        duplicate_result = self.merge([first, duplicate])
        self.assertNotEqual(duplicate_result.returncode, 0)
        self.assertIn("duplicate matrix cell", duplicate_result.stderr)

        missing_result = self.merge([first], scenarios="single,fleet")
        self.assertNotEqual(missing_result.returncode, 0)
        self.assertIn("incomplete merge", missing_result.stderr)


if __name__ == "__main__":
    unittest.main()
