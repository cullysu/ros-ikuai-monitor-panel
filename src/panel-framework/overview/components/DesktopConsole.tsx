import type { ReactNode } from "react";
import {
  compactListText,
  formatCompact,
  formatNumber,
  formatPercent,
  formatRate,
  shortTimestamp,
  stripChannelPrefix,
  toNumber,
  type OverviewDerivedState,
  type OverviewRawInterfaceRow,
  type OverviewRawSnapshot,
  type OverviewRawWanRow,
  type OverviewScenarioKey,
  type OverviewTone,
} from "../index";
import {
  ROUTEROS_ROUTE_EVIDENCE_CONTRACT,
} from "../routerosEvidenceModel";
import { buildRouterOsPresentationViewModel } from "../routerosNetworkViewModel";
import { OVERVIEW_LOW_NOISE_CONSOLE_TOKEN_CONTRACT } from "../mobileOverviewTokens";
import {
  type ChartDatum,
  type DesktopEvidenceItem,
  type DesktopMetricItem,
  type LedgerRow,
  type ModuleProps,
  type OverviewPanelProps,
  type TopbarItem,
  type TopbarRole,
  DESKTOP_IKUAI_SHORT_NAV_CONTRACT,
  OVERVIEW_CHART_METADATA_COVERAGE,
  OVERVIEW_CHART_STATUS_COLORS,
  OVERVIEW_IKUAI40_CHART_STANDARD,
  OVERVIEW_IKUAI40_MATURE_VISUAL_STANDARD,
  OVERVIEW_SCENE_CHART_CONTRACT,
  OVERVIEW_SCENE_CHART_PRIORITY,
  desktopConclusionValue,
  desktopCoreText,
  latestSuccess,
  moduleChartType,
  moduleTrust,
  restState,
  sshState,
  topbarCollectionValue,
  topbarImpactValue,
  topbarItems,
  topbarNoteStyle,
  topbarObjectValue,
  topbarPriority,
  topbarValueStyle,
  verdictContractText,
} from "../desktopOverviewHelpers";
import {
  allOfflineImpactRows,
  collectionBoundaryLedgerRows,
  collectionChannelRows,
  collectionReadonlyRows,
  collectionRows,
  compactRows,
  connectionPressureChartRows,
  desktopEvidenceBoundaryRows,
  desktopTerminalRows,
  interfaceBoundaryRows,
  interfaceCollectionRows,
  interfaceForwardingChartRows,
  interfaceImpactRows,
  interfacePageTrustRows,
  interfaceRelationRows,
  interfaceRows,
  lastSuccessRows,
  noSnapshotAuxiliaryScopeRows,
  noSnapshotBusinessBoundaryRows,
  noSnapshotChannelStatusRows,
  noSnapshotChainRows,
  noSnapshotReadonlyDegradedRows,
  noSnapshotVisibilityRows,
  normalOpsRows,
  offlineWanStatusChartRows,
  resourceBoundaryRows,
  resourceChartRows,
  resourceContextRows,
  resourcePageTrustRows,
  resourceRiskRows,
  resourceRows,
  resourceSustainRows,
  resourceTop5Rows,
  routeBusinessRows,
  routeFactRows,
  routeRawEvidenceRows,
  threeColumnRows,
  trafficChartRows,
  trafficPeakRows,
  trafficRouteRows,
  trafficRows,
  trafficSamplingRows,
  trafficTop3Rows,
  trafficTotals,
  wanContinuityRows,
  wanRows,
} from "../desktopOverviewRows";
import {
  ChainTimeline,
  ChannelMatrixVisual,
  DesktopWanIntegratedVisual,
  JudgementChart,
  ResourcePressureLedgerVisual,
  ResourceTriCards,
  VisibilityMatrixVisual,
  VisualStack,
} from "../desktopOverviewVisuals";
import { Module } from "./DesktopModule";
import { EvidenceChain } from "./EvidenceChain";
import { TerminalRanking } from "./TerminalRanking";
import { WanTrend } from "./WanTrend";

function DesktopThinKpis({ snapshot, state }: OverviewPanelProps) {
  const object = topbarObjectValue(snapshot, state);
  const collection = topbarCollectionValue(state);
  const terminals = desktopTerminalRows(snapshot);
  const resource = state.scenario === "no-snapshot" ? "禁显" : formatPercent(state.facts.resource.cpu, 0);
  const isFleetDensity = state.scenario === "fleet";
  const items = [
    { label: "WAN", value: object.value, note: isFleetDensity ? "类型分布" : topbarImpactValue(snapshot, state), tone: state.verdict.level },
    { label: "资源", value: resource, note: state.scenario === "resource-full" ? "持续超阈" : "阈值", tone: state.scenario === "resource-full" ? "danger" : state.facts.resource.level },
    { label: "采集", value: collection.value, note: state.scenario === "collection-down" ? "缓存" : state.scenario === "no-snapshot" ? "断链" : "通道可读", tone: state.facts.collection.credibilityTone },
    { label: "终端", value: terminals.length ? formatNumber(terminals.length) : "无", note: "总流量排序", tone: terminals.length ? "trust" : "missing" },
  ] satisfies Array<{ label: string; value: string; note: string; tone: OverviewTone }>;
  return (
    <div className="ro-desktop-thin-kpis" data-overview-desktop-kpi-row="thin-business-summary">
      {items.map((item) => (
        <div className="ro-desktop-thin-kpi ik-overview-kpi-card" data-overview-kpi-card data-tone={item.tone} key={item.label}>
          <span>{item.label}</span>
          <b>{item.value}</b>
          <em>{item.note}</em>
        </div>
      ))}
    </div>
  );
}


type MobileTwinCard = {
  key: "wan" | "collection";
  title: string;
  value: string;
  sub: string;
  detail: string;
  tone: OverviewTone;
};

function compactDesktopPanelGroups(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { main: ReactNode[]; side: ReactNode[]; bottom: ReactNode[] } {
  const trust = moduleTrust(state);
  const isFleet = state.scenario === "fleet";

  if (state.scenario === "no-snapshot") {
    const businessBoundaryRows = compactRows(noSnapshotBusinessBoundaryRows(snapshot, state), 4);
    const chainRows = compactRows(noSnapshotChainRows(snapshot, state), 4);
    const successRows = compactRows(lastSuccessRows(snapshot, state), 5);
    const credibilityRows = compactRows(noSnapshotReadonlyDegradedRows(snapshot, state), 4);
    const visibilityRows = compactRows(noSnapshotVisibilityRows(), 6);
    return {
      main: [
        <Module
          key="ns-business-boundary"
          title="业务可信边界"
          subtitle="无业务快照 · 业务字段禁显 · 不用零速率占位"
          module="no-snapshot-module-visibility"
          tone="missing"
          trust={trust}
          headers={["模块", "当前", "影响", "边界"]}
          rows={businessBoundaryRows}
          minRows={0}
          visual={<VisibilityMatrixVisual rows={businessBoundaryRows} />}
        />,
        <Module
          key="ns-collection-chain"
          title="采集链路"
          subtitle="RouterOS / REST / SSH / 快照 · 仅作管理面证据"
          module="no-snapshot-summary"
          tone="warn"
          trust={trust}
          headers={["链路项", "当前", "最近成功", "主证据", "下次尝试"]}
          rows={chainRows}
          minRows={0}
          visual={<ChainTimeline rows={chainRows} module="no-snapshot-summary-chain" />}
        />,
      ],
      side: [
        <Module
          key="ns-recovery"
          title="最近成功 / 恢复线索"
          subtitle="时间轴起点 · 当前管理面 · 下次轮询"
          module="no-snapshot-recent-success"
          tone="trust"
          trust={trust}
          headers={["节点", "当前", "说明"]}
          rows={successRows}
          minRows={0}
          visual={<ChainTimeline rows={successRows} module="no-snapshot-recent-success-timeline" />}
        />,
        <Module
          key="ns-page-credibility"
          title="页面可信度"
          subtitle="业务解释优先 · 原始字段下沉"
          module="no-snapshot-readonly-boundary"
          tone="warn"
          trust={trust}
          headers={["对象", "当前", "原因", "边界"]}
          rows={credibilityRows}
          minRows={0}
        />,
      ],
      bottom: [
        <Module
          key="ns-visibility-floor"
          className="ro-no-snapshot-floor-module"
          title="不可展示模块矩阵"
          subtitle="WAN / 资源 / 终端 / 连接 / 速率 · 按可信边界禁显"
          module="no-snapshot-degraded-modules"
          tone="missing"
          trust={trust}
          headers={["模块", "状态", "原因", "边界"]}
          rows={visibilityRows}
          minRows={0}
          visual={<VisibilityMatrixVisual rows={visibilityRows} />}
        />,
        <Module
          key="ns-raw-evidence"
          className="ro-no-snapshot-floor-module"
          title="证据 / 原始字段"
          subtitle="默认收起 · 仅用于审计"
          module="evidence-boundary"
          tone="trust"
          trust={trust}
          headers={["对象", "当前", "依据"]}
          rows={compactRows(desktopEvidenceBoundaryRows(snapshot, state), 4)}
          minRows={0}
          collapsedEvidence
        />,
      ],
    };
  }

  if (state.scenario === "resource-full") {
    const riskChart = resourceChartRows(state);
    const pressureRows = compactRows(resourceContextRows(snapshot, state), 8);
    const top5Rows = resourceTop5Rows(snapshot).slice(0, 8);
    return {
      main: [
        <Module key="res-risk" title="最危险项" subtitle="CPU / 内存 / 磁盘 · 连接压力 / 活动会话 / DNS缓存 · 阈值 / 持续 6 点 / 均值 / 峰" module="resource-risk-priority" tone="danger" trust={trust} headers={["项", "当前", "阈值", "峰值"]} rows={resourceRiskRows(state)} minRows={0} visual={<VisualStack snapshot={snapshot} state={state}><ResourcePressureLedgerVisual rows={riskChart} /></VisualStack>} />,
      ],
      side: [
        <Module key="res-pressure" title="连接压力" subtitle="连接压力 / 活动会话 / DNS缓存 / 接口" module="resource-pressure-bars" tone="warn" trust={trust} headers={["项目", "当前", "依据"]} rows={pressureRows} minRows={0} visual={<JudgementChart module="resource-pressure-bars" kind="pressure" rows={connectionPressureChartRows(snapshot, state)} />} />,
        <Module key="res-interface" title="接口状态" subtitle="承载 / 边界" module="normal-interface-boundary" tone="trust" trust={trust} headers={["对象", "当前", "最近", "边界"]} rows={compactRows(interfaceBoundaryRows(snapshot, state), 4)} minRows={0} />,
        <Module key="res-collection" title="采集 / 快照" subtitle="REST / SSH / 成功" module="normal-collection-channel" tone={state.facts.collection.level} trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(threeColumnRows(collectionRows(snapshot, state), "res-col-"), 4)} minRows={0} visual={<ChannelMatrixVisual module="collection-status" rows={collectionChannelRows(snapshot, state)} />} />,
        <Module key="res-route" title="默认出口" subtitle="出口 / 承载 / 优先级" module="route-raw-facts" tone={state.facts.route.level} trust={trust} headers={["出口", "承载出口", "优先级", "状态"]} rows={compactRows(routeBusinessRows(snapshot, state), 4)} minRows={0} />,
      ],
      bottom: [
        <Module key="res-top5" title="接口吞吐 Top5" subtitle="接口吞吐 Top5 / 占比 / 资源影响" module="resource-interface-top5" tone="warn" trust={trust} headers={["接口", "速率", "占比"]} rows={compactRows(top5Rows, 5)} className="ik-overview-top5-list" minRows={0} />,
        <Module key="res-events" title="最近事件" subtitle="采集 / 默认出口" module="normal-ops-ledger" tone={state.facts.collection.level} trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(normalOpsRows(snapshot, state), 4)} minRows={0} />,
        <Module key="res-boundary" title="证据 / 原始字段" subtitle="默认收起 · 仅用于审计" module="evidence-boundary" tone="trust" trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows([...routeRawEvidenceRows(snapshot, state), ...threeColumnRows(resourceBoundaryRows(snapshot, state), "res-boundary-")], 4)} minRows={0} collapsedEvidence />,
      ],
    };
  }

  if (state.scenario === "collection-down") {
    const collectionVisual = <VisualStack snapshot={snapshot} state={state}><ChannelMatrixVisual module="collection-cache-ledger" rows={collectionChannelRows(snapshot, state)} /></VisualStack>;
    return {
      main: [
        <Module key="col-channel" title="采集证据" subtitle="通道状态降级 / 数据层状态 / REST 不可达 / SSH 不可用 / 缓存快照 / 失败端点 / 最近成功" module="collection-channel-ledger" tone="warn" trust="缓存快照" headers={["对象", "当前", "依据"]} rows={threeColumnRows(collectionRows(snapshot, state), "c3-")} minRows={0} visual={collectionVisual} />,
      ],
      side: [
        <Module key="col-recent" title="最近成功" subtitle="上次成功 / 边界" module="collection-recent-failures" tone="trust" headers={["节点", "当前", "说明"]} rows={lastSuccessRows(snapshot, state)} minRows={0} />,
        <Module key="col-boundary" title="展示边界" subtitle="不写配置 / 不推断" module="collection-cache-boundary" tone="warn" headers={["对象", "当前", "依据"]} rows={compactRows(threeColumnRows(collectionBoundaryLedgerRows(snapshot, state), "cbl-"), 6)} minRows={0} />,
        <Module key="col-route" title="默认出口" subtitle="出口 / 承载 / 优先级" module="collection-route-wan-boundary" tone={state.facts.route.level} headers={["出口", "网关", "优先级", "状态"]} rows={compactRows(routeBusinessRows(snapshot, state), 4)} minRows={0} />,
        <Module key="col-wan" title="WAN线路" subtitle="参考" module="wan-lines" tone={state.facts.wan.allOffline ? "danger" : "trust"} headers={["线路", "状态", "承载"]} rows={compactRows(wanRows(snapshot, state), 4)} minRows={0} />,
      ],
      bottom: [
        <Module key="col-events" title="采集事件" subtitle="最近成功 / 端点失败 / 默认出口" module="collection-bottom-events" tone="trust" headers={["对象", "当前", "依据"]} rows={compactRows(threeColumnRows(collectionReadonlyRows(snapshot, state), "cro-"), 4)} minRows={0} />,
      ],
    };
  }

  if (state.scenario === "interfaces-down") {
    return {
      main: [
        <Module key="if-forward" title="接口转发面" subtitle="Down 数 / 承载 / 默认出口" module="interface-forwarding" tone="danger" trust={trust} headers={["对象", "当前", "依据"]} rows={interfaceRows(snapshot, state)} minRows={0} visual={<VisualStack snapshot={snapshot} state={state} />} />,
        <Module key="if-route" title="默认出口影响" subtitle="出口 / 承载 / 优先级" module="route-raw-facts" tone={state.facts.route.level} trust={trust} headers={["出口", "承载出口", "优先级", "状态"]} rows={compactRows(routeBusinessRows(snapshot, state), 4)} minRows={0} />,
      ],
      side: [
        <Module key="if-collection" title="采集面通道" subtitle="REST / SSH / 快照" module="interface-collection-channel" tone={state.facts.collection.level} trust={trust} headers={["对象", "当前", "依据"]} rows={threeColumnRows(interfaceCollectionRows(snapshot, state), "ic3-")} minRows={0} visual={<ChannelMatrixVisual module="interface-collection-channel" rows={collectionChannelRows(snapshot, state)} />} />,
        <Module key="if-relation" title="承载关系" subtitle="父接口 / VLAN / PPPoE" module="interface-relation-carrier" tone="warn" trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(threeColumnRows(interfaceRelationRows(snapshot, state), "irc3-"), 5)} minRows={0} />,
        <Module key="if-boundary" title="判断边界" subtitle="Down / 默认出口 / 采集" module="interface-forwarding-boundary" tone="warn" trust={trust} headers={["对象", "当前", "最近", "边界"]} rows={compactRows(interfaceBoundaryRows(snapshot, state), 4)} minRows={0} />,
      ],
      bottom: [
        <Module key="if-events" title="接口事件" subtitle="最近成功 / 默认出口 / 采集面" module="interface-page-trust" tone="trust" trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(interfacePageTrustRows(snapshot, state), 4)} minRows={0} />,
        <Module key="if-terminals" title="终端排行" subtitle="异常置顶 / 总流量" module="terminal-ranking" tone="trust" trust={trust} headers={["设备", "IP", "流量", "状态"]} rows={desktopTerminalRows(snapshot)} minRows={0} />,
        <Module key="if-raw" title="证据 / 原始字段" subtitle="默认收起 · 仅用于审计" module="evidence-boundary" tone="trust" trust={trust} headers={["对象", "当前", "依据"]} rows={routeRawEvidenceRows(snapshot, state)} minRows={0} collapsedEvidence />,
      ],
    };
  }

  if (state.scenario === "all-offline") {
    const offlineRows = wanRows(snapshot, state);
    return {
      main: [
        <Module key="ao-wan" title="WAN线路" subtitle="0/8 / 出口不可用" module="wan-offline-bars" tone="danger" trust={trust} headers={["线路", "状态", "承载"]} rows={offlineRows} minRows={0} visual={<VisualStack snapshot={snapshot} state={state} />} />,
        <Module key="ao-route" title="默认出口判断" subtitle="出口 / 承载 / 优先级" module="wan-route-ledger" tone={state.facts.route.level} trust={trust} headers={["出口", "网关", "优先级", "状态"]} rows={routeBusinessRows(snapshot, state)} minRows={0} />,
      ],
      side: [
        <Module key="ao-continuity" title="WAN连续性" subtitle="0/8 / 默认路由异常" module="wan-offline-continuity" tone="danger" trust={trust} headers={["字段", "当前", "依据"]} rows={compactRows(wanContinuityRows(state), 8)} minRows={0} />,
        <Module key="ao-collection" title="采集通道" subtitle="REST / SSH / 快照" module="collection-status" tone={state.facts.collection.level} trust={trust} headers={["对象", "当前", "依据"]} rows={threeColumnRows(collectionRows(snapshot, state), "ao3-")} minRows={0} visual={<ChannelMatrixVisual module="collection-status" rows={collectionChannelRows(snapshot, state)} />} />,
        <Module key="ao-impact" title="业务影响" subtitle="默认路由 / 速率不展示" module="wan-offline-impact-boundary" tone="warn" trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(threeColumnRows(allOfflineImpactRows(snapshot, state), "aoi-"), 5)} minRows={0} />,
      ],
      bottom: [
        <Module key="ao-interface" title="接口 / WAN 边界" subtitle="接口承载 / 默认出口" module="wan-offline-bottom-interface" tone="warn" trust={trust} headers={["对象", "当前", "最近", "边界"]} rows={compactRows(interfaceBoundaryRows(snapshot, state), 4)} minRows={0} />,
        <Module key="ao-events" title="采集事件" subtitle="REST / SSH / 最近成功" module="wan-offline-bottom-events" tone={state.facts.collection.level} trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(normalOpsRows(snapshot, state), 4)} minRows={0} />,
        <Module key="ao-raw" title="证据 / 原始字段" subtitle="默认收起 · 仅用于审计" module="evidence-boundary" tone="trust" trust={trust} headers={["对象", "当前", "依据"]} rows={routeRawEvidenceRows(snapshot, state)} minRows={0} collapsedEvidence />,
      ],
    };
  }

  const networkRows = state.scenario === "no-snapshot"
    ? compactRows(noSnapshotChainRows(snapshot, state), 4)
    : state.scenario === "all-offline"
      ? compactRows(wanRows(snapshot, state), 8)
      : compactRows(trafficRows(snapshot, state), state.scenario === "fleet" ? 6 : 5);
  const trafficChartRowsData = trafficChartRows(snapshot, state);
  const networkVisual = state.scenario === "no-snapshot"
    ? <ChainTimeline rows={networkRows} module="no-snapshot-summary-chain" />
    : state.scenario === "all-offline"
      ? <VisualStack snapshot={snapshot} state={state} />
      : <DesktopWanIntegratedVisual snapshot={snapshot} state={state} rows={trafficChartRowsData} />;
  const compactWanVisualOnly = state.scenario !== "no-snapshot" && state.scenario !== "all-offline";
  const routeRowsCompact = state.scenario === "no-snapshot" ? compactRows(noSnapshotBusinessBoundaryRows(snapshot, state), 4) : compactRows(routeFactRows(snapshot, state), 4);
  const routeHeaders = state.scenario === "no-snapshot" ? ["模块", "当前", "影响", "边界"] : ["出口", "承载出口", "优先级", "状态"];
  const collectionRowsCompact = state.scenario === "no-snapshot" ? compactRows(noSnapshotChainRows(snapshot, state), 4) : compactRows(threeColumnRows(collectionRows(snapshot, state), "desktop-collection-"), 4);
  const interfaceRowsCompact = state.scenario === "interfaces-down" ? compactRows(threeColumnRows(interfaceRows(snapshot, state), "desktop-if-"), 5) : compactRows(interfaceBoundaryRows(snapshot, state), 4);
  const wanEvidenceRows = compactRows(threeColumnRows([
    ...trafficTop3Rows(snapshot, state),
    ...trafficRouteRows(snapshot, state),
    ...trafficSamplingRows(snapshot, state),
    ...trafficPeakRows(snapshot, state),
  ], "desktop-wan-evidence-"), isFleet ? 5 : 4);
  return {
    main: [
      <WanTrend key="compact-network" title={state.scenario === "no-snapshot" ? "采集链路" : isFleet ? "WAN 采样趋势 / 设备 TopN" : "WAN 采样趋势"} subtitle={state.scenario === "all-offline" ? "0/8 / 出口不可用" : isFleet ? "类型分布 / 异常 TopN" : "趋势 / 当前 / 峰值 / Top 出口 / 默认出口 / 采样可信度"} module={state.scenario === "all-offline" ? "wan-offline-bars" : state.scenario === "no-snapshot" ? "no-snapshot-summary" : "wan-trend"} tone={state.scenario === "all-offline" || state.scenario === "no-snapshot" ? "danger" : state.facts.wan.allOffline ? "danger" : "trust"} trust={trust} headers={compactWanVisualOnly ? [] : state.scenario === "no-snapshot" ? ["链路项", "当前", "最近成功", "主证据", "下次尝试"] : ["对象", "当前", "依据"]} rows={compactWanVisualOnly ? [] : networkRows} minRows={0} visual={networkVisual} visualOnly={compactWanVisualOnly} />,
      <Module key="compact-route" title={state.scenario === "no-snapshot" ? "业务边界" : "默认出口"} subtitle={state.scenario === "no-snapshot" ? "不展示" : isFleet ? "默认路由条目 / 承载" : "出口 / 承载 / 优先级"} module={state.scenario === "no-snapshot" ? "no-snapshot-module-visibility" : "route-raw-facts"} tone={state.scenario === "all-offline" ? "danger" : state.facts.route.level} trust={trust} headers={routeHeaders} rows={routeRowsCompact} minRows={0} visual={state.scenario === "no-snapshot" ? <VisibilityMatrixVisual rows={routeRowsCompact} /> : undefined} />,
      isFleet ? <Module key="compact-wan-evidence" title="WAN 异常 TopN" subtitle="离线对象 / 类型分布" module="normal-wan-evidence" tone={state.facts.wan.offline ? "warn" : "trust"} trust={trust} headers={["对象", "当前", "依据"]} rows={wanEvidenceRows} minRows={0} /> : null,
    ],
    side: [
      <Module key="compact-interface" title="接口状态" subtitle={state.scenario === "interfaces-down" ? "Down / 默认出口" : "转发面 / 承载"} module={state.scenario === "interfaces-down" ? "interface-forwarding" : "normal-interface-boundary"} tone={state.scenario === "interfaces-down" ? "danger" : "trust"} trust={trust} headers={state.scenario === "interfaces-down" ? ["对象", "当前", "依据"] : ["对象", "当前", "最近", "边界"]} rows={interfaceRowsCompact} minRows={0} visual={state.scenario === "interfaces-down" ? <JudgementChart module="interface-forwarding" kind="pressure" rows={interfaceForwardingChartRows(snapshot, state)} /> : undefined} />,
      <Module key="compact-resource" title={state.scenario === "resource-full" ? "资源满载" : "资源"} subtitle={state.scenario === "resource-full" ? "CPU / MEM / DISK · 阈值 / 持续 / 峰值" : isFleet ? "接口排行 / 阈值" : "当前 / 阈值"} module={state.scenario === "resource-full" ? "resource-risk-priority" : "resource-threshold"} tone={state.scenario === "no-snapshot" ? "missing" : state.facts.resource.level} trust={trust} headers={["项", "阈值", "持续", "峰值"]} rows={compactRows(resourceRows(state), 3)} minRows={0} visual={state.scenario === "resource-full" ? <ResourceTriCards rows={resourceChartRows(state)} /> : undefined} />,
      state.scenario === "resource-full" ? <Module key="compact-pressure" title="连接压力" subtitle="连接压力 / 活动会话 / DNS缓存" module="resource-pressure-bars" tone="warn" trust={trust} headers={["项目", "当前", "依据"]} rows={compactRows(resourceContextRows(snapshot, state), 8)} minRows={0} visual={<JudgementChart module="resource-pressure-bars" kind="pressure" rows={connectionPressureChartRows(snapshot, state)} />} /> : null,
      state.scenario === "resource-full" ? <Module key="compact-top5" title="接口吞吐 Top5" subtitle="接口吞吐 Top5 / 占比" module="resource-interface-top5" tone="warn" trust={trust} headers={["接口", "速率", "占比"]} rows={compactRows(resourceTop5Rows(snapshot), 5)} className="ik-overview-top5-list" minRows={0} /> : null,
      <Module key="compact-collection" title={isFleet ? "采集可信度" : "采集 / 快照"} subtitle={state.scenario === "collection-down" ? "REST / SSH / 快照" : "REST / SSH / 成功"} module={state.scenario === "collection-down" ? "collection-channel-ledger" : state.scenario === "no-snapshot" ? "no-snapshot-channel-status" : "normal-collection-channel"} tone={state.scenario === "collection-down" || state.scenario === "no-snapshot" ? "warn" : state.facts.collection.level} trust={trust} headers={state.scenario === "no-snapshot" ? ["链路层", "当前", "最近成功", "主证据", "下次尝试"] : ["对象", "当前", "依据"]} rows={collectionRowsCompact} minRows={0} visual={<ChannelMatrixVisual module="collection-status" rows={collectionChannelRows(snapshot, state)} />} />,
    ],
    bottom: [
      <TerminalRanking key="compact-terminals" title="终端排行" subtitle="异常置顶 / 总流量" module="terminal-ranking" tone="trust" trust={trust} headers={["设备", "IP", "流量", "状态"]} rows={compactRows(desktopTerminalRows(snapshot), 4)} minRows={0} />,
      <Module key="compact-events" title="最近事件" subtitle="采集 / 默认出口" module="normal-ops-ledger" tone={state.facts.collection.level} trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(normalOpsRows(snapshot, state), 4)} minRows={0} />,
      <EvidenceChain key="compact-boundary" title="证据 / 原始字段" subtitle="默认收起 · 业务解释优先" module={state.scenario === "no-snapshot" ? "no-snapshot-degraded-modules" : "evidence-boundary"} tone={state.scenario === "no-snapshot" ? "missing" : "trust"} trust={trust} headers={state.scenario === "resource-full" || state.scenario === "interfaces-down" ? ["对象", "当前", "依据", "边界"] : ["对象", "当前", "依据"]} rows={compactRows(desktopEvidenceBoundaryRows(snapshot, state), 4)} minRows={0} collapsedEvidence />,
    ],
  };
}

function desktopPanelGroups(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): { main: ReactNode[]; side: ReactNode[]; bottom: ReactNode[] } {
  return compactDesktopPanelGroups(snapshot, state);
}

function DesktopShortNav({ state }: { state: OverviewDerivedState }) {
  const items = [
    { id: "overview", label: "状态总览", value: state.verdict.level === "ok" ? "正常" : state.verdict.level === "danger" ? "异常" : "关注", tone: state.verdict.level },
    { id: "wan", label: "多出口", value: state.scenario === "no-snapshot" ? "待判" : `${formatNumber(state.facts.wan.online)}/${formatNumber(state.facts.wan.total)}`, tone: state.facts.wan.allOffline ? "danger" : state.facts.wan.offline ? "warn" : "ok" },
    { id: "interface", label: "接口/VLAN", value: state.facts.interfaces.down > 0 ? `${formatNumber(state.facts.interfaces.down)} Down` : "承载可用", tone: state.facts.interfaces.down > 0 ? "warn" : "trust" },
    { id: "terminal", label: "在线终端", value: state.scenario === "no-snapshot" ? "隐藏" : formatNumber(state.facts.connections.active), tone: state.scenario === "no-snapshot" ? "missing" : "trust" },
    { id: "log", label: "采集日志", value: state.facts.collection.credibilityLabel, tone: state.facts.collection.credibilityTone },
  ] satisfies { id: string; label: string; value: string; tone: OverviewTone }[];
  return (
    <nav
      className="ro-desktop-nav"
      aria-label="桌面导航"
      data-overview-desktop-nav="ikuai-short-left-rail"
      data-overview-desktop-nav-contract={DESKTOP_IKUAI_SHORT_NAV_CONTRACT}
      data-overview-desktop-nav-labels="状态总览/多出口/接口/VLAN/在线终端/采集日志"
      data-overview-desktop-nav-no-explainer-copy="true"
      data-overview-desktop-v1069-nav-active="neutral-console-ink-no-blue-glow"
    >
      {items.map((item, index) => (
        <span
          className={index === 0 ? "is-active" : undefined}
          data-overview-desktop-nav-item={item.id}
          data-tone={item.tone}
          key={item.id}
        >
          <b>{item.label}</b>
          <em>{item.value}</em>
        </span>
      ))}
    </nav>
  );
}

export function DesktopWorkspace({ snapshot, state }: OverviewPanelProps) {
  const sections = desktopPanelGroups(snapshot, state);

  return (
    <div
      className="ro-desktop-grid ik-home-layout"
      data-overview-desktop-layout="fixed-summary-keymetrics-left-right-bottom"
      data-overview-desktop-hierarchy="conclusion-key-metrics-evidence"
      data-overview-desktop-hierarchy-tier="3-evidence"
      data-overview-desktop-skeleton="top-six-summary-left-network-wan-right-resource-collection-bottom-interface-events"
      data-overview-desktop-surface="ikuai40-admin-console-not-consumer-app-cards"
      data-overview-desktop-left-rail="network-wan"
      data-overview-desktop-right-rail="resource-collection"
      data-overview-desktop-bottom-rail="interface-events"
      data-overview-desktop-detail
      data-overview-desktop-workspace
      data-overview-desktop-core-text={desktopCoreText(snapshot, state)}
      data-overview-low-noise-console-token-contract={OVERVIEW_LOW_NOISE_CONSOLE_TOKEN_CONTRACT}
      data-overview-desktop-v1020-public-product-polish="flat-status-bus-low-line-noise-integrated-wan-reading"
      data-overview-desktop-v1030-nav-polish="short-ikuai-left-rail-low-noise-status-bus"
      data-overview-desktop-copy-policy="business-first-routeros-fields-translated-in-evidence"
      data-overview-desktop-toy-nav-leak-guard="desktop-content-icon-tabs-removed"
      data-overview-desktop-content-icon-tabs="desktop-hides-content-icon-tabs"
      data-overview-verdict-panel={verdictContractText(snapshot, state)}
      data-overview-trend-compact="framework-ledger"
      data-overview-no-snapshot-grid={state.scenario === "no-snapshot" ? "main-chain-boundary-success-route-side-readonly-degraded" : undefined}
      data-overview-no-snapshot-detail={state.scenario === "no-snapshot" ? "left-chain-ledger-business-boundary-recent-success-right-readonly-boundary-degraded-modules" : undefined}
      data-overview-desktop-v1042-no-snapshot-floor={state.scenario === "no-snapshot" ? "full-width-two-zone-visibility-raw-evidence-no-blank" : undefined}
      data-overview-no-snapshot-left-main={state.scenario === "no-snapshot" ? "collection-chain-ledger-business-boundary-recent-success" : undefined}
      data-overview-no-snapshot-right-side={state.scenario === "no-snapshot" ? "readonly-boundary-degraded-modules" : undefined}
      data-overview-no-snapshot-wan-rate-layout-guard={state.scenario === "no-snapshot" ? "no-wan-rate-panel-no-zero-rate-no-rate-spacer" : undefined}
      data-overview-desktop-effective-content-height="760"
      data-overview-desktop-redline-markers="no-empty-left60-no-duplicate-boundary-no-nosnapshot-wan-rate-no-toy-tabs"
      data-overview-no-snapshot-no-wan-rate-placeholder={state.scenario === "no-snapshot" ? "business-rates-hidden" : undefined}
      data-overview-no-snapshot-zero-rate-guard={state.scenario === "no-snapshot" ? "replace-zero-rate-with-hidden" : undefined}
      data-overview-side-table-mode="three-col-no-badge"
      data-overview-desktop-fixed-skeleton="left-network-wan-right-resource-collection-bottom-interface-events"
      data-overview-side-column-ratio="24-24-52"
      data-overview-side-badge-mode="inline-text-no-column"
      data-overview-side-evidence-wrap="third-col-no-ellipsis"
      data-overview-side-evidence-no-ellipsis="true"
      data-overview-desktop-ratio="chart-table-52-48"
      data-overview-desktop-visual-table-balance="52-48-min45-each"
      data-overview-desktop-scene={state.scenario}
      data-overview-normal-first-screen={state.scenario === "single" || state.scenario === "fleet" ? "traffic-plus-evidence" : undefined}
      data-overview-normal-traffic-under-chart={state.scenario === "single" || state.scenario === "fleet" ? "current-wan-top3-route-sampling-samples-peak-success" : undefined}
      data-overview-normal-traffic-under-chart-facts={state.scenario === "single" || state.scenario === "fleet" ? "7" : undefined}
      data-overview-no-empty-traffic-panel={state.scenario === "single" || state.scenario === "fleet" ? "true" : undefined}
      data-overview-resource-first-screen={state.scenario === "resource-full" ? "danger-bars-three-metric-ledger-pressure-interface-top5" : undefined}
      data-overview-resource-first-screen-structure={state.scenario === "resource-full" ? "danger-bars-three-metric-ledger-pressure-interface-top5" : undefined}
      data-overview-resource-no-short-card={state.scenario === "resource-full" ? "content-sized-resource-evidence" : undefined}
      data-overview-resource-no-spark-duplicate={state.scenario === "resource-full" ? "danger-bars-replace-small-sparklines" : undefined}
      data-overview-collection-channel-priority={state.scenario === "collection-down" ? "rest-ssh-snapshot-before-resource" : undefined}
      data-overview-collection-resource-deferred={state.scenario === "collection-down" ? "true" : undefined}
      data-overview-collection-only-first-screen={state.scenario === "collection-down" ? "rest-ssh-snapshot-success-timeline-no-resource" : undefined}
      data-overview-interface-relation-mode={state.scenario === "interfaces-down" ? "deferred" : undefined}
      data-overview-interface-top-block={state.scenario === "interfaces-down" ? "object-status-only" : undefined}
      data-overview-interface-top-node={state.scenario === "interfaces-down" ? "object-status-only-no-relation-text" : undefined}
      data-overview-interface-relation-policy={state.scenario === "interfaces-down" ? "top-object-status-details-in-carrier-table" : undefined}
      data-overview-desktop-ikuai40-console="top-six-left-network-wan-right-resource-collection-bottom-interface-events"
    >
      <DesktopShortNav state={state} />
      <DesktopThinKpis snapshot={snapshot} state={state} />
      <div className="ro-col is-main stack" data-overview-desktop-rail="network-wan" data-overview-desktop-fixed-area="left-main">{sections.main}</div>
      <div className="ro-col is-side stack ik-home-side-stack" data-overview-desktop-rail="resource-collection" data-overview-desktop-fixed-area="right-main">{sections.side}</div>
      {sections.bottom.length > 0 ? <div className={`ro-col is-bottom stack${state.scenario === "no-snapshot" ? " ro-no-snapshot-floor" : ""}`} style={state.scenario === "no-snapshot" ? { gridColumn: "1 / -1", gridAutoRows: "minmax(190px, 1fr)" } : { gridColumn: "1 / -1" }} data-overview-desktop-rail="interface-events" data-overview-desktop-fixed-area="bottom" data-overview-desktop-v1042-no-snapshot-floor-rail={state.scenario === "no-snapshot" ? "visibility-raw-evidence-filled-floor" : undefined}>{sections.bottom}</div> : null}
    </div>
  );
}
