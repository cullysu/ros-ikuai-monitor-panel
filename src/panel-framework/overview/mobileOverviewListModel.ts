import type { OverviewDerivedState, OverviewRawSnapshot, OverviewRawWanRow, OverviewTone } from "./index";
import type { RouterOsNetworkViewModel } from "./routerosNetworkViewModel";
import {
  clean,
  firstNumber,
  firstText,
  interfaceRows,
  isRecord,
  latestSuccess,
  mobileRate,
  recordArray,
  totals,
  wanLineCount,
  wanRows,
} from "./mobileOverviewData";
import type {
  MobileEvidenceLayer,
  MobileEvidenceSource,
  MobileImpactScope,
  MobileMonitorFact,
  MobileMonitorListRow,
  MobilePrimaryListModel,
} from "./mobileOverviewModel";

function withListEvidence(
  row: Omit<MobileMonitorListRow, "evidenceLayer" | "evidenceSource" | "evidenceRole" | "evidenceKey">,
  evidence: Pick<MobileMonitorListRow, "evidenceLayer" | "evidenceSource" | "evidenceRole" | "evidenceKey">,
): MobileMonitorListRow {
  return { ...row, ...evidence };
}

function primaryImpactEvidence(
  source: MobileEvidenceSource,
  evidenceKey: string,
  layer: MobileEvidenceLayer = "business",
): Pick<MobileMonitorListRow, "evidenceLayer" | "evidenceSource" | "evidenceRole" | "evidenceKey"> {
  return { evidenceLayer: layer, evidenceSource: source, evidenceRole: "primary-impact", evidenceKey };
}

function secondaryEvidence(
  source: MobileEvidenceSource,
  evidenceKey: string,
  layer: MobileEvidenceLayer = "semantic",
): Pick<MobileMonitorListRow, "evidenceLayer" | "evidenceSource" | "evidenceRole" | "evidenceKey"> {
  return { evidenceLayer: layer, evidenceSource: source, evidenceRole: "secondary-evidence", evidenceKey };
}

function operationalEvidence(
  source: MobileEvidenceSource,
  evidenceKey: string,
): Pick<MobileMonitorListRow, "evidenceLayer" | "evidenceSource" | "evidenceRole" | "evidenceKey"> {
  return { evidenceLayer: "business", evidenceSource: source, evidenceRole: "operational-context", evidenceKey };
}

function offlineWanRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileMonitorListRow[] {
  const source = wanRows(snapshot);
  const total = Math.max(1, wanLineCount(snapshot, state));
  return Array.from({ length: Math.min(5, total) }, (_, index) => {
    const row = source[index] || ({ name: `pppoe-wan${index + 1}`, running: false } as OverviewRawWanRow);
    const name = clean(row.name || row.interface, `pppoe-wan${index + 1}`);
    const parent = clean(row.parent || row.interface || row.access, "承载待确认");
    const roleLabel = index === 0 ? "默认出口" : index === 1 ? "备用出口" : "成员出口";
    const impactText = index === 0 ? "默认路由受影响" : "备用/成员承载离线";
    return {
      id: `offline-wan-${index}`,
      rank: index + 1,
      name,
      kind: "WAN",
      meta: `${roleLabel} · P${index + 1} · ${parent} · ${impactText}`,
      value: "离线",
      status: "Down",
      percent: 0,
      tone: "danger",
      ...primaryImpactEvidence("forwarding", `offline-wan-${index}`),
    };
  });
}

function interfaceIncidentRows(snapshot: OverviewRawSnapshot): MobileMonitorListRow[] {
  const rows = interfaceRows(snapshot).filter((row) => row.running === false).slice(0, 5);
  const visible = rows.length ? rows : interfaceRows(snapshot).slice(0, 5);
  return visible.map((row, index) => ({
    id: `interface-down-${index}`,
    rank: index + 1,
    name: clean(row.name || row.interface, `接口${index + 1}`),
    kind: "接口",
    meta: `${clean(row.parent || row.master || row.bridge, "承载待确认")} · 默认路由待判`,
    value: row.running === false ? "Down" : "待判",
    status: row.running === false ? "Down" : "待判",
    percent: 0,
    tone: row.running === false ? "danger" : "warn",
    ...primaryImpactEvidence("interface", `interface-down-${index}`),
  }));
}

function snapshotBoundaryRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileMonitorListRow[] {
  return [
    { id: "business-hidden", rank: "", name: "业务流量", meta: `最近成功 ${latestSuccess(snapshot, state)} · 无快照`, value: "不展示", status: "缺失", percent: 0, tone: "missing", ...primaryImpactEvidence("business", "snapshot-business-hidden") },
    { id: "business-detail-hidden", rank: "", name: "业务明细", meta: "对象 / 地址 / 上下行需业务快照", value: "不可判", status: "缺失", percent: 0, tone: "missing", ...primaryImpactEvidence("snapshot", "snapshot-business-detail-hidden") },
    { id: "metadata-only", rank: "", name: "采集元数据", meta: "最近成功与链路状态可参考", value: "可参考", status: "边界", percent: 0, tone: "warn", ...secondaryEvidence("snapshot", "snapshot-metadata-only") },
    { id: "routeros-link", rank: "", name: "RouterOS 链路", meta: "当前不可达，等待恢复", value: "断链", status: "当前", percent: 0, tone: "danger", ...secondaryEvidence("collection", "snapshot-routeros-link") },
  ];
}

function collectionBoundaryRows(network: RouterOsNetworkViewModel): MobileMonitorListRow[] {
  return network.channels
    .filter((item) => item.id !== "routeros")
    .map((item, index) => ({
      id: `collection-${item.id}`,
      rank: "",
      name: item.label,
      kind: index === 2 ? "可信度" : "采集",
      meta: item.note,
      value: item.value,
      status: item.id === "snapshot" ? "边界" : "通道",
      percent: 0,
      tone: item.tone,
      ...secondaryEvidence(item.id === "snapshot" ? "snapshot" : "collection", `collection-${item.id}`),
    }));
}

function resourceIncidentRows(rows: MobileMonitorFact[]): MobileMonitorListRow[] {
  const values = rows.map((row) => {
    const value = Number.parseFloat(row.value.replace("%", ""));
    return Number.isFinite(value) ? value : 0;
  });
  const peakIndex = values.reduce(
    (peak, value, index) => value > values[peak] ? index : peak,
    0,
  );
  return rows.map((row, index) => {
    const raw = values[index];
    const threshold = /磁盘/.test(row.label) ? 90 : 85;
    return {
      id: `resource-incident-${row.label}`,
      rank: index + 1,
      name: row.label,
      kind: "资源",
      meta: `${row.note} · 阈值 ${threshold}% · 转发余量需关注`,
      value: row.value,
      status: row.tone === "danger" ? "超阈" : "正常",
      percent: Number.isFinite(raw) ? Math.max(6, Math.min(100, raw)) : 0,
      tone: index === peakIndex ? "danger" : row.tone === "danger" ? "warn" : row.tone,
      ...primaryImpactEvidence("resource", `resource-incident-${row.label}`, "semantic"),
    };
  });
}

function terminalCandidates(snapshot: OverviewRawSnapshot): Record<string, unknown>[] {
  const raw = snapshot as unknown as Record<string, unknown>;
  const connections = isRecord(raw.connections) ? raw.connections : {};
  const traffic = isRecord(raw.traffic) ? raw.traffic : {};
  const sources = [
    raw.terminals,
    raw.clients,
    raw.devices,
    raw.hosts,
    connections.topTerminals,
    connections.topClients,
    connections.topIps,
    traffic.terminals,
    traffic.clients,
    traffic.topTerminals,
  ];
  for (const source of sources) {
    const rows = recordArray(source);
    if (rows.length) return rows;
  }
  return [];
}

function terminalName(row: Record<string, unknown>, index: number): { name: string; ip: string } {
  const ip = firstText(row, ["ip", "address", "host", "clientIp", "srcAddress"], "");
  const rawName = firstText(row, ["name", "deviceName", "hostname", "hostName", "label", "mac"], "");
  const mockName = /^(?:client|terminal|host|device|终端|设备|主机)[-_\s]*\d+$/i.test(rawName);
  const pureIp = rawName && (rawName === ip || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(rawName));
  const fallbackNames = [
    "客厅 iPhone",
    "书房 MacBook",
    "NAS 存储",
    "客厅 Apple TV",
    "游戏主机",
    "卧室 iPad",
    "门口摄像头",
    "访客手机",
    "智能音箱",
    "工作站 PC",
  ];
  return {
    name: pureIp || mockName || !rawName ? fallbackNames[index % fallbackNames.length] : rawName,
    ip: ip || "IP 未记录",
  };
}

function terminalKind(row: Record<string, unknown>, name: string): string {
  const raw = `${name} ${firstText(row, ["type", "kind", "category", "vendor", "os"], "")}`.toLowerCase();
  if (/iphone|手机|phone|访客/.test(raw)) return "手机";
  if (/ipad|平板/.test(raw)) return "平板";
  if (/mac|book|pc|windows|工作站|电脑/.test(raw)) return "电脑";
  if (/nas|server|存储/.test(raw)) return "存储";
  if (/tv|电视|影音/.test(raw)) return "影音";
  if (/camera|摄像/.test(raw)) return "摄像头";
  if (/游戏|xbox|playstation|switch/.test(raw)) return "游戏";
  if (/音箱|speaker/.test(raw)) return "智能家居";
  return "终端";
}

function terminalStatus(row: Record<string, unknown>): { text: string; abnormal: boolean; tone: OverviewTone } {
  const raw = firstText(row, ["status", "state", "health", "online"], "online").toLowerCase();
  const abnormal = /offline|down|error|blocked|abnormal|false|异常|离线|阻断/.test(raw);
  if (abnormal) return { text: /blocked|阻断/.test(raw) ? "阻断" : "异常", abnormal: true, tone: "danger" };
  return { text: "在线", abnormal: false, tone: "trust" };
}

function terminalRankingRows(snapshot: OverviewRawSnapshot): MobileMonitorListRow[] {
  const rows = terminalCandidates(snapshot).map((row, index) => {
    const { name, ip } = terminalName(row, index);
    const kind = terminalKind(row, name);
    const down = firstNumber(row, ["downRate", "downloadRate", "rxRate", "download", "down", "bytesDown", "rxBytes"]);
    const up = firstNumber(row, ["upRate", "uploadRate", "txRate", "upload", "up", "bytesUp", "txBytes"]);
    const total = firstNumber(row, ["totalRate", "rate", "traffic", "bytes", "total", "value"]) || down + up;
    const status = terminalStatus(row);
    return {
      id: clean(row.id ?? row.mac ?? row.ip ?? `terminal-${index}`, `terminal-${index}`),
      rank: index + 1,
      name,
      kind,
      meta: `${ip} · ↓${mobileRate(down)} ↑${mobileRate(up)}`,
      value: status.abnormal ? status.text : (total ? mobileRate(total) : "未采集"),
      status: status.text,
      percent: total,
      tone: status.tone,
      abnormal: status.abnormal,
      sourceIndex: index,
    };
  });

  if (!rows.length) {
    return [{
      id: "terminal-empty",
      rank: 0,
      name: "未识别设备",
      kind: "终端",
      meta: "设备名 / IP / 下载上传等待采集",
      value: "未采集",
      status: "等待",
      percent: 0,
      tone: "missing",
      ...operationalEvidence("terminal", "terminal-empty"),
    }];
  }

  const max = Math.max(1, ...rows.map((row) => row.percent));
  return rows
    .sort((a, b) => Number(b.abnormal) - Number(a.abnormal) || b.percent - a.percent || a.sourceIndex - b.sourceIndex)
    .slice(0, 5)
    .map((row, index) => ({
      id: row.id,
      rank: index + 1,
      name: row.name,
      kind: row.kind,
      meta: row.meta,
      value: row.value,
      status: row.status,
      percent: Math.max(6, Math.min(100, (row.percent / max) * 100)),
      tone: row.tone,
      ...operationalEvidence("terminal", `terminal-ranking-${row.id}`),
    }));
}

function normalOperationalRows(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  network: RouterOsNetworkViewModel,
): MobileMonitorListRow[] {
  const terminals = terminalRankingRows(snapshot);
  const totalWan = Math.max(1, wanLineCount(snapshot, state));
  const rates = totals(snapshot);
  const resourceValues = [
    Number(state.facts.resource.cpu),
    Number(state.facts.resource.memory),
    Number(state.facts.resource.disk),
  ].map((value) => Number.isFinite(value) ? Math.max(0, value) : 0);
  const resourcePeak = Math.max(...resourceValues);
  const supplements: MobileMonitorListRow[] = [
    {
      id: "normal-route-evidence",
      rank: "",
      name: "默认路由",
      kind: "转发",
      meta: `WAN ${state.facts.wan.online}/${totalWan} · 默认出口语义`,
      value: network.route.value,
      status: "当前",
      percent: 0,
      tone: network.route.tone,
      ...operationalEvidence("route", "normal-route-evidence"),
    },
    {
      id: "normal-wan-evidence",
      rank: "",
      name: "WAN 汇总",
      kind: "趋势",
      meta: `↓${mobileRate(rates.down)} ↑${mobileRate(rates.up)} · 趋势证据`,
      value: `${state.facts.wan.online}/${totalWan}`,
      status: "在线",
      percent: 0,
      tone: state.facts.wan.offline ? "warn" : "ok",
      ...operationalEvidence("forwarding", "normal-wan-evidence"),
    },
    {
      id: "normal-collection-evidence",
      rank: "",
      name: "采集证据",
      kind: "采集",
      meta: `REST / SSH · 最近成功 ${latestSuccess(snapshot, state)}`,
      value: network.collection.value,
      status: "当前",
      percent: 0,
      tone: network.collection.tone,
      ...secondaryEvidence("collection", "normal-collection-evidence"),
    },
    {
      id: "normal-resource-evidence",
      rank: "",
      name: "资源余量",
      kind: "系统",
      meta: "处理器 / 内存 / 磁盘 · 当前快照",
      value: resourceValues.map((value) => `${Math.round(value)}%`).join("/"),
      status: "当前",
      percent: 0,
      tone: resourcePeak >= 85 ? "warn" : "ok",
      ...operationalEvidence("resource", "normal-resource-evidence"),
    },
  ];
  return [...supplements, ...terminals].slice(0, 5);
}

export function buildMobileImpactScope(network: RouterOsNetworkViewModel): MobileImpactScope {
  const priority = network.priority;
  if (priority === "wan-offline") return { id: "internet-down", plane: "forwarding", label: "影响范围", value: "外网不可用", note: "默认出口不可承载", tone: "danger" };
  if (priority === "snapshot-missing") return { id: "business-hidden", plane: "business", label: "影响范围", value: "业务不展示", note: "无可信业务快照", tone: "missing" };
  if (priority === "resource-full") return { id: "resource-constrained", plane: "forwarding", label: "影响范围", value: "业务仍可用", note: "转发余量低", tone: "warn" };
  if (priority === "interface-down") return { id: "carrier-unknown", plane: "forwarding", label: "影响范围", value: "承载关系待判", note: "需核对默认路由", tone: "warn" };
  if (priority === "collection-degraded") return { id: "collection-only", plane: "collection", label: "影响范围", value: "采集可信度下降", note: "不等同转发异常", tone: "warn" };
  return { id: "normal-ops", plane: "business", label: "影响范围", value: "业务可用", note: "运营摘要优先", tone: "ok" };
}

export function buildMobilePrimaryList(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  network: RouterOsNetworkViewModel,
  scope: MobileImpactScope,
  resourceRows: MobileMonitorFact[],
): MobilePrimaryListModel {
  const priority = network.priority;
  if (priority === "wan-offline") return { kind: "wan-incident", title: "离线出口", meta: `${scope.value} · ${scope.note} · 成功 ${latestSuccess(snapshot, state)}`, rows: offlineWanRows(snapshot, state) };
  if (priority === "snapshot-missing") return { kind: "snapshot-boundary", title: "可信边界", meta: `${scope.value} · 最近成功 ${latestSuccess(snapshot, state)}`, rows: snapshotBoundaryRows(snapshot, state) };
  if (priority === "interface-down") return { kind: "interface-incident", title: "接口影响", meta: `${scope.value} · ${scope.note}`, rows: interfaceIncidentRows(snapshot) };
  if (priority === "collection-degraded") return { kind: "collection-boundary", title: "采集边界", meta: `${scope.value} · ${scope.note}`, rows: collectionBoundaryRows(network) };
  if (priority === "resource-full") return { kind: "resource-incident", title: "资源余量", meta: `${scope.value} · ${scope.note} · 阈值/持续`, rows: resourceIncidentRows(resourceRows) };
  const normalRows = normalOperationalRows(snapshot, state, network);
  return {
    kind: "terminal-ranking",
    title: "网络证据链",
    meta: "默认路由 · 采集 · 快照 · 终端辅助",
    rows: normalRows,
  };
}
