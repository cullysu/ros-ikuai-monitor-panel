import { ChevronRight, ScanSearch } from "lucide-react";
import type { OverviewPriorityObject } from "../overview/evidence-model/overviewEvidenceTypes";

export function IncidentRow({
  object,
  onOpen,
  selected,
}: {
  object: OverviewPriorityObject;
  onOpen: () => void;
  selected?: boolean;
}) {
  return (
    <button
      className={`mp-incident-row is-${object.tone} ${selected ? "is-selected" : ""}`}
      type="button"
      aria-pressed={selected === undefined ? undefined : selected}
      onClick={onOpen}
      aria-label={`${object.category} ${object.name}，${object.state}。${object.reason}`}
      data-mobile-incident-object={object.id}
      data-mobile-incident-route={object.route}
    >
      <span className="mp-incident-mark" aria-hidden="true" />
      <span className="mp-incident-copy">
        <span><small>{object.category}</small><b>{object.name}</b></span>
        <em>{object.state}</em>
        <p>{object.reason}</p>
      </span>
      <ChevronRight aria-hidden="true" size={18} />
    </button>
  );
}

export function IncidentInspector({ object, onOpen }: { object: OverviewPriorityObject; onOpen: () => void }) {
  return (
    <section className="mp-inspector" data-mobile-incident-inspector={object.id} aria-labelledby="mp-inspector-title">
      <header>
        <div><span className="mp-section-kicker">所选对象</span><h2 id="mp-inspector-title">{object.name}</h2></div>
        <ScanSearch aria-hidden="true" size={19} />
      </header>
      <p><b>{object.state}</b><span>{object.reason}</span></p>
      <dl>
        {object.attributes.map((attribute) => (
          <div key={attribute.label}><dt>{attribute.label}</dt><dd>{attribute.value}</dd></div>
        ))}
      </dl>
      <div className="mp-inspector-source"><span>采样来源</span><code>{object.sourcePath}</code></div>
      <button type="button" data-mobile-destination={object.route} onClick={onOpen}>
        进入{object.category}工作区<ChevronRight aria-hidden="true" size={17} />
      </button>
    </section>
  );
}
