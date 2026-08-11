import { ChevronRight } from "lucide-react";
import { panelObjectIdForValues } from "../../sections/panelObjectIdentity";
import { resourceEvidencePresentation } from "../../sections/resourceEvidencePresentation";
import type { ResourceRowEvidence } from "../../sections/sectionRowEvidence";
import type { OverviewEvidenceMode } from "../../overview/evidence-model/overviewEvidenceTypes";
import type { PanelNavigate, PanelRouteId } from "../../routes/panelRoutes";
import type { WorkspaceRow } from "../mobileDomainWorkspaceModel";
import {
  InspectorDisclosure,
  InspectorFacts,
  InspectorRelations,
  InspectorSection,
} from "./InspectorPrimitives";
import { ResourceAuditSequence } from "./ResourceAuditSequence";
import { resourceComparisonRows } from "./resourceComparison";
import "../mobile-domain-next-evidence.css";

export function ResourceInspector({
  row,
  relatedRows = [],
  onNavigate,
  currentRoute,
  returnRoute,
  evidenceAt,
  evidenceMode,
}: {
  row: WorkspaceRow;
  relatedRows?: WorkspaceRow[];
  onNavigate: PanelNavigate;
  currentRoute: PanelRouteId;
  returnRoute: PanelRouteId;
  evidenceAt?: string | null;
  evidenceMode: OverviewEvidenceMode;
}) {
  const evidence = row.evidence as ResourceRowEvidence;
  const presentation = resourceEvidencePresentation(evidence);
  const auditObjectId = panelObjectIdForValues("loadAudit", row.table, row.values, row.meta.identityParts);
  const auditEvidenceAt = evidence.evidenceAt || evidenceAt || null;
  const canOpenAudit = currentRoute === "trafficLoad" && evidence.values.length > 0 && Boolean(auditEvidenceAt);
  const isAudit = currentRoute === "loadAudit";
  const currentSample = evidenceMode === "current";
  const sampleLabel = currentSample ? "当前样本" : evidenceMode === "historical" ? "历史末样本" : "最近样本";
  const thresholdLabel = currentSample ? "策略阈值" : "历史阈值";
  return (
    <div className="mdi-resource-object-evidence" data-resource-layer="object" data-resource-layer-question="breach-context" data-resource-evidence-role="object-facts">
      <InspectorSection title="样本判断" note="读数、边界、窗口变化与持续性" ariaLabel="资源样本判断">
        <InspectorFacts facts={[
          { label: sampleLabel, value: presentation.current, valueKind: "numeric" },
          { label: thresholdLabel, value: presentation.threshold, valueKind: "numeric" },
          { label: "变化范围", value: `${presentation.minimum} — ${presentation.maximum}`, valueKind: "numeric" },
          { label: "连续性", value: presentation.continuity },
        ]} />
      </InspectorSection>
      <InspectorSection title="相关资源比较" note="相对当前对象比较同一批次的最新样本" ariaLabel="相关资源比较">
        <div data-resource-related-comparison="true">
          <InspectorRelations rows={resourceComparisonRows(evidence, relatedRows)} />
        </div>
      </InspectorSection>
      <InspectorSection title="依赖与来源" note="说明这项判断依赖的采样边界" ariaLabel="依赖与来源">
        <InspectorFacts facts={[
          { label: "采样来源", value: evidence.sourceTable },
          { label: "对象序列", value: evidence.series || "未取得" },
          { label: "判断边界", value: "只描述资源压力，不推断网络中断" },
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
            aria-label="打开采样审计"
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
