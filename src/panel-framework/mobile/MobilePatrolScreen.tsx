import { Clock3, LockKeyhole, Router } from "lucide-react";
import { useMemo, useState } from "react"; import { mobilePatrolStateStyle } from "./mobilePatrolState";
import type { PanelNavigate, PanelRouteId } from "../routes/panelRoutes";
import { type OverviewPanelProps } from "../overview";
import { buildOverviewEvidenceModel } from "../overview/evidence-model/buildOverviewEvidenceModel";
import { overviewNavigationRisk } from "../overview/evidence-model/buildOverviewInvestigationActions";
import { MobileEvidenceLedger } from "./MobileEvidenceLedger";
import { MobileFocusDossier, MobileFocusObject } from "./MobileFocusObject";
import { MobilePatrolActions } from "./MobilePatrolActions";
import { IncidentInspector } from "./MobileIncidentWorkspace";
import { COMPACT_TASK_QUERY, useMediaCapability, useOverviewWorkbenchCapabilities } from "./useMobilePanelSurface";
import { useMobileLargeTextMode } from "./useMobileLargeTextMode";
import { MobilePatrolTraffic } from "./MobilePatrolTraffic";
import { MobileResourceHistory } from "./MobileResourceHistory";
import { MobileResourcePressure } from "./MobileResourcePressure";
import { MobileScenarioFocus } from "./MobileScenarioFocus";
import { MobileConcurrentRiskQueue } from "./MobileConcurrentRiskQueue";
import { MobileProofStrip } from "./MobileProofStrip";
import { MobileObjectList } from "./MobileObjectDetails";
import { MobileSteadyDecisionLedger } from "./MobileSteadyDecisionLedger";
import { MobilePhoneNextStep } from "./MobilePhoneNextStep";
import { MobileTabletRelationRail } from "./MobileTabletRelationRail";
import { MobileTabletVerticalTask } from "./MobileTabletVerticalTask";
import { MobilePatrolIncidentCenter } from "./MobilePatrolIncidentCenter";
import { MobileTabletNextEvidenceSlots } from "./MobileTabletNextEvidenceSlots";
import { useMobileComparisonSelection } from "./useMobileComparisonSelection";
import { MobileVerdictIcon } from "./MobileVerdictIcon";
import "./mobile-patrol-foundation.css";
import "./mobile-patrol.css";
import "./mobile-tablet-layout.css";
export interface MobilePatrolScreenProps extends OverviewPanelProps { onNavigate: PanelNavigate; runtimeManaged?: boolean }
export function MobilePatrolScreen({
  snapshot,
  state,
  onNavigate,
  runtimeManaged = false,
}: MobilePatrolScreenProps) {
  const model = useMemo(() => buildOverviewEvidenceModel(snapshot, state), [snapshot, state]);
  const incident = model.priorityObjects.length > 0;
  const { largeText, sentinelRef: textScaleSentinelRef } = useMobileLargeTextMode();
  const { tablet, relationTablet } = useOverviewWorkbenchCapabilities(); const compactTask = useMediaCapability(COMPACT_TASK_QUERY); const compactLandscapeFallback = typeof window !== "undefined" && window.innerWidth >= 600 && window.innerWidth < 772 && window.innerHeight < 700; const compactIncident = (compactTask || compactLandscapeFallback) && !tablet && incident;
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [selectedComparisonId, setSelectedComparisonId] = useMobileComparisonSelection(model.tabletComparisonObjects, tablet && !incident);
  const [showAllIncidents, setShowAllIncidents] = useState(false);
  const visiblePriorityObjects = tablet || showAllIncidents ? model.priorityObjectsAll : model.priorityObjects;
  const secondaryRiskTasks = model.riskQueue.slice(1);
  const selectedIncident = visiblePriorityObjects.find((object) => object.id === selectedIncidentId);
  const showPatrolActions = tablet || compactIncident || state.scale === "fleet" || model.risk !== "none"; const autoOpenEvidenceLedger = model.risk !== "none" || model.evidenceMode !== "current";
  const evidenceLedger = (
    <MobileEvidenceLedger
      key={`${model.scenario}:${model.evidenceMode}:${model.risk}`}
      evidenceNote={model.evidenceNote}
      rows={model.evidenceRows} autoOpen={autoOpenEvidenceLedger}
    />
  );
  const openEvidenceObject = (route: PanelRouteId, targetObjectId?: string | null, focusId?: string) => {
    const risk = overviewNavigationRisk(model.investigationActions, route);
    onNavigate(route, {
      objectId: targetObjectId,
      risk,
      returnRoute: "overview",
      evidenceAt: model.evidenceAt,
      ...(focusId ? { focusId } : {}),
    });
  };
  const incidentCenter = (
    <MobilePatrolIncidentCenter
      model={model}
      tablet={tablet}
      visiblePriorityObjects={visiblePriorityObjects}
      selectedIncidentId={selectedIncidentId}
      showAllIncidents={showAllIncidents}
      onSelectIncident={setSelectedIncidentId}
      onToggleAll={() => setShowAllIncidents((value) => !value)}
      onOpen={openEvidenceObject}
    />
  );
  const resourceSignal = model.risk === "resource" && model.resource
    ? <MobileResourcePressure resource={model.resource} />
    : null;
  const resourceHistory = model.risk === "resource" && model.resource
    ? <MobileResourceHistory resource={model.resource} expanded={tablet} />
    : null;
  const trafficSignal = model.traffic && (!incident || model.risk === "wan") ? (
    <MobilePatrolTraffic traffic={model.traffic} onOpen={() => onNavigate("trafficLoad")} />
  ) : null;
  const selectedInspector = tablet && selectedIncident ? <IncidentInspector
    object={selectedIncident} actionLabel={model.risk === "resource" ? "核对资源" : undefined}
    onOpen={() => openEvidenceObject(selectedIncident.route, selectedIncident.targetObjectId || null)}
  /> : null;
  const patrolActions = showPatrolActions ? (
    <MobilePatrolActions actions={model.investigationActions} steady={model.risk === "none"} onNavigate={onNavigate} phoneIncident={incident && !compactIncident && !tablet} />
  ) : null;
  const tabletVerticalTask = tablet && showPatrolActions ? (
    <MobileTabletVerticalTask
      kind={incident ? "incident" : "normal"}
      actions={model.investigationActions}
      steady={model.risk === "none"}
      priorityObjects={visiblePriorityObjects}
      selectedObject={selectedIncident || null}
      focusObject={model.focusObject}
      onNavigate={onNavigate}
    />
  ) : null;
  const tabletNextEvidence = <MobileTabletNextEvidenceSlots model={model} tablet={tablet} incident={incident} scale={state.scale} visiblePriorityObjects={visiblePriorityObjects} selectedIncidentId={selectedIncident?.id} selectedComparisonId={selectedComparisonId} onOpen={openEvidenceObject} onSelectObject={setSelectedIncidentId} onSelectComparison={setSelectedComparisonId} />;
  const compactIncidentActions = compactIncident && patrolActions ? <div className="mp-compact-incident-actions" data-mobile-compact-incident-actions data-overview-task-landmark="compact-incident-actions">{patrolActions}</div> : null;
  const phonePrimaryAction = incident && !compactIncident ? <div className="mp-primary-task-proximity mp-compact-incident-actions" data-mobile-primary-task-proximity="after-primary-risk">{patrolActions}</div> : null;
  const tabletSignal = resourceSignal || trafficSignal ? <div className="mp-tablet-signal">{resourceSignal}{trafficSignal}</div> : null;
  const concurrentRiskQueue = <MobileConcurrentRiskQueue tasks={secondaryRiskTasks} evidenceAt={model.evidenceAt} onNavigate={onNavigate} />;
  const proofStrip = !model.scenarioFocus
    ? <MobileProofStrip facts={model.facts} />
    : null;
  const proofFollowsIncident = Boolean(!tablet && incident && model.evidenceMode === "current" && proofStrip);
  const scenarioFocus = model.scenarioFocus
    ? <MobileScenarioFocus focus={model.scenarioFocus} onNavigate={onNavigate} />
    : null;
  const focusObject = model.focusObject && model.evidenceAt ? (
    <MobileFocusObject
      object={model.focusObject}
      evidenceAt={model.evidenceAt}
      evidenceTime={model.evidenceTime}
      traffic={model.evidenceMode === "current" && model.risk === "none" ? model.traffic : null}
      onOpen={() => openEvidenceObject(model.focusObject!.route, model.focusObject!.targetObjectId || null)}
    />
  ) : null;
  const focusDossier = model.focusObject && model.evidenceAt ? (
    <MobileFocusDossier
      object={model.focusObject}
      evidenceAt={model.evidenceAt}
      evidenceTime={model.evidenceTime}
      traffic={model.evidenceMode === "current" && model.risk === "none" ? model.traffic : null}
    />
  ) : null;
  const normalPhoneFocusObject = !tablet && !incident ? focusObject : null; const normalPhoneProofStrip = !tablet && !incident ? proofStrip : null; const tabletProofStrip = tablet && !proofFollowsIncident ? proofStrip : null; const phoneIncidentProofStrip = !tablet && incident && !proofFollowsIncident ? proofStrip : null; const normalPhoneNextStep = !tablet && state.scale === "single" && model.scenario === "single" && !incident && model.evidenceMode === "current" && model.risk === "none" && model.investigationActions[0] ? <MobilePhoneNextStep action={model.investigationActions[0]} onNavigate={onNavigate} /> : null; const normalPhoneSteadyDecisions = !tablet && model.scenario === "single" && !incident && model.evidenceMode === "current" && model.risk === "none" && model.secondaryDecisions.length ? <MobileSteadyDecisionLedger rows={model.secondaryDecisions} onOpen={openEvidenceObject} /> : null;
  const comparisonList = !incident && model.evidenceAt && model.comparisonObjects.length ? (
    <MobileObjectList heading="对象比较" taskLandmark="comparison" rows={model.comparisonObjects} onOpen={openEvidenceObject} />
  ) : null;
  return (
    <main
      style={mobilePatrolStateStyle(model.risk)} className={`mp-shell is-${model.verdictTone} is-${model.evidenceMode} ${incident ? "has-incident" : "is-steady"} ${compactIncident ? "is-compact-incident" : ""} ${proofFollowsIncident ? "is-narrow-incident-object-first" : ""} ${largeText ? "is-large-text" : ""}`}
      data-mobile-overview data-visual-grammar="network-console-v1"
      data-mobile-overview-scenario={model.scenario}
      data-mobile-overview-risk={model.risk}
      data-mobile-risk-kind={model.risk}
      data-mobile-state-mode={model.evidenceMode}
       data-mobile-evidence-mode={model.evidenceMode} data-mobile-compact-incident={compactIncident ? "true" : "false"} data-mobile-incident-primary-action-visibility={incident && !tablet ? "navigation-bounded-v1" : undefined} data-mobile-incident-proof-order={proofFollowsIncident ? "incident-before-proof" : "proof-default"} data-mobile-visual-rhythm={incident ? "incident-ledger-v1" : "steady-ledger-v1"}
      data-mobile-large-text={largeText ? "true" : "false"}
      data-mobile-incident-task-space={incident ? "v2" : "none"}
      data-mobile-visual-grammar="ledger-v2"
      data-overview-task-contract="overview-task-v1"
      data-tablet-task-space="v2" data-tablet-space-capacity="stack-under-700"
    >
      <span className="panel-text-scale-sentinel" aria-hidden="true" ref={textScaleSentinelRef}>M</span>
      {!runtimeManaged ? (
        <header className="mp-device-context">
          <span><Router aria-hidden="true" size={19} /><span><b>{model.device}</b><small>{model.deviceNote}</small></span></span>
          <span><LockKeyhole aria-hidden="true" size={15} />只读</span>
        </header>
      ) : null}
      <div className="mp-patrol-canvas">
        <div className={`mp-status-bus ${tabletProofStrip || phoneIncidentProofStrip ? "has-proof" : ""}`}>
        <section className="mp-command" aria-labelledby="mp-command-title" data-mobile-verdict data-mobile-visual-layer="verdict" data-overview-task-landmark="verdict" data-overview-visual-level="primary">
          <div className="mp-evidence-line" data-overview-task-landmark="freshness">
            <span className={`is-${model.evidenceTone}`}><Clock3 aria-hidden="true" size={14} />{model.evidenceLabel}</span>
            <time data-mobile-current-evidence-time-owner>{model.evidenceTime}</time>
          </div>
          <div className="mp-command-main">
            <span className="mp-command-icon"><MobileVerdictIcon tone={model.verdictTone} /></span>
            <div>
              <h1 id="mp-command-title" tabIndex={-1} data-panel-route-title>{model.verdictTitle}</h1>
              <p>{model.verdictSummary}</p>
            </div>
          </div>
        </section>
        {tabletProofStrip}
        {phoneIncidentProofStrip}
      </div>
      <div className="mp-workspace">
        {tablet && !incident && model.evidenceMode === "current" && model.risk === "none" && focusDossier && trafficSignal ? (
          <div className="mp-tablet-steady" data-tablet-space-surface="normal" data-tablet-space-primary="route-evidence" data-tablet-space-relation="object-coverage" data-tablet-space-follow-up="next-inspection" data-tablet-space-boundary="evidence-ledger">
            <div className="mp-tablet-left-column" data-tablet-column="left">
              <div className="mp-tablet-route-column">
                {focusDossier}
              </div>
              {tabletVerticalTask}
            </div>
            <div className="mp-tablet-right-column" data-tablet-column="right">
              {trafficSignal}
              <MobileSteadyDecisionLedger
                rows={model.secondaryDecisions}
                onOpen={openEvidenceObject}
              />
            </div>
            {tabletNextEvidence}
            <div className="mp-tablet-steady-support">
              {relationTablet && model.focusObject && model.traffic && model.evidenceAt ? <MobileTabletRelationRail
                object={model.focusObject} traffic={model.traffic}
                evidenceAt={model.evidenceAt} evidenceTime={model.evidenceTime}
              /> : null}
              {evidenceLedger}
            </div>
          </div>
        ) : tablet && incident ? (
          <div className="mp-workspace-body is-tablet-incident" data-tablet-overview-layout="split" data-tablet-overview-task-flow="incident" data-tablet-space-surface="incident" data-tablet-space-primary="impact-list" data-tablet-space-relation="selected-evidence" data-tablet-space-follow-up="evidence-and-actions" data-tablet-space-boundary="evidence-ledger">
            <div className="mp-tablet-master-detail" style={selectedInspector ? undefined : { gridTemplateColumns: "minmax(400px, 1fr)" }}>{incidentCenter}{selectedInspector}</div>
            {concurrentRiskQueue}
            {scenarioFocus}
            {tabletSignal}
            {resourceHistory}
            <div className="mp-tablet-support" data-tablet-overview-followup="evidence-and-actions">{tabletVerticalTask}{evidenceLedger}{incident ? tabletNextEvidence : null}</div>
          </div>
        ) : (
          <div className="mp-workspace-body">
            <div className="mp-workspace-primary">
              {normalPhoneFocusObject}
              {incidentCenter}
               {proofFollowsIncident ? proofStrip : normalPhoneProofStrip}
               {scenarioFocus}
               {resourceSignal}
               {resourceHistory}
              {normalPhoneNextStep}
               {trafficSignal}
               {phonePrimaryAction}
               {concurrentRiskQueue}
               {compactIncidentActions}
               {normalPhoneSteadyDecisions}
               {comparisonList}
            </div>
            <div className="mp-workspace-context">
              {tablet ? focusObject : null}
              {selectedInspector}
              {compactIncident || incident ? null : patrolActions}
              {evidenceLedger}
            </div>
          </div>
        )}
      </div></div>
    </main>
  );
}
