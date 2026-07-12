import { useState, type CSSProperties } from "react";
import type { MobileOverviewModel } from "../mobileOverviewModel";
import type { AppRankingRow } from "./MobileOverviewTypes";
import { toneClass } from "./MobileOverviewUtils";

export function DeviceBar({ model }: { model: MobileOverviewModel }) {
  return (
    <nav
      className="ik-v420-nav ik-v240-nav ik-mobile-device-bar"
      aria-label="RouterOS 设备状态导航"
      data-overview-mobile-v420-nav="ios-navigation"
      data-overview-mobile-v240-nav="app-navigation"
      data-overview-mobile-v1067-status-header="routeros-device-state-header-context-action-low-noise"
      data-overview-mobile-status-header="device-name-state-recent-only"
    >
      <div className="ik-mobile-device-title" data-overview-mobile-primary-title="device">
        <b>{model.header.deviceName}</b>
        <span>只读观察 · 最近 {model.header.recent}</span>
      </div>
      <strong
        className={`ik-v240-status ${toneClass(model.header.tone)}`}
        data-overview-mobile-primary-status="device-state"
        aria-label={`设备状态 ${model.header.statusLabel}`}
      >
        <i aria-hidden="true" />
        {model.header.statusLabel}
      </strong>
    </nav>
  );
}
export function CoreFacts({ model }: { model: MobileOverviewModel }) {
  const facts = model.coreMetrics;
  return (
    <section
      className="ik-v240-facts ik-v240-strip ik-mobile-core-facts"
      aria-label="移动端四项核心事实"
      data-overview-mobile-core-block="four-core-facts"
      data-overview-mobile-v240-facts="wan-collection-resource-snapshot"
      data-overview-mobile-v240-status-strip="four-facts"
      data-overview-mobile-v1065-normal-summary-strip={model.priority === "normal" ? "model-backed-status-wan-collection-resource-snapshot" : undefined}
      data-overview-mobile-v1044-metric-grid="wan-collection-resource-snapshot-four-core-facts"
      data-overview-mobile-v1044-metric-count={facts.length}
    >
      {facts.map((item) => (
        <span
          className={toneClass(item.tone)}
          data-overview-mobile-v1065-summary-cell={item.label === "WAN" ? "wan" : item.label === "采集" ? "collection" : item.label === "资源" ? "resource" : "snapshot"}
          key={`${item.label}-${item.value}`}
        >
          <em>{item.label}</em>
          <strong>{item.value}</strong>
          <small>{item.note}</small>
        </span>
      ))}
    </section>
  );
}

function rowIcon(row: AppRankingRow): string {
  if (row.evidenceRole === "primary-impact") return "!";
  if (row.evidenceSource === "resource") return "%";
  if (row.evidenceSource === "interface") return "if";
  if (row.evidenceSource === "collection" || row.evidenceSource === "snapshot") return "log";
  return row.rank ? String(row.rank) : "•";
}

function supportingCopy(model: MobileOverviewModel): { title: string; summary: string; action: string } {
  if (model.priority === "normal") return { title: "运行明细", summary: "默认路由 · 采集 · 快照", action: "查看运行明细" };
  if (model.priority === "wan-offline") return { title: "处理", summary: "出口 · 默认路由 · 最近成功", action: "查看出口详情" };
  if (model.priority === "snapshot-missing") return { title: "处理", summary: "数据边界 · 最近成功", action: "查看数据边界" };
  if (model.priority === "collection-degraded") return { title: "处理", summary: "采集通道 · 缓存快照", action: "查看采集详情" };
  if (model.priority === "resource-full") return { title: "处理", summary: "资源压力 · 阈值持续", action: "查看资源详情" };
  return { title: "处理", summary: "受影响接口 · 默认路由", action: "查看接口详情" };
}

export function SupportingList({ model }: { model: MobileOverviewModel }) {
  const [expanded, setExpanded] = useState(false);
  const rows = model.primaryList.rows.slice(0, model.priority === "normal" ? 3 : 4);
  const copy = supportingCopy(model);
  const listStyle = { "--mobile-list-count": rows.length } as CSSProperties;
  return (
    <section
      className="ik-v420-surface ik-v240-facts ik-mobile-supporting-surface"
      data-overview-mobile-core-block="ios-router-home-surface"
      data-overview-mobile-v1060-surface-policy={model.surface.contract}
      data-overview-mobile-v1060-surface-slots={model.surface.slots.join("/")}
      data-overview-mobile-surface-order={model.surface.orderContract}
      data-overview-mobile-ranking-policy={model.surface.ranking}
      data-overview-mobile-list-kind={model.surface.listKind}
      data-overview-mobile-impact-scope={model.impactScope.id}
      data-overview-mobile-impact-plane={model.impactScope.plane}
      data-overview-mobile-terminal-ranking-mounted={model.surface.terminalRankingMounted}
      data-overview-mobile-terminal-ranking-state={model.surface.terminalRankingState}
      data-overview-mobile-normal-ranking={model.surface.normalRanking}
      data-overview-mobile-v1070-grouped-surface="separator-only-status-list-no-card-stack"
      data-overview-mobile-v1080-surface="one-supporting-list-no-duplicate-status-ledger"
      data-overview-mobile-supporting-surface="detail-entry-evidence-below-primary-task"
      data-overview-mobile-detail-expanded={expanded ? "true" : "false"}
      style={listStyle}
    >
      <div
        className="ik-v420-list ik-v420-app-list ik-v240-list ik-mobile-supporting-list"
        data-overview-mobile-list-kind={model.surface.listKind}
        data-overview-mobile-rank-list={model.surface.rankListKind}
        data-overview-mobile-v420-list="native-router-list"
        data-overview-mobile-v240-list={model.surface.v240ListKind}
        data-overview-mobile-impact-scope-line={`${model.impactScope.id}:${model.impactScope.plane}`}
        data-overview-mobile-detail-expanded={expanded ? "true" : "false"}
      >
        <header>
          <b>{copy.title}</b>
          <span>{copy.summary}</span>
          <em className={toneClass(model.impactScope.tone)}>{model.impactScope.label} · {model.impactScope.value}</em>
        </header>
        <button
          className={`ik-mobile-detail-entry ${toneClass(model.impactScope.tone)}`}
          data-overview-mobile-detail-entry="evidence-ranking-drilldown"
          aria-controls="mobile-supporting-detail-rows"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          <span>
            <b>{expanded ? "收起详情" : copy.action}</b>
            <em>{model.primaryList.meta}</em>
          </span>
          <strong>{rows.length} 项</strong>
        </button>
        <div
          className="ik-mobile-supporting-detail-rows"
          id="mobile-supporting-detail-rows"
          data-overview-mobile-deferred-rows="evidence-below-mobile-home-task"
          data-overview-mobile-detail-expanded={expanded ? "true" : "false"}
          aria-hidden={!expanded}
        >
          {rows.map((row) => (
            <article
              className={`ik-v420-list-row ik-mobile-deferred-row ${toneClass(row.tone)}`}
              data-overview-mobile-v1061-evidence-layer={row.evidenceLayer}
              data-overview-mobile-v1061-evidence-source={row.evidenceSource}
              data-overview-mobile-v1061-evidence-role={model.priority === "normal" && row.evidenceRole === "secondary-evidence" ? "operational-context" : row.evidenceRole}
              data-overview-mobile-v1061-evidence-key={row.evidenceKey}
              key={row.id}
            >
              <i className="ik-mobile-row-token" data-rank={row.rank}>{rowIcon(row)}</i>
              <span>
                <b>{row.name}</b>
                <em>{row.meta}</em>
              </span>
              <strong>
                <b>{row.value}</b>
                <small>{row.status || row.kind || "参考"}</small>
              </strong>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
