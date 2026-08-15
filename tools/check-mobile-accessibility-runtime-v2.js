#!/usr/bin/env node
"use strict";

// Accessibility evidence for the isolated Mobile Flow owner. It checks
// rendered browser behavior; static source assertions merely prevent a stale
// owner or a missing adaptive media rule from being mistaken for a pass.
const fs = require("node:fs");
const path = require("node:path");
const { gitWorktreeIdentity } = require("./worktree-runtime-identity");
const { ACTION_TIMEOUT_MS, ABORT_CLEANUP_TIMEOUT_MS, boundedAbortCleanup, closeRuntime, launchRuntime, withTimeout } = require("./acceptance/accessibility-v2/runtime");

const root = path.resolve(__dirname, "..");
const artifactDir = path.join(root, "_acceptance", "mobile-accessibility-runtime-v2", "telemetry");
const reportPath = path.join(artifactDir, "report.json");
const contract = "mobile-flow-accessibility-runtime-v2";
const CONTROL_SELECTOR = "button:not([disabled]),a[href]:not([aria-disabled='true']),input:not([type='hidden']):not([disabled]),select:not([disabled]),summary,[role='button']:not([aria-disabled='true']),[role='link']:not([aria-disabled='true'])";
const HOME_SELECTOR = "[data-mobile-flow-overview]";
const NAVIGATION_SELECTOR = "[data-mobile-flow-navigation]";
const ROUTE_SELECTOR = "[data-mobile-flow-workspace]";
const DETAIL_SELECTOR = "[data-mobile-flow-detail]";
const CONNECTION_SELECTOR = "[data-mobile-flow-connection]";
const sources = [
  "src/panel-framework/mobile-flow-ui/overview/MobileFlowOverview.tsx",
  "src/panel-framework/mobile-flow-ui/overview/mobileFlowModel.ts",
  "src/panel-framework/mobile-flow-ui/navigation/MobileFlowNavigation.tsx",
  "src/panel-framework/mobile-flow-ui/workspace/MobileFlowWorkspace.tsx",
  "src/panel-framework/mobile-flow-ui/workspace/MobileFlowRoutes.tsx",
  "src/panel-framework/mobile-flow-ui/connection/MobileFlowConnection.tsx",
  "src/panel-framework/mobile-flow-ui/styles/flow-overview.css",
  "src/panel-framework/mobile-flow-ui/styles/flow-navigation.css",
  "src/panel-framework/mobile-flow-ui/styles/flow-workspace.css",
  "src/panel-framework/mobile-flow-ui/styles/flow-directory.css",
  "src/panel-framework/mobile-flow-ui/styles/flow-connection.css",
].map((file) => path.join(root, file));

function assert(condition, message, evidence) {
  if (!condition) throw new Error(`${message}${evidence ? `\n${JSON.stringify(evidence, null, 2)}` : ""}`);
}
function serialise(error) {
  return { name: error?.name || "Error", code: error?.code || "", message: String(error?.message || error), stack: String(error?.stack || "").split("\n").slice(0, 7).join("\n") };
}
function sameIdentity(a, b) { return a.commit === b.commit && a.artifactKey === b.artifactKey && a.worktreeFingerprint === b.worktreeFingerprint; }
function urlFor(baseUrl, section, object) {
  const url = new URL(baseUrl); url.searchParams.set("section", section);
  if (object) url.searchParams.set("object", object); else url.searchParams.delete("object");
  url.hash = ""; return url.toString();
}
async function runStage(stages, name, operation) {
  const stage = { name, status: "running", startedAt: new Date().toISOString() }; stages.push(stage);
  try { const evidence = await operation(); stage.status = "passed"; stage.evidence = evidence; return evidence; }
  catch (error) { stage.status = "failed"; stage.error = serialise(error); throw error; }
  finally { stage.finishedAt = new Date().toISOString(); }
}

async function open(page, baseUrl, section = "overview") {
  await page.goto(urlFor(baseUrl, section), { waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  const selector = section === "overview" ? HOME_SELECTOR : `[data-mobile-flow-workspace="${section}"]`;
  await page.locator(selector).waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
}

async function loginMobileFlow(page, baseUrl) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  const form = page.locator('[data-mobile-flow-connection="flow"] form, [data-router-login-form]').first();
  await page.waitForFunction(() => {
    if (document.querySelector('[data-mobile-flow-connection="flow"] form, [data-router-login-form]')) return "form";
    const retry = document.querySelector('[data-mobile-flow-connection="status"][data-phase="error"] button');
    return retry instanceof HTMLButtonElement ? "retry" : null;
  }, null, { timeout: 30_000 });
  const retry = page.locator('[data-mobile-flow-connection="status"][data-phase="error"] button').first();
  if (await retry.count()) await retry.click();
  await form.waitFor({ state: "visible", timeout: 30_000 });
  await form.locator('input[name="host"], input[aria-label="设备地址"]').first().fill("192.0.2.1");
  await form.locator('input[name="user"], input[aria-label="用户名"]').first().fill("observer");
  await form.locator('input[name="password"], input[aria-label="密码"]').first().fill("correct-horse");
  const submit = async () => {
    const button = form.locator('button[type="submit"]');
    await button.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
    await button.click();
  };
  await submit();
  const next = await page.waitForFunction(() => {
    if (document.querySelector('[data-panel-runtime-phase="current"]')) return "current";
    const confirmation = document.querySelector('[data-mobile-flow-connection="flow"] .mflow-connection__hostkey input[type="checkbox"], .router-host-key-confirmation input[type="checkbox"]');
    return confirmation instanceof HTMLInputElement && !confirmation.disabled ? "host-key" : null;
  }, null, { timeout: ACTION_TIMEOUT_MS });
  if (await next.jsonValue() === "host-key") {
    await page.locator('[data-mobile-flow-connection="flow"] .mflow-connection__hostkey input[type="checkbox"], .router-host-key-confirmation input[type="checkbox"]').first().check();
    await submit();
  }
  await page.waitForFunction(() => document.querySelector("[data-panel-runtime-phase]")?.getAttribute("data-panel-runtime-phase") === "current", null, { timeout: ACTION_TIMEOUT_MS });
}

async function waitForMobileFlowOverview(page) {
  await page.waitForFunction(() => {
    const root = document.querySelector("[data-mobile-flow-overview]");
    return root?.hasAttribute("data-mobile-flow-scene") && root?.hasAttribute("data-evidence-mode");
  }, null, { timeout: ACTION_TIMEOUT_MS });
}

async function inspectSurface(page, selector, label) {
  const evidence = await page.evaluate(({ selector: rootSelector, controlsSelector, label: name }) => {
    const root = document.querySelector(rootSelector);
    if (!(root instanceof HTMLElement)) throw new Error(`missing ${name}: ${rootSelector}`);
    const visible = (node) => {
      if (!(node instanceof HTMLElement)) return false;
      const style = getComputedStyle(node); const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const nameOf = (node) => {
      const ids = (node.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean);
      const labelled = ids.map((id) => document.getElementById(id)?.textContent || "").join(" ").trim();
      if (node.getAttribute("aria-label")) return node.getAttribute("aria-label").trim();
      if (labelled) return labelled;
      if (node instanceof HTMLInputElement && node.labels?.length) return [...node.labels].map((item) => item.textContent || "").join(" ").trim();
      return (node.textContent || node.getAttribute("title") || "").replace(/\s+/g, " ").trim();
    };
    const horizontallyReachable = (node) => {
      let current = node.parentElement;
      while (current && current !== root.parentElement) {
        const style = getComputedStyle(current);
        if ((style.overflowX === "auto" || style.overflowX === "scroll") && current.scrollWidth > current.clientWidth + 1) return true;
        current = current.parentElement;
      }
      return false;
    };
    const controls = [...root.querySelectorAll(controlsSelector)].filter(visible).map((node) => {
      const target = node instanceof HTMLInputElement || node instanceof HTMLSelectElement ? node.closest("label") || node : node;
      const rect = target.getBoundingClientRect();
      return { name: nameOf(node), width: rect.width, height: rect.height, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, horizontallyReachable: horizontallyReachable(target) };
    });
    const ariaControls = [...root.querySelectorAll("[aria-controls]")].map((node) => ({ controls: node.getAttribute("aria-controls"), exists: Boolean(document.getElementById(node.getAttribute("aria-controls") || "")) }));
    return { label: name, overflowX: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0) - innerWidth, controls, ariaControls, root: rootSelector };
  }, { selector, controlsSelector: CONTROL_SELECTOR, label });
  const viewportWidth = await page.evaluate(() => innerWidth);
  const bad = evidence.controls.filter((item) => !item.name || item.width < 44 || item.height < 44 || ((item.left < -1 || item.right > 1 + viewportWidth) && !item.horizontallyReachable));
  assert(evidence.overflowX <= 1, `${label} has horizontal overflow`, evidence);
  assert(!bad.length, `${label} has unnamed, clipped, or undersized controls`, { bad, evidence });
  assert(evidence.ariaControls.every((item) => item.exists), `${label} contains dangling aria-controls`, evidence);
  return evidence;
}

async function collectTextScaleCases(scaledText = false) {
  let runtime = null;
  try {
    runtime = await launchRuntime({ viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 } });
    await loginMobileFlow(runtime.page, runtime.mock.url);
    const cases = [];
    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
      for (const scenario of ["single", "interfaces-down"]) {
        runtime.mock.state.scenario = scenario === "single" ? "" : scenario;
        await runtime.page.setViewportSize(viewport);
        await open(runtime.page, runtime.mock.url, "overview");
        await waitForMobileFlowOverview(runtime.page);
        if (scaledText) {
          await runtime.page.evaluate(() => {
            const nodes = [...document.querySelectorAll("html, body, body *")].filter((node) => node instanceof HTMLElement);
            const sizes = nodes.map((node) => [node, parseFloat(getComputedStyle(node).fontSize)]).filter((entry) => Number.isFinite(entry[1]));
            sizes.forEach(([node, size]) => node.style.setProperty("font-size", `${size * 2}px`, "important"));
            window.dispatchEvent(new Event("resize"));
          });
          await runtime.page.waitForFunction(() => document.querySelector("[data-mobile-flow-overview]")?.closest(".panel-runtime-live")?.getAttribute("data-panel-large-text") === "true", null, { timeout: ACTION_TIMEOUT_MS });
        }
        const observation = await runtime.page.evaluate((controlsSelector) => {
          const root = document.querySelector("[data-mobile-flow-overview]");
          const sentinel = document.querySelector(".panel-text-scale-sentinel");
          if (!(root instanceof HTMLElement) || !(sentinel instanceof HTMLElement)) throw new Error("text scale owner is absent");
          const visible = (node) => node instanceof HTMLElement && getComputedStyle(node).display !== "none" && getComputedStyle(node).visibility !== "hidden" && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0;
          const text = [...root.querySelectorAll("h1,h2,h3,p,b,strong,small,time,dt,dd,span")].filter(visible).map((node) => {
            const rect = node.getBoundingClientRect(); const style = getComputedStyle(node);
            const clipsOwnText = style.textOverflow === "ellipsis" || ((style.overflowX === "hidden" || style.overflowX === "clip") && node.scrollWidth > node.clientWidth + 1);
            return { value: (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 64), left: rect.left, right: rect.right, clipsOwnText };
          }).filter((item) => item.value);
          const controls = [...document.querySelectorAll(controlsSelector)].filter(visible).map((node) => {
            const target = node instanceof HTMLInputElement || node instanceof HTMLSelectElement ? node.closest("label") || node : node;
            const rect = target.getBoundingClientRect(); return { width: rect.width, height: rect.height, left: rect.left, right: rect.right };
          });
          return {
            zoom: getComputedStyle(document.documentElement).zoom,
            largeText: root.closest(".panel-runtime-live")?.getAttribute("data-panel-large-text"),
            sentinel: sentinel.getBoundingClientRect().height,
            sentinelFont: parseFloat(getComputedStyle(sentinel).fontSize),
            viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
            overflowX: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0) - innerWidth,
            text,
            controls,
          };
        }, CONTROL_SELECTOR);
        cases.push({ scenario, viewport, observation });
      }
    }
    return cases;
  } finally { if (runtime) await closeRuntime(runtime); }
}

async function inspectTextOnly200Percent() {
  const baseline = await collectTextScaleCases();
  const scaled = await collectTextScaleCases(true);
  const pairs = scaled.map((item, index) => ({ baseline: baseline[index], scaled: item }));
  const evidence = { method: "computed font-size x2 injection on every rendered HTMLElement; CSS zoom unchanged", baseline, scaled };
  assert(pairs.every(({ baseline: before, scaled: after }) => before.observation.zoom === "1" && after.observation.zoom === "1"), "text-only test changed CSS zoom", evidence);
  assert(pairs.every(({ baseline: before, scaled: after }) => after.observation.sentinel >= before.observation.sentinel * 1.85 && after.observation.sentinelFont >= before.observation.sentinelFont * 1.85), "browser text scale factor did not double rendered text", evidence);
  assert(pairs.every(({ baseline: before, scaled: after }) => before.observation.viewport.width === after.observation.viewport.width && before.observation.viewport.height === after.observation.viewport.height && before.observation.viewport.dpr === after.observation.viewport.dpr), "text-only test changed viewport or DPR", evidence);
  assert(scaled.every((item) => item.observation.largeText === "true" && item.observation.overflowX <= 1 && item.observation.text.every((text) => text.left >= -1 && text.right <= item.viewport.width + 1 && !text.clipsOwnText) && item.observation.controls.every((control) => control.width >= 44 && control.height >= 44 && control.left >= -1 && control.right <= item.viewport.width + 1)), "200% text-only scale clips telemetry or controls", evidence);
  return evidence;
}

async function emulateFeature(page, feature, value, inspect) {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("Emulation.setEmulatedMedia", { media: "screen", features: [{ name: feature, value }] });
    await page.waitForTimeout(60);
    const evidence = await inspect();
    assert(evidence.matches === true, `${feature} emulation did not take effect`, evidence);
    return evidence;
  } finally {
    await session.send("Emulation.setEmulatedMedia", { media: "screen", features: [] }).catch(() => {});
    await session.detach().catch(() => {});
  }
}

async function inspectAdaptiveMedia(page, baseUrl) {
  await open(page, baseUrl, "overview");
  const reducedMotion = await emulateFeature(page, "prefers-reduced-motion", "reduce", () => page.evaluate(() => {
    const tab = document.querySelector('[data-mobile-flow-navigation] button'); const style = tab ? getComputedStyle(tab) : null;
    return { matches: matchMedia("(prefers-reduced-motion: reduce)").matches, transition: style?.transitionDuration || "", animation: style?.animationName || "" };
  }));
  assert(reducedMotion.transition === "none" || reducedMotion.transition.split(",").every((value) => parseFloat(value) <= 0.02), "reduced motion retains an active tab transition", reducedMotion);
  const transparency = await emulateFeature(page, "prefers-reduced-transparency", "reduce", () => page.evaluate(() => {
    const nav = document.querySelector('[data-mobile-flow-navigation]'); const style = nav ? getComputedStyle(nav) : null;
    return { matches: matchMedia("(prefers-reduced-transparency: reduce)").matches, backdrop: style?.backdropFilter || "", webkitBackdrop: style?.webkitBackdropFilter || "", background: style?.backgroundColor || "" };
  }));
  const noBackdropEffect = (value) => value === "" || value === "none";
  assert(noBackdropEffect(transparency.backdrop) && noBackdropEffect(transparency.webkitBackdrop), "reduced transparency retains backdrop blur", transparency);
  await page.setViewportSize({ width: 768, height: 1024 });
  await open(page, baseUrl, "overview");
  const forcedColors = await emulateFeature(page, "forced-colors", "active", () => page.evaluate(() => {
    const nav = document.querySelector('[data-mobile-flow-navigation]'); const style = nav ? getComputedStyle(nav) : null;
    const selected = nav?.querySelector('button[aria-current="page"]'); const selectedStyle = selected ? getComputedStyle(selected) : null;
    return { matches: matchMedia("(forced-colors: active)").matches, background: style?.backgroundColor || "", border: style?.borderTopColor || "", selectedVisible: Boolean(selected && selected.getBoundingClientRect().width > 0), selectedColor: selectedStyle?.color || "", selectedOutline: selectedStyle?.outlineStyle || "", selectedOutlineWidth: parseFloat(selectedStyle?.outlineWidth || "0") };
  }));
  assert(forcedColors.background && forcedColors.border && forcedColors.selectedVisible && forcedColors.selectedColor && forcedColors.selectedOutline !== "none" && forcedColors.selectedOutlineWidth >= 1, "forced colors did not preserve navigation and selected-route cues", forcedColors);
  return { reducedMotion, transparency, forcedColors };
}

async function inspectHistoryFocus(page, baseUrl) {
  await open(page, baseUrl, "interfaces");
  const routeRoot = '[data-mobile-flow-workspace="interfaces"]';
  const row = page.locator(`${routeRoot} [data-mobile-flow-object-trigger]`).first();
  await row.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await row.click();
  await page.locator(DETAIL_SELECTOR).waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await page.waitForFunction((selector) => document.activeElement?.matches(selector) || false, `${DETAIL_SELECTOR} [data-panel-route-title]`, { timeout: ACTION_TIMEOUT_MS });
  await page.goBack({ waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  await page.locator(routeRoot).waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await page.waitForTimeout(120);
  const back = await page.evaluate(() => ({ detail: Boolean(document.querySelector('[data-mobile-flow-detail]')), focusedTrigger: document.activeElement?.matches("[data-mobile-flow-object-trigger]") || false, activeElement: document.activeElement?.outerHTML.slice(0, 180) || "" }));
  assert(!back.detail && back.focusedTrigger, "Back did not restore focus to the originating object", back);
  await page.goForward({ waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  await page.locator(DETAIL_SELECTOR).waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await page.waitForTimeout(120);
  const forward = await page.evaluate(() => ({ focusedDetailTitle: document.activeElement?.matches("[data-panel-route-title]") || false, activeElement: document.activeElement?.outerHTML.slice(0, 180) || "" }));
  assert(forward.focusedDetailTitle, "Forward did not restore focus to the native detail title", forward);
  return { back, forwardDetail: true, forward };
}

async function inspectBottomNav(page, baseUrl) {
  for (const viewport of [{ width: 390, height: 844 }, { width: 667, height: 375 }, { width: 844, height: 390 }, { width: 768, height: 1024 }]) {
    await page.setViewportSize(viewport); await open(page, baseUrl, "overview");
    const result = await page.evaluate(() => {
      const nav = document.querySelector('[data-mobile-flow-navigation]'); const main = document.querySelector("[data-mobile-flow-overview]");
      if (!(nav instanceof HTMLElement) || !(main instanceof HTMLElement)) throw new Error("mobile nav/root missing");
      const navRect = nav.getBoundingClientRect(); const tabs = [...nav.querySelectorAll("button")].map((button) => button.getBoundingClientRect().toJSON());
      const headerRect = main.querySelector(".mflow-topbar")?.getBoundingClientRect();
      return { viewport: { width: innerWidth, height: innerHeight }, nav: navRect.toJSON(), tabs, navPosition: getComputedStyle(nav).position, header: headerRect?.toJSON() || null, tabRows: new Set(tabs.map((tab) => Math.round(tab.top))).size, tabColumns: new Set(tabs.map((tab) => Math.round(tab.left))).size };
    });
    assert(result.nav.top >= -1 && result.nav.right <= result.viewport.width + 1 && result.nav.bottom <= result.viewport.height + 1 && result.nav.left >= -1 && result.tabs.length === 4 && result.tabs.every((tab) => tab.width >= 44 && tab.height >= 44), "navigation is not fully reachable", result);
    assert(result.navPosition === "fixed" && result.header, "navigation or first task header is missing", result);
    if (viewport.width >= 600 && viewport.height >= 700) {
      assert(result.tabColumns === 1 && result.header.left >= result.nav.right - 1, "tablet navigation must own a dedicated adaptive rail", result);
    } else if (viewport.width > viewport.height) {
      const phoneNativeBottomControl = result.nav.top >= result.header.bottom - 1
        && result.tabRows === 1
        && result.tabColumns === 4;
      assert(phoneNativeBottomControl, "short landscape navigation must remain a four-root phone control below the task header, not a desktop rail", result);
    } else {
      assert(result.tabRows === 1 && result.tabColumns === 4, "phone navigation must remain a four-root bottom control", result);
    }
  }
  return { checked: 4 };
}

async function inspectRouteSearchKeyboard(runtime) {
  const evidence = [];
  const route = "terminals";
  for (const test of [
    { viewport: { width: 667, height: 375 }, scenario: "single" },
    { viewport: { width: 768, height: 1024 }, scenario: "interfaces-down" },
  ]) {
    runtime.mock.state.scenario = test.scenario === "single" ? "" : test.scenario;
    await runtime.page.setViewportSize(test.viewport);
    await open(runtime.page, runtime.mock.url, route);
    const routeRoot = `[data-mobile-flow-workspace="${route}"]`;
    const search = runtime.page.locator(`${routeRoot} input[type="search"]`);
    await search.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
    const urlBefore = runtime.page.url();
    await search.focus();
    await runtime.page.keyboard.press("Control+A");
    await runtime.page.keyboard.type("workstation");
    const observation = await runtime.page.evaluate((routeId) => {
      const root = document.querySelector(`[data-mobile-flow-workspace="${routeId}"]`);
      const input = root?.querySelector('input[type="search"]');
      if (!(input instanceof HTMLInputElement)) throw new Error("route search is absent");
      const results = root?.querySelector(".mflow-workspace__rows");
      return {
        focused: document.activeElement === input,
        query: input.value,
        resultsPresent: Boolean(results),
        visibleRows: results?.querySelectorAll("[data-mobile-flow-object-trigger]").length || 0,
      };
    }, route);
    const detail = await runtime.page.locator(DETAIL_SELECTOR).count();
    const result = { ...test, urlBefore, urlAfter: runtime.page.url(), detail, ...observation };
    assert(result.focused && result.query === "workstation" && result.resultsPresent && result.visibleRows > 0 && result.detail === 0 && result.urlAfter === result.urlBefore, "route search keyboard contract failed", result);
    evidence.push(result);
  }
  return evidence;
}

function inspectStaticContract() {
  const missing = sources.filter((file) => !fs.existsSync(file));
  const combined = sources.filter(fs.existsSync).map((file) => fs.readFileSync(file, "utf8")).join("\n");
  const evidence = {
    missing,
    mobileFlowOwnerPresent: fs.existsSync(path.join(root, "src", "panel-framework", "mobile-flow-ui")),
    mobileNativeOwnerAbsent: !fs.existsSync(path.join(root, "src", "panel-framework", "mobile-native-ui")),
    mobileOpsOwnerAbsent: !fs.existsSync(path.join(root, "src", "panel-framework", "mobile-ops-ui")),
    mobilePulseOwnerAbsent: !fs.existsSync(path.join(root, "src", "panel-framework", "mobile-pulse-ui")),
    noLegacyOwnerImport: !/from\s+["'][^"']*(?:mobile-ops-ui|mobile-pulse-ui|mobile-origin-space|mobile-ikuai4|mobile-patrol)/.test(combined),
    homeRoot: /data-mobile-flow-overview/.test(combined),
    navigationRoot: /data-mobile-flow-navigation/.test(combined),
    routeRoot: /data-mobile-flow-workspace/.test(combined),
    detailRoot: /data-mobile-flow-detail/.test(combined),
    connectionRoot: /data-mobile-flow-connection/.test(combined),
    adaptiveRules: /prefers-reduced-motion/.test(combined) && /prefers-reduced-transparency/.test(combined) && /forced-colors/.test(combined),
  };
  assert(!missing.length && Object.values(evidence).every((value) => typeof value !== "boolean" || value), "mobile-flow static accessibility contract is incomplete", evidence);
  return evidence;
}

async function inspectConnectionSurface(page, baseUrl) {
  await open(page, baseUrl, "more");
  const opener = page.getByRole("button", { name: /RouterOS 连接/ });
  await opener.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await opener.click();
  await page.locator(CONNECTION_SELECTOR).waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  return inspectSurface(page, CONNECTION_SELECTOR, "connection");
}

async function inspectAbortBound() {
  const started = Date.now(); let error = null;
  try { await boundedAbortCleanup(() => new Promise(() => {}), 70); } catch (failure) { error = failure; }
  const evidence = { code: error?.code || "", elapsedMs: Date.now() - started, configured: ABORT_CLEANUP_TIMEOUT_MS };
  assert(evidence.code === "ABORT_CLEANUP_TIMEOUT" && evidence.elapsedMs >= 50 && evidence.elapsedMs < 1000, "runtime abort cleanup is not bounded", evidence);
  return evidence;
}

async function main() {
  const started = Date.now(); const identityStart = gitWorktreeIdentity(root); const stages = [];
  let runtime = null;
  try {
    await runStage(stages, "static-mobile-flow-owner", inspectStaticContract);
    await runStage(stages, "abort-cleanup-bound", inspectAbortBound);
    runtime = await launchRuntime({ viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 } });
    await loginMobileFlow(runtime.page, runtime.mock.url);
    await runStage(stages, "overview-controls", () => inspectSurface(runtime.page, HOME_SELECTOR, "overview"));
    await runStage(stages, "route-controls", async () => { await open(runtime.page, runtime.mock.url, "interfaces"); return inspectSurface(runtime.page, '[data-mobile-flow-workspace="interfaces"]', "interfaces"); });
    await runStage(stages, "detail-history-focus", () => inspectHistoryFocus(runtime.page, runtime.mock.url));
    await runStage(stages, "text-only-scale-200", inspectTextOnly200Percent);
    await runStage(stages, "adaptive-media", () => inspectAdaptiveMedia(runtime.page, runtime.mock.url));
    await runStage(stages, "bottom-navigation", () => inspectBottomNav(runtime.page, runtime.mock.url));
    await runStage(stages, "route-search-keyboard", () => inspectRouteSearchKeyboard(runtime));
    await runStage(stages, "connection-controls", () => inspectConnectionSurface(runtime.page, runtime.mock.url));
  } finally { if (runtime) await closeRuntime(runtime); }
  const identityEnd = gitWorktreeIdentity(root); const complete = stages.length === 10 && stages.every((stage) => stage.status === "passed") && sameIdentity(identityStart, identityEnd);
  const report = { pass: complete, complete, contract, source: "mobile-flow", generatedAt: new Date().toISOString(), commit: identityEnd.commit, artifactKey: identityEnd.artifactKey, worktreeFingerprint: identityEnd.worktreeFingerprint, freshness: sameIdentity(identityStart, identityEnd), stages, elapsedMs: Date.now() - started };
  fs.mkdirSync(artifactDir, { recursive: true }); fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ pass: report.pass, complete: report.complete, contract, stages: stages.map((stage) => ({ name: stage.name, status: stage.status })), elapsedMs: report.elapsedMs }, null, 2));
  if (!complete) process.exitCode = 1;
}

withTimeout("mobile flow accessibility", () => main(), 210_000).catch((error) => {
  const identity = gitWorktreeIdentity(root);
  const report = { pass: false, complete: false, contract, source: "mobile-flow", generatedAt: new Date().toISOString(), commit: identity.commit, artifactKey: identity.artifactKey, worktreeFingerprint: identity.worktreeFingerprint, error: serialise(error) };
  fs.mkdirSync(artifactDir, { recursive: true }); fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(JSON.stringify(report, null, 2)); process.exitCode = 1;
});
