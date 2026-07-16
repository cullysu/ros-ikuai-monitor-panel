#!/usr/bin/env node
'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const crypto = require('crypto');
const http = require('http');
const net = require('net');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const outDir = path.join(root, '_acceptance', 'panel-runtime-browser');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function currentGitHead() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
  const head = String(result.stdout || '').trim();
  if (result.status !== 0 || !/^[0-9a-f]{40,64}$/i.test(head)) {
    throw new Error(`unable to resolve exact git HEAD: ${String(result.stderr || result.error || '').trim()}`);
  }
  return head;
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

function json(response, status, payload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

function routerProfile(configured) {
  return {
    configured,
    host: configured ? '192.0.2.1' : '',
    user: configured ? 'observer' : '',
    sshPort: 22,
    sshHostKeyFingerprint: configured ? 'SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' : '',
    restScheme: 'https',
    restPort: 443,
    restVerifyTls: true,
    insecureRestConfirmed: false,
    source: configured ? 'ui' : 'memory',
    savedId: configured ? 'lab-router' : null,
    updatedAt: configured ? new Date().toISOString() : null,
    passwordSet: configured,
    lastTest: configured ? {
      ssh: { ok: true, identity: 'lab-router', error: null, elapsedMs: 18 },
      rest: { ok: false, status: null, error: 'mock REST timeout', elapsedMs: 80 },
      elapsedMs: 81,
    } : null,
  };
}

function savedProfiles() {
  return [{
    id: 'lab-router',
    host: '192.0.2.1',
    user: 'observer',
    sshPort: 22,
    sshHostKeyFingerprint: 'SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    restScheme: 'https',
    restPort: 443,
    restVerifyTls: true,
    insecureRestConfirmed: false,
    label: 'Lab Router',
    source: 'saved',
    createdAt: '2026-07-16T08:00:00.000Z',
    updatedAt: '2026-07-16T08:00:00.000Z',
    lastUsedAt: '2026-07-16T08:00:00.000Z',
    passwordSaved: false,
    lastTest: null,
  }];
}

function connectionTest(restOk = false) {
  return {
    ssh: { ok: true, identity: 'lab-router', error: null, elapsedMs: 18 },
    rest: { ok: restOk, status: restOk ? 200 : null, error: restOk ? null : 'mock REST timeout', elapsedMs: 80 },
    elapsedMs: 81,
  };
}

function operationalSnapshot(sequence, options = {}) {
  const now = options.stale ? '2026-07-01T00:00:00.000Z' : new Date().toISOString();
  return {
    status: 'ok',
    updatedAt: now,
    error: null,
    meta: {
      target: '192.0.2.1',
      routerHost: '192.0.2.1',
      configuredIdentity: 'lab-router',
      pollSeconds: options.pollSeconds || 2,
      realtimeUpdatedAt: now,
      staticUpdatedAt: now,
      capabilities: { restTrusted: false, sshRead: true, routerosWrite: false },
    },
    overview: {
      identity: 'lab-router',
      version: '7.15 mock',
      uptime: '2d 04:11:00',
      cpuLoad: 23,
      memoryUsage: 41,
      diskUsage: 18,
      connectionTotal: 42,
      onlineTerminals: 2,
    },
    interfaces: [
      { name: 'pppoe-wan1', type: 'pppoe-out', role: 'WAN', running: true, disabled: false, rxRate: 24000000 + sequence, txRate: 8000000 },
      { name: 'bridge-lan', type: 'bridge', role: 'LAN', running: true, disabled: false, rxRate: 8000000, txRate: 24000000 + sequence },
    ],
    wan: [{ name: 'pppoe-wan1', interface: 'pppoe-wan1', running: true, disabled: false, downRate: 24000000 + sequence, upRate: 8000000 }],
    pppoe: [{ name: 'pppoe-wan1', interface: 'pppoe-wan1', running: true, disabled: false, downRate: 24000000 + sequence, upRate: 8000000 }],
    terminals: [{ ip: '192.0.2.20', hostname: 'workstation', online: true }],
    routes: { items: [], defaultRoutes: [{ dstAddress: '0.0.0.0/0', gateway: 'pppoe-wan1', active: true, disabled: false, distance: 1 }] },
    connections: { total: 42, active: [], topIps: [] },
    dns: {},
  };
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function startMockServer() {
  const state = {
    configured: false,
    loginAttempts: 0,
    snapshotCalls: 0,
    logoutCalls: 0,
    manualSnapshotSequence: 0,
    nextSnapshot: '',
    pollSeconds: 2,
    lastLoginBody: null,
  };
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    if (request.method === 'GET' && url.pathname === '/api/router-login') {
      return json(response, 200, {
        ok: true,
        routerLogin: routerProfile(state.configured),
        savedLogins: savedProfiles(),
        savePasswordAvailable: true,
        csrfToken: 'mock-csrf',
      });
    }
    if (request.method === 'POST' && url.pathname === '/api/router-login') {
      const body = await readRequestBody(request);
      state.loginAttempts += 1;
      state.lastLoginBody = body;
      if (body.password === 'wrong') {
        return json(response, 400, {
          ok: false,
          status: 400,
          code: 'router_login_failed',
          error: '模拟连接失败：REST 与 SSH 均未验证',
          test: {
            ssh: { ok: false, error: 'mock auth failed', elapsedMs: 15 },
            rest: { ok: false, error: 'mock auth failed', elapsedMs: 15 },
          },
        });
      }
      const hostFingerprint = 'SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      if (body.password === 'correct-horse' && body.sshHostKeyFingerprint !== hostFingerprint) {
        return json(response, 409, {
          ok: false,
          status: 409,
          code: 'ssh_host_key_confirmation_required',
          error: '首次连接必须确认 RouterOS SSH 主机密钥指纹。确认前不会发送 SSH 密码。',
          test: {
            ssh: {
              ok: false,
              error: 'SSH host key confirmation required',
              elapsedMs: 8,
              fingerprint: hostFingerprint,
              algorithm: 'ssh-ed25519',
              confirmationRequired: true,
            },
            rest: { ok: true, status: 200, error: null, elapsedMs: 14, scheme: 'https', port: 443, verifyTls: true },
            elapsedMs: 15,
          },
        });
      }
      state.configured = true;
      state.snapshotCalls = 0;
      return json(response, 200, {
        ok: true,
        routerLogin: routerProfile(true),
        savedLogins: savedProfiles(),
        test: connectionTest(false),
        warning: 'SSH 已验证；REST 未通过，依赖 REST 的数据可能缺失。',
      });
    }
    if (request.method === 'POST' && url.pathname === '/api/router-logout') {
      state.configured = false;
      state.logoutCalls += 1;
      return json(response, 200, {
        ok: true,
        routerLogin: routerProfile(false),
        savedLogins: savedProfiles(),
      });
    }
    if (request.method === 'POST' && url.pathname === '/api/router-login-forget') {
      return json(response, 200, {
        ok: true,
        removed: true,
        routerLogin: routerProfile(state.configured),
        savedLogins: [],
      });
    }
    if (request.method === 'GET' && url.pathname === '/api/snapshot') {
      state.snapshotCalls += 1;
      if (!state.configured) {
        return json(response, 200, { status: 'needs_config', updatedAt: new Date().toISOString(), error: 'RouterOS is not configured', meta: { pollSeconds: 2 } });
      }
      if (state.snapshotCalls === 1) {
        return json(response, 200, { status: 'starting', updatedAt: new Date().toISOString(), error: null, meta: { pollSeconds: 2 } });
      }
      const nextSnapshot = state.nextSnapshot;
      state.nextSnapshot = '';
      if (nextSnapshot === 'api-error') {
        return json(response, 503, { ok: false, status: 503, code: 'collector_unavailable', error: '模拟采集接口暂时不可用' });
      }
      if (nextSnapshot === 'malformed') {
        return json(response, 200, { ...operationalSnapshot(state.manualSnapshotSequence, { pollSeconds: state.pollSeconds }), interfaces: {} });
      }
      state.manualSnapshotSequence += 1;
      return json(response, 200, operationalSnapshot(state.manualSnapshotSequence, {
        stale: nextSnapshot === 'stale',
        pollSeconds: state.pollSeconds,
      }));
    }

    const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    const filePath = path.resolve(publicDir, relative);
    if (filePath !== path.resolve(publicDir) && !filePath.startsWith(`${path.resolve(publicDir)}${path.sep}`)) {
      response.writeHead(404); response.end(); return;
    }
    try {
      const body = await fsp.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mime = ext === '.html' ? 'text/html; charset=utf-8'
        : ext === '.js' ? 'text/javascript; charset=utf-8'
          : ext === '.css' ? 'text/css; charset=utf-8'
            : ext === '.svg' ? 'image/svg+xml'
              : 'application/octet-stream';
      response.writeHead(200, { 'Content-Type': mime, 'Content-Length': body.length, 'Cache-Control': 'no-store' });
      response.end(body);
    } catch {
      response.writeHead(404); response.end();
    }
  });
  const port = await getFreePort();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return {
    state,
    url: `http://127.0.0.1:${port}/`,
    stop: () => new Promise((resolve) => server.close(resolve)),
  };
}

function findBrowser() {
  const candidates = [
    process.env.BROWSER,
    process.env.CHROME_PATH,
    process.env.EDGE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/microsoft-edge',
  ].filter(Boolean);
  return candidates.find((candidate) => path.isAbsolute(candidate) ? fs.existsSync(candidate) : spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', [candidate], { stdio: 'ignore' }).status === 0) || '';
}

async function waitForDevtools(port) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {}
    await delay(150);
  }
  throw new Error('browser devtools endpoint did not start');
}

class CdpSession {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 0;
    this.pending = new Map();
    socket.addEventListener('message', async (event) => {
      const raw = typeof event.data === 'string' ? event.data : await event.data.text();
      const message = JSON.parse(raw);
      if (!message.id || !this.pending.has(message.id)) return;
      const pending = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${pending.method}: ${JSON.stringify(message.error)}`));
      else pending.resolve(message.result || {});
    });
  }
  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { try { this.socket.close(); } catch {} }
}

async function launchBrowser() {
  const executable = findBrowser();
  if (!executable) throw new Error('Edge/Chrome executable not found');
  const port = await getFreePort();
  const profileDir = path.join(outDir, 'browser-profile');
  await fsp.rm(profileDir, { recursive: true, force: true });
  const args = [
    '--headless=new', '--disable-gpu', '--disable-background-networking', '--disable-sync', '--disable-extensions',
    '--no-first-run', '--no-default-browser-check', '--metrics-recording-only', '--remote-debugging-address=127.0.0.1',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, 'about:blank',
  ];
  if (process.platform === 'win32') args.splice(1, 0, '--window-position=-32000,-32000', '--window-size=1,1');
  else args.splice(1, 0, '--no-sandbox');
  const child = spawn(executable, args, { windowsHide: true, stdio: 'ignore' });
  await waitForDevtools(port);
  const created = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then((response) => response.json());
  const socket = new WebSocket(created.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('CDP websocket timed out')), 8000);
    socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  return {
    cdp: new CdpSession(socket),
    executable,
    stop: async () => {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
        const escapedProfile = profileDir.replace(/\\/g, '\\\\').replace(/'/g, "''");
        const query = `(Name='msedge.exe' or Name='chrome.exe') and CommandLine like '%${escapedProfile}%'`;
        const scan = spawnSync('wmic', ['process', 'where', query, 'get', 'ProcessId', '/value'], { windowsHide: true, encoding: 'utf8' });
        const pids = Array.from(String(scan.stdout || '').matchAll(/ProcessId=(\d+)/g), (match) => match[1]);
        for (const pid of pids) spawnSync('taskkill', ['/pid', pid, '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
      } else child.kill('SIGKILL');
      await delay(300);
      await fsp.rm(profileDir, { recursive: true, force: true });
    },
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(`browser evaluate failed: ${JSON.stringify(result.exceptionDetails)}`);
  return result.result ? result.result.value : undefined;
}

async function waitFor(cdp, expression, label, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    last = await evaluate(cdp, expression);
    if (last) return last;
    await delay(120);
  }
  throw new Error(`timed out waiting for ${label}: ${JSON.stringify(last)}`);
}

async function capture(cdp, fileName, state) {
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  const image = Buffer.from(shot.data, 'base64');
  const filePath = path.join(outDir, fileName);
  const layout = await cdp.send('Page.getLayoutMetrics');
  await fsp.writeFile(filePath, image);
  return {
    file: fileName,
    path: path.relative(root, filePath).split(path.sep).join('/'),
    state,
    mimeType: 'image/png',
    bytes: image.length,
    sha256: crypto.createHash('sha256').update(image).digest('hex'),
    image: {
      width: image.readUInt32BE(16),
      height: image.readUInt32BE(20),
    },
    viewport: {
      width: layout.cssVisualViewport?.clientWidth || null,
      height: layout.cssVisualViewport?.clientHeight || null,
    },
    capturedAt: new Date().toISOString(),
  };
}

const setFormValue = (selector, value) => `(() => {
  const input = document.querySelector(${JSON.stringify(selector)});
  if (!input) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(input, ${JSON.stringify(value)});
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()`;

async function run() {
  await fsp.rm(outDir, { recursive: true, force: true });
  await fsp.mkdir(outDir, { recursive: true });
  const gitHead = currentGitHead();
  const mock = await startMockServer();
  const browser = await launchBrowser();
  const { cdp } = browser;
  const checks = [];
  const screenshotMetadata = [];
  const check = (name, pass, detail = null) => {
    checks.push({ name, pass: Boolean(pass), detail });
    if (!pass) throw new Error(`${name}: ${JSON.stringify(detail)}`);
  };
  try {
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await cdp.send('Page.navigate', { url: mock.url });
    await waitFor(cdp, `Boolean(document.querySelector('[data-router-connection-screen="mobile"]'))`, 'mobile connection screen');

    const mobile = await evaluate(cdp, `(() => {
      const form = document.querySelector('[data-router-login-form]');
      const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent.includes('连接并进入面板'));
      const password = document.querySelector('input[name="password"]');
      const buttonRect = button?.getBoundingClientRect();
      return {
        form: Boolean(form),
        button: Boolean(buttonRect && buttonRect.height >= 44 && buttonRect.bottom <= innerHeight),
        buttonBottom: buttonRect?.bottom || null,
        inputFont: password ? parseFloat(getComputedStyle(password).fontSize) : 0,
        overflow: document.documentElement.scrollWidth - innerWidth,
        legacyNavVisible: Array.from(document.querySelectorAll('.ik-rail,.sidebar')).some((node) => getComputedStyle(node).display !== 'none'),
        fixture: typeof window.__PANEL_TEST_SNAPSHOT__ !== 'undefined',
      };
    })()`);
    check('mobile connection form is real and readable', mobile.form && mobile.button && mobile.inputFont >= 16, mobile);
    check('mobile connection owns the surface without legacy navigation', !mobile.legacyNavVisible && mobile.overflow <= 1, mobile);
    check('live runtime does not use a scenario fixture', mobile.fixture === false, mobile);
    screenshotMetadata.push(await capture(cdp, 'mobile-connection.png', 'mobile-connection'));

    await evaluate(cdp, setFormValue('input[name="host"]', '192.0.2.1'));
    await evaluate(cdp, setFormValue('input[name="user"]', 'observer'));
    await evaluate(cdp, setFormValue('input[name="password"]', 'wrong'));
    await evaluate(cdp, `document.querySelector('[data-router-login-form]').requestSubmit()`);
    await waitFor(cdp, `document.querySelector('[role="alert"]')?.textContent.includes('模拟连接失败')`, 'failed connection evidence');
    check('failed connection remains on the form with a real API error', mock.state.loginAttempts === 1);

    await evaluate(cdp, setFormValue('input[name="password"]', 'correct-horse'));
    await evaluate(cdp, `document.querySelector('[data-router-login-form]').requestSubmit()`);
    await waitFor(cdp, `Boolean(document.querySelector('.router-host-key-confirmation code')?.textContent.includes('SHA256:'))`, 'SSH host key confirmation');
    const hostKeyBoundary = await evaluate(cdp, `(() => ({
      text: document.querySelector('.router-host-key-confirmation')?.textContent || '',
      checked: document.querySelector('.router-host-key-confirmation input')?.checked === true,
      protocol: document.querySelector('button[aria-pressed="true"]')?.textContent || '',
    }))()`);
    check('first SSH contact exposes an unconfirmed fingerprint before entering the panel', hostKeyBoundary.text.includes('ssh-ed25519') && !hostKeyBoundary.checked, hostKeyBoundary);
    check('REST starts with verified HTTPS rather than an HTTP fallback', hostKeyBoundary.protocol.includes('HTTPS') && mock.state.lastLoginBody?.restScheme === 'https' && mock.state.lastLoginBody?.restVerifyTls === true, mock.state.lastLoginBody);
    screenshotMetadata.push(await capture(cdp, 'mobile-ssh-host-key-confirmation.png', 'mobile-ssh-host-key-confirmation'));
    await evaluate(cdp, `document.querySelector('.router-host-key-confirmation input').click()`);
    await evaluate(cdp, `document.querySelector('[data-router-login-form]').requestSubmit()`);
    await waitFor(cdp, `document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase') === 'recovering'`, 'collector starting state');
    check('confirmed SSH fingerprint is pinned in the second request', mock.state.lastLoginBody?.sshHostKeyFingerprint?.startsWith('SHA256:'), mock.state.lastLoginBody);
    check('successful connection exposes collector recovery instead of fake current data', mock.state.loginAttempts === 3 && mock.state.snapshotCalls === 1, mock.state);
    await waitFor(cdp, `document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase') === 'current'`, 'current runtime snapshot', 9000);
    const current = await evaluate(cdp, `(() => ({
      phase: document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase'),
      warning: document.querySelector('.panel-runtime-notice')?.textContent || '',
      toolbar: Boolean(document.querySelector('[data-panel-runtime-toolbar="mobile"]')),
      activeSection: document.querySelector('[data-panel-app]')?.getAttribute('data-active-section'),
      taskCount: document.querySelectorAll('.panel-task-navigation button').length,
      overflow: document.documentElement.scrollWidth - innerWidth,
    }))()`);
    check('a recovered REST channel clears the stale login warning', current.warning === '' && current.toolbar, current);
    check('validated snapshot renders the requested route', current.phase === 'current' && current.activeSection === 'overview', current);
    check('mobile navigation exposes three stable tasks rather than five permanent tabs', current.taskCount === 3, current);
    check('live mobile panel has no horizontal overflow', current.overflow <= 1, current);
    screenshotMetadata.push(await capture(cdp, 'mobile-runtime-current.png', 'mobile-runtime-current'));

    const beforePoll = mock.state.snapshotCalls;
    const pollDeadline = Date.now() + 5000;
    while (mock.state.snapshotCalls <= beforePoll && Date.now() < pollDeadline) await delay(80);
    await waitFor(cdp, `document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase') === 'current'`, 'automatic poll');
    check('automatic polling refreshes the validated snapshot', mock.state.snapshotCalls > beforePoll, mock.state);

    mock.state.pollSeconds = 60;
    const beforeSlowPoll = mock.state.snapshotCalls;
    await evaluate(cdp, `document.querySelector('button[title="立即刷新"]').click()`);
    while (mock.state.snapshotCalls <= beforeSlowPoll) await delay(50);
    await waitFor(cdp, `document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase') === 'current'`, 'slow-poll test baseline');

    const beforeMalformed = mock.state.snapshotCalls;
    mock.state.nextSnapshot = 'malformed';
    await evaluate(cdp, `document.querySelector('button[title="立即刷新"]').click()`);
    while (mock.state.snapshotCalls <= beforeMalformed) await delay(50);
    const malformedState = await waitFor(cdp, `(() => {
      const phase = document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase');
      if (!phase || phase === 'refreshing' || phase === 'loading') return null;
      return { phase, text: document.querySelector('.panel-runtime-notice')?.textContent || '' };
    })()`, 'malformed snapshot boundary');
    check('malformed snapshot enters recovery with a schema error', malformedState.phase === 'recovering' && malformedState.text.includes('不符合契约'), malformedState);
    check('malformed API data is rejected while the last snapshot remains visible', await evaluate(cdp, `Boolean(document.querySelector('[data-panel-app]'))`));

    mock.state.nextSnapshot = 'api-error';
    await evaluate(cdp, `document.querySelector('button[title="立即刷新"]').click()`);
    await waitFor(cdp, `document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase') === 'recovering' && document.body.textContent.includes('模拟采集接口暂时不可用')`, 'snapshot API failure');
    check('snapshot API failure never inserts a scenario fixture', await evaluate(cdp, `typeof window.__PANEL_TEST_SNAPSHOT__ === 'undefined' && Boolean(document.querySelector('[data-panel-app]'))`));

    mock.state.nextSnapshot = 'stale';
    await evaluate(cdp, `document.querySelector('button[title="立即刷新"]').click()`);
    await waitFor(cdp, `document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase') === 'stale'`, 'historical snapshot state');
    check('old evidence is labeled historical instead of current', await evaluate(cdp, `(() => {
      const root = document.querySelector('[data-mobile-overview][data-mobile-evidence-mode="historical"]');
      const text = root?.textContent || '';
      return Boolean(root && !root.querySelector('[data-mobile-traffic]') && !/[0-9.]+\\s*(?:K|M|G)?bps/i.test(text));
    })()`));
    screenshotMetadata.push(await capture(cdp, 'mobile-runtime-stale.png', 'mobile-runtime-stale'));

    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0, connectionType: 'none' });
    await waitFor(cdp, `document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase') === 'offline'`, 'offline state');
    check('browser offline state stops current claims', await evaluate(cdp, `document.body.textContent.includes('浏览器当前离线')`));
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1, connectionType: 'wifi' });
    await waitFor(cdp, `document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase') === 'current'`, 'online recovery', 7000);
    check('online recovery replaces historical evidence with a current snapshot', true);

    const beforeVisibility = mock.state.snapshotCalls;
    await evaluate(cdp, `(() => {
      const realNow = Date.now;
      Date.now = () => realNow() + 61000;
      document.dispatchEvent(new Event('visibilitychange'));
      setTimeout(() => { Date.now = realNow; }, 0);
      return true;
    })()`);
    const visibilityDeadline = Date.now() + 5000;
    while (mock.state.snapshotCalls <= beforeVisibility && Date.now() < visibilityDeadline) await delay(80);
    await waitFor(cdp, `document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase') === 'current'`, 'visibility recovery');
    check('visibility restoration refreshes old runtime state', mock.state.snapshotCalls > beforeVisibility, mock.state);

    const beforeManual = mock.state.snapshotCalls;
    await evaluate(cdp, `document.querySelector('button[title="立即刷新"]').click()`);
    const manualDeadline = Date.now() + 5000;
    while (mock.state.snapshotCalls <= beforeManual && Date.now() < manualDeadline) await delay(60);
    await waitFor(cdp, `document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase') === 'current'`, 'manual refresh');
    check('manual refresh calls the snapshot API', mock.state.snapshotCalls > beforeManual, mock.state);

    await evaluate(cdp, `document.querySelector('button[title="设备连接"]').click()`);
    await waitFor(cdp, `Boolean(document.querySelector('[data-router-connection-screen="mobile"]'))`, 'device switch screen');
    check('device switch returns to the real connection flow', await evaluate(cdp, `Boolean(document.querySelector('button[aria-label="返回面板"]'))`));
    await evaluate(cdp, `Array.from(document.querySelectorAll('button')).find((node) => node.textContent.includes('清除当前连接')).click()`);
    await waitFor(cdp, `Boolean(document.querySelector('[data-router-connection-screen="mobile"]')) && !document.body.textContent.includes('清除当前连接')`, 'logout to unconfigured form');
    check('logout clears the runtime snapshot and connection', mock.state.logoutCalls === 1 && mock.state.configured === false, mock.state);

    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Page.reload', { ignoreCache: true });
    await waitFor(cdp, `Boolean(document.querySelector('[data-router-connection-screen="desktop"]'))`, 'desktop connection screen');
    const desktop = await evaluate(cdp, `(() => {
      const screen = document.querySelector('[data-router-connection-screen="desktop"]');
      const form = screen?.querySelector('[data-router-login-form]');
      const rect = screen?.getBoundingClientRect();
      return { form: Boolean(form), width: rect?.width || 0, overflow: document.documentElement.scrollWidth - innerWidth };
    })()`);
    check('desktop connection has its own workspace', desktop.form && desktop.width > 900 && desktop.overflow <= 1, desktop);
    screenshotMetadata.push(await capture(cdp, 'desktop-connection.png', 'desktop-connection'));

    const report = {
      pass: checks.every((item) => item.pass),
      source: 'production-runtime',
      fixture: false,
      commit: gitHead,
      gitHead,
      git: { head: gitHead },
      generatedAt: new Date().toISOString(),
      checks,
      mock: mock.state,
      browser: browser.executable,
      screenshots: screenshotMetadata.map((item) => item.file),
      screenshotMetadata,
    };
    await fsp.writeFile(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`[panel-runtime-browser] PASS checks=${checks.length} snapshots=${mock.state.snapshotCalls}`);
  } finally {
    cdp.close();
    await browser.stop();
    await mock.stop();
  }
}

run().catch(async (error) => {
  await fsp.mkdir(outDir, { recursive: true });
  await fsp.writeFile(path.join(outDir, 'failure.log'), `${error.stack || error.message || String(error)}\n`, 'utf8');
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
