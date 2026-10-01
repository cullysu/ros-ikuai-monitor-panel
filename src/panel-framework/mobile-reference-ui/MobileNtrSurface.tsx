import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, ChevronRight, FileText, Globe, Home, Monitor, RefreshCw, Search, Server, Settings, ShieldCheck, Smartphone, UserRound, Wifi, Activity, AlertOctagon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { OverviewDerivedState, OverviewRawSnapshot, OverviewRawWanRow, OverviewRawInterfaceRow } from "../overview";
import type { OverviewEvidenceModel } from "../overview/evidence-model/overviewEvidenceTypes";
import { domainDefinitionFor, filterWorkspaceRows, sortWorkspaceRows } from "../domain-workspace/domainDefinitions";
import { rowsFromModel } from "../domain-workspace/workspaceRows";
import type { PanelNavigate, PanelNavigationContext, PanelRouteId } from "../routes/panelRoutes";
import { PANEL_ROUTES } from "../routes/panelRoutes";
import { buildSectionModel } from "../sections/sectionModels";
import { formatRfc3339LocalTime } from "../timeContract";
import "./mobile-ntr.css";

type Tone = "ok" | "warn" | "danger" | "muted";

export interface NtrProps {
  evidence: OverviewEvidenceModel;
  snapshot: OverviewRawSnapshot;
  state: OverviewDerivedState;
  onNavigate: PanelNavigate;
  onRefresh?: () => void;
  route?: PanelRouteId;
  navigationContext?: PanelNavigationContext;
  onShowConnection?: () => void;
  onLogout?: () => void;
  onOpenSearch?: () => void;
}

const SYSTEM_NAME = "iKuai NTR RouterOS";
const APP_VERSION = "v1.0.0";
const AUTHOR = "cullysu";

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
const val = (row: Record<string, unknown>, keys: string[]): string => {
  for (const k of keys) { const v = row[k]; if (v !== null && v !== undefined && String(v).trim()) return String(v).trim(); }
  return "";
};
const num = (row: Record<string, unknown>, keys: string[]): number | null => {
  for (const k of keys) { const v = Number(row[k]); if (Number.isFinite(v)) return v; }
  return null;
};
const fmtRate = (bps: number | null | undefined): string => {
  if (bps === null || bps === undefined || !Number.isFinite(bps)) return "—";
  const mb = bps / 1_000_000;
  if (mb >= 1) return `${mb.toFixed(mb >= 100 ? 0 : 1)}`;
  const kb = bps / 1_000;
  if (kb >= 1) return `${kb.toFixed(0)}K`;
  return `${Math.round(bps)}`;
};
const fmtRateUnit = (bps: number | null | undefined): string => {
  if (bps === null || bps === undefined || !Number.isFinite(bps)) return "";
  return bps >= 1_000_000 ? "Mbps" : bps >= 1_000 ? "Kbps" : "bps";
};

function uniqueWan(snapshot: OverviewRawSnapshot): OverviewRawWanRow[] {
  const seen = new Set<string>();
  return [...(snapshot.wan || []), ...(snapshot.pppoe || [])].filter((row) => {
    const key = norm(row.lineId || row.id || row.name || row.interface || row.access || row.parent);
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  });
}

function wanRows(snapshot: OverviewRawSnapshot) {
  return uniqueWan(snapshot).map((row) => {
    const raw = row as Record<string, unknown>;
    const online = row.running === true && row.disabled !== true;
    return {
      id: val(raw, ["name", "interface", "access", "parent"]) || "WAN",
      name: val(raw, ["name", "interface", "access", "parent"]) || "WAN",
      provider: val(raw, ["provider", "isp", "carrier", "comment"]) || "",
      online,
      disabled: row.disabled === true,
      runningKnown: typeof row.running === "boolean",
      defaultRoutes: Array.isArray(row.routes) ? (row.routes as Array<Record<string, unknown>>).filter((r) => r && r.active === true).length : 0,
      duration: val(raw, ["uptime", "onlineFor", "connectedFor", "duration"]) || "",
      down: fmtRate(num(raw, ["rxRate", "downRate", "rx"])),
      up: fmtRate(num(raw, ["txRate", "upRate", "tx"])),
      downUnit: fmtRateUnit(num(raw, ["rxRate", "downRate", "rx"])),
      upUnit: fmtRateUnit(num(raw, ["txRate", "upRate", "tx"])),
      address: val(raw, ["ipv4Address", "address", "ip"]) || "",
      latency: num(raw, ["latency", "delay", "ping", "latencyMs"]),
      loss: num(raw, ["loss", "packetLoss", "lossPercent"]),
      isDefault: Array.isArray(row.routes) && (row.routes as Array<Record<string, unknown>>).some((r) => r && r.active === true),
    };
  });
}

function interfaceRows(snapshot: OverviewRawSnapshot) {
  return (snapshot.interfaces || []).map((row: OverviewRawInterfaceRow) => {
    const raw = row as unknown as Record<string, unknown>;
    return {
      id: val(raw, ["name", "id", "interface"]) || "?",
      name: val(raw, ["name", "id", "interface"]) || "?",
      running: row.running === true,
      runningKnown: typeof row.running === "boolean",
      disabled: row.disabled === true,
      type: val(raw, ["type", "kind"]) || "",
      down: fmtRate(num(raw, ["rxRate", "rx", "downRate"])),
      up: fmtRate(num(raw, ["txRate", "tx", "upRate"])),
      unit: fmtRateUnit(num(raw, ["rxRate", "rx", "downRate"])),
      address: val(raw, ["ipv4Address", "address", "ip"]) || "",
    };
  });
}

function terminalsList(snapshot: OverviewRawSnapshot) {
  return rowsFromModel("terminals", buildSectionModel("terminals", snapshot));
}

function toneFor(online: boolean, disabled: boolean, known = true): Tone {
  if (disabled || !known) return "muted";
  return online ? "ok" : "danger";
}

/* ============ Chrome ============ */
function TopBar({ title, sub, onRefresh, onSearch }: { title: string; sub: string; onRefresh?: () => void; onSearch?: () => void }) {
  const [busy, setBusy] = useState(false);
  const refresh = () => {
    if (!onRefresh || busy) return;
    setBusy(true);
    Promise.resolve(onRefresh())
      .catch(() => undefined)
      .finally(() => window.setTimeout(() => setBusy(false), 400));
  };
  return <header className="ntr-topbar">
    <div className="ntr-brand"><span className="ntr-logo">iKuai</span><span className="ntr-brand-sub">NTR RouterOS</span></div>
    <div className="ntr-topbar-actions">
      {onSearch ? <button className="ntr-iconbtn" type="button" aria-label="全局搜索" onClick={onSearch}><Search size={19} /></button> : null}
      {onRefresh ? <button className={`ntr-iconbtn ${busy ? "is-busy" : ""}`} type="button" aria-label="刷新" disabled={busy} onClick={refresh}><RefreshCw size={19} /></button> : null}
    </div>
  </header>;
}

function SubBar({ title, onBack, action }: { title: string; onBack: () => void; action?: React.ReactNode }) {
  return <header className="ntr-subbar">
    <button className="ntr-back" type="button" aria-label="返回" onClick={onBack}><ArrowLeft size={22} /></button>
    <h1>{title}</h1>
    <div>{action}</div>
  </header>;
}

const TABS: Array<{ label: string; route: PanelRouteId; active: PanelRouteId[]; Icon: typeof Home }> = [
  { label: "首页", route: "overview", active: ["overview"], Icon: Home },
  { label: "网络", route: "lineStatus", active: ["lineStatus", "interfaces", "routes", "balance", "connections", "dns4", "dns6", "readonlyDiagnostics", "trafficLoad", "loadAudit", "trafficAudit"], Icon: Wifi },
  { label: "安全", route: "security", active: ["security", "terminals", "dhcp", "arp"], Icon: ShieldCheck },
  { label: "日志", route: "logs", active: ["logs", "serviceLogs"], Icon: FileText },
  { label: "更多", route: "more", active: ["more"], Icon: Settings },
];

export function MobileNtrNavigation({ route, onNavigate }: { route: PanelRouteId; onNavigate: PanelNavigate }) {
  return <nav className="ntr-tabbar" aria-label="主导航">
    {TABS.map(({ label, route: target, active, Icon }) => (
      <button key={target} type="button" data-section={target} aria-current={active.includes(route) ? "page" : undefined} onClick={() => onNavigate(target)}>
        <Icon size={20} /><span>{label}</span>
      </button>
    ))}
  </nav>;
}

/* ============ 通用小件 ============ */
function Dot({ tone }: { tone: Tone }) { return <span className="ntr-dot" data-tone={tone} />; }
function Pill({ tone, children }: { tone: Tone | "info"; children: React.ReactNode }) { return <span className="ntr-pill" data-tone={tone}>{children}</span>; }
function Chev() { return <ChevronRight size={15} className="ntr-chev" />; }

function Row({ dot, title, sub, right, rightSub, onClick }: { dot?: Tone; title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; rightSub?: React.ReactNode; onClick?: () => void }) {
  const inner = <>{dot ? <Dot tone={dot} /> : null}<div className="ntr-row-main"><b>{title}</b>{sub ? <small>{sub}</small> : null}</div>{right ? <div className="ntr-row-right"><b>{right}</b>{rightSub ? <small>{rightSub}</small> : null}</div> : null}{onClick ? <Chev /> : null}</>;
  return onClick ? <button type="button" className="ntr-row" onClick={onClick}>{inner}</button> : <div className="ntr-row">{inner}</div>;
}

function KvCard({ title, rows }: { title: string; rows: Array<[string, React.ReactNode, Tone?]> }) {
  return <section className="ntr-card"><h2>{title}</h2>
    {rows.map(([label, value, tone]) => <div className="ntr-kv" key={label}><span>{label}</span><strong data-tone={tone || "muted"}>{value}</strong></div>)}
  </section>;
}

/* 环形进度 */
function Ring({ value, size = 52 }: { value: number | null; size?: number }) {
  const v = value === null ? 0 : Math.max(0, Math.min(100, value));
  const r = (size - 12) / 2, c = 2 * Math.PI * r, off = c * (1 - v / 100);
  return <div className="ntr-ring" style={{ width: size, height: size }}>
    <svg width={size} height={size}><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f7" strokeWidth={size >= 80 ? 8 : 5} /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e9fff" strokeWidth={size >= 80 ? 8 : 5} strokeLinecap="round" strokeDasharray={`${c.toFixed(1)} ${c.toFixed(1)}`} strokeDashoffset={off.toFixed(1)} transform={`rotate(-90 ${size / 2} ${size / 2})`} /></svg>
    <b style={size >= 80 ? { fontSize: 30, fontWeight: 800 } : undefined}>{value === null ? "—" : `${Math.round(value)}%`}</b>
  </div>;
}

/* 实时流量图 */
function TrafficChart({ traffic }: { traffic: { points: Array<{ timestamp: number; down: number; up: number }>; unit: string } | null }) {
  const points = traffic?.points || [];
  if (points.length < 2) return <div className="ntr-chart-empty"><span>暂无数据</span></div>;
  const W = 320, H = 120, left = 30, right = 6, top = 8, bottom = 18;
  const max = Math.max(1, ...points.flatMap((p) => [p.down, p.up]));
  const unit = traffic!.unit || "Mbps";
  const scale = unit === "Mbps" ? 1_000_000 : unit === "Kbps" ? 1_000 : 1;
  const x = (i: number) => left + (i / Math.max(1, points.length - 1)) * (W - left - right);
  const y = (v: number) => top + (1 - v / max) * (H - top - bottom);
  const down = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.down).toFixed(1)}`).join(" ");
  const up = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.up).toFixed(1)}`).join(" ");
  const fill = down + ` L${x(points.length - 1).toFixed(1)} ${H - bottom} L${left} ${H - bottom} Z`;
  const time = (v: number) => new Date(v).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  return <div className="ntr-chart">
    <div className="ntr-chart__scale"><span>{Math.round(max / scale)}</span><span>{Math.round(max / 2 / scale)}</span><span>0</span></div>
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"><g className="ntr-chart__grid"><line x1={left} y1={top} x2={W - right} y2={top} /><line x1={left} y1={(top + H - bottom) / 2} x2={W - right} y2={(top + H - bottom) / 2} /><line x1={left} y1={H - bottom} x2={W - right} y2={H - bottom} /></g><path className="ntr-chart__downfill" d={fill} /><path className="ntr-chart__down" d={down} /><path className="ntr-chart__up" d={up} /></svg>
    <div className="ntr-chart__foot"><span>{time(points[0].timestamp)}</span><span>{time(points[points.length - 1].timestamp)}</span><span>{unit}</span></div>
  </div>;
}

/* ============ 全局状态横幅 ============ */
function ErrorBanner({ evidence, state }: { evidence: OverviewEvidenceModel; state: OverviewDerivedState }) {
  const mode = evidence.evidenceMode;
  // navigator.onLine is only a browser transport hint (see usePanelRuntime);
  // it does not prove RouterOS reachability or that a local snapshot exists.
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  const failed = state.facts.failures;
  const stale = state.facts.freshness.stale;
  const missing = state.facts.freshness.missing;
  if (offline) {
    return <div className="ntr-error" role="alert" style={{ margin: "0 0 8px" }}>浏览器报告网络断开 · 如有本地快照则继续展示（设备状态以恢复连接后为准）</div>;
  }
  if (missing) {
    return <div className="ntr-error" role="alert" style={{ margin: "0 0 8px" }}>当前快照获取失败 · 下方为最近一次成功数据，不代表实时状态</div>;
  }
  if (failed.count > 0) {
    return <div className="ntr-error" role="alert" style={{ margin: "0 0 8px", color: "#92400e", background: "var(--ntr-orange-soft)" }}>采集部分失败（{failed.count} 项） · 受影响结论已标注降级，不代表路由器当前状态</div>;
  }
  if (stale) {
    return <div className="ntr-error" role="alert" style={{ margin: "0 0 8px", color: "#92400e", background: "var(--ntr-orange-soft)" }}>数据已过期 · 最近成功：{formatRfc3339LocalTime(evidence.evidenceAt) || "未记录"}</div>;
  }
  if (mode === "historical") {
    return <div className="ntr-error" role="alert" style={{ margin: "0 0 8px", color: "#92400e", background: "var(--ntr-orange-soft)" }}>正在显示历史快照（非实时） · 最近成功：{formatRfc3339LocalTime(evidence.evidenceAt) || "未记录"}</div>;
  }
  if (mode === "unavailable") {
    return <div className="ntr-error" role="alert" style={{ margin: "0 0 8px" }}>当前没有可用证据 · 无法判断网络状态</div>;
  }
  return null;
}

/* ============ 首页 ============ */
function HomePage({ evidence, snapshot, state, onNavigate, onRefresh, onShowConnection, onSearch }: NtrProps & { onShowConnection?: () => void; onSearch?: () => void }) {
  const wans = useMemo(() => wanRows(snapshot), [snapshot]);
  const wanOnline = wans.filter((w) => w.online).length;
  const terminals = useMemo(() => terminalsList(snapshot), [snapshot]);
  const resource = state.facts.resource;
  const cpu = resource.available ? resource.cpu : null;
  const memory = resource.available ? resource.memory : null;
  const connected = terminals.filter((t) => t.evidence.kind === "terminal" && t.evidence.online).length;
  const traffic = evidence.traffic && evidence.traffic.status === "ready" ? evidence.traffic : null;
  const healthy = state.verdict.level === "ok";
  const summary = healthy
    ? { tone: "ok" as Tone, text: "网络正常", note: `${wanOnline} 条宽带在线 · 更新于 ${formatRfc3339LocalTime(evidence.evidenceAt) || "—"}` }
    : { tone: "warn" as Tone, text: state.verdict.label || "需要注意", note: state.verdict.summary || evidence.verdictSummary };

  return <main className="ntr-app" data-ntr-page="home">
    <TopBar title="首页" sub={SYSTEM_NAME} onRefresh={onRefresh} onSearch={onSearch} />
    <div className="ntr-scroll"><div className="ntr-content">
      <ErrorBanner evidence={evidence} state={state} />
      {/* 异常通知条：健康时让位给内容 */}
      {summary.tone !== "ok" ? <section className="ntr-card ntr-alertbar"><Dot tone={summary.tone} /><div><b>{summary.text}</b><small>{summary.note}</small></div></section> : null}
      {/* 设备卡（核心入口：大） */}
      <section className="ntr-card ntr-device-card">
        <button type="button" className="ntr-row" onClick={() => onShowConnection?.()}>
          <span className="ntr-device-icon"><Server size={30} /></span>
          <div className="ntr-device" style={{ flex: 1 }}>
            <b>{state.facts.device.identity || SYSTEM_NAME}</b>
            <small>{state.facts.device.version || "RouterOS"}</small>
            <small>运行 {state.facts.device.uptime || "—"}</small>
          </div>
          <Chev />
        </button>
      </section>

      {/* 六元素：CPU / 内存 / 在线设备 / 活动 WAN / 实时流量（有数据才显示） */}
      <div className="ntr-grid2">
        <section className="ntr-card ntr-stat-col"><small>CPU 使用率</small><div className="ntr-ring-wrap"><Ring value={cpu} size={96} /></div></section>
        <section className="ntr-card ntr-stat-col"><small>内存使用率</small><div className="ntr-ring-wrap"><Ring value={memory} size={96} /></div></section>
      </div>
      <div className="ntr-grid2">
        <section className="ntr-card ntr-stat-tile">
          <button type="button" onClick={() => onNavigate("terminals")}>
            <span className="ntr-tile-icon"><Monitor size={26} /></span>
            <b>{connected}</b>
            <small>在线设备 · 共 {terminals.length} 台</small>
          </button>
        </section>
        <section className="ntr-card ntr-stat-tile">
          <button type="button" onClick={() => onNavigate("lineStatus")}>
            <span className="ntr-tile-icon" data-tone="ok"><Globe size={26} /></span>
            <b>{wanOnline} / {wans.length}</b>
            <small>活动 WAN 线路</small>
          </button>
        </section>
      </div>

      {/* 实时流量：有数据才显示 */}
      <section className="ntr-card">
        <div className="ntr-card-head">实时流量 <button className="ntr-link" type="button" onClick={() => onNavigate("lineStatus")}>最近 1 小时 <ChevronRight size={13} /></button></div>
        <div className="ntr-traffic-legend"><span><i className="down" />下行</span><span><i className="up" />上行</span></div>
        <TrafficChart traffic={traffic} />
      </section>

      {/* 快捷入口：横向滑动 */}
      <div className="ntr-quick-h">
        <button type="button" onClick={() => onNavigate("lineStatus")}><Wifi size={22} /><b>线路状态</b><small>WAN 出口与吞吐</small></button>
        <button type="button" onClick={() => onNavigate("terminals")}><Smartphone size={22} /><b>终端监控</b><small>在线设备与流量</small></button>
        <button type="button" onClick={() => onNavigate("logs")}><FileText size={22} /><b>系统日志</b><small>最近系统事件</small></button>
        <button type="button" onClick={() => onNavigate("interfaces")}><Settings size={22} /><b>接口总览</b><small>物理与逻辑接口</small></button>
      </div>

    </div></div>
  </main>;
}

function onlineConnections(snapshot: OverviewRawSnapshot): number | null {
  const total = snapshot.connections?.total;
  return typeof total === "number" ? total : null;
}

/* ============ 二级页通用骨架 ============ */
function SubPage({ title, onBack, children, onRefresh, evidence, state }: { title: string; onBack: () => void; children: React.ReactNode; onRefresh?: () => void; evidence?: OverviewEvidenceModel; state?: OverviewDerivedState }) {
  return <main className="ntr-app" data-ntr-page="sub">
    <SubBar title={title} onBack={onBack} action={onRefresh ? <button className="ntr-iconbtn" type="button" aria-label="刷新" onClick={onRefresh}><RefreshCw size={19} /></button> : undefined} />
    <div className="ntr-scroll is-sub"><div className="ntr-content">{evidence && state ? <ErrorBanner evidence={evidence} state={state} /> : null}{children}</div></div>
  </main>;
}

/* ============ Hub 页（网络/安全/日志） ============ */
function HubPage({ title, onBack, summary, summaryTone, entries, groups, summaryCards }: { title: string; onBack: () => void; summary?: string; summaryTone?: Tone; entries?: Array<{ icon: React.ReactNode; label: string; sub?: string; tone?: Tone; onClick: () => void }>; groups?: Array<{ title: string; entries: Array<{ icon: React.ReactNode; label: string; sub?: string; tone?: Tone; onClick: () => void }> }>; summaryCards?: Array<{ label: string; value: string; note: string; tone: Tone }> }) {
  const renderEntry = (entry: { icon: React.ReactNode; label: string; sub?: string; tone?: Tone; onClick: () => void }, i: number) => (
    <button key={i} type="button" className="ntr-entry" onClick={entry.onClick}>
      <span className="ntr-entry-icon" data-tone={entry.tone || "ok"}>{entry.icon}</span>
      <div className="ntr-entry-main"><b>{entry.label}</b>{entry.sub ? <small>{entry.sub}</small> : null}</div>
      <Chev />
    </button>
  );
  return <SubPage title={title} onBack={onBack}>
    {summaryCards ? <div className="ntr-grid2">
      {summaryCards.map((card, i) => <section key={i} className="ntr-card ntr-hub-tile">
        <small>{card.label}</small>
        <b data-tone={card.tone}>{card.value}</b>
        <em>{card.note}</em>
      </section>)}
    </div> : summary ? <section className="ntr-card"><div className="ntr-hub-summary"><Dot tone={summaryTone || "muted"} /><div><b>{summary}</b></div></div></section> : null}
    {groups ? groups.map((group, gi) => <section key={gi} className="ntr-group">
      <h3 className="ntr-group-title">{group.title}</h3>
      <div className="ntr-card ntr-rows">{group.entries.map(renderEntry)}</div>
    </section>) : <section className="ntr-card ntr-rows">{(entries || []).map(renderEntry)}</section>}
  </SubPage>;
}

/* ============ 网络总览 ============ */
function NetworkHub(props: NtrProps) {
  const { snapshot, onNavigate, evidence } = props;
  const wans = useMemo(() => wanRows(snapshot), [snapshot]);
  const online = wans.filter((w) => w.online).length;
  const wanOffline = wans.filter((w) => w.runningKnown && !w.online).length;
  const wanUnknown = wans.length - online - wanOffline;
  const interfaces = useMemo(() => interfaceRows(snapshot), [snapshot]);
  const ifOnline = interfaces.filter((i) => i.running).length;
  return <HubPage title="网络总览" onBack={() => onNavigate("overview", { replace: true })}
    summaryCards={[
      { label: "WAN 线路", value: `${online} / ${wans.length}`, note: wanOffline ? `${wanOffline} 条离线` : wanUnknown ? `${wanUnknown} 条未采集` : "全部在线", tone: online === wans.length ? "ok" : wanOffline > 0 ? "danger" : "muted" },
      { label: "接　　口", value: `${ifOnline} / ${interfaces.length}`, note: ifOnline === interfaces.length ? "全部运行" : `${interfaces.length - ifOnline} 个未运行`, tone: ifOnline === interfaces.length ? "ok" : "muted" },
    ]}
    groups={[
      { title: "连接状态", entries: [
        { icon: <Wifi size={17} />, label: "宽带线路", sub: `${online} 在线 / ${wanOffline} 离线${wanUnknown ? ` / ${wanUnknown} 未采集` : ""}`, tone: online === wans.length ? "ok" : "warn", onClick: () => onNavigate("lineStatus", { objectId: "__lines__" }) },
        { icon: <Globe size={17} />, label: "接口总览", sub: `${interfaces.length} 个接口`, onClick: () => onNavigate("interfaces") },
        { icon: <Activity size={17} />, label: "静态路由", sub: "路由表配置与状态", onClick: () => onNavigate("routes") },
      ] },
      { title: "流量管理", entries: [
        { icon: <Activity size={17} />, label: "分流监控", sub: "分流规则命中统计", onClick: () => onNavigate("balance") },
        { icon: <Activity size={17} />, label: "流量负载", sub: "多线负载均衡状态", onClick: () => onNavigate("trafficLoad") },
        { icon: <Activity size={17} />, label: "负载审计", sub: "负载历史数据分析", onClick: () => onNavigate("loadAudit") },
      ] },
      { title: "网络服务", entries: [
        { icon: <BookOpen size={17} />, label: "DHCP 服务", sub: "地址池与租约列表", onClick: () => onNavigate("dhcp") },
        { icon: <Globe size={17} />, label: "DNS-IPv4", sub: "IPv4 DNS 服务器配置", onClick: () => onNavigate("dns4") },
        { icon: <Globe size={17} />, label: "DNS-IPv6", sub: "IPv6 DNS 服务器配置", onClick: () => onNavigate("dns6") },
        { icon: <ShieldCheck size={17} />, label: "DNS 与代理体检", sub: "解析测试与连通性检查", onClick: () => onNavigate("readonlyDiagnostics") },
      ] },
    ]} />;
}

/* ============ 安全总览 ============ */
function SecurityHub(props: NtrProps) {
  const { snapshot, onNavigate } = props;
  const terminals = useMemo(() => terminalsList(snapshot), [snapshot]);
  const risks = terminals.filter((t) => t.evidence.kind === "terminal" && /风险|异常|未知/.test(`${t.primary} ${t.secondary}`));
  return <HubPage title="安全总览" onBack={() => onNavigate("overview", { replace: true })}
    summary={risks.length ? `${risks.length} 项异常待处理` : "未发现安全风险"}
    summaryTone={risks.length ? "warn" : "ok"}
    entries={[
      { icon: <Smartphone size={17} />, label: "终端监控", sub: `${terminals.filter((t) => t.evidence.kind === "terminal" && t.evidence.online === true).length} / ${terminals.length} 台在线`, tone: "ok", onClick: () => onNavigate("terminals") },
      { icon: <ShieldCheck size={17} />, label: "终端风险", sub: risks.length ? `${risks.length} 项` : "无风险", tone: risks.length ? "danger" : "ok", onClick: () => onNavigate("terminals", { objectId: "__risk__" }) },
      { icon: <ShieldCheck size={17} />, label: "ACL 规则", sub: "访问控制列表", onClick: () => onNavigate("security", { objectId: "__acl__" }) },
      { icon: <Activity size={17} />, label: "ARP 监控", sub: "ARP 绑定与攻击检测", onClick: () => onNavigate("arp") },
      { icon: <Activity size={17} />, label: "流量审计", sub: "流量行为分析与异常告警", onClick: () => onNavigate("trafficAudit") },
    ]} />;
}

/* ============ 日志中心（子 Tab） ============ */
function LogsHub(props: NtrProps) {
  const { snapshot, onNavigate, route } = props;
  const [tab, setTab] = useState<"system" | "service" | "audit" | "health">("system");
  const current = route === "serviceLogs" ? "service" : route === "readonlyDiagnostics" ? "health" : tab === "system" ? "system" : tab;
  const active = route === "serviceLogs" ? "service" : route === "readonlyDiagnostics" ? "health" : current;
  const pick = (next: typeof active) => {
    setTab(next);
    if (next === "service") onNavigate("serviceLogs", { replace: true });
    else if (next === "health") onNavigate("readonlyDiagnostics", { replace: true });
    else onNavigate("logs", { replace: true });
  };
  const title = active === "service" ? "服务日志" : active === "health" ? "采集健康" : active === "audit" ? "系统审计" : "系统日志";
  return <SubPage title={title} evidence={props.evidence} state={props.state} onBack={() => onNavigate("overview", { replace: true })}>
    <div className="ntr-subtabs">
      {(["system", "service", "audit", "health"] as const).map((id) => (
        <button key={id} type="button" aria-pressed={active === id} onClick={() => pick(id)}>{id === "system" ? "系统日志" : id === "service" ? "服务日志" : id === "audit" ? "系统审计" : "采集健康"}</button>
      ))}
    </div>
    {active === "system" && <LogList snapshot={snapshot} kind="logs" />}
    {active === "service" && <LogList snapshot={snapshot} kind="serviceLogs" />}
    {active === "audit" && <AuditView snapshot={snapshot} />}
    {active === "health" && <HealthView {...props} />}
  </SubPage>;
}

function LogList({ snapshot, kind }: { snapshot: OverviewRawSnapshot; kind: "logs" | "serviceLogs" }) {
  const rows = useMemo(() => rowsFromModel(kind, buildSectionModel(kind, snapshot)), [snapshot, kind]);
  return <section className="ntr-card ntr-rows">
    {rows.slice(0, 40).map((row) => <Row key={row.id} title={row.primary} sub={row.secondary} right={row.trailing} />)}
    {rows.length === 0 ? <p className="ntr-empty">当前没有日志记录</p> : null}
    {rows.length > 40 ? <p className="ntr-empty">显示前 40 条 · 共 {rows.length} 条</p> : null}
  </section>;
}

function AuditView({ snapshot }: { snapshot: OverviewRawSnapshot }) {
  const rows = useMemo(() => rowsFromModel("trafficAudit", buildSectionModel("trafficAudit", snapshot)), [snapshot]);
  return <section className="ntr-card ntr-rows">
    {rows.slice(0, 40).map((row) => <Row key={row.id} title={row.primary} sub={row.secondary} right={row.trailing} />)}
    {rows.length === 0 ? <p className="ntr-empty">当前没有审计记录</p> : null}
    {rows.length > 40 ? <p className="ntr-empty">显示前 40 条 · 共 {rows.length} 条</p> : null}
  </section>;
}

function HealthView(props: NtrProps) {
  const { evidence, state } = props;
  const rest = state.facts.collection.rest;
  const ssh = state.facts.collection.ssh;
  return <>
    <section className="ntr-card">
      <div className="ntr-statline">
        <div><small>REST 通道</small><b data-tone={rest.status === "current" ? "ok" : "danger"}>{rest.status === "current" ? "正常" : "异常"}</b></div>
        <div><small>SSH 通道</small><b data-tone={ssh.status === "current" ? "ok" : "danger"}>{ssh.status === "current" ? "正常" : "异常"}</b></div>
        <div><small>证据模式</small><b>{evidence.evidenceMode === "current" ? "当前" : evidence.evidenceMode === "historical" ? "历史" : "不可用"}</b></div>
        <div><small>更新于</small><b>{formatRfc3339LocalTime(evidence.evidenceAt) || "—"}</b></div>
      </div>
    </section>
    <KvCard title="采集通道" rows={[
      ["REST 快照", rest.status === "current" ? "正常" : "失败", rest.status === "current" ? "ok" : "danger"],
      ["SSH 采样", ssh.status === "current" ? "正常" : "失败", ssh.status === "current" ? "ok" : "danger"],
      ["数据来源", evidence.evidenceLabel, "muted"],
    ]} />
  </>;
}

/* ============ 终端监控 ============ */
function TerminalsPage(props: NtrProps & { presetRisk?: boolean }) {
  const { snapshot, onNavigate, navigationContext, presetRisk } = props;
  const all = useMemo(() => terminalsList(snapshot), [snapshot]);
  const [filter, setFilter] = useState<string>(navigationContext?.query || (presetRisk ? "风险" : "全部"));
  const filtered = filter === "全部" ? all
    : filter === "在线" ? all.filter((t) => t.evidence.kind === "terminal" && t.evidence.online === true)
    : filter === "离线" ? all.filter((t) => t.evidence.kind === "terminal" && t.evidence.online === false)
    : filter === "风险" ? all.filter((t) => /风险|异常|未知/.test(`${t.primary} ${t.secondary}`))
    : all;
  const onlineCount = all.filter((t) => t.evidence.kind === "terminal" && t.evidence.online).length;
  const peak = all.reduce((max, t) => Math.max(max, (t.evidence as { downRate?: number }).downRate || 0), 0);
  return <SubPage title="终端监控" evidence={props.evidence} state={props.state} onBack={() => onNavigate("overview", { replace: true })}>
    <section className="ntr-card">
      <div className="ntr-statline">
        <div><small>在线</small><b data-tone="ok">{onlineCount}</b></div>
        <div><small>离线</small><b>{all.length - onlineCount}</b></div>
        <div><small>总计</small><b>{all.length}</b></div>
        <div><small>连接数</small><b>{onlineConnections(snapshot) ?? "—"}</b></div>
      </div>
    </section>
    <div className="ntr-chips">
      {["全部", "在线", "离线", "风险"].map((c) => <button key={c} type="button" className="ntr-chip" aria-pressed={filter === c} onClick={() => setFilter(c)}>{c}</button>)}
    </div>
    <section className="ntr-card ntr-rows">
      {filtered.slice(0, 50).map((t) => {
        const e = t.evidence.kind === "terminal" ? t.evidence : null;
        return <div key={t.id} className="ntr-term">
          <div className="ntr-term-head">
            <span className="ntr-entry-icon" data-tone="ok"><Smartphone size={16} /></span>
            <b>{t.primary}</b>
            {e?.online === true ? <Pill tone="ok">在线</Pill> : e?.online === false ? <Pill tone="muted">离线</Pill> : <Pill tone="muted">未知</Pill>}
            <span style={{ flex: 1 }} />
            <button className="ntr-link" type="button" onClick={() => onNavigate("terminals", { objectId: t.id })}>详情 <ChevronRight size={12} /></button>
          </div>
          <div className="ntr-term-grid">
            <div className="ntr-term-kv"><span>IP</span><b>{e?.ip || t.secondary}</b></div>
            <div className="ntr-term-rates">
              <div className="up">↑ {fmtRate(e?.upRate ?? null)} {fmtRateUnit(e?.upRate ?? null)}</div>
              <div className="down">↓ {fmtRate(e?.downRate ?? null)} {fmtRateUnit(e?.downRate ?? null)}</div>
              <small>{e?.connections !== null && e?.connections !== undefined ? `${e.connections} 连接` : ""}</small>
            </div>
            <div className="ntr-term-kv"><span>MAC</span><b>{e?.mac || "—"}</b></div>
            <div className="ntr-term-kv"><span>接口</span><b>{e?.interfaceName || "—"}</b></div>
          </div>
        </div>;
      })}
      {filtered.length === 0 ? <p className="ntr-empty">当前筛选没有匹配的终端</p> : null}
      {filtered.length > 50 ? <p className="ntr-empty">显示前 50 条 · 共 {filtered.length} 条</p> : null}
    </section>
  </SubPage>;
}

/* ============ 更多设置 ============ */
function MoreHub(props: NtrProps) {
  const { onNavigate, onShowConnection, evidence } = props;
  const profile = props.state.facts.device;
  return <SubPage title="更多设置" onBack={() => onNavigate("overview", { replace: true })}>
    <section className="ntr-card">
      <div className="ntr-admin">
        <span className="ntr-avatar"><UserRound size={24} /></span>
        <div><b>{profile.identity || profile.routerHost || "已连接设备"}</b><Pill tone="info">只读监控</Pill></div>
      </div>
    </section>
    <div className="ntr-group">快捷功能</div>
    <section className="ntr-card ntr-rows">
      <Row title="线路状态" sub="WAN 出口与吞吐" onClick={() => onNavigate("lineStatus")} right="›" />
      <Row title="终端监控" sub="在线设备与流量" onClick={() => onNavigate("terminals")} right="›" />
      <Row title="系统日志" sub="最近系统事件" onClick={() => onNavigate("logs")} right="›" />
      <Row title="只读总览" sub="系统信息只读视图" onClick={() => onNavigate("readonlyDiagnostics")} right="›" />
      <Row title="全局搜索" sub="跨页面搜索对象与配置" onClick={() => props.onOpenSearch?.()} right="›" />
    </section>
    <div className="ntr-group">系统设置</div>
    <section className="ntr-card ntr-rows">
      <Row title="网络配置" onClick={() => onNavigate("interfaces")} right="›" />
      <Row title="安全策略" onClick={() => onNavigate("security")} right="›" />
      <Row title="诊断与采集" sub="采集健康与只读诊断" onClick={() => onNavigate("readonlyDiagnostics")} right="›" />
    </section>
    <div className="ntr-group">关于</div>
    <section className="ntr-card ntr-rows">
      <Row title={`关于${SYSTEM_NAME}`} sub={`版本 ${APP_VERSION} · 作者 ${AUTHOR}`} />
    </section>
    <div className="ntr-group">账户</div>
    <section className="ntr-card ntr-rows">
      <Row title="退出登录" onClick={() => props.onLogout?.()} />
    </section>
    <div className="ntr-footer">{SYSTEM_NAME} {APP_VERSION} · 作者 {AUTHOR}</div>
  </SubPage>;
}

/* ============ 全局搜索（浮层） ============ */
function SearchModal({ snapshot, onClose, onNavigate }: { snapshot: OverviewRawSnapshot; onClose: () => void; onNavigate: PanelNavigate }) {
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const routes: PanelRouteId[] = ["interfaces", "terminals", "routes", "dns4", "dns6", "logs", "dhcp", "arp"];
  const allRows = useMemo(() => routes.flatMap((route) => {
    const rows = rowsFromModel(route, buildSectionModel(route, snapshot));
    return rows.map((r) => ({ route, r }));
  }), [snapshot]);
  const results = useMemo(() => {
    const nq = q.trim().toLowerCase();
    if (!nq) return [];
    return allRows.filter((m) => `${m.r.primary} ${m.r.secondary}`.toLowerCase().includes(nq)).slice(0, 12);
  }, [allRows, q]);
  const groups = useMemo(() => {
    const map = new Map<PanelRouteId, MatchedRow[]>();
    for (const m of results) {
      const list = map.get(m.route) || [];
      list.push(m.r);
      map.set(m.route, list);
    }
    return [...map.entries()];
  }, [results]);
  type MatchedRow = ReturnType<typeof rowsFromModel>[number];
  return <div className="ntr-search-modal" role="dialog" aria-modal="true" aria-label="全局搜索" onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
    <header>
      <div className="ntr-search"><Search size={16} /><input autoFocus aria-label="全局搜索" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索对象、接口、终端、DNS、日志…" /></div>
      <button className="ntr-link" type="button" onClick={onClose}>取消</button>
    </header>
    <div className="ntr-search-body">
      {!q.trim() && recent.length > 0 ? <>
        <div className="ntr-group">最近搜索</div>
        <div className="ntr-chips">{recent.map((r) => <button key={r} type="button" className="ntr-chip" onClick={() => setQ(r)}>{r}</button>)}</div>
      </> : null}
      {q.trim() && groups.length === 0 ? <p className="ntr-empty">没有匹配「{q}」的结果</p> : null}
      {groups.map(([route, rows]) => <section key={route} className="ntr-card ntr-rows">
        <h2 style={{ fontSize: 12, color: "var(--ntr-sub)", padding: "0 0 4px" }}>{PANEL_ROUTES[route].title}</h2>
        {rows.slice(0, 5).map((r) => <Row key={r.id} title={r.primary} sub={r.secondary} onClick={() => { setRecent((prev) => [q, ...prev.filter((x) => x !== q)].slice(0, 6)); onNavigate(route, { objectId: r.id }); onClose(); }} right="›" />)}
      </section>)}
    </div>
  </div>;
}

/* ============ 通用列表页（Workspace 重样式） ============ */
function GenericListPage(props: NtrProps & { route: Exclude<PanelRouteId, "overview" | "lineStatus" | "more"> }) {
  const { route, snapshot, onNavigate, navigationContext } = props;
  const model = useMemo(() => buildSectionModel(route, snapshot), [route, snapshot]);
  const definition = useMemo(() => domainDefinitionFor(route), [route]);
  const rows = useMemo(() => rowsFromModel(route, model), [route, model]);
  const [query, setQuery] = useState(navigationContext?.query || "");
  const [filterId, setFilterId] = useState(definition.filters[0]?.id || "all");
  const [sortId, setSortId] = useState(definition.defaultSort);
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const searched = needle ? rows.filter((r) => `${r.table} ${r.primary} ${r.secondary} ${r.trailing}`.toLowerCase().includes(needle)) : rows;
    return sortWorkspaceRows(filterWorkspaceRows(searched, definition, filterId), definition, sortId);
  }, [definition, filterId, query, rows, sortId]);
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  if (navigationContext?.objectId) {
    const row = rows.find((r) => r.id === navigationContext.objectId) || null;
    if (row) return <DetailPage route={route} row={row} evidence={props.evidence} onBack={() => onNavigate(route, { objectId: null, replace: true })} />;
  }
  return <SubPage title={PANEL_ROUTES[route].title} onBack={() => onNavigate("overview", { replace: true })}>
    {definition.searchable ? <div className="ntr-search" style={{ marginBottom: 8 }}><Search size={16} /><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder={definition.searchPlaceholder} /></div> : null}
    {definition.filters.length > 1 ? <div className="ntr-chips">{definition.filters.map((f) => <button key={f.id} type="button" className="ntr-chip" aria-pressed={filterId === f.id} onClick={() => { setFilterId(f.id); setPage(1); }}>{f.label}</button>)}</div> : null}
    <section className="ntr-card ntr-rows">
      {visible.map((row) => <Row key={row.id} title={row.primary} sub={row.secondary} right={row.trailing} onClick={() => onNavigate(route, { objectId: row.id })} />)}
      {visible.length === 0 ? <p className="ntr-empty">当前筛选没有可核实的对象</p> : null}
    </section>
    {pageCount > 1 ? <div className="ntr-chips" style={{ justifyContent: "center" }}>{Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => <button key={p} type="button" className="ntr-chip" aria-pressed={page === p} onClick={() => setPage(p)}>{p}</button>)}</div> : null}
  </SubPage>;
}

function DetailPage({ route, row, onBack, evidence }: { route: PanelRouteId; row: ReturnType<typeof rowsFromModel>[number]; onBack: () => void; evidence?: OverviewEvidenceModel }) {
  const facts = row.evidence.kind === "interface"
    ? [["状态", row.evidence.running === true ? "在线" : "离线", row.evidence.running === true ? "ok" as Tone : "muted" as Tone], ["默认路由", row.evidence.defaultRouteRelation === "direct" ? "是" : "否"], ["地址", row.evidence.addresses.join("、") || "—"], ["下载", fmtRate(row.evidence.rxRate) + " " + (row.evidence.rxRate != null ? fmtRateUnit(row.evidence.rxRate) : "")], ["上传", fmtRate(row.evidence.txRate) + " " + (row.evidence.txRate != null ? fmtRateUnit(row.evidence.txRate) : "")]]
    : row.evidence.kind === "route"
      ? [["目标", row.evidence.destination || "—"], ["网关", row.evidence.gateway || "—"], ["路由表", row.evidence.table || "—"], ["默认路由", row.evidence.isDefault ? "是" : "否"], ["活动状态", row.evidence.active === true ? "活动" : row.evidence.active === false ? "非活动" : "未核实"]]
      : row.evidence.kind === "terminal"
        ? [["地址", row.evidence.ip || "—"], ["MAC", row.evidence.mac || "—"], ["在线状态", row.evidence.online === true ? "在线" : row.evidence.online === false ? "离线" : "未核实"], ["接口", row.evidence.interfaceName || "—"], ["连接数", row.evidence.connections === null ? "—" : String(row.evidence.connections)]]
        : [["说明", row.secondary || "—"]];
  return <SubPage title={row.primary} evidence={evidence} onBack={onBack}>
    <KvCard title={row.primary} rows={facts.map(([l, v, t]) => [l, v, (t || "muted") as Tone])} />
    <KvCard title="证据来源" rows={[["页面", PANEL_ROUTES[route].title], ["数据表", row.table], ["更新时间", formatRfc3339LocalTime(evidence?.evidenceAt ?? null) || "未记录"]]} />
  </SubPage>;
}

/* ============ 终端详情 ============ */
function TerminalDetailPage(props: NtrProps & { objectId: string }) {
  const { snapshot, onNavigate, objectId } = props;
  const all = useMemo(() => terminalsList(snapshot), [snapshot]);
  const row = all.find((r) => r.id === objectId) || null;
  if (!row) return <SubPage title="终端详情" evidence={props.evidence} state={props.state} onBack={() => onNavigate("terminals", { objectId: null, replace: true })}><p className="ntr-empty">当前快照没有该终端的记录</p></SubPage>;
  const e = row.evidence.kind === "terminal" ? row.evidence : null;
  return <SubPage title={row.primary} onBack={() => onNavigate("terminals", { objectId: null, replace: true })}>
    <KvCard title={row.primary} rows={[
      ["状态", e?.online === true ? "在线" : e?.online === false ? "离线" : "未知", e?.online === true ? "ok" : "muted"],
      ["IP 地址", e?.ip || "未记录"],
      ["MAC", e?.mac || "未记录"],
      ["接入接口", e?.interfaceName || "未记录"],
      ["连接数", e?.connections === null || e?.connections === undefined ? "—" : String(e.connections)],
      ["下载速率", `${fmtRate(e?.downRate ?? null)} ${fmtRateUnit(e?.downRate ?? null)}`.trim()],
      ["上传速率", `${fmtRate(e?.upRate ?? null)} ${fmtRateUnit(e?.upRate ?? null)}`.trim()],
    ]} />
  </SubPage>;
}

/* ============ WAN 详情（线路状态二级页） ============ */
function WanDetailPage(props: NtrProps) {
  const { snapshot, onNavigate, navigationContext, evidence } = props;
  const wans = useMemo(() => wanRows(snapshot), [snapshot]);
  const wan = wans.find((w) => norm(w.name) === norm(navigationContext?.objectId)) || wans[0] || null;
  const traffic = evidence.traffic && evidence.traffic.status === "ready" ? evidence.traffic : null;
  if (!wan) return <SubPage title="线路详情" evidence={evidence} state={props.state} onBack={() => onNavigate("lineStatus", { replace: true })}><p className="ntr-empty">当前快照没有可核实的出口对象</p></SubPage>;
  return <SubPage title={wan.name} evidence={evidence} state={props.state} onBack={() => onNavigate("lineStatus", { objectId: null, replace: true })}>
    <section className="ntr-card">
      <div className="ntr-hub-summary"><Dot tone={wan.runningKnown ? toneFor(wan.online, wan.disabled) : "muted"} /><div><b>{wan.name}</b><small>{wan.provider || "运营商"} · {wan.online ? "在线" : "离线"}</small></div></div>
    </section>
    <div className="ntr-grid2">
      <section className="ntr-card ntr-stat"><span className="ntr-stat-icon"><ArrowDown size={18} /></span><div className="ntr-stat"><small>下载速率</small><b>{wan.down} {wan.downUnit}</b></div></section>
      <section className="ntr-card ntr-stat"><span className="ntr-stat-icon"><ArrowUp size={18} /></span><div className="ntr-stat"><small>上传速率</small><b>{wan.up} {wan.upUnit}</b></div></section>
    </div>
    <KvCard title="线路配置" rows={[
      ["IPv4 地址", wan.address || "—"],
      ["运营商", wan.provider || "—"],
      ["在线时长", wan.duration || "—"],
      ["延迟", wan.latency === null ? "—" : `${wan.latency} ms`],
      ["丢包率", wan.loss === null ? "—" : `${wan.loss}%`],
    ]} />
    {traffic ? <section className="ntr-card"><h2>近 1 小时流量</h2><TrafficChart traffic={traffic} /></section> : null}
  </SubPage>;
}

/* ============ 线路状态（WAN 列表） ============ */
function LineStatusPage(props: NtrProps) {
  const { snapshot, onNavigate } = props;
  const wans = useMemo(() => wanRows(snapshot), [snapshot]);
  return <SubPage title="线路状态" onBack={() => onNavigate("lineStatus", { objectId: null, query: null, replace: true })}>
    <section className="ntr-card ntr-rows">
      {wans.map((wan) => (
        <Row key={wan.id} dot={toneFor(wan.online, wan.disabled)} title={wan.name} sub={`${wan.provider || "运营商"} · ${wan.duration || "—"}${wan.isDefault ? " · 默认出口" : ""}`} right={!wan.runningKnown ? "未采集" : wan.online ? `${wan.down} ${wan.downUnit}` : "未拨号"} onClick={() => onNavigate("lineStatus", { objectId: wan.name })} />
      ))}
      {wans.length === 0 ? <p className="ntr-empty">当前没有 WAN 线路</p> : null}
    </section>
  </SubPage>;
}

/* ============ Surface 总调度 ============ */
export function MobileNtrSurface(props: NtrProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const route = props.route || "overview";
  const searchHistoryRef = useRef(false);
  const openSearch = () => {
    if (!searchHistoryRef.current) {
      window.history.pushState({ ntrSearch: true }, "");
      searchHistoryRef.current = true;
    }
    setSearchOpen(true);
  };
  const closeSearch = () => {
    setSearchOpen(false);
    if (searchHistoryRef.current) {
      searchHistoryRef.current = false;
      window.history.back();
    }
  };
  useEffect(() => {
    const onPop = () => {
      searchHistoryRef.current = false;
      setSearchOpen(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const shared = { ...props, onOpenSearch: openSearch };

  if (route === "overview") {
    return <>
      <HomePage {...shared} onSearch={openSearch} />
      {searchOpen ? <SearchModal snapshot={props.snapshot} onClose={closeSearch} onNavigate={props.onNavigate} /> : null}
    </>;
  }
  if (route === "lineStatus") {
    const oid = props.navigationContext?.objectId;
    if (oid === "__lines__") return <LineStatusPage {...props} />;
    if (oid) return <WanDetailPage {...props} />;
    return <NetworkHub {...props} />;
  }
  if (route === "security") {
    if (props.navigationContext?.objectId === "__acl__") {
      return <GenericListPage {...props} route="security" navigationContext={{ objectId: null, query: null, risk: null, returnRoute: null, evidenceAt: null }} />;
    }
    return <SecurityHub {...props} />;
  }
  if (route === "logs" || route === "serviceLogs") return <LogsHub {...props} />;
  if (route === "readonlyDiagnostics") return <LogsHub {...props} />;
  if (route === "terminals") {
    const oid = props.navigationContext?.objectId;
    if (oid === "__risk__") return <TerminalsPage {...props} presetRisk />;
    if (oid) return <TerminalDetailPage {...props} objectId={oid} />;
    return <TerminalsPage {...props} />;
  }
  if (route === "more") return <MoreHub {...props} />;
  return <GenericListPage key={route} {...props} route={route} />;
}

export default MobileNtrSurface;
