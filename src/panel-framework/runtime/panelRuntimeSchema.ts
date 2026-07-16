export type SnapshotEnvelopeKind = "operational" | "partial" | "error";

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
  savePasswordAvailable: boolean;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function validTimestamp(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function channelTest(value: unknown): RouterChannelTest {
  const source = isRecord(value) ? value : {};
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
    ...(source.hostKeyChanged === true ? { hostKeyChanged: true } : {}),
    ...(source.scheme === "https" || source.scheme === "http" ? { scheme: source.scheme } : {}),
    ...(finiteNumber(source.port) !== null ? { port: Math.round(finiteNumber(source.port) as number) } : {}),
    ...(typeof source.verifyTls === "boolean" ? { verifyTls: source.verifyTls } : {}),
  };
}

function connectionTest(value: unknown): RouterConnectionTest | null {
  if (!isRecord(value)) return null;
  return {
    ssh: channelTest(value.ssh),
    rest: channelTest(value.rest),
    elapsedMs: finiteNumber(value.elapsedMs),
  };
}

function routerLoginProfile(value: unknown): RouterLoginProfile | null {
  if (!isRecord(value) || typeof value.configured !== "boolean") return null;
  const port = finiteNumber(value.sshPort);
  const restPort = finiteNumber(value.restPort);
  const restScheme = value.restScheme === "http" ? "http" : value.restScheme === "https" ? "https" : null;
  if (port === null || port < 1 || port > 65535 || restPort === null || restPort < 1 || restPort > 65535 || !restScheme) return null;
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
    updatedAt: stringValue(value.updatedAt),
    passwordSet: value.passwordSet === true,
    lastTest: connectionTest(value.lastTest),
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
  if (!id || !host || !user || port === null || port < 1 || port > 65535 || restPort === null || restPort < 1 || restPort > 65535 || !restScheme) return null;
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
    lastTest: connectionTest(value.lastTest),
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
  }
  for (const field of SNAPSHOT_RECORD_FIELDS) {
    if (field in input && !isRecord(input[field])) issues.push(`${field} 必须是对象`);
  }

  const meta = isRecord(input.meta) ? input.meta : null;
  if (meta && "pollSeconds" in meta && finiteNumber(meta.pollSeconds) === null) {
    issues.push("meta.pollSeconds 必须是有限数值");
  }

  if (issues.length > 0) return { ok: false, kind: "malformed", issues };

  const status = stringValue(input.status).toLowerCase();
  if (status === "error" || status === "needs_config") {
    return { ok: true, kind: "error", value: input };
  }

  const hasCoreIdentity = isRecord(input.meta) || isRecord(input.overview);
  const presentCollections = SNAPSHOT_ARRAY_FIELDS.filter((field) => Array.isArray(input[field])).length;
  const operational = status === "ok" && validTimestamp(input.updatedAt) && hasCoreIdentity && presentCollections >= 2;
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
    savePasswordAvailable: input.savePasswordAvailable === true,
    csrfToken,
  };
}

export function parseRouterLoginMutation(input: unknown): RouterLoginMutation | null {
  if (!isRecord(input) || input.ok !== true) return null;
  const profile = routerLoginProfile(input.routerLogin);
  const saved = savedLoginList(input.savedLogins);
  if (!profile || !saved) return null;
  return {
    routerLogin: profile,
    savedLogins: saved,
    test: connectionTest(input.test),
    warning: stringValue(input.warning),
    removed: typeof input.removed === "boolean" ? input.removed : null,
  };
}

export function snapshotEvidenceTimestamp(snapshot: Record<string, unknown>): number | null {
  const meta = isRecord(snapshot.meta) ? snapshot.meta : {};
  const candidates = [meta.realtimeUpdatedAt, meta.statusUpdatedAt, snapshot.updatedAt];
  for (const candidate of candidates) {
    if (!validTimestamp(candidate)) continue;
    return Date.parse(String(candidate));
  }
  return null;
}

export function snapshotPollSeconds(snapshot: Record<string, unknown> | null): number {
  const meta = snapshot && isRecord(snapshot.meta) ? snapshot.meta : {};
  const raw = finiteNumber(meta.pollSeconds);
  return Math.max(2, Math.min(60, raw === null ? 5 : raw));
}

export function snapshotHasOperationalEvidence(snapshot: Record<string, unknown>): boolean {
  return Boolean(
    isRecord(snapshot.overview) ||
      SNAPSHOT_ARRAY_FIELDS.some((field) => Array.isArray(snapshot[field]) && (snapshot[field] as unknown[]).length > 0)
  );
}
