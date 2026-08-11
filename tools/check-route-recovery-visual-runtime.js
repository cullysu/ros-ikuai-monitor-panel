#!/usr/bin/env node
"use strict";

// Production-browser acceptance for every route-specific evidence-recovery
// boundary.  It intentionally serves public/ and injects the existing shared
// release snapshots before the bundle mounts; it never substitutes a test UI.

const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { buildSnapshot } = require("./local-predeploy-check");
const {
  bounded,
  browserExecutable,
  launchManagedBrowser,
  writeDiagnostic,
} = require("./acceptance/browser-lifecycle-v2/browser-lifecycle");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const actionTimeoutMs = 12_000;
const cleanupTimeoutMs = 8_000;
const launchTimeoutMs = 15_000;

const routes = Object.freeze([
  "interfaces", "lineStatus", "balance", "routes", "terminals", "dhcp", "arp",
  "trafficLoad", "loadAudit", "trafficAudit", "connections", "dns4", "dns6",
  "security", "logs", "serviceLogs", "readonlyDiagnostics",
]);
const states = Object.freeze(["partial", "historical", "unavailable"]);
const viewports = Object.freeze([
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1366, height: 768 },
]);

function errorDetail(error) {
  return {
    name: error?.name || "Error",
    code: error?.code || null,
    message: String(error?.message || error),
    stack: String(error?.stack || "").split("\n").slice(0, 8).join("\n"),
  };
}

function assert(condition, message, detail) {
  if (!condition) {
    const error = new Error(message);
    error.detail = detail || null;
    throw error;
  }
}

function cellId(route, state, viewport) {
  return `${route}--${state}--${viewport.width}x${viewport.height}`;
}

function parseOutputDirectory() {
  const flag = process.argv.indexOf("--out");
  if (flag === -1) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return path.join(root, "_acceptance", "route-recovery-visual-runtime", stamp);
  }
  assert(flag + 1 < process.argv.length, "--out requires a directory");
  assert(process.argv.length === 4, "only --out <directory> is supported");
  return path.resolve(root, process.argv[flag + 1]);
}

function mimeType(file) {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".json")) return "application/json; charset=utf-8";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

async function startProductionAssetServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url || "/", "http://127.0.0.1").pathname;
      const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
      const candidate = path.resolve(publicDir, relative);
      if (candidate !== path.join(publicDir, "index.html") && !candidate.startsWith(publicDir + path.sep)) {
        response.writeHead(403).end();
        return;
      }
      let file = candidate;
      try {
        if (!(await fsp.stat(file)).isFile()) throw new Error("not a production asset");
      } catch {
        file = path.join(publicDir, "index.html");
      }
      const body = await fsp.readFile(file);
      response.writeHead(200, {
        "Content-Type": mimeType(file),
        "Content-Length": body.length,
        "Cache-Control": "no-store",
      });
      response.end(body);
    } catch (error) {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(String(error?.message || error));
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address === "object", "production asset server did not receive a TCP address");
  return {
    url: `http://127.0.0.1:${address.port}/`,
    stop: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    }),
  };
}

function sharedFixture(route, state) {
  if (state === "historical") return { name: "shared-private-collection-down", snapshot: buildSnapshot("private", "collection-down") };
  if (state === "unavailable") return { name: "shared-private-no-snapshot", snapshot: buildSnapshot("private", "no-snapshot") };
  return { name: `shared-private-fleet-withheld-${route}`, snapshot: partialSnapshot(route) };
}

function partialSnapshot(route) {
  const snapshot = structuredClone(buildSnapshot("private", "fleet"));
  // These are deliberately small omissions from the shared fleet scenario.
  // They keep a real current snapshot and the route's other evidence intact,
  // while exercising the renderer's existing partial-evidence contract.
  switch (route) {
    case "interfaces": delete snapshot.interfaces; break;
    case "lineStatus": delete snapshot.wan; delete snapshot.pppoe; break;
    case "balance": delete snapshot.loadBalance?.distribution; break;
    case "routes": delete snapshot.routes; break;
    case "terminals": delete snapshot.terminals; break;
    case "dhcp": delete snapshot.dhcp?.clients; break;
    case "arp": delete snapshot.arp?.alerts; break;
    case "trafficLoad":
    case "loadAudit": snapshot.overview.cpuLoad = null; break;
    case "trafficAudit": delete snapshot.connections?.protocolTop; break;
    case "connections": delete snapshot.connections?.active; break;
    case "dns4": delete snapshot.dns?.forwardRules; break;
    case "dns6": delete snapshot.dns?.ipv6Nd; break;
    case "security": delete snapshot.security?.alerts; break;
    case "logs":
      delete snapshot.logs?.all;
      delete snapshot.logs?.system;
      delete snapshot.logs?.firewall;
      delete snapshot.logs?.dhcp;
      delete snapshot.logs?.dns;
      break;
    case "serviceLogs":
      delete snapshot.logs?.system;
      delete snapshot.logs?.firewall;
      delete snapshot.logs?.dhcp;
      delete snapshot.logs?.dns;
      break;
    case "readonlyDiagnostics":
      delete snapshot.meta.detailEndpointFailures;
      delete snapshot.meta.connectionDetailError;
      delete snapshot.meta.connectionDetailUpdatedAt;
      break;
    default: throw new Error(`unsupported recovery route: ${route}`);
  }
  return snapshot;
}

function routeUrl(baseUrl, route) {
  const target = new URL(baseUrl);
  target.searchParams.set("section", route);
  return target.toString();
}

async function inspectCell(managedBrowser, baseUrl, route, state, viewport, outDir) {
  const id = cellId(route, state, viewport);
  const fixture = sharedFixture(route, state);
  let context = null;
  let page = null;
  const pageErrors = [];
  try {
    context = (await bounded(`${id}.context.create`, () => managedBrowser.openContext({
      viewport,
      screen: viewport,
      deviceScaleFactor: 1,
      isMobile: viewport.width < 768,
      hasTouch: true,
    }), launchTimeoutMs)).value;
    await bounded(`${id}.fixture.inject`, () => context.addInitScript((snapshot) => {
      window.__PANEL_TEST_SNAPSHOT__ = snapshot;
    }, fixture.snapshot), actionTimeoutMs);
    page = (await bounded(`${id}.page.create`, () => context.newPage(), actionTimeoutMs)).value;
    page.setDefaultTimeout(actionTimeoutMs);
    page.setDefaultNavigationTimeout(actionTimeoutMs);
    page.on("pageerror", (error) => pageErrors.push(errorDetail(error)));

    await bounded(`${id}.open`, () => page.goto(routeUrl(baseUrl, route), { waitUntil: "domcontentloaded" }), actionTimeoutMs);
    const boundary = page.locator(`[data-route-recovery="${route}"]`);
    await bounded(`${id}.boundary.wait`, () => boundary.waitFor(), actionTimeoutMs);
    await bounded(`${id}.boundary.visible`, () => boundary.scrollIntoViewIfNeeded(), actionTimeoutMs);

    const screenshotFile = `${id}--original.png`;
    const screenshotPath = path.join(outDir, screenshotFile);
    await bounded(`${id}.screenshot`, () => page.screenshot({
      path: screenshotPath,
      fullPage: false,
      animations: "disabled",
      timeout: actionTimeoutMs,
    }), actionTimeoutMs);
    const screenshotBytes = await fsp.readFile(screenshotPath);
    assert(screenshotBytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "capture is not a PNG", { id, screenshotFile });

    const initial = (await bounded(`${id}.geometry`, () => page.evaluate((expected) => {
      const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
      const visible = (rect) => Boolean(rect && rect.width > 0 && rect.height > 0 && rect.right >= 0 && rect.left <= innerWidth && rect.bottom >= 0 && rect.top <= innerHeight);
      const recovery = document.querySelector(`[data-route-recovery="${expected.route}"]`);
      const actions = [...(recovery?.querySelectorAll("button[data-route-recovery-action]") || [])].map((button) => {
        const rect = button.getBoundingClientRect();
        return {
          target: button.getAttribute("data-route-recovery-action") || "",
          level: button.getAttribute("data-route-recovery-action-level") || "",
          text: normalize(button.textContent),
          rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
          visible: visible(rect),
          centerHitsSelf: document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === button || button.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)),
        };
      });
      const workspace = document.querySelector(`[data-mobile-domain-evidence-workspace="${expected.route}"]`);
      const workspaceFacts = workspace
        ? [...workspace.querySelectorAll("[data-mobile-evidence-workspace-fact]")].map((fact) => ({
          key: fact.getAttribute("data-mobile-evidence-workspace-fact") || "",
          label: normalize(fact.querySelector("small")?.textContent),
          value: normalize(fact.querySelector("b")?.textContent),
          visible: visible(fact.getBoundingClientRect()),
        }))
        : [];
      const rows = [...document.querySelectorAll("[data-mobile-row-id]")];
      const genericEmpty = document.querySelector(".mdw-empty");
      const lastRow = rows.length ? rows[rows.length - 1] : null;
      const recoveryRect = recovery?.getBoundingClientRect();
      return {
        route: new URL(location.href).searchParams.get("section"),
        state: recovery?.getAttribute("data-route-recovery-state") || "",
        recoveryVisible: visible(recoveryRect),
        recoveryRect: recoveryRect ? { left: recoveryRect.left, right: recoveryRect.right, top: recoveryRect.top, bottom: recoveryRect.bottom } : null,
        actions,
        workspace: workspace ? {
          route: workspace.getAttribute("data-mobile-domain-evidence-workspace") || "",
          mode: workspace.getAttribute("data-mobile-evidence-workspace-mode") || "",
          actionOwner: workspace.getAttribute("data-mobile-evidence-workspace-actions") || "",
          facts: workspaceFacts,
          visible: visible(workspace.getBoundingClientRect()),
        } : null,
        rowCount: rows.length,
        visibleRowCount: rows.filter((row) => visible(row.getBoundingClientRect())).length,
        genericEmptyVisible: Boolean(genericEmpty && visible(genericEmpty.getBoundingClientRect())),
        recoveryAfterLastRow: lastRow
          ? Boolean(lastRow.compareDocumentPosition(recovery) & Node.DOCUMENT_POSITION_FOLLOWING)
          : null,
        overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
        loadedAssets: [...document.scripts].map((script) => script.src).filter(Boolean),
      };
    }, { route, state }), actionTimeoutMs)).value;

    assert(initial.route === route && initial.state === state && initial.recoveryVisible, "RouteEvidenceBoundary did not render the required state", { id, initial });
    assert(initial.overflowX <= 1, "page has horizontal overflow", { id, overflowX: initial.overflowX });
    assert(initial.recoveryRect && initial.recoveryRect.left >= -1 && initial.recoveryRect.right <= viewport.width + 1, "recovery boundary is clipped horizontally", { id, recoveryRect: initial.recoveryRect, viewport });
    assert(initial.loadedAssets.length > 0 && initial.loadedAssets.every((asset) => asset.startsWith(baseUrl)), "page did not use the served production public assets", { id, assets: initial.loadedAssets });
    assert(initial.actions.length === 2, "recovery boundary does not expose exactly two next actions", { id, actions: initial.actions });
    assert(new Set(initial.actions.map((action) => action.target)).size === 2, "recovery next-action targets are not distinct", { id, actions: initial.actions });
    assert(initial.actions.every((action) => routes.includes(action.target) && action.target !== route && action.target !== "more" && action.text && action.visible && action.centerHitsSelf && action.rect.width >= 44 && action.rect.height >= 44 && action.rect.left >= -1 && action.rect.right <= viewport.width + 1), "recovery actions fail route, touch geometry, or clipping requirements", { id, actions: initial.actions });

    const primaryActions = initial.actions.filter((action) => action.level === "primary");
    const secondaryActions = initial.actions.filter((action) => action.level === "secondary");
    const actionLevelsAreKnown = initial.actions.every((action) => action.level === "primary" || action.level === "secondary");
    assert(actionLevelsAreKnown, "recovery actions expose an unknown action level", { id, state, actions: initial.actions });
    if (state === "partial" || state === "unavailable") {
      assert(primaryActions.length === 1, "partial/unavailable recovery must expose exactly one primary action", { id, state, actions: initial.actions });
      assert(secondaryActions.length === 1, "partial/unavailable recovery must retain exactly one secondary action", { id, state, actions: initial.actions });
      assert(primaryActions[0].rect.width >= 44 && primaryActions[0].rect.height >= 44, "primary recovery action does not meet the 44px touch target", { id, state, action: primaryActions[0] });
    } else {
      assert(primaryActions.length === 0 && secondaryActions.length === 2, "historical recovery must stay advisory and keep both actions secondary", { id, state, actions: initial.actions });
    }

    const mobileOrTablet = viewport.width < 1200;
    if (mobileOrTablet && (state === "partial" || state === "unavailable")) {
      assert(!initial.genericEmptyVisible, "empty recovery state must use the evidence workspace instead of a generic empty illustration", { id, state, initial });
    }
    if (mobileOrTablet && initial.rowCount === 0) {
      assert(initial.workspace?.visible, "empty recovery state is missing its visible evidence workspace", { id, state, initial });
      // Recovery state and evidence time mode are separate contracts. A
      // partial collection can be current, whereas unavailable/historical
      // evidence retains its corresponding time mode.
      const expectedWorkspaceMode = state === "partial" ? "current" : state;
      assert(
        initial.workspace.route === route && initial.workspace.mode === expectedWorkspaceMode,
        "evidence workspace route/evidence mode does not match the recovery contract",
        { id, state, expectedWorkspaceMode, workspace: initial.workspace },
      );
      assert(initial.workspace.actionOwner === "recovery-boundary", "evidence workspace must keep investigation actions owned by the adjacent recovery boundary", { id, state, workspace: initial.workspace });
      const expectedFacts = new Map([
        ["missing", "缺失范围"],
        ["impact", "影响边界"],
        ["last-success", "最近成功业务快照"],
        ["collection", "当前集合"],
      ]);
      const actualFacts = new Map(initial.workspace.facts.map((fact) => [fact.key, fact]));
      assert(
        actualFacts.size === expectedFacts.size
          && [...expectedFacts].every(([key, label]) => {
            const fact = actualFacts.get(key);
            return fact?.label === label && fact.visible && Boolean(fact.value);
          }),
        "evidence workspace must provide the four semantic recovery facts (missing scope, impact boundary, last successful business snapshot, current collection)",
        { id, state, facts: initial.workspace.facts },
      );
    }
    if (state === "historical" && initial.rowCount > 0) {
      assert(initial.recoveryAfterLastRow === true, "historical recovery guidance must follow inspectable records instead of pushing them below advisory copy", { id, initial });
    }

    const action = primaryActions[0] || secondaryActions[0];
    await bounded(`${id}.action.navigate`, () => page.locator(`[data-route-recovery="${route}"] button[data-route-recovery-action="${action.target}"]`).click(), actionTimeoutMs);
    await bounded(`${id}.action.destination`, () => page.waitForFunction(({ target, source }) => {
      const current = new URL(location.href);
      return current.searchParams.get("section") === target && current.searchParams.get("from") === source && Boolean(current.searchParams.get("evidenceAt"));
    }, { target: action.target, source: route }), actionTimeoutMs);
    const destinationUrl = page.url();

    await bounded(`${id}.history.back`, () => page.goBack({ waitUntil: "domcontentloaded" }), actionTimeoutMs);
    await bounded(`${id}.history.restore`, () => page.waitForFunction(({ source, expectedState }) => {
      const current = new URL(location.href);
      const recovery = document.querySelector(`[data-route-recovery="${source}"]`);
      return current.searchParams.get("section") === source && recovery?.getAttribute("data-route-recovery-state") === expectedState;
    }, { source: route, expectedState: state }), actionTimeoutMs);
    const restored = await page.evaluate((source) => {
      const recovery = document.querySelector(`[data-route-recovery="${source}"]`);
      return {
        url: location.href,
        state: recovery?.getAttribute("data-route-recovery-state") || "",
        actionLevels: [...(recovery?.querySelectorAll("button[data-route-recovery-action]") || [])].map((button) => ({
          target: button.getAttribute("data-route-recovery-action") || "",
          level: button.getAttribute("data-route-recovery-action-level") || "",
        })),
        overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
      };
    }, route);
    assert(restored.overflowX <= 1, "Back restoration introduced horizontal overflow", { id, restored });
    assert(
      JSON.stringify(restored.actionLevels) === JSON.stringify(initial.actions.map((item) => ({ target: item.target, level: item.level }))),
      "Back restoration changed the route/state/action contract",
      { id, initialActions: initial.actions, restored },
    );

    await bounded(`${id}.history.forward`, () => page.goForward({ waitUntil: "domcontentloaded" }), actionTimeoutMs);
    await bounded(`${id}.history.forward-context`, () => page.waitForFunction((expectedUrl) => location.href === expectedUrl, destinationUrl), actionTimeoutMs);
    assert(pageErrors.length === 0, "browser emitted page runtime errors", { id, pageErrors });

    return {
      id,
      pass: true,
      route,
      state,
      viewport,
      fixture: fixture.name,
      screenshot: { file: screenshotFile, sha256: crypto.createHash("sha256").update(screenshotBytes).digest("hex") },
      initial,
      navigation: { target: action.target, destinationUrl, restored, forwardUrl: page.url() },
      pageErrors,
    };
  } catch (error) {
    return { id, pass: false, route, state, viewport, fixture: fixture.name, error: errorDetail(error), detail: error?.detail || null, pageErrors };
  } finally {
    if (context) {
      try {
        await bounded(`${id}.context.close`, () => context.close(), cleanupTimeoutMs);
      } catch (cleanupError) {
        // Cleanup is evidence, never a hidden best-effort result.
        if (page) pageErrors.push(errorDetail(cleanupError));
        throw cleanupError;
      }
    }
  }
}

async function main() {
  const outDir = parseOutputDirectory();
  const requiredCells = routes.flatMap((route) => states.flatMap((state) => viewports.map((viewport) => ({ id: cellId(route, state, viewport), route, state, viewport }))));
  const reportPath = path.join(outDir, "report.json");
  const cleanup = [];
  const cells = [];
  let server = null;
  let managedBrowser = null;
  let fatal = null;
  const startedAt = new Date().toISOString();

  try {
    assert(fs.existsSync(path.join(publicDir, "index.html")), "production public/index.html is missing");
    assert(fs.existsSync(path.join(publicDir, "assets", "framework", "manifest.json")), "production framework manifest is missing");
    assert(browserExecutable(), "Edge/Chrome executable was not found");
    await fsp.mkdir(outDir, { recursive: true });
    server = await startProductionAssetServer();
    managedBrowser = (await bounded("route-recovery.browser.launch", () => launchManagedBrowser({
      executablePath: browserExecutable(),
      args: ["--disable-background-networking", "--disable-component-update"],
      launchTimeoutMs,
      cleanupTimeoutMs,
    }), launchTimeoutMs)).value;

    for (const required of requiredCells) {
      try {
        cells.push(await inspectCell(managedBrowser, server.url, required.route, required.state, required.viewport, outDir));
      } catch (error) {
        cells.push({ ...required, pass: false, error: errorDetail(error), cleanupFailure: true });
      }
    }
  } catch (error) {
    fatal = errorDetail(error);
  } finally {
    if (managedBrowser) {
      try {
        await bounded("route-recovery.browser.close", () => managedBrowser.close(), cleanupTimeoutMs * 3);
        cleanup.push({ label: "managed-browser.close", pass: true, diagnostics: managedBrowser.diagnostics });
      } catch (error) {
        cleanup.push({ label: "managed-browser.close", pass: false, error: errorDetail(error), diagnostics: managedBrowser.diagnostics });
      }
    }
    if (server) {
      try {
        await bounded("route-recovery.asset-server.stop", () => server.stop(), cleanupTimeoutMs);
        cleanup.push({ label: "production-asset-server.stop", pass: true });
      } catch (error) {
        cleanup.push({ label: "production-asset-server.stop", pass: false, error: errorDetail(error) });
      }
    }
  }

  const captured = new Set(cells.filter((cell) => cell.pass && cell.screenshot?.file).map((cell) => cell.id));
  const missingCells = requiredCells.filter((required) => !captured.has(required.id));
  const blockingChecks = {
    noFatalError: !fatal,
    requiredMatrixComplete: missingCells.length === 0 && cells.length === requiredCells.length,
    everyRequiredCellPassed: cells.length === requiredCells.length && cells.every((cell) => cell.pass),
    cleanupPassed: cleanup.every((item) => item.pass),
  };
  const report = {
    contract: "route-recovery-production-visual-runtime-v1",
    source: "current-production-public-assets-with-shared-release-scenario-fixtures",
    startedAt,
    finishedAt: new Date().toISOString(),
    requiredCellCount: requiredCells.length,
    capturedCellCount: captured.size,
    pass: Object.values(blockingChecks).every(Boolean),
    fatal,
    blockingChecks,
    matrix: { routes, states, viewports, requiredCells, cells, missingCells },
    cleanup,
  };
  await fsp.mkdir(outDir, { recursive: true });
  writeDiagnostic(reportPath, report);
  const summary = `${JSON.stringify({ pass: report.pass, report: path.relative(root, reportPath).replace(/\\/g, "/"), captured: report.capturedCellCount, required: report.requiredCellCount }, null, 2)}\n`;
  process.stdout.write(summary, () => process.exit(report.pass ? 0 : 1));
}

main().catch((error) => {
  process.stderr.write(`${error?.stack || error}\n`, () => process.exit(1));
});
