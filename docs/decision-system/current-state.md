- validForCommit: false; current worktree is uncommitted (Step1202 CI-repair fixes pending commit as the next clean candidate); release remains closed until a committed exact SHA reproduces fresh Linux, Windows, and CL/GHCR evidence
- status: `current`
- supersededBy: `null`
- currentBoundaryForStep: `1202`
- currentConclusionForStep: `1202`
- latestRecordedStep: `1202`
- latestStepOutcome: `1202:linux-matrix-evidence-edge-delegated-keyboard-entry-awaiting-exact-sha-ci`
- authority: This is the only human-readable current-state source.

# Current product and release state

## Current conclusion

**FAIL overall for release.** The accepted four-screen mobile reference remains the sole phone baseline, the 192.168.3.5/iPad direction remains the desktop baseline, and no current visual baseline change is part of this CI repair. Release is **CLOSED** because current-identity independent product/visual receipts and exact-SHA Linux, Windows, and CL/GHCR evidence are not all green.

## Current decision record: Step 1202

- Run `33832746276` validated both Step1201 repairs on real CI: Linux passed the full-route, overview and route-state matrices for the first time, and the Windows landscape-667x375 cell passed the primary reachability assertion.
- Linux now fails only on evidence the workflow never produced: the mobile reference runtime matrix report and the Windows-only real Edge toolbar report. The Linux job now runs the full mobile reference runtime matrix, and readiness accepts `--edge-evidence-gated-by=windows-packaging` to delegate exactly the Edge report boundary to the same-SHA Windows job; every other matrix requirement stays enforced and the workflow-integrity contract pins the new invocation.
- Windows fails only on keyboard traversal: the normal desktop overview rendered zero tab stops because the object workspace exists only in the risk branch. The normal branch now offers a real interfaces navigation entry (12px, 2px focus ring); local reproduction shows 1/1 controls visited with compliant focus.
- Desktop contracts (v1030, no-snapshot, incident hierarchy, normal density, information efficiency, top-band continuity, resource density) all pass locally after the change; release stays CLOSED until the next exact-SHA three-way CI result.
- outcome: `1202:linux-matrix-evidence-edge-delegated-keyboard-entry-awaiting-exact-sha-ci`

## Previous decision record: Step 1201

- Run `33828015082` (head SHA `4169a4a`) returned the first fresh exact-SHA evidence: Linux passed compile, py_compile, and the ledger regression suite, then `check-decision-ledger-sync.py` failed because the machine gate notes were still bound to step1197; Windows passed all 20 earlier cells and moved past the Step1200 clipping/readability fixes, then failed `landscape-667x375::normal` at "primary task is not reachable inside main or is obscured by navigation".
- Linux correction: all 14 machine gate notes are rebound to step1201 with the Run `33828015082` facts; the remaining five commands of that CI step (backend blockers, backend security, merge-matrix tests, release-checkpoint tests) pass locally.
- Windows root cause: the primary `[data-desktop-wan-evidence]` section is a ~506px stack that cannot fit a 375px/390px first viewport, and `scrollIntoViewIfNeeded` leaves its bottom 1.17px past the 1px tolerance. The compact landscape workbench now bounds the WAN rail (`max-height: calc(100vh - 24px)`, border-box, internal vertical scroll, `scroll-margin-bottom: 8px`), so the revealed rail box lands at viewport bottom minus ~7px with zero clipping and no sub-12px text; the two-column grammar and all other sizes are unchanged.
- Local verification: CSS-equivalent reproduction shows container clipping 0 and primary reachable at both 667×375 and 844×390; asset identity, static assets, report truth, workflow integrity, and a fresh desktop-density run all pass after rebuild.
- No Linux, Windows, or CL/GHCR result is current green evidence for the next candidate. Every result must bind to the exact SHA after this correction is committed and pushed.
- outcome: `1202:linux-matrix-evidence-edge-delegated-keyboard-entry-awaiting-exact-sha-ci`

## Previous decision record: Step 1200

- The Linux first failure (Run 33521172930) is the bounded-shard exit semantics: full-route 76/76 passed and the shard exited 1 only on `complete=false`; the `2e3f823` `allowIncompleteMatrix` fix supplies exactly this semantics and its contract test passes locally.
- The Windows first failure is `landscape-667x375-normal-overview` clipped operational text; a CSS-equivalent reproduction located 8 self-clipping `legacy-summary-tile` values (13px × 1.1 line box under the glyph box inside `overflow:hidden`), and the compact landscape media query now raises the value line-height to 1.4 and lifts 10–11px labels to the 12px readability floor. The 1366/1440 desktop and phone baselines are untouched.
- The two desktop-density 409 console errors are root-caused to browser favicon probes that predated the 204 handler; the density server now records every request with pathname/status/reason, and a fresh run passes with zero console, request, page, and failure errors.
- `check-report-truth` was re-synced to the current `finalizeReportTruth(report, matrixBlocksTopLevelPass, {allowIncompleteMatrix})` call form; that mismatch would have blocked the next CI run and was fixed before pushing.
- Framework assets and manifest digest were rebuilt via `npm run build`; asset identity, static assets, release blockers, workflow integrity, and quarantine checks all pass fresh.
- No Linux, Windows, or CL/GHCR result is current green evidence for the next candidate. Every result must bind to the exact SHA after this correction is committed and pushed.
- outcome: `1200:409-closed-landscape-clip-fixed-report-truth-synced-awaiting-exact-sha-ci`

## Previous decision record: Step 1197

- The current worktree contains the Step1196 popup correction plus synchronized decision-state repairs; the next exact SHA is not a release candidate until it is committed and independently verified.
- Local decision-ledger validation passes: `python tools/check-decision-ledger-sync.py`; regression suite passes: `python tools/test-decision-ledger-sync.py -v` (6 tests).
- Step1197 records the correction of the archive-range, current-pointer, root-README and compact-release drift. Run `33316260102` still records the Windows `phone-320::normal` `find-zoom-in` zero-match failure; Linux did not form a terminal product result.
- No Linux, Windows, or CL/GHCR result is current green evidence for the next candidate. Every result must bind to the exact SHA after this correction is committed and pushed.
- No UI or network product behavior is changed by this repair. No `rg.exe`, uncontrolled browser scan, user-process termination, or credential write is part of this step.
- outcome: `1197:decision-boundaries-synchronized-and-release-remains-closed`

## Gate status

| Gate | Status | Evidence boundary |
|---|---|---|
| R07 Product / mobile direction | pending | Current independent re-signoff for the accepted mobile baseline is absent. |
| Mobile ownership / architecture | pass | Current owner is `src/panel-framework/mobile-reference-ui/`; retired phone owners are not restored. |
| Mobile focused runtime | pending exact-SHA replay | Existing local evidence is historical after the CI repair candidate changed. |
| Mobile full state matrix | pending exact-SHA replay | Existing matrix evidence is not reused as current release proof. |
| R09 Visual | pending | Current-identity independent visual receipt is absent. |
| R10 Accessibility / security | pending | Current-identity Windows Edge 200% and independent receipt remain open. |
| Desktop direction | pass | User-selected 192.168.3.5/iPad desktop direction remains separate. |
| Release hygiene | pending | Local tracked candidate is clean; current exact-SHA release evidence is not complete. |
| CI Linux | pending | Run 33832746276 passed all route matrices; readiness evidence completed via the real mobile matrix plus explicit Edge delegation; fresh exact-SHA run required. |
| CI Windows | failed on Run 33832746276 | `landscape-667x375-normal-overview` keyboard traversal; the normal overview now exposes a real keyboard entry awaiting a fresh exact-SHA run. |
| CL/GHCR | pending | No current exact-SHA evidence is available for the next candidate. |
| R14 Release | closed | Do not upload or publish until every required gate is green on one exact SHA. |

## One next action

Commit this state synchronization together with the popup correction, then inspect the new exact-SHA Linux, Windows, and CL/GHCR results; fix only the first fresh failure and repeat until all required gates are green.

## Authority links

- Mobile baseline: `../../docs/mobile-reference-baseline.md`
- Mobile owner: `../../src/panel-framework/mobile-reference-ui/MobileReferenceSurface.tsx`
- Mobile styles: `../../src/panel-framework/mobile-reference-ui/mobile-reference.css`
- Desktop owner: `../../src/panel-framework/overview/desktop-overview/LegacyDesktopOverview.tsx`
- Full history: `../panel-redesign-decision-log.md`
- Historical index: `historical-index.md`
- Current handoff: `../product-loop-current.md`
- Release chronology: `release-journal.md`
