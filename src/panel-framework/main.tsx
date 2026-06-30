import {
  mountRouterOverviewPanel,
  unmountRouterOverviewPanel,
} from "./legacyBridge";
import { OVERVIEW_SCENARIO_FIXTURES } from "./overview";

export { mountRouterOverviewPanel, unmountRouterOverviewPanel };

type TestSnapshotWindow = Window & {
  __PANEL_TEST_SNAPSHOT__?: unknown;
};

let autoMountStarted = false;
let autoMountHandle: { unmount: () => void } | null = null;

async function resolveSnapshot(): Promise<unknown> {
  const testWindow = window as TestSnapshotWindow;
  if (typeof testWindow.__PANEL_TEST_SNAPSHOT__ !== "undefined") {
    return testWindow.__PANEL_TEST_SNAPSHOT__;
  }

  try {
    const response = await fetch("/api/snapshot", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`snapshot fetch failed: ${response.status}`);
    return await response.json();
  } catch {
    return OVERVIEW_SCENARIO_FIXTURES["no-snapshot"];
  }
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
  void resolveSnapshot().then((snapshot) => {
    mountAutoPanel(snapshot);
  });
}

if (typeof window !== "undefined") {
  const run = () => startAutoMount();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}
