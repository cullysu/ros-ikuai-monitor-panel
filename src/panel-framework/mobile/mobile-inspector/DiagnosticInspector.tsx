import { formatRfc3339Local } from "../../timeContract";
import { diagnosticChannelLabel, diagnosticFailureLabel } from "../../sections/diagnosticFailureModel";
import type { DiagnosticRowEvidence } from "../../sections/sectionRowEvidence";
import type { WorkspaceRow } from "../mobileDomainWorkspaceModel";
import {
  InspectorDisclosure,
  InspectorFacts,
  InspectorMessage,
  InspectorReadings,
  InspectorSection,
  displayValue,
} from "./InspectorPrimitives";

export function DiagnosticInspector({ row, current }: { row: WorkspaceRow; current: boolean }) {
  const evidence = row.evidence as DiagnosticRowEvidence;
  const label = diagnosticChannelLabel(evidence.channel);
  const observedAt = evidence.recordedAt ? formatRfc3339Local(evidence.recordedAt) : null;
  const channelScope = evidence.sameChannelFailureCount > 0
    ? `${evidence.sameChannelFailureCount} 个端点`
    : "未记录端点数量";
  const totalScope = evidence.totalFailureCount > 0
    ? `${evidence.totalFailureCount} 个端点`
    : "未记录总数";

  return (
    <>
      <InspectorSection title={`${diagnosticFailureLabel(current)}证据`}>
        <InspectorFacts facts={[
          { label: "采集通道", value: label },
          { label: "传输", value: evidence.transport },
          { label: "记录时间", value: observedAt || "未记录有效 RFC 3339 时间", valueKind: "machine" },
          { label: "端点返回", value: displayValue(evidence.message), tone: "warn" },
          ...(evidence.channelError && evidence.channelError !== evidence.message
            ? [{ label: "通道记录", value: evidence.channelError }]
            : []),
        ]} />
      </InspectorSection>
      <InspectorSection title="记录范围">
        <InspectorReadings
          left={{ label: "本通道", value: channelScope }}
          right={{ label: "全部通道", value: totalScope }}
        />
      </InspectorSection>
      <InspectorMessage>端点失败；不证明转发面或外部业务中断</InspectorMessage>
      <InspectorDisclosure
        title="原始对象身份"
        note="ID"
        facts={[
          { label: "对象 ID", value: row.id, valueKind: "machine" },
          { label: "原始名称", value: displayValue(evidence.objectName), valueKind: "machine" },
          { label: "采集组", value: displayValue(evidence.group), valueKind: "machine" },
          { label: "请求路径", value: displayValue(evidence.endpoint, "未记录"), valueKind: "machine" },
        ]}
      />
    </>
  );
}
