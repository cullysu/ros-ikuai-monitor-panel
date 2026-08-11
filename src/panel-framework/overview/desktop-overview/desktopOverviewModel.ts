import {
  type OverviewDerivedState,
  type OverviewRawRoute,
  type OverviewRawSnapshot,
  type OverviewTone,
} from "../index";
import { buildOverviewEvidenceModel } from "../evidence-model/buildOverviewEvidenceModel";
import type { OverviewEvidenceModel, OverviewOperationalDecision } from "../evidence-model/overviewEvidenceTypes";

export interface DesktopStatusItem {
  key: string;
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
}

export interface DesktopLedgerRow extends OverviewOperationalDecision {
  targetObjectId?: string;
}

export interface DesktopOverviewModel {
  evidence: OverviewEvidenceModel;
  statusItems: [DesktopStatusItem, DesktopStatusItem, DesktopStatusItem];
  decisionRows: DesktopLedgerRow[];
  objectRows: DesktopLedgerRow[];
  activeRoute: OverviewRawRoute | null;
}

const FLEET_TONE_ORDER: Record<OverviewTone, number> = {
  danger: 0,
  warn: 1,
  missing: 2,
  trust: 3,
  ok: 4,
};

/** Keeps fleet coverage actionable when a large sample contains mixed severity. */
export function rankFleetCoverageRows(rows: DesktopLedgerRow[]): DesktopLedgerRow[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => FLEET_TONE_ORDER[left.row.tone] - FLEET_TONE_ORDER[right.row.tone] || left.index - right.index)
    .map(({ row }) => row);
}

function statusItem(fact: OverviewEvidenceModel["facts"][number]): DesktopStatusItem {
  return { ...fact, note: fact.note || "" };
}

function boundaryRows(evidence: OverviewEvidenceModel, state: OverviewDerivedState): DesktopLedgerRow[] {
  const currentChannels = [state.facts.collection.rest, state.facts.collection.ssh]
    .filter((channel) => channel.status === "current").length;
  let forwarding = "当前不可判断";
  let forwardingNote = "采集证据不足，不能声明转发状态";
  let forwardingTone: OverviewTone = "missing";
  if (evidence.evidenceMode === "current") {
    if (evidence.risk === "wan") {
      forwarding = "出口对象未运行";
      forwardingNote = "没有核实到活动默认路由";
      forwardingTone = "danger";
    } else if (evidence.risk === "interfaces") {
      forwarding = "配置依赖接口未运行";
      forwardingNote = "已核实未停用默认路由依赖";
      forwardingTone = "danger";
    } else if (evidence.risk === "interface-review") {
      forwarding = "接口影响未判定";
      forwardingNote = "只观测到未运行，尚未核实业务依赖";
      forwardingTone = "warn";
    } else if (evidence.risk === "route") {
      forwarding = "默认路由未核实";
      forwardingNote = "WAN 记录不能替代活动路由证据";
      forwardingTone = "warn";
    } else if (evidence.risk === "resource") {
      forwarding = "未由资源值判定";
      forwardingNote = "资源压力不等于转发已经中断";
      forwardingTone = "warn";
    }
  }
  return [
    {
      id: "plane:management",
      category: "管理面",
      object: "REST / SSH",
      state: `${currentChannels} / 2 当前`,
      evidence: "通道状态只说明管理与采集可达性",
      source: "meta.realtime + meta.static",
      sourceLabel: "管理面通道状态",
      tone: currentChannels === 2 ? "trust" : currentChannels ? "warn" : "danger",
      route: "readonlyDiagnostics",
    },
    {
      id: "plane:forwarding",
      category: "转发面",
      object: "WAN / 接口 / 路由",
      state: forwarding,
      evidence: forwardingNote,
      source: "wan + interfaces + routes.defaultRoutes",
      sourceLabel: "WAN、接口与默认路由",
      tone: forwardingTone,
      route: evidence.risk === "interfaces" || evidence.risk === "interface-review" ? "interfaces" : "routes",
    },
    {
      id: "plane:business",
      category: "业务面",
      object: "终端业务",
      state: "没有独立测量",
      evidence: "不由 REST、SSH 或资源数值推断业务可用性",
      source: "evidence policy",
      sourceLabel: "证据判定策略",
      tone: "missing",
      route: "readonlyDiagnostics",
    },
  ];
}

export function buildDesktopOverviewModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): DesktopOverviewModel {
  const evidence = buildOverviewEvidenceModel(snapshot, state);
  const route = state.facts.route.verified ? state.facts.route.selected : null;
  return {
    evidence,
    statusItems: evidence.facts.map(statusItem) as [DesktopStatusItem, DesktopStatusItem, DesktopStatusItem],
    decisionRows: evidence.risk === "none" ? evidence.secondaryDecisions : boundaryRows(evidence, state),
    objectRows: state.scale === "fleet" ? rankFleetCoverageRows(evidence.coverageObjects) : evidence.comparisonObjects,
    activeRoute: route,
  };
}
