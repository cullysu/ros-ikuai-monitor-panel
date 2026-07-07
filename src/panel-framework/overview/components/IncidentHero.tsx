import type { CSSProperties } from "react";
import {
  formatNumber,
  type OverviewDerivedState,
  type OverviewRawInterfaceRow,
  type OverviewTone,
} from "../index";
import { buildMobileOverviewModel, type MobileOverviewModel, type MobileTrendChartModel } from "../mobileOverviewModel";
import type { MobileOverviewHomeProps } from "./MobileOverviewTypes";
import {
  channelStatus,
  clean,
  interfaceRows,
  lastSparkPoint,
  resourceMetrics,
  screenTone,
  sparkPoints,
  toneClass,
} from "./MobileOverviewUtils";

function LineChart({ chart }: { chart: MobileTrendChartModel }) {
  const down = chart.down.length ? chart.down : [1, 1, 1];
  const up = chart.up.length ? chart.up : [0.45, 0.45, 0.45];
  const max = Math.max(1, ...down, ...up);
  const downPoints = sparkPoints(down, max, 312, 52);
  const upPoints = sparkPoints(up, max, 312, 52);
  const focus = lastSparkPoint(downPoints);
  const peakValue = Math.max(...down);
  const peakIndex = Math.max(0, down.findIndex((value) => value === peakValue));
  const peakX = down.length > 1 ? Number(((peakIndex * 312) / (down.length - 1)).toFixed(1)) : 156;
  const peakY = Number((52 - (Math.max(0, peakValue) / max) * 40 - 6).toFixed(1));
  const start = downPoints.trim().split(/\s+/)[0]?.split(",").map((item) => Number(item)) || [0, 52];
  const referenceY = Number((52 - Math.max(0, Math.min(1, chart.referenceRatio)) * 40 - 6).toFixed(1));
  return (
    <svg
      className="ik-v420-line-chart"
      viewBox="0 0 312 72"
      role="img"
      aria-label={`${chart.windowText} WAN 下载上传趋势，当前 ${chart.currentLabel}，峰值 ${chart.peakLabel}，${chart.referenceLabel}，采样 ${chart.sampleText}`}
      data-overview-chart-type="mini-line"
      data-overview-scene-chart="mobile-wan-rate-sparkline"
      data-overview-mobile-first-visual="thin-wan-sparkline"
      data-overview-mobile-v420-visual="thin-wan-sparkline"
      data-overview-line-source={chart.source}
      data-overview-mobile-chart-window={chart.windowText}
      data-overview-mobile-chart-peak={chart.peakLabel}
      data-overview-mobile-chart-sample={chart.sampleText}
      data-overview-mobile-chart-reference={chart.referenceLabel}
    >
      <text className="ik-v945-chart-caption" x="0" y="8">采样 {chart.sampleText}</text>
      <text className="ik-v945-chart-caption" x="312" y="8" textAnchor="end">{chart.referenceLabel}</text>
      <path className="ik-v420-gridline" d="M0 13 H312 M0 31 H312 M0 47 H312" />
      <path className="ik-v945-reference-line" d={`M0 ${referenceY} H312`} />
      <path className="ik-v945-current-line" d={`M${focus.x} 10 V54`} />
      <path className="ik-v420-area" d={`M0 52 L${downPoints} L312 52 Z`} />
      <polyline className="ik-v420-curve is-main" points={downPoints} />
      <polyline className="ik-v420-curve is-soft" points={upPoints} />
      <circle className="ik-v945-start-dot" cx={Number.isFinite(start[0]) ? start[0] : 0} cy={Number.isFinite(start[1]) ? start[1] : 52} r="2.1" />
      <circle className="ik-v420-peak-dot" cx={peakX} cy={peakY} r="2.6" />
      <circle className="ik-v420-focus-dot" cx={focus.x} cy={focus.y} r="2.8" />
      <text x="0" y="68">{chart.startLabel}</text>
      <text x="156" y="68" textAnchor="middle">峰 {chart.peakLabel}</text>
      <text x="312" y="68" textAnchor="end">{chart.endLabel} {chart.currentLabel}</text>
    </svg>
  );
}

function TrendVisual({ model }: { model: MobileOverviewModel }) {
  const chart = model.hero.trend;
  return (
    <div className="ik-v812-trend-visual" data-overview-mobile-chart-readout="current-peak-window">
      <LineChart chart={chart} />
      <aside>
        {chart.readouts.map((item) => (
          <span className={toneClass(item.tone)} key={`${item.label}-${item.value}`}>
            <em>{item.label}</em>
            <b>{item.value}</b>
          </span>
        ))}
      </aside>
    </div>
  );
}

function PortMatrix({ snapshot, state }: MobileOverviewHomeProps) {
  const ports = buildMobileOverviewModel(snapshot, state).wanPorts;
  return (
    <div
      className="ik-v420-port-matrix"
      data-overview-chart-type="matrix"
      data-overview-mobile-first-visual="wan-eight-port-matrix"
      data-overview-mobile-v420-visual="wan-eight-port-matrix"
    >
      {ports.map((port) => {
        const offline = port.tone === "danger";
        const [carrier = port.name, stateText = offline ? "离线" : "在线"] = port.note.split("·").map((part) => part.trim()).filter(Boolean);
        return (
          <span className={offline ? "is-danger" : "is-ok"} data-port={port.label} key={port.id}>
            <i />
            <b>{port.label}</b>
            <small>{carrier}</small>
            <em>{stateText}</em>
          </span>
        );
      })}
    </div>
  );
}

function ChannelRail({ state }: { state: OverviewDerivedState }) {
  return (
    <div
      className="ik-v420-channel-rail"
      data-overview-chart-type="matrix"
      data-overview-mobile-first-visual="routeros-rest-ssh-snapshot-status-line"
      data-overview-mobile-v420-visual="routeros-rest-ssh-snapshot-status-line"
    >
      {channelStatus(state).map((item) => (
        <span className={toneClass(item.tone)} key={item.label}>
          <i />
          <b>{item.label}</b>
          <em>{item.value}</em>
        </span>
      ))}
    </div>
  );
}

function firstDownInterface(snapshot: MobileOverviewHomeProps["snapshot"]): OverviewRawInterfaceRow | undefined {
  return interfaceRows(snapshot).find((row) => row.running === false) || interfaceRows(snapshot)[0];
}

function InterfaceFlow({ snapshot, state }: MobileOverviewHomeProps) {
  const rows = interfaceRows(snapshot).filter((row) => row.running === false).slice(0, 2);
  const visible = rows.length ? rows : [firstDownInterface(snapshot)].filter(Boolean) as OverviewRawInterfaceRow[];
  return (
    <div
      className="ik-v420-interface-list"
      data-overview-chart-type="status-list"
      data-overview-mobile-first-visual="interface-parent-carrier-chain-list"
      data-overview-mobile-v420-visual="interface-parent-carrier-chain-list"
    >
      {visible.map((row, index) => (
        <span key={`${clean(row.name || row.interface, `接口${index + 1}`)}-${index}`}>
          <i />
          <b>{clean(row.name || row.interface, `接口${index + 1}`)}</b>
          <em>{clean(row.parent || row.master || row.bridge, "承载待确认")} · {index === 0 ? `${formatNumber(state.facts.interfaces.down)} Down` : "Down"}</em>
        </span>
      ))}
    </div>
  );
}

function ResourceVisual({ state }: { state: OverviewDerivedState }) {
  const metrics = resourceMetrics(state);
  const peakKey = metrics.reduce((max, item) => (item.value > max.value ? item : max), metrics[0]).key;
  return (
    <div
      className="ik-density-resource-ledger ik-v420-resource-visual ik-mobile-resource-sparks ik-v420-resource-meter-set is-vertical-ledger ik-v620-pressure-visual"
      data-overview-chart-type="bar"
      data-overview-scene-chart="mobile-resource-vertical-ledger"
      data-overview-mobile-core-block="resource"
      data-overview-mobile-first-visual="processor-memory-disk"
      data-overview-mobile-v420-visual="processor-memory-disk-thin-bars"
    >
      {metrics.map((item) => {
        const value = Number.isFinite(item.value) ? Math.max(0, Math.min(100, item.value)) : 0;
        const meterStyle = { "--meter": `${value}%` } as CSSProperties;
        return (
          <span className={`ik-density-resource-row ik-mobile-resource-spark ik-v420-resource-meter ${toneClass(item.tone)}${item.key === peakKey ? " is-peak" : ""}`} key={item.key} style={meterStyle}>
            <b>{item.label}</b>
            <strong className="ik-v802-ring-value">{item.display.replace(/\.0%$/, "%")}</strong>
            <small>阈{item.threshold}%</small>
            <em>持续{item.tone === "danger" ? "6/6" : "0/6"}</em>
            <i><i style={{ width: `${value}%` }} /></i>
          </span>
        );
      })}
    </div>
  );
}

function HeroVisual(props: MobileOverviewHomeProps & { model: MobileOverviewModel }) {
  if (props.model.hero.visualKind === "wan-ports") return <PortMatrix {...props} />;
  if (props.model.hero.visualKind === "resource-bars") return <ResourceVisual state={props.state} />;
  if (props.model.hero.visualKind === "interface-list") return <InterfaceFlow {...props} />;
  if (props.model.hero.visualKind === "trust-channels") return <ChannelRail state={props.state} />;
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

function splitHeroPill(text: string): { label: string; value: string } {
  const [label, ...rest] = text.replace(/\s+/g, " ").trim().split(" ");
  return { label: label || "状态", value: rest.join(" ") || text };
}

function heroPillTone(text: string): OverviewTone {
  if (/缺失|不可用|断网|不展示|0\/|异常/.test(text)) return "danger";
  if (/待|缓存|确认|参考|越阈|超/.test(text)) return "warn";
  return "trust";
}

function HeroTrustRail({ model }: { model: MobileOverviewModel }) {
  return (
    <div className="ik-v503-hero-pills ik-v830-trust-rail" aria-label="对象影响可信度">
      {model.hero.pills.slice(0, 3).map((text) => {
        const item = splitHeroPill(text);
        return (
          <span className={toneClass(heroPillTone(text))} key={text}>
            <b>{item.label}</b>
            <strong>{item.value}</strong>
          </span>
        );
      })}
    </div>
  );
}

export function IncidentHero(props: MobileOverviewHomeProps) {
  const { snapshot, state } = props;
  const tone = screenTone(state);
  const model = buildMobileOverviewModel(snapshot, state);
  return (
    <section
      className={`ik-v420-hero ik-v240-hero ik-v159-network-hero ${toneClass(tone)}`}
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
    >
      <header className="ik-v620-hero-head">
        <h1 data-overview-primary-conclusion="true">{model.hero.title}</h1>
        <p className="ik-v503-hero-copy">{model.hero.subtitle}</p>
      </header>
      <div className={`ik-v620-hero-stage ${model.hero.showMetrics ? "has-metrics" : "is-metricless"}`}>
        <HeroMetrics model={model} />
        <div className="ik-v420-visual ik-v240-visual ik-v240-traffic">{HeroVisual({ ...props, model })}</div>
      </div>
      <HeroTrustRail model={model} />
    </section>
  );
}
