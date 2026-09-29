import { formatRfc3339FromEpochMs, isRfc3339Timestamp, parseLegacyTimestampMs } from "../timeContract";

// LEGACY CONTRACT BOUNDARY ---------------------------------------------------
// The vanilla collector (ros_panel) predates the strict React snapshot
// contract in two places: timestamps are naive local strings / epoch seconds /
// RouterOS short logs instead of RFC 3339, and meta.*EndpointFailures is an
// object keyed by endpoint name instead of an array of entries.
// normalizeLegacySnapshot converts both in place on the freshly parsed fetch
// payload, BEFORE the strict validators run — so panelRuntimeSchema stays
// strict and untouched while the vanilla backend keeps its wire format.

const TIMESTAMP_FIELD = /^(?:observedAt|timestamp|updatedAt|generatedAt|sourceUpdatedAt|cachedAt|lastUsedAt|createdAt|systemTime|.*At|.*Timestamp)$/;
const LOG_TIME_PATH = /^logs\.(?:all|system|firewall|dhcp|dns)\[\d+\]\.time$/;

const ENDPOINT_FAILURE_FIELDS: Record<string, { channel: "static-rest" | "realtime-rest" | "slow-rest" | "detail-rest"; group: string }> = {
  staticEndpointFailures: { channel: "static-rest", group: "静态 REST" },
  realtimeEndpointFailures: { channel: "realtime-rest", group: "实时 REST" },
  slowRestEndpointFailures: { channel: "slow-rest", group: "慢速 REST" },
  detailEndpointFailures: { channel: "detail-rest", group: "连接明细 REST" },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toRfc3339(value: unknown, nowMs: number): string | null {
  if (typeof value === "string" && isRfc3339Timestamp(value)) return value.trim();
  const ms = parseLegacyTimestampMs(value, nowMs);
  return ms === null ? null : formatRfc3339FromEpochMs(ms);
}

function normalizeEndpointFailures(
  record: Record<string, unknown>,
  meta: { channel: "static-rest" | "realtime-rest" | "slow-rest" | "detail-rest"; group: string },
): Array<Record<string, unknown>> {
  return Object.entries(record).map(([name, message]) => ({
    channel: meta.channel,
    group: meta.group,
    name,
    endpoint: name,
    message: typeof message === "string" ? message : String(message ?? ""),
    at: null,
  }));
}

function walk(node: unknown, path: string, nowMs: number): void {
  if (Array.isArray(node)) {
    node.forEach((item, index) => walk(item, `${path}[${index}]`, nowMs));
    return;
  }
  if (!isRecord(node)) return;
  for (const [key, value] of Object.entries(node)) {
    const nextPath = path ? `${path}.${key}` : key;
    const isLogTime = LOG_TIME_PATH.test(nextPath);
    // overview.history.timestamps carries epoch seconds under a plural key the
    // generic TIMESTAMP_FIELD regex cannot see; the schema checks it explicitly.
    if (nextPath === "overview.history.timestamps" && Array.isArray(value)) {
      node[key] = value.map((item) => (item === null ? null : toRfc3339(item, nowMs)));
      continue;
    }
    if ((TIMESTAMP_FIELD.test(key) || isLogTime) && value !== null && typeof value !== "undefined") {
      if (Array.isArray(value)) {
        node[key] = value.map((item) => (item === null ? null : toRfc3339(item, nowMs)));
        continue;
      }
      if (!isRecord(value)) {
        if (typeof value === "string" && (value.trim() === "-" || value.trim() === "")) {
          node[key] = null;
          continue;
        }
        const converted = toRfc3339(value, nowMs);
        if (converted !== null) node[key] = converted;
        continue;
      }
    }
    if (ENDPOINT_FAILURE_FIELDS[key] && isRecord(value)) {
      node[key] = normalizeEndpointFailures(value, ENDPOINT_FAILURE_FIELDS[key]);
      continue;
    }
    walk(value, nextPath, nowMs);
  }
}

export function normalizeLegacySnapshot<T>(payload: T, nowMs: number = Date.now()): T {
  walk(payload as unknown, "", nowMs);
  return payload;
}
