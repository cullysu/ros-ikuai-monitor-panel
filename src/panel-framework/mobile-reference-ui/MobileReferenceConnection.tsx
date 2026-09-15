import { AlertOctagon, ArrowLeft, Check, ChevronDown, ChevronRight, Eye, EyeOff, Fingerprint, LoaderCircle, LockKeyhole, RefreshCw, Router } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { validateRouterAddress } from "../connection/routerAddress";
import type { RouterConnectionInput } from "../runtime/panelApi";
import type { RouterChannelTest } from "../runtime/panelRuntimeSchema";
import type { PanelRuntimeController } from "../runtime/usePanelRuntime";

const port = (value: string): number | null => { const parsed = Number(value); return /^\d+$/.test(value) && Number.isInteger(parsed) && parsed >= 1 && parsed <= 65_535 ? parsed : null; };

function ChannelResultRow({ label, channel }: { label: string; channel: RouterChannelTest | undefined }) {
  const ok = channel?.ok === true;
  const detail = !channel
    ? "未验证"
    : ok
      ? `已验证 · ${typeof channel.elapsedMs === "number" ? `${channel.elapsedMs}ms` : "—"}${channel.identity ? ` · ${channel.identity}` : ""}`
      : channel.error || "未通过";
  return (
    <div data-ok={ok ? "true" : "false"}>
      {ok ? <Check size={18} aria-hidden="true" /> : <AlertOctagon size={18} aria-hidden="true" />}
      <span>
        <b>{label}</b>
        <small>{detail}</small>
      </span>
    </div>
  );
}

export function MobileReferenceConnection({ runtime }: { runtime: PanelRuntimeController }) {
  if (runtime.connection.phase === "checking" || runtime.connection.phase === "error") return <main className="ref-connect ref-connect__loading" data-mobile-reference-connection="bootstrap"><Router size={25} aria-hidden="true" /><h1>{runtime.connection.phase === "error" ? "无法读取连接状态" : "正在读取设备资料"}</h1><p>{runtime.connection.error || "正在读取本地会话与设备资料"}</p>{runtime.connection.phase === "error" ? <button type="button" onClick={() => void runtime.retryConnectionStatus()}><RefreshCw size={18} aria-hidden="true" />重新读取</button> : <LoaderCircle className="ref-spin" aria-label="正在读取" />}</main>;
  return <MobileReferenceConnectionForm runtime={runtime} />;
}

function MobileReferenceConnectionForm({ runtime }: { runtime: PanelRuntimeController }) {
  const profile = runtime.connection.profile;
  const [host, setHost] = useState(profile?.host || "");
  const [user, setUser] = useState(profile?.user || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [restPort, setRestPort] = useState(String(profile?.restPort || 443));
  const [sshPort, setSshPort] = useState(String(profile?.sshPort || 22));
  const [scheme, setScheme] = useState<"https" | "http">(profile?.restScheme || "https");
  const [verifyTls, setVerifyTls] = useState(profile?.restVerifyTls ?? true);
  const [riskConfirmed, setRiskConfirmed] = useState(false);
  const [hostKeyConfirmed, setHostKeyConfirmed] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [error, setError] = useState("");
  const rest = port(restPort); const ssh = port(sshPort); const insecure = scheme === "http" || !verifyTls;
  const changeScheme = (next: "https" | "http") => {
    if (next === scheme) return;
    const previousDefault = scheme === "https" ? 443 : 80;
    setScheme(next); setVerifyTls(next === "https"); setRiskConfirmed(false);
    if (restPort === String(previousDefault)) setRestPort(next === "https" ? "443" : "80");
  };
  const challenge = useMemo(() => { const pending = runtime.connection.pendingSshHostKey; return pending && pending.host === host.trim() && pending.sshPort === ssh ? pending : null; }, [host, runtime.connection.pendingSshHostKey, ssh]);
  if (runtime.connection.phase === "checking" || runtime.connection.phase === "error") return <main className="ref-connect ref-connect__loading" data-mobile-reference-connection="bootstrap"><Router size={25} aria-hidden="true" /><h1>{runtime.connection.phase === "error" ? "无法读取连接状态" : "正在读取设备资料"}</h1><p>{runtime.connection.error || "正在读取本地会话与设备资料"}</p>{runtime.connection.phase === "error" ? <button type="button" onClick={() => void runtime.retryConnectionStatus()}><RefreshCw size={18} aria-hidden="true" />重新读取</button> : <LoaderCircle className="ref-spin" aria-label="正在读取" />}</main>;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); const addressError = !host.trim() ? "请输入 RouterOS 的 IP 地址或主机名" : validateRouterAddress(host.trim());
    if (addressError) return setError(addressError); if (!user.trim()) return setError("请输入 RouterOS 用户名"); if (!password) return setError("请输入密码；密码只保留在当前页面内存中"); if (rest === null || ssh === null) { setAdvancedOpen(true); return setError("REST 与 SSH 端口必须是 1–65535 的整数"); } if (insecure && !riskConfirmed) { setAdvancedOpen(true); return setError("继续前必须确认当前传输方式无法完整保护设备身份"); } if (challenge?.kind === "changed") return setError("SSH 指纹已经变化，验证已阻断"); if (challenge?.kind === "confirmation-required" && (!hostKeyConfirmed || !challenge.trustToken)) return setError("请先通过可信路径核对并确认 SSH 指纹");
    const input: RouterConnectionInput = { host: host.trim(), user: user.trim(), password, restScheme: scheme, restPort: rest, sshPort: ssh, restVerifyTls: scheme === "https" && verifyTls, insecureRestConfirmed: insecure && riskConfirmed, rememberProfile: false, ...(challenge?.kind === "confirmation-required" && challenge.trustToken && hostKeyConfirmed ? { sshHostKeyFingerprint: challenge.fingerprint, sshHostKeyTrustToken: challenge.trustToken } : {}) };
    setError(""); if (await runtime.connect(input)) setPassword("");
  };
  const lastTest = runtime.connection.lastTest;
  return <main className="ref-connect" data-mobile-reference-connection="form"><header><button type="button" onClick={() => runtime.cancelConnection()} disabled={!runtime.canCancelConnection} aria-label="返回概览"><ArrowLeft size={20} aria-hidden="true" /></button><h1>连接 RouterOS</h1><LockKeyhole size={19} aria-label="密码不会被保存" /></header><p className="ref-connect__note">密码仅保留在当前页面内存中，连接后立即清除；面板对 RouterOS 只读。</p><form onSubmit={(event) => void submit(event)}><section aria-label="路由器账号"><label className="ref-connect__field"><span>地址</span><input name="host" value={host} onChange={(event) => { setHost(event.target.value); setError(""); }} placeholder="192.168.3.1" autoCapitalize="none" autoCorrect="off" inputMode="url" /></label><label className="ref-connect__field"><span>用户名</span><input name="user" value={user} onChange={(event) => setUser(event.target.value)} placeholder="只读用户名" autoCapitalize="none" autoCorrect="off" autoComplete="username" /></label><label className="ref-connect__field"><span>密码</span><span className="ref-connect__password"><input name="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="RouterOS 密码" autoComplete="current-password" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "隐藏密码" : "显示密码"}>{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></span></label></section><section className="ref-connect__advanced" aria-label="连接保护"><button type="button" className="ref-connect__disclosure" aria-expanded={advancedOpen} onClick={() => setAdvancedOpen((value) => !value)}><span>高级选项</span><ChevronDown size={17} aria-hidden="true" className={advancedOpen ? "ref-connect__chevron is-open" : "ref-connect__chevron"} /></button>{advancedOpen ? (<><div className="ref-connect__protocol" role="group" aria-label="REST 协议"><button type="button" aria-pressed={scheme === "https"} onClick={() => changeScheme("https")}>HTTPS</button><button type="button" aria-pressed={scheme === "http"} onClick={() => changeScheme("http")}>HTTP</button></div><div className="ref-connect__ports"><label className="ref-connect__field"><span>REST 端口</span><input inputMode="numeric" value={restPort} onChange={(event) => setRestPort(event.target.value)} /></label><label className="ref-connect__field"><span>SSH 端口</span><input inputMode="numeric" value={sshPort} onChange={(event) => setSshPort(event.target.value)} /></label></div>{scheme === "https" ? <label className="ref-connect__toggle"><input type="checkbox" role="switch" checked={verifyTls} onChange={(event) => { setVerifyTls(event.target.checked); setRiskConfirmed(false); }} /><span>校验 TLS 证书（自签证书需关闭）</span></label> : null}{insecure ? <label className="ref-connect__risk"><input type="checkbox" checked={riskConfirmed} onChange={(event) => setRiskConfirmed(event.target.checked)} /><span>我确认当前传输方式无法完整保护设备身份。</span></label> : null}</>) : null}</section>{challenge ? <section className="ref-connect__identity" data-kind={challenge.kind}><Fingerprint size={19} aria-hidden="true" /><div><b>{challenge.kind === "changed" ? "SSH 身份已变化" : "核对 SSH 指纹"}</b><code>{challenge.fingerprint}</code>{challenge.kind === "confirmation-required" ? <label><input type="checkbox" checked={hostKeyConfirmed} onChange={(event) => setHostKeyConfirmed(event.target.checked)} />我已通过可信路径核对这枚指纹</label> : null}</div></section> : null}{lastTest ? <section className="ref-connect__results"><h2>通道回执</h2><ChannelResultRow label="REST" channel={lastTest.rest} /><ChannelResultRow label="SSH" channel={lastTest.ssh} /></section> : null}{error || runtime.connection.error ? <p className="ref-connect__error" role="alert"><AlertOctagon size={18} aria-hidden="true" />{error || runtime.connection.error}</p> : null}<footer><button type="submit" disabled={runtime.connection.busy}>{runtime.connection.busy ? <LoaderCircle className="ref-spin" size={18} aria-hidden="true" /> : <LockKeyhole size={18} aria-hidden="true" />}{runtime.connection.busy ? "正在验证设备" : "验证并连接"}<ChevronRight size={18} aria-hidden="true" /></button><small>只读连接 · 不修改路由器配置</small></footer></form></main>;
}
