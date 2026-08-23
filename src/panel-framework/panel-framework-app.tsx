import { useLayoutEffect, useMemo } from "react";
import {
  deriveOverviewState,
  OVERVIEW_SCENARIO_KEYS,
  type DeriveOverviewOptions,
  type OverviewRawSnapshot,
  type OverviewScenarioKey,
} from "./overview";
import { OverviewPanel } from "./overview/OverviewPanel";
import { buildOverviewEvidenceModel } from "./overview/evidence-model/buildOverviewEvidenceModel";
import { RouterConnectionScreen } from "./connection/RouterConnectionScreen";
import { usePanelLargeTextMode } from "./responsive/textScale";
import { MobileReferenceConnection } from "./mobile-reference-ui/MobileReferenceConnection";
import { MobileReferenceNavigation, MobileReferenceSurface } from "./mobile-reference-ui/MobileReferenceSurface";
import { useMobilePanelSurface } from "./responsive/panelSurface";
import type { PanelNavigate, PanelRouteId } from "./routes/panelRoutes";
import { usePanelRoute } from "./routes/usePanelRoute";
import { PanelRuntimeChrome, PanelRuntimeEmptyState, PanelRuntimeNotice } from "./runtime/PanelRuntimeChrome";
import { validatePanelSnapshot } from "./runtime/panelRuntimeSchema";
import { usePanelRuntime } from "./runtime/usePanelRuntime";
import { OperationalSectionPage } from "./sections/OperationalSectionPage";
import { PanelTaskNavigation } from "./sections/PanelTaskNavigation";
import "./sections/section-console.css";

export interface PanelFrameworkAppProps {
  snapshot?: unknown;
  options?: DeriveOverviewOptions;
}

function isScenarioKey(value: unknown): value is OverviewScenarioKey {
  return typeof value === "string" && OVERVIEW_SCENARIO_KEYS.includes(value as OverviewScenarioKey);
}

function scenarioHintFromSnapshot(snapshot: OverviewRawSnapshot, options?: DeriveOverviewOptions): OverviewScenarioKey | undefined {
  if (options?.scenarioHint) return options.scenarioHint;
  const hint = snapshot.meta?.scaleScenario;
  return isScenarioKey(hint) ? hint : undefined;
}

function SnapshotSurface({
  snapshot,
  options,
  runtimeManaged = false,
  route,
  navigate,
  onShowConnection,
  onRefresh,
}: {
  snapshot: OverviewRawSnapshot;
  options?: DeriveOverviewOptions;
  runtimeManaged?: boolean;
  route: PanelRouteId;
  navigate: PanelNavigate;
  onShowConnection?: () => void;
  onRefresh?: () => void;
}) {
  const mobile = useMobilePanelSurface();
  const scenarioHint = scenarioHintFromSnapshot(snapshot, options);
  const state = useMemo(
    () =>
      deriveOverviewState(snapshot, {
        ...options,
        scenarioHint,
      }),
    [snapshot, options, scenarioHint]
  );
  const evidence = useMemo(() => buildOverviewEvidenceModel(snapshot, state), [snapshot, state]);

  return (
    <div className={`panel-app${mobile ? " panel-app-mobile" : " panel-app-desktop"}`} data-panel-app data-panel-surface={mobile ? "mobile" : "desktop"} data-active-section={route}>
      {mobile ? <section id={route === "overview" ? "overview" : undefined} className="section is-mobile-surface" data-overview-scene-key={state.scenario}><MobileReferenceSurface route={route} evidence={evidence} snapshot={snapshot} state={state} onNavigate={navigate} onRefresh={onRefresh} onShowConnection={onShowConnection} /></section> : route === "overview" ? <OverviewPanel snapshot={snapshot} state={state} onNavigate={navigate} runtimeManaged={runtimeManaged} /> : <OperationalSectionPage route={route} snapshot={snapshot} onNavigate={navigate} />}
      {mobile
        ? <MobileReferenceNavigation route={route} onNavigate={navigate} />
        : <PanelTaskNavigation route={route} onNavigate={navigate} />}
    </div>
  );
}

function SnapshotContractError({ issues }: { issues: string[] }) {
  return (
    <main className="panel-runtime-empty" data-panel-snapshot-contract="malformed" role="alert">
      <div aria-hidden="true">!</div>
      <h1>快照格式无法使用</h1>
      <p>{issues.join("；")}</p>
    </main>
  );
}

function StaticSnapshotApp({ snapshot, options }: { snapshot: unknown; options?: DeriveOverviewOptions }) {
  const { route, navigate } = usePanelRoute();
  const validated = validatePanelSnapshot(snapshot);
  if (!validated.ok) return <SnapshotContractError issues={validated.issues} />;
  return <SnapshotSurface snapshot={validated.value as OverviewRawSnapshot} options={options} route={route} navigate={navigate} />;
}

function LivePanelRuntime({ options }: { options?: DeriveOverviewOptions }) {
  const runtime = usePanelRuntime();
  const { route, navigate } = usePanelRoute();
  const mobile = useMobilePanelSurface();
  const { largeText, sentinelRef: textScaleSentinelRef } = usePanelLargeTextMode();
  useLayoutEffect(() => {
    if (!largeText) return;
    const frame = window.requestAnimationFrame(() => {
      const title = document.querySelector<HTMLElement>("[data-panel-route-title]");
      if (title && document.activeElement === title) {
        let scrollOwner: HTMLElement | null = title.parentElement;
        while (scrollOwner) {
          const overflowY = window.getComputedStyle(scrollOwner).overflowY;
          if (/(auto|scroll)/.test(overflowY) && scrollOwner.scrollHeight > scrollOwner.clientHeight + 1) break;
          scrollOwner = scrollOwner.parentElement;
        }
        if (scrollOwner) {
          const ownerRect = scrollOwner.getBoundingClientRect();
          const focusRegion = title.closest<HTMLElement>(".op__summary") || title.parentElement || title;
          const focusRegionRect = focusRegion.getBoundingClientRect();
          scrollOwner.scrollTo({
            behavior: "auto",
            top: Math.max(0, scrollOwner.scrollTop + focusRegionRect.top - ownerRect.top - 16),
          });
        } else {
          title.scrollIntoView({ behavior: "auto", block: "start", inline: "nearest" });
        }
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [largeText, route]);
  if (runtime.view === "connection" || runtime.connection.phase !== "ready") {
    if (!mobile) return <RouterConnectionScreen runtime={runtime} />;
    return (
      <div className="panel-runtime-live" data-panel-runtime-phase={runtime.snapshot.phase} data-panel-large-text={largeText ? "true" : "false"}>
        <span className="panel-text-scale-sentinel" aria-hidden="true" ref={textScaleSentinelRef}>M</span>
        <MobileReferenceConnection runtime={runtime} />
      </div>
    );
  }

  const runtimeBoundary = runtime.snapshot.phase === "stale" || runtime.snapshot.phase === "recovering" || runtime.snapshot.phase === "error"
    ? runtime.snapshot.phase
    : null;
  const boundedSnapshot = runtime.snapshot.data && runtimeBoundary
    ? {
        ...runtime.snapshot.data,
        meta: {
          ...runtime.snapshot.data.meta,
          clientEvidenceBoundary: runtimeBoundary,
        },
      }
    : runtime.snapshot.data;

  const boundedState = boundedSnapshot
    ? deriveOverviewState(boundedSnapshot, {
        ...options,
        scenarioHint: scenarioHintFromSnapshot(boundedSnapshot, options),
      })
    : null;
  const businessBoundaryAnnouncement = boundedState?.scenario === "no-snapshot"
    ? "当前业务快照不可用，当前业务数字已撤回；上次可信业务时间未记录"
    : boundedState?.scenario === "collection-down"
      ? "采集通道当前异常；管理面采集状态不能代替转发面或业务面判断"
      : null;

  const runtimeAnnouncement = businessBoundaryAnnouncement
    ? businessBoundaryAnnouncement
    : runtime.snapshot.phase === "current"
    ? "传输已更新，业务证据状态见当前页面"
    : runtime.snapshot.phase === "refreshing"
      ? "正在更新监控快照"
      : runtime.snapshot.phase === "stale"
        ? "监控快照已过期，当前业务数字不可视为实时"
        : runtime.snapshot.phase === "recovering"
          ? "正在恢复监控快照证据"
          : runtime.snapshot.phase === "error"
            ? "监控快照读取失败"
            : "正在读取监控快照";

  return (
    <div className="panel-runtime-live" data-panel-runtime-phase={runtime.snapshot.phase} data-panel-large-text={largeText ? "true" : "false"}>
      <span className="panel-text-scale-sentinel" aria-hidden="true" ref={textScaleSentinelRef}>M</span>
      <div
        className="panel-runtime-announcement"
        role={boundedState?.scenario === "no-snapshot" ? "alert" : "status"}
        aria-live={boundedState?.scenario === "no-snapshot" ? "assertive" : "polite"}
        aria-atomic="true"
        data-panel-business-boundary={boundedState?.scenario || "unknown"}
        style={{ position: "absolute", clip: "rect(0 0 0 0)" }}
      >
        {runtimeAnnouncement}
      </div>
      {!mobile ? <PanelRuntimeChrome runtime={runtime} route={route} onNavigate={navigate} /> : null}
      {!mobile ? <PanelRuntimeNotice runtime={runtime} /> : null}
      {boundedSnapshot ? (
        <SnapshotSurface snapshot={boundedSnapshot} options={options} runtimeManaged route={route} navigate={navigate} onShowConnection={runtime.showConnection} onRefresh={() => void runtime.refresh("manual")} />
      ) : (
        <PanelRuntimeEmptyState runtime={runtime} />
      )}
    </div>
  );
}

export function PanelFrameworkApp({ snapshot, options }: PanelFrameworkAppProps) {
  if (typeof snapshot !== "undefined") return <StaticSnapshotApp snapshot={snapshot} options={options} />;
  return <LivePanelRuntime options={options} />;
}
