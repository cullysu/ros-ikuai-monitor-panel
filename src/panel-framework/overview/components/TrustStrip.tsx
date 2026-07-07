import { buildMobileOverviewModel } from "../mobileOverviewModel";
import { toneClass } from "./MobileOverviewUtils";
import type { MobileOverviewHomeProps } from "./MobileOverviewTypes";

export function TrustStrip(props: MobileOverviewHomeProps) {
  const model = buildMobileOverviewModel(props.snapshot, props.state);
  return (
    <section
      className="ik-v910-trust-strip"
      aria-label="RouterOS 可信度"
      data-overview-mobile-trust-strip="forwarding-collection-snapshot-business"
      data-overview-mobile-core-block="trust-strip"
    >
      {model.trustPlanes.map((item) => (
        <span className={toneClass(item.tone)} key={item.id} title={`${item.label} ${item.value} ${item.note}`}>
          <b>{item.label}</b>
          <strong>{item.value}</strong>
        </span>
      ))}
    </section>
  );
}
