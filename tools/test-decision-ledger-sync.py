#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("check-decision-ledger-sync.py")
SPEC = importlib.util.spec_from_file_location("decision_ledger_sync", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class CurrentSurfaceFreshnessTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tempdir.name)
        (self.root / "docs/decision-system").mkdir(parents=True)
        (self.root / "docs").mkdir(exist_ok=True)
        (self.root / ".product-loop").mkdir()

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def write(self, relative: str, value: str) -> None:
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(value, encoding="utf-8")

    def write_machine(self, value: dict[str, object]) -> None:
        self.write(".product-loop/state.json", json.dumps(value))

    def test_missing_current_surface_bindings_are_not_inferred_from_tail_markers(self) -> None:
        self.write("docs/decision-system/current-state.md", "- latestRecordedStep: `9`\n")
        self.write("docs/product-loop-current.md", "- latestRecordedStep: `9`\n")
        self.write("docs/decision-system/README.md", "- latestRecordedStep: `9`\n")
        self.write_machine({"latest_decision_step": 9})

        self.assertEqual(MODULE.current_surface_steps(self.root), {
            "currentConclusion": None,
            "currentHandoff": None,
            "currentBoundary": None,
            "machineCurrentSurface": None,
        })

    def test_all_current_surface_bindings_must_match_latest_step(self) -> None:
        self.write("docs/decision-system/current-state.md", "- currentConclusionForStep: `9`\n")
        self.write("docs/product-loop-current.md", "- currentHandoffForStep: `9`\n")
        self.write("docs/decision-system/README.md", "- currentBoundaryForStep: `8`\n")
        self.write_machine({"current_surface_step": 9})

        values = MODULE.current_surface_steps(self.root)
        self.assertEqual(values["currentBoundary"], 8)
        self.assertFalse(all(value == 9 for value in values.values()))

    def test_gate_notes_are_latest_owned_except_exact_historical_ci(self) -> None:
        machine = {
            "gates": {
                "product": {"status": "fail", "note": "step9-product-fail"},
                "design": {"status": "fail", "note": "step8-old-design-fail"},
                "security": {"status": "fail", "note": "historical-not-allowed-here"},
                "ci-linux": {"status": "pass", "note": "historical-exact-deadbeef-linux-pass"},
            }
        }

        self.assertEqual(MODULE.stale_gate_notes(machine, 9), [
            {"gate": "design", "status": "fail", "note": "step8-old-design-fail"},
            {"gate": "security", "status": "fail", "note": "historical-not-allowed-here"},
        ])

    def test_missing_local_machine_state_uses_tracked_current_authority(self) -> None:
        self.write(
            "docs/decision-system/current-state.md",
            "- latestRecordedStep: `9`\n"
            "- latestStepOutcome: `9:release-fail`\n"
            "- currentConclusionForStep: `9`\n",
        )

        machine, available = MODULE.load_machine_state(self.root)

        self.assertFalse(available)
        self.assertEqual(machine["latest_decision_step"], 9)
        self.assertEqual(machine["latest_decision_outcome"], "9:release-fail")
        self.assertEqual(machine["current_surface_step"], 9)
        self.assertEqual(machine["gates"], {})

    def test_malformed_local_machine_state_uses_tracked_current_authority(self) -> None:
        self.write(
            "docs/decision-system/current-state.md",
            "- latestRecordedStep: `9`\n"
            "- latestStepOutcome: `9:release-fail`\n"
            "- currentConclusionForStep: `9`\n",
        )
        self.write_machine({"objective": "legacy", "gates": {}})

        machine, available = MODULE.load_machine_state(self.root)

        self.assertFalse(available)
        self.assertEqual(machine["latest_decision_step"], 9)
        self.assertEqual(machine["latest_decision_outcome"], "9:release-fail")
        self.assertEqual(machine["current_surface_step"], 9)
        self.assertEqual(machine["gates"], {})
    def test_authority_headers_bind_current_surfaces_and_fail_closed_gate(self) -> None:
        self.write("docs/decision-system/current-state.md", "- currentConclusionForStep: `9`\n**FAIL overall\n")
        self.write("docs/decision-system/README.md", "- latestRecordedStep: `9`\n")
        self.write("docs/product-loop-current.md", "- currentHandoffForStep: `9`\n**FAIL overall\n| Current product release | `fail` |\n")
        self.write("docs/panel-redesign-decision-log.md", "status: `historical-journal`\n当前权威来源：`docs/decision-system/current-state.md`\n")
        self.write_machine({"latest_decision_step": 9, "current_surface_step": 9})

        state = MODULE.authority_header_state(self.root)
        self.assertEqual(state["currentStateHeader"], 9)
        self.assertEqual(state["decisionIndexHeader"], 9)
        self.assertEqual(state["loopHandoffHeader"], 9)
        self.assertEqual(state["machineLatestStep"], 9)
        self.assertEqual(state["machineCurrentSurface"], 9)
        self.assertTrue(state["journalHistorical"])
        self.assertTrue(state["journalAuthorityPointer"])
        self.assertTrue(state["currentStateFail"])
        self.assertTrue(state["handoffFail"])


if __name__ == "__main__":
    unittest.main()
