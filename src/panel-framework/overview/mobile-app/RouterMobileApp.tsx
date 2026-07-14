import { useMemo, useState } from "react";
import type { OverviewDerivedState, OverviewRawSnapshot } from "../index";
import { RouterCollectionScreen, RouterNetworkDetailScreen, RouterNetworkScreen } from "./RouterMobileScreens";
import { buildRouterMobileModel } from "./routerMobileModel";
import "./styles/router-mobile-app.css";
import "./styles/router-mobile-detail.css";

type RouterMobileTab = "network" | "collection";

export interface RouterMobileAppProps {
  snapshot: OverviewRawSnapshot;
  state: OverviewDerivedState;
}

export function RouterMobileApp({ snapshot, state }: RouterMobileAppProps) {
  const [activeTab, setActiveTab] = useState<RouterMobileTab>("network");
  const [networkDetail, setNetworkDetail] = useState(false);
  const model = useMemo(() => buildRouterMobileModel(snapshot, state), [snapshot, state]);

  const selectTab = (tab: RouterMobileTab) => {
    setActiveTab(tab);
    setNetworkDetail(false);
  };

  return (
    <div className="rm-app" data-router-mobile-app data-scenario={model.scenario} data-tone={model.tone}>
      <header className="rm-header">
        <div className="rm-device-copy">
          <div><strong>{model.device.name}</strong><b>只读</b></div>
          <span>{model.device.secondary}</span>
        </div>
        <div className="rm-device-state" data-tone={model.tone}>
          <strong>{model.device.status}</strong>
          <span>{model.device.updated}</span>
        </div>
      </header>

      <main className="rm-content">
        <div className="rm-readonly-strip">仅监控状态，不会修改路由器配置</div>
        {activeTab === "network" ? (
          networkDetail
            ? <RouterNetworkDetailScreen model={model} onBack={() => setNetworkDetail(false)} />
            : <RouterNetworkScreen model={model} onOpenDetail={() => setNetworkDetail(true)} />
        ) : <RouterCollectionScreen model={model} />}
      </main>

      <nav className="rm-tabbar" aria-label="移动端主导航">
        <button type="button" className={activeTab === "network" ? "is-active" : ""} aria-current={activeTab === "network" ? "page" : undefined} onClick={() => selectTab("network")}>
          <b>网络</b>
        </button>
        <button type="button" className={activeTab === "collection" ? "is-active" : ""} aria-current={activeTab === "collection" ? "page" : undefined} onClick={() => selectTab("collection")}>
          <b>采集</b>
        </button>
      </nav>
    </div>
  );
}
