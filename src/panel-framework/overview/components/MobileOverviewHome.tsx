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
      className="ik-mobile-public-home"
      data-overview-mobile-console
      data-overview-mobile-scene={props.state.scenario}
      data-overview-mobile-priority={model.priority}
    >
      <div className="ik-mobile-app-shell">
        <main
          id="mobile-home-view"
          className="ik-mobile-decision-screen"
          data-overview-mobile-first-screen="app-home"
          data-overview-mobile-active-tab={activeTab}
        >
          <DeviceBar model={model} />
          {activeTab === "home" ? (
            <>
              <PrimaryDecision model={model} onSelectTab={setActiveTab} />
              {model.coreMetrics.length ? <CoreFacts model={model} /> : null}
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
