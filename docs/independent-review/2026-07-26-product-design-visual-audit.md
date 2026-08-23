# 2026-07-26 Product / Design / Visual QA 独立复核

- status: `independent-review`
- validForCommit: `a414f7aef2a4545c78a9a42e34e9cb6d6cf3aca3` plus current dirty worktree
- conclusion: **not signed off**
- scope: current worktree fresh runtime originals; this document is evidence for review, not a release approval

## 方法与边界

本轮只使用当前工作树的生产浏览器原图和对应的 focused contracts，不把自动化通过数量当作 Product、Design 或 Visual QA 签收。检查了 390×844 手机正常态与复合事故态、768×1024 平板正常态、844×1024 接口工作区、1366×768 桌面正常态与事故态，以及 1365/1366 连续性和 WAN 图表原图。

对应原图：

- ` _acceptance/panel-runtime-browser/overview-normal-task-390.png`
- ` _acceptance/panel-runtime-browser/mobile-composite-risk-390.png`
- ` _acceptance/panel-runtime-browser/tablet-overview-normal-768.png`
- ` _acceptance/panel-runtime-browser/tablet-interface-review-844.png`
- ` _acceptance/panel-runtime-browser/overview-normal-task-1366.png`
- ` _acceptance/panel-runtime-browser/desktop-composite-risk-1366.png`
- ` _acceptance/panel-runtime-browser/desktop-overview-wan-axis-1366.png`

## 可确认的进步

1. 手机首屏已经按证据顺序呈现状态、鲜度、当前对象、事实、运行判断和趋势；没有发现旧拓扑壳或假 bottom sheet。
2. 复合事故态确实改变了优先级：接口依赖和资源超限先于对象调查；这不是只换标题颜色。
3. 768px 采用纵向任务流，844px 接口工作区有列表与检查器；没有复现旧的 1365/1366 两棵桌面树或 WAN 最大刻度被裁成 25 Mbps 的旧截图。
4. 当前 focused contracts 均通过：响应式边界、桌面信息效率、平板任务空间、手机详情新证据、手机动作上下文、报告真值、原子流量历史和资产身份。

## 仍未达到独立签收的观察

### R07 — 手机视觉成熟度仍未签收

390px 原图中，状态、运行判断、对象调查、证据边界和底部导航连续使用浅蓝/灰底、细边框、左侧色条和相同的圆角小块。层级是可读的，但视觉中心仍像一组规则化后台区块，而不是一个有明确“当前判断 → 最高风险 → 下一动作”节奏的巡检工具。复合事故态的每个任务块仍给出相近的垂直重量，扫描成本偏高。

### R09 — 平板任务空间仍需产品验收

768px 正常态的纵向任务流是诚实的 fallback，但一屏内同时出现路由证据、吞吐、判断、关系、巡检入口和证据边界；这些区域虽然都回答不同问题，却缺乏一个明确的对象比较焦点。844px 接口工作区的列表/检查器关系成立，但右侧证据向下延展，仍需要真实任务时间和独立平板审查证明“更宽”确实带来更快的选择与核对。

### R10 — 桌面信息密度与高级感仍未签收

1366px 正常态的断点连续性已成立，图表刻度也显示完整 `31.25 Mbps`；但首屏仍由较大的结论带、宽 KPI 组和大块留白构成，比较、关系和下一动作被推到首屏下方。事故态的对象检查器比正常态更紧凑，说明两种任务节奏仍不完全统一。当前只能称为 focused engineering green，不能称桌面产品完成。

### R14 — 移动/桌面共同视觉语法仍需独立签收

两端共享数据模型、证据语言和任务地标，但视觉容器和节奏仍明显不同：手机依赖连续 ledger 行，桌面依赖卡片/表格区域。交互差异是合理的，状态层级、对象比较、证据边界和动作命名仍应在跨端任务复核中证明一致。

## 陈旧问题的处理

- 旧的 1365/1366 断崖、日志详情正文复读、WAN 最大刻度裁切在当前原图中没有复现，保留为 stale 历史证据，不恢复旧实现。
- 这不等于 R07/R09/R10/R14 已通过；当前证据只能关闭对应的旧复现描述，不能替代独立产品和视觉签收。

## 决策与下一步

当前保持 Product=`failed`、Design=`failed`、Visual QA=`failed`。下一步不是继续增加矩阵数量或放大标题，而是建立跨端视觉语法的红合同，先减少手机事故态的同权重区块和桌面首屏的空白/大块结论带，再用同一组任务对比 fresh 原图。任何视觉改动都不得改变证据模式、对象身份、路由成熟度或只读边界。

## 证据命令

- `node tools/check-responsive-boundary-contract.js`
- `node tools/check-desktop-information-efficiency.js`
- `node tools/check-tablet-information-efficiency.js`
- `node tools/check-tablet-task-space.js`
- `node tools/check-mobile-detail-novel-evidence.js`
- `node tools/check-mobile-action-context.js`
- `node tools/check-report-truth.js`
- `node tools/check-atomic-traffic-history.js`
- `node tools/check-route-maturity-report.js`

这些命令通过，只证明当前工程合同通过；本报告本身仍明确不给 Product、Design、Visual QA 签字。

## 后续 focused visual iteration（不构成签收）

基于上述观察，当前工作树完成了一个有边界的视觉迭代：移动事故对象行收敛到 60px、调查动作行收敛到 56/52px；桌面 verdict 从大型结论块压缩为更短的状态条；移动和桌面根节点现在共同声明 `network-console-v1`。fresh runtime 已重新生成 `mobile-composite-risk-390.png`、`overview-normal-task-390.png`、`overview-normal-task-1366.png` 和 `desktop-composite-risk-1366.png`，runtime `234 checks / 98 screenshots / 122 snapshotApiCalls` 通过。

这次迭代只证明视觉重量朝目标移动且没有破坏证据顺序；R07/R09/R10/R14 仍未签收，必须继续用跨端任务复核，而不是把这次 CSS/标记调整写成产品完成。

## Step518 focused follow-up：R10 首屏任务密度切片已验证，独立签收仍开放

- fresh `overview-normal-task-1366.png` 与 `overview-normal-task-1440.png` 在桌面正常态重新生成并查看。
- `desktop-normal-density-v1` 从实现前的 `297px / 274px / 766–818` 收敛到 `normalTopBand=254px`、`focus=197px`、第一条调查动作 `715–765`；1366 首屏不再只露出动作上沿。
- WAN 图表仍保留完整 `31.25 Mbps` 纵轴、时间窗、下载/上传序列和单位；没有用小字号或删除证据换空间。
- 该结果只关闭 R10 的一个 focused engineering/runtime slice。桌面整体留白、正常/事故节奏、R07 手机视觉成熟度、R09 平板产品效率和 R14 跨端视觉语法仍未由独立评审签收；Product/Design/Visual 继续 `failed`。

## Step510 复核补充：R09 对象焦点顺序 focused green，但独立签收仍开放

- tablet-normal-object-focus-v1 已在当前工作树完成 focused engineering/runtime slice：normal tablet 只复用一个对象关系 workspace，并将其置于 MobileSteadyDecisionLedger 之前。
- fresh tablet-overview-normal-768.png、tablet-overview-master-detail-844.png 与 production browser runtime 235 checks / 98 screenshots / 122 snapshotApiCalls 已重新生成并通过。
- 这证明对象选择入口更早可见、没有新增重复 DOM；不证明平板整体信息效率、留白利用或 Product/Design/Visual 签收。
- 因此 R09 的“对象焦点太晚”这一工程切片记为 focused green，R09 独立产品判断仍 open；R07、R10、R14 继续 open，整体 release boundary 仍 **FAIL/closed**。

## Step520 focused follow-up：R07 事故 Proof 所有权切片已验证，独立签收仍开放

- fresh `mobile-composite-risk-390.png` 复核发现的可复现问题是：接口风险计数同时出现在 Proof 与最高风险对象中，造成事实复读；这不是旧日志详情复读问题，旧问题仍保持 stale，不恢复旧实现。
- `mobile-incident-proof-ownership-v1` 先在实现前以 `375/390` runtime 失败，随后将 `interfaces` / `interface-review` 的 Proof 改为默认路由、WAN 范围、采集通道；对象区保留未运行计数、对象名、默认路由依赖和运行标志。
- checker、types、Overview、build 与 fresh runtime `235 checks / 98 screenshots / 122 snapshotApiCalls` 通过，更新后的 `mobile-composite-risk-390.png` 已查看；这只证明事实所有权的 focused green。
- R07 整体视觉成熟度、R09 平板产品效率、R10 桌面信息密度、R14 跨端视觉语法仍未独立签收；Product/Design/Visual 继续 `failed`，整体 release boundary 仍 **FAIL/closed**。

## Step715 R09 fresh expected-red：平板对象比较仍晚于首屏任务焦点

- status: write-ahead-expected-red
- evidence: 当前 _acceptance/panel-runtime-browser/report.json；对应合同 tools/check-r09-tablet-object-focus-v1.js。
- observed: 768px normal tablet 的 object workspace top=780，viewport=1024，ratio=0.76171875；合同阈值为 0.72，当前失败。relation top=1175、evidence top=1296，顺序仍正确。
- interpretation: 这是对象比较进入巡检路径太晚的产品/设计风险，不是要求把所有证据塞入首屏，也不是用字符数或 DOM 数量提高密度。
- next: 先提出不删证据的任务顺序方案，再重新生成 768/844 当前原图；Product、Design、Visual QA 仍 pending，本文不授予签收。

## Step716 R09 object-focus reorder：focused engineering green，独立签收仍未完成

- status: focused-engineering-green-not-signed
- fresh evidence: panel-runtime-browser 256 checks / 98 screenshots / 123 snapshotApiCalls；768px normal object workspace top=229, bottom=624, first-screen ratio=0.2236；844px normal object workspace top=229, first real object row visible ratio=1, overflow=0。
- interpretation: the object comparison now leads the normal tablet task path; route/signal/decisions follow it, while relation and evidence remain after the workspace. The R09 geometry red is closed only as an engineering slice.
- product boundary: R09 overall tablet efficiency, usable object comparison time, R07/R10/R14, Product/Design/Visual, Accessibility, route maturity, RouterOS soak, clean candidate, exact-SHA CL and public release remain open or closed as previously recorded.
- next: regenerate current 768/844 originals and seek independent R09 Product/Design/Visual review; do not promote this engineering result to release approval.

## Step717 R09 related-object rail touch target expected-red

- status: write-ahead-expected-red
- evidence: tools/check-tablet-related-object-rail.js returns 5/6; the only failure is the missing real touch-target CSS owner for related-object entries.
- interpretation: the object rail has a real button and bounded related rows, but the active domain stylesheet does not declare the required 46px minimum target.
- boundary: this is a narrow accessibility/interaction red, not a release approval or external blocker. Product/Design/Visual and route maturity remain open.
- next: add the touch-target owner without changing object order or evidence, then regenerate fresh runtime evidence.

## Step718 R09 related-object rail touch target：focused engineering green，独立签收仍未完成

- status: focused-engineering-green-not-signed
- evidence: tablet-related-object-rail 6/6；types、Overview、build 和 fresh panel-runtime-browser 256/98/123 pass；active mobile-domain.css now owns a 46px minimum related-object button target and visible focus ring.
- interpretation: the narrow interaction red is closed without changing object order, evidence ownership or related-row bounds. This does not sign R09 overall tablet efficiency or Accessibility.
- boundary: Product/Design/Visual、R07/R09/R10/R14、route maturity、RouterOS soak、clean candidate、exact-SHA CL and public release remain open or closed as previously recorded.
- next: select the next fresh R07/R10/R14 product/visual red contract without increasing matrix count.


## Step767 R07 mobile incident visual dominance：expected-red

- status: `write-ahead-expected-red`
- evidence: `tools/check-mobile-incident-visual-dominance-v1.js` against the current `_acceptance/panel-runtime-browser/report.json`.
- observed: fresh 375px and 390px interface-incident samples both measure the primary risk plane at `151px` and the follow-up investigation plane at `131px` (`0.8675`); the new bounded contract requires the follow-up plane to stay at or below `0.82` of the primary risk plane, so both cells fail before implementation.
- interpretation: this is a narrow R07 rhythm red translating the independent observation that incident support blocks still carry nearly the same vertical weight as the primary risk. It does not ask for smaller text, removed evidence, DOM filler or a Product/Design/Visual signature.
- next: reduce only the follow-up header non-evidence rhythm while preserving the 56px primary action, 44px secondary actions and evidence ownership, then regenerate 375/390 runtime evidence.

## Step768 focused follow-up：R07 手机事故主风险视觉支配度已验证，独立签收仍开放

- status: focused-green-engineering-not-signed
- evidence: tools/check-mobile-incident-visual-dominance-v1.js against fresh _acceptance/panel-runtime-browser/report.json.
- observed: 375/390 手机接口事故态的主风险区仍为 151px，follow-up 调查区从 131px 降为 123px，比例 0.8146 <= 0.82；primary action 56px、secondary actions 45px、overflow 0 均保持。
- interpretation: 只关闭“事故态后续区过重”的 R07 窄工程切片。它不等于整体手机视觉成熟，不等于 Product/Design/Visual 签收；R07、R09、R10、R14 仍 open。
- verification: fresh runtime 256 checks / 98 screenshots / 122 snapshotApiCalls、build、primary-dominance、rhythm、support-boundary 与 cross-surface grammar 均通过；release remains FAIL/closed，releaseEvidenceEligible=false，未 commit、未上传。
- next: 先建立 R07/R09/R10/R14 下一个可复现 expected-red，再做最小修复和独立复核；不因局部工程绿灯开放发布。

