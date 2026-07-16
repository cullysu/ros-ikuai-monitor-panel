import type { PanelRouteId } from "../routes/panelRoutes";
import { MobilePatrolScreen } from "../mobile/MobilePatrolScreen";
import { useMobilePanelSurface } from "../mobile/useMobilePanelSurface";
import { type OverviewPanelProps } from "./index";
import { DesktopOverviewScreen } from "./desktop-overview/DesktopOverviewScreen";
import "./OverviewPanel.css";

export interface OverviewPanelViewProps extends OverviewPanelProps {
  onNavigate: (route: PanelRouteId) => void;
  runtimeManaged?: boolean;
}

export function OverviewPanel({
  snapshot,
  state,
  onNavigate,
  runtimeManaged = false,
}: OverviewPanelViewProps) {
  const mobile = useMobilePanelSurface();

  return (
    <section
      id="overview"
      className={"section router-overview-framework " + (
        mobile ? "is-mobile-surface" : "ro-desktop-console ro-desktop-hierarchy"
      )}
      data-overview-page-credibility={state.facts.freshness.credibilityLabel}
      data-overview-page-credibility-tone={state.facts.freshness.credibilityTone}
      data-overview-business-display-boundary={state.scenario === "no-snapshot" ? "no-business-data" : "business-data"}
      data-overview-scene-key={state.scenario}
    >
      {mobile ? (
        <div className="mobile-patrol-mount">
          <MobilePatrolScreen
            key={state.scenario}
            snapshot={snapshot}
            state={state}
            onNavigate={onNavigate}
            runtimeManaged={runtimeManaged}
          />
        </div>
      ) : (
        <DesktopOverviewScreen
          snapshot={snapshot}
          state={state}
          onNavigate={onNavigate}
          runtimeManaged={runtimeManaged}
        />
      )}
    </section>
  );
}
