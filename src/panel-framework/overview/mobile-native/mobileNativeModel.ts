import {
  formatNumber,
  formatPercent,
  formatRate,
  shortTimestamp,
  type OverviewDerivedState,
  type OverviewRawRoute,
  type OverviewRawSnapshot,
} from "../index";
import {
  activeRoute,
  buildDetailSections,
  clean,
  finiteObservation,
  latestRecord,
  resourceSamples,
  wanRows,
} from "./mobileNativeEvidence";
import type {
  MobileEvidenceMode,
  MobileNativeModel,
  MobileNativeRow,
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

function freshnessText(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot" || state.scenario === "collection-down") return `最后成功 ${latestRecord(snapshot)}`;
  if (state.facts.freshness.seconds != null) {
    const seconds = Math.max(0, Math.round(state.facts.freshness.seconds));
    if (seconds >= 86400) return `${Math.floor(seconds / 86400)} 天前`;
    if (seconds >= 3600) return `${Math.floor(seconds / 3600)} 小时前`;
    if (seconds >= 60) return `${Math.floor(seconds / 60)} 分钟前`;
    return `${seconds} 秒前`;
  }
  return latestRecord(snapshot);
}

function evidenceMode(state: OverviewDerivedState): MobileEvidenceMode {
  if (
    state.scenario === "no-snapshot" ||
    state.facts.freshness.missing ||
    state.facts.freshness.credibility === "unavailable" ||
    state.facts.collection.credibility === "unavailable"
  ) return "unavailable";
  if (
    state.scenario === "collection-down" ||
    state.facts.freshness.stale ||
    state.facts.freshness.history ||
    state.facts.freshness.credibility === "cache" ||
    state.facts.collection.dataStale
  ) return "stale";
  return "current";
}

function routeVerification(state: OverviewDerivedState, route: OverviewRawRoute | null): MobileRouteVerification {
  if (state.scenario === "all-offline") return "offline";
  return route ? "verified" : "unknown";
}

function routeLabel(route: OverviewRawRoute | null, verification: MobileRouteVerification): string {
  if (verification === "offline") return "无活动默认路由";
  if (!route) return "无法确认";
  return clean(route.gateway || route.gatewayStatus);
}

function failureCount(state: OverviewDerivedState): string {
  return formatNumber(state.facts.failures.count);
}

function pathRows(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  mode: MobileEvidenceMode,
  route: OverviewRawRoute | null,
  verification: MobileRouteVerification,
): MobileNativeRow[] {
  const terminalCount = Array.isArray(snapshot.terminals) ? snapshot.terminals.length : 0;
  const wanNames = wanRows(snapshot).filter((row) => row.running !== false).map((row) => clean(row.name || row.interface)).slice(0, 3);
  return [
    {
      label: "默认路由",
      value: verification === "verified" ? mode === "stale" ? "历史活动记录" : "活动记录" : verification === "offline" ? "无活动记录" : "无法确认",
      note: route ? `${mode === "stale" ? "历史记录 · " : ""}网关 ${clean(route.gateway || route.gatewayStatus)} · 表 ${clean(route.table || route.routingTable, "main")} · 距离 ${clean(route.distance)}` : "没有明确 active=true 记录",
      tone: verification === "verified" ? "trust" : verification === "offline" ? "danger" : "warn",
    },
    {
      label: "WAN 对象",
      value: `${state.facts.wan.online} / ${state.facts.wan.total}`,
      note: wanNames.length ? wanNames.join(" · ") : "没有运行对象记录",
    },
    {
      label: "终端记录",
      value: mode === "unavailable" ? "不可判断" : `${formatNumber(terminalCount)} 台`,
      note: mode === "current" ? "当前快照对象数" : mode === "stale" ? "历史快照对象数" : "业务快照缺失",
    },
  ];
}

function commonModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileNativeModel {
  const mode = evidenceMode(state);
  const route = activeRoute(snapshot);
  const verification = routeVerification(state, route);
  const rates = observedRates(snapshot);
  const visibleRates = mode === "current" && !["all-offline", "no-snapshot"].includes(state.scenario) ? rates : null;
  const board = state.facts.device.boardName !== "-" ? state.facts.device.boardName : state.facts.device.version !== "-" ? state.facts.device.version : "RouterOS";
  const staleRouteTitle = route ? "历史快照记录过活动默认路由" : "历史快照未确认活动默认路由";
  const currentRouteTitle = route ? "活动默认路由已记录" : "默认路由无法确认";
  return {
    scenario: state.scenario,
    incident: !["single", "fleet"].includes(state.scenario),
    evidenceMode: mode,
    evidenceLabel: mode === "current" ? "当前证据" : mode === "stale" ? "历史快照" : "证据不可用",
    evidenceNote: mode === "current" ? "数据来自当前采集周期" : mode === "stale" ? "禁止当作实时状态" : "没有可用于业务判断的快照",
    evidenceTone: mode === "current" ? "trust" : mode === "stale" ? "warn" : "danger",
    routeVerification: verification,
    device: state.facts.device.identity || "RouterOS",
    deviceNote: board,
    routeLabel: routeLabel(route, verification),
    pathSummary: verification === "verified" ? `网关 ${routeLabel(route, verification)}` : verification === "offline" ? "无活动默认路由" : "活动默认路由未被证实",
    showRates: visibleRates !== null,
    downRate: visibleRates ? formatRate(visibleRates.down) : "",
    upRate: visibleRates ? formatRate(visibleRates.up) : "",
    kicker: "网络判断",
    title: mode === "stale" ? staleRouteTitle : mode === "unavailable" ? "当前业务状态不可判断" : currentRouteTitle,
    summary: mode === "current"
      ? `${state.facts.wan.online}/${state.facts.wan.total} 条 WAN 有运行记录；默认路由单独核验`
      : mode === "stale" ? `${state.facts.wan.online}/${state.facts.wan.total} 条 WAN 为历史记录；当前变化不可见` : "速率、资源、路由和终端数字停止展示",
    timestamp: freshnessText(snapshot, state),
    facts: [],
    rows: [],
    pathRows: pathRows(snapshot, state, mode, route, verification),
    detailSections: buildDetailSections(snapshot, state, mode),
    actionTitle: "查看原始证据",
    actionNote: "路由、WAN、采集与接口记录",
  };
}

export function buildMobileNativeModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileNativeModel {
  const model = commonModel(snapshot, state);
  const route = activeRoute(snapshot);
  const gateway = routeLabel(route, model.routeVerification);
  const resources = state.facts.resource;
  const routeRecord = route ? model.evidenceMode === "stale" ? "历史活动记录" : "活动记录" : "无法确认";

  switch (state.scenario) {
    case "single":
      return {
        ...model,
        facts: [
          { label: "默认路由", value: routeRecord, tone: route ? model.evidenceMode === "stale" ? "warn" : "trust" : "warn" },
          { label: "WAN", value: `${state.facts.wan.online} / ${state.facts.wan.total}` },
          { label: model.evidenceMode === "current" ? "CPU" : "证据", value: model.evidenceMode === "current" ? formatPercent(resources.cpu) : model.evidenceLabel, tone: model.evidenceTone },
        ],
        rows: [
          { label: "默认网关", value: gateway, note: route ? model.evidenceMode === "stale" ? "来自历史活动路由记录" : "来自明确活动路由" : "没有 active=true 记录" },
          { label: "采集通道", value: `${state.facts.collection.restLabel} · ${state.facts.collection.sshLabel}` },
        ],
      };
    case "fleet":
      return {
        ...model,
        kicker: "线路汇总",
        title: model.evidenceMode === "stale" ? `历史快照：${state.facts.wan.online} / ${state.facts.wan.total} 条 WAN 运行` : `${state.facts.wan.online} / ${state.facts.wan.total} 条 WAN 有运行记录`,
        summary: route ? "汇总 WAN 与默认路由分别核验；不把单一 WAN 画成全局承载路径" : "WAN 对象有记录，但活动默认路由无法确认",
        facts: [
          { label: "WAN", value: `${state.facts.wan.online} / ${state.facts.wan.total}` },
          { label: "连接记录", value: formatNumber(state.counts.connections) },
          { label: "默认路由", value: routeRecord, tone: route ? model.evidenceMode === "stale" ? "warn" : "trust" : "warn" },
        ],
        rows: [
          { label: "路由网关", value: gateway },
          { label: "采集依据", value: model.evidenceLabel, note: model.timestamp },
        ],
        actionTitle: "查看线路证据",
        actionNote: "每条 WAN、默认路由与连接范围",
      };
    case "all-offline":
      return {
        ...model,
        routeVerification: "offline",
        routeLabel: "无活动默认路由",
        showRates: false,
        kicker: "出口中断",
        title: `全部 ${state.facts.wan.total} 条 WAN 未运行`,
        summary: "当前快照没有活动默认路由；不展示业务速率",
        facts: [
          { label: "WAN", value: `0 / ${state.facts.wan.total}`, tone: "danger" },
          { label: "活动路由", value: "0", tone: "danger" },
          { label: "采集证据", value: model.evidenceLabel, tone: model.evidenceTone },
        ],
        rows: [
          { label: "影响范围", value: "全部外网出口" },
          { label: "证据边界", value: "只证明当前无活动出口" },
          { label: "优先检查", value: "物理链路与 PPPoE" },
        ],
        actionTitle: "查看离线对象",
        actionNote: "WAN、路由与采集原始记录",
      };
    case "no-snapshot":
      return {
        ...model,
        routeVerification: "unknown",
        routeLabel: "无法确认",
        showRates: false,
        kicker: "证据缺失",
        title: "当前业务状态不可判断",
        summary: "没有可用业务快照；速率、资源、路由与终端数字已隐藏",
        facts: [
          { label: "REST", value: state.facts.collection.restLabel, tone: "warn" },
          { label: "SSH", value: state.facts.collection.sshLabel, tone: "danger" },
          { label: "失败端点", value: failureCount(state), tone: "warn" },
        ],
        rows: [
          { label: "不可判断", value: "业务、转发与资源" },
          { label: "最后记录", value: latestRecord(snapshot), note: "仅用于恢复线索" },
          { label: "优先检查", value: "REST / SSH 采集链路" },
        ],
        actionTitle: "打开采集证据",
        actionNote: "失败端点、时间戳与恢复线索",
      };
    case "collection-down":
      return {
        ...model,
        showRates: false,
        kicker: "采集降级",
        title: "当前变化不可见",
        summary: "只保留最后成功快照；所有速率数字停止展示",
        facts: [
          { label: "证据", value: "历史快照", tone: "warn" },
          { label: "失败端点", value: failureCount(state), tone: "warn" },
          { label: "路由记录", value: route ? "历史记录" : "无法确认", tone: route ? "warn" : "danger" },
        ],
        rows: [
          { label: "最后成功", value: latestRecord(snapshot) },
          { label: "采集面", value: "REST / SSH 未恢复" },
          { label: "优先检查", value: "先 REST，后 SSH" },
        ],
        actionTitle: "打开采集证据",
        actionNote: "通道、端点与历史路由记录",
      };
    case "resource-full": {
      const samples = resourceSamples(snapshot);
      return {
        ...model,
        kicker: "资源压力",
        title: model.evidenceMode === "stale" ? "历史快照记录到资源超限" : "资源当前超过阈值",
        summary: `CPU ${formatPercent(resources.cpu)} · 内存 ${formatPercent(resources.memory)} · 磁盘 ${formatPercent(resources.disk)}`,
        facts: [
          { label: "CPU", value: formatPercent(resources.cpu), tone: "danger" },
          { label: "内存", value: formatPercent(resources.memory), tone: "danger" },
          { label: "磁盘", value: formatPercent(resources.disk), tone: "danger" },
        ],
        rows: [
          { label: "连续样本", value: samples.observed ? `${samples.trailingStreak} 个` : "未取得", note: samples.observed ? `最近连续；共 ${samples.observed} 个有效样本` : "没有历史序列" },
          { label: "可能影响", value: "采集与转发稳定性" },
          { label: "优先检查", value: "连接压力与高吞吐接口" },
        ],
        actionTitle: "查看资源证据",
        actionNote: "阈值、连续样本与 WAN 对象",
      };
    }
    case "interfaces-down": {
      const names = state.facts.interfaces.downNames.slice(0, 2).join(" / ") || "接口";
      const routeCurrent = route && model.evidenceMode === "current";
      return {
        ...model,
        kicker: "接口异常",
        title: `${names} 未运行`,
        summary: routeCurrent ? "当前快照有活动默认路由记录；接口依赖仍需核对" : "活动默认路由无法按当前证据确认",
        facts: [
          { label: "接口 Down", value: `${state.facts.interfaces.down} / ${state.facts.interfaces.total}`, tone: "danger" },
          { label: "默认路由", value: routeCurrent ? "活动记录" : "无法确认", tone: routeCurrent ? "trust" : "warn" },
          { label: "WAN", value: `${state.facts.wan.online} / ${state.facts.wan.total}` },
        ],
        rows: [
          { label: "影响对象", value: names },
          { label: "关联依赖", value: "父接口、VLAN 与 PPPoE" },
          { label: "路由后果", value: routeCurrent ? "存在活动记录，业务仍需外部验证" : "无法确认" },
        ],
        actionTitle: "查看接口证据",
        actionNote: "Down 对象、父级、VLAN 与路由原始字段",
      };
    }
  }
}
