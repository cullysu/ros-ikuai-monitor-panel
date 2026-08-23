# Step563：当前身份矩阵收口与 route maturity release red

## 触发

Step562 的资产压缩完成后，旧的矩阵与 runtime 报告不能继续证明当前产物。用户同时追问“为什么又受阻、决策仓库在哪里”，因此本步把当前证据和新的阻断明确写入源仓库，再同步 D 盘镜像。

## 可审计事实

- route-responsive 第一次重跑使用了错误的四个视口组合：`1366×768 / 1440×900 / 844×390 / 390×844`；它本身运行通过，但不符合门禁要求的 `1600×1000 / 1366×900 / 1024×900 / 390×844`。
- 修正视口后，当前 fingerprint 的 Overview `28/28`、route-responsive `76/76`、route/state `266/266` 均通过。
- fresh `check:runtime-browser` 重新绑定当前身份，结果为 `236 checks / 98 screenshots / 121 snapshotApiCalls`，且桌面 top-shell、types、Overview、asset identity 与 asset budget 通过。
- `check-route-maturity-contract.js --contract-only` 为结构合同通过，但真实报告是 `0 complete / 18 bounded-readonly / 0 fallback / 1 unavailable`；19 个运营路由的 `independentAcceptance` 仍为 `pending`，`more` 是工具目录而非模块。
- `check-public-release-readiness --engineering-worktree` 因 route maturity `releasePass=false` 失败。此前的 asset、matrix shape 和 runtime identity 阻断已经被证据修正，不再把它们混写成同一个问题。

## 决策与拒绝项

1. 保留 route maturity 的 fail-closed 语义；`contractPass=true` 只代表 registry 结构和边界可审计，不代表产品或发布通过。
2. 不把本地矩阵、URL 数量、单上下文视觉检查或共享展示壳写成独立模块签收。
3. 不把 18 个 `bounded-readonly` 批量提升为 `complete`，不把 `more` 工具目录改成伪模块，不为通过门禁创建自签 independent acceptance。
4. 下一阶段改为逐路由验收清单：真实对象/领域证据、错误态与恢复态、详情新证据、可访问性与独立复核各自有来源和状态；没有证据就保持 pending。

## 心得与边界

本步解决的是“当前资产证据是否真的属于当前工作树”以及“阻断到底发生在哪一层”，不是产品成熟度签收。矩阵全绿仍不等于手机审美、19 个路由模块、200% 重排或公众可用。Product/Design/Visual、Accessibility、RouterOS soak、clean candidate、exact-SHA Linux/Windows/GHCR CL、GitHub 与公众发布继续关闭。
