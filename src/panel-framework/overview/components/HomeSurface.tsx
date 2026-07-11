import type { AppRankingRow, MobileOverviewResolvedProps } from "./MobileOverviewTypes";
import { toneClass } from "./MobileOverviewUtils";

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

function RankingList({ model }: MobileOverviewResolvedProps) {
  const rows: AppRankingRow[] = model.primaryList.rows;
  return (
    <section
      className="ik-v420-list ik-v420-app-list ik-v240-list"
      data-overview-mobile-list-kind={model.surface.listKind}
      data-overview-mobile-rank-list={model.surface.rankListKind}
      data-overview-mobile-v420-list="native-router-list"
      data-overview-mobile-v240-list={model.surface.v240ListKind}
    >
      <header>
        <b>{model.primaryList.title}</b>
        <span>{model.primaryList.meta}</span>
        <em
          className={`ik-v1020-impact-scope ${toneClass(model.impactScope.tone)}`}
          data-overview-mobile-impact-scope-line={`${model.impactScope.id}:${model.impactScope.plane}`}
        >
          {model.impactScope.label} · {model.impactScope.value} · {model.impactScope.note}
        </em>
      </header>
      {rows.map((row) => (
        <article
          className={`ik-v420-list-row ${toneClass(row.tone)}`}
          data-overview-mobile-v1061-evidence-layer={row.evidenceLayer}
          data-overview-mobile-v1061-evidence-source={row.evidenceSource}
          data-overview-mobile-v1061-evidence-role={row.evidenceRole}
          data-overview-mobile-v1061-evidence-key={row.evidenceKey}
          key={row.id}
        >
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

export function HomeSurface(props: MobileOverviewResolvedProps) {
  const { model } = props;
  return (
    <section
      className={`ik-v420-surface ik-v240-facts ${model.surface.className}`}
      data-overview-mobile-core-block="ios-router-home-surface"
      data-overview-mobile-v240-facts="timeline-resource-ranking"
      data-overview-mobile-v1060-surface-policy={model.surface.contract}
      data-overview-mobile-v1060-surface-slots={model.surface.slots.join("/")}
      data-overview-mobile-surface-order={model.surface.orderContract}
      data-overview-mobile-ranking-policy={model.surface.ranking}
      data-overview-mobile-list-kind={model.surface.listKind}
      data-overview-mobile-impact-scope={model.impactScope.id}
      data-overview-mobile-impact-plane={model.impactScope.plane}
      data-overview-mobile-abnormal-ia={model.appHomeContract.informationArchitecture}
      data-overview-mobile-terminal-ranking-state={model.surface.terminalRankingState}
      data-overview-mobile-terminal-ranking-mounted={model.surface.terminalRankingMounted}
      data-overview-mobile-normal-ranking={model.surface.normalRanking}
      data-overview-mobile-v1070-grouped-surface="separator-only-status-list-no-card-stack"
      data-overview-mobile-v1080-surface="one-supporting-list-no-duplicate-status-ledger"
    >
      <RankingList {...props} />
    </section>
  );
}
