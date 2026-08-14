RouterOS / iKuai panel decision repository mirror. **FAIL overall / Step963 focused engineering repair PASS / release CLOSED**.

这是当前面板工作的本地决策仓库镜像。Step963 删除未出现在生产包中的旧手机和桌面 CSS owner，修正静态门禁的真实读取路径，并在不抬预算阈值下恢复 focused runtime 与资产预算。CSS cascade 已变化，Step962 视觉复核历史化；提交后必须重建 clean exact-SHA 全量证据。任务 active、`blocked=false`，GitHub 未上传。

- status: `current-mirror-entry`
- currentStep: `963`
- currentOutcome: `963:retired-css-owners-deleted-asset-budgets-and-focused-runtime-green-exact-replay-required`
- currentBoundary: `963`
- authority: `decision-system/current-state.md`

## 入口

- `decision-system\current-state.md`：唯一当前结论、证据和门禁。
- `decision-system\README.md`：短决策导航与同步规则。
- `面板重做决策日志.md`：逐步记录触发/问题、观察事实、决策、理由与拒绝项、验证、边界/心得。
- `面板重做纠正附录-2026-07-16.md`：历史纠正输入，仅作来源证据，不能覆盖 current-state。

## 直接打开

- 项目当前状态：`C:\Users\cully\Documents\ros-ikuai-monitor-panel-mobile-native-release\docs\decision-system\current-state.md`
- 项目详细决策过程：`C:\Users\cully\Documents\ros-ikuai-monitor-panel-mobile-native-release\docs\panel-redesign-decision-log.md`
- D 盘详细决策过程：`D:\想法\面板\面板重做决策日志.md`
- D 盘当前索引：`D:\想法\面板\decision-system\README.md`

## 当前边界

当前产品结论：**FAIL overall / Step963 focused engineering repair PASS / release CLOSED**。active owner、固定资产预算和 focused runtime 已通过，但新的 clean exact candidate、Product/Design/Visual、Accessibility/Security 与完整矩阵必须重放；真实 reviewer/AT、RouterOS 300s soak、五角色签名、可信 promotion 与 exact remote SHA Linux/Windows/GHCR CL 尚未完成。

## 过程怎么记录

每个材料性步骤必须包含：触发/问题、观察事实、决策、理由与拒绝项、验证、边界/心得。这里记录可审计的决策摘要，不冒充或输出模型私有逐字思维链。

## 强制更新规则

每个材料性切片结束后更新仓库日志和对应 decision-system 文件，再同步到 D 盘镜像。同步门禁必须满足语义步骤一致、Markdown 映射逐字节一致、没有额外 Markdown；根 README 还必须通过新鲜度检查。

Historical Step858–962 remains in `decision-system\historical-index.md` and the full decision log. Step963 is the current truth boundary. Historical green reports and local review never satisfy whole-product release qualification by themselves.
