import { ChevronRight, CircleAlert, Gauge, LockKeyhole, Router, ShieldCheck } from "lucide-react";
import { useId } from "react";
import type { PanelNavigate } from "../../routes/panelRoutes";
import type { OverviewPanelProps } from "../index";
import type { OverviewTone } from "../types";
import type { OverviewEvidenceModel, OverviewTrafficInstrument } from "../evidence-model/overviewEvidenceTypes";
import type { OverviewRawRoute, OverviewRawWanRow } from "../types";
import { buildOverviewEvidenceModel } from "../evidence-model/buildOverviewEvidenceModel";

const WIDTH = 360;
const HEIGHT = 118;
const AXIS_LEFT = 48;
const AXIS_RIGHT = 12;

function toneClass(tone: OverviewTone): string {
  return `is-${tone}`;
}

function percent(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "—" : `${Math.round(value)}%`;
}

function rate(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)} Gb/s`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)} Mb/s`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(0)} Kb/s`;
  return `${Math.round(value)} b/s`;
}

function axisRate(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)} Gbps`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)} Mbps`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(0)} Kbps`;
  return `${Math.round(value)} bps`;
}

function compactCount(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(Math.round(value));
}

function knownText(values: Array<string | null | undefined>, fallback: string): string {
  const known = values.map((value) => String(value || "").trim()).filter((value) => value && value !== "-");
  return known.length ? known.join(" · ") : fallback;
}

function evidenceNote(mode: OverviewEvidenceModel["evidenceMode"]): string {
  if (mode === "historical") return "历史快照";
  if (mode === "unavailable") return "未取得当前快照";
  return "当前快照";
}

function sampleInterval(points: Array<{ timestamp: number }>): string {
  if (points.length < 2) return "单点";
  const deltas = points.slice(1).map((point, index) => Math.max(0, point.timestamp - points[index].timestamp)).filter(Boolean);
  if (!deltas.length) return "间隔未记录";
  const seconds = Math.round(deltas.reduce((sum, value) => sum + value, 0) / deltas.length / 1000);
  if (seconds >= 60) return `约 ${Math.round(seconds / 60)} 分钟/点`;
  return `约 ${seconds} 秒/点`;
}

function routeStatusClass(model: OverviewEvidenceModel, state: OverviewPanelProps["state"]): "verified" | "unknown" | "offline" | "unavailable" {
  if (model.evidenceMode === "unavailable") return "unavailable";
  if (model.evidenceMode !== "current") return "unknown";
  if (state.facts.route.verified) return "verified";
  if (state.facts.wan.allOffline) return "offline";
  return "unknown";
}

function normalized(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function routeMatchesWan(route: OverviewRawRoute | null, wan: OverviewRawWanRow): boolean {
  if (!route) return false;
  const routeValues = [route.gateway, route.gatewayStatus, route.interface, route.outInterface, route.pppoeOut, route.interfaceName]
    .map(normalized)
    .filter(Boolean);
  const wanValues = [wan.name, wan.interface, wan.parent, wan.pppoeOut]
    .map(normalized)
    .filter(Boolean);
  return routeValues.some((routeValue) => wanValues.some((wanValue) => routeValue === wanValue || routeValue.includes(wanValue) || wanValue.includes(routeValue)));
}

function resourceColor(key: "cpu" | "memory" | "disk", value: number | null, threshold: number): string {
  if (value !== null && Number.isFinite(value) && value >= threshold) return "#c93642";
  return key === "cpu" ? "#2463ed" : key === "memory" ? "#10b981" : "#f59e0b";
}

function pathFor(points: Array<{ timestamp: number; up: number; down: number }>, key: "up" | "down", max: number): string {
  if (!points.length) return "";
  const start = points[0]?.timestamp || 0;
  const end = points[points.length - 1]?.timestamp || start + 1;
  const span = Math.max(1, end - start);
  return points.map((point, index) => {
    const value = key === "up" ? point.up : point.down;
    const x = AXIS_LEFT + ((point.timestamp - start) / span) * (WIDTH - AXIS_LEFT - AXIS_RIGHT);
    const y = HEIGHT - 12 - Math.min(1, Math.max(0, value / Math.max(max, 1))) * (HEIGHT - 24);
    return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

function TrafficChart({ traffic, direction, label, color }: { traffic: OverviewTrafficInstrument; direction: "up" | "down"; label: string; color: string }) {
  const values = traffic.points.map((point) => direction === "up" ? point.up : point.down);
  const max = Math.max(...values, 1);
  const instanceId = useId().replace(/:/g, "");
  const titleId = `legacy-chart-${direction}-${instanceId}-title`;
  const descId = `legacy-chart-${direction}-${instanceId}-desc`;
  const peakLabel = axisRate(max);
  return (
    <div className="legacy-chart" data-chart-direction={direction}>
      <div className="legacy-chart-head">
        <span><i style={{ background: color }} />{label}</span>
        <b>{direction === "up" ? traffic.currentUp : traffic.currentDown}</b>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby={`${titleId} ${descId}`} preserveAspectRatio="xMidYMid meet" data-unit={traffic.unit} data-axis-left={AXIS_LEFT} data-axis-label-gap="12">
        <title id={titleId}>{label}，{direction === "up" ? traffic.currentUp : traffic.currentDown}</title>
        <desc id={descId}>{traffic.accessibleSummary}；单位 {traffic.unit}</desc>
        <text className="legacy-axis-label" data-chart-peak-label x="4" y="25">{peakLabel}</text>
        <text className="legacy-axis-label" x="4" y={HEIGHT - 9}>0</text>
        <path className="legacy-grid-line" d={`M${AXIS_LEFT} 22H${WIDTH - AXIS_RIGHT} M${AXIS_LEFT} ${HEIGHT / 2}H${WIDTH - AXIS_RIGHT} M${AXIS_LEFT} ${HEIGHT - 12}H${WIDTH - AXIS_RIGHT}`} />
        <path className={`legacy-series legacy-series-${direction}`} d={pathFor(traffic.points, direction, max)} style={{ stroke: color }} />
      </svg>
      <div className="legacy-chart-axis"><span>{traffic.windowLabel}</span><span>{traffic.sampleCount} 点 · {sampleInterval(traffic.points)} · 独立标尺</span></div>
    </div>
  );
}

function ResourceChart({ label, value, threshold, color, points }: { label: string; value: number | null; threshold: number; color: string; points: Array<{ timestamp: number; value: number }> }) {
  const max = Math.max(100, threshold, ...points.map((point) => point.value));
  const start = points[0]?.timestamp || 0;
  const end = points[points.length - 1]?.timestamp || start + 1;
  const span = Math.max(1, end - start);
  const d = points.map((point, index) => {
    const x = 10 + ((point.timestamp - start) / span) * 164;
    const y = 86 - Math.min(1, Math.max(0, point.value / max)) * 72;
    return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  const currentY = value === null ? null : 86 - Math.min(1, Math.max(0, value / max)) * 72;
  return (
    <div className={`legacy-resource-card ${value !== null && value >= threshold ? "is-over-threshold" : ""}`} data-resource-state={value !== null && value >= threshold ? "over-threshold" : value === null ? "unavailable" : "within-threshold"}>
      <div className="legacy-resource-head"><span><i style={{ background: color }} />{label}</span><b>{percent(value)}</b></div>
      <div className="legacy-resource-meter">{value !== null ? <span style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} /> : null}<em style={{ left: `${threshold}%` }} /></div>
      <svg viewBox="0 0 184 96" role="img" aria-label={`${label} ${percent(value)}，阈值 ${threshold}%`} preserveAspectRatio="xMidYMid meet">
        <path className="legacy-grid-line" d="M10 14H174 M10 50H174 M10 86H174" />
        {d ? <path className="legacy-series" d={d} style={{ stroke: color }} /> : currentY !== null ? <path className="legacy-current-reference" d={`M10 ${currentY.toFixed(1)}H174`} style={{ stroke: color }} /> : null}
      </svg>
      <small>阈值 {threshold}% · {points.length ? `${points.length} 点` : "当前单点"}</small>
    </div>
  );
}

function WanRateCard({ label, value, color, note }: { label: string; value: string; color: string; note: string }) {
  return <div className="legacy-wan-rate-card">
    <div><span><i style={{ background: color }} />{label}</span><b>{value}</b></div>
    <small>{note}</small>
  </div>;
}

function SummaryTile({ label, value, note, tone = "ok" }: { label: string; value: string; note: string; tone?: OverviewTone }) {
  return <div className={`legacy-summary-tile ${toneClass(tone)}`}><span>{label}</span><b>{value}</b><small>{note}</small></div>;
}

function LegacyVerdict({ model }: { model: OverviewEvidenceModel }) {
  const Icon = model.verdictTone === "ok" || model.verdictTone === "trust" ? ShieldCheck : CircleAlert;
  return <div className={`legacy-verdict ${toneClass(model.verdictTone)}`} data-desktop-incident-verdict><Icon aria-hidden="true" size={22} /><div><span>{model.evidenceLabel} · {model.evidenceTime}</span><b>{model.verdictTitle}</b><small>{model.verdictSummary}</small></div></div>;
}

function CompactRow({ category, name, state, evidence, tone, onClick }: { category: string; name: string; state: string; evidence: string; tone: OverviewTone; onClick?: () => void }) {
  const nameContent = onClick
    ? <button type="button" onClick={onClick}><b>{name}</b><ChevronRight aria-hidden="true" size={15} /></button>
    : <span className="legacy-object-row-static"><b>{name}</b></span>;
  return <div className={`legacy-object-row ${toneClass(tone)}`}>
    <span className="legacy-object-category">{category}</span>
    {nameContent}
    <span className="legacy-object-state"><i aria-hidden="true" />{state}</span>
    <small>{evidence}</small>
  </div>;
}

export interface LegacyDesktopOverviewProps extends OverviewPanelProps {
  onNavigate: PanelNavigate;
  runtimeManaged?: boolean;
}

export function LegacyDesktopOverview({ snapshot, state, onNavigate, runtimeManaged = false }: LegacyDesktopOverviewProps) {
  const model = buildOverviewEvidenceModel(snapshot, state);
  const device = state.facts.device;
  const traffic = model.traffic;
  const resource = model.resource;
  const pppoeRows = snapshot.pppoe || [];
  const wans = [...(pppoeRows.length ? pppoeRows : snapshot.wan || [])];
  const selectedRoute = model.evidenceMode === "current" && state.facts.route.verified ? state.facts.route.selected : null;
  const routeWan = wans.find((row) => routeMatchesWan(selectedRoute, row)) || null;
  const activeWan = routeWan || wans.find((row) => row.running && !row.disabled) || null;
  const activeWanIsDefault = Boolean(routeWan);
  const focus = model.focusObject;
  const risk = model.risk !== "none";
  const cpu = state.facts.resource.cpu;
  const memory = state.facts.resource.memory;
  const disk = state.facts.resource.disk;
  const modeNote = evidenceNote(model.evidenceMode);
  const routeStatus = routeStatusClass(model, state);
  const routeText = model.evidenceMode === "historical"
    ? "历史默认路由"
    : model.evidenceMode === "current" && state.facts.route.verified
      ? `${state.facts.route.label}`
      : "默认路由未核实";
  const routeLabel = activeWanIsDefault && model.evidenceMode === "current" ? "默认出口" : "当前运行线路";
  const wanObserved = model.evidenceMode !== "unavailable" && state.facts.wan.available;
  const onlineWanText = wanObserved ? `${state.facts.wan.online} / ${state.facts.wan.total}` : "— / —";
  const onlineWanLabel = wanObserved ? `${onlineWanText} 在线` : "未取得";
  const terminalCount = model.evidenceMode === "unavailable" || !Array.isArray(snapshot.terminals) ? null : snapshot.terminals.length;
  const resourceMetrics = (resource?.metrics || [
    { key: "cpu" as const, label: "CPU 负载", value: cpu, threshold: 85, points: [] },
    { key: "memory" as const, label: "内存使用率", value: memory, threshold: 85, points: [] },
    { key: "disk" as const, label: "磁盘使用率", value: disk, threshold: 90, points: [] },
  ]).slice().sort((left, right) => ["cpu", "memory", "disk"].indexOf(left.key) - ["cpu", "memory", "disk"].indexOf(right.key));
  const selectedRouteTable = selectedRoute?.table || selectedRoute?.routingTable || (model.evidenceMode === "historical" ? "历史记录不可用" : "未核实");
  const selectedRouteGateway = selectedRoute?.gateway || selectedRoute?.gatewayStatus || (model.evidenceMode === "historical" ? "历史记录不可用" : "未核实");
  const fallbackObjects = [
    ...wans.slice(0, 4).map((row, index) => ({ category: "WAN", name: row.name || row.interface || `WAN ${index + 1}`, state: row.running ? "运行" : "未运行", evidence: `下 ${rate(row.downRate ?? null)} · 上 ${rate(row.upRate ?? null)}`, tone: row.running ? "trust" as const : "danger" as const, route: "interfaces" as const, target: row.name || row.interface })),
    ...(snapshot.interfaces || []).slice(0, 4).map((row, index) => ({ category: row.role || "接口", name: row.name || row.interface || `接口 ${index + 1}`, state: row.running ? "运行" : row.disabled ? "已停用" : "未运行", evidence: `收 ${rate(row.rxRate ?? row.downRate ?? null)} · 发 ${rate(row.txRate ?? row.upRate ?? null)}`, tone: row.running ? "ok" as const : row.disabled ? "missing" as const : "warn" as const, route: "interfaces" as const, target: row.name || row.interface })),
  ].filter((row, index, rows) => {
    const identity = row.name.trim().toLowerCase();
    return rows.findIndex((candidate) => candidate.name.trim().toLowerCase() === identity) === index;
  });
  const riskRows = [
    ...model.riskQueue.map((item) => ({ category: "告警", name: item.label, state: item.value, evidence: item.note, tone: item.tone, route: item.route, target: item.targetObjectId })),
    ...model.priorityObjects.map((item) => ({ category: item.category, name: item.name, state: item.state, evidence: item.reason, tone: item.tone, route: item.route, target: item.targetObjectId })),
  ].filter((row, index, rows) => rows.findIndex((candidate) => `${candidate.category}:${candidate.name}` === `${row.category}:${row.name}`) === index).slice(0, 6);
  const objectRows = risk
    ? riskRows
    : model.comparisonObjects.length
      ? model.comparisonObjects.slice(0, 6).map((item) => ({ category: item.category, name: item.object, state: item.state, evidence: item.evidence, tone: item.tone, route: item.route, target: item.targetObjectId }))
      : fallbackObjects;

  return <main className={`legacy-desktop-shell ${risk ? "has-risk" : "is-normal"} ${toneClass(model.verdictTone)}`} data-desktop-overview data-visual-grammar="ikuai-4-ipad" data-desktop-overview-scenario={model.scenario} data-desktop-overview-risk={model.risk} data-desktop-evidence-mode={model.evidenceMode} data-overview-task-contract="legacy-desktop-task-v1" data-desktop-information-efficiency="legacy-ipad-v1">
    {!runtimeManaged ? <div className="legacy-fixture-bar" data-desktop-fixture-toolbar><span><Router aria-hidden="true" size={17} /><b>{device.routerHost}</b><small>{device.identity}</small></span><span><LockKeyhole aria-hidden="true" size={14} />只读运维监控</span></div> : null}
    <header className="legacy-page-header">
      <div><span className="legacy-kicker">ROUTEROS / 只读监控</span><h1 tabIndex={-1} data-panel-route-title>系统首页</h1></div>
      <div className="legacy-header-note">WAN、终端、连接与资源集中展示</div>
    </header>
    <LegacyVerdict model={model} />
    <section className="legacy-summary-strip" aria-label="设备摘要" data-desktop-status-bus>
      <SummaryTile label="设备" value={device.identity} note={knownText([device.boardName, device.architecture], modeNote)} />
      <SummaryTile label="RouterOS" value={device.version === "-" ? "—" : device.version} note={device.routerHost === "-" ? "未记录目标" : device.routerHost} />
      <SummaryTile label="运行时间" value={device.uptime === "-" ? "—" : device.uptime} note={device.systemTime === "-" ? modeNote : device.systemTime} />
      <SummaryTile label="在线宽带" value={onlineWanText} note={activeWan?.name || modeNote} tone={model.evidenceMode === "unavailable" ? "missing" : state.facts.wan.online ? "trust" : "danger"} />
      <SummaryTile label="在线终端" value={terminalCount === null ? "—" : String(terminalCount)} note={modeNote} />
      <SummaryTile label="连接数" value={compactCount(model.evidenceMode === "unavailable" ? null : state.facts.connections.total)} note={model.evidenceMode === "unavailable" ? modeNote : `${state.facts.connections.active} 活跃会话 · ${modeNote}`} />
      <SummaryTile label="CPU" value={percent(cpu)} note={modeNote} tone={cpu !== null && cpu >= 85 ? "danger" : model.evidenceMode === "unavailable" ? "missing" : "ok"} />
      <SummaryTile label="内存 / 磁盘" value={`${percent(memory)} / ${percent(disk)}`} note={resource?.windowLabel || modeNote} tone={memory !== null && memory >= 85 || disk !== null && disk >= 90 ? "danger" : model.evidenceMode === "unavailable" ? "missing" : "ok"} />
    </section>
    <div className="legacy-main-grid">
      <section className="legacy-wan-column" aria-labelledby="legacy-wan-title" data-desktop-wan-evidence>
        <div className="legacy-section-heading"><h2 id="legacy-wan-title">WAN 信息</h2><span>只读展示</span></div>
        <div className="legacy-wan-lead">
          <div className="legacy-wan-lead-head"><div><b>线路聚合状态</b><small>{activeWan?.name || modeNote}</small></div><span className="legacy-pill">{onlineWanLabel}</span></div>
          <strong>{onlineWanText}</strong>
          <small>{activeWan?.name || routeText} · {traffic?.currentDown || "—"}</small>
          <div className={`legacy-route-chip is-${routeStatus}`}><span><i />{routeLabel}</span><b>{routeText}</b></div>
        </div>
        <div className="legacy-fact-grid">
          <div><span>WAN IP</span><b>{String(activeWan?.address ?? activeWan?.ip ?? "-")}</b></div>
          <div><span>接入方式</span><b>{activeWan?.access || activeWan?.kind || "-"}</b></div>
          <div><span>运行时间</span><b>{device.uptime === "-" ? "—" : device.uptime}</b></div>
          <div><span>累计上行流量</span><b>{String((activeWan as Record<string, unknown> | undefined)?.totalUp || "-")}</b></div>
          <div><span>累计下行流量</span><b>{String((activeWan as Record<string, unknown> | undefined)?.totalDown || "-")}</b></div>
          <div><span>默认路由表</span><b>{selectedRouteTable}</b></div>
          <div><span>默认网关</span><b>{selectedRouteGateway}</b></div>
          <div><span>采集通道</span><b className={`legacy-status-text ${toneClass(state.facts.collection.level)}`}>{state.facts.collection.channelText}</b></div>
        </div>
        {activeWan || model.evidenceMode !== "unavailable" ? <div className="legacy-wan-rate-summary">
          <WanRateCard label="当前上行" value={rate(activeWan?.upRate ?? null)} color="#2463ed" note={`${routeLabel} · ${modeNote}`} />
          <WanRateCard label="当前下行" value={rate(activeWan?.downRate ?? null)} color="#10b981" note={`${state.facts.wan.label} · ${modeNote}`} />
        </div> : <div className="legacy-empty-chart"><Gauge aria-hidden="true" size={20} /><b>暂无可信 WAN 趋势</b><small>{model.evidenceNote}</small></div>}
      </section>
      <section className="legacy-right-column" aria-label="实时监控">
        <div className="legacy-section-heading"><h2>实时速率趋势</h2><span>{traffic?.windowLabel || "最新采样窗口"}</span></div>
        {traffic ? <div className="legacy-trend-grid"><TrafficChart traffic={traffic} direction="up" label="实时上行速率" color="#2463ed" /><TrafficChart traffic={traffic} direction="down" label="实时下行速率" color="#10b981" /></div> : <div className="legacy-empty-chart is-wide"><Gauge aria-hidden="true" size={24} /><div><b>WAN 趋势证据未形成</b><small>当前值、历史尾点或采样时间窗不一致，因此不绘制看似实时的曲线。</small></div><button type="button" onClick={() => onNavigate("trafficAudit")}>查看流量证据</button></div>}
        <div className="legacy-section-heading legacy-resource-heading"><h2>系统负载</h2><span>CPU / 内存 / 磁盘分图</span></div>
        <div className="legacy-resource-grid" data-desktop-resource-evidence>{resourceMetrics.map((metric) => <ResourceChart key={metric.key} label={metric.label} value={metric.value} threshold={metric.threshold} points={metric.points} color={resourceColor(metric.key, metric.value, metric.threshold)} />)}</div>
        {risk ? <>
          <div className="legacy-section-heading legacy-object-heading"><h2>运行对象</h2><span>{objectRows.length} 项</span></div>
          <div className="legacy-object-list" data-desktop-object-list>
            {objectRows.map((row) => <CompactRow key={`${row.category}-${row.name}`} category={row.category} name={row.name} state={row.state} evidence={row.evidence} tone={row.tone} onClick={() => onNavigate(row.route, row.target ? { objectId: row.target, returnRoute: "overview", evidenceAt: model.evidenceAt } : undefined)} />)}
            {!objectRows.length ? <div className="legacy-object-empty">当前没有可列出的对象</div> : null}
          </div>
          {focus ? <button className="legacy-focus-link" type="button" onClick={() => onNavigate(focus.route, focus.targetObjectId ? { objectId: focus.targetObjectId, returnRoute: "overview", evidenceAt: model.evidenceAt } : undefined)}>打开重点对象：{focus.name}<ChevronRight aria-hidden="true" size={16} /></button> : null}
        </> : <>
          <div className="legacy-section-heading legacy-object-heading"><h2>宽带状态摘要</h2><span>真实 PPPoE 与连接状态</span></div>
          <div className="legacy-bandwidth-summary" data-desktop-bandwidth-summary>
            <SummaryTile label="在线宽带" value={onlineWanText} note={modeNote} tone={model.evidenceMode === "unavailable" ? "missing" : state.facts.wan.online ? "trust" : "danger"} />
            <SummaryTile label="最近线路" value={activeWan?.name || "—"} note={routeText} tone={routeStatus === "verified" ? "trust" : routeStatus === "unavailable" ? "missing" : "warn"} />
            <SummaryTile label="总上行" value={traffic?.currentUp || "—"} note={traffic?.windowLabel || modeNote} />
            <SummaryTile label="总下行" value={traffic?.currentDown || "—"} note={traffic?.windowLabel || modeNote} />
            <SummaryTile label="累计上行" value={String((activeWan as Record<string, unknown> | undefined)?.totalUp || "—")} note="接口计数器" />
            <SummaryTile label="累计下行" value={String((activeWan as Record<string, unknown> | undefined)?.totalDown || "—")} note="接口计数器" />
            <SummaryTile label="连接数" value={compactCount(model.evidenceMode === "unavailable" ? null : state.facts.connections.total)} note={modeNote} />
            <SummaryTile label="活跃会话" value={model.evidenceMode === "unavailable" ? "—" : String(state.facts.connections.active)} note={modeNote} />
          </div>
        </>}
      </section>
    </div>
  </main>;
}
