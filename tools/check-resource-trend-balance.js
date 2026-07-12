const fs = require('fs/promises');
const nodeFs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

function arg(name, fallback = '') {
  const direct = process.argv.find((item) => item.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1] || fallback;
  return fallback;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function closeServer(server) {
  if (!server) return;
  try {
    server.close();
  } catch {}
}

function findLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = address && typeof address === 'object' ? address.port : 0;
      server.close((error) => {
        if (error) reject(error);
        else if (!port) reject(new Error('Failed to allocate a loopback port'));
        else resolve(port);
      });
    });
  });
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function waitJson(url, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      return await getJson(url);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, { timeout: 2000 }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`HTTP ${response.statusCode}: ${body.slice(0, 160)}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('timeout', () => request.destroy(new Error(`Timed out fetching ${url}`)));
    request.on('error', reject);
  });
}

async function openSocket(wsUrl, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    const timer = setTimeout(() => {
      try { socket.close(); } catch {}
      reject(new Error(`Timed out opening ${wsUrl}`));
    }, timeoutMs);
    socket.onopen = () => {
      clearTimeout(timer);
      resolve(socket);
    };
    socket.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`Failed to open ${wsUrl}`));
    };
  });
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
      diskUsage: 97
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
      diskUsage: 31
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

function interfaceDownSnapshot() {
  const snapshot = balanceSnapshot();
  snapshot.meta.scaleScenario = 'interfaces-down';
  snapshot.updatedAt = new Date().toISOString();
  snapshot.interfaces = [
    { name: 'ether1', type: 'ether', running: true, bridge: 'bridge-wan', txRate: 82000000, rxRate: 48000000 },
    { name: 'ether2', type: 'ether', running: false, bridge: 'bridge-lan', txRate: 0, rxRate: 0 },
    { name: 'sfp1', type: 'sfp', running: true, bridge: 'bridge-core', txRate: 120000000, rxRate: 76000000 }
  ];
  return snapshot;
}

function collectionDownSnapshot() {
  const snapshot = balanceSnapshot();
  const now = new Date().toISOString();
  snapshot.meta.scaleScenario = 'collection-down';
  snapshot.updatedAt = now;
  snapshot.meta.realtimeUpdatedAt = now;
  snapshot.meta.slowRestUpdatedAt = now;
  snapshot.meta.staticUpdatedAt = now;
  snapshot.meta.realtimeError = 'REST realtime unavailable';
  snapshot.meta.slowRestError = 'REST business snapshot unavailable';
  snapshot.meta.staticError = 'SSH static facts unavailable';
  snapshot.meta.connectionDetailError = 'connection detail unavailable';
  snapshot.meta.realtimeEndpointFailures = [
    { group: 'REST', name: '10.0.0.1 /rest/interface' }
  ];
  snapshot.meta.slowRestEndpointFailures = [
    { group: 'slow REST', name: '10.0.0.1 /rest/ip/route' }
  ];
  snapshot.meta.staticEndpointFailures = [
    { group: 'SSH', name: '10.0.0.1 /system/resource' }
  ];
  snapshot.meta.detailEndpointFailures = [
    { group: 'connection detail', name: '10.0.0.1 /ip/firewall/connection' }
  ];
  snapshot.meta.capabilities = { restTrusted: false, sshRead: false };
  return snapshot;
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
    url = `http://127.0.0.1:${staticServer.address().port}/`;
  }
  const section = arg('--section', 'loadAudit');
  const outJson = path.resolve(arg('--json', `resource-balance-${section}.json`));
  const outPng = path.resolve(arg('--png', `resource-balance-${section}.png`));
  const width = Number(arg('--width', '1528'));
  const height = Number(arg('--height', '980'));
  const waitMs = Number(arg('--wait', '6200'));
  const cdpTimeoutMs = Math.max(1000, Number(arg('--cdp-timeout', '12000')) || 12000);
  const requestedPort = arg('--port', '');
  const port = requestedPort ? Number(requestedPort) : await findLoopbackPort();
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid debugger port: ${requestedPort || port}`);
  }
  const userDataDir = path.resolve(arg('--user-data-dir', path.join(process.cwd(), `_edge_resource_${section}_${port}_${Date.now()}`)));

  const browserCandidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  ];
  const requestedBrowserPath = arg('--browser', process.env.CODEX_BROWSER_PATH || '');
  if (requestedBrowserPath && !(await exists(requestedBrowserPath))) {
    throw new Error(`Requested browser executable not found: ${requestedBrowserPath}`);
  }
  const browserPath = requestedBrowserPath || (await Promise.all(browserCandidates.map(async (item) => [item, await exists(item)]))).find(([, ok]) => ok)?.[0];
  if (!browserPath) throw new Error('Edge/Chrome executable not found');

  await fs.mkdir(path.dirname(outJson), { recursive: true });
  await fs.mkdir(path.dirname(outPng), { recursive: true });
  await fs.mkdir(userDataDir, { recursive: true });

  const injectedSnapshots = {
    loadAudit: resourceFullSnapshot,
    balance: balanceSnapshot,
    desktopNoSnapshot: noSnapshotSnapshot,
    desktopV1030: balanceSnapshot,
    mobileNormalHome: balanceSnapshot,
    mobileNavigation: balanceSnapshot,
    mobileNavigationNoSnapshot: noSnapshotSnapshot,
    mobileDetailDrilldown: balanceSnapshot,
    mobileIncidentDrilldown: allOfflineSnapshot,
    mobileAppHome: allOfflineSnapshot,
    mobileNoSnapshotHome: noSnapshotSnapshot,
    mobileResourceHome: resourceFullSnapshot,
    mobileIncidentActionNavigation: resourceFullSnapshot,
    mobileInterfaceHome: interfaceDownSnapshot,
    mobileCollectionHome: collectionDownSnapshot
  };
  const isInjectedOverviewSection = Boolean(injectedSnapshots[section]);
  const isMobileAppHomeSection = section === 'mobileNormalHome' || section === 'mobileNavigation' || section === 'mobileNavigationNoSnapshot' || section === 'mobileDetailDrilldown' || section === 'mobileIncidentDrilldown' || section === 'mobileIncidentActionNavigation' || section === 'mobileAppHome' || section === 'mobileNoSnapshotHome' || section === 'mobileResourceHome' || section === 'mobileInterfaceHome' || section === 'mobileCollectionHome';
  const targetUrl = `${url}${url.includes('?') ? '&' : '?'}section=${encodeURIComponent(section)}&codexBust=${Date.now()}#${encodeURIComponent(section)}`;
  const browser = spawn(browserPath, [
    '--headless=new',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-background-networking',
    '--disable-extensions',
    '--disable-features=msEdgeFirstRunExperience',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
  const browserStderr = [];
  browser.stderr.on('data', (chunk) => browserStderr.push(Buffer.from(chunk)));
  const browserFailureContext = () => {
    const text = Buffer.concat(browserStderr).toString('utf8').trim();
    return text ? `; browser stderr: ${text.slice(-2000)}` : '';
  };

  const browserExit = new Promise((resolve) => {
    browser.once('exit', (code, signal) => resolve({ code, signal }));
  });

  let socket;
  try {
    let pageTarget = null;
    let targetError = null;
    const debuggerEndpoints = [
      `http://127.0.0.1:${port}/json/list`,
      `http://[::1]:${port}/json/list`
    ];
    for (let i = 0; i < 60; i += 1) {
      if (browser.exitCode !== null) {
        throw new Error(`Browser exited before debugger was ready: code=${browser.exitCode}${browserFailureContext()}`);
      }
      for (const endpoint of debuggerEndpoints) {
        try {
          const targets = await getJson(endpoint);
          pageTarget = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
        } catch (error) {
          targetError = error;
        }
        if (pageTarget) break;
      }
      if (pageTarget) break;
      await Promise.race([delay(250), browserExit]);
    }
    if (!pageTarget) {
      const message = targetError?.message || 'Page websocket URL missing';
      throw new Error(`${message}${browserFailureContext()}`);
    }

    socket = await openSocket(pageTarget.webSocketDebuggerUrl, cdpTimeoutMs);
    let id = 0;
    const pending = new Map();
    const pageExceptions = [];

    const rejectPending = (error) => {
      for (const [messageId, task] of pending.entries()) {
        clearTimeout(task.timer);
        pending.delete(messageId);
        task.reject(error);
      }
    };

    socket.onclose = () => rejectPending(new Error('CDP socket closed before all commands completed'));
    socket.onerror = () => rejectPending(new Error('CDP socket error'));

    socket.onmessage = async (event) => {
      let raw = event.data;
      if (raw && typeof raw !== 'string') {
        if (typeof raw.text === 'function') raw = await raw.text();
        else if (raw instanceof ArrayBuffer) raw = Buffer.from(raw).toString('utf8');
        else if (ArrayBuffer.isView(raw)) raw = Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength).toString('utf8');
        else raw = String(raw);
      }
      const message = JSON.parse(raw);
      if (!message.id || !pending.has(message.id)) {
        if (message.method === 'Runtime.exceptionThrown') {
          pageExceptions.push(message.params?.exceptionDetails || message.params || message);
        }
        return;
      }
      const task = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(task.timer);
      if (message.error) task.reject(new Error(`${task.method}: ${JSON.stringify(message.error)}`));
      else task.resolve(message.result || {});
    };

    function send(method, params = {}) {
      const messageId = ++id;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(messageId);
          reject(new Error(`CDP command timed out: ${method}`));
        }, cdpTimeoutMs);
        pending.set(messageId, { resolve, reject, method, timer });
        try {
          socket.send(JSON.stringify({ id: messageId, method, params }));
        } catch (error) {
          clearTimeout(timer);
          pending.delete(messageId);
          reject(error);
        }
      });
    }

    await send('Runtime.enable');
    await send('Page.enable');
    if (isInjectedOverviewSection) {
      const snapshot = injectedSnapshots[section]();
      await send('Page.addScriptToEvaluateOnNewDocument', {
        source: `window.__PANEL_TEST_SNAPSHOT__ = ${JSON.stringify(snapshot)};`
      });
    }
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: isMobileAppHomeSection });
    await send('Page.navigate', { url: isInjectedOverviewSection ? `${url}${url.includes('?') ? '&' : '?'}section=overview&codexBust=${Date.now()}#overview` : targetUrl });
    const readySelector = isMobileAppHomeSection
      ? '#overview .ik-mobile-public-home'
      : isInjectedOverviewSection
        ? '#overview'
        : `#${section}`;
    const readyDeadline = Date.now() + waitMs;
    let ready = false;
    while (Date.now() < readyDeadline) {
      const readyResult = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector(${JSON.stringify(readySelector)}))`,
        returnByValue: true
      });
      if (readyResult.result?.value) {
        ready = true;
        break;
      }
      await delay(200);
    }
    await delay(ready ? Math.min(500, Math.max(120, Math.floor(waitMs / 10))) : 300);
    if (pageExceptions.length) {
      const exceptionText = pageExceptions
        .map((detail) => [
          detail?.text,
          detail?.exception?.description,
          detail?.exception?.value,
        ].filter(Boolean).join('\n'))
        .filter(Boolean)
        .join('\n---\n');
      throw new Error(`Page runtime exception: ${exceptionText || JSON.stringify(pageExceptions)}`);
    }

    const expression = `(() => {
      const sectionName = ${JSON.stringify(section)};
      const normalize = (text) => String(text || '').replace(/\\s+/g, ' ').trim();
      const nodeIsVisiblyReadable = (node) => {
        let element = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        if (!element) return false;
        while (element && element !== document.documentElement) {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          if (
            element.getAttribute?.('aria-hidden') === 'true' ||
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            Number.parseFloat(style.opacity || '1') === 0 ||
            (rect.width <= 0 && rect.height <= 0) ||
            (rect.width <= 1 && rect.height <= 1 && style.overflow === 'hidden') ||
            (style.clipPath && style.clipPath !== 'none')
          ) {
            return false;
          }
          element = element.parentElement;
        }
        return true;
      };
      const visibleText = (node) => {
        if (!node) return '';
        const parts = [];
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          if (nodeIsVisiblyReadable(walker.currentNode)) parts.push(walker.currentNode.textContent || '');
        }
        return normalize(parts.join(' '));
      };
      const sectionEl = sectionName === 'loadAudit' || sectionName === 'balance' || sectionName === 'desktopNoSnapshot' || sectionName === 'desktopV1030' || sectionName === 'mobileNormalHome' || sectionName === 'mobileNavigation' || sectionName === 'mobileNavigationNoSnapshot' || sectionName === 'mobileDetailDrilldown' || sectionName === 'mobileIncidentDrilldown' || sectionName === 'mobileIncidentActionNavigation' || sectionName === 'mobileAppHome' || sectionName === 'mobileNoSnapshotHome' || sectionName === 'mobileResourceHome' || sectionName === 'mobileInterfaceHome' || sectionName === 'mobileCollectionHome'
        ? document.querySelector('#overview')
        : document.querySelector('#' + sectionName);
      const text = visibleText(sectionEl);
      if (sectionName === 'loadAudit') {
        const required = ['处理器', '内存', '磁盘', '当前', '峰值', '异常点', '阈值', '持续', '数据点', '100%', '50%', '0%'];
        const missing = required.filter((item) => !text.includes(item));
        const cards = Array.from(sectionEl?.querySelectorAll('.ops-resource-card, .ro-resource-card') || []);
        const axes = Array.from(sectionEl?.querySelectorAll('.ops-axis-chart, .ro-resource-card') || []);
        const colors = cards.map((card) => getComputedStyle(card).getPropertyValue('--resource-color').trim());
        const resourceGridCount = sectionEl?.querySelectorAll('.ops-resource-grid, .ro-resource-cards').length || 0;
        const sceneKey = sectionEl?.getAttribute('data-overview-scene-key') || '';
        const moduleNames = Array.from(sectionEl?.querySelectorAll('[data-overview-density-module]') || [])
          .map((node) => node.getAttribute('data-overview-density-module'))
          .filter(Boolean)
          .slice(0, 12);
        return {
          pass: Boolean(sectionEl && sceneKey === 'resource-full' && missing.length === 0 && cards.length >= 3 && axes.length >= 3),
          section: sectionName,
          url: location.href,
          sceneKey,
          missing,
          resourceCardCount: cards.length,
          axisChartCount: axes.length,
          resourceGridCount,
          moduleNames,
          textExcerpt: text.slice(0, 500),
          colors,
          viewport: { width: innerWidth, height: innerHeight },
          scrollHeight: document.documentElement.scrollHeight
        };
      }
      if (sectionName === 'balance') {
        const routeModule = sectionEl?.querySelector('[data-overview-density-module="route-raw-facts"]');
        const wanModule = sectionEl?.querySelector('[data-overview-density-module="wan-trend"]');
        const evidenceModule = sectionEl?.querySelector('[data-overview-density-module="normal-wan-evidence"]');
        const integratedWan = wanModule?.querySelector('[data-overview-desktop-wan-integrated="trend-current-peak-top-outlet-route-sampling"]');
        const integratedSummary = integratedWan?.querySelector('[data-overview-desktop-wan-integrated-summary="current-peak-top-route-sampling"]');
        const integratedTop = integratedWan?.querySelector('[data-overview-desktop-wan-top-outlet="top3-inline-under-trend"]');
        const businessSummaryRow = routeModule?.querySelector('[data-routeros-evidence-role="business-summary-primary"]');
        const routeRect = routeModule?.getBoundingClientRect();
        const wanRect = wanModule?.getBoundingClientRect();
        const routeRows = Array.from(routeModule?.querySelectorAll('.ro-ledger-row:not(.ro-ledger-head)') || []);
        const wanRows = Array.from(wanModule?.querySelectorAll('.ro-ledger-row:not(.ro-ledger-head)') || []);
        const chart = wanModule?.querySelector('[data-overview-scene-chart], [data-overview-chart-type], .ro-judgement-chart');
        const text = normalize([visibleText(routeModule), visibleText(wanModule), visibleText(evidenceModule)].join(' '));
        const required = ['默认出口', 'WAN', '当前', '峰值', '均值', '采样', '最近6点'];
        const missing = required.filter((item) => !text.includes(item));
        const heightDiff = routeRect && wanRect ? Math.abs(routeRect.height - wanRect.height) : null;
        return {
          pass: Boolean(sectionEl && routeModule && wanModule && evidenceModule && chart && integratedWan && integratedSummary && integratedTop && businessSummaryRow && routeRows.length >= 2 && wanRows.length >= 2 && missing.length === 0 && heightDiff !== null && heightDiff <= 260),
          section: sectionName,
          url: location.href,
          missing,
          routeRowCount: routeRows.length,
          wanRowCount: wanRows.length,
          hasChart: Boolean(chart),
          hasEvidenceModule: Boolean(evidenceModule),
          hasIntegratedWan: Boolean(integratedWan),
          hasIntegratedSummary: Boolean(integratedSummary),
          hasIntegratedTop: Boolean(integratedTop),
          hasBusinessSummaryRow: Boolean(businessSummaryRow),
          wanHeight: wanRect ? wanRect.height : 0,
          routeHeight: routeRect ? routeRect.height : 0,
          heightDiff,
          textExcerpt: text.slice(0, 500),
          viewport: { width: innerWidth, height: innerHeight },
          scrollHeight: document.documentElement.scrollHeight
        };
      }
      if (sectionName === 'desktopNoSnapshot') {
        const modules = Array.from(sectionEl?.querySelectorAll('[data-overview-density-module]') || []);
        const moduleNames = modules.map((node) => node.getAttribute('data-overview-density-module') || '');
        const requiredModules = [
          'no-snapshot-summary',
          'no-snapshot-module-visibility',
          'no-snapshot-recent-success',
          'evidence-boundary'
        ];
        const missingModules = requiredModules.filter((item) => !moduleNames.includes(item));
        const forbiddenModules = moduleNames.filter((item) => /terminal-ranking|wan-trend|normal-wan-evidence|traffic-trend|wan-throughput|wan-rate|no-snapshot-readonly-boundary|no-snapshot-degraded-modules/.test(item));
        const requiredText = ['采集链路', '业务数据不可判', '恢复线索', '业务快照', '速率不展示', '只读'];
        const desktopNoSnapshotText = normalize(modules.map((node) => visibleText(node)).join(' '));
        const missing = requiredText.filter((item) => !desktopNoSnapshotText.includes(item));
        const primaryModules = requiredModules.slice(0, 3)
          .map((name) => sectionEl?.querySelector('[data-overview-density-module="' + name + '"]'))
          .filter(Boolean);
        const primaryRects = primaryModules.map((node) => node.getBoundingClientRect());
        const visiblePrimaryCount = primaryRects.filter((rect) => rect.width > 0 && rect.height >= 120).length;
        const workspace = sectionEl?.querySelector('[data-overview-desktop-workspace]');
        const recoveryModule = workspace?.querySelector('[data-overview-density-module="no-snapshot-recent-success"]');
        const rawEvidenceModule = workspace?.querySelector('[data-overview-density-module="evidence-boundary"]');
        const recoveryRect = recoveryModule?.getBoundingClientRect();
        const rawEvidenceRect = rawEvidenceModule?.getBoundingClientRect();
        const rawEvidenceRowCount = rawEvidenceModule?.querySelectorAll('.ro-ledger-row:not(.ro-ledger-head)').length || 0;
        const rawEvidenceDisclosure = rawEvidenceModule?.querySelector('[data-overview-evidence-disclosure="native-details-collapsed-secondary"]');
        const hasRawEvidenceDisclosure = Boolean(rawEvidenceDisclosure && rawEvidenceDisclosure.open === false);
        const noSnapshotEvidenceDeferred = Boolean(
          recoveryModule &&
          rawEvidenceModule &&
          recoveryModule.parentElement === rawEvidenceModule.parentElement &&
          recoveryRect &&
          rawEvidenceRect &&
          rawEvidenceRect.width >= 300 &&
          rawEvidenceRect.height >= 28 &&
          rawEvidenceRect.top >= recoveryRect.bottom - 1 &&
          rawEvidenceRowCount >= 4 &&
          hasRawEvidenceDisclosure
        );
        const hasHorizontalOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
        return {
          pass: Boolean(
            sectionEl &&
            missing.length === 0 &&
            missingModules.length === 0 &&
            forbiddenModules.length === 0 &&
            moduleNames.length === requiredModules.length &&
            visiblePrimaryCount === 3 &&
            noSnapshotEvidenceDeferred &&
            hasRawEvidenceDisclosure &&
            !hasHorizontalOverflow
          ),
          section: sectionName,
          url: location.href,
          missing,
          missingModules,
          forbiddenModules,
          visiblePrimaryCount,
          noSnapshotEvidenceDeferred,
          noSnapshotRawEvidenceRowCount: rawEvidenceRowCount,
          noSnapshotRecoveryRect: recoveryRect ? { left: recoveryRect.left, top: recoveryRect.top, right: recoveryRect.right, bottom: recoveryRect.bottom, width: recoveryRect.width, height: recoveryRect.height } : null,
          noSnapshotRawEvidenceRect: rawEvidenceRect ? { left: rawEvidenceRect.left, top: rawEvidenceRect.top, right: rawEvidenceRect.right, bottom: rawEvidenceRect.bottom, width: rawEvidenceRect.width, height: rawEvidenceRect.height } : null,
          hasRawEvidenceDisclosure,
          moduleNames,
          viewport: { width: innerWidth, height: innerHeight, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth },
          scrollHeight: document.documentElement.scrollHeight,
          textExcerpt: desktopNoSnapshotText.slice(0, 700)
        };
      }
      if (sectionName === 'desktopV1030') {
        const workspace = sectionEl?.querySelector('[data-overview-desktop-workspace]');
        const duplicateWorkspaceNav = sectionEl?.querySelector('[data-overview-desktop-nav="ikuai-short-left-rail"]');
        const shellSidebar = document.querySelector('.sidebar[data-shell-sidebar="legacy"], .ik-rail');
        const desktopNavigationDeduplicated = Boolean(!duplicateWorkspaceNav && shellSidebar);
        const workspaceRect = workspace?.getBoundingClientRect();
        const topbar = sectionEl?.querySelector('.ro-topbar');
        const desktopDecisionRail = sectionEl?.querySelector('[data-overview-desktop-decision-rail="action-and-credibility"]');
        const desktopDecisionCells = Array.from(desktopDecisionRail?.querySelectorAll('.ro-desktop-thin-kpi') || []);
        const desktopDecisionLabels = desktopDecisionCells.map((cell) => normalize(cell.querySelector('span')?.textContent || ''));
        const desktopDecisionRailOk = Boolean(!desktopDecisionRail && workspace?.classList.contains('is-normal-scene'));
        const mainModules = Array.from(sectionEl?.querySelectorAll('[data-overview-density-module]') || []);
        const visibleModules = mainModules.filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 120 && rect.height > 80;
        });
        const syntheticGateTextCount = sectionEl?.querySelectorAll(
          '[data-overview-desktop-core-text], .ro-sr-contract'
        ).length || 0;
        const syntheticGateTextAbsent = syntheticGateTextCount === 0;
        const wideNodes = Array.from(sectionEl?.querySelectorAll('*') || [])
          .map((node) => {
            const rect = node.getBoundingClientRect();
            return { tag: node.tagName, className: String(node.className || ''), width: rect.width, right: rect.right };
          })
          .filter((item) => item.width > innerWidth + 1 || item.right > innerWidth + 1)
          .slice(0, 8);
        const hasHorizontalOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 || wideNodes.length > 0;
        const desktopVisibleText = normalize([visibleText(topbar), visibleText(workspace)].join(' '));
        const requiredText = ['WAN 采样趋势', '默认出口', '采集', '资源', '快照'];
        const missing = requiredText.filter((item) => !desktopVisibleText.includes(item));
        const lowNoiseConsoleTokenContract = 'low-noise-console-tokens-color-type-space-radius-state-chart';
        const lowNoiseConsoleTokenNames = ['--ik-console-ink', '--ik-console-line', '--ik-console-panel', '--ik-console-danger'];
        const lowNoiseConsoleTokenStyle = sectionEl ? getComputedStyle(sectionEl) : null;
        const lowNoiseConsoleTokenValues = Object.fromEntries(lowNoiseConsoleTokenNames.map((name) => [
          name,
          lowNoiseConsoleTokenStyle?.getPropertyValue(name).trim() || ''
        ]));
        const lowNoiseConsoleTokensApplied = Boolean(
          sectionEl &&
          workspace &&
          sectionEl.getAttribute('data-overview-low-noise-console-token-contract') === lowNoiseConsoleTokenContract &&
          sectionEl.contains(workspace) &&
          lowNoiseConsoleTokenNames.every((name) => lowNoiseConsoleTokenValues[name])
        );
        const topbarStyle = topbar ? getComputedStyle(topbar) : null;
        const topbarCells = Array.from(topbar?.querySelectorAll('.ro-topbar-cell') || []);
        const topbarRoleOrder = topbarCells.map((cell) => cell.getAttribute('data-overview-status-role') || '');
        const expectedTopbarRoleOrder = sectionName === 'desktopNoSnapshot'
          ? ['conclusion', 'device', 'routeros', 'rest', 'ssh', 'recent-success']
          : ['conclusion', 'impact', 'collection', 'snapshot'];
        const topbarHierarchyOk = Boolean(
          topbar &&
          topbar.getAttribute('data-overview-status-order') === expectedTopbarRoleOrder.join('-') &&
          topbarRoleOrder.join('-') === expectedTopbarRoleOrder.join('-') &&
          topbarRoleOrder[0] === 'conclusion'
        );
        const topbarCellStyles = topbarCells.map((node) => getComputedStyle(node));
        const topbarCellRects = topbarCells.map((node) => node.getBoundingClientRect());
        const topbarCellsNotFieldBoxes = topbarCellStyles.length >= expectedTopbarRoleOrder.length && topbarCellStyles.every((style) => (
          Number.parseFloat(style.borderTopWidth || '0') === 0 &&
          Number.parseFloat(style.borderBottomWidth || '0') === 0 &&
          Number.parseFloat(style.borderLeftWidth || '0') === 0 &&
          Number.parseFloat(style.borderRadius || '0') <= 1 &&
          (style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.backgroundColor === 'transparent')
        ));
        const topbarFlatSurfaceOk = Boolean(
          topbar &&
          topbarStyle &&
          Number.parseFloat(topbarStyle.borderTopWidth || '0') === 0 &&
          Number.parseFloat(topbarStyle.borderLeftWidth || '0') === 0 &&
          Number.parseFloat(topbarStyle.borderRightWidth || '0') === 0 &&
          Number.parseFloat(topbarStyle.borderRadius || '0') <= 1 &&
          ['rgba(0, 0, 0, 0)', 'transparent'].includes(topbarStyle.backgroundColor || '') &&
          topbarCellsNotFieldBoxes
        );
        const topbarContractOk = Boolean(
          topbar &&
          topbar.getAttribute('data-overview-status-bus') === 'control-console-summary-bus-flat-critical-value-rail' &&
          topbar.getAttribute('data-overview-status-no-table-header') === 'true' &&
          topbar.getAttribute('data-overview-status-value-rail') === 'conclusion-first-low-noise' &&
          topbarStyle &&
          Number.parseFloat(topbarStyle.height || '0') <= 40 &&
          Number.parseFloat(topbarStyle.borderTopWidth || '0') === 0 &&
          Number.parseFloat(topbarStyle.borderLeftWidth || '0') === 0 &&
          Number.parseFloat(topbarStyle.borderRightWidth || '0') === 0 &&
          Number.parseFloat(topbarStyle.borderRadius || '0') <= 1 &&
          topbarCells.length >= expectedTopbarRoleOrder.length &&
          topbarCells.every((cell) => cell.getAttribute('data-overview-status-cell-contract') === 'label-value-note') &&
          topbarCellStyles.every((style) => (
            Number.parseFloat(style.borderTopWidth || '0') === 0 &&
            Number.parseFloat(style.borderRightWidth || '0') === 0 &&
            Number.parseFloat(style.borderBottomWidth || '0') === 0 &&
            Number.parseFloat(style.borderLeftWidth || '0') === 0 &&
            Number.parseFloat(style.borderRadius || '0') <= 1 &&
            (style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.backgroundColor === 'transparent') &&
            !String(style.boxShadow || '').replaceAll(' ', '').includes('20,115,230')
          ))
        );
        const topbarCellNoise = topbarCellStyles.map((style, index) => ({
          index,
          width: topbarCellRects[index]?.width || 0,
          height: topbarCellRects[index]?.height || 0,
          backgroundColor: style.backgroundColor,
          borderTopWidth: style.borderTopWidth,
          borderRightWidth: style.borderRightWidth,
          borderBottomWidth: style.borderBottomWidth,
          borderLeftWidth: style.borderLeftWidth,
          borderRadius: style.borderRadius,
          boxShadow: style.boxShadow
        }));
        const wanModule = sectionEl?.querySelector('[data-overview-density-module="wan-trend"]');
        const wanIntegrated = wanModule?.querySelector('[data-overview-wan-chart-contract="current-peak-mean-window-threshold-readout-visible-not-table-noise"]');
        const wanModuleLedgerCount = wanModule?.querySelectorAll(':scope > .ro-ledger-table').length || 0;
        const wanDuplicateEvidenceModuleCount = sectionEl?.querySelectorAll('[data-overview-density-module="normal-wan-evidence"]').length || 0;
        const wanChart = wanIntegrated?.querySelector('.ro-judgement-chart[data-overview-chart-module="traffic-trend"]');
        const wanChartRect = wanChart?.getBoundingClientRect();
        const wanChartRows = Array.from(wanChart?.querySelectorAll('.ro-judgement-row') || []);
        const wanChartSummary = wanChart?.querySelector('.ro-chart-summary');
        const wanChartSummaryRect = wanChartSummary?.getBoundingClientRect();
        const wanSummaryItems = Array.from(wanIntegrated?.querySelectorAll('.ro-wan-integrated-summary span') || []);
        const wanTopItems = Array.from(wanIntegrated?.querySelectorAll('.ro-wan-integrated-top span') || []);
        const wanDecisionRail = wanIntegrated?.querySelector('[data-overview-wan-decision-rail="current-peak-top-default-sampling-single-surface"]');
        const wanDecisionItems = Array.from(wanDecisionRail?.querySelectorAll('[data-overview-wan-decision]') || []);
        const wanDecisionLabels = wanDecisionItems.map((item) => normalize(item.querySelector('em')?.textContent || ''));
        const wanDecisionRect = wanDecisionRail?.getBoundingClientRect();
        const wanDecisionRailProductized = Boolean(
          wanDecisionRail &&
          wanDecisionRail.getAttribute('data-overview-wan-decision-source') === 'desktopWanDecisionRail' &&
          wanDecisionRect &&
          wanDecisionRect.width >= 520 &&
          wanDecisionRect.height >= 28 &&
          wanDecisionItems.length >= 5 &&
          ['当前', '峰值', 'Top出口', '默认出口', '采样'].every((label) => wanDecisionLabels.includes(label)) &&
          wanDecisionItems.every((item) => (
            normalize(item.querySelector('b')?.textContent || '').length > 0 &&
            normalize(item.querySelector('small')?.textContent || '').length > 0
          ))
        );
        const wanSingleSurfaceProductized = Boolean(
          wanModule &&
          wanModule.getAttribute('data-overview-module-visual-only') === 'true' &&
          wanIntegrated &&
          wanIntegrated.getAttribute('data-overview-wan-single-surface') === 'trend-decision-top3-no-duplicate-summary-or-ledger' &&
          wanModuleLedgerCount === 0 &&
          wanSummaryItems.length === 0 &&
          wanDuplicateEvidenceModuleCount === 0
        );
        const wanReadableProductChart = Boolean(
          wanIntegrated &&
          wanChart &&
          wanChart.getAttribute('data-overview-chart-has-current') === 'true' &&
          wanChart.getAttribute('data-overview-chart-has-peak') === 'true' &&
          wanChart.getAttribute('data-overview-chart-has-mean') === 'true' &&
          wanChart.getAttribute('data-overview-chart-has-window') === 'true' &&
          wanChart.getAttribute('data-overview-chart-has-threshold') === 'true' &&
          wanChartRect &&
          wanChartRect.width >= 520 &&
          wanChartRect.height >= 104 &&
          wanChartSummaryRect &&
          wanChartSummaryRect.height >= 16 &&
          wanChartRows.length >= 3 &&
          wanDecisionRailProductized &&
          wanSingleSurfaceProductized &&
          wanTopItems.length >= 2
        );
        const routeModules = Array.from(sectionEl?.querySelectorAll('[data-routeros-raw-evidence-contract="business-route-main-raw-route-fields-secondary-collapsed-low-noise"]') || []);
        const routeBusinessRows = Array.from(sectionEl?.querySelectorAll('[data-routeros-evidence-role="business-main"]') || []);
        const routeRawSecondaryRows = Array.from(sectionEl?.querySelectorAll('[data-routeros-evidence-role="raw-secondary"]') || []);
        const rawAttrNames = ['data-routeros-raw-table', 'data-routeros-raw-gateway', 'data-routeros-raw-distance', 'data-routeros-raw-active', 'data-routeros-raw-disabled'];
        const routeBusinessSurfacePresent = Boolean(
          routeBusinessRows.length >= 1 ||
          (wanDecisionRailProductized && wanDecisionLabels.includes('默认出口'))
        );
        const routeBusinessRowsNoRawAttrs = routeBusinessRows.every((row) => rawAttrNames.every((name) => !row.hasAttribute(name)));
        const routeRawSecondaryComplete = routeRawSecondaryRows.length >= 1 && routeRawSecondaryRows.every((row) => (
          row.getAttribute('data-routeros-raw-field-mode') === 'secondary-collapsed-evidence' &&
          row.getAttribute('data-routeros-raw-field-contract') === 'table-gateway-distance-active-disabled-secondary' &&
          row.getAttribute('data-routeros-raw-secondary-rail') === 'bottom-collapsed-low-noise' &&
          rawAttrNames.every((name) => Boolean(row.getAttribute(name)))
        ));
        const routeRawSecondaryStyles = routeRawSecondaryRows.slice(0, 6).map((row) => {
          const style = getComputedStyle(row);
          const cells = Array.from(row.querySelectorAll('.ro-ledger-cell')).slice(0, 3);
          return {
            backgroundColor: style.backgroundColor || '',
            boxShadow: style.boxShadow || '',
            cellColors: cells.map((cell) => getComputedStyle(cell).color || ''),
            cellBorderRightWidths: cells.map((cell) => getComputedStyle(cell).borderRightWidth || '')
          };
        });
        const routeRawSecondaryLowNoise = routeRawSecondaryStyles.length >= 1 && routeRawSecondaryStyles.every((item) => (
          !/rgb\(143,\s*47,\s*44\)|rgb\(217,\s*48,\s*37\)|rgb\(184,\s*58,\s*50\)/.test(item.backgroundColor + ' ' + item.cellColors.join(' ')) &&
          item.cellBorderRightWidths.every((width) => Number.parseFloat(width || '0') === 0) &&
          (!item.boxShadow || item.boxShadow === 'none' || item.boxShadow.includes('inset'))
        ));
        const routeRawEvidenceSecondaryProductized = Boolean(
          routeModules.length >= 1 &&
          routeBusinessSurfacePresent &&
          routeBusinessRowsNoRawAttrs &&
          routeRawSecondaryComplete &&
          routeRawSecondaryLowNoise
        );
        const rawEvidenceDisclosure = sectionEl?.querySelector('[data-overview-evidence-disclosure="native-details-collapsed-secondary"]');
        const rawEvidenceDisclosureModule = rawEvidenceDisclosure?.closest('[data-overview-evidence-mode]');
        const rawEvidenceDisclosureSummary = rawEvidenceDisclosure?.querySelector(':scope > summary');
        const rawEvidenceDisclosureSummaryRect = rawEvidenceDisclosureSummary?.getBoundingClientRect();
        const rawEvidenceDisclosureProductized = Boolean(
          rawEvidenceDisclosure &&
          rawEvidenceDisclosure.open === false &&
          rawEvidenceDisclosureModule &&
          rawEvidenceDisclosureModule.getAttribute('data-overview-evidence-mode') === 'native-details-business-first-raw-secondary' &&
          rawEvidenceDisclosureSummary &&
          rawEvidenceDisclosureSummaryRect &&
          rawEvidenceDisclosureSummaryRect.height >= 24 &&
          normalize(rawEvidenceDisclosureSummary.textContent || '').includes('查看原始字段') &&
          rawEvidenceDisclosure.querySelectorAll('[data-routeros-evidence-role="raw-secondary"]').length >= 1
        );
        const ledgerCells = Array.from(sectionEl?.querySelectorAll('.ro-ledger-row:not(.ro-ledger-head) .ro-ledger-cell') || []);
        const ledgerCellStyles = ledgerCells.slice(0, 36).map((node) => getComputedStyle(node));
        const ledgerHeadCells = Array.from(sectionEl?.querySelectorAll('.ro-ledger-head-cell') || []).slice(0, 12);
        const ledgerHeadCellStyles = ledgerHeadCells.map((node) => getComputedStyle(node));
        const ledgerDangerRows = Array.from(sectionEl?.querySelectorAll('.ro-ledger-row[data-tone="danger"], .ro-ledger-row[data-tone="warn"], .ro-ledger-row[data-tone="missing"]') || []);
        const ledgerDangerNonFirstCells = ledgerDangerRows.flatMap((row) => Array.from(row.querySelectorAll('.ro-ledger-cell')).slice(1, 4)).slice(0, 18);
        const ledgerDangerNonFirstStyles = ledgerDangerNonFirstCells.map((node) => getComputedStyle(node));
        const parseCssColor = (value) => {
          const text = String(value || '').trim();
          const openParen = text.indexOf('(');
          const closeParen = text.lastIndexOf(')');
          const colorFn = openParen > 0 ? text.slice(0, openParen).toLowerCase() : '';
          if ((colorFn !== 'rgb' && colorFn !== 'rgba') || closeParen <= openParen) return null;
          const parts = text.slice(openParen + 1, closeParen).split(',').map((part) => Number.parseFloat(part.trim()));
          if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return null;
          return {
            r: Math.round(parts[0]),
            g: Math.round(parts[1]),
            b: Math.round(parts[2]),
            a: parts.length >= 4 ? parts[3] : 1
          };
        };
        const colorMatches = (value, [r, g, b], minAlpha, maxAlpha) => {
          const color = parseCssColor(value);
          return Boolean(
            color &&
            color.r === r &&
            color.g === g &&
            color.b === b &&
            color.a >= minAlpha &&
            color.a <= maxAlpha
          );
        };
        const isQuietLedgerBodyLine = (value) => (
          colorMatches(value, [226, 235, 244], 0.20, 0.35) ||
          colorMatches(value, [0, 0, 0], 0, 0)
        );
        const isQuietLedgerHeadLine = (value) => colorMatches(value, [154, 176, 198], 0.10, 0.22);
        const ledgerLineNoiseLow = Boolean(
          ledgerCellStyles.length >= 18 &&
          ledgerCellStyles.every((style) => (
            Number.parseFloat(style.borderRightWidth || '0') === 0 &&
            isQuietLedgerBodyLine(style.borderBottomColor)
          )) &&
          ledgerHeadCellStyles.length >= 3 &&
          ledgerHeadCellStyles.every((style) => isQuietLedgerHeadLine(style.borderBottomColor)) &&
          ledgerDangerNonFirstStyles.every((style) => !/rgb\(143,\s*47,\s*44\)|rgb\(217,\s*48,\s*37\)|rgb\(184,\s*58,\s*50\)|rgb\(118,\s*89,\s*39\)/.test(style.color || ''))
        );
        const pass = Boolean(
          workspace &&
          desktopNavigationDeduplicated &&
          workspaceRect &&
          workspaceRect.width > 1200 &&
          topbar &&
          desktopDecisionRailOk &&
          visibleModules.length >= 6 &&
          syntheticGateTextAbsent &&
          topbarFlatSurfaceOk &&
          topbarContractOk &&
          topbarHierarchyOk &&
          wanReadableProductChart &&
          routeRawEvidenceSecondaryProductized &&
          rawEvidenceDisclosureProductized &&
          lowNoiseConsoleTokensApplied &&
          ledgerLineNoiseLow &&
          missing.length === 0 &&
          !hasHorizontalOverflow
        );
        return {
          pass,
          desktopDecisionRailOk,
          desktopDecisionLabels,
          section: sectionName,
          url: location.href,
          missing,
          desktopNavigationDeduplicated,
          duplicateWorkspaceNavPresent: Boolean(duplicateWorkspaceNav),
          shellSidebarPresent: Boolean(shellSidebar),
          workspaceRect: workspaceRect ? { width: workspaceRect.width, height: workspaceRect.height } : null,
          visibleModuleCount: visibleModules.length,
          syntheticGateTextAbsent,
          syntheticGateTextCount,
          topbarFlatSurfaceOk,
          topbarContractOk,
          topbarHierarchyOk,
          topbarRoleOrder,
          expectedTopbarRoleOrder,
          topbarBusContract: topbar?.getAttribute('data-overview-status-bus') || '',
          lowNoiseConsoleTokensApplied,
          lowNoiseConsoleTokenContract: sectionEl?.getAttribute('data-overview-low-noise-console-token-contract') || '',
          lowNoiseConsoleWorkspaceContract: sectionEl?.contains(workspace) ? 'structural-descendant' : '',
          lowNoiseConsoleTokenValues,
          wanReadableProductChart,
          routeRawEvidenceSecondaryProductized,
          rawEvidenceDisclosureProductized,
          rawEvidenceDisclosureOpen: rawEvidenceDisclosure?.open || false,
          rawEvidenceDisclosureSummaryText: normalize(rawEvidenceDisclosureSummary?.textContent || ''),
          rawEvidenceDisclosureSummaryHeight: rawEvidenceDisclosureSummaryRect?.height || 0,
          routeBusinessSurfacePresent,
          routeBusinessRowsNoRawAttrs,
          routeRawSecondaryComplete,
          routeRawSecondaryLowNoise,
          routeBusinessRowCount: routeBusinessRows.length,
          routeRawSecondaryRowCount: routeRawSecondaryRows.length,
          routeRawSecondaryStyles,
          wanChartContract: wanIntegrated?.getAttribute('data-overview-wan-chart-contract') || '',
          wanChartRect: wanChartRect ? { width: wanChartRect.width, height: wanChartRect.height } : null,
          wanChartRowCount: wanChartRows.length,
          wanDecisionRailProductized,
          wanSingleSurfaceProductized,
          wanDecisionLabels,
          wanModuleVisualOnly: wanModule?.getAttribute('data-overview-module-visual-only') || '',
          wanModuleLedgerCount,
          wanDuplicateEvidenceModuleCount,
          wanSummaryItemCount: wanSummaryItems.length,
          wanTopItemCount: wanTopItems.length,
          topbarStyle: topbarStyle ? {
            backgroundColor: topbarStyle.backgroundColor,
            borderTopWidth: topbarStyle.borderTopWidth,
            borderRightWidth: topbarStyle.borderRightWidth,
            borderBottomWidth: topbarStyle.borderBottomWidth,
            borderLeftWidth: topbarStyle.borderLeftWidth,
            borderRadius: topbarStyle.borderRadius
          } : null,
          topbarCellsNotFieldBoxes,
          topbarCellNoise,
          ledgerLineNoiseLow,
          ledgerNoiseSample: ledgerCellStyles.slice(0, 8).map((style, index) => ({
            index,
            borderRightWidth: style.borderRightWidth,
            borderBottomColor: style.borderBottomColor,
            color: style.color,
            backgroundColor: style.backgroundColor
          })),
          ledgerDangerNonFirstSample: ledgerDangerNonFirstStyles.slice(0, 8).map((style, index) => ({
            index,
            color: style.color,
            borderBottomColor: style.borderBottomColor
          })),
          hasHorizontalOverflow,
          wideNodes,
          viewport: { width: innerWidth, height: innerHeight, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth },
          scrollHeight: document.documentElement.scrollHeight,
          textExcerpt: desktopVisibleText.slice(0, 700)
        };
      }
      if (sectionName === 'mobileNavigation' || sectionName === 'mobileNavigationNoSnapshot') {
        const root = sectionEl?.querySelector('[data-overview-mobile-console]');
        const tabs = Array.from(root?.querySelectorAll('nav[aria-label="路由器监控底部导航"] button[aria-controls^="mobile-"]') || []);
        const expectedTargets = {
          home: 'mobile-home-view',
          wan: 'mobile-wan-view',
          interface: 'mobile-interface-view',
          terminal: 'mobile-terminal-view',
          log: 'mobile-log-view'
        };
        const targetContractOk = tabs.length === 5 && tabs.every((tab) => {
          const target = tab.getAttribute('aria-controls') || '';
          const id = target.replace(/^mobile-/, '').replace(/-view$/, '');
          return expectedTargets[id] === target;
        });
        return (async () => {
          const detailIds = ['wan', 'interface', 'terminal', 'log'];
          const noSnapshotNavigation = sectionName === 'mobileNavigationNoSnapshot';
          const navigationResults = [];
          for (const id of detailIds) {
            const tab = tabs.find((item) => (item.getAttribute('aria-controls') || '') === 'mobile-' + id + '-view');
            tab?.click();
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const activeView = root?.querySelector('[data-overview-mobile-tab-view="' + id + '"]');
            const activeTab = root?.querySelector('button[aria-controls="mobile-' + id + '-view"].is-active');
            const homeDecision = root?.querySelector('.ik-mobile-primary-conclusion');
            const viewText = normalize(activeView?.textContent || '');
            const credibility = activeView?.getAttribute('data-overview-mobile-tab-credibility') || '';
            const credibilityOk = noSnapshotNavigation
              ? id === 'log'
                ? credibility === 'collection-evidence' && ['RouterOS', 'REST', 'SSH'].every((label) => viewText.includes(label))
                : credibility === 'business-hidden' && viewText.includes('不可判') && viewText.includes('无业务快照') && !['0/0 在线', '全部运行', '0 活动'].some((item) => viewText.includes(item))
              : id === 'log' ? credibility === 'collection-evidence' : credibility === 'business-visible';
            navigationResults.push({
              id,
              pass: Boolean(
                tab &&
                activeView &&
                activeTab?.getAttribute('aria-current') === 'page' &&
                root.querySelector('[data-overview-mobile-first-screen="app-home"]')?.getAttribute('data-overview-mobile-active-tab') === id &&
                !homeDecision &&
                activeView.querySelectorAll('.ik-mobile-tab-list article').length >= 1 &&
                credibilityOk
              ),
              credibility,
              viewText: viewText.slice(0, 180)
            });
          }
          return {
            pass: Boolean(root && targetContractOk && navigationResults.length === 4 && navigationResults.every((item) => item.pass)),
            section: sectionName,
            url: location.href,
            targetContractOk,
            tabCount: tabs.length,
            navigationResults,
            viewport: { width: innerWidth, height: innerHeight }
          };
        })();
      }
      if (sectionName === 'mobileIncidentActionNavigation') {
        const root = sectionEl?.querySelector('[data-overview-mobile-console]');
        const action = root?.querySelector('.ik-mobile-incident-guidance .ik-mobile-decision-cell:last-child');
        const resourceDetails = root?.querySelector('.ik-mobile-supporting-list button');
        return (async () => {
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const activeScreen = root?.querySelector('[data-overview-mobile-first-screen="app-home"]');
          const actionText = normalize(action?.textContent || '');
          const supportingText = normalize(resourceDetails?.closest('.ik-mobile-supporting-list')?.textContent || '');
          return {
            pass: Boolean(
              action &&
              action.tagName !== 'BUTTON' &&
              /先处理(处理器|内存|磁盘)/.test(actionText) &&
              activeScreen?.getAttribute('data-overview-mobile-active-tab') === 'home' &&
              resourceDetails &&
              /最高(处理器|内存|磁盘).*(持续|超阈)/.test(supportingText)
            ),
            section: sectionName,
            url: location.href,
            actionLabel: actionText,
            activeTab: activeScreen?.getAttribute('data-overview-mobile-active-tab') || '',
            viewText: supportingText.slice(0, 180),
            viewport: { width: innerWidth, height: innerHeight }
          };
        })();
      }
      if (sectionName === 'mobileDetailDrilldown' || sectionName === 'mobileIncidentDrilldown') {
        const root = sectionEl?.querySelector('[data-overview-mobile-console]');
        const detailButton = root?.querySelector('.ik-mobile-detail-entry[aria-controls="mobile-supporting-detail-rows"]');
        const detailSurface = root?.querySelector('.ik-mobile-supporting-surface');
        const detailRows = root?.querySelector('#mobile-supporting-detail-rows.ik-mobile-supporting-detail-rows');
        const rowNodes = Array.from(detailRows?.querySelectorAll('.ik-mobile-deferred-row') || []);
        const visibleCount = () => rowNodes.filter((node) => {
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height >= 40;
        }).length;
        const beforeVisible = visibleCount();
        const beforeExpanded = detailButton?.getAttribute('aria-expanded') || '';
        detailButton?.click();
        return (async () => {
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const afterVisible = visibleCount();
          const afterExpanded = detailButton?.getAttribute('aria-expanded') || '';
          const surfaceRect = detailSurface?.getBoundingClientRect();
          const surfaceStyle = detailSurface ? getComputedStyle(detailSurface) : null;
          const rowRects = rowNodes.map((row) => row.getBoundingClientRect());
          const rowsUnclipped = Boolean(
            surfaceRect &&
            rowRects.every((rect) => rect.top >= surfaceRect.top - 1 && rect.bottom <= surfaceRect.bottom + 1) &&
            surfaceStyle &&
            surfaceStyle.overflow !== 'hidden'
          );
          const incidentMode = sectionName === 'mobileIncidentDrilldown';
          const buttonText = normalize(detailButton?.textContent || '');
          const rowEvidenceComplete = rowNodes.every((row) => (
            normalize(row.querySelector('span b')?.textContent || '') &&
            normalize(row.querySelector('span em')?.textContent || '') &&
            normalize(row.querySelector('strong b')?.textContent || '') &&
            normalize(row.querySelector('strong small')?.textContent || '')
          ));
          return {
            pass: Boolean(
              root &&
              detailButton &&
              detailSurface &&
              detailRows &&
              rowNodes.length >= 3 &&
              beforeVisible === 0 &&
              beforeExpanded === 'false' &&
              afterVisible === rowNodes.length &&
              afterExpanded === 'true' &&
              detailRows.getAttribute('aria-hidden') === 'false' &&
              buttonText.includes('收起详情') &&
              rowsUnclipped &&
              rowEvidenceComplete &&
              (!incidentMode || normalize(rowNodes[0]?.querySelector('.ik-mobile-row-token')?.textContent || '') === '!')
            ),
            section: sectionName,
            url: location.href,
            incidentMode,
            rowCount: rowNodes.length,
            beforeVisible,
            afterVisible,
            beforeExpanded,
            afterExpanded,
            buttonText,
            rowsUnclipped,
            surfaceHeight: surfaceRect?.height || 0,
            rowEvidenceComplete,
            viewport: { width: innerWidth, height: innerHeight }
          };
        })();
      }
      if (sectionName === 'mobileNormalHome' || sectionName === 'mobileAppHome' || sectionName === 'mobileNoSnapshotHome' || sectionName === 'mobileResourceHome' || sectionName === 'mobileInterfaceHome' || sectionName === 'mobileCollectionHome') {
        const root = sectionEl?.querySelector('[data-overview-mobile-console]');
        const screen = sectionEl?.querySelector('[data-overview-mobile-first-screen="app-home"]');
        const surface = sectionEl?.querySelector('.ik-mobile-supporting-surface');
        const hero = sectionEl?.querySelector('.ik-mobile-primary-conclusion');
        const list = surface?.querySelector('.ik-mobile-supporting-list');
        const terminalList = null;
        const terminalRows = Array.from(list?.querySelectorAll('.ik-mobile-deferred-row') || []);
        const visibleTerminalRows = terminalRows.filter((node) => {
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        });
        const expectedBySection = {
          mobileNormalHome: {
            ia: 'normal-operations-first',
            listKind: 'terminal-ranking',
            topSlot: 'decision-spine',
            terminalRanking: 'supporting-evidence',
            severity: 'normal',
            impactScope: 'normal-ops',
            impactPlane: 'business',
            mode: 'normal',
            requiredText: ['WAN 趋势', '网络可用', 'WAN', '默认路由', '采集', '快照', '运行明细']
          },
          mobileAppHome: {
            ia: 'wan-offline-default-route-collection-success-first',
            listKind: 'wan-incident',
            topSlot: 'wan-incident',
            terminalRanking: 'not-mounted',
            severity: 'p0',
            impactScope: 'internet-down',
            impactPlane: 'forwarding',
            mode: 'p0',
            requiredText: ['外网不可用', '默认路由', '采集', '最近']
          },
          mobileNoSnapshotHome: {
            ia: 'trust-boundary-no-business-data',
            listKind: 'snapshot-boundary',
            topSlot: 'trust-boundary',
            terminalRanking: 'not-mounted',
            severity: 'p0',
            impactScope: 'business-hidden',
            impactPlane: 'business',
            mode: 'p0',
            requiredText: ['业务数据不可判', '可信边界', '不展示', '可信度', '下一步', '快照']
          },
          mobileResourceHome: {
            ia: 'resource-pressure-evidence-first',
            listKind: 'resource-incident',
            topSlot: 'resource-pressure',
            terminalRanking: 'supporting-evidence',
            severity: 'p1',
            impactScope: 'resource-constrained',
            impactPlane: 'forwarding',
            mode: 'incident',
            requiredText: ['资源过载', '业务仍可用', '转发余量低']
          },
          mobileInterfaceHome: {
            ia: 'interface-carrier-impact-first',
            listKind: 'interface-incident',
            topSlot: 'interface-impact',
            terminalRanking: 'secondary-collapsed',
            severity: 'p1',
            impactScope: 'carrier-unknown',
            impactPlane: 'forwarding',
            mode: 'incident',
            requiredText: ['接口异常', '承载关系待判', '默认路由']
          },
          mobileCollectionHome: {
            ia: 'collection-boundary-first',
            listKind: 'collection-boundary',
            topSlot: 'collection-boundary',
            terminalRanking: 'secondary-collapsed',
            severity: 'p2',
            impactScope: 'collection-only',
            impactPlane: 'collection',
            mode: 'incident',
            requiredText: ['采集不完整', '采集可信度下降', '可信度', '下一步']
          }
        };
        const expectedConfig = expectedBySection[sectionName];
        const expectedListKind = expectedConfig.listKind;
        const expectedTerminalRanking = expectedConfig.terminalRanking;
        const requiredText = expectedConfig.requiredText;
        const missing = requiredText.filter((item) => !text.includes(item));
        const isEffectivelyVisible = (node) => {
          let current = node;
          while (current && current !== sectionEl?.parentElement) {
            const style = getComputedStyle(current);
            if (
              style.display === 'none' ||
              style.visibility === 'hidden' ||
              style.visibility === 'collapse' ||
              Number(style.opacity || 1) <= 0.01
            ) return false;
            current = current.parentElement;
          }
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        };
        const wideNodes = Array.from(sectionEl?.querySelectorAll('*') || [])
          .filter(isEffectivelyVisible)
          .map((node) => {
            const rect = node.getBoundingClientRect();
            return { tag: node.tagName, className: String(node.className || ''), width: rect.width, right: rect.right };
          })
          .filter((item) => item.width > innerWidth + 1 || item.right > innerWidth + 1)
          .slice(0, 8);
        const mobileStyleElement = document.querySelector('style[data-overview-mobile-style-stack]');
        const buildTimeMobileCss = Boolean(
          !mobileStyleElement &&
          screen &&
          getComputedStyle(screen).display === 'grid'
        );
        const mobileStyleStack = {
          delivery: 'build-time-css',
          runtimeStylePresent: Boolean(mobileStyleElement),
          computedScreenDisplay: screen ? getComputedStyle(screen).display : '',
        };
        const rootAttrs = root ? {
          scene: root.getAttribute('data-overview-mobile-scene') || '',
          priority: root.getAttribute('data-overview-mobile-priority') || '',
        } : {};
        const mobileTokenNames = ['--ik-blue', '--ik-panel', '--ik-space-4', '--ik-native-shell-contract'];
        const mobileTokenValues = Object.fromEntries(mobileTokenNames.map((name) => [
          name,
          root ? getComputedStyle(root).getPropertyValue(name).trim() : ''
        ]));
        const mobileTokensApplied = mobileTokenNames.every((name) => mobileTokenValues[name]);
        const surfaceAttrs = surface ? {
          list: Boolean(list),
          headers: surface.querySelectorAll('header').length,
          detailControl: Boolean(surface.querySelector('.ik-mobile-detail-entry[aria-controls="mobile-supporting-detail-rows"]')),
          detailRows: surface.querySelectorAll('.ik-mobile-deferred-row').length,
        } : {};
        const heroAttrs = hero ? {
          priority: root?.getAttribute('data-overview-mobile-priority') || '',
          visualKind: Array.from(hero.classList).find((className) => className.startsWith('is-'))?.slice(3) || '',
          rankingPolicy: ''
        } : {};
        const impactLine = surface?.querySelector('.ik-mobile-supporting-list header em');
        const impactLineAttrs = impactLine ? {
          text: normalize(impactLine.textContent || '')
        } : {};
        const hasHorizontalOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 || wideNodes.length > 0;
        const chartRail = hero?.querySelector('.ik-mobile-decision-readouts');
        const trendVisual = hero?.querySelector('.ik-v812-trend-visual');
        const v1072Chart = hero?.querySelector('.ik-mobile-decision-trend');
        const v1072SeriesLegend = v1072Chart?.querySelector('.ik-v1072-series-legend');
        const decisionReadoutGrid = hero?.querySelector('.ik-mobile-decision-readouts');
        const productChart = hero?.querySelector('svg.ik-mobile-line-chart');
        const productDecisionChart = productChart;
        const modelBackedChartPlot = sectionName !== 'mobileNormalHome' || Boolean(
          productChart &&
          productChart.querySelector('.ik-v420-curve.is-main')?.getAttribute('points') &&
          productChart.querySelector('.ik-v420-curve.is-soft')?.getAttribute('points') &&
          productChart.querySelector('.ik-v420-peak-dot') &&
          productChart.querySelector('.ik-v420-focus-dot') &&
          productChart.querySelector('.ik-v945-reference-line')
        );
        const productChartDecision = chartRail?.getAttribute('aria-label') || '';
        const productChartAnomaly = productChartDecision.match(/高位(?:点)?\\s*(\\d+)/)?.[0].replace(/高位(?:点)?\\s*/, '高位点 ') || '';
        const trendColumns = trendVisual ? getComputedStyle(trendVisual).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length : 0;
        const chartRailRect = chartRail?.getBoundingClientRect();
        const trendVisualRect = trendVisual?.getBoundingClientRect();
        const lineChartRect = productChart?.getBoundingClientRect();
        const heroRect = hero?.getBoundingClientRect();
        const chartRailStyle = chartRail ? getComputedStyle(chartRail) : null;
        const chartReadoutCells = Array.from(chartRail?.querySelectorAll(':scope > span') || []);
        const chartReadoutCellRects = chartReadoutCells.map((cell) => cell.getBoundingClientRect());
        const chartReadoutCellHeights = chartReadoutCellRects.map((rect) => rect.height);
        const uniqueAxisCount = (values) => values
          .map((value) => Math.round(value))
          .filter((value, index, items) => items.findIndex((candidate) => Math.abs(candidate - value) <= 1) === index)
          .length;
        const chartReadoutColumnCount = uniqueAxisCount(chartReadoutCellRects.map((rect) => rect.left));
        const chartReadoutRowCount = uniqueAxisCount(chartReadoutCellRects.map((rect) => rect.top));
        const chartRailWithinHero = sectionName !== 'mobileNormalHome' || Boolean(
          chartRailRect &&
          heroRect &&
          chartRailRect.top >= heroRect.top - 1 &&
          chartRailRect.bottom <= heroRect.bottom + 1
        );
        const chartSeriesLegendText = normalize(v1072SeriesLegend?.textContent || '');
        const downloadLine = productChart?.querySelector('.ik-mobile-decision-line.is-download');
        const uploadLine = productChart?.querySelector('.ik-mobile-decision-line.is-upload');
        const downloadLineStyle = downloadLine ? getComputedStyle(downloadLine) : null;
        const uploadLineStyle = uploadLine ? getComputedStyle(uploadLine) : null;
        const chartSeriesPaintProductized = sectionName !== 'mobileNormalHome' || Boolean(
          downloadLineStyle &&
          uploadLineStyle &&
          downloadLineStyle.fill === 'none' &&
          uploadLineStyle.fill === 'none' &&
          downloadLineStyle.stroke !== uploadLineStyle.stroke &&
          downloadLineStyle.stroke !== 'rgb(0, 0, 0)' &&
          uploadLineStyle.stroke !== 'rgb(0, 0, 0)'
        );
        const chartRailLabels = Array.from(chartRail?.querySelectorAll('em') || []);
        const visibleChartRailLabels = chartRailLabels.filter((node) => {
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && Number.parseFloat(style.fontSize || '0') >= 6 && rect.width > 0 && rect.height > 0;
        });
        const visibleChartRailLabelText = visibleChartRailLabels.map((node) => normalize(node.textContent || ''));
        const chartRailFullWidth = sectionName !== 'mobileNormalHome' || Boolean(chartRailRect && trendVisualRect && chartRailRect.width >= trendVisualRect.width - 2);
        const chartRailNotSideBubble = sectionName !== 'mobileNormalHome' || Boolean(chartRailRect && trendVisualRect && Math.abs(chartRailRect.left - trendVisualRect.left) <= 2 && chartRailRect.top >= trendVisualRect.bottom - 2);
        const chartReadoutLabelsVisible = sectionName !== 'mobileNormalHome' || (chartRailLabels.length === 4 && visibleChartRailLabels.length === 4);
        const hasReferenceChartContract = sectionName !== 'mobileNormalHome' || Boolean(
          productChart &&
          productChart.querySelector('.ik-mobile-decision-ref') &&
          productChart.querySelector('.ik-v420-peak-dot') &&
          productChart.querySelector('.ik-mobile-decision-dot') &&
          chartRail?.textContent?.includes('参考')
        );
        const productChartProductized = sectionName !== 'mobileNormalHome' || Boolean(
          productDecisionChart &&
          chartRail &&
          ['当前', '峰值', '参考', '采样'].every((label) => visibleChartRailLabelText.includes(label)) &&
          /当前/.test(productChartDecision) &&
          /峰值/.test(productChartDecision) &&
          /参考/.test(productChartDecision) &&
          /高位(?:点)?/.test(productChartDecision) &&
          /采样/.test(productChartDecision) &&
          /高位点\\s*\\d+/.test(productChartAnomaly)
        );
        const hasProductChartRail = sectionName !== 'mobileNormalHome' || Boolean(chartRail);
        const chartDecisionLayoutProductized = sectionName !== 'mobileNormalHome' || Boolean(
          v1072Chart &&
          v1072SeriesLegend &&
          decisionReadoutGrid === chartRail &&
          chartReadoutColumnCount === 2 &&
          chartReadoutRowCount === 2 &&
          chartReadoutCells.length === 4 &&
          chartReadoutCellHeights.every((height) => height >= 24) &&
          chartRailWithinHero &&
          lineChartRect &&
          lineChartRect.height >= 64 &&
          chartSeriesLegendText.includes('下载') &&
          chartSeriesLegendText.includes('上传')
        );
        const hasNativeChartLayout = sectionName !== 'mobileNormalHome' || (hasProductChartRail && trendColumns === 1 && chartRailFullWidth && chartRailNotSideBubble && chartReadoutLabelsVisible && hasReferenceChartContract && productChartProductized && chartDecisionLayoutProductized && chartSeriesPaintProductized);
        const judgementLabel = root?.querySelector('.ik-v960-judgement-strip > strong b');
        const judgementLabelNoEllipsis = !judgementLabel || getComputedStyle(judgementLabel).textOverflow !== 'ellipsis';
        const bottomTabs = screen?.querySelector('.ik-v420-tabs');
        const bottomTabsStyle = bottomTabs ? getComputedStyle(bottomTabs) : null;
        const bottomTabsQuiet = Boolean(
          bottomTabsStyle &&
          Number.parseFloat(bottomTabsStyle.borderTopWidth || '0') === 0 &&
          (bottomTabsStyle.boxShadow === 'none' || bottomTabsStyle.boxShadow === 'rgba(0, 0, 0, 0) 0px 0px 0px 0px')
        );
        const heroStyle = hero ? getComputedStyle(hero) : null;
        const surfaceStyle = surface ? getComputedStyle(surface) : null;
        const timeline = surface?.querySelector('.ik-v420-timeline');
        const timelineStyle = timeline ? getComputedStyle(timeline) : null;
        const groupedSurfaceNodes = [surface, list, timeline].filter(Boolean);
        const groupedSurfaceStyles = groupedSurfaceNodes.map((node) => getComputedStyle(node));
        const groupedSeparatorNodes = Array.from(surface?.querySelectorAll('.ik-v420-timeline-row, .ik-v420-list header, .ik-v420-list-row') || []);
        const groupedSeparatorStyles = groupedSeparatorNodes.map((node) => getComputedStyle(node));
        const isZeroBorderBox = (style) => Boolean(
          style &&
          Number.parseFloat(style.borderTopWidth || '0') === 0 &&
          Number.parseFloat(style.borderRightWidth || '0') === 0 &&
          Number.parseFloat(style.borderBottomWidth || '0') === 0 &&
          Number.parseFloat(style.borderLeftWidth || '0') === 0
        );
        const isSeparatorOnlyShadow = (value) => {
          const compact = String(value || '').replaceAll(' ', '');
          return compact === '' || compact === 'none' || (compact.includes('inset') && !compact.includes('4px') && !compact.includes('8px') && !compact.includes('12px'));
        };
        const mobileGroupedSurfaceLowBorder = Boolean(
          groupedSurfaceStyles.length >= 2 &&
          groupedSurfaceStyles.every((style) => isZeroBorderBox(style) && isSeparatorOnlyShadow(style.boxShadow || '')) &&
          groupedSeparatorStyles.length >= 2 &&
          groupedSeparatorStyles.every((style) => (
            isZeroBorderBox(style) &&
            isSeparatorOnlyShadow(style.boxShadow || '') &&
            (style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.backgroundColor === 'transparent')
          ))
        );
        const judgementStrip = root?.querySelector('[data-overview-mobile-v1044-judgement-strip="compact-conclusion-only"]');
        const trustStrip = root?.querySelector('.ik-v910-trust-strip');
        const judgementStyle = judgementStrip ? getComputedStyle(judgementStrip) : null;
        const trustStripStyle = trustStrip ? getComputedStyle(trustStrip) : null;
        const metricGrid = root?.querySelector('.ik-mobile-core-facts');
        const metricGridStyle = metricGrid ? getComputedStyle(metricGrid) : null;
        const metricCells = Array.from(metricGrid?.querySelectorAll('span') || []);
        const metricLabels = metricCells.map((cell) => normalize(cell.querySelector('em')?.textContent || ''));
        const expectedMetricLabels = sectionName === 'mobileNormalHome'
          ? ['WAN', '默认路由', '采集', '快照']
          : ['WAN', '采集', '资源', '快照'];
        const metricGridColumnCount = (metricGridStyle?.gridTemplateColumns || '').split(' ').filter(Boolean).length;
        const isLandscapeMobile = innerWidth > innerHeight;
        const metricGridProductized = Boolean(
          (!judgementStrip || !judgementStrip.querySelector('.ik-mobile-core-facts')) &&
          metricGrid &&
          metricCells.length === 4 &&
          expectedMetricLabels.every((label) => metricLabels.includes(label)) &&
          metricGridStyle &&
          metricGridStyle.display === 'grid' &&
          (isLandscapeMobile
            ? metricGridColumnCount === 2 &&
              (metricGridStyle.gridTemplateRows || '').split(' ').filter(Boolean).length === 2 &&
              Number.parseFloat(metricGridStyle.height || '0') >= 112
            : metricGridColumnCount === 1 &&
              (metricGridStyle.gridTemplateRows || '').split(' ').filter(Boolean).length === 4 &&
              Number.parseFloat(metricGridStyle.height || '0') >= 184)
        );
        const normalSummaryStrip = sectionName === 'mobileNormalHome' ? metricGrid : null;
        const normalSummaryCells = Array.from(normalSummaryStrip?.querySelectorAll('.ik-mobile-fact') || []);
        const normalSummaryCellIds = normalSummaryCells.map((cell) => {
          const label = normalize(cell.querySelector('em')?.textContent || '');
          return label === '默认路由' ? 'route' : label === '采集' ? 'collection' : label === '快照' ? 'snapshot' : label.toLowerCase();
        });
        const normalSummaryLabels = normalSummaryCells.map((cell) => normalize(cell.querySelector('em')?.textContent || ''));
        const normalSummaryStyle = normalSummaryStrip ? getComputedStyle(normalSummaryStrip) : null;
        const normalChartLabel = hero?.querySelector('.ik-v1065-chart-kicker');
        const normalChartLabelStyle = normalChartLabel ? getComputedStyle(normalChartLabel) : null;
        const normalChartLabelRect = normalChartLabel?.getBoundingClientRect();
        const normalHeroHeadline = hero?.querySelector('.ik-v620-hero-head');
        const normalHeroHeadlineStyle = normalHeroHeadline ? getComputedStyle(normalHeroHeadline) : null;
        const normalHeroHeadlineRect = normalHeroHeadline?.getBoundingClientRect();
        const firstScreenOrderNodes = [hero, metricGrid, surface];
        const firstScreenOrderProductized = firstScreenOrderNodes.every(Boolean) && firstScreenOrderNodes.every((node, index) => (
          index === firstScreenOrderNodes.length - 1 ||
          Boolean(node.compareDocumentPosition(firstScreenOrderNodes[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING)
        ));
        const normalNativeFirstScreen = sectionName !== 'mobileNormalHome' || Boolean(
          hero?.classList.contains('is-trend') &&
          firstScreenOrderProductized &&
          !judgementStrip &&
          !trustStrip &&
          metricGrid &&
          normalChartLabel &&
          normalize(hero.querySelector('.ik-mobile-decision-head h1')?.textContent || '').includes('网络可用') &&
          normalize(normalChartLabel.textContent || '').startsWith('WAN 趋势 · ') &&
          normalChartLabelStyle &&
          normalChartLabelStyle.display !== 'none' &&
          normalChartLabelRect &&
          normalChartLabelRect.width > 0 &&
          normalChartLabelRect.height > 0 &&
          (
            !normalHeroHeadline ||
            (
              normalHeroHeadlineStyle &&
              normalHeroHeadlineStyle.display === 'none' &&
              (!normalHeroHeadlineRect || normalHeroHeadlineRect.height <= 1)
            )
          )
        );
        const firstScreenChannelRail = root?.querySelector('.ik-mobile-channel-decision');
        const firstScreenChannelCells = Array.from(firstScreenChannelRail?.querySelectorAll('.ik-mobile-decision-cell') || []);
        const firstScreenChannelEvidenceVisible = Boolean(
          firstScreenChannelRail &&
          firstScreenChannelCells.length >= 4 &&
          ['对象', '影响', '可信度', '下一步'].every((label) => (
            firstScreenChannelCells.some((cell) => normalize(cell.querySelector('em')?.textContent || '') === label)
          ))
        );
        const firstScreenMetricTrustVisible = Boolean(
          metricGrid &&
          ['采集', '快照'].every((label) => metricLabels.includes(label)) &&
          /REST|SSH|缓存|通道|快照/.test(normalize(metricGrid.textContent || ''))
        );
        const collectionTrustRail = root?.querySelector('[data-overview-mobile-v1058-collection-trust="routeros-rest-ssh-snapshot-fixed-abnormal-first-screen"]');
        const collectionTrustCells = Array.from(collectionTrustRail?.querySelectorAll('[data-overview-mobile-v1058-collection-channel]') || []);
        const collectionTrustLabels = collectionTrustCells.map((cell) => cell.getAttribute('data-overview-mobile-v1058-collection-channel') || '');
        const collectionTrustRailFixed = sectionName === 'mobileNormalHome' ? !collectionTrustRail : Boolean(
          (
            firstScreenChannelEvidenceVisible ||
            firstScreenMetricTrustVisible ||
            (
              collectionTrustRail &&
              collectionTrustCells.length === 4 &&
              ['RouterOS', 'REST', 'SSH', '快照'].every((label) => collectionTrustLabels.includes(label)) &&
              collectionTrustCells.every((cell) => {
                const style = getComputedStyle(cell);
                const rect = cell.getBoundingClientRect();
                return rect.width > 0 &&
                  rect.height >= 18 &&
                  style.boxShadow === 'none' &&
                  Number.parseFloat(style.borderLeftWidth || '0') <= 1 &&
                  normalize(cell.querySelector('b')?.textContent || '').length > 0 &&
                  normalize(cell.querySelector('em')?.textContent || '').length > 0;
              })
            )
          )
        );
        const collectionTrustSeparatedFromImpact = sectionName === 'mobileNormalHome' ? Boolean(
          !collectionTrustRail &&
          firstScreenMetricTrustVisible
        ) : Boolean(
          (
            firstScreenChannelEvidenceVisible ||
            firstScreenMetricTrustVisible ||
            (
              collectionTrustCells.length === 4 &&
              collectionTrustCells.every((cell) => cell.getAttribute('data-overview-mobile-v1059-plane') === 'collection')
            )
          )
        );
        const detailEntry = list?.querySelector('.ik-mobile-detail-entry[aria-controls="mobile-supporting-detail-rows"]');
        const deferredRows = list?.querySelector('#mobile-supporting-detail-rows.ik-mobile-supporting-detail-rows');
        const detailEntryVisible = Boolean(detailEntry && (() => {
          const style = getComputedStyle(detailEntry);
          const rect = detailEntry.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height >= 40;
        })());
        const evidenceDeferred = Boolean(
          detailEntryVisible &&
          deferredRows
        );
        const listEvidenceRows = Array.from(list?.querySelectorAll('.ik-mobile-deferred-row') || []);
        const listEvidence = listEvidenceRows.map((row) => ({
          name: normalize(row.querySelector('span b')?.textContent || ''),
          meta: normalize(row.querySelector('span em')?.textContent || ''),
          value: normalize(row.querySelector('strong b')?.textContent || ''),
          status: normalize(row.querySelector('strong small')?.textContent || '')
        }));
        const primaryListEvidenceStandardized = Boolean(
          listEvidenceRows.length > 0 &&
          listEvidence.every((item) => (
            item.name &&
            item.meta &&
            item.value &&
            item.status
          ))
        );
        const listStyle = list ? getComputedStyle(list) : null;
        const routerTabs = root?.querySelector('nav[aria-label="路由器监控底部导航"]');
        const routerTabItems = Array.from(routerTabs?.querySelectorAll('button[aria-controls^="mobile-"]') || []);
        const routerTabIds = routerTabItems.map((item) => (item.getAttribute('aria-controls') || '').replace(/^mobile-/, '').replace(/-view$/, ''));
        const routerTabTargets = routerTabItems.map((item) => item.getAttribute('aria-controls') || '');
        const routerTabLabels = routerTabItems.map((item) => normalize(item.textContent || ''));
        const routerTabTouchTargetsOk = routerTabItems.every((item) => {
          const rect = item.getBoundingClientRect();
          const label = item.querySelector('span');
          const labelStyle = label ? getComputedStyle(label) : null;
          return rect.height >= 44 && labelStyle && Number.parseFloat(labelStyle.fontSize || '0') >= 10;
        });
        const routerTabActiveItems = routerTabItems.filter((item) => item.classList.contains('is-active'));
        const routerTabActiveStyle = routerTabActiveItems[0] ? getComputedStyle(routerTabActiveItems[0]) : null;
        const routerTabActivePaint = (routerTabActiveStyle?.color || '') + ' ' + (routerTabActiveStyle?.boxShadow || '');
      const routerTabActiveCompact = routerTabActivePaint.replaceAll(' ', '');
      const routerTabActiveNeutral = Boolean(
        routerTabActiveStyle &&
        routerTabActiveCompact.includes('18,34,55') &&
        !routerTabActiveCompact.includes('20,115,230')
      );
        const statusHeader = root?.querySelector('.ik-mobile-device-bar');
        const statusHeaderAction = statusHeader?.querySelector('button, a');
        const statusHeaderActionStyle = statusHeaderAction ? getComputedStyle(statusHeaderAction) : null;
        const statusHeaderActionLabel = statusHeaderAction?.getAttribute('aria-label') || '';
        const statusHeaderLabel = statusHeader?.getAttribute('aria-label') || '';
        const statusHeaderTitle = statusHeader?.querySelector('.ik-mobile-device-title');
        const statusHeaderState = statusHeader?.querySelector('.ik-v240-status');
        const statusHeaderTitleRect = statusHeaderTitle?.getBoundingClientRect();
        const statusHeaderStateRect = statusHeaderState?.getBoundingClientRect();
        const statusHeaderStateStyle = statusHeaderState ? getComputedStyle(statusHeaderState) : null;
        const statusHeaderFlatAndSeparated = Boolean(
          statusHeaderTitleRect &&
          statusHeaderStateRect &&
          statusHeaderTitleRect.right <= statusHeaderStateRect.left - 4 &&
          statusHeaderStateStyle &&
          Number.parseFloat(statusHeaderStateStyle.borderTopWidth || '0') === 0 &&
          statusHeaderStateStyle.backgroundColor === 'rgba(0, 0, 0, 0)' &&
          statusHeaderStateStyle.boxShadow === 'none'
        );
        const routerStatusHeaderProductized = Boolean(
          statusHeader &&
          statusHeaderLabel.includes('RouterOS') &&
          statusHeaderFlatAndSeparated &&
          !statusHeaderAction
        );
        const routerBottomTabsProductized = Boolean(
          routerTabs &&
          routerTabItems.length === 5 &&
          ['home', 'wan', 'interface', 'terminal', 'log'].every((id) => routerTabIds.includes(id)) &&
          routerTabTargets.includes('mobile-home-view') &&
          Boolean(document.getElementById('mobile-home-view')) &&
          ['首页', 'WAN', '接口', '终端', '日志'].every((label) => routerTabLabels.includes(label)) &&
          routerTabActiveItems.length === 1 &&
          routerTabTouchTargetsOk &&
          routerTabActiveItems[0]?.getAttribute('aria-current') === 'page' &&
          routerTabActiveStyle &&
          routerTabActiveNeutral &&
          Number.parseFloat(routerTabActiveStyle.borderTopWidth || '0') === 0 &&
          !/rgba?\([^)]*,\s*0\.[2-9][^)]*\)\s+0px\s+0px\s+[4-9]/.test(routerTabActiveStyle.boxShadow || '')
        );
        const activeTabStyle = bottomTabs?.querySelector('button.is-active') ? getComputedStyle(bottomTabs.querySelector('button.is-active')) : null;
        const activeTabShadow = activeTabStyle?.boxShadow || '';
        const activeTabLowNoise = Boolean(
          activeTabStyle &&
          Number.parseFloat(activeTabStyle.borderTopWidth || '0') === 0 &&
          !/rgba?\([^)]*,\s*0\.[2-9][^)]*\)\s+0px\s+0px\s+[4-9]/.test(activeTabShadow)
        );
        const appRhythmPolished = Boolean(
          heroStyle &&
          listStyle &&
          bottomTabsStyle &&
          activeTabLowNoise &&
          Number.parseFloat(heroStyle.borderTopWidth || '0') <= 1 &&
          Number.parseFloat(listStyle.borderTopWidth || '0') === 0 &&
          /rgba?\\((?:245|247|250),\\s*(?:249|250|252),\\s*(?:253|255)/.test(bottomTabsStyle.backgroundColor || '')
        );
        const nativeTrustSpinePolished = Boolean(
          mobileTokensApplied &&
          surfaceStyle &&
          heroStyle &&
          listStyle &&
          !judgementStrip &&
          !trustStrip &&
          Number.parseFloat(heroStyle.borderTopWidth || '0') <= 1 &&
          Number.parseFloat(listStyle.borderTopWidth || '0') === 0 &&
          Number.parseFloat(surfaceStyle.borderTopWidth || '0') === 0 &&
          Number.parseFloat(surfaceStyle.borderRadius || '0') >= 8 &&
          !/rgba?\([^)]*,\s*0\.[2-9][^)]*\)\s+0px\s+(?:[2-9]|1\d)px\s+(?:1\d|2\d)/.test(heroStyle.boxShadow || '') &&
          !/rgba?\([^)]*,\s*0\.[2-9][^)]*\)\s+0px\s+(?:2|3|4|5|6|7|8|9|1\d)px/.test(listStyle.boxShadow || '')
        );
        const resourceLedger = hero?.querySelector('.ik-mobile-resource-decision');
        const resourceRows = Array.from(resourceLedger?.querySelectorAll('.ik-mobile-resource-line') || []);
        const resourceVisualModelBacked = sectionName !== 'mobileResourceHome' || Boolean(
          resourceLedger &&
          resourceRows.length >= 3 &&
          resourceRows.every((row) => {
            return Boolean(
              row.querySelector('b')?.textContent &&
              row.querySelector('strong')?.textContent &&
              normalize(row.querySelector('small')?.textContent || '').startsWith('阈') &&
              normalize(row.querySelector('em')?.textContent || '').length > 0
            );
          })
        );
        const resourceTrackFills = resourceRows.map((row) => {
          const fill = row.querySelector('.ik-density-resource-track span, i u');
          return fill ? getComputedStyle(fill).backgroundImage + ' ' + getComputedStyle(fill).backgroundColor : '';
        });
        const resourceTrackNoiseLow = sectionName !== 'mobileResourceHome' || Boolean(
          resourceLedger &&
          resourceRows.length >= 3 &&
          resourceTrackFills.length >= 3 &&
          resourceTrackFills.every((value) => !/20,\\s*115,\\s*230|147,\\s*58,\\s*52|184,\\s*58,\\s*50/.test(value))
        );
        const parseRuntimeCssColor = (value) => {
          const match = String(value || '').match(/rgba?\\(([^)]+)\\)/i);
          if (!match) return { r: 0, g: 0, b: 0, a: 0 };
          const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
          return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0, a: Number.isFinite(parts[3]) ? parts[3] : 1 };
        };
        const isStrongRedFill = (value) => {
          const color = parseRuntimeCssColor(value);
          return color.a > 0.08 && color.r > 120 && color.r > color.g * 1.35 && color.r > color.b * 1.35 && color.g < 135 && color.b < 135;
        };
        const wanPortMatrix = hero?.querySelector('[data-overview-mobile-v1042-wan-port-matrix="compact-router-port-matrix-interface-state-carrier-no-toy-capsules"]');
        const wanPortCells = Array.from(wanPortMatrix?.querySelectorAll('[data-overview-mobile-wan-port-cell="router-port"]') || []);
        const wanPortCellNoise = wanPortCells.map((cell) => {
          const style = getComputedStyle(cell);
          const rect = cell.getBoundingClientRect();
          const backgroundColor = style.backgroundColor || '';
          const boxShadow = style.boxShadow || '';
          const radius = Number.parseFloat(style.borderRadius || '0');
          const hasInterface = Boolean(cell.querySelector('[data-overview-mobile-wan-port-interface]') || cell.getAttribute('data-overview-mobile-wan-port-interface'));
          const hasCarrier = Boolean(cell.querySelector('[data-overview-mobile-wan-port-carrier]'));
          const hasState = Boolean(cell.querySelector('[data-overview-mobile-wan-port-state]'));
          const carrier = cell.getAttribute('data-overview-mobile-wan-port-carrier') || '';
          const portState = cell.getAttribute('data-overview-mobile-wan-port-state') || '';
          const role = cell.getAttribute('data-overview-mobile-v1062-wan-role') || '';
          const impact = cell.getAttribute('data-overview-mobile-v1062-wan-impact') || '';
          const businessImpact = cell.getAttribute('data-overview-mobile-v1062-wan-business-impact') || '';
          const routeBinding = cell.getAttribute('data-overview-mobile-v1062-wan-route-binding') || '';
          return {
            radius,
            backgroundColor,
            boxShadow,
            width: rect.width,
            height: rect.height,
            hasInterface,
            hasCarrier,
            hasState,
            carrier,
            portState,
            role,
            impact,
            businessImpact,
            routeBinding,
            strongRedFill: isStrongRedFill(backgroundColor),
            raisedShadow: Boolean(boxShadow && boxShadow !== 'none' && !boxShadow.includes('inset')),
            quietHairline: Boolean(boxShadow.includes('inset') && (
              boxShadow.replace(/\\s+/g, '').includes('104,127,151') ||
              boxShadow.replace(/\\s+/g, '').includes('142,169,196') ||
              boxShadow.replace(/\\s+/g, '').includes('226,235,244')
            ))
          };
        });
        const wanPortEvidenceDeferred = sectionName !== 'mobileAppHome' || Boolean(
          !wanPortMatrix &&
          wanPortCells.length === 0 &&
          evidenceDeferred &&
          listEvidence.some((item) => /默认路由|出口|WAN/.test(item.name + ' ' + item.meta))
        );
        const channelRail = hero?.querySelector('.ik-mobile-channel-decision');
        const channelRailModelBacked = (sectionName !== 'mobileNoSnapshotHome' && sectionName !== 'mobileCollectionHome') || Boolean(channelRail);
        const abnormalDecisionRail = hero?.querySelector('.ik-mobile-abnormal-decision-rail');
        const abnormalDecisionCells = Array.from(abnormalDecisionRail?.querySelectorAll('.ik-mobile-decision-cell') || []);
        const abnormalDecisionLabels = abnormalDecisionCells.map((cell) => normalize(cell.querySelector('em')?.textContent || ''));
        const abnormalDecisionValues = abnormalDecisionCells.map((cell) => normalize(cell.querySelector('b')?.textContent || ''));
        const abnormalDecisionRailStyle = abnormalDecisionRail ? getComputedStyle(abnormalDecisionRail) : null;
        const abnormalDecisionSummary = abnormalDecisionRail?.querySelector('.ik-mobile-incident-summary');
        const abnormalDecisionGuidance = abnormalDecisionRail?.querySelector('.ik-mobile-incident-guidance');
        const abnormalDecisionSummaryStyle = abnormalDecisionSummary ? getComputedStyle(abnormalDecisionSummary) : null;
        const abnormalDecisionGuidanceStyle = abnormalDecisionGuidance ? getComputedStyle(abnormalDecisionGuidance) : null;
        const abnormalDecisionRailRect = abnormalDecisionRail?.getBoundingClientRect();
        const abnormalListRows = expectedConfig.mode === 'normal'
          ? []
          : Array.from(list?.querySelectorAll('.ik-v420-list-row') || []);
        const abnormalListRowRects = abnormalListRows.map((row) => row.getBoundingClientRect());
        const abnormalListRowStyles = abnormalListRows.map((row) => {
          const style = getComputedStyle(row);
          return {
            minHeight: style.minHeight,
            height: style.height,
            paddingTop: style.paddingTop,
            paddingBottom: style.paddingBottom
          };
        });
        const abnormalDecisionCellNoise = abnormalDecisionCells.map((cell) => {
          const style = getComputedStyle(cell);
          const rect = cell.getBoundingClientRect();
          const backgroundColor = style.backgroundColor || '';
          const boxShadow = style.boxShadow || '';
          return {
            width: rect.width,
            height: rect.height,
            backgroundColor,
            boxShadow,
            borderLeftWidth: style.borderLeftWidth,
            strongRedFill: isStrongRedFill(backgroundColor),
            raisedShadow: Boolean(boxShadow && boxShadow !== 'none' && !boxShadow.includes('inset'))
          };
        });
        const abnormalDecisionRailProductized = sectionName === 'mobileNormalHome' ? !abnormalDecisionRail : Boolean(
          abnormalDecisionRail &&
          abnormalDecisionRailStyle &&
          abnormalDecisionRailStyle.display === 'flex' &&
          abnormalDecisionSummaryStyle?.display === 'grid' &&
          abnormalDecisionGuidanceStyle?.display === 'grid' &&
          (abnormalDecisionSummaryStyle.gridTemplateColumns || '').split(' ').length === 2 &&
          (abnormalDecisionGuidanceStyle.gridTemplateColumns || '').split(' ').length === 2 &&
          abnormalDecisionCells.length === 4 &&
          ['对象', '影响', '可信度', '下一步'].every((label) => abnormalDecisionLabels.includes(label)) &&
          abnormalDecisionValues.every((value) => value.length > 0) &&
          abnormalDecisionCellNoise.every((cell) => (
            cell.width > 0 &&
            cell.height >= 36 &&
            !cell.strongRedFill &&
            !cell.raisedShadow &&
            Number.parseFloat(cell.borderLeftWidth || '0') <= 1
          ))
        );
        const abnormalHeroLayoutStable = expectedConfig.mode === 'normal' || Boolean(
          heroRect &&
          heroRect.height >= 200 &&
          abnormalDecisionRailRect &&
          abnormalDecisionRailRect.height >= 40 &&
          abnormalDecisionRailRect.top >= heroRect.top - 1 &&
          abnormalDecisionRailRect.bottom <= heroRect.bottom + 1 &&
          (
            evidenceDeferred
              ? detailEntryVisible && abnormalListRowRects.every((rect) => rect.width === 0 || rect.height === 0)
              : abnormalListRowRects.length > 0 &&
                abnormalListRowRects.every((rect) => rect.width > 0 && rect.height >= 42)
          )
        );
        const appRect = root?.getBoundingClientRect();
        const screenRect = screen?.getBoundingClientRect();
        const appViewportBounded = Boolean(
          appRect &&
          screenRect &&
          appRect.height <= innerHeight + 16 &&
          screenRect.height <= innerHeight + 16 &&
          screen.scrollHeight <= screen.clientHeight + 96
        );
        const abnormalViewportOverflowFree = expectedConfig.mode === 'normal' || Boolean(
          appRect &&
          screenRect &&
          appRect.height <= innerHeight + 16 &&
          screenRect.height <= innerHeight + 16 &&
          screen.scrollHeight <= screen.clientHeight + 16 &&
          !hasHorizontalOverflow
        );
        const firstScreenText = normalize(screen?.textContent || '');
        const styleTextLeakedIntoOverview = Boolean(
          /@media\\s*\\(|--ik-v\\d|data-overview-mobile-v\\d|box-shadow\\s*:|grid-template-columns\\s*:/.test(firstScreenText)
        );
        const terminalRankingCopyVisible = ['设备排行', '高流量终端', '终端排行'].some((item) => firstScreenText.includes(item));
        const surfacePolicyModelBacked = Boolean(
          surfaceAttrs.list &&
          surfaceAttrs.headers === 1 &&
          surfaceAttrs.detailControl &&
          surfaceAttrs.detailRows > 0 &&
          firstScreenOrderProductized
        );
        const statusCoreBlocks = Array.from(surface?.querySelectorAll('[data-row-id]') || []).map((row) => ({
          id: row.getAttribute('data-row-id') || '',
          coreBlock: row.getAttribute('data-overview-mobile-core-block') || ''
        }));
        const coreBlockById = Object.fromEntries(statusCoreBlocks.map((row) => [row.id, row.coreBlock]));
        const statusCoreBlocksModelBacked = Boolean(
          (!coreBlockById['timeline-wan'] || coreBlockById['timeline-wan'] === 'wan') &&
          (!coreBlockById['timeline-collection'] || coreBlockById['timeline-collection'] === 'collection') &&
          (!coreBlockById['timeline-resource'] || coreBlockById['timeline-resource'] === 'resource')
        );
        const pass = Boolean(
          root &&
          screen &&
          surface &&
          hero &&
          buildTimeMobileCss &&
          mobileTokensApplied &&
          nativeTrustSpinePolished &&
          metricGridProductized &&
          mobileGroupedSurfaceLowBorder &&
          normalNativeFirstScreen &&
          collectionTrustRailFixed &&
          collectionTrustSeparatedFromImpact &&
          hasProductChartRail &&
          hasNativeChartLayout &&
          productChartProductized &&
          modelBackedChartPlot &&
          judgementLabelNoEllipsis &&
          bottomTabsQuiet &&
          routerBottomTabsProductized &&
          routerStatusHeaderProductized &&
          appRhythmPolished &&
          surfacePolicyModelBacked &&
          statusCoreBlocksModelBacked &&
          primaryListEvidenceStandardized &&
          resourceTrackNoiseLow &&
          resourceVisualModelBacked &&
          wanPortEvidenceDeferred &&
          channelRailModelBacked &&
          abnormalDecisionRailProductized &&
          abnormalHeroLayoutStable &&
          appViewportBounded &&
          abnormalViewportOverflowFree &&
          (expectedConfig.mode === 'normal'
            ? !firstScreenText.includes('正常状态总览')
            : expectedConfig.mode === 'p0'
            ? abnormalDecisionRailProductized
            : true) &&
          (expectedConfig.mode === 'normal'
            ? !terminalRankingCopyVisible && (evidenceDeferred ? visibleTerminalRows.length === 0 : (visibleTerminalRows.length >= 1 && visibleTerminalRows.length <= 3))
            : !terminalRankingCopyVisible && (evidenceDeferred ? visibleTerminalRows.length === 0 : visibleTerminalRows.length >= 1)) &&
          !styleTextLeakedIntoOverview &&
          missing.length === 0 &&
          !hasHorizontalOverflow
        );
        return {
          pass,
          section: sectionName,
          url: location.href,
          missing,
          mobileStyleStack,
          rootAttrs,
          mobileTokensApplied,
          mobileTokenValues,
          surfaceAttrs,
          heroAttrs,
          expectedConfig,
          impactLineAttrs,
          listText: normalize(list?.textContent || '').slice(0, 240),
          terminalListMounted: Boolean(terminalList),
          terminalRowCount: terminalRows.length,
          visibleTerminalRowCount: visibleTerminalRows.length,
          evidenceDeferred,
          detailEntryVisible,
          terminalRankingCopyVisible,
          styleTextLeakedIntoOverview,
          hasHorizontalOverflow,
          hasProductChartRail,
          hasNativeChartLayout,
          productChartProductized,
          modelBackedChartPlot,
          productChartDecision,
          productChartAnomaly,
          chartRailFullWidth,
          chartRailNotSideBubble,
          chartReadoutLabelsVisible,
          chartDecisionLayoutProductized,
          chartReadoutColumnCount,
          chartReadoutRowCount,
          chartReadoutCellHeights,
          chartReadoutCellPositions: chartReadoutCellRects.map((rect) => ({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom })),
          chartRailComputedColumns: chartRailStyle?.gridTemplateColumns || '',
          chartRailComputedRows: chartRailStyle?.gridTemplateRows || '',
          chartRailWithinHero,
          chartRailRect: chartRailRect ? { left: chartRailRect.left, top: chartRailRect.top, right: chartRailRect.right, bottom: chartRailRect.bottom, width: chartRailRect.width, height: chartRailRect.height } : null,
          heroRect: heroRect ? { left: heroRect.left, top: heroRect.top, right: heroRect.right, bottom: heroRect.bottom, width: heroRect.width, height: heroRect.height } : null,
          chartRailClassName: chartRail?.className || '',
          lineChartHeight: lineChartRect?.height || 0,
          chartSeriesLegendText,
          chartSeriesPaintProductized,
          chartSeriesPaint: {
            download: { stroke: downloadLineStyle?.stroke || '', fill: downloadLineStyle?.fill || '' },
            upload: { stroke: uploadLineStyle?.stroke || '', fill: uploadLineStyle?.fill || '' },
          },
          hasReferenceChartContract,
          visibleChartRailLabelCount: visibleChartRailLabels.length,
          visibleChartRailLabelText,
          judgementLabelNoEllipsis,
          bottomTabsQuiet,
          routerBottomTabsProductized,
          routerTabItems: routerTabItems.length,
          routerTabIds,
          routerTabTargets,
          routerTabLabels,
          routerTabTouchTargetsOk,
          routerTabActiveNeutral,
          routerStatusHeaderProductized,
          statusHeaderFlatAndSeparated,
          statusHeaderActionLabel,
          appRhythmPolished,
          surfacePolicyModelBacked,
          statusCoreBlocksModelBacked,
          statusCoreBlocks,
          primaryListEvidenceStandardized,
          listEvidence,
          nativeTrustSpinePolished,
          metricGridProductized,
          mobileGroupedSurfaceLowBorder,
          groupedSurfaceNoise: groupedSurfaceStyles.map((style) => ({
            backgroundColor: style.backgroundColor,
            borderTopWidth: style.borderTopWidth,
            borderRightWidth: style.borderRightWidth,
            borderBottomWidth: style.borderBottomWidth,
            borderLeftWidth: style.borderLeftWidth,
            boxShadow: style.boxShadow
          })),
          groupedSeparatorNoise: groupedSeparatorStyles.slice(0, 6).map((style) => ({
            backgroundColor: style.backgroundColor,
            borderTopWidth: style.borderTopWidth,
            borderRightWidth: style.borderRightWidth,
            borderBottomWidth: style.borderBottomWidth,
            borderLeftWidth: style.borderLeftWidth,
            boxShadow: style.boxShadow
          })),
          normalNativeFirstScreen,
          normalSummaryLabels,
          normalSummaryCellIds,
          normalChartLabelText: normalize(normalChartLabel?.textContent || ''),
          normalHeroHeadlineDisplay: normalHeroHeadlineStyle?.display || '',
          collectionTrustRailFixed,
          collectionTrustSeparatedFromImpact,
          collectionTrustLabels,
          metricLabels,
          metricGridStyle: metricGridStyle ? {
            display: metricGridStyle.display,
            gridTemplateColumns: metricGridStyle.gridTemplateColumns,
            borderTopWidth: metricGridStyle.borderTopWidth,
            boxShadow: metricGridStyle.boxShadow
          } : null,
          resourceTrackNoiseLow,
          resourceVisualModelBacked,
          resourceTrackFills,
          wanPortEvidenceDeferred,
          channelRailModelBacked,
          wanPortCellCount: wanPortCells.length,
          wanPortCellNoise,
          abnormalDecisionRailProductized,
          abnormalHeroLayoutStable,
          abnormalViewportOverflowFree,
          abnormalComputedSizing: {
            heroMinHeight: heroStyle?.minHeight || '',
            heroHeight: heroStyle?.height || '',
            heroMaxHeight: heroStyle?.maxHeight || '',
            railMinHeight: abnormalDecisionRailStyle?.minHeight || '',
            railHeight: abnormalDecisionRailStyle?.height || '',
            listRows: abnormalListRowStyles
          },
          abnormalDecisionRailRect: abnormalDecisionRailRect ? {
            left: abnormalDecisionRailRect.left,
            top: abnormalDecisionRailRect.top,
            right: abnormalDecisionRailRect.right,
            bottom: abnormalDecisionRailRect.bottom,
            width: abnormalDecisionRailRect.width,
            height: abnormalDecisionRailRect.height
          } : null,
          abnormalListRowRects: abnormalListRowRects.map((rect) => ({
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
          })),
          abnormalDecisionLabels,
          abnormalDecisionValues,
          abnormalDecisionCellNoise,
          appRhythmStyles: {
            heroBorderTopWidth: heroStyle?.borderTopWidth || '',
            heroBoxShadow: heroStyle?.boxShadow || '',
            surfaceBackgroundColor: surfaceStyle?.backgroundColor || '',
            surfaceBorderRadius: surfaceStyle?.borderRadius || '',
            judgementBorderTopWidth: judgementStyle?.borderTopWidth || '',
            trustStripBorderTopWidth: trustStripStyle?.borderTopWidth || '',
            listBorderTopWidth: listStyle?.borderTopWidth || '',
            listBoxShadow: listStyle?.boxShadow || '',
            bottomTabsBackgroundColor: bottomTabsStyle?.backgroundColor || '',
            activeTabBackgroundColor: activeTabStyle?.backgroundColor || '',
            activeTabBoxShadow: activeTabStyle?.boxShadow || '',
            activeTabLowNoise
          },
          bottomTabsStyle: bottomTabsStyle ? {
            borderTopWidth: bottomTabsStyle.borderTopWidth,
            borderTopStyle: bottomTabsStyle.borderTopStyle,
            borderTopColor: bottomTabsStyle.borderTopColor,
            boxShadow: bottomTabsStyle.boxShadow
          } : null,
          appViewportBounded,
          documentScrollHeight: document.documentElement.scrollHeight,
          appHeight: appRect ? appRect.height : 0,
          screenHeight: screenRect ? screenRect.height : 0,
          screenScrollHeight: screen ? screen.scrollHeight : 0,
          screenClientHeight: screen ? screen.clientHeight : 0,
          trendColumns,
          wideNodes,
          viewport: { width: innerWidth, height: innerHeight, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth },
          scrollHeight: document.documentElement.scrollHeight,
          textExcerpt: firstScreenText.slice(0, 700)
        };
      }
      return { pass: false, section: sectionName, error: 'unsupported section' };
    })()`;

    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) {
      const detail = result.exceptionDetails;
      const exceptionText = [
        detail.text,
        detail.exception?.description,
        detail.exception?.value
      ].filter(Boolean).join('\n');
      throw new Error(`Resource/balance runtime evaluation failed: ${exceptionText || JSON.stringify(detail)}`);
    }
    const report = result.result?.value || {};
    const screenshot = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true
    });
    await fs.writeFile(outPng, Buffer.from(screenshot.data, 'base64'));
    await fs.writeFile(outJson, JSON.stringify(report, null, 2), 'utf8');

    if (!report.pass) {
      throw new Error(`Resource/balance check failed: ${JSON.stringify(report)}`);
    }
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (socket) {
      try { socket.close(); } catch {}
    }
    browser.kill();
    await delay(300);
    try {
      await fs.rm(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
    } catch {}
    closeServer(staticServer);
  }
}

function isTransientRuntimeError(error) {
  const message = String(error?.stack || error?.message || error || '');
  return /ECONNREFUSED|ECONNRESET|Page websocket URL missing|Failed to open ws:|Timed out opening ws:|Browser exited before debugger|CDP socket|CDP command timed out|chrome-error:\/\/chromewebdata|fetch failed/i.test(message);
}

async function runWithRetries() {
  const attempts = Math.max(
    1,
    Number(arg('--runtime-retries', process.env.CODEX_RESOURCE_RUNTIME_RETRIES || '3')) || 3
  );
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await main();
      return;
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isTransientRuntimeError(error)) {
        throw error;
      }
      console.warn(`[resource-balance] transient runtime retry ${attempt + 1}/${attempts}: ${error.message || error}`);
      await delay(1200 + attempt * 650);
    }
  }
  throw lastError;
}

runWithRetries().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
