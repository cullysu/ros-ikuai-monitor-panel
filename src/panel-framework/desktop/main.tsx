import { createRoot, type Root } from "react-dom/client";
import { DesktopPanelApp } from "./DesktopPanelApp";
import "./desktop-entry.css";

type TestSnapshotWindow = Window & { __PANEL_TEST_SNAPSHOT__?: unknown };
let root: Root | null = null;
function mount() {
  if (root) return;
  const app = document.getElementById("app");
  if (!app) throw new Error("RouterOS panel root #app is missing");
  root = createRoot(app);
  root.render(<DesktopPanelApp snapshot={(window as TestSnapshotWindow).__PANEL_TEST_SNAPSHOT__} />);
  window.dispatchEvent(new CustomEvent("router-panel-mounted", { detail: { surface: "desktop" } }));
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true }); else mount();
