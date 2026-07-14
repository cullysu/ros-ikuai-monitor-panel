import type { OverviewPanelProps } from "../desktopOverviewHelpers";
import { topbarItems } from "../desktopOverviewTopbar";

export function StatusVerdict({ snapshot, state }: OverviewPanelProps) {
  const allItems = topbarItems(snapshot, state);
  const isNoSnapshot = state.scenario === "no-snapshot";
  const isNormal = state.scenario === "single" || state.scenario === "fleet";
  const items = isNoSnapshot
    ? allItems
    : allItems.filter((item) => ["conclusion", isNormal ? "route" : "impact", "collection", "snapshot"].includes(item.role));
  return (
    <div className={`ro-status-bus ${isNoSnapshot ? "is-channel-audit" : "is-summary"}`}>
      {items.map((item) => (
        <div className={`ro-status-cell is-${item.role}`} key={item.role} data-tone={item.tone}>
          <span>{item.label}</span>
          <b>{item.value}</b>
          <em>{item.note}</em>
        </div>
      ))}
    </div>
  );
}

export const InfoBand = StatusVerdict;
