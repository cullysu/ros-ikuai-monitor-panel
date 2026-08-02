# RouterOS / iKuai 面板决策仓库

这是当前面板工作的本地决策仓库镜像。Step856 记录 clean candidate `9f2305c2a500f909016ccd7189dedf1ef710ee17` 的 exact-SHA build/runtime/matrix 与独立 scoped Product/Design/Visual/Accessibility PASS；本地 scoped 视觉与交互审查已在声明范围内关闭，但正式签收、route maturity、RouterOS soak、exact-SHA Linux/Windows/GHCR CL 和可信外部发布签收仍未完成。治理提交后必须重新生成最终 exact-SHA 证据。emil-design-eng 已融合进 product-company-loop，强调静态证据和 reduced-motion。

- status: `current-mirror-entry`
- currentStep: `849`
- currentOutcome: `856:exact-sha-matrices-independent-scoped-reviews-formal-gates-open`
- currentBoundary: `849`
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

Step856: the clean candidate `9f2305c2a500f909016ccd7189dedf1ef710ee17` has exact engineering matrices and scoped Product/Design/Visual/Accessibility PASS with P0/P1=`0`. Strict route maturity remains `0 complete / 18 bounded-readonly / 0 fallback / 1 unavailable`; no trusted external signature, RouterOS soak or exact-SHA Linux/Windows/GHCR CL exists. The previous blocked marker was incorrect; this summary records an active, fail-closed task and is not a signature.
