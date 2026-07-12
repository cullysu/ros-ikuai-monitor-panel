import type { OverviewDerivedState, OverviewRawSnapshot } from "./index";
import { buildAllOfflineDesktopScene } from "./desktopOverviewAllOfflineScene";
import { buildCollectionDownDesktopScene } from "./desktopOverviewCollectionScene";
import { buildDefaultDesktopScene } from "./desktopOverviewDefaultScene";
import { buildInterfacesDownDesktopScene } from "./desktopOverviewInterfaceScene";
import { buildNoSnapshotDesktopScene } from "./desktopOverviewNoSnapshotScene";
import { buildResourceFullDesktopScene } from "./desktopOverviewResourceScene";
import type { DesktopSceneSections } from "./desktopOverviewSceneTypes";

export function buildDesktopOverviewScene(
  snapshot: OverviewRawSnapshot,
  state: OverviewDerivedState,
): DesktopSceneSections {
  switch (state.scenario) {
    case "no-snapshot":
      return buildNoSnapshotDesktopScene(snapshot, state);
    case "resource-full":
      return buildResourceFullDesktopScene(snapshot, state);
    case "collection-down":
      return buildCollectionDownDesktopScene(snapshot, state);
    case "interfaces-down":
      return buildInterfacesDownDesktopScene(snapshot, state);
    case "all-offline":
      return buildAllOfflineDesktopScene(snapshot, state);
    default:
      return buildDefaultDesktopScene(snapshot, state);
  }
}
