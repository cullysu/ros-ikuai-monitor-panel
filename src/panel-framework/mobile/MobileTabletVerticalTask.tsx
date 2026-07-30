import { ChevronRight, ListChecks } from "lucide-react";
import { OverviewInvestigationGlyph } from "../overview/components/OverviewInvestigationGlyph";
import { overviewInvestigationHeading } from "../overview/evidence-model/buildOverviewInvestigationActions";
import type {
  OverviewFocusObject,
  OverviewInvestigationAction,
  OverviewPriorityObject,
} from "../overview/evidence-model/overviewEvidenceTypes";
import type { PanelNavigate } from "../routes/panelRoutes";

export function MobileTabletVerticalTask({
  kind,
  actions,
  steady,
  priorityObjects,
  selectedObject,
  focusObject,
  onNavigate,
}: {
  kind: "normal" | "incident";
  actions: OverviewInvestigationAction[];
  steady: boolean;
  priorityObjects: OverviewPriorityObject[];
  selectedObject: OverviewPriorityObject | null;
  focusObject: OverviewFocusObject | null;
  onNavigate: PanelNavigate;
}) {
  const heading = overviewInvestigationHeading(steady, actions);
  const summary = kind === "normal"
    ? focusObject
      ? `已核对 ${focusObject.name}；继续检查出口关系与采集边界。`
      : "当前出口未形成直接证据；先进入检查入口。"
    : priorityObjects.length > 0
      ? `${priorityObjects.length} 个对象需要处理；先选择对象，再查看影响证据。`
      : "未取得受影响对象；不自动推断下一步。";

  return (
    <section
      className="mp-actions mp-tablet-vertical-task"
      data-overview-task-landmark="investigation"
      data-tablet-vertical-space-task={kind}
      data-tablet-space-purpose={kind === "normal" ? "patrol-sequence" : "impact-follow-up"}
      data-tablet-space-new-decision="true"
      aria-labelledby="mp-tablet-task-title"
    >
      <header>
        <div>
          <span className="mp-section-kicker"><ListChecks aria-hidden="true" size={15} />{heading[0]}</span>
          <h2 id="mp-tablet-task-title">{heading[1]}</h2>
          <p className="mp-tablet-task-summary">{summary}</p>
        </div>
      </header>
      <div className="mp-action-list">
        {actions.map((action, index) => {
          const navigation = action.navigation || {};
          const contextLabel = action.scope === "object" ? "对象级调查" : "集合工作区";
          return (
            <button
              type="button"
              id={action.route}
              data-mobile-action-scope={action.scope}
              data-mobile-action-priority={action.priority}
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
              <span className="mp-tablet-task-index" aria-hidden="true">{index + 1}</span>
              <span className="mp-action-icon"><OverviewInvestigationGlyph icon={action.icon} size={18} /></span>
              <span><b>{action.label}</b><small>{action.note}</small></span>
              <ChevronRight aria-hidden="true" size={17} />
            </button>
          );
        })}
      </div>
      {kind === "incident" && selectedObject ? (
        <small className="mp-tablet-task-selection">当前对象：{selectedObject.name} · {selectedObject.sourcePath}</small>
      ) : null}
    </section>
  );
}
