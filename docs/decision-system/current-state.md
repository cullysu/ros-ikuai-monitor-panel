- status: `current`
- currentConclusionForStep: `837`
- latestRecordedStep: `837`
- latestStepOutcome: `837:40fe6e2-runtime-accessibility-regression-fixed-runtime-green-formal-signoff-open`
- currentBoundaryForStep: `837`
- validForCommit: uncommitted folded-control accessibility regression fix and governance update; exact runtime evidence must be regenerated after the next clean SHA; not a release candidate
- supersededBy: `null`
- updatedAt: 2026-08-02T08:10:00+08:00
- authority: This is the only human-readable current-state source.

## Current decision record: Step 837

- status: active-runtime-regression-fix-formal-signoff-open
- boundary: Step837 closes a locally reproducible folded-control ARIA regression; exact release evidence is stale until the next clean SHA is created.
- observed facts: the first post-Step836 runtime correctly failed because a collapsed filter button referenced a DOM target that was not rendered; always rendering a hidden target then violated the existing on-demand control contract. The fix makes `aria-controls` conditional on the expanded state while keeping the expanded target and group semantics valid.
- local verification: build and the full production runtime suite pass after the fix: 257 checks, 140 screenshots and 169 snapshot API calls; mobile incident, action, hierarchy, signal, responsive-boundary, tablet-information, vertical-task, next-evidence and tablet-task contracts pass. No trusted external signature was generated.
- decision: close this local runtime regression, keep formal Product/Design/Visual, independent Accessibility, route-owner maturity, RouterOS soak, external CL and GitHub/public release fail-closed. Task remains active and blocked=false.

## Current conclusion

**FAIL overall.** Local runtime remediation is focused-green, but all exact-SHA release materials must be regenerated after the code and governance changes. Formal independent acceptance, route maturity, RouterOS soak and external CL remain incomplete. No publication is authorized.

## Independent acceptance boundary

| Review | Status | Boundary |
|---|---|---|
| Product | scoped-pass / formal-pending | Independent scoped review found P0/P1=0; route maturity and trusted owner acceptance remain open. |
| Design | scoped-pass / formal-pending | Independent scoped review found P0/P1=0; no trusted public design signature exists for this candidate. |
| Visual QA | scoped-pass / formal-pending | Independent scoped review found P0/P1=0; runtime and scoped review are not formal human signoff. |
| Architecture | focused pass | Separate mobile/desktop ownership and runtime contracts pass; not release approval. |

## Current release gates

| Gate | Status | Meaning |
|---|---|---|
| Product | pending | Route maturity and trusted owner acceptance remain open. |
| Design | pending | Fresh independent review/signature is required. |
| Visual QA | pending | Automated/runtime evidence does not replace visual acceptance. |
| Accessibility | pending | Synthetic checks are not independent assistive-technology acceptance. |
| State Matrix | pending | The prior exact matrix is stale after Step837; the next clean SHA must regenerate runtime, 28/532/266/532 matrices and packet. |
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

- R07 mobile visual maturity, R09 tablet task efficiency, R10 desktop density and R14 cross-surface grammar have current scoped evidence and the fresh independent scoped review found P0/P1=0; formal independent acceptance remains pending.
- Release journal: docs/decision-system/release-journal.md.
- D drive is a byte-identical mirror at D:\想法\面板.
- Current packet under `_acceptance/panel-runtime-browser/` is prepared-not-signed and never self-signs; it is bound to 382a145 before this governance update and must be regenerated after any subsequent candidate change.

## Record contract

Every material step records trigger/problem, facts, decision, rejected alternatives, verification, boundary and exactly one next action.


## Step835 final exact evidence and independent scoped review boundary

The task remains active and blocked=false. 382a145 exact runtime, packet, matrices, asset budget and local hygiene are green in the declared scope. Readiness correctly stops at route maturity; fresh independent scoped review is P0/P1=0, but formal signatures, independent assistive-technology acceptance, route-owner maturity, RouterOS soak and external CL remain pending.
