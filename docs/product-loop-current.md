- status: `current-handoff`
- validForCommit: Step963 active CSS ownership and fixed asset budgets pass focused runtime; exact clean replay remains pending
- currentHandoffForStep: `963`
- supersededBy: `docs/decision-system/current-state.md`
- fullHistory: `docs/panel-redesign-decision-log.md`
- updated: 2026-08-14
- latestRecordedStep: `963`
- latestStepOutcome: `963:retired-css-owners-deleted-asset-budgets-and-focused-runtime-green-exact-replay-required`
- releaseCandidate: not a release candidate; current evidence is bound to an uncommitted focused artifact
- currentConclusion: **FAIL overall / focused engineering repair PASS / Product/Design/Visual replay pending / GitHub publication closed / release CLOSED.**
- reviewBoundary: final clean-SHA Product, Design, Visual, Accessibility, Engineering and external authority reviews remain required.

## Current handoff:

- Preserve `current | historical | unavailable`, RFC3339, visible numeric zero, missing-value withdrawal, verified-route-only logic, REST/SSH independence and trailing consecutive resource samples.
- Preserve separate mobile and desktop render/style ownership. Do not revive the rejected topology, sheet, generic card stack or desktop-shrunk mobile presentation.
- Preserve the active Step963 style owners: `patrol-next.css`, `incidents-next.css`, `shell-next.css`, `motion.css` and `desktop-next.css`; do not restore retired `layout.css` or `desktop-overview-recovered.css`.
- Keep static gates bound to shipped style owners. A dead stylesheet must never satisfy focus, layout, touch-target or accessibility checks.
- Preserve operator-facing public source labels, Back/Forward selection, focus restoration, object-bound navigation context and 44px mobile touch targets.
- Preserve release truth: never use normal `git push`; publication requires authorized Git Data API fast-forward and exact-SHA Linux, Windows and GHCR verification.

## Gate boundary

| Gate | Status | Meaning |
|---|---|---|
| Product/Design/Visual | `pending replay` | Step962 focused review is historical because the active CSS cascade changed. |
| Implementation / Architecture | `focused pass` | Build, unchanged asset ceilings and focused mobile/desktop runtime pass against active owners. |
| State matrix | `pending replay` | All prior matrices are stale after Step963 tracked changes. |
| Accessibility / Security | `pending final evidence` | Automated focused checks pass; real manual AT, final security replay and external signatures are absent. |
| Route maturity / RouterOS / promotion | `pending` | Bounded route declaration, real 300-second soak and trusted external promotion inputs remain open. |
| Current product release | `fail` | Focused engineering closure does not satisfy whole-product release qualification. |
| Release | closed | No authorized upload or current remote-SHA Linux/Windows/GHCR CL. |

## One next action

Commit Step963, then bind every complete local gate, matrix and independent review to the resulting clean exact SHA. Continue all local work; do not mark the task blocked merely because real external attestations or publication evidence are still pending.
