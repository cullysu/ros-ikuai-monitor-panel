import {
  parseRouterLoginBootstrap,
  parseRouterLoginMutation,
  validatePanelSnapshot,
  type RouterLoginBootstrap,
  type RouterLoginMutation,
  type SnapshotValidationResult,
} from "./panelRuntimeSchema";
import {
  parseConnectionSearchSupplement,
  parseDnsStaticSupplement,
  parseHealthFindingSupplement,
  isExplicitIpQuery,
  type ConnectionSearchSupplement,
  type DnsStaticSupplement,
  type HealthFindingSupplement,
  type RouteSupplementResult,
} from "../sections/routeSupplementSchema";
import { dnsPageUrl, type DnsPageRequest } from "../sections/routeSupplementState";

export interface RouterConnectionInput {
  host: string;
  user: string;
  password: string;
  sshPort: number;
  sshHostKeyFingerprint?: string;
  sshHostKeyTrustToken?: string;
  continueWithVerifiedRestOnly?: boolean;
  restScheme: "https" | "http";
  restPort: number;
  restVerifyTls: boolean;
  insecureRestConfirmed: boolean;
  savedId?: string;
  rememberProfile: boolean;
}

export class PanelApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly payload: unknown;
  readonly retryAfterSeconds: number | null;

  constructor(message: string, status = 0, code = "request_failed", payload: unknown = null, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = "PanelApiError";
    this.status = Number.isSafeInteger(status) && status >= 0 && status <= 599 ? status : 0;
    this.code = /^[a-z0-9_]{1,64}$/.test(code) ? code : "request_failed";
    this.payload = payload;
    this.retryAfterSeconds = Number.isSafeInteger(retryAfterSeconds) && retryAfterSeconds !== null && retryAfterSeconds >= 0 && retryAfterSeconds <= 3_600
      ? retryAfterSeconds
      : null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function boundedRetryAfterSeconds(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 3_600) return value;
  if (typeof value === "string" && /^(?:0|[1-9]\d{0,3})$/.test(value)) {
    const parsed = Number(value);
    return parsed <= 3_600 ? parsed : null;
  }
  return null;
}

function responseRetryAfterSeconds(response: Response, payload: unknown): number | null {
  const bodyValue = isRecord(payload) ? boundedRetryAfterSeconds(payload.retryAfterSeconds) : null;
  return bodyValue ?? boundedRetryAfterSeconds(response.headers.get("Retry-After"));
}

async function requestJson(path: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...init.headers,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "网络请求失败";
    throw new PanelApiError(message, 0, "network_error");
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    throw new PanelApiError(`接口返回了无法解析的 JSON（HTTP ${response.status}）`, response.status, "invalid_json", null, responseRetryAfterSeconds(response, null));
  }

  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.error === "string" ? payload.error : `请求失败（HTTP ${response.status}）`;
    const rawCode = isRecord(payload) && typeof payload.code === "string" ? payload.code : "request_failed";
    const code = /^[a-z0-9_]{1,64}$/.test(rawCode) ? rawCode : "request_failed";
    throw new PanelApiError(message, response.status, code, payload, responseRetryAfterSeconds(response, payload));
  }

  return payload;
}

function writeHeaders(csrfToken: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-CSRF-Token": csrfToken,
  };
}

export async function fetchRouterLoginBootstrap(signal?: AbortSignal): Promise<RouterLoginBootstrap> {
  const payload = await requestJson("/api/router-login", { signal });
  const parsed = parseRouterLoginBootstrap(payload);
  if (!parsed) throw new PanelApiError("连接状态接口返回了不符合契约的数据", 0, "invalid_login_schema", payload);
  return parsed;
}

export async function submitRouterConnection(
  input: RouterConnectionInput,
  csrfToken: string,
  signal?: AbortSignal
): Promise<RouterLoginMutation> {
  const payload = await requestJson("/api/router-login", {
    method: "POST",
    signal,
    headers: writeHeaders(csrfToken),
    body: JSON.stringify({
      host: input.host,
      user: input.user,
      password: input.password,
      sshPort: input.sshPort,
      restScheme: input.restScheme,
      restPort: input.restPort,
      restVerifyTls: input.restVerifyTls,
      insecureRestConfirmed: input.insecureRestConfirmed,
      ...(input.sshHostKeyFingerprint ? { sshHostKeyFingerprint: input.sshHostKeyFingerprint } : {}),
      ...(input.sshHostKeyTrustToken ? { sshHostKeyTrustToken: input.sshHostKeyTrustToken } : {}),
      ...(input.continueWithVerifiedRestOnly ? { continueWithVerifiedRestOnly: true } : {}),
      ...(input.savedId ? { savedId: input.savedId } : {}),
      rememberProfile: input.rememberProfile,
    }),
  });
  const parsed = parseRouterLoginMutation(payload);
  if (!parsed) throw new PanelApiError("连接接口返回了不符合契约的数据", 0, "invalid_login_schema", payload);
  return parsed;
}

export async function submitRouterLogout(csrfToken: string, signal?: AbortSignal): Promise<RouterLoginMutation> {
  const payload = await requestJson("/api/router-logout", {
    method: "POST",
    signal,
    headers: writeHeaders(csrfToken),
    body: "{}",
  });
  const parsed = parseRouterLoginMutation(payload);
  if (!parsed) throw new PanelApiError("注销接口返回了不符合契约的数据", 0, "invalid_login_schema", payload);
  return parsed;
}

export async function forgetRouterLoginProfile(
  savedId: string,
  csrfToken: string,
  signal?: AbortSignal
): Promise<RouterLoginMutation> {
  const payload = await requestJson("/api/router-login-forget", {
    method: "POST",
    signal,
    headers: writeHeaders(csrfToken),
    body: JSON.stringify({ savedId }),
  });
  const parsed = parseRouterLoginMutation(payload);
  if (!parsed) throw new PanelApiError("设备资料接口返回了不符合契约的数据", 0, "invalid_login_schema", payload);
  return parsed;
}

export async function fetchPanelSnapshot(signal?: AbortSignal): Promise<SnapshotValidationResult> {
  const payload = await requestJson("/api/snapshot", { signal });
  return validatePanelSnapshot(payload);
}

export async function fetchDnsStaticSupplement(page: DnsPageRequest, signal?: AbortSignal): Promise<RouteSupplementResult<DnsStaticSupplement>> {
  const url = dnsPageUrl(page);
  if (!url) throw new PanelApiError("DNS 分页请求超出前端边界", 0, "invalid_dns_page");
  const payload = await requestJson(url, { signal });
  return parseDnsStaticSupplement(payload);
}

export async function fetchHealthFindingsSupplement(signal?: AbortSignal): Promise<RouteSupplementResult<HealthFindingSupplement>> {
  const payload = await requestJson("/api/health-findings", { signal });
  return parseHealthFindingSupplement(payload);
}

export async function fetchConnectionSearchSupplement(target: string, signal?: AbortSignal): Promise<RouteSupplementResult<ConnectionSearchSupplement>> {
  if (!isExplicitIpQuery(target)) throw new PanelApiError("连接查询需要规范的完整 IP 地址", 0, "invalid_connection_target");
  const params = new URLSearchParams({ target, limit: "40" });
  const payload = await requestJson(`/api/connection-search?${params.toString()}`, { signal });
  return parseConnectionSearchSupplement(payload);
}
