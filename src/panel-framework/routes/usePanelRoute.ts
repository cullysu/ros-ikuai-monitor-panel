import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  isPanelEvidenceTimestamp,
  navigationContextFromLocation,
  PANEL_ROUTES,
  routeFromLocation,
  routeUrl,
  type PanelNavigateOptions,
  type PanelRouteId,
  withoutPanelWorkspaceHistoryState,
} from "./panelRoutes";

type MobileScrollState = { viewport: number; regions: Record<string, number> };
const routeScrollMemory = new Map<PanelRouteId, MobileScrollState>();

function syncDocumentRoute(route: PanelRouteId) {
  const definition = PANEL_ROUTES[route];
  document.body.dataset.panelRoute = route;
  const pageTitle = document.getElementById("pageTitle");
  if (pageTitle) pageTitle.textContent = definition.title;
  const pageSubtitle = document.getElementById("pageSubtitle");
  if (pageSubtitle) {
    pageSubtitle.textContent = definition.description;
    pageSubtitle.classList.remove("is-hidden");
  }
  document.title = `${definition.title} · RouterOS 只读面板`;
}

function normalizeCurrentUrl(route: PanelRouteId) {
  const canonical = routeUrl(route);
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const currentState = window.history.state || {};
  const hasWorkspace = Object.prototype.hasOwnProperty.call(currentState, "panelWorkspace");
  const state = hasWorkspace && currentState.panelWorkspace?.route !== route
    ? withoutPanelWorkspaceHistoryState(currentState)
    : currentState;
  if (canonical !== current || state !== currentState) window.history.replaceState({ ...state, panelRoute: route }, "", canonical);
}

function captureMobileScroll(): MobileScrollState {
  const regions: Record<string, number> = {};
  document.querySelectorAll<HTMLElement>("[data-origin-space-scroll]").forEach((element) => {
    const key = element.dataset.originSpaceScroll;
    if (key) regions[key] = Math.max(0, Math.trunc(element.scrollTop));
  });
  const root = document.querySelector<HTMLElement>("[data-panel-app] > [data-origin-space-route], [data-panel-app] > .section > [data-origin-space-scroll]");
  return { viewport: Math.max(0, Math.trunc(root?.scrollTop || window.scrollY)), regions };
}

function stateWithCapturedScroll(state: Record<string, unknown>) {
  return { ...state, panelMobileScroll: captureMobileScroll() };
}

function restoreMobileScroll(state: unknown) {
  const saved = state && typeof state === "object" ? (state as { panelMobileScroll?: Partial<MobileScrollState> }).panelMobileScroll : null;
  if (!saved) return;
  const restore = () => {
    const root = document.querySelector<HTMLElement>("[data-panel-app] > [data-origin-space-route], [data-panel-app] > .section > [data-origin-space-scroll]");
    if (root) root.scrollTop = typeof saved.viewport === "number" ? saved.viewport : 0;
    else window.scrollTo({ left: 0, top: typeof saved.viewport === "number" ? saved.viewport : 0, behavior: "auto" });
    if (saved.regions && typeof saved.regions === "object") {
      Object.entries(saved.regions).forEach(([key, scrollTop]) => {
        const element = document.querySelector<HTMLElement>(`[data-origin-space-scroll="${key}"]`);
        if (element && typeof scrollTop === "number") element.scrollTop = Math.max(0, scrollTop);
      });
    }
  };
  requestAnimationFrame(() => { restore(); requestAnimationFrame(restore); });
}

function focusWhenMounted(selector: string, focusId: string | null) {
  const attempt = () => {
    const target = focusId ? document.getElementById(focusId) : document.querySelector<HTMLElement>(selector);
    if (!target) return false;
    target.focus({ preventScroll: true });
    return true;
  };
  if (attempt()) return;
  const observer = new MutationObserver(() => { if (attempt()) observer.disconnect(); });
  observer.observe(document.getElementById("app") || document.body, { childList: true, subtree: true });
  requestAnimationFrame(() => { if (attempt()) observer.disconnect(); });
  return () => observer.disconnect();
}

export function usePanelRoute() {
  const [route, setRoute] = useState<PanelRouteId>(() => typeof window === "undefined" ? "overview" : routeFromLocation(window.location));
  const [entryKey, setEntryKey] = useState(0);
  const overviewReturnFocusRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const markKeyboardInput = (event: KeyboardEvent) => {
      if (event.key === "Tab" || event.key === "Enter" || event.key === " " || event.key.startsWith("Arrow")) document.documentElement.dataset.panelInputModality = "keyboard";
    };
    const markPointerInput = () => { document.documentElement.dataset.panelInputModality = "pointer"; };
    const sync = () => {
      const next = routeFromLocation(window.location);
      normalizeCurrentUrl(next);
      syncDocumentRoute(next);
      setRoute(next);
      setEntryKey((value) => value + 1);
    };
    sync();
    window.addEventListener("keydown", markKeyboardInput, true);
    window.addEventListener("pointerdown", markPointerInput, true);
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("keydown", markKeyboardInput, true);
      window.removeEventListener("pointerdown", markPointerInput, true);
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  useLayoutEffect(() => {
    syncDocumentRoute(route);
    const state = (window.history.state || {}) as { panelFocus?: unknown; panelObject?: unknown };
    const focusId = typeof state.panelFocus === "string"
      ? state.panelFocus
      : route === "overview" ? overviewReturnFocusRef.current : null;
    const selector = typeof state.panelObject === "string"
      ? "[data-origin-space-detail-title]"
      : "[data-panel-route-title]";
    const disconnect = focusWhenMounted(selector, focusId);
    restoreMobileScroll(window.history.state);
    return disconnect;
  }, [route, entryKey]);

  useLayoutEffect(() => {
    let frame = 0;
    const persist = () => {
      frame = 0;
      const current = (window.history.state || {}) as Record<string, unknown>;
      window.history.replaceState(stateWithCapturedScroll(current), "", window.location.href);
    };
    const schedule = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(persist);
    };
    document.addEventListener("scroll", schedule, true);
    return () => {
      document.removeEventListener("scroll", schedule, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const navigate = useCallback((next: PanelRouteId, options: PanelNavigateOptions = {}) => {
    const objectId = options.objectId || null;
    const risk = options.risk || null;
    const focusId = options.focusId?.trim() || null;
    const contextual = Boolean(objectId || risk || (options.returnRoute && isPanelEvidenceTimestamp(options.evidenceAt)));
    const targetUrl = routeUrl(next, window.location, {
      objectId,
      query: contextual ? options.query || null : null,
      risk,
      returnRoute: contextual ? options.returnRoute || null : null,
      evidenceAt: contextual ? options.evidenceAt || null : null,
    });
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next === route && currentUrl === targetUrl) return;
    if (!options.replace && route === "overview") overviewReturnFocusRef.current = focusId;

    const currentState = (window.history.state || {}) as Record<string, unknown>;
    const currentScroll = captureMobileScroll();
    routeScrollMemory.set(route, currentScroll);
    // A detail entry is a real history entry. Store focus and every owned scroll
    // region on the source entry so Back and Forward restore the same task state.
    if (!options.replace) window.history.replaceState(stateWithCapturedScroll({ ...currentState, panelFocus: focusId }), "", currentUrl);
    const previousState = next === route ? currentState : withoutPanelWorkspaceHistoryState(currentState);
    const state = {
      ...previousState,
      panelRoute: next,
      panelContextEntry: contextual,
      panelObject: objectId,
      panelFocus: null,
      panelMobileScroll: routeScrollMemory.get(next) || { viewport: 0, regions: {} },
      panelReturnRoute: next === "more" && route === "overview" ? "overview" : null,
    };
    const currentCanonicalUrl = `${window.location.pathname}${window.location.search}`;
    const replaceHashOnlyUrl = next === route && Boolean(window.location.hash) && currentCanonicalUrl === targetUrl;
    if (options.replace || replaceHashOnlyUrl) window.history.replaceState(state, "", targetUrl);
    else window.history.pushState(state, "", targetUrl);
    if (!replaceHashOnlyUrl) {
      const root = document.querySelector<HTMLElement>("[data-panel-app] > [data-origin-space-route], [data-panel-app] > .section > [data-origin-space-scroll]");
      if (root) root.scrollTop = 0;
      else window.scrollTo({ left: 0, top: 0, behavior: "auto" });
    }
    window.dispatchEvent(new PopStateEvent("popstate", { state }));
  }, [route]);

  const context = typeof window === "undefined"
    ? { objectId: null, query: null, risk: null, returnRoute: null, evidenceAt: null }
    : navigationContextFromLocation(window.location);
  return { route, navigate, context, definition: PANEL_ROUTES[route] };
}
