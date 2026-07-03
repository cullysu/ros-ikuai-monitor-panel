# Edict Task: overview product redesign v81

task_id: edict-overview-product-redesign-v81-20260704
stage: done
risk_level: medium-high
created_at: 2026-07-04
scope: redesign RouterOS-iKuai overview mobile app-home and desktop console hierarchy after product audit rejects current aesthetics
rollback: git revert final follow-up commit; if uncommitted, restore only touched tracked files from git. No API/schema/auth/data writes.

## intake
- Mobile verdict from audit: 52/100, not app-like; card stack, title collisions, fake Apple feel, weak charts, 2x2 KPI smell, truncation, vague status, weak resource full emphasis, generic tab.
- Desktop verdict from audit: 72/100; too acceptance-report-like; toy content top tabs, confused hierarchy, placeholder charts, whitespace/fill weakness, fake left status pills, severe states not forceful, RouterOS raw strings too dominant, over-compressed rows/color noise.

## planning
- Use frontend-design + ui-ux-pro-max.
- Substantial task: run 6-subagent workflow (2 audit + 4 implementation) with gpt-5.4-mini, while main agent owns integration.
- Primary design target: iKuai 4.0 light blue/white professional router console + Apple iOS app-home hierarchy, not generic rounded cards.

## plan_review
- Safe rollback exists via git revert.
- Do not touch unrelated untracked temp files.
- Preserve read-only/no config semantics.

## dispatch
- 2 audit + 4 implementation subagents used for v81 overview redesign.
- Main agent integrated subagent work and handled CL regression fix locally.

## execution
- Mobile app-home TSX/CSS polish integrated.
- Desktop console hierarchy/key metrics integrated.
- CL failure reproduced in `local-predeploy-check` desktop overview gates.
- Fixes:
  - Existing `DesktopKeyMetrics` cells marked as semantic fields, not KPI cards.
  - `resource-risk-priority` and `collection-channel-ledger` exposed as line-capable primary evidence modules.
  - Resource full primary chart switched to trend mode while retaining complementary pressure bars.
  - Collection down root module keeps line readability and internal channel pressure bars.

## integration
- Built public assets with `npm run build`.
- Left unrelated untracked temp files untouched.

## final_review
- Verification passed:
  - `npm run build`
  - `npx tsc --noEmit`
  - `node tools/check-overview-ikuai-static.js`
  - `node tools/local-predeploy-check.js --profile public --viewports desktop=1366x900,narrow=390x844 --sections overview --scale-scenarios single,fleet --strict-responsive --out _acceptance\cl-debug-public-predeploy-rerun2`
  - `node tools/local-predeploy-check.js --profile public --viewports desktop=1366x900,narrow=390x844 --sections overview-edge-cases --scale-scenarios all-offline,no-snapshot,collection-down,resource-full,interfaces-down --strict-responsive --out _acceptance\cl-debug-public-overview-edge-cases-rerun2`
  - `node tools/local-predeploy-check.js --profile public --viewports desktop=1366x900,narrow=390x844 --sections overview --scale-scenarios single,fleet,all-offline,no-snapshot,collection-down,resource-full,interfaces-down --strict-responsive --out _acceptance\cl-debug-release-matrix-full`
  - `node tools/check-public-release-readiness.js`
  - CI JS syntax checks for `public/*.js`, `tools/*.js`, and inline `public/index.html` scripts
  - Python collector regression checks
  - `.\tools\check-packaging-preflight.ps1 -StrictInstall -SkipDocker`
  - `docker compose --env-file .env.docker.example config --quiet`

## done
- Local CL-equivalent overview/browser gates pass.
- Rollback remains `git revert <final commit>` after commit, or restore touched tracked files before commit.
