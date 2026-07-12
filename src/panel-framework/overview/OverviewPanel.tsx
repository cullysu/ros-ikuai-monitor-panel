import { MobileOverviewHome } from "./components/MobileOverviewHome";
import { DesktopWorkspace } from "./components/DesktopConsole";
import { StatusVerdict } from "./components/StatusVerdict";
import { OVERVIEW_LOW_NOISE_CONSOLE_TOKEN_CONTRACT } from "./mobileOverviewTokens";
import { type OverviewPanelProps } from "./desktopOverviewHelpers";
import "./OverviewPanel.css";
import "./styles/desktop/tokens.css";
import "./OverviewPanelDesktopRefinement.css";
import "./OverviewPanelRelease.css";
import "./OverviewPanelDesktopHierarchy.css";
import "./styles/desktop/incidents.css";

export function OverviewPanel({ snapshot, state }: OverviewPanelProps) {
  return (
    <section
      id="overview"
      className="section router-overview-framework"
      data-overview-framework="react-vite"
      data-overview-summary-root
      data-overview-readonly-console-contract="react-overview-preserved"
      data-overview-page-credibility={state.facts.freshness.credibilityLabel}
      data-overview-page-credibility-tone={state.facts.freshness.credibilityTone}
      data-overview-business-display-boundary={state.scenario === "no-snapshot" ? "no-business-data" : "business-data"}
      data-overview-low-noise-console-token-contract={OVERVIEW_LOW_NOISE_CONSOLE_TOKEN_CONTRACT}
      data-overview-scene-key={state.scenario}
      data-overview-ikuai40-density="apple-flat-light-blue-console"
      data-overview-flat-ledger-surface="light-blue-white-thin-lines-low-shadow"
      data-overview-mobile-metrics
      data-overview-mobile-home-mode="ios-app-home"
      data-overview-mobile-home-acceptance="ios-router-home-primary-flow"
      data-overview-hard-standard="desktop-status-bus-mobile-ios-app-home-chart-meta-sample-depth-required-no-large-alert-card"
      data-overview-desktop-mobile-leakage-guard="hide-mobile-shell-on-desktop"
      data-overview-desktop-hierarchy-contract="conclusion-key-metrics-evidence"
      data-overview-mobile-no-snapshot-microchart={state.scenario === "no-snapshot" ? "snapshot-channel-matrix" : undefined}
      data-overview-no-snapshot-flow-timeline-matrix={state.scenario === "no-snapshot" ? "true" : undefined}
      data-overview-no-snapshot-density-contract={state.scenario === "no-snapshot" ? "left60-chain-boundary-success-route-right-readonly-degraded" : undefined}
      data-overview-no-snapshot-no-stretch-cards={state.scenario === "no-snapshot" ? "auto-height-content" : undefined}
      data-overview-no-snapshot-content-sized={state.scenario === "no-snapshot" ? "true" : undefined}
      data-overview-no-snapshot-content-packed={state.scenario === "no-snapshot" ? "chain-boundary-success-no-empty-left60" : undefined}
      data-overview-no-snapshot-no-wan-rate-placeholder={state.scenario === "no-snapshot" ? "business-rates-hidden" : undefined}
      data-overview-no-snapshot-big-wan-rate-guard="no-business-rates-without-snapshot"
      data-overview-no-zero-rate-placeholder="no-zero-rate-when-uncollected"
    >
      <StatusVerdict snapshot={snapshot} state={state} />
      <div className="ro-mobile-first-screen" data-overview-mobile-first-screen>
        <MobileOverviewHome snapshot={snapshot} state={state} />
      </div>
      <DesktopWorkspace snapshot={snapshot} state={state} />
    </section>
  );
}
