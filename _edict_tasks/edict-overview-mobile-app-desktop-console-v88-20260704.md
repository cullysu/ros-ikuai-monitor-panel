# Edict Task: Overview mobile app + desktop console v88

task_id: edict-overview-mobile-app-desktop-console-v88-20260704
stage: done
risk_level: medium
created_at: 2026-07-04
scope: Rebuild mobile overview as an iKuai 4.0 + Apple-style router App home, and polish desktop overview hierarchy away from acceptance-report/dashboard feel.
rollback: git restore -- src/panel-framework/overview/MobileOverviewHome.tsx src/panel-framework/overview/OverviewPanel.tsx src/panel-framework/overview/OverviewPanel.css public/assets/framework/panel-framework.js public/assets/framework/style.css; remove this task file if not committed. No RouterOS/API/auth/schema/env/data-flow changes.

## intake
- Mobile product verdict: 52/100, not pass. Current design feels like rounded backend cards plus bottom tab, not a real mobile router App.
- Desktop product verdict: 72/100, CL green but experience feels like an acceptance-report dashboard instead of mature iKuai console.
- Target: mobile first-screen must be device/status + network hero + WAN/collection pair + resource strip + incident/top traffic + bottom tab; no desktop table collapse, no four-grid KPI, no title overlap/truncation.
- Target: desktop must remove toy content tabs, strengthen conclusion/key metrics/evidence hierarchy, and keep iKuai 4.0 calm dense console rhythm.

## planning
- Reuse existing data helpers where possible; replace mobile IA rather than patching old cards.
- Append/replace scoped CSS for v88 to avoid destabilizing unrelated sections.
- Desktop changes should be minimal but decisive: hide content-area toy nav on desktop and reinforce status/evidence rhythm.
- Verify with npm build, overview matrix, release readiness, and screenshot spot review.

## plan_review
- Rollback is git-restore based and safe; no live device, network, auth, schema, or deployment changes.
- Proceeding with implementation.

## dispatch
- Main agent performs integration and final review. If multi-agent tooling is available, use audit/implementation split; otherwise execute locally with focused reads and patches.

## execution
- pending

## execution_update_20260704_cl_fix
- Reproduced the reported CL error with `npx tsc --noEmit` on the current v88 working tree.
- Root cause: `MobileOverviewHome.tsx` compiled through Vite but failed strict TypeScript checks:
  - `trafficTotals()` reduce accumulator inferred against the WAN row type instead of `{ up, down }`.
  - two `state.scenario === "no-snapshot"` branches were unreachable after earlier no-snapshot early returns, so TS flagged impossible comparisons.
- Fix:
  - Added explicit reduce accumulator generic in `trafficTotals()`.
  - Removed unreachable no-snapshot comparisons in post-guard mobile metric/resource rendering.
  - Rebuilt generated public framework assets.

## integration_update_20260704_cl_fix
- PASS: `npx tsc --noEmit`
- PASS: `npm run build`
- PASS: `node tools/check-overview-ikuai-static.js`
- PASS: `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\ci-local.ps1 -SkipWindowsBuild`
- PASS: Git Bash/Linux-style `tools/ci-local.sh`
- PASS: full overview matrix 7 scenarios x 2 viewports at `_acceptance\codex-cl-error-fixed-20260704\report.json`
- PASS: full Windows local CI including EXE directory build via `tools/ci-local.ps1`

## final_review_update_20260704_cl_fix
- review_verdict: pass for the CL/typecheck failure.
- verification_status: TypeScript, frontend build, static overview gate, Windows CI path, Linux-style shell CI path, full browser overview matrix, and Windows EXE build all passed locally.
- residual_risks: visual/product verdict still depends on human screenshot review; untracked historical temp/backup/edict files remain intentionally untouched.

## done_update_20260704_cl_fix
- completed_at: 2026-07-04
