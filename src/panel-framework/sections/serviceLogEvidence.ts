import { parseRfc3339Timestamp } from "../timeContract";
import { objectRows, record, type UnknownRecord } from "./rawValue";
import type {
  EvidenceSeverity,
  LogNeighborEvidence,
  LogRowEvidence,
  SectionEvidenceContext,
} from "./sectionRowEvidenceTypes";
import type { ServiceLogCategory, ServiceLogRowEvidence } from "./serviceLogEvidenceTypes";

function stringValue(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value !== "string") continue;
    const normalized = value.trim();
    if (normalized && !["-", "—", "未记录", "未取得"].includes(normalized)) return normalized;
  }
  return null;
}

function severityFrom(...values: unknown[]): EvidenceSeverity {
  const source = values.map((value) => stringValue(value)?.toLowerCase() || "").filter(Boolean).join(" ");
  if (/(?:^|[\s,;:/_-])(critical|fatal|emergency|alert)(?:$|[\s,;:/_-])/.test(source)) return "critical";
  if (/(?:^|[\s,;:/_-])(error|failed|failure)(?:$|[\s,;:/_-])/.test(source)) return "error";
  if (/(?:^|[\s,;:/_-])(warning|warn|degraded)(?:$|[\s,;:/_-])/.test(source)) return "warning";
  if (/(?:^|[\s,;:/_-])(info|notice|debug)(?:$|[\s,;:/_-])/.test(source)) return "info";
  return "unknown";
}

export function logEvidence(
  title: string,
  row: UnknownRecord,
  context: SectionEvidenceContext,
): LogRowEvidence {
  const time = stringValue(row.time, row.lastConfirmed);
  const sourceRows = objectRows(record(context.logs).all);
  const ordered = sourceRows
    .map((item, sourceIndex) => {
      const itemTime = stringValue(item.time, item.lastConfirmed);
      return { item, sourceIndex, timestamp: itemTime ? parseRfc3339Timestamp(itemTime) : null };
    })
    .sort((left, right) => {
      if (left.timestamp === null && right.timestamp === null) return left.sourceIndex - right.sourceIndex;
      if (left.timestamp === null) return 1;
      if (right.timestamp === null) return -1;
      return right.timestamp - left.timestamp || left.sourceIndex - right.sourceIndex;
    });
  const currentIndex = ordered.findIndex((candidate) => candidate.item === row);
  const neighbors = currentIndex < 0 ? [] : ordered
    .map((candidate, index) => ({ ...candidate, index }))
    .filter((candidate) => candidate.item !== row)
    .sort((left, right) => Math.abs(left.index - currentIndex) - Math.abs(right.index - currentIndex) || left.index - right.index)
    .slice(0, 2)
    .sort((left, right) => left.index - right.index)
    .map((candidate): LogNeighborEvidence => {
      const candidateTime = stringValue(candidate.item.time, candidate.item.lastConfirmed);
      return {
        relation: candidate.index < currentIndex ? "newer" : "older",
        time: candidateTime,
        timestamp: candidate.timestamp,
        topics: stringValue(candidate.item.topics),
        severity: severityFrom(candidate.item.severity, candidate.item.level, candidate.item.topics),
        message: stringValue(candidate.item.message, candidate.item.abnormal),
      };
    });
  return {
    kind: "log",
    sourceTable: title,
    time,
    timestamp: time ? parseRfc3339Timestamp(time) : null,
    topics: stringValue(row.topics),
    severity: severityFrom(row.severity, row.level, row.topics),
    source: stringValue(row.group, row.source),
    message: stringValue(row.message, row.abnormal),
    neighbors,
  };
}

function serviceLogCategory(value: unknown): ServiceLogCategory {
  const normalized = (typeof value === "string" ? value : "").trim().toLowerCase();
  return normalized === "system" || normalized === "firewall" || normalized === "dhcp" || normalized === "dns"
    ? normalized
    : "unknown";
}

export function serviceLogEvidence(
  title: string,
  row: UnknownRecord,
  context: SectionEvidenceContext,
): ServiceLogRowEvidence {
  const base = logEvidence(title, row, context);
  const category = serviceLogCategory(row.group);
  return {
    ...base,
    serviceCategory: category,
    sourceCollection: category === "unknown" ? null : `logs.${category}`,
    categoryStatus: category === "unknown" ? "unavailable" : "observed",
  };
}
