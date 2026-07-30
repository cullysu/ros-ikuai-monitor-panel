"""Fail closed when the decision repository's current pointers lag the machine state."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
STATE_PATH = ROOT / ".product-loop" / "state.json"
CURRENT_STATE_PATH = ROOT / "docs" / "decision-system" / "current-state.md"
INDEX_PATH = ROOT / "docs" / "decision-system" / "README.md"
HANDOFF_PATH = ROOT / "docs" / "product-loop-current.md"
JOURNAL_PATH = ROOT / "docs" / "panel-redesign-decision-log.md"


def main() -> int:
    state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    latest_step = int(state["latest_decision_step"])
    outcome = str(state["latest_decision_outcome"])
    current_state = CURRENT_STATE_PATH.read_text(encoding="utf-8")
    index = INDEX_PATH.read_text(encoding="utf-8")
    handoff = HANDOFF_PATH.read_text(encoding="utf-8")
    journal = JOURNAL_PATH.read_text(encoding="utf-8")

    checks = {
        "current_state_header": f"- currentConclusionForStep: `{latest_step}`" in current_state[:1200],
        "current_state_current_section": bool(
            re.search(
                rf"^## Current decision record:\s*Step\s*{latest_step}\b",
                current_state,
                re.MULTILINE,
            )
        ),
        "current_state_outcome": outcome in current_state[:12000],
        "index_step": f"- latestRecordedStep: `{latest_step}`" in index[:1200],
        "index_outcome": f"- latestStepOutcome: `{outcome}`" in index[:1200],
        "index_boundary": f"- currentBoundaryForStep: `{latest_step}`" in index[:1200],
        "handoff_step": f"- currentHandoffForStep: `{latest_step}`" in handoff[:1200],
        "journal_outcome": f"- latestStepOutcome: `{outcome}`" in journal[-12000:],
    }
    passed = all(checks.values())
    report = {
        "pass": passed,
        "latestStep": latest_step,
        "latestStepOutcome": outcome,
        "checks": checks,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
