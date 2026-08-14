# 决策系统导航
- validForCommit: Step964 mobile 12px text-floor repair passes focused runtime; exact clean candidate replay remains open
- supersededBy: null
- status: `current-index`
- currentBoundaryForStep: `964`
- latestRecordedStep: `964`
- latestStepOutcome: `964:mobile-small-text-floor-restored-two-cell-smoke-green-exact-replay-required`
- authority: `docs/decision-system/current-state.md`

当前结论由 `current-state.md` 唯一拥有；本页只负责导航，不重复历史流水账。

- 当前状态：`current-state.md`
- 当前索引：`current-index.md`
- 当前产品交接：`../product-loop-current.md`
- 当前发布边界：`release-journal.md`
- 完整历史：`../panel-redesign-decision-log.md`
- 历史索引：`historical-index.md`
- Step947 独立记录：`independent-reviews/step947-{product,visual,accessibility,engineering}.json`（历史本地证据，不是外部授权）

任务 active、`blocked=false`。Step964 修复首轮 exact matrix 揭露的手机 `small` 文本 11.11px 回归，active shell 恢复 12px floor，wide/narrow smoke 通过；固定预算仍通过。Step962 视觉签收历史化，Step963 的 1206979 matrix 为红色历史证据；提交后必须在新 clean SHA 重建完整矩阵、readiness、Accessibility/Security 与独立评审。真实手工 AT、真实 RouterOS 300s soak、外部五角色签名、可信授权和远端 Linux/Windows/GHCR CL 未完成；发布保持 FAIL/CLOSED，GitHub 未上传。
