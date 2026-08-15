import { Cable, ChevronRight, Cpu, DatabaseZap, Ellipsis, FileWarning, Gauge, RefreshCw, Route, Router, ShieldCheck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { OverviewEvidenceModel, OverviewTrafficInstrument } from "../../overview/evidence-model/overviewEvidenceTypes";
import type { PanelNavigate } from "../../routes/panelRoutes";
import { buildMobileFlowModel, type MobileFlowDestination, type MobileFlowModel, type MobileFlowObject, type MobileFlowTone } from "./mobileFlowModel";
import "../styles/flow-overview.css";

export interface MobileFlowOverviewProps { evidence: OverviewEvidenceModel; onNavigate: PanelNavigate; onRefresh?: () => void; }
function go(onNavigate: PanelNavigate, destination: MobileFlowDestination) { onNavigate(destination.route, destination.options); }
function stripUnit(value: string, unit: string) { return value.replace(new RegExp(`\\s*${unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i"), "").trim(); }

function TopBar({ device, onNavigate, onRefresh }: { device: string; onNavigate: PanelNavigate; onRefresh?: () => void }) {
  return <header className="mflow-topbar"><span><small>{device}</small><h1 data-panel-route-title tabIndex={-1}>概览</h1></span><nav aria-label="概览工具">{onRefresh ? <button type="button" onClick={onRefresh} aria-label="刷新快照"><RefreshCw size={18} /></button> : null}<button type="button" onClick={() => onNavigate("more")} aria-label="更多模块"><Ellipsis size={20} /></button></nav></header>;
}

function EvidenceRail({ model }: { model: MobileFlowModel }) {
  const tone: MobileFlowTone = model.evidenceMode === "current" ? "verified" : model.evidenceMode === "historical" ? "warning" : "critical";
  return <div className="mflow-evidence" data-tone={tone}><span><i />{model.evidenceLabel}</span><time>{model.evidenceTime}</time></div>;
}

function StatusBand({ model }: { model: MobileFlowModel }) {
  return <section className="mflow-status" data-tone={model.tone} aria-label="当前结论"><i /><div><h2>{model.verdict}</h2><p>{model.verdictNote}</p></div></section>;
}

function FlowChart({ traffic }: { traffic: OverviewTrafficInstrument }) {
  const width = 240, height = 62, top = 6, bottom = 15;
  const max = Math.max(1, ...traffic.points.flatMap((point) => [point.down, point.up]));
  const path = (key: "down" | "up") => traffic.points.map((point, index) => `${index ? "L" : "M"}${(index / Math.max(1, traffic.points.length - 1) * width).toFixed(1)},${(top + (1 - point[key] / max) * (height - top - bottom)).toFixed(1)}`).join(" ");
  const last = traffic.points[traffic.points.length - 1];
  const windowLabel = /^最近/.test(traffic.windowLabel) ? traffic.windowLabel : `最近 ${traffic.windowLabel}`;
  return <figure className="mflow-chart" aria-label={traffic.accessibleSummary}><figcaption><span>{windowLabel}</span><b>峰值 {traffic.peak}</b></figcaption><svg viewBox={`0 0 ${width} ${height}`} role="img" preserveAspectRatio="xMidYMid meet"><line x1="0" x2={width} y1={height - bottom} y2={height - bottom} /><path className="mflow-chart__down" d={path("down")} /><path className="mflow-chart__up" d={path("up")} /></svg><div><span>{traffic.points[0] ? new Date(traffic.points[0].timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—"}</span><span><i />下载 <i />上传</span><span>{last ? new Date(last.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—"}</span></div></figure>;
}

function NormalInstrument({ model, onNavigate }: { model: MobileFlowModel; onNavigate: PanelNavigate }) {
  return <section className="mflow-instrument mflow-route" aria-label="默认路径与当前流量"><button type="button" className="mflow-route__identity" onClick={() => onNavigate("routes", { returnRoute: "overview", evidenceAt: model.evidenceAt })}><span><small>默认路径</small><b>{model.route ? `${model.route.destination} · ${model.route.table}` : "当前路径未核实"}</b><em>{model.route?.gateway || "没有活动路径证据"}</em></span><strong data-tone={model.route ? "verified" : "warning"}>{model.route ? "已核验" : "待核实"}</strong><ChevronRight size={15} /></button>{model.traffic ? <button type="button" className="mflow-route__traffic" onClick={() => onNavigate("lineStatus", { returnRoute: "overview", evidenceAt: model.evidenceAt })}><div className="mflow-rates"><span><small>下载</small><b>{stripUnit(model.traffic.currentDown, model.traffic.unit)}</b><em>{model.traffic.unit}</em></span><span><small>上传</small><b>{stripUnit(model.traffic.currentUp, model.traffic.unit)}</b><em>{model.traffic.unit}</em></span></div><FlowChart traffic={model.traffic} /></button> : <button type="button" className="mflow-empty-rate" onClick={() => onNavigate("lineStatus")}><Gauge size={19} /><span><b>当前速率未观测</b><small>没有完整的当前原子采样</small></span><ChevronRight size={15} /></button>}</section>;
}

function ResourceInstrument({ model, onNavigate }: { model: MobileFlowModel; onNavigate: PanelNavigate }) {
  const lead = model.resources[0];
  return <section className="mflow-instrument mflow-resource"><header><span>资源压力</span><b>当前 / 阈值</b></header><div>{model.resources.slice(0, 3).map((row) => <button type="button" key={row.key} onClick={() => go(onNavigate, row.destination)}><span>{row.label}</span><b>{row.value}<em>/ {row.threshold}</em></b><i><u style={{ width: `${Math.min(100, row.value)}%` }} /></i><ChevronRight size={14} /></button>)}</div>{lead ? <footer><span>{lead.label} 末尾连续 {lead.trailing}/{lead.total} 个样本越界</span><b>转发面影响：未测量</b></footer> : <footer><span>等待完整资源样本</span><b>当前不可比较</b></footer>}</section>;
}

function InterfaceInstrument({ model, onNavigate }: { model: MobileFlowModel; onNavigate: PanelNavigate }) {
  const lead = model.objects[0];
  return <section className="mflow-instrument mflow-chain"><header><span>受影响路径</span><b>{model.impactPath ? `${model.impactPath.destination} · ${model.impactPath.table}` : "默认路由待核实"}</b></header><ol><li><Route size={18} /><span><small>默认出口</small><b>{model.impactPath?.gateway || "活动路径未核实"}</b></span></li><li data-tone="critical"><Cable size={18} /><span><small>第一责任接口</small><b>{lead?.name || "接口对象未记录"}</b></span><strong>{lead?.state || "待核对"}</strong></li><li><Router size={18} /><span><small>关联对象</small><b>{Math.max(0, model.objects.length - 1)} 项待核对</b></span><button type="button" onClick={() => lead && go(onNavigate, lead.destination)} aria-label="打开责任接口"><ChevronRight size={16} /></button></li></ol></section>;
}

function CollectionInstrument({ model, onNavigate }: { model: MobileFlowModel; onNavigate: PanelNavigate }) {
  return <section className="mflow-instrument mflow-channels"><header><span>采集通道</span><b>两通道独立</b></header>{model.objects.slice(0, 2).map((row) => <button type="button" key={row.id} onClick={() => go(onNavigate, row.destination)} data-tone={row.tone}><DatabaseZap size={18} /><span><small>{row.label}</small><b>{row.name}</b></span><strong>{row.state}</strong><ChevronRight size={15} /></button>)}<p>管理面采集失败不能自动推断转发面或业务面中断。</p></section>;
}

function UnavailableInstrument({ model, onNavigate }: { model: MobileFlowModel; onNavigate: PanelNavigate }) {
  return <section className="mflow-instrument mflow-withdrawn"><div><FileWarning size={21} /><span><small>当前业务数字</small><b>已全部撤回</b></span></div><ul><li>实时上下行速率</li><li>接口运行结论</li><li>资源压力判断</li></ul><button type="button" onClick={() => onNavigate("readonlyDiagnostics", { returnRoute: "overview", evidenceAt: model.evidenceAt })}>核对采集来源<ChevronRight size={16} /></button></section>;
}

function WanInstrument({ model, onNavigate }: { model: MobileFlowModel; onNavigate: PanelNavigate }) {
  const lead = model.objects[0];
  return <section className="mflow-instrument mflow-wan"><header><span>默认出口对象</span><b>当前路径证据</b></header><button type="button" onClick={() => lead && go(onNavigate, lead.destination)}><Router size={20} /><span><small>{lead?.label || "WAN"}</small><b>{lead?.name || "未记录对象"}</b><em>{lead?.note || "没有活动路径证据"}</em></span><strong>{lead?.state || "待核实"}</strong><ChevronRight size={15} /></button></section>;
}

function FleetInstrument({ model, onNavigate }: { model: MobileFlowModel; onNavigate: PanelNavigate }) {
  const counts = model.objects.reduce((acc, item) => { acc[item.tone] += 1; return acc; }, { verified: 0, warning: 0, critical: 0, neutral: 0 });
  const lead = model.objects.find((item) => item.tone === "critical" || item.tone === "warning") || model.objects[0];
  return <section className="mflow-instrument mflow-fleet"><header><span>最高优先级</span><b>范围是属性，不盖过风险</b></header>{lead ? <button type="button" onClick={() => go(onNavigate, lead.destination)}><Users size={19} /><span><small>{lead.label}</small><b>{lead.name}</b><em>{lead.note}</em></span><strong data-tone={lead.tone}>{lead.state}</strong><ChevronRight size={15} /></button> : null}<dl><div><dt>异常</dt><dd>{counts.critical}</dd></div><div><dt>待确认</dt><dd>{counts.warning + counts.neutral}</dd></div><div><dt>已核验</dt><dd>{counts.verified}</dd></div></dl></section>;
}

const ICONS = { wan: Router, interface: Cable, resource: Cpu, collection: DatabaseZap, terminal: Users, route: Route, generic: ShieldCheck } as const;
function ObjectStream({ model, onNavigate, tablet }: { model: MobileFlowModel; onNavigate: PanelNavigate; tablet: boolean }) {
  const rows = model.streamObjects;
  if (!rows.length) return null;
  const selected = rows[0];
  const nextStep = model.scene === "collection" || model.scene === "resource";
  const nextStepLabel = model.scene === "collection" ? "来源核对" : "样本审计";
  return <section className="mflow-stream"><header><h2>{model.scene === "normal" ? "继续巡检" : nextStep ? "下一步" : "关联对象"}</h2><span>{nextStep ? nextStepLabel : "风险优先"}</span></header><ol>{rows.map((row: MobileFlowObject) => { const Icon = ICONS[row.kind]; return <li key={row.id}><button type="button" data-selected={tablet && row.id === selected.id || undefined} onClick={() => go(onNavigate, row.destination)}><Icon size={18} /><span><b>{row.name}</b><small>{row.label} · {row.note}</small></span><strong data-tone={row.tone}>{row.state}</strong><ChevronRight size={15} /></button></li>; })}</ol>{tablet ? <div className="mflow-stream__selection"><small>{nextStep ? "核对入口" : "当前对象"}</small><h3>{selected.name}</h3><p>{selected.note}</p><dl><div><dt>状态</dt><dd data-tone={selected.tone}>{selected.state}</dd></div><div><dt>证据</dt><dd>{model.evidenceLabel}</dd></div><div><dt>时间</dt><dd>{model.evidenceTime}</dd></div></dl><button type="button" onClick={() => go(onNavigate, selected.destination)}>打开对象证据<ChevronRight size={16} /></button></div> : null}</section>;
}

function useTabletWorkArea(): boolean {
  const query = "(min-width: 600px) and (min-height: 600px)";
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => { const media = window.matchMedia(query); const update = () => setMatches(media.matches); update(); media.addEventListener("change", update); return () => media.removeEventListener("change", update); }, []);
  return matches;
}

export function MobileFlowOverview({ evidence, onNavigate, onRefresh }: MobileFlowOverviewProps) {
  const model = useMemo(() => buildMobileFlowModel(evidence), [evidence]);
  const tablet = useTabletWorkArea();
  return <main className="mflow" data-mobile-flow-overview data-mobile-flow-scene={model.scene} data-evidence-mode={model.evidenceMode}><TopBar device={model.device} onNavigate={onNavigate} onRefresh={onRefresh} /><div className="mflow-body"><div className="mflow-primary"><EvidenceRail model={model} /><StatusBand model={model} />{model.scene === "normal" ? <NormalInstrument model={model} onNavigate={onNavigate} /> : model.scene === "resource" ? <ResourceInstrument model={model} onNavigate={onNavigate} /> : model.scene === "interfaces" ? <InterfaceInstrument model={model} onNavigate={onNavigate} /> : model.scene === "collection" ? <CollectionInstrument model={model} onNavigate={onNavigate} /> : model.scene === "unavailable" ? <UnavailableInstrument model={model} onNavigate={onNavigate} /> : model.scene === "fleet" ? <FleetInstrument model={model} onNavigate={onNavigate} /> : <WanInstrument model={model} onNavigate={onNavigate} />}</div><ObjectStream model={model} onNavigate={onNavigate} tablet={tablet} /></div></main>;
}
export default MobileFlowOverview;
