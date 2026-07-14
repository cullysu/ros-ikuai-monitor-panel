import type { OverviewDerivedState, OverviewRawSnapshot } from "./index";
import { buildRouterOsPresentationViewModel } from "./routerosPresentationViewModel";
import type { RouterOsNetworkViewModel } from "./routerosNetworkViewModel";

export function desktopPresentation(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
  network?: RouterOsNetworkViewModel,
) {
  return buildRouterOsPresentationViewModel(snapshot, state, network).desktop;
}
