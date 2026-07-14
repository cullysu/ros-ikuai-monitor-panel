import { useMemo, useState } from "react";
import type { OverviewDerivedState, OverviewRawSnapshot } from "../index";
import { RouterCollectionScreen, RouterNetworkScreen } from "./RouterMobileScreens";
import { buildRouterMobileModel } from "./routerMobileModel";
import "./styles/router-mobile-app.css";

type RouterMobileTab = "network" | "collection";

export interface RouterMobileAppProps {
  snapshot: OverviewRawSnapshot;
  state: OverviewDerivedState;
}

export function RouterMobileApp({ snapshot, state }: RouterMobileAppProps) {
  const [activeTab, setActiveTab] = useState<RouterMobileTab>("network");
  const model = useMemo(() => buildRouterMobileModel(snapshot, state), [snapshot, state]);

  return (
    <div className="rm-app" data-router-mobile-app data-scenario={model.scenario} data-tone={model.tone}>
      <header className="rm-header">
        <div className="rm-device-mark" aria-hidden="true"><i /><i /><i /></div>
        <div className="rm-device-copy">
          <strong>{model.device.name}</strong>
          <span>{model.device.secondary}</span>
        </div>
        <div className="rm-device-state" data-tone={model.tone}>
          <strong>{model.device.status}</strong>
          <span>{model.device.updated}</span>
        </div>
      </header>

      <main className="rm-content">
        <div className="rm-readonly-strip"><span>只读监控</span><p>页面不会修改路由器配置</p></div>
        {activeTab === "network" ? <RouterNetworkScreen model={model} /> : <RouterCollectionScreen model={model} />}
      </main>

      <nav className="rm-tabbar" aria-label="移动端主导航">
        <button type="button" className={activeTab === "network" ? "is-active" : ""} aria-current={activeTab === "network" ? "page" : undefined} onClick={() => setActiveTab("network")}>
          <span aria-hidden="true">↕</span><b>网络</b>
        </button>
        <button type="button" className={activeTab === "collection" ? "is-active" : ""} aria-current={activeTab === "collection" ? "page" : undefined} onClick={() => setActiveTab("collection")}>
          <span aria-hidden="true">⟳</span><b>采集</b>
        </button>
      </nav>
    </div>
  );
}
