---
target: src/panel-framework/panel-framework-app.tsx
total_score: 65
p0_count: 0
p1_count: 2
timestamp: 2026-07-18T13-06-53Z
slug: src-panel-framework-panel-framework-app-tsx
---
⚠️ DEGRADED: single-context (spawn_agent unavailable in this session)

# 当前 RouterOS / iKuai 面板 Product Design / Visual QA 复审

## 发布结论

**FAIL。Nielsen 26/40（65/100），P0 0 项、P1 2 项。**

当前版本已经把事实语义和主要事故结构做对，工程矩阵也真实闭环；但 tablet 的稀疏任务架构和 mobile Overview→detail 的视觉语法仍未达到公众产品签收标准。本轮是降级单上下文复审输入，不能替独立 Product Design 或用户视觉签收。

## Design Health

| # | Nielsen 启发式 | 分数 | 关键问题 |
|---:|---|---:|---|
| 1 | 系统状态可见性 | 3 | 证据模式、时间、来源和不可用边界清楚；部分路由恢复反馈仍偏次级。 |
| 2 | 与真实世界匹配 | 3 | WAN、路由、采集和资源语言可信；少量标签仍像审计术语。 |
| 3 | 用户控制与自由 | 3 | 四个稳定入口、Back/Forward、筛选和对象返回成立；稀疏自动预览不总是显式选择。 |
| 4 | 一致性与标准 | 2 | Overview 是平面账本，详情又回到圆角卡片栈，容器语法漂移。 |
| 5 | 错误预防 | 4 | 只读边界和 unavailable 行为阻止假数字和写入误解。 |
| 6 | 识别优于回忆 | 3 | 状态、对象和来源就地可见；同权重边框降低扫读速度。 |
| 7 | 灵活性与效率 | 2 | 搜索、筛选、排序和分页已建立；768 稀疏工作区没有把宽度转成比较效率。 |
| 8 | 美观与极简 | 2 | 内容有效，但边框、色块、圆角小卡和侧色条制造持续视觉噪声。 |
| 9 | 错误诊断与恢复 | 3 | 事故边界和下一调查入口明确；部分详情恢复链仍不够直接。 |
| 10 | 帮助与文档 | 1 | 局部证据说明存在，任务式帮助有限。 |
| **总计** |  | **26/40** | **可用的工程产品；仍需显著设计整改。** |

## Anti-pattern verdict

这版已经摆脱拓扑概念稿、假 sheet、巨型健康卡和五栏 H5 导航。它不会第一眼被认作旧版废稿，但仍有典型“批量后台”痕迹：同一冷蓝灰表面、1px 容器边界、圆角分组和窄侧色条反复出现，信息正确却不够被精确编排。

确定性 detector 找到 2 条真实 `side-tab`：`mobile-domain.css:760` 与 `:763` 的 3px warning/danger 左边框。它们与人工审查指向同一问题，不是误报。浏览器可变控制面未暴露，因此没有可靠 overlay；本轮使用同一 fingerprint 的 production-runtime PNG 作为回退视觉证据。

## Overall impression

最大的进步是“异常态真的换证据结构”：全离线展示影响/恢复，无快照撤回业务数字，采集中断拆四平面，资源满载展示阈值和尾部连续样本，接口事故把依赖对象置前。最大的机会已经不是推倒首页，而是把 tablet 任务关系和详情视觉语法做成真正成熟的一套产品。

## What's working

1. 当前、历史、不可用和明确零值在页面结构中可区分，不再靠一句自报文案。
2. 390px 首屏按证据→结论→路由/WAN/采集→场景信号排列，5–10 秒巡检主线基本成立。
3. 1365/1366 连续、WAN 最大刻度完整；四个稳定入口、44px target、Back/Forward 和对象上下文已是实际行为。

## Priority issues

### [P1] 768 稀疏工作区由对象数量决定布局

**为什么重要**：`visibleRows.length <= 3` 直接选择 `short-stack`。在 768×1024 下，明明可容纳 280px 列表与 400px inspector，却变成上下长列并在底部留下大量空白。用户失去持续对象比较，也没有换来更多证据。

**修复**：让容器可用宽度、文字缩放和可用高度决定 split/stack；对象数量只决定预览内容，不决定整套任务架构。

**Suggested command**：`$impeccable adapt`

### [P1] Overview 与详情不是同一套容器语法

**为什么重要**：Overview 已经是平面运维账本，进入详情却重新出现一组组圆角卡片和 3px warning/danger 侧色条。操作员在最需要快速确认对象证据时，界面反而更厚、更像模板后台。

**修复**：把 inspector 改成一个分组证据面，内部用 1px 分隔；风险由领先图标、明确文字和低色度整行底色表达。只给外层分组或真实交互控件圆角，不给每个证据段单独造卡。

**Suggested command**：`$impeccable distill`

### [P2] 描述性事实也被强制等宽

`.mdi-facts b` 对中文状态、说明和值统一使用 monospace，详情比 Overview 更僵硬。等宽/表格数字应只用于速率、IP/MAC、时间、路由表达式和 ID。

**Suggested command**：`$impeccable typeset`

### [P2] 手机资源态隐藏已有的精确尾部样本

390px 有阈值、六点图和明显空余尾部，但精确样本只在 tablet 表格出现。可加入紧凑的最后三样本账本或可展开样本行，用已有证据证明连续性。

**Suggested command**：`$impeccable layout`

## Persona red flags

- **Alex（熟练运维）**：768px 两个接口仍要纵向读完整列表和 inspector；宽度没有换成比较速度。
- **Sam（辅助技术/低视力）**：线性证据语义可靠，但卡片、色条和 tint 增加视觉层而不改善阅读顺序；真实屏幕阅读器任务仍未签收。
- **Casey（单手巡检）**：事故首判已不必切页；resource-full 的精确连续样本仍需读小图或换到更宽表面。

## Minor observations

- 正常态“业务可用性尚未判定”是诚实边界，不应为了积极语气改成“网络良好”。
- 日志详情标题已是来源/对象类型，事件正文只在详情证据中出现一次；旧“完整复读”问题当前不可复现。
- “处置入口”已经降级为“巡检/调查入口”；在没有 objectId 的动作上继续保持该措辞。
- 冷蓝本身不是问题；问题是每个层级都使用同一种冷蓝容器。

## Questions to consider

- 如果 768px 已经能放下列表与 inspector，为什么还要让对象数量改变任务架构？
- 如果状态已经由图标、文字和整行 tone 表达，3px 侧色条还增加了什么判断？
- 详情页每个圆角边界是否都对应一个真实可独立操作或独立滚动的对象？如果不是，为什么它是一张卡？

Questions skipped: 用户已经明确要求按全部 P0/P1 持续整改，两个 P1 的责任阶段和修复方向均可由当前合同确定，无需再次询问优先级。

## Recommended actions

1. `$impeccable adapt`：删除对象数量驱动的 tablet 架构切换，用真实能力决定 split/stack。
2. `$impeccable distill`：统一 Overview/inspector 的平面证据语法，移除 3px side-tab 和嵌套卡片感。
3. `$impeccable typeset`：把等宽字体收回到可验证的操作数据类型。
4. `$impeccable layout`：在不挤占首判的前提下补手机资源精确尾部样本。
