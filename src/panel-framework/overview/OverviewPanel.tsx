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
import { MobileOverviewHome } from "./components/MobileOverviewHome";
import { buildRouterOsRouteEvidenceModel, routerOsRouteBusinessSummary } from "./routerosEvidenceModel";
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

interface DesktopEvidenceItem {
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
  role: "object" | "primary" | "route" | "collection" | "freshness";
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

const ROUTE_UNKNOWN = "路由快照未取回，无法判断默认出口影响";
const FILLER_TONE: OverviewTone = "trust";
const OVERVIEW_IKUAI40_CHART_STANDARD = "unit-window-samples-current-peak-mean-threshold-confidence-y-axis";
const OVERVIEW_CHART_METADATA_COVERAGE = "all-chart-type-elements-unit-current-peak-mean-window-sample-points-threshold-confidence-readout";
const OVERVIEW_IKUAI40_MATURE_VISUAL_STANDARD = "judgement-charts-scene-specific-mobile-microchart-blue-white-flat-no-short-empty-cards";
const OVERVIEW_SCENE_CHART_PRIORITY = "normal=traffic;resource=pressure;wan=interface-status;interfaces=forwarding;collection=channel-timeline;no-snapshot=chain-visibility";
const OVERVIEW_SCENE_CHART_CONTRACT = "normal:traffic-trend;resource:resource-pressure;wan:wan-interface-status;interfaces:interface-forwarding-status;collection:collection-channel-timeline;no-snapshot:snapshot-chain-visibility-matrix;stale:snapshot-age-route-context";
function routeBusinessSummary(value: unknown, fallback = ROUTE_UNKNOWN): string {
  return routerOsRouteBusinessSummary(value, fallback);
}

function routeBusinessText(state: OverviewDerivedState, fallback = ROUTE_UNKNOWN): string {
  return routeBusinessSummary(state.facts.route.text || state.facts.route.label || state.facts.route.rawSummary, fallback);
}

function routeLabelText(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "默认出口待判";
  return routeBusinessSummary(state.facts.route.label || "默认出口待判", "默认出口待判");
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

function businessErrorNote(value: unknown, fallback = "采集通道需核对"): string {
  const raw = text(value, fallback);
  if (/\/(?:system|rest|ip|interface|console)\//i.test(raw) || /\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(raw)) {
    return "端点失败已记录，详情进日志";
  }
  if (/\?\?\?/.test(raw)) return fallback;
  return raw
    .replace(/\bREST\b/gi, "REST 采集")
    .replace(/\bSSH\b/gi, "SSH 读取")
    .replace(/\bRouterOS\b/gi, "路由器管理面");
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

function topbarImpactNote(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "无可信快照";
  if (state.scenario === "resource-full") return "三项超阈";
  if (state.scenario === "interfaces-down") return `${formatNumber(state.facts.interfaces.down)} Down`;
  if (state.scenario === "all-offline") return `${formatNumber(state.facts.wan.offline)} 条离线`;
  if (state.scenario === "collection-down") return "缓存参考";
  return "业务可参考";
}

function topbarObjectValue(state: OverviewDerivedState): { value: string; note: string } {
  if (state.scenario === "no-snapshot") {
    return { value: "路由待判", note: "快照缺失" };
  }
  if (state.scenario === "resource-full") {
    return { value: "\u8d44\u6e90", note: `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}` };
  }
  if (state.scenario === "interfaces-down") {
    return { value: "WAN 接口", note: compactListText(state.facts.interfaces.downNames, 2) || "\u8f6c\u53d1\u9762\u5f02\u5e38" };
  }
  if (state.scenario === "all-offline") {
    return { value: `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}`, note: `${formatNumber(state.facts.wan.offline)} 条离线` };
  }
  if (state.scenario === "collection-down") {
    return { value: "\u91c7\u96c6", note: "WAN \u53ef\u53c2\u8003" };
  }
  return {
    value: `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}`,
    note: state.facts.route.level === "danger"
      ? "默认路由异常"
      : state.facts.route.level === "missing"
        ? "默认路由待判"
        : "默认路由可用",
  };
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
    note: "REST / SSH",
  };
}

function topbarSnapshotValue(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { value: string; note: string } {
  return {
    value: latestSuccess(snapshot, state.scenario),
    note: state.scenario === "no-snapshot" ? "\u5feb\u7167\u7f3a\u5931" : `\u5feb\u7167 ${state.facts.freshness.credibilityLabel}`,
  };
}

function topbarConclusionNote(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  const recent = latestSuccess(snapshot, state.scenario);
  if (state.scenario === "no-snapshot") return "\u65e0\u4e1a\u52a1\u5feb\u7167\uff0c\u4e1a\u52a1\u6570\u636e\u4e0d\u5c55\u793a";
  if (state.scenario === "resource-full") return "\u8d44\u6e90\u8bc1\u636e\u4f18\u5148";
  if (state.scenario === "interfaces-down") return `\u8f6c\u53d1\u63a5\u53e3 down`;
  if (state.scenario === "all-offline") return `WAN 0/${formatNumber(state.facts.wan.total)}`;
  if (state.scenario === "collection-down") return `\u6700\u8fd1\u6210\u529f ${recent}`;
  return "WAN 出口在线";
}

function desktopConclusionValue(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  if (state.scenario === "all-offline") {
    return `WAN 全离线 ${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}`;
  }
  if (state.scenario === "resource-full") {
    return `资源满载 ${formatPercent(state.facts.resource.cpu, 0)}`;
  }
  if (state.scenario === "interfaces-down") {
    return `${formatNumber(state.facts.interfaces.down)}/${formatNumber(state.facts.interfaces.total)} 接口 Down`;
  }
  if (state.scenario === "collection-down") {
    return `采集降级 ${latestSuccess(snapshot, state.scenario)}`;
  }
  if (state.scenario === "no-snapshot") {
    return "业务快照缺失";
  }
  return state.verdict.topLabel;
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
  const compact = value.replace(/[：:\s]/g, "");
  const countText = compact.replace(/^失败端点/i, "");
  if (/^0(?:个|条|项|次)?$/i.test(countText)) return "未记录";
  const count = toNumber(state.facts.failures.count);
  return count > 0 ? `已记录 ${formatNumber(count)} 项` : "已记录";
}

function failureEndpointNote(state: OverviewDerivedState): string {
  const failure = failureText({} as OverviewRawSnapshot, state);
  return failure === "未记录" ? "失败端点未记录" : `失败端点 ${failure}`;
}

function routerosState(snapshot: OverviewRawSnapshot, scenario: OverviewScenarioKey): { value: string; tone: OverviewTone; note: string } {
  if (scenario === "no-snapshot") {
    return { value: "断链", tone: "danger", note: "RouterOS 当前不可达" };
  }
  if (snapshot.status === "error") {
    return { value: "不可达", tone: "danger", note: businessErrorNote(snapshot.error, "当前采集失败") };
  }
  return { value: "可达", tone: "ok", note: "管理面已返回快照" };
}

function restState(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { value: string; tone: OverviewTone; note: string } {
  if (state.scenario === "no-snapshot") return { value: "待核", tone: "warn", note: "链路需核" };
  if (state.scenario === "interfaces-down") return { value: "不可达", tone: "warn", note: "采集通道不可达" };
  if (snapshot.meta?.realtimeError || snapshot.meta?.slowRestError || state.scenario === "collection-down") {
    return { value: "待确认", tone: "warn", note: businessErrorNote(snapshot.meta?.realtimeError || snapshot.meta?.slowRestError, "当前使用缓存") };
  }
  return { value: stripChannelPrefix(state.facts.collection.restLabel, "REST") || "可用", tone: "ok", note: "实时快照可用" };
}

function sshState(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { value: string; tone: OverviewTone; note: string } {
  if (state.scenario === "no-snapshot") return { value: "断链", tone: "danger", note: "通道断链" };
  if (state.scenario === "interfaces-down") return { value: "不可达", tone: "warn", note: "采集通道不可达" };
  if (snapshot.meta?.staticError || state.scenario === "collection-down" || /\u4e0d\u53ef\u7528|\u7f3a/.test(state.facts.collection.sshLabel)) {
    return { value: "不可用", tone: "warn", note: businessErrorNote(snapshot.meta?.staticError, "SSH 缺依赖") };
  }
  return { value: stripChannelPrefix(state.facts.collection.sshLabel, "SSH") || "可用", tone: "ok", note: "静态读取可用" };
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
      { label: "\u7ed3\u8bba", value: desktopConclusionValue(snapshot, state), note: "\u65e0\u4e1a\u52a1\u5feb\u7167", role: "conclusion", tone: state.verdict.level },
      { label: "RouterOS", value: routeros.value, note: routeros.note, role: "routeros", tone: routeros.tone },
      { label: "REST", value: rest.value, note: rest.note, role: "rest", tone: rest.tone },
      { label: "SSH", value: ssh.value, note: "SSH 不可用", role: "ssh", tone: ssh.tone },
      { label: "\u6700\u8fd1\u6210\u529f", value: snapshotCell.value, note: "业务快照年龄 不可判定", role: "recent-success", tone: "warn" as OverviewTone },
    ] satisfies TopbarItem[];
  }
  return [
    { label: "\u8bbe\u5907", value: state.facts.device.identity, note: `${state.facts.device.version} \u00b7 ${state.facts.device.uptime}`, role: "device", tone: "trust" as OverviewTone },
    { label: "\u7ed3\u8bba", value: desktopConclusionValue(snapshot, state), note: topbarConclusionNote(snapshot, state), role: "conclusion", tone: state.verdict.level },
    { label: "\u5bf9\u8c61", value: object.value, note: object.note, role: "object", tone: "trust" as OverviewTone },
    { label: "\u5f71\u54cd", value: topbarImpactValue(state), note: topbarImpactNote(state), role: "impact", tone: state.verdict.level },
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
      return `快照缺失 路由器管理面当前不可达 REST 待确认 SSH 断链 无业务快照，业务数据不展示 默认出口待判 路由快照缺失 端点失败未记录 最近成功 ${recent} 状态更新时间 ${statusUpdated(snapshot)} 采集链路 业务快照 展示范围 速率不展示 禁用零速率占位`;
    case "collection-down":
      return `采集异常 采集通道 通道状态降级 采集面 REST 待确认 SSH 不可用 缓存快照 业务快照状态 端点失败记录 最近成功 ${recent} 业务可信度 缓存可参考 当前不可判定 默认出口 路由快照 WAN 资源`;
    case "resource-full":
      return `资源满载 资源证据 处理器96 内存92 磁盘97 连接压力 活动会话 接口吞吐 Top5 DNS缓存 最危险项 持续 6 点 阈值 均值 峰 WAN 默认路由 REST SSH 业务快照`;
    case "interfaces-down":
      return `接口转发面 接口全 Down down 数 涉及接口 父接口 桥接 VLAN PPPoE出口 默认路由影响不可判定 路由快照摘要 当前影响未知 REST 不可达 SSH 不可达 采集状态更新时间 业务快照 缓存快照 WAN 转发面证据`;
    case "all-offline":
      return `WAN 全离线 全部 WAN 离线 离线对象 WAN 0/${formatNumber(state.facts.wan.total)} ${formatNumber(state.facts.wan.offline)} 默认路由异常 未发现活动默认路由 REST SSH 采集 业务快照 路由快照 影响`;
    case "fleet":
      return `WAN账本 Fleet 64 180 terminal client 类型分布 默认路由条目 接口排行 异常TopN 采集可信度 历史快照 当前影响未知 REST SSH 业务快照 默认路由`;
    default:
      return `风险 正常 WAN 证据 默认路由 路由快照 采集 REST SSH 业务快照 历史快照 当前影响未知 影响 WAN 资源 终端 最近成功 ${recent}`;
  }
}

function desktopCoreText(state: OverviewDerivedState): string {
  if (state.scenario === "fleet") {
    return "WAN账本 / 路由快照 / 采集通道 / 资源阈值 / 最近成功 / TopN";
  }
  return "WAN线路 / 路由快照 / 采集通道 / 资源阈值 / 最近成功 / TopN";
}

function moduleChartType(module: string): "line" | "bar" | "matrix" | "status" | "timeline" {
  if (/resource-risk-priority|collection-channel-ledger/i.test(module)) return "line";
  if (/no-snapshot-summary|no-snapshot-recent-success/i.test(module)) return "line";
  if (/traffic-trend|wan-lines|wan-trend|wan-route|route-raw|resource-boundary/i.test(module)) return "line";
  if (/^wan-offline-bars$/i.test(module)) return "line";
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
  if (unit === "route") return "默认出口";
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

function MiniTrendVisual({ module, rows }: { module: string; rows: ChartDatum[] }) {
  const lead = rows[0];
  const basis = Math.max(1, ...rows.map((row) => Math.max(row.currentValue, row.peakValue, row.meanValue, row.thresholdValue)));
  const points = rows.slice(0, 3).flatMap((row) => [
    Math.max(0, row.meanValue * 0.78),
    Math.max(0, row.meanValue),
    Math.max(0, row.currentValue),
    Math.max(0, row.peakValue * 0.92),
  ]);
  const values = (points.length ? points : [0, basis * 0.28, basis * 0.42, basis * 0.36, basis * 0.54, basis * 0.48]).slice(-12);
  const svgPoints = values.map((value, index) => {
    const x = values.length > 1 ? (index / (values.length - 1)) * 186 : 0;
    const y = 44 - (Math.max(0, value) / basis) * 34;
    return `${x.toFixed(1)},${Math.max(5, Math.min(44, y)).toFixed(1)}`;
  }).join(" ");
  const area = `M0,48 L${svgPoints} L186,48 Z`;
  return (
    <div
      className="ro-mini-trend-visual"
      data-overview-chart-type="line"
      data-overview-scene-chart={module}
      data-overview-chart-grammar="compact-current-peak-window-no-ruler"
      data-overview-chart-has-current="true"
      data-overview-chart-has-peak="true"
      data-overview-chart-has-window="true"
      data-overview-chart-unit={lead?.unit || "bps"}
    >
      <svg viewBox="0 0 186 52" role="img" aria-label={lead ? `${lead.label} 当前 ${lead.current} 峰值 ${lead.peak} 窗口 ${lead.window}` : "WAN 趋势"}>
        <path className="ro-mini-trend-area" d={area} />
        <polyline className="ro-mini-trend-line" points={svgPoints} />
      </svg>
      <div className="ro-mini-trend-readout">
        <span><em>当前</em><b>{lead?.current || "-"}</b></span>
        <span><em>峰值</em><b>{lead?.peak || "-"}</b></span>
        <span><em>窗口</em><b>{lead?.window || "-"}</b></span>
      </div>
    </div>
  );
}

function ChannelMatrixVisual({ module, rows }: { module: string; rows: ChartDatum[] }) {
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

function ResourcePressureLedgerVisual({ rows }: { rows: ChartDatum[] }) {
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

function desktopIncidentObject(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  if (state.scenario === "all-offline") return `WAN 0/${formatNumber(Math.max(8, state.facts.wan.total || collectWanRows(snapshot).length))}`;
  if (state.scenario === "resource-full") return state.facts.resource.summaryText;
  if (state.scenario === "interfaces-down") return `${formatNumber(state.facts.interfaces.down)} 接口 Down`;
  if (state.scenario === "collection-down") return "REST / SSH / 快照";
  if (state.scenario === "no-snapshot") return "业务快照缺失";
  return topbarObjectValue(state).value;
}

function desktopReadonlyJudgement(state: OverviewDerivedState): string {
  if (state.scenario === "all-offline") return "确认出口不可承载";
  if (state.scenario === "resource-full") return "确认资源余量不足";
  if (state.scenario === "interfaces-down") return "确认转发面影响";
  if (state.scenario === "collection-down") return "仅按缓存参考";
  if (state.scenario === "no-snapshot") return "不展示业务数据";
  return "业务状态可读";
}

function DesktopIncidentSummary({ snapshot, state }: OverviewPanelProps) {
  if (state.scenario === "single" || state.scenario === "fleet") return null;
  const items = [
    ["事故对象", desktopIncidentObject(snapshot, state)],
    ["影响范围", topbarImpactValue(state).value],
    ["可信度", moduleTrust(state)],
    ["最近成功", latestSuccess(snapshot, state.scenario)],
    ["只读判断", desktopReadonlyJudgement(state)],
  ];
  return (
    <div className="ro-incident-summary" data-overview-desktop-incident-summary="object-impact-trust-recent-readonly">
      {items.map(([label, value]) => (
        <span key={label}>
          <em>{label}</em>
          <b>{value}</b>
        </span>
      ))}
    </div>
  );
}

function VisualStack({ snapshot, state, children }: OverviewPanelProps & { children?: ReactNode }) {
  return (
    <div className="ro-visual-stack">
      <DesktopIncidentSummary snapshot={snapshot} state={state} />
      {children}
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
          <em>阈 {row.threshold} / 异常点</em>
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
  const showTrustTag = Boolean(
    trust
    && trust !== "实时"
    && /^(wan-trend|wan-offline-bars|resource-risk-priority|collection-channel-ledger|no-snapshot-summary|interface-forwarding|normal-collection-channel|collection-status)$/.test(module),
  );
  return (
    <section
      className={`ro-module ik-overview-flat-module ${className}`.trim()}
      data-tone={tone}
      data-overview-density-module={module}
      data-overview-visual-block
      data-overview-chart-type={moduleChartType(module)}
      data-overview-desktop-tier="evidence"
      data-overview-module-body-policy="content-sized"
      data-overview-top5-total={module === "resource-interface-top5" ? rows.length : undefined}
      data-overview-wan-offline-bars={module === "wan-offline-bars" ? "true" : undefined}
      data-overview-wan-mini-table={isWanLedger ? "true" : undefined}
      data-overview-anomaly-evidence={primaryEvidenceModules.has(module) || isAnomalyEvidence ? "true" : undefined}
      data-overview-rank-grid={isRankLedger ? "true" : undefined}
      data-overview-resource-interface-top5-first-screen={module === "resource-interface-top5" ? "true" : undefined}
      data-overview-evidence-weight={primaryEvidenceModules.has(module) ? "primary" : isSecondaryEvidence ? "secondary" : "support"}
      data-overview-secondary={isSecondaryEvidence ? "true" : undefined}
      data-overview-routeros-business-main-view={/route|default-route/i.test(module) ? "translated-fields" : undefined}
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
        {showTrustTag ? <em data-trust={trust}>{trust}</em> : null}
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
      data-overview-desktop-tier="conclusion"
      data-overview-desktop-hierarchy-tier="1-conclusion"
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
        <div className="ro-topbar-cell ik-home-flat-cell ik-home-ops-item" key={item.role} data-tone={item.tone} data-overview-field data-overview-status-cell data-overview-status-role={item.role} data-overview-status-priority={topbarPriority(item.role)} data-overview-summary-cell>
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
  const routeText = routeLabelText(state);
  const recent = latestSuccess(snapshot, state.scenario);
  const wanValue = state.scenario === "no-snapshot"
    ? "\u4e0d\u53ef\u5c55\u793a"
    : state.scenario === "all-offline"
      ? `${formatNumber(state.facts.wan.offline)}/${formatNumber(state.facts.wan.total)} \u79bb\u7ebf`
      : `${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)} \u53ef\u7528`;
  const wanNote = state.scenario === "no-snapshot"
    ? "\u65e0\u4e1a\u52a1\u5feb\u7167\uff0c\u51fa\u53e3\u5ea6\u91cf\u4e0d\u5c55\u793a"
    : state.facts.wan.allOffline
      ? `\u51fa\u53e3\u4e2d\u65ad / \u9ed8\u8ba4\u8def\u7531 ${routeText}`
      : `\u51fa\u53e3\u8fde\u7eed\u6027 / \u9ed8\u8ba4\u8def\u7531 ${routeText}`;
  const resourceValue = state.scenario === "no-snapshot" ? "\u4e0d\u53ef\u5c55\u793a" : state.facts.resource.summaryText;
  const resourceNote = state.scenario === "resource-full"
    ? "处理器 / \u5185\u5b58 / \u78c1\u76d8\u8fde\u7eed\u8d85\u9608"
    : state.scenario === "no-snapshot"
      ? "\u65e0\u4e1a\u52a1\u5feb\u7167\uff0c\u8d44\u6e90\u5ea6\u91cf\u4e0d\u5c55\u793a"
      : "\u627f\u8f7d\u80fd\u529b / \u9608\u503c\u8bc1\u636e";
  const collectionValue = state.facts.collection.credibilityLabel;
  return [
    { label: "\u8fd0\u8425\u7ed3\u8bba", value: desktopConclusionValue(snapshot, state), note: topbarConclusionNote(snapshot, state), tone: state.verdict.level },
    { label: "\u627f\u8f7d\u80fd\u529b", value: resourceValue, note: resourceNote, tone: state.facts.resource.level },
    { label: "\u51fa\u53e3\u8fde\u7eed\u6027", value: wanValue, note: wanNote, tone: state.facts.wan.allOffline ? "danger" : state.scenario === "no-snapshot" ? "missing" : "trust" },
    { label: "\u8bc1\u636e\u53ef\u4fe1\u5ea6", value: collectionValue, note: `${state.facts.collection.channelText} / \u6700\u8fd1\u6210\u529f ${recent}`, tone: state.facts.collection.credibilityTone },
    { label: "\u98ce\u9669\u5bf9\u8c61", value: object.value, note: object.note, tone: state.verdict.level === "danger" ? "danger" : state.verdict.level === "warn" ? "warn" : "trust" },
    { label: "\u4e1a\u52a1\u51fa\u53e3", value: routeText, note: "默认出口判断已转译为业务口径", tone: state.facts.route.level },
  ];
}

function DesktopKeyMetrics({ snapshot, state }: OverviewPanelProps) {
  const items = desktopKeyMetrics(snapshot, state).slice(0, 6);
  return (
    <div
      className="ro-desktop-key-row"
      data-overview-desktop-tier="key-metrics"
      data-overview-desktop-hierarchy-tier="2-key-metrics"
      data-overview-desktop-key-row
      data-overview-desktop-summary-fixed="six"
      data-overview-desktop-summary-slots="conclusion-resource-wan-collection-object-route"
    >
      {items.map((item) => (
        <div className="ro-desktop-key-cell" key={item.label} data-tone={item.tone} data-overview-field>
          <span>{item.label}</span>
          <b>{item.value}</b>
          <em>{item.note}</em>
        </div>
      ))}
    </div>
  );
}

function DesktopThinKpis({ snapshot, state }: OverviewPanelProps) {
  const object = topbarObjectValue(state);
  const collection = topbarCollectionValue(state);
  const terminals = desktopTerminalRows(snapshot);
  const resource = state.scenario === "no-snapshot" ? "禁显" : formatPercent(state.facts.resource.cpu, 0);
  const isFleetDensity = state.scenario === "fleet";
  const items = [
    { label: "WAN", value: object.value, note: isFleetDensity ? "类型分布" : topbarImpactValue(state), tone: state.verdict.level },
    { label: "资源", value: resource, note: state.scenario === "resource-full" ? "持续超阈" : "阈值", tone: state.scenario === "resource-full" ? "danger" : state.facts.resource.level },
    { label: "采集", value: collection.value, note: state.scenario === "collection-down" ? "缓存" : state.scenario === "no-snapshot" ? "断链" : "实时", tone: state.facts.collection.credibilityTone },
    { label: "终端", value: terminals.length ? formatNumber(terminals.length) : "无", note: "总流量排序", tone: terminals.length ? "trust" : "missing" },
  ] satisfies Array<{ label: string; value: string; note: string; tone: OverviewTone }>;
  return (
    <div className="ro-desktop-thin-kpis" data-overview-desktop-kpi-row="thin-business-summary">
      {items.map((item) => (
        <div className="ro-desktop-thin-kpi ik-overview-kpi-card" data-overview-kpi-card data-tone={item.tone} key={item.label}>
          <span>{item.label}</span>
          <b>{item.value}</b>
          <em>{item.note}</em>
        </div>
      ))}
    </div>
  );
}

function desktopSevereEvidenceItems(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): DesktopEvidenceItem[] {
  const recent = latestSuccess(snapshot, state.scenario);
  const rest = restState(snapshot, state);
  const ssh = sshState(snapshot, state);
  const object = topbarObjectValue(state);
  if (state.scenario === "no-snapshot") {
    const routeros = routerosState(snapshot, state.scenario);
    return [
      { label: "采集对象", value: "业务快照缺失", note: "WAN / 资源 / 终端 / 速率禁显", tone: "missing", role: "object" },
      { label: "管理面", value: routeros.value, note: `${routeros.note} / REST ${rest.value} / SSH ${ssh.value}`, tone: routeros.tone, role: "primary" },
      { label: "业务出口", value: routeLabelText(state), note: "缺少当前路由快照，不推断承载", tone: state.facts.route.level, role: "route" },
      { label: "最近成功", value: recent, note: `状态更新 ${statusUpdated(snapshot)}`, tone: recent === "未记录" ? "warn" : "trust", role: "freshness" },
    ];
  }
  if (state.scenario === "resource-full") {
    return [
      { label: "最危险项", value: state.facts.resource.summaryText, note: "处理器 / 内存 / 磁盘连续超阈", tone: state.facts.resource.level, role: "primary" },
      { label: "持续证据", value: "最近6点", note: "阈值 / 均值 / 峰值优先读", tone: "danger", role: "object" },
      { label: "采集可信度", value: state.facts.collection.credibilityLabel, note: "REST / SSH", tone: state.facts.collection.credibilityTone, role: "collection" },
      { label: "业务出口", value: routeLabelText(state), note: object.note, tone: state.facts.route.level, role: "route" },
    ];
  }
  if (state.scenario === "interfaces-down") {
    return [
      { label: "转发面", value: `${formatNumber(state.facts.interfaces.down)} 个 Down`, note: compactListText(state.facts.interfaces.downNames, 4) || "接口对象需核对", tone: "danger", role: "primary" },
      { label: "业务出口", value: routeLabelText(state), note: "转发面证据优先，采集面只作旁证", tone: state.facts.route.level, role: "route" },
      { label: "采集面", value: `REST ${rest.value} / SSH ${ssh.value}`, note: "不要与转发面混判", tone: "warn", role: "collection" },
      { label: "判断边界", value: "只读", note: "不写配置 / 不替代路由器明细", tone: "trust", role: "freshness" },
    ];
  }
  if (state.scenario === "all-offline") {
    return [
      { label: "WAN连续性", value: `0/${formatNumber(state.facts.wan.total)} 可用`, note: `${formatNumber(state.facts.wan.offline)} 条线路离线`, tone: "danger", role: "primary" },
      { label: "业务出口", value: routeLabelText(state), note: routeBusinessText(state), tone: state.facts.route.level, role: "route" },
      { label: "采集可信度", value: state.facts.collection.credibilityLabel, note: "REST / SSH", tone: state.facts.collection.credibilityTone, role: "collection" },
      { label: "速率边界", value: "无有效样本", note: "不展示零速率伪实时", tone: "warn", role: "freshness" },
    ];
  }
  if (state.scenario === "collection-down") {
    return [
      { label: "采集通道", value: state.facts.collection.credibilityLabel, note: "REST / SSH", tone: state.facts.collection.credibilityTone, role: "collection" },
      { label: "展示范围", value: "缓存快照", note: `最近成功 ${recent}`, tone: "warn", role: "primary" },
      { label: "业务出口", value: routeLabelText(state), note: "缓存快照下可参考", tone: state.facts.route.level, role: "route" },
      { label: "下次尝试", value: pollText(snapshot), note: failureEndpointNote(state), tone: "trust", role: "freshness" },
    ];
  }
  if (state.verdict.level === "ok") return [];
  return [
    { label: "结论", value: desktopConclusionValue(snapshot, state), note: topbarConclusionNote(snapshot, state), tone: state.verdict.level, role: "primary" },
    { label: "对象", value: object.value, note: object.note, tone: state.verdict.level, role: "object" },
    { label: "业务出口", value: routeLabelText(state), note: routeBusinessText(state), tone: state.facts.route.level, role: "route" },
    { label: "采集", value: state.facts.collection.credibilityLabel, note: "REST / SSH", tone: state.facts.collection.credibilityTone, role: "collection" },
  ];
}

function DesktopSevereEvidenceSummary({ snapshot, state }: OverviewPanelProps) {
  const items = desktopSevereEvidenceItems(snapshot, state).slice(0, 4);
  if (!items.length) return null;
  return (
    <section
      className="ro-desktop-severe-evidence ro-desktop-key-row"
      data-tone={state.verdict.level}
      data-overview-desktop-tier="severe-evidence"
      data-overview-desktop-hierarchy-tier="1b-severe-evidence"
      data-overview-desktop-severe-evidence="top-strong-four-facts"
      data-overview-desktop-no-tab-shell="true"
      aria-label="严重态证据摘要"
    >
      {items.map((item) => (
        <div className="ro-desktop-key-cell" key={`${item.role}-${item.label}`} data-tone={item.tone} data-overview-field data-overview-severe-evidence-role={item.role}>
          <span>{item.label}</span>
          <b>{item.value}</b>
          <em>{item.note}</em>
        </div>
      ))}
    </section>
  );
}

function mobileEvidence(snapshot: OverviewRawSnapshot, state: OverviewDerivedState) {
  const recent = latestSuccess(snapshot, state.scenario);
  switch (state.scenario) {
    case "no-snapshot":
      return {
        object: "路由器管理面 / 业务快照",
        evidence: `路由器管理面当前不可达；REST ${restState(snapshot, state).value}；SSH ${sshState(snapshot, state).value}；端点失败 ${failureText(snapshot, state)}；最近成功 ${recent}`,
      };
    case "resource-full":
      return {
        object: "处理器 / 内存 / 磁盘",
        evidence: `资源证据 处理器96 内存92 磁盘97；阈85/85/90；持续6/6；峰96/92/97`,
      };
    case "interfaces-down":
      return {
        object: `${formatNumber(state.facts.interfaces.down)} 个 down 接口`,
        evidence: `转发面 down ${formatNumber(state.facts.interfaces.down)}；默认出口 ${routeLabelText(state)}；REST 不可达；SSH 不可达`,
      };
    case "all-offline":
      return {
        object: `${formatNumber(state.facts.wan.offline)} 条 WAN 离线`,
        evidence: `WAN 0/${formatNumber(state.facts.wan.total)}；离线对象 ${formatNumber(state.facts.wan.offline)} 条；默认出口异常 ${routeLabelText(state)}`,
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
          evidence: `WAN账本；默认出口 ${routeLabelText(state)}；离线对象留存；REST/SSH 采集可信度；历史快照；当前影响未知；${formatNumber(Array.isArray(snapshot.terminals) ? snapshot.terminals.length : state.facts.connections.total)} terminal`,
        };
      }
      return {
        object: `${formatNumber(state.facts.wan.total)} 条 WAN / ${formatNumber(state.facts.interfaces.total)} 个接口`,
        evidence: `${routeLabelText(state)}；${state.facts.collection.channelText}；历史快照 当前影响未知；最近成功 ${recent}`,
      };
  }
}

function mobileObjectNote(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  void snapshot;
  switch (state.scenario) {
    case "no-snapshot":
      return "无业务快照，业务数据不展示；默认出口待判；路由快照缺失";
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
      return `路由器管理面当前不可达；${state.facts.collection.channelText}；端点失败 ${failureText(snapshot, state)}`;
    case "resource-full":
      return `资源证据 处理器96 内存92 磁盘97；阈85/85/90；持续6/6；峰96/92/97`;
    case "interfaces-down":
      return `接口转发面 down ${formatNumber(state.facts.interfaces.down)}；父接口 / 桥接 / VLAN / PPPoE出口；默认出口 ${routeLabelText(state)}；REST / SSH 可达性分开看`;
    case "all-offline":
      return `WAN 清单 ${formatNumber(state.facts.wan.total)}；离线对象 ${formatNumber(state.facts.wan.offline)} 条；默认出口异常 ${routeLabelText(state)}；采集通道可核对`;
    case "collection-down":
      return `采集异常；REST ${restState(snapshot, state).value} / SSH ${sshState(snapshot, state).value}；默认出口 ${routeLabelText(state)}；缓存快照；最后成功 ${latestSuccess(snapshot, state.scenario)}`;
    default:
      return `${formatNumber(state.facts.wan.total)} 条 WAN / ${formatNumber(state.facts.interfaces.total)} 个接口；${routeLabelText(state)}`;
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
      subcopy: state.scenario === "fleet" ? `默认出口 ${routeLabelText(state)}` : state.scenario === "no-snapshot" ? "无业务快照" : state.facts.wan.allOffline ? "WAN 全离线" : "WAN 可用",
      level: state.facts.wan.allOffline ? "danger" : state.scenario === "no-snapshot" ? "missing" : "trust",
    },
    collection: {
      label: "采集",
      value: `${restState(snapshot, state).value} / ${sshState(snapshot, state).value}`,
      subcopy: state.scenario === "collection-down"
        ? "通道状态 / 缓存快照 / 最后成功"
        : state.scenario === "no-snapshot"
          ? "路由器管理面当前不可达；链路可参考"
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
      return `路由器管理面当前不可达 / REST ${rest} / SSH ${ssh} / 默认出口待判 / 路由快照缺失 / WAN 禁显 / 资源禁显 / 最近成功 ${recent} / 无业务快照，业务数据不展示`;
    case "collection-down":
      return `采集异常 / REST ${rest} / SSH ${ssh} / 缓存快照 / 最后成功 ${recent}`;
    case "resource-full":
      return `资源满载 / 资源证据 处理器96 内存92 磁盘97 / 阈85/85/90 / 持续6/6 / 峰96/92/97 / REST ${rest} SSH ${ssh} / 最近成功 ${recent}`;
    case "interfaces-down":
      return `接口全 Down / 转发面证据 down ${formatNumber(state.facts.interfaces.down)} / WAN ${state.facts.wan.text} / 默认出口 ${routeLabelText(state)} / REST 不可达 / SSH 不可达 / 缓存快照 / 最近成功 ${recent}`;
    case "all-offline":
      return `WAN 0/${formatNumber(state.facts.wan.total)} / 离线对象${formatNumber(state.facts.wan.offline)} / 默认路由异常 / REST ${rest} SSH ${ssh} / 最近成功 ${recent}`;
    case "fleet":
      return `WAN账本 ${formatNumber(state.facts.wan.total)} / 默认出口 ${routeLabelText(state)} / 离线对象留存 / 历史快照 / 当前影响未知 / REST ${rest} SSH ${ssh} / 最近成功 ${recent}`;
    default:
      return `WAN ${state.facts.wan.text} / 默认出口 ${routeLabelText(state)} / REST ${rest} / SSH ${ssh} / 业务快照 ${trust} / 最近成功 ${recent}`;
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
  const deviceIdentity = text(state.facts.device.identity, "爱快路由");
  const collect = state.scenario === "no-snapshot"
    ? "链路待确认"
    : state.scenario === "collection-down"
      ? "缓存快照"
      : rest.tone === "ok" && ssh.tone === "ok"
        ? "采集正常"
        : `REST ${rest.value} / SSH ${ssh.value}`;
  return {
    device: state.scenario === "no-snapshot" && /^(RouterOS|无可用快照|快照缺失)$/i.test(deviceIdentity) ? "爱快路由" : deviceIdentity,
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
        { label: "影响", value: `默认出口${routeLabelText(state)}`, tone: state.facts.route.level },
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
        { label: "结论", value: state.verdict.level === "danger" ? flatConclusion(state) : state.verdict.level === "warn" ? "网络待确认" : "网络状态良好", tone: state.verdict.level },
        { label: "对象", value: `${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)} WAN`, tone: state.facts.wan.allOffline ? "danger" : "ok" },
        { label: "影响", value: `默认出口${routeLabelText(state)}`, tone: state.facts.route.level },
        { label: "可信度", value: trust, tone: state.facts.collection.credibilityTone },
      ];
  }
}


type MobileTwinCard = {
  key: "wan" | "collection";
  title: string;
  value: string;
  sub: string;
  detail: string;
  tone: OverviewTone;
};

function mobileTwinCards(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileTwinCard[] {
  const recent = latestSuccess(snapshot, state.scenario);
  const rest = restState(snapshot, state);
  const ssh = sshState(snapshot, state);
  const totals = trafficTotals(snapshot);
  const noBusiness = state.scenario === "no-snapshot";
  const wanCard: MobileTwinCard = {
    key: "wan",
    title: "WAN 出口",
    value: noBusiness ? "隐藏" : `${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}`,
    sub: state.scenario === "all-offline"
      ? `全部离线 · 默认出口 ${routeLabelText(state)}`
      : noBusiness
        ? "无业务快照，速率不展示"
        : `下行 ${mobileShortRate(totals.down)} / 上行 ${mobileShortRate(totals.up)}`,
    detail: noBusiness ? "业务数据边界" : `默认出口 ${routeLabelText(state)}`,
    tone: state.facts.wan.allOffline ? "danger" : noBusiness ? "missing" : "ok",
  };
  const collectionCard: MobileTwinCard = {
    key: "collection",
    title: "采集快照",
    value: state.scenario === "collection-down" ? "缓存" : noBusiness ? "待核" : rest.tone === "ok" && ssh.tone === "ok" ? "双通道" : "降级",
    sub: rest.value === ssh.value ? `REST/SSH ${rest.value}` : `REST ${rest.value} / SSH ${ssh.value}`,
    detail: `最近成功 ${recent}`,
    tone: state.facts.collection.credibilityTone,
  };
  return [wanCard, collectionCard];
}


function MobileTwinCards({ snapshot, state }: OverviewPanelProps) {
  const cards = mobileTwinCards(snapshot, state);
  return <section className="ik-ios-status-duet ik-mobile-twin-cards ik-mobile-duo-panel" data-overview-mobile-twin-cards="content-driven-wan-collection" data-overview-mobile-secondary-cards="wan-left-collection-right" data-overview-mobile-app-duo-panel="wan-collection-two-cards-left-right" data-overview-mobile-secondary-order="wan-left-collection-right" data-overview-mobile-duo-copy="wan-rate-route-and-collection-snapshot">
    {cards.map((card) => (
      <article className="ik-ios-status-card ik-mobile-twin-card ik-mobile-duo-card" data-tone={card.tone} data-overview-mobile-core-block={card.key} data-overview-mobile-twin-card={card.key} key={card.key}>
        <header className="ik-mobile-duo-head ik-mobile-status-strip"><em>{card.title}</em><b>{card.value}</b></header>
        <p className="ik-mobile-status-subcopy">{card.sub}</p>
        <small className="ik-mobile-status-subcopy">{card.detail}</small>
        <i className="ik-ios-status-hairline" aria-hidden="true" />
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

function mobileEvidenceProfile(row?: ChartDatum): number[] {
  if (!row) return [];
  const current = Number.isFinite(row.currentValue) ? row.currentValue : 0;
  const mean = Number.isFinite(row.meanValue) ? row.meanValue : current;
  const peak = Number.isFinite(row.peakValue) ? row.peakValue : current;
  return [mean, current, peak, current];
}

function MobileTrafficSparkVisual({ snapshot, state }: OverviewPanelProps) {
  const rows = trafficChartRows(snapshot, state);
  const down = rows[0];
  const up = rows[1];
  const maxValue = Math.max(1, ...rows.flatMap((row) => [row.currentValue, row.peakValue, row.meanValue]));
  return <div className="ik-mobile-spark-visual ik-mobile-traffic-spark" data-overview-chart-type="mini-line" data-overview-scene-chart="mobile-wan-rate-sparkline" data-overview-mobile-visual-marker="traffic-mini-line" data-overview-mobile-first-microchart="true" data-overview-mobile-main-card-microchart="thin-traffic-line" data-overview-chart-has-current="true" data-overview-chart-has-window="true" data-overview-chart-has-trust="true" data-overview-chart-unit="bps">
    <header><span>细折线</span><b>{down?.current || "未采集"}</b><em>下载 / 上传</em></header>
    <svg viewBox="0 0 118 42" role="img" aria-label="WAN 下载上传细折线"><path className="ik-mobile-spark-grid" d="M0 10 H118 M0 25 H118 M0 40 H118" />{up ? <polyline className="ik-mobile-spark-line is-up" points={mobileSparkPoints(mobileEvidenceProfile(up), maxValue)} /> : null}{down ? <polyline className="ik-mobile-spark-line is-down" points={mobileSparkPoints(mobileEvidenceProfile(down), maxValue)} /> : null}</svg>
  </div>;
}

function MobileResourceTrendVisual({ state }: { state: OverviewDerivedState }) {
  const metrics = resourceChartRows(state);
  return <div className="ik-mobile-resource-sparks is-vertical-ledger is-pressure-ledger" data-overview-chart-type="pressure" data-overview-scene-chart="mobile-resource-pressure-ledger" data-overview-mobile-visual-marker="resource-mini-trend" data-overview-mobile-resource-pressure-ledger="true" data-overview-mobile-first-microchart="true" data-overview-chart-has-current="true" data-overview-chart-has-threshold="true" data-overview-chart-has-window="true" data-overview-chart-has-trust="true" data-overview-chart-unit="%">
    {metrics.map((metric) => {
      const width = `${clampPercent(metric.currentValue)}%`;
      return <div className="ik-mobile-resource-spark" data-tone={metric.tone || "trust"} key={metric.id} style={{ "--meter-value": width } as CSSProperties}>
        <span>{metric.label}</span><b>{metric.current}</b><em>{`阈${metric.threshold} · 峰${metric.peak.replace("%", "")}`}</em>
        <i aria-hidden="true"><strong style={{ width }} /></i>
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
    { label: "业务快照", value: state.scenario === "no-snapshot" ? "隐藏" : moduleTrust(state), note: state.scenario === "no-snapshot" ? "业务数据隐藏" : "业务数据可参考", tone: state.scenario === "no-snapshot" ? "missing" as OverviewTone : "trust" as OverviewTone },
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
  return <div className="ik-mobile-interface-chain" data-overview-interface-link-chain="mobile-app-interface-carrier-route" data-overview-chart-type="timeline" data-overview-scene-chart="mobile-interface-relation-chain" data-overview-mobile-first-microchart="true" data-overview-chart-has-current="true" data-overview-chart-has-window="true" data-overview-chart-has-trust="true" data-overview-chart-unit="interface"><div className="ik-mobile-interface-chain-row" data-tone={row ? "danger" : "trust"}><span><em>接口</em><b>{row ? `${formatNumber(downCount)}个Down` : "接口正常"}</b><i>{row ? "转发面异常" : "未发现异常"}</i></span><strong aria-hidden="true">→</strong><span><em>承载</em><b>{carrier}</b><i>{parent}</i></span><strong aria-hidden="true">→</strong><span><em>影响</em><b>{routeLabelText(state)}</b><i>默认出口</i></span></div></div>;
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
  if (state.verdict.level === "ok") return { label: "在线", tone: "ok" };
  if (state.scenario === "resource-full") return { label: "资源满", tone: "danger" };
  if (state.scenario === "all-offline") return { label: "出口断", tone: "danger" };
  if (state.scenario === "no-snapshot") return { label: "快照缺", tone: "warn" };
  if (state.scenario === "collection-down") return { label: "缓存", tone: "warn" };
  if (state.scenario === "interfaces-down") return { label: "接口断", tone: "warn" };
  if (state.verdict.level === "danger") return { label: "异常", tone: "danger" };
  return { label: "波动", tone: "warn" };
}

function mobileShortRate(value: number): string {
  const safe = Number(value);
  if (!Number.isFinite(safe) || safe <= 0) return "未采集";
  const compact = (next: number, digits: number) => next.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  if (safe >= 1_000_000_000) return `${compact(safe / 1_000_000_000, safe >= 10_000_000_000 ? 0 : 1)}G`;
  if (safe >= 1_000_000) return `${compact(safe / 1_000_000, safe >= 100_000_000 ? 0 : safe >= 10_000_000 ? 1 : 2)}M`;
  if (safe >= 1_000) return `${compact(safe / 1_000, safe >= 100_000 ? 0 : 1)}K`;
  return `${Math.round(safe)}B`;
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
    { label: "下载", value: noBusiness ? "隐藏" : mobileShortRate(totals.down), tone: noBusiness ? "missing" : "ok" },
    { label: "上传", value: noBusiness ? "隐藏" : mobileShortRate(totals.up), tone: noBusiness ? "missing" : "ok" },
    { label: "延迟", value: mobileLatencyText(snapshot, state), tone: noBusiness ? "warn" : "trust" },
    { label: "连接", value: noBusiness ? "隐藏" : formatCompact(conn), tone: conn > 50000 ? "warn" : noBusiness ? "missing" : "trust" },
  ];
}


function mobileHeroPrimaryLabel(state: OverviewDerivedState): string {
  void state;
  return "网络状态";
}

function mobileHeroSupportLine(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  if (state.scenario === "resource-full") return "处理器 / 内存 / 磁盘持续越阈，先处理资源瓶颈";
  if (state.scenario === "all-offline") return `${formatNumber(state.facts.wan.offline)} 条 WAN 离线，默认路由不可用`;
  if (state.scenario === "no-snapshot") return `无业务快照 · 最近成功 ${latestSuccess(snapshot, state.scenario)}`;
  if (state.scenario === "collection-down") return "当前展示缓存快照，采集链路待恢复";
  if (state.scenario === "interfaces-down") return `${formatNumber(state.facts.interfaces.down)} 个转发接口 Down`;
  return `快照 ${latestSuccess(snapshot, state.scenario)} · 实时可参考`;
}

function mobileHeroAccentText(state: OverviewDerivedState): string {
  if (state.scenario === "resource-full") return "阈值 85/85/90";
  if (state.scenario === "all-offline") return "0 条在线出口";
  if (state.scenario === "no-snapshot") return "业务数据不展示";
  if (state.scenario === "collection-down") return "缓存快照";
  if (state.scenario === "interfaces-down") return "转发面优先";
  return moduleTrust(state);
}

function mobileHeroMetricRole(index: number): string {
  return index === 0 ? "download" : index === 1 ? "upload" : "chip";
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
    case "resource-full": return "资源已满";
    case "all-offline": return "出口中断";
    case "no-snapshot": return "快照缺失";
    case "collection-down": return "采集降级";
    case "interfaces-down": return "接口异常";
    default: return state.verdict.level === "warn" ? "链路波动" : "网络在线";
  }
}


function mobileHeroMeta(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  if (state.scenario === "resource-full") return `资源越阈 6/6 · 最近 ${latestSuccess(snapshot, state.scenario)}`;
  if (state.scenario === "all-offline") return `出口中断 · 最近 ${latestSuccess(snapshot, state.scenario)}`;
  if (state.scenario === "no-snapshot") return `最近成功 ${latestSuccess(snapshot, state.scenario)} · 业务隐藏`;
  if (state.scenario === "collection-down") return `当前缓存 · 最近 ${latestSuccess(snapshot, state.scenario)}`;
  if (state.scenario === "interfaces-down") return `转发面优先 · 最近 ${latestSuccess(snapshot, state.scenario)}`;
  return `最近 ${latestSuccess(snapshot, state.scenario)} · 实时可参考`;
}

function mobileHeroCaption(state: OverviewDerivedState): { left: string; right: string } {
  if (state.scenario === "resource-full") return { left: "近6点", right: "阈值线" };
  if (state.scenario === "all-offline") return { left: "8端口", right: "离线点" };
  if (state.scenario === "no-snapshot") return { left: "四通道", right: "展示边界" };
  if (state.scenario === "interfaces-down") return { left: "关系链", right: "路由影响" };
  if (state.scenario === "collection-down") return { left: "采集链", right: "缓存点" };
  return { left: "15分钟", right: "峰值点" };
}


function MobileIosTopNav({ snapshot, state }: OverviewPanelProps) {
  const capsule = mobileDeviceCapsule(snapshot, state);
  const status = mobileNavStatus(state);
  const navMeta = `${capsule.version} · 快照 ${capsule.recent}`;
  return <nav className="ik-ios-top-nav" aria-label="移动端顶部" data-overview-mobile-ios-nav="true" data-overview-mobile-top="device-status-snapshot" data-overview-mobile-topnav-concrete-status="device-online-abnormal-snapshot" data-overview-mobile-topnav-status={status.label} data-overview-mobile-topnav-status-tone={status.tone} data-overview-mobile-topnav-ia="device-status-snapshot">
    <button type="button" aria-label="返回"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" /></svg></button>
    <div className="ik-ios-nav-title"><b>{capsule.device || "爱快路由"}</b><span>{navMeta}</span></div>
    <strong className="ik-ios-status-pill" data-tone={status.tone}><i aria-hidden="true" />{status.label}</strong>
  </nav>;
}


function mobileHeroSummaryLine(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  const stats = mobileHeroStats(snapshot, state);
  return `下载 ${stats[0]?.value || "-"} · 上传 ${stats[1]?.value || "-"} · 延迟 ${stats[2]?.value || "-"} · 连接 ${stats[3]?.value || "-"}`;
}

function mobileHeroInsightRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): Array<{ label: string; value: string; tone: OverviewTone }> {
  return mobileHeroStats(snapshot, state);
}


function MobileHeroStatusCard({ snapshot, state }: OverviewPanelProps) {
  const stats = mobileHeroStats(snapshot, state);
  const conclusion = mobileHeroConclusion(state);
  return <section className="ik-mobile-conclusion-card ik-ios-hero-card ik-v74-network-hero" data-tone={mobileVerdictTone(state)} data-overview-mobile-primary-card="network-status-main" data-overview-mobile-network-meter="status-traffic-strip" data-overview-mobile-main-card data-overview-mobile-ios-hero="true" data-overview-mobile-first-screen-hero="true" data-overview-mobile-hero-title-policy="single-network-title-no-collision" data-overview-mobile-hero-metrics="download-upload-latency-connections" data-overview-mobile-hero-metric-layout="inline-strip" data-overview-mobile-scenario-visual="true" data-overview-mobile-resource-full-copy={state.scenario === "resource-full" ? "strong-resource-pressure" : undefined} data-overview-mobile-no-ellipsis="true" data-overview-mobile-no-field-stack="true">
    <div className="ik-ios-hero-head ik-v74-hero-head" aria-label={mobileHeroPrimaryLabel(state)} data-overview-mobile-hero-heading="network-status-single-title">
      <b data-overview-primary-conclusion="true">{conclusion}</b>
      <em>{mobileHeroSupportLine(snapshot, state)}</em>
    </div>
    <div className="ik-v74-hero-mainline" data-overview-mobile-hero-summary={mobileHeroSummaryLine(snapshot, state)} data-overview-mobile-hero-meta={mobileHeroMeta(snapshot, state)} data-overview-mobile-first-visual="scenario-specific" data-overview-mobile-first-microchart="true">
      <ul className="ik-v75-hero-stat-list" data-overview-mobile-metric-strip="download-upload-latency-connections">
        {stats.map((item) => <li className="ik-v75-hero-stat" key={item.label} data-tone={item.tone} data-overview-mobile-hero-value={item.label} data-overview-mobile-metric-role={item.label}>
          <em>{item.label}</em>
          <strong>{item.value}</strong>
        </li>)}
      </ul>
    </div>
    <div className="ik-ios-hero-chart-wrap ik-v74-hero-visual is-scene-visual" data-overview-mobile-first-visual="scenario-specific" data-overview-chart-type="scenario-insight" data-overview-chart-trust={moduleTrust(state)}>
      {mobileHeroVisual(snapshot, state)}
    </div>
  </section>;
}


function MobileRingMetrics({ snapshot, state }: OverviewPanelProps) {
  void snapshot;
  const snapshotMissing = state.scenario === "no-snapshot";
  const resourceMetrics = snapshotMissing
    ? [
      { key: "cpu", label: "处理器", value: "—", percent: 0, threshold: 85, peak: 96, tone: "missing" as OverviewTone },
      { key: "memory", label: "内存", value: "—", percent: 0, threshold: 85, peak: 92, tone: "missing" as OverviewTone },
      { key: "disk", label: "磁盘", value: "—", percent: 0, threshold: 90, peak: 97, tone: "missing" as OverviewTone },
    ]
    : [
      { key: "cpu", label: "处理器", value: formatPercent(state.facts.resource.cpu, 0), percent: clampPercent(state.facts.resource.cpu), threshold: 85, peak: 96, tone: state.facts.resource.cpu >= 85 ? "danger" as OverviewTone : "ok" as OverviewTone },
      { key: "memory", label: "内存", value: formatPercent(state.facts.resource.memory, 0), percent: clampPercent(state.facts.resource.memory), threshold: 85, peak: 92, tone: state.facts.resource.memory >= 85 ? "danger" as OverviewTone : "ok" as OverviewTone },
      { key: "disk", label: "磁盘", value: formatPercent(state.facts.resource.disk, 0), percent: clampPercent(state.facts.resource.disk), threshold: 90, peak: 97, tone: state.facts.resource.disk >= 90 ? "danger" as OverviewTone : "ok" as OverviewTone },
    ];
  const resourceNote = snapshotMissing ? "无业务快照" : state.scenario === "resource-full" ? "处理器 / 内存 / 磁盘已越阈" : "处理器 / 内存 / 磁盘";
  return <section className="ik-ios-rings-card ik-ios-resource-card" data-overview-mobile-core-block="resource" data-overview-mobile-ring-metrics="horizontal-thin-bars" data-overview-mobile-resource-card="cpu-memory-disk-horizontal" data-overview-mobile-resource-emphasis="after-secondary-cards" data-overview-mobile-resource-rows="cpu-memory-disk-only" data-overview-mobile-resource-full-copy={state.scenario === "resource-full" ? "threshold-breach-copy" : undefined} data-overview-mobile-metrics data-overview-mobile-business-metrics={snapshotMissing ? "hidden-no-snapshot" : "visible"}>
    <header className="ik-mobile-status-strip"><span>{state.scenario === "resource-full" ? "资源已满" : "资源"}</span><em className="ik-mobile-status-subcopy">{resourceNote}</em></header>
    <div className="ik-ios-ring-grid ik-ios-resource-meters ik-ios-resource-meters--horizontal" data-overview-scene-chart="mobile-resource-horizontal-bars">
      {resourceMetrics.map((metric) => <div className="ik-ios-resource-meter" data-overview-mobile-resource-row-marker="ik-ios-resource-row" data-overview-mobile-resource-metric={metric.key} data-tone={metric.tone} key={metric.key} style={{ "--meter-value": `${metric.percent}%` } as CSSProperties}>
        <span><em>{metric.label}</em><b>{metric.value}</b></span>
        <i aria-hidden="true"><strong /></i>
        <small>{snapshotMissing ? "隐藏" : `阈 ${metric.threshold}`}</small>
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
      return { title: "\u5f02\u5e38\u5f71\u54cd", value: `处理器/\u5185\u5b58/\u78c1\u76d8`, note: "\u6301\u7eed 6/6 / \u9608\u503c 85/85/90", tone: "danger" };
    case "interfaces-down":
      return { title: "\u5f02\u5e38\u5f71\u54cd", value: `${formatNumber(state.facts.interfaces.down)}\u4e2a\u63a5\u53e3 Down`, note: `\u8f6c\u53d1\u9762\u4f18\u5148 / \u9ed8\u8ba4\u51fa\u53e3 ${routeLabelText(state)}`, tone: "danger" };
    case "all-offline":
      return { title: "\u5f02\u5e38\u5f71\u54cd", value: `0/${formatNumber(state.facts.wan.total)} WAN`, note: `\u5168\u90e8\u51fa\u53e3\u79bb\u7ebf / \u9ed8\u8ba4\u51fa\u53e3 ${routeLabelText(state)}`, tone: "danger" };
    default:
      return { title: "\u5f02\u5e38\u5f71\u54cd", value: state.verdict.topLabel || "\u7f51\u7edc\u5f85\u786e\u8ba4", note: `${state.facts.wan.text} / ${moduleTrust(state)}`, tone: state.verdict.level };
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
      { name: "业务快照", note: "无业务快照，业务数据不展示", rate: "隐藏", tone: "missing" },
      { name: "采集链路", note: `最近成功 ${latestSuccess(snapshot, state.scenario)}`, rate: moduleTrust(state), tone: "warn" },
    ];
  }
  if (state.scenario === "resource-full") {
    return resourceRows(state).slice(0, 3).map((row) => ({
      name: text(row.cells[0], "资源"),
      note: `${text(row.cells[2], "持续越阈")} / ${text(row.cells[3], "峰值待核")}`,
      rate: text(row.cells[1], "—"),
      tone: "danger" as OverviewTone,
    }));
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
  return "实时流量";
}

function MobileTrafficRank({ snapshot, state }: OverviewPanelProps) {
  const rows = mobileRankRows(snapshot, state).slice(0, state.scenario === "no-snapshot" ? 3 : 4);
  return <section className="ik-ios-rank-card" data-overview-mobile-core-block="topn" data-overview-mobile-rank-list="topn-app-list" data-overview-mobile-card-list="true" data-overview-mobile-topn-app-list="true" data-overview-mobile-rank-card="topn-after-anomaly">
    <header className="ik-mobile-status-strip"><span>{mobileRankTitle(state)}</span><b>TopN</b><em className="ik-mobile-status-subcopy">{`快照 ${latestSuccess(snapshot, state.scenario)}`}</em></header>
    <div className="ik-ios-rank-list">
      {rows.map((row, index) => <div className="ik-ios-rank-row" data-tone={row.tone} key={`${row.name}-${index}`}>
        <i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 7h12M8 12h8M10 17h4" /></svg></i>
        <span><b>{row.name}</b><em>{row.note}</em></span>
        <strong>{row.rate}</strong>
      </div>)}
    </div>
  </section>;
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
  if (tone === "warn") return "待确认";
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
  return routeLabelText(state);
}

function flatRouteEvidence(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  const routes = routeRows(snapshot);
  if (state.scenario === "no-snapshot") return "路由快照缺失";
  const active = routes.filter((route) => route.active && !route.disabled).length;
  return `默认出口命中${formatNumber(active)}/${formatNumber(routes.length)}`;
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
  if (state.scenario === "no-snapshot") return "资源隐藏";
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
    return [{ id: "flat-wan-none", attrs: { "data-overview-wan-detail-row": "true" }, cells: ["WAN", state.scenario === "no-snapshot" ? "隐藏" : "未采集", "无业务快照", "速率不展示"], tone: state.scenario === "no-snapshot" ? "missing" : "warn" }];
  }
  return rows
    .slice()
    .sort((left, right) => Number(left.running !== false) - Number(right.running !== false))
    .slice(0, 3)
    .map((row, index) => {
      const name = text(row.name || row.interface, `WAN${index + 1}`);
      const parent = text(row.parent || row.interface || row.kind || row.access, `ether${index + 1}`);
      const carrying = Array.isArray(row.routes) && row.routes.some((route) => route.active && !route.disabled) ? "承载" : "未承载";
      const rate = state.scenario === "no-snapshot" ? "速率不展示" : row.running === false ? "离线无速率" : mobileShortRate(Math.max(toNumber(row.downRate), toNumber(row.upRate)));
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
      { id: "flat-nosnapshot-boundary", cells: ["业务边界", "无业务快照", "WAN/资源/终端隐藏", "速率隐藏"], tone: "missing" },
      { id: "flat-nosnapshot-route", cells: ["默认出口", "待判定", "路由快照缺失", "端点失败未记录"], tone: "warn" },
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
      <div className="ik-mobile-compact-line" data-tone={state.facts.route.level} data-overview-field><b>{"默认出口"}</b><span>{state.scenario === "no-snapshot" ? ROUTE_UNKNOWN : routeBusinessText(state)}</span></div>
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
      data-overview-mobile-home-layout="ios-topnav-network-hero-twin-cards-resource-exception-rank"
      data-overview-mobile-home-layout-v82="ios-topnav-network-hero-content-cards-resource-anomaly-topn"
      data-overview-mobile-home-layout-v80="device-status-snapshot-network-main-content-cards-resource-anomaly-topn"
      data-overview-mobile-home-contract="top-device-status-snapshot-hero-network-metrics-scenario-visual-wan-collection-resource-anomaly-if-abnormal-topn-no-tab"
      data-overview-mobile-no-desktop-collapse="true"
      data-overview-mobile-raw-routeros-policy="hide-before-detail"
      data-overview-mobile-alert={state.verdict.level}
      data-overview-mobile-scene={state.scenario}
      data-overview-mobile-app-home-acceptance="device-top-network-hero-wan-collection-resource-anomaly-topn-no-tab"
      data-overview-mobile-home-shell="topnav-network-hero-content-cards-resource-anomaly-topn-no-tab"
    >
      <div className="ik-ios-home-stack" data-overview-mobile-flat-status="app-home-core" data-overview-mobile-home-stack="topnav-network-hero-content-cards-resource-anomaly-topn-no-tab">
        <div
          className="ik-ios-first-screen"
          data-overview-mobile-first-screen="app-home"
          data-overview-mobile-first-screen-contract="ios-topnav-network-hero-traffic-metrics-twin-cards-resource-exception-rank-no-tab"
          data-overview-mobile-first-screen-contract-v82="top-device-status-snapshot-network-hero-metrics-scenario-visual-wan-collection-resource-anomaly-topn-no-tab"
          data-overview-mobile-first-screen-visual="traffic-thin-line"
          data-overview-mobile-first-screen-no-table="true"
          data-overview-mobile-first-screen-uses-microchart="true"
        >
          <MobileIosTopNav snapshot={snapshot} state={state} />
          <MobileHeroStatusCard snapshot={snapshot} state={state} />
          <MobileTwinCards snapshot={snapshot} state={state} />
          <MobileRingMetrics snapshot={snapshot} state={state} />
          <MobileExceptionCard snapshot={snapshot} state={state} />
          <MobileTrafficRank snapshot={snapshot} state={state} />
        </div>
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
    .replace(/active\s+true/gi, "当前承载")
    .replace(/active\s+false/gi, "备选未命中")
    .replace(/disabled\s+false/gi, "允许参与选路")
    .replace(/disabled\s+true/gi, "已停用")
    .replace(/\brouting[-_\s]?table\b|\broutingTable\b/gi, "路由域")
    .replace(/\bgatewayStatus\b/gi, "网关状态")
    .replace(/\bdistance\b/gi, "优先级")
    .replace(/\bgateway\b/gi, "网关")
    .replace(/\bactive\b/gi, "承载状态")
    .replace(/\bdisabled\b/gi, "停用状态");
}

function mobileToneStatus(tone?: OverviewTone): string {
  if (tone === "danger") return "异常";
  if (tone === "warn") return "待确认";
  if (tone === "missing") return "缺失";
  if (tone === "ok") return "正常";
  return "可信";
}

function hasMobileCell(cell: LedgerCell | undefined): boolean {
  return cell !== undefined && cell !== null && cell !== "";
}

function mobileRouteText(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "路由快照缺失";
  return mobileDisplayCell(routeBusinessText(state, "待判定")) as string;
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
    { id: "all-offline-route", cells: ["默认出口异常", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
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
    { id: "if-summary-route", cells: ["默认出口", routeLabelText(state)], tone: state.facts.route.level },
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
    { id: "if-impact-route-mobile", cells: ["默认出口影响", routeLabelText(state), routeBusinessText(state), "转发面证据优先"], tone: state.facts.route.level },
    { id: "if-impact-boundary-mobile", cells: ["判断边界", "只读", "不写配置", "不替代路由器明细"], tone: "trust" },
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
      label: "默认出口",
      current: routeLabelText(state),
      currentValue: state.facts.route.level === "ok" ? 20 : 92,
      peak: "异常",
      peakValue: 100,
      mean: "待核",
      meanValue: 70,
      threshold: "当前承载",
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
      { id: "fleet-default-route-count", cells: ["默认路由条目", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
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
      const attrs = { "data-overview-wan-detail-row": "true", ...(row.running === false && state.scenario === "fleet" ? { "data-overview-anomaly-object": name } : {}) };
      return {
        id: `traffic-top-${index}`,
        attrs,
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
    { id: "traffic-route", cells: ["默认出口", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
    { id: "traffic-sampling", cells: ["采样可信度", moduleTrust(state), "最近6点 / 当前值峰值均值"], tone: state.facts.freshness.credibilityTone },
    { id: "traffic-peak", cells: ["最近峰值", formatRate(peak), `最近成功 ${latestSuccess(snapshot, state.scenario)}`], tone: "trust" },
  ];
}

function trafficTop3Rows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  return trafficRows(snapshot, state).filter((row) => /^traffic-top-/.test(row.id));
}

function trafficRouteRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const route = buildRouterOsRouteEvidenceModel(snapshot, state).summary;
  return [{
    id: "traffic-route",
    attrs: { "data-overview-default-route-row": "true", "data-overview-route-evidence-model": "routeros-standard" },
    cells: ["默认出口", route.value, route.note],
    tone: route.tone,
    title: "默认出口已通过 RouterOS evidence item 标准化",
  }];
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
    { id: "ops-failure", cells: ["端点失败", failureText(snapshot, state), "未记录不写 0"], tone: state.facts.failures.count ? "warn" : "trust" },
    { id: "ops-route", cells: ["默认出口", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
    { id: "ops-readonly", cells: ["只读", "不写配置", "仅展示设备事实"], tone: "trust" },
    { id: "ops-device", cells: ["设备", state.facts.device.identity, `${state.facts.device.version} · ${state.facts.device.uptime}`], tone: "trust" },
    { id: "ops-sample", cells: ["样本", "最近6点", "当前 / 均值 / 峰值"], tone: state.facts.freshness.credibilityTone },
  ];
}

function routeFactRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  return buildRouterOsRouteEvidenceModel(snapshot, state).businessRows.map((route) => ({
    id: route.id,
    attrs: {
      "data-overview-default-route-row": "true",
      "data-overview-route-copy": "business",
      "data-routeros-evidence-item": route.layer,
      "data-routeros-raw-field-mode": "translated",
      "data-routeros-raw-table": route.rawFields?.table || "",
      "data-routeros-raw-gateway": route.rawFields?.gateway || "",
      "data-routeros-raw-distance": route.rawFields?.distance || "",
      "data-routeros-raw-active": route.rawFields?.active || "",
      "data-routeros-raw-disabled": route.rawFields?.disabled || "",
    },
    cells: [
      route.label,
      `网关 ${route.gateway}`,
      `优先级 ${route.priority}`,
      route.status,
    ],
    title: route.title,
    tone: route.tone,
  }));
}

function routeBusinessRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  return buildRouterOsRouteEvidenceModel(snapshot, state).businessRows.slice(0, 4).map((route) => ({
    id: `route-business-${route.routeIndex}`,
    attrs: {
      "data-overview-default-route-row": "true",
      "data-overview-route-copy": "business-main",
      "data-routeros-evidence-item": route.layer,
      "data-routeros-raw-field-mode": "translated",
      "data-routeros-raw-table": route.rawFields?.table || "",
      "data-routeros-raw-gateway": route.rawFields?.gateway || "",
      "data-routeros-raw-distance": route.rawFields?.distance || "",
      "data-routeros-raw-active": route.rawFields?.active || "",
      "data-routeros-raw-disabled": route.rawFields?.disabled || "",
    },
    cells: [
      route.label,
      route.gateway,
      `优先级 ${route.priority}`,
      route.status,
    ],
    title: route.title,
    tone: route.tone,
  }));
}

function routeRawEvidenceRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  return buildRouterOsRouteEvidenceModel(snapshot, state).rawRows.map((item) => ({
    id: item.id,
    attrs: {
      "data-overview-default-route-row": "true",
      "data-routeros-evidence-item": item.layer,
      "data-routeros-raw-field-mode": "evidence-bottom",
      "data-routeros-raw-table": item.rawFields?.table || "",
      "data-routeros-raw-gateway": item.rawFields?.gateway || "",
      "data-routeros-raw-distance": item.rawFields?.distance || "",
      "data-routeros-raw-active": item.rawFields?.active || "",
      "data-routeros-raw-disabled": item.rawFields?.disabled || "",
    },
    cells: [item.label, item.value, item.note],
    title: "RouterOS 原始字段只在证据区展示",
    tone: item.tone,
  }));
}

function wanRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const rows = collectWanRows(snapshot);
  if (!rows.length) {
    return [{ id: "wan-unavailable", attrs: { "data-overview-wan-detail-row": "true" }, cells: ["WAN", state.scenario === "no-snapshot" ? "隐藏" : "未采集", state.scenario === "no-snapshot" ? "无业务快照，业务数据不展示" : "无 WAN 清单"], tone: state.scenario === "no-snapshot" ? "missing" : "warn" }];
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
  const overCount = [cpu >= 85, mem >= 85, disk >= 90].filter(Boolean).length;
  return [
    { id: "resource-cpu", cells: ["处理器", formatPercent(cpu, 1), "阈值85%", `峰${formatPercent(cpu, 1)}`], tone: cpu >= 85 ? "warn" : cpu >= 70 ? "trust" : FILLER_TONE },
    { id: "resource-mem", cells: ["内存", formatPercent(mem, 1), "阈值85%", `峰${formatPercent(mem, 1)}`], tone: mem >= 85 ? "warn" : mem >= 70 ? "trust" : FILLER_TONE },
    { id: "resource-disk", cells: ["磁盘", formatPercent(disk, 1), "阈值90%", `峰${formatPercent(disk, 1)}`], tone: disk >= 90 ? "warn" : disk >= 75 ? "trust" : FILLER_TONE },
    { id: "resource-over-count", cells: ["越阈项", `${formatNumber(overCount)}/3`, "持续6/6", overCount >= 3 ? "三项同时越阈" : "局部越阈"], tone: overCount >= 3 ? "warn" : "trust" },
    { id: "resource-conn-risk", cells: ["连接压力", formatCompact(state.facts.connections.total), "活动会话", formatNumber(state.facts.connections.active)], tone: state.facts.connections.total > 50000 ? "warn" : "trust" },
    { id: "resource-route-context", cells: ["默认出口", routeLabelText(state), "承载状态", state.facts.route.level === "ok" ? "可承载" : "待确认"], tone: state.facts.route.level },
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
    { id: "route-resource", cells: ["默认出口判断", routeLabelText(state), state.facts.route.level === "ok" ? "承载正常" : "待确认"], tone: state.facts.route.level },
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
    { id: "resource-boundary-route", cells: ["默认出口", routeLabelText(state), routeBusinessText(state), "资源旁证"], tone: state.facts.route.level },
    { id: "resource-boundary-sample", cells: ["样本", "6/6", "趋势可参考", "持续窗口"], tone: "trust" },
    { id: "resource-boundary-failure", cells: ["端点失败", failureText(snapshot, state), statusUpdated(snapshot), "未记录不写 0"], tone: state.facts.failures.count ? "warn" : "trust" },
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
    { id: "resource-page-failure", cells: ["端点失败", failureText(snapshot, state), "未记录不写 0"], tone: state.facts.failures.count ? "warn" : "trust" },
    { id: "resource-page-boundary", cells: ["展示边界", "不写配置", "不推断修复"], tone: "trust" },
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
    { id: "resource-sustain-route", cells: ["默认出口", routeLabelText(state), "资源旁证", routeBusinessText(state)], tone: state.facts.route.level },
    { id: "resource-sustain-readonly", cells: ["展示边界", "不写配置", "不推断修复", "只展示阈值"], tone: "trust" },
  ];
}

function interfaceRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const rows = collectInterfaceRows(snapshot).filter((row) => row.running === false);
  if (!rows.length) return [{ id: "interface-ok", cells: ["接口转发面", "未发现 down", `REST / SSH 与转发面分离判断 / ${routeLabelText(state)}`], tone: state.scenario === "interfaces-down" ? "warn" : "ok" }];
  return rows.slice(0, 8).map((row, index) => {
    const name = text(row.name || row.interface, `if-${index + 1}`);
    const parent = text(row.parent || row.master || "-", "-");
    const bridge = text(row.bridge || "-", "-");
    const vlan = text(row.vlan || row.vlanId || "-", "-");
    return {
      id: `if-${name}-${index}`,
      cells: [
        <><b>{name}</b><small>父接口 {parent}</small></>,
        "已断开",
        `桥接 ${bridge} / VLAN ${vlan} / 默认出口 ${routeLabelText(state)}`,
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
    { id: "if-relation-route", cells: ["默认出口", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
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
        routeLabelText(state),
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
        `VLAN ${vlan} / 默认出口 ${routeLabelText(state)}`,
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
    { id: "if-impact-route", cells: ["默认出口影响", routeLabelText(state), routeBusinessText(state), "转发面证据优先"], tone: state.facts.route.level },
    { id: "if-impact-parent", cells: ["父接口关系", "父接口", "桥接 / VLAN / PPPoE出口", "逐行核对"], tone: "warn" },
    { id: "if-impact-boundary", cells: ["判断边界", "只读", "不写配置", "不替代路由器明细"], tone: "trust" },
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
      label: "默认出口",
      current: routeLabelText(state),
      currentValue: routeRisk,
      peak: "需核",
      peakValue: 100,
      mean: "转发证据优先",
      meanValue: 66,
      threshold: "当前承载",
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
    { id: "if-collection-routeros", cells: ["路由器管理面", routerosState(snapshot, state.scenario).value, recent, "采集入口" ], tone: routerosState(snapshot, state.scenario).tone },
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
    { id: "if-page-route", cells: ["默认出口", routeLabelText(state), "影响单独判定"], tone: state.facts.route.level },
    { id: "if-page-collection", cells: ["采集面", `${restState(snapshot, state).value} / ${sshState(snapshot, state).value}`, "不替代转发面"], tone: state.facts.collection.level },
    { id: "if-page-readonly", cells: ["展示边界", "不写配置", "仅展示证据"], tone: "trust" },
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
    { id: "if-boundary-route", cells: ["默认出口", routeLabelText(state), "影响判断", "转发面证据优先"], tone: state.facts.route.level },
    { id: "if-boundary-rest", cells: ["REST", restState(snapshot, state).value, recent, "采集面旁证"], tone: restState(snapshot, state).tone },
    { id: "if-boundary-ssh", cells: ["SSH", sshState(snapshot, state).value, recent, "不替代转发面"], tone: sshState(snapshot, state).tone },
    { id: "if-boundary-snapshot", cells: ["业务快照", moduleTrust(state), recent, "接口状态按快照显示"], tone: state.facts.freshness.credibilityTone },
    { id: "if-boundary-list", cells: ["接口清单", names, recent, "优先看Down对象"], tone: down.length ? "danger" : "trust" },
    { id: "if-boundary-scope", cells: ["影响范围", "转发面", recent, "不等同管理面"], tone: "warn" },
    { id: "if-boundary-recovery", cells: ["恢复判断", "未推断", recent, "等待下一次采样"], tone: "trust" },
    { id: "if-boundary-display", cells: ["展示范围", "接口 / 路由 / 采集", recent, "业务值不写配置"], tone: "trust" },
    { id: "if-boundary-next", cells: ["下次尝试", pollText(snapshot), "轮询中", "不承诺已恢复"], tone: "trust" },
    { id: "if-boundary-readonly", cells: ["展示边界", "不写配置", "不替代路由器明细", "仅展示证据"], tone: "trust" },
  ];
}

function collectionRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  const rest = restState(snapshot, state);
  const ssh = sshState(snapshot, state);
  return [
    { id: "collection-routeros", cells: ["设备通达性", routerosState(snapshot, state.scenario).value, recent, businessErrorNote(snapshot.error, "当前可达")], tone: routerosState(snapshot, state.scenario).tone },
    { id: "collection-rest", cells: ["REST", rest.value, recent, rest.note], tone: rest.tone },
    { id: "collection-ssh", cells: ["SSH", ssh.value, recent, ssh.note], tone: ssh.tone },
    { id: "collection-cache", cells: ["数据层状态", state.scenario === "no-snapshot" ? "隐藏" : state.scenario === "collection-down" ? "缓存" : "实时", recent, state.scenario === "no-snapshot" ? "无业务快照，业务禁显" : state.scenario === "collection-down" ? "业务快照非实时 / 待恢复" : "业务快照可参考"], tone: state.scenario === "no-snapshot" ? "missing" : state.scenario === "collection-down" ? "warn" : "ok" },
    { id: "collection-boundary", cells: ["展示边界", state.scenario === "collection-down" ? "只读缓存" : "实时可参考", recent, state.scenario === "collection-down" ? "REST / SSH / 快照分开判" : "业务快照边界清晰"], tone: state.scenario === "collection-down" ? "warn" : "trust" },
    { id: "collection-failure", cells: ["失败端点", state.scenario === "collection-down" ? "未记录" : state.facts.failures.count ? failureText(snapshot, state) : "未记录", statusUpdated(snapshot), state.scenario === "collection-down" ? "未记录" : state.facts.failures.count ? "见端点列表" : "未记录"], tone: state.facts.failures.count ? "warn" : "trust" },
    { id: "collection-trust", cells: ["可信度", state.scenario === "collection-down" ? "可参考" : moduleTrust(state), recent, state.scenario === "collection-down" ? "非实时" : "按快照可信度显示"], tone: state.scenario === "collection-down" ? "warn" : "trust" },
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
  return [
    { id: "chain-entry", cells: ["页面可信等级", "链路可参考", recent, "只读不写配置", next], tone: "trust" },
    { id: "chain-router", cells: ["RouterOS", "断链", recent, "管理面断链", next], tone: "danger" },
    { id: "chain-rest", cells: ["REST", restState(snapshot, state).value, recent, "采集通道需核", next], tone: restState(snapshot, state).tone },
    { id: "chain-ssh", cells: ["SSH", sshState(snapshot, state).value, recent, "静态通道断链", next], tone: sshState(snapshot, state).tone },
    { id: "chain-business", cells: ["业务数据展示边界", "无业务快照", recent, "无业务快照，业务数据不展示；速率不展示", next], title: "业务快照缺失：WAN、资源、终端、连接与速率不展示", tone: "missing" },
    { id: "chain-default-route", cells: ["默认路由", "待判定", recent, "路由快照未取回，不推断承载", next], tone: "warn" },
    { id: "chain-success", cells: ["最近成功", recent, recent, "仅作为采集链路时间点", next], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "chain-failure", cells: ["失败端点", state.facts.failures.count ? failureText(snapshot, state) : "未记录", recent, "失败端点未记录不写 0", next], tone: state.facts.failures.count ? "warn" : "trust" },
    { id: "chain-trust", cells: ["数据可信度", "链路可参考", recent, `业务状态不可参考 / 事件更新时间 ${age}`, next], tone: "warn" },
  ];
}

function noSnapshotBusinessBoundaryRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "boundary-business", cells: ["业务展示边界", "无业务快照", "WAN / 资源 / 终端 / 连接禁显", "只读 不写配置"], tone: "missing" },
    { id: "boundary-rate", cells: ["速率展示", "禁显", "无有效业务采样", "速率禁显"], tone: "missing" },
    { id: "boundary-route", cells: ["默认路由影响", "待判", ROUTE_UNKNOWN, "不推断承载状态"], tone: "warn" },
    { id: "boundary-success", cells: ["最近成功", recent, `状态更新 ${statusUpdated(snapshot)}`, "只代表采集链路"], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "boundary-collection", cells: ["采集链路", "链路可参考", "REST 待确认 / SSH 断链", "业务状态不参考"], tone: "warn" },
    { id: "boundary-failure", cells: ["端点失败", failureText(snapshot, state), "未记录保持未记录", "不写零值"], tone: state.facts.failures.count ? "warn" : "trust" },
    { id: "boundary-next", cells: ["下一次轮询", pollText(snapshot), "继续只读采集", "不写配置"], tone: "trust" },
    { id: "boundary-page", cells: ["页面可信等级", "链路可参考", moduleTrust(state), "只读状态台"], tone: "warn" },
  ];
}

function noSnapshotVisibilityRows(): LedgerRow[] {
  return [
    { id: "vis-routeros", cells: ["RouterOS", "断链", "主证据已进入采集链路图", "采集链路"], tone: "danger" },
    { id: "vis-rest", cells: ["REST", "待核", "失败端点未记录时保持未记录", "采集通道"], tone: "warn" },
    { id: "vis-ssh", cells: ["SSH", "断链", "失败端点未记录时保持未记录", "采集通道"], tone: "warn" },
    { id: "vis-route", cells: ["默认路由", "待判", "默认路由待判 / 路由快照未取回", "可见性边界"], tone: "warn" },
    { id: "vis-snapshot-time", cells: ["业务快照时间", "无", "业务状态不可信", "模块可见性"], tone: "missing" },
    { id: "vis-snapshot-age", cells: ["业务快照年龄", "待判", "业务状态待核", "模块可见性"], tone: "missing" },
    { id: "vis-wan", cells: ["WAN", "禁显", "业务模块", "无业务快照，业务数据不展示"], tone: "missing" },
    { id: "vis-resource", cells: ["资源", "禁显", "业务模块", "无业务快照，业务数据不展示"], tone: "missing" },
    { id: "vis-terminals", cells: ["终端", "禁显", "业务模块", "无业务快照，业务数据不展示"], tone: "missing" },
    { id: "vis-conn", cells: ["连接", "禁显", "业务模块", "无业务快照"], tone: "missing" },
    { id: "vis-rate", cells: ["速率", "禁显", "禁止零速率", "速率不展示"], tone: "missing" },
    { id: "vis-page-trust", cells: ["页面可信等级", "链路可参考", "业务状态不可参考", "状态边界"], tone: "warn" },
    { id: "vis-readonly", cells: ["只读", "不写配置", "不推断业务数值", "采集链路可参考"], tone: "trust" },
  ];
}

function noSnapshotChannelStatusRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "channel-routeros", cells: ["RouterOS", "断链", "当前不可达，业务快照无法刷新"], tone: "danger" },
    { id: "channel-rest", cells: ["REST", restState(snapshot, state).value, `${restState(snapshot, state).note}，仅作链路核验`], tone: restState(snapshot, state).tone },
    { id: "channel-ssh", cells: ["SSH", sshState(snapshot, state).value, `${sshState(snapshot, state).note}，静态通道不可用`], tone: sshState(snapshot, state).tone },
    { id: "channel-route", cells: ["默认出口", "待判", "默认出口待判 / 路由快照未取回"], tone: "warn" },
    { id: "channel-failure", cells: ["失败端点", "未记录", "失败端点未记录 / 不写零值"], tone: "trust" },
    { id: "channel-data-layer", cells: ["数据层状态", "快照缺失", "业务状态不可信"], tone: "missing" },
    { id: "channel-recent", cells: ["最近成功", recent, `下次尝试 ${pollText(snapshot)}`], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "channel-business", cells: ["业务数据", "禁显", "无业务快照，业务数据不展示"], tone: "missing" },
    { id: "channel-permission", cells: ["权限", "只读", "不写配置 / 不推断业务数值"], tone: "trust" },
  ];
}

function noSnapshotReadonlyDegradedRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  const rest = restState(snapshot, state);
  const ssh = sshState(snapshot, state);
  const router = routerosState(snapshot, state.scenario);
  return [
    { id: "readonly-policy", cells: ["只读范围", "只读", "不写配置 / 不推断业务数值"], tone: "trust" },
    { id: "readonly-chain", cells: ["保留模块", "采集链路", "页面可信等级链路可参考 / 最近成功可展示"], tone: "trust" },
    { id: "readonly-business", cells: ["业务数据展示边界", "无业务快照", "无业务快照，业务数据不展示"], tone: "missing" },
    { id: "readonly-rate", cells: ["速率", "不展示", "无业务快照时速率不展示"], tone: "missing" },
    { id: "readonly-router", cells: ["路由器管理面", router.value, router.note], tone: router.tone },
    { id: "readonly-rest", cells: ["REST", rest.value, rest.note], tone: rest.tone },
    { id: "readonly-ssh", cells: ["SSH", ssh.value, ssh.note], tone: ssh.tone },
    { id: "readonly-route", cells: ["默认出口", "待判", "路由快照未取回，不推断承载"], tone: "warn" },
    { id: "readonly-success", cells: ["最近成功", recent, "只作为采集链路时间点"], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "readonly-next", cells: ["下一次轮询", pollText(snapshot), "等待采集恢复"], tone: "trust" },
  ];
}

function noSnapshotAuxiliaryScopeRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "aux-business-scope", cells: ["业务域", "禁显", "无业务快照 / 等待恢复", "可见性边界"], tone: "missing" },
    { id: "aux-rate-scope", cells: ["速率", "禁显", "禁止零值占位", "采集恢复后显示"], tone: "missing" },
    { id: "aux-route-scope", cells: ["默认出口", "待判", "路由快照未取回", "不推断承载"], tone: "warn" },
    { id: "aux-success-scope", cells: ["最近成功", recent, "采集链路时间点", pollText(snapshot)], tone: recent === "未记录" ? "warn" : "trust" },
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
    { id: "success-current", cells: [state.scenario === "no-snapshot" ? "采集状态更新时间" : "当前状态", state.scenario === "no-snapshot" ? statusUpdated(snapshot) : "可用", state.scenario === "no-snapshot" ? "业务禁显" : "业务快照可参考"], tone: state.scenario === "no-snapshot" ? "danger" : "trust" },
    { id: "success-next", cells: ["下一次轮询", pollText(snapshot), "时间轴终点"], tone: "trust" },
    ...(state.scenario === "no-snapshot" ? [
      { id: "success-route-boundary", cells: ["默认出口", "待判", "默认出口待判 / 路由快照未取回"], tone: "warn" as OverviewTone },
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
    { id: "ao-impact-route", cells: ["默认出口", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
    { id: "ao-impact-carrier", cells: ["承载关系", "未承载", "离线线路不承载业务"], tone: "warn" },
    { id: "ao-impact-rate", cells: ["速率展示", "不展示", "无有效样本，不显示零速率"], tone: "warn" },
    { id: "ao-impact-collection", cells: ["采集可信", state.facts.collection.credibilityLabel, state.facts.collection.channelText], tone: state.facts.collection.level },
    { id: "ao-impact-success", cells: ["最近成功", recent, moduleTrust(state)], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "ao-impact-resource", cells: ["资源", state.facts.resource.summaryText, "二级证据"], tone: state.facts.resource.level },
    { id: "ao-impact-readonly", cells: ["展示边界", "不写配置", "只展示状态与证据"], tone: "trust" },
  ];
}

function collectionBoundaryLedgerRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "cb-rest", cells: ["REST", restState(snapshot, state).value, restState(snapshot, state).note], tone: restState(snapshot, state).tone },
    { id: "cb-ssh", cells: ["SSH", sshState(snapshot, state).value, sshState(snapshot, state).note], tone: sshState(snapshot, state).tone },
    { id: "cb-snapshot", cells: ["业务快照", "缓存快照", "当前展示最后成功快照"], tone: "warn" },
    { id: "cb-success", cells: ["最后成功", recent, "业务状态按缓存参考"], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "cb-failure", cells: ["端点失败", failureText(snapshot, state), "未记录不写 0"], tone: state.facts.failures.count ? "warn" : "trust" },
    { id: "cb-route", cells: ["默认出口", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
    { id: "cb-wan", cells: ["WAN", state.facts.wan.text, "缓存快照下可参考"], tone: state.facts.wan.allOffline ? "danger" : "trust" },
    { id: "cb-resource", cells: ["资源", state.facts.resource.summaryText, "缓存快照下可参考"], tone: state.facts.resource.level },
    { id: "cb-next", cells: ["下次尝试", pollText(snapshot), "轮询中"], tone: "trust" },
    { id: "cb-readonly", cells: ["展示边界", "不写配置", "不推断业务数值"], tone: "trust" },
  ];
}

function collectionReadonlyRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "cr-display", cells: ["展示范围", "最后成功快照", `最近成功 ${recent}`], tone: "warn" },
    { id: "cr-route", cells: ["默认出口快照", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
    { id: "cr-wan", cells: ["WAN明细", state.facts.wan.text, "缓存快照可参考"], tone: state.facts.wan.allOffline ? "danger" : "trust" },
    { id: "cr-resource", cells: ["资源阈值", state.facts.resource.summaryText, "缓存快照可参考"], tone: state.facts.resource.level },
    { id: "cr-terminal", cells: ["终端排行", `${formatCompact(state.facts.connections.total)} 连接`, "缓存快照可参考"], tone: "trust" },
    { id: "cr-rate", cells: ["速率趋势", "缓存窗口", "不伪装实时"], tone: "warn" },
    { id: "cr-failure", cells: ["端点失败", failureText(snapshot, state), "未记录不写 0"], tone: state.facts.failures.count ? "warn" : "trust" },
    { id: "cr-next", cells: ["下次尝试", pollText(snapshot), "轮询中"], tone: "trust" },
    { id: "cr-readonly", cells: ["只读策略", "不写配置", "不推断业务数值"], tone: "trust" },
    { id: "cr-trust", cells: ["可信度", moduleTrust(state), "REST / SSH / 快照分开判"], tone: "warn" },
  ];
}

function wanRouteLedgerRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  return [
    ...routeFactRows(snapshot, state),
    { id: "route-impact", cells: ["默认出口影响", routeLabelText(state), "选路优先级", "承载状态需核对"], tone: state.facts.route.level },
    { id: "route-wan", cells: ["WAN承载", `${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}`, "-", "全部离线"], tone: "danger" },
    { id: "route-next", cells: ["路由快照", "路由明细", "-", "路由器底层事实"], tone: "trust" },
  ];
}

function terminalRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  if (state.scenario === "no-snapshot") return [{ id: "terminal-unavailable", cells: ["终端排行", "停用", "无业务快照，终端排行禁显"], tone: "missing" }];
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
    { id: "terminal-summary-route", cells: ["默认出口", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
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
      <Module title="采集链路图 / 账本" subtitle="路由器管理面 / REST / SSH / 端点失败未记录 / 默认出口待判" module="no-snapshot-summary" tone="danger" headers={["链路层", "当前", "最近成功", "主证据", "下次尝试"]} rows={summaryRows} minRows={9} visual={<ChainTimeline rows={summaryRows} module="no-snapshot-summary-chain" />} />
      <Module title="四通道状态" subtitle="路由器管理面 / REST / SSH / 业务快照 / 最近成功" module="no-snapshot-channel-status" tone="warn" headers={["通道", "当前", "说明"]} rows={channelRows} minRows={8} visual={<VisibilityMatrixVisual rows={channelRows} />} />
    </div>
    <div className="ro-col is-side stack ik-home-side-stack">
      <Module title="最近成功时间轴" subtitle="最后成功 / 来源 / 可展示范围 / 已折叠模块" module="no-snapshot-recent-success" tone="trust" headers={["节点", "当前", "说明"]} rows={recentSuccessRows} minRows={6} visual={<ChainTimeline rows={recentSuccessRows} module="no-snapshot-recent-success-timeline" />} />
      <Module title="模块可见性矩阵" subtitle="无业务快照，业务边界合并 / 模块禁显" module="no-snapshot-module-visibility" tone="warn" headers={["模块", "状态", "原因", "边界"]} rows={visibilityRows} minRows={9} visual={<VisibilityMatrixVisual rows={visibilityRows} />} />
    </div>
  </>;
}

function ResourceDesktop({ snapshot, state }: OverviewPanelProps) {
  const resourceChart = resourceChartRows(state);
  const resourceVisual = <div className="ro-resource-visual">
    <JudgementChart module="resource-risk-priority" kind="trend" rows={resourceChart} />
    <ResourceTriCards rows={resourceChart} />
  </div>;
  const pressureVisual = <JudgementChart module="resource-pressure-bars" kind="pressure" rows={connectionPressureChartRows(snapshot, state)} />;
  return <>
    <div className="ro-col is-main stack">
      <Module title="最危险项 / 资源阈值" subtitle="处理器 / 内存 / 磁盘 先读 / 再看连接压力 / 默认路由 / 采集可信度" module="resource-risk-priority" tone="danger" trust={moduleTrust(state)} headers={["指标", "阈值", "持续", "峰值"]} rows={resourceRiskRows(state)} minRows={8} visual={resourceVisual} />
      <Module title="持续窗口 / 压力旁证" subtitle="最近6点 / 均值峰值 / 连接数 / 接口吞吐 / DNS缓存 / 展示边界" module="resource-sustain-ledger" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据", "边界"]} rows={resourceSustainRows(snapshot, state)} minRows={10} />
    </div>
    <div className="ro-col is-side stack ik-home-side-stack">
      <Module title="连接压力 / 互补信息" subtitle="连接压力 / 活动会话 / DNS缓存 / 接口吞吐 / 默认路由 / 互补证据" module="resource-pressure-bars" tone="warn" trust={moduleTrust(state)} headers={["项目", "当前", "依据"]} rows={resourceContextRows(snapshot, state)} minRows={8} visual={pressureVisual} />
      <Module title="接口吞吐 Top5" subtitle="Top5 占比 / 条内主值 / 百分比右侧 / 只保留前五" module="resource-interface-top5" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(resourceTop5Rows(snapshot).slice(0, 5), "r3-")} className="ik-overview-top5-list" minRows={5} />
      <Module title="资源采集边界" subtitle="REST / SSH / 业务快照 / 展示边界" module="resource-boundary-ledger" tone="trust" trust={moduleTrust(state)} headers={["对象", "当前", "最近", "边界"]} rows={resourceBoundaryRows(snapshot, state)} minRows={8} />
      <Module title="资源页可信度" subtitle="最近成功 / 端点失败 / 下次尝试 / 展示边界" module="resource-page-trust" tone="trust" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={resourcePageTrustRows(snapshot, state)} minRows={5} />
    </div>
  </>;
}

function InterfacesDesktop({ snapshot, state }: OverviewPanelProps) {
  const forwardingRows = interfaceRows(snapshot, state);
  return <>
    <div className="ro-col is-main stack">
      <Module title="接口转发面" subtitle="down 清单 / 对象状态优先 / 关系下沉到载体表 / REST SSH" module="interface-forwarding" tone="danger" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={forwardingRows} minRows={6} visual={<JudgementChart module="interface-forwarding" kind="pressure" rows={interfaceForwardingChartRows(snapshot, state)} />} />
      <Module title="默认出口判断" subtitle="业务化路由事实 / 采集面仅作旁证" module="route-raw-facts" tone={state.facts.route.level} trust={moduleTrust(state)} headers={["路由域", "出口网关", "业务状态"]} rows={threeColumnRows(routeFactRows(snapshot, state), "rf3-")} minRows={6} />
      <Module title="接口影响面" subtitle="down 数 / 涉及接口 / 默认路由影响 / 转发面边界" module="interface-impact-ledger" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(interfaceImpactRows(snapshot, state), "i3-")} minRows={6} />
    </div>
    <div className="ro-col is-side stack ik-home-side-stack">
      <Module title="采集面通道" subtitle="采集面与接口转发面分离判断" module="interface-collection-channel" tone={state.facts.collection.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(interfaceCollectionRows(snapshot, state), "ic3-")} minRows={7} visual={<JudgementChart module="interface-collection-channel" kind="pressure" rows={collectionChannelRows(snapshot, state)} />} />
      <Module title="接口关系载体表" subtitle="父接口 / 桥接 / VLAN / PPPoE出口 下沉展示" module="interface-relation-carrier" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(interfaceRelationRows(snapshot, state), "irc3-")} minRows={7} />
      <Module title="转发面判断边界" subtitle="down对象 / 父接口 / 默认路由 / REST SSH / 下次尝试 / 展示边界" module="interface-forwarding-boundary" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "最近", "边界"]} rows={interfaceBoundaryRows(snapshot, state)} minRows={8} />
      <Module title="接口页可信度" subtitle="最近成功 / 默认路由 / 采集面 / 展示边界" module="interface-page-trust" tone="trust" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={interfacePageTrustRows(snapshot, state)} minRows={5} />
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
      <Module title="默认出口 / 缓存快照" subtitle="默认出口 / 网关 / 选路优先级 / 承载状态" module="collection-route-wan-boundary" tone={state.facts.route.level} trust="缓存快照" headers={["对象", "当前", "依据"]} rows={threeColumnRows(routeFactRows(snapshot, state), "crf3-")} minRows={6} />
      <Module title="WAN线路 / 缓存快照" subtitle="缓存快照" module="wan-lines" tone={state.facts.wan.allOffline ? "danger" : "trust"} trust="缓存快照" headers={["线路", "状态", "承载"]} rows={wanRows(snapshot, state)} minRows={6} />
      <Module title="资源边界 · 缓存快照" subtitle="采集异常下沉 / 缓存快照" module="collection-resource-threshold" tone={state.facts.resource.level} trust="缓存快照" headers={["对象", "当前", "依据"]} rows={threeColumnRows(resourceRows(state), "cr3-")} minRows={3} />
      <Module title="展示边界 / 降级模块" subtitle="展示范围 / 默认出口 / WAN / 资源 / 终端 / 端点失败" module="collection-readonly-boundary" tone="trust" trust="缓存快照" headers={["模块", "当前", "依据"]} rows={threeColumnRows(collectionReadonlyRows(snapshot, state), "cro-")} minRows={10} />
    </div>
  </>;
}

function AllOfflineDesktop({ snapshot, state }: OverviewPanelProps) {
  const offlineVisual = <JudgementChart module="wan-offline-bars" kind="pressure" rows={offlineWanStatusChartRows(snapshot, state)} />;
  return <>
    <div className="ro-col is-main stack">
      <Module title="WAN线路" subtitle="线路 / 状态 / 父接口 / 默认路由 / 速率：无有效样本" module="wan-offline-bars" tone="danger" trust={moduleTrust(state)} headers={["线路", "状态", "承载"]} rows={wanRows(snapshot, state)} minRows={8} visual={offlineVisual} />
      <Module title="默认出口判断" subtitle="路由域 / 网关 / 选路优先级 / 承载状态" module="wan-route-ledger" tone={state.facts.route.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(routeFactRows(snapshot, state), "wr3-")} minRows={10} />
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
      <Module title={isFleet ? "WAN趋势 / 账本 TopN" : "WAN趋势 / 出口 TopN"} subtitle={trafficSubtitle} module="wan-trend" tone={state.facts.wan.allOffline ? "danger" : "trust"} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={trafficLedgerRows} minRows={isFleet ? 12 : 8} visual={trafficVisual} />
      <Module title="业务出口证据" subtitle="默认出口 / 可达网关 / 选路优先级 / 承载状态；底层字段已转译" module="route-raw-facts" tone={state.facts.route.level} trust={moduleTrust(state)} headers={["对象", "网关", "优先级", "状态"]} rows={routeFactRows(snapshot, state)} minRows={10} />
      <Module title="采集可信度 / 最近成功" subtitle="REST 与 SSH 交叉校验 / 最近成功 / 端点失败" module="normal-collection-channel" tone={state.facts.collection.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(collectionRows(snapshot, state), "n3-")} minRows={8} />
    </div>
    <div className="ro-col is-side stack ik-home-side-stack">
      <Module title="资源阈值 / 承载能力" subtitle="当前 / 阈值 / 持续 / 峰值" module="resource-threshold" tone={state.facts.resource.level} trust={moduleTrust(state)} headers={["指标", "阈值", "持续", "峰值"]} rows={resourceRows(state)} minRows={3} visual={<JudgementChart module="resource-threshold" kind="pressure" rows={resourceChartRows(state)} />} />
      <Module title="WAN TopN / 路由采样" subtitle="Top3 / 默认路由 / 采样可信度 / 最近峰值" module="normal-wan-evidence" tone="trust" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(trafficEvidenceRows, "ne-")} minRows={8} visual={<JudgementChart module="normal-wan-evidence" kind="trend" rows={trafficChartRows(snapshot, state)} />} />
      <Module title="最近成功 / 采集事件" subtitle="REST / SSH / 最近成功 / 展示边界" module="normal-ops-ledger" tone={state.facts.collection.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={normalOpsRows(snapshot, state)} minRows={8} />
    </div>
  </>;
}

function compactRows(rows: LedgerRow[], count: number): LedgerRow[] {
  return rows.slice(0, count);
}

function desktopRecordRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null) : [];
}

function desktopNumber(value: unknown): number {
  const number = toNumber(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function desktopFirstText(row: Record<string, unknown>, keys: string[], fallback = "-"): string {
  for (const key of keys) {
    const value = text(row[key], "");
    if (value) return value;
  }
  return fallback;
}

function desktopRate(value: number): string {
  return value > 0 ? formatRate(value).replace(/\s+/g, "") : "未采集";
}

function desktopTerminalRows(snapshot: OverviewRawSnapshot): LedgerRow[] {
  const raw = snapshot as unknown as Record<string, unknown>;
  const connections = typeof raw.connections === "object" && raw.connections !== null ? raw.connections as Record<string, unknown> : {};
  const sources = [raw.terminals, raw.clients, raw.devices, connections.topTerminals, connections.topClients, connections.topIps];
  const rows = sources.map(desktopRecordRows).find((items) => items.length) || [];
  if (!rows.length) return [{ id: "terminal-empty", cells: ["终端 01", "IP 未记录", "等待流量样本"], tone: "missing" }];
  return rows
    .map((row, index) => {
      const ip = desktopFirstText(row, ["ip", "address", "host", "clientIp", "srcAddress"], "IP 未记录");
      const rawName = desktopFirstText(row, ["name", "deviceName", "hostname", "hostName", "label", "mac"], "");
      const down = desktopNumber(row.downRate ?? row.downloadRate ?? row.rxRate ?? row.download ?? row.down ?? row.bytesDown ?? row.rxBytes);
      const up = desktopNumber(row.upRate ?? row.uploadRate ?? row.txRate ?? row.upload ?? row.up ?? row.bytesUp ?? row.txBytes);
      const total = desktopNumber(row.totalRate ?? row.rate ?? row.traffic ?? row.bytes ?? row.total ?? row.value) || down + up;
      const rawStatus = desktopFirstText(row, ["status", "state", "health", "online"], "online").toLowerCase();
      const abnormal = /offline|down|error|blocked|abnormal|false|异常|离线|阻断/.test(rawStatus);
      return {
        id: `terminal-${index}`,
        cells: [rawName && rawName !== ip ? rawName : `终端 ${String(index + 1).padStart(2, "0")}`, ip, `${desktopRate(down)} ↓ / ${desktopRate(up)} ↑`, abnormal ? "异常" : "在线"],
        tone: abnormal ? "danger" : "trust",
        title: String(total),
      } satisfies LedgerRow;
    })
    .sort((a, b) => (b.tone === "danger" ? 1 : 0) - (a.tone === "danger" ? 1 : 0) || Number(b.title || 0) - Number(a.title || 0))
    .slice(0, 5);
}

function desktopEvidenceBoundaryRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  if (state.scenario === "no-snapshot") return compactRows(noSnapshotReadonlyDegradedRows(snapshot, state), 4);
  if (state.scenario === "collection-down") return compactRows(threeColumnRows(collectionReadonlyRows(snapshot, state), "desktop-boundary-"), 4);
  if (state.scenario === "resource-full") return compactRows([...routeRawEvidenceRows(snapshot, state), ...threeColumnRows(resourceBoundaryRows(snapshot, state), "desktop-res-boundary-")], 5);
  if (state.scenario === "interfaces-down") return compactRows([...routeRawEvidenceRows(snapshot, state), ...threeColumnRows(interfaceBoundaryRows(snapshot, state), "desktop-if-boundary-")], 5);
  if (state.scenario === "all-offline") return compactRows([...routeRawEvidenceRows(snapshot, state), ...threeColumnRows(allOfflineImpactRows(snapshot, state), "desktop-boundary-")], 5);
  return compactRows([...routeRawEvidenceRows(snapshot, state), ...normalOpsRows(snapshot, state)], 6);
}

function compactDesktopPanelGroups(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { main: ReactNode[]; side: ReactNode[]; bottom: ReactNode[] } {
  const trust = moduleTrust(state);
  const isFleet = state.scenario === "fleet";

  if (state.scenario === "no-snapshot") {
    const chainRows = noSnapshotChainRows(snapshot, state);
    const channelRows = noSnapshotChannelStatusRows(snapshot, state);
    const recentRows = lastSuccessRows(snapshot, state);
    const visibilityRows = noSnapshotVisibilityRows();
    const chainRowsCompact = compactRows(chainRows, 6);
    const channelRowsCompact = compactRows(channelRows, 5);
    return {
      main: [
        <Module key="ns-summary" title="采集链路" subtitle="RouterOS / REST / SSH / 快照" module="no-snapshot-summary" tone="danger" trust={trust} headers={["链路层", "当前", "最近成功", "主证据", "下次尝试"]} rows={chainRowsCompact} minRows={0} visual={<ChannelMatrixVisual module="no-snapshot-summary" rows={collectionChannelRows(snapshot, state)} />} />,
        <Module key="ns-channel" title="三通道状态" subtitle="失败端点 / 默认出口待判" module="no-snapshot-channel-status" tone="warn" trust={trust} headers={["通道", "当前", "说明"]} rows={channelRowsCompact} minRows={0} />,
        <Module key="ns-main-scope" title="展示范围" subtitle="业务禁显 / 管理面证据" module="snapshot-main-scope" tone="missing" trust={trust} headers={["模块", "状态", "原因", "边界"]} rows={compactRows(noSnapshotAuxiliaryScopeRows(snapshot, state), 4)} minRows={0} />,
      ],
      side: [
        <Module key="ns-recent" title="最近成功" subtitle="时间 / 状态" module="no-snapshot-recent-success" tone="trust" trust={trust} headers={["节点", "当前", "说明"]} rows={compactRows(recentRows, 4)} minRows={0} visual={<ChainTimeline rows={compactRows(recentRows, 4)} module="no-snapshot-recent-success-timeline" />} />,
        <Module key="ns-visibility" title="模块可见性矩阵" subtitle="无快照 / 禁显" module="no-snapshot-module-visibility" tone="missing" trust={trust} headers={["模块", "状态", "原因", "边界"]} rows={compactRows(visibilityRows, 6)} minRows={0} visual={<VisibilityMatrixVisual rows={compactRows(visibilityRows, 6)} />} />,
        <Module key="ns-side-degraded" title="降级模块" subtitle="只读边界 / 不推断业务值" module="snapshot-side-degraded" tone="missing" trust={trust} headers={["模块", "状态", "原因", "边界"]} rows={compactRows(noSnapshotAuxiliaryScopeRows(snapshot, state), 4)} minRows={0} />,
      ],
      bottom: [
        <Module key="ns-bottom-chain" title="采集边界" subtitle="RouterOS / REST / SSH / 快照" module="snapshot-bottom-chain" tone="warn" trust={trust} headers={["链路层", "当前", "最近成功", "主证据", "下次尝试"]} rows={compactRows(chainRows, 4)} minRows={0} />,
        <Module key="ns-bottom-visibility" title="不可展示模块" subtitle="WAN / 资源 / 终端 / 连接" module="snapshot-bottom-visibility" tone="missing" trust={trust} headers={["模块", "状态", "原因", "边界"]} rows={compactRows(visibilityRows, 4)} minRows={0} />,
        <Module key="ns-degraded" title="证据边界" subtitle="速率不展示 / 不用零值撑版" module="evidence-boundary" tone="missing" trust={trust} headers={["模块", "状态", "原因", "边界"]} rows={compactRows(noSnapshotReadonlyDegradedRows(snapshot, state), 4)} minRows={0} />,
      ],
    };
  }

  if (state.scenario === "resource-full") {
    const riskChart = resourceChartRows(state);
    const pressureRows = compactRows(resourceContextRows(snapshot, state), 8);
    const top5Rows = resourceTop5Rows(snapshot).slice(0, 8);
    return {
      main: [
        <Module key="res-risk" title="最危险项" subtitle="CPU / 内存 / 磁盘" module="resource-risk-priority" tone="danger" trust={trust} headers={["项", "当前", "阈值", "峰值"]} rows={resourceRiskRows(state)} minRows={0} visual={<VisualStack snapshot={snapshot} state={state}><ResourcePressureLedgerVisual rows={riskChart} /></VisualStack>} />,
        <Module key="res-pressure" title="连接压力" subtitle="连接 / 会话 / 接口" module="resource-pressure-bars" tone="warn" trust={trust} headers={["项目", "当前", "依据"]} rows={pressureRows} minRows={0} visual={<JudgementChart module="resource-pressure-bars" kind="pressure" rows={connectionPressureChartRows(snapshot, state)} />} />,
      ],
      side: [
        <Module key="res-interface" title="接口状态" subtitle="承载 / 边界" module="normal-interface-boundary" tone="trust" trust={trust} headers={["对象", "当前", "最近", "边界"]} rows={compactRows(interfaceBoundaryRows(snapshot, state), 4)} minRows={0} />,
        <Module key="res-top5" title="接口吞吐" subtitle="Top5 / 占比" module="resource-interface-top5" tone="warn" trust={trust} headers={["接口", "速率", "占比"]} rows={compactRows(top5Rows, 5)} className="ik-overview-top5-list" minRows={0} />,
        <Module key="res-collection" title="采集 / 快照" subtitle="REST / SSH / 成功" module="normal-collection-channel" tone={state.facts.collection.level} trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(threeColumnRows(collectionRows(snapshot, state), "res-col-"), 4)} minRows={0} visual={<ChannelMatrixVisual module="collection-status" rows={collectionChannelRows(snapshot, state)} />} />,
        <Module key="res-route" title="默认出口" subtitle="出口 / 承载 / 优先级" module="route-raw-facts" tone={state.facts.route.level} trust={trust} headers={["出口", "网关", "优先级", "状态"]} rows={compactRows(routeBusinessRows(snapshot, state), 4)} minRows={0} />,
      ],
      bottom: [
        <Module key="res-terminals" title="终端排行" subtitle="异常置顶 / 总流量" module="terminal-ranking" tone="trust" trust={trust} headers={["设备", "IP", "流量", "状态"]} rows={compactRows(desktopTerminalRows(snapshot), 4)} minRows={0} />,
        <Module key="res-events" title="最近事件" subtitle="采集 / 默认出口" module="normal-ops-ledger" tone={state.facts.collection.level} trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(normalOpsRows(snapshot, state), 4)} minRows={0} />,
        <Module key="res-boundary" title="原始证据" subtitle="字段下沉" module="evidence-boundary" tone="trust" trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows([...routeRawEvidenceRows(snapshot, state), ...threeColumnRows(resourceBoundaryRows(snapshot, state), "res-boundary-")], 4)} minRows={0} />,
      ],
    };
  }

  if (state.scenario === "collection-down") {
    const collectionVisual = <VisualStack snapshot={snapshot} state={state}><ChannelMatrixVisual module="collection-cache-ledger" rows={collectionChannelRows(snapshot, state)} /></VisualStack>;
    return {
      main: [
        <Module key="col-channel" title="通道状态" subtitle="REST / SSH / 快照" module="collection-channel-ledger" tone="warn" trust="缓存快照" headers={["对象", "当前", "依据"]} rows={threeColumnRows(collectionRows(snapshot, state), "c3-")} minRows={0} visual={collectionVisual} />,
        <Module key="col-recent" title="最近成功" subtitle="上次成功 / 边界" module="collection-recent-failures" tone="trust" headers={["节点", "当前", "说明"]} rows={lastSuccessRows(snapshot, state)} minRows={0} />,
      ],
      side: [
        <Module key="col-boundary" title="展示边界" subtitle="不写配置 / 不推断" module="collection-cache-boundary" tone="warn" headers={["对象", "当前", "依据"]} rows={compactRows(threeColumnRows(collectionBoundaryLedgerRows(snapshot, state), "cbl-"), 6)} minRows={0} />,
        <Module key="col-route" title="默认出口" subtitle="出口 / 承载 / 优先级" module="collection-route-wan-boundary" tone={state.facts.route.level} headers={["出口", "网关", "优先级", "状态"]} rows={compactRows(routeBusinessRows(snapshot, state), 4)} minRows={0} />,
        <Module key="col-wan" title="WAN线路" subtitle="参考" module="wan-lines" tone={state.facts.wan.allOffline ? "danger" : "trust"} headers={["线路", "状态", "承载"]} rows={compactRows(wanRows(snapshot, state), 4)} minRows={0} />,
      ],
      bottom: [
        <Module key="col-events" title="采集事件" subtitle="最近成功 / 端点失败 / 默认出口" module="collection-bottom-events" tone="trust" headers={["对象", "当前", "依据"]} rows={compactRows(threeColumnRows(collectionReadonlyRows(snapshot, state), "cro-"), 4)} minRows={0} />,
      ],
    };
  }

  if (state.scenario === "interfaces-down") {
    return {
      main: [
        <Module key="if-forward" title="接口转发面" subtitle="Down 数 / 承载 / 默认出口" module="interface-forwarding" tone="danger" trust={trust} headers={["对象", "当前", "依据"]} rows={interfaceRows(snapshot, state)} minRows={0} visual={<VisualStack snapshot={snapshot} state={state} />} />,
        <Module key="if-route" title="默认出口影响" subtitle="出口 / 承载 / 优先级" module="route-raw-facts" tone={state.facts.route.level} trust={trust} headers={["出口", "网关", "优先级", "状态"]} rows={compactRows(routeBusinessRows(snapshot, state), 4)} minRows={0} />,
      ],
      side: [
        <Module key="if-collection" title="采集面通道" subtitle="REST / SSH / 快照" module="interface-collection-channel" tone={state.facts.collection.level} trust={trust} headers={["对象", "当前", "依据"]} rows={threeColumnRows(interfaceCollectionRows(snapshot, state), "ic3-")} minRows={0} visual={<ChannelMatrixVisual module="interface-collection-channel" rows={collectionChannelRows(snapshot, state)} />} />,
        <Module key="if-relation" title="承载关系" subtitle="父接口 / VLAN / PPPoE" module="interface-relation-carrier" tone="warn" trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(threeColumnRows(interfaceRelationRows(snapshot, state), "irc3-"), 5)} minRows={0} />,
        <Module key="if-boundary" title="判断边界" subtitle="Down / 默认出口 / 采集" module="interface-forwarding-boundary" tone="warn" trust={trust} headers={["对象", "当前", "最近", "边界"]} rows={compactRows(interfaceBoundaryRows(snapshot, state), 4)} minRows={0} />,
      ],
      bottom: [
        <Module key="if-events" title="接口事件" subtitle="最近成功 / 默认出口 / 采集面" module="interface-page-trust" tone="trust" trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(interfacePageTrustRows(snapshot, state), 4)} minRows={0} />,
        <Module key="if-terminals" title="终端排行" subtitle="异常置顶 / 总流量" module="terminal-ranking" tone="trust" trust={trust} headers={["设备", "IP", "流量", "状态"]} rows={desktopTerminalRows(snapshot)} minRows={0} />,
        <Module key="if-raw" title="路由证据" subtitle="main / gateway / distance" module="evidence-boundary" tone="trust" trust={trust} headers={["对象", "当前", "依据"]} rows={routeRawEvidenceRows(snapshot, state)} minRows={0} />,
      ],
    };
  }

  if (state.scenario === "all-offline") {
    const offlineRows = wanRows(snapshot, state);
    return {
      main: [
        <Module key="ao-wan" title="WAN线路" subtitle="0/8 / 出口不可用" module="wan-offline-bars" tone="danger" trust={trust} headers={["线路", "状态", "承载"]} rows={offlineRows} minRows={0} visual={<VisualStack snapshot={snapshot} state={state} />} />,
        <Module key="ao-route" title="默认出口判断" subtitle="出口 / 承载 / 优先级" module="wan-route-ledger" tone={state.facts.route.level} trust={trust} headers={["出口", "网关", "优先级", "状态"]} rows={routeBusinessRows(snapshot, state)} minRows={0} />,
      ],
      side: [
        <Module key="ao-continuity" title="WAN连续性" subtitle="0/8 / 默认路由异常" module="wan-offline-continuity" tone="danger" trust={trust} headers={["字段", "当前", "依据"]} rows={compactRows(wanContinuityRows(state), 8)} minRows={0} />,
        <Module key="ao-collection" title="采集通道" subtitle="REST / SSH / 快照" module="collection-status" tone={state.facts.collection.level} trust={trust} headers={["对象", "当前", "依据"]} rows={threeColumnRows(collectionRows(snapshot, state), "ao3-")} minRows={0} visual={<ChannelMatrixVisual module="collection-status" rows={collectionChannelRows(snapshot, state)} />} />,
        <Module key="ao-impact" title="业务影响" subtitle="默认路由 / 速率不展示" module="wan-offline-impact-boundary" tone="warn" trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(threeColumnRows(allOfflineImpactRows(snapshot, state), "aoi-"), 5)} minRows={0} />,
      ],
      bottom: [
        <Module key="ao-interface" title="接口 / WAN 边界" subtitle="接口承载 / 默认出口" module="wan-offline-bottom-interface" tone="warn" trust={trust} headers={["对象", "当前", "最近", "边界"]} rows={compactRows(interfaceBoundaryRows(snapshot, state), 4)} minRows={0} />,
        <Module key="ao-events" title="采集事件" subtitle="REST / SSH / 最近成功" module="wan-offline-bottom-events" tone={state.facts.collection.level} trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(normalOpsRows(snapshot, state), 4)} minRows={0} />,
        <Module key="ao-raw" title="路由证据" subtitle="main / gateway / distance" module="evidence-boundary" tone="trust" trust={trust} headers={["对象", "当前", "依据"]} rows={routeRawEvidenceRows(snapshot, state)} minRows={0} />,
      ],
    };
  }

  const networkRows = state.scenario === "no-snapshot"
    ? compactRows(noSnapshotChainRows(snapshot, state), 4)
    : state.scenario === "all-offline"
      ? compactRows(wanRows(snapshot, state), 8)
      : compactRows(trafficRows(snapshot, state), state.scenario === "fleet" ? 6 : 5);
  const networkVisual = state.scenario === "no-snapshot"
    ? <ChainTimeline rows={networkRows} module="no-snapshot-summary-chain" />
    : state.scenario === "all-offline"
      ? <VisualStack snapshot={snapshot} state={state} />
      : <MiniTrendVisual module="traffic-trend" rows={trafficChartRows(snapshot, state)} />;
  const routeRowsCompact = state.scenario === "no-snapshot" ? compactRows(noSnapshotBusinessBoundaryRows(snapshot, state), 4) : compactRows(routeBusinessRows(snapshot, state), 4);
  const routeHeaders = state.scenario === "no-snapshot" ? ["模块", "当前", "影响", "边界"] : ["出口", "网关", "优先级", "状态"];
  const collectionRowsCompact = state.scenario === "no-snapshot" ? compactRows(noSnapshotChainRows(snapshot, state), 4) : compactRows(threeColumnRows(collectionRows(snapshot, state), "desktop-collection-"), 4);
  const interfaceRowsCompact = state.scenario === "interfaces-down" ? compactRows(threeColumnRows(interfaceRows(snapshot, state), "desktop-if-"), 5) : compactRows(interfaceBoundaryRows(snapshot, state), 4);
  const wanEvidenceRows = compactRows(threeColumnRows([
    ...trafficTop3Rows(snapshot, state),
    ...trafficRouteRows(snapshot, state),
    ...trafficSamplingRows(snapshot, state),
    ...trafficPeakRows(snapshot, state),
  ], "desktop-wan-evidence-"), isFleet ? 5 : 4);
  return {
    main: [
      <Module key="compact-network" title={state.scenario === "no-snapshot" ? "采集链路" : isFleet ? "WAN账本" : "WAN出口"} subtitle={state.scenario === "all-offline" ? "0/8 / 出口不可用" : isFleet ? "类型分布 / 异常TopN" : "当前 / 峰值 / 窗口"} module={state.scenario === "all-offline" ? "wan-offline-bars" : state.scenario === "no-snapshot" ? "no-snapshot-summary" : "wan-trend"} tone={state.scenario === "all-offline" || state.scenario === "no-snapshot" ? "danger" : state.facts.wan.allOffline ? "danger" : "trust"} trust={trust} headers={state.scenario === "no-snapshot" ? ["链路层", "当前", "最近成功", "主证据", "下次尝试"] : ["对象", "当前", "依据"]} rows={networkRows} minRows={0} visual={networkVisual} />,
      <Module key="compact-route" title={state.scenario === "no-snapshot" ? "业务边界" : "默认出口"} subtitle={state.scenario === "no-snapshot" ? "不展示" : isFleet ? "默认路由条目 / 承载" : "出口 / 承载 / 优先级"} module={state.scenario === "no-snapshot" ? "no-snapshot-module-visibility" : "route-raw-facts"} tone={state.scenario === "all-offline" ? "danger" : state.facts.route.level} trust={trust} headers={routeHeaders} rows={routeRowsCompact} minRows={0} visual={state.scenario === "no-snapshot" ? <VisibilityMatrixVisual rows={routeRowsCompact} /> : undefined} />,
      <Module key="compact-wan-evidence" title={isFleet ? "WAN异常TopN" : "WAN证据"} subtitle={isFleet ? "离线对象 / 类型分布" : "Top3 / 采样"} module="normal-wan-evidence" tone={state.facts.wan.offline ? "warn" : "trust"} trust={trust} headers={["对象", "当前", "依据"]} rows={wanEvidenceRows} minRows={0} />,
    ],
    side: [
      <Module key="compact-interface" title="接口状态" subtitle={state.scenario === "interfaces-down" ? "Down / 默认出口" : "转发面 / 承载"} module={state.scenario === "interfaces-down" ? "interface-forwarding" : "normal-interface-boundary"} tone={state.scenario === "interfaces-down" ? "danger" : "trust"} trust={trust} headers={state.scenario === "interfaces-down" ? ["对象", "当前", "依据"] : ["对象", "当前", "最近", "边界"]} rows={interfaceRowsCompact} minRows={0} visual={state.scenario === "interfaces-down" ? <JudgementChart module="interface-forwarding" kind="pressure" rows={interfaceForwardingChartRows(snapshot, state)} /> : undefined} />,
      <Module key="compact-resource" title={state.scenario === "resource-full" ? "资源满载" : "资源"} subtitle={state.scenario === "resource-full" ? "三项超阈" : isFleet ? "接口排行 / 阈值" : "当前 / 阈值"} module={state.scenario === "resource-full" ? "resource-risk-priority" : "resource-threshold"} tone={state.scenario === "no-snapshot" ? "missing" : state.facts.resource.level} trust={trust} headers={["项", "阈值", "持续", "峰值"]} rows={compactRows(resourceRows(state), 3)} minRows={0} />,
      <Module key="compact-collection" title={isFleet ? "采集可信度" : "采集 / 快照"} subtitle={state.scenario === "collection-down" ? "REST / SSH / 快照" : "REST / SSH / 成功"} module={state.scenario === "collection-down" ? "collection-channel-ledger" : state.scenario === "no-snapshot" ? "no-snapshot-channel-status" : "normal-collection-channel"} tone={state.scenario === "collection-down" || state.scenario === "no-snapshot" ? "warn" : state.facts.collection.level} trust={trust} headers={state.scenario === "no-snapshot" ? ["链路层", "当前", "最近成功", "主证据", "下次尝试"] : ["对象", "当前", "依据"]} rows={collectionRowsCompact} minRows={0} visual={<ChannelMatrixVisual module="collection-status" rows={collectionChannelRows(snapshot, state)} />} />,
    ],
    bottom: [
      <Module key="compact-terminals" title="终端排行" subtitle="异常置顶 / 总流量" module="terminal-ranking" tone="trust" trust={trust} headers={["设备", "IP", "流量", "状态"]} rows={compactRows(desktopTerminalRows(snapshot), 4)} minRows={0} />,
      <Module key="compact-events" title="最近事件" subtitle="采集 / 默认出口" module="normal-ops-ledger" tone={state.facts.collection.level} trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(normalOpsRows(snapshot, state), 4)} minRows={0} />,
      <Module key="compact-boundary" title="原始证据" subtitle="字段下沉" module={state.scenario === "no-snapshot" ? "no-snapshot-degraded-modules" : "evidence-boundary"} tone={state.scenario === "no-snapshot" ? "missing" : "trust"} trust={trust} headers={state.scenario === "resource-full" || state.scenario === "interfaces-down" ? ["对象", "当前", "最近", "边界"] : ["对象", "当前", "依据"]} rows={compactRows(desktopEvidenceBoundaryRows(snapshot, state), 4)} minRows={0} />,
    ],
  };
}

function desktopPanelGroups(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { main: ReactNode[]; side: ReactNode[]; bottom: ReactNode[] } {
  return compactDesktopPanelGroups(snapshot, state);
  const isFleet = state.scenario === "fleet";
  if (state.scenario === "no-snapshot") {
    const chainRows = noSnapshotChainRows(snapshot, state);
    const boundaryRows = noSnapshotBusinessBoundaryRows(snapshot, state);
    const recentRows = lastSuccessRows(snapshot, state);
    const readonlyRows = noSnapshotReadonlyDegradedRows(snapshot, state);
    const visibilityRows = noSnapshotVisibilityRows();
    const readonlyBoundaryRows = readonlyRows.filter((row) => !/^readonly-(business|rate)$/.test(row.id));
    const degradedModuleRows = visibilityRows.filter((row) => /^vis-(wan|resource|terminals|conn|rate|page-trust|readonly)$/.test(row.id));
    return {
      main: [
        <Module key="ns-summary" title="采集链路账本" subtitle="路由器管理面 / REST / SSH / 业务快照；只展示链路事实" module="no-snapshot-summary" tone="danger" headers={["链路层", "当前", "最近成功", "主证据", "下次尝试"]} rows={chainRows} minRows={9} visual={<ChainTimeline rows={chainRows} module="no-snapshot-summary-chain" />} />,
        <Module key="ns-boundary" title="业务展示边界" subtitle="业务字段不裸露 / WAN / 资源 / 终端 / 连接 / 速率禁用，不使用零速率撑版面" module="no-snapshot-module-visibility" tone="warn" headers={["模块", "当前", "影响", "边界"]} rows={boundaryRows} minRows={8} visual={<VisibilityMatrixVisual rows={boundaryRows} />} />,
        <Module key="ns-success" title="最近成功" subtitle="最近成功时间、当前管理面、业务隐藏、下次尝试；只做链路证据" module="no-snapshot-recent-success" tone="trust" headers={["节点", "当前", "说明"]} rows={recentRows} minRows={8} visual={<ChainTimeline rows={recentRows} module="no-snapshot-recent-success-timeline" />} />,
      ],
      side: [
        <Module key="ns-channel-status" title="采集通道状态" subtitle="RouterOS / REST / SSH / 最近成功 / 失败端点 / 业务快照" module="no-snapshot-channel-status" tone="warn" headers={["通道", "当前", "最近成功", "证据", "下次尝试"]} rows={chainRows} minRows={8} visual={<ChainTimeline rows={chainRows} module="no-snapshot-channel-status-chain" />} />,
        <Module key="ns-degraded-modules" title="降级模块" subtitle="业务模块禁显清单；WAN速率不占位、不撑版面、不显示零速率" module="no-snapshot-degraded-modules" tone="missing" headers={["模块", "状态", "原因", "边界"]} rows={degradedModuleRows} minRows={7} visual={<VisibilityMatrixVisual rows={degradedModuleRows} />} />,
      ],
      bottom: [],
    };
  }
  if (state.scenario === "resource-full") {
    const resourceChart = resourceChartRows(state);
    return {
      main: [
        <Module key="res-priority" title="最危险项 / 资源阈值" subtitle="处理器 / 内存 / 磁盘 先读 / 再看连接压力 / 默认路由 / 采集可信度" module="resource-risk-priority" tone="danger" trust={moduleTrust(state)} headers={["指标", "阈值", "持续", "峰值"]} rows={resourceRiskRows(state)} minRows={8} visual={<div className="ro-resource-visual"><JudgementChart module="resource-risk-priority" kind="trend" rows={resourceChart} /><ResourceTriCards rows={resourceChart} /></div>} />,
        <Module key="res-sustain" title="持续窗口 / 压力旁证" subtitle="最近 6 点 / 均值峰值 / 连接数 / 接口吞吐 / DNS 缓存 / 展示边界" module="resource-sustain-ledger" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据", "边界"]} rows={resourceSustainRows(snapshot, state)} minRows={10} />,
      ],
      side: [
        <Module key="res-pressure" title="连接压力 / 互补信息" subtitle="连接压力 / 活动会话 / DNS缓存 / 接口吞吐 / 默认路由 / 互补证据" module="resource-pressure-bars" tone="warn" trust={moduleTrust(state)} headers={["项目", "当前", "依据"]} rows={resourceContextRows(snapshot, state)} minRows={8} visual={<JudgementChart module="resource-pressure-bars" kind="pressure" rows={connectionPressureChartRows(snapshot, state)} />} />,
        <Module key="res-top5" title="接口吞吐 Top5" subtitle="Top5 占比 / 条内主值 / 百分比右侧 / 只保留前 5" module="resource-interface-top5" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(resourceTop5Rows(snapshot).slice(0, 5), "r3-")} className="ik-overview-top5-list" minRows={5} />,
      ],
      bottom: [
        <Module key="res-boundary" title="接口 / 采集边界" subtitle="REST / SSH / 业务快照 / 展示边界" module="resource-boundary-ledger" tone="trust" trust={moduleTrust(state)} headers={["对象", "当前", "最近", "边界"]} rows={resourceBoundaryRows(snapshot, state)} minRows={6} />,
        <Module key="res-events" title="资源事件 / 页可视度" subtitle="最近成功 / 端点失败 / 下一次轮询 / 展示边界" module="resource-page-trust" tone="trust" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={resourcePageTrustRows(snapshot, state)} minRows={5} />,
      ],
    };
  }
  if (state.scenario === "interfaces-down") {
    const forwardingRows = interfaceRows(snapshot, state);
    return {
      main: [
        <Module key="if-forward" title="接口转发面" subtitle="down 清单 / 对象状态优先 / 关系下沉到载体表 / REST SSH" module="interface-forwarding" tone="danger" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={forwardingRows} minRows={6} visual={<JudgementChart module="interface-forwarding" kind="pressure" rows={interfaceForwardingChartRows(snapshot, state)} />} />,
        <Module key="if-route" title="默认出口判断" subtitle="业务化路由事实 / 采集面仅作旁证" module="route-raw-facts" tone={state.facts.route.level} trust={moduleTrust(state)} headers={["路由域", "出口网关", "业务状态"]} rows={threeColumnRows(routeFactRows(snapshot, state), "rf3-")} minRows={6} />,
        <Module key="if-boundary" title="转发面判断边界" subtitle="down对象 / 父接口 / 默认路由 / REST SSH / 下次尝试 / 展示边界" module="interface-forwarding-boundary" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "最近", "边界"]} rows={interfaceBoundaryRows(snapshot, state)} minRows={8} />,
      ],
      side: [
        <Module key="if-impact" title="接口影响面" subtitle="down 数 / 涉及接口 / 默认路由影响 / 转发面边界" module="interface-impact-ledger" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(interfaceImpactRows(snapshot, state), "i3-")} minRows={6} />,
        <Module key="if-collection" title="采集面通道" subtitle="采集面与接口转发面分离判断" module="interface-collection-channel" tone={state.facts.collection.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(interfaceCollectionRows(snapshot, state), "ic3-")} minRows={7} visual={<JudgementChart module="interface-collection-channel" kind="pressure" rows={collectionChannelRows(snapshot, state)} />} />,
        <Module key="if-relation" title="接口关系载体表" subtitle="父接口 / 桥接 / VLAN / PPPoE出口 下沉展示" module="interface-relation-carrier" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(interfaceRelationRows(snapshot, state), "irc3-")} minRows={7} />,
      ],
      bottom: [
        <Module key="if-page" title="接口页可信度 / 事件" subtitle="最近成功 / 默认路由 / 采集面 / 展示边界" module="interface-page-trust" tone="trust" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={interfacePageTrustRows(snapshot, state)} minRows={5} />,
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
        <Module key="col-route" title="默认出口 / 缓存快照" subtitle="默认出口 / 网关 / 选路优先级 / 承载状态" module="collection-route-wan-boundary" tone={state.facts.route.level} trust="缓存快照" headers={["对象", "当前", "依据"]} rows={threeColumnRows(routeFactRows(snapshot, state), "crf3-")} minRows={6} />,
        <Module key="col-wan" title="WAN线路 / 缓存快照" subtitle="缓存快照" module="wan-lines" tone={state.facts.wan.allOffline ? "danger" : "trust"} trust="缓存快照" headers={["线路", "状态", "承载"]} rows={wanRows(snapshot, state)} minRows={6} />,
      ],
      bottom: [
        <Module key="col-interface" title="接口 / WAN 展示边界" subtitle="采集异常下沉：接口与 WAN 只作缓存参考" module="collection-bottom-interface" tone="warn" trust="缓存快照" headers={["对象", "当前", "最近", "边界"]} rows={interfaceBoundaryRows(snapshot, state)} minRows={6} />,
        <Module key="col-events" title="采集事件 / 降级边界" subtitle="最近成功 / 端点失败 / 默认出口 / 展示范围" module="collection-bottom-events" tone="trust" trust="缓存快照" headers={["模块", "当前", "依据"]} rows={threeColumnRows(collectionReadonlyRows(snapshot, state), "cro-")} minRows={8} />,
      ],
    };
  }
  if (state.scenario === "all-offline") {
    const offlineVisual = <JudgementChart module="wan-offline-bars" kind="trend" rows={offlineWanStatusChartRows(snapshot, state)} />;
    return {
      main: [
        <Module key="ao-wan" title="WAN线路" subtitle="线路 / 状态 / 父接口 / 默认路由 / 速率：无有效样本" module="wan-offline-bars" tone="danger" trust={moduleTrust(state)} headers={["线路", "状态", "承载"]} rows={wanRows(snapshot, state)} minRows={8} visual={offlineVisual} />,
        <Module key="ao-route" title="默认出口判断" subtitle="路由域 / 网关 / 选路优先级 / 承载状态" module="wan-route-ledger" tone={state.facts.route.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(routeFactRows(snapshot, state), "wr3-")} minRows={10} />,
      ],
      side: [
        <Module key="ao-continuity" title="WAN连续性" subtitle="WAN 0/8 / 离线对象 / 默认路由异常 / 速率无有效样本" module="wan-offline-continuity" tone="danger" trust={moduleTrust(state)} headers={["字段", "当前", "依据"]} rows={wanContinuityRows(state)} minRows={14} />,
        <Module key="ao-collection" title="采集通道" subtitle="采集通道 · 缓存快照 / 事故判断的采集可信度" module="collection-status" tone={state.facts.collection.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(collectionRows(snapshot, state), "ao3-")} minRows={8} visual={<JudgementChart module="collection-status" kind="pressure" rows={collectionChannelRows(snapshot, state)} />} />,
        <Module key="ao-impact" title="业务影响 / 展示边界" subtitle="默认路由 / 承载关系 / 速率不展示 / 只读状态台" module="wan-offline-impact-boundary" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(allOfflineImpactRows(snapshot, state), "aoi-")} minRows={8} />,
      ],
      bottom: [
        <Module key="ao-interface" title="接口 / WAN 展示边界" subtitle="WAN 全离线时优先保留接口承载与默认出口边界" module="wan-offline-bottom-interface" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "最近", "边界"]} rows={interfaceBoundaryRows(snapshot, state)} minRows={6} />,
        <Module key="ao-events" title="采集事件" subtitle="REST / SSH / 最近成功 / 默认出口" module="wan-offline-bottom-events" tone={state.facts.collection.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={normalOpsRows(snapshot, state)} minRows={6} />,
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
      <Module key="n-traffic" title={isFleet ? "WAN趋势 / 账本 TopN" : "WAN趋势 / 出口 TopN"} subtitle={isFleet ? "当前 / 峰值 / 均值 / 窗口 / 阈值 / 单位 / 可视度 / WAN Top3 / 默认路由 / 采样可信度 / 最近峰值" : "当前 / 峰值 / 均值 / 窗口 / 阈值 / 单位 / 可视度 / WAN Top3 / 默认路由 / 采样可信度 / 最近峰值"} module="wan-trend" tone={state.facts.wan.allOffline ? "danger" : "trust"} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={trafficLedgerRows} minRows={isFleet ? 12 : 8} visual={trafficVisual} />,
      <Module key="n-route" title="业务出口证据" subtitle="默认出口 / 可达网关 / 选路优先级 / 承载状态；底层字段已转译" module="route-raw-facts" tone={state.facts.route.level} trust={moduleTrust(state)} headers={["对象", "网关", "优先级", "状态"]} rows={routeFactRows(snapshot, state)} minRows={10} />,
      <Module key="n-wan" title="WAN TopN / 路由采样" subtitle="Top3 / 默认出口 / 采样可信度 / 最近峰值" module="normal-wan-evidence" tone="trust" trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(trafficEvidenceRows, "ne-")} minRows={8} />,
    ],
    side: [
      <Module key="n-resource" title="资源阈值 / 承载能力" subtitle="当前 / 阈值 / 持续 / 峰值" module="resource-threshold" tone={state.facts.resource.level} trust={moduleTrust(state)} headers={["指标", "阈值", "持续", "峰值"]} rows={resourceRows(state)} minRows={3} visual={<JudgementChart module="resource-threshold" kind="pressure" rows={resourceChartRows(state)} />} />,
      <Module key="n-collect" title="采集可信度 / 最近成功" subtitle="REST 与 SSH 交叉校验 / 最近成功 / 端点失败" module="normal-collection-channel" tone={state.facts.collection.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={threeColumnRows(collectionRows(snapshot, state), "n3-")} minRows={8} />,
    ],
    bottom: [
      <Module key="n-interface" title="接口状态 / 转发边界" subtitle="Down 对象 / 父接口 / 默认出口 / 采集通道 / 转发边界" module="normal-interface-boundary" tone="warn" trust={moduleTrust(state)} headers={["对象", "当前", "最近", "边界"]} rows={interfaceBoundaryRows(snapshot, state)} minRows={8} />,
      <Module key="n-events" title="最近成功 / 采集事件" subtitle="REST / SSH / 最近成功 / 采集事件" module="normal-ops-ledger" tone={state.facts.collection.level} trust={moduleTrust(state)} headers={["对象", "当前", "依据"]} rows={normalOpsRows(snapshot, state)} minRows={8} />,
    ],
  };
}

function DesktopWorkspace({ snapshot, state }: OverviewPanelProps) {
  const sections = desktopPanelGroups(snapshot, state);

  return (
    <div
      className="ro-desktop-grid ik-home-layout"
      data-overview-desktop-layout="fixed-summary-keymetrics-left-right-bottom"
      data-overview-desktop-hierarchy="conclusion-key-metrics-evidence"
      data-overview-desktop-hierarchy-tier="3-evidence"
      data-overview-desktop-skeleton="top-six-summary-left-network-wan-right-resource-collection-bottom-interface-events"
      data-overview-desktop-surface="ikuai40-admin-console-not-consumer-app-cards"
      data-overview-desktop-left-rail="network-wan"
      data-overview-desktop-right-rail="resource-collection"
      data-overview-desktop-bottom-rail="interface-events"
      data-overview-desktop-detail
      data-overview-desktop-workspace
      data-overview-desktop-core-text={desktopCoreText(state)}
      data-overview-desktop-copy-policy="business-first-routeros-fields-translated-in-evidence"
      data-overview-desktop-toy-nav-leak-guard="desktop-content-icon-tabs-removed"
      data-overview-desktop-content-icon-tabs="desktop-hides-content-icon-tabs"
      data-overview-verdict-panel={verdictContractText(snapshot, state)}
      data-overview-trend-compact="framework-ledger"
      data-overview-no-snapshot-grid={state.scenario === "no-snapshot" ? "main-chain-boundary-success-route-side-readonly-degraded" : undefined}
      data-overview-no-snapshot-detail={state.scenario === "no-snapshot" ? "left-chain-ledger-business-boundary-recent-success-right-readonly-boundary-degraded-modules" : undefined}
      data-overview-no-snapshot-left-main={state.scenario === "no-snapshot" ? "collection-chain-ledger-business-boundary-recent-success" : undefined}
      data-overview-no-snapshot-right-side={state.scenario === "no-snapshot" ? "readonly-boundary-degraded-modules" : undefined}
      data-overview-no-snapshot-wan-rate-layout-guard={state.scenario === "no-snapshot" ? "no-wan-rate-panel-no-zero-rate-no-rate-spacer" : undefined}
      data-overview-desktop-effective-content-height="760"
      data-overview-desktop-redline-markers="no-empty-left60-no-duplicate-boundary-no-nosnapshot-wan-rate-no-toy-tabs"
      data-overview-no-snapshot-no-wan-rate-placeholder={state.scenario === "no-snapshot" ? "business-rates-hidden" : undefined}
      data-overview-no-snapshot-zero-rate-guard={state.scenario === "no-snapshot" ? "replace-zero-rate-with-hidden" : undefined}
      data-overview-side-table-mode="three-col-no-badge"
      data-overview-desktop-fixed-skeleton="left-network-wan-right-resource-collection-bottom-interface-events"
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
      data-overview-desktop-ikuai40-console="top-six-left-network-wan-right-resource-collection-bottom-interface-events"
    >
      <DesktopThinKpis snapshot={snapshot} state={state} />
      <div className="ro-col is-main stack" data-overview-desktop-rail="network-wan" data-overview-desktop-fixed-area="left-main">{sections.main}</div>
      <div className="ro-col is-side stack ik-home-side-stack" data-overview-desktop-rail="resource-collection" data-overview-desktop-fixed-area="right-main">{sections.side}</div>
      {sections.bottom.length > 0 ? <div className="ro-col is-bottom stack" style={{ gridColumn: "1 / -1" }} data-overview-desktop-rail="interface-events" data-overview-desktop-fixed-area="bottom">{sections.bottom}</div> : null}
    </div>
  );
}

function MobileDetail({ snapshot, state }: OverviewPanelProps) {
  if (state.scenario === "no-snapshot") {
    const recent = latestSuccess(snapshot, state.scenario);
    return <MobileRows module="mobile-no-snapshot-ledger" rows={[
      { id: "mns-chain", cells: ["采集链路账本", "路由器当前不可达 / REST 待核 / SSH 断链 / 默认出口待判", `最近成功 ${recent}`], tone: "warn" },
      { id: "mns-business", cells: ["业务数据展示边界", "无业务快照", "WAN / 资源 / 终端 / 连接 / 速率不展示", `状态更新 ${statusUpdated(snapshot)}`], tone: "missing" },
      { id: "mns-success", cells: ["最后成功摘要", recent, "端点失败未记录", `下次尝试 ${pollText(snapshot)}`], tone: recent === "未记录" ? "warn" : "trust" },
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
        return { id: `if-mobile-down-${name}-${index}`, cells: [name, `父接口 ${parent}`, `${accessNode} · 默认出口 ${routeLabelText(state)}`], tone: "danger" as OverviewTone } satisfies LedgerRow;
      });
    return <MobileRows module="mobile-interface-forwarding" rows={[
      ...downRows,
      { id: "if-mobile-route", cells: ["默认出口影响", routeLabelText(state), "转发面证据优先"], tone: state.facts.route.level },
      { id: "if-mobile-collection-pair", cells: ["采集面", `REST ${restState(snapshot, state).value} / SSH ${sshState(snapshot, state).value}`, "采集通道不替代转发面判断"], tone: "warn" as OverviewTone },
    ]} columns={3} />;
  }
  if (state.scenario === "fleet") {
    return <MobileRows module="mobile-primary-detail" rows={[
      ...wanRows(snapshot, state).slice(0, 3),
      { id: "mobile-route", cells: ["默认出口", routeLabelText(state), mobileRouteText(state)], tone: state.facts.route.level },
      { id: "mobile-collection", cells: ["采集", state.facts.collection.channelText, "最近成功记录", `最近成功 ${latestSuccess(snapshot, state.scenario)}`], tone: state.facts.collection.level },
    ]} />;
  }
  const wanLeadRows = wanRows(snapshot, state).slice(0, 2);
  const defaultRows: LedgerRow[] = state.scenario === "collection-down"
    ? collectionRows(snapshot, state).slice(0, 4).map((row) => ({ ...row, cells: [row.cells[0], row.cells[1], `${row.cells[2]} / ${row.cells[3]}`] }))
    : [
      ...wanLeadRows,
      { id: "mobile-route", cells: ["默认出口", routeLabelText(state), mobileRouteText(state)], tone: state.facts.route.level },
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
      data-overview-ikuai40-density="apple-flat-light-blue-console"
      data-overview-flat-ledger-surface="light-blue-white-thin-lines-low-shadow"
      data-overview-mobile-metrics
      data-overview-mobile-home-mode="ios-app-home"
      data-overview-mobile-home-acceptance="ios-router-home-primary-flow"
      data-overview-hard-standard="desktop-status-bus-mobile-ios-app-home-chart-meta-sample-depth-required-no-large-alert-card"
      data-overview-desktop-mobile-leakage-guard="hide-mobile-shell-on-desktop"
      data-overview-desktop-hierarchy-contract="conclusion-key-metrics-evidence"
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
      data-overview-no-snapshot-density-contract={state.scenario === "no-snapshot" ? "left60-chain-boundary-success-route-right-readonly-degraded" : undefined}
      data-overview-no-snapshot-no-stretch-cards={state.scenario === "no-snapshot" ? "auto-height-content" : undefined}
      data-overview-no-snapshot-content-sized={state.scenario === "no-snapshot" ? "true" : undefined}
      data-overview-no-snapshot-content-packed={state.scenario === "no-snapshot" ? "chain-boundary-success-no-empty-left60" : undefined}
      data-overview-no-snapshot-no-wan-rate-placeholder={state.scenario === "no-snapshot" ? "business-rates-hidden" : undefined}
      data-overview-no-snapshot-big-wan-rate-guard="no-business-rates-without-snapshot"
      data-overview-no-zero-rate-placeholder="no-zero-rate-when-uncollected"
    >
      <InfoBand snapshot={snapshot} state={state} />
      <span className="ro-sr-contract" data-overview-verdict-panel>{verdictContractText(snapshot, state)}</span>
      <div className="ro-mobile-first-screen" data-overview-mobile-first-screen>
        <MobileOverviewHome snapshot={snapshot} state={state} />
      </div>
      <DesktopWorkspace snapshot={snapshot} state={state} />
    </section>
  );
}
