import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import type { OverviewTrafficInstrument, OverviewTrafficPoint } from "../evidence-model/overviewEvidenceTypes";

const WIDTH = 760;
const HEIGHT = 260;
const PLOT = { left: 54, right: 18, top: 24, bottom: 42 };

function pathFor(points: OverviewTrafficPoint[], key: "down" | "up", peak: number): string {
  const width = WIDTH - PLOT.left - PLOT.right;
  const height = HEIGHT - PLOT.top - PLOT.bottom;
  return points.map((point, index) => {
    const x = PLOT.left + (points.length === 1 ? width : (index / (points.length - 1)) * width);
    const y = PLOT.top + height - (point[key] / peak) * height;
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
}

function timeLabel(timestamp: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

export function DesktopWanEvidence({ traffic, onOpen }: { traffic: OverviewTrafficInstrument; onOpen: () => void }) {
  const rawPeak = Math.max(1, ...traffic.points.flatMap((point) => [point.down, point.up]));
  const downPath = pathFor(traffic.points, "down", rawPeak);
  const upPath = pathFor(traffic.points, "up", rawPeak);
  const first = traffic.points[0];
  const middle = traffic.points[Math.floor((traffic.points.length - 1) / 2)];
  const last = traffic.points[traffic.points.length - 1];
  const plotHeight = HEIGHT - PLOT.top - PLOT.bottom;
  const latestX = WIDTH - PLOT.right;
  const latestDownY = PLOT.top + plotHeight - (last.down / rawPeak) * plotHeight;
  const latestUpY = PLOT.top + plotHeight - (last.up / rawPeak) * plotHeight;
  const titleId = "do-wan-chart-title";
  const descId = "do-wan-chart-desc";

  return (
    <section className="do-wan" aria-labelledby="do-wan-heading" data-desktop-wan-evidence data-sample-count={traffic.sampleCount}>
      <header className="do-module-heading">
        <div><h2 id="do-wan-heading">{traffic.title}</h2><p>{traffic.windowLabel} · 统一采样窗口</p></div>
        <button type="button" onClick={onOpen}>流量审计<ChevronRight aria-hidden="true" size={16} /></button>
      </header>
      <div className="do-wan-summary" aria-label="WAN 当前与峰值">
        <span><ArrowDown aria-hidden="true" size={15} /><small>当前下载</small><b>{traffic.currentDown}</b></span>
        <span><ArrowUp aria-hidden="true" size={15} /><small>当前上传</small><b>{traffic.currentUp}</b></span>
        <span><small>窗口峰值</small><b>{traffic.peak}</b></span>
        <span><small>采样</small><b>{traffic.sampleCount} 点</b></span>
      </div>
      <svg
        className="do-wan-chart"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        preserveAspectRatio="xMidYMid meet"
        data-unit="bit/s"
      >
        <title id={titleId}>WAN 下载与上传吞吐时间序列</title>
        <desc id={descId}>{traffic.accessibleSummary}</desc>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = PLOT.top + plotHeight - ratio * plotHeight;
          return <line className="do-chart-grid" x1={PLOT.left} x2={WIDTH - PLOT.right} y1={y} y2={y} key={ratio} />;
        })}
        <line className="do-chart-axis" x1={PLOT.left} x2={PLOT.left} y1={PLOT.top} y2={HEIGHT - PLOT.bottom} />
        <line className="do-chart-axis" x1={PLOT.left} x2={WIDTH - PLOT.right} y1={HEIGHT - PLOT.bottom} y2={HEIGHT - PLOT.bottom} />
        <text className="do-chart-label" x={PLOT.left - 8} y={PLOT.top + 4} textAnchor="end">{traffic.peak}</text>
        <text className="do-chart-label" x={PLOT.left - 8} y={HEIGHT - PLOT.bottom + 4} textAnchor="end">0</text>
        <path className="do-chart-line is-down" d={downPath} />
        <path className="do-chart-line is-up" d={upPath} />
        <circle className="do-chart-point is-down" cx={latestX} cy={latestDownY} r="4" />
        <circle className="do-chart-point is-up" cx={latestX} cy={latestUpY} r="4" />
        <text className="do-chart-time" x={PLOT.left} y={HEIGHT - 14} textAnchor="start">{timeLabel(first.timestamp)}</text>
        <text className="do-chart-time" x={WIDTH / 2} y={HEIGHT - 14} textAnchor="middle">{timeLabel(middle.timestamp)}</text>
        <text className="do-chart-time" x={WIDTH - PLOT.right} y={HEIGHT - 14} textAnchor="end">{timeLabel(last.timestamp)}</text>
      </svg>
      <div className="do-wan-legend" aria-hidden="true"><span className="is-down">下载</span><span className="is-up">上传</span><span>单位 bit/s</span></div>
    </section>
  );
}
