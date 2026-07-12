import type { MobileOverviewModel } from "../mobileOverviewModel";
import { toneClass } from "./MobileOverviewUtils";

function nextStep(model: MobileOverviewModel): { value: string; note: string; tone: string } {
  const action = model.abnormalDecision.find((item) => item.label === "下一步");
  if (action) return { value: action.value, note: action.note, tone: toneClass(action.tone) };
  return { value: "查看 WAN", note: "默认路由 / 快照", tone: "is-trust" };
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
          <span className="ik-v1065-chart-kicker" data-overview-mobile-v1065-chart-label="normal-visible-compact">WAN 趋势 · {chart.windowText}</span>
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
        data-overview-mobile-chart-readout-rail="current-peak-threshold-sample"
        data-overview-mobile-chart-readout-grid="two-columns-two-rows-four-decisions"
        data-overview-mobile-hero-metrics="current-peak-threshold-sample"
      >
        <span><em>当前</em><b>{chart.currentLabel}</b></span>
        <span><em>峰值</em><b>{chart.peakLabel}</b></span>
        <span><em>阈值</em><b>{chart.thresholdLabel}</b></span>
        <span><em>采样</em><b>{chart.sampleText}</b></span>
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
  const byLabel = new Map(model.abnormalDecision.map((item) => [item.label, item]));
  const object = byLabel.get("对象");
  const impact = byLabel.get("影响");
  const credibility = byLabel.get("可信度");
  const action = byLabel.get("下一步");
  if (!object || !impact || !credibility || !action) return null;
  return (
    <div
      className="ik-v1046-abnormal-decision-rail ik-mobile-abnormal-decision-rail"
      data-overview-mobile-v1046-abnormal-decision-rail="object-impact-credibility-next-action"
      data-overview-mobile-v1046-abnormal-decision-ia={model.appHomeContract.informationArchitecture}
      data-overview-mobile-v1046-abnormal-decision-priority={model.priority}
      data-overview-mobile-v1046-abnormal-decision-scope={`${model.impactScope.id}:${model.impactScope.plane}`}
    >
      <div className="ik-mobile-incident-summary">
        <span className={toneClass(object.tone)} data-overview-mobile-v1046-abnormal-decision-cell={object.label}>
          <em>对象</em>
          <b>{object.value}</b>
        </span>
        <span className={toneClass(impact.tone)} data-overview-mobile-v1046-abnormal-decision-cell={impact.label}>
          <em>影响</em>
          <b>{impact.value}</b>
        </span>
      </div>
      <div className="ik-mobile-incident-guidance">
        <span className={toneClass(credibility.tone)} data-overview-mobile-v1046-abnormal-decision-cell={credibility.label}>
          <em>可信度</em>
          <b>{credibility.value}</b>
        </span>
        <span className={toneClass(action.tone)} data-overview-mobile-v1046-abnormal-decision-cell={action.label}>
          <em>下一步</em>
          <b>{action.value}</b>
        </span>
      </div>
    </div>
  );
}

function ChannelDecisionVisual({ model }: { model: MobileOverviewModel }) {
  return (
    <div
      className="ik-mobile-decision-visual ik-v240-channel-line ik-mobile-channel-incident-stack"
      data-overview-chart-type="status"
      data-overview-mobile-first-visual="collection-snapshot-verdict"
      data-overview-mobile-first-microchart="true"
      data-overview-mobile-v240-visual="collection-snapshot-verdict"
      data-overview-mobile-channel-verdict="object-impact-credibility-next-action-no-channel-grid"
    >
      <AbnormalDecisionRail model={model} />
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

function DecisionVisual({ model }: { model: MobileOverviewModel }) {
  if (model.priority === "normal") return <WanDecisionSpark model={model} />;
  if (model.priority === "resource-full") return <ResourceDecisionVisual model={model} />;
  if (model.priority === "snapshot-missing" || model.priority === "collection-degraded") return <ChannelDecisionVisual model={model} />;
  return <IncidentDecisionVisual model={model} />;
}

export function PrimaryDecision({ model }: { model: MobileOverviewModel }) {
  const action = nextStep(model);
  return (
    <section
      className={`ik-v420-hero ik-v240-hero ik-v159-network-hero ik-mobile-decision-card ${toneClass(model.network.conclusion.tone)}`}
      aria-label="移动端网络状态结论"
      data-overview-mobile-alert={model.network.conclusion.tone}
      data-overview-mobile-v420-hero="network-state-home"
      data-overview-mobile-v240-hero="network-state-home"
      data-overview-mobile-v159-main-hero="network-state-home"
      data-overview-mobile-hero-metrics="decision-current-evidence"
      data-overview-mobile-priority={model.priority}
      data-overview-mobile-visual-kind={model.hero.visualKind}
      data-overview-mobile-hero-ranking-policy={model.appHomeContract.rankingPolicy}
      data-overview-mobile-v1065-normal-hero={model.priority === "normal" ? "chart-first-no-promo-headline" : undefined}
      data-overview-primary-conclusion="true"
    >
      <div className="ik-mobile-decision-head">
        <span>{model.appHomeContract.firstQuestion}</span>
        <h1>{model.hero.title}</h1>
        <p>{model.hero.subtitle}</p>
      </div>
      <DecisionVisual model={model} />
      {model.priority === "normal" ? (
        <div className={`ik-mobile-next-step ${action.tone}`}>
          <span>下一步</span>
          <b>{action.value}</b>
          <em>{action.note}</em>
        </div>
      ) : null}
    </section>
  );
}
