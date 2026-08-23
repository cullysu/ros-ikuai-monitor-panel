import type { RefObject, ReactNode } from "react";
import { formatRfc3339Local } from "../timeContract";
import { panelRiskOriginLabel, type PanelRiskContext } from "../routes/panelRoutes";
import { diagnosticChannelLabel, diagnosticFailureLabel } from "./diagnosticFailureModel";
import type { SectionModel } from "./sectionModels";
import type { WorkspaceRow } from "../domain-workspace/workspaceRows";
import { resourceEvidencePresentation } from "./resourceEvidencePresentation";

interface Fact { label: string; value: string; }

function valueOf(value: unknown, fallback = "未取得"): string {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}
function booleanOf(value: boolean | null, positive: string, negative: string): string {
  return value === null ? "未确认" : value ? positive : negative;
}
function statusOf(value: string | null): string {
  const normalized = String(value || "").trim().toLowerCase();
  if (["running", "up", "online", "reachable", "bound"].includes(normalized)) return "运行";
  if (["stopped", "down", "offline", "unreachable"].includes(normalized)) return "未运行";
  if (normalized === "searching") return "搜索中";
  return valueOf(value, "未确认");
}
function rateOf(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "未取得";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} Gbps`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} Mbps`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} Kbps`;
  return `${Math.round(value)} bps`;
}
function bytesOf(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "未取得";
  if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(2)} GiB`;
  if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)} MiB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${Math.round(value)} B`;
}
function percentOf(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "未取得" : `${(value * 100).toFixed(2)}%`;
}

function FactGrid({ facts }: { facts: Fact[] }) {
  return <dl className="ddi-facts">{facts.map((fact) => (
    <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>
  ))}</dl>;
}
function EvidenceBlock({ title, note, facts, children }: { title: string; note?: string; facts?: Fact[]; children?: ReactNode }) {
  return <section className="ddi-block"><header><h3>{title}</h3>{note ? <p>{note}</p> : null}</header>{facts ? <FactGrid facts={facts} /> : null}{children}</section>;
}

function InterfaceEvidence({ row }: { row: WorkspaceRow }) {
  if (row.evidence.kind !== "interface") return null;
  const evidence = row.evidence;
  const route = evidence.defaultRoutes[0] || null;
  return <>
    <EvidenceBlock title="状态与身份" facts={[
      { label: "运行标志", value: booleanOf(evidence.running, "运行", "未运行") },
      { label: "管理状态", value: booleanOf(evidence.disabled, "已禁用", "已启用") },
      { label: "影响判断", value: evidence.operationalImpact === "risk" ? "配置依赖受影响" : evidence.operationalImpact === "unverified" ? "影响未判定" : evidence.operationalReason === "administratively-disabled" ? "不作为故障" : "未发现风险依据" },
      { label: "角色 / 类型", value: [evidence.role, evidence.interfaceType].filter(Boolean).join(" · ") || "未取得" },
      { label: "地址", value: evidence.addresses.join(" · ") || "未取得" },
      { label: "父级 / VLAN", value: [evidence.parent, evidence.vlanId].filter(Boolean).join(" · ") || "未取得" },
      { label: "MAC", value: valueOf(evidence.mac) },
    ]} />
    <EvidenceBlock title="当前吞吐与累计量" facts={[
      { label: "接收", value: rateOf(evidence.rxRate) },
      { label: "发送", value: rateOf(evidence.txRate) },
      { label: "累计接收", value: bytesOf(evidence.rxBytes) },
      { label: "累计发送", value: bytesOf(evidence.txBytes) },
      { label: "接收包", value: valueOf(evidence.rxPackets) },
      { label: "发送包", value: valueOf(evidence.txPackets) },
    ]} />
    <EvidenceBlock title="默认出口关系" note={evidence.defaultRouteRelation === "direct" ? "仅展示与该接口明确关联的默认路由" : "当前快照没有明确对象关联"} facts={[
      { label: "关系", value: evidence.defaultRouteRelation === "direct" ? "直接关联" : "未核实" },
      { label: "目标 / 网关", value: route ? `${route.destination} → ${route.gateway}` : "未取得" },
      { label: "路由表 / 距离", value: route ? `${route.table} / ${route.distance ?? "—"}` : "未取得" },
      { label: "路由状态", value: route ? booleanOf(route.active, "活动", "非活动") : "未取得" },
    ]} />
    <EvidenceBlock title="链路质量" facts={[
      { label: "丢弃 / 错误", value: `${evidence.dropTotal ?? "未取得"} / ${evidence.errorTotal ?? "未取得"}` },
      { label: "丢包率 / 错误率", value: `${percentOf(evidence.lossRate)} / ${percentOf(evidence.errorRate)}` },
      { label: "质量样本", value: evidence.qualitySampleCount === null ? "未取得" : `${evidence.qualitySampleCount} 个` },
      { label: "质量时间", value: valueOf(evidence.qualityUpdatedAt) },
    ]} />
  </>;
}

function RouteEvidence({ row }: { row: WorkspaceRow }) {
  if (row.evidence.kind !== "route") return null;
  const evidence = row.evidence;
  const related = evidence.relatedInterface;
  return <>
    <EvidenceBlock title="路由判定" facts={[
      { label: "目标", value: valueOf(evidence.destination) }, { label: "网关", value: valueOf(evidence.gateway) },
      { label: "路由表 / 距离", value: `${valueOf(evidence.table)} / ${evidence.distance ?? "未取得"}` },
      { label: "活动 / 禁用", value: `${booleanOf(evidence.active, "活动", "非活动")} / ${booleanOf(evidence.disabled, "已禁用", "未禁用")}` },
      { label: "协议 / 地址族", value: [evidence.protocol, evidence.family].filter(Boolean).join(" · ") || "未取得" },
      { label: "默认路由", value: evidence.isDefault ? "是" : "否" },
    ]} />
    <EvidenceBlock title="关联接口" note={evidence.interfaceRelation === "direct" ? "由出接口或网关精确关联" : "没有足够证据确认承载接口"} facts={[
      { label: "接口", value: valueOf(related?.name) },
      { label: "运行状态", value: related ? booleanOf(related.running, "运行", "未运行") : "未取得" },
      { label: "角色 / 类型", value: related ? [related.role, related.interfaceType].filter(Boolean).join(" · ") || "未取得" : "未取得" },
      { label: "接收 / 发送", value: related ? `${rateOf(related.rxRate)} / ${rateOf(related.txRate)}` : "未取得" },
    ]} />
    <EvidenceBlock title="原始说明" facts={[{ label: "备注", value: valueOf(evidence.comment, "未记录") }, { label: "对象身份", value: row.id }]} />
  </>;
}

function TerminalEvidence({ row }: { row: WorkspaceRow }) {
  if (row.evidence.kind !== "terminal") return null;
  const evidence = row.evidence;
  return <>
    <EvidenceBlock title="终端身份" facts={[
      { label: "主机名", value: valueOf(evidence.hostname) }, { label: "IP / MAC", value: `${valueOf(evidence.ip)} / ${valueOf(evidence.mac)}` },
      { label: "接入接口", value: valueOf(evidence.interfaceName) }, { label: "身份来源", value: evidence.identitySources.join(" · ") || "未取得" },
    ]} />
    <EvidenceBlock title="在线与负载" facts={[
      { label: "在线", value: booleanOf(evidence.online, "在线", "离线") }, { label: "最后出现", value: valueOf(evidence.lastSeen) },
      { label: "下载 / 上传", value: `${rateOf(evidence.downRate)} / ${rateOf(evidence.upRate)}` },
      { label: "连接 / 会话量", value: `${evidence.connections ?? "未取得"} / ${bytesOf(evidence.sessionBytes)}` },
    ]} />
    <EvidenceBlock title="地址证据" facts={[
      { label: "DHCP", value: valueOf(evidence.dhcpStatus) }, { label: "DHCP 服务", value: valueOf(evidence.dhcpServer) },
      { label: "ARP", value: valueOf(evidence.arpStatus) }, { label: "对象身份", value: row.id },
    ]} />
  </>;
}

function LogEvidence({ row }: { row: WorkspaceRow }) {
  if (row.evidence.kind !== "log") return null;
  const evidence = row.evidence;
  return <>
    <EvidenceBlock title="事件" facts={[
      { label: "时间", value: valueOf(evidence.time) }, { label: "级别 / 主题", value: `${evidence.severity} / ${valueOf(evidence.topics)}` },
      { label: "来源", value: valueOf(evidence.source) }, { label: "记录身份", value: row.id },
    ]} />
    <EvidenceBlock title="相邻事件" note="按带时区 RFC 3339 时间排序">
      <ol className="ddi-timeline">{evidence.neighbors.length ? evidence.neighbors.map((item, index) => (
        <li key={`${item.relation}-${item.time}-${index}`}><span>{item.relation === "newer" ? "较新" : "较早"}</span><b>{valueOf(item.time)}</b><p>{valueOf(item.message)}</p></li>
      )) : <li className="is-empty">没有可比较的相邻事件</li>}</ol>
    </EvidenceBlock>
  </>;
}

function SecurityEvidence({ row }: { row: WorkspaceRow }) {
  if (row.evidence.kind !== "security") return null;
  const evidence = row.evidence;
  return <>
    <EvidenceBlock title={evidence.objectType === "rule" ? "规则语义" : "告警语义"} facts={[
      { label: "链 / 动作", value: `${valueOf(evidence.chain)} / ${valueOf(evidence.action)}` },
      { label: "顺序 / 禁用", value: `${evidence.order ?? "未取得"} / ${booleanOf(evidence.disabled, "已禁用", "启用")}` },
      { label: "严重度 / 时间", value: `${evidence.severity} / ${valueOf(evidence.time)}` }, { label: "影响", value: valueOf(evidence.affected) },
    ]} />
    <EvidenceBlock title="匹配与计数" facts={[
      { label: "入口 / 出口", value: `${valueOf(evidence.inInterface)} / ${valueOf(evidence.outInterface)}` },
      { label: "源 / 目标", value: `${valueOf(evidence.sourceAddress)} / ${valueOf(evidence.destinationAddress)}` },
      { label: "包 / 字节", value: `${evidence.packets ?? "未取得"} / ${bytesOf(evidence.bytes)}` },
      { label: "说明", value: valueOf(evidence.comment || evidence.message, "未记录") },
    ]} />
  </>;
}

function DnsEvidence({ row }: { row: WorkspaceRow }) {
  if (row.evidence.kind !== "dns") return null;
  const evidence = row.evidence;
  return <>
    <EvidenceBlock title="DNS 对象" facts={[
      { label: "类型", value: evidence.objectType }, { label: "名称 / 记录", value: `${valueOf(evidence.name)} / ${valueOf(evidence.recordType)}` },
      { label: "目标 / TTL", value: `${valueOf(evidence.target)} / ${valueOf(evidence.ttl)}` },
      { label: "接口 / 状态", value: `${valueOf(evidence.interfaceName)} / ${statusOf(evidence.status)}` },
    ]} />
    <EvidenceBlock title="发布与上游" facts={[
      { label: "发布 DNS", value: evidence.publishedDns.join(" · ") || "未取得" }, { label: "上游 DNS", value: evidence.upstreamServers.join(" · ") || "未取得" },
      { label: "DoH", value: valueOf(evidence.dohServer, "未配置") }, { label: "DoH 证书", value: booleanOf(evidence.verifyDohCert, "验证", "不验证") },
      { label: "对端 DNS", value: booleanOf(evidence.peerDns, "采用", "不采用") }, { label: "发布默认路由", value: booleanOf(evidence.addDefaultRoute, "是", "否") },
    ]} />
  </>;
}

function DiagnosticEvidence({ row, current }: { row: WorkspaceRow; current: boolean }) {
  if (row.evidence.kind !== "diagnostic") return null;
  const evidence = row.evidence;
  return <>
    <EvidenceBlock title={`${diagnosticFailureLabel(current)}证据`} facts={[
      { label: "传输", value: evidence.transport },
      { label: "记录时间", value: valueOf(formatRfc3339Local(evidence.recordedAt)) },
      { label: "端点错误", value: valueOf(evidence.message) },
    ]} />
    <EvidenceBlock title="失败范围与边界" note="不证明转发面或外部业务中断" facts={[
      { label: "同通道失败", value: `${evidence.sameChannelFailureCount} 个端点` },
      { label: "全部已记录失败", value: `${evidence.totalFailureCount} 个端点` },
      { label: "通道错误", value: valueOf(evidence.channelError, "未记录通道级错误") },
      { label: "对象身份", value: row.id },
    ]} />
  </>;
}

function OtherEvidence({ row }: { row: WorkspaceRow }) {
  if (row.evidence.kind === "resource") {
    const evidence = row.evidence;
    const presentation = resourceEvidencePresentation(evidence);
    return <EvidenceBlock title="当前越阈判断" note="只描述当前资源指标；不推断网络中断" facts={[
      { label: "当前值", value: presentation.current },
      { label: "策略阈值", value: presentation.threshold },
      { label: "高出阈值", value: presentation.delta },
      { label: "连续证据", value: presentation.continuity },
      { label: "证据时间", value: presentation.evidenceAt },
      { label: "样本范围", value: `${presentation.minimum} / ${presentation.maximum}` },
      { label: "对象身份", value: row.id },
    ]} />;
  }
  if (row.evidence.kind === "connection") return <EvidenceBlock title="连接证据" facts={[
    { label: "源", value: valueOf(row.evidence.source) }, { label: "目标", value: valueOf(row.evidence.target) },
    { label: "协议 / 端口", value: `${valueOf(row.evidence.protocol)} / ${valueOf(row.evidence.sourcePort)} → ${valueOf(row.evidence.targetPort)}` },
    { label: "流量 / 连接", value: `${rateOf(row.evidence.trafficBps)} / ${row.evidence.connections ?? "未取得"}` },
    { label: "会话字节", value: bytesOf(row.evidence.sessionBytes) }, { label: "对象身份", value: row.id },
  ]} />;
  return <EvidenceBlock title="记录证据" note="该低频对象尚未建立专用关系模型" facts={[
    ...row.columns.slice(0, 6).map((column) => ({ label: column.label, value: valueOf(row.values[column.key]) })),
    { label: "对象身份", value: row.id },
  ]} />;
}

export function DesktopDomainInspector({ row, riskRows, model, pinned, originRisk, originEvidenceAt, onUnpin, onReturn, titleRef }: {
  row: WorkspaceRow | null; model: SectionModel; pinned: boolean; originRisk: PanelRiskContext | null;
  riskRows: WorkspaceRow[];
  originEvidenceAt: string | null; onUnpin: () => void; onReturn: () => void;
  titleRef: RefObject<HTMLHeadingElement>;
}) {
  const evidenceLabel = model.evidenceMode === "current" ? "当前证据" : model.evidenceMode === "historical" ? "历史证据" : "证据不可用";
  if (!row) return <aside className="ddw-inspector is-empty" data-investigation-risk={originRisk || undefined} aria-label="对象证据"><div className="ddi-boundary"><span><b>{evidenceLabel}</b>{originRisk ? panelRiskOriginLabel(originRisk, originEvidenceAt) : model.updatedAt || "未记录成功时间"}</span>{originRisk ? <button type="button" onClick={onReturn}>返回运行概览</button> : null}</div><h2>{originRisk ? "选择风险对象" : "未选择对象"}</h2><p>{originRisk ? `${riskRows.length} 个匹配对象；未自动选择。` : "从列表打开证据"}</p>{originRisk && riskRows.length ? <dl className="ddi-facts"><div><dt>匹配对象</dt><dd>{riskRows.map((item) => item.primary).join(" · ")}</dd></div><div><dt>选择方式</dt><dd>从左侧列表打开对象证据</dd></div></dl> : null}</aside>;
  const isLog = row.evidence.kind === "log";
  const diagnosticEvidence = row.evidence.kind === "diagnostic" ? row.evidence : null;
  const headingTitle = diagnosticEvidence ? diagnosticEvidence.objectName : row.primary;
  const headingSubtitle = diagnosticEvidence ? valueOf(diagnosticEvidence.endpoint) : isLog ? `${row.trailing} · ${row.secondary}` : row.secondary;
  const headingState = diagnosticEvidence ? diagnosticChannelLabel(diagnosticEvidence.channel) : row.trailing;
  return <aside className="ddw-inspector" data-desktop-object-detail={row.id} data-domain-inspector-kind={row.evidence.kind} data-investigation-risk={originRisk || undefined} aria-labelledby="desktop-domain-title">
    <div className="ddi-boundary"><span><b>{evidenceLabel}</b>{originRisk ? `${panelRiskOriginLabel(originRisk, originEvidenceAt)} · ${row.id}` : model.updatedAt || "未记录成功时间"}</span>{pinned ? <button type="button" onClick={originRisk ? onReturn : onUnpin}>{originRisk ? "返回运行概览" : "取消固定"}</button> : <em>语义预览</em>}</div>
    <header className="ddi-heading"><span>{row.table}</span><h2 id="desktop-domain-title" tabIndex={-1} ref={titleRef}>{headingTitle}</h2><p>{headingSubtitle}</p><b className={row.meta.attention ? "is-attention" : ""}>{headingState}</b></header>
    <div className="ddi-body"><InterfaceEvidence row={row} /><RouteEvidence row={row} /><TerminalEvidence row={row} /><LogEvidence row={row} /><SecurityEvidence row={row} /><DnsEvidence row={row} /><DiagnosticEvidence row={row} current={model.evidenceMode === "current"} />{!["interface", "route", "terminal", "log", "security", "dns", "diagnostic"].includes(row.evidence.kind) ? <OtherEvidence row={row} /> : null}</div>
  </aside>;
}
