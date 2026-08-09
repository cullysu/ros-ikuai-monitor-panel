- status: `current`
- currentConclusionForStep: `904`
- latestRecordedStep: `904`
- latestStepOutcome: `904:dead-css-and-duplicate-owner-pruned-asset-budget-green-formal-gates-open`
- currentBoundaryForStep: `904`
- validForCommit: current clean-worktree evidence only; exact-SHA reports are bound in machine state and must be regenerated after any tracked change; formal gates remain open; not a public release approval
- supersededBy: `null`
- updatedAt: 2026-08-09T13:39:00+08:00
- authority: This is the only human-readable current-state source.

## Current conclusion

**FAIL overall / dead CSS and duplicate desktop ownership removed / fixed asset budget green / independent review and formal release gates OPEN.** Step904 restores the fixed raw CSS budget by deleting only rules with no render owner or rules fully shadowed by the desktop final entry owner; readable text, touch geometry and current evidence surfaces are unchanged. Focused normal/resource smoke is green. The tracked candidate still requires a new clean exact-SHA rebind before any release conclusion. This is not public-release approval. Trusted Product/Design/Visual/Accessibility acceptance, route maturity, real RouterOS soak and exact-SHA external CL remain open. GitHub is untouched.

## Current decision record: Step 904

- observed: Step903 构建后的 framework style 为 `120830 bytes`，超过固定 `120000` raw 预算。源码和构建 JS 均没有旧资源图、逐点样本、旧速率对、旧身份块与旧 sentinel 的渲染 owner；桌面 normal provenance/decision 规则又在 import 后被 entry final owner 对同一选择器完整覆盖。
- decision: 不提高预算。删除无 render owner 的 `mp-resource-chart/scale/time/grid/threshold/samples/rate-pair/focus-identity/text-scale-sentinel` 规则及平板孤立覆盖；删除桌面被 final entry owner 完整遮蔽的重复块。当前压力条、历史入口、focus dossier、WAN signal 与正式 text-scale sentinel 保留。
- visual disposition: `single,resource-full × 390/430/1366 = 6/6` dirty smoke 通过；人工检查 430 资源满载和 1366 正常截图，压力条、历史入口、WAN 图表与桌面证据区未回退。packet 仍需新 clean SHA 重建并接受独立视觉签收。
- runtime truth: framework style 回到 `117121 / 18616 gzip / 15783 brotli`，desktop style 为 `32725 / 4974 / 4400`；12px 正文、44px 主动作、RFC 3339 timestamps、atomic traffic samples、canonical routes 和 read-only boundaries 未回退。
- report truth: `check:static-assets` 与 `check:asset-identity` 通过；6/6 smoke 仍是 dirty-worktree 诊断证据。提交后必须用新 clean SHA 运行 runtime、完整 `check:overview`、28/266/76/532、tablet、430/667、packet、truth、quarantine、readiness 与 Windows 本地包。
- packaging truth: 旧 SHA 的 Windows 本地包不作为当前候选证据；本步提交后必须重新生成 exact-SHA 本地包。
- route maturity: `0 complete / 18 bounded-readonly / 0 fallback / 1 unavailable`，`contractPass=true` 但 `releasePass=false`；complete-module promotion 需要路由级完整证据与可信独立签名，不能自签。
- release boundary: packet 仍 `prepared-not-signed`、`selfSignoff=false`、`releaseEligible=false`；formal Product/Design/Visual/Accessibility、Route Owner/AT、真实 RouterOS soak、Linux/Windows/GHCR exact-SHA CL 和 GitHub upload 均未完成；没有上传 GitHub。

## Gate status

| Gate | Status | Boundary |
|---|---|---|
| Product | pending | The predecessor scoped review is stale; trusted Product acceptance, Route Owner acceptance and complete operational modules remain open. |
| Design | pending | The predecessor scoped visual/design review is stale; a current-SHA independent design signature is absent. |
| Visual QA | pending | Focused 390/430 and the 430 route/scenario shard pass, but tracked changes make prior exact-SHA evidence stale and formal visual acceptance is not self-signable. |
| Architecture | pass | Mobile/desktop render ownership and current local contracts pass. |
| Implementation | pass | Current vertical slices pass their declared runtime/static contracts. |
| Code review | pass | Focused source and boundary checks pass; this does not authorize release. |
| Accessibility | pending | Automated browser scope passes; real assistive-technology acceptance is absent. |
| State matrix | pending | Current exact-SHA local shards are recorded by machine state; any tracked change requires a fresh rebind. |
| Route maturity | pending | 0 complete / 18 bounded-readonly / 0 fallback / 1 unavailable. |
| RouterOS soak | pending | No current long-running real-device evidence. |
| Release hygiene | pending | Final clean SHA, external CL and atomic publication chain remain incomplete. |

## Open review boundaries

- R07 mobile visual maturity, R09 tablet task efficiency, R10 desktop density and R14 cross-surface grammar have current-SHA screenshot and contract evidence; the predecessor e160 scoped reviews are stale after this tracked decision sync. The remaining boundaries are current-SHA independent review, trusted formal signatures, real assistive-technology acceptance, Route Owner acceptance, route maturity and RouterOS soak.
- Fresh local screenshots prove the tested scenarios only; they do not prove real RouterOS behavior, public deployment safety or independent human signoff.
- The task remains active and `blocked=false`. An absent external signature, soak or CL is a release gate, not a reason to stop while local work remains executable; the asset-budget failure was executable and has been fixed locally.

## Authority and evidence

- Sole current conclusion: `docs/decision-system/current-state.md`.
- Discovery: `docs/decision-system/current-index.md` and `docs/decision-system/README.md`.
- Current handoff: `docs/product-loop-current.md`.
- Release journal: `docs/decision-system/release-journal.md`.
- Complete history: `docs/panel-redesign-decision-log.md`.
- Historical index: `docs/decision-system/historical-index.md`.
- D drive is a byte-identical mirror at `D:\想法\面板`.

## One next action

- nextAction: 提交并同步 Step904；在新 clean HEAD 重新运行 runtime、完整 `check:overview`、Overview 28、route-state 266、bounded route 76、full route 532、tablet 152、430/667 视觉分片、packet、truth、quarantine、readiness 和 Windows 包；随后继续当前 SHA 独立 Product/Design/Visual/Accessibility、Route Owner/AT、真实 RouterOS soak 与 exact-SHA Linux/Windows/GHCR CL，全部正式条件通过后才考虑原子 GitHub 发布。
