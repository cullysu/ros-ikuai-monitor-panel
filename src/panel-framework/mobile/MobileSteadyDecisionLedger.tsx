import type { OverviewOperationalDecision } from "../overview/evidence-model/overviewEvidenceTypes";
import type { PanelRouteId } from "../routes/panelRoutes";
import { ChevronRight } from "lucide-react";

export function MobileSteadyDecisionLedger({ rows, onOpen }: {
  rows: OverviewOperationalDecision[];
  onOpen: (route: PanelRouteId, objectId: string | null, focusId: string) => void;
}) {
  return (
    <div className="mp-steady-decisions">
      <section className="mp-decision-ledger" data-mobile-visual-layer="decision" data-overview-task-landmark="decision-ledger" aria-labelledby="mp-decision-ledger-title">
        <header>
          <div>
            <h2 id="mp-decision-ledger-title">运行判断</h2>
          </div>
          <span className="mp-decision-ledger-count" data-mobile-decision-count>{rows.length} 项</span>
        </header>
        <div className="mp-decision-ledger-rows">
          {rows.map((row, index) => (
            <button
              type="button"
              className={`mp-decision-ledger-row is-${row.tone}`}
              data-mobile-decision-tone={row.tone}
              id={row.id}
              onClick={() => onOpen(row.route, row.targetObjectId || null, row.id)}
              key={row.id}
            >
              <span className={`mp-decision-ledger-mark is-${row.tone}`} aria-hidden="true" />
              <span className="mp-decision-ledger-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span className="mp-decision-ledger-copy">
                <small>{row.category}</small>
                <b>{row.object}</b>
                <span>{[row.state, row.evidence].filter(Boolean).join(" · ")}</span>
              </span>
              <ChevronRight aria-hidden="true" size={17} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
