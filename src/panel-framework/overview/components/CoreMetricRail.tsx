import { buildMobileOverviewModel } from "../mobileOverviewModel";
import { toneClass } from "./MobileOverviewUtils";
import type { MobileOverviewHomeProps } from "./MobileOverviewTypes";

export function CoreMetricRail(props: MobileOverviewHomeProps) {
  const model = buildMobileOverviewModel(props.snapshot, props.state);
  return (
    <section
      className="ik-v940-core-rail"
      aria-label="移动端核心判断"
      data-overview-mobile-core-block="core-metrics"
      data-overview-mobile-v940-core="state-wan-collection-resource-snapshot"
    >
      {model.coreMetrics.map((item) => (
        <span className={toneClass(item.tone)} key={item.label} title={`${item.label} ${item.value} ${item.note}`}>
          <em>{item.label}</em>
          <strong>{item.value}</strong>
          <small>{item.note}</small>
        </span>
      ))}
    </section>
  );
}
