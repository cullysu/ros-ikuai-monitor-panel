import type { OverviewDerivedState, OverviewRawSnapshot } from "../index";
import { clean } from "./mobileNativeEvidence";
import type { MobileEvidenceMode, MobileNativeSignal, MobileRouteVerification } from "./mobileNativeTypes";

export function fleetSignal(state: OverviewDerivedState, verification: MobileRouteVerification): MobileNativeSignal {
  const runningInterfaces = Math.max(0, state.facts.interfaces.total - state.facts.interfaces.down);
  return {
    kind: "fleet",
    title: "对象范围",
    note: "本次采样对象",
    items: [
      { label: "WAN", value: `${state.facts.wan.online} / ${state.facts.wan.total}`, note: "运行 / 总数", tone: state.facts.wan.online ? "trust" : "danger" },
      { label: "接口", value: `${runningInterfaces} / ${state.facts.interfaces.total}`, note: "运行 / 总数", tone: state.facts.interfaces.down ? "warn" : "trust" },
      { label: "默认路由", value: verification === "verified" ? "已核实" : "无法核实", note: verification === "verified" ? "明确活动记录" : "无明确活动记录", tone: verification === "verified" ? "trust" : "warn" },
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
