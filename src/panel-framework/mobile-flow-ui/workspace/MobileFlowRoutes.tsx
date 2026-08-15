import { ChevronRight, Cpu, Network, Router, ShieldCheck, Users } from "lucide-react";
import { useMemo } from "react";
import { domainDefinitionFor } from "../../domain-workspace/domainDefinitions";
import { rowsFromModel } from "../../domain-workspace/workspaceRows";
import type { OverviewRawSnapshot } from "../../overview";
import { PANEL_ROUTES, type PanelNavigate, type PanelRouteId } from "../../routes/panelRoutes";
import { buildSectionModel } from "../../sections/sectionModels";
import { MobileFlowWorkspace } from "./MobileFlowWorkspace";
import "../styles/flow-directory.css";

export interface MobileFlowRoutesProps {
  route: Exclude<PanelRouteId, "overview">;
  snapshot: OverviewRawSnapshot;
  onNavigate: PanelNavigate;
  onShowConnection?: () => void;
}

const GROUPS: ReadonlyArray<{ label: string; Icon: typeof Network; routes: readonly PanelRouteId[] }> = [
  { label: "网络与转发", Icon: Network, routes: ["lineStatus", "interfaces", "balance", "routes", "connections", "trafficAudit"] },
  { label: "终端与地址", Icon: Users, routes: ["dhcp", "arp"] },
  { label: "系统与证据", Icon: Cpu, routes: ["trafficLoad", "loadAudit", "dns4", "dns6", "security", "serviceLogs", "readonlyDiagnostics"] },
];

function Directory({ onNavigate, onShowConnection }: Pick<MobileFlowRoutesProps, "onNavigate" | "onShowConnection">) {
  return <main className="mflow-directory" data-mobile-flow-workspace="more" data-panel-route-content="more">
    <header className="mflow-directory__title"><p>只读运维</p><h1 data-panel-route-title tabIndex={-1}>更多</h1></header>
    {onShowConnection ? <section className="mflow-directory__group" aria-labelledby="mflow-device-title"><h2 id="mflow-device-title"><Router size={17} aria-hidden="true" />设备</h2><button type="button" onClick={onShowConnection}><span className="mflow-directory__icon"><ShieldCheck size={18} aria-hidden="true" /></span><span><b>RouterOS 连接</b><small>地址、REST、SSH 与设备身份</small></span><ChevronRight size={18} aria-hidden="true" /></button></section> : null}
    {GROUPS.map(({ label, Icon, routes }) => <section className="mflow-directory__group" key={label} aria-labelledby={`mflow-${label}`}><h2 id={`mflow-${label}`}><Icon size={17} aria-hidden="true" />{label}</h2>{routes.map((destination) => <button type="button" key={destination} onClick={() => onNavigate(destination)}><span><b>{PANEL_ROUTES[destination].title}</b><small>{PANEL_ROUTES[destination].description}</small></span><ChevronRight size={18} aria-hidden="true" /></button>)}</section>)}
  </main>;
}

function WorkspaceRoute({ route, snapshot }: Omit<MobileFlowRoutesProps, "onShowConnection" | "onNavigate"> & { route: Exclude<PanelRouteId, "overview" | "more"> }) {
  const model = useMemo(() => buildSectionModel(route, snapshot), [route, snapshot]);
  const definition = useMemo(() => domainDefinitionFor(route), [route]);
  const rows = useMemo(() => rowsFromModel(route, model), [route, model]);
  const filters = useMemo(() => definition.filters.filter((item) => item.id !== "all").map(({ id, label, matches }) => ({ id, label, matches })), [definition]);
  return <MobileFlowWorkspace route={route} title={definition.objectLabel} sectionTitle={PANEL_ROUTES[route].title} rows={rows} filters={filters} evidenceMode={model.evidenceMode} observedAt={model.observedAt} />;
}

export function MobileFlowRoutes({ route, snapshot, onNavigate, onShowConnection }: MobileFlowRoutesProps) {
  if (route === "more") return <Directory onNavigate={onNavigate} onShowConnection={onShowConnection} />;
  return <WorkspaceRoute route={route} snapshot={snapshot} />;
}

export default MobileFlowRoutes;
