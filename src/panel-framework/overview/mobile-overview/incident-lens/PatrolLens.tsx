import { ArrowUpRight, ChevronRight, Network, Route, ServerCog, Waypoints } from "lucide-react";
import type { IncidentLensFact, IncidentLensModel, IncidentLensObject } from "./types";
import { incidentLensObjectDomId } from "./useIncidentLensSelectionHistory";
import "./styles/patrol-next.css";

const icons = { wan: Network, interfaces: Waypoints, collection: ServerCog, evidence: ServerCog, resource: ServerCog, route: Route, offline: Network } as const;
const proofLabels = new Set(["证据模式", "观测时间"]);
const trafficLabels = new Set(["下载", "上传"]);

function workspaceLabel(route: NonNullable<IncidentLensObject["action"]>["route"]): string {
  const labels: Partial<Record<typeof route, string>> = {
    interfaces: "接口对象",
    lineStatus: "WAN 线路",
    readonlyDiagnostics: "采集诊断",
    routes: "路由记录",
    trafficLoad: "资源负载",
  };
  return labels[route] || route;
}

function sourceLabel(object: IncidentLensObject): string {
  const labels: Record<IncidentLensObject["kind"], string> = {
    route: "默认路由记录",
    wan: "WAN 运行记录",
    interfaces: "接口状态快照",
    collection: "采集通道状态",
    evidence: "业务快照边界",
    resource: "资源采样记录",
    offline: "出口范围记录",
  };
  return labels[object.kind];
}

function firstNumber(value: string): number | null {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function ObjectRow({ object, selected, onSelect }: { object: IncidentLensObject; selected: boolean; onSelect: (id: string) => void }) {
  const Icon = icons[object.kind];
  return <button
    type="button"
    className="incident-lens__object-row patrol-next__object-control"
    data-incident-lens-object={object.kind}
    data-incident-lens-claim-control
    data-incident-lens-claim-id={object.id}
    data-incident-lens-tone={object.tone}
    aria-label={`${object.category}，${object.title}，${object.state}`}
    aria-pressed={selected}
    onClick={() => onSelect(object.id)}
  >
    <Icon size={18} aria-hidden="true" />
    <span><small>{object.kind === "route" ? "路径" : "对象"}</small><strong className="incident-lens__followup-title">{object.category}</strong></span>
    <span className="incident-lens__object-state">{object.state}</span>
    <ChevronRight size={18} aria-hidden="true" />
  </button>;
}

function Signal({ object }: { object: IncidentLensObject }) {
  if (!object.signal) return null;
  if (object.signal.kind === "traffic") return <section className="incident-lens__signal incident-lens__signal--traffic patrol-next__signal" data-incident-lens-traffic-geometry aria-label="当前流量">
    <div><small>{object.signal.primaryLabel}</small><strong>{object.signal.primaryValue}</strong></div>
    <div><small>{object.signal.secondaryLabel}</small><strong>{object.signal.secondaryValue}</strong></div>
    <span>{object.signal.note}</span>
  </section>;
  const bounded = Math.max(0, Math.min(100, object.signal.value));
  const threshold = Math.max(0, Math.min(100, object.signal.threshold));
  return <section className="incident-lens__signal incident-lens__signal--pressure patrol-next__signal" data-incident-lens-resource-geometry aria-label={`${object.signal.label} 当前 ${Math.round(bounded)}%，阈值 ${Math.round(threshold)}%`}>
    <div><small>{object.signal.label}</small><strong>{Math.round(bounded)}%</strong></div>
    <div className="incident-lens__meter" aria-hidden="true"><i style={{ width: `${bounded}%` }} /><b style={{ left: `${threshold}%` }} /></div>
    <span>阈值 {Math.round(threshold)}% · {object.signal.note}</span>
  </section>;
}

function objectFacts(object: IncidentLensObject): IncidentLensFact[] {
  return object.facts.filter((fact) => {
    if (trafficLabels.has(fact.label)) return false;
    if (object.kind === "route" && (fact.label === "默认路径" || fact.label === "网关")) return false;
    return fact.value !== object.title && fact.value !== object.state && !object.summary.includes(fact.value);
  }).slice(0, 2);
}

function evidenceFacts(object: IncidentLensObject): Array<{ label: string; value: string }> {
  const occupiedValues = new Set([object.title, object.state, object.summary]);
  if (object.signal?.kind === "traffic") {
    occupiedValues.add(object.signal.primaryValue);
    occupiedValues.add(object.signal.secondaryValue);
  }
  const candidates = [...object.impact, ...object.evidence, ...object.facts]
    .filter((fact) => !proofLabels.has(fact.label) && !trafficLabels.has(fact.label))
    .filter((fact) => !occupiedValues.has(fact.value) && !object.summary.includes(fact.value))
    .map((fact) => ({ label: fact.label, value: fact.value }));
  candidates.push({ label: "来源", value: sourceLabel(object) });
  if (object.action) {
    candidates.push({ label: "核验范围", value: object.action.note });
    candidates.push({ label: "目标工作区", value: workspaceLabel(object.action.route) });
  }
  return candidates
    .filter((fact, index, rows) => rows.findIndex((candidate) => candidate.label === fact.label) === index)
    .slice(0, 6);
}

function ObjectIdentity({ object }: { object: IncidentLensObject }) {
  const facts = objectFacts(object);
  return <section className="patrol-next__identity" data-incident-lens-route-geometry={object.kind === "route" ? "true" : undefined} data-incident-lens-tone={object.tone} aria-label="当前对象">
    <header><span>{object.category}</span><strong>{object.state}</strong></header>
    <p>{object.summary}</p>
    {facts.length ? <dl>{facts.map((fact) => <div key={fact.label} data-incident-lens-tone={fact.tone}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl> : null}
  </section>;
}

function FleetDistribution({ model }: { model: IncidentLensModel }) {
  const total = firstNumber(model.scopeFacts.find((fact) => fact.label === "WAN 范围")?.value || "");
  const online = firstNumber(model.scopeFacts.find((fact) => fact.label === "运行记录")?.value || "");
  const unknown = firstNumber(model.scopeFacts.find((fact) => fact.label === "待确认")?.value || "");
  const exceptions = total !== null && online !== null && unknown !== null ? Math.max(0, total - online - unknown) : null;
  const onlineShare = total && online !== null ? Math.max(0, Math.min(100, online / total * 100)) : 0;
  const unknownShare = total && unknown !== null ? Math.max(0, Math.min(100, unknown / total * 100)) : 0;
  const summary = model.scopeFacts.map((fact) => `${fact.label} ${fact.value}`).join(" · ");
  return <section className="patrol-next__distribution" data-incident-lens-route-geometry aria-label="WAN 覆盖分布">
    <header>
      <span>WAN 覆盖</span>
      <strong className="patrol-next__fleet-phone-summary" data-incident-lens-fleet-summary="true">{summary}</strong>
      <strong className="patrol-next__fleet-ratio">{online !== null && total !== null ? `${online} / ${total}` : "范围待核实"}</strong>
    </header>
    <div className="patrol-next__distribution-bar" aria-hidden="true"><i style={{ width: `${onlineShare}%` }} /><b style={{ width: `${unknownShare}%` }} /></div>
    <p><span>异常 {exceptions === null ? "待核实" : exceptions}</span><span>待确认 {unknown === null ? "待核实" : unknown}</span></p>
    <dl className="incident-lens__scope-facts patrol-next__scope-facts" data-incident-lens-scope-facts>{model.scopeFacts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
  </section>;
}

function ObjectAction({ object, onOpen }: { object: IncidentLensObject; onOpen?: (id: string) => void }) {
  if (!object.action) return null;
  return <button className="incident-lens__object-action patrol-next__action" type="button" data-incident-lens-action data-incident-lens-action-route={object.action.route} data-incident-lens-action-target={object.action.targetObjectId} onClick={() => onOpen?.(object.id)}>
    <span><small>{object.action.note}</small><strong>{object.action.label}</strong></span>
    <ArrowUpRight size={18} aria-hidden="true" />
  </button>;
}

export function PatrolLens({ model, selectedId, onSelect, onOpen }: { model: IncidentLensModel; selectedId: string; onSelect: (id: string) => void; onOpen?: (id: string) => void }) {
  const route = model.secondaryObjects[0];
  const selectableObjects = [route, ...model.patrolObjects]
    .filter((object): object is IncidentLensObject => Boolean(object))
    .filter((object, index, rows) => rows.findIndex((candidate) => candidate.id === object.id) === index);
  const selected = selectableObjects.find((object) => object.id === selectedId) || route;
  if (!selected) return null;
  const fleet = model.scale === "fleet";
  const fleetScopeSelected = fleet && selected.id === route?.id;
  const selectedEvidence = evidenceFacts(selected);
  const relatedObjects = selectableObjects.filter((object) => object.id !== selected.id).slice(0, 4);

  return <section className={`incident-lens__patrol patrol-next${fleet ? " patrol-next--fleet" : ""}`} data-incident-lens-patrol aria-label="巡检面">
    <section className="incident-lens__patrol-list patrol-next__master" aria-label="巡检对象列表">
      <header className="incident-lens__section-heading patrol-next__master-heading"><span>{fleet ? "范围对象" : "关联对象"}</span><small>切换核验对象</small></header>
      <div className="incident-lens__object-list patrol-next__object-list">
        {selectableObjects.map((object) => <ObjectRow key={object.id} object={object} selected={selected.id === object.id} onSelect={onSelect} />)}
      </div>
    </section>

    <section className="incident-lens__inspector patrol-next__detail" id={incidentLensObjectDomId(selected.id)} tabIndex={-1} data-incident-lens-inspector data-incident-lens-evidence-deck data-incident-lens-expanded-claim={selected.id} data-incident-lens-claim-kind={selected.kind} aria-label="当前检查对象">
      {fleetScopeSelected ? <FleetDistribution model={model} /> : <Signal object={selected} />}
      {!fleetScopeSelected ? <ObjectIdentity object={selected} /> : null}
      <ObjectAction object={selected} onOpen={onOpen} />
      <section className="incident-lens__tablet-support patrol-next__selected-evidence" aria-label="对象证据">
        <header>对象证据</header>
        <dl>{selectedEvidence.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
      </section>
    </section>

    <section className="incident-lens__tablet-crosscheck patrol-next__related" data-incident-lens-tablet-crosscheck aria-label="关联证据">
      <header><strong>关联证据</strong><small>按对象切换核验</small></header>
      <div>{relatedObjects.map((object) => {
        const detail = object.impact.find((fact) => !proofLabels.has(fact.label))
          || object.evidence.find((fact) => !proofLabels.has(fact.label))
          || object.facts.find((fact) => !trafficLabels.has(fact.label));
        return <article key={object.id} data-incident-lens-tone={object.tone}>
          <span><small>{object.category}</small><strong>{object.state}</strong></span>
          {detail ? <p><small>{detail.label}</small><strong>{detail.value}</strong></p> : null}
        </article>;
      })}</div>
    </section>
  </section>;
}
