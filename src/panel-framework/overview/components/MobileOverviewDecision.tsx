import type { MobileOverviewModel } from "../mobileOverviewModel";
import type { MobileBottomTabId } from "./BottomTabs";
import { toneClass } from "./MobileOverviewUtils";
function WanDecisionSpark({ model }: { model: MobileOverviewModel }) {
  const chart = model.hero.trend;
  const plot = chart.plot;
  const highPoint = (chart.anomalyLabel || "0").replace(/^高位点\s*/, "");
  const chartDecision = `当前 ${chart.currentLabel} · 峰值 ${chart.peakLabel} · 参考 ${chart.referenceValueLabel} · 高位点 ${highPoint} · 采样 ${chart.sampleText}`;
  return (
    <div className="ik-mobile-decision-trend">
      <div className="ik-mobile-decision-trend-plot">
        <div className="ik-mobile-chart-head">
          <span className="ik-mobile-chart-kicker">WAN 趋势 · {chart.windowText}</span>
          <div className="ik-mobile-series-legend" aria-label="下载与上传图例">
            <span className="is-download"><i aria-hidden="true" />下载</span>
            <span className="is-upload"><i aria-hidden="true" />上传</span>
          </div>
        </div>
        <div className="ik-mobile-decision-visual ik-mobile-traffic-visual ik-mobile-wan-trend">
          <svg
            className="ik-mobile-line-chart"
            viewBox={`0 0 312 ${Math.max(plot.viewHeight, 76)}`}
            role="img"
            aria-label={`${chart.windowText} WAN 采样趋势，当前 ${chart.currentLabel}，峰值 ${chart.peakLabel}`}
          >
            <path className="ik-mobile-chart-grid ik-mobile-decision-grid" d={plot.gridYs.map((y) => `M0 ${y} H312`).join(" ")} />
            <path className="ik-mobile-chart-reference ik-mobile-decision-ref" d={`M0 ${plot.referenceY} H312`} />
            <polyline className="ik-mobile-chart-line ik-mobile-decision-line is-download" points={plot.downPoints} />
            <polyline className="ik-mobile-chart-line ik-mobile-decision-line is-upload" points={plot.upPoints} />
            <circle className="ik-mobile-chart-peak" cx={plot.peak.x} cy={plot.peak.y} r="2.6" />
            <circle className="ik-mobile-chart-focus ik-mobile-decision-dot" cx={plot.focus.x} cy={plot.focus.y} r="3" />
          </svg>
          <span className="ik-mobile-chart-time-axis" aria-hidden="true">
            <i>较早采样</i><i>当前</i>
          </span>
        </div>
      </div>
      <i className="ik-mobile-decision-trend-anchor" aria-hidden="true" />
      <div className="ik-mobile-decision-readouts" aria-label={chartDecision}>
        <span><em>当前</em><b>{chart.currentLabel}</b></span>
        <span><em>峰值</em><b>{chart.peakLabel}</b></span>
        <span><em>参考</em><b>{chart.referenceValueLabel}</b></span>
        <span><em>采样</em><b>{chart.sampleText}</b></span>
      </div>
    </div>
  );
}

function ResourceDecisionVisual({ model, onSelectTab }: { model: MobileOverviewModel; onSelectTab?: (tab: MobileBottomTabId) => void }) {
  return (
    <div className="ik-mobile-decision-visual ik-mobile-resource-incident-stack ik-mobile-resource-decision">
      <AbnormalDecisionRail model={model} onSelectTab={onSelectTab} />
      {model.hero.resourceCells.map((item) => (
        <span
          className={`ik-mobile-resource-line ${toneClass(item.tone)}`}
          data-risk={item.risk}
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

function AbnormalDecisionRail({ model, onSelectTab }: { model: MobileOverviewModel; onSelectTab?: (tab: MobileBottomTabId) => void }) {
  const byLabel = new Map(model.abnormalDecision.map((item) => [item.label, item]));
  const object = byLabel.get("对象");
  const impact = byLabel.get("影响");
  const credibility = byLabel.get("可信度");
  const action = byLabel.get("下一步");
  if (!object || !impact || !credibility || !action) return null;
  return (
    <div
      className="ik-mobile-abnormal-decision-rail"
    >
      <div className="ik-mobile-incident-summary">
        <span className={`ik-mobile-incident-cell ${toneClass(object.tone)}`}>
          <em>对象</em>
          <b>{object.value}</b>
        </span>
        <span className={`ik-mobile-incident-cell ${toneClass(impact.tone)}`}>
          <em>影响</em>
          <b>{impact.value}</b>
        </span>
      </div>
      <div className="ik-mobile-incident-guidance">
        <span className={`ik-mobile-incident-cell ${toneClass(credibility.tone)}`}>
          <em>可信度</em>
          <b>{credibility.value}</b>
        </span>
        {action.targetTab && onSelectTab ? (
          <button
            aria-label={`下一步：${action.value}，${action.note}`}
            className={`ik-mobile-incident-cell ik-mobile-incident-action ${toneClass(action.tone)}`}
            onClick={() => onSelectTab(action.targetTab as MobileBottomTabId)}
            type="button"
          >
            <em>下一步</em>
            <b>{action.value}</b>
          </button>
        ) : (
          <span className={`ik-mobile-incident-cell ${toneClass(action.tone)}`}>
            <em>下一步</em>
            <b>{action.value}</b>
          </span>
        )}
      </div>
    </div>
  );
}

function ChannelDecisionVisual({ model, onSelectTab }: { model: MobileOverviewModel; onSelectTab?: (tab: MobileBottomTabId) => void }) {
  return (
    <div className="ik-mobile-decision-visual ik-mobile-channel-incident-stack ik-mobile-channel-decision">
      <AbnormalDecisionRail model={model} onSelectTab={onSelectTab} />
    </div>
  );
}

function IncidentDecisionVisual({ model, onSelectTab }: { model: MobileOverviewModel; onSelectTab?: (tab: MobileBottomTabId) => void }) {
  return (
    <div className="ik-mobile-decision-visual ik-mobile-generic-incident-stack ik-mobile-incident-decision">
      <AbnormalDecisionRail model={model} onSelectTab={onSelectTab} />
    </div>
  );
}

function DecisionVisual({ model, onSelectTab }: { model: MobileOverviewModel; onSelectTab?: (tab: MobileBottomTabId) => void }) {
  if (model.priority === "normal") return <WanDecisionSpark model={model} />;
  if (model.priority === "resource-full") return <ResourceDecisionVisual model={model} onSelectTab={onSelectTab} />;
  if (model.priority === "snapshot-missing" || model.priority === "collection-degraded") return <ChannelDecisionVisual model={model} onSelectTab={onSelectTab} />;
  return <IncidentDecisionVisual model={model} onSelectTab={onSelectTab} />;
}

function decisionKicker(model: MobileOverviewModel): string {
  if (model.priority === "normal") return "网络状态";
  if (model.priority === "wan-offline") return "网络中断";
  if (model.priority === "snapshot-missing") return "数据边界";
  if (model.priority === "collection-degraded") return "采集状态";
  if (model.priority === "resource-full") return "资源告警";
  return "接口告警";
}

function IncidentTelemetry({ model }: { model: MobileOverviewModel }) {
  if (model.priority === "normal") return null;
  return (
    <div
      className="ik-mobile-incident-telemetry"
      aria-label="当前监控遥测"
      data-overview-mobile-incident-telemetry="current-rate-wan-collection-snapshot"
    >
      {model.incidentTelemetry.map((item) => (
        <span className={toneClass(item.tone)} key={item.id}>
          <em>{item.label}</em>
          <b>{item.value}</b>
          <small>{item.note}</small>
        </span>
      ))}
    </div>
  );
}

export function PrimaryDecision({ model, onSelectTab }: { model: MobileOverviewModel; onSelectTab?: (tab: MobileBottomTabId) => void }) {
  return (
    <section
      className={`ik-mobile-decision-card ik-mobile-primary-conclusion is-${model.hero.visualKind} ${toneClass(model.network.conclusion.tone)}`}
      aria-label="移动端网络状态结论"
    >
      <div className="ik-mobile-decision-head">
        <span>{decisionKicker(model)}</span>
        <h1>{model.hero.title}</h1>
        <p>{model.hero.subtitle}</p>
      </div>
      <DecisionVisual model={model} onSelectTab={onSelectTab} />
      <IncidentTelemetry model={model} />
    </section>
  );
}
