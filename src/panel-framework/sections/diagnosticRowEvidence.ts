import { parseRfc3339Timestamp } from "../timeContract";
import type { DiagnosticRowEvidence } from "./sectionRowEvidenceTypes";
import type { UnknownRecord } from "./rawValue";

function text(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && !["-", "—", "未记录", "未取得"].includes(normalized) ? normalized : null;
}

function count(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function channel(value: unknown): DiagnosticRowEvidence["channel"] {
  if (
    value === "realtime-rest"
    || value === "slow-rest"
    || value === "static-rest"
    || value === "detail-rest"
  ) return value;
  return "unknown";
}

export function buildDiagnosticRowEvidence(title: string, row: UnknownRecord): DiagnosticRowEvidence {
  const recordedAt = text(row.at);
  return {
    kind: "diagnostic",
    sourceTable: title,
    channel: channel(row.channel),
    group: text(row.group) || "采集通道",
    transport: "REST",
    objectName: text(row.name) || "未命名端点",
    endpoint: text(row.endpoint),
    message: text(row.message) || "端点读取失败",
    recordedAt: recordedAt && parseRfc3339Timestamp(recordedAt) !== null ? recordedAt : null,
    channelError: text(row.channelError),
    sameChannelFailureCount: count(row.sameChannelFailureCount),
    totalFailureCount: count(row.totalFailureCount),
  };
}
