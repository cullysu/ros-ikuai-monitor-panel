import { AlertOctagon, Check, ChevronDown, ChevronRight, Eye, EyeOff, Fingerprint, LoaderCircle, LockKeyhole, RefreshCw, Server } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { validateRouterAddress } from "../connection/routerAddress";
import type { RouterConnectionInput } from "../runtime/panelApi";
import type { RouterChannelTest } from "../runtime/panelRuntimeSchema";
import type { PanelRuntimeController } from "../runtime/usePanelRuntime";
import "./mobile-ntr.css";

const port = (value: string): number | null => { const parsed = Number(value); return /^\d+$/.test(value) && Number.isInteger(parsed) && parsed >= 1 && parsed <= 65_535 ? parsed : null; };

function ChannelRow({ label, channel }: { label: string; channel: RouterChannelTest | undefined }) {
  const ok = channel?.ok === true;
  const detail = !channel ? "未验证" : ok ? `已验证 · ${typeof channel.elapsedMs === "number" ? `${channel.elapsedMs}ms` : "—"}${channel.identity ? ` · ${channel.identity}` : ""}` : channel.error || "未通过";
  return <div className="ntr-kv"><span>{label}</span><strong data-tone={ok ? "ok" : channel ? "danger" : "muted"}>{detail}</strong></div>;
}

export function MobileNtrConnection({ runtime }: { runtime: PanelRuntimeController }) {
  if (runtime.connection.phase === "checking" || runtime.connection.phase === "error") {
    return <main className="ntr-login" style={{ display: "grid", placeItems: "center", textAlign: "center" }}>
      <div><Server size={30} style={{ color: "var(--ntr-blue)" }} /><h1 style={{ margin: "12px 0 4px", fontSize: 19 }}>{runtime.connection.phase === "error" ? "无法读取连接状态" : "正在读取设备资料"}</h1><p className="ntr-note">{runtime.connection.error || "正在读取本地会话与设备资料"}</p>{runtime.connection.phase === "error" ? <button className="ntr-primary-btn" style={{ marginTop: 14 }} type="button" onClick={() => void runtime.retryConnectionStatus()}><RefreshCw size={18} />重新读取</button> : <LoaderCircle className="ntr-spin" size={26} style={{ color: "var(--ntr-blue)", margin: "14px auto 0" }} />}</div>
    </main>;
  }
  return <MobileNtrConnectionForm runtime={runtime} />;
}

function MobileNtrConnectionForm({ runtime }: { runtime: PanelRuntimeController }) {
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
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const addressError = !host.trim() ? "请输入 RouterOS 的 IP 地址或主机名" : validateRouterAddress(host.trim());
    if (addressError) return setError(addressError);
    if (!user.trim()) return setError("请输入 RouterOS 用户名");
    if (!password) return setError("请输入密码；密码只保留在当前页面内存中");
    if (rest === null || ssh === null) { setAdvancedOpen(true); return setError("REST 与 SSH 端口必须是 1–65535 的整数"); }
    if (insecure && !riskConfirmed) { setAdvancedOpen(true); return setError("继续前必须确认当前传输方式无法完整保护设备身份"); }
    if (challenge?.kind === "changed") return setError("SSH 指纹已经变化，验证已阻断");
    if (challenge?.kind === "confirmation-required" && (!hostKeyConfirmed || !challenge.trustToken)) return setError("请先通过可信路径核对并确认 SSH 指纹");
    const input: RouterConnectionInput = { host: host.trim(), user: user.trim(), password, restScheme: scheme, restPort: rest, sshPort: ssh, restVerifyTls: scheme === "https" && verifyTls, insecureRestConfirmed: insecure && riskConfirmed, rememberProfile: false, ...(challenge?.kind === "confirmation-required" && challenge.trustToken && hostKeyConfirmed ? { sshHostKeyFingerprint: challenge.fingerprint, sshHostKeyTrustToken: challenge.trustToken } : {}) };
    setError("");
    if (await runtime.connect(input)) setPassword("");
  };
  const lastTest = runtime.connection.lastTest;
  return <main className="ntr-login">
    <header className="ntr-subbar"><div /><h1>连接 RouterOS</h1><div /></header>
    <div className="ntr-content" style={{ padding: "12px 14px 20px" }}>
      <div className="ntr-login-hero"><div className="ntr-logo" style={{ fontStyle: "italic" }}>iKuai</div><p>NTR RouterOS · 只读监控，不修改路由器配置</p></div>
      <form onSubmit={(e) => void submit(e)}>
        <section className="ntr-card">
          <label className="ntr-field"><span>设备地址</span><input name="host" value={host} onChange={(e) => { setHost(e.target.value); setError(""); }} placeholder="192.168.3.1" autoCapitalize="none" autoCorrect="off" inputMode="url" /></label>
          <label className="ntr-field"><span>用户名</span><input name="user" value={user} onChange={(e) => setUser(e.target.value)} placeholder="只读用户名" autoCapitalize="none" autoComplete="username" /></label>
          <label className="ntr-field"><span>密码</span><span className="ntr-field-pass"><input name="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="RouterOS 密码" autoComplete="current-password" /><button type="button" className="ntr-iconbtn" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "隐藏密码" : "显示密码"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
        </section>
        <section className="ntr-card">
          <button type="button" className="ntr-row" style={{ width: "100%" }} onClick={() => setAdvancedOpen((v) => !v)}>
            <span className="ntr-row-main"><b>高级连接选项</b><small>协议、端口、证书与指纹</small></span>
            <ChevronDown size={16} className={advancedOpen ? "" : ""} style={{ transform: advancedOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
          {advancedOpen ? <>
            <div className="ntr-subtabs" style={{ margin: "8px 0" }}>
              <button type="button" aria-pressed={scheme === "https"} onClick={() => changeScheme("https")}>HTTPS</button>
              <button type="button" aria-pressed={scheme === "http"} onClick={() => changeScheme("http")}>HTTP</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label className="ntr-field"><span>REST 端口</span><input inputMode="numeric" value={restPort} onChange={(e) => setRestPort(e.target.value)} /></label>
              <label className="ntr-field"><span>SSH 端口</span><input inputMode="numeric" value={sshPort} onChange={(e) => setSshPort(e.target.value)} /></label>
            </div>
            {scheme === "https" ? <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", fontSize: 12.5, color: "var(--ntr-sub)" }}><input type="checkbox" role="switch" checked={verifyTls} onChange={(e) => { setVerifyTls(e.target.checked); setRiskConfirmed(false); }} />校验 TLS 证书（自签证书需关闭）</label> : null}
            {insecure ? <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", fontSize: 12.5, color: "#b45309" }}><input type="checkbox" checked={riskConfirmed} onChange={(e) => setRiskConfirmed(e.target.checked)} />我确认当前传输方式无法完整保护设备身份。</label> : null}
          </> : null}
        </section>
        {challenge ? <section className="ntr-card" style={{ borderColor: challenge.kind === "changed" ? "var(--ntr-red-soft)" : "var(--ntr-orange-soft)" }}><div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><Fingerprint size={20} style={{ color: "var(--ntr-orange)", flex: "none", marginTop: 2 }} /><div style={{ flex: 1 }}><b style={{ display: "block", fontSize: 13 }}>{challenge.kind === "changed" ? "SSH 身份已变化" : "核对 SSH 指纹"}</b><code style={{ display: "block", margin: "4px 0", fontSize: 12, overflowWrap: "anywhere", color: "var(--ntr-sub)" }}>{challenge.fingerprint}</code>{challenge.kind === "confirmation-required" ? <label style={{ display: "flex", gap: 8, fontSize: 12.5, color: "var(--ntr-sub)", alignItems: "center" }}><input type="checkbox" checked={hostKeyConfirmed} onChange={(e) => setHostKeyConfirmed(e.target.checked)} />我已通过可信路径核对这枚指纹</label> : null}</div></div></section> : null}
        {lastTest ? <section className="ntr-card"><h2 style={{ fontSize: 13, margin: "0 0 6px" }}>通道回执</h2><ChannelRow label="REST" channel={lastTest.rest} /><ChannelRow label="SSH" channel={lastTest.ssh} /></section> : null}
        {error || runtime.connection.error ? <p className="ntr-error" role="alert"><AlertOctagon size={16} style={{ flex: "none", marginTop: 1 }} />{error || runtime.connection.error}</p> : null}
        <button className="ntr-primary-btn" type="submit" disabled={runtime.connection.busy}>{runtime.connection.busy ? <LoaderCircle className="ntr-spin" size={18} /> : <LockKeyhole size={17} />}{runtime.connection.busy ? "正在验证设备" : "验证并连接"}<ChevronRight size={17} /></button>
        <p className="ntr-note" style={{ marginTop: 10 }}>密码仅保留在当前页面内存中 · 只读连接</p>
      </form>
    </div>
  </main>;
}
