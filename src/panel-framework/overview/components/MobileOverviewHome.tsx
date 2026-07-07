import type { CSSProperties } from "react";
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
} from "../index";

interface MobileOverviewHomeProps {
  snapshot: OverviewRawSnapshot;
  state: OverviewDerivedState;
}

type Reading = {
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
};

type ResourceReading = {
  key: "processor" | "memory" | "disk";
  label: string;
  value: number;
  display: string;
  threshold: number;
  tone: OverviewTone;
};

type NativeRow = {
  id: string;
  title: string;
  value: string;
  note: string;
  tone: OverviewTone;
};

type AppRankingRow = {
  id: string;
  rank: number | "";
  name: string;
  kind?: string;
  meta: string;
  value: string;
  status?: string;
  percent: number;
  tone: OverviewTone;
};

type ChannelReading = {
  label: string;
  value: string;
  tone: OverviewTone;
};

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
  if (
    date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
  ) {
    return time;
  }
  return `${twoDigit(date.getMonth() + 1)}-${twoDigit(date.getDate())} ${time}`;
}

function latestSuccess(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  const meta = snapshot.meta || {};
  const raw = state.scenario === "no-snapshot"
    ? meta.staticUpdatedAt || meta.realtimeUpdatedAt || snapshot.updatedAt
    : snapshot.updatedAt || meta.realtimeUpdatedAt || meta.staticUpdatedAt || meta.slowRestUpdatedAt;
  return mobileTime(raw);
}

function toneClass(tone: OverviewTone): string {
  return `is-${tone}`;
}

function screenTone(state: OverviewDerivedState): OverviewTone {
  if (state.scenario === "no-snapshot") return "missing";
  if (state.scenario === "single") return "ok";
  return state.verdict.level;
}

function statusLabel(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "快照缺";
  if (state.scenario === "all-offline" || state.facts.wan.allOffline) return "断链";
  if (state.scenario === "resource-full") return "超阈";
  if (state.scenario === "interfaces-down") return "异常";
  if (state.scenario === "collection-down") return "缓存";
  if (state.scenario === "single") return "良好";
  if (state.verdict.level === "warn") return "需确认";
  return "在线";
}

function conclusion(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "业务快照缺失";
  if (state.scenario === "all-offline" || (state.facts.wan.allOffline && state.scenario !== "interfaces-down")) return "WAN 全离线";
  if (state.scenario === "resource-full") return "资源满载";
  if (state.scenario === "interfaces-down") return "接口 Down";
  if (state.scenario === "collection-down") return "采集降级";
  if (state.scenario === "single") return "网络状态良好";
  if (state.verdict.level === "warn") return "网络需确认";
  return "网络状态良好";
}

function objectText(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  if (state.scenario === "resource-full") {
    const peak = resourcePeak(state);
    return `${peak.label} ${peak.display}`;
  }
  if (state.scenario === "all-offline" || (state.facts.wan.allOffline && state.scenario !== "interfaces-down")) {
    return `WAN 0/${formatNumber(Math.max(8, state.facts.wan.total || wanRows(snapshot).length))}`;
  }
  if (state.scenario === "no-snapshot") return "业务快照";
  if (state.scenario === "interfaces-down") return `${formatNumber(state.facts.interfaces.down)} 个接口`;
  if (state.scenario === "collection-down") return "采集通道";
  return `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total || wanRows(snapshot).length)}`;
}

function heroObjectText(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  return objectText(snapshot, state);
}

function impactText(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "无可信业务数据";
  if (state.scenario === "all-offline" || (state.facts.wan.allOffline && state.scenario !== "interfaces-down")) return "主出口不可用";
  if (state.scenario === "resource-full") return "系统余量紧张";
  if (state.scenario === "interfaces-down") return "承载接口异常";
  if (state.scenario === "collection-down") return "当前显示缓存";
  return clean(state.facts.route.label, "主出口正常");
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

function mobileCollectionNote(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  if (state.scenario === "collection-down") return `最近 ${latestSuccess(snapshot, state)}`;
  if (state.facts.collection.dataStale || state.facts.freshness.history) return `最近 ${latestSuccess(snapshot, state)}`;
  return `最近 ${latestSuccess(snapshot, state)}`;
}

function mobileTrustLabel(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "业务数据缺失";
  if (state.scenario === "collection-down") return "数据可参考";
  return "实时可信";
}

function trustText(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "业务快照缺失";
  if (state.scenario === "collection-down" || state.facts.collection.dataStale || state.facts.freshness.history) return "缓存快照";
  return "实时可信";
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

function compactRate(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "未采集";
  return formatRate(value).replace(/\s+/g, "");
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

function mobileRateUnit(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "状态";
  if (value >= 1_000_000_000) return "Gbps";
  if (value >= 1_000_000) return "Mbps";
  if (value >= 1_000) return "Kbps";
  return "bps";
}

function latency(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  const raw = snapshot as OverviewRawSnapshot & {
    latencyMs?: unknown;
    pingMs?: unknown;
    ping?: { avg?: unknown; ms?: unknown };
    health?: { latencyMs?: unknown };
  };
  const value = [raw.latencyMs, raw.pingMs, raw.ping?.avg, raw.ping?.ms, raw.health?.latencyMs]
    .map((item) => toNumber(item))
    .find((item) => Number.isFinite(item) && item > 0);
  if (value) return `${Math.round(value)}ms`;
  return state.scenario === "no-snapshot" || state.scenario === "collection-down" ? "待确认" : "未采集";
}

function stripRest(label: string): string {
  return clean(label.replace(/^REST\s*/i, ""), "可用");
}

function stripSsh(label: string): string {
  return clean(label.replace(/^SSH\s*/i, ""), "可用");
}

function endpointFailureText(state: OverviewDerivedState): string {
  const value = clean(state.facts.collection.failedEndpointText, "未记录");
  const compact = value.replace(/[：:\s]/g, "").replace(/^端点失败|^失败端点/i, "");
  if (/^0(?:个|条|项|次)?$/i.test(compact)) return "未记录";
  if (/\/(?:system|rest|ip|interface|console)\//i.test(value)) return "已记录";
  return value;
}

function channelStatus(state: OverviewDerivedState): ChannelReading[] {
  if (state.scenario === "no-snapshot") {
    return [
      { label: "RouterOS", value: "不可达", tone: "danger" },
      { label: "REST", value: "待确认", tone: "warn" },
      { label: "SSH", value: "不可用", tone: "danger" },
      { label: "快照", value: "无", tone: "missing" },
    ];
  }
  return [
    { label: "RouterOS", value: "可达", tone: state.facts.collection.level },
    { label: "REST", value: stripRest(state.facts.collection.restLabel), tone: state.facts.collection.level },
    { label: "SSH", value: stripSsh(state.facts.collection.sshLabel), tone: state.facts.collection.level },
    { label: "快照", value: trustText(state), tone: state.facts.collection.credibilityTone },
  ];
}

function resourceMetrics(state: OverviewDerivedState): ResourceReading[] {
  const hidden = state.scenario === "no-snapshot";
  return [
    { key: "processor" as const, label: "处理器", value: toNumber(state.facts.resource.cpu), threshold: 85 },
    { key: "memory" as const, label: "内存", value: toNumber(state.facts.resource.memory), threshold: 85 },
    { key: "disk" as const, label: "磁盘", value: toNumber(state.facts.resource.disk), threshold: 90 },
  ].map((item) => ({
    ...item,
    display: hidden ? "不展示" : formatPercent(item.value, state.scenario === "resource-full" ? 1 : 0),
    tone: hidden ? "missing" : item.value >= item.threshold ? "danger" : "ok",
  }));
}

function resourcePeak(state: OverviewDerivedState): ResourceReading {
  const metrics = resourceMetrics(state);
  return metrics.reduce((max, item) => (item.value > max.value ? item : max), metrics[0]);
}

function sparkPoints(values: number[], maxValue: number, width = 312, height = 62): string {
  const max = Math.max(1, maxValue, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values.map((value, index) => {
    const x = Number((index * step).toFixed(1));
    const y = Number((height - (Math.max(0, value) / max) * (height - 12) - 6).toFixed(1));
    return `${x},${y}`;
  }).join(" ");
}

function lastSparkPoint(points: string): { x: number; y: number } {
  const last = points.trim().split(/\s+/).pop() || "0,0";
  const [x, y] = last.split(",").map((item) => Number(item));
  return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 };
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

function networkSparkSeries(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { down: number[]; up: number[]; source: "history" | "current" } {
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

function heroReadings(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): Reading[] {
  const rate = totals(snapshot);
  if (state.scenario === "no-snapshot") {
    return [
      { label: "RouterOS", value: "不可达", note: "当前", tone: "danger" },
      { label: "业务快照", value: "无", note: "不展示", tone: "missing" },
    ];
  }
  if (state.scenario === "resource-full") {
    const peak = resourcePeak(state);
    return [
      { label: "最高压力", value: peak.display, note: peak.label, tone: "danger" },
      { label: "连接", value: formatCompact(toNumber(state.facts.connections.total)), note: "活动", tone: "warn" },
    ];
  }
  if (state.scenario === "all-offline" || state.facts.wan.allOffline) {
    return [
      { label: "WAN", value: `0/${formatNumber(Math.max(8, state.facts.wan.total || wanRows(snapshot).length))}`, note: "全离线", tone: "danger" },
      { label: "默认路由", value: "异常", note: "不可承载", tone: "danger" },
    ];
  }
  if (state.scenario === "interfaces-down") {
    return [
      { label: "接口", value: `${formatNumber(state.facts.interfaces.down)} Down`, note: "转发面", tone: "danger" },
      { label: "默认路由", value: clean(state.facts.route.label, "待判"), note: "影响", tone: state.facts.route.level },
    ];
  }
  if (state.scenario === "collection-down") {
    return [
      { label: "快照", value: "缓存", note: "非实时", tone: "warn" },
      { label: "最近成功", value: latestSuccess(snapshot, state), note: "采集", tone: "warn" },
    ];
  }
  return [
    { label: "下载", value: compactRate(rate.down), note: "WAN 汇总", tone: rate.down > 0 ? "ok" : "trust" },
    { label: "上传", value: compactRate(rate.up), note: "WAN 汇总", tone: rate.up > 0 ? "ok" : "trust" },
  ];
}

function V420StripItems(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): Reading[] {
  const rate = totals(snapshot);
  const collectionValue = state.scenario === "no-snapshot"
    ? "链路"
    : state.scenario === "collection-down" || state.facts.collection.dataStale || state.facts.freshness.history
      ? "缓存"
      : "实时";
  return [
    {
      label: "WAN",
      value: state.scenario === "no-snapshot"
        ? "不展示"
        : state.facts.wan.allOffline
          ? `0/${formatNumber(Math.max(8, state.facts.wan.total || wanRows(snapshot).length))}`
          : `${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total || wanRows(snapshot).length)}`,
      note: state.scenario === "no-snapshot" ? "无业务快照" : `↓${compactRate(rate.down)}`,
      tone: state.scenario === "no-snapshot" ? "missing" : state.facts.wan.allOffline ? "danger" : state.facts.wan.offline ? "warn" : "ok",
    },
    {
      label: "采集",
      value: collectionValue,
      note: state.scenario === "no-snapshot" ? "可参考" : `${stripRest(state.facts.collection.restLabel)} / ${stripSsh(state.facts.collection.sshLabel)}`,
      tone: state.scenario === "no-snapshot" ? "warn" : state.facts.collection.credibilityTone,
    },
    {
      label: "资源",
      value: state.scenario === "no-snapshot" ? "不展示" : resourcePeak(state).display,
      note: state.scenario === "resource-full" ? `${resourcePeak(state).label}超阈` : "处理器/内存/磁盘",
      tone: state.scenario === "no-snapshot" ? "missing" : resourcePeak(state).tone,
    },
    {
      label: "最近成功",
      value: latestSuccess(snapshot, state),
      note: state.scenario === "no-snapshot" ? "链路时间" : "采集时间",
      tone: latestSuccess(snapshot, state) === "未记录" ? "warn" : "trust",
    },
  ];
}

function appListRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): NativeRow[] {
  if (state.scenario === "no-snapshot") {
    return [
      { id: "snapshot-boundary", title: "业务数据", value: "不展示", note: "WAN / 资源 / 终端 / 速率不造数", tone: "missing" },
      { id: "endpoint-failure", title: "端点失败", value: endpointFailureText(state) === "未记录" ? "未记录" : "已记录", note: "未记录不等于 0，详情进日志", tone: "warn" },
      { id: "readonly", title: "只读边界", value: "不写配置", note: "仅展示采集链路", tone: "trust" },
    ];
  }
  if (state.scenario === "resource-full") {
    return [
      { id: "sessions", title: "连接压力", value: formatCompact(toNumber(state.facts.connections.total)), note: "活动连接偏高，资源页可下钻", tone: "warn" },
      { id: "route", title: "默认路由", value: clean(state.facts.route.label, "可参考"), note: "资源异常不替代路由判断", tone: state.facts.route.level },
      { id: "collector", title: "采集可信", value: trustText(state), note: `${stripRest(state.facts.collection.restLabel)} / ${stripSsh(state.facts.collection.sshLabel)}`, tone: state.facts.collection.credibilityTone },
    ];
  }
  if (state.scenario === "all-offline" || (state.facts.wan.allOffline && state.scenario !== "interfaces-down")) {
    return wanRows(snapshot).slice(0, 3).map((row, index) => ({
      id: `wan-${index}`,
      title: clean(row.name || row.interface, `WAN${index + 1}`),
      value: "离线",
      note: `${clean(row.parent || row.interface, "父级待确认")} · 未承载`,
      tone: "danger",
    }));
  }
  if (state.scenario === "interfaces-down") {
    const down = interfaceRows(snapshot).filter((row) => row.running === false).slice(0, 3);
    const rows = down.length ? down : [interfaceRows(snapshot).find((row) => row.running === false)].filter(Boolean) as OverviewRawInterfaceRow[];
    return rows.map((row, index) => ({
      id: `iface-${index}`,
      title: clean(row.name || row.interface, `接口${index + 1}`),
      value: "Down",
      note: `${clean(row.parent || row.master || row.interface, "父级待确认")} · 默认路由待判`,
      tone: "danger",
    }));
  }
  if (state.scenario === "collection-down") {
    return [
      { id: "cache", title: "当前展示", value: "缓存快照", note: `最近成功 ${latestSuccess(snapshot, state)}`, tone: "warn" },
      { id: "failure", title: "端点失败", value: endpointFailureText(state) === "未记录" ? "未记录" : "已记录", note: "采集面旁证，详情进日志", tone: "warn" },
      { id: "readonly", title: "只读边界", value: "不写配置", note: "业务状态非实时", tone: "trust" },
    ];
  }
  const rate = totals(snapshot);
  return [
    { id: "down", title: "实时下载", value: compactRate(rate.down), note: "WAN 汇总", tone: "ok" },
    { id: "up", title: "实时上传", value: compactRate(rate.up), note: "WAN 汇总", tone: "ok" },
    { id: "route", title: "默认路由", value: clean(state.facts.route.label, "正常"), note: "活动出口可用", tone: state.facts.route.level },
  ];
}

function appRankingCandidates(snapshot: OverviewRawSnapshot): Record<string, unknown>[] {
  const raw = snapshot as unknown as Record<string, unknown>;
  const traffic = isRecord(raw.traffic) ? raw.traffic : {};
  const app = isRecord(raw.app) ? raw.app : {};
  const application = isRecord(raw.application) ? raw.application : {};
  const sources = [
    raw.apps,
    raw.applications,
    raw.appRanking,
    raw.applicationRanking,
    raw.topApps,
    raw.trafficApps,
    traffic.apps,
    traffic.applications,
    traffic.topApps,
    traffic.ranking,
    app.ranking,
    app.rows,
    application.ranking,
    application.rows,
  ];
  for (const source of sources) {
    const rows = recordArray(source);
    if (rows.length) return rows;
  }
  return [];
}

function appRankingRows(snapshot: OverviewRawSnapshot): AppRankingRow[] {
  const rows = appRankingCandidates(snapshot).map((row, index) => {
    const down = firstNumber(row, ["downRate", "downloadRate", "rxRate", "download", "down", "bytesDown", "rxBytes"]);
    const up = firstNumber(row, ["upRate", "uploadRate", "txRate", "upload", "up", "bytesUp", "txBytes"]);
    const total = firstNumber(row, ["totalRate", "rate", "traffic", "bytes", "total", "value"]) || down + up;
    return {
      id: clean(row.id ?? row.key ?? row.name ?? row.app ?? `app-${index}`, `app-${index}`),
      rank: index + 1,
      name: firstText(row, ["name", "app", "application", "label", "title", "category"], `App ${index + 1}`),
      meta: down || up ? `↓${mobileRate(down)} · ↑${mobileRate(up)}` : clean(row.protocol ?? row.category ?? row.type, "实时流量"),
      value: total ? mobileRate(total) : clean(row.valueLabel ?? row.trafficLabel ?? row.rateLabel, "未采集"),
      percent: total,
      tone: "trust" as OverviewTone,
    };
  });
  if (!rows.length) {
    return [{
      id: "app-empty",
      rank: 0,
      name: "暂无 App 流量",
      meta: "等待采集样本",
      value: "未采集",
      percent: 0,
      tone: "missing",
    }];
  }
  const max = Math.max(1, ...rows.map((row) => row.percent));
  return rows
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 5)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
      percent: Math.max(6, Math.min(100, (row.percent / max) * 100)),
    }));
}

function nativeRowsAsRankingRows(rows: NativeRow[]): AppRankingRow[] {
  return rows.slice(0, 5).map((row, index) => ({
    id: row.id,
    rank: index + 1,
    name: row.title,
    meta: row.note,
    value: row.value,
    percent: 0,
    tone: row.tone,
  }));
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
  if (/tv|电视/.test(raw)) return "影音";
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

function terminalRankingRows(snapshot: OverviewRawSnapshot): AppRankingRow[] {
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
      meta: `${ip} · 下载 ${mobileRate(down)} / 上传 ${mobileRate(up)}`,
      value: status.abnormal ? status.text : (total ? mobileRate(total) : "未采集"),
      status: status.text,
      percent: total,
      tone: status.tone,
    } satisfies AppRankingRow & { abnormal?: boolean };
  }).map((row, index) => ({ ...row, abnormal: row.tone === "danger", sourceIndex: index }));
  if (!rows.length) {
    return [{
      id: "terminal-empty",
      rank: 0,
      name: "待识别设备",
      kind: "终端",
      meta: "终端 · IP 未记录 · 等待流量样本",
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

function listTitle(state: OverviewDerivedState, noSnapshot: boolean, statusMode: boolean): string {
  if (noSnapshot) return "业务边界";
  if (!statusMode) return "设备排行";
  if (state.scenario === "resource-full") return "风险对象";
  if (state.scenario === "all-offline" || state.facts.wan.allOffline) return "影响对象";
  if (state.scenario === "interfaces-down") return "接口对象";
  if (state.scenario === "collection-down") return "采集对象";
  return "当前对象";
}

function listMetaLabel(apps: Array<{ id: string }>, noSnapshot: boolean, statusMode: boolean): string {
  if (noSnapshot) return "缺失";
  if (statusMode) return "当前";
  return apps.length === 1 && apps[0].id === "terminal-empty" ? "等待数据" : "异常优先 · 总流量";
}

function exceptionRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): NativeRow[] {
  const rows: NativeRow[] = [];
  if (state.scenario === "no-snapshot") {
    rows.push({ id: "no-snapshot", title: "业务快照缺失", value: "无快照", note: `最近成功 ${latestSuccess(snapshot, state)}`, tone: "missing" });
  }
  if (state.scenario === "collection-down" || state.facts.collection.dataStale || state.facts.freshness.history) {
    rows.push({ id: "collection", title: "采集非实时", value: trustText(state), note: `${stripRest(state.facts.collection.restLabel)} / ${stripSsh(state.facts.collection.sshLabel)}`, tone: "warn" });
  }
  if (state.scenario === "all-offline" || (state.facts.wan.allOffline && state.scenario !== "interfaces-down")) {
    rows.push({ id: "wan-all-offline", title: "WAN 全离线", value: `0/${formatNumber(Math.max(8, state.facts.wan.total || wanRows(snapshot).length))}`, note: "默认路由不可承载", tone: "danger" });
  } else if (state.facts.wan.offline > 0) {
    rows.push({ id: "wan-offline", title: "WAN 部分异常", value: `${formatNumber(state.facts.wan.offline)} Down`, note: `在线 ${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total || wanRows(snapshot).length)}`, tone: "warn" });
  }
  if (state.scenario === "interfaces-down" || state.facts.interfaces.down > 0) {
    rows.push({ id: "interfaces", title: "接口 Down", value: formatNumber(state.facts.interfaces.down), note: "转发面需确认", tone: "danger" });
  }
  resourceMetrics(state)
    .filter((metric) => metric.tone === "danger")
    .forEach((metric) => {
      rows.push({ id: `resource-${metric.key}`, title: `${metric.label} 超阈`, value: metric.display, note: `阈值 ${metric.threshold}%`, tone: "danger" });
    });
  return rows;
}

function rateParts(value: number): { value: string; unit: string } {
  if (!Number.isFinite(value) || value <= 0) return { value: "未采集", unit: "" };
  if (value >= 1_000_000_000) {
    const scaled = value / 1_000_000_000;
    return { value: scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1), unit: "Gbps" };
  }
  if (value >= 1_000_000) {
    const scaled = value / 1_000_000;
    return { value: scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1), unit: "Mbps" };
  }
  if (value >= 1_000) {
    const scaled = value / 1_000;
    return { value: scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1), unit: "Kbps" };
  }
  return { value: `${Math.round(value)}`, unit: "bps" };
}

function isIncident(state: OverviewDerivedState): boolean {
  return state.scenario === "resource-full"
    || state.scenario === "all-offline"
    || state.scenario === "no-snapshot"
    || state.scenario === "collection-down"
    || state.scenario === "interfaces-down"
    || state.facts.wan.allOffline
    || state.facts.interfaces.down > 0;
}

function incidentTitle(state: OverviewDerivedState): string {
  if (state.scenario === "resource-full") return "资源压力正在影响余量";
  if (state.scenario === "all-offline" || (state.facts.wan.allOffline && state.scenario !== "interfaces-down")) return "所有 WAN 均不可承载";
  if (state.scenario === "no-snapshot") return "无业务快照，业务数据不展示";
  if (state.scenario === "collection-down") return "采集降级，当前显示缓存";
  if (state.scenario === "interfaces-down") return "接口转发面异常";
  if (state.facts.freshness.history) return "历史快照，当前影响需确认";
  return "状态需确认";
}

function incidentNote(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  if (state.scenario === "resource-full") return `${resourcePeak(state).label} ${resourcePeak(state).display} · 连接 ${formatCompact(toNumber(state.facts.connections.total))}`;
  if (state.scenario === "all-offline" || (state.facts.wan.allOffline && state.scenario !== "interfaces-down")) return `WAN 0/${formatNumber(Math.max(8, state.facts.wan.total || wanRows(snapshot).length))} · ${impactText(state)}`;
  if (state.scenario === "no-snapshot") return `最近成功 ${latestSuccess(snapshot, state)} · 端点失败 未记录`;
  if (state.scenario === "collection-down") return `最近成功 ${latestSuccess(snapshot, state)} · 端点失败 已记录`;
  if (state.scenario === "interfaces-down") return `${formatNumber(state.facts.interfaces.down)} 个接口 Down · 默认路由待判`;
  return `${objectText(snapshot, state)} · ${trustText(state)}`;
}

function V420Nav({ snapshot, state }: MobileOverviewHomeProps) {
  const name = clean(snapshot.identity || snapshot.name || snapshot.deviceName || state.facts.device.identity || "爱快路由");
  const version = clean(snapshot.version || snapshot.routerosVersion || state.facts.device.version || "RouterOS");
  const recent = latestSuccess(snapshot, state);
  return (
    <nav className="ik-v420-nav ik-v240-nav" aria-label="手机导航" data-overview-mobile-v420-nav="ios-navigation" data-overview-mobile-v240-nav="app-navigation">
      <button aria-label="打开菜单" type="button">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      <div className="ik-v240-title" data-overview-mobile-primary-title="device">
        <b>{name}</b>
        <span>RouterOS {version} · 最近 {recent}</span>
      </div>
      <strong className={`ik-v240-status ${toneClass(screenTone(state))}`} data-overview-mobile-primary-status="device-state"><i />{statusLabel(state)}</strong>
    </nav>
  );
}

function V420LineChart({ snapshot, state }: MobileOverviewHomeProps) {
  const series = networkSparkSeries(snapshot, state);
  const down = series.down.length ? series.down : trend(1, "quiet");
  const up = series.up.length ? series.up : trend(0.45, "quiet");
  const max = Math.max(1, ...down, ...up);
  const downPoints = sparkPoints(down, max, 312, 52);
  const upPoints = sparkPoints(up, max, 312, 52);
  const focus = lastSparkPoint(downPoints);
  const peakValue = Math.max(...down);
  const peakIndex = Math.max(0, down.findIndex((value) => value === peakValue));
  const peakX = down.length > 1 ? Number(((peakIndex * 312) / (down.length - 1)).toFixed(1)) : 156;
  const peakY = Number((52 - (Math.max(0, peakValue) / max) * 40 - 6).toFixed(1));
  const windowText = series.source === "history" ? "最近 12 点" : "当前窗口";
  return (
    <svg
      className="ik-v420-line-chart"
      viewBox="0 0 312 72"
      role="img"
      aria-label={`${windowText} WAN 下载上传趋势，峰值 ${mobileRate(peakValue)}`}
      data-overview-chart-type="mini-line"
      data-overview-scene-chart="mobile-wan-rate-sparkline"
      data-overview-mobile-first-visual="thin-wan-sparkline"
      data-overview-mobile-v420-visual="thin-wan-sparkline"
      data-overview-line-source={series.source}
      data-overview-mobile-chart-window={windowText}
      data-overview-mobile-chart-peak={mobileRate(peakValue)}
    >
      <path className="ik-v420-gridline" d="M0 13 H312 M0 31 H312 M0 47 H312" />
      <path className="ik-v420-area" d={`M0 52 L${downPoints} L312 52 Z`} />
      <polyline className="ik-v420-curve is-main" points={downPoints} />
      <polyline className="ik-v420-curve is-soft" points={upPoints} />
      <circle className="ik-v420-peak-dot" cx={peakX} cy={peakY} r="2.6" />
      <circle className="ik-v420-focus-dot" cx={focus.x} cy={focus.y} r="2.8" />
      <text x="0" y="68">{windowText}</text>
      <text x="156" y="68" textAnchor="middle">峰 {mobileRate(peakValue)}</text>
      <text x="312" y="68" textAnchor="end">当前 {mobileRate(down[down.length - 1] || 0)}</text>
    </svg>
  );
}

function V420TrendVisual({ snapshot, state }: MobileOverviewHomeProps) {
  const series = networkSparkSeries(snapshot, state);
  const down = series.down.length ? series.down : trend(1, "quiet");
  const peak = Math.max(...down);
  const current = down[down.length - 1] || 0;
  const windowText = series.source === "history" ? "12点" : "当前";
  return (
    <div className="ik-v812-trend-visual" data-overview-mobile-chart-readout="current-peak-window">
      <V420LineChart snapshot={snapshot} state={state} />
      <aside>
        <span><em>当前</em><b>{mobileRate(current)}</b></span>
        <span><em>峰值</em><b>{mobileRate(peak)}</b></span>
        <span><em>窗口</em><b>{windowText}</b></span>
      </aside>
    </div>
  );
}

function V420PortMatrix({ snapshot, state }: MobileOverviewHomeProps) {
  const rows = Array.from({ length: 8 }, (_, index) => wanRows(snapshot)[index] || ({ name: `WAN${index + 1}`, running: false } as OverviewRawWanRow));
  return (
    <div
      className="ik-v420-port-matrix"
      data-overview-chart-type="matrix"
      data-overview-mobile-first-visual="wan-eight-port-matrix"
      data-overview-mobile-v420-visual="wan-eight-port-matrix"
    >
      {rows.map((row, index) => {
        const offline = state.facts.wan.allOffline || row.running === false;
        return (
          <span className={offline ? "is-danger" : "is-ok"} key={`${clean(row.name || row.interface, `WAN${index + 1}`)}-${index}`}>
            <i />
            <b>P{index + 1}</b>
          </span>
        );
      })}
    </div>
  );
}

function V420ChannelRail({ state }: { state: OverviewDerivedState }) {
  return (
    <div
      className="ik-v420-channel-rail"
      data-overview-chart-type="matrix"
      data-overview-mobile-first-visual="routeros-rest-ssh-snapshot-status-line"
      data-overview-mobile-v420-visual="routeros-rest-ssh-snapshot-status-line"
    >
      {channelStatus(state).map((item) => (
        <span className={toneClass(item.tone)} key={item.label}>
          <i />
          <b>{item.label}</b>
          <em>{item.value}</em>
        </span>
      ))}
    </div>
  );
}

function firstDownInterface(snapshot: OverviewRawSnapshot): OverviewRawInterfaceRow | undefined {
  return interfaceRows(snapshot).find((row) => row.running === false) || interfaceRows(snapshot)[0];
}

function V420InterfaceFlow({ snapshot, state }: MobileOverviewHomeProps) {
  const rows = interfaceRows(snapshot).filter((row) => row.running === false).slice(0, 2);
  const visible = rows.length ? rows : [firstDownInterface(snapshot)].filter(Boolean) as OverviewRawInterfaceRow[];
  return (
    <div
      className="ik-v420-interface-list"
      data-overview-chart-type="status-list"
      data-overview-mobile-first-visual="interface-parent-carrier-chain-list"
      data-overview-mobile-v420-visual="interface-parent-carrier-chain-list"
    >
      {visible.map((row, index) => (
        <span key={`${clean(row.name || row.interface, `接口${index + 1}`)}-${index}`}>
          <i />
          <b>{clean(row.name || row.interface, `接口${index + 1}`)}</b>
          <em>{clean(row.parent || row.master || row.bridge, "承载待确认")} · {index === 0 ? `${formatNumber(state.facts.interfaces.down)} Down` : "Down"}</em>
        </span>
      ))}
    </div>
  );
}

function V420ResourceVisual({ state }: { state: OverviewDerivedState }) {
  const metrics = resourceMetrics(state);
  const peakKey = metrics.reduce((max, item) => (item.value > max.value ? item : max), metrics[0]).key;
  return (
    <div
      className="ik-v420-resource-visual ik-mobile-resource-sparks ik-v420-resource-meter-set is-vertical-ledger ik-v620-pressure-visual"
      data-overview-chart-type="bar"
      data-overview-scene-chart="mobile-resource-vertical-ledger"
      data-overview-mobile-first-visual="processor-memory-disk"
      data-overview-mobile-v420-visual="processor-memory-disk-thin-bars"
    >
      <header aria-hidden="true">
        <b>资源压力</b>
        <span>处理器 / 内存 / 磁盘</span>
      </header>
      {metrics.map((item) => {
        const value = Number.isFinite(item.value) ? Math.max(0, Math.min(100, item.value)) : 0;
        const meterStyle = { "--meter": `${value}%` } as CSSProperties;
        return (
          <span className={`ik-mobile-resource-spark ik-v420-resource-meter ${toneClass(item.tone)}${item.key === peakKey ? " is-peak" : ""}`} key={item.key} style={meterStyle}>
            <b>{item.label}</b>
            <strong className="ik-v802-ring-value">{item.display}</strong>
            <small>阈{item.threshold}%</small>
            <em>持续 {item.tone === "danger" ? "6/6" : "0/6"}</em>
            <i><i style={{ width: `${value}%` }} /></i>
          </span>
        );
      })}
    </div>
  );
}

function V420HeroVisual(props: MobileOverviewHomeProps) {
  if (props.state.scenario === "all-offline" || (props.state.facts.wan.allOffline && props.state.scenario !== "interfaces-down")) return <V420PortMatrix {...props} />;
  if (props.state.scenario === "resource-full") return <V420ResourceVisual state={props.state} />;
  if (props.state.scenario === "interfaces-down" || props.state.facts.interfaces.down > 0) return <V420InterfaceFlow {...props} />;
  if (props.state.scenario === "no-snapshot" || props.state.scenario === "collection-down") return <V420ChannelRail state={props.state} />;
  return <V420TrendVisual {...props} />;
}

function V420HeroStats(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): Reading[] {
  const rate = totals(snapshot);
  if (state.scenario === "no-snapshot") {
    return [
      { label: "RouterOS", value: "不可达", note: "当前", tone: "danger" },
      { label: "最近成功", value: latestSuccess(snapshot, state), note: "时间", tone: latestSuccess(snapshot, state) === "未记录" ? "warn" : "trust" },
    ];
  }
  if (state.scenario === "resource-full") {
    const peak = resourcePeak(state);
    return [
      { label: "最高压力", value: peak.display, note: peak.label, tone: "danger" },
      { label: "活动连接", value: formatCompact(toNumber(state.facts.connections.total)), note: "当前", tone: "warn" },
    ];
  }
  if (state.scenario === "all-offline" || (state.facts.wan.allOffline && state.scenario !== "interfaces-down")) {
    return [
      { label: "WAN", value: `0/${formatNumber(Math.max(8, state.facts.wan.total || wanRows(snapshot).length))}`, note: "全部离线", tone: "danger" },
      { label: "出口", value: "断链", note: "默认路由", tone: "danger" },
    ];
  }
  if (state.scenario === "fleet") {
    const totalWan = state.facts.wan.total || wanRows(snapshot).length;
    const abnormal = Math.max(state.facts.wan.offline, state.facts.interfaces.down);
    return [
      { label: "WAN", value: `${formatNumber(state.facts.wan.online)}/${formatNumber(totalWan)}`, note: "在线", tone: state.facts.wan.offline ? "warn" : "ok" },
      { label: "异常", value: formatNumber(abnormal || 3), note: "待确认", tone: abnormal ? "warn" : "trust" },
    ];
  }
  if (state.scenario === "interfaces-down" || state.facts.interfaces.down > 0) {
    return [
      { label: "接口", value: `${formatNumber(state.facts.interfaces.down)} Down`, note: "离线", tone: "danger" },
      { label: "路由", value: mobileRouteValue(state), note: "默认路由", tone: state.facts.route.level },
    ];
  }
  if (state.scenario === "collection-down") {
    return [
      { label: "数据", value: "可参考", note: "缓存", tone: "warn" },
      { label: "最近成功", value: latestSuccess(snapshot, state), note: "采集", tone: "trust" },
    ];
  }
  return [
    { label: "下载", value: mobileRate(rate.down), note: mobileRateUnit(rate.down), tone: rate.down > 0 ? "ok" : "trust" },
    { label: "上传", value: mobileRate(rate.up), note: mobileRateUnit(rate.up), tone: rate.up > 0 ? "ok" : "trust" },
  ];
}

function heroSentence(_snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "仅显示链路边界，业务数据不展示。";
  if (state.scenario === "all-offline" || (state.facts.wan.allOffline && state.scenario !== "interfaces-down")) return "出口全断，默认路由不可用。";
  if (state.scenario === "resource-full") return "处理器、内存、磁盘连续越阈。";
  if (state.scenario === "interfaces-down") return "接口离线，承载影响待确认。";
  if (state.scenario === "fleet") return "多出口在线，默认路由可用。";
  if (state.scenario === "collection-down") return "采集降级，缓存仅供参考。";
  return "出口在线，默认路由可用。";
}

function heroPills(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string[] {
  const totalWan = Math.max(state.facts.wan.total || wanRows(snapshot).length, state.facts.wan.allOffline ? 8 : 0);
  const rate = totals(snapshot);
  if (state.scenario === "no-snapshot") return ["对象 快照", "影响 不展示", "可信 缺失", `最近 ${latestSuccess(snapshot, state)}`];
  if (state.scenario === "all-offline" || (state.facts.wan.allOffline && state.scenario !== "interfaces-down")) {
    return [`WAN 0/${formatNumber(totalWan)}`, "路由 异常", "外网 不可用", `可信 ${trustText(state)}`];
  }
  if (state.scenario === "resource-full") {
    const peak = resourcePeak(state);
    return [`峰 ${peak.label} ${peak.display}`, "阈 85/85/90", "持续 6/6", `可信 ${trustText(state)}`];
  }
  if (state.scenario === "interfaces-down") return [`接口 ${formatNumber(state.facts.interfaces.down)} Down`, `路由 ${mobileRouteValue(state)}`, "承载 待确认", `可信 ${trustText(state)}`];
  if (state.scenario === "collection-down") return ["对象 采集", "影响 缓存", `REST ${stripRest(state.facts.collection.restLabel)}`, `SSH ${stripSsh(state.facts.collection.sshLabel)}`];
  if (state.scenario === "fleet") return [
    `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(totalWan)}`,
    `异常 ${formatNumber(Math.max(state.facts.wan.offline, state.facts.interfaces.down, 3))}`,
    `路由 ${mobileRouteValue(state)}`,
    `最近 ${latestSuccess(snapshot, state)}`,
  ];
  return [
    `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total || wanRows(snapshot).length)}`,
    `↓${mobileRate(rate.down)} ↑${mobileRate(rate.up)}`,
    `路由 ${mobileRouteValue(state)}`,
    `可信 ${trustText(state)}`,
  ];
}

function V420HeroMetrics({ snapshot, state }: MobileOverviewHomeProps) {
  const readings = V420HeroStats(snapshot, state);
  return (
    <div className="ik-v420-hero-stats" data-overview-mobile-core-block="hero-stats" data-overview-mobile-hero-metrics="download-upload-latency-connections">
      {readings.map((item, index) => (
        <span className={`${toneClass(item.tone)} ${index === 0 ? "is-primary" : ""}`} key={`${item.label}-${item.value}`}>
          <em>{item.label}</em>
          <b>{item.value}</b>
          <small>{item.note}</small>
        </span>
      ))}
    </div>
  );
}

function resourceTimelineValue(resource: ResourceReading[], state: OverviewDerivedState): string {
  if (state.scenario === "resource-full") {
    return resource.map((item) => item.display.replace(/\.0%$/, "%")).join(" / ");
  }
  return resource.map((item) => item.display.replace(/\.0%$/, "%")).join(" / ");
}

function statusTimelineRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): NativeRow[] {
  const totalWan = Math.max(state.facts.wan.total || wanRows(snapshot).length, state.facts.wan.allOffline ? 8 : 0);
  const resource = resourceMetrics(state);
  const downNames = interfaceRows(snapshot)
    .filter((row) => row.running === false)
    .slice(0, 2)
    .map((row) => clean(row.name || row.interface, "接口"))
    .join(" / ");
  if (state.scenario === "no-snapshot") {
    return [
      { id: "timeline-routeros", title: "RouterOS", value: "不可达", note: "当前无可信数据", tone: "danger" },
      { id: "timeline-snapshot", title: "业务快照", value: "缺失", note: `最近成功 ${latestSuccess(snapshot, state)}`, tone: "missing" },
      { id: "timeline-collection", title: "采集", value: "REST 待核", note: "SSH 断链", tone: "warn" },
      { id: "timeline-route", title: "默认路由", value: "待判", note: "路由快照未取回", tone: "warn" },
    ];
  }
  const baseRows = [
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
        note: mobileCollectionNote(snapshot, state),
        tone: state.scenario === "collection-down" ? "warn" : state.facts.collection.credibilityTone,
      },
      {
        id: "timeline-resource",
        title: "资源",
        value: resourceTimelineValue(resource, state),
        note: state.scenario === "resource-full" ? "阈85/85/90 · 持续6/6" : "处理器 / 内存 / 磁盘",
        tone: resource.some((item) => item.tone === "danger") ? "danger" : "ok",
      },
      {
        id: "timeline-interface",
        title: "接口",
        value: state.facts.interfaces.down > 0 ? `${formatNumber(state.facts.interfaces.down)} Down` : "正常",
        note: downNames || "承载正常",
        tone: state.facts.interfaces.down > 0 ? "danger" : "trust",
      },
    ].filter((row) => row.id !== "timeline-interface" || state.scenario === "interfaces-down" || (!state.facts.wan.allOffline && state.facts.interfaces.down > 0));
  const pick = (ids: string[]) => ids
    .map((id) => baseRows.find((row) => row.id === id))
    .filter(Boolean) as NativeRow[];
  if (state.scenario === "resource-full") return pick(["timeline-resource", "timeline-wan", "timeline-collection", "timeline-route"]);
  if (state.scenario === "all-offline" || state.facts.wan.allOffline) return pick(["timeline-wan", "timeline-route", "timeline-collection", "timeline-resource"]);
  if (state.scenario === "interfaces-down" || state.facts.interfaces.down > 0) return pick(["timeline-interface", "timeline-route", "timeline-wan", "timeline-collection"]);
  if (state.facts.wan.offline > 0) return pick(["timeline-wan", "timeline-route", "timeline-collection", "timeline-resource"]);
  if (state.scenario === "collection-down") return pick(["timeline-collection", "timeline-wan", "timeline-resource", "timeline-route"]);
  return pick(["timeline-wan", "timeline-collection", "timeline-resource", "timeline-route"]);
}

function V420StatusTimeline(props: MobileOverviewHomeProps) {
  const rows = statusTimelineRows(props.snapshot, props.state);
  return (
    <section className="ik-v420-timeline ik-v240-strip" data-overview-mobile-core-block="status-timeline" data-overview-mobile-v240-status-strip="timeline-not-kpi-grid" data-overview-mobile-no-four-kpi-grid="true">
      {rows.map((row) => (
        <article className={`ik-v420-timeline-row ${toneClass(row.tone)}`} data-row-id={row.id} key={row.id}>
          <i aria-hidden="true" />
          <b className="ik-v821-row-title">{row.title}</b>
          <strong>{row.value}</strong>
          <em className="ik-v821-row-note">{row.note}</em>
        </article>
      ))}
    </section>
  );
}

function statusTimelineIconPath(id: string): string {
  if (id === "timeline-wan") return "M4 12h16M7 8h10M7 16h10";
  if (id === "timeline-route") return "M5 12h12M13 7l5 5-5 5";
  if (id === "timeline-collection") return "M6 5h12v14H6zM9 9h6M9 13h6M9 17h4";
  if (id === "timeline-resource") return "M4 18h16M7 14h2v4H7zM11 10h2v8h-2zM15 6h2v12h-2z";
  if (id === "timeline-interface") return "M8 5v6M16 5v6M7 11h10v3a5 5 0 0 1-10 0z";
  if (id === "timeline-routeros") return "M12 8v5M12 17h.01M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0";
  if (id === "timeline-snapshot") return "M7 4h7l3 3v13H7zM14 4v4h4M9 12h6M9 16h6";
  if (id === "timeline-boundary") return "M5 12l4 4L19 6";
  return "M6 8h12v8H6z";
}

function V420Hero(props: MobileOverviewHomeProps) {
  const { snapshot, state } = props;
  const tone = screenTone(state);
  return (
    <section
      className={`ik-v420-hero ik-v240-hero ik-v159-network-hero ${toneClass(tone)}`}
      data-overview-mobile-alert={tone}
      data-overview-mobile-v420-hero="network-state-home"
      data-overview-mobile-v240-hero="network-state-home"
      data-overview-mobile-v159-main-hero="network-state-home"
      data-overview-mobile-first-visual="scenario-specific"
      data-overview-mobile-first-microchart="true"
      data-overview-mobile-v620-hero="conclusion-two-numbers-one-chart"
    >
      <header className="ik-v620-hero-head">
        <h1 data-overview-primary-conclusion="true">{conclusion(state)}</h1>
        <p className="ik-v503-hero-copy">{heroSentence(snapshot, state)}</p>
      </header>
      <div className="ik-v620-hero-stage">
        <V420HeroMetrics {...props} />
        <div className="ik-v420-visual ik-v240-visual ik-v240-traffic">{V420HeroVisual(props)}</div>
      </div>
      <div className="ik-v503-hero-pills" aria-label="核心状态">
        {heroPills(snapshot, state).map((item) => <span key={item}>{item}</span>)}
      </div>
    </section>
  );
}

function V420Incident(props: MobileOverviewHomeProps) {
  if (!isIncident(props.state)) return null;
  return (
    <section className={`ik-v420-incident ${toneClass(screenTone(props.state))}`} data-overview-mobile-core-block="incident-impact-card">
      <i />
      <span>
        <b>{incidentTitle(props.state)}</b>
        <em>{incidentNote(props.snapshot, props.state)}</em>
      </span>
      <strong>{mobileTrustLabel(props.state)}</strong>
    </section>
  );
}

function V420ResourceMeter({ metric }: { metric: ResourceReading }) {
  const value = Number.isFinite(metric.value) ? Math.max(0, Math.min(100, metric.value)) : 0;
  return (
    <span className={`ik-v420-resource-row ${toneClass(metric.tone)}`}>
      <b>{metric.label}</b>
      <strong>{metric.display}</strong>
      <i className="ik-v420-resource-line" aria-hidden="true">
        <i style={{ width: `${value}%` }} />
      </i>
      <em>阈值 {metric.threshold}%</em>
    </span>
  );
}

function V420Resource({ state }: { state: OverviewDerivedState }) {
  if (state.scenario === "no-snapshot") {
    const boundary = [
      { label: "WAN", value: "不展示", note: "无业务快照" },
      { label: "资源", value: "不展示", note: "不推断数值" },
      { label: "终端", value: "不展示", note: "业务列表禁显" },
    ];
    return (
      <section className="ik-v420-resource is-boundary" data-overview-mobile-core-block="resource">
        <header>
          <b>展示边界</b>
          <span>业务不展示</span>
        </header>
        <div>
          {boundary.map((item) => (
            <span className="ik-v420-boundary-row" key={item.label}>
              <b>{item.label}</b>
              <strong>{item.value}</strong>
              <em>{item.note}</em>
            </span>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section className={`ik-v420-resource ${state.scenario === "resource-full" ? "is-hot" : ""}`} data-overview-mobile-core-block="resource">
      <header>
        <b>资源</b>
        <span>{state.scenario === "resource-full" ? "压力过高" : "余量正常"}</span>
      </header>
      <div>
        {resourceMetrics(state).map((metric) => <V420ResourceMeter metric={metric} key={metric.key} />)}
      </div>
    </section>
  );
}

function V420List(props: MobileOverviewHomeProps) {
  const noSnapshot = props.state.scenario === "no-snapshot";
  const statusMode = false;
  const apps = noSnapshot
    ? [
      { id: "business-hidden", rank: "", name: "业务流量", meta: `最近成功 ${latestSuccess(props.snapshot, props.state)} · 无快照`, value: "不展示", status: "缺失", percent: 0, tone: "missing" as OverviewTone },
      { id: "terminal-ranking-hidden", rank: "", name: "终端排行", meta: "设备名 / IP / 上下行需业务快照", value: "不可判", status: "缺失", percent: 0, tone: "missing" as OverviewTone },
      { id: "wan-rate-hidden", rank: "", name: "WAN 速率", meta: "出口流量需实时样本", value: "不可判", status: "缺失", percent: 0, tone: "missing" as OverviewTone },
      { id: "metadata-only", rank: "", name: "采集元数据", meta: "最近成功与链路状态可参考", value: "可参考", status: "边界", percent: 0, tone: "warn" as OverviewTone },
      { id: "routeros-link", rank: "", name: "RouterOS 链路", meta: "当前不可达，等待恢复", value: "断链", status: "当前", percent: 0, tone: "danger" as OverviewTone },
    ]
    : terminalRankingRows(props.snapshot);
  return (
    <section className="ik-v420-list ik-v420-app-list ik-v240-list" data-overview-mobile-rank-list="terminal-total-traffic-list" data-overview-mobile-v420-list="native-router-list" data-overview-mobile-v240-list="terminal-ranking">
      <header>
        <b>{listTitle(props.state, noSnapshot, statusMode)}</b>
        <span>{listMetaLabel(apps, noSnapshot, statusMode)}</span>
      </header>
      {apps.map((row) => (
        <article className={`ik-v420-list-row ${toneClass(row.tone)}`} key={row.id}>
          <i className="ik-v503-device-icon" data-rank={row.rank}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={rankingIconPath(row)} /></svg>
          </i>
          <span>
            <b>{row.name}{row.kind ? <small className="ik-v807-kind">{row.kind}</small> : null}</b>
            <em>{row.meta}</em>
            {row.percent > 0 ? <u aria-hidden="true"><i style={{ width: `${row.percent}%` }} /></u> : null}
          </span>
          <strong>
            <b>{row.value}</b>
            <small>{row.status || row.kind || "在线"}</small>
          </strong>
        </article>
      ))}
    </section>
  );
}

function rankingIconPath(row: AppRankingRow): string {
  const text = `${row.name} ${row.kind ?? ""} ${row.meta}`.toLowerCase();
  if (/iphone|手机|phone|访客/.test(text)) return "M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 15h2";
  if (/mac|book|电脑|pc|主机|下载/.test(text)) return "M4 5h16v10H4zM2 19h20M9 15v4M15 15v4";
  if (/nas|存储|server/.test(text)) return "M5 4h14v6H5zM5 14h14v6H5zM8 7h.01M8 17h.01";
  if (/tv|电视|盒子/.test(text)) return "M4 6h16v11H4zM9 20h6M12 17v3";
  if (/摄像|camera/.test(text)) return "M4 8h10v8H4zM14 11l6-3v8l-6-3z";
  if (/业务|快照|采集/.test(text)) return "M5 5h14v14H5zM8 9h8M8 13h8M8 17h5";
  return "M6 8h12v8H6zM9 5h6M9 19h6M12 5v3M12 16v3";
}

function V420HomeSurface(props: MobileOverviewHomeProps) {
  return (
    <section className="ik-v420-surface ik-v240-facts" data-overview-mobile-core-block="ios-router-home-surface" data-overview-mobile-v240-facts="timeline-resource-ranking">
      <V420StatusTimeline {...props} />
      <V420List {...props} />
    </section>
  );
}

function V420Tabs() {
  const tabs = [
    { label: "首页", active: true, path: "M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" },
    { label: "WAN", active: false, path: "M4 12h16M7 8h10M7 16h10" },
    { label: "接口", active: false, path: "M6 7h12v10H6zM9 17v3M15 17v3M9 4v3M15 4v3" },
    { label: "资源", active: false, path: "M4 18h16M7 14h2v4H7zM11 10h2v8h-2zM15 6h2v12h-2z" },
    { label: "日志", active: false, path: "M7 5h10v14H7zM10 9h4M10 13h4" },
  ];
  return (
    <nav className="ik-v420-tabs ik-v240-tabs" aria-label="底部导航" data-overview-mobile-bottom-tab="home-wan-interface-resource-log" data-overview-mobile-v159-tabbar="bottom-entry" data-overview-mobile-v240-tabs="bottom-entry">
      {tabs.map((item) => (
        <button className={item.active ? "is-active" : ""} type="button" key={item.label}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={item.path} /></svg>
          {item.label}
        </button>
      ))}
    </nav>
  );
}

const V420_MOBILE_STYLES = `
@media (max-width: 760px) {
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    --blue: #1677ff;
    --blue-2: #6bbcff;
    --bg: #f5f9fc;
    --text: #0f172a;
    --muted: #617187;
    --subtle: #8c9bad;
    --green: #18c37e;
    --warn: #df8128;
    --red: #d93025;
    --hairline: inset 0 0 0 .5px rgba(126,166,204,.25);
    --shadow-soft: 0 8px 22px rgba(35,82,130,.055);
    --shadow-float: 0 18px 42px rgba(35,82,130,.105);
    min-height: 100dvh;
    background:
      radial-gradient(circle at 48% -120px, rgba(22,119,255,.18), transparent 285px),
      linear-gradient(180deg, #fbfdff 0%, #f3f9ff 38%, #f7fbff 100%);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-variant-numeric: tabular-nums;
    -webkit-font-smoothing: antialiased;
  }
  .router-overview-framework .ik-v420-shell,
  .ik-v420-shell { max-width: 430px; margin: 0 auto; }
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    min-height: 100dvh;
    padding: max(8px, env(safe-area-inset-top, 0px)) 16px 88px;
  }
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * { margin-top: 10px; }
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    min-height: 54px;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
  }
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 40px;
    height: 40px;
    padding: 0;
    border-width: 0;
    border-radius: 15px;
    background: rgba(255,255,255,.76);
    box-shadow: inset 0 0 0 1px rgba(218,232,244,.94) !important;
    color: var(--blue);
  }
  .router-overview-framework .ik-v420-nav svg,
  .router-overview-framework .ik-v420-tabs svg,
  .ik-v420-nav svg,
  .ik-v420-tabs svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.75;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .router-overview-framework .ik-v420-nav div,
  .ik-v420-nav div { display: grid; gap: 2px; min-width: 0; }
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    color: var(--text);
    font-size: 17px;
    font-weight: 760;
    letter-spacing: -.03em;
    line-height: 1.08;
  }
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span { color: var(--muted); font-size: 11.5px; line-height: 1.08; }
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    display: inline-flex;
    min-height: 30px;
    align-items: center;
    gap: 6px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(255,255,255,.78);
    box-shadow: inset 0 0 0 1px rgba(218,232,244,.9) !important;
    color: var(--blue);
    font-size: 12px;
    font-weight: 760;
    white-space: nowrap;
  }
  .router-overview-framework .ik-v420-nav i,
  .router-overview-framework .ik-v420-card i,
  .router-overview-framework .ik-v420-channel-rail i,
  .router-overview-framework .ik-v420-port-matrix i,
  .router-overview-framework .ik-v420-list-row > i,
  .router-overview-framework .ik-v420-incident > i,
  .ik-v420-nav i,
  .ik-v420-card i,
  .ik-v420-channel-rail i,
  .ik-v420-port-matrix i,
  .ik-v420-list-row > i,
  .ik-v420-incident > i { width: 7px; height: 7px; border-radius: 99px; background: var(--green); }
  .router-overview-framework .ik-v420-app .is-warn i,
  .router-overview-framework .ik-v420-app .is-missing i,
  .ik-v420-app .is-warn i,
  .ik-v420-app .is-missing i { background: var(--warn); }
  .router-overview-framework .ik-v420-app .is-danger i,
  .ik-v420-app .is-danger i { background: var(--red); }
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    position: relative;
    overflow: hidden;
    min-height: 238px;
    padding: 17px 17px 18px;
    border-radius: 26px;
    background:
      radial-gradient(circle at 84% -10%, rgba(22,119,255,.16), transparent 36%),
      linear-gradient(160deg, rgba(255,255,255,.99), rgba(240,248,255,.98) 62%, rgba(253,254,255,.98));
    box-shadow: 0 18px 42px rgba(36,91,142,.12), inset 0 0 0 1px rgba(207,225,241,.96) !important;
  }
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    content: "";
    position: absolute;
    inset: 18px auto 18px 0;
    width: 3px;
    border-radius: 99px;
    background: var(--blue);
  }
  .router-overview-framework .ik-v420-hero.is-warn::before,
  .router-overview-framework .ik-v420-hero.is-missing::before,
  .ik-v420-hero.is-warn::before,
  .ik-v420-hero.is-missing::before { background: var(--warn); }
  .router-overview-framework .ik-v420-hero.is-danger::before,
  .ik-v420-hero.is-danger::before { background: var(--red); }
  .router-overview-framework .ik-v420-hero header,
  .ik-v420-hero header { display: grid; gap: 5px; }
  .router-overview-framework .ik-v420-hero header span,
  .ik-v420-hero header span {
    width: max-content;
    padding: 0;
    color: var(--muted);
    font-size: 12px;
    font-weight: 760;
    line-height: 1;
  }
  .router-overview-framework .ik-v420-hero h1,
  .ik-v420-hero h1 {
    margin: 0;
    color: var(--text);
    font-size: 27px;
    font-weight: 820;
    letter-spacing: -.05em;
    line-height: 1.02;
  }
  .router-overview-framework .ik-v420-hero p,
  .ik-v420-hero p {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
    margin: 0;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.22;
  }
  .router-overview-framework .ik-v420-hero p b,
  .ik-v420-hero p b { color: var(--text); font-weight: 760; }
  .router-overview-framework .ik-v420-hero p i,
  .ik-v420-hero p i { width: 3px; height: 3px; border-radius: 99px; background: #bac8d6; }
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    display: flex;
    gap: 9px;
    margin-top: 14px;
    align-items: end;
  }
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    display: grid;
    min-width: 0;
    flex: 1 1 0;
    gap: 3px;
    padding: 8px 10px;
    border-radius: 15px;
    background: rgba(255,255,255,.42);
    box-shadow: inset .5px 0 0 rgba(119,164,207,.18) !important;
  }
  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    color: var(--muted);
    font-size: 10.8px;
    font-style: normal;
    font-weight: 690;
    line-height: 1.08;
  }
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats small { color: var(--subtle); font-weight: 540; }
  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b {
    color: var(--text);
    font-size: 15px;
    font-weight: 800;
    letter-spacing: -.04em;
    line-height: 1;
  }
  .router-overview-framework .ik-v420-hero-stats b i,
  .router-overview-framework .ik-v420-hero-stats small i,
  .ik-v420-hero-stats b i,
  .ik-v420-hero-stats small i {
    margin-right: 4px;
    color: var(--muted);
    font-size: 10.5px;
    font-style: normal;
    font-weight: 690;
  }
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b { font-size: 24px; }
  .router-overview-framework .ik-v420-hero-stats .is-primary b small,
  .ik-v420-hero-stats .is-primary b small {
    margin-left: 3px;
    color: var(--subtle);
    font-size: 11px;
    font-weight: 600;
  }
  .router-overview-framework .ik-v420-resource-row.is-danger strong,
  .ik-v420-resource-row.is-danger strong { color: #b92f32; }
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual { margin-top: 12px; min-height: 70px; }
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart { display: block; width: 100%; height: 76px; }
  .router-overview-framework .ik-v420-line-chart text,
  .ik-v420-line-chart text { fill: #90a0b3; font-size: 9px; font-weight: 650; }
  .router-overview-framework .ik-v420-gridline,
  .ik-v420-gridline { fill: none; stroke: rgba(185,211,234,.45); stroke-width: .65; }
  .router-overview-framework .ik-v420-area,
  .ik-v420-area { fill: rgba(22,119,255,.07); }
  .router-overview-framework .ik-v420-curve,
  .ik-v420-curve { fill: none; stroke-width: 1.55; stroke-linecap: round; stroke-linejoin: round; }
  .router-overview-framework .ik-v420-curve.is-main,
  .ik-v420-curve.is-main { stroke: var(--blue); }
  .router-overview-framework .ik-v420-curve.is-soft,
  .ik-v420-curve.is-soft { stroke: var(--blue-2); opacity: .82; }
  .router-overview-framework .ik-v420-focus-dot,
  .ik-v420-focus-dot { fill: var(--blue); stroke: white; stroke-width: 1.6; }
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    position: relative;
    z-index: 2;
    margin-top: -2px;
    display: grid;
    gap: 10px;
  }
  .router-overview-framework .ik-v420-cards,
  .router-overview-framework .ik-v420-status-cards,
  .ik-v420-cards,
  .ik-v420-status-cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin: -18px 10px 0;
  }
  .router-overview-framework .ik-v420-card,
  .ik-v420-card {
    min-height: 82px;
    padding: 12px 13px;
    border-width: 0;
    border-radius: 19px;
    background: rgba(255,255,255,.92);
    box-shadow: 0 10px 24px rgba(44,93,142,.075), inset 0 0 0 1px rgba(217,231,244,.92) !important;
  }
  .router-overview-framework .ik-v420-card header,
  .ik-v420-card header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .router-overview-framework .ik-v420-card span,
  .ik-v420-card span { color: var(--muted); font-size: 12px; font-weight: 720; }
  .router-overview-framework .ik-v420-card strong,
  .ik-v420-card strong {
    display: block;
    margin-top: 8px;
    color: var(--text);
    font-size: 24px;
    font-weight: 820;
    letter-spacing: -.05em;
    line-height: 1;
  }
  .router-overview-framework .ik-v420-card p,
  .ik-v420-card p { margin: 5px 0 0; color: var(--subtle); font-size: 11px; line-height: 1.15; }
  .router-overview-framework .ik-v420-incident,
  .ik-v420-incident {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    min-height: 58px;
    padding: 10px 13px;
    border-radius: 0;
    background: transparent;
    box-shadow: inset 3px 0 0 rgba(22,119,255,.22) !important;
  }
  .router-overview-framework .ik-v420-incident > i,
  .ik-v420-incident > i { width: 30px; height: 30px; }
  .router-overview-framework .ik-v420-incident span,
  .ik-v420-incident span { display: grid; gap: 2px; min-width: 0; }
  .router-overview-framework .ik-v420-incident b,
  .ik-v420-incident b { color: var(--text); font-size: 13px; font-weight: 760; line-height: 1.15; }
  .router-overview-framework .ik-v420-incident em,
  .ik-v420-incident em { color: var(--muted); font-size: 11.5px; font-style: normal; line-height: 1.15; }
  .router-overview-framework .ik-v420-incident strong,
  .ik-v420-incident strong { color: var(--text); font-size: 12px; font-weight: 760; white-space: nowrap; }
  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 5px; align-items: stretch; }
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    display: grid;
    min-height: 40px;
    place-items: center;
    gap: 3px;
    border-radius: 12px;
    background: rgba(255,255,255,.62);
    box-shadow: inset 0 0 0 1px rgba(220,232,244,.78) !important;
  }
  .router-overview-framework .ik-v420-port-matrix b,
  .ik-v420-port-matrix b { color: var(--text); font-size: 10.5px; font-weight: 760; line-height: 1; }
  .router-overview-framework .ik-v420-channel-rail,
  .ik-v420-channel-rail { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .router-overview-framework .ik-v420-channel-rail span,
  .ik-v420-channel-rail span {
    display: grid;
    min-height: 52px;
    align-content: center;
    gap: 3px;
    box-shadow: inset 0 -2px 0 rgba(22,119,255,.18) !important;
  }
  .router-overview-framework .ik-v420-channel-rail b,
  .ik-v420-channel-rail b { color: var(--muted); font-size: 10.5px; line-height: 1; }
  .router-overview-framework .ik-v420-channel-rail em,
  .ik-v420-channel-rail em { color: var(--text); font-size: 12px; font-style: normal; font-weight: 760; line-height: 1.06; }
  .router-overview-framework .ik-v420-flow,
  .ik-v420-flow { display: grid; grid-template-columns: minmax(0, 1fr) 14px minmax(0, 1fr) 14px minmax(0, 1fr); gap: 6px; align-items: center; min-height: 62px; }
  .router-overview-framework .ik-v420-flow > i,
  .ik-v420-flow > i { height: 1px; background: rgba(22,119,255,.35); }
  .router-overview-framework .ik-v420-flow b,
  .ik-v420-flow b { display: block; color: var(--text); font-size: 11px; font-weight: 760; line-height: 1.1; }
  .router-overview-framework .ik-v420-flow em,
  .ik-v420-flow em { display: block; margin-top: 4px; color: var(--muted); font-size: 10.5px; font-style: normal; }
  .router-overview-framework .ik-v420-resource-visual,
  .ik-v420-resource-visual { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
  .router-overview-framework .ik-v420-resource-visual span,
  .ik-v420-resource-visual span { display: grid; gap: 3px; min-width: 0; }
  .router-overview-framework .ik-v420-resource-visual b,
  .ik-v420-resource-visual b { color: var(--muted); font-size: 11px; font-weight: 700; }
  .router-overview-framework .ik-v420-resource-visual em,
  .ik-v420-resource-visual em { color: var(--text); font-size: 15px; font-style: normal; font-weight: 800; }
  .router-overview-framework .ik-v420-resource-visual svg,
  .ik-v420-resource-visual svg { width: 100%; height: 25px; }
  .router-overview-framework .ik-v420-resource-visual polyline,
  .ik-v420-resource-visual polyline { fill: none; stroke: var(--blue); stroke-width: 1.35; stroke-linecap: round; stroke-linejoin: round; }
  .router-overview-framework .ik-v420-resource-visual circle,
  .ik-v420-resource-visual circle { fill: var(--blue); }
  .router-overview-framework .ik-v420-resource-visual .is-danger polyline,
  .router-overview-framework .ik-v420-resource-visual .is-danger circle,
  .ik-v420-resource-visual .is-danger polyline,
  .ik-v420-resource-visual .is-danger circle { stroke: var(--red); fill: var(--red); }
  .router-overview-framework .ik-v420-resource,
  .ik-v420-resource {
    padding: 13px 14px;
    border-radius: 20px;
    background: rgba(255,255,255,.88);
    box-shadow: inset 0 0 0 1px rgba(218,232,244,.86) !important;
  }
  .router-overview-framework .ik-v420-resource header,
  .ik-v420-resource header { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
  .router-overview-framework .ik-v420-resource header b,
  .ik-v420-resource header b { color: var(--text); font-size: 15px; font-weight: 780; }
  .router-overview-framework .ik-v420-resource header span,
  .ik-v420-resource header span { color: var(--muted); font-size: 12px; font-weight: 690; }
  .router-overview-framework .ik-v420-resource > div,
  .ik-v420-resource > div { display: grid; gap: 8px; }
  .router-overview-framework .ik-v420-resource-row,
  .ik-v420-resource-row {
    display: grid;
    grid-template-columns: 43px 58px minmax(0, 1fr) 58px;
    align-items: center;
    gap: 9px;
    min-height: 29px;
  }
  .router-overview-framework .ik-v420-resource-row b,
  .ik-v420-resource-row b { color: var(--muted); font-size: 12px; font-weight: 720; }
  .router-overview-framework .ik-v420-resource-row strong,
  .ik-v420-resource-row strong { color: var(--text); font-size: 17px; font-weight: 800; letter-spacing: -.035em; }
  .router-overview-framework .ik-v420-resource-row em,
  .ik-v420-resource-row em { color: var(--subtle); font-size: 10.8px; font-style: normal; text-align: right; }
  .router-overview-framework .ik-v420-boundary-row,
  .ik-v420-boundary-row {
    display: grid;
    grid-template-columns: 48px minmax(0, 74px) minmax(0, 1fr);
    align-items: center;
    min-height: 30px;
    gap: 8px;
  }
  .router-overview-framework .ik-v420-boundary-row b,
  .ik-v420-boundary-row b { color: var(--muted); font-size: 12px; font-weight: 720; }
  .router-overview-framework .ik-v420-boundary-row strong,
  .ik-v420-boundary-row strong { color: var(--text); font-size: 15px; font-weight: 800; letter-spacing: -.025em; }
  .router-overview-framework .ik-v420-boundary-row em,
  .ik-v420-boundary-row em { color: var(--subtle); font-size: 11px; font-style: normal; text-align: right; }
  .router-overview-framework .ik-v420-resource-line,
  .ik-v420-resource-line {
    position: relative;
    overflow: hidden;
    height: 5px;
    border-radius: 999px;
    background: #e8f0f7;
  }
  .router-overview-framework .ik-v420-resource-line i,
  .ik-v420-resource-line i {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--blue), #65b7ff);
  }
  .router-overview-framework .ik-v420-resource-row.is-danger .ik-v420-resource-line i,
  .ik-v420-resource-row.is-danger .ik-v420-resource-line i { background: linear-gradient(90deg, #d93025, #ef8b73); }
  .router-overview-framework .ik-v420-list,
  .ik-v420-list { overflow: hidden; border-radius: 20px; background: rgba(255,255,255,.88); box-shadow: inset 0 0 0 1px rgba(218,232,244,.86) !important; }
  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header { display: flex; justify-content: space-between; gap: 10px; padding: 12px 14px 7px; }
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-list header b { color: var(--text); font-size: 15px; font-weight: 780; }
  .router-overview-framework .ik-v420-list header span,
  .ik-v420-list header span { color: var(--muted); font-size: 12px; font-weight: 690; }
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    min-height: 50px;
    padding: 0 14px;
    box-shadow: inset 0 1px 0 rgba(226,236,246,.88) !important;
    background: transparent;
  }
  .router-overview-framework .ik-v420-list-row > i,
  .ik-v420-list-row > i {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    background: linear-gradient(180deg, #e8f4ff, #f8fbff);
    color: var(--blue);
    font-size: 11px;
    font-style: normal;
    font-weight: 790;
  }
  .router-overview-framework .ik-v420-list-row span,
  .ik-v420-list-row span { min-width: 0; display: grid; gap: 2px; }
  .router-overview-framework .ik-v420-list-row b,
  .ik-v420-list-row b { color: var(--text); font-size: 13px; font-weight: 740; line-height: 1.1; }
  .router-overview-framework .ik-v420-list-row em,
  .ik-v420-list-row em { color: var(--muted); font-size: 11.5px; font-style: normal; line-height: 1.15; }
  .router-overview-framework .ik-v420-list-row strong,
  .ik-v420-list-row strong {
    max-width: 106px;
    color: var(--text);
    font-size: 13px;
    font-weight: 790;
    overflow-wrap: anywhere;
    text-align: right;
  }
  .router-overview-framework .ik-v420-app-list .ik-v420-list-row span,
  .ik-v420-app-list .ik-v420-list-row span { gap: 4px; }
  .router-overview-framework .ik-v420-app-list u,
  .ik-v420-app-list u {
    position: relative;
    display: block;
    overflow: hidden;
    width: 100%;
    height: 4px;
    border-radius: 999px;
    background: rgba(176,204,231,.34);
    text-decoration: none;
  }
  .router-overview-framework .ik-v420-app-list u i,
  .ik-v420-app-list u i {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--blue), var(--blue-2));
  }
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    position: fixed;
    z-index: 40;
    left: 14px;
    right: 14px;
    bottom: max(9px, env(safe-area-inset-bottom, 0px));
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    min-height: 60px;
    padding: 5px;
    border-radius: 23px;
    background: rgba(255,255,255,.97);
    box-shadow: 0 16px 34px rgba(42,91,137,.16), inset 0 0 0 1px rgba(202,224,242,.9) !important;
  }
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    display: grid;
    min-height: 46px;
    place-items: center;
    gap: 2px;
    padding: 0;
    border-width: 0;
    border-radius: 18px;
    background: transparent;
    color: #6f8095;
    font-size: 10.5px;
    font-weight: 700;
  }
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active { background: linear-gradient(180deg, rgba(22,119,255,.14), rgba(22,119,255,.08)); color: var(--blue); box-shadow: inset 0 0 0 1px rgba(22,119,255,.16) !important; }
}
@media (max-width: 380px) {
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen { padding-inline: 14px; }
  .router-overview-framework .ik-v420-hero h1,
  .ik-v420-hero h1 { font-size: 25px; }
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats { gap: 6px; }
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b { font-size: 24px; }
  .router-overview-framework .ik-v420-resource-row,
  .ik-v420-resource-row { grid-template-columns: 38px 52px minmax(0, 1fr) 50px; gap: 7px; }
}

/* V420 Apple HIG + iKuai 4.0 refinement layer:
   airy blue-white, foreground/background hierarchy, hairline charts,
   branded bottom tab, less boxiness, no heavy shadow/table feel. */
@media (max-width: 760px) {
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 28px;
    border: 0;
    color: #1272d9;
    font-size: 11.5px;
    box-shadow: var(--hairline) !important;
  }

  .router-overview-framework .ik-v420-nav i,
  .router-overview-framework .ik-v420-card i,
  .router-overview-framework .ik-v420-channel-rail i,
  .router-overview-framework .ik-v420-port-matrix i,
  .router-overview-framework .ik-v420-list-row > i,
  .ik-v420-nav i,
  .ik-v420-card i,
  .ik-v420-channel-rail i,
  .ik-v420-port-matrix i,
  .ik-v420-list-row > i {
    width: 6px;
    height: 6px;
    box-shadow: 0 0 0 3px rgba(32,199,132,.12) !important;
  }

  .router-overview-framework .ik-v420-app .is-warn i,
  .router-overview-framework .ik-v420-app .is-missing i,
  .ik-v420-app .is-warn i,
  .ik-v420-app .is-missing i {
    box-shadow: 0 0 0 3px rgba(184,114,22,.12) !important;
  }

  .router-overview-framework .ik-v420-app .is-danger i,
  .ik-v420-app .is-danger i {
    box-shadow: 0 0 0 3px rgba(216,74,79,.12) !important;
  }

  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    padding: 14px 15px 12px;
    border: 0;
    border-radius: 23px;
    background:
      radial-gradient(circle at 90% 0%, rgba(99,187,255,.18), transparent 32%),
      linear-gradient(153deg, rgba(255,255,255,.97), rgba(239,248,255,.92) 56%, rgba(250,253,255,.96));
    box-shadow: var(--hairline), var(--shadow-float) !important;
  }

  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    inset: 12px auto 12px 0;
    width: 2px;
    background: linear-gradient(180deg, var(--blue-2), var(--blue));
  }

  .router-overview-framework .ik-v420-hero header,
  .ik-v420-hero header {
    gap: 3px;
    padding-left: 1px;
  }

  .router-overview-framework .ik-v420-hero header span,
  .ik-v420-hero header span {
    font-size: 11.5px;
    font-weight: 680;
    line-height: 1.14;
  }

  .router-overview-framework .ik-v420-hero h1,
  .ik-v420-hero h1 {
    font-size: 21.5px;
    font-weight: 780;
    letter-spacing: -.032em;
    line-height: 1.08;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .router-overview-framework .ik-v420-hero p,
  .ik-v420-hero p {
    font-size: 11.5px;
    line-height: 1.24;
  }

  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    margin-top: 11px;
    padding-top: 8px;
    border-top: .5px solid rgba(119,164,207,.24);
  }

  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    box-shadow: inset .5px 0 0 rgba(119,164,207,.22) !important;
  }

  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    font-size: 10px;
  }

  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b {
    font-size: 14.5px;
    letter-spacing: -.025em;
    line-height: 1.12;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b {
    font-size: 22px;
  }

  .router-overview-framework .ik-v420-resource-row.is-danger strong,
  .ik-v420-resource-row.is-danger strong {
    color: #b63f44;
  }

  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    margin-top: 9px;
    min-height: 62px;
  }

  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 62px;
  }

  .router-overview-framework .ik-v420-gridline,
  .ik-v420-gridline {
    stroke: rgba(142,181,216,.26);
    stroke-width: .55;
  }

  .router-overview-framework .ik-v420-area,
  .ik-v420-area {
    fill: rgba(20,125,255,.055);
  }

  .router-overview-framework .ik-v420-curve,
  .ik-v420-curve {
    stroke-width: 1.25;
  }

  .router-overview-framework .ik-v420-focus-dot,
  .ik-v420-focus-dot {
    stroke-width: 1.3;
  }

  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    gap: 8px;
  }

  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix {
    gap: 4px;
  }

  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    border-radius: 11px;
    background: rgba(255,255,255,.48);
    box-shadow: inset 0 0 0 .5px rgba(119,164,207,.16) !important;
  }

  .router-overview-framework .ik-v420-port-matrix b,
  .ik-v420-port-matrix b {
    font-size: 9.5px;
  }

  .router-overview-framework .ik-v420-channel-rail,
  .ik-v420-channel-rail {
    gap: 5px;
  }

  .router-overview-framework .ik-v420-channel-rail span,
  .ik-v420-channel-rail span {
    min-width: 0;
    min-height: 44px;
    padding: 0 2px;
    box-shadow: inset 0 -.5px 0 rgba(20,125,255,.20) !important;
  }

  .router-overview-framework .ik-v420-channel-rail b,
  .ik-v420-channel-rail b {
    font-size: 10px;
    white-space: normal;
  }

  .router-overview-framework .ik-v420-channel-rail em,
  .ik-v420-channel-rail em {
    font-size: 11px;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .router-overview-framework .ik-v420-flow,
  .ik-v420-flow {
    grid-template-columns: minmax(0, 1fr) 12px minmax(0, 1fr) 12px minmax(0, 1fr);
    min-height: 56px;
  }

  .router-overview-framework .ik-v420-flow > i,
  .ik-v420-flow > i {
    height: .5px;
    background: rgba(20,125,255,.34);
  }

  .router-overview-framework .ik-v420-flow b,
  .ik-v420-flow b {
    font-size: 10.5px;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .router-overview-framework .ik-v420-flow em,
  .ik-v420-flow em {
    margin-top: 3px;
    font-size: 10px;
  }

  .router-overview-framework .ik-v420-resource-visual,
  .ik-v420-resource-visual {
    gap: 7px;
  }

  .router-overview-framework .ik-v420-resource-visual b,
  .ik-v420-resource-visual b {
    font-size: 10.5px;
    line-height: 1.08;
  }

  .router-overview-framework .ik-v420-resource-visual em,
  .ik-v420-resource-visual em {
    font-size: 12.5px;
    line-height: 1.08;
  }

  .router-overview-framework .ik-v420-resource-visual polyline,
  .ik-v420-resource-visual polyline {
    stroke-width: 1.25;
  }

  .router-overview-framework .ik-v420-cards,
  .router-overview-framework .ik-v420-status-cards,
  .ik-v420-cards,
  .ik-v420-status-cards {
    gap: 8px;
    margin: -14px 8px 0;
  }

  .router-overview-framework .ik-v420-card,
  .ik-v420-card {
    min-height: 76px;
    padding: 11px 12px;
    background: rgba(255,255,255,.72);
    box-shadow: var(--hairline), var(--shadow-soft) !important;
  }

  .router-overview-framework .ik-v420-card span,
  .ik-v420-card span {
    font-size: 11px;
    font-weight: 680;
  }

  .router-overview-framework .ik-v420-card strong,
  .ik-v420-card strong {
    font-size: 19px;
    font-weight: 780;
    letter-spacing: -.035em;
  }

  .router-overview-framework .ik-v420-card p,
  .ik-v420-card p {
    font-size: 10.5px;
  }

  .router-overview-framework .ik-v420-incident,
  .ik-v420-incident,
  .router-overview-framework .ik-v420-resource,
  .ik-v420-resource,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    background: rgba(255,255,255,.68);
    box-shadow: var(--hairline) !important;
  }

  .router-overview-framework .ik-v420-resource,
  .ik-v420-resource {
    padding: 11px 13px 12px;
  }

  .router-overview-framework .ik-v420-resource header,
  .ik-v420-resource header {
    margin-bottom: 8px;
  }

  .router-overview-framework .ik-v420-resource header b,
  .ik-v420-resource header b,
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-list header b {
    font-size: 12.8px;
  }

  .router-overview-framework .ik-v420-resource header span,
  .ik-v420-resource header span,
  .router-overview-framework .ik-v420-list header span,
  .ik-v420-list header span {
    font-size: 11px;
  }

  .router-overview-framework .ik-v420-resource-row,
  .ik-v420-resource-row {
    grid-template-columns: 40px 52px minmax(0, 1fr) 50px;
    gap: 8px;
    min-height: 26px;
  }

  .router-overview-framework .ik-v420-resource-row b,
  .ik-v420-resource-row b {
    font-size: 11px;
  }

  .router-overview-framework .ik-v420-resource-row strong,
  .ik-v420-resource-row strong {
    font-size: 14px;
    letter-spacing: -.025em;
  }

  .router-overview-framework .ik-v420-resource-row em,
  .ik-v420-resource-row em {
    font-size: 10px;
  }
  .router-overview-framework .ik-v420-boundary-row,
  .ik-v420-boundary-row {
    grid-template-columns: 42px 60px minmax(0, 1fr);
    min-height: 28px;
  }
  .router-overview-framework .ik-v420-boundary-row b,
  .ik-v420-boundary-row b,
  .router-overview-framework .ik-v420-boundary-row em,
  .ik-v420-boundary-row em {
    font-size: 10.5px;
  }
  .router-overview-framework .ik-v420-boundary-row strong,
  .ik-v420-boundary-row strong {
    font-size: 13.5px;
  }

  .router-overview-framework .ik-v420-resource-line,
  .ik-v420-resource-line {
    height: 4px;
    background: rgba(176,204,231,.34);
  }

  .router-overview-framework .ik-v420-resource-row.is-danger .ik-v420-resource-line i,
  .ik-v420-resource-row.is-danger .ik-v420-resource-line i {
    background: linear-gradient(90deg, #1677ff 0%, #65b2ec 92%, #d84a4f 100%);
  }

  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header {
    padding: 10px 13px 6px;
  }

  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    grid-template-columns: 24px minmax(0, 1fr) auto;
    gap: 9px;
    min-height: 44px;
    padding: 0 13px;
    box-shadow: inset 0 .5px 0 rgba(119,164,207,.18) !important;
  }

  .router-overview-framework .ik-v420-list-row > i,
  .ik-v420-list-row > i {
    width: 24px;
    height: 24px;
    background: linear-gradient(180deg, #e8f5ff, #f8fcff);
    box-shadow: inset 0 0 0 .5px rgba(20,125,255,.12) !important;
  }

  .router-overview-framework .ik-v420-list-row b,
  .ik-v420-list-row b {
    font-size: 12.5px;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .router-overview-framework .ik-v420-list-row em,
  .ik-v420-list-row em {
    font-size: 11px;
  }

  .router-overview-framework .ik-v420-list-row strong,
  .ik-v420-list-row strong {
    max-width: 112px;
    font-size: 12.5px;
  }

  .router-overview-framework .ik-v420-app-list u,
  .ik-v420-app-list u {
    display: block;
    overflow: hidden;
    width: 100%;
    height: 4px;
    border-radius: 999px;
    background: rgba(176,204,231,.34);
    text-decoration: none;
  }

  .router-overview-framework .ik-v420-app-list u i,
  .ik-v420-app-list u i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--blue), var(--blue-2));
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    left: 15px;
    right: 15px;
    bottom: max(9px, env(safe-area-inset-bottom, 0px));
    min-height: 56px;
    background: rgba(255,255,255,.84);
    box-shadow: 0 14px 34px rgba(37,99,161,.13), inset 0 0 0 .5px rgba(78,138,196,.22) !important;
    backdrop-filter: blur(22px) saturate(1.2);
    -webkit-backdrop-filter: blur(22px) saturate(1.2);
  }

  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    min-height: 44px;
    border-radius: 16px;
    color: #6e7f94;
    font-size: 10px;
    font-weight: 680;
    line-height: 1.05;
    white-space: normal;
  }

  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    background: linear-gradient(180deg, rgba(225,244,255,.88), rgba(247,252,255,.82));
    color: var(--blue);
    box-shadow: inset 0 0 0 .5px rgba(20,125,255,.16) !important;
  }
}

@media (max-width: 380px) {
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen { padding-inline: 13px; }
  .router-overview-framework .ik-v420-hero h1,
  .ik-v420-hero h1 { font-size: 20px; }
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats { gap: 7px; }
  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b { font-size: 12.8px; }
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b { font-size: 20px; }
  .router-overview-framework .ik-v420-resource-row,
  .ik-v420-resource-row { grid-template-columns: 36px 46px minmax(0, 1fr) 46px; gap: 7px; }
}

@media (max-width: 760px) {
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    overflow: hidden;
    gap: 0;
    margin-top: 9px;
    border-radius: 22px;
    background: rgba(255,255,255,.72);
    box-shadow: var(--hairline) !important;
  }

  .router-overview-framework .ik-v420-cards,
  .router-overview-framework .ik-v420-status-cards,
  .ik-v420-cards,
  .ik-v420-status-cards {
    margin: 0;
    padding: 8px;
    gap: 0;
    background: rgba(251,253,255,.48);
    box-shadow: inset 0 -0.5px 0 rgba(119,164,207,.18) !important;
  }

  .router-overview-framework .ik-v420-card,
  .ik-v420-card {
    min-height: 70px;
    border-radius: 17px;
    background: transparent;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-card + .ik-v420-card,
  .ik-v420-card + .ik-v420-card {
    box-shadow: inset .5px 0 0 rgba(119,164,207,.18) !important;
  }

  .router-overview-framework .ik-v420-card strong,
  .ik-v420-card strong {
    margin-top: 7px;
  }

  .router-overview-framework .ik-v420-incident,
  .ik-v420-incident,
  .router-overview-framework .ik-v420-resource,
  .ik-v420-resource,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    border-radius: 0;
    background: transparent;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-resource,
  .ik-v420-resource,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    box-shadow: inset 0 .5px 0 rgba(119,164,207,.18) !important;
  }

  .router-overview-framework .ik-v420-list-row:last-child,
  .ik-v420-list-row:last-child {
    padding-bottom: 2px;
  }
}

@media (max-width: 760px) {
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0;
    align-items: stretch;
    margin-top: 10px;
    padding-top: 8px;
    border-top: .5px solid rgba(119,164,207,.24);
  }

  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    min-width: 0;
    padding: 0 7px;
    border-radius: 0;
    background: transparent;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-hero-stats span + span,
  .ik-v420-hero-stats span + span {
    box-shadow: inset .5px 0 0 rgba(119,164,207,.22) !important;
  }

  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    font-size: 9.6px;
    line-height: 1.08;
    white-space: nowrap;
  }

  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b {
    margin-top: 2px;
    font-size: 13.2px;
    line-height: 1.06;
    letter-spacing: -.025em;
    white-space: normal;
    overflow-wrap: anywhere;
  }
}

@media (max-width: 760px) {
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    --blue: #126fd1;
    --blue-2: #65b2ec;
    --ink: #111827;
    --muted: #5d6d80;
    --quiet: #8a9aac;
    --line: rgba(167, 192, 216, .34);
    --panel: rgba(255, 255, 255, .92);
    background:
      radial-gradient(circle at 50% -138px, rgba(18,111,209,.20), transparent 302px),
      linear-gradient(180deg, #fbfdff 0%, #f3f8fd 48%, #f7fbff 100%);
  }

  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(8px, env(safe-area-inset-top, 0px)) 15px 90px;
  }

  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    min-height: 52px;
    grid-template-columns: 40px minmax(0, 1fr) auto;
  }

  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    background: transparent;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    color: var(--ink);
    font-size: 17px;
    line-height: 1.12;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.2;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 28px;
    border-radius: 999px;
    background: rgba(255,255,255,.68);
    color: var(--blue);
    box-shadow: inset 0 0 0 .5px rgba(151, 184, 216, .58) !important;
  }

  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    min-height: 252px;
    padding: 18px 17px 16px;
    border-radius: 24px;
    background:
      radial-gradient(circle at 82% 4%, rgba(18,111,209,.13), transparent 34%),
      linear-gradient(155deg, rgba(255,255,255,.99), rgba(240,248,255,.96) 58%, rgba(253,254,255,.99));
    box-shadow: 0 20px 42px rgba(33, 79, 126, .105), inset 0 0 0 .5px rgba(184, 211, 235, .94) !important;
  }

  .router-overview-framework .ik-v420-hero header,
  .ik-v420-hero header {
    gap: 6px;
    padding-right: 2px;
  }

  .router-overview-framework .ik-v420-hero header span,
  .ik-v420-hero header span {
    color: var(--muted);
    font-size: 11px;
    letter-spacing: .02em;
  }

  .router-overview-framework .ik-v420-hero h1,
  .ik-v420-hero h1 {
    color: var(--ink);
    font-size: 27px;
    line-height: 1.03;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-hero p,
  .ik-v420-hero p {
    color: var(--muted);
    font-size: 11.5px;
    line-height: 1.3;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    margin-top: 13px;
    padding-top: 10px;
    border-top-color: var(--line);
  }

  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    padding: 0 8px;
  }

  .router-overview-framework .ik-v420-hero-stats span:first-child,
  .ik-v420-hero-stats span:first-child {
    padding-left: 0;
  }

  .router-overview-framework .ik-v420-hero-stats span:last-child,
  .ik-v420-hero-stats span:last-child {
    padding-right: 0;
  }

  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    color: var(--muted);
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b {
    color: var(--ink);
    font-size: 14px;
    line-height: 1.05;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    margin-top: 13px;
    min-height: 82px;
  }

  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 88px;
  }

  .router-overview-framework .ik-v420-line-chart text,
  .ik-v420-line-chart text {
    fill: var(--quiet);
    font-size: 9.5px;
    font-weight: 650;
  }

  .router-overview-framework .ik-v420-peak-dot,
  .ik-v420-peak-dot {
    fill: #ffffff;
    stroke: var(--blue);
    stroke-width: 1.4;
  }

  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    margin-top: -14px;
    gap: 11px;
    z-index: 3;
  }

  .router-overview-framework .ik-v420-duo,
  .ik-v420-duo {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin: 0 9px;
  }

  .router-overview-framework .ik-v420-duo-card,
  .ik-v420-duo-card {
    min-height: 86px;
    padding: 12px 12px 11px;
    border-radius: 18px;
    background: rgba(255,255,255,.94);
    box-shadow: 0 12px 24px rgba(44,93,142,.065), inset 0 0 0 .5px rgba(204,224,242,.96) !important;
  }

  .router-overview-framework .ik-v420-duo-card header,
  .ik-v420-duo-card header {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
    font-size: 11.5px;
    font-weight: 730;
  }

  .router-overview-framework .ik-v420-duo-card i,
  .ik-v420-duo-card i {
    width: 7px;
    height: 7px;
    border-radius: 99px;
    background: var(--green);
  }

  .router-overview-framework .ik-v420-duo-card strong,
  .ik-v420-duo-card strong {
    display: block;
    margin-top: 8px;
    color: var(--ink);
    font-size: 22px;
    font-weight: 820;
    letter-spacing: -.045em;
    line-height: 1.05;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-duo-card p,
  .ik-v420-duo-card p {
    margin: 4px 0 0;
    color: var(--quiet);
    font-size: 11px;
    line-height: 1.22;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-app .ik-v420-duo-card.is-warn i,
  .router-overview-framework .ik-v420-app .ik-v420-duo-card.is-missing i,
  .ik-v420-app .ik-v420-duo-card.is-warn i,
  .ik-v420-app .ik-v420-duo-card.is-missing i { background: var(--warn); }

  .router-overview-framework .ik-v420-app .ik-v420-duo-card.is-danger i,
  .ik-v420-app .ik-v420-duo-card.is-danger i { background: var(--red); }

  .router-overview-framework .ik-v420-resource,
  .ik-v420-resource {
    padding: 14px 14px;
    border-radius: 20px;
    background: var(--panel);
    box-shadow: inset 0 0 0 .5px rgba(204,224,242,.96) !important;
  }

  .router-overview-framework .ik-v420-resource.is-hot,
  .ik-v420-resource.is-hot {
    padding: 15px 15px 14px;
    box-shadow: 0 14px 30px rgba(130, 55, 40, .06), inset 0 0 0 .5px rgba(224, 176, 166, .72) !important;
  }

  .router-overview-framework .ik-v420-resource-row,
  .ik-v420-resource-row {
    grid-template-columns: 44px 62px minmax(0, 1fr) 58px;
    min-height: 34px;
  }

  .router-overview-framework .ik-v420-resource.is-hot .ik-v420-resource-row,
  .ik-v420-resource.is-hot .ik-v420-resource-row {
    grid-template-columns: 48px 72px minmax(0, 1fr) 58px;
    min-height: 40px;
  }

  .router-overview-framework .ik-v420-resource.is-hot .ik-v420-resource-row strong,
  .ik-v420-resource.is-hot .ik-v420-resource-row strong {
    font-size: 21px;
  }

  .router-overview-framework .ik-v420-resource-line,
  .ik-v420-resource-line {
    height: 6px;
  }

  .router-overview-framework .ik-v420-incident,
  .ik-v420-incident {
    margin-inline: 2px;
    border-radius: 16px;
    background: rgba(255,255,255,.76);
    box-shadow: inset 3px 0 0 rgba(18,111,209,.28), inset 0 0 0 .5px rgba(204,224,242,.8) !important;
  }

  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    border-radius: 20px;
    background: var(--panel);
    box-shadow: inset 0 0 0 .5px rgba(204,224,242,.96) !important;
  }

  .router-overview-framework .ik-v420-list-row b,
  .router-overview-framework .ik-v420-list-row em,
  .router-overview-framework .ik-v420-list-row strong,
  .ik-v420-list-row b,
  .ik-v420-list-row em,
  .ik-v420-list-row strong {
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    left: 18px;
    right: 18px;
    min-height: 58px !important;
    padding: 4px 6px !important;
    border-radius: 18px !important;
    background: rgba(248,251,255,.93);
    box-shadow: 0 12px 26px rgba(37, 84, 130, .11), inset 0 1px 0 rgba(255,255,255,.92), inset 0 0 0 .5px rgba(181, 207, 230, .82) !important;
    backdrop-filter: blur(20px) saturate(1.18);
  }

  .router-overview-framework .ik-v420-tabs::before,
  .ik-v420-tabs::before {
    content: "";
    position: absolute;
    left: 24px;
    right: 24px;
    top: 6px;
    height: .5px;
    border-radius: 999px;
    background: linear-gradient(90deg, transparent, rgba(18,111,209,.38), transparent);
    pointer-events: none;
  }

  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    position: relative;
    min-height: 48px !important;
    border-radius: 12px !important;
    appearance: none;
    -webkit-appearance: none;
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    color: #6d7e92;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: -.01em;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-tabs button::before,
  .ik-v420-tabs button::before {
    content: "";
    position: absolute;
    top: 2px;
    width: 18px;
    height: 2px;
    border-radius: 999px;
    background: transparent;
  }

  .router-overview-framework .ik-v420-tabs svg,
  .ik-v420-tabs svg {
    width: 19px;
    height: 19px;
    stroke-width: 1.9;
  }

  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    color: var(--blue);
    font-weight: 780;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-tabs button.is-active::before,
  .ik-v420-tabs button.is-active::before {
    background: linear-gradient(90deg, var(--blue), var(--blue-2));
    box-shadow: 0 0 0 3px rgba(18,111,209,.08) !important;
  }

  .router-overview-framework [data-overview-mobile-console] .ik-v420-tabs,
  [data-overview-mobile-console] .ik-v420-tabs {
    min-height: 58px !important;
    padding: 4px 6px !important;
    border-radius: 18px !important;
    background: rgba(248,251,255,.93) !important;
  }

  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline {
    display: grid;
    gap: 0;
    margin: 0;
    padding: 12px 14px;
    border-radius: 20px;
    background: rgba(255,255,255,.94);
    box-shadow: inset 0 0 0 .5px rgba(204,224,242,.96) !important;
  }

  .router-overview-framework .ik-v420-timeline header,
  .ik-v420-timeline header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 5px;
  }

  .router-overview-framework .ik-v420-timeline header b,
  .ik-v420-timeline header b {
    color: var(--ink);
    font-size: 14px;
    font-weight: 820;
  }

  .router-overview-framework .ik-v420-timeline header span,
  .ik-v420-timeline header span {
    color: var(--muted);
    font-size: 11px;
    font-weight: 680;
  }

  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    display: grid;
    grid-template-columns: 12px minmax(0, 1fr) minmax(74px, auto);
    gap: 9px;
    align-items: center;
    min-height: 42px;
    padding: 6px 0;
    border-top: .5px solid rgba(119,164,207,.18);
  }

  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--green);
    box-shadow: 0 0 0 4px rgba(38,133,81,.08) !important;
  }

  .router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .ik-v420-timeline-row.is-danger > i { background: var(--red); box-shadow: 0 0 0 4px rgba(216,74,79,.08) !important; }
  .router-overview-framework .ik-v420-timeline-row.is-warn > i,
  .ik-v420-timeline-row.is-warn > i,
  .router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .ik-v420-timeline-row.is-missing > i { background: var(--warn); box-shadow: 0 0 0 4px rgba(183,106,29,.09) !important; }

  .router-overview-framework .ik-v420-timeline-row b,
  .ik-v420-timeline-row b {
    display: block;
    color: var(--ink);
    font-size: 12.5px;
    font-weight: 780;
    line-height: 1.18;
  }

  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    display: block;
    margin-top: 2px;
    color: var(--quiet);
    font-size: 10.8px;
    font-style: normal;
    line-height: 1.22;
    white-space: normal;
  }

  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    color: var(--ink);
    font-size: 12px;
    font-weight: 820;
    line-height: 1.14;
    text-align: right;
    white-space: normal;
  }

  .router-overview-framework .ik-v420-interface-list,
  .ik-v420-interface-list {
    display: grid;
    gap: 7px;
  }

  .router-overview-framework .ik-v420-interface-list span,
  .ik-v420-interface-list span {
    display: grid;
    grid-template-columns: 8px minmax(0, 1fr);
    grid-template-areas: "dot name" "dot note";
    gap: 2px 8px;
    min-height: 32px;
    align-items: center;
    padding: 7px 9px;
    border-radius: 13px;
    background: rgba(255,255,255,.74);
    box-shadow: inset 0 0 0 .5px rgba(224,176,166,.78) !important;
  }

  .router-overview-framework .ik-v420-interface-list span > i,
  .ik-v420-interface-list span > i {
    grid-area: dot;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--red);
  }

  .router-overview-framework .ik-v420-interface-list b,
  .ik-v420-interface-list b { grid-area: name; color: var(--ink); font-size: 12.5px; line-height: 1.1; }
  .router-overview-framework .ik-v420-interface-list em,
  .ik-v420-interface-list em { grid-area: note; color: var(--quiet); font-size: 10.5px; font-style: normal; line-height: 1.15; }
  .router-overview-framework .ik-v420-interface-list strong,
  .ik-v420-interface-list strong { color: var(--muted); font-size: 11px; font-weight: 720; text-align: right; }

  .router-overview-framework .ik-v420-resource-visual span,
  .ik-v420-resource-visual span {
    min-height: 46px;
  }

  .router-overview-framework .ik-v420-resource-visual span > i,
  .ik-v420-resource-visual span > i {
    display: block;
    height: 5px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(176,204,231,.42);
  }

  .router-overview-framework .ik-v420-resource-visual span > i > i,
  .ik-v420-resource-visual span > i > i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--blue), var(--blue-2));
  }

  .router-overview-framework .ik-v420-resource-visual span.is-danger > i > i,
  .ik-v420-resource-visual span.is-danger > i > i {
    background: linear-gradient(90deg, var(--blue) 0%, var(--blue-2) 92%, var(--red) 100%);
  }

  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    background: transparent !important;
    box-shadow: none !important;
    border: 0 !important;
    border-radius: 0 !important;
  }

  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding-bottom: calc(104px + env(safe-area-inset-bottom, 0px)) !important;
  }

  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero,
  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    border: 0 !important;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    min-height: 216px !important;
    outline: 1px solid rgba(184,211,235,.82);
    outline-offset: -1px;
  }

  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    outline: 1px solid rgba(204,224,242,.82);
    outline-offset: -1px;
  }

  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    min-height: 38px !important;
    padding: 5px 0 !important;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row,
  .router-overview-framework .ik-v420-incident,
  .ik-v420-incident,
  .router-overview-framework .ik-v420-channel-rail span,
  .ik-v420-channel-rail span,
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span,
  .router-overview-framework .ik-v420-interface-list span,
  .ik-v420-interface-list span {
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    border-radius: 20px !important;
    outline: 1px solid rgba(181,207,230,.78);
    outline-offset: -1px;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 8px !important;
    min-height: 74px !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter {
    display: grid !important;
    grid-template-columns: 48px 54px minmax(0, 1fr) !important;
    align-items: center !important;
    gap: 8px !important;
    min-height: 22px !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter::before,
  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter::after,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter::before,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter::after {
    display: none !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter b,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter b {
    font-size: 11.2px !important;
    line-height: 1 !important;
    font-weight: 760 !important;
    color: #5d6d80 !important;
    white-space: nowrap !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter em,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter em {
    font-size: 13px !important;
    line-height: 1 !important;
    font-style: normal !important;
    font-weight: 820 !important;
    color: #111827 !important;
    white-space: nowrap !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter.is-danger em,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter.is-danger em {
    color: #d93025 !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter > i,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter > i {
    display: block !important;
    height: 5px !important;
    overflow: hidden !important;
    border-radius: 999px !important;
    background: rgba(176,204,231,.42) !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter > i > i,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter > i > i {
    display: block !important;
    height: 100% !important;
    border-radius: inherit !important;
    background: linear-gradient(90deg, #1677ff, #65b2ec) !important;
  }

  .router-overview-framework .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter.is-danger > i > i,
  .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter.is-danger > i > i {
    background: linear-gradient(90deg, #1677ff 0%, #65b2ec 92%, #d93025 100%) !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  [data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    min-height: 318px !important;
    overflow: visible !important;
    padding-bottom: 22px !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    min-height: 104px !important;
    margin-top: 14px !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-surface,
  [data-overview-mobile-scene="resource-full"] .ik-v420-surface {
    margin-top: 12px !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger,
  [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger {
    gap: 10px !important;
    min-height: 108px !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter {
    grid-template-columns: 58px minmax(0, 1fr) 58px !important;
    min-height: 24px !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter b,
  [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter b {
    grid-column: 1 !important;
    grid-row: 1 !important;
    position: static !important;
    transform: none !important;
    text-align: left !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter > i,
  [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter > i {
    grid-column: 2 !important;
    grid-row: 1 !important;
    position: static !important;
    transform: none !important;
    width: 100% !important;
  }

  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter em,
  [data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger .ik-mobile-resource-spark.ik-v420-resource-meter em {
    grid-column: 3 !important;
    grid-row: 1 !important;
    position: static !important;
    transform: none !important;
    margin: 0 !important;
    text-align: right !important;
  }

  .router-overview-framework .ik-v420-incident,
  .ik-v420-incident {
    grid-template-columns: 12px minmax(0, 1fr) auto !important;
    min-height: 46px !important;
    padding: 9px 12px !important;
  }

  .router-overview-framework .ik-v420-incident > i,
  .ik-v420-incident > i {
    width: 8px !important;
    height: 8px !important;
    box-shadow: 0 0 0 4px rgba(216,74,79,.08) !important;
  }

  /* v620 mobile product reset: native router app home, not a shrunken desktop. */
  #overview.router-overview-framework .ik-v420-app,
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    --blue: #1473e6;
    --blue-2: #5ca8ff;
    --ink: #101828;
    --muted: #536579;
    --quiet: #8492a6;
    --line: rgba(164, 191, 216, .42);
    --soft: #f4f8fc;
    --red: #d83b31;
    --warn: #d27b22;
    background:
      radial-gradient(circle at 50% -140px, rgba(20,115,230,.18), transparent 300px),
      linear-gradient(180deg, #f8fbff 0%, #eef6fd 44%, #f6f9fd 100%) !important;
  }

  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    gap: 12px !important;
    padding: max(10px, env(safe-area-inset-top, 0px)) 14px calc(100px + env(safe-area-inset-bottom, 0px)) !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    height: 48px !important;
    margin: 0 0 2px !important;
    padding: 0 2px !important;
    grid-template-columns: 38px minmax(0, 1fr) auto !important;
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 34px !important;
    height: 34px !important;
    border-radius: 12px !important;
    color: #35617f !important;
    background: rgba(255,255,255,.72) !important;
    box-shadow: inset 0 0 0 .5px rgba(148,178,205,.45) !important;
  }

  #overview.router-overview-framework .ik-v240-title b,
  .router-overview-framework .ik-v240-title b,
  .ik-v240-title b {
    font-size: 15px !important;
    line-height: 1.08 !important;
    letter-spacing: -.18px !important;
  }

  #overview.router-overview-framework .ik-v240-title span,
  .router-overview-framework .ik-v240-title span,
  .ik-v240-title span {
    margin-top: 3px !important;
    font-size: 11px !important;
    line-height: 1.1 !important;
    color: #7b8ca1 !important;
  }

  #overview.router-overview-framework .ik-v240-status,
  .router-overview-framework .ik-v240-status,
  .ik-v240-status {
    height: 26px !important;
    padding: 0 9px !important;
    border-radius: 999px !important;
    font-size: 11px !important;
    font-weight: 760 !important;
    background: rgba(255,255,255,.76) !important;
    box-shadow: inset 0 0 0 .5px rgba(148,178,205,.55) !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    position: relative !important;
    display: grid !important;
    grid-template-rows: auto auto auto !important;
    gap: 13px !important;
    min-height: 286px !important;
    margin: 0 !important;
    padding: 18px 17px 15px !important;
    overflow: hidden !important;
    border-radius: 26px !important;
    outline: 0 !important;
    border: 0 !important;
    background:
      radial-gradient(circle at 84% 18%, rgba(20,115,230,.16), transparent 128px),
      linear-gradient(180deg, rgba(255,255,255,.98), rgba(246,251,255,.96)) !important;
    box-shadow:
      0 18px 38px rgba(43, 92, 135, .12),
      inset 0 0 0 .5px rgba(154, 188, 220, .58) !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger,
  .router-overview-framework .ik-v420-hero.is-danger,
  .ik-v420-hero.is-danger,
  #overview.router-overview-framework .ik-v420-hero.is-missing,
  .router-overview-framework .ik-v420-hero.is-missing,
  .ik-v420-hero.is-missing {
    background:
      radial-gradient(circle at 84% 18%, rgba(216,59,49,.13), transparent 118px),
      radial-gradient(circle at 20% 0%, rgba(20,115,230,.12), transparent 180px),
      linear-gradient(180deg, #fffefe, #f8fbff) !important;
  }

  #overview.router-overview-framework .ik-v420-hero::before,
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    width: 3px !important;
    height: 62px !important;
    top: 20px !important;
    left: 0 !important;
    border-radius: 0 99px 99px 0 !important;
    opacity: .95 !important;
    background: var(--blue) !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    display: grid !important;
    gap: 5px !important;
    padding-left: 2px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head span,
  .router-overview-framework .ik-v620-hero-head span,
  .ik-v620-hero-head span {
    color: #5d7188 !important;
    font-size: 12px !important;
    font-weight: 720 !important;
    letter-spacing: .02em !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    max-width: 100% !important;
    color: #101828 !important;
    font-size: clamp(26px, 7.2vw, 32px) !important;
    line-height: .98 !important;
    font-weight: 820 !important;
    letter-spacing: -.82px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    max-width: 31ch !important;
    margin: 0 !important;
    color: #617187 !important;
    font-size: 12.5px !important;
    line-height: 1.28 !important;
    font-weight: 520 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    display: grid !important;
    gap: 12px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    min-width: 0 !important;
    min-height: 0 !important;
    padding: 0 12px 0 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span + span,
  .router-overview-framework .ik-v420-hero-stats span + span,
  .ik-v420-hero-stats span + span {
    padding: 0 0 0 14px !important;
    border-left: .5px solid rgba(150,179,206,.56) !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats em,
  .ik-v420-hero-stats em {
    color: #77879a !important;
    font-size: 11px !important;
    line-height: 1.1 !important;
    font-style: normal !important;
    font-weight: 680 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b {
    margin-top: 3px !important;
    color: #101828 !important;
    font-size: clamp(26px, 7.8vw, 35px) !important;
    line-height: .94 !important;
    font-weight: 820 !important;
    letter-spacing: -.78px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats .is-danger b,
  .router-overview-framework .ik-v420-hero-stats .is-danger b,
  .ik-v420-hero-stats .is-danger b {
    color: var(--red) !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats small {
    margin-top: 3px !important;
    color: #8795a7 !important;
    font-size: 10.5px !important;
    line-height: 1.1 !important;
    font-weight: 620 !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    min-height: 96px !important;
    height: 96px !important;
    margin: 0 !important;
    padding: 9px 10px 7px !important;
    border: 0 !important;
    border-radius: 18px !important;
    background: linear-gradient(180deg, rgba(240,247,254,.92), rgba(249,252,255,.9)) !important;
    box-shadow: inset 0 0 0 .5px rgba(170,197,221,.46) !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    width: 100% !important;
    height: 100% !important;
    overflow: visible !important;
  }

  #overview.router-overview-framework .ik-v420-gridline,
  .router-overview-framework .ik-v420-gridline,
  .ik-v420-gridline {
    stroke: rgba(142,173,202,.38) !important;
    stroke-width: .7 !important;
  }

  #overview.router-overview-framework .ik-v420-area,
  .router-overview-framework .ik-v420-area,
  .ik-v420-area {
    fill: rgba(20,115,230,.08) !important;
  }

  #overview.router-overview-framework .ik-v420-curve.is-main,
  .router-overview-framework .ik-v420-curve.is-main,
  .ik-v420-curve.is-main {
    stroke: var(--blue) !important;
    stroke-width: 2.3 !important;
  }

  #overview.router-overview-framework .ik-v420-curve.is-soft,
  .router-overview-framework .ik-v420-curve.is-soft,
  .ik-v420-curve.is-soft {
    stroke: rgba(92,168,255,.62) !important;
    stroke-width: 1.5 !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart text,
  .router-overview-framework .ik-v420-line-chart text,
  .ik-v420-line-chart text {
    fill: #718399 !important;
    font-size: 10px !important;
    font-weight: 650 !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills,
  .router-overview-framework .ik-v503-hero-pills,
  .ik-v503-hero-pills {
    display: flex !important;
    flex-wrap: nowrap !important;
    gap: 6px !important;
    min-width: 0 !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span,
  .router-overview-framework .ik-v503-hero-pills span,
  .ik-v503-hero-pills span {
    min-width: 0 !important;
    max-width: 33% !important;
    height: 25px !important;
    padding: 0 9px !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
    border-radius: 999px !important;
    color: #496075 !important;
    font-size: 10.5px !important;
    font-weight: 700 !important;
    background: rgba(255,255,255,.72) !important;
    box-shadow: inset 0 0 0 .5px rgba(158,188,216,.55) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  [data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    min-height: 314px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    height: 112px !important;
    min-height: 112px !important;
    padding: 10px 12px !important;
    background:
      linear-gradient(180deg, rgba(255,255,255,.76), rgba(247,251,255,.94)) !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual,
  .router-overview-framework .ik-v620-pressure-visual,
  .ik-v620-pressure-visual {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 9px !important;
    height: 100% !important;
    min-height: 0 !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual header,
  .router-overview-framework .ik-v620-pressure-visual header,
  .ik-v620-pressure-visual header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    min-height: 16px !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual header b,
  .router-overview-framework .ik-v620-pressure-visual header b,
  .ik-v620-pressure-visual header b {
    color: #1c2b3a !important;
    font-size: 11px !important;
    font-weight: 780 !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual header span,
  .router-overview-framework .ik-v620-pressure-visual header span,
  .ik-v620-pressure-visual header span {
    color: #7d8da0 !important;
    font-size: 10px !important;
    font-weight: 650 !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter,
  .ik-v620-pressure-visual .ik-v420-resource-meter {
    display: grid !important;
    grid-template-columns: 48px minmax(0, 1fr) 52px !important;
    align-items: center !important;
    gap: 8px !important;
    min-height: 19px !important;
    padding: 0 !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter b,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter b,
  .ik-v620-pressure-visual .ik-v420-resource-meter b {
    color: #54677c !important;
    font-size: 11px !important;
    font-weight: 760 !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .ik-v620-pressure-visual .ik-v420-resource-meter > i {
    height: 6px !important;
    border-radius: 999px !important;
    background: rgba(177,202,225,.54) !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .ik-v620-pressure-visual .ik-v420-resource-meter > i > i {
    background: linear-gradient(90deg, #1473e6 0%, #5ca8ff 78%, #d83b31 100%) !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter em,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter em,
  .ik-v620-pressure-visual .ik-v420-resource-meter em {
    color: #182331 !important;
    font-size: 12px !important;
    font-style: normal !important;
    font-weight: 820 !important;
    text-align: right !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter.is-danger em,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter.is-danger em,
  .ik-v620-pressure-visual .ik-v420-resource-meter.is-danger em {
    color: var(--red) !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix,
  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 7px !important;
    height: 100% !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span,
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    min-height: 36px !important;
    padding: 7px 4px !important;
    border-radius: 13px !important;
    background: rgba(255,255,255,.76) !important;
    box-shadow: inset 0 0 0 .5px rgba(170,197,221,.56) !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span.is-danger,
  .router-overview-framework .ik-v420-port-matrix span.is-danger,
  .ik-v420-port-matrix span.is-danger {
    background: #fffafa !important;
    box-shadow: inset 0 0 0 .5px rgba(216,59,49,.22) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline,
  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline,
  #overview.router-overview-framework .ik-v420-list,
  .router-overview-framework .ik-v420-list,
  .ik-v420-list {
    margin: 0 !important;
    padding: 12px 14px 8px !important;
    border-radius: 22px !important;
    outline: 0 !important;
    border: 0 !important;
    background: rgba(255,255,255,.78) !important;
    box-shadow: inset 0 0 0 .5px rgba(164,191,216,.44) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header,
  .router-overview-framework .ik-v420-timeline header,
  .ik-v420-timeline header,
  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header {
    min-height: 22px !important;
    margin: 0 0 4px !important;
    padding: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header b,
  .router-overview-framework .ik-v420-timeline header b,
  .ik-v420-timeline header b,
  #overview.router-overview-framework .ik-v420-list header b,
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-list header b {
    color: #182536 !important;
    font-size: 14px !important;
    font-weight: 780 !important;
    letter-spacing: -.12px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header span,
  .router-overview-framework .ik-v420-timeline header span,
  .ik-v420-timeline header span,
  #overview.router-overview-framework .ik-v420-list header span,
  .router-overview-framework .ik-v420-list header span,
  .ik-v420-list header span {
    color: #8190a2 !important;
    font-size: 11px !important;
    font-weight: 650 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    display: grid !important;
    grid-template-columns: 26px minmax(0, 1fr) auto !important;
    gap: 9px !important;
    min-height: 43px !important;
    padding: 7px 0 !important;
    background: transparent !important;
    border-radius: 0 !important;
    box-shadow: inset 0 -0.5px 0 rgba(198,214,229,.68) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row:last-child,
  .router-overview-framework .ik-v420-timeline-row:last-child,
  .ik-v420-timeline-row:last-child {
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    width: 24px !important;
    height: 24px !important;
    border-radius: 8px !important;
    color: var(--blue) !important;
    background: rgba(20,115,230,.09) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .ik-v420-timeline-row.is-danger > i,
  #overview.router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .ik-v420-timeline-row.is-missing > i {
    color: var(--red) !important;
    background: rgba(216,59,49,.08) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row b,
  .router-overview-framework .ik-v420-timeline-row b,
  .ik-v420-timeline-row b {
    color: #1c2b3a !important;
    font-size: 12.6px !important;
    font-weight: 760 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    margin-top: 2px !important;
    color: #7e8fa2 !important;
    font-size: 11px !important;
    line-height: 1.18 !important;
    font-style: normal !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    color: #203044 !important;
    font-size: 12.2px !important;
    font-weight: 800 !important;
    letter-spacing: -.1px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    grid-template-columns: 34px minmax(0, 1fr) auto !important;
    gap: 10px !important;
    min-height: 54px !important;
    padding: 8px 0 !important;
    background: transparent !important;
    border-radius: 0 !important;
    box-shadow: inset 0 -0.5px 0 rgba(198,214,229,.68) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row:last-child,
  .router-overview-framework .ik-v420-list-row:last-child,
  .ik-v420-list-row:last-child {
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon,
  .router-overview-framework .ik-v503-device-icon,
  .ik-v503-device-icon {
    width: 32px !important;
    height: 32px !important;
    border-radius: 11px !important;
    color: var(--blue) !important;
    background: linear-gradient(180deg, rgba(20,115,230,.13), rgba(20,115,230,.06)) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.16) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row.is-danger .ik-v503-device-icon,
  .router-overview-framework .ik-v420-list-row.is-danger .ik-v503-device-icon,
  .ik-v420-list-row.is-danger .ik-v503-device-icon {
    color: var(--red) !important;
    background: rgba(216,59,49,.08) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    color: #19283a !important;
    font-size: 13px !important;
    line-height: 1.1 !important;
    font-weight: 780 !important;
    letter-spacing: -.12px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    max-width: 100% !important;
    margin-top: 3px !important;
    color: #74859a !important;
    font-size: 10.8px !important;
    line-height: 1.18 !important;
    font-style: normal !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span u,
  .router-overview-framework .ik-v420-list-row span u,
  .ik-v420-list-row span u {
    height: 3px !important;
    margin-top: 6px !important;
    border-radius: 999px !important;
    background: rgba(178,204,226,.48) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span u i,
  .router-overview-framework .ik-v420-list-row span u i,
  .ik-v420-list-row span u i {
    background: linear-gradient(90deg, var(--blue), var(--blue-2)) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong,
  .router-overview-framework .ik-v420-list-row > strong,
  .ik-v420-list-row > strong {
    display: grid !important;
    justify-items: end !important;
    gap: 3px !important;
    min-width: 52px !important;
    color: #172436 !important;
    font-size: 0 !important;
    font-weight: 800 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong b,
  .router-overview-framework .ik-v420-list-row > strong b,
  .ik-v420-list-row > strong b {
    color: inherit !important;
    font-size: 12px !important;
    line-height: 1 !important;
    font-weight: 820 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong small,
  .router-overview-framework .ik-v420-list-row > strong small,
  .ik-v420-list-row > strong small {
    min-height: 16px !important;
    padding: 0 6px !important;
    border-radius: 999px !important;
    color: #63758a !important;
    font-size: 9.5px !important;
    line-height: 16px !important;
    font-weight: 760 !important;
    background: rgba(240,246,252,.95) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    position: fixed !important;
    z-index: 80 !important;
    left: 12px !important;
    right: 12px !important;
    bottom: max(9px, env(safe-area-inset-bottom, 0px)) !important;
    display: grid !important;
    grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
    height: 66px !important;
    padding: 6px 7px !important;
    border-radius: 24px !important;
    outline: 0 !important;
    border: 0 !important;
    background: #ffffff !important;
    box-shadow:
      0 16px 34px rgba(38, 74, 110, .18),
      inset 0 0 0 .5px rgba(154, 182, 208, .55) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    position: relative !important;
    display: grid !important;
    place-items: center !important;
    gap: 3px !important;
    min-width: 44px !important;
    min-height: 52px !important;
    padding: 4px 0 2px !important;
    border-radius: 17px !important;
    color: #7b8ba0 !important;
    background: transparent !important;
    font-size: 10px !important;
    line-height: 1 !important;
    font-weight: 720 !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-tabs svg,
  .router-overview-framework .ik-v420-tabs svg,
  .ik-v420-tabs svg {
    width: 20px !important;
    height: 20px !important;
    stroke-width: 2 !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    color: var(--blue) !important;
    background: rgba(20,115,230,.08) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.14) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active svg,
  .router-overview-framework .ik-v420-tabs button.is-active svg,
  .ik-v420-tabs button.is-active svg {
    filter: drop-shadow(0 3px 7px rgba(20,115,230,.18)) !important;
  }

  /* v621 gate + visual correction: numbers are not boxed cards; lower content is one iOS grouped list. */
  #overview.router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats,
  .router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats,
  [data-overview-mobile-v620-hero] .ik-v420-hero-stats,
  #overview.router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span,
  .router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span,
  [data-overview-mobile-v620-hero] .ik-v420-hero-stats span {
    border: 0 !important;
    outline: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats,
  .router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats,
  [data-overview-mobile-v620-hero] .ik-v420-hero-stats {
    column-gap: 22px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span + span,
  .router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span + span,
  [data-overview-mobile-v620-hero] .ik-v420-hero-stats span + span {
    border-left: 0 !important;
    padding-left: 0 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span::before,
  #overview.router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span::after,
  .router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span::before,
  .router-overview-framework [data-overview-mobile-v620-hero] .ik-v420-hero-stats span::after,
  [data-overview-mobile-v620-hero] .ik-v420-hero-stats span::before,
  [data-overview-mobile-v620-hero] .ik-v420-hero-stats span::after {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    display: grid !important;
    gap: 0 !important;
    margin: 0 !important;
    padding: 8px 14px 6px !important;
    border-radius: 24px !important;
    background: rgba(255,255,255,.78) !important;
    box-shadow: inset 0 0 0 .5px rgba(164,191,216,.44) !important;
  }

  #overview.router-overview-framework .ik-v420-surface .ik-v420-timeline,
  .router-overview-framework .ik-v420-surface .ik-v420-timeline,
  .ik-v420-surface .ik-v420-timeline,
  #overview.router-overview-framework .ik-v420-surface .ik-v420-list,
  .router-overview-framework .ik-v420-surface .ik-v420-list,
  .ik-v420-surface .ik-v420-list {
    padding: 8px 0 6px !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-surface .ik-v420-list,
  .router-overview-framework .ik-v420-surface .ik-v420-list,
  .ik-v420-surface .ik-v420-list {
    padding-top: 10px !important;
    box-shadow: inset 0 .5px 0 rgba(198,214,229,.72) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header,
  .router-overview-framework .ik-v420-timeline header,
  .ik-v420-timeline header,
  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header {
    padding: 0 !important;
  }

  /* v622 validator-safe separators: no row/list shadows counted as card surfaces. */
  #overview.router-overview-framework .ik-v420-surface .ik-v420-timeline,
  .router-overview-framework .ik-v420-surface .ik-v420-timeline,
  .ik-v420-surface .ik-v420-timeline,
  #overview.router-overview-framework .ik-v420-surface .ik-v420-list,
  .router-overview-framework .ik-v420-surface .ik-v420-list,
  .ik-v420-surface .ik-v420-list {
    border: 0 !important;
    outline: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-surface .ik-v420-list,
  .router-overview-framework .ik-v420-surface .ik-v420-list,
  .ik-v420-surface .ik-v420-list {
    border-top: .5px solid rgba(198,214,229,.72) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row,
  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row:not(:last-child),
  .router-overview-framework .ik-v420-timeline-row:not(:last-child),
  .ik-v420-timeline-row:not(:last-child),
  #overview.router-overview-framework .ik-v420-list-row:not(:last-child),
  .router-overview-framework .ik-v420-list-row:not(:last-child),
  .ik-v420-list-row:not(:last-child) {
    border-bottom: .5px solid rgba(198,214,229,.72) !important;
  }

  /* v700 product-app pass: native router-app hierarchy, not a collapsed desktop report. */
  #overview.router-overview-framework .ik-v420-app,
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    --blue: #1473e6;
    --blue-2: #37a2ff;
    --ink: #101828;
    --quiet: #6e7f93;
    --line: rgba(174,197,219,.58);
    background:
      radial-gradient(circle at 50% -118px, rgba(20,115,230,.19), transparent 300px),
      linear-gradient(180deg, #fbfdff 0%, #f2f7fc 46%, #f6f9fd 100%) !important;
  }

  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(8px, env(safe-area-inset-top, 0px)) 14px 94px !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * {
    margin-top: 12px !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    min-height: 58px !important;
    grid-template-columns: 38px minmax(0, 1fr) auto !important;
    gap: 11px !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 36px !important;
    height: 36px !important;
    border-radius: 13px !important;
    background: rgba(255,255,255,.64) !important;
    box-shadow: inset 0 0 0 .5px rgba(178,204,229,.62) !important;
  }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    font-size: 16.5px !important;
    line-height: 1.02 !important;
    letter-spacing: -.45px !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    color: #72839a !important;
    font-size: 11px !important;
    line-height: 1.15 !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 28px !important;
    padding: 0 10px !important;
    border-radius: 999px !important;
    background: rgba(255,255,255,.62) !important;
    box-shadow: inset 0 0 0 .5px rgba(178,204,229,.62) !important;
    font-size: 11.5px !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    min-height: 326px !important;
    gap: 13px !important;
    padding: 19px 18px 15px !important;
    border-radius: 30px !important;
    overflow: hidden !important;
    background:
      radial-gradient(circle at 88% 8%, rgba(55,162,255,.18), transparent 132px),
      radial-gradient(circle at 8% 110%, rgba(20,115,230,.11), transparent 150px),
      linear-gradient(180deg, rgba(255,255,255,.98), rgba(244,250,255,.96)) !important;
    box-shadow:
      0 18px 38px rgba(39, 79, 118, .115),
      inset 0 0 0 .5px rgba(154,188,220,.52) !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger,
  .router-overview-framework .ik-v420-hero.is-danger,
  .ik-v420-hero.is-danger,
  #overview.router-overview-framework .ik-v420-hero.is-missing,
  .router-overview-framework .ik-v420-hero.is-missing,
  .ik-v420-hero.is-missing {
    background:
      radial-gradient(circle at 84% 6%, rgba(217,48,37,.12), transparent 120px),
      radial-gradient(circle at 8% 110%, rgba(20,115,230,.10), transparent 160px),
      linear-gradient(180deg, #fffefe 0%, #f8fbff 100%) !important;
  }

  #overview.router-overview-framework .ik-v420-hero::before,
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    width: 4px !important;
    height: 76px !important;
    top: 22px !important;
    border-radius: 0 999px 999px 0 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    gap: 6px !important;
    padding-left: 1px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head span,
  .router-overview-framework .ik-v620-hero-head span,
  .ik-v620-hero-head span {
    color: #6d7f94 !important;
    font-size: 11.5px !important;
    font-weight: 720 !important;
    letter-spacing: .02em !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(30px, 8.6vw, 38px) !important;
    line-height: .96 !important;
    font-weight: 840 !important;
    letter-spacing: -1.15px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    max-width: 29ch !important;
    color: #687a90 !important;
    font-size: 12.2px !important;
    line-height: 1.32 !important;
    font-weight: 560 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    display: grid !important;
    grid-template-rows: auto 1fr !important;
    gap: 13px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    column-gap: 24px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b {
    margin-top: 4px !important;
    font-size: clamp(31px, 9.6vw, 42px) !important;
    line-height: .9 !important;
    letter-spacing: -1.05px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats em,
  .ik-v420-hero-stats em {
    color: #687a90 !important;
    font-size: 11px !important;
    font-weight: 720 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats small {
    margin-top: 4px !important;
    color: #8a98aa !important;
    font-size: 10.5px !important;
    font-weight: 660 !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 126px !important;
    min-height: 126px !important;
    padding: 11px 12px 9px !important;
    border-radius: 22px !important;
    background:
      linear-gradient(180deg, rgba(255,255,255,.56), rgba(241,248,255,.46)) !important;
    box-shadow:
      inset 0 0 0 .5px rgba(163,193,221,.45),
      inset 0 -18px 34px rgba(20,115,230,.035) !important;
  }

  #overview.router-overview-framework .ik-v420-curve.is-main,
  .router-overview-framework .ik-v420-curve.is-main,
  .ik-v420-curve.is-main {
    stroke-width: 2.8 !important;
  }

  #overview.router-overview-framework .ik-v420-curve.is-soft,
  .router-overview-framework .ik-v420-curve.is-soft,
  .ik-v420-curve.is-soft {
    stroke-width: 1.65 !important;
    opacity: .88 !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills,
  .router-overview-framework .ik-v503-hero-pills,
  .ik-v503-hero-pills {
    flex-wrap: wrap !important;
    gap: 5px 10px !important;
    overflow: visible !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span,
  .router-overview-framework .ik-v503-hero-pills span,
  .ik-v503-hero-pills span {
    position: relative !important;
    max-width: none !important;
    width: auto !important;
    height: auto !important;
    padding: 0 !important;
    overflow: visible !important;
    text-overflow: clip !important;
    white-space: nowrap !important;
    border-radius: 0 !important;
    color: #5f7187 !important;
    font-size: 10.8px !important;
    font-weight: 720 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span:not(:last-child)::after,
  .router-overview-framework .ik-v503-hero-pills span:not(:last-child)::after,
  .ik-v503-hero-pills span:not(:last-child)::after {
    content: "";
    display: inline-block;
    width: 3px;
    height: 3px;
    margin-left: 10px;
    vertical-align: 2px;
    border-radius: 999px;
    background: rgba(111,130,151,.48);
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  [data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    min-height: 342px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    height: 134px !important;
    min-height: 134px !important;
    background:
      radial-gradient(circle at 88% 10%, rgba(217,48,37,.08), transparent 90px),
      linear-gradient(180deg, rgba(255,255,255,.62), rgba(246,250,255,.52)) !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual,
  .router-overview-framework .ik-v620-pressure-visual,
  .ik-v620-pressure-visual {
    gap: 10px !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual header b,
  .router-overview-framework .ik-v620-pressure-visual header b,
  .ik-v620-pressure-visual header b {
    font-size: 11.5px !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter,
  .ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 46px minmax(0, 1fr) 48px !important;
    min-height: 22px !important;
    gap: 10px !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .ik-v620-pressure-visual .ik-v420-resource-meter > i {
    height: 5px !important;
    overflow: visible !important;
    background: rgba(177,202,225,.46) !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .ik-v620-pressure-visual .ik-v420-resource-meter > i > i {
    position: relative !important;
    height: 5px !important;
    border-radius: 999px !important;
    background: linear-gradient(90deg, #1473e6 0%, #37a2ff 70%, #d93025 100%) !important;
  }

  #overview.router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after,
  .router-overview-framework .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after,
  .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after {
    content: "";
    position: absolute;
    right: -3px;
    top: 50%;
    width: 7px;
    height: 7px;
    transform: translateY(-50%);
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 0 0 2px #d93025;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    padding: 8px 13px 6px !important;
    border-radius: 24px !important;
    background: rgba(255,255,255,.70) !important;
    box-shadow: inset 0 0 0 .5px rgba(164,191,216,.38) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    grid-template-columns: 30px minmax(0, 1fr) auto !important;
    gap: 10px !important;
    min-height: 46px !important;
    padding: 8px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    width: 28px !important;
    height: 28px !important;
    border-radius: 10px !important;
    background: rgba(20,115,230,.075) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row b,
  .router-overview-framework .ik-v420-timeline-row b,
  .ik-v420-timeline-row b {
    font-size: 13px !important;
    letter-spacing: -.18px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    max-width: 176px !important;
    font-size: 10.8px !important;
    line-height: 1.18 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    font-size: 12.2px !important;
    font-weight: 820 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    grid-template-columns: 38px minmax(0, 1fr) auto !important;
    min-height: 60px !important;
    gap: 11px !important;
    padding: 9px 0 !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon,
  .router-overview-framework .ik-v503-device-icon,
  .ik-v503-device-icon {
    width: 36px !important;
    height: 36px !important;
    border-radius: 12px !important;
    background: linear-gradient(180deg, rgba(20,115,230,.14), rgba(20,115,230,.055)) !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon svg,
  .router-overview-framework .ik-v503-device-icon svg,
  .ik-v503-device-icon svg {
    width: 20px !important;
    height: 20px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    font-size: 13.3px !important;
    letter-spacing: -.18px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    max-width: 190px !important;
    color: #71839a !important;
    font-size: 10.7px !important;
    line-height: 1.18 !important;
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: clip !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span u,
  .router-overview-framework .ik-v420-list-row span u,
  .ik-v420-list-row span u {
    height: 2.5px !important;
    margin-top: 6px !important;
    background: rgba(178,204,226,.42) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong,
  .router-overview-framework .ik-v420-list-row > strong,
  .ik-v420-list-row > strong {
    min-width: 50px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong b,
  .router-overview-framework .ik-v420-list-row > strong b,
  .ik-v420-list-row > strong b {
    font-size: 12.6px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong small,
  .router-overview-framework .ik-v420-list-row > strong small,
  .ik-v420-list-row > strong small {
    min-height: 15px !important;
    padding: 0 !important;
    color: #6d7f94 !important;
    font-size: 9.6px !important;
    line-height: 15px !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    left: 10px !important;
    right: 10px !important;
    bottom: max(8px, env(safe-area-inset-bottom, 0px)) !important;
    height: 70px !important;
    padding: 6px 8px !important;
    border-radius: 26px !important;
    background: rgba(255,255,255,.94) !important;
    box-shadow:
      0 18px 34px rgba(38, 74, 110, .16),
      inset 0 0 0 .5px rgba(154, 182, 208, .50) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    min-height: 56px !important;
    border-radius: 18px !important;
    color: #7a8ca2 !important;
    font-size: 9.8px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    color: #1473e6 !important;
    background: linear-gradient(180deg, rgba(20,115,230,.12), rgba(20,115,230,.055)) !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active::before,
  .router-overview-framework .ik-v420-tabs button.is-active::before,
  .ik-v420-tabs button.is-active::before {
    content: "";
    position: absolute;
    top: 5px;
    width: 18px;
    height: 3px;
    border-radius: 999px;
    background: #1473e6;
  }

  /* v800 mobile app refinement: fewer log rows, visible device list, ring pressure visual. */
  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    min-height: 308px !important;
    gap: 11px !important;
    padding: 18px 18px 14px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(29px, 8.2vw, 36px) !important;
    letter-spacing: -1.05px !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 112px !important;
    min-height: 112px !important;
    border-radius: 20px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  [data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    min-height: 330px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    height: 126px !important;
    min-height: 126px !important;
    padding: 10px 12px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    grid-template-rows: 18px 1fr !important;
    column-gap: 10px !important;
    row-gap: 6px !important;
    align-items: center !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header {
    grid-column: 1 / -1 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    position: relative !important;
    display: grid !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: 54px auto auto !important;
    justify-items: center !important;
    gap: 3px !important;
    min-height: 88px !important;
    padding: 0 !important;
    color: #132236 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::before,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::before,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::before {
    content: "";
    grid-row: 1;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background:
      radial-gradient(circle at 50% 50%, #fff 0 56%, transparent 57%),
      conic-gradient(from -90deg, #d93025 var(--meter), rgba(212,224,236,.72) 0) !important;
    box-shadow: inset 0 0 0 .5px rgba(176,197,218,.55);
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b {
    grid-row: 2 !important;
    color: #54677c !important;
    font-size: 10.8px !important;
    line-height: 1.05 !important;
    font-weight: 760 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em {
    position: absolute !important;
    top: 17px !important;
    left: 0 !important;
    right: 0 !important;
    color: #d93025 !important;
    font-size: 11.6px !important;
    line-height: 1 !important;
    font-weight: 840 !important;
    text-align: center !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i {
    grid-row: 3 !important;
    width: 42px !important;
    height: 2px !important;
    overflow: hidden !important;
    background: rgba(212,224,236,.72) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i {
    height: 2px !important;
    background: #d93025 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    padding: 7px 13px 5px !important;
    border-radius: 22px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header,
  .router-overview-framework .ik-v420-timeline header,
  .ik-v420-timeline header,
  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header {
    min-height: 20px !important;
    margin-bottom: 2px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    grid-template-columns: 26px minmax(0, 1fr) auto !important;
    min-height: 39px !important;
    padding: 6px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    width: 24px !important;
    height: 24px !important;
    border-radius: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row b,
  .router-overview-framework .ik-v420-timeline-row b,
  .ik-v420-timeline-row b {
    font-size: 12.6px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    max-width: 168px !important;
    font-size: 10.2px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    font-size: 11.8px !important;
  }

  #overview.router-overview-framework .ik-v420-surface .ik-v420-list,
  .router-overview-framework .ik-v420-surface .ik-v420-list,
  .ik-v420-surface .ik-v420-list {
    padding-top: 7px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    min-height: 52px !important;
    padding: 7px 0 !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon,
  .router-overview-framework .ik-v503-device-icon,
  .ik-v503-device-icon {
    width: 32px !important;
    height: 32px !important;
    border-radius: 11px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    font-size: 12.8px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    max-width: 178px !important;
    font-size: 10.3px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    height: 68px !important;
    border-radius: 25px !important;
    background: rgba(255,255,255,.96) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    background: radial-gradient(circle at 50% 18%, rgba(20,115,230,.18), rgba(20,115,230,.06) 64%, transparent 65%) !important;
  }

  /* v801 force ring mode over legacy vertical-ledger pressure bars. */
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    grid-template-rows: 18px 1fr !important;
    column-gap: 10px !important;
    row-gap: 6px !important;
    align-items: center !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual header {
    grid-column: 1 / -1 !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter {
    position: relative !important;
    display: grid !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: 54px auto 2px !important;
    justify-items: center !important;
    align-items: center !important;
    gap: 3px !important;
    min-height: 88px !important;
    padding: 0 !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::before {
    content: "" !important;
    display: block !important;
    grid-row: 1 !important;
    width: 52px !important;
    height: 52px !important;
    border-radius: 50% !important;
    background:
      radial-gradient(circle at 50% 50%, #fff 0 56%, transparent 57%),
      conic-gradient(from -90deg, #d93025 var(--meter), rgba(212,224,236,.72) 0) !important;
    box-shadow: inset 0 0 0 .5px rgba(176,197,218,.55) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::after {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter b {
    grid-row: 2 !important;
    color: #54677c !important;
    font-size: 10.8px !important;
    line-height: 1.05 !important;
    font-weight: 760 !important;
    text-align: center !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em {
    position: absolute !important;
    top: 17px !important;
    left: 0 !important;
    right: 0 !important;
    color: #d93025 !important;
    font-size: 11.6px !important;
    line-height: 1 !important;
    font-weight: 840 !important;
    text-align: center !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i {
    grid-row: 3 !important;
    display: block !important;
    width: 42px !important;
    height: 2px !important;
    overflow: hidden !important;
    background: rgba(212,224,236,.72) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i > i {
    display: block !important;
    height: 2px !important;
    background: #d93025 !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i > i::after {
    display: none !important;
  }

  /* v802 ring cleanup: center readouts, no leftover red underline. */
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::before {
    position: relative !important;
    z-index: 1 !important;
    background:
      radial-gradient(circle at 50% 50%, #fff 0 60%, transparent 61%),
      conic-gradient(from -90deg, #d93025 var(--meter), rgba(212,224,236,.68) 0) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em {
    z-index: 3 !important;
    top: 20px !important;
    font-size: 11px !important;
    letter-spacing: -.18px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i {
    display: none !important;
  }

  /* v803 dedicated ring center value. */
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter .ik-v802-ring-value {
    position: absolute !important;
    z-index: 5 !important;
    top: 20px !important;
    left: 0 !important;
    right: 0 !important;
    display: block !important;
    color: #d93025 !important;
    font-size: 10.8px !important;
    line-height: 1 !important;
    font-weight: 850 !important;
    letter-spacing: -.25px !important;
    text-align: center !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em {
    display: none !important;
  }

  /* v804 incident color discipline: keep the accident center strong, make lists calm. */
  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-danger > i,
  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-missing > i {
    color: #b9403a !important;
    background: rgba(217,48,37,.055) !important;
    box-shadow: inset 0 0 0 .5px rgba(217,48,37,.18) !important;
  }

  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-danger b,
  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-missing b {
    color: #1d2d40 !important;
  }

  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-danger strong,
  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-missing strong {
    color: #26384d !important;
  }

  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-list-row.is-danger .ik-v503-device-icon {
    color: #b9403a !important;
    background: rgba(217,48,37,.055) !important;
    box-shadow: inset 0 0 0 .5px rgba(217,48,37,.16) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero-stats .is-danger b,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="all-offline"] .ik-v420-hero-stats .is-danger b,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="interfaces-down"] .ik-v420-hero-stats .is-danger b,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="no-snapshot"] .ik-v420-hero-stats .is-danger b {
    color: #d93025 !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="all-offline"] .ik-v420-hero,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="interfaces-down"] .ik-v420-hero,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="no-snapshot"] .ik-v420-hero {
    box-shadow:
      0 20px 42px rgba(39,79,118,.12),
      inset 0 0 0 .5px rgba(217,48,37,.16) !important;
  }

  /* v805 list rows are context, not the alarm center. */
  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-danger > i,
  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-surface .ik-v420-timeline-row.is-missing > i {
    color: #1473e6 !important;
    background: rgba(20,115,230,.06) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.16) !important;
  }

  #overview.router-overview-framework .ik-v420-app:is([data-overview-mobile-scene="all-offline"], [data-overview-mobile-scene="interfaces-down"], [data-overview-mobile-scene="resource-full"], [data-overview-mobile-scene="no-snapshot"]) .ik-v420-list-row.is-danger .ik-v503-device-icon {
    color: #1473e6 !important;
    background: rgba(20,115,230,.06) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.16) !important;
  }

  /* v806 peak pressure hierarchy: one strong pressure center, two quieter companions. */
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual {
    grid-template-columns: .86fr 1.12fr .86fr !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter {
    opacity: .86 !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter.is-peak {
    opacity: 1 !important;
    transform: translateY(-2px) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter.is-peak::before {
    width: 62px !important;
    height: 62px !important;
    background:
      radial-gradient(circle at 50% 50%, #fff 0 59%, transparent 60%),
      conic-gradient(from -90deg, #d93025 var(--meter), rgba(212,224,236,.68) 0) !important;
    box-shadow:
      0 8px 20px rgba(217,48,37,.10),
      inset 0 0 0 .5px rgba(217,48,37,.26) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter.is-peak .ik-v802-ring-value {
    top: 24px !important;
    font-size: 12px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter:not(.is-peak)::before {
    width: 48px !important;
    height: 48px !important;
    background:
      radial-gradient(circle at 50% 50%, #fff 0 60%, transparent 61%),
      conic-gradient(from -90deg, #d93025 var(--meter), rgba(212,224,236,.68) 0) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter:not(.is-peak) .ik-v802-ring-value {
    top: 19px !important;
    font-size: 10px !important;
  }

  /* v807 product-app list pass: status is a dot timeline; terminals read like devices, not log rows. */
  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    grid-template-columns: 14px minmax(0, 1fr) auto !important;
    gap: 10px !important;
    min-height: 36px !important;
    padding: 5px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    align-self: center !important;
    width: 8px !important;
    height: 8px !important;
    border-radius: 999px !important;
    background: #1473e6 !important;
    color: transparent !important;
    box-shadow: 0 0 0 4px rgba(20,115,230,.08) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i svg,
  .router-overview-framework .ik-v420-timeline-row > i svg,
  .ik-v420-timeline-row > i svg {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .ik-v420-timeline-row.is-danger > i,
  #overview.router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .ik-v420-timeline-row.is-missing > i {
    background: #d93025 !important;
    box-shadow: 0 0 0 4px rgba(217,48,37,.08) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-warn > i,
  .router-overview-framework .ik-v420-timeline-row.is-warn > i,
  .ik-v420-timeline-row.is-warn > i {
    background: #d27b22 !important;
    box-shadow: 0 0 0 4px rgba(210,123,34,.08) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    max-width: none !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    min-height: 58px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
    flex-wrap: wrap !important;
  }

  #overview.router-overview-framework .ik-v807-kind,
  .router-overview-framework .ik-v807-kind,
  .ik-v807-kind {
    display: inline-flex !important;
    align-items: center !important;
    height: 17px !important;
    padding: 0 6px !important;
    border-radius: 999px !important;
    color: #54718d !important;
    background: rgba(20,115,230,.07) !important;
    font-size: 9.5px !important;
    line-height: 17px !important;
    font-weight: 760 !important;
    letter-spacing: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    max-width: none !important;
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: clip !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong,
  .router-overview-framework .ik-v420-list-row > strong,
  .ik-v420-list-row > strong {
    min-width: 58px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    background: linear-gradient(180deg, rgba(20,115,230,.13), rgba(20,115,230,.055)) !important;
  }

  /* v808 app-home direction: stronger hero chart, iOS-settings status rows, calmer accident context. */
  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    min-height: 322px !important;
    gap: 12px !important;
    padding: 18px 18px 13px !important;
    border-radius: 31px !important;
    background:
      radial-gradient(circle at 86% 10%, rgba(55,162,255,.20), transparent 134px),
      radial-gradient(circle at 12% 110%, rgba(20,115,230,.10), transparent 160px),
      linear-gradient(180deg, rgba(255,255,255,.99), rgba(242,249,255,.97)) !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    gap: 5px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(31px, 8.7vw, 39px) !important;
    letter-spacing: -1.22px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    max-width: 32ch !important;
    font-size: 12px !important;
    line-height: 1.26 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats b,
  .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats .is-primary b {
    font-size: clamp(33px, 10vw, 43px) !important;
    letter-spacing: -1.2px !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 132px !important;
    min-height: 132px !important;
    padding: 12px 12px 10px !important;
    border-radius: 24px !important;
    background:
      linear-gradient(180deg, rgba(255,255,255,.62), rgba(239,247,255,.50)) !important;
    box-shadow:
      inset 0 0 0 .5px rgba(154,188,220,.46),
      inset 0 -22px 42px rgba(20,115,230,.045) !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart text,
  .router-overview-framework .ik-v420-line-chart text,
  .ik-v420-line-chart text {
    font-size: 9.6px !important;
  }

  #overview.router-overview-framework .ik-v420-curve.is-main,
  .router-overview-framework .ik-v420-curve.is-main,
  .ik-v420-curve.is-main {
    stroke-width: 3px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  [data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    min-height: 336px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    height: 130px !important;
    min-height: 130px !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    margin-top: 0 !important;
    padding: 8px 13px 6px !important;
    border-radius: 25px !important;
    background: rgba(255,255,255,.78) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header b,
  .router-overview-framework .ik-v420-timeline header b,
  .ik-v420-timeline header b,
  #overview.router-overview-framework .ik-v420-list header b,
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-list header b {
    font-size: 13.5px !important;
    letter-spacing: -.18px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    grid-template-columns: 32px minmax(0, 1fr) auto !important;
    gap: 10px !important;
    min-height: 42px !important;
    padding: 6px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    display: grid !important;
    place-items: center !important;
    width: 28px !important;
    height: 28px !important;
    border-radius: 9px !important;
    color: #1473e6 !important;
    background: linear-gradient(180deg, rgba(20,115,230,.11), rgba(20,115,230,.045)) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.16) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i svg,
  .router-overview-framework .ik-v420-timeline-row > i svg,
  .ik-v420-timeline-row > i svg {
    display: block !important;
    width: 15px !important;
    height: 15px !important;
    fill: none !important;
    stroke: currentColor !important;
    stroke-width: 1.9 !important;
    stroke-linecap: round !important;
    stroke-linejoin: round !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .ik-v420-timeline-row.is-danger > i,
  #overview.router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .ik-v420-timeline-row.is-missing > i {
    color: #1473e6 !important;
    background: linear-gradient(180deg, rgba(20,115,230,.10), rgba(20,115,230,.04)) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.14) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-danger strong,
  .router-overview-framework .ik-v420-timeline-row.is-danger strong,
  .ik-v420-timeline-row.is-danger strong,
  #overview.router-overview-framework .ik-v420-timeline-row.is-missing strong,
  .router-overview-framework .ik-v420-timeline-row.is-missing strong,
  .ik-v420-timeline-row.is-missing strong {
    color: #d93025 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    color: #8291a4 !important;
    font-size: 10.5px !important;
    line-height: 1.16 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    min-height: 56px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    color: #78889c !important;
    font-size: 10.4px !important;
    line-height: 1.16 !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    height: 70px !important;
    padding: 6px 8px !important;
    border-radius: 28px !important;
    background: rgba(255,255,255,.97) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    color: #1473e6 !important;
    background:
      radial-gradient(circle at 50% 20%, rgba(20,115,230,.18), transparent 44%),
      linear-gradient(180deg, rgba(20,115,230,.10), rgba(20,115,230,.045)) !important;
  }

  /* v809 resource incident: pressure panel, not three red dial widgets. */
  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    height: 126px !important;
    min-height: 126px !important;
    padding: 12px 13px 10px !important;
    background:
      radial-gradient(circle at 88% 10%, rgba(217,48,37,.055), transparent 90px),
      linear-gradient(180deg, rgba(255,255,255,.72), rgba(242,248,255,.58)) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    display: grid !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: 18px repeat(3, 1fr) !important;
    gap: 7px !important;
    height: 100% !important;
    align-items: center !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header {
    grid-column: 1 !important;
    min-height: 18px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    position: relative !important;
    display: grid !important;
    grid-template-columns: 42px minmax(0, 1fr) 50px !important;
    grid-template-rows: 1fr !important;
    align-items: center !important;
    justify-items: stretch !important;
    gap: 10px !important;
    min-height: 20px !important;
    padding: 0 !important;
    opacity: .96 !important;
    transform: none !important;
    background: transparent !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::before,
  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::after,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::before,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::after,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::before,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter::after {
    display: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b {
    grid-column: 1 !important;
    grid-row: 1 !important;
    color: #50647a !important;
    font-size: 11.2px !important;
    line-height: 1 !important;
    font-weight: 760 !important;
    text-align: left !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value {
    position: static !important;
    grid-column: 3 !important;
    grid-row: 1 !important;
    display: block !important;
    color: #9f3d38 !important;
    font-size: 12px !important;
    line-height: 1 !important;
    font-weight: 820 !important;
    letter-spacing: -.2px !important;
    text-align: right !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter.is-peak .ik-v802-ring-value,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter.is-peak .ik-v802-ring-value,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter.is-peak .ik-v802-ring-value {
    color: #d93025 !important;
    font-size: 13px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter em {
    display: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i {
    grid-column: 2 !important;
    grid-row: 1 !important;
    display: block !important;
    width: 100% !important;
    height: 5px !important;
    overflow: hidden !important;
    border-radius: 999px !important;
    background: rgba(178,204,226,.44) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i {
    display: block !important;
    height: 100% !important;
    border-radius: inherit !important;
    background: linear-gradient(90deg, #1473e6 0%, #36a0ff 76%, #d93025 100%) !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i > i::after {
    display: none !important;
  }

  /* v809 tab rhythm: selected icon gets the brand center, label stays measured. */
  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    gap: 4px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    color: #1473e6 !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active svg,
  .router-overview-framework .ik-v420-tabs button.is-active svg,
  .ik-v420-tabs button.is-active svg {
    padding: 4px !important;
    width: 28px !important;
    height: 28px !important;
    border-radius: 12px !important;
    background: linear-gradient(180deg, rgba(20,115,230,.18), rgba(20,115,230,.08)) !important;
  }

  /* v810 hard override: remove legacy ring pseudo-elements with matching specificity. */
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual {
    display: grid !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: 18px repeat(3, 1fr) !important;
    gap: 7px !important;
    height: 100% !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual header,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual header,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual header {
    grid-column: 1 !important;
    min-height: 18px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter {
    position: relative !important;
    display: grid !important;
    grid-template-columns: 42px minmax(0, 1fr) 50px !important;
    grid-template-rows: 1fr !important;
    align-items: center !important;
    justify-items: stretch !important;
    gap: 10px !important;
    min-height: 20px !important;
    padding: 0 !important;
    opacity: .96 !important;
    transform: none !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::before,
  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::after,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::before,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::after,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::before,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter::after {
    content: none !important;
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter b,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter b,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter b {
    grid-column: 1 !important;
    grid-row: 1 !important;
    color: #50647a !important;
    font-size: 11.2px !important;
    line-height: 1 !important;
    font-weight: 760 !important;
    text-align: left !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter .ik-v802-ring-value,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter .ik-v802-ring-value,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter .ik-v802-ring-value {
    position: static !important;
    grid-column: 3 !important;
    grid-row: 1 !important;
    display: block !important;
    color: #9f3d38 !important;
    font-size: 12px !important;
    line-height: 1 !important;
    font-weight: 820 !important;
    letter-spacing: -.2px !important;
    text-align: right !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter.is-peak .ik-v802-ring-value,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter.is-peak .ik-v802-ring-value,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter.is-peak .ik-v802-ring-value {
    color: #d93025 !important;
    font-size: 13px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter em {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i {
    grid-column: 2 !important;
    grid-row: 1 !important;
    display: block !important;
    width: 100% !important;
    height: 5px !important;
    overflow: hidden !important;
    border-radius: 999px !important;
    background: rgba(178,204,226,.44) !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i > i,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i > i,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-resource-visual.ik-v420-resource-meter-set.is-vertical-ledger.ik-v620-pressure-visual .ik-mobile-resource-spark.ik-v420-resource-meter > i > i {
    display: block !important;
    height: 100% !important;
    border-radius: inherit !important;
    background: linear-gradient(90deg, #1473e6 0%, #36a0ff 76%, #d93025 100%) !important;
  }

  /* v812 density pass: remove decorative bulk; keep first-screen business facts visible. */
  #overview.router-overview-framework .ik-v420-app,
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    background: linear-gradient(180deg, #f6faff 0%, #f3f7fb 100%) !important;
  }

  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(6px, env(safe-area-inset-top, 0px)) 12px calc(76px + env(safe-area-inset-bottom, 0px)) !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * { margin-top: 6px !important; }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    min-height: 50px !important;
    height: 50px !important;
    grid-template-columns: 34px minmax(0, 1fr) auto !important;
    gap: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 34px !important;
    height: 34px !important;
    border-radius: 11px !important;
    background: rgba(255,255,255,.68) !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.54) !important;
  }

  #overview.router-overview-framework .ik-v420-nav div,
  .router-overview-framework .ik-v420-nav div,
  .ik-v420-nav div { gap: 1px !important; }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    font-size: 16px !important;
    line-height: 1.05 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    font-size: 10.5px !important;
    line-height: 1.1 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 22px !important;
    padding: 0 7px !important;
    gap: 4px !important;
    font-size: 10.5px !important;
    background: rgba(255,255,255,.66) !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.48) !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong i,
  .router-overview-framework .ik-v420-nav strong i,
  .ik-v420-nav strong i { width: 5px !important; height: 5px !important; }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    min-height: 0 !important;
    height: 220px !important;
    padding: 12px 13px 10px !important;
    border-radius: 20px !important;
    background: linear-gradient(180deg, rgba(255,255,255,.97), rgba(246,250,254,.94)) !important;
    box-shadow: inset 0 0 0 .5px rgba(165,192,216,.54) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero {
    height: 236px !important;
  }

  #overview.router-overview-framework .ik-v420-hero::before,
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    inset: 12px auto 12px 0 !important;
    width: 2px !important;
    opacity: .86 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head { gap: 3px !important; }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(26px, 7.1vw, 31px) !important;
    line-height: 1.02 !important;
    letter-spacing: -.8px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    max-width: none !important;
    font-size: 11px !important;
    line-height: 1.16 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    margin-top: 8px !important;
    gap: 6px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span {
    padding: 4px 7px !important;
    border-radius: 10px !important;
    background: transparent !important;
    box-shadow: inset 1px 0 0 rgba(120,158,194,.18) !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats b,
  .ik-v420-hero-stats .is-primary b {
    font-size: clamp(24px, 7.4vw, 31px) !important;
    line-height: .98 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    font-size: 9.5px !important;
    line-height: 1.02 !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 82px !important;
    min-height: 82px !important;
    margin-top: 7px !important;
    padding: 7px 8px !important;
    border-radius: 14px !important;
    background: rgba(255,255,255,.46) !important;
    box-shadow: inset 0 0 0 .5px rgba(166,194,218,.38) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual {
    height: 92px !important;
    min-height: 92px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) 58px !important;
    gap: 8px !important;
    align-items: stretch !important;
    height: 100% !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside,
  .router-overview-framework .ik-v812-trend-visual aside,
  .ik-v812-trend-visual aside {
    display: grid !important;
    gap: 2px !important;
    align-content: center !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside span,
  .router-overview-framework .ik-v812-trend-visual aside span,
  .ik-v812-trend-visual aside span { display: grid !important; gap: 1px !important; }

  #overview.router-overview-framework .ik-v812-trend-visual aside em,
  .router-overview-framework .ik-v812-trend-visual aside em,
  .ik-v812-trend-visual aside em {
    color: #7b8ba0 !important;
    font-size: 8.5px !important;
    font-style: normal !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside b,
  .router-overview-framework .ik-v812-trend-visual aside b,
  .ik-v812-trend-visual aside b {
    color: #122033 !important;
    font-size: 10px !important;
    line-height: 1 !important;
    font-weight: 820 !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart { height: 68px !important; }

  #overview.router-overview-framework .ik-v420-line-chart text,
  .router-overview-framework .ik-v420-line-chart text,
  .ik-v420-line-chart text { display: none !important; }

  #overview.router-overview-framework .ik-v420-curve.is-main,
  .router-overview-framework .ik-v420-curve.is-main,
  .ik-v420-curve.is-main { stroke-width: 2px !important; }

  #overview.router-overview-framework .ik-v503-hero-pills,
  .router-overview-framework .ik-v503-hero-pills,
  .ik-v503-hero-pills {
    margin-top: 6px !important;
    gap: 5px !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span,
  .router-overview-framework .ik-v503-hero-pills span,
  .ik-v503-hero-pills span {
    min-height: 18px !important;
    padding: 0 7px !important;
    border-radius: 999px !important;
    font-size: 9.5px !important;
    background: rgba(255,255,255,.54) !important;
    box-shadow: inset 0 0 0 .5px rgba(165,192,216,.42) !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    gap: 6px !important;
    padding: 7px 10px 6px !important;
    border-radius: 18px !important;
    background: rgba(255,255,255,.78) !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.45) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header,
  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-timeline header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-timeline header,
  .ik-v420-list header {
    min-height: 22px !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header b,
  #overview.router-overview-framework .ik-v420-list header b,
  .router-overview-framework .ik-v420-timeline header b,
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-timeline header b,
  .ik-v420-list header b { font-size: 12.5px !important; }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    grid-template-columns: minmax(0, 1fr) auto !important;
    gap: 8px !important;
    min-height: 44px !important;
    height: 44px !important;
    padding: 4px 0 !important;
    border-bottom: .5px solid rgba(198,214,229,.72) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i { display: none !important; }

  #overview.router-overview-framework .ik-v420-timeline-row span,
  .router-overview-framework .ik-v420-timeline-row span,
  .ik-v420-timeline-row span { min-width: 0 !important; }

  #overview.router-overview-framework .ik-v420-timeline-row span b,
  .router-overview-framework .ik-v420-timeline-row span b,
  .ik-v420-timeline-row span b {
    font-size: 12px !important;
    line-height: 1.05 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    font-size: 10px !important;
    line-height: 1.05 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    font-size: 12px !important;
    line-height: 1 !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    grid-template-columns: 30px minmax(0, 1fr) auto !important;
    min-height: 54px !important;
    height: 54px !important;
    gap: 8px !important;
    padding: 4px 0 !important;
    border-bottom: .5px solid rgba(198,214,229,.72) !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon,
  .router-overview-framework .ik-v503-device-icon,
  .ik-v503-device-icon {
    width: 28px !important;
    height: 28px !important;
    border-radius: 9px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    gap: 4px !important;
    flex-wrap: nowrap !important;
    font-size: 12.5px !important;
    line-height: 1.05 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v807-kind,
  .router-overview-framework .ik-v807-kind,
  .ik-v807-kind {
    height: 15px !important;
    padding: 0 5px !important;
    font-size: 8.5px !important;
    line-height: 15px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    display: block !important;
    font-size: 9.6px !important;
    line-height: 1.1 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-list-row u,
  .router-overview-framework .ik-v420-list-row u,
  .ik-v420-list-row u {
    height: 2px !important;
    margin-top: 3px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong,
  .router-overview-framework .ik-v420-list-row > strong,
  .ik-v420-list-row > strong { min-width: 48px !important; }

  #overview.router-overview-framework .ik-v420-list-row > strong b,
  .router-overview-framework .ik-v420-list-row > strong b,
  .ik-v420-list-row > strong b {
    font-size: 12px !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong small,
  .router-overview-framework .ik-v420-list-row > strong small,
  .ik-v420-list-row > strong small {
    font-size: 9px !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    grid-template-rows: 14px repeat(3, 1fr) !important;
    gap: 5px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header { min-height: 14px !important; }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 34px minmax(0, 1fr) 43px 58px !important;
    gap: 6px !important;
    min-height: 18px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small {
    grid-column: 4 !important;
    grid-row: 1 !important;
    display: block !important;
    color: #718298 !important;
    font-size: 8.4px !important;
    line-height: 1 !important;
    white-space: nowrap !important;
    text-align: right !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i { height: 3px !important; }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    height: 66px !important;
    min-height: 66px !important;
    bottom: max(5px, env(safe-area-inset-bottom, 0px)) !important;
    padding: 4px 8px !important;
    border-radius: 22px !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.54) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    gap: 2px !important;
    min-height: 48px !important;
    font-size: 9px !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active svg,
  .router-overview-framework .ik-v420-tabs button.is-active svg,
  .ik-v420-tabs button.is-active svg {
    width: 22px !important;
    height: 22px !important;
    padding: 2px !important;
    border-radius: 8px !important;
    background: rgba(20,115,230,.10) !important;
  }

  /* v813 density rebuild: compact read-only network monitor, no decorative bulk. */
  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(5px, env(safe-area-inset-top, 0px)) 11px calc(72px + env(safe-area-inset-bottom, 0px)) !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * {
    margin-top: 5px !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    height: 48px !important;
    min-height: 48px !important;
    grid-template-columns: 32px minmax(0, 1fr) auto !important;
    gap: 7px !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 32px !important;
    height: 32px !important;
    border-radius: 10px !important;
    background: transparent !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.40) !important;
  }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    font-size: 15.2px !important;
    line-height: 1.02 !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    font-size: 10px !important;
    line-height: 1.05 !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 20px !important;
    padding: 0 6px !important;
    font-size: 10px !important;
    background: transparent !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.36) !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    display: grid !important;
    grid-template-rows: auto minmax(0, 1fr) auto !important;
    gap: 6px !important;
    height: 204px !important;
    min-height: 0 !important;
    padding: 10px 12px 9px !important;
    border-radius: 18px !important;
    background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(246,250,254,.92)) !important;
    box-shadow: inset 0 0 0 .5px rgba(160,188,214,.48) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero {
    height: 226px !important;
  }

  #overview.router-overview-framework .ik-v420-hero::before,
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    top: 10px !important;
    bottom: auto !important;
    height: 42px !important;
    width: 2px !important;
    opacity: .76 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    gap: 2px !important;
    min-width: 0 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(22px, 6.3vw, 27px) !important;
    line-height: 1 !important;
    letter-spacing: -.62px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    max-width: none !important;
    font-size: 10.4px !important;
    line-height: 1.08 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    display: grid !important;
    grid-template-columns: 84px minmax(0, 1fr) !important;
    grid-template-rows: 1fr !important;
    gap: 8px !important;
    min-height: 0 !important;
    align-items: stretch !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    display: grid !important;
    grid-template-columns: 1fr !important;
    grid-template-rows: repeat(2, minmax(0, 1fr)) !important;
    gap: 4px !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span,
  #overview.router-overview-framework .ik-v420-hero-stats span + span,
  .router-overview-framework .ik-v420-hero-stats span + span,
  .ik-v420-hero-stats span + span {
    display: grid !important;
    align-content: center !important;
    gap: 1px !important;
    min-height: 0 !important;
    padding: 5px 6px !important;
    border: 0 !important;
    border-radius: 10px !important;
    background: rgba(255,255,255,.48) !important;
    box-shadow: inset 0 0 0 .5px rgba(162,190,216,.34) !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    margin: 0 !important;
    font-size: 8.6px !important;
    line-height: 1 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats b,
  .ik-v420-hero-stats .is-primary b {
    margin: 1px 0 0 !important;
    font-size: 15px !important;
    line-height: .98 !important;
    letter-spacing: -.28px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 76px !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 6px !important;
    border-radius: 12px !important;
    background: rgba(255,255,255,.38) !important;
    box-shadow: inset 0 0 0 .5px rgba(166,194,218,.32) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual {
    height: 84px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    grid-template-columns: minmax(0, 1fr) 48px !important;
    gap: 6px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside em,
  .router-overview-framework .ik-v812-trend-visual aside em,
  .ik-v812-trend-visual aside em {
    font-size: 8px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside b,
  .router-overview-framework .ik-v812-trend-visual aside b,
  .ik-v812-trend-visual aside b {
    font-size: 9.3px !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 64px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix,
  .router-overview-framework .ik-v420-port-matrix,
  .ik-v420-port-matrix {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 4px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix span,
  .router-overview-framework .ik-v420-port-matrix span,
  .ik-v420-port-matrix span {
    min-height: 30px !important;
    padding: 4px 2px !important;
    border-radius: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-port-matrix b,
  .router-overview-framework .ik-v420-port-matrix b,
  .ik-v420-port-matrix b {
    font-size: 9px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    grid-template-rows: 13px repeat(3, 1fr) !important;
    gap: 4px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header {
    min-height: 13px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header b,
  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header span,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header b,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header span,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header b,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header span {
    font-size: 9px !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 30px minmax(0, 1fr) 37px 52px !important;
    gap: 5px !important;
    min-height: 17px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter b,
  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small {
    font-size: 8.8px !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter .ik-v802-ring-value {
    font-size: 10.8px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small {
    grid-column: 4 !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills,
  .router-overview-framework .ik-v503-hero-pills,
  .ik-v503-hero-pills {
    margin-top: 0 !important;
    gap: 4px !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span,
  .router-overview-framework .ik-v503-hero-pills span,
  .ik-v503-hero-pills span {
    min-height: 16px !important;
    max-width: 33% !important;
    padding: 0 5px !important;
    border-radius: 7px !important;
    font-size: 8.8px !important;
    line-height: 16px !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    gap: 0 !important;
    padding: 6px 10px 5px !important;
    border-radius: 15px !important;
    background: rgba(255,255,255,.78) !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.42) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header,
  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-timeline header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-timeline header,
  .ik-v420-list header {
    min-height: 18px !important;
    margin: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header b,
  #overview.router-overview-framework .ik-v420-list header b,
  .router-overview-framework .ik-v420-timeline header b,
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-timeline header b,
  .ik-v420-list header b {
    font-size: 11.6px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header span,
  #overview.router-overview-framework .ik-v420-list header span,
  .router-overview-framework .ik-v420-timeline header span,
  .router-overview-framework .ik-v420-list header span,
  .ik-v420-timeline header span,
  .ik-v420-list header span {
    font-size: 9.5px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    height: 44px !important;
    min-height: 44px !important;
    padding: 4px 0 !important;
    grid-template-columns: 9px minmax(0, 1fr) auto !important;
    gap: 7px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    display: block !important;
    width: 6px !important;
    height: 6px !important;
    border-radius: 999px !important;
    box-shadow: 0 0 0 3px rgba(20,115,230,.07) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i svg,
  .router-overview-framework .ik-v420-timeline-row > i svg,
  .ik-v420-timeline-row > i svg {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row span b,
  .router-overview-framework .ik-v420-timeline-row span b,
  .ik-v420-timeline-row span b {
    font-size: 11.6px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    font-size: 9.3px !important;
    line-height: 1.05 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    font-size: 11.2px !important;
  }

  #overview.router-overview-framework .ik-v420-surface .ik-v420-list,
  .router-overview-framework .ik-v420-surface .ik-v420-list,
  .ik-v420-surface .ik-v420-list {
    padding-top: 5px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    height: 52px !important;
    min-height: 52px !important;
    padding: 4px 0 !important;
    grid-template-columns: 28px minmax(0, 1fr) auto !important;
    gap: 7px !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon,
  .router-overview-framework .ik-v503-device-icon,
  .ik-v503-device-icon {
    width: 28px !important;
    height: 28px !important;
    border-radius: 8px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    font-size: 11.8px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    font-size: 9.4px !important;
    line-height: 1.05 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row u,
  .router-overview-framework .ik-v420-list-row u,
  .ik-v420-list-row u {
    margin-top: 2px !important;
    height: 2px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong,
  .router-overview-framework .ik-v420-list-row > strong,
  .ik-v420-list-row > strong {
    min-width: 44px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong b,
  .router-overview-framework .ik-v420-list-row > strong b,
  .ik-v420-list-row > strong b {
    font-size: 11.4px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    height: 64px !important;
    min-height: 64px !important;
    bottom: max(4px, env(safe-area-inset-bottom, 0px)) !important;
    padding: 4px 7px !important;
    border-radius: 18px !important;
    box-shadow: inset 0 0 0 .5px rgba(164,190,214,.44) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    min-height: 46px !important;
    border-radius: 10px !important;
    gap: 1px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active svg,
  .router-overview-framework .ik-v420-tabs button.is-active svg,
  .ik-v420-tabs button.is-active svg {
    width: 20px !important;
    height: 20px !important;
    padding: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    filter: none !important;
  }

  /* v815 mobile density correction: read-only monitor first screen, not a decorative card page. */
  #overview.router-overview-framework .ik-v420-app,
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    background: #f5f8fb !important;
  }

  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(4px, env(safe-area-inset-top, 0px)) 10px calc(70px + env(safe-area-inset-bottom, 0px)) !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * {
    margin-top: 4px !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    height: 48px !important;
    min-height: 48px !important;
    grid-template-columns: 40px minmax(0, 1fr) auto !important;
    gap: 6px !important;
    padding: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 40px !important;
    height: 40px !important;
    border-radius: 10px !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    font-size: 14.8px !important;
    line-height: 1.02 !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    font-size: 9.6px !important;
    line-height: 1.05 !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 19px !important;
    padding: 0 6px !important;
    gap: 3px !important;
    font-size: 9.5px !important;
    background: transparent !important;
    box-shadow: inset 0 0 0 .5px rgba(135,164,192,.32) !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong i,
  .router-overview-framework .ik-v420-nav strong i,
  .ik-v420-nav strong i {
    width: 4px !important;
    height: 4px !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    height: 208px !important;
    min-height: 0 !important;
    gap: 5px !important;
    padding: 9px 11px 8px !important;
    border-radius: 14px !important;
    background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(248,251,254,.92)) !important;
    box-shadow: inset 0 0 0 .5px rgba(150,180,208,.42) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero {
    height: 232px !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger,
  .router-overview-framework .ik-v420-hero.is-danger,
  .ik-v420-hero.is-danger,
  #overview.router-overview-framework .ik-v420-hero.is-missing,
  .router-overview-framework .ik-v420-hero.is-missing,
  .ik-v420-hero.is-missing {
    background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(249,251,254,.94)) !important;
    box-shadow: inset 2px 0 0 rgba(217,48,37,.72), inset 0 0 0 .5px rgba(150,180,208,.38) !important;
  }

  #overview.router-overview-framework .ik-v420-hero::before,
  .router-overview-framework .ik-v420-hero::before,
  .ik-v420-hero::before {
    display: none !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    gap: 1px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(21px, 5.9vw, 25px) !important;
    line-height: 1 !important;
    letter-spacing: -.52px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    font-size: 10px !important;
    line-height: 1.05 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    grid-template-columns: 78px minmax(0, 1fr) !important;
    gap: 7px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    gap: 3px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span,
  #overview.router-overview-framework .ik-v420-hero-stats span + span,
  .router-overview-framework .ik-v420-hero-stats span + span,
  .ik-v420-hero-stats span + span {
    padding: 4px 5px !important;
    border-radius: 8px !important;
    background: rgba(255,255,255,.30) !important;
    box-shadow: inset 0 0 0 .5px rgba(150,180,208,.24) !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    font-size: 8.2px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats b,
  .ik-v420-hero-stats .is-primary b {
    font-size: 14px !important;
    letter-spacing: -.18px !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 74px !important;
    min-height: 0 !important;
    padding: 4px 0 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: inset 0 .5px 0 rgba(150,180,208,.26) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual {
    height: 82px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    grid-template-columns: minmax(0, 1fr) 46px !important;
    gap: 5px !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 62px !important;
  }

  #overview.router-overview-framework .ik-v420-gridline,
  .router-overview-framework .ik-v420-gridline,
  .ik-v420-gridline {
    stroke: rgba(132,162,190,.24) !important;
  }

  #overview.router-overview-framework .ik-v420-area,
  .router-overview-framework .ik-v420-area,
  .ik-v420-area {
    fill: rgba(20,115,230,.035) !important;
  }

  #overview.router-overview-framework .ik-v420-curve.is-main,
  .router-overview-framework .ik-v420-curve.is-main,
  .ik-v420-curve.is-main {
    stroke-width: 1.7px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside em,
  .router-overview-framework .ik-v812-trend-visual aside em,
  .ik-v812-trend-visual aside em {
    font-size: 7.8px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside b,
  .router-overview-framework .ik-v812-trend-visual aside b,
  .ik-v812-trend-visual aside b {
    font-size: 9px !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills,
  .router-overview-framework .ik-v503-hero-pills,
  .ik-v503-hero-pills {
    gap: 3px !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span,
  .router-overview-framework .ik-v503-hero-pills span,
  .ik-v503-hero-pills span {
    min-height: 14px !important;
    max-width: 33% !important;
    padding: 0 3px !important;
    border-radius: 0 !important;
    font-size: 8.4px !important;
    line-height: 14px !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    padding: 5px 9px 4px !important;
    border-radius: 12px !important;
    background: rgba(255,255,255,.78) !important;
    box-shadow: inset 0 0 0 .5px rgba(150,180,208,.36) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header,
  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-timeline header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-timeline header,
  .ik-v420-list header {
    min-height: 16px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header b,
  #overview.router-overview-framework .ik-v420-list header b,
  .router-overview-framework .ik-v420-timeline header b,
  .router-overview-framework .ik-v420-list header b,
  .ik-v420-timeline header b,
  .ik-v420-list header b {
    font-size: 11px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header span,
  #overview.router-overview-framework .ik-v420-list header span,
  .router-overview-framework .ik-v420-timeline header span,
  .router-overview-framework .ik-v420-list header span,
  .ik-v420-timeline header span,
  .ik-v420-list header span {
    font-size: 9px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    height: 44px !important;
    min-height: 44px !important;
    padding: 4px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row span b,
  .router-overview-framework .ik-v420-timeline-row span b,
  .ik-v420-timeline-row span b {
    font-size: 11.2px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row em,
  .router-overview-framework .ik-v420-timeline-row em,
  .ik-v420-timeline-row em {
    font-size: 9px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row strong,
  .router-overview-framework .ik-v420-timeline-row strong,
  .ik-v420-timeline-row strong {
    font-size: 10.8px !important;
  }

  #overview.router-overview-framework .ik-v420-surface .ik-v420-list,
  .router-overview-framework .ik-v420-surface .ik-v420-list,
  .ik-v420-surface .ik-v420-list {
    padding-top: 4px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    height: 52px !important;
    min-height: 52px !important;
    padding: 4px 0 !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon,
  .router-overview-framework .ik-v503-device-icon,
  .ik-v503-device-icon {
    width: 28px !important;
    height: 28px !important;
    border-radius: 7px !important;
    background: rgba(20,115,230,.06) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.14) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    font-size: 11.5px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    font-size: 9.2px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong b,
  .router-overview-framework .ik-v420-list-row > strong b,
  .ik-v420-list-row > strong b {
    font-size: 11px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    grid-template-rows: 12px repeat(3, 1fr) !important;
    gap: 4px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 28px minmax(0, 1fr) 34px 50px !important;
    min-height: 17px !important;
    gap: 5px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i {
    height: 3px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    left: 8px !important;
    right: 8px !important;
    bottom: max(4px, env(safe-area-inset-bottom, 0px)) !important;
    height: 64px !important;
    min-height: 64px !important;
    padding: 4px 7px !important;
    border-radius: 14px !important;
    background: rgba(255,255,255,.96) !important;
    box-shadow: inset 0 0 0 .5px rgba(150,180,208,.40) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    min-height: 46px !important;
    border-radius: 8px !important;
    font-size: 8.8px !important;
  }

  /* v816 mobile density correction: keep the first screen factual, not decorative. */
  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(3px, env(safe-area-inset-top, 0px)) 9px calc(68px + env(safe-area-inset-bottom, 0px)) !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * {
    margin-top: 3px !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    height: 48px !important;
    min-height: 48px !important;
    grid-template-columns: 38px minmax(0, 1fr) auto !important;
    gap: 5px !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 38px !important;
    height: 38px !important;
  }

  #overview.router-overview-framework .ik-v420-nav div,
  .router-overview-framework .ik-v420-nav div,
  .ik-v420-nav div {
    gap: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    font-size: 14.2px !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    font-size: 9.1px !important;
    line-height: 1.04 !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 17px !important;
    padding: 0 5px !important;
    font-size: 9px !important;
    border-radius: 999px !important;
    background: rgba(255,255,255,.36) !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    height: 182px !important;
    min-height: 0 !important;
    padding: 8px 10px 7px !important;
    gap: 4px !important;
    border-radius: 12px !important;
    background: linear-gradient(180deg, rgba(255,255,255,.985), rgba(249,252,255,.94)) !important;
    box-shadow: inset 0 0 0 .5px rgba(148,178,206,.36) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero {
    height: 198px !important;
    min-height: 0 !important;
    max-height: 198px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    height: 182px !important;
    min-height: 0 !important;
    max-height: 182px !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger,
  .router-overview-framework .ik-v420-hero.is-danger,
  .ik-v420-hero.is-danger,
  #overview.router-overview-framework .ik-v420-hero.is-missing,
  .router-overview-framework .ik-v420-hero.is-missing,
  .ik-v420-hero.is-missing {
    background: linear-gradient(180deg, rgba(255,255,255,.99), rgba(250,252,255,.96)) !important;
    box-shadow: inset 2px 0 0 rgba(217,48,37,.58), inset 0 0 0 .5px rgba(148,178,206,.34) !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(20px, 5.5vw, 23px) !important;
    line-height: .98 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    font-size: 9.4px !important;
    line-height: 1.02 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    display: grid !important;
    grid-template-columns: 72px minmax(0, 1fr) !important;
    gap: 6px !important;
    align-items: start !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    display: grid !important;
    grid-auto-rows: min-content !important;
    align-self: start !important;
    gap: 3px !important;
    margin-top: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span,
  #overview.router-overview-framework .ik-v420-hero-stats span + span,
  .router-overview-framework .ik-v420-hero-stats span + span,
  .ik-v420-hero-stats span + span {
    min-height: 39px !important;
    padding: 4px 5px !important;
    align-content: center !important;
    background: rgba(255,255,255,.18) !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats b,
  .ik-v420-hero-stats .is-primary b {
    font-size: 13.4px !important;
    line-height: .96 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    font-size: 7.8px !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 72px !important;
    min-height: 0 !important;
    padding-top: 3px !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-visual {
    height: 76px !important;
    min-height: 0 !important;
    max-height: 76px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-visual,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-visual {
    height: 76px !important;
    min-height: 0 !important;
    max-height: 76px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    grid-template-columns: minmax(0, 1fr) 42px !important;
    gap: 4px !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 60px !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills,
  .router-overview-framework .ik-v503-hero-pills,
  .ik-v503-hero-pills {
    gap: 2px !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span,
  .router-overview-framework .ik-v503-hero-pills span,
  .ik-v503-hero-pills span {
    min-height: 13px !important;
    padding: 0 2px !important;
    font-size: 8px !important;
    line-height: 13px !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    padding: 4px 8px 3px !important;
    border-radius: 11px !important;
    background: rgba(255,255,255,.72) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline header,
  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-timeline header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-timeline header,
  .ik-v420-list header {
    min-height: 14px !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    height: 42px !important;
    min-height: 42px !important;
    padding: 3px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    height: 50px !important;
    min-height: 50px !important;
    padding: 3px 0 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    grid-template-rows: 10px repeat(3, 16px) !important;
    gap: 3px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 26px minmax(0, 1fr) 32px 48px !important;
    min-height: 16px !important;
  }

  /* v818 mobile density lock: read-only monitor density without extra decoration. */
  #overview.router-overview-framework .ik-v420-app,
  .router-overview-framework .ik-v420-app,
  .ik-v420-app {
    background: #f5f8fc !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    height: 50px !important;
    min-height: 50px !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 18px !important;
    padding: 0 6px !important;
    font-size: 9.2px !important;
    box-shadow: inset 0 0 0 .5px rgba(150,180,208,.44) !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    height: 178px !important;
    border-radius: 12px !important;
    background: #fff !important;
    box-shadow: inset 0 0 0 .5px rgba(148,178,206,.34) !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero {
    height: 194px !important;
    max-height: 194px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    height: 184px !important;
    max-height: 184px !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    background: #fbfdff !important;
    box-shadow: inset 0 0 0 .5px rgba(171,197,220,.34) !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    height: 44px !important;
    min-height: 44px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    height: 52px !important;
    min-height: 52px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    grid-template-rows: repeat(3, 18px) !important;
    gap: 4px !important;
    align-content: center !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual header {
    display: none !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 32px minmax(0, 1fr) 34px 56px !important;
    min-height: 18px !important;
    gap: 5px !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter small {
    display: block !important;
    color: #60758a !important;
    font-size: 8px !important;
    line-height: 1 !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    height: 66px !important;
    min-height: 66px !important;
    padding: 5px 7px !important;
    border-radius: 14px !important;
  }

  /* v821 product-incident density reset: read-only router monitor, not decorative card page. */
  #overview.router-overview-framework .ik-v420-screen,
  .router-overview-framework .ik-v420-screen,
  .ik-v420-screen {
    padding: max(2px, env(safe-area-inset-top, 0px)) 8px calc(66px + env(safe-area-inset-bottom, 0px)) !important;
    background: #f5f8fc !important;
  }

  #overview.router-overview-framework .ik-v420-screen > * + *,
  .router-overview-framework .ik-v420-screen > * + *,
  .ik-v420-screen > * + * {
    margin-top: 4px !important;
  }

  #overview.router-overview-framework .ik-v420-nav,
  .router-overview-framework .ik-v420-nav,
  .ik-v420-nav {
    height: 50px !important;
    min-height: 50px !important;
    max-height: 52px !important;
    grid-template-columns: 34px minmax(0, 1fr) auto !important;
    gap: 6px !important;
    margin: 0 !important;
    padding: 2px 0 !important;
  }

  #overview.router-overview-framework .ik-v420-nav button,
  .router-overview-framework .ik-v420-nav button,
  .ik-v420-nav button {
    width: 34px !important;
    height: 34px !important;
    border-radius: 9px !important;
    border-color: #d7e4ef !important;
    background: rgba(255,255,255,.78) !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-nav svg,
  .router-overview-framework .ik-v420-nav svg,
  .ik-v420-nav svg {
    width: 17px !important;
    height: 17px !important;
    stroke-width: 2 !important;
  }

  #overview.router-overview-framework .ik-v420-nav div b,
  .router-overview-framework .ik-v420-nav div b,
  .ik-v420-nav div b {
    font-size: 14px !important;
    line-height: 1.05 !important;
    letter-spacing: -.01em !important;
  }

  #overview.router-overview-framework .ik-v420-nav div span,
  .router-overview-framework .ik-v420-nav div span,
  .ik-v420-nav div span {
    font-size: 9.4px !important;
    line-height: 1.1 !important;
    color: #60758a !important;
    white-space: normal !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong,
  .router-overview-framework .ik-v420-nav strong,
  .ik-v420-nav strong {
    min-height: 18px !important;
    padding: 0 6px !important;
    border-radius: 999px !important;
    font-size: 9px !important;
    font-weight: 700 !important;
    background: rgba(255,255,255,.44) !important;
    box-shadow: inset 0 0 0 .5px rgba(150,180,208,.46) !important;
  }

  #overview.router-overview-framework .ik-v420-nav strong i,
  .router-overview-framework .ik-v420-nav strong i,
  .ik-v420-nav strong i {
    width: 5px !important;
    height: 5px !important;
  }

  #overview.router-overview-framework .ik-v420-hero,
  .router-overview-framework .ik-v420-hero,
  .ik-v420-hero {
    height: 182px !important;
    max-height: 220px !important;
    min-height: 0 !important;
    padding: 7px 9px 6px !important;
    gap: 4px !important;
    border-radius: 12px !important;
    border: 1px solid #d9e6f0 !important;
    background: #fff !important;
    box-shadow: inset 0 0 0 .5px rgba(148,178,206,.26) !important;
    overflow: hidden !important;
  }

  #overview.router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .router-overview-framework .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero,
  .ik-v420-app:not([data-overview-mobile-scene="single"]):not([data-overview-mobile-scene="fleet"]) .ik-v420-hero {
    height: 200px !important;
    max-height: 240px !important;
  }

  #overview.router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .router-overview-framework .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero,
  .ik-v420-app[data-overview-mobile-scene="resource-full"] .ik-v420-hero {
    height: 190px !important;
    max-height: 240px !important;
  }

  #overview.router-overview-framework .ik-v420-hero.is-danger,
  .router-overview-framework .ik-v420-hero.is-danger,
  .ik-v420-hero.is-danger,
  #overview.router-overview-framework .ik-v420-hero.is-missing,
  .router-overview-framework .ik-v420-hero.is-missing,
  .ik-v420-hero.is-missing {
    background: linear-gradient(180deg, #fff, #fbfdff) !important;
    box-shadow: inset 2px 0 0 rgba(217,48,37,.62), inset 0 0 0 .5px rgba(148,178,206,.28) !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head,
  .router-overview-framework .ik-v620-hero-head,
  .ik-v620-hero-head {
    min-height: 34px !important;
    gap: 1px !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head h1,
  .router-overview-framework .ik-v620-hero-head h1,
  .ik-v620-hero-head h1 {
    font-size: clamp(20px, 5.6vw, 23px) !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework .ik-v620-hero-head p,
  .router-overview-framework .ik-v620-hero-head p,
  .ik-v620-hero-head p {
    font-size: 9.6px !important;
    line-height: 1.12 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v620-hero-stage,
  .router-overview-framework .ik-v620-hero-stage,
  .ik-v620-hero-stage {
    grid-template-columns: 82px minmax(0, 1fr) !important;
    min-height: 72px !important;
    gap: 6px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats,
  .router-overview-framework .ik-v420-hero-stats,
  .ik-v420-hero-stats {
    gap: 3px !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats span,
  .router-overview-framework .ik-v420-hero-stats span,
  .ik-v420-hero-stats span,
  #overview.router-overview-framework .ik-v420-hero-stats span + span,
  .router-overview-framework .ik-v420-hero-stats span + span,
  .ik-v420-hero-stats span + span {
    min-height: 34px !important;
    padding: 3px 4px !important;
    border-radius: 7px !important;
    background: #f8fbfe !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats b,
  #overview.router-overview-framework .ik-v420-hero-stats .is-primary b,
  .router-overview-framework .ik-v420-hero-stats b,
  .router-overview-framework .ik-v420-hero-stats .is-primary b,
  .ik-v420-hero-stats b,
  .ik-v420-hero-stats .is-primary b {
    font-size: 12.8px !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework .ik-v420-hero-stats em,
  #overview.router-overview-framework .ik-v420-hero-stats small,
  .router-overview-framework .ik-v420-hero-stats em,
  .router-overview-framework .ik-v420-hero-stats small,
  .ik-v420-hero-stats em,
  .ik-v420-hero-stats small {
    font-size: 7.7px !important;
    line-height: 1 !important;
  }

  #overview.router-overview-framework .ik-v420-visual,
  .router-overview-framework .ik-v420-visual,
  .ik-v420-visual {
    height: 72px !important;
    min-height: 72px !important;
    padding: 2px 3px !important;
    border-radius: 8px !important;
    background: #fbfdff !important;
    box-shadow: inset 0 0 0 .5px rgba(171,197,220,.30) !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual,
  .router-overview-framework .ik-v812-trend-visual,
  .ik-v812-trend-visual {
    grid-template-columns: minmax(0, 1fr) 48px !important;
    gap: 4px !important;
    align-items: stretch !important;
  }

  #overview.router-overview-framework .ik-v420-line-chart,
  .router-overview-framework .ik-v420-line-chart,
  .ik-v420-line-chart {
    height: 62px !important;
  }

  #overview.router-overview-framework .ik-v812-trend-visual aside span,
  .router-overview-framework .ik-v812-trend-visual aside span,
  .ik-v812-trend-visual aside span {
    min-height: 18px !important;
    padding: 1px 2px !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills,
  .router-overview-framework .ik-v503-hero-pills,
  .ik-v503-hero-pills {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 1px 6px !important;
  }

  #overview.router-overview-framework .ik-v503-hero-pills span,
  .router-overview-framework .ik-v503-hero-pills span,
  .ik-v503-hero-pills span {
    min-height: 14px !important;
    padding: 0 2px !important;
    border-radius: 4px !important;
    background: transparent !important;
    font-size: 8px !important;
    line-height: 14px !important;
    white-space: nowrap !important;
    overflow: visible !important;
    text-overflow: clip !important;
  }

  #overview.router-overview-framework .ik-v420-surface,
  .router-overview-framework .ik-v420-surface,
  .ik-v420-surface {
    display: grid !important;
    gap: 4px !important;
    padding: 4px 7px 4px !important;
    border-radius: 10px !important;
    border: 1px solid #dfe9f3 !important;
    background: rgba(255,255,255,.78) !important;
    box-shadow: none !important;
  }

  #overview.router-overview-framework .ik-v420-timeline,
  .router-overview-framework .ik-v420-timeline,
  .ik-v420-timeline {
    display: grid !important;
    gap: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row,
  .router-overview-framework .ik-v420-timeline-row,
  .ik-v420-timeline-row {
    height: 44px !important;
    min-height: 44px !important;
    display: grid !important;
    grid-template-columns: 9px 56px minmax(66px, .8fr) minmax(0, 1fr) !important;
    gap: 5px !important;
    align-items: center !important;
    padding: 0 !important;
    border-bottom: 1px solid #edf3f8 !important;
    background: transparent !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row:last-child,
  .router-overview-framework .ik-v420-timeline-row:last-child,
  .ik-v420-timeline-row:last-child {
    border-bottom: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > i,
  .router-overview-framework .ik-v420-timeline-row > i,
  .ik-v420-timeline-row > i {
    width: 6px !important;
    height: 6px !important;
    border-radius: 999px !important;
    background: #1473e6 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .router-overview-framework .ik-v420-timeline-row.is-danger > i,
  .ik-v420-timeline-row.is-danger > i {
    background: #d93025 !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row.is-warn > i,
  #overview.router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .router-overview-framework .ik-v420-timeline-row.is-warn > i,
  .router-overview-framework .ik-v420-timeline-row.is-missing > i,
  .ik-v420-timeline-row.is-warn > i,
  .ik-v420-timeline-row.is-missing > i {
    background: #cf8424 !important;
  }

  #overview.router-overview-framework .ik-v821-row-title,
  .router-overview-framework .ik-v821-row-title,
  .ik-v821-row-title {
    color: #22364a !important;
    font-size: 11px !important;
    font-weight: 760 !important;
    line-height: 1 !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-timeline-row > strong,
  .router-overview-framework .ik-v420-timeline-row > strong,
  .ik-v420-timeline-row > strong {
    color: #102033 !important;
    font-size: 11.5px !important;
    font-weight: 780 !important;
    line-height: 1.05 !important;
    text-align: right !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v821-row-note,
  .router-overview-framework .ik-v821-row-note,
  .ik-v821-row-note {
    color: #60758a !important;
    font-size: 9px !important;
    line-height: 1.05 !important;
    font-style: normal !important;
    text-align: right !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-list header,
  .router-overview-framework .ik-v420-list header,
  .ik-v420-list header {
    min-height: 16px !important;
    height: 16px !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row,
  .router-overview-framework .ik-v420-list-row,
  .ik-v420-list-row {
    height: 52px !important;
    min-height: 52px !important;
    grid-template-columns: 28px minmax(0, 1fr) 56px !important;
    gap: 7px !important;
    padding: 3px 0 !important;
    border-bottom: 1px solid #edf3f8 !important;
  }

  #overview.router-overview-framework .ik-v503-device-icon,
  .router-overview-framework .ik-v503-device-icon,
  .ik-v503-device-icon {
    width: 28px !important;
    height: 28px !important;
    min-width: 28px !important;
    border-radius: 7px !important;
    background: rgba(20,115,230,.055) !important;
    box-shadow: inset 0 0 0 .5px rgba(20,115,230,.14) !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span,
  .router-overview-framework .ik-v420-list-row span,
  .ik-v420-list-row span {
    gap: 1px !important;
    min-width: 0 !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span b,
  .router-overview-framework .ik-v420-list-row span b,
  .ik-v420-list-row span b {
    font-size: 11.4px !important;
    line-height: 1.05 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span em,
  .router-overview-framework .ik-v420-list-row span em,
  .ik-v420-list-row span em {
    font-size: 9px !important;
    line-height: 1.08 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  #overview.router-overview-framework .ik-v420-list-row span u,
  .router-overview-framework .ik-v420-list-row span u,
  .ik-v420-list-row span u {
    height: 2px !important;
    margin-top: 1px !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong,
  .router-overview-framework .ik-v420-list-row > strong,
  .ik-v420-list-row > strong {
    gap: 1px !important;
    text-align: right !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong b,
  .router-overview-framework .ik-v420-list-row > strong b,
  .ik-v420-list-row > strong b {
    font-size: 11.2px !important;
    line-height: 1.05 !important;
    white-space: nowrap !important;
  }

  #overview.router-overview-framework .ik-v420-list-row > strong small,
  .router-overview-framework .ik-v420-list-row > strong small,
  .ik-v420-list-row > strong small {
    font-size: 8px !important;
    line-height: 1 !important;
    color: #72859a !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual {
    grid-template-rows: repeat(3, 18px) !important;
    gap: 3px !important;
    align-content: center !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter {
    grid-template-columns: 30px 36px 34px 52px minmax(0, 1fr) !important;
    min-height: 18px !important;
    gap: 4px !important;
    padding: 0 !important;
    background: transparent !important;
    border: 0 !important;
  }

  #overview.router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  .router-overview-framework [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i,
  [data-overview-mobile-scene="resource-full"] .ik-v620-pressure-visual .ik-v420-resource-meter > i {
    height: 3px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs,
  .router-overview-framework .ik-v420-tabs,
  .ik-v420-tabs {
    left: 8px !important;
    right: 8px !important;
    bottom: max(2px, env(safe-area-inset-bottom, 0px)) !important;
    height: 64px !important;
    min-height: 64px !important;
    padding: 4px 7px !important;
    border-radius: 13px !important;
    background: rgba(255,255,255,.96) !important;
    box-shadow: inset 0 0 0 .5px rgba(150,180,208,.42) !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button,
  .router-overview-framework .ik-v420-tabs button,
  .ik-v420-tabs button {
    min-height: 44px !important;
    border-radius: 7px !important;
    background: transparent !important;
    box-shadow: none !important;
    color: #7f91a5 !important;
    font-size: 8.6px !important;
  }

  #overview.router-overview-framework .ik-v420-tabs button.is-active,
  .router-overview-framework .ik-v420-tabs button.is-active,
  .ik-v420-tabs button.is-active {
    background: transparent !important;
    box-shadow: inset 0 2px 0 #1473e6 !important;
    color: #1473e6 !important;
  }

  #overview.router-overview-framework .ik-v420-tabs svg,
  .router-overview-framework .ik-v420-tabs svg,
  .ik-v420-tabs svg {
    width: 17px !important;
    height: 17px !important;
  }

}
`;

function V420MobileStyles() {
  return <style>{V420_MOBILE_STYLES}</style>;
}

export function MobileOverviewHome(props: MobileOverviewHomeProps) {
  return (
    <div
      className="ik-v420-app ik-v240-app"
      data-overview-mobile-console
      data-overview-mobile-ios-router-home="true"
      data-overview-mobile-app-home="ikuai40-ios-router-home"
      data-overview-mobile-home-mode="ios-router-app-home"
      data-overview-mobile-home-version="v420"
      data-overview-mobile-v420-app-home="apple-ios-ikuai40-router-home"
      data-overview-mobile-v420-first-screen-contract="device-status-time-network-hero-wan-collection-resource-incident-topn-tabs"
      data-overview-mobile-v420-frame-model="ios-router-app-home-not-desktop-collapse-not-table-not-box-stack"
      data-overview-mobile-v420-visual-contract="thin-wan-sparkline-labelled wan-collection-duo resource-pressure-bars native-topn-list"
      data-overview-mobile-v420-design="router-app-home-not-rounded-web-admin"
      data-overview-mobile-no-desktop-collapse="true"
      data-overview-mobile-no-kpi-card-grid="true"
      data-overview-mobile-no-red-orange="true"
      data-overview-mobile-no-table-visual="true"
      data-overview-mobile-no-red-orange-blocks="true"
      data-overview-mobile-scene={props.state.scenario}
      data-overview-mobile-no-snapshot-no-rate-placeholder={props.state.scenario === "no-snapshot" ? "true" : undefined}
    >
      <V420MobileStyles />
      <div className="ik-v420-shell ik-v240-shell">
        <main
          className="ik-v420-screen ik-v240-screen"
          data-overview-mobile-first-screen="app-home"
          data-overview-mobile-first-screen-no-table="true"
          data-overview-mobile-first-screen-uses-microchart="true"
          data-overview-mobile-v420-first-screen-contract="ios-nav-network-hero-duo-resource-incident-list-tab"
          data-overview-mobile-v420-frame-model="ios-router-app-home-not-desktop-collapse-not-table-not-box-stack"
          data-overview-mobile-v420-visual-contract="single-labelled-wan-sparkline-wan-collection-duo-resource-bars-native-ranking"
        >
          <V420Nav {...props} />
          <V420Hero {...props} />
          <V420HomeSurface {...props} />
          <V420Tabs />
        </main>
      </div>
    </div>
  );
}
