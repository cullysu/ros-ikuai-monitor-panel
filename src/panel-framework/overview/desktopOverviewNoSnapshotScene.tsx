import type { OverviewDerivedState, OverviewRawSnapshot } from "./index";
import { moduleTrust } from "./desktopOverviewHelpers";
import {
  lastSuccessRows,
  noSnapshotBusinessBoundaryRows,
  noSnapshotChainRows,
} from "./desktopOverviewCredibilityRows";
import { compactRows } from "./desktopOverviewTerminalRows";
import { desktopEvidenceBoundaryRows } from "./desktopEvidenceRows";
import { Module } from "./components/DesktopModule";
import type { DesktopSceneSections } from "./desktopOverviewSceneTypes";

export function buildNoSnapshotDesktopScene(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
): DesktopSceneSections {
  const trust = moduleTrust(state);
  const businessBoundaryRows = compactRows(noSnapshotBusinessBoundaryRows(snapshot, state), 4);
  const chainRows = compactRows(noSnapshotChainRows(snapshot, state), 4);
  const successRows = compactRows(lastSuccessRows(snapshot, state), 4);
  return {
    main: [
      <Module key="ns-collection-chain" title="采集链路" subtitle="管理面证据 · 不代表业务可用" module="no-snapshot-summary" tone="warn" trust={trust} headers={["通道", "当前", "依据"]} rows={chainRows} minRows={0} />,
      <Module key="ns-business-boundary" title="业务数据不可判" subtitle="缺少业务快照 · WAN / 资源 / 终端数值不展示" module="no-snapshot-module-visibility" tone="missing" trust={trust} headers={["对象", "当前", "影响", "处理"]} rows={businessBoundaryRows} minRows={0} />,
    ],
    side: [
      <Module key="ns-recovery" title="恢复线索" subtitle="最近成功 · 当前状态 · 下次轮询" module="no-snapshot-recent-success" tone="trust" trust={trust} headers={["节点", "当前", "说明"]} rows={successRows} minRows={0} />,
      <Module key="ns-raw-evidence" title="原始证据" subtitle="默认收起 · 仅用于审计" module="evidence-boundary" tone="trust" trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(desktopEvidenceBoundaryRows(snapshot, state), 4)} minRows={0} collapsedEvidence />,
    ],
    bottom: [],
  };
}
