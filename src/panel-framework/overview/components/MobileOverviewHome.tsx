import { MobileOverviewStyles } from "./MobileOverviewStyles";
import { buildMobileOverviewModel } from "../mobileOverviewModel";
import { BottomTabs } from "./BottomTabs";
import type { MobileOverviewHomeProps } from "./MobileOverviewTypes";
import { PrimaryDecision } from "./MobileOverviewDecision";
import { CoreFacts, DeviceBar, SupportingList } from "./MobileOverviewHomeSections";

export function MobileOverviewHome(props: MobileOverviewHomeProps) {
  const model = buildMobileOverviewModel(props.snapshot, props.state);
  return (
    <div
      className="ik-v420-app ik-v240-app ik-mobile-public-home"
      data-overview-mobile-console
      data-overview-mobile-ios-router-home="true"
      data-overview-mobile-app-home="ikuai40-ios-router-home"
      data-overview-mobile-home-mode="ios-router-app-home"
      data-overview-mobile-home-version="v1100-public-decision-home"
      data-overview-mobile-no-desktop-collapse="true"
      data-overview-mobile-no-kpi-card-grid="true"
      data-overview-mobile-no-red-orange="true"
      data-overview-mobile-no-table-visual="true"
      data-overview-mobile-no-red-orange-blocks="true"
      data-overview-mobile-scene={props.state.scenario}
      data-overview-mobile-priority={model.priority}
      data-overview-mobile-severity={model.appHomeContract.severity}
      data-overview-mobile-layout-contract={model.appHomeContract.layout}
      data-overview-mobile-ranking-policy={model.appHomeContract.rankingPolicy}
      data-overview-mobile-abnormal-ia={model.appHomeContract.informationArchitecture}
      data-overview-mobile-top-slot={model.appHomeContract.topSlot}
      data-overview-mobile-terminal-ranking-state={model.appHomeContract.terminalRanking}
      data-overview-mobile-first-question={model.appHomeContract.firstQuestion}
      data-overview-mobile-trust-boundary={model.appHomeContract.trustBoundary}
      data-overview-mobile-impact-scope={model.impactScope.id}
      data-overview-mobile-impact-plane={model.impactScope.plane}
      data-overview-mobile-design-token-system="mobileOverviewTokens:color-type-space-radius-state-chart"
      data-overview-mobile-normal-app-home={model.priority === "normal" ? "compact-conclusion-chart-ops" : undefined}
      data-overview-mobile-compact-conclusion={model.priority === "normal" ? "conclusion-trust-wan-collection-resource-snapshot" : undefined}
      data-overview-mobile-collection-policy={model.collectionTrustSeparation.contract}
      data-overview-mobile-collection-plane={model.collectionTrustSeparation.collectionPlane}
      data-overview-mobile-collection-separated={model.collectionTrustSeparation.separatedFromImpact ? "true" : "false"}
      data-overview-mobile-v1090-first-screen-order="conclusion-trust-four-facts-priority-incident-supporting-list"
      data-overview-mobile-p0-first-screen={model.appHomeContract.severity === "p0" ? "trust-wan-route-collection-success-no-terminal-ranking" : undefined}
      data-overview-mobile-no-snapshot-no-rate-placeholder={props.state.scenario === "no-snapshot" ? "true" : undefined}
    >
      <div className="ik-v420-shell ik-v240-shell">
        <main
          className="ik-v420-screen ik-v240-screen ik-mobile-decision-screen"
          data-overview-mobile-first-screen="app-home"
          data-overview-mobile-first-screen-no-table="true"
          data-overview-mobile-first-screen-uses-microchart="true"
          data-overview-mobile-app-question={model.appHomeContract.firstQuestion}
          data-overview-mobile-app-trust-boundary={model.appHomeContract.trustBoundary}
          data-overview-mobile-app-ranking-policy={model.appHomeContract.rankingPolicy}
          data-overview-mobile-app-abnormal-ia={model.appHomeContract.informationArchitecture}
          data-overview-mobile-app-terminal-ranking-state={model.appHomeContract.terminalRanking}
        >
          <DeviceBar model={model} />
          <PrimaryDecision model={model} />
          <CoreFacts model={model} />
          <SupportingList model={model} />
          <BottomTabs />
        </main>
      </div>
      <MobileOverviewStyles />
    </div>
  );
}
