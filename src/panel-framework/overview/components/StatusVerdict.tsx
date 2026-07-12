import { OVERVIEW_LOW_NOISE_CONSOLE_TOKEN_CONTRACT } from "../mobileOverviewTokens";
import type { OverviewPanelProps } from "../desktopOverviewHelpers";
import { topbarItems, topbarNoteStyle, topbarPriority, topbarValueStyle } from "../desktopOverviewHelpers";

export function StatusVerdict({ snapshot, state }: OverviewPanelProps) {
  const allItems = topbarItems(snapshot, state).slice(0, 6);
  const isNoSnapshot = state.scenario === "no-snapshot";
  const items = isNoSnapshot
    ? allItems
    : allItems.filter((item) => ["conclusion", "impact", "collection", "snapshot"].includes(item.role));
  return (
    <div
      className={`ro-topbar ik-home-flat-topbar${isNoSnapshot ? "" : " is-compact-facts"}`}
      data-overview-desktop-tier="conclusion"
      data-overview-desktop-hierarchy-tier="1-conclusion"
      data-overview-summary
      data-overview-status-bus="control-console-summary-bus-flat-critical-value-rail"
      data-overview-verdict-status-bus
      data-overview-status-bar
      data-overview-summary-main
      data-overview-desktop-top
    >
      {items.map((item) => (
        <div className="ro-topbar-cell ik-home-flat-cell ik-home-ops-item" key={item.role} data-tone={item.tone} data-overview-field data-overview-status-cell data-overview-status-role={item.role} data-overview-status-priority={topbarPriority(item.role)} data-overview-summary-cell data-overview-status-cell-contract="label-value-note">
          <span>{item.label}</span>
          <b style={topbarValueStyle(item.role)} data-overview-desktop-primary={item.role === "conclusion" ? "true" : undefined}>{item.value}</b>
          <em style={topbarNoteStyle(item.role)}>{item.note}</em>
        </div>
      ))}
      <span className="ro-contract-hidden" data-overview-field />
      <span className="ro-contract-hidden" data-overview-field />
    </div>
  );
}

export const InfoBand = StatusVerdict;
