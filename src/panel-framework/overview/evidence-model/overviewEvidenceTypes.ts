import type { OverviewTone, RateUnit } from "../index";
import type { PanelNavigateOptions, PanelRouteId } from "../../routes/panelRoutes";

export type OverviewEvidenceMode = "current" | "historical" | "unavailable";
export type OverviewEvidenceRisk = "evidence" | "collection" | "wan" | "resource" | "interfaces" | "interface-review" | "route" | "none";
export type OverviewInvestigationIcon = "diagnostic" | "logs" | "network" | "route" | "resource" | "more";
export type OverviewInvestigationActionMode = "investigation" | "workspace";
export type OverviewInvestigationActionScope = "object" | "collection";
export type OverviewInvestigationActionPriority = "primary" | "secondary";

export interface OverviewRiskTask {
  risk: Exclude<OverviewEvidenceRisk, "none">;
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
  route: PanelRouteId;
  targetObjectId?: string;
}

export interface OverviewInvestigationAction {
  route: PanelRouteId;
  mode: OverviewInvestigationActionMode;
  scope: OverviewInvestigationActionScope;
  priority: OverviewInvestigationActionPriority;
  label: string;
  note: string;
  compactLabel?: string;
  compactNote?: string;
  icon: OverviewInvestigationIcon;
  navigation?: Pick<PanelNavigateOptions, "objectId" | "risk" | "returnRoute" | "evidenceAt">;
}

export interface OverviewEvidenceFact {
  key: string;
  label: string;
  value: string;
  note?: string;
  tone: OverviewTone;
}

export interface OverviewPriorityObject {
  id: string;
  category: string;
  name: string;
  state: string;
  reason: string;
  tone: OverviewTone;
  route: PanelRouteId;
  targetObjectId?: string;
  sourcePath: string;
  attributes: Array<{ label: string; value: string }>;
}

export interface OverviewFocusObject {
  id: string;
  category: string;
  name: string;
  note: string;
  tone: OverviewTone;
  route: PanelRouteId;
  targetObjectId?: string;
  sourcePath: string;
  attributes: Array<{ label: string; value: string }>;
}

export interface OverviewComparisonObject {
  id: string;
  category: string;
  object: string;
  state: string;
  evidence: string;
  source: string;
  tone: OverviewTone;
  route: PanelRouteId;
  targetObjectId: string;
}

export interface OverviewOperationalDecision {
  id: string;
  category: string;
  object: string;
  state: string;
  /** A phone-width label that keeps the same evidence without forcing a second line. */
  compactState?: string;
  evidence: string;
  /** A phone-width evidence label; the full evidence remains available to desktop/detail views. */
  compactEvidence?: string;
  source: string;
  tone: OverviewTone;
  route: PanelRouteId;
  targetObjectId?: string;
}

export interface OverviewTrafficPoint {
  timestamp: number;
  down: number;
  up: number;
}

export interface OverviewTrafficInstrument {
  status: "ready" | "accumulating";
  title: string;
  windowLabel: string;
  sampleCount: number;
  points: OverviewTrafficPoint[];
  unit: RateUnit;
  currentDown: string;
  currentUp: string;
  peak: string;
  accessibleSummary: string;
}

export interface OverviewResourcePoint {
  timestamp: number;
  cpu: number | null;
  memory: number | null;
  disk: number | null;
}

export interface OverviewResourceMetric {
  key: "cpu" | "memory" | "disk";
  label: string;
  value: number | null;
  threshold: number;
  points: Array<{ timestamp: number; value: number }>;
}

export interface OverviewResourceInstrument {
  status: "ready" | "accumulating";
  windowLabel: string;
  sampleCount: number;
  metrics: OverviewResourceMetric[];
  points: OverviewResourcePoint[];
  accessibleSummary: string;
}

export interface OverviewEvidenceRow {
  key: string;
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
}

export type OverviewScenarioFocusKind = "coverage" | "planes" | "outage";

export interface OverviewScenarioFocusItem {
  key: string;
  label: string;
  value: string;
  note: string;
  tone: OverviewTone;
  route: PanelRouteId;
  actionable: boolean;
}

export interface OverviewScenarioFocus {
  kind: OverviewScenarioFocusKind;
  label: string;
  title: string;
  summary: string;
  items: OverviewScenarioFocusItem[];
}

export interface OverviewEvidenceModel {
  scenario: string;
  risk: OverviewEvidenceRisk;
  riskQueue: OverviewRiskTask[];
  evidenceMode: OverviewEvidenceMode;
  evidenceLabel: string;
  evidenceAt: string | null;
  evidenceTime: string;
  evidenceNote: string;
  evidenceTone: OverviewTone;
  device: string;
  deviceNote: string;
  verdictLabel: string;
  verdictTitle: string;
  verdictSummary: string;
  verdictTone: OverviewTone;
  scenarioFocus: OverviewScenarioFocus | null;
  facts: [OverviewEvidenceFact, OverviewEvidenceFact, OverviewEvidenceFact];
  priorityLabel: string;
  priorityTitle: string;
  priorityObjects: OverviewPriorityObject[];
  priorityObjectsAll: OverviewPriorityObject[];
  priorityTotal: number;
  focusObject: OverviewFocusObject | null;
  coverageObjects: OverviewComparisonObject[];
  comparisonObjects: OverviewComparisonObject[];
  tabletComparisonObjects: OverviewComparisonObject[];
  secondaryDecisions: OverviewOperationalDecision[];
  traffic: OverviewTrafficInstrument | null;
  resource: OverviewResourceInstrument | null;
  evidenceRows: OverviewEvidenceRow[];
  investigationActions: OverviewInvestigationAction[];
}
