#!/usr/bin/env node
'use strict';

const fs = require('fs/promises');
const fsSync = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_VIEWPORTS = [
  { name: 'desktop', width: 1600, height: 1000 },
  { name: 'laptop', width: 1366, height: 900 },
  { name: 'tablet', width: 1024, height: 900 },
  { name: 'narrow', width: 390, height: 844 },
];
const DEFAULT_PUBLIC_SECTIONS = [
  'overview',
  'interfaces',
  'terminals',
  'dhcp',
  'dns4',
  'routes',
  'lineStatus',
  'balance',
  'trafficLoad',
  'logs',
];
const DEFAULT_PRIVATE_SECTIONS = [
  ...DEFAULT_PUBLIC_SECTIONS,
  'collectionHealthDiagnostics',
  'dnsProxyDiagnostics',
];

function usage() {
  return `
Local smoke, responsive, and predeploy checks for the RouterOS triage panel.

Usage:
  node tools/local-predeploy-check.js [options]

Options:
  --url <url>                 Check an already running local server.
  --port <port>               Port for the safe local app server when --url is omitted.
  --python <exe>              Python executable. Default: python.
  --out <dir>                 Output directory. Default: _acceptance/local-predeploy-<timestamp>.
  --profile <public|private|both>
                              Browser fixture profile. Default: both.
  --viewports <list>          Comma list like desktop=1600x1000,narrow=390x844.
  --sections <list>           Comma list of sections to visit.
  --skip-browser              Run backend/static/API checks only.
  --skip-backend              Run browser checks only.
  --keep-server               Leave the spawned app server running.
  --strict-responsive         Treat narrow horizontal overflow as a failure.
  --help                      Show this help.

Safety:
  When this script starts the app itself, ROS_MONITOR_ROUTER_HOST is forced to
  127.0.0.1 and ROS_PANEL_PROFILE is routeros_only. It does not call network
  devices or deploy anything.
`.trim();
}

function parseArgs(argv) {
  const args = {
    python: process.env.PYTHON || 'python',
    out: '',
    url: '',
    port: 0,
    profile: 'both',
    viewports: DEFAULT_VIEWPORTS,
    sections: null,
    skipBrowser: false,
    skipBackend: false,
    keepServer: false,
    strictResponsive: false,
    help: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const item = argv[i];
    const readValue = (name) => {
      const eq = item.indexOf('=');
      if (eq >= 0) return item.slice(eq + 1);
      i += 1;
      if (i >= argv.length) throw new Error(`${name} requires a value`);
      return argv[i];
    };
    if (item === '--help' || item === '-h') args.help = true;
    else if (item === '--skip-browser') args.skipBrowser = true;
    else if (item === '--skip-backend') args.skipBackend = true;
    else if (item === '--keep-server') args.keepServer = true;
    else if (item === '--strict-responsive') args.strictResponsive = true;
    else if (item === '--url' || item.startsWith('--url=')) args.url = readValue('--url');
    else if (item === '--port' || item.startsWith('--port=')) args.port = Number(readValue('--port'));
    else if (item === '--python' || item.startsWith('--python=')) args.python = readValue('--python');
    else if (item === '--out' || item.startsWith('--out=')) args.out = readValue('--out');
    else if (item === '--profile' || item.startsWith('--profile=')) args.profile = readValue('--profile');
    else if (item === '--viewports' || item.startsWith('--viewports=')) args.viewports = parseViewports(readValue('--viewports'));
    else if (item === '--sections' || item.startsWith('--sections=')) args.sections = readValue('--sections').split(',').map((part) => part.trim()).filter(Boolean);
    else throw new Error(`Unknown argument: ${item}`);
  }
  if (!['public', 'private', 'both'].includes(args.profile)) {
    throw new Error('--profile must be public, private, or both');
  }
  if (!args.out) {
    args.out = path.join(ROOT, '_acceptance', `local-predeploy-${timestamp()}`);
  } else {
    args.out = path.resolve(args.out);
  }
  if (args.url) {
    assertLocalUrl(args.url);
    args.url = normalizeBaseUrl(args.url);
  }
  return args;
}

function parseViewports(value) {
  const viewports = value.split(',').map((raw) => {
    const part = raw.trim();
    const match = part.match(/^(?:(?<name>[A-Za-z0-9_-]+)=)?(?<width>\d+)x(?<height>\d+)$/);
    if (!match) throw new Error(`Invalid viewport: ${part}`);
    const width = Number(match.groups.width);
    const height = Number(match.groups.height);
    return { name: match.groups.name || `${width}x${height}`, width, height };
  });
  if (!viewports.length) throw new Error('At least one viewport is required');
  return viewports;
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    '-',
    pad(d.getHours()),
    pad(d.getMinutes()),
    pad(d.getSeconds()),
  ].join('');
}

function normalizeBaseUrl(raw) {
  const url = new URL(raw);
  url.hash = '';
  url.search = '';
  let text = url.toString();
  if (!text.endsWith('/')) text += '/';
  return text;
}

function assertLocalUrl(raw) {
  const parsed = new URL(raw);
  const host = parsed.hostname.toLowerCase();
  const local = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  if (!local) {
    throw new Error(`Refusing non-local URL (${raw}). This predeploy check is intentionally local-only.`);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function fetchText(url, options = {}) {
  const timeoutMs = options.timeoutMs || 8000;
  const method = options.method || 'GET';
  const body = options.body;
  const headers = options.headers || {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      body,
      headers,
      cache: 'no-store',
      signal: controller.signal,
    });
    const text = await response.text();
    return { response, text };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, options = {}) {
  const result = await fetchText(url, options);
  let json = null;
  try {
    json = JSON.parse(result.text);
  } catch (error) {
    throw new Error(`${url} returned invalid JSON: ${error.message}`);
  }
  return { ...result, json };
}

async function waitForJson(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const result = await fetchJson(url, { timeoutMs: 2000 });
      if (result.response.ok) return result;
      lastError = new Error(`HTTP ${result.response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

async function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd || ROOT,
      env: options.env || process.env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.on('error', (error) => resolve({ code: -1, stdout, stderr: String(error) }));
  });
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function startSafeAppServer(args, report) {
  const port = args.port || await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const env = {
    ...process.env,
    PYTHONUNBUFFERED: '1',
    ROS_PANEL_BIND: '127.0.0.1',
    ROS_PANEL_PORT: String(port),
    ROS_PANEL_TARGET_IP: '127.0.0.1',
    ROS_PANEL_PROFILE: 'routeros_only',
    ROS_MONITOR_ROUTER_HOST: '127.0.0.1',
    ROS_MONITOR_ROUTER_USER: 'smoke',
    ROS_MONITOR_ROUTER_PASSWORD: 'CHANGE_ME',
    ROS_MONITOR_POLL_SECONDS: '60',
    ROS_MONITOR_STATIC_POLL_SECONDS: '600',
    ROS_MONITOR_SLOW_REST_POLL_SECONDS: '600',
    ROS_MONITOR_CONNECTION_DETAIL_POLL_SECONDS: '60',
    ROS_MONITOR_CONNECTION_PROTOCOL_POLL_SECONDS: '600',
    ROS_PANEL_READONLY_DIAGNOSTIC_TOTAL_TIMEOUT: '1',
  };

  const child = spawn(args.python, ['app.py'], {
    cwd: ROOT,
    env,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  child.on('exit', (code) => {
    if (code !== null && code !== 0) {
      report.serverExit = { code, stderr: tail(stderr), stdout: tail(stdout) };
    }
  });

  try {
    await waitForJson(`${baseUrl}api/health`, 16000);
  } catch (error) {
    child.kill('SIGKILL');
    await writeJson(path.join(args.out, 'server-start-failure.json'), {
      error: error.message,
      stdout: tail(stdout),
      stderr: tail(stderr),
    });
    throw error;
  }

  return {
    baseUrl,
    child,
    stop: async () => {
      await writeTextIfAny(path.join(args.out, 'server.stdout.log'), stdout);
      await writeTextIfAny(path.join(args.out, 'server.stderr.log'), stderr);
      if (args.keepServer && child && !child.killed) {
        child.stdout.destroy();
        child.stderr.destroy();
        child.unref();
        console.log(`[INFO] keeping safe local server pid=${child.pid} url=${baseUrl}`);
      } else if (child && !child.killed) {
        child.kill('SIGKILL');
      }
    },
  };
}

async function writeTextIfAny(filePath, text) {
  if (!text) return;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, text, 'utf8');
}

function tail(text, max = 6000) {
  if (!text) return '';
  return text.length <= max ? text : text.slice(text.length - max);
}

function record(report, name, pass, detail = {}) {
  const check = { name, pass: Boolean(pass), detail };
  report.checks.push(check);
  if (!check.pass) report.failures.push(check);
  const mark = check.pass ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${name}`);
  return check;
}

function warn(report, name, detail = {}) {
  const item = { name, detail };
  report.warnings.push(item);
  console.log(`[WARN] ${name}`);
  return item;
}

async function runBackendChecks(args, report, baseUrl, startedByScript) {
  const compile = await runCommand(args.python, ['-m', 'py_compile', 'app.py']);
  record(report, 'python syntax: app.py', compile.code === 0, {
    code: compile.code,
    stderr: tail(compile.stderr, 2000),
  });

  const health = await fetchJson(`${baseUrl}api/health`, { timeoutMs: 5000 });
  record(report, 'GET /api/health returns JSON', health.response.ok && typeof health.json.status === 'string', {
    statusCode: health.response.status,
    payload: health.json,
  });
  if (startedByScript) {
    record(report, '/api/health uses safe local profile', health.json.profile === 'routeros_only' && health.json.target === '127.0.0.1', {
      profile: health.json.profile,
      target: health.json.target,
    });
  }

  const index = await fetchText(baseUrl, { timeoutMs: 5000 });
  record(report, 'GET / serves panel shell', index.response.ok && index.text.includes('id="app"') && index.text.includes('/layout-whitespace-patch.js'), {
    statusCode: index.response.status,
    bytes: index.text.length,
  });

  const assets = [
    'layout-whitespace-patch.js',
    'readonly-diagnostics.js',
    'panel-professional-redesign.js',
  ];
  for (const asset of assets) {
    const result = await fetchText(`${baseUrl}${asset}`, { timeoutMs: 5000 });
    record(report, `GET /${asset}`, result.response.ok && result.text.length > 1000, {
      statusCode: result.response.status,
      bytes: result.text.length,
    });
  }

  const snapshot = await fetchJson(`${baseUrl}api/snapshot`, { timeoutMs: 5000 });
  record(report, 'GET /api/snapshot returns safe state JSON', snapshot.response.ok && snapshot.json && snapshot.json.meta, {
    statusCode: snapshot.response.status,
    status: snapshot.json && snapshot.json.status,
    profile: snapshot.json && snapshot.json.meta && snapshot.json.meta.profile,
  });
  record(report, 'GET /api/snapshot includes semantic triage guardrails', Boolean(
    snapshot.response.ok &&
    snapshot.json &&
    snapshot.json.semanticTriage &&
    snapshot.json.semanticTriage.readOnly === true &&
    snapshot.json.semanticTriage.guardrails &&
    snapshot.json.semanticTriage.guardrails.routerosWrites === false &&
    snapshot.json.meta &&
    snapshot.json.meta.capabilities &&
    snapshot.json.meta.capabilities.publicRouterosProfile === true
  ), {
    statusCode: snapshot.response.status,
    readOnly: snapshot.json && snapshot.json.semanticTriage && snapshot.json.semanticTriage.readOnly,
    publicRouterosProfile: snapshot.json && snapshot.json.meta && snapshot.json.meta.capabilities && snapshot.json.meta.capabilities.publicRouterosProfile,
  });

  const triage = await fetchJson(`${baseUrl}api/semantic-triage`, { timeoutMs: 5000 });
  record(report, 'GET /api/semantic-triage returns read-only action queue', Boolean(
    triage.response.ok &&
    triage.json &&
    triage.json.readOnly === true &&
    Array.isArray(triage.json.queue) &&
    triage.json.guardrails &&
    triage.json.guardrails.routerosWrites === false
  ), {
    statusCode: triage.response.status,
    status: triage.json && triage.json.status,
    queueLength: triage.json && Array.isArray(triage.json.queue) ? triage.json.queue.length : null,
  });

  if (startedByScript) {
    const diag = await fetchJson(`${baseUrl}api/readonly-diagnostics`, { timeoutMs: 5000 });
    record(report, 'public profile disables external readonly diagnostics', diag.response.ok && diag.json.status === 'disabled', {
      statusCode: diag.response.status,
      status: diag.json.status,
      hidden: diag.json.hidden,
    });

    const alias = await fetchText(`${baseUrl}api/ip-alias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: '192.0.2.10', name: 'smoke' }),
      timeoutMs: 5000,
    });
    record(report, 'public profile rejects ip-alias writes', alias.response.status === 403, {
      statusCode: alias.response.status,
      body: alias.text.slice(0, 300),
    });
  } else {
    warn(report, 'skipped mutating/diagnostic endpoint checks on external local URL', {
      reason: 'Only the safe spawned server is allowed to call endpoints that may trigger diagnostics or writes.',
    });
  }
}

async function findBrowser() {
  const envCandidates = ['BROWSER', 'CHROME_PATH', 'EDGE_PATH']
    .map((key) => process.env[key])
    .filter(Boolean);
  const candidates = [
    ...envCandidates,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/microsoft-edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (path.isAbsolute(candidate) && await pathExists(candidate)) return candidate;
    if (!path.isAbsolute(candidate) && commandExists(candidate)) return candidate;
  }
  return '';
}

function commandExists(command) {
  const isWin = process.platform === 'win32';
  const probe = isWin ? 'where.exe' : 'command';
  const args = isWin ? [command] : ['-v', command];
  const result = spawnSync(probe, args, { stdio: 'ignore', shell: !isWin });
  return result.status === 0;
}

async function getWebSocketCtor() {
  if (typeof globalThis.WebSocket === 'function') return globalThis.WebSocket;
  try {
    return require('ws');
  } catch {
    throw new Error('No WebSocket implementation found. Use Node 22+ or install the optional ws package.');
  }
}

async function openSocket(wsUrl) {
  const WebSocketCtor = await getWebSocketCtor();
  return new Promise((resolve, reject) => {
    const socket = new WebSocketCtor(wsUrl);
    const failTimer = setTimeout(() => reject(new Error(`Timed out opening ${wsUrl}`)), 8000);
    const done = () => {
      clearTimeout(failTimer);
      resolve(socket);
    };
    const fail = (error) => {
      clearTimeout(failTimer);
      reject(error instanceof Error ? error : new Error(`Failed to open ${wsUrl}`));
    };
    if (typeof socket.addEventListener === 'function') {
      socket.addEventListener('open', done, { once: true });
      socket.addEventListener('error', fail, { once: true });
    } else {
      socket.once('open', done);
      socket.once('error', fail);
    }
  });
}

function attachMessageHandler(socket, handler) {
  const normalize = async (raw) => {
    if (raw && typeof raw !== 'string') {
      if (typeof raw.text === 'function') raw = await raw.text();
      else if (raw instanceof ArrayBuffer) raw = Buffer.from(raw).toString('utf8');
      else if (ArrayBuffer.isView(raw)) raw = Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength).toString('utf8');
      else raw = String(raw);
    }
    handler(String(raw));
  };
  if (typeof socket.addEventListener === 'function') {
    socket.addEventListener('message', (event) => normalize(event.data).catch(() => {}));
  } else {
    socket.on('message', (data) => normalize(data).catch(() => {}));
  }
}

class CdpSession {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 0;
    this.pending = new Map();
    this.handlers = new Map();
    attachMessageHandler(socket, (raw) => this.onMessage(raw));
  }

  onMessage(raw) {
    const message = JSON.parse(raw);
    if (message.id && this.pending.has(message.id)) {
      const task = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) task.reject(new Error(`${task.method}: ${JSON.stringify(message.error)}`));
      else task.resolve(message.result || {});
      return;
    }
    if (message.method && this.handlers.has(message.method)) {
      for (const handler of this.handlers.get(message.method)) handler(message.params || {});
    }
  }

  on(method, handler) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(handler);
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try {
      this.socket.close();
    } catch {}
  }
}

async function launchBrowser(args, report) {
  const browserPath = await findBrowser();
  if (!browserPath) {
    throw new Error('Edge/Chrome executable not found. Set BROWSER or CHROME_PATH.');
  }
  const port = await getFreePort();
  const userDataDir = path.join(os.tmpdir(), `ros-panel-predeploy-${process.pid}-${Date.now()}`);
  const child = spawn(browserPath, [
    '--headless=new',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-extensions',
    '--no-first-run',
    '--no-default-browser-check',
    '--metrics-recording-only',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });

  try {
    await waitForJson(`http://127.0.0.1:${port}/json/version`, 15000);
  } catch (error) {
    child.kill('SIGKILL');
    throw error;
  }

  async function connect() {
    let pageTarget = null;
    try {
      const created = await fetchJson(`http://127.0.0.1:${port}/json/new?about:blank`, {
        method: 'PUT',
        timeoutMs: 3000,
      });
      if (created.response.ok && created.json && created.json.webSocketDebuggerUrl) {
        pageTarget = created.json;
      }
    } catch {}
    for (let i = 0; i < 50; i += 1) {
      if (pageTarget) break;
      const { json } = await fetchJson(`http://127.0.0.1:${port}/json/list`, { timeoutMs: 3000 });
      pageTarget = json.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (pageTarget) break;
      await delay(200);
    }
    if (!pageTarget) throw new Error('Page websocket URL missing');
    const socket = await openSocket(pageTarget.webSocketDebuggerUrl);
    const session = new CdpSession(socket);
    session.targetId = pageTarget.id;
    session.closeTarget = async () => {
      if (!pageTarget.id) return;
      await fetchText(`http://127.0.0.1:${port}/json/close/${encodeURIComponent(pageTarget.id)}`, {
        timeoutMs: 2000,
      }).catch(() => {});
    };
    return session;
  }

  return {
    browserPath,
    connect,
    stop: async () => {
      if (child && !child.killed) child.kill('SIGKILL');
      await delay(300);
      await fs.rm(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
    },
  };
}

async function waitForApp(cdp, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    const result = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const app = document.querySelector('#app');
        const section = document.querySelector('#app .section');
        return {
          readyState: document.readyState,
          app: Boolean(app),
          section: section ? section.id : '',
          textLength: section ? section.innerText.trim().length : 0
        };
      })()`,
      returnByValue: true,
    });
    last = result.result && result.result.value;
    if (last && last.app && last.section && last.textLength > 20) return last;
    await delay(250);
  }
  throw new Error(`Timed out waiting for app render: ${JSON.stringify(last)}`);
}

async function collectBootDiagnostics(cdp) {
  try {
    const result = await cdp.send('Runtime.evaluate', {
      expression: `(() => ({
        url: location.href,
        readyState: document.readyState,
        title: document.title,
        bodyText: String(document.body?.innerText || '').slice(0, 1000),
        appHtml: String(document.querySelector('#app')?.innerHTML || '').slice(0, 1000),
        scripts: Array.from(document.scripts).map((node) => node.src || '[inline]').slice(-12),
        bodyDataset: { ...document.body.dataset },
        testSnapshot: Boolean(window.__PANEL_TEST_SNAPSHOT__),
        scriptCount: Array.from(document.querySelectorAll('body script')).length
      }))()`,
      returnByValue: true,
    });
    return result.result && result.result.value;
  } catch (error) {
    return { error: error.message };
  }
}

async function navigateWithFixture(cdp, baseUrl, profile, viewport, report) {
  const snapshot = buildSnapshot(profile);
  const fixtureSource = `window.__PANEL_TEST_SNAPSHOT__ = ${JSON.stringify(snapshot)};`;
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Log.enable').catch(() => {});
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width < 768,
  });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: fixtureSource });
  await cdp.send('Page.navigate', {
    url: `${baseUrl}?section=overview&predeploy=${Date.now()}#overview`,
  });
  await waitForApp(cdp);
  record(report, `browser boot ${profile}/${viewport.name}`, true, {
    viewport,
    profile,
  });
}

async function setSection(cdp, section) {
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const section = ${JSON.stringify(section)};
      const link = document.querySelector('[data-section="' + CSS.escape(section) + '"]');
      if (link) link.click();
      else location.hash = '#' + section;
      return true;
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  await delay(450);
}

async function inspectSection(cdp, profile, viewport, section, args) {
  const expression = `(() => {
    const sectionName = ${JSON.stringify(section)};
    const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const rectOf = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        selector,
        position: style.position,
        display: style.display,
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };
    const app = document.querySelector('#app');
    const active = document.querySelector('#app .section');
    const requested = document.querySelector('#' + CSS.escape(sectionName));
    const root = document.documentElement;
    const body = document.body;
    const overflowX = Math.max(root.scrollWidth, body.scrollWidth) - window.innerWidth;
    const text = normalize((requested || active || app || body).innerText);
    const hasBadLiteral = /\\bNaN\\b|\\bundefined\\b|\\[object Object\\]/.test(text);
    const rail = rectOf('.ik-rail');
    const sidebar = rectOf('.sidebar');
    const frame = rectOf('.frame');
    const topbar = rectOf('.topbar');
    const visibleControls = Array.from(document.querySelectorAll('button, a, input, select'))
      .map((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return { width: rect.width, height: rect.height, display: style.display, visibility: style.visibility };
      })
      .filter((row) => row.display !== 'none' && row.visibility !== 'hidden' && row.width > 0 && row.height > 0);
    const smallTargets = visibleControls.filter((row) => row.width < 28 || row.height < 24).length;
    const sidebarVisible = Boolean(sidebar && sidebar.display !== 'none' && sidebar.width > 0 && sidebar.height > 0);
    const shellOverlap = Boolean(
      window.innerWidth >= 1024 &&
      rail && sidebar && frame &&
      (
        (sidebarVisible && rail.right > sidebar.left + 4) ||
        (sidebarVisible ? sidebar.right : rail.right) > frame.left + 6
      )
    );
    const desktopOverflow = window.innerWidth >= 1024 && overflowX > 24;
    const strictNarrowOverflow = ${args.strictResponsive ? 'true' : 'false'} && window.innerWidth < 768 && overflowX > 24;
    const pass = Boolean(
      app &&
      active &&
      (requested || active.id === sectionName) &&
      text.length > 20 &&
      !hasBadLiteral &&
      !shellOverlap &&
      !desktopOverflow &&
      !strictNarrowOverflow
    );
    return {
      pass,
      profile: ${JSON.stringify(profile)},
      viewport: ${JSON.stringify(viewport)},
      requestedSection: sectionName,
      activeSection: active ? active.id : '',
      requestedFound: Boolean(requested),
      title: normalize(document.querySelector('#pageTitle')?.textContent),
      url: location.href,
      textLength: text.length,
      overflowX: Math.round(overflowX),
      scroll: {
        width: root.scrollWidth,
        height: root.scrollHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      },
      bodyDataset: { ...document.body.dataset },
      rail,
      sidebar,
      frame,
      topbar,
      smallTargets,
      sidebarVisible,
      hasBadLiteral,
      shellOverlap,
      desktopOverflow,
      strictNarrowOverflow,
    };
  })()`;
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    return {
      pass: false,
      profile,
      viewport,
      requestedSection: section,
      exception: result.exceptionDetails,
    };
  }
  return result.result && result.result.value;
}

async function captureScreenshot(cdp, filePath) {
  const shot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.from(shot.data, 'base64'));
}

async function runBrowserChecks(args, report, baseUrl) {
  const profiles = args.profile === 'both' ? ['public', 'private'] : [args.profile];
  const browser = await launchBrowser(args, report);
  report.browser = { path: browser.browserPath };
  try {
    for (const profile of profiles) {
      const sections = args.sections || (profile === 'private' ? DEFAULT_PRIVATE_SECTIONS : DEFAULT_PUBLIC_SECTIONS);
      for (const viewport of args.viewports) {
        const cdp = await browser.connect();
        const runtimeErrors = [];
        const consoleErrors = [];
        cdp.on('Runtime.exceptionThrown', (params) => {
          runtimeErrors.push(params.exceptionDetails || params);
        });
        cdp.on('Runtime.consoleAPICalled', (params) => {
          if (params.type === 'error') consoleErrors.push(params);
        });
        cdp.on('Log.entryAdded', (params) => {
          if (params.entry && params.entry.level === 'error') consoleErrors.push(params.entry);
        });
        try {
          try {
            await navigateWithFixture(cdp, baseUrl, profile, viewport, report);
          } catch (error) {
            const bootDiag = await collectBootDiagnostics(cdp);
            const detail = {
              profile,
              viewport,
              error: error.stack || error.message || String(error),
              runtimeErrorCount: runtimeErrors.length,
              consoleErrorCount: consoleErrors.length,
              runtimeErrors: runtimeErrors.slice(0, 3),
              consoleErrors: consoleErrors.slice(0, 3),
              bootDiag,
            };
            record(report, `browser boot ${profile}/${viewport.name}`, false, detail);
            await captureScreenshot(cdp, path.join(args.out, `${profile}-${viewport.name}-boot-failure.png`)).catch(() => {});
            continue;
          }
          for (const section of sections) {
            await setSection(cdp, section);
            const inspection = await inspectSection(cdp, profile, viewport, section, args);
            inspection.runtimeErrorCount = runtimeErrors.length;
            inspection.consoleErrorCount = consoleErrors.length;
            const hardPass = inspection.pass && runtimeErrors.length === 0 && consoleErrors.length === 0;
            report.browserChecks.push(inspection);
            record(report, `responsive ${profile}/${viewport.name}/${section}`, hardPass, inspection);
            if (inspection.overflowX > 24 && viewport.width < 768 && !args.strictResponsive) {
              warn(report, `narrow overflow observed ${profile}/${viewport.name}/${section}`, {
                overflowX: inspection.overflowX,
                note: 'Current shell keeps desktop layout on narrow viewports; use --strict-responsive to fail this.',
              });
            }
            if (section === 'overview' || !hardPass) {
              const fileName = `${profile}-${viewport.name}-${section}.png`.replace(/[^A-Za-z0-9_.-]+/g, '-');
              await captureScreenshot(cdp, path.join(args.out, fileName)).catch((error) => {
                warn(report, `screenshot failed ${profile}/${viewport.name}/${section}`, { error: error.message });
              });
            }
          }
        } finally {
          cdp.close();
          if (typeof cdp.closeTarget === 'function') await cdp.closeTarget();
        }
      }
    }
  } finally {
    await browser.stop();
  }
}

function buildSnapshot(profile) {
  const publicProfile = profile === 'public';
  const now = '2026-05-24 12:00:00';
  const capabilities = {
    readonlyDiagnostics: !publicProfile,
    privateDiagnostics: !publicProfile,
    openwrtDiagnostics: !publicProfile,
    nikkiDiagnostics: !publicProfile,
    publicRouterosProfile: publicProfile,
    ipAliasWrite: !publicProfile,
    adminSessions: !publicProfile,
    wanFallback: false,
    singleWan: false,
    multiWan: true,
  };
  const interfaces = [
    {
      name: 'pppoe-wan1',
      type: 'pppoe-out',
      running: true,
      disabled: false,
      mac: '02:00:00:00:01:01',
      ips: ['198.51.100.10/32'],
      rxRate: 185000000,
      txRate: 42000000,
      rxBytes: 922337203,
      txBytes: 512337203,
      rxPacket: 1200000,
      txPacket: 980000,
      rxDrop: 0,
      txDrop: 0,
      rxError: 0,
      txError: 0,
    },
    {
      name: 'pppoe-wan2',
      type: 'pppoe-out',
      running: true,
      disabled: false,
      mac: '02:00:00:00:01:02',
      ips: ['203.0.113.20/32'],
      rxRate: 138000000,
      txRate: 37000000,
      rxBytes: 812337203,
      txBytes: 412337203,
      rxPacket: 900000,
      txPacket: 720000,
      rxDrop: 1,
      txDrop: 0,
      rxError: 0,
      txError: 0,
    },
    {
      name: 'bridge-lan',
      type: 'bridge',
      running: true,
      disabled: false,
      mac: '02:00:00:00:10:01',
      ips: ['192.168.3.1/24', 'fd00:3::1/64'],
      rxRate: 204000000,
      txRate: 79000000,
      rxBytes: 1912337203,
      txBytes: 912337203,
      rxPacket: 2400000,
      txPacket: 1720000,
      rxDrop: 0,
      txDrop: 0,
      rxError: 0,
      txError: 0,
    },
  ];
  const wan = [
    {
      name: 'WAN-1',
      interface: 'pppoe-wan1',
      type: 'pppoe',
      running: true,
      disabled: false,
      status: 'online',
      role: 'primary',
      address: '198.51.100.10',
      addresses: ['198.51.100.10/32'],
      upRate: 42000000,
      downRate: 185000000,
      txBytes: 512337203,
      rxBytes: 922337203,
      parent: 'pppoe-wan1',
      access: 'WAN-1',
      history: {
        up: [16000000, 21000000, 30000000, 42000000],
        down: [92000000, 120000000, 150000000, 185000000],
      },
      routes: [{ dst: '0.0.0.0/0', gateway: 'pppoe-wan1', distance: 1, active: true }],
    },
    {
      name: 'WAN-2',
      interface: 'pppoe-wan2',
      type: 'pppoe',
      running: true,
      disabled: false,
      status: 'online',
      role: 'backup',
      address: '203.0.113.20',
      addresses: ['203.0.113.20/32'],
      upRate: 37000000,
      downRate: 138000000,
      txBytes: 412337203,
      rxBytes: 812337203,
      parent: 'pppoe-wan2',
      access: 'WAN-2',
      history: {
        up: [15000000, 20000000, 26000000, 37000000],
        down: [88000000, 100000000, 120000000, 138000000],
      },
      routes: [{ dst: '0.0.0.0/0', gateway: 'pppoe-wan2', distance: 2, active: true }],
    },
  ];
  const terminals = [
    {
      ip: '192.168.3.21',
      mac: 'AA:BB:CC:00:00:21',
      hostname: 'workstation',
      displayName: 'workstation',
      source: 'dhcp',
      connectionCount: 58,
      upRate: 6100000,
      downRate: 48000000,
      lastSeen: '1m',
    },
    {
      ip: '192.168.3.31',
      mac: 'AA:BB:CC:00:00:31',
      hostname: 'nas',
      displayName: 'nas',
      source: 'arp',
      connectionCount: 22,
      upRate: 21000000,
      downRate: 12000000,
      lastSeen: '30s',
    },
    {
      ip: 'fd00:3::31',
      mac: 'AA:BB:CC:00:00:31',
      hostname: 'nas-ipv6',
      displayName: 'nas-ipv6',
      source: 'ipv6',
      connectionCount: 8,
      upRate: 1000000,
      downRate: 9000000,
      lastSeen: '2m',
    },
  ];
  const snapshot = {
    status: 'ok',
    updatedAt: now,
    error: null,
    meta: {
      target: '127.0.0.1',
      routerHost: '127.0.0.1',
      pollSeconds: 1,
      realtimeUpdatedAt: now,
      realtimeError: null,
      slowRestUpdatedAt: now,
      slowRestError: null,
      staticUpdatedAt: now,
      staticError: null,
      connectionDetailUpdatedAt: now,
      connectionProtocolUpdatedAt: now,
      connectionDetailError: null,
      connectionProtocolError: null,
      profile: publicProfile ? 'routeros_only' : 'private_ops',
      capabilities,
      pppoeCount: 2,
      wanCount: 2,
      lineCount: 2,
      lineLayoutTier: 'few',
      ipv6AddressCount: 2,
      ipv6NeighborCount: 1,
      ipv6InterfaceCount: 1,
      ipv6TerminalCount: 1,
    },
    overview: {
      identity: 'smoke-router',
      version: '7.15-smoke',
      uptime: '6d12h',
      cpuLoad: 18,
      cpuCount: 4,
      cpuFrequency: 1400,
      memoryUsedPercent: 42,
      diskUsedPercent: 21,
      activeUsers: 1,
      interfaceCount: interfaces.length,
      terminalCount: terminals.length,
      wanUpRate: 79000000,
      wanDownRate: 323000000,
      uplinkBps: 79000000,
      downlinkBps: 323000000,
      memoryUsage: 42,
      diskUsage: 21,
      systemLoadLevel: 'ok',
      onlineTerminals: terminals.length,
      connectionTotal: 420,
      ntpStatus: 'synchronized',
      history: {
        cpu: [12, 16, 18, 17, 15, 18],
        memory: [38, 39, 40, 41, 42, 42],
        disk: [20, 20, 21, 21, 21, 21],
        uplink: [32000000, 48000000, 51000000, 62000000, 70000000, 79000000],
        downlink: [180000000, 210000000, 225000000, 280000000, 300000000, 323000000],
        timestamps: [1, 2, 3, 4, 5, 6],
      },
    },
    interfaces,
    pppoe: wan.map((row) => ({
      name: row.interface,
      running: row.running,
      disabled: row.disabled,
      interface: row.interface,
      addresses: row.addresses,
      routes: row.routes,
      upRate: row.upRate,
      downRate: row.downRate,
    })),
    wan,
    terminals,
    arp: {
      items: terminals.slice(0, 2).map((row) => ({
        address: row.ip,
        mac: row.mac,
        hostname: row.hostname,
        displayName: row.displayName,
        status: 'reachable',
        dynamic: true,
      })),
      alerts: [],
    },
    dhcp: {
      servers: [{ name: 'dhcp-lan', interface: 'bridge-lan', pool: 'lan-pool', disabled: false, leaseTime: '1d' }],
      pools: [{ name: 'lan-pool', ranges: '192.168.3.100-192.168.3.199', used: 34, total: 100 }],
      leases: terminals.slice(0, 2).map((row) => ({
        address: row.ip,
        mac: row.mac,
        hostname: row.hostname,
        displayName: row.displayName,
        server: 'dhcp-lan',
        status: 'bound',
        dynamic: true,
      })),
    },
    connections: {
      total: 420,
      tcp: 320,
      udp: 92,
      icmp: 8,
      topIps: terminals.map((row) => ({
        ip: row.ip,
        displayName: row.displayName,
        count: row.connectionCount,
        upRate: row.upRate,
        downRate: row.downRate,
      })),
      active: [
        { src: '192.168.3.21', dst: '93.184.216.34', protocol: 'tcp', dstPort: 443, timeout: '58s' },
        { src: '192.168.3.31', dst: '198.51.100.53', protocol: 'udp', dstPort: 53, timeout: '12s' },
      ],
      thresholdLevel: 'ok',
    },
    dns: {
      running: true,
      allowRemoteRequests: true,
      servers: ['192.168.3.1', '1.1.1.1'],
      cacheSize: 33554432,
      cacheUsed: 7340032,
      dohServer: '',
      useDohServer: false,
      verifyDohCert: false,
      forwardRuleCount: 4,
      disabledForwardRuleCount: 0,
      forwardRuleSample: false,
      forwardRuleRows: [
        { name: 'lan.local', type: 'A', value: '192.168.3.10', ttl: '1h', disabled: false },
        { name: 'nas.local', type: 'A', value: '192.168.3.31', ttl: '1h', disabled: false },
      ],
    },
    security: {
      filters: [
        { chain: 'input', action: 'accept', comment: 'allow established', packets: 12000, bytes: 9000000, disabled: false },
        { chain: 'input', action: 'drop', comment: 'drop invalid', packets: 4, bytes: 240, disabled: false },
      ],
      addressLists: [{ list: 'lan', address: '192.168.3.0/24', timeout: '', comment: 'LAN' }],
      mangle: [{ chain: 'prerouting', action: 'mark-routing', comment: 'wan balance', packets: 3300, bytes: 880000 }],
      routingRules: [{ action: 'lookup-only-in-table', table: 'wan1', src: '192.168.3.0/24', disabled: false }],
    },
    loadBalance: {
      distribution: [
        { name: 'WAN-1', share: 56, active: true, upRate: 42000000, downRate: 185000000 },
        { name: 'WAN-2', share: 44, active: true, upRate: 37000000, downRate: 138000000 },
      ],
      rules: [
        { chain: 'prerouting', classifier: 'both-addresses-and-ports:2/0', mark: 'wan1', packets: 1800, bytes: 4200000 },
        { chain: 'prerouting', classifier: 'both-addresses-and-ports:2/1', mark: 'wan2', packets: 1500, bytes: 3900000 },
      ],
    },
    routes: {
      defaultRoutes: [
        { dst: '0.0.0.0/0', gateway: 'pppoe-wan1', distance: 1, active: true, static: true, disabled: false },
        { dst: '0.0.0.0/0', gateway: 'pppoe-wan2', distance: 2, active: true, static: true, disabled: false },
      ],
      staticRoutes: [
        { dst: '192.0.2.0/24', gateway: 'bridge-lan', distance: 1, active: true, static: true, disabled: false },
      ],
      staticCount: 3,
      activeStaticCount: 3,
      defaultCount: 2,
      tableCount: 1,
      tables: [{ name: 'main', activeRoutes: 3, staticCount: 3 }],
    },
    logs: {
      system: [{ time: '12:00:01', topics: 'system,info', message: 'smoke fixture ready' }],
      firewall: [{ time: '12:01:01', topics: 'firewall,info', message: 'accepted established session' }],
      dhcp: [{ time: '12:02:01', topics: 'dhcp,info', message: 'lease bound' }],
      dns: [{ time: '12:03:01', topics: 'dns,info', message: 'cache hit' }],
    },
    semanticTriage: {
      status: 'warning',
      readOnly: true,
      generatedAt: now,
      sourceUpdatedAt: now,
      sourceStatus: 'ok',
      limit: 24,
      counts: { critical: 0, warning: 1, info: 1 },
      topPriority: {
        id: 'interfaces.error_counters',
        severity: 'warning',
        domain: 'interfaces',
        title: 'Interface error or drop counters are non-zero',
        summary: 'WAN-2 has one observed receive drop in the fixture.',
        nextStep: 'Inspect interface counters before changing RouterOS settings.',
        source: 'snapshot.interfaces',
        readOnly: true,
        actionType: 'manual_review',
        priority: 1,
        evidence: [{ label: 'topInterface', value: 'pppoe-wan2' }],
      },
      queue: [
        {
          id: 'interfaces.error_counters',
          severity: 'warning',
          domain: 'interfaces',
          title: 'Interface error or drop counters are non-zero',
          summary: 'WAN-2 has one observed receive drop in the fixture.',
          nextStep: 'Inspect interface counters before changing RouterOS settings.',
          source: 'snapshot.interfaces',
          readOnly: true,
          actionType: 'manual_review',
          priority: 1,
          evidence: [{ label: 'topInterface', value: 'pppoe-wan2' }],
        },
        {
          id: 'wan.traffic_skew',
          severity: 'info',
          domain: 'wan',
          title: 'WAN traffic distribution is skewed',
          summary: 'WAN-1 is carrying more traffic in the fixture.',
          nextStep: 'Observe whether the skew persists under representative traffic.',
          source: 'snapshot.loadBalance.distribution',
          readOnly: true,
          actionType: 'manual_review',
          priority: 2,
          evidence: [{ label: 'line', value: 'WAN-1' }],
        },
      ],
      guardrails: {
        routerosWrites: false,
        usesCachedSnapshot: true,
        mutatingEndpoints: false,
      },
    },
  };
  snapshot.actionQueue = snapshot.semanticTriage.queue;
  snapshot.semanticTriage.actionQueue = snapshot.semanticTriage.queue;
  return snapshot;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(usage());
    return;
  }
  await fs.mkdir(args.out, { recursive: true });
  const report = {
    startedAt: new Date().toISOString(),
    root: ROOT,
    outDir: args.out,
    checks: [],
    warnings: [],
    failures: [],
    browserChecks: [],
    serverExit: null,
    browser: null,
  };

  let server = null;
  const startedByScript = !args.url;
  const baseUrl = args.url || '';
  try {
    let effectiveUrl = baseUrl;
    if (!args.url && !args.skipBackend) {
      server = await startSafeAppServer(args, report);
      effectiveUrl = server.baseUrl;
      console.log(`[INFO] safe local server: ${effectiveUrl}`);
    } else if (!args.url && args.skipBackend) {
      server = await startSafeAppServer(args, report);
      effectiveUrl = server.baseUrl;
      console.log(`[INFO] safe local server for browser checks: ${effectiveUrl}`);
    }

    if (!effectiveUrl) throw new Error('No local URL available');

    if (!args.skipBackend) {
      await runBackendChecks(args, report, effectiveUrl, startedByScript);
    }
    if (!args.skipBrowser) {
      await runBrowserChecks(args, report, effectiveUrl);
    }
  } catch (error) {
    record(report, 'local predeploy runner completed without fatal error', false, {
      error: error.stack || error.message || String(error),
    });
  } finally {
    if (server) await server.stop();
    report.finishedAt = new Date().toISOString();
    report.pass = report.failures.length === 0;
    await writeJson(path.join(args.out, 'report.json'), report);
  }

  console.log(`[INFO] report: ${path.join(args.out, 'report.json')}`);
  console.log(`[INFO] result: ${report.failures.length ? `${report.failures.length} failure(s)` : 'pass'}`);
  if (report.failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
