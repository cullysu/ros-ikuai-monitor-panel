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

export interface PanelRouteDefinition {
  id: PanelRouteId;
  title: string;
  shortTitle: string;
  description: string;
  primaryDestination: PanelPrimaryDestination;
  workspaceGroup: PanelWorkspaceGroup;
  placement: PanelRoutePlacement;
}

export interface PanelNavigateOptions {
  replace?: boolean;
  objectId?: string | null;
}

export type PanelNavigate = (route: PanelRouteId, options?: PanelNavigateOptions) => void;

export const PANEL_ROUTES: Record<PanelRouteId, PanelRouteDefinition> = {
  overview: { id: "overview", title: "运行概览", shortTitle: "概览", description: "服务、证据、默认出口与当前异常", primaryDestination: "overview", workspaceGroup: "overview", placement: "primary" },
  interfaces: { id: "interfaces", title: "接口", shortTitle: "接口", description: "物理、VLAN、桥接与隧道接口状态", primaryDestination: "interfaces", workspaceGroup: "network", placement: "primary" },
  lineStatus: { id: "lineStatus", title: "WAN 线路", shortTitle: "线路", description: "出口对象、接入关系与当前吞吐", primaryDestination: "interfaces", workspaceGroup: "network", placement: "workspace" },
  balance: { id: "balance", title: "WAN 分流", shortTitle: "分流", description: "默认路由、策略标记与线路分布", primaryDestination: "interfaces", workspaceGroup: "network", placement: "more" },
  routes: { id: "routes", title: "路由表", shortTitle: "路由", description: "默认、静态和动态路由证据", primaryDestination: "interfaces", workspaceGroup: "network", placement: "more" },
  terminals: { id: "terminals", title: "在线终端", shortTitle: "终端", description: "终端身份、地址、流量与连接数", primaryDestination: "terminals", workspaceGroup: "terminals", placement: "primary" },
  dhcp: { id: "dhcp", title: "DHCP", shortTitle: "DHCP", description: "地址租约、客户端与地址池", primaryDestination: "terminals", workspaceGroup: "terminals", placement: "workspace" },
  arp: { id: "arp", title: "ARP", shortTitle: "ARP", description: "地址身份与冲突证据", primaryDestination: "terminals", workspaceGroup: "terminals", placement: "workspace" },
  trafficLoad: { id: "trafficLoad", title: "资源与负载", shortTitle: "资源", description: "CPU、内存、磁盘与接口压力", primaryDestination: "overview", workspaceGroup: "resources", placement: "more" },
  loadAudit: { id: "loadAudit", title: "负载审计", shortTitle: "负载审计", description: "资源采样序列、阈值与持续性", primaryDestination: "overview", workspaceGroup: "resources", placement: "more" },
  trafficAudit: { id: "trafficAudit", title: "流量审计", shortTitle: "流量审计", description: "协议分布与高流量对象", primaryDestination: "interfaces", workspaceGroup: "audit", placement: "more" },
  connections: { id: "connections", title: "连接跟踪", shortTitle: "连接", description: "活动连接、协议与对象检索", primaryDestination: "interfaces", workspaceGroup: "network", placement: "more" },
  dns4: { id: "dns4", title: "IPv4 DNS", shortTitle: "DNS v4", description: "DNS 服务、上游与静态规则", primaryDestination: "interfaces", workspaceGroup: "dns", placement: "more" },
  dns6: { id: "dns6", title: "IPv6 与 DNS", shortTitle: "DNS v6", description: "邻居发现、DHCPv6 与 DNS 发布", primaryDestination: "interfaces", workspaceGroup: "dns", placement: "more" },
  security: { id: "security", title: "安全观察", shortTitle: "安全", description: "防火墙、地址集与只读告警", primaryDestination: "interfaces", workspaceGroup: "security", placement: "more" },
  logs: { id: "logs", title: "运行日志", shortTitle: "日志", description: "最近系统、网络和服务事件", primaryDestination: "logs", workspaceGroup: "logs", placement: "primary" },
  serviceLogs: { id: "serviceLogs", title: "服务日志", shortTitle: "服务日志", description: "按系统、防火墙、DHCP 与 DNS 分类", primaryDestination: "logs", workspaceGroup: "logs", placement: "workspace" },
  readonlyDiagnostics: { id: "readonlyDiagnostics", title: "只读诊断", shortTitle: "诊断", description: "明确边界内的连通性证据", primaryDestination: "overview", workspaceGroup: "diagnostics", placement: "more" },
  more: { id: "more", title: "更多工具", shortTitle: "更多", description: "路由、DNS、安全、审计与连接工具", primaryDestination: "overview", workspaceGroup: "directory", placement: "directory" },
};

export function isPanelRouteId(value: unknown): value is PanelRouteId {
  return typeof value === "string" && (PANEL_ROUTE_IDS as readonly string[]).includes(value);
}

export function routeFromLocation(location: Pick<Location, "hash" | "search">): PanelRouteId {
  const hashRoute = decodeURIComponent(location.hash.replace(/^#/, "").trim());
  if (isPanelRouteId(hashRoute)) return hashRoute;
  const queryRoute = new URLSearchParams(location.search).get("section");
  return isPanelRouteId(queryRoute) ? queryRoute : "overview";
}

export function routeUrl(
  route: PanelRouteId,
  location: Pick<Location, "pathname" | "search"> = window.location,
  options: Pick<PanelNavigateOptions, "objectId"> = {},
): string {
  const query = new URLSearchParams(location.search);
  query.set("section", route);
  if (options.objectId !== undefined) {
    if (options.objectId) query.set("object", options.objectId);
    else query.delete("object");
  }
  return `${location.pathname}?${query.toString()}#${route}`;
}
