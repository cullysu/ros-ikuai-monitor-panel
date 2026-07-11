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
      data-overview-mobile-v420-app-home="apple-ios-ikuai40-router-home"
      data-overview-mobile-v420-first-screen-contract="device-state-update-decision-four-facts-next-step-supporting-tabs"
      data-overview-mobile-v420-frame-model="independent-mobile-home-not-desktop-collapse"
      data-overview-mobile-v420-visual-contract="decision-first-scenario-visual-four-facts-supporting-list"
      data-overview-mobile-v420-design="router-app-home-flat-console-not-h5-health-app"
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
      data-overview-mobile-v1010-product-app-polish="native-readout-rail-no-ellipsis-subtle-tabbar"
      data-overview-mobile-v1020-public-product-polish="ios-rhythm-low-noise-grouped-surfaces-router-native-tabs"
      data-overview-mobile-v1030-native-trust-spine="grouped-trust-spine-low-card-noise"
      data-overview-mobile-v1043-native-token-contract="native-console-tokenized-rhythm-low-noise-trust-first"
      data-overview-mobile-v1046-abnormal-decision-contract="object-impact-evidence-next-action-low-noise-console"
      data-overview-mobile-v1058-collection-trust={model.appHomeContract.severity === "normal" ? "normal-hidden" : "routeros-rest-ssh-snapshot-fixed-abnormal-first-screen"}
      data-overview-mobile-v1059-collection-impact-separation={model.collectionTrustSeparation.contract}
      data-overview-mobile-v1059-collection-plane={model.collectionTrustSeparation.collectionPlane}
      data-overview-mobile-v1059-impact-plane={model.collectionTrustSeparation.impactPlane}
      data-overview-mobile-v1059-separated-from-impact={model.collectionTrustSeparation.separatedFromImpact ? "true" : "false"}
      data-overview-mobile-v1065-normal-first-screen={model.priority === "normal" ? "separate-conclusion-trust-four-facts-chart-first" : undefined}
      data-overview-mobile-v1070-grouped-surfaces="ios-grouped-gray-separators-no-card-border-stack"
      data-overview-mobile-v1090-first-screen-order="conclusion-trust-four-facts-priority-incident-supporting-list"
      data-overview-mobile-p0-first-screen={model.appHomeContract.severity === "p0" ? "trust-wan-route-collection-success-no-terminal-ranking" : undefined}
      data-overview-mobile-v1100-public-home="one-primary-task-evidence-below-fold-ios-safe-area"
      data-overview-mobile-v1100-readonly-mode="visible"
      data-overview-mobile-v1100-first-screen-order="device-decision-four-facts-next-step-supporting-tabs"
      data-overview-mobile-v1110-public-home="device-primary-card-four-facts-supporting-no-redundant-strips"
      data-overview-mobile-v1110-first-screen-order="device-primary-decision-four-facts-supporting-list-tabs"
      data-overview-mobile-v1120-public-home="single-task-verdict-core-facts-detail-entry"
      data-overview-mobile-v1120-first-screen-order="device-primary-decision-four-facts-detail-entry-tabs"
      data-overview-mobile-v1120-evidence-depth="supporting-rows-deferred-from-first-screen"
      data-overview-mobile-v1121-public-home="device-state-recent-only-no-action-button"
      data-overview-mobile-no-snapshot-no-rate-placeholder={props.state.scenario === "no-snapshot" ? "true" : undefined}
    >
      <div className="ik-v420-shell ik-v240-shell">
        <main
          className="ik-v420-screen ik-v240-screen ik-mobile-decision-screen"
          data-overview-mobile-first-screen="app-home"
          data-overview-mobile-first-screen-no-table="true"
          data-overview-mobile-first-screen-uses-microchart="true"
          data-overview-mobile-v420-first-screen-contract="ios-router-decision-home"
          data-overview-mobile-v420-frame-model="independent-mobile-home-not-table-stack"
          data-overview-mobile-app-question={model.appHomeContract.firstQuestion}
          data-overview-mobile-app-trust-boundary={model.appHomeContract.trustBoundary}
          data-overview-mobile-app-ranking-policy={model.appHomeContract.rankingPolicy}
          data-overview-mobile-app-abnormal-ia={model.appHomeContract.informationArchitecture}
          data-overview-mobile-app-terminal-ranking-state={model.appHomeContract.terminalRanking}
          data-overview-mobile-v1100-first-screen-hierarchy="device-primary-decision-four-facts-next-step-supporting-list-tabs"
          data-overview-mobile-v1110-first-screen-hierarchy="device-primary-decision-four-facts-supporting-list-tabs"
          data-overview-mobile-v1120-first-screen-hierarchy="device-primary-decision-four-facts-detail-entry-tabs"
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
