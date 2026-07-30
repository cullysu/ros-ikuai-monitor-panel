import { useLayoutEffect, useRef } from "react";
import type { PanelRouteId } from "../../routes/panelRoutes";

export function useInspectorAutoDisclosure(
  route: PanelRouteId,
  rowId: string | undefined,
  surface: "preview" | "detail",
) {
  const inspectorRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const host = inspectorRef.current;
    if (!host || !rowId) return;
    const disclosures = host.querySelectorAll<HTMLDetailsElement>("details.mdi-disclosure");
    const disclosure = disclosures.item(disclosures.length - 1);
    if (!disclosure || disclosure.open) return;

    let frame = 0;
    let autoOpening = false;
    let userToggled = false;
    const onToggle = () => {
      if (autoOpening) autoOpening = false;
      else userToggled = true;
    };
    const maybeExpand = () => {
      if (userToggled || disclosure.open) return;
      const navigation = document.querySelector<HTMLElement>(".panel-task-navigation");
      const navigationRect = navigation?.getBoundingClientRect();
      const bottomBar = navigationRect
        && navigationRect.width >= window.innerWidth * 0.6
        && navigationRect.top >= window.innerHeight * 0.5;
      const usableBottom = bottomBar && navigationRect ? navigationRect.top : window.innerHeight;
      const slack = usableBottom - host.getBoundingClientRect().bottom;
      if (slack < 48) return;
      autoOpening = true;
      disclosure.dataset.autoExpanded = "true";
      disclosure.open = true;
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(maybeExpand);
    };

    disclosure.addEventListener("toggle", onToggle);
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      disclosure.removeEventListener("toggle", onToggle);
      window.removeEventListener("resize", schedule);
    };
  }, [route, rowId, surface]);

  return inspectorRef;
}
