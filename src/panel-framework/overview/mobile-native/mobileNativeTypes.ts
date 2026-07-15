import type { OverviewScenarioKey, OverviewTone } from "../index";
export type MobileEvidenceMode = "current" | "historical" | "unavailable";
export type MobileRouteVerification = "verified" | "historical" | "unknown" | "offline";
export type MobileObjectKey = "wan" | "route" | "collection" | "resource" | "interface";
export type MobileRiskKey = "evidence" | "wan-offline" | "resource" | "interfaces" | "collection";
export type MobileFocusKey = MobileRiskKey | "route" | "fleet-scope";
export type MobileSignalKind = "rates" | "resource" | "interfaces" | "collection" | "wan" | "fleet" | "availability";
export type MobileChannelStatus = "current" | "degraded" | "failed" | "unavailable";

export interface MobileNativeFact {
  key?: string;
  label: string;
  value: string;
  note?: string;
  tone?: OverviewTone;
}
export interface MobileNativeRow extends MobileNativeFact { }
export interface MobileNativeSignalItem extends MobileNativeFact {
  objectId?: string;
  unit?: string;
  percent?: number;
  threshold?: number;
}
export interface MobileNativeSignal {
  kind: MobileSignalKind;
  title: string;
  note: string;
  items: MobileNativeSignalItem[];
}
export interface MobileNativeInspection {
  key: MobileObjectKey;
  objectId: string;
  objectPosition: string;
  label: string;
  title: string;
  status: string;
  tone: OverviewTone;
  note: string;
  sourcePath: string;
  observedAt: string;
  relations: MobileNativeFact[];
  rows: MobileNativeRow[];
  detailRows: MobileNativeRow[];
  disclosureTitle: string;
  actionTitle: string;
}
export interface MobileNativeFocus {
  key: MobileFocusKey;
  risk: MobileRiskKey | null;
  label: string;
  tone: OverviewTone;
  kicker: string;
  title: string;
  summary: string;
  scope: string;
  proofs: MobileNativeFact[];
  signal: MobileNativeSignal;
  inspection: MobileNativeInspection;
  objectInspections: MobileNativeInspection[];
  detailSectionKeys: string[];
}
export interface MobileNativeDetailSection {
  key: string;
  title: string;
  note: string;
  rows: MobileNativeRow[];
}

export interface MobileCollectionChannelEvidence {
  status: MobileChannelStatus;
  label: string;
  successAt: string;
  error: string;
}

export interface MobileNativeModel {
  scenario: OverviewScenarioKey;
  incident: boolean;
  risks: MobileRiskKey[];
  evidenceMode: MobileEvidenceMode;
  evidenceLabel: string;
  evidenceNote: string;
  evidenceTime: string;
  evidenceTone: OverviewTone;
  routeVerification: MobileRouteVerification;
  device: string;
  deviceNote: string;
  scopeNote: string;
  scopeFacts: MobileNativeFact[];
  focuses: MobileNativeFocus[];
  initialFocus: MobileFocusKey;
  detailSections: MobileNativeDetailSection[];
}

export interface ResourceSampleEvidence {
  observed: number;
  exceeded: number;
  trailingStreak: number;
}
