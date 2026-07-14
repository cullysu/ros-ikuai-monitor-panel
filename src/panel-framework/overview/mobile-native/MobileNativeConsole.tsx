import { useState } from "react";
import type { OverviewPanelProps } from "../desktopOverviewHelpers";
import { MobileNativeDetail } from "./MobileNativeDetail";
import { MobileNativeSheet } from "./MobileNativeSheet";
import { MobileNativeTopology } from "./MobileNativeTopology";
import { buildMobileNativeModel } from "./mobileNativeModel";
import "./styles/mobile-native-tokens.css";
import "./styles/mobile-native-layout.css";
import "./styles/mobile-native-states.css";

export function MobileNativeConsole({ snapshot, state }: OverviewPanelProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const model = buildMobileNativeModel(snapshot, state);

  if (detailOpen) return <MobileNativeDetail model={model} onBack={() => setDetailOpen(false)} />;

  return (
    <main
      className={`mn-shell is-${model.scenario} is-path-${model.pathState}`}
      data-mobile-native-console
      data-mobile-native-scenario={model.scenario}
    >
      <header className="mn-chrome">
        <span><b>{model.device}</b><small>{model.deviceNote}</small></span>
        <span className="mn-readonly">只读</span>
      </header>
      <MobileNativeTopology model={model} />
      <MobileNativeSheet model={model} onOpenDetail={() => setDetailOpen(true)} />
    </main>
  );
}
