import { useMemo } from "react";
import {
  deriveOverviewState,
  OVERVIEW_SCENARIO_KEYS,
  type DeriveOverviewOptions,
  type OverviewRawSnapshot,
  type OverviewScenarioKey,
} from "./overview";
import { OverviewPanel } from "./overview/OverviewPanel";
import { RouterConnectionScreen } from "./connection/RouterConnectionScreen";
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

function SnapshotSurface({ snapshot, options, runtimeManaged = false }: { snapshot: OverviewRawSnapshot; options?: DeriveOverviewOptions; runtimeManaged?: boolean }) {
  const { route, navigate } = usePanelRoute();
  const scenarioHint = scenarioHintFromSnapshot(snapshot, options);
  const state = useMemo(
    () =>
      deriveOverviewState(snapshot, {
        ...options,
        scenarioHint,
      }),
    [snapshot, options, scenarioHint]
  );

  return (
    <div className="panel-app" data-panel-app data-active-section={route}>
      {route === "overview" ? (
        <OverviewPanel snapshot={snapshot} state={state} onNavigate={navigate} runtimeManaged={runtimeManaged} />
      ) : (
        <OperationalSectionPage route={route} snapshot={snapshot} onNavigate={navigate} />
      )}
      <PanelTaskNavigation route={route} onNavigate={navigate} />
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
  const validated = validatePanelSnapshot(snapshot);
  if (!validated.ok) return <SnapshotContractError issues={validated.issues} />;
  return <SnapshotSurface snapshot={validated.value as OverviewRawSnapshot} options={options} />;
}

function LivePanelRuntime({ options }: { options?: DeriveOverviewOptions }) {
  const runtime = usePanelRuntime();
  if (runtime.view === "connection" || runtime.connection.phase !== "ready") {
    return <RouterConnectionScreen runtime={runtime} />;
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

  return (
    <div className="panel-runtime-live" data-panel-runtime-phase={runtime.snapshot.phase}>
      <PanelRuntimeChrome runtime={runtime} />
      <PanelRuntimeNotice runtime={runtime} />
      {boundedSnapshot ? (
        <SnapshotSurface snapshot={boundedSnapshot} options={options} runtimeManaged />
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
