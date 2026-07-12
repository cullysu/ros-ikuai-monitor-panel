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
      data-overview-no-snapshot-detail={state.scenario === "no-snapshot" ? "business-data-unavailable-recovery-evidence-deferred" : undefined}
      data-overview-desktop-scene={state.scenario}
    >
      <DesktopDecisionRail snapshot={snapshot} state={state} />
      <div className="ro-col is-main stack">{sections.main}</div>
      <div className="ro-col is-side stack ik-home-side-stack">{sections.side}</div>
      {sections.bottom.length > 0 ? <div className="ro-col is-bottom stack" style={{ gridColumn: "1 / -1" }}>{sections.bottom}</div> : null}
    </div>
  );
}
