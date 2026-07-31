import type { OverviewResourceInstrument } from "../overview/evidence-model/overviewEvidenceTypes";

function ResourceMetrics({ resource }: { resource: OverviewResourceInstrument }) {
  const metrics = resource.metrics.slice(1);
  return (
    <div
      className="mp-resource-metrics"
      data-resource-evidence-role="current-threshold"
      aria-label={metrics.map((metric) => `${metric.label} ${metric.value ?? "未记录"}%，阈值 ${metric.threshold}%`).join("；")}
    >
      {metrics.map((metric) => {
        const observed = metric.value !== null;
        const rounded = observed ? Math.round(metric.value as number) : null;
        const value = observed ? Math.max(0, Math.min(100, metric.value as number)) : 0;
        return (
          <div
            className={observed ? "" : "is-missing"}
            data-resource-metric={metric.key}
            data-resource-evidence-role="current-threshold"
            key={metric.key}
          >
            <span><b>{metric.label}</b></span>
            <span
              className="mp-resource-meter"
              role={observed ? "meter" : undefined}
              aria-label={observed
                ? `${metric.label} ${rounded}%，策略阈值 ${metric.threshold}%`
                : `${metric.label} 未记录，策略阈值 ${metric.threshold}%`}
              aria-valuemin={observed ? 0 : undefined}
              aria-valuemax={observed ? 100 : undefined}
              aria-valuenow={rounded ?? undefined}
            >
              <i style={{ width: `${value}%` }} />
              <em style={{ left: `${metric.threshold}%` }} />
            </span>
            <strong>{rounded === null ? "未记录" : `${rounded}%`}</strong>
            <small>阈值 {metric.threshold}%</small>
          </div>
        );
      })}
    </div>
  );
}

export function MobileResourcePressure({ resource }: { resource: OverviewResourceInstrument }) {
  return (
    <section
      className="mp-resource"
      data-mobile-resource-signal={resource.status}
      data-resource-layer="signal"
      data-mobile-visual-layer="signal"
      data-resource-layer-question="current-threshold"
      aria-labelledby="mp-resource-title"
    >
      <header>
        <div><span className="mp-section-kicker">当前阈值</span><h2 id="mp-resource-title">资源压力</h2></div>
        <span className="mp-window">当前采样</span>
      </header>
      <ResourceMetrics resource={resource} />
    </section>
  );
}
