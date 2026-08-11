import type { OverviewEvidenceModel } from "../../evidence-model/overviewEvidenceTypes";
import type { OverviewDerivedState } from "../../types";
import type { OpticalPatrolClaim, OpticalPatrolModel } from "./opticalPatrolTypes";
import { collectionClaims, evidenceLossClaim } from "./opticalPatrolCollectionClaims";
import { claimId, sceneFor, trafficMeasurements } from "./opticalPatrolModelSupport";
import { resourceClaims } from "./opticalPatrolResourceClaims";
import { coverageClaim, priorityClaim, routeClaim } from "./opticalPatrolRouteClaims";
import { tabletEvidenceGroups } from "./opticalPatrolTabletEvidence";

function addUnique(target: OpticalPatrolClaim[], additions: OpticalPatrolClaim[]): void {
  for (const claim of additions) {
    if (!target.some((candidate) => candidate.id === claim.id)) target.push(claim);
  }
}

function buildClaims(evidence: OverviewEvidenceModel, state: OverviewDerivedState): OpticalPatrolClaim[] {
  const claims: OpticalPatrolClaim[] = [];
  if (evidence.risk === "evidence") {
    addUnique(claims, [evidenceLossClaim(evidence)]);
  } else if (evidence.risk === "collection") {
    addUnique(claims, collectionClaims(evidence, state));
  } else if (evidence.risk === "resource") {
    addUnique(claims, resourceClaims(evidence));
  } else if (evidence.risk !== "none") {
    addUnique(claims, evidence.priorityObjectsAll.map((object) => priorityClaim(evidence, object)));
  }

  if (!claims.length) addUnique(claims, [routeClaim(evidence)]);
  if (evidence.risk !== "evidence" && evidence.risk !== "collection") addUnique(claims, [routeClaim(evidence)]);
  if (evidence.evidenceMode === "current" && evidence.risk === "none") {
    addUnique(claims, evidence.coverageObjects
      .filter((object) => object.category === "WAN")
      .map((object) => coverageClaim(evidence, object)));
  }
  addUnique(claims, collectionClaims(evidence, state));
  return claims.map((claim, index) => ({ ...claim, priority: index === 0 ? "primary" : "follow-up" }));
}

function decisionFor(evidence: OverviewEvidenceModel, state: OverviewDerivedState) {
  const verifiedCurrentRoute = evidence.evidenceMode === "current" && Boolean(evidence.routeEvidence.activePath);
  const hasCurrentTraffic = verifiedCurrentRoute && trafficMeasurements(evidence).length === 2;
  if (evidence.risk === "none" && verifiedCurrentRoute) {
    if (state.scale === "fleet") {
      const wan = state.facts.wan;
      const unresolved = wan.offline + wan.unknown;
      return {
        label: "多出口巡检",
        statement: wan.total > 0 && wan.online === wan.total
          ? `${wan.total} 条 WAN 均有运行记录`
          : `${wan.online}/${wan.total} 条 WAN 有运行记录`,
        detail: "WAN 范围来自本次对象采样；默认路由与当前吞吐仍按独立断言核实，外部业务未探测。",
        tone: evidence.verdictTone,
        scopeFacts: [
          { label: "WAN 范围", value: `${wan.total} 条`, tone: wan.total > 0 ? "trust" as const : "missing" as const },
          { label: "运行记录", value: `${wan.online} 条`, tone: wan.online > 0 ? "trust" as const : "missing" as const },
          { label: "待确认", value: `${unresolved} 条`, tone: unresolved > 0 ? "warn" as const : "trust" as const },
        ],
      };
    }
    return {
      label: "出口判断",
      statement: hasCurrentTraffic ? "默认出口正在承载流量" : "活动默认路由已核实",
      detail: hasCurrentTraffic
        ? "活动默认路由与双向吞吐来自当前记录；外部业务未探测。"
        : "目标、网关和路由表来自同一条当前记录；外部业务未探测。",
      tone: evidence.verdictTone,
    };
  }
  return {
    label: evidence.verdictLabel,
    statement: evidence.verdictTitle,
    detail: evidence.verdictSummary,
    tone: evidence.verdictTone,
  };
}

/** Creates the surface projection only from typed evidence and derived state. */
export function buildOpticalPatrolModel(
  evidence: OverviewEvidenceModel,
  state: OverviewDerivedState,
): OpticalPatrolModel {
  const claims = buildClaims(evidence, state);
  return {
    scenario: state.scenario,
    scene: sceneFor(evidence, state),
    scale: state.scale,
    risk: evidence.risk,
    scope: { name: evidence.device, note: evidence.deviceNote || null },
    evidence: {
      mode: evidence.evidenceMode,
      label: evidence.evidenceLabel,
      time: evidence.evidenceTime,
      observedAt: evidence.evidenceAt,
      note: evidence.evidenceNote,
      tone: evidence.evidenceTone,
      currentAllowed: evidence.evidenceMode === "current",
    },
    decision: decisionFor(evidence, state),
    claims,
    defaultSelectedId: claims[0]?.id || claimId("evidence:empty"),
    tabletEvidenceGroups: tabletEvidenceGroups(evidence, claims),
    forbidsCurrentData: evidence.evidenceMode !== "current",
  };
}
