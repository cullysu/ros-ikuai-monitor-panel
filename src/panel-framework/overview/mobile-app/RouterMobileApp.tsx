import { useMemo, useState } from "react";
import type { OverviewDerivedState, OverviewRawSnapshot } from "../index";
import { RouterNetworkDetailScreen, RouterNetworkScreen } from "./RouterMobileScreens";
import { buildRouterMobileModel } from "./routerMobileModel";
import "./styles/router-mobile-app.css";
import "./styles/router-mobile-detail.css";

export interface RouterMobileAppProps {
  snapshot: OverviewRawSnapshot;
  state: OverviewDerivedState;
}

export function RouterMobileApp({ snapshot, state }: RouterMobileAppProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const model = useMemo(() => buildRouterMobileModel(snapshot, state), [snapshot, state]);

  return (
    <div className="rm-app" data-router-mobile-app data-scenario={model.scenario} data-tone={model.tone}>
      <header className="rm-header">
        <div className="rm-device-copy">
          <div><strong>{model.device.name}</strong><b>只读监控</b></div>
          <span>{model.device.secondary}</span>
        </div>
        <div className="rm-device-state" data-tone={model.device.tone}>
          <strong>{model.device.status}</strong>
          <span>{model.device.updated}</span>
        </div>
      </header>

      <main className="rm-content">
        {detailOpen
          ? <RouterNetworkDetailScreen model={model} onBack={() => setDetailOpen(false)} />
          : <RouterNetworkScreen model={model} onOpenDetail={() => setDetailOpen(true)} />}
      </main>
    </div>
  );
}
