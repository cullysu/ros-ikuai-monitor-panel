import { ArrowLeft } from "lucide-react";
import type { RefObject } from "react";
import { formatRfc3339Local } from "../../timeContract";
import { PANEL_RISK_CONTEXT, PANEL_ROUTES, type PanelNavigate, type PanelRiskContext, type PanelRouteId } from "../../routes/panelRoutes";
import { diagnosticChannelLabel, diagnosticFailureLabel } from "../../sections/diagnosticFailureModel";
import type { SectionModel } from "../../sections/sectionModels";
import type {
  DiagnosticRowEvidence,
  LogRowEvidence,
  ResourceRowEvidence,
  TerminalRowEvidence,
} from "../../sections/sectionRowEvidence";
import type { WorkspaceRow } from "../mobileDomainWorkspaceModel";
import { DnsInspector, SecurityInspector } from "./SecurityDnsInspectors";
import { InterfaceInspector, RouteInspector } from "./NetworkInspectors";
import { BalanceInspector } from "./BalanceInspector";
import { DhcpClientInspector } from "./DhcpClientInspector";
import { TrafficAuditInspector } from "./TrafficAuditInspector";
import { LogInspector, TerminalInspector } from "./TerminalLogInspectors";
import { ServiceLogInspector } from "./ServiceLogInspector";
import { ResourceInspector } from "./ResourceInspector";
import { useInspectorAutoDisclosure } from "./useInspectorAutoDisclosure";
import { DiagnosticInspector } from "./DiagnosticInspector";
import { ConnectionInspector } from "./ConnectionInspector";
import { ArpAlertInspector } from "./ArpAlertInspector";
import { RelatedObjectRail } from "./MobileRelatedObjectRail";
import {
  EvidenceBoundary,
  InspectorDisclosure,
  InspectorFacts,
  InspectorMessage,
  InspectorReadings,
  InspectorSection,
  displayBytes,
  displayRate,
  displayValue,
} from "./InspectorPrimitives";
function assertNeverEvidence(value: never): never {
  throw new Error("Unsupported mobile evidence kind: " + String(value));
}
function DomainInspectorBody({
  row,
  model,
  preview,
  relatedRows,
  onNavigate,
  currentRoute,
  returnRoute,
  originEvidenceAt,
}: {
  row: WorkspaceRow;
  model: SectionModel;
  preview: boolean;
  relatedRows: WorkspaceRow[];
  onNavigate: PanelNavigate;
  currentRoute: PanelRouteId; returnRoute: PanelRouteId; originEvidenceAt?: string | null;
}) {
  if (currentRoute === "balance") return <BalanceInspector row={row} model={model} />;
  if (row.evidence.kind === "balance-rule") return <BalanceInspector row={row} model={model} />;
  if (row.evidence.kind === "dhcp-client") return <DhcpClientInspector row={row} model={model} />;
  if (currentRoute === "trafficAudit") return <TrafficAuditInspector row={row} model={model} />;
  if (row.evidence.kind === "interface") return <InterfaceInspector row={row} model={model} preview={preview} onNavigate={onNavigate} />;
  if (row.evidence.kind === "route") return <RouteInspector row={row} model={model} />;
  if (row.evidence.kind === "terminal") return <TerminalInspector row={row} model={model} onNavigate={onNavigate} evidenceAt={originEvidenceAt || model.observedAt} />;
  if (currentRoute === "serviceLogs" && row.evidence.kind === "log") return <ServiceLogInspector row={row} model={model} />;
  if (row.evidence.kind === "log") return <LogInspector row={row} model={model} preview={preview} />;
  if (row.evidence.kind === "security") return <SecurityInspector row={row} model={model} />;
  if (row.evidence.kind === "dns") return <DnsInspector row={row} model={model} />;
  if (row.evidence.kind === "resource") return <ResourceInspector row={row} relatedRows={relatedRows} onNavigate={onNavigate} currentRoute={currentRoute} returnRoute={returnRoute} evidenceAt={originEvidenceAt} />;
  if (row.evidence.kind === "connection") return <ConnectionInspector row={row} model={model} onNavigate={onNavigate} evidenceAt={originEvidenceAt || model.observedAt} />;
  if (row.evidence.kind === "arp-alert") return <ArpAlertInspector row={row} />;
  if (row.evidence.kind === "diagnostic") return <DiagnosticInspector row={row} current={model.evidenceMode === "current"} />;
  // Generic/raw rows intentionally have no typed object contract. Do not invent an inspector or preview.
  if (row.evidence.kind === "generic") return null;
  return assertNeverEvidence(row.evidence);
}
function logSeverityLabel(severity: LogRowEvidence["severity"]): string {
  if (severity === "critical") return "严重";
  if (severity === "error") return "错误";
  if (severity === "warning") return "警告";
  if (severity === "info") return "信息";
  return "级别未确认";
}
export function MobileDomainInspector({
  row,
  model,
  route,
  returnRoute,
  originEvidenceAt,
  originRisk,
  onClose,
  titleRef,
  preview = false,
  previewLabel,
  relatedRows = [],
  onOpenRelated,
  onNavigate,
}: {
  row: WorkspaceRow | null;
  model: SectionModel;
  route: PanelRouteId;
  returnRoute?: PanelRouteId | null;
  originEvidenceAt?: string | null;
  originRisk?: PanelRiskContext | null;
  onClose?: () => void;
  titleRef: RefObject<HTMLHeadingElement>;
  preview?: boolean;
  previewLabel?: string;
  relatedRows?: WorkspaceRow[];
  onOpenRelated?: (row: WorkspaceRow) => void;
  onNavigate: PanelNavigate;
}) {
  const inspectorRef = useInspectorAutoDisclosure(route, row?.evidence.kind === "resource" ? undefined : row?.id, preview ? "preview" : "detail");
  if (!row) {
    return (
      <aside ref={inspectorRef} className="mdw-inspector is-boundary" aria-labelledby="mdw-boundary-title">
        <header><span>{PANEL_ROUTES[route].shortTitle}</span><span>证据工作区</span></header>
        <EvidenceBoundary model={model} />
        <section className="mdi-no-object">
          <h2 id="mdw-boundary-title">当前没有可检查对象</h2>
          <p>{model.tables[0]?.empty || model.status}</p>
          {model.evidenceMode === "unavailable" ? (
            <InspectorMessage tone="danger">业务对象与业务数字已隐藏；等待新的成功快照。</InspectorMessage>
          ) : null}
        </section>
      </aside>
    );
  }
  const logEvidence = row.evidence.kind === "log" ? row.evidence as LogRowEvidence : null;
  const diagnosticEvidence = row.evidence.kind === "diagnostic" ? row.evidence as DiagnosticRowEvidence : null;
  const resourceEvidence = row.evidence.kind === "resource" ? row.evidence as ResourceRowEvidence : null;
  const terminalEvidence = row.evidence.kind === "terminal" ? row.evidence as TerminalRowEvidence : null;
  const bodyOwnsSecondaryIdentity = row.evidence.kind === "interface" ||
    row.evidence.kind === "terminal" || row.evidence.kind === "resource";
  const heading = diagnosticEvidence
    ? diagnosticEvidence.objectName
    : logEvidence
      ? "日志事件"
      : row.primary;
  const headingSubtitle = diagnosticEvidence?.endpoint || (logEvidence || bodyOwnsSecondaryIdentity ? "" : row.secondary);
  const headingContext = diagnosticEvidence
    ? `${PANEL_ROUTES[route].shortTitle} / ${diagnosticChannelLabel(diagnosticEvidence.channel)}`
    : `${PANEL_ROUTES[route].shortTitle} / ${row.table}`;
  const stateLabel = diagnosticEvidence
    ? diagnosticFailureLabel(model.evidenceMode === "current")
    : logEvidence
      ? logSeverityLabel(logEvidence.severity)
      : terminalEvidence
        ? terminalEvidence.online === true ? "在线" : terminalEvidence.online === false ? "离线" : "状态未确认"
      : resourceEvidence
        ? resourceEvidence.values.length
          ? model.evidenceMode === "historical" ? "历史样本" : "当前样本"
          : "样本未取得"
      : model.evidenceMode === "historical"
        ? "历史记录"
        : row.trailing;
  const resolvedReturnRoute = returnRoute || route;
  const originRoute = returnRoute && returnRoute !== route ? returnRoute : null;
  const originTime = originRoute ? formatRfc3339Local(originEvidenceAt) || "" : "";
  const supportsRelatedRail = row.evidence.kind === "interface" || row.evidence.kind === "route" ||
    row.evidence.kind === "terminal" || row.evidence.kind === "connection";
  return (
    <aside
      ref={inspectorRef}
      className="mdw-inspector has-object"
      data-mobile-object-detail={preview ? undefined : row.id}
      data-mobile-object-preview={preview ? row.id : undefined}
      data-mobile-log-detail={logEvidence ? "v1" : undefined} data-mobile-detail-novel-evidence={logEvidence ? "time,topics,source,neighbors,identity" : undefined}
      data-domain-inspector-kind={row.evidence.kind}
      data-mobile-return-route={resolvedReturnRoute}
      data-mobile-origin-evidence-at={originRoute && originEvidenceAt ? originEvidenceAt : undefined}
      data-investigation-risk={originRisk || undefined} data-resource-layer={row.evidence.kind === "resource" ? "object" : undefined} data-resource-layer-question={row.evidence.kind === "resource" ? "breach-context" : undefined}
      aria-labelledby="mdw-detail-title"
    >
      <header>
        {onClose ? (
          <button type="button" onClick={onClose}><ArrowLeft aria-hidden="true" size={18} />返回{PANEL_ROUTES[resolvedReturnRoute].shortTitle}</button>
        ) : <span>{preview ? previewLabel || "证据预览" : "所选对象"}</span>}
        {originRisk ? null : <span>{originRoute ? `来自${PANEL_ROUTES[originRoute].shortTitle}${originTime ? ` · ${originTime}` : ""}` : row.table}</span>}
      </header>
      {preview ? null : <EvidenceBoundary model={model} />}
      <section className="mdi-object-heading">
        <div style={{ minWidth: 0 }}>
          <small>{originRisk ? `来自运行概览 · ${PANEL_RISK_CONTEXT[originRisk][1]}` : headingContext}</small>
          <h2 id="mdw-detail-title" tabIndex={-1} ref={titleRef}>{heading}</h2>
          {originRisk || headingSubtitle ? (
            <p>{originRisk
              ? [headingSubtitle, originTime].filter(Boolean).join(" · ")
              : headingSubtitle}</p>
          ) : null}
        </div>
        <b className={row.meta.attention ? "is-attention" : ""}>{stateLabel}</b>
      </section>
      <div className="mdi-domain-body">
        <DomainInspectorBody
          row={row}
          model={model}
          preview={preview}
          relatedRows={relatedRows.filter((item) => item.evidence.kind === "resource")}
          onNavigate={onNavigate}
          currentRoute={route}
          returnRoute={resolvedReturnRoute}
          originEvidenceAt={originEvidenceAt}
        />
        {supportsRelatedRail && onOpenRelated ? <RelatedObjectRail rows={relatedRows} onOpen={onOpenRelated} /> : null}
      </div>
    </aside>
  );
}
