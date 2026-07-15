import type { OverviewDerivedState, OverviewRawSnapshot } from "../index";
import { clean } from "./mobileNativeEvidence";
import type {
  MobileEvidenceMode,
  MobileNativeDecision,
  MobileNativeSignal,
  MobileRiskKey,
  MobileRouteVerification,
  ResourceSampleEvidence,
} from "./mobileNativeTypes";

export function fleetSignal(state: OverviewDerivedState, verification: MobileRouteVerification): MobileNativeSignal {
  const runningInterfaces = Math.max(0, state.facts.interfaces.total - state.facts.interfaces.down);
  return {
    kind: "fleet",
    title: "规模分布",
    note: "WAN 范围、默认路由与接口对象",
    items: [
      { label: "WAN 范围", value: `${state.facts.wan.online} / ${state.facts.wan.total}`, note: "运行 / 总数", tone: state.facts.wan.online ? "trust" : "danger" },
      { label: "默认路由", value: verification === "verified" ? "已核实" : "无法核实", note: verification === "verified" ? "active=true" : "无明确活动记录", tone: verification === "verified" ? "trust" : "warn" },
      { label: "接口对象", value: `${runningInterfaces} / ${state.facts.interfaces.total}`, note: "运行 / 总数", tone: state.facts.interfaces.down ? "warn" : "trust" },
    ],
  };
}

export function configuredDevice(snapshot: OverviewRawSnapshot, state: OverviewDerivedState, mode: MobileEvidenceMode) {
  const configuredIdentity = clean(snapshot.meta?.configuredIdentity, "");
  const target = clean(snapshot.meta?.routerHost || snapshot.meta?.target, "");
  const identity = clean(configuredIdentity || state.facts.device.identity || target, "RouterOS");
  const board = mode === "unavailable"
    ? ""
    : state.facts.device.boardName !== "-"
      ? state.facts.device.boardName
      : state.facts.device.version !== "-"
        ? `RouterOS ${state.facts.device.version}`
        : "RouterOS";
  return { identity, note: [board, target ? `目标 ${target}` : ""].filter(Boolean).join(" · ") };
}

export function incidentRiskDecision(
  risk: MobileRiskKey,
  state: OverviewDerivedState,
  mode: MobileEvidenceMode,
  samples: ResourceSampleEvidence,
): MobileNativeDecision | null {
  if (risk === "wan-offline") return {
    key: risk, label: "出口",
    title: mode === "historical" ? "历史记录：外网出口没有运行对象" : "外网出口没有运行对象",
    note: mode === "historical" ? "当前变化不可见；保留记录仅用于恢复核对" : "先检查物理链路、认证与上游",
    tone: mode === "historical" ? "warn" : "danger",
  };
  if (risk === "resource") return {
    key: risk, label: "资源",
    title: mode === "historical" ? "历史记录：资源曾超过阈值" : "资源达到阻断阈值",
    note: mode === "historical" ? "当前资源状态不可见；保留样本不触发当前告警" : samples.observed ? `尾部连续 ${samples.trailingStreak} / ${samples.observed} 个有效样本` : "连续样本未取得",
    tone: mode === "historical" ? "warn" : "danger",
  };
  if (risk === "interfaces") return {
    key: risk, label: "接口",
    title: `${mode === "historical" ? "历史记录：" : ""}${state.facts.interfaces.downNames.slice(0, 3).join(" / ") || `${state.facts.interfaces.down} 个接口`}`,
    note: mode === "historical" ? "当前变化不可见；仅保留父接口、VLAN 与 PPPoE 依赖" : "核对父接口、VLAN 与 PPPoE 依赖",
    tone: mode === "historical" ? "warn" : "danger",
  };
  return null;
}
