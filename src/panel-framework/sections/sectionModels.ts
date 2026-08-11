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
import {
  compareResourceRisk,
  RESOURCE_METRIC_DEFINITIONS,
  resourceEvidenceWindow,
} from "../overview/evidence-model/resourceHistorySamples";
import { panelObjectIdentityPartsForRaw } from "./panelObjectIdentity";
import { buildSectionRowEvidence, type SectionEvidenceContext, type SectionRowEvidence } from "./sectionRowEvidence";
import {
  assessRawInterfaceOperationalState,
  type InterfaceOperationalImpact,
  type InterfaceOperationalReason,
} from "./interfaceOperationalAssessment";
import { objectRows as rows, record, type UnknownRecord } from "./rawValue";
import {
  diagnosticChannelSummaries,
  diagnosticFailureRows,
  hasDiagnosticFailures,
} from "./diagnosticFailureModel";
import { resourceTimeSeries } from "./resourceTimeSeries";

export interface SectionMetric {
  label: string;
  value: string;
  note?: string;
  tone?: OverviewTone;
  action?: PanelRouteId;
}

export interface SectionColumn {
  key: string;
  label: string;
}

export type SectionRowState =
  | "running"
  | "stopped"
  | "disabled"
  | "active"
  | "inactive"
  | "online"
  | "bound"
  | "warning"
  | "error"
  | "unknown"
  | "neutral";

export type SectionRowSeverity = "critical" | "error" | "warning" | "info" | "unknown";

export interface SectionRowMeta {
  state: SectionRowState;
  attention: boolean;
  running: boolean | null;
  active: boolean | null;
  disabled: boolean | null;
  severity: SectionRowSeverity;
  protocol: string;
  trafficBps: number | null;
  connections: number | null;
  timestamp: number | null;
  address: string;
  targetAddress: string;
  distance: number | null;
  utilization: number | null;
  sampleCount: number | null;
  ruleOrder: number | null;
  tags: string[];
  identityParts: string[];
  operationalImpact: InterfaceOperationalImpact;
  operationalReason: InterfaceOperationalReason | null;
}

export interface SectionTable {
  title: string;
  note?: string;
  columns: SectionColumn[];
  rows: Array<Record<string, string>>;
  rowMeta: SectionRowMeta[];
  rowEvidence: SectionRowEvidence[];
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
  min: number;
  max: number;
  series: SectionTimeSeries[];
  accessibleSummary: string;
}

export interface SectionModel {
  title: string;
  description: string;
  updatedAt: string;
  observedAt: string | null;
  evidenceMode: "current" | "historical" | "unavailable";
  status: string;
  statusTone: OverviewTone;
  metrics: SectionMetric[];
  tables: SectionTable[];
  visualization?: SectionTimeSeriesVisualization;
}

function text(value: unknown, fallback = "未记录"): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "是" : "否";
  return fallback;
}

function number(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function count(value: unknown): number {
  return rows(value).length;
}

interface CollectionState {
  present: boolean;
  rows: UnknownRecord[];
}

function collectionAt(parent: unknown, key: string): CollectionState {
  if (!parent || typeof parent !== "object" || Array.isArray(parent)) return { present: false, rows: [] };
  const source = parent as UnknownRecord;
  return Object.prototype.hasOwnProperty.call(source, key)
    ? { present: true, rows: rows(source[key]) }
    : { present: false, rows: [] };
}

function directCollection(parent: unknown, key: string): CollectionState {
  if (!parent || typeof parent !== "object" || Array.isArray(parent)) return { present: false, rows: [] };
  const source = parent as UnknownRecord;
  return Object.prototype.hasOwnProperty.call(source, key)
    ? { present: true, rows: rows(source[key]) }
    : { present: false, rows: [] };
}

function collectionCount(collection: CollectionState): string {
  return collection.present ? String(collection.rows.length) : "未取得";
}

function connectionDetailCoverageMetric(
  connections: UnknownRecord,
  activeCollection: CollectionState,
  reportedTotal: number | null,
): SectionMetric {
  if (!activeCollection.present) {
    return {
      label: "活动明细样本",
      value: "未取得",
      note: "活动明细集合未返回",
      tone: "missing",
    };
  }

  const activeMeta = record(record(connections.meta).active);
  const metadataTotal = number(activeMeta.totalCount ?? activeMeta.actualCount);
  const declaredShown = number(activeMeta.shownCount);
  const renderedCount = activeCollection.rows.length;
  const total = reportedTotal ?? metadataTotal;
  const metadataMismatch = (
    (reportedTotal !== null && metadataTotal !== null && reportedTotal !== metadataTotal)
    || (declaredShown !== null && declaredShown !== renderedCount)
  );
  const sampled = activeMeta.sampled === true;
  const hasMore = activeMeta.hasMore === true;
  const explicitlyComplete = (
    activeMeta.sampled === false
    && activeMeta.hasMore === false
    && total !== null
    && renderedCount === total
    && !metadataMismatch
  );

  if (metadataMismatch) {
    return {
      label: "活动明细样本",
      value: total === null ? `${renderedCount} 条` : `${renderedCount} / ${total}`,
      note: "覆盖元数据与可见行不一致",
      tone: "warn",
    };
  }

  if (sampled || hasMore) {
    return {
      label: "活动明细样本",
      value: total === null ? `${renderedCount} 条` : `${renderedCount} / ${total}`,
      note: "非全量枚举 · 活动速率样本",
      tone: "warn",
    };
  }

  if (explicitlyComplete) {
    return {
      label: "活动明细样本",
      value: `${renderedCount} / ${total}`,
      note: "快照声明完整枚举",
      tone: "trust",
    };
  }

  return {
    label: "活动明细样本",
    value: total === null ? `${renderedCount} 条` : `${renderedCount} / ${total}`,
    note: total === null ? "总连接数未取得 · 完整性未声明" : "完整性未声明",
    tone: "warn",
  };
}

function collectionTone(collection: CollectionState, nonEmptyTone: OverviewTone = "trust"): OverviewTone {
  return collection.present && collection.rows.length ? nonEmptyTone : collection.present ? "trust" : "missing";
}

function collectionEmpty(collection: CollectionState, empty: string): string {
  return collection.present ? empty : "未取得该对象集合";
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

function aggregateRate(item: UnknownRecord): number | null {
  const total = number(item.totalRate) ?? number(item.bytes) ?? number(item.value);
  if (total !== null) return total;
  const down = number(item.downRate);
  const up = number(item.upRate);
  return down !== null && up !== null ? down + up : null;
}

export function emptySectionRowMeta(overrides: Partial<SectionRowMeta> = {}): SectionRowMeta {
  return {
    state: "neutral",
    attention: false,
    running: null,
    active: null,
    disabled: null,
    severity: "unknown",
    protocol: "",
    trafficBps: null,
    connections: null,
    timestamp: null,
    address: "",
    targetAddress: "",
    distance: null,
    utilization: null,
    sampleCount: null,
    ruleOrder: null,
    tags: [],
    identityParts: [],
    operationalImpact: "none",
    operationalReason: null,
    ...overrides,
  };
}

function rawString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "boolean") return value ? "true" : "false";
  }
  return "";
}

function rawBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (["true", "yes", "running", "active", "bound", "online", "enabled", "up"].includes(normalized)) return true;
  if (["false", "no", "stopped", "inactive", "unbound", "offline", "disabled", "down"].includes(normalized)) return false;
  return null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const observed = number(value);
    if (observed !== null) return observed;
  }
  return null;
}

function observedTotal(...values: unknown[]): number | null {
  const observed = values.map((value) => number(value)).filter((value): value is number => value !== null);
  return observed.length ? observed.reduce((sum, value) => sum + value, 0) : null;
}

function rawSeverity(row: UnknownRecord, route: PanelRouteId): SectionRowSeverity {
  const evidence = [row.severity, row.level, row.topics]
    .map((value) => rawString(value).toLowerCase())
    .filter(Boolean)
    .join(" ");
  if (/(?:^|[\s,;:/_-])(critical|fatal|emergency|alert)(?:$|[\s,;:/_-])/.test(evidence)) return "critical";
  if (/(?:^|[\s,;:/_-])(error|failed|failure)(?:$|[\s,;:/_-])/.test(evidence)) return "error";
  if (/(?:^|[\s,;:/_-])(warning|warn|degraded)(?:$|[\s,;:/_-])/.test(evidence)) return "warning";
  if (/(?:^|[\s,;:/_-])(info|notice|debug)(?:$|[\s,;:/_-])/.test(evidence)) return "info";
  return route === "logs" || route === "serviceLogs" ? "info" : "unknown";
}

function statusState(value: unknown): SectionRowState {
  const normalized = rawString(value).toLowerCase();
  if (!normalized) return "unknown";
  if (["running", "up", "enabled", "reachable"].includes(normalized)) return "running";
  if (["online"].includes(normalized)) return "online";
  if (["bound"].includes(normalized)) return "bound";
  if (["active"].includes(normalized)) return "active";
  if (["inactive"].includes(normalized)) return "inactive";
  if (["disabled"].includes(normalized)) return "disabled";
  if (["stopped", "down", "offline", "unbound"].includes(normalized)) return "stopped";
  if (["critical", "fatal", "error", "failed", "failure"].includes(normalized)) return "error";
  if (["warning", "warn", "degraded"].includes(normalized)) return "warning";
  return "unknown";
}

function metadataFor(route: PanelRouteId, title: string, row: UnknownRecord, evidence: SectionRowEvidence): SectionRowMeta {
  const disabled = rawBoolean(row.disabled);
  const active = rawBoolean(row.active);
  const online = rawBoolean(row.online);
  let running = rawBoolean(row.running);
  const severity = rawSeverity(row, route);
  const protocol = rawString(row.protocol, row.label).toLowerCase();
  const directTraffic = firstNumber(row.totalRate, row.rate, row.bytes, row.value);
  const trafficBps = directTraffic ?? observedTotal(row.downRate, row.upRate, row.rxRate, row.txRate);
  const connections = firstNumber(row.connections, row.count);
  const timestampText = rawString(
    row.observedAt,
    row.lastConfirmed,
    row.timestamp,
    row.at,
    route === "logs" || route === "serviceLogs" ? "" : row.time,
  );
  const timestamp = timestampText ? parseRfc3339Timestamp(timestampText) : null;
  const address = rawString(row.address, row.ip, row.source, row.localIp, row.srcAddress, row.src);
  const targetAddress = rawString(row.destination, row.remoteIp, row.dstAddress, row.dst);
  const distance = firstNumber(row.distance);
  const observedSeries = Array.isArray(row.values)
    ? row.values.map((value) => number(value)).filter((value): value is number => value !== null)
    : [];
  const utilization = firstNumber(row.utilization, row.latest, row.value) ?? (observedSeries.length ? observedSeries[observedSeries.length - 1] : null);
  const sampleCount = observedSeries.length ? observedSeries.length : firstNumber(row.sampleCount, row.samples);
  const ruleOrder = firstNumber(row.rawOrder, row.order);
  const tags = new Set<string>();
  const status = rawString(row.status, row.state).toLowerCase();
  const topicText = [row.group, row.topics].map((value) => rawString(value).toLowerCase()).filter(Boolean).join(" ");
  const action = rawString(row.action).toLowerCase();
  const destination = rawString(row.dstAddress, row.destination);
  const isDefaultRoute = row.default === true || destination === "0.0.0.0/0" || destination === "::/0";

  if (protocol) tags.add(`protocol-${protocol}`);
  for (const topic of ["system", "firewall", "dhcp", "dns"]) {
    if (new RegExp(`(?:^|[\\s,;:/_-])${topic}(?:$|[\\s,;:/_-])`, "i").test(topicText)) tags.add(`topic-${topic}`);
  }
  if (severity !== "unknown") tags.add(`severity-${severity}`);
  if (isDefaultRoute) tags.add("default");
  if (title === "策略规则") tags.add("policy");
  if (title === "身份告警") tags.add("arp-alert");
  if (title === "安全告警") tags.add("security-alert");
  if (title === "采集与诊断边界") tags.add("diagnostic-failure");
  if (row.dynamic === true) tags.add("dynamic");
  if (row.dynamic === false) tags.add("static");
  if (row.advertiseDns === true) tags.add("advertising");
  if (disabled === true) tags.add("disabled");
  if (disabled === false) tags.add("enabled");
  if (["drop", "reject"].includes(action)) tags.add("drop");
  if (["accept", "allow"].includes(action)) tags.add("allow");

  if (route === "terminals" && running === null) running = online;
  if (route === "dhcp" && status === "bound") running = true;

  let rowState: SectionRowState;
  const interfaceEvidence = (route === "interfaces" || route === "lineStatus") && evidence.kind === "interface"
    ? evidence
    : null;

  if (disabled === true) {
    rowState = "disabled";
  } else if ((route === "trafficLoad" || route === "loadAudit") && utilization !== null) {
    const threshold = rawString(row.key, row.series).toLowerCase() === "disk" ? 90 : 85;
    rowState = utilization >= threshold ? "error" : "neutral";
  } else if (severity === "critical" || severity === "error") {
    rowState = "error";
  } else if (severity === "warning") {
    rowState = "warning";
  } else if (title === "身份告警" || title === "安全告警") {
    rowState = "warning";
  } else if (title === "采集与诊断边界") {
    rowState = "error";
  } else if (route === "routes" || (route === "balance" && title === "默认路由")) {
    rowState = active === true ? "active" : active === false ? "inactive" : "unknown";
  } else if (route === "interfaces" || route === "lineStatus") {
    rowState = running === true
      ? "running"
      : running === false
        ? interfaceEvidence?.operationalImpact === "risk" ? "error" : "warning"
        : "unknown";
  } else if (route === "terminals") {
    rowState = online === true ? "online" : online === false ? "stopped" : statusState(status);
  } else if (route === "dhcp" && status === "bound") {
    rowState = "bound";
  } else {
    rowState = statusState(status);
    if (rowState === "unknown") rowState = "neutral";
  }

  const attention = interfaceEvidence
    ? interfaceEvidence.operationalImpact === "risk"
    : disabled === true
      || rowState === "stopped"
      || rowState === "warning"
      || rowState === "error"
      || title === "身份告警"
      || title === "安全告警"
      || title === "采集与诊断边界";

  return emptySectionRowMeta({
    state: rowState,
    attention,
    running,
    active,
    disabled,
    severity,
    protocol,
    trafficBps,
    connections,
    timestamp,
    address,
    targetAddress,
    distance,
    utilization,
    sampleCount,
    ruleOrder,
    tags: [...tags].sort(),
    identityParts: panelObjectIdentityPartsForRaw(route, title, row),
    operationalImpact: interfaceEvidence?.operationalImpact || (attention ? "risk" : "none"),
    operationalReason: interfaceEvidence?.operationalReason || null,
  });
}

function table(route: PanelRouteId, title: string, columns: SectionColumn[], sourceRows: UnknownRecord[], map: (row: UnknownRecord, index: number) => Record<string, string>, empty: string, note?: string, evidenceContext: SectionEvidenceContext = {}): SectionTable {
  const rowEvidence = sourceRows.map((row) => buildSectionRowEvidence(route, title, row, evidenceContext));
  return {
    title,
    columns,
    rows: sourceRows.map(map),
    rowMeta: sourceRows.map((row, index) => metadataFor(route, title, row, rowEvidence[index])),
    rowEvidence,
    empty,
    note,
  };
}

function evidenceMode(snapshot: OverviewRawSnapshot): SectionModel["evidenceMode"] {
  if (isSnapshotUnavailable(snapshot) || !latestBusinessSuccessTime(snapshot)) return "unavailable";
  const meta = snapshot.meta;
  if (
    meta?.clientEvidenceBoundary ||
    meta?.realtimeError ||
    meta?.slowRestError ||
    meta?.staticError ||
    meta?.connectionDetailError ||
    meta?.connectionProtocolError ||
    hasDiagnosticFailures(meta)
  ) return "historical";
  return "current";
}

function base(route: PanelRouteId, snapshot: OverviewRawSnapshot, historicalStatus = "历史证据 · 不代表当前"): Pick<SectionModel, "title" | "description" | "updatedAt" | "observedAt" | "evidenceMode" | "status" | "statusTone"> {
  const mode = evidenceMode(snapshot);
  const successAt = latestBusinessSuccessTime(snapshot);
  return {
    title: PANEL_ROUTES[route].title,
    description: PANEL_ROUTES[route].description,
    updatedAt: successAt ? shortTimestamp(successAt) : "未记录",
    observedAt: successAt || null,
    evidenceMode: mode,
    status: mode === "unavailable" ? text(snapshot.error, "当前证据不可用") : mode === "historical" ? historicalStatus : "当前只读证据",
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
      tone: "warn",
    })),
    tables: model.tables.map((item) => ({
      ...item,
      note: [item.note, "以下对象为历史记录，不代表当前"].filter(Boolean).join(" · "),
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
      rowMeta: [],
      rowEvidence: [],
      note: "当前证据不可用；未显示业务对象",
      empty: "没有可用于当前判断的业务快照",
    })),
  };
}

function interfaceModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const available = Array.isArray(snapshot.interfaces);
  const items = rows(snapshot.interfaces);
  const down = items.filter((item) => item.running === false).length;
  const disabled = items.filter((item) => item.disabled === true).length;
  const assessments = items.map((item) => assessRawInterfaceOperationalState(item, snapshot.routes));
  const confirmedRisk = assessments.filter((item) => item.impact === "risk").length;
  const impactUnverified = assessments.filter((item) => item.observation === "not-running" && item.impact === "unverified").length;
  return {
    ...base(route, snapshot),
    metrics: [
      { label: "接口总数", value: available ? String(items.length) : "未取得", tone: !available ? "missing" : items.length ? "trust" : "warn" },
      {
        label: "未运行",
        value: available ? String(down) : "未取得",
        tone: !available ? "missing" : confirmedRisk ? "danger" : down ? "warn" : "trust",
        note: confirmedRisk
          ? `${confirmedRisk} 项有已启用默认路由依赖`
          : impactUnverified
            ? `${impactUnverified} 项影响未判定`
            : undefined,
      },
      { label: "已停用", value: available ? String(disabled) : "未取得", tone: !available ? "missing" : disabled ? "warn" : "trust" },
    ],
    tables: [table(route, "接口对象", [
      { key: "name", label: "接口" }, { key: "kind", label: "类型 / 角色" }, { key: "status", label: "状态" }, { key: "parent", label: "上级" }, { key: "traffic", label: "接收 / 发送" },
    ], items, (item, index) => ({
      name: text(item.name || item.interface, `接口 ${index + 1}`),
      kind: `${text(item.type, "未知类型")} / ${text(item.role, "未标角色")}`,
      status: state(item.running, item.disabled),
      parent: text(item.parent || item.master || item.bridge),
      traffic: `${rate(item.rxRate ?? item.downRate)} / ${rate(item.txRate ?? item.upRate)}`,
    }), "当前快照没有接口对象", undefined, { routes: snapshot.routes })],
  };
}

function wanModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const available = Array.isArray(snapshot.wan) || Array.isArray(snapshot.pppoe);
  const items = rows(snapshot.wan).length ? rows(snapshot.wan) : rows(snapshot.pppoe);
  const running = items.filter((item) => item.running === true && item.disabled !== true).length;
  const observedRates = items.map((item) => ({ down: number(item.downRate), up: number(item.upRate) }));
  const ratesComplete = items.length > 0 && observedRates.every((item) => item.down !== null && item.up !== null);
  const downTotal = ratesComplete ? observedRates.reduce((sum, item) => sum + (item.down as number), 0) : null;
  const upTotal = ratesComplete ? observedRates.reduce((sum, item) => sum + (item.up as number), 0) : null;
  return {
    ...base(route, snapshot),
    metrics: [
      { label: "运行线路", value: available ? `${running} / ${items.length}` : "未取得", tone: !available ? "missing" : items.length && running === 0 ? "danger" : items.length ? "trust" : "warn" },
      { label: "当前下载", value: downTotal === null ? "未取得" : formatRate(downTotal), tone: downTotal === null ? "missing" : "trust" },
      { label: "当前上传", value: upTotal === null ? "未取得" : formatRate(upTotal), tone: upTotal === null ? "missing" : "trust" },
    ],
    tables: [table(route, "WAN 对象", [
      { key: "name", label: "线路" }, { key: "status", label: "状态" }, { key: "parent", label: "父接口" }, { key: "access", label: "接入" }, { key: "traffic", label: "下载 / 上传" },
    ], items, (item, index) => ({
      name: text(item.name || item.interface, `WAN ${index + 1}`),
      status: state(item.running, item.disabled),
      parent: text(item.parent),
      access: text(item.access || item.kind),
      traffic: `${rate(item.downRate)} / ${rate(item.upRate)}`,
    }), "当前快照没有 WAN 对象", undefined, { routes: snapshot.routes })],
  };
}

function routeModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const routeData = record(snapshot.routes);
  const routeCollection = collectionAt(routeData, "items");
  const defaultRouteCollection = collectionAt(routeData, "defaultRoutes");
  const staticRouteCollection = collectionAt(routeData, "staticRoutes");
  const items = routeCollection.rows.length
    ? routeCollection.rows
    : defaultRouteCollection.rows.length
      ? defaultRouteCollection.rows
      : staticRouteCollection.rows;
  const routeCollectionObserved = routeCollection.present || defaultRouteCollection.present || staticRouteCollection.present;
  const active = items.filter((item) => item.active === true && item.disabled !== true).length;
  const defaults = routeCollection.rows.length
    ? items.filter((item) => item.default === true || item.dstAddress === "0.0.0.0/0" || item.dstAddress === "::/0").length
    : defaultRouteCollection.rows.length
      ? defaultRouteCollection.rows.length
      : staticRouteCollection.rows.filter((item) => item.default === true || item.dstAddress === "0.0.0.0/0" || item.dstAddress === "::/0").length;
  return {
    ...base(route, snapshot),
    metrics: [
      { label: "路由记录", value: routeCollectionObserved ? String(items.length) : "未取得", tone: routeCollectionObserved ? (items.length ? "trust" : "warn") : "missing" },
      { label: "活动记录", value: routeCollectionObserved ? String(active) : "未取得", tone: !routeCollectionObserved ? "missing" : active ? "trust" : "warn" },
      { label: "默认路由", value: routeCollectionObserved ? String(defaults) : "未取得", tone: !routeCollectionObserved ? "missing" : defaults ? "trust" : "warn" },
    ],
    tables: [table(route, "路由记录", [
      { key: "destination", label: "目的" }, { key: "gateway", label: "网关" }, { key: "table", label: "路由表" }, { key: "distance", label: "距离" }, { key: "status", label: "状态" },
    ], items, (item) => ({
      destination: text(item.dstAddress, item.default === true ? "0.0.0.0/0" : "未记录"),
      gateway: text(item.gateway || item.gatewayStatus),
      table: text(item.table || item.routingTable, "main"),
      distance: text(item.distance),
      status: item.disabled === true ? "已停用" : item.active === true ? "活动" : item.active === false ? "非活动" : "未确认",
    }), collectionEmpty({ present: routeCollectionObserved, rows: items }, "当前快照没有路由记录"), undefined, { interfaces: snapshot.interfaces, wan: snapshot.wan })],
  };
}

function balanceModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const balance = record(snapshot.loadBalance);
  const distributionCollection = collectionAt(balance, "distribution");
  const defaults = rows(balance.defaultRoutes);
  const rules = [...rows(balance.mangleRules), ...rows(balance.routingRules)];
  const activeLines = number(balance.activeLines);
  return {
    ...base(route, snapshot),
    metrics: [
      { label: "工作模式", value: text(balance.mode), tone: "trust" },
      { label: "活动线路", value: activeLines === null ? "未记录" : String(activeLines), tone: activeLines === null ? "missing" : activeLines > 0 ? "trust" : "warn" },
      { label: "PCC", value: balance.pccDetected === true ? "已识别" : balance.pccDetected === false ? "未识别" : "未记录", tone: balance.pccDetected === true ? "trust" : "missing" },
    ],
    tables: [
      table(route, "线路分布", [{ key: "name", label: "线路" }, { key: "share", label: "占比" }, { key: "status", label: "状态" }, { key: "traffic", label: "下载 / 上传" }], distributionCollection.rows, (item, index) => ({
        name: text(item.name || item.interface || item.lineId, `线路 ${index + 1}`),
        share: number(item.share) === null ? "未取得" : `${number(item.share)}%`,
        status: item.active === true ? "运行" : item.active === false ? "未运行" : "未确认",
        traffic: `${rate(item.downRate)} / ${rate(item.upRate)}`,
      }), collectionEmpty(distributionCollection, "未取得线路分布")),
      table(route, "默认路由", [{ key: "gateway", label: "网关" }, { key: "table", label: "路由表" }, { key: "distance", label: "距离" }, { key: "status", label: "状态" }], defaults, (item) => ({ gateway: text(item.gateway), table: text(item.table), distance: text(item.distance), status: item.active === true ? "活动" : item.active === false ? "非活动" : "未确认" }), "未取得默认路由", undefined, { interfaces: snapshot.interfaces, wan: snapshot.wan }),
      table(route, "策略规则", [{ key: "chain", label: "链 / 动作" }, { key: "mark", label: "标记 / 表" }, { key: "interface", label: "接口" }, { key: "comment", label: "说明" }], rules, (item) => ({ chain: `${text(item.chain, "rule")} / ${text(item.action)}`, mark: text(item.newRoutingMark || item.table || item.routingMark), interface: text(item.inInterface || item.outInterface || item.interface), comment: text(item.comment, "—") }), "未取得策略规则"),
    ],
  };
}

function terminalModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const terminalCollection = directCollection(snapshot, "terminals");
  const items = terminalCollection.rows;
  const online = items.filter((item) => {
    const observed = statusState(item.status);
    return item.online === true || observed === "online" || observed === "active" || observed === "running" || observed === "bound";
  }).length;
  const connectionValues = items.map((item) => number(item.connections));
  const connectionsComplete = items.length > 0 && connectionValues.every((value) => value !== null);
  const connections = connectionsComplete ? connectionValues.reduce((sum, value) => sum + (value as number), 0) : null;
  return {
    ...base(route, snapshot),
    metrics: [
      { label: "终端记录", value: collectionCount(terminalCollection), tone: collectionTone(terminalCollection) },
      { label: "在线标记", value: terminalCollection.present ? String(online) : "未取得", tone: !terminalCollection.present ? "missing" : online ? "trust" : "trust" },
      { label: "连接合计", value: !terminalCollection.present || connections === null ? "未取得" : String(connections), tone: !terminalCollection.present || connections === null ? "missing" : "trust" },
    ],
    tables: [table(route, "终端对象", [
      { key: "name", label: "终端" }, { key: "address", label: "IP / MAC" }, { key: "status", label: "状态" }, { key: "connections", label: "连接" }, { key: "traffic", label: "下载 / 上传" },
    ], items, (item, index) => ({
      name: text(item.displayName || item.hostname || item.name, `终端 ${index + 1}`),
      address: `${text(item.ip)} / ${text(item.mac)}`,
      status: text(item.status, item.online === true ? "在线" : "未确认"),
      connections: text(item.connections, "未取得"),
      traffic: `${rate(item.downRate)} / ${rate(item.upRate)}`,
      _mac: text(item.mac, ""),
    }), collectionEmpty(terminalCollection, "当前快照没有终端记录"), undefined, { dhcp: snapshot.dhcp, arp: snapshot.arp })],
  };
}

function dhcpModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const dhcp = record(snapshot.dhcp);
  const leaseCollection = collectionAt(dhcp, "leases");
  const clientCollection = collectionAt(dhcp, "clients");
  const poolCollection = collectionAt(dhcp, "pools");
  const leases = leaseCollection.rows;
  const clients = clientCollection.rows;
  const pools = poolCollection.rows;
  return {
    ...base(route, snapshot),
    metrics: [
      { label: "租约", value: collectionCount(leaseCollection), tone: collectionTone(leaseCollection) },
      { label: "上游客户端", value: collectionCount(clientCollection), tone: collectionTone(clientCollection) },
      { label: "地址池", value: collectionCount(poolCollection), tone: collectionTone(poolCollection) },
    ],
    tables: [
      table(route, "地址租约", [{ key: "host", label: "主机" }, { key: "address", label: "IP" }, { key: "mac", label: "MAC" }, { key: "server", label: "服务器" }, { key: "status", label: "状态" }], leases, (item) => ({ host: text(item.hostName || item.hostname), address: text(item.address), mac: text(item.macAddress || item.mac), server: text(item.server), status: text(item.status), _leaseId: text(item.id || item[".id"], "") }), collectionEmpty(leaseCollection, "当前快照没有 DHCP 租约"), undefined, { dhcp, arp: snapshot.arp }),
      table(route, "DHCP 客户端", [{ key: "interface", label: "接口" }, { key: "status", label: "状态" }, { key: "route", label: "默认路由" }, { key: "dns", label: "使用上游 DNS" }], clients, (item) => ({ interface: text(item.interface), status: text(item.status), route: text(item.addDefaultRoute), dns: text(item.usePeerDns) }), collectionEmpty(clientCollection, "当前快照没有 DHCP 客户端")),
      table(route, "地址池", [{ key: "name", label: "地址池" }, { key: "ranges", label: "范围" }, { key: "used", label: "已用" }, { key: "total", label: "容量" }, { key: "status", label: "状态" }], pools, (item) => {
        const used = number(item.used);
        const total = number(item.total);
        return {
          name: text(item.name || item.pool),
          ranges: text(item.ranges || item.range),
          used: used === null ? "未取得" : String(used),
          total: total === null ? "未取得" : String(total),
          status: used !== null && total !== null && total > 0 && used >= total ? "已满" : "可用",
        };
      }, collectionEmpty(poolCollection, "当前快照没有 DHCP 地址池")),
    ],
  };
}

function arpModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const arp = record(snapshot.arp);
  const arpItems = Array.isArray(snapshot.arp)
    ? { present: true, rows: rows(snapshot.arp) }
    : collectionAt(arp, "items");
  const alertCollection = collectionAt(arp, "alerts");
  const items = arpItems.rows;
  const alerts = alertCollection.rows;
  return {
    ...base(route, snapshot),
    metrics: [
      { label: "ARP 记录", value: collectionCount(arpItems), tone: collectionTone(arpItems) },
      { label: "身份告警", value: collectionCount(alertCollection), tone: !alertCollection.present ? "missing" : alerts.length ? "danger" : "trust" },
      { label: "动态记录", value: arpItems.present ? String(items.filter((item) => item.dynamic === true).length) : "未取得", tone: arpItems.present ? "trust" : "missing" },
    ],
    tables: [
      table(route, "身份告警", [{ key: "address", label: "地址" }, { key: "kind", label: "类型" }, { key: "detail", label: "证据" }], alerts, (item) => ({ address: text(item.ip || item.address), kind: text(item.type || item.level, "冲突"), detail: text(item.message || item.detail) }), collectionEmpty(alertCollection, "没有记录到 ARP 身份告警")),
      table(route, "ARP 对象", [{ key: "address", label: "IP" }, { key: "mac", label: "MAC" }, { key: "status", label: "状态" }, { key: "interface", label: "接口" }], items, (item) => ({ address: text(item.ip || item.address), mac: text(item.mac || item.macAddress), status: text(item.status, item.dynamic === true ? "动态" : "未确认"), interface: text(item.interface) }), collectionEmpty(arpItems, "当前快照没有 ARP 记录"), undefined, { dhcp: snapshot.dhcp, arp }),
    ],
  };
}

function resourceModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const resourceWindow = resourceEvidenceWindow(snapshot);
  const resourceMetrics = RESOURCE_METRIC_DEFINITIONS.map(({ key, label }) => {
    const metric = resourceWindow.metrics[key];
    return {
      key,
      label,
      value: metric.current,
      ...metric,
    };
  });
  const series = resourceMetrics.map(({ key, label, points, evidence }) => ({
    values: points.map((point) => point.value),
    key,
    label,
    sampleSequence: points.map((point) => ({ timestamp: new Date(point.timestamp).toISOString(), value: point.value })),
    timestamps: points.map((point) => new Date(point.timestamp).toISOString()),
    ...evidence,
  }));
  const priority = resourceMetrics
    .filter((metric) => metric.value !== null && metric.value >= metric.threshold)
    .sort((left, right) => compareResourceRisk(left.evidence, right.evidence))[0];
  return {
    ...base(route, snapshot),
    visualization: resourceTimeSeries({ metrics: resourceMetrics }),
    metrics: resourceMetrics.map((metric) => ({
      label: metric.label,
      value: metric.value === null ? "未取得" : `${metric.value}%`,
      note: metric.evidence.trailing ? `连续 ${metric.evidence.trailing} / ${metric.evidence.observed} 阈值 ${metric.threshold}%` : undefined,
      tone: metric.value === null ? "missing" : metric.value >= metric.threshold ? "danger" : "trust",
      action: metric === priority ? "loadAudit" : undefined,
    })),
    tables: [table(route, route === "loadAudit" ? "采样审计" : "资源证据", [{ key: "series", label: "对象" }, { key: "samples", label: "有效样本" }, { key: "latest", label: "最近值" }, { key: "range", label: "样本范围" }], series, (item) => {
      const values = Array.isArray(item.values) ? item.values : [];
      const observed = values.map((value) => number(value)).filter((value): value is number => value !== null && value >= 0 && value <= 100);
      return {
        series: text(item.label),
        samples: observed.length ? `${observed.length} 个` : "未取得",
        latest: observed.length ? `${observed[observed.length - 1]}%` : "未取得",
        range: observed.length ? `${Math.min(...observed)}% – ${Math.max(...observed)}%` : "未取得",
      };
    }, "当前快照没有资源采样记录", "没有配套时间戳时只显示样本摘要，不绘制趋势")],
  };
}

function connectionModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const connections = record(snapshot.connections);
  const activeCollection = collectionAt(connections, "active");
  const protocolCollection = collectionAt(connections, "protocolTop");
  const topIpCollection = collectionAt(connections, "topIps");
  const active = activeCollection.rows;
  const protocols = protocolCollection.rows;
  const topIps = topIpCollection.rows;
  const source = active;
  const sourceObserved = route === "connections"
    ? activeCollection.present
    : protocolCollection.present || topIpCollection.present;
  const total = number(connections.total);
  const detailCoverage = connectionDetailCoverageMetric(connections, activeCollection, total);
  return {
    ...base(route, snapshot),
    metrics: [
      { label: "连接总数", value: total === null ? "未取得" : String(total), tone: total === null ? "missing" : "trust" },
      detailCoverage,
      { label: "协议分组", value: protocolCollection.present ? String(protocols.length) : "未取得", tone: protocolCollection.present ? "trust" : "missing" },
    ],
    tables: route === "connections"
      ? [table(route, "活动连接", [{ key: "source", label: "源" }, { key: "target", label: "目标 / 协议" }, { key: "connections", label: "连接" }, { key: "traffic", label: "流量" }], source, mapConnectionRow, collectionEmpty({ present: sourceObserved, rows: source }, "当前快照没有活动连接明细"), `${detailCoverage.value} · ${detailCoverage.note}`)]
      : [
        table(route, "协议分布", [{ key: "protocol", label: "协议" }, { key: "connections", label: "连接" }, { key: "traffic", label: "流量" }, { key: "source", label: "采集来源" }], protocols, (item) => ({
          protocol: text(item.protocol || item.label || item.name),
          connections: text(item.connections ?? item.count, "未取得"),
          traffic: rate(item.totalRate ?? item.bytes ?? item.value),
          source: text(item.source, "未记录"),
        }), collectionEmpty(protocolCollection, "当前快照没有协议分布")),
        table(route, "终端流量对象", [{ key: "source", label: "终端" }, { key: "target", label: "目标" }, { key: "connections", label: "连接" }, { key: "traffic", label: "流量" }], topIps, mapConnectionRow, collectionEmpty(topIpCollection, "当前快照没有终端流量对象")),
      ],
  };
}

function mapConnectionRow(item: UnknownRecord): Record<string, string> {
  const remote = text(item.destination || item.remoteIp || item.dstAddress || item.dst, "");
  const protocol = text(item.protocol || item.label, "");
  return {
    source: text(item.source || item.localIp || item.srcAddress || item.src || item.ip || item.name),
    target: [remote, protocol].filter(Boolean).join(" / ") || "未记录",
    connections: text(item.connections ?? item.count, "—"),
    traffic: item.totalRate !== undefined || item.bytes !== undefined || item.value !== undefined
      ? text(item.totalRate ?? item.bytes ?? item.value, "未取得")
      : rate(aggregateRate(item)),
    _id: text(item.id || item[".id"], ""),
    _protocol: protocol,
    _sourcePort: text(item.sourcePort || item.srcPort, ""),
    _targetPort: text(item.destinationPort || item.dstPort, ""),
  };
}

function dnsModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const dns = record(snapshot.dns);
  const ipv6 = route === "dns6";
  const ndCollection = collectionAt(dns, "ipv6Nd");
  const dhcp6Collection = collectionAt(dns, "ipv6DhcpClients");
  const forwardCollection = collectionAt(dns, "forwardRules");
  const source = ipv6 ? [...ndCollection.rows, ...dhcp6Collection.rows] : forwardCollection.rows;
  const sourceObserved = ipv6 ? ndCollection.present || dhcp6Collection.present : forwardCollection.present;
  const serverCollection = collectionAt(dns, "servers");
  const servers = serverCollection.rows;
  return {
    ...base(route, snapshot),
    metrics: ipv6 ? [
      { label: "ND 对象", value: collectionCount(ndCollection), tone: collectionTone(ndCollection) },
      { label: "DHCPv6 客户端", value: collectionCount(dhcp6Collection), tone: collectionTone(dhcp6Collection) },
      { label: "DNS 发布", value: ndCollection.present ? String(ndCollection.rows.filter((item) => item.advertiseDns === true).length) : "未取得", tone: ndCollection.present ? "trust" : "missing" },
    ] : [
      { label: "远程请求", value: dns.running === true ? "允许" : dns.running === false ? "未允许" : "未记录", tone: dns.running === true ? "trust" : dns.running === false ? "warn" : "missing" },
      { label: "上游服务器", value: collectionCount(serverCollection), tone: collectionTone(serverCollection) },
      { label: "静态规则", value: !sourceObserved ? "未取得" : text(dns.forwardRuleCount, String(source.length)), tone: !sourceObserved ? "missing" : source.length ? "trust" : "trust" },
    ],
    tables: [table(route, ipv6 ? "IPv6 网络对象" : "DNS 静态规则", ipv6 ? [
      { key: "interface", label: "接口" }, { key: "status", label: "状态" }, { key: "prefix", label: "前缀 / DNS" }, { key: "route", label: "默认路由" },
    ] : [
      { key: "name", label: "名称" }, { key: "type", label: "类型" }, { key: "value", label: "目标" }, { key: "status", label: "状态" },
    ], source, (item): Record<string, string> => {
      if (ipv6) return { interface: text(item.interface), status: state(item.status, item.disabled), prefix: text(item.prefix || item.dnsServers), route: text(item.addDefaultRoute) };
      return { name: text(item.name), type: text(item.type), value: text(item.value || item.address), status: item.disabled === true ? "已停用" : item.disabled === false ? "启用" : "未确认" };
    }, collectionEmpty({ present: sourceObserved, rows: source }, ipv6 ? "当前快照没有 IPv6 ND/DHCP 对象" : "当前快照没有 DNS 静态规则"), undefined, { dns })],
  };
}

function securityModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const security = record(snapshot.security);
  const filterCollection = collectionAt(security, "filters");
  const alertCollection = collectionAt(security, "alerts");
  const addressListCollection = collectionAt(security, "addressLists");
  const filters = filterCollection.rows;
  const alerts = alertCollection.rows;
  const addressLists = addressListCollection.rows;
  return {
    ...base(route, snapshot),
    metrics: [
      { label: "过滤规则", value: collectionCount(filterCollection), tone: collectionTone(filterCollection) },
      { label: "地址集", value: collectionCount(addressListCollection), tone: collectionTone(addressListCollection) },
      { label: "告警记录", value: collectionCount(alertCollection), tone: !alertCollection.present ? "missing" : alerts.length ? "danger" : "trust" },
    ],
    tables: [
      table(route, "安全告警", [{ key: "time", label: "时间" }, { key: "scope", label: "范围" }, { key: "message", label: "事件" }], alerts, (item) => ({ time: text(item.time || item.lastConfirmed), scope: text(item.affected || item.topics), message: text(item.abnormal || item.message) }), collectionEmpty(alertCollection, "当前快照没有安全告警")),
      table(route, "防火墙规则", [{ key: "order", label: "顺序" }, { key: "chain", label: "链" }, { key: "action", label: "动作" }, { key: "comment", label: "说明" }], filters, (item) => ({ order: text(item.rawOrder), chain: text(item.chain), action: text(item.action), comment: text(item.comment, "—") }), collectionEmpty(filterCollection, "当前快照没有防火墙规则")),
      table(route, "地址集", [{ key: "list", label: "列表" }, { key: "address", label: "地址" }, { key: "timeout", label: "超时" }, { key: "comment", label: "说明" }], addressLists, (item) => ({ list: text(item.list || item.name), address: text(item.address || item.ip), timeout: text(item.timeout, "永久"), comment: text(item.comment, "—") }), collectionEmpty(addressListCollection, "当前快照没有安全地址集")),
    ],
  };
}

function serviceLogCategoryLabel(value: unknown): string {
  const category = text(value, "未知来源").toLowerCase();
  if (category === "system") return "系统";
  if (category === "firewall") return "防火墙";
  if (category === "dhcp") return "DHCP";
  if (category === "dns") return "DNS";
  return "来源未确认";
}

function serviceLogModel(snapshot: OverviewRawSnapshot): SectionModel {
  const logs = record(snapshot.logs);
  const grouped: UnknownRecord[] = ["system", "firewall", "dhcp", "dns"].flatMap((group) => rows(logs[group]).map((item) => ({ ...item, group })));
  const observedCategories = new Set(grouped.map((item) => serviceLogCategoryLabel(item.group)).filter((item) => item !== "来源未确认"));
  const warningCount = grouped.filter((item) => /error|warning|critical/i.test(text(item.topics, ""))).length;
  return {
    ...base("serviceLogs", snapshot, "历史服务证据 · 不代表当前"),
    metrics: [
      { label: "服务来源", value: grouped.length ? `${observedCategories.size} 类` : "未取得", tone: grouped.length ? "trust" : "missing", note: "仅统计有来源集合的记录" },
      { label: "分类记录", value: String(grouped.length), tone: grouped.length ? "trust" : "missing" },
      { label: "错误/警告", value: String(warningCount), tone: warningCount ? "warn" : "trust", note: "不等于服务当前健康" },
    ],
    tables: [table("serviceLogs", "服务分类日志", [{ key: "category", label: "服务" }, { key: "time", label: "时间" }, { key: "topics", label: "主题" }, { key: "message", label: "内容" }], grouped, (item) => ({ category: serviceLogCategoryLabel(item.group), time: text(item.observedAt), topics: text(item.topics), message: text(item.message) }), "没有可用于当前判断的服务日志", "按来源集合分开；分类缺失或没有记录不推断服务正常", { logs })],
  };
}

function logModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  if (route === "serviceLogs") return serviceLogModel(snapshot);
  const logs = record(snapshot.logs);
  const allCollection = collectionAt(logs, "all");
  const categoryCollections = ["system", "firewall", "dhcp", "dns"].map((key) => ({ key, collection: collectionAt(logs, key) }));
  const grouped = allCollection.rows.length
    ? allCollection.rows
    : categoryCollections.flatMap(({ key, collection }) => collection.rows.map((item) => ({ ...item, group: key })));
  const logCollectionObserved = allCollection.present || categoryCollections.some(({ collection }) => collection.present);
  const firewallCollection = categoryCollections.find(({ key }) => key === "firewall")?.collection || { present: false, rows: [] };
  return {
    ...base(route, snapshot),
    metrics: [
      { label: "全部记录", value: logCollectionObserved ? String(grouped.length) : "未取得", tone: !logCollectionObserved ? "missing" : grouped.length ? "trust" : "trust" },
      { label: "防火墙", value: collectionCount(firewallCollection), tone: !firewallCollection.present ? "missing" : firewallCollection.rows.length ? "warn" : "trust" },
      { label: "错误/警告", value: logCollectionObserved ? String(grouped.filter((item) => /error|warning|critical/i.test(text(item.topics, ""))).length) : "未取得", tone: logCollectionObserved ? "warn" : "missing" },
    ],
    tables: [table(route, "最近日志", [{ key: "time", label: "时间" }, { key: "topics", label: "主题" }, { key: "message", label: "内容" }], grouped, (item) => ({ time: text(item.observedAt), topics: text(item.topics), message: text(item.message) }), logCollectionObserved ? "当前快照没有日志记录" : "未取得日志集合", undefined, { logs })],
  };
}

function diagnosticsModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  const failures = diagnosticFailureRows(snapshot.meta);
  const channels = diagnosticChannelSummaries(snapshot.meta);
  const observedChannels = channels.filter((channel) => channel.observed).length;
  return {
    ...base(route, snapshot, "历史诊断记录 · 不代表当前"),
    metrics: channels.map((channel) => ({
      label: channel.label,
      value: !channel.observed
        ? "未取得"
        : channel.failureCount
        ? `${channel.failureCount} 条记录`
        : channel.error
          ? "错误记录"
          : "已记录失败端点 0",
      note: channel.observedAt ? shortTimestamp(channel.observedAt) : channel.observed ? "记录时间未取得" : "通道记录未取得",
      tone: !channel.observed ? "missing" : channel.error ? "danger" : channel.failureCount ? "warn" : "trust",
    })),
    tables: [table(
      route,
      "采集通道失败证据",
      [{ key: "group", label: "通道" }, { key: "name", label: "端点" }, { key: "message", label: "记录" }],
      failures,
      (item) => ({
        group: text(item.group),
        name: [text(item.name), text(item.endpoint, "")].filter(Boolean).join(" · "),
        message: text(item.message, "端点读取失败"),
      }),
      observedChannels ? "已记录失败端点 0" : "未取得采集通道失败记录",
      "仅证明采集端点失败；不证明转发面或外部业务中断。",
    )],
  };
}

function moreModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  return {
    ...base(route, snapshot, "工具目录 · 不承载业务快照"),
    evidenceMode: "unavailable",
    updatedAt: "未记录",
    observedAt: null,
    status: "工具目录 · 不提供业务快照",
    statusTone: "missing",
    metrics: [],
    tables: [],
  };
}
function buildCurrentSectionModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  if (route === "more") return moreModel(route, snapshot);
  if (route === "interfaces") return interfaceModel(route, snapshot);
  if (route === "lineStatus") return wanModel(route, snapshot);
  if (route === "balance") return balanceModel(route, snapshot);
  if (route === "routes") return routeModel(route, snapshot);
  if (route === "terminals") return terminalModel(route, snapshot);
  if (route === "dhcp") return dhcpModel(route, snapshot);
  if (route === "arp") return arpModel(route, snapshot);
  if (route === "trafficLoad") return resourceModel(route, snapshot);
  if (route === "loadAudit") return resourceModel(route, snapshot);
  if (route === "trafficAudit") return connectionModel(route, snapshot);
  if (route === "connections") return connectionModel(route, snapshot);
  if (route === "dns4" || route === "dns6") return dnsModel(route, snapshot);
  if (route === "security") return securityModel(route, snapshot);
  if (route === "logs" || route === "serviceLogs") return logModel(route, snapshot);
  if (route === "readonlyDiagnostics") return diagnosticsModel(route, snapshot);
  return routeModel(route, snapshot);
}

export function buildSectionModel(route: PanelRouteId, snapshot: OverviewRawSnapshot): SectionModel {
  return applyEvidenceBoundary(buildCurrentSectionModel(route, snapshot));
}
