const fsp = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { LifecycleError, bounded, runBrowserLifecycle } = require("./acceptance/browser-lifecycle-v2/browser-lifecycle");
const {
  DESKTOP_RESOURCE_REPORT_CONTRACT,
  FOCUSED_REQUIRED_RUNTIME_FILES,
  captureProjectIdentity,
  createSourceRuntimeReportIdentity,
  readAttestedRuntimeFile,
  sourceRuntimeFileIdentity,
  validateCurrentSourceRuntimeReport,
} = require("./source-runtime-report-identity");

const root = path.resolve(__dirname, "..");
const outputDirectory = path.join(root, "_acceptance", "desktop-resource-density-v2");
const REPORT_CONTRACT = DESKTOP_RESOURCE_REPORT_CONTRACT;
const REQUIRED_RUNTIME_FILES = FOCUSED_REQUIRED_RUNTIME_FILES;
const GLOBAL_TIMEOUT_MS = 90_000;
const STEP_TIMEOUT_MS = 15_000;
const SOURCE_BUILD_TIMEOUT_MS = 25_000;
const CLEANUP_TIMEOUT_MS = 4_000;

function timestamps(now) {
  const end = Date.parse(now);
  return Array.from({ length: 6 }, (_, index) => new Date(end - (5 - index) * 5000).toISOString());
}

function resourceSamples(sampleTimestamps, cpu, memory, disk) {
  return sampleTimestamps.map((timestamp, index) => ({
    timestamp,
    cpu: cpu[index],
    memory: memory[index],
    disk: disk[index],
    source: "desktop-resource-density-v2",
    evidenceMode: "current",
  }));
}

function resourceFullSnapshot() {
  const now = new Date().toISOString();
  const sampleTimestamps = timestamps(now);
  const cpu = [88, 91, 94, 96, 96, 96];
  const memory = [86, 89, 90, 91, 92, 92];
  const disk = [91, 93, 95, 96, 97, 97];
  return {
    status: "ok",
    updatedAt: now,
    meta: {
      scaleScenario: "resource-full", target: "10.0.0.1", routerHost: "10.0.0.1", pollSeconds: 5,
      realtimeUpdatedAt: now, slowRestUpdatedAt: now, staticUpdatedAt: now,
      capabilities: { restTrusted: true, sshRead: true },
    },
    overview: {
      identity: "RouterOS", version: "7.15", boardName: "RB5009", uptime: "3d 4h",
      cpuLoad: 96, memoryUsage: 92, diskUsage: 97,
      history: {
        timestamps: sampleTimestamps,
        downlink: [4400, 5200, 6100, 7200, 6900, 7600], uplink: [1300, 1600, 1900, 2100, 2000, 2300],
        cpu, memory, disk,
        resourceSamples: resourceSamples(sampleTimestamps, cpu, memory, disk),
      },
    },
    wan: [{ name: "pppoe-out10", parent: "ether1", running: true, upRate: 1200, downRate: 3400 }],
    pppoe: [{ name: "pppoe-out10", parent: "ether1", running: true, upRate: 1200, downRate: 3400 }],
    interfaces: [{ name: "ether1", type: "ether", running: true, bridge: "bridge-lan", txRate: 82000000, rxRate: 48000000 }],
    routes: { defaultRoutes: [{ table: "main", gateway: "1.1.1.1", distance: 1, active: true, disabled: false }] },
    connections: { total: 54321, active: [{}, {}, {}, {}, {}, {}], topIps: [] },
    terminals: [{ name: "client-1", ip: "192.168.88.10", status: "online" }],
  };
}

async function buildSourceRuntime() {
  const runtimeDirectory = path.join(outputDirectory, "source-runtime");
  const { build } = await import("vite");
  const react = (await import("@vitejs/plugin-react")).default;
  await build({
    root, configFile: false, publicDir: false, plugins: [react()], define: { "process.env.NODE_ENV": JSON.stringify("production") },
    build: {
      outDir: runtimeDirectory, emptyOutDir: true, minify: false,
      lib: {
        entry: path.join(root, "src", "panel-framework", "desktop", "main.tsx"), name: "PanelFramework", formats: ["iife"],
        fileName: () => "panel-framework.js", cssFileName: "style",
      },
    },
  });
  const { build: buildCss } = require("esbuild");
  await buildCss({
    absWorkingDir: root,
    entryPoints: ["src/panel-framework/overview/desktop-overview/styles/desktop-overview-entry.css"],
    bundle: true, outfile: path.join(runtimeDirectory, "desktop-overview.css"), logLevel: "silent",
  });
  return runtimeDirectory;
}

function createRuntimeServer(runtimeDirectory, sourceRuntime) {
  const sockets = new Set();
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url || "/", "http://127.0.0.1").pathname;
    if (pathname === "/favicon.ico") {
      response.writeHead(204, { "Cache-Control": "no-store" });
      response.end();
      return;
    }
    if (pathname === "/") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      response.end("<!doctype html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><link rel=\"stylesheet\" href=\"/style.css\"><link rel=\"stylesheet\" href=\"/desktop-overview.css\" media=\"(min-width:1200px)\"></head><body><div id=\"app\"></div><script src=\"/panel-framework.js\"></script></body></html>");
      return;
    }
    try {
      const body = readAttestedRuntimeFile(runtimeDirectory, pathname, sourceRuntime);
      response.writeHead(200, { "Content-Type": pathname.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8", "Cache-Control": "no-store" });
      response.end(body);
    } catch (error) {
      response.writeHead(409, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
      response.end(String(error?.message || error));
    }
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  return {
    server,
    async close() {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
}

async function listen(runtimeServer) {
  const { server } = runtimeServer;
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return `http://127.0.0.1:${server.address().port}/`;
}

async function inspectViewport(page, viewport, screenshotPath) {
  await page.setViewportSize(viewport);
  await page.waitForFunction(() => document.querySelector("[data-desktop-overview]"), null, { timeout: 10000 }).catch(async (error) => {
    const diagnostics = await page.evaluate(() => ({ app: document.querySelector("#app")?.innerHTML.slice(0, 1200), body: document.body.innerText.slice(0, 600) }));
    throw new Error(`${error.message}\n${JSON.stringify(diagnostics)}`);
  });
  await page.waitForTimeout(120);
  const geometry = await page.evaluate(() => {
    const box = (node) => node ? Object.fromEntries(["left", "top", "right", "bottom", "width", "height"].map((key) => [key, node.getBoundingClientRect()[key]])) : null;
    const shell = document.querySelector("[data-desktop-overview]");
    const verdict = shell?.querySelector("[data-desktop-incident-verdict]");
    const summary = shell?.querySelector("[data-desktop-status-bus]");
    const workspace = shell?.querySelector("[data-desktop-object-list]");
    const resourceEvidence = shell?.querySelector("[data-desktop-resource-evidence]");
    const firstObject = workspace?.querySelector(".legacy-object-row");
    const inspectAction = shell?.querySelector(".legacy-focus-link");
    const resourceCards = [...(resourceEvidence?.querySelectorAll(".legacy-resource-card") || [])];
    const rightColumn = shell?.querySelector(".legacy-right-column");
    const rightChildren = rightColumn ? [...rightColumn.children].map((node) => ({
      landmark: node.getAttribute("data-desktop-resource-evidence") !== null ? "resource" : node.getAttribute("data-desktop-object-list") !== null ? "objects" : node.className,
      rect: box(node),
    })) : [];
    const gaps = rightChildren.slice(1).map((item, index) => Math.max(0, item.rect.top - rightChildren[index].rect.bottom));
    return {
      viewport: { width: innerWidth, height: innerHeight },
      shell: box(shell), verdict: box(verdict), summary: box(summary), workspace: box(workspace), resourceEvidence: box(resourceEvidence), firstObject: box(firstObject), inspectAction: box(inspectAction),
      resourceCards: resourceCards.map((node) => ({ rect: box(node), preserveAspectRatio: node.querySelector("svg")?.getAttribute("preserveAspectRatio") || "", text: node.textContent || "" })),
      resourceBeforeWorkspaceInDom: Boolean(
        resourceEvidence && workspace && (resourceEvidence.compareDocumentPosition(workspace) & Node.DOCUMENT_POSITION_FOLLOWING)
      ),
      rightChildren, gaps,
      scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    };
  });
  await page.screenshot({ path: screenshotPath, fullPage: false, animations: "disabled" });
  const viewportBottom = viewport.height;
  const checks = {
    desktopResourceScenario: await page.locator('[data-desktop-overview-scenario="resource-full"]').count() === 1,
    compactVerdictVisible: Boolean(geometry.verdict && geometry.verdict.top >= 0 && geometry.verdict.bottom <= viewportBottom),
    resourceEvidenceVisible: Boolean(geometry.resourceEvidence && geometry.resourceEvidence.top >= 0 && geometry.resourceEvidence.bottom <= viewportBottom),
    resourceTripletTruthful: geometry.resourceCards.length === 3 && geometry.resourceCards.every((card) => !/none/i.test(card.preserveAspectRatio) && /阈值/.test(card.text)),
    workspaceStartsInFixedFirstViewport: Boolean(geometry.workspace && geometry.workspace.top >= 0 && geometry.workspace.top < viewportBottom),
    firstObjectStartsInFixedFirstViewport: Boolean(geometry.firstObject && geometry.firstObject.top >= 0 && geometry.firstObject.top < viewportBottom),
    resourcePrecedesWorkspace: Boolean(
      geometry.workspace && geometry.resourceEvidence && geometry.resourceBeforeWorkspaceInDom &&
      geometry.resourceEvidence.top <= geometry.workspace.top,
    ),
    noReorderHole: geometry.gaps.every((gap) => gap <= 16),
    noHorizontalOverflow: geometry.scroll.width <= viewport.width + 1,
  };
  return { pass: Object.values(checks).every(Boolean), checks, geometry };
}

async function main() {
  const startIdentity = captureProjectIdentity(root);
  await bounded("desktop.output.mkdir", () => fsp.mkdir(outputDirectory, { recursive: true }), STEP_TIMEOUT_MS);
  // A source build already consumed 12.5s on this machine. It is preparation,
  // not browser scenario work, so keeping it inside scenario.run made the 15s
  // runtime bound fail before either viewport could be inspected.
  const sourceBuild = await bounded("desktop.source.build", () => buildSourceRuntime(), SOURCE_BUILD_TIMEOUT_MS);
  const runtimeDirectory = sourceBuild.value;
  const sourceRuntime = sourceRuntimeFileIdentity(runtimeDirectory, REQUIRED_RUNTIME_FILES);
  const buildIdentity = captureProjectIdentity(root);
  const browserIdentity = captureProjectIdentity(root);
  const outcome = await runBrowserLifecycle({
    globalTimeoutMs: GLOBAL_TIMEOUT_MS,
    stepTimeoutMs: STEP_TIMEOUT_MS,
    cleanupTimeoutMs: CLEANUP_TIMEOUT_MS,
  }, async ({ context, page, registerCleanup, signal }) => {
    if (signal.aborted) throw signal.reason || new LifecycleError("STEP_ABORTED", "desktop source build aborted");
    const server = createRuntimeServer(runtimeDirectory, sourceRuntime);
    registerCleanup("runtime-server.close", () => server.close(), CLEANUP_TIMEOUT_MS);
    const url = (await bounded("desktop.runtime.listen", () => listen(server), STEP_TIMEOUT_MS)).value;
    await bounded("desktop.snapshot.inject", () => context.addInitScript((snapshot) => { window.__PANEL_TEST_SNAPSHOT__ = snapshot; }, resourceFullSnapshot()), STEP_TIMEOUT_MS);
    const pageErrors = [];
    const consoleErrors = [];
    const requestErrors = [];
    const requestFailures = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    page.on("response", (response) => {
      if (response.status() >= 400) requestErrors.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
      });
    });
    page.on("requestfailed", (request) => requestFailures.push({
      url: request.url(),
      method: request.method(),
      errorText: request.failure()?.errorText || "request failed",
    }));
    await bounded("desktop.page.goto", () => page.goto(url, { waitUntil: "domcontentloaded" }), STEP_TIMEOUT_MS);
    const viewports = [{ width: 1366, height: 768 }, { width: 1440, height: 900 }];
    const results = [];
    try {
      for (const viewport of viewports) {
        const stem = `resource-full-${viewport.width}x${viewport.height}`;
        results.push({
          viewport,
          ...((await bounded(`desktop.inspect.${viewport.width}x${viewport.height}`, () => inspectViewport(page, viewport, path.join(outputDirectory, `${stem}.png`)), STEP_TIMEOUT_MS)).value),
        });
      }
    } catch (error) {
      throw new Error(`${error.message}\npageErrors=${JSON.stringify(pageErrors)}\nconsoleErrors=${JSON.stringify(consoleErrors)}`);
    }
    const stagePass = results.every((result) => result.pass) &&
      pageErrors.length === 0 && consoleErrors.length === 0 &&
      requestErrors.length === 0 && requestFailures.length === 0;
    const endIdentity = captureProjectIdentity(root);
    const report = {
      pass: stagePass,
      complete: stagePass,
      stagePass,
      contract: REPORT_CONTRACT,
      phase: "browser",
      generatedAt: new Date().toISOString(),
      runtime: "vite-source-playwright",
      source: "src/panel-framework/overview/desktop-overview/LegacyDesktopOverview.tsx",
      sourceBuildElapsedMs: sourceBuild.elapsedMs,
      identity: createSourceRuntimeReportIdentity({
        runtimeDirectory,
        requiredFiles: REQUIRED_RUNTIME_FILES,
        start: startIdentity,
        build: buildIdentity,
        browser: browserIdentity,
        end: endIdentity,
        sourceRuntime,
      }),
      pageErrors, consoleErrors, requestErrors, requestFailures,
      results,
    };
    const identityValidation = validateCurrentSourceRuntimeReport(report, {
      rootDir: root,
      runtimeDirectory,
      requiredFiles: REQUIRED_RUNTIME_FILES,
      expectedContract: REPORT_CONTRACT,
      currentIdentity: endIdentity,
    });
    report.pass = identityValidation.pass;
    report.complete = identityValidation.complete;
    report.identityValidation = identityValidation;
    await bounded("desktop.report.write", () => fsp.writeFile(path.join(outputDirectory, "report.json"), JSON.stringify(report, null, 2), "utf8"), STEP_TIMEOUT_MS);
    return report;
  });
  if (!outcome.ok) {
    throw new Error(`${outcome.error?.message || "desktop resource density lifecycle failed"}\n${JSON.stringify(outcome.diagnostics, null, 2)}`);
  }
  console.log(JSON.stringify(outcome.result, null, 2));
  if (!outcome.result.pass) process.exitCode = 1;
}

if (require.main === module) {
  main().then(
    () => process.exit(process.exitCode || 0),
    (error) => { console.error(error.stack || String(error)); process.exit(1); },
  );
}

module.exports = { REPORT_CONTRACT, REQUIRED_RUNTIME_FILES };
