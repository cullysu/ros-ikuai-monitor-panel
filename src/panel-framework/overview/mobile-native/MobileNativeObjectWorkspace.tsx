import type { KeyboardEvent, RefObject } from "react";
import type { MobileNativeModel, MobileObjectKey } from "./mobileNativeTypes";

export function MobileNativeObjectWorkspace({
  model,
  selected,
  onSelect,
  expanded,
  onExpandedChange,
  onOpenDetail,
  detailButtonRef,
}: {
  model: MobileNativeModel;
  selected: MobileObjectKey;
  onSelect: (key: MobileObjectKey) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onOpenDetail: () => void;
  detailButtonRef: RefObject<HTMLButtonElement>;
}) {
  const active = model.objects.find((item) => item.key === selected) || model.objects[0];
  const moveTabFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % model.objects.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + model.objects.length) % model.objects.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = model.objects.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = model.objects[nextIndex];
    document.getElementById(`mn-tab-${next.key}`)?.focus({ preventScroll: true });
    onSelect(next.key);
  };
  return (
    <section className="mn-object-workspace" aria-label="网络对象工作区" data-mobile-native-object-workspace>
      <div className="mn-object-tabs" role="tablist" aria-label="网络对象">
        {model.objects.map((item, index) => (
          <button
            id={`mn-tab-${item.key}`}
            className={item.key === active.key ? "is-selected" : ""}
            type="button"
            role="tab"
            aria-selected={item.key === active.key}
            aria-controls={`mn-panel-${item.key}`}
            tabIndex={item.key === active.key ? 0 : -1}
            onClick={() => onSelect(item.key)}
            onKeyDown={(event) => moveTabFocus(event, index)}
            key={item.key}
          >
            <span>{item.category}</span><b>{item.label}</b>
          </button>
        ))}
      </div>

      <article
        id={`mn-panel-${active.key}`}
        className={`mn-object-panel is-${active.tone}`}
        role="tabpanel"
        aria-labelledby={`mn-tab-${active.key}`}
        data-mobile-native-object={active.key}
      >
        <header className="mn-object-heading">
          <span><b>{active.title}</b><small>{active.note}</small></span>
          <strong>{active.status}</strong>
        </header>

        {active.relations.length ? (
          <div className="mn-object-relations" aria-label={`${active.label} 关系`}>
            {active.relations.map((relation, index) => (
              <div className={`is-${relation.tone || "trust"}`} key={`${relation.label}-${index}`}>
                <span>{relation.label}</span><b>{relation.value}</b>
              </div>
            ))}
          </div>
        ) : null}

        <details className="mn-object-disclosure" open={expanded}>
          <summary aria-expanded={expanded} onClick={(event) => { event.preventDefault(); onExpandedChange(!expanded); }}>
            <span>{active.disclosureTitle}</span><i aria-hidden="true">⌄</i>
          </summary>
          <div className="mn-object-rows">
            {active.rows.map((row, index) => (
              <div className={`mn-object-row is-${row.tone || "trust"}`} key={row.key || `${row.label}-${index}`}>
                <span>{row.label}</span><span><b>{row.value}</b>{row.note ? <small>{row.note}</small> : null}</span>
              </div>
            ))}
          </div>
        </details>

        <button ref={detailButtonRef} className="mn-detail-entry" type="button" onClick={onOpenDetail} data-mobile-native-open-detail>
          <span><b>{model.actionTitle}</b><small>{model.actionNote}</small></span>
          <i aria-hidden="true">›</i>
        </button>
      </article>
    </section>
  );
}
