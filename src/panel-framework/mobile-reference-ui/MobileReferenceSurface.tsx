import { AlertOctagon, ArrowDown, ArrowLeft, ArrowUp, ArrowDownUp, Check, ChevronLeft, ChevronRight, Ellipsis, FileText, Grid2X2, Network, RefreshCw, Search, SlidersHorizontal, Users } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { OverviewDerivedState, OverviewRawInterfaceRow, OverviewRawSnapshot, OverviewRawWanRow } from "../overview";
import type { OverviewEvidenceModel, OverviewResourceMetric, OverviewTrafficInstrument } from "../overview/evidence-model/overviewEvidenceTypes";
import { domainDefinitionFor, filterWorkspaceRows, sortWorkspaceRows } from "../domain-workspace/domainDefinitions";
import { rowsFromModel } from "../domain-workspace/workspaceRows";
import type { PanelNavigate, PanelNavigationContext, PanelRouteId, PanelWorkspaceHistoryState } from "../routes/panelRoutes";
import { createPanelWorkspaceHistoryState, panelWorkspaceStateFromHistoryState, PANEL_ROUTES } from "../routes/panelRoutes";
import { buildSectionModel } from "../sections/sectionModels";
import { formatRfc3339Local, formatRfc3339LocalTime, parseRfc3339Timestamp } from "../timeContract";
import "./mobile-reference.css";

type Tone = "ok" | "warn" | "danger" | "muted";
type Scene = "normal" | "resource" | "interfaces" | "collection" | "outage" | "unavailable" | "route";
type MetricText = { value: string; unit: string };

interface WanView {
  id: string;
  name: string;
  provider: string;
  online: boolean;
  observed: boolean;
  disabled: boolean;
  verifiedDefault: boolean;
  duration: string;
  down: MetricText;
  up: MetricText;
  latency: string;
  loss: string;
  address: string;
  netmask: string;
  gateway: string;
  mtu: string;
}

interface InterfaceView {
  id: string;
  name: string;
  role: string;
  status: string;
  tone: Tone;
  observed: boolean;
  rates: string;
  quality: string;
}

export interface MobileReferenceProps {
  evidence: OverviewEvidenceModel;
  snapshot: OverviewRawSnapshot;
  state: OverviewDerivedState;
  onNavigate: PanelNavigate;
  onRefresh?: () => Promise<void> | void;
  route?: PanelRouteId;
  navigationContext?: PanelNavigationContext;
  navigationEntryKey?: number;
  onShowConnection?: () => void;
}

const normalized = (value: unknown) => String(value ?? "").trim().toLowerCase();
const valueOf = (row: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) { const value = row[key]; if (value !== null && value !== undefined && String(value).trim()) return String(value).trim(); }
  return "";
};
const numberOf = (row: Record<string, unknown>, keys: string[]): number | null => {
  for (const key of keys) { const value = Number(row[key]); if (Number.isFinite(value)) return value; }
  return null;
};
const metric = (value: string | null | undefined): MetricText => {
  const match = String(value ?? "").trim().match(/^(.+?)\s+([A-Za-z]+)$/);
  return match ? { value: match[1], unit: match[2] } : { value: value || "—", unit: "" };
};
const rawRate = (value: number | null | undefined): MetricText => {
  if (value === null || value === undefined || !Number.isFinite(value)) return { value: "—", unit: "" };
  if (value >= 1_000_000_000) return { value: (value / 1_000_000_000).toFixed(value >= 10_000_000_000 ? 1 : 2), unit: "Gbps" };
  if (value >= 1_000_000) return { value: (value / 1_000_000).toFixed(value >= 100_000_000 ? 1 : 2), unit: "Mbps" };
  if (value >= 1_000) return { value: (value / 1_000).toFixed(value >= 100_000 ? 1 : 2), unit: "Kbps" };
  return { value: String(Math.round(value)), unit: "bps" };
};

function uniqueWan(snapshot: OverviewRawSnapshot): OverviewRawWanRow[] {
  const seen = new Set<string>();
  return [...(snapshot.wan || []), ...(snapshot.pppoe || [])].filter((row) => {
    const key = normalized(row.name || row.interface || row.access || row.parent);
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  });
}

function routeMatches(row: OverviewRawWanRow, gateway: string): boolean {
  const target = normalized(gateway);
  if (!target) return false;
  return [row.name, row.interface, row.access, row.parent].map(normalized).filter(Boolean).some((candidate) => target === candidate || target.includes(candidate) || candidate.includes(target));
}

function wanView(evidence: OverviewEvidenceModel, snapshot: OverviewRawSnapshot, objectId?: string | null): WanView | null {
  const rows = uniqueWan(snapshot);
  const active = evidence.evidenceMode === "current" ? evidence.routeEvidence.activePath : null;
  const verified = active ? rows.find((row) => routeMatches(row, active.gateway)) || null : null;
  const requestedName = objectId ? normalized(objectId.replace(/^(?:wan|if):/i, "")) : "";
  const requested = objectId
    ? rows.find((candidate) => normalized(valueOf(candidate as Record<string, unknown>, ["name", "interface", "access", "parent"])) === requestedName) || null
    : null;
  // A default WAN is a relationship claim, not a visual convenience. Without
  // an explicit route match, only an explicitly selected object may be shown.
  const row = requested || verified || null;
  if (!row) return null;
  const raw = row as Record<string, unknown>;
  const atomic = Boolean(row === verified && evidence.evidenceMode === "current" && evidence.traffic?.status === "ready");
  const latency = numberOf(raw, ["latency", "delay", "ping", "latencyMs"]);
  const loss = numberOf(raw, ["loss", "packetLoss", "lossPercent"]);
  return {
    id: valueOf(raw, ["name", "interface", "access", "parent"]) || "WAN",
    name: valueOf(raw, ["name", "interface", "access", "parent"]) || "WAN",
    provider: valueOf(raw, ["provider", "isp", "carrier", "comment"]) || "运营商未记录",
    online: row.running === true && row.disabled !== true,
    observed: row.disabled === true || typeof row.running === "boolean",
    disabled: row.disabled === true,
    verifiedDefault: Boolean(row === verified && active),
    duration: valueOf(raw, ["uptime", "onlineFor", "connectedFor", "duration"]) || "未记录",
    down: atomic ? metric(evidence.traffic?.currentDown) : { value: "—", unit: "" },
    up: atomic ? metric(evidence.traffic?.currentUp) : { value: "—", unit: "" },
    latency: latency === null ? "—" : `${latency} ms`,
    loss: loss === null ? "—" : `${loss} %`,
    address: valueOf(raw, ["ipv4Address", "address", "ip"]) || "未记录",
    netmask: valueOf(raw, ["netmask", "subnetMask", "mask"]) || "未记录",
    gateway: row === verified && active
      ? active.gateway
      : valueOf(raw, ["gateway", "defaultGateway"]) || "未核实",
    mtu: valueOf(raw, ["mtu"]) || "未记录",
  };
}

function interfaceViews(snapshot: OverviewRawSnapshot): InterfaceView[] {
  const wan = uniqueWan(snapshot).map((row): InterfaceView => {
    const raw = row as Record<string, unknown>; const observed = row.disabled === true || typeof row.running === "boolean"; const online = row.running === true && row.disabled !== true;
    const down = rawRate(row.downRate); const up = rawRate(row.upRate);
    const latency = numberOf(raw, ["latency", "delay", "ping", "latencyMs"]); const loss = numberOf(raw, ["loss", "packetLoss", "lossPercent"]);
    return { id: `wan:${valueOf(raw, ["name", "interface"])}`, name: valueOf(raw, ["name", "interface"]) || "WAN", role: valueOf(raw, ["provider", "isp", "carrier", "comment"]) || "WAN", status: online ? "在线" : row.disabled ? "未启用" : observed ? "离线" : "未核实", tone: online ? "ok" : row.disabled ? "muted" : observed ? "danger" : "warn", observed, rates: `${down.value} ${down.unit} / ${up.value} ${up.unit}`.trim(), quality: `延迟 ${latency === null ? "—" : `${latency} ms`}　丢包 ${loss === null ? "—" : `${loss}%`}` };
  });
  const names = new Set(wan.map((item) => normalized(item.name)));
  const interfaces = (snapshot.interfaces || []).filter((row) => !names.has(normalized(row.name || row.interface))).map((row: OverviewRawInterfaceRow): InterfaceView => {
    const raw = row as Record<string, unknown>; const observed = row.disabled === true || typeof row.running === "boolean"; const online = row.running === true && row.disabled !== true;
    const down = rawRate(row.rxRate ?? row.downRate); const up = rawRate(row.txRate ?? row.upRate);
    return { id: `if:${valueOf(raw, ["name", "interface"])}`, name: valueOf(raw, ["name", "interface"]) || "接口", role: valueOf(raw, ["role", "type", "bridge", "parent"]) || "接口", status: online ? "在线" : row.disabled ? "未启用" : observed ? "离线" : "未核实", tone: online ? "ok" : row.disabled ? "muted" : observed ? "danger" : "warn", observed, rates: `${down.value} ${down.unit} / ${up.value} ${up.unit}`.trim(), quality: "延迟 —　丢包 —" };
  });
  return [...wan, ...interfaces].sort((a, b) => (a.tone === "danger" ? 0 : a.tone === "ok" ? 1 : 2) - (b.tone === "danger" ? 0 : b.tone === "ok" ? 1 : 2));
}

function interfaceWorkspaceRowForObject(snapshot: OverviewRawSnapshot, objectId: string): ReturnType<typeof rowsFromModel>[number] | null {
  const workspaceRows = rowsFromModel("interfaces", buildSectionModel("interfaces", snapshot));
  return workspaceRows.find((row) => row.id === objectId)
    || workspaceRows.find((row) => normalized(row.primary) === normalized(objectId.replace(/^(?:wan|if):/i, "")))
    || null;
}

function rawInterfaceForObject(snapshot: OverviewRawSnapshot, objectId: string): Record<string, unknown> | null {
  const token = normalized(objectId);
  const rows = [...uniqueWan(snapshot), ...(snapshot.interfaces || [])] as Array<Record<string, unknown>>;
  const workspaceRow = interfaceWorkspaceRowForObject(snapshot, objectId);
  const fallbackName = workspaceRow?.primary || objectId.replace(/^(?:wan|if):/i, "");
  return rows.find((row) => {
    const name = normalized(valueOf(row, ["name", "interface", "access", "parent"]));
    return name && (name === token || `wan:${name}` === token || `if:${name}` === token || name === normalized(fallbackName));
  }) || null;
}

function interfaceViewForObject(snapshot: OverviewRawSnapshot, objectId: string): InterfaceView | null {
  const token = normalized(objectId);
  const view = interfaceViews(snapshot).find((candidate) => normalized(candidate.id) === token || normalized(candidate.name) === token || normalized(`wan:${candidate.name}`) === token || normalized(`if:${candidate.name}`) === token);
  if (view) return view;
  const raw = rawInterfaceForObject(snapshot, objectId);
  if (!raw) return null;
  const name = valueOf(raw, ["name", "interface", "access", "parent"]) || "接口";
  return interfaceViews(snapshot).find((candidate) => normalized(candidate.name) === normalized(name)) || null;
}

function sceneFor(evidence: OverviewEvidenceModel, state: OverviewDerivedState, interfaces: InterfaceView[], routeLinked: boolean): Scene {
  if (evidence.evidenceMode === "unavailable" || state.scenario === "no-snapshot") return "unavailable";
  if (state.scenario === "collection-down" || evidence.risk === "collection") return "collection";
  if (state.scenario === "all-offline") return "outage";
  if (evidence.risk === "resource" || state.scenario === "resource-full") return "resource";
  if (evidence.risk === "interfaces" || state.scenario === "interfaces-down" || (state.scenario === "fleet" && interfaces.some((item) => item.tone === "danger"))) return "interfaces";
  if (!evidence.routeEvidence.activePath || !routeLinked) return "route";
  return "normal";
}

export function buildMobileReferenceModel(evidence: OverviewEvidenceModel, snapshot: OverviewRawSnapshot, state: OverviewDerivedState) {
  const interfaces = interfaceViews(snapshot);
  const rows = uniqueWan(snapshot);
  const active = evidence.evidenceMode === "current" ? evidence.routeEvidence.activePath : null;
  const routeLinked = Boolean(active && rows.some((row) => routeMatches(row, active.gateway)));
  const scene = sceneFor(evidence, state, interfaces, routeLinked);
  const wan = wanView(evidence, snapshot);
  const traffic = scene === "normal" && wan?.verifiedDefault && evidence.evidenceMode === "current" && evidence.traffic?.status === "ready" ? evidence.traffic : null;
  return { scene, wan, interfaces, traffic };
}

export function mobileEvidenceTimestampLabel(evidenceAt: string | null, now = Date.now()): string {
  const timestamp = parseRfc3339Timestamp(evidenceAt);
  const time = formatRfc3339LocalTime(evidenceAt);
  if (timestamp === null || !time) return "时间未记录";
  const observed = new Date(timestamp);
  const current = new Date(now);
  const sameLocalDay = (left: Date, right: Date) => left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
  if (sameLocalDay(observed, current)) return `今日 ${time}`;
  const yesterday = new Date(current);
  yesterday.setDate(current.getDate() - 1);
  if (sameLocalDay(observed, yesterday)) return `昨日 ${time}`;
  const full = formatRfc3339Local(evidenceAt);
  return full ? full.replace(/ [+-]\d{2}:\d{2}$/, "") : "时间未记录";
}

function timestampLabel(evidence: OverviewEvidenceModel): string {
  return mobileEvidenceTimestampLabel(evidence.evidenceAt);
}

function evidenceBoundaryLabel(evidence: OverviewEvidenceModel): string {
  return evidence.evidenceMode === "current" ? "当前" : evidence.evidenceMode === "historical" ? "历史，不代表当前" : "当前不可核实";
}

function Header({ title, alert, refreshing, onRefresh, onMore }: { title: string; alert?: boolean; refreshing: boolean; onRefresh?: () => Promise<void>; onMore: () => void }) {
  return <header className="ref-topbar"><div className="ref-topbar__title">{alert ? <AlertOctagon className="ref-topbar__alert" aria-hidden="true" /> : null}<h1 data-panel-route-title tabIndex={-1}>{title}</h1></div><div className="ref-topbar__actions"><button type="button" aria-label={refreshing ? "正在刷新当前数据" : "刷新当前数据"} aria-busy={refreshing} disabled={!onRefresh || refreshing} onClick={onRefresh}><RefreshCw className={refreshing ? "ref-spin" : undefined} size={19} aria-hidden="true" /></button><button type="button" aria-label="打开更多工具" onClick={onMore}><Ellipsis size={20} aria-hidden="true" /></button></div></header>;
}

function Status({ title, note, meta, tone }: { title: string; note: string; meta: string; tone: Tone }) {
  return <section className="ref-status" data-tone={tone}><span className="ref-status__icon">{tone === "ok" ? <Check size={19} aria-hidden="true" /> : <AlertOctagon size={19} aria-hidden="true" />}</span><div><h2>{title}</h2><p>{note}</p></div><strong>{meta}</strong></section>;
}

function TrafficChart({ traffic, detail = false }: { traffic: OverviewTrafficInstrument; detail?: boolean }) {
  const points = traffic.points.length > 1 ? traffic.points : [];
  if (!points.length) return null;
  const width = 310, height = detail ? 142 : 112, left = 34, right = 4, top = 10, bottom = 18;
  const unitScale: Record<OverviewTrafficInstrument["unit"], number> = { bps: 1, Kbps: 1_000, Mbps: 1_000_000, Gbps: 1_000_000_000 };
  const scale = unitScale[traffic.unit];
  const max = Math.max(1, ...points.flatMap((point) => [point.down, point.up]));
  const displayScale = (value: number) => value / scale;
  const pathFor = (key: "down" | "up") => points.map((point, index) => `${index ? "L" : "M"}${left + index * ((width - left - right) / Math.max(1, points.length - 1))} ${top + (1 - point[key] / max) * (height - top - bottom)}`).join(" ");
  const time = (value: number) => new Date(value).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  const middle = points[Math.floor((points.length - 1) / 2)];
  return <figure className={`ref-chart ${detail ? "is-detail" : ""}`} aria-label={traffic.accessibleSummary}><div className="ref-chart__unit">{traffic.unit}</div><svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" role="img"><title>{traffic.accessibleSummary}</title><desc>{traffic.windowLabel}，{traffic.sampleCount} 个采样点；蓝线表示下载，绿线表示上传。</desc><g className="ref-chart__grid"><line x1={left} y1={top} x2={width - right} y2={top} /><line x1={left} y1={(height - bottom + top) / 2} x2={width - right} y2={(height - bottom + top) / 2} /><line x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} /></g><path className="ref-chart__down" d={pathFor("down")} /><path className="ref-chart__up" d={pathFor("up")} /></svg><div className="ref-chart__scale"><span>{displayScale(max).toFixed(displayScale(max) >= 10 ? 0 : 1)}</span><span>{displayScale(max / 2).toFixed(displayScale(max) >= 10 ? 0 : 1)}</span><span>0</span></div><div className="ref-chart__footer"><span>{time(points[0].timestamp)}</span><span>{time(middle.timestamp)}</span><span>{time(points[points.length - 1].timestamp)}</span></div><div className="ref-chart__meta"><span><i className="down" />下载　<i className="up" />上传</span><span>{traffic.windowLabel} · {traffic.sampleCount} 个采样点</span></div></figure>;
}

function Rate({ label, value, direction }: { label: string; value: MetricText; direction: "down" | "up" }) {
  return <div className="ref-rate"><span>{label}</span><div><b>{value.value}</b><small>{value.unit}</small>{direction === "down" ? <ArrowDown aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}</div></div>;
}

function WanCard({ wan, traffic, onOpen, detail = false }: { wan: WanView; traffic: OverviewTrafficInstrument | null; onOpen?: () => void; detail?: boolean }) {
  const tone: Tone = wan.online ? "ok" : wan.disabled ? "muted" : wan.observed ? "danger" : "warn";
  return <section className="ref-card ref-wan"><header><div><h2>{wan.name}</h2><span>{wan.provider}<i className="ref-dot" data-tone={tone} /></span></div><strong data-tone={tone}>{wan.online ? "在线" : wan.disabled ? "未启用" : wan.observed ? "离线" : "未核实"}　{wan.duration}</strong></header><div className="ref-rate-grid"><Rate label="下载" value={wan.down} direction="down" /><Rate label="上传" value={wan.up} direction="up" /></div><div className="ref-quality"><span>延迟　<b>{wan.latency}</b></span><span>丢包率　<b>{wan.loss}</b></span></div>{traffic ? <TrafficChart traffic={traffic} detail={detail} /> : <p className="ref-unavailable">当前没有可核实的完整速率样本</p>}{onOpen ? <button className="ref-card-link" type="button" onClick={onOpen}>查看 WAN 详情<ChevronRight size={15} aria-hidden="true" /></button> : null}</section>;
}

function Facts({ title, rows }: { title: string; rows: Array<[string, string, Tone?]> }) {
  return <section className="ref-card ref-facts"><h2>{title}</h2>{rows.map(([label, value, tone]) => <div key={`${title}-${label}`}><span>{label}</span><strong data-tone={tone || "muted"}>{value}</strong></div>)}</section>;
}

function TabletTaskBoard({ evidence, snapshot, state, onNavigate }: Pick<MobileReferenceProps, "evidence" | "snapshot" | "state" | "onNavigate">) {
  const terminalCount = rowsFromModel("terminals", buildSectionModel("terminals", snapshot)).length;
  const logCount = rowsFromModel("logs", buildSectionModel("logs", snapshot)).length;
  const routeVerified = Boolean(evidence.routeEvidence.activePath);
  const current = evidence.evidenceMode === "current";
  const bounded = evidence.evidenceMode === "historical" ? "历史待核实" : "不可核实";
  return <section className="ref-card ref-tablet-tasks" data-mobile-reference-tablet-workspace aria-label="平板巡检工作区"><h2>对象巡检</h2><div className="ref-tablet-tasks__grid"><button type="button" onClick={() => onNavigate("lineStatus")}><Network size={18} aria-hidden="true" /><span><b>网络对象</b><small>接口状态与链路质量</small></span><strong data-tone={current ? state.facts.interfaces.down > 0 ? "danger" : "ok" : "warn"}>{current ? `${state.facts.interfaces.online} / ${state.facts.interfaces.total} 运行` : bounded}</strong><ChevronRight size={16} aria-hidden="true" /></button><button type="button" onClick={() => onNavigate("routes")}><SlidersHorizontal size={18} aria-hidden="true" /><span><b>路由与链路</b><small>默认、备用与策略路径</small></span><strong data-tone={current && routeVerified ? "ok" : "warn"}>{current ? routeVerified ? "已核实" : "待确认" : bounded}</strong><ChevronRight size={16} aria-hidden="true" /></button><button type="button" onClick={() => onNavigate("terminals")}><Users size={18} aria-hidden="true" /><span><b>终端对象</b><small>在线身份与流量对象</small></span><strong data-tone={current ? undefined : "warn"}>{current ? `${terminalCount} 项` : bounded}</strong><ChevronRight size={16} aria-hidden="true" /></button><button type="button" onClick={() => onNavigate("logs")}><FileText size={18} aria-hidden="true" /><span><b>日志证据</b><small>系统与服务事件</small></span><strong data-tone={current ? undefined : "warn"}>{current ? `${logCount} 条` : bounded}</strong><ChevronRight size={16} aria-hidden="true" /></button></div></section>;
}

function ResourceSparkline({ metric, tone }: { metric: OverviewResourceMetric; tone: "warn" | "danger" }) {
  if (metric.points.length < 2) return <span className="ref-resource-spark-empty" aria-hidden="true">—</span>;
  const width = 74; const height = 20; const padding = 2;
  const path = metric.points.map((point, index) => {
    const x = padding + index * ((width - padding * 2) / Math.max(1, metric.points.length - 1));
    const y = padding + (1 - Math.max(0, Math.min(100, point.value)) / 100) * (height - padding * 2);
    return `${index ? "L" : "M"}${x} ${y}`;
  }).join(" ");
  return <svg className="ref-resource-spark" data-tone={tone} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d={path} /></svg>;
}

function ResourceList({ metrics, snapshot, onOpen }: { metrics: OverviewResourceMetric[]; snapshot: OverviewRawSnapshot; onOpen?: (id: string) => void }) {
  const order = { cpu: 0, memory: 1, disk: 2 } as const;
  const ordered = [...metrics].sort((a, b) => order[a.key] - order[b.key]);
  return <section className="ref-card ref-resources"><h2>资源使用率</h2>{ordered.map((item) => { const value = item.value; const over = value !== null && value >= item.threshold; const tone = over ? "danger" : "warn"; const delta = item.points.length > 1 ? item.points[item.points.length - 1].value - item.points[0].value : null; const trend = delta === null ? "趋势未取得" : Math.abs(delta) < 1 ? "趋势稳定" : delta > 0 ? `趋势上升 ${Math.round(delta)} 个百分点` : `趋势下降 ${Math.round(Math.abs(delta))} 个百分点`; const content = <><div><span>{item.label} 使用率</span><small>阈值 {item.threshold}%　·　{item.points.length} 个样本　·　{trend}</small></div><ResourceSparkline metric={item} tone={tone} /><b data-tone={value === null ? "muted" : tone}>{value === null ? "—" : `${value}%`}</b>{onOpen ? <ChevronRight className="ref-resource__chevron" size={16} aria-hidden="true" /> : null}<div className="ref-progress"><i style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} data-tone={tone} /></div></>; return onOpen ? <button className="ref-resource" type="button" key={item.key} onClick={() => onOpen(resourceObjectId(snapshot, item))}>{content}</button> : <div className="ref-resource" key={item.key}>{content}</div>; })}</section>;
}

function resourceObjectId(snapshot: OverviewRawSnapshot, metric: OverviewResourceMetric): string {
  const rows = rowsFromModel("trafficLoad", buildSectionModel("trafficLoad", snapshot));
  const match = rows.find((row) => row.evidence.kind === "resource" && (
    normalized(row.evidence.series) === normalized(metric.key)
    || normalized(row.primary) === normalized(metric.label)
    || normalized(row.primary).includes(normalized(metric.key))
  ));
  return match?.id || metric.label;
}

function resourceImpactRows(evidence: OverviewEvidenceModel): Array<[string, string, Tone?]> {
  const duplicates = /cpu|memory|disk|processor|资源|内存|磁盘|处理器/i;
  const rows = evidence.priorityObjectsAll
    .filter((item) => !duplicates.test(`${item.category} ${item.name}`) && item.route !== "trafficLoad" && item.route !== "loadAudit")
    .slice(0, 3)
    .map((item) => [item.name || item.category, item.state, item.tone === "danger" ? "danger" : item.tone === "warn" ? "warn" : "muted"] as [string, string, Tone]);
  return rows.length ? rows : [["转发面影响", "未测量", "muted"], ["行为控制", "未测量", "muted"], ["VPN 服务", "未测量", "muted"]];
}

function InterfaceList({ rows, onOpen, onViewAll, title = "受影响接口", ratePrefix = "" }: { rows: InterfaceView[]; onOpen: (id: string) => void; onViewAll?: () => void; title?: string; ratePrefix?: string }) {
  const visible = rows.slice(0, 7);
  return <section className="ref-card ref-interfaces"><h2>{title} <span>{rows.length} 项</span></h2>{visible.length ? visible.map((row) => <button type="button" key={row.id} onClick={() => onOpen(row.id)}><i className="ref-dot" data-tone={row.tone} /><span><b>{row.name}</b><small>{row.role}</small></span><span className="ref-interface-state"><strong data-tone={row.tone}>{row.status}</strong><small>{ratePrefix}{row.rates}</small><small>{row.quality}</small></span><ChevronRight size={16} aria-hidden="true" /></button>) : <p className="ref-empty">当前没有可核实的接口对象</p>}{rows.length > visible.length && onViewAll ? <button className="ref-card-link" type="button" data-panel-interface-overflow onClick={onViewAll}>查看全部 {rows.length} 项<ChevronRight size={15} aria-hidden="true" /></button> : null}</section>;
}

function collectionStatus(state: OverviewDerivedState, channel: "rest" | "ssh"): string {
  const value = state.facts.collection[channel];
  return value.status === "current" ? "已取得" : value.status === "unavailable" ? "不可用" : "需核对";
}

function operationalReasonLabel(value: string): string {
  const labels: Record<string, string> = {
    running: "接口正在运行",
    "administratively-disabled": "接口由配置停用，不作为运行故障",
    "enabled-default-route-not-running": "启用的默认路由依赖此接口，但接口未运行",
    "impact-not-established": "接口未运行，当前证据不足以判断业务影响",
    "state-not-observed": "当前快照未取得接口运行状态",
  };
  return labels[value] || value || "未记录";
}

function ExceptionEvidence({ scene, evidence, snapshot, state, interfaces, onNavigate, refreshing, onRefresh, onShowConnection }: { scene: Scene; evidence: OverviewEvidenceModel; snapshot: OverviewRawSnapshot; state: OverviewDerivedState; interfaces: InterfaceView[]; onNavigate: PanelNavigate; refreshing: boolean; onRefresh?: () => Promise<void>; onShowConnection?: () => void }) {
  if (scene === "outage") {
    const affected = interfaces.filter((item) => item.id.startsWith("wan:") && item.tone !== "ok");
    return <><div className="ref-outage-primary"><Facts title="影响范围" rows={[["WAN 线路", `${state.facts.wan.online} / ${state.facts.wan.total} 在线`, state.facts.wan.online > 0 ? "warn" : "danger"], ["其他接口未运行", `${state.facts.interfaces.down} 项`, state.facts.interfaces.down > 0 ? "danger" : "muted"], ["下一步核查", "打开网络查看路由与接口", "warn"]]} /><TabletTaskBoard evidence={evidence} snapshot={snapshot} state={state} onNavigate={onNavigate} /></div>{affected.length ? <InterfaceList title="受影响 WAN 线路" ratePrefix="最后观测 " rows={affected} onOpen={(id) => onNavigate("interfaces", { objectId: id, returnRoute: "overview", evidenceAt: evidence.evidenceAt })} onViewAll={() => onNavigate("interfaces")} /> : null}</>;
  }
  if (scene === "collection") {
    const businessText = state.facts.collection.businessEvidenceIncomplete || state.facts.collection.rest.status !== "current" || state.facts.collection.ssh.status !== "current"
      ? "历史快照可见，当前业务不可核实"
      : state.facts.collection.businessEvidenceText;
    return <><Facts title="采集通道" rows={[["REST 通道", collectionStatus(state, "rest"), state.facts.collection.rest.status === "current" ? "ok" : "danger"], ["SSH 通道", collectionStatus(state, "ssh"), state.facts.collection.ssh.status === "current" ? "ok" : "danger"], ["转发状态", "未测量", "muted"], ["业务数据", businessText, "warn"], ["失败记录", state.facts.collection.failedEndpointText ? "已记录，进入连接检查" : "未记录", state.facts.collection.failedEndpointText ? "danger" : "muted"]]} />{onShowConnection ? <button className="ref-inline-action" type="button" onClick={onShowConnection}>检查采集连接<ChevronRight size={16} aria-hidden="true" /></button> : null}</>;
  }
  if (scene === "unavailable") return <><Facts title="当前边界" rows={[["当前快照", "未取得", "warn"], ["业务速率", "不显示历史值", "muted"], ["下一步核查", "重新请求当前快照", "warn"]]} />{onRefresh ? <button className="ref-inline-action" type="button" aria-busy={refreshing} disabled={refreshing} onClick={onRefresh}>重新获取快照<RefreshCw className={refreshing ? "ref-spin" : undefined} size={16} aria-hidden="true" /></button> : null}<section className="ref-card ref-network-actions" data-mobile-reference-recovery-actions aria-label="可用的恢复任务">{onShowConnection ? <button type="button" onClick={onShowConnection}><span><b>检查 RouterOS 连接</b><small>地址、协议与身份验证</small></span><ChevronRight size={16} aria-hidden="true" /></button> : null}<button type="button" onClick={() => onNavigate("serviceLogs")}><span><b>服务日志</b><small>查看采集与服务事件</small></span><ChevronRight size={16} aria-hidden="true" /></button><button type="button" onClick={() => onNavigate("readonlyDiagnostics")}><span><b>只读诊断</b><small>查看当前可读取的诊断项</small></span><ChevronRight size={16} aria-hidden="true" /></button></section></>;
  if (scene === "route") {
    const current = evidence.routeEvidence.activePath;
    const last = evidence.routeEvidence.lastConfirmedActivePath;
    const dependencies = evidence.routeEvidence.interfaceDependencies.length;
    return <><Facts title="路由证据" rows={[["当前活动路径", current ? `${current.gateway} · ${current.table}` : "未核实", current ? "ok" : "warn"], ["默认目标", current?.destination || last?.destination || "未记录"], ["最近确认路径", last ? `${last.gateway} · ${last.table}` : "无", last ? "muted" : "warn"], ["接口依赖", dependencies ? `${dependencies} 项待核对` : "未发现明确依赖", dependencies ? "warn" : "muted"]]} />{dependencies ? <Facts title="接口依赖" rows={evidence.routeEvidence.interfaceDependencies.slice(0, 3).map((item) => [item.interfaceName, item.route.gateway, "warn"] as [string, string, Tone])} /> : null}<button className="ref-inline-action" type="button" onClick={() => onNavigate("routes", { returnRoute: "overview", evidenceAt: evidence.evidenceAt })}>检查路由表<ChevronRight size={16} aria-hidden="true" /></button></>;
  }
  return null;
}

function domainEvidenceFacts(row: ReturnType<typeof rowsFromModel>[number]): Array<[string, string, Tone?]> {
  const e = row.evidence;
  const rate = (value: number | null) => value === null ? "未记录" : rawRate(value).value + " " + rawRate(value).unit;
  if (e.kind === "interface") return [["运行状态", e.running === true ? "在线" : e.disabled === true ? "已停用" : "未运行"], ["默认路由关系", e.defaultRouteRelation === "direct" ? "已关联" : "未核实", e.defaultRouteRelation === "direct" ? "ok" : "warn"], ["运行原因", e.operationalReason], ["地址", e.addresses.join("、") || "未记录"], ["下载", rate(e.rxRate)], ["上传", rate(e.txRate)], ["丢包", e.lossRate === null ? "未记录" : `${e.lossRate}%`]];
  if (e.kind === "route") return [["目标", e.destination || "未记录"], ["网关", e.gateway || "未记录"], ["路由表", e.table || "未记录"], ["默认路由", e.isDefault ? "是" : "否"], ["活动状态", e.active === true ? "活动" : e.active === false ? "非活动" : "未核实"], ["接口关系", e.relatedInterface?.name || "未核实", e.interfaceRelation === "direct" ? "ok" : "warn"]];
  if (e.kind === "terminal") return [["地址", e.ip || "未记录"], ["MAC", e.mac || "未记录"], ["在线状态", e.online === true ? "在线" : e.online === false ? "离线" : "未核实"], ["接口", e.interfaceName || "未记录"], ["身份来源", e.identitySources.join(" + ") || "未记录"], ["连接数", e.connections === null ? "未记录" : String(e.connections)], ["下载", rate(e.downRate)], ["上传", rate(e.upRate)]];
  if (e.kind === "resource") return [["序列", e.series || "未记录"], ["当前值", e.latest === null ? "未记录" : `${e.latest}%`], ["阈值", e.threshold === null ? "未记录" : `${e.threshold}%`], ["阈值差", e.delta === null ? "未取得" : `${e.delta} 个百分点`], ["连续样本", e.sampleCount > 0 ? `${e.trailing} / ${e.sampleCount}` : "未取得"]];
  return [];
}

function Home({ evidence, snapshot, state, onNavigate, onRefresh, onShowConnection }: MobileReferenceProps) {
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const refreshAction = async (): Promise<void> => {
    if (!onRefresh || refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  };
  const { scene, wan, interfaces, traffic } = buildMobileReferenceModel(evidence, snapshot, state);
  const alert = scene !== "normal";
  const title = scene === "resource" ? "资源告警" : scene === "interfaces" ? "接口告警" : scene === "collection" ? "采集告警" : scene === "outage" ? "网络告警" : scene === "unavailable" ? "快照不可用" : scene === "route" ? "路由待确认" : evidence.device;
  const firstInterfaceRisk = interfaces.find((item) => item.tone === "danger");
  const hasDefaultRouteDependency = evidence.routeEvidence.interfaceDependencies.length > 0;
  const interfaceStatusNote = hasDefaultRouteDependency ? "明确依赖默认路由，优先核查" : "接口未运行；当前证据不足以判断默认路由或业务影响";
  const status = scene === "normal" ? [wan?.verifiedDefault ? "网络正常" : "默认路由待确认", wan?.verifiedDefault ? "所有系统运行正常" : "未核实活动路由与 WAN 的对应关系", timestampLabel(evidence), wan?.verifiedDefault ? "ok" : "warn"] as const : scene === "resource" ? ["设备资源紧张", "当前样本超过配置阈值", `${evidence.resource?.sampleCount ?? 0} 个样本`, "danger"] as const : scene === "interfaces" ? [firstInterfaceRisk?.name || "接口状态待核实", interfaceStatusNote, `${interfaces.filter((item) => item.tone === "danger").length} 项`, "danger"] as const : scene === "collection" ? ["当前采集不完整", "REST 与 SSH 证据需分别核对", "需确认", "warn"] as const : scene === "outage" ? ["外网出口未确认", "当前没有在线 WAN 证据", "离线", "danger"] as const : scene === "unavailable" ? ["当前快照不可用", "业务数字已撤回，不使用历史值代替", "不可判", "warn"] as const : ["默认路由待确认", "未取得明确活动路径与 WAN 关系", "待确认", "warn"] as const;
 return <main className="ref-mobile" data-mobile-reference-home data-mobile-reference-scene={scene} data-evidence-mode={evidence.evidenceMode}><Header title={title} alert={alert} refreshing={refreshing} onRefresh={onRefresh ? refreshAction : undefined} onMore={() => onNavigate("more")} /><div className="ref-scroll" data-origin-space-scroll="mobile-reference:overview:home"><div className={`ref-content ref-scene-${scene} ${scene === "normal" ? "ref-home-content" : ""}`}><Status title={status[0]} note={status[1]} meta={status[2]} tone={status[3]} />{scene === "normal" && wan ? <><WanCard wan={wan} traffic={traffic} onOpen={() => onNavigate("lineStatus", { objectId: wan.id, returnRoute: "overview", evidenceAt: evidence.evidenceAt })} /><div className="ref-home-side"><div className="ref-pair"><Facts title="路由与链路" rows={[["默认路由", wan.verifiedDefault ? wan.name : "待确认", wan.verifiedDefault ? "ok" : "warn"], ["备用链路", `${Math.max(0, uniqueWan(snapshot).length - 1)} 条`], ["策略路由", `${Math.max(0, (snapshot.routes?.defaultRoutes || []).length - 1)} 条`]]} /><Facts title="数据采集" rows={[["来源", evidence.evidenceLabel], ["最后上报", formatRfc3339LocalTime(evidence.evidenceAt) || "未记录"], ["采集通道", state.facts.collection.rest.status === "current" && state.facts.collection.ssh.status === "current" ? "REST + SSH" : "需核对", state.facts.collection.rest.status === "current" && state.facts.collection.ssh.status === "current" ? "ok" : "warn"]]} /></div>{evidence.secondaryDecisions.length ? <Facts title="当前状态" rows={evidence.secondaryDecisions.slice(0, 2).map((item) => [item.object, item.state, item.tone === "danger" ? "danger" : "muted"] as [string, string, Tone])} /> : null}</div></> : null}{scene === "resource" ? <><ResourceList metrics={evidence.resource?.metrics || []} snapshot={snapshot} onOpen={(id) => onNavigate("trafficLoad", { objectId: id, returnRoute: "overview", evidenceAt: evidence.evidenceAt })} /><Facts title="受影响对象" rows={resourceImpactRows(evidence)} /></> : null}{scene === "interfaces" ? <InterfaceList title="接口状态" rows={interfaces} onOpen={(id) => onNavigate("interfaces", { objectId: id, returnRoute: "overview", evidenceAt: evidence.evidenceAt })} onViewAll={() => onNavigate("interfaces")} /> : null}{scene !== "normal" ? <><ExceptionEvidence scene={scene} evidence={evidence} snapshot={snapshot} state={state} interfaces={interfaces} onNavigate={onNavigate} refreshing={refreshing} onRefresh={onRefresh ? refreshAction : undefined} onShowConnection={onShowConnection} /><Facts title="证据与来源" rows={[["数据来源", evidence.evidenceLabel], ["证据边界", evidenceBoundaryLabel(evidence), evidence.evidenceMode === "current" ? "ok" : "warn"], ["最后上报", formatRfc3339LocalTime(evidence.evidenceAt) || "未记录"]]} /></> : null}{scene !== "outage" ? <TabletTaskBoard evidence={evidence} snapshot={snapshot} state={state} onNavigate={onNavigate} /> : null}</div></div></main>;
}

function WanDetail({ evidence, snapshot, state, onNavigate, navigationContext }: MobileReferenceProps) {
  const wan = wanView(evidence, snapshot, navigationContext?.objectId); const traffic = wan?.verifiedDefault && evidence.evidenceMode === "current" && evidence.traffic?.status === "ready" ? evidence.traffic : null;
  const backRoute = navigationContext?.returnRoute || "overview";
  const title = wan ? (wan.provider === "运营商未记录" ? wan.name : `${wan.name} ${wan.provider}`) : "WAN 详情";
  return <main className="ref-mobile" data-mobile-reference-wan-detail><header className="ref-detailbar"><button type="button" onClick={() => onNavigate(backRoute, { objectId: null, replace: true })}><ArrowLeft size={19} aria-hidden="true" />返回</button><h1 data-panel-route-title tabIndex={-1}>{title}</h1><button type="button" aria-label="打开更多工具" onClick={() => onNavigate("more")}><Ellipsis size={20} aria-hidden="true" /></button></header><div className="ref-scroll" data-origin-space-scroll="mobile-reference:lineStatus:detail"><div className="ref-content">{wan ? <WanCard wan={wan} traffic={traffic} detail /> : <Status title="WAN 数据不可用" note="当前快照没有可核实的出口对象" meta="不可判" tone="warn" />}<Facts title="线路配置" rows={wan ? [["IPv4 地址", wan.address], ["子网掩码", wan.netmask], ["默认出口", wan.gateway], ["默认路由", wan.verifiedDefault ? "是" : "未核实", wan.verifiedDefault ? "ok" : "warn"], ["运营商", wan.provider], ["MTU", wan.mtu]] : [["配置", "未记录"]]} /><Facts title="证据与来源" rows={[["数据来源", evidence.evidenceLabel], ["证据边界", evidenceBoundaryLabel(evidence), evidence.evidenceMode === "current" ? "ok" : "warn"], ["最后上报", formatRfc3339LocalTime(evidence.evidenceAt) || "未记录"]]} /><button className="ref-operation" type="button" onClick={() => onNavigate("more")}><Ellipsis size={17} aria-hidden="true" />操作</button></div></div></main>;
}

function NetworkDirectory({ evidence, snapshot, state, onNavigate }: MobileReferenceProps) {
  const interfaces = interfaceViews(snapshot);
  const wans = interfaces.filter((item) => item.id.startsWith("wan:"));
  const active = wanView(evidence, snapshot);
  const status: readonly [string, string, string, Tone] = state.facts.wan.online > 0
    ? ["网络对象可检查", `${state.facts.wan.online} / ${state.facts.wan.total} 条 WAN 在线`, active?.verifiedDefault ? "默认路由已核实" : "默认路由待确认", active?.verifiedDefault ? "ok" : "warn"]
    : ["外网出口未确认", "当前没有在线 WAN 证据", `${state.facts.interfaces.down} 个接口未运行`, "danger"];
  return <main className="ref-mobile ref-network-directory" data-mobile-reference-network-directory><header className="ref-listbar"><button type="button" onClick={() => onNavigate("overview")}><ArrowLeft size={19} aria-hidden="true" />返回</button><h1 data-panel-route-title tabIndex={-1}>网络</h1><span>{interfaces.length}</span></header><div className="ref-scroll" data-origin-space-scroll="mobile-reference:lineStatus:list"><div className="ref-content"><Status title={status[0]} note={status[1]} meta={status[2]} tone={status[3]} /><InterfaceList title="WAN 与接口" rows={interfaces} onOpen={(id) => { const row = interfaces.find((item) => item.id === id); if (row?.id.startsWith("wan:")) onNavigate("lineStatus", { objectId: row.name, returnRoute: "lineStatus", evidenceAt: evidence.evidenceAt }); else onNavigate("interfaces", { objectId: id, returnRoute: "lineStatus", evidenceAt: evidence.evidenceAt }); }} onViewAll={() => onNavigate("interfaces")} /><section className="ref-card ref-network-actions" aria-label="网络任务"><button type="button" onClick={() => onNavigate("routes")}><span><b>路由表</b><small>默认、策略与活动路径</small></span><ChevronRight size={16} aria-hidden="true" /></button><button type="button" onClick={() => onNavigate("interfaces")}><span><b>全部接口</b><small>{state.facts.interfaces.online} / {state.facts.interfaces.total} 运行</small></span><ChevronRight size={16} aria-hidden="true" /></button><button type="button" onClick={() => onNavigate("balance")}><span><b>多线与负载</b><small>{wans.length} 条 WAN 对象</small></span><ChevronRight size={16} aria-hidden="true" /></button></section></div></div></main>;
}

function InterfaceDetail({ evidence, snapshot, state, onNavigate, navigationContext }: MobileReferenceProps) {
  const objectId = navigationContext?.objectId || "";
  const raw = rawInterfaceForObject(snapshot, objectId);
  const view = interfaceViewForObject(snapshot, objectId);
  const workspaceRow = interfaceWorkspaceRowForObject(snapshot, objectId);
  const typed = workspaceRow?.evidence.kind === "interface" ? workspaceRow.evidence : null;
  const backRoute = navigationContext?.returnRoute || "interfaces";
  if (!raw || !view) {
    return <main className="ref-mobile ref-workspace" data-mobile-reference-interface-detail="unavailable"><header className="ref-listbar"><button type="button" onClick={() => onNavigate(backRoute, { objectId: null, replace: true })}><ArrowLeft size={19} aria-hidden="true" />返回</button><h1 data-panel-route-title tabIndex={-1}>接口详情</h1><span /></header><div className="ref-scroll" data-origin-space-scroll="mobile-reference:interfaces:detail"><div className="ref-content"><Status title="接口证据不可用" note="当前快照没有与该接口标识匹配的记录" meta="不可判" tone="warn" /><button className="ref-operation" type="button" onClick={() => onNavigate(backRoute, { objectId: null, replace: true })}>返回列表</button></div></div></main>;
  }
  const rateValue = (value: number | null) => { const measured = rawRate(value); return `${measured.value}${measured.unit ? ` ${measured.unit}` : ""}`; };
  const online = view.tone === "ok";
  const routeRelated = typed?.defaultRouteRelation === "direct";
  const reason = operationalReasonLabel(typed?.operationalReason || valueOf(raw, ["operationalReason", "reason", "statusMessage"]));
  const addresses = typed?.addresses.join("、") || valueOf(raw, ["ipv4Address", "address", "ip"]) || "未记录";
  const latency = numberOf(raw, ["latency", "delay", "ping", "latencyMs"]);
  const loss = typed?.lossRate ?? numberOf(raw, ["loss", "packetLoss", "lossPercent"]);
  return <main className="ref-mobile ref-workspace" data-mobile-reference-workspace="interfaces" data-mobile-reference-object-detail={view.id} data-mobile-reference-interface-detail={view.id}><header className="ref-listbar"><button type="button" onClick={() => onNavigate(backRoute, { objectId: null, replace: true })}><ArrowLeft size={19} aria-hidden="true" />返回</button><h1 data-panel-route-title tabIndex={-1}>{view.name}</h1><span /></header><div className="ref-scroll" data-origin-space-scroll="mobile-reference:interfaces:detail"><div className="ref-content"><Status title={view.status} note={view.role} meta={online ? "可核实" : view.status} tone={view.tone} /><Facts title="接口证据" rows={[["运行状态", view.status, online ? "ok" : view.tone === "danger" ? "danger" : "muted"], ["默认路由关系", routeRelated ? "已关联" : "未核实", routeRelated ? "ok" : "warn"], ["地址", addresses], ["下载", rateValue(typed?.rxRate ?? numberOf(raw, ["rxRate", "downRate"])), "muted"], ["上传", rateValue(typed?.txRate ?? numberOf(raw, ["txRate", "upRate"])), "muted"], ["延迟", latency === null ? "—" : `${latency} ms`], ["丢包", loss === null ? "—" : `${loss}%`], ["运行说明", reason]]} /><Facts title="证据来源" rows={[["数据来源", evidence.evidenceLabel], ["证据边界", evidenceBoundaryLabel(evidence), evidence.evidenceMode === "current" ? "ok" : "warn"], ["最后上报", formatRfc3339LocalTime(evidence.evidenceAt) || "未记录"], ["采集通道", state.facts.collection.rest.status === "current" && state.facts.collection.ssh.status === "current" ? "REST + SSH" : "需核对"]]} /></div></div></main>;
}

function WorkspaceDetail({ route, row, evidence, onNavigate }: { route: Exclude<PanelRouteId, "overview" | "lineStatus" | "more">; row: ReturnType<typeof rowsFromModel>[number]; evidence: OverviewEvidenceModel; onNavigate: PanelNavigate }) {
  const facts = domainEvidenceFacts(row).length ? domainEvidenceFacts(row) : row.columns
    .map((column) => [column.label, row.values[column.key] || "—"] as [string, string])
    .filter(([, value]) => value.trim() && value !== "—")
    .slice(0, 8)
    .map(([label, value]) => [label, value, "muted"] as [string, string, Tone]);
  const evidenceType = row.evidence.kind === "interface" ? "接口" : row.evidence.kind === "route" ? "路由" : row.evidence.kind === "terminal" ? "终端" : row.evidence.kind === "resource" ? "资源" : "通用";
  return <main className="ref-mobile ref-workspace" data-mobile-reference-workspace={route} data-mobile-reference-object-detail={row.id}><header className="ref-listbar"><button type="button" onClick={() => onNavigate(route, { objectId: null, replace: true })}><ArrowLeft size={19} aria-hidden="true" />返回</button><h1 data-panel-route-title tabIndex={-1}>{row.primary}</h1><span>{row.trailing}</span></header><div className="ref-scroll" data-origin-space-scroll={`mobile-reference:${route}:detail`}><div className="ref-content">{row.evidence.kind === "route" || row.evidence.kind === "terminal" ? null : <section className="ref-card ref-detail-summary"><h2>{row.primary}</h2><p>{row.secondary}</p></section>}{row.evidence.kind === "resource" ? <ResourceEvidenceChart evidence={row.evidence} /> : null}{facts.length ? <Facts title="对象证据" rows={facts} /> : <p className="ref-unavailable">当前对象没有可核实的字段证据</p>}<Facts title="证据来源" rows={[["模块", PANEL_ROUTES[route].title], ["证据边界", evidenceBoundaryLabel(evidence), evidence.evidenceMode === "current" ? "ok" : "warn"], ["数据表", row.table], ["证据类型", evidenceType], ["重复记录", row.duplicateCount > 1 ? `${row.duplicateCount} 条` : "未发现重复"]]} /></div></div></main>;
}

function ResourceEvidenceChart({ evidence }: { evidence: Extract<ReturnType<typeof rowsFromModel>[number]["evidence"], { kind: "resource" }> }) {
  const samples = evidence.samples.map((sample) => ({ timestamp: parseRfc3339Timestamp(sample.timestamp), value: sample.value })).filter((sample): sample is { timestamp: number; value: number } => sample.timestamp !== null && Number.isFinite(sample.value));
  if (samples.length < 2) return <section className="ref-card ref-resource-detail-chart"><h2>采样趋势</h2><p className="ref-unavailable">当前只有单点或没有带时区的有效采样，未绘制时间趋势</p></section>;
  const width = 310, height = 104, left = 28, right = 6, top = 10, bottom = 20;
  const start = samples[0].timestamp, end = samples[samples.length - 1].timestamp, span = Math.max(1, end - start);
  const threshold = evidence.threshold;
  const max = Math.max(100, threshold ?? 0, ...samples.map((sample) => sample.value));
  const y = (value: number) => top + (1 - Math.max(0, Math.min(max, value)) / max) * (height - top - bottom);
  const path = samples.map((sample, index) => `${index ? "L" : "M"}${left + ((sample.timestamp - start) / span) * (width - left - right)} ${y(sample.value)}`).join(" ");
  const time = (timestamp: number) => new Date(timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  return <section className="ref-card ref-resource-detail-chart"><h2>采样趋势 <span>{samples.length} 点</span></h2><figure aria-label={`${evidence.series || "资源"} 最近 ${samples.length} 个有效采样，当前 ${evidence.latest ?? "未取得"}%，${threshold === null ? "阈值未取得" : `阈值 ${threshold}%`}`}><div className="ref-resource-detail-unit">%</div><svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" role="img"><title>{evidence.series || "资源"}采样趋势</title><desc>{threshold === null ? "横轴按带时区采样时间排列，实线为资源使用率；配置阈值未取得。" : "横轴按带时区采样时间排列，实线为资源使用率，虚线为配置阈值。"}</desc><g className="ref-chart__grid"><line x1={left} y1={top} x2={width - right} y2={top} /><line x1={left} y1={y(max / 2)} x2={width - right} y2={y(max / 2)} /><line x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} /></g>{threshold === null ? null : <line className="ref-resource-threshold" x1={left} y1={y(threshold)} x2={width - right} y2={y(threshold)} />}<path className="ref-resource-series" d={path} /></svg><div className="ref-resource-detail-scale"><span>{Math.round(max)}</span><span>{Math.round(max / 2)}</span><span>0</span></div><div className="ref-chart__footer"><span>{time(start)}</span><span>{threshold === null ? "阈值未取得" : `阈值 ${threshold}%`}</span><span>{time(end)}</span></div></figure></section>;
}

function objectRowFocusId(route: PanelRouteId, rowId: string): string {
  return `panel-object-${route}-${encodeURIComponent(rowId)}`;
}

type WorkspaceRoute = Exclude<PanelRouteId, "overview" | "lineStatus" | "more">;

function initialWorkspaceHistory(
  route: WorkspaceRoute,
  definition: ReturnType<typeof domainDefinitionFor>,
  navigationContext?: PanelNavigationContext,
): PanelWorkspaceHistoryState {
  const saved = typeof window === "undefined"
    ? null
    : panelWorkspaceStateFromHistoryState(window.history.state, route);
  const defaultFilter = definition.filters[0]?.id || "all";
  const filter = saved && definition.filters.some((option) => option.id === saved.filter)
    ? saved.filter
    : defaultFilter;
  const sort = saved && definition.sorts.some((option) => option.id === saved.sort)
    ? saved.sort
    : definition.defaultSort;
  return createPanelWorkspaceHistoryState(route, {
    search: saved ? saved.search : navigationContext?.query || "",
    filter,
    sort,
    page: saved?.page || 1,
    toolsOpen: saved?.toolsOpen || false,
    focusId: saved?.focusId || null,
    scrollY: saved?.scrollY || 0,
  });
}

function WorkspaceTools({
  definition,
  query,
  filterId,
  sortId,
  resultCount,
  totalCount,
  onQuery,
  onFilter,
  onSort,
}: {
  definition: ReturnType<typeof domainDefinitionFor>;
  query: string;
  filterId: string;
  sortId: string;
  resultCount: number;
  totalCount: number;
  onQuery: (value: string) => void;
  onFilter: (value: string) => void;
  onSort: (value: string) => void;
}) {
  return <section className="ref-card ref-workspace-tools" aria-label="对象筛选与排序">
    {definition.searchable ? <label className="ref-workspace-search"><Search size={16} aria-hidden="true" /><span className="sr-only">搜索{definition.objectLabel}</span><input type="search" value={query} placeholder={definition.searchPlaceholder} onChange={(event) => onQuery(event.target.value)} /></label> : null}
    <div className="ref-workspace-selects">
      {definition.filters.length > 1 ? <label><SlidersHorizontal size={15} aria-hidden="true" /><span className="sr-only">筛选{definition.objectLabel}</span><select value={filterId} onChange={(event) => onFilter(event.target.value)}>{definition.filters.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label> : null}
      {definition.sorts.length > 1 ? <label><ArrowDownUp size={15} aria-hidden="true" /><span className="sr-only">排序{definition.objectLabel}</span><select value={sortId} onChange={(event) => onSort(event.target.value)}>{definition.sorts.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label> : null}
      <span className="ref-workspace-count">{resultCount} / {totalCount}</span>
    </div>
  </section>;
}

function WorkspacePager({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (next: number) => void }) {
  if (pageCount <= 1) return null;
  return <nav className="ref-pagination" aria-label="对象分页"><button type="button" aria-label="上一页" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={17} aria-hidden="true" /></button><span>第 {page} / {pageCount} 页</span><button type="button" aria-label="下一页" disabled={page >= pageCount} onClick={() => onPage(page + 1)}><ChevronRight size={17} aria-hidden="true" /></button></nav>;
}

function Workspace({ route, evidence, snapshot, onNavigate, navigationContext }: { route: WorkspaceRoute; evidence: OverviewEvidenceModel; snapshot: OverviewRawSnapshot; onNavigate: PanelNavigate; navigationContext?: PanelNavigationContext }) {
  const model = useMemo(() => buildSectionModel(route, snapshot), [route, snapshot]); const definition = useMemo(() => domainDefinitionFor(route), [route]); const rows = useMemo(() => rowsFromModel(route, model), [model, route]);
  const requestedObject = navigationContext?.objectId || null;
  const initialHistory = useRef<PanelWorkspaceHistoryState | null>(null);
  const initial = initialHistory.current ?? (initialHistory.current = initialWorkspaceHistory(route, definition, navigationContext));
  const [query, setQuery] = useState(initial.search);
  const [filterId, setFilterId] = useState(initial.filter);
  const [sortId, setSortId] = useState(initial.sort);
  const [page, setPage] = useState(initial.page);
  const scrollRef = useRef<HTMLDivElement>(null);
  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    // Mobile search must explain every match with text visible in the compact
    // row. Hidden table columns can still be inspected after opening the
    // object, but must not make an apparently unrelated row appear here.
    const searched = needle ? rows.filter((row) => [row.table, row.primary, row.secondary, row.trailing].join(" ").toLowerCase().includes(needle)) : rows;
    return sortWorkspaceRows(filterWorkspaceRows(searched, definition, filterId), definition, sortId);
  }, [definition, filterId, query, rows, sortId]);
  const pageSize = 24;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const effectivePage = Math.min(page, pageCount);
  const visibleRows = filteredRows.slice((effectivePage - 1) * pageSize, effectivePage * pageSize);
  useLayoutEffect(() => {
    if (page !== effectivePage) setPage(effectivePage);
  }, [effectivePage, page]);
  useLayoutEffect(() => {
    if (requestedObject || typeof window === "undefined") return;
    const current = (window.history.state || {}) as Record<string, unknown>;
    const panelWorkspace = createPanelWorkspaceHistoryState(route, {
      search: query,
      filter: filterId,
      sort: sortId,
      page: effectivePage,
      toolsOpen: false,
      focusId: null,
      scrollY: Math.max(0, Math.trunc(scrollRef.current?.scrollTop ?? initial.scrollY)),
    });
    window.history.replaceState({ ...current, panelWorkspace }, "", window.location.href);
  }, [effectivePage, filterId, query, requestedObject, route, sortId]);
  useLayoutEffect(() => {
    if (!requestedObject && scrollRef.current) {
      scrollRef.current.scrollTop = initial.scrollY;
    }
  }, [initial.scrollY, requestedObject]);
  const selectedRow = requestedObject
    ? rows.find((row) => row.id === requestedObject) || rows.find((row) => row.primary === requestedObject.replace(/^(?:wan|if):/, "")) || null
    : null;
  if (requestedObject) {
    if (selectedRow) return <WorkspaceDetail route={route} row={selectedRow} evidence={evidence} onNavigate={onNavigate} />;
    return <main className="ref-mobile ref-workspace" data-mobile-reference-workspace={route} data-mobile-reference-object-detail="unavailable"><header className="ref-listbar"><button type="button" onClick={() => onNavigate(route, { objectId: null, replace: true })}><ArrowLeft size={19} aria-hidden="true" />返回</button><h1 data-panel-route-title tabIndex={-1}>{PANEL_ROUTES[route].title}</h1><span /></header><div className="ref-scroll" data-origin-space-scroll={`mobile-reference:${route}:detail`}><div className="ref-content"><Status title="对象证据不可用" note="当前快照没有与该对象标识匹配的记录" meta="不可判" tone="warn" /><button className="ref-operation" type="button" onClick={() => onNavigate(route, { objectId: null, replace: true })}>返回列表</button></div></div></main>;
  }
  return <main className="ref-mobile ref-workspace" data-mobile-reference-workspace={route}><header className="ref-listbar"><button type="button" onClick={() => onNavigate(PANEL_ROUTES[route].primaryDestination)}><ArrowLeft size={19} aria-hidden="true" />返回</button><h1 data-panel-route-title tabIndex={-1}>{PANEL_ROUTES[route].title}</h1><span>{filteredRows.length} / {rows.length}</span></header><div ref={scrollRef} className="ref-scroll" data-origin-space-scroll={`mobile-reference:${route}:list`} data-panel-workspace-scroll={route}><div className="ref-content"><WorkspaceTools definition={definition} query={query} filterId={filterId} sortId={sortId} resultCount={filteredRows.length} totalCount={rows.length} onQuery={(value) => { setQuery(value); setPage(1); }} onFilter={(value) => { setFilterId(value); setPage(1); }} onSort={(value) => { setSortId(value); setPage(1); }} /><section className="ref-card ref-object-list"><h2>{definition.objectLabel}</h2>{visibleRows.length ? visibleRows.map((row) => <button key={row.id} id={objectRowFocusId(route, row.id)} type="button" data-panel-object-row={row.id} onClick={() => onNavigate(route, { objectId: row.id, focusId: objectRowFocusId(route, row.id) })}><span><b>{row.primary}</b><small>{row.secondary}</small></span><strong>{row.trailing}</strong><ChevronRight size={16} aria-hidden="true" /></button>) : <p className="ref-empty">当前筛选没有可核实的对象</p>}</section><WorkspacePager page={effectivePage} pageCount={pageCount} onPage={setPage} /></div></div></main>;
}

function Directory({ onNavigate, onShowConnection }: { onNavigate: PanelNavigate; onShowConnection?: () => void }) {
  const routes: PanelRouteId[] = ["interfaces", "routes", "balance", "terminals", "dhcp", "arp", "trafficLoad", "trafficAudit", "logs", "serviceLogs", "readonlyDiagnostics"];
  return <main className="ref-mobile" data-mobile-reference-directory><header className="ref-listbar"><button type="button" onClick={() => onNavigate("overview")}><ArrowLeft size={19} aria-hidden="true" />返回</button><h1 data-panel-route-title tabIndex={-1}>更多工具</h1><span /></header><div className="ref-scroll" data-origin-space-scroll="mobile-reference:more:list"><section className="ref-card ref-object-list">{onShowConnection ? <button type="button" onClick={onShowConnection}><span><b>RouterOS 连接</b><small>设备地址、REST、SSH 与身份验证</small></span><ChevronRight size={16} aria-hidden="true" /></button> : null}{routes.map((route) => <button key={route} type="button" onClick={() => onNavigate(route)}><span><b>{PANEL_ROUTES[route].title}</b><small>{PANEL_ROUTES[route].description}</small></span><ChevronRight size={16} aria-hidden="true" /></button>)}</section></div></main>;
}

export function MobileReferenceSurface(props: MobileReferenceProps) {
  if (!props.route || props.route === "overview") return <Home {...props} />;
  if (props.route === "lineStatus") return props.navigationContext?.objectId ? <WanDetail {...props} /> : <NetworkDirectory {...props} />;
  if (props.route === "more") return <Directory onNavigate={props.onNavigate} onShowConnection={props.onShowConnection} />;
  if (props.route === "interfaces" && props.navigationContext?.objectId) return <InterfaceDetail {...props} />;
  return <Workspace key={`${props.route}:${props.navigationEntryKey ?? 0}:${props.navigationContext?.objectId ? "detail" : "list"}`} route={props.route} evidence={props.evidence} snapshot={props.snapshot} onNavigate={props.onNavigate} navigationContext={props.navigationContext} />;
}

const NAV = [
  { label: "概览", route: "overview" as PanelRouteId, Icon: Grid2X2, active: ["overview"] as PanelRouteId[] },
  { label: "网络", route: "lineStatus" as PanelRouteId, Icon: Network, active: ["lineStatus", "interfaces", "routes", "balance", "connections", "dns4", "dns6", "security", "trafficAudit"] as PanelRouteId[] },
  { label: "设备", route: "terminals" as PanelRouteId, Icon: Users, active: ["terminals", "dhcp", "arp", "trafficLoad", "loadAudit"] as PanelRouteId[] },
  { label: "日志", route: "logs" as PanelRouteId, Icon: FileText, active: ["logs", "serviceLogs", "readonlyDiagnostics", "more"] as PanelRouteId[] },
];

export function MobileReferenceNavigation({ route, onNavigate }: { route: PanelRouteId; onNavigate: PanelNavigate }) {
  return <nav className="ref-navigation" data-mobile-reference-navigation aria-label="主要导航">{NAV.map(({ label, route: target, Icon, active }) => <button key={target} type="button" data-section={target} aria-current={active.includes(route) ? "page" : undefined} onClick={() => onNavigate(target)}><Icon size={20} aria-hidden="true" /><span>{label}</span></button>)}</nav>;
}

export default MobileReferenceSurface;
