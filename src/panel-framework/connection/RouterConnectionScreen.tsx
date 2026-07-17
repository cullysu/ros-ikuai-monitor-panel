import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleAlert,
  Fingerprint,
  LoaderCircle,
  LockKeyhole,
  Router,
  Settings2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { RouterConnectionInput } from "../runtime/panelApi";
import type { PanelRuntimeController } from "../runtime/usePanelRuntime";
import type { RouterChannelTest, SavedRouterLogin } from "../runtime/panelRuntimeSchema";
import "./router-connection.css";

const MOBILE_CONNECTION_QUERY = "(max-width: 1180px)";

function useMobileConnectionSurface(): boolean {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia(MOBILE_CONNECTION_QUERY).matches);
  useEffect(() => {
    const media = window.matchMedia(MOBILE_CONNECTION_QUERY);
    const sync = () => setMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return mobile;
}

function ChannelFact({ label, test }: { label: string; test: RouterChannelTest | undefined }) {
  const known = Boolean(test);
  const ok = test?.ok === true;
  return (
    <div className={`router-channel-fact ${known ? (ok ? "is-ok" : "is-failed") : "is-unknown"}`}>
      <span aria-hidden="true">{ok ? <Check size={15} /> : <CircleAlert size={15} />}</span>
      <div>
        <b>{label}</b>
        <small>{!known ? "尚未验证" : ok ? `已验证${test?.elapsedMs !== null ? ` · ${test?.elapsedMs} ms` : ""}` : "未通过"}</small>
        {test?.error ? <details><summary>查看错误</summary><p>{test.error}</p></details> : null}
      </div>
    </div>
  );
}

function SavedProfileRow({
  profile,
  selected,
  disabled,
  onSelect,
  onForget,
}: {
  profile: SavedRouterLogin;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onForget: () => void;
}) {
  return (
    <div className={`router-saved-profile ${selected ? "is-selected" : ""}`}>
      <button type="button" aria-pressed={selected} onClick={onSelect} disabled={disabled}>
        <span><b>{profile.label}</b><small>{profile.user} · {profile.restScheme.toUpperCase()} {profile.restPort} · SSH {profile.sshPort}</small></span>
        {selected ? <Check size={17} aria-hidden="true" /> : null}
      </button>
      <button type="button" className="router-icon-button" title={`删除 ${profile.label} 的设备资料`} aria-label={`删除 ${profile.label} 的设备资料`} onClick={onForget} disabled={disabled}>
        <Trash2 size={17} aria-hidden="true" />
      </button>
    </div>
  );
}

function ConnectionForm({ runtime, compact = false }: { runtime: PanelRuntimeController; compact?: boolean }) {
  const current = runtime.connection.profile;
  const [selectedSavedId, setSelectedSavedId] = useState(current?.savedId || "");
  const [host, setHost] = useState(current?.host || "");
  const [user, setUser] = useState(current?.user || "");
  const [sshPort, setSshPort] = useState(current?.sshPort || 22);
  const [restScheme, setRestScheme] = useState<"https" | "http">(current?.restScheme || "https");
  const [restPort, setRestPort] = useState(current?.restPort || 443);
  const [restVerifyTls, setRestVerifyTls] = useState(current?.restVerifyTls ?? true);
  const [insecureRestConfirmed, setInsecureRestConfirmed] = useState(current?.insecureRestConfirmed ?? false);
  const [password, setPassword] = useState("");
  const [rememberProfile, setRememberProfile] = useState(false);
  const [confirmSshHostKey, setConfirmSshHostKey] = useState(false);
  const [clientError, setClientError] = useState("");

  useEffect(() => {
    setHost(current?.host || "");
    setUser(current?.user || "");
    setSshPort(current?.sshPort || 22);
    setRestScheme(current?.restScheme || "https");
    setRestPort(current?.restPort || 443);
    setRestVerifyTls(current?.restVerifyTls ?? true);
    setInsecureRestConfirmed(current?.insecureRestConfirmed ?? false);
    setSelectedSavedId(current?.savedId || "");
  }, [
    current?.host,
    current?.insecureRestConfirmed,
    current?.restPort,
    current?.restScheme,
    current?.restVerifyTls,
    current?.savedId,
    current?.sshPort,
    current?.user,
  ]);

  const selectSaved = (profile: SavedRouterLogin) => {
    setSelectedSavedId(profile.id);
    setHost(profile.host);
    setUser(profile.user);
    setSshPort(profile.sshPort);
    setRestScheme(profile.restScheme);
    setRestPort(profile.restPort);
    setRestVerifyTls(profile.restVerifyTls);
    setInsecureRestConfirmed(profile.insecureRestConfirmed);
    setConfirmSshHostKey(false);
    setClientError("");
  };

  const clearSavedSelection = () => setSelectedSavedId("");
  const pendingHostKey = runtime.connection.pendingSshHostKey;
  const matchingPendingHostKey = pendingHostKey?.host === host.trim() && pendingHostKey.sshPort === sshPort ? pendingHostKey : null;
  const insecureRest = restScheme === "http" || !restVerifyTls;

  useEffect(() => {
    setConfirmSshHostKey(false);
  }, [matchingPendingHostKey?.fingerprint]);

  const changeRestScheme = (scheme: "https" | "http") => {
    if (scheme === restScheme) return;
    const currentDefaultPort = restScheme === "https" ? 443 : 80;
    const nextDefaultPort = scheme === "https" ? 443 : 80;
    setRestScheme(scheme);
    if (restPort === currentDefaultPort) setRestPort(nextDefaultPort);
    setRestVerifyTls(scheme === "https");
    setInsecureRestConfirmed(false);
    clearSavedSelection();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanHost = host.trim();
    const cleanUser = user.trim();
    if (!cleanHost || !cleanUser || !password.trim()) {
      setClientError("请填写设备地址、用户名和密码");
      return;
    }
    if (!Number.isInteger(sshPort) || sshPort < 1 || sshPort > 65535) {
      setClientError("SSH 端口必须在 1–65535 之间");
      return;
    }
    if (!Number.isInteger(restPort) || restPort < 1 || restPort > 65535) {
      setClientError("REST 端口必须在 1–65535 之间");
      return;
    }
    if (insecureRest && !insecureRestConfirmed) {
      setClientError(restScheme === "http" ? "使用 HTTP 前必须确认凭据明文传输风险" : "关闭证书校验前必须确认设备身份风险");
      return;
    }
    if (matchingPendingHostKey && !confirmSshHostKey) {
      setClientError("请先核对并确认 SSH 主机密钥指纹");
      return;
    }
    setClientError("");
    const input: RouterConnectionInput = {
      host: cleanHost,
      user: cleanUser,
      password,
      sshPort,
      restScheme,
      restPort,
      restVerifyTls: restScheme === "https" && restVerifyTls,
      insecureRestConfirmed: insecureRest && insecureRestConfirmed,
      ...(matchingPendingHostKey && confirmSshHostKey ? { sshHostKeyFingerprint: matchingPendingHostKey.fingerprint } : {}),
      ...(selectedSavedId ? { savedId: selectedSavedId } : {}),
      rememberProfile,
    };
    const connected = await runtime.connect(input);
    if (connected) setPassword("");
  };

  const test = runtime.connection.lastTest || current?.lastTest || null;
  const selectedProfile = runtime.connection.savedLogins.find((profile) => profile.id === selectedSavedId) || null;

  return (
    <form className={`router-connection-form ${compact ? "is-compact" : ""}`} data-router-login-form onSubmit={submit} noValidate>
      {compact && runtime.connection.savedLogins.length > 0 ? (
        <div className="router-saved-select">
          <label>
            <span>设备资料</span>
            <select
              value={selectedSavedId}
              onChange={(event) => {
                const profile = runtime.connection.savedLogins.find((item) => item.id === event.target.value);
                if (profile) selectSaved(profile);
                else setSelectedSavedId("");
              }}
              disabled={runtime.connection.busy}
            >
              <option value="">手动填写</option>
              {runtime.connection.savedLogins.map((profile) => <option key={profile.id} value={profile.id}>{profile.label} · {profile.user}</option>)}
            </select>
          </label>
          {selectedProfile ? (
            <button type="button" className="router-icon-button" title={`删除 ${selectedProfile.label} 的设备资料`} aria-label={`删除 ${selectedProfile.label} 的设备资料`} onClick={() => { setSelectedSavedId(""); void runtime.forgetProfile(selectedProfile.id); }} disabled={runtime.connection.busy}>
              <Trash2 size={17} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : !compact && runtime.connection.savedLogins.length > 0 ? (
        <section className="router-form-group" aria-labelledby="saved-router-heading">
          <header><h2 id="saved-router-heading">设备资料</h2><span>密码不会保存</span></header>
          <div className="router-saved-list">
            {runtime.connection.savedLogins.map((profile) => (
              <SavedProfileRow
                key={profile.id}
                profile={profile}
                selected={selectedSavedId === profile.id}
                disabled={runtime.connection.busy}
                onSelect={() => selectSaved(profile)}
                onForget={() => { if (selectedSavedId === profile.id) setSelectedSavedId(""); void runtime.forgetProfile(profile.id); }}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="router-form-group" aria-labelledby="router-address-heading">
        <header><h2 id="router-address-heading">RouterOS</h2><span>只读采集</span></header>
        <label className="router-field">
          <span>设备地址</span>
          <input
            name="host"
            type="text"
            value={host}
            onChange={(event) => { setHost(event.target.value); clearSavedSelection(); }}
            placeholder="192.168.88.1"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={runtime.connection.busy}
            required
          />
        </label>
        <label className="router-field">
          <span>用户名</span>
          <input
            name="user"
            type="text"
            value={user}
            onChange={(event) => { setUser(event.target.value); clearSavedSelection(); }}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            disabled={runtime.connection.busy}
            required
          />
        </label>
        <label className="router-field">
          <span>密码</span>
          <input
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            disabled={runtime.connection.busy}
            required
          />
        </label>
        <details className="router-advanced-settings" data-router-advanced-settings>
          <summary>
            <span>
              <Settings2 aria-hidden="true" size={18} />
              <span>
                <b>高级连接设置</b>
                <small>{restScheme.toUpperCase()} {restPort} · SSH {sshPort} · {insecureRest ? "风险模式" : "证书校验"}</small>
              </span>
            </span>
            <ChevronDown aria-hidden="true" size={18} />
          </summary>
          <div className="router-advanced-fields">
            <label className="router-field router-field-port">
              <span>SSH 端口</span>
              <input
                name="sshPort"
                type="number"
                min={1}
                max={65535}
                inputMode="numeric"
                value={sshPort}
                onChange={(event) => { setSshPort(Number(event.target.value)); clearSavedSelection(); }}
                disabled={runtime.connection.busy}
                required
              />
            </label>
            <div className="router-field router-field-segmented">
              <span>REST 协议</span>
              <div className="router-segmented-control" role="group" aria-label="REST 协议">
                <button type="button" aria-pressed={restScheme === "https"} onClick={() => changeRestScheme("https")} disabled={runtime.connection.busy}>HTTPS</button>
                <button type="button" aria-pressed={restScheme === "http"} onClick={() => changeRestScheme("http")} disabled={runtime.connection.busy}>HTTP</button>
              </div>
            </div>
            <label className="router-field router-field-port">
              <span>REST 端口</span>
              <input
                name="restPort"
                type="number"
                min={1}
                max={65535}
                inputMode="numeric"
                value={restPort}
                onChange={(event) => { setRestPort(Number(event.target.value)); clearSavedSelection(); }}
                disabled={runtime.connection.busy}
                required
              />
            </label>
            {restScheme === "https" ? (
              <label className="router-field router-field-toggle">
                <span>证书校验</span>
                <input
                  name="restVerifyTls"
                  type="checkbox"
                  checked={restVerifyTls}
                  onChange={(event) => { setRestVerifyTls(event.target.checked); setInsecureRestConfirmed(false); clearSavedSelection(); }}
                  disabled={runtime.connection.busy}
                />
              </label>
            ) : null}
          </div>
        </details>
      </section>

      {insecureRest ? (
        <label className="router-risk-confirmation">
          <input
            name="insecureRestConfirmed"
            type="checkbox"
            checked={insecureRestConfirmed}
            onChange={(event) => setInsecureRestConfirmed(event.target.checked)}
            disabled={runtime.connection.busy}
          />
          <span>
            <b>{restScheme === "http" ? "确认使用明文 HTTP" : "确认关闭证书校验"}</b>
            <small>{restScheme === "http" ? "RouterOS 用户名和密码可能被同网段设备读取。" : "连接会加密，但无法确认对端确实是这台 RouterOS。"}</small>
          </span>
        </label>
      ) : null}

      {matchingPendingHostKey ? (
        <section className="router-host-key-confirmation" aria-labelledby="ssh-host-key-heading">
          <Fingerprint size={19} aria-hidden="true" />
          <div>
            <h2 id="ssh-host-key-heading">确认 SSH 主机密钥</h2>
            <p>首次连接只读取到以下指纹，尚未发送 SSH 密码。请与设备侧记录核对。</p>
            <code>{matchingPendingHostKey.algorithm} · {matchingPendingHostKey.fingerprint}</code>
            <label>
              <input type="checkbox" checked={confirmSshHostKey} onChange={(event) => setConfirmSshHostKey(event.target.checked)} disabled={runtime.connection.busy} />
              <span>确认并固定此指纹；以后发生变化时阻断连接</span>
            </label>
          </div>
        </section>
      ) : null}

      <label className="router-remember-row">
        <input
          name="rememberProfile"
          type="checkbox"
          checked={rememberProfile}
          onChange={(event) => setRememberProfile(event.target.checked)}
          disabled={runtime.connection.busy}
        />
        <span><b>记住设备资料</b><small>保存地址、端口、传输设置与 SSH 指纹；密码不会保存</small></span>
      </label>

      {clientError || runtime.connection.error ? (
        <div className="router-connection-error" role="alert"><CircleAlert size={18} aria-hidden="true" /><span>{clientError || runtime.connection.error}</span></div>
      ) : null}

      {test || !compact ? (
        <div className="router-channel-grid" aria-label="连接通道验证结果">
          <ChannelFact label="REST" test={test?.rest} />
          <ChannelFact label="SSH" test={test?.ssh} />
        </div>
      ) : null}

      <div className="router-transport-boundary">
        <LockKeyhole size={17} aria-hidden="true" />
        <p>{restScheme === "https" && restVerifyTls ? "REST 使用 HTTPS 并验证证书；不会自动降级到 HTTP。" : "当前使用已显式确认的风险模式；面板不会静默切换传输方式。"}</p>
      </div>

      <button className="router-connect-submit" type="submit" disabled={runtime.connection.busy}>
        {runtime.connection.busy ? <LoaderCircle className="is-spinning" size={18} aria-hidden="true" /> : <Router size={18} aria-hidden="true" />}
        <span>{runtime.connection.busy ? "正在验证 REST 与 SSH" : "连接并进入面板"}</span>
      </button>
    </form>
  );
}

function ConnectionStatus({ runtime, mobile }: { runtime: PanelRuntimeController; mobile: boolean }) {
  const error = runtime.connection.phase === "error";
  return (
    <main className={`router-connection-status ${mobile ? "is-mobile" : "is-desktop"}`} data-router-connection-status={runtime.connection.phase}>
      <div className="router-status-symbol" aria-hidden="true">{error ? <CircleAlert size={26} /> : <LoaderCircle className="is-spinning" size={26} />}</div>
      <h1>{error ? "无法读取连接状态" : "正在读取连接状态"}</h1>
      <p>{error ? runtime.connection.error : "核对本地会话与 RouterOS 配置。"}</p>
      {error ? <button type="button" onClick={() => void runtime.retryConnectionStatus()}>重新检查</button> : null}
    </main>
  );
}

function MobileConnectionScreen({ runtime }: { runtime: PanelRuntimeController }) {
  const canReturn = runtime.connection.phase === "ready" && Boolean(runtime.snapshot.data);
  return (
    <main className="router-connection router-connection-mobile" data-panel-mobile-surface data-router-connection-screen="mobile">
      <header className="router-mobile-connection-bar">
        {canReturn ? (
          <button type="button" className="router-icon-button" title="返回面板" aria-label="返回面板" onClick={runtime.cancelConnection}>
            <ArrowLeft size={21} aria-hidden="true" />
          </button>
        ) : <span className="router-mobile-bar-spacer" />}
        <div><b>RouterOS 连接</b><small>设备只读状态台</small></div>
        <ShieldCheck size={20} aria-hidden="true" />
      </header>
      <section className="router-mobile-connection-intro">
        <span><Router size={18} aria-hidden="true" /> 设备入口</span>
        <h1>{canReturn ? "切换监控设备" : "连接 RouterOS"}</h1>
        <p>REST 与 SSH 独立验证；失败通道会标明影响。</p>
      </section>
      <ConnectionForm runtime={runtime} compact />
      {runtime.connection.phase === "ready" ? (
        <button className="router-logout-button" type="button" onClick={() => void runtime.logout()} disabled={runtime.connection.busy}>清除当前连接</button>
      ) : null}
    </main>
  );
}

function DesktopConnectionScreen({ runtime }: { runtime: PanelRuntimeController }) {
  const canReturn = runtime.connection.phase === "ready" && Boolean(runtime.snapshot.data);
  return (
    <main className="router-connection router-connection-desktop" data-router-connection-screen="desktop">
      <aside className="router-connection-context">
        <div className="router-context-mark"><Router size={24} aria-hidden="true" /></div>
        <p className="router-context-kicker">ROUTEROS · READ ONLY</p>
        <h1>{canReturn ? "切换监控设备" : "建立设备连接"}</h1>
        <p>连接验证只读取 RouterOS 身份与状态。REST 和 SSH 结果独立呈现，不把管理面可达冒充网络可用。</p>
        <dl>
          <div><dt>配置</dt><dd>地址、用户、SSH 端口</dd></div>
          <div><dt>密码</dt><dd>仅用于当前进程，不写入设备资料</dd></div>
          <div><dt>权限</dt><dd>监控面板不修改 RouterOS 配置</dd></div>
        </dl>
        {canReturn ? <button type="button" onClick={runtime.cancelConnection}><ArrowLeft size={17} aria-hidden="true" />返回面板</button> : null}
      </aside>
      <section className="router-connection-workspace">
        <header><div><span>连接设置</span><h2>验证 RouterOS 通道</h2></div>{runtime.connection.profile?.configured ? <b>当前：{runtime.connection.profile.host}</b> : <b>尚未配置</b>}</header>
        <ConnectionForm runtime={runtime} />
        {runtime.connection.phase === "ready" ? (
          <button className="router-logout-button" type="button" onClick={() => void runtime.logout()} disabled={runtime.connection.busy}>清除当前连接</button>
        ) : null}
      </section>
    </main>
  );
}

export function RouterConnectionScreen({ runtime }: { runtime: PanelRuntimeController }) {
  const mobile = useMobileConnectionSurface();
  if (runtime.connection.phase === "checking" || runtime.connection.phase === "error") {
    return <ConnectionStatus runtime={runtime} mobile={mobile} />;
  }
  return mobile ? <MobileConnectionScreen runtime={runtime} /> : <DesktopConnectionScreen runtime={runtime} />;
}
