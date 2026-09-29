import { useCallback, useEffect, useRef, useState } from "react";
import { PanelApiError, fetchReadonlyDiagnostics } from "../runtime/panelApi";
import type { ReadonlyDiagnosticsData } from "./readonlyDiagnosticsSchema";
import type { PanelRouteId } from "../routes/panelRoutes";

export const READONLY_DIAGNOSTICS_ROUTES: readonly PanelRouteId[] = [
  "readonlyDiagnostics",
  "collectionHealthDiagnostics",
  "dnsProxyDiagnostics",
  "wanQualityDiagnostics",
  "terminalRiskDiagnostics",
  "systemAuditDiagnostics",
];

export function isReadonlyDiagnosticsRoute(route: PanelRouteId): boolean {
  return READONLY_DIAGNOSTICS_ROUTES.includes(route);
}

export interface ReadonlyDiagnosticsState {
  requestStatus: "idle" | "loading" | "success" | "error";
  data: ReadonlyDiagnosticsData | null;
  reason: string | null;
  errorCode: string | null;
  errorStatus: number | null;
  retry: () => void;
}

/**
 * One bounded, abortable readonly-probe request per mounted diagnostics page.
 * The snapshot stays the primary evidence; this only adds what the collector's
 * read-only probes observed, and every failure degrades to an explicit reason.
 */
export function useReadonlyDiagnostics(route: PanelRouteId): ReadonlyDiagnosticsState {
  const [requestStatus, setRequestStatus] = useState<ReadonlyDiagnosticsState["requestStatus"]>("idle");
  const [data, setData] = useState<ReadonlyDiagnosticsData | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const sequenceRef = useRef(0);

  useEffect(() => {
    if (!isReadonlyDiagnosticsRoute(route)) {
      setRequestStatus("idle");
      setData(null);
      setReason(null);
      setErrorCode(null);
      setErrorStatus(null);
      return;
    }
    const controller = new AbortController();
    const sequence = ++sequenceRef.current;
    setRequestStatus("loading");
    setReason(null);
    setErrorCode(null);
    setErrorStatus(null);
    const run = async () => {
      try {
        const result = await fetchReadonlyDiagnostics(controller.signal);
        if (controller.signal.aborted || sequence !== sequenceRef.current) return;
        setData(result.data);
        setReason(result.reason);
        setRequestStatus("success");
      } catch (error) {
        if (controller.signal.aborted || sequence !== sequenceRef.current) return;
        setData(null);
        if (error instanceof PanelApiError) {
          setReason(error.message);
          setErrorCode(error.code);
          setErrorStatus(error.status);
        } else {
          setReason("只读探测证据读取失败");
          setErrorCode("request_failed");
          setErrorStatus(0);
        }
        setRequestStatus("error");
      }
    };
    const timeout = window.setTimeout(run, 0);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt, route]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { requestStatus, data, reason, errorCode, errorStatus, retry };
}
