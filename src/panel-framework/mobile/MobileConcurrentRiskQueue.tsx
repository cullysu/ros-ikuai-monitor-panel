import { ChevronRight } from "lucide-react";
import type { PanelNavigate } from "../routes/panelRoutes";
import { overviewRiskTaskNavigation } from "../overview/evidence-model/buildOverviewRiskQueue";
import type { OverviewRiskTask } from "../overview/evidence-model/overviewEvidenceTypes";

export function MobileConcurrentRiskQueue({
  tasks,
  evidenceAt,
  onNavigate,
}: {
  tasks: OverviewRiskTask[];
  evidenceAt: string | null;
  onNavigate: PanelNavigate;
}) {
  if (!tasks.length) return null;
  const single = tasks.length === 1;
  return (
    <section
      className={`mp-risk-queue mp-incident${single ? " is-single" : ""}`}
      aria-labelledby="mp-risk-queue-title"
      data-mobile-secondary-risks={tasks.length}
      data-mobile-secondary-risk-density={single ? "compact" : "stacked"}
      data-mobile-incident-task-role="secondary-risk"
      data-overview-visual-level="context"
      data-overview-task-landmark="secondary-risks"
    >
      <header>
        <div><span className="mp-section-kicker">{single ? "同时发生" : "并发异常"}</span><h2 id="mp-risk-queue-title">{single ? "需要留意" : "同时需要核对"}</h2></div>
        <b>{tasks.length}</b>
      </header>
      <div className="mp-incident-list">
        {tasks.map((task) => (
          <button
            type="button"
            className={`mp-incident-row is-${task.tone}`}
            data-mobile-secondary-risk={task.risk}
            data-mobile-destination={task.route}
            aria-label={`${task.label}，${task.value}。${task.note}`}
            onClick={() => onNavigate(task.route, overviewRiskTaskNavigation(task, evidenceAt))}
            key={task.risk}
          >
            <span className="mp-incident-mark" aria-hidden="true" />
            <span className="mp-incident-copy">
              <span><small>{task.label}</small><b>{task.value}</b></span>
              <p>{task.note}</p>
            </span>
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        ))}
      </div>
    </section>
  );
}
