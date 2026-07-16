import { createRoot, type Root } from "react-dom/client";
import { PanelFrameworkApp } from "./panel-framework-app";
import "./styles.css";

type TestSnapshotWindow = Window & {
  __PANEL_TEST_SNAPSHOT__?: unknown;
};

let root: Root | null = null;

function resolveTestSnapshot(): unknown {
  const testWindow = window as TestSnapshotWindow;
  return typeof testWindow.__PANEL_TEST_SNAPSHOT__ === "undefined"
    ? undefined
    : testWindow.__PANEL_TEST_SNAPSHOT__;
}

function mountPanel() {
  if (root) return;
  const app = document.getElementById("app");
  if (!app) throw new Error("RouterOS panel root #app is missing");
  root = createRoot(app);
  root.render(<PanelFrameworkApp snapshot={resolveTestSnapshot()} />);
  window.dispatchEvent(new CustomEvent("router-panel-mounted"));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountPanel, { once: true });
} else {
  mountPanel();
}
