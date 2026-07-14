import type { CSSProperties } from "react";
import { ROUTEROS_ROUTE_EVIDENCE_CONTRACT } from "../routerosEvidenceModel";
import { moduleChartType, type ModuleProps } from "../desktopOverviewHelpers";

export function Module({ title, subtitle, module, tone = "trust", headers, rows, trust, className = "", minRows = 0, visual, visualOnly = false, collapsed = false, collapsedEvidence = false }: ModuleProps) {
  const paddedRows = rows;
  const isWanLedger = /wan/i.test(module);
  const isAnomalyEvidence = isWanLedger && !/wan-trend/i.test(module);
  const isRankLedger = /rank|top5|normal-wan-evidence/i.test(module);
  const isResourceRiskModule = module === "resource-risk-priority";
  const isRouterOsRouteEvidenceModule = /route|default-route|evidence-boundary|wan-route/i.test(module);
  const isSecondaryEvidence = /terminal|boundary|collection-resource-threshold|resource-boundary|normal-ops-ledger/.test(module);
  const primaryEvidenceModules = new Set([
    "wan-trend",
    "resource-risk-priority",
    "resource-pressure-bars",
    "interface-forwarding",
    "collection-cache-ledger",
    "no-snapshot-summary",
    "wan-offline-bars",
  ]);
  const gridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${Math.max(1, headers.length)}, minmax(0, 1fr))`,
  };
  const showTrustTag = Boolean(
    trust
    && trust !== "当前采样"
    && /^(wan-trend|wan-offline-bars|resource-risk-priority|collection-channel-ledger|no-snapshot-summary|interface-forwarding|normal-collection-channel|collection-status)$/.test(module),
  );
  return (
    <section
      className={`ro-module ik-overview-flat-module${isResourceRiskModule ? " ops-resource-grid" : ""} ${className}`.trim()}
      data-tone={tone}
      data-overview-density-module={module}
      data-overview-visual-block
      data-overview-chart-type={moduleChartType(module)}
      data-overview-module-visual-only={visualOnly ? "true" : undefined}
      data-overview-evidence-mode={collapsedEvidence ? "native-details-business-first-raw-secondary" : undefined}
      data-overview-top5-total={module === "resource-interface-top5" ? rows.length : undefined}
      data-overview-wan-offline-bars={module === "wan-offline-bars" ? "true" : undefined}
      data-overview-wan-mini-table={isWanLedger ? "true" : undefined}
      data-overview-anomaly-evidence={primaryEvidenceModules.has(module) || isAnomalyEvidence ? "true" : undefined}
      data-overview-rank-grid={isRankLedger ? "true" : undefined}
      data-overview-evidence-weight={primaryEvidenceModules.has(module) ? "primary" : isSecondaryEvidence ? "secondary" : "support"}
      data-routeros-route-evidence-contract={isRouterOsRouteEvidenceModule ? ROUTEROS_ROUTE_EVIDENCE_CONTRACT : undefined}
      data-routeros-raw-evidence-contract={isRouterOsRouteEvidenceModule ? "business-route-main-raw-route-fields-secondary-collapsed-low-noise" : undefined}
      data-overview-three-col-table={headers.length === 3 ? "true" : undefined}
    >
      <header className="ro-module-head">
        <div>
          <b className="ik-overview-flat-title">{title}</b>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
        {showTrustTag ? <em data-trust={trust}>{trust}</em> : null}
        {isResourceRiskModule ? (
          <span className="ro-resource-axis-labels ops-axis-labels ops-axis-chart" aria-label="资源百分比轴">
            <span>100%</span>
            <span>50%</span>
            <span>0%</span>
            <span>数据点</span>
          </span>
        ) : null}
      </header>
      {visual}
      {visualOnly ? null : (
        <details
          className={collapsedEvidence ? "ro-secondary-evidence-disclosure" : collapsed ? "ro-secondary-evidence-disclosure ro-compact-summary-disclosure" : "ro-ledger-disclosure"}
          data-overview-evidence-disclosure={collapsedEvidence ? "native-details-collapsed-secondary" : undefined}
          open={collapsedEvidence || collapsed ? undefined : true}
        >
          {collapsedEvidence || collapsed ? (
            <summary>
              <span>{collapsedEvidence ? "查看原始字段" : "查看详情"}</span>
              <b>{rows.length} 项</b>
            </summary>
          ) : null}
          <div className="ro-ledger-table ik-home-evidence-list" role="table">
        <div className="ro-ledger-head ro-ledger-row" role="row" style={gridStyle}>
          {headers.map((header) => (
            <div className="ro-ledger-head-cell" role="columnheader" key={header}>{header}</div>
          ))}
        </div>
        {paddedRows.map((row) => {
          const share = row.attrs?.["data-overview-share"];
          const baseRowStyle = share !== undefined
            ? ({ ...gridStyle, "--overview-share": `${share}%` } as CSSProperties)
            : gridStyle;
          const rowStyle = isResourceRiskModule
            ? ({
              ...baseRowStyle,
              "--resource-color": row.tone === "danger" ? "#c94a4a" : "#2f7de1",
            } as CSSProperties)
            : baseRowStyle;
          return (
            <div
              key={row.id}
              className={`ro-ledger-row ik-home-evidence-row${module === "resource-pressure-bars" || module === "resource-risk-priority" ? " ik-overview-bar-row" : ""}${isResourceRiskModule ? " ops-resource-card ops-axis-chart" : ""}`}
              role="row"
              style={rowStyle}
              data-tone={row.tone || "trust"}
              data-overview-field
              title={row.title}
              {...row.attrs}
            >
              {headers.map((_, index) => (
                <div className="ro-ledger-cell ik-overview-module-cell" role="cell" key={`${row.id}-${index}`} data-overview-field>
                  <span className="ik-overview-cell-text">{row.cells[index] ?? ""}</span>
                </div>
              ))}
            </div>
          );
        })}
          </div>
        </details>
      )}
    </section>
  );
}
