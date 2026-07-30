import { formatRfc3339Local } from "../../timeContract";
import type { SectionModel } from "../../sections/sectionModels";
import type { ServiceLogRowEvidence } from "../../sections/serviceLogEvidenceTypes";
import type { WorkspaceRow } from "../mobileDomainWorkspaceModel";
import {
  InspectorDisclosure,
  InspectorFacts,
  InspectorMessage,
  InspectorRelations,
  InspectorSection,
  displayValue,
} from "./InspectorPrimitives";

const SERVICE_CATEGORY_LABELS: Record<ServiceLogRowEvidence["serviceCategory"], string> = {
  system: "系统",
  firewall: "防火墙",
  dhcp: "DHCP",
  dns: "DNS",
  unknown: "来源未确认",
};

export function ServiceLogInspector({
  row,
  model,
}: {
  row: WorkspaceRow;
  model: SectionModel;
}) {
  const evidence = row.evidence as ServiceLogRowEvidence;
  const absolute = formatRfc3339Local(evidence.time);
  const category = SERVICE_CATEGORY_LABELS[evidence.serviceCategory];
  const modeNote = model.evidenceMode === "historical"
    ? "当前页面只显示最近成功快照中的历史服务记录"
    : "分类记录不能单独证明服务当前健康";

  return (
    <div data-service-log-inspector="true">
      <InspectorSection title="服务来源" note={modeNote}>
        <InspectorFacts facts={[
          { label: "服务类别", value: category },
          { label: "来源集合", value: displayValue(evidence.sourceCollection), valueKind: "machine" },
          { label: "分类状态", value: evidence.categoryStatus === "observed" ? "已定位来源" : "来源不可用" },
          { label: "事件级别", value: displayValue(evidence.severity) },
        ]} />
      </InspectorSection>
      <InspectorSection title="事件证据" note="详情补充来源与时区证据，不重复放大事件正文">
        <InspectorFacts facts={[
          { label: absolute ? "绝对时间" : "原始时间", value: absolute || displayValue(evidence.time), valueKind: "machine" },
          { label: "记录来源", value: displayValue(evidence.source) },
          { label: "相邻记录", value: `${evidence.neighbors.length} 条`, valueKind: "numeric" },
        ]} />
      </InspectorSection>
      <InspectorSection title="相邻服务事件" note="只作为时间邻接证据，不推断服务状态">
        {evidence.neighbors.length ? (
          <InspectorRelations rows={evidence.neighbors.map((neighbor) => ({
            primary: displayValue(neighbor.message, "没有事件正文"),
            secondary: `${neighbor.relation === "newer" ? "较新" : "较旧"} · ${formatRfc3339Local(neighbor.time) || displayValue(neighbor.time)}`,
          }))} />
        ) : <InspectorMessage>没有可用于当前判断的服务日志相邻记录。</InspectorMessage>}
      </InspectorSection>
      <InspectorDisclosure
        title="服务记录身份"
        note="用于分类、深链恢复和重复记录比对"
        facts={[
          { label: "对象 ID", value: row.id, valueKind: "machine" },
          { label: "来源集合", value: displayValue(evidence.sourceCollection), valueKind: "machine" },
        ]}
      />
    </div>
  );
}
