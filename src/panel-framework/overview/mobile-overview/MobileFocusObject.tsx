import { ChevronRight, Route } from "lucide-react";
import type { OverviewFocusObject } from "../evidence-model/overviewEvidenceTypes";

export function MobileFocusObject({ object, onOpen }: { object: OverviewFocusObject; onOpen: () => void }) {
  return (
    <button
      className={`mo-focus-object is-${object.tone}`}
      type="button"
      onClick={onOpen}
      aria-label={`${object.category} ${object.name}，${object.note}，查看路由证据`}
      data-mobile-focus-object={object.id}
      data-mobile-focus-route={object.route}
    >
      <span className="mo-focus-heading">
        <span className="mo-focus-icon"><Route aria-hidden="true" size={20} /></span>
        <span><small>{object.category}</small><b>{object.name}</b><em>{object.note}</em></span>
        <span className="mo-focus-open"><span className="mo-focus-open-label">证据</span><ChevronRight aria-hidden="true" size={18} /></span>
      </span>
      <span className="mo-focus-attributes" aria-hidden="true">
        {object.attributes.map((attribute) => (
          <span key={attribute.label}><small>{attribute.label}</small><b>{attribute.value}</b></span>
        ))}
      </span>
    </button>
  );
}
