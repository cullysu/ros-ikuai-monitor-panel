import { ChevronRight } from "lucide-react";
import type { PanelNavigate } from "../../routes/panelRoutes";
import type { SectionModel } from "../../sections/sectionModels";
import type { ConnectionRowEvidence } from "../../sections/sectionRowEvidence";
import type { WorkspaceRow } from "../mobileDomainWorkspaceModel";
import {
  InspectorDisclosure,
  InspectorFacts,
  InspectorReadings,
  InspectorSection,
  displayBytes,
  displayRate,
  displayValue,
} from "./InspectorPrimitives";

export function ConnectionInspector({
  row,
  model,
  onNavigate,
  evidenceAt,
}: {
  row: WorkspaceRow;
  model: SectionModel;
  onNavigate: PanelNavigate;
  evidenceAt?: string | null;
}) {
  const evidence = row.evidence as ConnectionRowEvidence;
  const sourceEndpoint = evidence.source?.trim() || "";
  const canInspectSourceTerminal = Boolean(sourceEndpoint && model.evidenceMode === "current" && evidenceAt);
  return (
    <>
      <InspectorSection title="连接端点">
        <InspectorFacts facts={[
          { label: "源", value: displayValue(evidence.source), valueKind: "machine" },
          { label: "目标", value: displayValue(evidence.target), valueKind: "machine" },
          { label: "协议", value: displayValue(evidence.protocol) },
          { label: "端口", value: [evidence.sourcePort, evidence.targetPort].filter(Boolean).join(" → ") || "未取得", valueKind: "numeric" },
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
        facts={[{ label: "对象 ID", value: row.id, valueKind: "machine" }]}
      />
      {canInspectSourceTerminal ? (
        <section className="mdi-next-step" data-mobile-connection-object-action="v1" data-mobile-connection-evidence-at={evidenceAt || undefined} aria-label="下一步检查">
          <header>
            <div>
              <span className="mdi-next-step-kicker">下一步检查</span>
              <h3>核对源端终端</h3>
              <p>带着当前连接的源地址进入终端集合；是否为同一对象仍需在终端证据中确认。</p>
            </div>
          </header>
          <button
            type="button"
            onClick={() => onNavigate("terminals", {
              query: sourceEndpoint,
              returnRoute: "connections",
              evidenceAt: evidenceAt || null,
            })}
          >
            <span>在终端中检查源地址</span>
            <ChevronRight aria-hidden="true" size={17} />
          </button>
        </section>
      ) : null}
    </>
  );
}
