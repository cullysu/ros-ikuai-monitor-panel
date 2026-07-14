import {
  toNumber,
  type OverviewDerivedState,
  type OverviewEndpointFailureEntry,
  type OverviewRawInterfaceRow,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
} from "../index";

export type RouterMobileTone = "healthy" | "degraded" | "critical" | "unknown";

export interface RouterMobileMetric {
  label: string;
  value: string;
  unit?: string;
  note: string;
  tone?: RouterMobileTone;
}

export interface RouterMobileEvidence {
  label: string;
  value: string;
  note: string;
  tone?: RouterMobileTone;
}

export interface RouterMobileTrend {
  source: "history" | "snapshot" | "unavailable";
  window: string;
  downLabel: string;
  upLabel: string;
  peakLabel: string;
  downPoints?: string;
  upPoints?: string;
  downShare: number;
  upShare: number;
}

export interface RouterMobileIncidentDecision {
  impact: string;
  nextStep: string;
}

export interface RouterMobileModel {
  scenario: OverviewDerivedState["scenario"];
  tone: RouterMobileTone;
  device: {
    name: string;
    secondary: string;
    status: string;
    updated: string;
    tone: RouterMobileTone;
  };
  verdict: {
    kicker: string;
    title: string;
    detail: string;
  };
  incident?: RouterMobileIncidentDecision;
  metrics: RouterMobileMetric[];
  trend: RouterMobileTrend;
  evidenceTitle: string;
  evidence: RouterMobileEvidence[];
  trust: {
    metrics: RouterMobileMetric[];
    endpointRecords: RouterMobileEvidence[];
  };
}

function clean(value: unknown, fallback = "-"): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function wanRows(snapshot: OverviewRawSnapshot): OverviewRawWanRow[] {
  if (Array.isArray(snapshot.wan) && snapshot.wan.length) return snapshot.wan;
  return Array.isArray(snapshot.pppoe) ? snapshot.pppoe : [];
}

function interfaceRows(snapshot: OverviewRawSnapshot): OverviewRawInterfaceRow[] {
  return Array.isArray(snapshot.interfaces) ? snapshot.interfaces : [];
}

function rates(snapshot: OverviewRawSnapshot): { down: number; up: number } {
  return wanRows(snapshot).reduce<{ down: number; up: number }>(
    (total, row) => ({
      down: total.down + toNumber(row.downRate),
      up: total.up + toNumber(row.upRate),
    }),
    { down: 0, up: 0 },
  );
}

function rateParts(value: number): { value: string; unit: string } {
  if (!Number.isFinite(value) || value <= 0) return { value: "0", unit: "bps" };
  if (value >= 1_000_000_000) return { value: (value / 1_000_000_000).toFixed(value >= 10_000_000_000 ? 0 : 1), unit: "Gbps" };
  if (value >= 1_000_000) return { value: (value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1), unit: "Mbps" };
  if (value >= 1_000) return { value: (value / 1_000).toFixed(value >= 10_000 ? 0 : 1), unit: "Kbps" };
  return { value: String(Math.round(value)), unit: "bps" };
}

function rateLabel(value: number): string {
  const formatted = rateParts(value);
  return `${formatted.value} ${formatted.unit}`;
}

function timeLabel(raw: unknown): string {
  const source = clean(raw, "");
  if (!source) return "未取得快照";
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return source;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}

function latestTime(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  const meta = snapshot.meta || {};
  const raw = state.scenario === "no-snapshot"
    ? meta.staticUpdatedAt || meta.realtimeUpdatedAt
    : snapshot.updatedAt || meta.realtimeUpdatedAt || meta.staticUpdatedAt;
  return timeLabel(raw);
}

function collectionState(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): {
  rest: boolean;
  ssh: boolean;
  snapshotLabel: "当前快照" | "缓存快照" | "仅仪表状态";
  tone: RouterMobileTone;
} {
  const rest = Boolean(snapshot.meta?.capabilities?.restTrusted);
  const ssh = Boolean(snapshot.meta?.capabilities?.sshRead);
  if (state.scenario === "no-snapshot") return { rest, ssh, snapshotLabel: "仅仪表状态", tone: "critical" };
  if (state.scenario === "collection-down" || (!rest && !ssh)) return { rest, ssh, snapshotLabel: "缓存快照", tone: "degraded" };
  return { rest, ssh, snapshotLabel: "当前快照", tone: "healthy" };
}

function deviceState(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { status: string; tone: RouterMobileTone } {
  if (state.scenario === "no-snapshot") return { status: "待确认", tone: "unknown" };
  if (state.scenario === "collection-down") return { status: "采集降级", tone: "degraded" };
  if (state.scenario === "all-offline") return { status: "外网中断", tone: "critical" };
  if (state.scenario === "resource-full") return { status: "资源告警", tone: "critical" };
  if (state.scenario === "interfaces-down") return { status: "接口异常", tone: "degraded" };
  const collection = collectionState(snapshot, state);
  return collection.snapshotLabel === "缓存快照"
    ? { status: "缓存快照", tone: "degraded" }
    : { status: "WAN 运行中", tone: "healthy" };
}

function toneOf(state: OverviewDerivedState): RouterMobileTone {
  if (state.scenario === "all-offline" || state.scenario === "resource-full") return "critical";
  if (state.scenario === "no-snapshot") return "unknown";
  if (state.scenario === "collection-down" || state.scenario === "interfaces-down") return "degraded";
  return "healthy";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function firstRate(row: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = toNumber(row[key]);
    if (Number.isFinite(value) && value >= 0) return value;
  }
  return 0;
}

function historySeries(snapshot: OverviewRawSnapshot): { down: number[]; up: number[] } | null {
  const raw = snapshot as Record<string, unknown>;
  const traffic = isRecord(raw.traffic) ? raw.traffic : {};
  const realtime = isRecord(raw.realtime) ? raw.realtime : {};
  const candidates = [raw.history, raw.samples, raw.rateHistory, raw.trafficHistory, raw.wanHistory, traffic.history, traffic.samples, realtime.history, realtime.samples];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate) || candidate.length < 3 || !candidate.every(isRecord)) continue;
    const rows = candidate.slice(-16) as Record<string, unknown>[];
    const down = rows.map((row) => firstRate(row, ["downRate", "downloadRate", "rxRate", "down", "download", "rx"]));
    const up = rows.map((row) => firstRate(row, ["upRate", "uploadRate", "txRate", "up", "upload", "tx"]));
    if (down.some((value) => value > 0) || up.some((value) => value > 0)) return { down, up };
  }
  return null;
}

function plotPoints(values: number[], maximum: number): string {
  const width = 304;
  const height = 82;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values.map((value, index) => {
    const x = 8 + index * step;
    const y = 10 + height - (Math.max(0, value) / Math.max(1, maximum)) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function trendModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): RouterMobileTrend {
  if (state.scenario === "no-snapshot") {
    return { source: "unavailable", window: "无有效采样", downLabel: "不展示", upLabel: "不展示", peakLabel: "不可判", downShare: 0, upShare: 0 };
  }
  const current = rates(snapshot);
  const history = historySeries(snapshot);
  const collection = collectionState(snapshot, state);
  if (!history) {
    const maximum = Math.max(1, current.down, current.up);
    return {
      source: "snapshot",
      window: state.scenario === "collection-down" ? "上次成功快照" : collection.snapshotLabel,
      downLabel: rateLabel(current.down),
      upLabel: rateLabel(current.up),
      peakLabel: "无历史峰值",
      downShare: current.down / maximum,
      upShare: current.up / maximum,
    };
  }
  const maximum = Math.max(1, ...history.down, ...history.up);
  return {
    source: "history",
    window: collection.snapshotLabel === "缓存快照"
      ? `缓存记录 · 最近 ${Math.max(history.down.length, history.up.length)} 次`
      : `最近 ${Math.max(history.down.length, history.up.length)} 次采样`,
    downLabel: rateLabel(history.down[history.down.length - 1] || 0),
    upLabel: rateLabel(history.up[history.up.length - 1] || 0),
    peakLabel: `峰值 ${rateLabel(maximum)}`,
    downPoints: plotPoints(history.down, maximum),
    upPoints: plotPoints(history.up, maximum),
    downShare: (history.down[history.down.length - 1] || 0) / maximum,
    upShare: (history.up[history.up.length - 1] || 0) / maximum,
  };
}

function routeEvidence(snapshot: OverviewRawSnapshot): RouterMobileEvidence {
  const routes = snapshot.routes?.defaultRoutes || snapshot.routes?.items || [];
  const active = routes.filter((route) => route.active && !route.disabled);
  const primary = active[0];
  return {
    label: "默认路由",
    value: primary ? "已生效" : "未生效",
    note: primary ? `${clean(primary.gateway, "网关未知")} · 距离 ${clean(primary.distance, "-")}` : "主路由表没有活动出口",
    tone: primary ? "healthy" : "critical",
  };
}

function normalEvidence(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): RouterMobileEvidence[] {
  const wan = state.facts.wan;
  const resource = state.facts.resource;
  const downInterfaces = state.facts.interfaces.downNames;
  return [
    routeEvidence(snapshot),
    {
      label: "WAN 承载",
      value: `${wan.online}/${wan.total || 0} 在线`,
      note: wan.offline ? `${wan.offline} 条线路未运行` : "出口线路均处于运行状态",
      tone: wan.offline ? "degraded" : "healthy",
    },
    {
      label: "设备资源",
      value: resource.available ? `CPU ${Math.round(resource.cpu)}%` : "未采集",
      note: resource.available ? `内存 ${Math.round(resource.memory)}% · 磁盘 ${Math.round(resource.disk)}%` : "本次快照没有资源读数",
      tone: resource.level === "danger" ? "critical" : resource.level === "warn" ? "degraded" : "healthy",
    },
    {
      label: "接口运行",
      value: downInterfaces.length ? `${downInterfaces.length} 个 Down` : "未发现 Down",
      note: downInterfaces.length ? downInterfaces.slice(0, 3).join("、") : `${state.facts.interfaces.total} 个接口已纳入快照`,
      tone: downInterfaces.length ? "degraded" : "healthy",
    },
  ];
}

function failureEntries(snapshot: OverviewRawSnapshot): OverviewEndpointFailureEntry[] {
  const meta = snapshot.meta || {};
  return [
    ...(meta.realtimeEndpointFailures || []),
    ...(meta.slowRestEndpointFailures || []),
    ...(meta.staticEndpointFailures || []),
    ...(meta.detailEndpointFailures || []),
  ];
}

function failureEvidence(snapshot: OverviewRawSnapshot): RouterMobileEvidence[] {
  const entries = failureEntries(snapshot).slice(0, 5);
  if (!entries.length) return [{ label: "失败端点", value: "无记录", note: "本次快照未附带端点失败明细", tone: "unknown" }];
  return entries.map((entry) => ({
    label: clean(entry.group, "采集端点"),
    value: clean(entry.name, "未命名端点"),
    note: clean(entry.message, "请求未成功"),
    tone: "degraded",
  }));
}

function scenarioVerdict(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): RouterMobileModel["verdict"] {
  const routeFact = state.facts.route.level === "ok" ? "默认路由生效" : "默认路由尚未确认";
  const observationFact = collectionState(snapshot, state).snapshotLabel === "缓存快照"
    ? "当前仅能参考缓存快照"
    : "当前快照可用于判断";
  switch (state.scenario) {
    case "fleet":
      return { kicker: "多线路概况", title: `${state.facts.wan.online} 条 WAN 在线`, detail: `${routeFact}；${observationFact}。` };
    case "all-offline":
      return { kicker: "互联网出口", title: "全部 WAN 已离线", detail: "当前没有活动出口；局域网与管理面状态不能代表外网可用。" };
    case "no-snapshot":
      return { kicker: "数据边界", title: "业务状态不可判断", detail: "没有取得有效快照，流量、WAN 与资源数值已停止展示。" };
    case "collection-down":
      return { kicker: "采集降级", title: "当前数据不是实时值", detail: "管理采集通道失败；页面仅保留上次成功快照作为参考。" };
    case "resource-full":
      return { kicker: "设备压力", title: "资源已进入高压区", detail: `CPU ${Math.round(state.facts.resource.cpu)}%、内存 ${Math.round(state.facts.resource.memory)}%、磁盘 ${Math.round(state.facts.resource.disk)}%。` };
    case "interfaces-down":
      return {
        kicker: "接口事件",
        title: `${state.facts.interfaces.down} 个接口停止运行`,
        detail: state.facts.route.level === "ok" && state.facts.wan.online > 0
          ? "默认出口仍生效；请先核对受影响接口及其上联关系。"
          : "当前没有可确认在线的 WAN；需同时核对默认路由与受影响接口。",
      };
    default:
      return { kicker: "网络概况", title: "WAN 出口在线", detail: `${state.facts.wan.online}/${state.facts.wan.total || 0} 条 WAN 在线；${routeFact}；${observationFact}。` };
  }
}

function incidentDecision(state: OverviewDerivedState): RouterMobileIncidentDecision | undefined {
  switch (state.scenario) {
    case "all-offline":
      return {
        impact: "互联网访问不可用；局域网和管理面可能仍可用",
        nextStep: "先检查默认路由，再核对各 WAN 的拨号或上联状态",
      };
    case "no-snapshot":
      return {
        impact: "流量、WAN、接口和资源状态均不可判断",
        nextStep: "先恢复 REST 或只读 SSH，再判断实际网络状态",
      };
    case "collection-down":
      return {
        impact: "页面数据已过期；不直接代表业务网络中断",
        nextStep: "先查看失败端点，再核对最近一次成功采集时间",
      };
    case "resource-full":
      return {
        impact: "转发性能可能下降；当前无法证明是否持续",
        nextStep: "先检查连接压力，再确认 CPU 与内存是否持续高位",
      };
    case "interfaces-down":
      return {
        impact: state.facts.route.level === "ok" && state.facts.wan.online > 0
          ? "默认出口仍生效；仅所列接口可能受影响"
          : "没有可确认在线的 WAN；外网承载可能受影响",
        nextStep: "先核对 Down 接口是否承载 WAN、上联或关键终端",
      };
    default:
      return undefined;
  }
}

function scenarioMetrics(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): RouterMobileMetric[] {
  if (state.scenario === "no-snapshot") {
    return [
      { label: "业务指标", value: "不展示", note: "无有效快照", tone: "unknown" },
      { label: "有效快照", value: "0", note: "当前不可判", tone: "critical" },
      { label: "采集通道", value: "0/2", note: "REST / SSH 失败", tone: "critical" },
      { label: "最近记录", value: latestTime(snapshot, state), note: "仅供定位", tone: "unknown" },
    ];
  }
  if (state.scenario === "resource-full") {
    return [
      { label: "CPU", value: String(Math.round(state.facts.resource.cpu)), unit: "%", note: "参考阈值 90%", tone: "critical" },
      { label: "内存", value: String(Math.round(state.facts.resource.memory)), unit: "%", note: "参考阈值 90%", tone: "critical" },
      { label: "磁盘", value: String(Math.round(state.facts.resource.disk)), unit: "%", note: "参考阈值 90%", tone: "critical" },
      { label: "连接数", value: String(state.facts.connections.total), note: `${state.facts.connections.active} 条活动样本`, tone: "degraded" },
    ];
  }
  if (state.scenario === "all-offline") {
    const collection = collectionState(snapshot, state);
    return [
      { label: "WAN 在线", value: `0/${state.facts.wan.total}`, note: "全部离线", tone: "critical" },
      { label: "默认路由", value: "0", note: "无活动出口", tone: "critical" },
      { label: "下载", value: "0", unit: "bps", note: "外网不可用", tone: "critical" },
      { label: "采集快照", value: latestTime(snapshot, state), note: collection.snapshotLabel, tone: collection.tone },
    ];
  }
  const routeAvailable = state.facts.route.level === "ok";
  const wanMetric: RouterMobileMetric = {
    label: "WAN 在线",
    value: `${state.facts.wan.online}/${state.facts.wan.total || 0}`,
    note: state.facts.wan.offline ? `${state.facts.wan.offline} 条未运行` : "出口线路运行",
    tone: state.facts.wan.offline ? "degraded" : "healthy",
  };
  const routeMetric: RouterMobileMetric = {
    label: "默认路由",
    value: routeAvailable ? "生效" : "未确认",
    note: state.facts.route.label,
    tone: routeAvailable ? "healthy" : "critical",
  };
  const cpuMetric: RouterMobileMetric = {
    label: "CPU",
    value: state.facts.resource.available ? String(Math.round(state.facts.resource.cpu)) : "未采集",
    unit: state.facts.resource.available ? "%" : undefined,
    note: state.facts.resource.available ? "设备负载" : "本次无读数",
    tone: state.facts.resource.level === "danger" ? "critical" : state.facts.resource.level === "warn" ? "degraded" : "healthy",
  };
  const interfaceMetric: RouterMobileMetric = {
    label: "接口 Down",
    value: String(state.facts.interfaces.down),
    note: state.facts.interfaces.down ? state.facts.interfaces.downNames.slice(0, 2).join("、") : `${state.facts.interfaces.total} 个接口运行`,
    tone: state.facts.interfaces.down ? "degraded" : "healthy",
  };
  const metrics = state.scenario === "interfaces-down"
    ? [interfaceMetric, wanMetric, routeMetric, cpuMetric]
    : [wanMetric, routeMetric, cpuMetric, interfaceMetric];
  if (state.scenario === "collection-down") metrics.forEach((metric) => { metric.tone = metric.tone === "critical" ? "critical" : "degraded"; });
  return metrics;
}

function scenarioEvidence(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { title: string; rows: RouterMobileEvidence[] } {
  if (state.scenario === "no-snapshot" || state.scenario === "collection-down") {
    return { title: "采集失败证据", rows: failureEvidence(snapshot) };
  }
  if (state.scenario === "all-offline") {
    const offline = wanRows(snapshot).filter((row) => !row.running).slice(0, 4).map((row) => ({
      label: clean(row.name || row.interface, "WAN"),
      value: "离线",
      note: `${clean(row.parent, "上联未知")} · 无实时流量`,
      tone: "critical" as const,
    }));
    return { title: "出口故障证据", rows: [routeEvidence(snapshot), ...offline] };
  }
  if (state.scenario === "resource-full") {
    const current = rates(snapshot);
    const collection = collectionState(snapshot, state);
    return {
      title: "压力证据",
      rows: [
        { label: "连接压力", value: String(state.facts.connections.total), note: `${state.facts.connections.active} 条活动样本`, tone: "degraded" },
        { label: "接口吞吐", value: rateLabel(current.down + current.up), note: `${interfaceRows(snapshot).length} 个接口纳入快照`, tone: "healthy" },
        { label: "持续时间", value: "未取得", note: "当前只有单次资源快照", tone: "unknown" },
        { label: "采集快照", value: collection.snapshotLabel, note: latestTime(snapshot, state), tone: collection.tone },
      ],
    };
  }
  if (state.scenario === "interfaces-down") {
    const rows = interfaceRows(snapshot).filter((row) => row.running === false).slice(0, 4).map((row) => ({
      label: clean(row.name || row.interface, "接口"),
      value: "Down",
      note: [row.bridge, row.parent, row.vlan ? `VLAN ${row.vlan}` : ""].map((item) => clean(item, "")).filter(Boolean).join(" · ") || "未记录上联关系",
      tone: "degraded" as const,
    }));
    return { title: "受影响接口", rows: [routeEvidence(snapshot), ...rows] };
  }
  return { title: "运行证据", rows: normalEvidence(snapshot, state) };
}

function trustModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): RouterMobileModel["trust"] {
  const meta = snapshot.meta || {};
  const failures = failureEntries(snapshot).length;
  const collection = collectionState(snapshot, state);
  return {
    metrics: [
      { label: "快照", value: latestTime(snapshot, state), note: collection.snapshotLabel, tone: collection.tone },
      { label: "REST", value: collection.rest ? "可用" : "失败", note: timeLabel(meta.realtimeUpdatedAt), tone: collection.rest ? "healthy" : "critical" },
      { label: "SSH", value: collection.ssh ? "只读" : "失败", note: timeLabel(meta.staticUpdatedAt), tone: collection.ssh ? "healthy" : "critical" },
      { label: "端点记录", value: String(failures), note: failures ? "失败明细" : "本次未附", tone: failures ? "degraded" : "healthy" },
    ],
    endpointRecords: failureEvidence(snapshot),
  };
}

export function buildRouterMobileModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): RouterMobileModel {
  const evidence = scenarioEvidence(snapshot, state);
  const device = deviceState(snapshot, state);
  return {
    scenario: state.scenario,
    tone: toneOf(state),
    device: {
      name: clean(state.facts.device.identity, "RouterOS"),
      secondary: [clean(state.facts.device.boardName, ""), clean(state.facts.device.version, "")].filter((value) => value && value !== "-").join(" · ") || clean(state.facts.device.target, "设备"),
      status: device.status,
      updated: latestTime(snapshot, state),
      tone: device.tone,
    },
    verdict: scenarioVerdict(snapshot, state),
    incident: incidentDecision(state),
    metrics: scenarioMetrics(snapshot, state),
    trend: trendModel(snapshot, state),
    evidenceTitle: evidence.title,
    evidence: evidence.rows,
    trust: trustModel(snapshot, state),
  };
}
