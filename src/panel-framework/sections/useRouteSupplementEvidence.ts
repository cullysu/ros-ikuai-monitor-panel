import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PanelApiError,
  fetchConnectionSearchSupplement,
  fetchDnsStaticSupplement,
  fetchHealthFindingsSupplement,
} from "../runtime/panelApi";
import type { RouteSupplement, RouteSupplementResult } from "./routeSupplementSchema";
import {
  connectionSupplementRowId,
  createConnectionSupplementHistory,
  createDnsSupplementHistory,
  dnsPageRequest,
  parseDnsPageOutOfRange,
  parseRouteSupplementHistory,
  routeSupplementRequestKey,
  supplementalRequestFailure,
  supplementalUiState,
  type RouteSupplementHistory,
  type SupplementalUiState,
} from "./routeSupplementState";

export interface RouteSupplementState {
  requestStatus: "idle" | "loading" | "success" | "error";
  uiState: SupplementalUiState | null;
  result: RouteSupplementResult<RouteSupplement> | null;
  query: string | null;
  page: number | null;
  totalPages: number | null;
  message: string | null;
  errorCode: string | null;
  errorStatus: number | null;
  retryAfterSeconds: number | null;
  retryBlocked: boolean;
  selectedConnectionRowId: string | null;
  submitConnection: (query: string) => boolean;
  clearConnectionQuery: () => boolean;
  openConnection: (rowId: string) => boolean;
  closeConnection: () => boolean;
  loadDnsPage: (page: number) => boolean;
  retry: () => void;
}

interface RequestState {
  requestStatus: RouteSupplementState["requestStatus"];
  result: RouteSupplementResult<RouteSupplement> | null;
  message: string | null;
  errorCode: string | null;
  errorStatus: number | null;
  retryAfterSeconds: number | null;
}

const IDLE: RequestState = { requestStatus: "idle", result: null, message: null, errorCode: null, errorStatus: null, retryAfterSeconds: null };

function commandFromHistory(route: string): RouteSupplementHistory | null {
  return typeof window === "undefined" ? null : parseRouteSupplementHistory(window.history.state, route);
}

/** One mounted presentation owner runs one bounded, abortable supplemental request. */
export function useRouteSupplementEvidence(route: string): RouteSupplementState {
  const initialCommand = commandFromHistory(route);
  const [command, setCommand] = useState<RouteSupplementHistory | null>(initialCommand);
  const [request, setRequest] = useState<RequestState>(IDLE);
  const [attempt, setAttempt] = useState(0);
  const sequenceRef = useRef(0);
  const commandRef = useRef<RouteSupplementHistory | null>(initialCommand);
  const requestKeyRef = useRef(routeSupplementRequestKey(route, initialCommand));

  useEffect(() => {
    const sync = () => {
      const next = commandFromHistory(route);
      const nextRequestKey = routeSupplementRequestKey(route, next);
      const requestChanged = requestKeyRef.current !== nextRequestKey;
      sequenceRef.current += 1;
      commandRef.current = next;
      requestKeyRef.current = nextRequestKey;
      setCommand(next);
      if (requestChanged) setRequest(IDLE);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [route]);

  const commit = useCallback((next: RouteSupplementHistory | null, forceRequest = false) => {
    if (!next) return false;
    const nextRequestKey = routeSupplementRequestKey(route, next);
    const requestChanged = requestKeyRef.current !== nextRequestKey;
    sequenceRef.current += 1;
    const historyState = { ...(window.history.state || {}), panelRouteSupplement: next };
    window.history.pushState(historyState, "", window.location.href);
    commandRef.current = next;
    requestKeyRef.current = nextRequestKey;
    setCommand(next);
    if (requestChanged || forceRequest) setRequest(IDLE);
    if (!requestChanged && forceRequest) setAttempt((value) => value + 1);
    return true;
  }, [route]);

  const retryBlocked = request.errorCode === "connection_search_rate_limited" && (request.retryAfterSeconds || 0) > 0;
  const submitConnection = useCallback((query: string) => retryBlocked ? false : commit(createConnectionSupplementHistory(query), true), [commit, retryBlocked]);
  const clearConnectionQuery = useCallback(() => {
    if (commandRef.current?.route !== "connections") return false;
    sequenceRef.current += 1;
    const historyState = { ...(window.history.state || {}) };
    delete historyState.panelRouteSupplement;
    window.history.pushState(historyState, "", window.location.href);
    commandRef.current = null;
    requestKeyRef.current = routeSupplementRequestKey(route, null);
    setCommand(null);
    setRequest(IDLE);
    return true;
  }, [route]);
  const loadDnsPage = useCallback((page: number) => commit(createDnsSupplementHistory(page)), [commit]);
  const openConnection = useCallback((rowId: string) => {
    const query = commandRef.current?.route === "connections" ? commandRef.current.query : null;
    const data = request.result?.data;
    if (!query || data?.kind !== "connection-search") return false;
    const exists = data.rows.some((row, index) => connectionSupplementRowId(row, index) === rowId);
    return exists ? commit(createConnectionSupplementHistory(query, rowId)) : false;
  }, [commit, request.result]);
  const closeConnection = useCallback(() => {
    if (commandRef.current?.route !== "connections" || !commandRef.current.selectedRowId) return false;
    sequenceRef.current += 1;
    window.history.back();
    return true;
  }, []);
  const retry = useCallback(() => {
    if (retryBlocked) return;
    sequenceRef.current += 1;
    setAttempt((value) => value + 1);
  }, [retryBlocked]);

  useEffect(() => {
    if (request.errorCode !== "connection_search_rate_limited" || request.retryAfterSeconds === null || request.retryAfterSeconds <= 0) return;
    const timeout = window.setTimeout(() => {
      setRequest((current) => {
        if (current.errorCode !== "connection_search_rate_limited" || current.retryAfterSeconds === null || current.retryAfterSeconds <= 0) return current;
        const remaining = current.retryAfterSeconds - 1;
        return {
          ...current,
          retryAfterSeconds: remaining,
          message: remaining > 0 ? `连接查询过于频繁；保留目标，${remaining} 秒后可重试。` : "连接查询频率限制已解除；保留目标，可再次重试。",
        };
      });
    }, 1_000);
    return () => window.clearTimeout(timeout);
  }, [request.errorCode, request.retryAfterSeconds]);

  const dnsPage = route === "dns4" ? (command?.route === "dns4" ? command.page : 1) : null;
  const connectionQuery = command?.route === "connections" ? command.query : null;
  useEffect(() => {
    const dnsRequest = dnsPage ? dnsPageRequest(dnsPage) : null;
    const shouldRun = route === "security" || (route === "dns4" && Boolean(dnsRequest)) || (route === "connections" && Boolean(connectionQuery));
    if (!shouldRun) {
      setRequest(IDLE);
      return;
    }
    const controller = new AbortController();
    const sequence = ++sequenceRef.current;
    const run = async () => {
      setRequest({ requestStatus: "loading", result: null, message: null, errorCode: null, errorStatus: null, retryAfterSeconds: null });
      try {
        const result = route === "security"
          ? await fetchHealthFindingsSupplement(controller.signal)
          : route === "dns4" && dnsRequest
            ? await fetchDnsStaticSupplement(dnsRequest, controller.signal)
            : await fetchConnectionSearchSupplement(connectionQuery || "", controller.signal);
        if (!controller.signal.aborted && sequence === sequenceRef.current) setRequest({ requestStatus: "success", result, message: result.reason, errorCode: null, errorStatus: null, retryAfterSeconds: null });
      } catch (error) {
        if (!controller.signal.aborted && sequence === sequenceRef.current) {
          const pageRecovery = route === "dns4" && dnsRequest && error instanceof PanelApiError && error.code === "dns_page_out_of_range"
            ? parseDnsPageOutOfRange(error.payload, dnsRequest.page)
            : null;
          if (pageRecovery) {
            const next = createDnsSupplementHistory(pageRecovery.lastPage);
            if (next) {
              sequenceRef.current += 1;
              const historyState = { ...(window.history.state || {}), panelRouteSupplement: next };
              window.history.replaceState(historyState, "", window.location.href);
              commandRef.current = next;
              requestKeyRef.current = routeSupplementRequestKey(route, next);
              setCommand(next);
              setRequest(IDLE);
              return;
            }
          }
          const failure = error instanceof PanelApiError
            ? supplementalRequestFailure(error.code, error.status, error.retryAfterSeconds)
            : supplementalRequestFailure("request_failed", 0, null);
          setRequest({ requestStatus: "error", result: null, ...failure });
        }
      }
    };
    const timeout = window.setTimeout(run, 0);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt, connectionQuery, dnsPage, route]);

  const query = connectionQuery;
  const page = dnsPage;
  const selectedConnectionRowId = command?.route === "connections" ? command.selectedRowId : null;
  const totalPages = useMemo(() => {
    const data = request.result?.data;
    return data?.kind === "dns-static" ? Math.min(20, Math.max(1, Math.ceil(data.totalCount / 50))) : null;
  }, [request.result]);
  return {
    ...request,
    uiState: request.requestStatus === "idle" ? null : supplementalUiState(request.requestStatus, request.result),
    query,
    page,
    totalPages,
    submitConnection,
    clearConnectionQuery,
    loadDnsPage,
    retry,
    retryBlocked,
    selectedConnectionRowId,
    openConnection,
    closeConnection,
  };
}
