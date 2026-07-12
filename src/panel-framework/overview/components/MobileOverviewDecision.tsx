import type { MobileOverviewModel } from "../mobileOverviewModel";
import { toneClass } from "./MobileOverviewUtils";
function WanDecisionSpark({ model }: { model: MobileOverviewModel }) {
  const chart = model.hero.trend;
  const plot = chart.plot;
  const anomaly = (chart.anomalyLabel || "0").replace(/^异常点\s*/, "");
  const chartDecision = `当前 ${chart.currentLabel} · 峰值 ${chart.peakLabel} · 阈值 ${chart.thresholdLabel} · 异常点 ${anomaly} · 采样 ${chart.sampleText}`;
  return (
    <div className="ik-mobile-decision-trend">
      <div className="ik-mobile-decision-trend-plot">
        <div className="ik-v1072-chart-head">
          <span className="ik-v1065-chart-kicker">WAN 趋势 · {chart.windowText}</span>
          <div className="ik-v1072-series-legend" aria-label="下载与上传图例">
            <span className="is-download"><i aria-hidden="true" />下载</span>
            <span className="is-upload"><i aria-hidden="true" />上传</span>
          </div>
        </div>
        <div className="ik-mobile-decision-visual ik-v240-traffic ik-mobile-wan-trend">
          <svg
            className="ik-mobile-line-chart"
            viewBox={`0 0 312 ${Math.max(plot.viewHeight, 76)}`}
            role="img"
            aria-label={`${chart.windowText} WAN 采样趋势，当前 ${chart.currentLabel}，峰值 ${chart.peakLabel}`}
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
      <div className="ik-v1010-chart-readout-rail ik-mobile-decision-readouts" aria-label={chartDecision}>
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
    <div className="ik-mobile-decision-visual ik-v420-resource-meter-set ik-density-resource-ledger ik-v1040-resource-ledger ik-mobile-resource-incident-stack ik-mobile-resource-decision">
      <AbnormalDecisionRail model={model} />
      {model.hero.resourceCells.map((item) => (
        <span
          className={`ik-mobile-resource-line ${toneClass(item.tone)}`}
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
    >
      <div className="ik-mobile-incident-summary">
        <span className={`ik-mobile-decision-cell ${toneClass(object.tone)}`}>
          <em>对象</em>
          <b>{object.value}</b>
        </span>
        <span className={`ik-mobile-decision-cell ${toneClass(impact.tone)}`}>
          <em>影响</em>
          <b>{impact.value}</b>
        </span>
      </div>
      <div className="ik-mobile-incident-guidance">
        <span className={`ik-mobile-decision-cell ${toneClass(credibility.tone)}`}>
          <em>可信度</em>
          <b>{credibility.value}</b>
        </span>
        <span className={`ik-mobile-decision-cell ${toneClass(action.tone)}`}>
          <em>下一步</em>
          <b>{action.value}</b>
        </span>
      </div>
    </div>
  );
}

function ChannelDecisionVisual({ model }: { model: MobileOverviewModel }) {
  return (
    <div className="ik-mobile-decision-visual ik-v240-channel-line ik-mobile-channel-incident-stack ik-mobile-channel-decision">
      <AbnormalDecisionRail model={model} />
    </div>
  );
}

function IncidentDecisionVisual({ model }: { model: MobileOverviewModel }) {
  return (
    <div className="ik-mobile-decision-visual ik-mobile-generic-incident-stack ik-mobile-incident-decision">
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

function decisionKicker(model: MobileOverviewModel): string {
  if (model.priority === "normal") return "网络状态";
  if (model.priority === "wan-offline") return "网络中断";
  if (model.priority === "snapshot-missing") return "数据边界";
  if (model.priority === "collection-degraded") return "采集状态";
  if (model.priority === "resource-full") return "资源告警";
  return "接口告警";
}

export function PrimaryDecision({ model }: { model: MobileOverviewModel }) {
  return (
    <section
      className={`ik-v420-hero ik-v240-hero ik-v159-network-hero ik-mobile-decision-card ik-mobile-primary-conclusion is-${model.hero.visualKind} ${toneClass(model.network.conclusion.tone)}`}
      aria-label="移动端网络状态结论"
    >
      <div className="ik-mobile-decision-head">
        <span>{decisionKicker(model)}</span>
        <h1>{model.hero.title}</h1>
        <p>{model.hero.subtitle}</p>
      </div>
      <DecisionVisual model={model} />
    </section>
  );
}
