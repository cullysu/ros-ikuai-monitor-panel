import { useEffect, useRef, useState } from "react";

export function useMobileLargeTextMode() {
  const sentinelRef = useRef<HTMLSpanElement>(null);
  const [largeText, setLargeText] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const sync = () => setLargeText(sentinel.getBoundingClientRect().height >= 24);
    sync();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
    observer?.observe(sentinel);
    window.addEventListener("resize", sync);
    document.fonts?.ready.then(sync).catch(() => {});
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  return { largeText, sentinelRef };
}
