# 决策系统导航
- validForCommit: Step963 active CSS ownership and fixed asset budgets pass focused runtime; exact clean candidate replay remains open
- supersededBy: null
- status: `current-index`
- currentBoundaryForStep: `963`
- latestRecordedStep: `963`
- latestStepOutcome: `963:retired-css-owners-deleted-asset-budgets-and-focused-runtime-green-exact-replay-required`
- authority: `docs/decision-system/current-state.md`

当前结论由 `current-state.md` 唯一拥有；本页只负责导航，不重复历史流水账。

- 当前状态：`current-state.md`
- 当前索引：`current-index.md`
- 当前产品交接：`../product-loop-current.md`
- 当前发布边界：`release-journal.md`
- 完整历史：`../panel-redesign-decision-log.md`
- 历史索引：`historical-index.md`
- Step947 独立记录：`independent-reviews/step947-{product,visual,accessibility,engineering}.json`（历史本地证据，不是外部授权）

任务 active、`blocked=false`。Step963 删除未出现在生产包中的旧手机 layout 和桌面 recovered CSS，静态门禁改读真实 active owners；固定预算在不抬阈值下恢复，build、Incident Lens runtime、desktop v1030/no-snapshot/hierarchy 均通过。CSS cascade 已变化，因此 Step962 视觉签收历史化；提交后必须在新 clean SHA 重建完整矩阵、readiness、Accessibility/Security 与独立评审。真实手工 AT、真实 RouterOS 300s soak、外部五角色签名、可信授权和远端 Linux/Windows/GHCR CL 未完成；发布保持 FAIL/CLOSED，GitHub 未上传。
