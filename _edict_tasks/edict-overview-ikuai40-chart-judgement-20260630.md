# Edict task: overview iKuai 4 chart judgement pass

- task_id: `edict-overview-ikuai40-chart-judgement-20260630`
- stage: `done`
- risk_level: `high`
- objective: Move the overview panel from "has decorative charts" to mature iKuai 4.0 visual reading: every chart must carry operational judgement, scenario visuals must match the fault, mobile first screen must include micro charts, and large low-content cards must be removed.
- current_head_observed: `b5d123e`
- backup:
  - backup_dir: `D:\cully\Documents\ros-ikuai-monitor-panel\codex-backups\pre-ikuai40-chart-judgement-20260630-continue`
  - rollback strategy: copy `OverviewPanel.tsx`, `OverviewPanel.css`, and `local-predeploy-check.js` from backup into their matching repo paths, rebuild framework assets with `npm run build`, rerun type/static/matrix gates.
- stages:
  - intake: done
  - planning: done
  - plan_review: done
  - dispatch: done; six existing gpt-5.4-mini subagents assigned (2 audit, 4 implementation)
  - execution: done
  - integration: done
  - final_review: done
  - done: done

Final integration notes:

- `public/index.html` remains a thin framework shell: 79 lines. Business/framework code is not embedded in the shell.
- Restored shell-only legacy assets:
  - `public/assets/legacy/panel-legacy.css`
  - `public/assets/legacy/panel-legacy.js`
- Overview framework work remains in React/Vite:
  - `src/panel-framework/overview/OverviewPanel.tsx`
  - `src/panel-framework/overview/OverviewPanel.css`
- Vite build preserves sibling assets via `emptyOutDir: false`.
- No-snapshot desktop now uses a three-module ledger:
  - collection chain ledger
  - module visibility matrix
  - read-only boundary / degraded modules
- No-snapshot forbids WAN rate filler and `0 B/s`, keeps failed endpoint as `未记录`, and keeps default route in the main evidence path.
- Resource-full uses `最危险项 / 资源证据`, complementary connection/session/DNS/interface evidence, and no English `active sessions` visible copy.
- Mobile microbars expose chart markers and the mobile coverage gate accepts compact 260-320px ledger direction.

Final verification:

- `npx tsc -p D:\cully\Documents\ros-ikuai-monitor-panel\tsconfig.json --noEmit --pretty false`: pass
- `node --check D:\cully\Documents\ros-ikuai-monitor-panel\tools\local-predeploy-check.js`: pass
- `node --check D:\cully\Documents\ros-ikuai-monitor-panel\tools\check-overview-ikuai-static.js`: pass
- `node --check D:\cully\Documents\ros-ikuai-monitor-panel\public\assets\legacy\panel-legacy.js`: pass
- `npm run build`: pass
- overview matrix:
  - report: `D:\cully\Documents\ros-ikuai-monitor-panel\_acceptance\overview-ikuai40-chart-judgement-20260630-pass15\report.json`
  - scenarios: `single / fleet / all-offline / no-snapshot / collection-down / resource-full / interfaces-down`
  - viewports: `desktop=1366x900 / narrow=390x844`
  - result: pass

Residual risks:

- Git working tree contains substantial pre-existing untracked and modified files from the framework migration; do not push or commit blindly without selecting the intended release set.
- `tools/local-predeploy-check.js` still contains older mojibake-compatible matchers; current PASS is valid, but future cleanup should normalize checker source encoding rather than layering more dual-language regexes.
- Subagent outputs were partly based on older pass10/pass8 reports; final authority is the main-agent pass15 matrix.

Acceptance targets derived from user review:

1. Trend/pressure charts visibly expose current value, peak, mean, time window, threshold line, unit, and trust.
2. Normal overview traffic area includes WAN Top3, default route, sampling trust, recent peak, and does not leave a hollow lower panel.
3. Resource-full first screen prioritizes danger ranking, CPU/MEM/DISK pressure cards, connection pressure, and interface Top5 without duplicate filler.
4. No-snapshot uses compact chain/timeline/4-column visibility matrix with graphic empty state and no WAN rate/0 B/s placeholder.
5. Collection-down first visual is REST/SSH/snapshot channel + recent success timeline; resource evidence is secondary.
6. Mobile first screen has a real microchart for resource/WAN/collection/no-snapshot, not only text blocks.
7. Interfaces-down status blocks keep long parent/bridge/VLAN/PPPoE relationships in tables, not squeezed into top blocks.
8. Right-side tables use object/current/evidence style and reduce badge/column clipping.
9. Blue/white iKuai visual grammar: fewer nested boxes, red = over threshold, blue = reference/normal, gray = missing.
10. New gates should prove chart judgement and prevent low-content large cards.
