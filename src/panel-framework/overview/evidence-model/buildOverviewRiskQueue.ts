import type { OverviewDerivedState, OverviewRawRoute } from "../index";
import type { PanelNavigateOptions, PanelRiskContext } from "../../routes/panelRoutes";
import { RESOURCE_METRIC_DEFINITIONS } from "./resourceHistorySamples";
import type { OverviewEvidenceMode, OverviewRiskTask } from "./overviewEvidenceTypes";

type OverviewRiskTaskSeed = Omit<OverviewRiskTask, "targetObjectId">;
type OverviewUnrankedRiskTask = Omit<OverviewRiskTaskSeed, "priorityScore" | "priorityReason">;
export const OVERVIEW_RISK_PRIORITY = {
  evidence: { score: 600, reason: "当前快照不可用，停止当前状态判断" },
  collection: { score: 550, reason: "当前采集证据已失效，停止当前状态判断" },
  wan: { score: 500, reason: "全部 WAN 未运行，直接影响出口路径" },
  interfaces: { score: 400, reason: "已确认默认路由依赖接口未运行" },
  route: { score: 300, reason: "无法核实活动默认路由" },
  resource: { score: 200, reason: "资源持续超限，但未证明网络中断" },
  "interface-review": { score: 100, reason: "接口未运行，但影响关系尚未建立" },
} as const satisfies Record<OverviewRiskTask["risk"], { score: number; reason: string }>;

function rankedTask(task: OverviewUnrankedRiskTask): OverviewRiskTaskSeed {
  const rule = OVERVIEW_RISK_PRIORITY[task.risk];
  return { ...task, priorityScore: rule.score, priorityReason: rule.reason };
}

function compareRiskTasks(left: OverviewRiskTaskSeed, right: OverviewRiskTaskSeed): number {
  return right.priorityScore - left.priorityScore || left.risk.localeCompare(right.risk);
}

export function overviewRiskTaskNavigation(
  task: OverviewRiskTask,
  evidenceAt: string | null,
): PanelNavigateOptions {
  return {
    objectId: task.targetObjectId || null,
    risk: task.risk as PanelRiskContext,
    returnRoute: "overview",
    evidenceAt,
  };
}

export function buildOverviewRiskQueue(
  mode: OverviewEvidenceMode,
  state: OverviewDerivedState,
  route: OverviewRawRoute | null,
): OverviewRiskTaskSeed[] {
  if (mode === "unavailable") return [rankedTask({
    risk: "evidence",
    label: "当前快照",
    value: "不可用",
    note: "不作当前业务判断",
    tone: "danger",
    route: "readonlyDiagnostics",
  })];
  if (mode === "historical") return [rankedTask({
    risk: "collection",
    label: "采集状态",
    value: "当前不可确认",
    note: "只保留上次成功记录",
    tone: "warn",
    route: "readonlyDiagnostics",
  })];

  const queue: OverviewUnrankedRiskTask[] = [];
  if (state.facts.wan.allOffline) queue.push({
    risk: "wan",
    label: "WAN 运行",
    value: `0 / ${state.facts.wan.total}`,
    note: "无活动默认路由",
    tone: "danger",
    route: "lineStatus",
  });
  if (state.facts.interfaces.confirmedRisk > 0) queue.push({
    risk: "interfaces",
    label: "配置依赖接口",
    value: `${state.facts.interfaces.confirmedRisk} 个未运行`,
    note: "依据已启用默认路由关联",
    tone: "danger",
    route: "interfaces",
  });
  if (state.facts.resource.level === "danger") {
    const observed = RESOURCE_METRIC_DEFINITIONS
      .map(({ key, label, threshold }) => ({ label, threshold, value: state.facts.resource[key] }))
      .filter((item): item is typeof item & { value: number } => item.value !== null);
    const breached = observed.filter((item) => item.value >= item.threshold);
    const leading = [...breached].sort((left, right) => (right.value - right.threshold) - (left.value - left.threshold))[0]!;
    queue.push({
      risk: "resource",
      label: "资源阈值",
      value: `${breached.length} / ${observed.length} 超限`,
      note: `${leading.label} 高出 ${Math.round(leading.value - leading.threshold)} 个百分点`,
      tone: "danger",
      route: "trafficLoad",
    });
  }
  if (state.facts.interfaces.impactUnverified > 0) queue.push({
    risk: "interface-review",
    label: "接口观测",
    value: `${state.facts.interfaces.impactUnverified} 个未运行`,
    note: "影响仍未判定",
    tone: "warn",
    route: "interfaces",
  });
  if (!route && !state.facts.wan.allOffline) queue.push({
    risk: "route",
    label: "路由候选",
    value: `${state.facts.route.candidates} 条待核对`,
    note: "未发现活动默认路由",
    tone: "warn",
    route: "routes",
  });
  return queue.map(rankedTask).sort(compareRiskTasks);
}
