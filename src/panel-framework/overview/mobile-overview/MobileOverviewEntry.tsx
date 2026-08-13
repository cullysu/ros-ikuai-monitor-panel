import { useMemo } from "react";
import type { PanelNavigate } from "../../routes/panelRoutes";
import type { OverviewPanelProps } from "../types";
import { buildOverviewEvidenceModel } from "../evidence-model/buildOverviewEvidenceModel";
import { overviewNavigationRisk } from "../evidence-model/buildOverviewInvestigationActions";
import { buildIncidentLensModel, IncidentLens } from "./incident-lens";
import { incidentLensObjectDomId } from "./incident-lens/useIncidentLensSelectionHistory";

export interface MobileOverviewEntryProps extends OverviewPanelProps {
  onNavigate: PanelNavigate;
  runtimeManaged?: boolean;
}

export function MobileOverviewEntry({
  snapshot,
  state,
  onNavigate,
  runtimeManaged = false,
}: MobileOverviewEntryProps) {
  const evidence = useMemo(() => buildOverviewEvidenceModel(snapshot, state), [snapshot, state]);
  const model = useMemo(() => buildIncidentLensModel(evidence, state), [evidence, state]);
  const selectionScope = `${model.scenario}|${model.risk}|${model.command.mode}|${model.scale}`;

  const openObject = (objectId: string) => {
    const object = [model.incident, ...model.patrolObjects, ...model.secondaryObjects]
      .find((candidate) => candidate?.id === objectId);
    if (!object?.action) return;
    onNavigate(object.action.route, {
      objectId: object.id,
      risk: overviewNavigationRisk(evidence.investigationActions, object.action.route),
      returnRoute: "overview",
      evidenceAt: evidence.evidenceAt,
      focusId: incidentLensObjectDomId(object.id),
    });
  };

  return (
    <IncidentLens
      model={model}
      scope={selectionScope}
      onNavigate={(route) => onNavigate(route)}
      onOpenObject={openObject}
      runtimeManaged={runtimeManaged}
    />
  );
}
