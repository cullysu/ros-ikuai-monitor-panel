---
target: src/panel-framework/panel-framework-app.tsx
total_score: 52.5
p0_count: 0
p1_count: 8
timestamp: 2026-07-18T00-28-30Z
slug: src-panel-framework-panel-framework-app-tsx
---
Method: dual-agent (A: 019f7296-db61-7801-92d2-c6214f4b40dc · B: 019f7296-ef90-7882-99ea-8ea5289386ae)

# 当前面板独立产品 / 设计 / 证据综合评审

## 发布结论

**FAIL。P0 0 项，P1 8 项；Product 与 Design 不通过。**

工程门禁已经明显变硬：runtime 75/75、响应式路由 76/76、状态路由 266/266，且 266 报告递归扫描没有隐藏的 `pass:false`。这些结果证明运行、状态与验收链进步，不证明产品审美、三秒巡检和视觉效率已经成立。

## Design Health

| # | Nielsen 启发式 | 分数 | 关键问题 |
|---:|---|---:|---|
| 1 | 系统状态可见性 | 3 | 状态与证据边界清楚，但时间和证据重复。 |
| 2 | 与真实世界匹配 | 2 | 路由语言准确；“业务成功”与当前业务边界仍可能混淆。 |
| 3 | 用户控制与自由 | 2 | Back/Forward 真实；事故聚合与连接入口可供性偏弱。 |
| 4 | 一致性与标准 | 2 | 手机内部稳定；1199/1200 改变整套工作法。 |
| 5 | 错误预防 | 2 | 不伪造缺失数字；collection-down 首屏仍未拆清四平面。 |
| 6 | 识别优于回忆 | 3 | 对象证据就地可见；多层证据让用户记忆“哪层算数”。 |
| 7 | 灵活性与效率 | 2 | 桌面工具完整；1199 平板缺紧凑搜索/筛选/排序。 |
| 8 | 美观与极简 | 2 | 冷静克制；首屏仍是证据堆，不是最短判断链。 |
| 9 | 错误诊断与恢复 | 2 | unknown/stale 诚实；下一步调查仍不够场景化。 |
| 10 | 帮助与文档 | 1 | 关键边界解释散落，图标入口对触摸用户不自明。 |
| **总计** |  | **21/40** | **52.5/100，Product/Design FAIL** |

## Anti-pattern verdict

这版已经摆脱大圆角健康 App、假 sheet、装饰拓扑和通用 AI 卡片墙。确定性 detector 只报告 2 条 `side-tab` warning，均是 `.mdi-section.is-warn/is-danger` 的语义状态边界误报，真实 detector finding 为 0。

新的主要问题不是“AI 花活”，而是**工程证据结构过度外显**：相同时间、可信度和边界在 chrome、verdict、facts、事故中心和 ledger 复述；异常态有时只是同一账本换词；宽屏空白没有转化为对象关系与比较能力。

## 确认的优点

1. unknown / stale / unavailable 的证据语义可靠，缺失业务数字不会被改写成 0 或缓存实时值。
2. resource-full 与 interfaces-down 已有状态专属的首要对象和仪器，不再只是换标题颜色。
3. 冷蓝灰、细结构线、有限圆角和等宽数字形成可信工具感；200% 文字真实重排，Back/Forward 与对象身份连续。

## P1 阻断项

1. **正常态 verdict 顺序错误**：最大标题“出口路径已核实”会先制造服务正常暗示；应先说“业务尚未判定”，再给路径可核验证据。
2. **no-snapshot / collection-down / all-offline 没有稳定换工作流**：需要分别使用业务覆盖撤回、四平面矩阵、离线影响/恢复链，而不是同一账本换文案。
3. **1199/1200 一像素切换两套能力**：1199 缺搜索/筛选/排序；1200 不应才突然成为完整工作台。
4. **平板/桌面空间利用率不足**：对象少时下半屏空白，未转化为依赖、路由关联、最近变化和样本可信度。
5. **证据与时间复读**：同一事实多处出现；200% 虽不裁切，但第二层关键事实被重复块推到首屏之外。
6. **runtime 工件未绑定工作树指纹**：报告只写 HEAD，不足以证明未跟踪/已修改源码与运行 bundle 的对应关系。
7. **绝对证据时间的时区展示不一致**：有的 inspector 显示 `+08:00`，overview 与趋势轴丢失 offset。
8. **桌面资源 SVG 非等比拉伸**：`DesktopResourceEvidence.tsx` 使用 `preserveAspectRatio="none"`，窗口变化会改变趋势斜率视觉。

## Persona red flags

- **Casey（单手移动巡检）**：只读最大标题会把“路径核实”记成“服务正常”；200% 时要滚过重复事实才看到 WAN。
- **Alex（熟练运维）**：1199 有 master/detail 却缺对象定位工具；collection-down 仍要自己拼管理、采集、转发、业务边界。
- **Sam（放大/辅助技术）**：重排通过，但重复证据增加线性阅读；风险数量与严重度的视觉角色仍混在一起。

## 修复顺序

1. Specify：先修正常 verdict 的结论边界和单一事实位置。
2. Design：为 no-snapshot、collection-down、all-offline 制定互不复用的首模块与信息预算。
3. Design / Architecture：补齐 768–1199 对象定位能力，让 1200 只增密度、不换任务模型。
4. Engineering：统一带 offset 的证据时间、修资源 SVG、给 runtime 报告绑定 worktree / bundle 指纹。
5. 再做独立 Product / Design / Visual QA；矩阵不能自签这三关。
