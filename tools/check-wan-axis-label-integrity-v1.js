const fs = require("node:fs");
const fsp = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright-core");

const root = path.resolve(__dirname, "..");
const outputDirectory = path.join(root, "_acceptance", "wan-axis-label-integrity-v1");
const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

function timestamps(now) {
  const end = Date.parse(now);
  return Array.from({ length: 6 }, (_, index) => new Date(end - (5 - index) * 5000).toISOString());
}

function wanSnapshot() {
  const now = new Date().toISOString();
  const samples = timestamps(now);
  const downlink = [24_000_000, 27_500_000, 26_000_000, 30_000_000, 29_000_000, 31_250_000];
  const uplink = [4_500_000, 5_500_000, 5_000_000, 6_000_000, 5_750_000, 6_250_000];
  return {
    status: "ok", updatedAt: now,
    meta: {
      scaleScenario: "single", target: "10.0.0.1", routerHost: "10.0.0.1", pollSeconds: 5,
      realtimeUpdatedAt: now, slowRestUpdatedAt: now, staticUpdatedAt: now,
      capabilities: { restTrusted: true, sshRead: true },
    },
    overview: {
      identity: "RouterOS", version: "7.15", boardName: "RB5009", uptime: "3d 4h",
      cpuLoad: 42, memoryUsage: 51, diskUsage: 31,
      history: {
        timestamps: samples, downlink, uplink,
        trafficSamples: samples.map((timestamp, index) => ({ timestamp, downlink: downlink[index], uplink: uplink[index], source: "wan-axis-probe", evidenceMode: "current" })),
        cpu: [36, 39, 38, 41, 40, 42], memory: [47, 48, 49, 50, 50, 51], disk: [31, 31, 31, 31, 31, 31],
      },
    },
    wan: [{ name: "pppoe-out10", parent: "ether1", running: true, upRate: 6_250_000, downRate: 31_250_000, routes: [{ active: true, disabled: false }] }],
    pppoe: [{ name: "pppoe-out10", parent: "ether1", running: true, upRate: 6_250_000, downRate: 31_250_000 }],
    interfaces: [{ name: "ether1", type: "ether", running: true, bridge: "bridge-lan", txRate: 82_000_000, rxRate: 48_000_000 }],
    routes: { defaultRoutes: [{ table: "main", gateway: "1.1.1.1", distance: 1, active: true, disabled: false }] },
    connections: { total: 1234, active: [{}, {}], topIps: [{}] }, terminals: [{ name: "client-1", ip: "192.168.88.10", status: "online" }],
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
        entry: path.join(root, "src", "panel-framework", "main.tsx"), name: "PanelFramework", formats: ["iife"],
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

function createRuntimeServer(runtimeDirectory) {
  return http.createServer((request, response) => {
    const pathname = new URL(request.url || "/", "http://127.0.0.1").pathname;
    if (pathname === "/") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      response.end("<!doctype html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><link rel=\"stylesheet\" href=\"/style.css\"><link rel=\"stylesheet\" href=\"/desktop-overview.css\" media=\"(min-width:1200px)\"></head><body><div id=\"app\"></div><script src=\"/panel-framework.js\"></script></body></html>");
      return;
    }
    const file = path.resolve(runtimeDirectory, `.${pathname}`);
    if (!file.startsWith(runtimeDirectory + path.sep) || !fs.existsSync(file)) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { "Content-Type": pathname.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8", "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(response);
  });
}

async function listen(server) {
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return `http://127.0.0.1:${server.address().port}/`;
}

async function main() {
  await fsp.mkdir(outputDirectory, { recursive: true });
  const runtimeDirectory = await buildSourceRuntime();
  const server = createRuntimeServer(runtimeDirectory);
  const url = await listen(server);
  let browser;
  let context;
  try {
    const browserPath = browserCandidates.find((candidate) => fs.existsSync(candidate));
    if (!browserPath) throw new Error("Edge/Chrome executable not found");
    browser = await chromium.launch({ executablePath: browserPath, headless: true });
    context = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
    await context.addInitScript((snapshot) => { window.__PANEL_TEST_SNAPSHOT__ = snapshot; }, wanSnapshot());
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-chart-peak-label]"));
    await page.waitForTimeout(120);
    const geometry = await page.evaluate(() => {
      const toRect = (value) => value ? Object.fromEntries(["left", "top", "right", "bottom", "width", "height"].map((key) => [key, value[key]])) : null;
      return [...document.querySelectorAll("[data-chart-peak-label]")].map((label) => {
        const svg = label.ownerSVGElement;
        const chart = label.closest(".legacy-chart");
        const bbox = label.getBBox();
        const viewBox = svg?.viewBox.baseVal;
        return {
          direction: chart?.getAttribute("data-chart-direction") || "",
          label: label.textContent?.trim() || "",
          bbox: bbox ? { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height } : null,
          viewBox: viewBox ? { x: viewBox.x, y: viewBox.y, width: viewBox.width, height: viewBox.height } : null,
          labelRect: toRect(label.getBoundingClientRect()), svgRect: toRect(svg?.getBoundingClientRect()), chartRect: toRect(chart?.getBoundingClientRect()),
          axisLeft: Number(svg?.getAttribute("data-axis-left") || 0), axisLabelGap: Number(svg?.getAttribute("data-axis-label-gap") || 0),
        };
      });
    });
    await page.screenshot({ path: path.join(outputDirectory, "wan-31.25-mbps-1366x768.png"), fullPage: false, animations: "disabled" });
    const byDirection = (direction) => geometry.filter((item) => item.direction === direction);
    const everyGeometry = (predicate) => geometry.length >= 2 && geometry.every(predicate);
    const checks = {
      directionPeaksAreExact: byDirection("up").length >= 1 && byDirection("up").every((item) => item.label === "6.25 Mbps")
        && byDirection("down").length >= 1 && byDirection("down").every((item) => item.label === "31.25 Mbps"),
      leftWanUsesCurrentEvidence: await page.locator(".legacy-wan-rate-summary .legacy-wan-rate-card").count() === 2,
      bboxInsideViewBox: everyGeometry((item) => Boolean(item.bbox && item.viewBox && item.bbox.x >= -0.5 && item.bbox.x + item.bbox.width <= item.viewBox.width + 0.5)),
      domRectInsideSvg: everyGeometry((item) => Boolean(item.labelRect && item.svgRect && item.labelRect.left >= item.svgRect.left - 0.5 && item.labelRect.right <= item.svgRect.right + 0.5)),
      domRectInsideChartContainer: everyGeometry((item) => Boolean(item.labelRect && item.chartRect && item.labelRect.left >= item.chartRect.left - 0.5 && item.labelRect.right <= item.chartRect.right + 0.5)),
      labelHasPositiveAxisGap: everyGeometry((item) => item.axisLeft > item.axisLabelGap && item.axisLabelGap >= 12),
    };
    const report = { pass: Object.values(checks).every(Boolean), contract: "wan-axis-label-integrity-v2-legacy-ipad", runtime: "vite-source-playwright", geometry, checks };
    await fsp.writeFile(path.join(outputDirectory, "report.json"), JSON.stringify(report, null, 2), "utf8");
    console.log(JSON.stringify(report, null, 2));
    if (!report.pass) process.exitCode = 1;
  } finally {
    await context?.close();
    await browser?.close();
    await server.close();
  }
}

main().then(
  () => process.exit(process.exitCode || 0),
  (error) => { console.error(error.stack || String(error)); process.exit(1); },
);
