import { ChevronRight } from "lucide-react";
import type { ReactElement } from "react";
import type { PanelNavigate } from "../../routes/panelRoutes";
import { overviewRiskTaskNavigation } from "../evidence-model/buildOverviewRiskQueue";
import type { OverviewEvidenceModel } from "../evidence-model/overviewEvidenceTypes";
import { DesktopResourceEvidence } from "./DesktopResourceEvidence";
import { DesktopIncidentWorkspace, DesktopScenarioFocus } from "./DesktopOverviewTask";

export function DesktopIncidentDocket({
  model,
  onNavigate,
  investigationActions,
}: {
  model: OverviewEvidenceModel;
  onNavigate: PanelNavigate;
  investigationActions: ReactElement;
}) {
  const primarySummary = model.scenarioFocus ? (
    <DesktopScenarioFocus focus={model.scenarioFocus} onNavigate={onNavigate} />
  ) : model.risk === "resource" && model.resource ? (
    <DesktopResourceEvidence resource={model.resource} />
  ) : (
    null
  );
  const secondaryRisks = model.riskQueue.length > 1 ? (
    <section className="do-task-focus" data-desktop-incident-priority="secondary-queue">
      <header><h2>并发异常 · 需要核对</h2><b>{model.riskQueue.length - 1} 面</b></header>
      <div className="do-task-focus-grid">
        {model.riskQueue.slice(1).map((task) => (
          <button
            type="button"
            className={`is-${task.tone}`}
            onClick={() => onNavigate(task.route, overviewRiskTaskNavigation(task, model.evidenceAt))}
            key={task.risk}
          >
            <span><small>{task.label}</small><b>{task.value}</b><em>{task.note}</em></span>
            <ChevronRight aria-hidden="true" size={17} />
          </button>
        ))}
      </div>
    </section>
  ) : null;
  const usesIncidentPriorityOrder = Boolean(secondaryRisks && !model.scenarioFocus && model.risk !== "resource");
  const actionsBeforeObject = model.risk === "collection";

  return (
    <section
      className={`do-incident is-${model.verdictTone}`}
      aria-label="事故任务"
      data-desktop-incident-order={usesIncidentPriorityOrder ? "facts-primary-object-secondary-queue" : undefined}
    >
      {primarySummary}
      {actionsBeforeObject ? investigationActions : null}
      {usesIncidentPriorityOrder ? (
        <>
          <DesktopIncidentWorkspace model={model} onNavigate={onNavigate} />
          {secondaryRisks}
        </>
      ) : (
        <>
          {actionsBeforeObject ? null : secondaryRisks}
          <DesktopIncidentWorkspace model={model} onNavigate={onNavigate} />
          {actionsBeforeObject ? secondaryRisks : null}
        </>
      )}
      {!actionsBeforeObject ? investigationActions : null}
    </section>
  );
}
