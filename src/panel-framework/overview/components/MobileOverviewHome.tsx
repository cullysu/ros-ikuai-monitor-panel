import { MobileOverviewStyles } from "./MobileOverviewStyles";
import {
  BottomTabs,
  HomeSurface,
  IncidentHero,
  StatusHeader,
  type MobileOverviewHomeProps,
} from "./MobileOverviewSections";

export function MobileOverviewHome(props: MobileOverviewHomeProps) {
  return (
    <div
      className="ik-v420-app ik-v240-app"
      data-overview-mobile-console
      data-overview-mobile-ios-router-home="true"
      data-overview-mobile-app-home="ikuai40-ios-router-home"
      data-overview-mobile-home-mode="ios-router-app-home"
      data-overview-mobile-home-version="v420"
      data-overview-mobile-v420-app-home="apple-ios-ikuai40-router-home"
      data-overview-mobile-v420-first-screen-contract="device-status-time-network-hero-status-ledger-ranking-tabs"
      data-overview-mobile-v420-frame-model="ios-router-app-home-not-desktop-collapse-not-table-not-box-stack"
      data-overview-mobile-v420-visual-contract="thin-wan-sparkline-labelled wan-collection-duo resource-pressure-bars native-topn-list"
      data-overview-mobile-v420-design="router-app-home-not-rounded-web-admin"
      data-overview-mobile-no-desktop-collapse="true"
      data-overview-mobile-no-kpi-card-grid="true"
      data-overview-mobile-no-red-orange="true"
      data-overview-mobile-no-table-visual="true"
      data-overview-mobile-no-red-orange-blocks="true"
      data-overview-mobile-scene={props.state.scenario}
      data-overview-mobile-no-snapshot-no-rate-placeholder={props.state.scenario === "no-snapshot" ? "true" : undefined}
    >
      <MobileOverviewStyles />
      <div className="ik-v420-shell ik-v240-shell">
        <main
          className="ik-v420-screen ik-v240-screen"
          data-overview-mobile-first-screen="app-home"
          data-overview-mobile-first-screen-no-table="true"
          data-overview-mobile-first-screen-uses-microchart="true"
          data-overview-mobile-v420-first-screen-contract="ios-nav-network-hero-status-ledger-ranking-tab"
          data-overview-mobile-v420-frame-model="ios-router-app-home-not-desktop-collapse-not-table-not-box-stack"
          data-overview-mobile-v420-visual-contract="single-labelled-wan-sparkline-wan-collection-duo-resource-bars-native-ranking"
        >
          <StatusHeader {...props} />
          <IncidentHero {...props} />
          <HomeSurface {...props} />
          <BottomTabs />
        </main>
      </div>
    </div>
  );
}
