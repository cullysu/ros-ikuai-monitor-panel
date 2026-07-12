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
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
  type OverviewScenarioKey,
  type OverviewTone,
} from "./index";
import { routerOsRouteBusinessSummary } from "./routerosEvidenceModel";
import { buildRouterOsPresentationViewModel } from "./routerosPresentationViewModel";

export interface OverviewPanelProps {
  snapshot: OverviewRawSnapshot;
  state: OverviewDerivedState;
}

export type LedgerCell = ReactNode;

export interface LedgerRow {
  id: string;
  cells: LedgerCell[];
  tone?: OverviewTone;
  title?: string;
  attrs?: Record<string, string | number>;
}

export interface TopbarItem {
  label: string;
  value: string;
  note: string;
  role: TopbarRole;
  tone: OverviewTone;
}

export interface DesktopMetricItem {
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
}

export interface DesktopEvidenceItem {
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
  role: "object" | "primary" | "route" | "collection" | "freshness";
}

export type TopbarRole =
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

export interface ModuleProps {
  title: string;
  subtitle?: string;
  module: string;
  tone?: OverviewTone;
  headers: string[];
  rows: LedgerRow[];
  trust?: "当前采样" | "缓存快照" | "链路可参考";
  className?: string;
  minRows?: number;
  visual?: ReactNode;
  visualOnly?: boolean;
  collapsed?: boolean;
  collapsedEvidence?: boolean;
}

export interface ChartDatum {
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

export const ROUTE_UNKNOWN = "路由快照未取回，无法判断默认出口影响";
export const FILLER_TONE: OverviewTone = "trust";
export function routeBusinessSummary(value: unknown, fallback = ROUTE_UNKNOWN): string {
  return routerOsRouteBusinessSummary(value, fallback);
}

export function routeBusinessText(state: OverviewDerivedState, fallback = ROUTE_UNKNOWN): string {
  return routeBusinessSummary(state.facts.route.text || state.facts.route.label || state.facts.route.rawSummary, fallback);
}

export function routeLabelText(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "默认出口待判";
  return routeBusinessSummary(state.facts.route.label || "默认出口待判", "默认出口待判");
}

export function text(value: unknown, fallback = "-"): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

export function businessErrorNote(value: unknown, fallback = "采集通道需核对"): string {
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

export function collectWanRows(snapshot: OverviewRawSnapshot): OverviewRawWanRow[] {
  return Array.isArray(snapshot.wan) && snapshot.wan.length
    ? snapshot.wan
    : Array.isArray(snapshot.pppoe)
      ? snapshot.pppoe
      : [];
}

export function collectInterfaceRows(snapshot: OverviewRawSnapshot): OverviewRawInterfaceRow[] {
  return Array.isArray(snapshot.interfaces) ? snapshot.interfaces : [];
}

export function latestSuccess(snapshot: OverviewRawSnapshot, scenario: OverviewScenarioKey): string {
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

export function topbarImpactValue(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  return desktopPresentation(snapshot, state).impact.value;
}

export function topbarImpactNote(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  return desktopPresentation(snapshot, state).impact.note;
}

export function topbarObjectValue(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { value: string; note: string } {
  const object = desktopPresentation(snapshot, state).object;
  return { value: object.value, note: object.note };
}

export function topbarCollectionValue(state: OverviewDerivedState): { value: string; note: string } {
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
  if (state.facts.collection.dataStale) {
    return {
      value: "缓存可参考",
      note: "当前采集非实时",
    };
  }
  if (state.scenario === "collection-down") {
    return {
      value: "降级",
      note: "REST 待确认 / SSH 不可用",
    };
  }
  const restUnavailable = /不可|失败|待确认|缺失/.test(state.facts.collection.restLabel);
  const sshUnavailable = /不可|失败|待确认|缺失/.test(state.facts.collection.sshLabel);
  if (restUnavailable || sshUnavailable) {
    return {
      value: "部分可用",
      note: `${restUnavailable ? "REST 待确认" : "REST 可用"} / ${sshUnavailable ? "SSH 不可用" : "SSH 可用"}`,
    };
  }
  return {
    value: "可读",
    note: "REST / SSH",
  };
}

export function topbarSnapshotValue(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { value: string; note: string; tone: OverviewTone } {
  const cached = state.scenario === "collection-down" || state.facts.collection.dataStale || state.facts.freshness.history;
  return {
    value: latestSuccess(snapshot, state.scenario),
    note: state.scenario === "no-snapshot" ? "\u5feb\u7167\u7f3a\u5931" : cached ? "快照 缓存" : `\u5feb\u7167 ${state.facts.freshness.credibilityLabel}`,
    tone: state.scenario === "no-snapshot" || cached ? "warn" : state.facts.freshness.credibilityTone,
  };
}

export function desktopPresentation(snapshot: OverviewRawSnapshot, state: OverviewDerivedState) {
  return buildRouterOsPresentationViewModel(snapshot, state).desktop;
}

export function topbarConclusionNote(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  return desktopPresentation(snapshot, state).conclusionNote;
}

export function desktopConclusionValue(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  return desktopPresentation(snapshot, state).conclusionValue;
}

export function statusUpdated(snapshot: OverviewRawSnapshot): string {
  const short = shortTimestamp(snapshot.updatedAt || snapshot.meta?.statusUpdatedAt || "");
  return short === "-" ? "未记录" : short;
}

export function pollText(snapshot: OverviewRawSnapshot): string {
  const seconds = Number(snapshot.meta?.pollSeconds || 0);
  return seconds > 0 ? `轮询中 / ${seconds}s/点` : "轮询中";
}

export function failureText(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  void snapshot;
  const value = text(state.facts.collection.failedEndpointText, "未记录");
  const compact = value.replace(/[：:\s]/g, "");
  const countText = compact.replace(/^失败端点/i, "");
  if (/^0(?:个|条|项|次)?$/i.test(countText)) return "未记录";
  const count = toNumber(state.facts.failures.count);
  return count > 0 ? `已记录 ${formatNumber(count)} 项` : "已记录";
}

export function routerosState(snapshot: OverviewRawSnapshot, scenario: OverviewScenarioKey): { value: string; tone: OverviewTone; note: string } {
  if (scenario === "no-snapshot") {
    return { value: "断链", tone: "danger", note: "RouterOS 当前不可达" };
  }
  if (snapshot.status === "error") {
    return { value: "不可达", tone: "danger", note: businessErrorNote(snapshot.error, "当前采集失败") };
  }
  return { value: "可达", tone: "ok", note: "管理面已返回快照" };
}

export function restState(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { value: string; tone: OverviewTone; note: string } {
  if (state.scenario === "no-snapshot") return { value: "待核", tone: "warn", note: "链路需核" };
  if (state.scenario === "interfaces-down") return { value: "不可达", tone: "warn", note: "采集通道不可达" };
  if (snapshot.meta?.realtimeError || snapshot.meta?.slowRestError || state.scenario === "collection-down") {
    return { value: "待确认", tone: "warn", note: businessErrorNote(snapshot.meta?.realtimeError || snapshot.meta?.slowRestError, "当前使用缓存") };
  }
  return { value: stripChannelPrefix(state.facts.collection.restLabel, "REST") || "可用", tone: "ok", note: "当前快照可用" };
}

export function sshState(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { value: string; tone: OverviewTone; note: string } {
  if (state.scenario === "no-snapshot") return { value: "断链", tone: "danger", note: "通道断链" };
  if (state.scenario === "interfaces-down") return { value: "不可达", tone: "warn", note: "采集通道不可达" };
  if (snapshot.meta?.staticError || state.scenario === "collection-down" || /\u4e0d\u53ef\u7528|\u7f3a/.test(state.facts.collection.sshLabel)) {
    return { value: "不可用", tone: "warn", note: businessErrorNote(snapshot.meta?.staticError, "SSH 缺依赖") };
  }
  return { value: stripChannelPrefix(state.facts.collection.sshLabel, "SSH") || "可用", tone: "ok", note: "静态读取可用" };
}

export function topbarItems(snapshot: OverviewRawSnapshot, state: OverviewDerivedState) {
  const object = topbarObjectValue(snapshot, state);
  const collection = topbarCollectionValue(state);
  const snapshotCell = topbarSnapshotValue(snapshot, state);
  if (state.scenario === "no-snapshot") {
    const updated = statusUpdated(snapshot);
    const routeros = routerosState(snapshot, state.scenario);
    const rest = restState(snapshot, state);
    const ssh = sshState(snapshot, state);
    return [
      { label: "\u7ed3\u8bba", value: desktopConclusionValue(snapshot, state), note: "\u65e0\u4e1a\u52a1\u5feb\u7167", role: "conclusion", tone: state.verdict.level },
      { label: "\u8bbe\u5907", value: "\u91c7\u96c6\u5bf9\u8c61", note: "\u94fe\u8def\u5f02\u5e38", role: "device", tone: "trust" as OverviewTone },
      { label: "RouterOS", value: routeros.value, note: routeros.note, role: "routeros", tone: routeros.tone },
      { label: "REST", value: rest.value, note: rest.note, role: "rest", tone: rest.tone },
      { label: "SSH", value: ssh.value, note: "SSH 不可用", role: "ssh", tone: ssh.tone },
      { label: "\u6700\u8fd1\u6210\u529f", value: snapshotCell.value, note: "业务快照年龄 不可判定", role: "recent-success", tone: snapshotCell.tone },
    ] satisfies TopbarItem[];
  }
  return [
    { label: "\u7ed3\u8bba", value: desktopConclusionValue(snapshot, state), note: topbarConclusionNote(snapshot, state), role: "conclusion", tone: state.verdict.level },
    { label: "\u8bbe\u5907", value: state.facts.device.identity, note: `${state.facts.device.version} \u00b7 ${state.facts.device.uptime}`, role: "device", tone: "trust" as OverviewTone },
    { label: "\u5bf9\u8c61", value: object.value, note: object.note, role: "object", tone: "trust" as OverviewTone },
    { label: "\u5f71\u54cd", value: topbarImpactValue(snapshot, state), note: topbarImpactNote(snapshot, state), role: "impact", tone: state.verdict.level },
    { label: "\u91c7\u96c6", value: collection.value, note: collection.note, role: "collection", tone: state.facts.collection.credibilityTone },
    { label: "\u5feb\u7167", value: snapshotCell.value, note: snapshotCell.note, role: "snapshot", tone: snapshotCell.tone },
  ] satisfies TopbarItem[];
}

export function topbarPriority(role: TopbarRole): "primary" | "key" | "secondary" | "meta" {
  if (role === "conclusion") return "primary";
  if (role === "device" || role === "object" || role === "impact" || role === "collection" || role === "routeros" || role === "rest" || role === "ssh") return "key";
  if (role === "snapshot" || role === "recent-success") return "secondary";
  return "meta";
}

export function topbarValueStyle(role: string): CSSProperties | undefined {
  void role;
  return undefined;
}

export function topbarNoteStyle(role: string): CSSProperties | undefined {
  void role;
  return undefined;
}


export function moduleTrust(state: OverviewDerivedState): "当前采样" | "缓存快照" | "链路可参考" {
  if (state.scenario === "no-snapshot") return "链路可参考";
  if (state.scenario === "collection-down" || state.scenario === "interfaces-down" || state.facts.freshness.history || state.facts.collection.dataStale) return "缓存快照";
  return "当前采样";
}

export function moduleChartType(module: string): "line" | "bar" | "matrix" | "status" | "timeline" {
  if (/resource-risk-priority|collection-channel-ledger/i.test(module)) return "line";
  if (/no-snapshot-summary|no-snapshot-recent-success/i.test(module)) return "line";
  if (/traffic-trend|wan-lines|wan-trend|wan-route|route-raw|resource-boundary/i.test(module)) return "line";
  if (/^wan-offline-bars$/i.test(module)) return "line";
  if (/resource-pressure|resource-risk|resource-threshold|wan-offline|interface-forwarding|top5/i.test(module)) return "bar";
  if (/recent-success|timeline/i.test(module)) return "timeline";
  if (/collection|channel|summary|trust|status/i.test(module)) return "status";
  return "matrix";
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function ratioPercent(value: number, max: number): number {
  return clampPercent(max > 0 ? (value / max) * 100 : 0);
}

export function chartUnitLabel(unit?: string): string {
  if (unit === "conn") return "连接";
  if (unit === "session") return "会话";
  if (unit === "status") return "状态";
  if (unit === "wan") return "线路";
  if (unit === "route") return "默认出口";
  return unit || "状态";
}

export function chartSamplePoints(row?: ChartDatum): string {
  if (!row) return "0/0";
  if (row.samples) return row.samples;
  if (/无|缺失|禁显|不展示|不可|未采集/.test(`${row.current}${row.mean}${row.trust}`)) return "0/6";
  return "6/6";
}

export function ledgerCellText(row: LedgerRow | undefined, index: number, fallback = "-"): string {
  const value = row?.cells[index];
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}
