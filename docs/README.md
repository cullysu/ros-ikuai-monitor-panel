# Documentation Index

- status: `reference-index`
- validForCommit: `local remediation`
- supersededBy: `null`

## 当前面板决策仓库（先读这里）

- 当前结论：`decision-system/current-state.md`（当前仍为 **FAIL**，发布关闭）
- 逐步决策过程：`panel-redesign-decision-log.md`
- 当前决策索引：`decision-system/README.md`
- 决策镜像：`D:\想法\面板`
- 当前记录步号：**Step801**（当前工程证据已刷新；Product、Design、Visual、Accessibility、route maturity、RouterOS soak、外部 CL 与公开发布仍未通过；GitHub 继续关闭）

每个材料性切片按以下格式记录：**观察事实 → 写前决定 → 被否决方案 → 红契约 → 实现结果 → 验证证据 → 剩余边界 → 下一步**。这份记录提供可审计的决策摘要和依据，不把模型的私有逐字思考当作文档。

本轮 Step771 的门禁纠正、证据边界和下一步已写入决策日志，并会同步到 `D:\想法\面板`；当前仍是 FAIL/closed，不是产品签收。

Start with the root [README](../README.md), then choose the path that matches
your task.

## Deployment

- [Docker](../DEPLOY_DOCKER.md)
- [Windows EXE](../DEPLOY_WINDOWS_EXE.md)
- [Local Python](../DEPLOY_LOCAL.md)
- [Linux systemd / VM](../README.md#linux-systemd--vm)
- [RouterOS Container](../DEPLOY_ROUTEROS_CONTAINER.md)
- [Optional localhost alias](./LOCALHOST_ALIAS.md)

## Product And Design

- [Current decision state](./decision-system/current-state.md) — the only current product/release conclusion
- [Product decision record](./decision-system/product-pdr.md)
- [Architecture decisions](./decision-system/architecture-adr.md)
- [Responsive capability table](./decision-system/responsive-capabilities.md)
- [Public route maturity matrix](./decision-system/route-maturity.md)
- [Release journal](./decision-system/release-journal.md)
- [Historical/superseded index](./decision-system/historical-index.md)
- [Product model](../PRODUCT_MODEL.md)
- [Design notes](../DESIGN.md)
- [Roadmap](../ROADMAP.md)
- [Disclaimer](../DISCLAIMER.md)

## Security And Privacy

- [Security policy](../SECURITY.md)
- [Privacy and data collection](../PRIVACY.md)
- [Credential handling](./security/CREDENTIALS.md)
- [Threat model](./security/THREAT_MODEL.md)
- [RouterOS read-only permissions](./security/ROUTEROS_READONLY_PERMISSIONS.md)

## Validation

- [Local predeploy checks](./local-predeploy-checks.md)
- [Packaging preflight checks](./validation/preflight-checks.md)
- Local CI entrypoints: `tools/ci-local.ps1` and `tools/ci-local.sh`.

## Legacy

- [Legacy deployment notes](./legacy/README.md)
