import type { CSSProperties } from "react";
import { ROUTEROS_ROUTE_EVIDENCE_CONTRACT } from "../routerosEvidenceModel";
import { moduleChartType, type ModuleProps } from "../desktopOverviewHelpers";

export function Module({ title, subtitle, module, tone = "trust", headers, rows, trust, className = "", minRows = 0, visual, visualOnly = false, collapsedEvidence = false }: ModuleProps) {
  const paddedRows = rows;
  const isWanLedger = /wan/i.test(module);
  const isAnomalyEvidence = isWanLedger && !/wan-trend/i.test(module);
  const isRankLedger = /rank|top5|normal-wan-evidence/i.test(module);
  const isResourceRiskModule = module === "resource-risk-priority";
  const isRouterOsRouteEvidenceModule = /route|default-route|evidence-boundary|wan-route/i.test(module);
  const isSecondaryEvidence = /terminal|boundary|collection-resource-threshold|resource-boundary|normal-ops-ledger/.test(module);
  const isNoSnapshotFloorModule = className.split(/\s+/).includes("ro-no-snapshot-floor-module");
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
    && trust !== "实时"
    && /^(wan-trend|wan-offline-bars|resource-risk-priority|collection-channel-ledger|no-snapshot-summary|interface-forwarding|normal-collection-channel|collection-status)$/.test(module),
  );
  return (
    <section
      className={`ro-module ik-overview-flat-module${isResourceRiskModule ? " ops-resource-grid" : ""} ${className}`.trim()}
      style={isNoSnapshotFloorModule ? { alignSelf: "stretch", height: "100%", maxHeight: "none", minHeight: 224 } : undefined}
      data-tone={tone}
      data-overview-density-module={module}
      data-overview-visual-block
      data-overview-chart-type={moduleChartType(module)}
      data-overview-desktop-tier="evidence"
      data-overview-module-body-policy={visualOnly ? "visual-only" : collapsedEvidence ? "collapsed-secondary-evidence" : "content-sized"}
      data-overview-desktop-v1073-visual-only={visualOnly ? "true" : undefined}
      data-overview-desktop-v1074-collapsed-evidence={collapsedEvidence ? "native-details-business-first-raw-secondary" : undefined}
      data-overview-top5-total={module === "resource-interface-top5" ? rows.length : undefined}
      data-overview-wan-offline-bars={module === "wan-offline-bars" ? "true" : undefined}
      data-overview-wan-mini-table={isWanLedger ? "true" : undefined}
      data-overview-anomaly-evidence={primaryEvidenceModules.has(module) || isAnomalyEvidence ? "true" : undefined}
      data-overview-rank-grid={isRankLedger ? "true" : undefined}
      data-overview-resource-interface-top5-first-screen={module === "resource-interface-top5" ? "true" : undefined}
      data-overview-evidence-weight={primaryEvidenceModules.has(module) ? "primary" : isSecondaryEvidence ? "secondary" : "support"}
      data-overview-secondary={isSecondaryEvidence ? "true" : undefined}
      data-overview-routeros-business-main-view={isRouterOsRouteEvidenceModule ? "translated-fields" : undefined}
      data-routeros-route-evidence-contract={isRouterOsRouteEvidenceModule ? ROUTEROS_ROUTE_EVIDENCE_CONTRACT : undefined}
      data-routeros-raw-field-policy={isRouterOsRouteEvidenceModule ? "raw-fields-secondary-not-main-copy" : undefined}
      data-routeros-v1047-raw-evidence-contract={isRouterOsRouteEvidenceModule ? "business-route-main-raw-route-fields-secondary-collapsed-low-noise" : undefined}
      data-overview-resource-judgement-parent={module === "resource-risk-priority" ? "true" : undefined}
      data-overview-resource-danger-card-judgement={module === "resource-risk-priority" ? "true" : undefined}
      data-overview-resource-danger-bars-confidence-standard={module === "resource-risk-priority" ? "current-peak-mean-threshold-trust" : undefined}
      data-overview-resource-ledger-parent-judgement={module === "resource-risk-priority" ? "compact-row-ledger" : undefined}
      data-overview-resource-three-metric-ledger-mode={module === "resource-risk-priority" ? "compact-row-ledger" : undefined}
      data-overview-resource-complementary-pressure-bars={module === "resource-pressure-bars" ? "true" : undefined}
      data-overview-resource-complementary-kind={module === "resource-pressure-bars" ? "connection-interface-dns-sessions" : undefined}
      data-overview-resource-complementary-role={module === "resource-pressure-bars" ? "connection-pressure-interface-throughput-dns-cache-active-sessions" : undefined}
      data-overview-resource-context-parent={module === "resource-pressure-bars" ? "true" : undefined}
      data-overview-collection-bars-parent-judgement={module === "collection-cache-ledger" ? "true" : undefined}
      data-overview-collection-triad-bars={module === "collection-cache-ledger" ? "rest-ssh-snapshot-only" : undefined}
      data-overview-collection-success-timeline-primary={module === "collection-recent-failures" ? "true" : undefined}
      data-overview-collection-success-timeline={module === "collection-recent-failures" ? "true" : undefined}
      data-overview-interface-carrier-table={module === "interface-forwarding" || module === "interface-relation-carrier" ? "true" : undefined}
      data-overview-interface-relation-detail={module === "interface-relation-carrier" ? "carrier-table" : undefined}
      data-overview-no-snapshot-ledger-parent-judgement={module === "no-snapshot-channel-status" ? "true" : undefined}
      data-overview-no-snapshot-channel-parent-judgement={module === "no-snapshot-channel-status" ? "true" : undefined}
      data-overview-no-snapshot-timeline-parent-judgement={module === "no-snapshot-channel-status" ? "true" : undefined}
      data-overview-no-snapshot-module-matrix-parent-judgement={module === "no-snapshot-summary" || module === "no-snapshot-module-visibility" ? "true" : undefined}
      data-overview-no-snapshot-recent-channel-parent-judgement={module === "no-snapshot-recent-success" ? "true" : undefined}
      data-overview-no-snapshot-collection-channel-parent-judgement={module === "no-snapshot-channel-status" ? "true" : undefined}
      data-overview-no-snapshot-content-sized={module.startsWith("no-snapshot") ? "true" : undefined}
      data-overview-desktop-v1042-no-snapshot-floor-module={isNoSnapshotFloorModule ? "visibility-raw-evidence-filled-floor" : undefined}
      data-overview-no-snapshot-floor-zone={isNoSnapshotFloorModule ? module : undefined}
      data-overview-three-col-table={headers.length === 3 ? "true" : undefined}
      data-overview-table-evidence-wrap={headers.length === 3 ? "third-column-full-wrap" : undefined}
      data-overview-top5-display-policy={module === "resource-interface-top5" ? "bar-main-value-share-only-tooltip-secondary" : undefined}
      data-overview-top5-visual-noise-policy={module === "resource-interface-top5" ? "bar-main-value-share-right-secondary-tooltip" : undefined}
      data-overview-top5-density={module === "resource-interface-top5" ? "flat-light-3col" : undefined}
      data-overview-top5-row-visual-contract={module === "resource-interface-top5" ? "name-bar-main-share-right-tooltip-secondary" : undefined}
      data-overview-min-rows={minRows}
      data-overview-filler-rows="disabled"
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
        {module === "resource-interface-top5" ? (
          <span className="ro-sr-contract" data-overview-top5-total={rows.length}>
            <span className="ik-overview-top5-rate"><em>Top5速率</em></span>
            <span className="ik-overview-top5-connections"><em>Top5连接</em></span>
          </span>
        ) : null}
      </header>
      {visual}
      {visualOnly ? null : (
        <details
          className={collapsedEvidence ? "ro-secondary-evidence-disclosure" : "ro-ledger-disclosure"}
          data-overview-desktop-v1074-raw-evidence-disclosure={collapsedEvidence ? "native-details-collapsed-secondary" : undefined}
          open={collapsedEvidence ? undefined : true}
        >
          {collapsedEvidence ? (
            <summary>
              <span>查看原始字段</span>
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
