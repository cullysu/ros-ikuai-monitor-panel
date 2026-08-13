#!/usr/bin/env node
"use strict";

/*
 * Real-browser capability-boundary gate. It owns the browser session so a
 * stale report cannot make the responsive contract appear green.
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { verifyFrameworkAssetIdentity } = require("./framework-asset-identity");
const { gitWorktreeIdentity } = require("./worktree-runtime-identity");
const {
  ACTION_TIMEOUT_MS,
  closeRuntime,
  launchRuntime,
  login,
  withTimeout,
} = require("./acceptance/accessibility-v2/runtime");

const root = path.resolve(__dirname, "..");
const outputDirectory = path.join(root, "_acceptance", "responsive-boundary-current");
const reportPath = path.join(outputDirectory, "report.json");
const RUN_TIMEOUT_MS = 120_000;
const SCENARIO = "interfaces-down";
const BOUNDARIES = [
  { id: "phone-320", width: 320, height: 568, owner: "mobile", capability: "phone" },
  { id: "phone-390", width: 390, height: 844, owner: "mobile", capability: "phone" },
  { id: "phone-430", width: 430, height: 932, owner: "mobile", capability: "phone" },
  { id: "short-landscape-667", width: 667, height: 375, owner: "mobile", capability: "short-landscape" },
  { id: "tablet-768", width: 768, height: 1024, owner: "mobile", capability: "tablet" },
  { id: "short-landscape-844", width: 844, height: 390, owner: "mobile", capability: "short-landscape" },
  { id: "tablet-899", width: 899, height: 900, owner: "mobile", capability: "tablet" },
  { id: "tablet-900", width: 900, height: 900, owner: "mobile", capability: "tablet" },
  { id: "tablet-1199", width: 1199, height: 900, owner: "mobile", capability: "tablet" },
  { id: "desktop-1200", width: 1200, height: 900, owner: "desktop", capability: "desktop" },
];

function writeReport(report) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function readViewportPng(screenshotPath, boundary, capturedAt) {
  let bytes;
  try {
    bytes = fs.readFileSync(screenshotPath);
  } catch (error) {
    throw new Error(`responsive screenshot could not be read: ${screenshotPath}`, { cause: error });
  }
  assert(bytes.length >= 24, "responsive screenshot is not a readable PNG", { screenshotPath, bytes: bytes.length });
  const signature = "89504e470d0a1a0a";
  assert(bytes.subarray(0, 8).toString("hex") === signature, "responsive screenshot has an invalid PNG signature", { screenshotPath });
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  assert(width === boundary.width && height === boundary.height,
    "responsive screenshot dimensions do not match the browser viewport", {
      screenshotPath,
      expected: { width: boundary.width, height: boundary.height },
      actual: { width, height },
    });
  return {
    path: path.relative(root, screenshotPath).replaceAll("\\", "/"),
    viewport: { width, height },
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
    capturedAt,
  };
}

async function captureViewportScreenshot(page, boundary) {
  const screenshotPath = path.join(outputDirectory, `boundary-${boundary.id}.png`);
  const scroll = await resetViewportScroll(page);
  assert(scrollStateAtOrigin(scroll), "responsive screenshot was not captured from the initial scroll origin", { boundary, scroll });
  await page.screenshot({ path: screenshotPath, fullPage: false, animations: "disabled" });
  return {
    ...readViewportPng(screenshotPath, boundary, new Date().toISOString()),
    scroll,
  };
}

function serialiseError(error) {
  if (!error) return null;
  return {
    name: error.name || "Error",
    code: error.code || null,
    message: String(error.message || error),
    detail: error.detail || null,
    stack: String(error.stack || "").split("\n").slice(0, 12).join("\n"),
  };
}

function assert(condition, message, detail = null) {
  if (condition) return;
  const error = new Error(message);
  error.detail = detail;
  throw error;
}

function scrollStateAtOrigin(scroll) {
  if (!scroll) return false;
  return [
    scroll.window?.left,
    scroll.window?.top,
    scroll.document?.left,
    scroll.document?.top,
    scroll.activeRoot?.left,
    scroll.activeRoot?.top,
    scroll.panelApp?.left,
    scroll.panelApp?.top,
  ].every((value) => Math.abs(Number(value || 0)) <= 1);
}

async function resetViewportScroll(page) {
  return page.evaluate(async () => {
    const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const activeRoot = document.querySelector("[data-incident-lens-root], [data-desktop-overview]");
    const panelApp = document.querySelector(".panel-app");
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    for (const node of new Set([
      document.scrollingElement,
      document.documentElement,
      document.body,
      panelApp,
      activeRoot,
    ])) {
      if (!(node instanceof Element)) continue;
      node.scrollLeft = 0;
      node.scrollTop = 0;
    }
    await settle();

    const position = (node) => node instanceof Element
      ? { left: node.scrollLeft, top: node.scrollTop }
      : null;
    return {
      window: { left: window.scrollX, top: window.scrollY },
      document: position(document.scrollingElement),
      activeRoot: position(activeRoot),
      panelApp: position(panelApp),
    };
  });
}

function overviewUrl(baseUrl) {
  const url = new URL(baseUrl);
  url.searchParams.set("section", "overview");
  url.hash = "";
  return url.toString();
}

async function inspectOverview(page) {
  return page.evaluate(() => {
    const visible = (node) => {
      if (!(node instanceof HTMLElement)) return false;
      const style = getComputedStyle(node);
      const value = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && value.width > 0 && value.height > 0;
    };
    const rect = (node) => {
      if (!(node instanceof Element)) return null;
      const value = node.getBoundingClientRect();
      return {
        left: value.left,
        top: value.top,
        right: value.right,
        bottom: value.bottom,
        width: value.width,
        height: value.height,
      };
    };
    const name = (node) => (node?.getAttribute("aria-label") || node?.textContent || "")
      .replace(/\s+/g, " ").trim();
    const overlaps = (left, right) => Boolean(left && right && (
      left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top
    ));
    const mobile = document.querySelector("[data-incident-lens-root]");
    const desktop = document.querySelector("[data-desktop-overview]");
    const activeMobile = visible(mobile) ? mobile : null;
    const activeDesktop = visible(desktop) ? desktop : null;
    const owner = activeMobile ? "mobile" : activeDesktop ? "desktop" : "missing";
    const rootNode = activeMobile || activeDesktop;
    const controls = rootNode
      ? [...rootNode.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary")]
        .filter(visible)
        .map((node) => ({
          id: node.id || "",
          tag: node.tagName.toLowerCase(),
          kind: node.hasAttribute("data-incident-lens-action")
            ? "selected-action"
            : node.hasAttribute("data-incident-lens-claim-control")
              ? "follow-up-claim"
              : "other",
          label: name(node),
          rect: rect(node),
          clippedWithinSelf: node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1,
        }))
      : [];
    const expanded = activeMobile?.querySelector("[data-incident-lens-expanded-claim]") || null;
    const claimControls = activeMobile
      ? [...activeMobile.querySelectorAll("[data-incident-lens-claim-control]")].filter(visible).map((node) => ({
        tag: node.tagName.toLowerCase(),
        type: node.getAttribute("type") || "",
        pressed: node.getAttribute("aria-pressed"),
        label: name(node),
        rect: rect(node),
      }))
      : [];
    const evidenceDeck = activeMobile?.querySelector("[data-incident-lens-evidence-deck]") || null;
    const evidenceBoundary = activeMobile?.querySelector("[data-incident-lens-evidence-boundary]") || null;
    const action = activeMobile?.querySelector("[data-incident-lens-action]") || null;
    const navigation = document.querySelector(".panel-task-navigation");
    const navigationRect = visible(navigation) ? rect(navigation) : null;
    const navigationIntersections = navigationRect
      ? controls
        .filter((control) => overlaps(control.rect, navigationRect))
        .map((control) => ({ kind: control.kind, label: control.label, rect: control.rect }))
      : [];

    return {
      url: location.href,
      viewport: { width: innerWidth, height: innerHeight },
      canonical: {
        section: new URLSearchParams(location.search).get("section"),
        hash: location.hash,
      },
      owner,
      activeOwners: Number(Boolean(activeMobile)) + Number(Boolean(activeDesktop)),
      rootPresent: Boolean(rootNode),
      hiddenLegacyOwner: Boolean(document.querySelector("[data-pocket-console-root]")),
      risk: activeMobile?.getAttribute("data-incident-lens-risk") || activeDesktop?.getAttribute("data-desktop-overview-risk") || null,
      capability: activeMobile?.getAttribute("data-incident-lens-capability") || (activeDesktop ? "desktop" : null),
      evidenceMode: activeMobile?.getAttribute("data-incident-lens-evidence-mode") || activeDesktop?.getAttribute("data-desktop-evidence-mode") || null,
      scenario: activeMobile?.getAttribute("data-incident-lens-scene") || activeDesktop?.getAttribute("data-desktop-overview-scenario") || null,
      overflowX: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      controls,
      claimControls,
      selectedClaim: expanded?.getAttribute("data-incident-lens-expanded-claim") || null,
      expandedClaim: expanded ? {
        id: expanded.id || "",
        name: name(expanded),
        tabIndex: expanded.getAttribute("tabindex"),
        rect: rect(expanded),
      } : null,
      evidenceBoundary: evidenceBoundary ? { name: name(evidenceBoundary), rect: rect(evidenceBoundary) } : null,
      action: action ? { name: name(action), tag: action.tagName.toLowerCase(), rect: rect(action) } : null,
      actionObscured: Boolean(action && navigationRect && overlaps(rect(action), navigationRect)),
      evidenceDeck: visible(evidenceDeck) ? rect(evidenceDeck) : null,
      navigation: navigationRect,
      navigationIntersections,
      scroll: {
        window: { left: window.scrollX, top: window.scrollY },
        document: document.scrollingElement
          ? { left: document.scrollingElement.scrollLeft, top: document.scrollingElement.scrollTop }
          : null,
        activeRoot: rootNode ? { left: rootNode.scrollLeft, top: rootNode.scrollTop } : null,
        panelApp: document.querySelector(".panel-app")
          ? {
              left: document.querySelector(".panel-app").scrollLeft,
              top: document.querySelector(".panel-app").scrollTop,
            }
          : null,
      },
    };
  });
}

async function inspectClaimControlReachability(page) {
  return page.evaluate(async () => {
    const action = document.querySelector("[data-incident-lens-action]");
    const claims = [...document.querySelectorAll("[data-incident-lens-claim-control]")]
      .filter((node) => node instanceof HTMLElement && !node.closest("[hidden]") && node.getClientRects().length > 0);
    const controls = [action, ...claims].filter((node) => node instanceof HTMLElement);
    const navigation = document.querySelector(".panel-task-navigation");
    const scrollNodes = [...new Set([
      document.scrollingElement,
      document.documentElement,
      document.body,
      document.querySelector(".panel-app"),
      document.querySelector("[data-incident-lens-root]"),
    ])].filter((node) => node instanceof Element);
    const startWindow = { left: window.scrollX, top: window.scrollY };
    const startPositions = scrollNodes.map((node) => ({ node, left: node.scrollLeft, top: node.scrollTop }));
    const rows = [];
    const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    for (const control of controls) {
      control.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
      await settle();
      const box = control.getBoundingClientRect();
      const navigationBox = navigation?.getBoundingClientRect() || null;
      const unobscured = !navigationBox
        || box.right <= navigationBox.left - 1
        || box.left >= navigationBox.right + 1
        || box.bottom <= navigationBox.top - 1
        || box.top >= navigationBox.bottom + 1;
      const x = Math.max(0, Math.min(innerWidth - 1, box.left + Math.min(box.width / 2, 28)));
      const y = Math.max(0, Math.min(innerHeight - 1, box.top + Math.min(box.height / 2, 28)));
      const hit = document.elementFromPoint(x, y);
      rows.push({
        kind: control.hasAttribute("data-incident-lens-action") ? "action" : "claim",
        label: control.getAttribute("aria-label") || control.textContent?.trim() || "",
        unobscured,
        hit: Boolean(hit && (hit === control || control.contains(hit))),
        rect: { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height },
      });
    }
    window.scrollTo({ top: startWindow.top, left: startWindow.left, behavior: "auto" });
    for (const position of startPositions) {
      position.node.scrollLeft = position.left;
      position.node.scrollTop = position.top;
    }
    await settle();
    return rows;
  });
}

async function openOverview(runtime, boundary, scenario = SCENARIO) {
  const { page, mock } = runtime;
  await page.setViewportSize({ width: boundary.width, height: boundary.height });
  mock.state.scenario = scenario === "single" ? "" : scenario;
  await page.goto(overviewUrl(mock.url), { waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  await page.waitForFunction(
    ({ expectedScenario, expectedOwner }) => {
      const rootNode = document.querySelector("[data-incident-lens-root], [data-desktop-overview]");
      if (!rootNode) return false;
      const mobile = rootNode.hasAttribute("data-incident-lens-root");
      const actualOwner = mobile ? "mobile" : "desktop";
      const actualScenario = rootNode.getAttribute("data-incident-lens-scene") || rootNode.getAttribute("data-desktop-overview-scenario") || "";
      return actualOwner === expectedOwner && actualScenario === expectedScenario;
    },
    { expectedScenario: scenario, expectedOwner: boundary.owner },
    { timeout: ACTION_TIMEOUT_MS },
  );
  const initialScroll = await resetViewportScroll(page);
  assert(scrollStateAtOrigin(initialScroll), "responsive cell did not start at the initial scroll origin", { boundary, initialScroll });
  let cell = await inspectOverview(page);
  if (boundary.owner === "mobile" && boundary.capability === "phone") {
    const claimControlReachability = await inspectClaimControlReachability(page);
    const restoredScroll = await resetViewportScroll(page);
    assert(scrollStateAtOrigin(restoredScroll), "phone reachability probe did not restore the initial scroll origin", {
      boundary,
      restoredScroll,
    });
    cell = await inspectOverview(page);
    cell.claimControlReachability = claimControlReachability;
    cell.scrollRestoration = restoredScroll;
  }
  return cell;
}

function assertCoreCell(cell, boundary, expectedScenario = SCENARIO) {
  assert(cell.rootPresent, "overview surface did not render", cell);
  assert(cell.owner === boundary.owner, `unexpected render owner at ${boundary.id}: expected ${boundary.owner}, got ${cell.owner}`, cell);
  assert(cell.capability === boundary.capability,
    `unexpected responsive capability at ${boundary.id}: expected ${boundary.capability}, got ${cell.capability}`, cell);
  assert(cell.activeOwners === 1, "overview must expose one active render owner", cell);
  assert(!cell.hiddenLegacyOwner, "active overview retained a hidden Pocket Console owner", cell);
  assert(cell.canonical.section === "overview" && cell.canonical.hash === "", "overview URL is not canonical", cell);
  assert(cell.scenario === expectedScenario, "scenario semantics did not settle", cell);
  assert(cell.risk && cell.evidenceMode, "surface omitted risk or evidence semantics", cell);
  assert(scrollStateAtOrigin(cell.scroll), "responsive geometry was inspected away from the initial scroll origin", cell);
  assert(cell.overflowX <= 1, "surface introduced horizontal overflow", cell);
  assert(cell.controls.some((control) => control.label), "surface exposed no named interactive control", cell);
  const clipped = cell.controls.filter((control) => (
    control.clippedWithinSelf
    || !control.rect
    || control.rect.left < -1
    || control.rect.right > cell.viewport.width + 1
    || control.rect.width <= 0
    || control.rect.height <= 0
  ));
  assert(clipped.length === 0, "surface exposed clipped or off-canvas controls", { clipped, cell });
}

function assertIncidentLensCell(cell, boundary, expectedScenario = SCENARIO) {
  assertCoreCell(cell, boundary, expectedScenario);
  assert(cell.evidenceBoundary?.name, "Incident Split Lens omitted its named evidence boundary", cell);
  assert(cell.selectedClaim && cell.expandedClaim, "Incident Split Lens omitted its expanded selected claim", cell);
  assert(
    cell.expandedClaim.id === `incident-lens-claim-${encodeURIComponent(cell.selectedClaim)}` &&
      cell.expandedClaim.tabIndex === "-1" && cell.expandedClaim.name,
    "expanded claim does not satisfy the stable history/focus/label contract",
    cell,
  );
  assert(cell.claimControls.length > 0 && cell.claimControls.every((control) => (
    control.tag === "button"
      && control.type === "button"
      && ["true", "false"].includes(control.pressed)
      && control.label
  )), "follow-up claims must remain named native buttons without false toggle semantics", cell);
  assert(cell.action?.name && ["button", "a"].includes(cell.action.tag), "selected claim omitted its native object-bound action", cell);
  const undersized = cell.controls.filter((control) => control.rect && (control.rect.width < 44 || control.rect.height < 44));
  assert(undersized.length === 0, "Incident Split Lens exposed a touch target below 44x44px", { undersized, cell });
  if (boundary.capability === "phone") {
    assert(!cell.actionObscured
      && cell.action.rect.top >= 0
      && cell.action.rect.bottom <= (cell.navigation?.top ?? cell.viewport.height),
    "selected claim action must be initially visible and clear of the floating navigation", cell);
    const actionReachability = (cell.claimControlReachability || []).find((control) => control.kind === "action");
    assert(actionReachability?.unobscured && actionReachability.hit,
      "selected claim action cannot be scrolled clear of the floating navigation and activated", { actionReachability, cell });
  } else {
    assert(!cell.actionObscured && cell.action.rect.top >= 0 && cell.action.rect.bottom <= cell.viewport.height,
      "selected claim action must remain initially visible and clear of task navigation", cell);
  }
  const unreachable = (cell.claimControlReachability || []).filter((control) => control.kind === "claim" && (!control.unobscured || !control.hit));
  assert(unreachable.length === 0, "a follow-up claim cannot be scrolled above the floating navigation and activated", { unreachable, cell });

}

function assertSemanticContinuity(left, right, label) {
  assert(left && right, `${label} cells are unavailable for semantic comparison`, { left, right });
  assert(left.risk === right.risk && left.evidenceMode === right.evidenceMode && left.scenario === right.scenario,
    `${label} changed risk or evidence semantics`, { left, right });
}

async function waitForSelectedClaim(page, claimId) {
  await page.waitForFunction(
    (expectedId) => document.querySelector("[data-incident-lens-expanded-claim]")?.getAttribute("data-incident-lens-expanded-claim") === expectedId,
    claimId,
    { timeout: ACTION_TIMEOUT_MS },
  );
}

async function inspectSelectionPersistence(runtime) {
  const { page } = runtime;
  const tablet768 = BOUNDARIES.find((boundary) => boundary.id === "tablet-768");
  const start = await openOverview(runtime, tablet768, "single");
  assertIncidentLensCell(start, tablet768, "single");
  const previousId = start.selectedClaim;
  const nextControl = page.locator("[data-incident-lens-claim-control]").first();
  await nextControl.waitFor({ timeout: ACTION_TIMEOUT_MS });
  await nextControl.click();
  await page.waitForFunction(
    (oldId) => {
      const selected = document.querySelector("[data-incident-lens-expanded-claim]")?.getAttribute("data-incident-lens-expanded-claim") || "";
      return Boolean(selected && selected !== oldId);
    },
    previousId,
    { timeout: ACTION_TIMEOUT_MS },
  );
  const selectedId = await page.locator("[data-incident-lens-expanded-claim]").getAttribute("data-incident-lens-expanded-claim");
  assert(selectedId, "claim selection did not expose a stable selected id", { previousId });

  const cells = {};
  for (const id of ["tablet-768", "tablet-899", "tablet-900", "tablet-1199"]) {
    const boundary = BOUNDARIES.find((candidate) => candidate.id === id);
    await page.setViewportSize({ width: boundary.width, height: boundary.height });
    await waitForSelectedClaim(page, selectedId);
    const cell = await inspectOverview(page);
    assertIncidentLensCell(cell, boundary, "single");
    assert(cell.selectedClaim === selectedId, `selected claim did not persist at ${id}`, cell);
    cells[id] = cell;
  }

  const desktopBoundary = BOUNDARIES.find((boundary) => boundary.id === "desktop-1200");
  await page.setViewportSize({ width: desktopBoundary.width, height: desktopBoundary.height });
  await page.locator("[data-desktop-overview]").waitFor({ timeout: ACTION_TIMEOUT_MS });
  const desktop = await inspectOverview(page);
  assertCoreCell(desktop, desktopBoundary, "single");
  const historySelection = await page.evaluate(() => history.state?.panelIncidentLens || null);
  assert(historySelection?.version === 1 && historySelection.selectedId === selectedId,
    "desktop capability transition discarded versioned Incident Split Lens selection state", { selectedId, historySelection, desktop });

  const tablet1199 = BOUNDARIES.find((boundary) => boundary.id === "tablet-1199");
  await page.setViewportSize({ width: tablet1199.width, height: tablet1199.height });
  await page.locator("[data-incident-lens-root]").waitFor({ timeout: ACTION_TIMEOUT_MS });
  await waitForSelectedClaim(page, selectedId);
  const restored = await inspectOverview(page);
  assertIncidentLensCell(restored, tablet1199, "single");
  assert(restored.selectedClaim === selectedId, "Incident Split Lens did not restore selection after returning from desktop", restored);

  return { previousId, selectedId, cells, desktop, restored, historySelection };
}

async function main() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const startedAt = Date.now();
  const frameworkAssetIdentity = verifyFrameworkAssetIdentity(root);
  const gitIdentity = gitWorktreeIdentity(root);
  const identityPass = !gitIdentity.identityError && gitIdentity.commit !== "unknown";
  const checks = [];
  const cells = {};
  let runtime = null;
  try {
    runtime = await launchRuntime({ viewport: { width: 390, height: 844 } });
    await login(runtime.page, runtime.mock.url);

    for (const boundary of BOUNDARIES) {
      try {
        const evidence = await openOverview(runtime, boundary);
        const screenshot = await captureViewportScreenshot(runtime.page, boundary);
        if (boundary.owner === "mobile") assertIncidentLensCell(evidence, boundary);
        else assertCoreCell(evidence, boundary);
        cells[boundary.id] = { pass: true, expectedOwner: boundary.owner, evidence, screenshot };
      } catch (error) {
        cells[boundary.id] = { pass: false, expectedOwner: boundary.owner, error: serialiseError(error) };
      }
    }
    checks.push({ name: "active owner, Incident Split Lens capabilities, safe navigation, and boundary geometry", pass: Object.values(cells).every((cell) => cell.pass), cells });

    try {
      assertSemanticContinuity(cells["tablet-899"]?.evidence, cells["tablet-900"]?.evidence, "899/900");
      assertSemanticContinuity(cells["tablet-1199"]?.evidence, cells["desktop-1200"]?.evidence, "1199/1200");
      checks.push({ name: "risk and evidence semantics remain continuous", pass: true });
    } catch (error) {
      checks.push({ name: "risk and evidence semantics remain continuous", pass: false, error: serialiseError(error) });
    }

    try {
      checks.push({ name: "versioned selected claim persists across 768/899/900/1199/1200 capability changes", pass: true, evidence: await inspectSelectionPersistence(runtime) });
    } catch (error) {
      checks.push({ name: "versioned selected claim persists across 768/899/900/1199/1200 capability changes", pass: false, error: serialiseError(error) });
    }
  } catch (error) {
    checks.push({ name: "bounded browser runtime", pass: false, error: serialiseError(error) });
  } finally {
    if (runtime) {
      try {
        await closeRuntime(runtime);
      } catch (error) {
        checks.push({ name: "bounded browser cleanup", pass: false, error: serialiseError(error) });
      }
    }
  }

  const browserPass = checks.length > 0 && checks.every((check) => check.pass !== false);
  const report = {
    pass: frameworkAssetIdentity.pass && identityPass && browserPass,
    contract: "responsive-incident-split-lens-boundary-runtime-v1",
    source: "responsive-incident-split-lens-boundary-runtime",
    commit: gitIdentity.commit,
    worktreeFingerprint: gitIdentity.worktreeFingerprint,
    artifactKey: gitIdentity.artifactKey,
    worktreeClean: gitIdentity.worktreeClean,
    releaseEvidenceEligible: gitIdentity.releaseEvidenceEligible,
    gitWorktreeIdentity: gitIdentity,
    generatedAt: new Date().toISOString(),
    frameworkAssetIdentity,
    runtime: {
      scenario: SCENARIO,
      boundaries: BOUNDARIES,
      screenshotMode: "viewport",
      screenshots: Object.values(cells).map((cell) => cell.screenshot).filter(Boolean),
      timeoutMs: RUN_TIMEOUT_MS,
      actionTimeoutMs: ACTION_TIMEOUT_MS,
      lifecycle: "accessibility-v2 managed browser with owned-process cleanup",
    },
    checks,
    elapsedMs: Date.now() - startedAt,
  };
  writeReport(report);
  process.stdout.write(`${JSON.stringify({
    pass: report.pass,
    reportPath,
    frameworkAssetIdentityPass: frameworkAssetIdentity.pass,
    gitWorktreeIdentityPass: identityPass,
    browserPass,
    screenshots: report.runtime.screenshots.length,
    elapsedMs: report.elapsedMs,
  }, null, 2)}\n`);
  if (!report.pass) process.exitCode = 1;
}

withTimeout("responsive Incident Split Lens boundary runtime", main, RUN_TIMEOUT_MS).catch((error) => {
  const gitIdentity = gitWorktreeIdentity(root);
  const report = {
    pass: false,
    contract: "responsive-incident-split-lens-boundary-runtime-v1",
    source: "responsive-incident-split-lens-boundary-runtime",
    commit: gitIdentity.commit,
    worktreeFingerprint: gitIdentity.worktreeFingerprint,
    artifactKey: gitIdentity.artifactKey,
    worktreeClean: gitIdentity.worktreeClean,
    releaseEvidenceEligible: gitIdentity.releaseEvidenceEligible,
    gitWorktreeIdentity: gitIdentity,
    generatedAt: new Date().toISOString(),
    error: serialiseError(error),
  };
  writeReport(report);
  process.stderr.write(`${JSON.stringify({ pass: false, reportPath, error: report.error }, null, 2)}\n`);
  process.exitCode = 1;
});
