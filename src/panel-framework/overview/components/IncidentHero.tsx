import type { CSSProperties } from "react";
import type { MobileOverviewModel, MobileTrendChartModel } from "../mobileOverviewModel";
import type { MobileOverviewResolvedProps } from "./MobileOverviewTypes";
import {
  screenTone,
  toneClass,
} from "./MobileOverviewUtils";

function LineChart({ chart }: { chart: MobileTrendChartModel }) {
  const plot = chart.plot;
  const peakLabelOnRight = plot.peak.x > 248;
  const currentLabelOnRight = plot.focus.x > 248;
  const peakLabelX = peakLabelOnRight ? Math.max(18, plot.peak.x - 5) : Math.min(294, plot.peak.x + 5);
  const currentLabelX = currentLabelOnRight ? Math.max(18, plot.focus.x - 5) : Math.min(294, plot.focus.x + 5);
  return (
    <svg
      className="ik-v420-line-chart"
      viewBox={`0 0 312 ${plot.viewHeight}`}
      role="img"
      aria-label={`${chart.windowText} WAN 下载上传采样趋势，当前 ${chart.currentLabel}，峰值 ${chart.peakLabel}，${chart.referenceLabel}，采样 ${chart.sampleText}`}
      data-overview-chart-type="mini-line"
      data-overview-scene-chart="mobile-wan-rate-sparkline"
      data-overview-mobile-first-visual="thin-wan-sparkline"
      data-overview-mobile-v420-visual="thin-wan-sparkline"
      data-overview-line-source={chart.source}
      data-overview-mobile-chart-window={chart.windowText}
      data-overview-mobile-chart-peak={chart.peakLabel}
      data-overview-mobile-chart-sample={chart.sampleText}
      data-overview-mobile-chart-reference={chart.referenceLabel}
      data-overview-mobile-chart-threshold={chart.thresholdLabel}
      data-overview-mobile-chart-breach={chart.breachLabel}
      data-overview-mobile-chart-anomaly={chart.anomalyLabel}
      data-overview-mobile-chart-decision={chart.decisionLabel}
      data-overview-mobile-v1045-product-chart-decision={chart.decisionContract}
      data-overview-mobile-v1057-chart-plot-model="view-model-svg-points-threshold-peak-breach"
      data-overview-mobile-v1012-product-chart="window-current-peak-threshold-sample-breach"
    >
      <path className="ik-v420-gridline" d={plot.gridYs.map((y) => `M0 ${y} H312`).join(" ")} />
      <path className="ik-v945-reference-line" d={`M0 ${plot.referenceY} H312`} />
      {plot.breachX !== null ? <path className="ik-v1012-breach-line" d={`M${plot.breachX} ${plot.topY} V${plot.baselineY + 2}`} /> : null}
      <path className="ik-v945-current-line" d={`M${plot.focus.x} ${plot.topY} V${plot.baselineY + 2}`} />
      <path className="ik-v420-area" d={`M0 ${plot.baselineY} L${plot.downPoints} L312 ${plot.baselineY} Z`} />
      <polyline className="ik-v420-curve is-main" points={plot.downPoints} />
      <polyline className="ik-v420-curve is-soft" points={plot.upPoints} />
      <circle className="ik-v945-start-dot" cx={plot.start.x} cy={plot.start.y} r="2.1" />
      <circle className="ik-v420-peak-dot" cx={plot.peak.x} cy={plot.peak.y} r="2.6" />
      <circle className="ik-v420-focus-dot" cx={plot.focus.x} cy={plot.focus.y} r="2.8" />
      <text className="ik-v1012-threshold-label" x="4" y={Math.max(10, plot.referenceY - 3)} textAnchor="start">阈值</text>
      {plot.breachX !== null ? <text className="ik-v1012-breach-label" x={Math.min(286, plot.breachX + 3)} y={plot.topY + 4}>异常</text> : null}
      <text
        className="ik-v1081-peak-label"
        x={peakLabelX}
        y={Math.max(plot.topY + 10, plot.peak.y - 7)}
        textAnchor={peakLabelOnRight ? "end" : "start"}
      >
        峰值
      </text>
      <text
        className="ik-v1081-current-label"
        x={currentLabelX}
        y={Math.min(plot.baselineY - 5, plot.focus.y + 14)}
        textAnchor={currentLabelOnRight ? "end" : "start"}
      >
        当前
      </text>
      <text className="ik-v950-axis-label is-start" x="1" y={plot.axisY}>{chart.startLabel}</text>
      <text className="ik-v950-axis-label is-end" x="311" y={plot.axisY} textAnchor="end">{chart.endLabel}</text>
    </svg>
  );
}

function TrendVisual({ model }: { model: MobileOverviewModel }) {
  const chart = model.hero.trend;
  return (
    <>
      <div
        className="ik-v812-trend-visual"
        data-overview-mobile-chart-readout="current-peak-window-threshold-sample-anomaly"
        data-overview-mobile-chart-layout="native-readout-rail-current-peak-window-threshold-sample-anomaly"
        data-overview-mobile-v1045-chart-decision={chart.decisionLabel}
        data-overview-mobile-v1072-chart="decision-plot-two-series-three-by-two-readout"
      >
        <div className="ik-v1072-chart-head">
          <span className="ik-v1065-chart-kicker" data-overview-mobile-v1065-chart-label="normal-visible-compact">WAN 采样趋势</span>
          <div className="ik-v1072-series-legend" data-overview-mobile-v1072-series-legend="download-upload" aria-label="下载与上传图例">
            <span className="is-download"><i aria-hidden="true" />下载</span>
            <span className="is-upload"><i aria-hidden="true" />上传</span>
          </div>
        </div>
        <LineChart chart={chart} />
      </div>
      <div
        className="ik-v1010-chart-readout-rail"
        data-overview-mobile-chart-readout-rail="current-peak-window-threshold-sample-anomaly"
        data-overview-mobile-v1045-chart-readouts="window-current-peak-threshold-sample-anomaly-source"
        data-overview-mobile-v1072-readout-grid="three-columns-two-rows-six-decisions"
      >
        {chart.readouts.map((item) => (
          <span className={toneClass(item.tone)} key={`${item.label}-${item.value}`}>
            <em>{item.label}</em>
            <b>{item.value}</b>
          </span>
        ))}
      </div>
    </>
  );
}

function PortMatrix({ model }: MobileOverviewResolvedProps) {
  const ports = model.wanPorts;
  return (
    <div
      className="ik-v420-port-matrix"
      data-overview-chart-type="matrix"
      data-overview-mobile-first-visual="wan-eight-port-matrix"
      data-overview-mobile-v420-visual="wan-eight-port-matrix"
      data-overview-mobile-v1042-wan-port-matrix="compact-router-port-matrix-interface-state-carrier-no-toy-capsules"
      data-overview-mobile-v1054-wan-port-model="view-model-carrier-state-no-jsx-note-split"
      data-overview-mobile-v1062-wan-role-model="default-backup-member-impact-route-binding"
      data-overview-mobile-v1042-port-cell-count={ports.length}
    >
      {ports.map((port) => (
        <span
          className={port.portState === "down" ? "is-danger" : "is-ok"}
          data-port={port.label}
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
          <small>{port.roleLabel} · {port.carrier}</small>
          <em data-overview-mobile-wan-port-carrier>{port.carrier}</em>
          <strong data-overview-mobile-wan-port-state>{port.stateText}</strong>
        </span>
      ))}
    </div>
  );
}

function ChannelRail({ model }: MobileOverviewResolvedProps) {
  return (
    <div
      className="ik-v420-channel-rail"
      data-overview-chart-type="matrix"
      data-overview-mobile-first-visual="routeros-rest-ssh-snapshot-status-line"
      data-overview-mobile-v420-visual="routeros-rest-ssh-snapshot-status-line"
      data-overview-mobile-v1055-channel-rail="view-model-routeros-rest-ssh-snapshot-trust-cells"
    >
      {model.hero.channelCells.map((item) => (
        <span className={toneClass(item.tone)} key={item.label}>
          <i />
          <b>{item.label}</b>
          <em>{item.value}</em>
        </span>
      ))}
    </div>
  );
}

function InterfaceFlow({ model }: MobileOverviewResolvedProps) {
  const visible = model.hero.interfaceCells;
  return (
    <div
      className="ik-v420-interface-list"
      data-overview-chart-type="status-list"
      data-overview-mobile-first-visual="interface-parent-carrier-chain-list"
      data-overview-mobile-v420-visual="interface-parent-carrier-chain-list"
      data-overview-mobile-v1053-interface-flow="view-model-interface-carrier-state-cells"
    >
      {visible.map((item) => (
        <span className={toneClass(item.tone)} data-overview-mobile-v1053-interface-cell={item.carrier} key={item.id}>
          <i />
          <b>{item.name}</b>
          <em>{item.carrier} · {item.stateText}</em>
        </span>
      ))}
    </div>
  );
}

function ResourceVisual({ model }: { model: MobileOverviewModel }) {
  const metrics = model.hero.resourceCells;
  return (
    <div
      className="ik-density-resource-ledger ik-v420-resource-visual ik-v420-resource-meter-set is-vertical-ledger ik-v620-pressure-visual ik-v1040-resource-ledger"
      data-overview-chart-type="bar"
      data-overview-scene-chart="mobile-resource-vertical-ledger"
      data-overview-mobile-core-block="resource"
      data-overview-mobile-first-visual="processor-memory-disk"
      data-overview-mobile-v420-visual="processor-memory-disk-thin-bars"
      data-overview-mobile-v1040-resource-pressure="low-noise-threshold-ledger-no-red-blue-race"
      data-overview-mobile-v1056-resource-visual="view-model-resource-threshold-sustained-risk-cells"
      data-overview-mobile-resource-tone-policy="neutral-bars-risk-label-only"
    >
      {metrics.map((item) => {
        const meterStyle = { "--meter": item.meterPercent } as CSSProperties;
        return (
          <span
            className={`ik-density-resource-row ik-v420-resource-meter ${toneClass(item.tone)}${item.risk === "primary-risk" ? " is-peak" : ""}`}
            data-overview-mobile-resource-row={item.key}
            data-overview-mobile-resource-risk={item.risk}
            key={item.key}
            style={meterStyle}
          >
            <b>{item.label}</b>
            <strong className="ik-v802-ring-value">{item.display}</strong>
            <small>{item.thresholdText}</small>
            <em>{item.sustainedText}</em>
            <span className="ik-density-resource-track" aria-hidden="true"><span style={{ width: item.meterPercent }} /></span>
          </span>
        );
      })}
    </div>
  );
}

function HeroVisual(props: MobileOverviewResolvedProps) {
  if (props.model.hero.visualKind === "wan-ports") return <PortMatrix {...props} />;
  if (props.model.hero.visualKind === "resource-bars") return <ResourceVisual model={props.model} />;
  if (props.model.hero.visualKind === "interface-list") return <InterfaceFlow {...props} />;
  if (props.model.hero.visualKind === "trust-channels") return <ChannelRail {...props} />;
  return <TrendVisual model={props.model} />;
}

function HeroMetrics({ model }: { model: MobileOverviewModel }) {
  const readings = model.hero.facts;
  if (!model.hero.showMetrics || !readings.length) return null;
  return (
    <div className="ik-v420-hero-stats" data-overview-mobile-core-block="hero-stats" data-overview-mobile-hero-metrics="download-upload-latency-connections">
      {readings.map((item, index) => (
        <span className={`${toneClass(item.tone)} ${index === 0 ? "is-primary" : ""}`} key={`${item.label}-${item.value}`}>
          <em>{item.label}</em>
          <b>{item.value}</b>
          <small>{item.note}</small>
        </span>
      ))}
    </div>
  );
}

function AbnormalDecisionRail({ model }: { model: MobileOverviewModel }) {
  const cells = model.abnormalDecision;
  if (!cells.length) return null;
  return (
    <div
      className="ik-v1046-abnormal-decision-rail"
      data-overview-mobile-v1046-abnormal-decision-rail="object-impact-evidence-next-action"
      data-overview-mobile-v1046-abnormal-decision-ia={model.appHomeContract.informationArchitecture}
      data-overview-mobile-v1046-abnormal-decision-priority={model.priority}
      data-overview-mobile-v1046-abnormal-decision-scope={`${model.impactScope.id}:${model.impactScope.plane}`}
    >
      {cells.map((cell) => (
        <span
          className={toneClass(cell.tone)}
          data-overview-mobile-v1046-abnormal-decision-cell={cell.label}
          key={cell.label}
        >
          <em>{cell.label}</em>
          <b>{cell.value}</b>
          <small>{cell.note}</small>
        </span>
      ))}
    </div>
  );
}

export function IncidentHero(props: MobileOverviewResolvedProps) {
  const { state, model } = props;
  const tone = screenTone(state);
  const isNormal = model.priority === "normal";
  return (
    <section
      className={`ik-v420-hero ik-v240-hero ik-v159-network-hero ${toneClass(tone)} ${isNormal ? "is-normal-chart" : "is-incident"}`}
      data-overview-mobile-alert={tone}
      data-overview-mobile-v420-hero="network-state-home"
      data-overview-mobile-v240-hero="network-state-home"
      data-overview-mobile-v159-main-hero="network-state-home"
      data-overview-mobile-first-visual="scenario-specific"
      data-overview-mobile-first-microchart="true"
      data-overview-mobile-v620-hero="conclusion-two-numbers-one-chart"
      data-overview-mobile-priority={model.priority}
      data-overview-mobile-visual-kind={model.hero.visualKind}
      data-overview-mobile-hero-metrics={model.hero.showMetrics ? "visible" : "suppressed"}
      data-overview-mobile-hero-layout={model.appHomeContract.layout}
      data-overview-mobile-hero-ranking-policy={model.appHomeContract.rankingPolicy}
      data-overview-mobile-hero-trust-boundary={model.appHomeContract.trustBoundary}
      data-overview-mobile-v1065-normal-hero={model.priority === "normal" ? "chart-first-no-promo-headline" : undefined}
      data-overview-mobile-v1080-hero={isNormal ? "product-chart-only" : "incident-object-impact-evidence"}
    >
      {!isNormal ? (
        <header className="ik-v620-hero-head">
          <span className="ik-v970-first-question">{model.appHomeContract.firstQuestion}</span>
          <h1 data-overview-primary-conclusion="true">{model.hero.title}</h1>
          <p className="ik-v503-hero-copy">{model.hero.subtitle}</p>
        </header>
      ) : null}
      <div className={`ik-v620-hero-stage ${model.hero.showMetrics ? "has-metrics" : "is-metricless"}`}>
        <HeroMetrics model={model} />
        <div className="ik-v420-visual ik-v240-visual ik-v240-traffic"><HeroVisual {...props} /></div>
      </div>
      {!isNormal ? (
        <div className="ik-v970-trust-boundary" data-overview-mobile-trust-boundary-line>
          <span>{model.appHomeContract.trustBoundary}</span>
        </div>
      ) : null}
      <AbnormalDecisionRail model={model} />
    </section>
  );
}
