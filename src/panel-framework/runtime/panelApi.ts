import {
  parseRouterLoginBootstrap,
  parseRouterLoginMutation,
  validatePanelSnapshot,
  type RouterLoginBootstrap,
  type RouterLoginMutation,
  type SnapshotValidationResult,
} from "./panelRuntimeSchema";

export interface RouterConnectionInput {
  host: string;
  user: string;
  password: string;
  sshPort: number;
  sshHostKeyFingerprint?: string;
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

  constructor(message: string, status = 0, code = "request_failed", payload: unknown = null) {
    super(message);
    this.name = "PanelApiError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
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
    throw new PanelApiError(`接口返回了无法解析的 JSON（HTTP ${response.status}）`, response.status, "invalid_json");
  }

  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.error === "string" ? payload.error : `请求失败（HTTP ${response.status}）`;
    const code = isRecord(payload) && typeof payload.code === "string" ? payload.code : "request_failed";
    throw new PanelApiError(message, response.status, code, payload);
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
