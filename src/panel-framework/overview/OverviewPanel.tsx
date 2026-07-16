import { useEffect, useState } from "react";
import { type OverviewPanelProps } from "./index";
import type { PanelRouteId } from "../routes/panelRoutes";
import { DesktopOverviewScreen } from "./desktop-overview/DesktopOverviewScreen";
import { MobileOverviewScreen } from "./mobile-overview/MobileOverviewScreen";
import "./OverviewPanel.css";

const MOBILE_OVERVIEW_QUERY = "(max-width: 899px)";

function useMobileOverview(): boolean {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia(MOBILE_OVERVIEW_QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_OVERVIEW_QUERY);
    const sync = () => setMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return mobile;
}

export interface OverviewPanelViewProps extends OverviewPanelProps {
  onNavigate: (route: PanelRouteId) => void;
  runtimeManaged?: boolean;
}

export function OverviewPanel({ snapshot, state, onNavigate, runtimeManaged = false }: OverviewPanelViewProps) {
  const mobile = useMobileOverview();

  return (
    <section
      id="overview"
      className={`section router-overview-framework ${mobile ? "is-mobile-overview" : "ro-desktop-console ro-desktop-hierarchy"}`}
      data-overview-page-credibility={state.facts.freshness.credibilityLabel}
      data-overview-page-credibility-tone={state.facts.freshness.credibilityTone}
      data-overview-business-display-boundary={state.scenario === "no-snapshot" ? "no-business-data" : "business-data"}
      data-overview-scene-key={state.scenario}
    >
      {mobile ? (
        <div className="mobile-overview-mount">
          <MobileOverviewScreen
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
