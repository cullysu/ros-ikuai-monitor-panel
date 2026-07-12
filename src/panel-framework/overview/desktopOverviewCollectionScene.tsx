import type { OverviewDerivedState, OverviewRawSnapshot } from "./index";
import { moduleTrust } from "./desktopOverviewHelpers";
import {
  collectionBoundaryLedgerRows,
  collectionChannelRows,
  collectionReadonlyRows,
  collectionRows,
  compactRows,
  lastSuccessRows,
  routeBusinessRows,
  threeColumnRows,
  wanRows,
} from "./desktopOverviewRows";
import { ChannelMatrixVisual, VisualStack } from "./desktopOverviewVisuals";
import { Module } from "./components/DesktopModule";
import type { DesktopSceneSections } from "./desktopOverviewSceneTypes";

export function buildCollectionDownDesktopScene(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
): DesktopSceneSections {
  const trust = moduleTrust(state);
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
