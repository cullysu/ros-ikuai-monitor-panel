#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { gitWorktreeIdentity } = require("./worktree-runtime-identity");
const { ACTION_TIMEOUT_MS, ABORT_CLEANUP_TIMEOUT_MS, boundedAbortCleanup, closeRuntime, launchRuntime, withTimeout } = require("./acceptance/accessibility-v2/runtime");

const root = path.resolve(__dirname, "..");
const artifactDir = path.join(root, "_acceptance", "mobile-reference-accessibility");
const reportPath = path.join(artifactDir, "report.json");
const contract = "mobile-reference-accessibility-runtime-v1";
const CONTROL_SELECTOR = "button:not([disabled]),a[href]:not([aria-disabled='true']),input:not([type='hidden']):not([disabled]),select:not([disabled]),summary,[role='button']:not([aria-disabled='true']),[role='link']:not([aria-disabled='true'])";
const HOME_SELECTOR = "[data-mobile-reference-home]";
const NAVIGATION_SELECTOR = "[data-mobile-reference-navigation]";
const CONNECTION_SELECTOR = "[data-mobile-reference-connection]";
const SOURCE_FILES = [
  "src/panel-framework/mobile-reference-ui/MobileReferenceSurface.tsx",
  "src/panel-framework/mobile-reference-ui/MobileReferenceConnection.tsx",
  "src/panel-framework/mobile-reference-ui/mobile-reference.css",
  "src/panel-framework/mobile/MobilePanelApp.tsx",
  "src/panel-framework/mobile/mobile-entry.css",
].map((file) => path.join(root, file));

const assert = (condition, message, evidence) => { if (!condition) throw new Error(`${message}${evidence ? `\n${JSON.stringify(evidence, null, 2)}` : ""}`); };
const serialise = (error) => ({ name: error?.name || "Error", code: error?.code || "", message: String(error?.message || error), stack: String(error?.stack || "").split("\n").slice(0, 7).join("\n") });
const sameIdentity = (a, b) => a.commit === b.commit && a.artifactKey === b.artifactKey && a.worktreeFingerprint === b.worktreeFingerprint;

function urlFor(baseUrl, section) { const url = new URL(baseUrl); url.searchParams.set("section", section); return url.toString(); }
async function open(page, baseUrl, section = "overview") {
  await page.goto(urlFor(baseUrl, section), { waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  const selector = section === "overview" ? HOME_SELECTOR : `[data-mobile-reference-workspace="${section}"], [data-mobile-reference-directory]`;
  await page.locator(selector).waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
}
async function configure(runtime, scenario = "") { runtime.mock.state.configured = true; runtime.mock.state.scenario = scenario; runtime.mock.state.snapshotCalls = 1; }

async function inspectSurface(page, selector, label) {
  const evidence = await page.evaluate(({ rootSelector, controlsSelector, name }) => {
    const root = document.querySelector(rootSelector);
    if (!(root instanceof HTMLElement)) throw new Error(`missing ${name}: ${rootSelector}`);
    const visible = (node) => node instanceof HTMLElement && getComputedStyle(node).display !== "none" && getComputedStyle(node).visibility !== "hidden" && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0;
    const nameOf = (node) => node.getAttribute("aria-label")?.trim() || (node instanceof HTMLInputElement && node.labels?.length ? [...node.labels].map((label) => label.textContent || "").join(" ").replace(/\s+/g, " ").trim() : "") || node.textContent?.replace(/\s+/g, " ").trim() || node.getAttribute("title") || "";
    const controls = [...root.querySelectorAll(controlsSelector)].filter(visible).map((node) => {
      const target = node instanceof HTMLInputElement || node instanceof HTMLSelectElement ? node.closest("label") || node : node;
      const rect = target.getBoundingClientRect();
      return { name: nameOf(node), width: rect.width, height: rect.height, left: rect.left, right: rect.right };
    });
    const ariaControls = [...root.querySelectorAll("[aria-controls]")].map((node) => ({ controls: node.getAttribute("aria-controls"), exists: Boolean(document.getElementById(node.getAttribute("aria-controls") || "")) }));
    return { label: name, overflowX: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0) - innerWidth, controls, ariaControls };
  }, { rootSelector: selector, controlsSelector: CONTROL_SELECTOR, name: label });
  const width = await page.evaluate(() => innerWidth);
  const bad = evidence.controls.filter((item) => !item.name || item.width < 44 || item.height < 44 || item.left < -1 || item.right > width + 1);
  assert(evidence.overflowX <= 1, `${label} has horizontal overflow`, evidence);
  assert(!bad.length, `${label} has unnamed, clipped, or undersized controls`, { bad, evidence });
  assert(evidence.ariaControls.every((item) => item.exists), `${label} contains dangling aria-controls`, evidence);
  return evidence;
}

function inspectStaticContract() {
  const missing = SOURCE_FILES.filter((file) => !fs.existsSync(file));
  const combined = SOURCE_FILES.filter(fs.existsSync).map((file) => fs.readFileSync(file, "utf8")).join("\n");
  const retired = /mobile-(?:flow|ops|pulse|origin|glance|atomic|ikuai|inspection)|Mobile(?:Flow|Ops|Pulse|Origin|Glance|Atomic|Ikuai|Inspection)/;
  const evidence = {
    missing,
    currentOwner: /data-mobile-reference-home/.test(combined),
    currentNavigation: /data-mobile-reference-navigation/.test(combined),
    currentConnection: /data-mobile-reference-connection/.test(combined),
    separateStyleEntry: /mobile-reference-ui\/mobile-reference\.css/.test(combined),
    retiredOwnerReferenceAbsent: !retired.test(combined),
    adaptiveRules: /prefers-reduced-motion/.test(combined) && /prefers-reduced-transparency/.test(combined) && /forced-colors/.test(combined),
  };
  assert(!missing.length && Object.values(evidence).every((value) => typeof value !== "boolean" || value), "mobile-reference static accessibility contract is incomplete", evidence);
  return evidence;
}

async function inspectHistory(page, runtime) {
  await configure(runtime, ""); await open(page, runtime.mock.url, "overview");
  await page.locator(".ref-card-link").click();
  await page.locator("[data-mobile-reference-wan-detail]").waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await page.goBack({ waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  await page.locator(HOME_SELECTOR).waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await page.goForward({ waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  await page.locator("[data-mobile-reference-wan-detail]").waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  return { back: true, forward: true };
}

async function inspectWorkspaceObjectDetail(page, runtime) {
  await configure(runtime, "");
  await open(page, runtime.mock.url, "interfaces");
  const workspace = page.locator('[data-mobile-reference-workspace="interfaces"]');
  const firstRow = workspace.locator("[data-panel-object-row]").first();
  await firstRow.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  const tools = await workspace.locator(".ref-workspace-tools").evaluate((node) => {
    const search = node.querySelector('input[type="search"]')?.getBoundingClientRect();
    const selects = [...node.querySelectorAll("select")].map((select) => select.closest("label")?.getBoundingClientRect()).filter(Boolean);
    return {
      search: search ? { width: search.width, height: search.height } : null,
      selects: selects.map((rect) => ({ width: rect.width, height: rect.height })),
      overflowX: Math.max(0, node.scrollWidth - node.clientWidth),
    };
  });
  assert(tools.search && tools.search.width >= 44 && tools.search.height >= 40 && tools.selects.every((rect) => rect.width >= 44 && rect.height >= 44) && tools.overflowX <= 1, "mobile workspace tools must remain labeled, touch reachable and horizontally contained", tools);
  const rowLabel = (await firstRow.textContent())?.trim() || "";
  await firstRow.click();
  const detail = page.locator('[data-mobile-reference-object-detail]:not([data-mobile-reference-object-detail="unavailable"])');
  await detail.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  assert((await detail.locator(".ref-facts").count()) >= 1, "workspace object detail must expose grouped evidence");
  assert((await detail.locator("[data-panel-route-title]").textContent())?.trim(), "workspace object detail must have a focused title");
  await page.goBack({ waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  await page.locator('[data-mobile-reference-workspace="interfaces"] [data-panel-object-row]').first().waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  return { rowLabel, tools, detail: true, back: true };
}

async function inspectMobileGeometryAndWanTruth(page, runtime) {
  await configure(runtime, "");
  await page.setViewportSize({ width: 320, height: 568 });
  await open(page, runtime.mock.url, "overview");
  const geometry = await page.evaluate(() => {
    const navigation = document.querySelector("[data-mobile-reference-navigation]")?.getBoundingClientRect();
    const viewport = document.querySelector("[data-mobile-reference-home] .ref-scroll")?.getBoundingClientRect();
    const visible = (node) => node instanceof HTMLElement && getComputedStyle(node).display !== "none" && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0;
    const content = [...document.querySelectorAll("[data-mobile-reference-home] .ref-status, [data-mobile-reference-home] .ref-card")]
      .filter(visible)
      .map((node) => ({ name: node.className, rect: node.getBoundingClientRect().toJSON() }))
      .filter((item) => navigation && viewport && item.rect.top < viewport.bottom && Math.min(item.rect.bottom, viewport.bottom) > navigation.top);
    return { navigation: navigation?.toJSON() || null, scrollViewport: viewport?.toJSON() || null, overlappingContent: content };
  });
  assert(!geometry.overlappingContent.length, "320px content is covered by fixed mobile navigation", geometry);

  await configure(runtime, "fleet-coverage");
  const url = new URL(runtime.mock.url);
  url.searchParams.set("section", "lineStatus");
  url.searchParams.set("object", "pppoe-wan2");
  await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  await page.locator("[data-mobile-reference-wan-detail]").waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  const wanTruth = await page.evaluate(() => ({
    title: document.querySelector("[data-mobile-reference-wan-detail] [data-panel-route-title]")?.textContent?.trim() || "",
    charts: document.querySelectorAll("[data-mobile-reference-wan-detail] .ref-chart").length,
    unavailable: document.querySelector("[data-mobile-reference-wan-detail] .ref-unavailable")?.textContent?.trim() || "",
  }));
  assert(/pppoe-wan2/i.test(wanTruth.title) && wanTruth.charts === 0 && /可核实/.test(wanTruth.unavailable), "non-default WAN detail must not borrow default live traffic", wanTruth);
  return { geometry, wanTruth };
}

async function inspectTextScale() {
  const runtime = await launchRuntime({ viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 } });
  try {
    await configure(runtime, ""); await open(runtime.page, runtime.mock.url, "overview");
    const baseline = await runtime.page.evaluate(() => ({ sentinel: document.querySelector(".panel-text-scale-sentinel")?.getBoundingClientRect().height || 0, overflowX: document.documentElement.scrollWidth - innerWidth }));
    await runtime.page.evaluate(() => {
      const nodes = [...document.querySelectorAll("html, body, body *")].filter((node) => node instanceof HTMLElement);
      const sizes = nodes.map((node) => [node, Number.parseFloat(getComputedStyle(node).fontSize)]).filter((entry) => Number.isFinite(entry[1]));
      sizes.forEach(([node, size]) => node.style.setProperty("font-size", `${size * 2}px`, "important"));
      window.dispatchEvent(new Event("resize"));
    });
    await runtime.page.waitForFunction(() => document.querySelector(".panel-runtime-live")?.getAttribute("data-panel-large-text") === "true", null, { timeout: ACTION_TIMEOUT_MS });
    const scaled = await runtime.page.evaluate(() => {
      const root = document.querySelector("[data-mobile-reference-home]");
      const sentinel = document.querySelector(".panel-text-scale-sentinel");
      const visible = (node) => node instanceof HTMLElement && getComputedStyle(node).display !== "none" && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0;
      const text = [...(root?.querySelectorAll("h1,h2,p,b,strong,small,span") || [])].filter(visible).map((node) => { const rect = node.getBoundingClientRect(); const style = getComputedStyle(node); return { left: rect.left, right: rect.right, clipped: style.textOverflow === "ellipsis" || node.scrollWidth > node.clientWidth + 1 }; });
      return { sentinel: sentinel?.getBoundingClientRect().height || 0, overflowX: document.documentElement.scrollWidth - innerWidth, text };
    });
    assert(scaled.sentinel >= baseline.sentinel * 1.85, "200% text scale did not double the sentinel", { baseline, scaled });
    assert(scaled.overflowX <= 1 && scaled.text.every((item) => item.left >= -1 && item.right <= 391 && !item.clipped), "200% text scale clips mobile content", { baseline, scaled });
    return { baseline, scaled };
  } finally { await closeRuntime(runtime); }
}

async function inspectAdaptiveMedia(page, runtime) {
  await configure(runtime, ""); await open(page, runtime.mock.url, "overview");
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("Emulation.setEmulatedMedia", { media: "screen", features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    const motion = await page.evaluate(() => ({ matches: matchMedia("(prefers-reduced-motion: reduce)").matches, active: getComputedStyle(document.querySelector(".ref-navigation button") || document.body).transitionDuration }));
    await session.send("Emulation.setEmulatedMedia", { media: "screen", features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
    const transparency = await page.evaluate(() => { const nav = document.querySelector(".ref-navigation"); const style = nav ? getComputedStyle(nav) : null; return { matches: matchMedia("(prefers-reduced-transparency: reduce)").matches, backdrop: style?.backdropFilter || "none" }; });
    await session.send("Emulation.setEmulatedMedia", { media: "screen", features: [{ name: "forced-colors", value: "active" }] });
    const forced = await page.evaluate(() => { const nav = document.querySelector(".ref-navigation"); const selected = nav?.querySelector('button[aria-current="page"]'); return { matches: matchMedia("(forced-colors: active)").matches, selected: Boolean(selected && selected.getBoundingClientRect().width > 0) }; });
    assert(motion.matches && (motion.active === "none" || motion.active.split(",").every((value) => Number.parseFloat(value) <= 0.02)), "reduced motion remains active", motion);
    assert(transparency.matches && (transparency.backdrop === "none" || transparency.backdrop === ""), "reduced transparency retains blur", transparency);
    assert(forced.matches && forced.selected, "forced colors lost selected navigation", forced);
    return { motion, transparency, forced };
  } finally { await session.send("Emulation.setEmulatedMedia", { media: "screen", features: [] }).catch(() => {}); await session.detach().catch(() => {}); }
}

async function inspectNavigation(page, runtime) {
  const checks = [];
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 667, height: 375 }, { width: 768, height: 1024 }]) {
    await configure(runtime, ""); await page.setViewportSize(viewport); await open(page, runtime.mock.url, "overview");
    const result = await page.evaluate(() => { const nav = document.querySelector("[data-mobile-reference-navigation]"); const tabs = [...(nav?.querySelectorAll("button") || [])].map((button) => button.getBoundingClientRect().toJSON()); return { nav: nav?.getBoundingClientRect().toJSON(), tabs, position: nav ? getComputedStyle(nav).position : "" }; });
    assert(result.nav && result.position === "fixed" && result.tabs.length === 4 && result.tabs.every((tab) => tab.width >= 44 && tab.height >= 44), "navigation is not fully reachable", { viewport, result });
    if (viewport.height <= 500 || viewport.width >= 600) assert(result.nav.left <= 1 && result.nav.width <= 80 && result.nav.height >= viewport.height - 1, "landscape/tablet navigation must use a dedicated rail", { viewport, result });
    else assert(result.nav.width >= viewport.width - 30 && result.nav.bottom <= viewport.height + 1, "phone navigation must remain a bottom control", { viewport, result });
    checks.push({ viewport, result });
  }
  return checks;
}

async function inspectConnection(page, runtime) {
  await configure(runtime, ""); await open(page, runtime.mock.url, "overview"); await page.locator('button[aria-label="打开更多工具"]').click();
  await page.locator("[data-mobile-reference-directory]").getByRole("button", { name: /RouterOS 连接/ }).click();
  const form = page.locator('[data-mobile-reference-connection="form"]'); await form.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  const evidence = await inspectSurface(page, CONNECTION_SELECTOR, "connection");
  await form.getByLabel("地址", { exact: true }).fill("https://invalid.example"); await form.getByLabel("用户名", { exact: true }).fill("observer"); await form.locator('input[type="password"]').fill("not-sent"); await form.locator('button[type="submit"]').click();
  const alert = form.locator('[role="alert"]'); await alert.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  assert(/协议|地址|主机名/.test((await alert.textContent()) || ""), "connection must reject protocol-bearing addresses");
  return { evidence, addressValidation: true };
}

async function inspectAbortBound() { const started = Date.now(); let error = null; try { await boundedAbortCleanup(() => new Promise(() => {}), 70); } catch (failure) { error = failure; } const evidence = { code: error?.code || "", elapsedMs: Date.now() - started, configured: ABORT_CLEANUP_TIMEOUT_MS }; assert(evidence.code === "ABORT_CLEANUP_TIMEOUT" && evidence.elapsedMs >= 50 && evidence.elapsedMs < 1000, "runtime abort cleanup is not bounded", evidence); return evidence; }

async function main() {
  const started = Date.now(); const identityStart = gitWorktreeIdentity(root); const stages = []; let runtime = null;
  const run = async (name, operation) => { const stage = { name, status: "running" }; stages.push(stage); try { stage.evidence = await operation(); stage.status = "passed"; } catch (error) { stage.status = "failed"; stage.error = serialise(error); throw error; } };
  try {
    await run("static-mobile-reference-owner", inspectStaticContract);
    await run("abort-cleanup-bound", inspectAbortBound);
    runtime = await launchRuntime({ viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 } });
    await configure(runtime, "");
    await open(runtime.page, runtime.mock.url, "overview");
    await run("overview-controls", () => inspectSurface(runtime.page, HOME_SELECTOR, "overview"));
    await run("model-runtime", async () => { await configure(runtime, "interfaces-down"); await open(runtime.page, runtime.mock.url, "overview"); const scene = await runtime.page.locator(HOME_SELECTOR).getAttribute("data-mobile-reference-scene"); assert(scene === "interfaces", "interfaces-down must render the interface scene"); return { scene }; });
    await run("wan-detail-history", () => inspectHistory(runtime.page, runtime));
    await run("workspace-object-detail", () => inspectWorkspaceObjectDetail(runtime.page, runtime));
    await run("mobile-geometry-and-wan-truth", () => inspectMobileGeometryAndWanTruth(runtime.page, runtime));
    await run("text-only-scale-200", inspectTextScale);
    await run("adaptive-media", () => inspectAdaptiveMedia(runtime.page, runtime));
    await run("navigation", () => inspectNavigation(runtime.page, runtime));
    await run("connection-controls", () => inspectConnection(runtime.page, runtime));
  } finally { if (runtime) await closeRuntime(runtime); }
  const identityEnd = gitWorktreeIdentity(root); const complete = stages.length === 11 && stages.every((stage) => stage.status === "passed") && sameIdentity(identityStart, identityEnd);
  const report = { pass: complete, complete, contract, source: "mobile-reference", generatedAt: new Date().toISOString(), commit: identityEnd.commit, artifactKey: identityEnd.artifactKey, worktreeFingerprint: identityEnd.worktreeFingerprint, freshness: sameIdentity(identityStart, identityEnd), stages, elapsedMs: Date.now() - started };
  fs.mkdirSync(artifactDir, { recursive: true }); fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`); console.log(JSON.stringify({ pass: report.pass, complete: report.complete, contract, stages: stages.map((stage) => ({ name: stage.name, status: stage.status })), elapsedMs: report.elapsedMs }, null, 2)); if (!complete) process.exitCode = 1;
}

withTimeout("mobile reference accessibility", () => main(), 210_000).catch((error) => { const identity = gitWorktreeIdentity(root); const report = { pass: false, complete: false, contract, source: "mobile-reference", generatedAt: new Date().toISOString(), commit: identity.commit, artifactKey: identity.artifactKey, worktreeFingerprint: identity.worktreeFingerprint, error: serialise(error) }; fs.mkdirSync(artifactDir, { recursive: true }); fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`); console.error(JSON.stringify(report, null, 2)); process.exitCode = 1; });
