import { useCallback, useEffect, useState } from "react";
import {
  PANEL_ROUTES,
  routeFromLocation,
  routeUrl,
  type PanelNavigateOptions,
  type PanelRouteId,
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
  if (canonical !== current) window.history.replaceState({ ...(window.history.state || {}), panelRoute: route }, "", canonical);
}

export function usePanelRoute() {
  const [route, setRoute] = useState<PanelRouteId>(() => typeof window === "undefined" ? "overview" : routeFromLocation(window.location));

  useEffect(() => {
    const sync = () => {
      const next = routeFromLocation(window.location);
      normalizeCurrentUrl(next);
      syncDocumentRoute(next);
      setRoute(next);
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  useEffect(() => {
    syncDocumentRoute(route);
    const frame = window.requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-panel-route-title]")?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [route]);

  const navigate = useCallback((next: PanelRouteId, options: PanelNavigateOptions = {}) => {
    if (next === route && options.objectId === undefined) return;
    const objectId = options.objectId || null;
    const currentObjectId = new URLSearchParams(window.location.search).get("object");
    if (next === route && currentObjectId === objectId) return;

    const state = { ...(window.history.state || {}), panelRoute: next };
    if (objectId) state.panelObject = objectId;
    else delete state.panelObject;

    const targetUrl = routeUrl(next, window.location, { objectId });
    if (options.replace) window.history.replaceState(state, "", targetUrl);
    else window.history.pushState(state, "", targetUrl);
    window.dispatchEvent(new PopStateEvent("popstate", { state }));
  }, [route]);

  return { route, navigate, definition: PANEL_ROUTES[route] };
}

