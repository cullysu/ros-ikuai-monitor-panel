import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OverviewRawSnapshot } from "../overview";
import {
  fetchPanelSnapshot,
  fetchRouterLoginBootstrap,
  forgetRouterLoginProfile,
  PanelApiError,
  submitRouterConnection,
  submitRouterLogout,
  type RouterConnectionInput,
} from "./panelApi";
import {
  parseRouterConnectionTest,
  snapshotEvidenceTimestamp,
  snapshotHasOperationalEvidence,
  snapshotPollSeconds,
  type RouterConnectionTest,
  type RouterLoginProfile,
  type SavedRouterLogin,
  type SnapshotEnvelopeKind,
} from "./panelRuntimeSchema";
import { parseRfc3339Timestamp } from "../timeContract";

export type PanelConnectionPhase = "checking" | "unconfigured" | "ready" | "error";
export type PanelSnapshotPhase = "idle" | "loading" | "current" | "refreshing" | "stale" | "error" | "recovering";
export type PanelRuntimeView = "panel" | "connection";
export type BrowserOnlineHintSignal = "offline" | "online" | "same-origin-response";

/**
 * navigator.onLine is only a browser transport hint. A completed same-origin
 * response is stronger local evidence and therefore clears an older hint.
 */
export function nextBrowserOnlineHint(signal: BrowserOnlineHintSignal): boolean {
  return signal !== "offline";
}

export interface PanelConnectionState {
  phase: PanelConnectionPhase;
  profile: RouterLoginProfile | null;
  savedLogins: SavedRouterLogin[];
  csrfToken: string;
  busy: boolean;
  error: string;
  warning: string;
  lastTest: RouterConnectionTest | null;
  pendingSshHostKey: {
    kind: "confirmation-required" | "changed";
    host: string;
    sshPort: number;
    fingerprint: string;
    expectedFingerprint?: string;
    algorithm: string;
    trustToken?: string;
    trustExpiresAt?: string;
    verifiedRestOnlyAvailable: boolean;
  } | null;
}

export interface PanelSnapshotState {
  phase: PanelSnapshotPhase;
  kind: SnapshotEnvelopeKind | null;
  data: OverviewRawSnapshot | null;
  error: string;
  lastAttemptAt: number | null;
  lastSuccessAt: number | null;
}

export interface PanelRuntimeController {
  view: PanelRuntimeView;
  /**
   * Browser transport hint only. This is deliberately not a RouterOS or LAN
   * reachability state; same-origin snapshot requests continue while false.
   */
  browserOnlineHint: boolean;
  evidenceAgeSeconds: number | null;
  pollSeconds: number;
  connection: PanelConnectionState;
  snapshot: PanelSnapshotState;
  connect: (input: RouterConnectionInput) => Promise<boolean>;
  logout: () => Promise<void>;
  forgetProfile: (savedId: string) => Promise<void>;
  retryConnectionStatus: () => Promise<void>;
  refresh: (reason?: "manual" | "poll" | "recovery" | "initial") => Promise<void>;
  showConnection: () => void;
  cancelConnection: () => void;
  /** True only when the connection screen has an app-owned panel return entry. */
  canCancelConnection: boolean;
  dismissWarning: () => void;
}

const initialConnection: PanelConnectionState = {
  phase: "checking",
  profile: null,
  savedLogins: [],
  csrfToken: "",
  busy: false,
  error: "",
  warning: "",
  lastTest: null,
  pendingSshHostKey: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

type ConnectionReturnPoint = {
  focusId: string | null;
  windowX: number;
  windowY: number;
  scrollOwners: Array<{ id: string; left: number; top: number }>;
};

type RuntimeHistoryState = Record<string, unknown> & {
  panelRuntimeView?: PanelRuntimeView;
  panelRuntimeConnectionReturn?: ConnectionReturnPoint;
};

function runtimeHistoryState(): RuntimeHistoryState {
  return typeof window !== "undefined" && isRecord(window.history.state)
    ? window.history.state as RuntimeHistoryState
    : {};
}

function connectionHistoryActive(state = runtimeHistoryState()): boolean {
  return state.panelRuntimeView === "connection" && isRecord(state.panelRuntimeConnectionReturn);
}

function connectionReturnPoint(state = runtimeHistoryState()): ConnectionReturnPoint | null {
  const point = state.panelRuntimeConnectionReturn;
  if (!isRecord(point) || typeof point.windowX !== "number" || typeof point.windowY !== "number") return null;
  const scrollOwners = Array.isArray(point.scrollOwners)
    ? point.scrollOwners.filter((entry): entry is { id: string; left: number; top: number } => (
      isRecord(entry) && typeof entry.id === "string" && typeof entry.left === "number" && typeof entry.top === "number"
    ))
    : [];
  return { focusId: typeof point.focusId === "string" ? point.focusId : null, windowX: point.windowX, windowY: point.windowY, scrollOwners };
}

function pendingSshHostKey(error: unknown, input: RouterConnectionInput): PanelConnectionState["pendingSshHostKey"] {
  if (!(error instanceof PanelApiError) || !isRecord(error.payload)) return null;
  const confirmationRequired = error.code === "ssh_host_key_confirmation_required";
  const hostKeyChanged = error.code === "ssh_host_key_changed";
  if (!confirmationRequired && !hostKeyChanged) return null;
  const test = isRecord(error.payload.test) ? error.payload.test : {};
  const ssh = isRecord(test.ssh) ? test.ssh : {};
  const rest = isRecord(test.rest) ? test.rest : {};
  const fingerprint = typeof ssh.fingerprint === "string" ? ssh.fingerprint.trim() : "";
  const expectedFingerprint = typeof ssh.expectedFingerprint === "string" ? ssh.expectedFingerprint.trim() : "";
  const algorithm = typeof ssh.algorithm === "string" ? ssh.algorithm.trim() : "";
  const trustToken = typeof ssh.trustToken === "string" ? ssh.trustToken.trim() : "";
  const trustExpiresAt = typeof ssh.trustExpiresAt === "string" ? ssh.trustExpiresAt.trim() : "";
  if (!fingerprint) return null;
  if (confirmationRequired && (!trustToken || parseRfc3339Timestamp(trustExpiresAt) === null)) return null;
  if (hostKeyChanged && !expectedFingerprint) return null;
  return {
    kind: confirmationRequired ? "confirmation-required" : "changed",
    host: input.host,
    sshPort: input.sshPort,
    fingerprint,
    ...(expectedFingerprint ? { expectedFingerprint } : {}),
    algorithm: algorithm || "SSH",
    ...(trustToken ? { trustToken } : {}),
    ...(trustExpiresAt ? { trustExpiresAt } : {}),
    verifiedRestOnlyAvailable: rest.ok === true && rest.scheme === "https" && rest.verifyTls === true,
  };
}

const initialSnapshot: PanelSnapshotState = {
  phase: "idle",
  kind: null,
  data: null,
  error: "",
  lastAttemptAt: null,
  lastSuccessAt: null,
};

function errorMessage(error: unknown): string {
  if (error instanceof PanelApiError || error instanceof Error) return error.message;
  return "请求未完成";
}

function isSnapshotStale(snapshot: OverviewRawSnapshot, now = Date.now()): boolean {
  const evidenceAt = snapshotEvidenceTimestamp(snapshot as Record<string, unknown>);
  if (evidenceAt === null) return true;
  const thresholdMs = Math.max(15_000, snapshotPollSeconds(snapshot as Record<string, unknown>) * 3_000);
  return now - evidenceAt > thresholdMs;
}

export function usePanelRuntime(): PanelRuntimeController {
  const [view, setView] = useState<PanelRuntimeView>("connection");
  const [browserOnlineHint, setBrowserOnlineHint] = useState(() => (
    typeof navigator === "undefined" ? true : nextBrowserOnlineHint(navigator.onLine ? "online" : "offline")
  ));
  const [connection, setConnection] = useState<PanelConnectionState>(initialConnection);
  const [snapshot, setSnapshot] = useState<PanelSnapshotState>(initialSnapshot);
  const [clock, setClock] = useState(() => Date.now());
  const connectionRef = useRef(connection);
  const snapshotRef = useRef(snapshot);
  const viewRef = useRef(view);
  const bootstrapControllerRef = useRef<AbortController | null>(null);
  const snapshotControllerRef = useRef<AbortController | null>(null);
  const returnIdRef = useRef(0);
  const pendingReturnRef = useRef<ConnectionReturnPoint | null>(null);

  useEffect(() => {
    connectionRef.current = connection;
  }, [connection]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const captureConnectionReturn = useCallback((): ConnectionReturnPoint => {
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const ensureId = (element: HTMLElement, prefix: string) => {
      if (element.id) return element.id;
      returnIdRef.current += 1;
      const id = `${prefix}-${returnIdRef.current}`;
      element.id = id;
      return id;
    };
    const scrollOwners: ConnectionReturnPoint["scrollOwners"] = [];
    let owner = active?.parentElement || null;
    while (owner && owner !== document.body) {
      const style = window.getComputedStyle(owner);
      const scrollable = /(auto|scroll)/.test(style.overflowY) && owner.scrollHeight > owner.clientHeight + 1;
      if (scrollable) {
        scrollOwners.push({ id: ensureId(owner, "panel-runtime-scroll-owner"), left: owner.scrollLeft, top: owner.scrollTop });
      }
      owner = owner.parentElement;
    }
    return {
      focusId: active ? ensureId(active, "panel-runtime-connection-source") : null,
      windowX: window.scrollX,
      windowY: window.scrollY,
      scrollOwners,
    };
  }, []);

  const restoreConnectionReturn = useCallback((point: ConnectionReturnPoint | null) => {
    if (!point) return;
    pendingReturnRef.current = point;
    setView("panel");
  }, []);

  useEffect(() => {
    if (view !== "panel" || !pendingReturnRef.current) return;
    const point = pendingReturnRef.current;
    pendingReturnRef.current = null;
    const focusId = point.focusId;
    let retry: number | null = null;
    const restore = () => {
      point.scrollOwners.forEach((owner) => document.getElementById(owner.id)?.scrollTo({ left: owner.left, top: owner.top, behavior: "auto" }));
      window.scrollTo({ left: point.windowX, top: point.windowY, behavior: "auto" });
      const source = focusId ? document.getElementById(focusId) : null;
      if (source instanceof HTMLElement && source.getClientRects().length) source.focus({ preventScroll: true });
      else if (focusId) retry = window.setTimeout(() => document.getElementById(focusId)?.focus({ preventScroll: true }), 120);
    };
    const frame = window.requestAnimationFrame(restore);
    return () => {
      window.cancelAnimationFrame(frame);
      if (retry !== null) window.clearTimeout(retry);
    };
  }, [view]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const state = isRecord(event.state) ? event.state as RuntimeHistoryState : {};
      if (connectionRef.current.phase !== "ready") return;
      if (connectionHistoryActive(state)) {
        pendingReturnRef.current = null;
        setView("connection");
        return;
      }
      restoreConnectionReturn(connectionReturnPoint(state));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [restoreConnectionReturn]);

  const retryConnectionStatus = useCallback(async () => {
    bootstrapControllerRef.current?.abort();
    const controller = new AbortController();
    bootstrapControllerRef.current = controller;
    setConnection((current) => ({ ...current, phase: "checking", busy: false, error: "" }));
    try {
      const result = await fetchRouterLoginBootstrap(controller.signal);
      if (controller.signal.aborted) return;
      const phase: PanelConnectionPhase = result.routerLogin.configured ? "ready" : "unconfigured";
      setConnection({
        phase,
        profile: result.routerLogin,
        savedLogins: result.savedLogins,
        csrfToken: result.csrfToken,
        busy: false,
        error: "",
        warning: "",
        lastTest: result.routerLogin.lastTest,
        pendingSshHostKey: null,
      });
      const historyRequestsConnection = connectionHistoryActive();
      setView(result.routerLogin.configured && !historyRequestsConnection ? "panel" : "connection");
    } catch (error) {
      if (controller.signal.aborted) return;
      setConnection((current) => ({
        ...current,
        phase: "error",
        busy: false,
        error: errorMessage(error),
      }));
      setView("connection");
    }
  }, []);

  const refresh = useCallback(async (reason: "manual" | "poll" | "recovery" | "initial" = "manual") => {
    if (connectionRef.current.phase !== "ready" || viewRef.current !== "panel") return;
    if (snapshotControllerRef.current && reason !== "manual") return;
    snapshotControllerRef.current?.abort();
    const controller = new AbortController();
    snapshotControllerRef.current = controller;
    const startedAt = Date.now();
    const previous = snapshotRef.current;
    setSnapshot((current) => ({
      ...current,
      phase: current.data ? "refreshing" : "loading",
      error: "",
      lastAttemptAt: startedAt,
    }));

    try {
      const result = await fetchPanelSnapshot(controller.signal);
      if (controller.signal.aborted) return;
      // A same-origin response can succeed while navigator.onLine remains stale.
      setBrowserOnlineHint(nextBrowserOnlineHint("same-origin-response"));
      if (!result.ok) {
        const message = `快照数据不符合契约：${result.issues.join("；")}`;
        setSnapshot((current) => ({
          ...current,
          phase: current.data ? "recovering" : "error",
          kind: null,
          error: message,
          lastAttemptAt: startedAt,
        }));
        return;
      }

      const data = result.value as OverviewRawSnapshot;
      const status = typeof data.status === "string" ? data.status.toLowerCase() : "";
      if (status === "needs_config") {
        setSnapshot({ ...initialSnapshot, phase: "error", kind: "error", data, error: "RouterOS 尚未配置", lastAttemptAt: startedAt });
        await retryConnectionStatus();
        return;
      }

      const hasEvidence = snapshotHasOperationalEvidence(result.value);
      const previousData = previous.data;
      const nextData = status === "starting" && !hasEvidence && previousData ? previousData : data;
      let phase: PanelSnapshotPhase;
      if (status === "starting") phase = "recovering";
      else if (result.kind === "error") phase = hasEvidence ? "stale" : "error";
      else phase = isSnapshotStale(nextData) ? "stale" : "current";

      setSnapshot({
        phase,
        kind: result.kind,
        data: nextData,
        error: result.kind === "error"
          ? String(data.error || "采集返回错误状态")
          : phase === "stale"
            ? "快照时间已超出当前证据时限"
            : "",
        lastAttemptAt: startedAt,
        lastSuccessAt: Date.now(),
      });
      if (phase === "current") {
        const meta = data.meta || {};
        const restCurrent = Boolean(
          (meta.realtimeUpdatedAt || meta.slowRestUpdatedAt) && !meta.realtimeError && !meta.slowRestError,
        );
        const sshCurrent = Boolean(meta.staticUpdatedAt && !meta.staticError);
        setConnection((current) => {
          const failedRest = current.lastTest?.rest?.ok === false;
          const failedSsh = current.lastTest?.ssh?.ok === false;
          const recovered = (failedRest || failedSsh) && (!failedRest || restCurrent) && (!failedSsh || sshCurrent);
          return recovered && current.warning ? { ...current, warning: "" } : current;
        });
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      const browserOfflineHint = typeof navigator !== "undefined" && !navigator.onLine;
      if (browserOfflineHint) setBrowserOnlineHint(nextBrowserOnlineHint("offline"));
      setSnapshot((current) => ({
        ...current,
        phase: current.data ? "recovering" : "error",
        error: browserOfflineHint
          ? "本地快照请求失败；浏览器同时报告互联网不可用（仅作提示）：" + errorMessage(error)
          : errorMessage(error),
        lastAttemptAt: startedAt,
      }));
    } finally {
      if (snapshotControllerRef.current === controller) snapshotControllerRef.current = null;
    }
  }, [retryConnectionStatus]);

  useEffect(() => {
    void retryConnectionStatus();
    return () => bootstrapControllerRef.current?.abort();
  }, [retryConnectionStatus]);

  useEffect(() => {
    if (connection.phase !== "ready" || view !== "panel") return;
    if (snapshot.phase === "idle") {
      void refresh("initial");
      return;
    }
    if (snapshot.phase === "loading" || snapshot.phase === "refreshing") return;
    const retrySeconds = snapshot.phase === "error" || snapshot.phase === "recovering" ? 5 : snapshotPollSeconds(snapshot.data as Record<string, unknown> | null);
    const timer = window.setTimeout(() => void refresh(snapshot.phase === "current" ? "poll" : "recovery"), retrySeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [connection.phase, refresh, snapshot.data, snapshot.phase, view]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setClock(now);
      setSnapshot((current) => {
        if (current.phase !== "current" || !current.data || !isSnapshotStale(current.data, now)) return current;
        return { ...current, phase: "stale", error: "快照已超过当前证据时限" };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onOffline = () => {
      setBrowserOnlineHint(nextBrowserOnlineHint("offline"));
      if (connectionRef.current.phase === "ready" && viewRef.current === "panel") void refresh("recovery");
    };
    const onOnline = () => {
      setBrowserOnlineHint(nextBrowserOnlineHint("online"));
      if (connectionRef.current.phase === "ready" && viewRef.current === "panel") void refresh("recovery");
      else if (connectionRef.current.phase === "error") void retryConnectionStatus();
    };
    const onVisibility = () => {
      if (document.visibilityState !== "visible" || connectionRef.current.phase !== "ready" || viewRef.current !== "panel") return;
      const current = snapshotRef.current;
      const lastAttempt = current.lastAttemptAt || 0;
      const pollMs = snapshotPollSeconds(current.data as Record<string, unknown> | null) * 1000;
      if (Date.now() - lastAttempt >= pollMs) void refresh("recovery");
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      snapshotControllerRef.current?.abort();
    };
  }, [refresh, retryConnectionStatus]);

  const connect = useCallback(async (input: RouterConnectionInput): Promise<boolean> => {
    const current = connectionRef.current;
    if (!current.csrfToken) {
      setConnection((state) => ({ ...state, error: "本地会话已失效，请重新读取连接状态" }));
      return false;
    }
    setConnection((state) => ({ ...state, busy: true, error: "", warning: "" }));
    try {
      const result = await submitRouterConnection(input, current.csrfToken);
      snapshotControllerRef.current?.abort();
      setSnapshot(initialSnapshot);
      setConnection((state) => ({
        ...state,
        phase: "ready",
        profile: result.routerLogin,
        savedLogins: result.savedLogins,
        busy: false,
        error: "",
        warning: result.warning,
        lastTest: result.test,
        pendingSshHostKey: null,
      }));
      const returnPoint = connectionReturnPoint();
      const currentHistory = runtimeHistoryState();
      if (connectionHistoryActive(currentHistory)) {
        window.history.replaceState({ ...currentHistory, panelRuntimeView: "panel" }, "", window.location.href);
      }
      if (returnPoint) restoreConnectionReturn(returnPoint);
      else setView("panel");
      return true;
    } catch (error) {
      const pending = pendingSshHostKey(error, input);
      const payload = error instanceof PanelApiError && isRecord(error.payload)
        ? parseRouterConnectionTest(error.payload.test)
        : null;
      setConnection((state) => ({
        ...state,
        busy: false,
        error: errorMessage(error),
        lastTest: payload || state.lastTest,
        pendingSshHostKey: pending,
      }));
      return false;
    }
  }, [restoreConnectionReturn]);

  const logout = useCallback(async () => {
    const current = connectionRef.current;
    if (!current.csrfToken) return;
    setConnection((state) => ({ ...state, busy: true, error: "" }));
    try {
      const result = await submitRouterLogout(current.csrfToken);
      snapshotControllerRef.current?.abort();
      setSnapshot(initialSnapshot);
      setConnection((state) => ({
        ...state,
        phase: "unconfigured",
        profile: result.routerLogin,
        savedLogins: result.savedLogins,
        busy: false,
        error: "",
        warning: "",
        lastTest: null,
        pendingSshHostKey: null,
      }));
      const currentHistory = runtimeHistoryState();
      window.history.replaceState({ ...currentHistory, panelRuntimeView: "connection" }, "", window.location.href);
      setView("connection");
    } catch (error) {
      setConnection((state) => ({ ...state, busy: false, error: errorMessage(error) }));
    }
  }, []);

  const forgetProfile = useCallback(async (savedId: string) => {
    const current = connectionRef.current;
    if (!current.csrfToken) return;
    setConnection((state) => ({ ...state, busy: true, error: "" }));
    try {
      const result = await forgetRouterLoginProfile(savedId, current.csrfToken);
      setConnection((state) => ({
        ...state,
        profile: result.routerLogin,
        savedLogins: result.savedLogins,
        busy: false,
      }));
    } catch (error) {
      setConnection((state) => ({ ...state, busy: false, error: errorMessage(error) }));
    }
  }, []);

  const showConnection = useCallback(() => {
    if (connectionRef.current.phase !== "ready") {
      setView("connection");
      return;
    }
    const returnPoint = captureConnectionReturn();
    const panelState: RuntimeHistoryState = {
      ...runtimeHistoryState(),
      panelRuntimeView: "panel",
      panelRuntimeConnectionReturn: returnPoint,
    };
    window.history.replaceState(panelState, "", window.location.href);
    window.history.pushState({ ...panelState, panelRuntimeView: "connection" }, "", window.location.href);
    pendingReturnRef.current = null;
    setView("connection");
  }, [captureConnectionReturn]);
  const cancelConnection = useCallback(() => {
    const current = connectionRef.current;
    if (current.phase !== "ready") return;
    const currentHistory = runtimeHistoryState();
    if (connectionHistoryActive(currentHistory)) {
      // This is an app-owned connection entry, so Back restores its explicit panel return point.
      window.history.back();
      return;
    }
    const returnPoint = connectionReturnPoint(currentHistory);
    window.history.replaceState({ ...currentHistory, panelRuntimeView: "panel" }, "", window.location.href);
    restoreConnectionReturn(returnPoint);
  }, [restoreConnectionReturn]);
  const canCancelConnection = connection.phase === "ready" && connectionHistoryActive();
  const dismissWarning = useCallback(() => setConnection((state) => ({ ...state, warning: "" })), []);

  const pollSeconds = snapshotPollSeconds(snapshot.data as Record<string, unknown> | null);
  const evidenceAt = snapshot.data ? snapshotEvidenceTimestamp(snapshot.data as Record<string, unknown>) : null;
  const evidenceAgeSeconds = evidenceAt === null ? null : Math.max(0, Math.floor((clock - evidenceAt) / 1000));

  return useMemo(
    () => ({
      view,
      browserOnlineHint,
      evidenceAgeSeconds,
      pollSeconds,
      connection,
      snapshot,
      connect,
      logout,
      forgetProfile,
      retryConnectionStatus,
      refresh,
      showConnection,
      cancelConnection,
      canCancelConnection,
      dismissWarning,
    }),
    [
      cancelConnection,
      clock,
      connect,
      connection,
      dismissWarning,
      evidenceAgeSeconds,
      forgetProfile,
      logout,
      browserOnlineHint,
      canCancelConnection,
      pollSeconds,
      refresh,
      retryConnectionStatus,
      showConnection,
      snapshot,
      view,
    ]
  );
}
