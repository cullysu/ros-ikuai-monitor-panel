import type { OverviewDerivedState, OverviewRawSnapshot } from "./index";
import { buildRouterOsPresentationViewModel } from "./routerosPresentationViewModel";

export function desktopPresentation(snapshot: OverviewRawSnapshot, state: OverviewDerivedState) {
  return buildRouterOsPresentationViewModel(snapshot, state).desktop;
}
