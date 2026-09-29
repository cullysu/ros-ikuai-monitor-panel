/**
 * Pure request/response contract for the panel's single write endpoint,
 * POST /api/ip-alias (ros_panel/server.py -> collector.update_ip_alias).
 * Kept free of DOM/fetch so the request construction can be unit-tested
 * directly (tests/test_ip_alias_client.py runs this file on Node).
 */

export const IP_ALIAS_PATH = "/api/ip-alias";
export const IP_ALIAS_MAX_NAME_LENGTH = 48;

export interface IpAliasRequestBody {
  ip: string;
  name: string;
}

export interface IpAliasRequest {
  path: typeof IP_ALIAS_PATH;
  method: "POST";
  headers: Record<string, string>;
  body: string;
}

export interface IpAliasResult {
  ok: boolean;
  ip: string;
  /** The stored custom name; "" means the alias was cleared. */
  customName: string;
  error: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function boundedText(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 512) : "";
}

/** Mirrors the backend: collapse whitespace, then bound the stored length. Empty name clears. */
export function normalizeIpAliasName(value: unknown): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.slice(0, IP_ALIAS_MAX_NAME_LENGTH);
}

/** The alias target must be a non-empty address; everything else is left to the server. */
export function normalizeIpAliasIp(value: unknown): string {
  return String(value ?? "").trim();
}

export function buildIpAliasRequestBody(ip: unknown, name: unknown): IpAliasRequestBody | null {
  const normalizedIp = normalizeIpAliasIp(ip);
  if (!normalizedIp) return null;
  return { ip: normalizedIp, name: normalizeIpAliasName(name) };
}

export function buildIpAliasRequest(ip: unknown, name: unknown, csrfToken = ""): IpAliasRequest | null {
  const body = buildIpAliasRequestBody(ip, name);
  if (!body) return null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const token = typeof csrfToken === "string" ? csrfToken.trim() : "";
  if (token) headers["X-CSRF-Token"] = token;
  return {
    path: IP_ALIAS_PATH,
    method: "POST",
    headers,
    body: JSON.stringify(body),
  };
}

/** Parses both the success payload ({ok:true,ip,customName}) and error payloads ({error,code}). */
export function parseIpAliasResponse(payload: unknown, responseOk: boolean): IpAliasResult {
  const source = isRecord(payload) ? payload : {};
  const ip = boundedText(source.ip);
  const errorCode = boundedText(source.code);
  if (!responseOk || source.ok === false) {
    return {
      ok: false,
      ip,
      customName: "",
      error: boundedText(source.error) || (errorCode ? `保存失败（${errorCode}）` : "名称保存失败"),
    };
  }
  if (source.ok !== true) {
    return { ok: false, ip, customName: "", error: "名称保存失败：响应不符合契约" };
  }
  return {
    ok: true,
    ip,
    customName: typeof source.customName === "string" ? source.customName : "",
    error: "",
  };
}
