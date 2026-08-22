import type { PanelNavigate } from "../../routes/panelRoutes";
import type { OverviewPanelProps } from "../index";
import { LegacyDesktopOverview } from "./LegacyDesktopOverview";

/**
 * Stable desktop entry. The rejected evidence-ledger presentation was removed;
 * this owner now delegates to the 192.168.3.5 iPad-style console.
 */
export interface DesktopOverviewScreenProps extends OverviewPanelProps {
  onNavigate: PanelNavigate;
  runtimeManaged?: boolean;
}

export function DesktopOverviewScreen(props: DesktopOverviewScreenProps) {
  return <LegacyDesktopOverview {...props} />;
}
