- validForCommit: false; current worktree is uncommitted (Step1205 CI-repair fixes pending commit as the next clean candidate); release remains closed until a committed exact SHA reproduces fresh Linux, Windows, and CL/GHCR evidence
- status: `current`
- supersededBy: `null`
- currentBoundaryForStep: `1205`
- currentConclusionForStep: `1205`
- latestRecordedStep: `1205`
- latestStepOutcome: `1205:mobile-report-cells-field-and-route-landscape-columns-fixed-awaiting-exact-sha-ci`
- authority: This is the only human-readable current-state source.

# Current product and release state

## Current conclusion

**FAIL overall for release.** The accepted four-screen mobile reference remains the sole phone baseline, the 192.168.3.5/iPad direction remains the desktop baseline, and no current visual baseline change is part of this CI repair. Release is **CLOSED** because current-identity independent product/visual receipts and exact-SHA Linux, Windows, and CL/GHCR evidence are not all green.

## Current decision record: Step 1205

- Run `33860099898` failed on both ends after further progress. Linux passed the mobile runtime matrix itself (runPass/complete true, all 49 cells captured) but readiness reported total=0 because the validator read `matrix.cells` while the generator writes top-level `report.cells`; the consumer is now aligned and the three fail-closed fixture cases moved with it.
- Windows reached cell 22/24 and failed `landscape-667x375::interfaces-down` with route text clipped by the overflow-hidden domain workspace: `.ddw-body` minimum columns (520+430px) exceeded the ~600px workbench. A compressible two-column grammar now applies on the 600–899 short-landscape desktop breakpoint; local reproduction drops container clipping 38/22 to 0/0.
- Local readiness semantics, build, types, asset identity and toolbar fixtures pass. Release stays CLOSED pending the next exact-SHA CI.
- outcome: `1205:mobile-report-cells-field-and-route-landscape-columns-fixed-awaiting-exact-sha-ci`

## Previous decision record: Step 1204

- Run `33850371045` failed after passing fleet and route matrices: Linux stopped at collection-down × tablet768 with workspace bottom 632px against the 634.88px first-screen threshold; the minimum height is now 220px and the wrapper single-cell check passes at bottom 636px. Windows stopped at phone-320::normal because Edge 200% produced a truthful 640×1136 device-pixel diagnostic; the validator now accepts CSS pixels or the verified DPR-sized image while retaining undersize and hash-reuse rejection.
- Local mobile model, mock architecture, toolbar fixtures, types, build, asset identity, and workflow integrity pass. Release remains CLOSED pending the next exact-SHA CI.
- outcome: `1204:collection-tablet-threshold-and-dpr-evidence-fixed-awaiting-exact-sha-ci`

## Previous decision record: Step 1203

- Run `33850371045`（head `a64650b`）确认 Linux 已通过三大路由矩阵与 fleet 手机场景；新失败是 `collection-down × tablet768` 工作区底部 632px，低于 1024×0.62 的 634.88px 门槛约 3px。collection 平板任务区最小高度已调整至 220px，并由 wrapper 单格复验通过（bottom=636px，cell pass=true）。
- 同一 Run 的 Windows 第一格 diagnostic PNG 为 640×1136（Edge 200% 的设备像素），前一轮 `scale:"css"` 在远端未按预期生效。toolbar 证据校验现接受 CSS 像素或已验证 DPR 对应的设备像素，仍拒绝不足尺寸、非目标和复用哈希；Windows HWND 实拍仍单独绑定 owned capture。
- fleet 手机矩阵此前在 mock 中停留 normal；fleet mock 已增加不在首屏 WAN 列表的失败 SFP，runtime 打开 cell 后等待实际 scene 属性达到期望值，避免 React 更新时序导致假失败。
- 本地 mobile model、mock architecture、toolbar readiness/offline fixture、types、build、asset identity、workflow integrity 全部通过。release 仍 CLOSED，等待新 exact-SHA CI。
- outcome: `1203:fleet-scene-wait-collection-tablet-first-screen-edge-dpr-evidence-fixed-awaiting-exact-sha-ci`

## Previous decision record: Step 1202

- Run `33828015082` (head SHA `4169a4a`) returned the first fresh exact-SHA evidence: Linux passed compile, py_compile, and the ledger regression suite, then `check-decision-ledger-sync.py` failed because the machine gate notes were still bound to step1197; Windows passed all 20 earlier cells and moved past the Step1200 clipping/readability fixes, then failed `landscape-667x375::normal` at "primary task is not reachable inside main or is obscured by navigation".
- Linux correction: all 14 machine gate notes are rebound to step1201 with the Run `33828015082` facts; the remaining five commands of that CI step (backend blockers, backend security, merge-matrix tests, release-checkpoint tests) pass locally.
- Windows root cause: the primary `[data-desktop-wan-evidence]` section is a ~506px stack that cannot fit a 375px/390px first viewport, and `scrollIntoViewIfNeeded` leaves its bottom 1.17px past the 1px tolerance. The compact landscape workbench now bounds the WAN rail (`max-height: calc(100vh - 24px)`, border-box, internal vertical scroll, `scroll-margin-bottom: 8px`), so the revealed rail box lands at viewport bottom minus ~7px with zero clipping and no sub-12px text; the two-column grammar and all other sizes are unchanged.
- Local verification: CSS-equivalent reproduction shows container clipping 0 and primary reachable at both 667×375 and 844×390; asset identity, static assets, report truth, workflow integrity, and a fresh desktop-density run all pass after rebuild.
- No Linux, Windows, or CL/GHCR result is current green evidence for the next candidate. Every result must bind to the exact SHA after this correction is committed and pushed.
- outcome: `1204:collection-tablet-threshold-and-dpr-evidence-fixed-awaiting-exact-sha-ci`

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
| CI Windows | failed on Run 33860099898 | cell 22/24 route text clipped at 667 landscape; compressible workspace columns fixed, fresh exact-SHA run required. |
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
