import { formatRfc3339Local, isRfc3339Timestamp } from "../timeContract";

export const PANEL_ROUTE_IDS = [
  "overview",
  "interfaces",
  "lineStatus",
  "balance",
  "routes",
  "terminals",
  "dhcp",
  "arp",
  "trafficLoad",
  "loadAudit",
  "trafficAudit",
  "connections",
  "dns4",
  "dns6",
  "security",
  "logs",
  "serviceLogs",
  "readonlyDiagnostics",
  "more",
] as const;

export type PanelRouteId = (typeof PANEL_ROUTE_IDS)[number];

export const PANEL_RISK_CONTEXT = {
  resource: ["trafficLoad", "资源阈值"],
  interfaces: ["interfaces", "配置依赖接口"],
  "interface-review": ["interfaces", "待确认接口"],
  route: ["routes", "默认路由候选"],
} as const satisfies Record<string, readonly [PanelRouteId, string]>;
export type PanelRiskContext = keyof typeof PANEL_RISK_CONTEXT;

export function isPanelRiskContext(value: unknown): value is PanelRiskContext {
  return typeof value === "string" && value in PANEL_RISK_CONTEXT;
}

export function panelRiskOriginLabel(risk: PanelRiskContext, evidenceAt: string | null): string {
  return `来自运行概览 · ${PANEL_RISK_CONTEXT[risk][1]} · ${formatRfc3339Local(evidenceAt) || "证据时间未记录"}`;
}

export const PANEL_TASK_ROUTES = ["overview", "interfaces", "terminals", "logs"] as const;
export type PanelPrimaryDestination = (typeof PANEL_TASK_ROUTES)[number];
export type PanelWorkspaceGroup =
  | "overview"
  | "network"
  | "terminals"
  | "logs"
  | "resources"
  | "audit"
  | "dns"
  | "security"
  | "diagnostics"
  | "directory";
export type PanelRoutePlacement = "primary" | "workspace" | "more" | "directory";
export type PanelRouteMaturity = "complete" | "bounded-readonly" | "fallback" | "unavailable";

export const PANEL_ROUTE_MATURITY_LABELS: Record<PanelRouteMaturity, string> = {
  complete: "完整模块",
  "bounded-readonly": "有界只读",
  fallback: "基础视图",
  unavailable: "非模块入口",
};

export interface PanelRouteDefinition {
  id: PanelRouteId;
  title: string;
  shortTitle: string;
  description: string;
  primaryDestination: PanelPrimaryDestination;
  workspaceGroup: PanelWorkspaceGroup;
  placement: PanelRoutePlacement;
  maturity: PanelRouteMaturity;
}

export interface PanelNavigateOptions {
  replace?: boolean;
  focusId?: string | null;
  objectId?: string | null;
  query?: string | null;
  risk?: PanelRiskContext | null;
  returnRoute?: PanelRouteId | null;
  evidenceAt?: string | null;
}

export interface PanelNavigationContext {
  objectId: string | null;
  query: string | null;
  risk: PanelRiskContext | null;
  returnRoute: PanelRouteId | null;
  evidenceAt: string | null;
}

/**
 * Per-entry mobile collection state. URLs carry navigation evidence, while
 * history retains only bounded presentation choices for the route that owns
 * the entry.
 */
export interface PanelWorkspaceHistoryState {
  version: 1;
  route: PanelRouteId;
  search: string;
  filter: string;
  sort: string;
  page: number;
  toolsOpen: boolean;
  focusId: string | null;
  scrollY: number;
}

export type PanelWorkspaceHistoryUpdate = Omit<PanelWorkspaceHistoryState, "version" | "route">;

const MAX_WORKSPACE_TOKEN_LENGTH = 80;
const MAX_WORKSPACE_SEARCH_LENGTH = 160;
const MAX_WORKSPACE_FOCUS_LENGTH = 160;
const MAX_WORKSPACE_PAGE = 1_000;
const MAX_WORKSPACE_SCROLL_Y = 1_000_000;

function boundedHistoryToken(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function boundedWorkspaceSearch(value: unknown): string {
  return boundedHistoryToken(value, MAX_WORKSPACE_SEARCH_LENGTH) || "";
}

function boundedHistoryNumber(value: unknown, maximum: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(maximum, Math.max(0, Math.trunc(value)))
    : fallback;
}

export function createPanelWorkspaceHistoryState(route: PanelRouteId, value: Partial<PanelWorkspaceHistoryUpdate>): PanelWorkspaceHistoryState {
  return {
    version: 1,
    route,
    search: boundedWorkspaceSearch(value.search),
    filter: boundedHistoryToken(value.filter, MAX_WORKSPACE_TOKEN_LENGTH) || "all",
    sort: boundedHistoryToken(value.sort, MAX_WORKSPACE_TOKEN_LENGTH) || "name-asc",
    page: Math.max(1, boundedHistoryNumber(value.page, MAX_WORKSPACE_PAGE, 1)),
    toolsOpen: value.toolsOpen === true,
    focusId: boundedHistoryToken(value.focusId, MAX_WORKSPACE_FOCUS_LENGTH),
    scrollY: boundedHistoryNumber(value.scrollY, MAX_WORKSPACE_SCROLL_Y, 0),
  };
}

export function panelWorkspaceStateFromHistoryState(
  historyState: unknown,
  route: PanelRouteId,
): PanelWorkspaceHistoryState | null {
  if (!historyState || typeof historyState !== "object") return null;
  const workspace = (historyState as { panelWorkspace?: unknown }).panelWorkspace;
  if (!workspace || typeof workspace !== "object") return null;
  const value = workspace as Partial<PanelWorkspaceHistoryState>;
  if (
    value.version !== 1
    || value.route !== route
    || !boundedHistoryToken(value.filter, MAX_WORKSPACE_TOKEN_LENGTH)
    || !boundedHistoryToken(value.sort, MAX_WORKSPACE_TOKEN_LENGTH)
    || typeof value.toolsOpen !== "boolean"
  ) return null;
  return createPanelWorkspaceHistoryState(route, value as PanelWorkspaceHistoryUpdate);
}

export function withoutPanelWorkspaceHistoryState(historyState: unknown): Record<string, unknown> {
  if (!historyState || typeof historyState !== "object") return {};
  const { panelWorkspace: _workspace, ...rest } = historyState as Record<string, unknown>;
  return rest;
}

export type PanelNavigate = (route: PanelRouteId, options?: PanelNavigateOptions) => void;

export const PANEL_ROUTES: Record<PanelRouteId, PanelRouteDefinition> = {
  overview: { id: "overview", title: "运行概览", shortTitle: "概览", description: "服务、证据、默认出口与当前异常", primaryDestination: "overview", workspaceGroup: "overview", placement: "primary", maturity: "bounded-readonly" },
  interfaces: { id: "interfaces", title: "接口", shortTitle: "接口", description: "物理、VLAN、桥接与隧道接口状态", primaryDestination: "interfaces", workspaceGroup: "network", placement: "primary", maturity: "bounded-readonly" },
  lineStatus: { id: "lineStatus", title: "WAN 线路", shortTitle: "线路", description: "出口对象、接入关系与当前吞吐", primaryDestination: "interfaces", workspaceGroup: "network", placement: "workspace", maturity: "bounded-readonly" },
  balance: { id: "balance", title: "WAN 分流", shortTitle: "分流", description: "默认路由、策略标记与线路分布", primaryDestination: "interfaces", workspaceGroup: "network", placement: "more", maturity: "bounded-readonly" },
  routes: { id: "routes", title: "路由表", shortTitle: "路由", description: "默认、静态和动态路由证据", primaryDestination: "interfaces", workspaceGroup: "network", placement: "more", maturity: "bounded-readonly" },
  terminals: { id: "terminals", title: "在线终端", shortTitle: "终端", description: "终端身份、地址、流量与连接数", primaryDestination: "terminals", workspaceGroup: "terminals", placement: "primary", maturity: "bounded-readonly" },
  dhcp: { id: "dhcp", title: "DHCP", shortTitle: "DHCP", description: "地址租约、客户端与地址池", primaryDestination: "terminals", workspaceGroup: "terminals", placement: "workspace", maturity: "bounded-readonly" },
  arp: { id: "arp", title: "ARP", shortTitle: "ARP", description: "地址身份与冲突证据", primaryDestination: "terminals", workspaceGroup: "terminals", placement: "workspace", maturity: "bounded-readonly" },
  trafficLoad: { id: "trafficLoad", title: "资源与负载", shortTitle: "资源", description: "CPU、内存、磁盘与接口压力", primaryDestination: "overview", workspaceGroup: "resources", placement: "more", maturity: "bounded-readonly" },
  loadAudit: { id: "loadAudit", title: "采样审计", shortTitle: "采样审计", description: "资源采样序列、阈值与持续性", primaryDestination: "overview", workspaceGroup: "resources", placement: "more", maturity: "bounded-readonly" },
  trafficAudit: { id: "trafficAudit", title: "流量审计", shortTitle: "流量审计", description: "协议分布与高流量对象", primaryDestination: "interfaces", workspaceGroup: "audit", placement: "more", maturity: "bounded-readonly" },
  connections: { id: "connections", title: "连接跟踪", shortTitle: "连接", description: "活动连接、协议与对象检索", primaryDestination: "interfaces", workspaceGroup: "network", placement: "more", maturity: "bounded-readonly" },
  dns4: { id: "dns4", title: "IPv4 DNS", shortTitle: "DNS v4", description: "DNS 服务、上游与静态规则", primaryDestination: "interfaces", workspaceGroup: "dns", placement: "more", maturity: "bounded-readonly" },
  dns6: { id: "dns6", title: "IPv6 与 DNS", shortTitle: "DNS v6", description: "邻居发现、DHCPv6 与 DNS 发布", primaryDestination: "interfaces", workspaceGroup: "dns", placement: "more", maturity: "bounded-readonly" },
  security: { id: "security", title: "安全观察", shortTitle: "安全", description: "防火墙、地址集与只读告警", primaryDestination: "interfaces", workspaceGroup: "security", placement: "more", maturity: "bounded-readonly" },
  logs: { id: "logs", title: "运行日志", shortTitle: "日志", description: "最近系统、网络和服务事件", primaryDestination: "logs", workspaceGroup: "logs", placement: "primary", maturity: "bounded-readonly" },
  serviceLogs: { id: "serviceLogs", title: "服务日志", shortTitle: "服务日志", description: "按系统、防火墙、DHCP 与 DNS 分类", primaryDestination: "logs", workspaceGroup: "logs", placement: "workspace", maturity: "bounded-readonly" },
  readonlyDiagnostics: { id: "readonlyDiagnostics", title: "只读诊断", shortTitle: "诊断", description: "明确边界内的连通性证据", primaryDestination: "overview", workspaceGroup: "diagnostics", placement: "more", maturity: "bounded-readonly" },
  more: { id: "more", title: "更多工具", shortTitle: "更多", description: "路由、DNS、安全、审计与连接工具", primaryDestination: "overview", workspaceGroup: "directory", placement: "directory", maturity: "unavailable" },
};

export function isPanelRouteId(value: unknown): value is PanelRouteId {
  return typeof value === "string" && (PANEL_ROUTE_IDS as readonly string[]).includes(value);
}

export function isPanelEvidenceTimestamp(value: unknown): value is string {
  return isRfc3339Timestamp(value);
}

export function navigationContextFromLocation(location: Pick<Location, "search">): PanelNavigationContext {
  const query = new URLSearchParams(location.search);
  const routeValue = query.get("section");
  const route = isPanelRouteId(routeValue) ? routeValue : null;
  const objectId = query.get("object")?.trim() || null;
  const queryValue = query.get("q")?.trim() || null;
  const returnRouteValue = query.get("from");
  const returnRoute = isPanelRouteId(returnRouteValue) ? returnRouteValue : null;
  const evidenceAtValue = query.get("evidenceAt");
  const evidenceAt = isPanelEvidenceTimestamp(evidenceAtValue) ? evidenceAtValue : null;
  const riskValue = query.get("risk");
  const risk = route && returnRoute === "overview" && evidenceAt &&
    isPanelRiskContext(riskValue) && PANEL_RISK_CONTEXT[riskValue][0] === route
    ? riskValue
    : null;
  const hasEvidenceBackedReturn = Boolean(route && returnRoute && evidenceAt);
  if (!objectId && !risk && !hasEvidenceBackedReturn) {
    return { objectId: null, query: null, risk: null, returnRoute: null, evidenceAt: null };
  }
  return { objectId, query: queryValue, risk, returnRoute, evidenceAt };
}

export function routeFromLocation(location: Pick<Location, "hash" | "search">): PanelRouteId {
  const queryRoute = new URLSearchParams(location.search).get("section");
  if (isPanelRouteId(queryRoute)) return queryRoute;
  const legacyHash = (() => {
    try {
      return decodeURIComponent(location.hash.replace(/^#/, "").trim());
    } catch {
      return "";
    }
  })();
  return isPanelRouteId(legacyHash) ? legacyHash : "overview";
}

export function routeUrl(
  route: PanelRouteId,
  location: Pick<Location, "pathname" | "search"> = window.location,
  options: Pick<PanelNavigateOptions, "objectId" | "query" | "risk" | "returnRoute" | "evidenceAt"> = {},
): string {
  const query = new URLSearchParams(location.search);
  query.set("section", route);
  if (route !== "overview") query.delete("view");
  const overviewView = route === "overview" && query.get("view") === "incidents"
    ? "incidents"
    : null;
  if (options.objectId !== undefined) {
    if (options.objectId) query.set("object", options.objectId);
    else query.delete("object");
  }
  if (options.query !== undefined) {
    const value = options.query?.trim();
    if (value) query.set("q", value);
    else query.delete("q");
  }
  if (options.risk !== undefined) {
    if (options.risk && PANEL_RISK_CONTEXT[options.risk][0] === route) query.set("risk", options.risk);
    else query.delete("risk");
  }
  if (options.returnRoute !== undefined) {
    if (options.returnRoute) query.set("from", options.returnRoute);
    else query.delete("from");
  }
  if (options.evidenceAt !== undefined) {
    if (isPanelEvidenceTimestamp(options.evidenceAt)) query.set("evidenceAt", options.evidenceAt);
    else query.delete("evidenceAt");
  }

  const context = navigationContextFromLocation({ search: `?${query.toString()}` });
  // Rebuild rather than prune: the address bar may only represent context the
  // current surface can actually restore. In particular, a bare `q` cannot
  // filter a route and must not survive a refresh or history traversal.
  const canonical = new URLSearchParams();
  canonical.set("section", route);
  if (overviewView) canonical.set("view", overviewView);
  if (context.objectId) canonical.set("object", context.objectId);
  if (context.query) canonical.set("q", context.query);
  if (context.risk) canonical.set("risk", context.risk);
  if (context.returnRoute) canonical.set("from", context.returnRoute);
  if (context.evidenceAt) canonical.set("evidenceAt", context.evidenceAt);
  return `${location.pathname}?${canonical.toString()}`;
}
