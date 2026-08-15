# Mobile OriginOS × iOS Reset Contract

- status: `superseded`
- validForCommit: false; superseded by `docs/mobile-ikuai4-design-contract.md`
- supersededBy: `docs/mobile-ikuai4-design-contract.md`
- step: `1024`
- release: `FAIL / CLOSED`

## Product promise

在一只手、一次扫视和一次点击内，让用户知道：网络现在是否可用、这项判断是否来自当前证据、最高风险对象是谁、下一步检查什么。它是手机巡检工具，不是缩窄的桌面控制台。

## 390×844 首屏预算

- 顶部设备与证据鲜度：不超过 64px；只承担身份、鲜度与刷新。
- 当前判断与最高风险对象：112–156px；这是唯一视觉中心，正常和每种事故必须重组而非换色。
- 即时证据：96–140px；最多一个主速率或主资源趋势，加两个紧凑辅助信号，不重复主判断。
- 下一步对象 / 动作：88–132px；最高风险对象必须一跳可达。
- 浮动导航：视觉高度 54–60px，触控高度至少 64px；内容必须能从下方经过，且始终可滚动到末尾。

## Visual language

- 背景：冷白或中性雾面，不以大面积蓝灰染色制造品牌。
- 光：当前对象才拥有边缘光、弥散光或环境光；事故色保持低饱和，但状态必须依靠结构、字重和图形共同成立。
- 材质：内容层使用清晰标准材料；透明和渐进模糊只服务于浮动控制、瞬时展开和前后景关系。
- 曲率：连续 G2 / concentric curvature；小对象 10–14px，组合面 18–24px，浮动导航与瞬时面板 24–30px。禁止所有东西同一大圆角。
- 字体：设备身份 13–15px，导航标签 10–11px，正文 13–15px，主判断 22–28px，唯一主读数 30–38px。禁止 7–9px，也禁止把每行做成老年机大字。
- 图标：统一线性/层次化符号，接口、路由、采集、资源、终端必须有可辨对象身份；不可使用无意义圆圈或通用 AI 图标。

## Interaction language

- 四个稳定根：巡检 / 网络 / 终端 / 事件；低频工具进入紧凑更多菜单。
- 最高风险对象始终一跳可达；详情增加来源、时间、阈值、依赖或原始证据，不复读首页。
- 按压反馈 100–160ms，visible scale 0.97–0.98；高频切换不做入场表演。
- 页面推进保持 Back / Forward、焦点与滚动位置；对象展开的动效解释来源关系并可中途反向。
- 支持 reduced-motion、reduced-transparency、forced-colors、200% 文本与 320px 短屏。

## State skeletons

- 正常：当前出口 → 当前上下行 → 路由/WAN/采集三个原子状态 → 查看网络。
- 接口事故：受影响接口组 → 默认路由依赖 → 首个对象动作 → 其余对象紧凑堆叠；不显示正常态流量主角。
- 资源满载：最高资源读数 → 阈值/持续样本 → 关联资源 → 查看证据；不复读 CPU 三次。
- 全离线：当前无法建立业务判断 → 管理面/采集面/接口面边界 → 可检查对象；隐藏不可信速率。
- 采集失败：判断边界 → REST/SSH 独立状态 → 最近成功与失败来源 → 重试/查看采集。
- 无快照：首先解释“没有哪些证据”，然后提供连接/采集入口；不得把历史值伪装成当前。
- Fleet：当前事故优先于规模；无事故时才展示设备规模与比较入口。

## Direction gate

三个方向必须先形成可比较的 390×844 可运行原型；胜出方向随后必须提供 normal / interfaces-down / resource-full 三态原图。只有同时满足以下条件的方向可以进入生产：

1. 3 秒内读出状态、鲜度、最高风险和动作；
2. 不出现桌面表格、报告标题、工作台分栏或同构卡片堆；
3. 三种场景的首屏结构明显不同；
4. 内容层与浮动功能层清楚分离；
5. 原子对象在正常和事故中可以重组；
6. 视觉尺寸紧凑而命中区合格；
7. 390×844 原图由产品所有者与独立视觉评审共同通过。

方向门禁必须同时覆盖 Overview、对象列表、对象详情、More 与 Connection；只通过首页三态不再允许进入生产。统计三列、字段表、后台模块宫格和桌面表单均视为桌面语法回流并直接否决。

## Step 1022 adjudication

- Direction A — `Signal Orbit`: rejected as the production base because its single orbit surface became a 438px decorative hero and recreated the oversized mobile problem.
- Direction B — `Atomic Signal Workspace`: selected after a second compact pass. It uses an asymmetric OriginOS-style atomic grid, one primary object, two non-duplicating side facts, one evidence instrument and a compact object/event ledger. It separates visual size from 44px hit targets.
- Direction C — `Focus Deck`: rejected because the large dark block recreated the previously vetoed verdict slab and reduced first-screen information efficiency.
- Selected originals: `_design/mobile-reset-1022/winner-originals/{normal,interfaces,resource}-390x844.png`.
- The selected prototype is still synthetic and not release evidence. Production must preserve evidence truth and re-prove all required states, routes, connection, history and accessibility.

## Step 1023 owner veto and renewed direction gate

Atomic Signal Workspace is now rejected history. Its production originals proved that an asymmetric card grid can still become desktop monitoring grammar compressed into a phone: repeated white metric surfaces, table-like evidence rows, sparse incident tails, a generic step form and a clipped pseudo-tablet layout. No production component, CSS token, spacing rule, navigation geometry or card composition from that tree may seed the next presentation.

Fresh direction review now scores the following before any production mount:

1. **Phone-native task rhythm:** the first scan follows thumb reach and vertical attention, not a desktop information hierarchy made narrower.
2. **OriginOS spatial identity:** light, color, blur and object re-composition establish depth and continuity; they cannot be substituted by pale blue cards.
3. **iOS-level functional craft:** translucent material belongs to real controls and navigation, with legibility and reduced-transparency fallback; it is not content decoration.
4. **Compact visible scale:** 13–16px operational text and one bounded primary readout are acceptable; oversized headings, 56px visual rows and giant verdicts are direct failures even when touch geometry is 44px.
5. **No card-dashboard fallback:** edge-to-edge grouping, spatial layers, object rails or timelines must own the content. A stack/grid of rounded white modules fails regardless of polish.
6. **Scene transformation:** normal, interface failure and resource pressure must have different composition and action rhythm, not just different colors or labels.
7. **Real mobile depth:** list, detail, more and connection surfaces must use push, overlay or progressive disclosure suited to a phone; desktop field tables and admin wizards fail.
8. **Tablet task architecture:** 768px must become a stable object index plus useful workspace with no clipping or empty stretched-phone region.

The three new prototypes live under `_design/mobile-reset-1023/direction-{a,b,c}`. Their screenshots are design evidence only. The selected direction still requires a new isolated production tree, physical deletion of the rejected owner, complete runtime matrices and independent signoff.

## Step 1024 selected direction

`Origin Network Space` (direction E) is selected as the prototype mother direction after five-way adjudication. It uses a Huarong/atomic mobile composition over a task-specific optical bitmap, with content materials separated from the floating functional dock. The exact selected originals are `_design/mobile-reset-1023/originals/e2-{normal,interfaces-down,resource-full}-390x844.png`.

The selection retains P1 work for production: stronger text contrast, harder highest-risk anchoring, explicit trend time/scale, unified threshold/continuity wording and real navigation/depth behavior. Selection is not production, accessibility, matrix or release signoff.

## Sources

- vivo OriginOS 6 官方简介：<https://www.vivo.com.cn/service/questions/all?categoryId=170&questionId=2027>
- vivo 原子动效 6.0：<https://www.vivo.com.cn/service/questions/all?categoryId=170&questionId=2102>
- Apple HIG Materials：<https://developer.apple.com/design/human-interface-guidelines/materials>
- Apple Adopting Liquid Glass：<https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass>
# Step 1019 — Origin Workspace visual reset

The passing card-ledger fixtures are not the target design. The mobile content layer now follows these non-negotiable rules:

- **OriginOS 6 spatial system:** translucent color, progressive blur, dynamic edge light, G2 concentric radii and card stacking are used to create depth and efficiency, not to wrap every row in a large pastel card.
- **Apple functional glass:** Liquid Glass belongs only to top-level navigation, floating controls and transient action layers. Content groups use clear standard materials and rely on layout/grouping for hierarchy.
- **iKuai operational density:** default route, WAN state, freshness, current trusted rate and highest-risk object are visible as compact, comparable facts. A 44px hit target must not become a 58–68px visual row.
- **Independent mobile IA:** phone layouts are not compressed desktop consoles; tablet layouts are object-list + task-workspace compositions, not enlarged phones.
- **Scene-owned hierarchy:** steady, interface, resource, outage, collection and unavailable scenes change the order and visual weight of evidence, not just their heading and tint.
- **Motion with purpose:** immediate press feedback, short spatial continuity and interruptible transitions only; no decorative delay on high-frequency navigation; reduced-motion removes positional movement.
