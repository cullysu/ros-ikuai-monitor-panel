# Edict Bootstrap

task_id: edict-overview-ikuai40-p0-fix-20260629
stage: intake
risk_level: medium
repo: D:\cully\Documents\ros-ikuai-monitor-panel
head_at_intake: b5d123e
rollback:
  - Restore the backup folder created under codex-backups\pre-p0-fix-<timestamp> for public/index.html, tools/check-overview-ikuai-static.js, and tools/check-overview-ikuai-lite.ps1.

## Intake

User rejected the current overview panel on product semantics: no-snapshot desktop still has wrong filler, resource-full repeats tables, mobile top blocks are cramped, collection-down trust copy repeats, and interfaces-down still mixes forwarding evidence with management-channel evidence.

## Constraints

- Keep changes low-load and local to overview rendering / static gate only.
- Preserve user-visible rollback.
- Do not touch unrelated files or existing user changes.
- Final answer must include review verdict, verification status, and residual risks.

## Plan

1. Inspect current failing overview surfaces and identify the smallest set of code paths causing the P0/P1 audit misses.
2. Patch the layout/content density issues in `public/index.html` and align static checks if necessary.
3. Run lightweight static verification plus the relevant local predeploy overview scenarios.
4. Record final review and close the task only if the P0 issues are genuinely fixed.

## Stage Update - dispatch / execution

- Existing 6 subagents were queried; 4 returned. Audit findings: mobile no-snapshot/table compression, desktop shell whitespace, interfaces-down evidence layering, resource-full duplication, collection-down trust-copy repetition.
- Implementation returns touched public/index.html for no-snapshot mobile/desktop and resource-full panels. Main agent is integrating with small patches and lightweight verification.
