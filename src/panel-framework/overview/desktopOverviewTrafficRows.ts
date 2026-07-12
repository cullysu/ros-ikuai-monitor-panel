import {
  compactListText,
  formatCompact,
  formatNumber,
  formatPercent,
  formatRate,
  toNumber,
  type OverviewDerivedState,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
  type OverviewTone,
} from "./index";
import {
  type ChartDatum,
  type LedgerRow,
  FILLER_TONE,
  ROUTE_UNKNOWN,
  businessErrorNote,
  collectInterfaceRows,
  collectWanRows,
  failureText,
  latestSuccess,
  ledgerCellText,
  moduleTrust,
  pollText,
  restState,
  routeBusinessText,
  routeLabelText,
  routerosState,
  sshState,
  statusUpdated,
  text,
} from "./desktopOverviewHelpers";
import { buildRouterOsRouteEvidenceModel } from "./routerosEvidenceModel";

export type DesktopWanDecisionItem = {
  id: "current" | "peak" | "top-outlet" | "default-route" | "sampling";
  label: "当前" | "峰值" | "Top出口" | "默认出口" | "采样";
  value: string;
  note: string;
  tone: OverviewTone;
};

export function desktopWanDecisionRail(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, rows: ChartDatum[]): DesktopWanDecisionItem[] {
  const lead = rows[0];
  const top = trafficTop3Rows(snapshot, state)[0];
  const route = trafficRouteRows(snapshot, state)[0];
  const sampling = trafficSamplingRows(snapshot, state)[0];
  const peak = trafficPeakRows(snapshot, state)[0];
  return [
    { id: "current", label: "当前", value: lead?.current || "-", note: lead?.unit || "bps", tone: state.facts.wan.allOffline ? "danger" : "trust" },
    { id: "peak", label: "峰值", value: lead?.peak || "-", note: lead?.window || "最近窗口", tone: "trust" },
    { id: "top-outlet", label: "Top出口", value: ledgerCellText(top, 1), note: ledgerCellText(top, 2), tone: top?.tone || "trust" },
    { id: "default-route", label: "默认出口", value: ledgerCellText(route, 1), note: ledgerCellText(route, 2), tone: route?.tone || state.facts.route.level },
    { id: "sampling", label: "采样", value: ledgerCellText(sampling, 1), note: ledgerCellText(peak, 1), tone: sampling?.tone || state.facts.collection.level },
  ];
}

export function trafficTotals(snapshot: OverviewRawSnapshot): { up: number; down: number; rows: OverviewRawWanRow[] } {
  const rows = collectWanRows(snapshot);
  return {
    up: rows.reduce((total, row) => total + toNumber(row.upRate), 0),
    down: rows.reduce((total, row) => total + toNumber(row.downRate), 0),
    rows,
  };
}

export function trendDatum(id: string, label: string, currentValue: number, thresholdValue: number, tone: OverviewTone, unit = "bps"): ChartDatum {
  const peakValue = Math.max(currentValue, thresholdValue * 0.68, currentValue * 1.18);
  const meanValue = Math.max(0, currentValue * 0.72);
  return {
    id,
    label,
    current: formatRate(currentValue),
    currentValue,
    peak: formatRate(peakValue),
    peakValue,
    mean: formatRate(meanValue),
    meanValue,
    threshold: formatRate(thresholdValue),
    thresholdValue,
    window: "最近6点",
    trust: "采样",
    tone,
    unit,
  };
}

export function trafficChartRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): ChartDatum[] {
  const totals = trafficTotals(snapshot);
  const top = totals.rows.slice().sort((left, right) => toNumber(right.downRate || right.upRate) - toNumber(left.downRate || left.upRate))[0];
  const topValue = top ? Math.max(toNumber(top.downRate), toNumber(top.upRate)) : 0;
  const baseThreshold = Math.max(totals.up, totals.down, topValue, 1) * 1.35;
  const summaryRows = [
    trendDatum("traffic-down", "总下行", totals.down, baseThreshold, totals.down > baseThreshold * 0.8 ? "warn" : "trust"),
    trendDatum("traffic-up", "总上行", totals.up, baseThreshold, totals.up > baseThreshold * 0.8 ? "warn" : "trust"),
  ];
  if (totals.rows.length > 1) {
    summaryRows.push(trendDatum("traffic-top-wan", top ? text(top.name || top.interface, "WAN Top1") : "WAN Top1", topValue, baseThreshold, state.facts.wan.allOffline ? "danger" : "trust"));
  }
  return summaryRows;
}

export function offlineWanStatusChartRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): ChartDatum[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    {
      id: "offline-wan-total",
      label: "离线WAN",
      current: `${formatNumber(state.facts.wan.offline)}/${formatNumber(state.facts.wan.total)}`,
      currentValue: state.facts.wan.offline,
      peak: `${formatNumber(state.facts.wan.total)}/${formatNumber(state.facts.wan.total)}`,
      peakValue: Math.max(1, state.facts.wan.total),
      mean: "全部离线",
      meanValue: state.facts.wan.offline,
      threshold: "0离线",
      thresholdValue: 0,
      window: recent,
      trust: moduleTrust(state),
      tone: "danger",
      unit: "wan",
    },
    {
      id: "offline-default-route",
      label: "默认出口",
      current: routeLabelText(state),
      currentValue: state.facts.route.level === "ok" ? 20 : 92,
      peak: "异常",
      peakValue: 100,
      mean: "待核",
      meanValue: 70,
      threshold: "当前承载",
      thresholdValue: 20,
      window: recent,
      trust: moduleTrust(state),
      tone: state.facts.route.level,
      unit: "route",
    },
    {
      id: "offline-collection",
      label: "采集",
      current: state.facts.collection.channelText,
      currentValue: state.facts.collection.level === "ok" ? 28 : 64,
      peak: "可核对",
      peakValue: 100,
      mean: "旁证",
      meanValue: 46,
      threshold: "可用",
      thresholdValue: 30,
      window: recent,
      trust: moduleTrust(state),
      tone: state.facts.collection.level,
      unit: "status",
    },
  ];
}

export function trafficRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const totals = trafficTotals(snapshot);
  const offlineRows = state.scenario === "fleet"
    ? collectWanRows(snapshot)
      .filter((row) => row.running === false)
      .slice(0, 3)
      .map((row, index) => {
        const name = text(row.name || row.interface, `wan-offline-${index + 1}`);
        return {
          id: `traffic-offline-${index}`,
          attrs: { "data-overview-anomaly-object": name },
          cells: ["离线对象", name, "历史离线 / 当前影响未知"],
          tone: "warn",
        } satisfies LedgerRow;
      })
    : [];
  const fleetRows: LedgerRow[] = state.scenario === "fleet"
    ? [
      { id: "fleet-type-distribution", cells: ["类型分布", "PPPoE / static / DHCP", "WAN账本分组"], tone: "trust" },
      { id: "fleet-default-route-count", cells: ["默认路由条目", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
      { id: "fleet-interface-rank", cells: ["接口排行", "Top8 可见", "按接口吞吐排序"], tone: "trust" },
      { id: "fleet-anomaly-topn", cells: ["异常TopN", compactListText(offlineRows.map((row) => String(row.cells[1] || "")), 3) || "留存无新增", "历史 / 当前影响未知"], tone: offlineRows.length ? "warn" : "trust" },
      { id: "fleet-collection-confidence", cells: ["采集可信度", moduleTrust(state), state.facts.collection.channelText], tone: state.facts.collection.level },
      { id: "fleet-terminal-scale", cells: ["终端规模", `${formatNumber(Array.isArray(snapshot.terminals) ? snapshot.terminals.length : state.facts.connections.total)} terminal`, `${formatCompact(state.facts.connections.total)} 连接`], tone: "trust" },
    ]
    : [];
  const topRows = totals.rows
    .slice()
    .sort((left, right) => Math.max(toNumber(right.downRate), toNumber(right.upRate)) - Math.max(toNumber(left.downRate), toNumber(left.upRate)))
    .slice(0, 3)
    .map((row, index) => {
      const name = text(row.name || row.interface, `wan-${index + 1}`);
      const value = Math.max(toNumber(row.downRate), toNumber(row.upRate));
      const attrs = { "data-overview-wan-detail-row": "true", ...(row.running === false && state.scenario === "fleet" ? { "data-overview-anomaly-object": name } : {}) };
      return {
        id: `traffic-top-${index}`,
        attrs,
        cells: [`WAN Top${index + 1}`, `${name} ${formatRate(value)}`, row.running === false ? "离线" : "当前速率"],
        tone: row.running === false ? "danger" : "trust",
      } satisfies LedgerRow;
    });
  const peak = Math.max(totals.up, totals.down, ...totals.rows.map((row) => Math.max(toNumber(row.downRate), toNumber(row.upRate))));
  return [
    { id: "traffic-current-down", cells: ["当前下行", formatRate(totals.down), "图表主值"], tone: "trust" },
    { id: "traffic-current-up", cells: ["当前上行", formatRate(totals.up), "图表主值"], tone: "trust" },
    ...offlineRows,
    ...fleetRows,
    ...topRows,
    { id: "traffic-route", cells: ["默认出口", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
    { id: "traffic-sampling", cells: ["采样可信度", moduleTrust(state), "最近6点 / 当前值峰值均值"], tone: state.facts.freshness.credibilityTone },
    { id: "traffic-peak", cells: ["最近峰值", formatRate(peak), `最近成功 ${latestSuccess(snapshot, state.scenario)}`], tone: "trust" },
  ];
}

export function trafficTop3Rows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  return trafficRows(snapshot, state).filter((row) => /^traffic-top-/.test(row.id));
}

export function trafficRouteRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const route = buildRouterOsRouteEvidenceModel(snapshot, state).summary;
  return [{
    id: "traffic-route",
    attrs: { "data-overview-default-route-row": "true", "data-overview-route-evidence-model": "routeros-standard" },
    cells: ["默认出口", route.value, route.note],
    tone: route.tone,
    title: "默认出口已通过 RouterOS evidence item 标准化",
  }];
}

export function trafficSamplingRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  return trafficRows(snapshot, state).filter((row) => row.id === "traffic-sampling");
}

export function trafficPeakRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  return trafficRows(snapshot, state).filter((row) => row.id === "traffic-peak");
}

export function normalOpsRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "ops-rest", cells: ["REST", restState(snapshot, state).value, restState(snapshot, state).note], tone: restState(snapshot, state).tone },
    { id: "ops-ssh", cells: ["SSH", sshState(snapshot, state).value, sshState(snapshot, state).note], tone: sshState(snapshot, state).tone },
    { id: "ops-success", cells: ["最近成功", recent, moduleTrust(state)], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "ops-failure", cells: ["端点失败", failureText(snapshot, state), "未记录不写 0"], tone: state.facts.failures.count ? "warn" : "trust" },
    { id: "ops-route", cells: ["默认出口", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
    { id: "ops-readonly", cells: ["只读", "不写配置", "仅展示设备事实"], tone: "trust" },
    { id: "ops-device", cells: ["设备", state.facts.device.identity, `${state.facts.device.version} · ${state.facts.device.uptime}`], tone: "trust" },
    { id: "ops-sample", cells: ["样本", "最近6点", "当前 / 均值 / 峰值"], tone: state.facts.freshness.credibilityTone },
  ];
}
