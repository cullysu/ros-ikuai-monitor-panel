import { ArrowUpRight, ChevronRight, ShieldAlert } from "lucide-react";
import type { IncidentLensModel, IncidentLensObject } from "./types";
import { incidentLensObjectDomId } from "./useIncidentLensSelectionHistory";

function LensFacts({ label, facts, marker }: { label: string; facts: IncidentLensObject["facts"]; marker: string }) {
  return <section className="incident-lens__lens" data-incident-lens-lens={marker} data-incident-lens-impact={marker === "impact" ? "true" : undefined} data-incident-lens-evidence={marker === "evidence" ? "true" : undefined} aria-label={label}>
    <header>{label}</header>
    <dl>{facts.map((item) => <div key={item.label} data-incident-lens-tone={item.tone}><dt>{item.label}</dt><dd>{item.value}</dd>{item.note ? <small>{item.note}</small> : null}</div>)}</dl>
  </section>;
}

function sourceLabel(source: string): string {
  if (source.includes("overview.history.resourceSamples")) return "资源历史样本";
  if (source.startsWith("routes.defaultRoutes")) return "默认路由记录";
  if (source.startsWith("meta.")) return "采集元数据";
  if (source.startsWith("interfaces")) return "接口对象记录";
  if (source === "wan") return "WAN 运行记录";
  return source;
}

export function IncidentWorkspace({ model, selectedId, onSelect, onOpen }: { model: IncidentLensModel; selectedId: string; onSelect: (id: string) => void; onOpen?: (id: string) => void }) {
  const incident = model.incident;
  if (!incident) return null;
  const activeObject = [incident, ...model.secondaryObjects].find((object) => object.id === selectedId) || incident;
  const basisFacts = [
    ...activeObject.facts,
    { label: "来源", value: sourceLabel(activeObject.source), tone: activeObject.tone },
  ].filter((item, index, rows) => rows.findIndex((row) => row.label === item.label) === index).slice(0, 4);
  const auditFacts = model.secondaryObjects.slice(0, 3).map((object) => {
      const detail = object.facts[0] || object.evidence[0] || object.impact[0];
      return { label: `${object.category} · ${detail?.label || "状态"}`, value: detail?.value || object.state, tone: detail?.tone || object.tone };
    });
  const identityState = activeObject.signal?.kind === "pressure" ? "超阈值" : activeObject.state;
  return <section className="incident-lens__incident" data-incident-lens-incident data-incident-lens-risk={model.risk} aria-label="事故检查面">
    <section className="incident-lens__impact-workspace" id={incidentLensObjectDomId(activeObject.id)} tabIndex={-1} data-incident-lens-workspace data-incident-lens-expanded-claim={activeObject.id} data-incident-lens-claim-kind={activeObject.kind} aria-label="当前影响对象">
      <header className="incident-lens__risk-identity" data-incident-lens-risk-identity data-incident-lens-primary={activeObject.id === incident.id ? "true" : "false"}>
        <ShieldAlert size={20} aria-hidden="true" />
        <span><small>{activeObject.category}</small><h2>{activeObject.title}</h2></span>
        <strong data-incident-lens-tone={activeObject.tone}>{identityState}</strong>
      </header>
      <p className="incident-lens__risk-summary">{activeObject.summary}</p>
      {activeObject.signal?.kind === "pressure" ? <div className="incident-lens__signal incident-lens__signal--pressure" data-incident-lens-resource-geometry aria-label={`${activeObject.signal.label} 当前 ${Math.round(activeObject.signal.value)}%，阈值 ${Math.round(activeObject.signal.threshold)}%`}><div><small>{activeObject.signal.label}</small><strong>{Math.round(activeObject.signal.value)}%</strong></div><div className="incident-lens__meter" aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, activeObject.signal.value))}%` }} /><b style={{ left: `${Math.max(0, Math.min(100, activeObject.signal.threshold))}%` }} /></div><span>阈值 {Math.round(activeObject.signal.threshold)}% · {activeObject.signal.note}</span></div> : null}
      <LensFacts label="影响" facts={activeObject.impact} marker="impact" />
      <section className="incident-lens__tablet-basis" data-incident-lens-tablet-basis aria-label="判定依据"><header>判定依据</header><dl>{basisFacts.map((item) => <div key={item.label} data-incident-lens-tone={item.tone}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></section>
    </section>
    <section className="incident-lens__evidence-workspace" data-incident-lens-evidence-deck data-incident-lens-investigation aria-label="证据与下一步">
      <LensFacts label="证据" facts={activeObject.evidence} marker="evidence" />
      <section className="incident-lens__next-actions" aria-label="优先检查">
        <header>下一步</header>
        <button type="button" data-incident-lens-action data-incident-lens-action-route={activeObject.action?.route} data-incident-lens-action-target={activeObject.action?.targetObjectId} onClick={() => onOpen?.(activeObject.id)}><span><small>{activeObject.action?.note}</small><strong>{activeObject.action?.label || "查看对象证据"}</strong></span><ArrowUpRight size={18} aria-hidden="true" /></button>
        {model.secondaryObjects.slice(0, 3).map((object) => <button type="button" key={object.id} data-incident-lens-claim-control data-incident-lens-claim-id={object.id} data-incident-lens-secondary={object.kind} aria-pressed={selectedId === object.id} onClick={() => onSelect(object.id)}><span><small>{object.category}</small><strong><span className="incident-lens__followup-title">{object.title}</span><i className="incident-lens__followup-state"> · {object.state}</i></strong></span><ChevronRight size={18} aria-hidden="true" /></button>)}
      </section>
    </section>
    <section className="incident-lens__tablet-audit" data-incident-lens-tablet-audit aria-label="横向核验">
      <header><strong>横向核验</strong><small>风险依据与相邻对象边界</small></header>
      <dl>{auditFacts.map((item) => <div key={item.label} data-incident-lens-tone={item.tone}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
    </section>
  </section>;
}
