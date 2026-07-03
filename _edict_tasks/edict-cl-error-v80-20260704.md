# Edict Task: overview CL/mobile app-home fix

- task_id: edict-cl-error-v80-20260704
- stage: final_review
- risk_level: medium
- rollback: git revert of the final commit; no schema/API/auth/data writes involved

## intake
Fix the failing CL/overview gates while preserving the RouterOS-iKuai read-only overview direction.

## planning
Use focused TSX/CSS/gate changes only. Avoid touching unrelated untracked temp files.

## plan_review
Safe rollback exists via git revert. No destructive filesystem operation required.

## dispatch
Six-agent review/implementation flow was used by the existing subagent batch; main agent integrated and verified.

## execution
- Reworked mobile overview copy/structure toward iOS app-home.
- Added mobile CSS readability guard for 390px.
- Fixed static/predeploy gate ordering and mobile/resource visual checks.
- Rebuilt public framework assets.

## integration
- GitHub CI failure reproduced from remote log: `Public overview predeploy smoke` failed at `public/fleet/narrow/overview` for commit `8489aa5`.
- Root cause isolated to mobile app-home text clipping risk in the first-screen rank/rate lane; local probe now prints compact app-home gate booleans before long details truncate.
- Applied scoped mobile CSS: rank rows now reserve a readable rate column, 390px core text uses clip-safe wrapping, and app-home bars stay thin enough not to trip progress/heavy-visual gates.
- Shortened the mobile采集 subcopy from split REST/SSH wording to `REST/SSH可用` when both channels match.
- PASS: `npm run build`
- PASS: `npx tsc --noEmit`
- PASS: `node tools/check-overview-ikuai-static.js`
- PASS: CI-equivalent smoke `node tools/local-predeploy-check.js --profile public --viewports desktop=1366x900,narrow=390x844 --sections overview --scale-scenarios single,fleet --strict-responsive --out _acceptance/cl-fix-8489-linux-mobile-smoke-3`
- PASS: full overview matrix `node tools/local-predeploy-check.js --profile public --viewports desktop=1366x900,narrow=390x844 --sections overview --scale-scenarios single,fleet,all-offline,no-snapshot,collection-down,resource-full,interfaces-down --strict-responsive --out _acceptance/cl-fix-8489-release-matrix-2`
- PASS: `node tools/check-public-release-readiness.js`

## final_review
Ready to commit/push; rollback remains `git revert <follow-up commit>`.
