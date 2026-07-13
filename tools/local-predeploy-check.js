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
  throw lastError ||×»×«h‘éì¶»§q«^uÉ=Lƒ¢ö³–>G¦v‹’â7–>¿žR œì(€€€µ…É­]…¹=™™±¥¹”¡Í¹…ÁÍ¡½Ð°ì¥¹±Õ‘•1…¸èÑÉÕ”ô¤ì(€€€Í•Ñ¥áÑÕÉ•¥¹‘¥¹œ¡Í¹…ÁÍ¡½Ð°€É¥Ñ¥…°œ°€%¹Ñ•É™…•Ì‘½Ý¸œ°€±°¥¹Ñ•É™…•Ì…É”‘½Ý¸¥¸Ñ¡”•‘”™¥áÑÕÉ”¸œ°l(€€€€€ì±…‰•°è€¥¹Ñ•É™…•Í½Ý¸œ°Ù…±Õ”èMÑÉ¥¹œ ¡Í¹…ÁÍ¡½Ð¹¥¹Ñ•É™…•Ìñðmt¤¹±•¹Ñ ¤ô°(€€€t¤ì(€ô(€É•™É•Í¡¥áÑÕÉ•½Õ¹ÑÌ¡Í¹…ÁÍ¡½Ð°Í…±•M•¹…É¥¼¤ì)ô()™Õ¹Ñ¥½¸…ÁÁ±åM…±•M•¹…É¥¼¡Í¹…ÁÍ¡½Ð°Í…±•M•¹…É¥¼¤ì(€½¹ÍÐ•‘•½Õ¹ÑÌ€ôì(€€€€…±°µ½™™±¥¹”œèìÝ…¸è€à°Ñ•Éµ¥¹…±Ìè€ÈÐô°(€€€€¹¼µÍ¹…ÁÍ¡½ÐœèìÝ…¸è€À°Ñ•Éµ¥¹…±Ìè€Àô°(€€€€½±±•Ñ¥½¸µ‘½Ý¸œèìÝ…¸è€Ð°Ñ•Éµ¥¹…±Ìè€ÈÐô°(€€€€É•Í½ÕÉ”µ™Õ±°œèìÝ…¸è€Ð°Ñ•Éµ¥¹…±Ìè€ÈÐô°(€€€€¥¹Ñ•É™…•Ìµ‘½Ý¸œèìÝ…¸è€Ð°Ñ•Éµ¥¹…±Ìè€ÈÐô°(€ôì(€½¹ÍÐ½Õ¹ÑÌ€ô•‘•½Õ¹ÑÍmÍ…±•M•¹…É¥½tñð€¡Í…±•M•¹…É¥¼€ôôô€Í¥¹±”œ(€€€€üìÝ…¸è€Ä°Ñ•Éµ¥¹…±Ìè€àô(€€€€èÍ…±•M•¹…É¥¼€ôôô€™±••Ðœ(€€€€€€üìÝ…¸è€ØÐ°Ñ•Éµ¥¹…±Ìè€ÄàÀô(€€€€€€èìÝ…¸è€Ð°Ñ•Éµ¥¹…±Ìè€ÈÐô¤ì(€½¹ÍÐÝ…¸€ôÉÉ…ä¹™É½´¡ì±•¹Ñ è½Õ¹ÑÌ¹Ý…¸ô°€¡|°¥¹‘•à¤€ôøµ…­•]…¸¡¥¹‘•à¤¤ì(€½¹ÍÐÑ•Éµ¥¹…±Ì€ôÉÉ…ä¹™É½´¡ì±•¹Ñ è½Õ¹ÑÌ¹Ñ•Éµ¥¹…±Ìô°€¡|°¥¹‘•à¤€ôøµ…­•Q•Éµ¥¹…°¡¥¹‘•à¤¤ì(€½¹ÍÐ±…¸€ôì(€€€¹…µ”è€‰É¥‘”µ±…¸œ°(€€€ÑåÁ”è€‰É¥‘”œ°(€€€ÉÕ¹¹¥¹œèÑÉÕ”°(€€€‘¥Í…‰±•è™…±Í”°(€€€µ…Œè€œÀÈèÀÀèÀÀèÀÀèÄÀèÀÄœ°(€€€¥ÁÌèlœÄäÈ¸ÄØà¸àà¸Ä¼ÈÐœ°€™ÀÀèààèèÄ¼ØÐt°(€€€ÉáI…Ñ”èÑ•Éµ¥¹…±Ì¹É•‘Õ” ¡ÍÕ´°É½Ü¤€ôøÍÕ´€¬É½Ü¹‘½Ý¹I…Ñ”°€À¤°(€€€ÑáI…Ñ”èÑ•Éµ¥¹…±Ì¹É•‘Õ” ¡ÍÕ´°É½Ü¤€ôøÍÕ´€¬É½Ü¹ÕÁI…Ñ”°€À¤°(€€€Éá	åÑ•Ìè€Å|äÀÁ|ÀÀÁ|ÀÀÀ°(€€€Ñá	åÑ•Ìè€äÀÁ|ÀÀÁ|ÀÀÀ°(€€€ÉáA…­•Ðè€É|ÐÀÁ|ÀÀÀ°(€€€ÑáA…­•Ðè€Å|ÜÈÁ|ÀÀÀ°(€€€ÉáÉ½ÀèÍ…±•M•¹…É¥¼€ôôô€™±••Ðœ€ü€Ì€è€À°(€€€ÑáÉ½Àè€À°(€€€ÉáÉÉ½Èè€À°(€€€ÑáÉÉ½Èè€À°(€ôì(€Í¹…ÁÍ¡½Ð¹¥¹Ñ•É™…•Ì€ôl(€€€€¸¸¹Ý…¸¹µ…À ¡É½Ü°¥¹‘•à¤€ôø€¡ì(€€€€€¹…µ”èÉ½Ü¹¹…µ”°(€€€€€ÑåÁ”è€ÁÁÁ½”µ½ÕÐœ°(€€€€€ÉÕ¹¹¥¹œèÉ½Ü¹ÉÕ¹¹¥¹œ°(€€€€€‘¥Í…‰±•è™…±Í”°(€€€€€µ…Œè€ÀÈèÀÀèÀÀèÀÀèÀÄè‘íMÑÉ¥¹œ¡¥¹‘•à€¬€Ä¤¹Á…‘MÑ…ÉÐ È°€œÀœ¥õ€°(€€€€€¥ÁÌèÉ½Ü¹…‘‘É•ÍÍ•Ì°(€€€€€ÉáI…Ñ”èÉ½Ü¹‘½Ý¹I…Ñ”°(€€€€€ÑáI…Ñ”èÉ½Ü¹ÕÁI…Ñ”°(€€€€€Éá	åÑ•ÌèÉ½Ü¹Éá	åÑ•Ì°(€€€€€Ñá	åÑ•ÌèÉ½Ü¹Ñá	åÑ•Ì°(€€€€€ÉáA…­•Ðè€äÀÁ|ÀÀÀ€¬¥¹‘•à°(€€€€€ÑáA…­•Ðè€ÜÀÁ|ÀÀÀ€¬¥¹‘•à°(€€€€€ÉáÉ½Àè¥¹‘•à€”€Ää€ôôô€À€˜˜¥¹‘•à€ø€À€ü€Ä€è€À°(€€€€€ÑáÉ½Àè€À°(€€€€€ÉáÉÉ½Èè€À°(€€€€€ÑáÉÉ½Èè€À°(€€€€€É½±”è€]8œ°(€€€ô¤¤°(€€€±…¸°(€tì(€Í¹…ÁÍ¡½Ð¹Ý…¸€ôÝ…¸ì(€Í¹…ÁÍ¡½Ð¹ÁÁÁ½”€ôÝ…¸¹µ…À ¡É½Ü¤€ôø€¡ì€¸¸¹É½Ü°¹…µ”èÉ½Ü¹¹…µ”ô¤¤ì(€Í¹…ÁÍ¡½Ð¹Ñ•Éµ¥¹…±Ì€ôÑ•Éµ¥¹…±Ìì(€Í¹…ÁÍ¡½Ð¹…ÉÀ¹¥Ñ•µÌ€ôÑ•Éµ¥¹…±Ì¹Í±¥” À°€ÄÈÀ¤¹µ…À ¡É½Ü¤€ôø€¡ì(€€€…‘‘É•ÍÌèÉ½Ü¹¥À°(€€€¥ÀèÉ½Ü¹¥À°(€€€µ…ŒèÉ½Ü¹µ…Œ°(€€€¡½ÍÑ¹…µ”èÉ½Ü¹¡½ÍÑ¹…µ”°(€€€‘¥ÍÁ±…å9…µ”èÉ½Ü¹‘¥ÍÁ±…å9…µ”°(€€€ÍÑ…ÑÕÌèÉ½Ü¹ÍÑ…ÑÕÌ€ôôô€‰½Õ¹œ€ü€É•…¡…‰±”œ€è€ÍÑ…±”œ°(€€€‘å¹…µ¥ŒèÑÉÕ”°(€ô¤¤ì(€Í¹…ÁÍ¡½Ð¹‘¡À¹±•…Í•Ì€ôÑ•Éµ¥¹…±Ì¹Í±¥” À°€ÄÈÀ¤¹µ…À ¡É½Ü¤€ôø€¡ì(€€€…‘‘É•ÍÌèÉ½Ü¹¥À°(€€€µ…ŒèÉ½Ü¹µ…Œ°(€€€¡½ÍÑ¹…µ”èÉ½Ü¹¡½ÍÑ¹…µ”°(€€€‘¥ÍÁ±…å9…µ”èÉ½Ü¹‘¥ÍÁ±…å9…µ”°(€€€Í•ÉÙ•Èè€‘¡Àµ±…¸œ°(€€€ÍÑ…ÑÕÌèÉ½Ü¹ÍÑ…ÑÕÌ€ôôô€‰½Õ¹œ€ü€‰½Õ¹œ€è€Ý…¥Ñ¥¹œœ°(€€€ÍÑ…Ñ¥Œè™…±Í”°(€€€‘å¹…µ¥ŒèÑÉÕ”°(€€€±…ÍÑM••¸èÉ½Ü¹±…ÍÑM••¸°(€ô¤¤ì(€Í¹…ÁÍ¡½Ð¹½¹¹•Ñ¥½¹Ì¹Ñ½Ñ…°€ôÍ…±•M•¹…É¥¼€ôôô€™±••Ðœ€ü€ÄÈÔÀÀÀ€èÍ…±•M•¹…É¥¼€ôôô€Í¥¹±”œ€ü€ÄàÀ€è€ÈÐÀÀì(€Í¹…ÁÍ¡½Ð¹½¹¹•Ñ¥½¹Ì¹…Ñ¥Ù”€ôÑ•Éµ¥¹…±Ì¹Í±¥” À°€àÀ¤¹µ…À ¡É½Ü°¥¹‘•à¤€ôø€¡ì(€€€ÍÉŒèÉ½Ü¹¥À°(€€€±½…±%ÀèÉ½Ü¹¥À°(€€€‘ÍÐè€ÈÀÌ¸À¸ÄÄÌ¸‘ìÈÀ€¬€¡¥¹‘•à€”€ÄÈÀ¥õ€°(€€€É•µ½Ñ•%Àè€ÈÀÌ¸À¸ÄÄÌ¸‘ìÈÀ€¬€¡¥¹‘•à€”€ÄÈÀ¥õ€°(€€€ÁÉ½Ñ½½°è¥¹‘•à€”€Ì€ôôô€À€ü€Õ‘Àœ€è€ÑÀœ°(€€€‘ÍÑA½ÉÐè¥¹‘•à€”€Ì€ôôô€À€ü€ÐÐÌ€è€àÀ°(€€€Ñ¥µ•½ÕÐè€‘ìÈÀ€¬¥¹‘•áõÍ€°(€€€ÕÁI…Ñ”èÉ½Ü¹ÕÁI…Ñ”°(€€€‘½Ý¹I…Ñ”èÉ½Ü¹‘½Ý¹I…Ñ”°(€€€Í•ÍÍ¥½¹	åÑ•ÌèÉ½Ü¹Í•ÍÍ¥½¹	åÑ•Ì°(€€€µ…É¬è¥¹‘•à€”€È€ü€Ý…¸µ•Ù•¸œ€è€Ý…¸µ½‘œ°(€ô¤¤ì(€Í¹…ÁÍ¡½Ð¹½¹¹•Ñ¥½¹Ì¹ÁÉ½Ñ½½±Q½À€ô‰Õ¥±‘AÉ½Ñ½½±Q½À¡Í¹…ÁÍ¡½Ð¹½¹¹•Ñ¥½¹Ì¹…Ñ¥Ù”¤ì(€Í¹…ÁÍ¡½Ð¹½¹¹•Ñ¥½¹Ì¹µ•Ñ„€ôì(€€€€¸¸¸¡Í¹…ÁÍ¡½Ð¹½¹¹•Ñ¥½¹Ì¹µ•Ñ„ñðíô¤°(€€€ÁÉ½Ñ½½±Q½Àèì(€€€€€…ÑÕ…±½Õ¹ÐèÍ¹…ÁÍ¡½Ð¹½¹¹•Ñ¥½¹Ì¹ÁÉ½Ñ½½±Q½À¹±•¹Ñ °(€€€€€Ñ½Ñ…±½Õ¹ÐèÍ¹…ÁÍ¡½Ð¹½¹¹•Ñ¥½¹Ì¹ÁÉ½Ñ½½±Q½À¹±•¹Ñ °(€€€€€Í¡½Ý¹½Õ¹ÐèÍ¹…ÁÍ¡½Ð¹½¹¹•Ñ¥½¹Ì¹ÁÉ½Ñ½½±Q½À¹±•¹Ñ °(€€€€€¡…Í5½É”è™…±Í”°(€€€€€Í…µÁ±•èÑÉÕ”°(€€€€€Í…µÁ±•5•Ñ¡½è€…Ñ¥Ù”½¹¹•Ñ¥½¸‘•Ñ…¥°Í…µÁ±”É½ÕÁ•‰äÁÉ½Ñ½½°½½¹¹•Ñ¥½¸µ…É¬œ°(€€€€€Í½ÉÑ•‘	äè€ÑÉ…™™¥Œ½½¹¹•Ñ¥½¹Ìœ°(€€€ô°(€ôì(€Í¹…ÁÍ¡½Ð¹½¹¹•Ñ¥½¹Ì¹Ñ½Á%ÁÌ€ôÑ•Éµ¥¹…±Ì¹Í±¥” À°€ÐÀ¤¹µ…À ¡É½Ü¤€ôø€¡ì(€€€¥ÀèÉ½Ü¹¥À°(€€€‘¥ÍÁ±…å9…µ”èÉ½Ü¹‘¥ÍÁ±…å9…µ”°(€€€½Õ¹ÐèÉ½Ü¹½¹¹•Ñ¥½¹½Õ¹Ð°(€€€½¹¹•Ñ¥½¹ÌèÉ½Ü¹½¹¹•Ñ¥½¹½Õ¹Ð°(€€€ÕÁI…Ñ”èÉ½Ü¹ÕÁI…Ñ”°(€€€‘½Ý¹I…Ñ”èÉ½Ü¹‘½Ý¹I…Ñ”°(€ô¤¤ì(€Í¹…ÁÍ¡½Ð¹±½…‘	…±…¹”¹‘¥ÍÑÉ¥‰ÕÑ¥½¸€ôÝ…¸¹µ…À ¡É½Ü¤€ôø€¡ì(€€€¹…µ”èÉ½Ü¹¹…µ”°(€€€Í¡…É”èÝ…¸¹±•¹Ñ €ü9Õµ‰•È  ÄÀÀ€¼Ý…¸¹±•¹Ñ ¤¹Ñ½¥á• È¤¤€è€À°(€€€…Ñ¥Ù”èÉ½Ü¹ÉÕ¹¹¥¹œ°(€€€ÕÁI…Ñ”èÉ½Ü¹ÕÁI…Ñ”°(€€€‘½Ý¹I…Ñ”èÉ½Ü¹‘½Ý¹I…Ñ”°(€ô¤¤ì(€Í¹…ÁÍ¡½Ð¹É½ÕÑ•Ì¹‘•™…Õ±ÑI½ÕÑ•Ì€ôÝ…¸¹µ…À ¡É½Ü°¥¹‘•à¤€ôø€¡ì(€€€‘ÍÐè€œÀ¸À¸À¸À¼Àœ°(€€€…Ñ•Ý…äèÉ½Ü¹¹…µ”°(€€€‘¥ÍÑ…¹”è¥¹‘•à€¬€Ä°(€€€…Ñ¥Ù”èÉ½Ü¹ÉÕ¹¹¥¹œ°(€€€ÍÑ…Ñ¥ŒèÑÉÕ”°(€€€‘¥Í…‰±•è™…±Í”°(€€€Ñ…‰±”è¥¹‘•à€ôôô€À€ü€µ…¥¸œ€èÝ…¸´‘í¥¹‘•à€¬€Åõ€°(€ô¤¤ì(€½¹ÍÐÕÁQ½Ñ…°€ôÝ…¸¹É•‘Õ” ¡ÍÕ´°É½Ü¤€ôøÍÕ´€¬É½Ü¹ÕÁI…Ñ”°€À¤ì(€½¹ÍÐ‘½Ý¹Q½Ñ…°€ôÝ…¸¹É•‘Õ” ¡ÍÕ´°É½Ü¤€ôøÍÕ´€¬É½Ü¹‘½Ý¹I…Ñ”°€À¤ì(€Í¹…ÁÍ¡½Ð¹½Ù•ÉÙ¥•Ü¹ÕÁ±¥¹­	ÁÌ€ôÕÁQ½Ñ…°ì(€Í¹…ÁÍ¡½Ð¹½Ù•ÉÙ¥•Ü¹‘½Ý¹±¥¹­	ÁÌ€ô‘½Ý¹Q½Ñ…°ì(€Í¹…ÁÍ¡½Ð¹½Ù•ÉÙ¥•Ü¹Ý…¹UÁI…Ñ”€ôÕÁQ½Ñ…°ì(€Í¹…ÁÍ¡½Ð¹½Ù•ÉÙ¥•Ü¹Ý…¹½Ý¹I…Ñ”€ô‘½Ý¹Q½Ñ…°ì(€Í¹…ÁÍ¡½Ð¹½Ù•ÉÙ¥•Ü¹½¹±¥¹•Q•Éµ¥¹…±Ì€ôÑ•Éµ¥¹…±Ì¹±•¹Ñ ì(€Í¹…ÁÍ¡½Ð¹½Ù•ÉÙ¥•Ü¹Ñ•Éµ¥¹…±½Õ¹Ð€ôÑ•Éµ¥¹…±Ì¹±•¹Ñ ì(€Í¹…ÁÍ¡½Ð¹½Ù•ÉÙ¥•Ü¹¥¹Ñ•É™…•½Õ¹Ð€ôÍ¹…ÁÍ¡½Ð¹¥¹Ñ•É™…•Ì¹±•¹Ñ ì(€Í¹…ÁÍ¡½Ð¹½Ù•ÉÙ¥•Ü¹½¹¹•Ñ¥½¹Q½Ñ…°€ôÍ¹…ÁÍ¡½Ð¹½¹¹•Ñ¥½¹Ì¹Ñ½Ñ…°ì(€Í¹…ÁÍ¡½Ð¹µ•Ñ„¹ÁÁÁ½•½Õ¹Ð€ôÝ…¸¹±•¹Ñ ì(€Í¹…ÁÍ¡½Ð¹µ•Ñ„¹Ý…¹½Õ¹Ð€ôÝ…¸¹±•¹Ñ ì(€Í¹…ÁÍ¡½Ð¹µ•Ñ„¹±¥¹•½Õ¹Ð€ôÝ…¸¹±•¹Ñ ì(€Í¹…ÁÍ¡½Ð¹µ•Ñ„¹±¥¹•1…å½ÕÑQ¥•È€ô±¥¹•1…å½ÕÑQ¥•È¡Ý…¸¹±•¹Ñ ¤ì(€Í¹…ÁÍ¡½Ð¹µ•Ñ„¹Í…±•M•¹…É¥¼€ôÍ…±•M•¹…É¥¼ì(€Í¹…ÁÍ¡½Ð¹µ•Ñ„¹Í…±”€ôì(€€€Ý…¸è±¥ÍÑM…±•5•Ñ„¡Ý…¸¹±•¹Ñ °Ý…¸¹±•¹Ñ °Ý…¸¹±•¹Ñ °™…±Í”°€œœ°€¹…ÑÕÉ…°¹…µ”œ°lÍÑ…ÑÕÌœ°€Á…É•¹Ðœ°€É½ÕÑ•Q…‰±”t¤°(€€€ÁÁÁ½”è±¥ÍÑM…±•5•Ñ„¡Ý…¸¹±•¹Ñ °Ý…¸¹±•¹Ñ °Ý…¸¹±•¹Ñ °™…±Í”°€œœ°€¹…ÑÕÉ…°¹…µ”œ¤°(€€€¥¹Ñ•É™…•Ìè±¥ÍÑM…±•5•Ñ„¡Í¹…ÁÍ¡½Ð¹¥¹Ñ•É™…•Ì¹±•¹Ñ °Í¹…ÁÍ¡½Ð¹¥¹Ñ•É™…•Ì¹±•¹Ñ °Í¹…ÁÍ¡½Ð¹¥¹Ñ•É™…•Ì¹±•¹Ñ °™…±Í”°€œœ°€É½±”½¹…µ”œ°lÉ½±”œ°€ÑåÁ”œ°€ÍÑ…ÑÕÌt¤°(€€€Ñ•Éµ¥¹…±Ìè±¥ÍÑM…±•5•Ñ„¡Ñ•Éµ¥¹…±Ì¹±•¹Ñ °Ñ•Éµ¥¹…±Ì¹±•¹Ñ °Ñ•Éµ¥¹…±Ì¹±•¹Ñ °™…±Í”°€œœ°€ÑÉ…™™¥Œ½½¹¹•Ñ¥½¹Ìœ°lÍÑ…ÑÕÌœ°€Í½ÕÉ”t¤°(€€€…ÉÀè±¥ÍÑM…±•5•Ñ„¡Ñ•Éµ¥¹…±Ì¹±•¹Ñ °Í¹…ÁÍ¡½Ð¹…ÉÀ¹¥Ñ•µÌ¹±•¹Ñ °€ÄÈÀ°Ñ•Éµ¥¹…±Ì¹±•¹Ñ €øÍ¹…ÁÍ¡½Ð¹…ÉÀ¹¥Ñ•µÌ¹±•¹Ñ °€™¥ÉÍÐ€ÄÈÀÍ½ÉÑ•‰ä%@œ°€¥Àœ¤°(€€€‘¡Á1•…Í•Ìè±¥ÍÑM…±•5•Ñ„¡Ñ•Éµ¥¹…±Ì¹±•¹Ñ °Í¹…ÁÍ¡½Ð¹‘¡À¹±•…Í•Ì¹±•¹Ñ °€ÄÈÀ°Ñ•Éµ¥¹…±Ì¹±•¹Ñ €øÍ¹…ÁÍ¡½Ð¹‘¡À¹±•…Í•Ì¹±•¹Ñ °€™¥ÉÍÐ€ÄÈÀÍ½ÉÑ•‰äÍÑ…ÑÕÌ…¹%@œ°€ÍÑ…ÑÕÌ½¥Àœ°lÍÑ…ÑÕÌœ°€Í•ÉÙ•Èœ°€ÍÑ…Ñ¥Œt¤°(€€€½¹¹•Ñ¥½¹ÍÑ¥Ù”è±¥ÍÑM…±•5•Ñ„¡Í¹…ÁÍ¡½Ð¹½¹¹•Ñ¥½¹Ì¹Ñ½Ñ…°°Í¹…ÁÍ¡½Ð¹½¹¹•Ñ¥½¹Ì¹…Ñ¥Ù”¹±•¹Ñ °€àÀ°ÑÉÕ”°€…Ñ¥Ù”½¹¹•Ñ¥½¸Í…µÁ±”œ°€É…Ñ”œ¤°(€€€‘¹ÍMÑ…Ñ¥Œè±¥ÍÑM…±•5•Ñ„¡Í¹…ÁÍ¡½Ð¹‘¹Ì¹™½ÉÝ…É‘IÕ±•½Õ¹Ðñð€Ð°Í¹…ÁÍ¡½Ð¹‘¹Ì¹™½ÉÝ…É‘IÕ±•I½ÝÌ¹±•¹Ñ °€ÄÀÀ°ÑÉÕ”°€ÁÉ•Ù¥•ÜÉ½ÝÌì€½…Á¤½‘¹ÌµÍÑ…Ñ¥Œ¥ÌÁ…•œ°€I½ÕÑ•É=L½É‘•Èœ¤°(€ôì(€Í¹…ÁÍ¡½Ð¹½¹¹•Ñ¥½¹Ì¹µ•Ñ„€ôì(€€€…Ñ¥Ù”èÍ¹…ÁÍ¡½Ð¹µ•Ñ„¹Í…±”¹½¹¹•Ñ¥½¹ÍÑ¥Ù”°(€€€Ñ½Á%ÁÌè±¥ÍÑM…±•5•Ñ„¡Ñ•Éµ¥¹…±Ì¹±•¹Ñ °Í¹…ÁÍ¡½Ð¹½¹¹•Ñ¥½¹Ì¹Ñ½Á%ÁÌ¹±•¹Ñ °€ÐÀ°ÑÉÕ”°€Ñ•Éµ¥¹…°Ñ½À±¥ÍÐœ°€½¹¹•Ñ¥½¹Ì½ÑÉ…™™¥Œœ¤°(€ôì(€Í¹…ÁÍ¡½Ð¹‘¡À¹µ•Ñ„€ôì(€€€±•…Í•ÌèÍ¹…ÁÍ¡½Ð¹µ•Ñ„¹Í…±”¹‘¡Á1•…Í•Ì°(€€€Á½½±Ìè±¥ÍÑM…±•5•Ñ„¡Í¹…ÁÍ¡½Ð¹‘¡À¹Á½½±Ì¹±•¹Ñ °Í¹…ÁÍ¡½Ð¹‘¡À¹Á½½±Ì¹±•¹Ñ ¤°(€€€Í•ÉÙ•ÉÌè±¥ÍÑM…±•5•Ñ„¡Í¹…ÁÍ¡½Ð¹‘¡À¹Í•ÉÙ•ÉÌ¹±•¹Ñ °Í¹…ÁÍ¡½Ð¹‘¡À¹Í•ÉÙ•ÉÌ¹±•¹Ñ ¤°(€ôì(€¥˜€¡Í…±•M•¹…É¥¼€ôôô€Í¥¹±”œ¤ì(€€€½¹ÍÐÍÑ…±”€ô¹•Ü…Ñ”¡…Ñ”¹¹½Ü ¤€´€  ÈÐ€¨€ÈÐ€¬€à¤€¨€ØÀ€¨€ØÀ€¨€ÄÀÀÀ¤¤¹Ñ½%M=MÑÉ¥¹œ ¤ì(€€€Í¹…ÁÍ¡½Ð¹ÕÁ‘…Ñ•‘Ð€ôÍÑ…±”ì(€€€Í¹…ÁÍ¡½Ð¹µ•Ñ„¹É•…±Ñ¥µ•UÁ‘…Ñ•‘Ð€ôÍÑ…±”ì(€€€Í¹…ÁÍ¡½Ð¹µ•Ñ„¹Í±½ÝI•ÍÑUÁ‘…Ñ•‘Ð€ôÍÑ…±”ì(€€€Í¹…ÁÍ¡½Ð¹µ•Ñ„¹ÍÑ…Ñ¥UÁ‘…Ñ•‘Ð€ôÍÑ…±”ì(€€€Í¹…ÁÍ¡½Ð¹µ•Ñ„¹½¹¹•Ñ¥½¹•Ñ…¥±UÁ‘…Ñ•‘Ð€ôÍÑ…±”ì(€€€Í¹…ÁÍ¡½Ð¹µ•Ñ„¹½¹¹•Ñ¥½¹AÉ½Ñ½½±UÁ‘…Ñ•‘Ð€ôÍÑ…±”ì(€€€Í¹…ÁÍ¡½Ð¹µ•Ñ„¹…Á…‰¥±¥Ñ¥•Ì¹É•ÍÑQÉÕÍÑ•€ôÑÉÕ”ì(€€€Í¹…ÁÍ¡½Ð¹µ•Ñ„¹…Á…‰¥±¥Ñ¥•Ì¹ÍÍ¡I•…€ô™…±Í”ì(€€€Í¹…ÁÍ¡½Ð¹µ•Ñ„¹…Á…‰¥±¥Ñ¥•Ì¹ÍÍ¡1…‰•°€ô€MM ƒ’úw¢Ö[žòë–’Äœì(€€€Í•Ñ¥áÑÕÉ•¥¹‘¥¹œ¡Í¹…ÁÍ¡½Ð°€Ý…É¹¥¹œœ°€!¥ÍÑ½É¥…°Í¥¹±”]8Í¹…ÁÍ¡½Ðœ°€Ÿ–6T]8€Ä¼Äƒ–r£žêÿ¾ò3’ö’âk–*‡–þ¯žŸ–ÞË¦f#š^Ÿ¾ò3–öO–&7–öÇ–N7šr«ž~—Žœ°l(€€€€€ì±…‰•°è€]8œ°Ù…±Õ”è€œÄ¼Äƒ–r£žêüœô°(€€€€€ì±…‰•°è€Ÿ’âk–*‡–þ¯žŸ–æÓ¦úœ°Ù…±Õ”è€œÈÑá œô°(€€€€€ì±…‰•°è€MM œ°Ù…±Õ”è€Ÿ’úw¢Ö[žòë–’Äœô°(€€€t¤ì(€ô(€Í¹…ÁÍ¡½Ð¹ÍÑ…ÑÕÍ¥¹‘¥¹Ì¹™¥¹‘¥¹Ì¹Õ¹Í¡¥™Ð¡ì(€€€¥èÍ…±”¸‘íÍ…±•M•¹…É¥½õ€°(€€€Í•Ù•É¥ÑäèÍ…±•M•¹…É¥¼€ôôô€™±••Ðœ€ü€Ý…É¹¥¹œœ€è€¥¹™¼œ°(€€€‘½µ…¥¸è€Í…±”œ°(€€€Ñ¥Ñ±”èM…±”™¥áÑÕÉ”è€‘íÍ…±•M•¹…É¥½õ€°(€€€ÍÕµµ…Éäè€‘íÝ…¸¹±•¹Ñ¡ô]8±¥¹•Ì…¹€‘íÑ•Éµ¥¹…±Ì¹±•¹Ñ¡ôÑ•Éµ¥¹…±Ì…É”±½…‘•¥¸Ñ¡¥Ì™¥áÑÕÉ”¹€°(€€€Í½ÕÉ”è€™¥áÑÕÉ”¹µ•Ñ„¹Í…±”œ°(€€€É•…‘=¹±äèÑÉÕ”°(€€€ÁÉ¥½É¥Ñäè€À°(€€€•Ù¥‘•¹”èmì±…‰•°è€Ý…¸œ°Ù…±Õ”èMÑÉ¥¹œ¡Ý…¸¹±•¹Ñ ¤ô°ì±…‰•°è€Ñ•Éµ¥¹…±Ìœ°Ù…±Õ”èMÑÉ¥¹œ¡Ñ•Éµ¥¹…±Ì¹±•¹Ñ ¤õt°(€ô¤ì(€Í¹…ÁÍ¡½Ð¹ÍÑ…ÑÕÍ¥¹‘¥¹Ì¹Ñ½Á¥¹‘¥¹œ€ôÍ¹…ÁÍ¡½Ð¹ÍÑ…ÑÕÍ¥¹‘¥¹Ì¹™¥¹‘¥¹ÍlÁtñð¹Õ±°ì(€Í¹…ÁÍ¡½Ð¹¡•…±Ñ¡¥¹‘¥¹Ì€ôÍ¹…ÁÍ¡½Ð¹ÍÑ…ÑÕÍ¥¹‘¥¹Ìì(€…ÁÁ±å‘•M•¹…É¥¼¡Í¹…ÁÍ¡½Ð°Í…±•M•¹…É¥¼¤ì)ô()…Íå¹Œ™Õ¹Ñ¥½¸µ…¥¸ ¤ì(€½¹ÍÐ…ÉÌ€ôÁ…ÉÍ•ÉÌ¡ÁÉ½•ÍÌ¹…ÉØ¤ì(€¥˜€¡…ÉÌ¹¡•±À¤ì(€€€½¹Í½±”¹±½œ¡ÕÍ…” ¤¤ì(€€€É•ÑÕÉ¸ì(€ô(€…Ý…¥Ð™Ì¹µ­‘¥È¡…ÉÌ¹½ÕÐ°ìÉ•ÕÉÍ¥Ù”èÑÉÕ”ô¤ì(€½¹ÍÐÉ•Á½ÉÐ€ôì(€€€ÍÑ…ÉÑ•‘Ðè¹•Ü…Ñ” ¤¹Ñ½%M=MÑÉ¥¹œ ¤°(€€€É½½ÐèI==P°(€€€½ÕÑ¥Èè…ÉÌ¹½ÕÐ°(€€€¡•­Ìèmt°(€€€Ý…É¹¥¹Ìèmt°(€€€™…¥±ÕÉ•Ìèmt°(€€€‰É½ÝÍ•É¡•­Ìèmt°(€€€Í•ÉÙ•Éá¥Ðè¹Õ±°°(€€€‰É½ÝÍ•Èè¹Õ±°°(€ôì((€±•ÐÍ•ÉÙ•È€ô¹Õ±°ì(€½¹ÍÐÍÑ…ÉÑ•‘	åMÉ¥ÁÐ€ô€……ÉÌ¹ÕÉ°ì(€½¹ÍÐ‰…Í•UÉ°€ô…ÉÌ¹ÕÉ°ñð€œœì(€ÑÉäì(€€€±•Ð•™™•Ñ¥Ù•UÉ°€ô‰…Í•UÉ°ì(€€€¥˜€ ……ÉÌ¹ÕÉ°€˜˜€……ÉÌ¹Í­¥Á	…­•¹¤ì(€€€€€Í•ÉÙ•È€ô…Ý…¥ÐÍÑ…ÉÑM…™•ÁÁM•ÉÙ•È¡…ÉÌ°É•Á½ÉÐ¤ì(€€€€€•™™•Ñ¥Ù•UÉ°€ôÍ•ÉÙ•È¹‰…Í•UÉ°ì(€€€€€½¹Í½±”¹±½œ¡m%9=tÍ…™”±½…°Í•ÉÙ•Èè€‘í•™™•Ñ¥Ù•UÉ±õ€¤ì(€€€ô•±Í”¥˜€ ……ÉÌ¹ÕÉ°€˜˜…ÉÌ¹Í­¥Á	…­•¹¤ì(€€€€€Í•ÉÙ•È€ô…Ý…¥ÐÍÑ…ÉÑM…™•ÁÁM•ÉÙ•È¡…ÉÌ°É•Á½ÉÐ¤ì(€€€€€•™™•Ñ¥Ù•UÉ°€ôÍ•ÉÙ•È¹‰…Í•UÉ°ì(€€€€€½¹Í½±”¹±½œ¡m%9=tÍ…™”±½…°Í•ÉÙ•È™½È‰É½ÝÍ•È¡•­Ìè€‘í•™™•Ñ¥Ù•UÉ±õ€¤ì(€€€ô((€€€¥˜€ …•™™•Ñ¥Ù•UÉ°¤Ñ¡É½Ü¹•ÜÉÉ½È 9¼±½…°UI0…Ù…¥±…‰±”œ¤ì((€€€¥˜€ ……ÉÌ¹Í­¥Á	…­•¹¤ì(€€€€€…Ý…¥ÐÉÕ¹	…­•¹‘¡•­Ì¡…ÉÌ°É•Á½ÉÐ°•™™•Ñ¥Ù•UÉ°°ÍÑ…ÉÑ•‘	åMÉ¥ÁÐ¤ì(€€€ô(€€€¥˜€ ……ÉÌ¹Í­¥Á	É½ÝÍ•È¤ì(€€€€€…Ý…¥ÐÉÕ¹	É½ÝÍ•É¡•­Ì¡…ÉÌ°É•Á½ÉÐ°•™™•Ñ¥Ù•UÉ°¤ì(€€€ô(€ô…Ñ €¡•ÉÉ½È¤ì(€€€É•½É¡É•Á½ÉÐ°€±½…°ÁÉ•‘•Á±½äÉÕ¹¹•È½µÁ±•Ñ•Ý¥Ñ¡½ÕÐ™…Ñ…°•ÉÉ½Èœ°™…±Í”°ì(€€€€€•ÉÉ½Èè•ÉÉ½È¹ÍÑ…¬ñð•ÉÉ½È¹µ•ÍÍ…”ñðMÑÉ¥¹œ¡•ÉÉ½È¤°(€€€ô¤ì(€ô™¥¹…±±äì(€€€¥˜€¡Í•ÉÙ•È¤…Ý…¥ÐÍ•ÉÙ•È¹ÍÑ½À ¤ì(€€€½¹ÍÐÍ•ÉÙ•É9½¥Í”€ôÍ•ÉÙ•É1½9½¥Í•AÉ½‰”¡É•Á½ÉÐ¤ì(€€€É•½É¡É•Á½ÉÐ°€±½…°Í•ÉÙ•È±½ÌÍÑ…ä™É•”½˜Í½­•ÐÉ•Í•Ð¹½¥Í”œ°Í•ÉÙ•É9½¥Í”¹½¬°Í•ÉÙ•É9½¥Í”¤ì(€€€É•Á½ÉÐ¹™¥¹¥Í¡•‘Ð€ô¹•Ü…Ñ” ¤¹Ñ½%M=MÑÉ¥¹œ ¤ì(€€€É•Á½ÉÐ¹µ…ÑÉ¥à€ô‰Õ¥±‘5…ÑÉ¥áMÕµµ…Éä¡É•Á½ÉÐ¹‰É½ÝÍ•É¡•­Ì°…ÉÌ¤ì(€€€½¹ÍÐµ…ÑÉ¥áM•ÍÍ¥½¸€ôµ…ÑÉ¥áM•ÍÍ¥½¹-•ä ¤ì(€€€½¹ÍÐµ…ÑÉ¥áMÑ…Ñ•¥±”€ôµ…ÑÉ¥áMÑ…Ñ•A…Ñ ¡É•Á½ÉÐ¹µ…ÑÉ¥à¹½µµ¥Ð¤ì(€€€½¹ÍÐµ…ÑÉ¥áMÑ…ÉÑ	…Ñ €ôÉ•Á½ÉÐ¹µ…ÑÉ¥à¹É•ÅÕ•ÍÑ•‘M•¹…É¥½Ì¹Í½µ” ¡Í•¹…É¥¼¤€ôølÍ¥¹±”œ°€™±••Ðt¹¥¹±Õ‘•Ì¡Í•¹…É¥¼¤¤ì(€€€½¹ÍÐµ…ÑÉ¥á¥¹¥Í¡	…Ñ €ôÉ•Á½ÉÐ¹µ…ÑÉ¥à¹É•ÅÕ•ÍÑ•‘M•¹…É¥½Ì¹Í½µ” ¡Í•¹…É¥¼¤€ôø}M1}M9I%=L¹¥¹±Õ‘•Ì¡Í•¹…É¥¼¤¤ì(€€€½¹ÍÐ•áÁ±¥¥Ñ=Ù•ÉÙ¥•ÝI•±•…Í•5…ÑÉ¥à€ô¥Í=Ù•ÉÙ¥•ÝI•±•…Í•5…ÑÉ¥à¡…ÉÌ¤ì(€€€½¹ÍÐÕÉÉ•¹Ñ5…ÑÉ¥áIÕ¸€ôÍÕµµ…É¥é•5…ÑÉ¥áIÕ¸¡É•Á½ÉÐ°…ÉÌ°ì(€€€€€€¸¸¹É•Á½ÉÐ¹µ…ÑÉ¥à°(€€€€€ÍÑ…ÉÑ•‘ÐèÉ•Á½ÉÐ¹ÍÑ…ÉÑ•‘Ð°(€€€€€™¥¹¥Í¡•‘ÐèÉ•Á½ÉÐ¹™¥¹¥Í¡•‘Ð°(€€€ô¤ì(€€€½¹ÍÐ•á¥ÍÑ¥¹5…ÑÉ¥áÉ•…Ñ”€ôµ…ÑÉ¥áMÑ…ÉÑ	…Ñ €ü¹Õ±°€è…Ý…¥ÐÉ•…‘)Í½¹%™¹ä¡µ…ÑÉ¥áMÑ…Ñ•¥±”¤ì(€€€½¹ÍÐµ…ÑÉ¥áÉ•…Ñ”€ôµ•É•5…ÑÉ¥áÉ•…Ñ” (€€€€€µ…ÑÉ¥áMÑ…ÉÑ	…Ñ €ü¹Õ±°€è•á¥ÍÑ¥¹5…ÑÉ¥áÉ•…Ñ”°(€€€€€É•Á½ÉÐ¹µ…ÑÉ¥à°(€€€€€ÕÉÉ•¹Ñ5…ÑÉ¥áIÕ¸°(€€€€€µ…ÑÉ¥áM•ÍÍ¥½¸(€€€€¤ì(€€€½¹ÍÐÉ•±•…Í•5…ÑÉ¥á½µÁ±•Ñ”€ô•áÁ±¥¥Ñ=Ù•ÉÙ¥•ÝI•±•…Í•5…ÑÉ¥à€üÉ•Á½ÉÐ¹µ…ÑÉ¥à¹½µÁ±•Ñ”€èµ…ÑÉ¥áÉ•…Ñ”¹½µÁ±•Ñ”ì(€€€…Ý…¥ÐÝÉ¥Ñ•)Í½¸¡µ…ÑÉ¥áMÑ…Ñ•¥±”°µ…ÑÉ¥áÉ•…Ñ”¤ì(€€€É•Á½ÉÐ¹µ…ÑÉ¥à¹…É•…Ñ”€ôì(€€€€€Á…Ñ èµ…ÑÉ¥áMÑ…Ñ•¥±”°(€€€€€½µµ¥Ðèµ…ÑÉ¥áÉ•…Ñ”¹½µµ¥Ð°(€€€€€Í•ÍÍ¥½¸èµ…ÑÉ¥áM•ÍÍ¥½¸°(€€€€€½ÕÑÁÕÑ¥Èè…ÉÌ¹½ÕÐ°(€€€€€ÍÉ••¹Í¡½Ñ¥Èè…ÉÌ¹½ÕÐ°(€€€€€ÍÉ••¹Í¡½ÑÌè±¥ÍÑMÉ••¹Í¡½Ñ¥±•Ì¡…ÉÌ¹½ÕÐ¤°(€€€€€½µÁ±•Ñ”èµ…ÑÉ¥áÉ•…Ñ”¹½µÁ±•Ñ”°(€€€€€É•±•…Í•5…ÑÉ¥á½µÁ±•Ñ”°(€€€€€½Ù•É•‘M•¹…É¥½Ìèµ…ÑÉ¥áÉ•…Ñ”¹½Ù•É•‘M•¹…É¥½Ì°(€€€€€Á…ÍÍ•‘M•¹…É¥½Ìèµ…ÑÉ¥áÉ•…Ñ”¹Á…ÍÍ•‘M•¹…É¥½Ì°(€€€€€É•ÅÕ¥É•‘•±±Ìèµ…ÑÉ¥áÉ•…Ñ”¹É•ÅÕ¥É•‘•±±Ì°(€€€€€Á…ÍÍ•‘•±±Ìèµ…ÑÉ¥áÉ•…Ñ”¹Á…ÍÍ•‘•±±Ì°(€€€€€µ¥ÍÍ¥¹•±±Ìè€¡µ…ÑÉ¥áÉ•…Ñ”¹É•ÅÕ¥É•‘•±±Ìñðmt¤¹™¥±Ñ•È ¡•±°¤€ôø€„¡µ…ÑÉ¥áÉ•…Ñ”¹Á…ÍÍ•‘•±±Ìñðmt¤¹¥¹±Õ‘•Ì¡•±°¤¤°(€€€€€Í•¹…É¥½5…ÑÉ¥àèµ…ÑÉ¥áÉ•…Ñ”¹ÉÕ¹Ì¹™±…Ñ5…À ¡ÉÕ¸¤€ôøÉÕ¸¹Í•¹…É¥½5…ÑÉ¥àñðmt¤°(€€€€€ÉÕ¹Ìèµ…ÑÉ¥áÉ•…Ñ”¹ÉÕ¹Ì¹±•¹Ñ °(€€€ôì(€€€¥˜€¡•áÁ±¥¥Ñ=Ù•ÉÙ¥•ÝI•±•…Í•5…ÑÉ¥àñðµ…ÑÉ¥á¥¹¥Í¡	…Ñ ñðÉ•Á½ÉÐ¹µ…ÑÉ¥à¹½µÁ±•Ñ”¤ì(€€€€€É•½É¡É•Á½ÉÐ°€Õ¹¥™¥•É•±•…Í”Í•¹…É¥¼µ…ÑÉ¥à½Ù•ÉÌÉ•ÅÕ¥É•Í•¹…É¥½Ìœ°É•±•…Í•5…ÑÉ¥á½µÁ±•Ñ”°ì(€€€€€€€½µµ¥Ðèµ…ÑÉ¥áÉ•…Ñ”¹½µµ¥Ð°(€€€€€€€Í•ÍÍ¥½¸èµ…ÑÉ¥áÉ•…Ñ”¹Í•ÍÍ¥½¸°(€€€€€€€ÍÑ…Ñ•A…Ñ èµ…ÑÉ¥áMÑ…Ñ•¥±”°(€€€€€€€•áÁ±¥¥Ñ=Ù•ÉÙ¥•ÝI•±•…Í•5…ÑÉ¥à°(€€€€€€€É•ÅÕ•ÍÑ•‘M•¹…É¥½ÌèÉ•Á½ÉÐ¹µ…ÑÉ¥à¹É•ÅÕ•ÍÑ•‘M•¹…É¥½Ì°(€€€€€€€É•ÅÕ¥É•‘M•¹…É¥½Ìèµ…ÑÉ¥áÉ•…Ñ”¹É•ÅÕ¥É•‘M•¹…É¥½Ì°(€€€€€€€ÕÉÉ•¹Ñ½Ù•É•‘M•¹…É¥½ÌèÉ•Á½ÉÐ¹µ…ÑÉ¥à¹½Ù•É•‘M•¹…É¥½Ì°(€€€€€€€ÕÉÉ•¹ÑA…ÍÍ•‘M•¹…É¥½ÌèÉ•Á½ÉÐ¹µ…ÑÉ¥à¹Á…ÍÍ•‘M•¹…É¥½Ì°(€€€€€€€…É•…Ñ•½Ù•É•‘M•¹…É¥½Ìèµ…ÑÉ¥áÉ•…Ñ”¹½Ù•É•‘M•¹…É¥½Ì°(€€€€€€€…É•…Ñ•A…ÍÍ•‘M•¹…É¥½Ìèµ…ÑÉ¥áÉ•…Ñ”¹Á…ÍÍ•‘M•¹…É¥½Ì°(€€€€€€€ÕÉÉ•¹ÑI•ÅÕ¥É•‘•±±ÌèÉ•Á½ÉÐ¹µ…ÑÉ¥à¹É•ÅÕ¥É•‘•±±Ì°(€€€€€€€ÕÉÉ•¹ÑA…ÍÍ•‘•±±ÌèÉ•Á½ÉÐ¹µ…ÑÉ¥à¹Á…ÍÍ•‘•±±Ì°(€€€€€€€…É•…Ñ•I•ÅÕ¥É•‘•±±Ìèµ…ÑÉ¥áÉ•…Ñ”¹É•ÅÕ¥É•‘•±±Ì°(€€€€€€€…É•…Ñ•A…ÍÍ•‘•±±Ìèµ…ÑÉ¥áÉ•…Ñ”¹Á…ÍÍ•‘•±±Ì°(€€€€€€€…É•…Ñ•5¥ÍÍ¥¹•±±Ìè€¡µ…ÑÉ¥áÉ•…Ñ”¹É•ÅÕ¥É•‘•±±Ìñðmt¤¹™¥±Ñ•È ¡•±°¤€ôø€„¡µ…ÑÉ¥áÉ•…Ñ”¹Á…ÍÍ•‘•±±Ìñðmt¤¹¥¹±Õ‘•Ì¡•±°¤¤°(€€€€€€€ÕÉÉ•¹ÑI•ÅÕ•ÍÑ•‘½µÁ±•Ñ”èÉ•Á½ÉÐ¹µ…ÑÉ¥à¹É•ÅÕ•ÍÑ•‘½µÁ±•Ñ”°(€€€€€€€ÕÉÉ•¹ÑI•ÅÕ¥É•‘½µÁ±•Ñ”èÉ•Á½ÉÐ¹µ…ÑÉ¥à¹½µÁ±•Ñ”°(€€€€€€€…É•…Ñ•½µÁ±•Ñ”èµ…ÑÉ¥áÉ•…Ñ”¹½µÁ±•Ñ”°(€€€€€€€É•±•…Í•5…ÑÉ¥á½µÁ±•Ñ”°(€€€€€ô¤ì(€€€ô(€€€½¹ÍÐµ…ÑÉ¥á	±½­ÍQ½Á1•Ù•±A…ÍÌ€ôÉ•Á½ÉÐ¹µ…ÑÉ¥à¹É•ÅÕ¥É•‘•±±Ì¹±•¹Ñ €ø€À€˜˜€…É•±•…Í•5…ÑÉ¥á½µÁ±•Ñ”ì(€€€¥˜€¡µ…ÑÉ¥á	±½­ÍQ½Á1•Ù•±A…ÍÌ¤ì(€€€€€Ý…É¸¡É•Á½ÉÐ°€Ñ½Àµ±•Ù•°Á…ÍÌÍÕÁÁÉ•ÍÍ•Õ¹Ñ¥°É•ÅÕ¥É•É•±•…Í”µ…ÑÉ¥à¥Ì½µÁ±•Ñ”œ°ì(€€€€€€€•áÁ±¥¥Ñ=Ù•ÉÙ¥•ÝI•±•…Í•5…ÑÉ¥à°(€€€€€€€…É•…Ñ•½µÁ±•Ñ”èµ…ÑÉ¥áÉ•…Ñ”¹½µÁ±•Ñ”°(€€€€€€€ÕÉÉ•¹ÑI•ÅÕ¥É•‘½µÁ±•Ñ”èÉ•Á½ÉÐ¹µ…ÑÉ¥à¹½µÁ±•Ñ”°(€€€€€€€É•ÅÕ¥É•‘•±±Ìèµ…ÑÉ¥áÉ•…Ñ”¹É•ÅÕ¥É•‘•±±Ì°(€€€€€€€Á…ÍÍ•‘•±±Ìèµ…ÑÉ¥áÉ•…Ñ”¹Á…ÍÍ•‘•±±Ì°(€€€€€€€µ¥ÍÍ¥¹•±±ÌèÉ•Á½ÉÐ¹µ…ÑÉ¥à¹…É•…Ñ”¹µ¥ÍÍ¥¹•±±Ì°(€€€€€ô¤ì(€€€ô(€€€É•Á½ÉÐ¹Á…ÍÌ€ôÉ•Á½ÉÐ¹™…¥±ÕÉ•Ì¹±•¹Ñ €ôôô€À€˜˜€…µ…ÑÉ¥á	±½­ÍQ½Á1•Ù•±A…ÍÌì(€€€É•Á½ÉÐ¹•á¥Ñ½‘•M¡½Õ±‘…¥°€ô	½½±•…¸ (€€€€€É•Á½ÉÐ¹™…¥±ÕÉ•Ì¹±•¹Ñ ñð(€€€€€€ ¡•áÁ±¥¥Ñ=Ù•ÉÙ¥•ÝI•±•…Í•5…ÑÉ¥àñðµ…ÑÉ¥á¥¹¥Í¡	…Ñ ñðÉ•Á½ÉÐ¹µ…ÑÉ¥à¹½µÁ±•Ñ”¤€˜˜€…É•Á½ÉÐ¹Á…ÍÌ¤(€€€€¤ì(€€€½¹ÍÐÍ…™•I•Á½ÉÐ€ô…Ý…¥ÐÁÉ•Á…É•I•Á½ÉÑ½É)Í½¸¡É•Á½ÉÐ°…ÉÌ¹½ÕÐ¤ì(€€€…Ý…¥ÐÝÉ¥Ñ•)Í½¸¡Á…Ñ ¹©½¥¸¡…ÉÌ¹½ÕÐ°€É•Á½ÉÐ¹©Í½¸œ¤°Í…™•I•Á½ÉÐ¤ì(€ô((€½¹Í½±”¹±½œ¡m%9=tÉ•Á½ÉÐè€‘íÁ…Ñ ¹©½¥¸¡…ÉÌ¹½ÕÐ°€É•Á½ÉÐ¹©Í½¸œ¥õ€¤ì(€½¹Í½±”¹±½œ¡m%9=tÉ•ÍÕ±Ðè€‘íÉ•Á½ÉÐ¹Á…ÍÌ€ü€Á…ÍÌœ€èÉ•Á½ÉÐ¹™…¥±ÕÉ•Ì¹±•¹Ñ €ü€‘íÉ•Á½ÉÐ¹™…¥±ÕÉ•Ì¹±•¹Ñ¡ô™…¥±ÕÉ”¡Ì¥€€è€¥¹½µÁ±•Ñ”É•±•…Í”µ…ÑÉ¥àõ€¤ì(€ÁÉ½•ÍÌ¹•á¥Ñ½‘”€ôÉ•Á½ÉÐ¹•á¥Ñ½‘•M¡½Õ±‘…¥°€ü€Ä€è€Àì)ô()µ…¥¸ ¤¹…Ñ  ¡•ÉÉ½È¤€ôøì(€½¹Í½±”¹•ÉÉ½È¡•ÉÉ½È€˜˜•ÉÉ½È¹ÍÑ…¬€ü•ÉÉ½È¹ÍÑ…¬€èMÑÉ¥¹œ¡•ÉÉ½È¤¤ì(€ÁÉ½•ÍÌ¹•á¥Ð Ä¤ì)ô¤ì(