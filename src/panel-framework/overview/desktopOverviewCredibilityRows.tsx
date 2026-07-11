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
  return [
    { id: "chain-router", cells: ["RouterOS", "不可达", "管理连接未建立"], tone: "danger" },
    { id: "chain-rest", cells: ["REST", restState(snapshot, state).value, restState(snapshot, state).note], tone: restState(snapshot, state).tone },
    { id: "chain-ssh", cells: ["SSH", sshState(snapshot, state).value, sshState(snapshot, state).note], tone: sshState(snapshot, state).tone },
    { id: "chain-next", cells: ["下一次轮询", next, `最近成功 ${recent}`], tone: recent === "未记录" ? "warn" : "trust" },
  ];
}

export function noSnapshotBusinessBoundaryRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  const recent = latestSuccess(snapshot, state.scenario);
  return [
    { id: "boundary-business", cells: ["业务快照", "未取得", "WAN / 资源 / 终端 / 连接 / 速率不展示", "避免把缺失解释为 0"], tone: "missing" },
    { id: "boundary-route", cells: ["默认路由", "待判定", ROUTE_UNKNOWN, "路由快照取回后判断"], tone: "warn" },
    { id: "boundary-success", cells: ["最近成功", recent, `状态更新 ${statusUpdated(snapshot)}`, "仅证明采集曾成功"], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "boundary-mode", cells: ["操作模式", "只读", "不会修改 RouterOS 配置", `等待 ${pollText(snapshot)}`], tone: "trust" },
  ];
}

export function noSnapshotVisibilityRows(): LedgerRow[] {
  return [
    { id: "vis-routeros", cells: ["RouterOS", "断链", "主证据已进入采集链路图", "采集链路"], tone: "danger" },
    { id: "vis-rest", cells: ["REST", "待核", "失败端点未记录时保持未记录", "采集通道"], tone: "warn" },
    { id: "vis-ssh", cells: ["SSH", "断链", "失败端点未记录时保持未记录", "采集通道"], tone: "warn" },
    { id: "vis-route", cells: ["默认路由", "待判", "默认路由待判 / 路由快照未取回", "可见性边界"], tone: "warn" },
    { id: "vis-snapshot-time", cells: ["业务快照时间", "无", "业务状态不可信", "模块可见性"], tone: "missing" },
    { id: "vis-snapshot-age", cells: ["业务快照年龄", "不可判定", "业务状态不可参考", "模块可见性"], tone: "missing" },
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
  if (state.scenario === "no-snapshot") {
    return [
      { id: "success-time", cells: ["最近成功", recent, "采集时间点"], tone: recent === "未记录" ? "warn" : "trust" },
      { id: "success-current", cells: ["当前状态", "快照缺失", `状态更新 ${statusUpdated(snapshot)}`], tone: "missing" },
      { id: "success-next", cells: ["下一次轮询", pollText(snapshot), "继续只读采集"], tone: "trust" },
      { id: "success-target", cells: ["恢复判据", "取得新快照", "届时重新判断 WAN 与业务状态"], tone: "warn" },
    ];
  }
  return [
    { id: "success-time", cells: [label, recent, "当前采样"], tone: recent === "未记录" ? "warn" : "trust" },
    { id: "success-source", cells: ["来源", "业务快照", state.facts.collection.channelText], tone: "trust" },
    { id: "success-scope", cells: ["可展示范围", "业务状态", moduleTrust(state)], tone: "ok" },
    { id: "success-disabled", cells: ["已折叠模块", "无", "按边界显示"], tone: "trust" },
    { id: "success-current", cells: ["当前状态", "可用", "业务快照可参考"], tone: "trust" },
    { id: "success-next", cells: ["下一次轮询", pollText(snapshot), "时间轴终点"], tone: "trust" },
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
