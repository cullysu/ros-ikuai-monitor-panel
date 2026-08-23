/**
 * Strict, bounded contracts for evidence that is intentionally fetched outside
 * the snapshot.  These parsers never invent a value: a bad payload is rejected
 * as unavailable so the snapshot remains the safe fallback.
 */
export type SupplementEvidenceMode = "current" | "historical" | "unavailable";

export interface RouteSupplementResult<T> {
  data: T | null;
  parseStatus: "accepted" | "unavailable" | "malformed";
  evidenceMode: SupplementEvidenceMode;
  generatedAt: string | null;
  observedAt: string | null;
  source: string | null;
  sourceStatus: string | null;
  coverage: "complete" | "page" | "bounded-sample" | "preview" | "unavailable" | null;
  reason: string | null;
}

export interface DnsStaticSupplement {
  kind: "dns-static";
  totalCount: number;
  offset: number;
  limit: number;
  revision: string;
  rows: Array<{ name: string; type: string; value: string; ttl: string; comment: string; disabled: boolean }>;
  coverage: "complete" | "page" | "bounded-sample" | "preview" | "unavailable";
}

export interface HealthFindingSupplement {
  kind: "health-findings";
  generatedAt: string;
  sourceUpdatedAt: string;
  sourceStatus: string;
  findings: Array<{
    id: string;
    severity: "critical" | "warning" | "info";
    domain: string;
    title: string;
    summary: string;
    source: string;
    priority: number;
    evidence: Array<{ label: string; value: string }>;
  }>;
}

export interface ConnectionSearchSupplement {
  kind: "connection-search";
  targetIp: string;
  limit: number;
  matchCount: number;
  capture: { truncatedByRows: boolean; truncatedByBytes: boolean; timedOut: boolean | null; incompleteTransport: boolean };
  rows: Array<{ srcIp: string; dstIp: string; protocol: string; timeout: string; origRateBps: number | null; replRateBps: number | null }>;
}

export type RouteSupplement = DnsStaticSupplement | HealthFindingSupplement | ConnectionSearchSupplement;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function string(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function boundedString(value: unknown, maxLength: number): string | null {
  const parsed = string(value);
  return parsed && parsed.length <= maxLength ? parsed : null;
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function nullableNonNegativeInteger(value: unknown): number | null | undefined {
  if (value === null) return null;
  const parsed = nonNegativeInteger(value);
  return parsed === null ? undefined : parsed;
}

function rfc3339(value: unknown): string | null {
  const text = string(value);
  if (!text || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(text) || !Number.isFinite(Date.parse(text))) return null;
  return text;
}

function rows(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function unavailable<T>(reason: string): RouteSupplementResult<T> {
  return { data: null, parseStatus: "malformed", evidenceMode: "unavailable", generatedAt: null, observedAt: null, source: null, sourceStatus: null, coverage: null, reason };
}

interface StrictEnvelope {
  evidenceMode: "current" | "historical" | "unavailable";
  generatedAt: string;
  observedAt: string | null;
  source: string;
  sourceStatus: string;
  coverage: "complete" | "page" | "bounded-sample" | "preview" | "unavailable";
}

function strictEnvelope(source: Record<string, unknown>, expectedKind: "connection-search" | "dns-static" | "health-findings"): StrictEnvelope | null {
  const evidenceMode = string(source.evidenceMode);
  const generatedAt = rfc3339(source.generatedAt);
  const hasObservedAt = Object.prototype.hasOwnProperty.call(source, "observedAt");
  const observedAt = source.observedAt === null ? null : rfc3339(source.observedAt);
  const origin = string(source.source);
  const sourceStatus = string(source.sourceStatus);
  const coverage = string(source.coverage);
  if (source.schemaVersion !== 1 || source.readOnly !== true || source.kind !== expectedKind) return null;
  if (!evidenceMode || !["current", "historical", "unavailable"].includes(evidenceMode)) return null;
  if (!generatedAt || !hasObservedAt || !origin || !sourceStatus || !["ok", "degraded", "failed", "unknown"].includes(sourceStatus) || !["complete", "page", "bounded-sample", "preview", "unavailable"].includes(coverage || "")) return null;
  if (evidenceMode !== "unavailable" && !observedAt) return null;
  if (source.observedAt !== null && !observedAt) return null;
  return {
    evidenceMode: evidenceMode as StrictEnvelope["evidenceMode"],
    generatedAt,
    observedAt,
    source: origin,
    sourceStatus,
    coverage: coverage as StrictEnvelope["coverage"],
  };
}

function unavailableEnvelope<T>(envelope: StrictEnvelope, reason: string): RouteSupplementResult<T> {
  return {
    data: null,
    parseStatus: "unavailable",
    evidenceMode: "unavailable",
    generatedAt: envelope.generatedAt,
    observedAt: envelope.observedAt,
    source: envelope.source,
    sourceStatus: envelope.sourceStatus,
    coverage: envelope.coverage,
    reason,
  };
}

function accepted<T>(envelope: StrictEnvelope, data: T): RouteSupplementResult<T> {
  return {
    data,
    parseStatus: "accepted",
    evidenceMode: envelope.evidenceMode,
    generatedAt: envelope.generatedAt,
    observedAt: envelope.observedAt,
    source: envelope.source,
    sourceStatus: envelope.sourceStatus,
    coverage: envelope.coverage,
    reason: null,
  };
}

function isIpLike(value: string): boolean {
  const candidate = value.trim();
  if (!candidate || candidate !== value || /\s/.test(candidate)) return false;
  const ipv4 = candidate.split(".");
  if (ipv4.length === 4) {
    return ipv4.every((part) => /^(?:0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255);
  }
  if (!candidate.includes(":") || !/^[0-9a-f:]+$/.test(candidate)) return false;
  try {
    const hostname = new URL(`http://[${candidate}]/`).hostname;
    const canonical = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
    return canonical === candidate;
  } catch {
    return false;
  }
}

export function isExplicitIpQuery(value: string): boolean {
  return isIpLike(value);
}

export function parseDnsStaticSupplement(payload: unknown): RouteSupplementResult<DnsStaticSupplement> {
  const source = record(payload);
  if (!source) return unavailable("DNS 返回不是对象");
  const envelope = strictEnvelope(source, "dns-static");
  if (!envelope) return unavailable("DNS 响应 envelope 不符合只读证据契约");
  if (!["rest-live", "rest-cache", "ssh-preview", "unavailable"].includes(envelope.source)) return unavailable("DNS 来源不符合契约");
  const dnsStatusValid = envelope.source === "rest-live"
    ? envelope.evidenceMode === "current" && envelope.sourceStatus === "ok" && ["page", "complete"].includes(envelope.coverage)
    : envelope.source === "rest-cache"
      ? envelope.evidenceMode === "historical" && envelope.sourceStatus === "degraded" && envelope.coverage === "page"
      : envelope.source === "ssh-preview"
        ? envelope.evidenceMode === "unavailable" && envelope.sourceStatus === "degraded" && envelope.coverage === "preview"
        : envelope.evidenceMode === "unavailable" && ["failed", "unknown"].includes(envelope.sourceStatus) && envelope.coverage === "unavailable";
  if (!dnsStatusValid) return unavailable("DNS 来源状态与证据模式不一致");
  if (envelope.coverage === "complete" && (envelope.source !== "rest-live" || envelope.evidenceMode !== "current")) return unavailable("只有当前 REST 枚举可声明完整覆盖");
  if (envelope.evidenceMode === "unavailable") return unavailableEnvelope(envelope, "DNS 补充证据不可用");
  const totalCount = nonNegativeInteger(source.totalCount);
  const offset = nonNegativeInteger(source.offset);
  const limit = nonNegativeInteger(source.limit);
  const revision = string(source.revision);
  const page = record(source.page);
  const sourceRows = rows(source.rows);
  const pageOffset = page && nonNegativeInteger(page.offset);
  const pageSize = page && nonNegativeInteger(page.pageSize);
  const returnedCount = page && nonNegativeInteger(page.returnedCount);
  const pageTotalCount = page && nonNegativeInteger(page.totalCount);
  const pageRevision = page && string(page.revision);
  if (totalCount === null || offset === null || limit === null || limit < 1 || limit > 50 || !revision || !/^[0-9a-f]{64}$/.test(revision) || !page || !sourceRows || sourceRows.length > limit || offset > totalCount) return unavailable("DNS 分页元数据不符合契约");
  if (pageOffset !== offset || pageSize !== limit || returnedCount !== sourceRows.length || pageTotalCount !== totalCount || pageRevision !== revision || offset % limit !== 0 || offset >= 1000 || Math.floor(offset / limit) >= 20) return unavailable("DNS 页对象与响应代次不一致");
  const parsedRows = sourceRows.map((value) => {
    const row = record(value);
    if (!row) return null;
    const name = string(row.name);
    const type = string(row.type);
    const target = string(row.value);
    const ttl = string(row.ttl);
    const comment = typeof row.comment === "string" ? row.comment : null;
    return name && type && target && ttl && comment !== null && typeof row.disabled === "boolean"
      ? { name, type, value: target, ttl, comment, disabled: row.disabled }
      : null;
  });
  if (parsedRows.some((row) => row === null)) return unavailable("DNS 规则行不符合契约");
  if (source.visibleRuleCount !== undefined && nonNegativeInteger(source.visibleRuleCount) !== parsedRows.length) return unavailable("DNS 可见规则计数不一致");
  if (offset + parsedRows.length > totalCount) return unavailable("DNS 分页范围超出总数");
  return accepted(envelope, { kind: "dns-static", totalCount, offset, limit, revision, rows: parsedRows as DnsStaticSupplement["rows"], coverage: envelope.coverage });
}

export function parseHealthFindingSupplement(payload: unknown): RouteSupplementResult<HealthFindingSupplement> {
  const source = record(payload);
  if (!source) return unavailable("健康发现返回不是对象");
  const envelope = strictEnvelope(source, "health-findings");
  if (!envelope) return unavailable("健康发现 envelope 不符合只读证据契约");
  if (envelope.source !== "snapshot-health-analysis") return unavailable("健康发现来源不符合契约");
  const healthStatusValid = envelope.evidenceMode === "current"
    ? envelope.sourceStatus === "ok" && envelope.coverage === "bounded-sample"
    : envelope.evidenceMode === "historical"
      ? envelope.sourceStatus === "degraded" && envelope.coverage === "bounded-sample"
      : ["failed", "unknown"].includes(envelope.sourceStatus) && envelope.coverage === "unavailable";
  if (!healthStatusValid) return unavailable("健康发现来源状态与证据模式不一致");
  if (envelope.evidenceMode === "unavailable") return unavailableEnvelope(envelope, "健康发现证据不可用");
  const generatedAt = rfc3339(source.generatedAt);
  const sourceUpdatedAt = rfc3339(source.sourceUpdatedAt);
  const sourceStatus = string(source.sourceStatus);
  const sourceRows = rows(source.findings);
  if (!generatedAt || !sourceUpdatedAt || !sourceStatus || !sourceRows || sourceRows.length > 20 || !envelope.observedAt || Date.parse(sourceUpdatedAt) !== Date.parse(envelope.observedAt)) return unavailable("健康发现来源时间或数量不符合契约");
  const findings = sourceRows.map((value) => {
    const row = record(value);
    if (!row) return null;
    const id = boundedString(row.id, 128);
    const severity = string(row.severity);
    const domain = boundedString(row.domain, 64);
    const title = boundedString(row.title, 200);
    const summary = boundedString(row.summary, 500);
    const sourceName = boundedString(row.source, 128);
    const priority = nonNegativeInteger(row.priority);
    const evidenceRows = rows(row.evidence);
    if (!id || !domain || !title || !summary || !sourceName || priority === null || !evidenceRows || evidenceRows.length > 6 || !["critical", "warning", "info"].includes(severity || "")) return null;
    const evidence = evidenceRows.map((item) => {
      const fact = record(item);
      const label = fact && boundedString(fact.label, 64);
      const factValue = fact && (typeof fact.value === "string" || typeof fact.value === "number" || typeof fact.value === "boolean") ? String(fact.value) : null;
      return label && factValue !== null && factValue.length <= 512 ? { label, value: factValue } : null;
    });
    return evidence.some((item) => item === null) ? null : { id, severity: severity as "critical" | "warning" | "info", domain, title, summary, source: sourceName, priority, evidence: evidence as Array<{ label: string; value: string }> };
  });
  if (findings.some((finding) => finding === null)) return unavailable("健康发现行不符合契约");
  const validFindings = findings as HealthFindingSupplement["findings"];
  if (new Set(validFindings.map((finding) => finding.id)).size !== validFindings.length) return unavailable("健康发现 ID 不唯一");
  const severityRank = { critical: 0, warning: 1, info: 2 } as const;
  const orderedFindings = [...validFindings].sort((left, right) => (
    severityRank[left.severity] - severityRank[right.severity]
    || left.priority - right.priority
    || left.id.localeCompare(right.id)
  ));
  return accepted(envelope, { kind: "health-findings", generatedAt, sourceUpdatedAt, sourceStatus, findings: orderedFindings });
}

export function parseConnectionSearchSupplement(payload: unknown): RouteSupplementResult<ConnectionSearchSupplement> {
  const source = record(payload);
  if (!source) return unavailable("连接查询返回不是对象");
  const envelope = strictEnvelope(source, "connection-search");
  if (!envelope) return unavailable("连接查询 envelope 不符合只读证据契约");
  if (envelope.coverage !== "bounded-sample" || envelope.source !== "routeros-ssh") return unavailable("连接查询来源或覆盖类型不符合有界采样契约");
  const connectionStatusValid = envelope.evidenceMode === "current"
    ? ["ok", "degraded"].includes(envelope.sourceStatus)
    : envelope.evidenceMode === "historical"
      ? envelope.sourceStatus === "degraded"
      : ["failed", "unknown"].includes(envelope.sourceStatus);
  if (!connectionStatusValid) return unavailable("连接查询来源状态与证据模式不一致");
  if (envelope.evidenceMode === "unavailable") return unavailableEnvelope(envelope, "连接查询证据不可用");
  const targetIp = string(source.targetIp);
  const limit = nonNegativeInteger(source.limit);
  const matchCount = nonNegativeInteger(source.matchCount);
  const capture = record(source.capture);
  const sourceRows = rows(source.rows);
  if (!targetIp || !isIpLike(targetIp) || limit === null || limit < 1 || limit > 50 || matchCount === null || !capture || !sourceRows || matchCount !== sourceRows.length || sourceRows.length > limit || typeof capture.truncatedByRows !== "boolean" || typeof capture.truncatedByBytes !== "boolean" || (capture.timedOut !== null && typeof capture.timedOut !== "boolean") || typeof capture.incompleteTransport !== "boolean") return unavailable("连接查询边界或行集不符合契约");
  const parsedRows = sourceRows.map((value) => {
    const row = record(value);
    if (!row) return null;
    const srcIp = boundedString(row.srcIp, 45);
    const dstIp = boundedString(row.dstIp, 45);
    const protocol = boundedString(row.protocol, 32);
    const timeout = boundedString(row.timeout, 64);
    const origRateBps = nullableNonNegativeInteger(row.origRateBps);
    const replRateBps = nullableNonNegativeInteger(row.replRateBps);
    return srcIp && dstIp && protocol && timeout && origRateBps !== undefined && replRateBps !== undefined && isIpLike(srcIp) && isIpLike(dstIp)
      ? { srcIp, dstIp, protocol, timeout, origRateBps, replRateBps }
      : null;
  });
  if (parsedRows.some((row) => row === null)) return unavailable("连接查询行不符合契约");
  return accepted(envelope, {
      kind: "connection-search",
      targetIp,
      limit,
      matchCount,
      capture: { truncatedByRows: capture.truncatedByRows, truncatedByBytes: capture.truncatedByBytes, timedOut: capture.timedOut as boolean | null, incompleteTransport: capture.incompleteTransport },
      rows: parsedRows as ConnectionSearchSupplement["rows"],
    });
}
