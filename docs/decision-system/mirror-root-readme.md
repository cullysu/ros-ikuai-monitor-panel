# RouterOS / iKuai 面板决策仓库

这是当前面板工作的本地决策仓库镜像。Step822 记录了 d44 精确 SHA 矩阵重跑和 scoped visual evidence 关闭；独立 Product/Design/Visual 公共签收、route maturity、Accessibility、RouterOS soak 和可信外部发布签收仍未完成。

- status: `current-mirror-entry`
- currentStep: `822`
- currentOutcome: `822:d44-exact-matrix-green-scoped-visual-pass-route-maturity-open`
- currentBoundary: `822`
- authority: `decision-system/current-state.md`

## 入口

- `decision-system\current-state.md`：唯一当前结论、评分口径和门禁。
- `decision-system\README.md`：短决策导航与同步规则。
- `面板重做决策日志.md`：逐步记录触发/问题、观察事实、决策、理由与拒绝项、验证、边界/心得。
- `面板重做纠正附录-2026-07-16.md`：历史纠正输入，仅作来源证据，不能覆盖 current-state。

## 直接打开

- 项目当前状态：`C:\Users\cully\Documents\ros-ikuai-monitor-panel-mobile-native-release\docs\decision-system\current-state.md`
- 项目详细决策过程：`C:\Users\cully\Documents\ros-ikuai-monitor-panel-mobile-native-release\docs\panel-redesign-decision-log.md`
- D 盘详细决策过程：`D:\想法\面板\面板重做决策日志.md`
- D 盘当前索引：`D:\想法\面板\decision-system\README.md`

## 当前边界

当前产品结论：**FAIL**。本入口不重复容易过期的分数、候选 SHA 或矩阵数量；动态结论只以 `decision-system\current-state.md` 为准。历史远端 CL 只能证明对应不可变 SHA 的工程发行，不能替代本地工作树的产品、设计、视觉或发布签收。

## 过程怎么记录

每个材料性步骤必须包含：
1. **触发/问题**
2. **观察事实**
3. **决策**
4. **理由与拒绝项**
5. **验证**
6. **边界/心得**

这里记录的是可审计的决策摘要，不冒充或输出模型私有逐字思维链。

## 强制更新规则

每个材料性切片开始前先写仓库日志和对应 decision-system 文件，再同步到 D 盘镜像。同步门禁必须满足语义步骤一致、Markdown 映射逐字节一致、没有额外 Markdown；根 README 还必须通过新鲜度检查。

Step822: d44 exact-SHA runtime and 28/76/266/532 matrix evidence is green in declared scopes; scoped visual review has no new screenshot P0/P1, while formal signoff and public release remain closed. This summary is not a signature.
