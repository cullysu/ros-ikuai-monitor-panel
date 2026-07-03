# Edict Task: overview iKuai App + Console v75

task_id: edict-overview-ikuai-app-console-v75-20260704
stage: intake -> planning -> plan_review -> dispatch -> execution -> integration -> final_review -> done
risk_level: high
created_at: 2026-07-04 Asia/Shanghai
repo: D:\cully\Documents\ros-ikuai-monitor-panel

## Objective
Redo RouterOS-iKuai overview product quality: mobile must become a real iOS-style iKuai 4.0 router App home, not rounded desktop cards; desktop must become a mature iKuai control console with clear hierarchy, no toy nav, no gate-driven report feel.

## Rollback
Backup directory: D:\cully\Documents\ros-ikuai-monitor-panel\codex-backups\overview-ikuai-app-console-v75-20260704-pre
Restore with PowerShell Copy-Item from backup to source/public asset paths. No destructive git reset required. Existing unrelated user changes app.py and tools/check-collector-regressions.py must not be reverted or staged.

## Dispatch
- audit A: mobile visual/product audit
- audit B: desktop visual/product audit
- impl 1: mobile top nav + hero architecture
- impl 2: mobile cards/resources/anomaly/rank architecture
- impl 3: desktop nav/hierarchy cleanup
- impl 4: desktop charts/tables/color business-language cleanup

## Acceptance Evidence Required
- npm run build
- overview static gate
- full public overview matrix: single/fleet/all-offline/no-snapshot/collection-down/resource-full/interfaces-down at 1366x900 and 390x844
- screenshot review of mobile normal/resource-full/all-offline/no-snapshot/interfaces-down and desktop single/resource-full/interfaces-down
- requirement-by-requirement final review

## Final Evidence
- TypeScript: `npm --prefix D:\cully\Documents\ros-ikuai-monitor-panel exec tsc -- --noEmit --pretty false` PASS
- Static gate: `node tools\check-overview-ikuai-static.js` PASS
- Build: `npm --prefix D:\cully\Documents\ros-ikuai-monitor-panel run build` PASS
- Matrix: `_acceptance\release-matrix-v75-cl-fix-20260704-r4\report.json` PASS
- Screenshot sample reviewed: `public-single-narrow-overview.png`, `public-no-snapshot-narrow-overview.png`, `public-collection-down-narrow-overview.png`, `public-all-offline-desktop-overview.png`
