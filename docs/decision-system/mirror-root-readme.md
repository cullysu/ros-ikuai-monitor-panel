# RouterOS / iKuai 面板决策仓库

这是当前面板工作的本地决策仓库镜像。Step844 已将完整本地工程证据重新绑定到 clean SHA `ec19b0da0815dd85bdb8035f2664d3dcea4f4532`：build、runtime、28/532/266/532 矩阵、focused contracts、资产、安全、RFC3339、collector 和 packet identity 均通过；浏览器 page/context 清理后无 stop-timeout warning。readiness 仍停在 route maturity；当前 SHA 的独立 Product/Design/Visual/Accessibility 复审、正式签收、RouterOS soak 和可信外部发布签收仍未完成。

- status: `current-mirror-entry`
- currentStep: `844`
- currentOutcome: `844:ec19-exact-rebind-browser-cleanup-and-local-gates-pass-formal-gates-open`
- currentBoundary: `844`
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

Step844: ec19 exact local evidence is green in the declared engineering scope; readiness correctly stops at `0 complete / 18 bounded-readonly / 0 fallback / 1 unavailable`. Browser cleanup no longer reports the prior stop-timeout warning. The packet remains `prepared-not-signed`, no trusted signature or GitHub upload exists, and current-SHA independent review, formal route-owner, RouterOS soak, CL and public release remain closed. This summary is not a signature.
