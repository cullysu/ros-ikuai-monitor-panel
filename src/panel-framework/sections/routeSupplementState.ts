import { isExplicitIpQuery, type ConnectionSearchSupplement, type RouteSupplement, type RouteSupplementResult } from "./routeSupplementSchema";

export const DNS_SUPPLEMENT_PAGE_SIZE = 50;
export const DNS_SUPPLEMENT_MAX_PAGES = 20;
export const DNS_SUPPLEMENT_MAX_ROWS = DNS_SUPPLEMENT_PAGE_SIZE * DNS_SUPPLEMENT_MAX_PAGES;

export interface DnsPageRequest {
  page: number;
  offset: number;
  limit: number;
}

export interface DnsPageOutOfRange {
  totalCount: number;
  lastPage: number;
  revision: string;
}

export interface SupplementalRequestFailure {
  errorCode: string;
  errorStatus: number;
  retryAfterSeconds: number | null;
  message: string;
}

export type RouteSupplementHistory =
  | { schemaVersion: 1; route: "dns4"; action: "dns-page"; page: number; query: null }
  | { schemaVersion: 1; route: "connections"; action: "connection-search"; page: null; query: string; selectedRowId: string | null };

export type SupplementalRateOrigin = "unavailable" | "observed-zero" | "observed";

const SOURCE_LABELS: Record<string, string> = {
  "routeros-ssh": "RouterOS SSH",
  "rest-live": "RouterOS REST",
  "rest-cache": "本地缓存",
  "snapshot-health-analysis": "快照健康分析",
  unavailable: "未取得",
};

const COVERAGE_LABELS: Record<string, string> = {
  complete: "完整集合",
  page: "当前分页",
  "bounded-sample": "有界样本",
  preview: "预览样本",
  unavailable: "未取得",
};

const FINDING_DOMAIN_LABELS: Record<string, string> = {
  collector: "采集",
  wan: "WAN",
  routes: "路由",
  dns: "DNS",
  ipv6: "IPv6",
  dhcp: "DHCP",
  terminals: "终端",
  interfaces: "接口",
  resources: "资源",
  system: "系统",
  connections: "连接",
  security: "安全",
};

export function routeSupplementSourceLabel(source: string | null | undefined): string {
  return source ? SOURCE_LABELS[source] || source : "未取得";
}

export function routeSupplementCoverageLabel(coverage: string | null | undefined): string {
  return coverage ? COVERAGE_LABELS[coverage] || coverage : "未取得";
}

export function routeSupplementSeverityLabel(severity: "critical" | "warning" | "info"): string {
  return severity === "critical" ? "严重" : severity === "warning" ? "警告" : "提示";
}

export function routeSupplementDomainLabel(domain: string): string {
  return FINDING_DOMAIN_LABELS[domain] || domain;
}

export function dnsPageRequest(page: number): DnsPageRequest | null {
  if (!Number.isSafeInteger(page) || page < 1 || page > DNS_SUPPLEMENT_MAX_PAGES) return null;
  return { page, offset: (page - 1) * DNS_SUPPLEMENT_PAGE_SIZE, limit: DNS_SUPPLEMENT_PAGE_SIZE };
}

export function dnsPageUrl(request: DnsPageRequest | null): string | null {
  return request ? `/api/dns-static?offset=${request.offset}&limit=${request.limit}` : null;
}

export function dnsRequestForRoute(route: string, history: RouteSupplementHistory | null): DnsPageRequest | null {
  if (route !== "dns4") return null;
  return dnsPageRequest(history?.route === "dns4" ? history.page : 1);
}

export function routeSupplementRequestKey(route: string, history: RouteSupplementHistory | null): string {
  if (route === "security") return "security:health-findings";
  if (route === "dns4") return `dns4:${history?.route === "dns4" ? history.page : 1}`;
  if (route === "connections" && history?.route === "connections") return `connections:${history.query}`;
  return `${route}:idle`;
}

export function supplementalRateOrigin(value: number | null): SupplementalRateOrigin {
  return value === null ? "unavailable" : value === 0 ? "observed-zero" : "observed";
}

export function connectionSupplementRowId(row: ConnectionSearchSupplement["rows"][number], index: number): string {
  const source = `${row.srcIp}\u001f${row.dstIp}\u001f${row.protocol}\u001f${row.timeout}\u001f${index}`;
  let hash = 0x811c9dc5;
  for (let cursor = 0; cursor < source.length; cursor += 1) {
    hash ^= source.charCodeAt(cursor);
    hash = Math.imul(hash, 0x01000193);
  }
  return `connection-${index + 1}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function validConnectionRowId(value: unknown): value is string {
  return typeof value === "string" && /^connection-(?:[1-9]|[1-4]\d|50)-[0-9a-f]{8}$/.test(value);
}

export function parseDnsPageOutOfRange(payload: unknown, currentPage: number): DnsPageOutOfRange | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !Number.isSafeInteger(currentPage) || currentPage < 2 || currentPage > DNS_SUPPLEMENT_MAX_PAGES) return null;
  const source = payload as Record<string, unknown>;
  const totalCount = source.totalCount;
  const lastPage = source.lastPage;
  const revision = source.revision;
  if (source.code !== "dns_page_out_of_range"
    || typeof totalCount !== "number" || !Number.isSafeInteger(totalCount) || totalCount < 0 || totalCount > DNS_SUPPLEMENT_MAX_ROWS
    || typeof lastPage !== "number" || !Number.isSafeInteger(lastPage) || lastPage < 1 || lastPage >= currentPage || lastPage > DNS_SUPPLEMENT_MAX_PAGES
    || typeof revision !== "string" || !/^[0-9a-f]{64}$/.test(revision)
    || lastPage !== Math.max(1, Math.ceil(totalCount / DNS_SUPPLEMENT_PAGE_SIZE))) return null;
  return { totalCount, lastPage, revision };
}

export function supplementalRequestFailure(code: unknown, status: unknown, retryAfterSeconds: unknown): SupplementalRequestFailure {
  const safeCode = typeof code === "string" && /^[a-z0-9_]{1,64}$/.test(code) ? code : "request_failed";
  const safeStatus = typeof status === "number" && Number.isSafeInteger(status) && status >= 0 && status <= 599 ? status : 0;
  const safeRetry = typeof retryAfterSeconds === "number" && Number.isSafeInteger(retryAfterSeconds) && retryAfterSeconds >= 0 && retryAfterSeconds <= 3_600
    ? retryAfterSeconds
    : null;
  if (safeCode === "connection_search_in_flight") {
    return { errorCode: safeCode, errorStatus: safeStatus, retryAfterSeconds: safeRetry, message: "已有连接查询正在执行；保留目标，可再次重试。" };
  }
  if (safeCode === "connection_search_rate_limited") {
    const retry = safeRetry && safeRetry > 0 ? safeRetry : 1;
    return { errorCode: safeCode, errorStatus: safeStatus, retryAfterSeconds: retry, message: `连接查询过于频繁；保留目标，${retry} 秒后可重试。` };
  }
  return { errorCode: safeCode, errorStatus: safeStatus, retryAfterSeconds: safeRetry, message: "补充读取失败；当前仍保留只读快照。" };
}

export function createDnsSupplementHistory(page: number): RouteSupplementHistory | null {
  return dnsPageRequest(page) ? { schemaVersion: 1, route: "dns4", action: "dns-page", page, query: null } : null;
}

export function createConnectionSupplementHistory(query: string, selectedRowId: string | null = null): RouteSupplementHistory | null {
  return isExplicitIpQuery(query) && (selectedRowId === null || validConnectionRowId(selectedRowId))
    ? { schemaVersion: 1, route: "connections", action: "connection-search", page: null, query, selectedRowId }
    : null;
}

export function parseRouteSupplementHistory(value: unknown, route: string): RouteSupplementHistory | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const outer = value as Record<string, unknown>;
  const candidate = outer.panelRouteSupplement;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  const state = candidate as Record<string, unknown>;
  if (state.schemaVersion !== 1 || state.route !== route) return null;
  if (route === "dns4" && state.action === "dns-page" && typeof state.page === "number") return createDnsSupplementHistory(state.page);
  if (route === "connections" && state.action === "connection-search" && typeof state.query === "string") {
    if (state.selectedRowId === undefined || state.selectedRowId === null) return createConnectionSupplementHistory(state.query);
    return typeof state.selectedRowId === "string" ? createConnectionSupplementHistory(state.query, state.selectedRowId) : null;
  }
  return null;
}

export type SupplementalUiState = "loading" | "ready" | "empty" | "error" | "malformed" | "unavailable";

export function supplementalUiState(
  requestStatus: "idle" | "loading" | "success" | "error",
  result: RouteSupplementResult<RouteSupplement> | null,
): SupplementalUiState {
  if (requestStatus === "loading") return "loading";
  if (requestStatus === "error" || requestStatus === "idle" || !result) return "error";
  if (result.parseStatus === "malformed") return "malformed";
  if (result.parseStatus === "unavailable" || !result.data) return "unavailable";
  const count = result.data.kind === "health-findings" ? result.data.findings.length : result.data.rows.length;
  return count === 0 ? "empty" : "ready";
}
