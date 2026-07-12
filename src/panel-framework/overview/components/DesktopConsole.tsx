import { OVERVIEW_LOW_NOISE_CONSOLE_TOKEN_CONTRACT } from "../mobileOverviewTokens";
import type { OverviewPanelProps } from "../desktopOverviewHelpers";
import { buildDesktopOverviewScene } from "../desktopOverviewScenes";
import { DesktopDecisionRail } from "./DesktopDecisionRail";

export function DesktopWorkspace({ snapshot, state }: OverviewPanelProps) {
  const sections = buildDesktopOverviewScene(snapshot, state);

  return (
    <div
      className="ro-desktop-grid ik-home-layout"
      data-overview-desktop-hierarchy="conclusion-key-metrics-evidence"
      data-overview-desktop-hierarchy-tier="3-evidence"
      data-overview-desktop-detail
      data-overview-desktop-workspace
      data-overview-low-noise-console-token-contract={OVERVIEW_LOW_NOISE_CONSOLE_TOKEN_CONTRACT}
      data-overview-desktop-v1020-public-product-polish="flat-status-bus-low-line-noise-integrated-wan-reading"
      data-overview-desktop-v1030-nav-polish="short-ikuai-left-rail-low-noise-status-bus"
      data-overview-desktop-toy-nav-leak-guard="desktop-content-icon-tabs-removed"
      data-overview-desktop-content-icon-tabs="desktop-hides-content-icon-tabs"
      data-overview-trend-compact="framework-ledger"
      data-overview-no-snapshot-detail={state.scenario === "no-snapshot" ? "business-data-unavailable-recovery-evidence-deferred" : undefined}
      data-overview-desktop-effective-content-height="760"
      data-overview-desktop-redline-markers="no-empty-left60-no-duplicate-boundary-no-nosnapshot-wan-rate-no-toy-tabs"
      data-overview-no-snapshot-no-wan-rate-placeholder={state.scenario === "no-snapshot" ? "business-rates-hidden" : undefined}
      data-overview-side-table-mode="three-col-no-badge"
      data-overview-desktop-fixed-skeleton="left-network-wan-right-resource-collection-bottom-interface-events"
      data-overview-desktop-scene={state.scenario}
    >
      <DesktopDecisionRail snapshot={snapshot} state={state} />
      <div className="ro-col is-main stack">{sections.main}</div>
      <div className="ro-col is-side stack ik-home-side-stack">{sections.side}</div>
      {sections.bottom.length > 0 ? <div className="ro-col is-bottom stack" style={{ gridColumn: "1 / -1" }}>{sections.bottom}</div> : null}
    </div>
  );
}
