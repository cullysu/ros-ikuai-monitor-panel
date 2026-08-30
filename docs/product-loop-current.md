- validForCommit: false; current worktree is uncommitted and is not a release candidate; Step1188 is documented and the clean candidate has not yet been formed
- status: `current-handoff`
- currentHandoffForStep: `1188`
- supersededBy: `docs/decision-system/current-state.md`
- fullHistory: `docs/panel-redesign-decision-log.md`
- updated: 2026-08-30
- latestRecordedStep: `1188`
- latestStepOutcome: `1188:remote-old-run-separated-and-protected-branch-publish-next`
- releaseCandidate: none; GitHub publication is closed
- currentConclusion: **FAIL overall / the accepted four-screen phone reference remains unchanged / old pushed SHA 7231e00 is Windows-red at Edge toolbar 200 percent / local repair HEAD dbd4a90 is not yet published / clean exact-SHA and Linux/Windows/CL/GHCR evidence remain open.**

## Current handoff: Step 1188

- Step1187 的决策镜像语义修复已进入本地提交 dbd4a90；本步确认同名 GitHub 分支仍为 7231e00，PR #1 的旧 Run 不能代表新 SHA。
- 机器 ci-windows 状态已纠正为 pending；旧 Run 的 failure 仅保留为历史证据。
- 未跟踪 .impeccable/ 评审文件和 work/ 目录明确排除；手机四屏基线与 192.168.3.5 / iPad 桌面基线不变。
- 当前发布仍 FAIL/CLOSED；必须先同步并验证 Step1188 镜像和源契约，再用 lease-protected 方式更新分支，随后读取新 SHA 的 Linux、Windows、CL/GHCR 真实结果。
- outcome: 1188:remote-old-run-separated-and-protected-branch-publish-next
- next action: 复核当前候选 HEAD 与远端分支 lease，更新 GitHub 分支并读取新 SHA 的真实 Linux、Windows、CL/GHCR 结果。

## Gate boundary

| Gate | Status | Meaning |
|---|---|---|
| Current product release | `fail` | Current worktree is not a release candidate. |
| Mobile baseline ownership | `pass` | One reference image and one isolated mobile presentation owner remain. |
| Mobile implementation | `pass` | Current owner implements the accepted four-screen grammar and truthful evidence semantics. |
| Product/Design/Visual | `pass` | Current-identity isolated-role records pass with no P0/P1. |
| Accessibility / Engineering review | `pass` | Current runtime and structured role receipts bind the same artifact. |
| Edge toolbar 200% | `pass` | Current identity passes all 22 required real Edge cells. |
| Release hygiene | `pending` | Worktree is dirty; no clean exact-SHA candidate exists. |
| Release / GitHub | `closed` | No upload and no Linux/Windows/GHCR exact-SHA CL evidence exist. |

## One next action

Synchronize and verify the decision repository, then prepare the exact scoped clean commit and replay clean-SHA release evidence. Do not change phone art, use `rg.exe`, start subagents, include the unrelated skill file, or publish before all gates close.

## Previous handoff: Step 1163

- The only accepted mobile visual baseline is `docs/mobile-reference-baseline.md` and `_design/accepted-mobile-reference/accepted-four-screen.png`.
- The only active phone presentation owner is `src/panel-framework/mobile-reference-ui/`; wide landscape tablets use the separate desktop/browser render/style tree and are not a phone baseline.
- Deleted mobile presentation trees, contracts, screenshots and naming are not candidates and must not be restored.
- The accepted composition is a compact mobile header, shallow status banner, primary WAN object, dual traffic chart, grouped route/collection facts, distinct resource/interface incident lists, object detail evidence and four stable roots.
- Evidence semantics remain strict: no arbitrary default-route fallback; missing rates remain unavailable; explicit offline zero is labelled as a last observation rather than current traffic.
- Four 390×844 object-detail captures cover interface, route, resource and terminal evidence from real rows.
- Historical engineering reports exist for mobile 56/56, accessibility 11/11, overview 28/28, route-responsive 76/76 and route-state 266/266. After later Step1135 changes they are not current-identity release evidence. A single bounded Edge toolbar 200% smoke cell passed on an earlier worktree, but the full current Edge replay is unproven. None of these reports is independent Product/Visual/Accessibility/Engineering signoff.
- Step1118 added typed interface detail evidence, a real resource trend chart and explainable workspace search/filter/sort/pagination while leaving the accepted composition unchanged. Step1121 then verified one bounded Edge smoke cell after the UIA timeout-budget fix; it did not promote the full historical 22/22 report.
- Step1129 reduced only the normal WAN chart's vertical footprint (132px to 124px, with proportional compact-phone and landscape overrides) so the existing current-state evidence can enter the 390×844 viewport; the accepted mobile visual grammar and detail/resource chart sizes remain unchanged. Build, model, architecture and bounded 8-cell mobile smoke are green; the smoke is not a full matrix.
- Step1130 changed only the 600–899px portrait tablet composition: full-width status, primary WAN object on the left, and route/link, collection and current-status evidence on the right. Build and bounded 8-cell mobile smoke are green; the 768×1024 and 390×844 captures remain clear. No `rg.exe` scan or full browser matrix was run.
- Step1131 changed only the ≤360px evidence grouping: route/link and collection remain a two-column pair with a 6px gap, while large-text mode retains one-column stacking. Build and bounded 8-cell mobile smoke are green; the 320×568 capture now exposes both evidence categories before the fixed navigation.
- Step1132 removes only the repeated route/terminal detail summary card; object-evidence and source ledgers remain, while resource detail keeps its diagnostic summary and trend chart. Build and fresh route/terminal/resource captures are green; no full browser matrix was run.
- Step1133 changes only the lower exception source row from repeated `采集通道` to typed `证据模式`; normal overview collection facts remain unchanged. Build and bounded 8-cell mobile smoke are green; the collection-down capture now exposes historical evidence explicitly.
- Step1134 reran current release readiness. Structural mobile/security/route contracts pass, but the full current-identity overview/route/route-state matrices and Edge toolbar report are stale or incomplete; no historical evidence is reused and no full browser matrix is run under the CPU-safety boundary.
- Step1135 preserves the locked art direction and fixes WAN detail back navigation so Overview and Network each regain their own entry context. Model/architecture/security/type checks pass; no browser matrix was run.
- Step1136 removes the last current-table false-green: complete matrices and Edge 200% are pending until exact current-identity replay.
- Step1137 renders today/yesterday/full-date mobile evidence labels from strict RFC 3339 input; no visual grammar changed.
- Step1138 adds identity-bound single-cell matrix batching; filtered runs remain top-level fail until all 56 cells and 14 workflows exist.
- Step1139 added bounded whole-system CPU admission before browser launch, every cell and interactions.
- Step1140 tightens admission to 55%, requires the one-core below-normal Windows wrapper, and records `single × phone320` as current-identity cell 1/56. The report remains top-level fail until all 56 cells and 14 workflows exist.
- Step1141 appends `single × phone360` with whole-system samples of 42.3% and 43.6%; the current matrix is 2/56, top-level fail, with 54 cells and all workflows remaining.
- Step1142 appends `single × phone375` with whole-system samples of 39.4% and 43.8%; the current matrix is 3/56, top-level fail, with 53 cells and all workflows remaining.
- Step1143 stops replay after visually detecting the still-empty tablet lower half, adds a tablet-only four-destination object patrol workspace, and leaves phone composition/art unchanged. Architecture red-to-green, types/build and fresh tablet/phone captures pass. Product changes reset current evidence to 2/56 with 54 cells and all workflows remaining.
- Step1144 completes all eight `single` viewports for the corrected current identity. The 55% gate rejected high samples before capture; phone320 inspection confirms phone art remains isolated. Matrix truth is 8/56, top-level fail, with 48 cells and all workflows remaining.
- Step1145 catches and fixes the Fleet false label: twelve mixed comparison rows are “接口状态”, while the alert alone states three affected interfaces. Model/runtime red-to-green, types/build and fresh Fleet/tablet cells pass. Identity reset leaves 2/56; focused scenario review now precedes full replay.
- Step1146 catches and fixes the all-offline scope contradiction: eight offline WAN lines are no longer paired with an ambiguous `未运行接口 0 项`; the row now says `其他接口未运行`. Model/runtime red-to-green, types/build and fresh 390px visual pass. Identity reset leaves 1/56.
- Step1147 rejects unused no-snapshot whitespace because real recovery tasks existed, then adds connection, service-log and read-only-diagnostic destinations without restoring any untrusted number. Model/runtime red-to-green, types/build and fresh 390px visual pass. Identity reset remains 1/56.
- Step1148 adds the missing collection-plane boundary: REST/SSH failed, forwarding is `未测量`, and current business data is unverifiable. Model/runtime red-to-green, types/build and fresh 390px visual pass. Identity reset remains 1/56.
- Step1149 appends and visually adjudicates resource-full phone390. CPU/memory/disk proof order, thresholds, sample/trend semantics, non-duplicated impact boundaries and deeper resource detail all pass without an art change. Current identity is 2/56.
- Step1150 appends and visually adjudicates interfaces-down phone390. Three failed objects precede two healthy comparisons, mixed rows are truthfully labelled, risk/default detail aligns, and focused seven-scenario adjudication closes. Current identity is 3/56; full responsive replay is next.
- Step1151 uses a one-core scenario wrapper to reach 56/56 and 14/14, but visual inspection vetoes the artifact because non-normal tablet pages still end in a mechanical two-column empty shell.
- Step1152 makes the real four-destination tablet patrol workspace available to every scene and bounds historical/unavailable task states without zeros. Phone art remains isolated. Current identity is 1/56; full replay is next.
- Step1153 rejects the remaining opposite-column whitespace: interface/Fleet use a left object list with right evidence/task rail, while outage uses left impact/task context with right affected-WAN/source evidence. Phone art remains unchanged. Current identity is 3/56.
- Step1154 completes current mobile evidence: 56/56 responsive cells, all 14 real workflows and all 11 accessibility stages including actual 200% text scaling pass. Cross-surface/public and route evidence plus independent signoff remain pending.
- Step1155–1159 add a hard 55% admission / 70% termination envelope, fix synchronous route-click CDP blocking, and close current overview 28/28, route-responsive 76/76 and route-state 266/266.
- Step1160–1161 make actual Windows Edge toolbar 200% evidence resumable and complete all 22/22 cells after the hard CPU stop correctly interrupted an unsafe system-wide spike.
- Step1162 changes the safety contract: external CPU load no longer pauses the goal. Step1163 moves wide landscape tablets to the browser owner; focused runtime is green, while the owner-split Edge 200% matrix and fixed-name 28/76/266 replay follow under dynamic `1.00% / 0.25% / 0.05%` quotas.
- Never use normal `git push`. No publication before a clean exact SHA and Linux, Windows and GHCR CL all pass for that exact uploaded SHA.

## References

- Sole current authority: `docs/decision-system/current-state.md`
- Complete historical process: `docs/panel-redesign-decision-log.md`
- Mobile visual baseline: `docs/mobile-reference-baseline.md`
- Mobile owner: `src/panel-framework/mobile-reference-ui/`

---


## Step 1189：新 SHA 首轮远端 CL 失败，保留 Linux 运行并锁定 Windows 首个根因（2026-08-30）

### 已核实现场

- 当前候选 SHA：`b18ada8ee828c621538a686b45beecfce930e693`，分支：`codex/ci-fix-20260830`。
- GitHub Actions Run `33313772840` 已确认 Windows packaging 失败；首个失败步骤是 `Real Edge toolbar 200 percent matrix`。
- Windows 在该步骤之前的 Edge toolbar source contract、Python/Node 环境和依赖安装均通过；其后的 package manifest/upload 失败是上游失败的级联结果，不能单独修复或解读为新根因。
- Linux validation 仍停留在 `Release blocking contract gates` 运行中，尚未取得终态；当前不能声称 Linux、Windows、CL/GHCR 全部通过。
- 失败日志在 Run 仍进行时不可下载；没有用旧 SHA 的历史报告冒充当前证据，也没有重复启动新的 CI。

### 本步决策

1. 只修复 Windows 的首个真实失败；不先处理由它级联的 manifest/artifact 缺失。
2. 继续保持手机/桌面美术基线不变，本步属于发布验收基础设施，不借机改 UI。
3. 等当前 Run `33313772840` 自然结束后读取精确 job 日志；若根因与现有 UIA 所有权实现不一致，再做最小修复并生成新 SHA。
4. 所有后续修改、提交、推送和 CL 读取都必须同步本日志、D 盘镜像及状态文档；任一远端 CL 失败都继续纠正，直到同一精确 SHA 的 Linux、Windows、CL/GHCR 全绿。

### 资源与安全记录

- 本轮未使用 `rg.exe`，未启动新的本地浏览器矩阵，未终止用户进程。
- 上下文脚本曾因执行层 ACL 初始化失败而未运行；没有把该失败伪装成 checkpoint 或验收结果。
- 之后只进行了有界的 Git/CI 查询、源码读取和文档同步；未修改手机或桌面美术。

### 心得

CI 的“上传后失败”必须按首个失败步骤追根，而不是看到后续产物缺失就批量补文件。当前证据只说明候选已上传且 Windows 首个门禁失败、Linux 未结束；因此发布状态继续为 FAIL/CLOSED。

### outcome

- outcome: `1189:current-sha-windows-edge-toolbar-failed-linux-running-root-log-pending`

---


## Step 1190：读取首个远端失败日志并修复 Edge popup 搜索边界（2026-08-30）

### 已核实现场

- Run `33313772840` 的 Windows 日志已公开完整首因：第 1 格 `phone-320::normal` 在 `find-zoom-in` 阶段经过 12 次有界 UIA 搜索仍找到 0 个 Zoom in 控件，退出码为 1。
- Windows 的 package manifest、bundle 和 SHA256 manifest 失败均发生在该步骤之后，是上游失败的级联结果。
- Linux 在 `Release blocking contract gates` 运行约 36 分钟仍无步骤推进；为避免继续占用远端资源已提交取消，取消不被解读为 Linux 产品失败或通过。
- 当前仍没有同一新 SHA 的 Linux、Windows、CL/GHCR 全绿证据。

### 实施的最小修复

- 修改 `tools/acceptance/accessibility-v2/windows_browser_zoom.py`：UIA popup 根枚举仍只从已绑定的 Edge 进程枚举可见顶层窗口；当 Edge 瞬态菜单缺失可用 Win32 owner 链时，以同一 `msedge.exe` 进程和 Chromium 顶层窗口类作为受限 fallback。
- UIA 激活继续复核控件进程、顶层窗口可见性和前台归属；只有选中的同进程 popup 可以作为前台例外，不恢复全局 UIA、全局键盘、物理鼠标或 `click_input()`。
- 修改 `tools/test-browser-toolbar-zoom200-readiness.js`，把选中的同进程 popup 前台边界固定为源码契约。
- 未修改手机/桌面产品美术、布局、数据语义或用户确认的视觉基线。

### 本地验证

- `node --max-old-space-size=2048 tools/test-browser-toolbar-zoom200-readiness.js`：PASS。
- `py -3 -m py_compile tools/acceptance/accessibility-v2/windows_browser_zoom.py`：PASS。
- `git diff --check`：无错误；仅报告既有文档 CRLF 将在 Git 下次处理时转为 LF 的提示。
- 没有在本机启动真实 Edge 200% 矩阵；上述结果不能替代 GitHub Windows runner 的新鲜真实证据。

### 下一步

把本步修复与验证继续同步到 D 盘镜像，清理只属于本任务的临时工件，形成新的 clean exact-SHA；然后用 lease 保护更新 GitHub 分支，并只读取该新 SHA 的 Linux、Windows、CL/GHCR 终态。任何一端失败继续按首个根因纠正。

### outcome

- outcome: `1190:windows-edge-popup-fallback-static-green-clean-candidate-next`

---


## Step 1191：保留历史工件并以本地排除收口 clean candidate（2026-08-30）

### 已核实现场

- `git clean -nd -- .impeccable work` 显示这些目录含有既有评审记录和本任务临时脚本；无法证明每个文件都可安全删除，因此没有执行不可逆清理。
- 已在当前仓库本地 `.git/info/exclude` 增加 `.impeccable/` 与 `work/`；文件本体保留，不进入提交、GitHub tree 或发布证据。
- 重新读取 `git status --short --branch` 后，仅剩本轮 UIA 修复和决策文档的六组已跟踪修改；未把任何产品文件隐藏或删除。

### 决策

采用“保留文件、只在本地排除”的可逆方案，而不是为了制造 clean 状态删除可能有历史价值的评审/工作工件。候选提交只包含已审查的 UIA 修复与同步后的决策文档；推送前还要用 Git 的实际暂存内容和 exact-SHA 身份检查确认。

### 下一步

先运行低负载静态/类型/构建相关门禁，随后检查暂存清单与 exact-SHA 身份；若全部通过，再提交并用 lease protection 更新 GitHub 分支，等待该新 SHA 的 Linux、Windows、CL/GHCR 结果。

### outcome

- outcome: `1191:task-artifacts-preserved-local-exclude-clean-candidate-gates-next`
