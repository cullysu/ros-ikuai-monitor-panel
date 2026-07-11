import {
  formatNumber,
  shortTimestamp,
  toNumber,
  type OverviewDerivedState,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
  type OverviewTone,
} from "./index";
import { buildRouterOsEvidenceModel, type RouterOsEvidenceModel } from "./routerosEvidenceModel";
import type { RouterOsTrustPlane, RouterOsTrustPlaneId } from "./routerosTrustModel";

export type RouterOsNetworkPriority =
  | "snapshot-missing"
  | "wan-offline"
  | "resource-full"
  | "interface-down"
  | "collection-degraded"
  | "normal";

export interface RouterOsNetworkToken {
  id: string;
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
}

export interface RouterOsNetworkPlane extends RouterOsNetworkToken {
  id: RouterOsTrustPlaneId;
  meaning: string;
  boundary: string;
}

export interface RouterOsNetworkConclusion extends RouterOsNetworkToken {
  title: string;
  heroTitle: string;
  severity: "p0" | "p1" | "p2" | "normal";
}

export interface RouterOsNetworkViewModel {
  priority: RouterOsNetworkPriority;
  conclusion: RouterOsNetworkConclusion;
  object: RouterOsNetworkToken;
  impact: RouterOsNetworkToken;
  credibility: RouterOsNetworkToken;
  route: RouterOsNetworkToken;
  planes: RouterOsNetworkPlane[];
  forwarding: RouterOsNetworkPlane;
  collection: RouterOsNetworkPlane;
  snapshot: RouterOsNetworkPlane;
  business: RouterOsNetworkPlane;
  channels: RouterOsNetworkToken[];
  evidence: RouterOsEvidenceModel;
}

export const ROUTEROS_PRESENTATION_VIEW_MODEL_CONTRACT = "collection-facts/routeros-semantics/user-conclusion";

export interface RouterOsDesktopPresentation {
  contract: typeof ROUTEROS_PRESENTATION_VIEW_MODEL_CONTRACT;
  conclusionValue: string;
  conclusionNote: string;
  verdictText: string;
  coreText: string;
  object: RouterOsNetworkToken;
  impact: RouterOsNetworkToken;
  incidentObject: string;
  readonlyJudgement: string;
  incidentSummary: RouterOsNetworkToken[];
  navLabels: ["状态总览", "多出口", "接口/VLAN", "在线终端", "采集日志"];
  copyPolicy: "user-conclusion-first-routeros-raw-secondary";
}

export interface RouterOsPresentationViewModel {
  priority: RouterOsNetworkPriority;
  desktop: RouterOsDesktopPresentation;
}

function clean(value: unknown, fallback = "-"): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function wanRows(snapshot: OverviewRawSnapshot): OverviewRawWanRow[] {
  if (Array.isArray(snapshot.wan) && snapshot.wan.length) return snapshot.wan;
  return Array.isArray(snapshot.pppoe) ? snapshot.pppoe : [];
}

function twoDigit(value: number): string {
  return String(value).padStart(2, "0");
}

function compactTime(raw: unknown): string {
  const source = String(raw ?? "").trim();
  if (!source) return "未记录";
  const numeric = typeof raw === "number" || /^\d+$/.test(source) ? Number(raw) : Number.NaN;
  const date = Number.isFinite(numeric)
    ? new Date(numeric < 1_000_000_000_000 ? numeric * 1000 : numeric)
    : new Date(source);
  if (Number.isNaN(date.getTime())) {
    const fallback = shortTimestamp(raw);
    return fallback && !/\d{4}-\d{2}-\d{2}T/.test(fallback) ? fallback : "未记录";
  }
  const now = new Date();
  const time = `${twoDigit(date.getHours())}:${twoDigit(date.getMinutes())}`;
  if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()) return time;
  return `${twoDigit(date.getMonth() + 1)}-${twoDigit(date.getDate())} ${time}`;
}

export function routerOsLatestSuccess(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  const meta = snapshot.meta || {};
  const raw = state.scenario === "no-snapshot"
    ? meta.staticUpdatedAt || meta.realtimeUpdatedAt || snapshot.updatedAt
    : snapshot.updatedAt || meta.realtimeUpdatedAt || meta.staticUpdatedAt || meta.slowRestUpdatedAt;
  return compactTime(raw);
}

function stripRest(label: string): string {
  return clean(label.replace(/^REST\s*/i, ""), "可用");
}

function stripSsh(label: string): string {
  return clean(label.replace(/^SSH\s*/i, ""), "可用");
}

export function routerOsNetworkPriority(state: OverviewDerivedState): RouterOsNetworkPriority {
  if (state.scenario === "fleet") return "normal";
  if (state.scenario === "single") return "normal";
  if (state.scenario === "no-snapshot") return "snapshot-missing";
  if (state.scenario === "all-offline" || (state.facts.wan.allOffline && state.scenario !== "interfaces-down")) return "wan-offline";
  if (state.scenario === "resource-full") return "resource-full";
  if (state.scenario === "interfaces-down" || state.facts.interfaces.down > 0) return "interface-down";
  if (state.scenario === "collection-down" || state.facts.collection.dataStale || state.facts.freshness.history) return "collection-degraded";
  return "normal";
}

function totalWan(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): number {
  return Math.max(1, state.facts.wan.total, state.facts.wan.online + state.facts.wan.offline, wanRows(snapshot).length);
}

function snapshotTrustText(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "缺失";
  if (state.scenario === "collection-down" || state.facts.collection.dataStale || state.facts.freshness.history) return "缓存";
  return "快照新鲜";
}

function routeValue(state: OverviewDerivedState): string {
  if (state.facts.wan.allOffline) return "异常";
  if (state.facts.route.level === "danger") return "异常";
  if (state.scenario === "collection-down") return "历史快照";
  if (state.scenario === "interfaces-down") return "待确认";
  if (state.facts.route.level === "missing") return "待确认";
  if (state.scenario === "resource-full") return "活动默认路由";
  return "可用";
}

function conclusionFor(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, priority: RouterOsNetworkPriority): RouterOsNetworkConclusion {
  const total = totalWan(snapshot, state);
  if (priority === "snapshot-missing") {
    return { id: "conclusion", label: "结论", value: "缺快照", title: "业务快照缺失", heroTitle: "业务快照缺失", note: "RouterOS 当前不可达，业务数据不展示", tone: "missing", severity: "p0" };
  }
  if (priority === "wan-offline") {
    return { id: "conclusion", label: "结论", value: "WAN断链", title: "WAN 全离线", heroTitle: "WAN 全离线", note: `WAN 0/${formatNumber(total)}，默认路由异常`, tone: "danger", severity: "p0" };
  }
  if (priority === "resource-full") {
    return { id: "conclusion", label: "结论", value: "资源满载", title: "资源满载", heroTitle: "资源满载", note: "处理器 / 内存 / 磁盘连续越阈，转发需关注", tone: "danger", severity: "p1" };
  }
  if (priority === "interface-down") {
    return { id: "conclusion", label: "结论", value: "接口Down", title: "接口 Down", heroTitle: "接口 Down", note: `${formatNumber(state.facts.interfaces.down)} 个接口离线，承载关系待确认`, tone: "danger", severity: "p1" };
  }
  if (priority === "collection-degraded") {
    return { id: "conclusion", label: "结论", value: "采集降级", title: "采集降级", heroTitle: "采集降级", note: "管理面降级，缓存可参考；不等同转发异常", tone: "warn", severity: "p2" };
  }
  if (state.scenario === "fleet") {
    return { id: "conclusion", label: "结论", value: "需确认", title: "多线路可用", heroTitle: "多线路可用", note: `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(total || 1)}，默认路由 ${routeValue(state)}`, tone: "warn", severity: "normal" };
  }
  return { id: "conclusion", label: "结论", value: "转发可用", title: "转发面可用", heroTitle: "WAN / 默认路由证据", note: `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(total || 1)}，默认路由可用，快照在可信窗口内`, tone: "ok", severity: "normal" };
}

function objectFor(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, priority: RouterOsNetworkPriority): RouterOsNetworkToken {
  const total = totalWan(snapshot, state);
  if (priority === "snapshot-missing") return { id: "object", label: "对象", value: "快照", note: "业务快照缺失", tone: "missing" };
  if (priority === "wan-offline") return { id: "object", label: "对象", value: `WAN 0/${formatNumber(total)}`, note: "全部出口离线", tone: "danger" };
  if (priority === "resource-full") return { id: "object", label: "对象", value: "处理器/内存/磁盘", note: "三项连续越阈", tone: "danger" };
  if (priority === "interface-down") return { id: "object", label: "对象", value: `接口 ${formatNumber(state.facts.interfaces.down)} Down`, note: state.facts.interfaces.downNames.slice(0, 2).join(" / ") || "承载待确认", tone: "danger" };
  if (priority === "collection-degraded") return { id: "object", label: "对象", value: "采集", note: "REST / SSH / 快照边界", tone: "warn" };
  return { id: "object", label: "对象", value: `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(total || 1)}`, note: "转发面可用", tone: state.facts.wan.offline ? "warn" : "ok" };
}

function impactFor(state: OverviewDerivedState, priority: RouterOsNetworkPriority): RouterOsNetworkToken {
  if (priority === "snapshot-missing") return { id: "impact", label: "影响", value: "不展示", note: "无可信业务数据", tone: "missing" };
  if (priority === "wan-offline") return { id: "impact", label: "影响", value: "外网不可用", note: "默认出口不可用", tone: "danger" };
  if (priority === "resource-full") return { id: "impact", label: "影响", value: "资源余量低", note: "业务可能抖动", tone: "warn" };
  if (priority === "interface-down") return { id: "impact", label: "影响", value: "承载待判", note: "需看默认路由关系", tone: "warn" };
  if (priority === "collection-degraded") return { id: "impact", label: "影响", value: "可信度下降", note: "采集降级但非断网结论", tone: "warn" };
  return { id: "impact", label: "影响", value: clean(state.facts.route.label, "出口可用"), note: "默认出口可用", tone: state.facts.route.level };
}

function planeMeaning(plane: RouterOsTrustPlane): string {
  if (plane.id === "forwarding") return "用户业务是否能通过路由器转发";
  if (plane.id === "collection") return "管理通道是否能读到 RouterOS";
  if (plane.id === "snapshot") return "页面数据是否来自可信时间窗口";
  return "业务指标是否允许展示";
}

function planeBoundary(plane: RouterOsTrustPlane): string {
  if (plane.id === "forwarding") return "转发面不由 REST 可达直接推出";
  if (plane.id === "collection") return "采集可达不等于外网正常";
  if (plane.id === "snapshot") return "缓存只能说明历史状态";
  return "无快照时不展示业务排行/速率";
}

function toNetworkPlane(plane: RouterOsTrustPlane): RouterOsNetworkPlane {
  return {
    id: plane.id,
    label: plane.label,
    value: plane.value,
    note: plane.note,
    tone: plane.tone,
    meaning: planeMeaning(plane),
    boundary: planeBoundary(plane),
  };
}

function channelTokens(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): RouterOsNetworkToken[] {
  return [
    {
      id: "routeros",
      label: "RouterOS",
      value: state.scenario === "no-snapshot" ? "不可达" : "可达",
      note: state.scenario === "no-snapshot" ? "当前无可信数据" : "管理面可读",
      tone: state.scenario === "no-snapshot" ? "danger" : state.facts.collection.level,
    },
    {
      id: "rest",
      label: "REST",
      value: state.scenario === "collection-down" || state.scenario === "no-snapshot" ? "待确认" : stripRest(state.facts.collection.restLabel),
      note: "管理通道，不代表转发正常",
      tone: state.scenario === "no-snapshot" ? "warn" : state.scenario === "collection-down" ? "warn" : state.facts.collection.level,
    },
    {
      id: "ssh",
      label: "SSH",
      value: state.scenario === "no-snapshot" ? "不可用" : stripSsh(state.facts.collection.sshLabel),
      note: "辅助读取",
      tone: state.scenario === "no-snapshot" ? "danger" : state.facts.collection.level,
    },
    {
      id: "snapshot",
      label: "快照",
      value: state.scenario === "no-snapshot" ? "无" : snapshotTrustText(state),
      note: `最近 ${routerOsLatestSuccess(snapshot, state)}`,
      tone: state.scenario === "no-snapshot" ? "missing" : state.facts.collection.credibilityTone,
    },
  ];
}

export function buildRouterOsNetworkViewModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): RouterOsNetworkViewModel {
  const evidence = buildRouterOsEvidenceModel(snapshot, state);
  const priority = routerOsNetworkPriority(state);
  const planes = evidence.planes.map(toNetworkPlane);
  const fallback = (id: RouterOsTrustPlaneId): RouterOsNetworkPlane => (
    planes.find((plane) => plane.id === id) || toNetworkPlane(evidence[id])
  );
  const forwarding = fallback("forwarding");
  const collection = fallback("collection");
  const snapshotPlane = fallback("snapshot");
  const business = fallback("business");
  const latest = routerOsLatestSuccess(snapshot, state);
  const credibility: RouterOsNetworkToken = {
    id: "credibility",
    label: "可信",
    value: priority === "snapshot-missing" ? "无" : priority === "collection-degraded" ? "中" : "高",
    note: priority === "snapshot-missing" ? "业务快照缺失" : priority === "collection-degraded" ? `缓存边界 · ${latest}` : `最近 ${latest}`,
    tone: priority === "snapshot-missing" ? "missing" : priority === "collection-degraded" ? "warn" : state.facts.collection.credibilityTone,
  };
  return {
    priority,
    conclusion: conclusionFor(snapshot, state, priority),
    object: objectFor(snapshot, state, priority),
    impact: impactFor(state, priority),
    credibility,
    route: {
      id: "route",
      label: "默认路由",
      value: routeValue(state),
      note: evidence.route.summary.note,
      tone: state.facts.wan.allOffline ? "danger" : state.facts.route.level,
    },
    planes,
    forwarding,
    collection,
    snapshot: snapshotPlane,
    business,
    channels: channelTokens(snapshot, state),
    evidence,
  };
}

export function routerOsResourceSustainedText(value: unknown, threshold: number): string {
  return toNumber(value) >= threshold ? "持续6/6" : "持续0/6";
}


function presentationConclusionValue(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, network: RouterOsNetworkViewModel): string {
  if (network.priority === "wan-offline") return network.conclusion.value + " " + formatNumber(state.facts.wan.online) + "/" + formatNumber(state.facts.wan.total);
  if (network.priority === "resource-full") return network.conclusion.value + " " + clean(state.facts.resource.summaryText, "资源超阈");
  if (network.priority === "interface-down") return formatNumber(state.facts.interfaces.down) + "/" + formatNumber(state.facts.interfaces.total) + " 接口 Down";
  if (network.priority === "collection-degraded") return network.conclusion.value + " " + routerOsLatestSuccess(snapshot, state);
  if (network.priority === "snapshot-missing") return network.conclusion.title;
  return network.conclusion.value;
}

function presentationConclusionNote(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, network: RouterOsNetworkViewModel): string {
  const latest = routerOsLatestSuccess(snapshot, state);
  if (network.priority === "snapshot-missing") return "无可信业务快照，业务数据不展示";
  if (network.priority === "resource-full") return "资源证据优先，业务仍可用但转发余量低";
  if (network.priority === "interface-down") return "转发接口 Down，需核对默认路由承载";
  if (network.priority === "wan-offline") return "默认出口不可承载，采集状态只作旁证";
  if (network.priority === "collection-degraded") return "采集可信度下降，不等同转发异常 · 最近成功 " + latest;
  return "WAN / 路由 / 采集 / 资源均可判";
}

function presentationReadonlyJudgement(network: RouterOsNetworkViewModel): string {
  if (network.priority === "wan-offline") return "确认出口不可承载";
  if (network.priority === "resource-full") return "确认资源余量下降";
  if (network.priority === "interface-down") return "确认承载关系待判";
  if (network.priority === "collection-degraded") return "仅证明采集可信度下降";
  if (network.priority === "snapshot-missing") return "不展示业务数据";
  return "业务状态可读";
}

function presentationIncidentObject(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, network: RouterOsNetworkViewModel): string {
  if (network.priority === "wan-offline") return "WAN 0/" + formatNumber(Math.max(1, totalWan(snapshot, state)));
  if (network.priority === "resource-full") return clean(state.facts.resource.summaryText, "资源超阈");
  if (network.priority === "interface-down") return formatNumber(state.facts.interfaces.down) + " 接口 Down";
  if (network.priority === "collection-degraded") return "REST / SSH / 快照";
  if (network.priority === "snapshot-missing") return "业务快照缺失";
  return network.object.value;
}

function presentationVerdictText(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, network: RouterOsNetworkViewModel): string {
  const latest = routerOsLatestSuccess(snapshot, state);
  return [
    "presentation-model",
    ROUTEROS_PRESENTATION_VIEW_MODEL_CONTRACT,
    "结论 " + network.conclusion.title,
    "对象 " + presentationIncidentObject(snapshot, state, network),
    "影响 " + network.impact.value,
    "转发面 " + network.forwarding.value,
    "采集面 " + network.collection.value,
    "快照面 " + network.snapshot.value,
    "业务面 " + network.business.value,
    "最近成功 " + latest,
    "原始字段仅作二级证据",
  ].join(" · ");
}

function presentationCoreText(state: OverviewDerivedState, network: RouterOsNetworkViewModel): string {
  if (state.scenario === "fleet") return "多出口 / 默认路由 / 采集可信度 / 资源阈值 / 最近成功 / TopN";
  if (network.priority === "snapshot-missing") return "采集链路 / 业务快照 / 展示边界 / 最近成功 / 可信边界";
  if (network.priority === "wan-offline") return "离线出口 / 默认路由 / 采集可信度 / 最近成功 / 影响范围";
  if (network.priority === "resource-full") return "资源阈值 / 持续窗口 / 转发余量 / 默认路由 / 采样可信度";
  if (network.priority === "interface-down") return "接口承载 / 默认路由 / 采集旁证 / 影响范围 / 最近成功";
  if (network.priority === "collection-degraded") return "REST / SSH / 快照 / 最近成功 / 转发边界";
  return "WAN 趋势 / 默认路由 / 采集可信度 / 资源阈值 / 最近成功 / TopN";
}

export function buildRouterOsPresentationViewModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, network = buildRouterOsNetworkViewModel(snapshot, state)): RouterOsPresentationViewModel {
  const latest = routerOsLatestSuccess(snapshot, state);
  const desktop: RouterOsDesktopPresentation = {
    contract: ROUTEROS_PRESENTATION_VIEW_MODEL_CONTRACT,
    conclusionValue: presentationConclusionValue(snapshot, state, network),
    conclusionNote: presentationConclusionNote(snapshot, state, network),
    verdictText: presentationVerdictText(snapshot, state, network),
    coreText: presentationCoreText(state, network),
    object: network.object,
    impact: network.impact,
    incidentObject: presentationIncidentObject(snapshot, state, network),
    readonlyJudgement: presentationReadonlyJudgement(network),
    incidentSummary: [
      { id: "presentation-object", label: "事故对象", value: presentationIncidentObject(snapshot, state, network), note: network.object.note, tone: network.object.tone },
      { id: "presentation-impact", label: "影响范围", value: network.impact.value, note: network.impact.note, tone: network.impact.tone },
      { id: "presentation-credibility", label: "可信度", value: network.credibility.value, note: network.credibility.note, tone: network.credibility.tone },
      { id: "presentation-recent", label: "最近成功", value: latest, note: network.snapshot.note, tone: network.snapshot.tone },
      { id: "presentation-readonly", label: "只读判断", value: presentationReadonlyJudgement(network), note: "不写入 RouterOS", tone: network.conclusion.tone },
    ],
    navLabels: ["状态总览", "多出口", "接口/VLAN", "在线终端", "采集日志"],
    copyPolicy: "user-conclusion-first-routeros-raw-secondary",
  };
  return { priority: network.priority, desktop };
}
