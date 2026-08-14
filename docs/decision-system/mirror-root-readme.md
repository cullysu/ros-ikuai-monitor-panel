RouterOS / iKuai panel decision repository mirror. **FAIL overall / Step962 focused product and visual review PASS / release CLOSED**.

这是当前面板工作的本地决策仓库镜像。Step962 记录新手机事故/巡检架构、连续桌面工作台、公开来源文案修正，以及 focused runtime、截图、独立产品和视觉复核均达到 P0/P1=0；这些仍是未提交工作树证据，提交后必须重建 clean exact-SHA 全量证据。任务 active、`blocked=false`，GitHub 未上传。

- status: `current-mirror-entry`
- currentStep: `962`
- currentOutcome: `962:independent-product-visual-p1-zero-focused-runtime-green-exact-candidate-replay-required`
- currentBoundary: `962`
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

当前产品结论：**FAIL overall / Step962 focused product and visual review PASS / release CLOSED**。focused runtime、截图与独立复核确认当前设计方向的 P0/P1 已清零，但提交后仍须重建 clean exact candidate evidence；真实 reviewer/AT、RouterOS 300s soak、五角色签名、可信 promotion 与 exact remote SHA Linux/Windows/GHCR CL 尚未完成。

## 过程怎么记录

每个材料性步骤必须包含：触发/问题、观察事实、决策、理由与拒绝项、验证、边界/心得。这里记录可审计的决策摘要，不冒充或输出模型私有逐字思维链。

## 强制更新规则

每个材料性切片结束后更新仓库日志和对应 decision-system 文件，再同步到 D 盘镜像。同步门禁必须满足语义步骤一致、Markdown 映射逐字节一致、没有额外 Markdown；根 README 还必须通过新鲜度检查。

Historical Step858–961 remains in `decision-system\historical-index.md` and the full decision log. Step962 is the current truth boundary. Historical green reports and local review never satisfy whole-product release qualification by themselves.
