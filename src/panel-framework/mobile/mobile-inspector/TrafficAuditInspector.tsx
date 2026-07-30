import type { SectionModel } from "../../sections/sectionModels";
import type { ConnectionRowEvidence } from "../../sections/sectionRowEvidence";
import type { WorkspaceRow } from "../mobileDomainWorkspaceModel";
import {
  InspectorDisclosure,
  InspectorFacts,
  InspectorMessage,
  InspectorReadings,
  InspectorSection,
  displayBytes,
  displayRate,
  displayValue,
} from "./InspectorPrimitives";

export function TrafficAuditInspector({ row, model }: { row: WorkspaceRow; model: SectionModel }) {
  const evidence = row.evidence as ConnectionRowEvidence;
  const hasCounters = evidence.sessionBytes !== null || evidence.connections !== null || evidence.trafficBps !== null;
  const evidenceWindow = model.evidenceMode === "current"
    ? "当前快照"
    : model.evidenceMode === "historical"
      ? "历史快照"
      : "不可用快照";

  return (
    <>
      <InspectorSection title="流量对象" note="将来源、目标和协议作为同一条审计对象呈现">
        <InspectorFacts facts={[
          { label: "来源", value: displayValue(evidence.source), valueKind: "machine" },
          { label: "目标", value: displayValue(evidence.target), valueKind: "machine" },
          { label: "协议", value: displayValue(evidence.protocol), valueKind: "machine" },
          { label: "端口", value: [evidence.sourcePort, evidence.targetPort].filter(Boolean).join(" → ") || "未取得", valueKind: "numeric" },
        ]} />
      </InspectorSection>
      <InspectorSection title="审计读数" note={model.evidenceMode === "historical" ? "来自最近成功快照，不代表当前" : undefined}>
        {hasCounters ? (
          <>
            <InspectorReadings
              left={{ label: "流量", value: displayRate(evidence.trafficBps) }}
              right={{ label: "连接", value: displayValue(evidence.connections) }}
            />
            <InspectorFacts facts={[{ label: "会话字节", value: displayBytes(evidence.sessionBytes) }]} />
          </>
        ) : <InspectorMessage>本次快照没有可解释的流量或连接读数。</InspectorMessage>}
      </InspectorSection>
      <InspectorSection title="审计范围" note="审计对象不等于抓包内容；这里只读展示已采集的聚合证据">
        <InspectorFacts facts={[
          { label: "证据窗口", value: evidenceWindow, tone: model.evidenceMode === "current" ? "trust" : "warn" },
          { label: "采集时刻", value: displayValue(model.observedAt || model.updatedAt), valueKind: "machine" },
          { label: "来源表", value: displayValue(evidence.sourceTable), valueKind: "machine" },
        ]} />
      </InspectorSection>
      <InspectorDisclosure title="原始对象身份" note="用于流量审计对象比对与深链恢复" facts={[
        { label: "对象 ID", value: row.id, valueKind: "machine" },
        { label: "审计类型", value: "聚合流量对象" },
      ]} />
    </>
  );
}
