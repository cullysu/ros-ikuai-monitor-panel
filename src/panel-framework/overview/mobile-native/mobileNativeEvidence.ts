import {
  formatPercent,
  formatRate,
  latestBusinessSuccessTime,
  shortTimestamp,
  type OverviewDerivedState,
  type OverviewEndpointFailureEntry,
  type OverviewRawRoute,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
} from "../index";
import type {
  MobileCollectionChannelEvidence,
  MobileEvidenceMode,
  MobileNativeDetailSection,
  MobileNativeRow,
  MobileRiskKey,
  ResourceSampleEvidence,
} from "./mobileNativeTypes";

export function clean(value: unknown, fallback = "未记录"): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

export function finiteObservation(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function wanRows(snapshot: OverviewRawSnapshot): OverviewRawWanRow[] {
  return Array.isArray(snapshot.wan) && snapshot.wan.length ? snapshot.wan : Array.isArray(snapshot.pppoe) ? snapshot.pppoe : [];
}

export function routeRows(snapshot: OverviewRawSnapshot): OverviewRawRoute[] {
  const defaults = snapshot.routes?.defaultRoutes;
  if (Array.isArray(defaults)) return defaults;
  if (!Array.isArray(snapshot.routes?.items)) return [];
  return snapshot.routes.items.filter((route) =>
    route.default === true || route.dstAddress === "0.0.0.0/0" || route.dstAddress === "::/0");
}

export function activeRoute(snapshot: OverviewRawSnapshot): OverviewRawRoute | null {
  return routeRows(snapshot).find((route) => route.active === true && route.disabled !== true) || null;
}

function latestTimestamp(values: Array<string | undefined>): string {
  return values.reduce<string>((latest, value) => {
    if (!value || Number.isNaN(Date.parse(value))) return latest;
    if (!latest || Date.parse(value) > Date.parse(latest)) return value;
    return latest;
  }, "");
}

export function successfulBusinessAt(snapshot: OverviewRawSnapshot): string {
  return latestBusinessSuccessTime(snapshot);
}

export function successfulBusinessLabel(snapshot: OverviewRawSnapshot): string {
  const value = successfulBusinessAt(snapshot);
  if (!value) return "成功时间未记录";
  const short = shortTimestamp(value);
  return short === "-" ? "成功时间未记录" : short;
}

function channelLabel(status: MobileCollectionChannelEvidence["status"]): string {
  if (status === "current") return "可用";
  if (status === "degraded") return "部分失败";
  if (status === "failed") return "失败";
  return "未记录";
}

export function collectionChannels(snapshot: OverviewRawSnapshot): { rest: MobileCollectionChannelEvidence; ssh: MobileCollectionChannelEvidence } {
  const meta = snapshot.meta || {};
  const coreRestErrors = [meta.realtimeError, meta.slowRestError].filter(Boolean).map(String);
  const auxiliaryRestErrors = [meta.connectionDetailError, meta.connectionProtocolError].filter(Boolean).map(String);
  const restErrors = [...coreRestErrors, ...auxiliaryRestErrors];
  const restSuccessAt = latestTimestamp([
    meta.realtimeUpdatedAt,
    meta.slowRestUpdatedAt,
    meta.connectionDetailUpdatedAt,
    meta.connectionProtocolUpdatedAt,
  ]);
  const restStatus = coreRestErrors.length
    ? "failed"
    : auxiliaryRestErrors.length
      ? "degraded"
      : restSuccessAt
        ? "current"
        : "unavailable";

  const sshErrors = [meta.staticError].filter(Boolean).map(String);
  const sshSuccessAt = latestTimestamp([meta.staticUpdatedAt]);
  const sshStatus = sshErrors.length ? "failed" : sshSuccessAt ? "current" : "unavailable";

  return {
    rest: { status: restStatus, label: channelLabel(restStatus), successAt: restSuccessAt, error: restErrors.join("；") },
    ssh: { status: sshStatus, label: channelLabel(sshStatus), successAt: sshSuccessAt, error: sshErrors.join("；") },
  };
}

export function channelAttemptAndSuccessNote(channel: MobileCollectionChannelEvidence): string {
  const firstError = channel.error.split(/[；;]/).map((value) => value.trim()).find(Boolean) || "";
  const attempt = firstError ? `当前错误：${firstError}` : "当前尝试无错误";
  const success = channel.successAt ? `上次成功 ${shortTimestamp(channel.successAt)}` : "成功时间未记录";
  return `${attempt} · ${success}`;
}

export function resourceSamples(snapshot: OverviewRawSnapshot): ResourceSampleEvidence {
  const history = snapshot.overview?.history || {};
  const series = [history.cpu, history.memory, history.disk].map((value) => Array.isArray(value) ? value : []);
  const total = Math.max(...series.map((values) => values.length), 0);
  const samples: Array<boolean | null> = [];
  for (let index = 0; index < total; index += 1) {
    const cpu = finiteObservation(series[0][index]);
    const memory = finiteObservation(series[1][index]);
    const disk = finiteObservation(series[2][index]);
    if (cpu === null && memory === null && disk === null) {
      samples.push(null);
      continue;
    }
    samples.push((cpu !== null && cpu >= 85) || (memory !== null && memory >= 85) || (disk !== null && disk >= 90));
  }
  let trailingStreak = 0;
  for (let index = samples.length - 1; index >= 0 && samples[index] === true; index -= 1) trailingStreak += 1;
  return {
    observed: samples.filter((value) => value !== null).length,
    exceeded: samples.filter((value) => value === true).length,
    trailingStreak,
  };
}

function endpointFailureRows(entries: OverviewEndpointFailureEntry[]): MobileNativeRow[] {
  return entries.slice(0, 8).map((entry, index) => ({
    key: `endpoint-${index}`,
    label: clean(entry.group, `失败端点 ${index + 1}`),
    value: clean(entry.name),
    note: clean(entry.message || entry.at, "未提供附加说明"),
    tone: "warn",
  }));
}

function channelNote(channel: MobileCollectionChannelEvidence): string {
  if (channel.error) return channel.successAt ? `${channel.error} · 上次成功 ${shortTimestamp(channel.successAt)}` : `${channel.error} · 成功时间未记录`;
  return channel.successAt ? `成功 ${shortTimestamp(channel.successAt)}` : "成功时间未记录";
}

function collectionDetail(snapshot: OverviewRawSnapshot): MobileNativeDetailSection {
  const meta = snapshot.meta || {};
  const channels = collectionChannels(snapshot);
  const failures = [
    ...(meta.realtimeEndpointFailures || []),
    ...(meta.slowRestEndpointFailures || []),
    ...(meta.staticEndpointFailures || []),
    ...(meta.detailEndpointFailures || []),
  ];
  return {
    key: "collection",
    title: "采集链路原始证据",
    note: failures.length ? `${failures.length} 个失败端点已保留` : "通道成功时间与错误独立记录",
    rows: [
      { key: "rest", label: "REST", value: channels.rest.label, note: channelNote(channels.rest), tone: channels.rest.status === "current" ? "trust" : "warn" },
      { key: "ssh", label: "SSH", value: channels.ssh.label, note: channelNote(channels.ssh), tone: channels.ssh.status === "current" ? "trust" : "warn" },
      { key: "attempt", label: "最近采集尝试", value: shortTimestamp(snapshot.updatedAt), note: "尝试时间不等于成功时间" },
      ...endpointFailureRows(failures),
    ],
  };
}

function routeDetail(snapshot: OverviewRawSnapshot, mode: MobileEvidenceMode): MobileNativeDetailSection {
  const rows = routeRows(snapshot).slice(0, 8).map((route, index): MobileNativeRow => {
    const explicitActive = route.active === true && route.disabled !== true;
    const recordLabel = route.disabled === true ? "已停用记录" : explicitActive ? "活动记录" : "非活动记录";
    return {
      key: `route-${index}`,
      label: `默认路由 ${index + 1}`,
      value: mode === "current" ? recordLabel : `保留的${recordLabel}`,
      note: `表 ${clean(route.table || route.routingTable, "main")} · 网关 ${clean(route.gateway || route.gatewayStatus)} · 距离 ${clean(route.distance)}${mode === "current" ? "" : " · 不可用于当前判断"}`,
      tone: mode === "current" && explicitActive ? "trust" : "warn",
    };
  });
  return {
    key: "route",
    title: "路由原始证据",
    note: "只认 active=true 且未停用的默认路由",
    rows: rows.length ? rows : [{ key: "route-empty", label: "默认路由", value: "未取得", note: "不使用任意首行兜底", tone: "warn" }],
  };
}

function wanDetail(snapshot: OverviewRawSnapshot, mode: MobileEvidenceMode): MobileNativeDetailSection {
  const rows = wanRows(snapshot).slice(0, 10).map((wan, index): MobileNativeRow => {
    const down = finiteObservation(wan.downRate);
    const up = finiteObservation(wan.upRate);
    const rateNote = mode === "current" && down !== null && up !== null
      ? `下载 ${formatRate(down)} · 上传 ${formatRate(up)}`
      : mode === "historical" ? "历史对象记录；速率不展示" : "保留对象记录；不可用于当前判断";
    return {
      key: `wan-${index}`,
      label: clean(wan.name || wan.interface, `WAN ${index + 1}`),
      value: mode === "current" ? wan.disabled === true ? "已停用" : wan.running === false ? "未运行" : "运行" : "保留记录",
      note: `${clean(wan.parent, "父接口未记录")} · ${rateNote}`,
      tone: mode === "current" && wan.running === false ? "danger" : mode === "current" ? "trust" : "warn",
    };
  });
  return {
    key: "wan",
    title: "WAN 对象原始证据",
    note: mode === "current" ? "对象状态与完整当前观测" : "非当前证据不显示速率数字",
    rows: rows.length ? rows : [{ key: "wan-empty", label: "WAN", value: "未取得", note: "没有对象记录", tone: "warn" }],
  };
}

function interfaceDetail(snapshot: OverviewRawSnapshot, mode: MobileEvidenceMode): MobileNativeDetailSection {
  const rows = (snapshot.interfaces || []).filter((item) => item.running === false).slice(0, 10).map((item, index): MobileNativeRow => ({
    key: `interface-${index}`,
    label: clean(item.name || item.interface, `接口 ${index + 1}`),
    value: mode === "current" ? item.disabled === true ? "已停用" : "未运行" : "保留的异常记录",
    note: `父级 ${clean(item.parent || item.master)} · VLAN ${clean(item.vlan || item.vlanId)} · PPPoE ${clean(item.pppoeOut || item.pppoe)}${mode === "current" ? "" : " · 不可用于当前判断"}`,
    tone: mode === "current" ? "danger" : "warn",
  }));
  return {
    key: "interfaces",
    title: "接口依赖原始证据",
    note: "Down 对象、父级、VLAN 与 PPPoE",
    rows: rows.length ? rows : [{ key: "interface-empty", label: "接口", value: "未发现 Down 记录", note: "只依据可用快照" }],
  };
}

function resourceDetail(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, mode: MobileEvidenceMode): MobileNativeDetailSection {
  const samples = resourceSamples(snapshot);
  const available = mode !== "unavailable";
  const current = mode === "current";
  return {
    key: "resource",
    title: mode === "historical" ? "资源阈值历史证据" : "资源阈值原始证据",
    note: mode === "historical" ? "保留值不代表当前；CPU/内存 85%，磁盘 90%" : "CPU/内存 85%，磁盘 90%",
    rows: [
      { key: "cpu", label: current ? "CPU" : "历史 CPU", value: available ? formatPercent(state.facts.resource.cpu) : "不可判断", note: "阈值 85%", tone: current ? "danger" : "warn" },
      { key: "memory", label: current ? "内存" : "历史内存", value: available ? formatPercent(state.facts.resource.memory) : "不可判断", note: "阈值 85%", tone: current ? "danger" : "warn" },
      { key: "disk", label: current ? "磁盘" : "历史磁盘", value: available ? formatPercent(state.facts.resource.disk) : "不可判断", note: "阈值 90%", tone: current ? "danger" : "warn" },
      {
        key: "samples",
        label: "尾部连续超限",
        value: available && samples.observed ? `${samples.trailingStreak} 个` : "未取得",
        note: available && samples.observed ? `共 ${samples.observed} 个有效样本，${samples.exceeded} 个超限` : "没有可用于判断的历史采样序列",
        tone: current && samples.trailingStreak ? "danger" : "warn",
      },
    ],
  };
}

function boundaryDetail(): MobileNativeDetailSection {
  return {
    key: "boundary",
    title: "只读边界",
    note: "页面只解释采集结果",
    rows: [
      { key: "routeros", label: "RouterOS 配置", value: "不会修改", note: "不写路由、接口、DNS 或防火墙" },
      { key: "panel", label: "本地面板", value: "仅展示", note: "诊断证据不代表业务承诺" },
    ],
  };
}

export function buildDetailSections(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  mode: MobileEvidenceMode,
  risks: MobileRiskKey[],
): MobileNativeDetailSection[] {
  const sections: MobileNativeDetailSection[] = [];
  if (risks.includes("resource")) sections.push(resourceDetail(snapshot, state, mode));
  if (risks.includes("interfaces")) sections.push(interfaceDetail(snapshot, mode));
  if (risks.includes("collection") || risks.includes("evidence")) sections.push(collectionDetail(snapshot));
  if (risks.includes("wan-offline")) sections.push(wanDetail(snapshot, mode), routeDetail(snapshot, mode));
  for (const section of [routeDetail(snapshot, mode), wanDetail(snapshot, mode), collectionDetail(snapshot), resourceDetail(snapshot, state, mode)]) {
    if (!sections.some((existing) => existing.key === section.key)) sections.push(section);
  }
  sections.push(boundaryDetail());
  return sections;
}
