import { PANEL_ROUTES, type PanelRouteId } from "../routes/panelRoutes";
import {
  formatRate,
  isSnapshotUnavailable,
  latestBusinessSuccessTime,
  shortTimestamp,
  type OverviewRawSnapshot,
  type OverviewTone,
} from "../overview";
import { parseRfc3339Timestamp } from "../timeContract";

type UnknownRecord = Record<string, unknown>;

export interface SectionMetric {
  label: string;
  value: string;
  note?: string;
  tone?: OverviewTone;
}

export interface SectionColumn {
  key: string;
  label: string;
}

export interface SectionTable {
  title: string;
  note?: string;
  columns: SectionColumn[];
  rows: Array<Record<string, string>>;
  empty: string;
}

export interface SectionTimeSeries {
  key: "cpu" | "memory" | "disk";
  label: string;
  unit: "%";
  threshold: number;
  points: Array<{ timestamp: number; value: number }>;
}

export interface SectionTimeSeriesVisualization {
  kind: "time-series";
  title: string;
  windowLabel: string;
  min: 0;
  max: 100;
  series: SectionTimeSeries[];
  accessibleSummary: string;
}

export interface SectionModel {
  title: string;
  description: string;
  updatedAt: string;
  evidenceMode: "current" | "historical" | "unavailable";
  status: string;
  statusTone: OverviewTone;
  metrics: SectionMetric[];
  tables: SectionTable[];
  visualization?: SectionTimeSeriesVisualization;
}

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function rows(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter((item): item is UnknownRecord => Boolean(item && typeof item === "object" && !Array.isArray(item))) : [];
}

function text(value: unknown, fallback = "未记录"): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "是" : "否";
  return fallback;
}

function number(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const result = typeof value === "number" ? value : Number(value);
  return Number.isFinite(result) ? result : null;
}

function count(value: unknown): number {
  return rows(value).length;
}

function state(value: unknown, disabled?: unknown): string {
  if (disabled === true) return "已停用";
  if (value === true || String(value).toLowerCase() === "running" || String(value).toLowerCase() === "bound") return "运行";
  if (value === false) return "未运行";
  return text(value);
}

function rate(value: unknown): string {
  const observed = number(value);
  return observed === null ? "未取得" : formatRate(observed);
}

function table(title: string, columns: SectionColumn[], sourceRows: UnknownRecord[], map: (row: UnknownRecord, index: number) => Record<string, string>, empty: string, note?: string): SectionTable {
  return { title, columns, rows: sourceRows.map(map), empty, note };
}

function evidenceMode(snapshot: OverviewRawSnapshot): SectionModel["evidenceMode"] {
  if (isSnapshotUnavailable(snapshot) || !latestBusinessSuccessTime(snapshot)) return "unavailable";
  if (
    snapshot.meta?.clientEvidenceBoundary ||
    snapshot.meta?.realtimeError ||
    snapshot.meta?.slowRestError ||
    snapshot.meta?.staticError
  ) return "historical";
  return "current";
}

function base(route: PanelRouteId, snapshot: OverviewRawSnapshot): Pick<SectionModel, "title" | "description" | "updatedAt" | "evidenceMode" | "status" | "statusTone"> {
  const mode = evidenceMode(snapshot);
  const evidenceBoundary = snapshot.meta?.clientEvidenceBoundary;
  const boundaryLabel = evidenceBoundary ? "历史快照" : "";
  const successAt = latestBusinessSuccessTime(snapshot);
  return {
    title: PANEL_ROUTES[route].title,
    description: PANEL_ROUTES[route].description,
    updatedAt: successAt ? shortTimestamp(successAt) : "未记录",
    evidenceMode: mode,
    status: boundaryLabel || (mode === "unavailable" ? text(snapshot.error, "当前证据不可用") : mode === "historical" ? "历史快照 · 当前变化不可见" : "当前只读证据"),
    statusTone: mode === "unavailable" ? "danger" : mode === "historical" ? "warn" : "trust",
  };
}

function applyEvidenceBoundary(model: SectionModel): SectionModel {
  if (model.evidenceMode === "current") return model;
  if (model.evidenceMode === "historical") return {
    ...model,
    metrics: model.metrics.map((metric) => ({
      ...metric,
      label: metric.label.replace(/^当前/, "历史"),
      note: [metric.note, "历史记录，不代表当前"].filter(Boolean).join(" · "),
      tone: metric.tone === "danger" ? "danger" : "warn",
    })),
    tables: model.tables.map((item) => ({
      ...item,
      note: [item.note, "以下对象来自上次成功快照，不代表当前状态"].filter(Boolean).join(" · "),
    })),
  };
  return {
    ...model,
    visualization: undefined,
    metrics: [
      { label: "当前证据", value: "不可用", note: "业务数字已隐藏", tone: "danger" },
      { label: "最近成功", value: model.updatedAt || "未记录", note: "不使用尝试时间兜底", tone: model.updatedAt && model.updatedAt !== "未记录" ? "warn" : "missing" },
      { label: "业务对象", value: "不可判断", note: "等待新的成功快照", tone: "missing" },
    ],
    tables: model.tables.map((item) => ({
      ...item,
      rows: [],
      note: "当前证据不可用；未显示业务对象",
      empty: "没有可用于当前判断的业务快照",
    })),
  };
}

function historyTimestamp(value: unknown): number | null {
  const numeric = number(value);
  if (numeric !== null) return numeric < 1e12 ? numeric * 1000 : numeric;
  return parseRfc3339Timestamp(value);
}

function resourceVisualization(history: UnknownRecord): SectionTimeSeriesVisualization | undefined {
  const timestamps = Array.isArray(history.timestamps) ? history.timestamps : [];
  if (timestamps.length < 2) return undefined;
  const definitions: Array<{ key: SectionTimeSeries["key"]; label: string; threshold: number }> = [
    { key: "cpu", label: "CPU", threshold: 85 },
    { key: "memory", label: "内存", threshold: 85 },
    { key: "disk", label: "磁盘", threshold: 90 },
  ];
  const series = definitions.map((definition) => {
    const values = Array.isArray(history[definition.key]) ? history[definition.key] as unknown[] : [];
    const length = Math.min(timestamps.length, values.length);
    const points: SectionTimeSeries["points"] = [];
    for (let index = 0; index < length; index += 1) {
      const timestamp = historyTimestamp(timestamps[index]);
      const value = number(values[index]);
      if (timestamp !== null && value !== null && value >= 0 && value <= 100) points.push({ timestamp, value });
    }
    return { ...definition, unit: "%" as const, points };
  }).filter((item) => item.points.length >= 2);
  if (!series.length) return undefined;
  const allPoints = series.flatMap((item) => item.points);
  const start = Math.min(...allPoints.map((point) => point.timestamp));
  const end = Math.max(...allPoints.map((point) => point.timestamp));
  const durationSeconds = Math.max(0, Math.round((end - start) / 1000));
  const windowLabel = durationSeconds >= 60
    ? `最近 ${Math.max(1, Math.round(durationSeconds / 60))} 分钟`
    : `最近 ${Math.max(1, durationSeconds)} 秒`;
  const latest = series.map((item) => `${item.label} ${item.points[item.points.length - 1].value}%`).join("，");
  return {
    kind: "time-series",
    title: "资源压力时间序列",
    windowLabel,
    min: 0,
    max: 100,
    series,
    accessibleSummary: `${windowLabel}，${latest}；CPU 和内存阈值 85%，磁盘阈值 90%。`,
  };
}

function interfaceModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const items = rows(snapshot.interfaces);
  const down = items.filter((item) => item.running === false).length;
  const disabled = items.filter((item) => item.disabled === true).length;
  return {
    ...base(route, snapshot),
    metrics: [
      { label: "接口总数", value: String(items.length), tone: items.length ? "trust" : "missing" },
      { label: "未运行", value: String(down), tone: down ? "danger" : "trust" },
      { label: "已停用", value: String(disabled), tone: disabled ? "warn" : "trust" },
    ],
    tables: [table("接口对象", [
      { key: "name", label: "接口" }, { key: "kind", label: "类型 / 角色" }, { key: "status", label: "状态" }, { key: "parent", label: "上级" }, { key: "traffic", label: "接收 / 发送" },
    ], items, (item, index) => ({
      name: text(item.name || item.interface, `接口 ${index + 1}`),
      kind: `${text(item.type, "未知类型")} / ${text(item.role, "未标角色")}`,
      status: state(item.running, item.disabled),
      parent: text(item.parent || item.master || item.bridge),
      traffic: `${rate(item.rxRate ?? item.downRate)} / ${rate(item.txRate ?? item.upRate)}`,
    }), "当前快照没有接口对象")],
  };
}

function wanModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const items = rows(snapshot.wan).length ? rows(snapshot.wan) : rows(snapshot.pppoe);
  const running = items.filter((item) => item.running === true && item.disabled !== true).length;
  const observedRates = items.map((item) => ({ down: number(item.downRate), up: number(item.upRate) }));
  const ratesComplete = items.length > 0 && observedRates.every((item) => item.down !== null && item.up !== null);
  const downTotal = ratesComplete ? observedRates.reduce((sum, item) => sum + (item.down as number), 0) : null;
  const upTotal = ratesComplete ? observedRates.reduce((sum, item) => sum + (item.up as number), 0) : null;
  return {
    ...base(route, snapshot),
    metrics: [
      { label: "运行线路", value: `${running} / ${items.length}`, tone: items.length && running === 0 ? "danger" : "trust" },
      { label: "当前下载", value: downTotal === null ? "未取得" : formatRate(downTotal), tone: downTotal === null ? "missing" : "trust" },
      { label: "当前上传", value: upTotal === null ? "未取得" : formatRate(upTotal), tone: upTotal === null ? "missing" : "trust" },
    ],
    tables: [table("WAN 对象", [
      { key: "name", label: "线路" }, { key: "status", label: "状态" }, { key: "parent", label: "父接口" }, { key: "access", label: "接入" }, { key: "traffic", label: "下载 / 上传" },
    ], items, (item, index) => ({
      name: text(item.name || item.interface, `WAN ${index + 1}`),
      status: state(item.running, item.disabled),
      parent: text(item.parent),
      access: text(item.access || item.kind),
      traffic: `${rate(item.downRate)} / ${rate(item.upRate)}`,
    }), "当前快照没有 WAN 对象")],
  };
}

function routeModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const routeData = record(snapshot.routes);
  const routeItems = rows(routeData.items);
  const defaultRouteItems = rows(routeData.defaultRoutes);
  const items = routeItems.length ? routeItems : defaultRouteItems;
  const active = items.filter((item) => item.active === true && item.disabled !== true).length;
  const defaults = routeItems.length
    ? items.filter((item) => item.default === true || item.dstAddress === "0.0.0.0/0" || item.dstAddress === "::/0").length
    : defaultRouteItems.length;
  return {
    ...base(route, snapshot),
    metrics: [
      { label: "路由记录", value: String(items.length), tone: items.length ? "trust" : "missing" },
      { label: "活动记录", value: String(active), tone: active ? "trust" : "warn" },
      { label: "默认路由", value: String(defaults), tone: defaults ? "trust" : "warn" },
    ],
    tables: [table("路由记录", [
      { key: "destination", label: "目的" }, { key: "gateway", label: "网关" }, { key: "table", label: "路由表" }, { key: "distance", label: "距离" }, { key: "status", label: "状态" },
    ], items, (item) => ({
      destination: text(item.dstAddress, item.default === true ? "0.0.0.0/0" : "未记录"),
      gateway: text(item.gateway || item.gatewayStatus),
      table: text(item.table || item.routingTable, "main"),
      distance: text(item.distance),
      status: item.disabled === true ? "已停用" : item.active === true ? "活动" : "非活动",
    }), "当前快照没有路由记录")],
  };
}

function balanceModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const balance = record(snapshot.loadBalance);
  const defaults = rows(balance.defaultRoutes);
  const rules = [...rows(balance.mangleRules), ...rows(balance.routingRules)];
  const activeLines = number(balance.activeLines);
  return {
    ...base(route, snapshot),
    metrics: [
      { label: "工作模式", value: text(balance.mode), tone: "trust" },
      { label: "活动线路", value: activeLines === null ? "未记录" : String(activeLines), tone: activeLines === null ? "missing" : activeLines > 0 ? "trust" : "warn" },
      { label: "PCC", value: balance.pccDetected === true ? "已识别" : "未识别", tone: balance.pccDetected === true ? "trust" : "missing" },
    ],
    tables: [
      table("默认路由", [{ key: "gateway", label: "网关" }, { key: "table", label: "路由表" }, { key: "distance", label: "距离" }, { key: "status", label: "状态" }], defaults, (item) => ({ gateway: text(item.gateway), table: text(item.table), distance: text(item.distance), status: item.active === true ? "活动" : "非活动" }), "未取得默认路由"),
      table("策略规则", [{ key: "chain", label: "链 / 动作" }, { key: "mark", label: "标记 / 表" }, { key: "interface", label: "接口" }, { key: "comment", label: "说明" }], rules, (item) => ({ chain: `${text(item.chain, "rule")} / ${text(item.action)}`, mark: text(item.newRoutingMark || item.table || item.routingMark), interface: text(item.inInterface || item.outInterface || item.interface), comment: text(item.comment, "—") }), "未取得策略规则"),
    ],
  };
}

function terminalModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const items = rows(snapshot.terminals);
  const online = items.filter((item) => item.online === true || /^(?:online|active|reachable|bound)$/i.test(text(item.status, ""))).length;
  const connectionValues = items.map((item) => number(item.connections));
  const connectionsComplete = items.length > 0 && connectionValues.every((value) => value !== null);
  const connections = connectionsComplete ? connectionValues.reduce((sum, value) => sum + (value as number), 0) : null;
  return {
    ...base(route, snapshot),
    metrics: [
      { label: "终端记录", value: String(items.length), tone: items.length ? "trust" : "missing" },
      { label: "在线标记", value: String(online), tone: online ? "trust" : "missing" },
      { label: "连接合计", value: connections === null ? "未取得" : String(connections), tone: connections === null ? "missing" : "trust" },
    ],
    tables: [table("终端对象", [
      { key: "name", label: "终端" }, { key: "address", label: "IP / MAC" }, { key: "status", label: "状态" }, { key: "connections", label: "连接" }, { key: "traffic", label: "下载 / 上传" },
    ], items, (item, index) => ({
      name: text(item.displayName || item.hostname || item.name, `终端 ${index + 1}`),
      address: `${text(item.ip)} / ${text(item.mac)}`,
      status: text(item.status, item.online === true ? "在线" : "未确认"),
      connections: text(item.connections, "未取得"),
      traffic: `${rate(item.downRate)} / ${rate(item.upRate)}`,
    }), "当前快照没有终端记录")],
  };
}

function dhcpModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const dhcp = record(snapshot.dhcp);
  const leases = rows(dhcp.leases);
  const clients = rows(dhcp.clients);
  const pools = rows(dhcp.pools);
  return {
    ...base(route, snapshot),
    metrics: [
      { label: "租约", value: String(leases.length), tone: leases.length ? "trust" : "missing" },
      { label: "上游客户端", value: String(clients.length), tone: clients.length ? "trust" : "missing" },
      { label: "地址池", value: String(pools.length), tone: pools.length ? "trust" : "missing" },
    ],
    tables: [
      table("地址租约", [{ key: "host", label: "主机" }, { key: "address", label: "IP" }, { key: "mac", label: "MAC" }, { key: "server", label: "服务器" }, { key: "status", label: "状态" }], leases, (item) => ({ host: text(item.hostName || item.hostname), address: text(item.address), mac: text(item.macAddress || item.mac), server: text(item.server), status: text(item.status) }), "当前快照没有 DHCP 租约"),
      table("DHCP 客户端", [{ key: "interface", label: "接口" }, { key: "status", label: "状态" }, { key: "route", label: "默认路由" }, { key: "dns", label: "使用上游 DNS" }], clients, (item) => ({ interface: text(item.interface), status: text(item.status), route: text(item.addDefaultRoute), dns: text(item.usePeerDns) }), "当前快照没有 DHCP 客户端"),
    ],
  };
}

function arpModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const arp = record(snapshot.arp);
  const items = rows(arp.items).length ? rows(arp.items) : rows(snapshot.arp);
  const alerts = rows(arp.alerts);
  return {
    ...base(route, snapshot),
    metrics: [
      { label: "ARP 记录", value: String(items.length), tone: items.length ? "trust" : "missing" },
      { label: "身份告警", value: String(alerts.length), tone: alerts.length ? "danger" : "trust" },
      { label: "动态记录", value: String(items.filter((item) => item.dynamic === true).length), tone: "trust" },
    ],
    tables: [
      table("身份告警", [{ key: "address", label: "地址" }, { key: "kind", label: "类型" }, { key: "detail", label: "证据" }], alerts, (item) => ({ address: text(item.ip || item.address), kind: text(item.type || item.level, "冲突"), detail: text(item.message || item.detail) }), "没有记录到 ARP 身份告警"),
      table("ARP 对象", [{ key: "address", label: "IP" }, { key: "mac", label: "MAC" }, { key: "status", label: "状态" }, { key: "interface", label: "接口" }], items, (item) => ({ address: text(item.ip || item.address), mac: text(item.mac || item.macAddress), status: text(item.status, item.dynamic === true ? "动态" : "未确认"), interface: text(item.interface) }), "当前快照没有 ARP 记录"),
    ],
  };
}

function resourceModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const overview = record(snapshot.overview);
  const history = record(overview.history);
  const series = ["cpu", "memory", "disk"].map((key) => ({ key, values: Array.isArray(history[key]) ? history[key] as unknown[] : [] }));
  const cpu = number(overview.cpuLoad);
  const memory = number(overview.memoryUsage);
  const disk = number(overview.diskUsage);
  return {
    ...base(route, snapshot),
    visualization: resourceVisualization(history),
    metrics: [
      { label: "CPU", value: cpu === null ? "未取得" : `${cpu}%`, tone: cpu === null ? "missing" : cpu >= 85 ? "danger" : "trust" },
      { label: "内存", value: memory === null ? "未取得" : `${memory}%`, tone: memory === null ? "missing" : memory >= 85 ? "danger" : "trust" },
      { label: "磁盘", value: disk === null ? "未取得" : `${disk}%`, tone: disk === null ? "missing" : disk >= 90 ? "danger" : "trust" },
    ],
    tables: [table(route === "loadAudit" ? "资源采样摘要" : "资源证据", [{ key: "series", label: "对象" }, { key: "samples", label: "有效样本" }, { key: "latest", label: "最近值" }, { key: "range", label: "样本范围" }], series, (item) => {
      const values = Array.isArray(item.values) ? item.values : [];
      const observed = values.map((value) => number(value)).filter((value): value is number => value !== null && value >= 0 && value <= 100);
      return {
        series: item.key === "cpu" ? "CPU" : item.key === "memory" ? "内存" : "磁盘",
        samples: observed.length ? `${observed.length} 个` : "未取得",
        latest: observed.length ? `${observed[observed.length - 1]}%` : "未取得",
        range: observed.length ? `${Math.min(...observed)}% – ${Math.max(...observed)}%` : "未取得",
      };
    }, "当前快照没有资源采样记录", "没有配套时间戳时只显示样本摘要，不绘制趋势")],
  };
}

function connectionModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const connections = record(snapshot.connections);
  const active = rows(connections.active);
  const protocols = rows(connections.protocolTop);
  const topIps = rows(connections.topIps);
  const source = route === "connections" ? active : route === "trafficAudit" ? [...protocols, ...topIps] : active;
  const total = number(connections.total);
  return {
    ...base(route, snapshot),
    metrics: [
      { label: "连接总数", value: total === null ? "未取得" : String(total), tone: total === null ? "missing" : "trust" },
      { label: "当前明细", value: String(active.length), tone: active.length ? "trust" : "missing" },
      { label: "协议分组", value: String(protocols.length), tone: protocols.length ? "trust" : "missing" },
    ],
    tables: [table(route === "connections" ? "活动连接" : "流量对象", [{ key: "source", label: "源" }, { key: "target", label: "目标 / 协议" }, { key: "connections", label: "连接" }, { key: "traffic", label: "流量" }], source, (item) => {
      const remote = text(item.destination || item.remoteIp || item.dstAddress || item.dst, "");
      const protocol = text(item.protocol || item.label, "");
      return {
        source: text(item.source || item.localIp || item.srcAddress || item.src || item.ip || item.name),
        target: [remote, protocol].filter(Boolean).join(" / ") || "未记录",
        connections: text(item.connections ?? item.count, "—"),
        traffic: text(item.totalRate ?? item.bytes ?? item.value, "未取得"),
      };
    }, route === "connections" ? "当前快照没有活动连接明细" : "当前快照没有流量审计对象")],
  };
}

function dnsModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const dns = record(snapshot.dns);
  const ipv6 = route === "dns6";
  const source = ipv6 ? [...rows(dns.ipv6Nd), ...rows(dns.ipv6DhcpClients)] : rows(dns.forwardRules);
  const servers = Array.isArray(dns.servers) ? dns.servers : [];
  return {
    ...base(route, snapshot),
    metrics: ipv6 ? [
      { label: "ND 对象", value: String(count(dns.ipv6Nd)), tone: count(dns.ipv6Nd) ? "trust" : "missing" },
      { label: "DHCPv6 客户端", value: String(count(dns.ipv6DhcpClients)), tone: count(dns.ipv6DhcpClients) ? "trust" : "missing" },
      { label: "DNS 发布", value: String(rows(dns.ipv6Nd).filter((item) => item.advertiseDns === true).length), tone: "trust" },
    ] : [
      { label: "远程请求", value: dns.running === true ? "允许" : dns.running === false ? "未允许" : "未记录", tone: dns.running === true ? "trust" : dns.running === false ? "warn" : "missing" },
      { label: "上游服务器", value: String(servers.length), tone: servers.length ? "trust" : "warn" },
      { label: "静态规则", value: text(dns.forwardRuleCount, String(source.length)), tone: source.length ? "trust" : "missing" },
    ],
    tables: [table(ipv6 ? "IPv6 网络对象" : "DNS 静态规则", ipv6 ? [
      { key: "interface", label: "接口" }, { key: "status", label: "状态" }, { key: "prefix", label: "前缀 / DNS" }, { key: "route", label: "默认路由" },
    ] : [
      { key: "name", label: "名称" }, { key: "type", label: "类型" }, { key: "value", label: "目标" }, { key: "status", label: "状态" },
    ], source, (item): Record<string, string> => {
      if (ipv6) return { interface: text(item.interface), status: text(item.status, item.advertiseDns === true ? "发布 DNS" : "未确认"), prefix: text(item.prefix || item.dnsServers), route: text(item.addDefaultRoute) };
      return { name: text(item.name), type: text(item.type), value: text(item.value || item.address), status: item.disabled === true ? "已停用" : "启用" };
    }, ipv6 ? "当前快照没有 IPv6 ND/DHCP 对象" : "当前快照没有 DNS 静态规则")],
  };
}

function securityModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const security = record(snapshot.security);
  const filters = rows(security.filters);
  const alerts = rows(security.alerts);
  const addressLists = rows(security.addressLists);
  return {
    ...base(route, snapshot),
    metrics: [
      { label: "过滤规则", value: String(filters.length), tone: filters.length ? "trust" : "missing" },
      { label: "地址集", value: String(addressLists.length), tone: addressLists.length ? "trust" : "missing" },
      { label: "告警记录", value: String(alerts.length), tone: alerts.length ? "danger" : "trust" },
    ],
    tables: [
      table("安全告警", [{ key: "time", label: "时间" }, { key: "scope", label: "范围" }, { key: "message", label: "事件" }], alerts, (item) => ({ time: text(item.time || item.lastConfirmed), scope: text(item.affected || item.topics), message: text(item.abnormal || item.message) }), "当前快照没有安全告警"),
      table("防火墙规则", [{ key: "order", label: "顺序" }, { key: "chain", label: "链" }, { key: "action", label: "动作" }, { key: "comment", label: "说明" }], filters, (item) => ({ order: text(item.rawOrder), chain: text(item.chain), action: text(item.action), comment: text(item.comment, "—") }), "当前快照没有防火墙规则"),
    ],
  };
}

function logModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const logs = record(snapshot.logs);
  const all = rows(logs.all);
  const grouped = route === "serviceLogs" ? ["system", "firewall", "dhcp", "dns"].flatMap((group) => rows(logs[group]).map((item) => ({ ...item, group }))) : all;
  return {
    ...base(route, snapshot),
    metrics: [
      { label: "全部记录", value: String(all.length), tone: all.length ? "trust" : "missing" },
      { label: "防火墙", value: String(count(logs.firewall)), tone: count(logs.firewall) ? "warn" : "trust" },
      { label: "错误/警告", value: String(all.filter((item) => /error|warning|critical/i.test(text(item.topics, ""))).length), tone: "warn" },
    ],
    tables: [table(route === "serviceLogs" ? "分类日志" : "最近日志", [{ key: "time", label: "时间" }, { key: "topics", label: "主题" }, { key: "message", label: "内容" }], grouped, (item) => ({ time: text(item.time), topics: route === "serviceLogs" ? `${text(item.group)} · ${text(item.topics)}` : text(item.topics), message: text(item.message) }), "当前快照没有日志记录")],
  };
}

function diagnosticsModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const meta = record(snapshot.meta);
  const failures = [...rows(meta.realtimeEndpointFailures), ...rows(meta.staticEndpointFailures), ...rows(meta.detailEndpointFailures)];
  return {
    ...base(route, snapshot),
    status: "按需诊断受公开配置边界约束",
    statusTone: "warn",
    metrics: [
      { label: "REST 采集", value: meta.realtimeError ? "有错误" : "无错误记录", tone: meta.realtimeError ? "danger" : "trust" },
      { label: "SSH 采集", value: meta.staticError ? "有错误" : "无错误记录", tone: meta.staticError ? "danger" : "trust" },
      { label: "失败端点", value: failures.length ? String(failures.length) : "未记录", tone: failures.length ? "warn" : "missing" },
    ],
    tables: [table("采集与诊断边界", [{ key: "group", label: "通道" }, { key: "name", label: "对象" }, { key: "message", label: "记录" }], failures, (item) => ({ group: text(item.group), name: text(item.name), message: text(item.message, "失败端点记录") }), "没有失败端点记录；这不等于外部诊断已经执行", "公开 RouterOS-only 配置默认不执行外部只读探测")],
  };
}

function buildCurrentSectionModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  if (route === "interfaces") return interfaceModel(route, snapshot);
  if (route === "lineStatus") return wanModel(route, snapshot);
  if (route === "balance") return balanceModel(route, snapshot);
  if (route === "routes") return routeModel(route, snapshot);
  if (route === "terminals") return terminalModel(route, snapshot);
  if (route === "dhcp") return dhcpModel(route, snapshot);
  if (route === "arp") return arpModel(route, snapshot);
  if (route === "trafficLoad" || route === "loadAudit") return resourceModel(route, snapshot);
  if (route === "trafficAudit" || route === "connections") return connectionModel(route, snapshot);
  if (route === "dns4" || route === "dns6") return dnsModel(route, snapshot);
  if (route === "security") return securityModel(route, snapshot);
  if (route === "logs" || route === "serviceLogs") return logModel(route, snapshot);
  if (route === "readonlyDiagnostics") return diagnosticsModel(route, snapshot);
  return routeModel(route, snapshot);
}

export function buildSectionModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  return applyEvidenceBoundary(buildCurrentSectionModel(route, snapshot));
}
