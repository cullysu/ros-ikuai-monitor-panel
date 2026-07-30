import { ChevronRight, Search } from "lucide-react";
import type { OverviewPriorityObject } from "../overview/evidence-model/overviewEvidenceTypes";
import { novelIncidentAttributes } from "./mobileIncidentEvidence";

export function IncidentRow({
  object,
  onOpen,
  selected,
  actionLabel,
}: {
  object: OverviewPriorityObject;
  onOpen: () => void;
  selected?: boolean;
  actionLabel?: string;
}) {
  return (
    <button
      className={`mp-incident-row is-${object.tone} ${selected ? "is-selected" : ""}`}
      type="button"
      aria-current={selected ? "true" : undefined}
      onClick={onOpen}
      aria-label={`${object.category} ${object.name}，${object.state}。${object.reason}`}
      data-mobile-incident-object={object.id}
      data-mobile-incident-route={object.route}
      data-mobile-resource-action={actionLabel ? "true" : undefined}
      data-overview-task-risk-object={object.id}
    >
      <span className="mp-incident-mark" aria-hidden="true" />
      <span className="mp-incident-copy">
        <span><small>{object.category}</small><b>{object.name}</b></span>
        <em>{object.state}</em>
        <p>{object.reason}</p>
      </span>
      <span className="mp-window">
        {actionLabel ? <span>{actionLabel}</span> : null}
        <ChevronRight aria-hidden="true" size={18} />
      </span>
    </button>
  );
}

export function IncidentInspector({
  object,
  onOpen,
  actionLabel,
}: {
  object: OverviewPriorityObject;
  onOpen: () => void;
  actionLabel?: string;
}) {
  const isResource = object.category === "系统资源";
  const novelAttributes = novelIncidentAttributes(object);
  const novelEvidenceCount = novelAttributes.length + (object.sourcePath ? 1 : 0);
  return (
    <section className="mp-inspector" data-mobile-incident-inspector={object.id} data-mobile-incident-detail={object.id} data-mobile-detail-novel-evidence={novelEvidenceCount} data-overview-task-landmark="selected-inspector" data-overview-task-inspector={object.id} data-resource-layer={isResource ? "object" : undefined} data-resource-layer-question={isResource ? "breach-context" : undefined} data-resource-object-evidence={isResource ? "novel" : undefined} aria-labelledby="mp-inspector-title">
      <header>
        <div><span className="mp-section-kicker">{isResource ? "所选对象 · 越阈证据" : "所选对象"}</span><h2 id="mp-inspector-title">{object.name}</h2></div>
        <Search aria-hidden="true" size={19} />
      </header>
      <p>
        <b>{object.state}</b>
        {isResource ? <span data-resource-layer-boundary>对象层只核对当前指标与来源；持续性见趋势证据。</span> : null}
      </p>
      <dl data-mobile-detail-novel-facts data-resource-evidence-role={isResource ? "object-facts" : undefined}>
        {novelAttributes.map((attribute) => (
          <div key={attribute.label}><dt>{attribute.label}</dt><dd>{attribute.value}</dd></div>
        ))}
      </dl>
      <div className="mp-inspector-source" data-mobile-detail-source-path data-resource-evidence-role={isResource ? "source" : undefined}><span>采样来源</span><code>{object.sourcePath}</code></div>
      <button
        type="button"
        data-mobile-destination={object.route}
        data-mobile-resource-action={actionLabel ? "true" : undefined}
        onClick={onOpen}
      >
        {actionLabel || `进入${object.category}工作区`}<ChevronRight aria-hidden="true" size={17} />
      </button>
    </section>
  );
}
