import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

const OPTICAL_PATROL_HISTORY_VERSION = 1 as const;
const FOCUS_RESTORE_ATTEMPTS = 2 as const;

interface OpticalPatrolHistoryState {
  version: typeof OPTICAL_PATROL_HISTORY_VERSION;
  scope: string;
  selectedId: string;
  scroll?: OpticalPatrolScrollPosition;
}

interface OpticalPatrolScrollPosition {
  rootLeft: number;
  rootTop: number;
  windowLeft: number;
  windowTop: number;
}

interface PanelHistoryState {
  panelOpticalPatrol?: OpticalPatrolHistoryState;
  [key: string]: unknown;
}

/**
 * DOM contract for the programmatically focusable selected-claim target.
 * The rendered owner must use this exact id and remain focusable after the
 * selected claim is reopened by browser history traversal.
 */
export function opticalPatrolClaimDomId(claimId: string): string {
  return `optical-claim-${encodeURIComponent(claimId)}`;
}

function currentPanelHistoryState(): PanelHistoryState {
  const state = window.history.state;
  return state && typeof state === "object" && !Array.isArray(state)
    ? state as PanelHistoryState
    : {};
}

function selectedIdFromHistory(validIds: Set<string>, scope: string): string | null {
  if (typeof window === "undefined") return null;
  const candidate = currentPanelHistoryState().panelOpticalPatrol;
  if (
    candidate?.version !== OPTICAL_PATROL_HISTORY_VERSION
    || candidate.scope !== scope
    || typeof candidate.selectedId !== "string"
  ) return null;
  return validIds.has(candidate.selectedId) ? candidate.selectedId : null;
}

function opticalPatrolRoot(): HTMLElement | null {
  const root = document.querySelector("[data-optical-patrol-root]");
  return root instanceof HTMLElement ? root : null;
}

function finiteScrollValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function scrollPositionFromHistory(validIds: Set<string>, scope: string): OpticalPatrolScrollPosition | null {
  const candidate = currentPanelHistoryState().panelOpticalPatrol;
  if (
    candidate?.version !== OPTICAL_PATROL_HISTORY_VERSION
    || candidate.scope !== scope
    || typeof candidate.selectedId !== "string"
    || !validIds.has(candidate.selectedId)
    || !candidate.scroll
  ) return null;
  const rootLeft = finiteScrollValue(candidate.scroll.rootLeft);
  const rootTop = finiteScrollValue(candidate.scroll.rootTop);
  const windowLeft = finiteScrollValue(candidate.scroll.windowLeft);
  const windowTop = finiteScrollValue(candidate.scroll.windowTop);
  return rootLeft === null || rootTop === null || windowLeft === null || windowTop === null
    ? null
    : { rootLeft, rootTop, windowLeft, windowTop };
}

function captureScrollPosition(): OpticalPatrolScrollPosition {
  const root = opticalPatrolRoot();
  return {
    rootLeft: root?.scrollLeft ?? 0,
    rootTop: root?.scrollTop ?? 0,
    windowLeft: window.scrollX,
    windowTop: window.scrollY,
  };
}

function restoreScrollPosition(scroll: OpticalPatrolScrollPosition): void {
  opticalPatrolRoot()?.scrollTo({ left: scroll.rootLeft, top: scroll.rootTop, behavior: "instant" });
  window.scrollTo({ left: scroll.windowLeft, top: scroll.windowTop, behavior: "instant" });
}

function historyStateForSelection(
  selectedId: string,
  scope: string,
  scroll?: OpticalPatrolScrollPosition,
): PanelHistoryState {
  return {
    ...currentPanelHistoryState(),
    panelOpticalPatrol: {
      version: OPTICAL_PATROL_HISTORY_VERSION,
      scope,
      selectedId,
      ...(scroll ? { scroll } : {}),
    },
  };
}

function persistCurrentEntryScroll(selectedId: string | null, scope: string): void {
  if (!selectedId) return;
  window.history.replaceState(
    historyStateForSelection(selectedId, scope, captureScrollPosition()),
    "",
    window.location.href,
  );
}

/**
 * Stores the expanded claim in the current browser entry. Selecting a new
 * claim creates one entry; Back and Forward restore the claim and its focus.
 */
export function useOpticalPatrolSelectionHistory(ids: string[], fallback: string | null, scope: string) {
  const validIds = useMemo(() => new Set(ids), [ids]);
  const fallbackId = fallback && validIds.has(fallback)
    ? fallback
    : ids[0] ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(() => (
    selectedIdFromHistory(validIds, scope) ?? fallbackId
  ));
  const [focusRequest, setFocusRequest] = useState(0);
  const selectedIdRef = useRef(selectedId);
  const pendingFocusIdRef = useRef<string | null>(null);
  const pendingScrollRestoreRef = useRef<OpticalPatrolScrollPosition | null>(null);

  useLayoutEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useLayoutEffect(() => {
    const restoreSelection = () => {
      const nextId = selectedIdFromHistory(validIds, scope) ?? fallbackId;
      selectedIdRef.current = nextId;
      pendingFocusIdRef.current = nextId;
      pendingScrollRestoreRef.current = scrollPositionFromHistory(validIds, scope);
      setSelectedId(nextId);
      setFocusRequest((request) => request + 1);
    };

    const nextId = selectedIdFromHistory(validIds, scope) ?? fallbackId;
    selectedIdRef.current = nextId;
    pendingScrollRestoreRef.current = null;
    setSelectedId(nextId);
    window.addEventListener("popstate", restoreSelection);
    return () => window.removeEventListener("popstate", restoreSelection);
  }, [fallbackId, scope, validIds]);

  useLayoutEffect(() => {
    if (!selectedId || typeof window === "undefined") return;
    if (selectedIdFromHistory(validIds, scope) === selectedId) return;
    window.history.replaceState(
      historyStateForSelection(selectedId, scope),
      "",
      window.location.href,
    );
  }, [scope, selectedId, validIds]);

  useLayoutEffect(() => {
    if (!selectedId || pendingFocusIdRef.current !== selectedId || typeof window === "undefined") return;

    let frame = 0;
    let attemptsRemaining = FOCUS_RESTORE_ATTEMPTS;
    const focusClaim = () => {
      const claim = document.getElementById(opticalPatrolClaimDomId(selectedId));
      if (claim instanceof HTMLElement) {
        const restoreScroll = pendingScrollRestoreRef.current;
        if (restoreScroll) {
          restoreScrollPosition(restoreScroll);
        } else {
          claim.scrollIntoView({ behavior: "instant", block: "start", inline: "nearest" });
        }
        claim.focus({ preventScroll: true });
        pendingFocusIdRef.current = null;
        pendingScrollRestoreRef.current = null;
        persistCurrentEntryScroll(selectedId, scope);
        return;
      }
      attemptsRemaining -= 1;
      if (attemptsRemaining > 0) frame = window.requestAnimationFrame(focusClaim);
    };
    frame = window.requestAnimationFrame(focusClaim);
    return () => window.cancelAnimationFrame(frame);
  }, [focusRequest, scope, selectedId]);

  const select = useCallback((nextId: string) => {
    if (!validIds.has(nextId)) return;

    if (nextId === selectedIdRef.current) {
      if (selectedIdFromHistory(validIds, scope) !== nextId) {
        persistCurrentEntryScroll(nextId, scope);
      }
      return;
    }

    persistCurrentEntryScroll(selectedIdRef.current, scope);
    if (selectedIdFromHistory(validIds, scope) !== nextId) {
      window.history.pushState(
        historyStateForSelection(nextId, scope),
        "",
        window.location.href,
      );
    }
    selectedIdRef.current = nextId;
    pendingFocusIdRef.current = nextId;
    pendingScrollRestoreRef.current = null;
    setSelectedId(nextId);
    setFocusRequest((request) => request + 1);
  }, [scope, validIds]);

  return [selectedId, select] as const;
}
