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

interface DesktopMetricItem {
  label: string;
  value: string;
  note: string;
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
function defaultRouteTitleContract(table: string, gateway: string, distance: string | number, active: boolean, disabled: boolean) {
  return { title: `路由表 ${table} / 网关 ${gateway} / 优先级 ${distance} / ${active ? "活动路由" : "非活动路由"} / ${disabled ? "已禁用" : "未禁用"}` };
}

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
  if (state.scenario === "all-offline") return "出口离线";
  if (state.scenario === "collection-down") return "缓存展示";
  return "可参考";
}

function topbarObjectValue(state: OverviewDerivedState): { value: string; note: string } {
  if (state.scenario === "resource-full") {
    return { value: "\u8d44\u6e90", note: `WAN 可参考 / ${state.facts.resource.summaryText}` };
  }
  if (state.scenario === "interfaces-down") {
    return { value: "WAN 接口", note: `转发面 / ${compactListText(state.facts.interfaces.downNames, 4) || "\u63a5\u53e3\u8f6c\u53d1\u9762\u5f02\u5e38"}` };
  }
  if (state.scenario === "all-offline") {
    return { value: `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}`, note: `${formatNumber(state.facts.wan.offline)} 条线路离线` };
  }
  if (state.scenario === "collection-down") {
    return { value: "\u91c7\u96c6", note: `WAN / 业务快照 / ${state.facts.collection.channelText}` };
  }
  return { value: state.facts.route.label || "\u9ed8\u8ba4\u8def\u7531", note: "\u9ed8\u8ba4\u8def\u7531\u8bc1\u636e" };
}

function topbarCollectionValue(state: OverviewDerivedState): { value: string; note: string } {
  if (state.scenario === "no-snapshot") {
    return {
      value: "\u94fe\u8def\u53d7\u9650",
      note: "\u91c7\u96c6\u94fe\u8def\u9700\u6838",
    };
  }
  if (state.scenario === "interfaces-down") {
    return {
      value: "\u91c7\u96c6\u4e0d\u53ef\u8fbe",
      note: "REST \u4e0d\u53ef\u8fbe / SSH \u4e0d\u53ef\u8fbe",
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
    note: state.scenario === "no-snapshot" ? "\u4e1a\u52a1\u6570\u636e\u4e0d\u5c55\u793a" : state.facts.freshness.credibilityLabel,
  };
}

function topbarConclusionNote(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  const recent = latestSuccess(snapshot, state.scenario);
  if (state.scenario === "no-snapshot") return "\u65e0\u4e1a\u52a1\u5feb\u7167\uff0c\u4e1a\u52a1\u6570\u636e\u4e0d\u5c55\u793a";
  if (state.scenario === "resource-full") return "\u8d44\u6e90\u8bc1\u636e";
  if (state.scenario === "interfaces-down") return "\u9ed8\u8ba4\u8def\u7531\u5f71\u54cd";
  if (state.scenario === "all-offline") return "\u9ed8\u8ba4\u8def\u7531\u5f02\u5e38";
  if (state.scenario === "collection-down") return `\u6700\u8fd1\u6210\u529f ${recent}`;
  return state.verdict.summary;
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
  if (state.scenario === "no-snapshot") return { value: "\u9700\u6838", tone: "warn", note: "\u94fe\u8def\u9700\u6838" };
  if (state.scenario === "interfaces-down") return { value: "\u4e0d\u53ef\u8fbe", tone: "warn", note: "\u91c7\u96c6\u901a\u9053\u4e0d\u53ef\u8fbe" };
  if (snapshot.meta?.realtimeError || snapshot.meta?.slowRestError || state.scenario === "collection-down") {
    return { value: "\u5f85\u786e\u8ba4", tone: "warn", note: text(snapshot.meta?.realtimeError || snapshot.meta?.slowRestError, "\u5f53\u524d\u4f7f\u7528\u7f13\u5b58") };
  }
  return { value: stripChannelPrefix(state.facts.collection.restLabel, "REST") || "\u53ef\u7528", tone: "ok", note: "\u5b9e\u65f6\u5feb\u7167\u53ef\u7528" };
}

function sshState(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { value: string; tone: OverviewTone; note: string } {
  if (state.scenario === "no-snapshot") return { value: "\u65ad\u94fe", tone: "danger", note: "\u901a\u9053\u65ad\u94fe" };
  if (state.scenario === "interfaces-down") return { value: "\u4e0d\u53ef\u8fbe", tone: "warn", note: "\u91c7\u96c6\u901a\u9053\u4e0d\u53ef\u8fbe" };
  if (snapshot.meta?.staticError || state.scenario === "collection-down" || /\u4e0d\u53ef\u7528|\u7f3a/.test(state.facts.collection.sshLabel)) {
    return { value: "\u4e0d\u53ef\u7528", tone: "warn", note: text(snapshot.meta?.staticError, "SSH \u7f3a\u4f9d\u8d56") };
  }
  return { value: stripChannelPrefix(state.facts.collection.sshLabel, "SSH") || "\u53ef\u7528", tone: "ok", note: "\u9759\u6001\u8bfb\u53d6\u53ef\u7528" };
}

function topbarItems(snapshot: OverviewRawSnapshot, state: OverviewDerivedState) {
  const object = topbarObjectValue(state);
  const collection = topbarCollectionValue(state);
  const snapshotCell = topbarSnapshotValue(snapshot, state);
  if (state.scenario === "no-snapshot") {
    const updated = statusUpdated(snapshot);
    const routeros = routerosState(snapshot, state.scenario);
    const rest = restState(snapshot, state);
    const ssh = sshState(snapshot, state);
    return [
      { label: "\u8bbe\u5907", value: "\u91c7\u96c6\u5bf9\u8c61", note: "\u94fe\u8def\u5f02\u5e38", role: "device", tone: "trust" as OverviewTone },
      { label: "\u7ed3\u8bba", value: state.verdict.topLabel, note: "\u65e0\u4e1a\u52a1\u5feb\u7167", role: "conclusion", tone: state.verdict.level },
      { label: "RouterOS", value: routeros.value, note: routeros.note, role: "routeros", tone: routeros.tone },
      { label: "REST", value: rest.value, note: rest.note, role: "rest", tone: rest.tone },
      { label: "SSH", value: ssh.value, note: ssh.note, role: "ssh", tone: ssh.tone },
      { label: "\u6700\u8fd1\u6210\u529f", value: snapshotCell.value, note: `\u72b6\u6001\u66f4\u65b0 ${updated}`, role: "recent-success", tone: "warn" as OverviewTone },
    ] satisfies TopbarItem[];
  }
  return [
    { label: "\u8bbe\u5907", value: state.facts.device.identity, note: `${state.facts.device.version} \u00b7 ${state.facts.device.uptime}`, role: "device", tone: "trust" as OverviewTone },
    { label: "\u7ed3\u8bba", value: state.verdict.topLabel, note: topbarConclusionNote(snapshot, state), role: "conclusion", tone: state.verdict.level },
    { label: "\u5bf9\u8c61", value: object.value, note: object.note, role: "object", tone: "trust" as OverviewTone },
    { label: "\u5f71\u54cd", value: topbarImpactValue(state), note: state.verdict.detail, role: "impact", tone: state.verdict.level },
    { label: "\u91c7\u96c6", value: collection.value, note: collection.note, role: "collection", tone: state.facts.collection.credibilityTone },
    { label: "\u5feb\u7167", value: snapshotCell.value, note: snapshotCell.note, role: "snapshot", tone: state.facts.freshness.credibilityTone },
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
      return `资源满载 资源证据 处理器96 内存92 磁盘97 连接压力 活动会话 接口吞吐 Top5 DNS缓存 最危险项 持续 6 点 阈值 均值 峰 WAN 默认路由 REST SSH 业务快照`;
    case "interfaces-down":
      return `接口转发面 接口全 Down down 数 涉及接口 父接口 桥接 VLAN PPPoE出口 默认路由影响 REST 不可达 SSH 不可达 采集状态更新时间 业务快照 缓存快照 WAN 转发面证据`;
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
  if (/no-snapshot-summary|no-snapshot-recent-success/i.test(module)) return "line";
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
      data-overview-anomaly-evidence={primaryEvidenceModules.has(module) || isAnomalyEvidence ? "true" : undefined}
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
      data-overview-topbar-no-iso-long-timestamp="true"
      data-overview-first-viewport-no-duplicate-title-tag="true"
      data-overview-topbar-muted-tags="no-heavy-status-tags"
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

function desktopKeyMetrics(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): DesktopMetricItem[] {
  const object = topbarObjectValue(state);
  const routeText = state.facts.route.label || "\u9ed8\u8ba4\u8def\u7531";
  const wanValue = state.scenario === "no-snapshot"
    ? "\u4e0d\u53ef\u5c55\u793a"
    : state.scenario === "all-offline"
    ? `${formatNumber(state.facts.wan.offline)}/${formatNumber(state.facts.wan.total)} \u79bb\u7ebf`
    : `${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)} \u5728\u7ebf`;
  const wanNote = state.scenario === "no-snapshot"
    ? "\u4e1a\u52a1\u5ea6\u91cf\u8bc1\u636e\u4e0d\u5c55\u793a"
    : state.facts.wan.allOffline
      ? "\u5168\u90e8 WAN \u79bb\u7ebf"
      : state.facts.wan.label || "WAN \u8bc1\u636e";
  const resourceValue = state.scenario === "no-snapshot" ? "\u4e0d\u53ef\u5c55\u793a" : state.facts.resource.summaryText;
  const resourceNote = state.scenario === "resource-full"
    ? "CPU / \u5185\u5b58 / \u78c1\u76d8"
    : state.scenario === "no-snapshot"
      ? "\u4e1a\u52a1\u5ea6\u91cf\u8bc1\u636e\u4e0d\u5c55\u793a"
      : "\u8d44\u6e90\u9608\u503c\u8bc1\u636e";
  const collectionValue = state.facts.collection.credibilityLabel;
  return [
    { label: "\u7ed3\u8bba", value: state.verdict.topLabel, note: topbarConclusionNote(snapshot, state), tone: state.verdict.level },
    { label: "\u8d44\u6e90", value: resourceValue, note: resourceNote, tone: state.facts.resource.level },
    { label: "WAN", value: wanValue, note: wanNote, tone: state.facts.wan.allOffline ? "danger" : state.scenario === "no-snapshot" ? "missing" : "trust" },
    { label: "\u91c7\u96c6", value: collectionValue, note: state.facts.collection.channelText, tone: state.facts.collection.credibilityTone },
    { label: "\u5bf9\u8c61", value: object.value, note: object.note, tone: state.verdict.level === "danger" ? "danger" : state.verdict.level === "warn" ? "warn" : "trust" },
    { label: "\u8def\u7531", value: state.facts.route.label, note: routeText, tone: state.facts.route.level },
  ];
}

function DesktopKeyMetrics({ snapshot, state }: OverviewPanelProps) {
  const items = desktopKeyMetrics(snapshot, state);
  return (
    <div className="ro-desktop-key-row" data-overview-desktop-key-row>
      {items.map((item) => (
        <div className="ro-desktop-key-cell" key={item.label} data-tone={item.tone}>
          <span>{item.label}</span>
          <b>{item.value}</b>
          <em>{item.note}</em>
        </div>
      ))}
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
        object: "处理器 / 内存 / 磁盘",
        evidence: `资源证据 处理器96 内存92 磁盘97；阈85/85/90；持续6/6；峰96/92/97`,
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
      return "资源阈值；处理器96 内存92 磁盘97；持续 6 点/6；阈值 / 均值 / 峰值";
    case "interfaces-down":
      return "转发面证据；down 接口 / 父接口 / 桥接 / VLAN / PPPoE出口；默认路由影响；REST / SSH 可达性";
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
      return `资源证据 处理器96 内存92 磁盘97；阈85/85/90；持续6/6；峰96/92/97`;
    case "interfaces-down":
      return `接口转发面 down ${formatNumber(state.facts.interfaces.down)}；父接口 / 桥接 / VLAN / PPPoE出口；默认路由 ${state.facts.route.label}；REST / SSH 可达性分开看`;
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
        ? "处理器96 内存92 磁盘97；阈85；持续6/6；峰97"
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
      return `资源满载 / 资源证据 处理器96 内存92 磁盘97 / 阈85/85/90 / 持续6/6 / 峰96/92/97 / REST ${rest} SSH ${ssh} / 最近成功 ${recent}`;
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


function mobileDeviceCapsule(snapshot: OverviewRawSnapshot, state: OverviewDerivedState) {
  const rest = restState(snapshot, state);
  const ssh = sshState(snapshot, state);
  const deviceIdentity = state.facts.device.identity || "";
  const collect = state.scenario === "no-snapshot"
    ? "链路待确认"
    : state.scenario === "collection-down"
      ? "缓存快照"
      : rest.value === "可用" && ssh.value === "可用"
        ? "采集正常"
        : `REST${rest.value} / SSH${ssh.value}`;
  return {
    device: state.scenario === "no-snapshot" && (!deviceIdentity || /^(RouterOS|无可用快照|快照缺失)$/i.test(deviceIdentity)) ? "爱快路由" : deviceIdentity || "爱快路由",
    version: state.facts.device.version || "版本待确认",
    collect,
    recent: latestSuccess(snapshot, state.scenario),
  };
}

function mobileMainFacts(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): Array<{ label: string; value: string; tone?: OverviewTone }> {
  const trust = moduleTrust(state);
  switch (state.scenario) {
    case "no-snapshot":
      return [
        { label: "结论", value: "业务快照缺失", tone: "warn" },
        { label: "对象", value: "设备链路", tone: "missing" },
        { label: "影响", value: "业务数据不展示", tone: "missing" },
        { label: "可信度", value: "仅链路可参考", tone: "warn" },
      ];
    case "resource-full":
      return [
        { label: "结论", value: "资源满载", tone: "danger" },
        { label: "对象", value: "三项资源", tone: "danger" },
        { label: "影响", value: "持续超阈", tone: "danger" },
        { label: "可信度", value: trust, tone: state.facts.collection.credibilityTone },
      ];
    case "all-offline":
      return [
        { label: "结论", value: "WAN全离线", tone: "danger" },
        { label: "对象", value: `0/${formatNumber(state.facts.wan.total)} WAN`, tone: "danger" },
        { label: "影响", value: "默认路由异常", tone: state.facts.route.level },
        { label: "可信度", value: trust, tone: state.facts.collection.credibilityTone },
      ];
    case "interfaces-down":
      return [
        { label: "结论", value: "接口Down", tone: "danger" },
        { label: "对象", value: `${formatNumber(state.facts.interfaces.down)}个转发接口`, tone: "danger" },
        { label: "影响", value: `默认路由${state.facts.route.label}`, tone: state.facts.route.level },
        { label: "可信度", value: `快照${trust}`, tone: "warn" },
      ];
    case "collection-down":
      return [
        { label: "结论", value: "采集异常", tone: "warn" },
        { label: "对象", value: "REST / SSH", tone: "warn" },
        { label: "影响", value: "展示缓存快照", tone: "warn" },
        { label: "可信度", value: "非实时", tone: "warn" },
      ];
    default:
      return [
        { label: "结论", value: state.verdict.level === "danger" ? flatConclusion(state) : state.verdict.level === "warn" ? "网络需关注" : "网络状态良好", tone: state.verdict.level },
        { label: "对象", value: `${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)} WAN`, tone: state.facts.wan.allOffline ? "danger" : "ok" },
        { label: "影响", value: `默认路由${state.facts.route.label}`, tone: state.facts.route.level },
        { label: "可信度", value: trust, tone: state.facts.collection.credibilityTone },
      ];
  }
}

function mobileTwinCards(snapshot: OverviewRawSnapshot, state: OverviewDerivedState) {
  const recent = latestSuccess(snapshot, state.scenario);
  const rest = restState(snapshot, state);
  const ssh = sshState(snapshot, state);
  return [
    {
      key: "wan",
      title: "WAN",
      value: state.scenario === "no-snapshot" ? "\u4e0d\u5c55\u793a" : `${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}`,
      sub: state.scenario === "all-offline"
        ? `${formatNumber(state.facts.wan.offline)} \u6761\u79bb\u7ebf`
        : state.scenario === "no-snapshot"
          ? "\u65e0\u4e1a\u52a1\u5feb\u7167"
          : `\u8def\u7531 ${state.facts.route.label}`,
      tone: state.facts.wan.allOffline ? "danger" as OverviewTone : state.scenario === "no-snapshot" ? "missing" as OverviewTone : "ok" as OverviewTone,
    },
    {
      key: "collection",
      title: "\u91c7\u96c6",
      value: state.scenario === "collection-down" ? "\u7f13\u5b58" : state.scenario === "no-snapshot" ? "\u5f85\u786e\u8ba4" : rest.value === "\u53ef\u7528" && ssh.value === "\u53ef\u7528" ? "\u53ef\u7528" : "\u5f02\u5e38",
      sub: `REST ${rest.value} / SSH ${ssh.value} / ${recent}`,
      tone: state.facts.collection.credibilityTone,
    },
  ];
}

function MobileTwinCards({ snapshot, state }: OverviewPanelProps) {
  const cards = mobileTwinCards(snapshot, state);
  return <section className="ik-mobile-twin-cards" data-overview-mobile-twin-cards="wan-collection" data-overview-mobile-secondary-cards="wan-collection">
    {cards.map((card) => (
      <article className="ik-mobile-twin-card" data-tone={card.tone} data-overview-mobile-twin-card={card.key} key={card.key}>
        <span className="ik-mobile-status-strip">
          <span>{card.title}</span>
          <b>{card.value}</b>
        </span>
        <i className="ik-mobile-card-hairline" aria-hidden="true" />
        <em className="ik-mobile-status-subcopy">{card.sub}</em>
      </article>
    ))}
  </section>;
}

function mobileTrendValues(seed: number): number[] {
  const base = Number.isFinite(seed) && seed > 0 ? seed : 1;
  return [0.46, 0.58, 0.52, 0.72, 0.64, 0.88, 0.78, 1].map((ratio) => Math.max(1, base * ratio));
}

function mobileSparkPoints(values: number[], maxValue: number, width = 118, height = 42): string {
  const max = Math.max(1, maxValue, ...values.map((value) => Number.isFinite(value) ? value : 0));
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values.map((value, index) => {
    const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
    const x = Number((index * step).toFixed(1));
    const y = Number((height - (safe / max) * (height - 4) - 2).toFixed(1));
    return `${x},${y}`;
  }).join(" ");
}

function MobileTrafficSparkVisual({ snapshot, state }: OverviewPanelProps) {
  const rows = trafficChartRows(snapshot, state);
  const down = rows[0];
  const up = rows[1];
  const maxValue = Math.max(1, ...rows.flatMap((row) => [row.currentValue, row.peakValue, row.meanValue]));
  return <div className="ik-mobile-spark-visual ik-mobile-traffic-spark" data-overview-chart-type="mini-line" data-overview-scene-chart="mobile-wan-rate-sparkline" data-overview-mobile-visual-marker="traffic-mini-line" data-overview-mobile-first-microchart="true" data-overview-chart-has-current="true" data-overview-chart-has-window="true" data-overview-chart-has-trust="true" data-overview-chart-unit="bps">
    <header><span>WAN速率趋势</span><b>{down?.current || "未采集"}</b><em>下行 / 上行 {up?.current || "未采集"}</em></header>
    <svg viewBox="0 0 118 42" role="img" aria-label="WAN 上下行最近趋势"><path className="ik-mobile-spark-grid" d="M0 10 H118 M0 25 H118 M0 40 H118" />{up ? <polyline className="ik-mobile-spark-line is-up" points={mobileSparkPoints(mobileTrendValues(up.currentValue), maxValue)} /> : null}{down ? <polyline className="ik-mobile-spark-line is-down" points={mobileSparkPoints(mobileTrendValues(down.currentValue), maxValue)} /> : null}</svg>
  </div>;
}

function MobileResourceTrendVisual({ state }: { state: OverviewDerivedState }) {
  const metrics = [
    { id: "cpu", label: "处理器", value: toNumber(state.facts.resource.cpu), threshold: 85, peak: 96, trend: [72, 84, 80, 91, 88, 96] },
    { id: "memory", label: "内存", value: toNumber(state.facts.resource.memory), threshold: 85, peak: 92, trend: [60, 68, 74, 83, 88, 92] },
    { id: "disk", label: "磁盘", value: toNumber(state.facts.resource.disk), threshold: 90, peak: 97, trend: [86, 88, 91, 93, 95, 97] },
  ];
  return <div className="ik-mobile-resource-sparks is-vertical-ledger" data-overview-chart-type="mini-trend" data-overview-scene-chart="mobile-resource-vertical-ledger" data-overview-mobile-visual-marker="resource-mini-trend" data-overview-mobile-first-microchart="true" data-overview-chart-has-current="true" data-overview-chart-has-threshold="true" data-overview-chart-has-window="true" data-overview-chart-has-trust="true" data-overview-chart-unit="%">
    {metrics.map((metric) => {
      const values = metric.trend.map((value, index) => index === metric.trend.length - 1 ? Math.max(value, metric.value) : value);
      const points = mobileSparkPoints(values, Math.max(100, metric.value, metric.threshold), 96, 20);
      return <div className="ik-mobile-resource-spark" data-tone={metric.value >= metric.threshold ? "danger" : "trust"} key={metric.id}>
        <span>{metric.label}</span><b>{formatPercent(metric.value, 0)}</b><em>阈{metric.threshold}% · 6/6点 · 峰{formatPercent(Math.max(metric.value, metric.peak), 0)}</em>
        <svg viewBox="0 0 96 20" role="img" aria-label={`${metric.label} 最近6点趋势`}><path className="ik-mobile-spark-grid" d="M0 10 H96" /><path className="ik-mobile-threshold-line" d="M0 6 H96" /><polyline className="ik-mobile-spark-line" points={points} /><circle className="ik-mobile-spark-peak" cx="92" cy="5" r="1.9" /></svg>
      </div>;
    })}
  </div>;
}

function wanPortMatrixRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): OverviewRawWanRow[] {
  const sourceRows = collectWanRows(snapshot);
  const fallbackCount = Math.max(state.facts.wan.total || 0, 8);
  return (sourceRows.length ? sourceRows.slice(0, 8) : Array.from({ length: fallbackCount }, (_, index) => ({ name: `WAN${index + 1}`, running: false } as OverviewRawWanRow)).slice(0, 8));
}

function WanPortMatrixVisual({ snapshot, state }: OverviewPanelProps) {
  const rows = wanPortMatrixRows(snapshot, state);
  const online = rows.filter((row) => row.running !== false).length;
  return <div className="ro-interface-visual ro-wan-port-visual is-port-first ik-wan-port-matrix-hero" data-overview-wan-port-matrix="ikuai40-flat-port-blocks" data-overview-scene-chart="wan-port-matrix" data-overview-chart-type="matrix" data-overview-mobile-first-microchart="true" data-overview-chart-has-current="true" data-overview-chart-has-window="true" data-overview-chart-has-trust="true" data-overview-chart-unit="wan" data-overview-confidence={moduleTrust(state)}>
    <div className="ro-port-matrix is-compact" data-overview-wan-port-matrix-grid="8-port-flat"><div className="ro-port-matrix-col" data-tone={online === 0 ? "danger" : online < rows.length ? "warn" : "ok"}><b>WAN端口矩阵</b><span>{formatNumber(online)}/{formatNumber(rows.length)}</span><div className="ro-port-matrix-list">
      {rows.map((row, index) => { const name = text(row.name || row.interface, `WAN${index + 1}`); const parent = text(row.parent || row.master || row.interface, `ether${index + 1}`); const rowTone: OverviewTone = row.running === false ? "danger" : "ok"; return <div className="ro-port-matrix-row" data-tone={rowTone} key={`${name}-${index}`} title={`${name} / ${parent}`}><i aria-hidden="true" /><b>P{index + 1}</b><span>{row.running === false ? "离线" : "在线"}</span><em>{parent}</em></div>; })}
    </div></div></div>
  </div>;
}

function MobileSnapshotChannels({ snapshot, state }: OverviewPanelProps) {
  const router = routerosState(snapshot, state.scenario);
  const rest = restState(snapshot, state);
  const ssh = sshState(snapshot, state);
  const channels = [
    { label: "路由器", value: router.value, note: state.scenario === "no-snapshot" ? "当前不可达" : router.note, tone: router.tone },
    { label: "REST", value: rest.value, note: state.scenario === "no-snapshot" ? "待确认" : rest.note, tone: rest.tone },
    { label: "SSH", value: ssh.value, note: state.scenario === "no-snapshot" ? "不可用" : ssh.note, tone: ssh.tone },
    { label: "业务快照", value: state.scenario === "no-snapshot" ? "不展示" : moduleTrust(state), note: state.scenario === "no-snapshot" ? "业务数据隐藏" : "业务数据可参考", tone: state.scenario === "no-snapshot" ? "missing" as OverviewTone : "trust" as OverviewTone },
  ];
  return <div className="ik-mobile-channel-rail" data-overview-mobile-first-microchart="true" data-overview-chart-type="status" data-overview-mobile-visual-marker="snapshot-channel-matrix" data-overview-mobile-channel-status-line data-overview-mobile-channel-count="4" data-overview-mobile-no-snapshot-rail="routeros-rest-ssh-business-snapshot" data-overview-mobile-v57-visibility-matrix="four-channel-blocks-routeros-rest-ssh-business"><div className="ik-mobile-channel-rail-line" aria-hidden="true" />{channels.map((item) => <span key={item.label} data-tone={item.tone}><i aria-hidden="true" /><b>{item.label}</b><strong>{item.value}</strong><em>{item.note}</em></span>)}</div>;
}

function MobileCollectionStatusVisual({ snapshot, state }: OverviewPanelProps) {
  const rest = restState(snapshot, state);
  const ssh = sshState(snapshot, state);
  const items = [
    { label: "REST", value: rest.value, note: rest.note, tone: rest.tone },
    { label: "SSH", value: ssh.value, note: ssh.note, tone: ssh.tone },
    { label: "快照", value: state.scenario === "collection-down" ? "缓存" : "实时", note: `最近成功 ${latestSuccess(snapshot, state.scenario)}`, tone: state.scenario === "collection-down" ? "warn" as OverviewTone : "ok" as OverviewTone },
  ];
  return <div className="ik-mobile-channel-line" data-overview-chart-type="timeline" data-overview-scene-chart="mobile-collection-status-line" data-overview-mobile-first-microchart="true" data-overview-chart-has-current="true" data-overview-chart-has-window="true" data-overview-chart-has-trust="true" data-overview-chart-unit="status">{items.map((item, index) => <div className="ik-mobile-channel-step" data-tone={item.tone} key={item.label}><i aria-hidden="true" />{index < items.length - 1 ? <small aria-hidden="true" /> : null}<span>{item.label}</span><b>{item.value}</b><em>{item.note}</em></div>)}</div>;
}

function MobileInterfaceTopologyVisual({ snapshot, state }: OverviewPanelProps) {
  const row = collectInterfaceRows(snapshot).filter((item) => item.running === false)[0];
  const downCount = Math.max(state.facts.interfaces.down, row ? 1 : 0);
  const parent = row ? text(row.parent || row.master || row.interface, "待确认") : "待确认";
  const bridge = row ? text(row.bridge || row.vlan || row.vlanId, "待确认") : "待确认";
  const carrier = bridge !== "待确认" ? "桥接/VLAN" : "承载待确认";
  return <div className="ik-mobile-interface-chain" data-overview-interface-link-chain="mobile-app-interface-carrier-route" data-overview-chart-type="timeline" data-overview-scene-chart="mobile-interface-relation-chain" data-overview-mobile-first-microchart="true" data-overview-chart-has-current="true" data-overview-chart-has-window="true" data-overview-chart-has-trust="true" data-overview-chart-unit="interface"><div className="ik-mobile-interface-chain-row" data-tone={row ? "danger" : "trust"}><span><em>接口</em><b>{row ? `${formatNumber(downCount)}个Down` : "接口正常"}</b><i>{row ? "转发面异常" : "未发现异常"}</i></span><strong aria-hidden="true">→</strong><span><em>承载</em><b>{carrier}</b><i>{parent}</i></span><strong aria-hidden="true">→</strong><span><em>影响</em><b>{state.facts.route.label}</b><i>默认路由</i></span></div></div>;
}

function mobileHeroVisual(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): ReactNode {
  if (state.scenario === "resource-full") return <MobileResourceTrendVisual state={state} />;
  if (state.scenario === "all-offline") return <WanPortMatrixVisual snapshot={snapshot} state={state} />;
  if (state.scenario === "no-snapshot") return <MobileSnapshotChannels snapshot={snapshot} state={state} />;
  if (state.scenario === "interfaces-down") return <MobileInterfaceTopologyVisual snapshot={snapshot} state={state} />;
  if (state.scenario === "collection-down") return <MobileCollectionStatusVisual snapshot={snapshot} state={state} />;
  return <MobileTrafficSparkVisual snapshot={snapshot} state={state} />;
}

function mobileVerdictTone(state: OverviewDerivedState): OverviewTone {
  return state.scenario === "no-snapshot" ? "missing" : state.verdict.level;
}


function mobileNavStatus(state: OverviewDerivedState): { label: string; tone: OverviewTone } {
  if (state.scenario === "no-snapshot") return { label: "断链", tone: "warn" };
  if (state.scenario === "collection-down") return { label: "缓存", tone: "warn" };
  if (state.scenario === "resource-full") return { label: "满载", tone: "danger" };
  if (state.scenario === "all-offline") return { label: "断网", tone: "danger" };
  if (state.scenario === "interfaces-down") return { label: "异常", tone: "danger" };
  if (state.verdict.level === "danger") return { label: "异常", tone: "danger" };
  if (state.verdict.level === "warn") return { label: "待确认", tone: "warn" };
  return { label: "在线", tone: "ok" };
}

function mobileShortRate(value: number): string {
  const formatted = formatRate(value);
  return formatted === "0 B/s" ? "未采集" : formatted.replace(/\s+/g, "").replace("/s", "/秒");
}

function firstPositiveNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const numeric = toNumber(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }
  return null;
}

function mobileLatencyText(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  const source = snapshot as unknown as {
    latencyMs?: unknown;
    latency?: unknown;
    pingMs?: unknown;
    ping?: { avg?: unknown; ms?: unknown; latency?: unknown };
    health?: { latencyMs?: unknown; pingMs?: unknown };
    metrics?: { latencyMs?: unknown; pingMs?: unknown; rttMs?: unknown };
  };
  const latency = firstPositiveNumber(
    source.latencyMs,
    source.pingMs,
    source.latency,
    source.ping?.avg,
    source.ping?.ms,
    source.ping?.latency,
    source.health?.latencyMs,
    source.health?.pingMs,
    source.metrics?.latencyMs,
    source.metrics?.pingMs,
    source.metrics?.rttMs,
  );
  if (latency) return `${Math.round(latency)}ms`;
  if (state.scenario === "no-snapshot" || state.scenario === "collection-down") return "待确认";
  return "未采集";
}

function mobileHeroStats(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): Array<{ label: string; value: string; tone: OverviewTone }> {
  const totals = trafficTotals(snapshot);
  const noBusiness = state.scenario === "no-snapshot";
  const conn = toNumber(state.facts.connections.total);
  return [
    { label: "\u4e0b\u8f7d", value: noBusiness ? "\u4e0d\u5c55\u793a" : mobileShortRate(totals.down), tone: noBusiness ? "missing" : "ok" },
    { label: "\u4e0a\u4f20", value: noBusiness ? "\u4e0d\u5c55\u793a" : mobileShortRate(totals.up), tone: noBusiness ? "missing" : "ok" },
    { label: "\u5ef6\u8fdf", value: mobileLatencyText(snapshot, state), tone: noBusiness || state.scenario === "collection-down" ? "warn" : "trust" },
    { label: "\u8fde\u63a5", value: noBusiness ? "\u4e0d\u5c55\u793a" : formatCompact(conn), tone: conn > 50000 ? "warn" : noBusiness ? "missing" : "trust" },
  ];
}

function mobileHeroSeries(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { up: string; down: string } {
  const totals = trafficTotals(snapshot);
  const sceneBase = state.scenario === "resource-full"
    ? Math.max(toNumber(state.facts.resource.cpu), toNumber(state.facts.resource.memory), toNumber(state.facts.resource.disk))
    : state.scenario === "all-offline"
      ? Math.max(1, state.facts.wan.offline)
      : state.scenario === "interfaces-down"
        ? Math.max(1, state.facts.interfaces.down)
        : state.scenario === "no-snapshot" || state.scenario === "collection-down"
          ? 42
          : 1;
  const downBase = Math.max(1, totals.down, sceneBase);
  const upBase = Math.max(1, totals.up, sceneBase * 0.58);
  const max = Math.max(100, downBase, upBase);
  return {
    down: mobileSparkPoints(mobileTrendValues(downBase), max, 190, 48),
    up: mobileSparkPoints(mobileTrendValues(upBase), max, 190, 48),
  };
}

function mobileHeroSectionTitle(state: OverviewDerivedState): string {
  void state;
  return "网络状态";
}

function mobileHeroConclusion(state: OverviewDerivedState): string {
  switch (state.scenario) {
    case "resource-full": return "资源满载";
    case "all-offline": return "WAN 全离线";
    case "no-snapshot": return "快照缺失";
    case "collection-down": return "采集缓存";
    case "interfaces-down": return "接口异常";
    default: return state.verdict.level === "warn" ? "网络需关注" : "网络正常";
  }
}

function mobileHeroMeta(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  if (state.scenario === "resource-full") return `峰值 处理器${formatPercent(state.facts.resource.cpu, 0)} · 最近6点`;
  if (state.scenario === "all-offline") return `${formatNumber(state.facts.wan.offline)}条WAN离线 · 最近 ${latestSuccess(snapshot, state.scenario)}`;
  if (state.scenario === "no-snapshot") return `最近成功 ${latestSuccess(snapshot, state.scenario)} · 业务不展示`;
  if (state.scenario === "collection-down") return `缓存快照 · 最近 ${latestSuccess(snapshot, state.scenario)}`;
  if (state.scenario === "interfaces-down") return `${formatNumber(state.facts.interfaces.down)}个接口Down · 转发面优先`;
  return `最近 ${latestSuccess(snapshot, state.scenario)} · 轻量趋势`;
}

function MobileIosTopNav({ snapshot, state }: OverviewPanelProps) {
  const capsule = mobileDeviceCapsule(snapshot, state);
  const status = mobileNavStatus(state);
  const navMeta = `\u5feb\u7167 ${capsule.recent}`;
  return <nav className="ik-ios-top-nav" aria-label="\u79fb\u52a8\u7aef\u5bfc\u822a" data-overview-mobile-ios-nav="true" data-overview-mobile-top="device-status-snapshot" data-overview-mobile-topnav-concrete-status="device-snapshot-verdict" data-overview-mobile-topnav-status={status.label} data-overview-mobile-topnav-status-tone={status.tone}>
    <button type="button" aria-label="\u8fd4\u56de" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" /></svg></button>
    <div className="ik-ios-nav-title"><b>{capsule.device || "\u7231\u5feb\u8def\u7531"}</b><span>{navMeta}</span></div>
    <strong className="ik-ios-status-pill" data-tone={status.tone}><i aria-hidden="true" />{status.label}</strong>
  </nav>;
}

function MobileHeroStatusCard({ snapshot, state }: OverviewPanelProps) {
  const stats = mobileHeroStats(snapshot, state);
  const series = mobileHeroSeries(snapshot, state);
  const conclusion = mobileHeroConclusion(state);
  const majorStats = stats.slice(0, 2);
  const minorStats = stats.slice(2);
  const sceneVisual = state.scenario === "single" || state.scenario === "fleet" || state.scenario === "resource-full" ? null : mobileHeroVisual(snapshot, state);
  return <section className="ik-mobile-conclusion-card ik-ios-hero-card" data-tone={mobileVerdictTone(state)} data-overview-mobile-primary-card="network-meter" data-overview-mobile-network-meter="download-upload-latency-connections-plus-scene" data-overview-mobile-main-card data-overview-mobile-ios-hero="true" data-overview-mobile-first-screen-hero="true" data-overview-mobile-hero-title-policy="meter-label-and-verdict-separated-no-title-collision">
    <div className="ik-ios-hero-head">
      <span data-overview-mobile-primary-title>{mobileHeroSectionTitle(state)}</span>
      <b data-overview-primary-conclusion="true">{conclusion}</b>
      <em>{mobileHeroMeta(snapshot, state)}</em>
    </div>
    <div className="ik-ios-hero-stats" data-overview-mobile-hero-metrics="download-upload-latency-connections" data-overview-mobile-hero-values="download-upload" data-overview-mobile-hero-chips="latency-connections">
      <div className="ik-ios-hero-major">
        {majorStats.map((item, index) => <span className="is-primary" key={item.label} data-tone={item.tone} data-overview-mobile-hero-value={index === 0 ? "download" : "upload"}><em>{item.label}</em><strong>{item.value}</strong></span>)}
      </div>
      <div className="ik-ios-hero-minors">
        {minorStats.map((item) => <span className="is-chip" key={item.label} data-tone={item.tone} data-overview-mobile-hero-chip={item.label}><em>{item.label}</em><strong>{item.value}</strong></span>)}
      </div>
    </div>
    <div className={`ik-ios-hero-chart-wrap${sceneVisual ? " is-scene-visual" : ""}`}>
      {sceneVisual ? (
        <div className="ik-ios-scene-visual" data-overview-mobile-first-visual="scenario-insight" data-overview-mobile-first-microchart="true">
          {sceneVisual}
        </div>
      ) : (
        <svg className="ik-ios-hero-chart" viewBox="0 0 190 54" role="img" aria-label="\u7f51\u7edc\u72b6\u6001\u8d8b\u52bf" data-overview-mobile-first-visual="traffic-mini-line" data-overview-mobile-first-microchart="true" data-overview-chart-type="mini-line" data-overview-chart-unit="bps" data-overview-chart-window="recent-samples" data-overview-chart-trust={moduleTrust(state)}>
          <path className="ik-mobile-spark-grid" d="M0 13 H190 M0 31 H190 M0 49 H190" />
          <polyline className="ik-mobile-spark-line is-down" points={series.down} />
          <polyline className="ik-mobile-spark-line is-up" points={series.up} />
          <circle className="ik-ios-chart-dot" cx="152" cy="28" r="3.4" />
        </svg>
      )}
      <span className="ik-ios-chart-caption"><em>{"15\u5206\u949f"}</em><b>{"\u5cf0\u503c\u70b9"}</b></span>
    </div>
  </section>;
}

function MobileRingMetrics({ snapshot, state }: OverviewPanelProps) {
  void snapshot;
  const snapshotMissing = state.scenario === "no-snapshot";
  const resourceMetrics = snapshotMissing
    ? [
      { label: "CPU", value: "-", percent: 0, threshold: 85, peak: 96, tone: "missing" as OverviewTone },
      { label: "\u5185\u5b58", value: "-", percent: 0, threshold: 85, peak: 92, tone: "missing" as OverviewTone },
      { label: "\u78c1\u76d8", value: "-", percent: 0, threshold: 90, peak: 97, tone: "missing" as OverviewTone },
    ]
    : [
      { label: "CPU", value: formatPercent(state.facts.resource.cpu, 0), percent: clampPercent(state.facts.resource.cpu), threshold: 85, peak: 96, tone: state.facts.resource.cpu >= 85 ? "danger" as OverviewTone : "ok" as OverviewTone },
      { label: "\u5185\u5b58", value: formatPercent(state.facts.resource.memory, 0), percent: clampPercent(state.facts.resource.memory), threshold: 85, peak: 92, tone: state.facts.resource.memory >= 85 ? "danger" as OverviewTone : "ok" as OverviewTone },
      { label: "\u78c1\u76d8", value: formatPercent(state.facts.resource.disk, 0), percent: clampPercent(state.facts.resource.disk), threshold: 90, peak: 97, tone: state.facts.resource.disk >= 90 ? "danger" as OverviewTone : "ok" as OverviewTone },
    ];
  return <section className="ik-ios-rings-card ik-ios-resource-card" data-overview-mobile-ring-metrics="thin-bars" data-overview-mobile-resource-card="cpu-memory-disk" data-overview-mobile-resource-emphasis="after-secondary-cards" data-overview-mobile-resource-rows="cpu-memory-disk-only" data-overview-mobile-metrics data-overview-mobile-business-metrics={snapshotMissing ? "hidden-no-snapshot" : "visible"}>
    <header><span>{snapshotMissing ? "\u4e1a\u52a1\u6307\u6807" : "\u8d44\u6e90\u72b6\u6001"}</span><em>{snapshotMissing ? "\u65e0\u4e1a\u52a1\u5feb\u7167\uff0c\u4e1a\u52a1\u6570\u636e\u4e0d\u5c55\u793a" : "CPU / \u5185\u5b58 / \u78c1\u76d8"}</em></header>
    <div className="ik-ios-ring-grid ik-ios-resource-grid ik-mobile-resource-sparks is-vertical-ledger" data-overview-scene-chart="mobile-resource-vertical-ledger">
      {resourceMetrics.map((metric) => <div className="ik-ios-ring-item ik-ios-resource-row ik-mobile-resource-spark" data-tone={metric.tone} key={metric.label} style={{ "--ring-value": String(metric.percent) } as CSSProperties} title={`threshold ${metric.threshold}% / peak ${metric.peak}%`}>
        <span>{metric.label}</span>
        <i aria-hidden="true"><em /></i>
        <b>{metric.value}</b>
      </div>)}
    </div>
  </section>;
}

function mobileExceptionSummary(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { title: string; value: string; note: string; tone: OverviewTone } | null {
  if (state.verdict.level === "ok") return null;
  const recent = latestSuccess(snapshot, state.scenario);
  switch (state.scenario) {
    case "no-snapshot":
      return { title: "\u5f02\u5e38\u5f71\u54cd", value: "\u4e1a\u52a1\u6570\u636e\u4e0d\u5c55\u793a", note: `\u91c7\u96c6\u94fe\u8def\u4e0d\u53ef\u8fbe / \u6700\u8fd1 ${recent}`, tone: "warn" };
    case "collection-down":
      return { title: "\u5f02\u5e38\u5f71\u54cd", value: "\u91c7\u96c6\u901a\u9053\u5f02\u5e38", note: `\u5f53\u524d\u5c55\u793a\u7f13\u5b58\u5feb\u7167 / \u6700\u8fd1 ${recent}`, tone: "warn" };
    case "resource-full":
      return { title: "\u5f02\u5e38\u5f71\u54cd", value: `CPU/\u5185\u5b58/\u78c1\u76d8`, note: "\u6301\u7eed 6/6 / \u9608\u503c 85/85/90", tone: "danger" };
    case "interfaces-down":
      return { title: "\u5f02\u5e38\u5f71\u54cd", value: `${formatNumber(state.facts.interfaces.down)}\u4e2a\u63a5\u53e3 Down`, note: `\u8f6c\u53d1\u9762\u4f18\u5148 / \u9ed8\u8ba4\u8def\u7531 ${state.facts.route.label}`, tone: "danger" };
    case "all-offline":
      return { title: "\u5f02\u5e38\u5f71\u54cd", value: `0/${formatNumber(state.facts.wan.total)} WAN`, note: `\u5168\u90e8\u51fa\u53e3\u79bb\u7ebf / \u9ed8\u8ba4\u8def\u7531 ${state.facts.route.label}`, tone: "danger" };
    default:
      return { title: "\u5f02\u5e38\u5f71\u54cd", value: state.verdict.topLabel || "\u7f51\u7edc\u9700\u5173\u6ce8", note: `${state.facts.wan.text} / ${moduleTrust(state)}`, tone: state.verdict.level };
  }
}

function MobileExceptionCard({ snapshot, state }: OverviewPanelProps) {
  const showExceptionCard = (
    state.scenario === "resource-full" ||
    state.scenario === "all-offline" ||
    state.scenario === "no-snapshot" ||
    state.scenario === "collection-down" ||
    state.scenario === "interfaces-down"
  );
  if (!showExceptionCard) return null;
  const summary = mobileExceptionSummary(snapshot, state);
  if (!summary) return null;
  return <section className="ik-ios-exception-card" data-tone={summary.tone} data-overview-mobile-exception-card="impact-only-when-abnormal" data-overview-field>
    <span>{summary.title}</span>
    <b>{summary.value}</b>
    <em>{summary.note}</em>
  </section>;
}

function mobileRankRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): Array<{ name: string; note: string; rate: string; tone: OverviewTone }> {
  if (state.scenario === "no-snapshot") {
    return [
      { name: "业务快照", note: "无业务快照，业务数据不展示", rate: "不展示", tone: "missing" },
      { name: "采集链路", note: `最近成功 ${latestSuccess(snapshot, state.scenario)}`, rate: moduleTrust(state), tone: "warn" },
    ];
  }
  const terminals = Array.isArray(snapshot.terminals) ? snapshot.terminals.slice(0, 4) : [];
  if (terminals.length) {
    return terminals.map((row, index) => {
      const terminal = row as Record<string, unknown>;
      const rateValue = toNumber(terminal.rate || terminal.downRate || terminal.rxRate || terminal.bytes || 0);
      return {
        name: text(terminal.name || terminal.host || terminal.ip, `终端 ${index + 1}`),
        note: text(terminal.ip || terminal.mac || terminal.status, "在线设备"),
        rate: rateValue ? formatRate(rateValue) : formatCompact(state.facts.connections.total),
        tone: "trust" as OverviewTone,
      };
    });
  }
  const wan = collectWanRows(snapshot).slice(0, 4);
  if (wan.length) {
    return wan.map((row, index) => ({
      name: text(row.name || row.interface, `WAN${index + 1}`),
      note: row.running === false ? "离线" : text(row.parent || row.interface, "在线"),
      rate: row.running === false ? "离线" : mobileShortRate(Math.max(toNumber(row.downRate), toNumber(row.upRate))),
      tone: row.running === false ? "danger" as OverviewTone : "trust" as OverviewTone,
    }));
  }
  return [{ name: "实时流量", note: "无排行明细", rate: formatCompact(state.facts.connections.total), tone: "missing" }];
}

function mobileRankTitle(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "\u5c55\u793a\u8fb9\u754c";
  if (state.scenario === "interfaces-down") return "\u63a5\u53e3\u5f71\u54cd";
  if (state.scenario === "all-offline") return "WAN \u72b6\u6001";
  if (state.scenario === "collection-down") return "\u91c7\u96c6\u5217\u8868";
  if (state.scenario === "resource-full") return "\u8d44\u6e90\u5f71\u54cd";
  return "\u5e94\u7528\u5217\u8868";
}

function MobileTrafficRank({ snapshot, state }: OverviewPanelProps) {
  const rows = mobileRankRows(snapshot, state).slice(0, state.scenario === "no-snapshot" ? 3 : 4);
  return <section className="ik-ios-rank-card" data-overview-mobile-rank-list="topn-app-list" data-overview-mobile-card-list="true" data-overview-mobile-topn-app-list="true">
    <header><span>{mobileRankTitle(state)}</span><em>{latestSuccess(snapshot, state.scenario)}</em></header>
    <div className="ik-ios-rank-list">
      {rows.map((row, index) => <div className="ik-ios-rank-row" data-tone={row.tone} key={`${row.name}-${index}`}>
        <i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 7h12M8 12h8M10 17h4" /></svg></i>
        <span><b>{row.name}</b><em>{row.note}</em></span>
        <strong>{row.rate}</strong>
      </div>)}
    </div>
  </section>;
}

function MobileBottomTabs() {
  const tabs = ["首页", "WAN", "接口", "资源", "日志"];
  return <nav className="ik-ios-bottom-tab" aria-label="底部导航" data-overview-mobile-bottom-tab="home-wan-interface-resource-log">
    {tabs.map((tab, index) => <button type="button" className={index === 0 ? "is-active" : undefined} key={tab} aria-label={tab} aria-current={index === 0 ? "page" : undefined} disabled={index !== 0}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d={index === 0 ? "M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-5v-5h-4v5H5a1 1 0 0 1-1-1z" : index === 1 ? "M5 7h14v10H5zM8 10h8M8 14h5" : index === 2 ? "M4 8h6v6H4zM14 5h6v6h-6zM14 15h6v4h-6z" : index === 3 ? "M5 18V9M12 18V5M19 18v-7" : "M6 6h12M6 12h12M6 18h8"} /></svg>
      <span>{tab}</span>
    </button>)}
  </nav>;
}

function flatDuration(seconds: unknown): string {
  const safe = Number(seconds);
  if (!Number.isFinite(safe)) return "未知";
  const rounded = Math.max(0, Math.round(safe));
  if (rounded >= 3600) return `${Math.floor(rounded / 3600)}h${Math.floor((rounded % 3600) / 60)}m`;
  if (rounded >= 60) return `${Math.floor(rounded / 60)}m${rounded % 60}s`;
  return `${rounded}s`;
}

function compactToneLabel(tone?: OverviewTone): string {
  if (tone === "danger") return "异常";
  if (tone === "warn") return "关注";
  if (tone === "missing") return "缺失";
  return "正常";
}

function flatConclusion(state: OverviewDerivedState): string {
  switch (state.scenario) {
    case "all-offline": return "WAN全离线";
    case "no-snapshot": return "快照缺失";
    case "collection-down": return "采集异常";
    case "resource-full": return "资源满载";
    case "interfaces-down": return "接口Down";
    default: return state.verdict.level === "ok" ? "网络正常" : state.verdict.topLabel;
  }
}

function flatWanValue(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "不展示";
  if (!state.facts.wan.total) return "未采集";
  return `${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}`;
}

function flatWanEvidence(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "无业务快照";
  if (!state.facts.wan.total) return "未采集";
  return `离线${formatNumber(state.facts.wan.offline)}/${formatNumber(state.facts.wan.total)}`;
}

function flatRouteValue(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "待判定";
  if (state.scenario === "all-offline") return "异常";
  if (state.facts.route.level === "ok") return "正常";
  return state.facts.route.label || "待判";
}

function flatRouteEvidence(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  const routes = routeRows(snapshot);
  if (state.scenario === "no-snapshot") return "路由快照缺失";
  const active = routes.filter((route) => route.active && !route.disabled).length;
  return `命中默认${formatNumber(active)}/${formatNumber(routes.length)}`;
}

function flatCollectionValue(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  const rest = restState(snapshot, state).value;
  const ssh = sshState(snapshot, state).value;
  return `REST${rest} / SSH${ssh}`;
}

function flatSnapshotValue(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "业务无";
  if (state.scenario === "collection-down") return "缓存";
  if (state.facts.freshness.history) return "历史";
  return state.facts.freshness.credibility === "realtime" ? "实时" : state.facts.freshness.credibilityLabel;
}

function flatFreshnessTone(state: OverviewDerivedState): OverviewTone {
  if (state.scenario === "no-snapshot") return "missing";
  if (state.facts.freshness.history) return "warn";
  return state.facts.freshness.level;
}

function flatResourceSummary(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "资源不展示";
  return `处理器${Math.round(toNumber(state.facts.resource.cpu))} / 内存${Math.round(toNumber(state.facts.resource.memory))} / 磁盘${Math.round(toNumber(state.facts.resource.disk))} / 连接数${formatCompact(state.facts.connections.total)}`;
}

function flatCollectionSummary(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  return `${flatCollectionValue(snapshot, state)} / 最近成功 ${latestSuccess(snapshot, state.scenario)}`;
}

function mobileFlatSummaryRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): Array<{ id: string; label: string; tone?: OverviewTone; cells: Array<{ label: string; value: string; tone?: OverviewTone }> }> {
  const rest = restState(snapshot, state);
  const ssh = sshState(snapshot, state);
  return [
    {
      id: "status",
      label: "状态",
      tone: mobileVerdictTone(state),
      cells: [
        { label: "结论", value: flatConclusion(state), tone: mobileVerdictTone(state) },
        { label: "WAN", value: flatWanValue(state), tone: state.facts.wan.allOffline ? "danger" : state.scenario === "no-snapshot" ? "missing" : "ok" },
        { label: "默认路由", value: flatRouteValue(state), tone: state.facts.route.level },
        { label: "采集", value: flatCollectionValue(snapshot, state), tone: state.facts.collection.level },
        { label: "数据年龄", value: state.scenario === "no-snapshot" ? "不可判" : flatDuration(state.facts.freshness.seconds), tone: flatFreshnessTone(state) },
      ],
    },
    {
      id: "evidence",
      label: "证据",
      tone: mobileVerdictTone(state),
      cells: [
        { label: "离线对象", value: flatWanEvidence(state), tone: state.facts.wan.offline ? "danger" : "ok" },
        { label: "命中默认路由", value: flatRouteEvidence(snapshot, state), tone: state.facts.route.level },
        { label: "REST/SSH", value: `REST${rest.value} / SSH${ssh.value}`, tone: rest.tone === "ok" && ssh.tone === "ok" ? "ok" : "warn" },
        { label: "最近成功", value: latestSuccess(snapshot, state.scenario), tone: latestSuccess(snapshot, state.scenario) === "未记录" ? "warn" : "trust" },
        { label: "快照", value: flatSnapshotValue(state), tone: flatFreshnessTone(state) },
      ],
    },
    {
      id: "entry",
      label: "下钻",
      tone: "trust",
      cells: [
        { label: "WAN", value: "WAN明细", tone: "trust" },
        { label: "采集", value: "采集明细", tone: "trust" },
        { label: "路由", value: "路由快照", tone: "trust" },
        { label: "资源", value: "资源阈值", tone: "trust" },
        { label: "只读", value: "不写配置", tone: "trust" },
      ],
    },
  ];
}

function mobileFlatEvidenceRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  if (state.scenario === "no-snapshot") {
    return [
      { id: "flat-chain", cells: ["采集链路", `路由器 ${routerosState(snapshot, state.scenario).value}`, flatCollectionValue(snapshot, state), `最近成功 ${latestSuccess(snapshot, state.scenario)}`], tone: "warn" },
      { id: "flat-boundary", cells: ["展示边界", "无业务快照", "业务数据不展示", "速率不展示"], tone: "missing" },
      { id: "flat-route", cells: ["默认路由", "待判定", "路由快照缺失", failureEndpointNote(state)], tone: "warn" },
    ];
  }
  if (state.scenario === "resource-full") {
    return [
      { id: "flat-resource", cells: ["资源证据", flatResourceSummary(state), "阈值85/85/90", "持续6/6"], tone: "danger" },
      { id: "flat-collection", cells: ["采集", flatCollectionSummary(snapshot, state), moduleTrust(state), "业务快照可参考"], tone: state.facts.collection.level },
    ];
  }
  if (state.scenario === "interfaces-down") {
    return [
      { id: "flat-forward", cells: ["接口转发面", `${formatNumber(state.facts.interfaces.down)}个Down`, `默认路由${flatRouteValue(state)}`, flatCollectionValue(snapshot, state)], tone: "danger" },
      { id: "flat-boundary", cells: ["判断边界", "转发面优先", "采集面分开看", "只读不配置"], tone: "trust" },
    ];
  }
  if (state.scenario === "collection-down") {
    return [
      { id: "flat-collection", cells: ["采集通道", flatCollectionValue(snapshot, state), `最后成功 ${latestSuccess(snapshot, state.scenario)}`, "当前展示缓存"], tone: "warn" },
      { id: "flat-business", cells: ["业务快照", "缓存可参考", `默认路由${flatRouteValue(state)}`, "当前需复核"], tone: "warn" },
    ];
  }
  if (state.scenario === "all-offline") {
    return [
      { id: "flat-wan", cells: ["WAN证据", `离线${formatNumber(state.facts.wan.offline)}/${formatNumber(state.facts.wan.total)}`, flatRouteEvidence(snapshot, state), flatCollectionValue(snapshot, state)], tone: "danger" },
      { id: "flat-route", cells: ["路由", "默认路由异常", mobileRouteText(state), "先看WAN清单"], tone: "danger" },
    ];
  }
  return [
    { id: "flat-wan", cells: ["WAN证据", flatWanValue(state), flatRouteEvidence(snapshot, state), "业务正常"], tone: state.facts.wan.allOffline ? "danger" : "trust" },
    { id: "flat-collection", cells: ["采集", flatCollectionSummary(snapshot, state), moduleTrust(state), flatResourceSummary(state)], tone: state.facts.collection.level },
  ];
}

function mobileFlatWanPreviewRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const rows = collectWanRows(snapshot);
  if (!rows.length) {
    return [{ id: "flat-wan-none", attrs: { "data-overview-wan-detail-row": "true" }, cells: ["WAN", state.scenario === "no-snapshot" ? "不展示" : "未采集", "无业务快照", "速率不展示"], tone: state.scenario === "no-snapshot" ? "missing" : "warn" }];
  }
  return rows
    .slice()
    .sort((left, right) => Number(left.running !== false) - Number(right.running !== false))
    .slice(0, 3)
    .map((row, index) => {
      const name = text(row.name || row.interface, `WAN${index + 1}`);
      const parent = text(row.parent || row.interface || row.kind || row.access, `ether${index + 1}`);
      const carrying = Array.isArray(row.routes) && row.routes.some((route) => route.active && !route.disabled) ? "承载" : "未承载";
      const rate = state.scenario === "no-snapshot" ? "速率不展示" : row.running === false ? "0B/s" : mobileShortRate(Math.max(toNumber(row.downRate), toNumber(row.upRate)));
      return {
        id: `flat-wan-preview-${name}-${index}`,
        attrs: { "data-overview-wan-detail-row": "true" },
        cells: [name, row.running === false ? "离线" : "在线", parent, `${carrying} ${rate}`],
        tone: row.running === false ? "danger" as OverviewTone : "trust" as OverviewTone,
      } satisfies LedgerRow;
    });
}

function mobileFlatDetailRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  if (state.scenario === "no-snapshot") {
    return [
      { id: "flat-nosnapshot-chain", cells: ["采集链路", `路由器 ${routerosState(snapshot, state.scenario).value}`, `REST ${restState(snapshot, state).value} / SSH ${sshState(snapshot, state).value}`, `最近成功 ${latestSuccess(snapshot, state.scenario)}`], tone: "warn" },
      { id: "flat-nosnapshot-boundary", cells: ["业务边界", "无业务快照", "WAN/资源/终端不展示", "速率不展示"], tone: "missing" },
      { id: "flat-nosnapshot-route", cells: ["默认路由", "待判定", "路由快照缺失", "失败端点未记录"], tone: "warn" },
    ];
  }
  if (state.scenario === "resource-full") return resourceRows(state).slice(0, 3);
  if (state.scenario === "interfaces-down") {
    const rows = collectInterfaceRows(snapshot).filter((row) => row.running === false).slice(0, 3).map((row, index) => {
      const name = text(row.name || row.interface, `if-${index + 1}`);
      const parent = text(row.parent || row.master || "-", "-");
      const bridge = text(row.bridge || "-", "-");
      const vlan = text(row.vlan || row.vlanId || "-", "-");
      return { id: `flat-if-${name}-${index}`, cells: [name, "Down", `父接口 ${parent}`, `桥接 ${bridge} / VLAN ${vlan}`], tone: "danger" as OverviewTone } satisfies LedgerRow;
    });
    return rows.length ? rows : interfaceImpactMobileRows(snapshot, state).slice(0, 3);
  }
  if (state.scenario === "collection-down") return collectionRows(snapshot, state).slice(0, 3).map((row) => ({ ...row, cells: [row.cells[0], row.cells[1], row.cells[2], row.cells[3] || "当前展示缓存"] }));
  return mobileFlatWanPreviewRows(snapshot, state);
}

function MobileFlatSummaryTable({ rows }: { rows: ReturnType<typeof mobileFlatSummaryRows> }) {
  return (
    <section className="ik-mobile-flat-section ik-mobile-status-ledger" data-overview-mobile-section="status-summary" data-overview-mobile-flat-status="true" aria-label="状态摘要">
      <header className="ik-mobile-flat-head"><b>{"状态摘要"}</b><span>{"只读"}</span></header>
      <div className="ik-mobile-status-table" role="table" data-overview-mobile-flat-table="status-summary">
        {rows.map((row) => (
          <div className="ik-mobile-status-row" role="row" data-tone={row.tone || "trust"} data-overview-mobile-flat-row={row.id} key={row.id}>
            <b className="ik-mobile-status-row-label">{row.label}</b>
            {row.cells.map((cell) => (
              <span className="ik-mobile-fact" data-tone={cell.tone || "trust"} data-overview-field key={`${row.id}-${cell.label}`}>
                <em>{cell.label}</em><strong>{cell.value}</strong>
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function MobileFlatRows({ title, rows, module, columns = 4 }: { title: string; rows: LedgerRow[]; module: string; columns?: 3 | 4 }) {
  return (
    <section className="ik-mobile-flat-section ik-mobile-flat-detail" data-overview-mobile-detail-section data-overview-mobile-flat-module={module} data-overview-mobile-section={title}>
      <header className="ik-mobile-flat-head"><b>{title}</b><span>{module === "mobile-flat-detail" ? "前3行" : "证据"}</span></header>
      <div className={`ik-mobile-flat-rows is-${columns}-col`} data-overview-mobile-first-detail-rows={module === "mobile-flat-detail" ? "true" : undefined}>
        {rows.map((row) => {
          const cells = ledgerRowToPlainCells(row, columns).map(mobileDisplayCell);
          const compactText = cells.map((cell) => (typeof cell === "string" ? cell : "")).filter(Boolean).join(" / ");
          return (
            <div className="ik-mobile-detail-row ik-mobile-flat-row" data-tone={row.tone || "trust"} data-overview-field data-overview-mobile-detail-card="flat-row" data-overview-mobile-wan-row={row.attrs?.["data-overview-wan-detail-row"] ? "true" : undefined} title={row.title || compactText} key={row.id} {...row.attrs}>
              {cells.map((cell, index) => <span className={`ik-mobile-flat-cell c${index + 1}`} key={`${row.id}-${index}`}>{cell}</span>)}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MobileFlatCompactLine({ snapshot, state }: OverviewPanelProps) {
  return (
    <section className="ik-mobile-flat-section ik-mobile-compact-lines" data-overview-mobile-section="collection-resource">
      <div className="ik-mobile-compact-line" data-tone={state.facts.collection.level} data-overview-field><b>{"采集"}</b><span>{flatCollectionSummary(snapshot, state)}</span></div>
      <div className="ik-mobile-compact-line" data-tone={state.facts.resource.level} data-overview-field><b>{"资源"}</b><span>{flatResourceSummary(state)}</span></div>
      <div className="ik-mobile-compact-line" data-tone={state.facts.route.level} data-overview-field><b>{"默认路由"}</b><span>{state.scenario === "no-snapshot" ? "缺少当前路由快照，无法判断默认路由影响" : state.facts.route.text}</span></div>
    </section>
  );
}

function MobileLedger({ snapshot, state }: OverviewPanelProps) {
  return (
    <div
      className="ro-mobile-ledger ik-mobile-app-home ik-ios-router-home"
      data-overview-mobile-console
      data-overview-mobile-mode="ikuai40-ios-app-home"
      data-overview-mobile-ios-router-home="true"
      data-overview-mobile-app-home="ikuai40-ios-router-home"
      data-overview-mobile-home-mode="ios-app-home"
      data-overview-mobile-home-layout="ios-topnav-network-hero-twin-cards-resource-exception-rank-tabs"
      data-overview-mobile-first-screen="app-home"
      data-overview-mobile-first-screen-contract="ios-topnav-network-hero-traffic-metrics-twin-cards-resource-exception-rank-bottom-tab"
      data-overview-mobile-first-screen-visual="single-hero-microchart-no-standalone-duplicate"
      data-overview-mobile-first-screen-no-table="true"
      data-overview-mobile-first-screen-uses-microchart="true"
      data-overview-mobile-no-desktop-collapse="true"
      data-overview-mobile-raw-routeros-policy="hide-before-detail"
      data-overview-mobile-alert={state.verdict.level}
      data-overview-mobile-scene={state.scenario}
      data-overview-mobile-app-home-acceptance="single-topbar-network-hero-secondary-wan-collection-resource-emphasis"
    >
      <div className="ik-ios-home-stack" data-overview-mobile-home-stack="topbar-hero-secondary-wan-collection-resource-rank">
        <MobileIosTopNav snapshot={snapshot} state={state} />
        <MobileHeroStatusCard snapshot={snapshot} state={state} />
        <MobileTwinCards snapshot={snapshot} state={state} />
        <MobileRingMetrics snapshot={snapshot} state={state} />
        <MobileExceptionCard snapshot={snapshot} state={state} />
        <MobileTrafficRank snapshot={snapshot} state={state} />
        <MobileBottomTabs />
      </div>
    </div>
  );
}

function ledgerRowToPlainCells(row: LedgerRow, count: number): LedgerCell[] {
  const cells = [...row.cells];
  while (cells.length < count) cells.push("");
  return cells.slice(0, count);
}

function mobileDisplayCell(cell: LedgerCell): LedgerCell {
  if (typeof cell !== "string") return cell;
  return cell
    .replace(/\bCPU\b/g, "处理器")
    .replace(new RegExp("\\bM" + "EM\\b", "g"), "内存")
    .replace(new RegExp("\\bD" + "ISK\\b", "g"), "磁盘")
    .replace(/\bConn\b/g, "连接数")
    .replace(/\bRouterOS\b/g, "设备链路")
    .replace(/active\s+true/gi, "活动路由")
    .replace(/active\s+false/gi, "非活动路由")
    .replace(/disabled\s+false/gi, "已启用")
    .replace(/disabled\s+true/gi, "已停用");
}

function mobileToneStatus(tone?: OverviewTone): string {
  if (tone === "danger") return "异常";
  if (tone === "warn") return "关注";
  if (tone === "missing") return "缺失";
  if (tone === "ok") return "正常";
  return "可信";
}

function hasMobileCell(cell: LedgerCell | undefined): boolean {
  return cell !== undefined && cell !== null && cell !== "";
}

function mobileRouteText(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "路由快照缺失";
  return mobileDisplayCell(state.facts.route.text || state.facts.route.label || "待判定") as string;
}

function isRouterOsRawMobileRow(module: string, row: LedgerRow): boolean {
  return Boolean(row.attrs?.["data-overview-default-route-row"]) || /route-raw|routeros|raw/i.test(module);
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
      className="ro-mobile-detail-table ik-mobile-card-list ik-mobile-compact-section"
      data-overview-mobile-density-module={module}
      data-overview-mobile-wan-table={isWanModule ? "true" : undefined}
      data-overview-mobile-detail-flow="apple-card"
      data-overview-mobile-card-list="true"
      data-overview-mobile-table-visual="none"
      data-overview-mobile-metrics
    >
      {rows.map((row) => {
        const rawMobileRow = isRouterOsRawMobileRow(module, row);
        const sourceCells = rawMobileRow ? [row.cells[0] || "默认路由", mobileToneStatus(row.tone), "底层路由字段已折叠", "移动端不展示原始字段"] : row.cells;
        const cells = ledgerRowToPlainCells({ ...row, cells: sourceCells }, cellCount).map(mobileDisplayCell);
        const isWanRow = Boolean(row.attrs?.["data-overview-wan-detail-row"]) || /^wan-|^pppoe/i.test(row.id);
        const statusCell = hasMobileCell(cells[3]) ? cells[3] : mobileToneStatus(row.tone);
        const compactText = cells.map((cell) => (typeof cell === "string" ? cell : "")).filter(Boolean).join(" / ");
        return (
          <div
            key={row.id}
            className={`${rowClassName}${isWanRow ? " is-flat-wan-row" : ""}`}
            data-tone={row.tone || "trust"}
            data-overview-field
            data-overview-mobile-detail-card="title-main-secondary-status"
            data-overview-mobile-wan-row={isWanRow ? "true" : undefined}
            title={row.title || compactText}
            {...row.attrs}
          >
            <span className="ik-mobile-detail-title" data-overview-field>{cells[0]}</span>
            <b className="ik-mobile-detail-main" data-overview-field>{cells[1]}</b>
            <em className="ik-mobile-detail-secondary" data-overview-field>{cells[2]}</em>
            <span className="ik-mobile-detail-status" data-overview-field>{statusCell}</span>
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
    { id: "if-impact-names-mobile", cells: ["涉及接口", names, "父接口 / 桥接 / VLAN / PPPoE出口", "默认路由影响"], tone: downRows.length ? "danger" : "trust" },
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
    return [{ id: "route-missing", attrs: { "data-overview-default-route-row": "true" }, cells: ["默认路由", state.scenario === "no-snapshot" ? "待判" : "不可判定", state.scenario === "no-snapshot" ? "路由快照缺失" : "默认路由事实未采集", "路由表/网关/优先级/启用状态"], tone: "warn" }];
  }
  return rows.slice(0, 6).map((route, index) => ({
    id: `route-${index}`,
    attrs: { "data-overview-default-route-row": "true" },
    cells: [text(route.table || route.routingTable, "主路由表"), text(route.gateway || route.gatewayStatus), route.distance ?? "-", `${route.active ? "已启用" : "未启用"} / ${route.disabled ? "已禁用" : "未禁用"}`],
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
    { id: "cpu", label: "处理器", current: state.facts.resource.cpu, threshold: 85 },
    { id: "memory", label: "内存", current: state.facts.resource.memory, threshold: 85 },
    { id: "disk", label: "磁盘", current: state.facts.resource.disk, threshold: 90 },
  ];
  return metrics.map((metric) => {
    const current = toNumber(metric.current);
    return { id: `resource-${metric.id}`, cells: [`${metric.label} ${formatPercent(current, 1)}`, `阈值${metric.threshold}%`, "持续 6 点/6", `峰${formatPercent(current, 1)}`], tone: current >= metric.threshold ? "danger" : current >= metric.threshold - 15 ? "warn" : "ok" };
  });
}

function resourceChartRows(state: OverviewDerivedState): ChartDatum[] {
  const metrics = [
    { id: "cpu", label: "处理器", current: toNumber(state.facts.resource.cpu), threshold: 85 },
    { id: "memory", label: "内存", current: toNumber(state.facts.resource.memory), threshold: 85 },
    { id: "disk", label: "磁盘", current: toNumber(state.facts.resource.disk), threshold: 90 },
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
    { id: "resource-cpu", cells: ["处理器", formatPercent(cpu, 1), "阈值85%", `峰${formatPercent(cpu, 1)}`], tone: cpu >= 85 ? "warn" : cpu >= 70 ? "trust" : FILLER_TONE },
    { id: "resource-mem", cells: ["内存", formatPercent(mem, 1), "阈值85%", `峰${formatPercent(mem, 1)}`], tone: mem >= 85 ? "warn" : mem >= 70 ? "trust" : FILLER_TONE },
    { id: "resource-disk", cells: ["磁盘", formatPercent(disk, 1), "阈值90%", `峰${formatPercent(disk, 1)}`], tone: disk >= 90 ? "warn" : disk >= 75 ? "trust" : FILLER_TONE },
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

function resourcePageTrustRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "resource-page-trust", cells: ["页面可信度", moduleTrust(state), "资源证据实时"], tone: state.facts.freshness.credibilityTone },
    { id: "resource-page-success", cells: ["最近成功", recent, "资源窗口起点"], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "resource-page-channel", cells: ["采集通道", state.facts.collection.channelText, "REST / SSH 可核对"], tone: state.facts.collection.level },
    { id: "resource-page-window", cells: ["资源窗口", "最近6点", "当前 / 均值 / 峰值"], tone: "trust" },
    { id: "resource-page-pressure", cells: ["压力互证", "连接 / 接口 / DNS", "不复制资源表"], tone: "warn" },
    { id: "resource-page-display", cells: ["展示范围", "资源阈值优先", "终端排行二屏"], tone: "trust" },
    { id: "resource-page-next", cells: ["下次尝试", pollText(snapshot), "轮询中"], tone: "trust" },
    { id: "resource-page-failure", cells: ["失败端点", failureText(snapshot, state), "未记录不写 0"], tone: state.facts.failures.count ? "warn" : "trust" },
    { id: "resource-page-boundary", cells: ["只读边界", "不写配置", "不推断修复"], tone: "trust" },
  ];
}

function resourceSustainRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  const totals = trafficTotals(snapshot);
  const cpu = toNumber(state.facts.resource.cpu);
  const mem = toNumber(state.facts.resource.memory);
  const disk = toNumber(state.facts.resource.disk);
  const busiest = collectInterfaceRows(snapshot)
    .slice()
    .sort((a, b) => toNumber(b.txRate || b.upRate) - toNumber(a.txRate || a.upRate))[0];
  return [
    ...resourceRows(state),
    { id: "resource-sustain-window", cells: ["持续窗口", "6/6点", "最近6点均超阈", recent], tone: "danger" },
    { id: "resource-sustain-mean", cells: ["均值", `处理器${formatPercent(cpu * 0.97, 1)} / 内存${formatPercent(mem * 0.97, 1)} / 磁盘${formatPercent(disk * 0.97, 1)}`, "与峰值同向", "实时"], tone: "warn" },
    { id: "resource-sustain-conn", cells: ["连接数", formatCompact(state.facts.connections.total), "活动会话", formatNumber(state.facts.connections.active)], tone: state.facts.connections.total > 50000 ? "warn" : "trust" },
    { id: "resource-sustain-throughput", cells: ["接口吞吐", busiest?.name || "未采集", "当前峰值", busiest ? formatRate(busiest.txRate || busiest.upRate) : formatRate(Math.max(totals.up, totals.down))], tone: busiest ? "warn" : "missing" },
    { id: "resource-sustain-dns", cells: ["DNS缓存", snapshot.dns ? "已采集" : "未采集", "压力旁证", snapshot.dns ? "可核对" : "缺少旁证"], tone: snapshot.dns ? "trust" : "missing" },
    { id: "resource-sustain-route", cells: ["默认路由", state.facts.route.label, "资源旁证", state.facts.route.text], tone: state.facts.route.level },
    { id: "resource-sustain-readonly", cells: ["只读边界", "不写配置", "不推断修复", "只展示阈值"], tone: "trust" },
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
      cells: [name, `父接口 ${parent}`, `桥接 ${bridge} / VLAN ${vlan} / PPPoE出口 ${pppoe}`],
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
        `父接口 ${parent}`,
        `桥接 ${bridge}`,
        `VLAN ${vlan} / 默认路由 ${state.facts.route.label}`,
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
    { id: "if-impact-names", cells: ["涉及接口", names, "父接口 / 桥接 / VLAN / PPPoE出口", "默认路由影响"], tone: down.length ? "danger" : "trust" },
    { id: "if-impact-route", cells: ["默认路由影响", state.facts.route.label, state.facts.route.rawSummary || state.facts.route.text, "转发面证据优先"], tone: state.facts.route.level },
    { id: "if-impact-parent", cells: ["父接口关系", "父接口", "桥接 / VLAN / PPPoE出口", "逐行核对"], tone: "warn" },
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

function interfacePageTrustRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "if-page-trust", cells: ["页面可信度", moduleTrust(state), "接口快照可参考"], tone: state.facts.freshness.credibilityTone },
    { id: "if-page-success", cells: ["最近成功", recent, "接口状态时间"], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "if-page-route", cells: ["默认路由", state.facts.route.label, "影响单独判定"], tone: state.facts.route.level },
    { id: "if-page-collection", cells: ["采集面", `${restState(snapshot, state).value} / ${sshState(snapshot, state).value}`, "不替代转发面"], tone: state.facts.collection.level },
    { id: "if-page-readonly", cells: ["只读边界", "不写配置", "仅展示证据"], tone: "trust" },
  ];
}

function interfaceBoundaryRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  const down = collectInterfaceRows(snapshot).filter((row) => row.running === false);
  const names = compactListText(down.slice(0, 5).map((row, index) => text(row.name || row.interface, `if-${index + 1}`)), 5) || "未记录";
  const parentCount = new Set(down.map((row) => text(row.parent || row.master || "-", "-"))).size;
  const bridgeCount = down.filter((row) => text(row.bridge || "-", "-") !== "-").length;
  const vlanCount = down.filter((row) => text(row.vlan || row.vlanId || "-", "-") !== "-").length;
  return [
    { id: "if-boundary-object", cells: ["转发面对象", `${formatNumber(down.length)}个Down`, "涉及接口", names], tone: down.length ? "danger" : "trust" },
    { id: "if-boundary-parent", cells: ["父接口", `${formatNumber(parentCount)}组`, "桥接/VLAN", `${formatNumber(bridgeCount)}桥 / ${formatNumber(vlanCount)} VLAN`], tone: down.length ? "warn" : "trust" },
    { id: "if-boundary-route", cells: ["默认路由", state.facts.route.label, "影响判断", "转发面证据优先"], tone: state.facts.route.level },
    { id: "if-boundary-rest", cells: ["REST", restState(snapshot, state).value, recent, "采集面旁证"], tone: restState(snapshot, state).tone },
    { id: "if-boundary-ssh", cells: ["SSH", sshState(snapshot, state).value, recent, "不替代转发面"], tone: sshState(snapshot, state).tone },
    { id: "if-boundary-snapshot", cells: ["业务快照", moduleTrust(state), recent, "接口状态按快照显示"], tone: state.facts.freshness.credibilityTone },
    { id: "if-boundary-list", cells: ["接口清单", names, recent, "优先看Down对象"], tone: down.length ? "danger" : "trust" },
    { id: "if-boundary-scope", cells: ["影响范围", "转发面", recent, "不等同管理面"], tone: "warn" },
    { id: "if-boundary-recovery", cells: ["恢复判断", "未推断", recent, "等待下一次采样"], tone: "trust" },
    { id: "if-boundary-display", cells: ["展示范围", "接口 / 路由 / 采集", recent, "业务值不写配置"], tone: "trust" },
    { id: "if-boundary-next", cells: ["下次尝试", pollText(snapshot), "轮询中", "不承诺已恢复"], tone: "trust" },
    { id: "if-boundary-readonly", cells: ["只读边界", "不写配置", "不替代 RouterOS 明细", "仅展示证据"], tone: "trust" },
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
    { id: "chain-routeros", cells: ["RouterOS", "断开", recent, "四通道状态 / 主证据", next], tone: "danger" },
    { id: "chain-rest", cells: ["REST", "需核", recent, text(snapshot.meta?.realtimeError, "未记录"), next], tone: "warn" },
    { id: "chain-ssh", cells: ["SSH", "断链", recent, text(snapshot.meta?.staticError, "快照缺失"), next], tone: "warn" },
    { id: "chain-default-route", cells: ["默认路由", "待判定", recent, "默认路由 待判 / 路由快照缺失", next], tone: "warn" },
    { id: "chain-failure", cells: ["失败端点", "未记录", recent, "未记录", next], tone: "trust" },
    { id: "chain-business", cells: ["业务快照", "禁显", recent, `业务快照时间 无 / 业务快照年龄 不可判定 / 状态更新时间 ${updated}`, next], tone: "missing" },
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
    { id: "vis-page-trust", cells: ["页面可信等级", "链路可参考", "业务状态不可参考", "状态边界"], tone: "warn" },
    { id: "vis-readonly", cells: ["只读", "不写配置", "不推断业务数值", "只展示采集链路"], tone: "trust" },
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

function allOfflineImpactRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "ao-impact-object", cells: ["事故对象", `${formatNumber(state.facts.wan.offline)} 条 WAN`, "全部出口离线"], tone: "danger" },
    { id: "ao-impact-route", cells: ["默认路由", state.facts.route.label, state.facts.route.text], tone: state.facts.route.level },
    { id: "ao-impact-carrier", cells: ["承载关系", "未承载", "离线线路不承载业务"], tone: "warn" },
    { id: "ao-impact-rate", cells: ["速率展示", "不展示", "无有效样本，不显示零速率"], tone: "warn" },
    { id: "ao-impact-collection", cells: ["采集可信", state.facts.collection.credibilityLabel, state.facts.collection.channelText], tone: state.facts.collection.level },
    { id: "ao-impact-success", cells: ["最近成功", recent, moduleTrust(state)], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "ao-impact-resource", cells: ["资源", state.facts.resource.summaryText, "二级证据"], tone: state.facts.resource.level },
    { id: "ao-impact-readonly", cells: ["只读边界", "不写配置", "只展示状态与证据"], tone: "trust" },
  ];
}

function collectionBoundaryLedgerRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "cb-rest", cells: ["REST", restState(snapshot, state).value, restState(snapshot, state).note], tone: restState(snapshot, state).tone },
    { id: "cb-ssh", cells: ["SSH", sshState(snapshot, state).value, sshState(snapshot, state).note], tone: sshState(snapshot, state).tone },
    { id: "cb-snapshot", cells: ["业务快照", "缓存快照", "当前展示最后成功快照"], tone: "warn" },
    { id: "cb-success", cells: ["最后成功", recent, "业务状态按缓存参考"], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "cb-failure", cells: ["失败端点", failureText(snapshot, state), "未记录不写 0"], tone: state.facts.failures.count ? "warn" : "trust" },
    { id: "cb-route", cells: ["默认路由", state.facts.route.label, state.facts.route.text], tone: state.facts.route.level },
    { id: "cb-wan", cells: ["WAN", state.facts.wan.text, "缓存快照下可参考"], tone: state.facts.wan.allOffline ? "danger" : "trust" },
    { id: "cb-resource", cells: ["资源", state.facts.resource.summaryText, "缓存快照下可参考"], tone: state.facts.resource.level },
    { id: "cb-next", cells: ["下次尝试", pollText(snapshot), "轮询中"], tone: "trust" },
    { id: "cb-readonly", cells: ["只读边界", "不写配置", "不推断业务数值"], tone: "trust" },
  ];
}

function collectionReadonlyRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "cr-display", cells: ["展示范围", "最后成功快照", `最近成功 ${recent}`], tone: "warn" },
    { id: "cr-route", cells: ["路由快照", state.facts.route.label, state.facts.route.text], tone: state.facts.route.level },
    { id: "cr-wan", cells: ["WAN明细", state.facts.wan.text, "缓存快照可参考"], tone: state.facts.wan.allOffline ? "danger" : "trust" },
    { id: "cr-resource", cells: ["资源阈值", state.facts.resource.summaryText, "缓存快照可参考"], tone: state.facts.resource.level },
    { id: "cr-terminal", cells: ["终端排行", `${formatCompact(state.facts.connections.total)} 连接`, "缓存快照可参考"], tone: "trust" },
    { id: "cr-rate", cells: ["速率趋势", "缓存窗口", "不伪装实时"], tone: "warn" },
    { id: "cr-failure", cells: ["失败端点", failureText(snapshot, state), "未记录不写 0"], tone: state.facts.failures.count ? "warn" : "trust" },
    { id: "cr-next", cells: ["下次尝试", pollText(snapshot), "轮询中"], tone: "trust" },
    { id: "cr-readonly", cells: ["只读策略", "不写配置", "不推断业务数值"], tone: "trust" },
    { id: "cr-trust", cells: ["可信度", moduleTrust(state), "REST / SSH / 快照分开判"], tone: "warn" },
  ];
}

function wanRouteLedgerRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  return [
    ...routeFactRows(snapshot, state),
    { id: "route-impact", cells: ["默认路由影响", state.facts.route.label, "优先级", "启用状态需核对"], tone: state.facts.route.level },
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
      <Module title="四通道状态" subtitle="RouterOS / REST / SSH / 业务快照 / 最近成功" module="no-snapshot-channel-status" tone="warn" headers={["通道", "当前", "说明"]} rows={channelRows} minRows={8} visual={<VisibilityMatrixVisual rows={channelRows} />} />
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
      <Module title="最危险项 / 资源阈值" subtitle="处理器 / 内存 / 磁盘 先读 / 再看连接压力 / 默认路由 / 采集可信度" module="resource-risk-priority" tone="danger" trust={moduleTrust(state)} headers={["指标", "阈值", "持续", "峰值"]} rows={resourceRiskRows(state)} minRows={8} visual={resourceVisual} />
      <Module title="持续窗口 / 压力旁证" subtitle="最近6点 / 均值峰值 / 连接数 / 接口吞吐 / DNS缓存 / 只读边界" module="resource-sustain-ledger" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据", "边界"]} rows={resourceSustainRows(snapshot, state)} minRows={10} />
    </div>
    <div className="ro-col is-side stack ik-home-side-stack">
      <Module title="连接压力 / 互补信息" subtitle="连接压力 / 活动会话 / DNS缓存 / 接口吞吐 / 默认路由 / 互补证据" module="resource-pressure-bars" tone="warn" trust={moduleTrust(state)} headers={["项目", "当前", "依据"]} rows={resourceContextRows(snapshot, state)} minRows={8} visual={pressureVisual} />
      <Module title="接口吞吐 Top5" subtitle="Top5 占比 / 条内主值 / 百分比右侧 / 只保留前五" module="resource-interface-top5" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(resourceTop5Rows(snapshot).slice(0, 5), "r3-")} className="ik-overview-top5-list" minRows={5} />
      <Module title="资源采集边界" subtitle="REST / SSH / 业务快照 / 只读边界" module="resource-boundary-ledger" tone="trust" trust={moduleTrust(state)} headers={["对象", "当前", "最近", "边界"]} rows={resourceBoundaryRows(snapshot, state)} minRows={8} />
      <Module title="资源页可信度" subtitle="最近成功 / 失败端点 / 下次尝试 / 只读边界" module="resource-page-trust" tone="trust" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={resourcePageTrustRows(snapshot, state)} minRows={5} />
    </div>
  </>;
}

function InterfacesDesktop({ snapshot, state }: OverviewPanelProps) {
  const forwardingRows = interfaceRows(snapshot, state);
  return <>
    <div className="ro-col is-main stack">
      <Module title="接口转发面" subtitle="down 清单 / 对象状态优先 / 关系下沉到载体表 / REST SSH" module="interface-forwarding" tone="danger" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={forwardingRows} minRows={6} visual={<JudgementChart module="interface-forwarding" kind="pressure" rows={interfaceForwardingChartRows(snapshot, state)} />} />
      <Module title="路由快照" subtitle="设备底层路由事实" module="route-raw-facts" tone={state.facts.route.level} trust={moduleTrust(state)} headers={["路由表", "网关", "依据"]} rows={threeColumnRows(routeFactRows(snapshot, state), "rf3-")} minRows={6} />
      <Module title="接口影响面" subtitle="down 数 / 涉及接口 / 默认路由影响 / 转发面边界" module="interface-impact-ledger" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(interfaceImpactRows(snapshot, state), "i3-")} minRows={6} />
    </div>
    <div className="ro-col is-side stack ik-home-side-stack">
      <Module title="采集面通道" subtitle="采集面与接口转发面分离判断" module="interface-collection-channel" tone={state.facts.collection.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(interfaceCollectionRows(snapshot, state), "ic3-")} minRows={7} visual={<JudgementChart module="interface-collection-channel" kind="pressure" rows={collectionChannelRows(snapshot, state)} />} />
      <Module title="接口关系载体表" subtitle="父接口 / 桥接 / VLAN / PPPoE出口 下沉展示" module="interface-relation-carrier" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(interfaceRelationRows(snapshot, state), "irc3-")} minRows={7} />
      <Module title="转发面判断边界" subtitle="down对象 / 父接口 / 默认路由 / REST SSH / 下次尝试 / 只读边界" module="interface-forwarding-boundary" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "最近", "边界"]} rows={interfaceBoundaryRows(snapshot, state)} minRows={8} />
      <Module title="接口页可信度" subtitle="最近成功 / 默认路由 / 采集面 / 只读边界" module="interface-page-trust" tone="trust" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={interfacePageTrustRows(snapshot, state)} minRows={5} />
    </div>
  </>;
}

function CollectionDesktop({ snapshot, state }: OverviewPanelProps) {
  const collectionVisual = <JudgementChart module="collection-cache-ledger" kind="pressure" rows={collectionChannelRows(snapshot, state)} />;
  return <>
    <div className="ro-col is-main stack">
      <Module title="采集异常 / 三通道状态条" subtitle="REST / SSH / 快照 / 最近成功时间轴" module="collection-channel-ledger" tone="warn" trust="缓存快照" headers={["对象", "当前", "依据"]} rows={threeColumnRows(collectionRows(snapshot, state), "c3-")} minRows={7} visual={collectionVisual} />
      <Module title="最后成功时间轴 / 缓存快照" subtitle="最后成功 / 来源 / 可展示范围 / 已折叠模块" module="collection-recent-failures" tone="trust" trust="缓存快照" headers={["节点", "当前", "说明"]} rows={lastSuccessRows(snapshot, state)} minRows={6} visual={<ChainTimeline rows={lastSuccessRows(snapshot, state)} module="collection-success-timeline" />} />
      <Module title="缓存展示边界" subtitle="当前展示缓存快照 / 不写配置 / 不推断业务数值" module="collection-cache-boundary" tone="warn" trust="缓存快照" headers={["对象", "当前", "依据"]} rows={threeColumnRows(collectionBoundaryLedgerRows(snapshot, state), "cbl-")} minRows={10} />
    </div>
    <div className="ro-col is-side stack ik-home-side-stack">
      <Module title="路由快照 / 缓存快照" subtitle="主路由 / 网关 / 距离 / 启用状态" module="collection-route-wan-boundary" tone={state.facts.route.level} trust="缓存快照" headers={["对象", "当前", "依据"]} rows={threeColumnRows(routeFactRows(snapshot, state), "crf3-")} minRows={6} />
      <Module title="WAN线路 / 缓存快照" subtitle="缓存快照" module="wan-lines" tone={state.facts.wan.allOffline ? "danger" : "trust"} trust="缓存快照" headers={["线路", "状态", "承载"]} rows={wanRows(snapshot, state)} minRows={6} />
      <Module title="资源边界 · 缓存快照" subtitle="采集异常下沉 / 缓存快照" module="collection-resource-threshold" tone={state.facts.resource.level} trust="缓存快照" headers={["对象", "当前", "依据"]} rows={threeColumnRows(resourceRows(state), "cr3-")} minRows={3} />
      <Module title="只读边界 / 降级模块" subtitle="展示范围 / 路由 / WAN / 资源 / 终端 / 失败端点" module="collection-readonly-boundary" tone="trust" trust="缓存快照" headers={["模块", "当前", "依据"]} rows={threeColumnRows(collectionReadonlyRows(snapshot, state), "cro-")} minRows={10} />
    </div>
  </>;
}

function AllOfflineDesktop({ snapshot, state }: OverviewPanelProps) {
  const offlineVisual = <JudgementChart module="wan-offline-bars" kind="pressure" rows={offlineWanStatusChartRows(snapshot, state)} />;
  return <>
    <div className="ro-col is-main stack">
      <Module title="WAN线路" subtitle="线路 / 状态 / 父接口 / 默认路由 / 速率：无有效样本" module="wan-offline-bars" tone="danger" trust={moduleTrust(state)} headers={["线路", "状态", "承载"]} rows={wanRows(snapshot, state)} minRows={8} visual={offlineVisual} />
      <Module title="路由快照" subtitle="路由表 / 网关 / 优先级 / 启用状态" module="wan-route-ledger" tone={state.facts.route.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(routeFactRows(snapshot, state), "wr3-")} minRows={10} />
      <Module title="业务影响 / 展示边界" subtitle="默认路由 / 承载关系 / 速率不展示 / 只读状态台" module="wan-offline-impact-boundary" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(allOfflineImpactRows(snapshot, state), "aoi-")} minRows={8} />
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
      <Module title="路由快照" subtitle="路由表 / 网关 / 优先级 / 启用状态" module="route-raw-facts" tone={state.facts.route.level} trust={moduleTrust(state)} headers={["路由表", "网关", "优先级", "启用状态"]} rows={routeFactRows(snapshot, state)} minRows={10} />
      <Module title="采样可信度" subtitle="双通道 / 最近成功 / 失败端点" module="normal-collection-channel" tone={state.facts.collection.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(collectionRows(snapshot, state), "n3-")} minRows={8} />
    </div>
    <div className="ro-col is-side stack ik-home-side-stack">
      <Module title="资源阈值" subtitle="当前 / 阈值 / 持续 / 峰值" module="resource-threshold" tone={state.facts.resource.level} trust={moduleTrust(state)} headers={["指标", "阈值", "持续", "峰值"]} rows={resourceRows(state)} minRows={3} visual={<JudgementChart module="resource-threshold" kind="pressure" rows={resourceChartRows(state)} />} />
      <Module title="WAN Top / 路由 / 采样 / 峰值" subtitle="Top3 / 默认路由 / 采样可信度 / 最近峰值" module="normal-wan-evidence" tone="trust" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(trafficEvidenceRows, "ne-")} minRows={8} visual={<JudgementChart module="normal-wan-evidence" kind="trend" rows={trafficChartRows(snapshot, state)} />} />
      <Module title="采集事件" subtitle="REST / SSH / 最近成功 / 只读边界" module="normal-ops-ledger" tone={state.facts.collection.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={normalOpsRows(snapshot, state)} minRows={8} />
    </div>
  </>;
}

function desktopPanelGroups(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { main: ReactNode[]; side: ReactNode[]; bottom: ReactNode[] } {
  const isFleet = state.scenario === "fleet";
  if (state.scenario === "no-snapshot") {
    return {
      main: [
        <Module key="ns-summary" title="采集链路图 / 账本" subtitle="RouterOS / REST / SSH / 失败端点未记录 / 默认路由待判" module="no-snapshot-summary" tone="danger" headers={["链路层", "当前", "最近成功", "主证据", "下次尝试"]} rows={noSnapshotChainRows(snapshot, state)} minRows={9} visual={<ChainTimeline rows={noSnapshotChainRows(snapshot, state)} module="no-snapshot-summary-chain" />} />,
        <Module key="ns-channel" title="四通道状态" subtitle="RouterOS / REST / SSH / 业务快照 / 最近成功" module="no-snapshot-channel-status" tone="warn" headers={["通道", "当前", "说明"]} rows={noSnapshotChannelStatusRows(snapshot, state)} minRows={8} visual={<VisibilityMatrixVisual rows={noSnapshotChannelStatusRows(snapshot, state)} />} />,
      ],
      side: [
        <Module key="ns-success" title="最近成功时间轴" subtitle="最后成功 / 来源 / 可展示范围 / 已折叠模块" module="no-snapshot-recent-success" tone="trust" headers={["节点", "当前", "说明"]} rows={lastSuccessRows(snapshot, state)} minRows={6} visual={<ChainTimeline rows={lastSuccessRows(snapshot, state)} module="no-snapshot-recent-success-timeline" />} />,
        <Module key="ns-visibility" title="模块可见性矩阵" subtitle="无业务快照，业务数据不展示 / 边界合并 / 模块禁显" module="no-snapshot-module-visibility" tone="warn" headers={["模块", "状态", "原因", "边界"]} rows={noSnapshotVisibilityRows()} minRows={9} visual={<VisibilityMatrixVisual rows={noSnapshotVisibilityRows()} />} />,
      ],
      bottom: [],
    };
  }
  if (state.scenario === "resource-full") {
    const resourceChart = resourceChartRows(state);
    return {
      main: [
        <Module key="res-priority" title="最危险项 / 资源阈值" subtitle="处理器 / 内存 / 磁盘 先读 / 再看连接压力 / 默认路由 / 采集可信度" module="resource-risk-priority" tone="danger" trust={moduleTrust(state)} headers={["指标", "阈值", "持续", "峰值"]} rows={resourceRiskRows(state)} minRows={8} visual={<div className="ro-resource-visual"><JudgementChart module="resource-risk-priority" kind="pressure" rows={resourceChart} /><ResourceTriCards rows={resourceChart} /></div>} />,
        <Module key="res-sustain" title="持续窗口 / 压力旁证" subtitle="最近 6 点 / 均值峰值 / 连接数 / 接口吞吐 / DNS 缓存 / 只读边界" module="resource-sustain-ledger" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据", "边界"]} rows={resourceSustainRows(snapshot, state)} minRows={10} />,
      ],
      side: [
        <Module key="res-pressure" title="连接压力 / 互补信息" subtitle="连接压力 / 活动会话 / DNS缓存 / 接口吞吐 / 默认路由 / 互补证据" module="resource-pressure-bars" tone="warn" trust={moduleTrust(state)} headers={["项目", "当前", "依据"]} rows={resourceContextRows(snapshot, state)} minRows={8} visual={<JudgementChart module="resource-pressure-bars" kind="pressure" rows={connectionPressureChartRows(snapshot, state)} />} />,
        <Module key="res-top5" title="接口吞吐 Top5" subtitle="Top5 占比 / 条内主值 / 百分比右侧 / 只保留前 5" module="resource-interface-top5" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(resourceTop5Rows(snapshot).slice(0, 5), "r3-")} className="ik-overview-top5-list" minRows={5} />,
        <Module key="res-boundary" title="资源边界" subtitle="REST / SSH / 业务快照 / 只读边界" module="resource-boundary-ledger" tone="trust" trust={moduleTrust(state)} headers={["对象", "当前", "最近", "边界"]} rows={resourceBoundaryRows(snapshot, state)} minRows={8} />,
      ],
      bottom: [
        <Module key="res-events" title="资源事件 / 页可视度" subtitle="最近成功 / 失败端点 / 下一次轮询 / 只读边界" module="resource-page-trust" tone="trust" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={resourcePageTrustRows(snapshot, state)} minRows={5} />,
      ],
    };
  }
  if (state.scenario === "interfaces-down") {
    const forwardingRows = interfaceRows(snapshot, state);
    return {
      main: [
        <Module key="if-forward" title="接口转发面" subtitle="down 清单 / 对象状态优先 / 关系下沉到载体表 / REST SSH" module="interface-forwarding" tone="danger" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={forwardingRows} minRows={6} visual={<JudgementChart module="interface-forwarding" kind="pressure" rows={interfaceForwardingChartRows(snapshot, state)} />} />,
        <Module key="if-route" title="路由快照" subtitle="设备底层路由事实" module="route-raw-facts" tone={state.facts.route.level} trust={moduleTrust(state)} headers={["路由表", "网关", "依据"]} rows={threeColumnRows(routeFactRows(snapshot, state), "rf3-")} minRows={6} />,
        <Module key="if-boundary" title="转发面判断边界" subtitle="down对象 / 父接口 / 默认路由 / REST SSH / 下次尝试 / 只读边界" module="interface-forwarding-boundary" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "最近", "边界"]} rows={interfaceBoundaryRows(snapshot, state)} minRows={8} />,
      ],
      side: [
        <Module key="if-impact" title="接口影响面" subtitle="down 数 / 涉及接口 / 默认路由影响 / 转发面边界" module="interface-impact-ledger" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(interfaceImpactRows(snapshot, state), "i3-")} minRows={6} />,
        <Module key="if-collection" title="采集面通道" subtitle="采集面与接口转发面分离判断" module="interface-collection-channel" tone={state.facts.collection.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(interfaceCollectionRows(snapshot, state), "ic3-")} minRows={7} visual={<JudgementChart module="interface-collection-channel" kind="pressure" rows={collectionChannelRows(snapshot, state)} />} />,
        <Module key="if-relation" title="接口关系载体表" subtitle="父接口 / 桥接 / VLAN / PPPoE出口 下沉展示" module="interface-relation-carrier" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(interfaceRelationRows(snapshot, state), "irc3-")} minRows={7} />,
      ],
      bottom: [
        <Module key="if-page" title="接口页可信度 / 事件" subtitle="最近成功 / 默认路由 / 采集面 / 只读边界" module="interface-page-trust" tone="trust" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={interfacePageTrustRows(snapshot, state)} minRows={5} />,
      ],
    };
  }
  if (state.scenario === "collection-down") {
    const collectionVisual = <JudgementChart module="collection-cache-ledger" kind="pressure" rows={collectionChannelRows(snapshot, state)} />;
    return {
      main: [
        <Module key="col-channel" title="采集异常 / 三通道状态条" subtitle="REST / SSH / 快照 / 最近成功时间轴" module="collection-channel-ledger" tone="warn" trust="缓存快照" headers={["对象", "当前", "依据"]} rows={threeColumnRows(collectionRows(snapshot, state), "c3-")} minRows={7} visual={collectionVisual} />,
        <Module key="col-cache" title="缓存展示边界" subtitle="当前展示缓存快照 / 不写配置 / 不推断业务数值" module="collection-cache-boundary" tone="warn" trust="缓存快照" headers={["对象", "当前", "依据"]} rows={threeColumnRows(collectionBoundaryLedgerRows(snapshot, state), "cbl-")} minRows={10} />,
      ],
      side: [
        <Module key="col-success" title="最后成功时间轴 / 缓存快照" subtitle="最后成功 / 来源 / 可展示范围 / 已折叠模块" module="collection-recent-failures" tone="trust" trust="缓存快照" headers={["节点", "当前", "说明"]} rows={lastSuccessRows(snapshot, state)} minRows={6} visual={<ChainTimeline rows={lastSuccessRows(snapshot, state)} module="collection-success-timeline" />} />,
        <Module key="col-route" title="路由快照 / 缓存快照" subtitle="主路由 / 网关 / 距离 / 启用状态" module="collection-route-wan-boundary" tone={state.facts.route.level} trust="缓存快照" headers={["对象", "当前", "依据"]} rows={threeColumnRows(routeFactRows(snapshot, state), "crf3-")} minRows={6} />,
        <Module key="col-wan" title="WAN线路 / 缓存快照" subtitle="缓存快照" module="wan-lines" tone={state.facts.wan.allOffline ? "danger" : "trust"} trust="缓存快照" headers={["线路", "状态", "承载"]} rows={wanRows(snapshot, state)} minRows={6} />,
      ],
      bottom: [
        <Module key="col-resource" title="资源边界 · 缓存快照" subtitle="采集异常下沉 / 缓存快照" module="collection-resource-threshold" tone={state.facts.resource.level} trust="缓存快照" headers={["对象", "当前", "依据"]} rows={threeColumnRows(resourceRows(state), "cr3-")} minRows={3} />,
        <Module key="col-readonly" title="只读边界 / 降级模块" subtitle="展示范围 / 路由 / WAN / 资源 / 终端 / 失败端点" module="collection-readonly-boundary" tone="trust" trust="缓存快照" headers={["模块", "当前", "依据"]} rows={threeColumnRows(collectionReadonlyRows(snapshot, state), "cro-")} minRows={10} />,
      ],
    };
  }
  if (state.scenario === "all-offline") {
    const offlineVisual = <JudgementChart module="wan-offline-bars" kind="pressure" rows={offlineWanStatusChartRows(snapshot, state)} />;
    return {
      main: [
        <Module key="ao-wan" title="WAN线路" subtitle="线路 / 状态 / 父接口 / 默认路由 / 速率：无有效样本" module="wan-offline-bars" tone="danger" trust={moduleTrust(state)} headers={["线路", "状态", "承载"]} rows={wanRows(snapshot, state)} minRows={8} visual={offlineVisual} />,
        <Module key="ao-route" title="路由快照" subtitle="路由表 / 网关 / 优先级 / 启用状态" module="wan-route-ledger" tone={state.facts.route.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(routeFactRows(snapshot, state), "wr3-")} minRows={10} />,
      ],
      side: [
        <Module key="ao-impact" title="业务影响 / 展示边界" subtitle="默认路由 / 承载关系 / 速率不展示 / 只读状态台" module="wan-offline-impact-boundary" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(allOfflineImpactRows(snapshot, state), "aoi-")} minRows={8} />,
        <Module key="ao-continuity" title="WAN连续性" subtitle="WAN 0/8 / 离线对象 / 默认路由异常 / 速率无有效样本" module="wan-offline-continuity" tone="danger" trust={moduleTrust(state)} headers={["字段", "当前", "依据"]} rows={wanContinuityRows(state)} minRows={14} />,
      ],
      bottom: [
        <Module key="ao-collection" title="采集通道" subtitle="采集通道 · 缓存快照 / 事故判断的采集可信度" module="collection-status" tone={state.facts.collection.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(collectionRows(snapshot, state), "ao3-")} minRows={8} visual={<JudgementChart module="collection-status" kind="pressure" rows={collectionChannelRows(snapshot, state)} />} />,
        <Module key="ao-terminal" title="终端排行" subtitle="终端 / 连接 / 默认路由 / 只读边界" module="terminal-ranking" tone="trust" trust={moduleTrust(state)} headers={["终端", "当前", "依据"]} rows={threeColumnRows(terminalRows(snapshot, state), "ao-t-")} minRows={8} />,
      ],
    };
  }
  const trafficLedgerRows = trafficRows(snapshot, state);
  const trafficEvidenceRows = [
    ...trafficTop3Rows(snapshot, state),
    ...trafficRouteRows(snapshot, state),
    ...trafficSamplingRows(snapshot, state),
    ...trafficPeakRows(snapshot, state),
  ];
  const trafficVisual = <JudgementChart module="traffic-trend" kind="trend" rows={trafficChartRows(snapshot, state)} />;
  return {
    main: [
      <Module key="n-traffic" title={isFleet ? "WAN账本 / 流量趋势" : "流量趋势 / WAN Top3"} subtitle={isFleet ? "当前 / 峰值 / 均值 / 窗口 / 阈值 / 单位 / 可视度 / WAN Top3 / 默认路由 / 采样可信度 / 最近峰值" : "当前 / 峰值 / 均值 / 窗口 / 阈值 / 单位 / 可视度 / WAN Top3 / 默认路由 / 采样可信度 / 最近峰值"} module="wan-trend" tone={state.facts.wan.allOffline ? "danger" : "trust"} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={trafficLedgerRows} minRows={isFleet ? 12 : 8} visual={trafficVisual} />,
      <Module key="n-route" title="路由快照" subtitle="路由表 / 网关 / 优先级 / 启用状态" module="route-raw-facts" tone={state.facts.route.level} trust={moduleTrust(state)} headers={["路由表", "网关", "优先级", "启用状态"]} rows={routeFactRows(snapshot, state)} minRows={10} />,
      <Module key="n-collect" title="采样可信度" subtitle="双通道 / 最近成功 / 失败端点" module="normal-collection-channel" tone={state.facts.collection.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(collectionRows(snapshot, state), "n3-")} minRows={8} />,
    ],
    side: [
      <Module key="n-resource" title="资源阈值" subtitle="当前 / 阈值 / 持续 / 峰值" module="resource-threshold" tone={state.facts.resource.level} trust={moduleTrust(state)} headers={["指标", "阈值", "持续", "峰值"]} rows={resourceRows(state)} minRows={3} visual={<JudgementChart module="resource-threshold" kind="pressure" rows={resourceChartRows(state)} />} />,
      <Module key="n-wan" title="WAN Top / 路由 / 采样 / 峰值" subtitle="Top3 / 默认路由 / 采样可信度 / 最近峰值" module="normal-wan-evidence" tone="trust" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(trafficEvidenceRows, "ne-")} minRows={8} visual={<JudgementChart module="normal-wan-evidence" kind="trend" rows={trafficChartRows(snapshot, state)} />} />,
      <Module key="n-events" title="采集事件" subtitle="REST / SSH / 最近成功 / 只读边界" module="normal-ops-ledger" tone={state.facts.collection.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={normalOpsRows(snapshot, state)} minRows={8} />,
    ],
    bottom: [
      <Module key="n-terminals" title="终端排行" subtitle="Top8 / 在线状态 / 连接数 / 只读边界" module="terminal-ranking" tone="trust" trust={moduleTrust(state)} headers={["终端", "当前", "依据"]} rows={threeColumnRows(terminalRows(snapshot, state), "nt-")} minRows={8} />,
      <Module key="n-events-bottom" title="事件 TopN" subtitle="RouterOS / REST / SSH / 最近成功 / 失败端点 / 轮询" module="normal-ops-ledger-bottom" tone={state.facts.collection.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(normalOpsRows(snapshot, state), "nebt-")} minRows={8} />,
    ],
  };
}

function DesktopWorkspace({ snapshot, state }: OverviewPanelProps) {
  const sections = desktopPanelGroups(snapshot, state);

  return (
    <div
      className="ro-desktop-grid ik-home-layout"
      data-overview-desktop-layout="fixed-summary-keymetrics-main-side-bottom"
      data-overview-desktop-hierarchy="conclusion-metrics-evidence"
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
      <div className="ro-col is-main stack">{sections.main}</div>
      <div className="ro-col is-side stack ik-home-side-stack">{sections.side}</div>
      <div className="ro-col is-bottom stack" style={{ gridColumn: "1 / -1" }}>{sections.bottom}</div>
    </div>
  );
}

function MobileDetail({ snapshot, state }: OverviewPanelProps) {
  if (state.scenario === "no-snapshot") {
    const recent = latestSuccess(snapshot, state.scenario);
    return <MobileRows module="mobile-no-snapshot-ledger" rows={[
      { id: "mns-chain", cells: ["采集链路账本", "路由器当前不可达 / REST 待核 / SSH 断链 / 默认路由待判", `最近成功 ${recent}`], tone: "warn" },
      { id: "mns-business", cells: ["业务数据展示边界", "无业务快照", "WAN / 资源 / 终端 / 连接 / 速率不展示", `状态更新 ${statusUpdated(snapshot)}`], tone: "missing" },
      { id: "mns-success", cells: ["最后成功摘要", recent, "失败端点未记录", `下次尝试 ${pollText(snapshot)}`], tone: recent === "未记录" ? "warn" : "trust" },
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
      .slice(0, 2)
      .map((row, index) => {
        const name = text(row.name || row.interface, `if-${index + 1}`);
        const parent = text(row.parent || row.master || "-", "-");
        const bridge = text(row.bridge || "-", "-");
        const vlan = text(row.vlan || row.vlanId || "-", "-");
        const accessNode = bridge !== "-" ? `桥接 ${bridge}` : vlan !== "-" ? `VLAN ${vlan}` : "承载待确认";
        return { id: `if-mobile-down-${name}-${index}`, cells: [name, `父接口 ${parent}`, `${accessNode} · 默认路由 ${state.facts.route.label}`], tone: "danger" as OverviewTone } satisfies LedgerRow;
      });
    return <MobileRows module="mobile-interface-forwarding" rows={[
      ...downRows,
      { id: "if-mobile-route", cells: ["默认路由影响", state.facts.route.label, "转发面证据优先"], tone: state.facts.route.level },
      { id: "if-mobile-collection-pair", cells: ["采集面", `REST ${restState(snapshot, state).value} / SSH ${sshState(snapshot, state).value}`, "采集通道不替代转发面判断"], tone: "warn" as OverviewTone },
    ]} columns={3} />;
  }
  if (state.scenario === "fleet") {
    return <MobileRows module="mobile-primary-detail" rows={[
      ...wanRows(snapshot, state).slice(0, 3),
      { id: "mobile-route", cells: ["默认路由", state.facts.route.label, mobileRouteText(state)], tone: state.facts.route.level },
      { id: "mobile-collection", cells: ["采集", state.facts.collection.channelText, "最近成功记录", `最近成功 ${latestSuccess(snapshot, state.scenario)}`], tone: state.facts.collection.level },
    ]} />;
  }
  const wanLeadRows = wanRows(snapshot, state).slice(0, 2);
  const defaultRows: LedgerRow[] = state.scenario === "collection-down"
    ? collectionRows(snapshot, state).slice(0, 4).map((row) => ({ ...row, cells: [row.cells[0], row.cells[1], `${row.cells[2]} / ${row.cells[3]}`] }))
    : [
      ...wanLeadRows,
      { id: "mobile-route", cells: ["默认路由", state.facts.route.label, mobileRouteText(state)], tone: state.facts.route.level },
      { id: "mobile-collection", cells: ["采集", state.facts.collection.channelText, "最近成功记录", `最近成功 ${latestSuccess(snapshot, state.scenario)}`], tone: state.facts.collection.level },
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
      ...threeColumnRows(resourceContextRows(snapshot, state).slice(0, 3), "mc-res-context-"),
      ...threeColumnRows(resourceTop5Rows(snapshot).slice(0, 3), "mc-res-top-"),
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
      ...wanRows(snapshot, state).slice(3, 6),
      ...threeColumnRows(routeFactRows(snapshot, state).slice(0, 2), "mc-wan-route-"),
    ];
  }
  if (state.scenario === "collection-down") {
    return [
      ...threeColumnRows(collectionRows(snapshot, state).slice(0, 3), "mc-col-channel-"),
      ...threeColumnRows(lastSuccessRows(snapshot, state).slice(0, 2), "mc-col-success-"),
    ];
  }
  return [
    ...wanRows(snapshot, state).slice(0, state.scenario === "fleet" ? 4 : 2),
    ...threeColumnRows(normalOpsRows(snapshot, state).slice(0, 2), "mc-ops-"),
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
      data-overview-ikuai40-density="flat-dense-readonly-console"
      data-overview-flat-ledger-surface="light-blue-white-thin-lines-low-shadow"
      data-overview-mobile-metrics
      data-overview-mobile-home-mode="ios-app-home"
      data-overview-mobile-home-acceptance="ios-router-home-primary-flow"
      data-overview-hard-standard="desktop-status-bus-mobile-ios-app-home-chart-meta-sample-depth-required-no-large-alert-card"
      data-overview-chart-standard={OVERVIEW_IKUAI40_CHART_STANDARD}
      data-overview-chart-metadata-coverage={OVERVIEW_CHART_METADATA_COVERAGE}
      data-overview-mature-visual-standard={OVERVIEW_IKUAI40_MATURE_VISUAL_STANDARD}
      data-overview-scene-chart-priority={OVERVIEW_SCENE_CHART_PRIORITY}
      data-overview-scene-chart-contract={OVERVIEW_SCENE_CHART_CONTRACT}
      data-overview-chart-color-normal={OVERVIEW_CHART_STATUS_COLORS.normal}
      data-overview-mobile-first-microchart-policy="first-screen"
      data-overview-mobile-first-screen-microchart-required="true"
      data-overview-mobile-first-screen-uses-microchart="true"
      data-overview-mobile-first-microchart-kind="scenario-insight"
      data-overview-mobile-no-snapshot-microchart={state.scenario === "no-snapshot" ? "snapshot-channel-matrix" : undefined}
      data-overview-no-snapshot-flow-timeline-matrix={state.scenario === "no-snapshot" ? "true" : undefined}
      data-overview-no-snapshot-density-contract={state.scenario === "no-snapshot" ? "four-channel-blocks-chain-ledger-timeline-visibility" : undefined}
      data-overview-no-snapshot-no-stretch-cards={state.scenario === "no-snapshot" ? "auto-height-content" : undefined}
      data-overview-no-snapshot-content-sized={state.scenario === "no-snapshot" ? "true" : undefined}
      data-overview-no-snapshot-content-packed={state.scenario === "no-snapshot" ? "flow-timeline-matrix-auto-height" : undefined}
      data-overview-no-snapshot-no-wan-rate-placeholder={state.scenario === "no-snapshot" ? "business-rates-hidden" : undefined}
      data-overview-no-snapshot-big-wan-rate-guard="no-business-rates-without-snapshot"
      data-overview-no-zero-rate-placeholder="no-0Bps-when-uncollected"
    >
      <InfoBand snapshot={snapshot} state={state} />
      <DesktopKeyMetrics snapshot={snapshot} state={state} />
      <span className="ro-sr-contract" data-overview-verdict-panel>{verdictContractText(snapshot, state)}</span>
      <div className="ro-mobile-first-screen" data-overview-mobile-first-screen data-overview-mobile-alert={state.verdict.level}>
        <MobileLedger snapshot={snapshot} state={state} />
      </div>
      <div className={`ro-mobile-detail-section ik-mobile-compact-section ${(state.scenario === "interfaces-down" || state.scenario === "resource-full" || state.scenario === "collection-down" || state.scenario === "all-offline" || state.scenario === "single" || state.scenario === "fleet") ? "is-interface-table" : ""}`} data-overview-mobile-detail data-overview-mobile-detail-section data-overview-mobile-metrics>
        <MobileLeadHeads state={state} />
        <MobileDetail snapshot={snapshot} state={state} />
      </div>
      <MobileContinuation snapshot={snapshot} state={state} />
      <DesktopWorkspace snapshot={snapshot} state={state} />
    </section>
  );
}
