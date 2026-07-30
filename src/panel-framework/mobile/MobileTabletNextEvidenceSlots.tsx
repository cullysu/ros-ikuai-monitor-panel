import type { PanelRouteId } from "../routes/panelRoutes";
import type { OverviewEvidenceModel } from "../overview/evidence-model/overviewEvidenceTypes";
import { MobileTabletNextEvidence } from "./MobileTabletNextEvidence";

export interface MobileTabletNextEvidenceSlotsProps {
  model: OverviewEvidenceModel;
  tablet: boolean;
  incident: boolean;
  scale: string;
  visiblePriorityObjects: OverviewEvidenceModel["priorityObjectsAll"];
  selectedIncidentId?: string;
  selectedComparisonId?: string;
  onOpen: (route: PanelRouteId, targetObjectId: string | null) => void;
  onSelectObject: (objectId: string) => void;
  onSelectComparison: (objectId: string) => void;
}

export function MobileTabletNextEvidenceSlots({
  model,
  tablet,
  incident,
  scale,
  visiblePriorityObjects,
  selectedIncidentId,
  selectedComparisonId,
  onOpen,
  onSelectObject,
  onSelectComparison,
}: MobileTabletNextEvidenceSlotsProps) {
  const viewportWidth = typeof window === "undefined" ? 0 : window.innerWidth;
  const workbenchWidth = tablet && viewportWidth >= 768;
  const showNormal = workbenchWidth && !incident && model.evidenceMode === "current" && scale !== "fleet";
  const showIncident = workbenchWidth && incident;
  return (
    <>
      {showNormal ? (
        <div
          className="mp-tablet-object-workspace"
          data-tablet-object-workspace="comparison"
          data-tablet-object-workspace-owner="object-list-and-inspector"
          data-tablet-object-workspace-list="true"
          data-tablet-normal-object-focus="early"
        >
          <MobileTabletNextEvidence
            kind="normal"
            comparisonObjects={model.tabletComparisonObjects}
            priorityObjects={[]}
            evidenceAt={model.evidenceAt}
            selectedObjectId={selectedComparisonId}
            showInspector={true}
            onOpen={(route, targetObjectId) => onOpen(route, targetObjectId || null)}
            onSelectObject={onSelectComparison}
          />
        </div>
      ) : null}
      {showIncident ? (
        <MobileTabletNextEvidence
          kind="incident"
          comparisonObjects={[]}
          priorityObjects={visiblePriorityObjects}
          evidenceAt={model.evidenceAt}
          selectedObjectId={selectedIncidentId}
          onOpen={(route, targetObjectId) => onOpen(route, targetObjectId || null)}
          onSelectObject={onSelectObject}
        />
      ) : null}
    </>
  );
}
