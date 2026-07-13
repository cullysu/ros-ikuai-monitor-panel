import type { OverviewPanelProps } from "../desktopOverviewHelpers";
import { buildDesktopOverviewScene } from "../desktopOverviewScenes";
import { DesktopDecisionRail } from "./DesktopDecisionRail";

export function DesktopWorkspace({ snapshot, state }: OverviewPanelProps) {
  const sections = buildDesktopOverviewScene(snapshot, state);
  const hasDecisionRail = state.scenario !== "single" && state.scenario !== "fleet";

  return (
    <div
      className={`ro-desktop-grid ik-home-layout ik-desktop-workspace ik-desktop-evidence${hasDecisionRail ? "" : " is-normal-scene"}`}
      data-overview-desktop-scene={state.scenario}
    >
      {hasDecisionRail ? <DesktopDecisionRail snapshot={snapshot} state={state} /> : null}
      <div className="ro-col is-main stack">{sections.main}</div>
      <div className="ro-col is-side stack ik-home-side-stack">{sections.side}</div>
      {sections.bottom.length > 0 ? <div className="ro-col is-bottom stack" style={{ gridColumn: "1 / -1" }}>{sections.bottom}</div> : null}
    </div>
  );
}
