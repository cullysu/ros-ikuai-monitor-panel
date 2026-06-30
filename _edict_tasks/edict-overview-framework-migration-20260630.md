# Edict task: overview framework migration

- task_id: `edict-overview-framework-migration-20260630`
- stage: `done`
- risk_level: `high`
- objective: Move overview panel logic out of `public/index.html` into the React/Vite panel framework and clear the overview semantic-density gates.
- rollback:
  - backup_dir: `D:\cully\Documents\ros-ikuai-monitor-panel\codex-backups\pre-framework-continuation-20260630-042551`
  - restore strategy: copy backed-up files over changed files, then rerun type/build/static/lite gates.
- stages:
  - intake: done
  - planning: done
  - plan_review: done
  - dispatch: done; six existing subagents assigned, 2 audit + 4 implementation
  - execution: done
  - integration: done
  - final_review: done
  - done: done

Final baseline:

- `public/index.html` is a thin shell that loads `/assets/framework/style.css` and `/assets/framework/panel-framework.js`.
- `src/panel-framework/overview/OverviewPanel.tsx` owns overview UI/layout semantics.
- `public/index.html` is 79 lines; overview implementation is no longer an inline 2w-line HTML application.
- Release readiness checks read the split release surface instead of requiring overview UI markers to live directly in `public/index.html`.

Verification:

- `node --check tools/local-predeploy-check.js`: PASS
- `npx tsc -p tsconfig.json --noEmit`: PASS
- `npm run build`: PASS
- `node tools/check-overview-ikuai-static.js`: PASS (`198 markers, 2 inline scripts`)
- Overview matrix: PASS, 14/14 cells
  - report: `D:\cully\Documents\ros-ikuai-monitor-panel\_acceptance\overview-framework-20260630-final\report.json`
- Release matrix evidence: PASS, 14/14 cells, current HEAD `b5d123e3eec860d69e8b452dcb8217842bf98098`
  - report: `D:\cully\Documents\ros-ikuai-monitor-panel\_acceptance\release-matrix-framework-20260630-final\report.json`
  - screenshots: `14`
- `node tools/check-public-release-readiness.js`: PASS
