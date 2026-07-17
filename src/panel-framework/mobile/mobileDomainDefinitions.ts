import type { PanelRouteId } from "../routes/panelRoutes";
import type { WorkspaceRow } from "./mobileDomainWorkspaceModel";

export interface DomainFilterOption {
  id: string;
  label: string;
  matches: (row: WorkspaceRow) => boolean;
}

export interface DomainSortOption {
  id: string;
  label: string;
  compare: (left: WorkspaceRow, right: WorkspaceRow) => number;
}

export interface DomainDefinition {
  searchable: boolean;
  searchPlaceholder: string;
  objectLabel: string;
  defaultSort: string;
  filters: readonly DomainFilterOption[];
  sorts: readonly DomainSortOption[];
}

const ATTENTION = /未运行|停用|异常|失败|错误|警告|离线|不可用|critical|error|warning|down|offline|failed/i;
const RUNNING = /运行|在线|active|running|bound|online|活动|启用/i;

function text(row: WorkspaceRow): string {
  return [row.table, row.primary, row.secondary, row.trailing, row.searchText].join(" ").toLocaleLowerCase();
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "zh-CN", { numeric: true, sensitivity: "base" });
}

function numberOf(value: string | undefined): number {
  const match = String(value || "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : Number.NEGATIVE_INFINITY;
}

function rateOf(value: string | undefined): number {
  const input = String(value || "");
  const pattern = /(-?\d+(?:\.\d+)?)\s*(gbps|mbps|kbps|bps)/gi;
  let total = 0;
  let observed = false;
  for (const match of input.matchAll(pattern)) {
    const unit = match[2].toLowerCase();
    const multiplier = unit === "gbps" ? 1e9 : unit === "mbps" ? 1e6 : unit === "kbps" ? 1e3 : 1;
    total += Number(match[1]) * multiplier;
    observed = true;
  }
  if (observed) return total;
  return numberOf(input);
}

function timestampOf(value: string | undefined): number {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function ipValue(value: string | undefined): number[] {
  const address = String(value || "").split(/[ /]/)[0];
  const parts = address.split(".").map(Number);
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    ? parts
    : [Number.MAX_SAFE_INTEGER];
}

function compareIp(left: WorkspaceRow, right: WorkspaceRow): number {
  const a = ipValue(left.values.address || left.values.source);
  const b = ipValue(right.values.address || right.values.source);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference) return difference;
  }
  return compareText(left.primary, right.primary);
}

function filter(id: string, label: string, matches: (row: WorkspaceRow) => boolean): DomainFilterOption {
  return { id, label, matches };
}

function sort(id: string, label: string, compare: DomainSortOption["compare"]): DomainSortOption {
  return { id, label, compare };
}

const ALL = filter("all", "全部", () => true);
const ATTENTION_FILTER = filter("attention", "异常", (row) => ATTENTION.test(text(row)));
const RUNNING_FILTER = filter("running", "运行", (row) => RUNNING.test(text(row)) && !ATTENTION.test(text(row)));
const NAME_ASC = sort("name-asc", "名称正序", (left, right) => compareText(left.primary, right.primary));
const ATTENTION_FIRST = sort("attention-first", "异常优先", (left, right) => Number(ATTENTION.test(text(right))) - Number(ATTENTION.test(text(left))) || compareText(left.primary, right.primary));
const TRAFFIC_DESC = sort("traffic-desc", "流量从高到低", (left, right) => rateOf(right.values.traffic) - rateOf(left.values.traffic) || compareText(left.primary, right.primary));
const STATUS_FIRST = sort("status-first", "状态优先", (left, right) => Number(ATTENTION.test(text(right))) - Number(ATTENTION.test(text(left))) || compareText(left.trailing, right.trailing));

const DEFAULT_DOMAIN: DomainDefinition = {
  searchable: true,
  searchPlaceholder: "搜索当前对象",
  objectLabel: "对象",
  defaultSort: "name-asc",
  filters: [ALL],
  sorts: [NAME_ASC],
};

const DOMAIN: Partial<Record<PanelRouteId, DomainDefinition>> = {
  interfaces: {
    searchable: true,
    searchPlaceholder: "接口名、类型或上级",
    objectLabel: "接口",
    defaultSort: "attention-first",
    filters: [ALL, ATTENTION_FILTER, RUNNING_FILTER, filter("disabled", "停用", (row) => /停用/.test(text(row)))],
    sorts: [ATTENTION_FIRST, TRAFFIC_DESC, NAME_ASC],
  },
  lineStatus: {
    searchable: true,
    searchPlaceholder: "线路、父接口或接入方式",
    objectLabel: "WAN 线路",
    defaultSort: "attention-first",
    filters: [ALL, ATTENTION_FILTER, RUNNING_FILTER],
    sorts: [ATTENTION_FIRST, TRAFFIC_DESC, NAME_ASC],
  },
  balance: {
    searchable: true,
    searchPlaceholder: "网关、路由表或策略标记",
    objectLabel: "分流对象",
    defaultSort: "status-first",
    filters: [ALL, filter("active", "活动", (row) => /活动/.test(text(row)) && !/非活动/.test(text(row))), filter("policy", "策略", (row) => row.table === "策略规则")],
    sorts: [STATUS_FIRST, sort("distance-asc", "距离从低到高", (left, right) => numberOf(left.values.distance) - numberOf(right.values.distance) || compareText(left.primary, right.primary)), NAME_ASC],
  },
  routes: {
    searchable: true,
    searchPlaceholder: "目的、网关或路由表",
    objectLabel: "路由",
    defaultSort: "active-first",
    filters: [ALL, filter("active", "活动", (row) => /活动/.test(row.values.status || "") && !/非活动/.test(row.values.status || "")), filter("inactive", "非活动", (row) => /非活动|停用/.test(row.values.status || "")), filter("default", "默认", (row) => /^(?:0\.0\.0\.0\/0|::\/0)$/.test(row.values.destination || ""))],
    sorts: [sort("active-first", "活动优先", (left, right) => Number(/活动/.test(right.values.status || "") && !/非活动/.test(right.values.status || "")) - Number(/活动/.test(left.values.status || "") && !/非活动/.test(left.values.status || "")) || numberOf(left.values.distance) - numberOf(right.values.distance)), sort("distance-asc", "距离从低到高", (left, right) => numberOf(left.values.distance) - numberOf(right.values.distance)), NAME_ASC],
  },
  connections: {
    searchable: true,
    searchPlaceholder: "源、目标、端口或协议",
    objectLabel: "连接",
    defaultSort: "traffic-desc",
    filters: [ALL, filter("tcp", "TCP", (row) => /\btcp\b/i.test(text(row))), filter("udp", "UDP", (row) => /\budp\b/i.test(text(row)))],
    sorts: [TRAFFIC_DESC, sort("source-asc", "源地址", compareIp), sort("target-asc", "目标地址", (left, right) => compareText(left.values.target || "", right.values.target || ""))],
  },
  terminals: {
    searchable: true,
    searchPlaceholder: "终端名、IP 或 MAC",
    objectLabel: "终端",
    defaultSort: "traffic-desc",
    filters: [ALL, filter("online", "在线", (row) => /在线|active|bound/i.test(text(row)) && !ATTENTION.test(text(row))), ATTENTION_FILTER],
    sorts: [TRAFFIC_DESC, sort("connections-desc", "连接数从高到低", (left, right) => numberOf(right.values.connections) - numberOf(left.values.connections) || compareText(left.primary, right.primary)), sort("address-asc", "地址顺序", compareIp), NAME_ASC],
  },
  dhcp: {
    searchable: true,
    searchPlaceholder: "主机、IP、MAC 或接口",
    objectLabel: "DHCP 对象",
    defaultSort: "address-asc",
    filters: [ALL, filter("bound", "已绑定", (row) => /bound|运行|在线/i.test(text(row))), ATTENTION_FILTER],
    sorts: [sort("address-asc", "地址顺序", compareIp), STATUS_FIRST, NAME_ASC],
  },
  arp: {
    searchable: true,
    searchPlaceholder: "IP、MAC 或接口",
    objectLabel: "ARP 对象",
    defaultSort: "attention-first",
    filters: [ALL, filter("alerts", "身份告警", (row) => row.table === "身份告警"), filter("dynamic", "动态", (row) => /动态/.test(text(row))), filter("static", "静态", (row) => !/动态/.test(text(row)) && row.table === "ARP 对象")],
    sorts: [ATTENTION_FIRST, sort("address-asc", "地址顺序", compareIp), NAME_ASC],
  },
  trafficLoad: {
    searchable: false,
    searchPlaceholder: "",
    objectLabel: "资源指标",
    defaultSort: "utilization-desc",
    filters: [ALL],
    sorts: [sort("utilization-desc", "占用从高到低", (left, right) => numberOf(right.values.latest) - numberOf(left.values.latest))],
  },
  loadAudit: {
    searchable: false,
    searchPlaceholder: "",
    objectLabel: "采样序列",
    defaultSort: "samples-desc",
    filters: [ALL],
    sorts: [sort("samples-desc", "样本数从高到低", (left, right) => numberOf(right.values.samples) - numberOf(left.values.samples))],
  },
  trafficAudit: {
    searchable: true,
    searchPlaceholder: "地址、协议或流量对象",
    objectLabel: "流量对象",
    defaultSort: "traffic-desc",
    filters: [ALL, filter("tcp", "TCP", (row) => /\btcp\b/i.test(text(row))), filter("udp", "UDP", (row) => /\budp\b/i.test(text(row)))],
    sorts: [TRAFFIC_DESC, sort("connections-desc", "连接数从高到低", (left, right) => numberOf(right.values.connections) - numberOf(left.values.connections)), NAME_ASC],
  },
  dns4: {
    searchable: true,
    searchPlaceholder: "名称、类型或目标",
    objectLabel: "DNS 规则",
    defaultSort: "status-first",
    filters: [ALL, filter("enabled", "启用", (row) => /启用/.test(row.values.status || "") && !/停用/.test(row.values.status || "")), filter("disabled", "停用", (row) => /停用/.test(row.values.status || ""))],
    sorts: [STATUS_FIRST, NAME_ASC],
  },
  dns6: {
    searchable: true,
    searchPlaceholder: "接口、前缀或 DNS",
    objectLabel: "IPv6 对象",
    defaultSort: "status-first",
    filters: [ALL, ATTENTION_FILTER, filter("advertising", "发布 DNS", (row) => /发布 dns/i.test(text(row)))],
    sorts: [STATUS_FIRST, NAME_ASC],
  },
  security: {
    searchable: true,
    searchPlaceholder: "告警、链、动作或说明",
    objectLabel: "安全对象",
    defaultSort: "risk-first",
    filters: [ALL, filter("alerts", "告警", (row) => row.table === "安全告警"), filter("drop", "丢弃", (row) => /drop|reject|丢弃|拒绝/i.test(text(row))), filter("allow", "允许", (row) => /accept|allow|允许/i.test(text(row)))],
    sorts: [sort("risk-first", "告警优先", (left, right) => Number(right.table === "安全告警") - Number(left.table === "安全告警") || numberOf(left.values.order) - numberOf(right.values.order)), sort("rule-order", "规则顺序", (left, right) => numberOf(left.values.order) - numberOf(right.values.order)), NAME_ASC],
  },
  logs: {
    searchable: true,
    searchPlaceholder: "内容、主题或时间",
    objectLabel: "日志",
    defaultSort: "time-desc",
    filters: [ALL, filter("severity-error", "错误", (row) => /critical|error|fatal/i.test(text(row))), filter("severity-warning", "警告", (row) => /warning|warn/i.test(text(row))), filter("topic-system", "系统", (row) => /system|系统/i.test(text(row))), filter("topic-firewall", "防火墙", (row) => /firewall|防火墙/i.test(text(row)))],
    sorts: [sort("time-desc", "时间从新到旧", (left, right) => timestampOf(right.values.time) - timestampOf(left.values.time) || compareText(right.values.time || "", left.values.time || "")), sort("time-asc", "时间从旧到新", (left, right) => timestampOf(left.values.time) - timestampOf(right.values.time) || compareText(left.values.time || "", right.values.time || "")), NAME_ASC],
  },
  serviceLogs: {
    searchable: true,
    searchPlaceholder: "内容、服务或时间",
    objectLabel: "服务日志",
    defaultSort: "time-desc",
    filters: [ALL, filter("topic-system", "系统", (row) => /system|系统/i.test(text(row))), filter("topic-firewall", "防火墙", (row) => /firewall|防火墙/i.test(text(row))), filter("topic-dhcp", "DHCP", (row) => /dhcp/i.test(text(row))), filter("topic-dns", "DNS", (row) => /dns/i.test(text(row)))],
    sorts: [sort("time-desc", "时间从新到旧", (left, right) => timestampOf(right.values.time) - timestampOf(left.values.time) || compareText(right.values.time || "", left.values.time || "")), sort("time-asc", "时间从旧到新", (left, right) => timestampOf(left.values.time) - timestampOf(right.values.time) || compareText(left.values.time || "", right.values.time || ""))],
  },
  readonlyDiagnostics: {
    searchable: true,
    searchPlaceholder: "通道、端点或错误",
    objectLabel: "诊断记录",
    defaultSort: "attention-first",
    filters: [ALL, ATTENTION_FILTER],
    sorts: [ATTENTION_FIRST, NAME_ASC],
  },
};

export function domainDefinitionFor(route: PanelRouteId): DomainDefinition {
  return DOMAIN[route] || DEFAULT_DOMAIN;
}

export function filterWorkspaceRows(
  rows: readonly WorkspaceRow[],
  definition: DomainDefinition,
  filterId: string,
): WorkspaceRow[] {
  const option = definition.filters.find((item) => item.id === filterId) || definition.filters[0] || ALL;
  return rows.filter(option.matches);
}

export function sortWorkspaceRows(
  rows: readonly WorkspaceRow[],
  definition: DomainDefinition,
  sortId: string,
): WorkspaceRow[] {
  const option = definition.sorts.find((item) => item.id === sortId) || definition.sorts[0] || NAME_ASC;
  return [...rows].sort((left, right) => option.compare(left, right) || compareText(left.id, right.id));
}
