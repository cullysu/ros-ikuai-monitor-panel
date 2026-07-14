import type { OverviewScenarioKey, OverviewTone } from "../index";

export type MobileEvidenceMode = "current" | "stale" | "unavailable";
export type MobileRouteVerification = "verified" | "unknown" | "offline";

export interface MobileNativeFact {
  label: string;
  value: string;
  tone?: OverviewTone;
}

export interface MobileNativeRow extends MobileNativeFact {
  note?: string;
}

export interface MobileNativeDetailSection {
  title: string;
  note: string;
  rows: MobileNativeRow[];
}

export interface MobileNativeModel {
  scenario: OverviewScenarioKey;
  incident: boolean;
  evidenceMode: MobileEvidenceMode;
  evidenceLabel: string;
  evidenceNote: string;
  evidenceTone: OverviewTone;
  routeVerification: MobileRouteVerification;
  device: string;
  deviceNote: string;
  routeLabel: string;
  pathSummary: string;
  showRates: boolean;
  downRate: string;
  upRate: string;
  kicker: string;
  title: string;
  summary: string;
  timestamp: string;
  facts: MobileNativeFact[];
  rows: MobileNativeRow[];
  pathRows: MobileNativeRow[];
  detailSections: MobileNativeDetailSection[];
  actionTitle: string;
  actionNote: string;
}

export interface ResourceSampleEvidence {
  observed: number;
  exceeded: number;
  trailingStreak: number;
}
