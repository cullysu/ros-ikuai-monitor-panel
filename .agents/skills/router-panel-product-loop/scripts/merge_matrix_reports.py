#!/usr/bin/env python3
"""Merge checkpointed local-predeploy matrix reports after strict cell validation."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import subprocess
from pathlib import Path
from typing import Any


def csv(value: str) -> list[str]:
    items = [item.strip() for item in value.split(",") if item.strip()]
    if not items or len(items) != len(set(items)):
        raise argparse.ArgumentTypeError("value must contain unique comma-separated items")
    return items


def viewport(value: str) -> tuple[str, int, int]:
    try:
        name, dimensions = value.split("=", 1)
        width, height = dimensions.lower().split("x", 1)
        result = (name.strip(), int(width), int(height))
    except (TypeError, ValueError) as error:
        raise argparse.ArgumentTypeError(f"invalid viewport {value!r}") from error
    if not result[0] or result[1] <= 0 or result[2] <= 0:
        raise argparse.ArgumentTypeError(f"invalid viewport {value!r}")
    return result


def parse_viewports(value: str) -> list[tuple[str, int, int]]:
    result = [viewport(item) for item in value.split(",") if item.strip()]
    names = [item[0] for item in result]
    if not result or len(names) != len(set(names)):
        raise argparse.ArgumentTypeError("viewports must be unique name=WIDTHxHEIGHT items")
    return result


def git_head(workspace: Path, candidate: str) -> str:
    return subprocess.check_output(
        ["git", "rev-parse", candidate],
        cwd=workspace,
        text=True,
    ).strip()


def matrix_id(cell: dict[str, Any]) -> str:
    return "::".join([
        str(cell.get("profile") or ""),
        str(cell.get("scaleScenario") or ""),
        str(cell.get("section") or ""),
        str(cell.get("viewportKey") or ""),
    ])


def browser_id(cell: dict[str, Any]) -> str:
    viewport_value = cell.get("viewport") if isinstance(cell.get("viewport"), dict) else {}
    return "::".join([
        str(cell.get("profile") or ""),
        str(cell.get("scaleScenario") or ""),
        str(cell.get("requestedSection") or ""),
        f"{viewport_value.get('name') or ''}={viewport_value.get('width')}x{viewport_value.get('height')}",
    ])


def expected_ids(
    profile: str,
    scenarios: list[str],
    sections: list[str],
    viewports: list[tuple[str, int, int]],
) -> list[str]:
    return [
        f"{profile}::{scenario}::{section}::{name}={width}x{height}"
        for scenario in scenarios
        for section in sections
        for name, width, height in viewports
    ]


def regular_file_within(workspace: Path, value: str) -> Path:
    path = (workspace / value).resolve() if not Path(value).is_absolute() else Path(value).resolve()
    try:
        path.relative_to(workspace)
    except ValueError as error:
        raise RuntimeError(f"report escapes workspace: {path}") from error
    if not path.is_file() or path.is_symlink():
        raise RuntimeError(f"report is not a regular file: {path}")
    return path


def read_report(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise RuntimeError(f"report root is not an object: {path}")
    return value


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def atomic_write(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(value, ensure_ascii=True, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    temporary.replace(path)


def checkpoint_only_failures(
    failures: Any,
    matrix: dict[str, Any],
    candidate: str,
) -> bool:
    if failures == []:
        return True
    if not isinstance(failures, list) or len(failures) != 1:
        return False

    failure = failures[0]
    if not isinstance(failure, dict):
        return False
    if failure.get("name") != "unified release scenario matrix covers required scenarios":
        return False
    if failure.get("pass") is not False:
        return False

    detail = failure.get("detail")
    if not isinstance(detail, dict):
        return False
    if detail.get("commit") != candidate:
        return False
    if detail.get("currentRequestedComplete") is not True:
        return False
    if detail.get("currentRequiredComplete") is not False:
        return False
    if detail.get("aggregateComplete") is not False:
        return False
    if detail.get("releaseMatrixComplete") is not False:
        return False

    covered = detail.get("currentCoveredScenarios")
    passed = detail.get("currentPassedScenarios")
    matrix_covered = matrix.get("coveredScenarios")
    matrix_passed = matrix.get("passedScenarios")
    scenario_lists = (covered, passed, matrix_covered, matrix_passed)
    if not all(isinstance(value, list) and value for value in scenario_lists):
        return False
    if any(len(value) != len(set(value)) for value in scenario_lists):
        return False
    if set(covered) != set(passed):
        return False
    if set(covered) != set(matrix_covered) or set(passed) != set(matrix_passed):
        return False
    if matrix.get("requestedComplete") is not True or matrix.get("complete") is not False:
        return False
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--candidate", default="HEAD")
    parser.add_argument("--profile", required=True)
    parser.add_argument("--scenarios", type=csv, required=True)
    parser.add_argument("--sections", type=csv, required=True)
    parser.add_argument("--viewports", type=parse_viewports, required=True)
    parser.add_argument("reports", nargs="+")
    args = parser.parse_args()

    workspace = Path(args.workspace).resolve()
    candidate = git_head(workspace, args.candidate)
    output = (workspace / args.output).resolve() if not Path(args.output).is_absolute() else Path(args.output).resolve()
    try:
        output.relative_to(workspace)
    except ValueError as error:
        raise RuntimeError(f"output escapes workspace: {output}") from error

    report_paths = [regular_file_within(workspace, item) for item in args.reports]
    if output in report_paths:
        raise RuntimeError("output cannot overwrite an input report")

    wanted = expected_ids(args.profile, args.scenarios, args.sections, args.viewports)
    wanted_set = set(wanted)
    matrix_by_id: dict[str, dict[str, Any]] = {}
    browser_by_id: dict[str, dict[str, Any]] = {}
    merged_checks: list[dict[str, Any]] = []
    merged_warnings: list[Any] = []
    provenance = []
    template: dict[str, Any] | None = None

    for path in report_paths:
        report = read_report(path)
        matrix = report.get("matrix") if isinstance(report.get("matrix"), dict) else {}
        if matrix.get("commit") != candidate:
            raise RuntimeError(f"{path}: matrix.commit {matrix.get('commit')} != {candidate}")
        failures = report.get("failures")
        if matrix.get("failed") != 0:
            raise RuntimeError(f"{path}: matrix.failed must be zero")
        cells = matrix.get("cells")
        browser_checks = report.get("browserChecks")
        if not isinstance(cells, list) or not cells:
            raise RuntimeError(f"{path}: matrix.cells is empty")
        if not isinstance(browser_checks, list) or len(browser_checks) != len(cells):
            raise RuntimeError(f"{path}: browserChecks does not match matrix.cells")

        local_ids = set()
        for cell in cells:
            cell_id = matrix_id(cell)
            if cell_id not in wanted_set:
                raise RuntimeError(f"{path}: unexpected matrix cell {cell_id}")
            if cell_id in local_ids or cell_id in matrix_by_id:
                raise RuntimeError(f"{path}: duplicate matrix cell {cell_id}")
            if cell.get("pass") is not True:
                raise RuntimeError(f"{path}: failed matrix cell {cell_id}")
            local_ids.add(cell_id)
            matrix_by_id[cell_id] = cell

        for cell in browser_checks:
            cell_id = browser_id(cell)
            if cell_id not in wanted_set:
                raise RuntimeError(f"{path}: unexpected browser cell {cell_id}")
            if cell_id in browser_by_id:
                raise RuntimeError(f"{path}: duplicate browser cell {cell_id}")
            if cell.get("pass") is not True:
                raise RuntimeError(f"{path}: failed browser cell {cell_id}")
            browser_by_id[cell_id] = cell

        if set(browser_by_id).intersection(local_ids) != local_ids:
            missing = sorted(local_ids - set(browser_by_id))
            raise RuntimeError(f"{path}: browser cells missing for {missing[:3]}")
        if not checkpoint_only_failures(failures, matrix, candidate):
            raise RuntimeError(f"{path}: contains non-checkpoint failures")

        merged_checks.extend(item for item in report.get("checks", []) if isinstance(item, dict))
        merged_warnings.extend(report.get("warnings", []) if isinstance(report.get("warnings"), list) else [])
        provenance.append({
            "path": str(path.relative_to(workspace)).replace("\\", "/"),
            "sha256": digest(path),
            "cells": len(cells),
        })
        template = report

    missing_matrix = [cell_id for cell_id in wanted if cell_id not in matrix_by_id]
    missing_browser = [cell_id for cell_id in wanted if cell_id not in browser_by_id]
    if missing_matrix or missing_browser or len(matrix_by_id) != len(wanted) or len(browser_by_id) != len(wanted):
        raise RuntimeError(
            f"incomplete merge: matrix missing={len(missing_matrix)}, "
            f"browser missing={len(missing_browser)}, expected={len(wanted)}"
        )
    if template is None:
        raise RuntimeError("no reports were loaded")

    merged = copy.deepcopy(template)
    merged["checks"] = merged_checks
    merged["warnings"] = merged_warnings
    merged["failures"] = []
    merged["browserChecks"] = [browser_by_id[cell_id] for cell_id in wanted]
    merged["pass"] = True
    merged["exitCodeShouldFail"] = False
    merged["matrix"] = {
        **(template.get("matrix") if isinstance(template.get("matrix"), dict) else {}),
        "commit": candidate,
        "requestedScenarios": args.scenarios,
        "coveredScenarios": args.scenarios,
        "passedScenarios": args.scenarios,
        "cells": [matrix_by_id[cell_id] for cell_id in wanted],
        "total": len(wanted),
        "passed": len(wanted),
        "failed": 0,
        "requestedComplete": True,
        "complete": True,
        "checkpointMerge": {
            "profile": args.profile,
            "sections": args.sections,
            "viewports": [
                {"name": name, "width": width, "height": height}
                for name, width, height in args.viewports
            ],
            "inputs": provenance,
        },
    }
    atomic_write(output, merged)
    print(json.dumps({
        "output": str(output),
        "candidate": candidate,
        "cells": len(wanted),
        "inputs": len(report_paths),
    }))


if __name__ == "__main__":
    main()
