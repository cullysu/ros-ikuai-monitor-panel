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
      "data-routeros-business-route-copy": "gateway-priority-status-no-routeros-raw-fields",
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
      "data-routeros-business-route-copy": "gateway-priority-status-no-routeros-raw-fields",
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
      "data-routeros-raw-secondary-rail": "bottom-collapsed-low-noise",
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
