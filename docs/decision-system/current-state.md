- validForCommit: false; current worktree is uncommitted and is not a clean candidate; Step1188 decision record is documented and untracked review/work artifacts remain excluded
- status: `current`
- supersededBy: `null`
- currentBoundaryForStep: `1188`
- currentConclusionForStep: `1188`
- latestRecordedStep: `1188`
- latestStepOutcome: `1188:remote-old-run-separated-and-protected-branch-publish-next`
- authority: This is the only human-readable current-state source.

# Current product and release state

## Current conclusion

**FAIL overall for release / the user-supplied four-screen mobile reference remains the sole phone baseline / accepted phone art is unchanged / local repair commit exists but has no fresh remote CI / clean exact-SHA, GitHub upload and exact-SHA Linux/Windows/GHCR CL remain open / release CLOSED.**

## Current decision record: Step 1188

- 本地 codex/ci-fix-20260830 的 HEAD 为 dbd4a90799defdaf2a3883d3160384808b89c730，父提交为远端同名分支旧 HEAD 7231e00a2e6822632d847f43d54239d7f7a4194f；远端 main 为 69174b38d3e5bc8eac4272eac3082acb2db37bd9。
- PR #1 仍开放。旧 Run 33309694877 的 Linux 仍运行、Windows 已失败；它不是新本地修复的证据，Windows 后续失败也不能被拆成独立新根因。
- 当前工作区仅有未跟踪的历史 .impeccable/ 评审文件与 work/；它们不进入候选提交。手机四屏基线、桌面 192.168.3.5 / iPad 基线和产品代码本轮均不变。
- 当前已确认的新修复是 Edge popup UIA 所有者查找、toolbar 离线契约与决策镜像语义修复；新的 GitHub CI 仍未开始。
- 机器 ci-windows gate 已纠正为 pending；旧 Run 33309694877 的 Windows failure 只作为历史证据保留，不代表新 SHA。
- 本轮没有使用 rg.exe、没有启动浏览器矩阵、没有终止用户进程；外部更新将采用 lease-protected 分支路径，并在更新后只认新 SHA 的真实 Linux、Windows、CL/GHCR 结果。
- outcome: 1188:remote-old-run-separated-and-protected-branch-publish-next
- next action: 复核当前候选 HEAD 与远端分支 lease，更新同名 GitHub 分支并读取新 SHA 的真实 Linux、Windows、CL/GHCR 结果。

## Previous decision record: Step 1186

- 远端 Run 33309694877 绑定提交 7231e00a2e6822632d847f43d54239d7f7a4194f；Windows packaging 在 Real Edge toolbar 200 percent matrix 失败，后续 Windows manifest/upload 失败均为前置失败级联，不能当作独立根因。
- 根因判断：现有 Windows UIA 菜单查找只依赖 Desktop.windows(process=...)，无法稳定取得 Edge 瞬时 Settings popup 的顶层 HWND，因此 Zoom in 控件可能报告 found 0。
- 本地修复：新增 owned_uia_windows()，只通过 Win32 EnumWindows 枚举当前 Edge 进程且处于原始 Edge HWND owner chain 内的顶层窗口，再把这些已绑定窗口交给 UIA；没有恢复桌面级 UIA 扫描，也没有使用全局键盘或物理鼠标输入。
- 同步修正 Windows toolbar 离线契约测试：实际 UIA 调用是 pywinauto control.click()，捕获函数提取正则同时接受 CRLF/LF；这两个修正只恢复测试与实现的真实契约，不放宽验收标准。
- 新鲜本地证据：test-browser-toolbar-zoom200.js 通过（24 cells），test-browser-toolbar-zoom200-readiness.js 通过，windows_browser_zoom.py py_compile 通过。
- 当前远端状态仍不能宣称通过：Run 33309694877 是修复前提交的旧失败证据；本地修复尚未形成新提交，也尚未产生新的 Linux、Windows、CL/GHCR 终态证据。
- CPU 纪律：本轮没有使用 rg.exe、没有启动浏览器门禁、没有终止用户进程；后续仍按单次、低负载、可复现检查推进。
- outcome: `1186:edge-uia-popup-owner-fix-and-fresh-ci-next`
- next action: 运行最小源契约与类型/发布边界检查，提交并推送本修复，然后读取新 SHA 的 Linux、Windows 与 CL/GHCR 真实结果；任何失败继续按首个根因纠正，不把级联失败当成通过。
## Previous decision record: Step 1163

- Wide landscape tablets at `667×375` and `844×390` now use the desktop/browser owner; the accepted phone reference and portrait tablet owner remain unchanged.
- Focused runtime `wide-landscape-browser-owner-v1` verified overview and interfaces for both wide landscape viewports.
- The Edge 200% matrix must be regenerated because both the product owner boundary and toolbar verifier owner contract changed; old partial cells are not reusable.
- Low-load execution continues under dynamic `1.00% / 0.25% / 0.05%` task quotas; explicit browser action timeout overrides are preserved while the default remains bounded.
- outcome: `1163:wide-landscape-tablet-browser-owner-runtime-green-edge-matrix-rebased`
- next action: regenerate the new owner-split Edge 200% matrix, then replay 28/76/266, readiness, regressions and independent signoff.

## Previous decision record: Step 1153

- A second tablet inspection rejected the still-empty opposite column produced by placing every incident task board after the longest column.
- The tightened runtime gate failed red on the old 656px full-width interface board.
- Interface/Fleet now use a left object master list and right evidence/task rail. All-offline uses left impact/task context and right affected-WAN/source evidence.
- Phone uses `display:contents` for the outage grouping and retains the accepted sequence and visuals.
- TypeScript, model and production builds pass. Fresh interface tablet, outage tablet and outage phone cells pass; current identity is `3/56`.
- No `rg.exe`, GitHub upload or CL run occurred; independent signoff and release evidence remain pending.
- outcome: `1153:tablet-incident-master-detail-rails-red-green-current3of56-full-replay-next`
- next action: complete the remaining current-identity mobile cells serially by scenario through the one-core low-load wrapper.

## Previous decision record: Step 1152

- A complete 56/56 plus 14/14 engineering replay was visually vetoed because non-normal tablet pages still left most of the iPad work area unused; that report is not reused.
- The runtime gate failed red on the old no-snapshot tablet, then every overview scene gained the same real four-destination object patrol workspace below its scene-specific proof.
- Current scenes show current task counts/status. Historical and unavailable scenes state `历史待核实` or `不可核实` rather than fabricated zeros.
- Phone CSS still hides the tablet workspace; no accepted phone visual rule changed.
- Model, architecture, TypeScript, production builds and the scenario-wrapper contract pass. Fresh collection-down tablet768 passes at 51.1%/50.9% CPU; current identity is `1/56`.
- No `rg.exe`, GitHub upload or CL run occurred; independent signoff and release evidence remain pending.
- outcome: `1152:tablet-incident-task-workspace-red-green-current1of56-full-replay-next`
- next action: complete the remaining current-identity mobile cells serially by scenario through the one-core low-load wrapper.

## Previous decision record: Step 1150

- Fresh `interfaces-down × phone390` places three failed interfaces before two healthy comparisons and labels the mixed list `接口状态 5 项`; the incident banner alone states three affected objects.
- Highest-risk object and first actionable row agree. Missing rate/quality evidence remains unavailable; healthy comparison rates remain current.
- Interface rows open real dedicated details with route relation, address, rates, quality, reason and evidence source.
- The low-load wrapper admitted at 42.2% and 44.3% whole-system CPU. Current identity is `3/56`, `remaining=53`, `pass=false`, `complete=false`.
- All seven scenarios have now received focused 390px adjudication. Full current-identity responsive replay is next, serially under the same CPU envelope.
- No `rg.exe`, GitHub upload or CL run occurred; independent signoff and release evidence remain pending.
- outcome: `1150:interfaces-down-phone390-pass-focused-adjudication-closed-full-replay-next`
- next action: complete the remaining current-identity mobile cells serially through the one-core low-load wrapper.

## Previous decision record: Step 1149

- Fresh `resource-full × phone390` keeps the user-approved phone visual grammar and correctly prioritizes CPU, memory and disk with value, threshold, samples, direction and trend.
- The impact section does not duplicate resource metrics and does not invent unmeasured forwarding/business consequences.
- Resource detail adds threshold delta, trailing consecutive samples and a real time-window trend instead of replaying the home proof.
- The low-load wrapper admitted at 44.6% and 49.4% whole-system CPU. Current identity is `2/56`, `remaining=54`, `pass=false`, `complete=false`.
- No product/style edit was needed. No `rg.exe`, GitHub upload or CL run occurred; independent signoff and release evidence remain pending.
- outcome: `1149:resource-full-phone390-visual-and-semantics-pass-focused-adjudication-active`
- next action: visually adjudicate `interfaces-down × phone390` through the one-core wrapper before full replay.

## Previous decision record: Step 1148

- The first guarded launch correctly stopped before capture after Edge raised whole-system samples to 68.2%, 73.6% and 67.3%; cleanup left zero owned Edge processes.
- Local Windows acceptance now refuses direct execution. The permanent wrapper constrains the complete Node/Edge descendant tree to one logical processor, below-normal priority and a 55% whole-system admission ceiling.
- Collection-down visual review found that REST/SSH and business trust were explicit but the forwarding-plane boundary was absent.
- Model/runtime contracts failed first; the collection ledger now states `转发状态 / 未测量`, preventing management-plane failure from being read as a proven forwarding outage.
- Model, types, production builds and fresh collection-down phone390 pass. The accepted visual grammar is unchanged.
- Source/public identity changed, so prior focused cells were discarded. The current report is `completed=1`, `remaining=55`, `pass=false`, `complete=false`.
- No `rg.exe`, GitHub upload or CL run occurred. Independent signoff, the remaining matrix, clean exact-SHA and remote CL remain pending; release stays CLOSED.
- outcome: `1148:collection-forwarding-boundary-red-green-focused-adjudication-active`
- next action: append the next identity-bound cell through the one-core low-load wrapper only, without changing the locked art.

## Previous decision record: Step 1118

- Step1118 executes the remaining product-depth slice without changing the accepted mobile art direction. The sole mobile baseline remains `_design/accepted-mobile-reference/accepted-four-screen.png`; the sole mobile owner remains `src/panel-framework/mobile-reference-ui/`; no retired mobile presentation was restored.
- Interface objects now have a typed detail surface with operational reason, route relation, address/evidence facts and read-only source facts. Resource objects now expose a real time-window chart with percentage scale, threshold reference and sample count instead of repeated proof values.
- Mobile workspaces now provide real search, domain filter, sort and bounded pagination controls. Search is evaluated against the visible compact row, so every result remains explainable in the phone surface.
- Current verification is green for types, production build, mobile model, mobile architecture, mobile runtime `56/56`, mobile accessibility `11/11`, public overview `28/28`, route-responsive `76/76` and route-state `266/266`.
- The fresh Edge toolbar 200% replay did not earn a pass: after the earlier focus-visibility fix, the Windows run exceeded the bounded `180000ms` cell timeout at `phone-390::normal` and cleanup also timed out. The prior `22/22` report is historical for the earlier worktree identity and is not reused as current proof.
- Product/Visual independent current re-signoff, clean exact-SHA, GitHub publication and post-upload Linux/Windows/GHCR CL evidence remain absent. Release stays closed.
- outcome: `1119:edge-uia-action-timeout-budget-static-green-release-closed`
- next action: reproduce the Edge 200% current-identity run with bounded global timeout/cleanup, then obtain current four-role independent re-signoff without changing the accepted mobile visual baseline.

## Previous decision record: Step 1116

- Step1116 corrected the acceptance tool rather than the product: Edge menu fallback now limits UIA enumeration to the owned Edge process, preventing unrelated desktop windows from causing a bounded timeout. The accepted mobile visual baseline and product code were not changed.
- Final current-identity engineering evidence is green: mobile `56/56`, accessibility `11/11`, public overview `28/28`, route-responsive `76/76` bounded, route-state `266/266`, and real Edge toolbar 200% `22/22`; decision repository/D-drive mirror is `16/16` byte-identical.
- This is engineering evidence only. Current independent four-role signoff, clean exact-SHA, GitHub publication and post-upload Linux/Windows/GHCR CL evidence remain absent, so release stays closed.

## Historical decision record: Step 1112

- Step1112 preserves the user-selected four-screen visual baseline and only corrects graph truth: the WAN SVG now contains an accessible title/description, and resource sparklines use uniform aspect-ratio scaling instead of stretching their trend geometry.
- Current-identity evidence is green after the change: mobile runtime `56/56`, accessibility `11/11`, public overview `28/28`, route-responsive `76/76`, route-state `266/266`, and real Edge toolbar 200% `22/22`.
- Engineering readiness passes in dirty-worktree mode. Current independent four-role records, a clean exact-SHA candidate and post-upload CL evidence do not exist, so release remains closed.

## Previous decision record: Step 1111

- Step1111 regenerated evidence after temporary inspection helpers were removed, so the release matrix, route matrix, route-state matrix and Edge toolbar report now share the current worktree identity.
- Verified current evidence: public overview `28/28`; route-responsive `76/76`; route-state `266/266`; real Edge toolbar 200% `22/22`. The mobile runtime remains `56/56` and accessibility remains `11/11`.
- The screenshot audit confirms the accepted mobile grammar remains unchanged: compact top bar, shallow status/incident banner, grouped white sections, compact WAN facts/chart, scenario-specific resource/interface evidence and four stable navigation roots.
- Engineering readiness passes only in dirty-worktree mode. Independent current Product/Visual/Accessibility/Engineering records are absent, so no synthetic sign-off is created and no GitHub upload is authorized.

## Current decision record: Step 1110

- Step1110 corrected the remaining accepted-baseline product defects without changing the visual direction: the interface overflow action no longer inherits the row grid and remains a single horizontal touch target at 390px; portrait tablet composition now uses a full-width status and WAN sequence followed by paired evidence groups and a full-width current-state group; landscape short-height composition remains a two-zone workspace.
- Step1110 migrated two stale validators: interface evidence dedup now checks `mobile-reference-ui`, and tablet continuity now checks the public overview without waiting for a retired login form. Both pass; no old presentation owner was restored.

- The product owner explicitly selected `accepted-mobile-reference/accepted-four-screen.png` as the only mobile design reference. Older phone directions are not alternate candidates; they are deleted artifacts and forbidden references.
- The new owner is `src/panel-framework/mobile-reference-ui/` with its own `MobileReferenceSurface.tsx` and `mobile-reference.css`. Desktop presentation ownership is separate and unchanged.
- The implementation follows the accepted four-screen grammar: compact top bar, shallow status banner, white grouped data sections, blue/green/red semantic accents, dual-line WAN chart, resource rows with real sparklines, interface comparison rows, evidence/source rows, and four-entry bottom navigation.
- Route and evidence truth is preserved while matching the visual baseline: an active route is shown as verified only when an explicit route/WAN relationship exists; missing rates remain unavailable; resource impact rows do not repeat CPU/memory/disk proof rows.
- The first focused visual pass found and corrected four concrete mismatches: alert tone was leaking into dark headings, resource order was not CPU/memory/disk, resource rows lacked real trend marks, and WAN detail titles exposed an unhelpful “provider not recorded” suffix. The corrected four-screen capture was manually inspected.
- The current four-screen smoke is evidence of focused visual alignment only. It is not a public release sign-off.
- Step1094 migrated the remaining active validators from deleted mobile owners to `mobile-reference-ui`; old owner strings remain only in negative historical/deletion assertions. Canonical route, backend public contract, route maturity, visual surface, release blocker and semantic-gate checks now read the current owner.
- Step1095 completed the current-owner route and scenario replay: overview is `28/28`, route-state is `266/266`, the mobile reference runtime is `56/56`, mobile accessibility is `9/9`, and static/matrix/time/release-blocker contracts are green. Empty object routes now state that no verifiable object is available, and WAN operation targets are 44px.
- The accepted 390×844 normal, resource-full and interfaces-down captures preserve the four-screen reference grammar: compact header, shallow status/incident banner, grouped white sections, blue/green/red semantics, dual WAN chart and four stable roots. This is engineering and focused visual evidence, not an independent Product/Visual receipt.
- `check-public-release-readiness --engineering-worktree` now passes for the current dirty worktree, including a real current-identity Edge toolbar 200% report. This remains engineering evidence only; GitHub and release remain untouched.
- Step1096 corrected the duplicate missing-uptime wording in the WAN header and prevented non-default WAN details from borrowing the verified default route gateway. Step1097 then reserved the fixed-nav safe area, guarded non-default WAN live traffic, added exception evidence and domain-specific object facts, added chart window/resource trend semantics, added interface overflow handoff, and introduced a real two-column tablet/landscape task workspace. Current mobile runtime is 56/56, mobile accessibility is 11/11, and the current route-state matrix is 266/266. The overview 28/28 and route-responsive 76/76 reports must be regenerated after this decision-log sync before being treated as current.
- Step1098 closed the independent Product and Visual gates at P0=0/P1=0. Product confirmed the corrected outage/collection evidence semantics; Visual confirmed the corrected 667/844 landscape two-zone workspace. Remaining P2 notes are non-blocking. Current mobile runtime is 56/56, accessibility 11/11, overview 28/28 and route-state 266/266.
- Step1108 generated independent 390×844 interface, route, resource and terminal detail captures from real object rows, and changed all-offline WAN rows to explicitly label zero rates as the last observation. The rebuilt mobile runtime is 56/56, the current route-responsive report is 76/76 and the current route-state single report is 266/266. A later duplicate route replay hit a real Windows `ERR_NO_BUFFER_SPACE`; it is retained as environmental failure evidence and does not replace the earlier current-identity 76/76 report.

- Step1155–1159 add a hard 55% admission / 70% termination envelope, fix synchronous route-click CDP blocking, and close current overview `28/28`, route-responsive `76/76` and route-state `266/266`.
- Step1160–1161 make actual Windows Edge toolbar 200% evidence identity-bound and resumable. The hard stop correctly terminated a run when whole-system CPU reached 83.4%; bounded resumable batches then completed all `22/22` cells.
- No phone art, typography, color, radius, icon or component composition changed in these steps. Final fixed-name matrices must be rebound after the tooling changes before independent signoff.

## Gate status

| Gate | Status | Boundary |
|---|---|---|
| R07 Product / mobile direction | pending | Sole baseline is the user-supplied accepted four-screen reference; current-identity independent re-signoff is pending. |
| Mobile ownership / architecture | pass | Old mobile owners and D-drive mobile contracts were removed; new owner is isolated. |
| Mobile focused runtime | pass | `check:types`, production build, interface/resource detail evidence and workspace controls pass. |
| Mobile full state matrix | pass | Current mobile identity is 56/56 with all 14 workflows; accessibility is 11/11 including actual text-only 200%. |
| R09 Visual | pending | Step1098 is historical after later implementation/tooling changes; current-identity independent re-signoff is pending. |
| R10 Accessibility / security | pending independent receipt | Mobile accessibility evidence remains green; current-identity real Windows Edge toolbar 200% is 1/22 and still incomplete. |
| Desktop direction | pass | User-selected 192.168.3.5/iPad desktop direction remains separate. |
| Release hygiene | pending | Dirty worktree and generated assets are not a clean candidate. |
| R14 Release | closed | GitHub untouched; exact-SHA Linux/Windows/GHCR CL not started. |

## One next action

在外部 Edge 负载稳定后，低负载串行重跑当前身份 Edge toolbar 200%，再重跑 route76/state266、readiness、focused regressions 和独立签收。不得改变手机美术基线、使用 `rg.exe`、启动子代理或在证据完整前发布。

## Authority links

- Mobile baseline: `../../docs/mobile-reference-baseline.md`
- Mobile owner: `../../src/panel-framework/mobile-reference-ui/MobileReferenceSurface.tsx`
- Mobile styles: `../../src/panel-framework/mobile-reference-ui/mobile-reference.css`
- Focused captures: `../../_acceptance/mobile-reference-only/`
- Full mobile matrix: `../../_acceptance/mobile-reference-runtime/report.json`
- Desktop owner: `../../src/panel-framework/overview/desktop-overview/LegacyDesktopOverview.tsx`
- Full history: `../panel-redesign-decision-log.md`
- Historical index: `historical-index.md`
- Current handoff: `../product-loop-current.md`
- Release chronology: `release-journal.md`
