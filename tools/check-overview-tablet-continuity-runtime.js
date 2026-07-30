#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright-core");
const { startMock, browserExecutable } = require("./check-panel-runtime-browser");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "_acceptance", "panel-runtime-browser");

async function login(page) {
  const form = page.locator("[data-router-login-form]");
  await form.waitFor();
  await page.locator('input[name="host"]').fill("192.0.2.1");
  await page.locator('input[name="user"]').fill("observer");
  await page.locator('input[name="password"]').fill("correct-horse");
  await form.locator('button[type="submit"]').click();
  const hostKey = page.locator(".router-host-key-confirmation");
  await hostKey.waitFor();
  await hostKey.locator('input[type="checkbox"]').check();
  await form.locator('button[type="submit"]').click();
  await page.waitForFunction(
    () => document.querySelector("[data-panel-runtime-phase]")?.getAttribute("data-panel-runtime-phase") === "current",
    null,
    { timeout: 12000 },
  );
}

async function main() {
  const mock = await startMock();
  mock.state.scenario = "interfaces-down";
  const executablePath = browserExecutable();
  if (!executablePath) throw new Error("Edge/Chrome executable not found");

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: process.platform === "linux" ? ["--no-sandbox"] : [],
    timeout: 15000,
  });
  const context = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.setDefaultNavigationTimeout(15000);

  try {
    await page.goto(mock.url, { waitUntil: "domcontentloaded" });
    await login(page);
    fs.mkdirSync(outDir, { recursive: true });
    const evidence = [];
    let baseline = null;
    for (const viewport of [{ width: 768, height: 1024 }, { width: 844, height: 1024 }]) {
      await page.setViewportSize(viewport);
      await page.goto(new URL("/?section=overview#overview", mock.url).toString(), { waitUntil: "domcontentloaded" });
      await page.locator("[data-mobile-overview]").waitFor();
      const incidentRows = page.locator("[data-mobile-incident-object]");
      await incidentRows.nth(1).click();
      await page.waitForFunction(() => Boolean(document.querySelector('[data-mobile-incident-object][aria-current="true"]')) &&
        Boolean(document.querySelector("[data-mobile-incident-inspector]")));
      const markerState = await page.evaluate(() => ({
        overview: document.querySelector("[data-mobile-overview]")?.outerHTML.slice(0, 400) || "",
        viewport: { width: innerWidth, height: innerHeight },
        tabletMedia: matchMedia("(min-width: 768px) and (max-width: 1199px) and (min-height: 700px)").matches,
        layoutCount: document.querySelectorAll('[data-tablet-overview-layout="split"]').length,
        followupCount: document.querySelectorAll('[data-tablet-overview-followup="evidence-and-actions"]').length,
      }));
      if (!markerState.layoutCount || !markerState.followupCount) {
        throw new Error(`tablet overview continuity markers missing at ${viewport.width}: ${JSON.stringify(markerState)}`);
      }
      await page.locator('[data-tablet-overview-layout="split"]').waitFor({ state: "attached" });
      await page.locator('[data-tablet-overview-followup="evidence-and-actions"]').waitFor({ state: "attached" });

      const current = await page.evaluate(() => {
        const root = document.querySelector("[data-mobile-overview]");
        const layout = document.querySelector('[data-tablet-overview-layout="split"]');
        const followup = document.querySelector('[data-tablet-overview-followup="evidence-and-actions"]');
        const master = document.querySelector(".mp-tablet-master-detail > .mp-incident");
        const inspector = document.querySelector(".mp-tablet-master-detail > .mp-inspector");
        const riskTitle = document.querySelector("#mp-incident-title")?.textContent?.replace(/\s+/g, " ").trim() || "";
        const selected = document.querySelector(".mp-tablet-master-detail .mp-inspector h2")?.textContent?.replace(/\s+/g, " ").trim() || "";
        const actionCount = followup?.querySelectorAll("button").length || 0;
        const masterBox = master?.getBoundingClientRect();
        const inspectorBox = inspector?.getBoundingClientRect();
        const followupBox = followup?.getBoundingClientRect();
        return {
          root: Boolean(root),
          layout: layout?.getAttribute("data-tablet-overview-layout") || "",
          followup: followup?.getAttribute("data-tablet-overview-followup") || "",
          risk: root?.getAttribute("data-mobile-overview-risk") || "",
          riskTitle,
          selected,
          actionCount,
          masterWidth: masterBox?.width || 0,
          inspectorWidth: inspectorBox?.width || 0,
          followupTop: followupBox?.top || 0,
          masterBottom: masterBox?.bottom || 0,
          overflow: document.documentElement.scrollWidth - innerWidth,
          phase: document.querySelector("[data-panel-runtime-phase]")?.getAttribute("data-panel-runtime-phase") || "",
          viewport: { width: innerWidth, height: innerHeight },
        };
      });
      const valid = current.root && current.layout === "split" &&
        current.followup === "evidence-and-actions" && current.risk && current.riskTitle &&
        current.selected && current.actionCount > 0 && current.masterWidth >= 280 &&
        current.inspectorWidth >= 320 && current.followupTop >= current.masterBottom - 2 &&
        current.overflow <= 1 && current.phase === "current";
      if (!valid) throw new Error(`overview tablet continuity runtime contract failed: ${JSON.stringify(current)}`);
      if (baseline && (current.layout !== baseline.layout || current.risk !== baseline.risk ||
        current.riskTitle !== baseline.riskTitle || current.selected !== baseline.selected)) {
        throw new Error(`overview tablet continuity changed task semantics across widths: ${JSON.stringify({ baseline, current })}`);
      }
      baseline ||= current;
      await page.screenshot({
        path: path.join(outDir, `tablet-overview-continuity-${viewport.width}.png`),
        animations: "disabled",
        fullPage: false,
        timeout: 15000,
      });
      evidence.push(current);
    }
    process.stdout.write(`${JSON.stringify({
      pass: true,
      contract: "overview-tablet-continuity-runtime-v1",
      evidence,
      screenshots: evidence.map(({ viewport }) => path.join(outDir, `tablet-overview-continuity-${viewport.width}.png`)),
    }, null, 2)}\n`);
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    await mock.stop().catch(() => {});
  }
}

main().catch((error) => {
  process.stderr.write(`${error && (error.stack || error.message) || error}\n`);
  process.exitCode = 1;
});
