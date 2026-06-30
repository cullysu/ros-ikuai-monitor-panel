# Edict Task: CI/CL framework-shell alignment

- task_id: `edict-ci-cl-framework-shell-fix-20260630`
- stage: `done`
- risk_level: `high`
- objective: Keep the framework-shell split intact while CI/CL and release checks validate the split release surface instead of the old monolithic index.
- rollback_plan:
  - Restore the pre-task rollback branch or matching backup for any future CI/CL or verification-doc edits.
  - Revert only the touched docs/checker/workflow paths if later implementation work expands beyond this record.

## Stage flow

- intake: done
- planning: done
- plan_review: done
- dispatch: done
- execution: done
- integration: done
- final_review: done
- done: done

## Verification matrix

| Check | Status | Evidence |
| --- | --- | --- |
| Collector regression check | PASS | `python tools/check-collector-regressions.py` |
| Public release readiness static gate | PASS | `node tools/check-public-release-readiness.js --static-only` |
| Public release readiness full gate | PASS | `node tools/check-public-release-readiness.js` using `local _acceptance/release-matrix-*-local/report.json` |
| Overview release matrix | PASS | `node tools/local-predeploy-check.js --profile public --viewports desktop=1366x900,narrow=390x844 --sections overview --scale-scenarios single,fleet,all-offline,no-snapshot,collection-down,resource-full,interfaces-down --strict-responsive --out _acceptance/release-matrix-*-local` |
| Packaging preflight strict install | PASS | `powershell -NoProfile -ExecutionPolicy Bypass -File tools/check-packaging-preflight.ps1 -StrictInstall -SkipDocker` |
| Overview static gate | PASS | `node tools/check-overview-ikuai-static.js` |
| Type check | PASS | `npx tsc -p tsconfig.json --noEmit --pretty false` |
| Build | PASS | `npm run build` |
| Local CI, no Windows rebuild | PASS | `powershell -NoProfile -ExecutionPolicy Bypass -File tools/ci-local.ps1 -SkipWindowsBuild` |
| Windows EXE directory build | PASS | `powershell -NoProfile -ExecutionPolicy Bypass -File tools/build-windows-exe.ps1 -NoZip` |
| Windows bundled asset verification | PASS | CI-equivalent PowerShell snippet for framework shell/assets/env defaults |
| Docker Compose config | PASS | `docker compose --env-file .env.docker.example config --quiet` |
| Diff check | PASS | `git diff --check` |

Notes:

- Direct `bash ...` from this Windows shell failed because WSL has no `/bin/bash`; the PowerShell preflight gate still passed its bash/install checks in the supported local path, and Linux CI provides bash.
- Full release readiness was verified locally after the CI-fix commit; GitHub CI creates its own release matrix report immediately before running the full readiness gate.
