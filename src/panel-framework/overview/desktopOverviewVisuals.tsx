import type { CSSProperties, ReactNode } from "react";
import { formatNumber } from "./index";
import {
  type ChartDatum,
  type LedgerRow,
  type OverviewPanelProps,
  OVERVIEW_CHART_METADATA_COVERAGE,
  chartSamplePoints,
  chartUnitLabel,
  clampPercent,
  desktopPresentation,
  ledgerCellText,
  ratioPercent,
} from "./desktopOverviewHelpers";
import {
  desktopWanDecisionRail,
  trafficTop3Rows,
} from "./desktopOverviewRows";

export function JudgementChart({ module, rows, kind = "trend" }: { module: string; rows: ChartDatum[]; kind?: "trend" | "pressure" }) {
  const maxValue = Math.max(1, ...rows.map((row) => Math.max(row.currentValue, row.peakValue, row.thresholdValue)));
  const lead = rows[0];
  const leadSamples = chartSamplePoints(lead);
  const anomalyCount = rows.filter((row) => row.tone === "danger" || row.tone === "warn" || row.currentValue >= row.thresholdValue).length;
  return (
    <div
      className={`ro-judgement-chart ro-judgement-chart--${kind}`}
      data-overview-visual-block
      data-overview-judgement-chart="current-peak-mean-window-threshold-trust"
      data-overview-chart-grammar="axis-current-peak-mean-window-threshold-unit-trust"
      data-overview-chart-type={kind === "pressure" ? "bar" : "line"}
      data-overview-chart-module={module}
      data-overview-scene-chart={module}
      data-overview-chart-focus="current-threshold-peak"
      data-overview-chart-main-metric={lead?.label || "无业务快照"}
      data-overview-chart-threshold={lead?.threshold || "待判"}
      data-overview-chart-anomaly-points={anomalyCount}
      data-overview-chart-semantic="main-metric-threshold-anomaly-point"
      data-overview-chart-has-current="true"
      data-overview-chart-has-peak="true"
      data-overview-chart-has-mean="true"
      data-overview-chart-has-window="true"
      data-overview-chart-has-threshold="true"
      data-overview-chart-has-trust="true"
      data-overview-chart-unit={rows.map((row) => row.unit || "").filter(Boolean).join("/") || "status"}
      data-overview-chart-judgement-contract="current-peak-mean-window-threshold-confidence-readable"
      data-overview-chart-metadata-coverage={OVERVIEW_CHART_METADATA_COVERAGE}
      data-overview-plot-contract={kind === "pressure" ? "real-percent-axis-peak-current-threshold-mean" : "real-rate-axis-peak-current-threshold-mean"}
      data-overview-collection-channel-bars={module === "collection-cache-ledger" ? "true" : undefined}
      data-overview-traffic-judgement={module === "wan-trend" || module === "traffic-trend" ? "true" : undefined}
      data-overview-chart-raw-fields="current-peak-mean-window-threshold-confidence"
    >
      {lead ? (
        <div
          className="ro-chart-summary"
          data-overview-chart-meta
          data-overview-sample-points={leadSamples}
          data-overview-time-window={lead.window}
          data-overview-confidence={lead.trust}
          data-overview-chart-summary="current-threshold-mean-peak-confidence"
          title={`\u5224\u65ad\u56fe\uff1a\u5f53\u524d ${lead.current} / \u5cf0\u503c ${lead.peak} / \u5747\u503c ${lead.mean} / \u6837\u672c ${leadSamples} / \u7a97\u53e3 ${lead.window} / \u9608\u503c ${lead.threshold} / \u5355\u4f4d ${chartUnitLabel(lead.unit)} / \u53ef\u4fe1\u5ea6 ${lead.trust}`}
        >
          <span data-overview-field>{"主值 "}<b>{lead.current}</b></span>
          <span data-overview-field>{"阈值 "}<b>{lead.threshold}</b></span>
          <span data-overview-field>{"异常点 "}<b>{formatNumber(anomalyCount)}</b></span>
        </div>
      ) : (
        <div
          className="ro-chart-empty"
          data-overview-chart-meta
          data-overview-empty-chart-state="grey-axis-no-business-snapshot"
          data-overview-sample-points="0/0"
          data-overview-time-window="无业务快照"
          data-overview-confidence="待判"
        >
          <span>无业务快照</span>
          <b>图表不伪装零值</b>
          <em>最近成功未记录 / 灰色轴线</em>
        </div>
      )}
      <div className="ro-chart-axis" data-overview-y-axis="overview-y-axis" aria-hidden="true">
        <span>0</span>
        <span>均值</span>
        <span>阈值线</span>
        <span>峰值</span>
      </div>
      {rows.map((row) => {
        const currentWidth = ratioPercent(row.currentValue, maxValue);
        const meanWidth = ratioPercent(row.meanValue, maxValue);
        const peakWidth = ratioPercent(row.peakValue, maxValue);
        const thresholdLeft = ratioPercent(row.thresholdValue, maxValue);
        const samplePoints = chartSamplePoints(row);
        const isAnomaly = row.tone === "danger" || row.tone === "warn" || row.currentValue >= row.thresholdValue;
        return (
          <div
            className="ro-judgement-row"
            data-tone={row.tone || "trust"}
            data-overview-chart-row={row.id}
            data-overview-current={row.current}
            data-overview-peak={row.peak}
            data-overview-mean={row.mean}
            data-overview-chart-window={row.window}
            data-overview-threshold={row.threshold}
            data-overview-anomaly-point={isAnomaly ? "true" : undefined}
            data-overview-chart-main-metric={row.label}
            data-overview-confidence={row.trust}
            data-overview-unit={row.unit || "status"}
            data-overview-sample-points={samplePoints}
            data-overview-time-window={row.window}
            data-overview-chart-judgement-visible="axis-threshold-current-peak-mean-readout"
            title={`当前 ${row.current} / 峰值 ${row.peak} / 均值 ${row.mean} / 样本 ${samplePoints} / 窗口 ${row.window} / 阈值 ${row.threshold} / 单位 ${row.unit || "status"} / 可信度 ${row.trust}`}
            key={row.id}
          >
            <span className="ro-chart-label">{row.label}</span>
            <div className="ro-chart-track" aria-hidden="true">
              <i className="ro-chart-mean" style={{ width: `${meanWidth}%` }} />
              <b className="ro-chart-current" style={{ width: `${currentWidth}%` }} />
              <em className="ro-chart-peak" style={{ left: `${peakWidth}%` }} />
              <strong className="ro-chart-threshold" style={{ left: `${thresholdLeft}%` }} />
              {isAnomaly ? <u className="ro-chart-anomaly-dot" style={{ left: `${currentWidth}%` }} /> : null}
            </div>
            <span
              className="ro-chart-readout"
              data-overview-trend-readout
              data-overview-chart-judgement-strip="current-peak-mean-window-sample-threshold-confidence"
              data-overview-chart-judgement-strip-visible="true"
              data-overview-mobile-first-chart-readout
              data-overview-chart-meta
              data-overview-sample-points={samplePoints}
              data-overview-time-window={row.window}
              data-overview-confidence={row.trust}
            >
              <i className="ik-overview-trend-cell ik-overview-current-label">现 {row.current}</i>
              <i className="ik-overview-trend-cell">阈 {row.threshold}</i>
              <i className="ik-overview-trend-cell">{isAnomaly ? "异常点" : row.window}</i>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function DesktopWanIntegratedVisual({ snapshot, state, rows }: OverviewPanelProps & { rows: ChartDatum[] }) {
  const topRows = trafficTop3Rows(snapshot, state).slice(0, 3);
  const decision = desktopWanDecisionRail(snapshot, state, rows);
  return (
    <div
      className="ro-wan-integrated-visual"
      data-overview-desktop-wan-integrated="trend-current-peak-top-outlet-route-sampling"
      data-overview-ikuai-wan-chart-integrated="trend-current-peak-top-outlet-route-sampling"
      data-overview-desktop-chart-product-contract="trend-plus-current-peak-top-outlet-route-sampling"
      data-overview-desktop-v1020-integrated-product-chart="single-reading-current-peak-top-route-sampling"
      data-overview-desktop-v1041-wan-readable-chart="current-peak-mean-window-threshold-readout-visible-not-table-noise"
      data-overview-desktop-v1073-wan-single-surface="trend-decision-top3-no-duplicate-summary-or-ledger"
    >
      <JudgementChart module="traffic-trend" kind="trend" rows={rows} />
      <div
        className="ro-wan-integrated-decision"
        data-overview-desktop-v1063-wan-decision-rail="current-peak-top-default-sampling-single-surface"
        data-overview-desktop-v1063-wan-decision-source="desktopWanDecisionRail"
      >
        {decision.map((item) => (
          <span data-overview-desktop-v1063-decision={item.id} data-tone={item.tone} key={item.id}>
            <em>{item.label}</em>
            <b>{item.value}</b>
            <small>{item.note}</small>
          </span>
        ))}
      </div>
      <div className="ro-wan-integrated-top" data-overview-desktop-wan-top-outlet="top3-inline-under-trend">
        {topRows.map((row) => (
          <span data-tone={row.tone || "trust"} key={row.id}>
            <em>{ledgerCellText(row, 0)}</em>
            <b>{ledgerCellText(row, 1)}</b>
            <small>{ledgerCellText(row, 2)}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ChannelMatrixVisual({ module, rows }: { module: string; rows: ChartDatum[] }) {
  return (
    <div
      className="ro-channel-matrix-visual"
      data-overview-chart-type={module === "collection-cache-ledger" ? "bar" : "matrix"}
      data-overview-scene-chart={module}
      data-overview-collection-matrix="rest-ssh-snapshot-status"
    >
      {rows.slice(0, 4).map((row) => (
        <span data-tone={row.tone || "trust"} key={row.id}>
          <i aria-hidden="true" />
          <b>{row.label}</b>
          <strong>{row.current}</strong>
          <em>{row.trust}</em>
        </span>
      ))}
    </div>
  );
}

export function ResourcePressureLedgerVisual({ rows }: { rows: ChartDatum[] }) {
  return (
    <div
      className="ro-resource-ledger-visual"
      data-overview-chart-type="pressure"
      data-overview-scene-chart="resource-three-row-threshold-ledger"
      data-overview-resource-danger-order-bars="thin-row-ledger"
    >
      {rows.slice(0, 3).map((row) => (
        <span data-tone={row.tone || "trust"} key={row.id}>
          <b>{row.label}</b>
          <strong>{row.current}</strong>
          <i aria-hidden="true"><i style={{ width: `${clampPercent(row.currentValue)}%` }} /></i>
          <em>阈{row.threshold} · 持续 {chartSamplePoints(row)}</em>
        </span>
      ))}
    </div>
  );
}

function DesktopIncidentSummary({ snapshot, state }: OverviewPanelProps) {
  if (state.scenario === "single" || state.scenario === "fleet") return null;
  const items = desktopPresentation(snapshot, state).incidentSummary;
  return (
    <div
      className="ro-incident-summary"
      data-overview-desktop-incident-summary="presentation-model-object-impact-trust-recent-readonly"
      data-routeros-presentation-contract="collection-facts/routeros-semantics/user-conclusion"
    >
      {items.map((item) => (
        <span key={item.id} data-tone={item.tone}>
          <em>{item.label}</em>
          <b>{item.value}</b>
        </span>
      ))}
    </div>
  );
}

export function VisualStack({ snapshot, state, children }: OverviewPanelProps & { children?: ReactNode }) {
  return (
    <div className="ro-visual-stack">
      <DesktopIncidentSummary snapshot={snapshot} state={state} />
      {children}
    </div>
  );
}

export function ChainTimeline({ rows, module }: { rows: LedgerRow[]; module: string }) {
  const lead = rows[0];
  const recent = lead ? String(lead.cells[2] || "") : "未记录";
  const noSnapshotTimeline = module.startsWith("no-snapshot");
  return (
    <div
      className="ro-chain-timeline ik-no-snapshot-timeline-visual ik-overview-timeline"
      data-overview-judgement-chart="chain-timeline-current-recent-failure-next"
      data-overview-scene-chart={module}
      data-overview-chart-type={noSnapshotTimeline ? "line" : "timeline"}
      data-overview-chart-has-current="true"
      data-overview-chart-has-window="true"
      data-overview-chart-has-trust="true"
      data-overview-chart-unit="status"
      data-overview-confidence="链路可参考"
      data-overview-chart-meta
      data-overview-sample-points={rows.length ? `${Math.min(rows.length, 6)}/${rows.length}` : "0/0"}
      data-overview-time-window={recent || "最近成功未记录"}
      data-overview-no-snapshot-compact-flow={noSnapshotTimeline ? "true" : undefined}
      data-overview-no-snapshot-success-timeline={noSnapshotTimeline || module === "collection-success-timeline" ? "true" : undefined}
      data-overview-no-snapshot-collection-timeline-parent-judgement={noSnapshotTimeline ? "true" : undefined}
      data-overview-collection-incident-timeline-parent-judgement={module === "collection-success-timeline" ? "true" : undefined}
    >
      <div className="ro-chain-meta" data-overview-chart-meta data-overview-confidence="链路可参考" data-overview-time-window={recent || "最近成功未记录"} data-overview-sample-points={rows.length ? `${Math.min(rows.length, 6)}/${rows.length}` : "0/0"}>
        <span>当前链路</span><b>{lead ? lead.cells[1] : "无业务快照"}</b><em>最近成功 {recent || "未记录"} / 链路可参考</em>
      </div>
      {rows.slice(0, 6).map((row, index) => (
        <div className="ro-chain-node ik-overview-chain-node ik-no-snapshot-chain-node" data-tone={row.tone || "trust"} key={row.id} data-overview-chain-step={index + 1}>
          <span>{row.cells[0]}</span>
          <b>{row.cells[1]}</b>
          <em>{row.cells[2]}</em>
        </div>
      ))}
    </div>
  );
}

export function VisibilityMatrixVisual({ rows }: { rows: LedgerRow[] }) {
  return (
    <div
      className="ro-visibility-matrix ik-no-snapshot-matrix-grid ik-overview-module-matrix"
      data-overview-judgement-chart="visibility-matrix-current-reason-trust"
      data-overview-scene-chart="no-snapshot-visibility-matrix"
      data-overview-chart-type="matrix"
      data-overview-chart-has-current="true"
      data-overview-chart-has-window="true"
      data-overview-chart-has-trust="true"
      data-overview-chart-unit="status"
      data-overview-empty-chart-state="no-business-snapshot-grey-axis"
      data-overview-chart-meta
      data-overview-sample-points={rows.length ? `${Math.min(rows.length, 8)}/${rows.length}` : "0/0"}
      data-overview-time-window="模块可见性"
      data-overview-no-snapshot-four-col-matrix="true"
      data-overview-confidence="业务状态不可参考"
      data-overview-no-snapshot-module-matrix-parent-judgement="true"
      data-overview-matrix-evidence="current-commit"
    >
      <div className="ro-visibility-axis" aria-hidden="true">无业务快照 / 模块可见性 / 灰色为空态轴线</div>
      {rows.slice(0, 8).map((row) => (
        <div className="ro-visibility-cell ik-no-snapshot-matrix-cell ik-no-snapshot-ledger-cell" data-tone={row.tone || "trust"} key={row.id}>
          <span>{row.cells[0]}</span>
          <b>{row.cells[1]}</b>
        </div>
      ))}
    </div>
  );
}

export function ResourceTriCards({ rows }: { rows: ChartDatum[] }) {
  return (
    <div
      className="ro-resource-cards ops-resource-grid"
      data-overview-scene-chart="resource-risk-cards"
      data-overview-resource-primary-pressure="true"
      data-overview-resource-danger-order-bars="true"
      data-overview-chart-type="pressure"
      data-overview-chart-has-current="true"
      data-overview-chart-has-peak="true"
      data-overview-chart-has-mean="true"
      data-overview-chart-has-window="true"
      data-overview-chart-has-threshold="true"
      data-overview-chart-has-trust="true"
      data-overview-chart-unit="%"
    >
      <div className="ro-resource-axis-labels ops-axis-labels ops-axis-chart" aria-hidden="true">
        <span>100%</span>
        <span>50%</span>
        <span>0%</span>
      </div>
      {rows.map((row) => (
        <div className="ro-resource-card ops-resource-card" style={{ "--resource-color": row.tone === "danger" ? "#c94a4a" : "#2f7de1" } as CSSProperties} data-tone={row.tone || "trust"} key={row.id} data-overview-resource-danger-card-judgement data-overview-resource-spark-row-judgement>
          <span>{row.label}</span>
          <b>{row.current}</b>
          <em>当前 {row.current} / 峰值 {row.peak} / 均值 {row.mean}</em>
          <small>阈值 {row.threshold} / 持续 {chartSamplePoints(row)} / 数据点 {row.samples || chartSamplePoints(row)}</small>
          <i aria-hidden="true"><strong className="ops-threshold-line" style={{ width: `${clampPercent(row.currentValue)}%` }} /></i>
        </div>
      ))}
    </div>
  );
}
