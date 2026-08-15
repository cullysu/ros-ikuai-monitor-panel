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


def explicitly_not_applicable(check: dict[str, Any]) -> bool:
    """Return whether a check is explicitly excluded from this matrix scope.

    A skipped check is evidence, not an absent or failed check.  Keeping this
    shape strict prevents a producer from relabelling an arbitrary failure as
    non-applicable during aggregation.
    """

    return (
        check.get("applicable") is False
        and check.get("status") == "not_applicable"
        and check.get("pass") is None
        and isinstance(check.get("reason"), str)
        and bool(check["reason"].strip())
    )


def false_pass_paths(value: Any, current_path: str = "") -> list[str]:
    """Find every nested ``pass: false`` before a report can be merged.

    A report is a tree, not only a flat ``checks`` list.  A producer that puts a
    failed child under ``detail`` or another nested evidence object must not be
    able to keep the root green by clearing ``failures`` during aggregation.
    Explicit non-applicability uses ``pass: null`` and is therefore unaffected.
    """

    if isinstance(value, dict):
        paths: list[str] = []
        for key, child in value.items():
            child_path = f"{current_path}/{key}"
            if key == "pass" and child is False:
                paths.append(child_path)
            paths.extend(false_pass_paths(child, child_path))
        return paths
    if isinstance(value, list):
        paths: list[str] = []
        for index, child in enumerate(value):
            paths.extend(false_pass_paths(child, f"{current_path}/{index}"))
        return paths
    return []


def validate_checks(path: Path, checks: Any, failures: Any) -> list[dict[str, Any]]:
    """Validate report evidence before it can contribute to a green merge.

    The merger never infers non-applicability from a check name or detail
    payload.  A false applicable check and every failure-list entry are hard
    failures; an explicitly structured non-applicable check is preserved.
    """

    if not isinstance(checks, list):
        raise RuntimeError(f"{path}: checks must be a list")
    if not isinstance(failures, list):
        raise RuntimeError(f"{path}: failures must be a list")
    if failures:
        raise RuntimeError(f"{path}: failures must be empty before merge")

    normalized: list[dict[str, Any]] = []
    for index, check in enumerate(checks):
        if not isinstance(check, dict):
            raise RuntimeError(f"{path}: checks[{index}] is not an object")
        if explicitly_not_applicable(check):
            normalized.append(check)
            continue
        if check.get("applicable") is False or check.get("status") == "not_applicable":
            raise RuntimeError(
                f"{path}: checks[{index}] has an invalid not_applicable shape"
            )
        if check.get("pass") is not True:
            raise RuntimeError(
                f"{path}: applicable check failed or has no boolean pass value at checks[{index}]"
            )
        normalized.append(check)
    return normalized


def finalize_merged_truth(report: dict[str, Any]) -> dict[str, Any]:
    """Derive the merged report truth from the assembled evidence tree.

    Input validation is necessary but not sufficient: the template can carry
    fields outside the validated lists, and a future change can add a child
    evidence object after validation.  The final root result must therefore be
    computed from the exact tree that will be written, never assigned as an
    unconditional green constant.
    """

    failures: list[dict[str, Any]] = []
    reported_failures = report.get("failures")
    if not isinstance(reported_failures, list):
        failures.append({
            "name": "merged failures shape",
            "pass": False,
            "detail": {"reason": "failures must be a list"},
        })
    elif reported_failures:
        failures.append({
            "name": "merged reported failures",
            "pass": False,
            "detail": {"count": len(reported_failures)},
        })
    nested_false_passes = false_pass_paths(report)
    if nested_false_passes:
        failures.append({
            "name": "nested report evidence truth",
            "pass": False,
            "detail": {"paths": nested_false_passes[:32], "count": len(nested_false_passes)},
        })

    checks = report.get("checks")
    if not isinstance(checks, list):
        failures.append({
            "name": "merged checks shape",
            "pass": False,
            "detail": {"reason": "checks must be a list"},
        })
    else:
        for index, check in enumerate(checks):
            if not isinstance(check, dict):
                failures.append({
                    "name": "merged check shape",
                    "pass": False,
                    "detail": {"index": index, "reason": "check must be an object"},
                })
            elif not explicitly_not_applicable(check) and check.get("pass") is not True:
                failures.append({
                    "name": "merged check truth",
                    "pass": False,
                    "detail": {"index": index, "check": check},
                })

    matrix = report.get("matrix")
    if not isinstance(matrix, dict):
        failures.append({
            "name": "merged matrix shape",
            "pass": False,
            "detail": {"reason": "matrix must be an object"},
        })
    else:
        cells = matrix.get("cells")
        if matrix.get("complete") is not True or matrix.get("requestedComplete") is not True:
            failures.append({
                "name": "merged matrix completeness",
                "pass": False,
                "detail": {
                    "complete": matrix.get("complete"),
                    "requestedComplete": matrix.get("requestedComplete"),
                },
            })
        if not isinstance(cells, list) or matrix.get("total") != len(cells) or matrix.get("passed") != len(cells) or matrix.get("failed") != 0:
            failures.append({
                "name": "merged matrix counts",
                "pass": False,
                "detail": {
                    "total": matrix.get("total"),
                    "passed": matrix.get("passed"),
                    "failed": matrix.get("failed"),
                    "cellCount": len(cells) if isinstance(cells, list) else None,
                },
            })
        if isinstance(cells, list):
            for index, cell in enumerate(cells):
                if not isinstance(cell, dict) or cell.get("pass") is not True:
                    failures.append({
                        "name": "merged matrix cell truth",
                        "pass": False,
                        "detail": {"index": index, "cell": cell},
                    })

    report["failures"] = failures
    report["pass"] = not failures
    report["exitCodeShouldFail"] = bool(failures)
    return report


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
        if report.get("pass") is not True:
            raise RuntimeError(f"{path}: report.pass must be true before merge")
        if report.get("exitCodeShouldFail") is not False:
            raise RuntimeError(f"{path}: exitCodeShouldFail must be false before merge")
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
        if matrix.get("complete") is not True:
            raise RuntimeError(f"{path}: matrix.complete must be true before merge")
        if matrix.get("total") != len(cells) or matrix.get("passed") != len(cells):
            raise RuntimeError(f"{path}: matrix total/passed must equal matrix.cells length")

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
        merged_checks.extend(validate_checks(path, report.get("checks"), failures))
        nested_false_passes = false_pass_paths(report)
        if nested_false_passes:
            raise RuntimeError(
                f"{path}: report contains nested pass=false at "
                f"{', '.join(nested_false_passes[:5])}"
            )
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
    finalize_merged_truth(merged)
    if merged["pass"] is not True:
        raise RuntimeError(
            "merged report failed final truth derivation: "
            f"{len(merged['failures'])} failure(s)"
        )
    atomic_write(output, merged)
    print(json.dumps({
        "output": str(output),
        "candidate": candidate,
        "cells": len(wanted),
        "inputs": len(report_paths),
    }))


if __name__ == "__main__":
    main()
