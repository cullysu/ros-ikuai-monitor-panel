import { useCallback, useEffect, useRef, useState } from "react";
import type { OverviewPanelProps } from "../desktopOverviewHelpers";
import { MobileNativeDetail } from "./MobileNativeDetail";
import { MobileNativeObjectWorkspace } from "./MobileNativeObjectWorkspace";
import { MobileNativePatrolBrief } from "./MobileNativePatrolBrief";
import { buildMobileNativeModel } from "./mobileNativeModel";
import "./styles/mobile-native-tokens.css";
import "./styles/mobile-native-layout.css";
import "./styles/mobile-native-states.css";

export function MobileNativeConsole({ snapshot, state }: OverviewPanelProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const model = buildMobileNativeModel(snapshot, state);
  const [selectedObject, setSelectedObject] = useState(model.initialObject);
  const [expandedObjects, setExpandedObjects] = useState<Partial<Record<typeof model.initialObject, boolean>>>({});
  const detailButtonRef = useRef<HTMLButtonElement>(null);
  const detailOpenRef = useRef(false);
  const returnScrollRef = useRef(0);
  const restoreMountTimerRef = useRef(0);
  const restoreRetryRef = useRef(0);

  useEffect(() => {
    setSelectedObject(model.initialObject);
    setExpandedObjects({});
  }, [model.initialObject, model.scenario]);

  const cancelFocusRestore = useCallback(() => {
    window.clearTimeout(restoreMountTimerRef.current);
    window.clearTimeout(restoreRetryRef.current);
    restoreMountTimerRef.current = 0;
    restoreRetryRef.current = 0;
  }, []);

  const restoreDetailFocus = useCallback(() => {
    cancelFocusRestore();
    let attempts = 0;
    const restoreWhenMounted = () => {
      restoreMountTimerRef.current = 0;
      const target = detailButtonRef.current;
      if (!target?.isConnected) {
        attempts += 1;
        if (attempts < 20) restoreMountTimerRef.current = window.setTimeout(restoreWhenMounted, 16);
        return;
      }
      target.focus({ preventScroll: true });
      window.scrollTo({ top: returnScrollRef.current, behavior: "auto" });
      restoreRetryRef.current = window.setTimeout(() => {
        restoreRetryRef.current = 0;
        const active = document.activeElement;
        if ((!active || active === document.body || !active.isConnected) && target.isConnected) {
          target.focus({ preventScroll: true });
          window.scrollTo({ top: returnScrollRef.current, behavior: "auto" });
        }
      }, 80);
    };
    restoreMountTimerRef.current = window.setTimeout(restoreWhenMounted, 0);
  }, [cancelFocusRestore]);

  useEffect(() => {
    const onPopState = () => {
      if (!detailOpenRef.current) return;
      detailOpenRef.current = false;
      setDetailOpen(false);
      restoreDetailFocus();
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      cancelFocusRestore();
    };
  }, [cancelFocusRestore, restoreDetailFocus]);

  const openDetail = () => {
    cancelFocusRestore();
    returnScrollRef.current = window.scrollY;
    detailOpenRef.current = true;
    window.history.pushState({ ...(window.history.state || {}), mobileNativeDetail: true }, "");
    setDetailOpen(true);
  };

  const closeDetail = () => {
    if (window.history.state?.mobileNativeDetail) window.history.back();
    else {
      detailOpenRef.current = false;
      setDetailOpen(false);
      restoreDetailFocus();
    }
  };

  if (detailOpen) return <MobileNativeDetail model={model} onBack={closeDetail} />;

  return (
    <main
      className={`mn-shell is-${model.scenario} is-evidence-${model.evidenceMode}`}
      data-mobile-native-console
      data-mobile-native-scenario={model.scenario}
      data-mobile-native-evidence={model.evidenceMode}
      data-mobile-route-verification={model.routeVerification}
      data-mobile-native-incident={model.incident ? "true" : "false"}
    >
      <header className="mn-navigation">
        <span><b>{model.device}</b><small>{model.deviceNote}</small></span>
        <span className="mn-readonly-label">只读监控</span>
      </header>
      <div className="mn-mobile-workspace">
        <MobileNativePatrolBrief model={model} />
        <MobileNativeObjectWorkspace
          model={model}
          selected={selectedObject}
          onSelect={setSelectedObject}
          expanded={Boolean(expandedObjects[selectedObject])}
          onExpandedChange={(expanded) => setExpandedObjects((current) => ({ ...current, [selectedObject]: expanded }))}
          onOpenDetail={openDetail}
          detailButtonRef={detailButtonRef}
        />
      </div>
    </main>
  );
}
