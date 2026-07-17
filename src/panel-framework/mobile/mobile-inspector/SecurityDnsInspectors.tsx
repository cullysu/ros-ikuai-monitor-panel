import type { SectionModel } from "../../sections/sectionModels";
import type { DnsRowEvidence, SecurityRowEvidence } from "../../sections/sectionRowEvidence";
import { formatRfc3339Local } from "../../timeContract";
import type { WorkspaceRow } from "../mobileDomainWorkspaceModel";
import {
  InspectorDisclosure,
  InspectorFacts,
  InspectorMessage,
  InspectorSection,
  displayBytes,
  displayList,
  displayState,
  displayValue,
  observedLabel,
} from "./InspectorPrimitives";

function securitySeverityTone(evidence: SecurityRowEvidence): "neutral" | "warn" | "danger" {
  if (evidence.severity === "critical" || evidence.severity === "error") return "danger";
  if (evidence.severity === "warning") return "warn";
  return "neutral";
}

export function SecurityInspector({
  row,
}: {
  row: WorkspaceRow;
  model: SectionModel;
}) {
  const evidence = row.evidence as SecurityRowEvidence;
  if (evidence.objectType === "alert") {
    const absolute = formatRfc3339Local(evidence.time);
    return (
      <>
        <InspectorSection title="告警事件" tone={securitySeverityTone(evidence)}>
          <InspectorMessage tone={securitySeverityTone(evidence)}>
            {displayValue(evidence.message, "没有事件正文")}
          </InspectorMessage>
        </InspectorSection>
        <InspectorSection title="事件证据" note={absolute ? undefined : "原始时间缺少时区，不能当作绝对事件顺序"}>
          <InspectorFacts facts={[
            { label: absolute ? "绝对时间" : "原始时间", value: absolute || displayValue(evidence.time) },
            { label: "影响范围", value: displayValue(evidence.affected) },
            { label: "事件级别", value: evidence.severity === "unknown" ? "未确认" : evidence.severity },
          ]} />
        </InspectorSection>
        <InspectorDisclosure
          title="记录身份"
          note="用于深链恢复和事件去重"
          facts={[{ label: "对象 ID", value: row.id }]}
        />
      </>
    );
  }

  const hasCounter = evidence.packets !== null || evidence.bytes !== null;
  return (
    <>
      <InspectorSection title="规则判据" tone={evidence.disabled === true ? "warn" : "neutral"}>
        <InspectorFacts facts={[
          { label: "链", value: displayValue(evidence.chain) },
          { label: "动作", value: displayValue(evidence.action), tone: ["drop", "reject"].includes(evidence.action || "") ? "warn" : "neutral" },
          { label: "规则顺序", value: evidence.order === null ? "未取得" : `#${evidence.order}` },
          { label: "管理状态", value: observedLabel(evidence.disabled, "已停用", "已启用"), tone: evidence.disabled === true ? "warn" : "neutral" },
        ]} />
      </InspectorSection>
      <InspectorSection title="匹配条件" note="空值表示快照没有提供，不解释为任意匹配">
        <InspectorFacts facts={[
          { label: "入接口", value: displayValue(evidence.inInterface) },
          { label: "出接口", value: displayValue(evidence.outInterface) },
          { label: "源地址", value: displayValue(evidence.sourceAddress) },
          { label: "目标地址", value: displayValue(evidence.destinationAddress) },
        ]} />
      </InspectorSection>
      <InspectorSection title="计数器" note={hasCounter ? "只表示本次快照中的累计计数" : "本次快照未取得命中计数"}>
        <InspectorFacts facts={[
          { label: "数据包", value: displayValue(evidence.packets) },
          { label: "字节", value: displayBytes(evidence.bytes) },
          { label: "说明", value: displayValue(evidence.comment, "未记录") },
        ]} />
      </InspectorSection>
      <InspectorDisclosure
        title="原始规则身份"
        note="用于快照间稳定比对"
        facts={[{ label: "对象 ID", value: row.id }]}
      />
    </>
  );
}

function dnsObjectLabel(type: DnsRowEvidence["objectType"]): string {
  if (type === "rule") return "静态规则";
  if (type === "ipv6-nd") return "IPv6 ND";
  return "DHCPv6 客户端";
}

export function DnsInspector({
  row,
}: {
  row: WorkspaceRow;
  model: SectionModel;
}) {
  const evidence = row.evidence as DnsRowEvidence;
  return (
    <>
      <InspectorSection title={dnsObjectLabel(evidence.objectType)}>
        <InspectorFacts facts={[
          { label: "名称 / 接口", value: displayValue(evidence.name, displayValue(evidence.interfaceName)) },
          { label: "记录类型", value: displayValue(evidence.recordType, dnsObjectLabel(evidence.objectType)) },
          { label: "目标 / 前缀", value: displayValue(evidence.target) },
          { label: "状态", value: evidence.disabled !== null ? observedLabel(evidence.disabled, "已停用", "已启用") : displayState(evidence.status) },
          { label: "TTL", value: displayValue(evidence.ttl) },
          { label: "说明", value: displayValue(evidence.comment, "未记录") },
        ]} />
      </InspectorSection>
      <InspectorSection title="DNS 配置边界" note="配置存在不等于解析成功；未执行外部 DNS 可达性推断">
        <InspectorFacts facts={[
          { label: "远程请求", value: observedLabel(evidence.remoteRequests, "允许", "未允许") },
          { label: "上游服务器", value: displayList(evidence.upstreamServers) },
          { label: "DoH 服务器", value: displayValue(evidence.dohServer, "未配置") },
          { label: "DoH 证书", value: observedLabel(evidence.verifyDohCert, "校验", "未校验") },
        ]} />
      </InspectorSection>
      {evidence.objectType !== "rule" ? (
        <InspectorSection title="IPv6 发布与路由">
          <InspectorFacts facts={[
            { label: "发布 DNS", value: observedLabel(evidence.advertiseDns, "是", "否") },
            { label: "Peer DNS", value: observedLabel(evidence.peerDns, "使用", "不使用") },
            { label: "发布地址", value: displayList(evidence.publishedDns) },
            { label: "添加默认路由", value: observedLabel(evidence.addDefaultRoute, "是", "否") },
          ]} />
        </InspectorSection>
      ) : null}
      <InspectorDisclosure
        title="记录身份"
        note="用于深链恢复和规则比对"
        facts={[{ label: "对象 ID", value: row.id }]}
      />
    </>
  );
}
