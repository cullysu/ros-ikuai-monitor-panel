import type { OverviewEvidenceModel, OverviewPriorityObject, OverviewResourceMetric } from "../../evidence-model/overviewEvidenceTypes";
import type { OverviewTone } from "../../types";
import type { OpticalPatrolClaim, OpticalPatrolMeasurement } from "./opticalPatrolTypes";
import { actionFor, claimId, evidenceItem, trailingThresholdSamples } from "./opticalPatrolModelSupport";
import { priorityClaim } from "./opticalPatrolRouteClaims";

/** Labels are identity inputs, so their fold must be locale-neutral. */
function resourceIdentityKey(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function resourceClaim(evidence: OverviewEvidenceModel, metric: OverviewResourceMetric): OpticalPatrolClaim {
  const priority = evidence.priorityObjectsAll.find((object) =>
    object.route === "trafficLoad" && (
      (object.targetObjectId || object.id) === `resource:${metric.key}`
      || resourceIdentityKey(object.name) === resourceIdentityKey(metric.label)
    ),
  );
  const objectId = priority?.targetObjectId || priority?.id || `resource:${metric.key}`;
  const currentAllowed = evidence.evidenceMode === "current";
  const value = currentAllowed ? metric.value : null;
  const delta = value === null ? null : value - metric.threshold;
  const trailing = currentAllowed ? trailingThresholdSamples(metric) : null;
  const tone: OverviewTone = value === null ? "missing" : delta !== null && delta >= 0 ? "danger" : "trust";
  const source = "overview + overview.history.resourceSamples";
  const measurement = (key: string, label: string, measurementValue: number | null, unit: string): OpticalPatrolMeasurement => ({
    key,
    label,
    value: measurementValue,
    unit,
    tone: measurementValue === null ? "missing" : tone,
    source,
    windowLabel: evidence.resource?.windowLabel || null,
    sampleCount: metric.points.length,
    sampleTimestamp: metric.points[metric.points.length - 1]?.timestamp || null,
  });
  return {
    id: claimId(objectId),
    kind: "resource",
    priority: "follow-up",
    objectId,
    category: "系统资源",
    title: metric.label,
    state: value === null ? "当前值已撤回" : delta !== null && delta >= 0 ? "已超策略阈值" : "阈值内",
    summary: "当前值、阈值与连续样本来自同一窗口。",
    tone,
    source,
    observedAt: currentAllowed ? evidence.evidenceAt : null,
    evidenceMode: evidence.evidenceMode,
    evidence: [evidenceItem("resource-source", "来源", source, source, evidence.evidenceMode, "trust")],
    measurements: [
      measurement("resource-current", "当前值", value, "%"),
      measurement("resource-threshold", "策略阈值", metric.threshold, "%"),
      measurement("resource-delta", "阈值差", delta, "百分点"),
      measurement("resource-trailing", "末尾连续越阈", trailing, "个样本"),
    ],
    relationship: null,
    action: actionFor(evidence, "resource", "trafficLoad", objectId),
    forbiddenConclusion: "不得由资源压力推断转发已经中断",
  };
}

export function resourceClaims(evidence: OverviewEvidenceModel): OpticalPatrolClaim[] {
  const metrics = [...(evidence.resource?.metrics || [])].sort((left, right) => {
    const leftDelta = left.value === null ? Number.NEGATIVE_INFINITY : left.value - left.threshold;
    const rightDelta = right.value === null ? Number.NEGATIVE_INFINITY : right.value - right.threshold;
    return rightDelta - leftDelta;
  });
  if (metrics.length) return metrics.map((metric) => resourceClaim(evidence, metric));
  return evidence.priorityObjectsAll.map((object: OverviewPriorityObject) => priorityClaim(evidence, object));
}
