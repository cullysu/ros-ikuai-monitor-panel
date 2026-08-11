import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  isPanelEvidenceTimestamp,
  PANEL_ROUTES,
  routeFromLocation,
  routeUrl,
  type PanelNavigateOptions,
  type PanelRouteId,
  withoutPanelWorkspaceHistoryState,
} from "./panelRoutes";

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

export function usePanelRoute() {
  const [route, setRoute] = useState<PanelRouteId>(() => typeof window === "undefined" ? "overview" : routeFromLocation(window.location));
  const overviewReturnFocusRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const sync = () => {
      const next = routeFromLocation(window.location);
      normalizeCurrentUrl(next);
      syncDocumentRoute(next);
      setRoute(next);
    };
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  useLayoutEffect(() => {
    syncDocumentRoute(route);
    const focusRouteTarget = () => {
      const focusId = route === "overview"
        ? (typeof window.history.state?.panelFocus === "string" ? window.history.state.panelFocus : overviewReturnFocusRef.current) || ""
        : "";
      if (focusId) {
        const control = document.getElementById(focusId);
        if (control) {
          control.focus({ preventScroll: true });
          return true;
        }
        return false;
      }
      const title = document.querySelector<HTMLElement>("[data-panel-route-title]");
      if (!title) return false;
      title.focus({ preventScroll: true });
      return true;
    };
    if (focusRouteTarget()) return;
    const observer = new MutationObserver(() => {
      if (focusRouteTarget()) observer.disconnect();
    });
    observer.observe(document.getElementById("app") || document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [route]);

  const navigate = useCallback((next: PanelRouteId, options: PanelNavigateOptions = {}) => {
    const objectId = options.objectId || null;
    const risk = options.risk || null;
    const focusId = options.focusId?.trim() || null;
    const contextual = Boolean(
      objectId || risk || (options.returnRoute && isPanelEvidenceTimestamp(options.evidenceAt)),
    );
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
    const previousState = next === route
      ? (window.history.state || {})
      : withoutPanelWorkspaceHistoryState(window.history.state);
    const state = {
      ...previousState,
      panelRoute: next,
      panelContextEntry: contextual,
      panelObject: objectId,
      panelFocus: null,
    };

    const currentCanonicalUrl = `${window.location.pathname}${window.location.search}`;
    const replaceHashOnlyUrl = next === route && Boolean(window.location.hash) && currentCanonicalUrl === targetUrl;
    if (options.replace || replaceHashOnlyUrl) window.history.replaceState(state, "", targetUrl);
    else window.history.pushState(state, "", targetUrl);
    if (!replaceHashOnlyUrl) window.scrollTo({ left: 0, top: 0, behavior: "auto" });
    window.dispatchEvent(new PopStateEvent("popstate", { state }));
  }, [route]);

  return { route, navigate, definition: PANEL_ROUTES[route] };
}
