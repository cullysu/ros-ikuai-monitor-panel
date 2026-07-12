import type { OverviewDerivedState, OverviewRawSnapshot } from "./index";
import { moduleTrust } from "./desktopOverviewHelpers";
import { collectionChannelRows, threeColumnRows } from "./desktopOverviewCredibilityRows";
import {
  interfaceBoundaryRows,
  interfaceCollectionRows,
  interfacePageTrustRows,
  interfaceRelationRows,
  interfaceRows,
  routeBusinessRows,
  routeRawEvidenceRows,
} from "./desktopOverviewNetworkRows";
import { compactRows, desktopTerminalRows } from "./desktopOverviewTerminalRows";
import { ChannelMatrixVisual, VisualStack } from "./desktopOverviewVisuals";
import { Module } from "./components/DesktopModule";
import type { DesktopSceneSections } from "./desktopOverviewSceneTypes";

export function buildInterfacesDownDesktopScene(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
): DesktopSceneSections {
  const trust = moduleTrust(state);
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
