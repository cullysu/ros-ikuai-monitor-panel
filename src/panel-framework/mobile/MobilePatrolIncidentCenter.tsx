import { ChevronDown } from "lucide-react";
import type { PanelRouteId } from "../routes/panelRoutes";
import type { OverviewEvidenceModel } from "../overview/evidence-model/overviewEvidenceTypes";
import { IncidentRow } from "./MobileIncidentWorkspace";

export interface MobilePatrolIncidentCenterProps {
  model: OverviewEvidenceModel;
  tablet: boolean;
  visiblePriorityObjects: OverviewEvidenceModel["priorityObjectsAll"];
  selectedIncidentId: string;
  showAllIncidents: boolean;
  onSelectIncident: (objectId: string) => void;
  onToggleAll: () => void;
  onOpen: (route: PanelRouteId, targetObjectId: string | null) => void;
}

export function MobilePatrolIncidentCenter({
  model,
  tablet,
  visiblePriorityObjects,
  selectedIncidentId,
  showAllIncidents,
  onSelectIncident,
  onToggleAll,
  onOpen,
}: MobilePatrolIncidentCenterProps) {
  if (!model.priorityObjects.length) return null;

  const remainingPriorityObjects = Math.max(0, model.priorityTotal - visiblePriorityObjects.length);
  return (
    <section className="mp-incident" data-mobile-incident-center data-mobile-incident-task-role="primary-risk" data-mobile-visual-level="primary" data-overview-task-landmark="risk-objects" aria-labelledby="mp-incident-title">
      <header>
        <div><span className="mp-section-kicker">{model.priorityLabel}</span><h2 id="mp-incident-title">{model.priorityTitle}</h2></div>
        <b data-mobile-incident-count>{model.priorityTotal}</b>
      </header>
      <div className="mp-incident-list">
        {visiblePriorityObjects.map((object) => (
          <IncidentRow
            object={object}
            selected={tablet ? selectedIncidentId === object.id : undefined}
            actionLabel={model.risk === "resource" && !tablet ? "核对资源" : undefined}
            onOpen={() => {
              if (tablet) {
                onSelectIncident(object.id);
                return;
              }
              onOpen(object.route, object.targetObjectId || null);
            }}
            key={object.id}
          />
        ))}
      </div>
      {!tablet && model.priorityObjectsAll.length > model.priorityObjects.length ? (
        <button
          className={`mp-incident-more ${showAllIncidents ? "is-expanded" : ""}`}
          type="button"
          aria-expanded={showAllIncidents}
          onClick={onToggleAll}
          data-mobile-incident-expand
        >
          {showAllIncidents
            ? "收起到最高优先级"
            : `展开其余 ${remainingPriorityObjects} 个${model.risk === "interface-review" ? "待确认对象" : "事故对象"}`}
          <ChevronDown aria-hidden="true" size={17} />
        </button>
      ) : null}
    </section>
  );
}
