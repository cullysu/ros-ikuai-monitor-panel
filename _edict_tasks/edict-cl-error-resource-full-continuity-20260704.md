# Edict Task: CL resource-full desktop continuity fix

- task_id: edict-cl-error-resource-full-continuity-20260704
- stage: done
- risk_level: medium
- rollback: `git revert <follow-up-commit>`; pre-commit rollback is restoring only `src/panel-framework/overview/OverviewPanel.css` and `public/assets/framework/style.css`.

## intake
GitHub CI failed on `b8cde22` in Linux `Public overview edge cases` at `responsive public/resource-full/desktop/overview`; the release matrix then missed the `resource-full/desktop` passed cell.

## planning
Keep the fix scoped to the resource-full desktop overview layout. Do not touch API, schema, auth, collector, or RouterOS data flow.

## plan_review
Safe rollback exists by reverting this follow-up commit. The change is CSS-only plus rebuilt public framework asset.

## dispatch
Task is a narrow CL follow-up; main agent handled diagnosis, integration, and review without launching another heavy subagent batch.

## execution
- Confirmed remote failed cell from GitHub run `28682445923`.
- Root cause: desktop resource-full left-column continuity was too close to the 120px gate threshold and differed under GitHub/Linux rendering.
- Added a scene-scoped desktop min-height for the primary `resource-risk-priority` evidence module.
- Rebuilt public framework assets.

## integration
- Touched files: `src/panel-framework/overview/OverviewPanel.css`, `public/assets/framework/style.css`.
- Unrelated untracked temp files were left untouched.

## final_review
- PASS: `npm run build`
- PASS: `node tools/check-overview-ikuai-static.js`
- PASS: CI smoke overview matrix for `single,fleet`
- PASS: CI edge overview matrix for `all-offline,no-snapshot,collection-down,resource-full,interfaces-down`
- PASS: full overview release matrix for all seven scenarios
- PASS: Windows packaging preflight
- PASS: Windows EXE directory build and bundled asset/env verification
- Resource-full desktop continuity margin after fix: bottom gap 78px / threshold 120px.

## done
Ready for commit and GitHub push; remote CI should re-run on the follow-up commit.
