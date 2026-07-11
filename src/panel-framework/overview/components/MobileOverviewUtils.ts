import {
  formatPercent,
  shortTimestamp,
  toNumber,
  type OverviewDerivedState,
  type OverviewRawInterfaceRow,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
  type OverviewTone,
} from "../index";
import type { ChannelReading, ResourceReading } from "./MobileOverviewTypes";

export function clean(value: unknown, fallback = "-"): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

export function wanRows(snapshot: OverviewRawSnapshot): OverviewRawWanRow[] {
  if (Array.isArray(snapshot.wan) && snapshot.wan.length) return snapshot.wan;
  return Array.isArray(snapshot.pppoe) ? snapshot.pppoe : [];
}

export function interfaceRows(snapshot: OverviewRawSnapshot): OverviewRawInterfaceRow[] {
  return Array.isArray(snapshot.interfaces) ? snapshot.interfaces : [];
}

function twoDigit(value: number): string {
  return String(value).padStart(2, "0");
}

export function mobileTime(raw: unknown): string {
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

export function latestSuccess(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  const meta = snapshot.meta || {};
  const raw = state.scenario === "no-snapshot"
    ? meta.staticUpdatedAt || meta.realtimeUpdatedAt || snapshot.updatedAt
    : snapshot.updatedAt || meta.realtimeUpdatedAt || meta.staticUpdatedAt || meta.slowRestUpdatedAt;
  return mobileTime(raw);
}

export function toneClass(tone: OverviewTone): string {
  return `is-${tone}`;
}

export function screenTone(state: OverviewDerivedState): OverviewTone {
  if (state.scenario === "no-snapshot") return "missing";
  if (state.scenario === "single") return "ok";
  return state.verdict.level;
}

export function statusLabel(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "缺数";
  if (state.scenario === "single") return "良好";
  if (state.scenario === "all-offline" || state.facts.wan.allOffline) return "断链";
  if (state.scenario === "resource-full") return "超阈";
  if (state.scenario === "interfaces-down") return "异常";
  if (state.scenario === "collection-down" || state.facts.collection.dataStale || state.facts.freshness.history) return "需确认";
  if (state.verdict.level === "warn") return "需确认";
  return "良好";
}

function trustText(state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "业务快照缺失";
  if (state.scenario === "collection-down" || state.facts.collection.dataStale || state.facts.freshness.history) return "缓存快照";
  return "实时可信";
}

function stripRest(label: string): string {
  return clean(label.replace(/^REST\s*/i, ""), "可用");
}

function stripSsh(label: string): string {
  return clean(label.replace(/^SSH\s*/i, ""), "可用");
}

export function channelStatus(state: OverviewDerivedState): ChannelReading[] {
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

export function resourceMetrics(state: OverviewDerivedState): ResourceReading[] {
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

export function sparkPoints(values: number[], maxValue: number, width = 312, height = 62): string {
  const max = Math.max(1, maxValue, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values.map((value, index) => {
    const x = Number((index * step).toFixed(1));
    const y = Number((height - (Math.max(0, value) / max) * (height - 12) - 6).toFixed(1));
    return `${x},${y}`;
  }).join(" ");
}

export function lastSparkPoint(points: string): { x: number; y: number } {
  const last = points.trim().split(/\s+/).pop() || "0,0";
  const [x, y] = last.split(",").map((item) => Number(item));
  return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 };
}
