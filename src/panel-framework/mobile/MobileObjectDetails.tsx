import { ChevronRight } from "lucide-react";
import type { PanelRouteId } from "../routes/panelRoutes";
import type { OverviewComparisonObject, OverviewOperationalDecision } from "../overview/evidence-model/overviewEvidenceTypes";

export function MobileObjectList({
  rows,
  onOpen,
  heading,
  taskLandmark,
}: {
  rows: Array<OverviewComparisonObject | OverviewOperationalDecision>;
  onOpen: (route: PanelRouteId, objectId: string | null, focusId: string) => void;
  heading: string;
  taskLandmark?: "comparison";
}) {
  return (
    <section
      className="mp-load"
      data-overview-task-landmark={taskLandmark}
      aria-label={heading}
    >
      <header><h2>{heading}</h2></header>
      <div>
        {rows.map((row) => (
            <button
              type="button"
              id={row.id}
              onClick={() => onOpen(row.route, row.targetObjectId || null, row.id)}
              key={row.id}
            >
              <small aria-hidden="true">{row.category === "WAN" ? "W" : "I"}</small>
              <span><small>{row.category}</small><b>{row.object}</b>{row.state ? <small>{[row.state, row.evidence].filter(Boolean).join(" · ")}</small> : null}</span>
              <ChevronRight aria-hidden="true" size={17} />
            </button>
        ))}
      </div>
    </section>
  );
}
