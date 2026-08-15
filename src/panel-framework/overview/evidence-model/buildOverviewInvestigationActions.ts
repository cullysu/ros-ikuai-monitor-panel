import {
  isPanelEvidenceTimestamp,
  type PanelRiskContext,
  type PanelRouteId,
} from "../../routes/panelRoutes";
import type {
  OverviewComparisonObject,
  OverviewEvidenceRisk,
  OverviewInvestigationAction,
  OverviewPriorityObject,
} from "./overviewEvidenceTypes";

type InvestigationNavigation = NonNullable<OverviewInvestigationAction["navigation"]>;
type DraftAction = Omit<OverviewInvestigationAction, "priority">;

const compactCopyByLabel: Record<string, [string, string]> = {
  "验证采集边界": ["验证边界", "REST、SSH、快照"],
  "检查失败记录": ["看失败记录", "最近采集错误"],
  "打开工具目录": ["打开目录", "服务、DNS、审计"],
  "检查 WAN 对象": ["检查 WAN", "运行、地址、父接口"],
  "进入 WAN 工作区": ["进入 WAN", "运行、地址、父接口"],
  "核对默认路由": ["核对路由", "活动标记、网关"],
  "查看网络事件": ["看网络事件", "确认故障时间"],
  "核对 WAN 关联": ["查WAN", "出口影响"],
  "查看接口事件": ["看接口", "状态变化"],
  "进入资源负载": ["查资源负载", "当前压力、吞吐"],
  "进入资源工作区": ["查资源工作区", "当前压力、吞吐"],
  "检查采样审计": ["查采样", "阈值、连续性"],
  "核对流量对象": ["核对流量", "协议与高吞吐"],
  "检查路由对象": ["查路由对象", "活动默认路由"],
  "查看路由集合": ["看路由集合", "活动默认路由"],
  "核对 WAN 状态": ["核对 WAN", "可承载出口"],
  "验证只读证据": ["验只读证据", "不可达与未采集"],
  "巡检 WAN 线路": ["巡检 WAN", "出口与当前吞吐"],
  "查看只读诊断": ["看只读诊断", "采集链路与边界"],
};

function compactCopy(label: string, note: string): Pick<OverviewInvestigationAction, "compactLabel" | "compactNote"> {
  const [compactLabel, compactNote] = compactCopyByLabel[label] || [label, note];
  return { compactLabel, compactNote };
}

export interface OverviewInvestigationActionInput {
  risk: OverviewEvidenceRisk;
  scale: "single" | "fleet";
  evidenceAt: string | null;
  priorityObjects: OverviewPriorityObject[];
}

export function overviewNavigationRisk(
  items: OverviewInvestigationAction[],
  route: PanelRouteId,
) {
  return items.find((item) => item.route === route)?.navigation?.risk;
}

export function overviewInvestigationHeading(
  steady: boolean,
  actionsToCheck: OverviewInvestigationAction[],
): [string, string] {
  if (steady) return ["巡检入口", "继续核对关键对象"];
  if (actionsToCheck.some((action) => action.mode === "investigation")) return ["对象调查", "按对象继续调查"];
  return ["关联工作区", "继续核对相关证据"];
}

function workspace(
  route: PanelRouteId,
  label: string,
  note: string,
  icon: OverviewInvestigationAction["icon"],
  navigation?: InvestigationNavigation | null,
): DraftAction {
  return { route, mode: "workspace", scope: "collection", label, note, ...compactCopy(label, note), icon, ...(navigation ? { navigation } : {}) };
}

function investigation(
  route: PanelRouteId,
  label: string,
  note: string,
  icon: OverviewInvestigationAction["icon"],
  navigation: InvestigationNavigation,
): DraftAction {
  return { route, mode: "investigation", scope: "object", label, note, ...compactCopy(label, note), icon, navigation };
}

/**
 * `priorityObjects` is the already-ranked, stable incident queue for the
 * active risk. The primary action must keep that ordering instead of falling
 * back to an unscoped workspace merely because more than one object exists.
 */
function primaryTargetObjectId(priorityObjects: OverviewPriorityObject[], route: PanelRouteId): string | null {
  return priorityObjects.find((object) => object.route === route && object.targetObjectId)?.targetObjectId || null;
}

function uniqueTargetObjectId(priorityObjects: OverviewPriorityObject[], route: PanelRouteId): string | null {
  return priorityObjects.length === 1 ? primaryTargetObjectId(priorityObjects, route) : null;
}

function investigationNavigation(
  evidenceAt: string | null,
  risk: PanelRiskContext | null,
  objectId: string | null,
): InvestigationNavigation | null {
  if (!isPanelEvidenceTimestamp(evidenceAt)) return null;
  return {
    ...(objectId ? { objectId } : {}),
    ...(risk ? { risk } : {}),
    returnRoute: "overview",
    evidenceAt,
  };
}

type OverviewObjectActionTarget = Pick<OverviewComparisonObject, "route" | "targetObjectId">;

/**
 * Build the next task for a selected normal-state comparison object from the
 * same typed action model used by the overview task rail. The normal tablet
 * inspector must not invent a generic destination label or drop the evidence
 * context that makes the destination auditable.
 */
export function overviewObjectInvestigationAction(
  object: OverviewObjectActionTarget,
  evidenceAt: string | null,
): OverviewInvestigationAction | null {
  if (!object.targetObjectId || !isPanelEvidenceTimestamp(evidenceAt)) return null;

  const actionByRoute: Partial<Record<PanelRouteId, { label: string; note: string; icon: OverviewInvestigationAction["icon"] }>> = {
    interfaces: { label: "检查接口对象", note: "运行状态与已核实依赖", icon: "network" },
    lineStatus: { label: "检查 WAN 对象", note: "运行、地址与父接口", icon: "network" },
    routes: { label: "核对路由对象", note: "活动标记、网关与距离", icon: "route" },
  };
  const copy = actionByRoute[object.route];
  if (!copy) return null;

  return {
    route: object.route,
    mode: "investigation",
    scope: "object",
    priority: "primary",
    label: copy.label,
    note: copy.note,
    icon: copy.icon,
    navigation: {
      objectId: object.targetObjectId,
      returnRoute: "overview",
      evidenceAt,
    },
  };
}

export function buildOverviewInvestigationActions({
  risk,
  scale,
  evidenceAt,
  priorityObjects,
}: OverviewInvestigationActionInput): OverviewInvestigationAction[] {
  const actions: DraftAction[] = (() => {
    if (risk === "evidence" || risk === "collection") {
      return [
      workspace("readonlyDiagnostics", "验证采集边界", "REST、SSH 与业务快照", "diagnostic"),
      workspace("logs", "检查失败记录", "定位最近采集错误", "logs"),
      workspace("more", "打开工具目录", "服务、DNS 与审计入口", "more"),
      ];
    }
    if (risk === "wan") {
      const objectId = primaryTargetObjectId(priorityObjects, "lineStatus");
      const navigation = objectId
        ? investigationNavigation(evidenceAt, null, objectId)
        : null;
      return [
        navigation
          ? investigation("lineStatus", "检查 WAN 对象", "运行、地址与父接口", "network", navigation)
          : workspace("lineStatus", "进入 WAN 工作区", "运行、地址与父接口", "network"),
        workspace("routes", "核对默认路由", "活动标记、网关与距离", "route"),
        workspace("logs", "查看网络事件", "确认故障出现时间", "logs"),
      ];
    }
    if (risk === "interfaces" || risk === "interface-review") {
      const objectId = primaryTargetObjectId(priorityObjects, "interfaces");
      const navigation = investigationNavigation(evidenceAt, risk, objectId);
      return [
        navigation
          ? investigation(
              "interfaces",
              "检查接口对象",
              risk === "interfaces" ? "运行状态与已核实依赖" : "运行观测与未核实影响",
              "network",
              navigation,
            )
          : workspace(
              "interfaces",
              "进入接口工作区",
              risk === "interfaces" ? "运行状态与已核实依赖" : "运行观测与未核实影响",
              "network",
            ),
        workspace("lineStatus", "核对 WAN 关联", "确认出口是否受影响", "route"),
        workspace("logs", "查看接口事件", "定位状态变化时间", "logs"),
      ];
    }
    if (risk === "resource") {
      const objectId = uniqueTargetObjectId(priorityObjects, "trafficLoad");
      const navigation = objectId
        ? investigationNavigation(evidenceAt, "resource", objectId)
        : null;
      return [
        navigation
          ? investigation("trafficLoad", "进入资源负载", "当前压力与接口吞吐", "resource", navigation)
          : workspace("trafficLoad", "进入资源工作区", "当前压力与接口吞吐", "resource"),
        workspace("loadAudit", "检查采样审计", "阈值、连续性与原始样本", "diagnostic"),
        workspace("trafficAudit", "核对流量对象", "协议与高吞吐来源", "network"),
      ];
    }
    if (risk === "route") {
      const objectId = uniqueTargetObjectId(priorityObjects, "routes");
      const navigation = objectId ? investigationNavigation(evidenceAt, "route", objectId) : null;
      return [
        navigation
          ? investigation("routes", "检查路由对象", "查找活动默认路由", "route", navigation)
          : workspace("routes", "查看路由集合", "查找活动默认路由", "route"),
        workspace("lineStatus", "核对 WAN 状态", "确认可承载出口", "network"),
        workspace("readonlyDiagnostics", "验证只读证据", "区分不可达与未采集", "diagnostic"),
      ];
    }
    if (risk === "none" && scale === "fleet") {
      return [
        workspace(
          "interfaces",
          "进入网络工作区",
          "WAN、接口与路由对象",
          "network",
          investigationNavigation(evidenceAt, null, null),
        ),
      ];
    }
    return [
      workspace("lineStatus", "巡检 WAN 线路", "出口对象与当前吞吐", "network", investigationNavigation(evidenceAt, null, null)),
      workspace("routes", "核对默认路由", "活动路径与网关", "route"),
      workspace("readonlyDiagnostics", "查看只读诊断", "采集链路与证据边界", "diagnostic"),
    ];
  })();
  return actions.map((action, index) => ({
    ...action,
    priority: index === 0 ? "primary" : "secondary",
  }));
}

export function overviewInvestigationRoutes(actionsToCheck: OverviewInvestigationAction[]): PanelRouteId[] {
  return actionsToCheck.map((action) => action.route);
}
