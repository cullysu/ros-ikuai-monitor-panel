import {
  formatRate,
  shortTimestamp,
  toNumber,
  type OverviewDerivedState,
  type OverviewRawInterfaceRow,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
} from "./index";

export function clean(value: unknown, fallback = "-"): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function recordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function firstText(row: Record<string, unknown>, keys: string[], fallback = "-"): string {
  for (const key of keys) {
    const value = clean(row[key], "");
    if (value) return value;
  }
  return fallback;
}

export function firstNumber(row: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = toNumber(row[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

export function wanRows(snapshot: OverviewRawSnapshot): OverviewRawWanRow[] {
  if (Array.isArray(snapshot.wan) && snapshot.wan.length) return snapshot.wan;
  return Array.isArray(snapshot.pppoe) ? snapshot.pppoe : [];
}

export function wanLineCount(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): number {
  const rows = wanRows(snapshot);
  const factTotal = toNumber(state.facts.wan.total);
  const factSum = toNumber(state.facts.wan.online) + toNumber(state.facts.wan.offline);
  return Math.max(0, rows.length, factTotal, factSum);
}


export function interfaceRows(snapshot: OverviewRawSnapshot): OverviewRawInterfaceRow[] {
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

export function latestSuccess(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  const meta = snapshot.meta || {};
  const raw = state.scenario === "no-snapshot"
    ? meta.staticUpdatedAt || meta.realtimeUpdatedAt || snapshot.updatedAt
    : snapshot.updatedAt || meta.realtimeUpdatedAt || meta.staticUpdatedAt || meta.slowRestUpdatedAt;
  return mobileTime(raw);
}

export function totals(snapshot: OverviewRawSnapshot): { up: number; down: number } {
  return wanRows(snapshot).reduce<{ up: number; down: number }>(
    (sum, row) => ({
      up: sum.up + toNumber(row.upRate),
      down: sum.down + toNumber(row.downRate),
    }),
    { up: 0, down: 0 },
  );
}

export function mobileRate(value: number): string {
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

export function compactRate(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "未采集";
  return formatRate(value).replace(/\s+/g, "");
}
