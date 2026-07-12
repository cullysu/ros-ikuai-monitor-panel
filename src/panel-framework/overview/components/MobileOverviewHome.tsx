import { useState } from "react";
import { buildMobileOverviewModel } from "../mobileOverviewModel";
import "../styles/mobile/mobile-product.css";
import { BottomTabs, type MobileBottomTabId } from "./BottomTabs";
import type { MobileOverviewHomeProps } from "./MobileOverviewTypes";
import { PrimaryDecision } from "./MobileOverviewDecision";
import { CoreFacts, DeviceBar, SupportingList } from "./MobileOverviewHomeSections";
import { MobileOverviewTabView } from "./MobileOverviewTabView";

export function MobileOverviewHome(props: MobileOverviewHomeProps) {
  const [activeTab, setActiveTab] = useState<MobileBottomTabId>("home");
  const model = buildMobileOverviewModel(props.snapshot, props.state);
  return (
    <div
      className="ik-v420-app ik-v240-app ik-mobile-public-home"
      data-overview-mobile-console
      data-overview-mobile-app-home="ikuai40-ios-router-home"
      data-overview-mobile-no-desktop-collapse="true"
      data-overview-mobile-scene={props.state.scenario}
      data-overview-mobile-priority={model.priority}
    >
      <div className="ik-v420-shell ik-v240-shell">
        <main
          className="ik-v420-screen ik-v240-screen ik-mobile-decision-screen"
          data-overview-mobile-first-screen="app-home"
          data-overview-mobile-first-screen-no-table="true"
          data-overview-mobile-first-screen-uses-microchart="true"
          data-overview-mobile-active-tab={activeTab}
        >
          <DeviceBar model={model} />
          {activeTab === "home" ? (
            <>
              <PrimaryDecision model={model} />
              <CoreFacts model={model} />
              <SupportingList model={model} />
            </>
          ) : (
            <MobileOverviewTabView activeTab={activeTab} model={model} snapshot={props.snapshot} state={props.state} />
          )}
          <BottomTabs activeId={activeTab} onSelect={setActiveTab} />
        </main>
      </div>
    </div>
  );
}
