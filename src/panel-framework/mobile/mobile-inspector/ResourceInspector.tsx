import { ChevronRight } from "lucide-react";
import { panelObjectIdForValues } from "../../sections/panelObjectIdentity";
import { resourceEvidencePresentation } from "../../sections/resourceEvidencePresentation";
import type { ResourceRowEvidence } from "../../sections/sectionRowEvidence";
import type { PanelNavigate, PanelRouteId } from "../../routes/panelRoutes";
import type { WorkspaceRow } from "../mobileDomainWorkspaceModel";
import {
  InspectorDisclosure,
  InspectorFacts,
  InspectorRelations,
  InspectorSection,
} from "./InspectorPrimitives";
import { ResourceAuditSequence } from "./ResourceAuditSequence";
import { resourceRelativeStatus } from "./resourceComparison";
import "../mobile-domain-next-evidence.css";

export function ResourceInspector({
  row,
  relatedRows = [],
  onNavigate,
  currentRoute,
  returnRoute,
  evidenceAt,
}: {
  row: WorkspaceRow;
  relatedRows?: WorkspaceRow[];
  onNavigate: PanelNavigate;
  currentRoute: PanelRouteId;
  returnRoute: PanelRouteId;
  evidenceAt?: string | null;
}) {
  const evidence = row.evidence as ResourceRowEvidence;
  const presentation = resourceEvidencePresentation(evidence);
  const auditObjectId = panelObjectIdForValues("loadAudit", row.table, row.values, row.meta.identityParts);
  const auditEvidenceAt = evidence.evidenceAt || evidenceAt || null;
  const canOpenAudit = currentRoute === "trafficLoad" && evidence.values.length > 0 && Boolean(auditEvidenceAt);
  const isAudit = currentRoute === "loadAudit";
  return (
    <div className="mdi-resource-object-evidence" data-resource-layer="object" data-resource-layer-question="breach-context" data-resource-evidence-role="object-facts">
      <InspectorSection title="变化证据" note="补充采样范围与有效样本；当前阈值比较由列表负责">
        <InspectorFacts facts={[
          { label: "样本范围", value: `${presentation.minimum} — ${presentation.maximum}`, valueKind: "numeric" },
          { label: "有效样本", value: presentation.sampleCount, valueKind: "numeric" },
          { label: "证据时间", value: presentation.evidenceAt, valueKind: "machine" },
        ]} />
      </InspectorSection>
      <InspectorSection title="相关资源比较" note="相对当前选中对象的最新样本" ariaLabel="相关资源比较">
        <div data-resource-related-comparison="true">
          <InspectorRelations rows={relatedRows.slice(0, 4).filter((item) => item.evidence.kind === "resource").map((item) => {
            const relatedEvidence = item.evidence as ResourceRowEvidence;
            const selectedLatest = evidence.latest;
            const relatedLatest = relatedEvidence.latest;
            return {
              primary: item.primary,
              secondary: item.secondary,
              status: resourceRelativeStatus(selectedLatest, relatedLatest),
              tone: item.meta.attention ? "warn" : "neutral",
            };
          })} />
        </div>
      </InspectorSection>
      <InspectorSection title="依赖与来源" note="说明这项判断依赖哪些证据" ariaLabel="依赖与来源">
        <InspectorFacts facts={[
          { label: "采样来源", value: evidence.sourceTable },
          { label: "对象序列", value: evidence.series || "未取得" },
          { label: "当前边界", value: "只描述资源压力，不推断网络中断" },
        ]} />
      </InspectorSection>
      {isAudit ? (
        <div data-resource-audit-sequence="true"><ResourceAuditSequence evidence={evidence} /></div>
      ) : null}
      {canOpenAudit ? (
        <section className="mdi-next-evidence" data-domain-next-evidence="loadAudit" aria-label="下一项核对">
          <div>
            <small>下一项核对</small>
            <b>打开采样审计</b>
            <p>查看同一资源的采样序列，核对变化是否持续。</p>
          </div>
          <button
            type="button"
            data-domain-next-evidence-action
            data-domain-next-evidence-route="loadAudit"
            data-domain-next-evidence-source-object-id={row.id}
            data-domain-next-evidence-object-id={auditObjectId}
            onClick={() => onNavigate("loadAudit", {
              objectId: auditObjectId,
              returnRoute,
              evidenceAt: auditEvidenceAt,
              focusId: "loadAudit",
            })}
          >
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        </section>
      ) : null}
      <InspectorDisclosure title="原始对象身份" note="对象 ID" facts={[{ label: "对象 ID", value: row.id, valueKind: "machine" }]} />
    </div>
  );
}
