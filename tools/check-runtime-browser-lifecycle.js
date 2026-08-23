const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { startMock } = require('./check-panel-runtime-browser');

const ROOT = path.resolve(__dirname, '..');
const targetPath = path.join(ROOT, 'tools', 'check-panel-runtime-browser.js');
const source = fs.readFileSync(targetPath, 'utf8');
const entryStart = source.indexOf('async function runRuntimeBrowserEntry');
const entry = entryStart >= 0 ? source.slice(entryStart) : '';

const checks = [
  ['runtime entry exists', entryStart >= 0],
  ['runtime entry awaits the bounded main race', /await Promise\.race\(\[main\(\), timeout\]\)/.test(entry)],
  ['runtime entry awaits shared cleanup on failure', /await cleanupRuntime\(\)/.test(entry)],
  ['runtime timeout starts shared cleanup before reporting failure', /void cleanupRuntime\(\)(?:\.catch\(\(\) => \{\}\))?;\s*reject\(new Error\(message\.trim\(\)\)\)/.test(entry)],
  ['runtime stop signals start shared cleanup', /process\.once\('SIGTERM', handleStop\.bind\(null, 'SIGTERM'\)\)/.test(entry) && /void cleanupRuntime\(\)(?:\.catch\(\(\) => \{\}\))?\.finally\(/.test(entry)],
  ['runtime entry explicitly exits successfully after cleanup', /process\.exit\(0\)/.test(entry)],
  ['runtime entry explicitly exits unsuccessfully after cleanup', /process\.exit\(1\)/.test(entry)],
  ['runtime entry keeps a bounded timeout contract', /const testTimeout\s*=\s*Number\.isFinite\(configuredTestTimeout\)[\s\S]*?Math\.min\(Math\.max\(configuredTestTimeout,\s*30000\),\s*480000\)/.test(source)],
  ['runtime entry keeps isolated screenshot timeout bounded at 60000ms', source.includes('configuredScreenshotTimeout') && source.includes('Math.min(Math.max(configuredScreenshotTimeout, 5000), 60000)') && source.includes(': 60000;')],
  ['runtime uses the v2 managed browser lifecycle', source.includes("require('./acceptance/browser-lifecycle-v2/browser-lifecycle')") && source.includes('launchManagedBrowser')],
  ['runtime closes managed browser lifecycles with bounded cleanup', source.includes("boundedCleanup('browser.lifecycle.close'") && source.includes("boundedCleanup('isolated-browser.lifecycle.close'") && source.includes("boundedCleanup('mock.stop'")],
  ['runtime records managed browser cleanup diagnostics', source.includes('browserLifecycle') && source.includes('browserRuntime.diagnostics')],
  ['runtime writes lifecycle and mock cleanup diagnostics', source.includes("'lifecycle-diagnostic.write'") && source.includes("'panel-runtime-browser-lifecycle-v2'") && source.includes("'mock.stop'")],
  ['mock server binds its real listener without a released-port handoff', /async function startMock\([^)]*\)[\s\S]*?await listenMockServer\(server\)[\s\S]*?const address = server\.address\(\)/.test(source)],
  ['Windows mock ports stay outside the default dynamic client range with bounded retries', source.includes('const WINDOWS_MOCK_PORT_START = 18000;') && source.includes('const WINDOWS_MOCK_PORT_SPAN = 1000;') && source.includes('const WINDOWS_MOCK_PORT_ATTEMPTS = 64;')],
  ['Windows mock server prefers IPv6 loopback with an IPv4 compatibility fallback', source.includes("for (const host of ['::1', '127.0.0.1'])") && source.includes("return host;")],
  ['Windows mock supports an in-process named-pipe route when the host TCP pool is exhausted', source.includes("transport === 'pipe'") && source.includes('listenPipeServer(server, pipe.path)') && source.includes('requestPipeResponse(pipe.path, route.request())')],
  ['mock server has no probe-then-rebind port allocator', !source.includes('async function freePort()') && !source.includes('const port = await freePort()')],
];

function requestStatus(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(new URL('/api/router-login', url), { headers: { Connection: 'close' } }, (response) => {
      response.resume();
      response.once('end', () => resolve(response.statusCode));
    });
    request.once('error', reject);
    request.setTimeout(4_000, () => request.destroy(new Error('mock request timed out')));
  });
}

function requestRuntimeStatus(runtime) {
  if (runtime.transport !== 'pipe') return requestStatus(runtime.url);
  return new Promise((resolve, reject) => {
    const request = http.get({ socketPath: runtime.socketPath, path: '/api/router-login', headers: { Connection: 'close' } }, (response) => {
      response.resume();
      response.once('end', () => resolve(response.statusCode));
    });
    request.once('error', reject);
    request.setTimeout(4_000, () => request.destroy(new Error('mock pipe request timed out')));
  });
}

async function verifyMockPortLifecycle() {
  const transport = process.platform === 'win32' ? 'pipe' : 'tcp';
  const starts = await Promise.allSettled(Array.from({ length: 12 }, () => startMock({ transport })));
  const runtimes = starts.filter((result) => result.status === 'fulfilled').map((result) => result.value);
  try {
    if (runtimes.length !== starts.length) return false;
    const urls = runtimes.map((runtime) => runtime.url);
    if (new Set(urls).size !== urls.length) return false;
    for (const runtime of runtimes) {
      if (await requestRuntimeStatus(runtime) !== 200) return false;
    }
  } finally {
    await Promise.allSettled(runtimes.map((runtime) => runtime.stop()));
  }

  for (let index = 0; index < 12; index += 1) {
    const runtime = await startMock({ transport });
    try {
      if (await requestRuntimeStatus(runtime) !== 200) return false;
    } finally {
      await runtime.stop();
    }
  }
  return true;
}

async function main() {
  let mockLifecyclePass = false;
  let mockLifecycleError = null;
  try {
    mockLifecyclePass = await verifyMockPortLifecycle();
  } catch (error) {
    mockLifecycleError = String(error?.stack || error?.message || error);
    mockLifecyclePass = false;
  }
  checks.push(['mock transport survives concurrent and repeated direct listener lifecycles', mockLifecyclePass]);

  const failed = checks.filter(([, pass]) => !pass).map(([name]) => name);
  const report = {
    pass: failed.length === 0,
    contract: 'runtime-browser-lifecycle-v1',
    target: path.relative(ROOT, targetPath).split(path.sep).join('/'),
    checks: Object.fromEntries(checks),
    failed,
    diagnostics: mockLifecycleError ? { mockLifecycleError } : {},
  };

  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.pass ? 0 : 1;
}

void main();
