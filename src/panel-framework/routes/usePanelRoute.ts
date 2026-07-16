import { useCallback, useEffect, useState } from "react";
import { PANEL_ROUTES, routeFromLocation, routeUrl, type PanelRouteId } from "./panelRoutes";

function syncDocumentRoute(route: PanelRouteId) {
  const definition = PANEL_ROUTES[route];
  document.body.dataset.panelRoute = route;
  document.querySelectorAll<HTMLElement>("[data-section]").forEach((node) => {
    const active = node.dataset.section === route;
    node.classList.toggle("is-active", active);
    if (active) node.setAttribute("aria-current", "page");
    else node.removeAttribute("aria-current");
  });
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

  const navigate = useCallback((next: PanelRouteId, options?: { replace?: boolean }) => {
    if (next === route) return;
    const state = { ...(window.history.state || {}), panelRoute: next };
    if (options?.replace) window.history.replaceState(state, "", routeUrl(next));
    else window.history.pushState(state, "", routeUrl(next));
    window.dispatchEvent(new PopStateEvent("popstate", { state }));
  }, [route]);

  return { route, navigate, definition: PANEL_ROUTES[route] };
}

