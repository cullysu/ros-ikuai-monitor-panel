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

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "zh-CN", { numeric: true, sensitivity: "base" });
}

function compareNumber(left: number | null, right: number | null, direction: "asc" | "desc"): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return direction === "asc" ? left - right : right - left;
}

function ipValue(address: string): number[] {
  const candidate = address.split(/[ /]/)[0];
  const parts = candidate.split(".").map(Number);
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    ? parts
    : [Number.MAX_SAFE_INTEGER];
}

function compareIp(left: WorkspaceRow, right: WorkspaceRow): number {
  const a = ipValue(left.meta.address);
  const b = ipValue(right.meta.address);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference) return difference;
  }
  return compareText(left.primary, right.primary);
}

function hasTag(row: WorkspaceRow, tag: string): boolean {
  return row.meta.tags.includes(tag);
}

function filter(id: string, label: string, matches: (row: WorkspaceRow) => boolean): DomainFilterOption {
  return { id, label, matches };
}

function sort(id: string, label: string, compare: DomainSortOption["compare"]): DomainSortOption {
  return { id, label, compare };
}

const ALL = filter("all", "全部", () => true);
const ATTENTION_FILTER = filter("attention", "异常", (row) => row.meta.attention);
const RUNNING_FILTER = filter("running", "运行", (row) => (
  (row.meta.running === true || row.meta.state === "running" || row.meta.state === "online" || row.meta.state === "bound")
  && !row.meta.attention
));
const NAME_ASC = sort("name-asc", "名称正序", (left, right) => compareText(left.primary, right.primary));
const ATTENTION_FIRST = sort("attention-first", "异常优先", (left, right) => (
  Number(right.meta.attention) - Number(left.meta.attention)
  || compareText(left.primary, right.primary)
));
const TRAFFIC_DESC = sort("traffic-desc", "流量从高到低", (left, right) => (
  compareNumber(left.meta.trafficBps, right.meta.trafficBps, "desc")
  || compareText(left.primary, right.primary)
));
const STATUS_FIRST = sort("status-first", "状态优先", (left, right) => (
  Number(right.meta.attention) - Number(left.meta.attention)
  || compareText(left.meta.state, right.meta.state)
  || compareText(left.primary, right.primary)
));

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
    filters: [ALL, ATTENTION_FILTER, RUNNING_FILTER, filter("disabled", "停用", (row) => row.meta.disabled === true)],
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
    filters: [ALL, filter("active", "活动", (row) => row.meta.active === true), filter("policy", "策略", (row) => hasTag(row, "policy"))],
    sorts: [
      STATUS_FIRST,
      sort("distance-asc", "距离从低到高", (left, right) => compareNumber(left.meta.distance, right.meta.distance, "asc") || compareText(left.primary, right.primary)),
      NAME_ASC,
    ],
  },
  routes: {
    searchable: true,
    searchPlaceholder: "目的、网关或路由表",
    objectLabel: "路由",
    defaultSort: "active-first",
    filters: [
      ALL,
      filter("active", "活动", (row) => row.meta.active === true && row.meta.disabled !== true),
      filter("inactive", "非活动", (row) => row.meta.active === false || row.meta.disabled === true),
      filter("default", "默认", (row) => hasTag(row, "default")),
    ],
    sorts: [
      sort("active-first", "活动优先", (left, right) => (
        Number(right.meta.active === true && right.meta.disabled !== true) - Number(left.meta.active === true && left.meta.disabled !== true)
        || compareNumber(left.meta.distance, right.meta.distance, "asc")
        || compareText(left.primary, right.primary)
      )),
      sort("distance-asc", "距离从低到高", (left, right) => compareNumber(left.meta.distance, right.meta.distance, "asc") || compareText(left.primary, right.primary)),
      NAME_ASC,
    ],
  },
  connections: {
    searchable: true,
    searchPlaceholder: "源、目标、端口或协议",
    objectLabel: "连接",
    defaultSort: "traffic-desc",
    filters: [
      ALL,
      filter("tcp", "TCP", (row) => row.meta.protocol === "tcp" || hasTag(row, "protocol-tcp")),
      filter("udp", "UDP", (row) => row.meta.protocol === "udp" || hasTag(row, "protocol-udp")),
    ],
    sorts: [
      TRAFFIC_DESC,
      sort("source-asc", "源地址", compareIp),
      sort("target-asc", "目标地址", (left, right) => compareText(left.meta.targetAddress, right.meta.targetAddress) || compareText(left.primary, right.primary)),
    ],
  },
  terminals: {
    searchable: true,
    searchPlaceholder: "终端名、IP 或 MAC",
    objectLabel: "终端",
    defaultSort: "traffic-desc",
    filters: [
      ALL,
      filter("online", "在线", (row) => (row.meta.state === "online" || row.meta.running === true) && !row.meta.attention),
      ATTENTION_FILTER,
    ],
    sorts: [
      TRAFFIC_DESC,
      sort("connections-desc", "连接数从高到低", (left, right) => compareNumber(left.meta.connections, right.meta.connections, "desc") || compareText(left.primary, right.primary)),
      sort("address-asc", "地址顺序", compareIp),
      NAME_ASC,
    ],
  },
  dhcp: {
    searchable: true,
    searchPlaceholder: "主机、IP、MAC 或接口",
    objectLabel: "DHCP 对象",
    defaultSort: "address-asc",
    filters: [ALL, filter("bound", "已绑定", (row) => row.meta.state === "bound"), ATTENTION_FILTER],
    sorts: [sort("address-asc", "地址顺序", compareIp), STATUS_FIRST, NAME_ASC],
  },
  arp: {
    searchable: true,
    searchPlaceholder: "IP、MAC 或接口",
    objectLabel: "ARP 对象",
    defaultSort: "attention-first",
    filters: [
      ALL,
      filter("alerts", "身份告警", (row) => hasTag(row, "arp-alert")),
      filter("dynamic", "动态", (row) => hasTag(row, "dynamic")),
      filter("static", "静态", (row) => hasTag(row, "static")),
    ],
    sorts: [ATTENTION_FIRST, sort("address-asc", "地址顺序", compareIp), NAME_ASC],
  },
  trafficLoad: {
    searchable: false,
    searchPlaceholder: "",
    objectLabel: "资源指标",
    defaultSort: "utilization-desc",
    filters: [ALL],
    sorts: [sort("utilization-desc", "占用从高到低", (left, right) => compareNumber(left.meta.utilization, right.meta.utilization, "desc") || compareText(left.primary, right.primary))],
  },
  loadAudit: {
    searchable: false,
    searchPlaceholder: "",
    objectLabel: "采样序列",
    defaultSort: "samples-desc",
    filters: [ALL],
    sorts: [sort("samples-desc", "样本数从高到低", (left, right) => compareNumber(left.meta.sampleCount, right.meta.sampleCount, "desc") || compareText(left.primary, right.primary))],
  },
  trafficAudit: {
    searchable: true,
    searchPlaceholder: "地址、协议或流量对象",
    objectLabel: "流量对象",
    defaultSort: "traffic-desc",
    filters: [
      ALL,
      filter("tcp", "TCP", (row) => row.meta.protocol === "tcp" || hasTag(row, "protocol-tcp")),
      filter("udp", "UDP", (row) => row.meta.protocol === "udp" || hasTag(row, "protocol-udp")),
    ],
    sorts: [
      TRAFFIC_DESC,
      sort("connections-desc", "连接数从高到低", (left, right) => compareNumber(left.meta.connections, right.meta.connections, "desc") || compareText(left.primary, right.primary)),
      NAME_ASC,
    ],
  },
  dns4: {
    searchable: true,
    searchPlaceholder: "名称、类型或目标",
    objectLabel: "DNS 规则",
    defaultSort: "status-first",
    filters: [
      ALL,
      filter("enabled", "启用", (row) => hasTag(row, "enabled")),
      filter("disabled", "停用", (row) => hasTag(row, "disabled")),
    ],
    sorts: [STATUS_FIRST, NAME_ASC],
  },
  dns6: {
    searchable: true,
    searchPlaceholder: "接口、前缀或 DNS",
    objectLabel: "IPv6 对象",
    defaultSort: "status-first",
    filters: [ALL, ATTENTION_FILTER, filter("advertising", "发布 DNS", (row) => hasTag(row, "advertising"))],
    sorts: [STATUS_FIRST, NAME_ASC],
  },
  security: {
    searchable: true,
    searchPlaceholder: "告警、链、动作或说明",
    objectLabel: "安全对象",
    defaultSort: "risk-first",
    filters: [
      ALL,
      filter("alerts", "告警", (row) => hasTag(row, "security-alert")),
      filter("drop", "丢弃", (row) => hasTag(row, "drop")),
      filter("allow", "允许", (row) => hasTag(row, "allow")),
    ],
    sorts: [
      sort("risk-first", "告警优先", (left, right) => (
        Number(hasTag(right, "security-alert")) - Number(hasTag(left, "security-alert"))
        || compareNumber(left.meta.ruleOrder, right.meta.ruleOrder, "asc")
        || compareText(left.primary, right.primary)
      )),
      sort("rule-order", "规则顺序", (left, right) => compareNumber(left.meta.ruleOrder, right.meta.ruleOrder, "asc") || compareText(left.primary, right.primary)),
      NAME_ASC,
    ],
  },
  logs: {
    searchable: true,
    searchPlaceholder: "内容、主题或时间",
    objectLabel: "日志",
    defaultSort: "time-desc",
    filters: [
      ALL,
      filter("severity-error", "错误", (row) => row.meta.severity === "critical" || row.meta.severity === "error"),
      filter("severity-warning", "警告", (row) => row.meta.severity === "warning"),
      filter("topic-system", "系统", (row) => hasTag(row, "topic-system")),
      filter("topic-firewall", "防火墙", (row) => hasTag(row, "topic-firewall")),
    ],
    sorts: [
      sort("time-desc", "时间从新到旧", (left, right) => compareNumber(left.meta.timestamp, right.meta.timestamp, "desc") || compareText(right.primary, left.primary)),
      sort("time-asc", "时间从旧到新", (left, right) => compareNumber(left.meta.timestamp, right.meta.timestamp, "asc") || compareText(left.primary, right.primary)),
      NAME_ASC,
    ],
  },
  serviceLogs: {
    searchable: true,
    searchPlaceholder: "内容、服务或时间",
    objectLabel: "服务日志",
    defaultSort: "time-desc",
    filters: [
      ALL,
      filter("topic-system", "系统", (row) => hasTag(row, "topic-system")),
      filter("topic-firewall", "防火墙", (row) => hasTag(row, "topic-firewall")),
      filter("topic-dhcp", "DHCP", (row) => hasTag(row, "topic-dhcp")),
      filter("topic-dns", "DNS", (row) => hasTag(row, "topic-dns")),
    ],
    sorts: [
      sort("time-desc", "时间从新到旧", (left, right) => compareNumber(left.meta.timestamp, right.meta.timestamp, "desc") || compareText(right.primary, left.primary)),
      sort("time-asc", "时间从旧到新", (left, right) => compareNumber(left.meta.timestamp, right.meta.timestamp, "asc") || compareText(left.primary, right.primary)),
    ],
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
