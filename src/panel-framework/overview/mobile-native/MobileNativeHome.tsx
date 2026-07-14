import type { MobileNativeModel } from "./mobileNativeTypes";

export function MobileNativeHome({ model, onOpenDetail }: { model: MobileNativeModel; onOpenDetail: () => void }) {
  return (
    <section className="mn-home" aria-labelledby="mn-home-title" data-mobile-native-home>
      <div
        className={`mn-evidence-banner is-${model.evidenceTone}`}
        data-mobile-native-evidence-mode={model.evidenceMode}
      >
        <span>
          <b>{model.evidenceLabel}</b>
          <small>{model.evidenceNote}</small>
        </span>
        <time>{model.timestamp}</time>
      </div>

      <div className="mn-home-heading">
        <span>{model.kicker}</span>
        <h1 id="mn-home-title">{model.title}</h1>
        <p>{model.summary}</p>
      </div>

      <div className="mn-facts" aria-label="关键事实">
        {model.facts.map((fact) => (
          <div className={`mn-fact is-${fact.tone || "trust"}`} key={fact.label}>
            <span>{fact.label}</span>
            <b>{fact.value}</b>
          </div>
        ))}
      </div>

      {model.showRates ? (
        <div className="mn-rates" data-mobile-native-rates="current" aria-label="当前速率">
          <span><small>当前下载</small><b>{model.downRate}</b></span>
          <span><small>当前上传</small><b>{model.upRate}</b></span>
        </div>
      ) : null}

      <div className="mn-rows" aria-label="判断依据">
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
