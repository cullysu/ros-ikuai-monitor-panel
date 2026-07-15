import type { MobileNativeModel } from "./mobileNativeTypes";
import { MobileNativeSignal } from "./MobileNativeSignal";

export function MobileNativePatrolBrief({ model }: { model: MobileNativeModel }) {
  return (
    <section className="mn-brief" aria-labelledby="mn-brief-title" data-mobile-native-brief>
      <div className={`mn-evidence-boundary is-${model.evidenceTone}`} data-mobile-native-evidence-mode={model.evidenceMode}>
        <span><b>{model.evidenceLabel}</b><small>{model.evidenceNote}</small></span>
        <time>{model.evidenceTime}</time>
      </div>

      <div className="mn-verdict">
        <span>{model.kicker}</span>
        <h1 id="mn-brief-title">{model.title}</h1>
        <p>{model.summary}</p>
      </div>

      <div className="mn-proof-facts" aria-label="结论依据">
        {model.facts.map((fact, index) => (
          <div className={`mn-proof-fact is-${fact.tone || "trust"}`} key={`${fact.label}-${index}`}>
            <span>{fact.label}</span><b>{fact.value}</b>{fact.note ? <small>{fact.note}</small> : null}
          </div>
        ))}
      </div>

      <MobileNativeSignal signal={model.signal} />

      <section className="mn-decision-section" aria-labelledby="mn-decision-title">
        <header>
          <b id="mn-decision-title">{model.incident ? "优先处理" : "当前判断依据"}</b>
          <span>{model.incident ? `${model.risks.length} 个风险` : "没有阻断项"}</span>
        </header>
        <div className="mn-decision-list">
          {model.decisions.map((decision) => (
            <div className={`mn-decision is-${decision.tone}`} key={decision.key}>
              <span className="mn-decision-label">{decision.label}</span>
              <span><b>{decision.title}</b><small>{decision.note}</small></span>
              <i aria-hidden="true" />
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
