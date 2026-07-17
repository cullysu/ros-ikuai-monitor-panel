import {
  isSnapshotUnavailable,
  latestBusinessSuccessTime,
  shortTimestamp,
  type OverviewDerivedState,
  type OverviewRawRoute,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
  type OverviewTone,
} from "../index";
import { panelObjectIdentityPartsForRaw, stablePanelObjectId } from "../../sections/panelObjectIdentity";
import {
  buildResourceInstrument,
  buildTrafficInstrument,
  CPU_THRESHOLD,
  DISK_THRESHOLD,
  MEMORY_THRESHOLD,
} from "./buildOverviewInstruments";
import type {
  OverviewEvidenceMode,
  OverviewEvidenceRow,
  OverviewEvidenceFact,
  OverviewEvidenceModel,
  OverviewEvidenceRisk,
  OverviewFocusObject,
  OverviewPriorityObject,
} from "./overviewEvidenceTypes";

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

function evidenceMode(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): OverviewEvidenceMode {
  if (isSnapshotUnavailable(snapshot) || state.facts.freshness.credibility === "unavailable") return "unavailable";
  if (!latestBusinessSuccessTime(snapshot)) return "unavailable";
  const meta = snapshot.meta || {};
  if (
    meta.clientEvidenceBoundary ||
    meta.realtimeError ||
    meta.slowRestError ||
    meta.staticError ||
    meta.connectionDetailError ||
    meta.connectionProtocolError ||
    state.facts.collection.channelDegraded ||
    state.facts.failures.count > 0 ||
    state.facts.freshness.stale ||
    state.facts.freshness.history ||
    state.facts.freshness.credibility === "cache"
  ) return "historical";
  return "current";
}

function evidenceBoundary(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, mode: OverviewEvidenceMode) {
  const successfulAt = latestBusinessSuccessTime(snapshot);
  const successLabel = successfulAt ? shortTimestamp(successfulAt) : "成功时间未记录";
  if (mode === "current") return {
    label: "当前证据",
    time: successLabel,
    note: "业务采样完整",
    tone: "trust" as OverviewTone,
  };
  if (mode === "historical") return {
    label: "历史证据",
    time: successLabel === "成功时间未记录" ? successLabel : `上次成功 ${successLabel}`,
    note: "当前变化不可见",
    tone: "warn" as OverviewTone,
  };
  return {
    label: "证据不可用",
    time: successLabel,
    note: "不作当前业务判断",
    tone: "danger" as OverviewTone,
  };
}

function deviceIdentity(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, mode: OverviewEvidenceMode) {
  const target = clean(snapshot.meta?.routerHost || snapshot.meta?.target, "");
  const device = clean(snapshot.meta?.configuredIdentity || state.facts.device.identity || target, "RouterOS");
  const version = mode === "unavailable" || state.facts.device.version === "-" ? "" : `RouterOS ${state.facts.device.version}`;
  return { device, note: [version, target ? `目标 ${target}` : ""].filter(Boolean).join(" · ") };
}

function routeStatus(mode: OverviewEvidenceMode, state: OverviewDerivedState, route: OverviewRawRoute | null) {
  if (mode !== "current") return "unknown" as const;
  if (route) return "verified" as const;
  if (state.facts.wan.allOffline) return "offline" as const;
  return "unknown" as const;
}

function resourceSampleStats(snapshot: OverviewRawSnapshot) {
  const history = snapshot.overview?.history || {};
  const series = [history.cpu, history.memory, history.disk].map((value) => Array.isArray(value) ? value : []);
  const total = Math.max(...series.map((values) => values.length), 0);
  const observed: Array<boolean | null> = [];
  for (let index = 0; index < total; index += 1) {
    const cpu = finite(series[0][index]);
    const memory = finite(series[1][index]);
    const disk = finite(series[2][index]);
    if (cpu === null && memory === null && disk === null) {
      observed.push(null);
      continue;
    }
    observed.push(
      (cpu !== null && cpu >= CPU_THRESHOLD) ||
      (memory !== null && memory >= MEMORY_THRESHOLD) ||
      (disk !== null && disk >= DISK_THRESHOLD),
    );
  }
  let trailing = 0;
  for (let index = observed.length - 1; index >= 0 && observed[index] === true; index -= 1) trailing += 1;
  return {
    observed: observed.filter((value) => value !== null).length,
    exceeded: observed.filter((value) => value === true).length,
    trailing,
  };
}

function riskOf(mode: OverviewEvidenceMode, state: OverviewDerivedState, route: OverviewRawRoute | null): OverviewEvidenceRisk {
  if (mode === "unavailable") return "evidence";
  if (mode === "historical") return "collection";
  if (state.facts.wan.allOffline) return "wan";
  if (state.facts.resource.level === "danger") return "resource";
  if (state.facts.interfaces.down > 0) return "interfaces";
  if (!route) return "route";
  return "none";
}

function fact(key: string, label: string, value: string, tone: OverviewTone, note = ""): OverviewEvidenceFact {
  return { key, label, value, tone, ...(note ? { note } : {}) };
}

function factsFor(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  mode: OverviewEvidenceMode,
  risk: OverviewEvidenceRisk,
  route: OverviewRawRoute | null,
): [OverviewEvidenceFact, OverviewEvidenceFact, OverviewEvidenceFact] {
  const rest = state.facts.collection.rest;
  const ssh = state.facts.collection.ssh;
  const routeVerified = mode === "current" && Boolean(route);
  const targetKnown = Boolean(snapshot.meta?.routerHost || snapshot.meta?.target || snapshot.meta?.configuredIdentity);
  const success = latestBusinessSuccessTime(snapshot);

  if (risk === "evidence") return [
    fact("snapshot", "当前快照", "不可用", "danger", "业务数字已隐藏"),
    fact("target", "配置目标", targetKnown ? "已识别" : "未记录", targetKnown ? "trust" : "missing", "身份独立于快照"),
    fact("last-success", "最近成功", success ? shortTimestamp(success) : "未记录", success ? "warn" : "missing", success ? "仅作历史参考" : "不回退尝试时间"),
  ];
  if (risk === "collection") return [
    fact(
      "collection-channels",
      "上次通道记录",
      `${(rest.status === "current" ? 1 : 0) + (ssh.status === "current" ? 1 : 0)} / 2`,
      rest.status === "current" || ssh.status === "current" ? "warn" : "danger",
      "仅作历史对照",
    ),
    fact("last-success", "最近成功", success ? shortTimestamp(success) : "未记录", success ? "warn" : "missing", "不代表当前状态"),
    fact(
      "failed-endpoints",
      "失败端点",
      state.facts.failures.count ? `已记录 ${state.facts.failures.count}` : "未记录",
      state.facts.failures.count ? "warn" : "missing",
      "未记录不等于没有故障",
    ),
  ];
  if (risk === "wan") return [
    fact("wan", "WAN 运行", `0 / ${state.facts.wan.total}`, "danger", "当前对象"),
    fact("route", "活动默认路由", "0", "danger", "没有明确活动记录"),
    fact("collection", "采集通道", `${(rest.status === "current" ? 1 : 0) + (ssh.status === "current" ? 1 : 0)} / 2`, "trust", "REST + SSH"),
  ];
  if (risk === "resource") {
    const samples = resourceSampleStats(snapshot);
    const observedResources: Array<{ value: number; threshold: number }> = [];
    if (state.facts.resource.cpu !== null) observedResources.push({ value: state.facts.resource.cpu, threshold: CPU_THRESHOLD });
    if (state.facts.resource.memory !== null) observedResources.push({ value: state.facts.resource.memory, threshold: MEMORY_THRESHOLD });
    if (state.facts.resource.disk !== null) observedResources.push({ value: state.facts.resource.disk, threshold: DISK_THRESHOLD });
    const breached = observedResources.filter((metric) => metric.value >= metric.threshold).length;
    return [
      fact("resource-breaches", "超阈值", `${breached} / ${observedResources.length}`, breached ? "danger" : "trust", `已观测 ${observedResources.length}/3`),
      fact("resource-trailing", "尾部连续", samples.observed ? `${samples.trailing} 个` : "未取得", samples.trailing ? "danger" : "missing", "不是超限总数"),
      fact("resource-samples", "有效样本", samples.observed ? `${samples.observed} 个` : "未取得", samples.observed ? "trust" : "missing", "当前采样序列"),
    ];
  }
  if (risk === "interfaces") return [
    fact("interfaces", "接口 Down", `${state.facts.interfaces.down} / ${state.facts.interfaces.total}`, "danger", "当前对象"),
    fact("route", "默认路由", routeVerified ? "已核实" : "无法核实", routeVerified ? "trust" : "warn", routeVerified ? "明确活动记录" : "无明确活动记录"),
    fact("wan", "WAN 范围", `${state.facts.wan.online} / ${state.facts.wan.total}`, state.facts.wan.online ? "trust" : "danger", "运行对象"),
  ];
  if (risk === "route") return [
    fact("route", "默认路由", "无法核实", "warn", "无明确活动记录"),
    fact("wan", "WAN 运行", `${state.facts.wan.online} / ${state.facts.wan.total}`, state.facts.wan.online ? "trust" : "warn", "对象状态"),
    fact("collection", "采集通道", `${(rest.status === "current" ? 1 : 0) + (ssh.status === "current" ? 1 : 0)} / 2`, "trust", "REST + SSH"),
  ];
  if (state.scale === "fleet") {
    const runningInterfaces = state.facts.interfaces.online;
    return [
      fact("route", "默认路由", "已核实", "trust", "明确活动记录"),
      fact("wan", "WAN 运行", `${state.facts.wan.online} / ${state.facts.wan.total}`, "trust", "多对象范围"),
      fact("interfaces", "接口运行", `${runningInterfaces} / ${state.facts.interfaces.total}`, "trust", "本次采样"),
    ];
  }
  return [
    fact("route", "默认路由", "已核实", "trust", "明确活动记录"),
    fact("wan", "WAN 运行", `${state.facts.wan.online} / ${state.facts.wan.total}`, "trust", "当前对象"),
    fact("collection", "采集通道", `${(rest.status === "current" ? 1 : 0) + (ssh.status === "current" ? 1 : 0)} / 2`, "trust", "REST + SSH"),
  ];
}

function verdictFor(state: OverviewDerivedState, mode: OverviewEvidenceMode, risk: OverviewEvidenceRisk, route: OverviewRawRoute | null) {
  if (risk === "evidence") return { label: "判断边界", title: "当前业务状态不可判断", summary: "没有可用于当前判断的业务快照。", tone: "danger" as OverviewTone };
  if (risk === "collection") {
    return { label: "证据已降级", title: "当前采集状态不可确认", summary: "仅保留上次成功记录；不代表当前业务。", tone: "warn" as OverviewTone };
  }
  if (risk === "wan") return { label: "出口中断", title: `全部 ${state.facts.wan.total} 条 WAN 未运行`, summary: "无活动默认路由；先查链路、认证与上游。", tone: "danger" as OverviewTone };
  if (risk === "resource") return { label: "资源压力", title: "资源策略已触发", summary: "资源超限已持续；不推断网络中断。", tone: "danger" as OverviewTone };
  if (risk === "interfaces") return { label: "转发对象异常", title: `${state.facts.interfaces.down} 个接口未运行`, summary: route ? "默认路由仍有记录；先核对 Down 接口。" : "当前证据无法核实默认路由。", tone: "danger" as OverviewTone };
  if (risk === "route") return { label: "出口证据不完整", title: "默认路由无法核实", summary: "WAN 有记录；无明确活动默认路由。", tone: "warn" as OverviewTone };
  return {
    label: state.scale === "fleet" ? "多对象巡检" : "当前运行判断",
    title: "出口路径已核实",
    summary: "默认路由与 WAN 一致；未探测外部业务。",
    tone: "trust" as OverviewTone,
  };
}

function collectionObjects(state: OverviewDerivedState): OverviewPriorityObject[] {
  const channels = [
    { key: "rest", name: "REST", channel: state.facts.collection.rest, source: "meta.realtime + meta.slowRest" },
    { key: "ssh", name: "SSH", channel: state.facts.collection.ssh, source: "meta.static" },
  ];
  const rows = channels.filter(({ channel }) => channel.status !== "current").map(({ key, name, channel, source }) => ({
    id: `collection:${key}`,
    category: "采集通道",
    name,
    state: channel.label,
    reason: channel.error ? clean(channel.error) : "没有明确成功记录",
    tone: channel.status === "unavailable" ? "missing" as OverviewTone : "danger" as OverviewTone,
    route: "readonlyDiagnostics" as const,
    sourcePath: source,
    attributes: [
      { label: "通道状态", value: channel.label },
      { label: "最近成功", value: channel.successAt ? shortTimestamp(channel.successAt) : "未记录" },
      { label: "错误记录", value: channel.error ? clean(channel.error) : "未记录" },
    ],
  }));
  return rows.length ? rows : [{
    id: "collection:boundary",
    category: "证据边界",
    name: "业务快照",
    state: "历史",
    reason: "客户端已停止当前状态声明",
    tone: "warn",
    route: "readonlyDiagnostics",
    sourcePath: "meta.clientEvidenceBoundary",
    attributes: [
      { label: "REST", value: state.facts.collection.rest.label },
      { label: "SSH", value: state.facts.collection.ssh.label },
      { label: "业务证据", value: "仅作历史参考" },
    ],
  }];
}

function priorityObjectsFor(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  risk: OverviewEvidenceRisk,
): { total: number; rows: OverviewPriorityObject[] } {
  if (risk === "evidence" || risk === "collection") {
    const rows = collectionObjects(state);
    return { total: rows.length, rows };
  }
  if (risk === "wan") {
    const rows = wanRows(snapshot).filter((row) => row.running === false);
    return {
      total: rows.length,
      rows: rows.map((row, index) => ({
        id: stablePanelObjectId("lineStatus", "wan", panelObjectIdentityPartsForRaw("lineStatus", "WAN 对象", row)),
        category: "WAN",
        name: clean(row.name || row.interface, `WAN ${index + 1}`),
        state: "未运行",
        reason: `${clean(row.parent, "父接口未记录")} · 无活动默认路由`,
        tone: "danger",
        route: "lineStatus",
        targetObjectId: stablePanelObjectId("lineStatus", "wan", panelObjectIdentityPartsForRaw("lineStatus", "WAN 对象", row)),
        sourcePath: `wan[${index}]`,
        attributes: [
          { label: "父接口", value: clean(row.parent) },
          { label: "接入方式", value: clean(row.access) },
          { label: "地址", value: clean(row.address) },
        ],
      })),
    };
  }
  if (risk === "interfaces") {
    const rows = (snapshot.interfaces || []).filter((row) => row.running === false);
    return {
      total: rows.length,
      rows: rows.map((row, index) => ({
        id: stablePanelObjectId("interfaces", "interface", panelObjectIdentityPartsForRaw("interfaces", "接口对象", row)),
        category: "接口",
        name: clean(row.name || row.interface, `接口 ${index + 1}`),
        state: row.disabled === true ? "已停用" : "未运行",
        reason: `${clean(row.parent || row.master, "父级未记录")} · 依赖关系待核对`,
        tone: "danger",
        route: "interfaces",
        targetObjectId: stablePanelObjectId("interfaces", "interface", panelObjectIdentityPartsForRaw("interfaces", "接口对象", row)),
        sourcePath: `interfaces[${(snapshot.interfaces || []).indexOf(row)}]`,
        attributes: [
          { label: "父级", value: clean(row.parent || row.master) },
          { label: "类型", value: clean(row.type || row.role) },
          { label: "VLAN", value: clean(row.vlan || row.vlanId) },
        ],
      })),
    };
  }
  if (risk === "resource") {
    const samples = resourceSampleStats(snapshot);
    const observedResources: Array<{ key: "cpu" | "memory" | "disk"; label: string; value: number; threshold: number }> = [];
    if (state.facts.resource.cpu !== null) observedResources.push({ key: "cpu", label: "CPU", value: state.facts.resource.cpu, threshold: CPU_THRESHOLD });
    if (state.facts.resource.memory !== null) observedResources.push({ key: "memory", label: "内存", value: state.facts.resource.memory, threshold: MEMORY_THRESHOLD });
    if (state.facts.resource.disk !== null) observedResources.push({ key: "disk", label: "磁盘", value: state.facts.resource.disk, threshold: DISK_THRESHOLD });
    const leadingResource = observedResources.sort((left, right) => (right.value / right.threshold) - (left.value / left.threshold))[0];
    if (!leadingResource) return { total: 0, rows: [] };
    return {
      total: 1,
      rows: [{
        id: "resource:system",
        category: "系统资源",
        name: clean(state.facts.device.identity, "RouterOS"),
        state: samples.trailing ? "持续超限" : "策略命中",
        reason: state.facts.resource.complete
          ? samples.observed ? "检查连接压力、接口吞吐与原始采样" : "检查资源对象与采集完整性"
          : `已观测 ${state.facts.resource.observed}/3；缺失项不按零处理`,
        tone: "danger",
        route: "trafficLoad",
        targetObjectId: stablePanelObjectId("trafficLoad", "resource", panelObjectIdentityPartsForRaw("trafficLoad", "资源证据", { key: leadingResource.key })),
        sourcePath: "overview + overview.history",
        attributes: [
          { label: "连接总量", value: finite(snapshot.connections?.total) === null ? "未记录" : Number(snapshot.connections?.total).toLocaleString("zh-CN") },
          { label: "资源观测", value: `${state.facts.resource.observed} / 3` },
          { label: "有效样本", value: samples.observed ? `${samples.observed} 个` : "未取得" },
        ],
      }],
    };
  }
  if (risk === "route") {
    return {
      total: 1,
      rows: [{
        id: "route:unverified",
        category: "默认路由",
        name: "活动出口",
        state: "未核实",
        reason: "没有 active=true 且未停用的默认路由",
        tone: "warn",
        route: "routes",
        sourcePath: "routes.defaultRoutes",
        attributes: [
          { label: "默认路由记录", value: `${state.facts.route.candidates} 条` },
          { label: "WAN 运行", value: `${state.facts.wan.online} / ${state.facts.wan.total}` },
          { label: "活动标记", value: "未发现 active=true" },
        ],
      }],
    };
  }
  return { total: 0, rows: [] };
}

function focusObjectFor(
  mode: OverviewEvidenceMode,
  risk: OverviewEvidenceRisk,
  route: OverviewRawRoute | null,
): OverviewFocusObject | null {
  if (mode !== "current" || risk !== "none" || !route) return null;
  return {
    id: "route:active-default",
    category: "活动出口",
    name: clean(route.gateway, "网关未记录"),
    note: `${clean(route.dstAddress, "0.0.0.0/0")} · 明确 active=true 且未停用`,
    tone: "trust",
    route: "routes",
    targetObjectId: stablePanelObjectId("routes", "route", panelObjectIdentityPartsForRaw("routes", "路由记录", route)),
    sourcePath: "routes.defaultRoutes",
    attributes: [
      { label: "路由表", value: clean(route.table || route.routingTable, "main") },
      { label: "网关", value: clean(route.gateway) },
      { label: "distance", value: clean(route.distance) },
    ],
  };
}


function evidenceRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): OverviewEvidenceRow[] {
  const target = clean(snapshot.meta?.routerHost || snapshot.meta?.target);
  const success = latestBusinessSuccessTime(snapshot);
  return [
    { key: "target", label: "采集目标", value: target, note: "只读连接", tone: target === "未记录" ? "missing" : "trust" },
    { key: "success", label: "业务成功", value: success ? shortTimestamp(success) : "未记录", note: "不使用尝试时间兜底", tone: success ? "trust" : "missing" },
    { key: "failures", label: "失败端点", value: state.facts.failures.count ? `已记录 ${state.facts.failures.count}` : "未记录", note: "未记录不等于没有故障", tone: state.facts.failures.count ? "warn" : "missing" },
    { key: "boundary", label: "操作边界", value: "只读监控", note: "不会修改 RouterOS 配置", tone: "trust" },
  ];
}

export function buildOverviewEvidenceModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): OverviewEvidenceModel {
  const mode = evidenceMode(snapshot, state);
  const route = state.facts.route.verified ? state.facts.route.selected : null;
  const risk = riskOf(mode, state, route);
  const evidence = evidenceBoundary(snapshot, state, mode);
  const identity = deviceIdentity(snapshot, state, mode);
  const verdict = verdictFor(state, mode, risk, route);
  const priority = priorityObjectsFor(snapshot, state, risk);
  return {
    scenario: state.scenario,
    risk,
    evidenceMode: mode,
    evidenceLabel: evidence.label,
    evidenceTime: evidence.time,
    evidenceNote: evidence.note,
    evidenceTone: evidence.tone,
    device: identity.device,
    deviceNote: identity.note,
    verdictLabel: verdict.label,
    verdictTitle: verdict.title,
    verdictSummary: verdict.summary,
    verdictTone: verdict.tone,
    facts: factsFor(snapshot, state, mode, risk, route),
    priorityLabel: priority.total ? "优先处理" : "",
    priorityObjects: priority.rows.slice(0, 3),
    priorityObjectsAll: priority.rows,
    priorityTotal: priority.total,
    focusObject: focusObjectFor(mode, risk, route),
    traffic: buildTrafficInstrument(snapshot, mode, risk),
    resource: buildResourceInstrument(snapshot, state, risk),
    evidenceRows: evidenceRows(snapshot, state),
  };
}
