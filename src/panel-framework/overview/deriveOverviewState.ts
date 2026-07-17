import { parseRfc3339Timestamp } from "../timeContract";
import type {
  DeriveOverviewOptions,
  OverviewCollectionState,
  OverviewCounts,
  OverviewDataCredibility,
  OverviewDerivedState,
  OverviewDeviceFacts,
  OverviewEndpointFailureEntry,
  OverviewFacts,
  OverviewFreshnessState,
  OverviewInterfaceState,
  OverviewRawMeta,
  OverviewRawRoute,
  OverviewRawSnapshot,
  OverviewRawWanRow,
  OverviewResourceState,
  OverviewRouteState,
  OverviewScenarioKey,
  OverviewTopbarState,
  OverviewTone,
  OverviewVerdict,
  OverviewWanState,
} from "./types";

const DANGER_CPU = 85;
const DANGER_MEMORY = 85;
const DANGER_DISK = 90;

const FINITE_NUMBER_TEXT = /^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:e[+-]?\d+)?$/i;

export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || !FINITE_NUMBER_TEXT.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

export function toNumber(value: unknown, fallback = 0): number {
  return toFiniteNumber(value) ?? fallback;
}

export function formatNumber(value: unknown): string {
  const n = toNumber(value, NaN);
  return Number.isFinite(n) ? new Intl.NumberFormat("zh-CN").format(n) : "-";
}

export function formatPercent(value: unknown, digits = 0): string {
  const n = toNumber(value, NaN);
  return Number.isFinite(n) ? `${n.toFixed(digits)}%` : "-";
}

export function formatCompact(value: unknown): string {
  const n = toNumber(value, NaN);
  if (!Number.isFinite(n)) return "-";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}G`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

export function formatRate(value: unknown): string {
  const n = toNumber(value, NaN);
  if (!Number.isFinite(n)) return "-";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)} Gbps`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)} Mbps`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(2)} Kbps`;
  return `${Math.round(n)} bps`;
}

export function formatDurationCompact(seconds: unknown): string {
  const safe = Math.max(0, Math.round(toNumber(seconds, 0)));
  if (safe >= 86400) return `${Math.floor(safe / 86400)}d${Math.floor((safe % 86400) / 3600)}h`;
  if (safe >= 3600) return `${Math.floor(safe / 3600)}h${Math.floor((safe % 3600) / 60)}m`;
  if (safe >= 60) return `${Math.floor(safe / 60)}m${safe % 60}s`;
  return `${safe}s`;
}

export function shortTimestamp(value: unknown): string {
  if (!value) return "-";
  const parsed = parseRfc3339Timestamp(value);
  if (parsed === null) return "-";
  const date = new Date(parsed);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function compactListText(values: Array<string | number | null | undefined>, limit = 3): string {
  const items = values.map((value) => String(value ?? "").trim()).filter(Boolean);
  if (!items.length) return "";
  if (items.length <= limit) return items.join(" / ");
  return `${items.slice(0, limit).join(" / ")} / …`;
}

export function stripChannelPrefix(value: string, channel: string): string {
  const text = String(value ?? "").trim();
  const prefix = `${channel} `;
  return text.startsWith(prefix) ? text.slice(prefix.length) : text;
}

function normalize(value: unknown, fallback = "-"): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function text(value: unknown, fallback = "-"): string {
  return normalize(value, fallback);
}

function credibilityLabelOf(credibility: OverviewDataCredibility): string {
  switch (credibility) {
    case "realtime": return "实时";
    case "cache": return "缓存快照";
    case "unavailable": return "不可判定";
  }
}

function credibilityToneOf(credibility: OverviewDataCredibility): OverviewTone {
  switch (credibility) {
    case "realtime": return "trust";
    case "cache": return "warn";
    case "unavailable": return "missing";
  }
}

function snapshotCredibilityOf(snapshot: OverviewRawSnapshot): OverviewDataCredibility {
  if (isSnapshotUnavailable(snapshot)) return "unavailable";
  const meta = snapshot.meta || {};
  const hasEndpointFailures = [
    meta.staticEndpointFailures,
    meta.realtimeEndpointFailures,
    meta.slowRestEndpointFailures,
    meta.detailEndpointFailures,
  ].some((entries) => Array.isArray(entries) && entries.length > 0);
  if (
    meta.clientEvidenceBoundary ||
    meta.realtimeError ||
    meta.slowRestError ||
    meta.staticError ||
    meta.connectionDetailError ||
    meta.connectionProtocolError ||
    hasEndpointFailures
  ) return "cache";
  return "realtime";
}

function hasWanCollection(snapshot: OverviewRawSnapshot): boolean {
  return Array.isArray(snapshot.wan) || Array.isArray(snapshot.pppoe);
}

function wanRows(snapshot: OverviewRawSnapshot): OverviewRawWanRow[] {
  if (Array.isArray(snapshot.wan) && snapshot.wan.length) return snapshot.wan;
  return Array.isArray(snapshot.pppoe) ? snapshot.pppoe : Array.isArray(snapshot.wan) ? snapshot.wan : [];
}

function isDefaultRouteCandidate(route: OverviewRawRoute, impliedByCollection: boolean): boolean {
  if (route.default === false) return false;
  if (route.default === true) return true;
  const destination = String(route.dstAddress ?? "").trim();
  if (destination === "0.0.0.0/0" || destination === "::/0") return true;
  return impliedByCollection && !destination;
}

function routeRank(route: OverviewRawRoute): number {
  if (route.active === true && route.disabled !== true) return 0;
  if (route.disabled === true) return 2;
  return 1;
}

function routeStableKey(route: OverviewRawRoute): string {
  return [
    route.table || route.routingTable || "main",
    route.gateway || route.gatewayStatus || "",
    route.dstAddress || "",
  ].map((value) => String(value)).join("\u0000");
}

export function defaultRouteRows(snapshot: OverviewRawSnapshot): OverviewRawRoute[] {
  const explicit = snapshot.routes?.defaultRoutes;
  const rows = Array.isArray(explicit)
    ? explicit.filter((route) => isDefaultRouteCandidate(route, true))
    : Array.isArray(snapshot.routes?.items)
      ? snapshot.routes.items.filter((route) => isDefaultRouteCandidate(route, false))
      : [];
  return rows.slice().sort((left, right) => {
    const rank = routeRank(left) - routeRank(right);
    if (rank) return rank;
    const leftDistance = toFiniteNumber(left.distance);
    const rightDistance = toFiniteNumber(right.distance);
    if (leftDistance !== null || rightDistance !== null) {
      if (leftDistance === null) return 1;
      if (rightDistance === null) return -1;
      if (leftDistance !== rightDistance) return leftDistance - rightDistance;
    }
    return routeStableKey(left).localeCompare(routeStableKey(right));
  });
}

export function routeRows(snapshot: OverviewRawSnapshot): OverviewRawRoute[] {
  return defaultRouteRows(snapshot);
}

export function selectDefaultRoute(snapshot: OverviewRawSnapshot): OverviewRawRoute | null {
  return defaultRouteRows(snapshot)[0] || null;
}

function defaultRouteRawSummary(route: OverviewRawRoute | null): string {
  if (!route) return "";
  return `路由表 ${route.table || route.routingTable || "main"} / 网关 ${route.gateway || route.gatewayStatus || "-"} / 优先级 ${route.distance ?? "-"} / ${route.active ? "活动路由" : "非活动路由"} / ${route.disabled ? "已禁用" : "未禁用"}`;
}

function defaultRouteBusinessSummary(route: OverviewRawRoute | null): string {
  if (!route) return "";
  const gateway = normalize(route.gateway || route.gatewayStatus, "-");
  const distance = route.distance ?? "-";
  const state = route.disabled ? "已禁用" : route.active ? "已启用" : "待确认";
  return `主默认路由：${gateway}，优先级${distance}，${state}`;
}

export function latestCollectionSuccessTime(snapshot: OverviewRawSnapshot): string {
  const meta = snapshot.meta || {};
  return latestTimestamp([
    meta.realtimeUpdatedAt,
    meta.slowRestUpdatedAt,
    meta.staticUpdatedAt,
    meta.connectionDetailUpdatedAt,
    meta.connectionProtocolUpdatedAt,
  ]);
}

export function latestBusinessSuccessTime(snapshot: OverviewRawSnapshot): string {
  const meta = snapshot.meta || {};
  return latestTimestamp([meta.realtimeUpdatedAt, meta.slowRestUpdatedAt]);
}

function latestTimestamp(values: Array<string | undefined>): string {
  return values.reduce<string>((latest, value) => {
    const parsed = parseRfc3339Timestamp(value);
    if (parsed === null) return latest;
    const latestParsed = parseRfc3339Timestamp(latest);
    if (latestParsed === null || parsed > latestParsed) return value || latest;
    return latest;
  }, "");
}

export function isSnapshotUnavailable(snapshot: OverviewRawSnapshot | null | undefined): boolean {
  if (!snapshot) return true;
  const meta = snapshot.meta || {};
  const signal = [snapshot.error, meta.realtimeError, meta.slowRestError, meta.staticError, meta.connectionDetailError, meta.connectionProtocolError]
    .map((v) => String(v || ""))
    .join(" ");
  const emptyBusiness = [snapshot.wan, snapshot.pppoe, snapshot.interfaces, snapshot.terminals].every((rows) => !Array.isArray(rows) || rows.length === 0);
  return snapshot.status === "error" && (/无可用快照|无业务快照|业务数据不展示|RouterOS 当前不可达|设备当前不可达/.test(signal) || emptyBusiness);
}

function endpointFailureEntries(meta: OverviewRawMeta): OverviewEndpointFailureEntry[] {
  return [...(meta.staticEndpointFailures || []), ...(meta.realtimeEndpointFailures || []), ...(meta.slowRestEndpointFailures || []), ...(meta.detailEndpointFailures || [])].filter(Boolean);
}

function failedEndpointSummary(snapshot: OverviewRawSnapshot) {
  const entries = endpointFailureEntries(snapshot.meta || {});
  return {
    count: entries.length,
    text: entries.length ? compactListText(entries.map((row) => `${normalize(row.group || "端点")}:${normalize(row.name || "-")}`), 3) : "未记录",
    entries,
  };
}

function freshnessState(snapshot: OverviewRawSnapshot, now: number): OverviewFreshnessState {
  if (isSnapshotUnavailable(snapshot)) {
    return {
      label: "快照缺失",
      level: "danger",
      stale: true,
      history: false,
      missing: true,
      credibility: "unavailable",
      credibilityLabel: credibilityLabelOf("unavailable"),
      credibilityTone: credibilityToneOf("unavailable"),
      seconds: null,
      text: "不可判定",
      source: "",
    };
  }
  const credibility = snapshotCredibilityOf(snapshot);
  const source = latestBusinessSuccessTime(snapshot);
  if (!source) return { label: "未采集", level: "warn", stale: true, history: false, missing: false, credibility, credibilityLabel: credibilityLabelOf(credibility), credibilityTone: credibilityToneOf(credibility), seconds: null, text: "未采集", source: "" };
  const parsed = parseRfc3339Timestamp(source);
  if (parsed === null) return { label: "未采集", level: "warn", stale: true, history: false, missing: false, credibility, credibilityLabel: credibilityLabelOf(credibility), credibilityTone: credibilityToneOf(credibility), seconds: null, text: "未采集", source: "" };
  const seconds = Math.max(0, Math.round((now - parsed) / 1000));
  const poll = Math.max(1, toNumber(snapshot.meta?.pollSeconds, 60));
  const boundary = snapshot.meta?.clientEvidenceBoundary;
  if (boundary) {
    const label = boundary === "stale" ? "历史证据" : boundary === "error" ? "刷新失败" : "恢复中";
    return {
      label,
      level: boundary === "error" ? "danger" : "warn",
      stale: true,
      history: true,
      missing: false,
      credibility: "cache",
      credibilityLabel: credibilityLabelOf("cache"),
      credibilityTone: credibilityToneOf("cache"),
      seconds,
      text: formatDurationCompact(seconds),
      source,
    };
  }
  const level: OverviewTone = seconds >= Math.max(900, poll * 15) ? "danger" : seconds >= Math.max(300, poll * 5) ? "warn" : "ok";
  return { label: level === "danger" ? "数据陈旧" : level === "warn" ? "数据偏旧" : "采样新鲜", level, stale: level !== "ok", history: level === "danger", missing: false, credibility, credibilityLabel: credibilityLabelOf(credibility), credibilityTone: credibilityToneOf(credibility), seconds, text: formatDurationCompact(seconds), source };
}

function businessEvidenceState(snapshot: OverviewRawSnapshot) {
  const wanObserved = hasWanCollection(snapshot);
  const interfacesObserved = Array.isArray(snapshot.interfaces);
  const wanUnknown = wanObserved
    ? wanRows(snapshot).filter((row) => row.running !== true && row.running !== false).length
    : 0;
  const interfacesUnknown = interfacesObserved
    ? snapshot.interfaces!.filter((row) => row?.running !== true && row?.running !== false).length
    : 0;
  const reasons: string[] = [];
  if (!wanObserved) reasons.push("WAN 对象未采集");
  if (wanUnknown) reasons.push(`${wanUnknown} 个 WAN 状态未知`);
  if (!interfacesObserved) reasons.push("接口对象未采集");
  if (interfacesUnknown) reasons.push(`${interfacesUnknown} 个接口状态未知`);
  return {
    incomplete: reasons.length > 0,
    text: reasons.length ? reasons.join(" / ") : "业务对象证据完整",
  };
}

function collectionState(snapshot: OverviewRawSnapshot, freshness: OverviewFreshnessState, failures = failedEndpointSummary(snapshot)): OverviewCollectionState {
  const meta = snapshot.meta || {};
  const noSnapshot = isSnapshotUnavailable(snapshot);
  const coreRestErrors = [meta.realtimeError, meta.slowRestError].filter(Boolean).map(String);
  const auxiliaryRestErrors = [meta.connectionDetailError, meta.connectionProtocolError].filter(Boolean).map(String);
  const restErrors = [...coreRestErrors, ...auxiliaryRestErrors];
  const sshErrors = [meta.staticError].filter(Boolean).map(String);
  const restSuccessAt = latestTimestamp([meta.realtimeUpdatedAt, meta.slowRestUpdatedAt, meta.connectionDetailUpdatedAt, meta.connectionProtocolUpdatedAt]);
  const sshSuccessAt = latestTimestamp([meta.staticUpdatedAt]);
  const channelStatus = (coreErrors: string[], auxiliaryErrors: string[], successAt: string) => {
    if (coreErrors.length) return "failed" as const;
    if (auxiliaryErrors.length) return "degraded" as const;
    if (successAt) return "current" as const;
    return "unavailable" as const;
  };
  const restStatus = channelStatus(coreRestErrors, auxiliaryRestErrors, restSuccessAt);
  const sshStatus = channelStatus(sshErrors, [], sshSuccessAt);
  const channelLabel = (status: typeof restStatus) => status === "current" ? "可用" : status === "degraded" ? "降级" : status === "failed" ? "失败" : "未记录";
  const restLabel = channelLabel(restStatus);
  const sshLabel = channelLabel(sshStatus);
  const rest = { status: restStatus, label: restLabel, successAt: restSuccessAt, error: restErrors.join("；") };
  const ssh = { status: sshStatus, label: sshLabel, successAt: sshSuccessAt, error: sshErrors.join("；") };
  const channelText = `REST ${restLabel} / SSH ${sshLabel}`;
  const businessEvidence = businessEvidenceState(snapshot);
  const transportDegraded = restStatus !== "current" || sshStatus !== "current";
  const channelDegraded = Boolean(noSnapshot || transportDegraded || failures.count > 0 || businessEvidence.incomplete);
  const dataStale = Boolean(freshness.stale || freshness.history);
  const credibility: OverviewDataCredibility = noSnapshot
    ? "unavailable"
    : channelDegraded || dataStale || freshness.credibility === "cache"
      ? "cache"
      : "realtime";
  const dataText = noSnapshot
    ? "无业务快照，业务数据不展示"
    : businessEvidence.incomplete
      ? businessEvidence.text
      : transportDegraded || failures.count > 0
        ? "采集证据不完整"
        : dataStale
          ? `业务快照年龄 ${freshness.text}`
          : latestBusinessSuccessTime(snapshot)
            ? `数据层最后成功采样 ${shortTimestamp(latestBusinessSuccessTime(snapshot))}`
            : "成功时间未记录";
  const level: OverviewTone = noSnapshot ? "danger" : channelDegraded || dataStale ? "warn" : "ok";
  const credibilityLabel = credibilityLabelOf(credibility);
  const credibilityTone = credibilityToneOf(credibility);
  const label = noSnapshot
    ? "快照缺失"
    : businessEvidence.incomplete
      ? "证据不完整"
      : channelDegraded
        ? "通道需复核"
        : dataStale
          ? "数据陈旧"
          : "采集可用";
  return {
    level,
    label,
    credibility,
    credibilityLabel,
    credibilityTone,
    restLabel,
    sshLabel,
    rest,
    ssh,
    channelStateText: channelText,
    dataStateText: dataText,
    dataText,
    channelText,
    channelDegraded,
    dataStale,
    businessEvidenceIncomplete: businessEvidence.incomplete,
    businessEvidenceText: businessEvidence.text,
    text: noSnapshot ? "快照缺失 · 无业务快照，业务数据不展示" : channelDegraded ? `${channelText} · ${dataText}` : dataText,
    summaryText: noSnapshot ? "快照缺失 · 无业务快照，业务数据不展示" : channelDegraded ? `${channelText} · ${dataText}` : dataText,
    failedEndpointText: failures.text,
  };
}

function routeState(snapshot: OverviewRawSnapshot, freshness: OverviewFreshnessState): OverviewRouteState {
  const candidates = defaultRouteRows(snapshot);
  const selected = candidates[0] || null;
  const rawSummary = defaultRouteRawSummary(selected);
  const businessSummary = defaultRouteBusinessSummary(selected);
  const active = Boolean(selected?.active === true && selected.disabled !== true);
  const base = { rawSummary, selected, verified: false, candidates: candidates.length };
  if (isSnapshotUnavailable(snapshot)) return { ...base, label: "不可判定", text: "缺少当前路由快照", level: "warn" };
  if (freshness.stale || freshness.history) return {
    ...base,
    label: active ? "历史活动记录" : "历史快照",
    text: active ? "仅证明上次成功采集时的默认路由" : "默认路由待判定",
    level: "warn",
  };
  if (!selected) return { ...base, label: "待确认", text: "默认路由事实未采集", level: "warn" };
  if (!active) return { ...base, label: "默认路由待确认", text: businessSummary || "默认路由事实未采集", level: "warn" };
  return { ...base, verified: true, label: "活动默认路由", text: businessSummary, level: "ok" };
}

function resourceState(snapshot: OverviewRawSnapshot): OverviewResourceState {
  const device = snapshot.overview || {};
  const unavailable = isSnapshotUnavailable(snapshot);
  const cpu = unavailable ? null : toFiniteNumber(device.cpuLoad);
  const memory = unavailable ? null : toFiniteNumber(device.memoryUsage);
  const disk = unavailable ? null : toFiniteNumber(device.diskUsage);
  const metrics = [
    { label: "处理器", value: cpu, warn: 70, danger: DANGER_CPU },
    { label: "内存", value: memory, warn: 70, danger: DANGER_MEMORY },
    { label: "磁盘", value: disk, warn: 80, danger: DANGER_DISK },
  ];
  const observed = metrics.filter((metric) => metric.value !== null).length;
  const available = observed > 0;
  const complete = observed === metrics.length;
  const danger = metrics.some((metric) => metric.value !== null && metric.value >= metric.danger);
  const warn = metrics.some((metric) => metric.value !== null && metric.value >= metric.warn);
  const level: OverviewTone = !available ? "missing" : danger ? "danger" : warn || !complete ? "warn" : "ok";
  const summaryText = metrics
    .map((metric) => `${metric.label} ${metric.value === null ? "未记录" : formatPercent(metric.value)}`)
    .join(" / ");
  return { level, available, complete, observed, cpu, memory, disk, summaryText };
}

function wanState(snapshot: OverviewRawSnapshot): OverviewWanState {
  const available = !isSnapshotUnavailable(snapshot) && hasWanCollection(snapshot);
  const rows = available ? wanRows(snapshot) : [];
  const total = rows.length;
  const online = rows.filter((row) => row.running === true).length;
  const offline = rows.filter((row) => row.running === false).length;
  const unknown = Math.max(0, total - online - offline);
  const allOffline = total > 0 && offline === total && unknown === 0;
  const label = !available
    ? "WAN 未采集"
    : total === 0
      ? "未发现 WAN 对象"
      : allOffline
        ? "WAN 全离线"
        : unknown > 0
          ? "WAN 状态未完整"
          : offline > 0
            ? "WAN 部分离线"
            : "WAN 可用";
  const text = !available
    ? "WAN 对象未采集"
    : total === 0
      ? "已采集 · 0 个 WAN 对象"
      : `${formatNumber(online)}/${formatNumber(total)} 运行 · ${formatNumber(offline)} 离线${unknown ? ` · ${formatNumber(unknown)} 未知` : ""}`;
  return { available, total, online, offline, unknown, allOffline, label, text };
}

function interfaceState(snapshot: OverviewRawSnapshot): OverviewInterfaceState {
  const available = !isSnapshotUnavailable(snapshot) && Array.isArray(snapshot.interfaces);
  const rows = available ? snapshot.interfaces! : [];
  const onlineRows = rows.filter((row) => row?.running === true);
  const downRows = rows.filter((row) => row?.running === false);
  const online = onlineRows.length;
  const down = downRows.length;
  const unknown = Math.max(0, rows.length - online - down);
  const downNames = downRows.map((row) => row.name || row.interface || "").filter(Boolean);
  const label = !available
    ? "接口未采集"
    : rows.length === 0
      ? "未发现接口对象"
      : unknown > 0
        ? "接口状态未完整"
        : down > 0
          ? "接口部分未运行"
          : "接口在线";
  const text = !available
    ? "接口对象未采集"
    : rows.length === 0
      ? "已采集 · 0 个接口对象"
      : down > 0 || unknown > 0
        ? `${formatNumber(online)}/${formatNumber(rows.length)} 运行 · ${formatNumber(down)} down${unknown ? ` · ${formatNumber(unknown)} 未知` : ""}${down ? ` · ${compactListText(downNames, 3) || "未列出"}` : ""}`
        : `${formatNumber(online)}/${formatNumber(rows.length)} 运行`;
  return { available, total: available ? rows.length : 0, online, down, unknown, downNames, label, text };
}

function connectionState(snapshot: OverviewRawSnapshot) {
  return { total: toNumber(snapshot.connections?.total, 0), active: Array.isArray(snapshot.connections?.active) ? snapshot.connections.active.length : 0, topIps: Array.isArray(snapshot.connections?.topIps) ? snapshot.connections.topIps.length : 0 };
}

function deviceFacts(snapshot: OverviewRawSnapshot): OverviewDeviceFacts {
  const device = snapshot.overview || {};
  const meta = snapshot.meta || {};
  const rawIdentity = normalize(device.identity || "", "");
  const identity = rawIdentity && !/无可用快照|不可达|采集失败|error/i.test(rawIdentity)
    ? rawIdentity
    : normalize(meta.target || meta.routerHost || "RouterOS");
  return { identity, version: normalize(device.version || "-"), boardName: normalize(device.boardName || "-"), architecture: normalize(device.architecture || "-"), uptime: normalize(device.uptime || "-"), systemTime: normalize(device.systemTime || "-"), routerHost: normalize(meta.routerHost || "-"), target: normalize(meta.target || "-") };
}

function countsOf(wan: ReturnType<typeof wanState>, interfaces: ReturnType<typeof interfaceState>, failures: ReturnType<typeof failedEndpointSummary>, connections: ReturnType<typeof connectionState>): OverviewCounts {
  return {
    wanTotal: wan.total,
    wanOnline: wan.online,
    wanOffline: wan.offline,
    wanUnknown: wan.unknown,
    interfacesTotal: interfaces.total,
    interfacesOnline: interfaces.online,
    interfacesDown: interfaces.down,
    interfacesUnknown: interfaces.unknown,
    failures: failures.count,
    connections: connections.total,
  };
}


function scenarioOf(snapshot: OverviewRawSnapshot, counts: OverviewCounts, resource: OverviewResourceState, collection: OverviewCollectionState, options: DeriveOverviewOptions): OverviewScenarioKey {
  if (options.scenarioHint) return options.scenarioHint;
  if (isSnapshotUnavailable(snapshot)) return "no-snapshot";
  if (counts.wanTotal > 0 && counts.wanOnline === 0 && counts.wanUnknown === 0) return "all-offline";
  if (counts.interfacesDown > 0) return "interfaces-down";
  if (resource.level === "danger") return "resource-full";
  if (collection.channelDegraded) return "collection-down";
  if (counts.wanTotal >= 4 || counts.interfacesTotal >= 8 || counts.connections >= 5000) return "fleet";
  return "single";
}


function labelOf(key: OverviewScenarioKey): string {
  switch (key) {
    case "single": return "Single 轻量态";
    case "fleet": return "Fleet 密集态";
    case "all-offline": return "WAN 全离线";
    case "no-snapshot": return "快照缺失";
    case "collection-down": return "通道需复核";
    case "resource-full": return "资源满载";
    case "interfaces-down": return "接口转发面异常";
  }
}

function buildVerdict(key: OverviewScenarioKey, facts: OverviewFacts): OverviewVerdict {
  const level: OverviewTone = key === "no-snapshot" || key === "interfaces-down" || key === "resource-full" || key === "all-offline" ? "danger" : key === "collection-down" ? "warn" : facts.freshness.stale ? "warn" : "ok";
  const summary = key === "no-snapshot"
    ? `无业务快照，业务数据不展示 / 失败端点 ${facts.collection.failedEndpointText}`
    : key === "resource-full"
      ? facts.resource.summaryText
      : key === "interfaces-down"
        ? `${formatNumber(facts.interfaces.down)} 个接口 down / 转发面优先`
        : key === "all-offline"
          ? `${facts.wan.label} / ${facts.route.label}`
          : key === "collection-down"
            ? `${facts.collection.channelText} / ${facts.collection.dataText}`
            : `${facts.wan.label} / ${facts.resource.summaryText}`;
  const detail = key === "no-snapshot"
    ? "设备当前不可达"
    : key === "resource-full"
      ? facts.resource.summaryText
      : key === "interfaces-down"
        ? compactListText(facts.interfaces.downNames, 4) || "涉及接口未列出"
        : key === "all-offline"
          ? `${formatNumber(facts.wan.offline)} 条离线线路`
          : key === "collection-down"
            ? "REST / SSH / 对象状态 / 失败端点"
            : facts.collection.channelText;
  return { key, level, label: labelOf(key), topLabel: labelOf(key), detail, summary };
}


function topbarState(snapshot: OverviewRawSnapshot, verdict: OverviewVerdict, facts: OverviewFacts): OverviewTopbarState {
  const unavailable = facts.freshness.credibility === "unavailable";
  const routeros = unavailable ? { label: "设备通达", value: "不可达", note: text(snapshot.error, "当前采集失败"), tone: "danger" as OverviewTone } : { label: "设备通达", value: "可达", note: "管理面已返回快照", tone: "ok" as OverviewTone };
  const rest = { label: "REST", value: facts.collection.rest.label, note: facts.collection.rest.error || (facts.collection.rest.successAt ? `成功 ${shortTimestamp(facts.collection.rest.successAt)}` : "成功时间未记录"), tone: facts.collection.rest.status === "current" ? "trust" as OverviewTone : facts.collection.rest.status === "unavailable" ? "missing" as OverviewTone : "warn" as OverviewTone };
  const ssh = { label: "SSH", value: facts.collection.ssh.label, note: facts.collection.ssh.error || (facts.collection.ssh.successAt ? `成功 ${shortTimestamp(facts.collection.ssh.successAt)}` : "成功时间未记录"), tone: facts.collection.ssh.status === "current" ? "trust" as OverviewTone : facts.collection.ssh.status === "unavailable" ? "missing" as OverviewTone : "warn" as OverviewTone };
  const recentSuccess = unavailable ? { label: "最近成功", value: "未记录", note: "业务快照缺失", tone: "warn" as OverviewTone } : { label: "最近成功", value: shortTimestamp(facts.freshness.source), note: facts.freshness.credibilityLabel, tone: facts.freshness.credibilityTone };
  return {
    device: { label: "设备", value: facts.device.identity, note: `${facts.device.version} · ${facts.device.uptime}`, tone: "trust" },
    conclusion: { label: "结论", value: verdict.topLabel, note: verdict.summary, tone: verdict.level },
    routeros,
    rest,
    ssh,
    recentSuccess,
  };
}

export function classifyOverviewScenario(snapshot: OverviewRawSnapshot | null | undefined, options: DeriveOverviewOptions = {}): OverviewScenarioKey {
  const raw = snapshot || {};
  const freshness = freshnessState(raw, options.now ?? Date.now());
  const failures = failedEndpointSummary(raw);
  const collection = collectionState(raw, freshness, failures);
  const resource = resourceState(raw);
  const wan = wanState(raw);
  const interfaces = interfaceState(raw);
  const connections = connectionState(raw);
  const counts = countsOf(wan, interfaces, failures, connections);
  return scenarioOf(raw, counts, resource, collection, options);
}

export function deriveOverviewState(snapshot: OverviewRawSnapshot | null | undefined, options: DeriveOverviewOptions = {}): OverviewDerivedState {
  const raw = snapshot || {};
  const freshness = freshnessState(raw, options.now ?? Date.now());
  const failures = failedEndpointSummary(raw);
  const collection = collectionState(raw, freshness, failures);
  const facts: OverviewFacts = { device: deviceFacts(raw), freshness, collection, route: routeState(raw, freshness), resource: resourceState(raw), wan: wanState(raw), interfaces: interfaceState(raw), failures, connections: connectionState(raw) };
  const counts = countsOf(facts.wan, facts.interfaces, failures, facts.connections);
  const scenario = scenarioOf(raw, counts, facts.resource, collection, options);
  const verdict = buildVerdict(scenario, facts);
  const topbar = topbarState(raw, verdict, facts);
  return { scenario, scale: scenario === "fleet" ? "fleet" : "single", verdict, counts, facts, topbar };
}
