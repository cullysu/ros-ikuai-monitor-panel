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
    trust: "实时",
    tone,
    unit,
  };
}

export function trafficChartRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): ChartDatum[] {
  const totals = trafficTotals(snapshot);
  const top = totals.rows.slice().sort((left, right) => toNumber(right.downRate || right.upRate) - toNumber(left.downRate || left.upRate))[0];
  const topValue = top ? Math.max(toNumber(top.downRate), toNumber(top.upRate)) : 0;
  const baseThreshold = Math.max(totals.up, totals.down, topValue, 1) * 1.35;
  return [
    trendDatum("traffic-down", "总下行", totals.down, baseThreshold, totals.down > baseThreshold * 0.8 ? "warn" : "trust"),
    trendDatum("traffic-up", "总上行", totals.up, baseThreshold, totals.up > baseThreshold * 0.8 ? "warn" : "trust"),
    trendDatum("traffic-top-wan", top ? text(top.name || top.interface, "WAN Top1") : "WAN Top1", topValue, baseThreshold, state.facts.wan.allOffline ? "danger" : "trust"),
  ];
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

export function routeFactRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const routeEvidence = buildRouterOsRouteEvidenceModel(snapshot, state);
  const summaryRow: LedgerRow = {
    id: "route-business-summary",
    attrs: {
      "data-overview-default-route-row": "true",
      "data-routeros-route-evidence-contract": routeEvidence.contract,
      "data-routeros-evidence-item": "business",
      "data-routeros-evidence-role": "business-summary-primary",
      "data-routeros-raw-field-mode": "hidden-secondary",
    },
    cells: [
      routeEvidence.summary.label,
      routeEvidence.summary.value,
      "业务结论",
      routeEvidence.summary.note,
    ],
    title: "RouterOS 原始 route 字段已标准化为业务出口结论；原始字段仅作为二级证据",
    tone: routeEvidence.summary.tone,
  };
  return [summaryRow, ...routeEvidence.businessRows.map((route) => ({
    id: route.id,
    attrs: {
      "data-overview-default-route-row": "true",
      "data-overview-route-copy": "business",
      "data-routeros-route-evidence-contract": routeEvidence.contract,
      "data-routeros-evidence-item": route.layer,
      "data-routeros-evidence-role": "business-main",
      "data-routeros-raw-field-mode": "business-translated-no-raw-attrs",
      "data-routeros-v1047-business-route-copy": "gateway-priority-status-no-routeros-raw-fields",
    },
    cells: [
      route.label,
      `网关 ${route.gateway}`,
      `优先级 ${route.priority}`,
      route.status,
    ],
    title: route.title,
    tone: route.tone,
  }))];
}

export function routeBusinessRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const routeEvidence = buildRouterOsRouteEvidenceModel(snapshot, state);
  return routeEvidence.businessRows.slice(0, 4).map((route) => ({
    id: `route-business-${route.routeIndex}`,
    attrs: {
      "data-overview-default-route-row": "true",
      "data-overview-route-copy": "business-main",
      "data-routeros-route-evidence-contract": routeEvidence.contract,
      "data-routeros-evidence-item": route.layer,
      "data-routeros-evidence-role": "business-main",
      "data-routeros-raw-field-mode": "business-translated-no-raw-attrs",
      "data-routeros-v1047-business-route-copy": "gateway-priority-status-no-routeros-raw-fields",
    },
    cells: [
      route.label,
      route.gateway,
      `优先级 ${route.priority}`,
      route.status,
    ],
    title: route.title,
    tone: route.tone,
  }));
}

export function routeRawEvidenceRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const routeEvidence = buildRouterOsRouteEvidenceModel(snapshot, state);
  return routeEvidence.rawRows.map((item) => ({
    id: item.id,
    attrs: {
      "data-overview-default-route-row": "true",
      "data-routeros-route-evidence-contract": routeEvidence.contract,
      "data-routeros-evidence-item": item.layer,
      "data-routeros-evidence-role": "raw-secondary",
      "data-routeros-raw-field-mode": "secondary-collapsed-evidence",
      "data-routeros-raw-field-contract": "table-gateway-distance-active-disabled-secondary",
      "data-routeros-v1047-raw-secondary-rail": "bottom-collapsed-low-noise",
      "data-routeros-raw-table": item.rawFields?.table || "",
      "data-routeros-raw-gateway": item.rawFields?.gateway || "",
      "data-routeros-raw-distance": item.rawFields?.distance || "",
      "data-routeros-raw-active": item.rawFields?.active || "",
      "data-routeros-raw-disabled": item.rawFields?.disabled || "",
    },
    cells: [
      item.label,
      item.value,
      "table / gateway / distance / active / disabled 二级证据",
    ],
    title: `${item.value} · ${item.note}`,
    tone: item.tone,
  }));
}

export function wanRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const rows = collectWanRows(snapshot);
  if (!rows.length) {
    return [{ id: "wan-unavailable", attrs: { "data-overview-wan-detail-row": "true" }, cells: ["WAN", state.scenario === "no-snapshot" ? "隐藏" : "未采集", state.scenario === "no-snapshot" ? "无业务快照，业务数据不展示" : "无 WAN 清单"], tone: state.scenario === "no-snapshot" ? "missing" : "warn" }];
  }
  const orderedRows = state.scenario === "fleet" || state.scenario === "all-offline"
    ? rows.slice().sort((left, right) => Number(left.running !== false) - Number(right.running !== false))
    : rows;
  const visibleLimit = state.scenario === "all-offline" ? 8 : state.scenario === "fleet" ? 16 : 6;
  return orderedRows.slice(0, visibleLimit).map((row, index) => {
    const name = text(row.name || row.interface, `wan-${index + 1}`);
    const parent = text(row.parent || row.interface || row.kind || row.access, "-");
    const routeCarrying = Array.isArray(row.routes) && row.routes.some((route) => route.active && !route.disabled) ? "承载" : "未承载";
    const rate = state.scenario === "no-snapshot" ? "速率不展示" : row.running === false ? "离线无速率" : `${formatRate(row.upRate)} / ${formatRate(row.downRate)}`;
    return {
      id: `wan-${name}-${index}`,
      attrs: {
        "data-overview-wan-detail-row": "true",
        ...(row.running === false ? { "data-overview-anomaly-object": name } : {}),
      },
      cells: [<><b>{name}</b><small>{parent}</small></>, row.running === false ? "离线" : "在线", state.scenario === "no-snapshot" ? "速率不展示" : `${routeCarrying} · ${rate}`],
      tone: row.running === false ? "danger" : "ok",
    };
  });
}

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

export function interfaceRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const rows = collectInterfaceRows(snapshot).filter((row) => row.running === false);
  if (!rows.length) return [{ id: "interface-ok", cells: ["接口转发面", "未发现 down", `REST / SSH 与转发面分离判断 / ${routeLabelText(state)}`], tone: state.scenario === "interfaces-down" ? "warn" : "ok" }];
  return rows.slice(0, 8).map((row, index) => {
    const name = text(row.name || row.interface, `if-${index + 1}`);
    const parent = text(row.parent || row.master || "-", "-");
    const bridge = text(row.bridge || "-", "-");
    const vlan = text(row.vlan || row.vlanId || "-", "-");
    return {
      id: `if-${name}-${index}`,
      cells: [
        <><b>{name}</b><small>父接口 {parent}</small></>,
        "已断开",
        `桥接 ${bridge} / VLAN ${vlan} / 默认出口 ${routeLabelText(state)}`,
      ],
      tone: "danger",
    };
  });
}

export function interfaceRelationRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const rows = collectInterfaceRows(snapshot).filter((row) => row.running === false);
  if (!rows.length) return [{ id: "if-relation-ok", cells: ["接口关系", "未记录", "无 down 接口关系需要展开"], tone: "trust" }];
  const relationRows: LedgerRow[] = rows.slice(0, 8).map((row, index) => {
    const name = text(row.name || row.interface, `if-${index + 1}`);
    const parent = text(row.parent || row.master || "-", "-");
    const bridge = text(row.bridge || "-", "-");
    const vlan = text(row.vlan || row.vlanId || "-", "-");
    const pppoe = text(row.pppoeOut || row.pppoe || "-", "-");
    return {
      id: `if-relation-${name}-${index}`,
      cells: [name, `父接口 ${parent}`, `桥接 ${bridge} / VLAN ${vlan} / PPPoE出口 ${pppoe}`],
      tone: "warn",
    };
  });
  return relationRows.concat([
    { id: "if-relation-boundary", cells: ["判断边界", "采集面分离", "REST/SSH 不替代转发面判断"], tone: "trust" },
    { id: "if-relation-route", cells: ["默认出口", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
  ]);
}

export function interfaceImpactRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const down = collectInterfaceRows(snapshot).filter((row) => row.running === false);
  const names = down.length
    ? `${formatNumber(down.length)}个，见清单`
    : "未记录";
  return [
    { id: "if-impact-count", cells: ["down 数", `${formatNumber(down.length)}`, "接口转发面异常", "REST SSH 可达性需分开看"], tone: down.length ? "danger" : "trust" },
    { id: "if-impact-names", cells: ["涉及接口", names, "父接口 / 桥接 / VLAN / PPPoE出口", "默认路由影响"], tone: down.length ? "danger" : "trust" },
    { id: "if-impact-route", cells: ["默认出口影响", routeLabelText(state), routeBusinessText(state), "转发面证据优先"], tone: state.facts.route.level },
    { id: "if-impact-parent", cells: ["父接口关系", "父接口", "桥接 / VLAN / PPPoE出口", "逐行核对"], tone: "warn" },
    { id: "if-impact-boundary", cells: ["判断边界", "只读", "不写配置", "不替代路由器明细"], tone: "trust" },
  ];
}

export function interfaceForwardingChartRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): ChartDatum[] {
  const down = collectInterfaceRows(snapshot).filter((row) => row.running === false);
  const recent = latestSuccess(snapshot, state.scenario);
  const routeRisk = state.facts.route.level === "ok" ? 18 : 86;
  return [
    {
      id: "interface-down-count",
      label: "down接口",
      current: `${formatNumber(down.length)}个`,
      currentValue: down.length,
      peak: `${formatNumber(Math.max(down.length, state.facts.interfaces.down || down.length))}个`,
      peakValue: Math.max(down.length, state.facts.interfaces.down || down.length, 1),
      mean: down.length ? "转发异常" : "未记录",
      meanValue: down.length ? Math.max(1, down.length * 0.72) : 0,
      threshold: "0 down",
      thresholdValue: 0,
      window: recent,
      trust: moduleTrust(state),
      tone: down.length ? "danger" : "trust",
      unit: "interface",
    },
    {
      id: "interface-route-impact",
      label: "默认出口",
      current: routeLabelText(state),
      currentValue: routeRisk,
      peak: "需核",
      peakValue: 100,
      mean: "转发证据优先",
      meanValue: 66,
      threshold: "当前承载",
      thresholdValue: 20,
      window: recent,
      trust: moduleTrust(state),
      tone: state.facts.route.level,
      unit: "route",
    },
    {
      id: "interface-collection-reachability",
      label: "采集可达",
      current: "REST/SSH",
      currentValue: state.scenario === "interfaces-down" ? 42 : 86,
      peak: "可达",
      peakValue: 100,
      mean: "采集面旁证",
      meanValue: 56,
      threshold: "可达",
      thresholdValue: 80,
      window: recent,
      trust: moduleTrust(state),
      tone: state.scenario === "interfaces-down" ? "warn" : "trust",
      unit: "status",
    },
  ];
}

export function interfaceCollectionRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  const rest = restState(snapshot, state);
  const ssh = sshState(snapshot, state);
  return [
    { id: "if-collection-routeros", cells: ["路由器管理面", routerosState(snapshot, state.scenario).value, recent, "采集入口" ], tone: routerosState(snapshot, state.scenario).tone },
    { id: "if-collection-rest", cells: ["REST", rest.value, recent, rest.note], tone: rest.tone },
    { id: "if-collection-ssh", cells: ["SSH", ssh.value, recent, ssh.note], tone: ssh.tone },
    { id: "if-collection-boundary", cells: ["判断边界", "采集面", "不替代接口转发面", state.facts.collection.channelText], tone: state.facts.collection.level },
  ];
}

export function interfacePageTrustRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "if-page-trust", cells: ["页面可信度", moduleTrust(state), "接口快照可参考"], tone: state.facts.freshness.credibilityTone },
    { id: "if-page-success", cells: ["最近成功", recent, "接口状态时间"], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "if-page-route", cells: ["默认出口", routeLabelText(state), "影响单独判定"], tone: state.facts.route.level },
    { id: "if-page-collection", cells: ["采集面", `${restState(snapshot, state).value} / ${sshState(snapshot, state).value}`, "不替代转发面"], tone: state.facts.collection.level },
    { id: "if-page-readonly", cells: ["展示边界", "不写配置", "仅展示证据"], tone: "trust" },
  ];
}

export function interfaceBoundaryRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  const down = collectInterfaceRows(snapshot).filter((row) => row.running === false);
  const names = compactListText(down.slice(0, 5).map((row, index) => text(row.name || row.interface, `if-${index + 1}`)), 5) || "未记录";
  const parentCount = new Set(down.map((row) => text(row.parent || row.master || "-", "-"))).size;
  const bridgeCount = down.filter((row) => text(row.bridge || "-", "-") !== "-").length;
  const vlanCount = down.filter((row) => text(row.vlan || row.vlanId || "-", "-") !== "-").length;
  return [
    { id: "if-boundary-object", cells: ["转发面对象", `${formatNumber(down.length)}个Down`, "涉及接口", names], tone: down.length ? "danger" : "trust" },
    { id: "if-boundary-parent", cells: ["父接口", `${formatNumber(parentCount)}组`, "桥接/VLAN", `${formatNumber(bridgeCount)}桥 / ${formatNumber(vlanCount)} VLAN`], tone: down.length ? "warn" : "trust" },
    { id: "if-boundary-route", cells: ["默认出口", routeLabelText(state), "影响判断", "转发面证据优先"], tone: state.facts.route.level },
    { id: "if-boundary-rest", cells: ["REST", restState(snapshot, state).value, recent, "采集面旁证"], tone: restState(snapshot, state).tone },
    { id: "if-boundary-ssh", cells: ["SSH", sshState(snapshot, state).value, recent, "不替代转发面"], tone: sshState(snapshot, state).tone },
    { id: "if-boundary-snapshot", cells: ["业务快照", moduleTrust(state), recent, "接口状态按快照显示"], tone: state.facts.freshness.credibilityTone },
    { id: "if-boundary-list", cells: ["接口清单", names, recent, "优先看Down对象"], tone: down.length ? "danger" : "trust" },
    { id: "if-boundary-scope", cells: ["影响范围", "转发面", recent, "不等同管理面"], tone: "warn" },
    { id: "if-boundary-recovery", cells: ["恢复判断", "未推断", recent, "等待下一次采样"], tone: "trust" },
    { id: "if-boundary-display", cells: ["展示范围", "接口 / 路由 / 采集", recent, "业务值不写配置"], tone: "trust" },
    { id: "if-boundary-next", cells: ["下次尝试", pollText(snapshot), "轮询中", "不承诺已恢复"], tone: "trust" },
    { id: "if-boundary-readonly", cells: ["展示边界", "不写配置", "不替代路由器明细", "仅展示证据"], tone: "trust" },
  ];
}

export function collectionRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  const rest = restState(snapshot, state);
  const ssh = sshState(snapshot, state);
  return [
    { id: "collection-routeros", cells: ["设备通达性", routerosState(snapshot, state.scenario).value, recent, businessErrorNote(snapshot.error, "当前可达")], tone: routerosState(snapshot, state.scenario).tone },
    { id: "collection-rest", cells: ["REST", rest.value, recent, rest.note], tone: rest.tone },
    { id: "collection-ssh", cells: ["SSH", ssh.value, recent, ssh.note], tone: ssh.tone },
    { id: "collection-cache", cells: ["数据层状态", state.scenario === "no-snapshot" ? "隐藏" : state.scenario === "collection-down" ? "缓存" : "实时", recent, state.scenario === "no-snapshot" ? "无业务快照，业务禁显" : state.scenario === "collection-down" ? "业务快照非实时 / 待恢复" : "业务快照可参考"], tone: state.scenario === "no-snapshot" ? "missing" : state.scenario === "collection-down" ? "warn" : "ok" },
    { id: "collection-boundary", cells: ["展示边界", state.scenario === "collection-down" ? "只读缓存" : "实时可参考", recent, state.scenario === "collection-down" ? "REST / SSH / 快照分开判" : "业务快照边界清晰"], tone: state.scenario === "collection-down" ? "warn" : "trust" },
    { id: "collection-failure", cells: ["失败端点", state.scenario === "collection-down" ? "未记录" : state.facts.failures.count ? failureText(snapshot, state) : "未记录", statusUpdated(snapshot), state.scenario === "collection-down" ? "未记录" : state.facts.failures.count ? "见端点列表" : "未记录"], tone: state.facts.failures.count ? "warn" : "trust" },
    { id: "collection-trust", cells: ["可信度", state.scenario === "collection-down" ? "可参考" : moduleTrust(state), recent, state.scenario === "collection-down" ? "非实时" : "按快照可信度显示"], tone: state.scenario === "collection-down" ? "warn" : "trust" },
    { id: "collection-next", cells: ["下次尝试", pollText(snapshot), recent, "轮询中"], tone: "trust" },
  ];
}

export function collectionChannelRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): ChartDatum[] {
  const rest = restState(snapshot, state);
  const ssh = sshState(snapshot, state);
  const snapshotOk = state.scenario === "collection-down" ? 42 : state.scenario === "no-snapshot" ? 0 : 92;
  const channelScore = (item: { value: string; tone: OverviewTone }) => item.tone === "ok" ? 92 : item.tone === "danger" ? 12 : 46;
  return [
    {
      id: "channel-rest",
      label: "REST",
      current: rest.value,
      currentValue: channelScore(rest),
      peak: "可用",
      peakValue: 100,
      mean: rest.tone === "ok" ? "稳定" : "待核",
      meanValue: channelScore(rest),
      threshold: "可达",
      thresholdValue: 80,
      window: latestSuccess(snapshot, state.scenario),
      trust: state.scenario === "collection-down" ? "缓存快照" : moduleTrust(state),
      tone: rest.tone,
      unit: "status",
    },
    {
      id: "channel-ssh",
      label: "SSH",
      current: ssh.value,
      currentValue: channelScore(ssh),
      peak: "可用",
      peakValue: 100,
      mean: ssh.tone === "ok" ? "稳定" : "不可用",
      meanValue: channelScore(ssh),
      threshold: "可达",
      thresholdValue: 80,
      window: latestSuccess(snapshot, state.scenario),
      trust: state.scenario === "collection-down" ? "缓存快照" : moduleTrust(state),
      tone: ssh.tone,
      unit: "status",
    },
    {
      id: "channel-snapshot",
      label: "快照",
      current: state.scenario === "no-snapshot" ? "无" : state.scenario === "collection-down" ? "缓存" : "实时",
      currentValue: snapshotOk,
      peak: "实时",
      peakValue: 100,
      mean: state.scenario === "collection-down" ? "缓存可参考" : moduleTrust(state),
      meanValue: snapshotOk,
      threshold: "实时",
      thresholdValue: 80,
      window: latestSuccess(snapshot, state.scenario),
      trust: moduleTrust(state),
      tone: state.scenario === "no-snapshot" ? "danger" : state.scenario === "collection-down" ? "warn" : "trust",
      unit: "status",
    },
  ];
}

export function threeColumnRows(rows: LedgerRow[], prefix = ""): LedgerRow[] {
  return rows.map((row, index) => {
    const [first, second, ...rest] = row.cells;
    return {
      ...row,
      id: `${prefix}${row.id || index}`,
      cells: [first, second, rest.filter((cell) => cell !== "").map((cell, cellIndex) => <span key={`${row.id}-three-${cellIndex}`}>{cell}</span>)],
    };
  });
}

export function noSnapshotChainRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  const next = pollText(snapshot);
  const age = state.facts.freshness.text;
  return [
    { id: "chain-entry", cells: ["页面可信等级", "链路可参考", recent, "只读不写配置", next], tone: "trust" },
    { id: "chain-router", cells: ["RouterOS", "断链", recent, "管理面断链", next], tone: "danger" },
    { id: "chain-rest", cells: ["REST", restState(snapshot, state).value, recent, "采集通道需核", next], tone: restState(snapshot, state).tone },
    { id: "chain-ssh", cells: ["SSH", sshState(snapshot, state).value, recent, "静态通道断链", next], tone: sshState(snapshot, state).tone },
    { id: "chain-business", cells: ["业务数据展示边界", "无业务快照", recent, "无业务快照，业务数据不展示；速率不展示", next], title: "业务快照缺失：WAN、资源、终端、连接与速率不展示", tone: "missing" },
    { id: "chain-default-route", cells: ["默认路由", "待判定", recent, "路由快照未取回，不推断承载", next], tone: "warn" },
    { id: "chain-success", cells: ["最近成功", recent, recent, "仅作为采集链路时间点", next], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "chain-failure", cells: ["失败端点", state.facts.failures.count ? failureText(snapshot, state) : "未记录", recent, "失败端点未记录不写 0", next], tone: state.facts.failures.count ? "warn" : "trust" },
    { id: "chain-trust", cells: ["数据可信度", "链路可参考", recent, `业务状态不可参考 / 事件更新时间 ${age}`, next], tone: "warn" },
  ];
}

export function noSnapshotBusinessBoundaryRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "boundary-business", cells: ["业务展示边界", "无业务快照", "WAN / 资源 / 终端 / 连接禁显", "只读 不写配置"], tone: "missing" },
    { id: "boundary-rate", cells: ["速率展示", "禁显", "无有效业务采样", "速率禁显"], tone: "missing" },
    { id: "boundary-route", cells: ["默认路由影响", "待判", ROUTE_UNKNOWN, "不推断承载状态"], tone: "warn" },
    { id: "boundary-success", cells: ["最近成功", recent, `状态更新 ${statusUpdated(snapshot)}`, "只代表采集链路"], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "boundary-collection", cells: ["采集链路", "链路可参考", "REST 待确认 / SSH 断链", "业务状态不参考"], tone: "warn" },
    { id: "boundary-failure", cells: ["端点失败", failureText(snapshot, state), "未记录保持未记录", "不写零值"], tone: state.facts.failures.count ? "warn" : "trust" },
    { id: "boundary-next", cells: ["下一次轮询", pollText(snapshot), "继续只读采集", "不写配置"], tone: "trust" },
    { id: "boundary-page", cells: ["页面可信等级", "链路可参考", moduleTrust(state), "只读状态台"], tone: "warn" },
  ];
}

export function noSnapshotVisibilityRows(): LedgerRow[] {
  return [
    { id: "vis-routeros", cells: ["RouterOS", "断链", "主证据已进入采集链路图", "采集链路"], tone: "danger" },
    { id: "vis-rest", cells: ["REST", "待核", "失败端点未记录时保持未记录", "采集通道"], tone: "warn" },
    { id: "vis-ssh", cells: ["SSH", "断链", "失败端点未记录时保持未记录", "采集通道"], tone: "warn" },
    { id: "vis-route", cells: ["默认路由", "待判", "默认路由待判 / 路由快照未取回", "可见性边界"], tone: "warn" },
    { id: "vis-snapshot-time", cells: ["业务快照时间", "无", "业务状态不可信", "模块可见性"], tone: "missing" },
    { id: "vis-snapshot-age", cells: ["业务快照年龄", "待判", "业务状态待核", "模块可见性"], tone: "missing" },
    { id: "vis-wan", cells: ["WAN", "禁显", "业务模块", "无业务快照，业务数据不展示"], tone: "missing" },
    { id: "vis-resource", cells: ["资源", "禁显", "业务模块", "无业务快照，业务数据不展示"], tone: "missing" },
    { id: "vis-terminals", cells: ["终端", "禁显", "业务模块", "无业务快照，业务数据不展示"], tone: "missing" },
    { id: "vis-conn", cells: ["连接", "禁显", "业务模块", "无业务快照"], tone: "missing" },
    { id: "vis-rate", cells: ["速率", "禁显", "禁止零速率", "速率不展示"], tone: "missing" },
    { id: "vis-page-trust", cells: ["页面可信等级", "链路可参考", "业务状态不可参考", "状态边界"], tone: "warn" },
    { id: "vis-readonly", cells: ["只读", "不写配置", "不推断业务数值", "采集链路可参考"], tone: "trust" },
  ];
}

export function noSnapshotChannelStatusRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "channel-routeros", cells: ["RouterOS", "断链", "当前不可达，业务快照无法刷新"], tone: "danger" },
    { id: "channel-rest", cells: ["REST", restState(snapshot, state).value, `${restState(snapshot, state).note}，仅作链路核验`], tone: restState(snapshot, state).tone },
    { id: "channel-ssh", cells: ["SSH", sshState(snapshot, state).value, `${sshState(snapshot, state).note}，静态通道不可用`], tone: sshState(snapshot, state).tone },
    { id: "channel-route", cells: ["默认出口", "待判", "默认出口待判 / 路由快照未取回"], tone: "warn" },
    { id: "channel-failure", cells: ["失败端点", "未记录", "失败端点未记录 / 不写零值"], tone: "trust" },
    { id: "channel-data-layer", cells: ["数据层状态", "快照缺失", "业务状态不可信"], tone: "missing" },
    { id: "channel-recent", cells: ["最近成功", recent, `下次尝试 ${pollText(snapshot)}`], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "channel-business", cells: ["业务数据", "禁显", "无业务快照，业务数据不展示"], tone: "missing" },
    { id: "channel-permission", cells: ["权限", "只读", "不写配置 / 不推断业务数值"], tone: "trust" },
  ];
}

export function noSnapshotReadonlyDegradedRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  const rest = restState(snapshot, state);
  const ssh = sshState(snapshot, state);
  const router = routerosState(snapshot, state.scenario);
  return [
    { id: "readonly-policy", cells: ["只读范围", "只读", "不写配置 / 不推断业务数值"], tone: "trust" },
    { id: "readonly-chain", cells: ["保留模块", "采集链路", "页面可信等级链路可参考 / 最近成功可展示"], tone: "trust" },
    { id: "readonly-business", cells: ["业务数据展示边界", "无业务快照", "无业务快照，业务数据不展示"], tone: "missing" },
    { id: "readonly-rate", cells: ["速率", "不展示", "无业务快照时速率不展示"], tone: "missing" },
    { id: "readonly-router", cells: ["路由器管理面", router.value, router.note], tone: router.tone },
    { id: "readonly-rest", cells: ["REST", rest.value, rest.note], tone: rest.tone },
    { id: "readonly-ssh", cells: ["SSH", ssh.value, ssh.note], tone: ssh.tone },
    { id: "readonly-route", cells: ["默认出口", "待判", "路由快照未取回，不推断承载"], tone: "warn" },
    { id: "readonly-success", cells: ["最近成功", recent, "只作为采集链路时间点"], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "readonly-next", cells: ["下一次轮询", pollText(snapshot), "等待采集恢复"], tone: "trust" },
  ];
}

export function noSnapshotAuxiliaryScopeRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "aux-business-scope", cells: ["业务域", "禁显", "无业务快照 / 等待恢复", "可见性边界"], tone: "missing" },
    { id: "aux-rate-scope", cells: ["速率", "禁显", "禁止零值占位", "采集恢复后显示"], tone: "missing" },
    { id: "aux-route-scope", cells: ["默认出口", "待判", "路由快照未取回", "不推断承载"], tone: "warn" },
    { id: "aux-success-scope", cells: ["最近成功", recent, "采集链路时间点", pollText(snapshot)], tone: recent === "未记录" ? "warn" : "trust" },
  ];
}

export function lastSuccessRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  const label = state.scenario === "collection-down" ? "最后成功" : "最近成功";
  return [
    { id: "success-time", cells: [label, recent, state.scenario === "no-snapshot" ? "时间轴起点" : "当前采样"], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "success-source", cells: ["来源", state.scenario === "no-snapshot" ? "采集元数据" : "业务快照", state.scenario === "no-snapshot" ? "REST 待确认 / SSH 断链" : state.facts.collection.channelText], tone: "trust" },
    { id: "success-scope", cells: ["可展示范围", state.scenario === "no-snapshot" ? "采集链路" : "业务状态", moduleTrust(state)], tone: state.scenario === "no-snapshot" ? "warn" : "ok" },
    { id: "success-disabled", cells: ["已折叠模块", state.scenario === "no-snapshot" ? "WAN / 资源 / 终端 / 连接" : "无", "按边界显示"], tone: state.scenario === "no-snapshot" ? "missing" : "trust" },
    { id: "success-current", cells: [state.scenario === "no-snapshot" ? "采集状态更新时间" : "当前状态", state.scenario === "no-snapshot" ? statusUpdated(snapshot) : "可用", state.scenario === "no-snapshot" ? "业务禁显" : "业务快照可参考"], tone: state.scenario === "no-snapshot" ? "danger" : "trust" },
    { id: "success-next", cells: ["下一次轮询", pollText(snapshot), "时间轴终点"], tone: "trust" },
    ...(state.scenario === "no-snapshot" ? [
      { id: "success-route-boundary", cells: ["默认出口", "待判", "默认出口待判 / 路由快照未取回"], tone: "warn" as OverviewTone },
      { id: "success-page-trust", cells: ["页面可信等级", "链路可参考", "业务状态不参考"], tone: "warn" as OverviewTone },
      { id: "success-readonly", cells: ["只读策略", "不写配置", "不推断业务数值"], tone: "trust" as OverviewTone },
    ] : []),
  ];
}

export function wanContinuityRows(state: OverviewDerivedState): LedgerRow[] {
  return [
    { id: "cont-total", cells: ["离线对象", `${formatNumber(state.facts.wan.offline)} 条`, "全部 WAN 离线"], tone: "danger" },
    { id: "cont-online", cells: ["WAN", `${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}`, `WAN ${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}`], tone: "danger" },
    { id: "cont-route", cells: ["默认路由", "异常", "未发现活动默认路由"], tone: "danger" },
    { id: "cont-carry", cells: ["承载", "未承载", "离线线路未承载业务"], tone: "warn" },
    { id: "cont-rate", cells: ["速率", "无有效样本", "离线线路不伪装零速率"], tone: "warn" },
    { id: "cont-rest", cells: ["REST", state.facts.collection.restLabel, "采集通道可核对"], tone: state.facts.collection.level },
    { id: "cont-ssh", cells: ["SSH", state.facts.collection.sshLabel, "静态读取可核对"], tone: state.facts.collection.level },
    { id: "cont-age", cells: ["业务快照", state.facts.freshness.text, moduleTrust(state)], tone: state.facts.freshness.level },
    { id: "cont-next", cells: ["下钻", "WAN明细", "先看线路与默认路由"], tone: "trust" },
    { id: "cont-resource", cells: ["资源", state.facts.resource.summaryText, "事故二级证据"], tone: state.facts.resource.level },
    { id: "cont-terminal", cells: ["连接", `${formatCompact(state.facts.connections.total)} 连接`, "二屏补充"], tone: "trust" },
    { id: "cont-boundary", cells: ["只读", "不写配置", "状态台仅展示"], tone: "trust" },
  ];
}

export function allOfflineImpactRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "ao-impact-object", cells: ["事故对象", `${formatNumber(state.facts.wan.offline)} 条 WAN`, "全部出口离线"], tone: "danger" },
    { id: "ao-impact-route", cells: ["默认出口", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
    { id: "ao-impact-carrier", cells: ["承载关系", "未承载", "离线线路不承载业务"], tone: "warn" },
    { id: "ao-impact-rate", cells: ["速率展示", "不展示", "无有效样本，不显示零速率"], tone: "warn" },
    { id: "ao-impact-collection", cells: ["采集可信", state.facts.collection.credibilityLabel, state.facts.collection.channelText], tone: state.facts.collection.level },
    { id: "ao-impact-success", cells: ["最近成功", recent, moduleTrust(state)], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "ao-impact-resource", cells: ["资源", state.facts.resource.summaryText, "二级证据"], tone: state.facts.resource.level },
    { id: "ao-impact-readonly", cells: ["展示边界", "不写配置", "只展示状态与证据"], tone: "trust" },
  ];
}

export function collectionBoundaryLedgerRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "cb-rest", cells: ["REST", restState(snapshot, state).value, restState(snapshot, state).note], tone: restState(snapshot, state).tone },
    { id: "cb-ssh", cells: ["SSH", sshState(snapshot, state).value, sshState(snapshot, state).note], tone: sshState(snapshot, state).tone },
    { id: "cb-snapshot", cells: ["业务快照", "缓存快照", "当前展示最后成功快照"], tone: "warn" },
    { id: "cb-success", cells: ["最后成功", recent, "业务状态按缓存参考"], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "cb-failure", cells: ["端点失败", failureText(snapshot, state), "未记录不写 0"], tone: state.facts.failures.count ? "warn" : "trust" },
    { id: "cb-route", cells: ["默认出口", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
    { id: "cb-wan", cells: ["WAN", state.facts.wan.text, "缓存快照下可参考"], tone: state.facts.wan.allOffline ? "danger" : "trust" },
    { id: "cb-resource", cells: ["资源", state.facts.resource.summaryText, "缓存快照下可参考"], tone: state.facts.resource.level },
    { id: "cb-next", cells: ["下次尝试", pollText(snapshot), "轮询中"], tone: "trust" },
    { id: "cb-readonly", cells: ["展示边界", "不写配置", "不推断业务数值"], tone: "trust" },
  ];
}

export function collectionReadonlyRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "cr-display", cells: ["展示范围", "最后成功快照", `最近成功 ${recent}`], tone: "warn" },
    { id: "cr-route", cells: ["默认出口快照", routeLabelText(state), routeBusinessText(state)], tone: state.facts.route.level },
    { id: "cr-wan", cells: ["WAN明细", state.facts.wan.text, "缓存快照可参考"], tone: state.facts.wan.allOffline ? "danger" : "trust" },
    { id: "cr-resource", cells: ["资源阈值", state.facts.resource.summaryText, "缓存快照可参考"], tone: state.facts.resource.level },
    { id: "cr-terminal", cells: ["终端排行", `${formatCompact(state.facts.connections.total)} 连接`, "缓存快照可参考"], tone: "trust" },
    { id: "cr-rate", cells: ["速率趋势", "缓存窗口", "不伪装实时"], tone: "warn" },
    { id: "cr-failure", cells: ["端点失败", failureText(snapshot, state), "未记录不写 0"], tone: state.facts.failures.count ? "warn" : "trust" },
    { id: "cr-next", cells: ["下次尝试", pollText(snapshot), "轮询中"], tone: "trust" },
    { id: "cr-readonly", cells: ["只读策略", "不写配置", "不推断业务数值"], tone: "trust" },
    { id: "cr-trust", cells: ["可信度", moduleTrust(state), "REST / SSH / 快照分开判"], tone: "warn" },
  ];
}

export function compactRows(rows: LedgerRow[], count: number): LedgerRow[] {
  return rows.slice(0, count);
}

export function desktopRecordRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null) : [];
}

export function desktopNumber(value: unknown): number {
  const number = toNumber(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

export function desktopFirstText(row: Record<string, unknown>, keys: string[], fallback = "-"): string {
  for (const key of keys) {
    const value = text(row[key], "");
    if (value) return value;
  }
  return fallback;
}

export function desktopRate(value: number): string {
  return value > 0 ? formatRate(value).replace(/\s+/g, "") : "未采集";
}

export function desktopTerminalRows(snapshot: OverviewRawSnapshot): LedgerRow[] {
  const raw = snapshot as unknown as Record<string, unknown>;
  const connections = typeof raw.connections === "object" && raw.connections !== null ? raw.connections as Record<string, unknown> : {};
  const sources = [raw.terminals, raw.clients, raw.devices, connections.topTerminals, connections.topClients, connections.topIps];
  const rows = sources.map(desktopRecordRows).find((items) => items.length) || [];
  if (!rows.length) return [{ id: "terminal-empty", cells: ["终端 01", "IP 未记录", "等待流量样本"], tone: "missing" }];
  return rows
    .map((row, index) => {
      const ip = desktopFirstText(row, ["ip", "address", "host", "clientIp", "srcAddress"], "IP 未记录");
      const rawName = desktopFirstText(row, ["name", "deviceName", "hostname", "hostName", "label", "mac"], "");
      const down = desktopNumber(row.downRate ?? row.downloadRate ?? row.rxRate ?? row.download ?? row.down ?? row.bytesDown ?? row.rxBytes);
      const up = desktopNumber(row.upRate ?? row.uploadRate ?? row.txRate ?? row.upload ?? row.up ?? row.bytesUp ?? row.txBytes);
      const total = desktopNumber(row.totalRate ?? row.rate ?? row.traffic ?? row.bytes ?? row.total ?? row.value) || down + up;
      const rawStatus = desktopFirstText(row, ["status", "state", "health", "online"], "online").toLowerCase();
      const abnormal = /offline|down|error|blocked|abnormal|false|异常|离线|阻断/.test(rawStatus);
      return {
        id: `terminal-${index}`,
        cells: [rawName && rawName !== ip ? rawName : `终端 ${String(index + 1).padStart(2, "0")}`, ip, `${desktopRate(down)} ↓ / ${desktopRate(up)} ↑`, abnormal ? "异常" : "在线"],
        tone: abnormal ? "danger" : "trust",
        title: String(total),
      } satisfies LedgerRow;
    })
    .sort((a, b) => (b.tone === "danger" ? 1 : 0) - (a.tone === "danger" ? 1 : 0) || Number(b.title || 0) - Number(a.title || 0))
    .slice(0, 5);
}

export function desktopEvidenceBoundaryRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  if (state.scenario === "no-snapshot") return compactRows(noSnapshotReadonlyDegradedRows(snapshot, state), 4);
  if (state.scenario === "collection-down") return compactRows(threeColumnRows(collectionReadonlyRows(snapshot, state), "desktop-boundary-"), 4);
  if (state.scenario === "resource-full") return compactRows([...routeRawEvidenceRows(snapshot, state), ...threeColumnRows(resourceBoundaryRows(snapshot, state), "desktop-res-boundary-")], 5);
  if (state.scenario === "interfaces-down") return compactRows([...routeRawEvidenceRows(snapshot, state), ...threeColumnRows(interfaceBoundaryRows(snapshot, state), "desktop-if-boundary-")], 5);
  if (state.scenario === "all-offline") return compactRows([...routeRawEvidenceRows(snapshot, state), ...threeColumnRows(allOfflineImpactRows(snapshot, state), "desktop-boundary-")], 5);
  return compactRows([...routeRawEvidenceRows(snapshot, state), ...normalOpsRows(snapshot, state)], 6);
}

