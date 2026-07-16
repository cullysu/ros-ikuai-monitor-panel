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
  snapshotEvidenceTimestamp,
  snapshotHasOperationalEvidence,
  snapshotPollSeconds,
  type RouterConnectionTest,
  type RouterLoginProfile,
  type SavedRouterLogin,
  type SnapshotEnvelopeKind,
} from "./panelRuntimeSchema";

export type PanelConnectionPhase = "checking" | "unconfigured" | "ready" | "error";
export type PanelSnapshotPhase = "idle" | "loading" | "current" | "refreshing" | "stale" | "offline" | "error" | "recovering";
export type PanelRuntimeView = "panel" | "connection";

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
    host: string;
    sshPort: number;
    fingerprint: string;
    algorithm: string;
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
  online: boolean;
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

function pendingSshHostKey(error: unknown, input: RouterConnectionInput): PanelConnectionState["pendingSshHostKey"] {
  if (!(error instanceof PanelApiError) || error.code !== "ssh_host_key_confirmation_required" || !isRecord(error.payload)) return null;
  const test = isRecord(error.payload.test) ? error.payload.test : {};
  const ssh = isRecord(test.ssh) ? test.ssh : {};
  const fingerprint = typeof ssh.fingerprint === "string" ? ssh.fingerprint.trim() : "";
  const algorithm = typeof ssh.algorithm === "string" ? ssh.algorithm.trim() : "";
  if (!fingerprint) return null;
  return { host: input.host, sshPort: input.sshPort, fingerprint, algorithm: algorithm || "SSH" };
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
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [connection, setConnection] = useState<PanelConnectionState>(initialConnection);
  const [snapshot, setSnapshot] = useState<PanelSnapshotState>(initialSnapshot);
  const [clock, setClock] = useState(() => Date.now());
  const connectionRef = useRef(connection);
  const snapshotRef = useRef(snapshot);
  const viewRef = useRef(view);
  const bootstrapControllerRef = useRef<AbortController | null>(null);
  const snapshotControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    connectionRef.current = connection;
  }, [connection]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

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
      setView(result.routerLogin.configured ? "panel" : "connection");
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
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOnline(false);
      setSnapshot((current) => ({ ...current, phase: "offline", error: "浏览器当前离线" }));
      return;
    }

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
      setSnapshot((current) => ({
        ...current,
        phase: current.data ? "recovering" : "error",
        error: errorMessage(error),
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
      setOnline(false);
      setSnapshot((current) => ({ ...current, phase: "offline", error: "浏览器当前离线" }));
    };
    const onOnline = () => {
      setOnline(true);
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
      setView("panel");
      return true;
    } catch (error) {
      const pending = pendingSshHostKey(error, input);
      const payload = error instanceof PanelApiError && isRecord(error.payload) && isRecord(error.payload.test)
        ? error.payload.test as unknown as RouterConnectionTest
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
  }, []);

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

  const showConnection = useCallback(() => setView("connection"), []);
  const cancelConnection = useCallback(() => {
    const current = connectionRef.current;
    if (current.phase === "ready" && snapshotRef.current.data) setView("panel");
  }, []);
  const dismissWarning = useCallback(() => setConnection((state) => ({ ...state, warning: "" })), []);

  const pollSeconds = snapshotPollSeconds(snapshot.data as Record<string, unknown> | null);
  const evidenceAt = snapshot.data ? snapshotEvidenceTimestamp(snapshot.data as Record<string, unknown>) : null;
  const evidenceAgeSeconds = evidenceAt === null ? null : Math.max(0, Math.floor((clock - evidenceAt) / 1000));

  return useMemo(
    () => ({
      view,
      online,
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
      online,
      pollSeconds,
      refresh,
      retryConnectionStatus,
      showConnection,
      snapshot,
      view,
    ]
  );
}
