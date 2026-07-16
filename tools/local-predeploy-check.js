#!/usr/bin/env node
'use strict';

const fs = require('fs/promises');
const fsSync = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { chromium } = require('playwright-core');
const { inspectMobileNativeOverview, inspectOverviewMobileInteraction } = require('./acceptance/inspect-overview-mobile');
const { inspectSectionBrowser } = require('./acceptance/inspect-section-browser');
const { inspectOverviewDesktopLayout } = require('./acceptance/inspect-overview-desktop-layout');
const { inspectPanelRouteRuntime } = require('./acceptance/inspect-panel-routes');

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
  'more',
];
const DEFAULT_PRIVATE_SECTIONS = [
  ...DEFAULT_PUBLIC_SECTIONS,
];
const DEFAULT_SCALE_SCENARIOS = ['multi'];
const EDGE_SCALE_SCENARIOS = ['all-offline', 'no-snapshot', 'collection-down', 'resource-full', 'interfaces-down'];
const OVERVIEW_RELEASE_SCALE_SCENARIOS = ['single', 'fleet', ...EDGE_SCALE_SCENARIOS];
const OVERVIEW_RELEASE_VIEWPORTS = [
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'desktop1440', width: 1440, height: 900 },
  { name: 'wide', width: 844, height: 390 },
  { name: 'narrow', width: 390, height: 844 },
];
const SCALE_SCENARIOS = new Set(['single', 'multi', 'fleet', ...EDGE_SCALE_SCENARIOS]);

function isOverviewReleaseMatrix(args = {}) {
  const requiredScenarios = ['single', 'fleet', ...EDGE_SCALE_SCENARIOS];
  const scenarioSet = new Set(args.scaleScenarios || []);
  const viewportSet = new Set((args.viewports || []).map((viewport) => viewportCellKey(viewport)));
  return Array.isArray(args.sections) &&
    args.sections.length === 1 &&
    args.sections[0] === 'overview' &&
    args.profile === 'public' &&
    requiredScenarios.every((scenario) => scenarioSet.has(scenario)) &&
    OVERVIEW_RELEASE_VIEWPORTS.every((viewport) => viewportSet.has(viewportCellKey(viewport)));
}

function viewportCellKey(viewport = {}) {
  if (!viewport || !viewport.name) return '';
  const width = Number(viewport.width);
  const height = Number(viewport.height);
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return `${viewport.name}=${width}x${height}`;
  }
  return viewport.name;
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
  --viewports <list>          Comma list like desktop=1366x768,desktop1440=1440x900,wide=844x390,narrow=390x844.
  --sections <list>           Comma list of sections to visit, or main-menu/public-release.
  --scale-scenarios <list>    Comma list: single,multi,fleet,all-offline,no-snapshot,collection-down,resource-full,interfaces-down. Default: multi; overview-only runs default to release overview matrix.
  --skip-browser              Run backend/static/API checks only.
  --skip-backend              Run browser checks only.
  --keep-server               Leave the spawned app server running.
  --strict-responsive         Treat narrow horizontal overflow as a failure.
  --screenshot-all-sections   Capture every requested route, not only overview or failures.
  --help                      Show this help.

Safety:
  When this script starts the app itself, ROS_MONITOR_ROUTER_HOST is forced to
  127.0.0.1 and ROS_PANEL_PROFILE is routeros_only. It does not call network
  devices or deploy anything.
`.trim();
}

function resolvePythonExecutable() {
  const explicit = [process.env.CODEX_PYTHON_PATH, process.env.PYTHON].filter(Boolean);
  for (const candidate of explicit) {
    if (!path.isAbsolute(candidate) || fsSync.existsSync(candidate)) return candidate;
  }
  const candidates = process.platform === 'win32'
    ? [
        path.join(ROOT, '.venv', 'Scripts', 'python.exe'),
        path.join(
          process.env.USERPROFILE || '',
          '.cache',
          'codex-runtimes',
          'codex-primary-runtime',
          'dependencies',
          'python',
          'python.exe',
        ),
      ]
    : [path.join(ROOT, '.venv', 'bin', 'python')];
  return candidates.find((candidate) => fsSync.existsSync(candidate)) ||
    (process.platform === 'win32' ? 'python' : 'python3');
}

function parseArgs(argv) {
  const args = {
    python: resolvePythonExecutable(),
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
    screenshotAllSections: false,
    scaleScenarios: DEFAULT_SCALE_SCENARIOS,
    scaleScenariosExplicit: false,
    viewportsExplicit: false,
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
    else if (item === '--screenshot-all-sections') args.screenshotAllSections = true;
    else if (item === '--url' || item.startsWith('--url=')) args.url = readValue('--url');
    else if (item === '--port' || item.startsWith('--port=')) args.port = Number(readValue('--port'));
    else if (item === '--python' || item.startsWith('--python=')) args.python = readValue('--python');
    else if (item === '--out' || item.startsWith('--out=')) args.out = readValue('--out');
    else if (item === '--profile' || item.startsWith('--profile=')) args.profile = readValue('--profile');
    else if (item === '--viewports' || item.startsWith('--viewports=')) {
      args.viewports = parseViewports(readValue('--viewports'));
      args.viewportsExplicit = true;
    }
    else if (item === '--sections' || item.startsWith('--sections=')) args.sections = parseSections(readValue('--sections'));
    else if (item === '--scale-scenarios' || item.startsWith('--scale-scenarios=')) {
      args.scaleScenarios = readValue('--scale-scenarios').split(',').map((part) => part.trim()).filter(Boolean);
      args.scaleScenariosExplicit = true;
    }
    else throw new Error(`Unknown argument: ${item}`);
  }
  if (
    Array.isArray(args.sections) &&
    args.sections.length === 1 &&
    args.sections[0] === 'overview'
  ) {
    if (!args.scaleScenariosExplicit) args.scaleScenarios = OVERVIEW_RELEASE_SCALE_SCENARIOS;
    if (!args.viewportsExplicit) args.viewports = OVERVIEW_RELEASE_VIEWPORTS;
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

async function readJsonIfAny(filePath) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function matrixSessionKey() {
  const runId = String(process.env.GITHUB_RUN_ID || '').trim();
  const runAttempt = String(process.env.GITHUB_RUN_ATTEMPT || '').trim();
  if (runId || runAttempt) {
    return `${runId || 'run'}-${runAttempt || '1'}`;
  }
  return 'local';
}

function matrixStatePath(commit) {
  const safeCommit = String(commit || 'unknown').replace(/[^A-Za-z0-9._-]+/g, '-');
  return path.join(ROOT, '_acceptance', `release-matrix-${safeCommit}.json`);
}

function listScreenshotFiles(outDir) {
  try {
    return fsSync.readdirSync(outDir)
      .filter((name) => /\.png$/i.test(name))
      .sort();
  } catch {
    return [];
  }
}

function summarizeMatrixRun(report, args, matrix) {
  const viewports = [...new Set(report.browserChecks.map((check) => check.viewport?.name || '').filter(Boolean))];
  const sections = [...new Set(report.browserChecks.map((check) => check.requestedSection || '').filter(Boolean))];
  const profiles = [...new Set(report.browserChecks.map((check) => check.profile || '').filter(Boolean))];
  const passedScenarios = [...new Set(report.browserChecks
    .filter((check) => check.pass)
    .map((check) => check.scaleScenario || '')
    .filter(Boolean))];
  return {
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    commit: matrix.commit || '',
    session: matrix.session || '',
    outputDir: args.out,
    screenshotDir: args.out,
    screenshots: listScreenshotFiles(args.out),
    profile: args.profile,
    profiles,
    requestedScenarios: [...(matrix.requestedScenarios || [])],
    coveredScenarios: [...(matrix.coveredScenarios || [])],
    passedScenarios,
    coveredCells: [...(matrix.coveredCells || [])],
    passedCells: [...(matrix.passedCells || [])],
    requiredCells: [...(matrix.requiredCells || [])],
    viewports,
    sections,
    total: matrix.total,
    passed: matrix.passed,
    failed: matrix.failed,
    requestedComplete: matrix.requestedComplete,
    complete: matrix.complete,
    scenarioMatrix: [...(matrix.scenarios || [])],
    cells: [...(matrix.cells || [])],
  };
}

function mergeMatrixAggregate(existing, matrix, runSummary, sessionKey) {
  const base = existing && existing.commit === matrix.commit ? existing : null;
  const coveredScenarios = new Set(base?.coveredScenarios || []);
  const passedScenarios = new Set(base?.passedScenarios || []);
  const coveredCells = new Set(base?.coveredCells || []);
  const passedCells = new Set(base?.passedCells || []);
  const requiredCells = new Set(base?.requiredCells || []);
  for (const scenario of matrix.coveredScenarios || []) {
    coveredScenarios.add(scenario);
  }
  for (const scenario of matrix.passedScenarios || []) {
    passedScenarios.add(scenario);
  }
  for (const cell of matrix.coveredCells || []) {
    coveredCells.add(cell);
  }
  for (const cell of matrix.passedCells || []) {
    passedCells.add(cell);
  }
  for (const cell of matrix.requiredCells || []) {
    requiredCells.add(cell);
  }
  const sessions = new Set(base?.sessions || []);
  if (base?.session) sessions.add(base.session);
  if (sessionKey) sessions.add(sessionKey);
  const runs = Array.isArray(base?.runs) ? [...base.runs] : [];
  runs.push(runSummary);
  const requiredCellList = [...requiredCells].sort();
  return {
    commit: matrix.commit,
    session: sessionKey,
    sessions: [...sessions].sort(),
    requiredScenarios: [...matrix.requiredScenarios],
    coveredScenarios: [...coveredScenarios].sort(),
    passedScenarios: [...passedScenarios].sort(),
    coveredCells: [...coveredCells].sort(),
    passedCells: [...passedCells].sort(),
    requiredCells: requiredCellList,
    complete: requiredCellList.length > 0
      ? requiredCellList.every((cell) => passedCells.has(cell))
      : matrix.requiredScenarios.every((scenario) => passedScenarios.has(scenario)),
    runs,
    createdAt: base?.createdAt || runSummary.startedAt,
    updatedAt: runSummary.finishedAt,
  };
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
  if (process.platform === 'win32') {
    for (let attempt = 0; attempt < 64; attempt += 1) {
      const candidate = 20000 + Math.floor(Math.random() * 25000);
      const available = await new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.listen(candidate, '127.0.0.1', () => {
          server.close(() => resolve(true));
        });
      });
      if (available) return candidate;
    }
    throw new Error('Unable to reserve a Windows loopback port outside the ephemeral range.');
  }
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
  const localPythonDeps = path.join(ROOT, '_acceptance', 'python-deps');
  if (fsSync.existsSync(localPythonDeps)) {
    env.PYTHONPATH = Array.from(new Set([
      localPythonDeps,
      ...(process.env.PYTHONPATH || '').split(path.delimiter).filter(Boolean),
    ])).join(path.delimiter);
  }

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

function serverLogNoiseProbe(report) {
  const stderr = String(report.serverLogs?.stderr?.tail || report.serverLogs?.stderr?.text || '');
  const stdout = String(report.serverLogs?.stdout?.tail || report.serverLogs?.stdout?.text || '');
  const combined = `${stderr}\n${stdout}`;
  const patterns = [
    /ConnectionResetError/i,
    /ConnectionAbortedError/i,
    /BrokenPipeError/i,
    /ECONNRESET/i,
    /socket reset/i,
  ];
  const hits = patterns
    .map((pattern) => pattern.source)
    .filter((source) => new RegExp(source, 'i').test(combined));
  const shutdownTrace = /ConnectionResetError/i.test(combined) &&
    /handle_one_request/.test(combined) &&
    /socket\.py/.test(combined);
  return {
    ok: hits.length === 0 || shutdownTrace,
    observed: hits.length > 0,
    suppressed: shutdownTrace,
    hits,
    stderrTail: tail(stderr, 1200),
    stdoutTail: tail(stdout, 600),
  };
}

function warn(report, name, detail = {}) {
  const item = { name, detail };
  report.warnings.push(item);
  console.log(`[WARN] ${name}`);
  const summary = summarizeDetail(detail, 1200);
  if (summary) console.log(`[DETAIL] ${name}: ${summary}`);
  return item;
}

function gitShortHead() {
  const result = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
  return result.status === 0 ? String(result.stdout || '').trim() : '';
}

function gitFullHead() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
  return result.status === 0 ? String(result.stdout || '').trim() : '';
}

function buildMatrixSummary(browserChecks = [], args = {}) {
  const requiredScenarios = ['single', 'fleet', 'all-offline', 'no-snapshot', 'collection-down', 'resource-full', 'interfaces-down'];
  const scenarioOrder = new Map([
    ['single', 0],
    ['multi', 1],
    ['fleet', 2],
    ['all-offline', 3],
    ['no-snapshot', 4],
    ['collection-down', 5],
    ['resource-full', 6],
    ['interfaces-down', 7],
  ]);
  const groups = new Map();
  const overviewReleaseMatrix = isOverviewReleaseMatrix(args);
  const cells = browserChecks.map((check) => ({
    profile: check.profile || '',
    scaleScenario: check.scaleScenario || 'multi',
    viewport: check.viewport?.name || '',
    viewportKey: viewportCellKey(check.viewport || {}),
    section: check.requestedSection || '',
    pass: Boolean(check.pass),
  }));
  const profiles = [...new Set(cells.map((cell) => cell.profile).filter(Boolean))];
  const viewports = [...new Set(cells.map((cell) => cell.viewport).filter(Boolean))];
  const sections = [...new Set(cells.map((cell) => cell.section).filter(Boolean))];
  const cellId = (profile, scenario, section, viewport) => `${profile}::${scenario}::${section}::${viewport}`;
  const requiredViewportIds = overviewReleaseMatrix
    ? OVERVIEW_RELEASE_VIEWPORTS.map((viewport) => viewportCellKey(viewport))
    : [...new Set(cells.map((cell) => cell.viewportKey || cell.viewport).filter(Boolean))];
  const coveredCells = [...new Set(cells.map((cell) => cellId(
    cell.profile,
    cell.scaleScenario,
    cell.section,
    cell.viewportKey || cell.viewport,
  )))].sort();
  const passedCells = [...new Set(cells
    .filter((cell) => cell.pass)
    .map((cell) => cellId(
      cell.profile,
      cell.scaleScenario,
      cell.section,
      cell.viewportKey || cell.viewport,
    )))].sort();
  const requiredCells = [];
  for (const profile of profiles) {
    for (const viewport of requiredViewportIds) {
      if (sections.includes('overview')) {
        for (const scenario of requiredScenarios) {
          requiredCells.push(cellId(profile, scenario, 'overview', viewport));
        }
      }
      if (sections.includes('loadAudit')) {
        requiredCells.push(cellId(profile, 'resource-full', 'loadAudit', viewport));
      }
    }
  }
  const passedScenarios = [...new Set(cells.filter((cell) => cell.pass).map((cell) => cell.scaleScenario))].sort();
  for (const cell of cells) {
    const key = `${cell.profile}::${cell.scaleScenario}`;
    if (!groups.has(key)) {
      groups.set(key, {
        profile: cell.profile,
        scaleScenario: cell.scaleScenario,
        total: 0,
        passed: 0,
        failed: 0,
        viewports: [],
        sections: [],
      });
    }
    const group = groups.get(key);
    group.total += 1;
    if (cell.pass) group.passed += 1;
    else group.failed += 1;
    if (cell.viewport && !group.viewports.includes(cell.viewport)) group.viewports.push(cell.viewport);
    if (cell.section && !group.sections.includes(cell.section)) group.sections.push(cell.section);
  }
  const scenarios = Array.from(groups.values()).sort((a, b) => {
    const orderA = scenarioOrder.has(a.scaleScenario) ? scenarioOrder.get(a.scaleScenario) : Number.MAX_SAFE_INTEGER;
    const orderB = scenarioOrder.has(b.scaleScenario) ? scenarioOrder.get(b.scaleScenario) : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    if (a.profile !== b.profile) return a.profile.localeCompare(b.profile);
    return a.scaleScenario.localeCompare(b.scaleScenario);
  });
  return {
    commit: gitFullHead() || gitShortHead(),
    requestedScenarios: args.scaleScenarios || [],
    requiredScenarios,
    coveredScenarios: [...new Set(cells.map((cell) => cell.scaleScenario))].sort(),
    passedScenarios,
    sections: [...sections].sort(),
    requestedComplete: (args.scaleScenarios || []).every((scenario) => passedScenarios.includes(scenario)),
    coveredCells,
    passedCells,
    requiredCells: [...new Set(requiredCells)].sort(),
    complete: requiredCells.length > 0
      ? [...new Set(requiredCells)].every((cell) => passedCells.includes(cell))
      : requiredScenarios.every((scenario) => passedScenarios.includes(scenario)),
    total: cells.length,
    passed: cells.filter((cell) => cell.pass).length,
    failed: cells.filter((cell) => !cell.pass).length,
    scenarios,
    cells,
  };
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
    'readonly-diagnostics.js',
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
  const retiredPatchAssets = [
    'layout-whitespace-patch.js',
    'panel-professional-redesign.js',
    'scale-adaptive-patch.js',
  ];
  for (const asset of retiredPatchAssets) {
    const result = await fetchText(`${baseUrl}${asset}`, { timeoutMs: 5000 });
    record(report, `retired public patch asset is absent: /${asset}`, result.response.status === 404, {
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

class PlaywrightSession {
  constructor(context, page) {
    this.context = context;
    this.page = page;
    this.handlers = new Map();
    this.closed = false;
    page.on('pageerror', (error) => {
      this.emit('Runtime.exceptionThrown', {
        exceptionDetails: { text: error.message, stack: error.stack || '' },
      });
    });
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      this.emit('Runtime.consoleAPICalled', {
        type: 'error',
        args: [{ type: 'string', value: message.text() }],
      });
    });
  }

  emit(method, params) {
    for (const handler of this.handlers.get(method) || []) handler(params);
  }

  on(method, handler) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(handler);
  }

  async send(method, params = {}) {
    if (method === 'Runtime.enable' || method === 'Page.enable' || method === 'Log.enable') return {};
    if (method === 'Emulation.setDeviceMetricsOverride') {
      await this.page.setViewportSize({
        width: Math.max(1, Math.round(Number(params.width) || 1)),
        height: Math.max(1, Math.round(Number(params.height) || 1)),
      });
      return {};
    }
    if (method === 'Page.addScriptToEvaluateOnNewDocument') {
      await this.page.addInitScript({ content: String(params.source || '') });
      return {};
    }
    if (method === 'Page.navigate') {
      await this.page.goto(String(params.url || 'about:blank'), {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      return { frameId: 'playwright' };
    }
    if (method === 'Runtime.evaluate') {
      try {
        const value = await this.page.evaluate(String(params.expression || 'undefined'));
        return { result: { value } };
      } catch (error) {
        return {
          exceptionDetails: {
            text: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack || '' : '',
          },
        };
      }
    }
    if (method === 'Page.captureScreenshot') {
      const data = await this.page.screenshot({
        type: 'png',
        fullPage: false,
        animations: 'disabled',
      });
      return { data: data.toString('base64') };
    }
    throw new Error(`Unsupported Playwright browser command: ${method}`);
  }

  close() {}

  async closeTarget() {
    if (this.closed) return;
    this.closed = true;
    await this.context.close();
  }
}

async function launchBrowser(args, report) {
  const browserPath = await findBrowser();
  if (!browserPath) {
    throw new Error('Edge/Chrome executable not found. Set BROWSER or CHROME_PATH.');
  }
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
    args: [
      '--disable-background-networking',
      '--disable-dev-shm-usage',
      '--disable-sync',
      '--disable-extensions',
      '--no-first-run',
      '--no-default-browser-check',
      '--metrics-recording-only',
      ...(process.platform === 'linux' ? ['--no-sandbox'] : []),
    ],
  });
  report.browser = { driver: 'playwright-core', path: browserPath };

  return {
    browserPath,
    connect: async () => {
      const context = await browser.newContext({
        locale: 'zh-CN',
        colorScheme: 'light',
        reducedMotion: 'reduce',
      });
      try {
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        page.setDefaultNavigationTimeout(15000);
        return new PlaywrightSession(context, page);
      } catch (error) {
        await context.close().catch(() => {});
        throw error;
      }
    },
    stop: async () => {
      await browser.close();
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
          contentMounted: Boolean(section?.firstElementChild && section.getBoundingClientRect().height > 0)
        };
      })()`,
      returnByValue: true,
    });
    last = result.result && result.result.value;
    if (last && last.app && last.section && last.contentMounted) return last;
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
      const selector = [
        '[data-section="' + CSS.escape(section) + '"]',
        'a[href="#' + CSS.escape(section) + '"]',
      ].join(',');
      const candidates = Array.from(document.querySelectorAll(selector));
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
        linkText: normalize((visible || link) ? (visible || link).textContent : ''),
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
  const browserConfig = {
    sectionName: section,
    scaleScenario,
    profile,
    viewport,
    strictResponsive: Boolean(args.strictResponsive),
  };
  const expression = `(${inspectSectionBrowser.toString()})(${JSON.stringify(browserConfig)}, ${inspectOverviewMobileInteraction.toString()}, ${inspectMobileNativeOverview.toString()}, ${inspectOverviewDesktopLayout.toString()})`;
  if (process.env.CODEX_WRITE_RESPONSIVE_EXPRESSION === '1') {
    try {
      fsSync.writeFileSync(path.join(__dirname, '..', '.tmp_injected_responsive_expression.current.js'), expression);
    } catch (_) {}
  }
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    return {
      pass: false,
      profile,
      scaleScenario,
      viewport,
      requestedSection: section,
      exception: result.exceptionDetails,
    };
  }
  const inspection = result.result && result.result.value;
  if (section !== 'overview' || !inspection) return inspection;
  const canonicalRouteProbeCell = scaleScenario === 'single' && viewport.width === 390 && viewport.height === 844;
  if (!canonicalRouteProbeCell) {
    return {
      ...inspection,
      panelRouteRuntimeOk: true,
      panelRouteRuntimeProbe: {
        applicable: true,
        pass: true,
        exercised: false,
        reason: 'route interaction is exercised once at single 390x844 and by check:runtime-browser',
      },
    };
  }
  const routeResult = await cdp.send('Runtime.evaluate', {
    expression: `(${inspectPanelRouteRuntime.toString()})()`,
    awaitPromise: true,
    returnByValue: true,
  });
  const routeProbe = routeResult.result && routeResult.result.value;
  return {
    ...inspection,
    pass: Boolean(inspection.pass && routeProbe?.pass === true),
    panelRouteRuntimeOk: routeProbe?.pass === true,
    panelRouteRuntimeProbe: { ...routeProbe, exercised: true },
  };
}

async function withTimeout(promise, timeoutMs, label) {
  let timer = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function inspectScreenshotBlackPixels(cdp, screenshotData) {
  const result = await cdp.send('Runtime.evaluate', {
    expression: `(() => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 220 / image.width, 440 / image.height);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, width, height);
        const pixels = context.getImageData(0, 0, width, height).data;
        let blackPixels = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          if (pixels[index] < 8 && pixels[index + 1] < 8 && pixels[index + 2] < 8) blackPixels += 1;
        }
        resolve({ blackPixels, pixelCount: width * height, ratio: blackPixels / (width * height) });
      };
      image.onerror = () => reject(new Error('captured PNG could not be decoded'));
      image.src = 'data:image/png;base64,' + ${JSON.stringify(screenshotData)};
    }))()`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error('captured PNG pixel inspection failed');
  return result.result?.value || { blackPixels: 0, pixelCount: 0, ratio: 0 };
}

async function captureScreenshot(cdp, filePath) {
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const mobileScreen = document.querySelector('#overview .ik-mobile-decision-screen');
      if (mobileScreen) mobileScreen.scrollTop = 0;
      return true;
    })()`,
    returnByValue: true,
  });
  await new Promise((resolve) => setTimeout(resolve, 120));
  let shot = null;
  let lastError = null;
  let visualCheck = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      shot = await withTimeout(
        cdp.send('Page.captureScreenshot', {
          format: 'png',
          fromSurface: true,
          captureBeyondViewport: false,
        }),
        7500,
        `capture screenshot attempt ${attempt}`,
      );
      visualCheck = await withTimeout(
        inspectScreenshotBlackPixels(cdp, shot.data),
        5000,
        `inspect screenshot pixels attempt ${attempt}`,
      );
      if (visualCheck.ratio > 0.02) {
        throw new Error(`captured screenshot contains ${(visualCheck.ratio * 100).toFixed(2)}% unexpected black pixels`);
      }
      break;
    } catch (error) {
      lastError = error;
      shot = null;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 160));
    }
  }
  if (!shot) throw lastError || new Error('screenshot capture failed');
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.from(shot.data, 'base64'));
  return visualCheck;
}

async function runBrowserChecks(args, report, baseUrl) {
  const profiles = args.profile === 'both' ? ['public', 'private'] : [args.profile];
  const browser = await launchBrowser(args, report);
  report.browser = { driver: 'playwright-core', path: browser.browserPath };
  try {
    for (const profile of profiles) {
    const sections = args.sections || (profile === 'private' ? DEFAULT_PRIVATE_SECTIONS : DEFAULT_PUBLIC_SECTIONS);
    for (const scaleScenario of args.scaleScenarios) {
      for (const viewport of args.viewports) {
        let cdp = null;
        const runtimeErrors = [];
        const consoleErrors = [];
        try {
          try {
            cdp = await withTimeout(
              browser.connect(),
              15000,
              `browser connect ${profile}/${scaleScenario}/${viewport.name}`,
            );
          } catch (error) {
            record(report, `browser boot ${profile}/${scaleScenario}/${viewport.name}`, false, {
              profile,
              scaleScenario,
              viewport,
              stage: 'connect',
              error: error.stack || error.message || String(error),
            });
            continue;
          }
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
            await withTimeout(
              navigateWithFixture(cdp, baseUrl, profile, viewport, report, scaleScenario),
              25000,
              `browser navigate ${profile}/${scaleScenario}/${viewport.name}`,
            );
          } catch (error) {
            const bootDiag = await withTimeout(
              collectBootDiagnostics(cdp),
              5000,
              `boot diagnostics ${profile}/${scaleScenario}/${viewport.name}`,
            ).catch((diagError) => ({ error: diagError.message }));
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
            await withTimeout(
              captureScreenshot(cdp, path.join(args.out, `${profile}-${scaleScenario}-${viewport.name}-boot-failure.png`)),
              8000,
              `boot failure screenshot ${profile}/${scaleScenario}/${viewport.name}`,
            ).catch(() => {});
            continue;
          }
          for (const section of sections) {
            const runtimeErrorStart = runtimeErrors.length;
            const consoleErrorStart = consoleErrors.length;
            let sectionActivation = null;
            let inspection = null;
            try {
              sectionActivation = await withTimeout(
                setSection(cdp, section),
                8000,
                `set section ${profile}/${scaleScenario}/${viewport.name}/${section}`,
              );
              inspection = await withTimeout(
                inspectSection(cdp, profile, viewport, section, args, scaleScenario),
                18000,
                `inspect section ${profile}/${scaleScenario}/${viewport.name}/${section}`,
              );
            } catch (error) {
              inspection = {
                pass: false,
                profile,
                scaleScenario,
                viewport,
                requestedSection: section,
                stage: 'inspect',
                error: error.stack || error.message || String(error),
              };
            }
            inspection.runtimeErrorCount = runtimeErrors.length;
            inspection.consoleErrorCount = consoleErrors.length;
            inspection.newRuntimeErrorCount = runtimeErrors.length - runtimeErrorStart;
            inspection.newConsoleErrorCount = consoleErrors.length - consoleErrorStart;
            const structurePass = inspection.pass;
            const openErrorsOk = inspection.newRuntimeErrorCount === 0 && inspection.newConsoleErrorCount === 0;
            const sectionEntryRequired = MAIN_MENU_SECTIONS.includes(section);
            const sectionEntryOk = !sectionEntryRequired || Boolean(
              (sectionActivation && (sectionActivation.linkFound || sectionActivation.linkVisible)) ||
              (inspection.requestedFound && inspection.activeSection === section)
            );
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
            const preScreenshotPass = inspection.pass;
            let screenshotOk = true;
            if (section === 'overview' || args.screenshotAllSections || !preScreenshotPass) {
              const fileName = `${profile}-${scaleScenario}-${viewport.name}-${section}.png`.replace(/[^A-Za-z0-9_.-]+/g, '-');
              const screenshotPath = path.join(args.out, fileName);
              await withTimeout(
                captureScreenshot(cdp, screenshotPath),
                20000,
                `screenshot ${profile}/${scaleScenario}/${viewport.name}/${section}`,
              )
                .then((screenshotVisualCheck) => {
                  inspection.screenshot = fileName;
                  inspection.screenshotVisualCheck = screenshotVisualCheck;
                })
                .catch((error) => {
                  screenshotOk = false;
                  inspection.screenshotOk = false;
                  inspection.screenshotError = error.message;
                  warn(report, `screenshot failed ${profile}/${scaleScenario}/${viewport.name}/${section}`, { error: error.message });
                });
            }
            if (section === 'overview') {
              inspection.screenshotOk = screenshotOk;
              inspection.pass = Boolean(inspection.pass && screenshotOk);
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
          }
        } finally {
          if (cdp) {
            cdp.close();
            if (typeof cdp.closeTarget === 'function') {
              await withTimeout(
                cdp.closeTarget(),
                3000,
                `close browser target ${profile}/${scaleScenario}/${viewport.name}`,
              ).catch((error) => {
                warn(report, `browser target close timed out ${profile}/${scaleScenario}/${viewport.name}`, { error: error.message });
              });
            }
          }
        }
      }
    }
  }
  } finally {
    await withTimeout(browser.stop(), 8000, 'browser stop').catch((error) => {
      warn(report, 'browser stop timed out', { error: error.message });
    });
  }
}

function buildSnapshot(profile, scaleScenario = 'multi') {
  const publicProfile = profile === 'public';
  const now = '2026-05-24T12:00:00Z';
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
      routes: [{ active: true, distance: 1, table: 'main', comment: '' }],
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
      routes: [{ active: true, distance: 2, table: 'main', comment: '' }],
    },
  ];
  const terminals = [
    {
      ip: '10.88.0.21',
      mac: 'AA:BB:CC:00:00:21',
      hostname: 'workstation',
      displayName: 'workstation',
      status: 'reachable',
      connections: 58,
      upRate: 6100000,
      downRate: 48000000,
      lastSeen: '1m',
    },
    {
      ip: '10.88.0.31',
      mac: 'AA:BB:CC:00:00:31',
      hostname: 'nas',
      displayName: 'nas',
      status: 'reachable',
      connections: 22,
      upRate: 21000000,
      downRate: 12000000,
      lastSeen: '30s',
    },
    {
      ip: 'fd00:88::31',
      mac: 'AA:BB:CC:00:00:31',
      hostname: 'nas-ipv6',
      displayName: 'nas-ipv6',
      status: 'reachable',
      connections: 8,
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
      configuredIdentity: 'smoke-router',
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
      clients: [{
        interface: 'ether1',
        status: 'bound',
        usePeerDns: true,
        addDefaultRoute: true,
        defaultRouteDistance: '1',
        dhcpOptions: 'hostname',
        disabled: false,
      }],
    },
    connections: {
      total: 420,
      tcp: 320,
      udp: 92,
      icmp: 8,
      topIps: terminals.map((row) => ({
        ip: row.ip,
        displayName: row.displayName,
        connections: row.connections,
        upRate: row.upRate,
        downRate: row.downRate,
      })),
      active: [
        { localIp: '10.88.0.21', remoteIp: '93.184.216.34', protocol: 'TCP', upRate: 6100000, downRate: 48000000, totalRate: 54100000, sessionBytes: 184000000, timeout: '58s', mark: 'wan-odd' },
        { localIp: '10.88.0.31', remoteIp: '198.51.100.53', protocol: 'UDP', upRate: 21000000, downRate: 12000000, totalRate: 33000000, sessionBytes: 92000000, timeout: '12s', mark: 'wan-even' },
      ],
      protocolTop: [
        { name: 'TCP / wan-odd', protocol: 'TCP', mark: 'wan-odd', connections: 1, upRate: 6100000, downRate: 48000000, totalRate: 54100000, sessionBytes: 184000000, source: 'active-connection-sample' },
        { name: 'UDP / wan-even', protocol: 'UDP', mark: 'wan-even', connections: 1, upRate: 21000000, downRate: 12000000, totalRate: 33000000, sessionBytes: 92000000, source: 'active-connection-sample' },
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
      ipv6Nd: [{ interface: 'bridge-lan', advertiseDns: true, dnsServers: ['fd00:88::1'], managed: false, otherConfig: true, raLifetime: '30m' }],
      ipv6DhcpClients: [{ interface: 'pppoe-wan1', status: 'bound', pool: 'ipv6-pool', prefix: '2001:db8:88::/56', usePeerDns: true, request: 'prefix', addDefaultRoute: true, defaultRouteDistance: '1', dhcpOptions: '' }],
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
      mode: '多线分流 / 策略路由',
      activeLines: 2,
      distribution: [
        { name: 'WAN-1', share: 56, active: true, upRate: 42000000, downRate: 185000000 },
        { name: 'WAN-2', share: 44, active: true, upRate: 37000000, downRate: 138000000 },
      ],
      defaultRoutes: [
        { gateway: 'pppoe-wan1', distance: 1, table: 'main', active: true, comment: 'primary' },
        { gateway: 'pppoe-wan2', distance: 2, table: 'main', active: true, comment: 'backup' },
      ],
      mangleRules: [
        { rawOrder: 1, chain: 'prerouting', action: 'mark-routing', newRoutingMark: 'wan1', inInterface: 'bridge-lan', comment: 'PCC WAN 1', disabled: false },
        { rawOrder: 2, chain: 'prerouting', action: 'mark-routing', newRoutingMark: 'wan2', inInterface: 'bridge-lan', comment: 'PCC WAN 2', disabled: false },
      ],
      routingRules: [{ rawOrder: 1, action: 'lookup-only-in-table', table: 'wan1', srcAddress: '10.88.0.0/24', disabled: false }],
      pccDetected: true,
    },
    routes: {
      items: [
        { dstAddress: '0.0.0.0/0', gateway: 'pppoe-wan1', distance: 1, table: 'main', active: true, static: true, disabled: false, default: true },
        { dstAddress: '0.0.0.0/0', gateway: 'pppoe-wan2', distance: 2, table: 'main', active: true, static: true, disabled: false, default: true },
        { dstAddress: '192.0.2.0/24', gateway: 'bridge-lan', distance: 1, table: 'main', active: true, static: true, disabled: false, default: false },
      ],
      defaultRoutes: [
        { dstAddress: '0.0.0.0/0', gateway: 'pppoe-wan1', distance: 1, table: 'main', active: true, static: true, disabled: false, default: true },
        { dstAddress: '0.0.0.0/0', gateway: 'pppoe-wan2', distance: 2, table: 'main', active: true, static: true, disabled: false, default: true },
      ],
      staticRoutes: [
        { dstAddress: '192.0.2.0/24', gateway: 'bridge-lan', distance: 1, table: 'main', active: true, static: true, disabled: false, default: false },
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
      all: [
        { time: '12:00:01', topics: 'system,info', message: 'smoke fixture ready' },
        { time: '12:01:01', topics: 'firewall,info', message: 'accepted established session' },
        { time: '12:02:01', topics: 'dhcp,info', message: 'lease bound' },
        { time: '12:03:01', topics: 'dns,info', message: 'cache hit' },
      ],
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
    routes: [{ active: running, distance: n, table: n === 1 ? 'main' : `wan-${n}`, comment: '' }],
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
  const history = snapshot.overview && snapshot.overview.history;
  if (history && Array.isArray(history.downlink) && Array.isArray(history.uplink)) {
    const sampleCount = Math.min(history.downlink.length, history.uplink.length);
    const nowSeconds = Math.floor(Date.parse(now) / 1000);
    const wanRows = Array.isArray(snapshot.wan) ? snapshot.wan.filter((row) => row.running !== false && row.disabled !== true) : [];
    const currentDown = wanRows.reduce((total, row) => total + Number(row.downRate || 0), 0);
    const currentUp = wanRows.reduce((total, row) => total + Number(row.upRate || 0), 0);
    const factors = [0.72, 0.81, 0.76, 0.9, 0.94, 1];
    history.downlink = Array.from({ length: sampleCount }, (_, index) => Math.round(currentDown * factors[Math.max(0, factors.length - sampleCount + index)]));
    history.uplink = Array.from({ length: sampleCount }, (_, index) => Math.round(currentUp * factors[Math.max(0, factors.length - sampleCount + index)]));
    history.timestamps = Array.from({ length: sampleCount }, (_, index) => nowSeconds - (sampleCount - 1 - index) * 5);
    snapshot.meta.rateHistoryUpdatedAt = now;
    snapshot.meta.rateHistorySampleCount = sampleCount;
  }
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

function markForwardingInterfacesDown(snapshot) {
  const wanInterfaces = (snapshot.interfaces || []).filter((row) => row.role === 'WAN');
  const affected = [
    { name: 'ether9', type: 'ether', parent: 'switch1', bridge: 'bridge-lan', vlan: 20, pppoeOut: 'pppoe-wan1' },
    { name: 'vlan30', type: 'vlan', parent: 'ether9', bridge: 'bridge-lan', vlan: 30, pppoeOut: 'pppoe-wan2' },
    { name: 'sfp-lan', type: 'sfp', parent: 'switch1', bridge: 'bridge-core', vlan: 40, pppoeOut: 'pppoe-wan3' },
  ].map((row) => ({
    ...row,
    interface: row.name,
    running: false,
    disabled: false,
    role: 'LAN',
    rxRate: 0,
    txRate: 0,
    rxBytes: 0,
    txBytes: 0,
    rxPacket: 0,
    txPacket: 0,
    rxDrop: 0,
    txDrop: 0,
    rxError: 0,
    txError: 0,
  }));
  snapshot.interfaces = [...wanInterfaces, ...affected];
}

function applyNoSnapshotScenario(snapshot) {
  setSnapshotFresh(snapshot);
  snapshot.status = 'error';
  snapshot.error = '无可用快照，RouterOS 当前不可达，无业务快照，业务数据不展示';
  snapshot.meta.realtimeError = 'RouterOS 当前不可达';
  snapshot.meta.slowRestError = '无可用快照';
  snapshot.meta.staticError = '无可用快照';
  snapshot.meta.connectionDetailError = '无可用快照';
  snapshot.meta.connectionProtocolError = '无可用快照';
  snapshot.meta.capabilities.restTrusted = false;
  snapshot.meta.capabilities.sshRead = false;
  snapshot.meta.capabilities.sshLabel = 'SSH 缺依赖';
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
  snapshot.overview.uptime = '业务数据不展示';
  snapshot.overview.cpuLoad = null;
  snapshot.overview.memoryUsage = null;
  snapshot.overview.memoryUsedPercent = null;
  snapshot.overview.diskUsage = null;
  snapshot.overview.diskUsedPercent = null;
  snapshot.overview.systemLoadLevel = 'warning';
  refreshOverviewWanRates(snapshot);
  setFixtureFinding(snapshot, 'critical', 'No snapshot', '无可用快照，RouterOS 当前不可达，无业务快照，业务数据不展示。', [
    { label: '采集', value: '断链' },
    { label: '快照', value: '无可用' },
    { label: 'RouterOS', value: '当前不可达' },
    { label: '业务数据', value: '不展示' },
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
    setFixtureFinding(snapshot, 'critical', 'All WAN offline', '全部 WAN线路离线，默认路由不可用。', [
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
    snapshot.meta.capabilities.sshLabel = 'SSH 缺依赖';
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
    snapshot.overview.history.cpu = [91, 93, 94, 95, 96, 96];
    snapshot.overview.history.memory = [87, 88, 90, 91, 92, 92];
    snapshot.overview.history.disk = [92, 93, 94, 95, 96, 97];
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
    snapshot.error = '3 个转发接口 Down；WAN 与活动默认路由仍有当前记录';
    markForwardingInterfacesDown(snapshot);
    setFixtureFinding(snapshot, 'critical', 'Interfaces down', 'Three forwarding interfaces are down while WAN and route observations remain current.', [
      { label: 'interfacesDown', value: '3' },
      { label: 'wanOnline', value: String((snapshot.wan || []).filter((row) => row.running !== false).length) },
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
    count: row.connections,
    connections: row.connections,
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
  snapshot.loadBalance.activeLines = wan.filter((row) => row.running).length;
  snapshot.loadBalance.mode = wan.length > 1 ? '多线分流 / 策略路由' : '单线路';
  snapshot.routes.defaultRoutes = wan.map((row, index) => ({
    dstAddress: '0.0.0.0/0',
    gateway: row.name,
    distance: index + 1,
    active: row.running,
    static: true,
    disabled: false,
    default: true,
    table: index === 0 ? 'main' : `wan-${index + 1}`,
  }));
  snapshot.routes.items = [...snapshot.routes.defaultRoutes, ...(snapshot.routes.staticRoutes || [])];
  snapshot.loadBalance.defaultRoutes = snapshot.routes.defaultRoutes.map((row) => ({
    gateway: row.gateway,
    distance: row.distance,
    table: row.table,
    active: row.active,
    comment: '',
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
    clients: listScaleMeta(snapshot.dhcp.clients.length, snapshot.dhcp.clients.length),
  };
  if (scaleScenario === 'single' || scaleScenario === 'fleet') {
    setSnapshotFresh(snapshot);
    setCollectionHealthy(snapshot);
    snapshot.meta.capabilities.restTrusted = true;
    snapshot.meta.capabilities.sshRead = true;
    snapshot.meta.capabilities.sshLabel = 'SSH 只读可用';
  }
  if (scaleScenario === 'single') {
    setFixtureFinding(snapshot, 'info', 'Current single WAN snapshot', '单 WAN 1/1 在线，活动默认路由与采集时间均有当前证据。', [
      { label: 'WAN', value: '1/1 在线' },
      { label: '默认路由', value: 'active=true' },
      { label: '采集', value: 'REST + SSH 当前' },
    ]);
  }
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
    const serverNoise = serverLogNoiseProbe(report);
    record(report, 'local server logs stay free of socket reset noise', serverNoise.ok, serverNoise);
    report.finishedAt = new Date().toISOString();
    report.matrix = buildMatrixSummary(report.browserChecks, args);
    const matrixSession = matrixSessionKey();
    const matrixStateFile = matrixStatePath(report.matrix.commit);
    const matrixStartBatch = report.matrix.requestedScenarios.some((scenario) => ['single', 'fleet'].includes(scenario));
    const matrixFinishBatch = report.matrix.requestedScenarios.some((scenario) => EDGE_SCALE_SCENARIOS.includes(scenario));
    const explicitOverviewReleaseMatrix = isOverviewReleaseMatrix(args);
    const currentMatrixRun = summarizeMatrixRun(report, args, {
      ...report.matrix,
      startedAt: report.startedAt,
      finishedAt: report.finishedAt,
    });
    const existingMatrixAggregate = matrixStartBatch ? null : await readJsonIfAny(matrixStateFile);
    const matrixAggregate = mergeMatrixAggregate(
      matrixStartBatch ? null : existingMatrixAggregate,
      report.matrix,
      currentMatrixRun,
      matrixSession
    );
    const releaseMatrixComplete = explicitOverviewReleaseMatrix ? report.matrix.complete : matrixAggregate.complete;
    await writeJson(matrixStateFile, matrixAggregate);
    report.matrix.aggregate = {
      path: matrixStateFile,
      commit: matrixAggregate.commit,
      session: matrixSession,
      outputDir: args.out,
      screenshotDir: args.out,
      screenshots: listScreenshotFiles(args.out),
      complete: matrixAggregate.complete,
      releaseMatrixComplete,
      coveredScenarios: matrixAggregate.coveredScenarios,
      passedScenarios: matrixAggregate.passedScenarios,
      requiredCells: matrixAggregate.requiredCells,
      passedCells: matrixAggregate.passedCells,
      missingCells: (matrixAggregate.requiredCells || []).filter((cell) => !(matrixAggregate.passedCells || []).includes(cell)),
      scenarioMatrix: matrixAggregate.runs.flatMap((run) => run.scenarioMatrix || []),
      runs: matrixAggregate.runs.length,
    };
    if (explicitOverviewReleaseMatrix || matrixFinishBatch || report.matrix.complete) {
      record(report, 'unified release scenario matrix covers required scenarios', releaseMatrixComplete, {
        commit: matrixAggregate.commit,
        session: matrixAggregate.session,
        statePath: matrixStateFile,
        explicitOverviewReleaseMatrix,
        requestedScenarios: report.matrix.requestedScenarios,
        requiredScenarios: matrixAggregate.requiredScenarios,
        currentCoveredScenarios: report.matrix.coveredScenarios,
        currentPassedScenarios: report.matrix.passedScenarios,
        aggregateCoveredScenarios: matrixAggregate.coveredScenarios,
        aggregatePassedScenarios: matrixAggregate.passedScenarios,
        currentRequiredCells: report.matrix.requiredCells,
        currentPassedCells: report.matrix.passedCells,
        aggregateRequiredCells: matrixAggregate.requiredCells,
        aggregatePassedCells: matrixAggregate.passedCells,
        aggregateMissingCells: (matrixAggregate.requiredCells || []).filter((cell) => !(matrixAggregate.passedCells || []).includes(cell)),
        currentRequestedComplete: report.matrix.requestedComplete,
        currentRequiredComplete: report.matrix.complete,
        aggregateComplete: matrixAggregate.complete,
        releaseMatrixComplete,
      });
    }
    const matrixBlocksTopLevelPass = report.matrix.requiredCells.length > 0 && !releaseMatrixComplete;
    if (matrixBlocksTopLevelPass) {
      warn(report, 'top-level pass suppressed until required release matrix is complete', {
        explicitOverviewReleaseMatrix,
        aggregateComplete: matrixAggregate.complete,
        currentRequiredComplete: report.matrix.complete,
        requiredCells: matrixAggregate.requiredCells,
        passedCells: matrixAggregate.passedCells,
        missingCells: report.matrix.aggregate.missingCells,
      });
    }
    report.pass = report.failures.length === 0 && !matrixBlocksTopLevelPass;
    report.exitCodeShouldFail = Boolean(
      report.failures.length ||
      ((explicitOverviewReleaseMatrix || matrixFinishBatch || report.matrix.complete) && !report.pass)
    );
    const safeReport = await prepareReportForJson(report, args.out);
    await writeJson(path.join(args.out, 'report.json'), safeReport);
  }

  console.log(`[INFO] report: ${path.join(args.out, 'report.json')}`);
  console.log(`[INFO] result: ${report.pass ? 'pass' : report.failures.length ? `${report.failures.length} failure(s)` : 'incomplete release matrix'}`);
  process.exitCode = report.exitCodeShouldFail ? 1 : 0;
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
