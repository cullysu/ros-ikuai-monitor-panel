# Edict Task: overview iOS router product redesign v71

task_id: edict-overview-ios-router-product-v71-20260703
stage: done
risk_level: medium
rollback: codex-backups/overview-ios-router-product-v71-pre.patch

## Intake
- Objective: move mobile overview from rounded web cards to a real iKuai 4.0 + Apple-style router app home.
- Scope: mobile overview first; desktop hierarchy only where current UI contradicts the objective.
- User red lines: no desktop responsive collapse, no 2x2 KPI smell, no title collision, no ellipsis, no copied decorative sparklines, no large red/orange blocks, no toy desktop tabs.

## Required Edict stages
intake -> planning -> plan_review -> dispatch -> execution -> integration -> final_review -> done

## Rollback
- Pre-change patch snapshot is written before edits.
- Rollback command: git apply --reverse codex-backups/overview-ios-router-product-v71-pre.patch, or reset to prior commit if committed.


## Planning
- Mobile: rebuild as independent iOS-style router App home, not desktop responsive collapse.
- Desktop: preserve iKuai 4.0 console rhythm and keep toy mobile tab out of desktop.
- Verification: build, static gate, full desktop+narrow overview matrix, release readiness, packaging preflight.

## Plan Review
- Rollback point exists at codex-backups/overview-ios-router-product-v71-pre.patch.
- Risk accepted as medium UI-only change; no RouterOS/device writes, no deploy.

## Dispatch
- Main agent handled integration and verification.
- Implementation focused on OverviewPanel.tsx and OverviewPanel.css plus built public assets.

## Execution
- Reworked mobile hero into scene-aware App homepage: top nav, main status card, large metrics, scenario visual, status duet, resource meter, abnormal-only impact card, TopN list, bottom tab.
- Removed KPI-grid feel and title collision by separating label/verdict/meta and adding no-clip layout guards.
- Repaired no-snapshot, resource-full, and interfaces-down 390px clipping and copy repetition.
- Kept desktop gates green with no desktop mobile-tab leak.

## Integration
- Built public/assets/framework/panel-framework.js and public/assets/framework/style.css from source.

## Final Review
- npm run build: PASS
- node tools/check-overview-ikuai-static.js: PASS
- full overview matrix desktop=1366x900,narrow=390x844 for single/fleet/all-offline/no-snapshot/collection-down/resource-full/interfaces-down: PASS
- node tools/check-public-release-readiness.js --static-only: PASS
- tools/check-packaging-preflight.ps1 -StrictInstall -SkipDocker: 11 passed, 1 skipped, 0 failed
- Acceptance report: _acceptance/release-matrix-v71-final-20260703/report.json

## Done
- review verdict: pass for engineering gates; product direction moved toward iKuai 4.0 + Apple-style router App home.
- verification status: full local gate suite passed.
- residual risks: final aesthetic judgment still depends on screenshot/product review, not only automated checks.
