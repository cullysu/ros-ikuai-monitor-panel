# Edict Task: Overview iKuai 4.0 chart readability

- task_id: edict-overview-ikuai40-chart-readability-20260630
- stage: done
- risk_level: high
- created_at: 2026-06-30 11:11:18 +08:00
- repo: D:\cully\Documents\ros-ikuai-monitor-panel
- observed_head: b5d123e
- user_reported_head: 3f75799 fix: mature overview ikuai visual grammar
- rollback: restore files from codex-backups/edict-overview-ikuai40-chart-readability-20260630 or use git checkout for tracked files before commit.

## Intake
User verdict: 76/100, not release-ready. Keep index.html as framework shell; improve mature iKuai 4.0 visual readability without reintroducing monolithic index.

## Architecture constraint
- `public/index.html` must remain a thin shell. No 20k-line inline UI/business implementation.
- Overview UI/business logic lives under `src/panel-framework/overview/` and is built by Vite into `public/assets/framework/`.
- Static gate must enforce the shell budget and framework asset entrypoints.

## Integration update
- 2026-06-30: `public/index.html` verified at 79 lines; no overview business/chart implementation embedded in shell.
- React/Vite build output is `public/assets/framework/panel-framework.js` and `public/assets/framework/style.css`.
- Static shell/framework gate passes.
- Full overview matrix pass4 still has failures; do not mark release-ready yet.
- 2026-06-30 16:27 +08: Mobile core/architecture/hard-compression failures were closed by compressing the mobile first-screen ledger, marking core microchart blocks as overview fields, and tightening resource/collection/fleet/interfaces wording.
- 2026-06-30 16:27 +08: Full overview matrix `overview-ikuai40-pass17-full` passed all required scenarios and viewports:
  - scenarios: `single`, `fleet`, `all-offline`, `no-snapshot`, `collection-down`, `resource-full`, `interfaces-down`
  - cells: 14 requested scenario/viewports, report records 28 overview result objects with 0 failures
  - screenshots: `_acceptance/overview-ikuai40-pass17-full/public-*-overview.png`
- 2026-06-30 16:29 +08: Static gate `node tools/check-overview-ikuai-static.js` passed; `public/index.html` remains a 79-line framework shell.
- 2026-06-30 16:29 +08: `npx tsc -p tsconfig.json --noEmit --pretty false`, `npm run build`, and `git diff --check` passed.

## Dispatch
- audit A: inspected mobile core/architecture/hard-compression gate causes.
- audit B: inspected chart judgement/scene priority/evidence weighting risks.
- worker 1: CSS-only mobile first-screen compression.
- worker 2: TSX mobile wording/semantic compression.
- worker 3: desktop scenario audit; no extra desktop TSX rewrite needed.
- worker 4: checker/docs scope audit.

## Final review
- Verdict: PASS for local release-readiness of the overview panel against the current iKuai 4.0 chart-readability contract.
- Evidence:
  - `D:\cully\Documents\ros-ikuai-monitor-panel\_acceptance\overview-ikuai40-pass17-full\report.json`
  - `D:\cully\Documents\ros-ikuai-monitor-panel\_acceptance\overview-ikuai40-pass17-full\public-single-desktop-overview.png`
  - `D:\cully\Documents\ros-ikuai-monitor-panel\_acceptance\overview-ikuai40-pass17-full\public-no-snapshot-desktop-overview.png`
  - `D:\cully\Documents\ros-ikuai-monitor-panel\_acceptance\overview-ikuai40-pass17-full\public-resource-full-narrow-overview.png`
- Residual risk:
  - `git status` still contains many pre-existing tracked/untracked files; this task did not clean or revert unrelated work.
  - Work has been verified locally; GitHub push/release is not part of this done stage unless explicitly requested.

## Required flow
intake -> planning -> plan_review -> dispatch -> execution -> integration -> final_review -> done

## P0 focus
1. Trend charts need current/peak/avg/window/threshold; not decorative.
2. Normal homepage left traffic panel must not leave large empty lower area; add WAN Top3/default route/sample confidence/recent peak.
3. Resource-full must prioritize danger bars/cards/connection pressure/interface throughput Top5; avoid duplicate chart/table clutter.
4. No-snapshot must use compact flow/timeline/4-column visibility matrix; adaptive height, no empty stretched cards.
5. Collection-down must focus REST/SSH/snapshot/cache confidence; resource charts downranked.
6. Mobile first screen must include a micro-chart.
7. Interfaces-down text blocks must avoid raw concatenation like bridgebridge-lan/parentpppoe.
8. Right-side tables should reduce to object/current/evidence, badges not consuming columns.

## P1 focus
Blue/white iKuai clarity; stable chart priorities per scenario; lighter Top5; fixed chart color semantics; topbar hierarchy; fewer repeated cache labels; graphical empty states; critical facts visible; no big cards with 1-2 lines.
