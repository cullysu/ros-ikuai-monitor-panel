import {
  formatNumber,
  formatPercent,
  formatRate,
  isSnapshotUnavailable,
  shortTimestamp,
  type OverviewDerivedState,
  type OverviewRawRoute,
  type OverviewRawSnapshot,
  type OverviewTone,
} from "../index";
import {
  activeRoute,
  buildDetailSections,
  channelAttemptAndSuccessNote,
  clean,
  collectionChannels,
  finiteObservation,
  resourceSamples,
  routeRows,
  successfulBusinessAt,
  successfulBusinessLabel,
  wanRows,
} from "./mobileNativeEvidence";
import { configuredDevice, fleetSignal, incidentRiskDecision } from "./mobileNativePresentation";
import type {
  MobileCollectionChannelEvidence,
  MobileEvidenceMode,
  MobileNativeDecision,
  MobileNativeFact,
  MobileNativeModel,
  MobileNativeObjectView,
  MobileNativeRow,
  MobileNativeSignal,
  MobileObjectKey,
  MobileRiskKey,
  MobileRouteVerification,
} from "./mobileNativeTypes";

export type { MobileNativeModel } from "./mobileNativeTypes";

function observedRates(snapshot: OverviewRawSnapshot): { down: number; up: number } | null {
  const rows = wanRows(snapshot).filter((row) => row.running !== false && row.disabled !== true);
  if (!rows.length) return null;
  let down = 0;
  let up = 0;
  for (const row of rows) {
    const downObservation = finiteObservation(row.downRate);
    const upObservation = finiteObservation(row.upRate);
    if (downObservation === null || upObservation === null) return null;
    down += downObservation;
    up += upObservation;
  }
  return { down, up };
}

function evidenceMode(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileEvidenceMode {
  if (isSnapshotUnavailable(snapshot) || state.scenario === "no-snapshot" || state.facts.freshness.credibility === "unavailable") return "unavailable";
  if (!successfulBusinessAt(snapshot)) return "unavailable";
  const meta = snapshot.meta || {};
  if (
    state.scenario === "collection-down" ||
    Boolean(meta.realtimeError || meta.slowRestError) ||
    state.facts.freshness.stale ||
    state.facts.freshness.history ||
    state.facts.freshness.credibility === "cache"
  ) return "historical";
  return "current";
}

function ageLabel(seconds: number | null): string {
  if (seconds == null) return "";
  const age = Math.max(0, Math.round(seconds));
  if (age >= 86400) return `${Math.floor(age / 86400)} 天前`;
  if (age >= 3600) return `${Math.floor(age / 3600)} 小时前`;
  if (age >= 60) return `${Math.floor(age / 60)} 分钟前`;
  return `${age} 秒前`;
}

function evidenceCopy(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, mode: MobileEvidenceMode) {
  const success = successfulBusinessLabel(snapshot);
  if (mode === "current") {
    const age = ageLabel(state.facts.freshness.seconds);
    return {
      label: "当前证据",
      note: "业务采样完整",
      time: success === "成功时间未记录" ? success : `${success}${age ? ` · ${age}` : ""}`,
      tone: "trust" as OverviewTone,
    };
  }
  if (mode === "historical") {
    return {
      label: "历史证据",
      note: "当前变化不可见",
      time: success === "成功时间未记录" ? success : `上次成功 ${success}`,
      tone: "warn" as OverviewTone,
    };
  }
  return {
    label: "证据不可用",
    note: "不作当前业务判断",
    time: success === "成功时间未记录" ? success : `上次成功 ${success}`,
    tone: "danger" as OverviewTone,
  };
}

function routeVerification(mode: MobileEvidenceMode, state: OverviewDerivedState, route: OverviewRawRoute | null): MobileRouteVerification {
  if (mode === "unavailable") return "unknown";
  if (state.scenario === "all-offline" && !route) return "offline";
  if (!route) return "unknown";
  return mode === "current" ? "verified" : "historical";
}

function orderedRisks(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  mode: MobileEvidenceMode,
  channels: ReturnType<typeof collectionChannels>,
): MobileRiskKey[] {
  if (mode === "unavailable") return ["evidence"];
  const risks: MobileRiskKey[] = [];
  const wanOffline = state.counts.wanTotal > 0 && state.counts.wanOnline === 0;
  const resource = state.facts.resource.level === "danger";
  const interfaces = state.facts.interfaces.down > 0;
  const collection = mode === "historical" || channels.rest.status !== "current" || channels.ssh.status !== "current" || state.facts.failures.count > 0;
  const add = (risk: MobileRiskKey, present: boolean) => {
    if (present && !risks.includes(risk)) risks.push(risk);
  };
  add("collection", collection && mode === "historical");
  add("wan-offline", wanOffline && state.scenario === "all-offline");
  add("resource", resource);
  add("interfaces", interfaces);
  add("wan-offline", wanOffline);
  add("collection", collection && mode !== "historical");
  return risks;
}

function routeFact(verification: MobileRouteVerification): MobileNativeFact {
  if (verification === "verified") return { label: "默认路由", value: "已核实", note: "active=true", tone: "trust" };
  if (verification === "historical") return { label: "默认路由", value: "历史记录", note: "不代表当前", tone: "warn" };
  if (verification === "offline") return { label: "活动路由", value: "0", note: "当前记录", tone: "danger" };
  return { label: "默认路由", value: "无法核实", note: "无明确活动记录", tone: "warn" };
}

function channelTone(channel: MobileCollectionChannelEvidence): OverviewTone {
  if (channel.status === "current") return "trust";
  if (channel.status === "unavailable") return "missing";
  return channel.status === "failed" ? "danger" : "warn";
}

function channelView(snapshot: OverviewRawSnapshot, channel: MobileCollectionChannelEvidence): { label: string; tone: OverviewTone } {
  if (channel.status !== "current" || !channel.successAt) return { label: channel.label, tone: channelTone(channel) };
  const parsed = Date.parse(channel.successAt);
  const age = Number.isNaN(parsed) ? Infinity : Math.max(0, Date.now() - parsed) / 1000;
  const currentWindow = Math.max(300, Number(snapshot.meta?.pollSeconds || 60) * 5);
  return age > currentWindow ? { label: "历史成功", tone: "warn" } : { label: channel.label, tone: "trust" };
}

function collectionFact(snapshot: OverviewRawSnapshot, label: string, channel: MobileCollectionChannelEvidence): MobileNativeFact {
  const view = channelView(snapshot, channel);
  return { label, value: view.label, note: channel.successAt ? `上次成功 ${shortTimestamp(channel.successAt)}` : "成功时间未记录", tone: view.tone };
}

function primaryRisk(risks: MobileRiskKey[]): MobileRiskKey | null {
  return risks[0] || null;
}

function verdict(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  mode: MobileEvidenceMode,
  verification: MobileRouteVerification,
  risks: MobileRiskKey[],
  channels: ReturnType<typeof collectionChannels>,
) {
  const primary = primaryRisk(risks);
  if (primary === "evidence") return { kicker: "证据边界", title: "当前业务状态不可判断", summary: "没有成功业务快照；路由、速率、资源与终端数字不作当前结论。" };
  if (primary === "wan-offline") return { kicker: "出口中断", title: mode === "historical" ? `历史记录：${state.facts.wan.total} 条 WAN 全部离线` : `全部 ${state.facts.wan.total} 条 WAN 未运行`, summary: "没有明确活动默认路由；先核对物理链路与 PPPoE。" };
  if (primary === "resource") return { kicker: "资源压力", title: mode === "historical" ? "历史记录：资源曾超过阈值" : "资源压力已超过阈值", summary: "首屏改为 CPU、内存、磁盘与连续样本；流量速率停止展示。" };
  if (primary === "interfaces") return { kicker: "接口异常", title: `${state.facts.interfaces.down} 个接口未运行`, summary: verification === "verified" ? "默认路由仍有活动记录；接口依赖和实际业务影响需要分别核对。" : "活动默认路由无法按当前证据核实。" };
  if (primary === "collection") {
    const restView = channelView(snapshot, channels.rest);
    const sshView = channelView(snapshot, channels.ssh);
    const bothHistorical = restView.label === "历史成功" && sshView.label === "历史成功";
    const partial = channels.rest.status === "current" || channels.ssh.status === "current";
    return { kicker: "采集状态", title: bothHistorical ? "采样记录已过期" : partial ? "采集通道部分可用" : "当前变化不可见", summary: `REST ${restView.label} · SSH ${sshView.label}；历史记录不能当作实时状态。` };
  }
  if (verification === "verified") return { kicker: "运行结论", title: state.scenario === "fleet" ? "多线路在运行，默认出口已核实" : "网络可用，默认出口已核实", summary: "WAN 载体、活动默认路由与采集通道均有当前证据。" };
  return { kicker: "运行结论", title: "WAN 在运行，默认出口未核实", summary: "存在运行中的 WAN，但没有明确 active=true 的默认路由记录。" };
}

function factsFor(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  mode: MobileEvidenceMode,
  verification: MobileRouteVerification,
  risks: MobileRiskKey[],
  channels: ReturnType<typeof collectionChannels>,
): MobileNativeFact[] {
  const primary = primaryRisk(risks);
  if (primary === "evidence") return [
    collectionFact(snapshot, "REST", channels.rest),
    collectionFact(snapshot, "SSH", channels.ssh),
    { label: "失败端点", value: formatNumber(state.facts.failures.count), note: "恢复线索", tone: state.facts.failures.count ? "warn" : "missing" },
  ];
  if (primary === "resource") return [
    { label: "CPU", value: formatPercent(state.facts.resource.cpu), note: "阈值 85%", tone: "danger" },
    { label: "内存", value: formatPercent(state.facts.resource.memory), note: "阈值 85%", tone: "danger" },
    { label: "磁盘", value: formatPercent(state.facts.resource.disk), note: "阈值 90%", tone: "danger" },
  ];
  if (primary === "wan-offline") return [
    { label: "WAN", value: `0 / ${state.facts.wan.total}`, note: mode === "current" ? "当前记录" : "历史记录", tone: "danger" },
    routeFact(verification),
    { label: "采集", value: `${channels.rest.label} + ${channels.ssh.label}`, note: mode === "current" ? "本周期" : "历史边界", tone: mode === "current" ? "trust" : "warn" },
  ];
  if (primary === "interfaces") return [
    { label: "接口 Down", value: `${state.facts.interfaces.down} / ${state.facts.interfaces.total}`, note: mode === "current" ? "当前对象" : "历史记录", tone: mode === "current" ? "danger" : "warn" },
    routeFact(verification),
    { label: "WAN", value: `${state.facts.wan.online} / ${state.facts.wan.total}`, note: "运行记录", tone: state.facts.wan.online ? "trust" : "danger" },
  ];
  if (primary === "collection") return [
    collectionFact(snapshot, "REST", channels.rest),
    collectionFact(snapshot, "SSH", channels.ssh),
    { label: "失败端点", value: formatNumber(state.facts.failures.count), note: "当前尝试", tone: state.facts.failures.count ? "warn" : "missing" },
  ];
  return [
    routeFact(verification),
    { label: "WAN", value: `${state.facts.wan.online} / ${state.facts.wan.total}`, note: state.scenario === "fleet" ? "线路范围" : "运行对象", tone: state.facts.wan.online ? "trust" : "warn" },
    { label: "采集", value: channels.rest.status === "current" && channels.ssh.status === "current" ? "2 / 2" : `${channels.rest.label} + ${channels.ssh.label}`, note: "REST + SSH", tone: channels.rest.status === "current" && channels.ssh.status === "current" ? "trust" : "warn" },
  ];
}

function signalFor(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  mode: MobileEvidenceMode,
  risks: MobileRiskKey[],
  channels: ReturnType<typeof collectionChannels>,
  verification: MobileRouteVerification,
): MobileNativeSignal {
  const primary = primaryRisk(risks);
  if (primary === "resource") {
    const samples = resourceSamples(snapshot);
    return {
      kind: "resource",
      title: "资源压力",
      note: samples.observed ? `尾部连续 ${samples.trailingStreak} 个样本超限；共 ${samples.observed} 个有效样本` : "没有历史样本序列",
      items: [
        { label: "CPU", value: formatPercent(state.facts.resource.cpu), percent: state.facts.resource.cpu, threshold: 85, tone: "danger" },
        { label: "内存", value: formatPercent(state.facts.resource.memory), percent: state.facts.resource.memory, threshold: 85, tone: "danger" },
        { label: "磁盘", value: formatPercent(state.facts.resource.disk), percent: state.facts.resource.disk, threshold: 90, tone: "danger" },
      ],
    };
  }
  if (state.scenario === "fleet" && mode === "current" && primary !== "wan-offline") {
    return fleetSignal(state, verification);
  }
  if (primary === "interfaces") {
    const downRows = (snapshot.interfaces || []).filter((row) => row.running === false).slice(0, 3);
    return {
      kind: "interfaces",
      title: "受影响接口",
      note: "对象状态与依赖分开核对",
      items: downRows.map((row, index) => ({
        label: clean(row.name || row.interface, `接口 ${index + 1}`),
        value: "未运行",
        note: `父级 ${clean(row.parent || row.master)} · VLAN ${clean(row.vlan || row.vlanId)}`,
        tone: "danger",
      })),
    };
  }
  if (primary === "collection" || primary === "evidence") {
    const restView = channelView(snapshot, channels.rest);
    const sshView = channelView(snapshot, channels.ssh);
    return {
      kind: "collection",
      title: "采集通道",
      note: "成功时间与当前错误独立记录",
      items: [
        { label: "REST", value: restView.label, note: channelAttemptAndSuccessNote(channels.rest), tone: restView.tone },
        { label: "SSH", value: sshView.label, note: channelAttemptAndSuccessNote(channels.ssh), tone: sshView.tone },
        { label: "失败端点", value: formatNumber(state.facts.failures.count), note: "当前采集尝试", tone: state.facts.failures.count ? "warn" : "missing" },
      ],
    };
  }
  if (primary === "wan-offline") {
    const offline = wanRows(snapshot).filter((row) => row.running === false).slice(0, 3);
    return {
      kind: "wan",
      title: "离线 WAN 对象",
      note: state.facts.wan.total > offline.length ? `显示 ${offline.length} 条，共 ${state.facts.wan.total} 条` : "当前对象记录",
      items: offline.map((row, index) => ({ label: clean(row.name || row.interface, `WAN ${index + 1}`), value: "未运行", note: clean(row.parent, "父接口未记录"), tone: "danger" })),
    };
  }
  const rates = mode === "current" ? observedRates(snapshot) : null;
  if (rates) return {
    kind: "rates",
    title: "当前速率",
    note: "完整当前观测",
    items: [
      { label: "下载", value: formatRate(rates.down), tone: "trust" },
      { label: "上传", value: formatRate(rates.up), tone: "trust" },
    ],
  };
  return {
    kind: "availability",
    title: "速率观测",
    note: "缺少完整的下载或上传观测，不以零值替代",
    items: [
      { label: "下载", value: "未取得", tone: "missing" },
      { label: "上传", value: "未取得", tone: "missing" },
    ],
  };
}

function decisionsFor(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  mode: MobileEvidenceMode,
  risks: MobileRiskKey[],
  verification: MobileRouteVerification,
  route: OverviewRawRoute | null,
  channels: ReturnType<typeof collectionChannels>,
): MobileNativeDecision[] {
  const samples = resourceSamples(snapshot);
  const restView = channelView(snapshot, channels.rest);
  const sshView = channelView(snapshot, channels.ssh);
  const riskRows = risks.map((risk): MobileNativeDecision => {
    if (risk === "evidence") return { key: risk, label: "证据", title: "业务与转发状态不作判断", note: successfulBusinessAt(snapshot) ? `仅保留上次成功记录 ${successfulBusinessLabel(snapshot)}` : "没有明确成功时间", tone: "danger" };
    const incident = incidentRiskDecision(risk, state, mode, samples);
    if (incident) return incident;
    return { key: risk, label: "采集", title: `REST ${restView.label} · SSH ${sshView.label}`, note: mode === "historical" ? "当前变化不可见" : "部分端点需要复核", tone: "warn" };
  });
  if (riskRows.length) return riskRows;
  return [
    {
      key: "route-proof",
      label: "出口",
      title: verification === "verified" ? clean(route?.gateway || route?.gatewayStatus) : "默认出口未核实",
      note: verification === "verified" ? `路由表 ${clean(route?.table || route?.routingTable, "main")} · distance ${clean(route?.distance)}` : "没有明确 active=true 记录",
      tone: verification === "verified" ? "trust" : "warn",
    },
    {
      key: "resource-proof",
      label: "资源",
      title: `CPU ${formatPercent(state.facts.resource.cpu)} · 内存 ${formatPercent(state.facts.resource.memory)}`,
      note: "未达到阻断阈值",
      tone: "trust",
    },
  ];
}

function objectRowsForWan(snapshot: OverviewRawSnapshot, mode: MobileEvidenceMode): MobileNativeRow[] {
  if (mode === "unavailable") return [{ key: "wan-boundary", label: "对象记录", value: "不用于当前判断", note: "请先恢复成功业务采样", tone: "warn" }];
  return wanRows(snapshot).slice(0, 4).map((wan, index) => ({
    key: `wan-${index}`,
    label: clean(wan.name || wan.interface, `WAN ${index + 1}`),
    value: mode === "historical" ? "历史记录" : wan.running === false ? "未运行" : wan.disabled === true ? "已停用" : "运行",
    note: clean(wan.parent, "父接口未记录"),
    tone: mode === "current" && wan.running === false ? "danger" : mode === "current" ? "trust" : "warn",
  }));
}

function objectRowsForRoute(snapshot: OverviewRawSnapshot, mode: MobileEvidenceMode): MobileNativeRow[] {
  if (mode === "unavailable") return [{ key: "route-boundary", label: "路由记录", value: "不用于当前判断", note: "网关、距离与活动标记已从概览隐藏", tone: "warn" }];
  return routeRows(snapshot).slice(0, 4).map((route, index) => ({
    key: `route-${index}`,
    label: `默认路由 ${index + 1}`,
    value: route.active === true && route.disabled !== true ? mode === "current" ? "活动" : "历史活动记录" : "非活动",
    note: `表 ${clean(route.table || route.routingTable, "main")} · distance ${clean(route.distance)}`,
    tone: mode === "current" && route.active === true && route.disabled !== true ? "trust" : "warn",
  }));
}

function objectViews(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  mode: MobileEvidenceMode,
  verification: MobileRouteVerification,
  route: OverviewRawRoute | null,
  channels: ReturnType<typeof collectionChannels>,
  risks: MobileRiskKey[],
): MobileNativeObjectView[] {
  const runningWan = wanRows(snapshot).find((wan) => wan.running !== false && wan.disabled !== true);
  const wanUnavailable = mode === "unavailable";
  const routeUnavailable = mode === "unavailable";
  const samples = resourceSamples(snapshot);
  const restView = channelView(snapshot, channels.rest);
  const sshView = channelView(snapshot, channels.ssh);
  return [
    {
      key: "wan",
      label: "WAN",
      category: "对象",
      title: wanUnavailable ? "WAN 状态不可判断" : clean(runningWan?.name || runningWan?.interface, "WAN 对象"),
      status: wanUnavailable ? "无当前证据" : mode === "historical" ? "历史对象记录" : `${state.facts.wan.online} / ${state.facts.wan.total} 在线`,
      tone: wanUnavailable ? "warn" : state.facts.wan.online ? mode === "current" ? "trust" : "warn" : "danger",
      note: wanUnavailable ? "保留对象不进入当前状态判断" : mode === "historical" ? "对象关系只代表上次成功采样" : "运行对象与默认出口分别核实",
      relations: wanUnavailable ? [] : [
        { label: "上游", value: clean(runningWan?.parent, "未记录") },
        { label: "接口", value: clean(runningWan?.name || runningWan?.interface, "未记录") },
        { label: "路由", value: verification === "verified" ? clean(route?.table || route?.routingTable, "main") : verification === "historical" ? "历史记录" : "未核实" },
      ],
      rows: objectRowsForWan(snapshot, mode),
      disclosureTitle: "展开 WAN 对象",
    },
    {
      key: "route",
      label: "路由",
      category: "对象",
      title: routeUnavailable ? "默认路由不可判断" : verification === "verified" ? clean(route?.gateway || route?.gatewayStatus) : verification === "historical" ? "历史活动路由" : verification === "offline" ? "无活动默认路由" : "默认路由未核实",
      status: routeUnavailable ? "无当前证据" : verification === "verified" ? "活动 · 已核实" : verification === "historical" ? "历史记录" : verification === "offline" ? "离线" : "未知",
      tone: verification === "verified" ? "trust" : verification === "offline" ? "danger" : "warn",
      note: routeUnavailable ? "活动标记、网关与距离已从概览隐藏" : "只认 active=true 且未停用的记录",
      relations: routeUnavailable || !route ? [] : [
        { label: "路由表", value: clean(route.table || route.routingTable, "main") },
        { label: "distance", value: clean(route.distance) },
        { label: "载体", value: clean(route.gateway || route.gatewayStatus) },
      ],
      rows: objectRowsForRoute(snapshot, mode),
      disclosureTitle: "展开默认路由记录",
    },
    {
      key: "collection",
      label: "采集",
      category: "通道",
      title: restView.label === "历史成功" && sshView.label === "历史成功" ? "采集记录已过期" : channels.rest.status === "current" && channels.ssh.status === "current" ? "采集通道可用" : channels.rest.status === "current" || channels.ssh.status === "current" ? "采集通道部分可用" : "采集通道需要恢复",
      status: `REST ${restView.label} · SSH ${sshView.label}`,
      tone: restView.tone === "trust" && sshView.tone === "trust" ? "trust" : "warn",
      note: "能力配置不作为当前健康证明",
      relations: [
        { label: "REST", value: restView.label, tone: restView.tone },
        { label: "SSH", value: sshView.label, tone: sshView.tone },
        { label: "最近尝试", value: shortTimestamp(snapshot.updatedAt) },
      ],
      rows: [
        { key: "rest-success", label: "REST 上次成功", value: channels.rest.successAt ? shortTimestamp(channels.rest.successAt) : "未记录", note: channels.rest.error || undefined, tone: restView.tone },
        { key: "ssh-success", label: "SSH 上次成功", value: channels.ssh.successAt ? shortTimestamp(channels.ssh.successAt) : "未记录", note: channels.ssh.error || undefined, tone: sshView.tone },
        { key: "endpoint-failures", label: "失败端点", value: formatNumber(state.facts.failures.count), note: "当前采集尝试" },
      ],
      disclosureTitle: "展开采集时间与错误",
    },
    {
      key: "resource",
      label: "资源",
      category: "系统",
      title: mode === "unavailable" ? "资源状态不可判断" : mode === "historical" ? risks.includes("resource") ? "历史记录：资源曾超过阈值" : "历史资源记录" : risks.includes("resource") ? "资源超过阈值" : "资源仍有余量",
      status: mode === "unavailable" ? "无当前证据" : mode === "historical" ? "不代表当前" : risks.includes("resource") ? "需要处理" : "未超过阈值",
      tone: mode === "unavailable" || mode === "historical" ? "warn" : risks.includes("resource") ? "danger" : "trust",
      note: mode === "unavailable" ? "CPU、内存与磁盘数字不展示" : mode === "historical" ? "保留值仅用于恢复后对照" : samples.observed ? `尾部连续超限 ${samples.trailingStreak} 个样本` : "历史样本未取得",
      relations: mode === "unavailable" ? [] : [
        { label: mode === "historical" ? "历史 CPU" : "CPU", value: formatPercent(state.facts.resource.cpu) },
        { label: mode === "historical" ? "历史内存" : "内存", value: formatPercent(state.facts.resource.memory) },
        { label: mode === "historical" ? "历史磁盘" : "磁盘", value: formatPercent(state.facts.resource.disk) },
      ],
      rows: mode === "unavailable" ? [{ key: "resource-boundary", label: "资源记录", value: "不用于当前判断", tone: "warn" }] : [
        { key: "threshold", label: "阈值", value: "CPU/内存 85% · 磁盘 90%" },
        { key: "samples", label: "有效样本", value: samples.observed ? `${samples.observed} 个` : "未取得", note: samples.observed ? `${samples.exceeded} 个超限，尾部连续 ${samples.trailingStreak} 个` : undefined },
      ],
      disclosureTitle: "展开资源阈值与样本",
    },
  ];
}

function initialObjectFor(risks: MobileRiskKey[]): MobileObjectKey {
  const primary = primaryRisk(risks);
  if (primary === "evidence" || primary === "collection") return "collection";
  if (primary === "resource") return "resource";
  if (primary === "wan-offline") return "wan";
  if (primary === "interfaces") return "route";
  return "wan";
}

export function buildMobileNativeModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileNativeModel {
  const mode = evidenceMode(snapshot, state);
  const channels = collectionChannels(snapshot);
  const route = activeRoute(snapshot);
  const verification = routeVerification(mode, state, route);
  const risks = orderedRisks(snapshot, state, mode, channels);
  const evidence = evidenceCopy(snapshot, state, mode);
  const copy = verdict(snapshot, state, mode, verification, risks, channels);
  const device = configuredDevice(snapshot, state, mode);
  return {
    scenario: state.scenario,
    incident: risks.length > 0,
    risks,
    evidenceMode: mode,
    evidenceLabel: evidence.label,
    evidenceNote: evidence.note,
    evidenceTime: evidence.time,
    evidenceTone: evidence.tone,
    routeVerification: verification,
    device: device.identity,
    deviceNote: device.note,
    kicker: copy.kicker,
    title: copy.title,
    summary: copy.summary,
    facts: factsFor(snapshot, state, mode, verification, risks, channels),
    signal: signalFor(snapshot, state, mode, risks, channels, verification),
    decisions: decisionsFor(snapshot, state, mode, risks, verification, route, channels),
    objects: objectViews(snapshot, state, mode, verification, route, channels, risks),
    initialObject: initialObjectFor(risks),
    detailSections: buildDetailSections(snapshot, state, mode, risks),
    actionTitle: "打开完整原始证据",
    actionNote: "路由、WAN、采集、接口与只读边界",
  };
}
