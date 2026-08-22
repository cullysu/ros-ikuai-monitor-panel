import { useEffect, useState } from "react";

/**
 * The presentation surface changes when the dense operations workbench can
 * actually fit, not at the old 1365/1366 visual cliff.  A wide landscape
 * tablet is deliberately treated as a browser/workbench surface: it has the
 * horizontal task space for the desktop navigation and must not be a phone
 * page rotated sideways.  Narrow landscape phones remain mobile. Domain
 * state and URL identity stay surface-neutral either side of this boundary.
 */
export const MOBILE_PANEL_QUERY = "(max-width: 1199px) and (orientation: portrait), (max-width: 599px)";
export const NARROW_PHONE_QUERY = "(max-width: 359px)";
/**
 * 600–767px can host the compact master/detail workbench only when it also
 * has enough vertical task space. Short landscape viewports retain the
 * continuous phone patrol flow rather than promoting a cramped split pane.
 */
export const COMPACT_WORKBENCH_QUERY = "(min-width: 600px) and (max-width: 767px) and (min-height: 700px)";
export const COMPACT_TASK_QUERY = COMPACT_WORKBENCH_QUERY;
export const TABLET_WORKBENCH_QUERY = "(min-width: 768px) and (max-width: 1199px) and (min-height: 700px)";
export const DOMAIN_TABLET_WORKBENCH_QUERY = "(min-width: 768px) and (max-width: 1199px) and (min-height: 700px)";
export function useMediaCapability(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(query);
    const sync = () => setMatches(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [query]);
  return matches;
}

export function useOverviewWorkbenchCapabilities(): {
  tablet: boolean;
  compactWorkbench: boolean;
  narrowPhone: boolean;
} {
  const compactWorkbench = useMediaCapability(COMPACT_WORKBENCH_QUERY);
  const tabletWorkbench = useMediaCapability(TABLET_WORKBENCH_QUERY);
  return {
    // Existing tablet compositions are the shared master/detail owner.  The
    // compact capability deliberately enters that owner rather than widening
    // the phone composition without preserving selection state.
    tablet: compactWorkbench || tabletWorkbench,
    compactWorkbench,
    narrowPhone: useMediaCapability(NARROW_PHONE_QUERY),
  };
}

export function useMobilePanelSurface(): boolean {
  return useMediaCapability(MOBILE_PANEL_QUERY);
}
