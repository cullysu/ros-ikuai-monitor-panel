import type { OverviewDerivedState, OverviewRawSnapshot } from "../types";
import type {
  OverviewEvidenceMode,
  OverviewEvidenceRisk,
  OverviewOperationalDecision,
} from "./overviewEvidenceTypes";
import { formatPercent } from "../deriveOverviewState";

function finite(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function buildOverviewOperationalDecisions(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  mode: OverviewEvidenceMode,
  risk: OverviewEvidenceRisk,
): OverviewOperationalDecision[] {
  if (mode !== "current" || risk !== "none") return [];

  const rows: OverviewOperationalDecision[] = [];
  if (state.scale !== "fleet") {
    rows.push({
      id: "decision-interfaces",
      category: "转发对象",
      object: "接口",
      state: `${state.facts.interfaces.online} / ${state.facts.interfaces.total} 运行`,
      evidence: state.facts.interfaces.down
        ? `${state.facts.interfaces.down} 个 Down：${state.facts.interfaces.downNames.slice(0, 3).join("、")}`
        : "本次采样未见 Down",
      source: "interfaces",
      sourceLabel: "接口状态快照",
      tone: state.facts.interfaces.down ? "danger" : "trust",
      route: "interfaces",
    });
  }

  rows.push({
    id: "decision-resource",
    category: "设备资源",
    object: "CPU / 内存 / 磁盘",
    state: state.facts.resource.summaryText,
    compactState: [
      state.facts.resource.cpu,
      state.facts.resource.memory,
      state.facts.resource.disk,
    ].map((value) => value === null ? "未记录" : formatPercent(value)).join(" / "),
    evidence: !state.facts.resource.available
      ? "资源采样不可用"
      : state.facts.resource.complete
        ? "阈值 85% / 85% / 90%"
        : `已观测 ${state.facts.resource.observed}/3；缺失项不按零处理`,
    compactEvidence: !state.facts.resource.available
      ? "采样不可用"
      : state.facts.resource.complete
        ? "阈值 85/85/90%"
        : `已观测 ${state.facts.resource.observed}/3 · 缺失不按零`,
    source: "overview.cpuLoad + memoryUsage + diskUsage",
    sourceLabel: "资源快照与原子样本",
    tone: state.facts.resource.level,
    route: "trafficLoad",
  });

  const connectionTotal = finite(snapshot.connections?.total);
  rows.push({
    id: "decision-connections",
    category: "连接对象",
    object: "连接跟踪",
    state: connectionTotal === null ? "未记录" : `${connectionTotal.toLocaleString("zh-CN")} 条`,
    evidence: connectionTotal === null ? "不以零值代替缺失" : "当前快照总量",
    source: "connections.total",
    sourceLabel: "连接总量快照",
    tone: connectionTotal === null ? "missing" : "trust",
    route: "connections",
  });

  return rows;
}
