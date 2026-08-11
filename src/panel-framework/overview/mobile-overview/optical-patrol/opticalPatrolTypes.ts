import type { PanelRouteId } from "../../../routes/panelRoutes";
import type {
  OverviewEvidenceMode,
  OverviewEvidenceRisk,
} from "../../evidence-model/overviewEvidenceTypes";
import type { OverviewScenarioKey, OverviewTone } from "../../types";

export type OpticalPatrolScene =
  | "single"
  | "fleet"
  | "interfaces-down"
  | "resource-full"
  | "collection-down"
  | "no-snapshot"
  | "all-offline";

export type OpticalPatrolClaimKind =
  | "route"
  | "wan"
  | "interface"
  | "resource"
  | "collection"
  | "evidence";

export interface OpticalPatrolEvidenceBoundary {
  mode: OverviewEvidenceMode;
  label: string;
  time: string;
  observedAt: string | null;
  note: string;
  tone: OverviewTone;
  currentAllowed: boolean;
}

export interface OpticalPatrolDecision {
  label: string;
  statement: string;
  detail: string;
  tone: OverviewTone;
  scopeFacts?: Array<{
    label: string;
    value: string;
    tone: OverviewTone;
  }>;
}

export interface OpticalPatrolEvidenceItem {
  key: string;
  label: string;
  value: string | number | null;
  note?: string | null;
  source: string;
  observedAt: string | null;
  evidenceMode: OverviewEvidenceMode;
  tone: OverviewTone;
}

export interface OpticalPatrolMeasurement {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  tone: OverviewTone;
  source: string;
  windowLabel: string | null;
  sampleCount: number | null;
  sampleTimestamp: number | null;
}

export interface OpticalPatrolRelationship {
  kind: "active-route" | "interface-route-dependency" | "last-confirmed-route";
  label: string;
  value: string;
  source: string;
  observedAt: string | null;
  evidenceMode: OverviewEvidenceMode;
  verified: boolean | null;
  tone: OverviewTone;
}

export interface OpticalPatrolAction {
  label: string;
  note: string;
  route: PanelRouteId;
  objectId: string;
}

export interface OpticalPatrolClaim {
  id: string;
  kind: OpticalPatrolClaimKind;
  priority: "primary" | "follow-up";
  objectId: string;
  category: string;
  title: string;
  state: string;
  summary: string;
  tone: OverviewTone;
  source: string;
  observedAt: string | null;
  evidenceMode: OverviewEvidenceMode;
  evidence: OpticalPatrolEvidenceItem[];
  measurements: OpticalPatrolMeasurement[];
  relationship: OpticalPatrolRelationship | null;
  action: OpticalPatrolAction;
  forbiddenConclusion: string;
}

export interface OpticalPatrolTabletEvidenceGroup {
  id: string;
  label: string;
  summary: string;
  claimIds: string[];
  items: OpticalPatrolEvidenceItem[];
}

export interface OpticalPatrolModel {
  scenario: OverviewScenarioKey;
  scene: OpticalPatrolScene;
  scale: "single" | "fleet";
  risk: OverviewEvidenceRisk;
  scope: {
    name: string;
    note: string | null;
  };
  evidence: OpticalPatrolEvidenceBoundary;
  decision: OpticalPatrolDecision;
  claims: OpticalPatrolClaim[];
  defaultSelectedId: string;
  tabletEvidenceGroups: OpticalPatrolTabletEvidenceGroup[];
  forbidsCurrentData: boolean;
}
