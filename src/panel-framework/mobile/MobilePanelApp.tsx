import { useMemo } from "react";
import type { DeriveOverviewOptions, OverviewRawSnapshot } from "../overview";
import { buildOverviewEvidenceModel } from "../overview/evidence-model/buildOverviewEvidenceModel";
import { MobileReferenceConnection } from "../mobile-reference-ui/MobileReferenceConnection";
import { MobileReferenceNavigation, MobileReferenceSurface } from "../mobile-reference-ui/MobileReferenceSurface";
import { usePanelRoute } from "../routes/usePanelRoute";
import type { PanelRuntimeController } from "../runtime/usePanelRuntime";
import { PanelRuntimeEmptyState } from "../runtime/PanelRuntimeShared";
import { deriveSurfaceState, PanelSnapshotContractError, RuntimeAnnouncement, useLiveSurface, validatedSnapshot, type PanelSurfaceAppProps } from "../surface/PanelSurfaceShared";

function MobileSnapshotSurface({ snapshot, options, runtime }: { snapshot: OverviewRawSnapshot; options?: DeriveOverviewOptions; runtime?: PanelRuntimeController }) {
  const { route, navigate, context } = usePanelRoute();
  const state = useMemo(() => deriveSurfaceState(snapshot, options), [snapshot, options]);
  const evidence = useMemo(() => buildOverviewEvidenceModel(snapshot, state), [snapshot, state]);
  return <div className="panel-app panel-app-mobile" data-panel-app data-panel-surface="mobile" data-active-section={route}>
    <section id={route === "overview" ? "overview" : undefined} className="section is-mobile-surface" data-panel-route-content={route === "overview" ? undefined : route} data-overview-scene-key={state.scenario}><MobileReferenceSurface route={route} navigationContext={context} evidence={evidence} snapshot={snapshot} state={state} onNavigate={navigate} onRefresh={runtime ? () => void runtime.refresh("manual") : undefined} onShowConnection={runtime?.showConnection} /></section>
    <MobileReferenceNavigation route={route} onNavigate={navigate} />
  </div>;
}

function StaticMobileApp({ snapshot, options }: { snapshot: unknown; options?: DeriveOverviewOptions }) {
  const validated = validatedSnapshot(snapshot);
  if (!validated.value) return <PanelSnapshotContractError issues={validated.issues} />;
  return <MobileSnapshotSurface snapshot={validated.value} options={options} />;
}

function LiveMobileApp({ options }: { options?: DeriveOverviewOptions }) {
  const live = useLiveSurface(options);
  if (live.runtime.view === "connection" || live.runtime.connection.phase !== "ready") return <div className="panel-runtime-live" data-panel-runtime-phase={live.runtime.snapshot.phase} data-panel-large-text={live.largeText ? "true" : "false"} data-panel-surface="mobile"><span className="panel-text-scale-sentinel" aria-hidden="true" ref={live.textScaleSentinelRef}>M</span><MobileReferenceConnection runtime={live.runtime} /></div>;
  return <div className="panel-runtime-live" data-panel-runtime-phase={live.runtime.snapshot.phase} data-panel-large-text={live.largeText ? "true" : "false"} data-panel-surface="mobile">
    <span className="panel-text-scale-sentinel" aria-hidden="true" ref={live.textScaleSentinelRef}>M</span>
    <RuntimeAnnouncement state={live.state} text={live.announcement} />
    {live.snapshot ? <MobileSnapshotSurface snapshot={live.snapshot} options={options} runtime={live.runtime} /> : <PanelRuntimeEmptyState runtime={live.runtime} />}
  </div>;
}

export function MobilePanelApp({ snapshot, options }: PanelSurfaceAppProps) {
  return typeof snapshot !== "undefined" ? <StaticMobileApp snapshot={snapshot} options={options} /> : <LiveMobileApp options={options} />;
}
