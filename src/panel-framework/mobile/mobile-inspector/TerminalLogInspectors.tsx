import type { SectionModel } from "../../sections/sectionModels";
import type { LogRowEvidence, TerminalRowEvidence } from "../../sections/sectionRowEvidence";
import { ChevronRight } from "lucide-react";
import { formatRfc3339Local } from "../../timeContract";
import type { PanelNavigate } from "../../routes/panelRoutes";
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
  displayState,
  displayValue,
} from "./InspectorPrimitives";

export function TerminalInspector({
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
  const evidence = row.evidence as TerminalRowEvidence;
  const historical = model.evidenceMode === "historical";
  const displayedHostname = displayValue(evidence.hostname);
  const hasAccessEvidence = [evidence.dhcpStatus, evidence.dhcpServer, evidence.arpStatus]
    .some((value) => Boolean(value));
  const navigationEvidenceAt = evidenceAt || model.observedAt;
  const hasConnectionEvidence = [evidence.connections, evidence.downRate, evidence.upRate, evidence.sessionBytes]
    .some((value) => value !== null);
  const hasDownRate = evidence.downRate !== null;
  const hasUpRate = evidence.upRate !== null;
  const hasCompleteRateObservation = hasDownRate && hasUpRate;
  const openRelatedObject = () => {
    if (evidence.interfaceName) {
      onNavigate("interfaces", {
        returnRoute: "terminals",
        evidenceAt: navigationEvidenceAt,
      });
      return;
    }
    onNavigate("connections", {
      returnRoute: "terminals",
      evidenceAt: navigationEvidenceAt,
    });
  };
  return (
    <>
      <InspectorSection title="身份依据" note="来源分开记录；没有来源不等于终端离线">
        <InspectorFacts facts={[
          ...(displayedHostname === row.primary ? [] : [{ label: "主机名", value: displayedHostname }]),
          { label: "IP", value: displayValue(evidence.ip), valueKind: "machine" },
          { label: "MAC", value: displayValue(evidence.mac), valueKind: "machine" },
          { label: "身份来源", value: displayList(evidence.identitySources) },
        ]} />
      </InspectorSection>
      <InspectorSection title={historical ? "历史负载" : "当前负载"} note={historical ? "来自最近成功快照" : undefined}>
        {hasDownRate || hasUpRate ? (
          <InspectorReadings
            left={{ label: "下载", value: displayRate(evidence.downRate) }}
            right={{ label: "上传", value: displayRate(evidence.upRate) }}
          />
        ) : null}
        {!hasCompleteRateObservation ? (
          <InspectorFacts facts={[{
            label: "速率证据",
            value: hasDownRate || hasUpRate ? "连接记录未提供完整双向速率" : "本次连接记录未提供速率观测",
            tone: "warn",
          }]} />
        ) : null}
        <InspectorFacts facts={[
          { label: "连接记录", value: displayValue(evidence.connections) },
          { label: "会话字节", value: displayBytes(evidence.sessionBytes) },
        ]} />
      </InspectorSection>
      <InspectorSection title="接入关系">
        <InspectorFacts facts={[
          { label: "观测状态", value: displayState(evidence.status), tone: evidence.status ? "neutral" : "warn" },
          { label: "接入接口", value: displayValue(evidence.interfaceName) },
          { label: "最后观察", value: displayValue(evidence.lastSeen), valueKind: "machine" },
          { label: "在线布尔值", value: evidence.online === true ? "已观测在线" : evidence.online === false ? "已观测离线" : "未提供" },
        ]} />
      </InspectorSection>
      {evidence.interfaceName || hasConnectionEvidence ? (
        <section
          className="mdi-terminal-object-action"
          data-mobile-terminal-object-action="v1"
          data-mobile-terminal-evidence-at={navigationEvidenceAt || undefined}
          aria-label="下一步检查"
        >
          <div>
            <span>下一步检查</span>
            <p>{evidence.interfaceName ? "核对终端接入接口的运行状态" : "核对终端关联的连接记录"}</p>
          </div>
          <button type="button" onClick={openRelatedObject}>
            <span>{evidence.interfaceName ? "打开接口" : "打开连接"}</span>
            <ChevronRight aria-hidden="true" size={17} />
          </button>
        </section>
      ) : null}
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
        facts={[{ label: "对象 ID", value: row.id, valueKind: "machine" }]}
      />
    </>
  );
}

export function LogInspector({
  row,
}: {
  row: WorkspaceRow;
  model: SectionModel;
  preview?: boolean;
}) {
  const evidence = row.evidence as LogRowEvidence;
  const absolute = formatRfc3339Local(evidence.time);
  return (
    <>
      <InspectorSection title="事件证据" note={absolute ? "时间包含明确时区并按查看者本地时间显示" : "原始时间缺少时区，未作为绝对时间排序"}>
        <InspectorFacts facts={[
          { label: "事件正文", value: displayValue(evidence.message, "没有事件正文") },
          { label: absolute ? "绝对时间" : "原始时间", value: absolute || displayValue(evidence.time), valueKind: "machine" },
          { label: "主题", value: displayValue(evidence.topics) },
          { label: "来源组", value: displayValue(evidence.source) },
        ]} />
      </InspectorSection>
      <InspectorSection title="相邻事件" note="按有效 RFC 3339 时间排序；只显示当前记录附近的事件">
        {evidence.neighbors.length ? (
          <InspectorRelations rows={evidence.neighbors.map((neighbor) => ({
            primary: displayValue(neighbor.message, "没有事件正文"),
            secondary: `${neighbor.relation === "newer" ? "较新" : "较旧"} · ${formatRfc3339Local(neighbor.time) || displayValue(neighbor.time)}`,
          }))} />
        ) : <InspectorMessage>当前快照没有可定位的相邻日志记录。</InspectorMessage>}
      </InspectorSection>
      <InspectorDisclosure
        title="记录身份"
        note="相同事件会确定性折叠"
        facts={[
          { label: "重复记录", value: row.duplicateCount > 1 ? `${row.duplicateCount} 条相同记录` : "1 条", valueKind: "numeric" },
          { label: "对象 ID", value: row.id, valueKind: "machine" },
        ]}
      />
    </>
  );
}
