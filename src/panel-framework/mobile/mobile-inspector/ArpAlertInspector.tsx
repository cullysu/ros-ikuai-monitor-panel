import type { ArpAlertRowEvidence } from "../../sections/sectionRowEvidence";
import type { WorkspaceRow } from "../mobileDomainWorkspaceModel";
import {
  InspectorDisclosure,
  InspectorFacts,
  InspectorMessage,
  InspectorSection,
  displayValue,
} from "./InspectorPrimitives";

function toneFor(evidence: ArpAlertRowEvidence): "neutral" | "warn" | "danger" {
  return evidence.severity === "critical" || evidence.severity === "error"
    ? "danger"
    : evidence.severity === "warning" ? "warn" : "neutral";
}

export function ArpAlertInspector({ row }: { row: WorkspaceRow }) {
  const evidence = row.evidence as ArpAlertRowEvidence;
  const tone = toneFor(evidence);
  return (
    <>
      <InspectorSection title="身份告警" tone={tone}>
        <InspectorMessage tone={tone}>
          {displayValue(evidence.detail, "快照记录了身份异常，但没有提供事件正文")}
        </InspectorMessage>
      </InspectorSection>
      <InspectorSection title="对象证据" note="只展示 ARP 快照提供的事实，不推断外部攻击或业务影响">
        <InspectorFacts facts={[
          { label: "地址", value: displayValue(evidence.address) },
          { label: "MAC", value: displayValue(evidence.mac) },
          { label: "类型", value: displayValue(evidence.alertType, "未确认") },
          { label: "接口", value: displayValue(evidence.interfaceName) },
          { label: "级别", value: evidence.severity === "unknown" ? "未确认" : evidence.severity },
        ]} />
      </InspectorSection>
      <InspectorDisclosure
        title="记录身份"
        note="用于深链恢复和快照间比对"
        facts={[{ label: "对象 ID", value: row.id }]}
      />
    </>
  );
}
