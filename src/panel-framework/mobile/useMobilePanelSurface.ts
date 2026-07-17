import { useEffect, useState } from "react";

export const MOBILE_PANEL_QUERY = "(max-width: 1180px)";

export function useMobilePanelSurface(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_PANEL_QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(MOBILE_PANEL_QUERY);
    const sync = () => setMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return mobile;
}
