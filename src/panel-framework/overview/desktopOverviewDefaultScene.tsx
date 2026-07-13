import type { OverviewDerivedState, OverviewRawSnapshot } from "./index";
import { moduleTrust } from "./desktopOverviewHelpers";
import {
  collectionRows,
  threeColumnRows,
} from "./desktopOverviewCredibilityRows";
import { interfaceBoundaryRows } from "./desktopOverviewInterfaceRows";
import { routeFactRows } from "./desktopOverviewRouteRows";
import { compactRows, desktopTerminalRows } from "./desktopOverviewTerminalRows";
import {
  trafficChartRows,
  trafficPeakRows,
  trafficRouteRows,
  trafficSamplingRows,
  trafficTop3Rows,
} from "./desktopOverviewTrafficRows";
import { resourceRows } from "./desktopResourceRows";
import { desktopEvidenceBoundaryRows } from "./desktopEvidenceRows";
import { DesktopWanIntegratedVisual } from "./desktopOverviewVisuals";
import { Module } from "./components/DesktopModule";
import { EvidenceChain } from "./components/EvidenceChain";
import { TerminalRanking } from "./components/TerminalRanking";
import { WanTrend } from "./components/WanTrend";
import type { DesktopSceneSections } from "./desktopOverviewSceneTypes";

export function buildDefaultDesktopScene(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
): DesktopSceneSections {
  const trust = moduleTrust(state);
  const isFleet = state.scenario === "fleet";
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
      <WanTrend key="compact-network" title={isFleet ? "WAN 采样趋势 / 设备 TopN" : "WAN 采样趋势"} subtitle={isFleet ? "类型分布 / 异常 TopN" : "当前 / 峰值 / 默认出口 / 最近6点"} module="wan-trend" tone={state.facts.wan.allOffline ? "danger" : "trust"} trust={trust} headers={[]} rows={[]} minRows={0} visual={networkVisual} visualOnly />,
      isFleet ? <Module key="compact-route" title="默认出口" subtitle="默认路由条目 / 承载" module="route-raw-facts" tone={state.facts.route.level} trust={trust} headers={["出口", "承载出口", "优先级", "状态"]} rows={routeRowsCompact} minRows={0} /> : null,
      isFleet ? <Module key="compact-wan-evidence" title="WAN 异常 TopN" subtitle="离线对象 / 类型分布" module="normal-wan-evidence" tone={state.facts.wan.offline ? "warn" : "trust"} trust={trust} headers={["对象", "当前", "依据"]} rows={wanEvidenceRows} minRows={0} /> : null,
    ],
    side: [
      <Module key="compact-interface" title="接口状态" subtitle="转发面 / 承载" module="normal-interface-boundary" tone="trust" trust={trust} headers={["对象", "当前", "最近", "边界"]} rows={interfaceRowsCompact} minRows={0} collapsed />,
      <Module key="compact-resource" title="资源" subtitle={isFleet ? "接口排行 / 阈值" : "当前 / 阈值"} module="resource-threshold" tone={state.facts.resource.level} trust={trust} headers={["项", "阈值", "持续", "峰值"]} rows={compactRows(resourceRows(state), 3)} minRows={0} collapsed />,
      <Module key="compact-collection" title={isFleet ? "采集可信度" : "采集 / 快照"} subtitle="REST / SSH / 成功" module="normal-collection-channel" tone={state.facts.collection.level} trust={trust} headers={["对象", "当前", "依据"]} rows={collectionRowsCompact} minRows={0} collapsed />,
    ],
    bottom: [
      <TerminalRanking key="compact-terminals" title="终端排行" subtitle="按总流量排序" module="terminal-ranking" tone="trust" trust={trust} headers={["设备", "IP", "流量", "状态"]} rows={compactRows(desktopTerminalRows(snapshot), 4)} minRows={0} />,
      <EvidenceChain key="compact-boundary" title="证据 / 原始字段" subtitle="默认收起 · 业务解释优先" module="evidence-boundary" tone="trust" trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(desktopEvidenceBoundaryRows(snapshot, state), 4)} minRows={0} collapsedEvidence />,
    ],
  };
}
