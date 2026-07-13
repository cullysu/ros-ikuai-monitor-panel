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
      className={`ro-topbar ro-status-bus ik-home-flat-topbar${isNoSnapshot ? "" : " is-compact-facts"}`}
      data-overview-desktop-tier="conclusion"
    >
      {items.map((item) => (
        <div className="ro-topbar-cell ro-status-cell ik-home-flat-cell ik-home-ops-item" key={item.role} data-tone={item.tone} data-overview-field data-overview-status-role={item.role} data-overview-status-priority={topbarPriority(item.role)}>
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
