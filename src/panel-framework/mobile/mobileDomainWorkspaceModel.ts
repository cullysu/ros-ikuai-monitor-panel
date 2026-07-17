import {
  Cable,
  CircleAlert,
  Gauge,
  Network,
  Router,
  ScrollText,
  ShieldCheck,
  TriangleAlert,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { OverviewTone } from "../overview";
import { PANEL_ROUTES, type PanelRouteId, type PanelWorkspaceGroup } from "../routes/panelRoutes";
import type { SectionColumn, SectionModel } from "../sections/sectionModels";
import { panelObjectIdForValues } from "../sections/panelObjectIdentity";


export interface WorkspaceRow {
  id: string;
  table: string;
  columns: SectionColumn[];
  values: Record<string, string>;
  primary: string;
  secondary: string;
  trailing: string;
  searchText: string;
}


const WORKSPACE_DEFINITIONS: Partial<Record<PanelWorkspaceGroup, {
  label: string;
  routes: Array<{ route: PanelRouteId; label: string }>;
}>> = {
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

export const MORE_ROUTE_GROUPS = [
  { id: "network", label: "路径与性能" },
  { id: "services", label: "审计与服务" },
] as const;

type MoreRouteGroup = (typeof MORE_ROUTE_GROUPS)[number]["id"];

const MORE_ROUTE_CATALOG: Array<{ route: PanelRouteId; label: string; group: MoreRouteGroup }> = [
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

export const MORE_ROUTES = MORE_ROUTE_CATALOG.filter(
  (item) => PANEL_ROUTES[item.route].placement === "more",
);


export const ATTENTION_PATTERN = /未运行|停用|异常|失败|错误|警告|离线|不可用|critical|error|warning|down|offline|failed/i;

export function routeTabs(route: PanelRouteId): Array<{ route: PanelRouteId; label: string }> {
  return WORKSPACE_DEFINITIONS[PANEL_ROUTES[route].workspaceGroup]?.routes || [];
}

export function workspaceLabel(route: PanelRouteId): string {
  return WORKSPACE_DEFINITIONS[PANEL_ROUTES[route].workspaceGroup]?.label || "只读工作区";
}

export function routeIcon(route: PanelRouteId): LucideIcon {
  const group = PANEL_ROUTES[route].workspaceGroup;
  if (group === "terminals") return UsersRound;
  if (group === "logs") return ScrollText;
  if (group === "resources") return Gauge;
  if (group === "dns" || route === "connections" || route === "trafficAudit") return Network;
  if (group === "security" || group === "diagnostics") return ShieldCheck;
  if (route === "interfaces" || route === "lineStatus") return Cable;
  return Router;
}

export function toneIcon(tone: OverviewTone) {
  if (tone === "danger") return CircleAlert;
  if (tone === "warn" || tone === "missing") return TriangleAlert;
  return ShieldCheck;
}

export function rowsFromModel(route: PanelRouteId, model: SectionModel): WorkspaceRow[] {
  const result: WorkspaceRow[] = [];
  const identityCounts = new Map<string, number>();
  model.tables.forEach((table) => {
    table.rows.forEach((values) => {
      const ordered = table.columns.map((column) => values[column.key] || "—");
      let primary = ordered[0] || "未命名对象";
      let secondary = ordered[1] || table.title;
      const statusColumn = table.columns.find((column) => column.key === "status" || column.key === "topics");
      let trailing = statusColumn ? values[statusColumn.key] || "—" : ordered[ordered.length - 1] || "—";

      if (route === "logs" || route === "serviceLogs") {
        primary = values.message || primary;
        secondary = values.time || secondary;
        trailing = values.topics || trailing;
      } else if (route === "connections") {
        primary = values.source || primary;
        secondary = values.target || secondary;
        trailing = values.traffic || trailing;
      } else if (route === "trafficAudit") {
        const target = values.target && values.target !== "未记录" ? values.target : "";
        primary = target || values.source || primary;
        secondary = values.connections && values.connections !== "—"
          ? `${values.connections} 个连接`
          : values.source || secondary;
        trailing = values.traffic || trailing;
      } else if (route === "security" && table.title === "防火墙规则") {
        const chain = values.chain && values.chain !== "—" ? values.chain : "";
        const action = values.action && values.action !== "—" ? values.action : "";
        primary = values.comment && !/^(?:—|未记录)$/.test(values.comment)
          ? values.comment
          : [chain, action].filter(Boolean).join(" / ") || primary;
        secondary = [chain, action].filter(Boolean).join(" · ") || secondary;
        trailing = values.order && !/^(?:—|未记录)$/.test(values.order)
          ? `#${values.order}`
          : action || trailing;
      } else if (route === "security" && table.title === "安全告警") {
        primary = values.message || primary;
        secondary = [values.time, values.scope].filter((value) => value && value !== "—").join(" · ") || secondary;
        trailing = values.scope || trailing;
      } else if (route === "dhcp" && table.title === "地址租约") {
        primary = values.host || primary;
        secondary = [values.address, values.mac].filter((value) => value && value !== "—").join(" · ") || secondary;
        trailing = values.status || trailing;
      } else if (route === "dhcp" && table.title === "DHCP 客户端") {
        primary = values.interface || primary;
        secondary = values.route && values.route !== "—" ? `默认路由 ${values.route}` : secondary;
        trailing = values.status || trailing;
      } else if ((route === "trafficLoad" || route === "loadAudit") && values.series) {
        primary = values.series;
        secondary = values.samples || secondary;
        trailing = values.latest || trailing;
      }

      const baseId = panelObjectIdForValues(route, table.title, values);
      const occurrence = identityCounts.get(baseId) || 0;
      identityCounts.set(baseId, occurrence + 1);
      result.push({
        id: occurrence ? `${baseId}-duplicate-${occurrence + 1}` : baseId,
        table: table.title,
        columns: table.columns,
        values,
        primary,
        secondary,
        trailing,
        searchText: Object.values(values).join(" ").toLocaleLowerCase(),
      });
    });
  });
  return result;
}


function selectedObjectFromUrl(): string {
  return new URLSearchParams(window.location.search).get("object") || "";
}

function objectUrl(id: string | null): string {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("object", id);
  else url.searchParams.delete("object");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function useObjectHistory(route: PanelRouteId) {
  const [selectedId, setSelectedId] = useState(() => (
    typeof window === "undefined" ? "" : selectedObjectFromUrl()
  ));

  useEffect(() => {
    const sync = () => setSelectedId(selectedObjectFromUrl());
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [route]);

  const open = (id: string) => {
    const state = { ...(window.history.state || {}), mobileObject: id };
    window.history.pushState(state, "", objectUrl(id));
    window.dispatchEvent(new PopStateEvent("popstate", { state }));
  };

  const close = () => {
    if (window.history.state?.mobileObject === selectedId) {
      window.history.back();
      return;
    }
    const state = { ...(window.history.state || {}) };
    delete state.mobileObject;
    window.history.replaceState(state, "", objectUrl(null));
    window.dispatchEvent(new PopStateEvent("popstate", { state }));
  };

  return { selectedId, open, close };
}
