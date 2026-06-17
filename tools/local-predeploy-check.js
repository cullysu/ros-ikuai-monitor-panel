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
const MAIN_MENU_SECTIONS = [
  'overview',
  'interfaces',
  'terminals',
  'dhcp',
  'dns4',
  'dns6',
  'routes',
  'lineStatus',
  'balance',
  'trafficLoad',
  'loadAudit',
  'security',
  'arp',
  'trafficAudit',
  'readonlyDiagnostics',
  'logs',
  'serviceLogs',
];
const DEFAULT_PUBLIC_SECTIONS = [
  ...MAIN_MENU_SECTIONS,
  'connections',
];
const DEFAULT_PRIVATE_SECTIONS = [
  ...DEFAULT_PUBLIC_SECTIONS,
];
const DEFAULT_SCALE_SCENARIOS = ['multi'];
const EDGE_SCALE_SCENARIOS = ['all-offline', 'no-snapshot', 'collection-down', 'resource-full', 'interfaces-down'];
const SCALE_SCENARIOS = new Set(['single', 'multi', 'fleet', ...EDGE_SCALE_SCENARIOS]);

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
  --sections <list>           Comma list of sections to visit, or main-menu/public-release.
  --scale-scenarios <list>    Comma list: single,multi,fleet,all-offline,no-snapshot,collection-down,resource-full,interfaces-down. Default: multi.
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
    else if (item === '--sections' || item.startsWith('--sections=')) args.sections = parseSections(readValue('--sections'));
    else if (item === '--scale-scenarios' || item.startsWith('--scale-scenarios=')) args.scaleScenarios = readValue('--scale-scenarios').split(',').map((part) => part.trim()).filter(Boolean);
    else throw new Error(`Unknown argument: ${item}`);
  }
  if (!['public', 'private', 'both'].includes(args.profile)) {
    throw new Error('--profile must be public, private, or both');
  }
  if (!args.scaleScenarios.length || args.scaleScenarios.some((item) => !SCALE_SCENARIOS.has(item))) {
    throw new Error('--scale-scenarios must use one or more of: single,multi,fleet,all-offline,no-snapshot,collection-down,resource-full,interfaces-down');
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

function parseSections(value) {
  const parts = String(value || '').split(',').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return [];
  const expanded = [];
  for (const part of parts) {
    if (['main-menu', 'public-release', 'all-main'].includes(part)) {
      expanded.push(...DEFAULT_PUBLIC_SECTIONS);
    } else if (part === 'overview-edge-cases') {
      expanded.push('overview');
    } else {
      expanded.push(part);
    }
  }
  return [...new Set(expanded)];
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

function jsonStringifyAscii(payload, space = 2) {
  return JSON.stringify(payload, null, space)
    .replace(/[^\x20-\x7E\n\r\t]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${jsonStringifyAscii(payload, 2)}\n`, 'utf8');
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
      report.serverExit = { code, stderrTail: tail(stderr, 400), stdoutTail: tail(stdout, 400) };
    }
  });

  try {
    await waitForJson(`${baseUrl}api/health`, 16000);
  } catch (error) {
    child.kill('SIGKILL');
    const stdoutArtifact = await writeLogArtifact(args.out, 'server-start-failure.stdout.log', stdout);
    const stderrArtifact = await writeLogArtifact(args.out, 'server-start-failure.stderr.log', stderr);
    await writeJson(path.join(args.out, 'server-start-failure.json'), {
      error: error.message,
      stdout: summarizeTextArtifact(stdout, stdoutArtifact),
      stderr: summarizeTextArtifact(stderr, stderrArtifact),
    });
    throw error;
  }

  return {
    baseUrl,
    child,
    stop: async () => {
      const stdoutArtifact = await writeLogArtifact(args.out, 'server.stdout.log', stdout);
      const stderrArtifact = await writeLogArtifact(args.out, 'server.stderr.log', stderr);
      report.serverLogs = {
        stdout: summarizeTextArtifact(stdout, stdoutArtifact),
        stderr: summarizeTextArtifact(stderr, stderrArtifact),
      };
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

async function writeLogArtifact(outDir, name, text) {
  if (!text) return null;
  const filePath = path.join(outDir, name);
  await writeTextIfAny(filePath, text);
  return {
    path: filePath,
    bytes: Buffer.byteLength(text, 'utf8'),
    tail: tail(text, 400),
  };
}

function summarizeTextArtifact(text, artifact) {
  if (!text) return '';
  if (artifact) return { path: artifact.path, bytes: artifact.bytes, tail: artifact.tail };
  return tail(text, 400);
}

async function prepareReportForJson(value, outDir, breadcrumb = 'report') {
  if (Array.isArray(value)) {
    const rows = [];
    for (let i = 0; i < value.length; i += 1) {
      rows.push(await prepareReportForJson(value[i], outDir, `${breadcrumb}-${i}`));
    }
    return rows;
  }
  if (!value || typeof value !== 'object') return value;
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    const safeKey = String(key).replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 48) || 'field';
    const nextCrumb = `${breadcrumb}-${safeKey}`;
    if (['body', 'stdout', 'stderr'].includes(key) && typeof item === 'string') {
      const artifact = await writeLogArtifact(outDir, `${nextCrumb}.log`, item);
      result[key] = summarizeTextArtifact(item, artifact);
    } else {
      result[key] = await prepareReportForJson(item, outDir, nextCrumb);
    }
  }
  return result;
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
  const publicRouterosProfile = health.json.profile === 'routeros_only';
  if (startedByScript) {
    record(report, '/api/health uses safe local profile', health.json.profile === 'routeros_only' && health.json.target === '127.0.0.1', {
      profile: health.json.profile,
      target: health.json.target,
    });
  }

  const index = await fetchText(baseUrl, { timeoutMs: 5000 });
  record(
    report,
    'GET / serves panel shell',
    index.response.ok &&
      index.text.includes('id="app"') &&
      !index.text.includes('src="/layout-whitespace-patch.js"') &&
      !index.text.includes('src="/readonly-diagnostics.js"'),
    {
    statusCode: index.response.status,
    bytes: index.text.length,
    }
  );

  const assets = [
    'layout-whitespace-patch.js',
    'readonly-diagnostics.js',
    'panel-professional-redesign.js',
  ];
  for (const asset of assets) {
    const result = await fetchText(`${baseUrl}${asset}`, { timeoutMs: 5000 });
    const privatePublicAsset = publicRouterosProfile && asset === 'readonly-diagnostics.js';
    record(report, `GET /${asset}`, privatePublicAsset ? result.response.status === 403 : result.response.ok && result.text.length > 1000, {
      statusCode: result.response.status,
      bytes: result.text.length,
      privatePublicAsset,
    });
  }

  const snapshot = await fetchJson(`${baseUrl}api/snapshot`, { timeoutMs: 5000 });
  record(report, 'GET /api/snapshot returns safe state JSON', snapshot.response.ok && snapshot.json && snapshot.json.meta, {
    statusCode: snapshot.response.status,
    status: snapshot.json && snapshot.json.status,
    profile: snapshot.json && snapshot.json.meta && snapshot.json.meta.profile,
  });
  record(report, 'GET /api/snapshot includes read-only status findings', Boolean(
    snapshot.response.ok &&
    snapshot.json &&
    snapshot.json.statusFindings &&
    snapshot.json.statusFindings.readOnly === true &&
    Array.isArray(snapshot.json.statusFindings.findings) &&
    snapshot.json.healthFindings &&
    snapshot.json.healthFindings.guardrails &&
    snapshot.json.healthFindings.guardrails.routerosWrites === false &&
    snapshot.json.meta &&
    snapshot.json.meta.capabilities &&
    snapshot.json.meta.capabilities.publicRouterosProfile === true
  ), {
    statusCode: snapshot.response.status,
    readOnly: snapshot.json && snapshot.json.statusFindings && snapshot.json.statusFindings.readOnly,
    publicRouterosProfile: snapshot.json && snapshot.json.meta && snapshot.json.meta.capabilities && snapshot.json.meta.capabilities.publicRouterosProfile,
  });

  const findings = await fetchJson(`${baseUrl}api/status-findings`, { timeoutMs: 5000 });
  record(report, 'GET /api/status-findings returns read-only findings', Boolean(
    findings.response.ok &&
    findings.json &&
    findings.json.readOnly === true &&
    Array.isArray(findings.json.findings) &&
    findings.json.guardrails &&
    findings.json.guardrails.routerosWrites === false
  ), {
    statusCode: findings.response.status,
    status: findings.json && findings.json.status,
    findingCount: findings.json && Array.isArray(findings.json.findings) ? findings.json.findings.length : null,
  });

  if (startedByScript) {
    const diag = await fetchJson(`${baseUrl}api/readonly-diagnostics`, { timeoutMs: 5000 });
    record(report, 'public profile forbids external readonly diagnostics', diag.response.status === 403 && diag.json.code === 'private_diagnostics_disabled', {
      statusCode: diag.response.status,
      status: diag.json.status,
      code: diag.json.code,
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
    await waitForJson(`http://127.0.0.1:${port}/json/version`, 45000);
  } catch (error) {
    child.kill('SIGKILL');
    const stdoutArtifact = await writeLogArtifact(args.out, 'browser-launch.stdout.log', stdout);
    const stderrArtifact = await writeLogArtifact(args.out, 'browser-launch.stderr.log', stderr);
    report.browser = {
      ...report.browser,
      launchError: error.message,
      exit,
      stdout: summarizeTextArtifact(stdout, stdoutArtifact),
      stderr: summarizeTextArtifact(stderr, stderrArtifact),
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
  await cdp.send('Page.navigate', {
    url: `${baseUrl}?section=overview&predeploy=${Date.now()}#overview`,
  });
  await waitForApp(cdp);
  record(report, `browser boot ${profile}/${scaleScenario}/${viewport.name}`, true, {
    viewport,
    profile,
    scaleScenario,
  });
}

async function setSection(cdp, section) {
  const result = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const section = ${JSON.stringify(section)};
      const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
      const candidates = Array.from(document.querySelectorAll('[data-section="' + CSS.escape(section) + '"]'));
      const visible = candidates.find((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      }) || null;
      const link = visible || candidates[0] || null;
      if (link) link.click();
      else location.hash = '#' + section;
      return {
        linkFound: candidates.length > 0,
        linkVisible: Boolean(visible),
        linkCount: candidates.length,
        linkText: normalize((visible || link)?.textContent || ''),
      };
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  await delay(450);
  return result.result && result.result.value ? result.result.value : {
    linkFound: false,
    linkVisible: false,
    linkCount: 0,
    linkText: '',
  };
}

async function inspectSection(cdp, profile, viewport, section, args, scaleScenario) {
  const expression = `(() => {
    const sectionName = ${JSON.stringify(section)};
    const scaleScenario = ${JSON.stringify(scaleScenario)};
    const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const countOccurrences = (value, needle) => {
      const textValue = String(value || '');
      if (!needle) return 0;
      let count = 0;
      let start = 0;
      while (start >= 0) {
        const index = textValue.indexOf(needle, start);
        if (index === -1) break;
        count += 1;
        start = index + Math.max(needle.length, 1);
      }
      return count;
    };
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
    const edgeScenarios = new Set(['all-offline', 'no-snapshot', 'collection-down', 'resource-full', 'interfaces-down']);
    const isEdgeScenario = edgeScenarios.has(scaleScenario);
    const noSnapshotEdge = scaleScenario === 'no-snapshot';
    const topErrorNotice = (requested || active || app || body).querySelector?.('.notice.danger');
    const topErrorNoticeRect = topErrorNotice?.getBoundingClientRect();
    const topErrorNoticeText = normalize(topErrorNotice?.textContent || '');
    const topErrorNoticeVisible = Boolean(topErrorNoticeRect && topErrorNoticeRect.width > 0 && topErrorNoticeRect.height > 0 && topErrorNoticeRect.top < 90);
    const hasBadLiteral = /\\bNaN\\b|\\bundefined\\b|\\[object Object\\]/.test(text);
    const scaleMeta = window.__PANEL_TEST_SNAPSHOT__?.meta?.scale || {};
    const scenario = ${JSON.stringify(scaleScenario)};
    const scaleDisclosureCount = document.querySelectorAll('.scale-meta, .scale-pager, .scale-toolbar, [data-scale-meta]').length;
    const isCurrent35Shell = Boolean(document.querySelector('.ik-rail'));
    const scaleMetaOk = Boolean(scaleMeta.wan && Number(scaleMeta.wan.actualCount || 0) >= 0 && Number(scaleMeta.wan.shownCount || 0) >= 0);
    const scaleRequiredSections = new Set(['overview', 'interfaces', 'terminals', 'dhcp', 'trafficLoad']);
    const scaleDisclosureOk = scenario !== 'fleet' || !scaleRequiredSections.has(sectionName) || scaleDisclosureCount > 0 || isCurrent35Shell;
    const sectionRoot = requested || active;
    const detailSections = new Set(['interfaces', 'terminals', 'dhcp', 'trafficLoad']);
    const overviewSummaryShell = sectionRoot?.querySelector('[data-overview-summary]');
    const overviewSummaryMain = sectionRoot?.querySelector('[data-overview-summary-main]');
    const overviewSummaryFocus = overviewSummaryShell?.getAttribute('data-overview-summary-focus') || '';
    const overviewDesktopTopShell = sectionRoot?.querySelector('[data-overview-desktop-top]');
    const overviewDesktopPrimary = overviewDesktopTopShell?.querySelector('[data-overview-desktop-primary]');
    const overviewDesktopTopText = normalize(overviewDesktopTopShell?.textContent || '');
    const overviewFocusModule = sectionRoot?.querySelector('[data-overview-density-module="resource-focus"], [data-overview-density-module="collection-focus"], [data-overview-density-module="freshness-focus"], [data-overview-density-module="wan-focus"], [data-overview-density-module="route-focus"]');
    const operatorGrid = sectionRoot?.querySelector('.ik-home-operator-grid');
    const operatorCards = Array.from(operatorGrid?.querySelectorAll('.ik-home-operator-card') || []);
    const operatorText = normalize(operatorGrid?.textContent || '');
    const isOperatorHome = sectionName === 'overview' && Boolean(operatorGrid || overviewSummaryShell);
    const isDesktopOverview = sectionName === 'overview' && window.innerWidth >= 1024;
    const isCurrent35Home = sectionName === 'overview' && Boolean(operatorGrid || overviewSummaryShell || sectionRoot?.querySelector('.ik-home-layout, [data-overview-verdict-panel]'));
    const overviewOperatorHomeOk = sectionName !== 'overview' || Boolean(
      (
        operatorGrid &&
        operatorCards.length === 4 &&
        operatorText.includes('风险') &&
        operatorText.includes('WAN') &&
        operatorText.includes('资源') &&
        operatorText.includes('设备')
      ) ||
      (
        overviewSummaryShell &&
        overviewSummaryMain &&
        sectionRoot?.querySelector('[data-overview-verdict-panel]') &&
        /风险|WAN|资源|采集|证据/.test(normalize(overviewSummaryShell.textContent || ''))
      )
    );
    const overviewActionOk = sectionName !== 'overview' || isCurrent35Home || Boolean(sectionRoot?.querySelector('[data-overview-action-panel]') && sectionRoot?.querySelector('[data-overview-drilldown]'));
    const overviewMinimalOk = sectionName !== 'overview' || !/WAN 摘要|线路总表|线路窗口|数据采集完整度|只读承诺/.test(text);
    const terminalSummary = sectionRoot?.querySelector('[data-ikuai-terminal-summary], .ik-home-terminal-card');
    const latencyRow = sectionRoot?.querySelector('.ikuai-latency, .ik-wan-info-card');
    const quickHead = sectionRoot?.querySelector('.ikuai-quick-head, .ik-home-quick-card');
    const overviewTerminalPlacementOk = sectionName !== 'overview' || isOperatorHome || Boolean(
      terminalSummary &&
      latencyRow &&
      quickHead &&
      (latencyRow.compareDocumentPosition(terminalSummary) & Node.DOCUMENT_POSITION_FOLLOWING) &&
      (terminalSummary.compareDocumentPosition(quickHead) & Node.DOCUMENT_POSITION_FOLLOWING)
    );
    const duplicateTerminalCards = Array.from(sectionRoot?.querySelectorAll('.ikuai-right .ikuai-card-title') || [])
      .filter((node) => normalize(node.textContent) === '终端数量');
    const overviewNoDuplicateTerminalOk = sectionName !== 'overview' || duplicateTerminalCards.length === 0;
    const visibleAxisLabels = (selector) => Array.from(sectionRoot?.querySelectorAll(selector) || [])
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0' && normalize(node.textContent);
      });
    const wanAxisLabels = visibleAxisLabels('.ikuai-wan-card .axis-tick-label, .ik-wan-info-card .ik-wan-rate-axis span, [data-overview-density-module="wan-trend"] .ik-wan-rate-axis span');
    const monitorAxisLabels = visibleAxisLabels('.ikuai-monitor-card .axis-tick-label, .ik-home-main .ik-wan-rate-axis span, [data-overview-density-module="wan-trend"] .ik-wan-rate-axis span');
    const overviewSamplingFallbackOk = sectionName !== 'overview' || !isDesktopOverview || (
      /采样不足/.test(text) ||
      /采样陈旧|历史快照/.test(text) ||
      (isEdgeScenario && /无可用快照|采集状态异常|采集降级|SSH 采集不可用|接口全 Down|全部接口离线|WAN 全离线|资源满载|资源高负载/.test(text))
    );
    const overviewAxesOk = sectionName !== 'overview' || !isDesktopOverview || (
      (wanAxisLabels.length >= 3 && monitorAxisLabels.length >= 6) ||
      overviewSamplingFallbackOk
    );
    const monitorSplit = sectionRoot?.querySelector('[data-monitor-split-charts], .ik-wan-rate-split.is-main');
    const monitorPanels = Array.from(monitorSplit?.querySelectorAll('[data-monitor-chart], .ik-wan-rate-card') || []);
    const monitorSplitColumns = monitorSplit ? getComputedStyle(monitorSplit).gridTemplateColumns.split(' ').filter(Boolean).length : 0;
    const monitorSplitText = normalize(monitorSplit?.textContent || '');
    const overviewMonitorSplitOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      sectionRoot?.querySelector('[data-overview-trend-compact]') ||
      overviewFocusModule ||
      (
        monitorSplit &&
        monitorPanels.length === 2 &&
        monitorSplitColumns >= 2 &&
        monitorSplitText.includes('上行速率') &&
        monitorSplitText.includes('下行速率')
      )
    );
    const wanCard = sectionRoot?.querySelector('.ikuai-wan-card, .ik-wan-info-card');
    const wanSelect = wanCard?.querySelector('.ikuai-wan-select, .ik-wan-line-select, [data-overview-wan-line]');
    const wanIpRow = Array.from(wanCard?.querySelectorAll('.ikuai-info-row, .info-item') || [])
      .find((node) => normalize(node.querySelector('span, .info-k')?.textContent) === 'WAN IP');
    const wanIpText = normalize(wanIpRow?.querySelector('strong, .info-v')?.textContent || '');
    const wanCardStyle = wanCard ? getComputedStyle(wanCard) : null;
    const overviewAggregateWanNoIpv6Ok = sectionName !== 'overview' || !wanSelect || wanSelect.value !== '__all_wan__' || !wanIpText.includes(':');
    const overviewWanCardNoInternalScrollOk = sectionName !== 'overview' || !wanCardStyle || (
      !['auto', 'scroll'].includes(wanCardStyle.overflowY) &&
      Math.round(wanCard.scrollHeight - wanCard.clientHeight) <= 2
    );
    const scrollHeight = Math.max(root.scrollHeight, body.scrollHeight);
    let overviewStickyOk = true;
    let overviewStickyProbe = null;
    if (sectionName === 'overview' && window.innerWidth >= 1024) {
      const originalScrollY = window.scrollY || root.scrollTop || body.scrollTop || 0;
      const titleNode = wanCard?.querySelector('.ikuai-card-title, .card-title');
      const maxProbeY = Math.max(0, scrollHeight - window.innerHeight - 1);
      const probeY = Math.min(520, maxProbeY);
      if (wanCard && titleNode && probeY >= 120) {
        window.scrollTo(0, probeY);
        if (typeof window.__syncHomeStickyFallbacks === 'function') {
          window.__syncHomeStickyFallbacks();
        }
        const cardRect = wanCard.getBoundingClientRect();
        const titleRect = titleNode.getBoundingClientRect();
        const cardStyle = getComputedStyle(wanCard);
        const nativeStickyOk = (
          cardStyle.position === 'sticky' &&
          cardRect.top >= 0 &&
          cardRect.top <= 24 &&
          titleRect.top >= cardRect.top &&
          titleRect.top < window.innerHeight / 2
        );
        const fixedFallbackOk = (
          cardStyle.position === 'fixed' &&
          wanCard.classList.contains('is-ikuai-home-fixed') &&
          cardRect.top >= 0 &&
          cardRect.top <= 24 &&
          titleRect.top >= cardRect.top &&
          titleRect.top < window.innerHeight / 2
        );
        overviewStickyOk = cardStyle.position === 'static' ? true : (nativeStickyOk || fixedFallbackOk);
        overviewStickyProbe = {
          probeY,
          cardTop: Math.round(cardRect.top),
          titleTop: Math.round(titleRect.top),
          position: cardStyle.position,
          internalScrollTop: Math.round(wanCard.scrollTop || 0),
        };
        window.scrollTo(0, originalScrollY);
      }
    }
    const resourceGrid = sectionRoot?.querySelector('.ikuai-resource-grid, .ops-resource-grid');
    const resourceCards = Array.from(resourceGrid?.querySelectorAll('.ikuai-resource-card, .ops-resource-card') || []);
    const resourceText = normalize(resourceGrid?.textContent || '');
    const resourceColumns = resourceGrid ? getComputedStyle(resourceGrid).gridTemplateColumns.split(' ').filter(Boolean).length : 0;
    const resourceAxisLabels = Array.from(resourceGrid?.querySelectorAll('.axis-tick-label, .ops-axis-labels span') || []).map((node) => normalize(node.textContent));
    const overviewResourceRowOk = sectionName !== 'overview' || isOperatorHome || Boolean(
      resourceCards.length === 3 &&
      (resourceColumns >= 3 || window.innerWidth < 768) &&
      (resourceText.includes('CPU负载') || resourceText.includes('CPU')) &&
      (resourceText.includes('内存使用率') || resourceText.includes('内存')) &&
      (resourceText.includes('磁盘使用率') || resourceText.includes('磁盘'))
    );
    const overviewResourceAxisOk = sectionName !== 'overview' || isOperatorHome || Boolean(
      resourceAxisLabels.filter((label) => label === '100.0%' || label === '100%').length >= 3 &&
      resourceAxisLabels.filter((label) => label === '50.0%' || label === '50%').length >= 3 &&
      resourceAxisLabels.filter((label) => label === '0.0%' || label === '0%').length >= 3
    );
    const protocolRank = sectionRoot?.querySelector('[data-protocol-rank]');
    const protocolRankText = normalize(protocolRank?.textContent || '');
    const overviewProtocolRankOk = sectionName !== 'overview' || isCurrent35Home || Boolean(
      protocolRank &&
      /TCP|UDP|ICMP/.test(protocolRankText) &&
      !protocolRankText.includes('当前暂无协议/应用流量') &&
      !protocolRankText.includes('当前暂无数据')
    );
    const detailFeedbackOk = !detailSections.has(sectionName) || isCurrent35Shell || Boolean(sectionRoot?.querySelector('[data-scale-filter-summary]') && sectionRoot?.querySelector('[data-scale-clear]'));
    const scaleWindowScrollers = Array.from(sectionRoot?.querySelectorAll('.scale-window .scale-table-wrap') || []);
    const scaleWindowHorizontalOverflow = scaleWindowScrollers
      .map((node) => {
        const rect = node.getBoundingClientRect();
        const windowNode = node.closest('.scale-window');
        const key = windowNode?.dataset?.scaleKey || '';
        return {
          key,
          width: Math.round(rect.width),
          scrollWidth: Math.round(node.scrollWidth),
          clientWidth: Math.round(node.clientWidth),
          overflowX: Math.round(node.scrollWidth - node.clientWidth),
        };
      })
      .filter((row) => row.width > 0 && row.overflowX > 2);
    const scaleWindowHorizontalOk = !detailSections.has(sectionName) || scaleWindowHorizontalOverflow.length === 0;
    const broadbandTable = sectionRoot?.querySelector('[data-broadband-realtime-table]');
    const broadbandText = normalize(broadbandTable?.textContent || '');
    const broadbandHeaders = Array.from(broadbandTable?.querySelectorAll('th') || []).map((node) => normalize(node.textContent));
    const interfaceBroadbandTableOk = sectionName !== 'interfaces' || isCurrent35Shell || Boolean(
      broadbandTable &&
      broadbandHeaders.includes('线路') &&
      broadbandHeaders.includes('状态') &&
      broadbandHeaders.includes('IP 地址') &&
      broadbandHeaders.includes('实时上行速率') &&
      broadbandHeaders.includes('实时下行速率') &&
      broadbandHeaders.includes('累计上行流量') &&
      broadbandHeaders.includes('累计下行流量') &&
      broadbandHeaders.includes('活动路由') &&
      broadbandHeaders.includes('父接口') &&
      broadbandText.includes('宽带实时流量') &&
      broadbandTable.querySelectorAll('tbody tr').length > 0
    );
    const humanScaleCopyOk = !scaleRequiredSections.has(sectionName) || !/\\bbucket\\b|\\bhasMore\\b|\\bsampled\\b|\\bsort\\b/i.test(text);
    const overviewDensityModules = Array.from(sectionRoot?.querySelectorAll('[data-overview-density-module]') || []);
    const overviewDesktopDetail = sectionRoot?.querySelector('[data-overview-desktop-detail]');
    const overviewStatusBar = sectionRoot?.querySelector('[data-overview-status-bar]');
    const overviewVerdictPanel = sectionRoot?.querySelector('[data-overview-verdict-panel]');
    const overviewMainVerdict = sectionRoot?.querySelector('[data-overview-main-verdict]');
    const overviewIncidentLine = sectionRoot?.querySelector('[data-overview-incident-line]');
    const overviewAnomalyEvidence = sectionRoot?.querySelector('[data-overview-anomaly-evidence]');
    const overviewPriorityPanel = sectionRoot?.querySelector('[data-overview-priority-panel]');
    const overviewNextActions = sectionRoot?.querySelector('[data-overview-next-actions]');
    const overviewVerdictStatusBus = sectionRoot?.querySelector('[data-overview-verdict-status-bus]');
    const overviewVerdictText = normalize(overviewVerdictPanel?.textContent || '');
    const overviewMainVerdictRect = overviewMainVerdict?.getBoundingClientRect();
    const overviewIncidentLineRect = overviewIncidentLine?.getBoundingClientRect();
    const overviewDesktopRect = sectionRoot?.getBoundingClientRect();
    const overviewDesktopDetailText = normalize(overviewDesktopDetail?.textContent || '');
    const overviewMinDesktopHeight = Math.min(620, window.innerHeight * 0.68);
    const overviewDesktopDensityOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      overviewStatusBar &&
      overviewSummaryShell &&
      overviewSummaryMain &&
      overviewVerdictPanel &&
      overviewDesktopDetail &&
      overviewDensityModules.length >= 6 &&
      (sectionRoot.querySelector('[data-overview-density-module="wan-trend"]') || overviewFocusModule) &&
      sectionRoot.querySelector('[data-overview-density-module="wan-health"]') &&
      sectionRoot.querySelector('[data-overview-density-module="freshness"]') &&
      sectionRoot.querySelector('[data-overview-density-module="rank"]') &&
      (sectionRoot.querySelector('[data-overview-wan-mini-table]') || noSnapshotEdge || overviewSummaryFocus === 'no-snapshot') &&
      sectionRoot.querySelector('[data-overview-default-routes]') &&
      (sectionRoot.querySelector('[data-overview-anomaly-evidence]') || overviewFocusModule) &&
      sectionRoot.querySelector('[data-overview-incident-line]') &&
      text.length >= 1000 &&
      overviewDesktopRect &&
      overviewDesktopRect.height >= overviewMinDesktopHeight
    );
    const mobileAlert = sectionRoot?.querySelector('[data-overview-mobile-alert]');
    const mobileConsole = sectionRoot?.querySelector('[data-overview-mobile-console]');
    const mobileAlarm = sectionRoot?.querySelector('[data-overview-mobile-alarm]');
    const mobileIncident = sectionRoot?.querySelector('[data-overview-mobile-incident]');
    const mobileMetrics = sectionRoot?.querySelector('[data-overview-mobile-metrics]');
    const mobileWanTable = sectionRoot?.querySelector('[data-overview-mobile-wan-table]');
    const mobileAlertStyle = mobileAlert ? getComputedStyle(mobileAlert) : null;
    const mobileAlertText = normalize(mobileAlert?.textContent || '');
    const mobileAlertPrimaryText = normalize(mobileAlert?.querySelector('.ik-mobile-head-item.is-primary')?.textContent || '');
    const mobileIncidentTitle = mobileIncident?.querySelector('.ik-mobile-incident-title');
    const mobileIncidentTitleText = normalize(mobileIncidentTitle?.textContent || '');
    const mobileIncidentTitleLeadText = normalize(mobileIncident?.querySelector('.ik-mobile-incident-title > div:first-child')?.textContent || '');
    const mobileIncidentTitleSupportText = normalize(mobileIncident?.querySelector('.ik-mobile-incident-title > div:last-child')?.textContent || '');
    const mobileIncidentEvidenceRows = Array.from(mobileIncident?.querySelectorAll('.ik-mobile-incident-evidence > div') || [])
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0';
      })
      .map((node) => normalize(node.textContent || ''))
      .filter(Boolean);
    const mobileAlarmRect = mobileAlarm?.getBoundingClientRect();
    const mobileIncidentRect = mobileIncident?.getBoundingClientRect();
    const mobileMetricsRect = mobileMetrics?.getBoundingClientRect();
    const mobileWanTableRect = mobileWanTable?.getBoundingClientRect();
    const trustNotice = sectionRoot?.querySelector('[data-overview-trust-notice]');
    const trustNoticeStyle = trustNotice ? getComputedStyle(trustNotice) : null;
    const trustMode = sectionRoot?.querySelector('[data-overview-trust-mode]');
    const historyModeActive = trustMode?.getAttribute('data-overview-trust-mode') === 'history';
    const isMobileOverview = sectionName === 'overview' && window.innerWidth < 768;
    const overviewMobileAlertOk = sectionName !== 'overview' || window.innerWidth >= 768 || Boolean(
      mobileAlert &&
      mobileAlertStyle &&
      mobileAlertStyle.display !== 'none' &&
      mobileAlarmRect &&
      mobileAlarmRect.top < 120 &&
      mobileAlarmRect.height >= 36 &&
      mobileAlarmRect.height <= 72 &&
      !/异常\\s*\\d/.test(mobileAlertText) &&
      !mobileAlertText.includes('WAN 离线 0') &&
      (!historyModeActive || /当前影响未知|以下均为上次采样|历史快照\\s*\\S+|数据陈旧\\s*\\S+/.test(mobileAlertText)) &&
      (!/(部分离线|全部离线|默认路由异常|WAN 离线\\s*[1-9]\\d*\\s*条|离线\\s*[1-9]\\d*\\s*条)/.test(text) || /WAN 离线\\s*[1-9]\\d*\\s*条|离线\\s*[1-9]\\d*|默认路由异常|全部离线|部分离线|断网\\s*\\/\\s*路由不可达|WAN\\s*0\\/\\d+|WAN\\s*\\d+\\/\\d+/.test(mobileAlertText))
    );
    const overviewVerdictCompactOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      overviewMainVerdict &&
      overviewMainVerdictRect &&
      overviewMainVerdictRect.height >= 50 &&
      overviewMainVerdictRect.height <= 124 &&
      !/规则：|风险优先级|最大风险优先级/.test(normalize(overviewMainVerdict.textContent || '')) &&
      overviewVerdictStatusBus &&
      overviewNextActions &&
      normalize(overviewNextActions.textContent).includes('查看 WAN 状态') &&
      normalize(overviewNextActions.textContent).includes('查看采集状态') &&
      normalize(overviewNextActions.textContent).includes('查看路由表快照')
    );
    const overviewTerminologyOk = sectionName !== 'overview' || !/在线宽带|宽带状态|宽带聚合/.test(text);
    const historySnapshotTextCount = (text.match(/历史快照/g) || []).length;
    const overviewTrustCopyOk = sectionName !== 'overview' || (
      isEdgeScenario
        ? Boolean(
          /数据|采样|快照|业务数字/.test(text) &&
          text.includes('REST') &&
          text.includes('SSH') &&
          /采样新鲜|数据陈旧|未采集|当前不是实时数据|无可用快照|采集状态异常|接口全 Down|全部接口离线/.test(text)
        )
      : isMobileOverview
        ? Boolean(
          mobileConsole &&
          /数据|采样|快照/.test(text) &&
          (text.includes('未刷新') || text.includes('年龄') || text.includes('数据陈旧') || text.includes('当前影响未知') || text.includes('以下均为上次采样') || text.includes('历史快照') || text.includes('仅代表上次采样')) &&
          text.includes('REST') &&
          text.includes('SSH') &&
          (!historyModeActive || (text.includes('历史快照') && (text.includes('数据陈旧') || text.includes('当前影响未知') || text.includes('以下均为上次采样') || text.includes('仅代表上次采样'))))
        )
        : Boolean(
          overviewStatusBar &&
          (text.includes('采集时间') || text.includes('快照时间')) &&
          (text.includes('数据年龄') || text.includes('未刷新') || text.includes('年龄')) &&
          (!historyModeActive || (
            text.includes('历史快照') &&
            (text.includes('采集时间') || text.includes('快照时间')) &&
            text.includes('年龄') &&
            text.includes('仅代表') &&
            text.includes('REST') &&
            text.includes('SSH') &&
            trustNotice &&
            historyModeActive &&
            historySnapshotTextCount >= 1
          ))
        )
    );
    const trendCompact = sectionRoot?.querySelector('[data-overview-trend-compact]');
    const overviewTrendCompactOk = sectionName !== 'overview' || Boolean(
      !text.includes('采样不足') || (
        trendCompact &&
        normalize(trendCompact.textContent).includes('采样不足') &&
        normalize(trendCompact.textContent).includes('默认路由') &&
        normalize(trendCompact.textContent).includes('采集能力') &&
        !trendCompact.querySelector('.ik-wan-rate-chart')
      )
    );
    const overviewHistoryRealtimeCopyOk = sectionName !== 'overview' || !historyModeActive || !(
      /实时流量排行|实时上行|实时下行|当前在线|实时采集/.test(text)
    );
    const rankGrid = sectionRoot?.querySelector('[data-overview-rank-grid]');
    const rankHeaders = Array.from(rankGrid?.querySelectorAll('th') || []).map((node) => normalize(node.textContent));
    const rankRows = Array.from(rankGrid?.querySelectorAll('tbody tr') || []);
    const rankScrollerOverflow = Array.from(rankGrid?.querySelectorAll('.ops-table-wrap') || [])
      .map((node) => Math.round(node.scrollWidth - node.clientWidth))
      .filter((delta) => delta > 2);
    const overviewRankCompactOk = sectionName !== 'overview' || (
      noSnapshotEdge
        ? /未采集|无可用快照|RouterOS 当前不可达/.test(text)
        : Boolean(rankGrid &&
      rankHeaders.length === 6 &&
      rankRows.length <= 10 &&
      rankHeaders.filter((label) => label === '速率').length === 2 &&
      rankHeaders.filter((label) => label === '状态').length === 2 &&
      !rankHeaders.some((label) => /实时上行|实时下行|连接|角色/.test(label)) &&
      rankScrollerOverflow.length === 0)
    );
    const overviewWanDecisionOk = sectionName !== 'overview' || (
      noSnapshotEdge
        ? Boolean(/WAN 分组不可判定|无可用快照|RouterOS 当前不可达/.test(text))
        : isMobileOverview
        ? Boolean(text.includes('WAN') && (text.includes('默认路由') || text.includes('路由')) && (/离线|在线|未采集/.test(text)))
        : Boolean(
          (text.includes('WAN 线路') || text.includes('WAN 分组') || text.includes('WAN 状态表')) &&
          (text.includes('PPPoE') || /pppoe-/i.test(text)) &&
          (text.includes('DHCP') || scaleScenario === 'single') &&
          text.includes('默认路由')
        )
    );
    const overviewRiskSplitOk = sectionName !== 'overview' || (
      isMobileOverview
        ? Boolean(/风险|WAN|历史快照|数据陈旧|采样新鲜|无可用快照|资源满载|采集降级/.test(text) && text.includes('影响') && /数据|采样|快照|业务数字/.test(text) && text.includes('WAN'))
        : Boolean(
          overviewVerdictStatusBus &&
          overviewVerdictText.includes('风险') &&
          overviewVerdictText.includes('采集') &&
          overviewVerdictText.includes('影响范围') &&
          overviewVerdictText.includes('WAN 分组') &&
          (sectionRoot?.querySelector('[data-overview-density-module="wan-health"]') || text.includes('WAN 状态表')) &&
          (sectionRoot?.querySelector('[data-overview-density-module="freshness"]') || text.includes('采集新鲜度'))
        )
    );
    const overviewCapabilityDegradeOk = sectionName !== 'overview' || (
      noSnapshotEdge
        ? /REST 待确认|SSH 采集不可用|无可用快照|RouterOS 当前不可达/.test(text)
      : isMobileOverview
        ? Boolean(text.includes('REST') && text.includes('SSH') && /SSH (可用|上次可用|依赖缺失|当前缺依赖|当前不可用|不可用|采集不可用)/.test(text))
        : Boolean(
          ((text.includes('REST 状态') && text.includes('SSH 状态')) || text.includes('采集可信') || text.includes('数据可信条')) &&
          text.includes('REST') &&
          text.includes('SSH') &&
          /SSH (可用|上次可用|依赖缺失|当前缺依赖|当前不可用|不可用|采集不可用)/.test(text)
        )
    );
    const readonlyNav = sectionRoot?.querySelector('.readonly-feature-nav');
    const readonlyDefaultLinks = Array.from(readonlyNav?.querySelectorAll(':scope > .readonly-feature-link') || []);
    const readonlyDefaultLabels = readonlyDefaultLinks.map((node) => normalize(node.textContent));
    const readonlyAdvancedNav = readonlyNav?.querySelector('details.readonly-advanced-nav');
    const readonlyPublicNavOk = sectionName !== 'readonlyDiagnostics' || Boolean(
      readonlyNav &&
      readonlyDefaultLinks.length === 5 &&
      readonlyDefaultLabels.some((label) => label.includes('采集状态')) &&
      readonlyDefaultLabels.some((label) => label.includes('DNS 状态')) &&
      readonlyDefaultLabels.some((label) => label.includes('线路状态')) &&
      readonlyDefaultLabels.some((label) => label.includes('终端状态')) &&
      readonlyDefaultLabels.some((label) => label.includes('日志状态')) &&
      !readonlyAdvancedNav &&
      !/内部目录|关注排序|证据来源|归属规则|诊断/.test(normalize(readonlyNav.textContent))
    );
    const scaleHeightOk = scenario !== 'fleet' || isCurrent35Shell || (
      sectionName === 'overview' ? scrollHeight <= 3000 :
      sectionName === 'trafficLoad' ? scrollHeight <= 10000 :
      !detailSections.has(sectionName) || scrollHeight <= 6200
    );
    const rail = rectOf('.ik-rail');
    const sidebar = rectOf('.sidebar');
    const frame = rectOf('.frame');
    const topbar = rectOf('.topbar');
    const content = rectOf('.content');
    const sectionRect = sectionRoot ? (() => {
      const rect = sectionRoot.getBoundingClientRect();
      return { width: Math.round(rect.width), left: Math.round(rect.left), right: Math.round(rect.right) };
    })() : null;
    const minOverviewUsableWidth = window.innerWidth < 768 ? Math.max(320, window.innerWidth - 24) : 640;
    const overviewUsableWidthOk = sectionName !== 'overview' || Boolean(
      frame &&
      (topbar || isMobileOverview) &&
      content &&
      sectionRect &&
      frame.width >= minOverviewUsableWidth &&
      (isMobileOverview && topbar?.display === 'none' ? true : topbar.width >= minOverviewUsableWidth) &&
      content.width >= minOverviewUsableWidth &&
      sectionRect.width >= minOverviewUsableWidth
    );
    const nodeVisibleInFirstScreen = (node) => {
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    };
    const overviewFieldNodes = Array.from(sectionRoot?.querySelectorAll([
      '[data-overview-field]',
      '.ik-summary-box',
      '.freshness-item',
      '.ik-home-mini-table th',
      '.ik-home-mini-table td',
      '.ik-home-rank-table th',
      '.ik-home-rank-table td',
      '.ik-mobile-head-item',
      '.ik-mobile-incident-title',
      '.ik-mobile-incident-evidence div',
      '.ik-mobile-metric-title',
      '.ik-mobile-metric-main',
      '.ik-mobile-metric-sub',
      '.ik-mobile-section-head',
      '.ik-mobile-wan-row > *',
      '.ik-mobile-detail-row > *',
      '.ik-mobile-terminal-row > *',
      '.ik-mobile-device-line'
    ].join(',')) || []);
    const overviewFirstScreenFieldCount = overviewFieldNodes.filter(nodeVisibleInFirstScreen).length;
    const minOverviewFirstScreenFields = sectionName !== 'overview'
      ? 0
      : window.innerWidth < 768
        ? 45
        : isEdgeScenario
          ? (noSnapshotEdge ? 44 : 64)
        : scenario === 'fleet'
          ? 64
          : 64;
    const overviewFirstScreenFieldsOk = sectionName !== 'overview' || overviewFirstScreenFieldCount >= minOverviewFirstScreenFields;
    const firstScreenOverviewText = Array.from(sectionRoot?.querySelectorAll([
      '[data-overview-field]',
      '[data-overview-mobile-alert]',
      '[data-overview-incident-line]',
      '.notice.danger',
      '.ik-home-operator-card'
    ].join(',')) || [])
      .filter(nodeVisibleInFirstScreen)
      .map((node) => normalize(node.textContent || ''))
      .join(' ');
    const overviewMobileCoreOk = sectionName !== 'overview' || window.innerWidth >= 768 || Boolean(
      /风险|异常|数据陈旧|历史快照|无可用快照|资源满载|资源高负载|采集降级/.test(firstScreenOverviewText) &&
      /WAN/.test(firstScreenOverviewText) &&
      /资源|CPU|内存/.test(firstScreenOverviewText) &&
      /采集|REST|SSH/.test(firstScreenOverviewText)
    );
    const mobileTop120Text = Array.from(sectionRoot?.querySelectorAll([
      '[data-overview-field]',
      '[data-overview-mobile-alert]',
      '[data-overview-mobile-incident]',
      '.notice.danger'
    ].join(',')) || [])
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.top < 120 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0';
      })
      .map((node) => normalize(node.textContent || ''))
      .join(' ');
    const classifyEdgeEvidenceCategory = (value) => {
      const textValue = normalize(value);
      const categories = [
        {
          category: 'collection',
          patterns: [/快照证据/, /无可用快照/, /RouterOS 当前不可达/, /业务数字不可判定/, /当前不可判定/, /采集证据/, /采集断链/, /采集降级/, /采集失败/, /采集不可用/, /非实时需复核/, /当前影响未知/],
        },
        {
          category: 'resource',
          patterns: [/资源证据/, /资源满载/, /资源高负载/, /CPU/, /内存/, /磁盘/, /连接压力/, /资源/],
        },
        {
          category: 'wan',
          patterns: [/WAN 证据/, /WAN.*全离线/, /WAN 全离线/, /WAN 全部离线/, /全部 WAN 离线/, /WAN 离线/, /默认路由异常/, /路由不可达/, /接口全 Down/, /全部接口离线/],
        },
      ];
      let bestCategory = '';
      let bestIndex = Number.POSITIVE_INFINITY;
      for (const entry of categories) {
        for (const pattern of entry.patterns) {
          const index = textValue.search(pattern);
          if (index >= 0 && index < bestIndex) {
            bestCategory = entry.category;
            bestIndex = index;
          }
        }
      }
      return bestCategory;
    };
    const expectedEdgeEvidenceCategory = scaleScenario === 'resource-full'
      ? 'resource'
      : scaleScenario === 'all-offline'
        ? 'wan'
        : (scaleScenario === 'collection-down' || scaleScenario === 'no-snapshot')
          ? 'collection'
          : 'wan';
    const overviewFirstEvidenceNode = isMobileOverview
      ? (mobileIncidentTitle?.querySelector(':scope > div:first-child') || mobileIncident)
      : (
        overviewFocusModule?.querySelector('.card-title') ||
        overviewFocusModule ||
        overviewSummaryMain?.querySelector('.ik-summary-box.is-danger, .ik-summary-box.is-warn, .ik-summary-box') ||
        overviewDesktopTopShell ||
        overviewMainVerdict?.querySelector('.ik-home-verdict-title > div:nth-child(2)') ||
        overviewIncidentLine?.querySelector('.ik-home-incident-main > div:nth-child(2)') ||
        overviewMainVerdict
      );
    const overviewFirstEvidenceText = normalize(overviewFirstEvidenceNode?.textContent || overviewVerdictText);
    const overviewFirstEvidenceCategory = classifyEdgeEvidenceCategory(overviewFirstEvidenceText);
    const overviewFirstEvidenceCategoryOk = sectionName !== 'overview' || !edgeScenarios.has(scaleScenario) || overviewFirstEvidenceCategory === expectedEdgeEvidenceCategory;
    const expectedRiskEvidenceText = [
      overviewFirstEvidenceText,
      mobileIncidentTitleText,
      mobileIncidentEvidenceRows.join(' '),
      overviewDesktopDetailText,
    ].join(' ');
    const overviewHighestRiskEvidenceMatchOk = sectionName !== 'overview' || !edgeScenarios.has(scaleScenario) || Boolean(
      scaleScenario === 'resource-full'
        ? (
          overviewFirstEvidenceCategory === 'resource' &&
          /资源证据|资源满载|资源高负载/.test(expectedRiskEvidenceText) &&
          /CPU.*96/.test(expectedRiskEvidenceText) &&
          /内存.*92/.test(expectedRiskEvidenceText) &&
          /磁盘.*97/.test(expectedRiskEvidenceText) &&
          /连接/.test(expectedRiskEvidenceText)
        )
        : scaleScenario === 'collection-down'
          ? (
            overviewFirstEvidenceCategory === 'collection' &&
            /采集证据|采集降级|REST|SSH/.test(expectedRiskEvidenceText) &&
            /失败端点|失败|不可用|断链|待确认/.test(expectedRiskEvidenceText)
          )
          : scaleScenario === 'no-snapshot'
            ? (
              overviewFirstEvidenceCategory === 'collection' &&
              /采集证据|采集断链|无可用快照/.test(expectedRiskEvidenceText) &&
              /RouterOS 当前不可达/.test(expectedRiskEvidenceText) &&
              /业务数字不可判定|所有业务数字不可判定/.test(expectedRiskEvidenceText)
            )
            : scaleScenario === 'all-offline'
              ? (
                overviewFirstEvidenceCategory === 'wan' &&
                /WAN.*离线|WAN.*全离线|离线对象/.test(expectedRiskEvidenceText)
              )
              : true
    );
    const primaryConclusionNodes = Array.from(sectionRoot?.querySelectorAll('[data-overview-primary-conclusion]') || [])
      .filter(nodeVisibleInFirstScreen);
    const compactPrimaryText = mobileAlertPrimaryText.replace(/\s+/g, '');
    const compactIncidentTitleText = mobileIncidentTitleText.replace(/\s+/g, '');
    const overviewMobileUniqueVerdictOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      mobileAlert &&
      mobileIncident &&
      mobileAlertPrimaryText &&
      mobileIncidentTitleText &&
      primaryConclusionNodes.length === 1 &&
      compactIncidentTitleText !== compactPrimaryText &&
      !/当前状态|最高业务风险|当前最高/.test(mobileIncidentTitleText) &&
      !/处置：/.test(mobileIncidentTitleText) &&
      /WAN 证据|路由证据|设备证据|资源证据|采集证据|快照证据|证据：|离线对象|默认路由快照摘要|建议查看：/.test(mobileIncidentTitleText)
    );
    const overviewMobileEvidenceTitleOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      mobileIncident &&
      mobileIncidentTitle &&
      mobileIncidentTitleText &&
      primaryConclusionNodes.length === 1 &&
      !/处置：/.test(mobileIncidentTitleText) &&
      compactIncidentTitleText !== compactPrimaryText
    );
    const readonlyBoundaryNodes = Array.from(document.querySelectorAll('[data-readonly-info-open]'))
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          content &&
          rect.left >= content.left - 8 &&
          rect.right <= content.right + 8;
      });
    const overviewMainAlertRect = window.innerWidth < 768 ? mobileAlarmRect : overviewMainVerdictRect;
    const overviewFirstEvidenceRect = window.innerWidth < 768 ? mobileIncidentRect : overviewIncidentLineRect;
    const overviewReadOnlyBoundaryOk = sectionName !== 'overview' || !overviewMainAlertRect || !overviewFirstEvidenceRect || readonlyBoundaryNodes.every((node) => {
      const rect = node.getBoundingClientRect();
      return rect.bottom <= overviewMainAlertRect.top || rect.top >= overviewFirstEvidenceRect.bottom;
    });
    const priorityLabels = Array.from(sectionRoot?.querySelectorAll('[data-overview-priority]') || [])
      .map((node) => normalize(node.textContent || ''));
    const activePriorityLabels = Array.from(sectionRoot?.querySelectorAll('[data-overview-priority].is-active') || [])
      .map((node) => normalize(node.textContent || ''));
    const priorityOrderOk = priorityLabels.length >= 6 &&
      priorityLabels[0] === '无可用快照' &&
      priorityLabels[1] === '默认路由异常' &&
      /^WAN (全)?离线$/.test(priorityLabels[2]) &&
      /^资源(满载|高负载)$/.test(priorityLabels[3]) &&
      priorityLabels[4] === '采集降级' &&
      /^采样(新鲜|偏旧|陈旧)$/.test(priorityLabels[5]);
    const overviewProductVerdictOk = sectionName !== 'overview' || Boolean(
      overviewVerdictPanel &&
      overviewMainVerdict &&
      overviewPriorityPanel &&
      priorityOrderOk &&
      activePriorityLabels.length >= 1 &&
      /正常|WAN|无可用快照|资源满载|资源高负载|采集降级|默认路由异常|采样/.test(overviewVerdictText) &&
      /风险/.test(overviewVerdictText) &&
      /时效/.test(overviewVerdictText) &&
      /当前不是实时数据|采样新鲜|采样偏旧|采样陈旧|数据陈旧|历史快照/.test(overviewVerdictText) &&
      /采集/.test(overviewVerdictText) &&
      overviewVerdictStatusBus &&
      /证据：/.test(overviewVerdictText) &&
      /WAN 分组/.test(overviewVerdictText) &&
      /默认路由/.test(overviewVerdictText) &&
      /影响范围/.test(overviewVerdictText) &&
      overviewNextActions &&
      normalize(overviewNextActions.textContent).includes('查看 WAN 状态') &&
      normalize(overviewNextActions.textContent).includes('查看采集状态') &&
      normalize(overviewNextActions.textContent).includes('查看路由表快照')
    );
    const overviewEvidenceChainOk = sectionName !== 'overview' || Boolean(
      /证据：/.test(overviewVerdictText) &&
      /默认路由/.test(overviewVerdictText) &&
      /影响范围/.test(overviewVerdictText) &&
      /WAN 分组/.test(overviewVerdictText) &&
      /采样|快照|RouterOS 当前不可达|CPU|WAN/.test(overviewFirstEvidenceText + ' ' + text) &&
      (
        sectionRoot?.querySelector('[data-overview-anomaly-evidence]') ||
        overviewFocusModule ||
        sectionRoot?.querySelector('[data-overview-default-routes]')
      )
    );
    const overviewMobileProductVerdictOk = sectionName !== 'overview' || window.innerWidth >= 768 || (
      isEdgeScenario
        ? Boolean(
          /断网|路由不可达|无可用快照|默认路由异常|WAN 全离线|WAN 离线|采集降级|采集不可用|资源高负载|资源满载/.test(mobileTop120Text + ' ' + topErrorNoticeText + ' ' + mobileIncidentTitleText) &&
          /数据陈旧|采样新鲜|未采集|无可用快照/.test(firstScreenOverviewText + ' ' + mobileTop120Text + ' ' + topErrorNoticeText) &&
          /REST|SSH|采集/.test(firstScreenOverviewText + ' ' + mobileTop120Text + ' ' + topErrorNoticeText + ' ' + mobileIncidentEvidenceRows.join(' ')) &&
          (mobileAlarmRect || topErrorNoticeVisible)
        )
      : Boolean(
          /WAN|数据陈旧|历史快照|资源高负载|采集降级|默认路由/.test(mobileTop120Text) &&
          /数据陈旧|采样新鲜|采样偏旧|采样陈旧|历史快照/.test(mobileTop120Text) &&
          /采集状态|采集可信|REST|SSH/.test(firstScreenOverviewText) &&
          /影响/.test(firstScreenOverviewText) &&
          !/处置：/.test(mobileIncidentTitleText) &&
          /WAN 证据|路由证据|设备证据|资源证据|采集证据|快照证据|证据：|离线对象|默认路由快照摘要/.test(mobileIncidentTitleText) &&
          /建议查看/.test(firstScreenOverviewText) &&
          mobileAlarmRect &&
          mobileAlarmRect.height <= 72 &&
          mobileIncidentRect &&
          mobileIncidentRect.top < 130
        )
    );
    const edgeScenarioText = [overviewVerdictText, firstScreenOverviewText, mobileTop120Text, topErrorNoticeText].join(' ');
    const overviewEdgeScenarioOk = sectionName !== 'overview' || !edgeScenarios.has(scaleScenario) || Boolean(
      scaleScenario === 'all-offline'
          ? overviewFirstEvidenceCategory === 'wan' &&
          /WAN.*全离线|WAN 离线/.test(edgeScenarioText) &&
          /默认路由不可用|未发现活动默认路由/.test(edgeScenarioText) &&
          !/当前影响低|影响低|未见线路影响/.test(edgeScenarioText)
        : scaleScenario === 'no-snapshot'
          ? activePriorityLabels.includes('无可用快照') &&
            /无可用快照|RouterOS 当前不可达|业务数字不可判定/.test(overviewVerdictText) &&
            !/上次采样|以下均为上次采样/.test(firstScreenOverviewText + ' ' + mobileTop120Text) &&
            /接口全 Down|全部接口离线/.test(overviewVerdictText) === false
          : scaleScenario === 'collection-down'
            ? activePriorityLabels.includes('采集降级') &&
              /采集降级|采集失败|SSH 采集不可用|REST/.test(overviewVerdictText) &&
              /当前不是实时数据|采样新鲜/.test(overviewVerdictText)
            : scaleScenario === 'resource-full'
              ? /资源满载|资源高负载/.test(activePriorityLabels.join(' ')) &&
                /资源满载|资源高负载/.test(overviewVerdictText) &&
                /CPU 96/.test(text) &&
                /内存 92/.test(text) &&
                /磁盘 97/.test(text)
              : overviewFirstEvidenceCategory === 'wan' &&
                /WAN.*全离线|接口全 Down|全部接口离线|路由不可达/.test(edgeScenarioText)
    );
    const overviewMobileArchitectureOk = sectionName !== 'overview' || window.innerWidth >= 768 || Boolean(
      mobileConsole &&
      mobileMetrics &&
      (mobileWanTable || mobileIncident || isEdgeScenario) &&
      (
        isEdgeScenario
          ? Boolean(
            (mobileAlarm || topErrorNotice) &&
            (mobileAlertStyle?.display !== 'none' || topErrorNoticeVisible || mobileAlarmRect) &&
            (mobileAlarmRect || topErrorNoticeRect) &&
            /WAN 全部离线|WAN 全离线|无可用快照|采集状态异常|接口全 Down|全部接口离线|资源高负载|资源满载|采集降级|断网|默认路由异常/.test(firstScreenOverviewText + ' ' + topErrorNoticeText + ' ' + mobileTop120Text + ' ' + mobileIncidentTitleText) &&
            (expectedEdgeEvidenceCategory !== 'wan' || /WAN/.test(mobileTop120Text + ' ' + mobileIncidentTitleText + ' ' + mobileIncidentEvidenceRows.join(' ')))
          )
          : Boolean(
            mobileAlarm &&
            mobileIncident &&
            mobileAlertStyle?.display !== 'none' &&
            mobileAlarmRect &&
            mobileIncidentRect &&
            mobileMetricsRect &&
            mobileAlarmRect.top < 120 &&
            mobileAlarmRect.height <= 72 &&
            mobileIncidentRect.top >= mobileAlarmRect.top &&
            mobileIncidentRect.top < mobileMetricsRect.top &&
            /WAN|历史快照|数据陈旧|采样陈旧|资源高负载|采集降级|默认路由/.test(firstScreenOverviewText) &&
            /WAN/.test(mobileTop120Text) &&
            /数据陈旧|历史快照|采样新鲜|采样陈旧|默认路由异常|部分离线|全部离线|WAN 离线/.test(mobileTop120Text) &&
            /REST/.test(firstScreenOverviewText) &&
            /SSH/.test(firstScreenOverviewText) &&
            (!trustNoticeStyle || trustNoticeStyle.display === 'none')
          )
      )
    );
    const snapshotForEvidence = window.__PANEL_TEST_SNAPSHOT__ || {};
    const evidenceWanRows = Array.isArray(snapshotForEvidence.wan) && snapshotForEvidence.wan.length
      ? snapshotForEvidence.wan
      : (Array.isArray(snapshotForEvidence.pppoe) ? snapshotForEvidence.pppoe : []);
    const expectedOfflineNames = evidenceWanRows
      .filter((row) => row && row.running === false)
      .slice(0, 3)
      .map((row) => String(row.name || row.interface || '').trim())
      .filter(Boolean);
    const visibleAnomalyNames = Array.from(sectionRoot?.querySelectorAll('[data-overview-anomaly-object]') || [])
      .filter(nodeVisibleInFirstScreen)
      .map((node) => String(node.getAttribute('data-overview-anomaly-object') || '').trim())
      .filter(Boolean);
    const overviewAnomalyEvidenceOk = sectionName !== 'overview' || expectedOfflineNames.length < 3 || Boolean(
      expectedOfflineNames.every((name) => text.includes(name)) &&
      visibleAnomalyNames.length >= 3
    );
    const historyLiveGreenTags = Array.from(sectionRoot?.querySelectorAll('.tag.ok') || [])
      .filter(nodeVisibleInFirstScreen)
      .map((node) => normalize(node.textContent))
      .filter((label) => /在线|正常|实时|活动/.test(label));
    const staleSignalText = [
      firstScreenOverviewText,
      mobileTop120Text,
      topErrorNoticeText,
    ].join(' ');
    const staleLikeModeActive = historyModeActive || (noSnapshotEdge && /无可用快照/.test(staleSignalText)) || /历史快照数据陈旧|数据状态\s*(历史快照\s*)?数据陈旧|当前不是实时数据|数据陈旧\s+未采集/.test(staleSignalText);
    const overviewHistoryNoLiveGreenOk = sectionName !== 'overview' || !staleLikeModeActive || historyLiveGreenTags.length === 0;
    const selectorForNode = (node) => {
      if (!node) return '';
      if (node.id) return '#' + node.id;
      const dataKey = Array.from(node.attributes || []).find((attr) => /^data-overview/.test(attr.name));
      if (dataKey) return '[' + dataKey.name + ']';
      const cls = Array.from(node.classList || []).slice(0, 3).join('.');
      return node.tagName.toLowerCase() + (cls ? '.' + cls : '');
    };
    const firstScreenNodes = Array.from(sectionRoot?.querySelectorAll([
      '[data-overview-field]',
      '[data-overview-mobile-alert]',
      '[data-overview-mobile-incident]',
      '[data-overview-mobile-metrics]',
      '[data-overview-mobile-wan-table]',
      '[data-overview-mobile-detail]',
      '.ik-mobile-head-item',
      '.ik-mobile-incident-title',
      '.ik-mobile-incident-evidence div',
      '.ik-mobile-metric',
      '.ik-mobile-metric-main',
      '.ik-mobile-metric-sub',
      '.ik-mobile-wan-row > *',
      '.ik-mobile-detail-row > *',
      '.ik-mobile-device-line'
    ].join(',')) || []).filter(nodeVisibleInFirstScreen);
    const ellipsisSamples = firstScreenNodes
      .map((node) => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        const clipped = (style.textOverflow === 'ellipsis' && node.scrollWidth > node.clientWidth + 2) ||
          (style.overflow === 'hidden' && node.scrollHeight > node.clientHeight + 2);
        return clipped ? {
          selector: selectorForNode(node),
          text: normalize(node.textContent || '').slice(0, 80),
          width: Math.round(rect.width),
          scrollWidth: Math.round(node.scrollWidth),
          height: Math.round(rect.height),
          scrollHeight: Math.round(node.scrollHeight),
        } : null;
      })
      .filter(Boolean);
    const overviewFirstScreenEllipsisCount = ellipsisSamples.length;
    const overviewFirstScreenEllipsisOk = sectionName !== 'overview' || !isMobileOverview || overviewFirstScreenEllipsisCount <= 3;
    const criticalEllipsisSamples = ellipsisSamples.filter((sample) => /mobile-alert|mobile-incident|main-verdict|anomaly|wan-row|metric-main|metric-sub/.test(sample.selector));
    const overviewCriticalEllipsisOk = sectionName !== 'overview' || criticalEllipsisSamples.length === 0;
    const collectVisibleClippedTextSamples = (nodes) => {
      const seen = new Set();
      const samples = [];
      for (const node of nodes || []) {
        if (!node || seen.has(node) || !nodeVisibleInFirstScreen(node)) continue;
        seen.add(node);
        const style = getComputedStyle(node);
        const clipped = (
          (style.textOverflow === 'ellipsis' && node.scrollWidth > node.clientWidth + 2) ||
          (style.overflow === 'hidden' && node.scrollHeight > node.clientHeight + 2) ||
          (style.whiteSpace === 'nowrap' && node.scrollWidth > node.clientWidth + 2)
        );
        if (clipped) samples.push(normalize(node.textContent || '').slice(0, 120));
      }
      return samples;
    };
    const overviewStatusBarCells = Array.from(overviewStatusBar?.querySelectorAll('[data-overview-field]') || []);
    const overviewStatusBarVisibleCells = overviewStatusBarCells.filter(nodeVisibleInFirstScreen);
    const overviewStatusBusCells = Array.from(overviewVerdictStatusBus?.querySelectorAll('[data-overview-status-cell]') || []);
    const overviewStatusBusVisibleCells = overviewStatusBusCells.filter(nodeVisibleInFirstScreen);
    const overviewStatusBusText = normalize(overviewVerdictStatusBus?.textContent || '');
    const overviewSummaryBoxText = normalize(overviewSummaryMain?.textContent || '');
    const overviewDesktopCriticalTextSamples = !isDesktopOverview ? [] : collectVisibleClippedTextSamples([
      overviewMainVerdict,
      ...Array.from(overviewMainVerdict?.querySelectorAll('.ik-home-verdict-title, .ik-home-verdict-status-bus, .ik-home-verdict-status-cell, .ik-home-verdict-row, .ik-home-action-link, .ik-home-priority-item, [data-overview-field]') || []),
      overviewIncidentLine,
      ...Array.from(overviewIncidentLine?.querySelectorAll('.ik-home-incident-main, .ik-home-incident-item, [data-overview-field]') || []),
      overviewAnomalyEvidence,
      ...Array.from(overviewAnomalyEvidence?.querySelectorAll('.ik-home-evidence-empty, .ik-home-evidence-row, .ik-home-evidence-row b, .ik-home-evidence-row span, [data-overview-field]') || [])
    ]);
    const overviewDefaultRouteRows = Array.from(sectionRoot?.querySelectorAll('[data-overview-default-route-row]') || []);
    const overviewWanDetailRows = Array.from(sectionRoot?.querySelectorAll('[data-overview-wan-detail-row]') || []);
    const overviewStatusBusTripletOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      (
        overviewDesktopTopShell &&
        overviewSummaryMain &&
        overviewSummaryBoxText.includes('WAN') &&
        overviewSummaryBoxText.includes('采集') &&
        overviewSummaryBoxText.includes('资源') &&
        overviewSummaryBoxText.includes('证据摘要')
      ) ||
      (
        overviewVerdictStatusBus &&
        overviewStatusBusCells.length === 3 &&
        overviewStatusBusVisibleCells.length === 3 &&
        (overviewStatusBusText.includes('最高风险') || overviewStatusBusText.includes('风险')) &&
        (overviewStatusBusText.includes('数据状态') || overviewStatusBusText.includes('时效')) &&
        (overviewStatusBusText.includes('采集状态') || overviewStatusBusText.includes('采集'))
      )
    );
    const overviewDesktopCoreTextOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      overviewDesktopTopShell &&
      overviewSummaryMain &&
      (overviewAnomalyEvidence || overviewFocusModule) &&
      overviewDesktopPrimary &&
      overviewDesktopTopText &&
      overviewDesktopCriticalTextSamples.length === 0
    );
    const overviewDesktopTopConclusionUniqueOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      overviewDesktopTopShell &&
      overviewDesktopPrimary &&
      countOccurrences(overviewDesktopTopText, normalize(overviewDesktopPrimary.textContent || '')) === 1 &&
      countOccurrences(overviewDesktopTopText, '查看 WAN 状态') === 1 &&
      countOccurrences(overviewDesktopTopText, '查看采集状态') === 1 &&
      countOccurrences(overviewDesktopTopText, '查看路由表快照') === 1
    );
    const overviewDesktopEvidenceRows = Array.from(overviewAnomalyEvidence?.querySelectorAll('.ik-home-evidence-row:not(.is-head)') || [])
      .filter(nodeVisibleInFirstScreen)
      .map((node) => normalize(node.textContent || ''))
      .filter(Boolean);
    const overviewDesktopEvidenceUniqueOk = sectionName !== 'overview' || !isDesktopOverview || new Set(overviewDesktopEvidenceRows).size === overviewDesktopEvidenceRows.length;
    const combinedOverviewText = [overviewVerdictText, firstScreenOverviewText, mobileTop120Text, topErrorNoticeText].join(' ');
    const staleCopyActive = historyModeActive || /历史快照数据陈旧|当前不是实时数据|数据状态\s*历史快照|数据陈旧\s*\d/.test(combinedOverviewText);
    const staleForbiddenImpact = staleCopyActive && /当前影响低|(?<!上次采样)影响低|(?<!上次采样)未见线路影响/.test(combinedOverviewText);
    const staleHardCopy = !staleCopyActive || /当前影响未知|以下均为上次采样|不可判定|按降级处理|非实时需复核|需复核后放行|仅供定位|仅代表上次采样/.test(combinedOverviewText);
    const overviewStaleDataImpactOk = sectionName !== 'overview' || (!staleForbiddenImpact && staleHardCopy);
    const overviewHistoryPromptVisibleText = [firstScreenOverviewText, mobileTop120Text].join(' ');
    const overviewHistoryFirstScreenPromptOk = sectionName !== 'overview' || !(historyModeActive || staleCopyActive) || Boolean(
      /\u5386\u53f2\u5feb\u7167/.test(overviewHistoryPromptVisibleText) &&
      /(\u6570\u636e\u9648\u65e7|\u5f53\u524d\u4e0d\u662f\u5b9e\u65f6\u6570\u636e|\u672a\u5237\u65b0|\u4e0a\u6b21\u91c7\u6837|\u4ec5\u4ee3\u8868\u4e0a\u6b21\u91c7\u6837)/.test(overviewHistoryPromptVisibleText)
    );
    const overviewFreshnessFreshSampleOk = sectionName !== 'overview' || Boolean(
      !/数据新鲜|当前数据新鲜/.test(firstScreenOverviewText) &&
      (!/新鲜/.test(firstScreenOverviewText) || /采样新鲜/.test(firstScreenOverviewText))
    );
    const defaultRouteSnapshotText = [firstScreenOverviewText, mobileTop120Text, overviewDesktopDetailText].join(' ');
    const overviewDefaultRouteSnapshotSemanticsOk = sectionName !== 'overview' || !(historyModeActive || staleCopyActive) || !/\u9ed8\u8ba4\u8def\u7531/.test(defaultRouteSnapshotText) || Boolean(
      /(\u5386\u53f2\u5feb\u7167|\u4e0a\u6b21\u91c7\u6837|\u4ec5\u4ee3\u8868\u4e0a\u6b21\u91c7\u6837|\u672a\u5237\u65b0)/.test(defaultRouteSnapshotText)
    );
    const overviewNoSnapshotSemanticOk = sectionName !== 'overview' || !noSnapshotEdge || Boolean(
      /无可用快照/.test(combinedOverviewText) &&
      /RouterOS 当前不可达/.test(combinedOverviewText) &&
      /业务数字不可判定|当前不可判定|非实时需复核/.test(combinedOverviewText) &&
      !/上次采样|以下均为上次采样/.test(combinedOverviewText)
    );
    const overviewMobileDispositionOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      !/\u5904\u7f6e\uff1a/.test(mobileIncidentTitleText) &&
      /^(WAN|路由|设备|资源|采集|快照)? ?证据/.test(mobileIncidentTitleLeadText) &&
      mobileIncidentTitleSupportText &&
      !mobileIncidentTitleSupportText.startsWith('\u5904\u7f6e\uff1a') &&
      /(\u79bb\u7ebf\u5bf9\u8c61|\u9ed8\u8ba4\u8def\u7531|RouterOS|CPU|REST|SSH|无可用快照|采样|连接|main)/.test(mobileIncidentTitleSupportText) &&
      /\u5efa\u8bae\u67e5\u770b/.test(normalize(mobileIncident?.textContent || '')) &&
      !/\u5efa\u8bae\u67e5\u770b\s+\u5efa\u8bae\u67e5\u770b\uff1a/.test(normalize(mobileIncident?.textContent || ''))
    );
    const overviewMobileEvidenceUniqueOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      mobileIncidentEvidenceRows.length >= 4 &&
      new Set(mobileIncidentEvidenceRows).size === mobileIncidentEvidenceRows.length
    );
    const overviewHistoryStrongPromptOk = sectionName !== 'overview' || !(historyModeActive || staleCopyActive) || Boolean(
      /当前影响未知|当前不可判定|非实时需复核|历史快照|采样陈旧/.test(combinedOverviewText) &&
      /(以下均为上次采样|仅代表上次采样|业务数字仅代表上次采样|仅供复核)/.test(combinedOverviewText)
    );
    const wanOfflineCountPhraseMatches = combinedOverviewText.match(/WAN 离线\s*[1-9]\d*\s*条/g) || [];
    const overviewEvidenceLayeringOk = sectionName !== 'overview' || Boolean(
      !/处置：/.test(combinedOverviewText) &&
      !/WAN 证据(?:链)?\s*WAN 离线\s*[1-9]\d*\s*条/.test(combinedOverviewText) &&
      wanOfflineCountPhraseMatches.length <= 1
    );
    const overviewRouteSnapshotCopyOk = sectionName !== 'overview' || Boolean(
      /默认路由快照摘要|路由表快照|路由快照摘要/.test(combinedOverviewText) &&
      (!isDesktopOverview || overviewDefaultRouteRows.length > 0 || /未采集到路由表快照/.test(defaultRouteSnapshotText))
    );
    const totalWanCount = evidenceWanRows.length;
    const offlineWanCount = evidenceWanRows.filter((row) => row && row.running === false).length;
    const overviewAllWanOfflineSummaryOk = sectionName !== 'overview' || scaleScenario !== 'all-offline' || Boolean(
      totalWanCount > 0 &&
      offlineWanCount === totalWanCount &&
      /WAN 全离线|WAN 全部离线|全部 WAN 离线|WAN 离线/.test(combinedOverviewText) &&
      new RegExp('WAN\\\\s*0\\\\s*/\\\\s*' + totalWanCount).test(combinedOverviewText) &&
      /默认路由不可用|未发现活动默认路由|默认路由异常/.test(combinedOverviewText) &&
      !/当前影响低|(?<!上次采样)影响低|(?<!上次采样)未见线路影响/.test(combinedOverviewText)
    );
    const overviewResourceFullIncidentOk = sectionName !== 'overview' || scaleScenario !== 'resource-full' || Boolean(
      /资源满载|资源高负载/.test(combinedOverviewText) &&
      /CPU.*96/.test(combinedOverviewText) &&
      /内存.*92/.test(combinedOverviewText) &&
      /磁盘.*97/.test(combinedOverviewText) &&
      /连接|活动/.test(combinedOverviewText)
    );
    let overviewMobileEffectiveCoverageOk = true;
    let overviewMobileEffectiveCoverageProbe = null;
    if (sectionName === 'overview' && isMobileOverview && sectionRoot) {
      const rect = sectionRoot.getBoundingClientRect();
      const left = Math.max(0, rect.left);
      const right = Math.min(window.innerWidth, rect.right);
      const top = Math.max(0, rect.top);
      const bottom = window.innerHeight;
      const contentSelector = [
        '[data-overview-mobile-alert]',
        '[data-overview-mobile-incident]',
        '[data-overview-mobile-metrics]',
        '[data-overview-mobile-wan-table]',
        '[data-overview-mobile-detail]',
        '[data-overview-mobile-detail-section]',
        '.ik-mobile-console',
        '.ik-mobile-compact-section',
        '.ik-mobile-detail-row',
        '.ik-mobile-wan-row',
        '.ik-mobile-metric',
        '.ik-mobile-device-line',
        '.tag'
      ].join(',');
      let filled = 0;
      let total = 0;
      const columns = 10;
      const rows = 18;
      for (let yi = 0; yi < rows; yi += 1) {
        const y = top + ((bottom - top) * (yi + 0.5) / rows);
        for (let xi = 0; xi < columns; xi += 1) {
          const x = left + ((right - left) * (xi + 0.5) / columns);
          const el = document.elementFromPoint(x, y);
          if (!el || !sectionRoot.contains(el)) continue;
          total += 1;
          if (el.closest(contentSelector)) filled += 1;
        }
      }
      const ratio = total ? filled / total : 0;
      const lastMeaningfulBottom = Math.max(0, ...firstScreenNodes.map((node) => Math.min(window.innerHeight, node.getBoundingClientRect().bottom || 0)));
      overviewMobileEffectiveCoverageProbe = {
        filled,
        total,
        ratio: Number(ratio.toFixed(3)),
        lastMeaningfulBottom: Math.round(lastMeaningfulBottom),
        viewportHeight: window.innerHeight,
      };
      overviewMobileEffectiveCoverageOk = ratio >= 0.68 && lastMeaningfulBottom >= window.innerHeight * 0.70;
    }
    let overviewBlankProbe = null;
    let overviewBlankAreaOk = true;
    if (sectionName === 'overview' && isDesktopOverview && sectionRoot) {
      const rect = sectionRoot.getBoundingClientRect();
      const left = Math.max(0, rect.left);
      const right = Math.min(window.innerWidth, rect.right);
      const top = Math.max(0, rect.top);
      const bottom = Math.min(window.innerHeight, Math.max(top, rect.bottom));
      const contentSelector = [
        '.ik-home-ops-bar',
        '.ik-home-incident-line',
        '.ik-home-verdict-panel',
        '.ik-home-verdict-main',
        '.ik-home-verdict-side',
        '.ik-home-verdict-row',
        '.ik-home-next-row',
        '.ik-home-priority-list',
        '.ik-home-priority-item',
        '.ik-home-action-links',
        '.ik-home-action-link',
        '.ik-home-operator-grid',
        '.ik-home-operator-card',
        '.ik-home-operator-kpis',
        '.ik-home-density-card',
        '.ik-home-line-risk-grid',
        '.ik-home-session-grid',
        '.ik-home-signal-card',
        '.ik-home-trend-compact',
        '.ik-home-freshness-card',
        '.ik-home-evidence-split',
        '.ik-home-rank-grid',
        '.card',
        '.ik-summary-box',
        '.ik-home-evidence-row',
        '.ik-home-evidence-empty',
        '.ik-home-mini-table-wrap',
        '.ops-table-wrap',
        '.tag',
        'table',
        'th',
        'td'
      ].join(',');
      let filled = 0;
      let total = 0;
      const columns = 18;
      const rows = 12;
      for (let yi = 0; yi < rows; yi += 1) {
        const y = top + ((bottom - top) * (yi + 0.5) / rows);
        for (let xi = 0; xi < columns; xi += 1) {
          const x = left + ((right - left) * (xi + 0.5) / columns);
          const el = document.elementFromPoint(x, y);
          if (!el || !sectionRoot.contains(el)) continue;
          total += 1;
          if (el.closest(contentSelector)) filled += 1;
        }
      }
      const blank = Math.max(0, total - filled);
      const ratio = total ? blank / total : 1;
      overviewBlankProbe = {
        filled,
        total,
        blank,
        ratio: Number(ratio.toFixed(3)),
      };
      overviewBlankAreaOk = ratio <= 0.10;
    }
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
      scaleMetaOk &&
      scaleDisclosureOk &&
      overviewActionOk &&
      overviewOperatorHomeOk &&
      overviewMinimalOk &&
      overviewDesktopDensityOk &&
      overviewStatusBusTripletOk &&
      overviewDesktopCoreTextOk &&
      overviewDesktopTopConclusionUniqueOk &&
      overviewMobileAlertOk &&
      overviewVerdictCompactOk &&
      overviewTerminologyOk &&
      overviewTrustCopyOk &&
      overviewTrendCompactOk &&
      overviewHistoryRealtimeCopyOk &&
      overviewRankCompactOk &&
      overviewWanDecisionOk &&
      overviewRiskSplitOk &&
      overviewCapabilityDegradeOk &&
      overviewProductVerdictOk &&
      overviewEvidenceChainOk &&
      overviewEdgeScenarioOk &&
      overviewFirstEvidenceCategoryOk &&
      overviewHighestRiskEvidenceMatchOk &&
      overviewUsableWidthOk &&
      overviewFirstScreenFieldsOk &&
      overviewMobileCoreOk &&
      overviewMobileArchitectureOk &&
      overviewMobileProductVerdictOk &&
      overviewMobileDispositionOk &&
      overviewMobileUniqueVerdictOk &&
      overviewMobileEvidenceTitleOk &&
      overviewMobileEvidenceUniqueOk &&
      overviewReadOnlyBoundaryOk &&
      overviewEvidenceLayeringOk &&
      overviewRouteSnapshotCopyOk &&
      overviewAnomalyEvidenceOk &&
      overviewHistoryNoLiveGreenOk &&
      overviewMobileEffectiveCoverageOk &&
      overviewFirstScreenEllipsisOk &&
      overviewCriticalEllipsisOk &&
      overviewHistoryStrongPromptOk &&
      overviewHistoryFirstScreenPromptOk &&
      overviewFreshnessFreshSampleOk &&
      overviewDefaultRouteSnapshotSemanticsOk &&
      overviewNoSnapshotSemanticOk &&
      overviewAllWanOfflineSummaryOk &&
      overviewResourceFullIncidentOk &&
      overviewStaleDataImpactOk &&
      overviewBlankAreaOk &&
      overviewTerminalPlacementOk &&
      overviewNoDuplicateTerminalOk &&
      overviewDesktopEvidenceUniqueOk &&
      overviewAxesOk &&
      overviewMonitorSplitOk &&
      overviewAggregateWanNoIpv6Ok &&
      overviewWanCardNoInternalScrollOk &&
      overviewResourceRowOk &&
      overviewResourceAxisOk &&
      overviewProtocolRankOk &&
      detailFeedbackOk &&
      scaleWindowHorizontalOk &&
      interfaceBroadbandTableOk &&
      humanScaleCopyOk &&
      readonlyPublicNavOk &&
      scaleHeightOk &&
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
      content,
      sectionRect,
      smallTargets,
      sidebarVisible,
      hasBadLiteral,
      scaleMetaOk,
      scaleDisclosureOk,
      scaleDisclosureCount,
      overviewActionOk,
      overviewOperatorHomeOk,
      overviewMinimalOk,
      overviewDesktopDensityOk,
      overviewDensityModuleCount: overviewDensityModules.length,
      overviewDesktopHeight: overviewDesktopRect ? Math.round(overviewDesktopRect.height) : null,
      overviewMinDesktopHeight: Math.round(overviewMinDesktopHeight),
      overviewStatusBusTripletOk,
      overviewStatusBusProbe: {
        cells: overviewStatusBusCells.length,
        visibleCells: overviewStatusBusVisibleCells.length,
        text: overviewStatusBusText,
      },
      overviewDesktopCoreTextOk,
      overviewDesktopTopConclusionUniqueOk,
      overviewDesktopTopProbe: {
        primary: normalize(overviewDesktopPrimary?.textContent || ''),
        text: overviewDesktopTopText.slice(0, 260),
        wanLinkCount: countOccurrences(overviewDesktopTopText, '查看 WAN 状态'),
        collectionLinkCount: countOccurrences(overviewDesktopTopText, '查看采集状态'),
        routeLinkCount: countOccurrences(overviewDesktopTopText, '查看路由表快照'),
      },
      overviewDesktopCriticalTextSamples,
      overviewMobileAlertOk,
      overviewVerdictCompactOk,
      overviewVerdictCompactProbe: {
        height: overviewMainVerdictRect ? Math.round(overviewMainVerdictRect.height) : null,
        text: normalize(overviewMainVerdict?.textContent || '').slice(0, 220),
      },
      overviewTerminologyOk,
      overviewTrustCopyOk,
      overviewTrendCompactOk,
      overviewHistoryRealtimeCopyOk,
      overviewRankCompactOk,
      overviewRankHeaders: rankHeaders,
      overviewRankScrollerOverflow: rankScrollerOverflow,
      overviewWanDecisionOk,
      overviewRiskSplitOk,
      overviewCapabilityDegradeOk,
      overviewProductVerdictOk,
      overviewEvidenceChainOk,
      overviewEdgeScenarioOk,
      overviewPriorityLabels: priorityLabels,
      overviewActivePriorityLabels: activePriorityLabels,
      overviewFirstEvidenceCategoryOk,
      overviewFirstEvidenceCategory,
      overviewFirstEvidenceText,
      overviewHighestRiskEvidenceMatchOk,
      overviewHighestRiskEvidenceProbe: {
        expectedEdgeEvidenceCategory,
        excerpt: expectedRiskEvidenceText.slice(0, 360),
      },
      overviewUsableWidthOk,
      minOverviewUsableWidth,
      overviewFirstScreenFieldsOk,
      overviewFirstScreenFieldCount,
      minOverviewFirstScreenFields,
      overviewMobileCoreOk,
      overviewMobileArchitectureOk,
      overviewMobileProductVerdictOk,
      overviewMobileDispositionOk,
      overviewMobileUniqueVerdictOk,
      overviewMobileUniqueVerdictProbe: {
        primaryCount: primaryConclusionNodes.length,
        alertPrimary: mobileAlertPrimaryText,
        incidentTitle: mobileIncidentTitleText,
        leadText: mobileIncidentTitleLeadText,
        supportText: mobileIncidentTitleSupportText,
      },
      overviewMobileEvidenceUniqueOk,
      overviewReadOnlyBoundaryOk,
      overviewReadOnlyBoundaryProbe: {
        mainAlertTop: overviewMainAlertRect ? Math.round(overviewMainAlertRect.top) : null,
        firstEvidenceTop: overviewFirstEvidenceRect ? Math.round(overviewFirstEvidenceRect.top) : null,
        boundaryCount: readonlyBoundaryNodes.length,
        boundaryTops: readonlyBoundaryNodes.slice(0, 3).map((node) => Math.round(node.getBoundingClientRect().top)),
      },
      mobileIncidentEvidenceRows,
      mobileAlarmProbe: mobileAlarmRect ? {
        top: Math.round(mobileAlarmRect.top),
        height: Math.round(mobileAlarmRect.height),
        text: mobileAlertText,
      } : null,
      mobileTop120Text,
      overviewAnomalyEvidenceOk,
      overviewDesktopEvidenceUniqueOk,
      overviewDesktopEvidenceRows,
      expectedOfflineNames,
      visibleAnomalyNames,
      overviewHistoryNoLiveGreenOk,
      staleLikeModeActive,
      historyLiveGreenTags,
      overviewMobileEffectiveCoverageOk,
      overviewMobileEffectiveCoverageProbe,
      overviewFirstScreenEllipsisOk,
      overviewFirstScreenEllipsisCount,
      overviewFirstScreenEllipsisSamples: ellipsisSamples.slice(0, 8),
      overviewCriticalEllipsisOk,
      overviewCriticalEllipsisSamples: criticalEllipsisSamples.slice(0, 8),
      overviewFreshnessFreshSampleOk,
      overviewFreshnessFreshSampleProbe: {
        excerpt: firstScreenOverviewText.slice(0, 260),
      },
      overviewAllWanOfflineSummaryOk,
      overviewAllWanOfflineSummaryProbe: {
        totalWanCount,
        offlineWanCount,
        excerpt: combinedOverviewText.slice(0, 260),
      },
      overviewResourceFullIncidentOk,
      overviewResourceFullIncidentProbe: {
        hasCpu: /CPU\s*96/.test(combinedOverviewText),
        hasMemory: /内存\s*92/.test(combinedOverviewText),
        hasDisk: /磁盘\s*97/.test(combinedOverviewText),
        hasConnectionPressure: /连接|活动/.test(combinedOverviewText),
        excerpt: combinedOverviewText.slice(0, 260),
      },
      overviewStaleDataImpactOk,
      overviewStaleDataImpactProbe: {
        staleCopyActive,
        staleForbiddenImpact,
        staleHardCopy,
        excerpt: combinedOverviewText.slice(0, 260),
      },
      overviewEvidenceLayeringOk,
      overviewEvidenceLayeringProbe: {
        wanOfflineCountPhraseMatches,
        excerpt: combinedOverviewText.slice(0, 260),
      },
      overviewRouteSnapshotCopyOk,
      overviewRouteSnapshotProbe: {
        defaultRouteRows: overviewDefaultRouteRows.length,
        wanDetailRows: overviewWanDetailRows.length,
      },
      overviewHistoryFirstScreenPromptOk,
      overviewHistoryPromptVisibleText,
      overviewNoSnapshotSemanticOk,
      overviewNoSnapshotSemanticProbe: {
        excerpt: combinedOverviewText.slice(0, 260),
      },
      overviewDefaultRouteSnapshotSemanticsOk,
      defaultRouteSnapshotText,
      overviewBlankAreaOk,
      overviewBlankProbe,
      overviewTerminalPlacementOk,
      overviewNoDuplicateTerminalOk,
      duplicateTerminalCardCount: duplicateTerminalCards.length,
      overviewAxesOk,
      overviewSamplingFallbackOk,
      overviewMonitorSplitOk,
      monitorSplitColumns,
      monitorPanelCount: monitorPanels.length,
      overviewAggregateWanNoIpv6Ok,
      overviewWanCardNoInternalScrollOk,
      wanIpText,
      wanCardOverflowY: wanCardStyle?.overflowY || '',
      wanCardScrollDelta: wanCard ? Math.round(wanCard.scrollHeight - wanCard.clientHeight) : 0,
      wanAxisLabelCount: wanAxisLabels.length,
      wanAxisLabels: wanAxisLabels.map((node) => normalize(node.textContent)).slice(0, 3),
      monitorAxisLabelCount: monitorAxisLabels.length,
      monitorAxisLabels: monitorAxisLabels.map((node) => normalize(node.textContent)).slice(0, 3),
      overviewStickyOk,
      overviewStickyProbe,
      overviewResourceRowOk,
      overviewResourceAxisOk,
      resourceAxisLabels,
      overviewProtocolRankOk,
      protocolRankText,
      resourceCardCount: resourceCards.length,
      resourceColumns,
      detailFeedbackOk,
      scaleWindowHorizontalOk,
      scaleWindowHorizontalOverflow,
      interfaceBroadbandTableOk,
      broadbandHeaders,
      humanScaleCopyOk,
      readonlyPublicNavOk,
      readonlyDefaultLabels,
      readonlyAdvancedNavPresent: Boolean(readonlyAdvancedNav),
      scaleHeightOk,
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
            const sectionActivation = await setSection(cdp, section);
            const inspection = await inspectSection(cdp, profile, viewport, section, args, scaleScenario);
            inspection.runtimeErrorCount = runtimeErrors.length;
            inspection.consoleErrorCount = consoleErrors.length;
            inspection.newRuntimeErrorCount = runtimeErrors.length - runtimeErrorStart;
            inspection.newConsoleErrorCount = consoleErrors.length - consoleErrorStart;
            const structurePass = inspection.pass;
            const openErrorsOk = inspection.newRuntimeErrorCount === 0 && inspection.newConsoleErrorCount === 0;
            const sectionEntryRequired = MAIN_MENU_SECTIONS.includes(section);
            const sectionEntryOk = !sectionEntryRequired || Boolean(sectionActivation && sectionActivation.linkFound);
            inspection.structurePass = structurePass;
            inspection.openErrorsOk = openErrorsOk;
            inspection.sectionEntryOk = sectionEntryOk;
            inspection.sectionEntryRequired = sectionEntryRequired;
            inspection.sectionActivation = sectionActivation;
            inspection.pass = Boolean(structurePass && openErrorsOk && sectionEntryOk);
            if (inspection.newRuntimeErrorCount || inspection.newConsoleErrorCount || !inspection.pass) {
              inspection.runtimeErrors = runtimeErrors.slice(Math.max(0, runtimeErrorStart), runtimeErrorStart + 3);
              inspection.consoleErrors = consoleErrors.slice(Math.max(0, consoleErrorStart), consoleErrorStart + 3);
              inspection.firstRuntimeError = runtimeErrors[0] || null;
              inspection.firstConsoleError = consoleErrors[0] || null;
            }
            const hardPass = inspection.pass;
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
      access: 'PPPoE',
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
      access: 'PPPoE',
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
      forwardRuleRows: [
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
    statusFindings: {
      status: 'warning',
      readOnly: true,
      generatedAt: now,
      sourceUpdatedAt: now,
      sourceStatus: 'ok',
      limit: 24,
      counts: { critical: 0, warning: 1, info: 1 },
      topFinding: {
        id: 'interfaces.error_counters',
        severity: 'warning',
        domain: 'interfaces',
        title: 'Interface error or drop counters are non-zero',
        summary: 'WAN-2 has one observed receive drop in the fixture.',
        source: 'snapshot.interfaces',
        readOnly: true,
        priority: 1,
        evidence: [{ label: 'topInterface', value: 'pppoe-wan2' }],
      },
      findings: [
        {
          id: 'interfaces.error_counters',
          severity: 'warning',
          domain: 'interfaces',
          title: 'Interface error or drop counters are non-zero',
          summary: 'WAN-2 has one observed receive drop in the fixture.',
          source: 'snapshot.interfaces',
          readOnly: true,
          priority: 1,
          evidence: [{ label: 'topInterface', value: 'pppoe-wan2' }],
        },
        {
          id: 'wan.traffic_skew',
          severity: 'info',
          domain: 'wan',
          title: 'WAN traffic distribution is skewed',
          summary: 'WAN-1 is carrying more traffic in the fixture.',
          source: 'snapshot.loadBalance.distribution',
          readOnly: true,
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
  snapshot.healthFindings = snapshot.statusFindings;
  applyScaleScenario(snapshot, scaleScenario);
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
    access: n % 5 === 0 ? 'Static' : n % 4 === 0 ? 'VLAN' : n % 3 === 0 ? 'DHCP' : 'PPPoE',
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

function setFixtureFinding(snapshot, severity, title, summary, evidence = []) {
  const finding = {
    id: `edge.${String(title || 'fixture').toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    severity,
    domain: 'overview',
    title,
    summary,
    source: 'fixture.edge',
    readOnly: true,
    priority: 0,
    evidence,
  };
  snapshot.statusFindings.status = severity === 'critical' ? 'critical' : 'warning';
  snapshot.statusFindings.counts = {
    critical: severity === 'critical' ? 1 : 0,
    warning: severity === 'warning' ? 1 : 0,
    info: 0,
  };
  snapshot.statusFindings.findings = [finding, ...(snapshot.statusFindings.findings || [])];
  snapshot.statusFindings.topFinding = finding;
  snapshot.healthFindings = snapshot.statusFindings;
}

function setSnapshotFresh(snapshot) {
  const now = new Date().toISOString();
  snapshot.updatedAt = now;
  snapshot.meta.realtimeUpdatedAt = now;
  snapshot.meta.slowRestUpdatedAt = now;
  snapshot.meta.staticUpdatedAt = now;
  snapshot.meta.connectionDetailUpdatedAt = now;
  snapshot.meta.connectionProtocolUpdatedAt = now;
  return now;
}

function setCollectionHealthy(snapshot) {
  snapshot.meta.realtimeError = null;
  snapshot.meta.slowRestError = null;
  snapshot.meta.staticError = null;
  snapshot.meta.connectionDetailError = null;
  snapshot.meta.connectionProtocolError = null;
  snapshot.meta.capabilities.restTrusted = true;
  snapshot.meta.capabilities.sshRead = true;
  snapshot.meta.capabilities.sshLabel = 'SSH 可用';
}

function refreshOverviewWanRates(snapshot) {
  const wan = Array.isArray(snapshot.wan) ? snapshot.wan : [];
  const upTotal = wan.reduce((sum, row) => sum + Number(row.upRate || 0), 0);
  const downTotal = wan.reduce((sum, row) => sum + Number(row.downRate || 0), 0);
  snapshot.overview.uplinkBps = upTotal;
  snapshot.overview.downlinkBps = downTotal;
  snapshot.overview.wanUpRate = upTotal;
  snapshot.overview.wanDownRate = downTotal;
}

function refreshFixtureCounts(snapshot, scaleScenario) {
  const wanCount = Array.isArray(snapshot.wan) ? snapshot.wan.length : 0;
  const pppoeCount = Array.isArray(snapshot.pppoe) ? snapshot.pppoe.length : wanCount;
  const interfaceCount = Array.isArray(snapshot.interfaces) ? snapshot.interfaces.length : 0;
  const terminalCount = Array.isArray(snapshot.terminals) ? snapshot.terminals.length : 0;
  snapshot.meta.pppoeCount = pppoeCount;
  snapshot.meta.wanCount = wanCount;
  snapshot.meta.lineCount = wanCount;
  snapshot.meta.lineLayoutTier = lineLayoutTier(wanCount);
  snapshot.meta.scaleScenario = scaleScenario;
  snapshot.overview.interfaceCount = interfaceCount;
  snapshot.overview.terminalCount = terminalCount;
  snapshot.overview.onlineTerminals = terminalCount;
  if (!snapshot.meta.scale) snapshot.meta.scale = {};
  snapshot.meta.scale.wan = listScaleMeta(wanCount, wanCount, wanCount, false, '', 'edge fixture', ['status', 'routeTable']);
  snapshot.meta.scale.pppoe = listScaleMeta(pppoeCount, pppoeCount, pppoeCount, false, '', 'edge fixture');
  snapshot.meta.scale.interfaces = listScaleMeta(interfaceCount, interfaceCount, interfaceCount, false, '', 'edge fixture', ['status']);
  snapshot.meta.scale.terminals = listScaleMeta(terminalCount, Math.min(terminalCount, (snapshot.terminals || []).length), terminalCount, false, '', 'edge fixture');
}

function markWanOffline(snapshot, { includeLan = false } = {}) {
  for (const rows of [snapshot.wan, snapshot.pppoe]) {
    for (const row of rows || []) {
      row.running = false;
      row.status = 'offline';
      row.upRate = 0;
      row.downRate = 0;
      if (row.history) row.history = { up: [0, 0, 0, 0], down: [0, 0, 0, 0] };
      if (Array.isArray(row.routes)) {
        row.routes = row.routes.map((route) => ({ ...route, active: false }));
      }
    }
  }
  for (const row of snapshot.interfaces || []) {
    const isWan = row.role === 'WAN' || /^pppoe-|^wan/i.test(String(row.name || '')) || /pppoe/i.test(String(row.type || ''));
    if (includeLan || isWan) {
      row.running = false;
      row.rxRate = 0;
      row.txRate = 0;
    }
  }
  if (snapshot.routes?.defaultRoutes) {
    snapshot.routes.defaultRoutes = snapshot.routes.defaultRoutes.map((route) => ({ ...route, active: false }));
  }
  if (snapshot.loadBalance?.distribution) {
    snapshot.loadBalance.distribution = snapshot.loadBalance.distribution.map((row) => ({ ...row, active: false, upRate: 0, downRate: 0 }));
  }
  snapshot.connections.active = [];
  snapshot.connections.topIps = [];
  snapshot.connections.protocolTop = [];
  snapshot.connections.total = 0;
  refreshOverviewWanRates(snapshot);
}

function applyNoSnapshotScenario(snapshot) {
  setSnapshotFresh(snapshot);
  snapshot.status = 'error';
  snapshot.error = '无可用快照，RouterOS 当前不可达，业务数字不可判定';
  snapshot.meta.realtimeError = 'RouterOS 当前不可达';
  snapshot.meta.slowRestError = '无可用快照';
  snapshot.meta.staticError = '无可用快照';
  snapshot.meta.connectionDetailError = '无可用快照';
  snapshot.meta.connectionProtocolError = '无可用快照';
  snapshot.meta.capabilities.restTrusted = false;
  snapshot.meta.capabilities.sshRead = false;
  snapshot.meta.capabilities.sshLabel = 'SSH 采集不可用';
  snapshot.wan = [];
  snapshot.pppoe = [];
  snapshot.interfaces = [];
  snapshot.terminals = [];
  snapshot.arp.items = [];
  snapshot.dhcp.leases = [];
  snapshot.routes.defaultRoutes = [];
  snapshot.routes.staticRoutes = [];
  snapshot.connections.active = [];
  snapshot.connections.topIps = [];
  snapshot.connections.protocolTop = [];
  snapshot.connections.total = 0;
  snapshot.overview.identity = '无可用快照';
  snapshot.overview.version = 'RouterOS 当前不可达';
  snapshot.overview.uptime = '业务数字不可判定';
  snapshot.overview.cpuLoad = 0;
  snapshot.overview.memoryUsage = 0;
  snapshot.overview.memoryUsedPercent = 0;
  snapshot.overview.diskUsage = 0;
  snapshot.overview.diskUsedPercent = 0;
  snapshot.overview.systemLoadLevel = 'warning';
  refreshOverviewWanRates(snapshot);
  setFixtureFinding(snapshot, 'critical', 'No snapshot', '无可用快照，RouterOS 当前不可达，业务数字不可判定。', [
    { label: '采集', value: '断链' },
    { label: '快照', value: '无可用' },
    { label: 'RouterOS', value: '当前不可达' },
    { label: '业务数字', value: '不可判定' },
  ]);
}

function applyEdgeScenario(snapshot, scaleScenario) {
  if (!EDGE_SCALE_SCENARIOS.includes(scaleScenario)) return;
  if (scaleScenario === 'no-snapshot') {
    applyNoSnapshotScenario(snapshot);
    refreshFixtureCounts(snapshot, scaleScenario);
    return;
  }
  setSnapshotFresh(snapshot);
  setCollectionHealthy(snapshot);
  if (scaleScenario === 'all-offline') {
    markWanOffline(snapshot);
    setFixtureFinding(snapshot, 'critical', 'All WAN offline', '全部 WAN 线路离线，默认路由不可用。', [
      { label: 'WAN', value: String((snapshot.wan || []).length) },
      { label: '默认路由', value: '不可用' },
    ]);
  } else if (scaleScenario === 'collection-down') {
    snapshot.meta.realtimeError = '实时采集断链';
    snapshot.meta.slowRestError = '慢速采集断链';
    snapshot.meta.staticError = '静态配置采集断链';
    snapshot.meta.connectionDetailError = '连接明细采集断链';
    snapshot.meta.connectionProtocolError = '连接协议采集断链';
    snapshot.meta.capabilities.restTrusted = false;
    snapshot.meta.capabilities.sshRead = false;
    snapshot.meta.capabilities.sshLabel = 'SSH 采集不可用';
    setFixtureFinding(snapshot, 'warning', 'Collection down', 'REST/SSH 采集断链，但上次快照仍可读。', [
      { label: '采集', value: '断链' },
      { label: 'REST', value: '失败' },
      { label: 'SSH', value: '失败' },
    ]);
  } else if (scaleScenario === 'resource-full') {
    snapshot.overview.cpuLoad = 96;
    snapshot.overview.memoryUsage = 92;
    snapshot.overview.memoryUsedPercent = 92;
    snapshot.overview.diskUsage = 97;
    snapshot.overview.diskUsedPercent = 97;
    snapshot.overview.systemLoadLevel = 'danger';
    snapshot.connections.total = 98000;
    snapshot.connections.thresholdLevel = 'danger';
    setFixtureFinding(snapshot, 'critical', 'Resource full', 'CPU、内存、磁盘与连接压力过高。', [
      { label: '资源', value: 'CPU 96% / 内存 92% / 磁盘 97%' },
      { label: 'cpu', value: '96%' },
      { label: 'memory', value: '92%' },
      { label: 'disk', value: '97%' },
    ]);
  } else if (scaleScenario === 'interfaces-down') {
    snapshot.status = 'error';
    snapshot.error = '接口全 Down，RouterOS 转发面不可用';
    markWanOffline(snapshot, { includeLan: true });
    setFixtureFinding(snapshot, 'critical', 'Interfaces down', 'All interfaces are down in the edge fixture.', [
      { label: 'interfacesDown', value: String((snapshot.interfaces || []).length) },
    ]);
  }
  refreshFixtureCounts(snapshot, scaleScenario);
}

function applyScaleScenario(snapshot, scaleScenario) {
  const edgeCounts = {
    'all-offline': { wan: 8, terminals: 24 },
    'no-snapshot': { wan: 0, terminals: 0 },
    'collection-down': { wan: 4, terminals: 24 },
    'resource-full': { wan: 4, terminals: 24 },
    'interfaces-down': { wan: 4, terminals: 24 },
  };
  const counts = edgeCounts[scaleScenario] || (scaleScenario === 'single'
    ? { wan: 1, terminals: 8 }
    : scaleScenario === 'fleet'
      ? { wan: 64, terminals: 180 }
      : { wan: 4, terminals: 24 });
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
    dnsStatic: listScaleMeta(snapshot.dns.forwardRuleCount || 4, snapshot.dns.forwardRuleRows.length, 100, true, 'preview rows; /api/dns-static is paged', 'RouterOS order'),
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
  snapshot.statusFindings.findings.unshift({
    id: `scale.${scaleScenario}`,
    severity: scaleScenario === 'fleet' ? 'warning' : 'info',
    domain: 'scale',
    title: `Scale fixture: ${scaleScenario}`,
    summary: `${wan.length} WAN lines and ${terminals.length} terminals are loaded in this fixture.`,
    source: 'fixture.meta.scale',
    readOnly: true,
    priority: 0,
    evidence: [{ label: 'wan', value: String(wan.length) }, { label: 'terminals', value: String(terminals.length) }],
  });
  snapshot.statusFindings.topFinding = snapshot.statusFindings.findings[0] || null;
  snapshot.healthFindings = snapshot.statusFindings;
  applyEdgeScenario(snapshot, scaleScenario);
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
    const safeReport = await prepareReportForJson(report, args.out);
    await writeJson(path.join(args.out, 'report.json'), safeReport);
  }

  console.log(`[INFO] report: ${path.join(args.out, 'report.json')}`);
  console.log(`[INFO] result: ${report.failures.length ? `${report.failures.length} failure(s)` : 'pass'}`);
  if (report.failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
