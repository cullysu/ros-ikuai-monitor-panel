"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ACTION_TIMEOUT_MS, closeRuntime, launchRuntime } = require("./acceptance/accessibility-v2/runtime");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "_acceptance", "mobile-reference-only");
const captures = [
  { id: "normal", scenario: "", section: "overview", selector: "[data-mobile-reference-home]" },
  { id: "resource", scenario: "resource-full", section: "overview", selector: "[data-mobile-reference-home]" },
  { id: "interfaces", scenario: "interfaces-down", section: "overview", selector: "[data-mobile-reference-home]" },
  { id: "wan-detail", scenario: "", section: "lineStatus", selector: "[data-mobile-reference-wan-detail]" },
];

function url(base, section) { const value = new URL(base); value.searchParams.set("section", section); return value.toString(); }

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const runtime = await launchRuntime({ cwd: root, viewport: { width: 390, height: 844 } });
  try {
    runtime.mock.state.configured = true;
    for (const capture of captures) {
      runtime.mock.state.scenario = capture.scenario;
      runtime.mock.state.snapshotCalls = 1;
      await runtime.page.goto(url(runtime.mock.url, capture.section), { waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
      await runtime.page.locator(capture.selector).waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
      await runtime.page.waitForTimeout(80);
      await runtime.page.screenshot({ path: path.join(output, `${capture.id}-390x844.png`), fullPage: false, animations: "disabled" });
    }
  } finally { await closeRuntime(runtime); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
