RouterOS / iKuai panel decision repository mirror. Step863 fixes the narrow-phone fixed-navigation capture boundary while preserving the fail-closed readiness boundary; formal acceptance, route maturity, RouterOS soak, exact-SHA CL and trusted publication signature remain open.

这是当前面板工作的本地决策仓库镜像。Step863 修复窄屏固定导航与证据边界的截图采集上下文；exact-SHA 证据只由机器状态绑定，交互 scoped review P0/P1 clean、产品 conditional、视觉需新 SHA 复验，正式签收、route maturity、RouterOS soak、exact-SHA Linux/Windows/GHCR CL 和可信外部发布签收仍未完成。emil-design-eng 已融合进 product-company-loop，强调静态证据和 reduced-motion。

- status: `current-mirror-entry`
- currentStep: `863`
- currentOutcome: `863:narrow-phone-fixed-nav-visual-context-fixed-formal-gates-open`
- currentBoundary: `863`
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

Historical Step858: report quarantine is bounded to current-source references and remains fail-closed; release remains closed and task remains active.
Step859: local scoped visual QA is P0/P1-clean for the declared screenshots and runtime contracts; formal acceptance and final exact-SHA rebind remain open, release remains closed and task remains active.
Step860: exact-SHA local visual and matrix evidence is green in scope; readiness reaches the real route-maturity gate; formal acceptance, soak, CL and publication remain closed, release remains closed and task remains active.
Step862: independent product/design/visual review findings are recorded; matrix aggregate families are isolated, runtime fixture identity is aligned with public matrix captures, and composite screenshot capture is stabilized. Formal gates remain closed and task remains active.
