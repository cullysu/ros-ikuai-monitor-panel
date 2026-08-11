#!/usr/bin/env node
"use strict";

// A separate proof from CDP page-scale and injected CSS: this headed Edge run
// uses Windows UI Automation, then verifies each physical toolbar increment
// from the page's real DPR and layout viewport before accepting it.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const { gitWorktreeIdentity } = require("./worktree-runtime-identity");
const {
  ACTION_TIMEOUT_MS,
  closeRuntime,
  launchRuntime,
  login,
  visitRoute,
  withTimeout,
} = require("./acceptance/accessibility-v2/runtime");

const root = path.resolve(__dirname, "..");
const artifactDir = path.join(root, "_acceptance", "edge-toolbar-zoom200");
const reportPath = path.join(artifactDir, "report.json");
const pythonHelper = path.join(root, "tools", "acceptance", "accessibility-v2", "windows_browser_zoom.py");
const RATIO_TOLERANCE = 0.12;
const UI_TIMEOUT_MS = 60_000;
const UI_ACTION_TIMEOUT_MS = 15_000;
const GEOMETRY_TRANSITION_TIMEOUT_MS = 3_500;
const CELL_TIMEOUT_MS = 100_000;
const GLOBAL_TIMEOUT_MS = 45 * 60_000;
const TOOLBAR_INCREMENTS = 5;
const TOOLBAR_SCENARIOS = Object.freeze(["normal", "interfaces-down"]);
const TOOLBAR_CANONICAL_OVERVIEW_SCENARIOS = Object.freeze([
  "normal",
  "fleet",
  "all-offline",
  "no-snapshot",
  "collection-down",
  "resource-full",
  "interfaces-down-overview",
]);
const KEYBOARD_ZOOM_ACTIONS = Object.freeze(["oem-plus", "numpad-plus"]);
const OWNED_LIFECYCLE_DIAGNOSTIC = "tools/acceptance/browser-lifecycle-v2/.artifacts/latest-report.json";
const OWNED_TOOLBAR_ARTIFACT_PREFIX = "_acceptance/edge-toolbar-zoom200/";

// The browser is opened at double the target CSS viewport.  After the real
// Edge toolbar operation (Ctrl+0, then five Ctrl++ commands), Edge reports
// DPR≈2 and the target CSS viewport below.  This is deliberately a bounded
// matrix: it is not a claim about OS text-size settings or Dynamic Type.
const TOOLBAR_200_MATRIX = Object.freeze([
  { id: "phone-320", cssViewport: { width: 320, height: 568 }, orientation: "portrait" },
  { id: "phone-360", cssViewport: { width: 360, height: 800 }, orientation: "portrait" },
  { id: "phone-375", cssViewport: { width: 375, height: 667 }, orientation: "portrait" },
  { id: "phone-390", cssViewport: { width: 390, height: 844 }, orientation: "portrait" },
  { id: "phone-430", cssViewport: { width: 430, height: 932 }, orientation: "portrait" },
  { id: "tablet-768", cssViewport: { width: 768, height: 1024 }, orientation: "portrait" },
  { id: "landscape-667x375", cssViewport: { width: 667, height: 375 }, orientation: "landscape" },
  { id: "landscape-844x390", cssViewport: { width: 844, height: 390 }, orientation: "landscape" },
]);
const TOOLBAR_200_REQUIRED_CELLS = Object.freeze(TOOLBAR_200_MATRIX.flatMap((viewport) => [
  ...TOOLBAR_SCENARIOS.map((scenario) => Object.freeze({ viewport, scenario })),
  ...(viewport.id === "phone-390"
    ? TOOLBAR_CANONICAL_OVERVIEW_SCENARIOS.slice(1).map((scenario) => Object.freeze({ viewport, scenario }))
    : []),
]));

function toolbarScenarioConfig(scenario) {
  if (scenario === "normal") return { fixtureScenario: "single", route: "overview", surface: "overview", runtimePhase: "current" };
  if (scenario === "interfaces-down") return { fixtureScenario: "interfaces-down", route: "interfaces", surface: "route", runtimePhase: "current" };
  if (scenario === "interfaces-down-overview") return { fixtureScenario: "interfaces-down", route: "overview", surface: "overview", runtimePhase: "current" };
  if (TOOLBAR_CANONICAL_OVERVIEW_SCENARIOS.includes(scenario)) {
    return { fixtureScenario: scenario, route: "overview", surface: "overview", runtimePhase: scenario === "no-snapshot" ? "error" : "current" };
  }
  throw new Error(`Unsupported real Edge toolbar scenario: ${scenario}`);
}

function assert(condition, message, detail = null) {
  if (condition) return;
  const error = new Error(message);
  error.detail = detail;
  throw error;
}

function errorDetail(error) {
  return { name: error?.name || "Error", code: error?.code || null, message: String(error?.message || error) };
}

function sameIdentity(left, right) {
  return left && right && left.commit === right.commit && left.worktreeFingerprint === right.worktreeFingerprint && left.artifactKey === right.artifactKey;
}

function stableEvidenceIdentity() {
  const official = gitWorktreeIdentity(root);
  const diff = spawnSync("git", ["diff", "--binary", "--no-ext-diff", "HEAD", "--", "."], {
    cwd: root,
    encoding: null,
    maxBuffer: 32 * 1024 * 1024,
  });
  const others = spawnSync("git", ["ls-files", "--others", "--exclude-standard"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  assert(diff.status === 0 && others.status === 0, "cannot create bounded worktree identity invariant", {
    diffStatus: diff.status,
    othersStatus: others.status,
  });
  const untracked = String(others.stdout || "")
    .split(/\r?\n/)
    .map((item) => item.replace(/\\/g, "/"))
    .filter(Boolean)
    .filter((item) => item !== OWNED_LIFECYCLE_DIAGNOSTIC && !item.startsWith(OWNED_TOOLBAR_ARTIFACT_PREFIX))
    .sort();
  const hash = crypto.createHash("sha256");
  hash.update(official.commit);
  hash.update("\0tracked-diff\0");
  hash.update(Buffer.isBuffer(diff.stdout) ? diff.stdout : Buffer.from(String(diff.stdout || "")));
  hash.update("\0untracked-excluding-owned-lifecycle-diagnostic\0");
  for (const item of untracked) {
    hash.update(item);
    hash.update("\0");
    const file = path.join(root, ...item.split("/"));
    if (fs.existsSync(file) && fs.statSync(file).isFile()) hash.update(fs.readFileSync(file));
    hash.update("\0");
  }
  return {
    commit: official.commit,
    fingerprint: hash.digest("hex"),
    official,
    ignoredToolOwnedRuntimeArtifact: OWNED_LIFECYCLE_DIAGNOSTIC,
    ignoredToolOwnedArtifactPrefix: OWNED_TOOLBAR_ARTIFACT_PREFIX,
  };
}

function sameStableEvidenceIdentity(left, right) {
  return left && right && left.commit === right.commit && left.fingerprint === right.fingerprint;
}

function pngEvidence(file) {
  const bytes = fs.readFileSync(file);
  assert(bytes.toString("ascii", 1, 4) === "PNG", "expected a PNG screenshot", { file });
  return {
    file: path.relative(root, file).replace(/\\/g, "/"),
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    dimensions: { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) },
  };
}

function validWindowsCapture(capture, expectedHandle) {
  const state = capture?.captureState;
  const screenProof = state?.captureMode === "screen-unobscured" && state?.unobscured === true;
  const render = state?.ownedWindowRender;
  const ownedRenderProof = state?.captureMode === "owned-window-render" && state?.unobscured === false &&
    Array.isArray(state?.blockedSamples) && state.blockedSamples.length > 0 && render?.success === true &&
    render?.method === "PrintWindow" && Number(render?.sampledColorCount) >= 4 && Number(render?.channelSpan) >= 24;
  const segment = state?.visibleSegment;
  const visibleSegmentProof = state?.captureMode === "screen-visible-segment" && state?.unobscured === false &&
    Array.isArray(state?.blockedSamples) && state.blockedSamples.length > 0 && segment?.success === true &&
    segment?.method === "physical-screen-segment" && segment?.unobscured === true &&
    Number(segment?.coverageRatio) >= 0.5 && Number(segment?.sampleCount) >= 9 &&
    Number(segment?.sampledColorCount) >= 4 && Number(segment?.channelSpan) >= 24;
  return Boolean(
    Number.isInteger(expectedHandle) && expectedHandle > 0 &&
    capture?.pass === true && capture?.captureOnly === true &&
    capture?.windowHandle === expectedHandle &&
    state?.foregroundHandle === expectedHandle && (screenProof || ownedRenderProof || visibleSegmentProof) &&
    Number(state?.sampleCount) >= 9 && state?.windowRect?.right > state?.windowRect?.left && state?.windowRect?.bottom > state?.windowRect?.top
  );
}

function runPythonToolbarZoom(title, { action = "reset", capturePath = "", captureOnly = false, windowHandle = null } = {}) {
  return new Promise((resolve, reject) => {
    const args = ["-3", "-B", pythonHelper, "--title", title, "--action", action, "--timeout-seconds", "10"];
    if (captureOnly) args.push("--capture-only");
    if (capturePath) args.push("--capture-path", capturePath);
    if (Number.isInteger(windowHandle) && windowHandle > 0) args.push("--window-handle", String(windowHandle));
    const child = spawn("py", args, {
      cwd: root,
      windowsHide: true,
      detached: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      if (process.platform === "win32" && child.pid) {
        spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore", timeout: 5_000 });
      } else {
        child.kill();
      }
      const error = new Error(`Windows Edge toolbar automation exceeded its bounded timeout during ${action}`);
      error.code = "EDGE_UI_AUTOMATION_TIMEOUT";
      error.detail = { action, title };
      reject(error);
    }, UI_ACTION_TIMEOUT_MS);
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", (error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      error.code = "PYTHON_LAUNCH_FAILED";
      reject(error);
    });
    child.on("close", (code) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      const output = Buffer.concat(stdout).toString("utf8").trim();
      let result = null;
      try { result = JSON.parse(output); } catch {}
      if (code !== 0 || !result?.pass) {
        const error = new Error(result?.message || `Windows Edge toolbar automation failed (exit ${code})`);
        error.code = result?.code || "EDGE_UI_AUTOMATION_FAILED";
        error.detail = { result, stderr: Buffer.concat(stderr).toString("utf8").trim() };
        reject(error);
        return;
      }
      resolve(result);
    });
  });
}

async function geometry(page) {
  return page.evaluate(() => ({
    devicePixelRatio: window.devicePixelRatio,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    visualViewport: window.visualViewport ? {
      width: window.visualViewport.width,
      height: window.visualViewport.height,
      scale: window.visualViewport.scale,
    } : null,
  }));
}

function baselineViewportFor(cssViewport) {
  return { width: cssViewport.width * 2, height: cssViewport.height * 2 };
}

function isExpectedViewport(actual, expected) {
  return Math.abs(actual.width - expected.width) <= 1 && Math.abs(actual.height - expected.height) <= 1;
}

function geometryChanged(before, after) {
  return Math.abs(after.devicePixelRatio - before.devicePixelRatio) > 0.01 ||
    Math.abs(after.innerWidth - before.innerWidth) > 1 ||
    Math.abs(after.innerHeight - before.innerHeight) > 1;
}

async function waitForGeometryChange(page, before) {
  try {
    await page.waitForFunction(
      (previous) => Math.abs(window.devicePixelRatio - previous.devicePixelRatio) > 0.01 ||
        Math.abs(window.innerWidth - previous.innerWidth) > 1 ||
        Math.abs(window.innerHeight - previous.innerHeight) > 1,
      before,
      { timeout: GEOMETRY_TRANSITION_TIMEOUT_MS },
    );
  } catch {
    // The caller records the no-op attempt and tries the next real Edge UI
    // control.  A successful UIA call without page change is never accepted.
  }
  const after = await geometry(page);
  return { before, after, changed: geometryChanged(before, after) };
}

// A UIA dispatch is merely an input attempt.  The first attempt that changed
// the owned page geometry is the only one that may count as an Edge zoom step.
// Kept pure so the fallback state machine has an offline regression contract.
function acceptedZoomAttempt(attempts) {
  return Array.isArray(attempts)
    ? attempts.find((attempt) => attempt?.changed === true) || null
    : null;
}

async function applyActualToolbarZoom(page, title, baseline) {
  const reset = await runPythonToolbarZoom(title, { action: "reset" });
  await page.waitForTimeout(150);
  const resetGeometry = await geometry(page);
  assert(
    Math.abs(resetGeometry.devicePixelRatio - 1) <= 0.1 &&
      isExpectedViewport({ width: resetGeometry.innerWidth, height: resetGeometry.innerHeight }, { width: baseline.innerWidth, height: baseline.innerHeight }),
    "real Edge Ctrl+0 reset did not restore the baseline page geometry",
    { baseline, resetGeometry, reset },
  );
  const steps = [];
  let current = resetGeometry;
  for (let step = 1; step <= TOOLBAR_INCREMENTS; step += 1) {
    const attempts = [];
    let accepted = null;
    for (const action of [...KEYBOARD_ZOOM_ACTIONS, "menu-plus"]) {
      const input = await runPythonToolbarZoom(title, { action });
      const transition = await waitForGeometryChange(page, current);
      const attempt = { action, input, ...transition };
      attempts.push(attempt);
      const acceptedAttempt = acceptedZoomAttempt(attempts);
      if (acceptedAttempt) {
        accepted = acceptedAttempt;
        current = transition.after;
        break;
      }
    }
    assert(accepted, "real Edge toolbar input did not change page DPR or layout; UIA key dispatch is not accepted as zoom proof", { step, current, attempts });
    steps.push({ step, attempts, acceptedAction: accepted.action, before: accepted.before, after: accepted.after });
  }
  return { pass: true, reset, steps, final: current };
}

function toolbarZoomEvidence({ baseline, zoomed, automation, targetCssViewport }) {
  const layoutWidthRatio = baseline.innerWidth / zoomed.innerWidth;
  const layoutHeightRatio = baseline.innerHeight / zoomed.innerHeight;
  const expectedViewport = { width: targetCssViewport.width, height: targetCssViewport.height };
  const observedViewport = { width: zoomed.innerWidth, height: zoomed.innerHeight };
  const steps = Array.isArray(automation?.steps) ? automation.steps : [];
  const verified = steps.length === TOOLBAR_INCREMENTS && steps.every((step) =>
    step?.acceptedAction && step?.attempts?.some((attempt) => attempt.action === step.acceptedAction && attempt.changed === true)
  ) &&
    Math.abs(zoomed.devicePixelRatio - 2) <= RATIO_TOLERANCE &&
    Math.abs(layoutWidthRatio - 2) <= RATIO_TOLERANCE &&
    Math.abs(layoutHeightRatio - 2) <= RATIO_TOLERANCE &&
    isExpectedViewport(observedViewport, expectedViewport);
  return {
    mechanism: "Windows UI Automation: Ctrl+0, then each increment is accepted only after the owned headed Edge page reports a real DPR/layout change; invalid keyboard paths fall back to the actual Edge menu Zoom in button",
    expectedPercent: 200,
    toolbarResetPercent: 100,
    toolbarIncrements: steps.length,
    steps,
    observedFromPageGeometry: {
      devicePixelRatio: zoomed.devicePixelRatio,
      layoutWidthRatio,
      layoutHeightRatio,
      cssViewport: observedViewport,
    },
    targetCssViewport: expectedViewport,
    verified,
  };
}

async function keyboardFocus(page, mainSelector) {
  await page.evaluate(() => { document.body.tabIndex = -1; document.body.focus(); });
  for (let index = 0; index < 24; index += 1) {
    await page.keyboard.press("Tab");
    const evidence = await page.evaluate((selector) => {
       const main = document.querySelector(selector);
       const active = document.activeElement;
       if (!(main instanceof HTMLElement) || !(active instanceof HTMLElement) || !main.contains(active)) return null;
       const rect = active.getBoundingClientRect();
       const mainRect = main.getBoundingClientRect();
       const style = getComputedStyle(active);
       const viewportWidth = window.visualViewport?.width || document.documentElement.clientWidth;
       const viewportHeight = window.visualViewport?.height || document.documentElement.clientHeight;
       const navigation = document.querySelector(".panel-task-navigation");
       const navigationRect = navigation instanceof HTMLElement ? navigation.getBoundingClientRect() : null;
       const obscuredByNavigation = Boolean(navigationRect &&
         rect.left < navigationRect.right && rect.right > navigationRect.left &&
         rect.top < navigationRect.bottom && rect.bottom > navigationRect.top);
       return {
         label: (active.getAttribute("aria-label") || active.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120),
         focusVisible: active.matches(":focus-visible"),
         outlineWidth: Number.parseFloat(style.outlineWidth || "0"),
         outlineStyle: style.outlineStyle,
         fullyVisible: rect.top >= -1 && rect.left >= -1 && rect.bottom <= viewportHeight + 1 && rect.right <= viewportWidth + 1,
         withinMain: rect.top >= mainRect.top - 1 && rect.left >= mainRect.left - 1 && rect.bottom <= mainRect.bottom + 1 && rect.right <= mainRect.right + 1,
         obscuredByNavigation,
       };
    }, mainSelector);
    if (evidence) return evidence;
  }
  throw new Error("keyboard Tab traversal did not reach a control inside main");
}

async function inspectSurface(page, { label, mainSelector, primarySelector, screenshotName, windowTitle, windowHandle, identity, viewport }) {
  const primary = page.locator(primarySelector).first();
  await primary.waitFor({ timeout: ACTION_TIMEOUT_MS });
  await primary.scrollIntoViewIfNeeded();
  const surface = await page.evaluate(({ mainSelector: selector, primarySelector: targetSelector }) => {
     const main = document.querySelector(selector);
     const primary = document.querySelector(targetSelector);
     const mainRect = main instanceof HTMLElement ? main.getBoundingClientRect() : null;
     const mainStyle = main instanceof HTMLElement ? getComputedStyle(main) : null;
     const rect = primary instanceof HTMLElement ? primary.getBoundingClientRect() : null;
    const style = primary instanceof HTMLElement ? getComputedStyle(primary) : null;
    const viewportWidth = window.visualViewport?.width || document.documentElement.clientWidth;
    const viewportHeight = window.visualViewport?.height || document.documentElement.clientHeight;
    const isVisible = (node) => {
      const computed = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return computed.display !== "none" && computed.visibility !== "hidden" && box.width > 0 && box.height > 0 &&
        box.bottom > 0 && box.right > 0 && box.top < viewportHeight && box.left < viewportWidth;
    };
      const intentionallyManaged = (node) => {
        for (let current = node; current instanceof HTMLElement && current !== main.parentElement; current = current.parentElement) {
          const computed = getComputedStyle(current);
          if (/(auto|scroll)/.test(computed.overflowX) && current.matches(".mdw-route-switcher")) return true;
        }
        return false;
      };
      const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
      const rendered = (node) => {
        if (!(node instanceof HTMLElement)) return false;
        const computed = getComputedStyle(node);
        const box = node.getBoundingClientRect();
        return computed.display !== "none" && computed.visibility !== "hidden" && computed.visibility !== "collapse" &&
          computed.contentVisibility !== "hidden" && Number.parseFloat(computed.opacity || "1") !== 0 &&
          box.width > 0 && box.height > 0;
      };
      const visuallyHidden = (owner, boundary) => {
        for (let current = owner; current instanceof HTMLElement; current = current.parentElement) {
          const computed = getComputedStyle(current);
          const box = current.getBoundingClientRect();
          const clipped = (computed.clipPath && computed.clipPath !== "none") ||
            (computed.clip && computed.clip !== "auto");
          const screenReaderGeometry = /^(absolute|fixed)$/.test(computed.position) && box.width <= 2 && box.height <= 2 && clipped &&
            /(hidden|clip)/.test(computed.overflowX) && /(hidden|clip)/.test(computed.overflowY);
          if (current.matches(".op__sr-only, [data-visually-hidden='true'], [hidden]") || !rendered(current) || screenReaderGeometry) return true;
          if (current === boundary) break;
        }
        return false;
      };
      const boundaryRect = (node) => {
        const box = node.getBoundingClientRect();
        const left = box.left + node.clientLeft;
        const top = box.top + node.clientTop;
        return { left, top, right: left + node.clientWidth, bottom: top + node.clientHeight };
      };
      const containsFragment = (boundary, fragment, axis) => axis === "x"
        ? fragment.left >= boundary.left - 1 && fragment.right <= boundary.right + 1
        : fragment.top >= boundary.top - 1 && fragment.bottom <= boundary.bottom + 1;
      const optical = main instanceof HTMLElement && main.matches("[data-optical-patrol-root]") ? main : null;
      const scopeCandidates = optical ? [
        document.querySelector('[data-panel-runtime-toolbar="mobile"]'),
        optical.querySelector(':scope > [data-optical-patrol-chrome]'),
        optical.querySelector('[data-optical-patrol-evidence-boundary]'),
        optical.querySelector('[data-optical-patrol-decision]'),
        optical.querySelector('[data-optical-patrol-action]'),
        ...optical.querySelectorAll('[data-optical-patrol-claim-control]'),
        optical.querySelector('[data-optical-patrol-evidence-deck]'),
        optical.querySelector('[data-optical-patrol-expanded-claim]'),
        optical.querySelector('[data-optical-patrol-task-navigation]'),
      ] : [main];
      const operationalScopes = [...new Set(scopeCandidates.filter((node) => node instanceof HTMLElement && rendered(node)))];
      const seenTextNodes = new Set();
      const clippedOperationalText = [];
      const unreadableOperationalText = [];
      const operationalTextScopes = [];
      for (const scope of operationalScopes) {
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
        const scopeLabel = normalize(scope.getAttribute("data-optical-patrol-expanded-claim") || scope.getAttribute("class") || scope.tagName).slice(0, 80);
        const rootBoundary = main instanceof HTMLElement && main.contains(scope) ? main : scope;
        let textNodes = 0;
        let fragments = 0;
        for (let textNode = walker.nextNode(); textNode; textNode = walker.nextNode()) {
          const value = normalize(textNode.nodeValue);
          if (!value || seenTextNodes.has(textNode)) continue;
          seenTextNodes.add(textNode);
          const owner = textNode.parentElement;
          if (!(owner instanceof HTMLElement) || intentionallyManaged(owner) || visuallyHidden(owner, scope)) continue;
          textNodes += 1;
          const ownerStyle = getComputedStyle(owner);
          const fontSize = Number.parseFloat(ownerStyle.fontSize || "0");
          if (!Number.isFinite(fontSize) || fontSize < 12) {
            unreadableOperationalText.push({ scope: scopeLabel, tag: owner.tagName.toLowerCase(), text: value.slice(0, 120), fontSize });
          }
          const range = document.createRange();
          range.selectNodeContents(textNode);
          const textFragments = Array.from(range.getClientRects()).filter((fragment) => fragment.width > 0.5 && fragment.height > 0.5);
          fragments += textFragments.length;
          if (!textFragments.length) {
            clippedOperationalText.push({ scope: scopeLabel, tag: owner.tagName.toLowerCase(), text: value.slice(0, 120), reason: "no-rendered-fragment" });
            continue;
          }
          for (const fragment of textFragments) {
            let fixedToViewport = false;
            let failure = null;
            for (let current = owner; current instanceof HTMLElement; current = current.parentElement) {
              const computed = getComputedStyle(current);
              const boundary = boundaryRect(current);
              if (/(hidden|clip)/.test(computed.overflowX) && !containsFragment(boundary, fragment, "x")) {
                failure = { axis: "x", boundary: normalize(current.getAttribute("class") || current.tagName), boundaryRect: boundary };
                break;
              }
              if (/(hidden|clip)/.test(computed.overflowY) && !containsFragment(boundary, fragment, "y")) {
                failure = { axis: "y", boundary: normalize(current.getAttribute("class") || current.tagName), boundaryRect: boundary };
                break;
              }
              if (computed.position === "fixed") {
                fixedToViewport = true;
                break;
              }
              if (current === rootBoundary) break;
            }
            const viewportX = fragment.left >= -1 && fragment.right <= viewportWidth + 1;
            const viewportY = fragment.top >= -1 && fragment.bottom <= viewportHeight + 1;
            if (!failure && (!viewportX || (fixedToViewport && !viewportY))) {
              failure = { axis: !viewportX ? "viewport-x" : "viewport-y", boundary: "viewport" };
            }
            if (failure) {
              clippedOperationalText.push({
                scope: scopeLabel,
                tag: owner.tagName.toLowerCase(),
                text: value.slice(0, 120),
                fontSize,
                fragment: { left: fragment.left, top: fragment.top, right: fragment.right, bottom: fragment.bottom },
                ...failure,
              });
              break;
            }
          }
        }
        operationalTextScopes.push({ scope: scopeLabel, textNodes, fragments });
      }
     const rectsOverlap = (left, right) => left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
     const navigation = document.querySelector(".panel-task-navigation");
     const navigationRect = navigation instanceof HTMLElement && isVisible(navigation)
       ? navigation.getBoundingClientRect()
       : null;
     const primaryObscuredByNavigation = Boolean(rect && navigationRect && rectsOverlap(rect, navigationRect));
    const trafficYAxis = main instanceof HTMLElement
      ? Array.from(main.querySelectorAll("[data-mobile-traffic-y-axis-label]"))
      : [];
    const trafficXAxis = main instanceof HTMLElement
      ? Array.from(main.querySelectorAll("[data-mobile-traffic-x-axis-label]"))
      : [];
    const trafficAxisOverlaps = trafficYAxis.flatMap((yAxis) => trafficXAxis.map((xAxis) => {
      const yRect = yAxis.getBoundingClientRect();
      const xRect = xAxis.getBoundingClientRect();
      return rectsOverlap(yRect, xRect) ? {
        y: yAxis.getAttribute("data-mobile-traffic-y-axis-label"),
        x: xAxis.getAttribute("data-mobile-traffic-x-axis-label"),
        yRect: { left: yRect.left, right: yRect.right, top: yRect.top, bottom: yRect.bottom },
        xRect: { left: xRect.left, right: xRect.right, top: xRect.top, bottom: xRect.bottom },
      } : null;
    }).filter(Boolean));
    return {
      mainCount: document.querySelectorAll("main").length,
       expectedMain: main instanceof HTMLElement,
       main: {
         overflowY: mainStyle?.overflowY || "",
         horizontalOverflow: main instanceof HTMLElement ? Math.max(0, main.scrollWidth - main.clientWidth) : null,
         scrollHeight: main instanceof HTMLElement ? main.scrollHeight : null,
         clientHeight: main instanceof HTMLElement ? main.clientHeight : null,
         scrollTop: main instanceof HTMLElement ? main.scrollTop : null,
         rect: mainRect ? { left: mainRect.left, top: mainRect.top, right: mainRect.right, bottom: mainRect.bottom, width: mainRect.width, height: mainRect.height } : null,
       },
       viewportWidth,
      viewportHeight,
       overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - viewportWidth,
       clippedOperationalText,
       unreadableOperationalText,
       operationalTextScopes,
      trafficAxis: { present: trafficYAxis.length > 0 || trafficXAxis.length > 0, yLabels: trafficYAxis.length, xLabels: trafficXAxis.length, overlaps: trafficAxisOverlaps },
      primary: {
         present: primary instanceof HTMLElement,
         visible: Boolean(rect && style && style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0),
         reachable: Boolean(rect && rect.top >= -1 && rect.left >= -1 && rect.bottom <= viewportHeight + 1 && rect.right <= viewportWidth + 1),
         withinMain: Boolean(rect && mainRect && rect.top >= mainRect.top - 1 && rect.left >= mainRect.left - 1 && rect.bottom <= mainRect.bottom + 1 && rect.right <= mainRect.right + 1),
         obscuredByNavigation: primaryObscuredByNavigation,
         rect: rect ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } : null,
       },
    };
  }, { mainSelector, primarySelector });
  assert(surface.mainCount === 1 && surface.expectedMain, `${label} must expose exactly one expected main landmark`, surface);
  assert(surface.overflowX <= 1, `${label} has horizontal page overflow at actual Edge toolbar zoom`, surface);
  assert(surface.main.horizontalOverflow <= 1, `${label} main scroll root has horizontal overflow at actual Edge toolbar zoom`, surface.main);
  assert(surface.clippedOperationalText.length === 0, `${label} has visible operational text clipped by a non-scroll container at actual Edge toolbar zoom`, surface);
  assert(surface.unreadableOperationalText.length === 0, `${label} has operational text below the 12px readability floor at actual Edge toolbar zoom`, surface);
  assert(!surface.trafficAxis.present || (surface.trafficAxis.yLabels >= 2 && surface.trafficAxis.xLabels >= 2 && surface.trafficAxis.overlaps.length === 0), `${label} traffic SVG axis labels overlap at actual Edge toolbar zoom`, surface.trafficAxis);
  assert(surface.primary.present && surface.primary.visible && surface.primary.reachable && surface.primary.withinMain && !surface.primary.obscuredByNavigation, `${label} primary task is not reachable inside main or is obscured by navigation at actual Edge toolbar zoom`, surface);
  const focus = await keyboardFocus(page, mainSelector);
  assert(focus.focusVisible && focus.outlineWidth >= 2 && focus.outlineStyle !== "none" && focus.fullyVisible && focus.withinMain && !focus.obscuredByNavigation, `${label} keyboard focus is not visible inside main, reachable, and clear of navigation`, focus);
  await page.evaluate((title) => {
    window.scrollTo(0, 0);
    document.title = title;
  }, windowTitle);
  await page.waitForTimeout(100);
  const windowsFile = path.join(artifactDir, screenshotName);
  const windowsCapture = await runPythonToolbarZoom(windowTitle, { capturePath: windowsFile, captureOnly: true, windowHandle });
  assert(validWindowsCapture(windowsCapture, windowHandle), `${label} Windows screenshot is not exclusively unobscured foreground Edge evidence`, windowsCapture);
  const diagnosticFile = path.join(artifactDir, screenshotName.replace(/\.png$/, "-playwright-diagnostic.png"));
  await page.screenshot({ path: diagnosticFile, fullPage: true, animations: "disabled" });
  return {
    label,
    viewport,
    identity,
    ...surface,
    keyboardFocus: focus,
    screenshot: pngEvidence(windowsFile),
    windowsCapture,
    playwrightDiagnosticScreenshot: pngEvidence(diagnosticFile),
  };
}

async function runCell(viewport, scenario) {
  const scenarioConfig = toolbarScenarioConfig(scenario);
  const baselineViewport = baselineViewportFor(viewport.cssViewport);
  const identityBeforeRuntime = gitWorktreeIdentity(root);
  let runtime = null;
  try {
    runtime = await launchRuntime({ headless: false, viewport: baselineViewport, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
    assert(path.basename(runtime.executablePath).toLowerCase() === "msedge.exe", "actual Microsoft Edge is required; Chrome is not accepted", { executablePath: runtime.executablePath });
    await login(runtime.page, runtime.mock.url);
    // Runtime lifecycle diagnostics may rotate their own ignored artifact while
    // the owned Edge process starts.  The evidence identity starts after that
    // bounded infrastructure write, immediately before the real toolbar input.
    const identityAtEvidenceStart = gitWorktreeIdentity(root);
    const stableIdentityAtEvidenceStart = stableEvidenceIdentity();
    const title = `RouterPanel Edge Toolbar Zoom ${viewport.id} ${scenario} ${crypto.randomUUID()}`;
    await runtime.page.evaluate((value) => { document.title = value; }, title);
    const baseline = await geometry(runtime.page);
    assert(
      Math.abs(baseline.devicePixelRatio - 1) <= 0.1 && isExpectedViewport({ width: baseline.innerWidth, height: baseline.innerHeight }, baselineViewport),
      "headed Edge did not begin from the expected physical output baseline",
      { baseline, baselineViewport, viewport },
    );
    const windowsAutomation = await applyActualToolbarZoom(runtime.page, title, baseline);
    const zoomed = windowsAutomation.final;
    const zoomLevel = toolbarZoomEvidence({ baseline, zoomed, automation: windowsAutomation, targetCssViewport: viewport.cssViewport });
    assert(zoomLevel.verified, "Edge toolbar did not produce the required verified 200% browser zoom level and target CSS viewport", { viewport, baseline, zoomed, zoomLevel, windowsAutomation });

    runtime.mock.state.scenario = scenarioConfig.fixtureScenario;
    await visitRoute(runtime.page, runtime.mock.url, scenarioConfig.route, {
      requireWorkspace: scenarioConfig.surface !== "overview",
      runtimePhase: scenarioConfig.runtimePhase,
    });
    const surface = await inspectSurface(runtime.page, {
      label: `${viewport.id}-${scenario}-${scenarioConfig.surface}`,
      mainSelector: scenarioConfig.surface === "overview" ? "main[data-optical-patrol-root]" : "main[data-mobile-domain-workspace=\"interfaces\"]",
      primarySelector: scenarioConfig.surface === "overview"
        ? "[data-optical-patrol-root] [data-optical-patrol-expanded-claim] [data-optical-patrol-action]"
        : "[data-mobile-domain-workspace=\"interfaces\"] [data-mobile-row-id]",
      screenshotName: `${viewport.id}-${scenario}-edge-toolbar-zoom200.png`,
      windowTitle: title,
      windowHandle: windowsAutomation.reset.windowHandle,
      identity: identityAtEvidenceStart,
      viewport: viewport.cssViewport,
    });
    await closeRuntime(runtime);
    const identityAfter = gitWorktreeIdentity(root);
    const stableIdentityAfter = stableEvidenceIdentity();
    assert(sameStableEvidenceIdentity(stableIdentityAtEvidenceStart, stableIdentityAfter), "product worktree changed during toolbar zoom evidence collection", {
      identityBeforeRuntime,
      identityAtEvidenceStart,
      identityAfter,
      stableIdentityAtEvidenceStart,
      stableIdentityAfter,
      viewport,
      scenario,
    });
    return {
      viewport,
      scenario,
      baselineViewport,
      baseline,
      zoomed,
      zoomLevel,
      windowsAutomation,
      identity: identityAfter,
      identityBeforeRuntime,
      stableIdentity: stableIdentityAfter,
      surface,
      cleanup: runtime.cleanup,
      ownedBrowserLifecycle: runtime.managedBrowser?.diagnostics || null,
    };
  } finally {
    if (runtime && !runtime.closed) await closeRuntime(runtime);
  }
}

async function runMatrix() {
  const identityBefore = gitWorktreeIdentity(root);
  const stableIdentityBefore = stableEvidenceIdentity();
  assert(process.platform === "win32", "actual Edge toolbar zoom acceptance is Windows-only", { platform: process.platform });
  fs.rmSync(artifactDir, { recursive: true, force: true });
  fs.mkdirSync(artifactDir, { recursive: true });
  const cells = [];
  for (const { viewport, scenario } of TOOLBAR_200_REQUIRED_CELLS) {
    cells.push(await withTimeout(`edge-toolbar-zoom200.${viewport.id}.${scenario}`, () => runCell(viewport, scenario), CELL_TIMEOUT_MS));
  }
  const identityAfter = gitWorktreeIdentity(root);
  const stableIdentityAfter = stableEvidenceIdentity();
  assert(sameStableEvidenceIdentity(stableIdentityBefore, stableIdentityAfter), "product worktree changed during toolbar zoom matrix collection", {
    identityBefore,
    identityAfter,
    stableIdentityBefore,
    stableIdentityAfter,
  });
  const report = {
    pass: true,
    contract: "edge-toolbar-zoom200-windows-v5",
    generatedAt: new Date().toISOString(),
    identity: identityAfter,
    identityBefore,
    stableIdentity: stableIdentityAfter,
    platform: process.platform,
    matrix: {
      requiredCellIds: TOOLBAR_200_REQUIRED_CELLS.map(({ viewport, scenario }) => `${viewport.id}::${scenario}`),
      requiredViewportIds: TOOLBAR_200_MATRIX.map((item) => item.id),
      requiredCssViewports: TOOLBAR_200_MATRIX.map((item) => item.cssViewport),
      requiredScenarios: TOOLBAR_SCENARIOS,
      requiredCanonicalOverviewScenarios: TOOLBAR_CANONICAL_OVERVIEW_SCENARIOS,
      complete: cells.length === TOOLBAR_200_REQUIRED_CELLS.length && cells.every((cell) => cell.surface),
    },
    proofBoundary: {
      proves: "For each independent viewport/scenario cell, actual Microsoft Edge browser-toolbar 200% zoom: a headed owned Edge window was focused through Windows UI Automation, reset to 100%, and each of five increments was accepted only after the page reported a real DPR or layout change. Ctrl+Shift+OEM_PLUS and Ctrl+Numpad Add fall back to Edge's real menu Zoom in button when they do not change geometry. The page then verified DPR≈2, 2x layout ratios, the target CSS viewport, worktree identity, horizontal overflow, visible operational-text clipping, main-scroll-root reachability, fixed-navigation clearance, keyboard focus, and Windows-owned visual evidence. The visual proof is an unobscured full-window screen grab when physically possible, an owner-rendered Windows DC image when supported, or a substantial unobscured physical monitor segment plus a separately hashed full Edge renderer screenshot for an oversized window.",
      doesNotProve: "iOS Dynamic Type, Android system font size, Windows OS font size, CSS-injected text resize, CDP pageScale, or behavior on a physical mobile device. A screen-visible-segment cell does not claim that the entire oversized OS window was simultaneously visible on one physical monitor; full-viewport geometry and the separately hashed Edge renderer screenshot provide the complementary evidence.",
    },
    timeout: { globalMs: GLOBAL_TIMEOUT_MS, perCellMs: CELL_TIMEOUT_MS, uiAutomationActionMs: UI_ACTION_TIMEOUT_MS, geometryTransitionMs: GEOMETRY_TRANSITION_TIMEOUT_MS },
    cells,
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ pass: true, reportPath, artifactKey: identityAfter.artifactKey, cells: cells.map((item) => `${item.viewport.id}::${item.scenario}`) }, null, 2)}\n`);
}

async function main() {
  await withTimeout("edge-toolbar-zoom200.matrix", runMatrix, GLOBAL_TIMEOUT_MS);
}

if (require.main === module) main().catch((error) => {
  const report = {
    pass: false,
    contract: "edge-toolbar-zoom200-windows-v5",
    generatedAt: new Date().toISOString(),
    identity: gitWorktreeIdentity(root),
    platform: process.platform,
    proofBoundary: { proves: "Nothing unless pass is true.", doesNotProve: "iOS Dynamic Type, Android system font size, Windows OS font size, CSS-injected text resize, or CDP pageScale." },
    error: errorDetail(error),
    detail: error?.detail || null,
  };
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stderr.write(`${error?.stack || error}\n`);
  process.exitCode = 1;
});

module.exports = {
  TOOLBAR_200_MATRIX,
  TOOLBAR_200_REQUIRED_CELLS,
  TOOLBAR_SCENARIOS,
  TOOLBAR_CANONICAL_OVERVIEW_SCENARIOS,
  KEYBOARD_ZOOM_ACTIONS,
  TOOLBAR_INCREMENTS,
  GLOBAL_TIMEOUT_MS,
  CELL_TIMEOUT_MS,
  baselineViewportFor,
  isExpectedViewport,
  validWindowsCapture,
  geometryChanged,
  acceptedZoomAttempt,
  toolbarZoomEvidence,
  stableEvidenceIdentity,
  toolbarScenarioConfig,
  runCell,
};
