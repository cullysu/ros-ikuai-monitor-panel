import type { ReactNode } from "react";
import type { OverviewDerivedState, OverviewRawSnapshot } from "./index";
import { moduleTrust } from "./desktopOverviewHelpers";
import {
  allOfflineImpactRows,
  collectionBoundaryLedgerRows,
  collectionChannelRows,
  collectionReadonlyRows,
  collectionRows,
  compactRows,
  desktopTerminalRows,
  interfaceBoundaryRows,
  interfaceCollectionRows,
  interfaceForwardingChartRows,
  interfacePageTrustRows,
  interfaceRelationRows,
  interfaceRows,
  lastSuccessRows,
  noSnapshotBusinessBoundaryRows,
  noSnapshotChainRows,
  normalOpsRows,
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
  wanContinuityRows,
  wanRows,
} from "./desktopOverviewRows";
import { desktopEvidenceBoundaryRows } from "./desktopEvidenceRows";
import {
  connectionPressureChartRows,
  resourceBoundaryRows,
  resourceChartRows,
  resourceContextRows,
  resourceRiskRows,
  resourceRows,
  resourceTop5Rows,
} from "./desktopResourceRows";
import {
  ChannelMatrixVisual,
  DesktopWanIntegratedVisual,
  JudgementChart,
  ResourcePressureLedgerVisual,
  ResourceTriCards,
  VisualStack,
} from "./desktopOverviewVisuals";
import { Module } from "./components/DesktopModule";
import { EvidenceChain } from "./components/EvidenceChain";
import { TerminalRanking } from "./components/TerminalRanking";
import { WanTrend } from "./components/WanTrend";

export interface DesktopSceneSections {
  main: ReactNode[];
  side: ReactNode[];
  bottom: ReactNode[];
}

export function buildDesktopOverviewScene(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): DesktopSceneSections {
  const trust = moduleTrust(state);
  const isFleet = state.scenario === "fleet";

  if (state.scenario === "no-snapshot") {
    const businessBoundaryRows = compactRows(noSnapshotBusinessBoundaryRows(snapshot, state), 4);
    const chainRows = compactRows(noSnapshotChainRows(snapshot, state), 4);
    const successRows = compactRows(lastSuccessRows(snapshot, state), 4);
    return {
      main: [
        <Module key="ns-collection-chain" title="采集链路" subtitle="管理面证据 · 不代表业务可用" module="no-snapshot-summary" tone="warn" trust={trust} headers={["通道", "当前", "依据"]} rows={chainRows} minRows={0} />,
        <Module key="ns-business-boundary" title="业务可信边界" subtitle="缺少业务快照 · 不展示不可验证数值" module="no-snapshot-module-visibility" tone="missing" trust={trust} headers={["对象", "当前", "影响", "处理"]} rows={businessBoundaryRows} minRows={0} />,
      ],
      side: [
        <Module key="ns-recovery" title="恢复线索" subtitle="最近成功 · 当前状态 · 下次轮询" module="no-snapshot-recent-success" tone="trust" trust={trust} headers={["节点", "当前", "说明"]} rows={successRows} minRows={0} />,
      ],
      bottom: [
        <Module key="ns-raw-evidence" className="ro-no-snapshot-floor-module" title="原始证据" subtitle="默认收起 · 仅用于审计" module="evidence-boundary" tone="trust" trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(desktopEvidenceBoundaryRows(snapshot, state), 4)} minRows={0} collapsedEvidence />,
      ],
    };
  }

  if (state.scenario === "resource-full") {
    const riskChart = resourceChartRows(state);
    const pressureRows = compactRows(resourceContextRows(snapshot, state), 8);
    const top5Rows = resourceTop5Rows(snapshot).slice(0, 8);
    return {
      main: [<Module key="res-risk" title="最危险项" subtitle="CPU / 内存 / 磁盘 · 连接压力 / 活动会话 / DNS缓存 · 阈值 / 持续 6 点 / 均值 / 峰值" module="resource-risk-priority" tone="danger" trust={trust} headers={["项", "当前", "阈值", "峰值"]} rows={resourceRiskRows(state)} minRows={0} visual={<VisualStack snapshot={snapshot} state={state}><ResourcePressureLedgerVisual rows={riskChart} /></VisualStack>} />],
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
      main: [<Module key="col-channel" title="采集证据" subtitle="通道状态降级 / 数据层状态 / REST 不可达 / SSH 不可用 / 缓存快照 / 失败端点 / 最近成功" module="collection-channel-ledger" tone="warn" trust="缓存快照" headers={["对象", "当前", "依据"]} rows={threeColumnRows(collectionRows(snapshot, state), "c3-")} minRows={0} visual={collectionVisual} />],
      side: [
        <Module key="col-recent" title="最近成功" subtitle="上次成功 / 边界" module="collection-recent-failures" tone="trust" headers={["节点", "当前", "说明"]} rows={lastSuccessRows(snapshot, state)} minRows={0} />,
        <Module key="col-boundary" title="展示边界" subtitle="不写配置 / 不推断" module="collection-cache-boundary" tone="warn" headers={["对象", "当前", "依据"]} rows={compactRows(threeColumnRows(collectionBoundaryLedgerRows(snapshot, state), "cbl-"), 6)} minRows={0} />,
        <Module key="col-route" title="默认出口" subtitle="出口 / 承载 / 优先级" module="collection-route-wan-boundary" tone={state.facts.route.level} headers={["出口", "网关", "优先级", "状态"]} rows={compactRows(routeBusinessRows(snapshot, state), 4)} minRows={0} />,
        <Module key="col-wan" title="WAN线路" subtitle="参考" module="wan-lines" tone={state.facts.wan.allOffline ? "danger" : "trust"} headers={["线路", "状态", "承载"]} rows={compactRows(wanRows(snapshot, state), 4)} minRows={0} />,
      ],
      bottom: [<Module key="col-events" title="采集事件" subtitle="最近成功 / 端点失败 / 默认出口" module="collection-bottom-events" tone="trust" headers={["对象", "当前", "依据"]} rows={compactRows(threeColumnRows(collectionReadonlyRows(snapshot, state), "cro-"), 4)} minRows={0} />],
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

  const networkRows = compactRows(trafficRows(snapshot, state), isFleet ? 6 : 5);
  const trafficChartRowsData = trafficChartRows(snapshot, state);
  const networkVisual = <DesktopWanIntegratedVisual snapshot={snapshot} state={state} rows={trafficChartRowsData} />;
  const routeRowsCompact = compactRows(routeFactRows(snapshot, state), 4);
  const collectionRowsCompact = compactRows(threeColumnRows(collectionRows(snapshot, state), "desktop-collection-"), 4);
  const interfaceRowsCompact = compactRows(interfaceBoundaryRows(snapshot, state), 4);
  const wanEvidenceRows = compactRows(threeColumnRows([
    ...trafficTop3Rows(snapshot, state),
    ...trafficRouteRows(snapshot, state),
    ...trafficSamplingRows(snapshot, state),
    ...trafficPeakRows(snapshot, state),
  ], "desktop-wan-evidence-"), isFleet ? 5 : 4);
  return {
    main: [
      <WanTrend key="compact-network" title={isFleet ? "WAN 采样趋势 / 设备 TopN" : "WAN 采样趋势"} subtitle={isFleet ? "类型分布 / 异常 TopN" : "趋势 / 当前 / 峰值 / Top 出口 / 默认出口 / 采样可信度"} module="wan-trend" tone={state.facts.wan.allOffline ? "danger" : "trust"} trust={trust} headers={[]} rows={[]} minRows={0} visual={networkVisual} visualOnly />,
      <Module key="compact-route" title="默认出口" subtitle={isFleet ? "默认路由条目 / 承载" : "出口 / 承载 / 优先级"} module="route-raw-facts" tone={state.facts.route.level} trust={trust} headers={["出口", "承载出口", "优先级", "状态"]} rows={routeRowsCompact} minRows={0} />,
      isFleet ? <Module key="compact-wan-evidence" title="WAN 异常 TopN" subtitle="离线对象 / 类型分布" module="normal-wan-evidence" tone={state.facts.wan.offline ? "warn" : "trust"} trust={trust} headers={["对象", "当前", "依据"]} rows={wanEvidenceRows} minRows={0} /> : null,
    ],
    side: [
      <Module key="compact-interface" title="接口状态" subtitle="转发面 / 承载" module="normal-interface-boundary" tone="trust" trust={trust} headers={["对象", "当前", "最近", "边界"]} rows={interfaceRowsCompact} minRows={0} />,
      <Module key="compact-resource" title="资源" subtitle={isFleet ? "接口排行 / 阈值" : "当前 / 阈值"} module="resource-threshold" tone={state.facts.resource.level} trust={trust} headers={["项", "阈值", "持续", "峰值"]} rows={compactRows(resourceRows(state), 3)} minRows={0} />,
      <Module key="compact-collection" title={isFleet ? "采集可信度" : "采集 / 快照"} subtitle="REST / SSH / 成功" module="normal-collection-channel" tone={state.facts.collection.level} trust={trust} headers={["对象", "当前", "依据"]} rows={collectionRowsCompact} minRows={0} visual={<ChannelMatrixVisual module="collection-status" rows={collectionChannelRows(snapshot, state)} />} />,
    ],
    bottom: [
      <TerminalRanking key="compact-terminals" title="终端排行" subtitle="异常置顶 / 总流量" module="terminal-ranking" tone="trust" trust={trust} headers={["设备", "IP", "流量", "状态"]} rows={compactRows(desktopTerminalRows(snapshot), 4)} minRows={0} />,
      <Module key="compact-events" title="最近事件" subtitle="采集 / 默认出口" module="normal-ops-ledger" tone={state.facts.collection.level} trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(normalOpsRows(snapshot, state), 4)} minRows={0} />,
      <EvidenceChain key="compact-boundary" title="证据 / 原始字段" subtitle="默认收起 · 业务解释优先" module="evidence-boundary" tone="trust" trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(desktopEvidenceBoundaryRows(snapshot, state), 4)} minRows={0} collapsedEvidence />,
    ],
  };
}
