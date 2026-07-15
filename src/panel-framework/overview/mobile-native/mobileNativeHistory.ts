import type { MobileFocusKey } from "./mobileNativeTypes";

export interface MobileDetailHistoryView {
  focus: MobileFocusKey;
  objectId?: string;
  homeScrollY?: number;
}

export function detailViewFromHistory(state: unknown): MobileDetailHistoryView | null {
  if (!state || typeof state !== "object") return null;
  const view = (state as { mobileNativeView?: { view?: string; focus?: string; objectId?: string; homeScrollY?: number } }).mobileNativeView;
  return view?.view === "detail" && view.focus ? {
    focus: view.focus as MobileFocusKey,
    objectId: view.objectId,
    homeScrollY: Number.isFinite(view.homeScrollY) ? Math.max(0, Number(view.homeScrollY)) : undefined,
  } : null;
}
