import { FileText, Gauge, Network, Users } from "lucide-react";
import type { PanelNavigate, PanelRouteId } from "../../routes/panelRoutes";
import "../styles/flow-navigation.css";

const ITEMS: ReadonlyArray<{ id: string; label: string; route: PanelRouteId; routes: readonly PanelRouteId[]; Icon: typeof Gauge }> = [
  { id: "overview", label: "概览", route: "overview", routes: ["overview"], Icon: Gauge },
  { id: "network", label: "网络", route: "lineStatus", routes: ["lineStatus", "interfaces", "balance", "routes", "connections", "trafficAudit", "dns4", "dns6"], Icon: Network },
  { id: "terminals", label: "终端", route: "dhcp", routes: ["dhcp", "arp"], Icon: Users },
  { id: "logs", label: "日志", route: "logs", routes: ["logs", "serviceLogs", "readonlyDiagnostics", "security", "trafficLoad", "loadAudit", "more"], Icon: FileText },
];

export function MobileFlowNavigation({ route, onNavigate }: { route: PanelRouteId; onNavigate: PanelNavigate }) {
  return <nav className="mflow-tabs" aria-label="主要导航" data-mobile-flow-navigation>{ITEMS.map(({ id, label, route: destination, routes, Icon }) => { const selected = routes.includes(route); return <button type="button" key={id} data-selected={selected || undefined} aria-current={selected ? "page" : undefined} onClick={() => onNavigate(destination)}><Icon size={19} strokeWidth={selected ? 2.3 : 1.75} /><span>{label}</span></button>; })}</nav>;
}
export default MobileFlowNavigation;
