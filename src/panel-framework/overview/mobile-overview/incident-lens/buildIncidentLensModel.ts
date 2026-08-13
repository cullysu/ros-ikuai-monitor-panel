import type { OverviewDerivedState } from "../../types";
import type { OverviewEvidenceModel, OverviewEvidenceRisk } from "../../evidence-model/overviewEvidenceTypes";
import type { IncidentLensFact, IncidentLensModel, IncidentLensObject, IncidentLensScenario } from "./types";

export const INCIDENT_LENS_PUBLIC_SCENARIOS = [
  "single",
  "fleet",
  "interfaces-down",
  "resource-full",
  "collection-down",
  "no-snapshot",
  "all-offline",
] as const satisfies readonly IncidentLensScenario[];

function publicScenario(value: string): IncidentLensScenario {
  return (INCIDENT_LENS_PUBLIC_SCENARIOS as readonly string[]).includes(value)
    ? value as IncidentLensScenario
    : "single";
}

function fact(label: string, value: string, tone: IncidentLensFact["tone"], note?: string): IncidentLensFact {
  return { label, value, tone, ...(note ? { note } : {}) };
}

function currentTrafficFacts(evidence: OverviewEvidenceModel): IncidentLensFact[] {
  if (evidence.evidenceMode !== "current" || !evidence.traffic || evidence.traffic.status !== "ready") return [];
  return [
    fact("下载", evidence.traffic.currentDown, "trust", evidence.traffic.windowLabel),
    fact("上传", evidence.traffic.currentUp, "trust", `${evidence.traffic.sampleCount} 个当前样本`),
  ];
}

function trailing(metric: NonNullable<OverviewEvidenceModel["resource"]>["metrics"][number]): number {
  let count = 0;
  for (let index = metric.points.length - 1; index >= 0 && metric.points[index].value >= metric.threshold; index -= 1) count += 1;
  return count;
}

function routeFacts(evidence: OverviewEvidenceModel): IncidentLensFact[] {
  const path = evidence.evidenceMode === "current" ? evidence.routeEvidence.activePath : null;
  if (!path) return [fact("默认路径", "未核实", "warn", "没有明确 route / WAN 关联")];
  return [
    fact("默认路径", path.destination, "trust", path.source),
    fact("网关", path.gateway, "trust", path.table),
  ];
}

function routeObject(evidence: OverviewEvidenceModel, state: OverviewDerivedState): IncidentLensObject {
  const path = evidence.evidenceMode === "current" ? evidence.routeEvidence.activePath : null;
  const current = Boolean(path);
  return {
    id: "incident-lens:route",
    kind: "route",
    category: "默认路径",
    title: current ? path!.gateway : "活动默认路由",
    state: current ? "已验证" : state.facts.wan.allOffline ? "离线范围" : "未核实",
    summary: current ? `${path!.destination} · ${path!.table}` : "没有可用于当前声明的默认路径记录。",
    tone: current ? "trust" : state.facts.wan.allOffline ? "danger" : "warn",
    source: current ? path!.source : "routes.defaultRoutes",
    facts: [...routeFacts(evidence), ...currentTrafficFacts(evidence)],
    impact: [fact("WAN 运行", `${state.facts.wan.online} / ${state.facts.wan.total}`, state.facts.wan.online ? "trust" : "danger")],
    evidence: routeFacts(evidence),
    signal: currentTrafficFacts(evidence).length === 2 ? {
      kind: "traffic",
      primaryLabel: "下载",
      primaryValue: currentTrafficFacts(evidence)[0].value,
      secondaryLabel: "上传",
      secondaryValue: currentTrafficFacts(evidence)[1].value,
      note: evidence.traffic?.windowLabel || "当前采样",
    } : null,
    action: { label: "查看路由证据", note: "目标、网关与路由表", route: "routes" },
  };
}

function collectionObject(evidence: OverviewEvidenceModel, state: OverviewDerivedState): IncidentLensObject {
  const rest = state.facts.collection.rest;
  const ssh = state.facts.collection.ssh;
  const failed = rest.status !== "current" ? { name: "REST", channel: rest } : ssh.status !== "current" ? { name: "SSH", channel: ssh } : null;
  const unavailable = evidence.evidenceMode === "unavailable";
  return {
    id: unavailable ? "incident-lens:evidence-boundary" : failed ? `incident-lens:collection:${failed.name.toLowerCase()}` : "incident-lens:collection",
    kind: unavailable ? "evidence" : "collection",
    category: unavailable ? "证据边界" : "采集通道",
    title: unavailable ? "业务快照" : failed?.name || "采集通道",
    state: unavailable ? "当前不可用" : failed?.channel.label || "当前记录",
    summary: unavailable ? "没有当前业务快照；业务数字已撤回。" : "REST 与 SSH 的状态分别记录，不互相代偿。",
    tone: unavailable ? "danger" : failed ? "warn" : "trust",
    source: failed?.name === "REST" ? "meta.realtime + meta.slowRest" : "meta.static",
    facts: [
      fact("REST", rest.label, rest.status === "current" ? "trust" : "warn", rest.successAt || "最近成功未记录"),
      fact("SSH", ssh.label, ssh.status === "current" ? "trust" : "warn", ssh.successAt || "最近成功未记录"),
    ],
    impact: [
      fact("当前业务数值", evidence.evidenceMode === "current" ? "可显示" : "已撤回", evidence.evidenceMode === "current" ? "trust" : "danger"),
      fact("失败端点", state.facts.failures.count ? `已记录 ${state.facts.failures.count}` : "未记录", state.facts.failures.count ? "warn" : "missing", "未记录不等于没有故障"),
    ],
    evidence: [
      fact("最近成功", evidence.evidenceTime, evidence.evidenceMode === "current" ? "trust" : "warn", evidence.evidenceAt || "未记录 RFC3339 时间"),
      fact("证据边界", evidence.evidenceNote, evidence.evidenceTone),
    ],
    signal: null,
    action: { label: "查看采集证据", note: "通道、端点与最近成功", route: "readonlyDiagnostics" },
  };
}

function resourceObject(evidence: OverviewEvidenceModel, state: OverviewDerivedState): IncidentLensObject {
  const metrics = evidence.resource?.metrics ?? [];
  const lead = metrics[0] ?? null;
  const value = lead?.value;
  const continuous = lead ? trailing(lead) : 0;
  const currentAllowed = evidence.evidenceMode === "current";
  return {
    id: lead ? `incident-lens:resource:${lead.key}` : "incident-lens:resource",
    kind: "resource",
    category: "系统资源",
    title: lead?.label || "资源压力",
    state: !currentAllowed ? "当前不可判断" : value === null || value === undefined ? "未观测" : `${Math.round(value)}%`,
    summary: !currentAllowed
      ? "没有当前快照；资源数值不作为当前状态显示。"
      : lead
      ? `${lead.label} 阈值 ${Math.round(lead.threshold)}% · ${continuous ? `连续 ${continuous} 个样本超限` : "当前样本超限"}`
      : "资源样本不完整，不能把缺失值解释为零。",
    tone: !currentAllowed ? "missing" : lead && value !== null && value >= lead.threshold ? "danger" : "missing",
    source: "overview + overview.history.resourceSamples",
    facts: !currentAllowed ? [fact("当前资源", "已撤回", "missing", evidence.evidenceLabel)] : lead ? [
      fact("阈值", `${Math.round(lead.threshold)}%`, "warn"),
      fact("连续样本", continuous ? `${continuous} / ${lead.points.length}` : "无连续超限证据", continuous ? "danger" : "warn"),
    ] : [fact("资源样本", "不完整", "missing")],
    impact: !currentAllowed ? [fact("数据边界", "依赖当前快照的资源值已隐藏", "missing")] : metrics.slice(1, 3).map((metric) => fact(
      metric.label,
      metric.value === null ? "未观测" : `${Math.round(metric.value)}%`,
      metric.value !== null && metric.value >= metric.threshold ? "danger" : "trust",
      `阈值 ${Math.round(metric.threshold)}%`,
    )),
    evidence: !currentAllowed ? [fact("最近证据", evidence.evidenceTime, "warn", evidence.evidenceAt || "未记录 RFC3339 时间")] : lead ? [
      fact("证据窗口", evidence.resource?.windowLabel || "当前采样", lead.points.length >= 2 ? "trust" : "warn"),
      fact("当前样本", lead.points.length ? "与历史窗口对齐" : "仅当前样本", lead.points.length ? "trust" : "warn"),
    ] : [fact("数据边界", "缺少可对齐资源样本", "missing")],
    signal: currentAllowed && lead && value !== null && value !== undefined ? {
      kind: "pressure",
      label: lead.label,
      value,
      threshold: lead.threshold,
      note: evidence.resource?.windowLabel || "当前采样",
    } : null,
    action: { label: "查看资源证据", note: "阈值、连续性与样本", route: "trafficLoad" },
  };
}

function interfaceObject(evidence: OverviewEvidenceModel, state: OverviewDerivedState): IncidentLensObject {
  const priority = evidence.priorityObjectsAll.find((object) => object.route === "interfaces");
  const title = priority?.name || "接口状态";
  const currentAllowed = evidence.evidenceMode === "current";
  return {
    id: priority?.id || "incident-lens:interfaces",
    kind: "interfaces",
    category: priority?.category || "接口",
    title,
    state: currentAllowed ? priority?.state || `${state.facts.interfaces.online} / ${state.facts.interfaces.total}` : "当前不可判断",
    summary: currentAllowed ? priority?.reason || "接口运行记录来自当前对象采样。" : "没有当前业务快照；接口运行值不作为当前状态显示。",
    tone: currentAllowed ? priority?.tone || (state.facts.interfaces.down ? "warn" : "trust") : "missing",
    source: priority?.sourcePath || "interfaces",
    facts: !currentAllowed ? [fact("当前接口", "已撤回", "missing", evidence.evidenceLabel)] : priority?.attributes.map((attribute) => fact(attribute.label, attribute.value, priority.tone)) || [
      fact("运行接口", `${state.facts.interfaces.online} / ${state.facts.interfaces.total}`, "trust"),
      fact("未运行", `${state.facts.interfaces.down}`, state.facts.interfaces.down ? "warn" : "trust"),
    ],
    impact: currentAllowed ? [
      fact("默认路径", evidence.routeEvidence.interfaceDependencies.length ? "存在明确依赖" : "未证明依赖", evidence.routeEvidence.interfaceDependencies.length ? "danger" : "warn"),
      ...evidence.routeEvidence.interfaceDependencies.slice(0, 1).map((dependency) => fact("关联路由", dependency.route.destination, "danger", dependency.route.gateway)),
    ] : [fact("数据边界", "依赖当前快照的接口状态已隐藏", "missing")],
    evidence: [
      fact("运行标记", priority ? "已观测" : "未记录", priority ? "trust" : "missing", priority?.sourcePath),
      ...routeFacts(evidence),
    ],
    signal: null,
    action: { label: "查看接口证据", note: "运行标记与路由依赖", route: priority?.route ?? "interfaces" },
  };
}

function wanObject(evidence: OverviewEvidenceModel, state: OverviewDerivedState): IncidentLensObject {
  const currentAllowed = evidence.evidenceMode === "current";
  return {
    id: "incident-lens:wan",
    kind: "wan",
    category: "WAN",
    title: "出口范围",
    state: currentAllowed ? `${state.facts.wan.online} / ${state.facts.wan.total}` : "当前不可判断",
    summary: !currentAllowed ? "没有当前业务快照；WAN 运行值不作为当前状态显示。" : state.facts.wan.allOffline ? "所有已观测 WAN 均未运行；不伪造活动路径。" : "WAN 运行记录与默认路径独立核实。",
    tone: !currentAllowed ? "missing" : state.facts.wan.allOffline ? "danger" : state.facts.wan.unknown ? "warn" : "trust",
    source: "wan",
    facts: !currentAllowed ? [fact("当前 WAN", "已撤回", "missing", evidence.evidenceLabel)] : [
      fact("运行 WAN", `${state.facts.wan.online} / ${state.facts.wan.total}`, state.facts.wan.online ? "trust" : "danger"),
      ...currentTrafficFacts(evidence),
    ],
    impact: routeFacts(evidence),
    evidence: [
      fact("证据模式", evidence.evidenceLabel, evidence.evidenceTone),
      fact("观测时间", evidence.evidenceTime, evidence.evidenceTone, evidence.evidenceAt || "未记录 RFC3339 时间"),
      fact("来源", "WAN 运行记录", currentAllowed ? "trust" : "missing", "wan"),
    ],
    signal: currentTrafficFacts(evidence).length === 2 ? {
      kind: "traffic",
      primaryLabel: "下载",
      primaryValue: currentTrafficFacts(evidence)[0].value,
      secondaryLabel: "上传",
      secondaryValue: currentTrafficFacts(evidence)[1].value,
      note: evidence.traffic?.windowLabel || "当前采样",
    } : null,
    action: { label: "查看 WAN 对象", note: "链路与当前记录", route: "lineStatus" },
  };
}

function objectForRisk(evidence: OverviewEvidenceModel, state: OverviewDerivedState): IncidentLensObject {
  if (evidence.risk === "collection" || evidence.risk === "evidence") return collectionObject(evidence, state);
  if (evidence.risk === "resource") return resourceObject(evidence, state);
  if (evidence.risk === "interfaces" || evidence.risk === "interface-review") return interfaceObject(evidence, state);
  if (evidence.risk === "wan") return wanObject(evidence, state);
  return routeObject(evidence, state);
}

function riskCommand(risk: OverviewEvidenceRisk, evidence: OverviewEvidenceModel, state: OverviewDerivedState): { primary: string; secondary: string } {
  if (risk === "resource") return { primary: "资源压力", secondary: `${evidence.priorityTotal} 项优先检查` };
  if (risk === "collection" || risk === "evidence") return { primary: evidence.evidenceMode === "unavailable" ? "无当前快照" : "采集已降级", secondary: `最后成功 ${evidence.evidenceTime}` };
  if (risk === "interfaces" || risk === "interface-review") return { primary: "接口需要检查", secondary: `${state.facts.interfaces.down} 个未运行` };
  if (risk === "wan") return { primary: "WAN 未运行", secondary: "没有活动默认路径" };
  if (risk === "route") return { primary: "路径未核实", secondary: "WAN 与路由关系不足" };
  const path = evidence.evidenceMode === "current" ? evidence.routeEvidence.activePath : null;
  return { primary: path ? "默认路径已验证" : "默认路径未确认", secondary: path ? path.gateway : state.scale === "fleet" ? "多对象范围" : "等待明确路由证据" };
}

/** Projects typed evidence into an isolated mobile Incident Split Lens surface. */
export function buildIncidentLensModel(evidence: OverviewEvidenceModel, state: OverviewDerivedState): IncidentLensModel {
  const incident = evidence.risk === "none" ? null : objectForRisk(evidence, state);
  const patrolObjects = [wanObject(evidence, state), interfaceObject(evidence, state), collectionObject(evidence, state), resourceObject(evidence, state)];
  const commandCopy = riskCommand(evidence.risk, evidence, state);
  const routeVerified = evidence.evidenceMode === "current" && Boolean(evidence.routeEvidence.activePath);
  const secondaryObjects = incident
    ? patrolObjects.filter((object) => object.kind !== incident.kind).slice(0, 3)
    : [routeObject(evidence, state)];
  const fallback = incident || routeObject(evidence, state);
  return {
    scenario: publicScenario(state.scenario),
    surface: incident ? "incident" : "patrol",
    risk: evidence.risk,
    scale: state.scale,
    command: {
      mode: evidence.evidenceMode,
      label: evidence.evidenceLabel,
      time: evidence.evidenceTime,
      observedAt: evidence.evidenceAt,
      tone: evidence.evidenceTone,
      primary: commandCopy.primary,
      secondary: commandCopy.secondary,
      routeVerified,
    },
    patrolObjects,
    incident,
    secondaryObjects,
    scopeFacts: state.scale === "fleet" && !incident ? [
      fact("WAN 范围", `${state.facts.wan.total}`, "trust"),
      fact("运行记录", `${state.facts.wan.online}`, state.facts.wan.online ? "trust" : "warn"),
      fact("待确认", `${state.facts.wan.unknown}`, state.facts.wan.unknown ? "warn" : "trust"),
    ] : [],
    defaultSelectedId: fallback.id,
    currentNumbersAllowed: evidence.evidenceMode === "current",
  };
}
