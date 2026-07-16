import { useId } from "react";
import type { SectionTimeSeries, SectionTimeSeriesVisualization } from "./sectionModels";
import "./section-timeseries.css";

function timeLabel(timestamp: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

function linePoints(series: SectionTimeSeries, start: number, end: number): string {
  const duration = Math.max(1, end - start);
  return series.points.map((point) => {
    const x = 6 + ((point.timestamp - start) / duration) * 308;
    const y = 6 + ((100 - point.value) / 100) * 76;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export function SectionTimeSeriesChart({ visualization }: { visualization: SectionTimeSeriesVisualization }) {
  const id = useId().replace(/:/g, "");
  const points = visualization.series.flatMap((series) => series.points);
  if (points.length < 2) return null;
  const start = Math.min(...points.map((point) => point.timestamp));
  const end = Math.max(...points.map((point) => point.timestamp));
  const startLabel = timeLabel(start);
  const endLabel = timeLabel(end);
  return (
    <figure className="section-timeseries" data-section-time-series>
      <figcaption>
        <span><b>{visualization.title}</b><small>{visualization.windowLabel} · 时间与比例尺来自同一采样窗</small></span>
        <span>0–100%</span>
      </figcaption>
      <div className="section-timeseries-body">
        <span className="section-timeseries-scale" aria-hidden="true"><b>100%</b><b>50%</b><b>0</b></span>
        <div className="section-timeseries-plot">
          <svg
            viewBox="0 0 320 88"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-labelledby={`${id}-title ${id}-desc`}
          >
            <title id={`${id}-title`}>{visualization.title}</title>
            <desc id={`${id}-desc`}>{visualization.accessibleSummary}，横轴从 {startLabel} 到 {endLabel}，纵轴从 0% 到 100%。</desc>
            <path className="section-series-grid" d="M6 6H314 M6 44H314 M6 82H314" />
            <path className="section-series-threshold is-85" d="M6 17.4H314" />
            <path className="section-series-threshold is-90" d="M6 13.6H314" />
            {visualization.series.map((series) => (
              <polyline className={`section-series-line is-${series.key}`} points={linePoints(series, start, end)} key={series.key} />
            ))}
          </svg>
          <span className="section-timeseries-axis" aria-hidden="true"><b>{startLabel}</b><b>{endLabel}</b></span>
        </div>
      </div>
      <footer>
        {visualization.series.map((series) => (
          <span key={series.key}><i className={`is-${series.key}`} aria-hidden="true" />{series.label}<small>阈值 {series.threshold}%</small></span>
        ))}
      </footer>
    </figure>
  );
}
