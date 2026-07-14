import { useEffect, useState } from "react";
import { DesktopWorkspace } from "./components/DesktopConsole";
import { StatusVerdict } from "./components/StatusVerdict";
import { OVERVIEW_LOW_NOISE_CONSOLE_TOKEN_CONTRACT } from "./mobileOverviewTokens";
import { type OverviewPanelProps } from "./desktopOverviewHelpers";
import { RouterMobileApp } from "./mobile-app/RouterMobileApp";
import "./OverviewPanel.css";
import "./styles/desktop/tokens.css";
import "./styles/overview-desktop-runtime.css";
import "./styles/desktop/incidents.css";
import "./styles/desktop/status-bus.css";

const MOBILE_OVERVIEW_QUERY = "(max-width: 900px)";

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

export function OverviewPanel({ snapshot, state }: OverviewPanelProps) {
  const mobile = useMobileOverview();

  return (
    <section
      id="overview"
      className="section router-overview-framework"
      data-overview-page-credibility={state.facts.freshness.credibilityLabel}
      data-overview-page-credibility-tone={state.facts.freshness.credibilityTone}
      data-overview-business-display-boundary={state.scenario === "no-snapshot" ? "no-business-data" : "business-data"}
      data-overview-low-noise-console-token-contract={OVERVIEW_LOW_NOISE_CONSOLE_TOKEN_CONTRACT}
      data-overview-scene-key={state.scenario}
      data-overview-ikuai40-density="apple-flat-light-blue-console"
      data-overview-desktop-hierarchy-contract="conclusion-key-metrics-evidence"
    >
      {mobile ? (
        <div className="router-mobile-app-mount" data-router-mobile-mount>
          <RouterMobileApp key={state.scenario} snapshot={snapshot} state={state} />
        </div>
      ) : (
        <>
          <StatusVerdict snapshot={snapshot} state={state} />
          <DesktopWorkspace snapshot={snapshot} state={state} />
        </>
      )}
    </section>
  );
}
