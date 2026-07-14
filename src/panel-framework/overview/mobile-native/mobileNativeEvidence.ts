import {
  formatPercent,
  formatRate,
  shortTimestamp,
  type OverviewDerivedState,
  type OverviewEndpointFailureEntry,
  type OverviewRawRoute,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
} from "../index";
import type {
  MobileEvidenceMode,
  MobileNativeDetailSection,
  MobileNativeRow,
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
  if (Array.isArray(defaults) && defaults.length) return defaults;
  return Array.isArray(snapshot.routes?.items) ? snapshot.routes.items : [];
}

export function activeRoute(snapshot: OverviewRawSnapshot): OverviewRawRoute | null {
  return routeRows(snapshot).find((route) => route.active === true && route.disabled !== true) || null;
}

export function latestRecord(snapshot: OverviewRawSnapshot): string {
  const meta = snapshot.meta || {};
  const value = meta.realtimeUpdatedAt || meta.slowRestUpdatedAt || meta.staticUpdatedAt || snapshot.updatedAt;
  const short = shortTimestamp(value);
  return short === "-" ? "未记录" : short;
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
  return entries.slice(0, 6).map((entry, index) => ({
    label: clean(entry.group, `失败端点 ${index + 1}`),
    value: clean(entry.name),
    note: clean(entry.message || entry.at, "未提供附加说明"),
    tone: "warn",
  }));
}

function collectionDetail(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileNativeDetailSection {
  const meta = snapshot.meta || {};
  const failures = [
    ...(meta.realtimeEndpointFailures || []),
    ...(meta.slowRestEndpointFailures || []),
    ...(meta.staticEndpointFailures || []),
    ...(meta.detailEndpointFailures || []),
  ];
  const rows: MobileNativeRow[] = [
    { label: "REST", value: state.facts.collection.restLabel, note: `记录 ${shortTimestamp(meta.realtimeUpdatedAt)}` },
    { label: "SSH", value: state.facts.collection.sshLabel, note: `记录 ${shortTimestamp(meta.staticUpdatedAt)}` },
    { label: "连接详情", value: meta.connectionDetailError ? "采集失败" : "有记录", note: clean(meta.connectionDetailError || meta.connectionDetailUpdatedAt) },
    ...endpointFailureRows(failures),
  ];
  return {
    title: "采集链路证据",
    note: failures.length ? `${failures.length} 个失败端点已保留` : "通道状态与最近记录",
    rows,
  };
}

function routeDetail(snapshot: OverviewRawSnapshot): MobileNativeDetailSection {
  const rows = routeRows(snapshot).slice(0, 6).map((route, index): MobileNativeRow => ({
    label: `默认路由 ${index + 1}`,
    value: route.disabled === true ? "已停用" : route.active === true ? "活动记录" : "非活动记录",
    note: `表 ${clean(route.table || route.routingTable, "main")} · 网关 ${clean(route.gateway || route.gatewayStatus)} · 距离 ${clean(route.distance)}`,
    tone: route.active === true && route.disabled !== true ? "trust" : "warn",
  }));
  return {
    title: "路由原始证据",
    note: "只认 active=true 且未停用的记录",
    rows: rows.length ? rows : [{ label: "默认路由", value: "未取得", note: "不使用任意首行兜底", tone: "warn" }],
  };
}

function wanDetail(snapshot: OverviewRawSnapshot, mode: MobileEvidenceMode): MobileNativeDetailSection {
  const rows = wanRows(snapshot).slice(0, 8).map((wan, index): MobileNativeRow => {
    const down = finiteObservation(wan.downRate);
    const up = finiteObservation(wan.upRate);
    const rateNote = mode === "current" && down !== null && up !== null
      ? `下载 ${formatRate(down)} · 上传 ${formatRate(up)}`
      : mode === "stale" ? "历史对象记录；速率不展示" : "没有可信速率观测";
    return {
      label: clean(wan.name || wan.interface, `WAN ${index + 1}`),
      value: wan.disabled === true ? "已停用" : wan.running === false ? "未运行" : "运行记录",
      note: `${clean(wan.parent, "父接口未记录")} · ${rateNote}`,
      tone: wan.running === false ? "danger" : "trust",
    };
  });
  return {
    title: "WAN 对象证据",
    note: mode === "current" ? "对象状态与当前观测" : "非当前证据不显示速率数字",
    rows: rows.length ? rows : [{ label: "WAN", value: "未取得", note: "没有对象记录", tone: "warn" }],
  };
}

function interfaceDetail(snapshot: OverviewRawSnapshot): MobileNativeDetailSection {
  const rows = (snapshot.interfaces || []).filter((item) => item.running === false).slice(0, 8).map((item, index): MobileNativeRow => ({
    label: clean(item.name || item.interface, `接口 ${index + 1}`),
    value: item.disabled === true ? "已停用" : "未运行",
    note: `父级 ${clean(item.parent || item.master)} · VLAN ${clean(item.vlan || item.vlanId)} · PPPoE ${clean(item.pppoeOut || item.pppoe)}`,
    tone: "danger",
  }));
  return {
    title: "接口依赖证据",
    note: "Down 对象、父级、VLAN 与 PPPoE",
    rows: rows.length ? rows : [{ label: "接口", value: "未发现 Down 记录", note: "只依据当前快照" }],
  };
}

function resourceDetail(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileNativeDetailSection {
  const samples = resourceSamples(snapshot);
  return {
    title: "资源阈值证据",
    note: "CPU/内存 85%，磁盘 90%",
    rows: [
      { label: "CPU", value: formatPercent(state.facts.resource.cpu), note: "阈值 85%", tone: "danger" },
      { label: "内存", value: formatPercent(state.facts.resource.memory), note: "阈值 85%", tone: "danger" },
      { label: "磁盘", value: formatPercent(state.facts.resource.disk), note: "阈值 90%", tone: "danger" },
      {
        label: "连续样本",
        value: samples.observed ? `${samples.trailingStreak} 个` : "未取得",
        note: samples.observed ? `共 ${samples.observed} 个有效样本，${samples.exceeded} 个超限` : "没有历史采样序列",
        tone: samples.trailingStreak ? "danger" : "warn",
      },
    ],
  };
}

function boundaryDetail(): MobileNativeDetailSection {
  return {
    title: "只读边界",
    note: "页面只解释采集结果",
    rows: [
      { label: "RouterOS 配置", value: "不会修改", note: "不写路由、接口、DNS 或防火墙" },
      { label: "本地面板", value: "仅展示", note: "诊断数据不代表业务承诺" },
    ],
  };
}

export function buildDetailSections(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  mode: MobileEvidenceMode,
): MobileNativeDetailSection[] {
  const route = routeDetail(snapshot);
  const wan = wanDetail(snapshot, mode);
  const collection = collectionDetail(snapshot, state);
  const boundary = boundaryDetail();
  if (state.scenario === "no-snapshot" || state.scenario === "collection-down") return [collection, route, wan, boundary];
  if (state.scenario === "resource-full") return [resourceDetail(snapshot, state), wan, route, collection, boundary];
  if (state.scenario === "interfaces-down") return [interfaceDetail(snapshot), route, wan, collection, boundary];
  if (state.scenario === "all-offline") return [wan, route, collection, boundary];
  return [route, wan, collection, boundary];
}
