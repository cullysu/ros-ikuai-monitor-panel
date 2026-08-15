import { CircleAlert, RefreshCw, X } from "lucide-react";
import type { PanelRuntimeController } from "./usePanelRuntime";

export function PanelRuntimeNotice({ runtime }: { runtime: PanelRuntimeController }) {
  const snapshotMessage = runtime.snapshot.phase === "current" || runtime.snapshot.phase === "refreshing" ? "" : runtime.snapshot.error;
  const browserConnectivityHint = !runtime.browserOnlineHint ? "浏览器报告互联网不可用；本地 RouterOS 快照请求仍会继续。" : "";
  const message = snapshotMessage || runtime.connection.warning || browserConnectivityHint;
  const showsConnectionWarning = !snapshotMessage && Boolean(runtime.connection.warning);
  if (!message) return null;
  const critical = runtime.snapshot.phase === "error" && !runtime.snapshot.data;
  return <div className={`panel-runtime-notice ${critical ? "is-critical" : ""}`} role={critical ? "alert" : "status"}><CircleAlert size={18} aria-hidden="true" /><span>{message}</span>{showsConnectionWarning ? <button type="button" title="关闭连接提示" aria-label="关闭连接提示" onClick={runtime.dismissWarning}><X size={17} aria-hidden="true" /></button> : null}</div>;
}

export function PanelRuntimeEmptyState({ runtime }: { runtime: PanelRuntimeController }) {
  const recovering = runtime.snapshot.phase === "loading" || runtime.snapshot.phase === "recovering" || runtime.snapshot.phase === "idle";
  return <main className="panel-runtime-empty" data-panel-runtime-empty={runtime.snapshot.phase}><div aria-hidden="true"><RefreshCw className={recovering ? "is-spinning" : ""} size={26} /></div><h1>{recovering ? "正在建立设备快照" : "无法读取设备快照"}</h1><p>{runtime.snapshot.error || (recovering ? "连接已经验证，正在等待首个可用采集结果。" : "没有可供判断的 RouterOS 证据。")}</p><div><button type="button" onClick={() => void runtime.refresh("manual")}>重新获取</button><button type="button" onClick={runtime.showConnection}>检查设备连接</button></div></main>;
}
