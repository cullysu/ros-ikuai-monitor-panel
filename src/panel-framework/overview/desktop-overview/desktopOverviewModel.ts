import type { PanelRouteId } from "../../routes/panelRoutes";
import {
  formatRate,
  type OverviewDerivedState,
  type OverviewRawInterfaceRow,
  type OverviewRawRoute,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
  type OverviewTone,
} from "../index";
import { buildOverviewEvidenceModel } from "../evidence-model/buildOverviewEvidenceModel";
import type { OverviewEvidenceModel } from "../evidence-model/overviewEvidenceTypes";

export interface DesktopStatusItem {
  key: "evidence" | "route" | "collection";
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
}

export interface DesktopLedgerRow {
  id: string;
  category: string;
  object: string;
  state: string;
  evidence: string;
  source: string;
  tone: OverviewTone;
  route?: PanelRouteId;
}

export interface DesktopOverviewModel {
  evidence: OverviewEvidenceModel;
  statusItems: [DesktopStatusItem, DesktopStatusItem, DesktopStatusItem];
  decisionRows: DesktopLedgerRow[];
  objectRows: DesktopLedgerRow[];
  activeRoute: OverviewRawRoute | null;
}

function clean(value: unknown, fallback = "未记录"): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function finite(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function wanRows(snapshot: OverviewRawSnapshot): OverviewRawWanRow[] {
  if (Array.isArray(snapshot.wan) && snapshot.wan.length) return snapshot.wan;
  return Array.isArray(snapshot.pppoe) ? snapshot.pppoe : [];
}

function interfaceRows(snapshot: OverviewRawSnapshot): OverviewRawInterfaceRow[] {
  return Array.isArray(snapshot.interfaces) ? snapshot.interfaces : [];
}

function activeRoute(snapshot: OverviewRawSnapshot): OverviewRawRoute | null {
  const explicit = Array.isArray(snapshot.routes?.defaultRoutes)
    ? snapshot.routes.defaultRoutes
    : Array.isArray(snapshot.routes?.items)
      ? snapshot.routes.items.filter((row) => row.default === true || row.dstAddress === "0.0.0.0/0" || row.dstAddress === "::/0")
      : [];
  return explicit.find((row) => row.active === true && row.disabled !== true) || null;
}

function routeStatus(
  evidence: OverviewEvidenceModel,
  state: OverviewDerivedState,
  route: OverviewRawRoute | null,
): DesktopStatusItem {
  if (evidence.evidenceMode !== "current") return {
    key: "route",
    label: "默认路由",
    value: "无法核实",
    note: "当前路由变化不可见",
    tone: evidence.evidenceMode === "unavailable" ? "missing" : "warn",
  };
  if (!route) return {
    key: "route",
    label: "默认路由",
    value: state.facts.wan.total > 0 && state.facts.wan.online === 0 ? "无活动记录" : "无法核实",
    note: "未发现 active=true 且未停用的默认路由",
    tone: state.facts.wan.online === 0 ? "danger" : "warn",
  };
  const table = clean(route.routingTable || route.table, "main");
  const gateway = clean(route.gateway, "网关未记录");
  const distance = route.distance === undefined || route.distance === "" ? "距离未记录" : `距离 ${route.distance}`;
  return {
    key: "route",
    label: "默认路由",
    value: `${table} → ${gateway}`,
    note: `${distance} · 明确活动记录`,
    tone: "trust",
  };
}

function collectionStatus(evidence: OverviewEvidenceModel, state: OverviewDerivedState): DesktopStatusItem {
  const channels = [state.facts.collection.rest, state.facts.collection.ssh];
  const current = channels.filter((channel) => channel.status === "current").length;
  const unavailable = channels.every((channel) => channel.status === "unavailable" || channel.status === "failed");
  return {
    key: "collection",
    label: "采集通道",
    value: `${current} / 2 当前`,
    note: `REST ${state.facts.collection.rest.label} · SSH ${state.facts.collection.ssh.label}`,
    tone: current === 2 && evidence.evidenceMode === "current" ? "trust" : unavailable ? "danger" : "warn",
  };
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
      forwarding = "部分接口未运行";
      forwardingNote = "影响范围需按接口依赖核对";
      forwardingTone = "danger";
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
      tone: forwardingTone,
      route: evidence.risk === "interfaces" ? "interfaces" : "routes",
    },
    {
      id: "plane:business",
      category: "业务面",
      object: "终端业务",
      state: "没有独立测量",
      evidence: "不由 REST、SSH 或资源数值推断业务可用性",
      source: "evidence policy",
      tone: "missing",
      route: "readonlyDiagnostics",
    },
  ];
}

function operationalRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): DesktopLedgerRow[] {
  const runningInterfaces = Math.max(0, state.facts.interfaces.total - state.facts.interfaces.down);
  const resourceTone = state.facts.resource.level;
  const connectionTotal = finite(snapshot.connections?.total);
  return [
    {
      id: "decision:wan",
      category: "出口对象",
      object: "WAN",
      state: `${state.facts.wan.online} / ${state.facts.wan.total} 运行`,
      evidence: state.facts.wan.offline ? `${state.facts.wan.offline} 条未运行` : "当前对象均有运行记录",
      source: "wan",
      tone: state.facts.wan.offline ? "danger" : "trust",
      route: "lineStatus",
    },
    {
      id: "decision:interfaces",
      category: "转发对象",
      object: "接口",
      state: `${runningInterfaces} / ${state.facts.interfaces.total} 运行`,
      evidence: state.facts.interfaces.down ? `${state.facts.interfaces.down} 个 Down：${state.facts.interfaces.downNames.slice(0, 3).join("、")}` : "本次采样未见 Down",
      source: "interfaces",
      tone: state.facts.interfaces.down ? "danger" : "trust",
      route: "interfaces",
    },
    {
      id: "decision:resource",
      category: "设备资源",
      object: "CPU / 内存 / 磁盘",
      state: state.facts.resource.available ? `${Math.round(state.facts.resource.cpu)}% / ${Math.round(state.facts.resource.memory)}% / ${Math.round(state.facts.resource.disk)}%` : "未记录",
      evidence: state.facts.resource.available ? "阈值 85% / 85% / 90%" : "资源采样不可用",
      source: "overview.cpuLoad + memoryUsage + diskUsage",
      tone: resourceTone,
      route: "trafficLoad",
    },
    {
      id: "decision:connections",
      category: "连接对象",
      object: "连接跟踪",
      state: connectionTotal === null ? "未记录" : `${connectionTotal.toLocaleString("zh-CN")} 条`,
      evidence: connectionTotal === null ? "不以零值代替缺失" : "当前快照总量",
      source: "connections.total",
      tone: connectionTotal === null ? "missing" : "trust",
      route: "connections",
    },
  ];
}

function rateEvidence(row: OverviewRawWanRow): string {
  const down = finite(row.downRate);
  const up = finite(row.upRate);
  if (down === null || up === null) return "速率未记录";
  return `下 ${formatRate(down)} · 上 ${formatRate(up)}`;
}

function interfaceEvidence(row: OverviewRawInterfaceRow): string {
  const down = finite(row.downRate ?? row.rxRate);
  const up = finite(row.upRate ?? row.txRate);
  const relation = clean(row.bridge || row.parent || row.master, "关系未记录");
  if (down === null || up === null) return relation;
  return `${relation} · 下 ${formatRate(down)} · 上 ${formatRate(up)}`;
}

function objectRows(snapshot: OverviewRawSnapshot): DesktopLedgerRow[] {
  const wans = wanRows(snapshot).slice(0, 6).map((row, index): DesktopLedgerRow => ({
    id: `object:wan:${index}`,
    category: "WAN",
    object: clean(row.name || row.interface, `WAN ${index + 1}`),
    state: row.disabled === true ? "已停用" : row.running === false ? "未运行" : row.running === true ? "运行" : "状态未记录",
    evidence: `${clean(row.parent, "父接口未记录")} · ${rateEvidence(row)}`,
    source: `wan[${index}]`,
    tone: row.disabled === true || row.running === false ? "danger" : row.running === true ? "trust" : "missing",
    route: "lineStatus",
  }));
  const remaining = Math.max(0, 8 - wans.length);
  const interfaces = interfaceRows(snapshot).slice(0, remaining).map((row, index): DesktopLedgerRow => ({
    id: `object:interface:${index}`,
    category: "接口",
    object: clean(row.name || row.interface, `接口 ${index + 1}`),
    state: row.disabled === true ? "已停用" : row.running === false ? "未运行" : row.running === true ? "运行" : "状态未记录",
    evidence: interfaceEvidence(row),
    source: `interfaces[${index}]`,
    tone: row.disabled === true || row.running === false ? "danger" : row.running === true ? "trust" : "missing",
    route: "interfaces",
  }));
  return [...wans, ...interfaces];
}

export function buildDesktopOverviewModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): DesktopOverviewModel {
  const evidence = buildOverviewEvidenceModel(snapshot, state);
  const route = activeRoute(snapshot);
  const statusItems: [DesktopStatusItem, DesktopStatusItem, DesktopStatusItem] = [
    {
      key: "evidence",
      label: "证据边界",
      value: `${evidence.evidenceLabel} · ${evidence.evidenceTime}`,
      note: evidence.evidenceNote,
      tone: evidence.evidenceTone,
    },
    routeStatus(evidence, state, route),
    collectionStatus(evidence, state),
  ];
  return {
    evidence,
    statusItems,
    decisionRows: evidence.risk === "none" ? operationalRows(snapshot, state) : boundaryRows(evidence, state),
    objectRows: evidence.evidenceMode === "current" ? objectRows(snapshot) : [],
    activeRoute: route,
  };
}
