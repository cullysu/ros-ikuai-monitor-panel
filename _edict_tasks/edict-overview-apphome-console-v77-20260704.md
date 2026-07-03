# Edict Task: overview app-home/mobile + desktop console product redesign v77

task_id: edict-overview-apphome-console-v77-20260704
stage: done
risk_level: high
created_at: 2026-07-04
scope: redesign ros-ikuai-monitor-panel overview mobile as true iKuai 4.0 + Apple router app home, and tighten desktop iKuai 4.0 console hierarchy
backup: codex-backups/overview-apphome-console-v77-20260704-pre
rollback: copy backed-up files over touched overview/public asset files; do not git reset because local user changes exist

## intake
- User verdict: mobile 52/100, desktop 72/100; automated gates are insufficient.
- Mobile must be pushed past rounded desktop cards into a real app home: top device/status/time, network hero with download/upload/latency/connections + meaningful thin chart, WAN+collection twin cards, resource CPU/MEM/DISK strong meters, anomaly card only when needed, traffic TopN app-list, bottom tab.
- Desktop must stop looking like acceptance-report components: no content-area toy icon tabs, hierarchy is conclusion -> key metrics -> evidence, fixed skeleton top summaries + left network/WAN + right resource/collection + bottom interface/events/TopN, charts need one primary metric/threshold/anomaly point, right/bottom filled without fake filler.
- Hard bans: no table-compressed mobile, no 2x2 KPI taste, no title collision, no ellipsis on core statuses, no large red/orange fills, no copied decorative sparklines, no desktop logic squeezed into mobile.

## planning
- Inspect current TSX/CSS and newest screenshots/matrix outputs before relying on prior memory.
- Keep implementation scoped to OverviewPanel TSX/CSS and built public assets unless gates require script-only updates.
- Preserve unrelated local changes app.py and tools/check-collector-regressions.py.
- Verification must include TypeScript/static/build/full overview matrix and visual inspection of key mobile/desktop scenarios.

## plan_review
- Rollback is safe via file copy backup.
- No live RouterOS/network writes; this is local UI source/build work.
- Use frontend-design + ui-ux-pro-max as taste/spec layer; Ponytail keeps diff focused.

## dispatch
- Completed: 6 subagents were used earlier in this task family (2 audit, 4 implementation); main agent retained integration and final gate ownership.

## execution
- Reworked overview TSX/CSS for mobile app-home and desktop console direction.
- Removed synthetic mobile resource sparklines in favor of current/threshold/peak evidence meters.
- Added concrete mobile scenario labels and scenario-specific hero labels.
- Fixed CL failure causes:
  - no-snapshot row height overflow from an overlong business snapshot row.
  - all-offline desktop chart-readability contract missing a first-screen line evidence type.
  - all-offline desktop first-screen left-column bottom gap.

## integration
- Rebuilt public assets:
  - public/assets/framework/panel-framework.js
  - public/assets/framework/style.css
- Preserved unrelated local changes:
  - app.py
  - tools/check-collector-regressions.py
  - untracked temp/backups.

## final_review
- TypeScript: PASS (`npm exec tsc -- --noEmit --pretty false`)
- Build: PASS (`npm run build`)
- Static overview gate: PASS (`node tools/check-overview-ikuai-static.js`)
- Public static readiness: PASS (`node tools/check-public-release-readiness.js --static-only`)
- Full overview matrix: PASS
  - report: _acceptance/release-matrix-v77-apphome-console-20260704-r5/report.json
  - scenarios: single, fleet, all-offline, no-snapshot, collection-down, resource-full, interfaces-down
  - viewports: desktop=1366x900, narrow=390x844

## done
- Review verdict: CL failure fixed and overview matrix is green.
- Verification status: automated verification passed; screenshots spot-checked for all-offline and no-snapshot desktop plus mobile app-home examples.
- Residual risks: mobile visual polish still deserves product review; automatic gates cannot fully judge iKuai 4.0 / Apple-style taste.
