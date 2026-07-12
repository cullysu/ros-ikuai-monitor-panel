import type { OverviewDerivedState, OverviewRawSnapshot } from "./index";
import { moduleTrust } from "./desktopOverviewHelpers";
import {
  allOfflineImpactRows,
  collectionChannelRows,
  collectionRows,
  threeColumnRows,
  wanContinuityRows,
} from "./desktopOverviewCredibilityRows";
import {
  interfaceBoundaryRows,
  routeBusinessRows,
  routeRawEvidenceRows,
  wanRows,
} from "./desktopOverviewNetworkRows";
import { compactRows } from "./desktopOverviewTerminalRows";
import { normalOpsRows } from "./desktopOverviewTrafficRows";
import { ChannelMatrixVisual } from "./desktopOverviewVisuals";
import { Module } from "./components/DesktopModule";
import type { DesktopSceneSections } from "./desktopOverviewSceneTypes";
import { WanOfflineFocus } from "./components/WanOfflineFocus";

export function buildAllOfflineDesktopScene(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
): DesktopSceneSections {
  const trust = moduleTrust(state);
  const offlineRows = wanRows(snapshot, state);
  const totalWan = Math.max(state.facts.wan.total, offlineRows.length);
  return {
    main: [
      <Module key="ao-wan" title="WAN 全离线" subtitle={`0/${totalWan} 在线 · 默认出口不可承载`} module="wan-offline-bars" tone="danger" trust={trust} headers={["线路", "状态", "承载"]} rows={offlineRows} minRows={0} visual={<WanOfflineFocus rows={offlineRows} total={totalWan} />} collapsed />,
      <Module key="ao-route" title="默认出口判断" subtitle="出口 / 承载 / 优先级" module="wan-route-ledger" tone={state.facts.route.level} trust={trust} headers={["出口", "网关", "优先级", "状态"]} rows={routeBusinessRows(snapshot, state)} minRows={0} />,
    ],
    side: [
      <Module key="ao-continuity" title="WAN连续性" subtitle={`0/${totalWan} 在线 · 默认路由异常`} module="wan-offline-continuity" tone="danger" trust={trust} headers={["字段", "当前", "依据"]} rows={compactRows(wanContinuityRows(state), 4)} minRows={0} collapsed />,
      <Module key="ao-collection" title="采集通道" subtitle="REST / SSH / 快照" module="collection-status" tone={state.facts.collection.level} trust={trust} headers={["对象", "当前", "依据"]} rows={threeColumnRows(collectionRows(snapshot, state), "ao3-")} minRows={0} visual={<ChannelMatrixVisual module="collection-status" rows={collectionChannelRows(snapshot, state)} />} collapsed />,
      <Module key="ao-impact" title="业务影响" subtitle="默认路由 / 速率不展示" module="wan-offline-impact-boundary" tone="warn" trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(threeColumnRows(allOfflineImpactRows(snapshot, state), "aoi-"), 5)} minRows={0} />,
    ],
    bottom: [
      <Module key="ao-interface" title="接口 / WAN 边界" subtitle="接口承载 / 默认出口" module="wan-offline-bottom-interface" tone="warn" trust={trust} headers={["对象", "当前", "最近", "边界"]} rows={compactRows(interfaceBoundaryRows(snapshot, state), 4)} minRows={0} />,
      <Module key="ao-events" title="采集事件" subtitle="REST / SSH / 最近成功" module="wan-offline-bottom-events" tone={state.facts.collection.level} trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(normalOpsRows(snapshot, state), 4)} minRows={0} />,
      <Module key="ao-raw" title="证据 / 原始字段" subtitle="默认收起 · 仅用于审计" module="evidence-boundary" tone="trust" trust={trust} headers={["对象", "当前", "依据"]} rows={routeRawEvidenceRows(snapshot, state)} minRows={0} collapsedEvidence />,
    ],
  };
}
