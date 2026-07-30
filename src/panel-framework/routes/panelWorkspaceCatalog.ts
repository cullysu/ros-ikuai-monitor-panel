import {
  PANEL_ROUTES,
  type PanelRouteId,
  type PanelWorkspaceGroup,
} from "./panelRoutes";

export interface PanelWorkspaceTab {
  route: PanelRouteId;
  label: string;
}

interface PanelWorkspaceDefinition {
  label: string;
  routes: readonly PanelWorkspaceTab[];
}

const PANEL_WORKSPACE_DEFINITIONS: Partial<Record<PanelWorkspaceGroup, PanelWorkspaceDefinition>> = {
  network: {
    label: "网络工作区",
    routes: [
      { route: "interfaces", label: "接口" },
      { route: "lineStatus", label: "WAN" },
      { route: "balance", label: "分流" },
      { route: "routes", label: "路由" },
      { route: "connections", label: "连接" },
    ],
  },
  terminals: {
    label: "终端工作区",
    routes: [
      { route: "terminals", label: "终端" },
      { route: "dhcp", label: "DHCP" },
      { route: "arp", label: "ARP" },
    ],
  },
  logs: {
    label: "事件时间线",
    routes: [
      { route: "logs", label: "运行日志" },
      { route: "serviceLogs", label: "服务日志" },
    ],
  },
  resources: {
    label: "资源工作区",
    routes: [
      { route: "trafficLoad", label: "当前负载" },
      { route: "loadAudit", label: "采样审计" },
    ],
  },
  dns: {
    label: "DNS 工作区",
    routes: [
      { route: "dns4", label: "IPv4" },
      { route: "dns6", label: "IPv6" },
    ],
  },
  audit: { label: "流量审计", routes: [] },
  security: { label: "安全工作区", routes: [] },
  diagnostics: { label: "诊断工作区", routes: [] },
  directory: { label: "只读工具目录", routes: [] },
  overview: { label: "运行概览", routes: [] },
};

export const PANEL_MORE_ROUTE_GROUPS = [
  { id: "network", label: "路径与性能" },
  { id: "services", label: "审计与服务" },
] as const;

type PanelMoreRouteGroup = (typeof PANEL_MORE_ROUTE_GROUPS)[number]["id"];

const PANEL_MORE_ROUTE_CATALOG: Array<{ route: PanelRouteId; label: string; group: PanelMoreRouteGroup }> = [
  { route: "balance", label: "WAN 分流", group: "network" },
  { route: "routes", label: "路由表", group: "network" },
  { route: "connections", label: "连接跟踪", group: "network" },
  { route: "trafficLoad", label: "资源与负载", group: "network" },
  { route: "loadAudit", label: "负载审计", group: "network" },
  { route: "trafficAudit", label: "流量审计", group: "services" },
  { route: "dns4", label: "IPv4 DNS", group: "services" },
  { route: "dns6", label: "IPv6 与 DNS", group: "services" },
  { route: "security", label: "安全观察", group: "services" },
  { route: "readonlyDiagnostics", label: "只读诊断", group: "services" },
];

export const PANEL_MORE_ROUTES = PANEL_MORE_ROUTE_CATALOG.filter(
  (item) => PANEL_ROUTES[item.route].placement === "more",
);

export function panelWorkspaceTabs(route: PanelRouteId): readonly PanelWorkspaceTab[] {
  return PANEL_WORKSPACE_DEFINITIONS[PANEL_ROUTES[route].workspaceGroup]?.routes || [];
}

export function panelWorkspaceLabel(route: PanelRouteId): string {
  return PANEL_WORKSPACE_DEFINITIONS[PANEL_ROUTES[route].workspaceGroup]?.label || "只读工作区";
}
