#!/usr/bin/env node
"use strict";

// A separate proof from CDP page-scale and injected CSS: this headed Edge run
// uses process-owned Windows UI Automation, then verifies toolbar increments from
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
// A non-responsive Windows UIA action must fail quickly. No UIA action is
// accepted without an observed DPR/layout change.
const UI_ACTION_TIMEOUT_MS = ACTION_TIMEOUT_MS;
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
const TOOLBAR_ZOOM_ACTION = "menu-plus";
const OWNED_LIFECYCLE_DIAGNOSTIC = "tools/acceptance/browser-lifecycle-v2/.artifacts/latest-report.json";
const OWNED_TOOLBAR_ARTIFACT_PREFIX = "_acceptance/edge-toolbar-zoom200/";
const TOOLBAR_CONTRACT = "edge-toolbar-zoom200-windows-v10-process-owned-uia-mobile-reference";
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

// Each fresh browser is opened at double the target CSS viewport and must
// prove an unzoomed 100% baseline before any automation. The verifier applies
// at most five process-owned Edge menu invocations and stops as soon as the
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
  { id: "landscape-568x320", cssViewport: { width: 568, height: 320 }, orientation: "landscape" },
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
  // Keep the real Edge fixture name aligned with the canonical matrix.  The
  // former fleet-coverage fixture only added below-the-fold interfaces, so the
  // 390px renderer screenshot was byte-identical to normal and was correctly
  // rejected as reused evidence.  The canonical fleet fixture changes the
  // visible WAN scope and identity as well as the underlying rows.
  if (scenario === "fleet") return { fixtureScenario: "fleet", route: "overview", surface: "overview", runtimePhase: "current" };
  if (scenario === "interfaces-down") return { fixtureScenario: "interfaces-down", route: "interfaces", surface: "route", runtimePhase: "current" };
  if (scenario === "interfaces-down-overview") return { fixtureScenario: "interfaces-down", route: "overview", surface: "overview", runtimePhase: "current" };
  if (TOOLBAR_CANONICAL_OVERVIEW_SCENARIOS.includes(scenario)) {
    return { fixtureScenario: scenario, route: "overview", surface: "overview", runtimePhase: scenario === "no-snapshot" ? "error" : "current" };
  }
  throw new Error(`Unsupported real Edge toolbar scenario: ${scenario}`);
}

function toolbarReportReadiness(report, currentIdentity = null) {
  const actionable = "Run: node tools/check-browser-toolbar-zoom200.js (headed Microsoft Edge; strict v10 variable-increment matrix).";
  if (!report || typeof report !== "object") return { pass: false, code: "V8_REPORT_MISSING", reason: `Current-owner real Edge 200% evidence is missing. ${actionable}` };
  if (report.contract !== TOOLBAR_CONTRACT) return { pass: false, code: "V8_CONTRACT_STALE", reason: `Toolbar report contract is ${report.contract || "missing"}, expected ${TOOLBAR_CONTRACT}. ${actionable}` };
  if (currentIdentity) {
    const evidenceIdentity = report.identity || {};
    const exactIdentityMatches = evidenceIdentity.commit === currentIdentity.commit
      && evidenceIdentity.artifactKey === currentIdentity.artifactKey;
    if (!exactIdentityMatches || currentIdentity.worktreeClean !== true || currentIdentity.releaseEvidenceEligible !== true) {
      return {
        pass: false,
        code: "V8_EXACT_SHA_STALE",
        reason: `Toolbar evidence is not bound to the current clean exact SHA. ${actionable}`,
      };
    }
  }
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
  const strict = validateToolbarReportEvidence(report, currentIdentity);
  if (!strict.pass) return { pass: false, code: "V10_EVIDENCE_INVALID", reason: `Current-owner real Edge 200% evidence failed strict validation: ${strict.errors.join("; ")}. ${actionable}` };
  return { pass: true, code: "V8_CURRENT_OWNER_READY", reason: "Current-owner real Edge 200% evidence is complete." };
}

function currentToolbarReportStatus() {
  const currentIdentity = gitWorktreeIdentity(root);
  if (!fs.existsSync(reportPath)) return toolbarReportReadiness(null, currentIdentity);
  try { return toolbarReportReadiness(JSON.parse(fs.readFileSync(reportPath, "utf8")), currentIdentity); }
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

function expectedToolbarSurface(viewport) {
  return viewport?.orientation === "landscape" && viewport?.cssViewport?.width >= 600 ? "desktop" : "mobile";
}

function sameStringList(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => value === right[index]);
}

function validScreenshotEvidence(screenshot) {
  return Boolean(
    screenshot && typeof screenshot.file === "string" && screenshot.file.length > 0 &&
    /^[0-9a-f]{64}$/i.test(String(screenshot.sha256 || "")) &&
    Number(screenshot.dimensions?.width) > 0 && Number(screenshot.dimensions?.height) > 0
  );
}

function sameScreenshotDimensions(left, right) {
  return Boolean(
    Number.isInteger(Number(left?.width)) && Number(left?.width) > 0 &&
    Number.isInteger(Number(left?.height)) && Number(left?.height) > 0 &&
    Number(left.width) === Number(right?.width) && Number(left.height) === Number(right?.height)
  );
}

function samePageGeometry(left, right) {
  return Boolean(
    left && right &&
    Math.abs(Number(left.innerWidth) - Number(right.innerWidth)) <= 1 &&
    Math.abs(Number(left.innerHeight) - Number(right.innerHeight)) <= 1 &&
    Math.abs(Number(left.devicePixelRatio) - Number(right.devicePixelRatio)) <= 0.01
  );
}

function toolbarCellEvidenceErrors(cell, expected, stableIdentity = null) {
  const errors = [];
  const id = toolbarCellId(cell);
  const expectedId = toolbarCellId(expected);
  const expectedViewport = expected?.viewport || {};
  const observedViewport = cell?.viewport || {};
  if (id !== expectedId) errors.push(`${id || "unknown"}: identity differs from ${expectedId}`);
  if (observedViewport.orientation !== expectedViewport.orientation ||
      observedViewport.cssViewport?.width !== expectedViewport.cssViewport?.width ||
      observedViewport.cssViewport?.height !== expectedViewport.cssViewport?.height) {
    errors.push(`${expectedId}: viewport contract mismatch`);
  }
  const expectedSurface = expectedToolbarSurface(expectedViewport);
  if (cell?.expectedBaselineSurface !== expectedSurface || cell?.browserSurface !== expectedSurface) {
    errors.push(`${expectedId}: rendered owner ${cell?.browserSurface || "missing"} differs from ${expectedSurface}`);
  }
  const steps = Array.isArray(cell?.windowsAutomation?.steps) ? cell.windowsAutomation.steps : [];
  const incrementCount = Number(cell?.zoomLevel?.toolbarIncrements);
  if (cell?.zoomLevel?.verified !== true || cell?.zoomLevel?.expectedPercent !== 200 ||
      !Number.isInteger(incrementCount) || incrementCount < 1 || incrementCount > TOOLBAR_INCREMENTS ||
      steps.length !== incrementCount || cell?.windowsAutomation?.pass !== true) {
    errors.push(`${expectedId}: variable-increment 200% Edge evidence is incomplete`);
  }
  const windowHandle = cell?.windowsAutomation?.windowHandle;
  const baselineInspection = cell?.windowsAutomation?.baselineInspection;
  if (!Number.isInteger(windowHandle) || windowHandle <= 0 || baselineInspection?.pass !== true ||
      baselineInspection?.contract !== "windows-edge-toolbar-zoom-v1" || baselineInspection?.action !== "inspect" ||
      baselineInspection?.windowHandle !== windowHandle) {
    errors.push(`${expectedId}: original Edge HWND binding is missing`);
  }
  let previousGeometry = cell?.baseline;
  for (const [index, step] of steps.entries()) {
    const accepted = Array.isArray(step?.attempts)
      ? step.attempts.find((attempt) => attempt?.action === step?.acceptedAction && attempt?.changed === true)
      : null;
    const input = accepted?.input;
    const continuous = samePageGeometry(step?.before, previousGeometry) && samePageGeometry(accepted?.before, step?.before) &&
      samePageGeometry(accepted?.after, step?.after) && geometryChanged(step?.before, step?.after) &&
      Number(step?.after?.innerWidth) <= Number(step?.before?.innerWidth) + 1 &&
      Number(step?.after?.innerHeight) <= Number(step?.before?.innerHeight) + 1 &&
      Number(step?.after?.devicePixelRatio) + 0.01 >= Number(step?.before?.devicePixelRatio);
    if (step?.step !== index + 1 || step?.acceptedAction !== TOOLBAR_ZOOM_ACTION || !accepted ||
        input?.pass !== true || input?.contract !== "windows-edge-toolbar-zoom-v1" ||
        input?.action !== TOOLBAR_ZOOM_ACTION || input?.captureOnly !== false || input?.windowHandle !== windowHandle || !continuous) {
      errors.push(`${expectedId}: toolbar step ${step?.step || "?"} is not a geometry-confirmed process-owned menu action on the original HWND`);
    }
    previousGeometry = step?.after;
  }
  const baseline = cell?.baseline;
  const zoomed = cell?.zoomed;
  const expectedBaseline = baselineViewportFor(expectedViewport.cssViewport || {});
  const baselineGeometryValid = Number.isFinite(Number(baseline?.innerWidth)) && Number.isFinite(Number(baseline?.innerHeight)) &&
    Number.isFinite(Number(baseline?.devicePixelRatio)) &&
    isExpectedViewport({ width: Number(baseline?.innerWidth), height: Number(baseline?.innerHeight) }, expectedBaseline) &&
    Math.abs(Number(baseline?.devicePixelRatio) - 1) <= 0.1;
  const zoomedGeometryValid = Number.isFinite(Number(zoomed?.innerWidth)) && Number.isFinite(Number(zoomed?.innerHeight)) &&
    Number.isFinite(Number(zoomed?.devicePixelRatio)) &&
    isExpectedViewport({ width: Number(zoomed?.innerWidth), height: Number(zoomed?.innerHeight) }, expectedViewport.cssViewport || {}) &&
    Math.abs(Number(zoomed?.devicePixelRatio) - 2) <= RATIO_TOLERANCE;
  if (!baselineGeometryValid || !zoomedGeometryValid || !samePageGeometry(previousGeometry, zoomed) ||
      !samePageGeometry(cell?.windowsAutomation?.final, zoomed)) {
    errors.push(`${expectedId}: baseline or 200% viewport geometry is invalid`);
  }
  if (stableIdentity && (cell?.stableIdentity?.commit !== stableIdentity.commit || cell?.stableIdentity?.fingerprint !== stableIdentity.fingerprint)) {
    errors.push(`${expectedId}: stable worktree identity differs from the report`);
  }
  const surface = cell?.surface;
  const keyboard = surface?.keyboardTraversal;
  const keyboardComplete = keyboard?.complete === true && Number(keyboard?.expectedCount) > 0 &&
    keyboard?.visitedCount === keyboard?.expectedCount && Array.isArray(keyboard?.sequence) &&
    keyboard.sequence.length === keyboard.expectedCount && keyboard.sequence.every((entry) =>
      entry?.focusVisible === true && Number(entry?.outlineWidth) >= 2 && entry?.outlineStyle !== "none" &&
      entry?.fullyVisible === true && entry?.withinMain === true && entry?.obscuredByNavigation === false
    );
  const overflowX = Number(surface?.overflowX);
  if (!surface || !Number.isFinite(overflowX) || overflowX > 1 || surface.main?.horizontalOverflow !== 0 || surface.main?.maxLeft !== 0 ||
      surface.primary?.present !== true || surface.primary?.visible !== true || surface.primary?.reachable !== true ||
      surface.primary?.withinMain !== true || surface.primary?.obscuredByNavigation !== false ||
      !Array.isArray(surface.clippedOperationalText) || surface.clippedOperationalText.length !== 0 ||
      !Array.isArray(surface.unreadableOperationalText) || surface.unreadableOperationalText.length !== 0 || !keyboardComplete) {
    errors.push(`${expectedId}: task, overflow, clipping, navigation clearance, or keyboard evidence is incomplete`);
  }
  const expectedScreenshot = `${expectedViewport.id}-${expected?.scenario}-edge-toolbar-zoom200.png`;
  const expectedDiagnostic = `${expectedViewport.id}-${expected?.scenario}-edge-toolbar-zoom200-playwright-diagnostic.png`;
  const screenshotName = String(surface?.screenshot?.file || "").split(/[\\/]/).pop();
  const diagnosticName = String(surface?.playwrightDiagnosticScreenshot?.file || "").split(/[\\/]/).pop();
  if (!validScreenshotEvidence(surface?.screenshot) || !validScreenshotEvidence(surface?.playwrightDiagnosticScreenshot) ||
      screenshotName !== expectedScreenshot || diagnosticName !== expectedDiagnostic) {
    errors.push(`${expectedId}: screenshot hash/dimension evidence is incomplete`);
  }
  const captureDimensions = surface?.windowsCapture?.capture;
  const diagnosticDimensions = surface?.playwrightDiagnosticScreenshot?.dimensions;
  // Windows evidence is a physical capture of the headed Edge window, not a
  // CSS-pixel renderer dump.  On a bounded desktop surface its height can be
  // smaller than the zoomed CSS viewport while the separately hashed renderer
  // screenshot still proves the complete target geometry.
  if (!sameScreenshotDimensions(surface?.screenshot?.dimensions, captureDimensions)) {
    errors.push(`${expectedId}: Windows screenshot dimensions do not match its owned capture`);
  }
  if (Number(diagnosticDimensions?.width) !== Number(expectedViewport.cssViewport?.width) ||
      !Number.isInteger(Number(diagnosticDimensions?.height)) ||
      Number(diagnosticDimensions?.height) < Number(expectedViewport.cssViewport?.height)) {
    errors.push(`${expectedId}: renderer screenshot dimensions do not cover the target CSS viewport`);
  }
  if (String(surface?.screenshot?.sha256 || "").toLowerCase() === String(surface?.playwrightDiagnosticScreenshot?.sha256 || "").toLowerCase()) {
    errors.push(`${expectedId}: Windows and renderer screenshots reuse the same visual evidence hash`);
  }
  if (!validWindowsCapture(surface?.windowsCapture, windowHandle)) {
    errors.push(`${expectedId}: Windows-owned capture is invalid or bound to a different HWND`);
  }
  return errors;
}

function validateToolbarCells(cells, { requireComplete = true, stableIdentity = null } = {}) {
  const errors = [];
  if (!Array.isArray(cells)) return { pass: false, errors: ["cells must be an array"] };
  const requiredById = new Map(TOOLBAR_200_REQUIRED_CELLS.map((cell) => [toolbarCellId(cell), cell]));
  const ids = cells.map(toolbarCellId);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  const unexpected = ids.filter((id) => !requiredById.has(id));
  const missing = [...requiredById.keys()].filter((id) => !ids.includes(id));
  if (duplicates.length) errors.push(`duplicate required cell IDs: ${duplicates.join(", ")}`);
  if (unexpected.length) errors.push(`unexpected cell IDs: ${unexpected.join(", ")}`);
  if (requireComplete && missing.length) errors.push(`missing required cell IDs: ${missing.join(", ")}`);
  if (requireComplete && cells.length !== requiredById.size) errors.push(`required cell count is ${cells.length}/${requiredById.size}`);
  const visualHashes = new Map();
  for (const cell of cells) {
    const expected = requiredById.get(toolbarCellId(cell));
    if (expected) errors.push(...toolbarCellEvidenceErrors(cell, expected, stableIdentity));
    for (const [kind, evidence] of [
      ["Windows", cell?.surface?.screenshot],
      ["renderer", cell?.surface?.playwrightDiagnosticScreenshot],
    ]) {
      const hash = String(evidence?.sha256 || "").toLowerCase();
      if (!/^[0-9a-f]{64}$/.test(hash)) continue;
      const owner = `${toolbarCellId(cell)} ${kind}`;
      if (visualHashes.has(hash)) errors.push(`${owner}: screenshot hash is reused from ${visualHashes.get(hash)}`);
      else visualHashes.set(hash, owner);
    }
  }
  return { pass: errors.length === 0, errors };
}

function validateToolbarReportEvidence(report, currentIdentity = null) {
  const errors = [];
  if (!report || typeof report !== "object") return { pass: false, errors: ["report is missing"] };
  if (report.contract !== TOOLBAR_CONTRACT) errors.push(`contract is ${report.contract || "missing"}, expected ${TOOLBAR_CONTRACT}`);
  if (report.pass !== true || report.matrix?.complete !== true) errors.push("top-level pass and matrix.complete must both be true");
  const expectedIds = TOOLBAR_200_REQUIRED_CELLS.map(toolbarCellId);
  if (!sameStringList(report.matrix?.requiredCellIds, expectedIds)) errors.push("matrix.requiredCellIds must exactly match the ordered required matrix");
  const owner = report.ownerContract || {};
  if (owner.overview !== MOBILE_ORIGIN_OWNER.overview || owner.route !== MOBILE_ORIGIN_OWNER.route || owner.navigation !== MOBILE_ORIGIN_OWNER.navigation ||
      owner.desktopOverview !== DESKTOP_ORIGIN_OWNER.overview || owner.desktopRoute !== DESKTOP_ORIGIN_OWNER.route || owner.desktopNavigation !== DESKTOP_ORIGIN_OWNER.navigation) {
    errors.push("owner contract differs from the accepted mobile and wide-landscape browser owners");
  }
  const stable = report.stableIdentity || {};
  if (!/^[0-9a-f]{40}$/i.test(String(stable.commit || "")) || !/^[0-9a-f]{64}$/i.test(String(stable.fingerprint || ""))) {
    errors.push("stable worktree identity is missing or malformed");
  }
  const identity = report.identity || {};
  if (!/^[0-9a-f]{40}$/i.test(String(identity.commit || "")) || !/^[0-9a-f]{64}$/i.test(String(identity.worktreeFingerprint || "")) ||
      typeof identity.artifactKey !== "string" || identity.artifactKey.length === 0 || stable.commit !== identity.commit) {
    errors.push("report identity is malformed or differs from the stable cell identity");
  }
  const stableOfficial = stable.official || {};
  if (stableOfficial.commit !== identity.commit || stableOfficial.worktreeFingerprint !== identity.worktreeFingerprint ||
      stableOfficial.artifactKey !== identity.artifactKey || stableOfficial.worktreeClean !== identity.worktreeClean ||
      stableOfficial.releaseEvidenceEligible !== identity.releaseEvidenceEligible) {
    errors.push("stable evidence identity is not bound to the official worktree identity");
  }
  if (report.platform !== "win32") errors.push("toolbar evidence must be produced by Windows");
  if (currentIdentity) {
    if (identity.commit !== currentIdentity.commit || identity.worktreeFingerprint !== currentIdentity.worktreeFingerprint ||
        identity.artifactKey !== currentIdentity.artifactKey || identity.worktreeClean !== true || identity.releaseEvidenceEligible !== true ||
        currentIdentity.worktreeClean !== true || currentIdentity.releaseEvidenceEligible !== true) {
      errors.push("report is not bound to the current clean exact SHA");
    }
  }
  const cells = validateToolbarCells(report.cells, { requireComplete: true, stableIdentity: stable });
  errors.push(...cells.errors);
  const boundary = String(report.proofBoundary?.doesNotProve || "");
  if (!boundary.includes("iOS Dynamic Type") || !boundary.includes("CDP pageScale")) errors.push("proof boundary is incomplete");
  return { pass: errors.length === 0, errors };
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
    const validation = validateToolbarCells(partial.cells, { requireComplete: false, stableIdentity });
    return validation.pass ? partial.cells : [];
  } catch (_) {
    return [];
  }
}

function writePartialCells(identity, stableIdentity, cells) {
  const validation = validateToolbarCells(cells, { requireComplete: false, stableIdentity });
  assert(validation.pass, "refusing to persist invalid or duplicate partial Edge evidence", validation);
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
    capture?.pass === true && capture?.contract === "windows-edge-toolbar-zoom-v1" &&
    capture?.action === "capture" && capture?.captureOnly === true &&
    capture?.windowHandle === expectedHandle &&
    state?.foregroundHandle === expectedHandle && (screenProof || ownedRenderProof || visibleSegmentProof) &&
    Number(state?.sampleCount) >= 9 && state?.windowRect?.right > state?.windowRect?.left && state?.windowRect?.bottom > state?.windowRect?.top
  );
}

function runPythonToolbarZoom(title, { action = "inspect", capturePath = "", captureOnly = false, windowHandle = null, browserPid = null, timeoutMs = UI_ACTION_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const pythonCommand = process.env.PYTHON_EXECUTABLE || "python";
    const args = ["-B", pythonHelper, "--title", title, "--action", action, "--timeout-seconds", String(Math.ceil(timeoutMs / 1000))];
    if (captureOnly) args.push("--capture-only");
    if (capturePath) args.push("--capture-path", capturePath);
    if (Number.isInteger(windowHandle) && windowHandle > 0) args.push("--window-handle", String(windowHandle));
    if (Number.isInteger(browserPid) && browserPid > 0) args.push("--browser-pid", String(browserPid));
    const child = spawn(pythonCommand, args, {
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
      const diagnostic = Buffer.concat(stderr).toString("utf8").trim();
      if (diagnostic) process.stderr.write(`[edge-toolbar-child-diagnostic] ${diagnostic.slice(-4000)}\n`);
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

async function applyActualToolbarZoom(page, title, baseline, browserPid) {
  const baselineInspection = await runPythonToolbarZoom(title, { action: "inspect", browserPid });
  const baselineGeometry = await geometry(page);
  assert(
    Math.abs(baselineGeometry.devicePixelRatio - 1) <= 0.1 &&
      isExpectedViewport({ width: baselineGeometry.innerWidth, height: baselineGeometry.innerHeight }, { width: baseline.innerWidth, height: baseline.innerHeight }),
    "fresh owned Edge window did not retain its verified 100% baseline geometry",
    { baseline, baselineGeometry, baselineInspection },
  );
  const steps = [];
  let current = baselineGeometry;
  for (let step = 1; step <= TOOLBAR_INCREMENTS && !reachedTargetToolbarZoom(current, baseline); step += 1) {
    const input = await runPythonToolbarZoom(title, { action: TOOLBAR_ZOOM_ACTION, windowHandle: baselineInspection.windowHandle, browserPid });
    const transition = await waitForGeometryChange(page, current);
    const attempts = [{ action: TOOLBAR_ZOOM_ACTION, input, ...transition }];
    const accepted = acceptedZoomAttempt(attempts);
    assert(accepted, "process-owned Edge Zoom in invocation did not change page DPR or layout", { step, current, attempts });
    current = transition.after;
    steps.push({ step, attempts, acceptedAction: accepted.action, before: accepted.before, after: accepted.after });
  }
  assert(reachedTargetToolbarZoom(current, baseline), "real Edge toolbar probes did not reach the required 200% geometry within the bounded increment budget", { current, baseline, steps });
  return { pass: true, baselineInspection, windowHandle: baselineInspection.windowHandle, steps, final: current };
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
    mechanism: "Process-owned Windows UI Automation: a fresh headed Edge window first proves 100% geometry, then each Edge menu Zoom in invocation is accepted only after that page reports a real DPR/layout change",
    expectedPercent: 200,
    verifiedBaselinePercent: 100,
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

async function inspectSurface(page, { label, mainSelector, primarySelector, screenshotName, windowTitle, windowHandle, browserPid, identity, viewport }) {
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
  const windowsCapture = await runPythonToolbarZoom(windowTitle, { capturePath: windowsFile, captureOnly: true, windowHandle, browserPid });
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
      browserConnectionMode: "server",
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
    const browserPidValue = Number(runtime.managedBrowser?.diagnostics?.ownedBrowserPid || 0);
    const browserPid = Number.isInteger(browserPidValue) && browserPidValue > 0 ? browserPidValue : null;
    const title = `RouterPanel Edge Toolbar Zoom ${viewport.id} ${scenario} ${crypto.randomUUID()}`;
    await runtime.page.evaluate((value) => { document.title = value; }, title);
    const baseline = await geometry(runtime.page);
    assert(
      Math.abs(baseline.devicePixelRatio - 1) <= 0.1 && isExpectedViewport({ width: baseline.innerWidth, height: baseline.innerHeight }, baselineViewport),
      "headed Edge did not begin from the expected physical output baseline",
      { baseline, baselineViewport, viewport },
    );
    const windowsAutomation = await applyActualToolbarZoom(runtime.page, title, baseline, browserPid);
    const zoomed = windowsAutomation.final;
    const zoomLevel = toolbarZoomEvidence({ baseline, zoomed, automation: windowsAutomation, targetCssViewport: viewport.cssViewport });
    assert(zoomLevel.verified, "Edge toolbar did not produce the required verified 200% browser zoom level and target CSS viewport", { viewport, baseline, zoomed, zoomLevel, windowsAutomation });

    // Browser zoom changes the CSS viewport, so resolve the owner after zoom.
    // The resulting owner must still match the shared responsive contract;
    // wide landscape tablet cells are browser/workbench cells, never a sticky
    // mobile session carried across orientation or viewport changes.
    const browserSurface = await runtime.page.evaluate(() => {
      if (document.querySelector("main[data-desktop-overview], main[data-desktop-route]")) return "desktop";
      if (document.querySelector("main[data-mobile-reference-home], main[data-mobile-reference-workspace]")) return "mobile";
      return "unknown";
    });
    assert(browserSurface === expectedBaselineSurface, "Edge zoomed document did not expose the responsive-contract render owner", { viewport, expectedBaselineSurface, browserSurface, zoomed });
    const owner = browserSurface === "desktop" ? DESKTOP_ORIGIN_OWNER : MOBILE_ORIGIN_OWNER;

    runtime.mock.state.scenario = scenarioConfig.fixtureScenario;
    await visitRoute(runtime.page, runtime.mock.url, scenarioConfig.route, {
      requireWorkspace: scenarioConfig.surface !== "overview",
      runtimePhase: scenarioConfig.runtimePhase,
    });
    // Route navigation may update document.title (notably the interfaces
    // workspace). Restore the unique per-cell title before any further UIA
    // lookup so the HWND ownership proof remains bound to this Edge window.
    await runtime.page.evaluate((value) => { document.title = value; }, title);
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
      windowHandle: windowsAutomation.windowHandle,
      browserPid,
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
  const cellValidation = validateToolbarCells(orderedCells, { requireComplete: true, stableIdentity: stableIdentityAfter });
  const matrixComplete = cellValidation.pass;
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
      proves: "For each independent viewport/scenario cell, actual Microsoft Edge browser-toolbar 200% zoom: a fresh headed Edge window proved its 100% baseline geometry, then process-owned UI Automation invoked Edge's real menu Zoom in control. Every increment was accepted only after the owned page reported a real DPR or layout change; no global keyboard or physical mouse input was emitted. The page then verified DPR≈2, 2x layout ratios, the target CSS viewport, worktree identity, zero horizontal scroll range, visible operational-text clipping, main-scroll-root reachability, fixed-navigation clearance, complete ordered keyboard traversal, and Windows-owned visual evidence. The visual proof is an unobscured full-window screen grab when physically possible, an owner-rendered Windows DC image when supported, or a substantial unobscured physical monitor segment plus a separately hashed full Edge renderer screenshot for an oversized window.",
      doesNotProve: "iOS Dynamic Type, Android system font size, Windows OS font size, CSS-injected text resize, CDP pageScale, or behavior on a physical mobile device. A screen-visible-segment cell does not claim that the entire oversized OS window was simultaneously visible on one physical monitor; full-viewport geometry and the separately hashed Edge renderer screenshot provide the complementary evidence.",
    },
    timeout: { globalMs: GLOBAL_TIMEOUT_MS, perCellMs: CELL_TIMEOUT_MS, uiAutomationActionMs: UI_ACTION_TIMEOUT_MS, geometryTransitionMs: GEOMETRY_TRANSITION_TIMEOUT_MS },
    cells: orderedCells,
  };
  const reportValidation = validateToolbarReportEvidence(report);
  if (!reportValidation.pass) {
    report.pass = false;
    report.matrix.complete = false;
    report.validationErrors = reportValidation.errors;
  }
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ pass: report.pass, reportPath, artifactKey: identityAfter.artifactKey, cells: orderedCells.map(toolbarCellId), remaining: pendingToolbarCells(orderedCells).map(toolbarCellId) }, null, 2)}\n`);
  if (!report.pass) process.exitCode = 1;
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
  TOOLBAR_ZOOM_ACTION,
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
  expectedToolbarSurface,
  toolbarCellEvidenceErrors,
  validateToolbarCells,
  validateToolbarReportEvidence,
  stableEvidenceIdentity,
  pendingToolbarCells,
  parseMaxCells,
  toolbarScenarioConfig,
  toolbarReportReadiness,
  currentToolbarReportStatus,
  runCell,
};
