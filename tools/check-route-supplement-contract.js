/* eslint-disable no-new-func */
const assert = require("node:assert/strict");
const path = require("node:path");
const esbuild = require("esbuild");

function loadSchema() {
  const source = esbuild.buildSync({
    entryPoints: [path.join(__dirname, "..", "src", "panel-framework", "sections", "routeSupplementSchema.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
  }).outputFiles[0].text;
  const module = { exports: {} };
  new Function("module", "exports", source)(module, module.exports);
  return module.exports;
}

function loadTypeScriptModule(relativePath) {
  const source = esbuild.buildSync({
    entryPoints: [path.join(__dirname, "..", relativePath)],
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
  }).outputFiles[0].text;
  const module = { exports: {} };
  new Function("module", "exports", source)(module, module.exports);
  return module.exports;
}

const schema = loadSchema();
const dnsRows = (count, start = 0) => Array.from({ length: count }, (_, index) => ({
  name: `host-${start + index}.example`,
  type: "A",
  value: `192.0.2.${(start + index) % 250 + 1}`,
  ttl: "1h",
  comment: "",
  disabled: false,
}));
const dns = {
  schemaVersion: 1, readOnly: true, kind: "dns-static",
  evidenceMode: "current", generatedAt: "2026-08-12T01:02:04Z", observedAt: "2026-08-12T01:02:03Z", sourceStatus: "ok", source: "rest-live", coverage: "page",
  revision: "a".repeat(64),
  totalCount: 52, offset: 0, limit: 50, visibleRuleCount: 50,
  page: { offset: 0, pageSize: 50, returnedCount: 50, totalCount: 52, revision: "a".repeat(64), maxPageSize: 50, maxVisibleRows: 1000, maxVisiblePages: 20 },
  rows: dnsRows(50),
};
assert.equal(schema.parseDnsStaticSupplement(dns).data.coverage, "page");
const cachedDnsPage = {
  ...dns,
  evidenceMode: "historical",
  generatedAt: "2026-08-12T01:03:04Z",
  observedAt: "2026-08-12T00:58:03Z",
  sourceStatus: "degraded",
  source: "rest-cache",
  offset: 50,
  visibleRuleCount: 2,
  rows: dnsRows(2, 50),
  page: { ...dns.page, offset: 50, returnedCount: 2 },
};
assert.deepEqual(
  {
    parseStatus: schema.parseDnsStaticSupplement(cachedDnsPage).parseStatus,
    evidenceMode: schema.parseDnsStaticSupplement(cachedDnsPage).evidenceMode,
    source: schema.parseDnsStaticSupplement(cachedDnsPage).source,
    coverage: schema.parseDnsStaticSupplement(cachedDnsPage).coverage,
  },
  { parseStatus: "accepted", evidenceMode: "historical", source: "rest-cache", coverage: "page" },
  "page 2 may be a validated historical REST cache page without becoming current",
);
assert.deepEqual(
  {
    parseStatus: schema.parseDnsStaticSupplement(dns).parseStatus,
    generatedAt: schema.parseDnsStaticSupplement(dns).generatedAt,
    sourceStatus: schema.parseDnsStaticSupplement(dns).sourceStatus,
    coverage: schema.parseDnsStaticSupplement(dns).coverage,
  },
  { parseStatus: "accepted", generatedAt: dns.generatedAt, sourceStatus: "ok", coverage: "page" },
  "accepted envelope metadata must survive parsing",
);
const completeDns = { ...dns, totalCount: 2, visibleRuleCount: 2, rows: dnsRows(2), coverage: "complete", page: { ...dns.page, returnedCount: 2, totalCount: 2 } };
assert.equal(schema.parseDnsStaticSupplement(completeDns).data.coverage, "complete");
const emptyDns = { ...dns, totalCount: 0, visibleRuleCount: 0, rows: [], coverage: "complete", page: { ...dns.page, returnedCount: 0, totalCount: 0 } };
assert.equal(schema.parseDnsStaticSupplement(emptyDns).data.coverage, "complete", "empty DNS page remains an observed empty result");
assert.equal(schema.parseDnsStaticSupplement({ ...dns, source: "ssh-preview", coverage: "complete" }).evidenceMode, "unavailable", "preview may not claim complete inventory");
assert.equal(schema.parseDnsStaticSupplement({ ...dns, coverage: "preview" }).parseStatus, "malformed", "live REST pages may only claim page or verified complete coverage");
assert.equal(schema.parseDnsStaticSupplement({ ...cachedDnsPage, coverage: "bounded-sample" }).parseStatus, "malformed", "cached REST pages may only claim page coverage");
assert.equal(schema.parseDnsStaticSupplement({ ...dns, schemaVersion: 2 }).evidenceMode, "unavailable", "unknown envelope version must reject");
assert.equal(schema.parseDnsStaticSupplement({ ...dns, readOnly: false }).evidenceMode, "unavailable", "write-capable envelope must reject");
assert.equal(schema.parseDnsStaticSupplement({ ...dns, kind: "health-findings" }).evidenceMode, "unavailable", "wrong endpoint kind must reject");
assert.equal(schema.parseDnsStaticSupplement({ ...dns, kind: "health-findings" }).parseStatus, "malformed");
assert.equal(schema.parseDnsStaticSupplement({ ...dns, page: { ...dns.page, returnedCount: 1 } }).parseStatus, "malformed", "DNS page returnedCount must equal parsed rows");
assert.equal(schema.parseDnsStaticSupplement({ ...dns, page: { ...dns.page, revision: "b".repeat(64) } }).parseStatus, "malformed", "DNS page and root revision must be the same generation");
assert.equal(schema.parseDnsStaticSupplement({ ...dns, page: { ...dns.page, offset: 50 } }).parseStatus, "malformed", "DNS page offset must match root pagination");
const unavailableDns = { ...dns, evidenceMode: "unavailable", observedAt: null, source: "unavailable", sourceStatus: "unknown", coverage: "unavailable", revision: null, totalCount: 0, visibleRuleCount: 0, rows: [], page: { ...dns.page, returnedCount: 0, totalCount: 0, revision: null } };
assert.equal(schema.parseDnsStaticSupplement(unavailableDns).parseStatus, "unavailable", "valid unavailable envelope is not malformed");
assert.equal(schema.parseDnsStaticSupplement({ ...dns, visibleRuleCount: 1 }).evidenceMode, "unavailable", "DNS count mismatch must reject");
assert.equal(schema.parseDnsStaticSupplement({ ...dns, rows: [{ ...dns.rows[0], ttl: 0 }] }).evidenceMode, "unavailable", "DNS malformed row must reject");

const health = {
  schemaVersion: 1, readOnly: true, kind: "health-findings", evidenceMode: "current", source: "snapshot-health-analysis", coverage: "bounded-sample",
  generatedAt: "2026-08-12T01:02:03Z", observedAt: "2026-08-12T01:02:00+00:00", sourceUpdatedAt: "2026-08-12T01:02:00+00:00", sourceStatus: "ok",
  findings: [{ id: "collector.rest", severity: "warning", domain: "collector", title: "REST delayed", summary: "slow", source: "snapshot.meta", priority: 1, evidence: [{ label: "lastErrorAt", value: "2026-08-12T01:00:00Z" }] }],
};
assert.equal(schema.parseHealthFindingSupplement(health).data.findings.length, 1);
assert.equal(schema.parseHealthFindingSupplement(health).data.kind, "health-findings", "health supplement must retain its endpoint kind");
assert.equal(schema.parseHealthFindingSupplement({ ...health, findings: [] }).data.findings.length, 0, "empty findings remain observed, not unavailable");
assert.equal(schema.parseHealthFindingSupplement({ ...health, generatedAt: "2026-08-12 01:02:03" }).evidenceMode, "unavailable", "timezone-less health timestamps must downgrade");
assert.equal(schema.parseHealthFindingSupplement({ ...health, sourceUpdatedAt: undefined }).evidenceMode, "unavailable", "missing source timestamp must downgrade");
assert.equal(schema.parseHealthFindingSupplement({ ...health, observedAt: "2026-08-12T00:59:00Z" }).evidenceMode, "unavailable", "health observedAt must identify the source evidence time");
assert.equal(schema.parseHealthFindingSupplement({ ...health, evidenceMode: "historical", sourceStatus: "degraded" }).evidenceMode, "historical", "historical health evidence must remain degraded, not current");
assert.equal(schema.parseHealthFindingSupplement({ ...health, kind: "security" }).evidenceMode, "unavailable", "health endpoint kind must be exact");
assert.equal(schema.parseHealthFindingSupplement({ ...health, sourceStatus: "pending" }).parseStatus, "malformed", "sourceStatus vocabulary must be closed");
assert.equal(schema.parseHealthFindingSupplement({ ...health, sourceStatus: "failed" }).parseStatus, "malformed", "current health evidence cannot have failed source status");
const unavailableHealth = { ...health, evidenceMode: "unavailable", observedAt: null, sourceUpdatedAt: null, sourceStatus: "failed", coverage: "unavailable", source: "snapshot-health-analysis", findings: [] };
assert.equal(schema.parseHealthFindingSupplement(unavailableHealth).parseStatus, "unavailable", "health unavailable may retain its truthful analysis source");
assert.equal(schema.parseHealthFindingSupplement({ ...unavailableHealth, sourceStatus: "unknown" }).parseStatus, "unavailable", "unknown is also a valid unavailable health source status");
assert.equal(schema.parseHealthFindingSupplement({ ...health, findings: [{ ...health.findings[0], priority: -1 }] }).evidenceMode, "unavailable", "malformed health finding must reject");
assert.equal(schema.parseHealthFindingSupplement({ ...health, findings: Array.from({ length: 21 }, (_, index) => ({ ...health.findings[0], id: `finding-${index}` })) }).parseStatus, "malformed", "health findings must be capped at 20");
assert.equal(schema.parseHealthFindingSupplement({ ...health, findings: [{ ...health.findings[0], evidence: Array.from({ length: 7 }, (_, index) => ({ label: `fact-${index}`, value: index })) }] }).parseStatus, "malformed", "finding facts must be capped at 6");
assert.equal(schema.parseHealthFindingSupplement({ ...health, findings: [{ ...health.findings[0], title: "x".repeat(201) }] }).parseStatus, "malformed", "finding text must be bounded");
const rankedHealth = schema.parseHealthFindingSupplement({ ...health, findings: [health.findings[0], { ...health.findings[0], id: "security.critical", severity: "critical", priority: 9 }] });
assert.deepEqual(rankedHealth.data.findings.map((finding) => finding.id), ["security.critical", "collector.rest"], "highest severity must be the first actionable health object");
assert.equal(schema.parseHealthFindingSupplement({ ...health, findings: [health.findings[0], { ...health.findings[0] }] }).parseStatus, "malformed", "finding IDs must be stable and unique");

const connection = {
  schemaVersion: 1, readOnly: true, kind: "connection-search", evidenceMode: "current", generatedAt: "2026-08-12T01:02:04Z", observedAt: "2026-08-12T01:02:03Z", sourceStatus: "degraded", coverage: "bounded-sample", source: "routeros-ssh",
  targetIp: "192.0.2.4", limit: 40, matchCount: 1, transport: "ssh",
  capture: { truncatedByRows: false, truncatedByBytes: false, timedOut: null, incompleteTransport: true },
  rows: [{ srcIp: "192.0.2.4", dstIp: "198.51.100.7", protocol: "tcp", timeout: "1m", origRateBps: 0, replRateBps: null }],
};
assert.equal(schema.parseConnectionSearchSupplement(connection).data.kind, "connection-search");
assert.equal(schema.parseConnectionSearchSupplement(connection).data.rows[0].origRateBps, 0, "observed numeric zero remains valid");
assert.equal(schema.parseConnectionSearchSupplement(connection).data.rows[0].replRateBps, null, "missing rate remains unavailable");
assert.equal(schema.parseConnectionSearchSupplement({ ...connection, matchCount: 0, rows: [] }).data.rows.length, 0, "empty connection result remains observed");
assert.equal(schema.parseConnectionSearchSupplement({ ...connection, evidenceMode: "historical" }).evidenceMode, "historical", "HTTP 200 historical evidence must not become current");
assert.equal(schema.parseConnectionSearchSupplement({ ...connection, observedAt: "2026-08-12 01:02:03" }).evidenceMode, "unavailable", "HTTP 200 without timezone must downgrade");
assert.equal(schema.parseConnectionSearchSupplement({ ...connection, matchCount: 2 }).evidenceMode, "unavailable", "count mismatch must reject");
assert.equal(schema.parseConnectionSearchSupplement(connection).data.capture.timedOut, null, "honest unknown timeout remains unknown");
assert.equal(schema.parseConnectionSearchSupplement(connection).data.capture.incompleteTransport, true);
assert.equal(schema.parseConnectionSearchSupplement({ ...connection, capture: { truncatedByRows: false, truncatedByBytes: false, timedOut: null } }).evidenceMode, "unavailable", "incomplete capture must reject");
assert.equal(schema.parseConnectionSearchSupplement({ ...connection, rows: [{ ...connection.rows[0], protocol: "x".repeat(33) }] }).parseStatus, "malformed", "connection row text must be bounded");
assert.equal(schema.parseConnectionSearchSupplement({ ...connection, limit: 1, matchCount: 2, rows: [connection.rows[0], connection.rows[0]] }).parseStatus, "malformed", "connection rows may not exceed the requested limit");
const unavailableConnection = { ...connection, evidenceMode: "unavailable", observedAt: null, sourceStatus: "failed" };
assert.equal(schema.parseConnectionSearchSupplement(unavailableConnection).parseStatus, "unavailable", "a valid unavailable bounded SSH sample is not malformed");
assert.equal(schema.parseConnectionSearchSupplement({ ...unavailableConnection, coverage: "unavailable" }).parseStatus, "malformed", "connection coverage remains bounded-sample even when capture evidence is unavailable");
assert.equal(schema.parseConnectionSearchSupplement({ ...unavailableConnection, source: "unavailable" }).parseStatus, "malformed", "connection source remains routeros-ssh");
assert.equal(schema.isExplicitIpQuery("192.0.2.4"), true);
assert.equal(schema.isExplicitIpQuery("2001:db8::1"), true);
assert.equal(schema.isExplicitIpQuery("::1"), true);
assert.equal(schema.isExplicitIpQuery("2001:db8:0:0:0:0:0:1"), false, "non-canonical expanded IPv6 must be rejected");
assert.equal(schema.isExplicitIpQuery("example.com"), false);
assert.equal(schema.isExplicitIpQuery("192.0.2.4 trailing"), false);
for (const invalid of [":", ":::", "1::2::3", "999.0.0.1", "1.2.3.999", "192.0.2.4:80", "[2001:db8::1]", "2001:db8::1/64", "01.2.3.4", "2001:0db8::1", "2001:DB8::1"]) {
  assert.equal(schema.isExplicitIpQuery(invalid), false, `${invalid} must not be accepted as a canonical IP query`);
}

const stateModel = loadTypeScriptModule("src/panel-framework/sections/routeSupplementState.ts");
assert.deepEqual(stateModel.dnsPageRequest(1), { page: 1, offset: 0, limit: 50 });
assert.deepEqual(stateModel.dnsPageRequest(20), { page: 20, offset: 950, limit: 50 });
assert.equal(stateModel.dnsPageRequest(21), null, "DNS browsing must stop at 20 pages / 1000 rows");
assert.equal(stateModel.dnsPageUrl(stateModel.dnsPageRequest(2)), "/api/dns-static?offset=50&limit=50");
const dnsHistory = stateModel.createDnsSupplementHistory(2);
assert.deepEqual(stateModel.dnsRequestForRoute("dns4", null), { page: 1, offset: 0, limit: 50 }, "first DNS route entry must request page 1 without creating history");
assert.deepEqual(stateModel.dnsRequestForRoute("dns4", dnsHistory), { page: 2, offset: 50, limit: 50 });
assert.equal(stateModel.dnsRequestForRoute("connections", dnsHistory), null);
assert.deepEqual(
  stateModel.parseDnsPageOutOfRange({ code: "dns_page_out_of_range", totalCount: 1, lastPage: 1, revision: "f".repeat(64) }, 2),
  { totalCount: 1, lastPage: 1, revision: "f".repeat(64) },
  "a strict 409 envelope may redirect the current history entry to the freshly observed last page",
);
assert.equal(stateModel.parseDnsPageOutOfRange({ code: "dns_page_out_of_range", totalCount: 1, lastPage: 1, revision: "short" }, 2), null, "DNS 409 recovery requires a generation revision");
assert.equal(stateModel.parseDnsPageOutOfRange({ code: "dns_page_out_of_range", totalCount: 52, lastPage: 2, revision: "f".repeat(64) }, 2), null, "DNS 409 recovery must move backwards rather than refetch the same page forever");
assert.deepEqual(stateModel.parseRouteSupplementHistory({ panelRouteSupplement: dnsHistory }, "dns4"), dnsHistory, "DNS page must restore from Back/Forward history");
assert.equal(stateModel.parseRouteSupplementHistory({ panelRouteSupplement: dnsHistory }, "connections"), null, "route switch must not replay another route's request");
const connectionHistory = stateModel.createConnectionSupplementHistory("2001:db8::1");
assert.deepEqual(stateModel.parseRouteSupplementHistory({ panelRouteSupplement: connectionHistory }, "connections"), connectionHistory, "submitted IP must restore from Back/Forward history");
const connectionRowId = stateModel.connectionSupplementRowId(connection.rows[0], 0);
const selectedConnectionHistory = stateModel.createConnectionSupplementHistory("2001:db8::1", connectionRowId);
assert.deepEqual(stateModel.parseRouteSupplementHistory({ panelRouteSupplement: selectedConnectionHistory }, "connections"), selectedConnectionHistory, "selected connection detail must restore from Forward history");
assert.equal(stateModel.routeSupplementRequestKey("connections", connectionHistory), stateModel.routeSupplementRequestKey("connections", selectedConnectionHistory), "opening connection detail must not refetch the same bounded query");
assert.match(connectionRowId, /^connection-1-[0-9a-f]{8}$/, "connection row IDs must be stable bounded selectors");
assert.equal(stateModel.supplementalRateOrigin(null), "unavailable");
assert.equal(stateModel.supplementalRateOrigin(0), "observed-zero");
assert.equal(stateModel.supplementalRateOrigin(1), "observed");
assert.equal(stateModel.routeSupplementSourceLabel("routeros-ssh"), "RouterOS SSH");
assert.equal(stateModel.routeSupplementSourceLabel("snapshot-health-analysis"), "快照健康分析");
assert.equal(stateModel.routeSupplementCoverageLabel("bounded-sample"), "有界样本");
assert.equal(stateModel.routeSupplementSeverityLabel("critical"), "严重");
assert.equal(stateModel.routeSupplementDomainLabel("interfaces"), "接口");
assert.equal(stateModel.createConnectionSupplementHistory("1::2::3"), null, "invalid IP cannot become a history-backed request");
assert.equal(stateModel.supplementalUiState("loading", null), "loading");
assert.equal(stateModel.supplementalUiState("error", null), "error");
assert.equal(stateModel.supplementalUiState("success", schema.parseDnsStaticSupplement({ ...dns, kind: "wrong" })), "malformed");
assert.equal(stateModel.supplementalUiState("success", schema.parseDnsStaticSupplement(emptyDns)), "empty");
assert.equal(stateModel.supplementalUiState("success", schema.parseDnsStaticSupplement(dns)), "ready");
assert.equal(stateModel.supplementalUiState("success", schema.parseDnsStaticSupplement(unavailableDns)), "unavailable", "valid unavailable evidence is distinct from malformed/error");
assert.deepEqual(
  stateModel.supplementalRequestFailure("connection_search_in_flight", 429, 1),
  { errorCode: "connection_search_in_flight", errorStatus: 429, retryAfterSeconds: 1, message: "已有连接查询正在执行；保留目标，可再次重试。" },
  "single-flight and rate-limit failures must not share one UI state",
);
assert.deepEqual(
  stateModel.supplementalRequestFailure("connection_search_rate_limited", 429, 9),
  { errorCode: "connection_search_rate_limited", errorStatus: 429, retryAfterSeconds: 9, message: "连接查询过于频繁；保留目标，9 秒后可重试。" },
  "rate-limit state must preserve a bounded retry delay",
);

const hookSource = require("node:fs").readFileSync(path.join(__dirname, "..", "src", "panel-framework", "sections", "useRouteSupplementEvidence.ts"), "utf8");
assert.doesNotMatch(hookSource, /setTimeout\(run, 300\)/, "connection lookup must not fire from typing debounce");
assert.match(hookSource, /controller\.abort\(\)/, "supplement requests must abort on route/query change");
assert.match(hookSource, /!controller\.signal\.aborted/, "aborted/racing responses must not replace the current route state");
const syncStart = hookSource.indexOf("const sync =");
const syncInvalidation = hookSource.indexOf("sequenceRef.current += 1", syncStart);
const syncStateUpdate = hookSource.indexOf("setCommand", syncStart);
assert.ok(syncStart >= 0 && syncInvalidation > syncStart && syncInvalidation < syncStateUpdate, "popstate must synchronously invalidate the prior response before updating state");
const commitStart = hookSource.indexOf("const commit =");
const commitInvalidation = hookSource.indexOf("sequenceRef.current += 1", commitStart);
const commitStateUpdate = hookSource.indexOf("setCommand", commitStart);
assert.ok(commitStart >= 0 && commitInvalidation > commitStart && commitInvalidation < commitStateUpdate, "explicit submit/page commit must synchronously invalidate the prior response before updating state");
assert.match(hookSource, /error instanceof PanelApiError/, "supplement errors must retain only typed PanelApiError metadata");
assert.match(hookSource, /window\.history\.replaceState/, "DNS out-of-range recovery must replace, not push, the current page history");
assert.match(hookSource, /parseDnsPageOutOfRange/, "DNS 409 recovery must validate the backend's bounded generation metadata");
assert.match(hookSource, /window\.history\.back\(\)/, "closing a selected connection must detach its detail through browser history");
assert.match(hookSource, /const clearConnectionQuery = useCallback/, "accepted connection queries must expose an explicit return to the snapshot collection");
assert.match(hookSource, /delete historyState\.panelRouteSupplement/, "clearing a connection query must remove its supplemental history command");
assert.match(hookSource, /route === "dns4"/, "DNS supplemental request must be route-scoped");
assert.match(hookSource, /route === "security"/, "security supplemental request must be route-scoped");
const apiSource = require("node:fs").readFileSync(path.join(__dirname, "..", "src", "panel-framework", "runtime", "panelApi.ts"), "utf8");
assert.match(apiSource, /limit: "40"/, "connection request must remain bounded");
assert.match(apiSource, /readonly retryAfterSeconds:/, "PanelApiError must preserve a safe retry delay");
assert.match(apiSource, /retryAfterSeconds/, "HTTP error parsing must retain the backend retry field");
const apiModel = loadTypeScriptModule("src/panel-framework/runtime/panelApi.ts");
const rateLimitError = new apiModel.PanelApiError("safe", 429, "connection_search_rate_limited", null, 7);
assert.deepEqual({ status: rateLimitError.status, code: rateLimitError.code, retryAfterSeconds: rateLimitError.retryAfterSeconds }, { status: 429, code: "connection_search_rate_limited", retryAfterSeconds: 7 });
const unsafeError = new apiModel.PanelApiError("unsafe", 900, "bad-code!", null, 99_999);
assert.deepEqual({ status: unsafeError.status, code: unsafeError.code, retryAfterSeconds: unsafeError.retryAfterSeconds }, { status: 0, code: "request_failed", retryAfterSeconds: null }, "unsafe error metadata must not reach the route UI");
const mobileViewSource = require("node:fs").readFileSync(path.join(__dirname, "..", "src", "panel-framework", "sections", "MobileRouteSupplement.tsx"), "utf8");
const desktopViewSource = require("node:fs").readFileSync(path.join(__dirname, "..", "src", "panel-framework", "sections", "DesktopRouteSupplement.tsx"), "utf8");
assert.match(mobileViewSource, /className="mrs-/, "mobile supplement must own a mobile presentation tree");
assert.doesNotMatch(mobileViewSource, /className="ddrs-|className="mdw-/, "mobile supplement must not borrow desktop or legacy mdw presentation classes");
assert.match(desktopViewSource, /className="ddrs-/, "desktop supplement must own a desktop presentation tree");
assert.doesNotMatch(desktopViewSource, /className="mdw-|className="mrs-/, "desktop supplement must not borrow mobile presentation classes");
assert.match(mobileViewSource, /"data-supplemental-surface": route/, "mobile runtime surface must be the semantic route, not the presentation type");
assert.match(desktopViewSource, /"data-supplemental-surface": route/, "desktop runtime surface must be the semantic route, not the presentation type");
assert.match(mobileViewSource, /"data-supplemental-presentation": "mobile"/, "mobile presentation identity must remain separately queryable");
assert.match(desktopViewSource, /"data-supplemental-presentation": "desktop"/, "desktop presentation identity must remain separately queryable");
assert.match(mobileViewSource, /data-supplemental-submit="connections"/);
assert.match(desktopViewSource, /data-supplemental-submit="connections"/);
assert.match(mobileViewSource, /data-supplemental-target-input="connections"/);
assert.match(desktopViewSource, /data-supplemental-target-input="connections"/);
assert.match(mobileViewSource, /data-supplemental-retry/);
assert.match(desktopViewSource, /data-supplemental-retry/);
assert.match(mobileViewSource, /data-supplemental-row-id=/, "mobile connection rows must expose an actionable row selector");
assert.match(desktopViewSource, /data-supplemental-row-id=/, "desktop connection rows must expose an actionable row selector");
assert.equal((mobileViewSource.match(/data-supplemental-object-detail=/g) || []).length, 1, "mobile object-detail hook must belong only to the selected detail surface");
assert.equal((desktopViewSource.match(/data-supplemental-object-detail=/g) || []).length, 1, "desktop object-detail hook must belong only to the selected detail surface");
assert.match(mobileViewSource, /supplementalRateOrigin\([^)]*origRateBps\)/, "mobile rate origin must describe evidence semantics rather than a field name");
assert.match(desktopViewSource, /supplementalRateOrigin\([^)]*origRateBps\)/, "desktop rate origin must describe evidence semantics rather than a field name");
assert.match(mobileViewSource, /state\.openConnection/, "mobile row activation must push a selected detail state");
assert.match(desktopViewSource, /state\.openConnection/, "desktop row activation must push a selected detail state");
assert.match(mobileViewSource, /state\.closeConnection/, "mobile detail must expose a history-backed close action");
assert.match(desktopViewSource, /state\.closeConnection/, "desktop detail must expose a history-backed close action");
assert.match(mobileViewSource, /aria-controls=/);
assert.match(desktopViewSource, /aria-controls=/);
assert.match(mobileViewSource, /setInput\(state\.query \|\| ""\)/, "mobile Back/Forward must also clear a restored empty query");
assert.match(desktopViewSource, /setInput\(state\.query \|\| ""\)/, "desktop Back/Forward must also clear a restored empty query");
assert.match(mobileViewSource, /state\.uiState \|\| "unavailable"/, "mobile idle state must not pretend supplemental evidence is ready");
assert.match(desktopViewSource, /state\.uiState \|\| "unavailable"/, "desktop idle state must not pretend supplemental evidence is ready");
assert.match(mobileViewSource, /disabled=\{state\.retryBlocked\}/, "mobile rate-limit retry must be disabled until its delay expires");
assert.match(desktopViewSource, /disabled=\{state\.retryBlocked\}/, "desktop rate-limit retry must be disabled until its delay expires");
assert.match(mobileViewSource, /data\.capture\.incompleteTransport/, "mobile capture summary must disclose an incomplete transport");
assert.match(desktopViewSource, /data\.capture\.incompleteTransport/, "desktop capture summary must disclose an incomplete transport");
assert.equal((mobileViewSource.match(/aria-live=/g) || []).length, 1, "mobile success results must not be one large live region");
assert.equal((desktopViewSource.match(/aria-live=/g) || []).length, 1, "desktop success results must not be one large live region");
assert.match(mobileViewSource, /data-supplemental-live-status[^>]*>\{liveStatus\}/, "mobile supplement must expose one stable success/error announcement owner");
assert.match(desktopViewSource, /data-supplemental-live-status[^>]*>\{liveStatus\}/, "desktop supplement must expose one stable success/error announcement owner");
assert.match(mobileViewSource, /aria-atomic="true"/, "mobile supplemental completion announcement must be atomic");
assert.match(desktopViewSource, /aria-atomic="true"/, "desktop supplemental completion announcement must be atomic");
assert.match(mobileViewSource, /aria-busy=\{state\.requestStatus === "loading"\}/, "mobile results must disclose the in-flight state without making the full result a live region");
assert.match(desktopViewSource, /aria-busy=\{state\.requestStatus === "loading"\}/, "desktop results must disclose the in-flight state without making the full result a live region");
assert.equal((mobileViewSource.match(/\{pager\}/g) || []).length, 1, "mobile DNS pagination must have one unambiguous reachable owner");
assert.equal((desktopViewSource.match(/\{pager\}/g) || []).length, 1, "desktop DNS pagination must have one unambiguous reachable owner");
assert.match(mobileViewSource, /mrs-dns-list[\s\S]*?<header>[\s\S]*?\{pager\}<\/header>/, "mobile DNS pagination must be reachable from the initial result heading rather than only after the final row");
assert.match(mobileViewSource, /<time dateTime=\{result\?\.observedAt \|\| undefined\}>\{evidenceTime\}<\/time>/, "mobile evidence boundary must carry a visible localized time and raw RFC3339 datetime");
assert.match(desktopViewSource, /ddrs-evidencebar[\s\S]*?<time dateTime=\{result\?\.observedAt \|\| undefined\}>\{evidenceTime\}<\/time>/, "desktop default results must carry a visible localized time and raw RFC3339 datetime");
assert.match(mobileViewSource, /className="mrs-connection-rate"/, "tablet and landscape connection rows must expose one comparable rate field");
assert.match(mobileViewSource, />全局健康发现</, "mobile security supplement must distinguish global health from the security object collection");
assert.match(desktopViewSource, />全局健康发现</, "desktop security supplement must distinguish global health from the security object collection");
for (const source of [mobileViewSource, desktopViewSource]) {
  for (const selector of ["data-supplemental-surface", "data-supplemental-request", "data-supplemental-state", "data-supplemental-evidence", "data-supplemental-source", "data-supplemental-coverage", "data-supplemental-observed-at", "data-supplemental-target", "data-supplemental-offset", "data-supplemental-page-size", "data-supplemental-total", "data-supplemental-connection-row", "data-supplemental-rate-origin", "data-supplemental-object-detail"]) {
    assert.match(source, new RegExp(selector), `${selector} must be exposed by both presentation owners`);
  }
}
for (const source of [mobileViewSource, desktopViewSource]) {
  for (const selector of ["data-supplemental-state", "data-supplemental-evidence", "data-supplemental-query", "data-supplemental-kind", "data-supplemental-source", "data-supplemental-coverage", "data-supplemental-page", "data-supplemental-total"]) {
    assert.match(source, new RegExp(selector), `${selector} must be stable on both presentation owners`);
  }
}
const mobileCss = require("node:fs").readFileSync(path.join(__dirname, "..", "src", "panel-framework", "mobile-pulse", "styles", "mobilePulseRoute.css"), "utf8");
const desktopCss = require("node:fs").readFileSync(path.join(__dirname, "..", "src", "panel-framework", "sections", "desktop-domain.css"), "utf8");
const mobileOwnerSource = require("node:fs").readFileSync(path.join(__dirname, "..", "src", "panel-framework", "mobile", "MobilePanelApp.tsx"), "utf8");
const mobileRouteSource = require("node:fs").readFileSync(path.join(__dirname, "..", "src", "panel-framework", "mobile-pulse", "MobilePulseRouteSurface.tsx"), "utf8");
const desktopOwnerSource = require("node:fs").readFileSync(path.join(__dirname, "..", "src", "panel-framework", "sections", "DesktopDomainWorkspace.tsx"), "utf8");
assert.match(mobileOwnerSource, /<MobileRouteSupplement\b/, "current mobile app must mount its dedicated supplement owner");
assert.match(mobileOwnerSource, /useRouteSupplementEvidence/, "current mobile app must own supplemental request state");
assert.doesNotMatch(mobileOwnerSource, /<RouteSupplementEvidence\b|\/RouteSupplementEvidence["']/, "current mobile app must not mount a shared supplemental presentation tree");
assert.match(desktopOwnerSource, /DesktopRouteSupplement/, "desktop workspace must mount its dedicated owner");
assert.doesNotMatch(desktopOwnerSource, /<RouteSupplementEvidence\b|\/RouteSupplementEvidence["']/, "desktop workspace must not mount a shared supplemental presentation tree");
for (const [surface, source] of [["mobile", mobileOwnerSource], ["desktop", desktopOwnerSource]]) {
  assert.match(source, /supplementOwnsDnsList/, `${surface} accepted DNS supplement must own its one visible collection`);
  assert.match(source, /supplementOwnsConnectionList/, `${surface} accepted connection query must own its one visible collection`);
}
assert.match(mobileRouteSource, /data-origin-route/, "current Origin route surface must expose its dedicated owner marker");
assert.match(mobileRouteSource, /!supplementOwnsCollection/, "current Origin route surface must hide the snapshot collection while an accepted supplement owns it");
assert.match(desktopOwnerSource, /!supplementOwnsCollection/, "desktop snapshot collection must remain fallback-only while an accepted supplement owns it");
assert.match(mobileCss, /\.origin-route\b/, "Origin route surface must have an owned visual system");
assert.doesNotMatch(mobileCss, /mobile-ops|mop-/, "Origin route stylesheet must not retain mobile-ops presentation selectors");
assert.match(mobileCss, /min-height:\s*44px/, "Origin route controls must preserve a 44px target");
assert.match(mobileCss, /\.origin-search button\s*\{[^}]*\bheight:\s*44px/, "Origin clear-query control must not regress below the 44px touch target");
assert.match(mobileCss, /@media[^{}]*min-width:\s*600px[\s\S]*?\.origin-route/, "Origin tablet route layout must be capability-specific");
assert.match(desktopCss, /\.ddrs-shell\b/, "desktop supplement must have an owned visual system");
assert.doesNotMatch(desktopCss, /\.mdw-/, "desktop supplement stylesheet must not borrow mobile workspace classes");
assert.match(desktopCss, /\.ddrs-query input[\s\S]*?min-height:\s*44px/, "desktop target input must keep a 44px effective hit area");
assert.match(desktopCss, /\.ddrs-query button,[\s\S]*?min-height:\s*44px/, "desktop query, pager and retry controls must keep a 44px effective hit area");
assert.match(desktopCss, /\.ddrs-query \.ddrs-clear-query\s*\{[\s\S]*?min-height:\s*44px/, "desktop clear-query control must not regress below the 44px target");
assert.match(desktopCss, /\.ddrs-findings summary[\s\S]*?min-height:\s*44px/, "desktop finding disclosure must keep a 44px effective hit area");
console.log("route supplement contract PASS: strict REST generations/409 replace, health freshness, canonical connection submit, 429/race state, history-backed detail, semantic rate origins and split presentation ownership");
