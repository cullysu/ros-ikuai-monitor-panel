import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

interface LensHistoryState {
  version: 1;
  scope: string;
  selectedId: string;
  scrollTop: number;
}

interface BrowserHistoryState {
  panelIncidentLens?: LensHistoryState;
  [key: string]: unknown;
}

export function incidentLensObjectDomId(objectId: string): string {
  return `incident-lens-claim-${encodeURIComponent(objectId)}`;
}

function browserState(): BrowserHistoryState {
  const state = window.history.state;
  return state && typeof state === "object" && !Array.isArray(state) ? state as BrowserHistoryState : {};
}

function rootFor(scope: string): HTMLElement | null {
  const root = document.querySelector(`[data-incident-lens-root][data-incident-lens-scope="${CSS.escape(scope)}"]`);
  return root instanceof HTMLElement ? root : null;
}

function historySelection(ids: Set<string>, scope: string): LensHistoryState | null {
  const candidate = browserState().panelIncidentLens;
  return candidate?.version === 1 && candidate.scope === scope && ids.has(candidate.selectedId) ? candidate : null;
}

export function useIncidentLensSelectionHistory(ids: string[], fallbackId: string, scope: string) {
  const validIds = useMemo(() => new Set(ids), [ids]);
  const fallback = validIds.has(fallbackId) ? fallbackId : ids[0] || "";
  const [selectedId, setSelectedId] = useState(() => historySelection(validIds, scope)?.selectedId || fallback);
  const pendingFocus = useRef<{ id: string; reveal: boolean; scrollTop?: number } | null>(null);

  useLayoutEffect(() => {
    if (!("scrollRestoration" in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  const select = useCallback((nextId: string) => {
    if (!validIds.has(nextId)) return;
    const root = rootFor(scope);
    const existing = browserState();
    const currentSelection = historySelection(validIds, scope);
    if (currentSelection) {
      window.history.replaceState({
        ...existing,
        panelIncidentLens: { ...currentSelection, scrollTop: root?.scrollTop || 0 },
      }, "", window.location.href);
    }
    const state: BrowserHistoryState = {
      ...browserState(),
      panelIncidentLens: { version: 1, scope, selectedId: nextId, scrollTop: root?.scrollTop || 0 },
    };
    window.history.pushState(state, "", window.location.href);
    pendingFocus.current = { id: nextId, reveal: true };
    setSelectedId(nextId);
  }, [scope, validIds]);

  useLayoutEffect(() => {
    if (!fallback) return;
    const current = historySelection(validIds, scope);
    if (current) return;
    window.history.replaceState({
      ...browserState(),
      panelIncidentLens: {
        version: 1,
        scope,
        selectedId: fallback,
        scrollTop: rootFor(scope)?.scrollTop || 0,
      },
    }, "", window.location.href);
  }, [fallback, scope, validIds]);

  useLayoutEffect(() => {
    const onPopState = () => {
      const saved = historySelection(validIds, scope);
      const next = saved?.selectedId || fallback;
      pendingFocus.current = { id: next, reveal: false, scrollTop: saved?.scrollTop };
      setSelectedId(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [fallback, scope, validIds]);

  useLayoutEffect(() => {
    if (!validIds.has(selectedId)) setSelectedId(fallback);
  }, [fallback, selectedId, validIds]);

  useLayoutEffect(() => {
    const root = rootFor(scope);
    if (!root) return;
    let frame = 0;
    const persist = () => {
      frame = 0;
      const current = historySelection(validIds, scope);
      if (!current || current.selectedId !== selectedId) return;
      window.history.replaceState({
        ...browserState(),
        panelIncidentLens: { ...current, scrollTop: root.scrollTop },
      }, "", window.location.href);
    };
    const onScroll = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(persist);
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    persist();
    return () => {
      root.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scope, selectedId, validIds]);

  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    const target = document.getElementById(incidentLensObjectDomId(pending.id));
    if (typeof pending.scrollTop === "number") rootFor(scope)?.scrollTo({ top: pending.scrollTop, behavior: "instant" });
    if (pending.reveal) target?.scrollIntoView({ block: "nearest", behavior: "instant" });
    target?.focus({ preventScroll: true });
  }, [selectedId]);

  return { selectedId, select };
}
