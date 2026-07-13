import { MobileOverviewHome } from "./components/MobileOverviewHome";
import { DesktopWorkspace } from "./components/DesktopConsole";
import { StatusVerdict } from "./components/StatusVerdict";
import { OVERVIEW_LOW_NOISE_CONSOLE_TOKEN_CONTRACT } from "./mobileOverviewTokens";
import { type OverviewPanelProps } from "./desktopOverviewHelpers";
import "./OverviewPanel.css";
import "./styles/desktop/status-bus.css";
import "./styles/desktop/tokens.css";
import "./styles/overview-desktop-runtime.css";
import "./styles/desktop/incidents.css";

export function OverviewPanel({ snapshot, state }: OverviewPanelProps) {
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
      <StatusVerdict snapshot={snapshot} state={state} />
      <div className="ro-mobile-first-screen" data-overview-mobile-first-screen>
        <MobileOverviewHome snapshot={snapshot} state={state} />
      </div>
      <DesktopWorkspace snapshot={snapshot} state={state} />
    </section>
  );
}
