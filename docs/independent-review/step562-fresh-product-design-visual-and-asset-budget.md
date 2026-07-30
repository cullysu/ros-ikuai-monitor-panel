# Step562 fresh Product / Design / Visual review and asset-budget adjudication

- review date: `2026-07-27`
- review scope: fresh production runtime originals after Step561 desktop shell fix
- runtime evidence: `_acceptance/panel-runtime-browser/report.json`
- runtime generatedAt: `2026-07-27T12:34:30.065Z`
- release status: **FAIL / closed**

## Method boundary

本轮按 Product、Design、Visual 三个独立判断面复核 fresh 原图和运行时几何。当前会话没有暴露可用的双 Agent/Task 编排工具，因此不能把这次单上下文复核伪称为 dual-agent 独立签字；结论是 review intake，不是产品签收。

## Fresh evidence reviewed

- 手机正常态：`overview-normal-task-375.png`、`overview-normal-task-390.png`
- 手机事故态：`mobile-composite-risk-390.png`
- 手机资源态：`mobile-resource-history-expanded-390.png`
- 平板正常态：`tablet-overview-normal-768.png`
- 桌面正常态：`overview-normal-task-1366.png`
- 桌面事故态：`desktop-composite-risk-1366.png`
- fresh runtime：`236 checks / 98 screenshots / 122 snapshotApiCalls`，overflow `0`

## Observations

### Product lens

- 正常手机首屏已经把“业务可用性尚未判定”、活动默认路由、当前下载/上传、接口/资源/连接三项判断放在同一巡检流内；375px 下图表下折，但核心判断和当前速率仍可见。
- 事故手机先给出最高优先级对象，再给并发风险和对象调查入口；资源态把 CPU、磁盘、内存的阈值、连续样本和趋势窗口放在同一证据链内。
- 仍不能签 Product：本轮只验证了 fresh 原图与既有运行合同，没有完成独立任务观察、完整状态矩阵和所有路由的产品成熟度签收。

### Design lens

- 390px 使用 edge-to-edge 纵向任务流；375px 没有被桌面表格压缩，768px 使用对象关系/右侧证据工作区，1366px 使用左侧焦点、右侧 WAN/判断与首屏动作。
- 视觉层级已能区分 verdict、proof、focus、signal、decision 和 evidence boundary；事故态的主风险、并发风险、后续调查不再同构成三张卡。
- 仍不能签 Design：平板宽高组合、200% 文本重排、导航/对象关系的长时使用节奏尚未由独立设计评审闭环；本轮没有把“看起来合理”升级为签收。

### Visual lens

- fresh 原图未发现新的遮挡、横向溢出、伪实时数字或明显的旧手机壳/大弹窗残留；手机颜色、规则线、状态标记和操作行保持冷蓝工业控制台语法。
- 桌面顶部空带已消失：runtime toolbar 为 `67px`，状态条 top 为 `79/83px`（1366/1440），与 Step561 合同一致。
- 仍不能签 Visual：本轮是单上下文原图复核，Impeccable detector 对 `MobilePatrolScreen.tsx` 返回 `[]` 只能说明没有命中其静态规则，不等于独立审美签收；Accessibility、forced-colors、200% 和跨场景视觉矩阵仍须独立闭环。

## Release blocker found and fixed in this step

- 触发：`node tools/check-public-release-readiness.js` 在 fresh build 后先因最终 `style.css=121929` 超过 `120000` 字节而失败。
- 决策：新增构建期确定性 custom-property 压缩，只在生成的生产 CSS 中把内部 `--mp-*`、非诊断 `--mdw-*`、`--do-*` 等内部变量映射为短别名；保留 `--mdw-muted`、`--mdw-faint`、`--mdw-surface`、`--mdw-surface-tonal`，因为浏览器合同读取它们。预算不抬高，不删除内容，不改数据/证据/路由/只读边界。
- 结果：最终 public style asset `118689` bytes / gzip `19468` / Brotli `16532`，framework asset budget、asset identity、types、Overview、fresh runtime 均通过。
- 后续边界：构建后公开矩阵必须重新绑定新资产和新 worktree fingerprint；旧 runtime/matrix 报告不能继续冒充当前 release evidence。

## Decision

Step562 只关闭 `framework-asset-custom-property-minification-v1` 的 focused engineering/runtime slice。Product、Design、Visual 仍为未签收，release readiness 继续 FAIL/closed，GitHub 不上传。

## Refused shortcuts

- 不提高 120000 字节预算；
- 不删除图表、对象证据、状态说明或移动端功能来“减肥”；
- 不用 detector `[]` 或 `236/98/122` 代替独立视觉签收；
- 不把 fresh runtime green 写成公众发布通过；
- 不用普通 `git push`，不上传 GitHub。

## Next action

重新生成当前资产身份绑定的 28 格 Overview、76 格 route-responsive、266 格 route/state 矩阵；随后再次做独立 Product/Design/Visual 评审，并在所有 required evidence 与 exact-SHA CL 完成前保持发布关闭。
