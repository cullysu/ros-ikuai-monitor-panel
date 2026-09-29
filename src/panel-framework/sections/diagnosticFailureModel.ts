import type { OverviewRawMeta } from "../overview";
import { parseRfc3339Timestamp } from "../timeContract";
import type { UnknownRecord } from "./rawValue";

export type DiagnosticChannelId = "realtime-rest" | "slow-rest" | "static-rest" | "detail-rest";

interface ChannelSpec {
  channel: DiagnosticChannelId;
  label: string;
  failures: keyof OverviewRawMeta;
  error: keyof OverviewRawMeta;
  observedAt: keyof OverviewRawMeta;
}

const CHANNELS: ChannelSpec[] = [
  { channel: "realtime-rest", label: "实时 REST", failures: "realtimeEndpointFailures", error: "realtimeError", observedAt: "realtimeUpdatedAt" },
  { channel: "slow-rest", label: "慢速 REST", failures: "slowRestEndpointFailures", error: "slowRestError", observedAt: "slowRestUpdatedAt" },
  { channel: "static-rest", label: "静态 REST", failures: "staticEndpointFailures", error: "staticError", observedAt: "staticUpdatedAt" },
  { channel: "detail-rest", label: "连接明细 REST", failures: "detailEndpointFailures", error: "connectionDetailError", observedAt: "connectionDetailUpdatedAt" },
];

export function diagnosticChannelLabel(channel: DiagnosticChannelId | "unknown"): string {
  return CHANNELS.find((spec) => spec.channel === channel)?.label || "未分类 REST";
}

export function diagnosticFailureLabel(current: boolean): string {
  return current ? "采集失败" : "失败记录";
}

function stringValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function rawFailureRows(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is UnknownRecord => Boolean(item && typeof item === "object" && !Array.isArray(item)));
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).map(([name, message]) => ({ name, message }));
}

function endpointPath(item: UnknownRecord): string | null {
  const explicit = stringValue(item.endpoint);
  if (explicit) return explicit;
  const name = stringValue(item.name) || "";
  return name.match(/\/rest\/[^\s,;]+/i)?.[0] || null;
}

function observedAt(item: UnknownRecord, fallback: unknown): string | null {
  const candidate = stringValue(item.at) || stringValue(fallback);
  return candidate && parseRfc3339Timestamp(candidate) !== null ? candidate : null;
}

function latestRecordedAt(values: Array<string | null>): string | null {
  return values.reduce<string | null>((latest, value) => (
    value && (!latest || (parseRfc3339Timestamp(value) ?? -Infinity) > (parseRfc3339Timestamp(latest) ?? -Infinity)) ? value : latest
  ), null);
}

export interface DiagnosticFailureRow extends UnknownRecord {
  channel: DiagnosticChannelId;
  group: string;
  name: string;
  endpoint: string | null;
  message: string;
  at: string | null;
  channelError: string | null;
  sameChannelFailureCount: number;
  totalFailureCount: number;
}

export interface DiagnosticChannelSummary {
  channel: DiagnosticChannelId;
  label: string;
  observed: boolean;
  failureCount: number;
  error: string | null;
  observedAt: string | null;
}

export function diagnosticFailureRows(meta: OverviewRawMeta | undefined): DiagnosticFailureRow[] {
  const source = meta || {};
  const grouped = CHANNELS.map((spec) => {
    const entries = rawFailureRows(source[spec.failures]);
    return entries.map((item) => ({
      channel: spec.channel,
      group: spec.label,
      name: stringValue(item.name) || "未命名端点",
      endpoint: endpointPath(item),
      message: stringValue(item.message) || "端点读取失败",
      at: observedAt(item, source[spec.observedAt]),
      channelError: stringValue(source[spec.error]),
      sameChannelFailureCount: entries.length,
      totalFailureCount: 0,
    }));
  });
  const totalFailureCount = grouped.reduce((total, entries) => total + entries.length, 0);
  return grouped.flat().map((item) => ({ ...item, totalFailureCount }));
}

export function diagnosticChannelSummaries(meta: OverviewRawMeta | undefined): DiagnosticChannelSummary[] {
  const source = meta || {};
  const failures = diagnosticFailureRows(meta);
  return CHANNELS.map((spec) => {
    const channelFailures = failures.filter((item) => item.channel === spec.channel);
    const channelError = stringValue(source[spec.error]);
    const channelObservedAt = observedAt({}, source[spec.observedAt]) || latestRecordedAt(channelFailures.map((item) => item.at));
    const failureFieldObserved = channelFailures.length > 0;
    return {
      channel: spec.channel,
      label: spec.label,
      observed: failureFieldObserved || channelError !== null || channelObservedAt !== null,
      failureCount: channelFailures.length,
      error: channelError,
      observedAt: channelObservedAt,
    };
  });
}

export function hasDiagnosticFailures(meta: OverviewRawMeta | undefined): boolean {
  return diagnosticFailureRows(meta).length > 0;
}
