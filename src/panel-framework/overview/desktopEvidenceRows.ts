import type { OverviewDerivedState, OverviewRawSnapshot } from "./index";
import type { LedgerRow } from "./desktopOverviewHelpers";
import {
  allOfflineImpactRows,
  collectionReadonlyRows,
  compactRows,
  interfaceBoundaryRows,
  noSnapshotReadonlyDegradedRows,
  normalOpsRows,
  routeRawEvidenceRows,
  threeColumnRows,
} from "./desktopOverviewRows";
import { resourceBoundaryRows } from "./desktopResourceRows";

export function desktopEvidenceBoundaryRows(snapshot: OverviewRawSnapshot, state: OverviewDerivedState): LedgerRow[] {
  if (state.scenario === "no-snapshot") return compactRows(noSnapshotReadonlyDegradedRows(snapshot, state), 4);
  if (state.scenario === "collection-down") return compactRows(threeColumnRows(collectionReadonlyRows(snapshot, state), "desktop-boundary-"), 4);
  if (state.scenario === "resource-full") return compactRows([...routeRawEvidenceRows(snapshot, state), ...threeColumnRows(resourceBoundaryRows(snapshot, state), "desktop-res-boundary-")], 5);
  if (state.scenario === "interfaces-down") return compactRows([...routeRawEvidenceRows(snapshot, state), ...threeColumnRows(interfaceBoundaryRows(snapshot, state), "desktop-if-boundary-")], 5);
  if (state.scenario === "all-offline") return compactRows([...routeRawEvidenceRows(snapshot, state), ...threeColumnRows(allOfflineImpactRows(snapshot, state), "desktop-boundary-")], 5);
  return compactRows([...routeRawEvidenceRows(snapshot, state), ...normalOpsRows(snapshot, state)], 6);
}
