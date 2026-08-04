import { ChevronRight } from "lucide-react";
import { OverviewInvestigationGlyph } from "../overview/components/OverviewInvestigationGlyph";
import { overviewInvestigationHeading } from "../overview/evidence-model/buildOverviewInvestigationActions";
import type { OverviewInvestigationAction } from "../overview/evidence-model/overviewEvidenceTypes";
import type { PanelNavigate } from "../routes/panelRoutes";

export function MobilePatrolActions({
  actions,
  steady,
  onNavigate,
  phoneIncident = false,
}: {
  actions: OverviewInvestigationAction[];
  steady: boolean;
  onNavigate: PanelNavigate;
  phoneIncident?: boolean;
}) {
  const heading = overviewInvestigationHeading(steady, actions);
  const indexedActions = actions.map((action, index) => ({ action, index }));
  const renderActionList = (items: typeof indexedActions) => (
    <div className="mp-action-list mp-compact-action-list">
      {items.map(({ action, index }) => {
        const navigation = action.navigation || {};
        const contextLabel = action.scope === "object" ? "对象级调查" : "集合工作区";
        const compactCopy = action.priority === "secondary";
        const displayLabel = compactCopy ? action.compactLabel || action.label : action.label;
        const displayNote = compactCopy ? action.compactNote || action.note : action.note;
        return (
          <button
            type="button"
            id={action.route}
            data-mobile-action-scope={action.scope}
            data-mobile-action-priority={action.priority}
            data-mobile-primary-action-visual={action.priority === "primary" ? "accent" : undefined}
            data-mobile-incident-primary-action={action.priority === "primary" ? "true" : undefined}
            data-mobile-action-order={index + 1}
            data-overview-task-landmark={action.priority === "primary" ? "investigation-primary" : "investigation-secondary"}
            data-overview-visual-level={action.priority === "primary" ? "next" : "context"}
            data-mobile-action-object-id={navigation.objectId || undefined}
            data-mobile-action-evidence-at={navigation.evidenceAt || undefined}
            data-mobile-action-from={navigation.returnRoute || undefined}
            aria-label={`${contextLabel}：${action.label}。${action.note}`}
            onClick={() => onNavigate(action.route, {
              ...navigation,
              focusId: action.route,
            })}
            key={action.route}
          >
            <span className="mp-action-order" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <span className="mp-action-icon"><OverviewInvestigationGlyph icon={action.icon} size={18} /></span>
            <span><b>{displayLabel}</b><small>{displayNote}</small></span>
            <ChevronRight aria-hidden="true" size={17} />
          </button>
        );
      })}
    </div>
  );

  const header = (
    <header>
      <div>
        <span className="mp-section-kicker">{heading[0]}</span>
        <h2 id="mp-actions-title">{heading[1]}</h2>
      </div>
    </header>
  );

  if (phoneIncident) {
    return (
      <>
        <section className="mp-actions" data-mobile-incident-task-role="follow-up" data-mobile-action-rhythm="primary-plus-context" data-overview-task-landmark="investigation" data-overview-visual-level="next" aria-labelledby="mp-actions-title">
          {header}
          {renderActionList(indexedActions.filter(({ action }) => action.priority === "primary"))}
        </section>
        <div className="mp-action-context" data-mobile-incident-follow-up-context="secondary" data-overview-visual-level="context">
          {renderActionList(indexedActions.filter(({ action }) => action.priority !== "primary"))}
        </div>
      </>
    );
  }

  return (
    <section className="mp-actions" data-mobile-incident-task-role="follow-up" data-mobile-action-rhythm="primary-plus-context" data-overview-task-landmark="investigation" data-overview-visual-level="context" aria-labelledby="mp-actions-title">
      {header}
      {renderActionList(indexedActions)}
    </section>
  );
}
