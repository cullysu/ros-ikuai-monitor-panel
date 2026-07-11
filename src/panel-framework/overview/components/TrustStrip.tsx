import { toneClass } from "./MobileOverviewUtils";
import type { MobileOverviewResolvedProps } from "./MobileOverviewTypes";

function CollectionTrustRail({ model }: MobileOverviewResolvedProps) {
  if (model.appHomeContract.severity === "normal") return null;
  return (
    <div
      className="ik-v1058-collection-trust-rail"
      aria-label="采集链路可信度"
      data-overview-mobile-v1058-collection-trust="routeros-rest-ssh-snapshot-fixed-abnormal-first-screen"
      data-overview-mobile-v1059-collection-plane="collection-secondary-evidence-not-impact-verdict"
    >
      {model.collectionTrust.map((item) => (
        <span
          className={toneClass(item.tone)}
          data-overview-mobile-v1058-collection-channel={item.label}
          data-overview-mobile-v1059-plane="collection"
          key={`${item.label}-${item.value}`}
          title={`${item.label} ${item.value}`}
        >
          <i aria-hidden="true" />
          <b>{item.label}</b>
          <em>{item.value}</em>
        </span>
      ))}
    </div>
  );
}

export function TrustStrip({ model }: MobileOverviewResolvedProps) {
  return (
    <section
      className="ik-v910-trust-strip"
      aria-label="RouterOS 可信度"
      data-overview-mobile-trust-strip="forwarding-collection-snapshot-business"
      data-overview-mobile-core-block="trust-strip"
      data-overview-mobile-v1058-collection-trust-policy={model.appHomeContract.severity === "normal" ? "normal-hidden" : "fixed-abnormal-routeros-rest-ssh-snapshot"}
    >
      {model.trustPlanes.map((item) => (
        <span className={toneClass(item.tone)} key={item.id} title={`${item.label} ${item.value} ${item.note}`}>
          <b>{item.label}</b>
          <strong>{item.value}</strong>
        </span>
      ))}
      <CollectionTrustRail model={model} />
    </section>
  );
}
