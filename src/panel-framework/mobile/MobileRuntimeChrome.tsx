import { Ellipsis, RefreshCw, Router } from "lucide-react";
import type { PanelNavigate, PanelRouteId } from "../routes/panelRoutes";
import type { PanelRuntimeController, PanelSnapshotPhase } from "../runtime/usePanelRuntime";
import "./mobile-runtime.css";

function phaseLabel(phase: PanelSnapshotPhase): string {
  if (phase === "current") return "传输已更新";
  if (phase === "refreshing") return "刷新中";
  if (phase === "stale") return "历史快照";
  if (phase === "recovering") return "恢复中";
  if (phase === "error") return "快照不可用";
  return "正在载入";
}

export function MobileRuntimeChrome({ runtime, route, onNavigate }: { runtime: PanelRuntimeController; route: PanelRouteId; onNavigate: PanelNavigate }) {
  const busy = runtime.snapshot.phase === "loading" || runtime.snapshot.phase === "refreshing";
  return <header className="panel-runtime-bar panel-runtime-bar-mobile" data-panel-runtime-toolbar="mobile">
    <div className="panel-runtime-device"><b>{runtime.connection.profile?.host || "RouterOS"}</b><span>{phaseLabel(runtime.snapshot.phase)} · 只读</span></div>
    <div className="panel-runtime-actions">
      <button type="button" title="立即刷新" aria-label="立即刷新" onClick={() => void runtime.refresh("manual")} disabled={busy}><RefreshCw className={busy ? "is-spinning" : ""} size={19} aria-hidden="true" /></button>
      <button type="button" title="设备连接" aria-label="设备连接" onClick={runtime.showConnection}><Router size={19} aria-hidden="true" /></button>
      {route === "more" ? null : <button type="button" id="panel-runtime-more" title="更多只读工具" aria-label="更多只读工具" data-panel-runtime-more onClick={() => onNavigate("more", { focusId: "panel-runtime-more" })}><Ellipsis size={20} aria-hidden="true" /></button>}
    </div>
  </header>;
}
