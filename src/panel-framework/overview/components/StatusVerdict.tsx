import { OVERVIEW_LOW_NOISE_CONSOLE_TOKEN_CONTRACT } from "../mobileOverviewTokens";
import type { OverviewPanelProps } from "../desktopOverviewHelpers";
import { topbarItems, topbarPriority } from "../desktopOverviewTopbar";

export function StatusVerdict({ snapshot, state }: OverviewPanelProps) {
  const allItems = topbarItems(snapshot, state).slice(0, 6);
  const isNoSnapshot = state.scenario === "no-snapshot";
  const items = isNoSnapshot
    ? allItems
    : allItems.filter((item) => ["conclusion", "impact", "collection", "snapshot"].includes(item.role));
  return (
    <div
      className="ro-status-bus"
      data-overview-desktop-tier="conclusion"
    >
      {items.map((item) => (
        <div className="ro-status-cell" key={item.role} data-tone={item.tone} data-overview-field data-overview-status-role={item.role} data-overview-status-priority={topbarPriority(item.role)}>
          <span>{item.label}</span>
          <b data-overview-desktop-primary={item.role === "conclusion" ? "true" : undefined}>{item.value}</b>
          <em>{item.note}</em>
        </div>
      ))}
    </div>
  );
}

export const InfoBand = StatusVerdict;
