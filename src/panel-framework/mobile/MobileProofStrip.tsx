import type { OverviewEvidenceFact } from "../overview/evidence-model/overviewEvidenceTypes";

interface MobileProofStripProps {
  facts: [OverviewEvidenceFact, OverviewEvidenceFact, OverviewEvidenceFact];
  factAttribute?: "core" | "relation";
}

export function MobileProofStrip({ facts, factAttribute = "core" }: MobileProofStripProps) {
  return (
    <section
      className="mp-proof"
      aria-label="判断依据"
      data-mobile-visual-layer="proof"
      data-mobile-core-facts
      data-overview-task-landmark="scenario-focus"
      data-overview-task-focus="facts"
    >
      {facts.map((item) => (
        <div
          className={`is-${item.tone}`}
          data-mobile-core-fact={factAttribute === "core" ? item.key : undefined}
          data-mobile-relation-fact={factAttribute === "relation" ? item.key : undefined}
          key={item.key}
        >
          <small>{item.label}</small>
          <b>{item.value}</b>
          {item.note ? <em>{item.note}</em> : null}
        </div>
      ))}
    </section>
  );
}
