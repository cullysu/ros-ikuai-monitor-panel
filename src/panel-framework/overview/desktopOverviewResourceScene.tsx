import type { OverviewDerivedState, OverviewRawSnapshot } from "./index";
import { moduleTrust } from "./desktopOverviewHelpers";
import {
  collectionChannelRows,
  collectionRows,
  compactRows,
  interfaceBoundaryRows,
  lastSuccessRows,
  normalOpsRows,
  routeRawEvidenceRows,
  threeColumnRows,
} from "./desktopOverviewRows";
import { desktopEvidenceBoundaryRows } from "./desktopEvidenceRows";
import {
  connectionPressureChartRows,
  resourceBoundaryRows,
  resourceChartRows,
  resourceContextRows,
  resourceRiskRows,
  resourceTop5Rows,
} from "./desktopResourceRows";
import { ChannelMatrixVisual, JudgementChart, ResourcePressureLedgerVisual, VisualStack } from "./desktopOverviewVisuals";
import { Module } from "./components/DesktopModule";
import type { DesktopSceneSections } from "./desktopOverviewSceneTypes";

export function buildResourceFullDesktopScene(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
): DesktopSceneSections {
  const trust = moduleTrust(state);
  const riskChart = resourceChartRows(state);
  const pressureRows = compactRows(resourceContextRows(snapshot, state), 8);
  const top5Rows = resourceTop5Rows(snapshot).slice(0, 8);
  return {
    main: [
      <Module
        key="res-risk"
        title="最危险项 · 资源过载"
        subtitle="CPU / 内存 / 磁盘 · 阈值、持续时间与峰值"
        module="resource-risk-priority"
        tone="danger"
        trust={trust}
        headers={["项", "当前", "阈值", "峰值"]}
        rows={resourceRiskRows(state)}
        minRows={0}
        visual={<VisualStack snapshot={snapshot} state={state}><ResourcePressureLedgerVisual rows={riskChart} /></VisualStack>}
      />
    ],
    side: [
      <Module key="res-pressure" title="连接压力" subtitle="连接压力 / 活动会话 / DNS缓存 / 接口" module="resource-pressure-bars" tone="warn" trust={trust} headers={["项目", "当前", "依据"]} rows={pressureRows} minRows={0} visual={<JudgementChart module="resource-pressure-bars" kind="pressure" rows={connectionPressureChartRows(snapshot, state)} />} />,
      <Module key="res-collection" title="采集 / 快照" subtitle="REST / SSH / 成功" module="normal-collection-channel" tone={state.facts.collection.level} trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(threeColumnRows(collectionRows(snapshot, state), "res-col-"), 4)} minRows={0} visual={<ChannelMatrixVisual module="collection-status" rows={collectionChannelRows(snapshot, state)} />} />,
      <Module key="res-interface" title="接口状态" subtitle="承载 / 边界" module="normal-interface-boundary" tone="trust" trust={trust} headers={["对象", "当前", "最近", "边界"]} rows={compactRows(interfaceBoundaryRows(snapshot, state), 4)} minRows={0} collapsed />,
    ],
    bottom: [
      <Module key="res-top5" title="接口吞吐 Top5" subtitle="接口吞吐 Top5 / 占比 / 资源影响" module="resource-interface-top5" tone="warn" trust={trust} headers={["接口", "速率", "占比"]} rows={compactRows(top5Rows, 5)} className="ik-overview-top5-list" minRows={0} />,
      <Module key="res-events" title="最近事件" subtitle="采集与资源状态变化" module="normal-ops-ledger" tone={state.facts.collection.level} trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows(normalOpsRows(snapshot, state), 4)} minRows={0} />,
      <Module key="res-boundary" title="证据 / 原始字段" subtitle="默认收起 · 仅用于审计" module="evidence-boundary" tone="trust" trust={trust} headers={["对象", "当前", "依据"]} rows={compactRows([...routeRawEvidenceRows(snapshot, state), ...threeColumnRows(resourceBoundaryRows(snapshot, state), "res-boundary-")], 4)} minRows={0} collapsedEvidence />,
    ],
  };
}
