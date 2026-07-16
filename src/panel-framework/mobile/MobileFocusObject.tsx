import { ChevronRight, Route } from "lucide-react";
import type { OverviewFocusObject } from "../overview/evidence-model/overviewEvidenceTypes";

export function MobileFocusObject({ object, onOpen }: { object: OverviewFocusObject; onOpen: () => void }) {
  return (
    <section className="mp-focus" data-mobile-focus-object={object.id} aria-labelledby="mp-focus-title">
      <header>
        <div><span className="mp-section-kicker">活动对象</span><h2 id="mp-focus-title">{object.category}</h2></div>
        <Route aria-hidden="true" size={19} />
      </header>
      <div className="mp-focus-identity"><b>{object.name}</b><small>{object.note}</small></div>
      <dl>
        {object.attributes.map((attribute) => (
          <div key={attribute.label}><dt>{attribute.label}</dt><dd>{attribute.value}</dd></div>
        ))}
      </dl>
      <button type="button" data-mobile-destination={object.route} onClick={onOpen}>
        检查路由证据<ChevronRight aria-hidden="true" size={17} />
      </button>
    </section>
  );
}
