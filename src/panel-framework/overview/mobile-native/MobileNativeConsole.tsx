import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { OverviewPanelProps } from "../desktopOverviewHelpers";
import { MobileNativeDetail } from "./MobileNativeDetail";
import { MobileNativePhoneHome, MobileNativeTabletHome } from "./MobileNativeHome";
import { detailViewFromHistory } from "./mobileNativeHistory";
import { buildMobileNativeModel } from "./mobileNativeModel";
import type { MobileFocusKey } from "./mobileNativeTypes";
import "./styles/mobile-native-tokens.css";
import "./styles/mobile-native-layout.css";
import "./styles/mobile-native-responsive.css";
import "./styles/mobile-native-source.css";
import "./styles/mobile-native-workspace.css";
import "./styles/mobile-native-states.css";

const TABLET_QUERY = "(min-width: 700px) and (min-height: 600px)";

function useTabletWorkspace(): boolean {
  const [tablet, setTablet] = useState(() => typeof window !== "undefined" && window.matchMedia(TABLET_QUERY).matches);
  useEffect(() => {
    const media = window.matchMedia(TABLET_QUERY);
    const sync = () => setTablet(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return tablet;
}

export function MobileNativeConsole({ snapshot, state }: OverviewPanelProps) {
  const model = useMemo(() => buildMobileNativeModel(snapshot, state), [snapshot, state]);
  const initialHistoryView = typeof window !== "undefined" ? detailViewFromHistory(window.history.state) : null;
  const validInitialFocus = initialHistoryView && model.focuses.some((focus) => focus.key === initialHistoryView.focus)
    ? initialHistoryView.focus
    : model.initialFocus;
  const initialFocusView = model.focuses.find((focus) => focus.key === validInitialFocus) || model.focuses[0];
  const validInitialObjectId = initialHistoryView?.objectId && initialFocusView.objectInspections.some((inspection) => inspection.objectId === initialHistoryView.objectId)
    ? initialHistoryView.objectId
    : initialFocusView.objectInspections[0]?.objectId;
  const [selectedFocus, setSelectedFocus] = useState<MobileFocusKey>(validInitialFocus);
  const [detailFocus, setDetailFocus] = useState<MobileFocusKey>(validInitialFocus);
  const [selectedObjectByFocus, setSelectedObjectByFocus] = useState<Partial<Record<MobileFocusKey, string>>>(() => validInitialObjectId ? { [validInitialFocus]: validInitialObjectId } : {});
  const [detailObjectId, setDetailObjectId] = useState<string | undefined>(validInitialObjectId);
  const [detailOpen, setDetailOpen] = useState(Boolean(initialHistoryView));
  const [expandedByFocus, setExpandedByFocus] = useState<Partial<Record<MobileFocusKey, boolean>>>({});
  const tablet = useTabletWorkspace();
  const detailButtonRef = useRef<HTMLButtonElement>(null);
  const detailOpenRef = useRef(detailOpen);
  const returnScrollRef = useRef(initialHistoryView?.homeScrollY || 0);
  const restoreFocusPendingRef = useRef(false);
  const focusSignature = model.focuses.map((focus) => focus.key).join("|");

  const focus = model.focuses.find((item) => item.key === selectedFocus) || model.focuses[0];
  const detailFocusView = model.focuses.find((item) => item.key === detailFocus) || focus;
  const selectedObjectId = selectedObjectByFocus[focus.key] || focus.objectInspections[0]?.objectId;
  const inspection = focus.objectInspections.find((item) => item.objectId === selectedObjectId) || focus.inspection;
  const detailInspection = detailFocusView.objectInspections.find((item) => item.objectId === detailObjectId) || detailFocusView.inspection;

  useEffect(() => {
    const keys = new Set(model.focuses.map((item) => item.key));
    setSelectedFocus((current) => keys.has(current) ? current : model.initialFocus);
    setDetailFocus((current) => keys.has(current) ? current : model.initialFocus);
    setExpandedByFocus((current) => Object.fromEntries(
      Object.entries(current).filter(([key]) => keys.has(key as MobileFocusKey)),
    ) as Partial<Record<MobileFocusKey, boolean>>);
    setSelectedObjectByFocus((current) => Object.fromEntries(model.focuses.flatMap((focusItem) => {
      const selected = current[focusItem.key];
      const valid = selected && focusItem.objectInspections.some((inspectionItem) => inspectionItem.objectId === selected)
        ? selected
        : focusItem.objectInspections[0]?.objectId;
      return valid ? [[focusItem.key, valid]] : [];
    })) as Partial<Record<MobileFocusKey, string>>);
    setDetailObjectId((current) => {
      const detail = model.focuses.find((item) => item.key === detailFocus) || model.focuses[0];
      return current && detail.objectInspections.some((inspectionItem) => inspectionItem.objectId === current)
        ? current
        : detail.objectInspections[0]?.objectId;
    });
  }, [detailFocus, focusSignature, model.focuses, model.initialFocus]);

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    if (detailOpen || !restoreFocusPendingRef.current) return;
    restoreFocusPendingRef.current = false;
    detailButtonRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: returnScrollRef.current, behavior: "auto" });
  }, [detailOpen, selectedFocus]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const historyView = detailViewFromHistory(event.state);
      if (historyView && model.focuses.some((item) => item.key === historyView.focus)) {
        const historyFocus = model.focuses.find((item) => item.key === historyView.focus) || model.focuses[0];
        const historyObjectId = historyView.objectId && historyFocus.objectInspections.some((item) => item.objectId === historyView.objectId)
          ? historyView.objectId
          : historyFocus.objectInspections[0]?.objectId;
        restoreFocusPendingRef.current = false;
        detailOpenRef.current = true;
        returnScrollRef.current = historyView.homeScrollY ?? returnScrollRef.current;
        setSelectedFocus(historyView.focus);
        setDetailFocus(historyView.focus);
        setDetailObjectId(historyObjectId);
        if (historyObjectId) setSelectedObjectByFocus((current) => ({ ...current, [historyView.focus]: historyObjectId }));
        setDetailOpen(true);
        return;
      }
      if (detailOpenRef.current) restoreFocusPendingRef.current = true;
      detailOpenRef.current = false;
      setDetailOpen(false);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [focusSignature, model.focuses]);

  const openDetail = useCallback(() => {
    returnScrollRef.current = window.scrollY;
    restoreFocusPendingRef.current = false;
    detailOpenRef.current = true;
    setDetailFocus(focus.key);
    setDetailObjectId(selectedObjectId);
    window.history.pushState({
      ...(window.history.state || {}),
      mobileNativeView: { view: "detail", focus: focus.key, objectId: selectedObjectId, homeScrollY: returnScrollRef.current },
    }, "");
    setDetailOpen(true);
  }, [focus.key, selectedObjectId]);

  const closeDetail = useCallback(() => {
    if (detailViewFromHistory(window.history.state)) {
      window.history.back();
      return;
    }
    restoreFocusPendingRef.current = true;
    detailOpenRef.current = false;
    setDetailOpen(false);
  }, []);

  const selectObject = useCallback((objectId: string) => {
    setSelectedObjectByFocus((current) => ({ ...current, [focus.key]: objectId }));
  }, [focus.key]);

  if (detailOpen) return <MobileNativeDetail model={model} focus={detailFocusView} inspection={detailInspection} onBack={closeDetail} />;

  const shared = {
    model,
    focus,
    inspection,
    selectedObjectId,
    onSelectObject: selectObject,
    selected: selectedFocus,
    onSelect: setSelectedFocus,
    expanded: tablet ? expandedByFocus[focus.key] !== false : Boolean(expandedByFocus[focus.key]),
    onExpandedChange: (expanded: boolean) => setExpandedByFocus((current) => ({ ...current, [focus.key]: expanded })),
    onOpenDetail: openDetail,
    detailButtonRef,
  };

  return (
    <main
      className={`mn-shell is-${model.scenario} is-evidence-${model.evidenceMode} is-focus-${focus.key}`}
      data-mobile-native-console
      data-mobile-native-scenario={model.scenario}
      data-mobile-native-evidence={model.evidenceMode}
      data-mobile-route-verification={model.routeVerification}
      data-mobile-native-incident={model.incident ? "true" : "false"}
      data-mobile-native-layout={tablet ? "tablet" : "phone"}
      data-mobile-native-primary-focus={model.initialFocus}
    >
      {tablet ? <MobileNativeTabletHome {...shared} /> : <MobileNativePhoneHome {...shared} />}
    </main>
  );
}
