#!/usr/bin/env python3
"""Verify and optionally synchronize the local panel decision repository.

The repository is the source of truth. D:\\想法\\面板 is an explicit local mirror
requested by the product owner; it is never treated as release evidence.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MIRROR = Path(r"D:\想法\面板")
DECISION_SYSTEM_FILES = (
    "architecture-adr.md",
    "current-state.md",
    "current-index.md",
    "historical-index.md",
    "product-pdr.md",
    "README.md",
    "release-journal.md",
    "review-adjudication-2026-07-23.md",
    "responsive-capabilities.md",
    "route-maturity.md",
    "document-authority.md",
)
MIRROR_ROOT_FILES = (
    ("mirror-root-readme.md", "README.md"),
    ("correction-appendix-2026-07-16.md", "面板重做纠正附录-2026-07-16.md"),
)
CURRENT_SURFACE_MARKERS = {
    "currentConclusion": (
        Path("docs/decision-system/current-state.md"),
        r"^- currentConclusionForStep:\s*`(\d+)`",
    ),
    "currentHandoff": (
        Path("docs/product-loop-current.md"),
        r"^- currentHandoffForStep:\s*`(\d+)`",
    ),
    "currentBoundary": (
        Path("docs/decision-system/README.md"),
        r"^- currentBoundaryForStep:\s*`(\d+)`",
    ),
}
HISTORICAL_GATE_NAMES = frozenset(("ci-linux", "ci-windows", "ci-container"))
MIRROR_AUXILIARY_FILES = frozenset(("未完成工作与并行执行清单.md",))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_step(path: Path, pattern: str, *, current: bool = False) -> int:
    text = path.read_text(encoding="utf-8")
    matches = re.findall(pattern, text, flags=re.MULTILINE)
    if not matches:
        raise ValueError(f"latest decision step not found in {path}")
    return int(matches[0] if current else matches[-1])


def load_machine_state(root: Path = ROOT) -> tuple[dict[str, object], bool]:
    state = root / ".product-loop" / "state.json"
    try:
        machine = json.loads(state.read_text(encoding="utf-8"))
        if not isinstance(machine, dict):
            raise ValueError("local machine state is not an object")
        if "latest_decision_step" in machine:
            machine["latest_decision_step"] = int(machine["latest_decision_step"])
        elif "current_surface_step" in machine:
            machine["current_surface_step"] = int(machine["current_surface_step"])
        else:
            raise ValueError("local machine state has no decision identity")
        return machine, True
        return machine, True
    except (FileNotFoundError, OSError, json.JSONDecodeError, KeyError, TypeError, ValueError):
        current_state = root / "docs" / "decision-system" / "current-state.md"
        return {
            "latest_decision_step": read_step(
                current_state,
                r"^- latestRecordedStep:\s*`(\d+)`",
                current=True,
            ),
            "latest_decision_outcome": read_outcome(current_state, current=True),
            "current_surface_step": optional_step(
                current_state,
                r"^- currentConclusionForStep:\s*`(\d+)`",
                current=True,
            ),
            "gates": {},
        }, False

def semantic_steps(root: Path = ROOT) -> dict[str, int]:
    log = root / "docs" / "panel-redesign-decision-log.md"
    machine, _ = load_machine_state(root)
    return {
        "journal": read_step(log, r"^## 第\s*(\d+)\s*步"),
        "currentState": read_step(
            root / "docs" / "decision-system" / "current-state.md",
            r"^- latestRecordedStep:\s*`(\d+)`",
            current=True,
        ),
        "decisionIndex": read_step(
            root / "docs" / "decision-system" / "README.md",
            r"^- latestRecordedStep:\s*`(\d+)`",
            current=True,
        ),
        "loopHandoff": read_step(
            root / "docs" / "product-loop-current.md",
            r"^- latestRecordedStep:\s*`(\d+)`",
            current=True,
        ),
        "machineState": int(machine.get("latest_decision_step") or read_step(root / "docs" / "decision-system" / "current-state.md", r"^- latestRecordedStep:\s*`(\d+)`", current=True)),
    }


def read_outcome(path: Path, *, current: bool = False) -> str:
    text = path.read_text(encoding="utf-8")
    matches = re.findall(r"^- latestStepOutcome:\s*`([^`]+)`", text, flags=re.MULTILINE)
    if not matches:
        raise ValueError(f"latest decision outcome not found in {path}")
    if current:
        return matches[0]
    return max(
        matches,
        key=lambda value: int(value.split(":", 1)[0]) if value.split(":", 1)[0].isdigit() else -1,
    )


def semantic_outcomes(root: Path = ROOT) -> dict[str, str]:
    machine, _ = load_machine_state(root)
    return {
        "journal": read_outcome(root / "docs" / "panel-redesign-decision-log.md"),
        "currentState": read_outcome(root / "docs" / "decision-system" / "current-state.md", current=True),
        "decisionIndex": read_outcome(root / "docs" / "decision-system" / "README.md", current=True),
        "loopHandoff": read_outcome(root / "docs" / "product-loop-current.md", current=True),
        "machineState": str(machine.get("latest_decision_outcome") or read_outcome(root / "docs" / "decision-system" / "current-state.md", current=True)),
    }


def optional_step(path: Path, pattern: str, *, current: bool = False) -> int | None:
    text = path.read_text(encoding="utf-8")
    matches = re.findall(pattern, text, flags=re.MULTILINE)
    return int(matches[0] if current else matches[-1]) if matches else None


def current_surface_steps(root: Path = ROOT) -> dict[str, int | None]:
    steps = {
        key: optional_step(
            root / relative_path,
            pattern,
            current=key in {"currentConclusion", "currentHandoff", "currentBoundary"},
        )
        for key, (relative_path, pattern) in CURRENT_SURFACE_MARKERS.items()
    }
    machine, _ = load_machine_state(root)
    value = machine.get("current_surface_step")
    steps["machineCurrentSurface"] = value if isinstance(value, int) else None
    return steps


def first_header_step(path: Path, pattern: str, line_limit: int = 24) -> int | None:
    head = "\n".join(path.read_text(encoding="utf-8").splitlines()[:line_limit])
    match = re.search(pattern, head, flags=re.MULTILINE)
    return int(match.group(1)) if match else None


def authority_header_state(root: Path = ROOT) -> dict[str, object]:
    journal_head = "\n".join(
        (root / "docs" / "panel-redesign-decision-log.md")
        .read_text(encoding="utf-8")
        .splitlines()[:12]
    )
    handoff_text = (root / "docs" / "product-loop-current.md").read_text(
        encoding="utf-8"
    )
    handoff_head = "\n".join(handoff_text.splitlines()[:60])
    current_state_head = "\n".join(
        (root / "docs" / "decision-system" / "current-state.md")
        .read_text(encoding="utf-8")
        .splitlines()[:80]
    )
    machine, _ = load_machine_state(root)
    return {
        "currentStateHeader": first_header_step(
            root / "docs" / "decision-system" / "current-state.md",
            r"^- currentConclusionForStep:\s*`(\d+)`",
        ),
        "decisionIndexHeader": first_header_step(
            root / "docs" / "decision-system" / "README.md",
            r"^- latestRecordedStep:\s*`(\d+)`",
            line_limit=12,
        ),
        "loopHandoffHeader": first_header_step(
            root / "docs" / "product-loop-current.md",
            r"^- currentHandoffForStep:\s*`(\d+)`",
            line_limit=12,
        ),
        "machineLatestStep": machine.get("latest_decision_step"),
        "machineCurrentSurface": machine.get("current_surface_step"),
        "journalHistorical": "status: `historical-journal`" in journal_head,
        "journalAuthorityPointer": "当前权威来源：`docs/decision-system/current-state.md`" in journal_head,
        "currentStateFail": "**FAIL" in current_state_head,
        "handoffFail": "**FAIL overall" in handoff_head
        and "| Current product release | `fail` |" in handoff_text,
    }


def stale_gate_notes(machine: dict[str, object], latest_step: int) -> list[dict[str, str]]:
    expected = f"step{latest_step}-"
    stale: list[dict[str, str]] = []
    gates = machine.get("gates")
    if not isinstance(gates, dict):
        return [{"gate": "*", "status": "missing", "note": "machine gates missing"}]
    for name, raw_gate in gates.items():
        gate = raw_gate if isinstance(raw_gate, dict) else {}
        status = str(gate.get("status") or "missing")
        note = str(gate.get("note") or "")
        historical = name in HISTORICAL_GATE_NAMES and note.startswith("historical-")
        if not note.startswith(expected) and not historical:
            stale.append({"gate": str(name), "status": status, "note": note})
    return stale


def mirror_pairs(mirror: Path) -> list[tuple[Path, Path]]:
    pairs = [
        (
            ROOT / "docs" / "panel-redesign-decision-log.md",
            mirror / "面板重做决策日志.md",
        ),
        (
            ROOT / "docs" / "mobile-reference-baseline.md",
            mirror / "手机界面唯一视觉基线.md",
        ),
        (
            ROOT / "docs" / "product-loop-current.md",
            mirror / "product-loop-current.md",
        ),
    ]
    pairs.extend(
        (
            ROOT / "docs" / "decision-system" / name,
            mirror / "decision-system" / name,
        )
        for name in DECISION_SYSTEM_FILES
    )
    pairs.extend(
        (
            ROOT / "docs" / "decision-system" / source_name,
            mirror / target_name,
        )
        for source_name, target_name in MIRROR_ROOT_FILES
    )
    return pairs

def markdown_inventory(mirror: Path) -> list[str]:
    if not mirror.exists():
        return []
    return sorted(
        str(path.relative_to(mirror)).replace("\\", "/")
        for path in mirror.rglob("*.md")
        if path.is_file()
    )


def synchronize(pairs: list[tuple[Path, Path]]) -> None:
    for source, target in pairs:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(source.read_bytes())


def inspect_pairs(pairs: list[tuple[Path, Path]]) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for source, target in pairs:
        source_hash = sha256(source)
        target_hash = sha256(target) if target.exists() else None
        rows.append(
            {
                "source": str(source.relative_to(ROOT)),
                "mirror": str(target),
                "sourceSha256": source_hash,
                "mirrorSha256": target_hash,
                "byteIdentical": source_hash == target_hash,
            }
        )
    return rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mirror", type=Path, default=None, help="verify this mirror")
    parser.add_argument(
        "--sync",
        action="store_true",
        help="copy repository decision files to the mirror before verification",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    mirror = args.mirror or (DEFAULT_MIRROR if args.sync else None)
    steps = semantic_steps()
    outcomes = semantic_outcomes()
    semantic_ok = len(set(steps.values())) == 1
    outcome_consistent = len(set(outcomes.values())) == 1
    outcome_steps: dict[str, int | None] = {}
    for key, outcome in outcomes.items():
        match = re.fullmatch(r"(\d+):[a-z0-9-]+", outcome)
        outcome_steps[key] = int(match.group(1)) if match else None
    outcome_bound_to_step = all(outcome_steps[key] == steps[key] for key in steps)
    latest_step = max(steps.values())
    surfaces = current_surface_steps()
    current_surface_consistent = all(value == latest_step for value in surfaces.values())
    machine, machine_state_available = load_machine_state()
    stale_notes = stale_gate_notes(machine, latest_step) if machine_state_available else []
    authority_headers = authority_header_state()
    authority_header_consistent = (
        authority_headers["currentStateHeader"] == latest_step
        and authority_headers["decisionIndexHeader"] == latest_step
        and authority_headers["loopHandoffHeader"] == latest_step
        and authority_headers["machineLatestStep"] == latest_step
        and authority_headers["machineCurrentSurface"] == latest_step
        and bool(authority_headers["journalHistorical"])
        and bool(authority_headers["journalAuthorityPointer"])
        and bool(authority_headers["currentStateFail"])
        and bool(authority_headers["handoffFail"])
    )

    rows: list[dict[str, object]] = []
    expected_markdown: list[str] = []
    actual_markdown: list[str] = []
    if mirror is not None:
        pairs = mirror_pairs(mirror)
        if args.sync:
            synchronize(pairs)
        rows = inspect_pairs(pairs)
        expected_markdown = sorted(
            str(target.relative_to(mirror)).replace("\\", "/")
            for _, target in pairs
        )
        actual_markdown = markdown_inventory(mirror)

    unexpected_markdown = sorted((set(actual_markdown) - set(expected_markdown)) - MIRROR_AUXILIARY_FILES)
    missing_markdown = sorted(set(expected_markdown) - set(actual_markdown))
    mirror_ok = (
        not rows
        or (
            all(bool(row["byteIdentical"]) for row in rows)
            and not unexpected_markdown
            and not missing_markdown
        )
    )
    report = {
        "pass": semantic_ok and outcome_consistent and outcome_bound_to_step and current_surface_consistent and authority_header_consistent and not stale_notes and mirror_ok,
        "latestStep": latest_step,
        "semanticSteps": steps,
        "semanticConsistent": semantic_ok,
        "semanticOutcomes": outcomes,
        "outcomeConsistent": outcome_consistent,
        "outcomeBoundToStep": outcome_bound_to_step,
        "currentSurfaceSteps": surfaces,
        "currentSurfaceConsistent": current_surface_consistent,
        "authorityHeaders": authority_headers,
        "authorityHeaderConsistent": authority_header_consistent,
        "staleGateNotes": stale_notes,
        "machineStateAvailable": machine_state_available,
        "mirror": str(mirror) if mirror is not None else None,
        "mirrorPairs": len(rows),
        "byteIdenticalPairs": sum(bool(row["byteIdentical"]) for row in rows),
        "mismatches": sum(not bool(row["byteIdentical"]) for row in rows),
        "expectedMarkdownFiles": len(expected_markdown),
        "actualMarkdownFiles": len(actual_markdown),
        "unexpectedMarkdown": unexpected_markdown,
        "missingMarkdown": missing_markdown,
        "files": rows,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
