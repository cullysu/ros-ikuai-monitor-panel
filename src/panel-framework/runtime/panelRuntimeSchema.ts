export type SnapshotEnvelopeKind = "operational" | "partial" | "error";
import { isRfc3339Timestamp, parseRfc3339Timestamp } from "../timeContract";

export type SnapshotValidationResult =
  | {
      ok: true;
      kind: SnapshotEnvelopeKind;
      value: Record<string, unknown>;
    }
  | {
      ok: false;
      kind: "malformed";
      issues: string[];
    };

export interface RouterChannelTest {
  ok: boolean;
  error: string;
  elapsedMs: number | null;
  identity?: string;
  status?: number | null;
  fingerprint?: string;
  expectedFingerprint?: string;
  algorithm?: string;
  confirmationRequired?: boolean;
  trustToken?: string;
  trustExpiresAt?: string;
  hostKeyChanged?: boolean;
  scheme?: "https" | "http";
  port?: number;
  verifyTls?: boolean;
}

export interface RouterConnectionTest {
  ssh: RouterChannelTest;
  rest: RouterChannelTest;
  elapsedMs: number | null;
}

export interface RouterLoginProfile {
  configured: boolean;
  host: string;
  user: string;
  sshPort: number;
  sshHostKeyFingerprint: string;
  restScheme: "https" | "http";
  restPort: number;
  restVerifyTls: boolean;
  insecureRestConfirmed: boolean;
  source: string;
  savedId: string;
  updatedAt: string;
  passwordSet: boolean;
  lastTest: RouterConnectionTest | null;
}

export interface SavedRouterLogin {
  id: string;
  host: string;
  user: string;
  sshPort: number;
  sshHostKeyFingerprint: string;
  restScheme: "https" | "http";
  restPort: number;
  restVerifyTls: boolean;
  insecureRestConfirmed: boolean;
  label: string;
  updatedAt: string;
  lastUsedAt: string;
  lastTest: RouterConnectionTest | null;
}

export interface RouterLoginBootstrap {
  routerLogin: RouterLoginProfile;
  savedLogins: SavedRouterLogin[];
  profileStorageAvailable: boolean;
  csrfToken: string;
}

export interface RouterLoginMutation {
  routerLogin: RouterLoginProfile;
  savedLogins: SavedRouterLogin[];
  test: RouterConnectionTest | null;
  warning: string;
  removed: boolean | null;
}

const SNAPSHOT_ARRAY_FIELDS = ["interfaces", "pppoe", "wan", "terminals"] as const;
const SNAPSHOT_RECORD_FIELDS = [
  "meta",
  "overview",
  "routes",
  "connections",
  "dns",
  "dhcp",
  "arp",
  "loadBalance",
  "security",
  "logs",
] as const;
const SNAPSHOT_NESTED_RECORD_ARRAY_FIELDS = {
  meta: ["staticEndpointFailures", "realtimeEndpointFailures", "slowRestEndpointFailures", "detailEndpointFailures"],
  routes: ["items", "defaultRoutes", "staticRoutes", "tables"],
  connections: ["active", "topIps", "protocolTop"],
  dhcp: ["leases", "clients", "pools", "servers"],
  arp: ["items", "alerts"],
  loadBalance: ["distribution", "defaultRoutes", "mangleRules", "routingRules"],
  dns: ["forwardRules", "ipv6Nd", "ipv6DhcpClients"],
  security: ["filters", "alerts", "addressLists"],
  logs: ["all", "system", "firewall", "dhcp", "dns"],
} as const;
const SNAPSHOT_RATE_FIELDS = {
  interfaces: ["txRate", "rxRate", "upRate", "downRate"],
  pppoe: ["upRate", "downRate"],
  wan: ["upRate", "downRate"],
  terminals: ["upRate", "downRate"],
} as const;
const CONNECTION_RATE_FIELDS = ["upRate", "downRate", "totalRate", "sessionBytes"] as const;
const MAX_SNAPSHOT_COLLECTION_ROWS = 20_000;
const TIMESTAMP_FIELD = /^(?:observedAt|timestamp|updatedAt|generatedAt|sourceUpdatedAt|cachedAt|lastUsedAt|createdAt|systemTime|.*At|.*Timestamp)$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function hasObservedOverviewValue(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const stringFields = ["identity", "version", "boardName", "architecture", "uptime", "systemTime"];
  const numberFields = ["cpuLoad", "memoryUsage", "memoryUsedPercent", "diskUsage", "diskUsedPercent", "connectionTotal", "onlineTerminals"];
  return stringFields.some((key) => stringValue(value[key]) !== "") ||
    numberFields.some((key) => finiteNumber(value[key]) !== null);
}

function hasRows(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasNestedRows(value: unknown, keys: readonly string[]): boolean {
  if (!isRecord(value)) return false;
  return keys.some((key) => hasRows(value[key]));
}

function hasOperationalEvidenceValue(snapshot: Record<string, unknown>): boolean {
  if (hasObservedOverviewValue(snapshot.overview)) return true;
  if (SNAPSHOT_ARRAY_FIELDS.some((field) => hasRows(snapshot[field]))) return true;
  if (hasNestedRows(snapshot.routes, ["items", "defaultRoutes", "staticRoutes"])) return true;
  const connections = isRecord(snapshot.connections) ? snapshot.connections : null;
  const connectionTotal = connections ? finiteNumber(connections.total) : null;
  return connectionTotal !== null && connectionTotal >= 0;
}

function validTimestamp(value: unknown): boolean {
  return isRfc3339Timestamp(value);
}

function validateSnapshotTree(
  value: unknown,
  path: string,
  issues: string[],
  depth = 0,
) {
  if (depth > 8) return;
  if (Array.isArray(value)) {
    if (value.length > MAX_SNAPSHOT_COLLECTION_ROWS) {
      issues.push(`${path || "snapshot"} 超过 ${MAX_SNAPSHOT_COLLECTION_ROWS} 项上限`);
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
      issues.push(`${nextPath} 必须是带时区的 RFC 3339 时间或 null`);
    }
    validateSnapshotTree(item, nextPath, issues, depth + 1);
  });
}

function validatePercentage(source: Record<string, unknown>, key: string, path: string, issues: string[]) {
  if (!(key in source) || source[key] === null) return;
  const value = finiteNumber(source[key]);
  if (value === null || value < 0 || value > 100) issues.push(`${path}.${key} 必须是 0–100 的有限数值`);
}

function validateRecordArrayFields(input: Record<string, unknown>, issues: string[]) {
  for (const [parentKey, fields] of Object.entries(SNAPSHOT_NESTED_RECORD_ARRAY_FIELDS)) {
    const parent = isRecord(input[parentKey]) ? input[parentKey] as Record<string, unknown> : null;
    if (!parent) continue;
    for (const field of fields) {
      if (!(field in parent)) continue;
      const value = parent[field];
      if (!Array.isArray(value)) {
        issues.push(`${parentKey}.${field} 必须是数组`);
      } else if (!value.every(isRecord)) {
        issues.push(`${parentKey}.${field} 每一项必须是对象`);
      }
    }
  }
}

function validateNonnegativeRowNumbers(value: unknown, path: string, fields: readonly string[], issues: string[]) {
  if (!Array.isArray(value)) return;
  value.forEach((item, index) => {
    if (!isRecord(item)) return;
    fields.forEach((field) => {
      if (!(field in item) || item[field] === null) return;
      const observed = finiteNumber(item[field]);
      if (observed === null || observed < 0) issues.push(`${path}[${index}].${field} 必须是非负有限数值或 null`);
    });
  });
}

function validateAtomicTrafficSamples(overview: Record<string, unknown>, issues: string[]) {
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

function validateAtomicResourceSamples(overview: Record<string, unknown>, issues: string[]) {
  const history = isRecord(overview.history) ? overview.history : null;
  if (!history || !("resourceSamples" in history)) return;
  if (!Array.isArray(history.resourceSamples)) {
    issues.push("resourceSamples 必须是数组");
    return;
  }
  history.resourceSamples.forEach((sample, index) => {
    const path = `overview.history.resourceSamples[${index}]`;
    if (!isRecord(sample)) {
      issues.push(`${path} 必须是对象`);
      return;
    }
    const mode = String(sample.evidenceMode || "");
    const source = typeof sample.source === "string" && sample.source.trim();
    if (!source || !["current", "historical", "unavailable"].includes(mode)) issues.push(`${path} 证据边界无效`);
    let observedMetrics = 0;
    for (const field of ["cpu", "memory", "disk"]) {
      if (sample[field] == null) continue;
      observedMetrics += 1;
      const metric = finiteNumber(sample[field]);
      if (metric === null || metric < 0 || metric > 100) issues.push(`${path}.${field}`);
    }
    if (mode === "current" && observedMetrics === 0) issues.push(`${path} 当前资源指标全部缺失`);
  });
}


function validateResourceHistoryTimestamps(overview: Record<string, unknown>, issues: string[]) {
  const history = isRecord(overview.history) ? overview.history : null;
  if (!history || !("timestamps" in history)) return;
  if (!Array.isArray(history.timestamps)) {
    issues.push("overview.history.timestamps 必须是数组");
    return;
  }
  history.timestamps.forEach((timestamp, index) => {
    if (!validTimestamp(timestamp)) {
      issues.push(`overview.history.timestamps[${index}] 必须是带时区的 RFC 3339 时间`);
    }
  });
}

function channelTest(value: unknown): RouterChannelTest | null {
  const source = isRecord(value) ? value : {};
  const trustExpiresAt = stringValue(source.trustExpiresAt);
  if ("trustExpiresAt" in source && !validTimestamp(source.trustExpiresAt)) return null;
  return {
    ok: source.ok === true,
    error: stringValue(source.error),
    elapsedMs: finiteNumber(source.elapsedMs),
    ...(stringValue(source.identity) ? { identity: stringValue(source.identity) } : {}),
    ...(finiteNumber(source.status) !== null ? { status: finiteNumber(source.status) } : {}),
    ...(stringValue(source.fingerprint) ? { fingerprint: stringValue(source.fingerprint) } : {}),
    ...(stringValue(source.expectedFingerprint) ? { expectedFingerprint: stringValue(source.expectedFingerprint) } : {}),
    ...(stringValue(source.algorithm) ? { algorithm: stringValue(source.algorithm) } : {}),
    ...(source.confirmationRequired === true ? { confirmationRequired: true } : {}),
    ...(stringValue(source.trustToken) ? { trustToken: stringValue(source.trustToken) } : {}),
    ...(trustExpiresAt ? { trustExpiresAt } : {}),
    ...(source.hostKeyChanged === true ? { hostKeyChanged: true } : {}),
    ...(source.scheme === "https" || source.scheme === "http" ? { scheme: source.scheme } : {}),
    ...(finiteNumber(source.port) !== null ? { port: Math.round(finiteNumber(source.port) as number) } : {}),
    ...(typeof source.verifyTls === "boolean" ? { verifyTls: source.verifyTls } : {}),
  };
}

function connectionTest(value: unknown): RouterConnectionTest | null {
  if (!isRecord(value)) return null;
  const ssh = channelTest(value.ssh);
  const rest = channelTest(value.rest);
  if (!ssh || !rest) return null;
  return {
    ssh,
    rest,
    elapsedMs: finiteNumber(value.elapsedMs),
  };
}

export function parseRouterConnectionTest(value: unknown): RouterConnectionTest | null {
  return connectionTest(value);
}

function routerLoginProfile(value: unknown): RouterLoginProfile | null {
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
    lastTest,
  };
}

function savedLogin(value: unknown): SavedRouterLogin | null {
  if (!isRecord(value)) return null;
  const id = stringValue(value.id);
  const host = stringValue(value.host);
  const user = stringValue(value.user);
  const port = finiteNumber(value.sshPort);
  const restPort = finiteNumber(value.restPort);
  const restScheme = value.restScheme === "http" ? "http" : value.restScheme === "https" ? "https" : null;
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
    lastTest,
  };
}

function savedLoginList(value: unknown): SavedRouterLogin[] | null {
  if (!Array.isArray(value)) return null;
  const rows = value.map(savedLogin);
  return rows.every((row): row is SavedRouterLogin => row !== null) ? rows : null;
}

export function validatePanelSnapshot(input: unknown): SnapshotValidationResult {
  if (!isRecord(input)) {
    return { ok: false, kind: "malformed", issues: ["快照根节点必须是 JSON 对象"] };
  }

  const issues: string[] = [];
  if ("status" in input && typeof input.status !== "string") issues.push("status 必须是字符串");
  if ("updatedAt" in input && input.updatedAt !== null && !validTimestamp(input.updatedAt)) {
    issues.push("updatedAt 必须是有效时间戳或 null");
  }
  if ("error" in input && input.error !== null && typeof input.error !== "string") {
    issues.push("error 必须是字符串或 null");
  }

  for (const field of SNAPSHOT_ARRAY_FIELDS) {
    if (field in input && !Array.isArray(input[field])) issues.push(`${field} 必须是数组`);
    if (Array.isArray(input[field]) && !(input[field] as unknown[]).every(isRecord)) issues.push(`${field} 每一项必须是对象`);
  }
  for (const field of SNAPSHOT_RECORD_FIELDS) {
    if (field in input && !isRecord(input[field])) issues.push(`${field} 必须是对象`);
  }

  const meta = isRecord(input.meta) ? input.meta : null;
  if (meta && "pollSeconds" in meta) {
    const pollSeconds = finiteNumber(meta.pollSeconds);
    if (pollSeconds === null || pollSeconds < 1 || pollSeconds > 300) issues.push("meta.pollSeconds 必须是 1–300 的有限数值");
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
    if (total === null || total < 0) issues.push("connections.total 必须是非负有限数值");
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

export function parseRouterLoginBootstrap(input: unknown): RouterLoginBootstrap | null {
  if (!isRecord(input) || input.ok !== true) return null;
  const profile = routerLoginProfile(input.routerLogin);
  const saved = savedLoginList(input.savedLogins);
  const csrfToken = stringValue(input.csrfToken);
  if (!profile || !saved || !csrfToken) return null;
  return {
    routerLogin: profile,
    savedLogins: saved,
    profileStorageAvailable: input.profileStorageAvailable === true,
    csrfToken,
  };
}

export function parseRouterLoginMutation(input: unknown): RouterLoginMutation | null {
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
    removed: typeof input.removed === "boolean" ? input.removed : null,
  };
}

export function snapshotEvidenceTimestamp(snapshot: Record<string, unknown>): number | null {
  const meta = isRecord(snapshot.meta) ? snapshot.meta : {};
  const candidates = [meta.realtimeUpdatedAt, meta.statusUpdatedAt, snapshot.updatedAt];
  for (const candidate of candidates) {
    if (!validTimestamp(candidate)) continue;
    return parseRfc3339Timestamp(candidate);
  }
  return null;
}

export function snapshotPollSeconds(snapshot: Record<string, unknown> | null): number {
  const meta = snapshot && isRecord(snapshot.meta) ? snapshot.meta : {};
  const raw = finiteNumber(meta.pollSeconds);
  return Math.max(2, Math.min(60, raw === null ? 5 : raw));
}

export function snapshotHasOperationalEvidence(snapshot: Record<string, unknown>): boolean {
  return hasOperationalEvidenceValue(snapshot);
}
