import { formatNumber, type OverviewDerivedState, type OverviewRawSnapshot } from "./index";
import {
  buildRouterOsNetworkViewModel,
  routerOsLatestSuccess,
  type RouterOsNetworkToken,
  type RouterOsNetworkViewModel,
  type RouterOsNetworkPriority,
} from "./routerosNetworkViewModel";

export interface RouterOsDesktopPresentation {
  conclusionValue: string;
  conclusionNote: string;
  object: RouterOsNetworkToken;
  impact: RouterOsNetworkToken;
  incidentObject: string;
  readonlyJudgement: string;
  incidentSummary: RouterOsNetworkToken[];
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

function conclusionValue(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, network: RouterOsNetworkViewModel): string {
  if (network.priority === "wan-offline") return `${network.object.value} 全离线`;
  if (network.priority === "resource-full") return `${network.conclusion.value} ${clean(state.facts.resource.summaryText, "资源超阈")}`;
  if (network.priority === "interface-down") return `${formatNumber(state.facts.interfaces.down)}/${formatNumber(state.facts.interfaces.total)} 接口 Down`;
  if (network.priority === "collection-degraded") return `${network.conclusion.value} ${routerOsLatestSuccess(snapshot, state)}`;
  if (network.priority === "snapshot-missing") return network.conclusion.title;
  return network.conclusion.value;
}

function conclusionNote(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, network: RouterOsNetworkViewModel): string {
  const latest = routerOsLatestSuccess(snapshot, state);
  if (network.priority === "snapshot-missing") return "无可信业务快照，业务数据不展示";
  if (network.priority === "resource-full") return "资源证据优先，业务仍可用但转发余量低";
  if (network.priority === "interface-down") return "转发接口 Down，需核对默认路由承载";
  if (network.priority === "wan-offline") return "默认出口不可承载，采集状态只作旁证";
  if (network.priority === "collection-degraded") return `采集可信度下降，不等同转发异常 · 最近成功 ${latest}`;
  return `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(Math.max(1, state.facts.wan.total))} · 默认路由可用 · 快照 ${latest}`;
}

function readonlyJudgement(network: RouterOsNetworkViewModel): string {
  if (network.priority === "wan-offline") return "确认出口不可承载";
  if (network.priority === "resource-full") return "确认资源余量下降";
  if (network.priority === "interface-down") return "确认承载关系待判";
  if (network.priority === "collection-degraded") return "仅证明采集可信度下降";
  if (network.priority === "snapshot-missing") return "不展示业务数据";
  return "只读监测，不写配置";
}

function incidentObject(state: OverviewDerivedState, network: RouterOsNetworkViewModel): string {
  if (network.priority === "resource-full") return clean(state.facts.resource.summaryText, "资源超阈");
  if (network.priority === "interface-down") return `${formatNumber(state.facts.interfaces.down)} 接口 Down`;
  if (network.priority === "collection-degraded") return "REST 待确认 / SSH 不可用 / 快照缓存";
  if (network.priority === "snapshot-missing") return "业务快照缺失";
  return network.object.value;
}

export function buildRouterOsPresentationViewModel(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  network = buildRouterOsNetworkViewModel(snapshot, state),
): RouterOsPresentationViewModel {
  const latest = routerOsLatestSuccess(snapshot, state);
  const incident = incidentObject(state, network);
  const judgement = readonlyJudgement(network);
  return {
    priority: network.priority,
    desktop: {
      conclusionValue: conclusionValue(snapshot, state, network),
      conclusionNote: conclusionNote(snapshot, state, network),
      object: network.object,
      impact: network.impact,
      incidentObject: incident,
      readonlyJudgement: judgement,
      incidentSummary: [
        { id: "presentation-object", label: "事故对象", value: incident, note: network.object.note, tone: network.object.tone },
        { id: "presentation-impact", label: "影响范围", value: network.impact.value, note: network.impact.note, tone: network.impact.tone },
        { id: "presentation-credibility", label: "可信度", value: network.credibility.value, note: network.credibility.note, tone: network.credibility.tone },
        { id: "presentation-recent", label: "最近成功", value: latest, note: network.snapshot.note, tone: network.snapshot.tone },
        { id: "presentation-readonly", label: "只读判断", value: judgement, note: "不写入 RouterOS", tone: network.conclusion.tone },
      ],
      copyPolicy: "user-conclusion-first-routeros-raw-secondary",
    },
  };
}
