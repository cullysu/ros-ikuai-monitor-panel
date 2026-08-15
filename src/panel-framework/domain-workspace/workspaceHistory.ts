import { useCallback, useEffect, useState } from "react";
import {
  navigationContextFromLocation,
  routeUrl,
  type PanelNavigationContext,
  type PanelRouteId,
} from "../routes/panelRoutes";

function objectContextFromUrl(): PanelNavigationContext {
  return navigationContextFromLocation(window.location);
}

function objectUrl(route: PanelRouteId, id: string | null): string {
  return routeUrl(route, window.location, { objectId: id });
}

/**
 * Owns browser history for a route object's full-screen/detail destination.
 * Selection state that does not create a destination must not use this hook.
 */
export function useObjectHistory(route: PanelRouteId) {
  const [context, setContext] = useState<PanelNavigationContext>(() => (
    typeof window === "undefined"
      ? { objectId: null, query: null, risk: null, returnRoute: null, evidenceAt: null }
      : objectContextFromUrl()
  ));
  const selectedId = context.objectId && context.objectId.startsWith(`${route}-`)
    ? context.objectId
    : "";

  useEffect(() => {
    const sync = () => setContext(objectContextFromUrl());
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [route]);

  const open = useCallback((id: string) => {
    const targetUrl = objectUrl(route, id);
    const state = { ...(window.history.state || {}), panelContextEntry: true, panelObject: id };
    window.history.pushState(state, "", targetUrl);
    window.scrollTo({ left: 0, top: 0, behavior: "auto" });
    window.dispatchEvent(new PopStateEvent("popstate", { state }));
  }, [route]);

  const replace = useCallback((id: string | null) => {
    const targetUrl = objectUrl(route, id);
    const state = {
      ...(window.history.state || {}),
      panelContextEntry: Boolean(id || context.risk),
      panelObject: id,
    };
    window.history.replaceState(state, "", targetUrl);
    window.dispatchEvent(new PopStateEvent("popstate", { state }));
  }, [context.risk, route]);

  const close = useCallback(() => {
    const currentState = window.history.state || {};
    if (currentState.panelContextEntry === true) {
      window.history.back();
      return;
    }
    if (context.returnRoute && context.returnRoute !== route) {
      const state = {
        ...currentState,
        panelRoute: context.returnRoute,
        panelContextEntry: false,
        panelObject: null,
      };
      const targetUrl = routeUrl(context.returnRoute, window.location, {
        objectId: null,
        query: null,
        risk: null,
        returnRoute: null,
        evidenceAt: null,
      });
      window.history.replaceState(state, "", targetUrl);
      window.dispatchEvent(new PopStateEvent("popstate", { state }));
      return;
    }
    replace(null);
  }, [context.returnRoute, replace, route]);

  return {
    selectedId,
    risk: context.risk,
    returnRoute: context.returnRoute,
    evidenceAt: context.evidenceAt,
    query: context.query,
    open,
    replace,
    close,
  };
}
