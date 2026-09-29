import { createRoot, type Root } from "react-dom/client";
import { MobilePanelApp } from "./MobilePanelApp";
import "./mobile-entry.css";

type TestSnapshotWindow = Window & { __PANEL_TEST_SNAPSHOT__?: unknown };
let root: Root | null = null;
function mount() {
  if (root) return;
  const app = document.getElementById("app");
  if (!app) throw new Error("RouterOS panel root #app is missing");
  root = createRoot(app);
  root.render(<MobilePanelApp snapshot={(window as TestSnapshotWindow).__PANEL_TEST_SNAPSHOT__} />);
  window.dispatchEvent(new CustomEvent("router-panel-mounted", { detail: { surface: "mobile" } }));
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true }); else mount();
