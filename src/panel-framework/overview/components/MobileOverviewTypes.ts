import type { OverviewDerivedState, OverviewRawSnapshot, OverviewTone } from "../index";

export interface MobileOverviewHomeProps {
  snapshot: OverviewRawSnapshot;
  state: OverviewDerivedState;
}

export type ResourceReading = {
  key: "processor" | "memory" | "disk";
  label: string;
  value: number;
  display: string;
  threshold: number;
  tone: OverviewTone;
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
};

export type ChannelReading = {
  label: string;
  value: string;
  tone: OverviewTone;
};
