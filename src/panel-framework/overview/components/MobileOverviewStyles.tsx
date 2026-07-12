import { useInsertionEffect } from "react";
import { MOBILE_OVERVIEW_CORE_STYLES } from "./MobileOverviewCoreStyles";
import { MOBILE_OVERVIEW_DECISION_STYLES } from "./MobileOverviewDecisionStyles";
import { MOBILE_OVERVIEW_FRAME_STYLES } from "./MobileOverviewFrameStyles";
import { MOBILE_OVERVIEW_PRODUCT_SHELL_STYLES } from "./MobileOverviewProductShellStyles";
import { MOBILE_OVERVIEW_SURFACE_STYLES } from "./MobileOverviewSurfaceStyles";
import { MOBILE_OVERVIEW_LANDSCAPE_STYLES } from "./MobileOverviewLandscapeStyles";
import { MOBILE_OVERVIEW_NAVIGATION_STYLES } from "./MobileOverviewNavigationStyles";
import { MOBILE_OVERVIEW_INCIDENT_STYLES } from "./MobileOverviewIncidentStyles";

const MOBILE_OVERVIEW_STYLE_LAYERS = [
  { id: "core", css: MOBILE_OVERVIEW_CORE_STYLES },
  {
    id: "product-shell",
    css: MOBILE_OVERVIEW_PRODUCT_SHELL_STYLES,
  },
  { id: "frame", css: MOBILE_OVERVIEW_FRAME_STYLES },
  { id: "decision", css: MOBILE_OVERVIEW_DECISION_STYLES },
  { id: "surface", css: MOBILE_OVERVIEW_SURFACE_STYLES },
  { id: "incident", css: MOBILE_OVERVIEW_INCIDENT_STYLES },
  { id: "navigation", css: MOBILE_OVERVIEW_NAVIGATION_STYLES },
  { id: "landscape", css: MOBILE_OVERVIEW_LANDSCAPE_STYLES },
] as const;
const MOBILE_OVERVIEW_STYLE_STACK = MOBILE_OVERVIEW_STYLE_LAYERS.map(
  (layer) => layer.css
).join("");
const MOBILE_OVERVIEW_STYLE_LAYER_ATTR = MOBILE_OVERVIEW_STYLE_LAYERS.map(
  (layer) => layer.id
).join("|");
const MOBILE_OVERVIEW_STYLE_ATTR = "v1030-head-injected-parseable";
const MOBILE_OVERVIEW_STYLE_REF_ATTR = "data-overview-mobile-style-ref-count";

export function MobileOverviewStyles() {
  useInsertionEffect(() => {
    if (typeof document === "undefined") return undefined;
    const selector = `style[data-overview-mobile-style-stack="${MOBILE_OVERVIEW_STYLE_ATTR}"]`;
    const existing = document.querySelector<HTMLStyleElement>(selector);
    const style = existing || document.createElement("style");
    style.setAttribute("data-overview-mobile-style-stack", MOBILE_OVERVIEW_STYLE_ATTR);
    style.setAttribute(
      "data-overview-mobile-style-layers",
      MOBILE_OVERVIEW_STYLE_LAYER_ATTR
    );
    const refCount =
      Number(style.getAttribute(MOBILE_OVERVIEW_STYLE_REF_ATTR) || "0") + 1;
    style.setAttribute(MOBILE_OVERVIEW_STYLE_REF_ATTR, String(refCount));
    style.textContent = MOBILE_OVERVIEW_STYLE_STACK;
    if (!existing) document.head.appendChild(style);
    return () => {
      const nextRefCount = Math.max(
        0,
        Number(style.getAttribute(MOBILE_OVERVIEW_STYLE_REF_ATTR) || "1") - 1
      );
      if (nextRefCount === 0) {
        if (style.parentNode) style.parentNode.removeChild(style);
        return;
      }
      style.setAttribute(MOBILE_OVERVIEW_STYLE_REF_ATTR, String(nextRefCount));
    };
  }, []);
  return null;
}
