import {
  formatNumber,
  formatPercent,
  formatRate,
  shortTimestamp,
  type OverviewDerivedState,
  type OverviewRawSnapshot,
  type OverviewScenarioKey,
  type OverviewTone,
} from "../index";

export interface MobileNativeFact {
  label: string;
  value: string;
  tone?: OverviewTone;
}

export interface MobileNativeRow extends MobileNativeFact {
  note?: string;
}

export interface MobileNativeModel {
  scenario: OverviewScenarioKey;
  incident: boolean;
  pathState: "active" | "cached" | "offline" | "unknown";
  device: string;
  deviceNote: string;
  internetLabel: string;
  routeLabel: string;
  clientLabel: string;
  showRates: boolean;
  downRate: string;
  upRate: string;
  ratePrefix: string;
  kicker: string;
  title: string;
  summary: string;
  timestamp: string;
  facts: MobileNativeFact[];
  rows: MobileNativeRow[];
  actionTitle: string;
  actionNote: string;
}

function wanRows(snapshot: OverviewRawSnapshot) {
  return Array.isArray(snapshot.wan) && snapshot.wan.length ? snapshot.wan : Array.isArray(snapshot.pppoe) ? snapshot.pppoe : [];
}

function rates(snapshot: OverviewRawSnapshot) {
  return wanRows(snapshot).reduce<{ down: number; up: number }>(
    (total, row) => ({ down: total.down + Number(row.downRate || 0), up: total.up + Number(row.upRate || 0) }),
    { down: 0, up: 0 },
  );
}

function activeRoute(snapshot: OverviewRawSnapshot) {
  const rows = snapshot.routes?.defaultRoutes || snapshot.routes?.items || [];
  return rows.find((route) => route.active && !route.disabled) || rows[0];
}

function routeText(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot") return "默认路由未知";
  if (state.scenario === "all-offline") return "无活动默认路由";
  const route = activeRoute(snapshot);
  const gateway = String(route?.gateway || "").trim();
  const carryingWan = wanRows(snapshot).find((row) => row.running !== false)?.name || "main";
  return gateway && gateway !== carryingWan ? `${carryingWan} · ${gateway}` : carryingWan;
}

function latestRecord(snapshot: OverviewRawSnapshot): string {
  const meta = snapshot.meta || {};
  const value = meta.realtimeUpdatedAt || meta.slowRestUpdatedAt || meta.staticUpdatedAt || snapshot.updatedAt;
  const short = shortTimestamp(value);
  return short === "-" ? "未记录" : short;
}

function freshnessText(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  if (state.scenario === "no-snapshot" || state.scenario === "collection-down") return `上次成功 ${latestRecord(snapshot)}`;
  if (state.facts.freshness.seconds != null) {
    const seconds = Math.max(0, Math.round(state.facts.freshness.seconds));
    if (seconds >= 86400) return `${Math.floor(seconds / 86400)} 天前`;
    if (seconds >= 3600) return `${Math.floor(seconds / 3600)} 小时前`;
    if (seconds >= 60) return `${Math.floor(seconds / 60)} 分钟前`;
    return `${seconds} 秒前`;
  }
  return latestRecord(snapshot);
}

function failureCount(state: OverviewDerivedState): string {
  return formatNumber(state.facts.failures.count);
}

function resourceSamples(snapshot: OverviewRawSnapshot): { exceeded: number; total: number } {
  const history = snapshot.overview?.history || {};
  const cpu = Array.isArray(history.cpu) ? history.cpu.map(Number) : [];
  const memory = Array.isArray(history.memory) ? history.memory.map(Number) : [];
  const disk = Array.isArray(history.disk) ? history.disk.map(Number) : [];
  const total = Math.max(cpu.length, memory.length, disk.length);
  let exceeded = 0;
  for (let index = 0; index < total; index += 1) {
    if ((cpu[index] || 0) >= 85 || (memory[index] || 0) >= 85 || (disk[index] || 0) >= 90) exceeded += 1;
  }
  return { exceeded, total };
}

function commonModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileNativeModel {
  const currentRates = rates(snapshot);
  const terminalCount = Array.isArray(snapshot.terminals) ? snapshot.terminals.length : 0;
  const cached = state.facts.freshness.history || state.facts.freshness.stale || state.facts.collection.dataStale;
  const board = state.facts.device.boardName !== "-" ? state.facts.device.boardName : state.facts.device.version !== "-" ? state.facts.device.version : "RouterOS";
  return {
    scenario: state.scenario,
    incident: !["single", "fleet"].includes(state.scenario),
    pathState: cached ? "cached" : "active",
    device: state.facts.device.identity || "RouterOS",
    deviceNote: board,
    internetLabel: "默认出口有活动记录",
    routeLabel: routeText(snapshot, state),
    clientLabel: `${formatNumber(terminalCount)} 台终端有记录`,
    showRates: true,
    downRate: formatRate(currentRates.down),
    upRate: formatRate(currentRates.up),
    ratePrefix: cached ? "上次" : "当前",
    kicker: "当前路径",
    title: "默认路由有活动记录",
    summary: cached ? `${state.facts.wan.online}/${state.facts.wan.total} 条 WAN 运行，数字来自历史快照` : `${state.facts.wan.online}/${state.facts.wan.total} 条 WAN 运行，采集记录完整`,
    timestamp: freshnessText(snapshot, state),
    facts: [],
    rows: [],
    actionTitle: "查看网络证据",
    actionNote: "接口、采集与最近记录",
  };
}

export function buildMobileNativeModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileNativeModel {
  const model = commonModel(snapshot, state);
  const route = activeRoute(snapshot);
  const gateway = String(route?.gateway || "未记录");
  const resources = state.facts.resource;

  switch (state.scenario) {
    case "single":
      return {
        ...model,
        facts: [
          { label: "默认网关", value: gateway },
          { label: "WAN", value: `${state.facts.wan.online} / ${state.facts.wan.total}` },
          { label: "CPU", value: formatPercent(resources.cpu) },
        ],
        rows: [
          { label: "采集通道", value: `${state.facts.collection.restLabel} · ${state.facts.collection.sshLabel}` },
          { label: "快照依据", value: freshnessText(snapshot, state), note: "RouterOS 当前记录" },
        ],
      };
    case "fleet":
      return {
        ...model,
        kicker: "线路汇总",
        title: `${state.facts.wan.online} / ${state.facts.wan.total} 条 WAN 运行`,
        summary: "默认路由有活动记录，汇总快照完整",
        clientLabel: `${formatNumber(state.counts.connections)} 条连接记录`,
        facts: [
          { label: "WAN", value: `${state.facts.wan.online} / ${state.facts.wan.total}` },
          { label: "连接", value: formatNumber(state.counts.connections) },
          { label: "CPU", value: formatPercent(resources.cpu) },
        ],
        rows: [
          { label: "活动出口", value: model.routeLabel },
          { label: "快照依据", value: freshnessText(snapshot, state), note: "RouterOS 汇总记录" },
        ],
        actionTitle: "查看线路分布",
        actionNote: "默认路由、WAN 与连接范围",
      };
    case "all-offline":
      return {
        ...model,
        incident: true,
        pathState: "offline",
        internetLabel: "业务出口不可用",
        routeLabel: "无活动默认路由",
        clientLabel: "局域网记录保留",
        showRates: false,
        kicker: "出口中断",
        title: `全部 ${state.facts.wan.total} 条 WAN 未运行`,
        summary: "没有活动默认路由，当前业务速率不展示",
        facts: [
          { label: "WAN", value: `0 / ${state.facts.wan.total}`, tone: "danger" },
          { label: "活动路由", value: "0", tone: "danger" },
          { label: "采集", value: state.facts.collection.credibility === "realtime" ? "当前采样" : state.facts.collection.credibilityLabel },
        ],
        rows: [
          { label: "影响范围", value: "全部外网业务" },
          { label: "证据边界", value: "转发面无活动出口" },
          { label: "优先检查", value: "物理链路与 PPPoE" },
        ],
        actionTitle: "查看离线线路",
        actionNote: "对象、依赖与最近变化",
      };
    case "no-snapshot":
      return {
        ...model,
        incident: true,
        pathState: "unknown",
        internetLabel: "当前状态未知",
        routeLabel: "默认路由未知",
        clientLabel: "终端状态未知",
        showRates: false,
        kicker: "证据缺失",
        title: "当前业务状态不可判断",
        summary: "没有可用业务快照；速率、资源与终端数字已隐藏",
        facts: [
          { label: "REST", value: "待确认", tone: "warn" },
          { label: "SSH", value: "不可用", tone: "danger" },
          { label: "失败端点", value: failureCount(state), tone: "warn" },
        ],
        rows: [
          { label: "不可判断", value: "业务、转发与资源" },
          { label: "仍可参考", value: `最后成功 ${latestRecord(snapshot)}` },
          { label: "优先检查", value: "REST / SSH 采集链路" },
        ],
        actionTitle: "打开采集诊断",
        actionNote: "失败端点与恢复记录",
      };
    case "collection-down":
      return {
        ...model,
        incident: true,
        pathState: "cached",
        internetLabel: "承载证据来自缓存",
        routeLabel: `缓存 · ${gateway}`,
        clientLabel: "终端记录来自缓存",
        ratePrefix: "上次",
        kicker: "采集降级",
        title: "采集链路尚未恢复",
        summary: "业务数字来自最后成功快照，新变化当前不可见",
        facts: [
          { label: "缓存时间", value: latestRecord(snapshot), tone: "warn" },
          { label: "失败端点", value: failureCount(state), tone: "warn" },
          { label: "路由记录", value: "已保留" },
        ],
        rows: [
          { label: "管理面", value: snapshot.status === "error" ? "不可达" : "有历史记录" },
          { label: "采集面", value: "REST / SSH 未恢复" },
          { label: "优先检查", value: "先 REST，后 SSH" },
        ],
        actionTitle: "打开采集诊断",
        actionNote: "通道、端点与重试记录",
      };
    case "resource-full": {
      const samples = resourceSamples(snapshot);
      const sampleText = samples.total ? `${samples.exceeded} / ${samples.total}` : "当前";
      return {
        ...model,
        incident: true,
        kicker: "资源压力",
        title: samples.total ? `资源连续 ${sampleText} 个采样点超限` : "资源当前超过阈值",
        summary: `磁盘 ${formatPercent(resources.disk)}，CPU 与内存同时处于高位`,
        facts: [
          { label: "CPU", value: formatPercent(resources.cpu), tone: "danger" },
          { label: "内存", value: formatPercent(resources.memory), tone: "danger" },
          { label: "磁盘", value: formatPercent(resources.disk), tone: "danger" },
        ],
        rows: [
          { label: "持续证据", value: samples.total ? `${sampleText} 个采样点` : "单点记录" },
          { label: "可能影响", value: "采集与转发稳定性" },
          { label: "优先检查", value: "连接压力与高吞吐接口" },
        ],
        actionTitle: "查看资源诊断",
        actionNote: "阈值、持续证据与连接压力",
      };
    }
    case "interfaces-down": {
      const names = state.facts.interfaces.downNames.slice(0, 2).join(" / ") || "接口";
      return {
        ...model,
        incident: true,
        kicker: "接口异常",
        title: `${names} 未运行`,
        summary: "默认路由仍有活动记录；受影响依赖需要核对",
        facts: [
          { label: "接口 Down", value: `${state.facts.interfaces.down} / ${state.facts.interfaces.total}`, tone: "danger" },
          { label: "默认路由", value: route?.active ? "承载中" : "待确认" },
          { label: "WAN", value: `${state.facts.wan.online} / ${state.facts.wan.total}` },
        ],
        rows: [
          { label: "影响对象", value: names },
          { label: "关联依赖", value: "父接口、VLAN 与 PPPoE" },
          { label: "路由后果", value: route?.active ? "默认出口仍承载" : "默认出口待确认" },
        ],
        actionTitle: "查看接口关系",
        actionNote: "父级、VLAN 与路由后果",
      };
    }
  }
}
