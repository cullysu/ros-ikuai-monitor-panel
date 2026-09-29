import { useLayoutEffect, useMemo, type RefCallback } from "react";
import {
  deriveOverviewState,
  OVERVIEW_SCENARIO_KEYS,
  type DeriveOverviewOptions,
  type OverviewDerivedState,
  type OverviewRawSnapshot,
  type OverviewScenarioKey,
} from "../overview";
import { usePanelLargeTextMode } from "../responsive/textScale";
import type { PanelNavigate, PanelRouteId } from "../routes/panelRoutes";
import { usePanelRoute } from "../routes/usePanelRoute";
import { validatePanelSnapshot } from "../runtime/panelRuntimeSchema";
import { usePanelRuntime, type PanelRuntimeController } from "../runtime/usePanelRuntime";

export interface PanelSurfaceAppProps {
  snapshot?: unknown;
  options?: DeriveOverviewOptions;
}

export function scenarioHintFromSnapshot(snapshot: OverviewRawSnapshot, options?: DeriveOverviewOptions): OverviewScenarioKey | undefined {
  if (options?.scenarioHint) return options.scenarioHint;
  const hint = snapshot.meta?.scaleScenario;
  return typeof hint === "string" && OVERVIEW_SCENARIO_KEYS.includes(hint as OverviewScenarioKey)
    ? hint as OverviewScenarioKey
    : undefined;
}

export function deriveSurfaceState(snapshot: OverviewRawSnapshot, options?: DeriveOverviewOptions): OverviewDerivedState {
  return deriveOverviewState(snapshot, { ...options, scenarioHint: scenarioHintFromSnapshot(snapshot, options) });
}

export function validatedSnapshot(snapshot: unknown): { value: OverviewRawSnapshot | null; issues: string[] } {
  const validated = validatePanelSnapshot(snapshot);
  return validated.ok
    ? { value: validated.value as OverviewRawSnapshot, issues: [] }
    : { value: null, issues: validated.issues };
}

export function PanelSnapshotContractError({ issues }: { issues: string[] }) {
  return <main className="panel-runtime-empty" data-panel-snapshot-contract="malformed" role="alert"><div aria-hidden="true">!</div><h1>快照格式无法使用</h1><p>{issues.join("；")}</p></main>;
}

function boundedSnapshot(runtime: PanelRuntimeController): OverviewRawSnapshot | null {
  const boundary = runtime.snapshot.phase === "stale" || runtime.snapshot.phase === "recovering" || runtime.snapshot.phase === "error"
    ? runtime.snapshot.phase
    : null;
  if (!runtime.snapshot.data) return null;
  return boundary ? { ...runtime.snapshot.data, meta: { ...runtime.snapshot.data.meta, clientEvidenceBoundary: boundary } } : runtime.snapshot.data;
}

function announcement(runtime: PanelRuntimeController, state: OverviewDerivedState | null): string {
  if (state?.scenario === "no-snapshot") return "当前业务快照不可用，当前业务数字已撤回；上次可信业务时间未记录";
  if (state?.scenario === "collection-down") return "采集通道当前异常；管理面采集状态不能代替转发面或业务面判断";
  if (runtime.snapshot.phase === "current") return "传输已更新，业务证据状态见当前页面";
  if (runtime.snapshot.phase === "refreshing") return "正在更新监控快照";
  if (runtime.snapshot.phase === "stale") return "监控快照已过期，当前业务数字不可视为实时";
  if (runtime.snapshot.phase === "recovering") return "正在恢复监控快照证据";
  if (runtime.snapshot.phase === "error") return "监控快照读取失败";
  return "正在读取监控快照";
}

export function useLiveSurface(options?: DeriveOverviewOptions): {
  runtime: PanelRuntimeController;
  route: PanelRouteId;
  navigate: PanelNavigate;
  largeText: boolean;
  textScaleSentinelRef: RefCallback<HTMLSpanElement>;
  snapshot: OverviewRawSnapshot | null;
  state: OverviewDerivedState | null;
  announcement: string;
} {
  const runtime = usePanelRuntime();
  const { route, navigate } = usePanelRoute();
  const { largeText, sentinelRef: textScaleSentinelRef } = usePanelLargeTextMode();
  const snapshot = boundedSnapshot(runtime);
  const state = useMemo(() => snapshot ? deriveSurfaceState(snapshot, options) : null, [snapshot, options]);

  useLayoutEffect(() => {
    if (!largeText) return;
    const frame = window.requestAnimationFrame(() => {
      const title = document.querySelector<HTMLElement>("[data-panel-route-title]");
      if (!title || document.activeElement !== title) return;
      let scrollOwner: HTMLElement | null = title.parentElement;
      while (scrollOwner) {
        const overflowY = window.getComputedStyle(scrollOwner).overflowY;
        if (/(auto|scroll)/.test(overflowY) && scrollOwner.scrollHeight > scrollOwner.clientHeight + 1) break;
        scrollOwner = scrollOwner.parentElement;
      }
      if (scrollOwner) {
        const ownerRect = scrollOwner.getBoundingClientRect();
        const focusRegion = title.parentElement || title;
        const focusRect = focusRegion.getBoundingClientRect();
        scrollOwner.scrollTo({ behavior: "auto", top: Math.max(0, scrollOwner.scrollTop + focusRect.top - ownerRect.top - 16) });
      } else title.scrollIntoView({ behavior: "auto", block: "start", inline: "nearest" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [largeText, route]);

  return { runtime, route, navigate, largeText, textScaleSentinelRef, snapshot, state, announcement: announcement(runtime, state) };
}

export function RuntimeAnnouncement({ state, text }: { state: OverviewDerivedState | null; text: string }) {
  const critical = state?.scenario === "no-snapshot";
  return <div className="panel-runtime-announcement" role={critical ? "alert" : "status"} aria-live={critical ? "assertive" : "polite"} aria-atomic="true" data-panel-business-boundary={state?.scenario || "unknown"} style={{ position: "absolute", clip: "rect(0 0 0 0)" }}>{text}</div>;
}
