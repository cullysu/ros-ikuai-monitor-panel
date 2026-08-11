"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  ACTION_TIMEOUT_MS,
  closeRuntime,
  launchRuntime,
  login,
  withTimeout,
} = require("../../acceptance/accessibility-v2/runtime");

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const CONTRACT = "optical-patrol-v1";
const DEFAULT_VIEWPORT = { id: "phone390", width: 390, height: 844 };
const ROOT = "[data-optical-patrol-root]";
const EXPANDED_CLAIM = `${ROOT} [data-optical-patrol-expanded-claim]`;
const CLAIM_CONTROL = `${ROOT} [data-optical-patrol-claim-control]`;
const ACTION = `${ROOT} [data-optical-patrol-action]`;
const ROUTE_TITLE = `${ROOT} [data-optical-patrol-route-title]`;
const EVIDENCE_BOUNDARY = `${ROOT} [data-optical-patrol-evidence-boundary]`;
const TRAFFIC_GEOMETRY = `${ROOT} [data-optical-patrol-traffic-geometry]`;
const RESOURCE_GEOMETRY = `${ROOT} [data-optical-patrol-resource-geometry]`;
const EVIDENCE_DECK = `${ROOT} [data-optical-patrol-evidence-deck]`;
const OVERFLOW_CONTROL = `${ROOT} [data-optical-patrol-overflow-control]`;
const OVERFLOW_CLAIM_CONTROL = `${ROOT} [data-optical-patrol-overflow-claim-control]`;

const SCENE_CASES = Object.freeze([
  { id: "single", mockScenario: "", expectedScene: "single", expectedKind: "route", evidenceMode: "current" },
  { id: "fleet", mockScenario: "fleet-coverage", expectedScene: "fleet", expectedKind: "route", evidenceMode: "current" },
  { id: "interfaces-down", mockScenario: "interfaces-down", expectedScene: "interfaces-down", expectedKind: "interface", evidenceMode: "current" },
  { id: "resource-full", mockScenario: "resource-full", expectedScene: "resource-full", expectedKind: "resource", evidenceMode: "current" },
  { id: "collection-down", mockScenario: "collection-down", expectedScene: "collection-down", expectedKind: "collection", withdrawsCurrent: true },
  { id: "all-offline", mockScenario: "all-offline", expectedScene: "all-offline", expectedKind: "wan", evidenceMode: "current" },
  { id: "no-snapshot", mockScenario: "no-snapshot", expectedScene: "no-snapshot", expectedKind: "evidence", evidenceMode: "unavailable", withdrawsCurrent: true },
]);

const GRID_VIEWPORTS = Object.freeze([
  DEFAULT_VIEWPORT,
  { id: "tablet768", width: 768, height: 1024 },
  { id: "phone320", width: 320, height: 568 },
  { id: "phone375", width: 375, height: 667 },
  { id: "phone430", width: 430, height: 932 },
  { id: "compact600", width: 600, height: 960 },
  { id: "landscape667", width: 667, height: 375 },
  { id: "landscape844", width: 844, height: 390 },
  { id: "tablet1199", width: 1199, height: 900 },
]);

const INITIAL_SCENE_IDS = Object.freeze(["single", "resource-full"]);
const INITIAL_VIEWPORT_IDS = Object.freeze(["phone390", "tablet768"]);

function assert(condition, message, detail = null) {
  if (condition) return;
  const error = new Error(message);
  error.detail = detail;
  throw error;
}

function serialiseError(error) {
  if (!error) return null;
  return {
    name: error.name || "Error",
    code: error.code || null,
    message: String(error.message || error),
    detail: error.detail || null,
    stack: String(error.stack || "").split("\n").slice(0, 10).join("\n"),
  };
}

function sceneCase(id) {
  const match = SCENE_CASES.find((candidate) => candidate.id === id);
  assert(match, `Unknown Optical Patrol scene: ${id}`);
  return match;
}

function viewportProfile(id) {
  const match = GRID_VIEWPORTS.find((candidate) => candidate.id === id);
  assert(match, `Unknown Optical Patrol viewport: ${id}`);
  return match;
}

function matrixCells({ full = false } = {}) {
  const scenes = full ? SCENE_CASES : INITIAL_SCENE_IDS.map(sceneCase);
  const viewports = full ? GRID_VIEWPORTS : INITIAL_VIEWPORT_IDS.map(viewportProfile);
  return scenes.flatMap((scene) => viewports.map((viewport) => ({ scene, viewport })));
}

function overviewUrl(baseUrl) {
  const target = new URL(baseUrl);
  target.searchParams.set("section", "overview");
  target.hash = "";
  return target.toString();
}

async function openOverview(runtime, scene, viewport = DEFAULT_VIEWPORT) {
  const descriptor = typeof scene === "string" ? sceneCase(scene) : scene;
  const { page, mock } = runtime;
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  mock.state.scenario = descriptor.mockScenario;
  await page.goto(overviewUrl(mock.url), {
    waitUntil: "domcontentloaded",
    timeout: ACTION_TIMEOUT_MS,
  });
  await page.locator(ROOT).waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await page.waitForFunction(
    ({ selector, expectedScenario, expectedScene }) => {
      const root = document.querySelector(selector);
      return root?.getAttribute("data-optical-patrol-scenario") === expectedScenario
        && root?.getAttribute("data-optical-patrol-scene") === expectedScene;
    },
    { selector: ROOT, expectedScenario: descriptor.id, expectedScene: descriptor.expectedScene },
    { timeout: ACTION_TIMEOUT_MS },
  );
  return inspectRoot(page);
}

async function startOpticalPatrolRuntime(options = {}) {
  const runtime = await launchRuntime({ viewport: DEFAULT_VIEWPORT, ...options });
  try {
    await login(runtime.page, runtime.mock.url);
    await openOverview(runtime, sceneCase("single"), DEFAULT_VIEWPORT);
    return runtime;
  } catch (error) {
    await closeRuntime(runtime).catch(() => {});
    throw error;
  }
}

async function inspectRoot(page) {
  return page.evaluate((selectors) => {
    const root = document.querySelector(selectors.root);
    const visible = (node) => {
      if (!(node instanceof HTMLElement)) return false;
      const style = getComputedStyle(node);
      const bounds = node.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && bounds.width > 0
        && bounds.height > 0;
    };
    const rect = (node) => {
      const bounds = node?.getBoundingClientRect();
      return bounds ? {
        left: bounds.left,
        top: bounds.top,
        right: bounds.right,
        bottom: bounds.bottom,
        width: bounds.width,
        height: bounds.height,
      } : null;
    };
    const visibleRect = (node) => {
      if (!(node instanceof HTMLElement)) return null;
      const bounds = node.getBoundingClientRect();
      let left = Math.max(0, bounds.left);
      let top = Math.max(0, bounds.top);
      let right = Math.min(innerWidth, bounds.right);
      let bottom = Math.min(innerHeight, bounds.bottom);
      let ancestor = node.parentElement;
      while (ancestor) {
        const style = getComputedStyle(ancestor);
        if (/(auto|scroll|hidden|clip)/.test(`${style.overflow} ${style.overflowX} ${style.overflowY}`)) {
          const clip = ancestor.getBoundingClientRect();
          left = Math.max(left, clip.left);
          top = Math.max(top, clip.top);
          right = Math.min(right, clip.right);
          bottom = Math.min(bottom, clip.bottom);
        }
        ancestor = ancestor.parentElement;
      }
      if (right <= left || bottom <= top) return null;
      return { left, top, right, bottom, width: right - left, height: bottom - top };
    };
    const label = (node) => (
      node?.getAttribute("aria-label")
      || node?.textContent
      || ""
    ).replace(/\s+/g, " ").trim();
    const control = (node, kind) => ({
      kind,
      id: node.id || "",
      claimId: node.getAttribute("data-optical-patrol-claim-id") || "",
      label: label(node),
      content: (node.textContent || "").replace(/\s+/g, " ").trim(),
      rect: rect(node),
      visibleRect: visibleRect(node),
      tag: node.tagName.toLowerCase(),
      type: node.getAttribute("type") || "",
      disabled: "disabled" in node ? Boolean(node.disabled) : false,
      ariaExpanded: node.getAttribute("aria-expanded"),
      ariaControls: node.getAttribute("aria-controls") || "",
      controlsTargetPresent: Boolean(node.getAttribute("aria-controls") && document.getElementById(node.getAttribute("aria-controls"))),
    });
    const focusAppearance = (node) => {
      if (!(node instanceof HTMLElement)) return null;
      const style = getComputedStyle(node);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: Number.parseFloat(style.outlineWidth) || 0,
        outlineOffset: Number.parseFloat(style.outlineOffset) || 0,
        boxShadow: style.boxShadow,
      };
    };
    const renderedLines = (node) => {
      if (!(node instanceof HTMLElement)) return [];
      const lines = [];
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      let textNode = walker.nextNode();
      while (textNode) {
        const value = textNode.nodeValue || "";
        for (let index = 0; index < value.length; index += 1) {
          const character = value[index];
          if (!character.trim()) continue;
          const range = document.createRange();
          range.setStart(textNode, index);
          range.setEnd(textNode, index + 1);
          const bounds = range.getBoundingClientRect();
          let line = lines.find((candidate) => Math.abs(candidate.top - bounds.top) <= 1.5);
          if (!line) {
            line = { top: bounds.top, text: "" };
            lines.push(line);
          }
          line.text += character;
        }
        textNode = walker.nextNode();
      }
      return lines.sort((left, right) => left.top - right.top).map((line) => line.text);
    };
    const selected = root?.querySelector(selectors.expandedClaim) || null;
    const selectedKind = selected?.getAttribute("data-optical-patrol-claim-kind") || "";
    const selectedTrafficGeometry = selected?.querySelector(selectors.trafficGeometry) || null;
    const selectedDecisiveGeometry = selectedKind === "resource"
      ? selected?.querySelector(selectors.resourceGeometry)
      : selectedKind === "route"
        ? selectedTrafficGeometry || selected?.querySelector(selectors.routeGeometry)
        : selected?.querySelector(selectors.relationship)
          || [...(selected?.querySelectorAll(".op__proof-rail") || [])].at(-1)
          || null;
    const actions = root
      ? [...root.querySelectorAll(selectors.action)].filter(visible)
      : [];
    const followups = root
      ? [...root.querySelectorAll(selectors.claimControl)].filter(visible)
      : [];
    const controls = [
      ...actions.map((node) => control(node, "object-action")),
      ...followups.map((node) => control(node, "claim-selection")),
    ];
    const evidenceBoundary = root?.querySelector(selectors.evidenceBoundary) || null;
    const routeTitle = root?.querySelector(selectors.routeTitle) || null;
    const evidenceDeck = root?.querySelector(selectors.evidenceDeck) || null;
    const navigation = document.querySelector(selectors.navigation);
    const overflowControl = root?.querySelector(selectors.overflowControl) || null;
    const overflowClaimControls = root
      ? [...root.querySelectorAll(selectors.overflowClaimControl)]
      : [];
    const scopeFacts = root
      ? [...root.querySelectorAll(`${selectors.scopeFacts} > div`)].filter(visible)
      : [];
    const evidenceDeckRows = evidenceDeck
      ? [...evidenceDeck.querySelectorAll("li")].filter(visible)
      : [];
    const documentWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth || 0,
    );
    const historySelection = window.history.state?.panelOpticalPatrol;
    return {
      viewport: { width: innerWidth, height: innerHeight },
      rootPresent: Boolean(root),
      rootRect: rect(root),
      scenario: root?.getAttribute("data-optical-patrol-scenario") || "",
      scene: root?.getAttribute("data-optical-patrol-scene") || "",
      scale: root?.getAttribute("data-optical-patrol-scale") || "",
      capability: root?.getAttribute("data-optical-patrol-capability") || "",
      risk: root?.getAttribute("data-optical-patrol-risk") || "",
      evidenceMode: root?.getAttribute("data-optical-patrol-evidence-mode") || "",
      forbidsCurrent: root?.getAttribute("data-optical-patrol-forbids-current") || "",
      runtimeManaged: root?.getAttribute("data-optical-patrol-runtime-managed") || "",
      overflowX: Math.max(0, documentWidth - innerWidth),
      selectedClaim: selected ? {
        id: selected.getAttribute("data-optical-patrol-expanded-claim") || "",
        domId: selected.id || "",
        kind: selected.getAttribute("data-optical-patrol-claim-kind") || "",
        text: label(selected),
        rect: rect(selected),
      } : null,
      selectedCriticalMeasurement: selectedTrafficGeometry ? {
        rect: rect(selectedTrafficGeometry),
        visibleRect: visibleRect(selectedTrafficGeometry),
        text: label(selectedTrafficGeometry),
      } : null,
      selectedDecisiveGeometry: selectedDecisiveGeometry ? {
        rect: rect(selectedDecisiveGeometry),
        visibleRect: visibleRect(selectedDecisiveGeometry),
        text: label(selectedDecisiveGeometry),
      } : null,
      followups: followups.map((node) => control(node, "claim-selection")),
      allFollowups: root
        ? [...root.querySelectorAll(selectors.claimControl)].map((node) => control(node, "claim-selection"))
        : [],
      overflowControl: overflowControl ? control(overflowControl, "overflow-expansion") : null,
      overflowClaimControls: overflowClaimControls.map((node) => control(node, "overflow-claim-selection")),
      controls,
      actionCount: actions.length,
      action: actions[0] ? control(actions[0], "object-action") : null,
      evidenceBoundary: evidenceBoundary ? {
        visible: visible(evidenceBoundary),
        rect: rect(evidenceBoundary),
      } : null,
      routeTitle: routeTitle ? {
        id: routeTitle.id || "",
        text: label(routeTitle),
        lines: renderedLines(routeTitle),
        focused: document.activeElement === routeTitle,
        rect: rect(routeTitle),
      } : null,
      navigation: navigation && visible(navigation) ? { rect: rect(navigation) } : null,
      scopeFacts: scopeFacts.map((node) => ({
        label: label(node.querySelector("dt")),
        value: label(node.querySelector("dd")),
        rect: rect(node),
      })),
      trafficGeometryCount: root
        ? [...root.querySelectorAll(selectors.trafficGeometry)].filter(visible).length
        : 0,
      resourceGeometryCount: root
        ? [...root.querySelectorAll(selectors.resourceGeometry)].filter(visible).length
        : 0,
      tabletEvidenceDeck: evidenceDeck ? {
        visible: visible(evidenceDeck),
        rect: rect(evidenceDeck),
        rows: evidenceDeckRows.map((node) => ({
          label: label(node.querySelector("small")),
          value: label(node.querySelector("strong")),
        })),
      } : null,
      text: label(root),
      historySelection: historySelection && typeof historySelection === "object" ? {
        version: historySelection.version,
        scope: historySelection.scope,
        selectedId: historySelection.selectedId,
      } : null,
      activeElement: {
        id: document.activeElement?.id || "",
        label: label(document.activeElement),
        focusAppearance: focusAppearance(document.activeElement),
      },
      scrollPosition: {
        windowY: window.scrollY,
        rootY: root?.scrollTop || 0,
      },
    };
  }, {
    root: ROOT,
    expandedClaim: "[data-optical-patrol-expanded-claim]",
    claimControl: "[data-optical-patrol-claim-control]",
    action: "[data-optical-patrol-action]",
    routeTitle: "[data-optical-patrol-route-title]",
    evidenceBoundary: "[data-optical-patrol-evidence-boundary]",
    trafficGeometry: "[data-optical-patrol-traffic-geometry]",
    resourceGeometry: "[data-optical-patrol-resource-geometry]",
    routeGeometry: "[data-optical-patrol-route-geometry]",
    relationship: "[data-optical-patrol-relationship]",
    evidenceDeck: "[data-optical-patrol-evidence-deck]",
    navigation: ".panel-task-navigation",
    scopeFacts: "[data-optical-patrol-scope-facts]",
    overflowControl: "[data-optical-patrol-overflow-control]",
    overflowClaimControl: "[data-optical-patrol-overflow-claim-control]",
  });
}

function claimDomId(claimId) {
  return `optical-claim-${encodeURIComponent(claimId)}`;
}

async function waitForSelectedClaim(page, claimId, { focused = false } = {}) {
  await page.waitForFunction(
    ({ selector, expected, expectedDomId, requireFocus }) => {
      const selected = document.querySelector(selector);
      if (selected?.getAttribute("data-optical-patrol-expanded-claim") !== expected) return false;
      return !requireFocus || document.activeElement?.id === expectedDomId;
    },
    {
      selector: EXPANDED_CLAIM,
      expected: claimId,
      expectedDomId: claimDomId(claimId),
      requireFocus: focused,
    },
    { timeout: ACTION_TIMEOUT_MS },
  );
}

async function waitForSelectedClaimChange(page, previousId) {
  await page.waitForFunction(
    ({ selector, previous }) => {
      const current = document.querySelector(selector)?.getAttribute("data-optical-patrol-expanded-claim");
      return Boolean(current && current !== previous);
    },
    { selector: EXPANDED_CLAIM, previous: previousId },
    { timeout: ACTION_TIMEOUT_MS },
  );
  const claimId = await page.locator(EXPANDED_CLAIM).getAttribute("data-optical-patrol-expanded-claim");
  assert(claimId, "Optical Patrol did not expose the newly selected claim id");
  await waitForSelectedClaim(page, claimId, { focused: true });
  return claimId;
}

function acceptanceDirectory(name = "optical-patrol-runtime") {
  const directory = path.join(REPO_ROOT, "_acceptance", name);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

function screenshotFilename(scene, viewport) {
  return `${scene.id}-${viewport.width}x${viewport.height}.png`;
}

async function captureOriginal(page, scene, viewport) {
  const directory = acceptanceDirectory(path.join("optical-patrol-runtime", "originals"));
  const screenshotPath = path.join(directory, screenshotFilename(scene, viewport));
  await page.screenshot({ path: screenshotPath, fullPage: false, animations: "disabled" });
  return screenshotPath;
}

function writeReport(report) {
  const reportPath = path.join(acceptanceDirectory(), "report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return reportPath;
}

async function runBounded(label, timeoutMs, task) {
  return withTimeout(label, task, timeoutMs);
}

module.exports = {
  ACTION,
  ACTION_TIMEOUT_MS,
  CLAIM_CONTROL,
  CONTRACT,
  DEFAULT_VIEWPORT,
  EVIDENCE_BOUNDARY,
  EVIDENCE_DECK,
  EXPANDED_CLAIM,
  GRID_VIEWPORTS,
  INITIAL_SCENE_IDS,
  INITIAL_VIEWPORT_IDS,
  REPO_ROOT,
  RESOURCE_GEOMETRY,
  ROOT,
  ROUTE_TITLE,
  SCENE_CASES,
  TRAFFIC_GEOMETRY,
  OVERFLOW_CLAIM_CONTROL,
  OVERFLOW_CONTROL,
  assert,
  captureOriginal,
  claimDomId,
  closeRuntime,
  inspectRoot,
  matrixCells,
  openOverview,
  runBounded,
  sceneCase,
  serialiseError,
  startOpticalPatrolRuntime,
  viewportProfile,
  waitForSelectedClaim,
  waitForSelectedClaimChange,
  writeReport,
};
