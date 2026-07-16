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
  OverviewRawMeta,
  OverviewRawRoute,
  OverviewRawSnapshot,
  OverviewResourceState,
  OverviewRouteState,
  OverviewScenarioKey,
  OverviewTopbarState,
  OverviewTone,
  OverviewVerdict,
} from "./types";

const DANGER_CPU = 85;
const DANGER_MEMORY = 85;
const DANGER_DISK = 90;

export function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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
  if (meta.realtimeError || meta.slowRestError) return "cache";
  return "realtime";
}

function wanRows(snapshot: OverviewRawSnapshot) {
  return Array.isArray(snapshot.wan) && snapshot.wan.length ? snapshot.wan : Array.isArray(snapshot.pppoe) ? snapshot.pppoe : [];
}

export function routeRows(snapshot: OverviewRawSnapshot): OverviewRawRoute[] {
  const rows = snapshot.routes?.defaultRoutes || snapshot.routes?.items || [];
  return Array.isArray(rows) ? rows : [];
}

export function defaultRouteRawSummary(routes: OverviewRawRoute[]): string {
  const primary = routes.slice().sort((a, b) => toNumber(a.distance) - toNumber(b.distance))[0];
  if (!primary) return "";
  return `路由表 ${primary.table || primary.routingTable || "main"} / 网关 ${primary.gateway || primary.gatewayStatus || "-"} / 优先级 ${primary.distance ?? "-"} / ${primary.active ? "活动路由" : "非活动路由"} / ${primary.disabled ? "已禁用" : "未禁用"}`;
}

function defaultRouteBusinessSummary(routes: OverviewRawRoute[]): string {
  const primary = routes.slice().sort((a, b) => toNumber(a.distance) - toNumber(b.distance))[0];
  if (!primary) return "";
  const gateway = normalize(primary.gateway || primary.gatewayStatus, "-");
  const distance = primary.distance ?? "-";
  const state = primary.disabled ? "已禁用" : primary.active ? "已启用" : "待确认";
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

function collectionState(snapshot: OverviewRawSnapshot, freshness: OverviewFreshnessState, failures = failedEndpointSummary(snapshot)): OverviewCollectionState {
  const meta = snapshot.meta || {};
  const noSnapshot = isSnapshotUnavailable(snapshot);
  const credibility: OverviewDataCredibility = noSnapshot ? "unavailable" : freshness.credibility === "cache" || Boolean(meta.realtimeError || meta.slowRestError) ? "cache" : "realtime";
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
  const channelDegraded = Boolean(noSnapshot || restStatus !== "current" || sshStatus !== "current" || failures.count > 0);
  const dataStale = Boolean(freshness.stale || freshness.history);
  const dataText = noSnapshot ? "无业务快照，业务数据不展示" : channelDegraded ? "缓存快照" : dataStale ? `业务快照年龄 ${freshness.text}` : latestBusinessSuccessTime(snapshot) ? `数据层最后成功采样 ${shortTimestamp(latestBusinessSuccessTime(snapshot))}` : "成功时间未记录";
  const level: OverviewTone = noSnapshot ? "danger" : channelDegraded || dataStale ? "warn" : "ok";
  const credibilityLabel = credibilityLabelOf(credibility);
  const credibilityTone = credibilityToneOf(credibility);
  return {
    level,
    label: noSnapshot ? "快照缺失" : channelDegraded ? "通道需复核" : dataStale ? "数据陈旧" : "采集可用",
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
    text: noSnapshot ? "快照缺失 · 无业务快照，业务数据不展示" : channelDegraded ? `${channelText} · ${dataText}` : dataText,
    summaryText: noSnapshot ? "快照缺失 · 无业务快照，业务数据不展示" : channelDegraded ? `${channelText} · ${dataText}` : dataText,
    failedEndpointText: failures.text,
  };
}

function routeState(snapshot: OverviewRawSnapshot, freshness: OverviewFreshnessState): OverviewRouteState {
  const rawSummary = defaultRouteRawSummary(routeRows(snapshot));
  const businessSummary = defaultRouteBusinessSummary(routeRows(snapshot));
  if (isSnapshotUnavailable(snapshot)) return { label: "不可判定", text: "缺少当前路由快照", level: "warn", rawSummary };
  const active = routeRows(snapshot).find((route) => route.active === true && route.disabled !== true);
  if (freshness.stale || freshness.history) return { label: active ? "历史活动记录" : "历史快照", text: active ? "仅证明上次成功采集时的默认路由" : "默认路由待判定", level: "warn", rawSummary };
  if (!active) return { label: "待确认", text: "默认路由事实未采集", level: "warn", rawSummary };
  return { label: active.active && !active.disabled ? "活动默认路由" : "默认路由待确认", text: businessSummary || "默认路由事实未采集", level: active.active && !active.disabled ? "ok" : "warn", rawSummary };
}

function resourceState(snapshot: OverviewRawSnapshot): OverviewResourceState {
  const device = snapshot.overview || {};
  const available = !isSnapshotUnavailable(snapshot);
  const cpu = available ? toNumber(device.cpuLoad, 0) : 0;
  const memory = available ? toNumber(device.memoryUsage, 0) : 0;
  const disk = available ? toNumber(device.diskUsage, 0) : 0;
  const level: OverviewTone = !available ? "missing" : cpu >= DANGER_CPU || memory >= DANGER_MEMORY || disk >= DANGER_DISK ? "danger" : cpu >= 70 || memory >= 70 || disk >= 80 ? "warn" : "ok";
  return { level, available, cpu, memory, disk, summaryText: available ? `处理器 ${formatPercent(cpu)} / 内存 ${formatPercent(memory)} / 磁盘 ${formatPercent(disk)}` : "处理器 未记录 / 内存 未记录 / 磁盘 未记录" };
}

function wanState(snapshot: OverviewRawSnapshot) {
  const rows = wanRows(snapshot);
  const available = !isSnapshotUnavailable(snapshot);
  const online = rows.filter((row) => row.running !== false).length;
  const total = rows.length;
  const offline = Math.max(0, total - online);
  const allOffline = total > 0 && online === 0;
  return { available, total, online, offline, allOffline, label: !available ? "未记录" : allOffline ? "WAN 全离线" : offline > 0 ? "WAN 部分离线" : "WAN 可用", text: !available ? "未记录" : `${formatNumber(online)}/${formatNumber(total)} · ${formatNumber(offline)} 离线` };
}

function interfaceState(snapshot: OverviewRawSnapshot) {
  const rows = Array.isArray(snapshot.interfaces) ? snapshot.interfaces : [];
  const available = !isSnapshotUnavailable(snapshot);
  const downRows = rows.filter((row) => row?.running === false);
  const downNames = downRows.map((row) => row.name || row.interface || "").filter(Boolean);
  return { available, total: available ? rows.length : 0, down: available ? downRows.length : 0, downNames, text: !available ? "未记录" : downRows.length ? `${formatNumber(downRows.length)} down · ${compactListText(downNames, 3) || "未列出"}` : "接口在线" };
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
  return { wanTotal: wan.total, wanOnline: wan.online, wanOffline: wan.offline, interfacesTotal: interfaces.total, interfacesDown: interfaces.down, failures: failures.count, connections: connections.total };
}

function scenarioOf(snapshot: OverviewRawSnapshot, counts: OverviewCounts, resource: OverviewResourceState, collection: OverviewCollectionState, options: DeriveOverviewOptions): OverviewScenarioKey {
  if (options.scenarioHint) return options.scenarioHint;
  if (isSnapshotUnavailable(snapshot)) return "no-snapshot";
  if (counts.wanTotal > 0 && counts.wanOnline === 0) return "all-offline";
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
  const summary = key === "no-snapshot" ? `无业务快照，业务数据不展示 / 失败端点 ${facts.collection.failedEndpointText}` : key === "resource-full" ? facts.resource.summaryText : key === "interfaces-down" ? `${formatNumber(facts.interfaces.down)} 个接口 down / 转发面优先` : key === "all-offline" ? `${facts.wan.label} / ${facts.route.label}` : key === "collection-down" ? `${facts.collection.channelText} / 缓存快照` : `${formatNumber(facts.wan.total)} 条 WAN / ${facts.resource.summaryText}`;
  const detail = key === "no-snapshot" ? "设备当前不可达" : key === "resource-full" ? `处理器 ${formatPercent(facts.resource.cpu, 1)} / 内存 ${formatPercent(facts.resource.memory, 1)} / 磁盘 ${formatPercent(facts.resource.disk, 1)}` : key === "interfaces-down" ? compactListText(facts.interfaces.downNames, 4) || "涉及接口未列出" : key === "all-offline" ? `${formatNumber(facts.wan.offline)} 条离线线路` : key === "collection-down" ? "REST / SSH / 失败端点 / 缓存快照" : facts.collection.channelText;
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
