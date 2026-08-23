import { useId } from "react";
import type { SectionTimeSeries, SectionTimeSeriesVisualization } from "./sectionModels";
import { useResponsiveSvgViewport } from "../useResponsiveSvgViewport";
import { percentagePointY, timeSeriesPointX } from "./timeSeriesGeometry";
import "./section-timeseries.css";

function timeLabel(timestamp: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

function linePoints(
  series: SectionTimeSeries,
  start: number,
  end: number,
  width: number,
  height: number,
  min: number,
  max: number,
): string {
  const right = Math.max(6, width - 6);
  const bottom = Math.max(6, height - 6);
  return series.points.map((point) => (
    timeSeriesPointX(point.timestamp, start, end, 6, right).toFixed(1) + "," +
    percentagePointY(point.value, 6, bottom, min, max).toFixed(1)
  )).join(" ");
}

export function SectionTimeSeriesChart({
  visualization,
  embedded = false,
}: {
  visualization: SectionTimeSeriesVisualization;
  embedded?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const { ref: chartRef, viewport } = useResponsiveSvgViewport({ width: 320, height: 104 });
  const points = visualization.series.flatMap((series) => series.points);
  if (points.length < 2) return null;
  const start = Math.min(...points.map((point) => point.timestamp));
  const end = Math.max(...points.map((point) => point.timestamp));
  const startLabel = timeLabel(start);
  const endLabel = timeLabel(end);
  const thresholds = [...new Set(visualization.series.map((series) => series.threshold))].map((threshold) => ({
    threshold,
    text: threshold + "% · " + visualization.series
      .filter((series) => series.threshold === threshold)
      .map((series) => series.label)
      .join("/"),
  }));
  const right = Math.max(6, viewport.width - 6);
  const bottom = Math.max(6, viewport.height - 6);
  const { min, max } = visualization;
  const scaleValues = [max, (min + max) / 2, min];
  const domainLabel = `${min ? "局部刻度 " : ""}${min}–${max}%`;
  const seriesReadouts = visualization.series.map((series) => {
    const values = series.points.map((point) => point.value).filter(Number.isFinite);
    const current = values[values.length - 1];
    const peak = Math.max(...values);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const format = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(1)}${series.unit}`;
    return {
      key: series.key,
      label: series.label,
      current: format(current),
      peak: format(peak),
      mean: format(mean),
      samples: values.length,
    };
  });
  const yAt = (value: number) => percentagePointY(value, 6, bottom, min, max);
  return (
    <figure
      className={"section-timeseries" + (embedded ? " is-embedded" : "")}
      data-section-time-series
      data-section-time-series-embedded={embedded || undefined}
    >
      {!embedded ? <figcaption>
        <span><b>{visualization.title}</b><small>{visualization.windowLabel} · 时间与比例尺来自同一采样窗</small></span>
        <span>{domainLabel}</span>
      </figcaption> : null}
      <div className="section-timeseries-body">
        <span className="section-timeseries-scale" aria-hidden="true">{scaleValues.map((value) => <b key={value}>{value}%</b>)}</span>
        <div className="section-timeseries-plot">
          <svg
            ref={chartRef}
            data-responsive-svg-width={viewport.width}
            data-responsive-svg-height={viewport.height}
            viewBox={[0, 0, viewport.width, viewport.height].join(" ")}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-labelledby={id + "-title " + id + "-desc"}
          >
            <title id={id + "-title"}>{visualization.title}</title>
            <desc id={id + "-desc"}>{visualization.accessibleSummary}；{thresholds.map((item) => item.text).join("；")}；横轴 {startLabel} 至 {endLabel}，纵轴 {domainLabel}。</desc>
            {scaleValues.map((value) => (
              <line className="section-series-grid" x1="6" x2={right} y1={yAt(value)} y2={yAt(value)} key={value} />
            ))}
            {thresholds.map((item) => (
              <line
                className={"section-series-threshold is-" + item.threshold}
                data-section-threshold={item.threshold}
                data-threshold-label={item.text}
                x1="6"
                x2={right}
                y1={yAt(item.threshold)}
                y2={yAt(item.threshold)}
                key={item.threshold}
              />
            ))}
            {visualization.series.map((series) => (
              <polyline
                className={"section-series-line is-" + series.key}
                data-section-series={series.key}
                points={linePoints(series, start, end, viewport.width, viewport.height, min, max)}
                key={series.key}
              />
            ))}
          </svg>
          <span className="section-timeseries-axis" aria-hidden="true"><b>{startLabel}</b><b>{endLabel}</b></span>
        </div>
      </div>
      <footer aria-hidden="true">
        {visualization.series.map((series) => (
          <span key={series.key}><i className={"is-" + series.key} />{series.label}</span>
        ))}
        <strong className="section-threshold-label">{domainLabel}</strong>
        <strong className="section-threshold-label">阈值</strong>
        {thresholds.map((item) => <span className="section-threshold-entry" key={item.threshold}>{item.text}</span>)}
        <div className="section-timeseries-readouts" aria-label="当前、峰值、均值与数据点">
          {seriesReadouts.map((readout) => (
            <span key={readout.key}>
              <b>{readout.label}</b> 当前 {readout.current} · 峰值 {readout.peak} · 均值 {readout.mean} · 数据点 {readout.samples}
            </span>
          ))}
        </div>
      </footer>
    </figure>
  );
}
