import { useEffect, useState } from "react";

/**
 * The presentation surface changes when the dense operations workbench can
 * actually fit, not at the old 1365/1366 visual cliff.  Domain state and URL
 * identity stay surface-neutral either side of this boundary.
 */
export const MOBILE_PANEL_QUERY = "(max-width: 1199px)";
export const NARROW_PHONE_QUERY = "(max-width: 359px)";
export const COMPACT_TASK_QUERY = "(min-width: 600px) and (max-width: 767px)";
export const TABLET_WORKBENCH_QUERY = "(min-width: 768px) and (max-width: 1199px) and (min-height: 700px)";
export const TABLET_RELATION_QUERY = "(min-width: 768px) and (max-width: 899px) and (min-height: 700px)";
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

export function useOverviewWorkbenchCapabilities(): { tablet: boolean; narrowPhone: boolean; relationTablet: boolean } {
  return {
    tablet: useMediaCapability(TABLET_WORKBENCH_QUERY),
    narrowPhone: useMediaCapability(NARROW_PHONE_QUERY),
    relationTablet: useMediaCapability(TABLET_RELATION_QUERY),
  };
}

export function useMobilePanelSurface(): boolean {
  return useMediaCapability(MOBILE_PANEL_QUERY);
}
