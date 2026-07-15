import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { OverviewPanelProps } from "../desktopOverviewHelpers";
import { MobileNativeDetail } from "./MobileNativeDetail";
import { MobileNativePhoneHome, MobileNativeTabletHome } from "./MobileNativeHome";
import { buildMobileNativeModel } from "./mobileNativeModel";
import type { MobileFocusKey } from "./mobileNativeTypes";
import "./styles/mobile-native-tokens.css";
import "./styles/mobile-native-layout.css";
import "./styles/mobile-native-states.css";

const TABLET_QUERY = "(min-width: 700px)";

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

function detailFocusFromHistory(state: unknown): MobileFocusKey | null {
  if (!state || typeof state !== "object") return null;
  const view = (state as { mobileNativeView?: { view?: string; focus?: string } }).mobileNativeView;
  return view?.view === "detail" && view.focus ? view.focus as MobileFocusKey : null;
}

export function MobileNativeConsole({ snapshot, state }: OverviewPanelProps) {
  const model = useMemo(() => buildMobileNativeModel(snapshot, state), [snapshot, state]);
  const initialHistoryFocus = typeof window !== "undefined" ? detailFocusFromHistory(window.history.state) : null;
  const validInitialFocus = initialHistoryFocus && model.focuses.some((focus) => focus.key === initialHistoryFocus)
    ? initialHistoryFocus
    : model.initialFocus;
  const [selectedFocus, setSelectedFocus] = useState<MobileFocusKey>(validInitialFocus);
  const [detailFocus, setDetailFocus] = useState<MobileFocusKey>(validInitialFocus);
  const [detailOpen, setDetailOpen] = useState(Boolean(initialHistoryFocus));
  const [expandedByFocus, setExpandedByFocus] = useState<Partial<Record<MobileFocusKey, boolean>>>({});
  const tablet = useTabletWorkspace();
  const detailButtonRef = useRef<HTMLButtonElement>(null);
  const detailOpenRef = useRef(detailOpen);
  const returnScrollRef = useRef(0);
  const restoreFocusPendingRef = useRef(false);
  const focusSignature = model.focuses.map((focus) => focus.key).join("|");

  const focus = model.focuses.find((item) => item.key === selectedFocus) || model.focuses[0];
  const detailFocusView = model.focuses.find((item) => item.key === detailFocus) || focus;

  useEffect(() => {
    const keys = new Set(model.focuses.map((item) => item.key));
    setSelectedFocus((current) => keys.has(current) ? current : model.initialFocus);
    setDetailFocus((current) => keys.has(current) ? current : model.initialFocus);
    setExpandedByFocus((current) => Object.fromEntries(
      Object.entries(current).filter(([key]) => keys.has(key as MobileFocusKey)),
    ) as Partial<Record<MobileFocusKey, boolean>>);
  }, [focusSignature, model.focuses, model.initialFocus]);

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
      const historyFocus = detailFocusFromHistory(event.state);
      if (historyFocus && model.focuses.some((item) => item.key === historyFocus)) {
        restoreFocusPendingRef.current = false;
        detailOpenRef.current = true;
        setSelectedFocus(historyFocus);
        setDetailFocus(historyFocus);
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
    window.history.pushState({
      ...(window.history.state || {}),
      mobileNativeView: { view: "detail", focus: focus.key },
    }, "");
    setDetailOpen(true);
  }, [focus.key]);

  const closeDetail = useCallback(() => {
    if (detailFocusFromHistory(window.history.state)) {
      window.history.back();
      return;
    }
    restoreFocusPendingRef.current = true;
    detailOpenRef.current = false;
    setDetailOpen(false);
  }, []);

  if (detailOpen) return <MobileNativeDetail model={model} focus={detailFocusView} onBack={closeDetail} />;

  const shared = {
    model,
    focus,
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
