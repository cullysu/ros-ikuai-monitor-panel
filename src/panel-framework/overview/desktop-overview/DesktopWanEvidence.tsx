import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { OverviewTrafficInstrument, OverviewTrafficPoint } from "../evidence-model/overviewEvidenceTypes";

const WIDTH = 760;
const HEIGHT = 136;
const BASE_PLOT = { left: 54, right: 18, top: 14, bottom: 28 };

function pathFor(
  points: OverviewTrafficPoint[],
  key: "down" | "up",
  peak: number,
  plot: typeof BASE_PLOT,
): string {
  const width = WIDTH - plot.left - plot.right;
  const height = HEIGHT - plot.top - plot.bottom;
  return points.map((point, index) => {
    const x = plot.left + (points.length === 1 ? width : (index / (points.length - 1)) * width);
    const y = plot.top + height - (point[key] / peak) * height;
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
  const peakLabelRef = useRef<SVGTextElement>(null);
  const [plotLeft, setPlotLeft] = useState(BASE_PLOT.left);
  const hasTrend = traffic.status === "ready" && traffic.points.length >= 2;
  const fallbackPoint: OverviewTrafficPoint = { timestamp: Date.now(), down: 0, up: 0 };
  const rawPeak = Math.max(1, ...traffic.points.flatMap((point) => [point.down, point.up]));
  const plot = { ...BASE_PLOT, left: plotLeft };
  const downPath = pathFor(traffic.points, "down", rawPeak, plot);
  const upPath = pathFor(traffic.points, "up", rawPeak, plot);
  const first = traffic.points[0] ?? fallbackPoint;
  const middle = traffic.points[Math.floor((traffic.points.length - 1) / 2)] ?? fallbackPoint;
  const last = traffic.points[traffic.points.length - 1] ?? fallbackPoint;
  const plotHeight = HEIGHT - plot.top - plot.bottom;
  const latestX = WIDTH - plot.right;
  const latestDownY = plot.top + plotHeight - (last.down / rawPeak) * plotHeight;
  const latestUpY = plot.top + plotHeight - (last.up / rawPeak) * plotHeight;
  const titleId = "do-wan-chart-title";
  const descId = "do-wan-chart-desc";

  useLayoutEffect(() => {
    const measured = peakLabelRef.current?.getComputedTextLength() || 0;
    if (!measured) return;
    const next = Math.min(Math.floor(WIDTH * 0.28), Math.max(BASE_PLOT.left, Math.ceil(measured + 16)));
    setPlotLeft(next);
  }, [traffic.peak]);

  return (
    <section
      className={`do-wan ${hasTrend ? "is-trend" : "is-accumulating"}`}
      aria-labelledby="do-wan-heading"
      data-desktop-wan-evidence
      data-overview-task-landmark="signal"
      data-sample-count={traffic.sampleCount}
      data-trend-state={hasTrend ? "trend" : "accumulating"}
    >
      <header className="do-module-heading">
        <div><h2 id="do-wan-heading">{traffic.title}</h2><p>{traffic.windowLabel} · 统一采样窗口</p></div>
        <button type="button" onClick={onOpen}>流量审计<ChevronRight aria-hidden="true" size={16} /></button>
      </header>
      <div className="do-wan-summary" aria-label="WAN 当前与峰值">
        <span><ArrowDown aria-hidden="true" size={15} /><small>当前下载</small><b>{traffic.currentDown}</b></span>
        <span><ArrowUp aria-hidden="true" size={15} /><small>当前上传</small><b>{traffic.currentUp}</b></span>
        {hasTrend ? (
          <>
            <span><small>窗口峰值</small><b>{traffic.peak}</b></span>
            <span><small>采样</small><b>{traffic.sampleCount} 点</b></span>
          </>
        ) : (
          <>
            <span><small>原子样本</small><b>{traffic.sampleCount} 点</b></span>
            <span><small>趋势状态</small><b>待积累</b></span>
          </>
        )}
      </div>
      {hasTrend ? (
        <svg
        className="do-wan-chart"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
         preserveAspectRatio="xMidYMid meet"
         data-unit={traffic.unit}
         data-axis-left={plot.left}
       >
        <title id={titleId}>WAN 下载与上传吞吐时间序列</title>
        <desc id={descId}>{traffic.accessibleSummary}</desc>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = plot.top + plotHeight - ratio * plotHeight;
          return <line className="do-chart-grid" x1={plot.left} x2={WIDTH - plot.right} y1={y} y2={y} key={ratio} />;
        })}
        <line className="do-chart-axis" x1={plot.left} x2={plot.left} y1={plot.top} y2={HEIGHT - plot.bottom} />
        <line className="do-chart-axis" x1={plot.left} x2={WIDTH - plot.right} y1={HEIGHT - plot.bottom} y2={HEIGHT - plot.bottom} />
        <text ref={peakLabelRef} className="do-chart-label" x={plot.left - 8} y={plot.top + 4} textAnchor="end" data-chart-peak-label>{traffic.peak}</text>
        <text className="do-chart-label" x={plot.left - 8} y={HEIGHT - plot.bottom + 4} textAnchor="end">0</text>
        <path className="do-chart-line is-down" d={downPath} />
        <path className="do-chart-line is-up" d={upPath} />
        <circle className="do-chart-point is-down" cx={latestX} cy={latestDownY} r="4" />
        <circle className="do-chart-point is-up" cx={latestX} cy={latestUpY} r="4" />
        <text className="do-chart-time" x={plot.left} y={HEIGHT - 14} textAnchor="start">{timeLabel(first.timestamp)}</text>
        <text className="do-chart-time" x={WIDTH / 2} y={HEIGHT - 14} textAnchor="middle">{timeLabel(middle.timestamp)}</text>
        <text className="do-chart-time" x={WIDTH - plot.right} y={HEIGHT - 14} textAnchor="end">{timeLabel(last.timestamp)}</text>
        </svg>
      ) : (
        <div className="do-wan-pending" role="status" data-traffic-accumulating>
          <b>时间序列待积累</b>
          <span>当前上下行读数来自 1 个带时间的原子样本；至少取得 2 个同窗样本后才绘制趋势。</span>
        </div>
      )}
      {hasTrend ? (
        <div className="do-wan-legend" aria-hidden="true"><span className="is-down">下载</span><span className="is-up">上传</span><span>单位 {traffic.unit}</span></div>
      ) : null}
    </section>
  );
}
