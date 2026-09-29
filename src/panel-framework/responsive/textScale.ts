import { useCallback, useEffect, useState } from "react";

export function usePanelLargeTextMode() {
  const [sentinel, setSentinel] = useState<HTMLSpanElement | null>(null);
  const [largeText, setLargeText] = useState(false);
  const sentinelRef = useCallback((node: HTMLSpanElement | null) => setSentinel(node), []);

  useEffect(() => {
    if (!sentinel) {
      setLargeText(false);
      return;
    }
    let active = true;
    const sync = () => {
      if (active) setLargeText(sentinel.getBoundingClientRect().height >= 24);
    };
    sync();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
    observer?.observe(sentinel);
    window.addEventListener("resize", sync);
    document.fonts?.ready.then(sync).catch(() => {});
    return () => {
      active = false;
      observer?.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [sentinel]);

  return { largeText, sentinelRef };
}
