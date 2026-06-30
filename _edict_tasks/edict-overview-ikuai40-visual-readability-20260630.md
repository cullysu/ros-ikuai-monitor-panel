# Edict task: overview iKuai 4 visual readability

- task_id: `edict-overview-ikuai40-visual-readability-20260630`
- stage: `done`
- risk_level: `high`
- objective: Improve overview panel from merely dense tables/framework shell toward mature iKuai 4.0 visual reading: charts must carry judgement, no large empty cards, scenario-specific visual priority, mobile microcharts, clean three-column right-side tables, and updated verification gates.
- current_head_observed: `b5d123e fix: default overview release matrix checks` (goal text referenced `3f75799`; current worktree is authoritative)
- backup:
  - backup_dir: `D:\cully\Documents\ros-ikuai-monitor-panel\codex-backups\pre-ikuai40-visual-readability-20260630-063531`
  - rollback strategy: copy backed-up files over matching repo paths, rebuild framework assets with `npm run build`, rerun type/static/matrix gates.
- stages:
  - intake: done
  - planning: done
  - plan_review: done
  - dispatch: done; used 6 subagents earlier in task, main agent integrated final targeted fix
  - execution: done
  - integration: done
  - final_review: done
  - done: done

Derived P0/P1 acceptance targets:

1. Trend and chart-like modules expose current / peak / mean / window / threshold or explicit unavailable state.
2. Normal overview left-side flow area is not a hollow WAN table/card; traffic module includes WAN Top3, default route, sampling trust, recent peak.
3. Resource-full prioritizes danger ranking / CPU-MEM-DISK cards / connection pressure / interface Top5, with no duplicate trend/table filler.
4. No-snapshot uses compact chain + time axis + visibility matrix; no WAN rate placeholder, no 0 B/s fake current value.
5. Collection-down prioritizes REST / SSH / snapshot channel strip + recent success timeline; resource trend sinks below collection evidence.
6. Mobile first screen contains a real micro visual (resource pressure, WAN status strip, chain timeline, etc.), not only text rows.
7. Interfaces-down top blocks do not concatenate raw parent/bridge strings; detailed relationships are in tables.
8. Right-side dense tables avoid clipped REST/SSH badges by using object/current/evidence three-column layouts.
9. Blue/white iKuai 4.0 feel: fewer nested boxes, external border + light separators, consistent red/warn/blue/gray chart semantics.
10. Gates are updated so green means the new visual-reading contract, not just old density counts.

Final verification on 2026-06-30:

- `public/index.html` remains a thin framework shell (79 lines); overview code lives under `src/panel-framework/overview`.
- `npx tsc -p tsconfig.json --noEmit`: PASS
- `npm run build`: PASS
- `node tools/check-overview-ikuai-static.js`: PASS (`218 markers, 2 inline scripts`)
- Targeted no-snapshot desktop:
  - command: `powershell -NoProfile -ExecutionPolicy Bypass -File tools/check-local-predeploy.ps1 -Profile public -Sections overview -Viewports desktop=1366x900 -ScaleScenarios no-snapshot -Out _acceptance/overview-nosnap-desktop-verify12`
  - responsive overview cell: PASS
  - release-matrix coverage warning expected for targeted single-scenario run only
- Full overview matrix:
  - command: `powershell -NoProfile -ExecutionPolicy Bypass -File tools/check-overview-ikuai-lite.ps1 -Out _acceptance/overview-ikuai40-visual-20260630-final`
  - scenarios: `single / fleet / all-offline / no-snapshot / collection-down / resource-full / interfaces-down`
  - viewports: `desktop=1366x900`, `narrow=390x844`
  - result: PASS

Final review verdict:

- PASS for the audited overview matrix and framework split.
- Residual risk: this is automated + code-level validation; a final human visual pass is still useful before announcing product-style completion.
