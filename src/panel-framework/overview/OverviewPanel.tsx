import type { PanelNavigate } from "../routes/panelRoutes";
import { type OverviewPanelProps } from "./index";
import { DesktopOverviewScreen } from "./desktop-overview/DesktopOverviewScreen";
import "./OverviewPanel.css";

export interface OverviewPanelViewProps extends OverviewPanelProps {
  onNavigate: PanelNavigate;
  runtimeManaged?: boolean;
}

export function OverviewPanel({
  snapshot,
  state,
  onNavigate,
  runtimeManaged = false,
}: OverviewPanelViewProps) {
  return (
    <section
      id="overview"
      className="section router-overview-framework ro-desktop-console ro-desktop-hierarchy"
      data-overview-page-credibility={state.facts.freshness.credibilityLabel}
      data-overview-page-credibility-tone={state.facts.freshness.credibilityTone}
      data-overview-business-display-boundary={state.scenario === "no-snapshot" ? "no-business-data" : "business-data"}
      data-overview-scene-key={state.scenario}
    >
      <DesktopOverviewScreen
        snapshot={snapshot}
        state={state}
        onNavigate={onNavigate}
        runtimeManaged={runtimeManaged}
      />
    </section>
  );
}
