import { buildMobileOverviewModel } from "../mobileOverviewModel";
import type { MobileOverviewHomeProps } from "./MobileOverviewTypes";
import { toneClass } from "./MobileOverviewUtils";

export function JudgementStrip(props: MobileOverviewHomeProps) {
  const model = buildMobileOverviewModel(props.snapshot, props.state);
  const [status, ...metrics] = model.coreMetrics;
  return (
    <section
      className={`ik-v940-core-rail ik-v960-judgement-strip ${toneClass(status.tone)}`}
      aria-label="移动端核心判断"
      data-overview-mobile-core-block="core-metrics"
      data-overview-mobile-v940-core="state-wan-collection-resource-snapshot"
      data-overview-mobile-v960-judgement="conclusion-trust-wan-resource-snapshot"
      data-overview-mobile-priority={model.priority}
    >
      <strong>
        <i aria-hidden="true" />
        <b>{status.value}</b>
        <em>{status.note}</em>
      </strong>
      <div>
        {metrics.map((item) => (
          <span className={toneClass(item.tone)} key={item.label} title={`${item.label} ${item.value} ${item.note}`}>
            <em>{item.label}</em>
            <b>{item.value}</b>
          </span>
        ))}
      </div>
    </section>
  );
}
