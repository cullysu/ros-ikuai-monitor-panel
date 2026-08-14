- status: `current`
- validForCommit: Step963 uncommitted active CSS ownership and asset-budget repair pass focused runtime; exact clean-SHA replay remains required
- supersededBy: `null`
- currentConclusionForStep: `963`
- latestRecordedStep: `963`
- latestStepOutcome: `963:retired-css-owners-deleted-asset-budgets-and-focused-runtime-green-exact-replay-required`
- authority: This is the only human-readable current-state source.

# Current product and release state

## Current conclusion

**FAIL overall / focused engineering repair PASS / Product/Design/Visual replay pending / public release CLOSED.** Step963 closes the framework asset-budget red gate and removes two retired CSS owners that static checks were still reading. Because the shipped style cascade changed, Step962 Product/Visual screenshots are historical and cannot approve the new candidate.

## Current decision record: Step 963

- `check-public-release-readiness --require-matrix` first failed honestly: main style was `141663` bytes and desktop style was `45123` bytes, both above fixed ceilings.
- Mobile no longer imports the rejected `layout.css`; desktop no longer imports `desktop-overview-recovered.css`. Both retired files are deleted rather than kept as unshipped acceptance decoys.
- Active static gates now read `patrol-next.css`, `incidents-next.css`, `shell-next.css`, `motion.css` and `desktop-next.css`; route-focus, tablet ownership, touch targets and fleet shrinkability are checked where the runtime styles actually live.
- The only runtime behavior recovered from the removed layers is explicit and minimal: 44px mobile focus ownership, 12px desktop small text and 28px desktop pointer targets.
- Final shipped assets are within the unchanged ceilings: main style `117593 / 19068 / 16339` raw/gzip/Brotli and desktop style `24268 / 3943 / 3456`.

## Focused verified evidence

- Build, TypeScript, asset budget and `check:overview` pass with the 2 GB Node limit.
- `check:mobile-incident-lens` passes static/model/architecture/accessibility/runtime after the old layout owner is removed.
- `check:desktop-v1030`, `check:desktop-no-snapshot` and `check:desktop-incident-hierarchy` pass without the recovered desktop stylesheet.
- `check-mobile-workspace-contract`, `check-route-title-focus-visible`, `check-fleet-bounded-priority-overflow` and `check-overview-architecture` pass against active style owners.
- Static public readiness passes. Earlier e2cc matrices are stale because Step963 changes tracked source and generated assets; they must be rebuilt on the next clean SHA.

## Gate status

| Gate | Status | Boundary |
|---|---|---|
| R07 Product / R09 Design / Visual | pending replay | Step962 focused P0/P1=0 is historical after the CSS cascade changed. |
| Implementation / Architecture | focused pass | Active owners, build, budgets and focused mobile/desktop runtime pass; clean exact-SHA replay is pending. |
| State matrix | pending replay | All prior exact matrices are stale after tracked Step963 changes. |
| R10 Accessibility / Security | pending final evidence | Focused static/runtime checks are green; 200%/manual AT, final security replay and external attestations remain open. |
| Route maturity / RouterOS | pending | `0 complete / 18 bounded-readonly / 0 fallback / 1 unavailable`; real 300-second read-only RouterOS soak is absent. |
| External authority | pending | Reviewer keys and five real signed attestations are not provisioned; repository code cannot self-authorize. |
| Current product release | fail | Focused engineering closure is not public-release qualification. |
| R14 Release | closed | GitHub is untouched; no exact remote Linux, Windows or GHCR CL exists for a final SHA. |

## Explicit non-claims

- Passing asset budgets does not prove visual quality.
- Static gates cannot read retired CSS and claim the shipped surface is covered.
- Local subagents are not external reviewer signatures or manual AT evidence.
- No GitHub upload occurred. Every future upload must be followed by exact-SHA Linux, Windows and GHCR CL verification; failed, missing, cancelled or stale CL reopens the release loop.

## One next action

Commit Step963, then rebuild all exact-SHA local gates, complete public matrices, accessibility/security checks and independent reviews against that clean SHA before any external acceptance or publication decision.

## Authority links

- Full history: `../panel-redesign-decision-log.md`
- Historical map: `historical-index.md`
- Current handoff: `../product-loop-current.md`
- Release chronology: `release-journal.md`
