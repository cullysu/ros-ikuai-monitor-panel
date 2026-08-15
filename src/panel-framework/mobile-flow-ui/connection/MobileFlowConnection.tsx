import { AlertTriangle, CheckCircle2, Eye, EyeOff, Fingerprint, KeyRound, LoaderCircle, RefreshCw, Router, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { validateRouterAddress } from "../../connection/routerAddress";
import type { RouterConnectionInput } from "../../runtime/panelApi";
import type { RouterChannelTest } from "../../runtime/panelRuntimeSchema";
import type { PanelRuntimeController } from "../../runtime/usePanelRuntime";
import "../styles/flow-connection.css";

function port(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 65_535 ? parsed : null;
}

function channelState(channel: "REST" | "SSH", result: RouterChannelTest | undefined) {
  if (!result) return { tone: "muted", title: "未验证", note: channel === "REST" ? "等待 API 通道结果" : "等待设备指纹结果" };
  if (!result.ok) return { tone: "critical", title: result.hostKeyChanged ? "身份已变化" : "未通过", note: result.error || "没有形成可用证据" };
  if (channel === "REST") {
    const secure = result.scheme === "https" && result.verifyTls === true;
    return { tone: secure ? "normal" : "attention", title: secure ? "HTTPS 已验证" : "通道已连通", note: result.identity || (secure ? "TLS 证书校验通过" : "对端身份保护不完整") };
  }
  return { tone: "normal", title: "身份已读取", note: result.identity || [result.algorithm, result.fingerprint].filter(Boolean).join(" · ") || "SSH 通道已验证" };
}

function ChannelResult({ channel, result }: { channel: "REST" | "SSH"; result: RouterChannelTest | undefined }) {
  const state = channelState(channel, result);
  const Icon = state.tone === "normal" ? CheckCircle2 : state.tone === "critical" ? XCircle : AlertTriangle;
  return <div className="mflow-connection__result" data-tone={state.tone}><Icon size={18} aria-hidden="true" /><span><b>{channel}</b><small>{state.note}</small></span><strong>{state.title}{result?.elapsedMs == null ? null : <small>{Math.round(result.elapsedMs)} ms</small>}</strong></div>;
}

function ConnectionStatus({ runtime }: { runtime: PanelRuntimeController }) {
  const failure = runtime.connection.phase === "error";
  return <main className="mflow-connection-status" data-mobile-flow-connection="status" data-phase={runtime.connection.phase}>
    <Router size={23} aria-hidden="true" /><h1>{failure ? "连接状态不可用" : "正在读取设备"}</h1><p>{failure ? runtime.connection.error || "本地会话暂时不可用。" : "正在核对本地会话和设备元数据。"}</p>
    {failure ? <button type="button" onClick={() => void runtime.retryConnectionStatus()}><RefreshCw size={17} aria-hidden="true" />重新检查</button> : <LoaderCircle className="mflow-spin" size={23} aria-hidden="true" />}
  </main>;
}

export function MobileFlowConnection({ runtime }: { runtime: PanelRuntimeController }) {
  const profile = runtime.connection.profile;
  const [host, setHost] = useState(profile?.host || "");
  const [user, setUser] = useState(profile?.user || "");
  const [password, setPassword] = useState("");
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [sshPort, setSshPort] = useState(String(profile?.sshPort || 22));
  const [restPort, setRestPort] = useState(String(profile?.restPort || 443));
  const [scheme, setScheme] = useState<"https" | "http">(profile?.restScheme || "https");
  const [verifyTls, setVerifyTls] = useState(profile?.restVerifyTls ?? true);
  const [remember, setRemember] = useState(Boolean(profile?.savedId));
  const [riskConfirmed, setRiskConfirmed] = useState(false);
  const [hostKeyConfirmed, setHostKeyConfirmed] = useState(false);
  const [savedId, setSavedId] = useState(profile?.savedId || "");
  const [error, setError] = useState("");
  const parsedSsh = port(sshPort);
  const parsedRest = port(restPort);
  const insecure = scheme === "http" || !verifyTls;
  const challenge = useMemo(() => {
    const pending = runtime.connection.pendingSshHostKey;
    return pending && pending.host === host.trim() && pending.sshPort === parsedSsh ? pending : null;
  }, [host, parsedSsh, runtime.connection.pendingSshHostKey]);

  if (runtime.connection.phase === "checking" || runtime.connection.phase === "error") return <ConnectionStatus runtime={runtime} />;

  const selectSaved = (id: string) => {
    setSavedId(id);
    const saved = runtime.connection.savedLogins.find((item) => item.id === id);
    if (!saved) return;
    setHost(saved.host); setUser(saved.user); setSshPort(String(saved.sshPort)); setRestPort(String(saved.restPort));
    setScheme(saved.restScheme); setVerifyTls(saved.restVerifyTls); setRemember(true); setPassword(""); setError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const addressError = !host.trim() ? "请输入 RouterOS 的 IP 地址或主机名" : validateRouterAddress(host.trim());
    if (addressError) { setError(addressError); return; }
    if (!user.trim()) { setError("请输入 RouterOS 用户名"); return; }
    if (!password) { setError("请输入密码；密码只保留在当前页面内存中"); return; }
    if (parsedRest === null || parsedSsh === null) { setError("REST 与 SSH 端口必须是 1–65535 的整数"); return; }
    if (insecure && !riskConfirmed) { setError(scheme === "http" ? "继续前必须确认 HTTP 会明文传输凭据" : "继续前必须确认关闭 TLS 校验会失去设备身份验证"); return; }
    if (challenge?.kind === "changed") { setError("SSH 指纹已经变化，已停止验证；请先在设备侧核查。"); return; }
    if (challenge?.kind === "confirmation-required" && !hostKeyConfirmed) { setError("请先在可信路径核对并确认 SSH 指纹"); return; }
    const input: RouterConnectionInput = {
      host: host.trim(), user: user.trim(), password, sshPort: parsedSsh, restPort: parsedRest, restScheme: scheme,
      restVerifyTls: scheme === "https" && verifyTls, insecureRestConfirmed: insecure && riskConfirmed, rememberProfile: remember,
      ...(savedId ? { savedId } : {}),
      ...(challenge?.kind === "confirmation-required" && hostKeyConfirmed ? { sshHostKeyFingerprint: challenge.fingerprint, sshHostKeyTrustToken: challenge.trustToken } : {}),
    };
    setError("");
    if (await runtime.connect(input)) setPassword("");
  };

  const lastTest = runtime.connection.lastTest || profile?.lastTest || undefined;
  return <main className="mflow-connection" data-mobile-flow-connection="flow" data-busy={runtime.connection.busy || undefined}>
    <header className="mflow-connection__title"><p>只读采集</p><h1>连接 RouterOS</h1><span><KeyRound size={14} aria-hidden="true" />密码只在当前页面内存中</span></header>
    <form noValidate onSubmit={(event) => void submit(event)}>
      <section className="mflow-connection__group" aria-labelledby="mflow-device-heading"><h2 id="mflow-device-heading">设备</h2>
        {runtime.connection.savedLogins.length ? <label><span>设备资料</span><select value={savedId} onChange={(event) => selectSaved(event.target.value)}><option value="">手动输入</option>{runtime.connection.savedLogins.map((saved) => <option key={saved.id} value={saved.id}>{saved.label} · {saved.host}</option>)}</select></label> : null}
        <label><span>设备地址</span><input name="host" value={host} onChange={(event) => { setHost(event.target.value); setError(""); }} placeholder="192.168.88.1" autoCapitalize="none" autoCorrect="off" spellCheck={false} /></label>
        <label><span>用户名</span><input name="user" value={user} onChange={(event) => { setUser(event.target.value); setError(""); }} autoCapitalize="none" autoCorrect="off" spellCheck={false} /></label>
        <label><span>密码</span><div className="mflow-connection__password"><input name="password" type={visiblePassword ? "text" : "password"} value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} autoComplete="current-password" /><button type="button" onClick={() => setVisiblePassword((value) => !value)} aria-label={visiblePassword ? "隐藏密码" : "显示密码"}>{visiblePassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></div></label>
      </section>
      <section className="mflow-connection__group" aria-labelledby="mflow-channel-heading"><h2 id="mflow-channel-heading">通道</h2>
        <div className="mflow-connection__segmented" role="group" aria-label="REST 协议"><button type="button" aria-pressed={scheme === "https"} onClick={() => { setScheme("https"); setVerifyTls(true); setRiskConfirmed(false); }}><ShieldCheck size={16} aria-hidden="true" />HTTPS</button><button type="button" aria-pressed={scheme === "http"} onClick={() => { setScheme("http"); setVerifyTls(false); setRiskConfirmed(false); }}><ShieldAlert size={16} aria-hidden="true" />HTTP</button></div>
        <label><span>REST 端口</span><input inputMode="numeric" value={restPort} onChange={(event) => setRestPort(event.target.value)} /></label>
        <label><span>SSH 端口</span><input inputMode="numeric" value={sshPort} onChange={(event) => setSshPort(event.target.value)} /></label>
        {scheme === "https" ? <label className="mflow-connection__switch"><span>校验 TLS 证书</span><input type="checkbox" role="switch" checked={verifyTls} onChange={(event) => { setVerifyTls(event.target.checked); setRiskConfirmed(false); }} /></label> : null}
        {insecure ? <label className="mflow-connection__risk"><input type="checkbox" checked={riskConfirmed} onChange={(event) => setRiskConfirmed(event.target.checked)} /><span>我确认当前传输方式无法完整验证或保护设备身份</span></label> : null}
      </section>
      {challenge ? <section className="mflow-connection__hostkey" data-kind={challenge.kind}><Fingerprint size={18} aria-hidden="true" /><span><b>{challenge.kind === "changed" ? "SSH 身份已变化" : "核对 SSH 指纹"}</b><code>{challenge.fingerprint}</code>{challenge.kind === "confirmation-required" ? <label><input type="checkbox" checked={hostKeyConfirmed} onChange={(event) => setHostKeyConfirmed(event.target.checked)} />我已通过可信路径核对</label> : <small>验证已停止，不会覆盖固定身份。</small>}</span></section> : null}
      <section className="mflow-connection__results" aria-label="独立通道结果"><ChannelResult channel="REST" result={lastTest?.rest} /><ChannelResult channel="SSH" result={lastTest?.ssh} /></section>
      <label className="mflow-connection__remember"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span><b>记住设备元数据</b><small>只保存地址、用户名、端口、传输方式和已验证指纹；绝不保存密码。</small></span></label>
      {error ? <p className="mflow-connection__error" role="alert"><AlertTriangle size={18} aria-hidden="true" />{error}</p> : null}
      <footer><button type="submit" disabled={runtime.connection.busy}>{runtime.connection.busy ? <LoaderCircle className="mflow-spin" size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}{runtime.connection.busy ? "正在独立验证" : "验证 REST 与 SSH"}</button></footer>
    </form>
  </main>;
}

export default MobileFlowConnection;
