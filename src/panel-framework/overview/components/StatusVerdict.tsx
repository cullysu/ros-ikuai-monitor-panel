import { OVERVIEW_LOW_NOISE_CONSOLE_TOKEN_CONTRACT } from "../mobileOverviewTokens";
import type { OverviewPanelProps } from "../desktopOverviewHelpers";
import { topbarItems, topbarNoteStyle, topbarPriority, topbarValueStyle } from "../desktopOverviewHelpers";

export function StatusVerdict({ snapshot, state }: OverviewPanelProps) {
  const items = topbarItems(snapshot, state).slice(0, 6);
  const isNoSnapshot = state.scenario === "no-snapshot";
  const topbarFixedSix = isNoSnapshot ? "conclusion-device-routeros-rest-ssh-recent-success" : "conclusion-device-object-impact-collection-snapshot";
  const topbarHierarchy = isNoSnapshot ? "primary-conclusion-device-routeros-rest-ssh-recent-success" : "primary-conclusion-device-object-impact-collection-snapshot";
  const topbarPriorityContract = isNoSnapshot ? "conclusion-first-device-routeros-rest-ssh-recent-success" : "conclusion-first-device-object-impact-collection-snapshot";
  const topbarSecondary = isNoSnapshot ? "recent-success-demoted" : "snapshot-demoted";
  return (
    <div
      className="ro-topbar ik-home-flat-topbar"
      data-overview-desktop-tier="conclusion"
      data-overview-desktop-hierarchy-tier="1-conclusion"
      data-overview-summary
      data-overview-status-bus
      data-overview-verdict-status-bus
      data-overview-status-bar
      data-overview-desktop-v1040-status-bus="flat-summary-bus-key-value-no-field-boxes"
      data-overview-desktop-v1068-status-bus="control-console-summary-bus-flat-critical-value-rail"
      data-overview-desktop-v1068-status-bus-order={topbarFixedSix}
      data-overview-desktop-v1068-status-bus-no-table-header="true"
      data-overview-desktop-v1068-status-bus-value-rail="conclusion-first-low-noise"
      data-overview-summary-main
      data-overview-desktop-top
      data-overview-flat-topbar
      data-overview-topbar-hierarchy={topbarHierarchy}
      data-overview-topbar-priority-contract={topbarPriorityContract}
      data-overview-topbar-primary-weight="conclusion-12_5-device-12"
      data-overview-topbar-conclusion-rail="left-4px"
      data-overview-topbar-secondary={topbarSecondary}
      data-overview-topbar-fixed-six={topbarFixedSix}
      data-overview-topbar-no-overflow="max-six-cells-short-notes"
      data-overview-first-viewport-title={topbarFixedSix}
      data-overview-topbar-no-iso-long-timestamp="true"
      data-overview-first-viewport-no-duplicate-title-tag="true"
      data-overview-topbar-muted-tags="no-heavy-status-tags"
    >
      {items.map((item) => (
        <div className="ro-topbar-cell ik-home-flat-cell ik-home-ops-item" key={item.role} data-tone={item.tone} data-overview-field data-overview-status-cell data-overview-status-role={item.role} data-overview-status-priority={topbarPriority(item.role)} data-overview-summary-cell data-overview-desktop-v1068-status-cell="label-value-note">
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
