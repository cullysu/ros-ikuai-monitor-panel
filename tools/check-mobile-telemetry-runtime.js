#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  ACTION_TIMEOUT_MS,
  closeRuntime,
  launchRuntime,
  login,
  withTimeout,
} = require("./acceptance/accessibility-v2/runtime");
const { gitWorktreeIdentity } = require("./worktree-runtime-identity");
const {
  assertNoCriticalEllipsis,
  inspectMobileTelemetryConnection,
  inspectMobileTelemetryOverview,
  inspectMobileTelemetryRoute,
} = require("./acceptance/inspect-mobile-telemetry");

const root = path.resolve(__dirname, "..");
const contract = "mobile-telemetry-runtime-v1";
const args = new Set(process.argv.slice(2));
const full = args.has("--full");
const smoke = args.has("--smoke");
const artifactDir = path.join(root, "_acceptance", "mobile-telemetry-runtime");
const scenarios = [
  { id: "single", mock: "" },
  { id: "fleet", mock: "fleet-coverage" },
  { id: "all-offline", mock: "all-offline" },
  { id: "no-snapshot", mock: "no-snapshot" },
  { id: "collection-down", mock: "collection-down" },
  { id: "resource-full", mock: "resource-full" },
  { id: "interfaces-down", mock: "interfaces-down" },
];
const viewports = [
  { id: "phone320", width: 320, height: 568 },
  { id: "phone390", width: 390, height: 844 },
  { id: "phone430", width: 430, height: 932 },
  { id: "landscape667", width: 667, height: 375 },
  { id: "landscape844", width: 844, height: 390 },
  { id: "tablet768", width: 768, height: 1024 },
  { id: "tablet1199", width: 1199, height: 900 },
];
const accessibilityRoutes = [
  { route: 'overview', selector: '[data-mobile-pulse-overview]' },
  { route: 'interfaces', selector: '[data-panel-route-content="interfaces"]' },
  { route: 'lineStatus', selector: '[data-panel-route-content="lineStatus"]' },
  { route: 'balance', selector: '[data-panel-route-content="balance"]' },
  { route: 'routes', selector: '[data-panel-route-content="routes"]' },
  { route: 'terminals', selector: '[data-panel-route-content="terminals"]' },
  { route: 'dhcp', selector: '[data-panel-route-content="dhcp"]' },
  { route: 'arp', selector: '[data-panel-route-content="arp"]' },
  { route: 'trafficLoad', selector: '[data-panel-route-content="trafficLoad"]' },
  { route: 'loadAudit', selector: '[data-panel-route-content="loadAudit"]' },
  { route: 'trafficAudit', selector: '[data-panel-route-content="trafficAudit"]' },
  { route: 'connections', selector: '[data-panel-route-content="connections"]' },
  { route: 'dns4', selector: '[data-panel-route-content="dns4"]' },
  { route: 'dns6', selector: '[data-panel-route-content="dns6"]' },
  { route: 'security', selector: '[data-panel-route-content="security"]' },
  { route: 'logs', selector: '[data-panel-route-content="logs"]' },
  { route: 'serviceLogs', selector: '[data-panel-route-content="serviceLogs"]' },
  { route: 'readonlyDiagnostics', selector: '[data-panel-route-content="readonlyDiagnostics"]' },
];
const matrix = full
  ? scenarios.flatMap((scenario) => viewports.map((viewport) => ({ scenario, viewport })))
  : [
    { scenario: scenarios[0], viewport: viewports[0] },
    { scenario: scenarios[3], viewport: viewports[1] },
    { scenario: scenarios[5], viewport: viewports[5] },
    { scenario: scenarios[6], viewport: viewports[4] },
  ];
const runTimeout = full ? 600_000 : 180_000;

function serialise(error) {
  return { name: error?.name || "Error", message: String(error?.message || error), stack: String(error?.stack || "").split("\n").slice(0, 6).join("\n") };
}

function sameIdentity(left, right) {
  return Boolean(left && right && left.commit === right.commit && left.artifactKey === right.artifactKey && left.worktreeFingerprint === right.worktreeFingerprint);
}

function urlFor(baseUrl, section, objectId = null) {
  const url = new URL(baseUrl);
  url.searchParams.set("section", section);
  if (objectId) url.searchParams.set("object", objectId); else url.searchParams.delete("object");
  url.hash = "";
  return url.toString();
}

async function waitForTelemetryOverview(page, scenario) {
  const expectedScene = scenario === "single" || scenario === "fleet" ? "none" : scenario === "no-snapshot" ? "evidence" : scenario === "collection-down" ? "collection" : scenario === "all-offline" ? "wan" : scenario === "resource-full" ? "resource" : "interfaces";
  const root = page.locator("[data-mobile-pulse-overview]");
  await root.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  await page.waitForFunction((expected) => document.querySelector("[data-mobile-pulse-overview]")?.getAttribute("data-origin-scene") === expected, expectedScene, { timeout: ACTION_TIMEOUT_MS });
}

async function openOverview(runtime, cell) {
  runtime.mock.state.scenario = cell.scenario.mock;
  await runtime.page.setViewportSize(cell.viewport);
  await runtime.page.goto(urlFor(runtime.mock.url, "overview"), { waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  await waitForTelemetryOverview(runtime.page, cell.scenario.id);
}

function assertOverviewCell(cell, observation) {
  if (!observation.root) throw new Error("telemetry overview root is absent");
  if (observation.oldOwner) throw new Error("rejected mobile-next owner is visible");
  const expectedScene = cell.scenario.id === "single" || cell.scenario.id === "fleet" ? "none" : cell.scenario.id === "no-snapshot" ? "evidence" : cell.scenario.id === "collection-down" ? "collection" : cell.scenario.id === "all-offline" ? "wan" : cell.scenario.id === "resource-full" ? "resource" : "interfaces";
  if (observation.scene !== expectedScene) throw new Error(`scenario mismatch: ${observation.scene}`);
  if (!observation.canvasKind || !observation.canvas) throw new Error("telemetry canvas is not visible");
  if (observation.overflowX > 1) throw new Error(`horizontal overflow ${observation.overflowX}`);
  if (observation.navButtons.length !== 4) throw new Error(`expected four stable bottom tabs, received ${observation.navButtons.length}`);
  const undersized = observation.controls.filter((item) => !item.label || !item.rect || item.rect.width < 44 || item.rect.height < 44);
  if (undersized.length) throw new Error(`invalid mobile controls ${JSON.stringify(undersized.slice(0, 4))}`);
  if (cell.viewport.id === "phone320") assertNoCriticalEllipsis(observation, "320px");
  if (cell.viewport.id.startsWith("landscape")) {
    if (!observation.taskWorkspace || !observation.selectedDetail) throw new Error("landscape must expose an independent two-pane patrol composition");
    const navTop = observation.nav?.top ?? cell.viewport.height;
    const evidence = expectedScene === "none" ? observation.selectedEvidenceBox : observation.priorityObjectBox;
    if (!evidence || evidence.top >= Math.min(evidence.bottom, navTop)) {
      throw new Error(expectedScene === "none" ? "landscape current evidence is not visible before navigation" : "landscape priority object is not visible before navigation");
    }
    const horizontal = observation.navButtons.every((item) => item.rect && item.rect.width >= 44 && item.rect.height >= 44)
      && new Set(observation.navButtons.map((item) => Math.round(item.rect.top))).size <= 2;
    if (!horizontal) throw new Error("landscape navigation is not a horizontal bottom tab bar");
  }
  if (cell.viewport.id.startsWith("tablet")) {
    if (!observation.taskWorkspace || !observation.selectedDetail) throw new Error("tablet must expose a phone-native split patrol composition");
    if (expectedScene !== "none" && !observation.inspectorBox) throw new Error("tablet incident must expose a selected-object inspector");
    if (observation.canvas.width < 240 || observation.factBoxes.some((box) => !box || box.width < 110)) {
      throw new Error("tablet capability continuity collapsed below usable evidence geometry");
    }
  }
  if (cell.viewport.id.startsWith("phone") && !observation.phoneSurface) throw new Error("phone-native briefing surface is absent");
  if (["single", "fleet"].includes(cell.scenario.id) && !observation.hasTraffic) throw new Error("current normal scene must expose its aligned traffic evidence");
  if (cell.viewport.id.startsWith("phone") && !["single", "fleet"].includes(cell.scenario.id) && observation.incidentPlane.length === 0) {
    throw new Error(`${cell.scenario.id} has no state-specific phone incident plane`);
  }
  if (cell.scenario.id === "no-snapshot") {
    if (observation.canvasKind !== "incident" || observation.hasTraffic) throw new Error("no-snapshot must replace traffic/WAN with an incident plane");
    if (observation.factValues.some((value) => /(?:\d+(?:\.\d+)?\s*(?:Mbps|Kbps|Gbps|bps|%))|(?:\b\d+\/\d+\s*运行)/i.test(value))) {
      throw new Error("no-snapshot exposes a business number");
    }
  }
  if (["all-offline", "collection-down", "resource-full", "interfaces-down"].includes(cell.scenario.id) && observation.canvasKind !== "incident") {
    throw new Error(`${cell.scenario.id} must use a distinct incident plane`);
  }
}

async function inspectRouteDetailHistory(runtime) {
  const page = runtime.page;
  runtime.mock.state.scenario = "";
  await page.setViewportSize(viewports.find((item) => item.id === "phone390"));
  await page.goto(urlFor(runtime.mock.url, "interfaces"), { waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  await page.locator('[data-panel-route-content="interfaces"].origin-route').waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  const initial = await inspectMobileTelemetryRoute(page, "interfaces");
  if (!initial.root || !initial.hasRow || initial.hasDetail) throw new Error(`interfaces route is not a selectable object list: ${JSON.stringify(initial)}`);
  await page.screenshot({ path: path.join(artifactDir, "route-interfaces-phone390.png"), fullPage: true });
  await page.locator('[data-panel-route-content="interfaces"] .origin-group li > button').first().click();
  await page.locator("[data-origin-detail]").waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  const opened = await inspectMobileTelemetryRoute(page, "interfaces");
  if (!opened.hasDetail) throw new Error("object row did not open a distinct evidence detail");
  await page.screenshot({ path: path.join(artifactDir, "detail-interface-phone390.png"), fullPage: true });
  await page.locator('[data-origin-detail] button[aria-label="返回对象列表"]').click();
  await page.waitForFunction(() => !new URLSearchParams(location.search).has("object"), null, { timeout: ACTION_TIMEOUT_MS });
  await page.locator('[data-panel-route-content="interfaces"].origin-route').waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  const explicitBack = await inspectMobileTelemetryRoute(page, "interfaces");
  if (explicitBack.hasDetail) throw new Error("explicit detail Back did not return to the object list");
  const returnedObjectId = await page.evaluate(() => new URLSearchParams(location.search).get("object"));
  if (returnedObjectId) throw new Error(`explicit detail Back retained object context: ${returnedObjectId}`);
  await page.goForward({ waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  await page.locator("[data-origin-detail]").waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  const forwardedObjectId = await page.evaluate(() => new URLSearchParams(location.search).get("object"));
  if (!forwardedObjectId) throw new Error("browser Forward did not restore the explicit detail object context");
  await page.goBack({ waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  await page.locator('[data-panel-route-content="interfaces"].origin-route').waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  const browserBack = await inspectMobileTelemetryRoute(page, "interfaces");
  if (browserBack.hasDetail) throw new Error("browser Back did not close evidence detail");
  await page.goForward({ waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  await page.locator("[data-origin-detail]").waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  return { initial, opened, explicitBack, forwardAfterExplicitBack: { objectId: forwardedObjectId }, browserBack, forwardAfterBrowserBack: true };
}

async function inspectRouteAccessibility(runtime) {
  const page = runtime.page;
  runtime.mock.state.scenario = "";
  await page.setViewportSize(viewports.find((item) => item.id === "phone390"));
  const results = [];
  for (const specification of accessibilityRoutes) {
    await page.goto(urlFor(runtime.mock.url, specification.route), { waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
    if (specification.route === "overview") {
      await waitForTelemetryOverview(page, "single");
      const observation = await inspectMobileTelemetryOverview(page);
      assertOverviewCell({ scenario: scenarios[0], viewport: viewports[1] }, observation);
      results.push({ route: specification.route, observation, semantics: { currentTelemetryOwner: true } });
      continue;
    }
    const routeRoot = page.locator(`${specification.selector}.origin-route`);
    await routeRoot.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
    const observation = await inspectMobileTelemetryRoute(page, specification.route);
    if (!observation.root || observation.route !== specification.route || !observation.title) {
      throw new Error(`${specification.route} has no current mobile route landmark/title: ${JSON.stringify(observation)}`);
    }
    if (observation.overflowX > 1) throw new Error(`${specification.route} horizontally overflows by ${observation.overflowX}px`);
    const undersized = observation.controls.filter((control) => !control.label || control.width < 44 || control.height < 44);
    if (undersized.length) throw new Error(`${specification.route} has inaccessible controls: ${JSON.stringify(undersized.slice(0, 4))}`);
    const semantics = await routeRoot.evaluate((root) => {
      const title = root.querySelector("[data-panel-route-title]");
      const missingControls = [...root.querySelectorAll("[aria-controls]")]
        .map((node) => node.getAttribute("aria-controls"))
        .filter((id) => id && !document.getElementById(id));
      const unlabeledRows = [...root.querySelectorAll(".origin-group li > button")]
        .filter((node) => !(node.getAttribute("aria-label") || "").trim()).length;
      return {
        mainLandmark: root.tagName === "MAIN",
        titleProgrammaticallyFocusable: title instanceof HTMLElement && title.tabIndex === -1,
        missingControls,
        unlabeledRows,
      };
    });
    if (!semantics.mainLandmark || !semantics.titleProgrammaticallyFocusable || semantics.missingControls.length || semantics.unlabeledRows) {
      throw new Error(`${specification.route} accessibility semantics failed: ${JSON.stringify(semantics)}`);
    }
    results.push({ route: specification.route, observation, semantics });
  }
  return { required: accessibilityRoutes.length, completed: results.length, routes: results };
}

async function inspectMoreWorkflow(runtime) {
  const page = runtime.page;
  await page.goto(urlFor(runtime.mock.url, "overview"), { waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  await waitForTelemetryOverview(page, "single");
  await page.locator("[data-panel-runtime-more]").click();
  await page.locator('[data-panel-route-content="more"].origin-route').waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  const more = await inspectMobileTelemetryRoute(page, "more");
  if (more.navigation.context !== "more" || more.navigation.selected.length !== 0) {
    throw new Error(`More must expose truthful context without a false selected primary tab: ${JSON.stringify(more.navigation)}`);
  }
  await page.screenshot({ path: path.join(artifactDir, "route-more-phone390.png"), fullPage: true });
  const first = page.locator('[data-panel-route-content="more"] button[data-section]').first();
  if (!await first.count()) throw new Error("More has no grouped task destination");
  await first.click();
  await page.waitForFunction(() => new URLSearchParams(location.search).get("section") !== "more", null, { timeout: ACTION_TIMEOUT_MS });
  const destination = await page.evaluate(() => new URLSearchParams(location.search).get("section"));
  const destinationRoute = await inspectMobileTelemetryRoute(page, destination);
  if (destinationRoute.navigation.context !== destination || destinationRoute.navigation.selected.length !== 0) {
    throw new Error(`secondary route must expose truthful context without a false selected primary tab: ${JSON.stringify(destinationRoute.navigation)}`);
  }
  await page.goBack({ waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  await page.locator('[data-panel-route-content="more"].origin-route').waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  return { destination, returnToMore: true };
}

async function inspectConnectionSecurity(runtime) {
  const page = runtime.page;
  await page.setViewportSize(viewports.find((item) => item.id === "phone390"));
  await page.goto(urlFor(runtime.mock.url, "overview"), { waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  const root = page.locator("[data-mobile-pulse-connection]");
  if (!await root.isVisible().catch(() => false)) {
    const trigger = page.locator('[data-panel-runtime-toolbar="mobile"] button[aria-label="设备连接"]');
    await trigger.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
    await trigger.click();
  }
  await root.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  const before = await inspectMobileTelemetryConnection(page);
  if (!before.root || !before.form || before.oldOwner || before.overflowX > 1) throw new Error(`telemetry connection owner is invalid: ${JSON.stringify(before)}`);
  await page.screenshot({ path: path.join(artifactDir, "connection-phone390.png"), fullPage: true });
  const undersized = before.controls.filter((item) => !item.label || item.width < 44 || item.height < 44);
  if (undersized.length) throw new Error(`telemetry connection undersized controls: ${JSON.stringify(undersized.slice(0, 4))}`);
  await root.locator('input[name="host"]').fill("https://invalid.example");
  await root.locator('input[name="user"]').fill("observer");
  await root.locator('input[name="password"]').fill("not-sent");
  await root.locator('button[type="submit"]').click();
  const alert = root.locator('[role="alert"]');
  await alert.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  const message = (await alert.textContent() || "").replace(/\s+/g, " ").trim();
  if (!/协议|地址|主机名/.test(message)) throw new Error(`connection did not reject a protocol-bearing host: ${message}`);
  return { before, invalidAddressRejected: message, restOnlyInitiallyHidden: !before.restOnly };
}

function staleReportReason(report, identity) {
  if (!report || typeof report !== "object") return "existing report is unreadable";
  if (report.artifactKey !== identity.artifactKey || report.commit !== identity.commit || report.worktreeFingerprint !== identity.worktreeFingerprint) return "existing report does not identify the current source";
  return "";
}

function invalidateStaleReport(identity) {
  if (smoke) return null;
  const reportPath = path.join(artifactDir, "report.json");
  if (!fs.existsSync(reportPath)) return null;
  try {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    const reason = staleReportReason(report, identity);
    if (!reason) return null;
    fs.writeFileSync(reportPath, `${JSON.stringify({ ...report, pass: false, runtimePass: false, complete: false, releasePass: false, releaseEvidenceEligible: false, stale: true, staleReason: reason }, null, 2)}\n`);
    return reason;
  } catch (error) {
    return String(error?.message || error);
  }
}

async function main() {
  const startedAt = Date.now();
  const identityAtStart = gitWorktreeIdentity(root);
  const invalidatedPreviousReport = invalidateStaleReport(identityAtStart);
  const cells = [];
  let runtime = null;
  let workflows = { routeDetailHistory: null, routeAccessibility: null, more: null, connection: null };
  try {
    runtime = await launchRuntime({ viewport: viewports[1] });
    await login(runtime.page, runtime.mock.url);
    fs.mkdirSync(artifactDir, { recursive: true });
    for (const cell of matrix) {
      let observation = null;
      let error = null;
      try {
        await openOverview(runtime, cell);
        observation = await inspectMobileTelemetryOverview(runtime.page);
        assertOverviewCell(cell, observation);
        const screenshot = path.join(artifactDir, `${cell.scenario.id}-${cell.viewport.id}-overview.png`);
        await runtime.page.screenshot({ path: screenshot, fullPage: true });
        observation.screenshot = path.relative(root, screenshot).replace(/\\/g, "/");
      } catch (failure) {
        error = serialise(failure);
      }
      cells.push({ scenario: cell.scenario.id, viewport: cell.viewport, pass: !error, observation, error });
    }
    for (const [name, action] of Object.entries({
      routeDetailHistory: () => inspectRouteDetailHistory(runtime),
      routeAccessibility: () => inspectRouteAccessibility(runtime),
      more: () => inspectMoreWorkflow(runtime),
      connection: () => inspectConnectionSecurity(runtime),
    })) {
      try { workflows[name] = { pass: true, evidence: await action(), error: null }; }
      catch (error) { workflows[name] = { pass: false, evidence: null, error: serialise(error) }; }
    }
  } finally {
    if (runtime) await closeRuntime(runtime);
  }
  const identityAtEnd = gitWorktreeIdentity(root);
  const freshness = sameIdentity(identityAtStart, identityAtEnd);
  const complete = cells.length === matrix.length && cells.every((cell) => cell.pass) && Object.values(workflows).every((workflow) => workflow?.pass) && freshness;
  const runtimePass = complete;
  const releaseEvidenceEligible = Boolean(full && runtimePass && identityAtEnd.releaseEvidenceEligible);
  const releasePass = Boolean(runtimePass && releaseEvidenceEligible);
  const pass = releasePass;
  const report = {
    pass,
    runtimePass,
    complete,
    releasePass,
    contract,
    source: "mobile-telemetry-runtime",
    releaseEvidenceEligible,
    generatedAt: new Date().toISOString(),
    commit: identityAtEnd.commit,
    artifactKey: identityAtEnd.artifactKey,
    worktreeFingerprint: identityAtEnd.worktreeFingerprint,
    stale: !freshness,
    freshness: { pass: freshness, invalidatedPreviousReport, started: identityAtStart, finished: identityAtEnd },
    matrix: { required: matrix.length, completed: cells.length, scenarios: scenarios.map((item) => item.id), viewports: viewports.map((item) => item.id), mode: full ? "full" : "smoke" },
    cells,
    workflows,
    elapsedMs: Date.now() - startedAt,
  };
  if (!smoke) {
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(path.join(artifactDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify({ pass, runtimePass: report.runtimePass, complete: report.complete, releasePass: report.releasePass, releaseEvidenceEligible: report.releaseEvidenceEligible, contract, matrix: report.matrix, failedCells: cells.filter((cell) => !cell.pass).map((cell) => ({ scenario: cell.scenario, viewport: cell.viewport.id, error: cell.error })), workflows, elapsedMs: report.elapsedMs }, null, 2));
  if (!report.runtimePass) process.exitCode = 1;
}

withTimeout("mobile telemetry runtime", main(), runTimeout).catch((error) => {
  console.error(JSON.stringify({ pass: false, runtimePass: false, complete: false, releasePass: false, releaseEvidenceEligible: false, contract, error: serialise(error) }, null, 2));
  process.exitCode = 1;
});
