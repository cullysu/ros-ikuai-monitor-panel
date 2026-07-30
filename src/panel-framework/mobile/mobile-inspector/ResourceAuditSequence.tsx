import { formatRfc3339Local } from "../../timeContract";
import type { ResourceRowEvidence } from "../../sections/sectionRowEvidence";
import { InspectorMessage, InspectorRelations, InspectorSection } from "./InspectorPrimitives";

export function ResourceAuditSequence({ evidence }: { evidence: ResourceRowEvidence }) {
  return (
    <InspectorSection title="采样序列" note="每个时间和值必须来自同一条有效样本" ariaLabel="采样序列">
      {evidence.samples.length ? (
        <InspectorRelations rows={evidence.samples.map((sample) => ({
          primary: `${sample.value}%`,
          secondary: formatRfc3339Local(sample.timestamp) || sample.timestamp,
          status: "已取得",
          primaryKind: "numeric",
        }))} />
      ) : (
        <InspectorMessage tone="warn">当前没有带时区的资源样本，不能把摘要解释为采样序列。</InspectorMessage>
      )}
    </InspectorSection>
  );
}
