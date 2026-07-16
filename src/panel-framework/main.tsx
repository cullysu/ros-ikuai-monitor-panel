import {
  mountRouterOverviewPanel,
  unmountRouterOverviewPanel,
} from "./legacyBridge";

export { mountRouterOverviewPanel, unmountRouterOverviewPanel };

type TestSnapshotWindow = Window & {
  __PANEL_TEST_SNAPSHOT__?: unknown;
};

let autoMountStarted = false;
let autoMountHandle: { unmount: () => void } | null = null;

function resolveTestSnapshot(): unknown {
  const testWindow = window as TestSnapshotWindow;
  if (typeof testWindow.__PANEL_TEST_SNAPSHOT__ !== "undefined") {
    return testWindow.__PANEL_TEST_SNAPSHOT__;
  }
  return undefined;
}

function mountAutoPanel(snapshot: unknown) {
  if (autoMountHandle) return;
  const app = document.getElementById("app");
  if (!app) return;

  autoMountHandle = mountRouterOverviewPanel(app, snapshot, {
    preserveLegacyFallback: false,
  });
  window.dispatchEvent(new CustomEvent("router-overview-panel-framework-auto-mounted"));
}

function startAutoMount() {
  if (autoMountStarted) return;
  autoMountStarted = true;
  mountAutoPanel(resolveTestSnapshot());
}

if (typeof window !== "undefined") {
  const run = () => startAutoMount();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}
