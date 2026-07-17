#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const http = require('http');
const net = require('net');
const path = require('path');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright-core');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const outDir = path.join(root, '_acceptance', 'panel-runtime-browser');
const fingerprint = 'SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const actionTimeout = 8000;
const testTimeout = 120000;
let diagnosticPage = null;
const diagnosticPageErrors = [];
let cleanupRuntime = async () => {};

function gitHead() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
  const head = String(result.stdout || '').trim();
  if (result.status !== 0 || !/^[0-9a-f]{40,64}$/i.test(head)) {
    throw new Error('unable to resolve exact git HEAD');
  }
  return head;
}

function utc(offsetMs) {
  return new Date(Date.now() + (offsetMs || 0)).toISOString();
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function sendJson(response, status, payload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

function channelTest(restOk) {
  return {
    ssh: { ok: true, identity: 'lab-router', error: null, elapsedMs: 18 },
    rest: {
      ok: restOk,
      status: restOk ? 200 : null,
      error: restOk ? null : 'mock REST timeout',
      elapsedMs: 80,
    },
    elapsedMs: 81,
  };
}

function profile(configured) {
  return {
    configured,
    host: configured ? '192.0.2.1' : '',
    user: configured ? 'observer' : '',
    sshPort: 22,
    sshHostKeyFingerprint: configured ? fingerprint : '',
    restScheme: 'https',
    restPort: 443,
    restVerifyTls: true,
    insecureRestConfirmed: false,
    source: configured ? 'ui' : 'memory',
    savedId: configured ? 'lab-router' : '',
    updatedAt: configured ? utc() : null,
    passwordSet: configured,
    lastTest: configured ? channelTest(false) : null,
  };
}

function savedProfiles() {
  return [{
    id: 'lab-router',
    host: '192.0.2.1',
    user: 'observer',
    sshPort: 22,
    sshHostKeyFingerprint: fingerprint,
    restScheme: 'https',
    restPort: 443,
    restVerifyTls: true,
    insecureRestConfirmed: false,
    label: 'Lab Router',
    updatedAt: '2026-07-16T08:00:00.000Z',
    lastUsedAt: '2026-07-16T08:00:00.000Z',
    lastTest: null,
  }];
}

function snapshot(sequence, options) {
  const settings = options || {};
  const now = settings.stale ? utc(-24 * 60 * 60 * 1000) : utc();
  return {
    status: 'ok',
    updatedAt: now,
    error: null,
    meta: {
      contractVersion: 1,
      target: '192.0.2.1',
      routerHost: '192.0.2.1',
      configuredIdentity: 'lab-router',
      pollSeconds: settings.pollSeconds || 2,
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
      onlineTerminals: 25,
    },
    interfaces: [
      {
        name: 'pppoe-wan1',
        type: 'pppoe-out',
        role: 'WAN',
        running: true,
        disabled: false,
        rxRate: 24000000 + sequence,
        txRate: 8000000,
      },
      {
        name: 'bridge-lan',
        type: 'bridge',
        role: 'LAN',
        running: true,
        disabled: false,
        rxRate: 8000000,
        txRate: 24000000 + sequence,
      },
    ],
    wan: [{
      name: 'pppoe-wan1',
      interface: 'pppoe-wan1',
      running: true,
      disabled: false,
      downRate: 24000000 + sequence,
      upRate: 8000000,
    }],
    pppoe: [{
      name: 'pppoe-wan1',
      interface: 'pppoe-wan1',
      running: true,
      disabled: false,
      downRate: 24000000 + sequence,
      upRate: 8000000,
    }],
    terminals: Array.from({ length: 25 }, (_, index) => ({
      ip: `192.0.2.${20 + index}`,
      mac: `02:00:00:00:00:${String(index + 1).padStart(2, '0')}`,
      hostname: index === 24 ? 'workstation-special' : `workstation-${String(index + 1).padStart(2, '0')}`,
      status: 'online',
      online: true,
      connections: index + 1,
      downRate: 1000000 + index * 1000,
      upRate: 250000 + index * 500,
    })),
    routes: {
      items: [],
      defaultRoutes: [{
        dstAddress: '0.0.0.0/0',
        gateway: 'pppoe-wan1',
        active: true,
        disabled: false,
        distance: 1,
      }],
    },
    connections: { total: 42, active: [], topIps: [] },
    dns: {},
  };
}

async function requestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

async function startMock() {
  const state = {
    configured: false,
    loginAttempts: 0,
    snapshotCalls: 0,
    logoutCalls: 0,
    sequence: 0,
    nextSnapshot: '',
    scenario: '',
    reverseInterfaces: false,
    pollSeconds: 2,
    lastLoginBody: null,
  };

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');

      if (request.method === 'GET' && url.pathname === '/api/router-login') {
        sendJson(response, 200, {
          ok: true,
          routerLogin: profile(state.configured),
          savedLogins: savedProfiles(),
          profileStorageAvailable: true,
          csrfToken: 'mock-csrf',
        });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/router-login') {
        const body = await requestBody(request);
        state.loginAttempts += 1;
        state.lastLoginBody = body;

        if (body.password === 'wrong') {
          sendJson(response, 400, {
            ok: false,
            code: 'router_login_failed',
            error: 'mock authentication failure',
            test: {
              ssh: { ok: false, error: 'mock auth failed', elapsedMs: 15 },
              rest: { ok: false, error: 'mock auth failed', elapsedMs: 15 },
            },
          });
          return;
        }

        if (body.password === 'correct-horse' && body.sshHostKeyFingerprint !== fingerprint) {
          sendJson(response, 409, {
            ok: false,
            code: 'ssh_host_key_confirmation_required',
            error: 'SSH host key confirmation required',
            test: {
              ssh: {
                ok: false,
                error: 'SSH host key confirmation required',
                elapsedMs: 8,
                fingerprint,
                algorithm: 'ssh-ed25519',
                confirmationRequired: true,
              },
              rest: {
                ok: true,
                status: 200,
                error: null,
                elapsedMs: 14,
                scheme: 'https',
                port: 443,
                verifyTls: true,
              },
              elapsedMs: 15,
            },
          });
          return;
        }

        state.configured = true;
        state.snapshotCalls = 0;
        sendJson(response, 200, {
          ok: true,
          routerLogin: profile(true),
          savedLogins: savedProfiles(),
          test: channelTest(false),
          warning: 'SSH verified; REST evidence is not yet current.',
        });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/router-logout') {
        state.configured = false;
        state.logoutCalls += 1;
        sendJson(response, 200, {
          ok: true,
          routerLogin: profile(false),
          savedLogins: savedProfiles(),
        });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/router-login-forget') {
        sendJson(response, 200, {
          ok: true,
          removed: true,
          routerLogin: profile(state.configured),
          savedLogins: [],
        });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/snapshot') {
        state.snapshotCalls += 1;
        if (!state.configured) {
          sendJson(response, 200, {
            status: 'needs_config',
            updatedAt: utc(),
            error: 'RouterOS is not configured',
            meta: { pollSeconds: 2 },
          });
          return;
        }
        if (state.snapshotCalls === 1) {
          sendJson(response, 200, {
            status: 'starting',
            updatedAt: utc(),
            error: null,
            meta: { pollSeconds: 2 },
          });
          return;
        }

        const next = state.nextSnapshot;
        state.nextSnapshot = '';
        if (next === 'api-error') {
          sendJson(response, 503, {
            ok: false,
            code: 'collector_unavailable',
            error: 'mock collector unavailable',
          });
          return;
        }
        if (next === 'malformed') {
          sendJson(response, 200, Object.assign(
            snapshot(state.sequence, { pollSeconds: state.pollSeconds }),
            { interfaces: {} }
          ));
          return;
        }

        state.sequence += 1;
        const payload = snapshot(state.sequence, {
          stale: next === 'stale',
          pollSeconds: state.pollSeconds,
        });
        if (state.scenario === 'interfaces-down') {
          payload.interfaces.push(
            { name: 'ether9', type: 'ether', role: 'LAN', parent: 'switch1', running: false, disabled: false },
            { name: 'vlan30', type: 'vlan', role: 'LAN', parent: 'ether9', vlan: 30, running: false, disabled: false },
            { name: 'sfp-lan', type: 'ether', role: 'LAN', parent: 'switch1', running: false, disabled: false },
          );
        }
        if (state.reverseInterfaces) payload.interfaces.reverse();
        sendJson(response, 200, payload);
        return;
      }

      const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      const publicRoot = path.resolve(publicDir);
      const filePath = path.resolve(publicDir, relative);
      if (filePath !== publicRoot && !filePath.startsWith(publicRoot + path.sep)) {
        response.writeHead(404);
        response.end();
        return;
      }

      const body = await fsp.readFile(filePath);
      const extension = path.extname(filePath).toLowerCase();
      const mime = extension === '.html' ? 'text/html; charset=utf-8'
        : extension === '.js' ? 'text/javascript; charset=utf-8'
          : extension === '.css' ? 'text/css; charset=utf-8'
            : extension === '.svg' ? 'image/svg+xml'
              : extension === '.png' ? 'image/png'
                : extension === '.webmanifest' ? 'application/manifest+json'
                  : 'application/octet-stream';
      response.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': body.length,
        'Cache-Control': 'no-store',
      });
      response.end(body);
    } catch (error) {
      if (!response.headersSent) {
        sendJson(response, 500, { error: String(error && error.message || error) });
      } else {
        response.end();
      }
    }
  });

  const port = await freePort();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });

  return {
    state,
    url: 'http://127.0.0.1:' + port + '/',
    stop: () => new Promise((resolve) => server.close(resolve)),
  };
}

function browserExecutable() {
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
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
  ].filter(Boolean);

  return candidates.find((candidate) => {
    if (path.isAbsolute(candidate)) return fs.existsSync(candidate);
    return spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', [candidate], {
      stdio: 'ignore',
      windowsHide: true,
    }).status === 0;
  }) || '';
}

async function waitForCalls(state, baseline, label, timeout) {
  const startedAt = Date.now();
  while (state.snapshotCalls <= baseline) {
    if (Date.now() - startedAt > (timeout || actionTimeout)) {
      throw new Error('timed out waiting for ' + label + '; calls=' + state.snapshotCalls);
    }
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
}

async function waitForPhase(page, phase, timeout) {
  await page.waitForFunction(
    (expected) => document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase') === expected,
    phase,
    { timeout: timeout || actionTimeout }
  );
}

async function screenshot(page, fileName, state) {
  const filePath = path.join(outDir, fileName);
  const image = await page.screenshot({ path: filePath, animations: 'disabled' });
  return {
    file: fileName,
    path: path.relative(root, filePath).split(path.sep).join('/'),
    state,
    bytes: image.length,
    sha256: crypto.createHash('sha256').update(image).digest('hex'),
    image: {
      width: image.readUInt32BE(16),
      height: image.readUInt32BE(20),
    },
    viewport: page.viewportSize(),
    capturedAt: utc(),
  };
}

function check(results, name, pass, detail) {
  const item = { name, pass: Boolean(pass), detail: detail == null ? null : detail };
  results.push(item);
  if (!item.pass) throw new Error(name + ': ' + JSON.stringify(detail));
}

async function main() {
  await fsp.rm(outDir, { recursive: true, force: true });
  await fsp.mkdir(outDir, { recursive: true });

  const commit = gitHead();
  const mock = await startMock();
  const executablePath = browserExecutable();
  let browser;
  const contexts = new Set();
  const checks = [];
  const screenshots = [];
  const pageErrors = diagnosticPageErrors;
  let cleanupPromise = null;
  const cleanup = () => {
    if (!cleanupPromise) {
      cleanupPromise = (async () => {
        await Promise.allSettled([...contexts].map((context) => context.close()));
        if (browser) await browser.close().catch(() => {});
        await mock.stop().catch(() => {});
      })();
    }
    return cleanupPromise;
  };
  cleanupRuntime = cleanup;

  try {
    if (!executablePath) throw new Error('Edge/Chrome executable not found');
    browser = await chromium.launch({
      executablePath,
      headless: true,
      args: process.platform === 'linux' ? ['--no-sandbox'] : [],
      timeout: 15000,
    });

    const openContext = async (options) => {
      const context = await browser.newContext(options);
      contexts.add(context);
      context.on('close', () => contexts.delete(context));
      return context;
    };

    const mobileContext = await openContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await mobileContext.newPage();
    diagnosticPage = page;
    page.setDefaultTimeout(actionTimeout);
    page.setDefaultNavigationTimeout(15000);
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto(mock.url, { waitUntil: 'domcontentloaded' });
    const form = page.locator('[data-router-login-form]');
    await form.waitFor();

    const mobile = await page.evaluate(() => {
      const screen = document.querySelector('[data-router-connection-screen="mobile"]');
      const submit = document.querySelector('[data-router-login-form] button[type="submit"]');
      const password = document.querySelector('input[name="password"]');
      const advanced = document.querySelector('[data-router-advanced-settings]');
      const sshPortInput = document.querySelector('input[name="sshPort"]');
      const rect = submit?.getBoundingClientRect();
      return {
        screen: Boolean(screen),
        submitHeight: rect?.height || 0,
        submitBottom: rect?.bottom || 0,
        inputFont: password ? Number.parseFloat(getComputedStyle(password).fontSize) : 0,
        overflow: document.documentElement.scrollWidth - innerWidth,
        fixture: typeof window.__PANEL_TEST_SNAPSHOT__ !== 'undefined',
        legacyShell: Boolean(document.querySelector('.ik-rail,.sidebar,.top-bar')),
        advancedPresent: Boolean(advanced),
        advancedOpen: Boolean(advanced?.open),
        advancedSummary: advanced?.querySelector('summary')?.textContent || '',
        advancedInputVisible: Boolean(sshPortInput && sshPortInput.getClientRects().length),
      };
    });
    mobile.advancedInputVisible = await page.locator('[data-router-advanced-settings] input[name="sshPort"]').isVisible();
    check(
      checks,
      'mobile connection form is readable and owns the viewport',
      mobile.screen &&
        mobile.submitHeight >= 44 &&
        mobile.submitBottom <= 844 &&
        mobile.inputFont >= 16 &&
        mobile.overflow <= 1 &&
        !mobile.legacyShell &&
        mobile.advancedPresent &&
        !mobile.advancedOpen &&
        !mobile.advancedInputVisible &&
        /HTTPS\s+443.*SSH\s+22/.test(mobile.advancedSummary),
      mobile
    );
    check(checks, 'production runtime has no scenario fixture', !mobile.fixture, mobile);
    screenshots.push(await screenshot(page, 'mobile-connection.png', 'mobile-connection'));

    const advancedSettings = page.locator('[data-router-advanced-settings]');
    await advancedSettings.locator('summary').click();
    const advancedControls = {
      sshPort: await advancedSettings.locator('input[name="sshPort"]').isVisible(),
      restPort: await advancedSettings.locator('input[name="restPort"]').isVisible(),
      protocol: await advancedSettings.getByRole('group', { name: 'REST 协议' }).isVisible(),
    };
    check(
      checks,
      'advanced connection settings are disclosed on demand',
      advancedControls.sshPort && advancedControls.restPort && advancedControls.protocol,
      advancedControls
    );
    await advancedSettings.locator('summary').click();

    await page.locator('input[name="host"]').fill('192.0.2.1');
    await page.locator('input[name="user"]').fill('observer');
    await page.locator('input[name="password"]').fill('wrong');
    await form.locator('button[type="submit"]').click();
    await page.getByRole('alert').waitFor();
    check(
      checks,
      'failed connection remains on the real form with API evidence',
      mock.state.loginAttempts === 1 && await form.isVisible(),
      mock.state
    );

    await page.locator('input[name="password"]').fill('correct-horse');
    await form.locator('button[type="submit"]').click();
    const hostKey = page.locator('.router-host-key-confirmation');
    await hostKey.waitFor();
    const hostKeyFacts = await hostKey.evaluate((node) => ({
      text: node.textContent || '',
      checked: node.querySelector('input')?.checked === true,
      protocol: document.querySelector('button[aria-pressed="true"]')?.textContent || '',
    }));
    check(
      checks,
      'first SSH contact requires explicit host-key confirmation',
      hostKeyFacts.text.includes('ssh-ed25519') &&
        hostKeyFacts.text.includes('SHA256:') &&
        !hostKeyFacts.checked,
      hostKeyFacts
    );
    check(
      checks,
      'REST starts with verified HTTPS and never silently downgrades',
      hostKeyFacts.protocol.includes('HTTPS') &&
        mock.state.lastLoginBody?.restScheme === 'https' &&
        mock.state.lastLoginBody?.restVerifyTls === true,
      mock.state.lastLoginBody
    );
    screenshots.push(await screenshot(
      page,
      'mobile-ssh-host-key-confirmation.png',
      'mobile-ssh-host-key-confirmation'
    ));

    await hostKey.locator('input[type="checkbox"]').check();
    await form.locator('button[type="submit"]').click();
    await page.locator('[data-panel-runtime-phase]').waitFor();
    await waitForPhase(page, 'current', 12000);
    check(
      checks,
      'confirmed SSH fingerprint is pinned in the second request',
      mock.state.lastLoginBody?.sshHostKeyFingerprint === fingerprint,
      mock.state.lastLoginBody
    );

    const current = await page.evaluate(() => ({
      phase: document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase'),
      toolbar: Boolean(document.querySelector('[data-panel-runtime-toolbar="mobile"]')),
      route: document.querySelector('[data-panel-app]')?.getAttribute('data-active-section'),
      overflow: document.documentElement.scrollWidth - innerWidth,
      fixture: typeof window.__PANEL_TEST_SNAPSHOT__ !== 'undefined',
    }));
    check(
      checks,
      'validated snapshot renders the overview without overflow',
      current.phase === 'current' &&
        current.toolbar &&
        current.route === 'overview' &&
        current.overflow <= 1 &&
        !current.fixture,
      current
    );
    screenshots.push(await screenshot(page, 'mobile-runtime-current.png', 'mobile-runtime-current'));

    const evidenceLedger = page.locator('[data-mobile-evidence-ledger]');
    const evidenceSummary = evidenceLedger.locator('summary');
    const initialLedger = await evidenceLedger.evaluate((node) => ({
      open: node.open,
      override: node.getAttribute('data-user-override'),
    }));
    await evidenceSummary.click();
    await page.waitForFunction((expected) => {
      const ledger = document.querySelector('[data-mobile-evidence-ledger]');
      return ledger?.getAttribute('data-user-override') === 'manual' && ledger.open !== expected;
    }, initialLedger.open);
    const manualLedgerOpen = await evidenceLedger.evaluate((node) => node.open);
    await page.setViewportSize({ width: 390, height: 700 });
    await page.waitForFunction(() => innerHeight === 700);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => innerHeight === 844);
    const resizedLedger = await evidenceLedger.evaluate((node) => ({
      open: node.open,
      override: node.getAttribute('data-user-override'),
    }));
    check(
      checks,
      'manual evidence disclosure survives viewport changes',
      initialLedger.override === 'auto' &&
        resizedLedger.override === 'manual' &&
        resizedLedger.open === manualLedgerOpen,
      { initialLedger, manualLedgerOpen, resizedLedger }
    );
    if (!resizedLedger.open) await evidenceSummary.click();

    const beforePoll = mock.state.snapshotCalls;
    await waitForCalls(mock.state, beforePoll, 'automatic poll', 6000);
    await waitForPhase(page, 'current');
    check(
      checks,
      'automatic polling refreshes the validated snapshot',
      mock.state.snapshotCalls > beforePoll,
      mock.state
    );

    mock.state.pollSeconds = 60;
    const refresh = page.locator('.panel-runtime-actions button').first();
    const beforeBaseline = mock.state.snapshotCalls;
    await refresh.click();
    await waitForCalls(mock.state, beforeBaseline, 'manual baseline refresh');
    await waitForPhase(page, 'current');

    const taskNavigation = await page.locator('.panel-task-navigation button').evaluateAll((buttons) => (
      buttons.map((button) => ({
        route: button.getAttribute('data-section'),
        label: (button.textContent || '').trim(),
      }))
    ));
    check(
      checks,
      'mobile exposes four stable task destinations',
      taskNavigation.length === 4 &&
        ['overview', 'interfaces', 'terminals', 'logs'].every((route) => (
          taskNavigation.some((item) => item.route === route)
        )),
      taskNavigation
    );

    await page.locator('[data-section="interfaces"]').click();
    await page.locator('[data-mobile-domain-workspace="interfaces"]').waitFor();
    const networkWorkspace = await page.evaluate(() => {
      const shell = document.querySelector('[data-mobile-domain-workspace]');
      const styles = getComputedStyle(shell);
      const parseColor = (value) => {
        const color = value.trim();
        if (color.startsWith('#')) {
          const hex = color.slice(1);
          return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
        }
        return (color.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      };
      const luminance = (value) => parseColor(value)
        .map((channel) => channel / 255)
        .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
        .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
      const contrast = (left, right) => {
        const values = [luminance(left), luminance(right)].sort((a, b) => b - a);
        return (values[0] + 0.05) / (values[1] + 0.05);
      };
      const foregrounds = ['--mdw-muted', '--mdw-faint'].map((name) => styles.getPropertyValue(name));
      const backgrounds = ['--mdw-surface', '--mdw-surface-soft'].map((name) => styles.getPropertyValue(name));
      const contrastValues = foregrounds.flatMap((foreground) => backgrounds.map((background) => contrast(foreground, background)));
      const targets = Array.from(shell.querySelectorAll('button, summary, input, select'))
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        })
        .map((node) => node.getBoundingClientRect().height);
      return {
        search: Boolean(document.querySelector('.mdw-search input[type="search"]')),
        filterButtons: document.querySelectorAll('.mdw-filter-row button').length,
        sort: Boolean(document.querySelector('.mdw-filter-row select')),
        rows: document.querySelectorAll('[data-mobile-row-id]').length,
        overflow: document.documentElement.scrollWidth - innerWidth,
        minimumTarget: Math.min(...targets),
        minimumContrast: Math.min(...contrastValues),
      };
    });
    check(
      checks,
      'network destination is a searchable filterable sortable object workspace',
      networkWorkspace.search && networkWorkspace.filterButtons >= 2 &&
        networkWorkspace.sort && networkWorkspace.rows >= 2 && networkWorkspace.overflow <= 1 &&
        networkWorkspace.minimumTarget >= 44 && networkWorkspace.minimumContrast >= 4.5,
      networkWorkspace
    );

    const search = page.locator('.mdw-search input[type="search"]');
    await search.fill('pppoe-wan1');
    await page.waitForFunction(() => document.querySelectorAll('[data-mobile-row-id]').length === 1);
    check(
      checks,
      'visible network search changes the object result set',
      await page.locator('[data-mobile-row-id]').first().innerText().then((text) => text.includes('pppoe-wan1'))
    );
    await page.getByRole('button', { name: '清除搜索' }).click();
    await page.locator('.mdw-filter-row select').selectOption('name-asc');
    check(
      checks,
      'visible sort control owns real state',
      await page.locator('.mdw-filter-row select').inputValue() === 'name-asc'
    );

    const objectTrigger = page.locator('[data-mobile-row-id]').first();
    const objectId = await objectTrigger.getAttribute('data-mobile-row-id');
    await objectTrigger.click();
    await page.locator('[data-mobile-object-detail]').waitFor();
    const objectDetail = await page.evaluate(() => ({
      object: document.querySelector('[data-mobile-object-detail]')?.getAttribute('data-mobile-object-detail'),
      fields: document.querySelectorAll('.mdw-detail-fields > div').length,
      query: new URLSearchParams(location.search).get('object'),
    }));
    check(
      checks,
      'object destination adds field-level evidence instead of replaying the summary',
      objectDetail.object === objectId && objectDetail.query === objectId && objectDetail.fields >= 4,
      objectDetail
    );
    screenshots.push(await screenshot(page, 'mobile-network-object.png', 'mobile-network-object'));

    await page.goBack();
    await page.waitForFunction(() => !document.querySelector('[data-mobile-object-detail]'));
    const backFocus = await page.evaluate((id) => (
      document.activeElement?.getAttribute('data-mobile-row-id') === id
    ), objectId);
    await page.goForward();
    await page.locator('[data-mobile-object-detail]').waitFor();
    check(
      checks,
      'browser Back closes and Forward restores the selected object',
      backFocus && new URL(page.url()).searchParams.get('object') === objectId,
      { backFocus, url: page.url(), objectId }
    );
    mock.state.reverseInterfaces = true;
    const beforeReorder = mock.state.snapshotCalls;
    await refresh.click();
    await waitForCalls(mock.state, beforeReorder, 'interface reorder refresh');
    await waitForPhase(page, 'current');
    const reorderedObject = await page.evaluate(() => ({
      detail: document.querySelector('[data-mobile-object-detail]')?.getAttribute('data-mobile-object-detail') || '',
      query: new URLSearchParams(location.search).get('object') || '',
      title: document.querySelector('[data-mobile-object-detail] h2')?.textContent?.trim() || '',
    }));
    check(
      checks,
      'stable business identity preserves the exact object across snapshot reorder',
      reorderedObject.detail === objectId && reorderedObject.query === objectId && reorderedObject.title === 'bridge-lan',
      { objectId, reorderedObject }
    );
    mock.state.reverseInterfaces = false;

    await page.getByRole('button', { name: '返回列表' }).click();
    await page.waitForFunction(() => !document.querySelector('[data-mobile-object-detail]'));
    check(
      checks,
      'object close restores focus without retry polling',
      await page.evaluate((id) => document.activeElement?.getAttribute('data-mobile-row-id') === id, objectId),
      { objectId }
    );

    await page.goBack();
    await page.locator('[data-mobile-overview]').waitFor();
    await page.goForward();
    await page.locator('[data-mobile-domain-workspace="interfaces"]').waitFor();
    await page.goBack();
    await page.locator('[data-mobile-overview]').waitFor();
    check(checks, 'browser Back and Forward both restore route destinations', true);

    await page.locator('[data-section="terminals"]').click();
    await page.locator('[data-mobile-domain-workspace="terminals"]').waitFor();
    const terminalPageOne = await page.evaluate(() => ({
      rows: document.querySelectorAll('[data-mobile-row-id]').length,
      page: document.querySelector('.mdw-pagination span')?.textContent || '',
    }));
    check(
      checks,
      'terminal workspace paginates a real object collection',
      terminalPageOne.rows === 20 && /1\s*\/\s*2/.test(terminalPageOne.page),
      terminalPageOne
    );
    await page.locator('.mdw-pagination button').last().click();
    await page.waitForFunction(() => document.querySelectorAll('[data-mobile-row-id]').length === 5);
    const terminalPageTwo = await page.evaluate(() => ({
      rows: document.querySelectorAll('[data-mobile-row-id]').length,
      page: document.querySelector('.mdw-pagination span')?.textContent || '',
    }));
    check(
      checks,
      'terminal pagination reaches the remaining objects',
      terminalPageTwo.rows === 5 && /2\s*\/\s*2/.test(terminalPageTwo.page),
      terminalPageTwo
    );
    await page.locator('.mdw-search input[type="search"]').fill('workstation-special');
    await page.waitForFunction(() => document.querySelectorAll('[data-mobile-row-id]').length === 1);
    check(
      checks,
      'terminal search reaches an object outside the first page',
      (await page.locator('[data-mobile-row-id]').first().innerText()).includes('workstation-special')
    );

    await page.locator('[data-section="logs"]').click();
    await page.locator('[data-mobile-domain-workspace="logs"]').waitFor();
    check(
      checks,
      'logs is a stable first-class destination with functional controls',
      await page.locator('.mdw-search input[type="search"]').isVisible() &&
        await page.locator('.mdw-filter-row').isVisible()
    );

    const domainRouteContracts = [
      { route: 'connections', primary: 'interfaces', workspace: '网络工作区', placeholder: '源、目标、端口或协议' },
      { route: 'dns4', primary: 'interfaces', workspace: 'DNS 工作区', placeholder: '名称、类型或目标' },
      { route: 'dns6', primary: 'interfaces', workspace: 'DNS 工作区', placeholder: '接口、前缀或 DNS' },
      { route: 'security', primary: 'interfaces', workspace: '安全工作区', placeholder: '告警、链、动作或说明' },
      { route: 'terminals', primary: 'terminals', workspace: '终端工作区', placeholder: '终端名、IP 或 MAC' },
      { route: 'logs', primary: 'logs', workspace: '事件时间线', placeholder: '内容、主题或时间' },
      { route: 'trafficLoad', primary: 'overview', workspace: '资源工作区', placeholder: '' },
    ];
    for (const contract of domainRouteContracts) {
      const target = new URL(mock.url);
      target.searchParams.set('section', contract.route);
      target.hash = contract.route;
      await page.goto(target.toString(), { waitUntil: 'domcontentloaded' });
      await waitForPhase(page, 'current');
      await page.locator(`[data-mobile-domain-workspace="${contract.route}"]`).waitFor();
      const routeState = await page.evaluate(() => ({
        primary: document.querySelector('.panel-task-navigation button.is-active')?.getAttribute('data-section') || '',
        workspace: document.querySelector('.mdw-title-row small')?.textContent?.trim() || '',
        placeholder: document.querySelector('.mdw-search input')?.getAttribute('placeholder') || '',
        overflow: document.documentElement.scrollWidth - innerWidth,
      }));
      check(
        checks,
        `${contract.route} keeps its domain workspace and primary destination`,
        routeState.primary === contract.primary &&
          routeState.workspace === contract.workspace &&
          routeState.placeholder === contract.placeholder &&
          routeState.overflow <= 1,
        { contract, routeState }
      );
    }

    await page.locator('[data-section="overview"]').click();
    await page.locator('[data-mobile-overview]').waitFor();

    const textScale = await page.evaluate(async () => {
      const root = document.documentElement;
      const heading = document.querySelector('[data-mobile-verdict] h1');
      const before = heading ? Number.parseFloat(getComputedStyle(heading).fontSize) : 0;
      root.style.setProperty('-webkit-text-size-adjust', '200%');
      root.style.setProperty('text-size-adjust', '200%');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      window.scrollTo(0, 0);
      const after = heading ? Number.parseFloat(getComputedStyle(heading).fontSize) : 0;
      const targets = Array.from(document.querySelectorAll(
        '[data-mobile-overview] button, [data-mobile-overview] summary, .panel-task-navigation button'
      )).filter((node) => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0;
      });
      const navInsideViewport = Array.from(document.querySelectorAll('.panel-task-navigation button')).every((node) => {
        const rect = node.getBoundingClientRect();
        return rect.left >= -1 && rect.right <= innerWidth + 1;
      });
      const clippedText = Array.from(document.querySelectorAll(
        '.mp-proof small, .mp-proof b, .mp-proof em, .mp-rate-pair b, .mp-load b, .mp-incident-copy b, .mp-incident-copy p, .mp-action-list b, .mp-action-list small'
      )).filter((node) => node.scrollWidth > node.clientWidth + 1).map((node) => ({
        text: (node.textContent || '').trim().slice(0, 60),
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
      }));
      return {
        before,
        after,
        ratio: before ? after / before : 0,
        overflow: document.documentElement.scrollWidth - innerWidth,
        minimumTarget: Math.min(...targets.map((node) => node.getBoundingClientRect().height)),
        navInsideViewport,
        verdictVisible: Boolean(heading && heading.getBoundingClientRect().height > 0),
        largeTextMode: document.querySelector('[data-mobile-overview]')?.getAttribute('data-mobile-large-text'),
        clippedText,
      };
    });
    check(
      checks,
      'browser 200% text adjustment reflows without horizontal loss',
      textScale.ratio >= 1.8 && textScale.overflow <= 1 &&
        textScale.minimumTarget >= 44 && textScale.navInsideViewport && textScale.verdictVisible &&
        textScale.largeTextMode === 'true' && textScale.clippedText.length === 0,
      textScale
    );
    screenshots.push(await screenshot(page, 'mobile-runtime-text-200.png', 'mobile-runtime-text-200'));
    await page.evaluate(async () => {
      document.documentElement.style.removeProperty('-webkit-text-size-adjust');
      document.documentElement.style.removeProperty('text-size-adjust');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });

    const beforeMalformed = mock.state.snapshotCalls;
    mock.state.nextSnapshot = 'malformed';
    await refresh.click();
    await waitForCalls(mock.state, beforeMalformed, 'malformed snapshot');
    await waitForPhase(page, 'recovering');
    const malformed = await page.evaluate(() => ({
      app: Boolean(document.querySelector('[data-panel-app]')),
      notice: document.querySelector('.panel-runtime-notice')?.textContent || '',
    }));
    check(
      checks,
      'malformed snapshot is rejected while last valid evidence remains visible',
      malformed.app && malformed.notice.length > 0,
      malformed
    );

    const beforeApiError = mock.state.snapshotCalls;
    mock.state.nextSnapshot = 'api-error';
    await refresh.click();
    await waitForCalls(mock.state, beforeApiError, 'snapshot API error');
    await waitForPhase(page, 'recovering');
    check(
      checks,
      'snapshot API error never inserts a scenario fixture',
      await page.evaluate(() => (
        typeof window.__PANEL_TEST_SNAPSHOT__ === 'undefined' &&
        Boolean(document.querySelector('[data-panel-app]'))
      ))
    );

    const beforeStale = mock.state.snapshotCalls;
    mock.state.nextSnapshot = 'stale';
    await refresh.click();
    await waitForCalls(mock.state, beforeStale, 'historical snapshot');
    await waitForPhase(page, 'stale');
    const stale = await page.evaluate(() => {
      const root = document.querySelector(
        '[data-mobile-overview][data-mobile-evidence-mode="historical"]'
      );
      return {
        historical: Boolean(root),
        traffic: Boolean(root?.querySelector('[data-mobile-traffic]')),
      };
    });
    check(
      checks,
      'old evidence is labeled historical and current traffic is withheld',
      stale.historical && !stale.traffic,
      stale
    );
    screenshots.push(await screenshot(page, 'mobile-runtime-stale.png', 'mobile-runtime-stale'));

    const beforeOffline = mock.state.snapshotCalls;
    await page.evaluate(() => {
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        get: () => false,
      });
      window.dispatchEvent(new Event('offline'));
    });
    await waitForCalls(
      mock.state,
      beforeOffline,
      'same-origin refresh while navigator reports offline'
    );
    await waitForPhase(page, 'current');
    const offline = await page.evaluate(() => ({
      onLine: navigator.onLine,
      refreshDisabled: document.querySelector('.panel-runtime-actions button')?.disabled === true,
      phase: document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase'),
    }));
    check(
      checks,
      'navigator.onLine=false does not block a reachable same-origin snapshot',
      offline.onLine === false &&
        offline.refreshDisabled === false &&
        offline.phase === 'current',
      offline
    );

    const beforeOfflineManual = mock.state.snapshotCalls;
    await refresh.click();
    await waitForCalls(
      mock.state,
      beforeOfflineManual,
      'manual refresh while navigator reports offline'
    );
    await waitForPhase(page, 'current');
    check(
      checks,
      'manual refresh remains operational while navigator reports offline',
      mock.state.snapshotCalls > beforeOfflineManual,
      mock.state
    );

    await page.evaluate(() => {
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        get: () => true,
      });
      window.dispatchEvent(new Event('online'));
    });
    await waitForPhase(page, 'current');

    const beforeVisibility = mock.state.snapshotCalls;
    await page.evaluate(() => {
      const originalNow = Date.now;
      Date.now = () => originalNow() + 61000;
      document.dispatchEvent(new Event('visibilitychange'));
      queueMicrotask(() => { Date.now = originalNow; });
    });
    await waitForCalls(mock.state, beforeVisibility, 'visibility recovery', 6000);
    await waitForPhase(page, 'current');
    check(
      checks,
      'visibility restoration refreshes old runtime state',
      mock.state.snapshotCalls > beforeVisibility,
      mock.state
    );

    mock.state.scenario = 'interfaces-down';
    const tabletContext = await openContext({
      viewport: { width: 768, height: 1024 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const tabletPage = await tabletContext.newPage();
    tabletPage.setDefaultTimeout(actionTimeout);
    tabletPage.setDefaultNavigationTimeout(15000);
    tabletPage.on('pageerror', (error) => pageErrors.push('tablet: ' + error.message));
    await tabletPage.goto(mock.url, { waitUntil: 'domcontentloaded' });
    await waitForPhase(tabletPage, 'current', 12000);
    await tabletPage.locator('[data-mobile-overview-risk="interfaces"]').waitFor();
    const overviewUrl = tabletPage.url();
    const incidentRows = tabletPage.locator('[data-mobile-incident-object]');
    await incidentRows.nth(1).click();
    await tabletPage.waitForFunction(() => (
      document.querySelectorAll('[data-mobile-incident-object]')[1]?.getAttribute('aria-pressed') === 'true'
    ));
    const tabletOverviewSelection = await tabletPage.evaluate(() => {
      const selected = document.querySelector('[data-mobile-incident-object][aria-pressed="true"]');
      const inspector = document.querySelector('[data-mobile-incident-inspector]');
      return {
        active: document.querySelector('[data-panel-app]')?.getAttribute('data-active-section'),
        selectedId: selected?.getAttribute('data-mobile-incident-object'),
        inspectorId: inspector?.getAttribute('data-mobile-incident-inspector'),
        fields: inspector?.querySelectorAll('dl > div').length || 0,
        source: inspector?.querySelector('.mp-inspector-source code')?.textContent || '',
      };
    });
    check(
      checks,
      'tablet overview selects incident evidence beside the full object list without navigation',
      tabletPage.url() === overviewUrl &&
        tabletOverviewSelection.active === 'overview' &&
        tabletOverviewSelection.selectedId === tabletOverviewSelection.inspectorId &&
        tabletOverviewSelection.fields >= 3 &&
        tabletOverviewSelection.source.includes('interfaces['),
      tabletOverviewSelection
    );
    screenshots.push(await screenshot(tabletPage, 'tablet-overview-master-detail-768.png', 'tablet-overview-master-detail-768'));
    mock.state.scenario = '';
    const beforeTabletReset = mock.state.snapshotCalls;
    await tabletPage.locator('.panel-runtime-actions button[aria-label="立即刷新"]').click();
    await waitForCalls(mock.state, beforeTabletReset, 'tablet overview scenario reset');
    await waitForPhase(tabletPage, 'current');
    await tabletPage.locator('[data-mobile-overview-risk="none"]').waitFor();

    await tabletPage.locator('[data-section="interfaces"]').click();
    await tabletPage.locator('[data-mobile-domain-workspace="interfaces"]').waitFor();

    const inspectTabletWorkspace = () => tabletPage.evaluate(() => {
      const nav = document.querySelector('.panel-task-navigation');
      const layout = document.querySelector('.mdw-layout');
      const list = document.querySelector('.mdw-list-pane');
      const inspector = document.querySelector('.mdw-inspector');
      const navRect = nav?.getBoundingClientRect();
      const layoutRect = layout?.getBoundingClientRect();
      const listRect = list?.getBoundingClientRect();
      const inspectorRect = inspector?.getBoundingClientRect();
      return {
        viewport: { width: innerWidth, height: innerHeight },
        nav: navRect ? { left: navRect.left, right: navRect.right, width: navRect.width, height: navRect.height } : null,
        layout: layoutRect ? { left: layoutRect.left, right: layoutRect.right, width: layoutRect.width } : null,
        list: listRect ? { left: listRect.left, right: listRect.right, width: listRect.width } : null,
        inspector: inspectorRect ? { left: inspectorRect.left, right: inspectorRect.right, width: inspectorRect.width } : null,
        columns: layout ? getComputedStyle(layout).gridTemplateColumns : '',
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });

    const tablet768 = await inspectTabletWorkspace();
    check(
      checks,
      '768px tablet uses a persistent task rail with list and inspector',
      Boolean(
        tablet768.nav && tablet768.layout && tablet768.list && tablet768.inspector &&
        tablet768.nav.width >= 70 && tablet768.nav.width <= 96 &&
        tablet768.nav.right <= tablet768.layout.left + 1 &&
        tablet768.list.right <= tablet768.inspector.left + 1 &&
        tablet768.list.width >= 280 && tablet768.inspector.width >= 300 &&
        tablet768.columns.split(' ').length >= 2 && tablet768.overflow <= 1
      ),
      tablet768
    );
    screenshots.push(await screenshot(tabletPage, 'tablet-network-768.png', 'tablet-network-768'));

    await tabletPage.locator('[data-mobile-row-id]').first().click();
    await tabletPage.locator('[data-mobile-object-detail]').waitFor();
    const tabletSelection = await tabletPage.evaluate(() => ({
      listVisible: getComputedStyle(document.querySelector('.mdw-list-pane')).display !== 'none',
      detailVisible: Boolean(document.querySelector('[data-mobile-object-detail]')),
      detailFields: document.querySelectorAll('.mdw-detail-fields > div').length,
    }));
    check(
      checks,
      'tablet selection preserves the object list and opens field evidence beside it',
      tabletSelection.listVisible && tabletSelection.detailVisible && tabletSelection.detailFields >= 4,
      tabletSelection
    );

    await tabletPage.setViewportSize({ width: 844, height: 1024 });
    await tabletPage.waitForFunction(() => innerWidth === 844);
    const tablet844 = await inspectTabletWorkspace();
    check(
      checks,
      '844px tablet keeps the same rail-list-detail task architecture',
      Boolean(
        tablet844.nav && tablet844.layout && tablet844.list && tablet844.inspector &&
        tablet844.nav.right <= tablet844.layout.left + 1 &&
        tablet844.list.right <= tablet844.inspector.left + 1 &&
        tablet844.list.width > tablet768.list.width &&
        tablet844.inspector.width > tablet768.inspector.width &&
        tablet844.overflow <= 1
      ),
      tablet844
    );
    screenshots.push(await screenshot(tabletPage, 'tablet-network-844.png', 'tablet-network-844'));

    async function inspectCompactBoundary(width, height) {
      await tabletPage.setViewportSize({ width, height });
      await tabletPage.locator('[data-mobile-domain-workspace="interfaces"]').waitFor();
      return tabletPage.evaluate(() => ({
        mobile: Boolean(document.querySelector('[data-mobile-domain-workspace="interfaces"]')),
        rail: getComputedStyle(document.querySelector('.panel-task-navigation')).display,
        overflow: document.documentElement.scrollWidth - innerWidth,
      }));
    }

    const boundary1024 = await inspectCompactBoundary(1024, 768);
    const boundary1112 = await inspectCompactBoundary(1112, 834);
    const boundary1180 = await inspectCompactBoundary(1180, 820);
    await tabletPage.setViewportSize({ width: 1181, height: 820 });
    await tabletPage.waitForFunction(() => (
      !document.querySelector('[data-mobile-domain-workspace]') &&
      Boolean(document.querySelector('[data-panel-route-content="interfaces"]'))
    ));
    const boundary1181 = await tabletPage.evaluate(() => ({
      mobile: Boolean(document.querySelector('[data-mobile-domain-workspace]')),
      desktop: Boolean(document.querySelector('[data-panel-route-content="interfaces"]')),
      rail: getComputedStyle(document.querySelector('.panel-task-navigation')).display,
      overflow: document.documentElement.scrollWidth - innerWidth,
    }));
    const compactBoundaries = [boundary1024, boundary1112, boundary1180];
    check(
      checks,
      '1024–1180 keeps the compact task workspace and 1181 switches once to desktop',
      compactBoundaries.every((item) => item.mobile && item.rail === 'grid' && item.overflow <= 1) &&
        !boundary1181.mobile && boundary1181.desktop && boundary1181.rail === 'none' && boundary1181.overflow <= 1,
      { boundary1024, boundary1112, boundary1180, boundary1181 }
    );
    screenshots.push(await screenshot(tabletPage, 'tablet-desktop-boundary-1181.png', 'tablet-desktop-boundary-1181'));
    await tabletContext.close();

    await page.locator('.panel-runtime-actions button').nth(1).click();
    await page.locator('[data-router-connection-screen="mobile"]').waitFor();
    check(
      checks,
      'device switch returns to the real connection flow',
      await page.locator('[data-router-login-form]').isVisible()
    );
    await page.locator('.router-logout-button').last().click();
    await page.locator('[data-router-connection-screen="mobile"]').waitFor();
    check(
      checks,
      'logout clears runtime connection state',
      mock.state.logoutCalls === 1 && mock.state.configured === false,
      mock.state
    );
    await mobileContext.close();

    const desktopContext = await openContext({
      viewport: { width: 1366, height: 768 },
      deviceScaleFactor: 1,
    });
    const desktopPage = await desktopContext.newPage();
    desktopPage.setDefaultTimeout(actionTimeout);
    await desktopPage.goto(mock.url, { waitUntil: 'domcontentloaded' });
    await desktopPage.locator('[data-router-connection-screen="desktop"]').waitFor();
    const desktop = await desktopPage.evaluate(() => {
      const screen = document.querySelector('[data-router-connection-screen="desktop"]');
      const rect = screen?.getBoundingClientRect();
      return {
        form: Boolean(screen?.querySelector('[data-router-login-form]')),
        width: rect?.width || 0,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    check(
      checks,
      'desktop connection owns a dedicated workspace',
      desktop.form && desktop.width > 900 && desktop.overflow <= 1,
      desktop
    );
    screenshots.push(await screenshot(desktopPage, 'desktop-connection.png', 'desktop-connection'));
    await desktopContext.close();

    check(checks, 'browser emitted no uncaught page errors', pageErrors.length === 0, pageErrors);

    const report = {
      pass: checks.every((item) => item.pass),
      source: 'playwright-production-runtime',
      fixture: false,
      commit,
      gitHead: commit,
      git: { head: commit },
      generatedAt: utc(),
      checks,
      mock: mock.state,
      browser: {
        executablePath,
        version: browser.version(),
        driver: 'playwright-core',
      },
      screenshots: screenshots.map((item) => item.file),
      screenshotMetadata: screenshots,
    };
    await fsp.writeFile(
      path.join(outDir, 'report.json'),
      JSON.stringify(report, null, 2) + '\n',
      'utf8'
    );
    console.log(
      '[panel-runtime-browser] PASS checks=' +
        checks.length +
        ' snapshots=' +
        mock.state.snapshotCalls
    );
  } catch (error) {
    if (diagnosticPage && !diagnosticPage.isClosed()) {
      const diagnostic = {
        url: diagnosticPage.url(),
        body: await diagnosticPage.locator('body').innerText().catch(() => ''),
        html: await diagnosticPage.content().catch(() => ''),
        pageErrors,
      };
      await diagnosticPage.screenshot({
        path: path.join(outDir, 'failure.png'),
        animations: 'disabled',
      }).catch(() => {});
      await fsp.writeFile(
        path.join(outDir, 'failure-browser.json'),
        JSON.stringify(diagnostic, null, 2) + '\n',
        'utf8'
      ).catch(() => {});
    }
    throw error;
  } finally {
    await cleanup();
    if (cleanupRuntime === cleanup) cleanupRuntime = async () => {};
  }
}

let timeoutHandle;
const timeout = new Promise((_, reject) => {
  timeoutHandle = setTimeout(() => {
    const message = 'panel runtime browser contract exceeded ' + testTimeout + 'ms\n';
    try {
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'failure.log'), message, 'utf8');
    } catch {}
    reject(new Error(message.trim()));
    void cleanupRuntime();
  }, testTimeout);
});

Promise.race([main(), timeout]).then(() => {
  if (timeoutHandle) clearTimeout(timeoutHandle);
}).catch(async (error) => {
  if (timeoutHandle) clearTimeout(timeoutHandle);
  await fsp.mkdir(outDir, { recursive: true });
  let browserState = '';
  if (diagnosticPage && !diagnosticPage.isClosed()) {
    try {
      await diagnosticPage.screenshot({
        path: path.join(outDir, 'failure.png'),
        animations: 'disabled',
      });
      const body = await diagnosticPage.locator('body').innerText().catch(() => '');
      browserState = `\nurl=${diagnosticPage.url()}\nbody=${body.slice(0, 2000)}\npageErrors=${JSON.stringify(pageErrors)}`;
    } catch (captureError) {
      browserState = `\ndiagnosticCapture=${String(captureError && captureError.message || captureError)}`;
    }
  }
  await fsp.writeFile(
    path.join(outDir, 'failure.log'),
    String(error && (error.stack || error.message) || error) + browserState + '\n',
    'utf8'
  );
  console.error(error && (error.stack || error.message) || error);
  process.exitCode = 1;
});
