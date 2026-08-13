import { ArrowUpRight, ChevronRight, Network, Route, ServerCog, Waypoints } from "lucide-react";
import type { IncidentLensModel, IncidentLensObject } from "./types";
import { incidentLensObjectDomId } from "./useIncidentLensSelectionHistory";

const icons = { wan: Network, interfaces: Waypoints, collection: ServerCog, evidence: ServerCog, resource: ServerCog, route: Route, offline: Network } as const;

function ObjectRow({ object, selected, onSelect }: { object: IncidentLensObject; selected: boolean; onSelect: (id: string) => void }) {
  const Icon = icons[object.kind];
  return <button type="button" className="incident-lens__object-row" data-incident-lens-object={object.kind} data-incident-lens-claim-control data-incident-lens-claim-id={object.id} data-incident-lens-tone={object.tone} aria-pressed={selected} onClick={() => onSelect(object.id)}>
    <Icon size={18} aria-hidden="true" />
    <span><small>{object.category}</small><strong>{object.title}</strong></span>
    <span className="incident-lens__object-state">{object.state}</span>
    <ChevronRight size={18} aria-hidden="true" />
  </button>;
}

function Signal({ object }: { object: IncidentLensObject }) {
  if (!object.signal) return null;
  if (object.signal.kind === "traffic") return <section className="incident-lens__signal incident-lens__signal--traffic" data-incident-lens-traffic-geometry aria-label="当前流量">
    <div><small>{object.signal.primaryLabel}</small><strong>{object.signal.primaryValue}</strong></div>
    <div><small>{object.signal.secondaryLabel}</small><strong>{object.signal.secondaryValue}</strong></div>
    <span>{object.signal.note}</span>
  </section>;
  const bounded = Math.max(0, Math.min(100, object.signal.value));
  const threshold = Math.max(0, Math.min(100, object.signal.threshold));
  return <section className="incident-lens__signal incident-lens__signal--pressure" data-incident-lens-resource-geometry aria-label={`${object.signal.label} 当前 ${Math.round(bounded)}%，阈值 ${Math.round(threshold)}%`}>
    <div><small>{object.signal.label}</small><strong>{Math.round(bounded)}%</strong></div>
    <div className="incident-lens__meter" aria-hidden="true"><i style={{ width: `${bounded}%` }} /><b style={{ left: `${threshold}%` }} /></div>
    <span>阈值 {Math.round(threshold)}% · {object.signal.note}</span>
  </section>;
}

export function PatrolLens({ model, selectedId, onSelect, onOpen }: { model: IncidentLensModel; selectedId: string; onSelect: (id: string) => void; onOpen?: (id: string) => void }) {
  const route = model.secondaryObjects[0];
  const selected = model.patrolObjects.find((object) => object.id === selectedId) || route;
  const supportFacts = selected ? [
    ...selected.impact,
    ...selected.evidence,
    { label: "证据模式", value: model.command.label, tone: model.command.tone },
    { label: "观测时间", value: model.command.time, tone: model.command.tone },
  ]
    .filter((item, index, rows) => !selected.facts.some((fact) => fact.label === item.label) && rows.findIndex((row) => row.label === item.label) === index)
    .slice(0, 3) : [];
  const sourceLabel = selected?.source.startsWith("routes.defaultRoutes[") ? "默认路由记录" : selected?.source;
  const crosscheckObjects = model.patrolObjects.filter((object) => object.id !== selected?.id).slice(0, 4);
  const fleetSummary = model.scopeFacts.length
    ? model.scopeFacts.map((item) => `${item.label} ${item.value}`).join(" · ")
    : "";
  return <section className="incident-lens__patrol" data-incident-lens-patrol aria-label="巡检面">
    {selected ? <section className="incident-lens__inspector" id={incidentLensObjectDomId(selected.id)} tabIndex={-1} data-incident-lens-inspector data-incident-lens-evidence-deck data-incident-lens-expanded-claim={selected.id} data-incident-lens-claim-kind={selected.kind} aria-label="当前检查对象">
      <header><span>{selected.category}</span><h2>{selected.title}</h2><strong>{selected.state}</strong></header>
      <p>{selected.summary}</p>
      <Signal object={selected} />
      <dl>{selected.facts.slice(0, 4).map((item) => <div key={item.label} data-incident-lens-tone={item.tone}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
      <section className="incident-lens__tablet-support" aria-label="支撑证据"><header>支撑证据</header><dl>{supportFacts.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}<div><dt>来源</dt><dd title={selected.source}>{sourceLabel}</dd></div></dl></section>
      {selected.action ? <button className="incident-lens__object-action" type="button" data-incident-lens-action onClick={() => onOpen?.(selected.id)}><span><small>{selected.action.note}</small><strong>{selected.action.label}</strong></span><ArrowUpRight size={18} aria-hidden="true" /></button> : null}
    </section> : null}
    <section className="incident-lens__patrol-list" aria-label="巡检对象列表">
      <header className="incident-lens__section-heading"><span>巡检对象</span><small data-incident-lens-fleet-summary={fleetSummary ? "true" : undefined}>{fleetSummary || "按当前证据排列"}</small></header>
      {model.scopeFacts.length ? <dl className="incident-lens__scope-facts" data-incident-lens-scope-facts>{model.scopeFacts.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl> : null}
      <div className="incident-lens__object-list">
        {model.patrolObjects.map((object) => <ObjectRow key={object.id} object={object} selected={selectedId === object.id} onSelect={onSelect} />)}
      </div>
    </section>
    <section className="incident-lens__tablet-crosscheck" data-incident-lens-tablet-crosscheck aria-label="跨对象核验">
      <header><strong>跨对象核验</strong><small>补充当前对象未覆盖的事实</small></header>
      <div>{crosscheckObjects.map((object) => {
        const detail = object.evidence[0] || object.impact[0] || object.facts[0];
        return <article key={object.id} data-incident-lens-tone={object.tone}>
          <span><small>{object.category}</small><strong>{object.title}</strong></span>
          {detail ? <p><small>{detail.label}</small><strong>{detail.value}</strong></p> : null}
        </article>;
      })}</div>
    </section>
  </section>;
}
