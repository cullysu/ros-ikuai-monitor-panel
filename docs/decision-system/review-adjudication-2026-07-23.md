# 2026-07-23 综合评审裁决台账

- status: `current-review-ledger`
- validForCommit: `a414f7aef2a4545c78a9a42e34e9cb6d6cf3aca3` plus local unpublished remediation
- supersededBy: `null`
- authority: `docs/decision-system/current-state.md`
- sourceReview: `用户本轮提供的 23 项综合评审意见`
- reviewMethod: `current-source/current-artifact adjudication`
- productGate: `failed`
- designGate: `failed`
- visualGate: `failed`
- releaseBoundary: `closed`

## Step714 current-review P0 adjudication

- New review claims about conflicting truth, report false-green, self-signed Product/Design/Visual, and non-atomic traffic were checked against current source and selected reports.
- Current contracts confirm these P0 boundaries are fixed or quarantined: Product/Design/Visual remain failed, false-green history is quarantined, current report truth and atomic traffic pass, and stale visual claims are not reopened without current artifacts.
- R07/R09/R10/R14 and independent acceptance remain open; this ledger does not turn engineering checks into product sign-off.
## Step337 补充：最新评审尚未完成裁决，先记录报告真值 P0

- 这份 23 条台账仍是上一轮已裁决的当前审查，不应被误读为已经覆盖用户刚提交的后续综合评审。
- 当前补充只记录流程与 P0 触发，不提前把新评审的每条意见标成 fixed/stale/open：最新评审要求重新核验报告合并、Product/Design/Visual 独立门、响应式断点、桌面/手机视觉和 RouterOS soak。
- 已确认的入口问题：决策源文件和 `D:\想法\面板` 镜像存在，但最新评审没有及时推进共同当前指针；现已登记为 Step337，并要求同步源、机器状态、current handoff 和镜像。
- 首个技术红契约：任何 required matrix 未完成的报告，顶层 `pass` 不得为 `true`；bounded engineering 结果必须与 release truth 分层。当前产品 release 仍 `closed`，Product/Design/Visual 仍 `failed`。
- nextAction: 先运行报告顶层真值红契约，再按当前源码与运行工件逐项裁决新评审；不得用本台账替代独立产品/视觉验收。

## 这份台账记录什么

用户指出我没有把最新评审先写进决策仓库，这个指正成立。仓库并没有消失：当前真相仍在 `current-state.md`，历史判断在 `panel-redesign-decision-log.md`，D 盘是镜像；但本轮遗漏了新的 Step323 记录。现在用这份台账补齐遗漏。

这里不记录不可审计的模型内部逐字思维链，也不把“我觉得好看”写成事实。每条 finding 只记录四件可复核的事：当前源码/报告/截图是否还能复现、状态如何裁决、为什么选择该状态、下一步需要什么证据。原评审中把同一条 P2 合并描述的“文档拆分”和“旧迁移文档仍活跃”拆成两个唯一 finding，因此总数固定为 23，而不是凭空增加问题。

## 状态定义

- `fixed`: 当前工作树已有实现或治理门禁，并有当前证据绑定；不等于产品发布通过。
- `stale`: 当前源码/截图无法复现原 finding；保留历史意见，不为旧状态恢复代码。
- `open`: 当前问题仍可观察，或当前独立 Product/Design/Visual 验收仍未通过。
- `unproven`: 没有足够的当前证据证明已解决；不能用工程绿灯推断解决。

## 裁决摘要

| 状态 | 数量 | 解释 |
|---|---:|---|
| fixed | 15 | P0 真值、矩阵、流量、身份、路由成熟度、响应式文档、安全边界、评分治理和旧文档 authority inventory 等已有当前合同或门禁。 |
| stale | 3 | 1365/1366 断层、日志详情复读、WAN 轴裁切在当前工件中不可复现。 |
| open | 5 | 手机/平板/桌面产品效率、发布检查点和日志治理仍需真实证据或实现。 |
| unproven | 0 | 台账不允许用“未检查”冒充完成；后续新发现必须落入此状态。 |

## Step378 follow-up：平板领域空间效率工程切片关闭，独立签收不变

- R09 仍为 `open`。Step378 只为资源领域 `ResourceInspector` 增加真实 `loadAudit` next-evidence owner，并以 focused runtime 证明 768/771/772/844 双栏、无溢出、44px 入口和 object/from/evidenceAt 导航上下文；这不替代 Product/Design/Visual 对空间效率、视觉重量和任务完成路径的独立签收。
- R08 继续为 `stale`，不是本轮待修复项。当前 `LogInspector` 没有“事件记录” section，fresh runtime 的 390/375/320 和 large-text 结果均证明 heading message 只出现一次、body message 为 0、事件证据与相邻事件存在；若新评审仍声称复读，必须绑定当前截图与 DOM 文本。
- 本轮不修改 finding 数量和发布结论：`fixed=14`、`stale=3`、`open=6`、`unproven=0`；overall FAIL，GitHub 保持关闭。

## Step379 follow-up：最新综合评审先按当前证据裁决，手机视觉 P1 保持开放

- 最新综合评审不能整体覆盖当前状态：当前源码与合同已经证明的报告真值、唯一当前指针、Product/Design/Visual fail-closed、原子流量、响应式 authority、canonical route、locale identity、sidecar containment 和 final checkpoint 不重新打开；历史 `release-routes-state-*` false-green 报告继续作为 quarantine 反例。
- 当前证据：`npm run check:decision-system`、`check-report-truth.js`、`check-report-top-level-truth.js`、`check-acceptance-report-quarantine.js` 通过；quarantine 隔离 5 份历史 false-green；决策同步 13/13 byte-identical、0 mismatch；fresh 390/375/768/844/1366/1440 原图已检查。
- 手机视觉层级与任务优先级仍是 `open`，不能用 surface contract、自动化截图数量或实现者自评改成 pass；R09/R10/R14/R20/R23 以及独立 Accessibility、State Matrix、route maturity、RouterOS soak 和当前候选发布链继续关闭。
- 本补充只记录当前态裁决与下一条 red contract，不改变 `fixed=14 / stale=3 / open=6 / unproven=0` 的既有台账计数；下一步建立手机视觉层级/任务优先级 red contract，再做最小成组实现和 fresh 原图复核。

## Step371 follow-up：手机视觉表面工程收口，但 R07 仍开放

- Step370 的 red contract 已在 Step371 关闭：mobile patrol 现在有 `base / raised / quiet / accent-wash` surface tokens，正常判断行使用中性 surface，active navigation 使用真实选中表面，forced-colors 保留可见边界。
- 当前 fresh `390×844` 与 `375×667` 原图已重跑，runtime 212 checks / 94 screenshots / 117 snapshotApiCalls 通过；这些证据只证明工程表面约束与回归，不证明手机 Product/Design/Visual 签收。
- R07 继续 `open`，下一步应由独立评审判断三秒扫描、冷蓝克制、对象/判断/趋势层级和实际任务效率；不能把 surface contract 5/5 改写成视觉通过。

## Step372 follow-up：安全结论收窄，R19 先红

- 最新综合评审要求把安全结论限制为“公开分发、默认仅本机访问、只读边界已验证”，并逐条覆盖 host/URL 分隔符、HTTP 明文风险、SSH trust 生命周期和 corrupt-store 行为。
- R19 继续 `open`。当前实现线索不能替代独立的静态/单元边界检查；本地 live security 命令曾出现连接重置，因此不能把环境失败吞成产品通过，也不能把它单独写成代码阻断。
- write-ahead decision: 先建立并运行 focused contract，覆盖 scheme、空白、`/`、`\\`、`@`、`?`、`#`、合法 hostname/IP/IPv6、损坏配置显式错误以及 host/port/fingerprint/scheme/expiry trust 绑定；契约 green 仍不等于公共部署安全签收。
- nextAction: 运行预期 red contract，补最小静态/单元检查与窄文案，再更新 R19 证据；Product/Design/Visual 与 GitHub 继续关闭。

## Step373 follow-up：安全边界 focused green，R19 不再开放

- `check-security-boundary-contract.js` 5/5；backend security full contract PASS；静态/unit boundary 10/10；Python 编译与 `npm run check:decision-system` 通过。
- 证据现在明确覆盖 host path/backslash/credentials/query/fragment、IPv6 embedded port、malformed JSON/invalid profile roots，以及 SSH trust challenge v2 的 session/host/sshPort/restScheme/fingerprint/iat/exp 绑定。
- R19 状态改为 `fixed`，但固定的是“当前安全措辞与已验证边界”：仍只允许宣称公开分发、默认仅本机访问、只读边界已验证，不允许宣称任意公网部署安全。
- Product/Design/Visual、完整矩阵、真实 Accessibility、RouterOS soak、clean candidate、current-SHA CL 和 GitHub 仍未签收。

## 23 条 finding

### R01 — 决策仓库存在多个冲突真相

- severity: `P0`
- status: `fixed`
- evidence: `docs/decision-system/current-state.md`（唯一当前真相）；`tools/check-current-state-authority.js`；`tools/check-decision-ledger-sync.py` 输出 `latestStep=323`、语义一致、D 盘镜像逐字一致。
- decision: `current-state.md` 负责当前结论，历史日志和机器状态只能提供证据；Step323 已写入并同步，不能再用 D 盘镜像反向覆盖当前状态。
- rejected: 把所有 Markdown 都当同等级真相；只更新 D 盘不更新仓库源；把历史 release journal 当当前产品签收。
- nextAction: 每个新评审先写 Step write-ahead，再运行决策同步门禁。

### R02 — `release-routes-state` 子报告能让顶层假绿

- severity: `P0`
- status: `fixed`
- evidence: `tools/check-report-truth.js`；`tools/check-acceptance-report-quarantine.js` 输出 `falseGreenCount=5`、`forbiddenReferences=0`；`tools/merge_matrix_reports.py` 的 root/child fail-closed 合同。
- decision: 历史 5 份 root-pass/child-fail 报告保留为反例并隔离，不重写历史；当前报告必须由失败子项压低顶层 pass。
- rejected: 删除历史反例；把 root `pass=true` 当唯一信号；用新截图掩盖错误报告。
- nextAction: 完整矩阵重新生成时继续要求 quarantine、report-truth 和 merge regression 同时通过。

### R03 — 实现者自行给 Product/Design/Visual 签通过

- severity: `P0`
- status: `fixed`
- evidence: `.product-loop/state.json` 当前 `product=failed`、`design=failed`、`visual-qa=failed`；`docs/product-loop-current.md` Gate table；`docs/decision-system/current-state.md` 顶层 FAIL。
- decision: 工程 focused green 只关闭对应工程合同，不能写 Product/Design/Visual signoff；当前仍明确失败。
- rejected: 用本地截图、自动化浏览器或实现者自评替代独立评审；把历史“focused pass”提升为公众体验通过。
- nextAction: 新鲜截图完成后仍需独立 Product、Design、Visual QA 评审，且不允许由实现者单方改 gate。

### R04 — 流量历史使用并行数组配对

- severity: `P0`
- status: `fixed`
- evidence: `tools/check-atomic-traffic-history.js`；`src/panel-framework/mobile/MobilePatrolTraffic.tsx`；当前模型只消费原子 `{timestamp,uplink,downlink,source,evidenceMode}` 样本。
- decision: 缺失值保持 unavailable，显式零保持 numeric zero；趋势只能从同一证据窗口的完整样本产生。
- rejected: 用数组索引拼接 timestamp/uplink/downlink；把缺失值改成 0；把历史缓存当当前实时值。
- nextAction: 后续任何速率/趋势变更先更新原子样本合同和回归测试。

### R05 — 1365/1366 宽度存在断层

- severity: `P1`
- status: `stale`
- evidence: `_acceptance/panel-runtime-browser/desktop-continuity-1365.png` 与 `desktop-continuity-1366.png`；`check:runtime-browser` 的 1365/1366 边界检查；当前 CSS 只有 1200px desktop 起点，没有旧的 1365/1366 特供分支。
- decision: 当前工件无法复现原断层，不恢复旧媒体查询；但候选矩阵仍必须保留边界截图。
- rejected: 为旧截图重新加 1365/1366 像素补丁；只测 1366 而跳过 1365。
- nextAction: 在 clean candidate 上重跑边界对照，若再次出现差异返回 Design/Responsive，而不是先加 CSS。

### R06 — 响应式规则由多份文档同时定义

- severity: `P1`
- status: `fixed`
- evidence: `docs/decision-system/responsive-capabilities.md`；`tools/check-responsive-doc-authority.js` PASS；旧文档已标记 superseded 并指向 active table。
- decision: active capability table 是唯一响应式契约，旧方向文档只能作为历史背景。
- rejected: 并行维护多个“当前断点表”；让截图尺寸反向定义产品能力。
- nextAction: 新断点变更只更新 active table，并让 authority checker 先于实现通过。

### R07 — 手机视觉成熟度仍不足

- severity: `P1`
- status: `open`
- evidence: `_acceptance/panel-runtime-browser/mobile-runtime-current.png`、`mobile-interface-route-evidence-390.png`；当前手机已具备接口—默认路由关系、运行/父接口/吞吐、对象详情与证据时间；Step357 又证明 direct 对象不再在路径清单复读。但独立 Product/Design/Visual 仍未签收手机的整体视觉、层级与任务效率；桌面已有同类检查器。
- decision: R07 继续保持 `open`；Step371 只关闭表面层级的工程契约，不关闭独立视觉评审。手机 current-evidence 接口工作区的 direct/multiple/unknown 关系证据仍须按 fresh 场景比较，不能由自动门禁代替。
- rejected: 恢复旧拓扑/sheet；再叠加圆角、阴影或蓝色；用自动化 DOM 数量代替视觉评审。
- nextAction: 绑定 fresh 390/375/768/844 原图做独立 Product/Design/Visual 评审，比较三秒扫描、状态层级、对象上下文和任务完成路径；若仍有具体复现，再写下一条 red contract。

### R08 — 移动日志详情重复事件正文

- severity: `P1`
- status: `stale`
- evidence: `src/panel-framework/mobile/mobile-inspector/TerminalLogInspectors.tsx` 当前 `LogInspector` 只展示事件证据、绝对时间、topics/source、相邻事件和 identity；`_acceptance/panel-runtime-browser/mobile-log-explicit-detail-390.png`。
- decision: 当前实现没有复现旧版“详情页重放正文”问题，不新增重复卡；证据边界保持可见。
- rejected: 为满足旧报告强行再加事件正文；把“详情存在”误写成“详情信息丰富”。
- nextAction: 新评审如仍指出重复，必须提供当前截图和 DOM 文本绑定后再改。

### R09 — 平板列表/检查器仍存在稀疏与空间效率问题

- severity: `P1`
- status: `open`
- evidence: `_acceptance/panel-runtime-browser/tablet-network-768.png`、`tablet-network-844.png`；当前原图 `_acceptance/panel-runtime-browser/tablet-overview-normal-768.png`、`tablet-overview-master-detail-844.png`、`tablet-interface-review-844.png`；`check-tablet-layout-capability.js` 与 `check-tablet-information-efficiency.js` 只证明高度所有权、关系证据和 inspector 工程合同，不能替代独立 Product/Design/Visual 复核。
- decision: Step322 与 Step344 只关闭自然高度/滚动能力及一个真实短列表关系证据缺口；Step345 的原图复核确认正常态和事故态在证据/操作边界后仍提前结束，因此不把 focused engineering green 升级成平板产品通过；短列表后的空间任务、对象比较和场景节奏仍开放。
- rejected: 用重复指标填空；缩小字号或触控目标；恢复旧 `short-stack`；把空白宽容地称为“诚实留白”。
- nextAction: 回到 Design/Specification，为 768/844 正常态与事故态定义垂直空间任务合同，先写 red contract 再决定是否补对象比较或关系证据；禁止装饰填充。

### R10 — 桌面信息密度与空白仍需独立验收

- severity: `P1`
- status: `open`
- evidence: `_acceptance/panel-runtime-browser/overview-normal-task-1366.png`、`overview-normal-task-1440.png`；`docs/product-loop-current.md` Design/Visual QA failed。
- decision: 当前桌面工程与图表轴已改善，但桌面正常态的工作区利用、层级和任务效率仍不能由本地截图自签。
- rejected: 继续堆 DOM；缩到 7–9px；用 1366 一张截图宣布桌面成熟。
- nextAction: 独立桌面 Product/Design/Visual 评审需绑定 1366、1440 和事故态的实际任务完成路径。

### R11 — WAN 图表轴被裁切

- severity: `P1`
- status: `stale`
- evidence: `_acceptance/panel-runtime-browser/desktop-resource-timeseries-1366.png`；`src/panel-framework/sections/SectionTimeSeriesChart.tsx`；当前图表显示完整 `31.25 Mbps` 轴/单位/当前/峰值。
- decision: 当前截图无法复现“轴裁切”，不修改图表比例尺；仍保留图表单位、时间窗和来源审计。
- rejected: 为旧截图加负 margin；隐藏轴文本；将资源审计圆点冒充时间序列。
- nextAction: clean candidate 仍需保留横向边界与手机图表检查。

### R12 — 行动入口缺少对象/证据上下文

- severity: `P1`
- status: `fixed`
- evidence: `tools/check-mobile-action-context.js` PASS `9/9`；`src/panel-framework/mobile/MobilePatrolActions.tsx` 的 `scope/objectId/evidenceAt/from` 属性与导航上下文。
- decision: 行动可以是 collection 级或 object 级，但上下文必须明确，不能让“查看详情”丢失风险对象。
- rejected: 只检查按钮文字；把焦点 ID 当对象 ID；通过隐藏 DOM 补上下文。
- nextAction: 继续在 route state 与 Back/Forward 回归中校验行动上下文。

### R13 — 19 个 URL 被说成 19 个真实成熟模块

- severity: `P1`
- status: `fixed`
- evidence: 当前源码真实计数为 `0 complete / 17 bounded-readonly / 1 fallback / 1 unavailable`；旧的 `tools/check-route-maturity-report.js` 计数契约先按 Step434 expected-red 暴露漂移，修正后才可重新称 PASS；`acceptanceComplete=false`、`releasePass=false` 仍必须保留。
- decision: 报告只称 URL/展示壳和 maturity 标签，不称 19 个完整运维模块；发布严格要求 complete 与独立验收。
- rejected: 把共享渲染器和 URL 数量包装成完整模块；批量提升 bounded-readonly 为 complete。
- nextAction: 逐路由补真实数据、错误态、筛选/对象详情和独立验收，不降低 release gate。

### R14 — 手机与桌面已经漂移成两种产品

- severity: `P1`
- status: `open`
- evidence: `src/panel-framework/mobile/MobilePatrolScreen.tsx`、`src/panel-framework/overview/desktop-overview/DesktopOverviewScreen.tsx`；共享 typed evidence/task grammar 的架构门禁；当前 Design/Visual gate 仍 failed。
- decision: 独立渲染树是交互差异的有意选择，但共享信息优先级、证据语义和任务节奏尚未获得产品/视觉签收。
- rejected: 强行共享一棵响应式 DOM；或任意复制桌面卡片到手机；以“数据相同”证明体验一致。
- nextAction: 独立评审按同一场景比较两端首要判断、风险顺序和动作上下文。

### R15 — query/hash 双状态导致深链不一致

- severity: `P1`
- status: `fixed`
- evidence: `tools/check-canonical-route.js` PASS `4/4`；`src/panel-framework/routes/usePanelRoute.ts`；当前只保留一个 history writer，legacy hash 只做迁移。
- decision: canonical route 是唯一状态源，hash 不能与 query 并行写入；focus 参数不能绕过证据校验。
- rejected: 在每个组件里直接读写 location；同时维护 query 和 hash；用加载后重定向掩盖历史栈问题。
- nextAction: 新模块接入前先通过 canonical route contract。

### R16 — sidecar 路径/符号链接可能越界

- severity: `P2`
- status: `fixed`
- evidence: `tools/check-directory-sidecar-containment.js` PASS `3/3`；运行时 public root/framework chain 的 realpath 与 symlink containment 检查。
- decision: sidecar 只能落在允许的运行时根内，真实路径必须可验证；D 盘镜像不是产品运行时输入。
- rejected: 只检查字符串前缀；允许任意 symlink；把本地镜像目录当构建来源。
- nextAction: 资产变更继续运行 containment 与 asset identity。

### R17 — 对象身份对 locale 不稳定

- severity: `P2`
- status: `fixed`
- evidence: `src/panel-framework/sections/panelObjectIdentity.ts` 的 locale-stable `toLowerCase()`；`tools/check-section-models.js` 对 deep-link identity 的回归。
- decision: 深链 identity 不依赖 viewer locale；显示文案和机器 identity 分离。
- rejected: 使用 `toLocaleLowerCase()`；把显示标签直接作为唯一键；让 Turkish locale 改变 URL。
- nextAction: 新对象类型复用同一 normalize/identity contract。

### R18 — final checkpoint 没有验证当前 HEAD/worktree

- severity: `P2`
- status: `fixed`
- evidence: `.agents/skills/router-panel-product-loop/scripts/release_checkpoint.py` 的 `verify_state(..., final=True)` 现在直接比较 live `git rev-parse HEAD` 与 candidate commit，并拒绝 `git status --porcelain=v1 --untracked-files=all` 非空；`tools/check-release-checkpoint-final-contract.js` PASS；隔离临时 Git 仓库回归 8/8 PASS，包含 HEAD mismatch 与 dirty worktree 拒绝。
- decision: final checkpoint 已闭合当前 candidate 身份；progress 仍允许脏工作树恢复。历史 a414 三端 CL 仍不能代入当前 dirty worktree。
- rejected: 只验证 candidate SHA；把 release-readiness 的旁路检查当 checkpoint 完成；先上传再补身份。
- nextAction: 保持此门禁进入后续候选发布流程，并继续保持 GitHub 关闭直到完整产品/发布条件满足。

### R19 — 安全结论中的 HTTP/SSH/配置措辞仍需收窄

- severity: `P2`
- status: `fixed`
- evidence: `tools/check-security-boundary-contract.js` 5/5；`tools/check-backend-security.py` full contract PASS 与静态/unit boundary 10/10；`panel_backend/router_transport.py` 的 host parser；`panel_backend/config_store.py` 的 `RouterProfileStoreCorruptError`；`panel_backend/trust_binding.py` v2 scheme/endpoint/fingerprint/time binding；窄安全文案已写入 mobile/full contracts。
- decision: 当前只宣称公开分发、默认仅本机访问、只读边界已验证，以及代码实际覆盖的 HTTPS 风险、SSH trust、会话、密码不持久化和损坏配置错误；不宣称任意公网部署安全。
- rejected: 用安全口号替代 parser/transport 测试；扩大“安全通过”到公共部署；吞掉损坏配置错误。
- nextAction: 新安全或传输变更继续复用该 contract；公共部署安全仍需独立环境、配置和运维验收。

### R20 — 决策日志体积过大，当前指针难以扫描

- severity: `P2`
- status: `fixed`
- evidence: `decision-repository-compaction-v1` PASS；`current-index.md` `24` 行、decision-system `README.md` `35` 行、`release-journal.md` `26` 行，均低于 `80/120/140` 预算且无历史步骤章节；`check-decision-ledger-sync.py --sync` 为 `5/5` semantic、`14/14` byte-identical。
- decision: 保留完整历史；当前审阅台账、当前状态、历史索引和发布边界已分开，当前指针可以单次定位，不再让每轮 chronology 追加污染当前入口。
- rejected: 重写/删除历史；复制更多摘要文件；用长度/字符数作为产品验收。
- nextAction: 新增或修改决策文档前先登记 authority/role，并继续用 compaction 与同步合同回归；R07/R09/R10/R14 产品/设计问题仍需独立红合同。

### R21 — 决策文档拆分后仍可能被误认为多套真相

- severity: `P2`
- status: `fixed`
- evidence: `docs/decision-system/README.md` 的 authority pointer；`docs/product-loop-current.md` 的 handoff boundary；`tools/check-decision-ledger-sync.py` 与 `tools/check-current-state-authority.js`。
- decision: 文档可以按职责拆分，但必须只有一个 current-state authority，其他文件声明用途和 superseded 关系；D 盘只做镜像。
- rejected: 把 handoff、journal、PDR、mirror 当平级当前状态；让摘要覆盖 authority。
- nextAction: 新文档必须先登记用途和 authority 关系，再加入同步白名单。

### R22 — 旧迁移/方向文档仍可能被当作当前要求

- severity: `P2`
- status: `fixed`
- evidence: `docs/decision-system/document-authority.md` 登记 23 个受治理文档；`tools/check-document-authority.js` PASS；`npm run check:decision-system` PASS；`check-decision-ledger-sync.py --sync` PASS，D 盘 13/13 byte-identical。
- decision: current/current-contract/superseded/reference 的实现权已经登记，旧迁移/方向/评分文档必须显式指向 successor；current-state 继续是唯一当前产品结论。
- rejected: 删除历史方向文档；靠人工记忆判断哪份有效；让旧截图触发新 CSS 补丁；把治理门禁通过解释成产品通过。
- nextAction: 新文档先登记到 inventory 再进入实现；继续处理下一条 Product/Design P1。

### R23 — 主观数字设计评分被当作验收证据

- severity: `P2`
- status: `fixed`
- evidence: `tools/check-score-governance.js` PASS，`npm run check:decision-system` PASS；历史评分仍保留在 `docs/panel-redesign-decision-log.md` 与 `.impeccable/critique/`，当前 release surfaces 不读取分数，Product/Design/Visual gates 仍 failed。
- decision: 数字评分只能作为评审意见摘要；独立 numeric-score governance contract 现在强制当前 FAIL、Product/Design/Visual 未签收，并禁止 readiness 源使用 `total_score`、百分制或评分文案作为通过依据。
- rejected: 平均多个评分生成“产品分”；用分数掩盖 P0/P1；把工程检查数量换算审美分。
- nextAction: 新增评分材料时继续附方法、样本和证据；不得将 opinion-only 分数写入 release readiness。

## 本轮结论

这 23 条 finding 已完成“写入决策仓库”的第一步；Step355 又关闭了旧文档 authority 治理，但没有因此让产品通过。当前真正开放的最高杠杆问题是手机视觉成熟度、平板/桌面信息效率、发布检查点完整性、安全措辞边界、日志治理与评分治理。下一步从最早仍可复现的 Product/Design P1 开始；GitHub 继续关闭。

## Step383 follow-up：R09 平板空间效率 focused engineering slice

- R09 仍为 `open`；本步不把独立 Product/Design/Visual 签收改成通过。
- 当前可复现缺陷已按 red→green 处理：`trafficLoad` 在 768/771/772px 采用列表/摘要后接全宽检查器，844px 保留双栏；没有复制证据或 filler。
- 证据：资源 runtime v2 6/6；完整 panel runtime 212/94/117；fresh 768/772 原图；types、Overview、build 1884、asset identity/sidecar containment 通过。
- 解释边界：这证明布局工程切片的几何/上下文契约，不证明平板视觉重量、任务效率和公众产品审美已经通过；R09 继续等待独立签收。

## Step386 follow-up：R07 手机视觉节奏 focused engineering slice

- R07 仍为 `open`；本步不把 Product/Design/Visual 独立签收改成通过。
- 当前可复现的视觉噪声先按 red→green 处理：移动普通分割线 `0.14 → 0.10`，强分割线 `0.22 → 0.17`；证据顺序、状态语义、触控尺寸、文字字号和桌面树不变。
- 证据：visual-rhythm red 先在两项阈值失败，修复后 6/6；types、Overview、build 1884、runtime 212/94/116；fresh 390/375/844 原图已检查。
- 解释边界：这只证明低对比视觉节奏工程约束成立，不证明手机三秒扫描、产品审美、跨端一致性或公众产品签收已经通过；R07 继续等待独立复核。

## Step388 follow-up：R20 current discovery index focused governance slice

- R20 仍为 `open`；本步只关闭 current discovery/index 工程切片，不宣称完整 archival compaction 或产品签收完成。
- 新增 reference-only `docs/decision-system/current-index.md`，由 `tools/check-decision-current-index.js` 绑定 `.product-loop/state.json`，并接入 decision-system；历史主日志保持完整。
- 证据：实现前 index 缺失等 7 项 red；实现后 current-index 11/11、document authority 24 entries、D 盘 14/14 byte-identical、current-pointer 与 decision-system 通过。
- 解释边界：短索引改善可发现性，但不删除历史、不创建第二 authority；R20 完整 compaction 仍需后续治理，Product/Design/Visual 和发布继续关闭。

## Step392 follow-up：R23 评分治理 focused green，独立产品签收不变

- R23 从 `open` 调整为 `fixed`，只代表评分治理契约已经存在并通过；不代表 Product/Design/Visual、手机审美、平板效率或公众发布通过。
- `tools/check-score-governance.js` 现在验证：历史/评审评分可保留但只能作为 `opinion only`，当前状态与 Product/Design/Visual gates 保持 FAIL，release readiness 源不读取百分制/`total_score` 作为通过依据。
- 证据：score-governance 12/12、`npm run check:decision-system` 通过；当前汇总为 `fixed=15 / stale=3 / open=5 / unproven=0`。
- 解释边界：后续新评分仍需方法、样本和证据；工程治理 green 不能替代独立 Product/Design/Visual 评审，GitHub 与公众发布继续关闭。

## Step397 follow-up：R07 手机冷蓝账本视觉语法先红

- R07 继续为 `open`；本步把 fresh `390×844` 原图中的重复表面重量绑定到当前源码与视觉契约，不把现有 hierarchy/surface/rhythm 工程门禁写成独立签收。
- red contract：手机应使用连续账本平面；proof strip 才能拥有浅色证据表面；真实风险才拥有状态背景；普通对象/判断行使用字重、间距与细分隔；桌面树不得被移动视觉修复牵连。
- expected red：`check-mobile-ledger-visual-grammar.js` 缺失，执行 `npm run check:mobile-ledger-visual-grammar` 必须失败后才能实现。
- boundary：只处理手机视觉语法 focused slice；Product/Design/Visual、R07 独立签收、R09/R10/R14/R20/R23、Accessibility、State Matrix、route maturity、RouterOS soak、clean candidate、当前 SHA CL 与 GitHub 继续关闭。

## Step398 follow-up：R07 手机冷蓝账本视觉语法 focused engineering green

- R07 仍为 `open`；本步只关闭写前契约对应的实现与回归，不改变独立 Product/Design/Visual 签收状态。
- evidence：`check-mobile-ledger-visual-grammar=7/7`；types/Overview/build `1884 modules`；fresh runtime `212/94/117`；390/375 正常、390 事故和 844 平板原图已检查。事故态路由标题默认焦点框已消失，正常态普通图标和判断行不再形成重复卡片重量。
- boundary：focused engineering green only；R07 独立签收、R09/R10/R14/R20/R23、Accessibility、State Matrix、route maturity、RouterOS soak、clean candidate、当前 SHA CL、GitHub 和公众发布继续关闭。
- nextAction：独立 Product/Design/Visual 复核 fresh 原图；若复现新的具体 P1，先写新的 red contract。
