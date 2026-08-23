#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ACTION_TIMEOUT_MS, closeRuntime, launchRuntime } = require("./acceptance/accessibility-v2/runtime");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "_acceptance", "mobile-reference-runtime");
const viewports = [{ width: 768, height: 1024 }, { width: 844, height: 1024 }];
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function main() {
  const runtime = await launchRuntime({ cwd: root, viewport: viewports[0] });
  try {
    runtime.mock.state.configured = true;
    runtime.mock.state.scenario = "interfaces-down";
    runtime.mock.state.snapshotCalls = 1;
    fs.mkdirSync(outDir, { recursive: true });
    const evidence = [];
    let baseline = null;
    for (const viewport of viewports) {
      await runtime.page.setViewportSize(viewport);
      const url = new URL(runtime.mock.url);
      url.searchParams.set("section", "overview");
      await runtime.page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
      await runtime.page.locator("[data-mobile-reference-home]").waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
      const current = await runtime.page.evaluate(() => {
        const root = document.querySelector("[data-mobile-reference-home]");
        const status = root?.querySelector(".ref-status");
        const list = root?.querySelector(".ref-interfaces");
        const source = root?.querySelector(".ref-facts");
        const listBox = list?.getBoundingClientRect();
        const statusBox = status?.getBoundingClientRect();
        return {
          root: Boolean(root),
          scene: root?.getAttribute("data-mobile-reference-scene") || "",
          title: root?.querySelector(".ref-topbar h1")?.textContent?.trim() || "",
          statusHeight: statusBox?.height || 0,
          listWidth: listBox?.width || 0,
          listRows: list?.querySelectorAll("button:not(.ref-card-link)").length || 0,
          sourcePresent: Boolean(source),
          overflow: document.documentElement.scrollWidth - innerWidth,
          navigation: document.querySelectorAll("[data-mobile-reference-navigation]").length,
          viewport: { width: innerWidth, height: innerHeight },
        };
      });
      assert(current.root && current.scene === "interfaces", `reference interface scene missing at ${viewport.width}`);
      assert(current.title === "接口告警", `interface title changed at ${viewport.width}: ${current.title}`);
      assert(current.statusHeight >= 50 && current.listWidth >= 300 && current.listRows > 0, `tablet interface evidence is not usable at ${viewport.width}: ${JSON.stringify(current)}`);
      assert(current.sourcePresent && current.navigation === 1 && current.overflow <= 1, `tablet interface surface continuity failed at ${viewport.width}: ${JSON.stringify(current)}`);
      if (baseline) assert(current.scene === baseline.scene && current.title === baseline.title, `tablet widths changed scene semantics: ${JSON.stringify({ baseline, current })}`);
      baseline ||= current;
      const file = path.join(outDir, `tablet-overview-continuity-${viewport.width}.png`);
      await runtime.page.screenshot({ path: file, animations: "disabled", fullPage: false, timeout: ACTION_TIMEOUT_MS });
      evidence.push({ ...current, file: path.relative(root, file).replace(/\\/g, "/") });
    }
    process.stdout.write(`${JSON.stringify({ pass: true, contract: "mobile-reference-tablet-continuity-runtime-v2", evidence }, null, 2)}\n`);
  } finally {
    await closeRuntime(runtime);
  }
}

main().catch((error) => { process.stderr.write(`${error && (error.stack || error.message) || error}\n`); process.exitCode = 1; });
