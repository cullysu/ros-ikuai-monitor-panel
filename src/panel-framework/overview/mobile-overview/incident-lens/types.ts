import type { OverviewTone } from "../../types";
import type { PanelRouteId } from "../../../routes/panelRoutes";
import type {
  OverviewEvidenceMode,
  OverviewEvidenceModel,
  OverviewPriorityObject,
} from "../../evidence-model/overviewEvidenceTypes";

export type IncidentLensSurface = "patrol" | "incident";
export type IncidentLensScenario =
  | "single"
  | "fleet"
  | "interfaces-down"
  | "resource-full"
  | "collection-down"
  | "no-snapshot"
  | "all-offline";
export type IncidentLensObjectKind = "wan" | "interfaces" | "collection" | "evidence" | "resource" | "route" | "offline";

export type IncidentLensSignal =
  | {
    kind: "traffic";
    primaryLabel: string;
    primaryValue: string;
    secondaryLabel: string;
    secondaryValue: string;
    note: string;
  }
  | {
    kind: "pressure";
    label: string;
    value: number;
    threshold: number;
    note: string;
  };

export interface IncidentLensFact {
  label: string;
  value: string;
  note?: string;
  tone: OverviewTone;
}

export interface IncidentLensObject {
  id: string;
  kind: IncidentLensObjectKind;
  category: string;
  title: string;
  state: string;
  summary: string;
  tone: OverviewTone;
  source: string;
  facts: IncidentLensFact[];
  impact: IncidentLensFact[];
  evidence: IncidentLensFact[];
  signal: IncidentLensSignal | null;
  action: {
    label: string;
    note: string;
    route: PanelRouteId;
  } | null;
}

export interface IncidentLensCommand {
  mode: OverviewEvidenceMode;
  label: string;
  time: string;
  observedAt: string | null;
  tone: OverviewTone;
  primary: string;
  secondary: string;
  routeVerified: boolean;
}

export interface IncidentLensModel {
  scenario: IncidentLensScenario;
  surface: IncidentLensSurface;
  risk: OverviewEvidenceModel["risk"];
  scale: "single" | "fleet";
  command: IncidentLensCommand;
  patrolObjects: IncidentLensObject[];
  incident: IncidentLensObject | null;
  secondaryObjects: IncidentLensObject[];
  scopeFacts: IncidentLensFact[];
  defaultSelectedId: string;
  currentNumbersAllowed: boolean;
}

export type IncidentLensPriorityObject = OverviewPriorityObject;
