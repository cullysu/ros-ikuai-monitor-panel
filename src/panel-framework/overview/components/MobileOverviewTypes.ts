import type { OverviewDerivedState, OverviewRawSnapshot, OverviewTone } from "../index";
import type { MobileOverviewModel } from "../mobileOverviewModel";

export interface MobileOverviewHomeProps {
  snapshot: OverviewRawSnapshot;
  state: OverviewDerivedState;
}

export interface MobileOverviewResolvedProps extends MobileOverviewHomeProps {
  model: MobileOverviewModel;
}

export type ResourceReading = {
  key: "processor" | "memory" | "disk";
  label: string;
  value: number;
  display: string;
  threshold: number;
  tone: OverviewTone;
  coreBlock?: "wan" | "collection" | "resource";
};

export type NativeRow = {
  id: string;
  title: string;
  value: string;
  note: string;
  tone: OverviewTone;
};

export type AppRankingRow = {
  id: string;
  rank: number | "";
  name: string;
  kind?: string;
  meta: string;
  value: string;
  status?: string;
  percent: number;
  tone: OverviewTone;
  evidenceLayer: "business" | "semantic" | "raw";
  evidenceSource: "route" | "collection" | "snapshot" | "forwarding" | "business" | "resource" | "terminal" | "interface";
  evidenceRole: "primary-impact" | "secondary-evidence" | "operational-context";
  evidenceKey: string;
};

export type ChannelReading = {
  label: string;
  value: string;
  tone: OverviewTone;
};
