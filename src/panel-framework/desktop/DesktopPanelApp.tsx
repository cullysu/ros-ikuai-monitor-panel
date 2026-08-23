import { useMemo } from "react";
import { RouterConnectionScreen } from "../connection/RouterConnectionScreen";
import type { DeriveOverviewOptions, OverviewRawSnapshot } from "../overview";
import { DesktopOverviewScreen } from "../overview/desktop-overview/DesktopOverviewScreen";
import { usePanelRoute } from "../routes/usePanelRoute";
import { PanelRuntimeEmptyState, PanelRuntimeNotice } from "../runtime/PanelRuntimeShared";
import { OperationalSectionPage } from "../sections/OperationalSectionPage";
import { PanelTaskNavigation } from "../sections/PanelTaskNavigation";
import { deriveSurfaceState, PanelSnapshotContractError, RuntimeAnnouncement, useLiveSurface, validatedSnapshot, type PanelSurfaceAppProps } from "../surface/PanelSurfaceShared";
import { DesktopRuntimeChrome } from "./DesktopRuntimeChrome";

function DesktopSnapshotSurface({ snapshot, options, runtimeManaged = false }: { snapshot: OverviewRawSnapshot; options?: DeriveOverviewOptions; runtimeManaged?: boolean }) {
  const { route, navigate } = usePanelRoute();
  const state = useMemo(() => deriveSurfaceState(snapshot, options), [snapshot, options]);
  return <div className="panel-app panel-app-desktop" data-panel-app data-panel-surface="desktop" data-active-section={route}>
    {route === "overview" ? <section id="overview" className="section router-overview-framework ro-desktop-console ro-desktop-hierarchy" data-overview-scene-key={state.scenario}><DesktopOverviewScreen snapshot={snapshot} state={state} onNavigate={navigate} runtimeManaged={runtimeManaged} /></section> : <OperationalSectionPage route={route} snapshot={snapshot} onNavigate={navigate} />}
    <PanelTaskNavigation route={route} onNavigate={navigate} />
  </div>;
}

function StaticDesktopApp({ snapshot, options }: { snapshot: unknown; options?: DeriveOverviewOptions }) {
  const validated = validatedSnapshot(snapshot);
  if (!validated.value) return <PanelSnapshotContractError issues={validated.issues} />;
  return <DesktopSnapshotSurface snapshot={validated.value} options={options} />;
}

function LiveDesktopApp({ options }: { options?: DeriveOverviewOptions }) {
  const live = useLiveSurface(options);
  if (live.runtime.view === "connection" || live.runtime.connection.phase !== "ready") return <RouterConnectionScreen runtime={live.runtime} />;
  return <div className="panel-runtime-live" data-panel-runtime-phase={live.runtime.snapshot.phase} data-panel-large-text={live.largeText ? "true" : "false"} data-panel-surface="desktop">
    <span className="panel-text-scale-sentinel" aria-hidden="true" ref={live.textScaleSentinelRef}>M</span>
    <RuntimeAnnouncement state={live.state} text={live.announcement} />
    <DesktopRuntimeChrome runtime={live.runtime} route={live.route} onNavigate={live.navigate} />
    <PanelRuntimeNotice runtime={live.runtime} />
    {live.snapshot ? <DesktopSnapshotSurface snapshot={live.snapshot} options={options} runtimeManaged /> : <PanelRuntimeEmptyState runtime={live.runtime} />}
  </div>;
}

export function DesktopPanelApp({ snapshot, options }: PanelSurfaceAppProps) {
  return typeof snapshot !== "undefined" ? <StaticDesktopApp snapshot={snapshot} options={options} /> : <LiveDesktopApp options={options} />;
}
