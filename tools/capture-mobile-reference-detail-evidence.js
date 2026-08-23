"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ACTION_TIMEOUT_MS, closeRuntime, launchRuntime } = require("./acceptance/accessibility-v2/runtime");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "_acceptance", "mobile-reference-only");
const captures = [
  { id: "interface", section: "interfaces", scenario: "interfaces-down" },
  { id: "route", section: "routes", scenario: "" },
  { id: "resource", section: "trafficLoad", scenario: "resource-full" },
  { id: "terminal", section: "terminals", scenario: "" },
];

function routeUrl(base, section, objectId) {
  const value = new URL(base);
  value.searchParams.set("section", section);
  if (objectId) value.searchParams.set("object", objectId);
  return value.toString();
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const runtime = await launchRuntime({ cwd: root, viewport: { width: 390, height: 844 } });
  try {
    runtime.mock.state.configured = true;
    for (const capture of captures) {
      runtime.mock.state.scenario = capture.scenario;
      runtime.mock.state.snapshotCalls = 1;
      await runtime.page.goto(routeUrl(runtime.mock.url, capture.section), { waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
      const row = runtime.page.locator("[data-panel-object-row]").first();
      await row.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
      const objectId = await row.getAttribute("data-panel-object-row");
      if (!objectId) throw new Error(`${capture.section}: first object row has no stable id`);
      await runtime.page.goto(routeUrl(runtime.mock.url, capture.section, objectId), { waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
      await runtime.page.locator("[data-mobile-reference-object-detail]").waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
      await runtime.page.screenshot({ path: path.join(output, `detail-${capture.id}-390x844.png`), fullPage: false, animations: "disabled" });
    }
  } finally {
    await closeRuntime(runtime);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
