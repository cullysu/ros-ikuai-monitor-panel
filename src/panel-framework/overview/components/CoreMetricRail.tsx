import { toneClass } from "./MobileOverviewUtils";
import type { MobileOverviewResolvedProps } from "./MobileOverviewTypes";

export function CoreMetricRail({ model }: MobileOverviewResolvedProps) {
  const metrics = model.coreMetrics.slice(1, 5);
  return (
    <section
      className="ik-v940-core-rail ik-v1044-metric-grid"
      aria-label="移动端核心指标"
      data-overview-mobile-core-block="core-metric-grid"
      data-overview-mobile-v940-core="state-wan-collection-resource-snapshot"
      data-overview-mobile-v1044-metric-grid="wan-collection-resource-snapshot-four-core-facts"
      data-overview-mobile-v1044-metric-count={metrics.length}
    >
      {metrics.map((item) => (
        <span className={toneClass(item.tone)} key={item.label} title={`${item.label} ${item.value} ${item.note}`}>
          <em>{item.label}</em>
          <strong>{item.value}</strong>
          <small>{item.note}</small>
        </span>
      ))}
    </section>
  );
}
