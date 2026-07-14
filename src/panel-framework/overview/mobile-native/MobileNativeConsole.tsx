import { useState } from "react";
import type { OverviewPanelProps } from "../desktopOverviewHelpers";
import { MobileNativeDetail } from "./MobileNativeDetail";
import { MobileNativeHome } from "./MobileNativeHome";
import { MobileNativePathEvidence } from "./MobileNativePathEvidence";
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
      className={`mn-shell is-${model.scenario} is-evidence-${model.evidenceMode}`}
      data-mobile-native-console
      data-mobile-native-scenario={model.scenario}
      data-mobile-native-evidence={model.evidenceMode}
    >
      <header className="mn-chrome">
        <span><b>{model.device}</b><small>{model.deviceNote}</small></span>
        <span className="mn-readonly">只读</span>
      </header>
      <div className="mn-home-layout">
        <MobileNativeHome model={model} onOpenDetail={() => setDetailOpen(true)} />
        <MobileNativePathEvidence model={model} />
      </div>
    </main>
  );
}
