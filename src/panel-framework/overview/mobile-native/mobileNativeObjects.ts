import { formatRate, shortTimestamp, type OverviewRawSnapshot, type OverviewTone } from "../index";
import type { MobileFocusContext } from "./mobileNativeContext";
import {
  channelAttemptAndSuccessNote,
  clean,
  finiteObservation,
  routeRows,
  resourceSamples,
  successfulBusinessLabel,
  wanRows,
} from "./mobileNativeEvidence";
import { compactMessage } from "./mobileNativeText";
import type { MobileNativeInspection, MobileRiskKey } from "./mobileNativeTypes";

type WanEvidenceRow = ReturnType<typeof wanRows>[number];
type InterfaceEvidenceRow = NonNullable<OverviewRawSnapshot["interfaces"]>[number];

export function evidenceObjectId(prefix: "wan" | "interface", label: string, index: number): string {
  return `${prefix}:${index}:${label}`;
}

export function downInterfaces(snapshot: OverviewRawSnapshot): InterfaceEvidenceRow[] {
  return (snapshot.interfaces || []).filter((row) => row.running === false).slice(0, 10);
}

export function offlineWans(snapshot: OverviewRawSnapshot): WanEvidenceRow[] {
  return wanRows(snapshot).filter((row) => row.running === false).slice(0, 10);
}

function inspectionChannelTone(status: string): OverviewTone {
  if (status === "current") return "trust";
  if (status === "unavailable") return "missing";
  return status === "failed" ? "danger" : "warn";
}

function routeInspection(context: MobileFocusContext): MobileNativeInspection {
  const { snapshot, mode, verification, route } = context;
  const carrier = wanRows(snapshot).find((row) => row.running !== false && row.disabled !== true);
  const routes = routeRows(snapshot);
  const routeCount = routes.length;
  const routeIndex = route ? routes.indexOf(route) : -1;
  const available = mode !== "unavailable" && Boolean(route);
  return {
    key: "route",
    objectId: available ? `route:${routeIndex}:${clean(route?.table || route?.routingTable, "main")}` : "route:unverified",
    objectPosition: available ? "已筛选活动默认路由" : "没有可选择对象",
    label: "默认路由",
    title: available ? clean(route?.gateway || route?.gatewayStatus, "活动默认路由") : "默认路由证据源",
    status: verification === "verified" ? "当前活动记录" : verification === "historical" ? "历史活动记录" : "未核实",
    tone: verification === "verified" ? "trust" : "warn",
    note: available ? "以下字段来自明确的默认路由记录" : "检查记录来源与筛选条件，不使用首行兜底",
    sourcePath: routeIndex >= 0 ? `routes.defaultRoutes[${routeIndex}]` : "routes.defaultRoutes",
    observedAt: shortTimestamp(snapshot.updatedAt),
    relations: available ? [
      { label: "路由表", value: clean(route?.table || route?.routingTable, "main") },
      { label: "网关", value: clean(route?.gateway || route?.gatewayStatus) },
      { label: "distance", value: clean(route?.distance) },
    ] : [
      { label: "记录来源", value: "routes.defaultRoutes" },
      { label: "记录数量", value: `${routeCount} 条` },
      { label: "核验条件", value: "active=true 且未停用" },
    ],
    rows: available ? [
      { key: "route-flags", label: "原始标记", value: "active=true · disabled=false" },
      { key: "route-carrier", label: "关联出口", value: clean(carrier?.name || carrier?.interface, "采集未覆盖") },
      { key: "route-source", label: "证据来源", value: "默认路由记录" },
    ] : [
      { key: "route-boundary", label: "判断边界", value: "没有明确活动记录", note: "不推断默认出口" },
    ],
    detailRows: available ? [
      { key: "route-raw-table", label: "table", value: clean(route?.table || route?.routingTable, "采集未覆盖") },
      { key: "route-raw-gateway", label: "gateway", value: clean(route?.gateway || route?.gatewayStatus, "采集未覆盖") },
      { key: "route-raw-distance", label: "distance", value: clean(route?.distance, "采集未覆盖") },
      { key: "route-raw-flags", label: "active / disabled", value: `${route?.active === true} / ${route?.disabled === true}` },
    ] : [
      { key: "route-source-empty", label: "筛选条件", value: "active=true 且 disabled!=true" },
      { key: "route-count-empty", label: "候选记录", value: `${routeCount} 条` },
    ],
    disclosureTitle: "展开路由字段",
    actionTitle: "查看默认路由证据详情",
  };
}

function wanInspection(context: MobileFocusContext, selected?: WanEvidenceRow, index = 0, total = selected ? 1 : 0): MobileNativeInspection {
  const { snapshot, mode, verification } = context;
  const fallback = wanRows(snapshot).find((row) => row.running === false) || wanRows(snapshot).find((row) => row.running !== false && row.disabled !== true);
  const object = selected || fallback;
  const label = clean(object?.name || object?.interface, `WAN ${index + 1}`);
  const available = mode !== "unavailable" && Boolean(object);
  const sourceCollection = Array.isArray(snapshot.wan) && snapshot.wan.length ? "wan" : "pppoe";
  const sourceRows = sourceCollection === "wan" ? snapshot.wan || [] : snapshot.pppoe || [];
  const sourceIndex = object ? sourceRows.indexOf(object) : -1;
  const down = finiteObservation(object?.downRate);
  const up = finiteObservation(object?.upRate);
  return {
    key: "wan",
    objectId: available ? evidenceObjectId("wan", label, index) : "wan:unavailable",
    objectPosition: total > 0 ? `对象 ${index + 1} / ${total}` : "没有可选择对象",
    label: "WAN 对象",
    title: available ? label : "WAN 对象证据源",
    status: available ? object?.running === false ? mode === "current" ? "未运行对象" : "历史离线记录" : "运行对象" : "无当前对象证据",
    tone: available && object?.running === false ? mode === "current" ? "danger" : "warn" : available ? "trust" : "warn",
    note: available ? "对象关系用于下一步检查，不代表业务影响" : "保留对象不进入当前判断",
    sourcePath: available && sourceIndex >= 0 ? `${sourceCollection}[${sourceIndex}]` : sourceCollection,
    observedAt: shortTimestamp(snapshot.updatedAt),
    relations: available ? [
      { label: "父接口", value: clean(object?.parent, "采集未覆盖") },
      { label: "接入类型", value: clean(object?.access || object?.kind, "采集未覆盖") },
      { label: "路由后果", value: verification === "offline" ? "没有活动默认路由" : verification === "verified" ? "活动路由仍有记录" : "无法核实" },
    ] : [
      { label: "记录来源", value: "wan / pppoe" },
      { label: "可用性", value: "不用于当前判断" },
    ],
    rows: available ? [
      { key: "wan-source", label: "对象来源", value: sourceCollection },
      { key: "wan-disabled", label: "停用标记", value: object?.disabled === true ? "disabled=true" : "disabled=false" },
      { key: "wan-impact", label: "影响边界", value: "未直接证明业务中断" },
    ] : [],
    detailRows: available ? [
      { key: "wan-raw-name", label: "name / interface", value: label },
      { key: "wan-raw-running", label: "running / disabled", value: `${object?.running === true} / ${object?.disabled === true}` },
      { key: "wan-raw-parent", label: "parent", value: clean(object?.parent, "采集未覆盖") },
      { key: "wan-raw-rate", label: "down-rate / up-rate", value: mode === "current" && down !== null && up !== null ? `${formatRate(down)} / ${formatRate(up)}` : "非完整当前观测" },
    ] : [
      { key: "wan-source-empty", label: "对象来源", value: sourceCollection },
      { key: "wan-boundary-empty", label: "可用性", value: "无当前对象证据" },
    ],
    disclosureTitle: "展开 WAN 依赖",
    actionTitle: "查看 WAN 证据详情",
  };
}

function collectionInspection(context: MobileFocusContext): MobileNativeInspection {
  const { snapshot, channels, state } = context;
  const selectedName = channels.rest.status !== "current" ? "REST" : channels.ssh.status !== "current" ? "SSH" : "采集";
  const selected = selectedName === "REST" ? channels.rest : selectedName === "SSH" ? channels.ssh : null;
  const target = clean(snapshot.meta?.routerHost || snapshot.meta?.target, "未记录");
  return {
    key: "collection",
    objectId: `collection:${selectedName.toLowerCase()}`,
    objectPosition: selected ? `${selectedName} 通道` : "REST + SSH 通道",
    label: "采集通道",
    title: selectedName === "采集" ? "采集证据源" : `${selectedName} 采集通道`,
    status: selected ? "检查错误与时间边界" : "通道记录可用",
    tone: selected ? inspectionChannelTone(selected.status) : "trust",
    note: "通道摘要已在信号区；此处只补充来源、时间与错误记录",
    sourcePath: selectedName === "REST" ? "meta.realtime / meta.slowRest" : selectedName === "SSH" ? "meta.static" : "meta.realtime + meta.static",
    observedAt: shortTimestamp(snapshot.updatedAt),
    relations: [
      { label: "配置目标", value: target },
      { label: "最近尝试", value: shortTimestamp(snapshot.updatedAt) },
      { label: "明确成功", value: selected?.successAt ? shortTimestamp(selected.successAt) : successfulBusinessLabel(snapshot) },
    ],
    rows: [
      { key: "collection-source", label: "采集来源", value: selectedName === "REST" ? "realtime / slow REST" : selectedName === "SSH" ? "static SSH" : "REST + SSH" },
      { key: "collection-error", label: "错误记录", value: selected?.error ? compactMessage(selected.error) : "未记录", note: selected ? channelAttemptAndSuccessNote(selected) : undefined, tone: selected?.error ? "warn" : "trust" },
      { key: "collection-endpoints", label: "端点记录", value: state.facts.failures.count ? `${state.facts.failures.count} 个失败项` : "未记录", note: "未记录不等于没有故障" },
    ],
    detailRows: [
      { key: "collection-raw-target", label: "routerHost / target", value: target },
      { key: "collection-raw-status", label: "channel status", value: selected?.status || "current" },
      { key: "collection-raw-success", label: "successAt", value: selected?.successAt ? shortTimestamp(selected.successAt) : successfulBusinessLabel(snapshot) },
      { key: "collection-raw-error", label: "error", value: selected?.error ? compactMessage(selected.error) : "未记录" },
    ],
    disclosureTitle: "展开通道来源与错误",
    actionTitle: "查看采集证据详情",
  };
}

function resourceInspection(context: MobileFocusContext): MobileNativeInspection {
  const { snapshot, mode } = context;
  const samples = resourceSamples(snapshot);
  return {
    key: "resource",
    objectId: "resource:system",
    objectPosition: "系统资源对象",
    label: "系统资源",
    title: "系统资源",
    status: mode === "current" ? "当前采样对象" : "历史采样对象",
    tone: mode === "current" ? "danger" : "warn",
    note: "当前值只在信号区出现；此处补充来源、策略与影响边界",
    sourcePath: "resource + overview.history",
    observedAt: shortTimestamp(snapshot.updatedAt),
    relations: [
      { label: "采样来源", value: "RouterOS resource" },
      { label: "阈值策略", value: "CPU/内存 85% · 磁盘 90%" },
      { label: "影响边界", value: "未证明业务中断" },
    ],
    rows: [
      { key: "resource-series", label: "采样序列", value: "CPU / 内存 / 磁盘" },
      { key: "resource-record", label: "记录位置", value: "overview.history" },
      { key: "resource-consequence", label: "已证实后果", value: "资源策略被触发" },
    ],
    detailRows: [
      { key: "resource-raw-series", label: "series", value: "CPU / memory / disk" },
      { key: "resource-raw-threshold", label: "threshold", value: "85% / 85% / 90%" },
      { key: "resource-raw-observed", label: "observed samples", value: `${samples.observed}` },
      { key: "resource-raw-trailing", label: "trailing breached samples", value: `${samples.trailingStreak}` },
    ],
    disclosureTitle: "展开资源来源与策略",
    actionTitle: "查看资源证据详情",
  };
}

function interfaceInspection(context: MobileFocusContext, selected?: InterfaceEvidenceRow, index = 0, total = selected ? 1 : 0): MobileNativeInspection {
  const { snapshot, mode, verification } = context;
  const object = selected || downInterfaces(snapshot)[0];
  const label = clean(object?.name || object?.interface, `接口 ${index + 1}`);
  const sourceIndex = object ? (snapshot.interfaces || []).indexOf(object) : -1;
  return {
    key: "interface",
    objectId: object ? evidenceObjectId("interface", label, index) : "interface:unavailable",
    objectPosition: total > 0 ? `对象 ${index + 1} / ${total}` : "没有可选择对象",
    label: "接口依赖",
    title: object ? label : "Down 接口",
    status: mode === "current" ? "依赖链待核对" : "历史依赖记录",
    tone: mode === "current" ? "danger" : "warn",
    note: "接口状态已在信号区；此处补充父级、VLAN、PPPoE 与路由关系",
    sourcePath: sourceIndex >= 0 ? `interfaces[${sourceIndex}]` : "interfaces",
    observedAt: shortTimestamp(snapshot.updatedAt),
    relations: [
      { label: "父接口", value: clean(object?.parent || object?.master, "采集未覆盖") },
      { label: "VLAN", value: clean(object?.vlan || object?.vlanId, "采集未覆盖") },
      { label: "PPPoE", value: clean(object?.pppoeOut || object?.pppoe, "采集未覆盖") },
    ],
    rows: [
      { key: "interface-route", label: "默认路由关系", value: verification === "verified" ? "活动路由仍有记录" : verification === "offline" ? "没有活动默认路由" : "无法核实" },
      { key: "interface-source", label: "对象来源", value: "interfaces" },
      { key: "interface-impact", label: "业务影响", value: "未直接证明", note: "依赖与实际影响分别核对" },
    ],
    detailRows: [
      { key: "interface-raw-name", label: "name / interface", value: label },
      { key: "interface-raw-running", label: "running / disabled", value: `${object?.running === true} / ${object?.disabled === true}` },
      { key: "interface-raw-parent", label: "parent / master", value: clean(object?.parent || object?.master, "采集未覆盖") },
      { key: "interface-raw-link", label: "vlan / pppoe", value: `${clean(object?.vlan || object?.vlanId, "采集未覆盖")} / ${clean(object?.pppoeOut || object?.pppoe, "采集未覆盖")}` },
    ],
    disclosureTitle: "展开接口依赖",
    actionTitle: "查看接口证据详情",
  };
}

export function buildFocusInspection(risk: MobileRiskKey | null, context: MobileFocusContext): MobileNativeInspection {
  if (risk === "evidence" || risk === "collection") return collectionInspection(context);
  if (risk === "wan-offline") return wanInspection(context);
  if (risk === "resource") return resourceInspection(context);
  if (risk === "interfaces") return interfaceInspection(context);
  return routeInspection(context);
}

export function buildObjectInspections(risk: MobileRiskKey | null, context: MobileFocusContext): MobileNativeInspection[] {
  if (risk === "interfaces") {
    const rows = downInterfaces(context.snapshot);
    return rows.map((row, index) => interfaceInspection(context, row, index, rows.length));
  }
  if (risk === "wan-offline") {
    const rows = offlineWans(context.snapshot);
    return rows.map((row, index) => wanInspection(context, row, index, rows.length));
  }
  return [];
}
