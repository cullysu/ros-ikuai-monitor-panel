import { useMemo } from "react";
import {
  deriveOverviewState,
  OVERVIEW_SCENARIO_FIXTURES,
  OVERVIEW_SCENARIO_KEYS,
  type DeriveOverviewOptions,
  type OverviewRawSnapshot,
  type OverviewScenarioKey,
} from "./overview";
import { OverviewPanel } from "./overview/OverviewPanel";

export interface PanelFrameworkAppProps {
  snapshot?: unknown;
  options?: DeriveOverviewOptions;
}

function isScenarioKey(value: unknown): value is OverviewScenarioKey {
  return typeof value === "string" && OVERVIEW_SCENARIO_KEYS.includes(value as OverviewScenarioKey);
}

function normalizeSnapshot(snapshot: unknown): OverviewRawSnapshot {
  if (snapshot && typeof snapshot === "object") return snapshot as OverviewRawSnapshot;
  return OVERVIEW_SCENARIO_FIXTURES["no-snapshot"];
}

function scenarioHintFromSnapshot(snapshot: OverviewRawSnapshot, options?: DeriveOverviewOptions): OverviewScenarioKey | undefined {
  if (options?.scenarioHint) return options.scenarioHint;
  const hint = snapshot.meta?.scaleScenario;
  return isScenarioKey(hint) ? hint : undefined;
}

export function PanelFrameworkApp({ snapshot, options }: PanelFrameworkAppProps) {
  const normalizedSnapshot = normalizeSnapshot(snapshot);
  const scenarioHint = scenarioHintFromSnapshot(normalizedSnapshot, options);
  const state = useMemo(
    () =>
      deriveOverviewState(normalizedSnapshot, {
        ...options,
        scenarioHint,
      }),
    [normalizedSnapshot, options, scenarioHint]
  );

  return <OverviewPanel snapshot={normalizedSnapshot} state={state} />;
}
