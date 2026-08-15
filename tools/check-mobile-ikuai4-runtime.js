#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { ACTION_TIMEOUT_MS, closeRuntime, launchRuntime } = require("./acceptance/accessibility-v2/runtime");
const { gitWorktreeIdentity } = require("./worktree-runtime-identity");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "_acceptance", "mobile-flow-runtime");
const full = process.argv.includes("--full");
const scenarios = [
  ["single", "", "normal"],
  ["fleet", "fleet-coverage", "fleet"],
  ["all-offline", "all-offline", "wan"],
  ["no-snapshot", "no-snapshot", "unavailable"],
  ["collection-down", "collection-down", "collection"],
  ["resource-full", "resource-full", "resource"],
  ["interfaces-down", "interfaces-down", "interfaces"],
];
const viewports = [
  ["phone320", 320, 568], ["phone360", 360, 800], ["phone375", 375, 667], ["phone390", 390, 844],
  ["phone430", 430, 932], ["tablet768", 768, 1024], ["landscape667", 667, 375], ["landscape844", 844, 390],
];
const smokeCells = [
  [scenarios[0], viewports[0]], [scenarios[0], viewports[6]],
  [scenarios[0], viewports[3]], [scenarios[5], viewports[3]], [scenarios[6], viewports[3]],
  [scenarios[0], viewports[5]], [scenarios[5], viewports[5]], [scenarios[6], viewports[5]],
];
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sameIdentity = (a, b) => a.commit === b.commit && a.artifactKey === b.artifactKey && a.worktreeFingerprint === b.worktreeFingerprint;

function routeUrl(base, route) {
  const url = new URL(base);
  url.searchParams.set("section", route);
  return url.toString();
}

async function openHome(page, runtime, scenario, viewport) {
  runtime.mock.state.configured = true;
  runtime.mock.state.scenario = scenario[1];
  runtime.mock.state.snapshotCalls = 1;
  await page.setViewportSize({ width: viewport[1], height: viewport[2] });
  await page.goto(routeUrl(runtime.mock.url, "overview"), { waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  const home = page.locator("[data-mobile-flow-overview]");
  await home.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await page.waitForTimeout(40);
  return home;
}

async function captureCell(page, runtime, scenario, viewport) {
  await openHome(page, runtime, scenario, viewport);
  await page.evaluate(() => {
    window.history.scrollRestoration = "manual";
    const state = window.history.state || {};
    window.history.replaceState({ ...state, panelMobileScroll: { viewport: 0, regions: {} } }, "", window.location.href);
    window.scrollTo(0, 0);
    document.scrollingElement?.scrollTo(0, 0);
    document.querySelectorAll("[data-mobile-flow-workspace], [data-panel-app] > .section").forEach((node) => node instanceof HTMLElement && node.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  });
  await page.waitForTimeout(60);
  await page.evaluate(() => document.querySelectorAll("[data-mobile-flow-workspace], [data-panel-app] > .section").forEach((node) => node instanceof HTMLElement && node.scrollTo({ top: 0, left: 0, behavior: "auto" })));
  const state = await page.evaluate(() => {
    const home = document.querySelector("[data-mobile-flow-overview]");
    const navigation = document.querySelectorAll("[data-mobile-flow-navigation]");
    const buttons = [...(navigation[0]?.querySelectorAll("button") || [])].map((node) => {
      const rect = node.getBoundingClientRect();
      return { label: node.textContent?.trim() || "", width: rect.width, height: rect.height };
    });
    return {
      scene: home?.getAttribute("data-mobile-flow-scene") || "",
      evidenceMode: home?.getAttribute("data-evidence-mode") || "",
      navigationCount: navigation.length,
      buttons,
      hasTrafficPulse: Boolean(home?.querySelector(".mflow-route__traffic")),
      hasIncidentTakeover: Boolean(home?.querySelector(".mflow-resource, .mflow-chain, .mflow-channels, .mflow-withdrawn, .mflow-wan")),
      hasIncidentEvidence: Boolean(home?.querySelector(".mflow-instrument, .mflow-stream")),
      hasFleetWorkspace: Boolean(home?.querySelector(".mflow-fleet")),
      instrumentObjectNames: [...(home?.querySelectorAll(".mflow-channels button b, .mflow-resource button > span, .mflow-wan button b, .mflow-fleet button b") || [])].map((node) => node.textContent?.trim() || "").filter(Boolean),
      streamObjectNames: [...(home?.querySelectorAll(".mflow-stream ol button b") || [])].map((node) => node.textContent?.trim() || "").filter(Boolean),
      pulseOwnerCount: document.querySelectorAll("[data-mobile-flow-overview]").length,
      overflowX: Math.max(0, (document.scrollingElement?.scrollWidth || 0) - innerWidth),
      bodyText: home?.textContent || "",
      rootScrollTop: home instanceof HTMLElement ? home.scrollTop : null,
      sectionScrollTop: home?.parentElement instanceof HTMLElement ? home.parentElement.scrollTop : null,
      rootRectTop: home?.getBoundingClientRect().top ?? null,
      activeElement: document.activeElement instanceof HTMLElement ? document.activeElement.outerHTML.slice(0, 180) : "",
      headerRect: (() => {
        const rect = home?.querySelector(".mflow-topbar")?.getBoundingClientRect();
        return rect ? { top: rect.top, bottom: rect.bottom, height: rect.height } : null;
      })(),
      topbarContract: (() => {
        const title = home?.querySelector(".mflow-topbar h1");
        const evidence = home?.querySelector(".mflow-evidence");
        const titleRect = title?.getBoundingClientRect();
        const evidenceRect = evidence?.getBoundingClientRect();
        const controls = [...(home?.querySelectorAll(".mflow-topbar nav button") || [])].map((node) => {
          const rect = node.getBoundingClientRect();
          return { name: node.getAttribute("aria-label") || "", width: rect.width, height: rect.height };
        });
        return {
          title: title?.textContent?.trim() || "",
          titleWidth: titleRect?.width || 0,
          titleHeight: titleRect?.height || 0,
          evidenceTop: evidenceRect?.top ?? null,
          controls,
        };
      })(),
    };
  });
  assert(state.navigationCount === 1, `${scenario[0]} must render one navigation owner`);
  assert(state.scene === scenario[2], `${scenario[0]} expected scene ${scenario[2]} but rendered ${state.scene}`);
  assert(state.buttons.length === 4, `${scenario[0]} must render four stable task roots`);
  assert(state.buttons.every((item) => item.label && item.width >= 44 && item.height >= 44), `${scenario[0]} has an unlabeled or sub-44px root target`);
  assert(["current", "historical", "unavailable"].includes(state.evidenceMode), `${scenario[0]} has no evidence mode`);
  assert(state.overflowX <= 1, `${scenario[0]} overflows horizontally by ${state.overflowX}px`);
  assert(state.pulseOwnerCount === 1, `${scenario[0]} must render exactly one mobile operations owner`);
  assert(state.headerRect && state.headerRect.top >= -1 && state.headerRect.bottom <= viewport[2] + 1 && state.headerRect.height >= 44, `${scenario[0]} lost the device header at initial position`);
  assert(state.topbarContract.title === "概览" && state.topbarContract.titleWidth > 0 && state.topbarContract.titleHeight > 0, `${scenario[0]} lost the visible overview title`);
  assert(state.topbarContract.controls.length === 2 && state.topbarContract.controls.every((control) => control.name && control.width >= 44 && control.height >= 44), `${scenario[0]} lost stable refresh/more controls`);
  assert(state.topbarContract.evidenceTop !== null && state.topbarContract.evidenceTop >= state.headerRect.bottom - 1, `${scenario[0]} evidence rail overlaps the top utility bar`);
  assert(!state.streamObjectNames.some((name) => state.instrumentObjectNames.includes(name)), `${scenario[0]} repeats an instrument object in the related-object stream`);
  const normalScene = scenario[2] === "normal";
  const fleetScene = scenario[2] === "fleet";
  const sceneSemantics = normalScene
    ? state.evidenceMode === "current" && state.hasTrafficPulse && !state.hasIncidentTakeover && !state.hasFleetWorkspace
    : fleetScene
      ? state.evidenceMode === "current" && !state.hasTrafficPulse && !state.hasIncidentTakeover && state.hasFleetWorkspace && state.hasIncidentEvidence
      : !state.hasTrafficPulse && state.hasIncidentTakeover && state.hasIncidentEvidence;
  assert(sceneSemantics, `${scenario[0]} violates its scene-owned task semantics`);
  assert(!/undefined|null|NaN|Invalid Date/.test(state.bodyText), `${scenario[0]} exposes a bad literal`);
  const file = path.join(output, `${scenario[0]}-${viewport[0]}-overview.png`);
  await page.screenshot({ path: file, fullPage: false, animations: "disabled" });
  return { scenario: scenario[0], viewport: { id: viewport[0], width: viewport[1], height: viewport[2] }, state, file: path.relative(root, file).replace(/\\/g, "/"), sha256: sha256(file) };
}

async function checkInteraction(page, runtime) {
  runtime.mock.state.scenario = "interfaces-down";
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(routeUrl(runtime.mock.url, "interfaces"), { waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  const route = page.locator('[data-panel-app] > [data-mobile-flow-workspace="interfaces"]');
  await route.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await page.screenshot({ path: path.join(output, "interfaces-phone390-workspace.png"), fullPage: false, animations: "disabled" });
  const objectRow = route.locator("[data-mobile-flow-object-trigger]").first();
  const objectBox = await objectRow.boundingBox();
  assert(Boolean(objectBox && objectBox.width >= 44 && objectBox.height >= 44 && (await objectRow.textContent())?.trim()), "route object must remain named and touch-reachable");
  await objectRow.click();
  await page.locator("[data-mobile-flow-detail]").waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await page.screenshot({ path: path.join(output, "interfaces-phone390-detail.png"), fullPage: false, animations: "disabled" });
  await page.goBack({ waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  await page.locator("[data-mobile-flow-detail]").waitFor({ state: "hidden", timeout: ACTION_TIMEOUT_MS });
  await page.goForward({ waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  await page.locator("[data-mobile-flow-detail]").waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await page.setViewportSize({ width: 768, height: 1024 });
  const tabletGeometry = await page.evaluate(() => {
    const navigation = document.querySelector("[data-mobile-flow-navigation]")?.getBoundingClientRect();
    const workspace = document.querySelector('[data-mobile-flow-workspace="interfaces"]')?.getBoundingClientRect();
    return navigation && workspace ? { navigationRight: navigation.right, workspaceLeft: workspace.left } : null;
  });
  assert(Boolean(tabletGeometry && tabletGeometry.workspaceLeft >= tabletGeometry.navigationRight + 8), "tablet root navigation overlaps the master/detail workspace");
  await page.screenshot({ path: path.join(output, "interfaces-tablet768-detail.png"), fullPage: false, animations: "disabled" });

  await openHome(page, runtime, scenarios[0], viewports[3]);
  await page.locator('button[aria-label="更多模块"]').click();
  const directory = page.locator('[data-mobile-flow-workspace="more"]');
  await directory.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await directory.getByRole("button", { name: /RouterOS 连接/ }).click();
  const flow = page.locator('[data-mobile-flow-connection="flow"]');
  await flow.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await page.screenshot({ path: path.join(output, "connection-phone390-device.png"), fullPage: false, animations: "disabled" });
  await flow.getByLabel("设备地址").fill("https://invalid.example");
  await flow.getByLabel("用户名", { exact: true }).fill("observer");
  await flow.locator('input[type="password"]').fill("not-sent");
  await flow.locator('button[type="submit"]').click();
  const alert = flow.locator('[role="alert"]');
  await alert.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  assert(/协议|地址|主机名/.test((await alert.textContent()) || ""), "connection must reject protocol-bearing router addresses before a request");
  return { backForward: true, routeAccessibility: true, moreDirectory: true, connectionAddressValidation: true };
}

async function main() {
  const identityStart = gitWorktreeIdentity(root);
  fs.mkdirSync(output, { recursive: true });
  const runtime = await launchRuntime({ cwd: root, viewport: { width: 390, height: 844 } });
  try {
    const cells = [];
    const selectedScenarios = process.env.MOBILE_SCENARIO ? scenarios.filter(([id]) => id === process.env.MOBILE_SCENARIO) : scenarios;
    assert(selectedScenarios.length > 0, `unknown MOBILE_SCENARIO ${process.env.MOBILE_SCENARIO}`);
    const requiredTargets = selectedScenarios.flatMap((scenario) => viewports.map((viewport) => [scenario, viewport]));
    const targets = full ? requiredTargets : smokeCells.filter(([scenario]) => selectedScenarios.includes(scenario));
    for (const [scenario, viewport] of targets) {
      process.stdout.write(`capture ${scenario[0]} ${viewport[0]}\n`);
      try {
        cells.push(await captureCell(runtime.page, runtime, scenario, viewport));
      } catch (error) {
        throw new Error(`${scenario[0]}@${viewport[0]}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
      }
    }
    const interactions = await checkInteraction(runtime.page, runtime);
    const identityEnd = gitWorktreeIdentity(root);
    const workflows = {
      routeDetailHistory: interactions.backForward,
      routeAccessibility: interactions.routeAccessibility,
      inspectConnectionSecurity: interactions.connectionAddressValidation,
      moreDirectory: interactions.moreDirectory,
    };
    const pass = cells.length === targets.length && Object.values(workflows).every(Boolean) && sameIdentity(identityStart, identityEnd);
    const complete = full && cells.length === requiredTargets.length && pass;
    const report = {
      pass,
      complete,
      releasePass: false,
      releaseEvidenceEligible: false,
      contract: "mobile-flow-runtime-v1",
      source: "mobile-flow-runtime",
      commit: identityEnd.commit,
      artifactKey: identityEnd.artifactKey,
      worktreeFingerprint: identityEnd.worktreeFingerprint,
      freshness: sameIdentity(identityStart, identityEnd),
      matrix: { required: requiredTargets.length, expectedThisRun: targets.length, completed: cells.length },
      cells,
      workflows,
      interactions,
    };
    fs.writeFileSync(path.join(output, full ? "report.json" : "report-smoke.json"), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ pass, complete, cells: cells.length, workflows, output }, null, 2));
    if (!pass) process.exitCode = 1;
  } finally {
    await closeRuntime(runtime);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
