# Edict Task

task_id: edict-overview-product-redesign-v87-20260704
stage: done
risk_level: medium
scope: RouterOS-iKuai read-only overview product redesign v87; mobile app-home must be rebuilt, desktop console hierarchy must stop looking like acceptance report.
rollback: tracked frontend files can be restored with `git restore --source=HEAD -- <files>`; prechange patch saved at `codex-backups/edict-overview-product-redesign-v87-prechange.patch`; per-file backups saved under `codex-backups/*20260704-v87.bak`; no RouterOS/API/auth/build/deploy/env/data-flow changes intended.

## intake
- User verdict: mobile 52/100, desktop 72/100; CL green is insufficient.
- Mobile must be a real router App homepage: top device/status/time, one hero network status with download/upload/latency/connections + meaningful thin chart, secondary WAN+采集 cards, resource card CPU/内存/磁盘, exception card only abnormal, TopN app-style list, bottom tab.
- Desktop must remove content-area toy tab, restore mature iKuai console hierarchy: conclusion, key metrics, evidence tables; left menu + top six status summaries only.
- Hard bans: KPI four-grid smell, title overlap, ellipsis for core states, field pile-up, desktop table collapse into mobile, large red/orange blocks, fake decorative sparklines, mobile tabs in desktop content.

## stages
intake -> planning -> plan_review -> dispatch -> execution -> integration -> final_review -> done

## safety
- Touch only overview frontend source/CSS and generated public framework assets unless evidence forces otherwise.
- Do not delete or commit historical untracked tmp files.
- Preserve read-only monitoring behavior; do not touch RouterOS collection/config paths.

## execution
- CL failure reproduced from _acceptance/codex-v87-smoke1/report.json: mobile acceptance false because hero stat rail collapsed to 2x2 KPI geometry.
- Hypothesis: old v86/mobile CSS was overriding the v87 app-home stat rail.

## planning
- Fix CL first by preserving app-home IA while satisfying the mobile acceptance contract; do not reintroduce desktop table collapse.
- Keep changes scoped to MobileOverviewHome, OverviewPanel CSS, generated build assets, and this Edict record.
## plan_review
- Rollback available via git restore/prechange patch; no RouterOS/API/schema/auth/env/data-flow edits.
- Main risk: old layered mobile CSS overriding v87 app-home styles.
## dispatch
- Main agent handled integration because existing six subagent slots were already occupied and CL failure was isolated to CSS/contract interaction.
## integration
- Removed legacy v86 class from mobile app root so old 2x2 KPI styling no longer wins.
- Added final v87 CSS overrides for hero stat rail, sparkline paint, and no-snapshot channel rail.
- Rebuilt generated framework assets.
## final_review
- npm run build: PASS.
- Mobile smoke after repair: requested mobile cells PASS; incomplete release-matrix failure only when intentionally running subset.
- Full overview release matrix PASS: _acceptance/codex-v87-release-matrix/report.json covers single/fleet/all-offline/no-snapshot/collection-down/resource-full/interfaces-down at desktop 1366x900 and narrow 390x844.
- Manual screenshot audit: black sparkline fill removed; no-snapshot channel blocks no longer render as one run-on line; remaining product risk is taste-level polish, not CL failure.
