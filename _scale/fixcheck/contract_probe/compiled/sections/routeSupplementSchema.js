"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/panel-framework/sections/routeSupplementSchema.ts
var routeSupplementSchema_exports = {};
__export(routeSupplementSchema_exports, {
  isExplicitIpQuery: () => isExplicitIpQuery,
  parseConnectionSearchSupplement: () => parseConnectionSearchSupplement,
  parseDnsStaticSupplement: () => parseDnsStaticSupplement,
  parseHealthFindingSupplement: () => parseHealthFindingSupplement
});
module.exports = __toCommonJS(routeSupplementSchema_exports);
function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function string(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function boundedString(value, maxLength) {
  const parsed = string(value);
  return parsed && parsed.length <= maxLength ? parsed : null;
}
function nonNegativeInteger(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
function nullableNonNegativeInteger(value) {
  if (value === null) return null;
  const parsed = nonNegativeInteger(value);
  return parsed === null ? void 0 : parsed;
}
function rfc3339(value) {
  const text = string(value);
  if (!text || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(text) || !Number.isFinite(Date.parse(text))) return null;
  return text;
}
function rows(value) {
  return Array.isArray(value) ? value : null;
}
function unavailable(reason) {
  return { data: null, parseStatus: "malformed", evidenceMode: "unavailable", generatedAt: null, observedAt: null, source: null, sourceStatus: null, coverage: null, reason };
}
function strictEnvelope(source, expectedKind) {
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
    evidenceMode,
    generatedAt,
    observedAt,
    source: origin,
    sourceStatus,
    coverage
  };
}
function unavailableEnvelope(envelope, reason) {
  return {
    data: null,
    parseStatus: "unavailable",
    evidenceMode: "unavailable",
    generatedAt: envelope.generatedAt,
    observedAt: envelope.observedAt,
    source: envelope.source,
    sourceStatus: envelope.sourceStatus,
    coverage: envelope.coverage,
    reason
  };
}
function accepted(envelope, data) {
  return {
    data,
    parseStatus: "accepted",
    evidenceMode: envelope.evidenceMode,
    generatedAt: envelope.generatedAt,
    observedAt: envelope.observedAt,
    source: envelope.source,
    sourceStatus: envelope.sourceStatus,
    coverage: envelope.coverage,
    reason: null
  };
}
function isIpLike(value) {
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
function isExplicitIpQuery(value) {
  return isIpLike(value);
}
function applyLegacyDnsStaticEnvelope(source) {
  if (source.schemaVersion !== void 0 || source.kind !== void 0) return;
  if (!Array.isArray(source.rows) || typeof source.totalCount !== "number" || typeof source.offset !== "number" || typeof source.limit !== "number") return;
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const rows2 = source.rows.map((row) => {
    if (!record(row)) return row;
    const entry = row;
    if (entry.value === void 0) entry.value = entry.address ?? entry.cname ?? entry.text ?? entry.name ?? "-";
    if (typeof entry.disabled !== "boolean") entry.disabled = entry.disabled === "true";
    return entry;
  });
  source.rows = rows2;
  if (typeof source.revision !== "string" || !/^[0-9a-f]{64}$/.test(source.revision)) {
    source.revision = legacyDnsRevision(source.totalCount, source.offset, source.limit, rows2.length, JSON.stringify(rows2));
  }
  if (!record(source.page)) {
    source.page = {
      offset: source.offset,
      pageSize: source.limit,
      returnedCount: rows2.length,
      totalCount: source.totalCount,
      revision: source.revision
    };
  }
  if (source.schemaVersion === void 0) source.schemaVersion = 1;
  if (source.readOnly === void 0) source.readOnly = true;
  if (source.kind === void 0) source.kind = "dns-static";
  if (source.source === void 0) {
    source.source = "rest-live";
    source.evidenceMode = "current";
    source.sourceStatus = "ok";
    source.coverage = "page";
  }
  if (source.generatedAt === void 0) source.generatedAt = nowIso;
  if (source.observedAt === void 0) source.observedAt = nowIso;
}
function legacyDnsRevision(...parts) {
  let h1 = 2166136261;
  let h2 = 16777619;
  const text = parts.map((part) => String(part)).join("|");
  for (let index = 0; index < text.length; index += 1) {
    h1 = (h1 ^ text.charCodeAt(index)) >>> 0;
    h1 = h1 * 16777619 >>> 0;
    h2 = h2 + text.charCodeAt(index) * (index + 7) >>> 0;
    h2 = h2 * 2246822507 >>> 0;
  }
  return (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).repeat(4).slice(0, 64);
}
function parseDnsStaticSupplement(payload) {
  const source = record(payload);
  if (!source) return unavailable("DNS \u8FD4\u56DE\u4E0D\u662F\u5BF9\u8C61");
  applyLegacyDnsStaticEnvelope(source);
  const envelope = strictEnvelope(source, "dns-static");
  if (!envelope) return unavailable("DNS \u54CD\u5E94 envelope \u4E0D\u7B26\u5408\u53EA\u8BFB\u8BC1\u636E\u5951\u7EA6");
  if (!["rest-live", "rest-cache", "ssh-preview", "unavailable"].includes(envelope.source)) return unavailable("DNS \u6765\u6E90\u4E0D\u7B26\u5408\u5951\u7EA6");
  const dnsStatusValid = envelope.source === "rest-live" ? envelope.evidenceMode === "current" && envelope.sourceStatus === "ok" && ["page", "complete"].includes(envelope.coverage) : envelope.source === "rest-cache" ? envelope.evidenceMode === "historical" && envelope.sourceStatus === "degraded" && envelope.coverage === "page" : envelope.source === "ssh-preview" ? envelope.evidenceMode === "unavailable" && envelope.sourceStatus === "degraded" && envelope.coverage === "preview" : envelope.evidenceMode === "unavailable" && ["failed", "unknown"].includes(envelope.sourceStatus) && envelope.coverage === "unavailable";
  if (!dnsStatusValid) return unavailable("DNS \u6765\u6E90\u72B6\u6001\u4E0E\u8BC1\u636E\u6A21\u5F0F\u4E0D\u4E00\u81F4");
  if (envelope.coverage === "complete" && (envelope.source !== "rest-live" || envelope.evidenceMode !== "current")) return unavailable("\u53EA\u6709\u5F53\u524D REST \u679A\u4E3E\u53EF\u58F0\u660E\u5B8C\u6574\u8986\u76D6");
  if (envelope.evidenceMode === "unavailable") return unavailableEnvelope(envelope, "DNS \u8865\u5145\u8BC1\u636E\u4E0D\u53EF\u7528");
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
  if (totalCount === null || offset === null || limit === null || limit < 1 || limit > 50 || !revision || !/^[0-9a-f]{64}$/.test(revision) || !page || !sourceRows || sourceRows.length > limit || offset > totalCount) return unavailable("DNS \u5206\u9875\u5143\u6570\u636E\u4E0D\u7B26\u5408\u5951\u7EA6");
  if (pageOffset !== offset || pageSize !== limit || returnedCount !== sourceRows.length || pageTotalCount !== totalCount || pageRevision !== revision || offset % limit !== 0 || offset >= 1e3 || Math.floor(offset / limit) >= 20) return unavailable("DNS \u9875\u5BF9\u8C61\u4E0E\u54CD\u5E94\u4EE3\u6B21\u4E0D\u4E00\u81F4");
  const parsedRows = sourceRows.map((value) => {
    const row = record(value);
    if (!row) return null;
    const name = string(row.name);
    const type = string(row.type);
    const target = string(row.value);
    const ttl = string(row.ttl);
    const comment = typeof row.comment === "string" ? row.comment : null;
    return name && type && target && ttl && comment !== null && typeof row.disabled === "boolean" ? { name, type, value: target, ttl, comment, disabled: row.disabled } : null;
  });
  if (parsedRows.some((row) => row === null)) return unavailable("DNS \u89C4\u5219\u884C\u4E0D\u7B26\u5408\u5951\u7EA6");
  if (source.visibleRuleCount !== void 0 && nonNegativeInteger(source.visibleRuleCount) !== parsedRows.length) return unavailable("DNS \u53EF\u89C1\u89C4\u5219\u8BA1\u6570\u4E0D\u4E00\u81F4");
  if (offset + parsedRows.length > totalCount) return unavailable("DNS \u5206\u9875\u8303\u56F4\u8D85\u51FA\u603B\u6570");
  return accepted(envelope, { kind: "dns-static", totalCount, offset, limit, revision, rows: parsedRows, coverage: envelope.coverage });
}
function parseHealthFindingSupplement(payload) {
  const source = record(payload);
  if (!source) return unavailable("\u5065\u5EB7\u53D1\u73B0\u8FD4\u56DE\u4E0D\u662F\u5BF9\u8C61");
  const envelope = strictEnvelope(source, "health-findings");
  if (!envelope) return unavailable("\u5065\u5EB7\u53D1\u73B0 envelope \u4E0D\u7B26\u5408\u53EA\u8BFB\u8BC1\u636E\u5951\u7EA6");
  if (envelope.source !== "snapshot-health-analysis") return unavailable("\u5065\u5EB7\u53D1\u73B0\u6765\u6E90\u4E0D\u7B26\u5408\u5951\u7EA6");
  const healthStatusValid = envelope.evidenceMode === "current" ? envelope.sourceStatus === "ok" && envelope.coverage === "bounded-sample" : envelope.evidenceMode === "historical" ? envelope.sourceStatus === "degraded" && envelope.coverage === "bounded-sample" : ["failed", "unknown"].includes(envelope.sourceStatus) && envelope.coverage === "unavailable";
  if (!healthStatusValid) return unavailable("\u5065\u5EB7\u53D1\u73B0\u6765\u6E90\u72B6\u6001\u4E0E\u8BC1\u636E\u6A21\u5F0F\u4E0D\u4E00\u81F4");
  if (envelope.evidenceMode === "unavailable") return unavailableEnvelope(envelope, "\u5065\u5EB7\u53D1\u73B0\u8BC1\u636E\u4E0D\u53EF\u7528");
  const generatedAt = rfc3339(source.generatedAt);
  const sourceUpdatedAt = rfc3339(source.sourceUpdatedAt);
  const sourceStatus = string(source.sourceStatus);
  const sourceRows = rows(source.findings);
  if (!generatedAt || !sourceUpdatedAt || !sourceStatus || !sourceRows || sourceRows.length > 20 || !envelope.observedAt || Date.parse(sourceUpdatedAt) !== Date.parse(envelope.observedAt)) return unavailable("\u5065\u5EB7\u53D1\u73B0\u6765\u6E90\u65F6\u95F4\u6216\u6570\u91CF\u4E0D\u7B26\u5408\u5951\u7EA6");
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
    return evidence.some((item) => item === null) ? null : { id, severity, domain, title, summary, source: sourceName, priority, evidence };
  });
  if (findings.some((finding) => finding === null)) return unavailable("\u5065\u5EB7\u53D1\u73B0\u884C\u4E0D\u7B26\u5408\u5951\u7EA6");
  const validFindings = findings;
  if (new Set(validFindings.map((finding) => finding.id)).size !== validFindings.length) return unavailable("\u5065\u5EB7\u53D1\u73B0 ID \u4E0D\u552F\u4E00");
  const severityRank = { critical: 0, warning: 1, info: 2 };
  const orderedFindings = [...validFindings].sort((left, right) => severityRank[left.severity] - severityRank[right.severity] || left.priority - right.priority || left.id.localeCompare(right.id));
  return accepted(envelope, { kind: "health-findings", generatedAt, sourceUpdatedAt, sourceStatus, findings: orderedFindings });
}
function parseConnectionSearchSupplement(payload) {
  const source = record(payload);
  if (!source) return unavailable("\u8FDE\u63A5\u67E5\u8BE2\u8FD4\u56DE\u4E0D\u662F\u5BF9\u8C61");
  const envelope = strictEnvelope(source, "connection-search");
  if (!envelope) return unavailable("\u8FDE\u63A5\u67E5\u8BE2 envelope \u4E0D\u7B26\u5408\u53EA\u8BFB\u8BC1\u636E\u5951\u7EA6");
  if (envelope.coverage !== "bounded-sample" || envelope.source !== "routeros-ssh") return unavailable("\u8FDE\u63A5\u67E5\u8BE2\u6765\u6E90\u6216\u8986\u76D6\u7C7B\u578B\u4E0D\u7B26\u5408\u6709\u754C\u91C7\u6837\u5951\u7EA6");
  const connectionStatusValid = envelope.evidenceMode === "current" ? ["ok", "degraded"].includes(envelope.sourceStatus) : envelope.evidenceMode === "historical" ? envelope.sourceStatus === "degraded" : ["failed", "unknown"].includes(envelope.sourceStatus);
  if (!connectionStatusValid) return unavailable("\u8FDE\u63A5\u67E5\u8BE2\u6765\u6E90\u72B6\u6001\u4E0E\u8BC1\u636E\u6A21\u5F0F\u4E0D\u4E00\u81F4");
  if (envelope.evidenceMode === "unavailable") return unavailableEnvelope(envelope, "\u8FDE\u63A5\u67E5\u8BE2\u8BC1\u636E\u4E0D\u53EF\u7528");
  const targetIp = string(source.targetIp);
  const limit = nonNegativeInteger(source.limit);
  const matchCount = nonNegativeInteger(source.matchCount);
  const capture = record(source.capture);
  const sourceRows = rows(source.rows);
  if (!targetIp || !isIpLike(targetIp) || limit === null || limit < 1 || limit > 50 || matchCount === null || !capture || !sourceRows || matchCount !== sourceRows.length || sourceRows.length > limit || typeof capture.truncatedByRows !== "boolean" || typeof capture.truncatedByBytes !== "boolean" || capture.timedOut !== null && typeof capture.timedOut !== "boolean" || typeof capture.incompleteTransport !== "boolean") return unavailable("\u8FDE\u63A5\u67E5\u8BE2\u8FB9\u754C\u6216\u884C\u96C6\u4E0D\u7B26\u5408\u5951\u7EA6");
  const parsedRows = sourceRows.map((value) => {
    const row = record(value);
    if (!row) return null;
    const srcIp = boundedString(row.srcIp, 45);
    const dstIp = boundedString(row.dstIp, 45);
    const protocol = boundedString(row.protocol, 32);
    const timeout = boundedString(row.timeout, 64);
    const origRateBps = nullableNonNegativeInteger(row.origRateBps);
    const replRateBps = nullableNonNegativeInteger(row.replRateBps);
    return srcIp && dstIp && protocol && timeout && origRateBps !== void 0 && replRateBps !== void 0 && isIpLike(srcIp) && isIpLike(dstIp) ? { srcIp, dstIp, protocol, timeout, origRateBps, replRateBps } : null;
  });
  if (parsedRows.some((row) => row === null)) return unavailable("\u8FDE\u63A5\u67E5\u8BE2\u884C\u4E0D\u7B26\u5408\u5951\u7EA6");
  return accepted(envelope, {
    kind: "connection-search",
    targetIp,
    limit,
    matchCount,
    capture: { truncatedByRows: capture.truncatedByRows, truncatedByBytes: capture.truncatedByBytes, timedOut: capture.timedOut, incompleteTransport: capture.incompleteTransport },
    rows: parsedRows
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  isExplicitIpQuery,
  parseConnectionSearchSupplement,
  parseDnsStaticSupplement,
  parseHealthFindingSupplement
});
