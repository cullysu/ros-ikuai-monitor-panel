import type { OverviewPanelProps } from "../desktopOverviewHelpers";
import { topbarItems } from "../desktopOverviewTopbar";

export function StatusVerdict({ snapshot, state }: OverviewPanelProps) {
  const allItems = topbarItems(snapshot, state).slice(0, 6);
  const isNoSnapshot = state.scenario === "no-snapshot";
  const items = isNoSnapshot
    ? allItems
    : allItems.filter((item) => ["conclusion", "impact", "collection", "snapshot"].includes(item.role));
  return (
    <div className="ro-status-bus">
      {items.map((item) => (
        <div className="ro-status-cell" key={item.role} data-tone={item.tone} data-overview-field data-overview-status-role={item.role}>
          <span>{item.label}</span>
          <b>{item.value}</b>
          <em>{item.note}</em>
        </div>
      ))}
    </div>
  );
}

export const InfoBand = StatusVerdict;
