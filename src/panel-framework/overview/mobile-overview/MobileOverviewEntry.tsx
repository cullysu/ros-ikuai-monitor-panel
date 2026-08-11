import { useMemo } from "react";
import type { PanelNavigate } from "../../routes/panelRoutes";
import type { OverviewPanelProps } from "../types";
import { buildOverviewEvidenceModel } from "../evidence-model/buildOverviewEvidenceModel";
import { overviewNavigationRisk } from "../evidence-model/buildOverviewInvestigationActions";
import { buildOpticalPatrolModel } from "./optical-patrol/buildOpticalPatrolModel";
import { OpticalPatrol } from "./optical-patrol/OpticalPatrol";
import type { OpticalPatrolAction } from "./optical-patrol/opticalPatrolTypes";
import {
  opticalPatrolClaimDomId,
  useOpticalPatrolSelectionHistory,
} from "./optical-patrol/useOpticalPatrolSelectionHistory";

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
  const model = useMemo(() => buildOpticalPatrolModel(evidence, state), [evidence, state]);
  const claimIds = useMemo(() => model.claims.map((claim) => claim.id), [model.claims]);
  const selectionScope = `${model.scene}|${model.risk}|${model.evidence.mode}|${model.scale}`;
  const [selectedId, setSelectedId] = useOpticalPatrolSelectionHistory(
    claimIds,
    model.defaultSelectedId,
    selectionScope,
  );

  const openAction = (action: OpticalPatrolAction) => {
    const sourceClaim = model.claims.find((claim) => claim.objectId === action.objectId);
    onNavigate(action.route, {
      objectId: action.objectId,
      risk: overviewNavigationRisk(evidence.investigationActions, action.route),
      returnRoute: "overview",
      evidenceAt: evidence.evidenceAt,
      focusId: opticalPatrolClaimDomId(sourceClaim?.id || model.defaultSelectedId),
    });
  };

  return (
    <OpticalPatrol
      model={model}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onOpen={openAction}
      runtimeManaged={runtimeManaged}
    />
  );
}
