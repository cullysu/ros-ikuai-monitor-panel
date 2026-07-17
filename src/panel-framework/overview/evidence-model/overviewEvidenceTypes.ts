import type { OverviewTone } from "../index";
import type { PanelRouteId } from "../../routes/panelRoutes";

export type OverviewEvidenceMode = "current" | "historical" | "unavailable";
export type OverviewEvidenceRisk = "evidence" | "collection" | "wan" | "resource" | "interfaces" | "route" | "none";

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
  currentDown: string;
  currentUp: string;
  peak: string;
  accessibleSummary: string;
}

export interface OverviewResourcePoint {
  timestamp: number;
  cpu: number;
  memory: number;
  disk: number;
}

export interface OverviewResourceMetric {
  key: "cpu" | "memory" | "disk";
  label: string;
  value: number | null;
  threshold: number;
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

export interface OverviewEvidenceModel {
  scenario: string;
  risk: OverviewEvidenceRisk;
  evidenceMode: OverviewEvidenceMode;
  evidenceLabel: string;
  evidenceTime: string;
  evidenceNote: string;
  evidenceTone: OverviewTone;
  device: string;
  deviceNote: string;
  verdictLabel: string;
  verdictTitle: string;
  verdictSummary: string;
  verdictTone: OverviewTone;
  facts: [OverviewEvidenceFact, OverviewEvidenceFact, OverviewEvidenceFact];
  priorityLabel: string;
  priorityObjects: OverviewPriorityObject[];
  priorityObjectsAll: OverviewPriorityObject[];
  priorityTotal: number;
  focusObject: OverviewFocusObject | null;
  traffic: OverviewTrafficInstrument | null;
  resource: OverviewResourceInstrument | null;
  evidenceRows: OverviewEvidenceRow[];
}
