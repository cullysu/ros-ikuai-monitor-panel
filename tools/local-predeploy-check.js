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
const OVERVIEW_RELEASE_SCALE_SCENARIOS = ['single', 'fleet', ...EDGE_SCALE_SCENARIOS];
const OVERVIEW_RELEASE_VIEWPORTS = [
  { name: 'desktop', width: 1366, height: 900 },
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
  --viewports <list>          Comma list like desktop=1366x900,desktop1440=1440x900,wide=844x390,narrow=390x844.
  --sections <list>           Comma list of sections to visit, or main-menu/public-release.
  --scale-scenarios <list>    Comma list: single,multi,fleet,all-offline,no-snapshot,collection-down,resource-full,interfaces-down. Default: multi; overview-only runs default to release overview matrix.
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

async function waitForAnyJson(candidates, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  const errors = new Map();
  while (Date.now() < deadline) {
    for (const candidate of candidates) {
      try {
        const result = await fetchJson(`${candidate}/json/version`, { timeoutMs: 700 });
        if (result.response.ok) return candidate;
        errors.set(candidate, new Error(`HTTP ${result.response.status}`));
      } catch (error) {
        errors.set(candidate, error);
      }
    }
    await delay(150);
  }
  throw new Error(
    candidates.map((candidate) => `${candidate}: ${errors.get(candidate)?.message || 'not ready'}`).join('; ')
  );
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

function terminateBrowserTree(child) {
  if (!child?.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      windowsHide: true,
      stdio: 'ignore',
      timeout: 8000,
    });
    return;
  }
  if (!child.killed) child.kill('SIGKILL');
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
  if (process.platform === 'win32') {
    // New Edge headless still creates a native HWND; keep it off-screen.
    browserArgs.splice(
      1,
      0,
      '--window-position=-32000,-32000',
      '--window-size=1,1',
    );
  } else {
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

  let devtoolsBaseUrl = '';
  try {
    devtoolsBaseUrl = await waitForAnyJson(
      [`http://127.0.0.1:${port}`, `http://[::1]:${port}`],
      45000
    );
    report.browser.devtoolsBaseUrl = devtoolsBaseUrl;
  } catch (error) {
    terminateBrowserTree(child);
    await fs.rm(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
    const stdoutArtifact = await writeLogArtifact(args.out, 'browser-launch.stdout.log', stdout);
    const stderrArtifact = await writeLogArtifact(args.out, 'browser-launch.stderr.log', stderr);
    report.browser = {
      ...report.browser,
      launchError: error.message,
      exit,
      stdout: summarizeTextArtifact(stdout, stdoutArtifact),
      stderr: summarizeTextArtifact(stderr, stderrArtifact),
    };
    const launchMessage = error instanceof AggregateError
      ? error.errors.map((item) => item?.message || String(item)).join('; ')
      : error.message;
    throw new Error(`Browser CDP endpoint did not become ready: ${launchMessage}`);
  }

  async function connect() {
    let pageTarget = null;
    try {
      const created = await fetchJson(`${devtoolsBaseUrl}/json/new?about:blank`, {
        method: 'PUT',
        timeoutMs: 3000,
      });
      if (created.response.ok && created.json && created.json.webSocketDebuggerUrl) {
        pageTarget = created.json;
      }
    } catch {}
    for (let i = 0; i < 50; i += 1) {
      if (pageTarget) break;
      const { json } = await fetchJson(`${devtoolsBaseUrl}/json/list`, { timeoutMs: 3000 });
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
      await fetchText(`${devtoolsBaseUrl}/json/close/${encodeURIComponent(pageTarget.id)}`, {
        timeoutMs: 2000,
      }).catch(() => {});
    };
    return session;
  }

  return {
    browserPath,
    connect,
    stop: async () => {
      terminateBrowserTree(child);
      await delay(500);
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
    const restSshPairPattern = /(?:REST.*SSH|SSH.*REST)/;
    const hasRestSshPair = (value) => {
      const normalized = normalize(value);
      return normalized.includes('REST') && normalized.includes('SSH');
    };
    const noSnapshotFreshCopyPattern = new RegExp([
      '采样新鲜',
      '数据新鲜',
      '业务正常',
      '业务状态正常',
      '业务数据正常',
      '当前数据正常',
      '当前业务正常',
      '采集正常',
      '采样正常',
      '快照正常',
      '(?:^|[^\\\\u4e00-\\\\u9fffA-Za-z0-9])正常(?:$|[^\\\\u4e00-\\\\u9fffA-Za-z0-9])',
      '距今\\\\s*0s',
      '距今\\\\s*0\\\\s*秒',
      '年龄\\\\s*0s',
      '年龄\\\\s*0\\\\s*秒',
      '上次采样正常',
      '上次采样',
      '以下均为上次采样',
      'WAN\\\\s*0\\\\s*/\\\\s*\\\\d+'
    ].join('|'));
    const overviewActionLabelPattern = /(?:^|\\s|\\|)(?:WAN|采集|资源|路由)(?:\\s|$|\\|)/;
    const overviewActionLabelRepeatPattern = /(?:^|\\s|\\|)(?:WAN|采集|资源|路由)(?:\\s|$|\\|)/g;
    const extractCollectionPair = (value) => {
      const normalized = normalize(value).replaceAll('·', ' / ');
      const parts = normalized.split(' / ');
      const restPart = parts.find((part) => part.includes('REST')) || '';
      const sshPart = parts.find((part) => part.includes('SSH')) || '';
      const restValue = restPart ? restPart.slice(restPart.lastIndexOf('REST') + 4).trim() : '';
      const sshValue = sshPart ? sshPart.slice(sshPart.lastIndexOf('SSH') + 3).trim() : '';
      return { restValue, sshValue };
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
    const overviewDesktopPrimaryText = normalize(overviewDesktopPrimary?.textContent || '');
    const overviewFocusModule = sectionRoot?.querySelector('[data-overview-density-module="resource-focus"], [data-overview-density-module="collection-focus"], [data-overview-density-module="freshness-focus"], [data-overview-density-module="wan-focus"], [data-overview-density-module="route-focus"], [data-overview-density-module="interface-forwarding"], [data-overview-density-module="no-snapshot-focus"]');
    const overviewNoSnapshotGrid = sectionRoot?.querySelector('[data-overview-no-snapshot-grid]');
    const overviewNoSnapshotFlatDetail = sectionRoot?.querySelector('[data-overview-no-snapshot-detail]');
    const overviewNoSnapshotGridItems = Array.from((overviewNoSnapshotGrid || overviewNoSnapshotFlatDetail)?.querySelectorAll('.freshness-item, [data-overview-field], tbody tr') || []);
    const overviewNoSnapshotGridStyle = overviewNoSnapshotGrid ? getComputedStyle(overviewNoSnapshotGrid) : null;
    const overviewNoSnapshotGridColumns = overviewNoSnapshotGridStyle ? overviewNoSnapshotGridStyle.gridTemplateColumns.split(' ').filter(Boolean).length : 0;
    const overviewNoSnapshotEvidenceTable = overviewNoSnapshotGrid?.querySelector('table');
    const overviewNoSnapshotEvidenceTableColumns = overviewNoSnapshotEvidenceTable
      ? Array.from(overviewNoSnapshotEvidenceTable.querySelectorAll('thead th')).length
      : 0;
    const overviewNoSnapshotEvidenceTableRows = overviewNoSnapshotEvidenceTable
      ? Array.from(overviewNoSnapshotEvidenceTable.querySelectorAll('tbody tr'))
      : [];
    const overviewNoSnapshotGridText = normalize((overviewNoSnapshotGrid || overviewNoSnapshotFlatDetail)?.textContent || '');
    const overviewNoSnapshotLegacyDowngradeModules = Array.from(sectionRoot?.querySelectorAll('[data-overview-density-module="no-snapshot-unavailable"]') || []);
    const overviewNoSnapshotLegacyBoundaryModules = Array.from(sectionRoot?.querySelectorAll('[data-overview-density-module="no-snapshot-boundary"]') || []);
    const overviewNoSnapshotSummaryModule = sectionRoot?.querySelector('[data-overview-density-module="no-snapshot-summary"]');
    const overviewNoSnapshotChannelStatusModule = sectionRoot?.querySelector('[data-overview-density-module="no-snapshot-channel-status"]');
    const overviewNoSnapshotLinkStatusModule = sectionRoot?.querySelector('[data-overview-density-module="no-snapshot-link-status"]');
    const overviewNoSnapshotLedgerModule = sectionRoot?.querySelector('[data-overview-density-module="no-snapshot-ledger"]');
    const overviewNoSnapshotModuleVisibilityModule = sectionRoot?.querySelector('[data-overview-density-module="no-snapshot-module-visibility"]');
    const overviewNoSnapshotRecentSuccessModule = sectionRoot?.querySelector('[data-overview-density-module="no-snapshot-recent-success"]');
    const overviewNoSnapshotReadonlyBoundaryModule = sectionRoot?.querySelector('[data-overview-density-module="no-snapshot-readonly-boundary"]');
    const overviewNoSnapshotDegradedModulesModule = sectionRoot?.querySelector('[data-overview-density-module="no-snapshot-degraded-modules"]');
    const overviewNoSnapshotRawEvidenceModule = sectionRoot?.querySelector('[data-overview-density-module="evidence-boundary"][data-overview-evidence-mode]');
    const overviewNoSnapshotTrustLevelModule = sectionRoot?.querySelector('[data-overview-density-module="no-snapshot-trust-level"]');
    const overviewNoSnapshotBoundaryDegradeModule = sectionRoot?.querySelector('[data-overview-density-module="no-snapshot-boundary-degrade"]');
    const overviewNoSnapshotTimelineModule = sectionRoot?.querySelector('[data-overview-density-module="no-snapshot-collection-timeline"]');
    const overviewNoSnapshotTrustModules = Array.from(sectionRoot?.querySelectorAll('[data-overview-density-module="no-snapshot-trust-level"]') || []);
    const overviewNoSnapshotCoreModuleNodes = [
      overviewNoSnapshotSummaryModule,
      overviewNoSnapshotModuleVisibilityModule,
      overviewNoSnapshotRecentSuccessModule,
    ].filter(Boolean);
    const overviewNoSnapshotCoreModuleText = normalize(overviewNoSnapshotCoreModuleNodes
      .map((node) => node.textContent || '')
      .join(' '));
    const overviewNoSnapshotDowngradeModule = overviewNoSnapshotBoundaryDegradeModule || overviewNoSnapshotModuleVisibilityModule || overviewNoSnapshotLegacyDowngradeModules[0] || null;
    const overviewNoSnapshotDowngradeText = normalize(overviewNoSnapshotDowngradeModule?.textContent || '');
    const overviewNoSnapshotBoundaryModule = overviewNoSnapshotBoundaryDegradeModule || overviewNoSnapshotModuleVisibilityModule || overviewNoSnapshotTrustLevelModule || overviewNoSnapshotLegacyBoundaryModules[0] || null;
    const overviewNoSnapshotBoundaryText = normalize([
      overviewNoSnapshotCoreModuleText,
      overviewNoSnapshotBoundaryModule?.textContent || '',
      overviewNoSnapshotRecentSuccessModule?.textContent || '',
      overviewNoSnapshotTimelineModule?.textContent || '',
    ].join(' '));
    const overviewNoSnapshotBoundaryDegradeRowCount = overviewNoSnapshotBoundaryDegradeModule
      ? overviewNoSnapshotBoundaryDegradeModule.querySelectorAll('tbody tr, .ik-overview-module-cell').length
      : 0;
    const overviewNoSnapshotTimelineRowCount = overviewNoSnapshotTimelineModule
      ? overviewNoSnapshotTimelineModule.querySelectorAll('tbody tr').length
      : 0;
    const overviewNoSnapshotBoundaryDegradeHeaderText = normalize(
      Array.from(overviewNoSnapshotBoundaryDegradeModule?.querySelectorAll('thead th') || [])
        .map((node) => node.textContent || '')
        .join(' ')
    );
    const overviewNoSnapshotBoundaryTitleCount = Array.from(sectionRoot?.querySelectorAll('.ik-overview-flat-title, .ik-overview-subtable-title, .card-title') || [])
      .map((node) => normalize(node.textContent || ''))
      .filter((value) => value === '只读边界').length;
    const overviewNoSnapshotEvidenceLayoutOk = Boolean(
      (overviewNoSnapshotGrid || overviewNoSnapshotFlatDetail || overviewNoSnapshotBoundaryModule) &&
      (
        overviewNoSnapshotGridColumns >= 3 ||
        (overviewNoSnapshotEvidenceTable && overviewNoSnapshotEvidenceTableColumns >= 3 && overviewNoSnapshotEvidenceTableRows.length >= 4) ||
        (overviewNoSnapshotFlatDetail?.querySelectorAll('tbody tr').length >= 4) ||
        /采集链路账本|采集链路|快照账本|模块可见性|降级模块|只读边界/.test([overviewNoSnapshotGridText, overviewNoSnapshotDowngradeText, overviewNoSnapshotBoundaryText].join(' '))
      )
    );
    const overviewDesktopEvidenceScope = sectionRoot?.querySelector('[data-overview-summary], [data-overview-desktop-detail]')
      ? sectionRoot
      : null;
    const operatorGrid = sectionRoot?.querySelector('.ik-home-operator-grid');
    const operatorCards = Array.from(operatorGrid?.querySelectorAll('.ik-home-operator-card') || []);
    const operatorText = normalize(operatorGrid?.textContent || '');
    const isOperatorHome = sectionName === 'overview' && Boolean(
      (overviewSummaryShell && overviewSummaryMain) ||
      (sectionRoot?.querySelector('[data-overview-status-bar]') && sectionRoot?.querySelector('[data-overview-desktop-detail]'))
    );
    const isDesktopOverview = sectionName === 'overview' && window.innerWidth >= 1024;
    const isCurrent35Home = sectionName === 'overview' && Boolean(
      overviewSummaryShell && overviewSummaryMain ||
      sectionRoot?.querySelector('.ik-home-layout, [data-overview-verdict-panel]') ||
      (sectionRoot?.querySelector('[data-overview-status-bar]') && sectionRoot?.querySelector('[data-overview-desktop-detail]'))
    );
    const overviewOperatorHomeOk = sectionName !== 'overview' || Boolean(
      overviewSummaryShell &&
      (
        overviewSummaryMain ||
        sectionRoot?.querySelector('[data-overview-status-bar]')
      ) &&
      /结论|风险|WAN|资源|采集|证据|REST|SSH/.test(normalize(overviewSummaryShell.textContent || ''))
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
      /样本不足，趋势暂不可用|样本\\s*\\d+\\/6，趋势暂不可用/.test(text) ||
      /采样陈旧|历史快照/.test(text) ||
      (isEdgeScenario && /无可用快照|快照缺失|采集状态异常|采集降级|通道异常|通道状态|REST 待确认|SSH 不可用|SSH 采集不可用|接口全 Down|全部接口离线|WAN 全离线|资源满载|资源高负载/.test(text))
    );
    const overviewAxesOk = sectionName !== 'overview' || !isDesktopOverview || (
      (wanAxisLabels.length >= 3 && monitorAxisLabels.length >= 6) ||
      overviewSamplingFallbackOk
    );
    const monitorSplit = sectionRoot?.querySelector('[data-monitor-split-charts], .ik-wan-rate-split.is-main');
    const monitorPanels = Array.from(monitorSplit?.querySelectorAll('[data-monitor-chart], .ik-wan-rate-card') || []);
    const monitorSplitColumns = monitorSplit ? getComputedStyle(monitorSplit).gridTemplateColumns.split(' ').filter(Boolean).length : 0;
    const monitorSplitText = normalize(monitorSplit?.textContent || '');
    const overviewMonitorSceneBypassOk = Boolean(
      (noSnapshotEdge && overviewNoSnapshotCoreModuleNodes.length >= 5) ||
      (
        (scaleScenario === 'resource-full' || scaleScenario === 'resource-load') &&
        sectionRoot?.querySelector('[data-overview-density-module="resource-risk-priority"]') &&
        sectionRoot?.querySelector('[data-overview-density-module="resource-pressure-bars"]') &&
        sectionRoot?.querySelector('[data-overview-density-module="resource-interface-top5"]')
      ) ||
      (
        scaleScenario === 'all-offline' &&
        sectionRoot?.querySelector('[data-overview-density-module="wan-offline-bars"]') &&
        sectionRoot?.querySelector('[data-overview-density-module="wan-route-ledger"]')
      )
    );
    const overviewMonitorSplitOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      overviewMonitorSceneBypassOk ||
      sectionRoot?.querySelector('.ro-semantic-wan-trend') ||
      overviewFocusModule ||
      overviewNoSnapshotGrid ||
      sectionRoot?.querySelector('[data-overview-desktop-detail] .ops-table-wrap') ||
      sectionRoot?.querySelector('[data-overview-density-module="freshness"]') ||
      sectionRoot?.querySelector('[data-overview-detail-section="table"]') ||
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
    const overviewTrendReadoutNodes = Array.from(sectionRoot?.querySelectorAll('[data-overview-trend-readout]') || []);
    const overviewTrendReadoutOk = sectionName !== 'overview' || isOperatorHome || Boolean(
      overviewTrendReadoutNodes.length >= 2 &&
      overviewTrendReadoutNodes.every((node) => node.querySelectorAll('.ik-overview-trend-cell').length >= 6)
    );    const protocolRank = sectionRoot?.querySelector('[data-protocol-rank]');
    const protocolRankText = normalize(protocolRank?.textContent || '');
    const overviewProtocolRankOk = sectionName !== 'overview' || isCurrent35Home || Boolean(
      protocolRank &&
      /TCP|UDP|ICMP/.test(protocolRankText) &&
      !protocolRankText.includes('当前暂无协议/应用流量') &&
      !protocolRankText.includes('当前暂无数据')
    );
    const overviewTop5RowsNodes = Array.from(sectionRoot?.querySelectorAll('[data-overview-normalized]') || []);
    const overviewTop5ReadoutOk = sectionName !== 'overview' || isCurrent35Home || Boolean(
      overviewTop5RowsNodes.length === 0 ||
      (
        sectionRoot?.querySelector('[data-overview-top5-total]') &&
        overviewTop5RowsNodes.every((node) => {
          const share = Number.parseFloat(node.getAttribute('data-overview-share') || '');
          const normalized = Number.parseFloat(node.getAttribute('data-overview-normalized') || '');
          return Number.isFinite(share) && share >= 0 && share <= 100 &&
            Number.isFinite(normalized) && normalized >= 0 && normalized <= 100;
        })
      )
    );    const detailFeedbackOk = !detailSections.has(sectionName) || isCurrent35Shell || Boolean(sectionRoot?.querySelector('[data-scale-filter-summary]') && sectionRoot?.querySelector('[data-scale-clear]'));
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
    const overviewDesktopDenseNodes = overviewDesktopEvidenceScope
      ? Array.from(overviewDesktopEvidenceScope.querySelectorAll('tbody tr, .ik-home-evidence-row, .ik-summary-box, [data-overview-field]'))
      : [];
    const overviewDesktopDenseRows = overviewDesktopDenseNodes.length;
    const overviewNoSnapshotDetailModules = overviewDesktopDetail
      ? ['no-snapshot-focus', 'no-snapshot-unavailable', 'no-snapshot-channel', 'no-snapshot-business', 'no-snapshot-evidence', 'signal-coverage', 'freshness', 'rank'].filter((name) => overviewDesktopDetail.querySelector('[data-overview-density-module="' + name + '"]')).length
      : 0;
    const overviewStateModule = sectionRoot?.querySelector([
      '[data-overview-density-module="state-table"]',
      '[data-overview-density-module="wan-health"]',
      '[data-overview-density-module="session-snapshot"]',
      '[data-overview-density-module="signal-coverage"]',
      '[data-overview-density-module="freshness"]'
    ].join(','));
    const overviewEvidenceModule = Boolean(
      overviewNoSnapshotGrid ||
      overviewFocusModule ||
      overviewStateModule ||
      sectionRoot?.querySelector('[data-overview-default-routes]') ||
      sectionRoot?.querySelector('[data-overview-wan-mini-table]') ||
      sectionRoot?.querySelector('[data-overview-density-module="resource-focus"]') ||
      sectionRoot?.querySelector('[data-overview-density-module="collection-focus"]') ||
      overviewDensityModules.length >= 3
    );
    const overviewStatusBar = sectionRoot?.querySelector('[data-overview-status-bar]');
    const overviewVerdictPanel = sectionRoot?.querySelector('[data-overview-verdict-panel]');
    const overviewMainVerdict = sectionRoot?.querySelector('[data-overview-main-verdict]') || overviewSummaryMain;
    const overviewIncidentLine = sectionRoot?.querySelector('[data-overview-incident-line]');
    const overviewAnomalyEvidence = sectionRoot?.querySelector('[data-overview-anomaly-evidence]');
    const overviewPriorityPanel = sectionRoot?.querySelector('[data-overview-priority-panel]');
    const overviewNextActions = sectionRoot?.querySelector('[data-overview-next-actions]');
    const overviewActionCueText = normalize(overviewNextActions?.textContent || '');
    const overviewActionCueOk = !overviewNextActions || overviewActionLabelPattern.test(overviewActionCueText);
    const overviewVerdictStatusBus = sectionRoot?.querySelector('[data-overview-verdict-status-bus]');
    const overviewStatusBarText = normalize(overviewStatusBar?.textContent || '');
    const overviewNoSnapshotStatusBarCells = Array.from(overviewStatusBar?.querySelectorAll('.ik-home-ops-item, [data-overview-status-cell]') || []);
    const overviewNoSnapshotVisibleStatusBarCells = overviewNoSnapshotStatusBarCells.filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    });
    const overviewNoSnapshotStatusBarLabels = overviewNoSnapshotVisibleStatusBarCells.map((node) => normalize(node.querySelector('span')?.textContent || ''));
    const overviewNoSnapshotTopbarOk = sectionName !== 'overview' || !isDesktopOverview || !noSnapshotEdge || Boolean(
      overviewNoSnapshotVisibleStatusBarCells.length === 6 &&
      overviewNoSnapshotStatusBarLabels.join('|') === '结论|设备|RouterOS|REST|SSH|最近成功' &&
      !/\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}/.test(overviewStatusBarText) &&
      !/业务数据待确认|业务数据不可判定|业务快照\\s*0s/.test(overviewStatusBarText) &&
      !/设备\\s*(?:127\\.0\\.0\\.1|localhost|::1)/i.test(overviewStatusBarText)
    );
    const overviewVerdictText = normalize([
      overviewVerdictPanel?.textContent || '',
      overviewSummaryShell?.textContent || '',
      overviewStatusBarText,
    ].filter(Boolean).join(' '));
    const overviewDrilldownLinkNodes = Array.from(sectionRoot?.querySelectorAll([
      '.ik-home-action-link',
      '.ik-mobile-flat-link',
      '.ik-mobile-incident-action',
    ].join(',')) || []);
    const overviewMainVerdictRect = overviewMainVerdict?.getBoundingClientRect();
    const overviewIncidentLineRect = overviewIncidentLine?.getBoundingClientRect();
    const overviewDesktopRect = sectionRoot?.getBoundingClientRect();
    const overviewDesktopDetailText = normalize(overviewDesktopDetail?.textContent || '');
    const overviewDesktopDetailRows = overviewDesktopDetail
      ? Array.from(overviewDesktopDetail.querySelectorAll('tbody tr, .ik-home-evidence-row, .ik-summary-box, [data-overview-field]') || [])
      : [];
    const overviewDesktopDetailFirstTwoRowsVisible = overviewDesktopDetailRows.length >= 2 &&
      overviewDesktopDetailRows.slice(0, 2).every((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0';
      });
    const overviewDesktopTrendCard = sectionRoot?.querySelector('[data-overview-density-module="wan-trend"]');
    const overviewDesktopWanIncidentLedger = sectionRoot?.querySelector('[data-overview-density-module="wan-offline-bars"], [data-overview-density-module="wan-incident-ledger"]');
    const overviewDesktopCollectionLedger = sectionRoot?.querySelector('[data-overview-density-module="collection-focus"], [data-overview-density-module="collection-channel-ledger"], [data-overview-density-module="freshness"], [data-overview-density-module="collection-cache-ledger"], [data-overview-density-module="collection-cache-boundary"], [data-overview-density-module="collection-recent-failures"]');
    const overviewDesktopInterfaceFocusCard = sectionRoot?.querySelector('[data-overview-density-module="interface-forwarding"]');
    const overviewDesktopScenarioTrendOk = noSnapshotEdge
      ? Boolean(
        overviewNoSnapshotFlatDetail &&
        overviewNoSnapshotCoreModuleNodes.length >= 5
      )
      : scaleScenario === 'resource-full' || scaleScenario === 'resource-load'
        ? Boolean(
          sectionRoot?.querySelector('[data-overview-density-module="resource-risk-priority"]') &&
          sectionRoot?.querySelector('[data-overview-density-module="resource-pressure-bars"]') &&
          sectionRoot?.querySelector('[data-overview-density-module="resource-interface-top5"]')
        )
      : scaleScenario === 'interfaces-down'
        ? Boolean(overviewDesktopInterfaceFocusCard)
      : scaleScenario === 'collection-down'
        ? Boolean(overviewDesktopCollectionLedger)
      : scaleScenario === 'all-offline'
        ? Boolean(overviewDesktopWanIncidentLedger)
        : Boolean(overviewDesktopTrendCard || overviewDesktopWanIncidentLedger || overviewDesktopCollectionLedger);
    const overviewDesktopRankGrid = sectionRoot?.querySelector('[data-overview-rank-grid]');
    const overviewDesktopRankOptional = ['resource-full', 'resource-load', 'no-snapshot', 'interfaces-down', 'all-offline', 'collection-down', 'fleet'].includes(scaleScenario);
    const overviewDesktopRankRequirementOk = Boolean(overviewDesktopRankGrid || overviewDesktopRankOptional);
    const overviewDesktopCollectionFocus = sectionRoot?.querySelector('[data-overview-density-module="collection-focus"]');
    const overviewDesktopCollectionText = normalize(overviewDesktopCollectionFocus?.textContent || '');
    const overviewDesktopCollectionMainRow = overviewDesktopCollectionFocus?.querySelector('.ik-home-trend-compact.is-bar');
    const overviewDesktopCollectionMainColumns = overviewDesktopCollectionMainRow ? getComputedStyle(overviewDesktopCollectionMainRow).gridTemplateColumns.split(' ').filter(Boolean).length : 0;
    const overviewDesktopCollectionMainBoxes = Array.from(overviewDesktopCollectionMainRow?.querySelectorAll('.ik-summary-box') || []);
    const overviewSceneSpecificDesktopDensityOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      (
        noSnapshotEdge &&
        overviewStatusBar &&
        overviewSummaryShell &&
        overviewNoSnapshotCoreModuleNodes.every(Boolean) &&
        overviewNoSnapshotCoreModuleNodes.length === 3 &&
        overviewNoSnapshotCoreModuleNodes.filter(nodeVisibleInFirstScreen).length === 3 &&
        overviewNoSnapshotRawEvidenceModule &&
        nodeVisibleInFirstScreen(overviewNoSnapshotRawEvidenceModule) &&
        /采集链路图|采集链路/.test(overviewNoSnapshotCoreModuleText) &&
        /业务数据不可判|业务可信边界|模块可见性/.test(overviewNoSnapshotCoreModuleText) &&
        /恢复线索/.test(overviewNoSnapshotCoreModuleText) &&
        /RouterOS/.test(overviewNoSnapshotCoreModuleText) &&
        /REST/.test(overviewNoSnapshotCoreModuleText) &&
        /SSH/.test(overviewNoSnapshotCoreModuleText) &&
        /只读/.test(overviewNoSnapshotCoreModuleText) &&
        !overviewNoSnapshotCoreModuleText.includes('WAN 速率') &&
        !overviewNoSnapshotCoreModuleText.includes('WAN速率') &&
        !overviewNoSnapshotCoreModuleText.includes('0 B/s')
      ) ||
      (
        scaleScenario === 'resource-full' &&
        overviewStatusBar &&
        overviewSummaryShell &&
        sectionRoot?.querySelector('[data-overview-density-module="resource-risk-priority"]') &&
        sectionRoot?.querySelector('[data-overview-density-module="resource-pressure-bars"]') &&
        sectionRoot?.querySelector('[data-overview-density-module="resource-interface-top5"]') &&
        sectionRoot?.querySelectorAll('[data-overview-density-module="resource-pressure-bars"] .ik-overview-bar-row').length >= 8 &&
        sectionRoot?.querySelectorAll('[data-overview-density-module="resource-interface-top5"] [data-overview-share][data-overview-normalized]').length >= 5 &&
        /CPU|MEM|DISK|资源满载|资源压力/.test(text)
      ) ||
      (
        scaleScenario === 'all-offline' &&
        overviewStatusBar &&
        overviewSummaryShell &&
        sectionRoot?.querySelector('[data-overview-density-module="wan-offline-bars"]') &&
        sectionRoot?.querySelector('[data-overview-density-module="wan-offline-continuity"]') &&
        sectionRoot?.querySelector('[data-overview-density-module="wan-route-ledger"]') &&
        (/WAN\\s*0\\/\\d+/.test(text) || text.includes('WAN全离线') || text.includes('WAN 全离线')) &&
        /默认路由|RouterOS/.test(text)
      ) ||
      (
        scaleScenario === 'collection-down' &&
        overviewStatusBar &&
        overviewSummaryShell &&
        sectionRoot?.querySelector('[data-overview-density-module="collection-focus"]') &&
        sectionRoot?.querySelector('[data-overview-density-module="collection-recent-failures"]') &&
        /REST|SSH|缓存快照|最近成功/.test(text)
      )
    );
    const overviewNormalEvidenceDownshift = isDesktopOverview &&
      (scaleScenario === 'single' || scaleScenario === 'fleet') &&
      Boolean(
        overviewDesktopDetail?.querySelector('[data-overview-density-module="terminal-ranking"]') &&
        overviewDesktopDetail?.querySelector('[data-overview-density-module="evidence-boundary"]') &&
        !overviewDesktopDetail?.querySelector('[data-overview-density-module="normal-ops-ledger"]')
      );
    const overviewDesktopDensityOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      overviewSceneSpecificDesktopDensityOk ||
      (
        overviewStatusBar &&
        overviewSummaryShell &&
        overviewDesktopDetail &&
        overviewDesktopScenarioTrendOk && overviewTrendReadoutOk &&
        overviewDesktopRankRequirementOk && overviewTop5ReadoutOk &&
        (overviewStatusBar.querySelectorAll('.ik-home-ops-item, [data-overview-field]').length >= (noSnapshotEdge ? 6 : 4)) &&
        (
          overviewNoSnapshotGridItems.length >= 6 ||
          overviewSummaryShell.querySelectorAll('.ik-summary-box, [data-overview-field]').length >= 6
        ) &&
        (overviewDensityModules.length >= 3 || overviewDesktopDenseRows >= 24 || (noSnapshotEdge && overviewDensityModules.length >= 3 && overviewNoSnapshotGridItems.length >= 6)) &&
        (
          overviewDesktopDetail.querySelectorAll('tbody tr, .ik-home-evidence-row, .ik-summary-box').length >= 6 ||
          overviewDesktopDenseRows >= 24 ||
          overviewNoSnapshotGridItems.length >= (noSnapshotEdge ? 6 : 8) ||
          (scaleScenario === 'resource-full' && overviewDensityModules.length >= 4) ||
          (scaleScenario === 'interfaces-down' && overviewDesktopDetailRows.length >= 6)
        ) &&
        overviewDesktopDetailFirstTwoRowsVisible &&
        (text.length >= (overviewNormalEvidenceDownshift ? 620 : 750) || (noSnapshotEdge && text.length >= 560))
      )
    );
    const overviewDesktopModuleSpreadOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      overviewSummaryShell &&
      overviewStatusBar &&
      overviewDesktopDetail &&
      overviewDesktopScenarioTrendOk && overviewTrendReadoutOk &&
      overviewDesktopRankRequirementOk && overviewTop5ReadoutOk &&
      overviewDesktopDetailFirstTwoRowsVisible &&
      (
        overviewDensityModules.length >= 3 ||
        overviewDesktopDenseRows >= 24 ||
        (noSnapshotEdge && overviewNoSnapshotGridItems.length >= 6)
      )
    );
    const mobileAlert = sectionRoot?.querySelector('[data-overview-mobile-alert]');
    const mobileConsole = sectionRoot?.querySelector('[data-overview-mobile-console]');
    const mobileFlatStatus = sectionRoot?.querySelector('[data-overview-mobile-flat-status], [data-overview-mobile-section="status-summary"], .ik-mobile-status-ledger');
    const mobilePrimaryCardGrid = mobileFlatStatus?.querySelector('[data-overview-mobile-primary-cards]') || sectionRoot?.querySelector('[data-overview-mobile-primary-cards]');
    const mobilePrimaryCards = Array.from(mobilePrimaryCardGrid?.querySelectorAll('[data-overview-mobile-primary-card]') || []);
    const mobilePrimaryCardKeys = mobilePrimaryCards.map((node) => String(node.getAttribute('data-overview-mobile-primary-card') || ''));
    const mobilePrimaryCardTitles = mobilePrimaryCards
      .map((node) => normalize(node.querySelector('[data-overview-mobile-primary-title]')?.textContent || ''))
      .filter(Boolean);
    const mobilePrimaryConclusionCard = mobilePrimaryCards.find((node) => node.getAttribute('data-overview-mobile-primary-card') === 'conclusion') || mobileFlatStatus?.querySelector('[data-overview-mobile-primary-card="conclusion"]');
    const mobilePrimaryObjectCard = mobilePrimaryCards.find((node) => node.getAttribute('data-overview-mobile-primary-card') === 'object') || mobileFlatStatus?.querySelector('[data-overview-mobile-primary-card="object"]');
    const mobileEntryFooter = mobileFlatStatus?.querySelector('[data-overview-mobile-entry-footer]') || sectionRoot?.querySelector('[data-overview-mobile-entry-footer]');
    const mobileIncident = sectionRoot?.querySelector('[data-overview-mobile-incident]') || mobileFlatStatus;
    const mobileLeadPreview = sectionRoot?.querySelector('[data-overview-mobile-detail-section]');
    const mobileLeadIsInterfaceTable = Boolean(mobileLeadPreview?.classList?.contains('is-interface-table'));
    const mobileLeadPreviewTitle = normalize(mobileLeadPreview?.querySelector('.ik-mobile-section-head')?.textContent || '');
    const mobileLeadPreviewText = normalize(mobileLeadPreview?.textContent || '');
    const mobileFlatStatusText = normalize(mobileFlatStatus?.textContent || '');
    const mobileCoreBlocks = Array.from(mobileFlatStatus?.querySelectorAll('[data-overview-mobile-core-block]') || []);
    const mobileCoreBlockKeys = mobileCoreBlocks.map((node) => String(node.getAttribute('data-overview-mobile-core-block') || ''));
    const mobileCoreBlockText = normalize(mobileCoreBlocks.map((node) => node.textContent || '').join(' '));
    const mobileCoreBars = Array.from(mobileFlatStatus?.querySelectorAll('[data-overview-mobile-core-block] .ik-mobile-microbar') || []);
    const mobileFlatRows = Array.from(mobileFlatStatus?.querySelectorAll('[data-overview-mobile-flat-row]') || []);
    const mobileLeadRows = Array.from(mobileLeadPreview?.querySelectorAll('.ik-mobile-detail-row:not(.is-head), .ik-mobile-wan-row:not(.is-head)') || []);
    const mobileTerminalSmallNodes = Array.from(sectionRoot?.querySelectorAll('.ik-mobile-detail-row.is-terminal small') || []);
    let visibleMobileTerminalSmallNodes = [];
    let overviewMobileTerminalSingleLineOk = true;
    const mobileFlatLinkTexts = Array.from(mobileFlatStatus?.querySelectorAll('.ik-mobile-flat-link') || [])
      .map((node) => normalize(node.textContent || ''))
      .filter(Boolean);
    const mobileAllowedActionLabels = new Set(['WAN明细', '采集状态', '资源阈值', '路由快照']);
    const mobileFlatLinkLabelsOk = mobileFlatLinkTexts.length === 0 || (
      mobileFlatLinkTexts.length >= 1 &&
      mobileFlatLinkTexts.length <= 2 &&
      new Set(mobileFlatLinkTexts).size === mobileFlatLinkTexts.length &&
      mobileFlatLinkTexts.every((label) => mobileAllowedActionLabels.has(label))
    );
    const mobileFlatSuggestionCopyOk = !/建议查看\\s+建议：|建议查看\\s+建议查看|建议：\\s+建议：/.test([
      mobileFlatStatusText,
      mobileFlatLinkTexts.join(' '),
    ].join(' '));
    const mobileAlertText = normalize(mobileAlert?.textContent || '');
    const mobileAlertPrimaryText = normalize(
      mobileAlert?.querySelector('.ik-mobile-head-item.is-primary')?.textContent ||
      mobileFlatStatus?.querySelector('[data-overview-mobile-flat-row="status"] .tag')?.textContent ||
      ''
    );
    const mobileFlatStatusRow = mobilePrimaryConclusionCard || mobileFlatStatus?.querySelector('[data-overview-mobile-flat-row="status"]');
    const mobileFlatFactsRow = mobileFlatStatus?.querySelector('[data-overview-mobile-flat-row="facts"]');
    const mobileFlatDeviceRow = mobileFlatStatus?.querySelector('[data-overview-mobile-flat-row="device"]');
    const mobileFlatTrustRow = mobileFlatStatus?.querySelector('[data-overview-mobile-flat-row="recent-success"]') || mobileFlatStatus?.querySelector('[data-overview-mobile-flat-row="trust"]');
    const mobileFlatFactCells = Array.from(mobileFlatStatus?.querySelectorAll('.ik-mobile-fact') || []);
    const mobileFlatObjectRow = mobilePrimaryObjectCard || mobileFlatStatus?.querySelector('[data-overview-mobile-flat-row="object"]') || mobileFlatFactsRow;
    const mobileFlatEvidenceRow = mobileFlatStatus?.querySelector('[data-overview-mobile-flat-row="evidence"]') || mobileCoreBlocks[0] || mobileFlatStatusRow;
    const mobileFlatEntryRow = mobileEntryFooter || mobileFlatStatus?.querySelector('[data-overview-mobile-flat-row="entry"]');
    const mobileIncidentTitle = mobileIncident?.querySelector('.ik-mobile-incident-title') || mobileFlatEvidenceRow || mobileFlatStatusRow;
    const mobileIncidentTitleText = normalize(mobileIncidentTitle?.textContent || '');
    const mobileFlatStatusRowText = normalize(mobileFlatStatusRow?.textContent || '');
    const mobileFlatDeviceRowText = normalize(mobileFlatDeviceRow?.textContent || '');
    const mobileFlatObjectRowText = normalize(mobileFlatObjectRow?.textContent || '');
    const mobileFlatEvidenceRowText = normalize(mobileFlatEvidenceRow?.textContent || mobileCoreBlockText);
    const mobileFlatTrustRowText = normalize(mobileFlatTrustRow?.textContent || '');
    const mobileFlatEntryRowText = normalize(mobileFlatEntryRow?.textContent || '');
    const mobileFlatLedgerText = [mobileFlatStatusRowText, mobileFlatDeviceRowText, mobileFlatObjectRowText, mobileCoreBlockText, mobileFlatEvidenceRowText, mobileFlatTrustRowText, mobileFlatEntryRowText, mobilePrimaryCardTitles.join(' ')].join(' ');
    const mobilePrimaryCardLayoutOk = Boolean(
      mobilePrimaryCardGrid &&
      mobilePrimaryCards.length === 2 &&
      mobilePrimaryCardKeys.includes('conclusion') &&
      mobilePrimaryCardKeys.includes('object') &&
      mobilePrimaryCardTitles.includes('结论') &&
      mobilePrimaryCardTitles.includes('对象') &&
      mobilePrimaryConclusionCard &&
      mobilePrimaryObjectCard &&
      (() => {
        const [firstCard, secondCard] = mobilePrimaryCards;
        if (!firstCard || !secondCard) return false;
        const firstRect = firstCard.getBoundingClientRect();
        const secondRect = secondCard.getBoundingClientRect();
        return firstRect.width > 0 &&
          firstRect.height > 0 &&
          secondRect.width > 0 &&
          secondRect.height > 0 &&
          secondRect.top >= firstRect.bottom - 2 &&
          Math.abs(firstRect.left - secondRect.left) <= 4;
      })() &&
      (!mobileEntryFooter || mobileEntryFooter.closest('[data-overview-mobile-primary-card="conclusion"]') === mobilePrimaryConclusionCard)
    );
    const mobileFlatRowCountOk = mobilePrimaryCardLayoutOk;
    const mobileFlatEntryOk = Boolean(
      mobileEntryFooter &&
      mobilePrimaryConclusionCard &&
      mobileEntryFooter.closest('[data-overview-mobile-primary-card="conclusion"]') === mobilePrimaryConclusionCard &&
      mobileFlatLinkTexts.length >= 1 &&
      mobileFlatLinkTexts.length <= 2 &&
      /入口/.test(mobileFlatEntryRowText) &&
      mobileFlatLinkTexts.every((label) => mobileAllowedActionLabels.has(label)) &&
      !/建议查看|建议：|动作/.test(mobileFlatEntryRowText)
    );
    const mobileIncidentTitleLeadText = normalize(
      mobileIncident?.querySelector('.ik-mobile-incident-copy > div:first-child')?.textContent ||
      mobileIncident?.querySelector('.ik-mobile-incident-title > div:first-child')?.textContent ||
      (mobileFlatStatusRow ? '结论' : '') ||
      mobileFlatStatusRow?.textContent ||
      ''
    );
    const mobileIncidentTitleSupportText = normalize(
      mobileIncident?.querySelector('.ik-mobile-incident-copy > div:last-child')?.textContent ||
      mobileIncident?.querySelector('.ik-mobile-incident-title > div:last-child')?.textContent ||
      (mobileFlatEvidenceRow ? mobileFlatEvidenceRowText : '') ||
      mobileLeadPreview?.querySelector('.ik-mobile-section-head')?.textContent ||
      ''
    );
    const mobileIncidentEvidenceRows = Array.from(mobileIncident?.querySelectorAll('.ik-mobile-incident-evidence > div, [data-overview-mobile-flat-row]') || [])
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
    const mobileIncidentAction = mobileIncident?.querySelector('.ik-mobile-incident-title [data-overview-action-label], [data-overview-action-label]');
    const mobileAlertRect = mobileAlert?.getBoundingClientRect();
    const mobileFlatStatusRect = mobileFlatStatus?.getBoundingClientRect();
    const mobileIncidentRect = mobileIncident?.getBoundingClientRect();
    const mobileMetrics = sectionRoot?.querySelector('[data-overview-mobile-metrics]') || mobileLeadPreview;
    const mobileLeadPreviewRect = mobileLeadPreview?.getBoundingClientRect();
    const mobileWanTable = sectionRoot?.querySelector('[data-overview-mobile-wan-table]');
    const mobileFirstScreen = sectionRoot?.querySelector('[data-overview-mobile-first-screen]');
    const mobileFirstScreenLineCharts = Array.from(mobileFirstScreen?.querySelectorAll('[data-overview-chart-type="line"], svg.mini-chart, .ik-wan-rate-svg') || []);
    const mobileDetail = sectionRoot?.querySelector('[data-overview-mobile-detail]');
    const mobileDetailSectionTitles = Array.from(mobileDetail?.querySelectorAll('[data-overview-mobile-detail-section] > .ik-mobile-section-head') || [])
      .map((node) => normalize(node.textContent || ''))
      .filter(Boolean);
    const mobileDetailSectionIndex = (pattern) => mobileDetailSectionTitles.findIndex((title) => pattern.test(title));
    const mobileMetricTitles = Array.from(mobileMetrics?.querySelectorAll('.ik-mobile-metric-title') || [])
      .map((node) => normalize(node.textContent || ''))
      .filter(Boolean);
    const mobileMetricsText = normalize(mobileMetrics?.textContent || '');
    const mobileMetricsRect = mobileMetrics?.getBoundingClientRect();
    const mobileWanTableRect = mobileWanTable?.getBoundingClientRect();
    const mobileFirstScreenRect = mobileFirstScreen?.getBoundingClientRect();
    const mobileDetailRect = mobileDetail?.getBoundingClientRect();
    const trustNotice = sectionRoot?.querySelector('[data-overview-trust-notice]');
    const trustNoticeStyle = trustNotice ? getComputedStyle(trustNotice) : null;
    const trustMode = sectionRoot?.querySelector('[data-overview-trust-mode]');
    const historyModeActive = trustMode?.getAttribute('data-overview-trust-mode') === 'history';
    const compactLandscapeOverview = sectionName === 'overview' &&
      window.innerWidth >= 761 &&
      window.innerWidth <= 900 &&
      window.innerHeight <= 520;
    const isMobileOverview = sectionName === 'overview' && (window.innerWidth < 768 || compactLandscapeOverview);
    const requestedMobile390x844 = ${Number(viewport.width) === 390 && Number(viewport.height) === 844 ? 'true' : 'false'};
    const mobileOverview390x844 = sectionName === 'overview' &&
      requestedMobile390x844 &&
      window.innerWidth >= 375 &&
      window.innerWidth <= 430 &&
      window.innerHeight >= 812 &&
      window.innerHeight <= 932;
    const mobileOverviewAppViewport = mobileOverview390x844 || compactLandscapeOverview;
    const mobileLandscapeAppRoot = compactLandscapeOverview
      ? sectionRoot?.querySelector('.ik-mobile-public-home')
      : null;
    const mobileLandscapeScreen = mobileLandscapeAppRoot?.querySelector('[data-overview-mobile-first-screen="app-home"]');
    const mobileLandscapeTabs = mobileLandscapeAppRoot?.querySelector('.ik-v420-tabs[aria-label="路由器监控底部导航"]');
    const mobileLandscapeRootRect = mobileLandscapeAppRoot?.getBoundingClientRect();
    const mobileLandscapeScreenRect = mobileLandscapeScreen?.getBoundingClientRect();
    const mobileLandscapeTabsRect = mobileLandscapeTabs?.getBoundingClientRect();
    const mobileLandscapeScreenStyle = mobileLandscapeScreen ? getComputedStyle(mobileLandscapeScreen) : null;
    const mobileLandscapeDesktopVisible = Array.from(sectionRoot?.querySelectorAll(':scope > .ro-topbar, :scope > .ro-desktop-grid') || [])
      .some((node) => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0.01 && rect.width > 0 && rect.height > 0;
      });
    const overviewMobileLandscapeAppOk = !compactLandscapeOverview || Boolean(
      mobileFirstScreen &&
      mobileLandscapeAppRoot &&
      mobileLandscapeScreen &&
      mobileLandscapeTabs &&
      mobileLandscapeRootRect &&
      mobileLandscapeScreenRect &&
      mobileLandscapeTabsRect &&
      mobileLandscapeScreenStyle?.display === 'grid' &&
      (mobileLandscapeScreenStyle.gridTemplateColumns || '').split(' ').filter(Boolean).length === 2 &&
      mobileLandscapeRootRect.width >= window.innerWidth - 4 &&
      mobileLandscapeRootRect.height >= window.innerHeight - 4 &&
      mobileLandscapeScreenRect.width >= window.innerWidth - 4 &&
      mobileLandscapeScreenRect.height <= window.innerHeight + 4 &&
      mobileLandscapeTabsRect.width >= window.innerWidth - 4 &&
      mobileLandscapeTabsRect.height >= 44 &&
      mobileLandscapeTabs.querySelectorAll('button').length === 5 &&
      !mobileLandscapeDesktopVisible
    );
    const mobileCoreBlocksVisible = mobileCoreBlocks.filter(nodeVisibleInFirstScreen);
    const mobileCoreBlockLabels = mobileCoreBlocksVisible
      .map((node) => normalize(node.querySelector('.ik-v821-row-title, .ik-mobile-overview-block-head span, span')?.textContent || node.textContent || ''))
      .filter(Boolean);
    const mobileCoreBlocksRects = mobileCoreBlocksVisible.slice(0, 4).map((node) => node.getBoundingClientRect());
    const mobileCoreBlocksVerticalOk = mobileCoreBlocksRects.length === 4 &&
      mobileCoreBlocksRects.every((rect) => rect.width > 0 && rect.height > 0) &&
      mobileCoreBlocksRects[1].top >= mobileCoreBlocksRects[0].bottom - 2 &&
      mobileCoreBlocksRects[2].top >= mobileCoreBlocksRects[1].bottom - 2 &&
      mobileCoreBlocksRects[3].top >= mobileCoreBlocksRects[2].bottom - 2 &&
      Math.abs(mobileCoreBlocksRects[0].left - mobileCoreBlocksRects[1].left) <= 4 &&
      Math.abs(mobileCoreBlocksRects[1].left - mobileCoreBlocksRects[2].left) <= 4 &&
      Math.abs(mobileCoreBlocksRects[2].left - mobileCoreBlocksRects[3].left) <= 4;
    const mobileTwinCardsVisible = Array.from((mobileFirstScreen || sectionRoot)?.querySelectorAll('[data-overview-mobile-twin-cards="wan-collection"] .ik-mobile-twin-card, .ik-mobile-twin-card') || [])
      .filter(nodeVisibleInFirstScreen);
    const mobileTwinCardRects = mobileTwinCardsVisible.slice(0, 2).map((node) => node.getBoundingClientRect());
    const mobileCoreBlocksTwinOk = Boolean(
      (mobileFirstScreen || sectionRoot)?.querySelector('[data-overview-mobile-twin-cards="wan-collection"], .ik-mobile-twin-cards') &&
      mobileTwinCardRects.length === 2 &&
      mobileTwinCardRects.every((rect) => rect.width > 0 && rect.height >= 44) &&
      (
        Math.abs(mobileTwinCardRects[0].top - mobileTwinCardRects[1].top) <= 10 ||
        mobileTwinCardRects[1].top >= mobileTwinCardRects[0].bottom - 4
      )
    );
    const overviewMobileResourceFullVerticalOk = sectionName !== 'overview' || scaleScenario !== 'resource-full' || !isMobileOverview || Boolean(
      Array.from(mobileFirstScreen?.querySelectorAll('.ik-v420-resource-meter-set[data-overview-scene-chart="mobile-resource-vertical-ledger"], .ik-v420-resource-meter') || [])
        .filter(nodeVisibleInFirstScreen).length >= 3 ||
      (() => {
        const rows = Array.from(mobileFirstScreen?.querySelectorAll('.ik-mobile-resource-incident-stack > .ik-mobile-resource-line') || [])
          .filter(nodeVisibleInFirstScreen);
        const rowText = normalize(rows.map((node) => node.textContent || '').join(' '));
        return rows.length === 3 && /处理器/.test(rowText) && /内存/.test(rowText) && /磁盘/.test(rowText);
      })() ||
      Array.from(mobileFirstScreen?.querySelectorAll('.ik-mobile-resource-decision, [data-overview-mobile-resource-card="cpu-memory-disk-horizontal"]') || [])
        .filter(nodeVisibleInFirstScreen)
        .some((node) => /CPU/.test(normalize(node.textContent || '')) && /内存/.test(normalize(node.textContent || '')) && /磁盘/.test(normalize(node.textContent || '')))
    );
    const mobileCoreBarsVisible = mobileCoreBars.filter(nodeVisibleInFirstScreen);
    const mobileCoreChartMetaRecords = mobileCoreBlocksVisible.map((block) => {
      const subcopy = block.querySelector('.ik-v821-row-note');
      const style = subcopy ? getComputedStyle(subcopy) : null;
      return {
        block: block?.getAttribute('data-overview-mobile-core-block') || '',
        title: normalize(block?.querySelector('span')?.textContent || ''),
        subcopy: normalize(subcopy?.textContent || ''),
        clamp: style ? (style.webkitLineClamp || style.lineClamp || '') : '',
        text: normalize(block?.textContent || ''),
      };
    });
    const mobileCoreChartMetaOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      mobileCoreChartMetaRecords.length === 4 &&
      mobileCoreChartMetaRecords.every((item) =>
        item.subcopy &&
        String(item.clamp || '').trim() === '2'
      ) ||
      (
        mobileCoreBlockKeys.join('|') === 'object|impact|recent-success' &&
        /影响对象|影响范围|可信度/.test(mobileCoreBlockText) &&
        /最近成功/.test(mobileCoreBlockText)
      )
    );
    const overviewMobileSummaryStripProbe = sectionName === 'overview' && isMobileOverview
      ? {
        stripKeys: mobileCoreBlocksVisible.map((node) => node.getAttribute('data-overview-mobile-core-block') || ''),
        stripTitles: mobileCoreBlocksVisible.map((node) => normalize(node.querySelector('.ik-v821-row-title, .ik-mobile-overview-block-head span, span')?.textContent || node.textContent || '')),
        stripCount: mobileCoreBlocksVisible.length,
        subcopyClamp: mobileCoreChartMetaRecords.map((item) => String(item.clamp || '').trim() === '2'),
      }
      : null;
    const expectedMobileCoreOrder = scaleScenario === 'resource-full'
      ? 'resource|wan|collection|recent-success'
      : (scaleScenario === 'collection-down' || noSnapshotEdge)
        ? 'collection|wan|resource|recent-success'
        : 'wan|collection|resource|recent-success';
    const mobileCoreBlockContractOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      mobileCoreBlocksVisible.length === 4 &&
      ['wan', 'collection', 'resource', 'recent-success'].every((key) => mobileCoreBlockKeys.includes(key)) &&
      ['WAN', '采集', '资源', '最近成功'].every((label) => mobileCoreBlockLabels.includes(label)) &&
      mobileCoreBlockKeys.slice(0, 4).join('|') === expectedMobileCoreOrder &&
      (mobileCoreBlocksVerticalOk || mobileCoreBlocksTwinOk) &&
      /WAN/.test(mobileCoreBlockText) &&
      /采集/.test(mobileCoreBlockText) &&
      /资源/.test(mobileCoreBlockText) &&
      /最近成功/.test(mobileCoreBlockText)
      ||
      (
        mobileCoreBlocksVisible.length === 3 &&
        mobileCoreBlockKeys.join('|') === 'object|impact|recent-success' &&
        /影响对象|影响范围|可信度/.test(mobileCoreBlockText) &&
        /最近成功/.test(mobileCoreBlockText)
      )
    );
    const mobileOfflineBlueBars = mobileCoreBlocksVisible
      .filter((block) => {
        const level = block.getAttribute('data-overview-status-level') || '';
        const blockText = normalize(block.textContent || '');
        return /danger|warn/.test(level) || /离线|不可达|快照缺失|缺依赖|异常|down|不可判定/.test(blockText);
      })
      .map((block) => {
        const line = block.querySelector('.ik-mobile-state-line');
        const lineColor = line ? getComputedStyle(line).backgroundColor : '';
        return { block: block.getAttribute('data-overview-mobile-core-block') || '', spanColor: '', lineColor, text: normalize(block.textContent || '').slice(0, 120) };
      })
      .filter((item) => /rgb\(22,\s*93,\s*255\)|rgb\(47,\s*127,\s*230\)|rgb\(22,\s*99,\s*255\)/.test(item.spanColor + ' ' + item.lineColor));
    const overviewMobileOfflineBarSemanticsOk = sectionName !== 'overview' || !isMobileOverview || mobileOfflineBlueBars.length === 0;
    const overviewMobileNoLineChartsOk = sectionName !== 'overview' || !isMobileOverview || mobileFirstScreenLineCharts.length === 0;
    const mobileIncidentPattern = new RegExp('部分离线|全部离线|默认路由异常|WAN(?:线路| 线路)?离线\\\\s*[1-9]\\\\d*\\\\s*条|离线\\\\s*[1-9]\\\\d*\\\\s*条');
    const mobileAlertPattern = new RegExp('WAN(?:线路| 线路)?离线\\\\s*[1-9]\\\\d*\\\\s*条|离线\\\\s*[1-9]\\\\d*|默认路由异常|全部离线|部分离线|断网\\\\s*/\\\\s*路由不可达|WAN(?:线路| 线路)?\\\\s*0/\\\\d+|WAN(?:线路| 线路)?\\\\s*\\\\d+/\\\\d+');
    const overviewMobileAlertOk = sectionName !== 'overview' || window.innerWidth >= 768 || Boolean(
      mobileFlatStatus &&
      mobileFlatRowCountOk &&
      mobileFlatLinkLabelsOk &&
      /结论/.test(mobileFlatStatusText) &&
      /WAN/.test(mobileFlatStatusText) &&
      /采集/.test(mobileFlatStatusText) &&
      /资源/.test(mobileFlatStatusText) &&
      /最近成功/.test(mobileFlatStatusText) &&
      mobileCoreBlockContractOk &&
      mobileCoreChartMetaOk &&
      overviewMobileNoLineChartsOk &&
      overviewMobileOfflineBarSemanticsOk &&
      mobileFlatEntryOk &&
      restSshPairPattern.test(mobileFlatStatusText) &&
      mobileAlert &&
      mobileAlertRect &&
      mobileAlertRect.top < 120 &&
      !/异常\\s*\\d/.test(mobileAlertText) &&
      !mobileAlertText.includes('WAN 离线 0') &&
      (!historyModeActive || /当前影响未知|影响未知：缓存快照|使用缓存快照|以下均为上次采样|历史快照\\s*\\S+|数据陈旧\\s*\\S+/.test(mobileAlertText)) &&
      (!mobileIncidentPattern.test(text) || mobileAlertPattern.test(mobileAlertText))
    );
    const overviewVerdictCompactOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      (
        overviewMainVerdict &&
        overviewMainVerdictRect &&
        overviewMainVerdictRect.height >= 40 &&
        overviewMainVerdictRect.height <= 360 &&
        !/规则：|风险优先级|最大风险优先级/.test(normalize(overviewMainVerdict.textContent || '')) &&
        (overviewVerdictStatusBus || overviewStatusBar) &&
        (
          (
            overviewNextActions &&
            ['WAN', '采集', '路由', '资源'].every((label) =>
              Array.from(overviewNextActions.querySelectorAll('[data-overview-action-label], .ik-home-action-link'))
                .map((node) => normalize(node.textContent || ''))
                .includes(label)
            )
          ) ||
          (
            overviewSummaryShell &&
            overviewSummaryMain &&
            overviewStatusBar &&
            overviewActionCueOk &&
            (overviewNoSnapshotGrid || overviewFocusModule || overviewDensityModules.length >= 3)
          )
        )
      ) ||
      (
        overviewSummaryShell &&
        overviewStatusBar &&
        overviewStatusBar.getBoundingClientRect().height <= 56 &&
        overviewDesktopDetail &&
        !/规则：|风险优先级|最大风险优先级/.test(overviewVerdictText)
      )
    );
    const overviewTerminologyOk = sectionName !== 'overview' || !/在线宽带|宽带状态|宽带聚合/.test(text);
    const overviewCurrentTrustCopyText = [overviewStatusBarText, overviewDesktopDetailText, text].join(' ');
    const overviewCurrentTrustCopyOk = Boolean(
      overviewStatusBar &&
      /采集/.test(overviewCurrentTrustCopyText) &&
      /快照/.test(overviewCurrentTrustCopyText) &&
      restSshPairPattern.test(overviewCurrentTrustCopyText) &&
      /实时|缓存快照|历史快照|快照缺失|无可用快照/.test(overviewCurrentTrustCopyText)
    );
    const overviewTrustCopyOk = sectionName !== 'overview' || overviewCurrentTrustCopyOk || Boolean(
      /事件更新时间|采集状态更新时间|业务快照时间|业务快照年龄|业务快照|快照缺失|历史快照|业务数据不展示|数据可信度/.test(text) &&
      restSshPairPattern.test(text) &&
      (!noSnapshotEdge || (
        /快照缺失/.test(text) &&
        /(?:采集)?状态更新时间/.test(text) &&
        (
          text.includes('业务数据不展示') ||
          text.includes('无业务快照')
        ) &&
        !noSnapshotFreshCopyPattern.test(text)
      ))
    );
    const trendCompact = sectionRoot?.querySelector('.ro-semantic-wan-trend');
    const overviewTrendCompactOk = sectionName !== 'overview' || noSnapshotEdge || Boolean(
      !/采样不足|样本不足|趋势暂不可用/.test(text) || (
        trendCompact &&
        /样本不足|趋势暂不可用/.test(normalize(trendCompact.textContent)) &&
        normalize(trendCompact.textContent).includes('默认路由') &&
        /采集(?:能力|通道)/.test(normalize(trendCompact.textContent)) &&
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
    let overviewRankCompactOk = true;
    if (sectionName === 'overview') {
      if (isMobileOverview) {
        overviewRankCompactOk = Boolean(
          (mobileLeadPreview && mobileLeadRows.length >= 2) ||
          sectionRoot?.querySelector('.ik-mobile-public-home, .ik-ios-router-home') ||
          (mobileFlatStatus && mobileFlatRowCountOk && mobileFlatLinkLabelsOk)
        );
      } else if (overviewSceneSpecificDesktopDensityOk) {
        overviewRankCompactOk = true;
      } else if (noSnapshotEdge) {
        overviewRankCompactOk = /未采集|无可用快照|快照缺失|RouterOS 当前不可达|业务数据不展示|无业务快照/.test(text);
      } else {
        overviewRankCompactOk = Boolean(
          (
            overviewSummaryShell &&
            overviewStatusBar &&
            overviewDesktopDetail &&
            overviewEvidenceModule &&
            restSshPairPattern.test(overviewVerdictText)
          ) ||
          (rankGrid &&
            rankHeaders.length === 6 &&
            rankRows.length <= 16 &&
            rankHeaders.filter((label) => label === '速率').length === 2 &&
            rankHeaders.filter((label) => label === '状态').length === 2 &&
            !rankHeaders.some((label) => /实时上行|实时下行|连接|角色/.test(label)) &&
            rankScrollerOverflow.length === 0) ||
          (sectionRoot?.querySelector('[data-overview-detail-section="table"]') && /在线终端|PPP 会话|连接跟踪|ConnTrack/.test(text))
        );
      }
    }
    const overviewFlatDesktopContractOk = sectionName === 'overview' && isDesktopOverview && Boolean(
      overviewSceneSpecificDesktopDensityOk ||
      (
        overviewSummaryShell &&
        overviewStatusBar &&
        overviewDesktopDetail &&
        overviewEvidenceModule &&
        overviewDesktopDenseRows >= 18 &&
        /结论|WAN|REST|SSH|数据年龄|业务快照年龄|业务快照|数据可信度|事件更新|最近成功/.test(overviewVerdictText) &&
        restSshPairPattern.test(overviewVerdictText)
      )
    );
    const overviewFlatMobileContractOk = sectionName === 'overview' && isMobileOverview && Boolean(
      mobileFlatStatus &&
      mobileFlatRowCountOk &&
      mobileFlatLinkLabelsOk &&
      mobileFlatSuggestionCopyOk &&
      /结论/.test(mobileFlatStatusText) &&
      /WAN/.test(mobileFlatStatusText) &&
      /采集/.test(mobileFlatStatusText) &&
      /资源/.test(mobileFlatStatusText) &&
      mobileFlatEntryOk &&
      mobileCoreBlockContractOk &&
      mobileCoreChartMetaOk &&
      overviewMobileNoLineChartsOk &&
      overviewMobileOfflineBarSemanticsOk &&
      restSshPairPattern.test(mobileFlatStatusText)
    );
    const mobileFlatStatusVerdictOk = Boolean(
      overviewFlatMobileContractOk &&
      mobileFlatStatusRowText &&
      /结论/.test(mobileFlatStatusRowText) &&
      /异常|降级|历史|正常|WAN|快照缺失|资源满载|采集|接口/.test(mobileFlatStatusRowText) &&
      /快照|采集|缓存|历史|业务快照/.test(mobileFlatStatusRowText)
    );
    const mobileCoreEvidenceText = [mobileCoreBlockText, mobileFlatEvidenceRowText, mobileFlatTrustRowText].join(' ');
    const mobileFlatEvidenceResourceOk = (
      /证据/.test(mobileFlatEvidenceRowText) &&
      /资源/.test(mobileFlatLedgerText) &&
      /CPU/.test(mobileFlatEvidenceRowText) &&
      /MEM|内存/.test(mobileFlatEvidenceRowText) &&
      /DISK|磁盘/.test(mobileFlatEvidenceRowText) &&
      /持续|峰值|峰/.test(mobileFlatEvidenceRowText)
    ) || (
      mobileCoreBlockContractOk &&
      /资源/.test(mobileCoreEvidenceText) &&
      /CPU/.test(mobileCoreEvidenceText) &&
      /MEM|内存/.test(mobileCoreEvidenceText) &&
      /DISK|磁盘/.test(mobileCoreEvidenceText) &&
      /持续|峰值|峰|阈值/.test(mobileCoreEvidenceText) &&
      mobileCoreChartMetaOk
    );
    const mobileFlatEvidenceSnapshotOk = (
      /证据/.test(mobileFlatEvidenceRowText) &&
      /RouterOS/.test(mobileFlatEvidenceRowText) &&
      /业务数据|业务快照|业务数据不展示|数据可信度/.test(mobileFlatLedgerText) &&
      hasRestSshPair(mobileFlatEvidenceRowText)
    ) || (
      mobileCoreBlockContractOk &&
      /RouterOS/.test(mobileCoreEvidenceText) &&
      /业务数据|业务快照|业务数据不展示|无业务快照/.test(mobileCoreEvidenceText) &&
      hasRestSshPair(mobileCoreEvidenceText) &&
      mobileCoreChartMetaOk
    );
    const mobileFlatEvidenceCollectionOk = (
      /证据/.test(mobileFlatEvidenceRowText) &&
      /采集|REST|SSH/.test(mobileFlatEvidenceRowText) &&
      /通道(?:状态)?|缓存快照|当前展示缓存快照/.test(mobileFlatLedgerText) &&
      hasRestSshPair(mobileFlatEvidenceRowText)
    ) || (
      mobileCoreBlockContractOk &&
      /采集|REST|SSH/.test(mobileCoreEvidenceText) &&
      /通道(?:状态)?|缓存快照|缓存可参考|最近成功/.test(mobileCoreEvidenceText) &&
      hasRestSshPair(mobileCoreEvidenceText) &&
      mobileCoreChartMetaOk
    );
    const mobileFlatEvidenceWanOk = (
      /证据/.test(mobileFlatEvidenceRowText) &&
      (/WAN|默认路由/.test(mobileFlatLedgerText)) &&
      (/离线对象|离线数量|通道状态|默认路由|线路清单|WAN 离线/.test(mobileFlatLedgerText))
    ) || (
      (historyModeActive || scaleScenario === 'single' || scaleScenario === 'fleet') &&
      /证据|采集|WAN|历史|快照|通道状态|数据层|最近成功/.test(mobileFlatLedgerText)
    ) || (
      mobileCoreBlockContractOk &&
      /WAN/.test(mobileCoreEvidenceText) &&
      /默认路由|离线对象|在线|不可判定/.test(mobileCoreEvidenceText) &&
      /采集|REST|SSH/.test(mobileCoreEvidenceText) &&
      mobileCoreChartMetaOk
    );
    const mobileFlatEvidenceCategoryOk = scaleScenario === 'resource-full'
      ? mobileFlatEvidenceResourceOk
      : noSnapshotEdge
        ? mobileFlatEvidenceSnapshotOk
        : scaleScenario === 'collection-down'
          ? mobileFlatEvidenceCollectionOk
          : mobileFlatEvidenceWanOk &&
            hasRestSshPair(mobileCoreEvidenceText) &&
            /最近成功|数据层|通道状态|默认路由/.test(mobileCoreEvidenceText);
    const mobileFlatEvidenceOk = Boolean(
      overviewFlatMobileContractOk &&
      (mobileFlatEvidenceRowText || mobileCoreEvidenceText) &&
      mobileFlatEvidenceCategoryOk
    );
    const mobileFlatNoSnapshotOk = !noSnapshotEdge || Boolean(
      mobileFlatStatusVerdictOk &&
      mobileFlatEvidenceOk &&
      /快照缺失/.test(mobileFlatStatusRowText) &&
      /无业务快照|业务数据不展示/.test(mobileFlatObjectRowText + ' ' + mobileFlatStatusRowText) &&
      /默认路由|路由快照缺失/.test(mobileFlatObjectRowText + ' ' + mobileFlatStatusText) &&
      /RouterOS\\s*当前不可达|RouterOS当前不可达/.test(mobileCoreEvidenceText) &&
      /采集.*REST.*SSH|REST.*SSH/.test(mobileCoreEvidenceText) &&
      /业务快照|业务数据不展示|无业务快照/.test(mobileFlatLedgerText) &&
      /业务数据不展示|无业务快照|业务状态不可信/.test(mobileFlatLedgerText) &&
      !noSnapshotFreshCopyPattern.test(mobileFlatStatusText)
    );
    const mobileFlatCollectionOk = scaleScenario !== 'collection-down' || Boolean(
      mobileFlatStatusVerdictOk &&
      mobileFlatEvidenceOk &&
      /通道(?:状态)?|缓存快照|当前展示缓存快照/.test(mobileFlatLedgerText) &&
      /REST\\s*待确认/.test(mobileCoreEvidenceText) &&
      /SSH\\s*(?:缺依赖|不可达|不可用)/.test(mobileCoreEvidenceText)
    );
    const overviewWanDecisionText = text + ' ' + overviewDesktopDetailText;
    const overviewWanLedgerEvidenceOk = Boolean(
      (
        new RegExp('WAN在线/离线|WAN账本|Fleet / 单机六账本|单机六账本|离线分组|WAN\\\\s*\\\\d+\\\\s*/\\\\s*\\\\d+|WAN \\\\d+/\\\\d+ 状态条|WAN \\\\d+/\\\\d+ 横向状态条').test(overviewWanDecisionText) ||
        sectionRoot?.querySelector('[data-overview-wan-mini-table], [data-overview-detail-section="table"], [data-overview-density-module="fleet-density"], [data-overview-density-module="wan-incident-ledger"]')
      ) &&
      (
        /PPPoE|DHCP|Static|VLAN|Unknown|接入|WAN 类型|多出口|单线路|WAN 线路|PPP 会话|pppoe-wan|gateway|distance|active|disabled|默认路由条目|默认路由快照摘要/i.test(overviewWanDecisionText) ||
        sectionRoot?.querySelector('[data-overview-wan-mini-table], [data-overview-detail-section="table"], [data-overview-density-module="fleet-density"], [data-overview-density-module="wan-incident-ledger"]')
      ) &&
      /默认路由|路由账本|路由快照|gateway|distance|active|disabled/.test(overviewWanDecisionText)
    );
    const overviewWanDecisionOk = sectionName !== 'overview' || (
      scaleScenario === 'interfaces-down'
        ? Boolean(
          /接口转发面|接口全 Down/.test(text + ' ' + overviewDesktopDetailText) &&
          /默认路由|路由/.test(text + ' ' + overviewDesktopDetailText) &&
          restSshPairPattern.test(text + ' ' + overviewDesktopDetailText)
        )
        : scaleScenario === 'collection-down'
          ? Boolean(
            /采集|通道状态|数据层|REST|SSH/.test(text + ' ' + overviewDesktopDetailText) &&
            /缓存快照|缓存可参考|当前使用缓存/.test(text + ' ' + overviewDesktopDetailText) &&
            restSshPairPattern.test(text + ' ' + overviewDesktopDetailText)
          )
        : scaleScenario === 'resource-full'
          ? Boolean(
            /资源满载|资源高负载|资源阈值|资源压力/.test(text + ' ' + overviewDesktopDetailText) &&
            /CPU|处理器/.test(text + ' ' + overviewDesktopDetailText) &&
            /MEM|内存/.test(text + ' ' + overviewDesktopDetailText) &&
            /DISK|磁盘/.test(text + ' ' + overviewDesktopDetailText) &&
            /阈|持续|峰/.test(text + ' ' + overviewDesktopDetailText) &&
            restSshPairPattern.test(text + ' ' + overviewDesktopDetailText)
          )
        : noSnapshotEdge
        ? Boolean(/WAN\\s*不可判定|WAN 分组不可判定|无可用快照|RouterOS(?:\\s+可达性)?\\s*当前不可达|业务数据不展示|无业务快照|业务快照\\s*未取得|默认路由\\s*待判/.test(text))
        : isMobileOverview
        ? Boolean(
          scaleScenario === 'resource-full'
            ? /资源|CPU|处理器|内存|磁盘/.test(text) && restSshPairPattern.test(text)
            : scaleScenario === 'collection-down'
              ? /采集|通道状态|数据层|REST|SSH/.test(text) && restSshPairPattern.test(text)
            : text.includes('WAN') && (text.includes('默认路由') || text.includes('路由')) && (/离线|在线|未采集|历史留存|当前影响未知|快照摘要/.test(text))
        )
          : overviewWanLedgerEvidenceOk
    );
    const overviewRiskSplitOk = sectionName !== 'overview' || (
      overviewFlatDesktopContractOk ||
      overviewFlatMobileContractOk &&
      isMobileOverview
        ? Boolean(
          noSnapshotEdge
            ? /状态|证据|快照缺失/.test(text) && /业务数据不展示|无业务快照|业务快照/.test(text) && restSshPairPattern.test(text)
            : scaleScenario === 'resource-full'
              ? /状态|证据|资源满载|资源证据|CPU|处理器|内存|磁盘/.test(text) && restSshPairPattern.test(text)
              : scaleScenario === 'collection-down'
                ? /状态|证据|采集降级|采集证据|通道状态|数据层/.test(text) && restSshPairPattern.test(text)
              : /状态|证据|风险|WAN|历史快照|数据陈旧|资源满载|采集降级/.test(text) && /数据|采样|快照|业务数据不展示|数据可信度/.test(text) && restSshPairPattern.test(text) && text.includes('WAN')
        )
        : noSnapshotEdge
        ? Boolean(
          (overviewStatusBar || overviewSummaryShell) &&
          /采集/.test(overviewVerdictText + ' ' + text) &&
          /业务数据不展示|无业务快照|业务快照\\s*未取得/.test(overviewVerdictText + ' ' + text) &&
          /WAN\\s*不可判定|WAN 不可判定|WAN\\s*\\/\\s*资源[^。]*不展示|默认路由\\s*待判|路由快照未取回/.test(overviewVerdictText + ' ' + text) &&
          (sectionRoot?.querySelector('[data-overview-no-snapshot-grid]') || /业务数据不展示|无业务快照/.test(text))
        )
        : scaleScenario === 'resource-full'
        ? Boolean(
          /资源满载|资源高负载/.test(text) &&
          /CPU|处理器/.test(text) && /内存/.test(text) && /磁盘/.test(text) &&
          sectionRoot?.querySelector('[data-overview-density-module="resource-risk-priority"]') &&
          sectionRoot?.querySelector('[data-overview-density-module="resource-pressure-bars"]') &&
          sectionRoot?.querySelector('[data-overview-density-module="resource-interface-top5"]')
        )
        : scaleScenario === 'collection-down'
        ? Boolean(
          /采集降级|采集可信度下降/.test(text) &&
          /REST/.test(text) && /SSH/.test(text) && /缓存快照/.test(text) &&
          sectionRoot?.querySelector('[data-overview-density-module="collection-channel-ledger"]') &&
          sectionRoot?.querySelector('[data-overview-density-module="collection-recent-failures"]') &&
          sectionRoot?.querySelector('[data-overview-density-module="collection-cache-boundary"]')
        )
        : Boolean(
          (overviewVerdictStatusBus || overviewStatusBar) &&
          /风险|异常|资源|WAN|采集|历史快照/.test(overviewVerdictText) &&
          overviewVerdictText.includes('采集') &&
          /影响|默认路由|资源|WAN|业务/.test(overviewVerdictText) &&
      (sectionRoot?.querySelector('[data-overview-detail-section="table"]') || sectionRoot?.querySelector('[data-overview-density-module="wan-health"]') || text.includes('WAN线路状态表')) &&
          (sectionRoot?.querySelector('[data-overview-density-module="status-summary"]') || text.includes('采集新鲜度') || text.includes('数据年龄') || text.includes('业务快照年龄'))
        )
    );
    const overviewCapabilityDegradeOk = sectionName !== 'overview' || Boolean(
      (isDesktopOverview && overviewSceneSpecificDesktopDensityOk && restSshPairPattern.test(text)) ||
      (noSnapshotEdge
        ? restSshPairPattern.test(text) &&
          (text.includes('RouterOS 当前不可达') || text.includes('快照缺失')) &&
          (text.includes('REST 可用') || text.includes('REST 待确认') || text.includes('REST 待核') || text.includes('REST 不可达') || text.includes('REST 不可用') || text.includes('REST/SSH')) &&
          (text.includes('SSH 可用') || text.includes('SSH 缺依赖') || text.includes('SSH 依赖缺失') || text.includes('SSH 断链') || text.includes('SSH 不可用') || text.includes('SSH 不可达') || text.includes('SSH 采集不可用') || text.includes('SSH 通道不可用') || text.includes('REST/SSH')) &&
          (text.includes('待确认') || text.includes('待核') || text.includes('断链') || text.includes('不可用') || text.includes('不可达'))
        : restSshPairPattern.test(text) &&
          /REST (可用|上次可用|待确认|不可达|不可用)/.test(text) &&
          /SSH (可用|上次可用|缺依赖|依赖缺失|不可用|不可达|采集不可用|通道不可用)/.test(text))
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
    function nodeVisibleInFirstScreen(node) {
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
    }
    function nodeVisibleInViewport(node) {
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 &&
        rect.height > 0 &&
        rect.right > 0 &&
        rect.left < window.innerWidth &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    }
    const overviewNoSnapshotVisibleWanTrend = Boolean(overviewDesktopTrendCard && nodeVisibleInFirstScreen(overviewDesktopTrendCard));
    const overviewNoSnapshotSummaryVisible = Boolean(overviewNoSnapshotSummaryModule && nodeVisibleInFirstScreen(overviewNoSnapshotSummaryModule));
    const overviewNoSnapshotBoundaryVisible = Boolean(overviewNoSnapshotBoundaryDegradeModule && nodeVisibleInFirstScreen(overviewNoSnapshotBoundaryDegradeModule));
    const overviewNoSnapshotRecentTimelineModule = sectionRoot?.querySelector('[data-overview-density-module="no-snapshot-recent-success"]');
    const overviewNoSnapshotCoreModuleVisibility = [
      ['no-snapshot-summary', overviewNoSnapshotSummaryModule],
      ['no-snapshot-module-visibility', overviewNoSnapshotModuleVisibilityModule],
      ['no-snapshot-recent-success', overviewNoSnapshotRecentTimelineModule],
    ].map(([module, node]) => ({ module, visible: Boolean(node && nodeVisibleInFirstScreen(node)) }));
    const overviewNoSnapshotCoreModulesVisible = overviewNoSnapshotCoreModuleVisibility.every((item) => item.visible);
    const overviewNoSnapshotDesktopCoreFactsOk = Boolean(
      isDesktopOverview &&
      overviewNoSnapshotCoreModulesVisible &&
      /采集链路图|采集链路/.test(overviewNoSnapshotCoreModuleText) &&
      /业务数据不可判|业务可信边界|模块可见性/.test(overviewNoSnapshotCoreModuleText) &&
      /恢复线索/.test(overviewNoSnapshotCoreModuleText) &&
      /REST/.test(overviewNoSnapshotCoreModuleText) &&
      /SSH/.test(overviewNoSnapshotCoreModuleText) &&
      /只读/.test(overviewNoSnapshotCoreModuleText) &&
      !overviewNoSnapshotCoreModuleText.includes('WAN 速率') &&
      !overviewNoSnapshotCoreModuleText.includes('WAN速率') &&
      !overviewNoSnapshotCoreModuleText.includes('0 B/s')
    );
    const overviewNoSnapshotMainVisualOk = sectionName !== 'overview' || !isDesktopOverview || !noSnapshotEdge || Boolean(
      overviewNoSnapshotCoreModulesVisible &&
      overviewNoSnapshotDesktopCoreFactsOk &&
      !sectionRoot?.querySelector('[data-overview-density-module="no-snapshot-summary"] .ik-no-snapshot-summary-ledger') &&
      !overviewNoSnapshotVisibleWanTrend &&
      !/(?:WAN\\s*速率|WAN速率|0\\s*B\\/s)/.test([
        overviewNoSnapshotCoreModuleText,
        overviewDesktopTopText,
        overviewDesktopDetailText,
      ].join(' ')) &&
      /RouterOS/.test(overviewNoSnapshotCoreModuleText) &&
      /REST/.test(overviewNoSnapshotCoreModuleText) &&
      /SSH/.test(overviewNoSnapshotCoreModuleText) &&
      /WAN/.test(overviewNoSnapshotCoreModuleText)
    );
    visibleMobileTerminalSmallNodes = mobileTerminalSmallNodes.filter(nodeVisibleInFirstScreen);
    overviewMobileTerminalSingleLineOk = sectionName !== 'overview' || !isMobileOverview || visibleMobileTerminalSmallNodes.length === 0;
    const overviewDrilldownVisibleLinks = overviewDrilldownLinkNodes.filter(nodeVisibleInFirstScreen);
    const overviewGenericDetailTitleNodes = Array.from(sectionRoot?.querySelectorAll([
      '.ik-overview-flat-title',
      '.ik-mobile-section-head',
      '.card-title',
      '.ik-overview-subtable-title'
    ].join(',')) || [])
      .filter(nodeVisibleInFirstScreen)
      .filter((node) => normalize(node.textContent || '').split(/\\s+/)[0] === '明细表');
    const overviewGenericDetailTitleOk = sectionName !== 'overview' || overviewGenericDetailTitleNodes.length === 0;
    const overviewRepeatedRestSshText = [
      text,
      overviewVerdictText,
      overviewDesktopTopText,
      overviewDesktopDetailText,
    ].join(' ');
    const overviewRepeatedRestSshCompact = normalize(overviewRepeatedRestSshText).replace(/\\s+/g, '');
    const overviewRepeatedRestSshPattern = new RegExp('REST/SSH(?:REST|SSH|可用|待确认|不可用|不可达|上次可用|缺依赖)');
    const overviewRepeatedRestSshOk = sectionName !== 'overview' || !overviewRepeatedRestSshPattern.test(overviewRepeatedRestSshCompact);
    const overviewNormalTagLabels = Array.from(sectionRoot?.querySelectorAll('.tag.ok') || [])
      .filter(nodeVisibleInFirstScreen)
      .map((node) => normalize(node.textContent || ''))
      .filter(Boolean);
    const overviewNormalTagBudgetOk = sectionName !== 'overview' || overviewNormalTagLabels.length <= (isMobileOverview ? 0 : 1);
    const overviewTitleHeightSamples = Array.from(document.querySelectorAll('.page-title, #pageTitle, h1, .section-title'))
      .filter(nodeVisibleInFirstScreen)
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return { text: normalize(node.textContent || '').slice(0, 80), height: Math.round(rect.height) };
      })
      .filter((item) => item.text);
    const overviewH1HeightOk = sectionName !== 'overview' || overviewTitleHeightSamples.every((item) => item.height <= 24);
    const overviewVisibleDensityModuleRecords = overviewDensityModules
      .filter(nodeVisibleInFirstScreen)
      .map((node) => ({
        module: node.getAttribute('data-overview-density-module') || '',
        title: normalize(node.querySelector('.ik-overview-flat-title, .ik-overview-subtable-title, .card-title')?.textContent || ''),
        text: normalize(node.textContent || ''),
      }));
    const overviewDensityModuleNames = overviewDensityModules
      .map((node) => node.getAttribute('data-overview-density-module') || '')
      .filter(Boolean);
    const overviewVisibleDensityModuleNames = overviewVisibleDensityModuleRecords
      .map((item) => item.module)
      .filter(Boolean);
    const overviewVisibleDensityModuleText = overviewVisibleDensityModuleRecords
      .map((item) => [item.module, item.title, item.text].join(' '))
      .join(' ');
    const overviewNoSnapshotVisibleDenseModuleCount = (sectionName === 'overview' && isDesktopOverview && noSnapshotEdge)
      ? overviewVisibleDensityModuleRecords.length
      : 0;
    const overviewNoSnapshotDenseModuleOk = sectionName !== 'overview' || !isDesktopOverview || !noSnapshotEdge || overviewNoSnapshotVisibleDenseModuleCount === 4;
    const overviewNoSnapshotVisibleFillerBlocks = (sectionName === 'overview' && isDesktopOverview && noSnapshotEdge)
      ? Array.from(sectionRoot?.querySelectorAll('.ik-no-snapshot-boundary-fill') || []).filter(nodeVisibleInFirstScreen)
      : [];
    const overviewNoSnapshotVisibleModuleNames = overviewVisibleDensityModuleNames.filter((name) => /^no-snapshot-/.test(name));
    const overviewNoSnapshotRequiredModuleNames = [
      'no-snapshot-summary',
      'no-snapshot-module-visibility',
      'no-snapshot-recent-success',
    ];
    const overviewNoSnapshotForbiddenModuleNames = [
      'no-snapshot-ledger',
      'no-snapshot-link-status',
      'no-snapshot-trust-level',
      'no-snapshot-boundary-degrade',
      'no-snapshot-collection-timeline',
      'no-snapshot-unavailable',
      'no-snapshot-boundary',
      'no-snapshot-endpoint-status',
      'no-snapshot-focus',
      'no-snapshot-trend',
      'no-snapshot-readonly-boundary',
      'no-snapshot-degraded-modules',
    ];
    const overviewNoSnapshotMissingRequiredModules = overviewNoSnapshotRequiredModuleNames
      .filter((name) => !overviewNoSnapshotVisibleModuleNames.includes(name));
    const overviewNoSnapshotForbiddenVisibleModules = overviewNoSnapshotVisibleModuleNames
      .filter((name) => overviewNoSnapshotForbiddenModuleNames.includes(name));
    const overviewNoSnapshotModuleNameCounts = overviewNoSnapshotVisibleModuleNames.reduce((acc, name) => {
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});
    const overviewNoSnapshotDuplicateModuleNames = Object.entries(overviewNoSnapshotModuleNameCounts)
      .filter(([, count]) => count > 1)
      .map(([name]) => name);
    const overviewNoSnapshotVisibleModuleTitles = overviewVisibleDensityModuleRecords
      .map((item) => item.title)
      .filter(Boolean);
    const overviewNoSnapshotModuleTitleCounts = overviewNoSnapshotVisibleModuleTitles.reduce((acc, title) => {
      acc[title] = (acc[title] || 0) + 1;
      return acc;
    }, {});
    const overviewNoSnapshotDuplicateModuleTitles = Object.entries(overviewNoSnapshotModuleTitleCounts)
      .filter(([, count]) => count > 1)
      .map(([title]) => title);
    const overviewNoSnapshotModuleCountOk = sectionName !== 'overview' || !isDesktopOverview || !noSnapshotEdge || Boolean(
      overviewNoSnapshotVisibleModuleNames.length === 3 &&
      overviewNoSnapshotVisibleDenseModuleCount === 4 &&
      overviewNoSnapshotVisibleModuleTitles.length === overviewNoSnapshotVisibleDenseModuleCount &&
      overviewNoSnapshotMissingRequiredModules.length === 0 &&
      overviewNoSnapshotDuplicateModuleNames.length === 0 &&
      overviewNoSnapshotDuplicateModuleTitles.length === 0 &&
      overviewNoSnapshotForbiddenVisibleModules.length === 0 &&
      overviewNoSnapshotCoreModulesVisible &&
      overviewNoSnapshotRawEvidenceModule &&
      nodeVisibleInFirstScreen(overviewNoSnapshotRawEvidenceModule)
    );
    const overviewNoSnapshotRowScope = sectionRoot;
    const overviewNoSnapshotBoundaryRowNodes = Array.from(overviewNoSnapshotRowScope?.querySelectorAll([
      '[data-overview-density-module^="no-snapshot"] tbody tr',
      '[data-overview-density-module^="no-snapshot"] .freshness-item',
      '[data-overview-no-snapshot-grid] tbody tr',
      '[data-overview-no-snapshot-grid] .freshness-item'
    ].join(',')) || [])
      .filter(nodeVisibleInFirstScreen);
    const overviewNoSnapshotRowHeightLimit = 24;
    const overviewNoSnapshotRowHeightSamples = overviewNoSnapshotBoundaryRowNodes
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          text: normalize(node.textContent || '').slice(0, 80),
          height: Math.round(rect.height),
        };
      });
    const overviewNoSnapshotRowHeightMax = overviewNoSnapshotRowHeightSamples.length
      ? Math.max(...overviewNoSnapshotRowHeightSamples.map((item) => item.height))
      : 0;
    const overviewNoSnapshotCompactVisualNodes = Array.from(sectionRoot?.querySelectorAll([
      '[data-overview-density-module="no-snapshot-boundary-degrade"] .ik-overview-module-cell',
      '[data-overview-density-module="no-snapshot-module-visibility"] .ik-overview-module-cell',
      '[data-overview-density-module="no-snapshot-recent-success"] .ik-no-snapshot-event-row',
      '[data-overview-density-module="no-snapshot-recent-success"] .ik-no-snapshot-mini-event',
      '[data-overview-no-snapshot-grid] .ik-overview-module-cell',
      '[data-overview-no-snapshot-grid] .ik-overview-timeline-row',
      '[data-overview-no-snapshot-grid] .ik-no-snapshot-summary-tile',
      '[data-overview-no-snapshot-grid] .ik-no-snapshot-chain-node',
      '[data-overview-no-snapshot-grid] .ik-no-snapshot-ledger-cell',
    ].join(',')) || []).filter(nodeVisibleInFirstScreen);
    const overviewNoSnapshotRowHeightOk = sectionName !== 'overview' || !isDesktopOverview || !noSnapshotEdge || Boolean(
      (overviewNoSnapshotBoundaryRowNodes.length + overviewNoSnapshotCompactVisualNodes.length) >= 16 &&
      overviewNoSnapshotRowHeightMax <= overviewNoSnapshotRowHeightLimit
    );
    const overviewRowHeightUpperBoundLimit = (isMobileOverview || noSnapshotEdge) ? 72 : 88;
    const overviewRowHeightUpperBoundSamples = Array.from(sectionRoot?.querySelectorAll([
      'tbody tr',
      '.ik-home-evidence-row',
      '.freshness-item',
      '.ik-mobile-detail-row:not(.is-head)',
      '.ik-mobile-wan-row:not(.is-head)',
      '[data-overview-mobile-flat-row]'
    ].join(',')) || [])
      .filter(nodeVisibleInFirstScreen)
      .filter((node) => {
        if (isMobileOverview && node.matches?.('[data-overview-mobile-flat-row]')) {
          const flatRow = node.getAttribute('data-overview-mobile-flat-row') || '';
          if (['status', 'object', 'evidence', 'trust', 'entry'].includes(flatRow)) return false;
        }
        return !(node.matches?.('[data-overview-mobile-flat-row="object"]') && node.querySelector('[data-overview-mobile-core-blocks]'));
      })
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          selector: node.id ? '#' + node.id : String(node.tagName || '').toLowerCase(),
          text: normalize(node.textContent || '').slice(0, 80),
          height: Math.round(rect.height),
        };
      });
    const overviewRowHeightUpperBoundViolations = overviewRowHeightUpperBoundSamples
      .filter((item) => item.height > overviewRowHeightUpperBoundLimit);
    const overviewRowHeightUpperBoundOk = sectionName !== 'overview' || !edgeScenarios.has(scaleScenario) || overviewRowHeightUpperBoundViolations.length === 0;
    const overviewNoSnapshotLedgerTitlesOk = sectionName !== 'overview' || !isDesktopOverview || !noSnapshotEdge || Boolean(
      overviewNoSnapshotModuleCountOk &&
      overviewNoSnapshotRequiredModuleNames.every((name) => overviewNoSnapshotVisibleModuleNames.includes(name)) &&
      !overviewNoSnapshotVisibleModuleNames.includes('no-snapshot-link-status') &&
      !overviewNoSnapshotVisibleModuleNames.includes('no-snapshot-trust-level') &&
      !overviewNoSnapshotVisibleModuleNames.includes('no-snapshot-collection-timeline')
    );
    const overviewNoSnapshotDesktopVisibleFieldCount = (sectionName === 'overview' && isDesktopOverview && noSnapshotEdge)
      ? Array.from(sectionRoot?.querySelectorAll('[data-overview-field], tbody tr, .ik-summary-box') || []).filter(nodeVisibleInFirstScreen).length
      : 0;
    const overviewNoSnapshotDesktopVisibleCellCount = (sectionName === 'overview' && isDesktopOverview && noSnapshotEdge)
      ? Array.from(sectionRoot?.querySelectorAll([
        'tbody td',
        'tbody th',
        'thead th',
        '.ik-no-snapshot-ledger-cell',
        '.ik-overview-module-cell > *',
        '.ik-no-snapshot-event-row > *',
        '.ik-no-snapshot-summary-tile > *',
        '.ik-no-snapshot-chain-node > *',
        '.ik-summary-box span',
        '.ik-summary-box b',
        '.ik-home-flat-cell span',
        '.ik-home-flat-cell b'
      ].join(',')) || []).filter(nodeVisibleInFirstScreen).length
      : 0;
    const overviewNoSnapshotCurrentText = (
      isMobileOverview
        ? [
          mobileFlatStatusText,
        ]
        : [
          overviewDesktopTopText,
          overviewDesktopDetailText,
          overviewNoSnapshotBoundaryText,
        ]
    ).join(' ');
    const overviewNoSnapshotRepeatedWordCounts = {
      noDisplay: countOccurrences(overviewNoSnapshotCurrentText, '不展示'),
      noShow: countOccurrences(overviewNoSnapshotCurrentText, '不显示'),
      notListed: countOccurrences(overviewNoSnapshotCurrentText, '不列'),
      missing: countOccurrences(overviewNoSnapshotCurrentText, '缺少'),
      unknown: countOccurrences(overviewNoSnapshotCurrentText, '不可判定'),
      pending: countOccurrences(overviewNoSnapshotCurrentText, '待确认'),
      unavailable: countOccurrences(overviewNoSnapshotCurrentText, '不可用'),
    };
    overviewNoSnapshotRepeatedWordCounts.trackedTotal = (
      overviewNoSnapshotRepeatedWordCounts.noDisplay +
      overviewNoSnapshotRepeatedWordCounts.noShow +
      overviewNoSnapshotRepeatedWordCounts.notListed +
      overviewNoSnapshotRepeatedWordCounts.missing +
      overviewNoSnapshotRepeatedWordCounts.unknown
    );
    const overviewNoSnapshotRepeatedTokenBudget = isMobileOverview
      ? { noDisplay: 3, noShow: 0, notListed: 1, missing: 2, unknown: 4, pending: 4, unavailable: 4, trackedTotal: 8 }
      : { noDisplay: 12, noShow: 0, notListed: 1, missing: 3, unknown: 6, pending: 6, unavailable: 5, trackedTotal: 18 };
    const overviewNoSnapshotMobileSemanticText = [overviewNoSnapshotCurrentText, mobileFlatStatusText, mobileFlatEvidenceRowText].join(' ');
    const overviewNoSnapshotDowngradeReasonsOk = sectionName !== 'overview' || !noSnapshotEdge || Boolean(
      isMobileOverview
        ? (
          mobileFlatNoSnapshotOk &&
          /路由快照缺失|默认路由待判定|默认路由不可判定/.test(overviewNoSnapshotMobileSemanticText) &&
          !/缺少当前路由快照，无法判断默认路由影响/.test(overviewNoSnapshotMobileSemanticText)
        )
        : (
          /业务数据展示边界|业务展示边界|展示范围|业务快照/.test(overviewNoSnapshotCurrentText) &&
          /WAN/.test(overviewNoSnapshotCurrentText) &&
          /速率\s*不展示|速率不展示/.test(overviewNoSnapshotCurrentText) &&
          /缺少当前路由快照|路由快照缺失|路由快照未取回|当前路由表未取回/.test(overviewNoSnapshotCurrentText) &&
          /无业务快照(?:，业务数据不展示)?|业务数据不展示|业务状态不可参考/.test(overviewNoSnapshotCurrentText)
        )
    );
    const overviewNoSnapshotRepetitionBudgetOk = sectionName !== 'overview' || !noSnapshotEdge || Boolean(
      overviewNoSnapshotRepeatedWordCounts.noDisplay <= overviewNoSnapshotRepeatedTokenBudget.noDisplay &&
      overviewNoSnapshotRepeatedWordCounts.noShow <= overviewNoSnapshotRepeatedTokenBudget.noShow &&
      overviewNoSnapshotRepeatedWordCounts.notListed <= overviewNoSnapshotRepeatedTokenBudget.notListed &&
      overviewNoSnapshotRepeatedWordCounts.missing <= overviewNoSnapshotRepeatedTokenBudget.missing &&
      overviewNoSnapshotRepeatedWordCounts.unknown <= overviewNoSnapshotRepeatedTokenBudget.unknown &&
      overviewNoSnapshotRepeatedWordCounts.pending <= overviewNoSnapshotRepeatedTokenBudget.pending &&
      overviewNoSnapshotRepeatedWordCounts.unavailable <= overviewNoSnapshotRepeatedTokenBudget.unavailable &&
      overviewNoSnapshotRepeatedWordCounts.trackedTotal <= overviewNoSnapshotRepeatedTokenBudget.trackedTotal
    );
    const overviewNoSnapshotDesktopFieldDensityOk = sectionName !== 'overview' || !isDesktopOverview || !noSnapshotEdge || Boolean(
      (overviewNoSnapshotEvidenceTableRows.length >= 4 || overviewNoSnapshotGridItems.length >= 6 || overviewDesktopDetailRows.length >= 6) &&
      overviewNoSnapshotDenseModuleOk &&
      overviewNoSnapshotModuleCountOk &&
      overviewNoSnapshotDowngradeReasonsOk &&
      overviewNoSnapshotRepetitionBudgetOk &&
      overviewNoSnapshotDesktopCoreFactsOk &&
      overviewNoSnapshotDesktopVisibleCellCount >= 32 &&
      overviewNoSnapshotRowHeightOk
    );
    const overviewActionLinksLowChromeOk = sectionName !== 'overview' || overviewDrilldownVisibleLinks.length === 0 || Boolean(
      isMobileOverview && mobileFlatLinkLabelsOk && !/建议查看|建议：/.test(mobileFlatStatusText) ||
      overviewDrilldownVisibleLinks.every((node) => {
        const style = getComputedStyle(node);
        const borderWidths = [
          style.borderTopWidth,
          style.borderRightWidth,
          style.borderBottomWidth,
          style.borderLeftWidth,
        ];
        const isMobileFlatLink = node.classList.contains('ik-mobile-flat-link');
        if (isMobileFlatLink) {
          const label = normalize(node.textContent || '');
          return mobileAllowedActionLabels.has(label) &&
            !/建议查看|建议：/.test(label) &&
            Number.parseFloat(style.minHeight || '0') <= 32;
        }
        return borderWidths.every((width) => Number.parseFloat(width || '0') <= 0) &&
          style.backgroundColor === 'rgba(0, 0, 0, 0)' &&
          style.backgroundImage === 'none' &&
          style.boxShadow === 'none' &&
          Number.parseFloat(style.paddingLeft || '0') <= 6 &&
          Number.parseFloat(style.paddingRight || '0') <= 6 &&
          Number.parseFloat(style.minHeight || '0') <= 24 &&
          (isMobileFlatLink ? ['underline', 'none'].includes(style.textDecorationLine) : style.textDecorationLine === 'none');
      })
    );
    const overviewFirstScreenRoot = isMobileOverview ? mobileFirstScreen : (overviewSummaryShell || sectionRoot);
    const overviewOldCardNodes = Array.from(overviewFirstScreenRoot?.querySelectorAll('.ik-mobile-incident-card, .ik-mobile-metric-grid, .ik-home-operator-card') || [])
      .filter(nodeVisibleInFirstScreen);
    const overviewCardBudgetOk = sectionName !== 'overview' || Boolean(
      overviewOldCardNodes.length === 0 &&
      (!isMobileOverview || overviewFlatMobileContractOk && Array.from(mobileFirstScreen?.children || []).length <= 2)
    );
    const overviewVisualBalanceSelectors = [
      '[data-overview-chart-type]',
      '[data-overview-visual-block]',
      '[data-overview-kpi-card]',
      '[data-overview-status-bar]',
      '.ik-overview-kpi-card',
      '.ik-overview-visual-module',
      '.ik-overview-resource-spark',
      '.ik-overview-resource-sparks',
      '.ik-overview-chart-shell',
      '.ik-overview-traffic-layout',
      '.ik-overview-wan-strip',
      '.ik-overview-interface-strip',
      '.ik-overview-channel-grid',
      '.ik-overview-bar-list',
      '.ik-overview-timeline',
      '.ik-overview-module-matrix',
      '.ik-v420-timeline-row',
      '.ik-home-flat-topbar',
      '.ik-home-status-tile',
      '.ik-home-ops-item',
      '.ik-summary-box',
      '.ik-home-evidence-grid',
      '.ik-home-evidence-list',
      '.ik-home-evidence-matrix',
      '.ik-home-mini-table',
      '.ik-home-mini-table-wrap',
      '.ops-table-wrap',
      'table',
    ].join(',');
    const overviewVisualBalanceAllowedTypes = new Set(['line', 'bar', 'status', 'spark', 'matrix', 'timeline', 'donut']);
    const overviewVisualBalanceRawNodes = Array.from(sectionRoot?.querySelectorAll(overviewVisualBalanceSelectors) || [])
      .filter(nodeVisibleInFirstScreen);
    const overviewVisualBalanceNodes = overviewVisualBalanceRawNodes.filter((node, index, nodes) => !nodes.some((other, otherIndex) => otherIndex !== index && other.contains(node)));
    const overviewVisualBalanceTypeForNode = (node) => {
      if (!node) return '';
      const rawType = String(node.getAttribute('data-overview-chart-type') || '').toLowerCase().replace(/[^a-z]+/g, '');
      if (overviewVisualBalanceAllowedTypes.has(rawType)) return rawType;
      if (/spark/.test(rawType)) return 'spark';
      if (/timeline/.test(rawType)) return 'timeline';
      if (/donut|ring/.test(rawType)) return 'donut';
      if (/matrix|table/.test(rawType)) return 'matrix';
      if (/bar/.test(rawType)) return 'bar';
      if (/line|trend/.test(rawType)) return 'line';
      if (/status|kpi|summary|signal|tile/.test(rawType)) return 'status';
      const className = Array.from(node.classList || []).join(' ').toLowerCase();
      if (/ik-overview-resource-spark|ik-overview-resource-sparks/.test(className)) return 'spark';
      if (/ik-overview-bar-list|ik-overview-bar-row/.test(className)) return 'bar';
      if (/ik-overview-timeline/.test(className)) return 'timeline';
      if (/ik-overview-protocol-mix|ik-overview-protocol-ring/.test(className)) return 'donut';
      if (/ik-overview-chart-shell|ik-overview-traffic-layout|line-trend-grid|line-bar/.test(className)) return 'line';
      if (/ik-overview-module-matrix|ik-home-evidence-grid|ik-home-evidence-list|ik-home-evidence-matrix|ik-home-mini-table|ops-table-wrap/.test(className) || node.tagName === 'TABLE') return 'matrix';
      if (/ik-overview-kpi-card|ik-v420-timeline-row|ik-home-flat-topbar|ik-home-status-tile|ik-home-ops-item|ik-summary-box|ik-overview-channel-grid|ik-overview-wan-strip|ik-overview-interface-strip|ik-overview-stat-tile/.test(className)) return 'status';
      return '';
    };
    const selectorForNode = (node) => {
      if (!node) return '';
      if (node.id) return '#' + node.id;
      const dataKey = Array.from(node.attributes || []).find((attr) => /^data-overview/.test(attr.name));
      if (dataKey) return '[' + dataKey.name + ']';
      const cls = Array.from(node.classList || []).slice(0, 3).join('.');
      return node.tagName.toLowerCase() + (cls ? '.' + cls : '');
    };
    const overviewVisualBalanceTypes = [...new Set(
      overviewVisualBalanceRawNodes
        .map((node) => overviewVisualBalanceTypeForNode(node))
        .filter((type) => overviewVisualBalanceAllowedTypes.has(type))
    )];
    const overviewVisualBalanceTypeCount = overviewVisualBalanceTypes.length;
    const overviewDesktopVisualHasLine = overviewVisualBalanceTypes.includes('line') ||
      noSnapshotEdge ||
      ['collection-down', 'interfaces-down'].includes(scaleScenario);
    const overviewDesktopVisualHasBar = overviewVisualBalanceTypes.includes('bar') ||
      noSnapshotEdge ||
      Boolean(sectionRoot?.querySelector('[data-overview-offline-status-blocks]'));
    const overviewDesktopVisualHasStatusOrResource = overviewVisualBalanceTypes.some((type) =>
      ['status', 'spark', 'matrix', 'timeline', 'donut'].includes(type)
    );
    const overviewDesktopKpiCards = Array.from(sectionRoot?.querySelectorAll('[data-overview-kpi-card], .ik-overview-kpi-card') || [])
      .filter(nodeVisibleInFirstScreen);
    const overviewDesktopKpiCount = overviewDesktopKpiCards.length;
    const overviewDesktopKpiStructureRecords = overviewDesktopKpiCards.map((node) => {
      const directChildren = Array.from(node.children || []).filter(nodeVisibleInFirstScreen);
      return {
        childCount: directChildren.length,
        labelCount: directChildren.filter((child) => child.tagName === 'SPAN').length,
        mainCount: directChildren.filter((child) => child.tagName === 'B').length,
        subCount: directChildren.filter((child) => child.tagName === 'EM').length,
        nestedTableCount: node.querySelectorAll('table, .ops-table-wrap').length,
        text: normalize(node.textContent || '').slice(0, 80),
      };
    });
    const overviewDesktopKpiStructureOk = overviewDesktopKpiStructureRecords.every((card) =>
      card.labelCount === 1 &&
      card.mainCount === 1 &&
      card.subCount <= 1 &&
      card.childCount >= 2 &&
      card.childCount <= 3 &&
      card.nestedTableCount === 0
    );
    const overviewDesktopKpiBalanceOk = ['single', 'fleet'].includes(scaleScenario)
      ? overviewDesktopKpiCount === 0
      : overviewDesktopKpiCount > 0 && overviewDesktopKpiCount <= 6 && overviewDesktopKpiStructureOk;
    const overviewDesktopTableNodes = Array.from(sectionRoot?.querySelectorAll('table, .ops-table-wrap, .ik-home-mini-table, .ik-home-mini-table-wrap, [data-overview-detail-section="table"]') || [])
      .filter(nodeVisibleInFirstScreen);
    const overviewDesktopTableNodesUnique = overviewDesktopTableNodes.filter((node, index, nodes) => !nodes.some((other, otherIndex) => otherIndex !== index && other.contains(node)));
    const visibleNodeArea = (node) => {
      if (!node) return 0;
      const rect = node.getBoundingClientRect();
      const left = Math.max(0, rect.left);
      const right = Math.min(window.innerWidth, rect.right);
      const top = Math.max(0, rect.top);
      const bottom = Math.min(window.innerHeight, rect.bottom);
      const width = Math.max(0, right - left);
      const height = Math.max(0, bottom - top);
      return width * height;
    };
    const rectsOverlap = (a, b) => {
      if (!a || !b) return false;
      const horizontal = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const vertical = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return horizontal > 1 && vertical > 1;
    };
    const overviewDesktopTableAreaPx = overviewDesktopTableNodesUnique.reduce((sum, node) => sum + visibleNodeArea(node), 0);
    const overviewDesktopViewportAreaPx = Math.max(1, window.innerWidth * window.innerHeight);
    const overviewDesktopTableAreaRatio = Number((overviewDesktopTableAreaPx / overviewDesktopViewportAreaPx).toFixed(3));
    const overviewDesktopChartMatrixNodes = overviewVisualBalanceNodes.filter((node) =>
      node.hasAttribute('data-overview-visual-block') &&
      ['line', 'bar', 'spark', 'matrix', 'timeline', 'donut', 'status'].includes(overviewVisualBalanceTypeForNode(node))
    );
    const overviewDesktopChartMatrixAreaPx = overviewDesktopChartMatrixNodes.reduce((sum, node) => sum + visibleNodeArea(node), 0);
    const overviewDesktopChartMatrixAreaRatio = Number((overviewDesktopChartMatrixAreaPx / overviewDesktopViewportAreaPx).toFixed(3));
    const overviewDesktopChartReadabilityRecords = isDesktopOverview
      ? overviewDesktopChartMatrixNodes.map((node) => {
        const rect = node.getBoundingClientRect();
        const type = overviewVisualBalanceTypeForNode(node);
        const text = normalize(node.textContent || '');
        const graphicMarks = node.querySelectorAll('svg path, svg polyline, svg line, svg rect, svg circle, [data-overview-chart-point], [data-overview-bar], [data-overview-module-cell], .ro-chart-mean, .ro-chart-current, .ro-chart-peak, .ro-chart-threshold, .ik-overview-bar-row, .ik-overview-chain-node, .ik-overview-module-cell').length;
        const hasReadableSize = rect.width >= 140 && rect.height >= 56;
        const hasMeaningfulMarks = type === 'line' || type === 'bar'
          ? graphicMarks >= 2
          : (graphicMarks >= 1 || text.length >= 8);
        return {
          selector: selectorForNode(node),
          type,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          graphicMarks,
          text: text.slice(0, 80),
          readable: hasReadableSize && hasMeaningfulMarks,
        };
      })
      : [];
    const overviewDesktopChartReadabilityOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      overviewDesktopChartReadabilityRecords.length >= (noSnapshotEdge ? 1 : 2) &&
      overviewDesktopChartReadabilityRecords.some((record) => record.readable && record.type === 'line') &&
      overviewDesktopChartReadabilityRecords.some((record) => record.readable && ['bar', 'status', 'spark', 'matrix', 'timeline', 'donut'].includes(record.type)) &&
      overviewDesktopChartReadabilityRecords.filter((record) => record.readable).length >= (noSnapshotEdge ? 1 : 2)
    );
    const overviewVisualPlaceholderPattern = /(?:暂无|未采集|待确认|不可判定|不可用|无快照|业务数据不展示|轮询中|加载中|placeholder|skeleton|缺失|暂停|等待|未读取|未记录|尚未|无业务快照|无可用)/i;
    const overviewVisualPlaceholderNodes = overviewVisualBalanceRawNodes.filter((node) => overviewVisualPlaceholderPattern.test(normalize(node.textContent || '')));
    const overviewVisualPlaceholderCount = overviewVisualPlaceholderNodes.length;
    const overviewVisualPlaceholderOk = !noSnapshotEdge || overviewVisualPlaceholderCount > 0;
    const overviewMobileFirstScreenTableNodes = isMobileOverview
      ? Array.from(sectionRoot?.querySelectorAll('table, .ops-table-wrap, .ik-home-mini-table, .ik-home-mini-table-wrap, [data-overview-detail-section="table"]') || [])
        .filter(nodeVisibleInFirstScreen)
      : [];
    const overviewMobileFirstScreenTableNodesUnique = overviewMobileFirstScreenTableNodes.filter((node, index, nodes) => !nodes.some((other, otherIndex) => otherIndex !== index && other.contains(node)));
    const overviewMobileFirstScreenTableCount = overviewMobileFirstScreenTableNodesUnique.length;
    const mobile390VisibleTableVisualNodes = mobileOverview390x844
      ? Array.from(mobileFirstScreen?.querySelectorAll('table, thead, tbody, tr, th, td, .ops-table-wrap, .ik-home-mini-table, .ik-home-mini-table-wrap, [data-overview-detail-section="table"]') || [])
        .filter((node) => {
          if (!nodeVisibleInFirstScreen(node)) return false;
          const rect = node.getBoundingClientRect();
          if (rect.width < 8 || rect.height < 8) return false;
          const style = getComputedStyle(node);
          const display = String(style.display || '').toLowerCase();
          return ['TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD'].includes(node.tagName) ||
            display.includes('table') ||
            node.classList.contains('ops-table-wrap') ||
            node.classList.contains('ik-home-mini-table') ||
            node.classList.contains('ik-home-mini-table-wrap') ||
            node.getAttribute('data-overview-detail-section') === 'table';
        })
      : [];
    const mobile390VisibleTableVisualCount = mobile390VisibleTableVisualNodes.length;
    const mobile390Kpi2x2MarkerNodes = mobileOverview390x844
      ? Array.from((sectionRoot || mobileFirstScreen)?.querySelectorAll('[data-overview-mobile-kpi-grid], [data-overview-mobile-kpi2x2], .ik-mobile-kpi-grid, .ik-mobile-metric-grid, .MobileMetricGrid') || [])
        .filter(nodeVisibleInFirstScreen)
      : [];
    const mobile390Kpi2x2GeometryRecords = mobileOverview390x844
      ? Array.from((mobileFirstScreen || sectionRoot)?.querySelectorAll('[class*="kpi" i], [class*="metric" i], [data-overview-kpi-card], [data-overview-mobile-metrics]') || [])
        .filter(nodeVisibleInFirstScreen)
        .map((node) => {
          const children = Array.from(node.children || [])
            .filter(nodeVisibleInFirstScreen)
            .map((child) => ({ child, rect: child.getBoundingClientRect(), text: normalize(child.textContent || '') }))
            .filter((item) => item.rect.width >= 36 && item.rect.height >= 20 && item.text.length > 0);
          if (children.length !== 4) return null;
          const centers = children.map((item) => ({
            x: Math.round(item.rect.left + item.rect.width / 2),
            y: Math.round(item.rect.top + item.rect.height / 2),
          }));
          const columns = new Set(centers.map((point) => Math.round(point.x / 24))).size;
          const rows = new Set(centers.map((point) => Math.round(point.y / 24))).size;
          const rect = node.getBoundingClientRect();
          const text = children.map((item) => item.text).join(' ');
          const looksLikeKpiCopy = /%|B\\/s|bps|ms|wan|cpu|latency|traffic|resource|collection|snapshot|interface|line|bar|spark|matrix|chain|rate|rest|ssh|upload|download|memory|disk|online|offline/i.test(text);
          return columns === 2 && rows === 2 && looksLikeKpiCopy ? {
            selector: selectorForNode(node),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            text: text.slice(0, 120),
          } : null;
        })
        .filter(Boolean)
      : [];
    const overviewMobile390NoKpi2x2Ok = !mobileOverview390x844 || (mobile390Kpi2x2MarkerNodes.length === 0 && mobile390Kpi2x2GeometryRecords.length === 0);
    const mobile390OldFieldStackNodes = mobileOverview390x844
      ? Array.from((sectionRoot || mobileFirstScreen)?.querySelectorAll('.ik-mobile-metric-grid, .ik-mobile-field-stack, .ik-home-operator-grid, .ik-home-operator-card, .ik-mobile-incident-card, [data-overview-mobile-field-stack], [data-overview-mobile-kpi-grid], [data-overview-mobile-kpi2x2]') || [])
        .filter(nodeVisibleInFirstScreen)
      : [];
    const overviewMobile390NoOldKpiStackOk = !mobileOverview390x844 || mobile390OldFieldStackNodes.length === 0;
    const mobileFirstScreenPortMatrix = Boolean(mobileFirstScreen?.querySelector('.ro-port-matrix-row, .ro-wan-port-visual, [data-overview-wan-offline-bars], .ik-overview-module-matrix, .ik-no-snapshot-matrix-grid, .ik-no-snapshot-matrix-cell, .ik-v240-ports, [data-overview-mobile-v240-visual*="port"], [data-overview-mobile-v240-visual*="matrix"]'));
    const mobileFirstScreenMiniVisual = Boolean(mobileFirstScreen?.querySelector('.ik-mobile-wan-trend, .ik-mobile-resource-decision, .ik-mobile-channel-decision, .ik-mobile-incident-decision, .ik-mobile-channel-line, .ik-mobile-interface-chain, .ik-mobile-channel-rail, .ik-v420-resource-meter-set, .ik-mobile-spark-panel, .ik-no-snapshot-mini-event, .ik-v240-traffic, .ik-v240-resource-trends, .ik-v240-channel-line, .ik-v240-flow'));
    const mobileFirstScreenChannelVisual = Boolean(mobileFirstScreen?.querySelector('.ik-mobile-channel-decision, .ik-mobile-channel-line, .ik-mobile-channel-rail, .ik-overview-channel-grid, .ik-overview-channel-cards, .ik-no-snapshot-channel-grid, .ik-no-snapshot-channel-card, .ik-v240-channel-line'));
    const mobileFirstScreenChainVisual = Boolean(mobileFirstScreen?.querySelector('.ik-mobile-interface-chain, .ik-overview-link-chain, .ik-overview-chain-node, .ik-no-snapshot-chain, .ik-no-snapshot-chain-node, .ik-v240-flow, [data-overview-mobile-v240-visual*="flow"], [data-overview-mobile-v240-visual*="chain"]'));
    const mobileFirstScreenSceneVisualNodes = mobileOverview390x844
      ? Array.from(mobileFirstScreen?.querySelectorAll('.ik-mobile-wan-trend, .ik-mobile-resource-decision, .ik-mobile-channel-decision, .ik-mobile-incident-decision, .ik-mobile-spark-panel, .ik-v420-resource-meter-set, .ro-port-matrix-row, .ro-wan-port-visual, [data-overview-wan-offline-bars], .ik-mobile-channel-line, .ik-mobile-channel-rail, .ik-mobile-interface-chain, .ik-no-snapshot-chain, .ik-no-snapshot-chain-node, .ik-v240-traffic, .ik-v240-ports, .ik-v240-channel-line, .ik-v240-flow, .ik-v240-resource-trends') || [])
        .filter(nodeVisibleInFirstScreen)
      : [];
    const mobile390ScenarioVisualRecords = mobileOverview390x844
      ? mobileFirstScreenSceneVisualNodes.map((node) => {
        const rect = node.getBoundingClientRect();
        const text = normalize(node.textContent || '');
        const graphicMarks = node.querySelectorAll('svg path, svg polyline, svg line, svg rect, svg circle, [data-overview-chart-point], [data-overview-bar], [data-overview-module-cell], .ro-port-matrix-cell, .ik-mobile-channel-dot, .ik-no-snapshot-chain-node').length;
        const dataToken = [
          node.getAttribute('data-overview-chart-type'),
          node.getAttribute('data-overview-scene-chart'),
          node.getAttribute('data-overview-mobile-first-visual'),
          node.getAttribute('data-overview-mobile-first-microchart'),
          node.getAttribute('data-overview-mobile-v240-visual'),
          node.className,
        ].filter(Boolean).join(' ');
        const meaningfulToken = /traffic|wan|resource|collection|snapshot|interface|line|bar|spark|matrix|chain|rate|latency|cpu|memory|disk|status|scenario|insight|incident|verdict|impact|object/i.test(dataToken);
        const readable = rect.width >= 72 && rect.height >= 16 && (text.length >= 6 || graphicMarks >= 2) && meaningfulToken;
        return {
          selector: selectorForNode(node),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          graphicMarks,
          dataToken,
          className: String(node.className || ''),
          text: text.slice(0, 80),
          readable,
        };
      })
      : [];
    const mobile390ScenarioVisualNotDecorativeOk = !mobileOverview390x844 || mobile390ScenarioVisualRecords.some((record) => record.readable);
    const mobile390AppHomeChromeNodes = mobileOverview390x844
      ? Array.from((sectionRoot || mobileFirstScreen)?.querySelectorAll('.ik-mobile-device-bar, .ik-mobile-primary-conclusion, .ik-mobile-core-facts, .ik-mobile-supporting-surface, .ik-mobile-supporting-list, .ik-v420-tabs, .ik-v159-nav, .ik-v159-network-hero, .ik-v159-secondary, .ik-v159-resource-strip, .ik-v159-top-list, .ik-v159-tabbar, .ik-v240-nav, .ik-v240-hero, .ik-v240-facts, .ik-v240-strip, .ik-v240-list, .ik-v240-tabs, [data-overview-mobile-v159-nav], [data-overview-mobile-v159-main-hero], [data-overview-mobile-v159-secondary], [data-overview-mobile-v159-resource], [data-overview-mobile-v159-topn], [data-overview-mobile-v159-tabbar], [data-overview-mobile-v240-nav], [data-overview-mobile-v240-hero], [data-overview-mobile-v240-facts], [data-overview-mobile-v240-status-strip], [data-overview-mobile-v240-list], [data-overview-mobile-hero-metrics], [data-overview-mobile-v240-big-numbers], [data-overview-mobile-bottom-tab]') || [])
        .filter((node) => node.classList.contains('ik-ios-bottom-tab') ? nodeVisibleInViewport(node) : nodeVisibleInFirstScreen(node))
      : [];
    const mobile390AppHomeRankPresent = !mobileOverview390x844 || Boolean((sectionRoot || mobileFirstScreen)?.querySelector('.ik-mobile-supporting-list, .ik-v159-top-list, [data-overview-mobile-v159-topn], .ik-v240-list, [data-overview-mobile-v240-list]'));
    const mobile390AppHomeHeroMetricsOk = !mobileOverview390x844 || Boolean((sectionRoot || mobileFirstScreen)?.querySelector('.ik-mobile-core-facts, [data-overview-mobile-hero-metrics], [data-overview-mobile-v240-big-numbers]'));
    const mobile390AppHomeResourceCardOk = !mobileOverview390x844 || Boolean((sectionRoot || mobileFirstScreen)?.querySelector('.ik-mobile-core-facts, [data-overview-mobile-v159-secondary="wan-collection-two-cards-not-2x2"], .ik-v159-secondary, .ik-v240-facts, .ik-v240-strip, .ik-v240-resource-trends, [data-overview-mobile-v240-facts], [data-overview-mobile-v240-status-strip]'));
    const mobile390AppHomeRankCardOk = !mobileOverview390x844 || Boolean((sectionRoot || mobileFirstScreen)?.querySelector('.ik-mobile-supporting-list, [data-overview-mobile-v159-topn], .ik-v159-top-list, .ik-v240-list, [data-overview-mobile-v240-list]'));
    const mobile390AppHomeTabControls = {
      home: 'mobile-home-view',
      wan: 'mobile-wan-view',
      interface: 'mobile-interface-view',
      terminal: 'mobile-terminal-view',
      log: 'mobile-log-view',
    };
    const mobile390AppHomeBottomTabOk = !mobileOverview390x844 || (() => {
      const navigation = sectionRoot?.querySelector('nav[aria-label="路由器监控底部导航"]');
      const tabButtons = Array.from(navigation?.querySelectorAll('button[aria-controls^="mobile-"]') || []);
      const activeTab = tabButtons.filter((button) => button.getAttribute('aria-current') === 'page');
      return Boolean(
        navigation &&
        nodeVisibleInViewport(navigation) &&
        tabButtons.length === Object.keys(mobile390AppHomeTabControls).length &&
        activeTab.length === 1 &&
        activeTab[0]?.getAttribute('aria-controls') === mobile390AppHomeTabControls.home &&
        Boolean(document.getElementById(mobile390AppHomeTabControls.home)) &&
        Object.entries(mobile390AppHomeTabControls).every(([tabId, viewId]) => {
          const button = navigation.querySelector('#mobile-tab-' + tabId);
          return button?.getAttribute('aria-controls') === viewId;
        })
      );
    })();
    const mobile390ResourcePressureVisualOk = scaleScenario === 'resource-full' && mobile390ScenarioVisualRecords.some((record) => (
      record.readable &&
      /处理器|内存|磁盘|CPU|MEM|DISK/.test(record.text)
    ));
    const mobile390AppHomeChromeOk = !mobileOverview390x844 || Boolean(
      mobile390AppHomeChromeNodes.some((node) => node.classList.contains('ik-mobile-device-bar') || node.classList.contains('ik-v159-nav') || node.classList.contains('ik-v240-nav') || node.hasAttribute('data-overview-mobile-v159-nav') || node.hasAttribute('data-overview-mobile-v240-nav')) &&
      mobile390AppHomeChromeNodes.some((node) => node.classList.contains('ik-mobile-primary-conclusion') || node.classList.contains('ik-v159-network-hero') || node.classList.contains('ik-v240-hero') || node.hasAttribute('data-overview-mobile-v159-main-hero') || node.hasAttribute('data-overview-mobile-v240-hero')) &&
      mobile390AppHomeChromeNodes.some((node) => node.classList.contains('ik-mobile-supporting-list') || node.classList.contains('ik-v159-top-list') || node.classList.contains('ik-v240-list') || node.hasAttribute('data-overview-mobile-v159-topn') || node.hasAttribute('data-overview-mobile-v240-list')) &&
      mobile390AppHomeRankPresent &&
      mobile390AppHomeChromeNodes.some((node) => node.classList.contains('ik-v420-tabs') || node.classList.contains('ik-v159-tabbar') || node.classList.contains('ik-v240-tabs') || node.hasAttribute('data-overview-mobile-v159-tabbar') || node.hasAttribute('data-overview-mobile-bottom-tab')) &&
      mobile390AppHomeHeroMetricsOk &&
      mobile390AppHomeResourceCardOk &&
      mobile390AppHomeRankCardOk &&
      mobile390AppHomeBottomTabOk
    );
    const mobile390AppHomeTwinOk = !mobileOverview390x844 || Boolean(
      (mobileFirstScreen || sectionRoot)?.querySelector('.ik-mobile-supporting-list, [data-overview-mobile-v159-topn], .ik-v159-top-list, .ik-v240-list, [data-overview-mobile-v240-list]')
    );
    const mobile390AppHomeScenarioVisualOk = !mobileOverview390x844 || Boolean(
      mobileFirstScreenSceneVisualNodes.length > 0 ||
      mobileFirstScreenPortMatrix ||
      mobileFirstScreenMiniVisual ||
      mobileFirstScreenChannelVisual ||
      mobileFirstScreenChainVisual
    );
    const mobile390AppHomeRingTrafficOk = !mobileOverview390x844 || Boolean(
      mobile390ResourcePressureVisualOk ||
      (
        (noSnapshotEdge || mobile390AppHomeChromeNodes.some((node) => node.classList.contains('ik-mobile-primary-conclusion') || node.classList.contains('ik-v159-network-hero') || node.hasAttribute('data-overview-mobile-v159-main-hero') || node.classList.contains('ik-v159-top-list'))) &&
        (
          mobileFirstScreen?.querySelector('.ik-mobile-wan-trend, .ik-mobile-channel-decision, .ik-mobile-incident-decision, .ik-mobile-traffic-spark, .ik-v240-traffic, .ik-v240-visual, .ik-ios-rank-card') ||
          mobile390AppHomeChromeNodes.some((node) => node.classList.contains('ik-ios-rank-card'))
        )
      )
    );
    const mobile390FirstDetailRows = mobileOverview390x844
      ? Array.from((sectionRoot || mobileFirstScreen)?.querySelectorAll('.ik-ios-rank-row, .ik-mobile-detail-row, .ik-mobile-flat-row, [data-overview-mobile-wan-row="true"], [role="row"]') || [])
        .filter((node) => nodeVisibleInFirstScreen(node) && normalize(node.textContent || '').length > 0)
      : [];
    const overviewMobile390FirstScreenNoTableOk = !mobileOverview390x844 || (overviewMobileFirstScreenTableCount === 0 && mobile390VisibleTableVisualCount === 0);
    const overviewMobile390FirstTwoRowsVisibleOk = !mobileOverview390x844 || Boolean(
      sectionRoot?.querySelector('.ik-mobile-public-home') ||
      (
        mobile390FirstDetailRows.length >= 2 &&
        mobile390FirstDetailRows.slice(0, 2).every(nodeVisibleInFirstScreen)
      )
    );
    const overviewMobile390AppHomeFirstOk = mobile390AppHomeChromeOk && mobile390AppHomeTwinOk && mobile390AppHomeHeroMetricsOk && mobile390AppHomeResourceCardOk && mobile390AppHomeRankCardOk && mobile390AppHomeBottomTabOk && overviewMobile390FirstScreenNoTableOk && overviewMobile390NoOldKpiStackOk && mobile390ScenarioVisualNotDecorativeOk;
    const overviewMobile390FirstScreenVisualOk = !mobileOverview390x844 || Boolean(
      mobile390AppHomeScenarioVisualOk &&
      mobile390ScenarioVisualNotDecorativeOk &&
      mobile390AppHomeRingTrafficOk
    );
    const overviewSparseTrafficShells = Array.from(sectionRoot?.querySelectorAll('[data-overview-sparse-traffic-shell]') || [])
      .filter(nodeVisibleInFirstScreen);
    const overviewSparseTrafficReadouts = Array.from(sectionRoot?.querySelectorAll('[data-overview-sparse-traffic="true"]') || [])
      .filter(nodeVisibleInFirstScreen);
    const overviewChartMetaNodes = Array.from(sectionRoot?.querySelectorAll('[data-overview-chart-meta], [data-overview-chart-window], [data-overview-sample-points][data-overview-time-window][data-overview-confidence]') || [])
      .filter(nodeVisibleInFirstScreen);
    const overviewChartMetaText = normalize(overviewChartMetaNodes.map((node) => node.textContent || '').join(' '));
    const overviewSparseTrafficReadoutRecords = overviewSparseTrafficReadouts.map((node) => ({
      text: normalize(node.textContent || '').slice(0, 140),
      samplePoints: node.getAttribute('data-overview-sample-points') || '',
      timeWindow: node.getAttribute('data-overview-time-window') || '',
      confidence: node.getAttribute('data-overview-confidence') || '',
    }));
    const overviewTrendReadoutClipSamples = Array.from(new Set([
      ...overviewTrendReadoutNodes,
      ...overviewSparseTrafficReadouts,
    ]))
      .map((node) => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        const clipped = (
          (style.textOverflow === 'ellipsis' && node.scrollWidth > node.clientWidth + 2) ||
          (['hidden', 'clip'].includes(style.overflow) && node.scrollHeight > node.clientHeight + 2) ||
          (style.whiteSpace === 'nowrap' && node.scrollWidth > node.clientWidth + 2)
        );
        return clipped ? {
          selector: selectorForNode(node),
          text: normalize(node.textContent || '').slice(0, 120),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          scrollWidth: Math.round(node.scrollWidth),
          scrollHeight: Math.round(node.scrollHeight),
        } : null;
      })
      .filter(Boolean);
    const overviewTrendReadoutRealHeightOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      overviewTrendReadoutNodes.length === 0 ||
      overviewTrendReadoutNodes.every((node) => {
        const rect = node.getBoundingClientRect();
        return rect.height >= 24 && rect.width >= 120 && node.clientHeight > 0;
      })
    );
    const overviewChartReadabilityOk = sectionName !== 'overview' || Boolean(
      (!isDesktopOverview || overviewSparseTrafficShells.length === 0 || overviewSparseTrafficReadouts.length >= 2) &&
      (!isDesktopOverview || new RegExp(['\u70b9', '1s', '\u7f13\u5b58', '\u4e1a\u52a1\u5feb\u7167', '\u53ef\u4fe1', '\u672a\u91c7\u96c6'].join('|')).test(overviewChartMetaText + ' ' + overviewDesktopTopText + ' ' + overviewDesktopDetailText)) &&
      (!isMobileOverview || sectionRoot?.querySelector('[data-overview-mobile-core-block="wan"]')) &&
      (!isMobileOverview || sectionRoot?.querySelector('[data-overview-mobile-core-block="collection"]')) &&
      (!isMobileOverview || sectionRoot?.querySelector('[data-overview-mobile-core-block="resource"]')) &&
      (!isMobileOverview || Array.from(sectionRoot?.querySelectorAll('.ik-v420-resource-meter, .ik-v420-timeline-row') || []).filter(nodeVisibleInFirstScreen).length >= 3) &&
      overviewTrendReadoutRealHeightOk &&
      overviewTrendReadoutClipSamples.length === 0 &&
      overviewDesktopChartReadabilityOk
    );
    const overviewVisualBalanceDesktopOk = Boolean(
      overviewDesktopKpiBalanceOk &&
      overviewVisualBalanceTypeCount >= (noSnapshotEdge ? 2 : 3) &&
      (overviewDesktopVisualHasLine || scaleScenario === 'all-offline') &&
      overviewDesktopVisualHasBar &&
      overviewDesktopVisualHasStatusOrResource &&
      overviewDesktopChartMatrixAreaRatio >= 0.40 &&
      overviewDesktopTableAreaRatio <= 0.55 &&
      overviewVisualPlaceholderOk &&
      overviewChartReadabilityOk
    );
    const overviewVisualBalanceMobileOk = Boolean(
      overviewMobileFirstScreenTableCount <= 2 &&
      overviewVisualPlaceholderOk &&
      overviewChartReadabilityOk
    );
    const overviewVisualBalanceOk = sectionName !== 'overview' || Boolean(
      isDesktopOverview
        ? overviewVisualBalanceDesktopOk
        : isMobileOverview
          ? overviewVisualBalanceMobileOk
          : true
    );
    const overviewAllOfflinePortMatrixOk = sectionName !== 'overview' || scaleScenario !== 'all-offline' || Boolean(sectionRoot?.querySelector('.ro-port-matrix-row, .ro-wan-port-visual, [data-overview-wan-offline-bars]') || /WAN/.test(text));
    const overviewLargeTintNodes = Array.from(overviewFirstScreenRoot?.querySelectorAll('*') || [])
      .filter((node) => {
        if (!nodeVisibleInFirstScreen(node)) return false;
        const rect = node.getBoundingClientRect();
        if ((rect.width * rect.height) < (window.innerWidth * window.innerHeight * 0.035)) return false;
        const style = getComputedStyle(node);
        const bg = String(style.backgroundColor || '').replace(/\\s+/g, '');
        if (!bg || bg === 'transparent' || bg === 'rgba(0,0,0,0)') return false;
        if (/^rgb\(25[0-5],25[0-5],25[0-5]\)$/.test(bg)) return false;
        if (/^rgb\(24[5-9],24[5-9],24[5-9]\)$/.test(bg)) return false;
        return [
          'rgb(255,24',
          'rgb(255,23',
          'rgb(254,24',
          'rgb(255,250',
          'rgb(255,243',
          'rgb(254,242',
          'rgb(253,237',
          'rgb(255,247'
        ].some((prefix) => bg.startsWith(prefix));
      });
    const overviewForbiddenSemanticColorNodes = Array.from(overviewFirstScreenRoot?.querySelectorAll('*') || [])
      .filter((node) => {
        if (!nodeVisibleInFirstScreen(node)) return false;
        const style = getComputedStyle(node);
        const colors = [
          style.borderLeftColor,
          style.backgroundColor,
          style.color,
          style.fill,
          style.stroke,
        ].map((value) => String(value || '').replace(/\s+/g, ''));
        return colors.some((value) =>
          /rgb\(26,159,100\)|rgb\(27,157,89\)|rgb\(22,163,111\)|rgb\(212,155,34\)/.test(value)
        );
      })
      .slice(0, 12);
    const overviewSemanticColorBudgetOk = sectionName !== 'overview' || (
      overviewLargeTintNodes.length === 0 &&
      overviewForbiddenSemanticColorNodes.length === 0
    );
    const sampleRectCoverage = (target, contentSelector, columns = 10, rows = 10) => {
      if (!target) return null;
      const rect = target.getBoundingClientRect();
      const left = Math.max(0, rect.left);
      const right = Math.min(window.innerWidth, rect.right);
      const top = Math.max(0, rect.top);
      const bottom = Math.min(window.innerHeight, Math.max(top, rect.bottom));
      let filled = 0;
      let total = 0;
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
      const ratio = total ? filled / total : 0;
      return {
        filled,
        total,
        blank,
        ratio: Number(ratio.toFixed(3)),
        top: Math.round(top),
        bottom: Math.round(bottom),
        height: Math.round(bottom - top),
      };
    };
    const visibleLeafText = (nodes, visibleFn = nodeVisibleInFirstScreen) => {
      const visibleNodes = Array.from(nodes || []).filter(visibleFn);
      return visibleNodes
        .filter((node) => !visibleNodes.some((other) => other !== node && node.contains(other)))
        .map((node) => normalize(node.textContent || ''))
        .filter(Boolean)
        .join(' ');
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
    const overviewVisibleFactTexts = Array.from(new Set(
      overviewFieldNodes
        .filter(nodeVisibleInFirstScreen)
        .map((node) => normalize(node.textContent || '').replace(/\\s+/g, ' '))
        .filter(Boolean)
    ));
    const overviewVisibleFactCount = overviewVisibleFactTexts.length;
    const overviewNoSnapshotVisibleCellCount = (sectionName === 'overview' && noSnapshotEdge)
      ? Array.from(sectionRoot?.querySelectorAll([
        'tbody td',
        'tbody th',
        'thead th',
        '.ik-no-snapshot-ledger-cell',
        '.ik-overview-module-cell > *',
        '.ik-no-snapshot-event-row > *',
        '.ik-no-snapshot-summary-tile > *',
        '.ik-no-snapshot-chain-node > *',
        '.ik-summary-box span',
        '.ik-summary-box b',
        '.ik-home-flat-cell span',
        '.ik-home-flat-cell b',
        '.ik-mobile-detail-row span',
        '.ik-mobile-detail-row b',
        '.ik-mobile-section-head'
      ].join(',')) || []).filter(nodeVisibleInFirstScreen).length
      : 0;
    const overviewNoSnapshotMobileLedgerSemanticFactsOk = !isMobileOverview || Boolean(
      /快照缺失/.test(mobileFlatStatusText) &&
      /无业务快照，业务数据不展示|无业务快照|业务数据不展示/.test(mobileFlatStatusText) &&
      /默认路由|路由快照缺失/.test(mobileFlatStatusText) &&
      /WAN/.test(mobileFlatStatusText) &&
      /资源/.test(mobileFlatStatusText) &&
      /RouterOS\\s*当前不可达/.test(mobileFlatStatusText) &&
      /REST.*SSH/.test(mobileFlatStatusText) &&
      /失败端点\\s*未记录|失败端点未记录/.test(mobileFlatStatusText) &&
      /最近成功/.test(mobileFlatStatusText)
    );
    const overviewNoSnapshotEffectiveFactsOk = sectionName !== 'overview' || !noSnapshotEdge || (
      overviewNoSnapshotDesktopCoreFactsOk ||
      overviewVisibleFactCount >= 60 ||
      overviewNoSnapshotVisibleCellCount >= 60 ||
      overviewNoSnapshotMobileLedgerSemanticFactsOk
    );
    let overviewFirstScreenCoverageOk = sectionName !== 'overview';
    const firstScreenTextRoot = isMobileOverview && mobileFirstScreen ? mobileFirstScreen : sectionRoot;
    const firstScreenOverviewText = visibleLeafText(firstScreenTextRoot?.querySelectorAll([
      '[data-overview-field]',
      '[data-overview-mobile-alert]',
      '[data-overview-incident-line]',
      '.notice.danger',
      '.ik-home-operator-card'
    ].join(',')) || []);
    const countRegex = (value, pattern) => (String(value || '').match(pattern) || []).length;
    const firstScreenSampleRepeats = {
      fresh: countRegex(firstScreenOverviewText, /采样新鲜/g),
      history: countRegex(firstScreenOverviewText, /历史快照/g),
      missing: countRegex(firstScreenOverviewText, /快照缺失/g),
      stale: countRegex(firstScreenOverviewText, /数据陈旧|采样陈旧|采样偏旧/g),
    };
    const overviewNoSnapshotSurfaceText = (sectionName === 'overview' && noSnapshotEdge && isMobileOverview)
      ? [
        mobileFlatStatusText,
      ].join(' ')
      : overviewNoSnapshotCoreModuleText;
    const overviewNoSnapshotFakeDensityTokenCount = countRegex(overviewNoSnapshotSurfaceText, /不展示|不显示|不列|缺少|不可判定/g);
    const overviewNoSnapshotFakeDensityRatio = overviewNoSnapshotVisibleCellCount
      ? overviewNoSnapshotFakeDensityTokenCount / overviewNoSnapshotVisibleCellCount
      : 0;
    const overviewNoSnapshotFakeDensityOk = sectionName !== 'overview' || !noSnapshotEdge || Boolean(
      overviewNoSnapshotFakeDensityTokenCount <= 6 &&
      overviewNoSnapshotFakeDensityRatio <= 0.5 &&
      !overviewNoSnapshotReadonlyBoundaryModule &&
      !overviewNoSnapshotDegradedModulesModule
    );
    const overviewNoSnapshotGiantTableRecords = (sectionName === 'overview' && noSnapshotEdge)
      ? Array.from(sectionRoot?.querySelectorAll('table, .ops-table-wrap, .ik-home-evidence-table') || [])
        .filter(nodeVisibleInFirstScreen)
        .map((node) => {
          const rect = node.getBoundingClientRect();
          const rows = node.tagName === 'TABLE'
            ? node.querySelectorAll('tr').length
            : node.querySelectorAll('tr, .ik-home-evidence-row, [data-overview-field]').length;
          const cells = node.querySelectorAll('td, th, .ik-home-evidence-row > *, [data-overview-field]').length;
          return {
            selector: node.tagName.toLowerCase(),
            rows,
            cells,
            height: Math.round(rect.height),
            text: normalize(node.textContent || '').slice(0, 120),
          };
        })
        .filter((item) => noSnapshotEdge
          ? (item.rows > 32 || item.cells > 128 || item.height > Math.round(window.innerHeight * 0.75))
          : (item.rows > 10 || item.cells > 48 || item.height > Math.round(window.innerHeight * 0.5)))
      : [];
    const overviewNoSnapshotNoGiantTablesOk = sectionName !== 'overview' || !noSnapshotEdge || overviewNoSnapshotGiantTableRecords.length === 0;
    const overviewNoSnapshotAuditCopyCount = noSnapshotEdge
      ? countRegex(overviewNoSnapshotSurfaceText, /配置写入|API\\s*下发|业务推断|不写\\s*RouterOS|不修改配置|不推断根因/g)
      : 0;
    const overviewNoSnapshotBusinessFirstOpsLedgerOk = Boolean(
      overviewNoSnapshotAuditCopyCount === 0 &&
      overviewNoSnapshotReadonlyBoundaryModule &&
      overviewNoSnapshotRawEvidenceModule &&
      overviewNoSnapshotRawEvidenceModule.hasAttribute('data-overview-evidence-mode') &&
      /不写配置/.test(normalize(overviewNoSnapshotReadonlyBoundaryModule.textContent || '')) &&
      /业务数据不可判|业务可信边界|业务展示边界/.test(overviewNoSnapshotSurfaceText) &&
      /速率\\s*不展示|速率不展示/.test(overviewNoSnapshotSurfaceText) &&
      /下次轮询|下次尝试/.test(overviewNoSnapshotSurfaceText)
    );
    const overviewNoSnapshotOpsLedgerCopyOk = sectionName !== 'overview' || !isDesktopOverview || !noSnapshotEdge || Boolean(
      (
      overviewNoSnapshotRawEvidenceModule &&
      overviewNoSnapshotRawEvidenceModule.hasAttribute('data-overview-evidence-mode') &&
      /不写配置/.test(overviewNoSnapshotSurfaceText) &&
      /业务数据不可判/.test(overviewNoSnapshotSurfaceText) &&
      /速率\s*不展示|数值不展示/.test(overviewNoSnapshotSurfaceText) &&
      /下次轮询|下次尝试/.test(overviewNoSnapshotSurfaceText)
      ) || overviewNoSnapshotBusinessFirstOpsLedgerOk || (
      overviewNoSnapshotAuditCopyCount === 0 &&
      /页面可信等级\\s*(?:采集链路可参考|链路可参考)|可信等级\\s*链路可参考|页面可信\\s*链路可参考|可信\\s*链路可参/.test(overviewNoSnapshotSurfaceText) &&
      /只读边界[\\s\\S]{0,180}不写配置|只读策略[\\s\\S]{0,80}不写配置|只读\\s*不写配置/.test(overviewNoSnapshotSurfaceText) &&
      /业务数据展示边界|业务展示边界|展示范围|业务不可参/.test(overviewNoSnapshotSurfaceText) &&
      /速率\s*不展示|速率不展示/.test(overviewNoSnapshotSurfaceText) &&
      /下次轮询|下次尝试/.test(overviewNoSnapshotSurfaceText) &&
      !/值班动作|恢复条件|页面口径|暂停|隐藏|关闭|停用|业务停用|采集动作|不造数|不造/.test(overviewNoSnapshotSurfaceText)
      )
    );
    const overviewNoSnapshotNoWanRateCardOk = sectionName !== 'overview' || !noSnapshotEdge || Boolean(
      !/WAN\\s*速率|WAN速率|0\\s*B\\/s|样本\\s*0\\s*\\/\\s*6|采样\\s*0\\s*\\/\\s*6|\\d{4}-\\d{2}-\\d{2}T/.test(overviewNoSnapshotSurfaceText)
    );
    const overviewIncidentWanRateFillerForbiddenOk = sectionName !== 'overview' || !['all-offline', 'interfaces-down'].includes(scaleScenario) || Boolean(
      !/WAN\\s*速率|WAN速率|\\b0\\s*B\\/s\\b|\\d{4}-\\d{2}-\\d{2}T/.test([
        firstScreenOverviewText,
        overviewDesktopTopText,
        overviewDesktopDetailText,
      ].join(' '))
    );
    const overviewNoSnapshotUnifiedBusinessCopyOk = sectionName !== 'overview' || !isDesktopOverview || !noSnapshotEdge || Boolean(
      /业务快照\s*未取得|缺少业务快照/.test(overviewNoSnapshotSurfaceText) &&
      /数值不展示|不展示不可验证数值|避免把缺失解释为\s*0/.test(overviewNoSnapshotSurfaceText) &&
      !/业务表隐藏|业务表无|业务数据待确认|数据可信度不可判定|业务数值隐藏/.test(overviewNoSnapshotSurfaceText)
    );
    const overviewNoSnapshotNoDuplicateBoundaryOk = sectionName !== 'overview' || !isDesktopOverview || !noSnapshotEdge || Boolean(
      overviewNoSnapshotLegacyDowngradeModules.length === 0 &&
      overviewNoSnapshotLegacyBoundaryModules.length === 0 &&
      overviewNoSnapshotTrustModules.length === 0 &&
      overviewNoSnapshotVisibleFillerBlocks.length === 0 &&
      overviewNoSnapshotBoundaryTitleCount === 0 &&
      !overviewNoSnapshotBoundaryDegradeModule &&
      overviewNoSnapshotTimelineRowCount === 0 &&
      !overviewNoSnapshotTimelineModule &&
      overviewNoSnapshotModuleCountOk &&
      overviewNoSnapshotForbiddenVisibleModules.length === 0 &&
      overviewNoSnapshotDuplicateModuleNames.length === 0 &&
      overviewNoSnapshotCoreModuleVisibility.filter((item) => item.visible).length === 3 &&
      overviewNoSnapshotBoundaryDegradeRowCount === 0
    );
    const overviewNoSnapshotFailureEndpointLedgerOk = sectionName !== 'overview' || !noSnapshotEdge ||
      !/失败端点\\s*0\\b|失败计数\\s*0\\b/.test(overviewNoSnapshotSurfaceText);
    const overviewNoSnapshotBusinessFirstLedgerStructureOk = Boolean(
      overviewNoSnapshotDesktopCoreFactsOk &&
      overviewNoSnapshotModuleCountOk &&
      overviewNoSnapshotCoreModuleNodes.length === 3 &&
      overviewNoSnapshotRawEvidenceModule &&
      overviewNoSnapshotRawEvidenceModule.hasAttribute('data-overview-evidence-mode') &&
      /业务数据不可判|业务可信边界/.test(overviewNoSnapshotSurfaceText) &&
      /采集链路/.test(overviewNoSnapshotSurfaceText) &&
      /恢复线索/.test(overviewNoSnapshotSurfaceText) &&
      /默认路由影响\\s*待判|默认路由\\s*待判/.test(overviewNoSnapshotSurfaceText) &&
      /速率\\s*不展示|速率不展示/.test(overviewNoSnapshotSurfaceText) &&
      !/页面可信度|不可展示模块矩阵/.test(overviewNoSnapshotSurfaceText)
    );
    const overviewNoSnapshotLedgerStructureOk = sectionName !== 'overview' || !isDesktopOverview || !noSnapshotEdge || Boolean(
      overviewNoSnapshotBusinessFirstLedgerStructureOk || (
      overviewNoSnapshotDesktopCoreFactsOk &&
      /采集链路图|采集链路/.test(overviewNoSnapshotSurfaceText) &&
      /业务数据不可判|业务可信边界|模块可见性/.test(overviewNoSnapshotSurfaceText) &&
      /恢复线索/.test(overviewNoSnapshotSurfaceText) &&
      /最近成功/.test(overviewNoSnapshotSurfaceText) &&
      /下次轮询|下次尝试/.test(overviewNoSnapshotSurfaceText) &&
      /WAN/.test(overviewNoSnapshotSurfaceText) &&
      /速率不展示|速率\\s*不展示/.test(overviewNoSnapshotSurfaceText) &&
      /路由\\s*待判定|默认路由\\s*不可判定|默认路由\\s*待判定/.test(overviewNoSnapshotSurfaceText) &&
      !sectionRoot?.querySelector('[data-overview-density-module="no-snapshot-summary"] .ik-no-snapshot-summary-ledger')
      )
    );
    const overviewNoSnapshotEffectiveVisibleFactCount = Math.max(
      overviewVisibleFactCount,
      overviewNoSnapshotVisibleCellCount,
      overviewNoSnapshotDesktopVisibleCellCount
    );
    const overviewNoSnapshotEffectiveFactCountOk = sectionName !== 'overview' || !isDesktopOverview || !noSnapshotEdge || Boolean(
      overviewNoSnapshotEffectiveFactsOk &&
      overviewNoSnapshotDenseModuleOk &&
      overviewNoSnapshotModuleCountOk &&
      overviewNoSnapshotDesktopCoreFactsOk &&
      overviewNoSnapshotEffectiveVisibleFactCount >= 32 &&
      overviewNoSnapshotRowHeightOk &&
      overviewNoSnapshotRepetitionBudgetOk &&
      overviewNoSnapshotFakeDensityOk &&
      overviewNoSnapshotOpsLedgerCopyOk &&
      overviewNoSnapshotUnifiedBusinessCopyOk &&
      overviewNoSnapshotVisibleFillerBlocks.length === 0
    );
    const firstScreenActionRepeats = {
      suggestionPrefix: countRegex(firstScreenOverviewText, /建议查看|建议：/g),
      actionLabels: isMobileOverview && mobileFlatLinkTexts.length
        ? mobileFlatLinkTexts.length
        : countRegex(firstScreenOverviewText, overviewActionLabelRepeatPattern),
    };
    const mobileWanIncidentFirstScreen = ['all-offline', 'interfaces-down'].includes(scaleScenario) ||
      /WAN/.test(firstScreenOverviewText) && /离线|全离线|全部离线|默认路由异常|路由不可达/.test(firstScreenOverviewText) ||
      /历史快照：WAN\\s*曾离线/.test(firstScreenOverviewText);
    const overviewMobileCoreOk = sectionName !== 'overview' || window.innerWidth >= 768 || Boolean(
      overviewFlatMobileContractOk &&
      mobileFlatStatus &&
      mobileFlatRowCountOk &&
      /结论/.test(firstScreenOverviewText) &&
      mobileCoreBlockContractOk &&
      mobileCoreChartMetaOk &&
      overviewMobileNoLineChartsOk &&
      overviewMobileOfflineBarSemanticsOk &&
      /WAN/.test(firstScreenOverviewText) &&
      /采集/.test(firstScreenOverviewText) &&
      /资源/.test(firstScreenOverviewText) &&
      /最近成功/.test(firstScreenOverviewText) &&
      mobileFlatEntryOk &&
      /风险|异常|数据陈旧|历史快照|无可用快照|快照缺失|资源满载|资源高负载|采集降级|接口全\\s*Down|WAN\\s*全离线|全部离线|WAN\\s*离线|正常|关注|告警/.test(firstScreenOverviewText) &&
      (
        noSnapshotEdge
          ? (/业务数据不展示|无业务快照|业务快照/.test(firstScreenOverviewText) && restSshPairPattern.test(firstScreenOverviewText))
          : mobileWanIncidentFirstScreen
            ? /WAN/.test(firstScreenOverviewText) && /默认路由|离线对象/.test(firstScreenOverviewText)
            : (scaleScenario === 'single' || historyModeActive || /历史快照|数据陈旧|当前不是实时数据/.test(firstScreenOverviewText))
              ? /历史快照|数据陈旧|业务快照|当前影响未知/.test(firstScreenOverviewText) && /WAN|默认路由/.test(firstScreenOverviewText)
              : scaleScenario === 'collection-down'
                ? /采集|REST|SSH|最后成功/.test(firstScreenOverviewText)
                : /资源|CPU|内存/.test(firstScreenOverviewText)
      ) &&
      /采集/.test(firstScreenOverviewText) &&
      restSshPairPattern.test(firstScreenOverviewText)
    );
    const mobileTop120Visible = (node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < 120 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0';
    };
    const mobileTop120Text = visibleLeafText(sectionRoot?.querySelectorAll([
      '[data-overview-field]',
      '[data-overview-mobile-alert]',
      '[data-overview-mobile-incident]',
      '.notice.danger'
    ].join(',')) || [], mobileTop120Visible);
    const overviewEffectiveFactScopeText = [
      firstScreenOverviewText,
      mobileTop120Text,
      overviewDesktopTopText,
      overviewDesktopDetailText,
      overviewStatusBarText,
    ].join(' ');
    const overviewEffectiveFactAxes = {
      object: /WAN|接口|资源|RouterOS|默认路由|采集|终端|CPU|MEM|DISK|磁盘|内存/.test(overviewEffectiveFactScopeText),
      state: /正常|异常|不可达|不可判定|离线|满载|可用|待确认|不展示|缓存|缺依赖|全离线/.test(overviewEffectiveFactScopeText),
      time: /最近成功|业务快照|采样|更新|下次轮询|下次尝试|0s|\\d{2}-\\d{2}\\s+\\d{2}:\\d{2}/.test(overviewEffectiveFactScopeText),
      evidence: /证据|依据|阈|峰|均值|table|gateway|distance|parent|bridge|vlan|pppoe-out|REST|SSH/.test(overviewEffectiveFactScopeText),
      trust: /可信|缓存可参考|当前不可判定|业务状态不可信|不展示|只读|展示边界|展示范围/.test(overviewEffectiveFactScopeText),
    };
    const overviewEffectiveFactAxesOk = sectionName !== 'overview' || Object.values(overviewEffectiveFactAxes).every(Boolean);
    const overviewEffectiveFactMinimum = isMobileOverview ? 8 : (edgeScenarios.has(scaleScenario) ? 24 : 18);
    const overviewEffectiveFactsGateOk = sectionName !== 'overview' || Boolean(
      overviewEffectiveFactAxesOk &&
      overviewFirstScreenFieldCount >= Math.min(overviewEffectiveFactMinimum, overviewVisibleFactCount || overviewEffectiveFactMinimum) &&
      overviewVisibleFactCount >= overviewEffectiveFactMinimum &&
      (!noSnapshotEdge || !isDesktopOverview || overviewNoSnapshotVisibleCellCount >= 60) &&
      (scaleScenario !== 'resource-full' || !isDesktopOverview || (
        overviewVisibleFactCount >= 28 &&
        sectionRoot?.querySelector('[data-overview-density-module="resource-risk-priority"]') &&
        sectionRoot?.querySelector('[data-overview-density-module="resource-pressure-bars"]') &&
        sectionRoot?.querySelector('[data-overview-density-module="resource-interface-top5"]')
      ))
    );
    const overviewNoSnapshotFirstScreenText = [firstScreenOverviewText, mobileTop120Text].join(' ');
    const overviewMobile390NoMemDiskVisibleOk = !mobileOverview390x844 || (!firstScreenOverviewText.includes('MEM') && !firstScreenOverviewText.includes('DISK'));
    const overviewMobile390NoRawBooleanCopyOk = !mobileOverview390x844 || (() => { const raw = firstScreenOverviewText.toLowerCase(); return !['active true', 'active false', 'disabled true', 'disabled false', 'running true', 'running false'].some((part) => raw.includes(part)); })();
    const mobile390RawRouterOsFieldRecords = mobileOverview390x844
      ? [
        'active true',
        'active false',
        'disabled true',
        'disabled false',
        'running true',
        'running false',
        'pppoe-out',
        'routing-mark',
        'pref-src',
        'scope ',
        'target-scope',
        'immediate-gw',
        'check-gateway',
        'suppress-hw-offload',
        'bridge=',
        'parent=',
        'vlan-id',
        'gateway=',
        'distance=',
        'table='
      ].filter((part) => firstScreenOverviewText.toLowerCase().includes(part))
      : [];
    const overviewMobile390NoRawRouterOsFieldsOk = !mobileOverview390x844 || mobile390RawRouterOsFieldRecords.length === 0;
    const mobile390MainProgressBarRecords = mobileOverview390x844
      ? Array.from(mobileFirstScreen?.querySelectorAll('[role="progressbar"], progress, meter, .progress, .bar, .ro-topn-bar, .ik-mobile-microbar') || [])
        .filter(nodeVisibleInFirstScreen)
        .map((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return { height: Math.round(rect.height), width: Math.round(rect.width), display: style.display, text: normalize(node.textContent || '').slice(0, 80) };
        })
        .filter((item) => item.height >= 6 && item.width >= 80)
      : [];
    const overviewMobile390NoMainProgressBarOk = !mobileOverview390x844 || mobile390MainProgressBarRecords.length === 0;
    const mobile390HeavyVisualBlockRecords = mobileOverview390x844
      ? Array.from(mobileFirstScreen?.querySelectorAll('*') || [])
        .filter(nodeVisibleInFirstScreen)
        .map((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          const bg = String(style.backgroundColor || '').replace(/\s+/g, '');
          const border = [style.borderTopColor, style.borderRightColor, style.borderBottomColor, style.borderLeftColor].map((value) => String(value || '').replace(/\s+/g, ''));
          const area = Math.round(rect.width * rect.height);
          const heavyColor = /rgb\(2[0-5][0-9],([0-8][0-9]|9[0-9]|1[0-2][0-9]),([0-8][0-9]|9[0-9]|1[0-2][0-9])\)|rgb\(([0-8][0-9]|9[0-9]|1[0-2][0-9]),2[0-5][0-9],([0-8][0-9]|9[0-9]|1[0-2][0-9])\)/.test(bg + ' ' + border.join(' '));
          const classNameText = String(node.className || '');
          const nonProgressChromeBar = /(^|\s)(ik-v\d+-nav|ik-mobile-device-bar|ik-v\d+-tabbar|ik-v\d+-tabs|ik-ios-bottom-tab)(\s|$)|device-bar|bottom-tab/i.test(classNameText);
          const sanctionedResourceDecision = classNameText.includes('is-resource-bars') && Boolean(node.querySelector('.ik-mobile-resource-decision'));
          const heavyBar = rect.height >= 8 && rect.width >= 96 && /bar|progress/i.test(classNameText) && !/status-strip|hairline/i.test(classNameText) && !nonProgressChromeBar && !sanctionedResourceDecision;
          return { area, heavyColor, heavyBar, className: classNameText.slice(0, 80), text: normalize(node.textContent || '').slice(0, 80) };
        })
        .filter((item) => (item.area >= window.innerWidth * window.innerHeight * 0.035 && item.heavyColor) || item.heavyBar)
        .slice(0, 8)
      : [];
    const overviewMobile390NoHeavyVisualBlocksOk = !mobileOverview390x844 || mobile390HeavyVisualBlockRecords.length === 0;
    const overviewMobile390BottomTabOk = !mobileOverview390x844 || Boolean(
      Array.from(sectionRoot?.querySelectorAll('.ik-ios-bottom-tab, .ik-v240-tabs, [data-overview-mobile-bottom-tab]') || []).some(nodeVisibleInViewport)
    );
    const mobile390PrimaryStatusNode = mobileOverview390x844
      ? sectionRoot?.querySelector('.ik-v240-status, [data-overview-mobile-primary-status], [data-overview-mobile-status], .ik-ios-nav-status')
      : null;
    const mobile390PrimaryStatusText = normalize(mobile390PrimaryStatusNode?.textContent || '');
    const overviewMobile390NoFocusPrimaryStatusOk = !mobileOverview390x844 || mobile390PrimaryStatusText !== '关注';
    const mobile390EnglishResourceTextHits = mobileOverview390x844
      ? (firstScreenOverviewText.match(/(?:^|[^A-Za-z])(?:MEM|DISK)(?:[^A-Za-z]|$)/g) || []).map((item) => item.trim()).filter(Boolean)
      : [];
    const overviewMobile390NoCpuMemDiskEnglishOk = !mobileOverview390x844 || mobile390EnglishResourceTextHits.length === 0;
    const mobile390TitleNode = mobileOverview390x844
      ? sectionRoot?.querySelector('.ik-mobile-device-title, .ik-v240-title, .ik-ios-nav-title')
      : null;
    const mobile390NavNode = mobileOverview390x844
      ? sectionRoot?.querySelector('.ik-v240-nav, [data-overview-mobile-v240-nav], [data-overview-mobile-v159-nav], .ik-ios-top-nav')
      : null;
    const mobile390TitleRect = mobile390TitleNode?.getBoundingClientRect();
    const mobile390StatusRect = mobile390PrimaryStatusNode?.getBoundingClientRect();
    const mobile390TitleClipRecords = mobileOverview390x844 && mobile390TitleNode
      ? Array.from(mobile390TitleNode.querySelectorAll('b, span, strong, [data-overview-mobile-title-line]'))
        .filter(nodeVisibleInViewport)
        .map((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          const clipped = node.scrollWidth > node.clientWidth + 2 ||
            (style.whiteSpace === 'nowrap' && rect.right > window.innerWidth - 8) ||
            (['hidden', 'clip'].includes(style.overflow) && node.scrollHeight > node.clientHeight + 2);
          return clipped ? {
            selector: selectorForNode(node),
            text: normalize(node.textContent || '').slice(0, 80),
            width: Math.round(rect.width),
            scrollWidth: Math.round(node.scrollWidth),
          } : null;
        })
        .filter(Boolean)
      : [];
    const overviewMobile390NoTitleStatusCollisionOk = !mobileOverview390x844 || Boolean(
      mobile390NavNode &&
      mobile390TitleNode &&
      mobile390PrimaryStatusNode &&
      mobile390TitleRect &&
      mobile390StatusRect &&
      !rectsOverlap(mobile390TitleRect, mobile390StatusRect) &&
      mobile390TitleClipRecords.length === 0
    );
    const mobile390ScenarioVisualKindText = mobile390ScenarioVisualRecords
      .map((record) => [record.dataToken, record.className, record.text].join(' '))
      .join(' ');
    const mobile390ExpectedVisualPattern = scaleScenario === 'all-offline'
      ? /incident|verdict|object|impact|对象|影响|可信度|下一步/i
      : scaleScenario === 'no-snapshot' || scaleScenario === 'collection-down'
        ? /channel|snapshot-status-line|REST|SSH|快照|采集/i
        : scaleScenario === 'resource-full'
          ? /resource|processor|memory|disk|处理器|内存|磁盘/i
          : scaleScenario === 'interfaces-down'
            ? /flow|chain|interface|接口|父级|承载/i
            : /spark|traffic|line|WAN|下载|上传/i;
    const overviewMobile390ScenarioVisualKindOk = !mobileOverview390x844 || Boolean(
      mobile390ScenarioVisualRecords.some((record) => record.readable) &&
      mobile390ExpectedVisualPattern.test(mobile390ScenarioVisualKindText)
    );
    const mobile390CardSurfaceItems = mobileOverview390x844
      ? Array.from((sectionRoot || mobileFirstScreen)?.querySelectorAll('main, section, article, nav, header, div, span') || [])
        .filter(nodeVisibleInViewport)
        .map((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          const area = Math.round(rect.width * rect.height);
          const borderWidth = ['Top', 'Right', 'Bottom', 'Left']
            .map((side) => Number.parseFloat(style['border' + side + 'Width']) || 0)
            .reduce((sum, value) => sum + value, 0);
          const radius = Math.max(
            Number.parseFloat(style.borderTopLeftRadius) || 0,
            Number.parseFloat(style.borderTopRightRadius) || 0,
            Number.parseFloat(style.borderBottomLeftRadius) || 0,
            Number.parseFloat(style.borderBottomRightRadius) || 0
          );
          const className = String(node.className || '');
          const hasShadow = style.boxShadow && style.boxShadow !== 'none';
          const normalizedShadow = hasShadow
            ? style.boxShadow.replace(/rgba?\([^)]*\)/g, 'color')
            : '';
          const hasRaisedShadow = normalizedShadow
            .split(',')
            .map((layer) => layer.trim())
            .some((layer) => layer && layer !== 'none' && !/\\binset\\b/.test(layer));
          const hasBorder = borderWidth > 0;
          const cardLike = area >= 5000 &&
            !/(?:^|\\s)(?:ik-v240-app|ik-v240-shell|ik-v240-screen|ik-v240-visual)(?:\\s|$)/.test(className) &&
            (hasRaisedShadow || (hasBorder && radius >= 10));
          return cardLike ? {
            node,
            selector: selectorForNode(node),
            area,
            radius: Math.round(radius),
            borderWidth,
            hasShadow,
            hasRaisedShadow,
            boxShadow: style.boxShadow,
            text: normalize(node.textContent || '').slice(0, 80),
          } : null;
        })
        .filter(Boolean)
      : [];
    const mobile390CardSurfaceRecords = mobile390CardSurfaceItems.map(({ node, ...record }) => record);
    const mobile390NestedCardSurfaceDepth = mobile390CardSurfaceItems.length
      ? Math.max(...mobile390CardSurfaceItems.map((item) => mobile390CardSurfaceItems.filter((other) => other !== item && other.node.contains(item.node)).length + 1))
      : 0;
    const overviewMobile390NoCardPileOk = !mobileOverview390x844 || Boolean(
      mobile390CardSurfaceItems.length <= 4 &&
      mobile390NestedCardSurfaceDepth <= 2
    );
    const overviewDesktopNoMobileAppChromeOk = sectionName !== 'overview' || !isDesktopOverview || !Array.from(sectionRoot?.querySelectorAll('.ik-v159-nav, .ik-v159-network-hero, .ik-v159-top-list, .ik-v159-tabbar') || [])
      .some(nodeVisibleInViewport);
    const overviewDesktopNoToyNavLeakOk = sectionName !== 'overview' || !isDesktopOverview || !Array.from(sectionRoot?.querySelectorAll('.ik-ios-top-nav, .ik-ios-nav-title, [data-overview-mobile-primary-title], [data-overview-mobile-ios-nav="true"], .ik-ios-bottom-tab, [data-overview-mobile-bottom-tab]') || [])
      .some(nodeVisibleInViewport);
    const overviewDesktopContentIconTabRecords = isDesktopOverview
      ? Array.from(sectionRoot?.querySelectorAll('[role="tab"], [class*="tab" i], button, a') || [])
        .filter(nodeVisibleInFirstScreen)
        .map((node) => {
          const rect = node.getBoundingClientRect();
          const icon = node.querySelector('svg, img, [class*="icon" i]');
          const iconRect = icon?.getBoundingClientRect();
          const className = String(node.className || '');
          const parentClassName = String(node.parentElement?.className || '');
          const attrText = Array.from(node.attributes || []).map((attr) => attr.name + '=' + attr.value).join(' ');
          const siblingControlCount = Array.from(node.parentElement?.children || [])
            .filter((sibling) => /^(BUTTON|A)$/i.test(sibling.tagName) || sibling.getAttribute('role') === 'tab')
            .filter(nodeVisibleInFirstScreen)
            .length;
          const looksTabby = /tab|tabbar|bottom|segment|pill-nav|icon-tabs/i.test(className + ' ' + parentClassName + ' ' + attrText);
          const bigIcon = iconRect && iconRect.width >= 24 && iconRect.height >= 24;
          const bigTarget = rect.width >= 72 && rect.height >= 52;
          return looksTabby && bigIcon && bigTarget && siblingControlCount >= 3 ? {
            selector: selectorForNode(node),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            iconWidth: Math.round(iconRect.width),
            iconHeight: Math.round(iconRect.height),
            text: normalize(node.textContent || '').slice(0, 80),
          } : null;
        })
        .filter(Boolean)
      : [];
    const overviewDesktopNoContentIconTabsOk = sectionName !== 'overview' || !isDesktopOverview || overviewDesktopContentIconTabRecords.length === 0;
    const overviewDesktopHierarchyMarkerOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      sectionRoot?.querySelector('[data-overview-summary]') &&
      sectionRoot?.querySelector('[data-overview-status-bar]') &&
      sectionRoot?.querySelector('[data-overview-anomaly-evidence]') &&
      sectionRoot?.querySelector('[data-overview-desktop-detail]')
    );
    const overviewNoSnapshotFirstScreenRateForbiddenOk = sectionName !== 'overview' || !noSnapshotEdge || Boolean(
      !overviewNoSnapshotFirstScreenText.includes('WAN速率') &&
      !overviewNoSnapshotFirstScreenText.includes('WAN 速率') &&
      !overviewNoSnapshotFirstScreenText.includes('0 B/s') &&
      !overviewNoSnapshotFirstScreenText.includes('0B/s')
    );
    const overviewFirstScreenCopyText = [firstScreenOverviewText, mobileTop120Text].filter(Boolean).join(' ');
    const classifyEdgeEvidenceCategory = (value) => {
      const textValue = normalize(value);
      const includesAny = (words) => words.some((word) => textValue.includes(word));
      if (includesAny([
        '快照账本', '模块可见性', '采集链路', '采集链路账本', '设备通达性', '快照证据',
        '快照缺失', '快照状态', '业务快照缺失', '无可用快照', 'RouterOS 当前不可达',
        '业务数据不展示', '无业务快照', '当前不可判定', '采集证据', '采集通道',
        '通道状态', '通道异常', 'REST 待确认', 'SSH 不可用', 'SSH 缺依赖',
        '采集断链', '采集降级', '采集失败', '采集不可用', '非实时需复核'
      ])) return 'collection';
      if (includesAny(['资源证据', '资源满载', '资源高负载', '处理器', 'CPU', '内存', '磁盘', '连接压力', '资源'])) return 'resource';
      if (
        includesAny([
          'WAN 证据', 'WAN线路', 'WAN 全离线', 'WAN 全部离线', '全部 WAN 离线',
          'WAN 离线', '离线数量', '全部离线', '默认路由异常', '未发现活动默认路由',
          '路由不可达', '接口转发面异常', '接口全 Down', '全部接口离线'
        ]) ||
        (textValue.includes('WAN') && textValue.includes('默认路由')) ||
        (textValue.includes('WAN') && textValue.includes('全离线'))
      ) return 'wan';
      return '';
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
        (noSnapshotEdge ? overviewNoSnapshotGrid : null) ||
        overviewFocusModule?.querySelector('.ik-summary-box.is-danger, .ik-summary-box.is-warn, .ik-summary-box, [data-overview-field]') ||
        overviewFocusModule ||
        overviewSummaryMain?.querySelector('.ik-summary-box.is-danger, .ik-summary-box.is-warn, .ik-summary-box') ||
        overviewDesktopTopShell ||
        overviewMainVerdict?.querySelector('.ik-home-verdict-title > div:nth-child(2)') ||
        overviewIncidentLine?.querySelector('.ik-home-incident-main > div:nth-child(2)') ||
        overviewMainVerdict
      );
    const overviewFirstEvidenceText = normalize(overviewFirstEvidenceNode?.textContent || overviewVerdictText);
    const overviewFirstEvidenceCategory = isMobileOverview && mobileFlatEvidenceOk
      ? classifyEdgeEvidenceCategory([mobileFlatEvidenceRowText, mobileFlatStatusRowText].join(' '))
      : classifyEdgeEvidenceCategory(overviewFirstEvidenceText);
    const expectedRiskEvidenceText = [
      overviewFirstEvidenceText,
      mobileFlatStatusRowText,
      mobileFlatEvidenceRowText,
      mobileIncidentTitleText,
      mobileIncidentEvidenceRows.join(' '),
      normalize(overviewSummaryMain?.textContent || ''),
      normalize(overviewNoSnapshotGrid?.textContent || ''),
      overviewDesktopDetailText,
    ].join(' ');
    const compactExpectedRiskEvidenceText = expectedRiskEvidenceText.replace(/\s+/g, '');
    const expectedRiskEvidenceCategory = classifyEdgeEvidenceCategory(expectedRiskEvidenceText);
    const overviewFirstEvidenceCategoryOk = sectionName !== 'overview' || !edgeScenarios.has(scaleScenario) || (
      overviewFirstEvidenceCategory === expectedEdgeEvidenceCategory ||
      expectedRiskEvidenceCategory === expectedEdgeEvidenceCategory ||
      (scaleScenario === 'interfaces-down' && overviewVisibleDensityModuleNames[0] === 'interface-forwarding')
    );
    const overviewHighestRiskEvidenceMatchOk = sectionName !== 'overview' || !edgeScenarios.has(scaleScenario) || Boolean(
      scaleScenario === 'resource-full'
          ? (
            (overviewFirstEvidenceCategory === 'resource' || expectedRiskEvidenceCategory === 'resource') &&
            /资源证据|资源满载|资源高负载/.test(expectedRiskEvidenceText) &&
          /(?:CPU|处理器).*96/.test(expectedRiskEvidenceText) &&
          /(?:内存|MEM).*92/.test(expectedRiskEvidenceText) &&
          /(?:磁盘|DISK).*97/.test(expectedRiskEvidenceText) &&
          /连接/.test(expectedRiskEvidenceText)
        )
        : scaleScenario === 'collection-down'
          ? (
            (overviewFirstEvidenceCategory === 'collection' || expectedRiskEvidenceCategory === 'collection') &&
            /采集证据|采集降级|REST|SSH/.test(expectedRiskEvidenceText) &&
            /失败端点|失败|不可用|断链|待确认/.test(expectedRiskEvidenceText)
          )
          : scaleScenario === 'no-snapshot'
            ? (
              (overviewFirstEvidenceCategory === 'collection' || expectedRiskEvidenceCategory === 'collection' || /设备通达性|采集链路账本/.test(expectedRiskEvidenceText)) &&
              /快照账本|模块可见性|采集链路|采集链路账本|设备通达性|快照证据|快照缺失|采集证据|采集断链|无可用快照/.test(expectedRiskEvidenceText) &&
              (/RouterOS(?:\\s+(?:可达性|状态))?\\s*当前不可达/.test(expectedRiskEvidenceText) || /RouterOS当前不可达/.test(compactExpectedRiskEvidenceText)) &&
              /业务数据不展示|无业务快照|业务状态不可信|业务状态不可参考/.test(expectedRiskEvidenceText)
            )
            : scaleScenario === 'all-offline'
              ? (
                (overviewFirstEvidenceCategory === 'wan' || expectedRiskEvidenceCategory === 'wan') &&
                /WAN.*离线|WAN.*全离线|离线对象|离线数量|全部离线|未发现活动默认路由/.test(expectedRiskEvidenceText)
              )
              : true
    );
    const primaryConclusionNodes = Array.from(sectionRoot?.querySelectorAll('.ik-mobile-primary-conclusion') || [])
      .filter(nodeVisibleInFirstScreen);
    const compactPrimaryText = mobileAlertPrimaryText.replace(/\\s+/g, '');
    const compactIncidentTitleText = mobileIncidentTitleText.replace(/\\s+/g, '');
    const mobileAlertStatusOk = !mobileAlertPrimaryText || /^(告警|关注|缺失|快照缺失|历史|历史快照|正常|WAN全离线|WAN异常|路由异常|接口全Down|采集异常|资源满载|资源高负载)$/.test(compactPrimaryText);
    const mobileFlatCopyCleanPattern = new RegExp('建议查看|建议：|证据WAN证据|REST/SSHREST|RESTSSH|通道状态通道状态|状态更新时间');
    const mobileFlatCopyCleanOk = !mobileFlatCopyCleanPattern.test(firstScreenOverviewText + ' ' + mobileFlatStatusText + ' ' + mobileFlatEvidenceRowText);
    const overviewMobileUniqueVerdictOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      mobileFlatStatusVerdictOk &&
      mobileFlatEvidenceOk &&
      mobileFlatNoSnapshotOk &&
      mobileFlatCollectionOk &&
      primaryConclusionNodes.length <= 1 &&
      mobileFlatCopyCleanOk &&
      !/处置：/.test(mobileFlatStatusText) &&
      !/当前状态|最高业务风险|当前最高/.test(mobileFlatEvidenceRowText)
    );
    const overviewMobilePrimaryConclusionText = normalize(primaryConclusionNodes[0]?.textContent || mobileIncidentTitleLeadText || mobileIncidentTitleText || mobileAlertPrimaryText || '');
    const overviewMobilePrimaryConclusionScopeText = mobileTop120Text || [
      mobileAlertText,
      mobileIncidentTitleText,
    ].join(' ');
    const overviewMobilePrimaryConclusionUniqueOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      mobileFlatStatusVerdictOk &&
      mobileFlatEvidenceOk &&
      mobileFlatNoSnapshotOk &&
      mobileFlatCollectionOk &&
      primaryConclusionNodes.length <= 1 &&
      mobileFlatCopyCleanOk &&
      (mobileFlatStatus ? true : countOccurrences(overviewMobilePrimaryConclusionScopeText, overviewMobilePrimaryConclusionText) <= 1) &&
      !/当前状态|最高业务风险|当前最高|处置：/.test(mobileFlatStatusText + ' ' + mobileFlatEvidenceRowText)
    );
    const overviewMobileEvidenceTitleOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      mobileFlatEvidenceOk &&
      mobileFlatNoSnapshotOk &&
      mobileFlatCollectionOk &&
      primaryConclusionNodes.length <= 1 &&
      mobileFlatCopyCleanOk &&
      !/处置：|建议查看|建议：/.test(mobileFlatEvidenceRowText)
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
    const overviewMainAlertRect = window.innerWidth < 768 ? mobileAlertRect : overviewMainVerdictRect;
    const overviewFirstEvidenceRect = window.innerWidth < 768 ? mobileIncidentRect : overviewIncidentLineRect;
    const overviewReadOnlyBoundaryOk = sectionName !== 'overview' || !overviewMainAlertRect || !overviewFirstEvidenceRect || Boolean(
      readonlyBoundaryNodes.every((node) => {
        const rect = node.getBoundingClientRect();
        return rect.bottom <= overviewMainAlertRect.top || rect.top >= overviewFirstEvidenceRect.bottom;
      }) &&
      (!noSnapshotEdge || readonlyBoundaryNodes.length <= 1) &&
      (!noSnapshotEdge || countOccurrences([overviewDesktopTopText, overviewDesktopDetailText, firstScreenOverviewText, mobileTop120Text].join(' '), '只读边界') <= 2)
    );
    const overviewNoSnapshotReadonlyBoundaryRepeatOk = sectionName !== 'overview' || !noSnapshotEdge || countOccurrences([
      overviewDesktopTopText,
      overviewDesktopDetailText,
      firstScreenOverviewText,
      mobileTop120Text,
    ].join(' '), '只读边界') <= 1;
    const priorityLabels = Array.from(sectionRoot?.querySelectorAll('[data-overview-priority]') || [])
      .map((node) => normalize(node.textContent || ''));
    const activePriorityLabels = Array.from(sectionRoot?.querySelectorAll('[data-overview-priority].is-active') || [])
      .map((node) => normalize(node.textContent || ''));
    const priorityOrderOk = priorityLabels.length >= 6 &&
      (priorityLabels[0] === '无可用快照' || priorityLabels[0] === '快照缺失') &&
      priorityLabels[1] === '默认路由异常' &&
      /^WAN (全)?离线$/.test(priorityLabels[2]) &&
      /^资源(满载|高负载)$/.test(priorityLabels[3]) &&
      /^(采集降级|采集留存)$/.test(priorityLabels[4]) &&
      /^(采样(新鲜|偏旧|陈旧)|历史快照|业务快照缺失)$/.test(priorityLabels[5]);
    const overviewProductVerdictSourceText = [
      overviewVerdictText,
      firstScreenOverviewText,
      overviewDesktopTopText,
      overviewDesktopDetailText,
      overviewVisibleDensityModuleText,
      mobileTop120Text,
    ].join(' ');
    const overviewProductVerdictWindowHas = (label, terms, width = 32) => {
      const index = overviewProductVerdictSourceText.indexOf(label);
      if (index < 0) return false;
      const slice = overviewProductVerdictSourceText.slice(index, index + width);
      return terms.some((term) => slice.includes(term));
    };
    const overviewCollectionProductRestOk = overviewProductVerdictWindowHas('REST', ['待确认', '不可达', '不可用', '缺依赖']);
    const overviewCollectionProductSshOk = overviewProductVerdictWindowHas('SSH', ['缺依赖', '不可达', '不可用']);
    const overviewCollectionProductVerdictProbe = {
      hasSummaryShell: Boolean(overviewSummaryShell),
      hasStatusSurface: Boolean(overviewVerdictStatusBus || overviewStatusBar || (isMobileOverview && overviewSummaryShell)),
      incident: /采集异常|通道状态降级|采集通道/.test(overviewProductVerdictSourceText),
      rest: overviewCollectionProductRestOk,
      ssh: overviewCollectionProductSshOk,
      cache: /缓存快照|数据层状态/.test(overviewProductVerdictSourceText),
      endpoint: /失败端点|最近成功|业务快照/.test(overviewProductVerdictSourceText),
      excerpt: overviewProductVerdictSourceText.slice(0, 520),
    };
    const overviewCurrentVerdictText = [overviewProductVerdictSourceText, overviewStatusBarText, overviewDesktopDetailText].join(' ');
    const overviewCurrentScenarioVerdictOk = Boolean(
      overviewSummaryShell &&
      overviewStatusBar &&
      ['结论', '对象', '影响', '采集', '快照'].every((label) => overviewCurrentVerdictText.includes(label)) &&
      (scaleScenario === 'no-snapshot'
        ? /快照缺失|无可用快照/.test(overviewCurrentVerdictText) &&
          /RouterOS|REST|SSH/.test(overviewCurrentVerdictText) &&
          /业务数据不展示|无业务快照|不可判定/.test(overviewCurrentVerdictText)
        : scaleScenario === 'collection-down'
          ? /采集降级|采集可信度下降/.test(overviewCurrentVerdictText) &&
            /REST/.test(overviewCurrentVerdictText) &&
            /SSH/.test(overviewCurrentVerdictText) &&
            /缓存快照|快照面.*缓存/.test(overviewCurrentVerdictText) &&
            /最近成功|业务面.*可判|非断网/.test(overviewCurrentVerdictText) &&
            overviewVisibleDensityModuleNames.includes('collection-channel-ledger') &&
            overviewVisibleDensityModuleNames.includes('collection-cache-boundary')
          : scaleScenario === 'resource-full'
            ? /资源满载|资源余量低/.test(overviewCurrentVerdictText) &&
              /(?:CPU|处理器).*96/.test(overviewCurrentVerdictText) &&
              /内存.*92/.test(overviewCurrentVerdictText) &&
              /磁盘.*97/.test(overviewCurrentVerdictText) &&
              overviewVisibleDensityModuleNames.includes('resource-risk-priority') &&
              overviewDensityModuleNames.includes('resource-pressure-bars') &&
              overviewVisibleDensityModuleNames.includes('resource-interface-top5')
            : scaleScenario === 'interfaces-down'
              ? /接口.*Down/i.test(overviewCurrentVerdictText) &&
                /默认路由|默认出口/.test(overviewCurrentVerdictText) &&
                /REST/.test(overviewCurrentVerdictText) &&
                /SSH/.test(overviewCurrentVerdictText) &&
                Boolean(sectionRoot?.querySelector('[data-overview-density-module="interface-forwarding"]'))
              : scaleScenario === 'all-offline'
                ? /WAN/.test(overviewCurrentVerdictText) &&
                  /全离线|全部离线|0\\/8/.test(overviewCurrentVerdictText) &&
                  /默认路由/.test(overviewCurrentVerdictText)
                : scaleScenario === 'single'
                  ? /历史快照|缓存快照|当前影响未知/.test(overviewCurrentVerdictText)
                  : scaleScenario === 'fleet'
                    ? /WAN/.test(overviewCurrentVerdictText) && overviewDensityModules.length >= 3
                    : true)
    );
    const overviewProductVerdictOk = sectionName !== 'overview' || overviewCurrentScenarioVerdictOk || Boolean(
      noSnapshotEdge &&
      overviewSummaryShell &&
      overviewStatusBar &&
      /快照缺失|无可用快照/.test(overviewVerdictText) &&
      /RouterOS|REST|SSH/.test(overviewVerdictText) &&
      /业务快照|数据可信度|业务数据不展示|不可判定/.test(overviewVerdictText)
    ) || Boolean(
      scaleScenario === 'collection-down' &&
      overviewSummaryShell &&
      (overviewVerdictStatusBus || overviewStatusBar || (isMobileOverview && overviewSummaryShell)) &&
      /采集异常|通道状态降级|采集通道/.test(overviewProductVerdictSourceText) &&
      overviewCollectionProductRestOk &&
      overviewCollectionProductSshOk &&
      /缓存快照|数据层状态/.test(overviewProductVerdictSourceText) &&
      /失败端点|最近成功|业务快照/.test(overviewProductVerdictSourceText)
    ) || Boolean(
      overviewSummaryShell &&
      overviewMainVerdict &&
      overviewStatusBar &&
      (priorityLabels.length ? priorityOrderOk && activePriorityLabels.length >= 1 : true) &&
      /正常|WAN|快照缺失|无可用快照|资源满载|资源高负载|采集降级|采集异常|通道状态降级|采集通道异常|默认路由异常|接口转发面|接口全 Down|业务快照|采样/.test(overviewVerdictText) &&
      /风险|异常|快照缺失|WAN|资源满载|采集降级|采集异常|通道状态降级|采集通道|接口转发面|接口全 Down/.test(overviewVerdictText) &&
      /事件更新时间|采集状态更新时间|业务快照时间|业务快照年龄|业务快照|业务数据不展示|数据可信度|默认路由不可判定|快照缺失|最后成功采集|历史快照|数据年龄/.test(overviewVerdictText) &&
      /当前不是实时数据|事件更新时间|采集状态更新时间|业务快照|采样新鲜|采样偏旧|采样陈旧|数据陈旧|历史快照|快照缺失|业务数据不展示|不可判定|当前影响未知|最后成功采集/.test(overviewVerdictText) &&
      /采集/.test(overviewVerdictText) &&
      (overviewVerdictStatusBus || overviewStatusBar) &&
      (/证据|快照状态|WAN(?:线路| 线路)|资源状态|接口转发面|down 数|涉及接口|通道状态|数据层|离线对象|持续|均值|阈值/.test(overviewVerdictText) || overviewEvidenceModule) &&
      /WAN/.test(overviewVerdictText) &&
      /默认路由|RouterOS|REST|SSH/.test(overviewVerdictText) &&
      /影响|业务数据不展示|不可判定|资源|采集|WAN|接口|转发面/.test(overviewVerdictText) &&
      overviewActionCueOk &&
      (overviewNextActions || overviewStatusBar) &&
      (overviewNoSnapshotGrid || overviewFocusModule || overviewDensityModules.length >= 3)
    );
    const overviewCurrentEvidenceChainText = [overviewFirstEvidenceText, overviewStatusBarText, overviewDesktopDetailText].join(' ');
    const overviewCurrentEvidenceChainOk = Boolean(
      overviewStatusBar &&
      overviewDesktopDetail &&
      overviewFirstEvidenceText.length >= 12 &&
      (scaleScenario === 'collection-down'
        ? overviewFirstEvidenceCategory === 'collection' &&
          overviewVisibleDensityModuleNames.includes('collection-channel-ledger') &&
          overviewVisibleDensityModuleNames.includes('collection-recent-failures') &&
          overviewDensityModuleNames.includes('collection-cache-boundary')
        : scaleScenario === 'resource-full'
          ? overviewFirstEvidenceCategory === 'resource' &&
            overviewVisibleDensityModuleNames.includes('resource-risk-priority') &&
            overviewDensityModuleNames.includes('resource-pressure-bars') &&
            overviewVisibleDensityModuleNames.includes('resource-interface-top5')
          : scaleScenario === 'interfaces-down'
            ? Boolean(sectionRoot?.querySelector('[data-overview-density-module="interface-forwarding"]')) &&
              /父接口/.test(overviewCurrentEvidenceChainText) &&
              /桥接/.test(overviewCurrentEvidenceChainText) &&
              /VLAN/i.test(overviewCurrentEvidenceChainText) &&
              /默认出口|默认路由/.test(overviewCurrentEvidenceChainText)
            : scaleScenario === 'all-offline'
              ? (overviewVisibleDensityModuleNames.includes('wan-offline-bars') || overviewVisibleDensityModuleNames.includes('wan-offline-continuity')) &&
                (overviewVisibleDensityModuleNames.includes('wan-route-ledger') || overviewVisibleDensityModuleNames.includes('wan-incident-ledger'))
              : scaleScenario === 'no-snapshot'
                ? Boolean(overviewNoSnapshotGrid || overviewNoSnapshotFlatDetail) && /快照缺失|无可用快照/.test(overviewCurrentEvidenceChainText)
                : Boolean(overviewEvidenceModule || overviewFocusModule || overviewDensityModules.length >= 3))
    );
    const overviewEvidenceChainOk = sectionName !== 'overview' || overviewCurrentEvidenceChainOk || Boolean(
      (/证据|快照状态|WAN(?:线路| 线路)|资源状态|离线对象|持续|均值|阈值/.test(overviewVerdictText) || overviewEvidenceModule) &&
      (/默认路由|RouterOS|REST|SSH/.test(overviewVerdictText) || overviewEvidenceModule) &&
      /影响|业务数据不展示|不可判定|资源|采集|WAN/.test(overviewVerdictText) &&
      (noSnapshotEdge ? /快照缺失|RouterOS|REST|SSH|业务数据不展示|业务快照/.test(overviewVerdictText) : /WAN/.test(overviewVerdictText)) &&
      /采样|快照|RouterOS 当前不可达|CPU|WAN|REST|SSH|资源/.test(overviewFirstEvidenceText + ' ' + text) &&
      (
        sectionRoot?.querySelector('[data-overview-anomaly-evidence]') ||
        overviewFocusModule ||
        overviewEvidenceModule ||
        sectionRoot?.querySelector('[data-overview-default-routes]') ||
        sectionRoot?.querySelector('[data-overview-detail-section="table"]')
      )
    );
    const mobileScenarioEvidenceOk = (() => {
      const mobileScenarioText = [
        firstScreenOverviewText,
        mobileTop120Text,
        topErrorNoticeText,
        mobileIncidentTitleText,
        mobileIncidentEvidenceRows.join(' ')
      ].join(' ');
      const defaultRouteRatioLeak = new RegExp('(?:^|[^命中])默认路由\\\\s*\\\\d+\\\\s*/\\\\s*(?:[1-9]\\\\d{1,}|[4-9])').test(mobileScenarioText);
      if (scaleScenario === 'no-snapshot') {
        return /快照缺失|无可用快照/.test(mobileScenarioText) &&
          /业务数据不展示|无业务快照|业务快照/.test(mobileScenarioText) &&
          restSshPairPattern.test(mobileScenarioText) &&
          !defaultRouteRatioLeak;
      }
      if (scaleScenario === 'fleet') {
        return new RegExp('历史快照|历史\\\\s*/\\\\s*当前影响未知|当前影响未知').test(mobileScenarioText) &&
          (/WAN 曾离线|离线数量|离线对象|WAN 证据|历史离线/.test(mobileScenarioText) || new RegExp('WAN\\\\s*\\\\d+\\\\s*/\\\\s*\\\\d+').test(mobileScenarioText)) &&
          /默认路由/.test(mobileScenarioText) &&
          !defaultRouteRatioLeak;
      }
      if (scaleScenario === 'interfaces-down') {
        return (
          new RegExp('WAN(?:线路| 线路)?\\\\s*0\\\\s*/\\\\s*\\\\d+').test(mobileScenarioText) ||
          /接口转发面|转发面优先|down\\s*\\d+\\s*接口/.test(mobileScenarioText)
        ) &&
          /默认路由|转发面证据/.test(mobileScenarioText) &&
          /REST\\s*不可达|REST不可达/.test(mobileScenarioText) &&
          /SSH\\s*不可达|SSH不可达/.test(mobileScenarioText) &&
          restSshPairPattern.test(mobileScenarioText) &&
          !defaultRouteRatioLeak;
      }
      if (scaleScenario === 'all-offline') {
        return (
          new RegExp('WAN(?:线路| 线路)?\\\\s*0\\\\s*/\\\\s*\\\\d+').test(mobileScenarioText) ||
          /WAN\\s*\\d+\\s*条离线|WAN\\s*\\d+\\s*条\\s*WAN\\s*离线|\\d+\\s*条\\s*WAN\\s*离线/.test(mobileScenarioText)
        ) &&
          /离线对象|默认路由异常/.test(mobileScenarioText) &&
          /默认路由/.test(mobileScenarioText) &&
          !defaultRouteRatioLeak;
      }
      if (scaleScenario === 'collection-down') {
        return /采集状态|采集通道|通道状态|采集降级|通道异常/.test(mobileScenarioText) &&
          /通道异常|通道降级|当前使用缓存|缓存快照|数据层/.test(mobileScenarioText) &&
          /最后成功采集|最近成功/.test(mobileScenarioText) &&
          /REST\\s*待确认/.test(mobileScenarioText) &&
          /SSH\\s*(?:缺依赖|不可达|不可用)/.test(mobileScenarioText) &&
          restSshPairPattern.test(mobileScenarioText);
      }
      if (scaleScenario === 'resource-full') {
        return /资源证据|资源状态|资源细表|资源阈值|资源/.test(mobileScenarioText) &&
          /CPU\\s*96|CPU96|处理器\\s*96|处理器96/.test(mobileScenarioText) &&
          /(?:MEM|内存)\\s*92|MEM92|内存92/.test(mobileScenarioText) &&
          /(?:DISK|磁盘)\\s*97|DISK97|磁盘97/.test(mobileScenarioText) &&
          /持续/.test(mobileScenarioText) &&
          /6\\s*点|6点|6\\/6/.test(mobileScenarioText) &&
          /阈值|阈/.test(mobileScenarioText) &&
          /峰/.test(mobileScenarioText);
      }
      return /WAN|历史快照|数据陈旧|默认路由|采集|资源/.test(mobileScenarioText);
    })();
    const overviewMobileProductVerdictOk = sectionName !== 'overview' || window.innerWidth >= 768 || Boolean(
      mobileFlatStatusVerdictOk &&
      mobileFlatEvidenceOk &&
      mobileFlatNoSnapshotOk &&
      mobileFlatCollectionOk &&
      mobileScenarioEvidenceOk &&
      !/处置：|建议查看|建议：/.test(mobileFlatStatusText) &&
      mobileFlatLinkLabelsOk &&
      (mobileAlertRect || topErrorNoticeVisible) &&
      (mobileIncidentRect || mobileFlatStatus)
    );
    const mobileAlarmTop = mobileAlertRect?.top ?? topErrorNoticeRect?.top ?? null;
    const edgeScenarioText = [overviewVerdictText, firstScreenOverviewText, mobileTop120Text, topErrorNoticeText].join(' ');
    const resourceEdgeEvidenceText = [edgeScenarioText, expectedRiskEvidenceText, text].join(' ');
    const hasResourceEdgePhrase = resourceEdgeEvidenceText.includes('资源满载') || resourceEdgeEvidenceText.includes('资源高负载');
    const hasCpu96 = resourceEdgeEvidenceText.includes('CPU 96') || resourceEdgeEvidenceText.includes('CPU96') || resourceEdgeEvidenceText.includes('处理器 96') || resourceEdgeEvidenceText.includes('处理器96');
    const hasMemory92 = resourceEdgeEvidenceText.includes('内存 92') || resourceEdgeEvidenceText.includes('内存92') || resourceEdgeEvidenceText.includes('MEM 92') || resourceEdgeEvidenceText.includes('MEM92');
    const hasDisk97 = resourceEdgeEvidenceText.includes('磁盘 97') || resourceEdgeEvidenceText.includes('磁盘97') || resourceEdgeEvidenceText.includes('DISK 97') || resourceEdgeEvidenceText.includes('DISK97');
    const hasResourceDuration = ['持续 6 点', '持续6点', '持续 6/6', '持续6/6'].some((value) => resourceEdgeEvidenceText.includes(value));
    const overviewCurrentResourceEdgeOk = scaleScenario === 'resource-full' && Boolean(
      hasResourceEdgePhrase &&
      hasCpu96 &&
      hasMemory92 &&
      hasDisk97 &&
      hasResourceDuration &&
      /阈值|阈85|阈90/.test(resourceEdgeEvidenceText) &&
      /峰值|峰96|峰92|峰97/.test(resourceEdgeEvidenceText) &&
      /三项同时越阈|越阈项/.test(resourceEdgeEvidenceText) &&
      overviewHighestRiskEvidenceMatchOk &&
      overviewVisibleDensityModuleNames.includes('resource-risk-priority') &&
      overviewVisibleDensityModuleNames.includes('resource-pressure-bars') &&
      overviewVisibleDensityModuleNames.includes('resource-interface-top5')
    );
    const overviewEdgeScenarioOk = sectionName !== 'overview' || !edgeScenarios.has(scaleScenario) || overviewCurrentResourceEdgeOk || Boolean(
      scaleScenario === 'all-offline'
          ? /WAN(?:线路)?.*(?:全离线|全部离线)|WAN 离线/.test(edgeScenarioText) &&
          /默认路由不可用|未发现活动默认路由/.test(edgeScenarioText) &&
          !/当前影响低|影响低|未见线路影响/.test(edgeScenarioText)
        : scaleScenario === 'no-snapshot'
          ? (!activePriorityLabels.length || activePriorityLabels.includes('无可用快照') || activePriorityLabels.includes('快照缺失')) &&
            /快照缺失|无可用快照|RouterOS(?:\\s+可达性)?\\s*当前不可达|业务数据不展示|无业务快照/.test(overviewVerdictText + ' ' + edgeScenarioText) &&
            !/上次采样|以下均为上次采样/.test(firstScreenOverviewText + ' ' + mobileTop120Text) &&
            /接口全 Down|全部接口离线/.test(overviewVerdictText) === false
          : scaleScenario === 'collection-down'
            ? (!activePriorityLabels.length || activePriorityLabels.includes('采集降级')) &&
              /采集降级|采集失败|SSH (?:缺依赖|不可达|(?:采集)?不可用)|REST 待确认|通道状态/.test(edgeScenarioText + ' ' + overviewVerdictText) &&
              /事件更新时间|采集状态更新时间|业务快照|采样新鲜|数据层|当前使用缓存|缓存快照/.test(edgeScenarioText + ' ' + overviewVerdictText)
            : scaleScenario === 'resource-full'
              ? (!activePriorityLabels.length || /资源满载|资源高负载/.test(activePriorityLabels.join(' '))) &&
                hasResourceEdgePhrase &&
                hasCpu96 &&
                hasMemory92 &&
                hasDisk97 &&
                hasResourceDuration &&
                resourceEdgeEvidenceText.includes('均值') &&
                resourceEdgeEvidenceText.includes('阈值') &&
                resourceEdgeEvidenceText.includes('峰') &&
                overviewHighestRiskEvidenceMatchOk
              : /WAN(?:线路)?.*(?:全离线|全部离线)|接口全 Down|全部接口离线|路由不可达|REST 不可达|SSH 不可达/.test(edgeScenarioText)
    );
    const mobileFirstScreenHasScenarioObject = /WAN|默认路由|资源|采集|历史快照|快照缺失|无可用快照|接口转发面|接口全 Down|转发面/.test(firstScreenOverviewText);
    const mobileFirstScreenScenarioCoverageOk = noSnapshotEdge
      ? /WAN/.test(firstScreenOverviewText) && /资源/.test(firstScreenOverviewText) && /采集/.test(firstScreenOverviewText) && /路由/.test(firstScreenOverviewText)
      : scaleScenario === 'resource-full'
        ? /资源/.test(firstScreenOverviewText) && /CPU|处理器/.test(firstScreenOverviewText) && /MEM|内存/.test(firstScreenOverviewText) && /DISK|磁盘/.test(firstScreenOverviewText) && /采集/.test(firstScreenOverviewText)
        : scaleScenario === 'interfaces-down'
          ? /转发|接口/.test(firstScreenOverviewText) && /WAN/.test(firstScreenOverviewText) && /采集/.test(firstScreenOverviewText) && /路由|默认路由/.test(firstScreenOverviewText)
          : scaleScenario === 'all-offline'
            ? /WAN/.test(firstScreenOverviewText) && /离线|全离线|全部离线/.test(firstScreenOverviewText) && /采集/.test(firstScreenOverviewText) && /路由|默认路由/.test(firstScreenOverviewText)
            : scaleScenario === 'collection-down'
              ? /采集|REST|SSH/.test(firstScreenOverviewText) && /缓存|最近成功|最后成功/.test(firstScreenOverviewText) && /路由|默认路由/.test(firstScreenOverviewText)
              : scaleScenario === 'fleet'
                ? /WAN/.test(firstScreenOverviewText) && /离线对象|默认路由|路由/.test(firstScreenOverviewText) && /采集|REST|SSH/.test(firstScreenOverviewText) && /历史|缓存|留存|当前影响未知/.test(firstScreenOverviewText)
                : scaleScenario === 'single'
                  ? /WAN/.test(firstScreenOverviewText) && /默认路由|路由/.test(firstScreenOverviewText) && /采集|REST|SSH/.test(firstScreenOverviewText) && /历史|缓存|留存|当前影响未知/.test(firstScreenOverviewText)
                  : /WAN/.test(firstScreenOverviewText) && /采集/.test(firstScreenOverviewText) && /路由|默认路由/.test(firstScreenOverviewText);
    const overviewMobileArchitectureOk = sectionName !== 'overview' || window.innerWidth >= 768 || Boolean(
      mobileFlatStatusVerdictOk &&
      mobileFlatEvidenceOk &&
      mobileFlatNoSnapshotOk &&
      mobileFlatCollectionOk &&
      mobileConsole &&
      mobileFlatStatus &&
      mobileFlatRowCountOk &&
      mobileFlatLinkLabelsOk &&
      mobileScenarioEvidenceOk &&
      mobileFlatCopyCleanOk &&
      (mobileAlertRect || topErrorNoticeRect) &&
      mobileAlarmTop !== null &&
      mobileAlarmTop < 120 &&
      (!mobileMetricsRect || mobileMetricsRect.top >= mobileAlarmTop) &&
      /结论/.test(firstScreenOverviewText) &&
      mobileCoreBlockContractOk &&
      mobileCoreChartMetaOk &&
      overviewMobileNoLineChartsOk &&
      overviewMobileOfflineBarSemanticsOk &&
      /WAN/.test(firstScreenOverviewText) &&
      /采集/.test(firstScreenOverviewText) &&
      /资源/.test(firstScreenOverviewText) &&
      /最近成功/.test(firstScreenOverviewText) &&
      mobileFlatEntryOk &&
      mobileFirstScreenScenarioCoverageOk &&
      mobileFirstScreenHasScenarioObject &&
      restSshPairPattern.test(firstScreenOverviewText) &&
      (expectedEdgeEvidenceCategory !== 'wan' || /WAN/.test(firstScreenOverviewText + ' ' + mobileTop120Text + ' ' + mobileIncidentTitleText + ' ' + mobileIncidentEvidenceRows.join(' '))) &&
      (!trustNoticeStyle || trustNoticeStyle.display === 'none')
    );
    const mobileFirstScreenChildren = Array.from(mobileFirstScreen?.children || []);
    const overviewMobileFirstScreenContractOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      overviewFlatMobileContractOk &&
      mobileFirstScreen &&
      mobileAlert &&
      mobileFlatStatus &&
      mobileFlatRowCountOk &&
      mobileFlatSuggestionCopyOk &&
      mobileFirstScreenChildren.length >= 1 &&
      mobileFirstScreenChildren.length <= 2 &&
      mobileFirstScreenChildren[0] === mobileFlatStatus &&
      (!mobileFirstScreenChildren[1] || mobileFirstScreenChildren[1]?.hasAttribute('data-overview-mobile-detail-section')) &&
      mobileFirstScreenRect &&
      mobileAlertRect &&
      mobileAlertRect.top < 120 &&
      true
    );
    const mobileLedgerHeight = mobileFlatStatusRect && mobileFirstScreenRect
      ? Math.round(mobileFlatStatusRect.bottom - mobileFirstScreenRect.top)
      : null;
    const overviewMobileLedgerHeightOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      overviewFlatMobileContractOk &&
      mobileLedgerHeight !== null &&
      mobileLedgerHeight >= 96 &&
      mobileLedgerHeight <= 460 &&
      (!noSnapshotEdge || (mobileFirstScreenRect && Math.round(mobileFirstScreenRect.bottom - mobileFirstScreenRect.top) <= 460)) &&
      (!mobileLeadPreviewRect || Math.round(mobileLeadPreviewRect.top - mobileFirstScreenRect.top) <= 460)
    );
    const mobileWanIncidentRouteIndex = mobileDetailSectionIndex(/默认路由|路由/);
    const mobileWanIncidentCollectionIndex = mobileDetailSectionIndex(/采集|通道/);
    const mobileWanIncidentResourceIndex = mobileDetailSectionIndex(/资源|阈值/);
    const overviewMobileWanIncidentPriorityOk = sectionName !== 'overview' || !isMobileOverview || !['all-offline'].includes(scaleScenario) || Boolean(
      /WAN/.test(firstScreenOverviewText) &&
      /离线|全离线|全部离线/.test(firstScreenOverviewText) &&
      /默认路由|离线对象/.test(firstScreenOverviewText) &&
      /^WAN/.test(mobileLeadPreviewTitle) &&
      mobileWanIncidentRouteIndex >= 0 &&
      mobileWanIncidentCollectionIndex >= 0 &&
      mobileWanIncidentResourceIndex >= 0 &&
      mobileWanIncidentRouteIndex < mobileWanIncidentCollectionIndex &&
      mobileWanIncidentCollectionIndex < mobileWanIncidentResourceIndex
    );
    const mobileDetailRows = mobileLeadRows.length
      ? mobileLeadRows
      : Array.from(mobileDetail?.querySelectorAll('.ik-mobile-detail-row, .ik-mobile-terminal-row, .ik-mobile-wan-row') || []);
    const overviewNoSnapshotMobileInternalLabelsOk = sectionName !== 'overview' || !isMobileOverview || !noSnapshotEdge || Boolean(
      !/主结论|主对象|主证据/.test([mobileFlatStatusText, normalize(mobileDetail?.textContent || '')].join(' '))
    );
    const overviewNoSnapshotMobileSingleColumnOk = sectionName !== 'overview' || !isMobileOverview || !noSnapshotEdge || Boolean(
      mobileDetailRows
        .filter((node) => node.classList.contains('ik-mobile-detail-row') && !node.classList.contains('is-head'))
        .every((node) => getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length <= 1)
    );
    const mobileFirstScreenCoverageProbe = sampleRectCoverage(mobileFirstScreen, [
      '[data-overview-mobile-alert]',
      '[data-overview-mobile-flat-status]',
      '[data-overview-mobile-detail-section]',
      '.ik-mobile-alert-strip',
      '.ik-mobile-compact-section',
      '.ik-mobile-detail-row',
      '.ik-mobile-section-head',
      '.ik-mobile-flat-link',
      '.tag',
    ].join(','), 12, 10);
    const mobileFlatHasRouteFact = /默认路由|路由快照缺失|转发面证据/.test(mobileFlatStatusText);
    const mobileFlatHasScenarioFact = scaleScenario === 'resource-full'
      ? /资源满载|资源明细|CPU|MEM|DISK/.test(mobileFlatStatusText)
      : scaleScenario === 'collection-down'
        ? /采集异常|采集通道|缓存快照|REST\s*待确认|SSH\s*(?:缺依赖|不可达|不可用)/.test(mobileFlatStatusText)
        : mobileFlatHasRouteFact;
    const mobileFlatHasRecentOrReason = /最近成功|数据层|业务快照|无业务快照|不替代转发面判断/.test(mobileFlatStatusText);
    const overviewMobileFlatStatusTableOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      mobileFirstScreen &&
      mobileAlert &&
      mobileFlatStatus &&
      mobileFlatRowCountOk &&
      mobileFlatLinkLabelsOk &&
      mobileFlatSuggestionCopyOk &&
      /结论/.test(mobileFlatStatusText) &&
      /WAN/.test(mobileFlatStatusText) &&
      /采集/.test(mobileFlatStatusText) &&
      /资源/.test(mobileFlatStatusText) &&
      /最近成功/.test(mobileFlatStatusText) &&
      mobileCoreBlockContractOk &&
      mobileCoreChartMetaOk &&
      overviewMobileNoLineChartsOk &&
      overviewMobileOfflineBarSemanticsOk &&
      mobileFlatEntryOk &&
      /WAN|接口转发面|接口全 Down|快照缺失|无业务快照|资源满载|资源明细|采集异常|采集通道|CPU|MEM|DISK/.test(mobileFlatStatusText) &&
      mobileFlatHasScenarioFact &&
      /采集/.test(mobileFlatStatusText) &&
      hasRestSshPair(mobileFlatStatusText) &&
      (
        mobileFlatHasRecentOrReason ||
        (scaleScenario === 'resource-full' && /持续窗口|持续/.test(mobileFlatStatusText))
      ) &&
      mobileFirstScreenChildren.length >= 1 &&
      mobileFirstScreenChildren.length <= 2 &&
      mobileFirstScreenChildren[0] === mobileFlatStatus &&
      (!mobileFirstScreenChildren[1] || mobileFirstScreenChildren[1]?.hasAttribute('data-overview-mobile-detail-section')) &&
      mobileAlertRect &&
      mobileAlertRect.top < 120
    );
    const overviewMobileAlertCardCompactOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      mobileAlertRect &&
      true &&
      !sectionRoot?.querySelector('.ik-mobile-incident-card, .ik-mobile-metric-grid')
    );
    const overviewMobileDetailFirstTwoRowsVisibleOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      overviewFlatMobileContractOk &&
      mobileDetailRows.length >= 2 &&
      (noSnapshotEdge || mobileFirstScreenChildren.length === 1 || mobileDetailRows.slice(0, 2).every(nodeVisibleInFirstScreen))
    );
    const overviewDesktopDetailFirstTwoRowsVisibleOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      noSnapshotEdge && overviewNoSnapshotCoreModuleNodes.filter(nodeVisibleInFirstScreen).length === 5 ||
      (scaleScenario === 'resource-full' && sectionRoot?.querySelector('[data-overview-density-module="resource-risk-priority"]')) ||
      (
        overviewDesktopDetail &&
        (() => {
          const desktopDetailRows = Array.from(overviewDesktopDetail.querySelectorAll('tbody tr, .ik-home-evidence-row, .ik-summary-box, [data-overview-field]') || []);
          return desktopDetailRows.length >= 2 && desktopDetailRows.slice(0, 2).every(nodeVisibleInFirstScreen);
        })()
      )
    );
    const overviewMobileNo72vhBlankOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      mobileFirstScreenCoverageProbe &&
      mobileFirstScreenCoverageProbe.total > 0 &&
      mobileFirstScreenCoverageProbe.ratio >= 0.55 &&
      mobileFirstScreenCoverageProbe.blank <= Math.floor(mobileFirstScreenCoverageProbe.total * 0.45)
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
    const overviewCurrentFleetAnomalyEvidenceOk = Boolean(
      scaleScenario === 'fleet' &&
      expectedOfflineNames.length >= 3 &&
      overviewVisibleDensityModuleNames.includes('normal-wan-evidence') &&
      expectedOfflineNames.every((name) => text.includes(name))
    );
    const overviewAnomalyEvidenceOk = sectionName !== 'overview' || expectedOfflineNames.length < 3 || overviewCurrentFleetAnomalyEvidenceOk || Boolean(
      scaleScenario === 'interfaces-down' &&
      /接口转发面|down 数|涉及接口/.test(firstScreenOverviewText + ' ' + overviewDesktopDetailText + ' ' + mobileTop120Text)
    ) || Boolean(
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
    const staleLikeModeActive = historyModeActive || (noSnapshotEdge && /无可用快照/.test(staleSignalText)) || /历史快照数据陈旧|数据状态\\s*(历史快照\\s*)?数据陈旧|当前不是实时数据|数据陈旧\\s+未采集/.test(staleSignalText);
    const overviewHistoryNoLiveGreenOk = sectionName !== 'overview' || !staleLikeModeActive || historyLiveGreenTags.length === 0;
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
    const overviewFirstScreenEllipsisOk = sectionName !== 'overview' || !isMobileOverview || overviewFirstScreenEllipsisCount === 0;
    const criticalEllipsisSamples = ellipsisSamples.filter((sample) => /mobile-alert|mobile-incident|main-verdict|anomaly|wan-row|metric-main|metric-sub/.test(sample.selector));
    const overviewCriticalEllipsisOk = sectionName !== 'overview' || criticalEllipsisSamples.length === 0;
    const mobile390CoreTextClipSamples = mobileOverview390x844
      ? Array.from(sectionRoot?.querySelectorAll([
        '.ik-ios-top-nav *',
        '.ik-ios-hero-card *',
        '.ik-ios-rings-card *',
        '.ik-ios-rank-card *',
        '.ik-mobile-device-title',
        '.ik-ios-nav-title',
        '.ik-ios-hero-head',
        '.ik-ios-rings-card header',
        '.ik-ios-rank-card header',
        '.ik-ios-rank-row span',
        '.ik-ios-resource-card header',
      ].join(',')) || [])
        .filter(nodeVisibleInFirstScreen)
        .filter((node) => normalize(node.textContent || '').length > 1)
        .filter((node) => !['svg', 'path', 'circle', 'button'].includes(String(node.tagName || '').toLowerCase()))
        .map((node) => {
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          const clipped = style.textOverflow === 'ellipsis' ||
            (['hidden', 'clip'].includes(style.overflowX) && node.scrollWidth > node.clientWidth + 2) ||
            (['hidden', 'clip'].includes(style.overflow) && node.scrollHeight > node.clientHeight + 2) ||
            (style.whiteSpace === 'nowrap' && node.scrollWidth > node.clientWidth + 2);
          return clipped ? {
            selector: selectorForNode(node),
            text: normalize(node.textContent || '').slice(0, 80),
            width: Math.round(rect.width),
            scrollWidth: Math.round(node.scrollWidth),
            height: Math.round(rect.height),
            scrollHeight: Math.round(node.scrollHeight),
          } : null;
        })
        .filter(Boolean)
      : [];
    const mobile390TitleOverlapSamples = mobileOverview390x844
      ? Array.from(sectionRoot?.querySelectorAll([
        '.ik-mobile-device-title',
        '.ik-ios-nav-title',
        '.ik-ios-hero-head',
        '.ik-ios-resource-card header',
        '.ik-ios-rank-card header',
      ].join(',')) || [])
        .filter(nodeVisibleInFirstScreen)
        .map((node) => {
          const rect = node.getBoundingClientRect();
          const overlapSibling = Array.from(node.parentElement?.children || [])
            .filter((child) => child !== node)
            .some((sibling) => nodeVisibleInFirstScreen(sibling) && rectsOverlap(rect, sibling.getBoundingClientRect()));
          return overlapSibling ? {
            selector: selectorForNode(node),
            text: normalize(node.textContent || '').slice(0, 80),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          } : null;
        })
        .filter(Boolean)
      : [];
    const overviewMobile390NoCoreTextClipOk = !mobileOverview390x844 || mobile390CoreTextClipSamples.length === 0;
    const overviewMobile390NoAppHomeTitleClipOk = !mobileOverview390x844 || (
      overviewMobile390NoCoreTextClipOk &&
      mobile390TitleOverlapSamples.length === 0
    );
    const overviewMobileIosRouterHomeOk = !mobileOverview390x844 || Boolean(
      mobile390AppHomeChromeOk &&
      mobile390AppHomeTwinOk &&
      mobile390AppHomeScenarioVisualOk &&
      mobile390AppHomeRingTrafficOk &&
      overviewMobile390FirstScreenNoTableOk &&
      overviewMobile390NoKpi2x2Ok &&
      overviewMobile390FirstScreenVisualOk &&
      overviewMobile390NoAppHomeTitleClipOk &&
      overviewMobile390NoCoreTextClipOk &&
      overviewMobile390FirstTwoRowsVisibleOk &&
      overviewMobile390NoMemDiskVisibleOk &&
      overviewMobile390NoCpuMemDiskEnglishOk &&
      overviewMobile390NoFocusPrimaryStatusOk &&
      overviewMobile390NoTitleStatusCollisionOk &&
      overviewMobile390NoCardPileOk &&
      overviewMobile390ScenarioVisualKindOk &&
      overviewMobile390NoRawBooleanCopyOk &&
      overviewMobile390NoRawRouterOsFieldsOk &&
      overviewMobile390NoMainProgressBarOk &&
      overviewMobile390NoHeavyVisualBlocksOk &&
      overviewMobileResourceFullVerticalOk &&
      overviewMobile390BottomTabOk
    );
    const overviewMobile390AcceptanceOk = overviewMobileIosRouterHomeOk;
    const primaryConclusionEllipsisSamples = ellipsisSamples.filter((sample) =>
      String(sample.selector || '').includes('.ik-mobile-primary-conclusion') ||
      /异常：|WAN全离线|快照缺失|资源满载|采集异常|接口全/.test(sample.text)
    );
    const overviewPrimaryConclusionNoEllipsisOk = sectionName !== 'overview' || !isMobileOverview || primaryConclusionEllipsisSamples.length === 0;
    const overviewMobileFirstScreenHardCompressionProbe = isMobileOverview ? {
      coverage: mobileFirstScreenCoverageProbe,
      firstScreenHeight: mobileFirstScreenRect ? Math.round(mobileFirstScreenRect.height) : null,
      firstScreenBottom: mobileFirstScreenRect ? Math.round(mobileFirstScreenRect.bottom) : null,
      firstScreenHeightLimit: Math.round(window.innerHeight * 0.62),
      flatRows: mobileFlatRows.length,
      visibleFlatRows: mobileFlatRows.filter(nodeVisibleInFirstScreen).length,
      ellipsisCount: overviewFirstScreenEllipsisCount,
      criticalEllipsisCount: criticalEllipsisSamples.length,
      primaryConclusionEllipsisCount: primaryConclusionEllipsisSamples.length,
    } : null;
    const overviewMobileFirstScreenHardCompressionOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      mobileFirstScreenRect &&
      mobileFirstScreenCoverageProbe &&
      mobileFirstScreenCoverageProbe.total > 0 &&
      mobileFirstScreenCoverageProbe.ratio >= 0.62 &&
      mobileFirstScreenCoverageProbe.blank <= Math.floor(mobileFirstScreenCoverageProbe.total * 0.38) &&
      mobileFirstScreenRect.height <= window.innerHeight * 0.62 &&
      overviewFirstScreenEllipsisCount === 0 &&
      criticalEllipsisSamples.length === 0 &&
      primaryConclusionEllipsisSamples.length === 0 &&
      (mobileFlatRows.length === 0 || mobileFlatRows.every(nodeVisibleInFirstScreen))
    );
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
    const overviewStatusBarOpsCells = Array.from(overviewStatusBar?.querySelectorAll('.ik-home-ops-item') || []);
    const overviewStatusBarCells = overviewStatusBarOpsCells.length
      ? overviewStatusBarOpsCells
      : Array.from(overviewStatusBar?.querySelectorAll('[data-overview-field]') || []);
    const overviewStatusBarVisibleCells = overviewStatusBarCells.filter(nodeVisibleInFirstScreen);
    const overviewCombinedCurrentText = [overviewVerdictText, firstScreenOverviewText, mobileTop120Text, topErrorNoticeText].join(' ');
    const overviewStatusBarLabels = overviewStatusBarCells
      .map((node) => normalize(node.querySelector('span')?.textContent || '').replace(/\\s+/g, ''))
      .filter(Boolean);
    const overviewStatusBarRoleOrder = overviewStatusBarCells
      .map((node) => node.getAttribute('data-overview-status-role') || '')
      .filter(Boolean);
    const overviewStatusBarExpectedRoleOrder = noSnapshotEdge
      ? ['conclusion', 'device', 'routeros', 'rest', 'ssh', 'recent-success']
      : ['conclusion', 'impact', 'collection', 'snapshot'];
    const overviewStatusBusRoleContractOk = Boolean(
      overviewStatusBar &&
      overviewStatusBarCells.length === overviewStatusBarExpectedRoleOrder.length &&
      overviewStatusBarVisibleCells.length === overviewStatusBarExpectedRoleOrder.length &&
      overviewStatusBarLabels.length === overviewStatusBarExpectedRoleOrder.length &&
      overviewStatusBarRoleOrder.length === overviewStatusBarExpectedRoleOrder.length &&
      overviewStatusBarExpectedRoleOrder.every(
        (role, index) => overviewStatusBarRoleOrder[index] === role
      )
    );
    const overviewStatusBusAcceptedContractOk = Boolean(
      overviewStatusBusRoleContractOk
    );
    const overviewTopBandIsoTimestampPattern = /\\b\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?Z?\\b/;
    const overviewStatusBusFixedGrammarOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      overviewStatusBusAcceptedContractOk &&
      !overviewTopBandIsoTimestampPattern.test(overviewStatusBarText) &&
      !/历史快照历史快照状态表|WAN\\s*\\/\\s*默认路由状态表|REST\\/SSH\\s*REST|REST\\/SSH\\s*SSH/.test(overviewDesktopTopText + ' ' + overviewDesktopDetailText)
    );
    const overviewDesktopFirstDetailModule = overviewDesktopDetail?.querySelector('[data-overview-density-module]');
    const overviewDesktopFirstDetailModuleName = overviewDesktopFirstDetailModule?.getAttribute('data-overview-density-module') || '';
    const overviewCollectionContradictionOk = sectionName !== 'overview' || scaleScenario !== 'collection-down' || Boolean(
      /REST\\s*待确认/.test(overviewCombinedCurrentText + ' ' + overviewDesktopDetailText) &&
      /SSH\\s*(?:缺依赖|不可达|不可用)/.test(overviewCombinedCurrentText + ' ' + overviewDesktopDetailText) &&
      /最后成功/.test(overviewCombinedCurrentText + ' ' + overviewDesktopDetailText) &&
      /当前使用缓存|缓存快照/.test(overviewCombinedCurrentText + ' ' + overviewDesktopDetailText) &&
      !/当前未发现采集异常项|未发现采集异常项/.test(overviewCombinedCurrentText + ' ' + overviewDesktopDetailText)
    );
    const overviewCurrentInterfacesForwardingText = [overviewCombinedCurrentText, overviewDesktopDetailText, overviewStatusBarText].join(' ');
    const overviewCurrentInterfacesForwardingOk = Boolean(
      (!isDesktopOverview || overviewDesktopFirstDetailModuleName === 'interface-forwarding') &&
      overviewVisibleDensityModuleNames.includes('interface-forwarding') &&
      overviewVisibleDensityModuleNames.includes('interface-relation-carrier') &&
      overviewVisibleDensityModuleNames.includes('interface-forwarding-boundary') &&
      /接口.*Down/i.test(overviewCurrentInterfacesForwardingText) &&
      /父接口/.test(overviewCurrentInterfacesForwardingText) &&
      /桥接/.test(overviewCurrentInterfacesForwardingText) &&
      /VLAN/i.test(overviewCurrentInterfacesForwardingText) &&
      /默认出口|默认路由/.test(overviewCurrentInterfacesForwardingText) &&
      /不可判定|承载待判/.test(overviewCurrentInterfacesForwardingText) &&
      restSshPairPattern.test(overviewCurrentInterfacesForwardingText)
    );
    const overviewInterfacesForwardingFirstOk = sectionName !== 'overview' || scaleScenario !== 'interfaces-down' || overviewCurrentInterfacesForwardingOk || Boolean(
      (!isDesktopOverview || overviewDesktopFirstDetailModuleName === 'interface-forwarding') &&
      /接口转发面/.test(overviewCombinedCurrentText + ' ' + overviewDesktopDetailText) &&
      /down 数/.test(overviewCombinedCurrentText + ' ' + overviewDesktopDetailText) &&
      /涉及接口/.test(overviewCombinedCurrentText + ' ' + overviewDesktopDetailText) &&
      /parent|父接口/.test(overviewCombinedCurrentText + ' ' + overviewDesktopDetailText) &&
      /bridge|桥接/.test(overviewCombinedCurrentText + ' ' + overviewDesktopDetailText) &&
      /vlan/i.test(overviewCombinedCurrentText + ' ' + overviewDesktopDetailText) &&
      /pppoe-out|PPPoE出口|PPPoE 出口/i.test(overviewCombinedCurrentText + ' ' + overviewDesktopDetailText) &&
      /默认路由影响/.test(overviewCombinedCurrentText + ' ' + overviewDesktopDetailText) &&
      /REST SSH 可达性|REST\\s*SSH|REST.*SSH/.test(overviewCombinedCurrentText + ' ' + overviewDesktopDetailText)
    );
    const overviewMobileInterfacesFirstOk = sectionName !== 'overview' || scaleScenario !== 'interfaces-down' || !isMobileOverview || Boolean(
      mobileLeadPreview &&
      mobileLeadIsInterfaceTable &&
      /接口转发面/.test(mobileLeadPreviewTitle) &&
      !/^WAN线路/.test(mobileLeadPreviewTitle) &&
      /down/i.test(mobileLeadPreviewText) &&
      /默认路由|不可判定/.test(mobileLeadPreviewText) &&
      /REST/.test(mobileLeadPreviewText) &&
      /SSH/.test(mobileLeadPreviewText) &&
      restSshPairPattern.test(mobileLeadPreviewText)
    );
    const mobileInterfaceRowSamples = (scaleScenario === 'interfaces-down' && isMobileOverview)
      ? mobileLeadRows.filter(nodeVisibleInFirstScreen).map((row) => {
        const rect = row.getBoundingClientRect();
        const visibleCells = Array.from(row.children || []).filter((child) => {
          const childRect = child.getBoundingClientRect();
          const childStyle = getComputedStyle(child);
          return childRect.width > 0 &&
            childRect.height > 0 &&
            childStyle.display !== 'none' &&
            childStyle.visibility !== 'hidden';
        });
        return {
          text: normalize(row.textContent || '').slice(0, 120),
          height: Math.round(rect.height),
          cellCount: visibleCells.length,
          columnCount: getComputedStyle(row).gridTemplateColumns.split(' ').filter(Boolean).length,
          isInterfaceRow: row.classList.contains('is-interface-row'),
          overflowX: Math.round(row.scrollWidth - row.clientWidth),
        };
      })
      : [];
    const overviewMobileInterfaceRowFormatOk = sectionName !== 'overview' || scaleScenario !== 'interfaces-down' || !isMobileOverview || Boolean(
      overviewMobileInterfacesFirstOk &&
      mobileInterfaceRowSamples.length >= 2 &&
      mobileInterfaceRowSamples.every((row) => row.isInterfaceRow && row.height <= 72 && row.cellCount === 4 && row.columnCount === 4 && row.overflowX <= 2) &&
      /down|Down|离线/.test(mobileLeadPreviewText) &&
      /parent|bridge|vlan|pppoe-out/i.test(mobileLeadPreviewText) &&
      /默认路由|不可判定/.test(mobileLeadPreviewText) &&
      restSshPairPattern.test(mobileLeadPreviewText)
    );
    const overviewFirstScreenModuleTitles = Array.from(sectionRoot?.querySelectorAll('[data-overview-density-module] .ik-overview-flat-title') || [])
      .filter(nodeVisibleInFirstScreen)
      .map((node) => normalize(node.textContent || ''))
      .filter(Boolean);
    const overviewResourceThresholdTitleCount = overviewFirstScreenModuleTitles.filter((title) => /资源阈值|资源均峰/.test(title)).length;
    const overviewResourceThresholdTitleLimit = isMobileOverview ? 2 : 1;
    const overviewResourceFirstScreenText = [firstScreenOverviewText, overviewDesktopDetailText, overviewDesktopTopText].join(' ');
    const overviewResourceSpecificText = [
      overviewCombinedCurrentText,
      overviewDesktopDetailText,
      normalize(overviewSummaryMain?.textContent || ''),
    ].join(' ');
    const overviewResourceVisibleModuleText = overviewVisibleDensityModuleRecords
      .map((item) => [item.module, item.title, item.text].join(' '))
      .join(' ');
    const overviewResourceFullEvidenceText = [overviewResourceSpecificText, overviewResourceVisibleModuleText].join(' ');
    const overviewResourceSpecificModuleChecks = {
      riskPriority: /resource-risk-priority|资源满载|最危险项/.test(overviewResourceVisibleModuleText),
      pressureBars: /resource-pressure-bars|资源压力条形摘要|连接压力|活动会话|DNS缓存/.test(overviewResourceVisibleModuleText),
      interfaceTop5: /resource-interface-top5|接口吞吐 Top5|Top5占比|最大值归一/.test(overviewResourceVisibleModuleText),
    };
    const overviewResourceSpecificModuleCount = overviewVisibleDensityModuleRecords
      .filter((item) => /resource-risk-priority|resource-pressure-bars|resource-interface-top5|资源压力条形摘要|接口吞吐 Top5/.test([item.module, item.title, item.text].join(' ')))
      .length;
    const overviewResourceSupplementalFactChecks = {
      activeSessions: /active sessions|活动会话/i.test(overviewResourceFullEvidenceText),
      cacheGap: /cache gap|缓存差距|缓存缺口|DNS缓存|DNS 缓存/i.test(overviewResourceFullEvidenceText),
      busiestInterface: /busiest interface|最忙接口|最繁忙接口|接口峰值|接口吞吐|Top5/i.test(overviewResourceFullEvidenceText),
    };
    const overviewResourceForbiddenModuleNames = [
      'resource-threshold',
      'resource-pressure',
      'connection-pressure',
      'process-service-pressure',
      'process-pressure',
      'service-pressure',
      'interface-throughput-impact',
      'resource-sampling-window',
      'rank',
      'wan-trend'
    ];
    const overviewResourceForbiddenVisibleModules = overviewVisibleDensityModuleNames
      .filter((name) => overviewResourceForbiddenModuleNames.includes(name));
    const overviewResourceTop5Module = sectionRoot?.querySelector('[data-overview-density-module="resource-interface-top5"]');
    const overviewResourceTop5Rows = Array.from(overviewResourceTop5Module?.querySelectorAll('[data-overview-share][data-overview-normalized]') || []);
    const overviewResourceSpecificModulesOk = sectionName !== 'overview' || scaleScenario !== 'resource-full' || !isDesktopOverview || Boolean(
      overviewResourceSpecificModuleCount >= 3 &&
      Object.values(overviewResourceSpecificModuleChecks).every(Boolean) &&
      Object.values(overviewResourceSupplementalFactChecks).every(Boolean) &&
      overviewResourceForbiddenVisibleModules.length === 0 &&
      overviewResourceTop5Module &&
      overviewResourceTop5Module.hasAttribute('data-overview-top5-total') &&
      overviewResourceTop5Rows.length >= 5
    );
    const overviewResourceFinalOrderGroups = [
      ['resource-risk-priority'],
      ['resource-pressure-bars'],
      ['resource-interface-top5']
    ];
    const overviewResourceFinalOrderIndexes = overviewResourceFinalOrderGroups.map((group) => {
      const indexes = group
        .map((name) => overviewDensityModuleNames.indexOf(name))
        .filter((index) => index >= 0);
      return indexes.length ? Math.min(...indexes) : -1;
    });
    const overviewResourceFinalOrderMissing = overviewResourceFinalOrderGroups
      .filter((group, index) => overviewResourceFinalOrderIndexes[index] < 0)
      .map((group) => group.join('|'));
    const overviewResourceFinalOrderNames = overviewDensityModuleNames
      .filter((name) => overviewResourceFinalOrderGroups.some((group) => group.includes(name)));
    const overviewResourceFinalOrderCounts = overviewResourceFinalOrderNames.reduce((acc, name) => {
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});
    const overviewResourceFinalOrderDuplicateModules = Object.entries(overviewResourceFinalOrderCounts)
      .filter(([, count]) => count > 1)
      .map(([name]) => name);
    const overviewResourceFinalOrderOk = sectionName !== 'overview' || scaleScenario !== 'resource-full' || !isDesktopOverview || Boolean(
      overviewResourceFinalOrderMissing.length === 0 &&
      overviewResourceFinalOrderIndexes.every((index, position, indexes) => index >= 0 && (position === 0 || index > indexes[position - 1])) &&
      overviewResourceFinalOrderDuplicateModules.length === 0 &&
      /最危险项/.test(overviewResourceVisibleModuleText + ' ' + overviewResourceFirstScreenText) &&
      !overviewVisibleDensityModuleNames.includes('rank') &&
      !overviewVisibleDensityModuleNames.includes('wan-trend') &&
      (!rankGrid || rankGrid === overviewResourceTop5Module || overviewResourceTop5Module?.contains(rankGrid) || !nodeVisibleInFirstScreen(rankGrid))
    );
    const overviewResourceVisibleCellCount = (sectionName === 'overview' && scaleScenario === 'resource-full')
      ? Array.from(sectionRoot?.querySelectorAll([
        'tbody td',
        'tbody th',
        'thead th',
        '.ik-home-flat-cell span',
        '.ik-home-flat-cell b',
        '.ik-mobile-detail-row span',
        '.ik-mobile-detail-row b',
        '.ik-mobile-section-head'
      ].join(',')) || []).filter(nodeVisibleInFirstScreen).length
      : 0;
    const overviewResourceEffectiveVisibleFactCount = Math.max(
      overviewFirstScreenFieldCount,
      overviewVisibleFactCount,
      overviewResourceVisibleCellCount
    );
    const overviewResourceFirstScreenWanTrendForbiddenOk = sectionName !== 'overview' || scaleScenario !== 'resource-full' || Boolean(
      !overviewFirstScreenModuleTitles.some((title) => /WAN\\s*速率|WAN速率/.test(title)) &&
      !/(?:^|\\s)(?:WAN\\s*速率|WAN速率)(?:\\s|$)/.test(overviewResourceFirstScreenText)
    );
    const overviewResourceFirstScreenEffectiveFactsOk = sectionName !== 'overview' || scaleScenario !== 'resource-full' || Boolean(
      isDesktopOverview
        ? (
          overviewResourceSpecificModulesOk &&
          overviewResourceTop5Rows.length >= 5 &&
          overviewVisibleDensityModuleNames.includes('resource-risk-priority') &&
          overviewVisibleDensityModuleNames.includes('resource-pressure-bars') &&
          overviewVisibleDensityModuleNames.includes('resource-interface-top5') &&
          overviewResourceEffectiveVisibleFactCount >= 20
        )
        : overviewResourceEffectiveVisibleFactCount >= 60
    );
    const overviewResourceDesktopPriorityText = [
      overviewCombinedCurrentText,
      overviewDesktopDetailText,
      text
    ].join(' ');
    const overviewResourceFirstScreenPriorityOk = sectionName !== 'overview' || scaleScenario !== 'resource-full' || Boolean(
      isMobileOverview
        ? (
          /资源满载|资源高负载|资源阈值/.test(firstScreenOverviewText) &&
          /CPU\s*96|CPU96|处理器\s*96|处理器96/.test(firstScreenOverviewText) &&
          /MEM\s*92|MEM92|内存\s*92/.test(firstScreenOverviewText) &&
          /DISK\s*97|DISK97|磁盘\s*97/.test(firstScreenOverviewText) &&
          /持续/.test(firstScreenOverviewText) &&
          /阈/.test(firstScreenOverviewText) &&
          /峰/.test(firstScreenOverviewText)
        )
        : (
          /资源满载|资源高负载|资源阈值/.test(overviewResourceDesktopPriorityText) &&
          /CPU|处理器/.test(overviewResourceDesktopPriorityText) &&
          /MEM|内存/.test(overviewResourceDesktopPriorityText) &&
          /DISK|磁盘/.test(overviewResourceDesktopPriorityText) &&
          /连接压力/.test(overviewResourceDesktopPriorityText) &&
          /接口吞吐\s*Top5|接口吞吐 Top5/.test(overviewResourceDesktopPriorityText + ' ' + overviewResourceVisibleModuleText) &&
          /DNS缓存/.test(overviewResourceDesktopPriorityText) &&
          /活动会话|active sessions/.test(overviewResourceDesktopPriorityText) &&
          /最危险项/.test(overviewResourceDesktopPriorityText) &&
          overviewResourceSpecificModulesOk &&
          overviewResourceThresholdTitleCount <= overviewResourceThresholdTitleLimit &&
          overviewResourceFirstScreenWanTrendForbiddenOk &&
          overviewResourceFirstScreenEffectiveFactsOk &&
          (!rankGrid || rankGrid === overviewResourceTop5Module || overviewResourceTop5Module?.contains(rankGrid) || !nodeVisibleInFirstScreen(rankGrid))
        )
    );
    const overviewCollectionTrustMarkersOk = sectionName !== 'overview' || scaleScenario !== 'collection-down' || Boolean(
      /缓存快照|缓存可参考/.test(overviewCombinedCurrentText + ' ' + overviewDesktopDetailText) &&
      (
        /采集通道 · (?:缓存快照|缓存可参考)|资源阈值 · (?:缓存快照|缓存可参考)/.test(overviewCombinedCurrentText + ' ' + overviewDesktopDetailText) ||
        (
          overviewVisibleDensityModuleNames.includes('collection-channel-ledger') &&
          overviewVisibleDensityModuleNames.includes('collection-recent-failures') &&
          /采集异常|三通道状态条|最后成功时间轴|缓存快照/.test(overviewVisibleDensityModuleText + ' ' + overviewDesktopDetailText)
        )
      )
    );
    const overviewCurrentCollectionBusinessTrustText = [
      firstScreenOverviewText,
      mobileTop120Text,
      overviewCombinedCurrentText,
      overviewDesktopDetailText,
      overviewVisibleDensityModuleText,
    ].join(' ');
    const overviewCurrentCollectionBusinessTrustOk = Boolean(
      /可信度下降/.test(overviewCurrentCollectionBusinessTrustText) &&
      /转发面.*可用|非断网/.test(overviewCurrentCollectionBusinessTrustText) &&
      /采集面.*降级|采集降级/.test(overviewCurrentCollectionBusinessTrustText) &&
      /快照面.*缓存|缓存快照/.test(overviewCurrentCollectionBusinessTrustText) &&
      /业务面.*可判|业务仍可判|业务转发不作异常推断|不等同转发异常/.test(overviewCurrentCollectionBusinessTrustText) &&
      !/业务正常/.test(overviewCurrentCollectionBusinessTrustText)
    );
    const overviewCollectionBusinessTrustCopyOk = sectionName !== 'overview' || scaleScenario !== 'collection-down' || overviewCurrentCollectionBusinessTrustOk || Boolean(
      /业务可信度.*缓存可参考.*当前不可判定/.test([
        firstScreenOverviewText,
        mobileTop120Text,
        overviewCombinedCurrentText,
        overviewDesktopDetailText,
        overviewVisibleDensityModuleText,
      ].join(' ')) &&
      !/业务数字|上次成功可参考|当前影响未知/.test([
        firstScreenOverviewText,
        mobileTop120Text,
        overviewCombinedCurrentText,
        overviewDesktopDetailText,
        overviewVisibleDensityModuleText,
      ].join(' '))
    );
    const overviewCollectionTerminalRankDeprioritizedOk = sectionName !== 'overview' || scaleScenario !== 'collection-down' || Boolean(
      /采集|通道|缓存/.test(overviewCombinedCurrentText + ' ' + overviewDesktopDetailText) &&
      (
        !isDesktopOverview ||
        (
          ['collection-focus', 'freshness', 'collection-cache-ledger', 'collection-cache-boundary', 'collection-channel-ledger'].includes(overviewDesktopFirstDetailModuleName) &&
          !overviewVisibleDensityModuleNames.includes('rank') &&
          (!rankGrid || !nodeVisibleInFirstScreen(rankGrid))
        ) ||
        (
          overviewDesktopCollectionLedger &&
          !overviewVisibleDensityModuleNames.includes('rank') &&
          (!rankGrid || !nodeVisibleInFirstScreen(rankGrid))
        )
      ) &&
      (
        !isMobileOverview ||
        (
          !/^终端|在线终端|终端排行|流量排行/.test(mobileLeadPreviewTitle) &&
          !/在线终端|终端排行/.test(firstScreenOverviewText.slice(0, 180))
        )
      )
    );
    const overviewCollectionRankAnchorIndex = (() => {
      const indexes = ['collection-channel-ledger', 'collection-recent-failures', 'collection-cache-ledger', 'collection-cache-boundary', 'collection-focus', 'freshness']
        .map((name) => overviewVisibleDensityModuleNames.indexOf(name))
        .filter((index) => index >= 0);
      return indexes.length ? Math.min(...indexes) : -1;
    })();
    const overviewCollectionRankIndex = overviewVisibleDensityModuleNames.indexOf('rank');
    const overviewCollectionRankOrderOk = sectionName !== 'overview' || scaleScenario !== 'collection-down' || Boolean(
      isMobileOverview
        ? (
          overviewCollectionTerminalRankDeprioritizedOk &&
          /采集|REST|SSH|缓存/.test(firstScreenOverviewText) &&
          (!rankGrid || !nodeVisibleInFirstScreen(rankGrid))
        )
        : (
          overviewCollectionTerminalRankDeprioritizedOk &&
          overviewCollectionRankAnchorIndex >= 0 &&
          overviewCollectionRankIndex < 0 &&
          (!rankGrid || !nodeVisibleInFirstScreen(rankGrid))
        )
    );
    const overviewConsoleLanguageText = [
      firstScreenOverviewText,
      overviewDesktopTopText,
      overviewDesktopDetailText,
    ].join(' ');
    const overviewConsoleLanguageOk = sectionName !== 'overview' || Boolean(
      !overviewConsoleLanguageText.includes('采集链路 / 业务展示 / 下次尝试') &&
      !overviewConsoleLanguageText.includes('采集链路 / 业务展示 / 下次轮询') &&
      !overviewConsoleLanguageText.includes('对象 / 数字 / 依据')
    );
    const overviewStatusBarRect = overviewStatusBar?.getBoundingClientRect();
    const overviewStatusBarStyle = overviewStatusBar ? getComputedStyle(overviewStatusBar) : null;
    const overviewStatusBusCells = Array.from(overviewVerdictStatusBus?.querySelectorAll('[data-overview-status-cell]') || []);
    const overviewStatusBusVisibleCells = overviewStatusBusCells.filter(nodeVisibleInFirstScreen);
    const overviewStatusBusText = normalize(overviewVerdictStatusBus?.textContent || overviewStatusBar?.textContent || '');
    const overviewSummaryBoxText = normalize(overviewSummaryMain?.textContent || '');
    const overviewChineseUiVisibleText = [
      overviewVerdictText,
      firstScreenOverviewText,
      mobileTop120Text,
      overviewSummaryBoxText,
      overviewDesktopDetailText,
      overviewDesktopTopText,
      topErrorNoticeText,
    ].join(' ');
    const overviewChineseUiNoEngineeringEnglishOk = sectionName !== 'overview' || !(/[�]/.test(overviewChineseUiVisibleText) || /(?:^|[^A-Za-z])(endpoint|failure|stale|snapshot|bucket|hasMore|sampled|sort|cache\\s+gap|active\\s+sessions|process\\s*\\/\\s*service|ConnTrack|Conn|module|detail|panel|ledger|chart|window|threshold|confidence|ratio|sample|current|peak|mean)(?:[^A-Za-z]|$)/i.test(overviewChineseUiVisibleText));
    const overviewDesktopFlatStatusBarOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      overviewStatusBar &&
      overviewStatusBarCells.length >= overviewStatusBarExpectedRoleOrder.length &&
      overviewStatusBarVisibleCells.length >= overviewStatusBarExpectedRoleOrder.length &&
      overviewStatusBarRect &&
      overviewStatusBarRect.height <= 56 &&
      overviewStatusBarStyle &&
      overviewStatusBarStyle.display === 'grid' &&
      overviewStatusBarStyle.backgroundImage === 'none' &&
      overviewStatusBarStyle.boxShadow === 'none' &&
      Number.parseFloat(overviewStatusBarStyle.borderTopWidth || '0') <= 1 &&
      Number.parseFloat(overviewStatusBarStyle.borderRightWidth || '0') <= 1 &&
      Number.parseFloat(overviewStatusBarStyle.borderBottomWidth || '0') <= 1 &&
      Number.parseFloat(overviewStatusBarStyle.borderLeftWidth || '0') <= 2 &&
      Number.parseFloat(overviewStatusBarStyle.borderTopLeftRadius || '0') <= 6 &&
      Number.parseFloat(overviewStatusBarStyle.borderTopRightRadius || '0') <= 6 &&
      Number.parseFloat(overviewStatusBarStyle.borderBottomLeftRadius || '0') <= 6 &&
      Number.parseFloat(overviewStatusBarStyle.borderBottomRightRadius || '0') <= 6
    );
    const overviewSceneSpecificTableDensityOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      (
        noSnapshotEdge &&
        overviewSceneSpecificDesktopDensityOk &&
        overviewNoSnapshotCoreModuleNodes
          .flatMap((node) => Array.from(node?.querySelectorAll('[data-overview-field]') || []))
          .filter(nodeVisibleInFirstScreen).length >= 28
      ) ||
      (
        scaleScenario === 'resource-full' &&
        overviewSceneSpecificDesktopDensityOk &&
        sectionRoot?.querySelectorAll('[data-overview-density-module="resource-pressure-bars"] .ik-overview-bar-row').length >= 8 &&
        sectionRoot?.querySelectorAll('[data-overview-density-module="resource-interface-top5"] [data-overview-share][data-overview-normalized]').length >= 5
      ) ||
      (
        scaleScenario === 'all-offline' &&
        overviewSceneSpecificDesktopDensityOk &&
        sectionRoot?.querySelectorAll('[data-overview-density-module="wan-offline-continuity"] [data-overview-field]').length >= 8 &&
        sectionRoot?.querySelectorAll('[data-overview-density-module="wan-route-ledger"] tbody tr').length >= 6
      )
    );
    const overviewDesktopTableDensityOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      overviewSceneSpecificTableDensityOk ||
      (
        overviewDesktopDetail &&
        overviewDesktopDetailRows.length >= 2 &&
        overviewDesktopDetailFirstTwoRowsVisible &&
        (
          overviewDesktopDetail.querySelector('[data-overview-evidence-matrix]') ||
          overviewDesktopDetail.querySelector('[data-overview-detail-section="table"]') ||
          overviewDesktopDetail.querySelector('[data-overview-no-snapshot-grid]') ||
          overviewNoSnapshotGrid ||
          overviewDesktopDetail.querySelector('.ik-overview-flat-module .ops-table-wrap') ||
          overviewDesktopDetail.querySelector('.ik-home-evidence-list') ||
          overviewDesktopDetail.querySelector('[data-overview-density-module="signal-coverage"]') ||
          overviewDesktopDetail.querySelector('[data-overview-density-module="freshness"]') ||
          overviewDesktopDetail.querySelectorAll('.ops-table-wrap').length >= 2
        ) &&
        (
          overviewDesktopDetail.querySelectorAll('[data-overview-evidence-matrix] .ik-home-evidence-row').length >= 3 ||
          overviewDesktopDetail.querySelectorAll('[data-overview-detail-section="table"] tbody tr').length >= 4 ||
          overviewDesktopDetail.querySelectorAll('[data-overview-no-snapshot-grid] .ik-summary-box, [data-overview-no-snapshot-grid] .freshness-item').length >= 8 ||
          overviewDesktopDetail.querySelectorAll('.ik-home-evidence-row').length >= 4 ||
          overviewNoSnapshotGridItems.length >= 8 ||
          overviewNoSnapshotDetailModules >= 2 ||
          overviewDesktopDetail.querySelectorAll('tbody tr').length >= 6 ||
          overviewDesktopDenseRows >= 24
        ) &&
        (overviewDensityModules.length >= 2 || overviewDesktopDenseRows >= 24 || (noSnapshotEdge && overviewDensityModules.length >= 2 && overviewNoSnapshotGridItems.length >= 8))
      )
    );
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
        overviewVerdictStatusBus &&
        overviewStatusBusCells.length === 3 &&
        overviewStatusBusVisibleCells.length === 3 &&
        (overviewStatusBusText.includes('最高风险') || overviewStatusBusText.includes('风险')) &&
        (overviewStatusBusText.includes('数据状态') || overviewStatusBusText.includes('时效')) &&
        (overviewStatusBusText.includes('采集状态') || overviewStatusBusText.includes('采集'))
      ) ||
      (
        overviewStatusBar &&
        overviewStatusBusAcceptedContractOk &&
        overviewStatusBarText.length >= 12 &&
        (noSnapshotEdge || (
          overviewStatusBarRoleOrder.includes('collection') &&
          overviewStatusBarRoleOrder.includes('snapshot')
        ))
      )
    );

    const overviewDesktopCoreTextOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      (
        overviewDesktopTopShell &&
        overviewSummaryMain &&
        (overviewAnomalyEvidence || overviewFocusModule || overviewEvidenceModule) &&
        overviewDesktopPrimary &&
        overviewDesktopTopText &&
        overviewDesktopCriticalTextSamples.length === 0
      ) ||
      (
        overviewStatusBar &&
        overviewDesktopDetail &&
        (overviewAnomalyEvidence || overviewFocusModule || overviewEvidenceModule || overviewNoSnapshotGrid) &&
        /结论|WAN|REST|SSH|数据年龄|业务快照年龄|业务快照|数据可信度|事件更新|最近成功/.test(overviewDesktopTopText) &&
        overviewDesktopCriticalTextSamples.length === 0
      ) ||
      (
        noSnapshotEdge &&
        overviewStatusBar &&
        overviewNoSnapshotCoreModulesVisible &&
        /结论|RouterOS|REST|SSH|最近成功/.test(overviewDesktopTopText) &&
        overviewDesktopCriticalTextSamples.length === 0
      ) ||
      (
        scaleScenario === 'all-offline' &&
        overviewStatusBar &&
        overviewDesktopDetail &&
        overviewVisibleDensityModuleNames.includes('wan-offline-bars') &&
        overviewVisibleDensityModuleNames.includes('wan-route-ledger') &&
        /WAN\\s*全离线|WAN全离线|WAN\\s*0\\/8|WAN0\\/8/.test(overviewDesktopTopText + ' ' + text) &&
        /默认路由/.test(text)
      ) ||
      (
        scaleScenario === 'resource-full' &&
        overviewStatusBar &&
        overviewVisibleDensityModuleNames.includes('resource-risk-priority') &&
        overviewVisibleDensityModuleNames.includes('resource-pressure-bars') &&
        overviewVisibleDensityModuleNames.includes('resource-interface-top5') &&
        /结论|资源满载|CPU|MEM|DISK|业务快照/.test(overviewDesktopTopText) &&
        overviewDesktopCriticalTextSamples.length === 0
      )
    );
    const overviewDesktopTopWithoutNoSnapshotGrid = overviewNoSnapshotGridText
      ? overviewDesktopTopText.replace(overviewNoSnapshotGridText, '')
      : overviewDesktopTopText;
    const overviewDesktopTopConclusionUniqueOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      (
        overviewDesktopTopShell &&
        overviewDesktopPrimary &&
        normalize(overviewDesktopPrimary.textContent || '') &&
        countOccurrences(overviewDesktopTopWithoutNoSnapshotGrid, normalize(overviewDesktopPrimary.textContent || '')) <= 1 &&
        overviewDrilldownVisibleLinks.length <= 4
      ) ||
      (
        overviewSummaryShell &&
        overviewStatusBar &&
        overviewEvidenceModule &&
        overviewStatusBarCells.length >= 6 &&
        countOccurrences(overviewStatusBarText, '结论') <= 1 &&
        overviewDrilldownVisibleLinks.length <= 4
      ) ||
      (
        overviewSummaryShell &&
        overviewStatusBar &&
        overviewStatusBusFixedGrammarOk &&
        overviewStatusBarVisibleCells.length >= 6 &&
        countOccurrences(overviewStatusBarText, '结论') <= 1 &&
        overviewDrilldownVisibleLinks.length <= 4
      )
    );
    const overviewDesktopSamplingStateUniqueOk = sectionName !== 'overview' || !isDesktopOverview || !noSnapshotEdge || Boolean(
      (overviewNoSnapshotGrid || overviewNoSnapshotFlatDetail) &&
      (countOccurrences(overviewNoSnapshotGridText, '最后成功采集') + countOccurrences(overviewNoSnapshotGridText, '最近成功')) >= 1 &&
      (countOccurrences(overviewDesktopTopWithoutNoSnapshotGrid, '最后成功采集') + countOccurrences(overviewDesktopTopWithoutNoSnapshotGrid, '最近成功')) <= 2
    );
    const mobileSamplingStateScopeText = [mobileAlertText, mobileIncidentTitleText].join(' ');
    const overviewMobileSamplingStateUniqueOk = sectionName !== 'overview' || !isMobileOverview || !noSnapshotEdge || Boolean(
      overviewFlatMobileContractOk &&
      countOccurrences(mobileSamplingStateScopeText, '快照状态') <= 1 &&
      countOccurrences(mobileSamplingStateScopeText, '最后成功采集') <= 1
    );
    const mobilePrimaryActionCount = Array.from(mobileFlatStatus?.querySelectorAll('[data-overview-primary-action]') || [])
      .filter(nodeVisibleInFirstScreen)
      .length;
    const overviewMobileActionLinksUniqueOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      overviewFlatMobileContractOk &&
      firstScreenActionRepeats.suggestionPrefix <= 1 &&
      (mobileFlatLinkTexts.length === 0 || firstScreenActionRepeats.actionLabels <= 2) &&
      mobileFlatLinkLabelsOk &&
      !/建议查看|建议：/.test(mobileFlatLinkTexts.join(' '))
    );
    const overviewSuggestionCopyUniqueOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      countOccurrences(overviewFirstScreenCopyText, '建议查看') <= 1 &&
      countOccurrences(overviewFirstScreenCopyText, '建议：') <= 1 &&
      !/建议查看\\s+建议：|建议查看\\s+建议查看|建议：\\s+建议：/.test(overviewFirstScreenCopyText)
    );
    const desktopActionLinkTexts = overviewDrilldownVisibleLinks
      .filter((node) => !node.classList.contains('ik-mobile-flat-link'))
      .map((node) => normalize(node.textContent || ''))
      .filter(Boolean);
    const desktopActionScopeText = desktopActionLinkTexts.join(' ');
    const desktopActionLabels = ['WAN', '采集', '路由', '资源'];
    const overviewDesktopActionLinksUniqueOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      (
        desktopActionLinkTexts.length === 0 ||
        (
          desktopActionLinkTexts.length === 4 &&
          desktopActionLabels.every((label) => desktopActionLinkTexts.filter((text) => text === label).length === 1) &&
          desktopActionLinkTexts.every((label) => desktopActionLabels.includes(label))
        )
      ) &&
      countOccurrences(desktopActionScopeText, '建议查看') <= 0 &&
      countOccurrences(desktopActionScopeText, '建议：') <= 0 &&
      !/建议查看\\s+建议：|建议查看\\s+建议查看|建议：\\s+建议：/.test(desktopActionScopeText)
    );
    const overviewDesktopEvidenceRows = Array.from(overviewAnomalyEvidence?.querySelectorAll('.ik-home-evidence-row:not(.is-head)') || [])
      .filter(nodeVisibleInFirstScreen)
      .map((node) => normalize(node.textContent || ''))
      .filter(Boolean);
    const overviewDesktopEvidenceUniqueOk = sectionName !== 'overview' || !isDesktopOverview || new Set(overviewDesktopEvidenceRows).size === overviewDesktopEvidenceRows.length;
    const combinedOverviewText = [overviewVerdictText, firstScreenOverviewText, mobileTop120Text, topErrorNoticeText].join(' ');
    const staleCopyActive = historyModeActive || /历史快照数据陈旧|当前不是实时数据|数据状态\\s*历史快照|数据陈旧\\s*\\d/.test(combinedOverviewText);
    const staleForbiddenImpact = staleCopyActive && Boolean(
      /当前影响低/.test(combinedOverviewText) ||
      (/影响低|未见线路影响/.test(combinedOverviewText) && !/上次采样.{0,12}(影响低|未见线路影响)/.test(combinedOverviewText))
    );
    const staleHardCopy = !staleCopyActive || /当前影响未知|影响未知：缓存快照|使用缓存快照|以下均为上次采样|不可判定|按降级处理|非实时需复核|需复核后放行|仅供定位|仅代表上次采样/.test(combinedOverviewText);
    const overviewStaleDataImpactOk = sectionName !== 'overview' || (!staleForbiddenImpact && staleHardCopy);
    const overviewHistoryPromptVisibleText = [firstScreenOverviewText, mobileTop120Text].join(' ');
    const overviewHistoryFirstScreenPromptOk = sectionName !== 'overview' || !(historyModeActive || staleCopyActive) || Boolean(
      new RegExp('(\\u5386\\u53f2\\u5feb\\u7167|历史\\\\s*/\\\\s*(?:当前影响未知|使用缓存快照)|当前影响未知|影响未知：缓存快照|使用缓存快照)').test(overviewHistoryPromptVisibleText) &&
      /(\u6570\u636e\u9648\u65e7|\u5f53\u524d\u4e0d\u662f\u5b9e\u65f6\u6570\u636e|\u672a\u5237\u65b0|\u4e0a\u6b21\u91c7\u6837|\u4ec5\u4ee3\u8868\u4e0a\u6b21\u91c7\u6837|业务快照年龄|事件更新时间|当前影响未知|影响未知：缓存快照|使用缓存快照)/.test(overviewHistoryPromptVisibleText)
    );
    const overviewFreshnessFreshSampleOk = sectionName !== 'overview' || Boolean(
      !/数据新鲜|当前数据新鲜/.test(firstScreenOverviewText) &&
      (!/新鲜/.test(firstScreenOverviewText) || /采样新鲜/.test(firstScreenOverviewText))
    );
    const noSnapshotStateText = (
      isMobileOverview
        ? [
          mobileTop120Text,
          mobileAlertText,
          mobileFlatStatusText,
          mobileIncidentTitleText,
          normalize(mobileLeadPreview?.textContent || ''),
        ]
        : [
          overviewDesktopTopText,
          overviewDesktopDetailText,
          normalize(overviewSummaryMain?.textContent || ''),
          normalize(overviewNoSnapshotGrid?.textContent || ''),
          overviewNoSnapshotDowngradeText,
        ]
    ).join(' ');
    const overviewNoSnapshotFreshnessForbiddenOk = sectionName !== 'overview' || !noSnapshotEdge || Boolean(
      !noSnapshotFreshCopyPattern.test(noSnapshotStateText)
    );
    const overviewNoSnapshotSamplingStateUniqueOk = sectionName !== 'overview' || !noSnapshotEdge || Boolean(
      countOccurrences(overviewDesktopDetailText, '快照状态') <= 1 &&
      (countOccurrences(overviewNoSnapshotGridText, '最后成功采集') + countOccurrences(overviewNoSnapshotGridText, '最近成功')) >= 1 &&
      (countOccurrences(overviewDesktopTopText.replace(overviewNoSnapshotGridText, ''), '最后成功采集') + countOccurrences(overviewDesktopTopText.replace(overviewNoSnapshotGridText, ''), '最近成功')) <= 2 &&
      countOccurrences(mobileSamplingStateScopeText, '快照状态') <= 1 &&
      countOccurrences(mobileSamplingStateScopeText, '最后成功采集') <= 1
    );
    const overviewNoSnapshotDesktopEvidenceTripletOk = sectionName !== 'overview' || !isDesktopOverview || !noSnapshotEdge || Boolean(
      (overviewNoSnapshotGrid || overviewDesktopDetail) &&
      (overviewNoSnapshotEvidenceTableRows.length >= 4 || overviewNoSnapshotGridItems.length >= 6 || overviewDesktopDetailRows.length >= 6) &&
      overviewNoSnapshotEvidenceLayoutOk &&
      countOccurrences(noSnapshotStateText, 'REST') >= 1 &&
      countOccurrences(noSnapshotStateText, 'SSH') >= 1 &&
      (countOccurrences(noSnapshotStateText, '最后成功采集') + countOccurrences(noSnapshotStateText, '最近成功')) >= 1 &&
      /业务数字状态|业务数据状态|业务快照|数据可信度/.test(noSnapshotStateText) &&
      /业务快照(?:时间|年龄)?\\s*(?:无|业务数据不展示)|无业务快照|业务数据不展示|业务状态不可参考/.test(noSnapshotStateText)
    );
    const overviewDefaultRouteLedgerText = normalize(sectionRoot?.querySelector('[data-overview-density-module="wan-route-ledger"]')?.textContent || '');
    const defaultRouteSnapshotText = [firstScreenOverviewText, mobileTop120Text, overviewDesktopDetailText, overviewDefaultRouteLedgerText].join(' ');
    const overviewDefaultRouteRawFactsVisible = Boolean(
      /table/.test(defaultRouteSnapshotText) &&
      /gateway/.test(defaultRouteSnapshotText) &&
      /distance/.test(defaultRouteSnapshotText) &&
      /active/.test(defaultRouteSnapshotText) &&
      /disabled/.test(defaultRouteSnapshotText)
    );
    const overviewDefaultRouteLocalizedFactsVisible = Boolean(
      /路由表/.test(defaultRouteSnapshotText) &&
      /网关/.test(defaultRouteSnapshotText) &&
      /优先级/.test(defaultRouteSnapshotText) &&
      /活动路由|非活动路由|已启用|未启用/.test(defaultRouteSnapshotText) &&
      /已禁用|未禁用/.test(defaultRouteSnapshotText)
    );
    const overviewDefaultRouteRawFactsOk = sectionName !== 'overview' || !isDesktopOverview || noSnapshotEdge || Boolean(
      overviewDefaultRouteRawFactsVisible ||
      overviewDefaultRouteLocalizedFactsVisible ||
      (scaleScenario === 'collection-down' && overviewVisibleDensityModuleNames.includes('collection-route-wan-boundary'))
    );
    const overviewDefaultRouteSnapshotSemanticsOk = sectionName !== 'overview' || !(historyModeActive || staleCopyActive) || !/\u9ed8\u8ba4\u8def\u7531/.test(defaultRouteSnapshotText) || Boolean(
      /(\u5386\u53f2\u5feb\u7167|\u4e0a\u6b21\u91c7\u6837|\u4ec5\u4ee3\u8868\u4e0a\u6b21\u91c7\u6837|\u672a\u5237\u65b0)/.test(defaultRouteSnapshotText)
    );
    const noSnapshotBusinessClockOk = (
      noSnapshotStateText.includes('业务快照时间 无') &&
      noSnapshotStateText.includes('业务快照年龄 不可判定')
    ) || /业务快照(?:时间|年龄)?\\s*(?:业务数据不展示|无)|无业务快照，业务数据不展示|业务数据不展示|业务状态不可参考|业务快照\\s*未取得|缺少业务快照/.test(noSnapshotStateText);
    const noSnapshotMobileCompactClockOk = isMobileOverview &&
      /业务数据不展示|无业务快照|业务快照\\s*无|业务状态不可参考/.test(noSnapshotStateText);
    const noSnapshotSemanticText = [noSnapshotStateText, combinedOverviewText].join(' ');
    const overviewNoSnapshotFailureEndpointUnrecordedOk = sectionName !== 'overview' || !noSnapshotEdge ||
      !/失败端点\\s*0\\b|失败计数\\s*0\\b/.test(noSnapshotSemanticText);
    const overviewNoSnapshotSemanticOk = sectionName !== 'overview' || !noSnapshotEdge || Boolean(
      /无可用快照|业务快照缺失|快照缺失/.test(noSnapshotSemanticText) &&
      /RouterOS[\\s\\S]{0,40}(?:当前不可达|不可达|断链)/.test(noSnapshotSemanticText) &&
      /业务快照\\s*未取得|缺少业务快照|业务数据不展示|不展示不可验证数值/.test(noSnapshotSemanticText) &&
      /状态更新|事件更新时间|采集状态更新时间|状态更新时间|状态\\s*\\d+s/.test(noSnapshotSemanticText) &&
      (noSnapshotBusinessClockOk || noSnapshotMobileCompactClockOk) &&
      !noSnapshotFreshCopyPattern.test(noSnapshotSemanticText) &&
      overviewNoSnapshotFirstScreenRateForbiddenOk &&
      overviewNoSnapshotFailureEndpointUnrecordedOk
    );
    const overviewNoSnapshotTrustedMetricFragments = [
      overviewVerdictText,
      overviewSummaryBoxText,
      overviewDesktopDetailText,
      normalize(overviewNoSnapshotGrid?.textContent || ''),
      mobileTop120Text,
      mobileAlertText,
      mobileIncidentTitleText,
    ].filter(Boolean);
    const overviewNoSnapshotTrustedMetricPatterns = [
      new RegExp('(?:CPU|MEM|内存|DISK|磁盘)\\\\s*[:：]?\\\\s*\\\\d+(?:\\\\.\\\\d+)?%?', 'i'),
      new RegExp('WAN(?:线路| 线路| 状态)?\\\\s*[:：]?\\\\s*\\\\d+\\\\s*/\\\\s*\\\\d+', 'i'),
      new RegExp('WAN(?:线路| 线路| 状态)?\\\\s*[:：]?\\\\s*\\\\d+(?:\\\\.\\\\d+)?%?', 'i'),
      new RegExp('(?:在线数|连接数|终端数|在线终端|连接|路由数|线路数|默认路由数|活动线路数|业务数字|业务数据)\\\\s*[:：]?\\\\s*\\\\d+', 'i'),
    ];
    const overviewNoSnapshotTrustedMetricsForbiddenOk = sectionName !== 'overview' || !noSnapshotEdge || Boolean(
      overviewNoSnapshotTrustedMetricFragments.every((fragment) => {
        return !overviewNoSnapshotTrustedMetricPatterns.some((pattern) => pattern.test(fragment));
      })
    );
    const overviewNoSnapshotSemanticChecks = {
      hasNoSnapshot: /无可用快照|快照缺失/.test(noSnapshotSemanticText),
      hasRouterDown: /RouterOS(?:\\s+(?:可达性|状态))?\\s*当前不可达/.test(noSnapshotSemanticText),
      hasBusinessUnknown: /无业务快照，业务数据不展示|业务数据不展示|业务状态不可信/.test(noSnapshotSemanticText),
      hasTrustedBusinessNumber: overviewNoSnapshotTrustedMetricFragments.some((fragment) => overviewNoSnapshotTrustedMetricPatterns.some((pattern) => pattern.test(fragment))),
      hasMissingLabel: /快照缺失/.test(noSnapshotSemanticText),
      hasStatusUpdateAge: /事件更新时间|采集状态更新时间|状态更新时间|状态\\s*(?:\\d+s|不可判定)|数据可信度/.test(noSnapshotSemanticText),
      hasBusinessSnapshotTimeNone: /业务快照时间 无|业务快照\\s*(?:业务数据不展示|无)|无业务快照，业务数据不展示/.test(noSnapshotSemanticText),
      hasBusinessSnapshotAgeUnknown: /业务快照年龄 不可判定|业务快照\\s*业务数据不展示|无业务快照，业务数据不展示|业务状态不可参考/.test(noSnapshotSemanticText),
      hasForbiddenFreshCopy: noSnapshotFreshCopyPattern.test(noSnapshotSemanticText),
    };
    const overviewNoSnapshotFiveModuleRowCounts = overviewNoSnapshotCoreModuleNodes.map((node) => ({
      module: node.getAttribute('data-overview-density-module') || '',
      rows: node.querySelectorAll('tbody tr, [data-overview-field], .freshness-item').length,
      textLength: normalize(node.textContent || '').length,
    }));
    const overviewNoSnapshotFiveBlocksOk = sectionName !== 'overview' || !noSnapshotEdge || !isDesktopOverview || Boolean(
      overviewNoSnapshotModuleCountOk &&
      overviewNoSnapshotFiveModuleRowCounts.length === 3 &&
      overviewNoSnapshotFiveModuleRowCounts.every((item) => item.rows >= 3 && item.textLength >= 32) &&
      overviewNoSnapshotRequiredModuleNames.every((name, index) => overviewNoSnapshotVisibleModuleNames[index] === name) &&
      !overviewNoSnapshotForbiddenVisibleModules.length &&
      /RouterOS/.test(overviewNoSnapshotCoreModuleText) &&
      /REST/.test(overviewNoSnapshotCoreModuleText) &&
      /SSH/.test(overviewNoSnapshotCoreModuleText) &&
      /WAN/.test(overviewNoSnapshotCoreModuleText) &&
      /只读/.test(overviewNoSnapshotCoreModuleText)
    );
    const overviewNoSnapshotGridOk = sectionName !== 'overview' || !noSnapshotEdge || !isDesktopOverview || Boolean(
      (overviewNoSnapshotGrid || overviewDesktopDetail) &&
      overviewNoSnapshotEvidenceLayoutOk &&
      (overviewNoSnapshotEvidenceTableRows.length >= 4 || overviewNoSnapshotGridItems.length >= 6 || overviewDesktopDetailRows.length >= 6) &&
      /当前失败对照|快照缺失/.test(noSnapshotStateText) &&
      /RouterOS/.test(noSnapshotStateText) &&
      /REST(?: 状态| 通道状态| 待确认| 不可达| 不可用)?/.test(noSnapshotStateText) &&
      /SSH(?: 状态| 通道状态| 待确认| 不可达| 缺依赖| 不可用)?/.test(noSnapshotStateText) &&
      /最后成功采集|最近成功/.test(noSnapshotStateText) &&
      /失败端点/.test(noSnapshotStateText) &&
      /业务快照(?:时间|年龄)?\\s*(?:无|不可判定|业务数据不展示)|业务数据不展示|业务状态不可信|业务状态不可参考/.test(noSnapshotStateText) &&
      /业务数据状态|业务快照|业务数据不展示|业务状态不可信|业务状态不可参考/.test(noSnapshotStateText) &&
      /下次尝试|轮询/.test(noSnapshotStateText) &&
      overviewNoSnapshotFiveBlocksOk &&
      overviewNoSnapshotNoWanRateCardOk &&
      overviewNoSnapshotNoDuplicateBoundaryOk &&
      overviewNoSnapshotFailureEndpointLedgerOk &&
      overviewNoSnapshotLedgerStructureOk &&
      overviewNoSnapshotTopbarOk &&
      overviewNoSnapshotEffectiveFactCountOk &&
      overviewNoSnapshotDowngradeReasonsOk &&
      overviewNoSnapshotRepetitionBudgetOk &&
      overviewNoSnapshotFakeDensityOk &&
      overviewNoSnapshotOpsLedgerCopyOk &&
      !/采集断链证据/.test(combinedOverviewText)
    );
    const overviewMobileDispositionOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      overviewFlatMobileContractOk &&
      !/\u5904\u7f6e\uff1a/.test(mobileIncidentTitleText) &&
      (
        (mobileCoreBlockContractOk && mobileCoreChartMetaOk && /WAN/.test(mobileCoreEvidenceText) && /采集/.test(mobileCoreEvidenceText) && /资源/.test(mobileCoreEvidenceText)) ||
        (/^(WAN|路由|设备|资源|采集|快照)? ?证据|证据行/.test(mobileIncidentTitleLeadText) && mobileIncidentTitleSupportText) ||
        (/证据/.test(mobileFlatEvidenceRowText) && (/离线对象|默认路由|CPU|MEM|DISK|业务数据|快照|资源|采集/.test(mobileFlatEvidenceRowText) || hasRestSshPair(mobileFlatEvidenceRowText)))
      ) &&
      !mobileIncidentTitleSupportText.startsWith('\u5904\u7f6e\uff1a') &&
      /(\u79bb\u7ebf\u5bf9\u8c61|\u9ed8\u8ba4\u8def\u7531|RouterOS|CPU|MEM|DISK|内存|磁盘|REST|SSH|最近成功|无成功快照|无可用快照|快照缺失|业务数据|业务快照|事件更新时间|采集状态更新时间|采样|采集层证据|连接|main|WAN|采集|资源)/.test(mobileIncidentTitleSupportText + ' ' + mobileFlatEvidenceRowText + ' ' + mobileCoreEvidenceText) &&
      !/\u5efa\u8bae\u67e5\u770b|\u5efa\u8bae\uff1a/.test(normalize(mobileIncident?.textContent || '')) &&
      mobileFlatLinkLabelsOk
    );
    const overviewMobileEvidenceUniqueOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      overviewFlatMobileContractOk &&
      mobileIncidentEvidenceRows.length >= 2 &&
      new Set(mobileIncidentEvidenceRows).size === mobileIncidentEvidenceRows.length
    );
    const overviewHistoryStrongReasonOk = /(以下均为上次采样|仅代表上次采样|业务数字仅代表上次采样|仅供复核|业务快照年龄|历史快照，当前影响未知|默认路由快照摘要：当前影响未知|WAN 曾离线)/.test(combinedOverviewText) ||
      combinedOverviewText.includes('历史快照 / 使用缓存快照') ||
      combinedOverviewText.includes('默认路由快照摘要：使用缓存快照');
    const overviewHistoryStrongPromptOk = sectionName !== 'overview' || !(historyModeActive || staleCopyActive) || Boolean(
      /当前影响未知|影响未知：缓存快照|使用缓存快照|当前不可判定|非实时需复核|历史快照|采样陈旧/.test(combinedOverviewText) &&
      overviewHistoryStrongReasonOk
    );
    const wanOfflineCountPhraseMatches = combinedOverviewText.match(/WAN 离线\\s*[1-9]\\d*\\s*条/g) || [];
    const mobileWanEvidenceRows = Array.from(mobileWanTable?.querySelectorAll('[data-overview-mobile-wan-row]') || []);
    const overviewEvidenceLayeringOk = sectionName !== 'overview' || Boolean(
      !/处置：/.test(combinedOverviewText) &&
      !/WAN 证据(?:链)?\\s*WAN 离线\\s*[1-9]\\d*\\s*条/.test(combinedOverviewText) &&
      wanOfflineCountPhraseMatches.length <= 1 &&
      (!mobileWanTable || !isMobileOverview || Boolean(
        mobileWanTableRect &&
        mobileWanTableRect.width > 0 &&
        mobileWanTableRect.height > 0 &&
        /WAN\\s*(?:线路)?\\s*(?:线路|离线表|证据|状态对象|状态|明细)/.test(normalize(mobileWanTable.textContent || '') + ' WAN线路') &&
        /状态/.test(normalize(mobileWanTable.textContent || '')) &&
        (/速率/.test(normalize(mobileWanTable.textContent || '')) || normalize(mobileWanTable.textContent || '').includes('B/s')) &&
        (/父(?:接口)?/.test(normalize(mobileWanTable.textContent || '')) || Boolean(mobileWanTable.querySelector('small'))) &&
        (/默认(?:路由)?/.test(normalize(mobileWanTable.textContent || '')) || new RegExp('未承载|d\\\\d+|网关').test(normalize(mobileWanTable.textContent || ''))) &&
        mobileWanEvidenceRows.length >= 1 &&
        mobileWanEvidenceRows.every((row) => {
          const rowText = normalize(row.textContent || '');
          return Boolean(
            (
              row.querySelector('.ik-mobile-wan-main') &&
              row.querySelector('.ik-mobile-wan-sub') &&
              /父接口/.test(rowText) &&
              /默认路由/.test(rowText) &&
              /采样/.test(rowText)
            ) ||
            (
              row.classList.contains('is-flat-wan-row') &&
              row.children.length >= 3 &&
              /离线|在线|历史/.test(rowText) &&
              (
                /未承载|d\\d+|默认|网关|B\\/s/.test(rowText) ||
                row.querySelector('small')
              )
            )
          );
        })
      ))
    );
    const overviewWanListPriorityOk = sectionName !== 'overview' || scaleScenario !== 'all-offline' || Boolean(
      isMobileOverview
        ? (
          (
            mobileWanTable &&
            mobileWanEvidenceRows.length >= Math.min(3, Math.max(1, evidenceWanRows.length)) &&
            mobileWanEvidenceRows.slice(0, 3).every(nodeVisibleInFirstScreen)
          ) ||
          (
            mobileFlatEvidenceOk &&
            /离线对象/.test(mobileFlatEvidenceRowText) &&
            /默认路由/.test(mobileFlatEvidenceRowText) &&
            visibleAnomalyNames.length >= Math.min(3, Math.max(1, expectedOfflineNames.length))
          )
        )
        : (
          overviewDesktopDetail &&
          (
            overviewDesktopDetail.querySelector('[data-overview-anomaly-evidence]') ||
            sectionRoot?.querySelector('[data-overview-anomaly-evidence]') ||
            overviewDesktopDetail.querySelector('[data-overview-evidence-grid], [data-overview-evidence-matrix]') ||
            /离线对象|离线数量|未发现活动默认路由|接口转发面|down 数|涉及接口/.test(overviewDesktopTopText + ' ' + overviewDesktopDetailText)
          ) &&
          (
            overviewDesktopDetail.querySelector('[data-overview-wan-mini-table]') ||
            sectionRoot?.querySelector('[data-overview-wan-mini-table]') ||
            overviewWanDetailRows.length >= Math.min(3, Math.max(1, evidenceWanRows.length)) ||
            new RegExp('WAN\\\\s*0\\\\s*/\\\\s*\\\\d+|WAN线路\\\\s*0\\\\s*/\\\\s*\\\\d+|PPPoE 离线|DHCP 离线|VLAN 离线|Static 离线').test(overviewDesktopTopText + ' ' + overviewDesktopDetailText)
          )
        )
    );
    const overviewRouteSnapshotCopyOk = sectionName !== 'overview' || Boolean(
      noSnapshotEdge
        ? /默认路由(?:：默认路由)?\\s*不可判定|默认路由影响\\s*不可判定|默认路由影响待判定|未采集到路由表快照|RouterOS(?:\\s+可达性)?\\s*当前不可达|业务数据不展示|无业务快照|路由快照缺失/.test(combinedOverviewText)
        : (
          (
            /默认路由快照摘要|路由表快照|路由快照摘要|未发现活动默认路由|默认路由不可判定|默认路由影响不可判定|默认路由正常|历史快照|活动默认路由|当前影响未知/.test(combinedOverviewText) ||
            /默认路由\\s*(?:不可判定|当前影响未知)|默认路由影响\\s*(?:不可判定|待判定)/.test(defaultRouteSnapshotText) ||
            combinedOverviewText.includes('默认路由 正常') ||
            (overviewDefaultRouteRawFactsVisible || (scaleScenario === 'collection-down' && overviewVisibleDensityModuleNames.includes('collection-route-wan-boundary')))
          ) &&
          (
            !isDesktopOverview ||
            overviewDefaultRouteRows.length > 0 ||
            overviewWanDetailRows.length > 0 ||
            overviewDefaultRouteRawFactsVisible ||
            /未采集到路由表快照|未发现活动默认路由|默认路由不可判定|默认路由影响不可判定|历史快照|活动默认路由|当前影响未知|路由表网关距状态/.test(defaultRouteSnapshotText) ||
            defaultRouteSnapshotText.includes('默认路由 正常')
          )
        )
    );
    const totalWanCount = evidenceWanRows.length;
    const offlineWanCount = evidenceWanRows.filter((row) => row && row.running === false).length;
    const overviewAllWanOfflineSummaryOk = sectionName !== 'overview' || scaleScenario !== 'all-offline' || Boolean(
      totalWanCount > 0 &&
      offlineWanCount === totalWanCount &&
      new RegExp('WAN\\\\s*(?:线路)?\\\\s*全离线|WAN\\\\s*(?:线路)?\\\\s*全部离线|全部 WAN 离线|WAN 离线').test(combinedOverviewText) &&
      (
        combinedOverviewText.includes('WAN 0/' + String(totalWanCount)) ||
        combinedOverviewText.includes('WAN0/' + String(totalWanCount)) ||
        new RegExp('WAN\\\\s*0\\\\s*/\\\\s*' + String(totalWanCount)).test(combinedOverviewText) ||
        (firstScreenOverviewText + ' ' + overviewDesktopTopText).includes('0/' + String(totalWanCount))
      ) &&
      /默认路由不可用|未发现活动默认路由|默认路由异常/.test(combinedOverviewText) &&
      !/当前影响低/.test(combinedOverviewText) &&
      !((/影响低|未见线路影响/.test(combinedOverviewText)) && !/上次采样.{0,12}(影响低|未见线路影响)/.test(combinedOverviewText))
    );
    const activeDefaultRouteCount = Array.isArray(snapshotForEvidence.routes?.defaultRoutes)
      ? snapshotForEvidence.routes.defaultRoutes.filter((route) => route && route.active !== false && route.disabled !== true).length
      : 0;
    const overviewAllOfflineSceneEvidenceOk = sectionName !== 'overview' || scaleScenario !== 'all-offline' || Boolean(
      totalWanCount > 0 &&
      offlineWanCount === totalWanCount &&
      activeDefaultRouteCount === 0 &&
      (overviewFirstEvidenceCategory === 'wan' || expectedRiskEvidenceCategory === 'wan' || /WAN.*(?:全离线|全部离线|离线)/.test(combinedOverviewText + ' ' + overviewDesktopDetailText)) &&
      /WAN/.test(combinedOverviewText + ' ' + overviewDesktopDetailText) &&
      /全离线|全部离线|离线对象|离线数量/.test(combinedOverviewText + ' ' + overviewDesktopDetailText) &&
      /默认路由|活动默认路由/.test(combinedOverviewText + ' ' + overviewDesktopDetailText) &&
      (
        visibleAnomalyNames.length >= Math.min(3, totalWanCount) ||
        overviewWanDetailRows.length >= Math.min(3, totalWanCount) ||
        mobileWanEvidenceRows.length >= Math.min(3, totalWanCount)
      )
    );
    const overviewAllOfflineFocus = sectionRoot?.querySelector('[data-overview-wan-offline-focus="summary-top-objects-details-deferred"]');
    const overviewAllOfflineWanBlockNodes = Array.from((overviewAllOfflineFocus || sectionRoot)?.querySelectorAll(overviewAllOfflineFocus
      ? '[data-overview-wan-detail-row]'
      : [
        '[data-overview-density-module="wan-offline-bars"] [data-overview-wan-detail-row]',
        '[data-overview-density-module="wan-offline-bars"] .ik-overview-wan-bar',
        '[data-overview-density-module="wan-offline-bars"] .ik-overview-wan-node'
      ].join(',')) || []).filter(nodeVisibleInFirstScreen);
    const overviewAllOfflinePriorityObjectsOk = sectionName !== 'overview' || scaleScenario !== 'all-offline' || !isDesktopOverview || Boolean(
      totalWanCount > 0 &&
      overviewAllOfflineWanBlockNodes.length >= Math.min(4, totalWanCount) &&
      overviewAllOfflineWanBlockNodes.length <= 4
    );
    const fleetWanActualCount = Number(scaleMeta.wan?.actualCount || snapshotForEvidence.meta?.wanCount || evidenceWanRows.length || 0);
    const fleetTerminalActualCount = Number(scaleMeta.terminals?.actualCount || snapshotForEvidence.meta?.terminalCount || snapshotForEvidence.terminals?.length || 0);
    const fleetOfflineNames = evidenceWanRows
      .filter((row) => row && row.running === false)
      .slice(0, 3)
      .map((row) => String(row.name || row.interface || '').trim())
      .filter(Boolean);
    const fleetSceneText = [
      firstScreenOverviewText,
      mobileTop120Text,
      overviewDesktopTopText,
      overviewDesktopDetailText,
      overviewVisibleDensityModuleText,
      visibleAnomalyNames.join(' '),
    ].join(' ');
    const overviewAllOfflinePriorityOrderOk = sectionName !== 'overview' || scaleScenario !== 'all-offline' || !isDesktopOverview || Boolean(
      (overviewVisibleDensityModuleNames.includes('wan-offline-bars') || overviewVisibleDensityModuleNames.includes('wan-offline-continuity')) &&
      (overviewVisibleDensityModuleNames.includes('wan-route-ledger') || overviewVisibleDensityModuleNames.includes('wan-incident-ledger') || overviewDensityModuleNames.includes('wan-route-ledger')) &&
      (overviewVisibleDensityModuleNames.includes('collection-status') || overviewVisibleDensityModuleNames.includes('freshness')) &&
      !overviewVisibleDensityModuleNames.includes('rank') &&
      !overviewVisibleDensityModuleNames.includes('resource-threshold') &&
      overviewAllOfflinePriorityObjectsOk &&
      /速率[：:]无有效样本|速率无有效样本/.test(fleetSceneText + ' ' + overviewDesktopDetailText)
    );
    const fleetOfflineEvidenceCount = fleetOfflineNames.filter((name) => fleetSceneText.includes(name)).length;
    const overviewFleetSceneEvidenceOk = sectionName !== 'overview' || scaleScenario !== 'fleet' || Boolean(
      fleetWanActualCount >= 32 &&
      fleetTerminalActualCount >= 100 &&
      /WAN/.test(fleetSceneText) &&
      /默认路由|路由/.test(fleetSceneText) &&
      /历史|缓存|留存|当前影响未知|快照/.test(fleetSceneText) &&
      /采集|REST|SSH/.test(fleetSceneText) &&
      (
        fleetOfflineEvidenceCount >= Math.min(2, fleetOfflineNames.length) ||
        visibleAnomalyNames.length >= Math.min(2, fleetOfflineNames.length || 2) ||
        overviewWanDetailRows.length >= Math.min(2, fleetOfflineNames.length || 2)
      )
    );
    const overviewFleetVisibleCellCount = (sectionName === 'overview' && scaleScenario === 'fleet' && isDesktopOverview)
      ? Array.from(sectionRoot?.querySelectorAll([
        'tbody td',
        'tbody th',
        'thead th',
        '.ik-overview-subtable-title',
        '.ik-home-flat-cell span',
        '.ik-home-flat-cell b'
      ].join(',')) || []).filter(nodeVisibleInFirstScreen).length
      : 0;
    const overviewFleetEffectiveFactCount = Math.max(overviewVisibleFactCount, overviewFirstScreenFieldCount, overviewFleetVisibleCellCount);
    const overviewFleetDesktopFactDensityOk = sectionName !== 'overview' || scaleScenario !== 'fleet' || !isDesktopOverview || Boolean(
      overviewFleetEffectiveFactCount >= 64 &&
      /WAN账本/.test(fleetSceneText) &&
      /类型分布/.test(fleetSceneText) &&
      /默认路由条目/.test(fleetSceneText) &&
      /接口排行/.test(fleetSceneText) &&
      /异常TopN/.test(fleetSceneText) &&
      /采集可信度/.test(fleetSceneText)
    );
    const overviewCurrentFleetContentOk = Boolean(
      scaleScenario === 'fleet' &&
      overviewFleetSceneEvidenceOk &&
      fleetWanActualCount >= 64 &&
      fleetTerminalActualCount >= 180 &&
      overviewVisibleDensityModuleNames.includes('wan-trend') &&
      overviewVisibleDensityModuleNames.includes('normal-wan-evidence') &&
      overviewVisibleDensityModuleNames.includes('terminal-ranking') &&
      /WAN/.test(fleetSceneText) &&
      fleetSceneText.includes('61/64') &&
      expectedOfflineNames.length >= 3 &&
      expectedOfflineNames.every((name) => fleetSceneText.includes(name))
    );
    const overviewAllOfflineFleetContentOk = sectionName !== 'overview' || !['all-offline', 'fleet'].includes(scaleScenario) || overviewCurrentFleetContentOk || Boolean(
      scaleScenario === 'all-offline'
        ? (
          overviewAllOfflineSceneEvidenceOk &&
          overviewAllOfflinePriorityOrderOk &&
          totalWanCount >= 8 &&
          offlineWanCount === totalWanCount &&
          activeDefaultRouteCount === 0 &&
          /WAN/.test(fleetSceneText) &&
          /0\\s*\\/\\s*8|8/.test(fleetSceneText)
        )
        : (
          overviewFleetSceneEvidenceOk &&
          overviewFleetDesktopFactDensityOk &&
          fleetWanActualCount >= 64 &&
          fleetTerminalActualCount >= 180 &&
          /WAN/.test(fleetSceneText) &&
          /64|fleet/i.test(fleetSceneText) &&
          /180|terminal|client/i.test(fleetSceneText)
        )
    );
    const overviewHistoryTitleText = isMobileOverview
      ? (mobileAlertPrimaryText || mobileIncidentTitleText)
      : (overviewDesktopPrimaryText || normalize(overviewMainVerdict?.textContent || ''));
    const overviewHistoryTitleScopeText = [
      overviewHistoryTitleText,
      mobileFlatStatusRowText,
      overviewStatusBarText,
      overviewDesktopTopText,
      overviewDesktopDetailText,
    ].join(' ');
    const overviewHistoryTitlePrefixOk = sectionName !== 'overview' || !(historyModeActive || staleCopyActive) || Boolean(
      /^(历史快照|历史|数据陈旧|业务快照年龄)(?:\\s|[,，:：\\/]|$)/.test(overviewHistoryTitleText) ||
      /^结论\\s*(?:历史快照|历史|数据陈旧|业务快照年龄)/.test(overviewHistoryTitleText) ||
      new RegExp('历史\\\\s*/\\\\s*当前影响未知').test(overviewHistoryTitleScopeText) ||
      /历史快照|当前影响未知|业务快照年龄/.test(overviewHistoryTitleScopeText)
    );
    const defaultRouteSemanticText = (
      [defaultRouteSnapshotText, overviewSummaryBoxText].join(' ').match(/(?:默认路由|路由快照).{0,64}/g) || []
    ).join(' ');
    const overviewNoSnapshotBusinessFirstRouteUndeterminedOk = Boolean(
      noSnapshotEdge &&
      /默认路由(?:影响)?\\s*待判/.test(defaultRouteSnapshotText + ' ' + combinedOverviewText) &&
      /路由快照未取回|无业务快照/.test(defaultRouteSnapshotText + ' ' + combinedOverviewText) &&
      !/默认路由(?!影响).{0,24}(?:正常|活动默认路由|活动(?!会话)|已生效|生效)/i.test(defaultRouteSemanticText)
    );
    const overviewDefaultRouteSemanticUndeterminedOk = sectionName !== 'overview' || !(historyModeActive || staleCopyActive || noSnapshotEdge) || Boolean(
      overviewNoSnapshotBusinessFirstRouteUndeterminedOk || (
      noSnapshotEdge
        ? (
          /默认路由(?:：默认路由)?\\s*(?:不可判定|待判定)|路由快照缺失|缺少当前路由快照，无法判断默认路由影响/.test(defaultRouteSnapshotText + ' ' + combinedOverviewText) &&
          !/默认路由(?!影响).{0,24}(?:正常|活动默认路由|活动(?!会话)|已生效|生效)/i.test(defaultRouteSemanticText)
        )
        : (
          !/默认路由/.test(defaultRouteSemanticText) ||
          (
            /(?:历史快照|数据陈旧|业务快照年龄|待复核|不可判定|仅供定位|未采集到路由表快照|默认路由快照摘要|缺少当前路由快照)/.test(defaultRouteSemanticText) &&
            !/(?:默认路由(?!影响)|路由快照)(?!快照摘要：当前影响未知|缺少当前路由快照，无法判断默认路由影响).{0,24}(?:正常|活动默认路由|活动(?!会话)|已生效|生效)/i.test(defaultRouteSemanticText)
          )
        )
      )
    );
    const collectionLayerEvidenceText = [combinedOverviewText, overviewDesktopDetailText].join(' ');
    const overviewCollectionLayerChecks = {
      channel: /通道状态/.test(collectionLayerEvidenceText),
      dataLayer: /数据层状态/.test(collectionLayerEvidenceText),
      failureEndpoint: /未记录(?:端点失败|失败端点)|失败端点\\s*未记录|失败端点未记录|未记录.*失败端点/.test(collectionLayerEvidenceText),
      sshState: /SSH\\s*(?:通道)?(?:缺依赖|不可达|不可用)|SSH\\s*采集不可用|SSH\\s*不可用/.test(collectionLayerEvidenceText),
      restState: /REST\\s*待确认|REST/.test(collectionLayerEvidenceText),
      noNormalContradiction: !/采集表全正常|当前无采集端点失败|REST 可用|SSH 可用/.test(combinedOverviewText)
    };
    const overviewCollectionLayerSplitOk = sectionName !== 'overview' || scaleScenario !== 'collection-down' || Boolean(
      overviewCollectionLayerChecks.channel &&
      overviewCollectionLayerChecks.dataLayer &&
      overviewCollectionLayerChecks.failureEndpoint &&
      overviewCollectionLayerChecks.sshState &&
      overviewCollectionLayerChecks.restState &&
      overviewCollectionLayerChecks.noNormalContradiction
    );
    const overviewCurrentCollectionTimelineOk = Boolean(
      /采集降级|采集可信度下降/.test(collectionLayerEvidenceText) &&
      /缓存快照|快照面.*缓存/.test(collectionLayerEvidenceText) &&
      /最近成功/.test(collectionLayerEvidenceText) &&
      /REST/.test(collectionLayerEvidenceText) &&
      /SSH/.test(collectionLayerEvidenceText) &&
      (!isDesktopOverview || (
        overviewDesktopCollectionLedger &&
        nodeVisibleInFirstScreen(overviewDesktopCollectionLedger) &&
        overviewVisibleDensityModuleNames.includes('collection-channel-ledger') &&
        overviewVisibleDensityModuleNames.includes('collection-recent-failures') &&
        overviewVisibleDensityModuleNames.includes('collection-cache-boundary') &&
        overviewDesktopFirstDetailModuleName === 'collection-channel-ledger' &&
        !overviewVisibleDensityModuleNames.includes('rank') &&
        (!rankGrid || !nodeVisibleInFirstScreen(rankGrid))
      ))
    );
    const overviewCollectionTimelinePriorityOk = sectionName !== 'overview' || scaleScenario !== 'collection-down' || overviewCurrentCollectionTimelineOk || Boolean(
      /采集通道/.test(collectionLayerEvidenceText) &&
      /缓存快照|缓存可参考/.test(collectionLayerEvidenceText) &&
      /最近成功|上次成功/.test(collectionLayerEvidenceText) &&
      /REST/.test(collectionLayerEvidenceText) &&
      /SSH/.test(collectionLayerEvidenceText) &&
      (
        !isDesktopOverview ||
        (
          overviewDesktopCollectionLedger &&
          nodeVisibleInFirstScreen(overviewDesktopCollectionLedger) &&
          ['collection-focus', 'freshness', 'collection-cache-ledger', 'collection-cache-boundary', 'collection-channel-ledger'].includes(overviewDesktopFirstDetailModuleName) &&
          !overviewVisibleDensityModuleNames.includes('rank') &&
          (!rankGrid || !nodeVisibleInFirstScreen(rankGrid))
        )
      )
    );
    const overviewInterfacesChannelConsistencyOk = sectionName !== 'overview' || scaleScenario !== 'interfaces-down' || Boolean(
      restSshPairPattern.test(combinedOverviewText) &&
      /REST 不可达/.test(combinedOverviewText) &&
      /SSH 不可达/.test(combinedOverviewText) &&
      !/REST 可用|SSH 可用/.test(firstScreenOverviewText + ' ' + mobileTop120Text + ' ' + overviewDesktopTopText + ' ' + overviewDesktopDetailText + ' ' + overviewStatusBarText)
    );
    const restSshDesktopSourceText = [overviewDesktopTopText, overviewDesktopDetailText].join(' ');
    const restSshMobileSourceText = [firstScreenOverviewText, mobileTop120Text, mobileAlertText, mobileIncidentTitleText].join(' ');
    const restSshViewportSourceText = isMobileOverview ? restSshMobileSourceText : restSshDesktopSourceText;
    const restSshContradictionText = [
      firstScreenOverviewText,
      mobileTop120Text,
      overviewDesktopTopText,
      overviewDesktopDetailText,
      overviewStatusBarText,
    ].join(' ');
    const overviewVisibleTimestampText = [
      firstScreenOverviewText,
      mobileTop120Text,
      overviewDesktopTopText,
      overviewDesktopDetailText,
      overviewStatusBarText,
    ].join(' ');
    const overviewLongTimestampForbiddenOk = sectionName !== 'overview' || Boolean(
      !/\b\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z)?\b/.test(overviewVisibleTimestampText)
    );
    const overviewReadOnlyFactToneOk = sectionName !== 'overview' || Boolean(
      !/值班动作|恢复条件|等待采集|保持只读/.test(overviewVisibleTimestampText)
    );
    const overviewRestSshSourceConsistencyOk = sectionName !== 'overview' || Boolean(
      !/REST|SSH/.test(restSshDesktopSourceText + ' ' + restSshMobileSourceText) ||
      (scaleScenario === 'interfaces-down'
        ? (
          restSshPairPattern.test(restSshViewportSourceText + ' ' + combinedOverviewText) &&
          /REST 不可达/.test(restSshViewportSourceText + ' ' + combinedOverviewText) &&
          /SSH 不可达/.test(restSshViewportSourceText + ' ' + combinedOverviewText) &&
          !/REST 可用|SSH 可用/.test(restSshContradictionText)
        )
        : scaleScenario === 'collection-down'
          ? (
            restSshPairPattern.test(restSshViewportSourceText) &&
            /REST 待确认/.test(restSshViewportSourceText) &&
            /SSH (?:缺依赖|不可达|不可用)/.test(restSshViewportSourceText) &&
            !/REST 可用|SSH 可用/.test(restSshViewportSourceText + ' ' + combinedOverviewText)
          )
          : (
            restSshPairPattern.test(restSshViewportSourceText || restSshDesktopSourceText)
          ))
    );

    const overviewCurrentResourceIncidentText = [combinedOverviewText, expectedRiskEvidenceText, resourceEdgeEvidenceText].join(' ');
    const overviewCurrentResourceIncidentOk = Boolean(
      hasResourceEdgePhrase &&
      hasCpu96 &&
      hasMemory92 &&
      hasDisk97 &&
      hasResourceDuration &&
      /连接压力|活动会话/.test(overviewCurrentResourceIncidentText) &&
      /阈值|阈85|阈90/.test(overviewCurrentResourceIncidentText) &&
      /峰值|峰96|峰92|峰97/.test(overviewCurrentResourceIncidentText) &&
      /三项同时越阈|越阈项/.test(overviewCurrentResourceIncidentText) &&
      overviewVisibleDensityModuleNames.includes('resource-risk-priority') &&
      overviewVisibleDensityModuleNames.includes('resource-pressure-bars') &&
      overviewVisibleDensityModuleNames.includes('resource-interface-top5')
    );
    const overviewCurrentResourceDensityOk = Boolean(
      overviewCurrentResourceIncidentOk &&
      /处理器|CPU/.test(overviewCurrentResourceIncidentText) &&
      /内存|MEM/.test(overviewCurrentResourceIncidentText) &&
      /磁盘|DISK/.test(overviewCurrentResourceIncidentText)
    );
    const overviewResourceFullIncidentOk = sectionName !== 'overview' || scaleScenario !== 'resource-full' || overviewCurrentResourceIncidentOk || Boolean(
      /资源满载|资源高负载/.test(combinedOverviewText + ' ' + expectedRiskEvidenceText) &&
      /(?:CPU|处理器).*96/.test(combinedOverviewText + ' ' + expectedRiskEvidenceText) &&
      /(?:内存|MEM).*92/.test(combinedOverviewText + ' ' + expectedRiskEvidenceText) &&
      /(?:磁盘|DISK).*97/.test(combinedOverviewText + ' ' + expectedRiskEvidenceText) &&
      (/连接|活动/.test(combinedOverviewText + ' ' + expectedRiskEvidenceText) || isMobileOverview) &&
      new RegExp('持续\\\\s*6\\\\s*点(?:\\\\s*/\\\\s*6s)?').test(combinedOverviewText + ' ' + expectedRiskEvidenceText) &&
      /均值/.test(combinedOverviewText + ' ' + expectedRiskEvidenceText) &&
      /阈值/.test(combinedOverviewText + ' ' + expectedRiskEvidenceText) &&
      /峰/.test(combinedOverviewText + ' ' + expectedRiskEvidenceText)
    );
    const overviewResourceNumericDensityOk = sectionName !== 'overview' || scaleScenario !== 'resource-full' || overviewCurrentResourceDensityOk || Boolean(
      /CPU|处理器/.test(combinedOverviewText + ' ' + expectedRiskEvidenceText) &&
      /内存|MEM/.test(combinedOverviewText + ' ' + expectedRiskEvidenceText) &&
      /磁盘|DISK/.test(combinedOverviewText + ' ' + expectedRiskEvidenceText) &&
      /阈值/.test(combinedOverviewText + ' ' + expectedRiskEvidenceText) &&
      /持续\\s*\\d+\\s*点/.test(combinedOverviewText + ' ' + expectedRiskEvidenceText) &&
      /均值/.test(combinedOverviewText + ' ' + expectedRiskEvidenceText) &&
      /峰/.test(combinedOverviewText + ' ' + expectedRiskEvidenceText)
    );
    const firstScreenPrimaryPhraseLimitOk = (() => {
      if (!isMobileOverview) return true;
      if (scaleScenario === 'no-snapshot') {
        const topLevelMissingText = firstScreenOverviewText.replace(/路由快照缺失/g, '');
        return countRegex(topLevelMissingText, /快照缺失/g) <= 1;
      }
      if (historyModeActive) {
        return countOccurrences(firstScreenOverviewText, '历史快照，当前影响未知') <= 1 &&
          countOccurrences(firstScreenOverviewText, '历史快照：WAN 曾离线') <= 1;
      }
      return firstScreenSampleRepeats.stale <= 1;
    })();
    const overviewFirstScreenDedupeOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      overviewFlatMobileContractOk &&
      primaryConclusionNodes.length <= 1 &&
      (mobileFlatStatus ? true : mobileAlertStatusOk) &&
      firstScreenActionRepeats.suggestionPrefix <= 1 &&
      (mobileFlatLinkTexts.length === 0 || firstScreenActionRepeats.actionLabels <= 2) &&
      mobileFlatLinkLabelsOk &&
      !/建议查看\\s+建议：|建议查看\\s+建议查看/.test(firstScreenOverviewText) &&
      firstScreenPrimaryPhraseLimitOk &&
      (noSnapshotEdge ? firstScreenSampleRepeats.fresh === 0 : firstScreenSampleRepeats.fresh <= 1)
    );
    const overviewDesktopFirstScreenDedupeOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      overviewDesktopTopConclusionUniqueOk &&
      overviewDesktopSamplingStateUniqueOk &&
      overviewDesktopEvidenceUniqueOk &&
      overviewDesktopDetailFirstTwoRowsVisibleOk
    );
    const overviewCrossViewportCopyDedupeOk = sectionName !== 'overview' || Boolean(
      overviewFirstScreenDedupeOk &&
      overviewDesktopFirstScreenDedupeOk
    );
    const overviewMobileCopyAssemblyOk = sectionName !== 'overview' || !isMobileOverview || Boolean(
      overviewFlatMobileContractOk &&
      overviewSuggestionCopyUniqueOk &&
      overviewMobileDispositionOk &&
      !/建议查看\\s+建议：|建议查看\\s+建议查看|建议：\\s+建议：/.test(firstScreenOverviewText)
    );
    const overviewResourceDurationVisibilityOk = sectionName !== 'overview' || scaleScenario !== 'resource-full' || overviewResourceNumericDensityOk;
    const overviewWanEvidencePriorityOk = sectionName !== 'overview' || scaleScenario !== 'all-offline' || Boolean(
      overviewWanListPriorityOk &&
      overviewMobileWanIncidentPriorityOk
    );
    const overviewSingleHistoricalPriorityOk = sectionName !== 'overview' || scaleScenario !== 'single' || Boolean(
      /历史快照|当前影响未知|影响未知：缓存快照|使用缓存快照|业务快照年龄/.test(combinedOverviewText) &&
      !/^(?:SSH 依赖缺失|SSH 缺依赖)/.test(overviewHistoryTitleText) &&
      !/当前状态：采集降级|采集降级\\s+REST 可用/.test(firstScreenOverviewText + ' ' + mobileTop120Text)
    );
    const loadAuditResourceGrid = sectionRoot?.querySelector('.ops-resource-grid');
    const loadAuditResourceCards = Array.from(loadAuditResourceGrid?.querySelectorAll('.ops-resource-card') || []);
    const loadAuditThresholdLines = sectionRoot?.querySelectorAll('.ops-threshold-line').length;
    const loadAuditResourceText = normalize(loadAuditResourceGrid?.textContent || '');
    const overviewInterfacesDownCollectionParityOk = sectionName !== 'overview' || scaleScenario !== 'interfaces-down' || Boolean(
      restSshPairPattern.test(combinedOverviewText) &&
      /REST 不可达/.test(combinedOverviewText) &&
      /SSH 不可达/.test(combinedOverviewText) &&
      !/REST 可用|SSH 可用/.test(restSshContradictionText)
    );
    const overviewRestSshViewportParityOk = sectionName !== 'overview' || Boolean(
      overviewInterfacesChannelConsistencyOk &&
      overviewInterfacesDownCollectionParityOk &&
      overviewRestSshSourceConsistencyOk
    );
    const overviewResourceTrendOk = sectionName !== 'loadAudit' || scaleScenario !== 'resource-full' || Boolean(
      loadAuditResourceGrid &&
      loadAuditResourceCards.length === 3 &&
      loadAuditThresholdLines >= 3 &&
      loadAuditResourceText.includes('当前') &&
      loadAuditResourceText.includes('峰值') &&
      loadAuditResourceText.includes('均值') &&
      loadAuditResourceText.includes('阈值') &&
      loadAuditResourceText.includes('持续') &&
      loadAuditResourceText.includes('数据点')
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
        '[data-overview-mobile-core-block]',
        '.ik-v420-timeline-row',
        '.ik-v420-resource-meter',
        '.ik-v420-list-row',
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
      overviewMobileEffectiveCoverageOk = ratio >= 0.62 && lastMeaningfulBottom >= window.innerHeight * 0.78;
    }
    let overviewBlankProbe = null;
    let overviewBlankAreaOk = true;
    let overviewNoSnapshotModuleFillProbe = null;
    let overviewNoSnapshotModuleFillOk = true;
    let overviewResourceModuleFillProbe = null;
    let overviewResourceModuleFillOk = true;
    let overviewDesktopRightFillProbe = null;
    let overviewDesktopRightFillOk = true;
    let overviewDesktopColumnContinuityProbe = null;
    let overviewDesktopColumnContinuityOk = true;
    let overviewDesktopTopBandProbe = null;
    let overviewDesktopTopBandOk = true;
    let overviewDesktopEffectiveHeightProbe = null;
    let overviewDesktopEffectiveHeightOk = true;
    let overviewDesktopFocusedHierarchyProbe = null;
    let overviewDesktopFocusedHierarchyOk = false;
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
        '.ik-home-summary-shell',
        '.ik-home-flat-topbar',
        '[data-overview-status-bar]',
        '.ik-overview-kpi-grid',
        '.ik-overview-kpi-card',
        '[data-overview-kpi-card]',
        '.ik-overview-flat-module',
        '.ik-overview-visual-module',
        '.ik-overview-chain-node',
        '.ik-overview-module-cell',
        '.ik-overview-channel-grid',
        '.ik-overview-link-chain',
        '.ik-overview-timeline',
        '.ik-overview-module-matrix',
        '.ik-overview-channel-cards',
        '.ik-no-snapshot-compact-stack',
        '.ik-no-snapshot-chain',
        '.ik-no-snapshot-chain-node',
        '.ik-no-snapshot-summary-tile',
        '.ik-no-snapshot-ledger-grid',
        '.ik-no-snapshot-ledger-cell',
        '.ik-no-snapshot-timeline-visual',
        '.ik-no-snapshot-event-row',
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
      const flatConsoleDetailNode = overviewNoSnapshotGrid || overviewDesktopDetail;
      const flatConsoleEvidenceNode = overviewVerdictStatusBus || overviewNoSnapshotGrid || overviewSummaryShell?.querySelector('.ik-home-evidence-grid');
      const flatConsoleDenseDetailCount = overviewDesktopDetail
        ? overviewDesktopDetail.querySelectorAll('tbody tr, .ik-home-evidence-row, .ik-summary-box').length
        : 0;
      const flatConsoleTableCount = overviewDesktopDetail ? overviewDesktopDetail.querySelectorAll('table').length : 0;
      const flatConsoleWrapCount = overviewDesktopDetail ? overviewDesktopDetail.querySelectorAll('.ops-table-wrap').length : 0;
      const flatConsoleFieldCount = overviewFieldNodes.filter(nodeVisibleInFirstScreen).length;
      const compactSummaryDisclosures = Array.from(sectionRoot.querySelectorAll('.ro-compact-summary-disclosure'))
        .filter((node) => node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0);
      const focusedWanVisual = sectionRoot.querySelector('[data-overview-density-module="wan-trend"] .ro-wan-integrated-visual');
      const focusedWanVisualRect = focusedWanVisual?.getBoundingClientRect();
      const focusedBottomRail = sectionRoot.querySelector('.ro-col.is-bottom');
      const focusedBottomRailRect = focusedBottomRail?.getBoundingClientRect();
      overviewDesktopFocusedHierarchyOk = ['single', 'fleet'].includes(scaleScenario) && Boolean(
        compactSummaryDisclosures.length >= 3 &&
        compactSummaryDisclosures.every((node) => !node.hasAttribute('open')) &&
        focusedWanVisualRect &&
        focusedWanVisualRect.width >= rect.width * 0.52 &&
        focusedWanVisualRect.height >= 240 &&
        focusedBottomRailRect &&
        focusedBottomRailRect.width >= rect.width * 0.72 &&
        focusedBottomRailRect.height >= 120 &&
        focusedBottomRailRect.top < window.innerHeight * 0.80
      );
      overviewDesktopFocusedHierarchyProbe = {
        disclosureCount: compactSummaryDisclosures.length,
        disclosuresClosed: compactSummaryDisclosures.every((node) => !node.hasAttribute('open')),
        wanVisualHeight: Math.round(focusedWanVisualRect?.height || 0),
        wanVisualWidth: Math.round(focusedWanVisualRect?.width || 0),
        bottomRailTop: Math.round(focusedBottomRailRect?.top || 0),
        bottomRailHeight: Math.round(focusedBottomRailRect?.height || 0),
      };
      const flatConsoleVisible = Boolean(
        overviewStatusBar &&
        overviewStatusBar.getBoundingClientRect().top < window.innerHeight * 0.20 &&
        overviewStatusBar.getBoundingClientRect().height > 0 &&
        flatConsoleDetailNode &&
        flatConsoleDetailNode.getBoundingClientRect().height > 0
        && (
          (flatConsoleEvidenceNode && flatConsoleEvidenceNode.getBoundingClientRect().height > 0) ||
          flatConsoleDenseDetailCount >= 6 ||
          overviewDensityModules.length >= 3
        )
      );
      const desktopContentRects = Array.from(sectionRoot.querySelectorAll([
        '[data-overview-status-bar]',
        '[data-overview-summary]',
        '[data-overview-desktop-detail]',
        '[data-overview-density-module]',
        '[data-overview-rank-grid]',
        '.ik-overview-flat-module',
        '.ik-home-density-card'
      ].join(',')))
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
        .map((node) => node.getBoundingClientRect());
      const effectiveTop = desktopContentRects.length ? Math.max(0, Math.min(...desktopContentRects.map((item) => item.top))) : 0;
      const effectiveBottom = desktopContentRects.length ? Math.max(...desktopContentRects.map((item) => item.bottom)) : 0;
      const effectiveHeight = Math.max(0, effectiveBottom - effectiveTop);
      const effectiveHeightRatio = noSnapshotEdge
        ? 0.40
        : ['collection-down', 'resource-full', 'resource-load', 'interfaces-down'].includes(scaleScenario)
          ? 0.78
          : 0.90;
      const effectiveMinHeight = noSnapshotEdge
        ? Math.min(360, Math.max(0, window.innerHeight * effectiveHeightRatio))
        : window.innerHeight * effectiveHeightRatio;
      const bottomBlank = Math.max(0, window.innerHeight - effectiveBottom);
      overviewDesktopEffectiveHeightOk = noSnapshotEdge
        ? Boolean(overviewNoSnapshotModuleCountOk && overviewNoSnapshotDesktopCoreFactsOk && effectiveHeight >= effectiveMinHeight)
        : effectiveHeight >= effectiveMinHeight;
      overviewDesktopEffectiveHeightProbe = {
        top: Math.round(effectiveTop),
        bottom: Math.round(effectiveBottom),
        height: Math.round(effectiveHeight),
        minHeight: Math.round(effectiveMinHeight),
        bottomBlank: Math.round(bottomBlank),
        nodeCount: desktopContentRects.length,
      };
      overviewBlankProbe = {
        filled,
        total,
        blank,
        ratio: Number(ratio.toFixed(3)),
        contentFillRatio: Number((1 - ratio).toFixed(3)),
        flatConsoleVisible,
        flatConsoleDenseDetailCount,
        flatConsoleTableCount,
        flatConsoleWrapCount,
        flatConsoleFieldCount,
      };
      const rightStart = left + ((right - left) * 0.58);
      let rightFilled = 0;
      let rightTotal = 0;
      const rightColumns = 8;
      const rightRows = 12;
      for (let yi = 0; yi < rightRows; yi += 1) {
        const y = top + ((bottom - top) * (yi + 0.5) / rightRows);
        for (let xi = 0; xi < rightColumns; xi += 1) {
          const x = rightStart + ((right - rightStart) * (xi + 0.5) / rightColumns);
          const el = document.elementFromPoint(x, y);
          if (!el || !sectionRoot.contains(el)) continue;
          rightTotal += 1;
          if (el.closest(contentSelector)) rightFilled += 1;
        }
      }
      const rightBlank = Math.max(0, rightTotal - rightFilled);
      const rightFillRatio = rightTotal ? rightFilled / rightTotal : 0;
      const rightFillMinRatio = overviewDesktopFocusedHierarchyOk
        ? 0.50
        : scaleScenario === 'resource-full' ? 0.68 : (noSnapshotEdge ? 0.72 : 0.56);
      overviewDesktopRightFillProbe = {
        filled: rightFilled,
        total: rightTotal,
        blank: rightBlank,
        ratio: Number(rightFillRatio.toFixed(3)),
        minRatio: rightFillMinRatio,
        left: Math.round(rightStart),
        right: Math.round(right),
      };
      const rightRegionRects = Array.from(sectionRoot.querySelectorAll([
        '[data-overview-density-module="no-snapshot-summary"]',
        '[data-overview-density-module="no-snapshot-channel-status"]',
        '[data-overview-density-module="no-snapshot-link-status"]',
        '[data-overview-density-module="no-snapshot-ledger"]',
        '[data-overview-density-module="no-snapshot-module-visibility"]',
        '[data-overview-density-module="no-snapshot-recent-success"]',
        '[data-overview-density-module="no-snapshot-trust-level"]',
        '[data-overview-density-module="no-snapshot-boundary-degrade"]',
        '[data-overview-density-module="no-snapshot-collection-timeline"]',
        '[data-overview-density-module="resource-pressure"]',
        '[data-overview-density-module="connection-pressure"]',
        '[data-overview-density-module="interface-throughput-impact"]',
        '[data-overview-density-module="process-service-pressure"]',
        '[data-overview-density-module="resource-sampling-window"]',
        '[data-overview-density-module="interface-forwarding"]',
        '[data-overview-density-module="protocol-mix"]',
        '[data-overview-density-module="freshness"]',
        '[data-overview-density-module="rank"]',
        '[data-overview-rank-grid]'
      ].join(',')))
        .filter((node) => {
          const item = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return item.width > 0 &&
            item.height > 0 &&
            item.right > rightStart &&
            item.bottom > 0 &&
            item.top < window.innerHeight &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0';
        })
        .map((node) => node.getBoundingClientRect());
      const rightMeaningfulBottom = rightRegionRects.length ? Math.max(...rightRegionRects.map((item) => Math.min(window.innerHeight, item.bottom || 0))) : 0;
      const rightBottomBlank = Math.max(0, window.innerHeight - rightMeaningfulBottom);
      overviewDesktopRightFillProbe.rightMeaningfulBottom = Math.round(rightMeaningfulBottom);
      overviewDesktopRightFillProbe.rightBottomBlank = Math.round(rightBottomBlank);
      overviewDesktopRightFillOk = noSnapshotEdge
        ? (
          rightRegionRects.length >= 1 &&
          overviewNoSnapshotModuleCountOk &&
          overviewNoSnapshotRowHeightOk &&
          overviewNoSnapshotDesktopCoreFactsOk
        )
        : (
          rightTotal > 0 &&
          rightFillRatio >= rightFillMinRatio &&
          rightBlank <= Math.floor(rightTotal * (1 - rightFillMinRatio))
        );
      const analyzeDesktopStackContinuity = (stackNode) => {
        if (!stackNode) {
          return { maxGap: 999, bottomGap: 999, itemCount: 0 };
        }
        const stackRect = stackNode.getBoundingClientRect();
        const visibleBottom = Math.min(window.innerHeight, Math.max(0, stackRect.bottom || window.innerHeight));
        const visibleTop = Math.max(0, stackRect.top || 0);
        const rects = Array.from(stackNode.children || [])
          .filter((node) => {
            const item = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            return item.width > 0 &&
              item.height > 0 &&
              item.bottom > 0 &&
              item.top < window.innerHeight &&
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              style.opacity !== '0';
          })
          .map((node) => {
            const item = node.getBoundingClientRect();
            return {
              top: Math.max(visibleTop, item.top),
              bottom: Math.min(visibleBottom, window.innerHeight, item.bottom),
              height: Math.max(0, Math.min(visibleBottom, window.innerHeight, item.bottom) - Math.max(visibleTop, item.top)),
              module: node.getAttribute('data-overview-density-module') || normalize(node.textContent || '').slice(0, 24),
            };
          })
          .filter((item) => item.height > 0)
          .sort((a, b) => a.top - b.top);
        let maxGap = 0;
        if (rects.length) {
          maxGap = Math.max(maxGap, Math.max(0, rects[0].top - visibleTop));
          for (let index = 1; index < rects.length; index += 1) {
            maxGap = Math.max(maxGap, Math.max(0, rects[index].top - rects[index - 1].bottom));
          }
          maxGap = Math.max(maxGap, Math.max(0, Math.min(window.innerHeight, visibleBottom) - rects[rects.length - 1].bottom));
        }
        const bottomGap = rects.length ? Math.max(0, Math.min(window.innerHeight, visibleBottom) - rects[rects.length - 1].bottom) : 999;
        return {
          maxGap: Math.round(maxGap),
          bottomGap: Math.round(bottomGap),
          itemCount: rects.length,
          modules: rects.map((item) => item.module).slice(0, 6),
        };
      };
      const continuityRequired = ['all-offline', 'collection-down', 'resource-full', 'interfaces-down', 'no-snapshot'].includes(scaleScenario);
      const leftStackNode = sectionRoot.querySelector('.ik-home-layout > .stack:not(.ik-home-side-stack)');
      const rightStackNode = sectionRoot.querySelector('.ik-home-layout > .ik-home-side-stack');
      const leftContinuity = analyzeDesktopStackContinuity(leftStackNode);
      const rightContinuity = analyzeDesktopStackContinuity(rightStackNode);
      overviewDesktopColumnContinuityProbe = {
        threshold: 120,
        required: continuityRequired,
        left: leftContinuity,
        right: rightContinuity,
      };
      overviewDesktopColumnContinuityOk = !continuityRequired || Boolean(
        noSnapshotEdge && overviewNoSnapshotModuleCountOk && overviewNoSnapshotDesktopCoreFactsOk ||
        leftContinuity.maxGap <= 120 &&
        rightContinuity.maxGap <= 120
      );
      const overviewNoSnapshotFillSelector = [
        '[data-overview-field]',
        '.ik-summary-box',
        '.freshness-item',
        '.ik-home-evidence-row',
        '.ik-home-ops-item',
        '.ik-home-detail-grid',
        '.ik-home-evidence-table',
        '.ik-overview-chain-node',
        '.ik-no-snapshot-chain-node',
        '.ik-no-snapshot-channel-grid',
        '.ik-no-snapshot-channel-card',
        '.ik-no-snapshot-matrix-grid',
        '.ik-no-snapshot-matrix-cell',
        '.ik-no-snapshot-summary-tile',
        '.ik-no-snapshot-ledger-cell',
        '.ik-no-snapshot-mini-event',
        '.ik-overview-module-cell',
        '.ik-overview-channel-grid',
        '.ik-overview-resource-sparks',
        '.ik-overview-resource-spark',
        '.ik-overview-resource-plot',
        '.ik-overview-resource-bars',
        '.ik-overview-bar-row',
        '.ik-overview-top5-list',
        '.ik-overview-top5-row',
        '.ik-overview-top5-rate',
        '.ik-overview-top5-meta',
        '.ik-overview-resource-judgement',
        '.ik-overview-trend-cell',
        '.ik-overview-link-chain',
        '.ik-overview-timeline',
        '.ik-overview-module-matrix',
        '.ik-overview-channel-cards',
        '.ik-no-snapshot-timeline-visual',
        '.ik-no-snapshot-event-row',
        '.ops-table-wrap',
        'table',
        'th',
        'td'
      ].join(',');
      const overviewNoSnapshotModuleFillTargets = noSnapshotEdge
        ? overviewDensityModules.filter((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return node.getAttribute('data-overview-density-module') !== 'evidence-boundary' &&
            rect.width > 0 &&
            rect.height > 0 &&
            rect.bottom > 0 &&
            rect.top < window.innerHeight &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0';
        })
        : [];
      const overviewNoSnapshotModuleFillSamples = overviewNoSnapshotModuleFillTargets.map((node) => {
        const sample = sampleRectCoverage(node, overviewNoSnapshotFillSelector, 14, 10);
        sample.title = normalize(node.querySelector('.ik-overview-flat-title, .ik-overview-subtable-title, .card-title')?.textContent || '');
        sample.module = node.getAttribute('data-overview-density-module') || '';
        return sample;
      });
      const overviewNoSnapshotModuleFillTarget = overviewDesktopDetail || overviewNoSnapshotGrid || overviewSummaryShell || sectionRoot;
      overviewNoSnapshotModuleFillProbe = overviewNoSnapshotModuleFillSamples.length
        ? {
          samples: overviewNoSnapshotModuleFillSamples,
          minRatio: Number(Math.min(...overviewNoSnapshotModuleFillSamples.map((item) => item.ratio || 0)).toFixed(3)),
          targetCount: overviewNoSnapshotModuleFillSamples.length,
        }
        : (overviewNoSnapshotModuleFillTarget
          ? sampleRectCoverage(overviewNoSnapshotModuleFillTarget, [
          '[data-overview-field]',
          '.ik-summary-box',
          '.freshness-item',
          '.ik-home-evidence-row',
          '.ik-home-ops-item',
          '.ik-home-detail-grid',
          '.ik-home-evidence-table',
          '.ik-no-snapshot-chain-node',
          '.ik-no-snapshot-channel-grid',
          '.ik-no-snapshot-channel-card',
          '.ik-no-snapshot-matrix-grid',
          '.ik-no-snapshot-matrix-cell',
          '.ik-no-snapshot-summary-tile',
          '.ik-no-snapshot-ledger-cell',
          '.ik-no-snapshot-mini-event',
          '.ops-table-wrap',
          'table',
          'th',
          'td'
        ].join(','), 14, 10)
          : null);
      const overviewNoSnapshotModuleFillRatio = overviewNoSnapshotModuleFillSamples.length
        ? overviewNoSnapshotModuleFillProbe.minRatio
        : overviewNoSnapshotModuleFillProbe && overviewNoSnapshotModuleFillProbe.total
        ? Number(overviewNoSnapshotModuleFillProbe.ratio.toFixed(3))
        : 0;
      const overviewNoSnapshotModuleFactFillOk = Boolean(
      overviewNoSnapshotDesktopCoreFactsOk &&
      overviewNoSnapshotRowHeightOk &&
      overviewNoSnapshotFiveModuleRowCounts.length === 3 &&
      overviewNoSnapshotFiveModuleRowCounts.every((item) => item.rows >= 4 && item.rows <= 5 && item.textLength >= 48)
    );
    overviewNoSnapshotModuleFillOk = sectionName !== 'overview' || !noSnapshotEdge || !isDesktopOverview || Boolean(
        overviewNoSnapshotModuleFillSamples.length === 3 &&
        (overviewNoSnapshotModuleFillRatio >= 0.42 || overviewNoSnapshotModuleFactFillOk)
      );
      const overviewResourceFillTargets = scaleScenario === 'resource-full'
        ? overviewDensityModules.filter((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          const moduleText = [
            node.getAttribute('data-overview-density-module') || '',
            normalize(node.querySelector('.ik-overview-flat-title, .ik-overview-subtable-title, .card-title')?.textContent || ''),
            normalize(node.textContent || ''),
          ].join(' ');
          return /resource-risk-priority|resource-pressure-bars|resource-interface-top5|资源满载|资源压力条形摘要|接口吞吐 Top5/.test(moduleText) &&
            rect.width > 0 &&
            rect.height > 0 &&
            rect.bottom > 0 &&
            rect.top < window.innerHeight &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0';
        })
        : [];
      const overviewResourceFillSamples = overviewResourceFillTargets.map((node) => {
        const sample = sampleRectCoverage(node, overviewNoSnapshotFillSelector, 14, 10);
        sample.title = normalize(node.querySelector('.ik-overview-flat-title, .ik-overview-subtable-title, .card-title')?.textContent || '');
        sample.module = node.getAttribute('data-overview-density-module') || '';
        return sample;
      });
      overviewResourceModuleFillProbe = overviewResourceFillSamples.length
        ? {
          samples: overviewResourceFillSamples,
          minRatio: Number(Math.min(...overviewResourceFillSamples.map((item) => item.ratio || 0)).toFixed(3)),
          targetCount: overviewResourceFillSamples.length,
        }
        : null;
      overviewResourceModuleFillOk = sectionName !== 'overview' || scaleScenario !== 'resource-full' || !isDesktopOverview || Boolean(
        overviewResourceFillSamples.length >= 3 &&
        overviewResourceSpecificModulesOk &&
        overviewResourceTop5Rows.length >= 5 &&
        sectionRoot?.querySelectorAll('[data-overview-density-module="resource-pressure-bars"] .ik-overview-bar-row').length >= 8
      );
      overviewBlankAreaOk = overviewDesktopRightFillOk && (ratio <= 0.08 || Boolean(
        flatConsoleVisible &&
        overviewDensityModules.length >= 4 &&
        flatConsoleFieldCount >= 40 &&
        (flatConsoleDenseDetailCount >= 4 || flatConsoleTableCount >= 1 || flatConsoleWrapCount >= 1)
      ) || Boolean(
        noSnapshotEdge &&
        flatConsoleVisible &&
        overviewNoSnapshotDenseModuleOk &&
        (overviewNoSnapshotGridItems.length >= 6 || overviewNoSnapshotDesktopVisibleCellCount >= 60) &&
        (flatConsoleTableCount >= 1 || overviewNoSnapshotCoreModulesVisible) &&
        overviewNoSnapshotEffectiveVisibleFactCount >= 32 &&
        (overviewNoSnapshotModuleFillRatio >= 0.72 || overviewNoSnapshotDesktopCoreFactsOk)
      ) || Boolean(
        scaleScenario === 'resource-full' &&
        flatConsoleVisible &&
        overviewResourceModuleFillOk &&
        overviewResourceFirstScreenEffectiveFactsOk &&
        (1 - ratio) >= 0.64 &&
        rightFillRatio >= 0.64
      ));
      const bandHeight = Math.min(52, Math.max(24, Math.round(window.innerHeight * 0.06)));
      const bandBottom = Math.min(window.innerHeight, top + bandHeight);
      let bandFilled = 0;
      let bandTotal = 0;
      const bandColumns = 18;
      const bandRows = 4;
      for (let yi = 0; yi < bandRows; yi += 1) {
        const y = top + ((bandBottom - top) * (yi + 0.5) / bandRows);
        for (let xi = 0; xi < bandColumns; xi += 1) {
          const x = left + ((right - left) * (xi + 0.5) / bandColumns);
          const el = document.elementFromPoint(x, y);
          if (!el || !sectionRoot.contains(el)) continue;
          bandTotal += 1;
          if (el.closest(contentSelector)) bandFilled += 1;
        }
      }
      const bandRatio = bandTotal ? bandFilled / bandTotal : 0;
      overviewDesktopTopBandProbe = {
        filled: bandFilled,
        total: bandTotal,
        ratio: Number(bandRatio.toFixed(3)),
        bandHeight,
        viewportHeight: window.innerHeight,
      };
      overviewDesktopTopBandOk = bandRatio >= 0.12 && bandFilled >= 8;
    }
    if (sectionName === 'overview') {
      overviewFirstScreenCoverageOk = isMobileOverview
        ? (overviewMobileEffectiveCoverageOk && overviewMobileNo72vhBlankOk && overviewMobileFirstScreenHardCompressionOk)
        : (overviewBlankAreaOk && overviewDesktopRightFillOk && overviewDesktopTopBandOk && overviewDesktopEffectiveHeightOk && overviewDesktopColumnContinuityOk);
    }
    const overviewDesktopInfoDensityOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      (
        overviewSceneSpecificDesktopDensityOk &&
        overviewBlankAreaOk &&
        overviewDesktopRightFillOk &&
        overviewDesktopTopBandOk &&
        overviewDesktopFlatStatusBarOk &&
        overviewDesktopTableDensityOk &&
        overviewActionLinksLowChromeOk &&
        overviewGenericDetailTitleOk &&
        overviewRepeatedRestSshOk &&
        overviewNormalTagBudgetOk &&
        overviewH1HeightOk &&
        overviewNoSnapshotDesktopFieldDensityOk &&
        overviewDesktopEffectiveHeightOk &&
        overviewDesktopChartReadabilityOk
      ) ||
      (
        overviewDesktopDensityOk &&
        overviewDesktopModuleSpreadOk &&
        overviewBlankAreaOk &&
        overviewDesktopRightFillOk &&
        overviewDesktopTopBandOk &&
        overviewDesktopFlatStatusBarOk &&
        overviewDesktopTableDensityOk &&
        overviewActionLinksLowChromeOk &&
        overviewGenericDetailTitleOk &&
        overviewRepeatedRestSshOk &&
        overviewNormalTagBudgetOk &&
        overviewH1HeightOk &&
        overviewNoSnapshotDesktopFieldDensityOk &&
        overviewDesktopEffectiveHeightOk &&
        overviewDesktopChartReadabilityOk
      )
    );
    const visibleUnionRect = (nodes) => {
      const rects = nodes
        .filter(Boolean)
        .map((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return rect.width > 0 &&
            rect.height > 0 &&
            rect.bottom > 0 &&
            rect.top < window.innerHeight &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0'
            ? rect
            : null;
        })
        .filter(Boolean);
      if (!rects.length) return null;
      const top = Math.min(...rects.map((rect) => rect.top));
      const bottom = Math.max(...rects.map((rect) => rect.bottom));
      const left = Math.min(...rects.map((rect) => rect.left));
      const right = Math.max(...rects.map((rect) => rect.right));
      return {
        top,
        bottom,
        left,
        right,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top),
      };
    };
    const overviewSummaryMainRectRaw = overviewSummaryMain?.getBoundingClientRect();
    const overviewSummaryShellRect = overviewSummaryShell?.getBoundingClientRect();
    const overviewSummaryVisibleRect = visibleUnionRect([
      overviewSummaryMain,
      overviewSummaryShell,
      overviewStatusBar,
      ...(overviewSummaryShell ? Array.from(overviewSummaryShell.querySelectorAll([
        '[data-overview-status-bar]',
        '[data-overview-field]',
        '[data-overview-no-snapshot-grid]',
        '[data-overview-density-module]',
        '.ik-home-evidence-grid',
        '.ik-summary-box',
        '.ik-overview-flat-module',
      ].join(','))) : []),
    ]);
    const overviewSummaryMainRect = overviewSummaryMainRectRaw && overviewSummaryMainRectRaw.height > 0
      ? overviewSummaryMainRectRaw
      : overviewSummaryShellRect && overviewSummaryShellRect.height > 0
        ? overviewSummaryShellRect
        : overviewSummaryVisibleRect;
    const overviewDesktopDetailRect = overviewDesktopDetail?.getBoundingClientRect();
    const overviewDesktopLeadRect = overviewSummaryMainRect || overviewStatusBarRect;
    const overviewDesktopNo72vhBlankOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      (
        overviewSceneSpecificDesktopDensityOk &&
        overviewDesktopLeadRect &&
        overviewDesktopLeadRect.height > 0 &&
        overviewBlankAreaOk &&
        overviewDesktopRightFillOk &&
        overviewDesktopTopBandOk
      ) ||
      (
        overviewDesktopLeadRect &&
        overviewDesktopDetailRect &&
        overviewDesktopLeadRect.height > 0 &&
        overviewDesktopDetailRect.height > 0 &&
        overviewBlankAreaOk &&
        overviewDesktopRightFillOk &&
        overviewDesktopTopBandOk
      )
    );
    const overviewDesktopWhitespaceBudgetOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      overviewBlankAreaOk &&
      overviewDesktopRightFillOk &&
      overviewDesktopTopBandOk &&
      overviewDesktopNo72vhBlankOk &&
      overviewDesktopEffectiveHeightOk
    );
    const overviewDesktopInfoBudgetOk = sectionName !== 'overview' || !isDesktopOverview || Boolean(
      overviewDesktopInfoDensityOk &&
      overviewDesktopWhitespaceBudgetOk
    );
    const overviewReadonlyConsoleContractOk = sectionName !== 'overview' || Boolean(
      isDesktopOverview
        ? overviewFlatDesktopContractOk && overviewDesktopInfoDensityOk
        : isMobileOverview
          ? overviewFlatMobileContractOk &&
            overviewMobileFirstScreenContractOk &&
            overviewMobileFlatStatusTableOk &&
            overviewMobileNo72vhBlankOk &&
            overviewMobileFirstScreenHardCompressionOk
          : true
    );
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
    const strictNarrowOverflow = ${args.strictResponsive ? 'true' : 'false'} && isMobileOverview && overflowX > 24;
    const mobileOverviewAppHomePass = Boolean(
      sectionName === 'overview' &&
      mobileOverviewAppViewport &&
      overviewMobileLandscapeAppOk &&
      overviewMobile390AcceptanceOk &&
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
      overviewMobile390FirstScreenNoTableOk &&
      overviewMobile390FirstScreenVisualOk &&
      overviewMobile390NoMemDiskVisibleOk &&
      overviewMobile390NoCpuMemDiskEnglishOk &&
      overviewMobile390NoFocusPrimaryStatusOk &&
      overviewMobile390NoTitleStatusCollisionOk &&
      overviewMobile390NoCardPileOk &&
      overviewMobile390ScenarioVisualKindOk &&
      overviewMobile390BottomTabOk &&
      overviewMobile390NoRawBooleanCopyOk &&
      overviewMobile390NoRawRouterOsFieldsOk &&
      overviewMobile390NoMainProgressBarOk &&
      overviewMobile390NoHeavyVisualBlocksOk &&
      overviewMobile390NoAppHomeTitleClipOk &&
      overviewMobile390NoCoreTextClipOk &&
      overviewMobileResourceFullVerticalOk &&
      overviewMobile390AppHomeFirstOk &&
      overviewNoSnapshotFirstScreenRateForbiddenOk &&
      overviewLongTimestampForbiddenOk &&
      overviewChineseUiNoEngineeringEnglishOk &&
      overviewReadOnlyBoundaryOk
    );
    const overviewDesktopNoSnapshotRequiredModules = [
      'no-snapshot-summary',
      'no-snapshot-module-visibility',
      'no-snapshot-recent-success',
      'evidence-boundary',
    ];
    const overviewDesktopNoSnapshotCurrentText = [overviewStatusBarText, overviewDesktopTopText, overviewDesktopDetailText, text].join(' ');
    const overviewDesktopNoSnapshotCurrentPass = Boolean(
      sectionName === 'overview' &&
      noSnapshotEdge &&
      isDesktopOverview &&
      app &&
      active &&
      (requested || active.id === sectionName) &&
      text.length > 500 &&
      !hasBadLiteral &&
      scaleMetaOk &&
      scaleDisclosureOk &&
      overviewActionOk &&
      overviewOperatorHomeOk &&
      overviewMinimalOk &&
      overviewSummaryShell &&
      overviewStatusBusRoleContractOk &&
      overviewDesktopDetail &&
      overviewDesktopRect &&
      overviewDesktopRect.height >= window.innerHeight * 0.9 &&
      overviewDesktopNoSnapshotRequiredModules.every((name) => overviewVisibleDensityModuleNames.includes(name)) &&
      overviewVisibleDensityModuleNames.length === overviewDesktopNoSnapshotRequiredModules.length &&
      overviewDesktopDetailFirstTwoRowsVisibleOk &&
      overviewRowHeightUpperBoundOk &&
      overviewNoSnapshotDuplicateModuleTitles.length === 0 &&
      overviewNoSnapshotFailureEndpointLedgerOk &&
      overviewNoSnapshotLedgerStructureOk &&
      overviewNoSnapshotNoWanRateCardOk &&
      overviewNoSnapshotUnifiedBusinessCopyOk &&
      overviewNoSnapshotFreshnessForbiddenOk &&
      overviewNoSnapshotTrustedMetricsForbiddenOk &&
      overviewNoSnapshotDowngradeReasonsOk &&
      overviewNoSnapshotNoGiantTablesOk &&
      overviewNoSnapshotRowHeightOk &&
      overviewNoSnapshotDesktopEvidenceTripletOk &&
      overviewReadOnlyBoundaryOk &&
      overviewLongTimestampForbiddenOk &&
      overviewChineseUiNoEngineeringEnglishOk &&
      /业务快照缺失|无业务快照/.test(overviewDesktopNoSnapshotCurrentText) &&
      /RouterOS.*(?:不可达|断链)/.test(overviewDesktopNoSnapshotCurrentText) &&
      /REST/.test(overviewDesktopNoSnapshotCurrentText) &&
      /SSH/.test(overviewDesktopNoSnapshotCurrentText) &&
      /业务数据不展示/.test(overviewDesktopNoSnapshotCurrentText) &&
      /不可判定|待判/.test(overviewDesktopNoSnapshotCurrentText) &&
      !shellOverlap &&
      !desktopOverflow
    );
    const pass = Boolean(
      mobileOverviewAppHomePass ||
      overviewDesktopNoSnapshotCurrentPass ||
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
      (!mobileOverview390x844 || overviewMobile390AcceptanceOk) &&
      (!mobileOverview390x844 || overviewMobile390NoCoreTextClipOk) &&
      (!mobileOverview390x844 || overviewMobile390NoKpi2x2Ok) &&
      (!mobileOverview390x844 || overviewMobile390NoCpuMemDiskEnglishOk) &&
      (!mobileOverview390x844 || overviewMobile390NoFocusPrimaryStatusOk) &&
      (!mobileOverview390x844 || overviewMobile390NoTitleStatusCollisionOk) &&
      (!mobileOverview390x844 || overviewMobile390NoCardPileOk) &&
      (!mobileOverview390x844 || overviewMobile390ScenarioVisualKindOk) &&
      overviewMobileResourceFullVerticalOk &&
      overviewDesktopNoMobileAppChromeOk &&
      overviewDesktopNoToyNavLeakOk &&
      overviewDesktopNoContentIconTabsOk &&
      overviewDesktopHierarchyMarkerOk &&
      overviewDesktopDensityOk &&
      overviewStatusBusTripletOk &&
      overviewVisualBalanceOk &&
      overviewAllOfflinePortMatrixOk &&
      overviewDesktopCoreTextOk &&
      overviewDesktopTopConclusionUniqueOk &&
      overviewDesktopSamplingStateUniqueOk &&
      (overviewMobile390AcceptanceOk || overviewMobileAlertOk) &&
      (overviewMobile390AcceptanceOk || mobileCoreBlockContractOk) &&
      mobileCoreChartMetaOk &&
      overviewMobileNoLineChartsOk &&
      overviewMobileOfflineBarSemanticsOk &&
      overviewVerdictCompactOk &&
      overviewTerminologyOk &&
      overviewTrustCopyOk &&
      overviewHistoryRealtimeCopyOk &&
      overviewWanDecisionOk &&
      (overviewMobile390AcceptanceOk || overviewRiskSplitOk) &&
      (overviewMobile390AcceptanceOk || overviewCapabilityDegradeOk) &&
      overviewProductVerdictOk &&
      overviewEvidenceChainOk &&
      overviewEdgeScenarioOk &&
      (overviewMobile390AcceptanceOk || overviewFirstEvidenceCategoryOk) &&
      (overviewMobile390AcceptanceOk || overviewHighestRiskEvidenceMatchOk) &&
      overviewAllOfflineSceneEvidenceOk &&
      overviewFleetSceneEvidenceOk &&
      overviewAllOfflineFleetContentOk &&
      overviewUsableWidthOk &&
      (overviewMobile390AcceptanceOk || overviewFirstScreenCoverageOk) &&
      overviewDesktopColumnContinuityOk &&
      overviewRowHeightUpperBoundOk &&
      overviewDesktopInfoDensityOk &&
      overviewDesktopInfoBudgetOk &&
      overviewDesktopNo72vhBlankOk &&
      overviewDesktopWhitespaceBudgetOk &&
      overviewDesktopDetailFirstTwoRowsVisibleOk &&
      (overviewMobile390AcceptanceOk || overviewCardBudgetOk) &&
      overviewSemanticColorBudgetOk &&
      (overviewMobile390AcceptanceOk || overviewMobileCoreOk) &&
      (overviewMobile390AcceptanceOk || overviewMobileArchitectureOk) &&
      (overviewMobile390AcceptanceOk || overviewMobileFirstScreenContractOk) &&
      (overviewMobile390AcceptanceOk || overviewMobileLedgerHeightOk) &&
      (overviewMobile390AcceptanceOk || overviewMobileFlatStatusTableOk) &&
      overviewNoSnapshotMobileInternalLabelsOk &&
      (overviewMobile390AcceptanceOk || overviewNoSnapshotMobileSingleColumnOk) &&
      overviewMobileAlertCardCompactOk &&
      (overviewMobile390AcceptanceOk || overviewMobileDetailFirstTwoRowsVisibleOk) &&
      overviewMobileNo72vhBlankOk &&
      (overviewMobile390AcceptanceOk || overviewMobileWanIncidentPriorityOk) &&
      (overviewMobile390AcceptanceOk || overviewMobileProductVerdictOk) &&
      (overviewMobile390AcceptanceOk || overviewMobileDispositionOk) &&
      (overviewMobile390AcceptanceOk || overviewMobileUniqueVerdictOk) &&
      (overviewMobile390AcceptanceOk || overviewMobilePrimaryConclusionUniqueOk) &&
      (overviewMobile390AcceptanceOk || overviewMobileSamplingStateUniqueOk) &&
      (overviewMobile390AcceptanceOk || overviewMobileActionLinksUniqueOk) &&
      overviewDesktopActionLinksUniqueOk &&
      overviewActionLinksLowChromeOk &&
      overviewGenericDetailTitleOk &&
      overviewRepeatedRestSshOk &&
      overviewNormalTagBudgetOk &&
      overviewH1HeightOk &&
      overviewNoSnapshotDesktopFieldDensityOk &&
      overviewSuggestionCopyUniqueOk &&
      (overviewMobile390AcceptanceOk || overviewMobileCopyAssemblyOk) &&
      (overviewMobile390AcceptanceOk || overviewMobileEvidenceTitleOk) &&
      (overviewMobile390AcceptanceOk || overviewMobileEvidenceUniqueOk) &&
      overviewChineseUiNoEngineeringEnglishOk &&
      overviewReadOnlyBoundaryOk &&
      overviewNoSnapshotReadonlyBoundaryRepeatOk &&
      overviewEvidenceLayeringOk &&
      (overviewMobile390AcceptanceOk || overviewWanListPriorityOk) &&
      (overviewMobile390AcceptanceOk || overviewWanEvidencePriorityOk) &&
      overviewRouteSnapshotCopyOk &&
      (overviewMobile390AcceptanceOk || overviewAnomalyEvidenceOk) &&
      overviewHistoryNoLiveGreenOk &&
      (overviewMobile390AcceptanceOk || overviewMobileEffectiveCoverageOk) &&
      (overviewMobile390AcceptanceOk || overviewMobileFirstScreenHardCompressionOk) &&
      overviewEffectiveFactAxesOk &&
      overviewEffectiveFactsGateOk &&
      (overviewMobile390AcceptanceOk || overviewFirstScreenEllipsisOk) &&
      overviewCriticalEllipsisOk &&
      overviewPrimaryConclusionNoEllipsisOk &&
      overviewHistoryStrongPromptOk &&
      overviewHistoryFirstScreenPromptOk &&
      overviewHistoryTitlePrefixOk &&
      overviewFreshnessFreshSampleOk &&
      overviewDefaultRouteSnapshotSemanticsOk &&
      overviewDefaultRouteSemanticUndeterminedOk &&
      overviewDefaultRouteRawFactsOk &&
      overviewNoSnapshotSemanticOk &&
      overviewNoSnapshotMainVisualOk &&
      overviewNoSnapshotGridOk &&
      overviewNoSnapshotFiveBlocksOk &&
      overviewNoSnapshotDenseModuleOk &&
      overviewNoSnapshotModuleCountOk &&
      overviewNoSnapshotRowHeightOk &&
      overviewNoSnapshotLedgerTitlesOk &&
      overviewNoSnapshotNoWanRateCardOk &&
      overviewNoSnapshotUnifiedBusinessCopyOk &&
      overviewNoSnapshotNoDuplicateBoundaryOk &&
      overviewNoSnapshotFailureEndpointLedgerOk &&
      overviewNoSnapshotLedgerStructureOk &&
      overviewNoSnapshotTopbarOk &&
      overviewNoSnapshotEffectiveFactCountOk &&
      overviewNoSnapshotFakeDensityOk &&
      overviewNoSnapshotNoGiantTablesOk &&
      overviewNoSnapshotOpsLedgerCopyOk &&
      overviewNoSnapshotFreshnessForbiddenOk &&
      overviewNoSnapshotSamplingStateUniqueOk &&
      overviewNoSnapshotDesktopEvidenceTripletOk &&
      (overviewMobile390AcceptanceOk || overviewNoSnapshotTrustedMetricsForbiddenOk) &&
      (overviewMobile390AcceptanceOk || overviewNoSnapshotDowngradeReasonsOk) &&
      (overviewMobile390AcceptanceOk || overviewNoSnapshotRepetitionBudgetOk) &&
      overviewAllWanOfflineSummaryOk &&
      overviewAllOfflinePriorityObjectsOk &&
      overviewIncidentWanRateFillerForbiddenOk &&
      overviewCollectionLayerSplitOk &&
      overviewCollectionTimelinePriorityOk &&
      overviewCollectionContradictionOk &&
      (overviewMobile390AcceptanceOk || overviewCollectionTrustMarkersOk) &&
      overviewCollectionBusinessTrustCopyOk &&
      overviewCollectionTerminalRankDeprioritizedOk &&
      overviewCollectionRankOrderOk &&
      overviewConsoleLanguageOk &&
      overviewInterfacesChannelConsistencyOk &&
      overviewInterfacesForwardingFirstOk &&
      (overviewMobile390AcceptanceOk || overviewMobileInterfacesFirstOk) &&
      (overviewMobile390AcceptanceOk || overviewMobileInterfaceRowFormatOk) &&
      overviewInterfacesDownCollectionParityOk &&
      (overviewMobile390AcceptanceOk || overviewRestSshSourceConsistencyOk) &&
      (overviewMobile390AcceptanceOk || overviewRestSshViewportParityOk) &&
      overviewStatusBusFixedGrammarOk &&
      overviewLongTimestampForbiddenOk &&
      overviewReadOnlyFactToneOk &&
      (overviewMobile390AcceptanceOk || overviewResourceFirstScreenPriorityOk) &&
      (overviewMobile390AcceptanceOk || overviewResourceFirstScreenWanTrendForbiddenOk) &&
      (overviewMobile390AcceptanceOk || overviewResourceFirstScreenEffectiveFactsOk) &&
      overviewResourceSpecificModulesOk &&
      overviewResourceModuleFillOk &&
      overviewResourceFinalOrderOk &&
      (overviewMobile390AcceptanceOk || overviewReadonlyConsoleContractOk) &&
      overviewResourceFullIncidentOk &&
      overviewResourceNumericDensityOk &&
      overviewResourceDurationVisibilityOk &&
      (overviewMobile390AcceptanceOk || overviewFirstScreenDedupeOk) &&
      overviewDesktopFirstScreenDedupeOk &&
      (overviewMobile390AcceptanceOk || overviewCrossViewportCopyDedupeOk) &&
      overviewSingleHistoricalPriorityOk &&
      overviewStaleDataImpactOk &&
      overviewBlankAreaOk &&
      overviewDesktopRightFillOk &&
      overviewDesktopEffectiveHeightOk &&
      overviewNoSnapshotModuleFillOk &&
      (overviewMobile390AcceptanceOk || overviewMobileTerminalSingleLineOk) &&
      overviewTerminalPlacementOk &&
      overviewNoDuplicateTerminalOk &&
      overviewDesktopEvidenceUniqueOk &&
      overviewDesktopFlatStatusBarOk &&
      overviewDesktopTableDensityOk &&
      overviewAggregateWanNoIpv6Ok &&
      overviewWanCardNoInternalScrollOk &&
      overviewResourceRowOk &&
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
    const mobileOverviewAppHomeGateProbe = mobileOverviewAppViewport ? {
      appHomePass: mobileOverviewAppHomePass,
      compactLandscape: compactLandscapeOverview,
      landscapeContract: overviewMobileLandscapeAppOk,
      landscapeRoot: mobileLandscapeRootRect ? { width: mobileLandscapeRootRect.width, height: mobileLandscapeRootRect.height } : null,
      landscapeScreen: mobileLandscapeScreenRect ? {
        width: mobileLandscapeScreenRect.width,
        height: mobileLandscapeScreenRect.height,
        display: mobileLandscapeScreenStyle?.display || '',
        columns: mobileLandscapeScreenStyle?.gridTemplateColumns || ''
      } : null,
      landscapeTabs: mobileLandscapeTabsRect ? {
        width: mobileLandscapeTabsRect.width,
        height: mobileLandscapeTabsRect.height,
        buttons: mobileLandscapeTabs?.querySelectorAll('button').length || 0
      } : null,
      landscapeDesktopVisible: mobileLandscapeDesktopVisible,
      acceptance: overviewMobile390AcceptanceOk,
      iosHome: overviewMobileIosRouterHomeOk,
      noTable: overviewMobile390FirstScreenNoTableOk,
      visual: overviewMobile390FirstScreenVisualOk,
      noMemDisk: overviewMobile390NoMemDiskVisibleOk,
      noCpuMemDiskEnglish: overviewMobile390NoCpuMemDiskEnglishOk,
      noFocusPrimaryStatus: overviewMobile390NoFocusPrimaryStatusOk,
      noTitleStatusCollision: overviewMobile390NoTitleStatusCollisionOk,
      noCardPile: overviewMobile390NoCardPileOk,
      sceneVisualKind: overviewMobile390ScenarioVisualKindOk,
      bottomTab: overviewMobile390BottomTabOk,
      noRawBoolean: overviewMobile390NoRawBooleanCopyOk,
      noRawRouterOs: overviewMobile390NoRawRouterOsFieldsOk,
      noMainProgressBar: overviewMobile390NoMainProgressBarOk,
      noHeavyVisual: overviewMobile390NoHeavyVisualBlocksOk,
      noTitleClip: overviewMobile390NoAppHomeTitleClipOk,
      noCoreClip: overviewMobile390NoCoreTextClipOk,
      resourceVertical: overviewMobileResourceFullVerticalOk,
      appHomeFirst: overviewMobile390AppHomeFirstOk,
      noSnapshotRateForbidden: overviewNoSnapshotFirstScreenRateForbiddenOk,
      noLongTimestamp: overviewLongTimestampForbiddenOk,
      chineseUi: overviewChineseUiNoEngineeringEnglishOk,
      readOnlyBoundary: overviewReadOnlyBoundaryOk,
    } : null;
    return {
      pass,
      mobileOverviewAppHomeGateProbe,
      profile: ${JSON.stringify(profile)},
      viewport: ${JSON.stringify(viewport)},
      scaleScenario: ${JSON.stringify(scaleScenario)},
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
      overviewDensityModuleNames,
      overviewVisibleDensityModuleNames,
      overviewDesktopHeight: overviewDesktopRect ? Math.round(overviewDesktopRect.height) : null,
      overviewMinDesktopHeight: overviewDesktopRect ? Math.round(overviewDesktopRect.height) : null,
      overviewStatusBusTripletOk,
      overviewStatusBusProbe: {
        cells: overviewStatusBusCells.length,
        visibleCells: overviewStatusBusVisibleCells.length,
        text: overviewStatusBusText,
      },
      overviewDesktopCoreTextOk,
      overviewDesktopTopConclusionUniqueOk,
      overviewDesktopSamplingStateUniqueOk,
      overviewDesktopTopProbe: {
        primary: normalize(overviewDesktopPrimary?.textContent || ''),
        text: overviewDesktopTopText.slice(0, 260),
        wanLinkCount: countOccurrences(overviewDesktopTopText, 'WAN明细'),
        collectionLinkCount: countOccurrences(overviewDesktopTopText, '采集状态'),
        routeLinkCount: countOccurrences(overviewDesktopTopText, '路由快照'),
        resourceLinkCount: countOccurrences(overviewDesktopTopText, '资源阈值'),
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
      overviewHistoryStrongPromptOk,
      overviewRankCompactOk,
      overviewRankHeaders: rankHeaders,
      overviewRankScrollerOverflow: rankScrollerOverflow,
      overviewWanDecisionOk,
      overviewRiskSplitOk,
      overviewCapabilityDegradeOk,
      overviewProductVerdictOk,
      overviewCollectionProductVerdictProbe,
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
      overviewAllOfflineSceneEvidenceOk,
      overviewAllOfflineSceneEvidenceProbe: {
        totalWanCount,
        offlineWanCount,
        activeDefaultRouteCount,
        visibleAnomalyNames: visibleAnomalyNames.slice(0, 6),
        wanDetailRows: overviewWanDetailRows.length,
        mobileWanRows: mobileWanEvidenceRows.length,
      },
      overviewFleetSceneEvidenceOk,
      overviewFleetSceneEvidenceProbe: {
        wanActualCount: fleetWanActualCount,
        terminalActualCount: fleetTerminalActualCount,
        offlineNames: fleetOfflineNames,
        offlineEvidenceCount: fleetOfflineEvidenceCount,
        visibleAnomalyNames: visibleAnomalyNames.slice(0, 6),
        excerpt: fleetSceneText.slice(0, 260),
      },
      overviewAllOfflineFleetContentOk,
      overviewAllOfflineFleetContentProbe: {
        totalWanCount,
        offlineWanCount,
        activeDefaultRouteCount,
        fleetWanActualCount,
        fleetTerminalActualCount,
        excerpt: fleetSceneText.slice(0, 260),
      },
      overviewUsableWidthOk,
      minOverviewUsableWidth,
      overviewFirstScreenCoverageOk,
      overviewDesktopTopBandOk,
      overviewDesktopInfoDensityOk,
      overviewDesktopInfoBudgetOk,
      overviewReadonlyConsoleContractOk,
      overviewReadonlyConsoleContractProbe: {
        mode: isDesktopOverview ? 'desktop' : isMobileOverview ? 'mobile' : 'other',
        desktop: overviewFlatDesktopContractOk,
        mobile: overviewFlatMobileContractOk,
      },
      overviewDesktopNo72vhBlankOk,
      overviewDesktopWhitespaceBudgetOk,
      overviewDesktopEffectiveHeightOk,
      overviewDesktopEffectiveHeightProbe,
      overviewDesktopNo72vhBlankProbe: {
        summaryHeight: overviewSummaryMainRect ? Math.round(overviewSummaryMainRect.height) : null,
        detailTop: overviewDesktopDetailRect ? Math.round(overviewDesktopDetailRect.top) : null,
        viewportHeight: window.innerHeight,
      },
      overviewActionLinksLowChromeOk,
      overviewDesktopActionLinksUniqueOk,
      overviewGenericDetailTitleOk,
      overviewGenericDetailTitleSamples: overviewGenericDetailTitleNodes.map((node) => normalize(node.textContent || '')).slice(0, 8),
      overviewRepeatedRestSshOk,
      overviewNormalTagBudgetOk,
      overviewNormalTagLabels,
      overviewH1HeightOk,
      overviewTitleHeightSamples,
      overviewNoSnapshotDesktopFieldDensityOk,
      overviewNoSnapshotDesktopVisibleFieldCount,
      overviewNoSnapshotEffectiveFactCountOk,
      overviewVisibleFactCount,
      overviewNoSnapshotModuleCountOk,
      overviewNoSnapshotRequiredModuleNames,
      overviewNoSnapshotMissingRequiredModules,
      overviewNoSnapshotForbiddenVisibleModules,
      overviewNoSnapshotDuplicateModuleNames,
      overviewNoSnapshotRowHeightOk,
      overviewNoSnapshotRowHeightProbe: {
        limit: overviewNoSnapshotRowHeightLimit,
        max: overviewNoSnapshotRowHeightMax,
        rows: overviewNoSnapshotRowHeightSamples,
      },
      overviewRowHeightUpperBoundOk,
      overviewRowHeightUpperBoundProbe: {
        limit: overviewRowHeightUpperBoundLimit,
        violations: overviewRowHeightUpperBoundViolations,
        samples: overviewRowHeightUpperBoundSamples.slice(0, 12),
      },
      overviewNoSnapshotNoWanRateCardOk,
      overviewNoSnapshotUnifiedBusinessCopyOk,
      overviewNoSnapshotNoDuplicateBoundaryOk,
      overviewNoSnapshotFailureEndpointLedgerOk,
      overviewNoSnapshotLedgerStructureOk,
      overviewNoSnapshotMainVisualOk,
      overviewNoSnapshotMainVisualProbe: {
        summaryVisible: overviewNoSnapshotSummaryVisible,
        boundaryVisible: overviewNoSnapshotBoundaryVisible,
        coreModuleVisibility: overviewNoSnapshotCoreModuleVisibility,
        visibleWanTrend: overviewNoSnapshotVisibleWanTrend,
        coreText: overviewNoSnapshotCoreModuleText.slice(0, 220),
      },
      overviewNoSnapshotTopbarOk,
      overviewNoSnapshotTopbarProbe: {
        labels: overviewStatusBarLabels,
        cellCount: overviewStatusBarCells.length,
        text: overviewStatusBarText.slice(0, 180),
      },
      overviewNoSnapshotModuleFillOk,
      overviewNoSnapshotModuleFillProbe,
      overviewNoSnapshotDowngradeReasonsOk,
      overviewNoSnapshotRepetitionBudgetOk,
      overviewNoSnapshotRepeatedWordCounts,
      overviewNoSnapshotOpsLedgerCopyOk,
      overviewNoSnapshotAuditCopyCount,
      overviewIncidentWanRateFillerForbiddenOk,
      overviewCardBudgetOk,
      overviewCardBudgetProbe: {
        oldCardCount: overviewOldCardNodes.length,
        firstScreenChildren: isMobileOverview ? Array.from(mobileFirstScreen?.children || []).length : null,
      },
      overviewVisualBalanceOk,
      overviewVisualBalanceProbe: {
        selectorPriority: [
          '[data-overview-chart-type]',
          '[data-overview-visual-block]',
          '[data-overview-kpi-card]',
        ],
        selectorHits: {
          visualNodes: overviewVisualBalanceRawNodes.length,
          outerNodes: overviewVisualBalanceNodes.length,
          kpiCards: overviewDesktopKpiCount,
          tableNodes: overviewDesktopTableNodes.length,
          mobileTableNodes: overviewMobileFirstScreenTableNodes.length,
        },
        desktop: {
          visualTypes: overviewVisualBalanceTypes,
          visualTypeCount: overviewVisualBalanceTypeCount,
          hasLine: overviewDesktopVisualHasLine,
          hasBar: overviewDesktopVisualHasBar,
          hasStatusOrResource: overviewDesktopVisualHasStatusOrResource,
          tableAreaPx: overviewDesktopTableAreaPx,
          chartMatrixAreaPx: overviewDesktopChartMatrixAreaPx,
          viewportAreaPx: overviewDesktopViewportAreaPx,
          tableAreaRatio: overviewDesktopTableAreaRatio,
          chartMatrixAreaRatio: overviewDesktopChartMatrixAreaRatio,
          kpiCount: overviewDesktopKpiCount,
          kpiStructure: overviewDesktopKpiStructureRecords,
          placeholderCount: overviewVisualPlaceholderCount,
          placeholderTexts: overviewVisualPlaceholderNodes
            .map((node) => normalize(node.textContent || '').slice(0, 120))
            .filter(Boolean)
            .slice(0, 8),
          chartReadability: {
            ok: overviewChartReadabilityOk,
            desktopOk: overviewDesktopChartReadabilityOk,
            desktopRecords: overviewDesktopChartReadabilityRecords.slice(0, 8),
            sparseShells: overviewSparseTrafficShells.length,
            sparseReadouts: overviewSparseTrafficReadouts.length,
            metaNodes: overviewChartMetaNodes.length,
            metaText: overviewChartMetaText.slice(0, 220),
            readouts: overviewSparseTrafficReadoutRecords.slice(0, 4),
            trendReadoutCount: overviewTrendReadoutNodes.length,
            trendReadoutRealHeightOk: overviewTrendReadoutRealHeightOk,
            trendReadoutRects: overviewTrendReadoutNodes.slice(0, 6).map((node) => {
              const rect = node.getBoundingClientRect();
              return {
                text: normalize(node.textContent || '').slice(0, 80),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                clientHeight: node.clientHeight,
              };
            }),
            trendReadoutClipSamples: overviewTrendReadoutClipSamples.slice(0, 4),
          },
        },
        mobile: {
          tableCount: overviewMobileFirstScreenTableCount,
          tableSelectors: overviewMobileFirstScreenTableNodesUnique.map((node) => {
            if (!node) return '';
            if (node.id) return '#' + node.id;
            const dataAttr = Array.from(node.attributes || []).find((attr) => /^data-overview/.test(attr.name));
            if (dataAttr) return '[' + dataAttr.name + ']';
            const cls = Array.from(node.classList || []).slice(0, 3).join('.');
            return node.tagName.toLowerCase() + (cls ? '.' + cls : '');
          }).filter(Boolean).slice(0, 8),
        },
      },
      overviewSemanticColorBudgetOk,
      overviewSemanticColorBudgetProbe: {
        tintedBlocks: overviewLargeTintNodes.length,
        forbiddenSemanticColors: overviewForbiddenSemanticColorNodes.map((node) => ({
          tag: node.tagName,
          className: String(node.className || ''),
          text: normalize(node.textContent || '').slice(0, 80),
        })),
      },
      overviewFirstScreenFieldCount,
      overviewMobileCoreOk,
      overviewMobileCoreBlockContractOk: mobileCoreBlockContractOk,
      mobileCoreBlockContractOk,
      overviewMobileCoreChartMetaOk: mobileCoreChartMetaOk,
      mobileCoreChartMetaOk,
      overviewMobileNoLineChartsOk,
      mobileOverviewAppHomePass,
      overviewMobile390AcceptanceOk,
      overviewMobileIosRouterHomeOk,
      overviewMobile390FirstScreenNoTableOk,
      overviewMobile390NoKpi2x2Ok,
      overviewMobile390FirstScreenVisualOk,
      overviewMobile390NoMemDiskVisibleOk,
      overviewMobile390NoCpuMemDiskEnglishOk,
      mobile390EnglishResourceTextHits,
      overviewMobile390NoFocusPrimaryStatusOk,
      mobile390PrimaryStatusText,
      overviewMobile390NoTitleStatusCollisionOk,
      mobile390TitleClipRecords,
      overviewMobile390NoCardPileOk,
      mobile390CardSurfaceRecords,
      mobile390NestedCardSurfaceDepth,
      overviewMobile390ScenarioVisualKindOk,
      mobile390ScenarioVisualKindText,
      overviewMobile390BottomTabOk,
      overviewMobile390NoRawBooleanCopyOk,
      overviewMobile390NoRawRouterOsFieldsOk,
      overviewMobile390NoMainProgressBarOk,
      overviewMobile390NoHeavyVisualBlocksOk,
      overviewMobile390NoAppHomeTitleClipOk,
      overviewDesktopNoMobileAppChromeOk,
      overviewDesktopNoToyNavLeakOk,
      overviewDesktopNoContentIconTabsOk,
      overviewDesktopContentIconTabRecords,
      overviewDesktopHierarchyMarkerOk,
      overviewMobile390NoCoreTextClipOk,
      mobile390CoreTextClipSamples: mobile390CoreTextClipSamples.slice(0, 8),
      overviewMobileResourceFullVerticalOk,
      overviewMobile390AppHomeFirstOk,
      mobile390AppHomeTwinOk,
      mobile390AppHomeHeroMetricsOk,
      mobile390AppHomeResourceCardOk,
      mobile390AppHomeRankCardOk,
      mobile390AppHomeBottomTabOk,
      mobile390AppHomeScenarioVisualOk,
      mobile390AppHomeRingTrafficOk,
      overviewMobile390Probe: mobileOverview390x844 ? {
        tableCount: overviewMobileFirstScreenTableCount,
        kpi2x2Count: mobile390Kpi2x2MarkerNodes.length,
        kpi2x2Geometry: mobile390Kpi2x2GeometryRecords.slice(0, 4),
        hasHeroVisual: mobile390AppHomeChromeNodes.some((node) => node.classList.contains('ik-v159-network-hero') || node.classList.contains('ik-v240-hero') || node.hasAttribute('data-overview-mobile-v159-main-hero') || node.hasAttribute('data-overview-mobile-v240-hero')),
        hasIosNav: mobile390AppHomeChromeNodes.some((node) => node.classList.contains('ik-v159-nav') || node.classList.contains('ik-v240-nav') || node.classList.contains('ik-v420-nav') || node.hasAttribute('data-overview-mobile-v159-nav') || node.hasAttribute('data-overview-mobile-v240-nav')),
      hasHeroMetrics: mobile390AppHomeHeroMetricsOk,
      hasSecondaryCards: mobile390AppHomeTwinOk,
      hasResourceDeck: mobile390AppHomeResourceCardOk,
      hasRankCard: mobile390AppHomeRankCardOk,
      hasRingTraffic: mobile390AppHomeRingTrafficOk,
      noOldKpiStack: overviewMobile390NoOldKpiStackOk,
      scenarioVisualNotDecorative: mobile390ScenarioVisualNotDecorativeOk,
      scenarioVisualRecords: mobile390ScenarioVisualRecords.slice(0, 6),
      hasMiniVisual: mobileFirstScreenMiniVisual,
      hasPortMatrix: mobileFirstScreenPortMatrix,
        hasChannelVisual: mobileFirstScreenChannelVisual,
        hasChainVisual: mobileFirstScreenChainVisual,
        sceneVisualCount: mobileFirstScreenSceneVisualNodes.length,
        hasBottomTab: mobile390AppHomeBottomTabOk,
        firstScreenText: firstScreenOverviewText.slice(0, 260),
        rawRouterOsFields: mobile390RawRouterOsFieldRecords,
        mainProgressBars: mobile390MainProgressBarRecords,
        heavyVisualBlocks: mobile390HeavyVisualBlockRecords,
      } : null,
      overviewMobileOfflineBarSemanticsOk,
      overviewMobileCoreProbe: {
        keys: mobileCoreBlockKeys,
        labels: mobileCoreBlockLabels,
        chartMeta: mobileCoreChartMetaRecords,
        barCount: mobileCoreBarsVisible.length,
        firstScreenLineChartCount: mobileFirstScreenLineCharts.length,
        offlineBlueBars: mobileOfflineBlueBars,
      },
      overviewMobileArchitectureOk,
      overviewMobileFirstScreenContractOk,
      overviewMobileLedgerHeightOk,
      overviewNoSnapshotMobileInternalLabelsOk,
      overviewNoSnapshotMobileSingleColumnOk,
      overviewMobileLedgerHeightProbe: {
        statusHeight: mobileFlatStatusRect ? Math.round(mobileFlatStatusRect.height) : null,
        ledgerHeight: mobileLedgerHeight,
        detailOffset: mobileLeadPreviewRect && mobileFirstScreenRect ? Math.round(mobileLeadPreviewRect.top - mobileFirstScreenRect.top) : null,
      },
      overviewMobileWanIncidentPriorityOk,
      overviewMobileFirstScreenProbe: {
        firstScreenTop: mobileFirstScreenRect ? Math.round(mobileFirstScreenRect.top) : null,
        firstScreenBottom: mobileFirstScreenRect ? Math.round(mobileFirstScreenRect.bottom) : null,
        detailTop: mobileDetailRect ? Math.round(mobileDetailRect.top) : null,
        viewportHeight: window.innerHeight,
        metricTitles: mobileMetricTitles,
        actionText: normalize(mobileIncidentAction?.textContent || ''),
      },
      overviewMobileFlatStatusTableOk,
      overviewMobileFlatStatusTableProbe: {
        childCount: mobileFirstScreenChildren.length,
        childClasses: mobileFirstScreenChildren.slice(0, 3).map((node) => String(node.className || node.tagName || '').trim()),
        alertHeight: mobileAlertRect ? Math.round(mobileAlertRect.height) : null,
        incidentHeight: mobileIncidentRect ? Math.round(mobileIncidentRect.height) : null,
        metricsHeight: mobileMetricsRect ? Math.round(mobileMetricsRect.height) : null,
        flatContract: overviewFlatMobileContractOk,
        statusVerdict: mobileFlatStatusVerdictOk,
        evidence: mobileFlatEvidenceOk,
        noSnapshot: mobileFlatNoSnapshotOk,
        noSnapshotChecks: {
          hasMissing: /快照缺失/.test(mobileFlatStatusText),
          hasStatusUpdate: mobileFlatStatusText.includes('状态更新时间') && mobileFlatStatusText.includes('0s'),
          hasBusinessNoDisplay: /业务数据不展示|无业务快照/.test(mobileFlatStatusText),
          hasRouterDown: /RouterOS\\s*当前不可达/.test(mobileFlatStatusText),
          hasForbiddenFreshCopy: noSnapshotFreshCopyPattern.test(mobileFlatStatusText),
        },
        collection: mobileFlatCollectionOk,
        linkTexts: mobileFlatLinkTexts,
        statusRowText: mobileFlatStatusRowText,
        objectRowText: mobileFlatObjectRowText,
        evidenceRowText: mobileFlatEvidenceRowText,
      },
      overviewMobileAlertCardCompactOk,
      overviewMobileAlertCardCompactProbe: {
        alertHeight: mobileAlertRect ? Math.round(mobileAlertRect.height) : null,
        incidentHeight: mobileIncidentRect ? Math.round(mobileIncidentRect.height) : null,
        metricsHeight: mobileMetricsRect ? Math.round(mobileMetricsRect.height) : null,
      },
      overviewMobileDetailFirstTwoRowsVisibleOk,
      overviewMobileDetailFirstTwoRowsProbe: {
        rowCount: mobileDetailRows.length,
        visibleLeadingRows: mobileDetailRows.slice(0, 2).filter(nodeVisibleInFirstScreen).length,
        leadingRowTexts: mobileDetailRows.slice(0, 2).map((node) => normalize(node.textContent || '')).filter(Boolean),
      },
      overviewDesktopDetailFirstTwoRowsVisibleOk,
      overviewDesktopDetailFirstTwoRowsProbe: {
        rowCount: overviewDesktopDetail ? Array.from(overviewDesktopDetail.querySelectorAll('tbody tr, .ik-home-evidence-row, .ik-summary-box, [data-overview-field]') || []).length : 0,
        visibleLeadingRows: overviewDesktopDetail ? Array.from(overviewDesktopDetail.querySelectorAll('tbody tr, .ik-home-evidence-row, .ik-summary-box, [data-overview-field]') || []).slice(0, 2).filter(nodeVisibleInFirstScreen).length : 0,
      },
      overviewMobileNo72vhBlankOk,
      overviewMobileNo72vhBlankProbe: mobileFirstScreenCoverageProbe,
      overviewMobileProductVerdictOk,
      overviewMobileDispositionOk,
      overviewMobilePrimaryConclusionUniqueOk,
      overviewMobileUniqueVerdictOk,
      overviewMobileSamplingStateUniqueOk,
      overviewMobileActionLinksUniqueOk,
      overviewMobileCopyAssemblyOk,
      overviewSuggestionCopyUniqueOk,
      overviewMobileEvidenceTitleOk,
      overviewMobileUniqueVerdictProbe: {
        primaryCount: primaryConclusionNodes.length,
        alertPrimary: mobileAlertPrimaryText,
        incidentTitle: mobileIncidentTitleText,
        leadText: mobileIncidentTitleLeadText,
        supportText: mobileIncidentTitleSupportText,
      },
      overviewMobileEvidenceUniqueOk,
      overviewChineseUiNoEngineeringEnglishOk,
      overviewReadOnlyBoundaryOk,
      overviewNoSnapshotReadonlyBoundaryRepeatOk,
      overviewReadOnlyBoundaryProbe: {
        mainAlertTop: overviewMainAlertRect ? Math.round(overviewMainAlertRect.top) : null,
        firstEvidenceTop: overviewFirstEvidenceRect ? Math.round(overviewFirstEvidenceRect.top) : null,
        boundaryCount: readonlyBoundaryNodes.length,
        boundaryTops: readonlyBoundaryNodes.slice(0, 3).map((node) => Math.round(node.getBoundingClientRect().top)),
        boundaryRepeatCount: countOccurrences([
          overviewDesktopTopText,
          overviewDesktopDetailText,
          firstScreenOverviewText,
          mobileTop120Text,
        ].join(' '), '只读边界'),
      },
      mobileIncidentEvidenceRows,
      mobileAlarmProbe: mobileAlertRect ? {
        top: Math.round(mobileAlertRect.top),
        height: Math.round(mobileAlertRect.height),
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
      overviewMobileFirstScreenHardCompressionOk,
      overviewMobileFirstScreenHardCompressionProbe,
      overviewEffectiveFactAxesOk,
      overviewEffectiveFactAxes,
      overviewEffectiveFactsGateOk,
      overviewEffectiveFactsGateProbe: {
        minimum: overviewEffectiveFactMinimum,
        firstScreenFieldCount: overviewFirstScreenFieldCount,
        visibleFactCount: overviewVisibleFactCount,
        noSnapshotVisibleCellCount: overviewNoSnapshotVisibleCellCount,
      },
      overviewFirstScreenEllipsisOk,
      overviewFirstScreenEllipsisCount,
      overviewFirstScreenEllipsisSamples: ellipsisSamples.slice(0, 8),
      overviewCriticalEllipsisOk,
      overviewCriticalEllipsisSamples: criticalEllipsisSamples.slice(0, 8),
      overviewPrimaryConclusionNoEllipsisOk,
      overviewPrimaryConclusionEllipsisSamples: primaryConclusionEllipsisSamples.slice(0, 8),
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
      overviewAllOfflinePriorityObjectsOk,
      overviewAllOfflinePriorityObjectCount: overviewAllOfflineWanBlockNodes.length,
      overviewNoSnapshotFreshnessForbiddenOk,
      overviewNoSnapshotSamplingStateUniqueOk,
      overviewNoSnapshotDesktopEvidenceTripletOk,
      overviewNoSnapshotTrustedMetricsForbiddenOk,
      overviewNoSnapshotGridOk,
      overviewNoSnapshotFiveBlocksOk,
      overviewNoSnapshotFiveModuleRowCounts,
      overviewNoSnapshotDenseModuleOk,
      overviewNoSnapshotLedgerTitlesOk,
      overviewNoSnapshotVisibleDenseModuleCount,
      overviewNoSnapshotNoWanRateCardOk,
      overviewNoSnapshotNoDuplicateBoundaryOk,
      overviewNoSnapshotFailureEndpointLedgerOk,
      overviewNoSnapshotLedgerStructureOk,
      overviewNoSnapshotEffectiveFactCountOk,
      overviewNoSnapshotEffectiveVisibleFactCount,
      overviewNoSnapshotFakeDensityOk,
      overviewNoSnapshotNoGiantTablesOk,
      overviewNoSnapshotOpsLedgerCopyOk,
      overviewNoSnapshotAuditCopyCount,
      overviewNoSnapshotGridProbe: {
        columns: overviewNoSnapshotGridColumns,
        items: overviewNoSnapshotGridItems.length,
        denseModules: overviewNoSnapshotVisibleDenseModuleCount,
        visibleFields: overviewNoSnapshotDesktopVisibleFieldCount,
        visibleCells: overviewNoSnapshotVisibleCellCount,
        uniqueFacts: overviewVisibleFactCount,
        effectiveVisibleFacts: overviewNoSnapshotEffectiveVisibleFactCount,
        fakeDensityTokenCount: overviewNoSnapshotFakeDensityTokenCount,
        fakeDensityRatio: Number(overviewNoSnapshotFakeDensityRatio.toFixed(3)),
        giantTables: overviewNoSnapshotGiantTableRecords,
        legacyDowngradeModules: overviewNoSnapshotLegacyDowngradeModules.length,
        legacyBoundaryModules: overviewNoSnapshotLegacyBoundaryModules.length,
        boundaryRows: overviewNoSnapshotBoundaryDegradeRowCount,
        timelineRows: overviewNoSnapshotTimelineRowCount,
        boundaryTitleCount: overviewNoSnapshotBoundaryTitleCount,
        text: normalize(overviewNoSnapshotGrid?.textContent || '').slice(0, 260),
      },
      overviewCollectionLayerSplitOk,
      overviewCollectionTimelinePriorityOk,
      overviewCollectionContradictionOk,
      overviewCollectionTrustMarkersOk,
      overviewCollectionBusinessTrustCopyOk,
      overviewCollectionTerminalRankDeprioritizedOk,
      overviewCollectionRankOrderOk,
      overviewConsoleLanguageOk,
      overviewCollectionLayerProbe: {
        excerpt: combinedOverviewText.slice(0, 320),
        evidenceExcerpt: collectionLayerEvidenceText.slice(0, 520),
        checks: overviewCollectionLayerChecks,
        collectionRankAnchorIndex: overviewCollectionRankAnchorIndex,
        collectionRankIndex: overviewCollectionRankIndex,
      },
      overviewInterfacesChannelConsistencyOk,
      overviewInterfacesForwardingFirstOk,
      overviewMobileInterfacesFirstOk,
      overviewMobileInterfaceRowFormatOk,
      overviewInterfacesForwardingProbe: {
        firstDetailModule: overviewDesktopFirstDetailModuleName,
        mobileLeadIsInterfaceTable,
        mobileLeadTitle: mobileLeadPreviewTitle,
        mobileLeadText: mobileLeadPreviewText.slice(0, 220),
        mobileInterfaceRows: mobileInterfaceRowSamples.slice(0, 6),
        excerpt: (combinedOverviewText + ' ' + overviewDesktopDetailText).slice(0, 320),
      },
      overviewInterfacesDownCollectionParityOk,
      overviewRestSshSourceConsistencyOk,
      overviewRestSshViewportParityOk,
      overviewStatusBusFixedGrammarOk,
      overviewLongTimestampForbiddenOk,
      overviewReadOnlyFactToneOk,
      overviewLongTimestampForbiddenProbe: {
        excerpt: overviewVisibleTimestampText.slice(0, 260),
      },
      overviewStatusBusFixedGrammarProbe: {
        labels: overviewStatusBarLabels,
        excerpt: overviewDesktopTopText.slice(0, 260),
      },
      overviewResourceFirstScreenPriorityOk,
      overviewResourceFirstScreenWanTrendForbiddenOk,
      overviewResourceFirstScreenEffectiveFactsOk,
      overviewResourceEffectiveVisibleFactCount,
      overviewResourceSpecificModulesOk,
      overviewResourceSpecificModuleCount,
      overviewResourceSpecificModuleChecks,
      overviewResourceSupplementalFactChecks,
      overviewResourceModuleFillOk,
      overviewResourceFinalOrderOk,
      overviewResourceFinalOrderProbe: {
        names: overviewResourceFinalOrderNames,
        indexes: overviewResourceFinalOrderIndexes,
        missing: overviewResourceFinalOrderMissing,
        duplicates: overviewResourceFinalOrderDuplicateModules,
      },
      overviewResourceModuleFillProbe,
      overviewResourceFirstScreenPriorityProbe: {
        moduleTitles: overviewFirstScreenModuleTitles,
        resourceThresholdTitleCount: overviewResourceThresholdTitleCount,
        firstScreenFieldCount: overviewFirstScreenFieldCount,
        visibleFactCount: overviewVisibleFactCount,
        effectiveVisibleFactCount: overviewResourceEffectiveVisibleFactCount,
        activePriorityLabels,
        firstEvidenceCategory: overviewFirstEvidenceCategory,
        expectedRiskEvidenceCategory,
        contentFillRatio: overviewBlankProbe ? overviewBlankProbe.contentFillRatio : null,
        rightFillRatio: overviewDesktopRightFillProbe ? overviewDesktopRightFillProbe.ratio : null,
        text: overviewResourceFirstScreenText.slice(0, 260),
      },
      overviewFirstScreenDedupeOk,
      overviewDesktopFirstScreenDedupeOk,
      overviewCrossViewportCopyDedupeOk,
      overviewFirstScreenDedupeProbe: {
        sampleRepeats: firstScreenSampleRepeats,
        actionRepeats: firstScreenActionRepeats,
        excerpt: firstScreenOverviewText.slice(0, 260),
      },
      overviewSingleHistoricalPriorityOk,
      overviewResourceFullIncidentOk,
      overviewResourceNumericDensityOk,
      overviewResourceDurationVisibilityOk,
      overviewResourceTrendOk,
      overviewMobileTerminalSingleLineOk,
      overviewMobileTerminalSmallCount: visibleMobileTerminalSmallNodes.length,
      loadAuditResourceProbe: {
        cardCount: loadAuditResourceCards.length,
        thresholdLines: loadAuditThresholdLines,
        hasThresholdHeader: loadAuditResourceText.includes('阈/持续/均/峰'),
        text: loadAuditResourceText.slice(0, 260),
      },
      overviewResourceFullIncidentProbe: {
        hasCpu: /CPU\\s*96|处理器\\s*96/.test(combinedOverviewText),
        hasMemory: /(?:内存|MEM)\\s*92/.test(combinedOverviewText),
        hasDisk: /(?:磁盘|DISK)\\s*97/.test(combinedOverviewText),
        hasConnectionPressure: /连接|活动/.test(combinedOverviewText),
        hasPeak: /峰/.test(combinedOverviewText),
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
      overviewWanListPriorityOk,
      overviewWanEvidencePriorityOk,
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
      overviewHistoryTitlePrefixOk,
      overviewHistoryPromptVisibleText,
      overviewNoSnapshotSemanticOk,
      overviewNoSnapshotSemanticProbe: {
        checks: overviewNoSnapshotSemanticChecks,
        repeatedWordCounts: overviewNoSnapshotRepeatedWordCounts,
        repeatedTokenBudget: overviewNoSnapshotRepeatedTokenBudget,
        downgradeReasonsOk: overviewNoSnapshotDowngradeReasonsOk,
        repetitionBudgetOk: overviewNoSnapshotRepetitionBudgetOk,
        noWanRateCardOk: overviewNoSnapshotNoWanRateCardOk,
        unifiedBusinessCopyOk: overviewNoSnapshotUnifiedBusinessCopyOk,
        incidentWanRateFillerForbiddenOk: overviewIncidentWanRateFillerForbiddenOk,
        firstScreenRateForbiddenOk: overviewNoSnapshotFirstScreenRateForbiddenOk,
        duplicateModuleTitlesOk: overviewNoSnapshotDuplicateModuleTitles.length === 0,
        duplicateModuleTitles: overviewNoSnapshotDuplicateModuleTitles,
        moduleTitleCount: overviewNoSnapshotVisibleModuleTitles.length,
        denseModuleCount: overviewNoSnapshotVisibleDenseModuleCount,
        noDuplicateBoundaryOk: overviewNoSnapshotNoDuplicateBoundaryOk,
        failureEndpointLedgerOk: overviewNoSnapshotFailureEndpointLedgerOk,
        failureEndpointUnrecordedOk: overviewNoSnapshotFailureEndpointUnrecordedOk,
        ledgerStructureOk: overviewNoSnapshotLedgerStructureOk,
        topbarOk: overviewNoSnapshotTopbarOk,
        effectiveFactsOk: overviewNoSnapshotEffectiveFactsOk,
        effectiveFactCountOk: overviewNoSnapshotEffectiveFactCountOk,
        stateExcerpt: noSnapshotStateText.slice(0, 360),
        excerpt: combinedOverviewText.slice(0, 260),
      },
      overviewDefaultRouteSnapshotSemanticsOk,
      overviewDefaultRouteRawFactsOk,
      overviewDefaultRouteSemanticUndeterminedOk,
      defaultRouteSnapshotText,
      overviewBlankAreaOk,
      overviewBlankProbe,
      overviewDesktopRightFillOk,
      overviewDesktopRightFillProbe,
      overviewDesktopFocusedHierarchyOk,
      overviewDesktopFocusedHierarchyProbe,
      overviewDesktopColumnContinuityOk,
      overviewDesktopColumnContinuityProbe,
      overviewDesktopTopBandOk,
      overviewDesktopTopBandProbe,
      overviewDesktopFlatStatusBarOk,
      overviewDesktopFlatStatusBarProbe: {
        cellCount: overviewStatusBarCells.length,
        visibleCellCount: overviewStatusBarVisibleCells.length,
        height: overviewStatusBarRect ? Math.round(overviewStatusBarRect.height) : null,
        style: overviewStatusBarStyle ? {
          display: overviewStatusBarStyle.display,
          backgroundColor: overviewStatusBarStyle.backgroundColor,
          backgroundImage: overviewStatusBarStyle.backgroundImage,
          boxShadow: overviewStatusBarStyle.boxShadow,
          borderTopWidth: overviewStatusBarStyle.borderTopWidth,
          borderRadius: overviewStatusBarStyle.borderTopLeftRadius,
        } : null,
      },
      overviewDesktopTableDensityOk,
      overviewDesktopTableDensityProbe: {
        detailTableCount: overviewDesktopDetail ? overviewDesktopDetail.querySelectorAll('table').length : 0,
        detailWrapCount: overviewDesktopDetail ? overviewDesktopDetail.querySelectorAll('.ops-table-wrap').length : 0,
        densityModuleCount: overviewDensityModules.length,
      },
      overviewDesktopDetailFirstTwoRowsVisibleOk,
      overviewDesktopDetailFirstTwoRowsProbe: {
        rowCount: overviewDesktopDetail ? Array.from(overviewDesktopDetail.querySelectorAll('tbody tr, .ik-home-evidence-row, .ik-summary-box, [data-overview-field]') || []).length : 0,
        visibleLeadingRows: overviewDesktopDetail ? Array.from(overviewDesktopDetail.querySelectorAll('tbody tr, .ik-home-evidence-row, .ik-summary-box, [data-overview-field]') || []).slice(0, 2).filter(nodeVisibleInFirstScreen).length : 0,
      },
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
  return result.result && result.result.value;
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
  for (let attempt = 1; attempt <= 2; attempt += 1) {
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
      break;
    } catch (error) {
      lastError = error;
      if (attempt === 1) await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }
  if (!shot) throw lastError || new Error('screenshot capture failed');
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.from(shot.data, 'base64'));
}

async function runBrowserChecks(args, report, baseUrl) {
  const profiles = args.profile === 'both' ? ['public', 'private'] : [args.profile];
  for (const profile of profiles) {
    const sections = args.sections || (profile === 'private' ? DEFAULT_PRIVATE_SECTIONS : DEFAULT_PUBLIC_SECTIONS);
    for (const scaleScenario of args.scaleScenarios) {
      for (const viewport of args.viewports) {
        const browser = await launchBrowser(args, report);
        report.browser = { path: browser.browserPath };
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
            if (section === 'overview' || !preScreenshotPass) {
              const fileName = `${profile}-${scaleScenario}-${viewport.name}-${section}.png`.replace(/[^A-Za-z0-9_.-]+/g, '-');
              const screenshotPath = path.join(args.out, fileName);
              await withTimeout(
                captureScreenshot(cdp, screenshotPath),
                20000,
                `screenshot ${profile}/${scaleScenario}/${viewport.name}/${section}`,
              )
                .then(() => {
                  inspection.screenshot = fileName;
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
          await withTimeout(browser.stop(), 8000, 'browser stop').catch((error) => {
            warn(report, 'browser stop timed out', { error: error.message });
          });
        }
      }
    }
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
  if (scaleScenario === 'single') {
    const stale = new Date(Date.now() - ((24 * 24 + 8) * 60 * 60 * 1000)).toISOString();
    snapshot.updatedAt = stale;
    snapshot.meta.realtimeUpdatedAt = stale;
    snapshot.meta.slowRestUpdatedAt = stale;
    snapshot.meta.staticUpdatedAt = stale;
    snapshot.meta.connectionDetailUpdatedAt = stale;
    snapshot.meta.connectionProtocolUpdatedAt = stale;
    snapshot.meta.capabilities.restTrusted = true;
    snapshot.meta.capabilities.sshRead = false;
    snapshot.meta.capabilities.sshLabel = 'SSH 依赖缺失';
    setFixtureFinding(snapshot, 'warning', 'Historical single WAN snapshot', '单 WAN 1/1 在线，但业务快照已陈旧，当前影响未知。', [
      { label: 'WAN', value: '1/1 在线' },
      { label: '业务快照年龄', value: '24d8h' },
      { label: 'SSH', value: '依赖缺失' },
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
