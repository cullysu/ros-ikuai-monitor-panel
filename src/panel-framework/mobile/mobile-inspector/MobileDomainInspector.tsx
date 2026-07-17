import { ArrowLeft } from "lucide-react";
import type { RefObject } from "react";
import { PANEL_ROUTES, type PanelRouteId } from "../../routes/panelRoutes";
import type { SectionModel } from "../../sections/sectionModels";
import type { ConnectionRowEvidence, ResourceRowEvidence } from "../../sections/sectionRowEvidence";
import type { WorkspaceRow } from "../mobileDomainWorkspaceModel";
import { DnsInspector, SecurityInspector } from "./SecurityDnsInspectors";
import { InterfaceInspector, RouteInspector } from "./NetworkInspectors";
import { LogInspector, TerminalInspector } from "./TerminalLogInspectors";
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

function ResourceInspector({ row }: { row: WorkspaceRow }) {
  const evidence = row.evidence as ResourceRowEvidence;
  const latest = evidence.values.length ? evidence.values[evidence.values.length - 1] : null;
  const minimum = evidence.values.length ? Math.min(...evidence.values) : null;
  const maximum = evidence.values.length ? Math.max(...evidence.values) : null;
  return (
    <>
      <InspectorSection title="样本摘要" note="没有配套时间戳时不把数值连接成趋势">
        <InspectorReadings
          left={{ label: "最近值", value: latest === null ? "未取得" : `${latest}%` }}
          right={{ label: "有效样本", value: `${evidence.sampleCount} 个` }}
        />
        <InspectorFacts facts={[
          { label: "样本下界", value: minimum === null ? "未取得" : `${minimum}%` },
          { label: "样本上界", value: maximum === null ? "未取得" : `${maximum}%` },
        ]} />
      </InspectorSection>
      <InspectorDisclosure
        title="原始对象身份"
        note="用于资源样本比对"
        facts={[{ label: "对象 ID", value: row.id }]}
      />
    </>
  );
}

function ConnectionInspector({ row }: { row: WorkspaceRow }) {
  const evidence = row.evidence as ConnectionRowEvidence;
  return (
    <>
      <InspectorSection title="连接端点">
        <InspectorFacts facts={[
          { label: "源", value: displayValue(evidence.source) },
          { label: "目标", value: displayValue(evidence.target) },
          { label: "协议", value: displayValue(evidence.protocol) },
          { label: "端口", value: [evidence.sourcePort, evidence.targetPort].filter(Boolean).join(" → ") || "未取得" },
        ]} />
      </InspectorSection>
      <InspectorSection title="当前记录">
        <InspectorReadings
          left={{ label: "流量", value: displayRate(evidence.trafficBps) }}
          right={{ label: "连接", value: displayValue(evidence.connections) }}
        />
        <InspectorFacts facts={[
          { label: "会话字节", value: displayBytes(evidence.sessionBytes) },
        ]} />
      </InspectorSection>
      <InspectorDisclosure
        title="原始对象身份"
        note="用于连接记录比对"
        facts={[{ label: "对象 ID", value: row.id }]}
      />
    </>
  );
}

function GenericInspector({ row }: { row: WorkspaceRow }) {
  const facts = row.columns.slice(0, 6).map((column) => ({
    label: column.label,
    value: displayValue(row.values[column.key]),
  }));
  return (
    <InspectorSection title="记录证据" note="该低频对象尚未建立专用关系模型">
      <InspectorFacts facts={[...facts, { label: "对象 ID", value: row.id }]} />
    </InspectorSection>
  );
}

function DomainInspectorBody({
  row,
  model,
}: {
  row: WorkspaceRow;
  model: SectionModel;
}) {
  if (row.evidence.kind === "interface") return <InterfaceInspector row={row} model={model} />;
  if (row.evidence.kind === "route") return <RouteInspector row={row} model={model} />;
  if (row.evidence.kind === "terminal") return <TerminalInspector row={row} model={model} />;
  if (row.evidence.kind === "log") return <LogInspector row={row} model={model} />;
  if (row.evidence.kind === "security") return <SecurityInspector row={row} model={model} />;
  if (row.evidence.kind === "dns") return <DnsInspector row={row} model={model} />;
  if (row.evidence.kind === "resource") return <ResourceInspector row={row} />;
  if (row.evidence.kind === "connection") return <ConnectionInspector row={row} />;
  return <GenericInspector row={row} />;
}

export function MobileDomainInspector({
  row,
  model,
  route,
  onClose,
  titleRef,
  preview = false,
}: {
  row: WorkspaceRow | null;
  model: SectionModel;
  route: PanelRouteId;
  onClose?: () => void;
  titleRef: RefObject<HTMLHeadingElement>;
  preview?: boolean;
}) {
  if (!row) {
    return (
      <aside className="mdw-inspector is-boundary" aria-labelledby="mdw-boundary-title">
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

  const stateLabel = model.evidenceMode === "historical" ? "历史记录" : row.trailing;
  return (
    <aside
      className="mdw-inspector has-object"
      data-mobile-object-detail={row.id}
      data-domain-inspector-kind={row.evidence.kind}
      aria-labelledby="mdw-detail-title"
    >
      <header>
        {onClose ? (
          <button type="button" onClick={onClose}><ArrowLeft aria-hidden="true" size={18} />返回{PANEL_ROUTES[route].shortTitle}</button>
        ) : <span>{preview ? "优先预览" : "所选对象"}</span>}
        <span>{row.table}</span>
      </header>
      <EvidenceBoundary model={model} />
      <section className="mdi-object-heading">
        <div>
          <small>{PANEL_ROUTES[route].shortTitle} / {row.table}</small>
          <h2 id="mdw-detail-title" tabIndex={-1} ref={titleRef}>{row.primary}</h2>
          <p>{row.secondary}</p>
        </div>
        <b className={row.meta.attention ? "is-attention" : ""}>{stateLabel}</b>
      </section>
      <div className="mdi-domain-body">
        <DomainInspectorBody row={row} model={model} />
      </div>
    </aside>
  );
}
