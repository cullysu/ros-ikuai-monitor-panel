import type {
  OverviewDerivedState,
  OverviewRawSnapshot,
  OverviewTone,
} from "./index";
import { desktopPresentation } from "./desktopOverviewPresentation";
import {
  latestSuccess,
  restState,
  routerosState,
  sshState,
} from "./desktopOverviewHelpers";
import { buildRouterOsNetworkViewModel } from "./routerosNetworkViewModel";

export type TopbarRole =
  | "device"
  | "conclusion"
  | "object"
  | "impact"
  | "route"
  | "collection"
  | "snapshot"
  | "routeros"
  | "rest"
  | "ssh"
  | "recent-success";

export interface TopbarItem {
  label: string;
  value: string;
  note: string;
  role: TopbarRole;
  tone: OverviewTone;
}

function topbarCollectionValue(state: OverviewDerivedState): { value: string; note: string } {
  if (state.scenario === "no-snapshot") {
    return { value: "链路受限", note: "采集链路需核" };
  }
  const rest = state.facts.collection.rest;
  const ssh = state.facts.collection.ssh;
  if (rest.status !== "current" || ssh.status !== "current") {
    return {
      value: rest.status === "failed" && ssh.status === "failed" ? "采集失败" : "部分可用",
      note: `REST ${rest.label} / SSH ${ssh.label}`,
    };
  }
  if (state.facts.collection.dataStale) return { value: "缓存可参考", note: "当前采集非实时" };
  return { value: "可读", note: "REST 可用 / SSH 可用" };
}

function topbarSnapshotValue(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): Pick<TopbarItem, "value" | "note" | "tone"> {
  const cached = state.scenario === "collection-down" || state.facts.collection.dataStale || state.facts.freshness.history;
  return {
    value: latestSuccess(snapshot, state.scenario),
    note: state.scenario === "no-snapshot" ? "快照缺失" : cached ? "快照 缓存" : `快照 ${state.facts.freshness.credibilityLabel}`,
    tone: state.scenario === "no-snapshot" || cached ? "warn" : state.facts.freshness.credibilityTone,
  };
}

export function topbarItems(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): TopbarItem[] {
  const network = buildRouterOsNetworkViewModel(snapshot, state);
  const presentation = desktopPresentation(snapshot, state, network);
  const collection = topbarCollectionValue(state);
  const snapshotCell = topbarSnapshotValue(snapshot, state);
  if (state.scenario === "no-snapshot") {
    const routeros = routerosState(snapshot, state.scenario);
    const rest = restState(snapshot, state);
    const ssh = sshState(snapshot, state);
    return [
      { label: "结论", value: presentation.conclusionValue, note: "无业务快照", role: "conclusion", tone: state.verdict.level },
      { label: "设备", value: "采集对象", note: "链路异常", role: "device", tone: "trust" },
      { label: "RouterOS", value: routeros.value, note: routeros.note, role: "routeros", tone: routeros.tone },
      { label: "REST", value: rest.value, note: rest.note, role: "rest", tone: rest.tone },
      { label: "SSH", value: ssh.value, note: "SSH 不可用", role: "ssh", tone: ssh.tone },
      { label: "最近成功", value: snapshotCell.value, note: "业务快照年龄 不可判定", role: "recent-success", tone: snapshotCell.tone },
    ];
  }
  return [
    { label: "结论", value: presentation.conclusionValue, note: presentation.conclusionNote, role: "conclusion", tone: state.verdict.level },
    { label: "设备", value: state.facts.device.identity, note: `${state.facts.device.version} · ${state.facts.device.uptime}`, role: "device", tone: "trust" },
    { label: "对象", value: presentation.object.value, note: presentation.object.note, role: "object", tone: "trust" },
    { label: "影响", value: presentation.impact.value, note: presentation.impact.note, role: "impact", tone: state.verdict.level },
    {
      label: "默认出口",
      value: network.evidence.route.summary.value,
      note: network.evidence.route.businessRows[0]?.value || network.route.note,
      role: "route",
      tone: network.evidence.route.summary.tone,
    },
    { label: "采集", value: collection.value, note: collection.note, role: "collection", tone: state.facts.collection.credibilityTone },
    { label: "快照", value: snapshotCell.value, note: snapshotCell.note, role: "snapshot", tone: snapshotCell.tone },
  ];
}
