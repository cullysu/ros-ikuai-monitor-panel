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

// src/panel-framework/runtime/panelRuntimeSchema.ts
var panelRuntimeSchema_exports = {};
__export(panelRuntimeSchema_exports, {
  parseRouterConnectionTest: () => parseRouterConnectionTest,
  parseRouterLoginBootstrap: () => parseRouterLoginBootstrap,
  parseRouterLoginMutation: () => parseRouterLoginMutation,
  snapshotEvidenceTimestamp: () => snapshotEvidenceTimestamp,
  snapshotHasOperationalEvidence: () => snapshotHasOperationalEvidence,
  snapshotPollSeconds: () => snapshotPollSeconds,
  validatePanelSnapshot: () => validatePanelSnapshot
});
module.exports = __toCommonJS(panelRuntimeSchema_exports);

// src/panel-framework/timeContract.ts
var RFC3339_WITH_TIMEZONE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(?:(Z)|([+-])(\d{2}):(\d{2}))$/;
function parseRfc3339Timestamp(value) {
  if (typeof value !== "string") return null;
  const timestamp = value.trim();
  const match = RFC3339_WITH_TIMEZONE.exec(timestamp);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fractionText, utcMarker, offsetSign, offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetHour = Number(offsetHourText || 0);
  const offsetMinute = Number(offsetMinuteText || 0);
  const milliseconds = Number((fractionText || "").slice(0, 3).padEnd(3, "0"));
  if (year < 1 || hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59) return null;
  const calendar = /* @__PURE__ */ new Date(0);
  calendar.setUTCHours(hour, minute, second, milliseconds);
  calendar.setUTCFullYear(year, month - 1, day);
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day || calendar.getUTCHours() !== hour || calendar.getUTCMinutes() !== minute || calendar.getUTCSeconds() !== second || calendar.getUTCMilliseconds() !== milliseconds) return null;
  const offsetMilliseconds = (offsetHour * 60 + offsetMinute) * 6e4;
  const parsed = calendar.getTime() - (utcMarker ? 0 : offsetSign === "+" ? offsetMilliseconds : -offsetMilliseconds);
  return Number.isFinite(parsed) ? parsed : null;
}
function isRfc3339Timestamp(value) {
  return parseRfc3339Timestamp(value) !== null;
}

// src/panel-framework/runtime/panelRuntimeSchema.ts
var SNAPSHOT_ARRAY_FIELDS = ["interfaces", "pppoe", "wan", "terminals"];
var SNAPSHOT_RECORD_FIELDS = [
  "meta",
  "overview",
  "routes",
  "connections",
  "dns",
  "dhcp",
  "arp",
  "loadBalance",
  "security",
  "logs"
];
var SNAPSHOT_NESTED_RECORD_ARRAY_FIELDS = {
  meta: ["staticEndpointFailures", "realtimeEndpointFailures", "slowRestEndpointFailures", "detailEndpointFailures"],
  routes: ["items", "defaultRoutes", "staticRoutes", "tables"],
  connections: ["active", "topIps", "protocolTop"],
  dhcp: ["leases", "clients", "pools", "servers"],
  arp: ["items", "alerts"],
  loadBalance: ["distribution", "defaultRoutes", "mangleRules", "routingRules"],
  dns: ["forwardRules", "ipv6Nd", "ipv6DhcpClients"],
  security: ["filters", "alerts", "addressLists"],
  logs: ["all", "system", "firewall", "dhcp", "dns"]
};
var SNAPSHOT_RATE_FIELDS = {
  interfaces: ["txRate", "rxRate", "upRate", "downRate"],
  pppoe: ["upRate", "downRate"],
  wan: ["upRate", "downRate"],
  terminals: ["upRate", "downRate"]
};
var CONNECTION_RATE_FIELDS = ["upRate", "downRate", "totalRate", "sessionBytes"];
var MAX_SNAPSHOT_COLLECTION_ROWS = 2e4;
var TIMESTAMP_FIELD = /^(?:observedAt|timestamp|updatedAt|generatedAt|sourceUpdatedAt|cachedAt|lastUsedAt|createdAt|systemTime|.*At|.*Timestamp)$/;
function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}
function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function hasObservedOverviewValue(value) {
  if (!isRecord(value)) return false;
  const stringFields = ["identity", "version", "boardName", "architecture", "uptime", "systemTime"];
  const numberFields = ["cpuLoad", "memoryUsage", "memoryUsedPercent", "diskUsage", "diskUsedPercent", "connectionTotal", "onlineTerminals"];
  return stringFields.some((key) => stringValue(value[key]) !== "") || numberFields.some((key) => finiteNumber(value[key]) !== null);
}
function hasRows(value) {
  return Array.isArray(value) && value.length > 0;
}
function hasNestedRows(value, keys) {
  if (!isRecord(value)) return false;
  return keys.some((key) => hasRows(value[key]));
}
function hasOperationalEvidenceValue(snapshot) {
  if (hasObservedOverviewValue(snapshot.overview)) return true;
  if (SNAPSHOT_ARRAY_FIELDS.some((field) => hasRows(snapshot[field]))) return true;
  if (hasNestedRows(snapshot.routes, ["items", "defaultRoutes", "staticRoutes"])) return true;
  const connections = isRecord(snapshot.connections) ? snapshot.connections : null;
  const connectionTotal = connections ? finiteNumber(connections.total) : null;
  return connectionTotal !== null && connectionTotal >= 0;
}
function validTimestamp(value) {
  return isRfc3339Timestamp(value);
}
function validateSnapshotTree(value, path, issues, depth = 0) {
  if (depth > 8) return;
  if (Array.isArray(value)) {
    if (value.length > MAX_SNAPSHOT_COLLECTION_ROWS) {
      issues.push(`${path || "snapshot"} \u8D85\u8FC7 ${MAX_SNAPSHOT_COLLECTION_ROWS} \u9879\u4E0A\u9650`);
      return;
    }
    value.forEach((item, index) => validateSnapshotTree(item, `${path}[${index}]`, issues, depth + 1));
    return;
  }
  if (!isRecord(value)) return;
  Object.entries(value).forEach(([key, item]) => {
    const nextPath = path ? `${path}.${key}` : key;
    const isLogTime = /^logs\.(?:all|system|firewall|dhcp|dns)\[\d+\]\.time$/.test(nextPath);
    if (!(path === "" && key === "updatedAt") && (TIMESTAMP_FIELD.test(key) || isLogTime) && item !== null && !validTimestamp(item)) {
      issues.push(`${nextPath} \u5FC5\u987B\u662F\u5E26\u65F6\u533A\u7684 RFC 3339 \u65F6\u95F4\u6216 null`);
    }
    validateSnapshotTree(item, nextPath, issues, depth + 1);
  });
}
function validatePercentage(source, key, path, issues) {
  if (!(key in source) || source[key] === null) return;
  const value = finiteNumber(source[key]);
  if (value === null || value < 0 || value > 100) issues.push(`${path}.${key} \u5FC5\u987B\u662F 0\u2013100 \u7684\u6709\u9650\u6570\u503C`);
}
function validateRecordArrayFields(input, issues) {
  for (const [parentKey, fields] of Object.entries(SNAPSHOT_NESTED_RECORD_ARRAY_FIELDS)) {
    const parent = isRecord(input[parentKey]) ? input[parentKey] : null;
    if (!parent) continue;
    for (const field of fields) {
      if (!(field in parent)) continue;
      const value = parent[field];
      if (!Array.isArray(value)) {
        issues.push(`${parentKey}.${field} \u5FC5\u987B\u662F\u6570\u7EC4`);
      } else if (!value.every(isRecord)) {
        issues.push(`${parentKey}.${field} \u6BCF\u4E00\u9879\u5FC5\u987B\u662F\u5BF9\u8C61`);
      }
    }
  }
}
function validateNonnegativeRowNumbers(value, path, fields, issues) {
  if (!Array.isArray(value)) return;
  value.forEach((item, index) => {
    if (!isRecord(item)) return;
    fields.forEach((field) => {
      if (!(field in item) || item[field] === null) return;
      const observed = finiteNumber(item[field]);
      if (observed === null || observed < 0) issues.push(`${path}[${index}].${field} \u5FC5\u987B\u662F\u975E\u8D1F\u6709\u9650\u6570\u503C\u6216 null`);
    });
  });
}
function validateAtomicTrafficSamples(overview, issues) {
  const history = isRecord(overview.history) ? overview.history : null;
  if (!history || !("trafficSamples" in history)) return;
  const samples = history.trafficSamples;
  if (!Array.isArray(samples) || !samples.every((sample) => {
    if (!isRecord(sample) || !validTimestamp(sample.timestamp) || !stringValue(sample.source)) return false;
    const mode = sample.evidenceMode;
    if (mode === "unavailable") return sample.uplink === null && sample.downlink === null;
    const uplink = finiteNumber(sample.uplink);
    const downlink = finiteNumber(sample.downlink);
    return (mode === "current" || mode === "historical") && (uplink ?? -1) >= 0 && (downlink ?? -1) >= 0;
  })) issues.push("trafficSamples");
}
function validateAtomicResourceSamples(overview, issues) {
  const history = isRecord(overview.history) ? overview.history : null;
  if (!history || !("resourceSamples" in history)) return;
  if (!Array.isArray(history.resourceSamples)) {
    issues.push("resourceSamples \u5FC5\u987B\u662F\u6570\u7EC4");
    return;
  }
  history.resourceSamples.forEach((sample, index) => {
    const path = `overview.history.resourceSamples[${index}]`;
    if (!isRecord(sample)) {
      issues.push(`${path} \u5FC5\u987B\u662F\u5BF9\u8C61`);
      return;
    }
    const mode = String(sample.evidenceMode || "");
    const source = typeof sample.source === "string" && sample.source.trim();
    if (!source || !["current", "historical", "unavailable"].includes(mode)) issues.push(`${path} \u8BC1\u636E\u8FB9\u754C\u65E0\u6548`);
    let observedMetrics = 0;
    for (const field of ["cpu", "memory", "disk"]) {
      if (sample[field] == null) continue;
      observedMetrics += 1;
      const metric = finiteNumber(sample[field]);
      if (metric === null || metric < 0 || metric > 100) issues.push(`${path}.${field}`);
    }
    if (mode === "current" && observedMetrics === 0) issues.push(`${path} \u5F53\u524D\u8D44\u6E90\u6307\u6807\u5168\u90E8\u7F3A\u5931`);
  });
}
function validateResourceHistoryTimestamps(overview, issues) {
  const history = isRecord(overview.history) ? overview.history : null;
  if (!history || !("timestamps" in history)) return;
  if (!Array.isArray(history.timestamps)) {
    issues.push("overview.history.timestamps \u5FC5\u987B\u662F\u6570\u7EC4");
    return;
  }
  history.timestamps.forEach((timestamp, index) => {
    if (!validTimestamp(timestamp)) {
      issues.push(`overview.history.timestamps[${index}] \u5FC5\u987B\u662F\u5E26\u65F6\u533A\u7684 RFC 3339 \u65F6\u95F4`);
    }
  });
}
function channelTest(value) {
  const source = isRecord(value) ? value : {};
  const trustExpiresAt = stringValue(source.trustExpiresAt);
  if ("trustExpiresAt" in source && source.trustExpiresAt !== null && !validTimestamp(source.trustExpiresAt)) return null;
  return {
    ok: source.ok === true,
    error: stringValue(source.error),
    elapsedMs: finiteNumber(source.elapsedMs),
    ...stringValue(source.identity) ? { identity: stringValue(source.identity) } : {},
    ...finiteNumber(source.status) !== null ? { status: finiteNumber(source.status) } : {},
    ...stringValue(source.fingerprint) ? { fingerprint: stringValue(source.fingerprint) } : {},
    ...stringValue(source.expectedFingerprint) ? { expectedFingerprint: stringValue(source.expectedFingerprint) } : {},
    ...stringValue(source.algorithm) ? { algorithm: stringValue(source.algorithm) } : {},
    ...source.confirmationRequired === true ? { confirmationRequired: true } : {},
    ...stringValue(source.trustToken) ? { trustToken: stringValue(source.trustToken) } : {},
    ...trustExpiresAt ? { trustExpiresAt } : {},
    ...source.hostKeyChanged === true ? { hostKeyChanged: true } : {},
    ...source.scheme === "https" || source.scheme === "http" ? { scheme: source.scheme } : {},
    ...finiteNumber(source.port) !== null ? { port: Math.round(finiteNumber(source.port)) } : {},
    ...typeof source.verifyTls === "boolean" ? { verifyTls: source.verifyTls } : {}
  };
}
function connectionTest(value) {
  if (!isRecord(value)) return null;
  const ssh = channelTest(value.ssh);
  const rest = channelTest(value.rest);
  if (!ssh || !rest) return null;
  return {
    ssh,
    rest,
    elapsedMs: finiteNumber(value.elapsedMs)
  };
}
function parseRouterConnectionTest(value) {
  return connectionTest(value);
}
function routerLoginProfile(value) {
  if (!isRecord(value) || typeof value.configured !== "boolean") return null;
  const port = finiteNumber(value.sshPort);
  const restPort = finiteNumber(value.restPort);
  const restScheme = value.restScheme === "http" ? "http" : value.restScheme === "https" ? "https" : null;
  const updatedAt = stringValue(value.updatedAt);
  const lastTest = connectionTest(value.lastTest);
  if (port === null || port < 1 || port > 65535 || restPort === null || restPort < 1 || restPort > 65535 || !restScheme) return null;
  if (value.updatedAt !== null && typeof value.updatedAt !== "undefined" && !validTimestamp(value.updatedAt)) return null;
  if (value.lastTest !== null && typeof value.lastTest !== "undefined" && !lastTest) return null;
  return {
    configured: value.configured,
    host: stringValue(value.host),
    user: stringValue(value.user),
    sshPort: Math.round(port),
    sshHostKeyFingerprint: stringValue(value.sshHostKeyFingerprint),
    restScheme,
    restPort: Math.round(restPort),
    restVerifyTls: value.restVerifyTls === true,
    insecureRestConfirmed: value.insecureRestConfirmed === true,
    source: stringValue(value.source),
    savedId: stringValue(value.savedId),
    updatedAt,
    passwordSet: value.passwordSet === true,
    lastTest
  };
}
function savedLogin(value) {
  if (!isRecord(value)) return null;
  const id = stringValue(value.id);
  const host = stringValue(value.host);
  const user = stringValue(value.user);
  const port = finiteNumber(value.sshPort);
  const restPort = value.restPort === void 0 ? 443 : finiteNumber(value.restPort);
  const restScheme = value.restScheme === "http" ? "http" : value.restScheme === "https" || value.restScheme === void 0 ? "https" : null;
  const lastTest = connectionTest(value.lastTest);
  if (!id || !host || !user || port === null || port < 1 || port > 65535 || restPort === null || restPort < 1 || restPort > 65535 || !restScheme) return null;
  if (!validTimestamp(value.updatedAt) || !validTimestamp(value.lastUsedAt)) return null;
  if (value.lastTest !== null && typeof value.lastTest !== "undefined" && !lastTest) return null;
  return {
    id,
    host,
    user,
    sshPort: Math.round(port),
    sshHostKeyFingerprint: stringValue(value.sshHostKeyFingerprint),
    restScheme,
    restPort: Math.round(restPort),
    restVerifyTls: value.restVerifyTls === true,
    insecureRestConfirmed: value.insecureRestConfirmed === true,
    label: stringValue(value.label) || host,
    updatedAt: stringValue(value.updatedAt),
    lastUsedAt: stringValue(value.lastUsedAt),
    lastTest
  };
}
function savedLoginList(value) {
  if (!Array.isArray(value)) return null;
  const rows = value.map(savedLogin);
  return rows.every((row) => row !== null) ? rows : null;
}
function validatePanelSnapshot(input) {
  if (!isRecord(input)) {
    return { ok: false, kind: "malformed", issues: ["\u5FEB\u7167\u6839\u8282\u70B9\u5FC5\u987B\u662F JSON \u5BF9\u8C61"] };
  }
  const issues = [];
  if ("status" in input && typeof input.status !== "string") issues.push("status \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
  if ("updatedAt" in input && input.updatedAt !== null && !validTimestamp(input.updatedAt)) {
    issues.push("updatedAt \u5FC5\u987B\u662F\u6709\u6548\u65F6\u95F4\u6233\u6216 null");
  }
  if ("error" in input && input.error !== null && typeof input.error !== "string") {
    issues.push("error \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6216 null");
  }
  for (const field of SNAPSHOT_ARRAY_FIELDS) {
    if (field in input && !Array.isArray(input[field])) issues.push(`${field} \u5FC5\u987B\u662F\u6570\u7EC4`);
    if (Array.isArray(input[field]) && !input[field].every(isRecord)) issues.push(`${field} \u6BCF\u4E00\u9879\u5FC5\u987B\u662F\u5BF9\u8C61`);
  }
  for (const field of SNAPSHOT_RECORD_FIELDS) {
    if (field in input && !isRecord(input[field])) issues.push(`${field} \u5FC5\u987B\u662F\u5BF9\u8C61`);
  }
  const meta = isRecord(input.meta) ? input.meta : null;
  if (meta && "pollSeconds" in meta) {
    const pollSeconds = finiteNumber(meta.pollSeconds);
    if (pollSeconds === null || pollSeconds < 1 || pollSeconds > 300) issues.push("meta.pollSeconds \u5FC5\u987B\u662F 1\u2013300 \u7684\u6709\u9650\u6570\u503C");
  }
  const overview = isRecord(input.overview) ? input.overview : null;
  if (overview) {
    validatePercentage(overview, "cpuLoad", "overview", issues);
    validatePercentage(overview, "memoryUsage", "overview", issues);
    validatePercentage(overview, "diskUsage", "overview", issues);
    validateResourceHistoryTimestamps(overview, issues);
    validateAtomicResourceSamples(overview, issues);
    validateAtomicTrafficSamples(overview, issues);
  }
  const connections = isRecord(input.connections) ? input.connections : null;
  if (connections && "total" in connections) {
    const total = finiteNumber(connections.total);
    if (total === null || total < 0) issues.push("connections.total \u5FC5\u987B\u662F\u975E\u8D1F\u6709\u9650\u6570\u503C");
  }
  validateRecordArrayFields(input, issues);
  for (const [field, rateFields] of Object.entries(SNAPSHOT_RATE_FIELDS)) {
    validateNonnegativeRowNumbers(input[field], field, rateFields, issues);
  }
  const connectionRecord = isRecord(input.connections) ? input.connections : null;
  if (connectionRecord) {
    for (const field of ["active", "topIps", "protocolTop"]) {
      validateNonnegativeRowNumbers(connectionRecord[field], `connections.${field}`, CONNECTION_RATE_FIELDS, issues);
    }
  }
  validateSnapshotTree(input, "", issues);
  if (issues.length > 0) return { ok: false, kind: "malformed", issues };
  const status = stringValue(input.status).toLowerCase();
  if (status === "error" || status === "needs_config") {
    return { ok: true, kind: "error", value: input };
  }
  const hasCoreEnvelope = isRecord(input.meta) && isRecord(input.overview);
  const presentCollections = SNAPSHOT_ARRAY_FIELDS.filter((field) => Array.isArray(input[field])).length;
  const operational = status === "ok" && validTimestamp(input.updatedAt) && hasCoreEnvelope && presentCollections >= 2 && hasOperationalEvidenceValue(input);
  return { ok: true, kind: operational ? "operational" : "partial", value: input };
}
function parseRouterLoginBootstrap(input) {
  if (!isRecord(input) || input.ok !== true) return null;
  const profile = routerLoginProfile(input.routerLogin);
  const saved = savedLoginList(input.savedLogins);
  const csrfToken = stringValue(input.csrfToken);
  if (!profile || !saved || !csrfToken) return null;
  return {
    routerLogin: profile,
    savedLogins: saved,
    profileStorageAvailable: input.profileStorageAvailable === true,
    csrfToken
  };
}
function parseRouterLoginMutation(input) {
  if (!isRecord(input) || input.ok !== true) return null;
  const profile = routerLoginProfile(input.routerLogin);
  const saved = savedLoginList(input.savedLogins);
  const test = connectionTest(input.test);
  if (!profile || !saved) return null;
  if (input.test !== null && typeof input.test !== "undefined" && !test) return null;
  return {
    routerLogin: profile,
    savedLogins: saved,
    test,
    warning: stringValue(input.warning),
    removed: typeof input.removed === "boolean" ? input.removed : null
  };
}
function snapshotEvidenceTimestamp(snapshot) {
  const meta = isRecord(snapshot.meta) ? snapshot.meta : {};
  const candidates = [meta.realtimeUpdatedAt, meta.statusUpdatedAt, snapshot.updatedAt];
  for (const candidate of candidates) {
    if (!validTimestamp(candidate)) continue;
    return parseRfc3339Timestamp(candidate);
  }
  return null;
}
function snapshotPollSeconds(snapshot) {
  const meta = snapshot && isRecord(snapshot.meta) ? snapshot.meta : {};
  const raw = finiteNumber(meta.pollSeconds);
  return Math.max(2, Math.min(60, raw === null ? 5 : raw));
}
function snapshotHasOperationalEvidence(snapshot) {
  return hasOperationalEvidenceValue(snapshot);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  parseRouterConnectionTest,
  parseRouterLoginBootstrap,
  parseRouterLoginMutation,
  snapshotEvidenceTimestamp,
  snapshotHasOperationalEvidence,
  snapshotPollSeconds,
  validatePanelSnapshot
});
