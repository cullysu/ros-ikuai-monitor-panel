import type { SectionModel } from "../../sections/sectionModels";
import type { LogRowEvidence, TerminalRowEvidence } from "../../sections/sectionRowEvidence";
import { formatRfc3339Local } from "../../timeContract";
import type { WorkspaceRow } from "../mobileDomainWorkspaceModel";
import {
  InspectorDisclosure,
  InspectorFacts,
  InspectorMessage,
  InspectorReadings,
  InspectorRelations,
  InspectorSection,
  displayBytes,
  displayList,
  displayRate,
  displayValue,
} from "./InspectorPrimitives";

export function TerminalInspector({
  row,
  model,
}: {
  row: WorkspaceRow;
  model: SectionModel;
}) {
  const evidence = row.evidence as TerminalRowEvidence;
  const historical = model.evidenceMode === "historical";
  const hasAccessEvidence = [evidence.dhcpStatus, evidence.dhcpServer, evidence.arpStatus]
    .some((value) => Boolean(value));
  return (
    <>
      <InspectorSection title="身份依据" note="来源分开记录；没有来源不等于终端离线">
        <InspectorFacts facts={[
          { label: "主机名", value: displayValue(evidence.hostname) },
          { label: "IP", value: displayValue(evidence.ip) },
          { label: "MAC", value: displayValue(evidence.mac) },
          { label: "身份来源", value: displayList(evidence.identitySources) },
        ]} />
      </InspectorSection>
      <InspectorSection title={historical ? "历史负载" : "当前负载"} note={historical ? "来自最近成功快照" : undefined}>
        <InspectorReadings
          left={{ label: "下载", value: displayRate(evidence.downRate) }}
          right={{ label: "上传", value: displayRate(evidence.upRate) }}
        />
        <InspectorFacts facts={[
          { label: "连接记录", value: displayValue(evidence.connections) },
          { label: "会话字节", value: displayBytes(evidence.sessionBytes) },
        ]} />
      </InspectorSection>
      <InspectorSection title="接入关系">
        <InspectorFacts facts={[
          { label: "观测状态", value: displayValue(evidence.status, "未确认"), tone: evidence.status ? "neutral" : "warn" },
          { label: "接入接口", value: displayValue(evidence.interfaceName) },
          { label: "最后观察", value: displayValue(evidence.lastSeen) },
          { label: "在线布尔值", value: evidence.online === true ? "已观测在线" : evidence.online === false ? "已观测离线" : "未提供" },
        ]} />
      </InspectorSection>
      <InspectorSection title="DHCP / ARP 证据">
        {hasAccessEvidence ? (
          <InspectorFacts facts={[
            { label: "DHCP 状态", value: displayValue(evidence.dhcpStatus) },
            { label: "DHCP 服务器", value: displayValue(evidence.dhcpServer) },
            { label: "ARP 状态", value: displayValue(evidence.arpStatus) },
          ]} />
        ) : <InspectorMessage>本次快照没有可关联的 DHCP 或 ARP 记录。</InspectorMessage>}
      </InspectorSection>
      <InspectorDisclosure
        title="原始对象身份"
        note="用于深链恢复和重复对象比对"
        facts={[{ label: "对象 ID", value: row.id }]}
      />
    </>
  );
}

function severityLabel(severity: LogRowEvidence["severity"]): string {
  if (severity === "critical") return "严重";
  if (severity === "error") return "错误";
  if (severity === "warning") return "警告";
  if (severity === "info") return "信息";
  return "未确认";
}

export function LogInspector({
  row,
}: {
  row: WorkspaceRow;
  model: SectionModel;
}) {
  const evidence = row.evidence as LogRowEvidence;
  const absolute = formatRfc3339Local(evidence.time);
  const risky = evidence.severity === "critical" || evidence.severity === "error";
  return (
    <>
      <InspectorSection title="事件记录" tone={risky ? "danger" : evidence.severity === "warning" ? "warn" : "neutral"}>
        <InspectorMessage tone={risky ? "danger" : evidence.severity === "warning" ? "warn" : "neutral"}>
          {displayValue(evidence.message, "没有事件正文")}
        </InspectorMessage>
      </InspectorSection>
      <InspectorSection title="时间与级别" note={absolute ? "时间包含明确时区并按查看者本地时间显示" : "原始时间缺少时区，未作为绝对时间排序"}>
        <InspectorFacts facts={[
          { label: absolute ? "绝对时间" : "原始时间", value: absolute || displayValue(evidence.time) },
          { label: "事件级别", value: severityLabel(evidence.severity), tone: risky ? "danger" : evidence.severity === "warning" ? "warn" : "neutral" },
          { label: "主题", value: displayValue(evidence.topics) },
          { label: "来源组", value: displayValue(evidence.source) },
        ]} />
      </InspectorSection>
      <InspectorSection title="相邻事件" note="按有效 RFC 3339 时间排序；只显示当前记录附近的事件">
        {evidence.neighbors.length ? (
          <InspectorRelations rows={evidence.neighbors.map((neighbor) => ({
            primary: displayValue(neighbor.message, "没有事件正文"),
            secondary: `${neighbor.relation === "newer" ? "较新" : "较旧"} · ${formatRfc3339Local(neighbor.time) || displayValue(neighbor.time)}`,
            status: displayValue(neighbor.topics, "主题未记录"),
            tone: neighbor.severity === "critical" || neighbor.severity === "error"
              ? "danger"
              : neighbor.severity === "warning"
                ? "warn"
                : "neutral",
          }))} />
        ) : <InspectorMessage>当前快照没有可定位的相邻日志记录。</InspectorMessage>}
      </InspectorSection>
      <InspectorDisclosure
        title="记录身份"
        note="相同事件会确定性折叠"
        facts={[
          { label: "重复记录", value: row.duplicateCount > 1 ? `${row.duplicateCount} 条相同记录` : "1 条" },
          { label: "对象 ID", value: row.id },
        ]}
      />
    </>
  );
}
