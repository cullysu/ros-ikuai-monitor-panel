import type { MobileOverviewModel } from "../mobileOverviewModel";
import type { AppRankingRow } from "./MobileOverviewTypes";
import { toneClass } from "./MobileOverviewUtils";

export function DeviceBar({ model }: { model: MobileOverviewModel }) {
  return (
    <nav
      className="ik-mobile-device-bar"
      aria-label="RouterOS 设备状态导航"
    >
      <div className="ik-mobile-device-title">
        <b>{model.header.deviceName}</b>
        <span>只读 · 不改配置 · {model.header.recent}</span>
      </div>
      <strong
        className={`ik-mobile-device-status ${toneClass(model.header.tone)}`}
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
      className="ik-mobile-core-facts"
      aria-label="移动端四项核心事实"
    >
      {facts.map((item) => (
        <span
          className={`ik-mobile-fact ${toneClass(item.tone)}`}
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

function supportingCopy(model: MobileOverviewModel): { title: string; summary: string } {
  if (model.priority === "normal") return { title: "运行明细", summary: "默认路由 · 采集 · 快照" };
  if (model.priority === "wan-offline") return { title: "处理", summary: "出口 · 默认路由 · 最近成功" };
  if (model.priority === "snapshot-missing") return { title: "处理", summary: "数据边界 · 最近成功" };
  if (model.priority === "collection-degraded") return { title: "处理", summary: "采集通道 · 缓存快照" };
  if (model.priority === "resource-full") {
    const primary = model.hero.resourceCells.find((item) => item.risk === "primary-risk") || model.hero.resourceCells[0];
    return { title: "处理", summary: primary ? `最高${primary.label} ${primary.display} · ${primary.sustainedText}` : "资源阈值持续超限" };
  }
  return { title: "处理", summary: "受影响接口 · 默认路由" };
}

export function SupportingList({ model }: { model: MobileOverviewModel }) {
  const rows = model.primaryList.rows.slice(0, model.priority === "normal" ? 3 : 4);
  const copy = supportingCopy(model);
  return (
    <section className="ik-mobile-supporting-surface">
      <div className="ik-mobile-supporting-list">
        <header className={`ik-mobile-supporting-head ${toneClass(model.impactScope.tone)}`}>
          <span className="ik-mobile-detail-copy">
            <em>{copy.title} · {copy.summary}</em>
            <b>{model.primaryList.title}</b>
            <small>{model.impactScope.value} · {model.primaryList.meta}</small>
          </span>
          <strong><b>{rows.length}</b><small>项</small></strong>
        </header>
        <div
          className="ik-mobile-supporting-detail-rows"
          id="mobile-supporting-detail-rows"
        >
          {rows.map((row) => (
            <article
              className={`ik-mobile-deferred-row ${toneClass(row.tone)}`}
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
