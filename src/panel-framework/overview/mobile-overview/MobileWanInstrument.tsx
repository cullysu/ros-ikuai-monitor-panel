import { Activity, ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import type { OverviewTrafficInstrument } from "../evidence-model/overviewEvidenceTypes";

const WIDTH = 320;
const HEIGHT = 88;
const PADDING_X = 10;
const PADDING_Y = 8;

function plotPoints(values: number[], max: number): string {
  const width = WIDTH - PADDING_X * 2;
  const height = HEIGHT - PADDING_Y * 2;
  const denominator = Math.max(1, values.length - 1);
  return values.map((value, index) => {
    const x = PADDING_X + (index / denominator) * width;
    const y = PADDING_Y + height - (value / Math.max(1, max)) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

function clockLabel(timestamp: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

export function MobileWanInstrument({ traffic, onOpen }: { traffic: OverviewTrafficInstrument; onOpen: () => void }) {
  if (traffic.status === "accumulating") {
    return (
      <section className="mo-instrument is-accumulating" aria-labelledby="mo-instrument-title" data-mobile-traffic="accumulating">
        <header>
          <span><Activity aria-hidden="true" size={18} /><b id="mo-instrument-title">{traffic.title}</b></span>
          <small>趋势累积中 · {traffic.sampleCount} 个当前样本</small>
        </header>
        <div className="mo-instrument-readings" aria-label={`当前下载 ${traffic.currentDown}，当前上传 ${traffic.currentUp}`}>
          <span><ArrowDown aria-hidden="true" size={17} /><span><small>当前下载</small><b>{traffic.currentDown}</b></span></span>
          <span><ArrowUp aria-hidden="true" size={17} /><span><small>当前上传</small><b>{traffic.currentUp}</b></span></span>
        </div>
      </section>
    );
  }

  const peak = Math.max(1, ...traffic.points.flatMap((point) => [point.down, point.up]));
  const down = plotPoints(traffic.points.map((point) => point.down), peak);
  const up = plotPoints(traffic.points.map((point) => point.up), peak);
  const first = traffic.points[0];
  const last = traffic.points[traffic.points.length - 1];

  return (
    <section className="mo-instrument" aria-labelledby="mo-instrument-title" data-mobile-traffic="ready" data-mobile-traffic-samples={traffic.sampleCount}>
      <header>
        <span><Activity aria-hidden="true" size={18} /><b id="mo-instrument-title">{traffic.title}</b></span>
        <button type="button" onClick={onOpen} aria-label="查看 WAN 流量详情">
          <span>{traffic.windowLabel}</span><ChevronRight aria-hidden="true" size={17} />
        </button>
      </header>
      <div className="mo-instrument-legend" aria-hidden="true">
        <span className="is-down"><i />当前下载 <b>{traffic.currentDown}</b></span>
        <span className="is-up"><i />当前上传 <b>{traffic.currentUp}</b></span>
      </div>
      <svg className="mo-instrument-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby="mo-chart-title mo-chart-desc" preserveAspectRatio="none">
        <title id="mo-chart-title">WAN 下载与上传趋势</title>
        <desc id="mo-chart-desc">{traffic.accessibleSummary}</desc>
        <line className="mo-chart-reference" x1={PADDING_X} x2={WIDTH - PADDING_X} y1={PADDING_Y} y2={PADDING_Y} />
        <line className="mo-chart-baseline" x1={PADDING_X} x2={WIDTH - PADDING_X} y1={HEIGHT - PADDING_Y} y2={HEIGHT - PADDING_Y} />
        <polyline className="mo-chart-down" points={down} />
        <polyline className="mo-chart-up" points={up} />
      </svg>
      <div className="mo-instrument-scale">
        <span>{clockLabel(first.timestamp)}</span>
        <span>峰值 {traffic.peak} · {traffic.sampleCount} 点</span>
        <span>{clockLabel(last.timestamp)}</span>
      </div>
    </section>
  );
}
