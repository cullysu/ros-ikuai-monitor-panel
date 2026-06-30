import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PanelFrameworkApp } from "./panel-framework-app";
import type { DeriveOverviewOptions } from "./overview";
import "./styles.css";

export interface RouterOverviewPanelMountOptions {
  /**
   * Keep the container's existing children so the legacy static overview can
   * be restored later. Defaults to true.
   */
  preserveLegacyFallback?: boolean;
  /**
   * Optional hook for surfacing mount errors to the caller.
   */
  onError?: (error: unknown) => void;
  /**
   * Override the framework host node id when the caller needs a stable anchor.
   */
  hostId?: string;
  /**
   * Override the framework host class name when the caller needs custom styling.
   */
  hostClassName?: string;
  /**
   * Optional pure data derivation controls. Keep bridge/runtime options separate
   * from the overview view-model contract.
   */
  deriveOptions?: DeriveOverviewOptions;
}

export interface RouterOverviewPanelHandle {
  container: HTMLElement;
  host: HTMLDivElement;
  snapshot: unknown;
  options: Readonly<RouterOverviewPanelMountOptions>;
  unmount: () => void;
}

type LegacyBridgeState = {
  root: Root;
  host: HTMLDivElement;
  preservedChildren: ChildNode[];
  preserveLegacyFallback: boolean;
  unmounted: boolean;
};

const mountedPanels = new WeakMap<HTMLElement, LegacyBridgeState>();

function isHTMLElement(value: unknown): value is HTMLElement {
  return Boolean(value && value instanceof HTMLElement);
}

function restoreLegacyChildren(container: HTMLElement, state: LegacyBridgeState) {
  if (state.unmounted) return;
  state.unmounted = true;
  state.root.unmount();
  container.replaceChildren(...state.preservedChildren);
}

function mountPanel(
  container: HTMLElement,
  snapshot: unknown,
  options: RouterOverviewPanelMountOptions = {}
): RouterOverviewPanelHandle {
  const existing = mountedPanels.get(container);
  if (existing) {
    restoreLegacyChildren(container, existing);
    mountedPanels.delete(container);
  }

  const preserveLegacyFallback = options.preserveLegacyFallback ?? true;
  const preservedChildren = preserveLegacyFallback ? Array.from(container.childNodes) : [];
  const host = document.createElement("div");
  let root: Root | null = null;

  host.id = options.hostId ?? "router-overview-panel-root";
  host.className = options.hostClassName ?? "router-overview-panel-root";
  host.dataset.routerOverviewPanelHost = "framework";

  container.replaceChildren(host);

  try {
    root = createRoot(host);
    root.render(createElement(PanelFrameworkApp, { snapshot, options: options.deriveOptions }));

    const state: LegacyBridgeState = {
      root,
      host,
      preservedChildren,
      preserveLegacyFallback,
      unmounted: false,
    };

    mountedPanels.set(container, state);

    return {
      container,
      host,
      snapshot,
      options: Object.freeze({ ...options, preserveLegacyFallback }),
      unmount: () => unmountPanel(container),
    };
  } catch (error) {
    root?.unmount();
    if (preserveLegacyFallback) {
      container.replaceChildren(...preservedChildren);
    } else {
      container.replaceChildren();
    }
    options.onError?.(error);
    throw error;
  }
}

function unmountPanel(container: HTMLElement) {
  const state = mountedPanels.get(container);
  if (!state) return;

  mountedPanels.delete(container);

  if (state.preserveLegacyFallback) {
    restoreLegacyChildren(container, state);
    return;
  }

  if (!state.unmounted) {
    state.unmounted = true;
    state.root.unmount();
  }
  container.replaceChildren();
}

export function mountRouterOverviewPanel(
  container: HTMLElement | null | undefined,
  snapshot: unknown,
  options: RouterOverviewPanelMountOptions = {}
): RouterOverviewPanelHandle {
  if (!isHTMLElement(container)) {
    throw new TypeError("mountRouterOverviewPanel(container, snapshot, options) requires an HTMLElement container");
  }

  return mountPanel(container, snapshot, options);
}

export function unmountRouterOverviewPanel(container: HTMLElement | null | undefined) {
  if (!isHTMLElement(container)) return;
  unmountPanel(container);
}

declare global {
  interface Window {
    mountRouterOverviewPanel: typeof mountRouterOverviewPanel;
    unmountRouterOverviewPanel: typeof unmountRouterOverviewPanel;
  }
}

if (typeof window !== "undefined") {
  window.mountRouterOverviewPanel = mountRouterOverviewPanel;
  window.unmountRouterOverviewPanel = unmountRouterOverviewPanel;
  window.dispatchEvent(new CustomEvent("router-overview-panel-framework-ready"));
}
