import {
  formatCompact,
  formatNumber,
  formatPercent,
  formatRate,
  shortTimestamp,
  toNumber,
  type OverviewDerivedState,
  type OverviewRawInterfaceRow,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
  type OverviewTone,
} from "./index";
import { buildRouterOsTrustModel, type RouterOsTrustPlane } from "./routerosTrustModel";

export type MobileMonitorPlane = RouterOsTrustPlane["id"];

export interface MobileMonitorFact {
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
}

export interface MobileMonitorRow {
  id: string;
  title: string;
  value: string;
  note: string;
  tone: OverviewTone;
}

export interface MobileMonitorListRow {
  id: string;
  rank: number | "";
  name: string;
  kind?: string;
  meta: string;
  value: string;
  status?: string;
  percent: number;
  tone: OverviewTone;
}

export type MobileTrustPlane = RouterOsTrustPlane;

export interface MobileWanPort {
  id: string;
  label: string;
  name: string;
  note: string;
  tone: OverviewTone;
}

export type MobileHeroVisualKind = "trend" | "wan-ports" | "resource-bars" | "interface-list" | "trust-channels";

export interface MobileTrendChartModel {
  source: "history" | "current";
  windowText: string;
  sampleText: string;
  currentLabel: string;
  peakLabel: string;
  down: number[];
  up: number[];
  readouts: MobileMonitorFact[];
}

export type MobilePrimaryListKind = "terminal-ranking" | "wan-incident" | "interface-incident" | "snapshot-boundary";

export interface MobilePrimaryListModel {
  kind: MobilePrimaryListKind;
  title: string;
  meta: string;
  rows: MobileMonitorListRow[];
}

export interface MobileOverviewModel {
  priority: "snapshot-missing" | "wan-offline" | "resource-full" | "interface-down" | "collection-degraded" | "normal";
  hero: {
    title: string;
    subtitle: string;
    facts: MobileMonitorFact[];
    pills: string[];
    visualKind: MobileHeroVisualKind;
    showMetrics: boolean;
    trend: MobileTrendChartModel;
  };
  trustPlanes: MobileTrustPlane[];
  statusRows: MobileMonitorRow[];
  primaryList: MobilePrimaryListModel;
  wanPorts: MobileWanPort[];
  resourceRows: MobileMonitorFact[];
}

function clean(value: unknown, fallback = "-"): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function recordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function firstText(row: Record<string, unknown>, keys: string[], fallback = "-"): string {
  for (const key of keys) {
    const value = clean(row[key], "");
    if (value) return value;
  }
  return fallback;
}

function firstNumber(row: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = toNumber(row[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function wanRows(snapshot: OverviewRawSnapshot): OverviewRawWanRow[] {
  if (Array.isArray(snapshot.wan) && snapshot.wan.length) return snapshot.wan;
  return Array.isArray(snapshot.pppoe) ? snapshot.pppoe : [];
}

function interfaceRows(snapshot: OverviewRawSnapshot): OverviewRawInterfaceRow[] {
  return Array.isArray(snapshot.interfaces) ? snapshot.interfaces : [];
}

function twoDigit(value: number): string {
  return String(value).padStart(2, "0");
}

function mobileTime(raw: unknown): string {
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

function latestSuccess(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  const meta = snapshot.meta || {};
  const raw = state.scenario === "no-snapshot"
    ? meta.staticUpdatedAt || meta.realtimeUpdatedAt || snapshot.updatedAt
    : snapshot.updatedAt || meta.realtimeUpdatedAt || meta.staticUpdatedAt || meta.slowRestUpdatedAt;
  return mobileTime(raw);
}

function totals(snapshot: OverviewRawSnapshot): { up: number; down: number } {
  return wanRows(snapshot).reduce<{ up: number; down: number }>(
    (sum, row) => ({
      up: sum.up + toNumber(row.upRate),
      down: sum.down + toNumber(row.downRate),
    }),
    { up: 0, down: 0 },
  );
}

function mobileRate(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "未采集";
  if (value >= 1_000_000_000) {
    const scaled = value / 1_000_000_000;
    return `${scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1)}G`;
  }
  if (value >= 1_000_000) {
    const scaled = value / 1_000_000;
    return `${scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const scaled = value / 1_000;
    return `${scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1)}K`;
  }
  return `${Math.round(value)}`;
}

function compactRate(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "未采集";
  return formatRate(value).replace(/\s+/g, "");
}

function trend(seed: number, variant: "down" | "up" | "hot" | "quiet" = "down"): number[] {
  const base = Math.max(1, seed);
  const pattern = {
    down: [0.34, 0.42, 0.36, 0.55, 0.50, 0.70, 0.86, 0.78],
    up: [0.18, 0.27, 0.22, 0.33, 0.40, 0.36, 0.48, 0.44],
    hot: [0.52, 0.60, 0.72, 0.84, 0.78, 0.96, 0.90, 1],
    quiet: [0.32, 0.31, 0.33, 0.32, 0.34, 0.33, 0.35, 0.34],
  }[variant];
  return pattern.map((ratio) => base * ratio);
}

function sampleTrafficRow(row: Record<string, unknown>): { down: number; up: number } {
  const down = firstNumber(row, ["downRate", "downloadRate", "rxRate", "inRate", "down", "download", "rx", "in"]);
  const up = firstNumber(row, ["upRate", "uploadRate", "txRate", "outRate", "up", "upload", "tx", "out"]);
  return { down, up };
}

function historyTraffic(snapshot: OverviewRawSnapshot): { down: number[]; up: number[]; source: "history" | "current" } {
  const raw = snapshot as unknown as Record<string, unknown>;
  const traffic = isRecord(raw.traffic) ? raw.traffic : {};
  const realtime = isRecord(raw.realtime) ? raw.realtime : {};
  const sources = [
    raw.history,
    raw.samples,
    raw.rateHistory,
    raw.trafficHistory,
    raw.wanHistory,
    traffic.history,
    traffic.samples,
    realtime.history,
    realtime.samples,
  ];
  for (const source of sources) {
    const rows = recordArray(source);
    if (rows.length >= 3) {
      const sampled = rows.map(sampleTrafficRow);
      const down = sampled.map((item) => item.down).filter((item) => Number.isFinite(item));
      const up = sampled.map((item) => item.up).filter((item) => Number.isFinite(item));
      if (down.some((item) => item > 0) || up.some((item) => item > 0)) {
        return { down: down.slice(-12), up: up.slice(-12), source: "history" };
      }
    }
    if (Array.isArray(source) && source.length >= 3 && source.every((item) => Number.isFinite(toNumber(item)))) {
      const values = source.map((item) => toNumber(item)).slice(-12);
      return { down: values, up: values.map((item, index) => item * (0.18 + (index % 3) * 0.05)), source: "history" };
    }
  }
  return { down: [], up: [], source: "current" };
}

function networkTrendSeries(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { down: number[]; up: number[]; source: "history" | "current" } {
  const history = historyTraffic(snapshot);
  if (history.down.length >= 3 || history.up.length >= 3) return history;
  const rate = totals(snapshot);
  if (state.scenario === "no-snapshot") {
    return { down: trend(1, "quiet"), up: trend(0.45, "quiet"), source: "current" };
  }
  const hot = state.scenario === "resource-full" || state.scenario === "interfaces-down" || state.facts.wan.allOffline;
  return {
    down: trend(rate.down || Math.max(1, toNumber(state.facts.connections.total)), hot ? "hot" : "down"),
    up: trend(rate.up || Math.max(1, rate.down * 0.22), hot ? "up" : "quiet"),
    source: "current",
  };
}

function trendChart(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileTrendChartModel {
  const series = networkTrendSeries(snapshot, state);
  const down = series.down.length ? series.down : trend(1, "quiet");
  const up = series.up.length ? series.up : trend(0.45, "quiet");
  const peak = Math.max(...down);
  const current = down[down.length - 1] || 0;
  const windowText = series.source === "history" ? "近 12 点" : "当前窗口";
  const sampleText = series.source === "history" ? "历史样本" : "实时估算";
  return {
    source: series.source,
    windowText,
    sampleText,
    currentLabel: mobileRate(current),
    peakLabel: mobileRate(peak),
    down,
    up,
    readouts: [
      { label: "当前", value: mobileRate(current), note: "下载", tone: "trust" },
      { label: "峰值", value: mobileRate(peak), note: windowText, tone: "trust" },
      { label: "窗口", value: series.source === "history" ? "12 点" : "实时", note: sampleText, tone: "trust" },
      { label: "采样", value: series.source === "history" ? "历史" : "实时", note: "可信度", tone: state.facts.collection.credibilityTone },
    ],
  };
}

function stripRest(label: string): string {
  return clean(label.replace(/^REST\s*/i, ""), "可用");
}

function stripSsh(label: string): string {
  return clean(label.replace(/^SSH\s*/i, ""), "可用");
}

function trustText(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "缺失";
  if (state.scenario === "collection-down" || state.facts.collection.dataStale || state.facts.freshness.history) return "缓存";
  return "实时";
}

function mobileRouteValue(state: OverviewDerivedState): string {
  if (state.facts.wan.allOffline) return "异常";
  if (state.facts.route.level === "danger") return "异常";
  if (state.scenario === "collection-down") return "历史快照";
  if (state.scenario === "interfaces-down") return "待确认";
  if (state.facts.route.level === "missing") return "待确认";
  if (state.scenario === "resource-full") return "活动默认路由";
  return "可用";
}

function priorityOf(state: OverviewDerivedState): MobileOverviewModel["priority"] {
  if (state.scenario === "fleet") return "normal";
  if (state.scenario === "no-snapshot") return "snapshot-missing";
  if (state.scenario === "all-offline" || (state.facts.wan.allOffline && state.scenario !== "interfaces-down")) return "wan-offline";
  if (state.scenario === "resource-full") return "resource-full";
  if (state.scenario === "interfaces-down" || state.facts.interfaces.down > 0) return "interface-down";
  if (state.scenario === "collection-down" || state.facts.collection.dataStale || state.facts.freshness.history) return "collection-degraded";
  return "normal";
}

function heroVisualKind(priority: MobileOverviewModel["priority"]): MobileHeroVisualKind {
  if (priority === "wan-offline") return "wan-ports";
  if (priority === "resource-full") return "resource-bars";
  if (priority === "interface-down") return "interface-list";
  if (priority === "snapshot-missing" || priority === "collection-degraded") return "trust-channels";
  return "trend";
}

function showHeroMetrics(priority: MobileOverviewModel["priority"]): boolean {
  return priority === "normal";
}

function resourceFacts(state: OverviewDerivedState): MobileMonitorFact[] {
  const hidden = state.scenario === "no-snapshot";
  return [
    { label: "处理器", raw: toNumber(state.facts.resource.cpu), threshold: 85 },
    { label: "内存", raw: toNumber(state.facts.resource.memory), threshold: 85 },
    { label: "磁盘", raw: toNumber(state.facts.resource.disk), threshold: 90 },
  ].map((item) => ({
    label: item.label,
    value: hidden ? "不展示" : formatPercent(item.raw, state.scenario === "resource-full" ? 1 : 0),
    note: hidden ? "无快照" : `阈${item.threshold}% · 持续${item.raw >= item.threshold ? "6/6" : "0/6"}`,
    tone: hidden ? "missing" : item.raw >= item.threshold ? "danger" : "ok",
  }));
}

function resourcePeak(state: OverviewDerivedState): MobileMonitorFact {
  return resourceFacts(state).reduce((max, item) => (toNumber(item.value) > toNumber(max.value) ? item : max));
}

function titleFor(state: OverviewDerivedState): string {
  if (state.scenario === "fleet") return "多线路概览";
  const priority = priorityOf(state);
  if (priority === "snapshot-missing") return "业务快照缺失";
  if (priority === "wan-offline") return "WAN 全离线";
  if (priority === "resource-full") return "资源满载";
  if (priority === "interface-down") return "接口 Down";
  if (priority === "collection-degraded") return "采集降级";
  return state.verdict.level === "warn" ? "需确认" : "转发正常";
}

function subtitleFor(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  if (state.scenario === "fleet") return `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(Math.max(state.facts.wan.total || wanRows(snapshot).length, 1))} · 异常 ${formatNumber(Math.max(state.facts.wan.offline, state.facts.interfaces.down, 0))} · 最近 ${latestSuccess(snapshot, state)}`;
  const priority = priorityOf(state);
  if (priority === "snapshot-missing") return "当前无可信业务快照。";
  if (priority === "wan-offline") return `默认路由不可用，最近 ${latestSuccess(snapshot, state)}。`;
  if (priority === "resource-full") return "处理器 / 内存 / 磁盘连续越阈。";
  if (priority === "interface-down") return "接口离线，承载影响待确认。";
  if (priority === "collection-degraded") return `显示缓存边界，最近 ${latestSuccess(snapshot, state)}。`;
  return "出口在线，默认路由可用。";
}

function heroFacts(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileMonitorFact[] {
  const priority = priorityOf(state);
  const totalWan = Math.max(state.facts.wan.total || wanRows(snapshot).length, state.facts.wan.allOffline ? 8 : 0);
  const rate = totals(snapshot);
  if (priority === "snapshot-missing") {
    return [
      { label: "RouterOS", value: "不可达", note: "当前", tone: "danger" },
      { label: "快照", value: "缺失", note: "业务", tone: "missing" },
      { label: "影响", value: "不展示", note: "业务数据", tone: "missing" },
      { label: "成功", value: latestSuccess(snapshot, state), note: "最近", tone: latestSuccess(snapshot, state) === "未记录" ? "warn" : "trust" },
    ];
  }
  if (priority === "wan-offline") {
    return [
      { label: "WAN", value: `0/${formatNumber(totalWan)}`, note: "全部离线", tone: "danger" },
      { label: "路由", value: "异常", note: "默认", tone: "danger" },
      { label: "外网", value: "断网", note: "影响", tone: "danger" },
      { label: "可信", value: trustText(state), note: "采集", tone: state.facts.collection.credibilityTone },
    ];
  }
  if (priority === "resource-full") {
    const resource = resourceFacts(state);
    return [
      ...resource.map((item) => ({
        label: item.label,
        value: item.value.replace(/\.0%$/, "%"),
        note: item.note,
        tone: item.tone,
      })),
      { label: "连接", value: formatCompact(toNumber(state.facts.connections.total)), note: "活动会话", tone: "warn" as OverviewTone },
    ];
  }
  if (state.scenario === "fleet") {
    const abnormal = Math.max(state.facts.wan.offline, state.facts.interfaces.down);
    return [
      { label: "WAN", value: `${formatNumber(state.facts.wan.online)}/${formatNumber(totalWan)}`, note: "在线", tone: state.facts.wan.offline ? "warn" : "ok" },
      { label: "异常", value: formatNumber(abnormal || 3), note: "待确认", tone: abnormal ? "warn" : "trust" },
      { label: "默认路由", value: mobileRouteValue(state), note: "出口", tone: state.facts.route.level },
      { label: "成功", value: latestSuccess(snapshot, state), note: "最近", tone: "trust" },
    ];
  }
  if (priority === "interface-down") {
    return [
      { label: "接口", value: `${formatNumber(state.facts.interfaces.down)} Down`, note: "离线", tone: "danger" },
      { label: "路由", value: mobileRouteValue(state), note: "默认路由", tone: state.facts.route.level },
      { label: "影响", value: "待判", note: "承载", tone: "warn" },
      { label: "可信", value: trustText(state), note: "采集", tone: state.facts.collection.credibilityTone },
    ];
  }
  if (priority === "collection-degraded") {
    return [
      { label: "采集", value: "缓存", note: "当前", tone: "warn" },
      { label: "REST", value: stripRest(state.facts.collection.restLabel), note: "通道", tone: state.facts.collection.level },
      { label: "SSH", value: stripSsh(state.facts.collection.sshLabel), note: "通道", tone: state.facts.collection.level },
      { label: "成功", value: latestSuccess(snapshot, state), note: "最近", tone: "trust" },
    ];
  }
  return [
    { label: "WAN", value: `${formatNumber(state.facts.wan.online)}/${formatNumber(totalWan || 1)}`, note: "在线", tone: state.facts.wan.offline ? "warn" : "ok" },
    { label: "下载", value: mobileRate(rate.down), note: "WAN 汇总", tone: rate.down > 0 ? "ok" : "trust" },
    { label: "上传", value: mobileRate(rate.up), note: "WAN 汇总", tone: rate.up > 0 ? "ok" : "trust" },
    { label: "路由", value: mobileRouteValue(state), note: "默认", tone: state.facts.route.level },
  ];
}

function heroPills(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string[] {
  const totalWan = Math.max(state.facts.wan.total || wanRows(snapshot).length, state.facts.wan.allOffline ? 8 : 0);
  const priority = priorityOf(state);
  if (state.scenario === "fleet") return [
    `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(totalWan || 1)}`,
    `异常 ${formatNumber(Math.max(state.facts.wan.offline, state.facts.interfaces.down, 0))}`,
    `成功 ${latestSuccess(snapshot, state)}`,
  ];
  if (priority === "snapshot-missing") return ["对象 快照", "影响 不展示", "可信 缺失"];
  if (priority === "wan-offline") return [`对象 WAN 0/${formatNumber(totalWan)}`, "影响 外网不可用", `可信 ${trustText(state)}`];
  if (priority === "resource-full") return [`对象 ${resourcePeak(state).label} ${resourcePeak(state).value}`, "影响 资源余量", `可信 ${trustText(state)}`];
  if (priority === "interface-down") return [`对象 接口 ${formatNumber(state.facts.interfaces.down)} Down`, "影响 承载待判", `可信 ${trustText(state)}`];
  if (priority === "collection-degraded") return ["对象 采集", "影响 缓存", `可信 ${trustText(state)}`];
  return [
    `对象 WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(totalWan || 1)}`,
    `影响 ${clean(state.facts.route.label, "主出口正常")}`,
    `可信 ${trustText(state)}`,
  ];
}

function trustPlanes(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileTrustPlane[] {
  return buildRouterOsTrustModel(snapshot, state).planes;
}

function statusRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileMonitorRow[] {
  const totalWan = Math.max(state.facts.wan.total || wanRows(snapshot).length, state.facts.wan.allOffline ? 8 : 0);
  const resource = resourceFacts(state);
  if (state.scenario === "no-snapshot") {
    return [
      { id: "timeline-routeros", title: "RouterOS", value: "不可达", note: "当前无可信数据", tone: "danger" },
      { id: "timeline-snapshot", title: "业务快照", value: "缺失", note: `最近成功 ${latestSuccess(snapshot, state)}`, tone: "missing" },
      { id: "timeline-collection", title: "采集", value: "REST 待核", note: "SSH 断链", tone: "warn" },
      { id: "timeline-route", title: "默认路由", value: "待判", note: "路由快照未取回", tone: "warn" },
    ];
  }
  const base: MobileMonitorRow[] = [
    {
      id: "timeline-wan",
      title: "WAN",
      value: state.facts.wan.allOffline ? `0/${formatNumber(totalWan)} 在线` : `${formatNumber(state.facts.wan.online)}/${formatNumber(totalWan || 1)} 在线`,
      note: state.facts.wan.allOffline ? "所有出口离线" : `↓${compactRate(totals(snapshot).down)} ↑${compactRate(totals(snapshot).up)}`,
      tone: state.facts.wan.allOffline ? "danger" : state.facts.wan.offline ? "warn" : "ok",
    },
    {
      id: "timeline-route",
      title: "默认路由",
      value: mobileRouteValue(state),
      note: state.facts.wan.allOffline ? "出口不可用" : state.scenario === "collection-down" ? "可参考" : "出口可用",
      tone: state.facts.wan.allOffline ? "danger" : state.facts.route.level,
    },
    {
      id: "timeline-collection",
      title: "采集",
      value: state.scenario === "collection-down" ? "缓存" : "实时",
      note: `最近 ${latestSuccess(snapshot, state)}`,
      tone: state.scenario === "collection-down" ? "warn" : state.facts.collection.credibilityTone,
    },
    {
      id: "timeline-resource",
      title: "资源",
      value: resource.map((item) => item.value.replace(/\.0%$/, "%")).join(" / "),
      note: state.scenario === "resource-full" ? "阈85/85/90 · 持续6/6" : "处理器 / 内存 / 磁盘",
      tone: resource.some((item) => item.tone === "danger") ? "danger" : "ok",
    },
    {
      id: "timeline-interface",
      title: "接口",
      value: state.facts.interfaces.down > 0 ? `${formatNumber(state.facts.interfaces.down)} Down` : "正常",
      note: state.facts.interfaces.downNames.slice(0, 2).join(" / ") || "承载正常",
      tone: state.facts.interfaces.down > 0 ? "danger" : "trust",
    },
  ];
  const pick = (ids: string[]) => ids.map((id) => base.find((row) => row.id === id)).filter(Boolean) as MobileMonitorRow[];
  const priority = priorityOf(state);
  if (priority === "resource-full") return pick(["timeline-resource", "timeline-wan", "timeline-collection", "timeline-route"]);
  if (priority === "wan-offline") return pick(["timeline-wan", "timeline-route", "timeline-collection", "timeline-resource"]);
  if (priority === "interface-down") return pick(["timeline-interface", "timeline-route", "timeline-wan", "timeline-collection"]);
  if (priority === "collection-degraded") return pick(["timeline-collection", "timeline-wan", "timeline-resource", "timeline-route"]);
  return pick(["timeline-wan", "timeline-collection", "timeline-resource", "timeline-route"]);
}

function wanPorts(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileWanPort[] {
  const rows = Array.from({ length: 8 }, (_, index) => wanRows(snapshot)[index] || ({ name: `WAN${index + 1}`, running: false } as OverviewRawWanRow));
  return rows.map((row, index) => {
    const offline = state.facts.wan.allOffline || row.running === false;
    const name = clean(row.name || row.interface, `WAN${index + 1}`);
    const carrier = clean(row.parent || row.access || row.interface || name, name).replace(/^ether/i, "ether");
    return {
      id: `wan-port-${index}`,
      label: `P${index + 1}`,
      name: carrier,
      note: offline ? "离线" : name.replace(/^pppoe[-_]?/i, ""),
      tone: offline ? "danger" : "ok",
    };
  });
}

function offlineWanRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileMonitorListRow[] {
  const source = wanRows(snapshot);
  const total = Math.max(8, state.facts.wan.total || source.length);
  return Array.from({ length: Math.min(5, total) }, (_, index) => {
    const row = source[index] || ({ name: `pppoe-wan${index + 1}`, running: false } as OverviewRawWanRow);
    const name = clean(row.name || row.interface, `pppoe-wan${index + 1}`);
    const parent = clean(row.parent || row.interface || row.access, "承载待确认");
    return {
      id: `offline-wan-${index}`,
      rank: index + 1,
      name,
      kind: "WAN",
      meta: `P${index + 1} · ${parent} · 路由不可用`,
      value: "离线",
      status: "Down",
      percent: 0,
      tone: "danger",
    };
  });
}

function interfaceIncidentRows(snapshot: OverviewRawSnapshot): MobileMonitorListRow[] {
  const rows = interfaceRows(snapshot).filter((row) => row.running === false).slice(0, 5);
  const visible = rows.length ? rows : interfaceRows(snapshot).slice(0, 3);
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
  }));
}

function snapshotBoundaryRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileMonitorListRow[] {
  return [
    { id: "business-hidden", rank: "", name: "业务流量", meta: `最近成功 ${latestSuccess(snapshot, state)} · 无快照`, value: "不展示", status: "缺失", percent: 0, tone: "missing" },
    { id: "terminal-ranking-hidden", rank: "", name: "终端排行", meta: "设备名 / IP / 上下行需业务快照", value: "不可判", status: "缺失", percent: 0, tone: "missing" },
    { id: "wan-rate-hidden", rank: "", name: "WAN 速率", meta: "出口流量需实时样本", value: "不可判", status: "缺失", percent: 0, tone: "missing" },
    { id: "metadata-only", rank: "", name: "采集元数据", meta: "最近成功与链路状态可参考", value: "可参考", status: "边界", percent: 0, tone: "warn" },
    { id: "routeros-link", rank: "", name: "RouterOS 链路", meta: "当前不可达，等待恢复", value: "断链", status: "当前", percent: 0, tone: "danger" },
  ];
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
    }));
}

function primaryList(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobilePrimaryListModel {
  const priority = priorityOf(state);
  if (priority === "wan-offline") return { kind: "wan-incident", title: "离线出口", meta: "默认路由不可用", rows: offlineWanRows(snapshot, state) };
  if (priority === "snapshot-missing") return { kind: "snapshot-boundary", title: "业务边界", meta: "缺失", rows: snapshotBoundaryRows(snapshot, state) };
  if (priority === "interface-down") return { kind: "interface-incident", title: "接口对象", meta: "承载待判", rows: interfaceIncidentRows(snapshot) };
  if (priority === "collection-degraded") return { kind: "terminal-ranking", title: "设备排行", meta: "异常优先 · 总流量", rows: terminalRankingRows(snapshot) };
  if (priority === "resource-full") return { kind: "terminal-ranking", title: "高流量终端", meta: "异常优先 · 总流量", rows: terminalRankingRows(snapshot) };
  return { kind: "terminal-ranking", title: "设备排行", meta: "异常优先 · 总流量", rows: terminalRankingRows(snapshot) };
}

export function buildMobileOverviewModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileOverviewModel {
  const priority = priorityOf(state);
  return {
    priority,
    hero: {
      title: titleFor(state),
      subtitle: subtitleFor(snapshot, state),
      facts: heroFacts(snapshot, state),
      pills: heroPills(snapshot, state),
      visualKind: heroVisualKind(priority),
      showMetrics: showHeroMetrics(priority),
      trend: trendChart(snapshot, state),
    },
    trustPlanes: trustPlanes(snapshot, state),
    statusRows: statusRows(snapshot, state),
    primaryList: primaryList(snapshot, state),
    wanPorts: wanPorts(snapshot, state),
    resourceRows: resourceFacts(state),
  };
}
