import { useEffect, useState } from "react";
import { CircleAlert, Ellipsis, LockKeyhole, RefreshCw, Router, X } from "lucide-react";
import type { PanelNavigate, PanelRouteId } from "../routes/panelRoutes";
import type { PanelRuntimeController, PanelSnapshotPhase } from "./usePanelRuntime";
import "./panel-runtime.css";

const MOBILE_RUNTIME_QUERY = "(max-width: 1199px) and (orientation: portrait), (max-width: 599px)";

function useRuntimeMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const sync = () => setMatches(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [query]);
  return matches;
}

function phaseLabel(phase: PanelSnapshotPhase, age: number | null): string {
  const ageText = age === null ? "时间未记录" : age < 60 ? `${age} 秒前` : `${Math.floor(age / 60)} 分钟前`;
  if (phase === "current") return `当前快照 · ${ageText}`;
  if (phase === "refreshing") return `快照刷新中 · ${ageText}`;
  if (phase === "stale") return `历史快照 · ${ageText}`;
  if (phase === "recovering") return `快照恢复中 · ${ageText}`;
  if (phase === "error") return "快照不可用";
  return "正在载入";
}

function mobilePhaseLabel(phase: PanelSnapshotPhase): string {
  if (phase === "current") return "传输已更新";
  if (phase === "refreshing") return "刷新中";
  if (phase === "stale") return "历史快照";
  if (phase === "recovering") return "恢复中";
  if (phase === "error") return "快照不可用";
  return "正在载入";
}

function RuntimeActions({ runtime, onMore }: { runtime: PanelRuntimeController; onMore?: () => void }) {
  const busy = runtime.snapshot.phase === "loading" || runtime.snapshot.phase === "refreshing";
  return (
    <div className="panel-runtime-actions">
      <button type="button" title="立即刷新" aria-label="立即刷新" onClick={() => void runtime.refresh("manual")} disabled={busy}>
        <RefreshCw className={busy ? "is-spinning" : ""} size={19} aria-hidden="true" />
      </button>
      <button type="button" title="设备连接" aria-label="设备连接" onClick={runtime.showConnection}>
        <Router size={19} aria-hidden="true" />
      </button>
      {onMore ? (
        <button type="button" id="panel-runtime-more" title="更多只读工具" aria-label="更多只读工具" data-panel-runtime-more onClick={onMore}>
          <Ellipsis size={20} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

function MobileRuntimeBar({ runtime, onMore }: { runtime: PanelRuntimeController; onMore?: () => void }) {
  return (
    <header className="panel-runtime-bar panel-runtime-bar-mobile" data-panel-runtime-toolbar="mobile">
      <div className="panel-runtime-device"><b>{runtime.connection.profile?.host || "RouterOS"}</b><span>{mobilePhaseLabel(runtime.snapshot.phase)} · 只读</span></div>
      <RuntimeActions runtime={runtime} onMore={onMore} />
    </header>
  );
}

function DesktopRuntimeBar({ runtime, onMore }: { runtime: PanelRuntimeController; onMore?: () => void }) {
  const identity = runtime.snapshot.data?.overview?.identity || runtime.connection.profile?.host || "RouterOS";
  return (
    <header className="panel-runtime-bar panel-runtime-bar-desktop" data-panel-runtime-toolbar="desktop">
      <div className="panel-runtime-device"><span>当前设备</span><b>{runtime.connection.profile?.host || "RouterOS"}</b><small>{identity}</small></div>
      <span className="panel-runtime-mode" aria-label="只读监控模式" title="只读监控模式"><LockKeyhole size={14} aria-hidden="true" /><span>只读</span></span>
      <div className={`panel-runtime-phase is-${runtime.snapshot.phase}`}><i aria-hidden="true" /><span>{phaseLabel(runtime.snapshot.phase, runtime.evidenceAgeSeconds)}</span></div>
      <RuntimeActions runtime={runtime} onMore={onMore} />
    </header>
  );
}

export function PanelRuntimeChrome({
  runtime,
  route,
  onNavigate,
}: {
  runtime: PanelRuntimeController;
  route: PanelRouteId;
  onNavigate: PanelNavigate;
}) {
  const mobile = useRuntimeMedia(MOBILE_RUNTIME_QUERY);
  return mobile
    ? <MobileRuntimeBar runtime={runtime} onMore={route === "more" ? undefined : () => onNavigate("more", { focusId: "panel-runtime-more" })} />
    : <DesktopRuntimeBar runtime={runtime} onMore={route === "overview" ? () => onNavigate("more", { focusId: "panel-runtime-more" }) : undefined} />;
}

export function PanelRuntimeNotice({ runtime }: { runtime: PanelRuntimeController }) {
  const snapshotMessage = runtime.snapshot.phase === "current" || runtime.snapshot.phase === "refreshing" ? "" : runtime.snapshot.error;
  const browserConnectivityHint = !runtime.browserOnlineHint
    ? "浏览器报告互联网不可用；本地 RouterOS 快照请求仍会继续。"
    : "";
  const message = snapshotMessage || runtime.connection.warning || browserConnectivityHint;
  const showsConnectionWarning = !snapshotMessage && Boolean(runtime.connection.warning);

  if (!message) return null;
  const critical = runtime.snapshot.phase === "error" && !runtime.snapshot.data;
  return (
    <div className={`panel-runtime-notice ${critical ? "is-critical" : ""}`} role={critical ? "alert" : "status"}>
      <CircleAlert size={18} aria-hidden="true" />
      <span>{message}</span>
      {showsConnectionWarning ? (
        <button type="button" title="关闭连接提示" aria-label="关闭连接提示" onClick={runtime.dismissWarning}><X size={17} aria-hidden="true" /></button>
      ) : null}
    </div>
  );
}

export function PanelRuntimeEmptyState({ runtime }: { runtime: PanelRuntimeController }) {
  const recovering = runtime.snapshot.phase === "loading" || runtime.snapshot.phase === "recovering" || runtime.snapshot.phase === "idle";
  return (
    <main className="panel-runtime-empty" data-panel-runtime-empty={runtime.snapshot.phase}>
      <div aria-hidden="true"><RefreshCw className={recovering ? "is-spinning" : ""} size={26} /></div>
      <h1>{recovering ? "正在建立设备快照" : "无法读取设备快照"}</h1>
      <p>{runtime.snapshot.error || (recovering ? "连接已经验证，正在等待首个可用采集结果。" : "没有可供判断的 RouterOS 证据。")}</p>
      <div>
        <button type="button" onClick={() => void runtime.refresh("manual")}>重新获取</button>
        <button type="button" onClick={runtime.showConnection}>检查设备连接</button>
      </div>
    </main>
  );
}
