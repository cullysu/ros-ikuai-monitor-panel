#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ACTION_TIMEOUT_MS, closeRuntime, launchRuntime } = require("./acceptance/accessibility-v2/runtime");
const { gitWorktreeIdentity } = require("./worktree-runtime-identity");
const { cellKey, decodePngIdentity, verifyCellPngEvidence } = require("./png-evidence-identity");
const { assertRuntimeLaunchContract, captureRuntimeIdentity, sameRuntimeCore, sameRuntimeIdentity, validateRecordedRuntimeIdentity } = require("./runtime-process-identity");

const root = path.resolve(__dirname, "..");
const smoke = process.argv.includes("--smoke");
const output = path.join(root, "_acceptance", smoke ? "mobile-reference-runtime-smoke" : "mobile-reference-runtime");
const append = process.argv.includes("--append");
const skipInteractions = process.argv.includes("--skip-interactions");
const requestedCpuLimit = Number(process.env.MOBILE_MAX_CPU_PERCENT || 55);
const cpuLimit = Math.min(55, Math.max(20, Number.isFinite(requestedCpuLimit) ? requestedCpuLimit : 55));
const scenarios = [
  ["single", "", "normal"], ["fleet", "fleet", "interfaces"], ["all-offline", "all-offline", "outage"],
  ["no-snapshot", "no-snapshot", "unavailable"], ["collection-down", "collection-down", "collection"],
  ["resource-full", "resource-full", "resource"], ["interfaces-down", "interfaces-down", "interfaces"],
];
const viewports = [
  ["phone320", 320, 568], ["phone360", 360, 800], ["phone375", 375, 667], ["phone390", 390, 844],
  ["phone430", 430, 932], ["landscape568", 568, 320], ["tablet768", 768, 1024],
];
const smokeCells = [
  [scenarios[0], viewports[0]], [scenarios[0], viewports[5]], [scenarios[0], viewports[3]], [scenarios[3], viewports[3]],
  [scenarios[4], viewports[3]], [scenarios[5], viewports[3]], [scenarios[6], viewports[3]], [scenarios[0], viewports[6]],
];
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sameIdentity = (a, b) => a.commit === b.commit && a.artifactKey === b.artifactKey &&
  a.worktreeFingerprint === b.worktreeFingerprint &&
  a.reviewContentFingerprint === b.reviewContentFingerprint;
const viewportByIdentity = new Map(viewports.map((viewport) => [viewport[0], viewport]));

function verifyCellEvidence(cells) {
  const seen = new Set();
  const errors = [];
  for (const cell of cells) {
    const key = cellKey(cell);
    if (!key || key.endsWith("::undefined") || seen.has(key)) errors.push(`${key || "(unknown)"}: duplicate or invalid cell key`);
    seen.add(key);
    const expected = viewportByIdentity.get(cell?.viewport?.id);
    if (!expected) {
      errors.push(`${key}: unknown viewport`);
      continue;
    }
    errors.push(...verifyCellPngEvidence(cell, root, expected[1], expected[2]));
  }
  return errors;
}

function assertAppendCellsAreFresh(previous) {
  const cells = Array.isArray(previous?.cells) ? previous.cells : [];
  assert(cells.length > 0 && new Set(cells.map(cellKey)).size === cells.length, "append report has no unique historical cells");
  const errors = verifyCellEvidence(cells);
  assert(errors.length === 0, `historical PNG evidence failed revalidation: ${errors.slice(0, 5).join("; ")}`);
}

function cpuSnapshot() {
  return os.cpus().reduce((total, cpu) => {
    const times = Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
    return { total: total.total + times, idle: total.idle + cpu.times.idle };
  }, { total: 0, idle: 0 });
}

function cpuLoadBetween(start, end) {
  const total = Math.max(1, end.total - start.total);
  const idle = Math.max(0, end.idle - start.idle);
  return Math.max(0, Math.min(100, (1 - idle / total) * 100));
}

async function sampleCpuLoad(sampleMs = 400) {
  const start = cpuSnapshot();
  await new Promise((resolve) => setTimeout(resolve, sampleMs));
  return cpuLoadBetween(start, cpuSnapshot());
}

async function waitForCpuBudget(label) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const load = await sampleCpuLoad();
    process.stdout.write(`cpu ${label} ${load.toFixed(1)}% limit ${cpuLimit}% attempt ${attempt}/3\n`);
    if (load <= cpuLimit) return load;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`CPU budget exceeded before ${label}; refusing to start or continue browser acceptance`);
}

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
  const home = page.locator("[data-mobile-reference-home]");
  await home.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await page.waitForTimeout(50);
  return home;
}

async function captureCell(page, runtime, scenario, viewport) {
  await openHome(page, runtime, scenario, viewport);
  await page.evaluate(() => {
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    document.scrollingElement?.scrollTo(0, 0);
    document.querySelectorAll(".ref-scroll").forEach((node) => node instanceof HTMLElement && node.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  });
  await page.waitForTimeout(40);
  const state = await page.evaluate(() => {
    const home = document.querySelector("[data-mobile-reference-home]");
    const navigation = document.querySelectorAll("[data-mobile-reference-navigation]");
    const navigationRect = navigation[0]?.getBoundingClientRect();
    const buttons = [...(navigation[0]?.querySelectorAll("button") || [])].map((node) => {
      const rect = node.getBoundingClientRect();
      return { label: node.textContent?.trim() || "", width: rect.width, height: rect.height, left: rect.left, top: rect.top };
    });
    const topbar = home?.querySelector(".ref-topbar");
    const title = topbar?.querySelector("h1");
    const conclusion = home?.querySelector(".ref-status");
    const scene = home?.getAttribute("data-mobile-reference-scene") || "";
    const leadSelector = scene === "normal" ? ".ref-wan" : scene === "resource" ? ".ref-resources" : scene === "interfaces" ? ".ref-interfaces" : ".ref-facts";
    const lead = home?.querySelector(leadSelector);
    const controls = [...(topbar?.querySelectorAll(".ref-topbar__actions button") || [])].map((node) => {
      const rect = node.getBoundingClientRect();
      return { name: node.getAttribute("aria-label") || "", width: rect.width, height: rect.height };
    });
    const topbarRect = topbar?.getBoundingClientRect();
    const conclusionRect = conclusion?.getBoundingClientRect();
    const leadRect = lead?.getBoundingClientRect();
    const chart = home?.querySelector(".ref-chart svg");
    const content = home?.querySelector(".ref-content");
    const tabletWorkspace = home?.querySelector("[data-mobile-reference-tablet-workspace]");
    const tabletWorkspaceRect = tabletWorkspace?.getBoundingClientRect();
    const tabletWorkspaceButtons = [...(tabletWorkspace?.querySelectorAll("button") || [])].map((node) => {
      const rect = node.getBoundingClientRect();
      return { text: node.textContent?.trim() || "", width: rect.width, height: rect.height };
    });
    return {
      scene,
      evidenceMode: home?.getAttribute("data-evidence-mode") || "",
      navigationCount: navigation.length,
      navigationRect: navigationRect ? { left: navigationRect.left, top: navigationRect.top, right: navigationRect.right, bottom: navigationRect.bottom, width: navigationRect.width, height: navigationRect.height } : null,
      buttons,
      ownerCount: document.querySelectorAll("[data-mobile-reference-home]").length,
      retiredOwnerCount: document.querySelectorAll("[data-mobile-ikuai-overview], [data-mobile-inspection-overview], [data-mobile-flow-overview], [data-mobile-native-overview]").length,
      overflowX: Math.max(0, (document.scrollingElement?.scrollWidth || 0) - innerWidth),
      bodyText: home?.textContent || "",
      title: title?.textContent?.trim() || "",
      titleRect: title ? { width: title.getBoundingClientRect().width, height: title.getBoundingClientRect().height } : null,
      topbarRect: topbarRect ? { top: topbarRect.top, height: topbarRect.height } : null,
      controls,
      conclusion: conclusion?.textContent?.trim() || "",
      conclusionRect: conclusionRect ? { top: conclusionRect.top, bottom: conclusionRect.bottom } : null,
      leadText: lead?.textContent?.trim() || "",
      leadRect: leadRect ? { width: leadRect.width, height: leadRect.height, top: leadRect.top, bottom: leadRect.bottom } : null,
      metricCount: home?.querySelectorAll(".ref-rate").length || 0,
      resourceMeterCount: home?.querySelectorAll(".ref-resource").length || 0,
      interfaceRowCount: home?.querySelectorAll(".ref-interfaces > button").length || 0,
      recoveryActionCount: home?.querySelectorAll("[data-mobile-reference-recovery-actions] button").length || 0,
      interfaceOverflowAction: (() => {
        const action = home?.querySelector("[data-panel-interface-overflow]");
        const rect = action?.getBoundingClientRect();
        return action && rect ? {
          text: action.textContent?.trim() || "",
          width: rect.width,
          height: rect.height,
          scrollWidth: action.scrollWidth,
          scrollHeight: action.scrollHeight,
          whiteSpace: getComputedStyle(action).whiteSpace,
        } : null;
      })(),
      hasTrafficChart: Boolean(chart),
      chartAspect: chart?.getAttribute("preserveAspectRatio") || "",
      chartSeries: home?.querySelectorAll(".ref-chart .ref-chart__down, .ref-chart .ref-chart__up").length || 0,
      tabletWorkspaceRect: tabletWorkspaceRect ? { top: tabletWorkspaceRect.top, bottom: tabletWorkspaceRect.bottom, width: tabletWorkspaceRect.width, height: tabletWorkspaceRect.height } : null,
      tabletWorkspaceButtons,
      maxTextPx: Math.max(0, ...[...(home?.querySelectorAll("h1, h2, h3, b, strong, p, small, span, time") || [])].map((node) => Number.parseFloat(getComputedStyle(node).fontSize) || 0)),
      contentDisplay: content ? getComputedStyle(content).display : "",
    };
  });

  assert(state.navigationCount === 1, `${scenario[0]} must render one navigation owner`);
  if (viewport[0] === "landscape568") {
    const tabRows = new Set(state.buttons.map((button) => Math.round(button.top))).size;
    assert(state.navigationRect && state.navigationRect.width >= viewport[1] - 30 && state.navigationRect.bottom <= viewport[2] + 1 && tabRows === 1, `${scenario[0]} 568px landscape must retain one four-column bottom navigation row`);
    assert(state.contentDisplay !== "grid", `${scenario[0]} 568px landscape must retain the single-column phone content flow`);
  }
  if (viewport[0] === "tablet768") assert(state.navigationRect && state.navigationRect.left <= 1 && state.navigationRect.width <= 80 && state.navigationRect.height >= viewport[2] - 1, `${scenario[0]} tablet portrait must use the dedicated navigation rail`);
  assert(state.scene === scenario[2], `${scenario[0]} expected scene ${scenario[2]} but rendered ${state.scene}`);
  assert(state.buttons.length === 4 && state.buttons.map((item) => item.label).join("/") === "概览/网络/设备/日志", `${scenario[0]} must render the four accepted roots`);
  assert(state.buttons.every((item) => item.label && item.width >= 44 && item.height >= 44), `${scenario[0]} has an unlabeled or sub-44px root target`);
  assert(["current", "historical", "unavailable"].includes(state.evidenceMode), `${scenario[0]} has no evidence mode`);
  assert(state.ownerCount === 1 && state.retiredOwnerCount === 0, `${scenario[0]} must render only the reference owner`);
  assert(state.overflowX <= 1, `${scenario[0]} overflows horizontally by ${state.overflowX}px`);
  assert(state.topbarRect && state.topbarRect.top >= -1 && state.topbarRect.height >= 44, `${scenario[0]} lost the sticky mobile header`);
  assert(state.title && state.titleRect?.width > 0 && state.titleRect?.height > 0, `${scenario[0]} lost the page title`);
  assert(state.controls.length === 2 && state.controls.every((control) => control.name && control.width >= 44 && control.height >= 44), `${scenario[0]} lost refresh/more controls`);
  assert(state.conclusion && state.conclusionRect && state.conclusionRect.top < viewport[2], `${scenario[0]} lost the first-scan conclusion`);
  assert(state.leadText && state.leadRect?.width >= 44 && state.leadRect?.height >= 40, `${scenario[0]} lost the scene-specific evidence block`);
  assert(state.maxTextPx <= 30, `${scenario[0]} reintroduced an oversized hero at ${state.maxTextPx}px`);
  assert(!/undefined|null|NaN|Invalid Date/.test(state.bodyText), `${scenario[0]} exposes a bad literal`);
  if (viewport[0] === "tablet768") {
    const railWorkspace = scenario[2] === "interfaces";
    const outageWorkspace = scenario[2] === "outage";
    const minimumWidth = railWorkspace ? 240 : outageWorkspace ? 300 : 500;
    const maximumWidth = railWorkspace ? 320 : outageWorkspace ? 410 : Number.POSITIVE_INFINITY;
    const minimumBottom = outageWorkspace ? viewport[2] * 0.5 : viewport[2] * 0.62;
    assert(state.tabletWorkspaceRect && state.tabletWorkspaceRect.width >= minimumWidth && state.tabletWorkspaceRect.width <= maximumWidth && state.tabletWorkspaceRect.height >= 190, `${scenario[0]} tablet must expose a scene-appropriate task workspace instead of a mechanical two-column shell: ${JSON.stringify(state.tabletWorkspaceRect)}`);
    assert(state.tabletWorkspaceRect.bottom >= minimumBottom, `${scenario[0]} tablet task workspace must occupy its active first-screen region: ${JSON.stringify(state.tabletWorkspaceRect)}`);
    assert(state.tabletWorkspaceButtons.length === 4 && state.tabletWorkspaceButtons.every((item) => item.text && item.width >= 44 && item.height >= 44), `${scenario[0]} tablet task workspace must expose four real touch destinations`);
  }

  if (scenario[2] === "normal") {
    assert(state.metricCount === 2, "single current evidence must show atomic down/up observations");
    assert(/网络正常|默认路由/.test(state.conclusion), "single must state a bounded route fact");
    assert(state.hasTrafficChart && state.chartSeries === 2 && state.chartAspect !== "none", "single must render a two-series WAN chart without geometric stretching");
  } else if (scenario[2] === "resource") {
    assert(state.resourceMeterCount === 3 && !state.hasTrafficChart, "resource must replace WAN traffic with CPU, memory and disk rows");
  } else if (scenario[2] === "interfaces") {
    assert(state.interfaceRowCount > 0 && !state.hasTrafficChart, "interfaces must show affected objects without a current traffic chart");
    assert(/接口状态/.test(state.leadText) && !/受影响接口/.test(state.leadText), "mixed interface context must not be mislabelled as entirely affected");
    if (state.interfaceOverflowAction) {
      assert(state.interfaceOverflowAction.text.includes("查看全部"), "interface overflow action must retain its accepted label");
      assert(state.interfaceOverflowAction.whiteSpace === "nowrap", "interface overflow action must remain a single horizontal row");
      assert(state.interfaceOverflowAction.scrollWidth <= state.interfaceOverflowAction.width + 1 && state.interfaceOverflowAction.scrollHeight <= state.interfaceOverflowAction.height + 1, "interface overflow action must not wrap or clip");
    }
  } else {
    assert(state.metricCount === 0 && !state.hasTrafficChart, `${scenario[0]} must not expose current traffic metrics or chart`);
    if (scenario[0] === "all-offline") assert(/其他接口未运行/.test(state.bodyText) && !/(^|\s)未运行接口/.test(state.bodyText), "all-offline must not contradict offline WAN evidence with an ambiguous interface count");
    if (scenario[0] === "no-snapshot") assert(state.recoveryActionCount >= 2, "no-snapshot must expose real recovery destinations instead of ending in unused whitespace");
    if (scenario[0] === "collection-down") assert(/转发状态/.test(state.bodyText) && /未测量/.test(state.bodyText), "collection failure must distinguish the unmeasured forwarding plane from failed management collection");
  }

  const file = path.join(output, `${scenario[0]}-${viewport[0]}-overview.png`);
  await page.screenshot({ path: file, fullPage: false, animations: "disabled" });
  const png = decodePngIdentity(file);
  return {
    scenario: scenario[0],
    viewport: { id: viewport[0], width: viewport[1], height: viewport[2] },
    state,
    pass: true,
    file: path.relative(root, file).replace(/\\/g, "/"),
    sha256: png.sha256,
    png: { width: png.width, height: png.height, bytes: png.bytes, sha256: png.sha256 },
  };
}

async function checkInteraction(page, runtime) {
  await openHome(page, runtime, scenarios[0], viewports[0]);
  const detailTrigger = page.locator(".ref-card-link");
  const triggerBox = await detailTrigger.boundingBox();
  assert(Boolean(triggerBox && triggerBox.width >= 44 && triggerBox.height >= 40), "WAN detail trigger must be touch reachable");
  await detailTrigger.click();
  await page.locator("[data-mobile-reference-wan-detail]").waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  const detailScroll = page.locator("[data-mobile-reference-wan-detail] .ref-scroll");
  await detailScroll.evaluate((node) => node.scrollTo({ top: node.scrollHeight, behavior: "auto" }));
  const detailClearance = await page.evaluate(() => {
    const operation = document.querySelector("[data-mobile-reference-wan-detail] .ref-operation")?.getBoundingClientRect();
    const navigation = document.querySelector("[data-mobile-reference-navigation]")?.getBoundingClientRect();
    return operation && navigation ? { operationBottom: operation.bottom, navigationTop: navigation.top } : null;
  });
  assert(Boolean(detailClearance && detailClearance.operationBottom <= detailClearance.navigationTop - 4), "320px WAN detail action must remain clear of the fixed navigation dock");
  await page.screenshot({ path: path.join(output, "wan-detail-phone320.png"), fullPage: false, animations: "disabled" });
  await page.goBack({ waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  await page.locator("[data-mobile-reference-home]").waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await page.goForward({ waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  await page.locator("[data-mobile-reference-wan-detail]").waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });

  await openHome(page, runtime, scenarios[0], viewports[3]);
  await page.locator('[data-mobile-reference-navigation] button[data-section="lineStatus"]').click();
  const networkDirectory = page.locator("[data-mobile-reference-network-directory]");
  await networkDirectory.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await networkDirectory.locator(".ref-interfaces > button").filter({ hasText: "pppoe-wan1" }).first().click();
  await page.locator("[data-mobile-reference-wan-detail]").waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await page.goBack({ waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  await networkDirectory.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await page.locator('[data-mobile-reference-navigation] button[data-section="terminals"]').click();
  await page.locator('[data-mobile-reference-workspace="terminals"]').waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await page.locator('[data-mobile-reference-navigation] button[data-section="logs"]').click();
  await page.locator('[data-mobile-reference-workspace="logs"]').waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await page.locator('[data-mobile-reference-navigation] button[data-section="overview"]').click();
  await page.locator("[data-mobile-reference-home]").waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });

  await openHome(page, runtime, scenarios[0], viewports[3]);
  await page.locator('button[aria-label="打开更多工具"]').click();
  const directory = page.locator("[data-mobile-reference-directory]");
  await directory.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await directory.getByRole("button", { name: /RouterOS 连接/ }).click();
  const form = page.locator('[data-mobile-reference-connection="form"]');
  await form.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await form.getByLabel("地址", { exact: true }).fill("https://invalid.example");
  await form.getByLabel("用户名", { exact: true }).fill("observer");
  await form.locator('input[type="password"]').fill("not-sent");
  await form.locator('button[type="submit"]').click();
  const alert = form.locator('[role="alert"]');
  await alert.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  assert(/协议|地址|主机名/.test((await alert.textContent()) || ""), "connection must reject protocol-bearing addresses before a request");
  await form.getByRole("button", { name: "返回概览" }).click();
  await page.locator("[data-mobile-reference-directory]").waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });

  await openHome(page, runtime, scenarios[5], viewports[3]);
  await page.locator(".ref-resource").first().click();
  const resourceDetail = page.locator('[data-mobile-reference-workspace="trafficLoad"][data-mobile-reference-object-detail]:not([data-mobile-reference-object-detail="unavailable"])');
  await resourceDetail.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  assert(await page.locator('[data-mobile-reference-navigation] button[data-section="terminals"][aria-current="page"]').count() === 1, "resource detail must keep the Device root selected");

  await openHome(page, runtime, scenarios[6], viewports[3]);
  const interfaceTrigger = page.locator(".ref-interfaces > button:not(.ref-card-link)").first();
  await interfaceTrigger.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await interfaceTrigger.click();
  await page.waitForTimeout(100);
  const interfaceDetail = page.locator('[data-mobile-reference-interface-detail]');
  await interfaceDetail.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  assert(await interfaceDetail.getAttribute("data-mobile-reference-interface-detail") !== "unavailable", `interface detail could not resolve the selected object: ${(await page.locator("body").innerText()).slice(0, 1200)}`);
  assert((await page.locator('[data-mobile-reference-interface-detail] .ref-facts').count()) >= 2, "interface detail must expose interface facts and evidence source, not a generic empty shell");

  await page.goto(routeUrl(runtime.mock.url, "interfaces"), { waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  const interfaceWorkspace = page.locator('[data-mobile-reference-workspace="interfaces"]');
  await interfaceWorkspace.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  const initialInterfaceRows = await interfaceWorkspace.locator("[data-panel-object-row]").count();
  const workspaceSearch = interfaceWorkspace.locator('.ref-workspace-search input[type="search"]');
  await workspaceSearch.fill("ether9");
  await page.waitForTimeout(50);
  const searchedInterfaceRows = await interfaceWorkspace.locator("[data-panel-object-row]").count();
  const searchedInterfaceText = await interfaceWorkspace.locator("[data-panel-object-row]").allTextContents();
  assert(initialInterfaceRows > searchedInterfaceRows && searchedInterfaceRows > 0 && searchedInterfaceText.every((value) => /ether9/i.test(value)), `mobile workspace search must narrow the real interface object set: initial=${initialInterfaceRows} searched=${searchedInterfaceRows} rows=${JSON.stringify(searchedInterfaceText)}`);
  const filterSelect = interfaceWorkspace.locator(".ref-workspace-selects select").first();
  await filterSelect.selectOption("attention");
  assert(await interfaceWorkspace.locator("[data-panel-object-row]").count() === searchedInterfaceRows, "mobile workspace filter must apply to the searched object set without restoring unrelated rows");
  const sortSelect = interfaceWorkspace.locator(".ref-workspace-selects select").last();
  await sortSelect.selectOption("traffic-desc");
  assert(await sortSelect.inputValue() === "traffic-desc", "mobile workspace sort must expose and retain the selected real sort mode");
  await page.screenshot({ path: path.join(output, "interface-workspace-tools-phone390.png"), fullPage: false, animations: "disabled" });

  await openHome(page, runtime, scenarios[4], viewports[3]);
  await page.getByRole("button", { name: /检查采集连接/ }).click();
  const collectionConnection = page.locator('[data-mobile-reference-connection="form"]');
  await collectionConnection.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await collectionConnection.getByRole("button", { name: "返回概览" }).click();
  await page.locator("[data-mobile-reference-home]").waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });

  await openHome(page, runtime, scenarios[3], viewports[3]);
  const snapshotCallsBefore = runtime.mock.state.snapshotCalls;
  await page.getByRole("button", { name: /重新获取快照/ }).click();
  for (let attempt = 0; attempt < 20 && runtime.mock.state.snapshotCalls <= snapshotCallsBefore; attempt += 1) await page.waitForTimeout(50);
  assert(runtime.mock.state.snapshotCalls > snapshotCallsBefore, "no-snapshot recovery action must request a fresh snapshot");

  await openHome(page, runtime, scenarios[0], viewports[3]);
  // The accessible name intentionally changes while refreshing. Keep the
  // locator anchored to the stable busy-state contract so the post-click
  // assertion observes the same control instead of re-querying its old name.
  const refresh = page.locator('.ref-topbar button[aria-busy]').first();
  assert(await refresh.getAttribute("aria-label") === "刷新当前数据", "refresh control must expose its idle accessible name");
  await refresh.click();
  await page.waitForTimeout(100);
  assert(await refresh.getAttribute("aria-busy") !== null, "refresh control must expose aria-busy contract");

  return {
    wanDetailHistory: true,
    wanDetailShortPhoneClearance: true,
    fourRootNavigation: true,
    networkDirectory: true,
    networkWanDetail: true,
    moreDirectory: true,
    connectionAddressValidation: true,
    resourceDetail: true,
    resourceRootSelection: true,
    interfaceDetail: true,
    workspaceSearchFilterSort: true,
    collectionRecoveryAction: true,
    noSnapshotRecoveryAction: true,
    refreshFeedback: true,
  };
}

async function main() {
  if (process.platform === "win32" && process.env.CI !== "true") {
    assert(process.env.MOBILE_CPU_AFFINITY_ENFORCED === "1", "local Windows browser acceptance must use tools/run-mobile-reference-cell-low-load.cmd so Edge inherits one-core affinity");
  }
  try { os.setPriority(0, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch {}
  const runtimeStart = assertRuntimeLaunchContract(root);
  await waitForCpuBudget("runtime-launch");
  const identityStart = gitWorktreeIdentity(root);
  fs.mkdirSync(output, { recursive: true });
  const reportPath = path.join(output, "report.json");
  if (!append) {
    for (const name of fs.readdirSync(output)) {
      const item = path.join(output, name);
      if (fs.lstatSync(item).isFile() && (name.endsWith(".png") || name.endsWith(".json"))) fs.rmSync(item, { force: true });
    }
  }
  let previous = null;
  if (append && fs.existsSync(reportPath)) {
    previous = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    assert(sameIdentity(previous, identityStart), "append report identity does not match the current worktree");
    const recordedRuntimeErrors = validateRecordedRuntimeIdentity(previous.runtimeEnd, root);
    assert(recordedRuntimeErrors.length === 0, `historical runtime identity is invalid: ${recordedRuntimeErrors.join("; ")}`);
    assert(sameRuntimeCore(previous.runtimeEnd, runtimeStart), "append report runtime identity does not match this producer");
    assertAppendCellsAreFresh(previous);
  }
  const runtime = await launchRuntime({ cwd: root, viewport: { width: 390, height: 844 } });
  try {
    const newCells = [];
    const selectedScenarios = process.env.MOBILE_SCENARIO ? scenarios.filter(([id]) => id === process.env.MOBILE_SCENARIO) : scenarios;
    assert(selectedScenarios.length > 0, `unknown MOBILE_SCENARIO ${process.env.MOBILE_SCENARIO}`);
    const selectedViewports = process.env.MOBILE_VIEWPORT ? viewports.filter(([id]) => id === process.env.MOBILE_VIEWPORT) : viewports;
    assert(selectedViewports.length > 0, `unknown MOBILE_VIEWPORT ${process.env.MOBILE_VIEWPORT}`);
    const requiredTargets = scenarios.flatMap((scenario) => viewports.map((viewport) => [scenario, viewport]));
    const requestedTargets = selectedScenarios.flatMap((scenario) => selectedViewports.map((viewport) => [scenario, viewport]));
    const targets = smoke
      ? smokeCells.filter(([scenario, viewport]) => selectedScenarios.includes(scenario) && selectedViewports.includes(viewport))
      : requestedTargets;
    assert(targets.length > 0, "no mobile runtime cells were selected");
    for (const [scenario, viewport] of targets) {
      await waitForCpuBudget(`${scenario[0]}-${viewport[0]}`);
      process.stdout.write(`capture ${scenario[0]} ${viewport[0]}\n`);
      newCells.push(await captureCell(runtime.page, runtime, scenario, viewport));
    }
    const previousCells = Array.isArray(previous?.cells) ? previous.cells : [];
    const cellMap = new Map(previousCells.map((cell) => [`${cell.scenario}::${cell.viewport?.id}`, cell]));
    for (const cell of newCells) cellMap.set(`${cell.scenario}::${cell.viewport.id}`, cell);
    const requiredKeys = new Set(requiredTargets.map(([scenario, viewport]) => `${scenario[0]}::${viewport[0]}`));
    const cells = [...cellMap.entries()].filter(([key]) => requiredKeys.has(key)).map(([, cell]) => cell);
    if (!skipInteractions) await waitForCpuBudget("interaction-workflows");
    const workflows = skipInteractions ? (previous?.workflows || {}) : await checkInteraction(runtime.page, runtime);
    const identityEnd = gitWorktreeIdentity(root);
    const runtimeEnd = captureRuntimeIdentity(root);
    const runtimeFreshness = sameRuntimeIdentity(runtimeStart, runtimeEnd);
    const evidenceErrors = verifyCellEvidence(cells);
    const verifiedCellCount = cells.filter((cell) => cell?.pass === true && verifyCellPngEvidence(
      cell, root, viewportByIdentity.get(cell?.viewport?.id)?.[1], viewportByIdentity.get(cell?.viewport?.id)?.[2]
    ).length === 0).length;
    const runPass = newCells.length === targets.length
      && evidenceErrors.length === 0
      && runtimeFreshness
      && (skipInteractions || Object.values(workflows).length > 0 && Object.values(workflows).every(Boolean))
      && sameIdentity(identityStart, identityEnd);
    const fullCellSet = cells.length === requiredKeys.size && cells.every((cell) => requiredKeys.has(`${cell.scenario}::${cell.viewport?.id}`));
    const workflowNames = ["wanDetailHistory", "wanDetailShortPhoneClearance", "fourRootNavigation", "networkDirectory", "networkWanDetail", "moreDirectory", "connectionAddressValidation", "resourceDetail", "resourceRootSelection", "interfaceDetail", "workspaceSearchFilterSort", "collectionRecoveryAction", "noSnapshotRecoveryAction", "refreshFeedback"];
    const workflowsComplete = workflowNames.every((name) => workflows[name] === true);
    const smokePass = runPass;
    const complete = !smoke && fullCellSet && verifiedCellCount === requiredTargets.length && workflowsComplete && evidenceErrors.length === 0 && runtimeFreshness && sameIdentity(identityStart, identityEnd);
    const pass = complete;
    const evidenceEligible = Boolean(identityEnd.releaseEvidenceEligible) && pass && sameIdentity(identityStart, identityEnd);
    // Start every report fail-closed; only a fresh complete matrix may promote it.
    const report = {
      pass: false,
      smokePass: false,
      complete: false,
      releasePass: false,
      releaseEvidenceEligible: false,
      worktreeClean: identityEnd.worktreeClean,
      contract: "mobile-reference-runtime-v1",
      evidenceContract: "mobile-decoded-png-runtime-v1",
      source: "mobile-reference-runtime",
      generatedAt: new Date().toISOString(),
      commit: identityEnd.commit, artifactKey: identityEnd.artifactKey,
      worktreeFingerprint: identityEnd.worktreeFingerprint,
      reviewContentFingerprint: identityEnd.reviewContentFingerprint,
      freshness: sameIdentity(identityStart, identityEnd),
      runtimeFreshness,
      runtimeStart,
      runtimeEnd,
      evidenceErrors,
      outputDirectory: path.relative(root, output).replace(/\\/g, "/"),
      matrix: {
        commit: identityEnd.commit,
        worktreeClean: identityEnd.worktreeClean,
        worktreeFingerprint: identityEnd.worktreeFingerprint,
        artifactKey: identityEnd.artifactKey,
        releaseEvidenceEligible: evidenceEligible,
        required: requiredTargets.length,
        expectedThisRun: targets.length,
        completed: verifiedCellCount,
        failed: Math.max(0, requiredTargets.length - verifiedCellCount),
        remaining: Math.max(0, requiredTargets.length - verifiedCellCount),
        append,
        mode: smoke ? "smoke" : append ? "append" : "full",
        scenarioFilter: process.env.MOBILE_SCENARIO || null,
        viewportFilter: process.env.MOBILE_VIEWPORT || null,
        cpuLimitPercent: cpuLimit,
        affinityEnforced: process.env.MOBILE_CPU_AFFINITY_ENFORCED === "1",
      },
      cells, workflows,
    };
    report.pass = pass;
    report.smokePass = smokePass;
    report.complete = complete;
    report.releaseEvidenceEligible = evidenceEligible;
    report.matrix.releaseEvidenceEligible = evidenceEligible;
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ pass, runPass, complete, capturedThisRun: newCells.length, cells: cells.length, remaining: report.matrix.remaining, workflows, output }, null, 2));
    const partialRequest = append || Boolean(process.env.MOBILE_SCENARIO) || Boolean(process.env.MOBILE_VIEWPORT) || skipInteractions;
    if (!(smoke ? smokePass : partialRequest ? runPass : pass)) process.exitCode = 1;
  } finally {
    await closeRuntime(runtime);
  }
}

if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });

module.exports = { cpuLoadBetween, scenarios, viewports };
