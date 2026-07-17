import type { SectionModel } from "../../sections/sectionModels";
import type { InterfaceRowEvidence, RouteRowEvidence } from "../../sections/sectionRowEvidence";
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
  displayPercent,
  displayRate,
  displayValue,
  observedLabel,
} from "./InspectorPrimitives";

function InterfaceRelationship({ evidence }: { evidence: InterfaceRowEvidence }) {
  const activeRoutes = evidence.defaultRoutes.filter((route) => route.active === true && route.disabled !== true).length;
  const routeSummary = evidence.defaultRouteRelation === "direct"
    ? `${evidence.defaultRoutes.length} 条直接关联 · ${activeRoutes} 条活动记录`
    : "未取得直接关联";
  const relationRows = evidence.defaultRoutes.map((route) => ({
    primary: `${route.destination} → ${route.gateway}`,
    secondary: `${route.table} · distance ${displayValue(route.distance)}`,
    status: route.disabled === true ? "已停用" : route.active === true ? "活动" : route.active === false ? "非活动" : "未确认",
    tone: route.disabled === true || route.active === false ? "warn" as const : "neutral" as const,
  }));

  return (
    <InspectorSection
      title="依赖与路由"
      note={evidence.defaultRouteRelation === "direct" ? "只列出有明确对象关联的默认路由记录" : "没有把名称或角色推断成默认出口"}
      tone={evidence.running === false ? "danger" : "neutral"}
    >
      <InspectorFacts facts={[
        { label: "父级对象", value: displayValue(evidence.parent, "未取得") },
        { label: "默认路由", value: routeSummary, tone: evidence.defaultRouteRelation === "direct" ? "trust" : "warn" },
      ]} />
      {relationRows.length ? <InspectorRelations rows={relationRows} /> : null}
    </InspectorSection>
  );
}

export function InterfaceInspector({
  row,
  model,
}: {
  row: WorkspaceRow;
  model: SectionModel;
}) {
  const evidence = row.evidence as InterfaceRowEvidence;
  const down = evidence.running === false || evidence.disabled === true;
  const hasCounters = [
    evidence.rxBytes,
    evidence.txBytes,
    evidence.rxPackets,
    evidence.txPackets,
  ].some((value) => value !== null);
  const hasQuality = [evidence.dropTotal, evidence.errorTotal, evidence.lossRate, evidence.errorRate]
    .some((value) => value !== null);
  const readings = (
    <InspectorSection
      title={model.evidenceMode === "current" ? "当前读数" : "历史读数"}
      note={model.evidenceMode === "historical" ? "来自最近成功快照，不代表当前" : undefined}
    >
      <InspectorReadings
        left={{ label: "接收", value: displayRate(evidence.rxRate) }}
        right={{ label: "发送", value: displayRate(evidence.txRate) }}
      />
      {hasCounters ? (
        <InspectorFacts facts={[
          { label: "累计接收", value: displayBytes(evidence.rxBytes) },
          { label: "累计发送", value: displayBytes(evidence.txBytes) },
          { label: "接收包", value: displayValue(evidence.rxPackets) },
          { label: "发送包", value: displayValue(evidence.txPackets) },
        ]} />
      ) : <InspectorMessage>本次快照未采集累计字节与包计数。</InspectorMessage>}
    </InspectorSection>
  );
  const relationship = <InterfaceRelationship evidence={evidence} />;

  return (
    <>
      <InspectorSection title={down ? "影响判据" : "接口状态"} tone={down ? "danger" : "neutral"}>
        <InspectorFacts facts={[
          {
            label: "运行标志",
            value: observedLabel(evidence.running, "运行", "未运行"),
            tone: evidence.running === false ? "danger" : evidence.running === null ? "warn" : "trust",
          },
          {
            label: "管理状态",
            value: observedLabel(evidence.disabled, "已停用", "已启用"),
            tone: evidence.disabled === true ? "danger" : evidence.disabled === null ? "warn" : "neutral",
          },
          { label: "角色 / 类型", value: [evidence.role, evidence.interfaceType].filter(Boolean).join(" · ") || "未取得" },
          { label: "地址", value: displayList(evidence.addresses) },
        ]} />
      </InspectorSection>
      {down ? relationship : readings}
      {down ? readings : relationship}
      <InspectorSection
        title="链路质量"
        note={evidence.qualitySampleReady === true ? "基于已记录的质量采样" : "质量样本尚不足或未取得"}
        tone={(evidence.dropTotal || 0) > 0 || (evidence.errorTotal || 0) > 0 ? "warn" : "neutral"}
      >
        {hasQuality ? (
          <InspectorFacts facts={[
            { label: "丢包计数", value: displayValue(evidence.dropTotal) },
            { label: "错误计数", value: displayValue(evidence.errorTotal) },
            { label: "丢失率", value: displayPercent(evidence.lossRate) },
            { label: "错误率", value: displayPercent(evidence.errorRate) },
            { label: "有效样本", value: evidence.qualitySampleCount === null ? "未取得" : `${evidence.qualitySampleCount} 个` },
            { label: "样本时刻", value: displayValue(evidence.qualityUpdatedAt) },
          ]} />
        ) : <InspectorMessage>本次快照没有可计算的丢包、错误或质量样本。</InspectorMessage>}
      </InspectorSection>
      <InspectorDisclosure
        title="原始对象身份"
        note="用于深链恢复和对象比对"
        facts={[
          { label: "MAC", value: displayValue(evidence.mac) },
          { label: "VLAN", value: displayValue(evidence.vlanId) },
          { label: "网络", value: displayList(evidence.networks) },
          { label: "对象 ID", value: row.id },
        ]}
      />
    </>
  );
}

export function RouteInspector({
  row,
}: {
  row: WorkspaceRow;
  model: SectionModel;
}) {
  const evidence = row.evidence as RouteRowEvidence;
  const verified = evidence.isDefault && evidence.active === true && evidence.disabled === false;
  const related = evidence.relatedInterface;
  const hasInterfaceRates = Boolean(related && (related.rxRate !== null || related.txRate !== null));
  return (
    <>
      <InspectorSection title="活动判据" tone={verified ? "neutral" : evidence.active === false || evidence.disabled === true ? "warn" : "neutral"}>
        <InspectorFacts facts={[
          { label: "默认路由", value: evidence.isDefault ? "是" : "否", tone: evidence.isDefault ? "trust" : "neutral" },
          { label: "活动标志", value: observedLabel(evidence.active, "活动", "非活动"), tone: evidence.active === true ? "trust" : evidence.active === false ? "warn" : "warn" },
          { label: "管理状态", value: observedLabel(evidence.disabled, "已停用", "已启用"), tone: evidence.disabled === true ? "danger" : "neutral" },
          { label: "出口证据", value: verified ? "已验证记录" : "不可确认", tone: verified ? "trust" : "warn", note: verified ? "default + active + enabled" : "缺少完整活动判据" },
        ]} />
      </InspectorSection>
      <InspectorSection title="路径">
        <InspectorFacts facts={[
          { label: "目的", value: displayValue(evidence.destination) },
          { label: "网关 / 出接口", value: displayValue(evidence.gateway) },
          { label: "路由表", value: displayValue(evidence.table, "main") },
          { label: "距离", value: displayValue(evidence.distance) },
        ]} />
      </InspectorSection>
      <InspectorSection
        title="关联接口"
        note="只接受路由出接口或网关与接口对象的精确关联"
        tone={related?.running === false || related?.disabled === true ? "danger" : "neutral"}
      >
        {related ? (
          <>
            <InspectorFacts facts={[
              { label: "接口", value: related.name, tone: "trust" },
              { label: "状态", value: related.disabled === true ? "已停用" : observedLabel(related.running, "运行", "未运行"), tone: related.running === false || related.disabled === true ? "danger" : "trust" },
              { label: "角色 / 类型", value: [related.role, related.interfaceType].filter(Boolean).join(" · ") || "未取得" },
              { label: "关联方式", value: "精确对象匹配" },
            ]} />
            {hasInterfaceRates ? (
              <InspectorReadings
                left={{ label: "接口接收", value: displayRate(related.rxRate) }}
                right={{ label: "接口发送", value: displayRate(related.txRate) }}
              />
            ) : null}
          </>
        ) : <InspectorMessage>没有可验证的关联接口；未使用名称相似或首行对象进行猜测。</InspectorMessage>}
      </InspectorSection>
      <InspectorSection title="来源与标记">
        <InspectorFacts facts={[
          { label: "来源", value: displayValue(evidence.protocol, "未确认") },
          { label: "地址族", value: displayValue(evidence.family) },
          { label: "说明", value: displayValue(evidence.comment, "未记录") },
          { label: "对象 ID", value: row.id },
        ]} />
      </InspectorSection>
    </>
  );
}
