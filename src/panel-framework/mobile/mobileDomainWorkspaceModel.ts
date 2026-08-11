import {
  Cable,
  CircleAlert,
  Gauge,
  Network,
  Router,
  ScrollText,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import type { OverviewTone } from "../overview";
import {
  PANEL_ROUTES,
  createPanelWorkspaceHistoryState,
  navigationContextFromLocation,
  panelWorkspaceStateFromHistoryState,
  routeUrl,
  type PanelNavigationContext,
  type PanelRiskContext,
  type PanelRouteId,
  type PanelWorkspaceHistoryState,
  type PanelWorkspaceHistoryUpdate,
} from "../routes/panelRoutes";
import type { WorkspaceRow } from "./mobileWorkspaceRows";
export { rowsFromModel, type WorkspaceRow } from "./mobileWorkspaceRows";





export function routeIcon(route: PanelRouteId): LucideIcon {
  const group = PANEL_ROUTES[route].workspaceGroup;
  if (group === "terminals") return UsersRound;
  if (group === "logs") return ScrollText;
  if (group === "resources") return Gauge;
  if (group === "dns" || route === "connections" || route === "trafficAudit") return Network;
  if (group === "security" || group === "diagnostics") return ShieldCheck;
  if (route === "interfaces" || route === "lineStatus") return Cable;
  return Router;
}

export function toneIcon(tone: OverviewTone) {
  if (tone === "danger") return CircleAlert;
  if (tone === "warn" || tone === "missing") return CircleAlert;
  return ShieldCheck;
}

export function rowMatchesRisk(risk: PanelRiskContext, row: WorkspaceRow): boolean {
  return risk === "resource"
    ? row.evidence.kind === "resource"
    : risk === "route"
      ? row.evidence.kind === "route"
      : row.evidence.kind === "interface" && row.evidence.operationalImpact === (risk === "interfaces" ? "risk" : "unverified");
}

export function riskObjectCount(risk: PanelRiskContext, rows: WorkspaceRow[]): number {
  return rows.filter((row) => rowMatchesRisk(risk, row)).length;
}

function defaultWorkspaceHistoryState(
  route: PanelRouteId,
  defaultFilter: string,
  defaultSort: string,
  defaultSearch: string,
): PanelWorkspaceHistoryState {
  return createPanelWorkspaceHistoryState(route, {
    search: defaultSearch,
    filter: defaultFilter,
    sort: defaultSort,
  });
}

/** Keeps only bounded, route-owned presentation state on the current entry. */
export function useMobileWorkspaceHistory(
  route: PanelRouteId,
  defaultFilter: string,
  defaultSort: string,
  defaultSearch: string,
) {
  const read = useCallback(() => {
    const fallback = defaultWorkspaceHistoryState(route, defaultFilter, defaultSort, defaultSearch);
    if (typeof window === "undefined") return fallback;
    return panelWorkspaceStateFromHistoryState(window.history.state, route) || fallback;
  }, [defaultFilter, defaultSearch, defaultSort, route]);
  const [workspace, setWorkspace] = useState<PanelWorkspaceHistoryState>(read);
  const [workspaceRestoreVersion, setWorkspaceRestoreVersion] = useState(0);

  useLayoutEffect(() => {
    const sync = () => {
      const next = read();
      setWorkspace(next);
      setWorkspaceRestoreVersion((version) => version + 1);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [read]);

  const replaceWorkspace = useCallback((update: Partial<PanelWorkspaceHistoryUpdate>) => {
    const previous = panelWorkspaceStateFromHistoryState(window.history.state, route)
      || defaultWorkspaceHistoryState(route, defaultFilter, defaultSort, defaultSearch);
    const next = createPanelWorkspaceHistoryState(route, { ...previous, ...update });
    window.history.replaceState({
      ...(window.history.state || {}),
      panelRoute: route,
      panelWorkspace: next,
    }, "", routeUrl(route, window.location));
    setWorkspace(next);
    return next;
  }, [defaultFilter, defaultSearch, defaultSort, route]);

  return { workspace, workspaceRestoreVersion, replaceWorkspace };
}

function objectContextFromUrl(): PanelNavigationContext {
  return navigationContextFromLocation(window.location);
}

function objectUrl(route: PanelRouteId, id: string | null): string {
  return routeUrl(route, window.location, { objectId: id });
}

export function useObjectHistory(route: PanelRouteId) {
  const [context, setContext] = useState<PanelNavigationContext>(() => (
    typeof window === "undefined"
      ? { objectId: null, query: null, risk: null, returnRoute: null, evidenceAt: null }
      : objectContextFromUrl()
  ));
  // A cross-domain action carries the source object's identity as evidence context;
  // only an ID owned by this collection may become its selected row.
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
    const state = { ...(window.history.state || {}), panelContextEntry: Boolean(id || context.risk), panelObject: id };
    window.history.replaceState(state, "", targetUrl);
    window.dispatchEvent(new PopStateEvent("popstate", { state }));
  }, [route]);

  const close = useCallback(() => {
    const currentState = window.history.state || {};
    if (currentState.panelContextEntry === true) {
      window.history.back();
      return;
    }
    if (context.returnRoute && context.returnRoute !== route) {
      const state = { ...currentState, panelRoute: context.returnRoute, panelContextEntry: false, panelObject: null };
      const targetUrl = routeUrl(context.returnRoute, window.location, { objectId: null, query: null, risk: null, returnRoute: null, evidenceAt: null });
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
