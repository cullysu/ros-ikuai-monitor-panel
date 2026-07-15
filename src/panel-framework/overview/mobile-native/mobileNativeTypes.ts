import type { OverviewScenarioKey, OverviewTone } from "../index";

export type MobileEvidenceMode = "current" | "historical" | "unavailable";
export type MobileRouteVerification = "verified" | "historical" | "unknown" | "offline";
export type MobileObjectKey = "wan" | "route" | "collection" | "resource";
export type MobileRiskKey = "evidence" | "wan-offline" | "resource" | "interfaces" | "collection";
export type MobileSignalKind = "rates" | "resource" | "interfaces" | "collection" | "wan" | "fleet" | "availability";
export type MobileChannelStatus = "current" | "degraded" | "failed" | "unavailable";

export interface MobileNativeFact {
  label: string;
  value: string;
  note?: string;
  tone?: OverviewTone;
}

export interface MobileNativeRow extends MobileNativeFact {
  key?: string;
}

export interface MobileNativeDecision {
  key: string;
  label: string;
  title: string;
  note: string;
  tone: OverviewTone;
}

export interface MobileNativeSignalItem extends MobileNativeFact {
  percent?: number;
  threshold?: number;
}

export interface MobileNativeSignal {
  kind: MobileSignalKind;
  title: string;
  note: string;
  items: MobileNativeSignalItem[];
}

export interface MobileNativeObjectView {
  key: MobileObjectKey;
  label: string;
  category: string;
  title: string;
  status: string;
  tone: OverviewTone;
  note: string;
  relations: MobileNativeFact[];
  rows: MobileNativeRow[];
  disclosureTitle: string;
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
  kicker: string;
  title: string;
  summary: string;
  facts: MobileNativeFact[];
  signal: MobileNativeSignal;
  decisions: MobileNativeDecision[];
  objects: MobileNativeObjectView[];
  initialObject: MobileObjectKey;
  detailSections: MobileNativeDetailSection[];
  actionTitle: string;
  actionNote: string;
}

export interface ResourceSampleEvidence {
  observed: number;
  exceeded: number;
  trailingStreak: number;
}
