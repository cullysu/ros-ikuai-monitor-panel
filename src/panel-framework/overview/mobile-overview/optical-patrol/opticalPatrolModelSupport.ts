import type { PanelRouteId } from "../../../routes/panelRoutes";
import type {
  OverviewEvidenceMode,
  OverviewEvidenceModel,
} from "../../evidence-model/overviewEvidenceTypes";
import type { OverviewDerivedState, OverviewTone } from "../../types";
import type {
  OpticalPatrolAction,
  OpticalPatrolClaimKind,
  OpticalPatrolEvidenceItem,
  OpticalPatrolMeasurement,
  OpticalPatrolScene,
} from "./opticalPatrolTypes";

export const COLLECTION_ROUTE: PanelRouteId = "readonlyDiagnostics";

export function sceneFor(evidence: OverviewEvidenceModel, state: OverviewDerivedState): OpticalPatrolScene {
  if (evidence.risk === "evidence") return "no-snapshot";
  if (evidence.risk === "collection") return "collection-down";
  if (evidence.risk === "resource") return "resource-full";
  if (evidence.risk === "interfaces" || evidence.risk === "interface-review") return "interfaces-down";
  if (evidence.risk === "wan" || evidence.risk === "route") return "all-offline";
  return state.scenario;
}

export function claimId(objectId: string): string {
  return `claim:${objectId}`;
}

export function evidenceItem(
  key: string,
  label: string,
  value: string | number | null,
  source: string,
  evidenceMode: OverviewEvidenceMode,
  tone: OverviewTone,
  options: { note?: string | null; observedAt?: string | null } = {},
): OpticalPatrolEvidenceItem {
  return {
    key,
    label,
    value,
    note: options.note,
    source,
    observedAt: options.observedAt || null,
    evidenceMode,
    tone,
  };
}

function rateScale(unit: string): number {
  if (unit === "Gbps") return 1_000_000_000;
  if (unit === "Mbps") return 1_000_000;
  if (unit === "Kbps") return 1_000;
  return 1;
}

export function trafficMeasurements(evidence: OverviewEvidenceModel): OpticalPatrolMeasurement[] {
  if (evidence.evidenceMode !== "current" || evidence.traffic?.status !== "ready") return [];
  const latest = evidence.traffic.points[evidence.traffic.points.length - 1];
  if (!latest) return [];
  const scale = rateScale(evidence.traffic.unit);
  return [
    {
      key: "traffic-down",
      label: "当前下载",
      value: latest.down / scale,
      unit: evidence.traffic.unit,
      tone: "trust",
      source: "overview.history.trafficSamples",
      windowLabel: evidence.traffic.windowLabel,
      sampleCount: evidence.traffic.sampleCount,
      sampleTimestamp: latest.timestamp,
    },
    {
      key: "traffic-up",
      label: "当前上传",
      value: latest.up / scale,
      unit: evidence.traffic.unit,
      tone: "trust",
      source: "overview.history.trafficSamples",
      windowLabel: evidence.traffic.windowLabel,
      sampleCount: evidence.traffic.sampleCount,
      sampleTimestamp: latest.timestamp,
    },
  ];
}

export function trailingThresholdSamples(metric: { points: Array<{ value: number }>; threshold: number }): number {
  let count = 0;
  for (let index = metric.points.length - 1; index >= 0; index -= 1) {
    if (metric.points[index].value < metric.threshold) break;
    count += 1;
  }
  return count;
}

export function actionFor(
  evidence: OverviewEvidenceModel,
  kind: OpticalPatrolClaimKind,
  route: PanelRouteId,
  objectId: string,
): OpticalPatrolAction {
  const matching = evidence.investigationActions.find((action) =>
    action.route === route && action.navigation?.objectId === objectId,
  ) || evidence.investigationActions.find((action) => action.route === route);
  const fallback: Record<OpticalPatrolClaimKind, Pick<OpticalPatrolAction, "label" | "note">> = {
    route: { label: "核对默认路由", note: "活动标记、目标、网关与路由表" },
    wan: { label: "检查 WAN 对象", note: "运行状态、地址与父接口" },
    interface: { label: "检查接口与路由依赖", note: "运行标志与已启用默认路由关系" },
    resource: { label: "打开资源负载", note: "当前值、策略阈值与采样窗口" },
    collection: { label: "检查采集边界", note: "REST、SSH、错误与最近成功" },
    evidence: { label: "检查证据边界", note: "失败端点、最近成功与只读采集状态" },
  };
  return {
    label: matching?.label || fallback[kind].label,
    note: matching?.note || fallback[kind].note,
    route,
    objectId,
  };
}
