import type { RefObject } from "react";
import { MobileNativeIcon } from "./MobileNativeIcon";
import type { MobileNativeFocus } from "./mobileNativeTypes";

export function MobileNativeInspectionPanel({
  focus,
  expanded,
  onExpandedChange,
  onOpenDetail,
  detailButtonRef,
}: {
  focus: MobileNativeFocus;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onOpenDetail: () => void;
  detailButtonRef: RefObject<HTMLButtonElement>;
}) {
  const inspection = focus.inspection;
  return (
    <section className={`mn-inspection is-${inspection.tone}`} aria-labelledby="mn-inspection-title" data-mobile-native-inspection={inspection.key}>
      <header className="mn-inspection-heading">
        <span className="mn-object-symbol" aria-hidden="true"><MobileNativeIcon name={inspection.key} size={20} /></span>
        <span>
          <small>{inspection.label} · {inspection.status}</small>
          <b id="mn-inspection-title">{inspection.title}</b>
          <em>{inspection.note}</em>
        </span>
        <button
          ref={detailButtonRef}
          className="mn-detail-entry"
          type="button"
          onClick={onOpenDetail}
          aria-label={inspection.actionTitle}
          data-mobile-native-open-detail
        >
          <span>证据</span>
          <MobileNativeIcon name="forward" size={18} />
        </button>
      </header>

      <dl className="mn-inspection-relations" aria-label={`${inspection.label} 新增关系证据`}>
        {inspection.relations.map((relation, index) => (
          <div className={`is-${relation.tone || "trust"}`} key={relation.key || `${relation.label}-${index}`}>
            <dt>{relation.label}</dt>
            <dd>{relation.value}</dd>
          </div>
        ))}
      </dl>

      {inspection.rows.length ? (
        <details className="mn-inspection-disclosure" open={expanded}>
          <summary aria-expanded={expanded} onClick={(event) => { event.preventDefault(); onExpandedChange(!expanded); }}>
            <span>{inspection.disclosureTitle}</span>
            <MobileNativeIcon name="expand" size={18} />
          </summary>
          <div className="mn-inspection-rows">
            {inspection.rows.map((row, index) => (
              <div className={`mn-inspection-row is-${row.tone || "trust"}`} key={row.key || `${row.label}-${index}`}>
                <span>{row.label}</span>
                <span><b>{row.value}</b>{row.note ? <small>{row.note}</small> : null}</span>
              </div>
            ))}
          </div>
        </details>
      ) : null}

    </section>
  );
}
