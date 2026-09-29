/**
 * Strict, bounded contract for /api/readonly-diagnostics. The collector answers
 * with a legacy payload (no evidence envelope), so this parser normalizes it the
 * same way the DNS-static legacy tolerance does: every field is coerced into a
 * bounded type, invalid rows are dropped, and nothing is ever invented. A
 * payload that does not match the envelope is rejected as unavailable so the
 * page can state the reason instead of guessing.
 */
import type { RouteSupplementResult } from "./routeSupplementSchema";

export interface ReadonlyDnsProbeRow {
  service: string;
  domain: string;
  expected: string;
  serverName: string;
  server: string;
  type: string;
  answers: string[];
  fakeIp: boolean;
  rcode: number | null;
  elapsedMs: number | null;
  error: string | null;
}

export interface ReadonlyHttpProbeRow {
  name: string;
  url: string;
  expected: string;
  status: number | null;
  ok: boolean;
  elapsedMs: number | null;
  finalHost: string | null;
  error: string | null;
}

export interface ReadonlyTcpProbeRow {
  name: string;
  host: string;
  port: number | null;
  expected: string;
  ok: boolean;
  elapsedMs: number | null;
  error: string | null;
}

export interface ReadonlyExitProbeRow {
  name: string;
  url: string;
  ip: string | null;
  elapsedMs: number | null;
  error: string | null;
}

export interface ReadonlyPanelFileRow {
  name: string;
  path: string;
  exists: boolean;
  mtime: string | null;
  size: number | null;
}

export interface ReadonlyNikkiState {
  ok: boolean;
  disabled: boolean;
  providerCount: number | null;
  ruleCount: number | null;
  version: string | null;
  error: string | null;
}

export interface ReadonlyDiagnosticsData {
  kind: "readonly-diagnostics";
  status: "ok" | "disabled" | "error";
  /** Collector-provided display timestamp (panel-local, not RFC 3339). */
  generatedAtLabel: string | null;
  cached: boolean;
  cacheAgeSeconds: number | null;
  cacheTtlSeconds: number | null;
  probeBudgetSeconds: number | null;
  reason: string | null;
  dnsMatrix: ReadonlyDnsProbeRow[];
  serviceReachability: ReadonlyHttpProbeRow[];
  tcpReachability: ReadonlyTcpProbeRow[];
  exitChecks: ReadonlyExitProbeRow[];
  panelFiles: ReadonlyPanelFileRow[];
  nikki: ReadonlyNikkiState;
}

const MAX_DNS_ROWS = 240;
const MAX_PROBE_ROWS = 60;
const MAX_EXIT_ROWS = 24;
const MAX_FILE_ROWS = 24;
const MAX_TEXT = 300;
const MAX_TIME_LABEL = 64;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function boundedText(value: unknown, maxLength = MAX_TEXT): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : null;
}

function boundedTimeLabel(value: unknown): string | null {
  const text = boundedText(value, MAX_TIME_LABEL);
  return text && /[0-9]/.test(text) ? text : null;
}

function boundedNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function boundedCount(value: unknown, maximum: number): number | null {
  const parsed = boundedNumber(value);
  return parsed !== null && Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= maximum ? parsed : null;
}

function boundedElapsed(value: unknown): number | null {
  const parsed = boundedNumber(value);
  return parsed !== null && parsed >= 0 && parsed <= 3_600_000 ? parsed : null;
}

/** Seconds may be fractional (collector rounds to 0.1s). */
function boundedSeconds(value: unknown, maximum: number): number | null {
  const parsed = boundedNumber(value);
  return parsed !== null && parsed >= 0 && parsed <= maximum ? parsed : null;
}

function boundedRows(value: unknown, maximum: number): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(record(item))).slice(0, maximum);
}

function boundedAnswerList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => boundedText(item, 120))
    .filter((item): item is string => item !== null)
    .slice(0, 16);
}

function parseDnsRow(row: Record<string, unknown>): ReadonlyDnsProbeRow | null {
  const domain = boundedText(row.domain, 200);
  const type = boundedText(row.type, 8);
  if (!domain || !type) return null;
  return {
    service: boundedText(row.service, 100) || domain,
    domain,
    expected: boundedText(row.expected, 32) || "unknown",
    serverName: boundedText(row.serverName, 100) || boundedText(row.server, 100) || "未记录",
    server: boundedText(row.server, 100) || "未记录",
    type,
    answers: boundedAnswerList(row.answers),
    fakeIp: row.fakeIp === true,
    rcode: boundedNumber(row.rcode),
    elapsedMs: boundedElapsed(row.elapsedMs),
    error: boundedText(row.error),
  };
}

function parseHttpRow(row: Record<string, unknown>): ReadonlyHttpProbeRow | null {
  const name = boundedText(row.name, 100);
  if (!name) return null;
  return {
    name,
    url: boundedText(row.url, MAX_TEXT) || "-",
    expected: boundedText(row.expected, 32) || "unknown",
    status: boundedCount(row.status, 599),
    ok: row.ok === true,
    elapsedMs: boundedElapsed(row.elapsedMs),
    finalHost: boundedText(row.finalHost, 200),
    error: boundedText(row.error),
  };
}

function parseTcpRow(row: Record<string, unknown>): ReadonlyTcpProbeRow | null {
  const name = boundedText(row.name, 100);
  if (!name) return null;
  return {
    name,
    host: boundedText(row.host, 200) || "-",
    port: boundedCount(row.port, 65_535),
    expected: boundedText(row.expected, 32) || "unknown",
    ok: row.ok === true,
    elapsedMs: boundedElapsed(row.elapsedMs),
    error: boundedText(row.error),
  };
}

function parseExitRow(row: Record<string, unknown>): ReadonlyExitProbeRow | null {
  const name = boundedText(row.name, 100);
  if (!name) return null;
  return {
    name,
    url: boundedText(row.url, MAX_TEXT) || "-",
    ip: boundedText(row.ip, 45),
    elapsedMs: boundedElapsed(row.elapsedMs),
    error: boundedText(row.error),
  };
}

function parseFileRow(row: Record<string, unknown>): ReadonlyPanelFileRow | null {
  const path = boundedText(row.path, 400);
  if (!path) return null;
  const parts = path.split(/[\\/]/);
  return {
    name: parts[parts.length - 1] || path,
    path,
    exists: row.exists === true,
    mtime: boundedTimeLabel(row.mtime),
    size: boundedCount(row.size, 4_294_967_295),
  };
}

function parseNikki(value: unknown): ReadonlyNikkiState {
  const source = record(value) || {};
  return {
    ok: source.ok === true,
    disabled: source.disabled === true,
    providerCount: boundedCount(source.providerCount, 1_000),
    ruleCount: boundedCount(source.ruleCount, 1_000_000),
    version: boundedText(source.version, 60),
    error: boundedText(source.error),
  };
}

function unavailable(reason: string): RouteSupplementResult<ReadonlyDiagnosticsData> {
  return { data: null, parseStatus: "malformed", evidenceMode: "unavailable", generatedAt: null, observedAt: null, source: null, sourceStatus: null, coverage: null, reason };
}

export function parseReadonlyDiagnostics(payload: unknown): RouteSupplementResult<ReadonlyDiagnosticsData> {
  const source = record(payload);
  if (!source) return unavailable("只读诊断返回不是 JSON 对象");
  if (source.readOnly !== true) return unavailable("只读诊断响应缺少只读边界声明");
  const status = typeof source.status === "string" && ["ok", "disabled", "error"].includes(source.status)
    ? source.status as ReadonlyDiagnosticsData["status"]
    : null;
  if (!status) return unavailable("只读诊断响应状态不符合契约");

  const reason = boundedText(source.reason) || boundedText(source.error);
  if (status !== "ok") {
    const data: ReadonlyDiagnosticsData = {
      kind: "readonly-diagnostics",
      status,
      generatedAtLabel: boundedTimeLabel(source.generatedAt),
      cached: false,
      cacheAgeSeconds: null,
      cacheTtlSeconds: null,
      probeBudgetSeconds: null,
      reason: reason || (status === "disabled" ? "只读诊断在当前面板 profile 已停用" : "只读诊断探测执行失败"),
      dnsMatrix: [],
      serviceReachability: [],
      tcpReachability: [],
      exitChecks: [],
      panelFiles: [],
      nikki: parseNikki(source.nikki),
    };
    return {
      data,
      parseStatus: "accepted",
      evidenceMode: "unavailable",
      generatedAt: null,
      observedAt: null,
      source: "readonly-probes",
      sourceStatus: status === "disabled" ? "degraded" : "failed",
      coverage: "unavailable",
      reason: data.reason,
    };
  }

  const data: ReadonlyDiagnosticsData = {
    kind: "readonly-diagnostics",
    status: "ok",
    generatedAtLabel: boundedTimeLabel(source.generatedAt),
    cached: source.cached === true,
    cacheAgeSeconds: boundedSeconds(source.cacheAgeSeconds, 86_400),
    cacheTtlSeconds: boundedSeconds(source.cacheTtlSeconds, 86_400),
    probeBudgetSeconds: boundedNumber(source.probeBudgetSeconds),
    reason: null,
    dnsMatrix: boundedRows(source.dnsMatrix, MAX_DNS_ROWS).map(parseDnsRow).filter((row): row is ReadonlyDnsProbeRow => row !== null),
    serviceReachability: boundedRows(source.serviceReachability, MAX_PROBE_ROWS).map(parseHttpRow).filter((row): row is ReadonlyHttpProbeRow => row !== null),
    tcpReachability: boundedRows(source.tcpReachability, MAX_PROBE_ROWS).map(parseTcpRow).filter((row): row is ReadonlyTcpProbeRow => row !== null),
    exitChecks: boundedRows(source.exitChecks, MAX_EXIT_ROWS).map(parseExitRow).filter((row): row is ReadonlyExitProbeRow => row !== null),
    panelFiles: boundedRows(source.panelFiles, MAX_FILE_ROWS).map(parseFileRow).filter((row): row is ReadonlyPanelFileRow => row !== null),
    nikki: parseNikki(source.nikki),
  };
  return {
    data,
    parseStatus: "accepted",
    evidenceMode: "current",
    generatedAt: null,
    observedAt: null,
    source: "readonly-probes",
    sourceStatus: "ok",
    coverage: "bounded-sample",
    reason: null,
  };
}
