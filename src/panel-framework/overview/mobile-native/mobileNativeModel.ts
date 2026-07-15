import {
  isSnapshotUnavailable,
  type OverviewDerivedState,
  type OverviewRawRoute,
  type OverviewRawSnapshot,
  type OverviewTone,
} from "../index";
import {
  activeRoute,
  buildDetailSections,
  collectionChannels,
  successfulBusinessAt,
  successfulBusinessLabel,
} from "./mobileNativeEvidence";
import { buildMobileFocuses } from "./mobileNativeFocus";
import { configuredDevice } from "./mobileNativePresentation";
import type {
  MobileEvidenceMode,
  MobileNativeModel,
  MobileRiskKey,
  MobileRouteVerification,
} from "./mobileNativeTypes";

export type { MobileNativeModel } from "./mobileNativeTypes";

function evidenceMode(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileEvidenceMode {
  if (isSnapshotUnavailable(snapshot) || state.facts.freshness.credibility === "unavailable") return "unavailable";
  if (!successfulBusinessAt(snapshot)) return "unavailable";
  const meta = snapshot.meta || {};
  if (
    Boolean(meta.realtimeError || meta.slowRestError) ||
    state.facts.freshness.stale ||
    state.facts.freshness.history ||
    state.facts.freshness.credibility === "cache"
  ) return "historical";
  return "current";
}

function ageLabel(seconds: number | null): string {
  if (seconds == null) return "";
  const age = Math.max(0, Math.round(seconds));
  if (age >= 86400) return `${Math.floor(age / 86400)} 天前`;
  if (age >= 3600) return `${Math.floor(age / 3600)} 小时前`;
  if (age >= 60) return `${Math.floor(age / 60)} 分钟前`;
  return `${age} 秒前`;
}

function evidenceCopy(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, mode: MobileEvidenceMode) {
  const success = successfulBusinessLabel(snapshot);
  if (mode === "current") {
    const age = ageLabel(state.facts.freshness.seconds);
    return {
      label: "当前证据",
      note: "业务采样完整",
      time: success === "成功时间未记录" ? success : `${success}${age ? ` · ${age}` : ""}`,
      tone: "trust" as OverviewTone,
    };
  }
  if (mode === "historical") {
    return {
      label: "历史证据",
      note: "当前变化不可见",
      time: success === "成功时间未记录" ? success : `上次成功 ${success}`,
      tone: "warn" as OverviewTone,
    };
  }
  return {
    label: "证据不可用",
    note: "不作当前业务判断",
    time: success === "成功时间未记录" ? success : `最近成功采样 ${success}`,
    tone: "danger" as OverviewTone,
  };
}

function routeVerification(mode: MobileEvidenceMode, state: OverviewDerivedState, route: OverviewRawRoute | null): MobileRouteVerification {
  if (mode === "unavailable") return "unknown";
  const allWanOffline = state.counts.wanTotal > 0 && state.counts.wanOnline === 0;
  if (mode === "current" && allWanOffline && !route) return "offline";
  if (!route) return "unknown";
  return mode === "current" ? "verified" : "historical";
}

function orderedRisks(
  state: OverviewDerivedState,
  mode: MobileEvidenceMode,
  channels: ReturnType<typeof collectionChannels>,
): MobileRiskKey[] {
  if (mode === "unavailable") return ["evidence"];
  const risks: MobileRiskKey[] = [];
  const wanOffline = state.counts.wanTotal > 0 && state.counts.wanOnline === 0;
  const resource = state.facts.resource.level === "danger";
  const interfaces = state.facts.interfaces.down > 0;
  const collection = mode === "historical" || channels.rest.status !== "current" || channels.ssh.status !== "current" || state.facts.failures.count > 0;
  const add = (risk: MobileRiskKey, present: boolean) => {
    if (present && !risks.includes(risk)) risks.push(risk);
  };

  add("wan-offline", wanOffline && mode === "current");
  add("resource", resource);
  add("interfaces", interfaces);
  add("collection", collection);
  add("wan-offline", wanOffline && mode !== "current");
  return risks;
}

function scopeNote(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): string {
  if (state.scenario !== "fleet" && snapshot.meta?.scaleScenario !== "fleet") return "";
  const runningInterfaces = Math.max(0, state.facts.interfaces.total - state.facts.interfaces.down);
  return `范围 ${state.facts.wan.online} / ${state.facts.wan.total} WAN · ${runningInterfaces} / ${state.facts.interfaces.total} 接口`;
}

function scopeFacts(state: OverviewDerivedState, risks: MobileRiskKey[], mode: MobileEvidenceMode) {
  const runningInterfaces = Math.max(0, state.facts.interfaces.total - state.facts.interfaces.down);
  const unavailable = mode === "unavailable";
  const historical = mode === "historical";
  return [
    {
      key: "scope-wan",
      label: historical ? "WAN 记录" : "WAN 运行",
      value: unavailable ? "不可判断" : `${state.facts.wan.online} / ${state.facts.wan.total}${historical ? " · 历史" : ""}`,
      tone: unavailable ? "missing" as OverviewTone : historical ? "warn" as OverviewTone : state.facts.wan.total > 0 && state.facts.wan.online === 0 ? "danger" as OverviewTone : "trust" as OverviewTone,
    },
    {
      key: "scope-interface",
      label: historical ? "接口记录" : "接口运行",
      value: unavailable ? "不可判断" : `${runningInterfaces} / ${state.facts.interfaces.total}${historical ? " · 历史" : ""}`,
      tone: unavailable ? "missing" as OverviewTone : historical ? "warn" as OverviewTone : state.facts.interfaces.down > 0 ? "danger" as OverviewTone : "trust" as OverviewTone,
    },
    {
      key: "scope-risk",
      label: "风险焦点",
      value: risks.length ? `${risks.length} 组` : "未发现",
      tone: risks.length ? "danger" as OverviewTone : "trust" as OverviewTone,
    },
  ];
}

export function buildMobileNativeModel(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): MobileNativeModel {
  const mode = evidenceMode(snapshot, state);
  const channels = collectionChannels(snapshot);
  const route = activeRoute(snapshot);
  const verification = routeVerification(mode, state, route);
  const risks = orderedRisks(state, mode, channels);
  const evidence = evidenceCopy(snapshot, state, mode);
  const device = configuredDevice(snapshot, state, mode);
  const focuses = buildMobileFocuses({ snapshot, state, mode, verification, route, risks, channels });
  return {
    scenario: state.scenario,
    incident: risks.length > 0,
    risks,
    evidenceMode: mode,
    evidenceLabel: evidence.label,
    evidenceNote: evidence.note,
    evidenceTime: evidence.time,
    evidenceTone: evidence.tone,
    routeVerification: verification,
    device: device.identity,
    deviceNote: device.note,
    scopeNote: scopeNote(snapshot, state),
    scopeFacts: scopeFacts(state, risks, mode),
    focuses,
    initialFocus: focuses[0].key,
    detailSections: buildDetailSections(snapshot, state, mode, risks),
  };
}
