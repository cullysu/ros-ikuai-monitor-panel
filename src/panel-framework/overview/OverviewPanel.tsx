import { MobileOverviewHome } from "./components/MobileOverviewHome";
import { DesktopWorkspace, InfoBand } from "./components/DesktopConsole";
import { OVERVIEW_LOW_NOISE_CONSOLE_TOKEN_CONTRACT } from "./mobileOverviewTokens";
import type { OverviewPanelProps } from "./index";
import {
  OVERVIEW_CHART_METADATA_COVERAGE,
  OVERVIEW_CHART_STATUS_COLORS,
  OVERVIEW_IKUAI40_CHART_STANDARD,
  OVERVIEW_IKUAI40_MATURE_VISUAL_STANDARD,
  OVERVIEW_SCENE_CHART_CONTRACT,
  OVERVIEW_SCENE_CHART_PRIORITY,
  verdictContractText,
} from "./desktopOverviewHelpers";
import "./OverviewPanel.css";
import "./OverviewPanelDesktopRefinement.css";
import "./OverviewPanelRelease.css";

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
      data-overview-desktop-v1030-nav-polish="short-ikuai-left-rail-low-noise-status-bus"
      data-overview-chart-standard={OVERVIEW_IKUAI40_CHART_STANDARD}
      data-overview-chart-metadata-coverage={OVERVIEW_CHART_METADATA_COVERAGE}
      data-overview-mature-visual-standard={OVERVIEW_IKUAI40_MATURE_VISUAL_STANDARD}
      data-overview-scene-chart-priority={OVERVIEW_SCENE_CHART_PRIORITY}
      data-overview-scene-chart-contract={OVERVIEW_SCENE_CHART_CONTRACT}
      data-overview-chart-color-normal={OVERVIEW_CHART_STATUS_COLORS.normal}
      data-overview-mobile-first-microchart-policy="first-screen"
      data-overview-mobile-first-screen-microchart-required="true"
      data-overview-mobile-first-screen-uses-microchart="true"
      data-overview-mobile-first-microchart-kind="scenario-insight"
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
      <InfoBand snapshot={snapshot} state={state} />
      <span
        className="ro-sr-contract"
        data-overview-verdict-panel
        data-routeros-presentation-contract="collection-facts/routeros-semantics/user-conclusion"
      >
        {verdictContractText(snapshot, state)}
      </span>
      <div className="ro-mobile-first-screen" data-overview-mobile-first-screen>
        <MobileOverviewHome snapshot={snapshot} state={state} />
      </div>
      <DesktopWorkspace snapshot={snapshot} state={state} />
    </section>
  );
}
