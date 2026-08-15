import { Ellipsis, LockKeyhole, RefreshCw, Router } from "lucide-react";
import type { PanelNavigate, PanelRouteId } from "../routes/panelRoutes";
import type { PanelRuntimeController, PanelSnapshotPhase } from "../runtime/usePanelRuntime";
import "./desktop-runtime.css";

function phaseLabel(phase: PanelSnapshotPhase, age: number | null): string {
  const ageText = age === null ? "时间未记录" : age < 60 ? `${age} 秒前` : `${Math.floor(age / 60)} 分钟前`;
  if (phase === "current") return `当前快照 · ${ageText}`;
  if (phase === "refreshing") return `快照刷新中 · ${ageText}`;
  if (phase === "stale") return `历史快照 · ${ageText}`;
  if (phase === "recovering") return `快照恢复中 · ${ageText}`;
  if (phase === "error") return "快照不可用";
  return "正在载入";
}

export function DesktopRuntimeChrome({ runtime, route, onNavigate }: { runtime: PanelRuntimeController; route: PanelRouteId; onNavigate: PanelNavigate }) {
  const busy = runtime.snapshot.phase === "loading" || runtime.snapshot.phase === "refreshing";
  const identity = runtime.snapshot.data?.overview?.identity || runtime.connection.profile?.host || "RouterOS";
  return <header className="panel-runtime-bar panel-runtime-bar-desktop" data-panel-runtime-toolbar="desktop">
    <div className="panel-runtime-device"><span>当前设备</span><b>{runtime.connection.profile?.host || "RouterOS"}</b><small>{identity}</small></div>
    <span className="panel-runtime-mode" aria-label="只读监控模式" title="只读监控模式"><LockKeyhole size={14} aria-hidden="true" /><span>只读</span></span>
    <div className={`panel-runtime-phase is-${runtime.snapshot.phase}`}><i aria-hidden="true" /><span>{phaseLabel(runtime.snapshot.phase, runtime.evidenceAgeSeconds)}</span></div>
    <div className="panel-runtime-actions">
      <button type="button" title="立即刷新" aria-label="立即刷新" onClick={() => void runtime.refresh("manual")} disabled={busy}><RefreshCw className={busy ? "is-spinning" : ""} size={19} aria-hidden="true" /></button>
      <button type="button" title="设备连接" aria-label="设备连接" onClick={runtime.showConnection}><Router size={19} aria-hidden="true" /></button>
      {route === "overview" ? <button type="button" id="panel-runtime-more" title="更多只读工具" aria-label="更多只读工具" data-panel-runtime-more onClick={() => onNavigate("more", { focusId: "panel-runtime-more" })}><Ellipsis size={20} aria-hidden="true" /></button> : null}
    </div>
  </header>;
}
