import { useEffect, useState } from "react";
import { CircleAlert, CloudOff, RefreshCw, Router, X } from "lucide-react";
import type { PanelRuntimeController, PanelSnapshotPhase } from "./usePanelRuntime";
import "./panel-runtime.css";

const MOBILE_RUNTIME_QUERY = "(max-width: 899px)";

function useMobileRuntimeSurface(): boolean {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia(MOBILE_RUNTIME_QUERY).matches);
  useEffect(() => {
    const media = window.matchMedia(MOBILE_RUNTIME_QUERY);
    const sync = () => setMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return mobile;
}

function phaseLabel(phase: PanelSnapshotPhase, age: number | null): string {
  const ageText = age === null ? "时间未记录" : age < 60 ? `${age} 秒前` : `${Math.floor(age / 60)} 分钟前`;
  if (phase === "current") return `当前 · ${ageText}`;
  if (phase === "refreshing") return `刷新中 · ${ageText}`;
  if (phase === "stale") return `历史证据 · ${ageText}`;
  if (phase === "offline") return "浏览器离线";
  if (phase === "recovering") return `恢复中 · ${ageText}`;
  if (phase === "error") return "快照不可用";
  return "正在载入";
}

function mobileEvidenceLabel(runtime: PanelRuntimeController): string {
  const phase = phaseLabel(runtime.snapshot.phase, runtime.evidenceAgeSeconds);
  const source = runtime.snapshot.data?.updatedAt;
  if (!source || Number.isNaN(Date.parse(source))) return phase;
  const stamp = new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(source));
  return `${phase} · ${stamp}`;
}

function RuntimeActions({ runtime }: { runtime: PanelRuntimeController }) {
  const busy = runtime.snapshot.phase === "loading" || runtime.snapshot.phase === "refreshing";
  return (
    <div className="panel-runtime-actions">
      <button type="button" title="立即刷新" aria-label="立即刷新" onClick={() => void runtime.refresh("manual")} disabled={busy || !runtime.online}>
        <RefreshCw className={busy ? "is-spinning" : ""} size={19} aria-hidden="true" />
      </button>
      <button type="button" title="设备连接" aria-label="设备连接" onClick={runtime.showConnection}>
        <Router size={19} aria-hidden="true" />
      </button>
    </div>
  );
}

function MobileRuntimeBar({ runtime }: { runtime: PanelRuntimeController }) {
  return (
    <header className="panel-runtime-bar panel-runtime-bar-mobile" data-panel-runtime-toolbar="mobile">
      <div className="panel-runtime-device"><b>{runtime.connection.profile?.host || "RouterOS"}</b><span>{mobileEvidenceLabel(runtime)}</span></div>
      <RuntimeActions runtime={runtime} />
    </header>
  );
}

function DesktopRuntimeBar({ runtime }: { runtime: PanelRuntimeController }) {
  const identity = runtime.snapshot.data?.overview?.identity || runtime.connection.profile?.host || "RouterOS";
  return (
    <header className="panel-runtime-bar panel-runtime-bar-desktop" data-panel-runtime-toolbar="desktop">
      <div className="panel-runtime-device"><span>当前设备</span><b>{identity}</b><small>{runtime.connection.profile?.host || "地址未记录"}</small></div>
      <div className={`panel-runtime-phase is-${runtime.snapshot.phase}`}><i aria-hidden="true" /><span>{phaseLabel(runtime.snapshot.phase, runtime.evidenceAgeSeconds)}</span></div>
      <RuntimeActions runtime={runtime} />
    </header>
  );
}

export function PanelRuntimeChrome({ runtime }: { runtime: PanelRuntimeController }) {
  const mobile = useMobileRuntimeSurface();
  return mobile ? <MobileRuntimeBar runtime={runtime} /> : <DesktopRuntimeBar runtime={runtime} />;
}

export function PanelRuntimeNotice({ runtime }: { runtime: PanelRuntimeController }) {
  const snapshotMessage = runtime.snapshot.phase === "current" || runtime.snapshot.phase === "refreshing" ? "" : runtime.snapshot.error;
  const message = snapshotMessage || runtime.connection.warning;
  const showsConnectionWarning = !snapshotMessage && Boolean(runtime.connection.warning);
  if (!message) return null;
  const offline = runtime.snapshot.phase === "offline";
  const critical = runtime.snapshot.phase === "error" && !runtime.snapshot.data;
  return (
    <div className={`panel-runtime-notice ${critical ? "is-critical" : ""}`} role={critical ? "alert" : "status"}>
      {offline ? <CloudOff size={18} aria-hidden="true" /> : <CircleAlert size={18} aria-hidden="true" />}
      <span>{message}</span>
      {showsConnectionWarning ? (
        <button type="button" title="关闭连接提示" aria-label="关闭连接提示" onClick={runtime.dismissWarning}><X size={17} aria-hidden="true" /></button>
      ) : null}
    </div>
  );
}

export function PanelRuntimeEmptyState({ runtime }: { runtime: PanelRuntimeController }) {
  const offline = runtime.snapshot.phase === "offline";
  const recovering = runtime.snapshot.phase === "loading" || runtime.snapshot.phase === "recovering" || runtime.snapshot.phase === "idle";
  return (
    <main className="panel-runtime-empty" data-panel-runtime-empty={runtime.snapshot.phase}>
      <div aria-hidden="true">{offline ? <CloudOff size={26} /> : <RefreshCw className={recovering ? "is-spinning" : ""} size={26} />}</div>
      <h1>{offline ? "浏览器当前离线" : recovering ? "正在建立设备快照" : "无法读取设备快照"}</h1>
      <p>{runtime.snapshot.error || (recovering ? "连接已经验证，正在等待首个可用采集结果。" : "没有可供判断的 RouterOS 证据。")}</p>
      <div>
        <button type="button" onClick={() => void runtime.refresh("manual")} disabled={!runtime.online}>重新获取</button>
        <button type="button" onClick={runtime.showConnection}>检查设备连接</button>
      </div>
    </main>
  );
}
