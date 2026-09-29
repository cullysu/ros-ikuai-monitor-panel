import { useLayoutEffect, useRef, useState, type RefObject } from "react";

export interface ResponsiveSvgViewport {
  width: number;
  height: number;
}

function measuredDimension(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.round(value * 10) / 10;
}

export function useResponsiveSvgViewport(
  fallback: ResponsiveSvgViewport,
): { ref: RefObject<SVGSVGElement>; viewport: ResponsiveSvgViewport } {
  const ref = useRef<SVGSVGElement>(null);
  const [viewport, setViewport] = useState(fallback);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const sync = () => {
      const rect = node.getBoundingClientRect();
      const next = {
        width: measuredDimension(rect.width, fallback.width),
        height: measuredDimension(rect.height, fallback.height),
      };
      setViewport((current) => (
        Math.abs(current.width - next.width) < 0.1 && Math.abs(current.height - next.height) < 0.1
          ? current
          : next
      ));
    };

    sync();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
    observer?.observe(node);
    window.addEventListener("resize", sync);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [fallback.height, fallback.width]);

  return { ref, viewport };
}
