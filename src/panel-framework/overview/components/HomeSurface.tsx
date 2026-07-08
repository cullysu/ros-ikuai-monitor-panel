import { buildMobileOverviewModel } from "../mobileOverviewModel";
import type { AppRankingRow, MobileOverviewHomeProps, NativeRow } from "./MobileOverviewTypes";
import { toneClass } from "./MobileOverviewUtils";

function statusTimelineRows(props: MobileOverviewHomeProps): NativeRow[] {
  return buildMobileOverviewModel(props.snapshot, props.state).statusRows;
}

function statusCoreBlock(row: NativeRow): string | undefined {
  if (row.id === "timeline-wan") return "wan";
  if (row.id === "timeline-collection") return "collection";
  if (row.id === "timeline-resource") return "resource";
  return undefined;
}

function StatusTimeline(props: MobileOverviewHomeProps) {
  const rows = statusTimelineRows(props);
  return (
    <section className="ik-v420-timeline ik-v240-strip" data-overview-mobile-core-block="status-timeline" data-overview-mobile-v240-status-strip="timeline-not-kpi-grid" data-overview-mobile-no-four-kpi-grid="true">
      {rows.map((row) => {
        const coreBlock = statusCoreBlock(row);
        return (
        <article
          className={`ik-v420-timeline-row ik-mobile-status-strip ${toneClass(row.tone)}`}
          data-overview-mobile-core-block={coreBlock}
          data-row-id={row.id}
          key={row.id}
        >
          <i aria-hidden="true" />
          <b className="ik-v821-row-title">{row.title}</b>
          <strong>{row.value}</strong>
          <em className="ik-v821-row-note">{row.note}</em>
        </article>
        );
      })}
    </section>
  );
}

function rankingIconPath(row: AppRankingRow): string {
  const text = `${row.name} ${row.kind ?? ""} ${row.meta}`.toLowerCase();
  if (/iphone|手机|phone|访客/.test(text)) return "M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 15h2";
  if (/mac|book|电脑|pc|主机|下载/.test(text)) return "M4 5h16v10H4zM2 19h20M9 15v4M15 15v4";
  if (/nas|存储|server/.test(text)) return "M5 4h14v6H5zM5 14h14v6H5zM8 7h.01M8 17h.01";
  if (/tv|电视|盒子/.test(text)) return "M4 6h16v11H4zM9 20h6M12 17v3";
  if (/摄像|camera/.test(text)) return "M4 8h10v8H4zM14 11l6-3v8l-6-3z";
  if (/业务|快照|采集/.test(text)) return "M5 5h14v14H5zM8 9h8M8 13h8M8 17h5";
  return "M6 8h12v8H6zM9 5h6M9 19h6M12 5v3M12 16v3";
}

function RankingList(props: MobileOverviewHomeProps) {
  const model = buildMobileOverviewModel(props.snapshot, props.state);
  const rows: AppRankingRow[] = model.primaryList.rows;
  const isTerminalRanking = model.primaryList.kind === "terminal-ranking";
  return (
    <section
      className="ik-v420-list ik-v420-app-list ik-v240-list"
      data-overview-mobile-list-kind={model.primaryList.kind}
      data-overview-mobile-rank-list={isTerminalRanking ? "terminal-total-traffic-list" : undefined}
      data-overview-mobile-v420-list="native-router-list"
      data-overview-mobile-v240-list={isTerminalRanking ? "terminal-ranking" : "incident-objects"}
    >
      <header>
        <b>{model.primaryList.title}</b>
        <span>{model.primaryList.meta}</span>
      </header>
      {rows.map((row) => (
        <article className={`ik-v420-list-row ${toneClass(row.tone)}`} key={row.id}>
          <i className="ik-v503-device-icon" data-rank={row.rank}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={rankingIconPath(row)} /></svg>
          </i>
          <span>
            <b>{row.name}{row.kind ? <small className="ik-v807-kind">{row.kind}</small> : null}</b>
            <em>{row.meta}</em>
            {row.percent > 0 ? <u aria-hidden="true"><i style={{ width: `${row.percent}%` }} /></u> : null}
          </span>
          <strong>
            <b>{row.value}</b>
            <small>{row.status || row.kind || "在线"}</small>
          </strong>
        </article>
      ))}
    </section>
  );
}

export function HomeSurface(props: MobileOverviewHomeProps) {
  const model = buildMobileOverviewModel(props.snapshot, props.state);
  const incidentFirst = model.surface.order === "list-before-status";
  return (
    <section
      className={`ik-v420-surface ik-v240-facts ${incidentFirst ? "is-incident-first" : "is-ranking-first"} is-ranking-${model.surface.ranking}`}
      data-overview-mobile-core-block="ios-router-home-surface"
      data-overview-mobile-v240-facts="timeline-resource-ranking"
      data-overview-mobile-surface-order={incidentFirst ? "incident-before-status" : "status-before-ranking"}
      data-overview-mobile-ranking-policy={model.surface.ranking}
    >
      {incidentFirst ? <RankingList {...props} /> : <StatusTimeline {...props} />}
      {incidentFirst ? <StatusTimeline {...props} /> : <RankingList {...props} />}
    </section>
  );
}
