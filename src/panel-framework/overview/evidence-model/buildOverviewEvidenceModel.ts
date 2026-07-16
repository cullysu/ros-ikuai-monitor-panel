import {
  formatRate,
  isSnapshotUnavailable,
  latestBusinessSuccessTime,
  shortTimestamp,
  type OverviewDerivedState,
  type OverviewRawRoute,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
  type OverviewTone,
} from "../index";
import type {
  OverviewEvidenceMode,
  OverviewEvidenceRow,
  OverviewEvidenceFact,
  OverviewEvidenceModel,
  OverviewEvidenceRisk,
  OverviewFocusObject,
  OverviewPriorityObject,
  OverviewTrafficInstrument,
  OverviewTrafficPoint,
} from "./overviewEvidenceTypes";

const CPU_THRESHOLD = 85;
const MEMORY_THRESHOLD = 85;
const DISK_THRESHOLD = 90;

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

function defaultRoutes(snapshot: OverviewRawSnapshot): OverviewRawRoute[] {
  if (Array.isArray(snapshot.routes?.defaultRoutes)) return snapshot.routes.defaultRoutes;
  if (!Array.isArray(snapshot.routes?.items)) return [];
  return snapshot.routes.items.filter((route) =>
    route.default === true || route.dstAddress === "0.0.0.0/0" || route.dstAddress === "::/0",
  );
}

function activeDefaultRoute(snapshot: OverviewRawSnapshot): OverviewRawRoute | null {
  return defaultRoutes(snapshot).find((route) => route.active === true && route.disabled !== true) || null;
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
  if (state.facts.wan.total > 0 && state.facts.wan.online === 0) return "offline" as const;
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
  if (state.facts.wan.total > 0 && state.facts.wan.online === 0) return "wan";
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
      "可用通道",
      `${(rest.status === "current" ? 1 : 0) + (ssh.status === "current" ? 1 : 0)} / 2`,
      rest.status === "current" || ssh.status === "current" ? "warn" : "danger",
      "REST + SSH",
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
    const breached = [
      state.facts.resource.cpu >= CPU_THRESHOLD,
      state.facts.resource.memory >= MEMORY_THRESHOLD,
      state.facts.resource.disk >= DISK_THRESHOLD,
    ].filter(Boolean).length;
    return [
      fact("resource-breaches", "超阈值", `${breached} / 3`, breached ? "danger" : "trust", "按资源策略判定"),
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
    const runningInterfaces = Math.max(0, state.facts.interfaces.total - state.facts.interfaces.down);
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
    const partial = state.facts.collection.rest.status === "current" || state.facts.collection.ssh.status === "current";
    return { label: "证据已降级", title: partial ? "采集通道部分可用" : "当前变化不可见", summary: "历史记录只用于恢复对照，不代表当前业务状态。", tone: "warn" as OverviewTone };
  }
  if (risk === "wan") return { label: "出口中断", title: `全部 ${state.facts.wan.total} 条 WAN 未运行`, summary: "没有核实到活动默认路由；先检查链路、认证与上游。", tone: "danger" as OverviewTone };
  if (risk === "resource") return { label: "资源压力", title: "资源策略已触发", summary: "持续样本达到策略条件；未由资源值推断网络已经中断。", tone: "danger" as OverviewTone };
  if (risk === "interfaces") return { label: "转发对象异常", title: `${state.facts.interfaces.down} 个接口未运行`, summary: route ? "活动默认路由仍有记录；优先核对受影响接口。" : "活动默认路由无法按当前证据核实。", tone: "danger" as OverviewTone };
  if (risk === "route") return { label: "出口证据不完整", title: "默认路由无法核实", summary: "WAN 有运行记录，但没有明确的活动默认路由。", tone: "warn" as OverviewTone };
  return {
    label: state.scale === "fleet" ? "多对象巡检" : "当前运行判断",
    title: "出口路径已核实",
    summary: "活动默认路由与 WAN 运行记录一致；未执行外部业务连通性探测。",
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
    reason: channel.error ? "当前尝试记录了错误" : "没有明确成功记录",
    tone: channel.status === "unavailable" ? "missing" as OverviewTone : "danger" as OverviewTone,
    route: "readonlyDiagnostics" as const,
    sourcePath: source,
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
  }];
}

function priorityObjectsFor(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  risk: OverviewEvidenceRisk,
): { total: number; rows: OverviewPriorityObject[] } {
  if (risk === "evidence" || risk === "collection") {
    const rows = collectionObjects(state);
    return { total: rows.length, rows: rows.slice(0, 3) };
  }
  if (risk === "wan") {
    const rows = wanRows(snapshot).filter((row) => row.running === false);
    return {
      total: rows.length,
      rows: rows.slice(0, 3).map((row, index) => ({
        id: `wan:${index}:${clean(row.name || row.interface)}`,
        category: "WAN",
        name: clean(row.name || row.interface, `WAN ${index + 1}`),
        state: "未运行",
        reason: `${clean(row.parent, "父接口未记录")} · 无活动默认路由`,
        tone: "danger",
        route: "lineStatus",
        sourcePath: `wan[${index}]`,
      })),
    };
  }
  if (risk === "interfaces") {
    const rows = (snapshot.interfaces || []).filter((row) => row.running === false);
    return {
      total: rows.length,
      rows: rows.slice(0, 3).map((row, index) => ({
        id: `interface:${index}:${clean(row.name || row.interface)}`,
        category: "接口",
        name: clean(row.name || row.interface, `接口 ${index + 1}`),
        state: row.disabled === true ? "已停用" : "未运行",
        reason: `${clean(row.parent || row.master, "父级未记录")} · 依赖关系待核对`,
        tone: "danger",
        route: "interfaces",
        sourcePath: `interfaces[${(snapshot.interfaces || []).indexOf(row)}]`,
      })),
    };
  }
  if (risk === "resource") {
    const samples = resourceSampleStats(snapshot);
    return {
      total: 1,
      rows: [{
        id: "resource:system",
        category: "系统资源",
        name: clean(state.facts.device.identity, "RouterOS"),
        state: `CPU ${Math.round(state.facts.resource.cpu)}% · 内存 ${Math.round(state.facts.resource.memory)}% · 磁盘 ${Math.round(state.facts.resource.disk)}%`,
        reason: samples.observed ? `阈值 ${CPU_THRESHOLD}/${MEMORY_THRESHOLD}/${DISK_THRESHOLD}% · 尾部连续 ${samples.trailing} 个` : "阈值策略已触发；连续样本未取得",
        tone: "danger",
        route: "trafficLoad",
        sourcePath: "overview + overview.history",
      }],
    };
  }
  if (risk === "route") return {
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
    }],
  };
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
    sourcePath: "routes.defaultRoutes",
    attributes: [
      { label: "路由表", value: clean(route.table || route.routingTable, "main") },
      { label: "网关", value: clean(route.gateway) },
      { label: "distance", value: clean(route.distance) },
    ],
  };
}

function timestampOf(value: unknown): number | null {
  const numeric = finite(value);
  if (numeric !== null) return numeric < 1e12 ? numeric * 1000 : numeric;
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function currentRates(snapshot: OverviewRawSnapshot): { down: number; up: number } | null {
  const rows = wanRows(snapshot).filter((row) => row.running !== false && row.disabled !== true);
  if (!rows.length) return null;
  let down = 0;
  let up = 0;
  for (const row of rows) {
    const rowDown = finite(row.downRate);
    const rowUp = finite(row.upRate);
    if (rowDown === null || rowUp === null) return null;
    down += rowDown;
    up += rowUp;
  }
  return { down, up };
}

function closeObservation(left: number, right: number): boolean {
  return Math.abs(left - right) <= Math.max(1, Math.abs(right) * 0.01);
}

function currentTrafficInstrument(
  rates: { down: number; up: number },
  points: OverviewTrafficPoint[] = [],
): OverviewTrafficInstrument {
  const currentDown = formatRate(rates.down);
  const currentUp = formatRate(rates.up);
  const peak = Math.max(rates.down, rates.up);
  return {
    status: "accumulating",
    title: "WAN 双向吞吐",
    windowLabel: "当前采样",
    sampleCount: points.length,
    points,
    currentDown,
    currentUp,
    peak: formatRate(peak),
    accessibleSummary: `当前完整 WAN 观测，下载 ${currentDown}，上传 ${currentUp}；尚无足够同窗样本形成趋势。`,
  };
}

function trafficInstrument(snapshot: OverviewRawSnapshot, mode: OverviewEvidenceMode, risk: OverviewEvidenceRisk): OverviewTrafficInstrument | null {
  if (mode !== "current" || risk !== "none") return null;
  const rates = currentRates(snapshot);
  if (!rates) return null;
  const history = snapshot.overview?.history || {};
  const timestamps = Array.isArray(history.timestamps) ? history.timestamps : [];
  const down = Array.isArray(history.downlink) ? history.downlink : [];
  const up = Array.isArray(history.uplink) ? history.uplink : [];
  const length = Math.min(timestamps.length, down.length, up.length);
  const points: OverviewTrafficPoint[] = [];
  for (let offset = length; offset > 0; offset -= 1) {
    const timestamp = timestampOf(timestamps[timestamps.length - offset]);
    const pointDown = finite(down[down.length - offset]);
    const pointUp = finite(up[up.length - offset]);
    if (timestamp !== null && pointDown !== null && pointUp !== null) points.push({ timestamp, down: pointDown, up: pointUp });
  }
  if (!points.length) return currentTrafficInstrument(rates);
  const last = points[points.length - 1];
  if (!closeObservation(last.down, rates.down) || !closeObservation(last.up, rates.up)) return currentTrafficInstrument(rates);
  const snapshotAt = timestampOf(snapshot.updatedAt);
  const maxAge = Math.max(120_000, Number(snapshot.meta?.pollSeconds || 5) * 3000);
  if (snapshotAt !== null && Math.abs(snapshotAt - last.timestamp) > maxAge) return currentTrafficInstrument(rates);
  const durationSeconds = Math.max(0, Math.round((last.timestamp - points[0].timestamp) / 1000));
  const windowLabel = durationSeconds >= 60 ? `最近 ${Math.max(1, Math.round(durationSeconds / 60))} 分钟` : `最近 ${Math.max(1, durationSeconds)} 秒`;
  const peak = Math.max(...points.flatMap((point) => [point.down, point.up]), rates.down, rates.up);
  const status = points.length >= 2 ? "ready" as const : "accumulating" as const;
  const currentDown = formatRate(rates.down);
  const currentUp = formatRate(rates.up);
  return {
    status,
    title: "WAN 双向吞吐",
    windowLabel,
    sampleCount: points.length,
    points,
    currentDown,
    currentUp,
    peak: formatRate(peak),
    accessibleSummary: `${windowLabel}，${points.length} 个当前样本，最新下载 ${currentDown}，最新上传 ${currentUp}，窗口峰值 ${formatRate(peak)}。`,
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
  const route = activeDefaultRoute(snapshot);
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
    priorityObjects: priority.rows,
    priorityTotal: priority.total,
    focusObject: focusObjectFor(mode, risk, route),
    traffic: trafficInstrument(snapshot, mode, risk),
    evidenceRows: evidenceRows(snapshot, state),
  };
}
