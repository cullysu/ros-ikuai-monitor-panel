# Edict Task: overview product polish v72

task_id: edict-overview-product-polish-v72-20260703
stage: done
risk_level: medium
rollback: codex-backups/overview-product-polish-v72-pre.patch

## Intake
- Evidence: v71 gates passed but screenshots still showed app-quality defects.
- Mobile defects: speed values collided, bottom tab appeared mid-content, resource rows overlapped, resource-full visual wasted space, hero chart felt decorative.
- Desktop defect: left status pills still read like fake buttons; console rhythm needed calmer treatment.

## Planning
- Keep scope to overview presentation layer and generated public framework assets.
- Do not touch collector/runtime user changes (`app.py`, `tools/check-collector-regressions.py`).
- Preserve mobile app-home direction: iKuai 4.0 light-blue/white + Apple-style hierarchy; no desktop table collapse.
- Fix CL failures by reading failure keys first, not by weakening gates.

## Plan review
- Rollback exists: `codex-backups/overview-product-polish-v72-pre.patch`.
- Safety: UI-only changes; no RouterOS/device access, no deployment, no config writes.
- Risk: medium due generated assets and responsive matrix gates.

## Dispatch
- Main agent handled integration and final verification directly; task was narrow CL/product polish after previous subagent implementation rounds.
- Used `frontend-design` guidance for production-grade frontend polish.

## Execution
- Shortened mobile rate formatting to compact `G/M/K/B` values to prevent 390px clipping.
- Moved mobile first-screen marker onto actual topnav+hero slice so app-home checks are scoped correctly.
- Repaired mobile bottom tab/fixed-tab rhythm while keeping CL visible checks green.
- Removed old `ik-mobile-resource-spark` class from resource-card rows to stop inherited spark/table styling from corrupting labels.
- Added final CSS overrides for resource rows and resource-full hero trend so text does not overlap and the scene visual is compact.
- Built public framework assets.

## Integration
- Updated files:
  - `src/panel-framework/overview/OverviewPanel.tsx`
  - `src/panel-framework/overview/OverviewPanel.css`
  - `public/assets/framework/panel-framework.js`
  - `public/assets/framework/style.css`
- Left existing unrelated tracked changes untouched:
  - `app.py`
  - `tools/check-collector-regressions.py`

## Final review
- Screenshot spot checks:
  - `_acceptance/release-matrix-v72-mobile-final-5-20260703/public-single-narrow-overview.png`
  - `_acceptance/release-matrix-v72-resource-hero-fix-20260703/public-resource-full-narrow-overview.png`
  - `_acceptance/release-matrix-v72-mobile-final-5-20260703/public-no-snapshot-narrow-overview.png`
- Final matrix report:
  - `_acceptance/release-matrix-v72-final-after-hero-20260703/report.json`

## Verification
- `npm run build`: PASS
- `node tools/check-overview-ikuai-static.js`: PASS
- `node tools/local-predeploy-check.js --profile public --viewports desktop=1366x900,narrow=390x844 --sections overview --scale-scenarios single,fleet,all-offline,no-snapshot,collection-down,resource-full,interfaces-down --strict-responsive --out _acceptance\\release-matrix-v72-final-after-hero-20260703`: PASS
- `node tools/check-public-release-readiness.js --static-only`: PASS
- `powershell -NoProfile -ExecutionPolicy Bypass -File D:\cully\Documents\ros-ikuai-monitor-panel\tools\check-packaging-preflight.ps1 -StrictInstall -SkipDocker`: PASS (11 passed, 1 docker config skipped by flag)

## Done
- CL error resolved.
- Full overview desktop+narrow 7-scenario matrix passes.
- Residual risk: visual taste still subjective; current automated and spot screenshot checks are green, but future product review may request additional aesthetic iteration.

## Stages
intake -> planning -> plan_review -> dispatch -> execution -> integration -> final_review -> done

## Rollback
- Pre-change patch written before edits.
- Rollback command: `git apply --reverse codex-backups/overview-product-polish-v72-pre.patch`
