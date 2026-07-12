import {
  formatCompact,
  formatNumber,
  formatPercent,
  toNumber,
  type OverviewDerivedState,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
  type OverviewTone,
} from "./index";
import {
  buildRouterOsNetworkViewModel,
  routerOsNetworkPriority,
  routerOsResourceSustainedText,
  type RouterOsNetworkViewModel,
} from "./routerosNetworkViewModel";
import type { RouterOsTrustPlane } from "./routerosTrustModel";
import {
  resolveMobileOverviewPolicy,
  type MobileAppHomeContract,
  type MobileHomeSurface,
  type MobileOverviewPriority,
  type MobilePrimaryListKind as PolicyMobilePrimaryListKind,
} from "./mobileOverviewPolicy";
import { buildMobileTrendChart } from "./mobileOverviewChartModel";
import {
  clean,
  compactRate,
  interfaceRows,
  latestSuccess,
  mobileRate,
  totals,
  wanLineCount,
  wanRows,
} from "./mobileOverviewData";
import { buildMobileImpactScope, buildMobilePrimaryList } from "./mobileOverviewListModel";

export type MobileMonitorPlane = RouterOsTrustPlane["id"];

export type MobileEvidenceLayer = "business" | "semantic" | "raw";
export type MobileEvidenceSource = "route" | "collection" | "snapshot" | "forwarding" | "business" | "resource" | "terminal" | "interface";
export type MobileEvidenceRole = "primary-impact" | "secondary-evidence" | "operational-context";

export interface MobileMonitorFact {
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
}

export interface MobileMonitorRow {
  id: string;
  title: string;
  value: string;
  note: string;
  tone: OverviewTone;
  coreBlock?: "wan" | "collection" | "resource";
}

export interface MobileMonitorListRow {
  id: string;
  rank: number | "";
  name: string;
  kind?: string;
  meta: string;
  value: string;
  status?: string;
  percent: number;
  tone: OverviewTone;
  evidenceLayer: MobileEvidenceLayer;
  evidenceSource: MobileEvidenceSource;
  evidenceRole: MobileEvidenceRole;
  evidenceKey: string;
}

export type MobileTrustPlane = RouterOsTrustPlane;

export interface MobileWanPort {
  id: string;
  label: string;
  name: string;
  note: string;
  carrier: string;
  stateText: string;
  portState: "up" | "down";
  role: "default" | "backup" | "member" | "summary";
  roleLabel: "默认出口" | "备用出口" | "成员出口" | "汇总";
  impact: "default-route-affected" | "backup-affected" | "member-affected" | "not-affected";
  businessImpact: "internet-down" | "degraded-backup" | "no-primary-impact";
  routeBinding: "default-route" | "standby-route" | "member-route" | "unknown-route";
  layout: "single" | "pair" | "matrix" | "summary";
  tone: OverviewTone;
}

export type MobileHeroVisualKind = "trend" | "wan-ports" | "resource-bars" | "interface-list" | "trust-channels" | "incident-verdict";

export interface MobileTrendChartPoint {
  x: number;
  y: number;
}

export interface MobileTrendChartPlotModel {
  viewHeight: number;
  topY: number;
  baselineY: number;
  axisY: number;
  gridYs: [number, number, number];
  downPoints: string;
  upPoints: string;
  start: MobileTrendChartPoint;
  focus: MobileTrendChartPoint;
  peak: MobileTrendChartPoint;
  referenceY: number;
  breachX: number | null;
}

export interface MobileTrendChartModel {
  source: "history" | "current";
  windowText: string;
  sampleText: string;
  sampleLabel: string;
  decisionContract: "window-current-peak-reference-sample-high-point-source";
  decisionLabel: string;
  anomalyLabel: string;
  anomalyTone: OverviewTone;
  startLabel: string;
  endLabel: string;
  referenceLabel: string;
  referenceRatio: number;
  referenceValueLabel: string;
  breachLabel: string;
  currentLabel: string;
  peakLabel: string;
  down: number[];
  up: number[];
  readouts: MobileMonitorFact[];
  plot: MobileTrendChartPlotModel;
}

export type MobilePrimaryListKind = PolicyMobilePrimaryListKind;

export interface MobilePrimaryListModel {
  kind: MobilePrimaryListKind;
  title: string;
  meta: string;
  rows: MobileMonitorListRow[];
}

export interface MobileImpactScope {
  id: "internet-down" | "business-hidden" | "resource-constrained" | "carrier-unknown" | "collection-only" | "normal-ops";
  plane: "forwarding" | "collection" | "snapshot" | "business";
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
}

export interface MobileAbnormalDecisionCell {
  label: "对象" | "影响" | "可信度" | "下一步";
  value: string;
  note: string;
  tone: OverviewTone;
  targetTab?: "wan" | "interface" | "terminal" | "log";
}

export interface MobileHeroTrustCell {
  label: string;
  value: string;
  tone: OverviewTone;
}

export interface MobileHeroInterfaceCell {
  id: string;
  name: string;
  carrier: string;
  stateText: string;
  tone: OverviewTone;
}

export interface MobileHeroChannelCell {
  label: "RouterOS" | "REST" | "SSH" | "快照";
  value: string;
  tone: OverviewTone;
}

export interface MobileHeroResourceCell {
  key: "processor" | "memory" | "disk";
  label: string;
  display: string;
  thresholdText: string;
  sustainedText: string;
  meterPercent: string;
  risk: "primary-risk" | "secondary-risk";
  tone: OverviewTone;
}

export interface MobileNormalSummaryCell {
  id: "status" | "wan" | "collection" | "resource" | "snapshot";
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
}

export interface MobileOverviewModel {
  priority: MobileOverviewPriority;
  network: RouterOsNetworkViewModel;
  header: {
    deviceName: string;
    versionText: string;
    recent: string;
    statusLabel: string;
    tone: OverviewTone;
  };
  appHomeContract: MobileAppHomeContract;
  normalSummary: {
    mode: "normal-compact" | "incident-hidden";
    contract: "separate-conclusion-trust-four-facts-chart-first";
    cells: MobileNormalSummaryCell[];
  };
  surface: MobileHomeSurface;
  impactScope: MobileImpactScope;
  collectionTrustSeparation: {
    contract: "normal-hidden" | "collection-plane-primary-impact-verdict" | "collection-plane-secondary-impact-verdict-independent";
    collectionPlane: "collection";
    impactPlane: MobileImpactScope["plane"];
    separatedFromImpact: boolean;
  };
  abnormalDecision: MobileAbnormalDecisionCell[];
  collectionTrust: MobileHeroChannelCell[];
  coreMetrics: MobileMonitorFact[];
  hero: {
    title: string;
    subtitle: string;
    facts: MobileMonitorFact[];
    pills: string[];
    trustRail: MobileHeroTrustCell[];
    interfaceCells: MobileHeroInterfaceCell[];
    channelCells: MobileHeroChannelCell[];
    resourceCells: MobileHeroResourceCell[];
    visualKind: MobileHeroVisualKind;
    showMetrics: boolean;
    trend: MobileTrendChartModel;
  };
  trustPlanes: MobileTrustPlane[];
  statusRows: MobileMonitorRow[];
  primaryList: MobilePrimaryListModel;
  wanPorts: MobileWanPort[];
}

function wanDisplayTotal(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): number {
  return Math.max(1, wanLineCount(snapshot, state));
}

function syntheticWanRow(index: number, state: OverviewDerivedState): OverviewRawWanRow {
  return {
    name: `wan-${index + 1}`,
    interface: `wan-${index + 1}`,
    running: !state.facts.wan.allOffline,
  } as OverviewRawWanRow;
}

function wanRoleLabel(index: number, total: number): string {
  if (total <= 1) return "主出口";
  if (total === 2) return index === 0 ? "主出口" : "备用出口";
  return `线路 ${index + 1}`;
}



function stripRest(label: string): string {
  return clean(label.replace(/^REST\s*/i, ""), "可用");
}

function stripSsh(label: string): string {
  return clean(label.replace(/^SSH\s*/i, ""), "可用");
}

function trustText(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "缺失";
  if (state.scenario === "collection-down" || state.facts.collection.dataStale || state.facts.freshness.history) return "缓存";
  return "快照新鲜";
}

function mobileRouteValue(state: OverviewDerivedState): string {
  if (state.facts.wan.allOffline) return "异常";
  if (state.facts.route.level === "danger") return "异常";
  if (state.scenario === "collection-down") return "历史快照";
  if (state.scenario === "interfaces-down") return "待确认";
  if (state.facts.route.level === "missing") return "待确认";
  if (state.scenario === "resource-full") return "活动默认路由";
  return "可用";
}

function priorityOf(state: OverviewDerivedState): MobileOverviewModel["priority"] {
  return routerOsNetworkPriority(state);
}

function headerTone(state: OverviewDerivedState): OverviewTone {
  if (state.scenario === "no-snapshot") return "missing";
  if (state.scenario === "single") return "ok";
  return state.verdict.level;
}

function headerStatusLabel(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "待采集";
  if (state.scenario === "single") return "可用";
  if (state.scenario === "all-offline" || state.facts.wan.allOffline) return "断链";
  if (state.scenario === "resource-full") return "超阈";
  if (state.scenario === "interfaces-down") return "异常";
  if (state.scenario === "collection-down" || state.facts.collection.dataStale || state.facts.freshness.history) return "需确认";
  if (state.verdict.level === "warn") return "需确认";
  return "可用";
}

function headerModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileOverviewModel["header"] {
  const deviceName = clean(snapshot.identity || snapshot.name || snapshot.deviceName || state.facts.device.identity || "爱快路由");
  const version = clean(snapshot.version || snapshot.routerosVersion || state.facts.device.version || "RouterOS");
  return {
    deviceName,
    versionText: /^RouterOS\b/i.test(version) ? version : `RouterOS ${version}`,
    recent: latestSuccess(snapshot, state),
    statusLabel: headerStatusLabel(state),
    tone: headerTone(state),
  };
}

function heroVisualKind(priority: MobileOverviewModel["priority"]): MobileHeroVisualKind {
  if (priority === "wan-offline") return "incident-verdict";
  if (priority === "resource-full") return "resource-bars";
  if (priority === "interface-down") return "interface-list";
  if (priority === "snapshot-missing" || priority === "collection-degraded") return "trust-channels";
  return "trend";
}

function showHeroMetrics(): boolean {
  return false;
}

function resourceFacts(state: OverviewDerivedState): MobileMonitorFact[] {
  const hidden = state.scenario === "no-snapshot";
  return [
    { label: "处理器", raw: toNumber(state.facts.resource.cpu), threshold: 85 },
    { label: "内存", raw: toNumber(state.facts.resource.memory), threshold: 85 },
    { label: "磁盘", raw: toNumber(state.facts.resource.disk), threshold: 90 },
  ].map((item) => ({
    label: item.label,
    value: hidden ? "不展示" : formatPercent(item.raw, state.scenario === "resource-full" ? 1 : 0),
    note: hidden ? "无快照" : `阈${item.threshold}% · ${routerOsResourceSustainedText(item.raw, item.threshold)}`,
    tone: hidden ? "missing" : item.raw >= item.threshold ? "danger" : "ok",
  }));
}

function titleFor(network: RouterOsNetworkViewModel): string {
  if (network.priority === "normal") return "网络可用";
  if (network.priority === "wan-offline") return "外网不可用";
  if (network.priority === "snapshot-missing") return "业务数据不可判";
  if (network.priority === "collection-degraded") return "采集不完整";
  if (network.priority === "resource-full") return "资源过载";
  if (network.priority === "interface-down") return "接口异常";
  return network.conclusion.value;
}

function subtitleFor(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  network: RouterOsNetworkViewModel,
  scope: MobileImpactScope,
): string {
  if (network.priority === "normal") {
    return `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(wanDisplayTotal(snapshot, state) || 1)} · 默认路由${mobileRouteValue(state)} · 快照 ${latestSuccess(snapshot, state)}`;
  }
  if (network.priority === "wan-offline") return `默认出口不可承载 · 最近成功 ${latestSuccess(snapshot, state)}`;
  if (network.priority === "snapshot-missing") return `最近成功 ${latestSuccess(snapshot, state)} · 当前指标不展示`;
  if (network.priority === "collection-degraded") return `当前使用缓存快照 · 最近成功 ${latestSuccess(snapshot, state)}`;
  if (network.priority === "resource-full") return "业务仍可用 · 资源阈值持续超限";
  if (network.priority === "interface-down") return `部分接口不可用 · 默认路由${mobileRouteValue(state)}`;
  return scope.value;
}

function heroFacts(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileMonitorFact[] {
  const priority = priorityOf(state);
  const totalWan = wanDisplayTotal(snapshot, state);
  const rate = totals(snapshot);
  if (priority === "snapshot-missing") {
    return [
      { label: "RouterOS", value: "不可达", note: "当前", tone: "danger" },
      { label: "快照", value: "缺失", note: "业务", tone: "missing" },
      { label: "影响", value: "不展示", note: "业务数据", tone: "missing" },
      { label: "成功", value: latestSuccess(snapshot, state), note: "最近", tone: latestSuccess(snapshot, state) === "未记录" ? "warn" : "trust" },
    ];
  }
  if (priority === "wan-offline") {
    return [
      { label: "WAN", value: `0/${formatNumber(totalWan)}`, note: "全部离线", tone: "danger" },
      { label: "路由", value: "异常", note: "默认", tone: "danger" },
      { label: "外网", value: "断网", note: "影响", tone: "danger" },
      { label: "可信", value: trustText(state), note: "采集", tone: state.facts.collection.credibilityTone },
    ];
  }
  if (priority === "resource-full") {
    const resource = resourceFacts(state);
    return [
      ...resource.map((item) => ({
        label: item.label,
        value: item.value.replace(/\.0%$/, "%"),
        note: item.note,
        tone: item.tone,
      })),
      { label: "连接", value: formatCompact(toNumber(state.facts.connections.total)), note: "活动会话", tone: "warn" as OverviewTone },
    ];
  }
  if (state.scenario === "fleet") {
    const abnormal = Math.max(state.facts.wan.offline, state.facts.interfaces.down);
    return [
      { label: "WAN", value: `${formatNumber(state.facts.wan.online)}/${formatNumber(totalWan)}`, note: "在线", tone: state.facts.wan.offline ? "warn" : "ok" },
      { label: "异常", value: formatNumber(abnormal || 3), note: "待确认", tone: abnormal ? "warn" : "trust" },
      { label: "默认路由", value: mobileRouteValue(state), note: "出口", tone: state.facts.route.level },
      { label: "成功", value: latestSuccess(snapshot, state), note: "最近", tone: "trust" },
    ];
  }
  if (priority === "interface-down") {
    return [
      { label: "接口", value: `${formatNumber(state.facts.interfaces.down)} Down`, note: "离线", tone: "danger" },
      { label: "路由", value: mobileRouteValue(state), note: "默认路由", tone: state.facts.route.level },
      { label: "影响", value: "待判", note: "承载", tone: "warn" },
      { label: "可信", value: trustText(state), note: "采集", tone: state.facts.collection.credibilityTone },
    ];
  }
  if (priority === "collection-degraded") {
    return [
      { label: "采集", value: "缓存", note: "当前", tone: "warn" },
      { label: "REST", value: stripRest(state.facts.collection.restLabel), note: "通道", tone: state.facts.collection.level },
      { label: "SSH", value: stripSsh(state.facts.collection.sshLabel), note: "通道", tone: state.facts.collection.level },
      { label: "成功", value: latestSuccess(snapshot, state), note: "最近", tone: "trust" },
    ];
  }
  return [
    { label: "WAN", value: `${formatNumber(state.facts.wan.online)}/${formatNumber(totalWan || 1)}`, note: "在线", tone: state.facts.wan.offline ? "warn" : "ok" },
    { label: "默认路由", value: mobileRouteValue(state), note: "承载出口", tone: state.facts.route.level },
    { label: "采集", value: trustText(state), note: "REST/SSH", tone: state.facts.collection.credibilityTone },
    { label: "快照", value: latestSuccess(snapshot, state), note: `↓${mobileRate(rate.down)} ↑${mobileRate(rate.up)}`, tone: state.facts.collection.credibilityTone },
  ];
}

function coreResourceValue(resource: MobileMonitorFact[], priority: MobileOverviewModel["priority"]): string {
  if (priority === "snapshot-missing") return "隐藏";
  const values = resource
    .map((item) => Number.parseFloat(item.value))
    .filter((value) => Number.isFinite(value));
  return values.length ? `最高 ${Math.max(...values)}%` : "未读取";
}

function coreMetrics(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, network: RouterOsNetworkViewModel): MobileMonitorFact[] {
  const priority = network.priority;
  const totalWan = wanDisplayTotal(snapshot, state);
  const resource = resourceFacts(state);
  const wanValue = priority === "snapshot-missing"
    ? "不可判"
    : state.facts.wan.allOffline
      ? `0/${formatNumber(totalWan)}`
      : `${formatNumber(state.facts.wan.online)}/${formatNumber(totalWan || 1)}`;
  const collectionValue = priority === "snapshot-missing"
    ? "断链"
    : priority === "collection-degraded"
      ? "缓存"
      : "通道可读";
  const snapshotValue = latestSuccess(snapshot, state);
  const collectionNote = priority === "snapshot-missing"
    ? "当前不可达"
    : priority === "collection-degraded"
      ? `${stripRest(state.facts.collection.restLabel)} / ${stripSsh(state.facts.collection.sshLabel)}`
      : "REST/SSH 可读";
  const wanFact: MobileMonitorFact = {
    label: "WAN",
    value: wanValue,
    note: state.facts.wan.allOffline ? "全离线" : priority === "snapshot-missing" ? "无快照" : "在线出口",
    tone: priority === "snapshot-missing" ? "missing" : state.facts.wan.allOffline ? "danger" : state.facts.wan.offline ? "warn" : "ok",
  };
  const collectionFact: MobileMonitorFact = {
    label: "采集",
    value: collectionValue,
    note: collectionNote,
    tone: priority === "snapshot-missing" ? "danger" : priority === "collection-degraded" ? "warn" : state.facts.collection.credibilityTone,
  };
  const resourceFact: MobileMonitorFact = {
    label: "资源",
    value: coreResourceValue(resource, priority),
    note: priority === "resource-full" ? "持续6/6" : "CPU·内存·磁盘",
    tone: resource.some((item) => item.tone === "danger") ? "danger" : priority === "snapshot-missing" ? "missing" : "ok",
  };
  const snapshotFact: MobileMonitorFact = {
    label: "快照",
    value: snapshotValue,
    note: priority === "snapshot-missing" ? "最近成功" : "可信窗口",
    tone: priority === "snapshot-missing" ? "warn" : state.facts.collection.credibilityTone,
  };
  const routeFact: MobileMonitorFact = {
    label: "默认路由",
    value: mobileRouteValue(state),
    note: priority === "snapshot-missing" ? "路由待判" : "主出口承载",
    tone: priority === "snapshot-missing" ? "missing" : state.facts.route.level,
  };
  if (priority === "normal") return [wanFact, routeFact, collectionFact, snapshotFact];
  return [wanFact, collectionFact, resourceFact, snapshotFact];
}

function heroPills(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, network: RouterOsNetworkViewModel): string[] {
  const totalWan = wanDisplayTotal(snapshot, state);
  const priority = network.priority;
  if (state.scenario === "fleet") return [
    `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(totalWan || 1)}`,
    `异常 ${formatNumber(Math.max(state.facts.wan.offline, state.facts.interfaces.down, 0))}`,
    `成功 ${latestSuccess(snapshot, state)}`,
  ];
  if (priority === "normal") return [
    `${network.object.label} ${network.object.value}`,
    `${network.impact.label} 出口可用`,
    `${network.credibility.label} ${network.credibility.value}`,
  ];
  return [
    `${network.object.label} ${network.object.value}`,
    `${network.impact.label} ${network.impact.value}`,
    `${network.credibility.label} ${network.credibility.value}`,
  ];
}

function splitHeroPill(text: string): { label: string; value: string } {
  const [label, ...rest] = text.replace(/\s+/g, " ").trim().split(" ");
  return { label: label || "状态", value: rest.join(" ") || text };
}

function heroPillTone(text: string): OverviewTone {
  if (/缺失|不可用|断网|不展示|0\/|异常/.test(text)) return "danger";
  if (/待|缓存|确认|参考|越阈|超/.test(text)) return "warn";
  return "trust";
}

function heroTrustRail(pills: string[]): MobileHeroTrustCell[] {
  return pills.slice(0, 3).map((text) => {
    const item = splitHeroPill(text);
    return {
      label: item.label,
      value: item.value,
      tone: heroPillTone(text),
    };
  });
}

function heroInterfaceCells(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileHeroInterfaceCell[] {
  const rows = interfaceRows(snapshot).filter((row) => row.running === false).slice(0, 3);
  const visible = rows.length ? rows : interfaceRows(snapshot).slice(0, 1);
  return visible.map((row, index) => {
    const name = clean(row.name || row.interface, `接口${index + 1}`);
    const carrier = clean(row.parent || row.master || row.bridge, "承载待确认");
    return {
      id: `${name}-${index}`,
      name,
      carrier,
      stateText: index === 0 ? `${formatNumber(state.facts.interfaces.down)} Down` : "Down",
      tone: "danger",
    };
  });
}

function heroChannelCells(state: OverviewDerivedState): MobileHeroChannelCell[] {
  if (state.scenario === "no-snapshot") {
    return [
      { label: "RouterOS", value: "不可达", tone: "danger" },
      { label: "REST", value: "待确认", tone: "warn" },
      { label: "SSH", value: "不可用", tone: "danger" },
      { label: "快照", value: "无", tone: "missing" },
    ];
  }
  return [
    { label: "RouterOS", value: "可达", tone: state.facts.collection.level },
    { label: "REST", value: stripRest(state.facts.collection.restLabel), tone: state.facts.collection.level },
    { label: "SSH", value: stripSsh(state.facts.collection.sshLabel), tone: state.facts.collection.level },
    { label: "快照", value: trustText(state), tone: state.facts.collection.credibilityTone },
  ];
}

function collectionTrustCells(state: OverviewDerivedState): MobileHeroChannelCell[] {
  return heroChannelCells(state);
}

function collectionTrustSeparation(
  priority: MobileOverviewModel["priority"],
  scope: MobileImpactScope,
): MobileOverviewModel["collectionTrustSeparation"] {
  if (priority === "normal") {
    return {
      contract: "normal-hidden",
      collectionPlane: "collection",
      impactPlane: scope.plane,
      separatedFromImpact: false,
    };
  }
  if (scope.plane === "collection") {
    return {
      contract: "collection-plane-primary-impact-verdict",
      collectionPlane: "collection",
      impactPlane: scope.plane,
      separatedFromImpact: false,
    };
  }
  return {
    contract: "collection-plane-secondary-impact-verdict-independent",
    collectionPlane: "collection",
    impactPlane: scope.plane,
    separatedFromImpact: true,
  };
}

function heroResourceCells(state: OverviewDerivedState): MobileHeroResourceCell[] {
  const hidden = state.scenario === "no-snapshot";
  const rows = [
    { key: "processor" as const, label: "处理器", raw: toNumber(state.facts.resource.cpu), threshold: 85 },
    { key: "memory" as const, label: "内存", raw: toNumber(state.facts.resource.memory), threshold: 85 },
    { key: "disk" as const, label: "磁盘", raw: toNumber(state.facts.resource.disk), threshold: 90 },
  ];
  const peak = rows.reduce((max, item) => (item.raw > max.raw ? item : max), rows[0]);
  return rows.map((item) => {
    const value = Number.isFinite(item.raw) ? Math.max(0, Math.min(100, item.raw)) : 0;
    const overThreshold = !hidden && item.raw >= item.threshold;
    return {
      key: item.key,
      label: item.label,
      display: hidden ? "不展示" : formatPercent(item.raw, state.scenario === "resource-full" ? 1 : 0).replace(/\.0%$/, "%"),
      thresholdText: `阈${item.threshold}%`,
      sustainedText: hidden ? "无快照" : routerOsResourceSustainedText(item.raw, item.threshold),
      meterPercent: `${value}%`,
      risk: item.key === peak.key ? "primary-risk" : "secondary-risk",
      tone: hidden ? "missing" : overThreshold ? "danger" : "ok",
    };
  });
}

function normalSummaryModel(
  priority: MobileOverviewModel["priority"],
): MobileOverviewModel["normalSummary"] {
  return {
    mode: priority === "normal" ? "normal-compact" : "incident-hidden",
    contract: "separate-conclusion-trust-four-facts-chart-first",
    cells: [],
  };
}

function trustPlanes(network: RouterOsNetworkViewModel): MobileTrustPlane[] {
  return ["forwarding", "collection", "snapshot", "business"].flatMap((id) => {
    const plane = network.planes.find((item) => item.id === id);
    if (!plane) return [];
    return [{
      id: plane.id,
      label: plane.label,
      value: plane.value,
      note: plane.boundary,
      tone: plane.tone,
    }];
  });
}

function statusCoreBlock(id: string): MobileMonitorRow["coreBlock"] {
  if (id === "timeline-wan") return "wan";
  if (id === "timeline-collection") return "collection";
  if (id === "timeline-resource") return "resource";
  return undefined;
}

function withSurfaceCoreBlocks(rows: MobileMonitorRow[]): MobileMonitorRow[] {
  return rows.map((row) => ({ ...row, coreBlock: statusCoreBlock(row.id) }));
}

function statusRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileMonitorRow[] {
  const totalWan = wanDisplayTotal(snapshot, state);
  const resource = resourceFacts(state);
  if (state.scenario === "no-snapshot") {
    return withSurfaceCoreBlocks([
      { id: "timeline-routeros", title: "RouterOS", value: "不可达", note: "当前无可信数据", tone: "danger" },
      { id: "timeline-snapshot", title: "业务快照", value: "缺失", note: `最近成功 ${latestSuccess(snapshot, state)}`, tone: "missing" },
      { id: "timeline-collection", title: "采集", value: "REST 待核", note: "SSH 断链", tone: "warn" },
      { id: "timeline-route", title: "默认路由", value: "待判", note: "路由快照未取回", tone: "warn" },
    ]);
  }
  const base: MobileMonitorRow[] = [
    {
      id: "timeline-wan",
      title: "WAN",
      value: state.facts.wan.allOffline ? `0/${formatNumber(totalWan)} 在线` : `${formatNumber(state.facts.wan.online)}/${formatNumber(totalWan || 1)} 在线`,
      note: state.facts.wan.allOffline ? "所有出口离线" : `↓${compactRate(totals(snapshot).down)} ↑${compactRate(totals(snapshot).up)}`,
      tone: state.facts.wan.allOffline ? "danger" : state.facts.wan.offline ? "warn" : "ok",
    },
    {
      id: "timeline-route",
      title: "默认路由",
      value: mobileRouteValue(state),
      note: state.facts.wan.allOffline ? "出口不可用" : state.scenario === "collection-down" ? "可参考" : "主出口",
      tone: state.facts.wan.allOffline ? "danger" : state.facts.route.level,
    },
    {
      id: "timeline-collection",
      title: "采集",
      value: state.scenario === "collection-down" ? "历史快照" : "通道可读",
      note: `最近 ${latestSuccess(snapshot, state)}`,
      tone: state.scenario === "collection-down" ? "warn" : state.facts.collection.credibilityTone,
    },
    {
      id: "timeline-resource",
      title: "资源",
      value: resource.map((item) => item.value.replace(/\.0%$/, "%")).join(" / "),
      note: state.scenario === "resource-full" ? "三项超阈" : "处理器 / 内存 / 磁盘",
      tone: resource.some((item) => item.tone === "danger") ? "danger" : "ok",
    },
    {
      id: "timeline-interface",
      title: "接口",
      value: state.facts.interfaces.down > 0 ? `${formatNumber(state.facts.interfaces.down)} Down` : "正常",
      note: state.facts.interfaces.downNames.slice(0, 2).join(" / ") || "承载正常",
      tone: state.facts.interfaces.down > 0 ? "danger" : "trust",
    },
  ];
  const pick = (ids: string[]) => ids.map((id) => base.find((row) => row.id === id)).filter(Boolean) as MobileMonitorRow[];
  const priority = priorityOf(state);
  if (priority === "resource-full") return withSurfaceCoreBlocks(pick(["timeline-resource", "timeline-wan", "timeline-collection", "timeline-route"]));
  if (priority === "wan-offline") return withSurfaceCoreBlocks(pick(["timeline-wan", "timeline-route", "timeline-collection", "timeline-resource"]));
  if (priority === "interface-down") return withSurfaceCoreBlocks(pick(["timeline-interface", "timeline-route", "timeline-wan", "timeline-collection"]));
  if (priority === "collection-degraded") return withSurfaceCoreBlocks(pick(["timeline-collection", "timeline-wan", "timeline-resource", "timeline-route"]));
  return withSurfaceCoreBlocks(pick(["timeline-wan", "timeline-collection", "timeline-resource", "timeline-route"]));
}

function wanPorts(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileWanPort[] {
  const source = wanRows(snapshot);
  const total = Math.max(1, wanLineCount(snapshot, state));
  const rows = Array.from({ length: Math.min(8, total) }, (_, index) => source[index] || ({ name: `WAN${index + 1}`, running: false } as OverviewRawWanRow));
  return rows.map((row, index) => {
    const offline = state.facts.wan.allOffline || row.running === false;
    const name = clean(row.name || row.interface, `pppoe-wan${index + 1}`).replace(/^pppoe[-_]?/i, "");
    const carrier = clean(row.parent || row.access || row.interface, `P${index + 1}`).replace(/^ether/i, "ether");
    const role = total <= 1 || index === 0 ? "default" : index === 1 ? "backup" : "member";
    const roleLabel = role === "default" ? "默认出口" : role === "backup" ? "备用出口" : "成员出口";
    const routeBinding = role === "default" ? "default-route" : role === "backup" ? "standby-route" : "member-route";
    const impact = !offline ? "not-affected" : role === "default" ? "default-route-affected" : role === "backup" ? "backup-affected" : "member-affected";
    const businessImpact = state.facts.wan.allOffline
      ? "internet-down"
      : impact === "default-route-affected"
        ? "degraded-backup"
        : "no-primary-impact";
    const stateText = offline ? "离线" : "在线";
    const portState = offline ? "down" : "up";
    return {
      id: `wan-port-${index}`,
      label: `P${index + 1}`,
      name,
      note: `${roleLabel} · ${carrier} · ${stateText}`,
      carrier,
      stateText,
      portState,
      role,
      roleLabel,
      impact,
      businessImpact,
      routeBinding,
      layout: "matrix",
      tone: offline ? "danger" : "ok",
    };
  });
}


function primaryResourceCell(resourceCells: MobileHeroResourceCell[]): MobileHeroResourceCell | undefined {
  return resourceCells.find((item) => item.risk === "primary-risk") || resourceCells[0];
}

function abnormalDecisionNextAction(
  priority: MobileOverviewModel["priority"],
  resourceCells: MobileHeroResourceCell[],
): string {
  if (priority === "wan-offline") return "查默认出口";
  if (priority === "snapshot-missing") return "查采集状态";
  if (priority === "interface-down") return "查接口承载";
  if (priority === "resource-full") return `先处理${primaryResourceCell(resourceCells)?.label || "资源"}`;
  if (priority === "collection-degraded") return "查采集通道";
  return "观察";
}

function abnormalDecisionActionNote(
  priority: MobileOverviewModel["priority"],
  resourceCells: MobileHeroResourceCell[],
): string {
  if (priority === "wan-offline") return "WAN / 默认路由";
  if (priority === "snapshot-missing") return "采集 / 最近成功";
  if (priority === "interface-down") return "接口 / 默认路由";
  if (priority === "resource-full") {
    const primary = primaryResourceCell(resourceCells);
    return primary ? `${primary.display} · ${primary.thresholdText} · ${primary.sustainedText}` : "按最高风险项处理";
  }
  if (priority === "collection-degraded") return "通道 / 缓存";
  return "持续观察";
}

function abnormalDecisionTargetTab(priority: MobileOverviewModel["priority"]): MobileAbnormalDecisionCell["targetTab"] {
  if (priority === "wan-offline") return "wan";
  if (priority === "snapshot-missing" || priority === "collection-degraded") return "log";
  if (priority === "resource-full") return undefined;
  if (priority === "interface-down") return "interface";
  return undefined;
}

function abnormalDecisionEvidenceTone(priority: MobileOverviewModel["priority"]): OverviewTone {
  if (priority === "snapshot-missing") return "missing";
  if (priority === "wan-offline") return "danger";
  return "trust";
}

function abnormalDecisionImpactValue(
  priority: MobileOverviewModel["priority"],
  scope: MobileImpactScope,
): string {
  if (priority === "wan-offline") return "默认路由不可承载";
  if (priority === "snapshot-missing") return "业务数据不展示";
  if (priority === "resource-full") return "业务仍可用 · 风险高";
  if (priority === "interface-down") return "承载关系待判";
  if (priority === "collection-degraded") return "采集可信度下降";
  return scope.value;
}

function abnormalDecisionCells(
  priority: MobileOverviewModel["priority"],
  contract: MobileOverviewModel["appHomeContract"],
  scope: MobileImpactScope,
  network: RouterOsNetworkViewModel,
  heroTitle: string,
  listTitle: string,
  resourceCells: MobileHeroResourceCell[],
): MobileAbnormalDecisionCell[] {
  if (priority === "normal") return [];
  const evidenceParts = contract.trustBoundary.split("·").map((part) => clean(part)).filter(Boolean);
  return [
    { label: "对象", value: listTitle, note: heroTitle, tone: scope.tone },
    { label: "影响", value: abnormalDecisionImpactValue(priority, scope), note: scope.note, tone: scope.tone },
    { label: "可信度", value: evidenceParts[0] || network.snapshot.value, note: evidenceParts.slice(1).join(" · ") || network.snapshot.label, tone: abnormalDecisionEvidenceTone(priority) },
    { label: "下一步", value: abnormalDecisionNextAction(priority, resourceCells), note: abnormalDecisionActionNote(priority, resourceCells), tone: contract.severity === "p0" ? "danger" : "warn", targetTab: abnormalDecisionTargetTab(priority) },
  ];
}

export function buildMobileOverviewModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileOverviewModel {
  const network = buildRouterOsNetworkViewModel(snapshot, state);
  const priority = network.priority;
  const scope = buildMobileImpactScope(network);
  const heroTitle = titleFor(network);
  const list = buildMobilePrimaryList(snapshot, state, network, scope, resourceFacts(state));
  const policy = resolveMobileOverviewPolicy(priority, list.kind, {
    recentSuccess: latestSuccess(snapshot, state),
    collectionLabel: network.collection.label,
    collectionValue: network.collection.value,
    snapshotValue: network.snapshot.value,
    routeValue: network.route.value,
  });
  const pills = heroPills(snapshot, state, network);
  const core = coreMetrics(snapshot, state, network);
  const resourceCells = heroResourceCells(state);
  return {
    priority,
    network,
    header: headerModel(snapshot, state),
    appHomeContract: policy.appHomeContract,
    surface: policy.surface,
    impactScope: scope,
    collectionTrustSeparation: collectionTrustSeparation(priority, scope),
    abnormalDecision: abnormalDecisionCells(priority, policy.appHomeContract, scope, network, heroTitle, list.title, resourceCells),
    collectionTrust: collectionTrustCells(state),
    coreMetrics: core,
    normalSummary: normalSummaryModel(priority),
    hero: {
      title: heroTitle,
      subtitle: subtitleFor(snapshot, state, network, scope),
      facts: heroFacts(snapshot, state),
      pills,
      trustRail: heroTrustRail(pills),
      interfaceCells: heroInterfaceCells(snapshot, state),
      channelCells: heroChannelCells(state),
      resourceCells,
      visualKind: heroVisualKind(priority),
      showMetrics: showHeroMetrics(),
      trend: buildMobileTrendChart(snapshot, state),
    },
    trustPlanes: trustPlanes(network),
    statusRows: statusRows(snapshot, state),
    primaryList: list,
    wanPorts: wanPorts(snapshot, state),
  };
}
