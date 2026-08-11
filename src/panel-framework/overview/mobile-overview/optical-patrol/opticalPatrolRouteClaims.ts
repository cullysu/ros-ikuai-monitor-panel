import type {
  OverviewComparisonObject,
  OverviewEvidenceMode,
  OverviewEvidenceModel,
  OverviewInterfaceRouteDependency,
  OverviewPriorityObject,
  OverviewRouteEvidencePath,
} from "../../evidence-model/overviewEvidenceTypes";
import type { OverviewDerivedState } from "../../types";
import type {
  OpticalPatrolClaim,
  OpticalPatrolClaimKind,
  OpticalPatrolEvidenceItem,
  OpticalPatrolRelationship,
} from "./opticalPatrolTypes";
import { actionFor, claimId, COLLECTION_ROUTE, evidenceItem, trafficMeasurements } from "./opticalPatrolModelSupport";

function routeRelationship(
  path: OverviewRouteEvidencePath | null,
  evidenceMode: OverviewEvidenceMode,
): OpticalPatrolRelationship {
  if (!path) {
    return {
      kind: "active-route",
      label: "活动默认路由",
      value: "关系未核实",
      source: "没有单条已核实活动默认路由记录",
      observedAt: null,
      evidenceMode,
      verified: null,
      tone: "warn",
    };
  }
  return {
    kind: path.observedAt ? "last-confirmed-route" : "active-route",
    label: path.observedAt ? "上次确认活动路径 · 仅历史" : "已核实活动默认路由",
    value: `${path.destination} via ${path.gateway}`,
    source: path.source,
    observedAt: path.observedAt,
    evidenceMode: path.observedAt ? "historical" : "current",
    verified: true,
    tone: path.observedAt ? "warn" : "trust",
  };
}

function routeEvidenceItems(path: OverviewRouteEvidencePath, mode: OverviewEvidenceMode): OpticalPatrolEvidenceItem[] {
  return [
    evidenceItem("destination", "目标", path.destination, path.source, mode, "trust", { observedAt: path.observedAt }),
    evidenceItem("gateway", "网关", path.gateway, path.source, mode, "trust", { observedAt: path.observedAt }),
    evidenceItem("table", "路由表", path.table, path.source, mode, "trust", { observedAt: path.observedAt }),
    evidenceItem("route-source", "来源", path.source, path.source, mode, "trust", { observedAt: path.observedAt }),
  ];
}

export function routeClaim(evidence: OverviewEvidenceModel): OpticalPatrolClaim {
  const currentPath = evidence.evidenceMode === "current" ? evidence.routeEvidence.activePath : null;
  const historicalPath = !currentPath && evidence.routeEvidence.lastConfirmedActivePath?.observedAt
    ? evidence.routeEvidence.lastConfirmedActivePath
    : null;
  const path = currentPath || historicalPath;
  const objectId = currentPath ? "route:active-default" : historicalPath ? "route:last-confirmed" : "route:unverified";
  const mode: OverviewEvidenceMode = currentPath ? "current" : historicalPath ? "historical" : evidence.evidenceMode;
  return {
    id: claimId(objectId),
    kind: "route",
    priority: "follow-up",
    objectId,
    category: "默认路由",
    title: currentPath ? "当前活动默认路由已核实" : historicalPath ? "仅保留上次确认路径" : "当前活动默认路由未核实",
    state: currentPath ? "已核实" : historicalPath ? "仅历史" : "未核实",
    summary: currentPath
      ? "目标、网关和路由表来自同一条当前路由记录。"
      : historicalPath
        ? "带时间的历史路径不能描述为当前活动路由。"
        : "WAN 或接口记录不能替代活动默认路由证据。",
    tone: currentPath ? "trust" : "warn",
    source: path?.source || "routes.defaultRoutes",
    observedAt: path?.observedAt || evidence.evidenceAt,
    evidenceMode: mode,
    evidence: path ? routeEvidenceItems(path, mode) : [
      evidenceItem("route-boundary", "活动路径", "未核实", "routes.defaultRoutes", mode, "warn"),
    ],
    measurements: currentPath ? trafficMeasurements(evidence) : [],
    relationship: routeRelationship(path, mode),
    action: actionFor(evidence, "route", "routes", objectId),
    forbiddenConclusion: "不得由管理面路由记录声明外部业务健康",
  };
}

function kindForPriority(object: OverviewPriorityObject, evidence: OverviewEvidenceModel): OpticalPatrolClaimKind {
  if (evidence.risk === "wan" || object.route === "lineStatus") return "wan";
  if (evidence.risk === "interfaces" || evidence.risk === "interface-review" || object.route === "interfaces") return "interface";
  if (evidence.risk === "resource" || object.route === "trafficLoad") return "resource";
  if (evidence.risk === "collection" || object.route === COLLECTION_ROUTE) return "collection";
  return "route";
}

function dependencyFor(evidence: OverviewEvidenceModel, objectId: string): OverviewInterfaceRouteDependency[] {
  return evidence.routeEvidence.interfaceDependencies.filter((dependency) => dependency.interfaceId === objectId);
}

function interfaceRelationship(evidence: OverviewEvidenceModel, objectId: string): OpticalPatrolRelationship {
  const dependencies = dependencyFor(evidence, objectId);
  if (!dependencies.length) {
    return {
      kind: "interface-route-dependency",
      label: "默认路由影响",
      value: "关系未核实",
      source: "没有已启用默认路由直接引用该接口",
      observedAt: null,
      evidenceMode: evidence.evidenceMode,
      verified: null,
      tone: "warn",
    };
  }
  return {
    kind: "interface-route-dependency",
    label: "已核实默认路由依赖",
    value: dependencies.map(({ route }) => `${route.destination} via ${route.gateway}`).join("；"),
    source: dependencies.map(({ interfaceSource, route }) => `${interfaceSource} → ${route.source}`).join("；"),
    observedAt: null,
    evidenceMode: "current",
    verified: true,
    tone: "danger",
  };
}

function interfaceDependencyItems(evidence: OverviewEvidenceModel, objectId: string): OpticalPatrolEvidenceItem[] {
  return dependencyFor(evidence, objectId).flatMap((dependency, index) => {
    const suffix = index ? `-${index + 1}` : "";
    return [
      evidenceItem(`route-destination${suffix}`, "默认路由目标", dependency.route.destination, dependency.route.source, "current", "danger"),
      evidenceItem(`route-gateway${suffix}`, "默认路由网关", dependency.route.gateway, dependency.route.source, "current", "danger"),
      evidenceItem(`interface-source${suffix}`, "接口来源", dependency.interfaceSource, dependency.interfaceSource, "current", "trust"),
    ];
  });
}

function lastRouteRelationship(evidence: OverviewEvidenceModel): OpticalPatrolRelationship {
  const path = evidence.routeEvidence.lastConfirmedActivePath;
  if (!path?.observedAt) {
    return {
      kind: "last-confirmed-route",
      label: "最后确认活动路径",
      value: "未记录",
      source: "没有带时间与来源的历史活动默认路由",
      observedAt: null,
      evidenceMode: "unavailable",
      verified: null,
      tone: "warn",
    };
  }
  return routeRelationship(path, "historical");
}

const forbiddenByKind: Record<OpticalPatrolClaimKind, string> = {
  route: "不得把未核实路径写成当前活动路由",
  wan: "不得由 WAN 运行标志断言外部互联网状态",
  interface: "不得由接口依赖异常断言互联网必然中断",
  resource: "不得由资源阈值断言转发已经中断",
  collection: "不得由采集失败断言当前业务状态",
  evidence: "不得展示任何未观测当前值",
};

export function priorityClaim(evidence: OverviewEvidenceModel, object: OverviewPriorityObject): OpticalPatrolClaim {
  const objectId = object.targetObjectId || object.id;
  const kind = kindForPriority(object, evidence);
  const relationship = kind === "interface"
    ? interfaceRelationship(evidence, objectId)
    : kind === "wan"
      ? lastRouteRelationship(evidence)
      : null;
  const facts = [
    ...object.attributes.map((attribute, index) =>
      evidenceItem(`attribute-${index + 1}`, attribute.label, attribute.value, object.sourcePath, evidence.evidenceMode, object.tone),
    ),
    ...(kind === "interface" ? interfaceDependencyItems(evidence, objectId) : []),
  ];
  if (!facts.length) facts.push(evidenceItem("object-source", "来源", object.sourcePath, object.sourcePath, evidence.evidenceMode, "trust"));
  return {
    id: claimId(objectId),
    kind,
    priority: "follow-up",
    objectId,
    category: object.category,
    title: object.name,
    state: object.state,
    summary: object.reason,
    tone: object.tone,
    source: object.sourcePath,
    observedAt: evidence.evidenceAt,
    evidenceMode: evidence.evidenceMode,
    evidence: facts,
    measurements: [],
    relationship,
    action: actionFor(evidence, kind, object.route, objectId),
    forbiddenConclusion: forbiddenByKind[kind],
  };
}

export function coverageClaim(evidence: OverviewEvidenceModel, object: OverviewComparisonObject): OpticalPatrolClaim {
  const objectId = object.targetObjectId || object.id;
  return {
    id: claimId(objectId),
    kind: "wan",
    priority: "follow-up",
    objectId,
    category: object.category,
    title: object.object,
    state: object.state,
    summary: object.evidence,
    tone: object.tone,
    source: object.source,
    observedAt: evidence.evidenceAt,
    evidenceMode: evidence.evidenceMode,
    evidence: [evidenceItem("wan-source", "来源", object.source, object.source, evidence.evidenceMode, "trust")],
    measurements: [],
    relationship: null,
    action: actionFor(evidence, "wan", object.route, objectId),
    forbiddenConclusion: "不得由 WAN 对象状态断言外部互联网或业务健康",
  };
}
