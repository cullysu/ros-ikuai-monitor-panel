const fs = require('fs/promises');
const nodeFs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright-core');
const { inspectOverviewDesktopLayout } = require('./acceptance/inspect-overview-desktop-layout');

const lifecycle = {
  browser: null,
  context: null,
  server: null,
};

function arg(name, fallback = '') {
  const direct = process.argv.find((item) => item.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1] || fallback;
  return fallback;
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.png') return 'image/png';
  if (ext === '.svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

function isPathInside(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === '' || (
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function safePublicFile(publicRoot, reqUrl) {
  const resolvedPublicRoot = path.resolve(publicRoot);
  const parsed = new URL(reqUrl, 'http://127.0.0.1');
  const raw = decodeURIComponent(parsed.pathname === '/' ? '/index.html' : parsed.pathname);
  const resolved = path.resolve(resolvedPublicRoot, `.${raw}`);
  if (!isPathInside(resolvedPublicRoot, resolved)) return null;
  if (nodeFs.existsSync(resolved) && nodeFs.statSync(resolved).isDirectory()) {
    return path.join(resolved, 'index.html');
  }
  return resolved;
}

function createStaticServer(publicRoot) {
  return http.createServer((req, res) => {
    const file = safePublicFile(publicRoot, req.url || '/');
    if (!file || !nodeFs.existsSync(file) || !nodeFs.statSync(file).isFile()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType(file), 'Cache-Control': 'no-store' });
    nodeFs.createReadStream(file).pipe(res);
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
}

async function closeServer(server) {
  if (!server) return;
  await new Promise((resolve) => {
    try {
      server.close(() => resolve());
    } catch {
      resolve();
    }
  });
}

async function cleanupRuntime() {
  const context = lifecycle.context;
  const browser = lifecycle.browser;
  const server = lifecycle.server;
  lifecycle.context = null;
  lifecycle.browser = null;
  lifecycle.server = null;
  if (context) await context.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  await closeServer(server);
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function sampleTimestamps(now, count = 6, intervalMs = 5000) {
  const end = Date.parse(now);
  return Array.from(
    { length: count },
    (_, index) => new Date(end - (count - index - 1) * intervalMs).toISOString(),
  );
}

function resourceFullSnapshot() {
  const now = new Date().toISOString();
  return {
    status: 'ok',
    updatedAt: now,
    meta: {
      scaleScenario: 'resource-full',
      target: '10.0.0.1',
      routerHost: '10.0.0.1',
      pollSeconds: 5,
      realtimeUpdatedAt: now,
      slowRestUpdatedAt: now,
      staticUpdatedAt: now,
      capabilities: { restTrusted: true, sshRead: true }
    },
    overview: {
      identity: 'RouterOS',
      version: '7.15',
      boardName: 'RB5009',
      uptime: '3d 4h',
      cpuLoad: 96,
      memoryUsage: 92,
      diskUsage: 97,
      history: {
        timestamps: sampleTimestamps(now),
        downlink: [4400, 5200, 6100, 7200, 6900, 7600],
        uplink: [1300, 1600, 1900, 2100, 2000, 2300],
        cpu: [88, 91, 94, 96, 96, 96],
        memory: [86, 89, 90, 91, 92, 92],
        disk: [91, 93, 95, 96, 97, 97]
      }
    },
    wan: [{ name: 'pppoe-out10', parent: 'ether1', running: true, upRate: 1200, downRate: 3400 }],
    pppoe: [{ name: 'pppoe-out10', parent: 'ether1', running: true, upRate: 1200, downRate: 3400 }],
    interfaces: [
      { name: 'ether1', type: 'ether', running: true, bridge: 'bridge-lan', txRate: 82000000, rxRate: 48000000 },
      { name: 'ether2', type: 'ether', running: true, bridge: 'bridge-lan', txRate: 42000000, rxRate: 28000000 },
      { name: 'sfp1', type: 'sfp', running: true, bridge: 'bridge-core', txRate: 120000000, rxRate: 76000000 }
    ],
    routes: { defaultRoutes: [{ table: 'main', gateway: '1.1.1.1', distance: 1, active: true, disabled: false }] },
    connections: { total: 54321, active: [{}, {}, {}, {}, {}, {}, {}, {}], topIps: [] },
    terminals: [{ name: 'client-1', ip: '192.168.88.10', status: 'online' }],
    dns: { cache: 'warm', pressure: 'high' }
  };
}

function balanceSnapshot() {
  const now = new Date().toISOString();
  return {
    status: 'ok',
    updatedAt: now,
    meta: {
      scaleScenario: 'single',
      target: '10.0.0.1',
      routerHost: '10.0.0.1',
      pollSeconds: 5,
      realtimeUpdatedAt: now,
      slowRestUpdatedAt: now,
      staticUpdatedAt: now,
      capabilities: { restTrusted: true, sshRead: true }
    },
    overview: {
      identity: 'RouterOS',
      version: '7.15',
      boardName: 'RB5009',
      uptime: '3d 4h',
      cpuLoad: 42,
      memoryUsage: 51,
      diskUsage: 31,
      history: {
        timestamps: sampleTimestamps(now),
        downlink: [4200, 5100, 4700, 5900, 5600, 6200],
        uplink: [1500, 1800, 1650, 2050, 1900, 2100],
        cpu: [36, 39, 38, 41, 40, 42],
        memory: [47, 48, 49, 50, 50, 51],
        disk: [31, 31, 31, 31, 31, 31]
      }
    },
    wan: [
      { name: 'pppoe-out10', parent: 'ether1', running: true, upRate: 1200, downRate: 3400, routes: [{ active: true, disabled: false }] },
      { name: 'pppoe-out20', parent: 'ether2', running: true, upRate: 900, downRate: 2800, routes: [] }
    ],
    pppoe: [
      { name: 'pppoe-out10', parent: 'ether1', running: true, upRate: 1200, downRate: 3400 },
      { name: 'pppoe-out20', parent: 'ether2', running: true, upRate: 900, downRate: 2800 }
    ],
    interfaces: [
      { name: 'ether1', type: 'ether', running: true, bridge: 'bridge-lan', txRate: 82000000, rxRate: 48000000 },
      { name: 'ether2', type: 'ether', running: true, bridge: 'bridge-lan', txRate: 42000000, rxRate: 28000000 }
    ],
    routes: {
      defaultRoutes: [
        { table: 'main', gateway: '1.1.1.1', distance: 1, active: true, disabled: false },
        { table: 'main', gateway: '2.2.2.2', distance: 2, active: false, disabled: false }
      ]
    },
    connections: { total: 1234, active: [{}, {}], topIps: [{}] },
    terminals: [{ name: 'client-1', ip: '192.168.88.10', status: 'online' }]
  };
}

function accumulatingTrafficSnapshot() {
  const snapshot = balanceSnapshot();
  delete snapshot.overview.history.timestamps;
  return snapshot;
}

function allOfflineSnapshot() {
  const now = new Date().toISOString();
  return {
    status: 'ok',
    updatedAt: now,
    meta: {
      scaleScenario: 'all-offline',
      target: '10.0.0.1',
      routerHost: '10.0.0.1',
      pollSeconds: 5,
      realtimeUpdatedAt: now,
      slowRestUpdatedAt: now,
      staticUpdatedAt: now,
      capabilities: { restTrusted: true, sshRead: true }
    },
    overview: {
      identity: 'RouterOS',
      version: '7.15',
      boardName: 'RB5009',
      uptime: '3d 4h',
      cpuLoad: 38,
      memoryUsage: 46,
      diskUsage: 28
    },
    wan: [
      { name: 'pppoe-out10', parent: 'ether1', running: false, upRate: 0, downRate: 0, routes: [{ active: false, disabled: false }] },
      { name: 'pppoe-out20', parent: 'ether2', running: false, upRate: 0, downRate: 0, routes: [] },
      { name: 'pppoe-out30', parent: 'ether3', running: false, upRate: 0, downRate: 0, routes: [] },
      { name: 'pppoe-out40', parent: 'ether4', running: false, upRate: 0, downRate: 0, routes: [] }
    ],
    pppoe: [
      { name: 'pppoe-out10', parent: 'ether1', running: false, upRate: 0, downRate: 0 },
      { name: 'pppoe-out20', parent: 'ether2', running: false, upRate: 0, downRate: 0 },
      { name: 'pppoe-out30', parent: 'ether3', running: false, upRate: 0, downRate: 0 },
      { name: 'pppoe-out40', parent: 'ether4', running: false, upRate: 0, downRate: 0 }
    ],
    interfaces: [
      { name: 'ether1', type: 'ether', running: true, bridge: 'bridge-wan' },
      { name: 'ether2', type: 'ether', running: true, bridge: 'bridge-wan' },
      { name: 'ether3', type: 'ether', running: true, bridge: 'bridge-wan' },
      { name: 'ether4', type: 'ether', running: true, bridge: 'bridge-wan' }
    ],
    routes: {
      defaultRoutes: [
        { table: 'main', gateway: 'pppoe-out10', distance: 1, active: false, disabled: false },
        { table: 'main', gateway: 'pppoe-out20', distance: 2, active: false, disabled: false }
      ]
    },
    connections: { total: 48, active: [], topIps: [] },
    terminals: [
      { name: 'workstation-1', ip: '192.168.88.20', status: 'online' },
      { name: 'nas-1', ip: '192.168.88.30', status: 'online' }
    ]
  };
}

function noSnapshotSnapshot() {
  const now = new Date().toISOString();
  return {
    status: 'error',
    error: 'RouterOS current snapshot unavailable',
    updatedAt: now,
    meta: {
      scaleScenario: 'no-snapshot',
      target: '10.0.0.1',
      routerHost: '10.0.0.1',
      pollSeconds: 5,
      realtimeUpdatedAt: now,
      staticUpdatedAt: now,
      realtimeError: 'current snapshot unavailable',
      slowRestError: 'business snapshot unavailable',
      capabilities: { restTrusted: false, sshRead: false }
    },
    overview: {},
    wan: [],
    pppoe: [],
    interfaces: [],
    routes: { defaultRoutes: [] },
    connections: { total: 0, active: [], topIps: [] },
    terminals: []
  };
}

async function main() {
  let staticServer = null;
  let url = arg('--url', '');
  if (!url) {
    staticServer = createStaticServer(path.join(process.cwd(), 'public'));
    await listen(staticServer);
    lifecycle.server = staticServer;
    url = `http://127.0.0.1:${staticServer.address().port}/`;
  }
  const section = arg('--section', 'desktopV1030');
  const outJson = path.resolve(arg('--json', `resource-balance-${section}.json`));
  const outPng = path.resolve(arg('--png', `resource-balance-${section}.png`));
  const width = Number(arg('--width', '1528'));
  const height = Number(arg('--height', '980'));
  const waitMs = Number(arg('--wait', '6200'));
  const browserTimeoutMs = Math.max(1000, Number(arg('--browser-timeout', '15000')) || 15000);

  const winBrowserCandidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  ];
  const macBrowserCandidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
  ];
  const linuxBrowserCandidates = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge'
  ];
  const browserCandidates = process.platform === 'win32'
    ? winBrowserCandidates
    : process.platform === 'darwin'
      ? macBrowserCandidates
      : linuxBrowserCandidates;
  const requestedBrowserPath = arg('--browser', process.env.CODEX_BROWSER_PATH || '');
  if (requestedBrowserPath && !(await exists(requestedBrowserPath))) {
    throw new Error(`Requested browser executable not found: ${requestedBrowserPath}`);
  }
  const browserPath = requestedBrowserPath || (await Promise.all(
    browserCandidates.map(async (item) => [item, await exists(item)])
  )).find(([, ok]) => ok)?.[0];
  if (!browserPath) throw new Error('Edge/Chrome executable not found');

  await fs.mkdir(path.dirname(outJson), { recursive: true });
  await fs.mkdir(path.dirname(outPng), { recursive: true });

  const snapshotFactories = {
    desktopNoSnapshot: noSnapshotSnapshot,
    desktopV1030: balanceSnapshot,
    desktopTrafficAccumulating: accumulatingTrafficSnapshot,
    desktopAllOfflineHierarchy: allOfflineSnapshot,
    desktopResourceHierarchy: resourceFullSnapshot,
  };
  const snapshotFactory = snapshotFactories[section];
  if (!snapshotFactory) {
    throw new Error(`Unsupported desktop runtime section: ${section}`);
  }
  let browser = null;
  let context = null;
  let page = null;
  const pageExceptions = [];
  const pageConsoleErrors = [];
  try {
    browser = await chromium.launch({
      executablePath: browserPath,
      headless: true,
      args: process.platform === 'linux' ? ['--no-sandbox'] : [],
      timeout: browserTimeoutMs
    });
    lifecycle.browser = browser;
    context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    lifecycle.context = context;
    const injectedSnapshot = snapshotFactory();
    await context.addInitScript((value) => {
      window.__PANEL_TEST_SNAPSHOT__ = value;
    }, injectedSnapshot);
    page = await context.newPage();
    page.setDefaultTimeout(Math.max(8000, waitMs));
    page.setDefaultNavigationTimeout(browserTimeoutMs);
    page.on('pageerror', (error) => pageExceptions.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') pageConsoleErrors.push(message.text());
    });

    const navigationUrl = `${url}${url.includes('?') ? '&' : '?'}section=overview&codexBust=${Date.now()}#overview`;
    await page.goto(navigationUrl, { waitUntil: 'domcontentloaded' });
    const readySelector = '#overview';
    try {
      await page.locator(readySelector).waitFor({
        state: 'attached',
        timeout: Math.max(8000, waitMs)
      });
    } catch (error) {
      const appExcerpt = await page.locator('#app').evaluate((node) => node.innerHTML.slice(0, 600)).catch(() => '');
      throw new Error([
        error.message,
        `pageErrors=${JSON.stringify(pageExceptions)}`,
        `consoleErrors=${JSON.stringify(pageConsoleErrors)}`,
        `app=${appExcerpt}`
      ].join('\n'));
    }
    await page.waitForTimeout(Math.min(500, Math.max(120, Math.floor(waitMs / 10))));
    if (pageExceptions.length) {
      throw new Error(`Page runtime exception: ${pageExceptions.join('\n---\n')}`);
    }

    const scaleScenario = injectedSnapshot?.meta?.scaleScenario || 'single';
    const inspectorSource = inspectOverviewDesktopLayout.toString();
    const expression = `(() => {
      const inspectOverviewDesktopLayout = ${inspectorSource};
      const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
      const app = document.querySelector('#app');
      const active = document.querySelector('#app .section, #app [data-panel-route-content]');
      const requested = document.querySelector('#overview');
      const root = document.documentElement;
      const body = document.body;
      const overflowX = Math.max(root.scrollWidth, body.scrollWidth) - window.innerWidth;
      const visibleText = normalize((requested || active || app || body).innerText);
      return inspectOverviewDesktopLayout({
        sectionName: 'overview',
        scaleScenario: ${JSON.stringify(scaleScenario)},
        profile: 'desktop-focused-playwright',
        viewport: { name: ${JSON.stringify(section)}, width: window.innerWidth, height: window.innerHeight },
        sectionRoot: requested || active,
        app,
        active,
        requested,
        root,
        overflowX,
        hasBadLiteral: /\\bNaN\\b|\\bundefined\\b|\\[object Object\\]/.test(visibleText),
        scaleMetaOk: true,
        normalize,
      });
    })()`;

    const inspected = await page.evaluate(expression);
    const accumulatingStateOk = section !== 'desktopTrafficAccumulating' ||
      await page.locator('[data-traffic-accumulating]').isVisible();
    const report = {
      ...inspected,
      pass: inspected.pass === true && accumulatingStateOk,
      section,
      accumulatingStateOk,
      runtime: 'playwright',
      pageErrors: pageExceptions,
      consoleErrors: pageConsoleErrors,
    };
    await page.screenshot({
      path: outPng,
      fullPage: true,
      animations: 'disabled'
    });
    await fs.writeFile(outJson, JSON.stringify(report, null, 2), 'utf8');

    if (!report.pass) {
      throw new Error(`Resource/balance check failed: ${JSON.stringify(report)}`);
    }
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await cleanupRuntime();
  }
}

const testTimeoutMs = Math.max(30000, Number(arg('--test-timeout', '120000')) || 120000);
let watchdog = null;
const timeout = new Promise((_, reject) => {
  watchdog = setTimeout(() => {
    const error = new Error(`resource/balance Playwright contract exceeded ${testTimeoutMs}ms`);
    cleanupRuntime().finally(() => reject(error));
  }, testTimeoutMs);
});

Promise.race([main(), timeout]).then(() => {
  clearTimeout(watchdog);
}).catch((error) => {
  clearTimeout(watchdog);
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
