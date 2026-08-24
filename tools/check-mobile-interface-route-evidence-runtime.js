#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");
const { startMock, browserExecutable } = require("./acceptance/current-runtime-mock");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "_acceptance", "panel-runtime-browser");

async function main() {
  const mock = await startMock();
  mock.state.scenario = "interface-review";
  const executablePath = browserExecutable();
  if (!executablePath) throw new Error("Edge/Chrome executable not found");

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: process.platform === "linux" ? ["--no-sandbox"] : [],
    timeout: 15000,
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.setDefaultNavigationTimeout(15000);

  try {
    await page.goto(mock.url, { waitUntil: "domcontentloaded" });
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

    fs.mkdirSync(outDir, { recursive: true });
    const evidence = [];
    for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 667 }]) {
      await page.setViewportSize(viewport);
      const interfaceUrl = new URL("/?section=interfaces#interfaces", mock.url).toString();
      await page.goto(interfaceUrl, { waitUntil: "domcontentloaded" });
      await page.locator('[data-mobile-domain-workspace="interfaces"]').waitFor();
      await page.locator('[data-mobile-interface-focus-context]').waitFor();
      await page.locator('[data-mobile-interface-route-evidence]').waitFor();
      const current = await page.evaluate(() => {
        const focus = document.querySelector("[data-mobile-interface-focus-context]");
        const focusObject = focus?.querySelector("[data-mobile-interface-focus-object-id]");
        const relation = document.querySelector("[data-mobile-interface-route-evidence]");
        const rows = [...document.querySelectorAll("[data-mobile-interface-route-row]")];
        const focusAction = focus?.querySelector("[data-mobile-interface-focus-route-action] button");
        const objectButton = focus?.querySelector('button[aria-label^="查看接口对象"]');
        return {
          workspace: Boolean(document.querySelector('[data-mobile-domain-workspace="interfaces"]')),
          focusContext: Boolean(focus),
          focusState: focus?.getAttribute("data-mobile-interface-focus-state") || "",
          focusObjectId: focusObject?.getAttribute("data-mobile-interface-focus-object-id") || "",
          focusEvidenceAt: focusObject?.getAttribute("data-mobile-interface-focus-evidence-at") || "",
          focusAction: focusAction?.textContent?.replace(/\s+/g, " ").trim() || "",
          focusText: focus?.textContent?.replace(/\s+/g, " ").trim() || "",
          objectButton: Boolean(objectButton),
          relation: Boolean(relation),
          rows: rows.length,
          focusedObjectRepeatedInRelation: rows.some((row) => row.getAttribute("data-mobile-interface-route-row") === focusObject?.getAttribute("data-mobile-interface-focus-object-id")),
          rowText: rows.map((row) => row.parentElement?.textContent?.replace(/\s+/g, " ").trim() || ""),
          statuses: relation?.textContent?.match(/已关联|待核对|未取得/g) || [],
          relationAction: Boolean(relation?.querySelector("button")),
          tabletLedger: Boolean(document.querySelector("[data-tablet-interface-relations]")),
          overflow: document.documentElement.scrollWidth - innerWidth,
          phase: document.querySelector("[data-panel-runtime-phase]")?.getAttribute("data-panel-runtime-phase") || "",
          viewport: { width: innerWidth, height: innerHeight },
        };
      });
      if (!current.workspace || !current.focusContext || !current.relation || current.rows < 1 || current.focusedObjectRepeatedInRelation || !current.statuses.length ||
        !/single|multiple|unknown/.test(current.focusState) || !current.focusObjectId ||
        !current.focusEvidenceAt || !current.objectButton || !/运行|未运行|未确认/.test(current.focusText) ||
        !/默认路由|父接口|当前吞吐/.test(current.focusText) || !/核对路由表/.test(current.focusAction) ||
        current.relationAction || current.tabletLedger || current.overflow > 1 || current.phase !== "current") {
        throw new Error(`mobile interface focus context runtime contract failed: ${JSON.stringify(current)}`);
      }
      await page.screenshot({
        path: path.join(outDir, `mobile-interface-route-evidence-${viewport.width}.png`),
        animations: "disabled",
        fullPage: false,
        timeout: 15000,
      });
      await focusObjectAction(page, current.focusObjectId);
      const detail = await page.evaluate(() => {
        const objectDetail = document.querySelector("[data-mobile-object-detail]");
        const url = new URL(location.href);
        return {
          objectDetail: Boolean(objectDetail),
          objectId: objectDetail?.getAttribute("data-mobile-object-detail") || "",
          section: url.searchParams.get("section") || "",
          object: url.searchParams.get("object") || "",
        };
      });
      if (!detail.objectDetail || detail.objectId !== current.focusObjectId || detail.object !== current.focusObjectId) {
        throw new Error(`mobile interface focus object detail contract failed: ${JSON.stringify({ current, detail })}`);
      }
      await page.goto(interfaceUrl, { waitUntil: "domcontentloaded" });
      await page.locator('[data-mobile-interface-focus-context]').waitFor();
      await routeAction(page);
      evidence.push({ ...current, detail, routeNavigation: true });
    }
    process.stdout.write(`${JSON.stringify({
      pass: true,
      contract: "mobile-interface-focus-context-runtime-v1",
      evidence,
      screenshots: evidence.map(({ viewport }) => path.join(outDir, `mobile-interface-route-evidence-${viewport.width}.png`)),
    }, null, 2)}\n`);
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    await mock.stop().catch(() => {});
  }
}

async function focusObjectAction(page, objectId) {
  const button = page.locator('[data-mobile-interface-focus-context] button[aria-label^="查看接口对象"]');
  await button.click();
  await page.locator(`[data-mobile-object-detail="${objectId}"]`).waitFor();
}

async function routeAction(page) {
  const button = page.locator('[data-mobile-interface-focus-route-action] button', { hasText: "核对路由表" });
  await button.click();
  await page.locator('[data-mobile-domain-workspace="routes"]').waitFor();
}

main().catch((error) => {
  process.stderr.write(`${error && (error.stack || error.message) || error}\n`);
  process.exitCode = 1;
});
