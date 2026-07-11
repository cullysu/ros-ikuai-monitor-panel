import type { CSSProperties } from "react";
import { MobileOverviewStyles } from "./MobileOverviewStyles";
import { buildMobileOverviewModel, type MobileOverviewModel } from "../mobileOverviewModel";
import { BottomTabs } from "./BottomTabs";
import type { AppRankingRow, MobileOverviewHomeProps } from "./MobileOverviewTypes";
import { toneClass } from "./MobileOverviewUtils";

type DecisionFact = MobileOverviewModel["coreMetrics"][number];

function primaryStatus(model: MobileOverviewModel): DecisionFact {
  return model.coreMetrics[0] || {
    label: "状态",
    value: model.network.conclusion.value,
    note: model.network.conclusion.note,
    tone: model.network.conclusion.tone,
  };
}

function factValue(model: MobileOverviewModel, label: string): string {
  return model.coreMetrics.find((item) => item.label === label)?.value || "-";
}

function decisionTitle(model: MobileOverviewModel): string {
  if (model.priority === "normal") {
    return "网络可用";
  }
  if (model.priority === "wan-offline") return "外网不可用";
  if (model.priority === "snapshot-missing") return "业务数据不可判";
  if (model.priority === "collection-degraded") return "采集不完整";
  if (model.priority === "resource-full") return "资源过载";
  if (model.priority === "interface-down") return "接口异常";
  return model.network.conclusion.value;
}

function decisionSubtitle(model: MobileOverviewModel): string {
  if (model.priority === "normal") {
    return `WAN ${factValue(model, "WAN")} · 默认路由${factValue(model, "默认路由")} · 快照 ${factValue(model, "快照")}`;
  }
  return `${model.impactScope.value} · ${model.appHomeContract.trustBoundary}`;
}

function nextStep(model: MobileOverviewModel): { value: string; note: string; tone: string } {
  const action = model.abnormalDecision.find((item) => item.label === "下一步");
  if (action) return { value: action.value, note: action.note, tone: toneClass(action.tone) };
  return { value: "查看 WAN", note: "默认路由 / 快照", tone: "is-trust" };
}

function factSet(model: MobileOverviewModel): DecisionFact[] {
  const resource: DecisionFact = {
    label: "资源",
    value: model.resourceRows.map((item) => item.value.replace(/\.0%$/, "%")).join("/") || "-",
    note: "处理器/内存/磁盘",
    tone: model.resourceRows.some((item) => item.tone === "danger")
      ? "danger"
      : model.priority === "snapshot-missing"
        ? "missing"
        : "ok",
  };
  const snapshot: DecisionFact = model.coreMetrics.find((item) => item.label === "快照") || {
    label: "快照",
    value: model.header.recent || "-",
    note: model.priority === "snapshot-missing" ? "业务快照缺失" : "最近成功",
    tone: model.priority === "snapshot-missing" ? "missing" : "ok",
  };
  const preferred = ["WAN", "采集", "资源", "快照"]
    .map((label) => (label === "资源" ? resource : label === "快照" ? snapshot : model.coreMetrics.find((item) => item.label === label)))
    .filter(Boolean) as DecisionFact[];
  return preferred.length === 4 ? preferred : model.coreMetrics.slice(1, 5);
}

function CompactJudgement({ model }: { model: MobileOverviewModel }) {
  const status = primaryStatus(model);
  return (
    <section
      className={`ik-v960-judgement-strip ${toneClass(status.tone)} ik-mobile-compact-judgement`}
      aria-label="移动端核心判断"
      data-overview-mobile-core-block="compact-conclusion"
      data-overview-mobile-v1044-judgement-strip="compact-conclusion-only"
      data-overview-mobile-v960-judgement="conclusion-and-impact"
      data-overview-mobile-v1090-decision-strip="conclusion-only-metrics-separated"
    >
      <strong>
        <i aria-hidden="true" />
        <span>网络结论</span>
        <b>{model.priority === "normal" ? "良好" : status.value}</b>
        <em>{status.note}</em>
      </strong>
    </section>
  );
}

function CompactTrust({ model }: { model: MobileOverviewModel }) {
  return (
    <section
      className="ik-v910-trust-strip ik-mobile-compact-trust"
      aria-label="RouterOS 可信度边界"
      data-overview-mobile-trust-strip="forwarding-collection-snapshot-business"
    >
      <span><b>转发</b><strong>{model.network.forwarding.value}</strong></span>
      <span><b>采集</b><strong>{factValue(model, "采集")}</strong></span>
      <span><b>快照</b><strong>{factValue(model, "快照")}</strong></span>
      {model.appHomeContract.severity === "normal" ? null : (
        <div
          className="ik-v1058-collection-trust-rail"
          data-overview-mobile-v1058-collection-trust="routeros-rest-ssh-snapshot-fixed-abnormal-first-screen"
          data-overview-mobile-v1059-collection-plane="collection-secondary-evidence-not-impact-verdict"
        >
          {model.collectionTrust.map((item) => (
            <span
              className={toneClass(item.tone)}
              data-overview-mobile-v1058-collection-channel={item.label}
              data-overview-mobile-v1059-plane="collection"
              key={`${item.label}-${item.value}`}
            >
              <i aria-hidden="true" />
              <b>{item.label}</b>
              <em>{item.value}</em>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function DeviceBar({ model }: { model: MobileOverviewModel }) {
  return (
    <nav
      className="ik-v420-nav ik-v240-nav ik-mobile-device-bar"
      aria-label="RouterOS 设备状态导航"
      data-overview-mobile-v420-nav="ios-navigation"
      data-overview-mobile-v240-nav="app-navigation"
      data-overview-mobile-v1067-status-header="routeros-device-state-header-context-action-low-noise"
    >
      <button
        className="ik-mobile-context-button"
        aria-label="打开 RouterOS 采集链路与设备上下文"
        data-overview-mobile-v1067-header-action="router-context"
        data-overview-mobile-v1067-header-action-semantic="device-collection-route-context"
        data-overview-mobile-v1067-header-action-tone="low-noise-outline"
        type="button"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M7 12h10M9 17h6M6 7l2-3h8l2 3M8 20h8" /></svg>
      </button>
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

function WanDecisionSpark({ model }: { model: MobileOverviewModel }) {
  const chart = model.hero.trend;
  const plot = chart.plot;
  const anomaly = (chart.anomalyLabel || "0").replace(/^异常点\s*/, "");
  const chartDecision = `当前 ${chart.currentLabel} · 峰值 ${chart.peakLabel} · 阈值 ${chart.thresholdLabel} · 异常 ${anomaly} · 采样 ${chart.sampleText}`;
  return (
    <div className="ik-mobile-decision-trend" data-overview-mobile-v1072-chart="decision-plot-two-series-three-by-two-readout">
      <div className="ik-mobile-decision-trend-plot">
        <div className="ik-v1072-chart-head">
          <span className="ik-v1065-chart-kicker" data-overview-mobile-v1065-chart-label="normal-visible-compact">WAN 实时趋势</span>
          <div className="ik-v1072-series-legend" data-overview-mobile-v1072-series-legend="download-upload" aria-label="下载与上传图例">
            <span className="is-download"><i aria-hidden="true" />下载</span>
            <span className="is-upload"><i aria-hidden="true" />上传</span>
          </div>
        </div>
        <div
          className="ik-mobile-decision-visual ik-v240-traffic"
          data-overview-chart-type="line"
          data-overview-scene-chart="mobile-wan-rate-sparkline"
          data-overview-mobile-first-visual="wan-rate-decision-spark"
          data-overview-mobile-first-microchart="true"
          data-overview-mobile-v240-visual="wan-rate-line"
          data-overview-mobile-chart-window={chart.windowText}
          data-overview-mobile-chart-peak={chart.peakLabel}
          data-overview-mobile-chart-sample={chart.sampleText}
          data-overview-mobile-chart-reference={chart.referenceLabel}
        >
          <svg
            className="ik-mobile-line-chart"
            viewBox={`0 0 312 ${Math.max(plot.viewHeight, 76)}`}
            role="img"
            aria-label={`${chart.windowText} WAN 实时趋势，当前 ${chart.currentLabel}，峰值 ${chart.peakLabel}`}
            data-overview-mobile-v1012-product-chart="window-current-peak-threshold-sample-breach"
            data-overview-mobile-v1045-product-chart-decision="window-current-peak-threshold-sample-anomaly-source"
            data-overview-mobile-v1057-chart-plot-model="view-model-svg-points-threshold-peak-breach"
            data-overview-mobile-chart-threshold={chart.thresholdLabel}
            data-overview-mobile-chart-breach={chart.breachLabel}
            data-overview-mobile-chart-anomaly={`异常点 ${anomaly}`}
            data-overview-mobile-chart-decision={chartDecision}
          >
            <path className="ik-v420-gridline ik-mobile-decision-grid" d={plot.gridYs.map((y) => `M0 ${y} H312`).join(" ")} />
            <path className="ik-v945-reference-line ik-mobile-decision-ref" d={`M0 ${plot.referenceY} H312`} />
            <polyline className="ik-v420-curve is-main ik-mobile-decision-line is-download" points={plot.downPoints} />
            <polyline className="ik-v420-curve is-soft ik-mobile-decision-line is-upload" points={plot.upPoints} />
            <circle className="ik-v420-peak-dot" cx={plot.peak.x} cy={plot.peak.y} r="2.6" />
            <circle className="ik-v420-focus-dot ik-mobile-decision-dot" cx={plot.focus.x} cy={plot.focus.y} r="3" />
          </svg>
        </div>
      </div>
      <i className="ik-v812-trend-visual ik-mobile-decision-trend-anchor" aria-hidden="true" />
      <div
        className="ik-v1010-chart-readout-rail ik-mobile-decision-readouts"
        data-overview-mobile-chart-readout-rail="current-peak-window-threshold-sample-anomaly"
        data-overview-mobile-v1045-chart-readouts="window-current-peak-threshold-sample-anomaly-source"
        data-overview-mobile-v1072-readout-grid="three-columns-two-rows-six-decisions"
        data-overview-mobile-hero-metrics="current-peak-window-threshold-sample-anomaly"
        data-overview-mobile-v240-big-numbers="current-rate"
      >
        <span><em>当前</em><b>{chart.currentLabel}</b></span>
        <span><em>峰值</em><b>{chart.peakLabel}</b></span>
        <span><em>窗口</em><b>{chart.windowText}</b></span>
        <span><em>阈值</em><b>{chart.thresholdLabel}</b></span>
        <span><em>采样</em><b>{chart.sampleText}</b></span>
        <span><em>异常</em><b>{anomaly}</b></span>
      </div>
    </div>
  );
}

function ResourceDecisionVisual({ model }: { model: MobileOverviewModel }) {
  return (
    <div
      className="ik-mobile-decision-visual ik-v420-resource-meter-set ik-density-resource-ledger ik-v1040-resource-ledger ik-mobile-resource-incident-stack"
      data-overview-chart-type="bar"
      data-overview-scene-chart="mobile-resource-decision-bars"
      data-overview-mobile-first-visual="resource-pressure-bars"
      data-overview-mobile-first-microchart="true"
      data-overview-mobile-v240-visual="resource-pressure-bars"
      data-overview-mobile-v1040-resource-pressure="low-noise-threshold-ledger-no-red-blue-race"
      data-overview-mobile-v1056-resource-visual="view-model-resource-threshold-sustained-risk-cells"
      data-overview-mobile-resource-tone-policy="neutral-bars-risk-label-only"
    >
      <AbnormalDecisionRail model={model} />
      {model.hero.resourceCells.map((item) => (
        <span
          className={`ik-mobile-resource-line ${toneClass(item.tone)}`}
          data-overview-mobile-resource-row={item.key}
          data-overview-mobile-resource-risk={item.risk}
          key={item.key}
        >
          <b>{item.label}</b>
          <i aria-hidden="true"><u style={{ width: item.meterPercent }} /></i>
          <strong>{item.display}</strong>
          <small>{item.thresholdText}</small>
          <em>{item.sustainedText}</em>
        </span>
      ))}
    </div>
  );
}

function AbnormalDecisionRail({ model }: { model: MobileOverviewModel }) {
  return (
    <div
      className="ik-v1046-abnormal-decision-rail ik-mobile-abnormal-decision-rail"
      data-overview-mobile-v1046-abnormal-decision-rail="object-impact-evidence-next-action"
      data-overview-mobile-v1046-abnormal-decision-ia={model.appHomeContract.informationArchitecture}
      data-overview-mobile-v1046-abnormal-decision-priority={model.priority}
      data-overview-mobile-v1046-abnormal-decision-scope={`${model.impactScope.id}:${model.impactScope.plane}`}
    >
      {model.abnormalDecision.map((item) => (
        <span
          className={toneClass(item.tone)}
          data-overview-mobile-v1046-abnormal-decision-cell={item.label}
          key={item.label}
        >
          <em>{item.label}</em>
          <b>{item.value}</b>
          <strong>{item.note}</strong>
        </span>
      ))}
    </div>
  );
}

function ChannelDecisionVisual({ model }: { model: MobileOverviewModel }) {
  return (
    <div
      className="ik-mobile-decision-visual ik-v240-channel-line ik-mobile-channel-incident-stack"
      data-overview-chart-type="status"
      data-overview-mobile-first-visual="collection-snapshot-status-line"
      data-overview-mobile-first-microchart="true"
      data-overview-mobile-v240-visual="collection-snapshot-status-line"
      data-overview-mobile-v1055-channel-rail="view-model-routeros-rest-ssh-snapshot-trust-cells"
    >
      <AbnormalDecisionRail model={model} />
      {model.priority === "snapshot-missing" ? (
        <span className="is-missing" data-overview-mobile-trust-boundary-label="business-snapshot-missing">
          <i aria-hidden="true" />
          <b>可信边界</b>
          <strong>业务快照缺失</strong>
        </span>
      ) : null}
      {model.hero.channelCells.map((item) => (
        <span className={toneClass(item.tone)} key={item.label}>
          <i aria-hidden="true" />
          <b>{item.label}</b>
          <strong>{item.value}</strong>
        </span>
      ))}
    </div>
  );
}

function IncidentDecisionVisual({ model }: { model: MobileOverviewModel }) {
  return (
    <div
      className="ik-mobile-decision-visual ik-mobile-generic-incident-stack"
      data-overview-chart-type="status"
      data-overview-mobile-first-visual="incident-object-impact-next-step"
      data-overview-mobile-first-microchart="true"
      data-overview-mobile-v240-visual="incident-decision-line"
    >
      <AbnormalDecisionRail model={model} />
    </div>
  );
}

function WanIncidentVisual({ model }: { model: MobileOverviewModel }) {
  return (
    <div
      className="ik-mobile-decision-visual ik-v240-flow ik-v420-port-matrix ik-mobile-wan-incident-stack"
      data-overview-chart-type="status"
      data-overview-mobile-first-visual="wan-incident-summary"
      data-overview-mobile-first-microchart="true"
      data-overview-mobile-v240-visual="wan-incident-summary"
      data-overview-mobile-v1042-wan-port-matrix="compact-router-port-matrix-interface-state-carrier-no-toy-capsules"
      data-overview-mobile-v1054-wan-port-model="view-model-carrier-state-no-jsx-note-split"
      data-overview-mobile-v1062-wan-role-model="default-backup-member-impact-route-binding"
    >
      <AbnormalDecisionRail model={model} />
      {model.wanPorts.slice(0, 4).map((port) => (
        <span
          className={port.portState === "down" ? "is-danger" : "is-ok"}
          data-overview-mobile-wan-port-cell="router-port"
          data-overview-mobile-wan-port-carrier={port.carrier}
          data-overview-mobile-wan-port-interface={port.name}
          data-overview-mobile-wan-port-state={port.portState}
          data-overview-mobile-v1062-wan-role={port.role}
          data-overview-mobile-v1062-wan-impact={port.impact}
          data-overview-mobile-v1062-wan-business-impact={port.businessImpact}
          data-overview-mobile-v1062-wan-route-binding={port.routeBinding}
          key={port.id}
        >
          <i aria-hidden="true" />
          <b>{port.name}</b>
          <strong data-overview-mobile-wan-port-state={port.portState}>{port.stateText}</strong>
          <em data-overview-mobile-wan-port-carrier>{port.carrier}</em>
        </span>
      ))}
    </div>
  );
}

function DecisionVisual({ model }: { model: MobileOverviewModel }) {
  if (model.priority === "normal") return <WanDecisionSpark model={model} />;
  if (model.priority === "resource-full") return <ResourceDecisionVisual model={model} />;
  if (model.priority === "snapshot-missing" || model.priority === "collection-degraded") return <ChannelDecisionVisual model={model} />;
  if (model.priority === "wan-offline") return <WanIncidentVisual model={model} />;
  return <IncidentDecisionVisual model={model} />;
}

function PrimaryDecision({ model }: { model: MobileOverviewModel }) {
  const status = primaryStatus(model);
  const action = nextStep(model);
  return (
    <section
      className={`ik-v420-hero ik-v240-hero ik-v159-network-hero ik-mobile-decision-card ${toneClass(status.tone)}`}
      aria-label="移动端网络状态结论"
      data-overview-mobile-alert={status.tone}
      data-overview-mobile-v420-hero="network-state-home"
      data-overview-mobile-v240-hero="network-state-home"
      data-overview-mobile-v159-main-hero="network-state-home"
      data-overview-mobile-hero-metrics="decision-current-evidence"
      data-overview-mobile-priority={model.priority}
      data-overview-mobile-visual-kind={model.hero.visualKind}
      data-overview-mobile-hero-ranking-policy={model.appHomeContract.rankingPolicy}
      data-overview-mobile-v1065-normal-hero={model.priority === "normal" ? "chart-first-no-promo-headline" : undefined}
      data-overview-mobile-decision-card="one-conclusion-one-impact-one-next-step"
      data-overview-primary-conclusion="true"
    >
      <div className="ik-mobile-decision-head">
        <span>{model.appHomeContract.firstQuestion}</span>
        <h1>{decisionTitle(model)}</h1>
        <p>{decisionSubtitle(model)}</p>
      </div>
      <DecisionVisual model={model} />
      <div className={`ik-mobile-next-step ${action.tone}`} data-overview-mobile-next-step="object-impact-credibility-action">
        <span>下一步</span>
        <b>{action.value}</b>
        <em>{action.note}</em>
      </div>
    </section>
  );
}

function CoreFacts({ model }: { model: MobileOverviewModel }) {
  const facts = factSet(model);
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

function SupportingList({ model }: { model: MobileOverviewModel }) {
  const rows = model.primaryList.rows.slice(0, model.priority === "normal" ? 3 : 4);
  const title = model.priority === "normal" ? "运营摘要 · 终端流量参考" : "异常证据";
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
      style={listStyle}
    >
      <div
        className="ik-v420-list ik-v420-app-list ik-v240-list ik-mobile-supporting-list"
        data-overview-mobile-list-kind={model.surface.listKind}
        data-overview-mobile-rank-list={model.surface.rankListKind}
        data-overview-mobile-v420-list="native-router-list"
        data-overview-mobile-v240-list={model.surface.v240ListKind}
        data-overview-mobile-supporting-list="below-decision-not-primary-home-task"
        data-overview-mobile-impact-scope-line={`${model.impactScope.id}:${model.impactScope.plane}`}
      >
        <header>
          <b>{title}</b>
          <span>{model.primaryList.meta}</span>
          <em className={toneClass(model.impactScope.tone)}>{model.impactScope.label} · {model.impactScope.value}</em>
        </header>
        {rows.map((row) => (
          <article
            className={`ik-v420-list-row ${toneClass(row.tone)}`}
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
    </section>
  );
}

export function MobileOverviewHome(props: MobileOverviewHomeProps) {
  const model = buildMobileOverviewModel(props.snapshot, props.state);
  return (
    <div
      className="ik-v420-app ik-v240-app ik-mobile-public-home"
      data-overview-mobile-console
      data-overview-mobile-ios-router-home="true"
      data-overview-mobile-app-home="ikuai40-ios-router-home"
      data-overview-mobile-home-mode="ios-router-app-home"
      data-overview-mobile-home-version="v1100-public-decision-home"
      data-overview-mobile-v420-app-home="apple-ios-ikuai40-router-home"
      data-overview-mobile-v420-first-screen-contract="device-state-update-decision-four-facts-next-step-supporting-tabs"
      data-overview-mobile-v420-frame-model="independent-mobile-home-not-desktop-collapse"
      data-overview-mobile-v420-visual-contract="decision-first-scenario-visual-four-facts-supporting-list"
      data-overview-mobile-v420-design="router-app-home-flat-console-not-h5-health-app"
      data-overview-mobile-no-desktop-collapse="true"
      data-overview-mobile-no-kpi-card-grid="true"
      data-overview-mobile-no-red-orange="true"
      data-overview-mobile-no-table-visual="true"
      data-overview-mobile-no-red-orange-blocks="true"
      data-overview-mobile-scene={props.state.scenario}
      data-overview-mobile-priority={model.priority}
      data-overview-mobile-severity={model.appHomeContract.severity}
      data-overview-mobile-layout-contract={model.appHomeContract.layout}
      data-overview-mobile-ranking-policy={model.appHomeContract.rankingPolicy}
      data-overview-mobile-abnormal-ia={model.appHomeContract.informationArchitecture}
      data-overview-mobile-top-slot={model.appHomeContract.topSlot}
      data-overview-mobile-terminal-ranking-state={model.appHomeContract.terminalRanking}
      data-overview-mobile-first-question={model.appHomeContract.firstQuestion}
      data-overview-mobile-trust-boundary={model.appHomeContract.trustBoundary}
      data-overview-mobile-impact-scope={model.impactScope.id}
      data-overview-mobile-impact-plane={model.impactScope.plane}
      data-overview-mobile-design-token-system="mobileOverviewTokens:color-type-space-radius-state-chart"
      data-overview-mobile-normal-app-home={model.priority === "normal" ? "compact-conclusion-chart-ops" : undefined}
      data-overview-mobile-compact-conclusion={model.priority === "normal" ? "conclusion-trust-wan-collection-resource-snapshot" : undefined}
      data-overview-mobile-v1010-product-app-polish="native-readout-rail-no-ellipsis-subtle-tabbar"
      data-overview-mobile-v1020-public-product-polish="ios-rhythm-low-noise-grouped-surfaces-router-native-tabs"
      data-overview-mobile-v1030-native-trust-spine="grouped-trust-spine-low-card-noise"
      data-overview-mobile-v1043-native-token-contract="native-console-tokenized-rhythm-low-noise-trust-first"
      data-overview-mobile-v1046-abnormal-decision-contract="object-impact-evidence-next-action-low-noise-console"
      data-overview-mobile-v1058-collection-trust={model.appHomeContract.severity === "normal" ? "normal-hidden" : "routeros-rest-ssh-snapshot-fixed-abnormal-first-screen"}
      data-overview-mobile-v1059-collection-impact-separation={model.collectionTrustSeparation.contract}
      data-overview-mobile-v1059-collection-plane={model.collectionTrustSeparation.collectionPlane}
      data-overview-mobile-v1059-impact-plane={model.collectionTrustSeparation.impactPlane}
      data-overview-mobile-v1059-separated-from-impact={model.collectionTrustSeparation.separatedFromImpact ? "true" : "false"}
      data-overview-mobile-v1065-normal-first-screen={model.priority === "normal" ? "separate-conclusion-trust-four-facts-chart-first" : undefined}
      data-overview-mobile-v1070-grouped-surfaces="ios-grouped-gray-separators-no-card-border-stack"
      data-overview-mobile-v1090-first-screen-order="conclusion-trust-four-facts-priority-incident-supporting-list"
      data-overview-mobile-p0-first-screen={model.appHomeContract.severity === "p0" ? "trust-wan-route-collection-success-no-terminal-ranking" : undefined}
      data-overview-mobile-v1100-public-home="one-primary-task-evidence-below-fold-ios-safe-area"
      data-overview-mobile-v1100-readonly-mode="visible"
      data-overview-mobile-v1100-first-screen-order="device-decision-four-facts-next-step-supporting-tabs"
      data-overview-mobile-v1110-public-home="device-primary-card-four-facts-supporting-no-redundant-strips"
      data-overview-mobile-v1110-first-screen-order="device-primary-decision-four-facts-supporting-list-tabs"
      data-overview-mobile-no-snapshot-no-rate-placeholder={props.state.scenario === "no-snapshot" ? "true" : undefined}
    >
      <div className="ik-v420-shell ik-v240-shell">
        <main
          className="ik-v420-screen ik-v240-screen ik-mobile-decision-screen"
          data-overview-mobile-first-screen="app-home"
          data-overview-mobile-first-screen-no-table="true"
          data-overview-mobile-first-screen-uses-microchart="true"
          data-overview-mobile-v420-first-screen-contract="ios-router-decision-home"
          data-overview-mobile-v420-frame-model="independent-mobile-home-not-table-stack"
          data-overview-mobile-app-question={model.appHomeContract.firstQuestion}
          data-overview-mobile-app-trust-boundary={model.appHomeContract.trustBoundary}
          data-overview-mobile-app-ranking-policy={model.appHomeContract.rankingPolicy}
          data-overview-mobile-app-abnormal-ia={model.appHomeContract.informationArchitecture}
          data-overview-mobile-app-terminal-ranking-state={model.appHomeContract.terminalRanking}
          data-overview-mobile-v1100-first-screen-hierarchy="device-primary-decision-four-facts-next-step-supporting-list-tabs"
          data-overview-mobile-v1110-first-screen-hierarchy="device-primary-decision-four-facts-supporting-list-tabs"
        >
          <DeviceBar model={model} />
          <PrimaryDecision model={model} />
          <CoreFacts model={model} />
          <SupportingList model={model} />
          <BottomTabs />
        </main>
      </div>
      <MobileOverviewStyles />
    </div>
  );
}
