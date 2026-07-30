import { ChevronRight } from "lucide-react";
import { OverviewInvestigationGlyph } from "../overview/components/OverviewInvestigationGlyph";
import type { OverviewInvestigationAction } from "../overview/evidence-model/overviewEvidenceTypes";
import type { PanelNavigate } from "../routes/panelRoutes";

export function MobilePhoneNextStep({
  action,
  onNavigate,
}: {
  action: OverviewInvestigationAction;
  onNavigate: PanelNavigate;
}) {
  const navigation = action.navigation || {};
  const scopeLabel = action.scope === "object" ? "对象级巡检" : "快照级巡检";

  return (
    <section
      className="mp-phone-next-step"
      data-mobile-phone-next-step
      data-overview-task-landmark="investigation-primary"
      data-overview-visual-level="next"
      aria-labelledby="mp-phone-next-step-title"
    >
      <div className="mp-phone-next-step-copy">
        <span className="mp-section-kicker">下一步 · {scopeLabel} · {action.note}</span>
        <b id="mp-phone-next-step-title">{action.label}</b>
      </div>
      <button
        type="button"
        id={action.route}
        className="mp-phone-next-step-button"
        data-mobile-action-scope={action.scope}
        data-mobile-action-priority={action.priority}
        data-mobile-action-order="1"
        data-mobile-action-route={action.route}
        data-mobile-action-object-id={navigation.objectId || undefined}
        data-mobile-action-evidence-at={navigation.evidenceAt || undefined}
        data-mobile-action-from={navigation.returnRoute || undefined}
        aria-label={`${scopeLabel}：${action.label}，${action.note}`}
        onClick={() => onNavigate(action.route, { ...navigation, focusId: action.route })}
      >
        <OverviewInvestigationGlyph icon={action.icon} size={18} />
        <ChevronRight aria-hidden="true" size={18} />
      </button>
    </section>
  );
}
