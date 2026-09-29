/**
 * Snapshot-side models for the five readonly diagnostics feature pages. They
 * reuse the shared section-model helpers, keep the vanilla pages' content
 * baseline (collection freshness, DNS/probe context, WAN quality, terminal
 * risk ranking, system audit), and never invent a value: anything the snapshot
 * does not carry is reported as 未取得. Probe-side evidence lives in
 * ReadonlyDiagnosticsEvidence.tsx / readonlyDiagnosticsSchema.ts.
 */
import { shortTimestamp, type OverviewRawSnapshot, type OverviewTone } from "../overview";
import type { PanelRouteId } from "../routes/panelRoutes";
import { objectRows as rows, record, type UnknownRecord } from "./rawValue";
import {
  buildSectionBase,
  buildSectionTable,
  sectionCollectionAt,
  sectionNumber,
  sectionRate,
  sectionState,
  sectionText,
  type SectionMetric,
  type SectionModel,
  type SectionTable,
} from "./sectionModels";

const MIB = 1024 * 1024;
const GIB = 1024 * 1024 * 1024;
const TERMINAL_HIGH_RISK_SCORE = 45;

function formatBytesText(value: unknown): string {
  const observed = sectionNumber(value);
  if (observed === null || observed < 0) return "未取得";
  if (observed < 1024) return `${observed} B`;
  if (observed < MIB) return `${(observed / 1024).toFixed(1)} KB`;
  if (observed < GIB) return `${(observed / MIB).toFixed(1)} MB`;
  return `${(observed / GIB).toFixed(2)} GB`;
}

function nonNegativeSum(values: unknown[]): number {
  return values.reduce<number>((sum, value) => {
    const observed = sectionNumber(value);
    return observed !== null && observed > 0 ? sum + observed : sum;
  }, 0);
}

function interfaceErrorTotal(item: UnknownRecord): number | null {
  const observed = ["rxDrop", "txDrop", "rxError", "txError"].map((key) => sectionNumber(item[key]));
  return observed.every((value) => value === null) ? null : nonNegativeSum(observed);
}

function joinTags(value: unknown): string {
  if (!Array.isArray(value)) return "—";
  return value.filter((tag): tag is string => typeof tag === "string").join(" · ") || "—";
}

// Type aliases (not interfaces) keep implicit index signatures so the derived
// rows stay assignable to the section-table UnknownRecord[] source contract.
type CollectionChannelRow = {
  key: string;
  updatedAt: string | null;
  error: string | null;
  durationSeconds: number | null;
  failureCount: number;
};

type WanQualityRow = {
  name: string;
  parent: string;
  running: boolean | null;
  activeDefaults: number | null;
  share: number | null;
  errorTotal: number | null;
  quality: string;
};

type TerminalRiskRow = {
  name: string;
  address: string;
  score: number;
  connections: number | null;
  traffic: string;
  tags: string[];
};

function failureRows(meta: UnknownRecord, key: string): number {
  if (!Object.prototype.hasOwnProperty.call(meta, key)) return 0;
  return rows(meta[key]).length;
}

function collectionChannelRows(snapshot: OverviewRawSnapshot): CollectionChannelRow[] {
  const meta = record(snapshot.meta);
  const connections = record(snapshot.connections);
  const channel = (
    key: string,
    updatedAt: unknown,
    error: unknown,
    durationSeconds: unknown,
    failuresKey: string,
  ): CollectionChannelRow => ({
    key,
    updatedAt: sectionText(updatedAt, "") || null,
    error: error === null || error === undefined ? null : sectionText(error, "") || null,
    durationSeconds: sectionNumber(durationSeconds),
    failureCount: failureRows(meta, failuresKey),
  });
  return [
    channel("实时 REST 采集", meta.realtimeUpdatedAt || snapshot.updatedAt, meta.realtimeError, meta.realtimeDurationSeconds, "realtimeEndpointFailures"),
    channel("拓扑慢采 REST", meta.slowRestUpdatedAt, meta.slowRestError, meta.slowRestDurationSeconds, "slowRestEndpointFailures"),
    channel("SSH 连接详情", meta.connectionDetailUpdatedAt || connections.detailUpdatedAt, meta.connectionDetailError, meta.connectionDetailDurationSeconds || connections.detailDurationSeconds, "detailEndpointFailures"),
    channel("连接协议统计", meta.connectionProtocolUpdatedAt || meta.connectionDetailUpdatedAt, meta.connectionProtocolError, meta.connectionProtocolDurationSeconds || meta.connectionDetailDurationSeconds, "detailEndpointFailures"),
    channel("DNS 静态表", meta.staticUpdatedAt, meta.staticError, meta.staticDurationSeconds, "staticEndpointFailures"),
  ];
}

export function collectionHealthDiagnosticsModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const channels = collectionChannelRows(snapshot);
  const observed = channels.filter((row) => row.updatedAt || row.error).length;
  const erroring = channels.filter((row) => row.error).length;
  const latest = channels
    .map((row) => row.updatedAt)
    .filter((value): value is string => Boolean(value))
    .reduce<string | null>((acc, value) => (!acc || value > acc ? value : acc), null);
  const metrics: SectionMetric[] = [
    { label: "已记录通道", value: observed ? `${observed} / ${channels.length}` : "未取得", tone: observed ? "trust" : "missing", note: latest ? `最近通道成功 ${shortTimestamp(latest)}` : "快照元数据里的采集通道" },
    { label: "错误通道", value: observed ? String(erroring) : "未取得", tone: !observed ? "missing" : erroring ? "danger" : "trust" },
    { label: "失败端点", value: observed ? String(channels.reduce((sum, row) => sum + row.failureCount, 0)) : "未取得", tone: !observed ? "missing" : "warn", note: "历史失败记录，不代表当前" },
  ];
  const table: SectionTable = buildSectionTable(
    route,
    "采集通道新鲜度",
    [
      { key: "channel", label: "通道" },
      { key: "status", label: "状态" },
      { key: "updatedAt", label: "最后成功" },
      { key: "duration", label: "最近耗时" },
      { key: "failures", label: "失败端点记录" },
    ],
    channels,
    (item) => {
      const duration = sectionNumber(item.durationSeconds);
      return {
        channel: sectionText(item.key),
        status: item.error ? "错误" : item.updatedAt ? "已记录" : "未取得",
        updatedAt: item.updatedAt ? shortTimestamp(item.updatedAt) : "未记录",
        duration: duration === null ? "未取得" : `${duration}s`,
        failures: `${sectionNumber(item.failureCount) ?? 0}`,
      };
    },
    observed ? "当前快照没有采集通道记录" : "未取得采集通道记录",
    "只读探测的刷新时间与面板文件清单见下方只读探测证据。",
  );
  return {
    ...buildSectionBase(route, snapshot),
    metrics,
    tables: [table],
    ...(erroring ? { status: "存在错误通道 · 历史证据" } : {}),
  };
}

export function dnsProxyDiagnosticsModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const dns = record(snapshot.dns);
  const serverCollection = sectionCollectionAt(dns, "servers");
  const forwardCollection = sectionCollectionAt(dns, "forwardRules");
  const forwarders = serverCollection.rows;
  const staticRules = forwardCollection.rows;
  const staticDeclared = sectionText(dns.forwardRuleCount, "");
  return {
    ...buildSectionBase(route, snapshot),
    metrics: [
      { label: "远程请求", value: dns.running === true ? "允许" : dns.running === false ? "未允许" : "未记录", tone: dns.running === true ? "trust" : dns.running === false ? "warn" : "missing" },
      { label: "上游服务器", value: serverCollection.present ? String(forwarders.length) : "未取得", tone: serverCollection.present ? "trust" : "missing" },
      { label: "静态规则", value: !forwardCollection.present && !staticDeclared ? "未取得" : staticDeclared || String(staticRules.length), tone: forwardCollection.present || staticDeclared ? "trust" : "missing" },
    ],
    tables: [
      buildSectionTable(
        route,
        "DNS 上游服务器",
        [{ key: "server", label: "服务器" }, { key: "port", label: "端口" }, { key: "status", label: "状态" }],
        forwarders,
        (item) => ({
          server: sectionText(item.server || item.address),
          port: sectionText(item.port, "—"),
          status: sectionState(item.running, item.disabled),
        }),
        serverCollection.present ? "当前快照没有 DNS 上游服务器" : "未取得 DNS 上游服务器集合",
      ),
      buildSectionTable(
        route,
        "DNS 静态规则预览",
        [{ key: "name", label: "名称" }, { key: "type", label: "类型" }, { key: "value", label: "目标" }, { key: "status", label: "状态" }],
        staticRules.slice(0, 25),
        (item) => ({
          name: sectionText(item.name),
          type: sectionText(item.type),
          value: sectionText(item.value || item.address),
          status: item.disabled === true ? "已停用" : item.disabled === false ? "启用" : "未确认",
        }),
        forwardCollection.present ? "当前快照没有 DNS 静态规则" : "未取得静态规则集合",
        "仅预览前 25 条；完整分页在 IPv4 DNS 页。",
      ),
    ],
  };
}

export function wanQualityDiagnosticsModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const lines = rows(snapshot.pppoe).length ? rows(snapshot.pppoe) : rows(snapshot.wan);
  const interfacesByName = new Map(rows(snapshot.interfaces).map((item) => [sectionText(item.name || item.interface), item]));
  const distribution = rows(record(snapshot.loadBalance).distribution);
  const distributionByName = new Map(distribution.map((item) => [sectionText(item.name), item]));
  const shares = lines
    .map((item) => sectionNumber(distributionByName.get(sectionText(item.name || item.interface))?.share))
    .filter((value): value is number => value !== null);
  const expectedShare = shares.length ? 100 / shares.length : null;
  const qualityRows: WanQualityRow[] = lines.map((item, index) => {
    const name = sectionText(item.name || item.interface, `线路 ${index + 1}`);
    const iface = interfacesByName.get(name);
    const errorTotal = iface ? interfaceErrorTotal(iface) : null;
    const routes = rows(item.routes);
    const share = sectionNumber(distributionByName.get(name)?.share);
    const running = item.running === true && item.disabled !== true;
    const quality = item.running === false
      ? "离线"
      : errorTotal
        ? "接口错误"
        : share !== null && share > 55
          ? "负载偏斜"
          : running
            ? "正常"
            : "未确认";
    return {
      name,
      parent: sectionText(item.parent, "—"),
      running: item.running === undefined ? null : running,
      activeDefaults: routes.length ? routes.filter((route) => route.active === true).length : null,
      share,
      errorTotal,
      quality,
    };
  });
  const offline = qualityRows.filter((row) => row.running === false).length;
  const skewed = qualityRows.filter((row) => row.share !== null && expectedShare !== null && Math.abs(row.share - expectedShare) > 20).length;
  const erroring = qualityRows.filter((row) => (row.errorTotal ?? 0) > 0).length;
  const observedTone: OverviewTone = !lines.length ? "missing" : offline ? "danger" : erroring || skewed ? "warn" : "trust";
  return {
    ...buildSectionBase(route, snapshot),
    metrics: [
      { label: "运行线路", value: lines.length ? `${qualityRows.filter((row) => row.running === true).length} / ${qualityRows.length}` : "未取得", tone: observedTone },
      { label: "PCC 偏斜线路", value: shares.length ? String(skewed) : "未取得", tone: !shares.length ? "missing" : skewed ? "warn" : "trust", note: expectedShare === null ? undefined : `理论均分 ${expectedShare.toFixed(1)}% · 偏差 ±20%` },
      { label: "接口错误线路", value: lines.length ? String(erroring) : "未取得", tone: !lines.length ? "missing" : erroring ? "warn" : "trust" },
    ],
    tables: [
      buildSectionTable(
        route,
        "线路质量画像",
        [
          { key: "name", label: "线路" },
          { key: "status", label: "状态" },
          { key: "defaults", label: "默认路由" },
          { key: "share", label: "PCC 占比" },
          { key: "errors", label: "丢包/错误计数" },
          { key: "quality", label: "判断" },
        ],
        qualityRows,
        (item) => {
          const share = sectionNumber(item.share);
          return {
            name: `${sectionText(item.name)} · ${sectionText(item.parent, "—")}`,
            status: item.running === undefined || item.running === null ? "未取得" : item.running === true ? "运行" : "离线",
            defaults: item.activeDefaults === null || item.activeDefaults === undefined ? "未取得" : `${sectionNumber(item.activeDefaults)} 条`,
            share: share === null ? "未取得" : `${share.toFixed(1)}%`,
            errors: item.errorTotal === null || item.errorTotal === undefined ? "未取得" : `${sectionNumber(item.errorTotal)}`,
            quality: sectionText(item.quality, "未确认"),
          };
        },
        lines.length ? "当前快照没有 WAN 线路" : "未取得 WAN 线路集合",
        "延迟 / 丢包 / 抖动未采集，不作猜测；接口错误计数来自快照接口对象。",
        { routes: snapshot.routes },
      ),
    ],
  };
}

export function terminalRiskScore(row: UnknownRecord): number {
  const connections = sectionNumber(row.connections) ?? 0;
  const upRate = sectionNumber(row.upRate) ?? 0;
  const downRate = sectionNumber(row.downRate) ?? 0;
  const totalRate = upRate + downRate;
  const ip = sectionText(row.ip, "");
  const status = sectionText(row.status, "").toLowerCase();
  let score = 0;
  if (connections > 200) score += 35;
  else if (connections > 80) score += 20;
  if (totalRate > 5 * MIB) score += 25;
  if (upRate > 2 * MIB) score += 20;
  if ((sectionNumber(row.sessionBytes) ?? 0) > 2 * GIB) score += 15;
  if (ip.includes(":")) score += 8;
  if (["failed", "incomplete", "declined"].includes(status)) score += 20;
  return score;
}

function terminalRiskTags(row: UnknownRecord): string[] {
  const upRate = sectionNumber(row.upRate) ?? 0;
  const totalRate = upRate + (sectionNumber(row.downRate) ?? 0);
  const tags: string[] = [];
  if ((sectionNumber(row.connections) ?? 0) > 200) tags.push("连接暴涨");
  if (upRate > 2 * MIB) tags.push("上传异常");
  if (totalRate > 5 * MIB) tags.push("大流量");
  if (sectionText(row.ip, "").includes(":")) tags.push("IPv6");
  if (!tags.length) tags.push("观察");
  return tags;
}

export function terminalRiskDiagnosticsModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const terminals = rows(snapshot.terminals);
  const ranked: TerminalRiskRow[] = terminals
    .map((item, index) => ({
      name: sectionText(item.displayName || item.hostname || item.name, `终端 ${index + 1}`),
      address: `${sectionText(item.ip, "IP 未取得")} / ${sectionText(item.mac, "MAC 未取得")}`,
      score: terminalRiskScore(item),
      connections: sectionNumber(item.connections),
      traffic: `${sectionRate(item.downRate)} / ${sectionRate(item.upRate)}`,
      tags: terminalRiskTags(item),
    }))
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
  const highRisk = ranked.filter((row) => row.score >= TERMINAL_HIGH_RISK_SCORE).length;
  const ipv6Terminals = ranked.filter((row) => row.tags.includes("IPv6")).length;
  const ipv6Meta = sectionNumber(record(snapshot.meta).ipv6TerminalCount);
  return {
    ...buildSectionBase(route, snapshot),
    metrics: [
      { label: "高危终端", value: terminals.length ? String(highRisk) : "未取得", tone: !terminals.length ? "missing" : highRisk ? "danger" : "trust", note: `风险分 ≥ ${TERMINAL_HIGH_RISK_SCORE}` },
      { label: "IPv6 终端", value: ipv6Meta !== null ? String(ipv6Meta) : terminals.length ? String(ipv6Terminals) : "未取得", tone: (ipv6Meta ?? 0) > 0 || (terminals.length && ipv6Terminals) ? "warn" : terminals.length ? "trust" : "missing" },
      { label: "终端记录", value: terminals.length ? String(terminals.length) : "未取得", tone: terminals.length ? "trust" : "missing" },
    ],
    tables: [
      buildSectionTable(
        route,
        "终端风险排行",
        [
          { key: "name", label: "终端" },
          { key: "address", label: "IP / MAC" },
          { key: "score", label: "风险分" },
          { key: "connections", label: "连接" },
          { key: "traffic", label: "下载 / 上传" },
          { key: "tags", label: "标签" },
        ],
        ranked,
        (item) => ({
          name: sectionText(item.name),
          address: sectionText(item.address),
          score: `${sectionNumber(item.score) ?? 0}`,
          connections: item.connections === null || item.connections === undefined ? "未取得" : `${sectionNumber(item.connections)}`,
          traffic: sectionText(item.traffic),
          tags: joinTags(item.tags),
        }),
        terminals.length ? "当前快照没有终端记录" : "未取得终端集合",
        "风险分由连接数、速率、流量、IPv6 与状态标记只读推算，不触发任何处置。",
        { dhcp: snapshot.dhcp, arp: snapshot.arp },
      ),
    ],
  };
}

export function systemAuditDiagnosticsModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const logs = record(snapshot.logs);
  const logCollection = sectionCollectionAt(logs, "all");
  const events = logCollection.rows.slice(0, 24);
  const interfaces = rows(snapshot.interfaces);
  const errorInterfaces = interfaces.filter((item) => (interfaceErrorTotal(item) ?? 0) > 0);
  const connections = record(snapshot.connections);
  const dns = record(snapshot.dns);
  const dhcp = record(snapshot.dhcp);
  const connectionTotal = sectionNumber(connections.total);
  const routeTables = sectionNumber(record(snapshot.routes).tableCount);
  return {
    ...buildSectionBase(route, snapshot),
    metrics: [
      { label: "近期事件", value: logCollection.present ? String(logCollection.rows.length) : "未取得", tone: logCollection.present ? "warn" : "missing", note: "仅展示前 24 条" },
      { label: "连接总数", value: connectionTotal === null ? "未取得" : String(connectionTotal), tone: connectionTotal === null ? "missing" : "trust" },
      { label: "接口错误组", value: interfaces.length ? String(errorInterfaces.length) : "未取得", tone: !interfaces.length ? "missing" : errorInterfaces.length ? "warn" : "trust" },
    ],
    tables: [
      buildSectionTable(
        route,
        "近期事件",
        [{ key: "time", label: "时间" }, { key: "topics", label: "主题" }, { key: "message", label: "内容" }],
        events,
        (item) => ({
          time: sectionText(item.time || item.observedAt, "未记录"),
          topics: sectionText(item.topics, "—"),
          message: sectionText(item.message),
        }),
        logCollection.present ? "当前快照没有日志记录" : "未取得日志集合",
        "高价值系统事件；采集刷新与面板文件时间线见下方只读探测证据。",
        { logs },
      ),
      buildSectionTable(
        route,
        "接口错误",
        [
          { key: "name", label: "接口" },
          { key: "status", label: "状态" },
          { key: "traffic", label: "下载 / 上传" },
          { key: "drops", label: "丢包 RX/TX" },
          { key: "errors", label: "错误 RX/TX" },
        ],
        errorInterfaces,
        (item) => ({
          name: `${sectionText(item.name || item.interface)} · ${sectionText(item.type || item.role, "—")}`,
          status: sectionState(item.running, item.disabled),
          traffic: `${sectionRate(item.downRate ?? item.rxRate)} / ${sectionRate(item.upRate ?? item.txRate)}`,
          drops: `${sectionNumber(item.rxDrop) ?? 0} / ${sectionNumber(item.txDrop) ?? 0}`,
          errors: `${sectionNumber(item.rxError) ?? 0} / ${sectionNumber(item.txError) ?? 0}`,
        }),
        interfaces.length ? "当前快照没有接口错误计数" : "未取得接口集合",
        "按逻辑接口展示；计数为快照采样值，不代表持续速率。",
      ),
      buildSectionTable(
        route,
        "容量与缓存",
        [{ key: "item", label: "容量项" }, { key: "value", label: "当前值" }, { key: "note", label: "说明" }],
        [
          { item: "DNS 静态规则", value: sectionText(dns.forwardRuleCount, rows(dns.forwardRules).length ? String(rows(dns.forwardRules).length) : "未取得"), note: `${sectionText(dns.disabledForwardRuleCount, "—")} 条停用` },
          { item: "DNS 缓存占用", value: `${formatBytesText(dns.cacheUsed)} / ${formatBytesText(dns.cacheSize)}`, note: "RouterOS DNS 缓存" },
          { item: "DHCP 租约", value: String(rows(dhcp.leases).length), note: "当前快照" },
          { item: "连接总数", value: connectionTotal === null ? "未取得" : String(connectionTotal), note: `路由表 ${routeTables === null ? "未取得" : routeTables} 张` },
          { item: "只读写入", value: "0", note: "本页禁止写配置" },
        ],
        (item) => ({ item: sectionText(item.item), value: sectionText(item.value), note: sectionText(item.note, "—") }),
        "容量快照不可用",
      ),
    ],
  };
}
