---
target: MobileDomainWorkspace mobile and tablet product surface
total_score: 17
p0_count: 2
p1_count: 3
timestamp: 2026-07-17T08-32-36Z
slug: c-panel-framework-mobile-mobiledomainworkspace-tsx
---
# RouterOS / iKuai 面板新版严格评审

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | 系统状态可见性 | 3 | 刷新、采集和证据状态较完整，但局部采集失败可被移动证据层漏掉 |
| 2 | 系统与真实世界匹配 | 2 | 使用了网络运维术语，却把不同领域对象统一降格为字段表 |
| 3 | 用户控制与自由 | 2 | 有 Back/Forward 和清除搜索，但筛选后仍可显示列表外对象，URL 与视图会分裂 |
| 4 | 一致性与平台标准 | 2 | 组件一致，但只是 Web 管理台单列化；1180/1181 的形态切换突兀 |
| 5 | 错误预防 | 1 | 缺失、未知和局部证据可能被显示成在线、可用或完整，公众监控不可接受 |
| 6 | 识别优于记忆 | 2 | 底部主任务可识别，但领域详情缺少关系、上下文和跨链路入口 |
| 7 | 灵活性与效率 | 1 | 少量对象也常驻搜索、筛选、排序；状态不进 URL，专家工作流低效 |
| 8 | 审美与极简设计 | 1 | 单一蓝灰、细线和通用字段转储制造大量无效空白，没有 iOS 或 iKuai 的产品辨识度 |
| 9 | 错误识别与恢复 | 2 | 连接页有较好的风险确认，但对象失效、筛选冲突和证据缺口缺少明确恢复路径 |
| 10 | 帮助与文档 | 1 | 没有面向当前判断的上下文帮助、字段来源解释和任务级说明 |
| **Total** | | **17/40** | **Poor，重大 UX 重构后方可发布** |

## Anti-Patterns Verdict

**LLM assessment**：仍然很容易被识别为“AI 生成的管理台”。典型特征是统一蓝灰皮肤、重复的图标方块、同构分隔线、每个领域共用一种列表和字段详情、用留白假装克制。它比旧版更规整，但规整不等于成熟，也不等于 iOS 原生或 iKuai。

**Deterministic scan**：对 `MobileDomainWorkspace.tsx`、`MobilePatrolScreen.tsx`、`RouterConnectionScreen.tsx` 扫描结果为 0 项。该扫描只能发现已编码的反模式，不能判断信息架构、数据语义、视觉气质和领域任务设计，因此“0 项”不是审美通过。

**Visual evidence**：当前提交的 Playwright 工件显示，手机对象详情在少量字段后留下接近半屏空白；手机列表在首条对象前堆叠标题、页签、三项指标、搜索、筛选和排序；768 平板主从视图只使用上部空间；1181px 立即切换为桌面表格。原生浏览器叠加工具未暴露，使用项目 Playwright 截图和当前矩阵作为回退证据。

## Overall Impression

最大的进步是路由、焦点、触控尺寸和连接安全边界更可测；最大的失败是团队把“结构可测”误当成“产品完成”。移动端现在是有底栏的响应式后台，不是为手机重新设计的运维工具。总体公众发布评分：**36/100，拒绝发布**。

## What's Working

- 底部四个主任务和二级路由归属比之前清楚，Back/Forward、焦点恢复和 44px 触控尺寸是实质进步。
- 连接页将 HTTPS、SSH、主机密钥确认和保存凭据风险分开，安全心理模型明显强于其他页面。
- localhost-only、Host/CSRF、请求体限制、安全响应头、SSH pin 和不持久化密码构成了不错的本地运行安全基线。

## Priority Issues

### [P0] 监控事实会产生“假正常”
`wanState` 和 `interfaceState` 只看整体快照是否存在；数组缺失或状态为 unknown 时仍可显示“WAN 可用”“接口在线”。资源聚合要求 CPU/内存/磁盘全部存在，任一缺失会掩盖另一个已观测到的危险值。移动证据模式也没有完整吸收 `channelDegraded` 和失败端点。

**Why it matters**：这会让公众用户在设备或采集异常时得到错误安全感，属于监控产品最严重的信任破坏。

**Fix**：建立每领域 `observed/online/offline/unknown` 四态证据；每项资源独立评估并以最高已观测风险聚合；移动和桌面消费同一份 canonical evidence graph。

**Suggested command**：`$impeccable harden`

### [P0] 当前 HEAD 没有可用的最终发布证据
`check-public-release-readiness.js` 在 `19497d0` 上失败：缺少当前 SHA 的 7x4 总览、19x4 路由响应和 19x7x2 路由状态矩阵。旧工作树或旧 SHA 的绿色结果不能继承。

**Why it matters**：没有精确提交证据却宣称可发布，会让审计日志失真。

**Fix**：先修产品问题，再在最终不可变 SHA 上完整重跑矩阵、readiness、桌面、安全、采集器和构建一致性。

**Suggested command**：`$impeccable audit`

### [P1] 通用详情渲染器从架构上锁死了低信息效率
`DetailPane` 对接口、路由、日志、安全、DNS 一律遍历 `row.columns` 输出 `<dl>`，最后再放同一条“只读快照”。这解释了为什么详情页只有五六行字段后便是一大片空白。

**Why it matters**：字段转储没有回答运维任务中的“为什么、影响谁、下一步看哪里”，手机空间因此既空又低效。

**Fix**：保留共享壳和列表原语，新增领域 presenter。接口显示父子关系、WAN/bridge/route 关联、当前流量与趋势；路由显示 active 原因、表、距离和关联接口；终端显示 IP/MAC/DHCP/ARP/连接；日志显示时间线、级别、来源和关联事件；安全显示匹配条件、计数器和风险。

**Suggested command**：`$impeccable shape`

### [P1] 手机首屏命令栈过厚，信息直到约 40% 屏幕后才出现
标题、状态、横向页签、三指标、常驻搜索、三个筛选按钮、排序和列表标题连续堆叠。只有两个对象时仍展示整套控制台。

**Why it matters**：一手操作时用户先滑动、再找对象；低对象量页面的控制成本高于内容价值。

**Fix**：按对象量和任务自适应。少量对象直接展示；搜索在超过阈值后出现；筛选和排序合并为底部 sheet；指标只保留能改变当前决策的一项；异常优先由列表本身表达。

**Suggested command**：`$impeccable distill`

### [P1] 选择、筛选、URL 和对象身份并不真正一致
选中对象从 `allRows` 查找，因此对象被筛选掉后详情仍显示；无效 object ID 被静默忽略；平板隐式选中第一条却没有显式 URL 语义；每次检查对象都 push 历史。路由和日志复合键仍可冲突，`duplicate-N` 又依赖遇到顺序。

**Why it matters**：用户会看到“异常筛选”旁边的正常对象，返回键会穿过每次检查记录，刷新/重排可能把深链指向另一个重复对象。

**Fix**：使用后端 immutable `.id`；复合键只是回退。选中对象必须来自过滤后的结果或显示“位于筛选外”；失效 ID 有明确状态；平板被动检查使用 replaceState，显式进入详情才 pushState；筛选/排序需要 URL 契约。

**Suggested command**：`$impeccable harden`

## Persona Red Flags

**Alex（专家用户）**：两条数据也要穿过整套搜索/筛选/排序；没有键盘加速或批量检查；筛选不进 URL，无法共享和恢复工作现场。

**Casey（分心的手机用户）**：第一条对象离首屏过远；详情没有相关对象和下一跳入口；658KB 静态资源每次都 `no-store`，慢网下反复下载。

**Sam（无障碍用户）**：44px、200% 和基础对比度有进步，但平板的隐式 `aria-current` 不等于真实 URL 选择；12px 密集文字和按字符串推导状态会让视觉/语义状态不一致。

**Riley（压力测试者）**：局部端点失败、unknown 状态、ECMP 重复路由、重复日志和筛选后选中对象均能击穿当前“稳定、完整、可用”的结论。

## Minor Observations

- `mobileDomainDefinitions.ts` 从展示字符串用正则推导异常、运行、速率、时间和 IP；文案、翻译或日志正文包含 `error` 都可能改变业务行为。应从原始模型提供 typed sort/filter metadata。
- 路由元数据散落在 `panelRoutes.ts`、`WORKSPACE_DEFINITIONS`、`MORE_ROUTE_CATALOG` 和领域定义中，新增路由仍可能漂移。应由一个类型化 registry 派生。
- `1180px` 在多个 TSX、hook 和 CSS 中重复；此前 1023/1180 门禁错位已经证明这会漂移。
- `mobile-domain.css` 的 0.035em 字距制造模板化小标题；蓝灰表面和青蓝图标几乎覆盖整个产品，视觉层级主要靠边线而不是内容关系。
- 当前 568602B JS + 89643B CSS 均被静态服务设置为 `Cache-Control: no-store`，缺少内容哈希缓存和压缩策略。
- `app.py` 将约 2400 行 Collector、HTTP 路由、静态服务、安全、配置和领域转换放在同一文件。最小重构应抽出 dispatcher、collector service 和纯领域 snapshot builder，不必引入新框架。
- Cookie 有 `SameSite=Strict` 和 `HttpOnly`，但没有 `Secure`。localhost HTTP 可接受；若未来支持 HTTPS 反代，必须条件化启用 Secure 和 `__Host-` 名称。
- 46 项浏览器门禁只确认排序下拉值改变，没有确认行顺序；领域循环只检查归属、标题、placeholder 和 overflow；对比度只测四组 token 组合。绿色结果覆盖面明显小于日志措辞。
- SVG 建议应限定于真正的图标、拓扑、状态示意和可缩放图形。不要把所有图都“代码画成 SVG”；真实设备、场景和需要检视的对象应使用真实或高质量位图，复杂数据图应由图表组件从真实数据生成。

## Questions to Consider

- 这个手机端的第一任务到底是“30 秒判断是否需要处理”，还是“缩小版桌面对象浏览器”？现在两者混在一起。
- 如果删掉三指标、常驻搜索和通用字段表，剩下哪些信息真的会改变值班人员的下一步？
- 为什么接口、路由、安全和日志值得拥有不同 URL，却不值得拥有不同详情结构？
- 团队是否愿意把“未知绝不等于正常”写成比布局和截图门禁更高优先级的产品宪法？
