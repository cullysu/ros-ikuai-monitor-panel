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
import { PANEL_ROUTES, type PanelRouteId } from "../routes/panelRoutes";
import type { SectionColumn, SectionModel } from "../sections/sectionModels";

export type FilterId = "all" | "attention" | "running" | "online" | "alerts" | "system" | "tcp" | "udp";
export type SortId = "source" | "asc" | "desc";

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

interface FilterOption {
  id: FilterId;
  label: string;
}

export interface DomainDefinition {
  icon: LucideIcon;
  filters: FilterOption[];
  searchable: boolean;
}

const NETWORK_ROUTES: Array<{ route: PanelRouteId; label: string }> = [
  { route: "interfaces", label: "接口" },
  { route: "lineStatus", label: "WAN" },
  { route: "routes", label: "路由" },
  { route: "connections", label: "连接" },
];

const TERMINAL_ROUTES: Array<{ route: PanelRouteId; label: string }> = [
  { route: "terminals", label: "终端" },
  { route: "dhcp", label: "DHCP" },
  { route: "arp", label: "ARP" },
];

const LOG_ROUTES: Array<{ route: PanelRouteId; label: string }> = [
  { route: "logs", label: "运行日志" },
  { route: "serviceLogs", label: "服务日志" },
];

export const MORE_ROUTE_GROUPS = [
  { id: "network", label: "路径与性能" },
  { id: "services", label: "审计与服务" },
] as const;

type MoreRouteGroup = (typeof MORE_ROUTE_GROUPS)[number]["id"];

export const MORE_ROUTES: Array<{ route: PanelRouteId; label: string; group: MoreRouteGroup }> = [
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

export const DOMAIN: Partial<Record<PanelRouteId, DomainDefinition>> = {
  interfaces: {
    icon: Cable,
    searchable: true,
    filters: [
      { id: "all", label: "全部" },
      { id: "attention", label: "异常" },
      { id: "running", label: "运行" },
    ],
  },
  terminals: {
    icon: UsersRound,
    searchable: true,
    filters: [
      { id: "all", label: "全部" },
      { id: "online", label: "在线" },
      { id: "attention", label: "待确认" },
    ],
  },
  logs: {
    icon: ScrollText,
    searchable: true,
    filters: [
      { id: "all", label: "全部" },
      { id: "alerts", label: "告警" },
      { id: "system", label: "系统" },
    ],
  },
  serviceLogs: {
    icon: ScrollText,
    searchable: true,
    filters: [
      { id: "all", label: "全部" },
      { id: "alerts", label: "告警" },
      { id: "system", label: "系统" },
    ],
  },
  connections: {
    icon: Network,
    searchable: true,
    filters: [
      { id: "all", label: "全部" },
      { id: "tcp", label: "TCP" },
      { id: "udp", label: "UDP" },
    ],
  },
  dns4: {
    icon: Network,
    searchable: true,
    filters: [
      { id: "all", label: "全部" },
      { id: "attention", label: "异常" },
      { id: "running", label: "启用" },
    ],
  },
  dns6: {
    icon: Network,
    searchable: true,
    filters: [
      { id: "all", label: "全部" },
      { id: "attention", label: "异常" },
      { id: "running", label: "启用" },
    ],
  },
};

export const DEFAULT_DOMAIN: DomainDefinition = {
  icon: Router,
  searchable: true,
  filters: [{ id: "all", label: "全部" }],
};

export const ATTENTION_PATTERN = /未运行|停用|异常|失败|错误|警告|离线|不可用|critical|error|warning|down|offline|failed/i;
const RUNNING_PATTERN = /运行|在线|active|running|bound|online/i;

export function routeTabs(route: PanelRouteId): Array<{ route: PanelRouteId; label: string }> {
  const group = PANEL_ROUTES[route].taskGroup;
  if (group === "terminals") return TERMINAL_ROUTES;
  if (group === "logs") return LOG_ROUTES;
  return NETWORK_ROUTES;
}

export function routeIcon(route: PanelRouteId): LucideIcon {
  if (DOMAIN[route]) return DOMAIN[route]!.icon;
  const group = PANEL_ROUTES[route].taskGroup;
  if (group === "terminals") return UsersRound;
  if (group === "logs") return ScrollText;
  if (route === "trafficLoad" || route === "loadAudit") return Gauge;
  if (route === "readonlyDiagnostics") return ShieldCheck;
  return Router;
}

export function toneIcon(tone: OverviewTone) {
  if (tone === "danger") return CircleAlert;
  if (tone === "warn" || tone === "missing") return TriangleAlert;
  return ShieldCheck;
}

function shortHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export function rowsFromModel(route: PanelRouteId, model: SectionModel): WorkspaceRow[] {
  const result: WorkspaceRow[] = [];
  model.tables.forEach((table, tableIndex) => {
    table.rows.forEach((values, rowIndex) => {
      const ordered = table.columns.map((column) => values[column.key] || "—");
      let primary = ordered[0] || `对象 ${rowIndex + 1}`;
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

      const identity = `${route}:${tableIndex}:${rowIndex}:${primary}`;
      result.push({
        id: `${route}-${tableIndex}-${rowIndex}-${shortHash(identity)}`,
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

export function filterMatches(filter: FilterId, row: WorkspaceRow): boolean {
  const text = row.searchText;
  if (filter === "all") return true;
  if (filter === "attention" || filter === "alerts") return ATTENTION_PATTERN.test(text);
  if (filter === "running" || filter === "online") {
    return RUNNING_PATTERN.test(text) && !ATTENTION_PATTERN.test(text);
  }
  if (filter === "system") return /system|系统/i.test(text);
  if (filter === "tcp") return /\btcp\b/i.test(text);
  if (filter === "udp") return /\budp\b/i.test(text);
  return true;
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
