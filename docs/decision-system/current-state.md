- status: `current`
- currentConclusionForStep: `825`
- latestRecordedStep: `825`
- latestStepOutcome: `825:desktop-connection-isolated-launch-flaky-in-context-capture-selected`
- currentBoundaryForStep: `825`
- validForCommit: uncommitted Step825 runtime-harness repair and governance refresh; exact-SHA evidence must be regenerated after this source change; not a release candidate
- supersededBy: `null`
- updatedAt: 2026-08-01T19:59:24+08:00
- authority: This is the only human-readable current-state source.

## Current decision record: Step 825

- status: desktop-connection-isolated-launch-flaky-in-context-capture-selected
- boundary: Step825 records the connection-page screenshot path repair; this document and code change intentionally invalidates 13ea074 identity evidence until a new clean candidate is built.
- observed facts: after the Step824 async cleanup repair, runtime-browser still timed out at the same isolated desktop-connection capture on clean 13ea074 after 139/140 screenshots and 169 snapshot calls, while connection semantic assertions had passed. The failure is isolated to extra browser launch/capture, not page truth.
- local visual closure: Current phone normal/incident, tablet master/detail, desktop task workspace and chart evidence were rechecked; no new screenshot P0/P1 was found within the declared scoped review. This is not a trusted external signature.
- decision: Use the already-verified desktop connection page for this one screenshot, preserving viewport capture, timeout, digest and semantic checks; keep formal Product/Design/Visual acceptance, independent Accessibility, route maturity, RouterOS soak, external CL and GitHub/public release fail-closed.

## Current conclusion

**FAIL overall.** The connection screenshot path is being made deterministic, but this Step825 code/governance refresh makes the current worktree ineligible until exact evidence is regenerated on a new clean SHA. Product route maturity and all non-forgeable external/independent gates remain incomplete. No publication is authorized.

## Independent acceptance boundary

| Review | Status | Boundary |
|---|---|---|
| Product | pending / open | 18 routes remain bounded-readonly. |
| Design | pending / open | No trusted independent public design signature exists for this candidate. |
| Visual QA | pending / open | Runtime visual evidence is not human signoff. |
| Architecture | focused pass | Separate mobile/desktop ownership and runtime contracts pass; not release approval. |

## Current release gates

| Gate | Status | Meaning |
|---|---|---|
| Product | pending | Route maturity and trusted owner acceptance remain open. |
| Design | pending | Fresh independent review/signature is required. |
| Visual QA | pending | Automated/runtime evidence does not replace visual acceptance. |
| Accessibility | pending | Synthetic checks are not independent assistive-technology acceptance. |
| State Matrix | pending-rebind | Runtime 257/140/169 was green before this screenshot-path change; 28/76/266/532 must be regenerated for the new SHA. |
| Route maturity | pending | 0 complete / 18 bounded-readonly / 0 fallback / 1 unavailable. |
| RouterOS soak | pending | No current long-running real-device evidence. |
| Release hygiene | pending | Clean candidate, external CL and publication chain remain incomplete. |

## Document authority

- Sole current conclusion: docs/decision-system/current-state.md.
- Discovery reference: docs/decision-system/current-index.md.
- Current product handoff: docs/product-loop-current.md.
- Complete history: docs/panel-redesign-decision-log.md.
- Historical index: docs/decision-system/historical-index.md.

## Open review boundaries

- R07 mobile visual maturity, R09 tablet task efficiency, R10 desktop density and R14 cross-surface grammar have current scoped evidence with no new screenshot P0/P1; formal independent acceptance remains pending.
- Release journal: docs/decision-system/release-journal.md.
- D drive is a byte-identical mirror at D:\想法\面板.
- Current packet under `_acceptance/panel-runtime-browser/` is prepared-not-signed and never self-signs; it must be regenerated after the next clean commit.

## Record contract

Every material step records trigger/problem, facts, decision, rejected alternatives, verification, boundary and exactly one next action.


## Step825 desktop connection screenshot path repair

The task remains active and blocked=false. The connection page already passes its semantic checks; the new capture path removes only the unstable second-browser launch for that screenshot. The old 6f37df2 matrices and packet are historical until the new clean SHA is regenerated. Scoped Product/Design/Visual evidence remains closed only for its declared screenshot scope; trusted formal signatures, independent assistive-technology acceptance, route maturity, RouterOS soak and external CL remain pending.
