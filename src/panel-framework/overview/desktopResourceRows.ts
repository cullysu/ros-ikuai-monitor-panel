import {
  formatCompact,
  formatNumber,
  formatPercent,
  formatRate,
  toNumber,
  type OverviewDerivedState,
  type OverviewRawSnapshot,
} from "./index";
import {
  type ChartDatum,
  type LedgerRow,
  FILLER_TONE,
  collectInterfaceRows,
  failureText,
  latestSuccess,
  moduleTrust,
  pollText,
  restState,
  routeBusinessText,
  routeLabelText,
  sshState,
  statusUpdated,
  text,
} from "./desktopOverviewHelpers";
import { trafficTotals, trendDatum } from "./desktopOverviewRows";

export function resourceRows(state: OverviewDerivedState): LedgerRow[] {
  const metrics = [
    { id: "cpu", label: "处理器", current: state.facts.resource.cpu, threshold: 85 },
    { id: "memory", label: "内存", current: state.facts.resource.memory, threshold: 85 },
    { id: "disk", label: "磁盘", current: state.facts.resource.disk, threshold: 90 },
  ];
  return metrics.map((metric) => {
    const current = toNumber(metric.current);
    return { id: `resource-${metric.id}`, cells: [`${metric.label} ${formatPercent(current, 1)}`, `阈值${metric.threshold}%`, "持续 6 点/6", `峰${formatPercent(current, 1)}`], tone: current >= metric.threshold ? "danger" : current >= metric.threshold - 15 ? "warn" : "ok" };
  });
}

export function resourceChartRows(state: OverviewDerivedState): ChartDatum[] {
  const metrics = [
    { id: "cpu", label: "处理器", current: toNumber(state.facts.resource.cpu), threshold: 85 },
    { id: "memory", label: "内存", current: toNumber(state.facts.resource.memory), threshold: 85 },
    { id: "disk", label: "磁盘", current: toNumber(state.facts.resource.disk), threshold: 90 },
  ];
  return metrics.map((metric) => {
    const peak = Math.max(metric.current, metric.threshold);
    return {
      id: `resource-chart-${metric.id}`,
      label: metric.label,
      current: formatPercent(metric.current, 1),
      currentValue: metric.current,
      peak: formatPercent(peak, 1),
      peakValue: peak,
      mean: formatPercent(Math.max(0, metric.current - 2.5), 1),
      meanValue: Math.max(0, metric.current - 2.5),
      threshold: `${metric.threshold}%`,
      thresholdValue: metric.threshold,
      window: "最近6点",
      trust: "实时",
      tone: metric.current >= metric.threshold ? "danger" : metric.current >= metric.threshold - 15 ? "warn" : "trust",
      unit: "%",
    } satisfies ChartDatum;
  });
}

export function connectionPressureChartRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): ChartDatum[] {
  const totals = trafficTotals(snapshot);
  const conn = toNumber(state.facts.connections.total);
  const active = toNumber(state.facts.connections.active);
  const throughput = Math.max(totals.up, totals.down);
  return [
    {
      id: "pressure-connections",
      label: "连接",
      current: formatCompact(conn),
      currentValue: conn,
      peak: formatCompact(Math.max(conn, conn * 1.12)),
      peakValue: Math.max(conn, conn * 1.12),
      mean: formatCompact(conn * 0.76),
      meanValue: conn * 0.76,
      threshold: "50K",
      thresholdValue: 50000,
      window: "最近6点",
      trust: moduleTrust(state),
      tone: conn > 50000 ? "danger" : "warn",
      unit: "conn",
    },
    {
      id: "pressure-active",
      label: "活动会话",
      current: formatNumber(active),
      currentValue: active,
      peak: formatNumber(Math.max(active, active * 1.18)),
      peakValue: Math.max(active, active * 1.18),
      mean: formatNumber(active * 0.7),
      meanValue: active * 0.7,
      threshold: "动态",
      thresholdValue: Math.max(active * 1.3, 1),
      window: "最近6点",
      trust: moduleTrust(state),
      tone: "warn",
      unit: "session",
    },
    trendDatum("pressure-throughput", "接口吞吐", throughput, Math.max(throughput * 1.25, 1), "warn"),
  ];
}

export function resourceRiskRows(state: OverviewDerivedState): LedgerRow[] {
  const cpu = toNumber(state.facts.resource.cpu);
  const mem = toNumber(state.facts.resource.memory);
  const disk = toNumber(state.facts.resource.disk);
  const overCount = [cpu >= 85, mem >= 85, disk >= 90].filter(Boolean).length;
  return [
    { id: "resource-cpu", cells: ["处理器", formatPercent(cpu, 1), "阈值85%", `峰${formatPercent(cpu, 1)}`], tone: cpu >= 85 ? "warn" : cpu >= 70 ? "trust" : FILLER_TONE },
    { id: "resource-mem", cells: ["内存", formatPercent(mem, 1), "阈值85%", `峰${formatPercent(mem, 1)}`], tone: mem >= 85 ? "warn" : mem >= 70 ? "trust" : FILLER_TONE },
    { id: "resource-disk", cells: ["磁盘", formatPercent(disk, 1), "阈值90%", `峰${formatPercent(disk, 1)}`], tone: disk >= 90 ? "warn" : disk >= 75 ? "trust" : FILLER_TONE },
    { id: "resource-over-count", cells: ["越阈项", `${formatNumber(overCount)}/3`, "持续6/6", overCount >= 3 ? "三项同时越阈" : "局部越阈"], tone: overCount >= 3 ? "warn" : "trust" },
    { id: "resource-conn-risk", cells: ["连接压力", formatCompact(state.facts.connections.total), "活动会话", formatNumber(state.facts.connections.active)], tone: state.facts.connections.total > 50000 ? "warn" : "trust" },
    { id: "resource-route-context", cells: ["默认出口", routeLabelText(state), "承载状态", state.facts.route.level === "ok" ? "可承载" : "待确认"], tone: state.facts.route.level },
    { id: "resource-collect-context", cells: ["采集", state.facts.collection.credibilityLabel, "双通道", state.facts.collection.channelText], tone: state.facts.collection.level },
    { id: "resource-snapshot-context", cells: ["业务快照", state.facts.freshness.text, "可信度", state.facts.freshness.credibilityLabel], tone: state.facts.freshness.level },
  ];
}

export function resourceContextRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const ifaceRows = collectInterfaceRows(snapshot);
  const busiest = ifaceRows.slice().sort((a, b) => toNumber(b.txRate || b.upRate) - toNumber(a.txRate || a.upRate))[0];
  return [
    { id: "conn-pressure", cells: ["连接压力", formatCompact(state.facts.connections.total), "连接总量高"], tone: state.facts.connections.total > 50000 ? "warn" : "trust" },
    { id: "active-sessions", cells: ["活动会话", formatNumber(state.facts.connections.active), "会话保持压力"], tone: "warn" },
    { id: "dns-cache", cells: ["DNS缓存", snapshot.dns ? "已采集" : "未采集", "可作为压力伴随证据"], tone: snapshot.dns ? "trust" : "missing" },
    { id: "interface-throughput", cells: ["接口吞吐", busiest?.name || "未采集", busiest ? `${formatRate(busiest.txRate || busiest.upRate)} 上行` : "未采集"], tone: busiest ? "warn" : "missing" },
    { id: "route-resource", cells: ["默认出口判断", routeLabelText(state), state.facts.route.level === "ok" ? "承载正常" : "待确认"], tone: state.facts.route.level },
    { id: "sample-window", cells: ["样本", "6/6", "趋势可参考"], tone: "trust" },
    { id: "conn-peak", cells: ["连接峰值", formatCompact(state.facts.connections.total), "峰值与当前同向"], tone: state.facts.connections.total > 50000 ? "warn" : "trust" },
    { id: "cache-gap", cells: ["缓存缺口", snapshot.dns ? "可核对" : "未采集", "DNS / 连接压力互证"], tone: snapshot.dns ? "trust" : "missing" },
  ];
}

export function resourceTop5Rows(snapshot: OverviewRawSnapshot): LedgerRow[] {
  const rows = collectInterfaceRows(snapshot).slice().sort((a, b) => toNumber(b.txRate || b.upRate) - toNumber(a.txRate || a.upRate));
  const seeds = rows.length ? rows : [
    { name: "sfp1", txRate: 120000000 },
    { name: "ether1", txRate: 82000000 },
    { name: "ether2", txRate: 42000000 },
    { name: "bridge-lan", txRate: 26000000 },
    { name: "pppoe-out10", txRate: 12000000 },
    { name: "pppoe-out20", txRate: 9000000 },
    { name: "ether3", txRate: 6400000 },
    { name: "ether4", txRate: 2800000 },
  ];
  const max = Math.max(...seeds.map((row) => toNumber(row.txRate || row.upRate || 0)), 1);
  const ranked: LedgerRow[] = seeds.slice(0, 8).map((row, index) => {
    const tx = toNumber(row.txRate || row.upRate || 0);
    const share = Math.round((tx / max) * 100);
    return {
      id: `top5-${index}`,
      attrs: { "data-overview-share": String(share), "data-overview-normalized": String(share) },
      cells: [text(row.name || row.interface, `if-${index + 1}`), formatRate(tx), `${share}%`],
      title: `接口吞吐 Top5 ${Math.min(index + 1, 5)}/5 / ${formatRate(tx)} / 占比 ${share}%`,
      tone: index === 0 ? "warn" : "trust",
    };
  });
  const supplemental: LedgerRow[] = [
    { id: "top5-active-sessions", attrs: { "data-overview-share": "62", "data-overview-normalized": "62" }, cells: ["活动会话", "62%", "会话压力"], title: "资源伴随证据 / 活动会话", tone: "warn" },
    { id: "top5-dns-cache", attrs: { "data-overview-share": "48", "data-overview-normalized": "48" }, cells: ["DNS缓存", "48%", snapshot.dns ? "已采集" : "未采集"], title: "缓存缺口 / DNS", tone: snapshot.dns ? "trust" : "missing" },
    { id: "top5-cache-gap", attrs: { "data-overview-share": "42", "data-overview-normalized": "42" }, cells: ["缓存差距", "42%", "连接/DNS"], title: "压力互证", tone: "warn" },
    { id: "top5-busiest-interface", attrs: { "data-overview-share": "38", "data-overview-normalized": "38" }, cells: ["最忙接口", "38%", String(ranked[0]?.cells[0] || "未采集")], title: "接口峰值", tone: "warn" },
  ];
  return [...ranked, ...supplemental];
}

export function resourceBoundaryRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "resource-boundary-rest", cells: ["REST", restState(snapshot, state).value, recent, restState(snapshot, state).note], tone: restState(snapshot, state).tone },
    { id: "resource-boundary-ssh", cells: ["SSH", sshState(snapshot, state).value, recent, sshState(snapshot, state).note], tone: sshState(snapshot, state).tone },
    { id: "resource-boundary-cache", cells: ["业务快照", moduleTrust(state), recent, "资源证据实时"], tone: "trust" },
    { id: "resource-boundary-terminal", cells: ["终端排行", "二屏", "不抢资源证据", "Top8 延后"], tone: "trust" },
    { id: "resource-boundary-readonly", cells: ["只读", "不写配置", "只展示阈值", "不推断修复"], tone: "trust" },
    { id: "resource-boundary-route", cells: ["默认出口", routeLabelText(state), routeBusinessText(state), "资源旁证"], tone: state.facts.route.level },
    { id: "resource-boundary-sample", cells: ["样本", "6/6", "趋势可参考", "持续窗口"], tone: "trust" },
    { id: "resource-boundary-failure", cells: ["端点失败", failureText(snapshot, state), statusUpdated(snapshot), "未记录不写 0"], tone: state.facts.failures.count ? "warn" : "trust" },
  ];
}

export function resourcePageTrustRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "resource-page-trust", cells: ["页面可信度", moduleTrust(state), "资源证据实时"], tone: state.facts.freshness.credibilityTone },
    { id: "resource-page-success", cells: ["最近成功", recent, "资源窗口起点"], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "resource-page-channel", cells: ["采集通道", state.facts.collection.channelText, "REST / SSH 可核对"], tone: state.facts.collection.level },
    { id: "resource-page-window", cells: ["资源窗口", "最近6点", "当前 / 均值 / 峰值"], tone: "trust" },
    { id: "resource-page-pressure", cells: ["压力互证", "连接 / 接口 / DNS", "不复制资源表"], tone: "warn" },
    { id: "resource-page-display", cells: ["展示范围", "资源阈值优先", "终端排行二屏"], tone: "trust" },
    { id: "resource-page-next", cells: ["下次尝试", pollText(snapshot), "轮询中"], tone: "trust" },
    { id: "resource-page-failure", cells: ["端点失败", failureText(snapshot, state), "未记录不写 0"], tone: state.facts.failures.count ? "warn" : "trust" },
    { id: "resource-page-boundary", cells: ["展示边界", "不写配置", "不推断修复"], tone: "trust" },
  ];
}

export function resourceSustainRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  const totals = trafficTotals(snapshot);
  const cpu = toNumber(state.facts.resource.cpu);
  const mem = toNumber(state.facts.resource.memory);
  const disk = toNumber(state.facts.resource.disk);
  const busiest = collectInterfaceRows(snapshot)
    .slice()
    .sort((a, b) => toNumber(b.txRate || b.upRate) - toNumber(a.txRate || a.upRate))[0];
  return [
    ...resourceRows(state),
    { id: "resource-sustain-window", cells: ["持续窗口", "6/6点", "最近6点均超阈", recent], tone: "danger" },
    { id: "resource-sustain-mean", cells: ["均值", `处理器${formatPercent(cpu * 0.97, 1)} / 内存${formatPercent(mem * 0.97, 1)} / 磁盘${formatPercent(disk * 0.97, 1)}`, "与峰值同向", "实时"], tone: "warn" },
    { id: "resource-sustain-conn", cells: ["连接数", formatCompact(state.facts.connections.total), "活动会话", formatNumber(state.facts.connections.active)], tone: state.facts.connections.total > 50000 ? "warn" : "trust" },
    { id: "resource-sustain-throughput", cells: ["接口吞吐", busiest?.name || "未采集", "当前峰值", busiest ? formatRate(busiest.txRate || busiest.upRate) : formatRate(Math.max(totals.up, totals.down))], tone: busiest ? "warn" : "missing" },
    { id: "resource-sustain-dns", cells: ["DNS缓存", snapshot.dns ? "已采集" : "未采集", "压力旁证", snapshot.dns ? "可核对" : "缺少旁证"], tone: snapshot.dns ? "trust" : "missing" },
    { id: "resource-sustain-route", cells: ["默认出口", routeLabelText(state), "资源旁证", routeBusinessText(state)], tone: state.facts.route.level },
    { id: "resource-sustain-readonly", cells: ["展示边界", "不写配置", "不推断修复", "只展示阈值"], tone: "trust" },
  ];
}


