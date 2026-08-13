RouterOS / iKuai panel decision repository mirror. **FAIL overall / Step948 candidate trust contract focused PASS / release CLOSED**.

这是当前面板工作的本地决策仓库镜像。Step948 已将候选结构验证与外部身份/AT/授权彻底分开，focused tests 和独立复审通过；当前仍需外部 authority、真实 RouterOS soak 与最终 exact-SHA 全量重放。任务 active、`blocked=false`，GitHub 未上传。

- status: `current-mirror-entry`
- currentStep: `948`
- currentOutcome: `948:release-trust-contract-separated-and-focused-green-external-authority-open`
- currentBoundary: `948`
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

当前产品结论：**FAIL overall / candidate trust contract focused PASS / release CLOSED**。repository gate 只证明 bundle shape，外部 reviewer/AT authenticity、真实 RouterOS soak、clean exact candidate、可信 promotion authority 与 exact remote SHA 的 Linux/Windows/GHCR CL 尚未完成。

## 过程怎么记录

每个材料性步骤必须包含：触发/问题、观察事实、决策、理由与拒绝项、验证、边界/心得。这里记录可审计的决策摘要，不冒充或输出模型私有逐字思维链。

## 强制更新规则

每个材料性切片结束后更新仓库日志和对应 decision-system 文件，再同步到 D 盘镜像。同步门禁必须满足语义步骤一致、Markdown 映射逐字节一致、没有额外 Markdown；根 README 还必须通过新鲜度检查。

Historical Step858–947 remains in `decision-system\historical-index.md` and the full decision log. Step948 is the current trust-contract truth boundary. Historical green reports and local review never satisfy whole-product release qualification by themselves.
