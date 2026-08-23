#!/usr/bin/env node
"use strict";

// A separate proof from CDP page-scale and injected CSS: this headed Edge run
// uses Windows UI Automation, then verifies physical toolbar increments from
// the page's real DPR and layout viewport before accepting them.

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
const partialReportPath = path.join(artifactDir, "partial-report.json");
const pythonHelper = path.join(root, "tools", "acceptance", "accessibility-v2", "windows_browser_zoom.py");
const RATIO_TOLERANCE = 0.12;
const UI_TIMEOUT_MS = 60_000;
// A non-responsive Windows UIA action must fail quickly.  Three bounded input
// attempts plus the geometry settle window must fit inside one cell's budget;
// no UIA action is accepted without an observed DPR/layout change.
const UI_ACTION_TIMEOUT_MS = ACTION_TIMEOUT_MS;
// Keep the physical-key probe bounded, but give the helper enough time to
// finish its foreground hand-off and return.  A six-second parent timeout can
// kill the helper just after it has dispatched the key, leaving a delayed
// second key in Edge's input queue; the next fallback then overshoots 200% to
// 250%.  This remains bounded and does not change the product surface.
const KEYBOARD_UI_ACTION_TIMEOUT_MS = Math.min(15_000, Math.max(8_000, UI_ACTION_TIMEOUT_MS));
const GEOMETRY_TRANSITION_TIMEOUT_MS = Math.max(3_500, Math.min(15_000, ACTION_TIMEOUT_MS));
const CELL_TIMEOUT_MS = Math.max(180_000, ACTION_TIMEOUT_MS * 15);
const GLOBAL_TIMEOUT_MS = 75 * 60_000;
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
const TOOLBAR_CONTRACT = "edge-toolbar-zoom200-windows-v9-variable-increment-mobile-reference";
const MOBILE_ORIGIN_OWNER = Object.freeze({
  overview: "main[data-mobile-reference-home]",
  route: "main[data-mobile-reference-workspace=\"interfaces\"]",
  navigation: "[data-mobile-reference-navigation]",
});
const DESKTOP_ORIGIN_OWNER = Object.freeze({
  overview: "main[data-desktop-overview]",
  route: "main[data-panel-route=\"interfaces\"]",
  navigation: ".panel-task-navigation",
});

// The browser is opened at double the target CSS viewport. After Ctrl+0, the
// verifier applies at most five real toolbar probes and stops as soon as the
// page reports the requested 200% geometry. Edge's built-in zoom ladder can
// vary by version/input path (some builds reach 200% in four increments and
// others in five), so a fixed increment count is not a valid contract.
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
  if (scenario === "fleet") return { fixtureScenario: "fleet-coverage", route: "overview", surface: "overview", runtimePhase: "current" };
  if (scenario === "interfaces-down") return { fixtureScenario: "interfaces-down", route: "interfaces", surface: "route", runtimePhase: "current" };
  if (scenario === "interfaces-down-overview") return { fixtureScenario: "interfaces-down", route: "overview", surface: "overview", runtimePhase: "current" };
  if (TOOLBAR_CANONICAL_OVERVIEW_SCENARIOS.includes(scenario)) {
    return { fixtureScenario: scenario, route: "overview", surface: "overview", runtimePhase: scenario === "no-snapshot" ? "error" : "current" };
  }
  throw new Error(`Unsupported real Edge toolbar scenario: ${scenario}`);
}

function toolbarReportReadiness(report) {
    const actionable = "Run: node tools/check-browser-toolbar-zoom200.js (headed Microsoft Edge; bounded v9 variable-increment matrix).";
  if (!report || typeof report !== "object") return { pass: false, code: "V8_REPORT_MISSING", reason: `Current-owner real Edge 200% evidence is missing. ${actionable}` };
  if (report.contract !== TOOLBAR_CONTRACT) return { pass: false, code: "V8_CONTRACT_STALE", reason: `Toolbar report contract is ${report.contract || "missing"}, expected ${TOOLBAR_CONTRACT}. ${actionable}` };
  const owner = report.ownerContract || {};
  if (owner.overview !== MOBILE_ORIGIN_OWNER.overview || owner.route !== MOBILE_ORIGIN_OWNER.route || owner.navigation !== MOBILE_ORIGIN_OWNER.navigation ||
      owner.desktopOverview !== DESKTOP_ORIGIN_OWNER.overview || owner.desktopRoute !== DESKTOP_ORIGIN_OWNER.route || owner.desktopNavigation !== DESKTOP_ORIGIN_OWNER.navigation) {
    return { pass: false, code: "V8_OWNER_MISMATCH", reason: `Toolbar report is not bound to the accepted Mobile Reference and wide-landscape browser owners. ${actionable}` };
  }
  if (report.pass !== true || report.matrix?.complete !== true || !Array.isArray(report.cells) || report.cells.length !== TOOLBAR_200_REQUIRED_CELLS.length) {
    return { pass: false, code: "V8_MATRIX_INCOMPLETE", reason: `Current-owner real Edge 200% matrix is failed or incomplete. ${actionable}` };
  }
  const failedCell = report.cells.find((cell) => cell?.surface?.main?.maxLeft !== 0 || cell?.surface?.keyboardTraversal?.complete !== true || cell?.surface?.keyboardTraversal?.visitedCount !== cell?.surface?.keyboardTraversal?.expectedCount);
  if (failedCell) return { pass: false, code: "V8_CELL_ACCESSIBILITY_FAILED", reason: `A current-owner 200% cell lacks zero-horizontal-overflow or complete keyboard evidence. ${actionable}`, cell: `${failedCell?.viewport?.id || "unknown"}::${failedCell?.scenario || "unknown"}` };
  return { pass: true, code: "V8_CURRENT_OWNER_READY", reason: "Current-owner real Edge 200% evidence is complete." };
}

function currentToolbarReportStatus() {
  if (!fs.existsSync(reportPath)) return toolbarReportReadiness(null);
  try { return toolbarReportReadiness(JSON.parse(fs.readFileSync(reportPath, "utf8"))); }
  catch (error) { return { pass: false, code: "V8_REPORT_INVALID", reason: `Current-owner toolbar report is invalid JSON: ${String(error?.message || error)}. Run: node tools/check-browser-toolbar-zoom200.js.` }; }
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

function toolbarCellId(cell) {
  return `${cell?.viewport?.id || ""}::${cell?.scenario || ""}`;
}

function pendingToolbarCells(completedCells = []) {
  const completed = new Set(completedCells.map(toolbarCellId));
  return TOOLBAR_200_REQUIRED_CELLS.filter((cell) => !completed.has(toolbarCellId(cell)));
}

function parseMaxCells(argv = process.argv.slice(2)) {
  const raw = argv.find((item) => item.startsWith("--max-cells="));
  if (!raw) return Infinity;
  const value = Number(raw.slice("--max-cells=".length));
  assert(Number.isInteger(value) && value > 0, "--max-cells must be a positive integer", { value });
  return value;
}

function loadPartialCells(stableIdentity) {
  if (!fs.existsSync(partialReportPath)) return [];
  try {
    const partial = JSON.parse(fs.readFileSync(partialReportPath, "utf8"));
    if (partial.contract !== TOOLBAR_CONTRACT) return [];
    if (!sameStableEvidenceIdentity(partial.stableIdentity, stableIdentity)) return [];
    return Array.isArray(partial.cells) ? partial.cells : [];
  } catch (_) {
    return [];
  }
}

function writePartialCells(identity, stableIdentity, cells) {
  fs.writeFileSync(partialReportPath, `${JSON.stringify({
    contract: TOOLBAR_CONTRACT,
    generatedAt: new Date().toISOString(),
    identity,
    stableIdentity,
    cells,
  }, null, 2)}\n`, "utf8");
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

function runPythonToolbarZoom(title, { action = "reset", capturePath = "", captureOnly = false, windowHandle = null, timeoutMs = UI_ACTION_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const args = ["-3", "-B", pythonHelper, "--title", title, "--action", action, "--timeout-seconds", String(Math.ceil(timeoutMs / 1000))];
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
    }, timeoutMs);
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

async function waitForGeometryChange(page, before, timeout = GEOMETRY_TRANSITION_TIMEOUT_MS) {
  try {
    await page.waitForFunction(
      (previous) => Math.abs(window.devicePixelRatio - previous.devicePixelRatio) > 0.01 ||
        Math.abs(window.innerWidth - previous.innerWidth) > 1 ||
        Math.abs(window.innerHeight - previous.innerHeight) > 1,
      before,
      { timeout },
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

function reachedTargetToolbarZoom(geometryState, baseline) {
  return Boolean(
    geometryState && baseline &&
    Math.abs(geometryState.devicePixelRatio - 2) <= RATIO_TOLERANCE &&
    Math.abs((baseline.innerWidth / geometryState.innerWidth) - 2) <= RATIO_TOLERANCE &&
    Math.abs((baseline.innerHeight / geometryState.innerHeight) - 2) <= RATIO_TOLERANCE,
  );
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
  for (let step = 1; step <= TOOLBAR_INCREMENTS && !reachedTargetToolbarZoom(current, baseline); step += 1) {
    const attempts = [];
    let accepted = null;
    for (const action of [...KEYBOARD_ZOOM_ACTIONS, "menu-plus"]) {
      let input;
      let transition = { before: current, after: current, changed: false };
      try {
        input = await runPythonToolbarZoom(title, {
          action,
          timeoutMs: action === "menu-plus" ? UI_ACTION_TIMEOUT_MS : KEYBOARD_UI_ACTION_TIMEOUT_MS,
        });
        transition = await waitForGeometryChange(page, current);
      } catch (error) {
        // A failed OEM/numpad dispatch is an input-path failure, not a cell
        // failure. The Windows key may still arrive after the helper's bounded
        // UIA timeout, so observe one short grace window before trying a
        // fallback. Otherwise a delayed real key plus the fallback would be
        // counted as one step while physically advancing Edge twice.
        input = {
          pass: false,
          code: error?.code || "EDGE_UI_AUTOMATION_FAILED",
          message: String(error?.message || error),
        };
        transition = await waitForGeometryChange(
          page,
          current,
          // A timed-out UIA helper may have already dispatched the physical
          // key while its focus/return path is still unwinding. Observe a
          // longer bounded grace period before sending a fallback key; a
          // shorter window can accept the fallback and the delayed original
          // as two browser zoom increments.
          Math.min(9_000, GEOMETRY_TRANSITION_TIMEOUT_MS),
        );
      }
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
  assert(reachedTargetToolbarZoom(current, baseline), "real Edge toolbar probes did not reach the required 200% geometry within the bounded increment budget", { current, baseline, steps });
  return { pass: true, reset, steps, final: current };
}

function toolbarZoomEvidence({ baseline, zoomed, automation, targetCssViewport }) {
  const layoutWidthRatio = baseline.innerWidth / zoomed.innerWidth;
  const layoutHeightRatio = baseline.innerHeight / zoomed.innerHeight;
  const expectedViewport = { width: targetCssViewport.width, height: targetCssViewport.height };
  const observedViewport = { width: zoomed.innerWidth, height: zoomed.innerHeight };
  const steps = Array.isArray(automation?.steps) ? automation.steps : [];
  const verified = steps.length > 0 && steps.length <= TOOLBAR_INCREMENTS && steps.every((step) =>
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

async function keyboardTraversal(page, mainSelector) {
  const expected = await page.evaluate((selector) => {
    const main = document.querySelector(selector);
    if (!(main instanceof HTMLElement)) return [];
    return [...main.querySelectorAll("button, a[href], input, select, textarea, summary, [tabindex]:not([tabindex='-1'])")]
      .filter((node) => {
        if (!(node instanceof HTMLElement) || node.tabIndex < 0 || ("disabled" in node && node.disabled)) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0.5 && rect.height > 0.5;
      })
      .map((node, index) => {
        const id = node.getAttribute("data-mobile-reference-toolbar-control") || `toolbar-control-${index}`;
        node.setAttribute("data-mobile-reference-toolbar-control", id);
        return id;
      });
  }, mainSelector);
  await page.evaluate(() => { document.body.tabIndex = -1; document.body.focus(); });
  const sequence = [];
  const visited = new Set();
  const maxSteps = Math.max(96, expected.length * 4 + 24);
  for (let index = 0; index < maxSteps && visited.size < expected.length; index += 1) {
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
       const navigation = document.querySelector('[data-mobile-reference-navigation]');
       const navigationRect = navigation instanceof HTMLElement ? navigation.getBoundingClientRect() : null;
       const obscuredByNavigation = Boolean(navigationRect &&
         rect.left < navigationRect.right && rect.right > navigationRect.left &&
         rect.top < navigationRect.bottom && rect.bottom > navigationRect.top);
       return {
         id: active.getAttribute("data-mobile-reference-toolbar-control"),
         label: (active.getAttribute("aria-label") || active.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120),
         focusVisible: active.matches(":focus-visible"),
         outlineWidth: Number.parseFloat(style.outlineWidth || "0"),
         outlineStyle: style.outlineStyle,
         fullyVisible: rect.top >= -1 && rect.left >= -1 && rect.bottom <= viewportHeight + 1 && rect.right <= viewportWidth + 1,
         withinMain: rect.top >= mainRect.top - 1 && rect.left >= mainRect.left - 1 && rect.bottom <= mainRect.bottom + 1 && rect.right <= mainRect.right + 1,
         obscuredByNavigation,
       };
    }, mainSelector);
    if (evidence?.id && expected.includes(evidence.id) && !visited.has(evidence.id)) {
      visited.add(evidence.id);
      sequence.push({ order: sequence.length + 1, ...evidence });
    }
  }
  const missingIds = expected.filter((id) => !visited.has(id));
  return { complete: missingIds.length === 0, expectedCount: expected.length, visitedCount: visited.size, missingIds, sequence };
}

async function inspectSurface(page, { label, mainSelector, primarySelector, screenshotName, windowTitle, windowHandle, identity, viewport }) {
  const primary = page.locator(primarySelector).first();
  await primary.waitFor({ state: "attached", timeout: ACTION_TIMEOUT_MS });
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
      const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
      const intentionallyManaged = (owner) => {
        if (!(owner instanceof HTMLElement)) return false;
        const computed = getComputedStyle(owner);
        const explicitlyTruncated = computed.textOverflow === "ellipsis" &&
          /(hidden|clip)/.test(computed.overflowX) &&
          computed.whiteSpace === "nowrap";
        if (!explicitlyTruncated) return false;
        const control = owner.closest("button, a[href], summary") || owner;
        const fullText = normalize(owner.textContent);
        const accessibleText = normalize(control.getAttribute("aria-label") || control.textContent);
        return Boolean(fullText && accessibleText.includes(fullText));
      };
      const rendered = (node) => {
        if (!(node instanceof HTMLElement)) return false;
        const computed = getComputedStyle(node);
        const box = node.getBoundingClientRect();
        return computed.display !== "none" && computed.visibility !== "hidden" && computed.visibility !== "collapse" &&
          computed.contentVisibility !== "hidden" && Number.parseFloat(computed.opacity || "1") !== 0 &&
          box.width > 0 && box.height > 0;
      };
      const visuallyHidden = (owner, boundary) => {
        const closedDetails = owner.closest("details:not([open])");
        if (closedDetails instanceof HTMLDetailsElement && !owner.closest("summary")) return true;
        for (let current = owner; current instanceof HTMLElement; current = current.parentElement) {
          const computed = getComputedStyle(current);
          const box = current.getBoundingClientRect();
          const clipped = (computed.clipPath && computed.clipPath !== "none") ||
            (computed.clip && computed.clip !== "auto");
          const screenReaderGeometry = /^(absolute|fixed)$/.test(computed.position) && box.width <= 2 && box.height <= 2 && clipped &&
            /(hidden|clip)/.test(computed.overflowX) && /(hidden|clip)/.test(computed.overflowY);
          if (current.matches("[data-visually-hidden='true'], [hidden]") || !rendered(current) || screenReaderGeometry) return true;
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
       const mobileOriginOverview = main instanceof HTMLElement && main.matches("[data-mobile-reference-home]") ? main : null;
       const scopeCandidates = mobileOriginOverview ? [
         mobileOriginOverview.querySelector('.ref-status'),
         mobileOriginOverview.querySelector('.ref-wan'),
         mobileOriginOverview.querySelector('.ref-resources'),
         mobileOriginOverview.querySelector('.ref-interfaces'),
         ...mobileOriginOverview.querySelectorAll('.ref-facts'),
       ] : [main];
      const operationalScopes = [...new Set(scopeCandidates.filter((node) => node instanceof HTMLElement && rendered(node)))];
      const seenTextNodes = new Set();
      const clippedOperationalText = [];
      const unreadableOperationalText = [];
      const operationalTextScopes = [];
      for (const scope of operationalScopes) {
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
         const scopeLabel = normalize(scope.getAttribute("data-origin-scene") || scope.getAttribute("class") || scope.tagName).slice(0, 80);
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
    const navigation = document.querySelector('[data-mobile-reference-navigation]');
     const navigationRect = navigation instanceof HTMLElement && isVisible(navigation)
       ? navigation.getBoundingClientRect()
       : null;
     const primaryObscuredByNavigation = Boolean(rect && navigationRect && rectsOverlap(rect, navigationRect));
    const trafficChart = mobileOriginOverview?.querySelector('.ref-chart') || null;
    const trafficLegend = trafficChart ? Array.from(trafficChart.querySelectorAll('.ref-chart__scale span')) : [];
    const trafficTimeLabels = trafficChart ? Array.from(trafficChart.querySelectorAll('.ref-chart__footer span')) : [];
    const trafficLegendOutsideChart = trafficLegend.filter((label) => {
      const labelRect = label.getBoundingClientRect();
      return labelRect.left < -1 || labelRect.right > viewportWidth + 1 || labelRect.top < -1 || labelRect.bottom > viewportHeight + 1;
    }).map((label) => ({ label: normalize(label.textContent), rect: label.getBoundingClientRect().toJSON() }));
    return {
      mainCount: document.querySelectorAll("main").length,
       expectedMain: main instanceof HTMLElement,
       main: {
         overflowY: mainStyle?.overflowY || "",
         horizontalOverflow: main instanceof HTMLElement ? Math.max(0, main.scrollWidth - main.clientWidth) : null,
         maxLeft: main instanceof HTMLElement ? Math.max(0, main.scrollWidth - main.clientWidth) : null,
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
      trafficAxis: { present: Boolean(trafficChart), yLabels: trafficLegend.length, xLabels: trafficTimeLabels.length, overlaps: trafficLegendOutsideChart },
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
  assert(surface.main.horizontalOverflow === 0 && surface.main.maxLeft === 0, `${label} main scroll root has horizontal overflow at actual Edge toolbar zoom`, surface.main);
  assert(surface.clippedOperationalText.length === 0, `${label} has visible operational text clipped by a non-scroll container at actual Edge toolbar zoom`, surface);
  assert(surface.unreadableOperationalText.length === 0, `${label} has operational text below the 12px readability floor at actual Edge toolbar zoom`, surface);
  assert(!surface.trafficAxis.present || (surface.trafficAxis.yLabels >= 2 && surface.trafficAxis.xLabels >= 2 && surface.trafficAxis.overlaps.length === 0), `${label} traffic chart legend is incomplete or clipped at actual Edge toolbar zoom`, surface.trafficAxis);
  assert(surface.primary.present && surface.primary.visible && surface.primary.reachable && surface.primary.withinMain && !surface.primary.obscuredByNavigation, `${label} primary task is not reachable inside main or is obscured by navigation at actual Edge toolbar zoom`, surface);
  const keyboard = await keyboardTraversal(page, mainSelector);
  assert(keyboard.complete && keyboard.expectedCount > 0 && keyboard.visitedCount === keyboard.expectedCount && keyboard.sequence.every((item) => item.focusVisible && item.outlineWidth >= 2 && item.outlineStyle !== "none" && item.fullyVisible && item.withinMain && !item.obscuredByNavigation), `${label} keyboard traversal did not reach every control with visible focus clear of navigation`, keyboard);
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
    keyboardTraversal: keyboard,
    screenshot: pngEvidence(windowsFile),
    windowsCapture,
    playwrightDiagnosticScreenshot: pngEvidence(diagnosticFile),
  };
}

async function runCell(viewport, scenario) {
  const scenarioConfig = toolbarScenarioConfig(scenario);
  const expectedBaselineSurface = viewport.orientation === "landscape" && viewport.cssViewport.width >= 600 ? "desktop" : "mobile";
  const baselineViewport = baselineViewportFor(viewport.cssViewport);
  const identityBeforeRuntime = gitWorktreeIdentity(root);
  let runtime = null;
  try {
    runtime = await launchRuntime({
      headless: false,
      mockTransport: "tcp",
      mockPreferIpv4: true,
      viewport: baselineViewport,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    });
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

    // Browser zoom changes the CSS viewport. A tablet landscape baseline is
    // desktop at 100%, but its reflowed 200% CSS viewport may legitimately
    // select the mobile render tree. Resolve the owner after zoom instead of
    // forcing the pre-zoom owner onto the reflowed document.
    const browserSurface = await runtime.page.evaluate(() => {
      if (document.querySelector("main[data-desktop-overview], main[data-desktop-route]")) return "desktop";
      if (document.querySelector("main[data-mobile-reference-home], main[data-mobile-reference-workspace]")) return "mobile";
      return "unknown";
    });
    assert(browserSurface !== "unknown", "Edge zoomed document did not expose a recognized render owner", { viewport, expectedBaselineSurface, zoomed });
    const owner = browserSurface === "desktop" ? DESKTOP_ORIGIN_OWNER : MOBILE_ORIGIN_OWNER;

    runtime.mock.state.scenario = scenarioConfig.fixtureScenario;
    await visitRoute(runtime.page, runtime.mock.url, scenarioConfig.route, {
      requireWorkspace: scenarioConfig.surface !== "overview",
      runtimePhase: scenarioConfig.runtimePhase,
    });
    const surface = await inspectSurface(runtime.page, {
      label: `${viewport.id}-${scenario}-${scenarioConfig.surface}`,
      mainSelector: scenarioConfig.surface === "overview" ? owner.overview : owner.route,
      primarySelector: scenarioConfig.surface === "overview"
        ? browserSurface === "desktop"
          ? `${owner.overview} [data-desktop-wan-evidence]`
          : `${owner.overview} button`
        : browserSurface === "desktop"
          ? `${owner.route} button`
          : `${owner.route} .ref-object-list > button`,
      screenshotName: `${viewport.id}-${scenario}-edge-toolbar-zoom200.png`,
      windowTitle: title,
      windowHandle: windowsAutomation.reset.windowHandle,
      identity: identityAtEvidenceStart,
      viewport: viewport.cssViewport,
    });
    await closeRuntime(runtime);
    const pipeResets = Array.isArray(runtime.mock?.state?.pipeResets) ? runtime.mock.state.pipeResets : [];
    assert(pipeResets.every((item) => item.accepted === true), "mock pipe reset occurred outside browser cancellation or owned teardown", { pipeResets });
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
      expectedBaselineSurface,
      browserSurface,
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
  const resume = process.argv.includes("--resume");
  const maxCells = parseMaxCells();
  assert(process.platform === "win32", "actual Edge toolbar zoom acceptance is Windows-only", { platform: process.platform });
  const resumableCells = resume ? loadPartialCells(stableIdentityBefore) : [];
  if (!resume || resumableCells.length === 0) fs.rmSync(artifactDir, { recursive: true, force: true });
  fs.mkdirSync(artifactDir, { recursive: true });
  const cells = [...resumableCells];
  let collectedThisRun = 0;
  for (const { viewport, scenario } of pendingToolbarCells(cells)) {
    if (collectedThisRun >= maxCells) break;
    const cellId = `${viewport.id}::${scenario}`;
    const startedAt = Date.now();
    const ordinal = TOOLBAR_200_REQUIRED_CELLS.findIndex((cell) => toolbarCellId(cell) === cellId) + 1;
    process.stderr.write(`[edge-toolbar-zoom200] ${ordinal}/${TOOLBAR_200_REQUIRED_CELLS.length} start ${cellId}\n`);
    cells.push(await withTimeout(`edge-toolbar-zoom200.${viewport.id}.${scenario}`, () => runCell(viewport, scenario), CELL_TIMEOUT_MS));
    collectedThisRun += 1;
    writePartialCells(gitWorktreeIdentity(root), stableIdentityBefore, cells);
    process.stderr.write(`[edge-toolbar-zoom200] ${ordinal}/${TOOLBAR_200_REQUIRED_CELLS.length} pass ${cellId} ${Date.now() - startedAt}ms\n`);
  }
  const identityAfter = gitWorktreeIdentity(root);
  const stableIdentityAfter = stableEvidenceIdentity();
  assert(sameStableEvidenceIdentity(stableIdentityBefore, stableIdentityAfter), "product worktree changed during toolbar zoom matrix collection", {
    identityBefore,
    identityAfter,
    stableIdentityBefore,
    stableIdentityAfter,
  });
  const orderedCells = TOOLBAR_200_REQUIRED_CELLS
    .map((required) => cells.find((cell) => toolbarCellId(cell) === toolbarCellId(required)))
    .filter(Boolean);
  const matrixComplete = orderedCells.length === TOOLBAR_200_REQUIRED_CELLS.length && orderedCells.every((cell) => cell.surface);
  const report = {
    pass: matrixComplete,
    contract: TOOLBAR_CONTRACT,
    ownerContract: { ...MOBILE_ORIGIN_OWNER, desktopOverview: DESKTOP_ORIGIN_OWNER.overview, desktopRoute: DESKTOP_ORIGIN_OWNER.route, desktopNavigation: DESKTOP_ORIGIN_OWNER.navigation },
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
      complete: matrixComplete,
    },
    proofBoundary: {
      proves: "For each independent viewport/scenario cell, actual Microsoft Edge browser-toolbar 200% zoom: a headed owned Edge window was focused through Windows UI Automation, reset to 100%, and each of five increments was accepted only after the page reported a real DPR or layout change. Ctrl+Shift+OEM_PLUS and Ctrl+Numpad Add fall back to Edge's real menu Zoom in button when they do not change geometry. The page then verified DPR≈2, 2x layout ratios, the target CSS viewport, worktree identity, zero horizontal scroll range, visible operational-text clipping, main-scroll-root reachability, fixed-navigation clearance, complete ordered keyboard traversal, and Windows-owned visual evidence. The visual proof is an unobscured full-window screen grab when physically possible, an owner-rendered Windows DC image when supported, or a substantial unobscured physical monitor segment plus a separately hashed full Edge renderer screenshot for an oversized window.",
      doesNotProve: "iOS Dynamic Type, Android system font size, Windows OS font size, CSS-injected text resize, CDP pageScale, or behavior on a physical mobile device. A screen-visible-segment cell does not claim that the entire oversized OS window was simultaneously visible on one physical monitor; full-viewport geometry and the separately hashed Edge renderer screenshot provide the complementary evidence.",
    },
    timeout: { globalMs: GLOBAL_TIMEOUT_MS, perCellMs: CELL_TIMEOUT_MS, uiAutomationActionMs: UI_ACTION_TIMEOUT_MS, geometryTransitionMs: GEOMETRY_TRANSITION_TIMEOUT_MS },
    cells: orderedCells,
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ pass: matrixComplete, reportPath, artifactKey: identityAfter.artifactKey, cells: orderedCells.map(toolbarCellId), remaining: pendingToolbarCells(orderedCells).map(toolbarCellId) }, null, 2)}\n`);
  if (!matrixComplete) process.exitCode = 1;
}

async function main() {
  if (process.argv.includes("--status-only")) {
    const status = currentToolbarReportStatus();
    process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
    if (!status.pass) process.exitCode = 1;
    return;
  }
  await withTimeout("edge-toolbar-zoom200.matrix", runMatrix, GLOBAL_TIMEOUT_MS);
}

if (require.main === module) main().catch((error) => {
  const report = {
    pass: false,
    contract: TOOLBAR_CONTRACT,
    ownerContract: { ...MOBILE_ORIGIN_OWNER, desktopOverview: DESKTOP_ORIGIN_OWNER.overview, desktopRoute: DESKTOP_ORIGIN_OWNER.route, desktopNavigation: DESKTOP_ORIGIN_OWNER.navigation },
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
  UI_ACTION_TIMEOUT_MS,
  GEOMETRY_TRANSITION_TIMEOUT_MS,
  TOOLBAR_CONTRACT,
  MOBILE_ORIGIN_OWNER,
  DESKTOP_ORIGIN_OWNER,
  baselineViewportFor,
  isExpectedViewport,
  validWindowsCapture,
  geometryChanged,
  acceptedZoomAttempt,
  toolbarZoomEvidence,
  stableEvidenceIdentity,
  pendingToolbarCells,
  parseMaxCells,
  toolbarScenarioConfig,
  toolbarReportReadiness,
  currentToolbarReportStatus,
  runCell,
};
