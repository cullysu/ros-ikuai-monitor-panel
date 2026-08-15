import type { OverviewEvidenceFact, OverviewEvidenceModel, OverviewPriorityObject, OverviewResourceMetric } from "../../overview/evidence-model/overviewEvidenceTypes";
import type { PanelNavigateOptions, PanelRouteId } from "../../routes/panelRoutes";

export type MobileFlowScene = "normal" | "fleet" | "resource" | "interfaces" | "collection" | "unavailable" | "wan";
export type MobileFlowTone = "neutral" | "verified" | "warning" | "critical";

export interface MobileFlowDestination { route: PanelRouteId; options?: PanelNavigateOptions; }
export interface MobileFlowObject {
  id: string;
  kind: "wan" | "interface" | "resource" | "collection" | "terminal" | "route" | "generic";
  label: string;
  name: string;
  state: string;
  note: string;
  tone: MobileFlowTone;
  destination: MobileFlowDestination;
}
export interface MobileFlowResource {
  key: OverviewResourceMetric["key"];
  label: string;
  value: number;
  threshold: number;
  trailing: number;
  total: number;
  destination: MobileFlowDestination;
}
export interface MobileFlowModel {
  scene: MobileFlowScene;
  device: string;
  evidenceMode: OverviewEvidenceModel["evidenceMode"];
  evidenceLabel: string;
  evidenceTime: string;
  evidenceAt: string | null;
  verdict: string;
  verdictNote: string;
  tone: MobileFlowTone;
  route: OverviewEvidenceModel["routeEvidence"]["activePath"];
  impactPath: OverviewEvidenceModel["routeEvidence"]["activePath"];
  traffic: OverviewEvidenceModel["traffic"];
  objects: MobileFlowObject[];
  streamObjects: MobileFlowObject[];
  resources: MobileFlowResource[];
}

function sceneFor(evidence: OverviewEvidenceModel): MobileFlowScene {
  if (evidence.evidenceMode === "unavailable" || evidence.risk === "evidence") return "unavailable";
  if (evidence.risk === "resource") return "resource";
  if (evidence.risk === "interfaces" || evidence.risk === "interface-review") return "interfaces";
  if (evidence.risk === "collection") return "collection";
  if (evidence.risk === "wan" || evidence.risk === "route") return "wan";
  if (evidence.scenario === "fleet" && evidence.coverageObjects.length) return "fleet";
  return "normal";
}

function toneFor(value: string): MobileFlowTone {
  if (value === "danger") return "critical";
  if (value === "warn") return "warning";
  if (value === "ok" || value === "trust") return "verified";
  return "neutral";
}

function destination(route: PanelRouteId, evidenceAt: string | null, objectId?: string): MobileFlowDestination {
  return { route, options: { returnRoute: "overview", evidenceAt, ...(objectId ? { objectId } : {}) } };
}

function kindFor(route: PanelRouteId): MobileFlowObject["kind"] {
  if (route === "interfaces") return "interface";
  if (route === "routes") return "route";
  if (route === "lineStatus") return "wan";
  if (route === "trafficLoad" || route === "loadAudit") return "resource";
  if (route === "readonlyDiagnostics" || route === "logs" || route === "serviceLogs") return "collection";
  if (route === "connections" || route === "dhcp" || route === "arp") return "terminal";
  return "generic";
}

function fromPriority(evidence: OverviewEvidenceModel): MobileFlowObject[] {
  return evidence.priorityObjectsAll.map((item: OverviewPriorityObject) => {
    const dependent = item.route === "interfaces" && Boolean(item.targetObjectId && evidence.routeEvidence.interfaceDependencies.some((row) => row.interfaceId === item.targetObjectId));
    return {
      id: item.id,
      kind: kindFor(item.route),
      label: item.category,
      name: item.name || item.category || "未命名对象",
      state: dependent ? "依赖未运行" : item.state || "待核对",
      note: dependent ? "默认出口依赖已记录" : item.route === "interfaces" ? `${item.reason}；影响关系待核实` : item.reason,
      tone: toneFor(item.tone),
      destination: destination(item.route, evidence.evidenceAt, item.targetObjectId),
    };
  });
}

function fromFact(fact: OverviewEvidenceFact, evidenceAt: string | null): MobileFlowObject | null {
  const key = `${fact.key} ${fact.label}`;
  let route: PanelRouteId | null = null;
  if (/collection|channel|endpoint|采集/i.test(key)) route = "readonlyDiagnostics";
  else if (/interface|接口/i.test(key)) route = "interfaces";
  else if (/wan|出口/i.test(key)) route = "lineStatus";
  if (!route || /^route\b|默认路由/i.test(key)) return null;
  return { id: `fact:${fact.key}`, kind: kindFor(route), label: fact.label, name: fact.value, state: fact.value, note: fact.note || "本次快照", tone: toneFor(fact.tone), destination: destination(route, evidenceAt) };
}

function normalObjects(evidence: OverviewEvidenceModel): MobileFlowObject[] {
  const facts = evidence.facts.map((fact) => fromFact(fact, evidence.evidenceAt)).filter((item): item is MobileFlowObject => Boolean(item));
  const decisions = evidence.secondaryDecisions.map((item): MobileFlowObject => ({
    id: item.id,
    kind: kindFor(item.route),
    label: item.category,
    name: item.object || item.category,
    state: item.compactState || item.state || "待核对",
    note: item.compactEvidence || item.evidence,
    tone: toneFor(item.tone),
    destination: destination(item.route, evidence.evidenceAt, item.targetObjectId),
  }));
  return [...facts, ...decisions].filter((item, index, all) => all.findIndex((candidate) => candidate.destination.route === item.destination.route) === index).slice(0, 3);
}

function trailing(metric: OverviewResourceMetric): number {
  const points = [...metric.points].sort((a, b) => a.timestamp - b.timestamp);
  let count = 0;
  for (let index = points.length - 1; index >= 0 && points[index].value >= metric.threshold; index -= 1) count += 1;
  return count;
}

function resources(evidence: OverviewEvidenceModel): MobileFlowResource[] {
  if (evidence.evidenceMode !== "current" || evidence.resource?.status !== "ready") return [];
  return evidence.resource.metrics.filter((metric): metric is OverviewResourceMetric & { value: number } => typeof metric.value === "number" && Number.isFinite(metric.value)).map((metric) => ({
    key: metric.key,
    label: metric.label,
    value: metric.value,
    threshold: metric.threshold,
    trailing: trailing(metric),
    total: metric.points.length,
    destination: destination("trafficLoad", evidence.evidenceAt, metric.key),
  })).sort((a, b) => (b.value - b.threshold) - (a.value - a.threshold));
}

function verdict(scene: MobileFlowScene, objects: MobileFlowObject[], rows: MobileFlowResource[]) {
  if (scene === "normal") return { title: "网络可用", note: "默认路径与采集均有当前证据", tone: "verified" as const };
  if (scene === "fleet") return { title: objects.some((item) => item.tone === "critical") ? "设备范围存在风险" : "设备范围已核验", note: `${objects.length} 个对象按风险排序`, tone: objects.some((item) => item.tone === "critical") ? "critical" as const : "verified" as const };
  if (scene === "resource") return { title: rows[0] ? `${rows[0].label} 持续越界` : "资源阈值已触发", note: rows[0] ? `${rows[0].value}% / 阈值 ${rows[0].threshold}%` : "等待完整当前样本", tone: "critical" as const };
  if (scene === "interfaces") return { title: "默认路径存在断点", note: `${objects.length} 个接口需要按依赖核对`, tone: "critical" as const };
  if (scene === "collection") return { title: "采集通道不完整", note: "管理面异常不等于转发面中断", tone: "warning" as const };
  if (scene === "unavailable") return { title: "当前判断已撤回", note: "速率与运行数字不可作为当前结论", tone: "critical" as const };
  return { title: "默认出口未核实", note: "没有可验证的活动路径", tone: "critical" as const };
}

function streamObjects(scene: MobileFlowScene, objects: MobileFlowObject[], evidenceAt: string | null): MobileFlowObject[] {
  if (scene === "resource") return [{
    id: "resource-sample-audit",
    kind: "resource",
    label: "下一步",
    name: "资源采样审计",
    state: "核对",
    note: "查看采样序列、持续窗口与阈值依据",
    tone: "critical",
    destination: destination("loadAudit", evidenceAt),
  }];
  if (scene === "collection") return [{
    id: "collection-source-ledger",
    kind: "collection",
    label: "下一步",
    name: "采集来源台账",
    state: "核对",
    note: "查看失败端点、最近错误与通道记录",
    tone: "warning",
    destination: destination("readonlyDiagnostics", evidenceAt),
  }];
  const offset = scene === "normal" ? 0 : 1;
  return objects.slice(offset, offset + 3);
}

export function buildMobileFlowModel(evidence: OverviewEvidenceModel): MobileFlowModel {
  const scene = sceneFor(evidence);
  const resourceRows = scene === "resource" ? resources(evidence) : [];
  const objects = scene === "normal" ? normalObjects(evidence) : scene === "fleet" ? evidence.coverageObjects.map((item): MobileFlowObject => ({ id: item.id, kind: kindFor(item.route), label: item.category, name: item.object, state: item.state, note: item.evidence, tone: toneFor(item.tone), destination: destination(item.route, evidence.evidenceAt, item.targetObjectId) })) : fromPriority(evidence);
  const summary = verdict(scene, objects, resourceRows);
  return {
    scene,
    device: evidence.device,
    evidenceMode: evidence.evidenceMode,
    evidenceLabel: evidence.evidenceLabel,
    evidenceTime: evidence.evidenceTime,
    evidenceAt: evidence.evidenceAt,
    verdict: summary.title,
    verdictNote: summary.note,
    tone: summary.tone,
    route: evidence.evidenceMode === "current" ? evidence.routeEvidence.activePath : null,
    impactPath: scene === "interfaces" ? evidence.routeEvidence.interfaceDependencies[0]?.route || null : null,
    traffic: scene === "normal" && evidence.evidenceMode === "current" && evidence.traffic?.status === "ready" ? evidence.traffic : null,
    objects,
    streamObjects: streamObjects(scene, objects, evidence.evidenceAt),
    resources: resourceRows,
  };
}
