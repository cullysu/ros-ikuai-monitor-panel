import type { MobileNativeModel } from "./mobileNativeModel";

export function MobileNativeSheet({ model, onOpenDetail }: { model: MobileNativeModel; onOpenDetail: () => void }) {
  return (
    <section className="mn-sheet" aria-labelledby="mn-sheet-title" data-mobile-native-sheet={model.incident ? "expanded" : "partial"}>
      <div className="mn-grabber" aria-hidden="true" />
      <div className="mn-sheet-heading">
        <span>{model.kicker}</span>
        <time>{model.timestamp}</time>
      </div>
      <h1 id="mn-sheet-title">{model.title}</h1>
      <p>{model.summary}</p>

      <div className="mn-facts" aria-label="关键指标">
        {model.facts.map((fact) => (
          <div className={`mn-fact is-${fact.tone || "trust"}`} key={fact.label}>
            <span>{fact.label}</span>
            <b>{fact.value}</b>
          </div>
        ))}
      </div>

      <div className="mn-rows">
        {model.rows.map((row) => (
          <div className="mn-row" key={row.label}>
            <span>{row.label}</span>
            <span><b>{row.value}</b>{row.note ? <small>{row.note}</small> : null}</span>
          </div>
        ))}
      </div>

      <button className="mn-detail-entry" type="button" onClick={onOpenDetail} data-mobile-native-open-detail>
        <span><b>{model.actionTitle}</b><small>{model.actionNote}</small></span>
        <i aria-hidden="true">›</i>
      </button>
    </section>
  );
}
