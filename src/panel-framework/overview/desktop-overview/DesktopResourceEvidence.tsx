import type { OverviewResourceInstrument } from "../evidence-model/overviewEvidenceTypes";
import { SectionTimeSeriesChart } from "../../sections/SectionTimeSeriesChart";
import { resourceTimeSeries } from "../../sections/resourceTimeSeries";

export function DesktopResourceEvidence({ resource }: { resource: OverviewResourceInstrument }) {
  const chartReady = resource.status === "ready" && resource.metrics.some((metric) => metric.points.length >= 2);
  return (
    <section
      className="do-resource"
      data-desktop-resource-evidence={resource.status}
      data-overview-task-landmark="signal"
      data-sample-count={resource.sampleCount}
      aria-labelledby="do-resource-title"
    >
      <header className="do-resource-heading">
        <div><small>资源压力</small><h3 id="do-resource-title">当前值与策略阈值</h3></div>
        <span>{resource.windowLabel} · {resource.sampleCount} 点</span>
      </header>
      <div className="do-resource-metrics" aria-label={resource.accessibleSummary}>
        {resource.metrics.map((metric) => {
          const latest = metric.points[metric.points.length - 1];
          return <div
            data-desktop-resource-metric={metric.key}
            data-current={metric.value ?? undefined}
            data-threshold={metric.threshold}
            data-history-latest={latest?.value}
            data-history-at={latest ? new Date(latest.timestamp).toISOString() : undefined}
            data-history-samples={metric.points.length}
            key={metric.key}
          >
            <b>{metric.label}</b><strong>{metric.value === null ? "未记录" : `${Math.round(metric.value)}%`}</strong><small>阈值 {metric.threshold}%</small>
          </div>;
        })}
      </div>
      {chartReady
        ? <SectionTimeSeriesChart visualization={resourceTimeSeries(resource)!} embedded />
        : <p className="do-resource-pending">当前完整样本不足两个；保留当前值和阈值，不绘制时间趋势。</p>}
    </section>
  );
}
