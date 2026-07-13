import type { OverviewDerivedState, OverviewRawSnapshot, OverviewTone } from "./index";
import type { RouterOsNetworkViewModel } from "./routerosNetworkViewModel";
import { latestSuccess, mobileRate, totals, wanLineCount } from "./mobileOverviewData";

export interface MobileIncidentTelemetryFact {
  id: "down" | "up" | "wan" | "collection";
  label: "下行" | "上行" | "WAN" | "采集";
  value: string;
  note: string;
  tone: OverviewTone;
}

export function buildMobileIncidentTelemetry(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  network: RouterOsNetworkViewModel,
): MobileIncidentTelemetryFact[] {
  const latest = latestSuccess(snapshot, state);
  const collectionTone = state.facts.collection.credibilityTone;
  const wanTotal = Math.max(1, wanLineCount(snapshot, state));

  if (network.priority === "snapshot-missing") {
    return [
      { id: "down", label: "下行", value: "不展示", note: "无可信业务快照", tone: "missing" },
      { id: "up", label: "上行", value: "不展示", note: "无可信业务快照", tone: "missing" },
      { id: "wan", label: "WAN", value: "待采集", note: "当前承载未知", tone: "missing" },
      { id: "collection", label: "采集", value: network.collection.value, note: `最近 ${latest}`, tone: collectionTone },
    ];
  }

  const rates = totals(snapshot);
  const dataBoundary = network.priority === "collection-degraded" ? "缓存快照" : "当前快照";
  return [
    { id: "down", label: "下行", value: mobileRate(rates.down), note: dataBoundary, tone: collectionTone },
    { id: "up", label: "上行", value: mobileRate(rates.up), note: dataBoundary, tone: collectionTone },
    {
      id: "wan",
      label: "WAN",
      value: `${state.facts.wan.online}/${wanTotal}`,
      note: state.facts.wan.allOffline ? "全部离线" : network.route.value,
      tone: state.facts.wan.allOffline ? "danger" : network.route.tone,
    },
    { id: "collection", label: "采集", value: network.collection.value, note: `快照 ${latest}`, tone: collectionTone },
  ];
}
