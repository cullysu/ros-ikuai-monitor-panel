# 决策系统导航
- validForCommit: Step949 records the d13ac20 short-landscape remediation; c075 exact evidence is historical and release remains closed
- supersededBy: null
- status: `current-index`
- currentBoundaryForStep: `949`
- latestRecordedStep: `949`
- latestStepOutcome: `949:d13ac20-short-landscape-nav-remediation-passes-focused-gates-exact-rebuild-required`
- authority: `docs/decision-system/current-state.md`

当前结论由 `current-state.md` 唯一拥有；本页只负责导航，不重复历史流水账。

- 当前状态：`current-state.md`
- 当前索引：`current-index.md`
- 当前产品交接：`../product-loop-current.md`
- 当前发布边界：`release-journal.md`
- 完整历史：`../panel-redesign-decision-log.md`
- 历史索引：`historical-index.md`
- Step947 独立记录：`independent-reviews/step947-{product,visual,accessibility,engineering}.json`（历史本地证据，不是外部授权）

任务 active、`blocked=false`。Step949 记录 c075 的 `28/76/266`、real Edge `22/22` 与外部 authority pin audit 均通过，但 Product exact review 的唯一 `844×390` standalone Chrome P2 已由 d13ac20 修复；因此 c075 证据已历史化。d13ac20 的 focused gate 和截图通过，却仍须在最终治理提交后用新 clean SHA 重建完整证据。真实手工 AT、真实 RouterOS 300s soak、外部五角色签名、可信授权和远端 Linux/Windows/GHCR CL 未完成；发布保持 FAIL/CLOSED，GitHub 未上传。
