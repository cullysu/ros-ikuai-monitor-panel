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
  // React 路由表（src/panel-framework/routes/panelRoutes.ts PANEL_ROUTE_IDS）里的
  // 只读诊断/服务日志页，替代 vanilla 的 collectionHealthDiagnostics/dnsProxyDiagnostics。
  'readonlyDiagnostics',
  'serviceLogs',
];
const DEFAULT_SCALE_SCENARIOS = ['multi'];
const SCALE_SCENARIOS = new Set(['single', 'multi', 'fleet']);

// 默认 index 已是 React 壳：script 只剩 /assets/framework/panel-surface-loader.<hash>.js，
// 桌面/移动 bundle 与样式由 loader 按 manifest 运行时注入。这里从 manifest.json 动态解析
// 内容寻址文件名，避免硬编码 hash。
function frameworkAssets() {
  const assets = { loaderSrc: null, files: [] };
  try {
    const manifest = JSON.parse(fsSync.readFileSync(
      path.join(ROOT, 'public', 'assets', 'framework', 'manifest.json'),
      'utf8',
    ));
    const recorded = manifest && manifest.assets && typeof manifest.assets === 'object' ? manifest.assets : null;
    const loaderFile = recorded && recorded.loader && typeof recorded.loader.file === 'string'
      ? recorded.loader.file
      : null;
    if (loaderFile && /^panel-surface-loader\.[0-9a-f]{12}\.js$/.test(loaderFile)) {
      assets.loaderSrc = `/assets/framework/${loaderFile}`;
    }
    for (const surface of ['desktop', 'mobile']) {
      const entry = recorded && recorded[surface];
      if (!entry) continue;
      if (entry.script && typeof entry.script.file === 'string') assets.files.push(`assets/framework/${entry.script.file}`);
      if (entry.style && typeof entry.style.file === 'string') assets.files.push(`assets/framework/${entry.style.file}`);
    }
  } catch (error) {
    // manifest 缺失时保持 loaderSrc=null，让 index 断言失败并给出明确原因。
  }
  return assets;
}

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
  --scale-scenarios <list>    Comma list: single,multi,fleet. Default: multi.
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
    scaleScenarios: DEFAULT_SCALE_SCENARIOS,
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
    else if (item === '--scale-scenarios' || item.startsWith('--scale-scenarios=')) args.scaleScenarios = readValue('--scale-scenarios').split(',').map((part) => part.trim()).filter(Boolean);
    else throw new Error(`Unknown argument: ${item}`);
  }
  if (!['public', 'private', 'both'].includes(args.profile)) {
    throw new Error('--profile must be public, private, or both');
  }
  if (!args.scaleScenarios.length || args.scaleScenarios.some((item) => !SCALE_SCENARIOS.has(item))) {
    throw new Error('--scale-scenarios must use one or more of: single,multi,fleet');
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

function summarizeDetail(detail, max = 3000) {
  if (!detail || typeof detail !== 'object') return '';
  try {
    const text = JSON.stringify(detail, null, 2);
    return text.length <= max ? text : `${text.slice(0, max)}\n... truncated ...`;
  } catch {
    return String(detail);
  }
}

function record(report, name, pass, detail = {}) {
  const check = { name, pass: Boolean(pass), detail };
  report.checks.push(check);
  if (!check.pass) report.failures.push(check);
  const mark = check.pass ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${name}`);
  if (!check.pass) {
    const summary = summarizeDetail(detail);
    if (summary) console.log(`[DETAIL] ${name}: ${summary}`);
  }
  return check;
}

function warn(report, name, detail = {}) {
  const item = { name, detail };
  report.warnings.push(item);
  console.log(`[WARN] ${name}`);
  const summary = summarizeDetail(detail, 1200);
  if (summary) console.log(`[DETAIL] ${name}: ${summary}`);
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
  // 默认 index 是 React 壳：挂载点 #app + manifest 记录的 surface loader。
  const framework = frameworkAssets();
  record(report, 'GET / serves panel shell', index.response.ok
    && index.text.includes('id="app"')
    && Boolean(framework.loaderSrc)
    && index.text.includes(framework.loaderSrc), {
    statusCode: index.response.status,
    bytes: index.text.length,
    loaderSrc: framework.loaderSrc,
  });

  const scriptSrcs = (index.text.match(/<script\b[^>]*>/gi) || [])
    .map((tag) => (tag.match(/\bsrc=["']([^"']+)["']/i) || [])[1])
    .filter(Boolean);
  const linkHrefs = (index.text.match(/<link\b[^>]*>/gi) || [])
    .map((tag) => (tag.match(/\bhref=["']([^"']+)["']/i) || [])[1])
    .filter(Boolean);
  // 恰好 1 个 script（surface loader），且不再引用任何 vanilla 层。
  // foldedLayers：已折叠的 vanilla 补丁 + panel-head.js / panel.css（旧前端仅存于 index.legacy.html）。
  const foldedLayers = ['panel.js', 'layout-whitespace-patch.js', 'readonly-diagnostics.js', 'panel-professional-redesign', 'assets/panel-head.js', 'assets/panel.css'];
  const stylesheetHrefs = linkHrefs.filter((href) => href.includes('panel.css') || href.includes('framework'));
  record(report, 'GET / loads exactly the framework surface loader (vanilla layers retired)', index.response.ok
    && scriptSrcs.length === 1
    && scriptSrcs[0].includes('panel-surface-loader')
    && stylesheetHrefs.length === 0
    && foldedLayers.every((legacy) => !scriptSrcs.some((src) => src.includes(legacy)))
    && foldedLayers.every((legacy) => !linkHrefs.some((href) => href.includes(legacy))), {
    statusCode: index.response.status,
    scriptSrcs,
    linkHrefs,
  });

  // 资产 GET 清单改为 framework 产物（manifest 记录的桌面/移动 script + style）。
  // loader 本体由 index 断言覆盖，这里验证 manifest 列出的运行时注入资产确实可被 GET。
  const assets = framework.files;
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
  const winCandidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  const macCandidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ];
  const linuxCandidates = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
  ];
  const platformCandidates = process.platform === 'win32'
    ? winCandidates
    : process.platform === 'darwin'
      ? macCandidates
      : linuxCandidates;
  const candidates = [...envCandidates, ...platformCandidates];
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
  const browserArgs = [
    '--headless=new',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-dev-shm-usage',
    '--disable-sync',
    '--disable-extensions',
    '--no-first-run',
    '--no-default-browser-check',
    '--metrics-recording-only',
    '--remote-debugging-address=127.0.0.1',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ];
  if (process.platform !== 'win32') {
    browserArgs.splice(1, 0, '--no-sandbox');
  }
  const child = spawn(browserPath, browserArgs, {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  let exit = null;
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  child.on('exit', (code, signal) => { exit = { code, signal }; });
  report.browser = { path: browserPath, port, userDataDir };

  try {
    await waitForJson(`http://127.0.0.1:${port}/json/version`, 15000);
  } catch (error) {
    child.kill('SIGKILL');
    report.browser = {
      ...report.browser,
      launchError: error.message,
      exit,
      stdout: tail(stdout, 2000),
      stderr: tail(stderr, 4000),
    };
    throw new Error(`Browser CDP endpoint did not become ready: ${error.message}`);
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

// React 壳的挂载点是 #app（vanilla 的 #app .section 已退役）。注入 fixture 后
// DesktopPanelApp/MobilePanelApp 直接以 __PANEL_TEST_SNAPSHOT__ 渲染，稳定后
// #app 应有子节点且文本量充足（>500）。
async function waitForApp(cdp, timeoutMs = 15000, minTextOverride = null) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    try {
      const result = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
        const app = document.querySelector('#app');
        return {
          readyState: document.readyState,
          app: Boolean(app),
          appChildren: app ? app.children.length : 0,
          surface: document.documentElement.dataset.panelSurface || '',
          route: document.body.dataset.panelRoute || '',
          textLength: app ? app.innerText.trim().length : 0
        };
      })()`,
        returnByValue: true,
      });
      last = result.result && result.result.value;
      // 桌面概览注入 fixture 后文本量充足（>500）；移动端 Hub 页与工作区子页更紧凑，
      // 调用方可显式放宽阈值（setSection 传 200）。
      const minText = minTextOverride || (last && last.surface === 'mobile' ? 200 : 500);
      if (last && last.app && last.appChildren > 0 && last.textLength > minText) return last;
    } catch (error) {
      // location.search 导航会重载文档，过渡期 Runtime.evaluate 可能暂时失败，继续轮询。
      last = { error: error.message };
    }
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

async function navigateWithFixture(cdp, baseUrl, profile, viewport, report, scaleScenario) {
  const snapshot = buildSnapshot(profile, scaleScenario);
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
  // surface loader 按 ?surface= / sessionStorage / 指针启发式选面。同一浏览器 target 会在
  // 视口之间复用 sessionStorage，因此按视口显式钉住 surface，保证移动/桌面断言确定性。
  const surface = viewport.width < 768 ? 'mobile' : 'desktop';
  await cdp.send('Page.navigate', {
    url: `${baseUrl}?section=overview&surface=${surface}&predeploy=${Date.now()}`,
  });
  await waitForApp(cdp);
  // 页面加载断言：#app 实质内容（waitForApp 已保证 >500 字符）+ 品牌文案
  // （桌面概览 SummaryTile "RouterOS"；移动端品牌条 "NTR RouterOS"）。
  const brand = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const text = String(document.body?.innerText || '');
      return {
        brandVisible: text.includes('RouterOS') || text.includes('总览') || text.includes('系统首页'),
        textLength: text.trim().length,
      };
    })()`,
    returnByValue: true,
  });
  const brandValue = brand.result && brand.result.value;
  record(report, `browser boot ${profile}/${scaleScenario}/${viewport.name}`, Boolean(brandValue && brandValue.brandVisible), {
    viewport,
    profile,
    scaleScenario,
    surface,
    brand: brandValue,
  });
}

// React 无 vanilla 的 [data-section] 侧栏 DOM（面板由 React 渲染），section 导航统一走
// ?section=<routeId> 地址栏导航：React usePanelRoute 挂载时读 location.search，
// addScriptToEvaluateOnNewDocument 会在新文档重新注入 fixture。导航后等待 #app 重新渲染。
async function setSection(cdp, section, surface = 'desktop') {
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      location.search = '?section=' + encodeURIComponent(${JSON.stringify(section)}) + '&surface=' + ${JSON.stringify(surface)};
      return true;
    })()`,
    returnByValue: true,
  });
  await waitForApp(cdp, 15000, 40);
}

// CDP DOM 断言已重写为 React 等价物（默认 index = React 壳）。被删除的 vanilla 断言
// 及原因：.ik-rail/.sidebar/.frame 壳几何、.ik-home-layout/data-overview-action-panel/
// data-overview-drilldown/data-overview-wan-line/data-overview-wan-switch、
// .ikuai-*/.ops-* 资源与轴标签、[data-protocol-rank]、[data-broadband-realtime-table]
// 宽带表头、.scale-window 横向滚动、 Wan 卡 sticky 探针、[data-ikuai-terminal-summary]
// 终端卡位——这些选择器全部属于 vanilla panel-head.js DOM，在 React 渲染树中不存在，
// 且 React 无逐条等价物（面板信息架构已重设计）。React 等价断言：
//   - #app 有实质内容（children>0 且文本长度>200）
//   - body.dataset.panelRoute === ?section= 请求的路由（React 路由同步标记）
//   - 渲染文本不含 NaN/undefined/[object Object]（与实现无关的质量门，保留）
//   - 桌面无横向溢出、窄视口 --strict-responsive 下无横向溢出（保留）
//   - 零 pageerror / console error 由 runBrowserChecks 的 Runtime.exceptionThrown 监听承担
async function inspectSection(cdp, profile, viewport, section, args, scaleScenario) {
  const expression = `(() => {
    const sectionName = ${JSON.stringify(section)};
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const app = document.querySelector('#app');
    const root = document.documentElement;
    const body = document.body;
    const overflowX = Math.max(root.scrollWidth, body.scrollWidth) - window.innerWidth;
    const text = normalize((app || body).innerText);
    // 词边界用 indexOf 手工判断，避免模板字面量里的正则反斜杠转义陷阱。
    const badTokens = ['NaN', 'undefined', '[object Object]'];
    const badLiteralHits = [];
    for (const token of badTokens) {
      let at = text.indexOf(token);
      while (at >= 0 && badLiteralHits.length < 3) {
        const before = at === 0 ? ' ' : text[at - 1];
        const after = at + token.length >= text.length ? ' ' : text[at + token.length];
        const wordish = /[A-Za-z0-9_]/;
        if (!wordish.test(before) && !wordish.test(after)) {
          badLiteralHits.push(token + '@' + at + ' :: ' + text.slice(Math.max(0, at - 60), at + 60));
          break;
        }
        at = text.indexOf(token, at + 1);
      }
    }
    const hasBadLiteral = badLiteralHits.length > 0;
    const route = body.dataset.panelRoute || '';
    const surface = document.documentElement.dataset.panelSurface || '';
    // 移动端子页（Hub/空态）文本量小（~70 字符），阈值按 surface 区分。
    const minSectionText = surface === 'mobile' ? 40 : 200;
    const contentReady = Boolean(app && app.children.length > 0 && text.length > minSectionText);
    const routeMatched = route === sectionName;
    const desktopOverflow = window.innerWidth >= 1024 && overflowX > 24;
    const strictNarrowOverflow = ${args.strictResponsive ? 'true' : 'false'} && window.innerWidth < 768 && overflowX > 24;
    const pass = Boolean(
      contentReady &&
      routeMatched &&
      !hasBadLiteral &&
      !desktopOverflow &&
      !strictNarrowOverflow
    );
    return {
      pass,
      profile: ${JSON.stringify(profile)},
      viewport: ${JSON.stringify(viewport)},
      requestedSection: sectionName,
      activeRoute: route,
      surface,
      url: location.href,
      textLength: text.length,
      textSample: text.slice(0, 400),
      overflowX: Math.round(overflowX),
      appChildren: app ? app.children.length : 0,
      hasBadLiteral,
      badLiteralHits,
      contentReady,
      routeMatched,
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
      for (const scaleScenario of args.scaleScenarios) {
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
            await navigateWithFixture(cdp, baseUrl, profile, viewport, report, scaleScenario);
          } catch (error) {
            const bootDiag = await collectBootDiagnostics(cdp);
            const detail = {
              profile,
              scaleScenario,
              viewport,
              error: error.stack || error.message || String(error),
              runtimeErrorCount: runtimeErrors.length,
              consoleErrorCount: consoleErrors.length,
              runtimeErrors: runtimeErrors.slice(0, 3),
              consoleErrors: consoleErrors.slice(0, 3),
              bootDiag,
            };
            record(report, `browser boot ${profile}/${scaleScenario}/${viewport.name}`, false, detail);
            await captureScreenshot(cdp, path.join(args.out, `${profile}-${scaleScenario}-${viewport.name}-boot-failure.png`)).catch(() => {});
            continue;
          }
          for (const section of sections) {
            const runtimeErrorStart = runtimeErrors.length;
            const consoleErrorStart = consoleErrors.length;
            const sectionSurface = viewport.width < 768 ? 'mobile' : 'desktop';
            await setSection(cdp, section, sectionSurface);
            const inspection = await inspectSection(cdp, profile, viewport, section, args, scaleScenario);
            inspection.runtimeErrorCount = runtimeErrors.length;
            inspection.consoleErrorCount = consoleErrors.length;
            inspection.newRuntimeErrorCount = runtimeErrors.length - runtimeErrorStart;
            inspection.newConsoleErrorCount = consoleErrors.length - consoleErrorStart;
            if (inspection.newRuntimeErrorCount || inspection.newConsoleErrorCount || !inspection.pass) {
              inspection.runtimeErrors = runtimeErrors.slice(Math.max(0, runtimeErrorStart), runtimeErrorStart + 3);
              inspection.consoleErrors = consoleErrors.slice(Math.max(0, consoleErrorStart), consoleErrorStart + 3);
              inspection.firstRuntimeError = runtimeErrors[0] || null;
              inspection.firstConsoleError = consoleErrors[0] || null;
            }
            const hardPass = inspection.pass && runtimeErrors.length === 0 && consoleErrors.length === 0;
            report.browserChecks.push(inspection);
            record(report, `responsive ${profile}/${scaleScenario}/${viewport.name}/${section}`, hardPass, inspection);
            if (inspection.overflowX > 24 && viewport.width < 768 && !args.strictResponsive) {
              warn(report, `narrow overflow observed ${profile}/${viewport.name}/${section}`, {
                overflowX: inspection.overflowX,
                note: 'Current shell keeps desktop layout on narrow viewports; use --strict-responsive to fail this.',
              });
            }
            if (section === 'overview' || !hardPass) {
              const fileName = `${profile}-${scaleScenario}-${viewport.name}-${section}.png`.replace(/[^A-Za-z0-9_.-]+/g, '-');
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
    }
  } finally {
    await browser.stop();
  }
}

function buildSnapshot(profile, scaleScenario = 'multi') {
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
      ips: ['10.88.0.1/24', 'fd00:88::1/64'],
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
      ip: '10.88.0.21',
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
      ip: '10.88.0.31',
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
      ip: 'fd00:88::31',
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
        // vanilla 前端容忍任意哨兵值；React 契约要求 epoch 秒落在
        // [1e9, 1e10)（legacyContract 可规范化为 RFC3339），故用真实历元秒。
        timestamps: [5, 4, 3, 2, 1, 0].map((back) => Math.floor(Date.parse('2026-05-24T12:00:00+08:00') / 1000) - back * 60),
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
      pools: [{ name: 'lan-pool', ranges: '10.88.0.100-10.88.0.199', used: 34, total: 100 }],
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
        { src: '10.88.0.21', dst: '93.184.216.34', protocol: 'tcp', dstPort: 443, timeout: '58s' },
        { src: '10.88.0.31', dst: '198.51.100.53', protocol: 'udp', dstPort: 53, timeout: '12s' },
      ],
      thresholdLevel: 'ok',
    },
    dns: {
      running: true,
      allowRemoteRequests: true,
      servers: ['10.88.0.1', '1.1.1.1'],
      cacheSize: 33554432,
      cacheUsed: 7340032,
      dohServer: '',
      useDohServer: false,
      verifyDohCert: false,
      forwardRuleCount: 4,
      disabledForwardRuleCount: 0,
      forwardRuleSample: false,
      forwardRules: [
        { name: 'lan.local', type: 'A', value: '10.88.0.10', ttl: '1h', disabled: false },
        { name: 'nas.local', type: 'A', value: '10.88.0.31', ttl: '1h', disabled: false },
      ],
    },
    security: {
      filters: [
        { chain: 'input', action: 'accept', comment: 'allow established', packets: 12000, bytes: 9000000, disabled: false },
        { chain: 'input', action: 'drop', comment: 'drop invalid', packets: 4, bytes: 240, disabled: false },
      ],
      addressLists: [{ list: 'lan', address: '10.88.0.0/24', timeout: '', comment: 'LAN' }],
      mangle: [{ chain: 'prerouting', action: 'mark-routing', comment: 'wan balance', packets: 3300, bytes: 880000 }],
      routingRules: [{ action: 'lookup-only-in-table', table: 'wan1', src: '10.88.0.0/24', disabled: false }],
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
  applyScaleScenario(snapshot, scaleScenario);
  snapshot.actionQueue = snapshot.semanticTriage.queue;
  snapshot.semanticTriage.actionQueue = snapshot.semanticTriage.queue;
  return snapshot;
}

function lineLayoutTier(count) {
  if (count <= 0) return 'none';
  if (count === 1) return 'single';
  if (count <= 3) return 'few';
  if (count <= 6) return 'multi';
  return 'dense';
}

function scaleBucket(count) {
  if (count <= 0) return 'none';
  if (count === 1) return 'single';
  if (count <= 6) return 'small';
  if (count <= 24) return 'medium';
  if (count <= 100) return 'large';
  return 'fleet';
}

function listScaleMeta(totalCount, shownCount = totalCount, limit = shownCount, sampled = false, sampleMethod = '', sortedBy = '', groupedBy = []) {
  return {
    actualCount: totalCount,
    totalCount,
    shownCount,
    limit,
    hasMore: shownCount < totalCount,
    sampled,
    sampleMethod,
    sortedBy,
    groupedBy,
    bucket: scaleBucket(totalCount),
  };
}

function makeWan(index) {
  const n = index + 1;
  const name = `pppoe-wan${n}`;
  const running = n % 17 !== 0;
  const upRate = running ? (8_000_000 + n * 750_000) : 0;
  const downRate = running ? (30_000_000 + n * 1_250_000) : 0;
  const parent = `ether${((n - 1) % 8) + 1}`;
  return {
    name,
    interface: name,
    type: 'pppoe',
    running,
    disabled: false,
    status: running ? 'online' : 'offline',
    role: n === 1 ? 'primary' : 'member',
    address: `198.51.${Math.floor(n / 250)}.${10 + (n % 200)}`,
    addresses: [`198.51.${Math.floor(n / 250)}.${10 + (n % 200)}/32`, `fe80::${n.toString(16).padStart(2, '0')}/64`],
    upRate,
    downRate,
    txBytes: 400_000_000 + n * 2_000_000,
    rxBytes: 700_000_000 + n * 3_000_000,
    parent,
    access: `WAN-${n}`,
    history: {
      up: [upRate * 0.45, upRate * 0.62, upRate * 0.74, upRate].map(Math.round),
      down: [downRate * 0.5, downRate * 0.66, downRate * 0.8, downRate].map(Math.round),
    },
    routes: [{ dst: '0.0.0.0/0', gateway: name, distance: n, active: running, table: n === 1 ? 'main' : `wan-${n}` }],
  };
}

function makeTerminal(index) {
  const n = index + 1;
  return {
    ip: `192.168.${Math.floor(n / 240)}.${10 + (n % 240)}`,
    mac: `AA:BB:CC:${String((n >> 8) & 255).padStart(2, '0')}:${String(n & 255).padStart(2, '0')}:01`,
    hostname: `client-${n}`,
    displayName: `client-${n}`,
    source: n % 2 ? 'dhcp' : 'arp',
    connectionCount: 5 + (n % 90),
    connections: 5 + (n % 90),
    upRate: 100_000 + n * 8_000,
    downRate: 500_000 + n * 11_000,
    sessionBytes: 50_000_000 + n * 100_000,
    lastSeen: `${n % 30}s`,
    status: n % 13 === 0 ? 'stale' : 'bound',
  };
}

function buildProtocolTop(activeRows) {
  const buckets = new Map();
  for (const row of activeRows || []) {
    const protocol = String(row.protocol || '-').toUpperCase();
    const mark = String(row.mark || '').trim();
    const normalizedMark = mark && mark !== '-' ? mark : '';
    const key = `${protocol}|${normalizedMark}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        name: normalizedMark ? `${protocol} / ${normalizedMark}` : `${protocol} 活跃流量`,
        protocol,
        mark: normalizedMark || '-',
        connections: 0,
        upRate: 0,
        downRate: 0,
        totalRate: 0,
        sessionBytes: 0,
        source: 'active-connection-sample',
      });
    }
    const bucket = buckets.get(key);
    bucket.connections += 1;
    bucket.upRate += Number(row.upRate || 0);
    bucket.downRate += Number(row.downRate || 0);
    bucket.totalRate += Number(row.upRate || 0) + Number(row.downRate || 0);
    bucket.sessionBytes += Number(row.sessionBytes || 0);
  }
  return Array.from(buckets.values())
    .sort((a, b) => b.totalRate - a.totalRate || b.connections - a.connections || b.sessionBytes - a.sessionBytes)
    .slice(0, 20);
}

function applyScaleScenario(snapshot, scaleScenario) {
  const counts = scaleScenario === 'single'
    ? { wan: 1, terminals: 8 }
    : scaleScenario === 'fleet'
      ? { wan: 64, terminals: 180 }
      : { wan: 4, terminals: 24 };
  const wan = Array.from({ length: counts.wan }, (_, index) => makeWan(index));
  const terminals = Array.from({ length: counts.terminals }, (_, index) => makeTerminal(index));
  const lan = {
    name: 'bridge-lan',
    type: 'bridge',
    running: true,
    disabled: false,
    mac: '02:00:00:00:10:01',
    ips: ['192.168.88.1/24', 'fd00:88::1/64'],
    rxRate: terminals.reduce((sum, row) => sum + row.downRate, 0),
    txRate: terminals.reduce((sum, row) => sum + row.upRate, 0),
    rxBytes: 1_900_000_000,
    txBytes: 900_000_000,
    rxPacket: 2_400_000,
    txPacket: 1_720_000,
    rxDrop: scaleScenario === 'fleet' ? 3 : 0,
    txDrop: 0,
    rxError: 0,
    txError: 0,
  };
  snapshot.interfaces = [
    ...wan.map((row, index) => ({
      name: row.name,
      type: 'pppoe-out',
      running: row.running,
      disabled: false,
      mac: `02:00:00:00:01:${String(index + 1).padStart(2, '0')}`,
      ips: row.addresses,
      rxRate: row.downRate,
      txRate: row.upRate,
      rxBytes: row.rxBytes,
      txBytes: row.txBytes,
      rxPacket: 900_000 + index,
      txPacket: 700_000 + index,
      rxDrop: index % 19 === 0 && index > 0 ? 1 : 0,
      txDrop: 0,
      rxError: 0,
      txError: 0,
      role: 'WAN',
    })),
    lan,
  ];
  snapshot.wan = wan;
  snapshot.pppoe = wan.map((row) => ({ ...row, name: row.name }));
  snapshot.terminals = terminals;
  snapshot.arp.items = terminals.slice(0, 120).map((row) => ({
    address: row.ip,
    ip: row.ip,
    mac: row.mac,
    hostname: row.hostname,
    displayName: row.displayName,
    status: row.status === 'bound' ? 'reachable' : 'stale',
    dynamic: true,
  }));
  snapshot.dhcp.leases = terminals.slice(0, 120).map((row) => ({
    address: row.ip,
    mac: row.mac,
    hostname: row.hostname,
    displayName: row.displayName,
    server: 'dhcp-lan',
    status: row.status === 'bound' ? 'bound' : 'waiting',
    static: false,
    dynamic: true,
    lastSeen: row.lastSeen,
  }));
  snapshot.connections.total = scaleScenario === 'fleet' ? 125000 : scaleScenario === 'single' ? 180 : 2400;
  snapshot.connections.active = terminals.slice(0, 80).map((row, index) => ({
    src: row.ip,
    localIp: row.ip,
    dst: `203.0.113.${20 + (index % 120)}`,
    remoteIp: `203.0.113.${20 + (index % 120)}`,
    protocol: index % 3 === 0 ? 'udp' : 'tcp',
    dstPort: index % 3 === 0 ? 443 : 80,
    timeout: `${20 + index}s`,
    upRate: row.upRate,
    downRate: row.downRate,
    sessionBytes: row.sessionBytes,
    mark: index % 2 ? 'wan-even' : 'wan-odd',
  }));
  snapshot.connections.protocolTop = buildProtocolTop(snapshot.connections.active);
  snapshot.connections.meta = {
    ...(snapshot.connections.meta || {}),
    protocolTop: {
      actualCount: snapshot.connections.protocolTop.length,
      totalCount: snapshot.connections.protocolTop.length,
      shownCount: snapshot.connections.protocolTop.length,
      hasMore: false,
      sampled: true,
      sampleMethod: 'active connection detail sample grouped by protocol/connection mark',
      sortedBy: 'traffic/connections',
    },
  };
  snapshot.connections.topIps = terminals.slice(0, 40).map((row) => ({
    ip: row.ip,
    displayName: row.displayName,
    count: row.connectionCount,
    connections: row.connectionCount,
    upRate: row.upRate,
    downRate: row.downRate,
  }));
  snapshot.loadBalance.distribution = wan.map((row) => ({
    name: row.name,
    share: wan.length ? Number((100 / wan.length).toFixed(2)) : 0,
    active: row.running,
    upRate: row.upRate,
    downRate: row.downRate,
  }));
  snapshot.routes.defaultRoutes = wan.map((row, index) => ({
    dst: '0.0.0.0/0',
    gateway: row.name,
    distance: index + 1,
    active: row.running,
    static: true,
    disabled: false,
    table: index === 0 ? 'main' : `wan-${index + 1}`,
  }));
  const upTotal = wan.reduce((sum, row) => sum + row.upRate, 0);
  const downTotal = wan.reduce((sum, row) => sum + row.downRate, 0);
  snapshot.overview.uplinkBps = upTotal;
  snapshot.overview.downlinkBps = downTotal;
  snapshot.overview.wanUpRate = upTotal;
  snapshot.overview.wanDownRate = downTotal;
  snapshot.overview.onlineTerminals = terminals.length;
  snapshot.overview.terminalCount = terminals.length;
  snapshot.overview.interfaceCount = snapshot.interfaces.length;
  snapshot.overview.connectionTotal = snapshot.connections.total;
  snapshot.meta.pppoeCount = wan.length;
  snapshot.meta.wanCount = wan.length;
  snapshot.meta.lineCount = wan.length;
  snapshot.meta.lineLayoutTier = lineLayoutTier(wan.length);
  snapshot.meta.scaleScenario = scaleScenario;
  snapshot.meta.scale = {
    wan: listScaleMeta(wan.length, wan.length, wan.length, false, '', 'natural name', ['status', 'parent', 'routeTable']),
    pppoe: listScaleMeta(wan.length, wan.length, wan.length, false, '', 'natural name'),
    interfaces: listScaleMeta(snapshot.interfaces.length, snapshot.interfaces.length, snapshot.interfaces.length, false, '', 'role/name', ['role', 'type', 'status']),
    terminals: listScaleMeta(terminals.length, terminals.length, terminals.length, false, '', 'traffic/connections', ['status', 'source']),
    arp: listScaleMeta(terminals.length, snapshot.arp.items.length, 120, terminals.length > snapshot.arp.items.length, 'first 120 sorted by IP', 'ip'),
    dhcpLeases: listScaleMeta(terminals.length, snapshot.dhcp.leases.length, 120, terminals.length > snapshot.dhcp.leases.length, 'first 120 sorted by status and IP', 'status/ip', ['status', 'server', 'static']),
    connectionsActive: listScaleMeta(snapshot.connections.total, snapshot.connections.active.length, 80, true, 'active connection sample', 'rate'),
    dnsStatic: listScaleMeta(snapshot.dns.forwardRuleCount || 4, snapshot.dns.forwardRules.length, 100, true, 'preview rows; /api/dns-static is paged', 'RouterOS order'),
  };
  snapshot.connections.meta = {
    active: snapshot.meta.scale.connectionsActive,
    topIps: listScaleMeta(terminals.length, snapshot.connections.topIps.length, 40, true, 'terminal top list', 'connections/traffic'),
  };
  snapshot.dhcp.meta = {
    leases: snapshot.meta.scale.dhcpLeases,
    pools: listScaleMeta(snapshot.dhcp.pools.length, snapshot.dhcp.pools.length),
    servers: listScaleMeta(snapshot.dhcp.servers.length, snapshot.dhcp.servers.length),
  };
  snapshot.semanticTriage.queue.unshift({
    id: `scale.${scaleScenario}`,
    severity: scaleScenario === 'fleet' ? 'warning' : 'info',
    domain: 'scale',
    title: `Scale fixture: ${scaleScenario}`,
    summary: `${wan.length} WAN lines and ${terminals.length} terminals are loaded in this fixture.`,
    nextStep: 'Verify overview stays risk/action-first and detail pages disclose total vs shown rows.',
    source: 'fixture.meta.scale',
    readOnly: true,
    actionType: 'manual_review',
    priority: 0,
    evidence: [{ label: 'wan', value: String(wan.length) }, { label: 'terminals', value: String(terminals.length) }],
  });
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
