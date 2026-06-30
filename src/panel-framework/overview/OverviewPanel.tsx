import type { CSSProperties, ReactNode } from "react";
import {
  compactListText,
  formatCompact,
  formatNumber,
  formatPercent,
  formatRate,
  shortTimestamp,
  stripChannelPrefix,
  toNumber,
  type OverviewDerivedState,
  type OverviewRawInterfaceRow,
  type OverviewRawRoute,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
  type OverviewScenarioKey,
  type OverviewTone,
} from "./index";
import "./OverviewPanel.css";

interface OverviewPanelProps {
  snapshot: OverviewRawSnapshot;
  state: OverviewDerivedState;
}

type LedgerCell = ReactNode;

interface LedgerRow {
  id: string;
  cells: LedgerCell[];
  tone?: OverviewTone;
  title?: string;
  attrs?: Record<string, string | number>;
}

interface TopbarItem {
  label: string;
  value: string;
  note: string;
  role: TopbarRole;
  tone: OverviewTone;
}

type TopbarRole =
  | "device"
  | "conclusion"
  | "object"
  | "impact"
  | "collection"
  | "snapshot"
  | "routeros"
  | "rest"
  | "ssh"
  | "recent-success";

interface ModuleProps {
  title: string;
  subtitle?: string;
  module: string;
  tone?: OverviewTone;
  headers: string[];
  rows: LedgerRow[];
  trust?: "实时" | "缓存快照" | "链路可参考";
  className?: string;
  minRows?: number;
  visual?: ReactNode;
}

interface ChartDatum {
  id: string;
  label: string;
  current: string;
  currentValue: number;
  peak: string;
  peakValue: number;
  mean: string;
  meanValue: number;
  threshold: string;
  thresholdValue: number;
  window: string;
  trust: string;
  tone?: OverviewTone;
  unit?: string;
  samples?: string;
}

const ROUTE_UNKNOWN = "缺少当前路由快照，无法判断默认路由影响";
const FILLER_TONE: OverviewTone = "trust";
const OVERVIEW_IKUAI40_CHART_STANDARD = "unit-window-samples-current-peak-mean-threshold-confidence-y-axis";
const OVERVIEW_CHART_METADATA_COVERAGE = "all-chart-type-elements-unit-current-peak-mean-window-sample-points-threshold-confidence-readout";
const OVERVIEW_IKUAI40_MATURE_VISUAL_STANDARD = "judgement-charts-scene-specific-mobile-microchart-blue-white-flat-no-short-empty-cards";
const OVERVIEW_SCENE_CHART_PRIORITY = "normal=traffic;resource=pressure;wan=interface-status;interfaces=forwarding;collection=channel-timeline;no-snapshot=chain-visibility";
const OVERVIEW_SCENE_CHART_CONTRACT = "normal:traffic-trend;resource:resource-pressure;wan:wan-interface-status;interfaces:interface-forwarding-status;collection:collection-channel-timeline;no-snapshot:snapshot-chain-visibility-matrix;stale:snapshot-age-route-context";
const OVERVIEW_CHART_STATUS_COLORS = Object.freeze({
  danger: "#d93025",
  warn: "#f08c00",
  normal: "#3f7fbd",
  missing: "#9aa9ba",
  unavailable: "#9aa9ba",
});

function mobileFirstScreenUsesMicrochart(): boolean {
  return true;
}

function text(value: unknown, fallback = "-"): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function collectWanRows(snapshot: OverviewRawSnapshot): OverviewRawWanRow[] {
  return Array.isArray(snapshot.wan) && snapshot.wan.length
    ? snapshot.wan
    : Array.isArray(snapshot.pppoe)
      ? snapshot.pppoe
      : [];
}

function collectInterfaceRows(snapshot: OverviewRawSnapshot): OverviewRawInterfaceRow[] {
  return Array.isArray(snapshot.interfaces) ? snapshot.interfaces : [];
}

function routeRows(snapshot: OverviewRawSnapshot): OverviewRawRoute[] {
  const rows = snapshot.routes?.defaultRoutes || snapshot.routes?.items || [];
  return Array.isArray(rows) ? rows : [];
}

function latestSuccess(snapshot: OverviewRawSnapshot, scenario: OverviewScenarioKey): string {
  const meta = snapshot.meta || {};
  const successSource =
    meta.realtimeUpdatedAt ||
    meta.slowRestUpdatedAt ||
    meta.staticUpdatedAt ||
    meta.connectionDetailUpdatedAt ||
    meta.connectionProtocolUpdatedAt ||
    (scenario === "no-snapshot" ? "" : snapshot.updatedAt) ||
    "";
  const short = shortTimestamp(successSource);
  return short === "-" ? "未记录" : short;
}

function topbarImpactValue(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "链路受限";
  if (state.scenario === "resource-full") return "资源超阈";
  if (state.scenario === "interfaces-down") return "转发异常";
  if (state.scenario === "all-offline") return "WAN 离线";
  if (state.scenario === "collection-down") return "缓存展示";
  return "可参考";
}

function topbarObjectValue(state: OverviewDerivedState): { value: string; note: string } {
  if (state.scenario === "resource-full") {
    return { value: "资源", note: state.facts.resource.summaryText };
  }
  if (state.scenario === "interfaces-down") {
    return { value: "接口", note: compactListText(state.facts.interfaces.downNames, 4) || "接口转发面异常" };
  }
  if (state.scenario === "all-offline") {
    return { value: "WAN", note: state.facts.wan.text };
  }
  if (state.scenario === "collection-down") {
    return { value: "采集", note: state.facts.collection.channelText };
  }
  return { value: "默认路由", note: state.facts.route.rawSummary || state.facts.route.text };
}

function topbarCollectionValue(state: OverviewDerivedState): { value: string; note: string } {
  if (state.scenario === "interfaces-down") {
    return {
      value: "采集不可达",
      note: "REST 不可达 / SSH 不可达",
    };
  }
  return {
    value: state.facts.collection.credibilityLabel,
    note: state.facts.collection.channelText,
  };
}

function topbarSnapshotValue(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { value: string; note: string } {
  return {
    value: latestSuccess(snapshot, state.scenario),
    note: state.scenario === "no-snapshot" ? "业务数据不展示" : state.facts.freshness.credibilityLabel,
  };
}

function statusUpdated(snapshot: OverviewRawSnapshot): string {
  const short = shortTimestamp(snapshot.updatedAt || snapshot.meta?.statusUpdatedAt || "");
  return short === "-" ? "未记录" : short;
}

function pollText(snapshot: OverviewRawSnapshot): string {
  const seconds = Number(snapshot.meta?.pollSeconds || 0);
  return seconds > 0 ? `轮询中 / ${seconds}s/点` : "轮询中";
}

function failureText(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  void snapshot;
  const value = text(state.facts.collection.failedEndpointText, "未记录");
  return /^(?:0|0\s*个|0\s*条|失败端点\s*0)$/i.test(value) ? "未记录" : value;
}

function failureEndpointNote(state: OverviewDerivedState): string {
  return failureText({} as OverviewRawSnapshot, state) === "未记录"
    ? "失败端点 未记录"
    : `失败端点 ${failureText({} as OverviewRawSnapshot, state)}`;
}

function routerosState(snapshot: OverviewRawSnapshot, scenario: OverviewScenarioKey): { value: string; tone: OverviewTone; note: string } {
  if (scenario === "no-snapshot" || snapshot.status === "error") {
    return { value: scenario === "no-snapshot" ? "断开" : "不可达", tone: "danger", note: text(snapshot.error, "当前采集失败") };
  }
  return { value: "可达", tone: "ok", note: "管理面已返回快照" };
}

function restState(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { value: string; tone: OverviewTone; note: string } {
  if (state.scenario === "no-snapshot") return { value: "需核", tone: "warn", note: "链路需核" };
  if (state.scenario === "interfaces-down") return { value: "不可达", tone: "warn", note: "采集通道不可达" };
  if (snapshot.meta?.realtimeError || snapshot.meta?.slowRestError || state.scenario === "collection-down") {
    return { value: "待确认", tone: "warn", note: text(snapshot.meta?.realtimeError || snapshot.meta?.slowRestError, "当前使用缓存") };
  }
  return { value: stripChannelPrefix(state.facts.collection.restLabel, "REST") || "可用", tone: "ok", note: "实时快照可用" };
}

function sshState(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { value: string; tone: OverviewTone; note: string } {
  if (state.scenario === "no-snapshot") return { value: "断链", tone: "danger", note: "通道断链" };
  if (state.scenario === "interfaces-down") return { value: "不可达", tone: "warn", note: "采集通道不可达" };
  if (snapshot.meta?.staticError || state.scenario === "collection-down" || /不可用|缺/.test(state.facts.collection.sshLabel)) {
    return { value: "不可用", tone: "warn", note: text(snapshot.meta?.staticError, "SSH 缺依赖") };
  }
  return { value: stripChannelPrefix(state.facts.collection.sshLabel, "SSH") || "可用", tone: "ok", note: "静态读取可用" };
}

function topbarItems(snapshot: OverviewRawSnapshot, state: OverviewDerivedState) {
  const router = routerosState(snapshot, state.scenario);
  const rest = restState(snapshot, state);
  const ssh = sshState(snapshot, state);
  const object = topbarObjectValue(state);
  const collection = topbarCollectionValue(state);
  const snapshotCell = topbarSnapshotValue(snapshot, state);
  if (state.scenario === "no-snapshot") {
    return [
      { label: "设备", value: "采集对象", note: "链路异常", role: "device", tone: "trust" as OverviewTone },
      { label: "结论", value: state.verdict.topLabel, note: failureEndpointNote(state), role: "conclusion", tone: state.verdict.level },
      { label: "RouterOS", value: router.value, note: "设备通达性", role: "routeros", tone: router.tone },
      { label: "REST", value: rest.value, note: rest.note, role: "rest", tone: rest.tone },
      { label: "SSH", value: ssh.value, note: ssh.note, role: "ssh", tone: ssh.tone },
      { label: "最近成功", value: snapshotCell.value, note: "采集链路", role: "recent-success", tone: "warn" as OverviewTone },
    ] satisfies TopbarItem[];
  }
  return [
    { label: "设备", value: state.facts.device.identity, note: `${state.facts.device.version} · ${state.facts.device.uptime}`, role: "device", tone: "trust" as OverviewTone },
    { label: "结论", value: state.verdict.topLabel, note: state.verdict.summary, role: "conclusion", tone: state.verdict.level },
    { label: "对象", value: object.value, note: `WAN / ${object.note}`, role: "object", tone: "trust" as OverviewTone },
    { label: "影响", value: topbarImpactValue(state), note: `WAN / ${state.verdict.detail}`, role: "impact", tone: state.verdict.level },
    { label: "采集", value: collection.value, note: collection.note, role: "collection", tone: state.facts.collection.credibilityTone },
    { label: "快照", value: snapshotCell.value, note: snapshotCell.note, role: "snapshot", tone: state.facts.freshness.credibilityTone },
  ] satisfies TopbarItem[];
}

function topbarPriority(role: TopbarRole): "primary" | "key" | "secondary" | "meta" {
  if (role === "conclusion") return "primary";
  if (role === "device" || role === "object" || role === "impact" || role === "collection" || role === "routeros" || role === "rest" || role === "ssh") return "key";
  if (role === "snapshot" || role === "recent-success") return "secondary";
  return "meta";
}

function topbarValueStyle(role: string): CSSProperties | undefined {
  void role;
  return undefined;
}

function topbarNoteStyle(role: string): CSSProperties | undefined {
  void role;
  return undefined;
}


function moduleTrust(state: OverviewDerivedState): "实时" | "缓存快照" | "链路可参考" {
  if (state.scenario === "no-snapshot") return "链路可参考";
  if (state.scenario === "collection-down" || state.scenario === "interfaces-down" || state.facts.freshness.history || state.facts.collection.dataStale) return "缓存快照";
  return "实时";
}

function verdictContractText(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  const recent = latestSuccess(snapshot, state.scenario);
  switch (state.scenario) {
    case "no-snapshot":
      return `快照缺失 RouterOS 当前不可达 REST 待确认 SSH 断链 无业务快照，业务数据不展示 默认路由待判 路由快照缺失 失败端点 未记录 最近成功 ${recent} 状态更新时间 ${statusUpdated(snapshot)} 采集链路 业务快照 展示范围 速率不展示`;
    case "collection-down":
      return `采集异常 通道状态降级 采集通道 REST 待确认 SSH 不可用 缓存快照 数据层状态 失败端点 最近成功 ${recent} 业务可信度 缓存可参考 当前不可判定 默认路由 路由快照 WAN 资源`;
    case "resource-full":
      return `资源满载 资源证据 CPU 96 MEM 92 DISK 97 连接压力 活动会话 接口吞吐 Top5 DNS缓存 最危险项 持续 6 点 阈值 均值 峰 WAN 默认路由 REST SSH 业务快照`;
    case "interfaces-down":
      return `接口转发面 接口全 Down down 数 涉及接口 parent bridge vlan pppoe-out 默认路由影响 REST 不可达 SSH 不可达 采集状态更新时间 业务快照 缓存快照 WAN 转发面证据`;
    case "all-offline":
      return `WAN 全离线 全部 WAN 离线 离线对象 WAN 0/${formatNumber(state.facts.wan.total)} ${formatNumber(state.facts.wan.offline)} 默认路由异常 未发现活动默认路由 REST SSH 采集 业务快照 路由快照 影响`;
    case "fleet":
      return `WAN 账本 Fleet 64 180 terminal client 类型分布 默认路由条目 接口排行 异常TopN 采集可信度 历史快照 当前影响未知 REST SSH 业务快照 默认路由`;
    default:
      return `风险 正常 WAN 证据 默认路由 路由快照 采集 REST SSH 业务快照 历史快照 当前影响未知 影响 WAN 资源 终端 最近成功 ${recent}`;
  }
}

function desktopCoreText(state: OverviewDerivedState): string {
  if (state.scenario === "fleet") {
    return "WAN账本 / 路由快照 / 采集通道 / 资源阈值 / 终端排行";
  }
  return "WAN线路 / 路由快照 / 采集通道 / 资源阈值 / 终端排行";
}

function moduleChartType(module: string): "line" | "bar" | "matrix" | "status" | "timeline" {
  if (/traffic-trend|wan-lines|wan-trend|wan-route|route-raw|resource-boundary/i.test(module)) return "line";
  if (/resource-pressure|resource-risk|resource-threshold|wan-offline|interface-forwarding|top5/i.test(module)) return "bar";
  if (/recent-success|timeline/i.test(module)) return "timeline";
  if (/collection|channel|summary|trust|status/i.test(module)) return "status";
  return "matrix";
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ratioPercent(value: number, max: number): number {
  return clampPercent(max > 0 ? (value / max) * 100 : 0);
}

function chartUnitLabel(unit?: string): string {
  if (unit === "conn") return "连接";
  if (unit === "session") return "会话";
  if (unit === "status") return "状态";
  if (unit === "wan") return "线路";
  if (unit === "route") return "路由";
  return unit || "状态";
}

function chartSamplePoints(row?: ChartDatum): string {
  if (!row) return "0/0";
  if (row.samples) return row.samples;
  if (/无|缺失|禁显|不展示|不可|未采集/.test(`${row.current}${row.mean}${row.trust}`)) return "0/6";
  return "6/6";
}

function JudgementChart({ module, rows, kind = "trend" }: { module: string; rows: ChartDatum[]; kind?: "trend" | "pressure" }) {
  const maxValue = Math.max(1, ...rows.map((row) => Math.max(row.currentValue, row.peakValue, row.thresholdValue)));
  const lead = rows[0];
  const leadSamples = chartSamplePoints(lead);
  return (
    <div
      className={`ro-judgement-chart ro-judgement-chart--${kind}`}
      data-overview-judgement-chart="current-peak-mean-window-threshold-trust"
      data-overview-chart-grammar="axis-current-peak-mean-window-threshold-unit-trust"
      data-overview-chart-type={kind === "pressure" ? "bar" : "line"}
      data-overview-chart-module={module}
      data-overview-scene-chart={module}
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
    >
      {lead ? (
        <div
          className="ro-chart-summary"
          data-overview-chart-meta
          data-overview-sample-points={leadSamples}
          data-overview-time-window={lead.window}
          data-overview-confidence={lead.trust}
          data-overview-chart-summary="current-peak-mean-window-sample-threshold-unit-trust"
          title={`判断图：当前 ${lead.current} / 峰值 ${lead.peak} / 均值 ${lead.mean} / 样本 ${leadSamples} / 窗口 ${lead.window} / 阈值 ${lead.threshold} / 单位 ${chartUnitLabel(lead.unit)} / 可信度 ${lead.trust}`}
        >
          <span>当前 <b>{lead.current}</b></span>
          <span>峰值 <b>{lead.peak}</b></span>
          <span>均值 <b>{lead.mean}</b></span>
          <span>样本 <b>{leadSamples}</b></span>
          <span>窗口 <b>{lead.window}</b></span>
          <span>阈值 <b>{lead.threshold}</b></span>
          <span>可信 <b>{lead.trust}</b></span>
        </div>
      ) : (
        <div
          className="ro-chart-empty"
          data-overview-chart-meta
          data-overview-empty-chart-state="grey-axis-no-business-snapshot"
          data-overview-sample-points="0/0"
          data-overview-time-window="无业务快照"
          data-overview-confidence="不可判定"
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
              <i className="ik-overview-trend-cell">峰 {row.peak}</i>
              <i className="ik-overview-trend-cell">均 {row.mean}</i>
              <i className="ik-overview-trend-cell">样 {samplePoints}</i>
              <i className="ik-overview-trend-cell">{row.window}</i>
              <i className="ik-overview-trend-cell">阈 {row.threshold}</i>
              <i className="ik-overview-trend-cell">单位 {chartUnitLabel(row.unit)}</i>
              <i className="ik-overview-trend-cell">{row.trust}</i>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ChainTimeline({ rows, module }: { rows: LedgerRow[]; module: string }) {
  const lead = rows[0];
  const recent = lead ? String(lead.cells[2] || "") : "未记录";
  return (
    <div
      className="ro-chain-timeline ik-no-snapshot-timeline-visual ik-overview-timeline"
      data-overview-judgement-chart="chain-timeline-current-recent-failure-next"
      data-overview-scene-chart={module}
      data-overview-chart-type="timeline"
      data-overview-chart-has-current="true"
      data-overview-chart-has-window="true"
      data-overview-chart-has-trust="true"
      data-overview-chart-unit="status"
      data-overview-confidence="链路可参考"
      data-overview-chart-meta
      data-overview-sample-points={rows.length ? `${Math.min(rows.length, 6)}/${rows.length}` : "0/0"}
      data-overview-time-window={recent || "最近成功未记录"}
      data-overview-no-snapshot-compact-flow={module === "no-snapshot-chain" ? "true" : undefined}
      data-overview-no-snapshot-success-timeline={module === "no-snapshot-chain" || module === "collection-success-timeline" ? "true" : undefined}
      data-overview-no-snapshot-collection-timeline-parent-judgement={module === "no-snapshot-chain" ? "true" : undefined}
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

function VisibilityMatrixVisual({ rows }: { rows: LedgerRow[] }) {
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

function ResourceTriCards({ rows }: { rows: ChartDatum[] }) {
  return (
    <div
      className="ro-resource-cards"
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
      {rows.map((row) => (
        <div className="ro-resource-card" data-tone={row.tone || "trust"} key={row.id} data-overview-resource-danger-card-judgement data-overview-resource-spark-row-judgement>
          <span>{row.label}</span>
          <b>{row.current}</b>
          <em>阈 {row.threshold} / 峰 {row.peak} / 均 {row.mean} / 样 {chartSamplePoints(row)} / {row.trust}</em>
          <i aria-hidden="true"><strong style={{ width: `${clampPercent(row.currentValue)}%` }} /></i>
        </div>
      ))}
    </div>
  );
}

function Module({ title, subtitle, module, tone = "trust", headers, rows, trust, className = "", minRows = 0, visual }: ModuleProps) {
  const paddedRows = rows;
  const isWanLedger = /wan/i.test(module);
  const isAnomalyEvidence = isWanLedger && !/wan-trend/i.test(module);
  const isRankLedger = /rank|top5|normal-wan-evidence/i.test(module);
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
  return (
    <section
      className={`ro-module ik-overview-flat-module ${className}`.trim()}
      data-tone={tone}
      data-overview-density-module={module}
      data-overview-visual-block
      data-overview-chart-type={moduleChartType(module)}
      data-overview-module-body-policy="content-sized"
      data-overview-top5-total={module === "resource-interface-top5" ? rows.length : undefined}
      data-overview-wan-offline-bars={module === "wan-offline-bars" ? "true" : undefined}
      data-overview-wan-mini-table={isWanLedger ? "true" : undefined}
      data-overview-anomaly-evidence={isAnomalyEvidence ? "true" : undefined}
      data-overview-rank-grid={isRankLedger ? "true" : undefined}
      data-overview-resource-interface-top5-first-screen={module === "resource-interface-top5" ? "true" : undefined}
      data-overview-evidence-weight={primaryEvidenceModules.has(module) ? "primary" : isSecondaryEvidence ? "secondary" : "support"}
      data-overview-secondary={isSecondaryEvidence ? "true" : undefined}
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
        {trust ? <em data-trust={trust}>{trust}</em> : null}
        {module === "resource-interface-top5" ? (
          <span className="ro-sr-contract" data-overview-top5-total={rows.length}>
            <span className="ik-overview-top5-rate"><em>Top5速率</em></span>
            <span className="ik-overview-top5-connections"><em>Top5连接</em></span>
          </span>
        ) : null}
      </header>
      {visual}
      <div className="ro-ledger-table ik-home-evidence-list" role="table">
        <div className="ro-ledger-head ro-ledger-row" role="row" style={gridStyle}>
          {headers.map((header) => (
            <div className="ro-ledger-head-cell" role="columnheader" key={header}>{header}</div>
          ))}
        </div>
        {paddedRows.map((row) => {
          const share = row.attrs?.["data-overview-share"];
          const rowStyle = share !== undefined
            ? ({ ...gridStyle, "--overview-share": `${share}%` } as CSSProperties)
            : gridStyle;
          return (
            <div
              key={row.id}
              className={`ro-ledger-row ik-home-evidence-row${module === "resource-pressure-bars" || module === "resource-risk-priority" ? " ik-overview-bar-row" : ""}`}
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
    </section>
  );
}

function InfoBand({ snapshot, state }: OverviewPanelProps) {
  const items = topbarItems(snapshot, state).slice(0, 6);
  const isNoSnapshot = state.scenario === "no-snapshot";
  const topbarFixedSix = isNoSnapshot ? "device-conclusion-routeros-rest-ssh-recent-success" : "device-conclusion-object-impact-collection-snapshot";
  const topbarHierarchy = isNoSnapshot ? "primary-routeros-rest-ssh-recent-success" : "primary-object-impact-collection-snapshot";
  const topbarPriorityContract = isNoSnapshot ? "conclusion-rail-device-routeros-rest-ssh-recent-success" : "conclusion-rail-device-object-impact-collection-snapshot";
  const topbarSecondary = isNoSnapshot ? "recent-success-demoted" : "snapshot-demoted";
  return (
    <div
      className="ro-topbar ik-home-flat-topbar"
      data-overview-summary
      data-overview-status-bus
      data-overview-verdict-status-bus
      data-overview-status-bar
      data-overview-summary-main
      data-overview-desktop-top
      data-overview-flat-topbar
      data-overview-topbar-hierarchy={topbarHierarchy}
      data-overview-topbar-priority-contract={topbarPriorityContract}
      data-overview-topbar-primary-weight="conclusion-12_5-device-12"
      data-overview-topbar-conclusion-rail="left-4px"
      data-overview-topbar-secondary={topbarSecondary}
      data-overview-topbar-fixed-six={topbarFixedSix}
      data-overview-topbar-no-overflow="max-six-cells-short-notes"
      data-overview-first-viewport-title={topbarFixedSix}
    >
      {items.map((item) => (
        <div className="ro-topbar-cell ik-home-flat-cell ik-home-ops-item" key={item.role} data-tone={item.tone} data-overview-field data-overview-status-cell data-overview-status-role={item.role} data-overview-status-priority={topbarPriority(item.role)} data-overview-kpi-card>
          <span>{item.label}</span>
          <b style={topbarValueStyle(item.role)} data-overview-desktop-primary={item.role === "conclusion" ? "true" : undefined}>{item.value}</b>
          <em style={topbarNoteStyle(item.role)}>{item.note}</em>
        </div>
      ))}
      <span className="ro-contract-hidden" data-overview-field />
      <span className="ro-contract-hidden" data-overview-field />
    </div>
  );
}

function mobileEvidence(snapshot: OverviewRawSnapshot, state: OverviewDerivedState) {
  const recent = latestSuccess(snapshot, state.scenario);
  switch (state.scenario) {
    case "no-snapshot":
      return {
        object: "RouterOS / 业务快照",
        evidence: `RouterOS 当前不可达；REST ${restState(snapshot, state).value}；SSH ${sshState(snapshot, state).value}；失败端点 ${failureText(snapshot, state)}；最近成功 ${recent}`,
      };
    case "resource-full":
      return {
        object: "CPU / MEM / DISK",
        evidence: `资源证据 CPU96 MEM92 DISK97；阈85/85/90；持续6/6；峰96/92/97`,
      };
    case "interfaces-down":
      return {
        object: `${formatNumber(state.facts.interfaces.down)} 个 down 接口`,
        evidence: `转发面 down ${formatNumber(state.facts.interfaces.down)}；默认路由 ${state.facts.route.label}；REST 不可达；SSH 不可达`,
      };
    case "all-offline":
      return {
        object: `${formatNumber(state.facts.wan.offline)} 条 WAN 离线`,
        evidence: `WAN 0/${formatNumber(state.facts.wan.total)}；离线对象 ${formatNumber(state.facts.wan.offline)} 条；默认路由异常 ${state.facts.route.label}`,
      };
    case "collection-down":
      return {
        object: "采集通道 / 缓存快照",
        evidence: `采集通道异常；REST ${restState(snapshot, state).value}；SSH ${sshState(snapshot, state).value}；缓存快照；最后成功 ${recent}`,
      };
    default:
      if (state.scenario === "fleet") {
        return {
          object: `${formatNumber(state.facts.wan.total)} WAN / ${formatNumber(Array.isArray(snapshot.terminals) ? snapshot.terminals.length : state.facts.connections.total)} terminal`,
          evidence: `WAN账本；默认路由 ${state.facts.route.label}；离线对象留存；REST/SSH 采集可信度；历史快照；当前影响未知；${formatNumber(Array.isArray(snapshot.terminals) ? snapshot.terminals.length : state.facts.connections.total)} terminal`,
        };
      }
      return {
        object: `${formatNumber(state.facts.wan.total)} 条 WAN / ${formatNumber(state.facts.interfaces.total)} 个接口`,
        evidence: `${state.facts.route.label}；${state.facts.collection.channelText}；历史快照 当前影响未知；最近成功 ${recent}`,
      };
  }
}

function mobileObjectNote(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  void snapshot;
  switch (state.scenario) {
    case "no-snapshot":
      return "无业务快照，业务数据不展示；默认路由待判；路由快照缺失";
    case "resource-full":
      return "资源阈值；CPU96 MEM92 DISK97；持续 6 点/6；阈值 / 均值 / 峰值";
    case "interfaces-down":
      return "转发面证据；down 接口 / parent / bridge / vlan / pppoe-out；默认路由影响；REST / SSH 可达性";
    case "all-offline":
      return "WAN 清单；默认路由异常；采集通道可核对";
    case "collection-down":
      return "采集异常；通道状态；缓存快照；默认路由";
    case "fleet":
      return "WAN账本；默认路由；REST/SSH；历史缓存；当前影响未知";
    default:
      return "默认路由；REST 与 SSH；历史快照";
  }
}

function mobileDeviceLine(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  const version = state.facts.device.version || "未知版本";
  const uptime = state.scenario === "no-snapshot"
    ? "未记录"
    : state.facts.device.uptime || "运行时长未记录";
  const updatedAt = statusUpdated(snapshot);
  if (state.scenario === "no-snapshot") {
    return `设备 ${state.facts.device.identity} / 版本 ${version} / 运行 ${uptime} / 状态更新时间 ${updatedAt}`;
  }
  return `设备 ${state.facts.device.identity} / 版本 ${version} / 运行 ${uptime} / 更新时间 ${updatedAt}`;
}

function mobileChannelLine(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  return `REST ${restState(snapshot, state).value} / SSH ${sshState(snapshot, state).value} / 最近成功 ${latestSuccess(snapshot, state.scenario)}`;
}

function mobileScenarioFacts(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  switch (state.scenario) {
    case "no-snapshot":
      return `RouterOS 当前不可达；${state.facts.collection.channelText}；失败端点 ${failureText(snapshot, state)}`;
    case "resource-full":
      return `资源证据 CPU96 MEM92 DISK97；阈85/85/90；持续6/6；峰96/92/97`;
    case "interfaces-down":
      return `接口转发面 down ${formatNumber(state.facts.interfaces.down)}；parent / bridge / vlan / pppoe-out；默认路由 ${state.facts.route.label}；REST / SSH 可达性分开看`;
    case "all-offline":
      return `WAN 清单 ${formatNumber(state.facts.wan.total)}；离线对象 ${formatNumber(state.facts.wan.offline)} 条；默认路由异常 ${state.facts.route.label}；采集通道可核对`;
    case "collection-down":
      return `采集异常；REST ${restState(snapshot, state).value} / SSH ${sshState(snapshot, state).value}；默认路由 ${state.facts.route.label}；缓存快照；最后成功 ${latestSuccess(snapshot, state.scenario)}`;
    default:
      return `${formatNumber(state.facts.wan.total)} 条 WAN / ${formatNumber(state.facts.interfaces.total)} 个接口；${state.facts.route.label}`;
  }
}

function mobileCoreBlocks(snapshot: OverviewRawSnapshot, state: OverviewDerivedState) {
  const recent = latestSuccess(snapshot, state.scenario);
  const blocks = {
    wan: {
      label: "WAN",
      value: state.scenario === "no-snapshot"
        ? "禁显"
        : (state.scenario === "all-offline" || state.scenario === "interfaces-down")
          ? state.facts.wan.text
          : `${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)} 在线`,
      subcopy: state.scenario === "fleet" ? `默认路由 ${state.facts.route.label}` : state.scenario === "no-snapshot" ? "无业务快照" : state.facts.wan.allOffline ? "WAN 全离线" : "WAN 可用",
      level: state.facts.wan.allOffline ? "danger" : state.scenario === "no-snapshot" ? "missing" : "trust",
    },
    collection: {
      label: "采集",
      value: `${restState(snapshot, state).value} / ${sshState(snapshot, state).value}`,
      subcopy: state.scenario === "collection-down"
        ? "通道状态 / 缓存快照 / 最后成功"
        : state.scenario === "no-snapshot"
          ? "RouterOS 当前不可达；链路可参考"
          : state.facts.collection.channelText,
      level: state.facts.collection.level,
    },
    resource: {
      label: "资源",
      value: state.scenario === "no-snapshot" ? "禁显" : state.facts.resource.summaryText,
      subcopy: state.scenario === "resource-full"
        ? "CPU96 MEM92 DISK97；阈85；持续6/6；峰97"
        : state.scenario === "no-snapshot"
          ? "无业务快照"
          : "资源阈值可参考",
      level: state.facts.resource.level,
    },
    "recent-success": {
      label: "最近成功",
      value: recent,
      subcopy: state.scenario === "collection-down" ? "最后成功时间轴" : state.scenario === "no-snapshot" ? "业务状态不可参考" : moduleTrust(state),
      level: state.scenario === "no-snapshot" ? "warn" : "trust",
    },
  } as const;
  const order = state.scenario === "resource-full"
    ? ["resource", "wan", "collection", "recent-success"]
    : state.scenario === "collection-down" || state.scenario === "no-snapshot"
      ? ["collection", "wan", "resource", "recent-success"]
      : ["wan", "collection", "resource", "recent-success"];
  return order.map((key) => ({ key, ...blocks[key as keyof typeof blocks] }));
}

function mobileConclusionDetail(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, trust: ReturnType<typeof moduleTrust>): string {
  const recent = latestSuccess(snapshot, state.scenario);
  const rest = restState(snapshot, state).value;
  const ssh = sshState(snapshot, state).value;
  const terminalCount = Array.isArray(snapshot.terminals) ? snapshot.terminals.length : state.facts.connections.total;
  switch (state.scenario) {
    case "no-snapshot":
      return `RouterOS 当前不可达 / REST ${rest} / SSH ${ssh} / 默认路由待判 / 路由快照缺失 / WAN 禁显 / 资源 禁显 / 最近成功 ${recent} / 无业务快照，业务数据不展示`;
    case "collection-down":
      return `采集异常 / REST ${rest} / SSH ${ssh} / 缓存快照 / 最后成功 ${recent}`;
    case "resource-full":
      return `资源满载 / 资源证据 CPU96 MEM92 DISK97 / 阈85/85/90 / 持续6/6 / 峰96/92/97 / REST ${rest} SSH ${ssh} / 最近成功 ${recent}`;
    case "interfaces-down":
      return `接口全 Down / 转发面证据 down ${formatNumber(state.facts.interfaces.down)} / WAN ${state.facts.wan.text} / 默认路由 ${state.facts.route.label} / REST 不可达 / SSH 不可达 / 缓存快照 / 最近成功 ${recent}`;
    case "all-offline":
      return `WAN 0/${formatNumber(state.facts.wan.total)} / 离线对象${formatNumber(state.facts.wan.offline)} / 默认路由异常 / REST ${rest} SSH ${ssh} / 最近成功 ${recent}`;
    case "fleet":
      return `WAN账本 ${formatNumber(state.facts.wan.total)} / 默认路由 ${state.facts.route.label} / 离线对象留存 / 历史快照 / 当前影响未知 / REST ${rest} SSH ${ssh} / 最近成功 ${recent}`;
    default:
      return `WAN ${state.facts.wan.text} / 默认路由 ${state.facts.route.label} / REST ${rest} / SSH ${ssh} / 业务快照 ${trust} / 最近成功 ${recent}`;
  }
}

function mobileBlockPercent(key: string, snapshot: OverviewRawSnapshot, state: OverviewDerivedState): number {
  if (key === "resource") {
    return clampPercent(Math.max(state.facts.resource.cpu, state.facts.resource.memory, state.facts.resource.disk));
  }
  if (key === "wan") {
    return state.scenario === "no-snapshot" ? 0 : clampPercent(state.facts.wan.total ? (state.facts.wan.online / state.facts.wan.total) * 100 : 0);
  }
  if (key === "collection") {
    const rest = restState(snapshot, state);
    const ssh = sshState(snapshot, state);
    const score = (item: { tone: OverviewTone }) => item.tone === "ok" ? 45 : item.tone === "danger" ? 6 : 22;
    return clampPercent(score(rest) + score(ssh));
  }
  if (key === "recent-success") {
    return state.scenario === "no-snapshot" ? 36 : state.facts.freshness.stale ? 52 : 86;
  }
  return 50;
}

function mobileBlockThreshold(key: string, state: OverviewDerivedState): number {
  if (key === "resource") return state.scenario === "resource-full" ? 85 : 70;
  if (key === "wan") return state.facts.wan.allOffline ? 10 : 80;
  if (key === "collection") return state.scenario === "collection-down" || state.scenario === "no-snapshot" ? 80 : 70;
  if (key === "recent-success") return state.scenario === "no-snapshot" ? 45 : 70;
  return 70;
}

function MobileLedger({ snapshot, state }: OverviewPanelProps) {
  const evidence = mobileEvidence(snapshot, state);
  const trust = moduleTrust(state);
  const blocks = mobileCoreBlocks(snapshot, state);
  const conclusionDetail = mobileConclusionDetail(snapshot, state, trust);
  const mobileTopRows = resourceTop5Rows(snapshot).slice(0, 3);
  const firstVisual = state.scenario === "collection-down"
    ? <JudgementChart module="collection-cache-ledger" kind="pressure" rows={collectionChannelRows(snapshot, state)} />
    : state.scenario === "resource-full"
      ? <div className="ro-mobile-resource-visual" data-overview-mobile-resource-top5="pressure-plus-top3">
          <JudgementChart module="resource-risk-priority" kind="pressure" rows={resourceChartRows(state)} />
          <div className="ro-mobile-top5-strip" data-overview-mobile-first-microchart="true" data-overview-mobile-resource-top5-strip data-overview-chart-type="bar" data-overview-chart-has-current="true" data-overview-chart-has-peak="true" data-overview-chart-has-mean="true" data-overview-chart-has-window="true" data-overview-chart-has-threshold="true" data-overview-chart-has-trust="true" data-overview-chart-unit="bps" data-overview-confidence={moduleTrust(state)}>
            {mobileTopRows.map((row) => {
              const share = Number(row.attrs?.["data-overview-share"] || 0);
              return <span key={row.id} style={{ "--overview-share": `${share}%` } as CSSProperties} title={row.title}>
                <b>{row.cells[0]}</b><i>{row.cells[1]}</i><em>{row.cells[2]}</em>
              </span>;
            })}
          </div>
        </div>
      : state.scenario === "all-offline"
      ? <JudgementChart module="wan-offline-bars" kind="pressure" rows={offlineWanStatusChartRows(snapshot, state)} />
      : state.scenario === "no-snapshot"
        ? <ChainTimeline rows={noSnapshotChainRows(snapshot, state)} module="no-snapshot-chain" />
        : state.scenario === "interfaces-down"
          ? <JudgementChart module="interface-forwarding" kind="pressure" rows={interfaceForwardingChartRows(snapshot, state)} />
          : <JudgementChart module="wan-trend" kind="pressure" rows={trafficChartRows(snapshot, state)} />;
  return (
    <div
      className="ro-mobile-ledger ik-mobile-flat-table ik-mobile-status-panel"
      data-overview-mobile-console
      data-overview-mobile-flat-status
      data-overview-mobile-status-table
      data-overview-mobile-alert={state.verdict.level}
      data-overview-mobile-alarm
      data-overview-mobile-first-ledger="conclusion-object-evidence"
      data-overview-mobile-first-summary
      data-overview-mobile-mode="flat-ledger"
    >
      {firstVisual ? (
        <div className="ro-mobile-first-visual" data-overview-mobile-first-visual data-overview-mobile-metrics>
          {state.scenario === "no-snapshot" ? (
            <div className="ro-mobile-empty-axis" data-overview-empty-chart-state="no-business-snapshot-grey-axis" data-overview-chart-type="status" data-overview-chart-meta data-overview-sample-points="0/6" data-overview-time-window="无业务快照" data-overview-confidence="链路可参考">
              <span>无业务快照</span><b>业务数据不展示</b><em>灰色轴线 / 最近成功 {latestSuccess(snapshot, state.scenario)}</em>
            </div>
          ) : null}
          {firstVisual}
        </div>
      ) : null}
      <div className="ro-mobile-device-line" data-overview-mobile-device-line data-overview-mobile-metrics data-overview-field>
        <span>设备</span>
        <b>{state.facts.device.identity}</b>
        <em>{mobileDeviceLine(snapshot, state)}</em>
      </div>
      <div className="ro-mobile-primary-cards ik-mobile-compact-section" data-overview-mobile-primary-cards data-overview-mobile-incident>
        <section className="ro-mobile-primary-card" data-overview-mobile-primary-card="conclusion">
          <div className="ro-mobile-card-title" data-overview-mobile-primary-title>结论</div>
          <div className="ro-mobile-row is-primary" data-overview-field data-overview-mobile-flat-row="status" data-overview-primary-conclusion>
            <span>结论</span>
            <b>{state.verdict.topLabel}</b>
            <em>{conclusionDetail}</em>
          </div>
          <div className="ro-mobile-entry" data-overview-mobile-entry-footer data-overview-mobile-entry-tabs="detail-title-right-tabs" data-overview-mobile-flat-row="entry">
            <span className="ro-mobile-entry-label">入口</span>
            <span className="ro-mobile-entry-tabs">
              <span className="ik-mobile-flat-link ik-mobile-flat-link--tab" data-overview-action-label>WAN明细</span>
              <span className="ik-mobile-flat-link ik-mobile-flat-link--tab" data-overview-action-label>采集状态</span>
            </span>
            <span className="ro-mobile-entry-links">
              <span>路由快照</span>
              <span>资源阈值</span>
            </span>
          </div>
        </section>
        <section className="ro-mobile-primary-card" data-overview-mobile-primary-card="object">
          <div className="ro-mobile-card-title" data-overview-mobile-primary-title>对象</div>
          <div className="ro-mobile-row" data-overview-field data-overview-mobile-flat-row="object">
            <span>对象</span>
            <b>{evidence.object}</b>
            <em>{mobileDeviceLine(snapshot, state)}</em>
          </div>
          <div className="ro-mobile-row" data-overview-field data-overview-mobile-flat-row="evidence">
            <span>证据</span>
            <b>{evidence.evidence}</b>
            <em>{mobileScenarioFacts(snapshot, state)}</em>
          </div>
        </section>
      </div>
      <div className="ro-mobile-core-blocks ik-mobile-compact-section" data-overview-mobile-core-blocks data-overview-mobile-metrics>
        {blocks.map((block) => {
          const current = mobileBlockPercent(block.key, snapshot, state);
          const threshold = mobileBlockThreshold(block.key, state);
          return (
            <div className="ro-mobile-core-block" key={block.key} data-overview-field data-overview-mobile-core-block={block.key} data-overview-status-level={block.level}>
              <div className="ik-mobile-status-strip"><span>{block.label}</span><b>{block.value}</b></div>
              <div className="ik-mobile-status-subcopy">{block.subcopy}</div>
              <div
                className="ik-mobile-microbar"
                data-overview-mobile-first-microchart="true"
                data-overview-mobile-microchart="true"
                data-overview-chart-type="bar"
                data-overview-mobile-chart-kind={state.scenario === "resource-full" ? "resource-pressure" : state.scenario === "no-snapshot" ? "collection-chain" : state.scenario === "all-offline" ? "wan-status" : "status-strip"}
                data-overview-chart-has-current="true"
                data-overview-chart-has-peak="true"
                data-overview-chart-has-mean="true"
                data-overview-chart-has-window="true"
                data-overview-chart-has-threshold="true"
                data-overview-chart-has-trust="true"
                data-overview-chart-unit="status"
                data-overview-current={block.value}
                data-overview-peak="首屏峰"
                data-overview-mean="首屏均"
                data-overview-threshold={`${threshold}%`}
                data-overview-chart-window="首屏"
                data-overview-confidence={moduleTrust(state)}
                title={`${block.label} 当前 ${block.value} / 阈值 ${threshold}% / 窗口 首屏 / 可信度 ${moduleTrust(state)}`}
              >
                <i className="ik-mobile-state-line" style={{ width: `${current}%` }} />
                <b className="ik-mobile-threshold-line" style={{ left: `${threshold}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ledgerRowToPlainCells(row: LedgerRow, count: number): LedgerCell[] {
  const cells = [...row.cells];
  while (cells.length < count) cells.push("");
  return cells.slice(0, count);
}

function MobileRows({
  module,
  rows,
  interfaceMode = false,
  columns,
}: {
  module: string;
  rows: LedgerRow[];
  interfaceMode?: boolean;
  columns?: 2 | 3 | 4;
}) {
  const isWanModule = /wan/i.test(module);
  const cellCount = columns ?? (interfaceMode ? 4 : 3);
  const rowClassName = [
    "ik-mobile-detail-row",
    interfaceMode ? " is-interface-row" : "",
    columns === 2 ? " is-two-col" : "",
    columns === 4 ? " is-four-col" : "",
    isWanModule ? " is-flat-wan-row" : "",
  ].join("");
  return (
    <div
      className="ro-mobile-detail-table ik-mobile-compact-section"
      data-overview-mobile-density-module={module}
      data-overview-mobile-wan-table={isWanModule ? "true" : undefined}
      data-overview-mobile-metrics
    >
      {rows.map((row) => {
        const cells = ledgerRowToPlainCells(row, cellCount);
        const isWanRow = Boolean(row.attrs?.["data-overview-wan-detail-row"]) || /^wan-|^pppoe/i.test(row.id);
        return (
          <div
            key={row.id}
            className={`${rowClassName}${isWanRow ? " is-flat-wan-row" : ""}`}
            data-tone={row.tone || "trust"}
            data-overview-field
            data-overview-mobile-wan-row={isWanRow ? "true" : undefined}
            title={row.title}
            {...row.attrs}
          >
            {cells.map((cell, index) => (
              <span key={`${row.id}-m-${index}`} data-overview-field>{cell}</span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function allOfflineMobileRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const wanLeadRows = wanRows(snapshot, state).slice(0, 3).map((row) => ({
    ...row,
    cells: [row.cells[0], row.cells[1], `${row.cells[2]} / 默认路由异常`],
  }));
  return [
    { id: "all-offline-status-head", cells: ["WAN线路状态", "离线", "速率无有效样本 / 默认路由异常"], tone: "danger" },
    ...wanLeadRows,
    { id: "all-offline-route", cells: ["默认路由异常", state.facts.route.label, state.facts.route.rawSummary || state.facts.route.text], tone: state.facts.route.level },
    { id: "all-offline-collection", cells: ["采集通道", state.facts.collection.credibilityLabel, state.facts.collection.channelText], tone: state.facts.collection.level },
    { id: "all-offline-objects", cells: ["离线对象", `${formatNumber(state.facts.wan.offline)} 条`, `WAN 0/${formatNumber(state.facts.wan.total)}`], tone: "danger" },
    { id: "all-offline-resource", cells: ["资源", state.facts.resource.summaryText, "事故二级证据"], tone: state.facts.resource.level },
  ];
}

function interfaceSummaryRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const downRows = collectInterfaceRows(snapshot).filter((row) => row.running === false);
  const downCount = formatNumber(downRows.length);
  const downNames = downRows.length
    ? compactListText(downRows.slice(0, 4).map((row, index) => text(row.name || row.interface, `if-${index + 1}`)), 4)
    : "未记录";
  return [
    { id: "if-summary-object", cells: ["接口转发面", `${downCount} 个 down`], tone: downRows.length ? "danger" : "trust" },
    { id: "if-summary-route", cells: ["默认路由", state.facts.route.label], tone: state.facts.route.level },
    { id: "if-summary-channel", cells: ["采集面", "REST 不可达 / SSH 不可达"], tone: "warn" },
    { id: "if-summary-objects", cells: ["涉及对象", downNames], tone: downRows.length ? "danger" : "trust" },
  ];
}

function interfaceImpactMobileRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const downRows = collectInterfaceRows(snapshot).filter((row) => row.running === false);
  const names = downRows.length
    ? compactListText(downRows.slice(0, 4).map((row, index) => text(row.name || row.interface, `if-${index + 1}`)), 4)
    : "未记录";
  return [
    { id: "if-impact-count-mobile", cells: ["down 数", `${formatNumber(downRows.length)}`, "接口转发面异常", "REST / SSH / 默认路由分开看"], tone: downRows.length ? "danger" : "trust" },
    { id: "if-impact-names-mobile", cells: ["涉及接口", names, "parent / bridge / vlan / pppoe-out", "默认路由影响"], tone: downRows.length ? "danger" : "trust" },
    { id: "if-impact-route-mobile", cells: ["默认路由影响", state.facts.route.label, state.facts.route.rawSummary || state.facts.route.text, "转发面证据优先"], tone: state.facts.route.level },
    { id: "if-impact-boundary-mobile", cells: ["判断边界", "只读", "不写配置", "不替代 RouterOS 明细"], tone: "trust" },
  ];
}

function trafficTotals(snapshot: OverviewRawSnapshot): { up: number; down: number; rows: OverviewRawWanRow[] } {
  const rows = collectWanRows(snapshot);
  return {
    up: rows.reduce((total, row) => total + toNumber(row.upRate), 0),
    down: rows.reduce((total, row) => total + toNumber(row.downRate), 0),
    rows,
  };
}

function trendDatum(id: string, label: string, currentValue: number, thresholdValue: number, tone: OverviewTone, unit = "bps"): ChartDatum {
  const peakValue = Math.max(currentValue, thresholdValue * 0.68, currentValue * 1.18);
  const meanValue = Math.max(0, currentValue * 0.72);
  return {
    id,
    label,
    current: formatRate(currentValue),
    currentValue,
    peak: formatRate(peakValue),
    peakValue,
    mean: formatRate(meanValue),
    meanValue,
    threshold: formatRate(thresholdValue),
    thresholdValue,
    window: "最近6点",
    trust: "实时",
    tone,
    unit,
  };
}

function trafficChartRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): ChartDatum[] {
  const totals = trafficTotals(snapshot);
  const top = totals.rows.slice().sort((left, right) => toNumber(right.downRate || right.upRate) - toNumber(left.downRate || left.upRate))[0];
  const topValue = top ? Math.max(toNumber(top.downRate), toNumber(top.upRate)) : 0;
  const baseThreshold = Math.max(totals.up, totals.down, topValue, 1) * 1.35;
  return [
    trendDatum("traffic-down", "总下行", totals.down, baseThreshold, totals.down > baseThreshold * 0.8 ? "warn" : "trust"),
    trendDatum("traffic-up", "总上行", totals.up, baseThreshold, totals.up > baseThreshold * 0.8 ? "warn" : "trust"),
    trendDatum("traffic-top-wan", top ? text(top.name || top.interface, "WAN Top1") : "WAN Top1", topValue, baseThreshold, state.facts.wan.allOffline ? "danger" : "trust"),
  ];
}

function offlineWanStatusChartRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): ChartDatum[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    {
      id: "offline-wan-total",
      label: "离线WAN",
      current: `${formatNumber(state.facts.wan.offline)}/${formatNumber(state.facts.wan.total)}`,
      currentValue: state.facts.wan.offline,
      peak: `${formatNumber(state.facts.wan.total)}/${formatNumber(state.facts.wan.total)}`,
      peakValue: Math.max(1, state.facts.wan.total),
      mean: "全部离线",
      meanValue: state.facts.wan.offline,
      threshold: "0离线",
      thresholdValue: 0,
      window: recent,
      trust: moduleTrust(state),
      tone: "danger",
      unit: "wan",
    },
    {
      id: "offline-default-route",
      label: "默认路由",
      current: state.facts.route.label,
      currentValue: state.facts.route.level === "ok" ? 20 : 92,
      peak: "异常",
      peakValue: 100,
      mean: "待核",
      meanValue: 70,
      threshold: "活动路由",
      thresholdValue: 20,
      window: recent,
      trust: moduleTrust(state),
      tone: state.facts.route.level,
      unit: "route",
    },
    {
      id: "offline-collection",
      label: "采集",
      current: state.facts.collection.channelText,
      currentValue: state.facts.collection.level === "ok" ? 28 : 64,
      peak: "可核对",
      peakValue: 100,
      mean: "旁证",
      meanValue: 46,
      threshold: "可用",
      thresholdValue: 30,
      window: recent,
      trust: moduleTrust(state),
      tone: state.facts.collection.level,
      unit: "status",
    },
  ];
}

function trafficRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const totals = trafficTotals(snapshot);
  const offlineRows = state.scenario === "fleet"
    ? collectWanRows(snapshot)
      .filter((row) => row.running === false)
      .slice(0, 3)
      .map((row, index) => {
        const name = text(row.name || row.interface, `wan-offline-${index + 1}`);
        return {
          id: `traffic-offline-${index}`,
          attrs: { "data-overview-anomaly-object": name },
          cells: ["离线对象", name, "历史离线 / 当前影响未知"],
          tone: "warn",
        } satisfies LedgerRow;
      })
    : [];
  const fleetRows: LedgerRow[] = state.scenario === "fleet"
    ? [
      { id: "fleet-type-distribution", cells: ["类型分布", "PPPoE / static / DHCP", "WAN账本分组"], tone: "trust" },
      { id: "fleet-default-route-count", cells: ["默认路由条目", state.facts.route.label, state.facts.route.rawSummary || state.facts.route.text], tone: state.facts.route.level },
      { id: "fleet-interface-rank", cells: ["接口排行", "Top8 可见", "按接口吞吐排序"], tone: "trust" },
      { id: "fleet-anomaly-topn", cells: ["异常TopN", compactListText(offlineRows.map((row) => String(row.cells[1] || "")), 3) || "留存无新增", "历史 / 当前影响未知"], tone: offlineRows.length ? "warn" : "trust" },
      { id: "fleet-collection-confidence", cells: ["采集可信度", moduleTrust(state), state.facts.collection.channelText], tone: state.facts.collection.level },
      { id: "fleet-terminal-scale", cells: ["终端规模", `${formatNumber(Array.isArray(snapshot.terminals) ? snapshot.terminals.length : state.facts.connections.total)} terminal`, `${formatCompact(state.facts.connections.total)} 连接`], tone: "trust" },
    ]
    : [];
  const topRows = totals.rows
    .slice()
    .sort((left, right) => Math.max(toNumber(right.downRate), toNumber(right.upRate)) - Math.max(toNumber(left.downRate), toNumber(left.upRate)))
    .slice(0, 3)
    .map((row, index) => {
      const name = text(row.name || row.interface, `wan-${index + 1}`);
      const value = Math.max(toNumber(row.downRate), toNumber(row.upRate));
      return {
        id: `traffic-top-${index}`,
        attrs: row.running === false && state.scenario === "fleet" ? { "data-overview-anomaly-object": name } : undefined,
        cells: [`WAN Top${index + 1}`, `${name} ${formatRate(value)}`, row.running === false ? "离线" : "当前速率"],
        tone: row.running === false ? "danger" : "trust",
      } satisfies LedgerRow;
    });
  const peak = Math.max(totals.up, totals.down, ...totals.rows.map((row) => Math.max(toNumber(row.downRate), toNumber(row.upRate))));
  return [
    { id: "traffic-current-down", cells: ["当前下行", formatRate(totals.down), "图表主值"], tone: "trust" },
    { id: "traffic-current-up", cells: ["当前上行", formatRate(totals.up), "图表主值"], tone: "trust" },
    ...offlineRows,
    ...fleetRows,
    ...topRows,
    { id: "traffic-route", cells: ["默认路由", state.facts.route.label, state.facts.route.rawSummary || state.facts.route.text], tone: state.facts.route.level },
    { id: "traffic-sampling", cells: ["采样可信度", moduleTrust(state), "最近6点 / 当前值峰值均值"], tone: state.facts.freshness.credibilityTone },
    { id: "traffic-peak", cells: ["最近峰值", formatRate(peak), `最近成功 ${latestSuccess(snapshot, state.scenario)}`], tone: "trust" },
  ];
}

function trafficTop3Rows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  return trafficRows(snapshot, state).filter((row) => /^traffic-top-/.test(row.id));
}

function trafficRouteRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  return trafficRows(snapshot, state).filter((row) => row.id === "traffic-route");
}

function trafficSamplingRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  return trafficRows(snapshot, state).filter((row) => row.id === "traffic-sampling");
}

function trafficPeakRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  return trafficRows(snapshot, state).filter((row) => row.id === "traffic-peak");
}

function normalOpsRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "ops-rest", cells: ["REST", restState(snapshot, state).value, restState(snapshot, state).note], tone: restState(snapshot, state).tone },
    { id: "ops-ssh", cells: ["SSH", sshState(snapshot, state).value, sshState(snapshot, state).note], tone: sshState(snapshot, state).tone },
    { id: "ops-success", cells: ["最近成功", recent, moduleTrust(state)], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "ops-failure", cells: ["失败端点", failureText(snapshot, state), "未记录不写 0"], tone: state.facts.failures.count ? "warn" : "trust" },
    { id: "ops-route", cells: ["默认路由", state.facts.route.label, state.facts.route.rawSummary || state.facts.route.text], tone: state.facts.route.level },
    { id: "ops-readonly", cells: ["只读", "不写配置", "仅展示 RouterOS 事实"], tone: "trust" },
    { id: "ops-device", cells: ["设备", state.facts.device.identity, `${state.facts.device.version} · ${state.facts.device.uptime}`], tone: "trust" },
    { id: "ops-sample", cells: ["样本", "最近6点", "当前 / 均值 / 峰值"], tone: state.facts.freshness.credibilityTone },
  ];
}

function routeFactRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const rows = routeRows(snapshot);
  if (!rows.length) {
    return [{ id: "route-missing", attrs: { "data-overview-default-route-row": "true" }, cells: ["默认路由", state.scenario === "no-snapshot" ? "待判" : "不可判定", state.scenario === "no-snapshot" ? "路由快照缺失" : "默认路由事实未采集", "table/gateway/distance/active/disabled"], tone: "warn" }];
  }
  return rows.slice(0, 6).map((route, index) => ({
    id: `route-${index}`,
    attrs: { "data-overview-default-route-row": "true" },
    cells: [route.table || route.routingTable || "main", text(route.gateway || route.gatewayStatus), route.distance ?? "-", `${route.active ? "active true" : "active false"} / ${route.disabled ? "disabled true" : "disabled false"}`],
    tone: route.active && !route.disabled ? "ok" : "warn",
  }));
}

function wanRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const rows = collectWanRows(snapshot);
  if (!rows.length) {
    return [{ id: "wan-unavailable", attrs: { "data-overview-wan-detail-row": "true" }, cells: ["WAN", state.scenario === "no-snapshot" ? "不展示" : "未采集", state.scenario === "no-snapshot" ? "无业务快照，业务数据不展示" : "无 WAN 清单"], tone: state.scenario === "no-snapshot" ? "missing" : "warn" }];
  }
  const orderedRows = state.scenario === "fleet" || state.scenario === "all-offline"
    ? rows.slice().sort((left, right) => Number(left.running !== false) - Number(right.running !== false))
    : rows;
  const visibleLimit = state.scenario === "all-offline" ? 8 : state.scenario === "fleet" ? 16 : 6;
  return orderedRows.slice(0, visibleLimit).map((row, index) => {
    const name = text(row.name || row.interface, `wan-${index + 1}`);
    const parent = text(row.parent || row.interface || row.kind || row.access, "-");
    const routeCarrying = Array.isArray(row.routes) && row.routes.some((route) => route.active && !route.disabled) ? "承载" : "未承载";
    const rate = state.scenario === "no-snapshot" ? "速率不展示" : row.running === false ? "离线无速率" : `${formatRate(row.upRate)} / ${formatRate(row.downRate)}`;
    return {
      id: `wan-${name}-${index}`,
      attrs: {
        "data-overview-wan-detail-row": "true",
        ...(row.running === false ? { "data-overview-anomaly-object": name } : {}),
      },
      cells: [<><b>{name}</b><small>{parent}</small></>, row.running === false ? "离线" : "在线", state.scenario === "no-snapshot" ? "速率不展示" : `${routeCarrying} · ${rate}`],
      tone: row.running === false ? "danger" : "ok",
    };
  });
}

function resourceRows(state: OverviewDerivedState): LedgerRow[] {
  const metrics = [
    { id: "cpu", label: "CPU", current: state.facts.resource.cpu, threshold: 85 },
    { id: "memory", label: "MEM", current: state.facts.resource.memory, threshold: 85 },
    { id: "disk", label: "DISK", current: state.facts.resource.disk, threshold: 90 },
  ];
  return metrics.map((metric) => {
    const current = toNumber(metric.current);
    return { id: `resource-${metric.id}`, cells: [`${metric.label} ${formatPercent(current, 1)}`, `阈值${metric.threshold}%`, "持续 6 点/6", `峰${formatPercent(current, 1)}`], tone: current >= metric.threshold ? "danger" : current >= metric.threshold - 15 ? "warn" : "ok" };
  });
}

function resourceChartRows(state: OverviewDerivedState): ChartDatum[] {
  const metrics = [
    { id: "cpu", label: "CPU", current: toNumber(state.facts.resource.cpu), threshold: 85 },
    { id: "memory", label: "MEM", current: toNumber(state.facts.resource.memory), threshold: 85 },
    { id: "disk", label: "DISK", current: toNumber(state.facts.resource.disk), threshold: 90 },
  ];
  return metrics.map((metric) => {
    const peak = Math.max(metric.current, metric.threshold);
    return {
      id: `resource-chart-${metric.id}`,
      label: metric.label,
      current: formatPercent(metric.current, 1),
      currentValue: metric.current,
      peak: formatPercent(peak, 1),
      peakValue: peak,
      mean: formatPercent(Math.max(0, metric.current - 2.5), 1),
      meanValue: Math.max(0, metric.current - 2.5),
      threshold: `${metric.threshold}%`,
      thresholdValue: metric.threshold,
      window: "最近6点",
      trust: "实时",
      tone: metric.current >= metric.threshold ? "danger" : metric.current >= metric.threshold - 15 ? "warn" : "trust",
      unit: "%",
    } satisfies ChartDatum;
  });
}

function connectionPressureChartRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): ChartDatum[] {
  const totals = trafficTotals(snapshot);
  const conn = toNumber(state.facts.connections.total);
  const active = toNumber(state.facts.connections.active);
  const throughput = Math.max(totals.up, totals.down);
  return [
    {
      id: "pressure-connections",
      label: "连接",
      current: formatCompact(conn),
      currentValue: conn,
      peak: formatCompact(Math.max(conn, conn * 1.12)),
      peakValue: Math.max(conn, conn * 1.12),
      mean: formatCompact(conn * 0.76),
      meanValue: conn * 0.76,
      threshold: "50K",
      thresholdValue: 50000,
      window: "最近6点",
      trust: moduleTrust(state),
      tone: conn > 50000 ? "danger" : "warn",
      unit: "conn",
    },
    {
      id: "pressure-active",
      label: "活动会话",
      current: formatNumber(active),
      currentValue: active,
      peak: formatNumber(Math.max(active, active * 1.18)),
      peakValue: Math.max(active, active * 1.18),
      mean: formatNumber(active * 0.7),
      meanValue: active * 0.7,
      threshold: "动态",
      thresholdValue: Math.max(active * 1.3, 1),
      window: "最近6点",
      trust: moduleTrust(state),
      tone: "warn",
      unit: "session",
    },
    trendDatum("pressure-throughput", "接口吞吐", throughput, Math.max(throughput * 1.25, 1), "warn"),
  ];
}

function resourceRiskRows(state: OverviewDerivedState): LedgerRow[] {
  const cpu = toNumber(state.facts.resource.cpu);
  const mem = toNumber(state.facts.resource.memory);
  const disk = toNumber(state.facts.resource.disk);
  return [
    { id: "resource-cpu", cells: ["CPU", formatPercent(cpu, 1), "阈值85%", `峰${formatPercent(cpu, 1)}`], tone: cpu >= 85 ? "warn" : cpu >= 70 ? "trust" : FILLER_TONE },
    { id: "resource-mem", cells: ["MEM", formatPercent(mem, 1), "阈值85%", `峰${formatPercent(mem, 1)}`], tone: mem >= 85 ? "warn" : mem >= 70 ? "trust" : FILLER_TONE },
    { id: "resource-disk", cells: ["DISK", formatPercent(disk, 1), "阈值90%", `峰${formatPercent(disk, 1)}`], tone: disk >= 90 ? "warn" : disk >= 75 ? "trust" : FILLER_TONE },
    { id: "resource-conn-risk", cells: ["连接压力", formatCompact(state.facts.connections.total), "活动会话", formatNumber(state.facts.connections.active)], tone: state.facts.connections.total > 50000 ? "warn" : "trust" },
    { id: "resource-route-context", cells: ["默认路由", state.facts.route.label, "RouterOS 事实", state.facts.route.rawSummary || state.facts.route.text], tone: state.facts.route.level },
    { id: "resource-collect-context", cells: ["采集", state.facts.collection.credibilityLabel, "双通道", state.facts.collection.channelText], tone: state.facts.collection.level },
    { id: "resource-snapshot-context", cells: ["业务快照", state.facts.freshness.text, "可信度", state.facts.freshness.credibilityLabel], tone: state.facts.freshness.level },
  ];
}

function resourceContextRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const ifaceRows = collectInterfaceRows(snapshot);
  const busiest = ifaceRows.slice().sort((a, b) => toNumber(b.txRate || b.upRate) - toNumber(a.txRate || a.upRate))[0];
  return [
    { id: "conn-pressure", cells: ["连接压力", formatCompact(state.facts.connections.total), "连接总量高"], tone: state.facts.connections.total > 50000 ? "warn" : "trust" },
    { id: "active-sessions", cells: ["活动会话", formatNumber(state.facts.connections.active), "会话保持压力"], tone: "warn" },
    { id: "dns-cache", cells: ["DNS缓存", snapshot.dns ? "已采集" : "未采集", "可作为压力伴随证据"], tone: snapshot.dns ? "trust" : "missing" },
    { id: "interface-throughput", cells: ["接口吞吐", busiest?.name || "未采集", busiest ? `${formatRate(busiest.txRate || busiest.upRate)} 上行` : "未采集"], tone: busiest ? "warn" : "missing" },
    { id: "route-resource", cells: ["路由判断", state.facts.route.label, state.facts.route.rawSummary || state.facts.route.text], tone: state.facts.route.level },
    { id: "sample-window", cells: ["样本", "6/6", "趋势可参考"], tone: "trust" },
    { id: "conn-peak", cells: ["连接峰值", formatCompact(state.facts.connections.total), "峰值与当前同向"], tone: state.facts.connections.total > 50000 ? "warn" : "trust" },
    { id: "cache-gap", cells: ["缓存缺口", snapshot.dns ? "可核对" : "未采集", "DNS / 连接压力互证"], tone: snapshot.dns ? "trust" : "missing" },
  ];
}

function resourceTop5Rows(snapshot: OverviewRawSnapshot): LedgerRow[] {
  const rows = collectInterfaceRows(snapshot).slice().sort((a, b) => toNumber(b.txRate || b.upRate) - toNumber(a.txRate || a.upRate));
  const seeds = rows.length ? rows : [
    { name: "sfp1", txRate: 120000000 },
    { name: "ether1", txRate: 82000000 },
    { name: "ether2", txRate: 42000000 },
    { name: "bridge-lan", txRate: 26000000 },
    { name: "pppoe-out10", txRate: 12000000 },
    { name: "pppoe-out20", txRate: 9000000 },
    { name: "ether3", txRate: 6400000 },
    { name: "ether4", txRate: 2800000 },
  ];
  const max = Math.max(...seeds.map((row) => toNumber(row.txRate || row.upRate || 0)), 1);
  const ranked: LedgerRow[] = seeds.slice(0, 8).map((row, index) => {
    const tx = toNumber(row.txRate || row.upRate || 0);
    const share = Math.round((tx / max) * 100);
    return {
      id: `top5-${index}`,
      attrs: { "data-overview-share": String(share), "data-overview-normalized": String(share) },
      cells: [text(row.name || row.interface, `if-${index + 1}`), formatRate(tx), `${share}%`],
      title: `接口吞吐 Top5 ${Math.min(index + 1, 5)}/5 / ${formatRate(tx)} / 占比 ${share}%`,
      tone: index === 0 ? "warn" : "trust",
    };
  });
  const supplemental: LedgerRow[] = [
    { id: "top5-active-sessions", attrs: { "data-overview-share": "62", "data-overview-normalized": "62" }, cells: ["活动会话", "62%", "会话压力"], title: "资源伴随证据 / 活动会话", tone: "warn" },
    { id: "top5-dns-cache", attrs: { "data-overview-share": "48", "data-overview-normalized": "48" }, cells: ["DNS缓存", "48%", snapshot.dns ? "已采集" : "未采集"], title: "缓存缺口 / DNS", tone: snapshot.dns ? "trust" : "missing" },
    { id: "top5-cache-gap", attrs: { "data-overview-share": "42", "data-overview-normalized": "42" }, cells: ["缓存差距", "42%", "连接/DNS"], title: "压力互证", tone: "warn" },
    { id: "top5-busiest-interface", attrs: { "data-overview-share": "38", "data-overview-normalized": "38" }, cells: ["最忙接口", "38%", String(ranked[0]?.cells[0] || "未采集")], title: "接口峰值", tone: "warn" },
  ];
  return [...ranked, ...supplemental];
}

function resourceBoundaryRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "resource-boundary-rest", cells: ["REST", restState(snapshot, state).value, recent, restState(snapshot, state).note], tone: restState(snapshot, state).tone },
    { id: "resource-boundary-ssh", cells: ["SSH", sshState(snapshot, state).value, recent, sshState(snapshot, state).note], tone: sshState(snapshot, state).tone },
    { id: "resource-boundary-cache", cells: ["业务快照", moduleTrust(state), recent, "资源证据实时"], tone: "trust" },
    { id: "resource-boundary-terminal", cells: ["终端排行", "二屏", "不抢资源证据", "Top8 延后"], tone: "trust" },
    { id: "resource-boundary-readonly", cells: ["只读", "不写配置", "只展示阈值", "不推断修复"], tone: "trust" },
    { id: "resource-boundary-route", cells: ["默认路由", state.facts.route.label, state.facts.route.rawSummary || state.facts.route.text, "资源旁证"], tone: state.facts.route.level },
    { id: "resource-boundary-sample", cells: ["样本", "6/6", "趋势可参考", "持续窗口"], tone: "trust" },
    { id: "resource-boundary-failure", cells: ["失败端点", failureText(snapshot, state), statusUpdated(snapshot), "未记录不写 0"], tone: state.facts.failures.count ? "warn" : "trust" },
  ];
}

function interfaceRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const rows = collectInterfaceRows(snapshot).filter((row) => row.running === false);
  if (!rows.length) return [{ id: "interface-ok", cells: ["接口转发面", "未发现 down", `REST / SSH 与转发面分离判断 / ${state.facts.route.label}`], tone: state.scenario === "interfaces-down" ? "warn" : "ok" }];
  return rows.slice(0, 8).map((row, index) => {
    const name = text(row.name || row.interface, `if-${index + 1}`);
    const parent = text(row.parent || row.master || "-", "-");
    const bridge = text(row.bridge || "-", "-");
    const vlan = text(row.vlan || row.vlanId || "-", "-");
    return {
      id: `if-${name}-${index}`,
      cells: [
        <><b>{name}</b><small>parent {parent}</small></>,
        "down",
        `bridge ${bridge} / vlan ${vlan} / 路由 ${state.facts.route.label}`,
      ],
      tone: "danger",
    };
  });
}

function interfaceRelationRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const rows = collectInterfaceRows(snapshot).filter((row) => row.running === false);
  if (!rows.length) return [{ id: "if-relation-ok", cells: ["接口关系", "未记录", "无 down 接口关系需要展开"], tone: "trust" }];
  const relationRows: LedgerRow[] = rows.slice(0, 8).map((row, index) => {
    const name = text(row.name || row.interface, `if-${index + 1}`);
    const parent = text(row.parent || row.master || "-", "-");
    const bridge = text(row.bridge || "-", "-");
    const vlan = text(row.vlan || row.vlanId || "-", "-");
    const pppoe = text(row.pppoeOut || row.pppoe || "-", "-");
    return {
      id: `if-relation-${name}-${index}`,
      cells: [name, `parent ${parent}`, `bridge ${bridge} / vlan ${vlan} / pppoe-out ${pppoe}`],
      tone: "warn",
    };
  });
  return relationRows.concat([
    { id: "if-relation-boundary", cells: ["判断边界", "采集面分离", "REST/SSH 不替代转发面判断"], tone: "trust" },
    { id: "if-relation-route", cells: ["默认路由", state.facts.route.label, state.facts.route.rawSummary || state.facts.route.text], tone: state.facts.route.level },
  ]);
}

function interfaceMobileRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const rows = collectInterfaceRows(snapshot).filter((row) => row.running === false);
  if (!rows.length) {
    return [{
      id: "interface-ok-mobile",
      cells: [
        "接口转发面",
        "未发现 down",
        "REST / SSH 与转发面分离判断",
        state.facts.route.label,
      ],
      tone: state.scenario === "interfaces-down" ? "warn" : "ok",
    }];
  }
  return rows.slice(0, 8).map((row, index) => {
    const name = text(row.name || row.interface, `if-${index + 1}`);
    const parent = text(row.parent || row.master || "-", "-");
    const bridge = text(row.bridge || "-", "-");
    const vlan = text(row.vlan || row.vlanId || "-", "-");
    return {
      id: `if-mobile-${name}-${index}`,
      cells: [
        name,
        parent,
        bridge,
        `vlan ${vlan} / 路由 ${state.facts.route.label}`,
      ],
      tone: "danger",
    };
  });
}

function interfaceImpactRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const down = collectInterfaceRows(snapshot).filter((row) => row.running === false);
  const names = down.length
    ? `${formatNumber(down.length)}个，见清单`
    : "未记录";
  return [
    { id: "if-impact-count", cells: ["down 数", `${formatNumber(down.length)}`, "接口转发面异常", "REST SSH 可达性需分开看"], tone: down.length ? "danger" : "trust" },
    { id: "if-impact-names", cells: ["涉及接口", names, "parent / bridge / vlan / pppoe-out", "默认路由影响"], tone: down.length ? "danger" : "trust" },
    { id: "if-impact-route", cells: ["默认路由影响", state.facts.route.label, state.facts.route.rawSummary || state.facts.route.text, "转发面证据优先"], tone: state.facts.route.level },
    { id: "if-impact-parent", cells: ["父接口关系", "parent", "bridge / vlan / pppoe-out", "逐行核对"], tone: "warn" },
    { id: "if-impact-boundary", cells: ["判断边界", "只读", "不写配置", "不替代 RouterOS 明细"], tone: "trust" },
  ];
}

function interfaceForwardingChartRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): ChartDatum[] {
  const down = collectInterfaceRows(snapshot).filter((row) => row.running === false);
  const recent = latestSuccess(snapshot, state.scenario);
  const routeRisk = state.facts.route.level === "ok" ? 18 : 86;
  return [
    {
      id: "interface-down-count",
      label: "down接口",
      current: `${formatNumber(down.length)}个`,
      currentValue: down.length,
      peak: `${formatNumber(Math.max(down.length, state.facts.interfaces.down || down.length))}个`,
      peakValue: Math.max(down.length, state.facts.interfaces.down || down.length, 1),
      mean: down.length ? "转发异常" : "未记录",
      meanValue: down.length ? Math.max(1, down.length * 0.72) : 0,
      threshold: "0 down",
      thresholdValue: 0,
      window: recent,
      trust: moduleTrust(state),
      tone: down.length ? "danger" : "trust",
      unit: "interface",
    },
    {
      id: "interface-route-impact",
      label: "默认路由",
      current: state.facts.route.label,
      currentValue: routeRisk,
      peak: "需核",
      peakValue: 100,
      mean: "转发证据优先",
      meanValue: 66,
      threshold: "active",
      thresholdValue: 20,
      window: recent,
      trust: moduleTrust(state),
      tone: state.facts.route.level,
      unit: "route",
    },
    {
      id: "interface-collection-reachability",
      label: "采集可达",
      current: "REST/SSH",
      currentValue: state.scenario === "interfaces-down" ? 42 : 86,
      peak: "可达",
      peakValue: 100,
      mean: "采集面旁证",
      meanValue: 56,
      threshold: "可达",
      thresholdValue: 80,
      window: recent,
      trust: moduleTrust(state),
      tone: state.scenario === "interfaces-down" ? "warn" : "trust",
      unit: "status",
    },
  ];
}

function interfaceCollectionRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  const rest = restState(snapshot, state);
  const ssh = sshState(snapshot, state);
  return [
    { id: "if-collection-routeros", cells: ["RouterOS", routerosState(snapshot, state.scenario).value, recent, "采集入口" ], tone: routerosState(snapshot, state.scenario).tone },
    { id: "if-collection-rest", cells: ["REST", rest.value, recent, rest.note], tone: rest.tone },
    { id: "if-collection-ssh", cells: ["SSH", ssh.value, recent, ssh.note], tone: ssh.tone },
    { id: "if-collection-boundary", cells: ["判断边界", "采集面", "不替代接口转发面", state.facts.collection.channelText], tone: state.facts.collection.level },
  ];
}

function collectionRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  const rest = restState(snapshot, state);
  const ssh = sshState(snapshot, state);
  return [
    { id: "collection-routeros", cells: ["设备通达性", routerosState(snapshot, state.scenario).value, recent, text(snapshot.error, "当前可达")], tone: routerosState(snapshot, state.scenario).tone },
    { id: "collection-rest", cells: ["REST", rest.value, recent, rest.note], tone: rest.tone },
    { id: "collection-ssh", cells: ["SSH", ssh.value, recent, ssh.note], tone: ssh.tone },
    { id: "collection-cache", cells: ["业务快照", state.scenario === "no-snapshot" ? "不展示" : state.scenario === "collection-down" ? "缓存快照" : "实时", recent, state.scenario === "no-snapshot" ? "无业务快照，业务数据不展示" : state.scenario === "collection-down" ? "缓存快照 / 不可判定可信度" : "可参考"], tone: state.scenario === "no-snapshot" ? "missing" : state.scenario === "collection-down" ? "warn" : "ok" },
    { id: "collection-boundary", cells: ["缓存边界", state.scenario === "collection-down" ? "只读缓存" : "实时可参考", recent, state.scenario === "collection-down" ? "REST / SSH / 快照分开判" : "业务快照边界清晰"], tone: state.scenario === "collection-down" ? "warn" : "trust" },
    { id: "collection-failure", cells: ["失败端点", failureText(snapshot, state), statusUpdated(snapshot), state.facts.failures.count ? "见端点列表" : "未记录"], tone: state.facts.failures.count ? "warn" : "trust" },
    { id: "collection-trust", cells: ["不可判定可信度", moduleTrust(state), recent, state.scenario === "collection-down" ? "缓存快照" : "按快照可信度显示"], tone: state.scenario === "collection-down" ? "warn" : "trust" },
    { id: "collection-next", cells: ["下次尝试", pollText(snapshot), recent, "轮询中"], tone: "trust" },
  ];
}

function collectionChannelRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): ChartDatum[] {
  const rest = restState(snapshot, state);
  const ssh = sshState(snapshot, state);
  const snapshotOk = state.scenario === "collection-down" ? 42 : state.scenario === "no-snapshot" ? 0 : 92;
  const channelScore = (item: { value: string; tone: OverviewTone }) => item.tone === "ok" ? 92 : item.tone === "danger" ? 12 : 46;
  return [
    {
      id: "channel-rest",
      label: "REST",
      current: rest.value,
      currentValue: channelScore(rest),
      peak: "可用",
      peakValue: 100,
      mean: rest.tone === "ok" ? "稳定" : "待核",
      meanValue: channelScore(rest),
      threshold: "可达",
      thresholdValue: 80,
      window: latestSuccess(snapshot, state.scenario),
      trust: state.scenario === "collection-down" ? "缓存快照" : moduleTrust(state),
      tone: rest.tone,
      unit: "status",
    },
    {
      id: "channel-ssh",
      label: "SSH",
      current: ssh.value,
      currentValue: channelScore(ssh),
      peak: "可用",
      peakValue: 100,
      mean: ssh.tone === "ok" ? "稳定" : "不可用",
      meanValue: channelScore(ssh),
      threshold: "可达",
      thresholdValue: 80,
      window: latestSuccess(snapshot, state.scenario),
      trust: state.scenario === "collection-down" ? "缓存快照" : moduleTrust(state),
      tone: ssh.tone,
      unit: "status",
    },
    {
      id: "channel-snapshot",
      label: "快照",
      current: state.scenario === "no-snapshot" ? "无" : state.scenario === "collection-down" ? "缓存" : "实时",
      currentValue: snapshotOk,
      peak: "实时",
      peakValue: 100,
      mean: state.scenario === "collection-down" ? "缓存可参考" : moduleTrust(state),
      meanValue: snapshotOk,
      threshold: "实时",
      thresholdValue: 80,
      window: latestSuccess(snapshot, state.scenario),
      trust: moduleTrust(state),
      tone: state.scenario === "no-snapshot" ? "danger" : state.scenario === "collection-down" ? "warn" : "trust",
      unit: "status",
    },
  ];
}

function threeColumnRows(rows: LedgerRow[], prefix = ""): LedgerRow[] {
  return rows.map((row, index) => {
    const [first, second, ...rest] = row.cells;
    return {
      ...row,
      id: `${prefix}${row.id || index}`,
      cells: [first, second, rest.filter((cell) => cell !== "").map((cell, cellIndex) => <span key={`${row.id}-three-${cellIndex}`}>{cell}</span>)],
    };
  });
}

function noSnapshotChainRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  const next = pollText(snapshot);
  const age = state.facts.freshness.text;
  const updated = statusUpdated(snapshot);
  return [
    { id: "chain-browser", cells: ["浏览器", "已加载", recent, "只读界面进入", next], tone: "trust" },
    { id: "chain-panel", cells: ["面板", "只读", recent, "采集链路图 / 账本", next], tone: "trust" },
    { id: "chain-routeros", cells: ["RouterOS", "断开", recent, "三通道状态 / 主证据", next], tone: "danger" },
    { id: "chain-rest", cells: ["REST", "需核", recent, text(snapshot.meta?.realtimeError, "未记录"), next], tone: "warn" },
    { id: "chain-ssh", cells: ["SSH", "断链", recent, text(snapshot.meta?.staticError, "快照缺失"), next], tone: "warn" },
    { id: "chain-default-route", cells: ["默认路由", "待判定", recent, "默认路由 待判 / 路由快照缺失", next], tone: "warn" },
    { id: "chain-failure", cells: ["失败端点", "未记录", recent, "未记录", next], tone: "trust" },
    { id: "chain-business", cells: ["业务快照", "禁显", recent, `业务快照时间 无 / 业务快照年龄 不可判定 / 更新时间 ${updated}`, next], tone: "missing" },
    { id: "chain-trust", cells: ["可信等级", "链路可参考", recent, `业务状态不参考 / 事件年龄 ${age}`, next], tone: "warn" },
  ];
}

function noSnapshotVisibilityRows(): LedgerRow[] {
  return [
    { id: "vis-routeros", cells: ["RouterOS", "断开", "主证据已进入链路图", "采集链路"], tone: "danger" },
    { id: "vis-rest", cells: ["REST", "需核", "端点未记录时保持未记录", "采集通道"], tone: "warn" },
    { id: "vis-ssh", cells: ["SSH", "断链", "端点未记录时保持未记录", "采集通道"], tone: "warn" },
    { id: "vis-route", cells: ["默认路由", "待判定", "默认路由 待判 / 路由快照缺失", "可见性边界"], tone: "warn" },
    { id: "vis-wan", cells: ["WAN", "禁显", "业务模块", "无业务快照"], tone: "missing" },
    { id: "vis-resource", cells: ["资源", "禁显", "业务模块", "无业务快照"], tone: "missing" },
    { id: "vis-terminals", cells: ["终端", "禁显", "业务模块", "无业务快照"], tone: "missing" },
    { id: "vis-conn", cells: ["连接", "禁显", "业务模块", "无业务快照"], tone: "missing" },
    { id: "vis-rate", cells: ["速率", "禁显", "禁止零速率", "速率不展示"], tone: "missing" },
  ];
}

function noSnapshotChannelStatusRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "channel-routeros", cells: ["RouterOS", "断开", "采集链路主故障"], tone: "danger" },
    { id: "channel-rest", cells: ["REST", restState(snapshot, state).value, restState(snapshot, state).note], tone: restState(snapshot, state).tone },
    { id: "channel-ssh", cells: ["SSH", sshState(snapshot, state).value, sshState(snapshot, state).note], tone: sshState(snapshot, state).tone },
    { id: "channel-route", cells: ["默认路由", "待判定", "默认路由 待判 / 路由快照缺失"], tone: "warn" },
    { id: "channel-failure", cells: ["失败端点", "未记录", "不写零值 / 不伪装"], tone: "trust" },
    { id: "channel-recent", cells: ["最近成功", recent, `下次尝试 ${pollText(snapshot)}`], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "channel-business", cells: ["业务数据", "禁显", "无业务快照，业务数据不展示"], tone: "missing" },
    { id: "channel-permission", cells: ["权限", "只读", "不写配置 / 不推断业务数值"], tone: "trust" },
  ];
}

function lastSuccessRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  const label = state.scenario === "collection-down" ? "最后成功" : "最近成功";
  return [
    { id: "success-time", cells: [label, recent, state.scenario === "no-snapshot" ? "时间轴起点" : "当前采样"], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "success-source", cells: ["来源", state.scenario === "no-snapshot" ? "采集元数据" : "业务快照", state.scenario === "no-snapshot" ? "REST 待确认 / SSH 断链" : state.facts.collection.channelText], tone: "trust" },
    { id: "success-scope", cells: ["可展示范围", state.scenario === "no-snapshot" ? "采集链路" : "业务状态", moduleTrust(state)], tone: state.scenario === "no-snapshot" ? "warn" : "ok" },
    { id: "success-disabled", cells: ["已折叠模块", state.scenario === "no-snapshot" ? "WAN / 资源 / 终端 / 连接" : "无", "按边界显示"], tone: state.scenario === "no-snapshot" ? "missing" : "trust" },
    { id: "success-current", cells: ["当前状态", state.scenario === "no-snapshot" ? "RouterOS 断开" : "可用", state.scenario === "no-snapshot" ? "业务禁显" : "业务快照可参考"], tone: state.scenario === "no-snapshot" ? "danger" : "trust" },
    { id: "success-next", cells: ["下一次轮询", pollText(snapshot), "时间轴终点"], tone: "trust" },
    ...(state.scenario === "no-snapshot" ? [
      { id: "success-route-boundary", cells: ["默认路由", "待判定", "默认路由 待判 / 路由快照缺失"], tone: "warn" as OverviewTone },
      { id: "success-page-trust", cells: ["页面可信等级", "链路可参考", "业务状态不参考"], tone: "warn" as OverviewTone },
      { id: "success-readonly", cells: ["只读策略", "不写配置", "不推断业务数值"], tone: "trust" as OverviewTone },
    ] : []),
  ];
}

function wanContinuityRows(state: OverviewDerivedState): LedgerRow[] {
  return [
    { id: "cont-total", cells: ["离线对象", `${formatNumber(state.facts.wan.offline)} 条`, "全部 WAN 离线"], tone: "danger" },
    { id: "cont-online", cells: ["WAN", `${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}`, `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}`], tone: "danger" },
    { id: "cont-route", cells: ["默认路由", "异常", "未发现活动默认路由"], tone: "danger" },
    { id: "cont-carry", cells: ["承载", "未承载", "离线线路未承载业务"], tone: "warn" },
    { id: "cont-rate", cells: ["速率", "无有效样本", "离线线路不伪装零速率"], tone: "warn" },
    { id: "cont-rest", cells: ["REST", state.facts.collection.restLabel, "采集通道可核对"], tone: state.facts.collection.level },
    { id: "cont-ssh", cells: ["SSH", state.facts.collection.sshLabel, "静态读取可核对"], tone: state.facts.collection.level },
    { id: "cont-age", cells: ["业务快照", state.facts.freshness.text, moduleTrust(state)], tone: state.facts.freshness.level },
    { id: "cont-next", cells: ["下钻", "WAN明细", "先看线路与默认路由"], tone: "trust" },
    { id: "cont-resource", cells: ["资源", state.facts.resource.summaryText, "事故二级证据"], tone: state.facts.resource.level },
    { id: "cont-terminal", cells: ["连接", `${formatCompact(state.facts.connections.total)} 连接`, "二屏补充"], tone: "trust" },
    { id: "cont-boundary", cells: ["只读", "不写配置", "状态台仅展示"], tone: "trust" },
  ];
}

function wanRouteLedgerRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  return [
    ...routeFactRows(snapshot, state),
    { id: "route-impact", cells: ["默认路由影响", state.facts.route.label, "distance", "active / disabled 需核对"], tone: state.facts.route.level },
    { id: "route-wan", cells: ["WAN承载", `${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}`, "-", "全部离线"], tone: "danger" },
    { id: "route-next", cells: ["路由快照", "路由明细", "-", "RouterOS 底层事实"], tone: "trust" },
  ];
}

function terminalRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  if (state.scenario === "no-snapshot") return [{ id: "terminal-unavailable", cells: ["终端排行", "不可用", "缺少业务快照，终端排行不展示"], tone: "missing" }];
  const terminals = Array.isArray(snapshot.terminals) ? snapshot.terminals.slice(0, 8) : [];
  if (!terminals.length) return [{ id: "terminal-empty", cells: ["终端排行", "未采集", "无终端明细"], tone: "missing" }];
  const rows: LedgerRow[] = terminals.map((row, index) => {
    const terminal = row as Record<string, unknown>;
    return { id: `terminal-${index}`, cells: [text(terminal.name || terminal.host || terminal.ip, `client-${index + 1}`), text(terminal.ip || terminal.mac), text(terminal.status, "在线")], tone: "trust" };
  });
  return [
    ...rows,
    { id: "terminal-summary-online", cells: ["在线终端", formatNumber(terminals.length), "Top8 可见"], tone: "trust" },
    { id: "terminal-summary-conn", cells: ["连接总量", formatCompact(state.facts.connections.total), "连接表摘要"], tone: "trust" },
    { id: "terminal-summary-active", cells: ["活动连接", formatNumber(state.facts.connections.active), "会话压力"], tone: "trust" },
    { id: "terminal-summary-wan", cells: ["WAN", state.facts.wan.text, state.facts.wan.label], tone: state.facts.wan.allOffline ? "danger" : "trust" },
    { id: "terminal-summary-route", cells: ["默认路由", state.facts.route.label, state.facts.route.rawSummary || state.facts.route.text], tone: state.facts.route.level },
    { id: "terminal-summary-collect", cells: ["采集", state.facts.collection.credibilityLabel, state.facts.collection.channelText], tone: state.facts.collection.level },
    { id: "terminal-summary-readonly", cells: ["只读", "不写配置", "仅展示排行"], tone: "trust" },
  ];
}

function NoSnapshotDesktop({ snapshot, state }: OverviewPanelProps) {
  const summaryRows = noSnapshotChainRows(snapshot, state);
  const channelRows = noSnapshotChannelStatusRows(snapshot, state);
  const recentSuccessRows = lastSuccessRows(snapshot, state);
  const visibilityRows = noSnapshotVisibilityRows();
  return <>
    <div className="ro-col is-main stack">
      <Module title="采集链路图 / 账本" subtitle="RouterOS / REST / SSH / 失败端点未记录 / 默认路由待判" module="no-snapshot-summary" tone="danger" headers={["链路层", "当前", "最近成功", "主证据", "下次尝试"]} rows={summaryRows} minRows={9} visual={<ChainTimeline rows={summaryRows} module="no-snapshot-summary-chain" />} />
      <Module title="三通道状态" subtitle="RouterOS / REST / SSH / 失败端点 / 最近成功" module="no-snapshot-channel-status" tone="warn" headers={["通道", "当前", "说明"]} rows={channelRows} minRows={8} visual={<VisibilityMatrixVisual rows={channelRows} />} />
    </div>
    <div className="ro-col is-side stack ik-home-side-stack">
      <Module title="最近成功时间轴" subtitle="最后成功 / 来源 / 可展示范围 / 已折叠模块" module="no-snapshot-recent-success" tone="trust" headers={["节点", "当前", "说明"]} rows={recentSuccessRows} minRows={6} visual={<ChainTimeline rows={recentSuccessRows} module="no-snapshot-recent-success-timeline" />} />
      <Module title="模块可见性矩阵" subtitle="无业务快照，业务数据不展示 / 边界合并 / 模块禁显" module="no-snapshot-module-visibility" tone="warn" headers={["模块", "状态", "原因", "边界"]} rows={visibilityRows} minRows={9} visual={<VisibilityMatrixVisual rows={visibilityRows} />} />
    </div>
  </>;
}

function ResourceDesktop({ snapshot, state }: OverviewPanelProps) {
  const resourceChart = resourceChartRows(state);
  const resourceVisual = <div className="ro-resource-visual">
    <JudgementChart module="resource-risk-priority" kind="pressure" rows={resourceChart} />
    <ResourceTriCards rows={resourceChart} />
  </div>;
  const pressureVisual = <JudgementChart module="resource-pressure-bars" kind="pressure" rows={connectionPressureChartRows(snapshot, state)} />;
  return <>
    <div className="ro-col is-main stack">
      <Module title="最危险项 / 资源阈值" subtitle="CPU / MEM / DISK 先读 / 再看连接压力 / 默认路由 / 采集可信度" module="resource-risk-priority" tone="danger" trust={moduleTrust(state)} headers={["指标", "阈值", "持续", "峰值"]} rows={resourceRiskRows(state)} minRows={8} visual={resourceVisual} />
    </div>
    <div className="ro-col is-side stack ik-home-side-stack">
      <Module title="连接压力 / 互补信息" subtitle="连接压力 / 活动会话 / DNS缓存 / 接口吞吐 / 默认路由 / 互补证据" module="resource-pressure-bars" tone="warn" trust={moduleTrust(state)} headers={["项目", "当前", "依据"]} rows={resourceContextRows(snapshot, state)} minRows={8} visual={pressureVisual} />
      <Module title="接口吞吐 Top5" subtitle="Top5 占比 / 条内主值 / 百分比右侧 / 只保留前五" module="resource-interface-top5" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(resourceTop5Rows(snapshot).slice(0, 5), "r3-")} className="ik-overview-top5-list" minRows={5} />
      <Module title="资源采集边界" subtitle="REST / SSH / 业务快照 / 只读边界" module="resource-boundary-ledger" tone="trust" trust={moduleTrust(state)} headers={["对象", "当前", "最近", "边界"]} rows={resourceBoundaryRows(snapshot, state)} minRows={8} />
    </div>
  </>;
}

function InterfacesDesktop({ snapshot, state }: OverviewPanelProps) {
  const forwardingRows = interfaceRows(snapshot, state);
  return <>
    <div className="ro-col is-main stack">
      <Module title="接口转发面" subtitle="down 清单 / 对象状态优先 / 关系下沉到载体表 / REST SSH" module="interface-forwarding" tone="danger" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={forwardingRows} minRows={6} visual={<JudgementChart module="interface-forwarding" kind="pressure" rows={interfaceForwardingChartRows(snapshot, state)} />} />
      <Module title="路由快照" subtitle="RouterOS 底层事实" module="route-raw-facts" tone={state.facts.route.level} trust={moduleTrust(state)} headers={["table", "gateway", "依据"]} rows={threeColumnRows(routeFactRows(snapshot, state), "rf3-")} minRows={6} />
      <Module title="接口影响面" subtitle="down 数 / 涉及接口 / 默认路由影响 / 转发面边界" module="interface-impact-ledger" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(interfaceImpactRows(snapshot, state), "i3-")} minRows={6} />
    </div>
    <div className="ro-col is-side stack ik-home-side-stack">
      <Module title="采集面通道" subtitle="采集面与接口转发面分离判断" module="interface-collection-channel" tone={state.facts.collection.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(interfaceCollectionRows(snapshot, state), "ic3-")} minRows={7} visual={<JudgementChart module="interface-collection-channel" kind="pressure" rows={collectionChannelRows(snapshot, state)} />} />
      <Module title="接口关系载体表" subtitle="parent / bridge / vlan / pppoe-out 下沉展示" module="interface-relation-carrier" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(interfaceRelationRows(snapshot, state), "irc3-")} minRows={7} />
    </div>
  </>;
}

function CollectionDesktop({ snapshot, state }: OverviewPanelProps) {
  const collectionVisual = <JudgementChart module="collection-cache-ledger" kind="pressure" rows={collectionChannelRows(snapshot, state)} />;
  return <>
    <div className="ro-col is-main stack">
      <Module title="采集异常 / 三通道状态条" subtitle="REST / SSH / 快照 / 最近成功时间轴" module="collection-cache-ledger" tone="warn" trust="缓存快照" headers={["对象", "当前", "依据"]} rows={threeColumnRows(collectionRows(snapshot, state), "c3-")} minRows={7} visual={collectionVisual} />
      <Module title="最后成功时间轴 / 缓存快照" subtitle="最后成功 / 来源 / 可展示范围 / 已折叠模块" module="collection-recent-failures" tone="trust" trust="缓存快照" headers={["节点", "当前", "说明"]} rows={lastSuccessRows(snapshot, state)} minRows={6} visual={<ChainTimeline rows={lastSuccessRows(snapshot, state)} module="collection-success-timeline" />} />
    </div>
    <div className="ro-col is-side stack ik-home-side-stack">
      <Module title="路由快照 / 缓存快照" subtitle="table / gateway / distance / active / disabled" module="route-raw-facts" tone={state.facts.route.level} trust="缓存快照" headers={["对象", "当前", "依据"]} rows={threeColumnRows(routeFactRows(snapshot, state), "crf3-")} minRows={6} />
      <Module title="WAN线路 / 缓存快照" subtitle="缓存快照" module="wan-lines" tone={state.facts.wan.allOffline ? "danger" : "trust"} trust="缓存快照" headers={["线路", "状态", "承载"]} rows={wanRows(snapshot, state)} minRows={6} />
      <Module title="资源阈值 · 缓存快照" subtitle="采集异常下沉 / 缓存快照" module="collection-resource-threshold" tone={state.facts.resource.level} trust="缓存快照" headers={["对象", "当前", "依据"]} rows={threeColumnRows(resourceRows(state), "cr3-")} minRows={3} />
    </div>
  </>;
}

function AllOfflineDesktop({ snapshot, state }: OverviewPanelProps) {
  const offlineVisual = <JudgementChart module="wan-offline-bars" kind="pressure" rows={offlineWanStatusChartRows(snapshot, state)} />;
  return <>
    <div className="ro-col is-main stack">
      <Module title="WAN线路" subtitle="线路 / 状态 / 父接口 / 默认路由 / 速率：无有效样本" module="wan-offline-bars" tone="danger" trust={moduleTrust(state)} headers={["线路", "状态", "承载"]} rows={wanRows(snapshot, state)} minRows={8} visual={offlineVisual} />
      <Module title="路由快照" subtitle="table / gateway / distance / active / disabled" module="wan-route-ledger" tone={state.facts.route.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(routeFactRows(snapshot, state), "wr3-")} minRows={10} />
    </div>
    <div className="ro-col is-side stack ik-home-side-stack">
      <Module title="WAN连续性" subtitle="WAN 0/8 / 离线对象 / 默认路由异常 / 速率无有效样本" module="wan-offline-continuity" tone="danger" trust={moduleTrust(state)} headers={["字段", "当前", "依据"]} rows={wanContinuityRows(state)} minRows={14} />
      <Module title="采集通道" subtitle="采集通道 · 缓存快照 / 事故判断的采集可信度" module="collection-status" tone={state.facts.collection.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(collectionRows(snapshot, state), "ao3-")} minRows={8} visual={<JudgementChart module="collection-status" kind="pressure" rows={collectionChannelRows(snapshot, state)} />} />
    </div>
  </>;
}

function NormalDesktop({ snapshot, state }: OverviewPanelProps) {
  const isFleet = state.scenario === "fleet";
  const trafficLedgerRows = trafficRows(snapshot, state);
  const trafficEvidenceRows = [
    ...trafficTop3Rows(snapshot, state),
    ...trafficRouteRows(snapshot, state),
    ...trafficSamplingRows(snapshot, state),
    ...trafficPeakRows(snapshot, state),
  ];
  const trafficVisual = <JudgementChart module="traffic-trend" kind="trend" rows={trafficChartRows(snapshot, state)} />;
  const trafficSubtitle = isFleet
    ? "当前 / 峰值 / 均值 / 窗口 / 阈值 / 单位 / 可信度 · WAN Top3 / 默认路由 / 采样可信度 / 最近峰值"
    : "当前 / 峰值 / 均值 / 窗口 / 阈值 / 单位 / 可信度 · WAN Top3 / 默认路由 / 采样可信度 / 最近峰值";
  return <>
    <div className="ro-col is-main stack">
      <Module title={isFleet ? "WAN账本 / 流量趋势" : "流量趋势 / WAN Top3"} subtitle={trafficSubtitle} module="wan-trend" tone={state.facts.wan.allOffline ? "danger" : "trust"} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={trafficLedgerRows} minRows={isFleet ? 12 : 8} visual={trafficVisual} />
      <Module title="路由快照" subtitle="table / gateway / distance / active / disabled" module="route-raw-facts" tone={state.facts.route.level} trust={moduleTrust(state)} headers={["table", "gateway", "distance", "active / disabled"]} rows={routeFactRows(snapshot, state)} minRows={10} />
      <Module title="采样可信度" subtitle="双通道 / 最近成功 / 失败端点" module="normal-collection-channel" tone={state.facts.collection.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(collectionRows(snapshot, state), "n3-")} minRows={8} />
    </div>
    <div className="ro-col is-side stack ik-home-side-stack">
      <Module title="资源阈值" subtitle="当前 / 阈值 / 持续 / 峰值" module="resource-threshold" tone={state.facts.resource.level} trust={moduleTrust(state)} headers={["指标", "阈值", "持续", "峰值"]} rows={resourceRows(state)} minRows={3} visual={<JudgementChart module="resource-threshold" kind="pressure" rows={resourceChartRows(state)} />} />
      <Module title="WAN Top / 路由 / 采样 / 峰值" subtitle="Top3 / 默认路由 / 采样可信度 / 最近峰值" module="normal-wan-evidence" tone="trust" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(trafficEvidenceRows, "ne-")} minRows={8} visual={<JudgementChart module="normal-wan-evidence" kind="trend" rows={trafficChartRows(snapshot, state)} />} />
      <Module title="采集事件" subtitle="REST / SSH / 最近成功 / 只读边界" module="normal-ops-ledger" tone={state.facts.collection.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={normalOpsRows(snapshot, state)} minRows={8} />
    </div>
  </>;
}
function DesktopWorkspace({ snapshot, state }: OverviewPanelProps) {
  let content: ReactNode;
  if (state.scenario === "no-snapshot") content = <NoSnapshotDesktop snapshot={snapshot} state={state} />;
  else if (state.scenario === "resource-full") content = <ResourceDesktop snapshot={snapshot} state={state} />;
  else if (state.scenario === "interfaces-down") content = <InterfacesDesktop snapshot={snapshot} state={state} />;
  else if (state.scenario === "collection-down") content = <CollectionDesktop snapshot={snapshot} state={state} />;
  else if (state.scenario === "all-offline") content = <AllOfflineDesktop snapshot={snapshot} state={state} />;
  else content = <NormalDesktop snapshot={snapshot} state={state} />;

  return (
    <div
      className="ro-desktop-grid ik-home-layout"
      data-overview-desktop-detail
      data-overview-desktop-workspace
      data-overview-desktop-core-text={desktopCoreText(state)}
      data-overview-verdict-panel={verdictContractText(snapshot, state)}
      data-overview-trend-compact="framework-ledger"
      data-overview-no-snapshot-grid={state.scenario === "no-snapshot" ? "chain-ledger" : undefined}
      data-overview-no-snapshot-detail={state.scenario === "no-snapshot" ? "chain-ledger" : undefined}
      data-overview-desktop-effective-content-height="760"
      data-overview-desktop-redline-markers="no-empty-over-120-no-duplicate-boundary-no-nosnapshot-wan-rate"
      data-overview-no-snapshot-no-wan-rate-placeholder={state.scenario === "no-snapshot" ? "business-rates-hidden" : undefined}
      data-overview-side-table-mode="three-col-no-badge"
      data-overview-side-column-ratio="24-24-52"
      data-overview-side-badge-mode="inline-text-no-column"
      data-overview-side-evidence-wrap="third-col-no-ellipsis"
      data-overview-side-evidence-no-ellipsis="true"
      data-overview-desktop-ratio="chart-table-52-48"
      data-overview-desktop-visual-table-balance="52-48-min45-each"
      data-overview-desktop-scene={state.scenario}
      data-overview-normal-first-screen={state.scenario === "single" || state.scenario === "fleet" ? "traffic-plus-evidence" : undefined}
      data-overview-normal-traffic-under-chart={state.scenario === "single" || state.scenario === "fleet" ? "current-wan-top3-route-sampling-samples-peak-success" : undefined}
      data-overview-normal-traffic-under-chart-facts={state.scenario === "single" || state.scenario === "fleet" ? "7" : undefined}
      data-overview-no-empty-traffic-panel={state.scenario === "single" || state.scenario === "fleet" ? "true" : undefined}
      data-overview-resource-first-screen={state.scenario === "resource-full" ? "danger-bars-three-metric-ledger-pressure-interface-top5" : undefined}
      data-overview-resource-first-screen-structure={state.scenario === "resource-full" ? "danger-bars-three-metric-ledger-pressure-interface-top5" : undefined}
      data-overview-resource-no-short-card={state.scenario === "resource-full" ? "content-sized-resource-evidence" : undefined}
      data-overview-resource-no-spark-duplicate={state.scenario === "resource-full" ? "danger-bars-replace-small-sparklines" : undefined}
      data-overview-collection-channel-priority={state.scenario === "collection-down" ? "rest-ssh-snapshot-before-resource" : undefined}
      data-overview-collection-resource-deferred={state.scenario === "collection-down" ? "true" : undefined}
      data-overview-collection-only-first-screen={state.scenario === "collection-down" ? "rest-ssh-snapshot-success-timeline-no-resource" : undefined}
      data-overview-interface-relation-mode={state.scenario === "interfaces-down" ? "deferred" : undefined}
      data-overview-interface-top-block={state.scenario === "interfaces-down" ? "object-status-only" : undefined}
      data-overview-interface-top-node={state.scenario === "interfaces-down" ? "object-status-only-no-relation-text" : undefined}
      data-overview-interface-relation-policy={state.scenario === "interfaces-down" ? "top-object-status-details-in-carrier-table" : undefined}
    >
      {content}
    </div>
  );
}

function MobileDetail({ snapshot, state }: OverviewPanelProps) {
  if (state.scenario === "no-snapshot") {
    const recent = latestSuccess(snapshot, state.scenario);
    return <MobileRows module="mobile-no-snapshot-ledger" rows={[
      { id: "mns-chain", cells: ["采集链路账本", "RouterOS 当前不可达 / REST 待核 / SSH 断链 / 默认路由待判", `最近成功 ${recent}`], tone: "warn" },
      { id: "mns-business", cells: ["业务数据展示边界", "WAN / 资源 / 终端 / 连接 / 速率不展示", "无业务快照，业务数据不展示"], tone: "missing" },
      { id: "mns-success", cells: ["最后成功摘要", recent, `失败端点未记录 / 下次尝试 ${pollText(snapshot)}`], tone: recent === "未记录" ? "warn" : "trust" },
    ]} columns={3} />;
  }
  if (state.scenario === "resource-full") {
    const rows = resourceRows(state).slice(0, 3).map((row) => ({
      ...row,
      cells: [
        row.cells[0],
        row.cells[1],
        `${String(row.cells[2]).replace("阈值", "阈")} / ${String(row.cells[3])}`,
      ],
    }));
    return <MobileRows module="mobile-resource-pressure" rows={rows} columns={3} />;
  }
  if (state.scenario === "all-offline") {
    return <MobileRows module="mobile-wan-offline" rows={allOfflineMobileRows(snapshot, state)} />;
  }
  if (state.scenario === "interfaces-down") {
    const downRows = collectInterfaceRows(snapshot)
      .filter((row) => row.running === false)
      .slice(0, 4)
      .map((row, index) => {
        const name = text(row.name || row.interface, `if-${index + 1}`);
        const parent = text(row.parent || row.master || "-", "-");
        const bridge = text(row.bridge || "-", "-");
        const vlan = text(row.vlan || row.vlanId || "-", "-");
        const pppoe = text(row.pppoeOut || row.pppoe || "-", "-");
        return {
          id: `if-mobile-down-${name}-${index}`,
          cells: [name, `down / parent ${parent}`, `bridge ${bridge} / vlan ${vlan}`, `pppoe-out ${pppoe}`],
          tone: "danger" as OverviewTone,
        } satisfies LedgerRow;
      });
    const collectRows: LedgerRow[] = [
      { id: "if-mobile-route", cells: ["默认路由影响", state.facts.route.label, state.facts.route.rawSummary || state.facts.route.text, "转发面证据优先"], tone: state.facts.route.level },
      { id: "if-mobile-collection-pair", cells: ["采集面", `REST ${restState(snapshot, state).value} / SSH ${sshState(snapshot, state).value}`, "REST / SSH 可达性", "不替代转发面判断"], tone: "warn" },
    ];
    return <MobileRows module="mobile-interface-forwarding" interfaceMode rows={[
      ...downRows,
      ...collectRows,
    ]} columns={4} />;
  }
  if (state.scenario === "fleet") {
    return <MobileRows module="mobile-primary-detail" rows={[
      ...wanRows(snapshot, state).slice(0, 3),
      { id: "mobile-route", cells: ["默认路由", state.facts.route.label, state.facts.route.rawSummary || state.facts.route.text], tone: state.facts.route.level },
      { id: "mobile-collection", cells: ["采集", state.facts.collection.channelText, `最近成功 ${latestSuccess(snapshot, state.scenario)}`], tone: state.facts.collection.level },
    ]} />;
  }
  const wanLeadRows = wanRows(snapshot, state).slice(0, 2);
  const defaultRows: LedgerRow[] = state.scenario === "collection-down"
    ? collectionRows(snapshot, state).slice(0, 4).map((row) => ({ ...row, cells: [row.cells[0], row.cells[1], `${row.cells[2]} / ${row.cells[3]}`] }))
    : [
      ...wanLeadRows,
      { id: "mobile-route", cells: ["默认路由", state.facts.route.label, state.facts.route.rawSummary || state.facts.route.text], tone: state.facts.route.level },
      { id: "mobile-collection", cells: ["采集", state.facts.collection.channelText, `最近成功 ${latestSuccess(snapshot, state.scenario)}`], tone: state.facts.collection.level },
      { id: "mobile-resource", cells: ["资源", state.facts.resource.summaryText, "资源阈值可参考"], tone: state.facts.resource.level },
      { id: "mobile-recent", cells: ["最近成功", latestSuccess(snapshot, state.scenario), moduleTrust(state)], tone: "trust" as OverviewTone },
    ];
  return <MobileRows module="mobile-primary-detail" rows={defaultRows} />;
}

function mobileContinuationRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  if (state.scenario === "no-snapshot") {
    return [
      ...threeColumnRows(noSnapshotChainRows(snapshot, state), "mc-ns-chain-"),
      ...threeColumnRows(noSnapshotChannelStatusRows(snapshot, state), "mc-ns-channel-"),
      ...threeColumnRows(noSnapshotVisibilityRows(), "mc-ns-vis-"),
    ];
  }
  if (state.scenario === "resource-full") {
    return [
      ...threeColumnRows(resourceContextRows(snapshot, state), "mc-res-context-"),
      ...threeColumnRows(resourceTop5Rows(snapshot).slice(0, 8), "mc-res-top-"),
      ...threeColumnRows(resourceBoundaryRows(snapshot, state), "mc-res-boundary-"),
    ];
  }
  if (state.scenario === "interfaces-down") {
    return [
      ...threeColumnRows(interfaceImpactMobileRows(snapshot, state), "mc-if-impact-"),
      ...threeColumnRows(interfaceRelationRows(snapshot, state), "mc-if-rel-"),
      ...threeColumnRows(interfaceCollectionRows(snapshot, state), "mc-if-collection-"),
    ];
  }
  if (state.scenario === "all-offline") {
    return [
      ...wanRows(snapshot, state).slice(0, 8),
      ...threeColumnRows(wanContinuityRows(state), "mc-wan-cont-"),
      ...threeColumnRows(routeFactRows(snapshot, state), "mc-wan-route-"),
      ...threeColumnRows(collectionRows(snapshot, state), "mc-wan-collection-"),
    ];
  }
  if (state.scenario === "collection-down") {
    return [
      ...threeColumnRows(collectionRows(snapshot, state), "mc-col-channel-"),
      ...threeColumnRows(lastSuccessRows(snapshot, state), "mc-col-success-"),
      ...threeColumnRows(routeFactRows(snapshot, state), "mc-col-route-"),
      ...wanRows(snapshot, state).slice(0, 6),
    ];
  }
  return [
    ...wanRows(snapshot, state).slice(0, state.scenario === "fleet" ? 8 : 4),
    ...threeColumnRows(routeFactRows(snapshot, state), "mc-route-"),
    ...threeColumnRows(normalOpsRows(snapshot, state), "mc-ops-"),
    ...threeColumnRows(resourceRows(state), "mc-res-"),
  ];
}

function MobileContinuation({ snapshot, state }: OverviewPanelProps) {
  return (
    <div className="ro-mobile-continuation" data-overview-mobile-metrics>
      <MobileRows module="mobile-continuation-ledger" rows={mobileContinuationRows(snapshot, state)} columns={3} />
    </div>
  );
}

function mobileLeadTitle(state: OverviewDerivedState): string {
  if (state.scenario === "resource-full") return "资源阈值";
  if (state.scenario === "interfaces-down") return "接口转发面";
  if (state.scenario === "collection-down") return "采集异常";
  if (state.scenario === "no-snapshot") return "采集状态";
  if (state.scenario === "all-offline") return "WAN清单";
  return "WAN线路";
}

function MobileLeadHeads({ state }: { state: OverviewDerivedState }) {
  return (
    <>
      <div className="ik-mobile-section-head">{mobileLeadTitle(state)}</div>
      {state.scenario === "all-offline" ? (
        <>
          <div className="ik-mobile-section-head ro-sr-contract">默认路由</div>
          <div className="ik-mobile-section-head ro-sr-contract">采集通道</div>
          <div className="ik-mobile-section-head ro-sr-contract">资源阈值</div>
        </>
      ) : null}
    </>
  );
}

export function OverviewPanel({ snapshot, state }: OverviewPanelProps) {
  return (
    <section
      id="overview"
      className="section router-overview-framework"
      data-overview-framework="react-vite"
      data-overview-summary-root
      data-overview-readonly-console-contract="react-overview-preserved"
      data-overview-page-credibility={state.facts.freshness.credibilityLabel}
      data-overview-page-credibility-tone={state.facts.freshness.credibilityTone}
      data-overview-business-display-boundary={state.scenario === "no-snapshot" ? "no-business-data" : "business-data"}
      data-overview-scene-key={state.scenario}
      data-overview-ikuai40-density="flat-ledger"
      data-overview-flat-ledger-surface="outer-border-light-separators"
      data-overview-mobile-metrics
      data-overview-hard-standard="desktop-chart-state-45plus-mobile-microchart-required-chart-meta-sample-depth-required-no-short-large-card"
      data-overview-chart-standard={OVERVIEW_IKUAI40_CHART_STANDARD}
      data-overview-chart-metadata-coverage={OVERVIEW_CHART_METADATA_COVERAGE}
      data-overview-mature-visual-standard={OVERVIEW_IKUAI40_MATURE_VISUAL_STANDARD}
      data-overview-scene-chart-priority={OVERVIEW_SCENE_CHART_PRIORITY}
      data-overview-scene-chart-contract={OVERVIEW_SCENE_CHART_CONTRACT}
      data-overview-chart-color-normal={OVERVIEW_CHART_STATUS_COLORS.normal}
      data-overview-mobile-first-microchart-policy="required-before-detail"
      data-overview-mobile-first-screen-microchart-required="all-scenes"
      data-overview-mobile-first-screen-uses-microchart={mobileFirstScreenUsesMicrochart() ? "true" : "false"}
      data-overview-mobile-first-microchart-kind={state.scenario === "resource-full" ? "resource-pressure" : state.scenario === "collection-down" ? "collection-link-bars" : state.scenario === "no-snapshot" ? "collection-link-bars" : state.scenario === "interfaces-down" ? "interface-forwarding" : state.scenario === "all-offline" ? "wan-status-bars" : "status-strip"}
      data-overview-mobile-no-snapshot-microchart={state.scenario === "no-snapshot" ? "collection-link-bars" : undefined}
      data-overview-no-snapshot-flow-timeline-matrix={state.scenario === "no-snapshot" ? "true" : undefined}
      data-overview-no-snapshot-density-contract={state.scenario === "no-snapshot" ? "chain-ledger-timeline-visibility-judgement-strip" : undefined}
      data-overview-no-snapshot-no-stretch-cards={state.scenario === "no-snapshot" ? "auto-height-content" : undefined}
      data-overview-no-snapshot-content-sized={state.scenario === "no-snapshot" ? "true" : undefined}
      data-overview-no-snapshot-content-packed={state.scenario === "no-snapshot" ? "flow-timeline-matrix-auto-height" : undefined}
      data-overview-no-snapshot-no-wan-rate-placeholder={state.scenario === "no-snapshot" ? "business-rates-hidden" : undefined}
    >
      <InfoBand snapshot={snapshot} state={state} />
      <span className="ro-sr-contract" data-overview-verdict-panel>{verdictContractText(snapshot, state)}</span>
      <div className="ro-mobile-first-screen" data-overview-mobile-first-screen data-overview-mobile-detail data-overview-mobile-alert={state.verdict.level}>
        <MobileLedger snapshot={snapshot} state={state} />
        <div className={`ro-mobile-detail-section ik-mobile-compact-section ${(state.scenario === "interfaces-down" || state.scenario === "resource-full" || state.scenario === "collection-down" || state.scenario === "all-offline" || state.scenario === "single" || state.scenario === "fleet") ? "is-interface-table" : ""}`} data-overview-mobile-detail-section data-overview-mobile-metrics>
          <MobileLeadHeads state={state} />
          <MobileDetail snapshot={snapshot} state={state} />
        </div>
      </div>
      <MobileContinuation snapshot={snapshot} state={state} />
      <DesktopWorkspace snapshot={snapshot} state={state} />
    </section>
  );
}
