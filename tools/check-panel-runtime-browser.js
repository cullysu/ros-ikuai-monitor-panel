#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const http = require('http');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { launchManagedBrowser } = require('./acceptance/browser-lifecycle-v2/browser-lifecycle');
const { RUNTIME_CHECK_CONTRACT, RUNTIME_SCREENSHOT_CONTRACT } = require('./runtime-screenshot-contract');
const { assertFrameworkAssetIdentity } = require('./framework-asset-identity');
const { gitWorktreeIdentity } = require('./worktree-runtime-identity');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const outDir = path.join(root, '_acceptance', 'panel-runtime-browser');
const fingerprint = 'SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const sshTrustToken = 'mock-session-bound-ssh-trust-token';
const configuredLowLoadTimeout = Number(process.env.CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS || 0);
const actionTimeout = Number.isFinite(configuredLowLoadTimeout) && configuredLowLoadTimeout > 0
  ? Math.min(120000, Math.max(8000, configuredLowLoadTimeout))
  : 8000;
const configuredTestTimeout = Number(process.env.PANEL_RUNTIME_BROWSER_TIMEOUT_MS);
const testTimeout = Number.isFinite(configuredTestTimeout)
  ? Math.min(Math.max(configuredTestTimeout, 30000), 480000)
  : 480000;
const configuredScreenshotTimeout = Number(process.env.PANEL_RUNTIME_SCREENSHOT_TIMEOUT_MS);
const screenshotTimeout = Number.isFinite(configuredScreenshotTimeout)
  ? Math.min(Math.max(configuredScreenshotTimeout, 5000), 60000)
  : 60000;
let diagnosticPage = null;
const diagnosticPageErrors = [];
let cleanupRuntime = async () => {};
const runtimeProgress = {
  phase: 'bootstrap',
  phaseStartedAt: Date.now(),
  screenshots: 0,
  snapshotCalls: 0,
  browser: '',
  screenshotFile: '',
  screenshotState: '',
  screenshotFailure: null,
  cleanupTimeouts: [],
  cleanupErrors: [],
  browserLifecycle: [],
};

function setRuntimePhase(phase) {
  runtimeProgress.phase = phase;
  runtimeProgress.phaseStartedAt = Date.now();
}

function boundedCleanup(label, operation, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      runtimeProgress.cleanupTimeouts.push(label);
      const error = new Error(`${label} cleanup exceeded ${timeoutMs}ms`);
      error.code = 'CLEANUP_TIMEOUT';
      runtimeProgress.cleanupErrors.push(`${label}: ${error.message}`);
      reject(error);
    }, timeoutMs);
    Promise.resolve()
      .then(operation)
      .then(
        () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve();
        },
        (error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          runtimeProgress.cleanupErrors.push(`${label}: ${String(error && error.message || error)}`);
          reject(error);
        }
      );
  });
}

function utc(offsetMs) {
  return new Date(Date.now() + (offsetMs || 0)).toISOString();
}

const WINDOWS_MOCK_PORT_START = 18000;
const WINDOWS_MOCK_PORT_SPAN = 1000;
const WINDOWS_MOCK_PORT_ATTEMPTS = 64;
let nextWindowsMockPortOffset = process.pid % WINDOWS_MOCK_PORT_SPAN;
let nextMockPipeId = 0;

function nextWindowsMockPort() {
  const port = WINDOWS_MOCK_PORT_START + nextWindowsMockPortOffset;
  nextWindowsMockPortOffset = (nextWindowsMockPortOffset + 1) % WINDOWS_MOCK_PORT_SPAN;
  return port;
}

function listenServer(server, port, host) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

async function listenMockServer(server, { preferIpv4 = false } = {}) {
  if (process.platform !== 'win32') {
    await listenServer(server, 0, '127.0.0.1');
    return '127.0.0.1';
  }

  const failures = [];
  // Prefer IPv6 loopback on Windows. Local IPv4 client-port exhaustion from an
  // unrelated process must not prevent a bounded browser acceptance server
  // from starting. Windows 11 and GitHub Windows runners expose ::1; IPv4 is a
  // compatibility fallback when the IPv6 stack is unavailable.
  const hosts = preferIpv4 ? ['127.0.0.1', '::1'] : ['::1', '127.0.0.1'];
  for (const host of hosts) {
    for (let attempt = 0; attempt < WINDOWS_MOCK_PORT_ATTEMPTS; attempt += 1) {
      const port = nextWindowsMockPort();
      try {
        await listenServer(server, port, host);
        return host;
      } catch (error) {
        failures.push({ host, port, code: error?.code || null });
        if (!['EADDRINUSE', 'EACCES', 'ENOBUFS', 'EADDRNOTAVAIL', 'EAFNOSUPPORT'].includes(error?.code)) throw error;
        if (['ENOBUFS', 'EADDRNOTAVAIL', 'EAFNOSUPPORT'].includes(error?.code)) break;
      }
    }
  }
  const error = new Error(`mock server could not bind a safe Windows loopback port after ${failures.length} attempts`);
  error.code = 'MOCK_PORT_UNAVAILABLE';
  error.failures = failures;
  throw error;
}

function nextWindowsMockPipeIdentity() {
  nextMockPipeId += 1;
  const id = `${process.pid}-${Date.now()}-${nextMockPipeId}`;
  return {
    path: `\\\\.\\pipe\\ros-ikuai-panel-${id}`,
    url: `http://panel-${id}.test/`,
  };
}

function listenPipeServer(server, pipePath) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(pipePath);
  });
}

function requestPipeResponse(socketPath, browserRequest) {
  return new Promise((resolve, reject) => {
    const target = new URL(browserRequest.url());
    const body = browserRequest.postDataBuffer();
    const request = http.request({
      socketPath,
      path: `${target.pathname}${target.search}`,
      method: browserRequest.method(),
      headers: {
        ...browserRequest.headers(),
        host: target.host,
        ...(body ? { 'content-length': String(body.length) } : {}),
      },
    }, (response) => {
      const chunks = [];
      let bytes = 0;
      response.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes > 16 * 1024 * 1024) {
          response.destroy(new Error('mock pipe response exceeded 16 MiB'));
          return;
        }
        chunks.push(chunk);
      });
      response.once('error', reject);
      response.once('end', () => {
        const headers = Object.fromEntries(Object.entries(response.headers)
          .filter(([, value]) => typeof value !== 'undefined')
          .map(([name, value]) => [name, Array.isArray(value) ? value.join(', ') : String(value)]));
        resolve({ status: response.statusCode || 500, headers, body: Buffer.concat(chunks) });
      });
    });
    request.once('error', reject);
    request.setTimeout(actionTimeout, () => request.destroy(new Error('mock pipe request timed out')));
    request.end(body || undefined);
  });
}

function sendJson(response, status, payload, extraHeaders = {}) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  response.end(body);
}

function channelTest(restOk) {
  return {
    ssh: { ok: true, identity: 'smoke-router', error: null, elapsedMs: 18 },
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
    host: configured ? 'smoke-router' : '',
    user: configured ? 'observer' : '',
    sshPort: 22,
    sshHostKeyFingerprint: configured ? fingerprint : '',
    restScheme: 'https',
    restPort: 443,
    restVerifyTls: true,
    insecureRestConfirmed: false,
    source: configured ? 'ui' : 'memory',
    savedId: configured ? 'smoke-router' : '',
    updatedAt: configured ? utc() : null,
    passwordSet: configured,
    lastTest: configured ? channelTest(false) : null,
  };
}

function savedProfiles() {
  return [{
    id: 'smoke-router',
    host: 'smoke-router',
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
      target: '127.0.0.1',
      routerHost: '127.0.0.1',
      configuredIdentity: 'smoke-router',
      pollSeconds: settings.pollSeconds || 2,
      realtimeUpdatedAt: now,
      staticUpdatedAt: now,
      capabilities: { restTrusted: false, sshRead: true, routerosWrite: false },
    },
    overview: {
      identity: 'smoke-router',
      version: '7.15-smoke',
      uptime: '2d 04:11:00',
      cpuLoad: 23,
      memoryUsage: 41,
      diskUsage: 18,
      connectionTotal: 42,
      onlineTerminals: 25,
      history: {
        trafficSamples: [18000000, 31250000, 27500000, 29000000, 26000000, 24000000 + sequence].map((downlink, index) => ({
          timestamp: new Date(Date.parse(now) - (5 - index) * 180000).toISOString(),
          uplink: [6200000, 7100000, 7800000, 8500000, 7500000, 8000000][index],
          downlink,
          source: 'runtime-mock-counter-delta',
          evidenceMode: 'current',
        })),
        cpu: [19, 21, 23],
        memory: [39, 40, 41],
        disk: [18, 18, 18],
      },
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
        rxBytes: 981234567,
        txBytes: 341234567,
        rxPackets: 812340,
        txPackets: 401230,
        rxDrop: 2,
        txDrop: 1,
        rxError: 0,
        txError: 0,
        lossRate: 0.02,
        errorRate: 0,
        qualityUpdatedAt: now,
        qualitySampleCount: 12,
        qualitySampleReady: true,
        ips: ['198.51.100.2/32'],
        mac: '02:00:00:00:10:01',
      },
      {
        name: 'bridge-lan',
        type: 'bridge',
        role: 'LAN',
        running: true,
        disabled: false,
        rxRate: 2000000,
        txRate: 4000000,
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
    dhcp: {
      leases: [{
        address: '192.0.2.20',
        macAddress: '02:00:00:00:00:01',
        hostName: 'workstation-01',
        server: 'lan-dhcp',
        status: 'bound',
      }],
      clients: [],
      pools: [],
    },
    arp: {
      items: [{
        ip: '192.0.2.20',
        mac: '02:00:00:00:00:01',
        interface: 'bridge-lan',
        status: 'reachable',
        dynamic: true,
      }],
      alerts: [],
    },
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
    loadBalance: {
      mode: 'PCC',
      activeLines: 1,
      pccDetected: true,
      defaultRoutes: [{
        dstAddress: '0.0.0.0/0',
        default: true,
        gateway: 'pppoe-wan1',
        active: true,
        disabled: false,
        distance: 1,
        table: 'main',
      }],
      mangleRules: [{
        chain: 'prerouting',
        action: 'mark-routing',
        newRoutingMark: 'wan1',
        outInterface: 'pppoe-wan1',
        comment: 'PCC primary line',
      }],
      routingRules: [],
    },
    connections: {
      total: 42,
      active: [{
        id: 'conn-1',
        source: '192.0.2.20',
        destination: '198.51.100.44',
        protocol: 'tcp',
        sourcePort: 53142,
        destinationPort: 443,
        totalRate: 640000,
        sessionBytes: 2400000,
        connections: 1,
      }],
      protocolTop: [{ label: 'tcp', count: 3, totalRate: 640000 }],
      topIps: [{ ip: '192.0.2.20', destination: '198.51.100.44', protocol: 'tcp', count: 3, totalRate: 640000 }],
    },
    dns: {
      running: true,
      servers: ['1.1.1.1', '2606:4700:4700::1111'],
      dohServer: 'https://dns.example/dns-query',
      verifyDohCert: true,
      forwardRules: [{
        name: 'router.local',
        type: 'A',
        value: '192.0.2.1',
        ttl: '1h',
        comment: 'LAN resolver',
        disabled: false,
      }],
      ipv6Nd: [{
        interface: 'bridge-lan',
        status: 'running',
        advertiseDns: true,
        dnsServers: ['2001:db8::53'],
        addDefaultRoute: false,
      }],
      ipv6DhcpClients: [{
        interface: 'pppoe-wan1',
        status: 'bound',
        usePeerDns: true,
        addDefaultRoute: true,
      }],
    },
    security: {
      filters: [{
        id: '*4',
        rawOrder: 4,
        chain: 'forward',
        action: 'drop',
        packets: 12,
        bytes: 2048,
        disabled: false,
        inInterface: 'pppoe-wan1',
        dstAddress: '192.0.2.0/24',
        comment: 'block unsolicited WAN',
      }],
      alerts: [],
      addressLists: [],
    },
    logs: {
      all: [{
        time: now,
        topics: 'system,warning',
        severity: 'warning',
        message: 'pppoe-wan1 link renegotiated',
      }, {
        time: '2026-07-17T10:02:12Z',
        topics: 'ppp,info',
        severity: 'info',
        message: 'pppoe-wan1 authenticated',
      }, {
        time: '2026-07-17T10:01:12Z',
        topics: 'interface,info',
        severity: 'info',
        message: 'pppoe-wan1 carrier detected',
      }],
      system: [],
      firewall: [],
      dhcp: [],
      dns: [],
    },
  };
}

function scaleSnapshotTraffic(payload, scale) {
  if (!Number.isFinite(scale) || scale === 1) return;
  payload.overview.history.trafficSamples = payload.overview.history.trafficSamples.map((sample) => ({
    ...sample,
    downlink: sample.downlink * scale,
    uplink: sample.uplink * scale,
  }));
  for (const rows of [payload.interfaces, payload.wan, payload.pppoe]) {
    for (const row of rows) {
      for (const key of ['rxRate', 'txRate', 'downRate', 'upRate']) {
        if (Number.isFinite(row[key])) row[key] *= scale;
      }
    }
  }
}

async function requestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

function supplementalEnvelope(kind, options = {}) {
  const now = options.observedAt === undefined ? utc() : options.observedAt;
  return {
    schemaVersion: 1,
    kind,
    readOnly: true,
    generatedAt: utc(),
    observedAt: now,
    evidenceMode: options.evidenceMode || 'current',
    source: options.source || 'rest-live',
    sourceStatus: options.sourceStatus || 'ok',
    coverage: options.coverage || 'page',
  };
}

function defaultSupplementalState() {
  const healthObservedAt = utc();
  return {
    requests: [],
    connectionSearch: {
      mode: 'success',
      delayMs: 0,
      body: {
        ...supplementalEnvelope('connection-search', { source: 'routeros-ssh', coverage: 'bounded-sample' }),
        targetIp: '192.0.2.42',
        sourceIp: null,
        limit: 40,
        query: { targetIp: '192.0.2.42', sourceIp: null },
        page: { requestedLimit: 40, returnedCount: 2, maxLimit: 50 },
        matchCount: 2,
        transport: 'ssh',
        capture: {
          complete: false,
          capturedBytes: 4096,
          firstOutputSeconds: 0.03,
          truncatedByRows: true,
          truncatedByBytes: false,
          timedOut: false,
          incompleteTransport: false,
          truncatedByLimit: true,
        },
        rows: [
          { srcIp: '192.0.2.42', dstIp: '1.1.1.1', protocol: 'tcp', timeout: '00:00:18', origRateBps: null, replRateBps: 0 },
          { srcIp: '192.0.2.42', dstIp: '8.8.8.8', protocol: 'udp', timeout: '00:00:04', origRateBps: 125000, replRateBps: 64000 },
        ],
      },
    },
    dnsStatic: {
      mode: 'success',
      delayMs: 0,
      pages: new Map([
        [0, {
          ...supplementalEnvelope('dns-static', { coverage: 'page' }),
          revision: 'd'.repeat(64),
          offset: 0,
          limit: 50,
          totalCount: 51,
          visibleRuleCount: 2,
          page: { offset: 0, pageSize: 50, returnedCount: 2, totalCount: 51, revision: 'd'.repeat(64), maxPageSize: 50, maxVisibleRows: 1000, maxVisiblePages: 20 },
          rows: [
            { name: 'nas.example', type: 'A', value: '192.0.2.8', ttl: '5m', comment: '', disabled: false },
            { name: 'old.example', type: 'A', value: '192.0.2.9', ttl: '1h', comment: 'legacy', disabled: true },
          ],
        }],
        [50, {
          ...supplementalEnvelope('dns-static', { evidenceMode: 'historical', source: 'rest-cache', sourceStatus: 'degraded', coverage: 'page' }),
          revision: 'd'.repeat(64),
          offset: 50,
          limit: 50,
          totalCount: 51,
          visibleRuleCount: 1,
          page: { offset: 50, pageSize: 50, returnedCount: 1, totalCount: 51, revision: 'd'.repeat(64), maxPageSize: 50, maxVisibleRows: 1000, maxVisiblePages: 20 },
          rows: [{ name: 'vpn.example', type: 'A', value: '192.0.2.10', ttl: '10m', comment: '', disabled: false }],
        }],
      ]),
    },
    healthFindings: {
      mode: 'success',
      delayMs: 0,
      body: {
        ...supplementalEnvelope('health-findings', { source: 'snapshot-health-analysis', coverage: 'bounded-sample', observedAt: healthObservedAt }),
        status: 'critical',
        sourceUpdatedAt: healthObservedAt,
        limit: 20,
        counts: { critical: 1, warning: 0, info: 0 },
        findings: [{
          id: 'system.resource_pressure',
          severity: 'critical',
          domain: 'resources',
          title: '路由器资源压力偏高',
          summary: 'CPU 已超过告警阈值。',
          source: 'collector-health-v1',
          priority: 1,
          evidence: [{ label: 'CPU', value: '96%' }],
        }],
      },
    },
  };
}

async function respondSupplemental(response, state, kind, requestData, source) {
  state.supplemental.requests.push({ kind, ...requestData });
  if (source.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, source.delayMs));
  if (source.mode === 'error') {
    sendJson(
      response,
      source.status || 502,
      source.errorBody || { code: source.code || 'supplement_unavailable', error: 'mock supplemental endpoint unavailable' },
      source.headers || {},
    );
    return;
  }
  if (source.mode === 'malformed') {
    sendJson(response, 200, source.body || { malformed: true });
    return;
  }
  if (source.mode === 'empty') {
    const body = typeof source.emptyBody === 'function' ? source.emptyBody(requestData) : source.emptyBody;
    sendJson(response, 200, body || { ...(typeof source.body === 'object' ? source.body : {}), rows: [], findings: [] });
    return;
  }
  const body = typeof source.body === 'function' ? source.body(requestData) : source.body;
  sendJson(response, 200, body);
}

async function startMock({ transport = 'tcp', preferIpv4 = false } = {}) {
  const state = {
    configured: false,
    loginAttempts: 0,
    snapshotCalls: 0,
    logoutCalls: 0,
    sequence: 0,
    nextSnapshot: '',
    scenario: '',
    reverseInterfaces: false,
    rateScale: 1,
    pollSeconds: 2,
    lastLoginBody: null,
    connectionStatusDelayMs: 0,
    connectionStatusError: false,
    supplemental: defaultSupplementalState(),
  };

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');

      if (request.method === 'GET' && url.pathname === '/api/router-login') {
        if (state.connectionStatusDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, state.connectionStatusDelayMs));
        }
        if (state.connectionStatusError) {
          sendJson(response, 503, {
            ok: false,
            code: 'connection_status_unavailable',
            error: 'mock connection status unavailable',
          });
          return;
        }
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

        if (
          body.password === 'correct-horse' &&
          body.continueWithVerifiedRestOnly !== true &&
          (body.sshHostKeyFingerprint !== fingerprint || body.sshHostKeyTrustToken !== sshTrustToken)
        ) {
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
                trustToken: sshTrustToken,
                trustExpiresAt: new Date(Date.now() + 180000).toISOString(),
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
        const restOnly = body.continueWithVerifiedRestOnly === true;
        sendJson(response, 200, {
          ok: true,
          routerLogin: profile(true),
          savedLogins: savedProfiles(),
          test: restOnly ? {
            ssh: {
              ok: false,
              error: 'SSH host key confirmation required',
              elapsedMs: 8,
              fingerprint,
              algorithm: 'ssh-ed25519',
              confirmationRequired: true,
              hostKeyChanged: false,
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
          } : channelTest(false),
          warning: restOnly
            ? 'HTTPS REST verified for this request; SSH host key remains unpinned.'
            : 'SSH verified; REST evidence is not yet current.',
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

      if (request.method === 'GET' && url.pathname === '/api/connection-search') {
        await respondSupplemental(response, state, 'connection-search', {
          target: url.searchParams.get('target'),
          source: url.searchParams.get('source'),
          limit: url.searchParams.get('limit'),
        }, state.supplemental.connectionSearch);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/dns-static') {
        const offset = Number(url.searchParams.get('offset') || '0');
        const limit = Number(url.searchParams.get('limit') || '0');
        const dns = state.supplemental.dnsStatic;
        const page = dns.pages instanceof Map ? dns.pages.get(offset) : null;
        const responseSource = page && page.__mockResponse === true
          ? { ...dns, ...page }
          : { ...dns, body: page || dns.body };
        await respondSupplemental(response, state, 'dns-static', { offset, limit }, responseSource);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/health-findings') {
        await respondSupplemental(response, state, 'health-findings', {}, state.supplemental.healthFindings);
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
        scaleSnapshotTraffic(payload, state.rateScale);
        if (state.scenario === 'all-offline') {
          payload.meta = { ...payload.meta, scaleScenario: 'all-offline' };
          payload.wan = Array.from({ length: 8 }, (_, index) => ({
            name: `pppoe-wan${index + 1}`,
            interface: `pppoe-wan${index + 1}`,
            running: false,
            disabled: false,
            downRate: 0,
            upRate: 0,
          }));
          payload.pppoe = payload.wan.map((row) => ({ ...row }));
          payload.routes = {
            defaultRoutes: [1, 2, 3].map((distance) => ({
              dstAddress: '0.0.0.0/0',
              default: true,
              gateway: `pppoe-wan${distance}`,
              active: false,
              disabled: false,
              distance,
              table: 'main',
            })),
          };
        }
        if (state.scenario === 'no-snapshot') {
          const failureObservedAt = utc();
          Object.assign(payload, {
            status: 'error',
            error: '设备当前不可达',
            overview: {},
            wan: [],
            pppoe: [],
            interfaces: [],
            routes: { defaultRoutes: [] },
            connections: {},
            terminals: [],
          });
          payload.meta = {
            scaleScenario: 'no-snapshot',
            configuredIdentity: 'RouterOS',
            target: '10.0.0.1',
            routerHost: '10.0.0.1',
            pollSeconds: state.pollSeconds,
            realtimeError: '设备当前不可达',
            staticError: '静态 REST 采集失败',
            connectionDetailError: '连接明细 REST 采集失败',
            realtimeEndpointFailures: [{ channel: 'realtime-rest', group: '实时 REST', name: 'system_resource', endpoint: '/rest/system/resource', message: '设备当前不可达', at: failureObservedAt }],
            staticEndpointFailures: [{ channel: 'static-rest', group: '静态 REST', name: 'system_resource', endpoint: '/rest/system/resource', message: '静态 REST 端点读取失败', at: failureObservedAt }],
            detailEndpointFailures: [{ channel: 'detail-rest', group: '连接明细 REST', name: 'connections', endpoint: '/rest/ip/firewall/connection', message: '连接明细 REST 端点读取失败', at: failureObservedAt }],
            capabilities: { restTrusted: false, sshRead: false, routerosWrite: false },
          };
        }
        if (state.scenario === 'comparison-multi') {
          payload.interfaces.push(
            { name: 'ether2', type: 'ether', role: 'LAN', parent: 'switch1', running: true, disabled: false, rxRate: 3100000, txRate: 1200000 },
            { name: 'ether3', type: 'ether', role: 'LAN', parent: 'switch1', running: true, disabled: false, rxRate: 2700000, txRate: 900000 },
          );
        }
        if (state.scenario === 'fleet-coverage') {
          payload.wan.push(
            { name: 'pppoe-wan2', interface: 'pppoe-wan2', running: true, disabled: false, downRate: 0, upRate: 0 },
            { name: 'pppoe-wan3', interface: 'pppoe-wan3', running: true, disabled: false, downRate: 0, upRate: 0 },
            { name: 'pppoe-wan4', interface: 'pppoe-wan4', running: true, disabled: false, downRate: 0, upRate: 0 },
          );
          payload.pppoe = payload.wan.map((row) => ({ ...row }));
          payload.interfaces.push(
            { name: 'ether2', type: 'ether', role: 'LAN', parent: 'switch1', running: true, disabled: false, rxRate: 3100000, txRate: 1200000 },
            { name: 'ether3', type: 'ether', role: 'LAN', parent: 'switch1', running: true, disabled: false, rxRate: 2700000, txRate: 900000 },
            { name: 'ether4', type: 'ether', role: 'LAN', parent: 'switch1', running: true, disabled: false, rxRate: 2100000, txRate: 700000 },
            { name: 'ether5', type: 'ether', role: 'LAN', parent: 'switch1', running: true, disabled: false, rxRate: 1900000, txRate: 600000 },
            { name: 'ether6', type: 'ether', role: 'LAN', parent: 'switch1', running: true, disabled: false, rxRate: 1700000, txRate: 500000 },
            { name: 'ether7', type: 'ether', role: 'LAN', parent: 'switch1', running: true, disabled: false, rxRate: 1500000, txRate: 400000 },
          );
        }
        if (state.scenario === 'fleet') {
          payload.meta = {
            ...payload.meta,
            scaleScenario: 'fleet',
            configuredIdentity: 'Fleet-Core',
          };
          payload.wan.push(...Array.from({ length: 7 }, (_, index) => ({
            name: `pppoe-wan${index + 2}`,
            interface: `pppoe-wan${index + 2}`,
            running: true,
            disabled: false,
            downRate: 18000000 - (index * 900000),
            upRate: 9000000 - (index * 400000),
          })));
          payload.pppoe = payload.wan.map((row) => ({ ...row }));
        }
        if (state.scenario === 'fleet' || state.scenario === 'interfaces-down' || state.scenario === 'interface-review') {
          payload.interfaces.push(
            { name: 'ether9', type: 'ether', role: 'LAN', parent: 'switch1', running: false, disabled: false },
            { name: 'vlan30', type: 'vlan', role: 'LAN', parent: 'ether9', vlan: 30, running: false, disabled: false },
            { name: 'sfp-lan', type: 'ether', role: 'LAN', parent: 'switch1', running: false, disabled: false },
          );
        }
        if (state.scenario.startsWith('composite-risk')) {
          payload.interfaces.push(
            { name: 'ether9', type: 'ether', role: 'LAN', parent: 'switch1', running: false, disabled: false },
          );
          if (state.scenario === 'composite-risk-collection') payload.interfaces.push(
            { name: 'vlan30', type: 'vlan', role: 'LAN', parent: 'ether9', vlan: 30, running: false, disabled: false },
          );
        }
        if (state.scenario === 'fleet' || state.scenario === 'interfaces-down') {
          payload.routes.defaultRoutes.push(
            { dstAddress: '0.0.0.0/0', default: true, gateway: 'ether9', active: false, disabled: false, distance: 2, table: 'main' },
            { dstAddress: '0.0.0.0/0', default: true, gateway: 'vlan30', active: false, disabled: false, distance: 3, table: 'main' },
            { dstAddress: '0.0.0.0/0', default: true, gateway: 'sfp-lan', active: false, disabled: false, distance: 4, table: 'main' },
          );
        }
        if (state.scenario.startsWith('composite-risk')) {
          payload.routes.defaultRoutes.push(
            { dstAddress: '0.0.0.0/0', default: true, gateway: 'ether9', active: false, disabled: false, distance: 2, table: 'main' },
          );
          if (state.scenario === 'composite-risk-collection') payload.routes.defaultRoutes.push(
            { dstAddress: '0.0.0.0/0', default: true, gateway: 'vlan30', active: false, disabled: false, distance: 3, table: 'main' },
          );
        }
        if (state.scenario === 'collection-down') {
          const failureObservedAt = utc();
          Object.assign(payload.meta, {
            realtimeError: '实时 REST 通道未完成采集',
            slowRestError: '慢速 REST 通道未完成采集',
            staticError: '静态 REST 通道未完成采集',
            connectionDetailError: '连接明细 REST 通道未完成采集',
            realtimeEndpointFailures: [{ channel: 'realtime-rest', group: '实时 REST', name: 'interfaces', endpoint: '/rest/interface', message: '实时接口端点读取失败', at: failureObservedAt }],
            slowRestEndpointFailures: [{ channel: 'slow-rest', group: '慢速 REST', name: 'routes', endpoint: '/rest/ip/route', message: '慢速路由端点读取失败', at: failureObservedAt }],
            staticEndpointFailures: [{ channel: 'static-rest', group: '静态 REST', name: 'system_resource', endpoint: '/rest/system/resource', message: '静态资源端点读取失败', at: failureObservedAt }],
            detailEndpointFailures: [{ channel: 'detail-rest', group: '连接明细 REST', name: 'connections', endpoint: '/rest/ip/firewall/connection', message: '连接明细端点读取失败', at: failureObservedAt }],
            capabilities: { restTrusted: false, sshRead: false, routerosWrite: false },
          });
        }
        if (state.scenario.startsWith('resource-') || state.scenario.startsWith('composite-risk')) {
          Object.assign(payload.overview, {
            cpuLoad: 96,
            memoryUsage: 92,
            diskUsage: 97,
          });
          const resourceSampleAt = Date.parse(payload.updatedAt);
          const resourceTimestamps = [900000, 720000, 540000, 360000, 180000, 0].map((offset) => (
            new Date(resourceSampleAt - offset).toISOString()
          ));
          const resourceCpu = [88, 90, 91, 93, 95, 96];
          const resourceMemory = [86, 87, 88, 89, 91, 92];
          const resourceDisk = [91, 92, 93, 94, 96, 97];
          Object.assign(payload.overview.history, {
            timestamps: resourceTimestamps,
            resourceSamples: resourceTimestamps.map((timestamp, index) => ({
              timestamp,
              cpu: resourceCpu[index],
              memory: resourceMemory[index],
              disk: resourceDisk[index],
              source: 'runtime-mock-resource',
              evidenceMode: 'current',
            })),
            cpu: resourceCpu,
            memory: resourceMemory,
            disk: resourceDisk,
          });
          if (state.scenario === 'resource-mismatch') {
            payload.overview.history.resourceSamples[payload.overview.history.resourceSamples.length - 1].cpu = 90;
            payload.overview.history.cpu[payload.overview.history.cpu.length - 1] = 90;
          }
          if (state.scenario === 'resource-stale') {
            payload.meta = { ...payload.meta, pollSeconds: 300 };
            payload.overview.history.resourceSamples = payload.overview.history.resourceSamples.map((sample) => ({
              ...sample,
              timestamp: new Date(Date.parse(sample.timestamp) - 10 * 60 * 1000).toISOString(),
            }));
          }
          if (state.scenario === 'resource-partial') {
            payload.overview.history.resourceSamples[payload.overview.history.resourceSamples.length - 1].memory = null;
          }
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

  let mockUrl = '';
  let installRoute = null;
  let socketPath = null;
  let stopping = false;
  let stopped = false;
  if (transport === 'pipe') {
    if (process.platform !== 'win32') throw new Error('mock pipe transport is only supported on Windows');
    const pipe = nextWindowsMockPipeIdentity();
    await listenPipeServer(server, pipe.path);
    mockUrl = pipe.url;
    socketPath = pipe.path;
    installRoute = async (context) => {
      await context.route(`${pipe.url}**`, async (route) => {
        try {
          const response = await requestPipeResponse(pipe.path, route.request());
          await route.fulfill(response);
        } catch (error) {
          const resetCodes = ['ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ERR_STREAM_DESTROYED'];
          if (!resetCodes.includes(error?.code)) throw error;
          const browserFailure = route.request().failure();
          state.pipeResets = Array.isArray(state.pipeResets) ? state.pipeResets : [];
          state.pipeResets.push({
            code: error.code,
            stopping,
            browserFailure: browserFailure || null,
            accepted: stopping || Boolean(browserFailure),
            url: route.request().url(),
          });
          await route.abort('aborted').catch(() => {});
        }
      });
    };
  } else if (transport === 'tcp') {
    // Bind the real server once. Windows uses a bounded low port range outside
    // its default dynamic client range because Edge can reject loopback servers
    // allocated inside that range with ERR_ADDRESS_IN_USE. Other platforms let
    // the OS allocate the real listener directly. Neither path probes then
    // rebinds a released port.
    const listenHost = await listenMockServer(server, { preferIpv4 });
    const address = server.address();
    if (!address || typeof address === 'string') {
      await new Promise((resolve) => server.close(resolve));
      throw new Error('mock server did not expose a TCP listen address');
    }
    mockUrl = `http://${listenHost.includes(':') ? `[${listenHost}]` : listenHost}:${address.port}/`;
  } else {
    throw new Error(`unsupported mock transport: ${transport}`);
  }

  return {
    state,
    url: mockUrl,
    transport,
    installRoute,
    socketPath,
    beginStop: () => {
      stopping = true;
    },
    stop: () => {
      if (stopped) return Promise.resolve();
      stopping = true;
      stopped = true;
      return new Promise((resolve, reject) => {
        server.close((error) => {
          if (error && error.code !== 'ERR_SERVER_NOT_RUNNING') reject(error);
          else resolve();
        });
        server.closeIdleConnections?.();
        server.closeAllConnections?.();
      });
    },
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
  setRuntimePhase(`waitForCalls:${label}`);
  const startedAt = Date.now();
  while (state.snapshotCalls <= baseline) {
    runtimeProgress.snapshotCalls = state.snapshotCalls;
    if (Date.now() - startedAt > (timeout || actionTimeout)) {
      throw new Error('timed out waiting for ' + label + '; calls=' + state.snapshotCalls);
    }
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  runtimeProgress.snapshotCalls = state.snapshotCalls;
}

async function waitForPhase(page, phase, timeout) {
  setRuntimePhase(`waitForPhase:${phase}`);
  await page.waitForFunction(
    (expected) => document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase') === expected,
    phase,
    { timeout: timeout || actionTimeout }
  );
}

async function screenshot(page, fileName, state, options = {}) {
  setRuntimePhase(`screenshot:${fileName}`);
  runtimeProgress.screenshotFile = fileName;
  runtimeProgress.screenshotState = state;
  const filePath = path.join(outDir, fileName);
  const { evidence, ...captureOptions } = options;
  let image;
  let screenshotTimer;
  try {
    const capture = page.screenshot({
      path: filePath,
      ...captureOptions,
      animations: 'disabled',
      timeout: screenshotTimeout,
    });
    image = await Promise.race([
      capture,
      new Promise((_, reject) => {
        screenshotTimer = setTimeout(
          () => reject(new Error(`screenshot timed out after ${screenshotTimeout}ms`)),
          screenshotTimeout
        );
      }),
    ]);
  } catch (error) {
    const diagnostic = {
      contract: 'runtime-screenshot-failure-v1',
      file: fileName,
      state,
      phase: runtimeProgress.phase,
      phaseAgeMs: Date.now() - runtimeProgress.phaseStartedAt,
      timeoutMs: screenshotTimeout,
      url: (() => { try { return page.url(); } catch { return ''; } })(),
      viewport: page.viewportSize(),
      browser: runtimeProgress.browser,
      error: error instanceof Error ? error.message : String(error),
      capturedAt: utc(),
    };
    runtimeProgress.screenshotFailure = diagnostic;
    await fsp.mkdir(outDir, { recursive: true });
    await fsp.writeFile(
      path.join(outDir, 'failure-screenshot.json'),
      JSON.stringify(diagnostic, null, 2) + '\n',
      'utf8'
    );
    throw error;
  } finally {
    if (screenshotTimer) clearTimeout(screenshotTimer);
  }
  runtimeProgress.screenshots += 1;
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
    ...(evidence ? { evidence } : {}),
    capturedAt: utc(),
  };
}

async function isolatedScreenshot(url, fileName, state, viewport, selector, browserPath) {
  setRuntimePhase(`isolated-screenshot:${fileName}`);
  runtimeProgress.screenshotFile = fileName;
  runtimeProgress.screenshotState = state;
  const filePath = path.join(outDir, fileName);
  const helper = path.join(__dirname, 'capture-runtime-screenshot.js');
  const child = spawn(process.execPath, [helper, JSON.stringify({
    url,
    output: filePath,
    viewport,
    selector,
    browser: browserPath,
    timeout: screenshotTimeout,
  })], {
    env: { ...process.env, CODEX_MEMORY_LIMIT_MB: '2048', NODE_OPTIONS: '--max-old-space-size=2048' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  const killTree = () => {
    if (process.platform === 'win32') {
      // taskkill can block the parent for minutes while Edge is unwinding. Never
      // run it synchronously: the runtime contract must be able to report the
      // isolated-capture failure and clean up the remaining contexts.
      const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
      });
      killer.unref();
    } else {
      child.kill('SIGKILL');
    }
  };
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      killTree();
      reject(new Error(`isolated screenshot timed out after ${screenshotTimeout}ms: ${fileName}`));
    }, screenshotTimeout);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`isolated screenshot failed (${code || signal}): ${fileName}; ${stderr.trim()}`));
        return;
      }
      try {
        const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
        resolve(JSON.parse(lines.at(-1)));
      } catch (error) {
        reject(new Error(`isolated screenshot returned invalid metadata: ${fileName}; ${error.message}`));
      }
    });
  }).catch(async (error) => {
    const diagnostic = {
      contract: 'runtime-screenshot-failure-v1',
      file: fileName,
      state,
      phase: runtimeProgress.phase,
      phaseAgeMs: Date.now() - runtimeProgress.phaseStartedAt,
      timeoutMs: screenshotTimeout,
      url,
      viewport,
      browser: browserPath,
      error: error.message,
      capturedAt: utc(),
    };
    runtimeProgress.screenshotFailure = diagnostic;
    await fsp.writeFile(path.join(outDir, 'failure-screenshot.json'), JSON.stringify(diagnostic, null, 2) + '\n', 'utf8');
    throw error;
  });
  runtimeProgress.screenshots += 1;
  return {
    file: fileName,
    path: path.relative(root, filePath).split(path.sep).join('/'),
    state,
    bytes: result.bytes,
    sha256: result.sha256,
    image: result.image,
    viewport: result.viewport,
    capturedAt: utc(),
  };
}

async function inspectMainLandmarkOwnership(page) {
  return page.evaluate(() => ({
    appMountTag: document.getElementById('app')?.tagName || '',
    mainLandmarkCount: document.querySelectorAll('main').length,
    visibleMainLandmarkCount: [...document.querySelectorAll('main')].filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    }).length,
    nestedMainLandmarkCount: document.querySelectorAll('main main').length,
  }));
}

function ownsExactlyOneMain(state) {
  return state.appMountTag === 'DIV' &&
    state.mainLandmarkCount === 1 &&
    state.visibleMainLandmarkCount === 1 &&
    state.nestedMainLandmarkCount === 0;
}

async function inspectCompositeRiskSurface(page) {
  return page.evaluate(() => {
    const mobileRoot = document.querySelector('[data-mobile-overview]');
    const desktopRoot = document.querySelector('[data-desktop-overview]');
    const mobile = Boolean(mobileRoot);
    const root = mobileRoot || desktopRoot;
    const tasks = [...document.querySelectorAll(mobile
      ? '[data-mobile-secondary-risk]'
      : '[data-desktop-object-list] .legacy-object-row button')];
    const queue = mobile
      ? document.querySelector('[data-mobile-secondary-risks]')
      : document.querySelector('[data-desktop-object-list]');
    const desktopSignalBand = mobile ? null : document.querySelector('[data-desktop-incident-verdict]');
    const desktopWorkspace = mobile ? null : document.querySelector('[data-desktop-object-list]');
    const desktopActions = mobile ? null : document.querySelector('.legacy-focus-link');
    const resource = document.querySelector(mobile ? '[data-mobile-resource-signal]' : '[data-desktop-resource-evidence]');
    const signal = mobile
      ? document.querySelector('[data-mobile-resource-signal], [data-mobile-traffic-signal]')
      : document.querySelector('[data-desktop-incident-verdict], [data-desktop-resource-evidence]');
    const resourceHistory = mobile ? document.querySelector('[data-mobile-resource-history]') : null;
    const trafficChart = mobile ? document.querySelector('[data-mobile-traffic-signal] .mp-chart svg') : null;
    const proof = mobile ? document.querySelector('[data-mobile-core-facts]') : null;
    const primaryRisk = mobile ? document.querySelector('[data-mobile-incident-task-role="primary-risk"]') : null;
    const primaryRiskContract = mobile ? primaryRisk : document.querySelector('[data-desktop-overview]:not([data-desktop-overview-risk="none"]) [data-desktop-incident-verdict]');
    const secondaryRisk = mobile ? document.querySelector('[data-mobile-incident-task-role="secondary-risk"]') : null;
    const investigation = mobile ? document.querySelector('[data-mobile-incident-task-role="follow-up"]') : null;
    const primaryObject = mobile ? document.querySelector('[data-mobile-incident-center]') : null;
    const selectedInspector = mobile ? document.querySelector('[data-mobile-incident-inspector]') : null;
    const phonePrimaryAction = mobile && innerWidth < 600
      ? document.querySelector('.mp-primary-task-proximity .mp-actions button[data-mobile-action-priority="primary"]')
      : null;
    const rhythmPrimaryAction = mobile
      ? document.querySelector('.mp-actions button[data-mobile-action-priority="primary"]')
      : null;
    const rhythmSecondaryActions = mobile
      ? [...document.querySelectorAll('.mp-actions button[data-mobile-action-priority="secondary"], [data-mobile-incident-follow-up-context] button[data-mobile-action-priority="secondary"]')]
        .filter((node) => {
          const bounds = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return style.display !== 'none' && style.visibility !== 'hidden' && bounds.width > 0 && bounds.height > 0;
        })
      : [];
    const rhythmSecondaryDisclosure = mobile
      ? document.querySelector('[data-mobile-secondary-action-disclosure]')
      : null;
    const rhythmSecondaryDisclosureSummary = rhythmSecondaryDisclosure?.querySelector(':scope > summary') || null;
    const mobileNavigation = mobile ? document.querySelector('.panel-task-navigation') : null;
    const primaryAction = mobile
      ? selectedInspector?.querySelector('button[data-mobile-destination]') || primaryObject
      : null;
    const primary = document.querySelector(mobile
      ? (innerWidth >= 600 ? '.mp-tablet-master-detail' : '[data-mobile-incident-center]')
      : '[data-desktop-incident-verdict]');
    const lower = document.querySelector(mobile
      ? '[data-mobile-resource-signal], [data-mobile-traffic-signal], [data-mobile-evidence-ledger]'
      : '[data-overview-task-landmark="risk-objects"]');
    const body = document.querySelector('.mp-workspace-body.is-tablet-incident');
    const rect = (node) => {
      const bounds = node?.getBoundingClientRect();
      return bounds ? {
        left: Math.round(bounds.left),
        right: Math.round(bounds.right),
        top: Math.round(bounds.top),
        bottom: Math.round(bounds.bottom),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
      } : null;
    };
    const visibleTextNodes = [...(queue?.querySelectorAll('small, b, em, h2') || [])]
      .filter((node) => {
        const style = getComputedStyle(node);
        const bounds = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && bounds.width > 0 && bounds.height > 0;
      });
    const clippedText = visibleTextNodes
      .filter((node) => {
        const style = getComputedStyle(node);
        const clippedX = node.scrollWidth > node.clientWidth + 1 && style.overflowX !== 'visible';
        const clippedY = node.scrollHeight > node.clientHeight + 1 && style.overflowY !== 'visible';
        return clippedX || clippedY;
      })
      .map((node) => (node.textContent || '').trim());
    const compactActionLabels = [...(investigation?.querySelectorAll('button[data-mobile-action-priority="secondary"]') || [])]
      .filter((node) => {
        const bounds = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden' && bounds.width > 0 && bounds.height > 0;
      })
      .map((button) => {
        const measure = (node) => {
          const style = getComputedStyle(node);
          return {
            text: (node.textContent || '').replace(/\s+/g, ' ').trim(),
            labelClientWidth: node.clientWidth,
            labelScrollWidth: node.scrollWidth,
            labelTextOverflow: style.textOverflow,
          };
        };
        const label = button.querySelector('b');
        const note = button.querySelector('small');
        const labelMeasure = label ? measure(label) : { text: '', labelClientWidth: 0, labelScrollWidth: 0, labelTextOverflow: '' };
        const noteMeasure = note ? measure(note) : { text: '', labelClientWidth: 0, labelScrollWidth: 0, labelTextOverflow: '' };
        return {
          labelText: labelMeasure.text,
          noteText: noteMeasure.text,
          labelClientWidth: labelMeasure.labelClientWidth,
          labelScrollWidth: labelMeasure.labelScrollWidth,
          labelTextOverflow: labelMeasure.labelTextOverflow,
          noteClientWidth: noteMeasure.labelClientWidth,
          noteScrollWidth: noteMeasure.labelScrollWidth,
          noteTextOverflow: noteMeasure.labelTextOverflow,
        };
      });
    const queueRect = rect(queue);
    const primaryRect = rect(primary);
    const lowerRect = rect(lower);
    const desktopSignalBandRect = rect(desktopSignalBand);
    const bodyRect = rect(body);
    const proofRect = rect(proof);
    const signalRect = rect(signal);
    const objectRect = rect(primaryObject);
    const inspectorRect = rect(selectedInspector);
    const historyRect = rect(resourceHistory);
    const trafficChartRect = rect(trafficChart);
    const actionRect = rect(primaryAction);
    const phonePrimaryActionRect = rect(phonePrimaryAction);
    const navigationRect = rect(mobileNavigation);
    const phoneUsableBottom = navigationRect?.top ?? innerHeight;
    const phoneVisibleActionHeight = phonePrimaryActionRect
      ? Math.max(0, Math.min(phonePrimaryActionRect.bottom, phoneUsableBottom) - Math.max(phonePrimaryActionRect.top, 0))
      : 0;
    const phoneActionVisibleRatio = phonePrimaryActionRect?.height
      ? Math.round((phoneVisibleActionHeight / phonePrimaryActionRect.height) * 1000) / 1000
      : 0;
    const primaryRiskRect = rect(primaryRisk);
    const secondaryRiskRect = rect(secondaryRisk);
    const investigationRect = rect(investigation);
    const desktopWorkspaceRect = rect(desktopWorkspace);
    const desktopActionsRect = rect(desktopActions);
    const taskRects = tasks.map(rect).filter(Boolean);
    const documentHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body?.scrollHeight || 0,
      innerHeight
    );
    const queueDocumentTop = queueRect ? queueRect.top + scrollY : null;
    const queueDocumentBottom = queueRect ? queueRect.bottom + scrollY : null;
    const compactText = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim();
    const isVisible = (node) => {
      if (!node) return false;
      const style = getComputedStyle(node);
      const bounds = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && bounds.width > 0 && bounds.height > 0;
    };
    const currentEvidenceTimeOwnerCount = mobile
      ? [...(root?.querySelectorAll('[data-mobile-current-evidence-time-owner]') || [])].filter(isVisible).length
      : null;
    const mobileFocusEvidenceTimeCount = mobile
      ? [...(root?.querySelectorAll('[data-mobile-focus-evidence-time]') || [])].filter(isVisible).length
      : null;
    return {
      surface: mobile ? 'mobile' : 'desktop',
      viewport: { width: innerWidth, height: innerHeight },
      risk: root?.getAttribute(mobile ? 'data-mobile-overview-risk' : 'data-desktop-overview-risk') || '',
      verdictTitle: document.querySelector(mobile ? '.mp-command h1' : '.do-verdict h1')?.textContent?.replace(/\s+/g, ' ').trim() || '',
      riskPriority: root?.getAttribute('data-mobile-risk-priority') || primaryRiskContract?.getAttribute('data-desktop-risk-priority') || '',
      riskPriorityReason: root?.getAttribute('data-mobile-risk-priority-reason') || primaryRiskContract?.getAttribute('data-desktop-risk-priority-reason') || '',
      primaryRiskContract: primaryRiskContract?.getAttribute(mobile ? 'data-mobile-incident-task-role' : 'data-desktop-primary-risk') || '',
      primaryRiskPriority: primaryRiskContract?.getAttribute(mobile ? 'data-mobile-risk-priority' : 'data-desktop-risk-priority') || '',
      actionRisk: investigation?.getAttribute('data-mobile-action-risk') ||
        selectedInspector?.querySelector('[data-mobile-action-risk]')?.getAttribute('data-mobile-action-risk') ||
        primaryRiskContract?.getAttribute('data-desktop-primary-risk') || '',
      count: mobile ? queue?.getAttribute('data-mobile-secondary-risks') || '' : String(tasks.length),
      taskRisks: mobile ? tasks.map((node) => node.getAttribute('data-mobile-secondary-risk') || '') : [],
      taskPriorities: tasks.map((node) => node.getAttribute(mobile ? 'data-mobile-risk-priority' : 'data-desktop-risk-priority') || ''),
      destinations: mobile ? tasks.map((node) => node.getAttribute('data-mobile-destination') || '') : [],
      secondaryText: tasks.map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim()).join(' | '),
      resourceText: (resource?.textContent || '').replace(/\s+/g, ' ').trim(),
      queueRect,
      primaryRect,
      lowerRect,
      desktopSignalBandRect,
      bodyRect,
      proofRect,
      signalRect,
      objectRect,
      inspectorRect,
      historyRect,
      trafficChartRect,
      actionRect,
      phonePrimaryActionRect,
      rootRhythm: mobileRoot?.getAttribute('data-mobile-visual-rhythm') || '',
      actionRhythm: investigation?.getAttribute('data-mobile-action-rhythm') || '',
      primaryActionVisual: rhythmPrimaryAction?.getAttribute('data-mobile-primary-action-visual') || '',
      primaryActionColor: rhythmPrimaryAction ? getComputedStyle(rhythmPrimaryAction.querySelector('.mp-action-icon') || rhythmPrimaryAction).color : '',
      secondaryActionMinHeights: rhythmSecondaryActions.map((node) => Math.round(node.getBoundingClientRect().height)),
      secondaryDisclosureRect: rect(rhythmSecondaryDisclosure),
      secondaryDisclosureSummaryRect: rect(rhythmSecondaryDisclosureSummary),
      secondaryDisclosureOpen: rhythmSecondaryDisclosure instanceof HTMLDetailsElement
        ? rhythmSecondaryDisclosure.open
        : null,
      navigationRect,
      actionVisibleRatio: phoneActionVisibleRatio,
      actionAboveNavigation: Boolean(
        phonePrimaryActionRect && navigationRect && phonePrimaryActionRect.top >= 0 &&
          phonePrimaryActionRect.bottom <= navigationRect.top + 1
      ),
      secondaryRiskAboveNavigation: Boolean(
        secondaryRiskRect && navigationRect && secondaryRiskRect.top >= 0 &&
          secondaryRiskRect.bottom <= navigationRect.top + 1
      ),
      primaryRiskRect,
      secondaryRiskRect,
      investigationRect,
      desktopWorkspaceRect,
      desktopActionsRect,
      proofText: compactText(proof),
      signalText: compactText(signal),
      objectText: compactText(primaryObject),
      inspectorText: compactText(selectedInspector),
      currentEvidenceTimeOwnerCount,
      mobileFocusEvidenceTimeCount,
      historyText: compactText(resourceHistory),
      resourceSignalTitle: compactText(resource?.querySelector('h2')),
      resourceHistoryOpen: resourceHistory?.matches('details') ? resourceHistory.hasAttribute('open') : Boolean(resourceHistory),
      visibleTrafficChart: Boolean(trafficChartRect && trafficChartRect.width > 0 && trafficChartRect.height > 0),
      actionText: compactText(primaryAction),
      compactActionLabels,
      proofBeforeSignal: Boolean(proofRect && signalRect && proofRect.bottom <= signalRect.top + 1),
      signalBeforeObject: Boolean(signalRect && objectRect && signalRect.bottom <= objectRect.top + 1),
      objectBeforeSignal: Boolean(objectRect && signalRect && objectRect.bottom <= signalRect.top + 1),
      proofBeforeObject: Boolean(proofRect && objectRect && proofRect.bottom <= objectRect.top + 1),
      objectBeforeProof: Boolean(objectRect && proofRect && objectRect.bottom <= proofRect.top + 1),
      objectBeforeQueue: Boolean(objectRect && queueRect && objectRect.bottom <= queueRect.top + 1),
      queueBeforeSignal: Boolean(queueRect && signalRect && queueRect.bottom <= signalRect.top + 1),
      objectBeforeHistory: Boolean(objectRect && historyRect && objectRect.bottom <= historyRect.top + 1),
      inspectorBeforeHistory: Boolean(!inspectorRect || (historyRect && inspectorRect.bottom <= historyRect.top + 1)),
      objectInFirstViewport: Boolean(objectRect && objectRect.top >= 0 && objectRect.top < innerHeight),
      actionInFirstViewport: Boolean(actionRect && actionRect.top >= 0 && actionRect.bottom <= innerHeight),
      afterPrimary: Boolean(queueRect && primaryRect && queueRect.top >= primaryRect.bottom - 1),
      primaryActionBetweenRiskPlanes: Boolean(
        mobile && primaryRiskRect && investigationRect && secondaryRiskRect &&
        primaryRiskRect.bottom <= investigationRect.top + 1 &&
        investigationRect.bottom <= secondaryRiskRect.top + 1
      ),
      beforeLowerEvidence: Boolean(queueRect && lowerRect && queueRect.bottom <= lowerRect.top + 1),
      desktopFactsBeforeWorkspace: Boolean(!mobile && primaryRect && lowerRect && primaryRect.bottom <= lowerRect.top + 1),
      desktopWorkspaceBeforeQueue: Boolean(!mobile && lowerRect && queueRect && lowerRect.bottom <= queueRect.top + 1),
      desktopQueueBeforeActions: Boolean(!mobile && queueRect && desktopActionsRect && queueRect.bottom <= desktopActionsRect.top + 1),
      desktopFactsAndQueueShareBand: Boolean(
        !mobile && desktopSignalBand && primary?.parentElement === desktopSignalBand && queue?.parentElement === desktopSignalBand
      ),
      desktopFactsQueueCenterDelta: !mobile && queueRect && primaryRect
        ? Math.abs((queueRect.top + queueRect.bottom) / 2 - (primaryRect.top + primaryRect.bottom) / 2)
        : null,
      desktopFactsQueueSideBySide: Boolean(
        !mobile && queueRect && primaryRect && primaryRect.right <= queueRect.left + 1
      ),
      desktopWorkspaceTop: !mobile && lowerRect ? lowerRect.top : null,
      withinFirstViewport: Boolean(queueRect && queueRect.top >= 0 && queueRect.bottom <= innerHeight),
      secondaryRiskReachable: Boolean(
        queueRect && queueRect.height > 0 && queueDocumentTop !== null && queueDocumentBottom !== null &&
          queueDocumentTop >= 0 && queueDocumentBottom <= documentHeight + 1
      ),
      documentHeight,
      queueDocumentTop,
      queueDocumentBottom,
      tabletFullWidth: innerWidth !== 768 || Boolean(
        queueRect && bodyRect && Math.abs(queueRect.left - bodyRect.left) <= 1 && Math.abs(queueRect.width - bodyRect.width) <= 2
      ),
      minimumTarget: taskRects.length ? Math.min(...taskRects.map((item) => item.height)) : 0,
      clippedText,
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
}

async function inspectResourceHistorySurface(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-mobile-resource-history]');
    const svg = root?.querySelector('[data-section-time-series] svg');
    const chartRect = svg?.getBoundingClientRect();
    const toolbarRect = document.querySelector('[data-panel-runtime-toolbar="mobile"]')?.getBoundingClientRect();
    const navigationRect = document.querySelector('.panel-task-navigation')?.getBoundingClientRect();
    const usableTop = Math.max(0, toolbarRect?.bottom || 0);
    const usableBottom = navigationRect?.top || innerHeight;
    const withinUsableViewport = (rect) => Boolean(
      rect && rect.top >= usableTop - 1 && rect.bottom <= usableBottom + 1
    );
    const keys = ['cpu', 'memory', 'disk'];
    const line = (key) => root?.querySelector(`[data-section-series="${key}"]`);
    const points = (key) => String(line(key)?.getAttribute('points') || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((pair) => pair.split(',').map(Number));
    const patterns = Object.fromEntries(keys.map((key) => {
      const node = line(key);
      return [key, node ? getComputedStyle(node).strokeDasharray : ''];
    }));
    const cpuPoints = points('cpu');
    const thresholdLines = [...(root?.querySelectorAll('[data-section-threshold]') || [])];
    const latest = root?.querySelector('[data-resource-latest-sample]');
    const latestRect = latest?.getBoundingClientRect();
    const summary = root?.matches('details') ? root.querySelector('summary') : null;
    const visible = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const clippedText = [...(root?.querySelectorAll('h2, b, small, span, time, dt, dd, th, td') || [])]
      .filter((node) => visible(node) && !node.closest('[aria-hidden="true"]') && (node.textContent || '').trim())
      .filter((node) => {
        const style = getComputedStyle(node);
        return (
          (node.scrollWidth > node.clientWidth + 1 && style.overflowX !== 'visible') ||
          (node.scrollHeight > node.clientHeight + 1 && style.overflowY !== 'visible')
        );
      })
      .map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80));
    return {
      text: (root?.textContent || '').replace(/\s+/g, ' ').trim(),
      chartHeight: Math.round(chartRect?.height || 0),
      chartInsideViewport: Boolean(chartRect && chartRect.left >= -1 && chartRect.right <= innerWidth + 1),
      chartWithinUsableViewport: withinUsableViewport(chartRect),
      latestWithinUsableViewport: withinUsableViewport(latestRect),
      summaryFocused: Boolean(summary && document.activeElement === summary),
      usableTop: Math.round(usableTop),
      usableBottom: Math.round(usableBottom),
      chartBounds: chartRect ? { top: Math.round(chartRect.top), bottom: Math.round(chartRect.bottom) } : null,
      latestBounds: latestRect ? { top: Math.round(latestRect.top), bottom: Math.round(latestRect.bottom) } : null,
      seriesCount: keys.filter((key) => Boolean(line(key))).length,
      patterns,
      distinctPatterns: new Set(Object.values(patterns)).size,
      cpuPoints,
      timeRatio: cpuPoints.length >= 3 && cpuPoints[cpuPoints.length - 1][0] !== cpuPoints[0][0]
        ? (cpuPoints[1][0] - cpuPoints[0][0]) / (cpuPoints[cpuPoints.length - 1][0] - cpuPoints[0][0])
        : null,
      thresholdCount: thresholdLines.length,
      thresholdLabels: thresholdLines.map((node) => node.getAttribute('data-threshold-label') || ''),
      thresholdValues: thresholdLines.map((node) => Number(node.getAttribute('data-section-threshold'))),
      thresholdYs: thresholdLines.map((node) => Number(node.getAttribute('y1'))),
      latestPointCount: latest ? 1 : 0,
      latestText: (latest?.textContent || '').replace(/\s+/g, ' ').trim(),
      scaleText: (root?.querySelector('.section-timeseries-scale')?.textContent || '').replace(/\s+/g, ' ').trim(),
      scaleLabels: [...(root?.querySelectorAll('.section-timeseries-scale b') || [])].map((node) => (node.textContent || '').trim()),
      timeText: (root?.querySelector('.section-timeseries-axis')?.textContent || '').replace(/\s+/g, ' ').trim(),
      sampleReplayCount: root?.querySelectorAll('.mp-resource-samples').length || 0,
      clippedText,
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
}

function check(results, name, pass, detail) {
  const item = { name, pass: Boolean(pass), detail: detail == null ? null : detail };
  results.push(item);
  if (!item.pass) throw new Error(name + ': ' + JSON.stringify(detail));
}

function contractCheck(results, failures, name, pass, detail) {
  const item = { name, pass: Boolean(pass), detail: detail == null ? null : detail };
  results.push(item);
  if (!item.pass) failures.push({ name, detail: item.detail });
}

function cleanupErrorDetail(error) {
  return {
    name: error?.name || 'Error',
    code: error?.code || null,
    message: String(error?.message || error),
  };
}

async function main() {
  const frameworkAssetIdentity = assertFrameworkAssetIdentity(root);
  await fsp.rm(outDir, { recursive: true, force: true });
  await fsp.mkdir(outDir, { recursive: true });

  const runtimeIdentity = gitWorktreeIdentity(root);
  if (runtimeIdentity.identityError) throw new Error(runtimeIdentity.identityError);
  const commit = runtimeIdentity.commit;
  const mock = await startMock();
  const executablePath = browserExecutable();
  let browser;
  let isolatedBrowser = null;
  let browserRuntime = null;
  let isolatedBrowserRuntime = null;
  const contexts = new Set();
  const checks = [];
  const step196ContractFailures = [];
  const step197ContractFailures = [];
  const screenshots = [];
  const pageErrors = diagnosticPageErrors;
  let cleanupPromise = null;
  const cleanup = () => {
    if (!cleanupPromise) {
      cleanupPromise = (async () => {
        setRuntimePhase('cleanup');
        const cleanupFailures = [];
        const contextResults = await Promise.allSettled([...contexts].map((context, index) => (
          boundedCleanup(`context.close:${index}`, () => context.close())
        )));
        contextResults.forEach((result) => {
          if (result.status === 'rejected') cleanupFailures.push(result.reason);
        });
        const browserResults = await Promise.allSettled([
          browserRuntime && boundedCleanup('browser.lifecycle.close', async () => {
            try {
              await browserRuntime.close();
            } finally {
              runtimeProgress.browserLifecycle.push(browserRuntime.diagnostics);
            }
          }, 20000),
          isolatedBrowserRuntime && boundedCleanup('isolated-browser.lifecycle.close', async () => {
            try {
              await isolatedBrowserRuntime.close();
            } finally {
              runtimeProgress.browserLifecycle.push(isolatedBrowserRuntime.diagnostics);
            }
          }, 20000),
        ].filter(Boolean));
        browserResults.forEach((result) => {
          if (result.status === 'rejected') cleanupFailures.push(result.reason);
        });
        try {
          await boundedCleanup('mock.stop', () => mock.stop());
        } catch (error) {
          cleanupFailures.push(error);
        }
        try {
          await boundedCleanup('lifecycle-diagnostic.write', () => fsp.writeFile(
            path.join(outDir, 'lifecycle.json'),
            JSON.stringify({
              contract: 'panel-runtime-browser-lifecycle-v2',
              generatedAt: utc(),
              progress: runtimeProgress,
              cleanupFailures: cleanupFailures.map(cleanupErrorDetail),
              mock: {
                snapshotCalls: mock.state.snapshotCalls,
                logoutCalls: mock.state.logoutCalls,
              },
            }, null, 2) + '\n',
            'utf8'
          ));
        } catch (error) {
          cleanupFailures.push(error);
        }
        if (cleanupFailures.length) {
          throw new AggregateError(cleanupFailures, 'panel runtime cleanup failed');
        }
      })();
    }
    return cleanupPromise;
  };
  cleanupRuntime = cleanup;

  try {
    if (!executablePath) throw new Error('Edge/Chrome executable not found');
    runtimeProgress.browser = path.basename(executablePath);
    const launchBrowser = () => launchManagedBrowser({
      executablePath,
      args: process.platform === 'linux' ? ['--no-sandbox'] : [],
      launchTimeoutMs: 15000,
      cleanupTimeoutMs: 6000,
    });
    browserRuntime = await launchBrowser();
    browser = browserRuntime.browser;

    const openContext = async (options) => {
      const context = await browserRuntime.openContext(options);
      contexts.add(context);
      context.on('close', () => contexts.delete(context));
      return context;
    };
    const openIsolatedContext = async (options) => {
      if (!isolatedBrowserRuntime) {
        isolatedBrowserRuntime = await launchBrowser();
        isolatedBrowser = isolatedBrowserRuntime.browser;
      }
      const context = await isolatedBrowserRuntime.openContext(options);
      contexts.add(context);
      context.on('close', () => contexts.delete(context));
      return context;
    };

    const restOnlyContext = await openContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const restOnlyPage = await restOnlyContext.newPage();
    restOnlyPage.setDefaultTimeout(actionTimeout);
    restOnlyPage.setDefaultNavigationTimeout(15000);
    await restOnlyPage.goto(mock.url, { waitUntil: 'domcontentloaded' });
    const restOnlyForm = restOnlyPage.locator('[data-router-login-form]');
    await restOnlyForm.waitFor();
    await restOnlyPage.locator('input[name="host"]').fill('192.0.2.1');
    await restOnlyPage.locator('input[name="user"]').fill('observer');
    await restOnlyPage.locator('input[name="password"]').fill('correct-horse');
    await restOnlyForm.locator('button[type="submit"]').click();
    const verifiedRestOnly = restOnlyPage.locator('[data-verified-rest-only]');
    await verifiedRestOnly.waitFor();
    const restOnlyControl = {
      count: await verifiedRestOnly.count(),
      label: await verifiedRestOnly.allTextContents(),
    };
    check(
      checks,
      'verified HTTPS exposes an explicit request-local REST-only continuation',
      restOnlyControl.count === 1 && restOnlyControl.label.join(' ').includes('HTTPS'),
      restOnlyControl
    );
    await verifiedRestOnly.click();
    await restOnlyPage.locator('[data-panel-runtime-phase]').waitFor();
    await waitForPhase(restOnlyPage, 'current', 12000);
    check(
      checks,
      'REST-only continuation enters without pinning or silently confirming SSH',
      mock.state.lastLoginBody?.continueWithVerifiedRestOnly === true &&
        !mock.state.lastLoginBody?.sshHostKeyFingerprint &&
        !mock.state.lastLoginBody?.sshHostKeyTrustToken,
      mock.state.lastLoginBody
    );
    await restOnlyContext.close();
    mock.state.configured = false;
    mock.state.loginAttempts = 0;
    mock.state.snapshotCalls = 0;
    mock.state.lastLoginBody = null;

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
    const mobileConnectionLandmark = await inspectMainLandmarkOwnership(page);
    check(
      checks,
      'mobile connection owns exactly one non-nested main landmark',
      ownsExactlyOneMain(mobileConnectionLandmark),
      mobileConnectionLandmark
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
    const protocolButtons = advancedSettings.locator('.router-segmented-control button');
    const restPortControl = advancedSettings.locator('input[name="restPort"]');
    const restRiskConfirmation = form.locator('input[name="insecureRestConfirmed"]');
    await protocolButtons.nth(1).click();
    await restRiskConfirmation.check();
    await restPortControl.fill('8080');
    const resetAfterRestPort = !(await restRiskConfirmation.isChecked());
    await restRiskConfirmation.check();
    await page.locator('input[name="host"]').fill('198.51.100.20');
    const resetAfterHost = !(await restRiskConfirmation.isChecked());
    await protocolButtons.nth(0).click();
    await restPortControl.fill('443');
    await page.locator('input[name="host"]').fill('');
    check(
      checks,
      'REST risk acknowledgement is request-local and resets when its endpoint binding changes',
      resetAfterRestPort && resetAfterHost && !(await restRiskConfirmation.count()),
      { resetAfterRestPort, resetAfterHost }
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
      expiresAt: node.getAttribute('data-trust-expires-at') || '',
    }));
    check(
      checks,
      'first SSH contact requires explicit host-key confirmation',
      hostKeyFacts.text.includes('ssh-ed25519') &&
        hostKeyFacts.text.includes('SHA256:') &&
        hostKeyFacts.text.includes('有效至') &&
        hostKeyFacts.expiresAt.endsWith('Z') &&
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
    await advancedSettings.locator('summary').click();
    const sshPortControl = advancedSettings.locator('input[name="sshPort"]');
    await sshPortControl.fill('2222');
    await hostKey.waitFor({ state: 'hidden' });
    await sshPortControl.fill('22');
    await advancedSettings.locator('summary').click();
    await hostKey.waitFor();
    const sshConfirmationReset = !(await hostKey.locator('input[type="checkbox"]').isChecked());
    check(
      checks,
      'SSH confirmation is bound to the challenged host and port',
      sshConfirmationReset,
      { sshConfirmationReset }
    );
    await hostKey.locator('input[type="checkbox"]').check();
    await form.locator('button[type="submit"]').click();
    await page.locator('[data-panel-runtime-phase]').waitFor();
    await waitForPhase(page, 'current', 12000);
    check(
      checks,
      'confirmed SSH fingerprint is pinned in the second request',
      mock.state.lastLoginBody?.sshHostKeyFingerprint === fingerprint &&
        mock.state.lastLoginBody?.sshHostKeyTrustToken === sshTrustToken,
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
    const overviewLandmarkOwnership = await page.evaluate(() => ({
      appMountTag: document.getElementById('app')?.tagName || '',
      mainLandmarkCount: document.querySelectorAll('main').length,
      visibleMainLandmarkCount: [...document.querySelectorAll('main')].filter((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      }).length,
      nestedMainLandmarkCount: document.querySelectorAll('main main').length,
    }));
    check(
      checks,
      'active Overview owns exactly one non-nested main landmark beneath a neutral app mount',
      overviewLandmarkOwnership.appMountTag === 'DIV' &&
        overviewLandmarkOwnership.mainLandmarkCount === 1 &&
        overviewLandmarkOwnership.visibleMainLandmarkCount === 1 &&
        overviewLandmarkOwnership.nestedMainLandmarkCount === 0,
      overviewLandmarkOwnership
    );
    screenshots.push(await screenshot(page, 'mobile-runtime-current.png', 'mobile-runtime-current'));

    const runtimeMore = page.locator('[data-panel-runtime-more]');
    const moreJourney = {
      control: false,
      target: 0,
      label: '',
      opened: false,
      openFocused: false,
      back: false,
      backFocused: false,
      forward: false,
    };
    if (await runtimeMore.count()) {
      const control = await runtimeMore.evaluate((node) => {
        const box = node.getBoundingClientRect();
        return { height: box.height, label: node.getAttribute('aria-label') || '' };
      });
      moreJourney.control = true;
      moreJourney.target = control.height;
      moreJourney.label = control.label;
      await runtimeMore.click();
      await page.locator('[data-mobile-domain-workspace="more"]').waitFor();
      moreJourney.opened = await page.locator('[data-panel-app][data-active-section="more"]').count() === 1;
      moreJourney.openFocused = await page.evaluate(() => document.activeElement?.matches('[data-panel-route-title]') || false);
      await page.evaluate(() => window.history.back());
      await page.waitForFunction(() => document.querySelector('[data-panel-app]')?.getAttribute('data-active-section') === 'overview');
      moreJourney.back = await runtimeMore.count() === 1;
      moreJourney.backFocused = await page.evaluate(() => document.activeElement?.matches('[data-panel-route-title]') || false);
      await page.evaluate(() => window.history.forward());
      await page.waitForFunction(() => document.querySelector('[data-panel-app]')?.getAttribute('data-active-section') === 'more');
      moreJourney.forward = await page.locator('[data-mobile-domain-workspace="more"]').count() === 1;
      await page.evaluate(() => window.history.back());
      await page.waitForFunction(() => document.querySelector('[data-panel-app]')?.getAttribute('data-active-section') === 'overview');
    }
    check(
      checks,
      'Overview More opens the real directory and survives Back and Forward',
      moreJourney.control && moreJourney.target >= 44 && moreJourney.label === '更多只读工具' &&
        moreJourney.opened && moreJourney.openFocused && moreJourney.back && moreJourney.backFocused && moreJourney.forward,
      moreJourney
    );

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
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const phoneNetworkList = await page.evaluate(() => {
      const workspace = document.querySelector('[data-mobile-domain-workspace="interfaces"]');
      const preview = workspace?.querySelector('[data-mobile-object-preview]');
      const defaultInterfaceRow = [...(workspace?.querySelectorAll('[data-mobile-row-id]') || [])]
        .find((row) => row.querySelector('.mdw-row-copy b')?.textContent?.trim() === 'pppoe-wan1');
      return {
        layout: workspace?.getAttribute('data-mobile-domain-layout') || '',
        preview: Boolean(preview),
        defaultInterfaceId: defaultInterfaceRow?.getAttribute('data-mobile-row-id') || '',
        objectQuery: new URLSearchParams(location.search).get('object'),
        selectedRows: workspace?.querySelectorAll('[data-mobile-row-id][aria-current="true"]').length || 0,
         metricStrip: Boolean(workspace?.querySelector('.mdw-metrics')),
         collectionSummary: Boolean(workspace?.querySelector('[data-tablet-collection-summary="true"]')),
        rows: workspace?.querySelectorAll('[data-mobile-row-id]').length || 0,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    check(
      checks,
      'short phone interface list compares objects without automatically selecting the default outlet',
      phoneNetworkList.layout === 'phone-list' && !phoneNetworkList.preview &&
        Boolean(phoneNetworkList.defaultInterfaceId) && phoneNetworkList.rows >= 1 &&
        phoneNetworkList.objectQuery === null && phoneNetworkList.selectedRows === 0 &&
        phoneNetworkList.metricStrip && phoneNetworkList.overflow <= 1,
      phoneNetworkList
    );
    screenshots.push(await screenshot(page, 'mobile-network-phone-list.png', 'mobile-network-phone-list'));
    const compactNetworkList = await page.evaluate(() => {
      const firstRow = document.querySelector('[data-mobile-row-id]')?.getBoundingClientRect();
      return {
        toolsExpanded: document.querySelector('.mdw-tools-toggle')?.getAttribute('aria-expanded'),
        controls: Boolean(document.querySelector('[data-domain-controls]')),
        focusContext: Boolean(document.querySelector('[data-mobile-interface-focus-context="true"]')),
        focusObject: document.querySelector('[data-mobile-interface-focus-object-id]')?.getAttribute('data-mobile-interface-focus-object-id') || '',
        firstRowTop: firstRow?.top || 0,
        rows: document.querySelectorAll('[data-mobile-row-id]').length,
      };
    });
    check(
      checks,
      'network list keeps controls on demand while preserving current object context',
       compactNetworkList.toolsExpanded === 'false' && !compactNetworkList.controls &&
         compactNetworkList.focusContext && Boolean(compactNetworkList.focusObject) &&
         compactNetworkList.rows >= 2 && compactNetworkList.firstRowTop > 0,
      compactNetworkList
    );
    await page.locator('.mdw-tools-toggle').click();
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
      const backgrounds = ['--mdw-surface', '--mdw-surface-tonal'].map((name) => styles.getPropertyValue(name));
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
    const interfaceSort = page.locator('.mdw-filter-row select');
    const visibleInterfaceNames = () => page.locator('[data-mobile-row-id] .mdw-row-copy b').allTextContents();
    await interfaceSort.selectOption('name-asc');
    const nameOrder = await visibleInterfaceNames();
    await interfaceSort.selectOption('traffic-desc');
    const trafficOrder = await visibleInterfaceNames();
    check(
      checks,
      'visible sort changes the actual object row order',
      nameOrder[0] === 'bridge-lan' &&
        nameOrder[1] === 'pppoe-wan1' &&
        trafficOrder[0] === 'pppoe-wan1' &&
        trafficOrder[1] === 'bridge-lan',
      { nameOrder, trafficOrder }
    );
    await interfaceSort.selectOption('name-asc');

    const objectTrigger = page.locator('[data-mobile-row-id]').filter({ hasText: 'pppoe-wan1' }).first();
    const objectId = await objectTrigger.getAttribute('data-mobile-row-id');
    await objectTrigger.click();
    await page.locator('[data-mobile-object-detail]').waitFor();
    const objectDetail = await page.evaluate(() => {
      const detail = document.querySelector('[data-mobile-object-detail]');
      const detailText = detail?.textContent || '';
      const headingSubtitle = detail?.querySelector('.mdi-object-heading p')?.textContent?.trim() || '';
      const carriedTokens = headingSubtitle.split(/\s*(?:\/|·)\s*/).filter((token) => token.length >= 2);
      return {
        object: detail?.getAttribute('data-mobile-object-detail'),
        kind: detail?.getAttribute('data-domain-inspector-kind'),
        sections: detail?.querySelectorAll('.mdi-section').length || 0,
        evidenceBoundary: Boolean(detail?.querySelector('.mdi-evidence')),
        relationship: detailText.includes('依赖与路由'),
        headingSubtitle,
        carriedTokenOccurrences: carriedTokens.map((token) => ({
          token,
          count: detailText.split(token).length - 1,
        })),
        query: new URLSearchParams(location.search).get('object'),
      };
    });
    check(
      checks,
      'object destination adds field-level evidence instead of replaying the summary',
      objectDetail.object === objectId && objectDetail.query === objectId && objectDetail.kind === 'interface' &&
        objectDetail.sections >= 4 && objectDetail.evidenceBoundary && objectDetail.relationship,
      objectDetail
    );
    check(
      checks,
      'interface detail carries role and type in one visible owner instead of replaying the heading subtitle',
      objectDetail.headingSubtitle === '' || (
        objectDetail.carriedTokenOccurrences.length >= 2 &&
        objectDetail.carriedTokenOccurrences.every((item) => item.count === 1)
      ),
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
      reorderedObject.detail === objectId && reorderedObject.query === objectId && reorderedObject.title === 'pppoe-wan1',
      { objectId, reorderedObject }
    );
    mock.state.reverseInterfaces = false;

    await page.getByRole('button', { name: '返回接口' }).click();
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

    await page.setViewportSize({ width: 844, height: 1024 });
    await page.waitForFunction(() => innerWidth === 844 && innerHeight === 1024);
    await page.locator('[data-section="interfaces"]').click();
    await page.locator('[data-mobile-domain-workspace="interfaces"]').waitFor();
    const tabletObject = page.locator('[data-mobile-row-id]').first();
    await tabletObject.click();
    await page.locator('[data-mobile-object-detail]').waitFor();
    await page.locator('.mdw-tools-toggle').click();
    await page.locator('[data-domain-controls="interfaces"]').getByRole('button', { name: '异常', exact: true }).click();
    await page.waitForFunction(() => (
      !document.querySelector('[data-mobile-object-detail]') &&
      !new URLSearchParams(location.search).has('object')
    ));
    const filteredSelection = await page.evaluate(() => ({
      detail: Boolean(document.querySelector('[data-mobile-object-detail]')),
      preview: Boolean(document.querySelector('[data-mobile-object-preview]')),
      inspector: Boolean(document.querySelector('.mdw-inspector')),
      layout: document.querySelector('[data-mobile-domain-workspace="interfaces"]')
        ?.getAttribute('data-mobile-domain-layout') || '',
      query: new URLSearchParams(location.search).get('object'),
      visibleRows: document.querySelectorAll('[data-mobile-row-id]').length,
    }));
    check(
      checks,
      'filtering out a selected object clears detail, preview and URL atomically',
      !filteredSelection.detail && !filteredSelection.preview && !filteredSelection.inspector &&
        filteredSelection.layout === 'tablet-list' &&
        filteredSelection.query === null && filteredSelection.visibleRows === 0,
      filteredSelection
    );
    await page.locator('[data-domain-controls="interfaces"]').getByRole('button', { name: '全部', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => innerWidth === 390 && innerHeight === 844);

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
    await page.locator('.mdw-tools-toggle').click();
    await page.locator('.mdw-search input[type="search"]').fill('workstation-special');
    await page.waitForFunction(() => document.querySelectorAll('[data-mobile-row-id]').length === 1);
    check(
      checks,
      'terminal search reaches an object outside the first page',
      (await page.locator('[data-mobile-row-id]').first().innerText()).includes('workstation-special')
    );

    await page.locator('[data-section="logs"]').click();
    await page.locator('[data-mobile-domain-workspace="logs"]').waitFor();
    await page.locator('.mdw-tools-toggle').click();
    check(
      checks,
      'logs is a stable first-class destination with functional controls',
      await page.locator('.mdw-search input[type="search"]').isVisible() &&
        await page.locator('.mdw-filter-row').isVisible()
    );

    const domainRouteContracts = [
      { route: 'routes', primary: 'interfaces', workspace: '网络工作区', placeholder: '目的、网关或路由表', kind: 'route', sections: 4, evidence: ['活动判据', '路径', '关联接口'], autoPreview: true },
      { route: 'balance', primary: 'interfaces', workspace: '网络工作区', placeholder: '网关、路由表或策略标记', kind: 'balance-rule', desktopKind: 'route', sections: 2, evidence: ['匹配与动作', '路由标记', '对象 ID'], rowText: 'mark-routing', autoPreview: true },
      { route: 'connections', primary: 'interfaces', workspace: '网络工作区', placeholder: '源、目标、端口或协议', kind: 'connection', sections: 2, evidence: ['连接端点', '当前记录'] },
      { route: 'trafficAudit', primary: 'interfaces', workspace: '流量审计', placeholder: '地址、协议或流量对象', kind: 'connection', sections: 3, evidence: ['流量对象', '审计读数', '审计范围'], rowText: '198.51.100.44' },
      { route: 'dns4', primary: 'interfaces', workspace: 'DNS 工作区', placeholder: '名称、类型或目标', kind: 'dns', sections: 2, evidence: ['静态规则', 'DNS 配置边界'] },
      { route: 'dns6', primary: 'interfaces', workspace: 'DNS 工作区', placeholder: '接口、前缀或 DNS', kind: 'dns', sections: 3, evidence: ['IPv6 ND', 'IPv6 发布与路由'], rowText: 'bridge-lan' },
      { route: 'security', primary: 'interfaces', workspace: '安全工作区', placeholder: '告警、链、动作或说明', kind: 'security', sections: 3, evidence: ['规则判据', '匹配条件', '计数器'] },
      { route: 'terminals', primary: 'terminals', workspace: '终端工作区', placeholder: '终端名、IP 或 MAC', kind: 'terminal', sections: 4, evidence: ['身份依据', 'DHCP / ARP 证据'] },
      { route: 'logs', primary: 'logs', workspace: '事件时间线', placeholder: '内容、主题或时间', kind: 'log', sections: 2, evidence: ['事件证据', '相邻事件'], autoPreview: true },
      { route: 'trafficLoad', primary: 'overview', workspace: '资源工作区', placeholder: '', searchable: false, kind: 'resource', sections: 3, evidence: ['样本判断', '当前样本', '策略阈值', '变化范围', '连续性', '相关资源比较', '较当前对象', '依赖与来源', '采样来源', '对象序列', '只描述资源压力，不推断网络中断'] },
    ];
    for (const contract of domainRouteContracts) {
      const target = new URL(mock.url);
      target.searchParams.set('section', contract.route);
      target.hash = contract.route;
      await page.goto(target.toString(), { waitUntil: 'domcontentloaded' });
      await waitForPhase(page, 'current');
      await page.locator(`[data-mobile-domain-workspace="${contract.route}"]`).waitFor();
      const routeTools = page.locator('.mdw-tools-toggle');
      if (await routeTools.count()) await routeTools.click();
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

      const inspectorRows = page.locator('[data-mobile-row-id]');
      const inspectorTrigger = contract.rowText
        ? inspectorRows.filter({ hasText: contract.rowText }).first()
        : inspectorRows.first();
      const inspectorObjectId = await inspectorTrigger.getAttribute('data-mobile-row-id');
      await inspectorTrigger.click();
      await page.locator('[data-mobile-object-detail]').waitFor();
      if (contract.route === 'logs') {
        await page.waitForFunction(() => {
          const disclosure = document.querySelector('details.mdi-disclosure[data-auto-expanded="true"]');
          return disclosure instanceof HTMLDetailsElement && disclosure.open;
        }, null, { timeout: 3000 });
      }
      const inspectorState = await page.evaluate(() => {
        const detail = document.querySelector('[data-mobile-object-detail]');
        const message = 'pppoe-wan1 link renegotiated';
        const detailText = detail?.textContent || '';
        const heading = detail?.querySelector('#mdw-detail-title');
        const sections = [...(detail?.querySelectorAll('.mdi-section') || [])];
        const sectionByTitle = (title) => sections.find((section) => (
          section.querySelector(':scope > header h3')?.textContent?.trim() === title
        )) || null;
        const factByLabel = (section, label) => (
          [...(section?.querySelectorAll('.mdi-facts > div') || [])].find((fact) => (
            fact.querySelector(':scope > small')?.textContent?.trim() === label
          )) || null
        );
        const factValue = (fact) => fact?.querySelector(':scope > b')?.textContent?.trim() || '';
        const eventRecordSection = sectionByTitle('事件记录');
        const eventEvidenceSection = sectionByTitle('事件证据');
        const neighborSection = sectionByTitle('相邻事件');
        const absoluteTimeFact = factByLabel(eventEvidenceSection, '绝对时间');
        const eventBodyFact = factByLabel(eventEvidenceSection, '事件正文');
        const topicFact = factByLabel(eventEvidenceSection, '主题');
        const sourceFact = factByLabel(eventEvidenceSection, '来源组');
        const neighborRows = [...(neighborSection?.querySelectorAll('.mdi-relations > div') || [])];
        const firstNeighbor = neighborRows[0] || null;
        const neighborIdentities = neighborRows.map((node) => node.querySelector('b')?.textContent?.trim() || '');
        const neighborTemporalLabels = neighborRows.map((node) => node.querySelector('small')?.textContent?.trim() || '');
        const neighborStatusCount = neighborRows.filter((node) => Boolean(node.querySelector('em'))).length;
        const neighborClassificationToneCount = neighborRows.filter((node) => (
          node.classList.contains('is-warn') || node.classList.contains('is-danger')
        )).length;
        const body = detail?.querySelector('.mdi-domain-body');
        const severityBadge = detail?.querySelector('.mdi-object-heading > b');
        const headingText = heading?.textContent?.trim() || '';
        const headingSubtitle = detail?.querySelector('.mdi-object-heading p')?.textContent?.trim() || '';
        const carriedTokens = headingSubtitle.split(/\s*(?:\/|·)\s*/).filter((token) => token.length >= 2);
        const stateLabelText = severityBadge?.textContent?.trim() || '';
        const firstSection = sections[0] || null;
        const navigationRect = document.querySelector('.panel-task-navigation')?.getBoundingClientRect();
        const viewportBottom = navigationRect && navigationRect.top > 0 && navigationRect.top < innerHeight
          ? navigationRect.top
          : innerHeight;
        const rectOf = (element) => {
          if (!(element instanceof Element)) return null;
          const rect = element.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
        };
        const fullyInsideFirstViewport = (element) => {
          if (!(element instanceof HTMLElement)) return false;
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return style.display !== 'none' && style.visibility !== 'hidden' &&
            rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.bottom <= viewportBottom;
        };
        return {
          object: detail?.getAttribute('data-mobile-object-detail') || '',
          query: new URLSearchParams(location.search).get('object') || '',
          kind: detail?.getAttribute('data-domain-inspector-kind') || '',
          sections: sections.length,
          evidenceBoundary: Boolean(detail?.querySelector('.mdi-evidence')),
          text: detailText,
          genericFallback: Boolean(detailText.includes('低频对象尚未建立专用关系模型')),
          autoExpanded: Boolean(detail?.querySelector('details.mdi-disclosure[data-auto-expanded="true"][open]')),
          bodyMessageOccurrences: (body?.textContent || '').split(message).length - 1,
          eventBodyText: factValue(eventBodyFact),
          headingText,
          headingSubtitle,
          carriedTokenOccurrences: carriedTokens.map((token) => ({
            token,
            count: detailText.split(token).length - 1,
          })),
          headingIdentityOccurrences: headingText ? detailText.split(headingText).length - 1 : 0,
          headingMessageOccurrences: (heading?.textContent || '').split(message).length - 1,
          headingFontSize: heading ? Number.parseFloat(getComputedStyle(heading).fontSize) : 0,
          eventRecordSectionPresent: Boolean(eventRecordSection),
          eventEvidenceSectionPresent: Boolean(eventEvidenceSection),
          absoluteTimeText: factValue(absoluteTimeFact),
          severityText: severityBadge?.textContent?.trim() || '',
          stateLabelOccurrences: stateLabelText ? detailText.split(stateLabelText).length - 1 : 0,
          topicText: factValue(topicFact),
          sourceText: factValue(sourceFact),
          sourceBoundaryExplicit: Boolean(sourceFact),
          neighborRows: neighborRows.length,
          neighborIdentities,
          neighborTemporalLabels,
          neighborStatusCount,
          neighborClassificationToneCount,
          viewportBottom,
          headingRect: rectOf(heading),
          eventEvidenceRect: rectOf(eventEvidenceSection),
          timeRect: rectOf(absoluteTimeFact),
          firstNeighborRect: rectOf(firstNeighbor),
          firstSectionRect: rectOf(firstSection),
          headingInFirstViewport: fullyInsideFirstViewport(heading),
          eventEvidenceInFirstViewport: fullyInsideFirstViewport(eventEvidenceSection),
          timeInFirstViewport: fullyInsideFirstViewport(absoluteTimeFact),
          neighborInFirstViewport: fullyInsideFirstViewport(firstNeighbor),
          firstSectionInFirstViewport: fullyInsideFirstViewport(firstSection),
        };
      });
      check(
        checks,
        `${contract.route} opens a domain-specific evidence inspector`,
        Boolean(inspectorObjectId) &&
          inspectorState.object === inspectorObjectId &&
          inspectorState.query === inspectorObjectId &&
          inspectorState.kind === contract.kind &&
          inspectorState.sections >= contract.sections &&
          inspectorState.evidenceBoundary &&
          contract.evidence.every((label) => inspectorState.text.includes(label)) &&
          !inspectorState.genericFallback,
        { contract, inspectorObjectId, inspectorState }
      );
      if (contract.route === 'logs') {
        check(
          checks,
          '390x844 log detail uses a stable title and keeps the event body in one structured fact',
          inspectorState.headingMessageOccurrences === 0 &&
            inspectorState.headingText === '日志事件' &&
            inspectorState.bodyMessageOccurrences === 1 &&
            inspectorState.eventBodyText === 'pppoe-wan1 link renegotiated' &&
            !inspectorState.eventRecordSectionPresent && inspectorState.eventEvidenceSectionPresent &&
            inspectorState.headingFontSize > 0 && inspectorState.headingFontSize <= 24 &&
            /(?:Z|[+-]\d{2}:\d{2})$/.test(inspectorState.absoluteTimeText) &&
            inspectorState.severityText === '警告' &&
            inspectorState.topicText.includes('system') &&
            inspectorState.sourceBoundaryExplicit && Boolean(inspectorState.sourceText) &&
            inspectorState.neighborRows >= 1 &&
            inspectorState.neighborIdentities.every(Boolean) &&
            inspectorState.neighborTemporalLabels.every((label) => /^(?:较新|较旧) · .*(?:Z|[+-]\d{2}:\d{2})$/.test(label)) &&
            inspectorState.neighborStatusCount === 0 && inspectorState.neighborClassificationToneCount === 0 &&
            inspectorState.headingInFirstViewport &&
            inspectorState.eventEvidenceInFirstViewport &&
            inspectorState.timeInFirstViewport &&
            inspectorState.neighborInFirstViewport,
          inspectorState
        );
      }
      if (contract.route === 'terminals') {
        check(
          checks,
          'terminal detail carries IP and MAC in one visible owner before novel evidence',
          inspectorState.headingIdentityOccurrences === 1 &&
            (inspectorState.headingSubtitle === '' || (
              inspectorState.carriedTokenOccurrences.length >= 2 &&
              inspectorState.carriedTokenOccurrences.every((item) => item.count === 1)
            )) &&
            inspectorState.firstSectionInFirstViewport,
          inspectorState
        );
        const terminalObjectAction = page.locator('[data-mobile-terminal-object-action="v1"] button');
        const terminalObjectActionPresent = await terminalObjectAction.count() === 1;
        let terminalObjectActionNavigation = null;
        if (terminalObjectActionPresent) {
          const terminalObjectActionSource = await page.evaluate(() => {
            const action = document.querySelector('[data-mobile-terminal-object-action="v1"]');
            const detail = document.querySelector('[data-mobile-object-detail]');
            return {
              sourceEvidenceAt: action?.getAttribute('data-mobile-terminal-evidence-at') || '',
              detailOriginEvidenceAt: detail?.getAttribute('data-mobile-pulse-evidence-at') || '',
            };
          });
          await terminalObjectAction.click();
          await page.waitForFunction(() => new URLSearchParams(location.search).get('section') === 'connections', null, { timeout: 3000 });
          terminalObjectActionNavigation = {
            ...terminalObjectActionSource,
            ...(await page.evaluate(() => {
            const query = new URLSearchParams(location.search);
            return {
              section: query.get('section'),
              returnRoute: query.get('from'),
              evidenceAt: query.get('evidenceAt'),
              hasConnectionWorkspace: Boolean(document.querySelector('[data-mobile-domain-workspace="connections"]')),
            };
            })),
          };
          check(
            checks,
            'terminal detail action opens the related connection workspace with return and evidence context',
            terminalObjectActionNavigation.section === 'connections' &&
              terminalObjectActionNavigation.returnRoute === 'terminals' &&
              Boolean(terminalObjectActionNavigation.evidenceAt) &&
              terminalObjectActionNavigation.hasConnectionWorkspace,
            { terminalObjectActionPresent, terminalObjectActionNavigation }
          );
        } else {
          check(
            checks,
            'terminal detail action opens the related connection workspace with return and evidence context',
            false,
            { terminalObjectActionPresent, terminalObjectActionNavigation }
          );
        }
      }
      if (contract.route === 'connections') {
        const connectionObjectAction = page.locator('[data-mobile-connection-object-action="v1"] button');
        const connectionObjectActionPresent = await connectionObjectAction.count() === 1;
        let connectionObjectActionNavigation = null;
        if (connectionObjectActionPresent) {
          const connectionObjectActionSource = await page.evaluate(() => ({
            sourceEvidenceAt: document.querySelector('[data-mobile-connection-object-action="v1"]')?.getAttribute('data-mobile-connection-evidence-at') || '',
          }));
          await connectionObjectAction.click();
          await page.waitForFunction(() => new URLSearchParams(location.search).get('section') === 'terminals', null, { timeout: 3000 });
          connectionObjectActionNavigation = {
            ...connectionObjectActionSource,
            ...(await page.evaluate(() => {
              const query = new URLSearchParams(location.search);
              return {
                section: query.get('section'),
                returnRoute: query.get('from'),
                query: query.get('q'),
                evidenceAt: query.get('evidenceAt'),
                hasTerminalWorkspace: Boolean(document.querySelector('[data-mobile-domain-workspace="terminals"]')),
              };
            })),
          };
        }
        check(
          checks,
          'connection detail action opens the terminal collection with query, return and evidence context',
          connectionObjectActionNavigation?.section === 'terminals' &&
            connectionObjectActionNavigation.returnRoute === 'connections' &&
            Boolean(connectionObjectActionNavigation.query) &&
            Boolean(connectionObjectActionNavigation.evidenceAt) &&
            connectionObjectActionNavigation.hasTerminalWorkspace,
          { connectionObjectActionPresent, connectionObjectActionNavigation }
        );
      }
      if (contract.route === 'trafficLoad') {
        check(
          checks,
          'resource detail keeps the current sample in one visible owner and adds its sample context',
          inspectorState.headingSubtitle === '' &&
            inspectorState.stateLabelOccurrences === 1 && inspectorState.firstSectionInFirstViewport,
          inspectorState
        );
      }
      if (['routes', 'balance', 'trafficAudit', 'dns6', 'security', 'terminals', 'logs'].includes(contract.route)) {
        screenshots.push(await screenshot(
          page,
          `mobile-inspector-${contract.route}.png`,
          `mobile-inspector-${contract.route}`
        ));
      }
    }

    async function inspectLogDetailViewport(width, height, file, state, exerciseReturn = false) {
      await page.setViewportSize({ width, height });
      const target = new URL(mock.url);
      target.searchParams.set('section', 'logs');
      await page.goto(target.toString(), { waitUntil: 'domcontentloaded' });
      await waitForPhase(page, 'current');
      const beforeDetail = await page.evaluate(() => ({
        layout: document.querySelector('[data-mobile-domain-workspace="logs"]')
          ?.getAttribute('data-mobile-domain-layout') || '',
        preview: Boolean(document.querySelector('[data-mobile-object-preview]')),
      }));
      const trigger = page.locator('[data-mobile-row-id]').first();
      const triggerId = await trigger.getAttribute('data-mobile-row-id');
      await trigger.click();
      await page.locator('[data-mobile-object-detail]').waitFor();
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const result = await page.evaluate((beforeDetailState) => {
        const workspace = document.querySelector('[data-mobile-domain-workspace="logs"]');
        const detail = document.querySelector('[data-mobile-object-detail]');
        const disclosure = detail?.querySelector('details.mdi-disclosure');
        const navigation = document.querySelector('.panel-task-navigation');
        const navigationRect = navigation?.getBoundingClientRect();
        const toolbarRect = document.querySelector('.panel-runtime-bar-mobile')?.getBoundingClientRect();
        const header = workspace?.querySelector('.mdw-header');
        const listPane = workspace?.querySelector('.mdw-list-pane');
        const back = detail?.querySelector(':scope > header button');
        const detailRect = detail?.getBoundingClientRect();
        const backRect = back?.getBoundingClientRect();
        const message = 'pppoe-wan1 link renegotiated';
        const detailText = detail?.textContent || '';
        const heading = detail?.querySelector('#mdw-detail-title');
        const sections = [...(detail?.querySelectorAll('.mdi-section') || [])];
        const sectionByTitle = (title) => sections.find((section) => (
          section.querySelector(':scope > header h3')?.textContent?.trim() === title
        )) || null;
        const factByLabel = (section, label) => (
          [...(section?.querySelectorAll('.mdi-facts > div') || [])].find((fact) => (
            fact.querySelector(':scope > small')?.textContent?.trim() === label
          )) || null
        );
        const eventRecordSection = sectionByTitle('事件记录');
        const eventEvidenceSection = sectionByTitle('事件证据');
        const neighborSection = sectionByTitle('相邻事件');
        const absoluteTimeFact = factByLabel(eventEvidenceSection, '绝对时间');
        const eventBodyFact = factByLabel(eventEvidenceSection, '事件正文');
        const topicFact = factByLabel(eventEvidenceSection, '主题');
        const sourceFact = factByLabel(eventEvidenceSection, '来源组');
        const neighborRows = [...(neighborSection?.querySelectorAll('.mdi-relations > div') || [])];
        const firstNeighbor = neighborRows[0] || null;
        const neighborIdentities = neighborRows.map((node) => node.querySelector('b')?.textContent?.trim() || '');
        const neighborTemporalLabels = neighborRows.map((node) => node.querySelector('small')?.textContent?.trim() || '');
        const neighborStatusCount = neighborRows.filter((node) => Boolean(node.querySelector('em'))).length;
        const neighborClassificationToneCount = neighborRows.filter((node) => (
          node.classList.contains('is-warn') || node.classList.contains('is-danger')
        )).length;
        const body = detail?.querySelector('.mdi-domain-body');
        const severityBadge = detail?.querySelector('.mdi-object-heading > b');
        const viewportBottom = navigationRect && navigationRect.top > 0 && navigationRect.top < innerHeight
          ? navigationRect.top
          : innerHeight;
        const isVisible = (element) => {
          if (!(element instanceof HTMLElement)) return false;
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return style.display !== 'none' && style.visibility !== 'hidden' &&
            rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
        };
        const fullyInsideFirstViewport = (element) => {
          if (!(element instanceof HTMLElement)) return false;
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return style.display !== 'none' && style.visibility !== 'hidden' &&
            rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.bottom <= viewportBottom;
        };
        return {
          layout: workspace?.getAttribute('data-mobile-domain-layout') || '',
          beforeDetail: beforeDetailState,
          detail: Boolean(detail),
          autoExpanded: Boolean(disclosure?.hasAttribute('data-auto-expanded') && disclosure.open),
          overflow: document.documentElement.scrollWidth - innerWidth,
          navigationWidth: navigationRect?.width || 0,
          toolbarBottom: toolbarRect?.bottom ?? null,
          headerVisible: isVisible(header),
          listVisible: isVisible(listPane),
          detailVisible: isVisible(detail),
          detailTop: detailRect?.top ?? null,
          backVisible: isVisible(back),
          backHeight: backRect?.height || 0,
          backName: back?.textContent?.trim() || '',
          detailTitleFocused: document.activeElement === heading,
          headingText: heading?.textContent?.trim() || '',
          headingMessageOccurrences: (heading?.textContent || '').split(message).length - 1,
          bodyMessageOccurrences: (body?.textContent || '').split(message).length - 1,
          eventBodyText: eventBodyFact?.querySelector(':scope > b')?.textContent?.trim() || '',
          eventRecordSectionPresent: Boolean(eventRecordSection),
          eventEvidenceSectionPresent: Boolean(eventEvidenceSection),
          absoluteTimeText: absoluteTimeFact?.querySelector(':scope > b')?.textContent?.trim() || '',
          severityText: severityBadge?.textContent?.trim() || '',
          topicText: topicFact?.querySelector(':scope > b')?.textContent?.trim() || '',
          sourceText: sourceFact?.querySelector(':scope > b')?.textContent?.trim() || '',
          sourceBoundaryExplicit: Boolean(sourceFact),
          neighborRows: neighborRows.length,
          neighborIdentities,
          neighborTemporalLabels,
          neighborStatusCount,
          neighborClassificationToneCount,
          viewportBottom,
          headingInFirstViewport: fullyInsideFirstViewport(heading),
          eventEvidenceInFirstViewport: fullyInsideFirstViewport(eventEvidenceSection),
          timeInFirstViewport: fullyInsideFirstViewport(absoluteTimeFact),
          neighborInFirstViewport: fullyInsideFirstViewport(firstNeighbor),
        };
      }, beforeDetail);
      screenshots.push(await screenshot(page, file, state));
      if (exerciseReturn && result.backVisible) {
        await page.locator('[data-mobile-object-detail] > header button').click();
        await page.waitForFunction(() => (
          document.querySelector('[data-mobile-domain-workspace="logs"]')
            ?.getAttribute('data-mobile-domain-layout') === 'phone-list'
        ));
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        result.returned = await page.evaluate((expectedTriggerId) => {
          const workspace = document.querySelector('[data-mobile-domain-workspace="logs"]');
          const listPane = workspace?.querySelector('.mdw-list-pane');
          const activeRow = document.activeElement?.closest?.('[data-mobile-row-id]');
          const listRect = listPane?.getBoundingClientRect();
          const listStyle = listPane ? getComputedStyle(listPane) : null;
          return {
            layout: workspace?.getAttribute('data-mobile-domain-layout') || '',
            objectQuery: new URL(location.href).searchParams.get('object'),
            listVisible: Boolean(
              listRect && listStyle && listStyle.display !== 'none' &&
              listStyle.visibility !== 'hidden' && listRect.width > 0 && listRect.height > 0
            ),
            focusedRow: activeRow?.getAttribute('data-mobile-row-id') || '',
            expectedTriggerId,
          };
        }, triggerId);
      } else {
        result.returned = null;
      }
      return result;
    }

    const shortPhoneLog = await inspectLogDetailViewport(375, 667, 'small-phone-log-detail-375.png', 'small-phone-log-detail-375');
    check(
      checks,
      '375x667 keeps the selected event, qualified evidence and one temporal comparison above navigation',
      shortPhoneLog.beforeDetail.layout === 'phone-list' && !shortPhoneLog.beforeDetail.preview &&
        shortPhoneLog.layout === 'phone-detail' && shortPhoneLog.detail &&
        shortPhoneLog.headingMessageOccurrences === 0 && shortPhoneLog.headingText === '日志事件' &&
        shortPhoneLog.bodyMessageOccurrences === 1 && shortPhoneLog.eventBodyText === 'pppoe-wan1 link renegotiated' &&
        !shortPhoneLog.eventRecordSectionPresent && shortPhoneLog.eventEvidenceSectionPresent &&
        /(?:Z|[+-]\d{2}:\d{2})$/.test(shortPhoneLog.absoluteTimeText) &&
        shortPhoneLog.severityText === '警告' && shortPhoneLog.topicText.includes('system') &&
        shortPhoneLog.sourceBoundaryExplicit && Boolean(shortPhoneLog.sourceText) &&
        shortPhoneLog.neighborRows >= 1 &&
        shortPhoneLog.neighborIdentities.every(Boolean) &&
        shortPhoneLog.neighborTemporalLabels.every((label) => /^(?:较新|较旧) · .*(?:Z|[+-]\d{2}:\d{2})$/.test(label)) &&
        shortPhoneLog.neighborStatusCount === 0 && shortPhoneLog.neighborClassificationToneCount === 0 &&
        shortPhoneLog.headingInFirstViewport && shortPhoneLog.eventEvidenceInFirstViewport &&
        shortPhoneLog.timeInFirstViewport && shortPhoneLog.neighborInFirstViewport &&
        shortPhoneLog.overflow <= 1 && shortPhoneLog.navigationWidth >= 370,
      shortPhoneLog
    );

    const landscapeLog = await inspectLogDetailViewport(844, 390, 'landscape-log-detail-844.png', 'landscape-log-detail-844', true);
    check(
      checks,
      '844x390 keeps one active detail layer and does not force secondary evidence into the short viewport',
      landscapeLog.beforeDetail.layout === 'phone-list' && !landscapeLog.beforeDetail.preview &&
        landscapeLog.layout === 'phone-detail' && landscapeLog.detail && !landscapeLog.autoExpanded &&
        !landscapeLog.headerVisible && !landscapeLog.listVisible && landscapeLog.detailVisible &&
        landscapeLog.detailTop !== null && landscapeLog.toolbarBottom !== null &&
        landscapeLog.detailTop >= landscapeLog.toolbarBottom - 1 &&
        landscapeLog.detailTop <= landscapeLog.toolbarBottom + 2 &&
        landscapeLog.backVisible && landscapeLog.backHeight >= 44 && landscapeLog.backName.includes('返回') &&
        landscapeLog.detailTitleFocused && landscapeLog.overflow <= 1 && landscapeLog.navigationWidth <= 80 &&
        landscapeLog.returned?.layout === 'phone-list' && landscapeLog.returned.objectQuery === null &&
        landscapeLog.returned.listVisible &&
        landscapeLog.returned.focusedRow === landscapeLog.returned.expectedTriggerId,
      landscapeLog
    );

    const accessibilityPage = await mobileContext.newPage();
    diagnosticPage = accessibilityPage;
    accessibilityPage.setDefaultTimeout(actionTimeout);
    accessibilityPage.setDefaultNavigationTimeout(15000);
    accessibilityPage.on('pageerror', (error) => pageErrors.push('accessibility: ' + error.message));
    const accessibilityCdp = await mobileContext.newCDPSession(accessibilityPage);
    await accessibilityCdp.send('Accessibility.enable');
    const accessibilityRoutes = [
      { route: 'overview', selector: '[data-mobile-overview]' },
      { route: 'interfaces', selector: '[data-mobile-domain-workspace="interfaces"]' },
      { route: 'lineStatus', selector: '[data-mobile-domain-workspace="lineStatus"]' },
      { route: 'balance', selector: '[data-mobile-domain-workspace="balance"]' },
      { route: 'routes', selector: '[data-mobile-domain-workspace="routes"]' },
      { route: 'terminals', selector: '[data-mobile-domain-workspace="terminals"]' },
      { route: 'dhcp', selector: '[data-mobile-domain-workspace="dhcp"]' },
      { route: 'arp', selector: '[data-mobile-domain-workspace="arp"]' },
      { route: 'trafficLoad', selector: '[data-mobile-domain-workspace="trafficLoad"]' },
      { route: 'loadAudit', selector: '[data-mobile-domain-workspace="loadAudit"]' },
      { route: 'trafficAudit', selector: '[data-mobile-domain-workspace="trafficAudit"]' },
      { route: 'connections', selector: '[data-mobile-domain-workspace="connections"]' },
      { route: 'dns4', selector: '[data-mobile-domain-workspace="dns4"]' },
      { route: 'dns6', selector: '[data-mobile-domain-workspace="dns6"]' },
      { route: 'security', selector: '[data-mobile-domain-workspace="security"]' },
      { route: 'logs', selector: '[data-mobile-domain-workspace="logs"]' },
      { route: 'serviceLogs', selector: '[data-mobile-domain-workspace="serviceLogs"]' },
      { route: 'readonlyDiagnostics', selector: '[data-mobile-domain-workspace="readonlyDiagnostics"]' },
    ];
    const accessibilityRouteNavigationOwners = {
      overview: 'overview',
      interfaces: 'interfaces',
      lineStatus: 'interfaces',
      balance: 'interfaces',
      routes: 'interfaces',
      terminals: 'terminals',
      dhcp: 'terminals',
      arp: 'terminals',
      trafficLoad: 'overview',
      loadAudit: 'overview',
      trafficAudit: 'interfaces',
      connections: 'interfaces',
      dns4: 'interfaces',
      dns6: 'interfaces',
      security: 'interfaces',
      logs: 'logs',
      serviceLogs: 'logs',
      readonlyDiagnostics: 'overview',
    };

    const applySyntheticTextStress = async (rootSelector, beforeFontSize, percent = 200) => {
      await accessibilityPage.evaluate(({ selector, value }) => {
        const root = document.querySelector(selector);
        if (!(root instanceof HTMLElement)) throw new Error(`synthetic text stress root missing: ${selector}`);
        const factor = value / 100;
        document.documentElement.style.setProperty('-webkit-text-size-adjust', '100%');
        document.documentElement.style.setProperty('text-size-adjust', '100%');
        document.body.style.setProperty('-webkit-text-size-adjust', '100%');
        document.body.style.setProperty('text-size-adjust', '100%');
        const apply = () => {
          const nodes = [...root.querySelectorAll(
            'h1, h2, h3, h4, p, small, b, strong, em, dt, dd, label, button, summary, span, time, a, input, select'
          )].filter((node) => (
            node instanceof HTMLElement && node.dataset.syntheticTextStressScale !== String(value)
          ));
          const measurements = nodes.map((node) => {
            const style = getComputedStyle(node);
            return {
              node,
              fontSize: Number.parseFloat(style.fontSize),
              lineHeight: Number.parseFloat(style.lineHeight),
            };
          });
          for (const { node, fontSize, lineHeight } of measurements) {
            if (!Number.isFinite(fontSize) || fontSize <= 0) continue;
            node.style.setProperty('font-size', `${fontSize * factor}px`, 'important');
            node.style.setProperty(
              'line-height',
              Number.isFinite(lineHeight) && lineHeight > 0 ? `${lineHeight * factor}px` : '1.2',
              'important'
            );
            node.dataset.syntheticTextStressScale = String(value);
          }
          root.setAttribute('data-synthetic-text-stress', String(value));
          window.dispatchEvent(new Event('resize'));
        };
        window.__panelApplySyntheticTextStress = apply;
        apply();
      }, { selector: rootSelector, value: percent });
      await accessibilityPage.waitForFunction(({ selector, before, expectedRatio }) => {
        const root = document.querySelector(selector);
        const title = document.querySelector('[data-panel-route-title]');
        const after = title ? Number.parseFloat(getComputedStyle(title).fontSize) : 0;
        return root?.getAttribute('data-mobile-large-text') === 'true' && after / before >= expectedRatio;
      }, { selector: rootSelector, before: beforeFontSize, expectedRatio: (percent / 100) * 0.9 }, { timeout: 12000 });
    };

    const inspectAccessibilityRoute = async ({ route, selector }, width, height, textPercent) => {
      await accessibilityPage.setViewportSize({ width, height });
      const target = new URL(mock.url);
      target.searchParams.set('section', route);
      await accessibilityPage.goto(target.toString(), { waitUntil: 'domcontentloaded' });
      await waitForPhase(accessibilityPage, 'current', 12000);
      await accessibilityPage.locator(selector).waitFor();
      const beforeFontSize = await accessibilityPage.locator('[data-panel-route-title]').evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
      if (textPercent !== 100) {
        await applySyntheticTextStress(selector, beforeFontSize, textPercent);
      }
      const result = await accessibilityPage.evaluate(async ({ expectedRoute, beforeFontSizeValue }) => {
        const routeTitle = document.querySelector('[data-panel-route-title]');
        const before = beforeFontSizeValue;
        const after = routeTitle ? Number.parseFloat(getComputedStyle(routeTitle).fontSize) : 0;
        const isVisible = (node) => {
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        };
        const controlName = (node) => {
          const labelledBy = (node.getAttribute('aria-labelledby') || '')
            .split(/\s+/)
            .filter(Boolean)
            .map((id) => document.getElementById(id)?.textContent || '')
            .join(' ');
          const labels = 'labels' in node && node.labels
            ? Array.from(node.labels).map((label) => label.textContent || '').join(' ')
            : '';
          return (
            node.getAttribute('aria-label') ||
            labelledBy ||
            labels ||
            node.getAttribute('title') ||
            node.textContent ||
            ''
          ).replace(/\s+/g, ' ').trim();
        };
        const controls = Array.from(document.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
        )).filter(isVisible);
        const unnamedControls = controls.filter((node) => !controlName(node)).map((node) => ({
          tag: node.tagName,
          type: node.getAttribute('type') || '',
          className: typeof node.className === 'string' ? node.className : '',
        }));
        const positiveTabIndexes = controls.filter((node) => Number(node.getAttribute('tabindex') || 0) > 0).map((node) => ({
          name: controlName(node),
          tabIndex: node.getAttribute('tabindex'),
        }));
        const orphanControls = controls.filter((node) => {
          const targetId = node.getAttribute('aria-controls');
          return Boolean(targetId && !document.getElementById(targetId));
        }).map((node) => ({ name: controlName(node), target: node.getAttribute('aria-controls') }));
        const clippedElements = Array.from(document.querySelectorAll('h1, h2, h3, p, small, b, em, dt, dd, label, button, summary, span'))
          .filter((node) => isVisible(node) && !node.closest('[aria-hidden="true"]') && (node.textContent || '').trim())
          .filter((node) => {
            const style = getComputedStyle(node);
            const clippedX = node.scrollWidth > node.clientWidth + 1 && style.overflowX !== 'visible';
            const clippedY = node.scrollHeight > node.clientHeight + 1 && style.overflowY !== 'visible';
            return clippedX || clippedY;
          });
        const clippedRecord = (node) => ({
            text: (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
            className: typeof node.className === 'string' ? node.className : '',
            client: [node.clientWidth, node.clientHeight],
            scroll: [node.scrollWidth, node.scrollHeight],
          });
        const clippedText = clippedElements.map(clippedRecord);
        const clippedControls = clippedElements
          .filter((node) => node.matches('button, a[href], input, select, summary'))
          .map(clippedRecord);
        const navigation = document.querySelector('.panel-task-navigation');
        const navButtons = Array.from(navigation?.querySelectorAll('button') || []);
        const navInsideViewport = navButtons.every((node) => {
          const rect = node.getBoundingClientRect();
          return rect.left >= -1 && rect.right <= innerWidth + 1;
        });
        window.scrollTo(0, document.documentElement.scrollHeight);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const navRect = navigation?.getBoundingClientRect();
        const coveredControls = controls
          .filter((node) => !navigation?.contains(node))
          .filter((node) => {
            const rect = node.getBoundingClientRect();
            return Boolean(navRect && rect.bottom > navRect.top + 1 && rect.top < navRect.bottom - 1);
          })
          .map((node) => ({ name: controlName(node), rect: node.getBoundingClientRect().toJSON() }));
        const activeSection = document.querySelector('[data-panel-app]')?.getAttribute('data-active-section') || '';
        const activeNavigation = navButtons.filter((node) => node.getAttribute('aria-current') === 'page');
        return {
          route: expectedRoute,
          activeSection,
          viewport: [innerWidth, innerHeight],
          before,
          after,
          ratio: before ? after / before : 0,
          overflow: document.documentElement.scrollWidth - innerWidth,
          minimumTarget: Math.min(...controls.map((node) => node.getBoundingClientRect().height)),
          title: (routeTitle?.textContent || '').trim(),
          titleFocused: document.activeElement === routeTitle,
          navInsideViewport,
          navCount: navButtons.length,
          activeNavigation: activeNavigation.map((node) => node.getAttribute('data-section')),
          unnamedControls,
          positiveTabIndexes,
          orphanControls,
          clippedText,
          clippedControls,
          coveredControls,
          mobileLayout: document.querySelector('[data-mobile-domain-workspace]')
            ?.getAttribute('data-mobile-domain-layout') || '',
          mobilePreview: Boolean(document.querySelector('[data-mobile-object-preview]')),
          syntheticTextStress: document.querySelector('[data-synthetic-text-stress]')
            ?.getAttribute('data-synthetic-text-stress') || '',
        };
      }, { expectedRoute: route, beforeFontSizeValue: beforeFontSize });
      await accessibilityPage.evaluate(async () => {
        window.scrollTo(0, 0);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      const mode = textPercent === 200 ? 'synthetic-text-stress200' : 'reflow320';
      screenshots.push(await screenshot(
        accessibilityPage,
        `a11y-${mode}-${route}.png`,
        `a11y-${mode}-${route}`,
        textPercent === 200 ? {
          evidence: {
            class: 'synthetic-text-stress',
            scale: 2,
            accessibilitySignoff: false,
            cssViewport: [width, height],
          },
        } : {}
      ));
      if (route === 'logs') {
        await accessibilityPage.locator('[data-mobile-domain-workspace="logs"] [data-mobile-row-id]').first().click();
        await accessibilityPage.locator('[data-mobile-object-detail]').waitFor();
        if (textPercent === 200) {
          await accessibilityPage.evaluate(() => window.__panelApplySyntheticTextStress?.());
        }
        await accessibilityPage.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        result.logDetail = await accessibilityPage.evaluate(() => {
          const detail = document.querySelector('[data-mobile-object-detail]');
          const message = 'pppoe-wan1 link renegotiated';
          const heading = detail?.querySelector('#mdw-detail-title');
          const body = detail?.querySelector('.mdi-domain-body');
          const sections = [...(detail?.querySelectorAll('.mdi-section') || [])];
          const sectionByTitle = (title) => sections.find((section) => (
            section.querySelector(':scope > header h3')?.textContent?.trim() === title
          )) || null;
          const eventEvidence = sectionByTitle('事件证据');
          const eventRecord = sectionByTitle('事件记录');
          const eventBodyFact = [...(eventEvidence?.querySelectorAll('.mdi-facts > div') || [])]
            .find((fact) => fact.querySelector(':scope > small')?.textContent?.trim() === '事件正文');
          const neighborRows = [...(sectionByTitle('相邻事件')?.querySelectorAll('.mdi-relations > div') || [])];
          const visible = (node) => {
            if (!(node instanceof HTMLElement)) return false;
            const style = getComputedStyle(node);
            const rect = node.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          };
          const clippedText = [...(detail?.querySelectorAll('h2, h3, p, small, b, em, button, summary, span') || [])]
            .filter((node) => visible(node) && (node.textContent || '').trim())
            .filter((node) => {
              const style = getComputedStyle(node);
              return (
                (node.scrollWidth > node.clientWidth + 1 && style.overflowX !== 'visible') ||
                (node.scrollHeight > node.clientHeight + 1 && style.overflowY !== 'visible')
              );
            })
            .map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100));
          const controls = [...(detail?.querySelectorAll('button:not([disabled]), summary') || [])].filter(visible);
          return {
            layout: document.querySelector('[data-mobile-domain-workspace="logs"]')
              ?.getAttribute('data-mobile-domain-layout') || '',
            largeText: document.querySelector('[data-mobile-domain-workspace="logs"]')
              ?.getAttribute('data-mobile-large-text') || '',
            headingText: heading?.textContent?.trim() || '',
            headingMessageOccurrences: (heading?.textContent || '').split(message).length - 1,
            bodyMessageOccurrences: (body?.textContent || '').split(message).length - 1,
            eventBodyText: eventBodyFact?.querySelector(':scope > b')?.textContent?.trim() || '',
            severityText: detail?.querySelector('.mdi-object-heading > b')?.textContent?.trim() || '',
            eventEvidencePresent: Boolean(eventEvidence),
            eventRecordPresent: Boolean(eventRecord),
            neighborRows: neighborRows.length,
            neighborStatusCount: neighborRows.filter((node) => Boolean(node.querySelector('em'))).length,
            overflow: document.documentElement.scrollWidth - innerWidth,
            clippedText,
            minimumTarget: controls.length
              ? Math.min(...controls.map((node) => node.getBoundingClientRect().height))
              : 0,
          };
        });
        screenshots.push(await screenshot(
          accessibilityPage,
          `a11y-${mode}-logs-detail.png`,
          `a11y-${mode}-logs-detail`,
          {
            fullPage: true,
            ...(textPercent === 200 ? {
              evidence: {
                class: 'synthetic-text-stress',
                scale: 2,
                accessibilitySignoff: false,
                cssViewport: [width, height],
              },
            } : {}),
          }
        ));
      }
      return result;
    };

    const syntheticTextStressResults = [];
    for (const route of accessibilityRoutes) {
      syntheticTextStressResults.push(await inspectAccessibilityRoute(route, 390, 844, 200));
    }
    check(
      checks,
      'all covered routes survive measured synthetic 200 percent text stress without claiming OS scaling',
      syntheticTextStressResults.every((result) => (
        result.syntheticTextStress === '200' && result.ratio >= 1.8 &&
        result.overflow <= 1 && result.minimumTarget >= 44 &&
        result.title && result.titleFocused && result.navInsideViewport && result.navCount === 4 &&
        result.activeSection === result.route && result.activeNavigation.length === 1 &&
        result.activeNavigation[0] === accessibilityRouteNavigationOwners[result.route] && result.unnamedControls.length === 0 &&
        result.positiveTabIndexes.length === 0 && result.orphanControls.length === 0 &&
        result.clippedText.length === 0 && result.coveredControls.length === 0
      )),
      syntheticTextStressResults
    );
    const syntheticTextStressLogDetail = syntheticTextStressResults.find((result) => result.route === 'logs')?.logDetail;
    check(
      checks,
      '390x844 log detail survives synthetic text stress with event evidence and temporal context',
      syntheticTextStressLogDetail?.layout === 'phone-detail' && syntheticTextStressLogDetail.largeText === 'true' &&
        syntheticTextStressLogDetail.headingText === '日志事件' &&
        syntheticTextStressLogDetail.headingMessageOccurrences === 0 && syntheticTextStressLogDetail.bodyMessageOccurrences === 1 &&
        syntheticTextStressLogDetail.eventBodyText === 'pppoe-wan1 link renegotiated' &&
        syntheticTextStressLogDetail.severityText === '警告' && syntheticTextStressLogDetail.eventEvidencePresent &&
        !syntheticTextStressLogDetail.eventRecordPresent && syntheticTextStressLogDetail.neighborRows >= 1 &&
        syntheticTextStressLogDetail.neighborStatusCount === 0 && syntheticTextStressLogDetail.overflow <= 1 &&
        syntheticTextStressLogDetail.clippedText.length === 0 && syntheticTextStressLogDetail.minimumTarget >= 44,
      syntheticTextStressLogDetail
    );

    const inspectBrowserZoomOverview = async ({
      physicalWidth,
      physicalHeight = 1024,
      scenario = '',
      risk = 'none',
      openIncident = false,
      expandResource = false,
      fullPage = false,
      stateName,
    }) => {
      const zoomFactor = 2;
      const cssViewport = {
        width: Math.floor(physicalWidth / zoomFactor),
        height: Math.floor(physicalHeight / zoomFactor),
      };
      mock.state.scenario = scenario;
      await accessibilityPage.setViewportSize(cssViewport);
      const target = new URL(mock.url);
      target.searchParams.set('section', 'overview');
      const beforeSnapshot = mock.state.snapshotCalls;
      await accessibilityPage.goto(target.toString(), { waitUntil: 'domcontentloaded' });
      await waitForCalls(mock.state, beforeSnapshot, `${stateName} browser zoom snapshot`, 12000);
      await waitForPhase(accessibilityPage, 'current', 12000);
      await accessibilityPage.locator(`[data-mobile-overview-risk="${risk}"]`).waitFor();
      if (openIncident) {
        await accessibilityPage.locator('[data-mobile-incident-object]').first().click();
        await accessibilityPage.locator(
          '[data-mobile-domain-workspace="interfaces"][data-mobile-domain-layout="phone-detail"] [data-mobile-object-detail]'
        ).waitFor();
      }
      if (expandResource) {
        const resourceHistory = accessibilityPage.locator('[data-mobile-resource-history]');
        const summary = resourceHistory.locator('summary');
        if (await summary.count()) await summary.click();
        await resourceHistory.locator('[data-section-time-series]').waitFor();
      }
      const result = await accessibilityPage.evaluate(async ({ expectedPhysical, expectedCss, expectedRisk, zoom }) => {
        const visible = (node) => {
          if (!(node instanceof HTMLElement)) return false;
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        };
        const controlName = (node) => (
          node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent || ''
        ).replace(/\s+/g, ' ').trim();
        let settleIterations = 0;
        let layoutSettled = false;
        for (let index = 0; index < 8; index += 1) {
          const beforeHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
          window.scrollTo(0, beforeHeight);
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          await new Promise((resolve) => setTimeout(resolve, 20));
          const afterHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
          const afterMaxScroll = Math.max(0, afterHeight - innerHeight);
          settleIterations = index + 1;
          if (afterHeight === beforeHeight && window.scrollY >= afterMaxScroll - 1) {
            layoutSettled = true;
            break;
          }
        }
        const controls = [...document.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
        )].filter(visible);
        const clippedText = [...document.querySelectorAll('h1, h2, h3, p, small, b, em, dt, dd, label, button, summary, span')]
          .filter((node) => visible(node) && !node.closest('[aria-hidden="true"]') && (node.textContent || '').trim())
          .filter((node) => {
            const style = getComputedStyle(node);
            return (
              (node.scrollWidth > node.clientWidth + 1 && style.overflowX !== 'visible') ||
              (node.scrollHeight > node.clientHeight + 1 && style.overflowY !== 'visible')
            );
          })
          .map((node) => ({
            text: (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
            className: typeof node.className === 'string' ? node.className : '',
          }));
        const navigation = document.querySelector('.panel-task-navigation');
        const navigationRect = navigation?.getBoundingClientRect();
        const navigationLabels = [...(navigation?.querySelectorAll('span') || [])]
          .filter(visible)
          .map((node) => {
            const range = document.createRange();
            range.selectNodeContents(node);
            return {
              text: (node.textContent || '').trim(),
              lineCount: [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0).length,
            };
          });
        const coveredControls = controls
          .filter((node) => !navigation?.contains(node))
          .filter((node) => {
            const rect = node.getBoundingClientRect();
            return Boolean(
              navigationRect && rect.bottom > navigationRect.top + 1 &&
              rect.top < navigationRect.bottom - 1
            );
          })
          .map((node) => {
            const rect = node.getBoundingClientRect();
            return {
              name: controlName(node),
              rect: {
                top: Math.round(rect.top),
                bottom: Math.round(rect.bottom),
                height: Math.round(rect.height),
              },
            };
          });
        const documentHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        const scrollYAtBottom = window.scrollY;
        const url = new URL(location.href);
        const overviewRoot = document.querySelector('[data-mobile-overview]');
        const domainRoot = document.querySelector('[data-mobile-domain-workspace]');
        const objectDetail = document.querySelector('[data-mobile-object-detail]');
        const returnButton = objectDetail?.querySelector(':scope > header button');
        const result = {
          evidenceClass: 'browser-zoom-equivalent',
          zoomFactor: zoom,
          expectedPhysical,
          expectedCss,
          cssViewport: [innerWidth, innerHeight],
          physicalViewport: [Math.round(innerWidth * devicePixelRatio), Math.round(innerHeight * devicePixelRatio)],
          devicePixelRatio,
          risk: overviewRoot?.getAttribute('data-mobile-overview-risk') || url.searchParams.get('risk') || '',
          mobileRoot: Boolean(overviewRoot || domainRoot),
          mobileOverviewRoot: Boolean(overviewRoot),
          mobileDomainRoot: Boolean(domainRoot),
          desktopRoot: Boolean(document.querySelector('[data-desktop-overview]')),
          activeSection: document.querySelector('[data-panel-app]')?.getAttribute('data-active-section') || '',
          detailLayout: domainRoot?.getAttribute('data-mobile-domain-layout') || '',
          detailObject: objectDetail?.getAttribute('data-mobile-object-detail') || '',
          detailRisk: objectDetail?.getAttribute('data-investigation-risk') || '',
          detailFrom: objectDetail?.getAttribute('data-mobile-return-route') || '',
          objectQuery: url.searchParams.get('object'),
          riskQuery: url.searchParams.get('risk'),
          fromQuery: url.searchParams.get('from'),
          evidenceAtQuery: url.searchParams.get('evidenceAt'),
          returnText: (returnButton?.textContent || '').replace(/\s+/g, ' ').trim(),
          detailTitleFocused: document.activeElement === objectDetail?.querySelector('#mdw-detail-title'),
          resourceExpanded: Boolean(document.querySelector('[data-mobile-resource-history][open]')),
          overflow: document.documentElement.scrollWidth - innerWidth,
          minimumTarget: controls.length ? Math.min(...controls.map((node) => node.getBoundingClientRect().height)) : 0,
          unnamedControls: controls.filter((node) => !controlName(node)).length,
          navigationInsideViewport: Boolean(
            navigationRect && navigationRect.left >= -1 && navigationRect.right <= innerWidth + 1 &&
            navigationRect.top >= -1 && navigationRect.bottom <= innerHeight + 1
          ),
          navigationLabels,
          clippedText,
          coveredControls,
          bottomGeometry: {
            scrollY: Math.round(scrollYAtBottom),
            maxScroll: Math.round(Math.max(0, documentHeight - innerHeight)),
            documentHeight: Math.round(documentHeight),
            settleIterations,
            settled: layoutSettled,
            navigation: navigationRect ? {
              top: Math.round(navigationRect.top),
              bottom: Math.round(navigationRect.bottom),
              height: Math.round(navigationRect.height),
            } : null,
            overviewBottom: Math.round(overviewRoot?.getBoundingClientRect().bottom || 0),
            domainBottom: Math.round(domainRoot?.getBoundingClientRect().bottom || 0),
          },
          expectedRisk,
        };
        window.scrollTo(0, 0);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return result;
      }, {
        expectedPhysical: [physicalWidth, physicalHeight],
        expectedCss: [cssViewport.width, cssViewport.height],
        expectedRisk: risk,
        zoom: zoomFactor,
      });
      if (expandResource) {
        const chart = accessibilityPage.locator('[data-mobile-resource-history] [data-section-time-series] svg');
        await chart.scrollIntoViewIfNeeded();
        await accessibilityPage.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        result.resourceHistory = await inspectResourceHistorySurface(accessibilityPage);
      }
      screenshots.push(await screenshot(
        accessibilityPage,
        `${stateName}.png`,
        stateName,
        {
          fullPage,
          evidence: {
            class: 'browser-zoom-equivalent',
            zoomFactor,
            physicalViewport: [physicalWidth, physicalHeight],
            cssViewport: [cssViewport.width, cssViewport.height],
          },
        }
      ));
      if (openIncident) {
        const opened = {
          section: result.activeSection,
          object: result.objectQuery,
          risk: result.riskQuery,
          from: result.fromQuery,
          evidenceAt: result.evidenceAtQuery,
        };
        await accessibilityPage.goBack();
        await accessibilityPage.locator(`[data-mobile-overview-risk="${risk}"]`).waitFor();
        const back = await accessibilityPage.evaluate(() => ({
          section: new URL(location.href).searchParams.get('section'),
          object: new URL(location.href).searchParams.get('object'),
          overview: Boolean(document.querySelector('[data-mobile-overview]')),
        }));
        await accessibilityPage.goForward();
        await accessibilityPage.locator(
          '[data-mobile-domain-workspace="interfaces"][data-mobile-domain-layout="phone-detail"] [data-mobile-object-detail]'
        ).waitFor();
        const forwardUrl = new URL(accessibilityPage.url());
        const forward = {
          section: forwardUrl.searchParams.get('section'),
          object: forwardUrl.searchParams.get('object'),
          risk: forwardUrl.searchParams.get('risk'),
          from: forwardUrl.searchParams.get('from'),
          evidenceAt: forwardUrl.searchParams.get('evidenceAt'),
        };
        result.history = { opened, back, forward };
      }
      return result;
    };

    const browserZoomIncident = await inspectBrowserZoomOverview({
      physicalWidth: 768,
      scenario: 'interfaces-down',
      risk: 'interfaces',
      openIncident: true,
      stateName: 'a11y-browser-zoom200-incident-768',
    });
    check(
      checks,
      'physical 768x1024 at browser 200 percent zoom keeps the interface incident operable in a 384x512 CSS viewport',
      browserZoomIncident.evidenceClass === 'browser-zoom-equivalent' &&
        browserZoomIncident.zoomFactor === 2 && browserZoomIncident.devicePixelRatio === 2 &&
        browserZoomIncident.expectedPhysical.join('|') === browserZoomIncident.physicalViewport.join('|') &&
        browserZoomIncident.expectedCss.join('|') === browserZoomIncident.cssViewport.join('|') &&
        browserZoomIncident.mobileRoot && !browserZoomIncident.desktopRoot &&
        !browserZoomIncident.mobileOverviewRoot && browserZoomIncident.mobileDomainRoot &&
        browserZoomIncident.risk === 'interfaces' && browserZoomIncident.activeSection === 'interfaces' &&
        browserZoomIncident.detailLayout === 'phone-detail' && Boolean(browserZoomIncident.detailObject) &&
        browserZoomIncident.detailObject === browserZoomIncident.objectQuery &&
        browserZoomIncident.detailRisk === 'interfaces' && browserZoomIncident.detailFrom === 'overview' &&
        browserZoomIncident.riskQuery === 'interfaces' && browserZoomIncident.fromQuery === 'overview' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(browserZoomIncident.evidenceAtQuery || '') &&
        browserZoomIncident.returnText.includes('返回概览') && browserZoomIncident.detailTitleFocused &&
        browserZoomIncident.overflow <= 1 && browserZoomIncident.minimumTarget >= 44 &&
        browserZoomIncident.unnamedControls === 0 && browserZoomIncident.clippedText.length === 0 &&
        browserZoomIncident.coveredControls.length === 0 && browserZoomIncident.navigationInsideViewport &&
        browserZoomIncident.bottomGeometry.settled === true &&
        browserZoomIncident.bottomGeometry.scrollY >= browserZoomIncident.bottomGeometry.maxScroll - 1 &&
        browserZoomIncident.history?.back.overview && browserZoomIncident.history.back.section === 'overview' &&
        browserZoomIncident.history.back.object === null &&
        JSON.stringify(browserZoomIncident.history.forward) === JSON.stringify(browserZoomIncident.history.opened),
      browserZoomIncident
    );

    const normalBrowserZoom = [
      await inspectBrowserZoomOverview({ physicalWidth: 844, stateName: 'a11y-browser-zoom200-overview-844' }),
      await inspectBrowserZoomOverview({ physicalWidth: 1198, stateName: 'a11y-browser-zoom200-overview-1198' }),
    ];
    check(
      checks,
      'physical 844 and 1198 widths at browser 200 percent zoom use an operable mobile task surface at half CSS geometry',
      normalBrowserZoom.every((item) => (
        item.evidenceClass === 'browser-zoom-equivalent' && item.zoomFactor === 2 && item.devicePixelRatio === 2 &&
        item.expectedPhysical.join('|') === item.physicalViewport.join('|') &&
        item.expectedCss.join('|') === item.cssViewport.join('|') &&
        item.mobileRoot && !item.desktopRoot && item.risk === 'none' &&
        item.overflow <= 1 && item.minimumTarget >= 44 && item.unnamedControls === 0 &&
        item.clippedText.length === 0 && item.coveredControls.length === 0 &&
        item.bottomGeometry.settled === true &&
        item.bottomGeometry.scrollY >= item.bottomGeometry.maxScroll - 1 &&
        item.navigationInsideViewport && item.navigationLabels.length === 4 &&
        item.navigationLabels.every((label) => label.text && label.lineCount === 1)
      )),
      normalBrowserZoom
    );
    mock.state.scenario = '';

    const reflow320Results = [];
    for (const route of accessibilityRoutes) {
      reflow320Results.push(await inspectAccessibilityRoute(route, 320, 568, 100));
    }
    check(
      checks,
      'all covered routes reflow at 320 CSS px without hidden or unnamed commands',
      reflow320Results.every((result) => (
        result.overflow <= 1 && result.minimumTarget >= 44 && result.title && result.titleFocused &&
        result.navInsideViewport && result.navCount === 4 && result.activeSection === result.route &&
        result.activeNavigation.length === 1 && result.activeNavigation[0] === accessibilityRouteNavigationOwners[result.route] &&
        result.unnamedControls.length === 0 && result.positiveTabIndexes.length === 0 &&
        result.orphanControls.length === 0 && result.clippedControls.length === 0 &&
        result.clippedText.length === 0 &&
        result.coveredControls.length === 0
      )),
      reflow320Results
    );
    const reflow320LogDetail = reflow320Results.find((result) => result.route === 'logs')?.logDetail;
    check(
      checks,
      '320x568 log detail keeps event evidence and temporal context without clipped text or controls',
      reflow320LogDetail?.layout === 'phone-detail' &&
        reflow320LogDetail.headingText === '日志事件' &&
        reflow320LogDetail.headingMessageOccurrences === 0 && reflow320LogDetail.bodyMessageOccurrences === 1 &&
        reflow320LogDetail.eventBodyText === 'pppoe-wan1 link renegotiated' &&
        reflow320LogDetail.severityText === '警告' && reflow320LogDetail.eventEvidencePresent &&
        !reflow320LogDetail.eventRecordPresent && reflow320LogDetail.neighborRows >= 1 &&
        reflow320LogDetail.neighborStatusCount === 0 && reflow320LogDetail.overflow <= 1 &&
        reflow320LogDetail.clippedText.length === 0 && reflow320LogDetail.minimumTarget >= 44,
      reflow320LogDetail
    );
    const interfaceReflow320 = reflow320Results.find((result) => result.route === 'interfaces');
    check(
      checks,
      '320x568 keeps the short interface task as a list when there is no room for novel object evidence',
      interfaceReflow320?.mobileLayout === 'phone-list' && !interfaceReflow320.mobilePreview,
      interfaceReflow320
    );

    const summarizeAccessibilityTree = async ({ title, navNames, currentRoute }) => {
      const tree = await accessibilityCdp.send('Accessibility.getFullAXTree');
      const nodes = tree.nodes
        .filter((node) => !node.ignored)
        .map((node) => ({
          role: String(node.role?.value || ''),
          name: String(node.name?.value || '').replace(/\s+/g, ' ').trim(),
          properties: Object.fromEntries((node.properties || []).map((property) => [
            property.name,
            property.value?.value,
          ])),
        }));
      const interactiveRoles = new Set([
        'button', 'link', 'textbox', 'searchbox', 'combobox', 'checkbox', 'radio', 'switch', 'tab',
        'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'slider', 'spinbutton', 'treeitem',
      ]);
      const interactive = nodes.filter((node) => interactiveRoles.has(node.role));
      const normalizedTitle = String(title || '').replace(/\s+/g, ' ').trim();
      return {
        nodeCount: nodes.length,
        headingNames: nodes.filter((node) => node.role === 'heading').map((node) => node.name),
        navigationNames: nodes.filter((node) => node.role === 'navigation').map((node) => node.name),
        unnamedInteractive: interactive.filter((node) => !node.name).map((node) => node.role),
        missingNavigationCommands: navNames.filter((name) => !interactive.some((node) => (
          node.role === 'button' && node.name === name
        ))),
        routeHeadingExposed: nodes.some((node) => node.role === 'heading' && node.name === normalizedTitle),
        primaryNavigationExposed: nodes.some((node) => node.role === 'navigation' && (node.name === '主要任务' || node.name === '手机主要任务')),
        currentRoutePropertyExposed: nodes.some((node) => (
          node.role === 'button' && node.name === navNames.find((name) => name === currentRoute) &&
          (node.properties.current === 'page' || node.properties.selected === true)
        )),
        currentProperties: interactive
          .filter((node) => node.properties.current || node.properties.selected)
          .map((node) => ({ name: node.name, current: node.properties.current, selected: node.properties.selected })),
      };
    };

    mock.state.scenario = 'resource-full';
    await accessibilityPage.setViewportSize({ width: 390, height: 844 });
    const syntheticResourceTarget = new URL(mock.url);
    syntheticResourceTarget.searchParams.set('section', 'overview');
    const beforeSyntheticResourceSnapshot = mock.state.snapshotCalls;
    await accessibilityPage.goto(syntheticResourceTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForCalls(mock.state, beforeSyntheticResourceSnapshot, 'resource synthetic text stress snapshot', 12000);
    await waitForPhase(accessibilityPage, 'current', 12000);
    await accessibilityPage.locator('[data-mobile-overview-risk="resource"]').waitFor();
    const beforeSyntheticResourceFont = await accessibilityPage.locator('[data-panel-route-title]')
      .evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
    await applySyntheticTextStress('[data-mobile-overview]', beforeSyntheticResourceFont, 200);
    const syntheticResourceHistory = accessibilityPage.locator('[data-mobile-resource-history]');
    const syntheticResourceSummary = syntheticResourceHistory.locator('summary');
    if (await syntheticResourceSummary.count()) await syntheticResourceSummary.click();
    await syntheticResourceHistory.locator('[data-section-time-series]').waitFor();
    const syntheticResourceState = await inspectResourceHistorySurface(accessibilityPage);
    syntheticResourceState.evidenceClass = 'synthetic-text-stress';
    syntheticResourceState.largeText = await accessibilityPage.locator('[data-mobile-overview]')
      .getAttribute('data-mobile-large-text');
    syntheticResourceState.beforeFont = beforeSyntheticResourceFont;
    syntheticResourceState.afterFont = await accessibilityPage.locator('[data-panel-route-title]')
      .evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
    screenshots.push(await screenshot(
      accessibilityPage,
      'a11y-synthetic-text-stress200-resource-full-390.png',
      'a11y-synthetic-text-stress200-resource-full-390',
      {
        fullPage: true,
        evidence: {
          class: 'synthetic-text-stress',
          scale: 2,
          accessibilitySignoff: false,
          cssViewport: [390, 844],
        },
      }
    ));
    check(
      checks,
      '390px expanded resource evidence survives measured synthetic text stress without being reported as OS scaling',
      syntheticResourceState.evidenceClass === 'synthetic-text-stress' &&
        syntheticResourceState.largeText === 'true' &&
        syntheticResourceState.afterFont / syntheticResourceState.beforeFont >= 1.8 &&
        syntheticResourceState.chartHeight >= 96 && syntheticResourceState.chartInsideViewport &&
        syntheticResourceState.seriesCount === 3 && syntheticResourceState.distinctPatterns === 3 &&
        syntheticResourceState.thresholdLabels.join('|') === '85% · CPU/内存|90% · 磁盘' &&
        syntheticResourceState.latestPointCount === 0 &&
        syntheticResourceState.clippedText.length === 0 && syntheticResourceState.overflow <= 1,
      syntheticResourceState
    );

    const browserZoomResource = await inspectBrowserZoomOverview({
      physicalWidth: 768,
      scenario: 'resource-full',
      risk: 'resource',
      expandResource: true,
      fullPage: true,
      stateName: 'a11y-browser-zoom200-resource-full-768',
    });
    const browserZoomResourceHistory = browserZoomResource.resourceHistory || {};
    check(
      checks,
      'physical 768x1024 resource evidence at browser 200 percent zoom keeps chart truth in a 384x512 CSS viewport',
      browserZoomResource.evidenceClass === 'browser-zoom-equivalent' &&
        browserZoomResource.expectedPhysical.join('|') === browserZoomResource.physicalViewport.join('|') &&
        browserZoomResource.expectedCss.join('|') === browserZoomResource.cssViewport.join('|') &&
        browserZoomResource.mobileRoot && !browserZoomResource.desktopRoot &&
        browserZoomResource.risk === 'resource' && browserZoomResource.resourceExpanded &&
        browserZoomResource.overflow <= 1 && browserZoomResource.minimumTarget >= 44 &&
        browserZoomResource.unnamedControls === 0 && browserZoomResource.coveredControls.length === 0 &&
        browserZoomResource.bottomGeometry.settled === true &&
        browserZoomResource.bottomGeometry.scrollY >= browserZoomResource.bottomGeometry.maxScroll - 1 &&
        browserZoomResourceHistory.chartHeight >= 96 && browserZoomResourceHistory.chartInsideViewport &&
        browserZoomResourceHistory.chartWithinUsableViewport &&
        (browserZoomResourceHistory.latestPointCount === 0 || browserZoomResourceHistory.latestWithinUsableViewport) &&
        browserZoomResourceHistory.seriesCount === 3 && browserZoomResourceHistory.distinctPatterns === 3 &&
        browserZoomResourceHistory.thresholdLabels?.join('|') === '85% · CPU/内存|90% · 磁盘' &&
        browserZoomResourceHistory.latestPointCount === 0 &&
        browserZoomResource.clippedText.length === 0 &&
        browserZoomResourceHistory.clippedText?.length === 0 && browserZoomResourceHistory.overflow <= 1,
      browserZoomResource
    );
    mock.state.scenario = '';

    const inspectForcedColorsRoute = async ({ route, selector }) => {
      await accessibilityPage.emulateMedia({ forcedColors: 'active' });
      await accessibilityPage.setViewportSize({ width: 390, height: 844 });
      const target = new URL(mock.url);
      target.searchParams.set('section', route);
      await accessibilityPage.goto(target.toString(), { waitUntil: 'domcontentloaded' });
      await waitForPhase(accessibilityPage, 'current', 12000);
      await accessibilityPage.locator(selector).waitFor();
      await accessibilityPage.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        document.body.tabIndex = -1;
        document.body.focus({ preventScroll: true });
      });
      let focusedRoute = false;
      for (let index = 0; index < 100; index += 1) {
        await accessibilityPage.keyboard.press('Tab');
        focusedRoute = await accessibilityPage.evaluate((expectedNavigationOwner) => (
          document.activeElement?.getAttribute('data-section') === expectedNavigationOwner
        ), accessibilityRouteNavigationOwners[route] || route);
        if (focusedRoute) break;
      }
      const result = await accessibilityPage.evaluate((expectedRoute) => {
        const isVisible = (node) => {
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        };
        const controlName = (node) => {
          const labelledBy = (node.getAttribute('aria-labelledby') || '')
            .split(/\s+/)
            .filter(Boolean)
            .map((id) => document.getElementById(id)?.textContent || '')
            .join(' ');
          const labels = 'labels' in node && node.labels
            ? Array.from(node.labels).map((label) => label.textContent || '').join(' ')
            : '';
          return (
            node.getAttribute('aria-label') || labelledBy || labels || node.getAttribute('title') ||
            node.textContent || ''
          ).replace(/\s+/g, ' ').trim();
        };
        const controls = Array.from(document.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
        )).filter(isVisible);
        const navigation = document.querySelector('.panel-task-navigation');
        const navButtons = Array.from(navigation?.querySelectorAll('button') || []);
        const currentButtons = navButtons.filter((node) => node.getAttribute('aria-current') === 'page');
        const activeButton = currentButtons[0];
        const activeStyle = activeButton ? getComputedStyle(activeButton) : null;
        const activeLabel = activeButton?.querySelector('span');
        const activeLabelStyle = activeLabel ? getComputedStyle(activeLabel) : null;
        const activeLabelRect = activeLabel?.getBoundingClientRect();
        const activeIcon = activeButton?.querySelector('svg');
        const activeIconRect = activeIcon?.getBoundingClientRect();
        const activeIndicator = activeButton ? getComputedStyle(activeButton, '::before') : null;
        const navigationStyle = navigation ? getComputedStyle(navigation) : null;
        const targetStyle = document.activeElement instanceof HTMLElement
          ? getComputedStyle(document.activeElement)
          : null;
        const chartDown = document.querySelector('.mp-chart-down');
        const chartUp = document.querySelector('.mp-chart-up');
        const chartDownStyle = chartDown ? getComputedStyle(chartDown) : null;
        const chartUpStyle = chartUp ? getComputedStyle(chartUp) : null;
        const chart = document.querySelector('.mp-chart');
        const chartRect = chart?.getBoundingClientRect();
        const orphanControls = controls.filter((node) => {
          const targetId = node.getAttribute('aria-controls');
          return Boolean(targetId && !document.getElementById(targetId));
        }).map((node) => ({ name: controlName(node), target: node.getAttribute('aria-controls') }));
        const navRect = navigation?.getBoundingClientRect();
        return {
          route: expectedRoute,
          title: (document.querySelector('[data-panel-route-title]')?.textContent || '').trim(),
          forcedColorsActive: matchMedia('(forced-colors: active)').matches,
          overflow: document.documentElement.scrollWidth - innerWidth,
          minimumTarget: Math.min(...controls.map((node) => node.getBoundingClientRect().height)),
          navCount: navButtons.length,
          navNames: navButtons.map(controlName),
          currentRoutes: currentButtons.map((node) => node.getAttribute('data-section')),
          currentRouteNamed: activeButton ? controlName(activeButton) : '',
          focusedRoute: document.activeElement?.getAttribute('data-section') || '',
          focusRing: {
            style: targetStyle?.outlineStyle || '',
            width: Number.parseFloat(targetStyle?.outlineWidth || '0'),
            color: targetStyle?.outlineColor || '',
          },
          activeIndicator: {
            content: activeIndicator?.content || '',
            width: Number.parseFloat(activeIndicator?.width || '0'),
            height: Number.parseFloat(activeIndicator?.height || '0'),
            background: activeIndicator?.backgroundColor || '',
            color: activeStyle?.color || '',
          },
          activeContent: {
            labelColor: activeLabelStyle?.color || '',
            labelOpacity: Number.parseFloat(activeLabelStyle?.opacity || '0'),
            labelVisibility: activeLabelStyle?.visibility || '',
            labelWidth: activeLabelRect?.width || 0,
            labelHeight: activeLabelRect?.height || 0,
            iconWidth: activeIconRect?.width || 0,
            iconHeight: activeIconRect?.height || 0,
            insideViewport: Boolean(
              activeLabelRect && activeIconRect &&
              activeLabelRect.top >= -1 && activeLabelRect.bottom <= innerHeight + 1 &&
              activeIconRect.top >= -1 && activeIconRect.bottom <= innerHeight + 1
            ),
          },
          activeBorder: {
            topStyle: activeStyle?.borderTopStyle || '',
            topWidth: Number.parseFloat(activeStyle?.borderTopWidth || '0'),
            rightStyle: activeStyle?.borderRightStyle || '',
            rightWidth: Number.parseFloat(activeStyle?.borderRightWidth || '0'),
            bottomStyle: activeStyle?.borderBottomStyle || '',
            bottomWidth: Number.parseFloat(activeStyle?.borderBottomWidth || '0'),
            leftStyle: activeStyle?.borderLeftStyle || '',
            leftWidth: Number.parseFloat(activeStyle?.borderLeftWidth || '0'),
          },
          navigationBackground: navigationStyle?.backgroundColor || '',
          navInsideViewport: navButtons.every((node) => {
            const rect = node.getBoundingClientRect();
            return rect.left >= -1 && rect.right <= innerWidth + 1;
          }),
          navigationVisible: Boolean(navRect && navRect.width > 0 && navRect.height > 0),
          unnamedControls: controls.filter((node) => !controlName(node)).map((node) => node.tagName),
          orphanControls,
          forcedColorAdjustNone: Array.from(document.querySelectorAll('*'))
            .filter((node) => isVisible(node) && getComputedStyle(node).forcedColorAdjust === 'none')
            .map((node) => ({ tag: node.tagName, className: typeof node.className === 'string' ? node.className : '' }))
            .slice(0, 20),
          clippedAxisLabels: Array.from(document.querySelectorAll('.mp-chart-scale b'))
            .filter((node) => node.scrollWidth > node.clientWidth + 1)
            .map((node) => ({ text: node.textContent || '', clientWidth: node.clientWidth, scrollWidth: node.scrollWidth })),
          outOfChartLabels: Array.from(document.querySelectorAll('.mp-chart-scale b, .mp-chart-time b'))
            .filter((node) => {
              const rect = node.getBoundingClientRect();
              return Boolean(chartRect && (rect.left < chartRect.left - 1 || rect.right > chartRect.right + 1));
            })
            .map((node) => ({ text: node.textContent || '', rect: node.getBoundingClientRect().toJSON() })),
          chartSeriesPatterns: chartDown && chartUp ? {
            down: chartDownStyle?.strokeDasharray || '',
            up: chartUpStyle?.strokeDasharray || '',
          } : null,
        };
      }, route);
      result.keyboardReachedCurrentRoute = focusedRoute;
      result.ax = await summarizeAccessibilityTree({
        title: result.title,
        navNames: result.navNames,
        currentRoute: result.currentRouteNamed,
      });
      result.navAriaSnapshot = await accessibilityPage.locator('.panel-task-navigation').ariaSnapshot();
      result.ariaSnapshotCommands = result.navNames.every((name) => (
        result.navAriaSnapshot.includes(`button "${name}"`)
      ));
      await accessibilityPage.evaluate(async () => {
        window.scrollTo(0, 0);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      screenshots.push(await screenshot(
        accessibilityPage,
        `a11y-forced-colors-${route}.png`,
        `a11y-forced-colors-${route}`
      ));
      return result;
    };

    const forcedColorResults = [];
    for (const route of accessibilityRoutes) {
      forcedColorResults.push(await inspectForcedColorsRoute(route));
    }
    check(
      checks,
      'forced colors preserve covered-route task identity, focus, geometry and computed accessibility tree',
      forcedColorResults.every((result) => (
        result.forcedColorsActive && result.overflow <= 1 && result.minimumTarget >= 44 &&
        result.navCount === 4 && result.currentRoutes.length === 1 &&
        result.currentRoutes[0] === accessibilityRouteNavigationOwners[result.route] &&
        result.keyboardReachedCurrentRoute &&
        result.focusedRoute === accessibilityRouteNavigationOwners[result.route] &&
        result.focusRing.style !== 'none' && result.focusRing.width >= 2 &&
        result.activeIndicator.content !== 'none' &&
        (result.activeIndicator.width >= 2 || result.activeIndicator.height >= 2) &&
        (
          result.activeIndicator.background !== result.navigationBackground ||
          [
            [result.activeBorder.topStyle, result.activeBorder.topWidth],
            [result.activeBorder.rightStyle, result.activeBorder.rightWidth],
            [result.activeBorder.bottomStyle, result.activeBorder.bottomWidth],
            [result.activeBorder.leftStyle, result.activeBorder.leftWidth],
          ].some(([style, width]) => style !== 'none' && width >= 2)
        ) &&
        result.navInsideViewport && result.navigationVisible && result.unnamedControls.length === 0 &&
        result.activeContent.labelColor !== result.navigationBackground &&
        result.activeContent.labelOpacity > 0 && result.activeContent.labelVisibility !== 'hidden' &&
        result.activeContent.labelWidth > 0 && result.activeContent.labelHeight > 0 &&
        result.activeContent.iconWidth > 0 && result.activeContent.iconHeight > 0 &&
        result.activeContent.insideViewport &&
        result.orphanControls.length === 0 && result.forcedColorAdjustNone.length === 0 &&
        result.clippedAxisLabels.length === 0 && result.outOfChartLabels.length === 0 &&
        (!result.chartSeriesPatterns || result.chartSeriesPatterns.down !== result.chartSeriesPatterns.up) &&
        result.ax.routeHeadingExposed && result.ax.primaryNavigationExposed &&
        result.ax.missingNavigationCommands.length === 0 && result.ax.unnamedInteractive.length === 0 &&
        result.ariaSnapshotCommands
      )),
      forcedColorResults
    );

    mock.state.scenario = '';
    await accessibilityPage.setViewportSize({ width: 844, height: 1024 });
    const selectedObjectTarget = new URL(mock.url);
    selectedObjectTarget.searchParams.set('section', 'interfaces');
    const beforeSelectedObjectSnapshot = mock.state.snapshotCalls;
    await accessibilityPage.goto(selectedObjectTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForCalls(
      mock.state,
      beforeSelectedObjectSnapshot,
      'forced-colors selected object snapshot',
      12000
    );
    await waitForPhase(accessibilityPage, 'current', 12000);
    await accessibilityPage.locator('[data-mobile-domain-workspace="interfaces"]').waitFor();
    await accessibilityPage.locator('.mdw-tools-toggle').click();
    const forcedFilterButtons = accessibilityPage.locator('.mdw-filter-row button');
    await forcedFilterButtons.nth(2).click();
    await accessibilityPage.waitForFunction(() => (
      document.querySelector('.mdw-filter-row button[aria-pressed="true"]')?.textContent?.trim() === '运行'
    ));
    await accessibilityPage.locator('[data-mobile-row-id]').first().click();
    await accessibilityPage.locator('[data-mobile-row-id][aria-current="true"]').waitFor();
    const selectedObjectState = await accessibilityPage.evaluate(() => {
      const describe = (node) => {
        if (!(node instanceof HTMLElement)) return { exists: false };
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return {
          exists: true,
          name: (node.getAttribute('aria-label') || node.textContent || '').replace(/\s+/g, ' ').trim(),
          outlineStyle: style.outlineStyle,
          outlineWidth: Number.parseFloat(style.outlineWidth || '0'),
          outlineColor: style.outlineColor,
          forcedColorAdjust: style.forcedColorAdjust,
          insideViewport: rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1,
        };
      };
      return {
        filter: describe(document.querySelector('.mdw-filter-row button[aria-pressed="true"]')),
        object: describe(document.querySelector('[data-mobile-row-id][aria-current="true"]')),
        objectId: document.querySelector('[data-mobile-row-id][aria-current="true"]')?.getAttribute('data-mobile-row-id') || '',
        objectPrimary: document.querySelector('[data-mobile-row-id][aria-current="true"] .mdw-row-copy b')?.textContent?.trim() || '',
        detailVisible: Boolean(document.querySelector('[data-mobile-object-detail]')),
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    const selectedObjectAxTree = await accessibilityCdp.send('Accessibility.getFullAXTree');
    const selectedObjectAxNames = selectedObjectAxTree.nodes
      .filter((node) => !node.ignored && node.role?.value === 'button')
      .map((node) => String(node.name?.value || '').replace(/\s+/g, ' ').trim());
    selectedObjectState.axFilterNamed = selectedObjectAxNames.includes(selectedObjectState.filter.name);
    selectedObjectState.axObjectNamed = selectedObjectAxNames.some((name) => (
      selectedObjectState.objectPrimary && name.includes(selectedObjectState.objectPrimary)
    ));
    check(
      checks,
      'forced colors expose selected filter and selected object as named outlined states',
      selectedObjectState.filter.exists && selectedObjectState.filter.name === '运行' &&
        selectedObjectState.filter.outlineStyle !== 'none' && selectedObjectState.filter.outlineWidth >= 2 &&
        selectedObjectState.filter.forcedColorAdjust !== 'none' && selectedObjectState.filter.insideViewport &&
        selectedObjectState.object.exists && selectedObjectState.object.name &&
        selectedObjectState.objectId && selectedObjectState.objectPrimary &&
        selectedObjectState.object.outlineStyle !== 'none' && selectedObjectState.object.outlineWidth >= 2 &&
        selectedObjectState.object.forcedColorAdjust !== 'none' && selectedObjectState.object.insideViewport &&
        selectedObjectState.detailVisible && selectedObjectState.overflow <= 1 &&
        selectedObjectState.axFilterNamed && selectedObjectState.axObjectNamed,
      selectedObjectState
    );
    screenshots.push(await screenshot(
      accessibilityPage,
      'a11y-forced-colors-object-selection.png',
      'a11y-forced-colors-object-selection'
    ));

    mock.state.scenario = 'interfaces-down';
    await accessibilityPage.setViewportSize({ width: 768, height: 1024 });
    const incidentTarget = new URL(mock.url);
    incidentTarget.searchParams.set('section', 'overview');
    const beforeIncidentSnapshot = mock.state.snapshotCalls;
    await accessibilityPage.goto(incidentTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForCalls(
      mock.state,
      beforeIncidentSnapshot,
      'forced-colors incident snapshot',
      12000
    );
    await waitForPhase(accessibilityPage, 'current', 12000);
    await accessibilityPage.locator('[data-mobile-overview-risk="interfaces"]').waitFor();
    const forcedIncidentRows = accessibilityPage.locator('[data-mobile-incident-object]');
    await forcedIncidentRows.nth(1).click();
    await accessibilityPage.waitForFunction(() => (
      document.querySelectorAll('[data-mobile-incident-object][aria-current="true"]').length === 1 &&
      document.querySelectorAll('[data-mobile-incident-object][aria-pressed]').length === 0
    ));
    const incidentSelectionState = await accessibilityPage.evaluate(() => {
      const selected = document.querySelector('[data-mobile-incident-object][aria-current="true"]');
      const style = selected ? getComputedStyle(selected) : null;
      const rect = selected?.getBoundingClientRect();
      return {
        name: (selected?.getAttribute('aria-label') || selected?.textContent || '').replace(/\s+/g, ' ').trim(),
        objectId: selected?.getAttribute('data-mobile-incident-object') || '',
        outlineStyle: style?.outlineStyle || '',
        outlineWidth: Number.parseFloat(style?.outlineWidth || '0'),
        outlineColor: style?.outlineColor || '',
        forcedColorAdjust: style?.forcedColorAdjust || '',
        selectedCount: document.querySelectorAll('[data-mobile-incident-object][aria-current="true"]').length,
        unselectedCount: document.querySelectorAll('[data-mobile-incident-object]:not([aria-current])').length,
        toggleCount: document.querySelectorAll('[data-mobile-incident-object][aria-pressed]').length,
        inspectorId: document.querySelector('[data-mobile-incident-inspector]')?.getAttribute('data-mobile-incident-inspector') || '',
        insideViewport: Boolean(rect && rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1),
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    const incidentAxTree = await accessibilityCdp.send('Accessibility.getFullAXTree');
    incidentSelectionState.axObjectNamed = incidentAxTree.nodes.some((node) => (
      !node.ignored && node.role?.value === 'button' &&
      String(node.name?.value || '').replace(/\s+/g, ' ').trim() === incidentSelectionState.name
    ));
    check(
      checks,
      'forced colors expose one selected incident object and its inspector without color-only state',
      Boolean(incidentSelectionState.name && incidentSelectionState.objectId) &&
        incidentSelectionState.outlineStyle !== 'none' && incidentSelectionState.outlineWidth >= 2 &&
        incidentSelectionState.forcedColorAdjust !== 'none' && incidentSelectionState.insideViewport &&
        incidentSelectionState.selectedCount === 1 && incidentSelectionState.unselectedCount >= 1 &&
        incidentSelectionState.toggleCount === 0 &&
        incidentSelectionState.inspectorId === incidentSelectionState.objectId &&
        incidentSelectionState.overflow <= 1 && incidentSelectionState.axObjectNamed,
      incidentSelectionState
    );
    screenshots.push(await screenshot(
      accessibilityPage,
      'a11y-forced-colors-incident-selection.png',
      'a11y-forced-colors-incident-selection'
    ));

    mock.state.scenario = 'resource-full';
    await accessibilityPage.setViewportSize({ width: 390, height: 844 });
    const resourceTarget = new URL(mock.url);
    resourceTarget.searchParams.set('section', 'overview');
    const beforeResourceSnapshot = mock.state.snapshotCalls;
    await accessibilityPage.goto(resourceTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForCalls(
      mock.state,
      beforeResourceSnapshot,
      'forced-colors resource snapshot',
      12000
    );
    await waitForPhase(accessibilityPage, 'current', 12000);
    const resourceHistory = accessibilityPage.locator('[data-mobile-resource-history]');
    await resourceHistory.locator('summary').click();
    await resourceHistory.locator('[data-section-time-series]').waitFor();
    const resourceForcedColorsState = await accessibilityPage.evaluate(() => {
      const lineStyle = (selector) => {
        const node = document.querySelector(selector);
        const style = node ? getComputedStyle(node) : null;
        return {
          exists: Boolean(node),
          dash: style?.strokeDasharray || '',
          forcedColorAdjust: style?.forcedColorAdjust || '',
        };
      };
      const legendStyle = (selector) => {
        const node = document.querySelector(selector);
        const style = node ? getComputedStyle(node) : null;
        return {
          exists: Boolean(node),
          borderStyle: style?.borderTopStyle || '',
          borderWidth: Number.parseFloat(style?.borderTopWidth || '0'),
          forcedColorAdjust: style?.forcedColorAdjust || '',
        };
      };
      const chart = document.querySelector('[data-section-time-series]');
      const rect = chart?.getBoundingClientRect();
      return {
        forcedColorsActive: matchMedia('(forced-colors: active)').matches,
        cpu: lineStyle('[data-section-series="cpu"]'),
        memory: lineStyle('[data-section-series="memory"]'),
        disk: lineStyle('[data-section-series="disk"]'),
        memoryLegend: legendStyle('.mp-resource-history footer i.is-memory'),
        diskLegend: legendStyle('.mp-resource-history footer i.is-disk'),
        chartInsideViewport: Boolean(rect && rect.left >= -1 && rect.right <= innerWidth + 1),
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    const resourceAxTree = await accessibilityCdp.send('Accessibility.getFullAXTree');
    resourceForcedColorsState.axChartNamed = resourceAxTree.nodes.some((node) => (
      !node.ignored && node.role?.value === 'image' &&
      String(node.name?.value || '').includes('资源压力时间序列')
    ));
    check(
      checks,
      'forced colors distinguish CPU memory and disk resource series with named runtime evidence',
      resourceForcedColorsState.forcedColorsActive && resourceForcedColorsState.cpu.exists &&
        resourceForcedColorsState.memory.exists && resourceForcedColorsState.disk.exists &&
        resourceForcedColorsState.cpu.dash !== resourceForcedColorsState.memory.dash &&
        resourceForcedColorsState.memory.dash !== resourceForcedColorsState.disk.dash &&
        resourceForcedColorsState.cpu.dash !== resourceForcedColorsState.disk.dash &&
        resourceForcedColorsState.memoryLegend.exists && resourceForcedColorsState.memoryLegend.borderStyle === 'dashed' &&
        resourceForcedColorsState.memoryLegend.borderWidth >= 2 &&
        resourceForcedColorsState.diskLegend.exists && resourceForcedColorsState.diskLegend.borderStyle === 'dotted' &&
        resourceForcedColorsState.diskLegend.borderWidth >= 2 &&
        [resourceForcedColorsState.cpu, resourceForcedColorsState.memory, resourceForcedColorsState.disk]
          .every((item) => item.forcedColorAdjust !== 'none') &&
        resourceForcedColorsState.chartInsideViewport && resourceForcedColorsState.overflow <= 1 &&
        resourceForcedColorsState.axChartNamed,
      resourceForcedColorsState
    );
    screenshots.push(await screenshot(
      accessibilityPage,
      'a11y-forced-colors-resource-full.png',
      'a11y-forced-colors-resource-full'
    ));
    mock.state.scenario = '';

    await accessibilityPage.setViewportSize({ width: 390, height: 844 });
    const keyboardTarget = new URL(mock.url);
    keyboardTarget.searchParams.set('section', 'overview');
    await accessibilityPage.goto(keyboardTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForPhase(accessibilityPage, 'current', 12000);
    await accessibilityPage.locator('[data-mobile-overview]').waitFor();
    const activeDescriptor = () => accessibilityPage.evaluate(() => {
      const node = document.activeElement;
      if (!(node instanceof HTMLElement)) return { route: '', row: '', name: '', tag: '' };
      const labels = 'labels' in node && node.labels
        ? Array.from(node.labels).map((label) => label.textContent || '').join(' ')
        : '';
      return {
        route: node.getAttribute('data-section') || '',
        row: node.getAttribute('data-mobile-row-id') || '',
        name: (node.getAttribute('aria-label') || labels || node.textContent || '').replace(/\s+/g, ' ').trim(),
        tag: node.tagName,
      };
    });
    const resetKeyboardStart = () => accessibilityPage.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      document.body.tabIndex = -1;
      document.body.focus({ preventScroll: true });
    });
    const tabUntil = async (predicate, maximum = 100, reverse = false) => {
      const visited = [];
      for (let index = 0; index < maximum; index += 1) {
        await accessibilityPage.keyboard.press(reverse ? 'Shift+Tab' : 'Tab');
        const active = await activeDescriptor();
        visited.push(active);
        if (predicate(active)) return { active, visited };
      }
      return { active: await activeDescriptor(), visited };
    };

    await resetKeyboardStart();
    const keyboardNavOrder = [];
    for (let index = 0; index < 100 && keyboardNavOrder.length < 4; index += 1) {
      await accessibilityPage.keyboard.press('Tab');
      const active = await activeDescriptor();
      if (active.route && keyboardNavOrder.at(-1) !== active.route) keyboardNavOrder.push(active.route);
    }
    await resetKeyboardStart();
    const networkNav = await tabUntil((active) => active.route === 'interfaces');
    const networkFocusRing = await accessibilityPage.evaluate(() => {
      const style = document.activeElement instanceof HTMLElement ? getComputedStyle(document.activeElement) : null;
      return { style: style?.outlineStyle || '', width: Number.parseFloat(style?.outlineWidth || '0') };
    });
    await accessibilityPage.keyboard.press('Enter');
    await accessibilityPage.locator('[data-mobile-domain-workspace="interfaces"]').waitFor();
    const networkTitleFocused = await accessibilityPage.evaluate(() => document.activeElement?.matches('[data-panel-route-title]') || false);
    const filterByKeyboard = await tabUntil((active) => active.name.includes('筛选') || active.name.includes('排序'));
    await accessibilityPage.keyboard.press('Enter');
    const searchByKeyboard = await tabUntil((active) => active.tag === 'INPUT');
    await accessibilityPage.keyboard.type('pppoe-wan1');
    await accessibilityPage.waitForFunction(() => document.querySelectorAll('[data-mobile-row-id]').length === 1);
    await accessibilityPage.keyboard.press('Control+A');
    await accessibilityPage.keyboard.press('Backspace');
    await accessibilityPage.waitForFunction(() => document.querySelectorAll('[data-mobile-row-id]').length >= 2);
    const rowByKeyboard = await tabUntil((active) => Boolean(active.row));
    const keyboardObjectId = rowByKeyboard.active.row;
    const rowFocusRing = await accessibilityPage.evaluate(() => {
      const style = document.activeElement instanceof HTMLElement ? getComputedStyle(document.activeElement) : null;
      return { style: style?.outlineStyle || '', width: Number.parseFloat(style?.outlineWidth || '0') };
    });
    await accessibilityPage.keyboard.press('Enter');
    await accessibilityPage.locator('[data-mobile-object-detail]').waitFor();
    const detailTitleFocused = await accessibilityPage.evaluate(() => document.activeElement?.id === 'mdw-detail-title');
    const detailAxIdentity = await accessibilityPage.evaluate(() => ({
      title: (document.querySelector('#mdw-detail-title')?.textContent || '').replace(/\s+/g, ' ').trim(),
      returnName: (document.querySelector('[data-mobile-object-detail] button')?.getAttribute('aria-label') ||
        document.querySelector('[data-mobile-object-detail] button')?.textContent || '').replace(/\s+/g, ' ').trim(),
    }));
    const detailAxTree = await accessibilityCdp.send('Accessibility.getFullAXTree');
    const detailAxNodes = detailAxTree.nodes.filter((node) => !node.ignored).map((node) => ({
      role: String(node.role?.value || ''),
      name: String(node.name?.value || '').replace(/\s+/g, ' ').trim(),
    }));
    const detailAxResult = {
      heading: detailAxNodes.some((node) => node.role === 'heading' && node.name === detailAxIdentity.title),
      returnCommand: detailAxNodes.some((node) => node.role === 'button' && node.name === detailAxIdentity.returnName),
      identity: detailAxIdentity,
    };
    const returnByKeyboard = await tabUntil((active) => active.name.includes('返回接口'), 10, true);
    const returnFocusRing = await accessibilityPage.evaluate(() => {
      const style = document.activeElement instanceof HTMLElement ? getComputedStyle(document.activeElement) : null;
      return { style: style?.outlineStyle || '', width: Number.parseFloat(style?.outlineWidth || '0') };
    });
    await accessibilityPage.keyboard.press('Enter');
    await accessibilityPage.waitForFunction(() => !document.querySelector('[data-mobile-object-detail]'));
    const restoredRowFocus = await accessibilityPage.evaluate((id) => document.activeElement?.getAttribute('data-mobile-row-id') === id, keyboardObjectId);
    await accessibilityPage.goForward();
    await accessibilityPage.locator('[data-mobile-object-detail]').waitFor();
    const forwardDetailFocus = await accessibilityPage.evaluate(() => document.activeElement?.id === 'mdw-detail-title');
    await accessibilityPage.goBack();
    await accessibilityPage.waitForFunction(() => !document.querySelector('[data-mobile-object-detail]'));
    const backRowFocus = await accessibilityPage.evaluate((id) => document.activeElement?.getAttribute('data-mobile-row-id') === id, keyboardObjectId);
    check(
      checks,
      'forced-colors Tab and Enter complete navigation, object inspection, AX detail, return and history focus outcomes',
      JSON.stringify(keyboardNavOrder) === JSON.stringify(['overview', 'interfaces', 'terminals', 'logs']) &&
        networkNav.active.route === 'interfaces' && networkTitleFocused &&
        filterByKeyboard.active.name && searchByKeyboard.active.tag === 'INPUT' && keyboardObjectId &&
        networkFocusRing.style !== 'none' && networkFocusRing.width >= 2 &&
        rowFocusRing.style !== 'none' && rowFocusRing.width >= 2 &&
        detailTitleFocused && detailAxResult.heading && detailAxResult.returnCommand &&
        returnByKeyboard.active.name.includes('返回接口') &&
        returnFocusRing.style !== 'none' && returnFocusRing.width >= 2 && restoredRowFocus &&
        forwardDetailFocus && backRowFocus,
      {
        keyboardNavOrder,
        networkNav: networkNav.active,
        networkFocusRing,
        networkTitleFocused,
        filterByKeyboard: filterByKeyboard.active,
        searchByKeyboard: searchByKeyboard.active,
        keyboardObjectId,
        rowFocusRing,
        detailTitleFocused,
        detailAxResult,
        returnByKeyboard: returnByKeyboard.active,
        returnFocusRing,
        restoredRowFocus,
        forwardDetailFocus,
        backRowFocus,
      }
    );
    const abnormalKeyboardScenarios = ['all-offline', 'no-snapshot', 'collection-down', 'resource-full', 'interfaces-down'];
    const abnormalKeyboardResults = [];
    for (const scenario of abnormalKeyboardScenarios) {
      mock.state.scenario = scenario;
      const abnormalKeyboardTarget = new URL(mock.url);
      abnormalKeyboardTarget.searchParams.set('section', 'overview');
      await accessibilityPage.goto(abnormalKeyboardTarget.toString(), { waitUntil: 'domcontentloaded' });
      await waitForPhase(accessibilityPage, scenario === 'no-snapshot' ? 'error' : 'current', 12000);
      await accessibilityPage.locator('[data-mobile-overview]').waitFor();
      await accessibilityPage.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        document.body.tabIndex = -1;
        document.body.focus({ preventScroll: true });
      });
      let focusedControl = null;
      for (let index = 0; index < 80; index += 1) {
        await accessibilityPage.keyboard.press('Tab');
        const candidate = await accessibilityPage.evaluate(() => {
          const node = document.activeElement;
          if (!(node instanceof HTMLElement)) return null;
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          const name = (node.getAttribute('aria-label') || node.textContent || '').replace(/\s+/g, ' ').trim();
          return {
            tag: node.tagName,
            name,
            visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
            focusStyle: style.outlineStyle,
            focusWidth: Number.parseFloat(style.outlineWidth || '0'),
          };
        });
        if (candidate?.visible && candidate.name) {
          focusedControl = candidate;
          break;
        }
      }
      const result = await accessibilityPage.evaluate(() => {
        const isVisible = (node) => {
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        };
        const controls = Array.from(document.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
        )).filter(isVisible);
        const controlName = (node) => {
          const labelledBy = (node.getAttribute('aria-labelledby') || '')
            .split(/\s+/)
            .filter(Boolean)
            .map((id) => document.getElementById(id)?.textContent || '')
            .join(' ');
          const labels = 'labels' in node && node.labels
            ? Array.from(node.labels).map((label) => label.textContent || '').join(' ')
            : '';
          return (node.getAttribute('aria-label') || labelledBy || labels || node.textContent || '').replace(/\s+/g, ' ').trim();
        };
        return {
          unnamedControls: controls.filter((node) => !controlName(node)).length,
          orphanControls: controls.filter((node) => {
            const targetId = node.getAttribute('aria-controls');
            return Boolean(targetId && !document.getElementById(targetId));
          }).length,
          actionCount: document.querySelectorAll('[data-overview-task-landmark="investigation-primary"]').length,
          evidenceMode: document.querySelector('[data-mobile-overview]')?.getAttribute('data-mobile-evidence-mode') || '',
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      });
      abnormalKeyboardResults.push({ scenario, focusedControl, ...result });
    }
    check(
      checks,
      'abnormal overview scenarios keep keyboard focus visible and actionable without orphan controls',
      abnormalKeyboardResults.every((result) => (
        result.focusedControl?.visible && result.focusedControl.focusStyle !== 'none' && result.focusedControl.focusWidth >= 2 &&
        result.unnamedControls === 0 && result.orphanControls === 0 && result.actionCount > 0 && result.overflow <= 1
      )),
      abnormalKeyboardResults
    );
    mock.state.scenario = '';
    await accessibilityCdp.send('Accessibility.disable');
    await accessibilityPage.close();

    await page.setViewportSize({ width: 390, height: 844 });
    for (const scenario of ['all-offline', 'no-snapshot']) {
      mock.state.scenario = scenario;
      const visualScenarioTarget = new URL(mock.url);
      visualScenarioTarget.searchParams.set('section', 'overview');
      await page.goto(visualScenarioTarget.toString(), { waitUntil: 'domcontentloaded' });
      await waitForPhase(page, scenario === 'no-snapshot' ? 'error' : 'current', 12000);
      await page.locator('[data-mobile-overview]').waitFor();
      await page.evaluate(() => window.scrollTo(0, 0));
      const visualScenarioState = await page.evaluate(() => {
        const root = document.querySelector('[data-mobile-overview]');
        return {
          risk: root?.getAttribute('data-mobile-overview-risk') || '',
          evidenceMode: root?.getAttribute('data-mobile-evidence-mode') || '',
          title: document.querySelector('.mp-command h1')?.textContent?.trim() || '',
          currentRateOwners: document.querySelectorAll('[data-mobile-current-rate-owner]').length,
        };
      });
      check(
        checks,
        `${scenario} visual evidence renders the real abnormal state before capture`,
        scenario === 'all-offline'
          ? visualScenarioState.risk === 'wan' && visualScenarioState.evidenceMode === 'current' && visualScenarioState.title.includes('WAN')
          : visualScenarioState.evidenceMode === 'unavailable' && visualScenarioState.currentRateOwners === 0,
        visualScenarioState
      );
      screenshots.push(await screenshot(page, `overview-${scenario}-390.png`, `overview-${scenario}-390`));
      if (scenario === 'all-offline') {
        const aggregateTrigger = page.locator('[data-mobile-incident-expand]');
        await aggregateTrigger.click();
        await page.locator('[data-mobile-incident-aggregate]').waitFor();
        const aggregateUrl = page.url();
        const aggregateState = await page.evaluate(() => {
          const query = new URLSearchParams(location.search);
          const rows = [...document.querySelectorAll('[data-mobile-incident-aggregate-row]')];
          const first = rows[0];
          return {
            section: query.get('section'),
            view: query.get('view'),
            groups: document.querySelectorAll('.mia-domain').length,
            rows: rows.length,
            firstDestination: first?.getAttribute('data-mobile-destination') || '',
            firstText: first?.textContent?.replace(/\s+/g, ' ').trim() || '',
            firstName: first?.getAttribute('aria-label') || '',
            firstGroupText: first?.closest('.mia-domain')?.querySelector('.mia-domain-summary')
              ?.textContent?.replace(/\s+/g, ' ').trim() || '',
            backLabel: document.querySelector('.mia-back')?.getAttribute('aria-label') || '',
            overflow: document.documentElement.scrollWidth - innerWidth,
          };
        });
        check(
          checks,
          'all-offline 查看全部 opens a real grouped incident URL with evidence-bearing destinations',
          aggregateState.section === 'overview' && aggregateState.view === 'incidents' &&
            aggregateState.groups >= 1 && aggregateState.rows >= 8 &&
            aggregateState.firstDestination === 'lineStatus' &&
            /严重|注意|缺失/.test(aggregateState.firstName) && /未运行/.test(aggregateState.firstName) &&
            /严重|注意|缺失/.test(aggregateState.firstGroupText) && /未运行/.test(aggregateState.firstGroupText) &&
            aggregateState.backLabel === '返回概览' && aggregateState.overflow <= 1,
          { aggregateUrl, aggregateState },
        );
        screenshots.push(await screenshot(page, 'overview-all-offline-incidents-390.png', 'overview-all-offline-incidents-390'));
        await page.locator('[data-mobile-incident-aggregate-row]').first().click();
        await page.locator('[data-mobile-domain-workspace="lineStatus"]').waitFor();
        const aggregateDestination = new URL(page.url());
        check(
          checks,
          'aggregate incident rows navigate to the real object workspace without leaking the aggregate view query',
          aggregateDestination.searchParams.get('section') === 'lineStatus' &&
            Boolean(aggregateDestination.searchParams.get('object')) &&
            aggregateDestination.searchParams.get('view') === null,
          aggregateDestination.toString(),
        );
        await page.goBack();
        await page.locator('[data-mobile-incident-aggregate]').waitFor();
        await page.goBack();
        await page.locator('[data-mobile-overview-risk="wan"]').waitFor();
        await page.goForward();
        await page.locator('[data-mobile-incident-aggregate]').waitFor();
        check(
          checks,
          'aggregate incident URL restores through Back and Forward',
          page.url() === aggregateUrl,
          { expected: aggregateUrl, actual: page.url() },
        );
        await page.getByRole('button', { name: '返回概览' }).click();
        await page.locator('[data-mobile-overview-risk="wan"]').waitFor();
      }
    }
    mock.state.scenario = '';
    const normalOverviewTarget = new URL(mock.url);
    normalOverviewTarget.searchParams.set('section', 'overview');
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto(normalOverviewTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForPhase(page, 'current', 12000);
    await page.locator('[data-mobile-overview]').waitFor();
    screenshots.push(await screenshot(page, 'overview-normal-430.png', 'overview-normal-430'));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(normalOverviewTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForPhase(page, 'current', 12000);
    await page.locator('[data-mobile-overview]').waitFor();

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
    const tabletContext = await openIsolatedContext({
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
    const tabletOverviewDefault = await tabletPage.evaluate(() => {
      const rows = [...document.querySelectorAll('[data-mobile-incident-object]')];
      const first = rows[0] || null;
      const selected = document.querySelector('[data-mobile-incident-object][aria-current="true"]');
      const inspector = document.querySelector('[data-mobile-incident-inspector]');
      return {
        firstId: first?.getAttribute('data-mobile-incident-object') || '',
        selectedId: selected?.getAttribute('data-mobile-incident-object') || '',
        inspectorId: inspector?.getAttribute('data-mobile-incident-inspector') || '',
        attributeLabels: [...(inspector?.querySelectorAll('dl dt') || [])]
          .map((node) => node.textContent?.trim() || '')
          .filter(Boolean),
        source: inspector?.querySelector('.mp-inspector-source code')?.textContent?.trim() || '',
        action: inspector?.querySelector('button')?.textContent?.replace(/\s+/g, ' ').trim() || '',
        actionRoute: inspector?.querySelector('button')?.getAttribute('data-mobile-destination') || '',
      };
    });
    check(
      checks,
      'multi-object tablet Overview selects the highest-risk object by default',
      Boolean(tabletOverviewDefault.firstId) &&
        tabletOverviewDefault.selectedId === tabletOverviewDefault.firstId &&
        tabletOverviewDefault.inspectorId === tabletOverviewDefault.firstId &&
        tabletOverviewDefault.attributeLabels.length >= 3 &&
        tabletOverviewDefault.source.includes('interfaces[') &&
        tabletOverviewDefault.actionRoute === 'interfaces',
      tabletOverviewDefault
    );
    await incidentRows.nth(1).click();
    await tabletPage.waitForFunction(() => (
      document.querySelectorAll('[data-mobile-incident-object]')[1]?.getAttribute('aria-current') === 'true'
    ));
    const tabletOverviewSelection = await tabletPage.evaluate(() => {
      const selected = document.querySelector('[data-mobile-incident-object][aria-current="true"]');
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
    await tabletPage.locator('[data-mobile-incident-inspector] button').click();
    await tabletPage.locator('[data-mobile-domain-workspace="interfaces"]').waitFor();
    const directIncidentEntry = await tabletPage.evaluate(() => {
      const query = new URLSearchParams(location.search);
      const boundary = document.querySelector('[data-investigation-risk]');
      return {
        url: location.href,
        section: query.get('section'),
        object: query.get('object'),
        risk: query.get('risk'),
        from: query.get('from'),
        evidenceAt: query.get('evidenceAt'),
        boundaryRisk: boundary?.getAttribute('data-investigation-risk') || '',
      };
    });
    await tabletPage.goBack();
    await tabletPage.locator('[data-mobile-overview-risk="interfaces"]').waitFor();
    const directIncidentBack = tabletPage.url();
    await tabletPage.goForward();
    await tabletPage.locator('[data-mobile-domain-workspace="interfaces"]').waitFor();
    const directIncidentForward = await tabletPage.evaluate(() => ({
      url: location.href,
      risk: new URLSearchParams(location.search).get('risk'),
      boundaryRisk: document.querySelector('[data-investigation-risk]')?.getAttribute('data-investigation-risk') || '',
    }));
    await tabletPage.goBack();
    await tabletPage.locator('[data-mobile-overview-risk="interfaces"]').waitFor();
    check(
      checks,
      'direct incident object drill-down preserves typed risk through URL, Back and Forward',
      directIncidentEntry.section === 'interfaces' &&
        Boolean(directIncidentEntry.object) &&
        directIncidentEntry.risk === 'interfaces' &&
        directIncidentEntry.from === 'overview' &&
        Boolean(directIncidentEntry.evidenceAt) &&
        directIncidentEntry.boundaryRisk === 'interfaces' &&
        directIncidentBack === overviewUrl &&
        directIncidentForward.url === directIncidentEntry.url &&
        directIncidentForward.risk === 'interfaces' &&
        directIncidentForward.boundaryRisk === 'interfaces',
      { directIncidentEntry, directIncidentBack, directIncidentForward }
    );
    await incidentRows.nth(1).click();
    await tabletPage.waitForFunction(() => (
      document.querySelectorAll('[data-mobile-incident-object]')[1]?.getAttribute('aria-current') === 'true'
    ));
    const inspectTabletOverviewGeometry = () => tabletPage.evaluate(() => {
      const bounds = (node) => {
        const rect = node?.getBoundingClientRect();
        return rect ? {
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        } : null;
      };
      const workspace = document.querySelector('.mp-workspace');
      const masterDetail = document.querySelector('.mp-tablet-master-detail');
      const master = masterDetail?.querySelector('.mp-incident');
      const inspector = masterDetail?.querySelector('.mp-inspector');
      const riskRows = [...(master?.querySelectorAll('[data-mobile-incident-object]') || [])];
      const selectedRow = master?.querySelector('[data-mobile-incident-object][aria-current="true"]');
      const inspectorHeading = inspector?.querySelector('h2');
      const inspectorFacts = [...(inspector?.querySelectorAll('dl > div') || [])];
      const inspectorAction = inspector?.querySelector('button');
      const navigationRect = document.querySelector('.panel-task-navigation')?.getBoundingClientRect();
      const bottomNavigation = Boolean(
        navigationRect && navigationRect.width >= innerWidth * 0.6 && navigationRect.height < innerHeight * 0.3
      );
      const viewportBottom = bottomNavigation && navigationRect ? navigationRect.top : innerHeight;
      const fullyInsideViewport = (node) => {
        if (!(node instanceof HTMLElement)) return false;
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden' &&
          rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.bottom <= viewportBottom;
      };
      const workspaceRect = bounds(workspace);
      const masterDetailRect = bounds(masterDetail);
      const masterRect = bounds(master);
      const inspectorRect = bounds(inspector);
      const split = Boolean(
        masterRect && inspectorRect &&
        inspectorRect.left >= masterRect.right - 2 &&
        inspectorRect.top < masterRect.bottom - 2
      );
      const stacked = Boolean(
        masterRect && inspectorRect &&
        inspectorRect.top >= masterRect.bottom - 2
      );
      return {
        viewport: [innerWidth, innerHeight],
        viewportBottom: Math.round(viewportBottom),
        activeSection: document.querySelector('[data-panel-app]')?.getAttribute('data-active-section') || '',
        risk: document.querySelector('[data-mobile-overview]')?.getAttribute('data-mobile-overview-risk') || '',
        evidenceMode: document.querySelector('[data-mobile-overview]')?.getAttribute('data-mobile-evidence-mode') || '',
        taskContract: document.querySelector('[data-mobile-overview]')?.getAttribute('data-overview-task-contract') || '',
        verdict: document.querySelector('[data-mobile-verdict] h1')?.textContent?.trim() || '',
        freshness: document.querySelector('[data-mobile-verdict] time')?.textContent?.trim() || '',
        mobileRoot: Boolean(document.querySelector('[data-mobile-overview]')),
        desktopRoot: Boolean(document.querySelector('[data-desktop-overview]')),
        firstRiskId: riskRows[0]?.getAttribute('data-mobile-incident-object') || '',
        selectedRiskId: selectedRow?.getAttribute('data-mobile-incident-object') || '',
        inspectorId: inspector?.getAttribute('data-mobile-incident-inspector') || '',
        attributeLabels: inspectorFacts
          .map((fact) => fact.querySelector('dt')?.textContent?.trim() || '')
          .filter(Boolean),
        source: inspector?.querySelector('.mp-inspector-source code')?.textContent?.trim() || '',
        selectedRowRect: bounds(selectedRow),
        inspectorHeadingRect: bounds(inspectorHeading),
        inspectorFirstFactRect: bounds(inspectorFacts[0]),
        inspectorActionRect: bounds(inspectorAction),
        visibleRiskRows: riskRows.filter(fullyInsideViewport).length,
        selectedRowInViewport: fullyInsideViewport(selectedRow),
        inspectorHeadingInViewport: fullyInsideViewport(inspectorHeading),
        inspectorFirstFactInViewport: fullyInsideViewport(inspectorFacts[0]),
        inspectorActionInViewport: fullyInsideViewport(inspectorAction),
        workspaceRect,
        masterDetailRect,
        masterRect,
        inspectorRect,
        gridTemplateColumns: masterDetail ? getComputedStyle(masterDetail).gridTemplateColumns : '',
        mode: split ? 'split' : stacked ? 'stacked' : 'unknown',
        splitBelowMinimum: Boolean(
          split && masterRect && inspectorRect &&
          (masterRect.width < 240 || inspectorRect.width < 400)
        ),
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    const tabletOverviewGeometry = await inspectTabletOverviewGeometry();
    check(
      checks,
      '768px overview splits master and inspector in the available tablet workspace',
      tabletOverviewGeometry.viewport[0] === 768 &&
        tabletOverviewGeometry.masterDetailRect?.width >= 640 &&
        tabletOverviewGeometry.masterRect?.width >= 240 &&
        tabletOverviewGeometry.mode === 'split' &&
        tabletOverviewGeometry.splitBelowMinimum === false &&
        tabletOverviewGeometry.selectedRiskId === tabletOverviewGeometry.inspectorId &&
        includesEvery(tabletOverviewGeometry.attributeLabels, ['管理状态', '默认路由依赖', '角色 / 类型']) &&
        tabletOverviewGeometry.source.includes('interfaces[') &&
        tabletOverviewGeometry.visibleRiskRows >= 3 &&
        tabletOverviewGeometry.selectedRowInViewport &&
        tabletOverviewGeometry.inspectorHeadingInViewport &&
        tabletOverviewGeometry.inspectorFirstFactInViewport &&
        tabletOverviewGeometry.inspectorActionInViewport &&
        tabletOverviewGeometry.overflow <= 1,
      tabletOverviewGeometry
    );
    screenshots.push(await screenshot(tabletPage, 'tablet-overview-master-detail-768.png', 'tablet-overview-master-detail-768'));

    await tabletPage.setViewportSize({ width: 844, height: 1024 });
    await tabletPage.waitForFunction(() => innerWidth === 844 && innerHeight === 1024);
    const wideTabletOverviewGeometry = await inspectTabletOverviewGeometry();
    check(
      checks,
      '844px overview splits master and inspector only after the real workspace can hold both minimums',
      wideTabletOverviewGeometry.viewport[0] === 844 &&
        wideTabletOverviewGeometry.masterDetailRect?.width >= 700 &&
        wideTabletOverviewGeometry.mode === 'split' &&
        wideTabletOverviewGeometry.masterRect?.width >= 280 &&
        wideTabletOverviewGeometry.inspectorRect?.width >= 400 &&
        wideTabletOverviewGeometry.splitBelowMinimum === false &&
        wideTabletOverviewGeometry.selectedRiskId === wideTabletOverviewGeometry.inspectorId &&
        includesEvery(wideTabletOverviewGeometry.attributeLabels, ['管理状态', '默认路由依赖', '角色 / 类型']) &&
        wideTabletOverviewGeometry.source.includes('interfaces[') &&
        wideTabletOverviewGeometry.visibleRiskRows >= 3 &&
        wideTabletOverviewGeometry.selectedRowInViewport &&
        wideTabletOverviewGeometry.inspectorHeadingInViewport &&
        wideTabletOverviewGeometry.inspectorFirstFactInViewport &&
        wideTabletOverviewGeometry.inspectorActionInViewport &&
        wideTabletOverviewGeometry.overflow <= 1,
      wideTabletOverviewGeometry
    );
    const tabletIncidentVerticalTask = await tabletPage.evaluate(() => {
      const owner = document.querySelector('[data-tablet-vertical-space-task="incident"]');
      const buttons = [...(owner?.querySelectorAll('.mp-action-list > button[id]') || [])];
      const summary = owner?.querySelector('.mp-tablet-task-summary')?.textContent?.replace(/\s+/g, ' ').trim() || '';
      const rect = owner?.getBoundingClientRect();
      return {
        present: Boolean(owner),
        purpose: owner?.getAttribute('data-tablet-space-purpose') || '',
        newDecision: owner?.getAttribute('data-tablet-space-new-decision') || '',
        actionIds: buttons.map((button) => button.id),
        summary,
        height: rect ? Math.round(rect.height) : 0,
      };
    });
    check(
      checks,
      'tablet incident vertical task surface binds impact follow-up without metric filler',
      tabletIncidentVerticalTask.present &&
        tabletIncidentVerticalTask.purpose === 'impact-follow-up' &&
        tabletIncidentVerticalTask.newDecision === 'true' &&
        tabletIncidentVerticalTask.actionIds.length >= 2 &&
        tabletIncidentVerticalTask.summary.length > 0 &&
        tabletIncidentVerticalTask.height >= 120,
      tabletIncidentVerticalTask
    );
    const tabletIncidentNextEvidence = await tabletPage.evaluate(() => {
      const workspace = document.querySelector('[data-tablet-next-evidence-workspace="incident"]');
      const rows = [...(workspace?.querySelectorAll('[data-tablet-next-evidence-relation]') || [])];
      return {
        present: Boolean(workspace),
        kind: workspace?.getAttribute('data-tablet-next-evidence-kind') || '',
        newDecision: workspace?.getAttribute('data-tablet-next-evidence-new-decision') || '',
        relationLabels: rows.map((row) => row.getAttribute('data-tablet-next-evidence-relation') || ''),
        relationValues: rows.map((row) => row.querySelector('dd')?.textContent?.replace(/\s+/g, ' ').trim() || ''),
        title: workspace?.querySelector('h2')?.textContent?.trim() || '',
        evidenceAt: workspace?.getAttribute('data-tablet-next-evidence-at') || workspace?.querySelector('time')?.getAttribute('datetime') || '',
        duplicateMetricCount: (workspace?.textContent?.match(/24\.00 Mbps|8\.00 Mbps/g) || []).length,
      };
    });
    check(
      checks,
      'tablet incident next-evidence workspace compares impact sources without repeating traffic metrics',
      tabletIncidentNextEvidence.present &&
        tabletIncidentNextEvidence.kind === 'impact-trace' &&
        tabletIncidentNextEvidence.newDecision === 'true' &&
        tabletIncidentNextEvidence.relationLabels.join('|') === '来源|默认路由依赖|影响范围|最近采样' &&
        tabletIncidentNextEvidence.relationValues.length === 4 &&
        tabletIncidentNextEvidence.relationValues.every(Boolean) &&
        tabletIncidentNextEvidence.relationValues[0] !== '未记录' &&
        tabletIncidentNextEvidence.title.length > 0 &&
        tabletIncidentNextEvidence.evidenceAt.length > 0 &&
        tabletIncidentNextEvidence.duplicateMetricCount === 0,
      tabletIncidentNextEvidence
    );
    screenshots.push(await screenshot(tabletPage, 'tablet-overview-master-detail-844.png', 'tablet-overview-master-detail-844'));

    const contextualInterfaceAction = tabletPage.locator('.mp-actions #interfaces');
    await contextualInterfaceAction.scrollIntoViewIfNeeded();
    await contextualInterfaceAction.click();
    await tabletPage.locator('[data-mobile-domain-workspace="interfaces"]').waitFor();
    const interfaceInvestigationEntry = await tabletPage.evaluate(() => {
      const query = new URLSearchParams(location.search);
      const boundary = document.querySelector('[data-investigation-risk]');
      return {
        url: location.href,
        section: query.get('section'),
        object: query.get('object'),
        risk: query.get('risk'),
        from: query.get('from'),
        evidenceAt: query.get('evidenceAt'),
        boundaryRisk: boundary?.getAttribute('data-investigation-risk') || '',
        boundaryText: (boundary?.textContent || '').replace(/\s+/g, ' ').trim(),
      };
    });
    screenshots.push(await screenshot(
      tabletPage,
      'tablet-interface-investigation-context-844.png',
      'tablet-interface-investigation-context-844'
    ));
    await tabletPage.goBack();
    await tabletPage.locator('[data-mobile-overview-risk="interfaces"]').waitFor();
    await tabletPage.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const interfaceInvestigationBack = await tabletPage.evaluate(() => ({
      section: new URLSearchParams(location.search).get('section'),
      focusedAction: document.activeElement?.id || '',
    }));
    await tabletPage.goForward();
    await tabletPage.locator('[data-mobile-domain-workspace="interfaces"]').waitFor();
    const interfaceInvestigationForward = await tabletPage.evaluate(() => {
      const query = new URLSearchParams(location.search);
      const boundary = document.querySelector('[data-investigation-risk]');
      return {
        url: location.href,
        risk: query.get('risk'),
        from: query.get('from'),
        evidenceAt: query.get('evidenceAt'),
        boundaryRisk: boundary?.getAttribute('data-investigation-risk') || '',
      };
    });
    await tabletPage.goBack();
    await tabletPage.locator('[data-mobile-overview-risk="interfaces"]').waitFor();
    check(
      checks,
      'overview investigation action preserves typed interface evidence through URL, Back, Forward and focus',
      interfaceInvestigationEntry.section === 'interfaces' &&
        interfaceInvestigationEntry.object === null &&
        interfaceInvestigationEntry.risk === 'interfaces' &&
        interfaceInvestigationEntry.from === 'overview' &&
        Boolean(interfaceInvestigationEntry.evidenceAt) &&
        interfaceInvestigationEntry.boundaryRisk === 'interfaces' &&
        interfaceInvestigationEntry.boundaryText.includes('\u6765\u81ea\u8fd0\u884c\u6982\u89c8') &&
        interfaceInvestigationBack.section === 'overview' &&
        interfaceInvestigationBack.focusedAction === 'interfaces' &&
        interfaceInvestigationForward.url === interfaceInvestigationEntry.url &&
        interfaceInvestigationForward.risk === 'interfaces' &&
        interfaceInvestigationForward.from === 'overview' &&
        interfaceInvestigationForward.evidenceAt === interfaceInvestigationEntry.evidenceAt &&
        interfaceInvestigationForward.boundaryRisk === 'interfaces',
      { interfaceInvestigationEntry, interfaceInvestigationBack, interfaceInvestigationForward }
    );

    const compactBoundaryStates = [];
    for (const width of [767, 600, 599]) {
      await tabletPage.setViewportSize({ width, height: 1024 });
      const expectedMasterDetail = width >= 600;
      await tabletPage.waitForFunction(({ expectedWidth, expectedMasterDetail: shouldOwnMasterDetail }) => (
        innerWidth === expectedWidth &&
        Boolean(document.querySelector('[data-mobile-overview]')) &&
        !document.querySelector('[data-desktop-overview]') &&
        Boolean(document.querySelector('.mp-tablet-master-detail')) === shouldOwnMasterDetail
      ), { expectedWidth: width, expectedMasterDetail });
      const state = await inspectTabletOverviewGeometry();
      compactBoundaryStates.push(state);
      screenshots.push(await screenshot(
        tabletPage,
        `overview-responsive-${width}.png`,
        `overview-responsive-${width}`
      ));
    }
    const sameOverviewTask = (state) => (
      state.activeSection === tabletOverviewGeometry.activeSection &&
      state.risk === tabletOverviewGeometry.risk &&
      state.evidenceMode === tabletOverviewGeometry.evidenceMode &&
      state.taskContract === tabletOverviewGeometry.taskContract &&
      state.verdict === tabletOverviewGeometry.verdict &&
      state.freshness === tabletOverviewGeometry.freshness &&
      state.mobileRoot === true && state.desktopRoot === false && state.overflow <= 1
    );
    check(
      checks,
      '599px and 600px preserve the same overview task while the compact workbench gains a stacked master-detail owner',
      compactBoundaryStates.length === 3 &&
        sameOverviewTask(compactBoundaryStates[1]) &&
        sameOverviewTask(compactBoundaryStates[2]) &&
        compactBoundaryStates[1].mode === 'stacked' &&
        compactBoundaryStates[2].mode === 'unknown',
      compactBoundaryStates.slice(1)
    );
    check(
      checks,
      '767px and 768px preserve the same overview task and split master-detail ownership',
      sameOverviewTask(compactBoundaryStates[0]) &&
        tabletOverviewGeometry.mode === 'split' &&
        compactBoundaryStates[0].mode === 'split' &&
        compactBoundaryStates[0].splitBelowMinimum === false,
      { compact: compactBoundaryStates[0], tablet: tabletOverviewGeometry }
    );

    await tabletPage.setViewportSize({ width: 390, height: 844 });
    await tabletPage.waitForFunction(() => innerWidth === 390 && innerHeight === 844);
    const overviewJourneyContext = await tabletPage.evaluate(() => ({
      device: document.querySelector('.panel-runtime-bar-mobile .panel-runtime-device b')?.textContent?.trim() || '',
      freshness: document.querySelector('.panel-runtime-bar-mobile .panel-runtime-device span')?.textContent?.trim() || '',
      evidenceMode: document.querySelector('[data-mobile-overview]')?.getAttribute('data-mobile-evidence-mode') || '',
      readonly: /只读/.test(document.querySelector('[data-mobile-evidence-ledger]')?.textContent || ''),
      navigation: Array.from(document.querySelectorAll('.panel-task-navigation button')).map((node) => node.textContent?.trim() || ''),
    }));
    const phoneIncident = tabletPage.locator('[data-mobile-incident-object]').first();
    const phoneIncidentId = await phoneIncident.getAttribute('data-mobile-incident-object');
    await phoneIncident.click();
    await tabletPage.locator('[data-mobile-domain-workspace="interfaces"] [data-mobile-object-detail]').waitFor();
    const originContext = await tabletPage.evaluate(() => {
      const query = new URLSearchParams(location.search);
      const detail = document.querySelector('[data-mobile-object-detail]');
      const back = detail?.querySelector('header button');
      return {
        section: query.get('section'),
        object: query.get('object'),
        risk: query.get('risk'),
        from: query.get('from'),
        evidenceAt: query.get('evidenceAt'),
        detailObject: detail?.getAttribute('data-mobile-object-detail') || '',
        detailRisk: detail?.getAttribute('data-investigation-risk') || '',
        returnRoute: detail?.getAttribute('data-mobile-return-route') || '',
        originEvidenceAt: detail?.getAttribute('data-mobile-pulse-evidence-at') || '',
        backLabel: back?.textContent?.trim() || '',
        detailText: detail?.textContent || '',
        device: document.querySelector('.panel-runtime-bar-mobile .panel-runtime-device b')?.textContent?.trim() || '',
        freshness: document.querySelector('.panel-runtime-bar-mobile .panel-runtime-device span')?.textContent?.trim() || '',
        evidenceMode: document.querySelector('[data-mobile-domain-workspace]')?.getAttribute('data-mobile-evidence-mode') || '',
        readonly: /只读/.test(detail?.textContent || ''),
        navigation: Array.from(document.querySelectorAll('.panel-task-navigation button')).map((node) => node.textContent?.trim() || ''),
      };
    });
    check(
      checks,
      'phone incident navigation preserves object, source route, evidence time, and truthful return label',
      originContext.section === 'interfaces' && originContext.object === phoneIncidentId &&
        originContext.risk === 'interfaces' && originContext.detailRisk === 'interfaces' &&
        originContext.detailObject === phoneIncidentId && originContext.from === 'overview' &&
        originContext.returnRoute === 'overview' && originContext.backLabel === '返回概览' &&
        originContext.detailText.includes('来自运行概览') &&
        overviewJourneyContext.device && originContext.device === overviewJourneyContext.device &&
        originContext.freshness.split('·').pop().trim() === overviewJourneyContext.freshness.split('·').pop().trim() &&
        originContext.evidenceMode === overviewJourneyContext.evidenceMode &&
        overviewJourneyContext.readonly && originContext.readonly &&
        JSON.stringify(originContext.navigation) === JSON.stringify(overviewJourneyContext.navigation) &&
        originContext.navigation.join('|') === '概览|网络|终端|日志' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(originContext.evidenceAt || '') &&
        originContext.originEvidenceAt === originContext.evidenceAt,
      { phoneIncidentId, overviewJourneyContext, originContext },
    );
    screenshots.push(await screenshot(tabletPage, 'mobile-overview-object-context.png', 'mobile-overview-object-context'));
    const directContextUrl = tabletPage.url();
    const directPage = await tabletContext.newPage();
    directPage.setDefaultTimeout(actionTimeout);
    directPage.on('pageerror', (error) => pageErrors.push('direct-object: ' + error.message));
    await directPage.setViewportSize({ width: 390, height: 844 });
    await directPage.goto(directContextUrl, { waitUntil: 'domcontentloaded' });
    await directPage.locator('[data-mobile-domain-workspace="interfaces"] [data-mobile-object-detail]').waitFor();
    await directPage.getByRole('button', { name: '返回概览' }).click();
    await directPage.locator('[data-mobile-overview-risk="interfaces"]').waitFor();
    const directReturn = await directPage.evaluate(() => ({
      section: new URLSearchParams(location.search).get('section'),
      object: new URLSearchParams(location.search).get('object'),
      risk: new URLSearchParams(location.search).get('risk'),
      from: new URLSearchParams(location.search).get('from'),
      evidenceAt: new URLSearchParams(location.search).get('evidenceAt'),
    }));
    check(
      checks,
      'direct object deep link returns to its declared source without leaving orphan context',
      directReturn.section === 'overview' && directReturn.object === null &&
        directReturn.risk === null && directReturn.from === null && directReturn.evidenceAt === null,
      directReturn,
    );
    await directPage.close();
    await tabletPage.getByRole('button', { name: '返回概览' }).click();
    await tabletPage.locator('[data-mobile-overview-risk="interfaces"]').waitFor();
    await tabletPage.goForward();
    await tabletPage.locator('[data-mobile-domain-workspace="interfaces"] [data-mobile-object-detail]').waitFor();
    const restoredContext = await tabletPage.evaluate(() => ({
      object: new URLSearchParams(location.search).get('object'),
      risk: new URLSearchParams(location.search).get('risk'),
      from: new URLSearchParams(location.search).get('from'),
      evidenceAt: new URLSearchParams(location.search).get('evidenceAt'),
      detailRisk: document.querySelector('[data-mobile-object-detail]')?.getAttribute('data-investigation-risk') || '',
      backLabel: document.querySelector('[data-mobile-object-detail] header button')?.textContent?.trim() || '',
    }));
    check(
      checks,
      'Back returns to overview and Forward restores the exact incident investigation context',
      restoredContext.object === phoneIncidentId && restoredContext.risk === 'interfaces' &&
        restoredContext.detailRisk === 'interfaces' && restoredContext.from === 'overview' &&
        restoredContext.evidenceAt === originContext.evidenceAt && restoredContext.backLabel === '返回概览',
      { originContext, restoredContext },
    );
    await tabletPage.goBack();
    await tabletPage.locator('[data-mobile-overview-risk="interfaces"]').waitFor();
    await tabletPage.setViewportSize({ width: 768, height: 1024 });
    await tabletPage.waitForFunction(() => innerWidth === 768 && innerHeight === 1024);
    mock.state.scenario = 'resource-full';
    const beforeResourceInvestigation = mock.state.snapshotCalls;
    await tabletPage.locator('.panel-runtime-actions button:first-of-type').click();
    await waitForCalls(mock.state, beforeResourceInvestigation, 'resource investigation overview');
    await waitForPhase(tabletPage, 'current');
    await tabletPage.locator('[data-mobile-overview-risk="resource"]').waitFor();
    const resourceInvestigationAction = tabletPage.locator('.mp-actions #trafficLoad');
    await resourceInvestigationAction.scrollIntoViewIfNeeded();
    await resourceInvestigationAction.click();
    await tabletPage.locator('[data-mobile-domain-workspace="trafficLoad"] [data-mobile-object-detail]').waitFor();
    const resourceInvestigationEntry = await tabletPage.evaluate(() => {
      const query = new URLSearchParams(location.search);
      const detail = document.querySelector('[data-mobile-domain-workspace="trafficLoad"] [data-mobile-object-detail]');
      return {
        url: location.href,
        section: query.get('section'),
        object: query.get('object'),
        risk: query.get('risk'),
        from: query.get('from'),
        evidenceAt: query.get('evidenceAt'),
        detailObject: detail?.getAttribute('data-mobile-object-detail') || '',
        detailRisk: detail?.getAttribute('data-investigation-risk') || '',
        originEvidenceAt: detail?.getAttribute('data-mobile-pulse-evidence-at') || '',
        heading: detail?.querySelector('.mdi-object-heading h2')?.textContent?.trim() || '',
        firstSectionText: (detail?.querySelector('.mdi-section')?.textContent || '').replace(/\s+/g, ' ').trim(),
        text: (detail?.textContent || '').replace(/\s+/g, ' ').trim(),
      };
    });
    screenshots.push(await screenshot(
      tabletPage,
      'tablet-resource-investigation-context-768.png',
      'tablet-resource-investigation-context-768'
    ));
    const resource768Geometry = await tabletPage.evaluate(() => {
      const root = document.querySelector('[data-mobile-domain-workspace="trafficLoad"]');
      const layout = root?.querySelector('.mdw-layout');
      const inspector = root?.querySelector('.mdw-inspector');
      const list = root?.querySelector('.mdw-list-pane');
      const bounds = (node) => {
        const rect = node?.getBoundingClientRect();
         return rect ? { left: Math.round(rect.left), top: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height), right: Math.round(rect.right), bottom: Math.round(rect.bottom) } : null;
      };
      return {
        layout: bounds(layout),
        inspector: bounds(inspector),
        list: bounds(list),
         listDisplay: list ? getComputedStyle(list).display : '',
         layoutDisplay: layout ? getComputedStyle(layout).display : '',
         flexDirection: layout ? getComputedStyle(layout).flexDirection : '',
         gridTemplateColumns: layout ? getComputedStyle(layout).gridTemplateColumns : '',
        overflow: document.documentElement.scrollWidth - innerWidth,
        mode: root?.getAttribute('data-mobile-domain-layout') || '',
      };
    });
    await tabletPage.goBack();
    await tabletPage.locator('[data-mobile-overview-risk="resource"]').waitFor();
    await tabletPage.waitForFunction(() => document.activeElement?.id === 'trafficLoad');
    const resourceBackFocus = await tabletPage.evaluate(() => document.activeElement?.id || '');
    await tabletPage.goForward();
    await tabletPage.locator('[data-mobile-domain-workspace="trafficLoad"] [data-mobile-object-detail]').waitFor();
    const resourceForwardUrl = tabletPage.url();
    await tabletPage.goBack();
    await tabletPage.locator('[data-mobile-overview-risk="resource"]').waitFor();
    check(
      checks,
      'resource investigation binds one stable object, risk, origin, evidence time and history focus',
      resourceInvestigationEntry.section === 'trafficLoad' &&
        Boolean(resourceInvestigationEntry.object) &&
        resourceInvestigationEntry.object === resourceInvestigationEntry.detailObject &&
        resourceInvestigationEntry.risk === 'resource' &&
        resourceInvestigationEntry.from === 'overview' &&
        Boolean(resourceInvestigationEntry.evidenceAt) &&
        resourceInvestigationEntry.evidenceAt === resourceInvestigationEntry.originEvidenceAt &&
        resourceInvestigationEntry.detailRisk === 'resource' &&
        resourceInvestigationEntry.heading === 'CPU' &&
        resourceInvestigationEntry.firstSectionText.includes('当前样本') &&
        /当前样本\s*96%/.test(resourceInvestigationEntry.firstSectionText) &&
        /策略阈值\s*85%/.test(resourceInvestigationEntry.firstSectionText) &&
        /变化范围\s*88%\s*[—-]\s*96%/.test(resourceInvestigationEntry.firstSectionText) &&
        /连续性\s*6\s*\/\s*6\s*个样本\s*·\s*25\s*秒/.test(resourceInvestigationEntry.firstSectionText) &&
        /采样来源\s*资源证据对象序列\s*cpu/.test(resourceInvestigationEntry.text) &&
        resourceInvestigationEntry.text.includes('只描述资源压力，不推断网络中断') &&
        resourceInvestigationEntry.text.includes('\u6765\u81ea\u8fd0\u884c\u6982\u89c8') &&
         resource768Geometry.mode === 'workbench' &&
         resource768Geometry.listDisplay === 'block' &&
         resource768Geometry.layout && resource768Geometry.list && resource768Geometry.inspector &&
         resource768Geometry.layoutDisplay === 'grid' &&
         resource768Geometry.gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length === 2 &&
         resource768Geometry.inspector.top <= resource768Geometry.list.top + 1 &&
         resource768Geometry.inspector.left >= resource768Geometry.list.right - 1 &&
         resource768Geometry.list.width > 240 &&
         resource768Geometry.inspector.width >= 420 &&
         resource768Geometry.list.left >= resource768Geometry.layout.left - 1 &&
         resource768Geometry.inspector.left >= resource768Geometry.layout.left - 1 &&
         resource768Geometry.overflow <= 1 &&
        resourceBackFocus === 'trafficLoad' &&
        resourceForwardUrl === resourceInvestigationEntry.url,
      { resourceInvestigationEntry, resource768Geometry, resourceBackFocus, resourceForwardUrl }
    );
    mock.state.scenario = '';
    const beforeTabletReset = mock.state.snapshotCalls;
    await tabletPage.locator('.panel-runtime-actions button[aria-label="立即刷新"]').click();
    await waitForCalls(mock.state, beforeTabletReset, 'tablet overview scenario reset');
    await waitForPhase(tabletPage, 'current');
    await tabletPage.locator('[data-mobile-overview-risk="none"]').waitFor();

    const taskDesktopContext = await openIsolatedContext({
      viewport: { width: 1366, height: 768 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    });
    const taskDesktopPage = await taskDesktopContext.newPage();
    taskDesktopPage.setDefaultTimeout(actionTimeout);
    taskDesktopPage.setDefaultNavigationTimeout(15000);
    taskDesktopPage.on('pageerror', (error) => pageErrors.push('task-desktop: ' + error.message));

    async function inspectOverviewTaskBoundary(targetPage, scenario, width, height = 900, options = {}) {
      mock.state.scenario = scenario;
      await targetPage.setViewportSize({ width, height });
      const target = new URL(mock.url);
      target.searchParams.set('section', 'overview');
      target.hash = '';
      const beforeSnapshot = mock.state.snapshotCalls;
      const targetSnapshot = targetPage.waitForResponse(
        (response) => new URL(response.url()).pathname === '/api/snapshot',
        { timeout: 12000 },
      );
      await targetPage.goto(target.toString(), { waitUntil: 'domcontentloaded' });
      await targetSnapshot;
      await waitForCalls(mock.state, beforeSnapshot, `${scenario || 'single'} overview task snapshot`, 12000);
      await waitForPhase(targetPage, 'current', 12000);
      if (scenario === 'comparison-multi') {
        await targetPage.waitForFunction(
          () => document.querySelectorAll('[data-overview-task-landmark="comparison"] button[id], [data-overview-task-landmark="comparison"] [data-overview-object-detail]').length >= 3,
          { timeout: 12000 },
        );
      }
      await targetPage.locator(width < 1200 ? '[data-mobile-overview]' : '[data-desktop-overview]').waitFor();
      if (Number.isFinite(options.workspaceWidth)) {
        await targetPage.locator('.mp-workspace').evaluate((node, workspaceWidth) => {
          node.style.boxSizing = 'content-box';
          node.style.width = `${workspaceWidth}px`;
        }, options.workspaceWidth);
        await targetPage.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      }
      const initialIncident = scenario ? await targetPage.evaluate(() => ({
        riskObject: document.querySelector('[data-overview-task-risk-object]')?.getAttribute('data-overview-task-risk-object') || '',
        selected: document.querySelector('[data-overview-task-risk-object][aria-current="true"]')?.getAttribute('data-overview-task-risk-object') || '',
        inspector: document.querySelector('[data-overview-task-inspector]')?.getAttribute('data-overview-task-inspector') || '',
      })) : { riskObject: '', selected: '', inspector: '' };
      if (initialIncident.riskObject) {
        await targetPage.locator('[data-overview-task-risk-object]').first().click();
        await targetPage.waitForFunction(() => Boolean(
          document.querySelector('[data-overview-task-risk-object][aria-current="true"]') &&
          document.querySelector('[data-overview-task-inspector]')
        ));
      }
      const result = await targetPage.evaluate(() => {
        const values = (selector, attribute) => [...document.querySelectorAll(selector)]
          .map((node) => node.getAttribute(attribute) || '')
          .filter(Boolean);
        const rect = (node) => {
          const bounds = node?.getBoundingClientRect();
          return bounds ? {
            top: Math.round(bounds.top),
            right: Math.round(bounds.right),
            bottom: Math.round(bounds.bottom),
            left: Math.round(bounds.left),
            width: Math.round(bounds.width),
            height: Math.round(bounds.height),
          } : null;
        };
        const root = document.querySelector('[data-mobile-overview], [data-desktop-overview]');
        const mobile = root?.hasAttribute('data-mobile-overview');
        const isVisible = (node) => {
          if (!node) return false;
          const style = getComputedStyle(node);
          const bounds = node.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && bounds.width > 0 && bounds.height > 0;
        };
        const firstVisible = (selector) => [...document.querySelectorAll(selector)].find(isVisible) || null;
        const currentEvidenceTimeOwnerCount = mobile
          ? [...document.querySelectorAll('[data-mobile-current-evidence-time-owner]')].filter(isVisible).length
          : null;
        const mobileFocusEvidenceTimeCount = mobile
          ? [...document.querySelectorAll('[data-mobile-focus-evidence-time]')].filter(isVisible).length
          : null;
        const runtimeToolbar = document.querySelector('[data-panel-runtime-toolbar]');
        const verdictSurface = firstVisible(mobile ? '.mp-status-bus' : '[data-desktop-status-bus]');
        const verdictPanel = firstVisible(mobile ? '.mp-command' : '.do-verdict');
        const proofSurface = firstVisible(mobile ? '.mp-proof' : '[data-desktop-status-bus]');
        const verdictTitle = firstVisible(mobile ? '.mp-command h1' : '.do-verdict h1');
        const taskSurface = document.querySelector(mobile
          ? '.mp-workspace'
          : root?.getAttribute('data-desktop-overview-risk') === 'none' ? '.legacy-main-grid' : '[data-desktop-object-list]');
         const signal = document.querySelector('[data-overview-task-landmark="signal"]');
         const currentRate = document.querySelector('[data-overview-task-landmark="current-rate"]');
        const investigation = document.querySelector('[data-overview-task-landmark="investigation"]');
        const firstRiskObject = document.querySelector('[data-overview-task-risk-object]');
        const inspector = document.querySelector('[data-overview-task-inspector]');
        const focusObject = document.querySelector('[data-overview-task-focus-object]');
        const routeProof = document.querySelector(mobile
          ? '[data-mobile-core-fact="route"]'
          : '[data-desktop-status-item="route"]');
        const comparison = document.querySelector('[data-overview-task-landmark="comparison"]');
        const fleetScope = document.querySelector('[data-overview-task-landmark="fleet-scope"]');
        const objectDetails = document.querySelector('[data-overview-task-landmark="object-details"]');
        const comparisonObjectRows = [...(comparison?.querySelectorAll(mobile ? 'button[id]' : '[data-overview-object-detail]') || [])];
        const fleetScopeRows = [...(fleetScope?.querySelectorAll('button[id]') || [])];
        const evidenceBoundary = document.querySelector('[data-overview-task-landmark="evidence-boundary"]');
        const primaryStack = document.querySelector(mobile ? '.mp-workspace-primary' : '[data-desktop-main-stack="signal-objects"]');
        const contextStack = document.querySelector(mobile ? '.mp-workspace-context' : '[data-desktop-main-stack="decisions-provenance"]');
        const workspace = document.querySelector(mobile ? '.mp-workspace' : '[data-desktop-normal-workspace], .do-main-grid');
        const patrolCanvas = mobile ? document.querySelector('.mp-patrol-canvas') : null;
        const normalWorkspace = document.querySelector('[data-desktop-normal-workspace]');
        const tabletSupport = focusObject?.closest('.mp-tablet-support');
        const tabletMasterDetail = document.querySelector('.mp-tablet-master-detail');
        const tabletSteady = document.querySelector('.mp-tablet-steady');
        const routeDossier = document.querySelector('.mp-route-dossier');
        const normalObjectFocus = document.querySelector('[data-tablet-normal-object-focus="secondary"]');
        const steadySupport = document.querySelector('.mp-tablet-steady-support');
        const tabletRelation = document.querySelector('[data-overview-task-landmark="relation-evidence"]');
        const tabletLeftColumn = document.querySelector('.mp-tablet-left-column');
        const tabletRightColumn = document.querySelector('.mp-tablet-right-column');
        const tabletRouteColumn = document.querySelector('.mp-tablet-route-column');
        const steadyDecisionRows = [...document.querySelectorAll('.mp-steady-decisions button[id]')];
        const rateCells = [...document.querySelectorAll('.mp-focus-signal-metric')];
        const chartSurface = document.querySelector(mobile ? '.mp-chart' : '.do-wan-chart');
        const chart = document.querySelector(mobile ? '.mp-chart svg' : '.do-wan-chart');
        const riskObjectOrder = values('[data-overview-task-risk-object]', 'data-overview-task-risk-object');
        const selectedRiskObject = document.querySelector('[data-overview-task-risk-object][aria-current="true"]');
        const focusAction = document.querySelector(mobile ? '.mp-focus-object button' : '.do-focus-object button');
        const investigationActionSelector = mobile ? '.mp-actions, [data-mobile-phone-next-step]' : '.do-task-actions';
        const investigationActionSurface = document.querySelector(investigationActionSelector);
        const investigationKicker = investigationActionSurface?.querySelector(mobile ? '.mp-section-kicker' : 'header small');
        const investigationTitle = investigationActionSurface?.querySelector('h2');
        const firstInvestigationAction = investigationActionSurface?.querySelector('button');
        const inspectorFirstFact = document.querySelector(mobile ? '.mp-inspector dl > div' : '.do-task-inspector dl > div');
        const inspectorAction = document.querySelector(mobile ? '.mp-inspector button' : '.do-task-inspector button');
        const firstObjectRow = mobile
          ? document.querySelector('[data-tablet-object-workspace="comparison"] [data-tablet-next-evidence-row="normal"]')
          : document.querySelector('[data-desktop-ledger="objects"] [data-desktop-ledger-row]');
        const normalTopBand = document.querySelector('[data-desktop-normal-top-band]');
        const normalDecisionBand = document.querySelector('[data-desktop-normal-decision-band]');
        const scenarioFocusNodes = [...document.querySelectorAll(mobile
          ? '.mp-scenario-focus[data-overview-task-focus]'
          : '[data-overview-task-landmark="scenario-focus"][data-overview-task-focus]')];
        const scenarioFocus = scenarioFocusNodes[0] || null;
        const decisionLedger = mobile
          ? document.querySelector('[data-overview-task-landmark="decision-ledger"]')
          : document.querySelector('[data-desktop-ledger="decisions"]');
        const decisionRows = [...(decisionLedger?.querySelectorAll(mobile ? '.mp-decision-ledger-row[id]' : '[data-desktop-ledger-row]') || [])];
        const firstScenarioItem = document.querySelector(mobile ? '.mp-scenario-focus-grid button' : '.do-task-focus-grid button');
        const navigationRect = document.querySelector('.panel-task-navigation')?.getBoundingClientRect();
        const bottomNavigation = Boolean(
          navigationRect && navigationRect.width >= innerWidth * 0.6 && navigationRect.height < innerHeight * 0.3
        );
        const viewportBottom = bottomNavigation && navigationRect ? navigationRect.top : innerHeight;
        const firstDecisionRowBounds = decisionRows[0]?.getBoundingClientRect();
        const decisionFirstRowTopWithinViewport = Boolean(
          firstDecisionRowBounds && firstDecisionRowBounds.top >= -1 && firstDecisionRowBounds.top <= viewportBottom + 0.01
        );
        const fullyInsideViewport = (node) => {
          if (!(node instanceof HTMLElement || node instanceof SVGElement)) return false;
          const bounds = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return style.display !== 'none' && style.visibility !== 'hidden' &&
            bounds.width > 0 && bounds.height > 0 && bounds.top >= 0 && bounds.bottom <= viewportBottom;
        };
        const visibleRatio = (node) => {
          if (!(node instanceof HTMLElement || node instanceof SVGElement)) return 0;
          const bounds = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden' || bounds.width <= 0 || bounds.height <= 0) return 0;
          const visible = Math.max(0, Math.min(bounds.bottom, viewportBottom) - Math.max(bounds.top, 0));
          return Math.round((visible / bounds.height) * 1000) / 1000;
        };
        const investigationActionNodes = [...(investigationActionSurface?.querySelectorAll('button[id]') || [])];
        const investigationActionRoutes = investigationActionNodes.map((node) => node.id);
        const investigationActionPriorities = investigationActionNodes
          .map((node) => node.getAttribute(mobile ? 'data-mobile-action-priority' : 'data-desktop-action-priority') || '')
          .filter(Boolean);
        const expectedInvestigationParent = mobile
          ? null
          : root?.getAttribute('data-desktop-overview-risk') === 'none' ? (normalWorkspace || contextStack) : taskSurface;
        const verdictBounds = verdictSurface?.getBoundingClientRect();
        const taskBounds = taskSurface?.getBoundingClientRect();
        const signalBounds = signal?.getBoundingClientRect();
        const tabletRouteColumnBounds = tabletRouteColumn?.getBoundingClientRect();
        const tabletRouteSignalBottomGap = tabletRouteColumnBounds && signalBounds
          ? Math.abs(tabletRouteColumnBounds.bottom - signalBounds.bottom)
          : null;
        const primaryBounds = primaryStack?.getBoundingClientRect();
        const contextBounds = contextStack?.getBoundingClientRect();
        const taskColumnWidth = (primaryBounds?.width || 0) + (contextBounds?.width || 0);
        const chartPeakText = document.querySelector(mobile ? '.mp-chart-scale b' : '[data-chart-peak-label]')?.textContent?.trim() || '';
        const chartLegendText = document.querySelector(mobile ? '.mp-traffic footer > span:last-of-type' : '.do-wan-legend span:last-child')?.textContent?.trim() || '';
        const chartDataUnit = chart?.getAttribute('data-unit') || '';
        const chartUnit = (text) => text.match(/(?:[KMGT]?bps|bit\/s)/i)?.[0] || '';
        const px = (value) => Math.round(Number.parseFloat(value || '0') * 10) / 10;
        const groupedSurface = (node) => {
          if (!(node instanceof HTMLElement)) return null;
          const bounds = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          const border = ['Top', 'Right', 'Bottom', 'Left'].reduce((sum, side) => (
            sum + px(style[`border${side}Width`])
          ), 0);
          const radius = Math.max(
            px(style.borderTopLeftRadius),
            px(style.borderTopRightRadius),
            px(style.borderBottomRightRadius),
            px(style.borderBottomLeftRadius),
          );
          return bounds.width > 0 && bounds.height > 0 && border > 0 && radius > 0
            ? { className: node.className, border, radius, rect: rect(node) }
            : null;
        };
        const contentWidth = (node) => {
          const bounds = node?.getBoundingClientRect();
          if (!bounds) return null;
          const style = getComputedStyle(node);
          return Math.round(bounds.width - px(style.paddingLeft) - px(style.paddingRight) - px(style.borderLeftWidth) - px(style.borderRightWidth));
        };
        const orientation = (nodes) => {
          const boxes = nodes.map((node) => node?.getBoundingClientRect()).filter(Boolean);
          if (boxes.length < 2) return 'none';
          const xSpread = Math.max(...boxes.map((box) => box.left)) - Math.min(...boxes.map((box) => box.left));
          const ySpread = Math.max(...boxes.map((box) => box.top)) - Math.min(...boxes.map((box) => box.top));
          return ySpread >= xSpread ? 'vertical' : 'horizontal';
        };
        const taskParent = (node) => {
          if (!node) return '';
          if (primaryStack?.contains(node)) return 'primary';
          if (contextStack?.contains(node)) return 'context';
          return 'outside';
        };
        const landmarkOrder = (stack) => [...(stack?.querySelectorAll('[data-overview-task-landmark]') || [])]
          .map((node) => node.getAttribute('data-overview-task-landmark') || '')
          .filter(Boolean);
        const landmarkCount = (name) => document.querySelectorAll(`[data-overview-task-landmark="${name}"]`).length;
        const trailingSpace = (stack) => {
          const bounds = stack?.getBoundingClientRect();
          if (!bounds) return null;
          const bottoms = [...stack.children]
            .map((node) => node.getBoundingClientRect())
            .filter((child) => child.width > 0 && child.height > 0)
            .map((child) => child.bottom);
          return bottoms.length ? Math.round(bounds.bottom - Math.max(...bottoms)) : Math.round(bounds.height);
        };
        const unionRect = (nodes) => {
          const boxes = nodes.map((node) => node?.getBoundingClientRect()).filter((box) => box && box.width > 0 && box.height > 0);
          if (!boxes.length) return null;
          const left = Math.min(...boxes.map((box) => box.left));
          const right = Math.max(...boxes.map((box) => box.right));
          const top = Math.min(...boxes.map((box) => box.top));
          const bottom = Math.max(...boxes.map((box) => box.bottom));
          return {
            left: Math.round(left),
            right: Math.round(right),
            top: Math.round(top),
            bottom: Math.round(bottom),
            width: Math.round(right - left),
            height: Math.round(bottom - top),
          };
        };
        const supportRect = rect(steadySupport);
        const steadySupportVisualRect = supportRect && supportRect.width > 0 && supportRect.height > 0
          ? supportRect
          : unionRect([investigation, evidenceBoundary]);
        return {
          surface: mobile ? 'mobile' : 'desktop',
          scenario: root?.getAttribute('data-mobile-overview-scenario') || root?.getAttribute('data-desktop-overview-scenario') || '',
          risk: root?.getAttribute('data-mobile-overview-risk') || root?.getAttribute('data-desktop-overview-risk') || '',
          riskPriority: root?.getAttribute('data-mobile-risk-priority') || '',
          riskPriorityReason: root?.getAttribute('data-mobile-risk-priority-reason') || '',
          contract: root?.getAttribute('data-overview-task-contract') || '',
          overviewRootCount: document.querySelectorAll('[data-mobile-overview], [data-desktop-overview]').length,
          landmarks: [...new Set(values('[data-overview-task-landmark]', 'data-overview-task-landmark'))].sort(),
           focus: scenarioFocus?.getAttribute('data-overview-task-focus') || document.querySelector('[data-overview-task-focus]')?.getAttribute('data-overview-task-focus') || '',
           scenarioFocusKind: scenarioFocus?.getAttribute('data-overview-task-focus') || '',
           scenarioFocusCount: scenarioFocusNodes.length,
          focusObject: document.querySelector('[data-overview-task-focus-object]')?.getAttribute('data-overview-task-focus-object') || '',
          focusObjectCount: document.querySelectorAll('[data-overview-task-focus-object]').length,
          focusPlacement: tabletSupport ? 'tablet-support' : focusObject?.parentElement === workspace ? 'workspace-lead' : taskParent(focusObject),
          riskObjects: [...riskObjectOrder].sort(),
          riskObjectOrder,
          selectedRiskObject: selectedRiskObject?.getAttribute('data-overview-task-risk-object') || '',
          inspector: document.querySelector('[data-overview-task-inspector]')?.getAttribute('data-overview-task-inspector') || '',
          riskObjectSurfaceCount: landmarkCount('risk-objects'),
          selectedInspectorCount: landmarkCount('selected-inspector'),
          actions: [...investigationActionRoutes].sort(),
          investigationSurfaceCount: document.querySelectorAll('[data-overview-task-landmark="investigation"]').length,
          investigationActionSurfaceCount: document.querySelectorAll(investigationActionSelector).length,
          investigationDirectChild: mobile ? null : investigationActionSurface?.parentElement === expectedInvestigationParent,
          investigationNestedInNormalFocusBand: mobile ? null : Boolean(
            investigationActionSurface && normalTopBand?.classList.contains('has-focus-task') &&
            investigationActionSurface.closest('[data-desktop-normal-top-band].has-focus-task') === normalTopBand
          ),
          investigationActionRouteCount: investigationActionRoutes.length,
          investigationUniqueActionRouteCount: new Set(investigationActionRoutes).size,
          investigationActionPriorities,
          investigationPrimaryActionCount: investigationActionPriorities.filter((value) => value === 'primary').length,
          investigationSecondaryActionCount: investigationActionPriorities.filter((value) => value === 'secondary').length,
          investigationKicker: investigationKicker?.textContent?.trim() || '',
          investigationTitle: investigationTitle?.textContent?.trim() || '',
          firstInvestigationActionId: firstInvestigationAction?.id || '',
          firstInvestigationActionText: firstInvestigationAction?.textContent?.replace(/\s+/g, ' ').trim() || firstInvestigationAction?.getAttribute('aria-label') || '',
          investigationRisk: investigationActionSurface?.getAttribute('data-mobile-action-risk') || '',
          verdictIconClass: verdictPanel?.querySelector(mobile ? '.mp-command-icon svg' : '.do-verdict-icon svg')?.getAttribute('class') || '',
          verdictAccent: verdictPanel ? getComputedStyle(verdictPanel, '::before').backgroundColor : '',
          maxTouchPoints: navigator.maxTouchPoints,
          devicePixelRatio,
          mobileUserAgent: /Mobile|Android/i.test(navigator.userAgent),
          pointerFine: matchMedia('(pointer: fine)').matches,
          hoverCapable: matchMedia('(hover: hover)').matches,
          proofKeys: values(
            mobile ? '[data-mobile-core-fact]' : '[data-desktop-status-item]',
            mobile ? 'data-mobile-core-fact' : 'data-desktop-status-item',
          ),
          proofFacts: Object.fromEntries([...(document.querySelectorAll(
            mobile ? '[data-mobile-core-fact]' : '[data-desktop-status-item]'
          ) || [])].map((node) => [
            node.getAttribute(mobile ? 'data-mobile-core-fact' : 'data-desktop-status-item') || '',
            node.querySelector('b')?.textContent?.trim() || '',
          ])),
          routeProof: {
            label: routeProof?.querySelector(mobile ? 'small' : 'dt')?.textContent?.trim() || '',
            value: routeProof?.querySelector('b')?.textContent?.trim() || '',
            note: routeProof?.querySelector(mobile ? 'em' : 'dd small')?.textContent?.trim() || '',
          },
          currentEvidenceTimeOwnerCount,
          mobileFocusEvidenceTimeCount,
          signalTitle: signal?.querySelector('h2')?.textContent?.trim() || '',
          signalText: signal?.textContent?.replace(/\s+/g, ' ').trim() || '',
          signalCurrentText: signal?.querySelector('[data-mobile-traffic-current]')?.textContent?.replace(/\s+/g, ' ').trim() || '',
          signalPeakText: signal?.querySelector('[data-mobile-traffic-peak]')?.textContent?.replace(/\s+/g, ' ').trim() || '',
          signalWindowText: signal?.getAttribute('data-mobile-traffic-window') || '',
          currentRateOwnerCount: document.querySelectorAll('[data-mobile-traffic-current]').length,
          currentRateOwnerText: document.querySelector('[data-mobile-traffic-current]')?.textContent?.replace(/\s+/g, ' ').trim() || '',
          focusAccessibleName: focusObject?.querySelector('button')?.getAttribute('aria-label')?.replace(/\s+/g, ' ').trim() || '',
          focusLabel: focusObject?.querySelector(mobile ? '.mp-focus-meta small' : 'header small')?.textContent?.trim() || '',
          focusTitle: focusObject?.querySelector(mobile ? '.mp-focus-copy > b' : 'h2')?.textContent?.trim() || '',
          focusName: focusObject?.querySelector(mobile ? 'code' : '.do-focus-object-name > b')?.textContent?.trim() || '',
          comparisonTitle: comparison?.querySelector('h2')?.textContent?.trim() || '',
          comparisonLandmark: comparison?.getAttribute('data-overview-task-landmark') || '',
          comparisonLandmarkCount: document.querySelectorAll('[data-overview-task-landmark="comparison"]').length,
          comparisonParent: taskParent(comparison),
          comparisonRows: comparison?.querySelectorAll(mobile ? 'button' : '[data-desktop-ledger-row]').length || 0,
          comparisonObjects: comparisonObjectRows.map((row) => {
            const name = row.querySelector(mobile ? 'b' : 'button b');
            return {
              id: mobile ? row.id : row.getAttribute('data-overview-object-detail') || '',
              name: name?.textContent?.trim() || '',
              text: row.textContent?.replace(/\s+/g, ' ').trim() || '',
              clipped: name instanceof HTMLElement && (name.scrollWidth > name.clientWidth + 1 || name.scrollHeight > name.clientHeight + 1),
            };
          }),
          fleetScopeTitle: fleetScope?.querySelector('h2')?.textContent?.trim() || '',
          fleetScopeCount: document.querySelectorAll('[data-overview-task-landmark="fleet-scope"]').length,
          fleetScopeInFirstViewport: fullyInsideViewport(fleetScope),
          fleetScopeObjects: fleetScopeRows.map((row) => ({
            id: row.id,
            text: row.textContent?.replace(/\s+/g, ' ').trim() || '',
            routeTone: row.getAttribute('data-object-tone') || '',
            inFirstViewport: fullyInsideViewport(row),
          })),
          objectDetailsTitle: objectDetails?.querySelector('h2')?.textContent?.trim() || '',
          objectDetailsLandmark: objectDetails?.getAttribute('data-overview-task-landmark') || '',
          objectDetailsLandmarkCount: document.querySelectorAll('[data-overview-task-landmark="object-details"]').length,
          objectDetailRows: values('[data-overview-object-detail]', 'data-overview-object-detail'),
          evidenceBoundaryParent: steadySupport?.contains(evidenceBoundary) ? 'steady-support' : taskParent(evidenceBoundary),
          coreLandmarkCounts: {
            signal: landmarkCount('signal'),
            comparison: landmarkCount('comparison'),
            focus: landmarkCount('focus'),
            investigation: landmarkCount('investigation'),
            evidenceBoundary: landmarkCount('evidence-boundary'),
          },
          investigationParent: tabletLeftColumn?.contains(investigation)
            ? 'tablet-left-column'
            : steadySupport?.contains(investigation) ? 'steady-support' : taskParent(investigation),
          primaryLandmarks: landmarkOrder(primaryStack),
          contextLandmarks: landmarkOrder(contextStack),
          primaryTrailingSpace: trailingSpace(primaryStack),
          contextTrailingSpace: trailingSpace(contextStack),
          normalTopBandCount: document.querySelectorAll('[data-desktop-normal-top-band]').length,
          normalDecisionBandCount: document.querySelectorAll('[data-desktop-normal-decision-band]').length,
          normalStackCount: document.querySelectorAll('[data-desktop-main-stack]').length,
           decisionParent: normalDecisionBand?.contains(decisionLedger) ? 'decision-band' : taskParent(decisionLedger),
           decisionRowCount: decisionRows.length,
           decisionRowsInFirstViewport: decisionRows.filter(fullyInsideViewport).length,
           decisionFirstRowTopWithinViewport,
           decisionFirstRowTop: firstDecisionRowBounds ? Number(firstDecisionRowBounds.top.toFixed(3)) : null,
           decisionViewportBottom: Number(viewportBottom.toFixed(3)),
           decisionOrientation: orientation(decisionRows),
           runtimeToolbar: runtimeToolbar?.getAttribute('data-panel-runtime-toolbar') || '',
           runtimeToolbarRect: rect(runtimeToolbar),
           runtimeToolbarComputed: runtimeToolbar ? (() => {
             const style = getComputedStyle(runtimeToolbar);
             return {
               display: style.display,
               gridTemplateColumns: style.gridTemplateColumns,
               gridTemplateRows: style.gridTemplateRows,
               gridAutoFlow: style.gridAutoFlow,
               gridAutoRows: style.gridAutoRows,
               rowGap: style.rowGap,
               childCount: runtimeToolbar.children.length,
               children: [...runtimeToolbar.children].map((node) => ({
                 tag: node.tagName,
                 className: node.className,
                 gridColumn: getComputedStyle(node).gridColumn,
                 gridRow: getComputedStyle(node).gridRow,
                 rect: rect(node),
               })),
               minHeight: style.minHeight,
               height: style.height,
               paddingTop: style.paddingTop,
               paddingBottom: style.paddingBottom,
             };
           })() : null,
           runtimeDeviceRect: rect(runtimeToolbar?.querySelector('.panel-runtime-device')),
           runtimeModeRect: rect(runtimeToolbar?.querySelector('.panel-runtime-mode')),
           runtimeActionsRect: rect(runtimeToolbar?.querySelector('.panel-runtime-actions')),
           panelAppRect: rect(document.querySelector('.panel-app')),
           overviewRootRect: rect(root),
           desktopShellRect: rect(document.querySelector('.do-shell')),
           runtimeDevice: runtimeToolbar?.querySelector('.panel-runtime-device')?.textContent?.replace(/\s+/g, ' ').trim() || '',
          runtimePhase: (runtimeToolbar?.querySelector('.panel-runtime-phase span') || runtimeToolbar?.querySelector('.panel-runtime-device > span'))
            ?.textContent?.replace(/\s+/g, ' ').trim() || '',
          runtimeActions: [...(runtimeToolbar?.querySelectorAll('.panel-runtime-actions button') || [])]
            .map((node) => node.getAttribute('aria-label') || '')
            .filter(Boolean),
          verdictRect: rect(verdictSurface),
          proofRect: rect(proofSurface),
          taskRect: rect(taskSurface),
           signalRect: rect(signal),
           currentRateRect: rect(currentRate),
          investigationRect: rect(investigation),
          firstRiskObjectRect: rect(firstRiskObject),
          inspectorRect: rect(inspector),
          focusObjectRect: rect(focusObject),
          focusSignalShare: focusObject?.getBoundingClientRect() && signal?.getBoundingClientRect()
            ? Math.round((focusObject.getBoundingClientRect().width / (focusObject.getBoundingClientRect().width + signal.getBoundingClientRect().width)) * 1000) / 1000
            : null,
          comparisonRect: rect(comparison),
          objectDetailsRect: rect(objectDetails),
          normalTopBandRect: rect(normalTopBand),
          decisionRect: rect(decisionLedger),
          decisionRowRects: decisionRows.map(rect),
          evidenceBoundaryRect: rect(evidenceBoundary),
          primaryRect: rect(primaryStack),
          contextRect: rect(contextStack),
          primaryShare: taskColumnWidth > 0 ? Math.round((primaryBounds.width / taskColumnWidth) * 1000) / 1000 : null,
          workspaceRect: rect(workspace),
          workspaceContentWidth: contentWidth(workspace),
          mobileGroupedSurfaces: mobile
            ? [patrolCanvas, verdictSurface, workspace].map(groupedSurface).filter(Boolean)
            : [],
          tabletSteadyCount: document.querySelectorAll('.mp-tablet-steady').length,
          tabletRelationCount: document.querySelectorAll('[data-overview-task-landmark="relation-evidence"]').length,
          tabletSteadyRect: rect(tabletSteady),
          routeDossierCount: document.querySelectorAll('.mp-route-dossier').length,
          routeDossierRect: rect(routeDossier),
           routeDossierFacts: Object.fromEntries([...(routeDossier?.querySelectorAll('dl > div') || [])].map((row) => [
            row.querySelector('dt')?.textContent?.trim() || '',
            row.querySelector('dd')?.textContent?.replace(/\s+/g, ' ').trim() || '',
           ])),
           tabletRouteColumnRect: rect(tabletRouteColumn),
           tabletRouteSignalBottomGap: tabletRouteSignalBottomGap == null ? null : Number(tabletRouteSignalBottomGap.toFixed(3)),
          steadyDecisionCount: steadyDecisionRows.length,
          steadyDecisionIds: steadyDecisionRows.map((row) => row.id),
          steadyDecisionText: steadyDecisionRows.map((row) => row.textContent?.replace(/\s+/g, ' ').trim() || ''),
          steadyDecisionOrientation: orientation(steadyDecisionRows),
          rateCells: rateCells.map((cell) => {
            const value = cell.querySelector('b');
            const valueRect = value?.getBoundingClientRect();
            const valueRange = value ? document.createRange() : null;
            valueRange?.selectNodeContents(value);
            const lineCount = valueRange
              ? new Set([...valueRange.getClientRects()].map((line) => Math.round(line.top))).size
              : 0;
            return {
              text: value?.textContent?.replace(/\s+/g, ' ').trim() || '',
              rect: rect(cell),
              valueRect: rect(value),
              lineCount,
              wrapped: lineCount > 1,
            };
          }),
          chartSurfaceRect: rect(chartSurface),
          steadySupportRect: steadySupportVisualRect,
          tabletMasterDetailRect: rect(tabletMasterDetail),
          tabletMasterDetailColumns: tabletMasterDetail ? getComputedStyle(tabletMasterDetail).gridTemplateColumns : '',
          incidentObjectRect: rect(document.querySelector('.mp-tablet-master-detail .mp-incident')),
          chartRect: rect(chart),
          normalObjectFocusRect: rect(normalObjectFocus),
          tabletRelationRect: rect(tabletRelation),
          chartPeakText,
          chartLegendText,
          chartDataUnit,
          chartPeakUnit: chartUnit(chartPeakText),
          chartLegendUnit: chartUnit(chartLegendText),
          verdictTitleText: verdictTitle?.textContent?.replace(/\s+/g, ' ').trim() || '',
          verdictSummaryText: verdictPanel?.querySelector('p')?.textContent?.replace(/\s+/g, ' ').trim() || '',
          focusActionRect: rect(focusAction),
          firstInvestigationActionRect: rect(firstInvestigationAction),
          inspectorFirstFactRect: rect(inspectorFirstFact),
          inspectorActionRect: rect(inspectorAction),
          firstObjectRowRect: rect(firstObjectRow),
          firstScenarioItemRect: rect(firstScenarioItem),
          viewportBottom: Math.round(viewportBottom),
          verdictInFirstViewport: fullyInsideViewport(verdictSurface),
          chartInFirstViewport: fullyInsideViewport(chart),
          focusActionInFirstViewport: fullyInsideViewport(focusAction),
          firstInvestigationActionInFirstViewport: fullyInsideViewport(firstInvestigationAction),
          evidenceBoundaryInFirstViewport: fullyInsideViewport(evidenceBoundary),
          firstRiskObjectInFirstViewport: fullyInsideViewport(firstRiskObject),
          selectedRiskObjectInFirstViewport: fullyInsideViewport(selectedRiskObject),
          inspectorFirstFactInFirstViewport: fullyInsideViewport(inspectorFirstFact),
          inspectorActionInFirstViewport: fullyInsideViewport(inspectorAction),
          firstObjectRowInFirstViewport: fullyInsideViewport(firstObjectRow),
          firstObjectRowVisibleRatio: visibleRatio(firstObjectRow),
          firstScenarioItemInFirstViewport: fullyInsideViewport(firstScenarioItem),
          verdictTitlePx: verdictTitle ? px(getComputedStyle(verdictTitle).fontSize) : 0,
          verdictRadiusPx: verdictSurface ? px(getComputedStyle(verdictSurface).borderTopLeftRadius) : 0,
          verdictBorderPx: verdictSurface ? px(getComputedStyle(verdictSurface).borderTopWidth) : 0,
          statusToTaskGap: verdictBounds && taskBounds ? Math.round(taskBounds.top - verdictBounds.bottom) : null,
          signalTaskOffset: signalBounds && taskBounds ? Math.round(signalBounds.top - taskBounds.top) : null,
          verdictBackground: verdictPanel ? getComputedStyle(verdictPanel).backgroundColor : '',
          statusBackground: verdictSurface ? getComputedStyle(verdictSurface).backgroundColor : '',
          proofBackground: proofSurface ? getComputedStyle(proofSurface).backgroundColor : '',
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      });
      return {
        ...result,
        initialRiskObject: initialIncident.riskObject,
        initialSelectedRiskObject: initialIncident.selected,
        initialInspector: initialIncident.inspector,
      };
    }

    function includesEvery(actual, expected) {
      return expected.every((value) => actual.includes(value));
    }

    const normal390 = await inspectOverviewTaskBoundary(taskDesktopPage, '', 390, 844);
    await taskDesktopPage.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    screenshots.push(await screenshot(taskDesktopPage, 'overview-normal-task-390.png', 'overview-normal-task-390'));
    const normal375 = await inspectOverviewTaskBoundary(taskDesktopPage, '', 375, 667);
    await taskDesktopPage.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    screenshots.push(await screenshot(taskDesktopPage, 'overview-normal-task-375.png', 'overview-normal-task-375'));
    const normal768 = await inspectOverviewTaskBoundary(taskDesktopPage, '', 768, 1024);
    const normal619 = await inspectOverviewTaskBoundary(taskDesktopPage, '', 768, 1024, { workspaceWidth: 619 });
    const normal620 = await inspectOverviewTaskBoundary(taskDesktopPage, '', 768, 1024, { workspaceWidth: 620 });
    const normal844 = await inspectOverviewTaskBoundary(taskDesktopPage, '', 844, 1024);
    screenshots.push(await screenshot(taskDesktopPage, 'overview-normal-task-844.png', 'overview-normal-task-844'));
    const normal899 = await inspectOverviewTaskBoundary(taskDesktopPage, '', 899, 1024);
    const normal900 = await inspectOverviewTaskBoundary(taskDesktopPage, '', 900, 1024);
    const normal1199 = await inspectOverviewTaskBoundary(taskDesktopPage, '', 1199);
    screenshots.push(await screenshot(taskDesktopPage, 'overview-normal-task-1199.png', 'overview-normal-task-1199'));
    const normal1200 = await inspectOverviewTaskBoundary(taskDesktopPage, '', 1200);
    screenshots.push(await screenshot(taskDesktopPage, 'overview-normal-task-1200.png', 'overview-normal-task-1200'));
    check(
      checks,
      'normal current mobile and desktop verdicts lead with verified management evidence and preserve the external business boundary',
      [normal390, normal1199].every((item) => (
        item.verdictTitleText === '当前管理证据已核实' &&
        !/默认路由|采集通道|WAN/.test(item.verdictSummaryText) &&
        /未探测外部业务|外部业务未探测/.test(item.verdictSummaryText) &&
        item.verdictSummaryText.includes('不据此声明互联网可用') &&
        !item.verdictTitleText.includes('默认路由已核实')
      )),
      { normal390, normal1199 },
    );
    check(
      checks,
      '390px normal Overview uses a full-bleed continuous patrol ledger with no rounded or bordered outer group',
      normal390.mobileGroupedSurfaces.length === 0 && normal390.statusToTaskGap === 0,
      normal390,
    );
    check(
      checks,
      '390/375 normal phone keeps WAN signal before one readable decision ledger with three touch rows and no horizontal overflow',
      [normal390, normal375].every((item) => (
        item.surface === 'mobile' &&
        item.decisionParent === 'primary' &&
        item.decisionRowCount === 3 &&
        item.decisionOrientation === 'vertical' &&
        item.decisionRect &&
        item.decisionRect.width >= item.workspaceContentWidth - 2 &&
        item.decisionRowRects.every((row) => row.width >= item.workspaceContentWidth - 5 && row.height >= 58) &&
        item.decisionRect.top >= item.focusObjectRect.bottom - 1 &&
        item.signalRect &&
        item.decisionRect.top >= item.signalRect.bottom - 1 &&
        item.decisionFirstRowTopWithinViewport &&
        item.overflow <= 1
      )),
      { normal390, normal375 },
    );
    const normalPhoneDecisionFirst = [normal390, normal375].every((item) => (
        item.surface === 'mobile' &&
        item.investigationActionRouteCount === 1 &&
        item.investigationPrimaryActionCount === 1 &&
        item.investigationSecondaryActionCount === 0 &&
        item.firstInvestigationActionId === 'lineStatus' &&
        item.decisionRect && item.firstInvestigationActionRect &&
        item.currentRateRect && item.signalRect &&
        item.firstInvestigationActionRect.top >= item.currentRateRect.bottom - 1 &&
        item.firstInvestigationActionRect.bottom <= item.signalRect.top + 1 &&
        item.signalRect.bottom <= item.decisionRect.top + 1 &&
        item.firstInvestigationActionRect.height >= 44
      ));
    const normalLargeFirst = [normal768, normal844, normal899, normal900, normal1199, normal1200].every((item) => (
        item.investigationActionRouteCount >= 1 &&
        item.investigationPrimaryActionCount === 1 &&
        item.investigationSecondaryActionCount === item.investigationActionRouteCount - 1 &&
        item.investigationActionPriorities[0] === 'primary'
      ));
    check(
      checks,
      'normal patrol actions expose one primary task after current phone rates and before WAN history, while preserving desktop/tablet first-scan follow-ups',
      normalPhoneDecisionFirst && normalLargeFirst,
      { normalPhoneDecisionFirst, normalLargeFirst, normal390, normal375, normal768, normal844, normal899, normal900, normal1199, normal1200 },
    );
    check(
      checks,
      'normal phone current rate owner and signal peak/window remain visible at 375/390',
      [normal390, normal375].every((item) => (
        item.surface === 'mobile' &&
        item.signalRect && item.signalRect.width >= item.workspaceContentWidth - 2 &&
        item.signalRect.height > 0 &&
        item.currentRateOwnerCount === 1 &&
        item.currentRateOwnerText.includes('下载') &&
        item.currentRateOwnerText.includes('上传') &&
        item.focusAccessibleName.includes('下载') &&
        item.focusAccessibleName.includes('上传') &&
        Array.from(item.currentRateOwnerText.matchAll(/\d+(?:\.\d+)?\s*(?:[KMGT]?bps)/gi), (match) => match[0])
          .every((rate) => item.focusAccessibleName.includes(rate)) &&
        item.signalPeakText.includes('窗口峰值') &&
        item.signalWindowText.includes('点')
      )),
      { normal390, normal375 },
    );
    check(
      checks,
      '390/375 narrow current evidence has one visible time owner and no repeated focus time',
      [normal390, normal375].every((item) => (
        item.surface === 'mobile' &&
        item.currentEvidenceTimeOwnerCount === 1 &&
        item.mobileFocusEvidenceTimeCount === 0
      )),
      { normal390, normal375 },
    );
    check(
      checks,
      'normal tablet Focus-Signal workbench reflows at actual 619/620px content capacity without duplicate task DOM',
      Boolean(
        normal619.workspaceContentWidth === 619 && normal620.workspaceContentWidth === 620 &&
        normal619.tabletSteadyRect && normal620.tabletSteadyRect &&
        normal619.routeDossierRect && normal620.routeDossierRect && normal619.signalRect && normal620.signalRect &&
        normal619.signalRect.top >= normal619.routeDossierRect.bottom - 1 &&
        Math.abs(normal620.routeDossierRect.top - normal620.signalRect.top) <= 1 &&
        normal620.routeDossierRect.width >= 220 && normal620.signalRect.width >= 340 &&
        [normal619, normal620].every((item) => (
          item.overviewRootCount === 1 && item.tabletSteadyCount === 1 && item.routeDossierCount === 1 &&
          item.focusObjectCount === 1 && item.coreLandmarkCounts.signal === 1 &&
          item.coreLandmarkCounts.comparison === 0 && item.coreLandmarkCounts.focus === 1 &&
          item.coreLandmarkCounts.investigation === 1 && item.coreLandmarkCounts.evidenceBoundary === 1 &&
          item.evidenceBoundaryParent === 'steady-support' && item.overflow <= 1
        ))
      ),
      { normal619, normal620 },
    );
    check(
      checks,
      '768/844/899/900/1199 current normal Overview keeps one relation evidence owner in the tablet workbench',
      [normal768, normal844, normal899, normal900, normal1199].every((item) => (
        item.surface === 'mobile' && item.tabletSteadyCount === 1 && item.routeDossierCount === 1 &&
        item.tabletRelationCount === 1 && item.routeDossierRect && item.signalRect && item.normalObjectFocusRect &&
        item.tabletRelationRect && item.steadySupportRect && item.workspaceRect &&
        Math.abs(item.routeDossierRect.top - item.signalRect.top) <= 1 &&
        item.signalRect.width > item.routeDossierRect.width &&
        item.steadySupportRect.width >= item.workspaceRect.width - 2 &&
        item.normalObjectFocusRect.top >= Math.max(item.routeDossierRect.bottom, item.signalRect.bottom) - 1 &&
        item.normalObjectFocusRect.bottom <= item.evidenceBoundaryRect.top + 1 &&
        item.tabletRelationRect.top >= item.normalObjectFocusRect.bottom - 1 &&
        item.tabletRelationRect.bottom <= item.evidenceBoundaryRect.top + 1 &&
        item.routeDossierFacts['路由表'] === 'main' &&
        item.routeDossierFacts['网关'] === 'pppoe-wan1' &&
        item.routeDossierFacts.distance === '1' && item.routeDossierFacts['活动候选'] === '1 条' &&
        item.evidenceBoundaryParent === 'steady-support' &&
        item.chartSurfaceRect && item.chartSurfaceRect.width >= 340 && item.chartSurfaceRect.height >= 80 &&
        item.chartRect && item.chartRect.width >= 260 && item.chartRect.height >= 56 &&
        item.taskRect && item.taskRect.top >= 0 && item.overflow <= 1
      )) && normal390.tabletSteadyCount === 0 && normal1200.tabletSteadyCount === 0,
      { normal390, normal768, normal844, normal899, normal900, normal1199, normal1200 },
    );
    check(
      checks,
      '768/844/1199 current normal route column owns novel secondary decisions without Proof replay',
      [normal768, normal844, normal1199].every((item) => (
        item.tabletRouteColumnRect && item.routeDossierRect && item.signalRect &&
        item.steadyDecisionCount === 3 &&
        item.steadyDecisionIds.join('|') === 'decision-interfaces|decision-resource|decision-connections' &&
        item.steadyDecisionText.join(' ').includes('接口') &&
        item.steadyDecisionText.join(' ').includes('CPU') &&
        item.steadyDecisionText.join(' ').includes('连接') &&
        !item.steadyDecisionText.join(' ').includes('默认路由') &&
        !item.steadyDecisionText.join(' ').includes('采集通道') &&
         item.tabletRouteSignalBottomGap != null && Math.round(item.tabletRouteSignalBottomGap) <= 81 &&
        item.overflow <= 1
      )),
      { normal768, normal844, normal1199 },
    );
    check(
      checks,
      '390 current route owns current values before the full-width WAN history signal',
      [normal390].every((item) => (
        item.surface === 'mobile' && item.rateCells.length === 2 &&
        item.rateCells.every((cell) => cell.text && !cell.wrapped) &&
        item.chartSurfaceRect && item.chartRect && item.workspaceContentWidth && item.focusObjectRect && item.proofRect &&
        item.currentRateRect && item.firstInvestigationActionRect && item.signalRect &&
        item.chartSurfaceRect.width >= item.workspaceContentWidth - 48 && item.chartSurfaceRect.height >= 84 &&
        item.chartRect.width >= item.chartSurfaceRect.width * 0.7 && item.chartRect.height >= 60 &&
        item.proofRect.bottom <= item.focusObjectRect.top + 1 &&
        item.currentRateRect.top >= item.focusObjectRect.top - 1 &&
        item.currentRateRect.bottom <= item.focusObjectRect.bottom + 1 &&
        item.focusObjectRect.bottom <= item.firstInvestigationActionRect.top + 1 &&
        item.firstInvestigationActionRect.bottom <= item.signalRect.top + 1 &&
        item.chartRect.top >= item.signalRect.top - 1 && item.chartRect.bottom <= item.signalRect.bottom + 1 &&
        item.rateCells.every((cell) => cell.rect && cell.rect.top >= item.currentRateRect.top - 1 && cell.rect.bottom <= item.currentRateRect.bottom + 1) &&
        item.overflow <= 1
      )),
      { normal390 },
    );
    check(
      checks,
      '1199/1200 preserve equivalent Focus-Signal and full-width support task ownership',
      normal1199.comparisonLandmarkCount === 0 && normal1199.tabletSteadyCount === 1 &&
        normal1199.evidenceBoundaryParent === 'steady-support' && normal1199.investigationParent === 'outside' &&
        normal1199.normalObjectFocusRect && normal1199.investigationRect &&
        normal1199.normalObjectFocusRect.bottom <= normal1199.investigationRect.top + 1 &&
        normal1199.primaryLandmarks.length === 0 && normal1199.contextLandmarks.length === 0 &&
        normal1200.comparisonLandmarkCount === 0 && normal1200.tabletSteadyCount === 0 &&
        normal1200.normalTopBandCount === 1 && normal1200.normalDecisionBandCount === 1 &&
        normal1200.normalStackCount === 0 && normal1200.focusPlacement === 'outside' &&
        normal1200.evidenceBoundaryParent === 'outside' && normal1200.investigationParent === 'outside' &&
        normal1200.primaryLandmarks.length === 0 && normal1200.contextLandmarks.length === 0 &&
        normal1199.comparisonObjects.length === 0 && normal1200.comparisonObjects.length === 0,
      { normal1199, normal1200 },
    );
    const normalLandmarks = ['evidence-boundary', 'focus', 'freshness', 'investigation', 'signal', 'verdict'];
    check(
      checks,
      '1199/1200 normal Overview preserves the same evidence-first task landmarks',
      normal1199.contract === 'legacy-desktop-task-v1' && normal1200.contract === 'legacy-desktop-task-v1' &&
        normal1199.scenario === 'single' && normal1200.scenario === 'single' &&
        includesEvery(normal1199.landmarks, normalLandmarks) && includesEvery(normal1200.landmarks, normalLandmarks) &&
        normal1199.focusObject && normal1199.focusObject === normal1200.focusObject &&
        normal1199.actions.join('|') === normal1200.actions.join('|') &&
        [normal1199, normal1200].every((item) => (
          item.investigationKicker === '巡检入口' && item.investigationTitle === '继续核对关键对象' &&
          item.verdictIconClass.includes('circle-alert') && !item.verdictIconClass.includes('shield-check') &&
          item.devicePixelRatio === 1 && !item.mobileUserAgent && item.pointerFine && item.hoverCapable
        )) &&
        normal1199.overflow <= 1 && normal1200.overflow <= 1,
      { normal1199, normal1200 },
    );
    const requiredRuntimeActions = ['立即刷新', '设备连接', '更多只读工具'];
    check(
      checks,
      '1199/1200 runtime chrome preserves device evidence and the same Overview actions',
      [normal1199, normal1200].every((item) => (
         item.runtimeDevice.includes('smoke-router') && item.runtimePhase.includes('当前') &&
        includesEvery(item.runtimeActions, requiredRuntimeActions)
      )) && normal1199.runtimeActions.join('|') === normal1200.runtimeActions.join('|'),
      { normal1199, normal1200 },
    );
    check(
      checks,
      '1199/1200 normal Overview does not manufacture Comparison from Focus and Signal evidence',
      [normal1199, normal1200].every((item) => (
        item.signalTitle && item.focusTitle === '活动默认路由' &&
        item.focusName === 'pppoe-wan1' && item.signalText.includes('24.00 Mbps') && item.signalText.includes('8.00 Mbps') &&
        item.comparisonTitle === '' && item.comparisonLandmark === '' &&
        item.comparisonLandmarkCount === 0 && item.comparisonObjects.length === 0
      )) && normal1199.routeProof.label === '' && normal1199.proofKeys.join('|') === 'freshness|wan|collection' &&
        normal1200.routeProof.label === '默认路由' && normal1200.routeProof.value === '已核实' &&
        !normal1200.routeProof.value.includes(normal1200.focusName) && !normal1200.routeProof.note.includes(normal1200.focusName) &&
        normal1200.proofKeys.join('|') === 'route|wan|collection' &&
        normal1199.signalTitle === normal1200.signalTitle &&
        normal1199.focusLabel === '当前出口' && normal1200.focusLabel === '当前核对对象' &&
        normal1199.focusTitle === normal1200.focusTitle,
      { normal1199, normal1200 },
    );
    check(
      checks,
      '390/768/1199/1200 single-WAN patrol omits a Comparison made only from Focus aliases and one unrelated object',
      [normal390, normal768, normal1199, normal1200].every((item) => (
        item.focusName === 'pppoe-wan1' && item.comparisonTitle === '' && item.comparisonLandmark === '' &&
        item.comparisonLandmarkCount === 0 && item.objectDetailsLandmarkCount === 0 &&
        item.comparisonObjects.length === 0
      )),
      { normal390, normal768, normal1199, normal1200 },
    );
    check(
      checks,
      '1199/1200 normal Overview keeps one proof strip and one visual scan rhythm',
      Boolean(
        normal1199.verdictRect && normal1200.verdictRect && normal1199.proofRect && normal1200.proofRect &&
        normal1199.taskRect && normal1200.taskRect && normal1199.signalRect && normal1200.signalRect &&
        normal1199.focusObjectRect && normal1200.focusObjectRect && normal1199.normalObjectFocusRect &&
        normal1199.investigationRect && normal1200.investigationRect &&
        normal1199.proofKeys.join('|') === 'freshness|wan|collection' &&
        normal1200.proofKeys.join('|') === 'route|wan|collection' &&
        (
          Math.abs(normal1199.verdictRect.height - normal1200.verdictRect.height) <= 24 ||
          (
            normal1199.surface === 'mobile' && normal1200.surface === 'desktop' &&
            Math.abs(normal1200.proofRect.top - normal1200.verdictRect.top) <= 2 &&
            Math.abs(normal1200.proofRect.bottom - normal1200.verdictRect.bottom) <= 2
          )
        ) &&
        Math.abs(normal1199.verdictTitlePx - normal1200.verdictTitlePx) <= 2 &&
        normal1199.mobileGroupedSurfaces.length === 1 &&
        normal1199.verdictRadiusPx === 0 && normal1199.verdictBorderPx === 0 &&
        normal1200.verdictBorderPx === 0 &&
        normal1199.statusBackground === 'rgba(0, 0, 0, 0)' &&
        normal1200.statusBackground !== 'rgba(0, 0, 0, 0)' &&
        normal1199.statusToTaskGap >= 0 && normal1199.statusToTaskGap <= 18 &&
        normal1200.statusToTaskGap >= 0 && normal1200.statusToTaskGap <= 18 &&
        (normal1199.signalTaskOffset >= 0 && normal1199.signalTaskOffset <= 18 ||
          (normal1199.normalObjectFocusRect && normal1199.signalRect && normal1199.signalRect.top >= normal1199.normalObjectFocusRect.bottom - 1)) &&
        normal1200.signalTaskOffset >= 0 && normal1200.signalTaskOffset <= 18 &&
        Math.abs(normal1199.signalRect.top - normal1199.focusObjectRect.top) <= 40 &&
        Math.abs(normal1200.signalRect.top - normal1200.focusObjectRect.top) <= 40 &&
        normal1199.investigationRect.top >= normal1199.normalObjectFocusRect.bottom - 1 && normal1200.investigationRect.top < 900
      ),
      { normal1199, normal1200 },
    );
    check(
      checks,
      '1199 tablet and 1200 desktop keep WAN wider than Focus with explicit chart units',
      Boolean(
        normal1199.primaryShare === null && normal1199.signalRect && normal1199.focusObjectRect &&
        normal1199.signalRect.width > normal1199.focusObjectRect.width &&
        normal1200.primaryShare === null && normal1200.signalRect && normal1200.focusObjectRect &&
        normal1200.signalRect.width > normal1200.focusObjectRect.width &&
        normal1199.signalRect && normal1200.signalRect && normal1199.signalRect.height > 0 &&
        normal1200.signalRect.height / normal1199.signalRect.height <= 1.75 &&
        [normal1199, normal1200].every((item) => (
          item.chartPeakUnit === 'Mbps' && item.chartLegendUnit === item.chartPeakUnit
        ))
      ),
      {
        normal1199: {
          primaryShare: normal1199.primaryShare,
          signalHeight: normal1199.signalRect?.height || null,
          chartPeakText: normal1199.chartPeakText,
          chartLegendText: normal1199.chartLegendText,
        },
        normal1200: {
          primaryShare: normal1200.primaryShare,
          signalHeight: normal1200.signalRect?.height || null,
          chartPeakText: normal1200.chartPeakText,
          chartLegendText: normal1200.chartLegendText,
        },
      },
    );
    check(
      checks,
      '1199/1200 normal boundary keeps route-signal proportion and vertical decision comparison continuous',
      normal1199.focusSignalShare !== null && normal1200.focusSignalShare !== null &&
        Math.abs(normal1199.focusSignalShare - normal1200.focusSignalShare) <= 0.06 &&
        normal1199.steadyDecisionCount === 3 && normal1199.steadyDecisionOrientation === 'vertical' &&
        normal1200.decisionRowCount === 3 && normal1200.decisionOrientation === 'vertical' &&
        normal1199.routeDossierRect && normal1199.signalRect && normal1199.steadySupportRect &&
        normal1200.focusObjectRect && normal1200.signalRect && normal1200.decisionRect &&
        normal1199.steadySupportRect.top >= Math.max(normal1199.routeDossierRect.bottom, normal1199.signalRect.bottom) - 1 &&
        normal1200.decisionRect.top >= Math.max(normal1200.focusObjectRect.bottom, normal1200.signalRect.bottom) - 1,
      {
        normal1199: {
          focusSignalShare: normal1199.focusSignalShare,
          decisionOrientation: normal1199.steadyDecisionOrientation,
          decisionCount: normal1199.steadyDecisionCount,
        },
        normal1200: {
          focusSignalShare: normal1200.focusSignalShare,
          decisionOrientation: normal1200.decisionOrientation,
          decisionCount: normal1200.decisionRowCount,
        },
      },
    );

    const rateUnitCases = [
      { scale: 0.001, expectedUnit: 'Kbps' },
      { scale: 1, expectedUnit: 'Mbps' },
      { scale: 100, expectedUnit: 'Gbps' },
    ];
    const rateUnitEvidence = [];
    for (const rateCase of rateUnitCases) {
      mock.state.rateScale = rateCase.scale;
      const evidence = await inspectOverviewTaskBoundary(taskDesktopPage, '', 1200);
      rateUnitEvidence.push({ ...rateCase, evidence });
    }
    mock.state.rateScale = 1;
    check(
      checks,
      'desktop WAN peak, SVG and legend share one structured Kbps/Mbps/Gbps unit decision through real runtime data',
      rateUnitEvidence.every(({ expectedUnit, evidence }) => (
        evidence.chartPeakUnit === expectedUnit &&
        evidence.chartDataUnit === expectedUnit &&
        evidence.chartLegendUnit === expectedUnit
      )),
      rateUnitEvidence,
    );

    const collection639 = await inspectOverviewTaskBoundary(taskDesktopPage, 'collection-down', 768, 1024, { workspaceWidth: 639 });
    const collection640 = await inspectOverviewTaskBoundary(taskDesktopPage, 'collection-down', 768, 1024, { workspaceWidth: 640 });
    check(
      checks,
      'incident master/detail changes at actual 639/640px workspace capacity',
      Boolean(
        collection639.workspaceContentWidth === 639 && collection640.workspaceContentWidth === 640 &&
        collection639.incidentObjectRect && collection639.inspectorRect &&
        collection640.incidentObjectRect && collection640.inspectorRect &&
        collection639.inspectorRect.top >= collection639.incidentObjectRect.bottom - 1 &&
        Math.abs(collection640.incidentObjectRect.top - collection640.inspectorRect.top) <= 1 &&
        collection640.incidentObjectRect.width >= 240 && collection640.inspectorRect.width >= 400 &&
        [collection639, collection640].every((item) => (
          item.overviewRootCount === 1 && item.focusObjectCount === 0 && item.scenarioFocusCount === 1 &&
          item.riskObjectSurfaceCount === 1 && item.selectedInspectorCount === 1 &&
          item.investigationSurfaceCount === 1 && item.investigationActionSurfaceCount === 1 &&
          item.coreLandmarkCounts.evidenceBoundary === 1
        )) &&
        collection639.overflow <= 1 && collection640.overflow <= 1
      ),
      { collection639, collection640 },
    );
    const collection899 = await inspectOverviewTaskBoundary(taskDesktopPage, 'collection-down', 899);
    const collection900 = await inspectOverviewTaskBoundary(taskDesktopPage, 'collection-down', 900);
    check(
      checks,
      '899/900 preserves one collection incident task grammar without a viewport-owned branch',
      [collection899, collection900].every((item) => (
        item.surface === 'mobile' && item.focus === 'planes' && item.focusObjectCount === 0 &&
        item.scenarioFocusCount === 1 && item.riskObjectSurfaceCount === 1 && item.selectedInspectorCount === 1 &&
        item.investigationSurfaceCount === 1 && item.investigationActionSurfaceCount === 1 &&
        item.coreLandmarkCounts.evidenceBoundary === 1 && item.overviewRootCount === 1 && item.overflow <= 1
      )) && collection899.focusObject === collection900.focusObject &&
        collection899.focusPlacement === collection900.focusPlacement &&
        collection899.landmarks.join('|') === collection900.landmarks.join('|') &&
        collection899.riskObjects.join('|') === collection900.riskObjects.join('|') &&
        collection899.actions.join('|') === collection900.actions.join('|'),
      { collection899, collection900 },
    );
    const collection1199 = await inspectOverviewTaskBoundary(taskDesktopPage, 'collection-down', 1199);
    screenshots.push(await screenshot(taskDesktopPage, 'overview-collection-task-1199.png', 'overview-collection-task-1199'));
    const collection1200 = await inspectOverviewTaskBoundary(taskDesktopPage, 'collection-down', 1200);
    screenshots.push(await screenshot(taskDesktopPage, 'overview-collection-task-1200.png', 'overview-collection-task-1200'));
    const collectionLandmarks = ['evidence-boundary', 'freshness', 'investigation', 'risk-objects', 'scenario-focus', 'selected-inspector', 'verdict'];
    check(
      checks,
      '1199/1200 collection incident preserves scenario focus and opens the highest-risk inspector',
       collection1199.contract === 'legacy-desktop-task-v1' && collection1200.contract === 'legacy-desktop-task-v1' &&
         collection1199.scenario === 'collection-down' && collection1200.scenario === 'collection-down' &&
       includesEvery(collection1199.landmarks, collectionLandmarks) && includesEvery(collection1200.landmarks, collectionLandmarks) &&
       collection1199.surface === 'mobile' && collection1200.surface === 'desktop' &&
         collection1199.scenarioFocusKind === 'planes' && collection1200.scenarioFocusKind === 'planes' &&
         collection1199.initialRiskObject &&
           collection1199.initialSelectedRiskObject === collection1199.initialRiskObject &&
           collection1199.initialInspector === collection1199.initialRiskObject &&
        collection1200.initialRiskObject &&
          collection1200.initialSelectedRiskObject === collection1200.initialRiskObject &&
          collection1200.initialInspector === collection1200.initialRiskObject &&
        collection1199.riskObjects.length >= 2 && collection1199.riskObjects.join('|') === collection1200.riskObjects.join('|') &&
        collection1199.inspector && collection1199.inspector === collection1200.inspector &&
        collection1199.actions.join('|') === collection1200.actions.join('|') &&
        [collection1199, collection1200].every((item) => (
          item.investigationKicker === '关联工作区' && item.investigationTitle === '继续核对相关证据' &&
          item.devicePixelRatio === 1 && !item.mobileUserAgent && item.pointerFine && item.hoverCapable
        )) &&
        collection1199.overflow <= 1 && collection1200.overflow <= 1,
      { collection1199, collection1200 },
    );
    check(
      checks,
      '1199/1200 collection incident keeps one contextual proof owner and one risk-inspector task rhythm',
      Boolean(
        collection1199.verdictRect && collection1200.verdictRect &&
        collection1199.proofRect && collection1200.proofRect &&
        collection1199.taskRect && collection1200.taskRect &&
        collection1199.firstRiskObjectRect && collection1200.firstRiskObjectRect &&
        collection1199.inspectorRect && collection1200.inspectorRect &&
        [collection1199, collection1200].every((item) => (
          item.proofKeys.length === 3 &&
          item.proofKeys.includes('collection-channels') &&
          item.proofKeys.includes('last-success') &&
          item.proofKeys.includes('failed-endpoints') &&
          Math.abs(item.proofRect.top - item.verdictRect.top) <= 2 &&
          Math.abs(item.proofRect.bottom - item.verdictRect.bottom) <= 2
        )) &&
        collection1199.proofKeys.join('|') === collection1200.proofKeys.join('|') &&
        Math.abs(collection1199.verdictRect.height - collection1200.verdictRect.height) <= 24 &&
        Math.abs(collection1199.verdictTitlePx - collection1200.verdictTitlePx) <= 2 &&
        collection1199.mobileGroupedSurfaces.length === 1 &&
        collection1199.verdictRadiusPx === 0 && collection1199.verdictBorderPx === 0 &&
        collection1200.verdictBorderPx === 0 &&
        collection1199.statusToTaskGap >= 0 && collection1199.statusToTaskGap <= 18 &&
        collection1200.statusToTaskGap >= 0 && collection1200.statusToTaskGap <= 18 &&
        collection1199.firstRiskObjectRect.top < 900 && collection1200.firstRiskObjectRect.top < 900 &&
        collection1199.inspectorRect.top < 900 && collection1200.inspectorRect.top < 900
      ),
      { collection1199, collection1200 },
    );

    const normal1366 = await inspectOverviewTaskBoundary(taskDesktopPage, '', 1366, 768);
    screenshots.push(await screenshot(taskDesktopPage, 'overview-normal-task-1366.png', 'overview-normal-task-1366'));
    const normal1440 = await inspectOverviewTaskBoundary(taskDesktopPage, '', 1440);
    screenshots.push(await screenshot(taskDesktopPage, 'overview-normal-task-1440.png', 'overview-normal-task-1440'));
    const multiComparison390 = await inspectOverviewTaskBoundary(taskDesktopPage, 'comparison-multi', 390, 844);
    screenshots.push(await screenshot(taskDesktopPage, 'overview-multi-object-comparison-390.png', 'overview-multi-object-comparison-390'));
    const multiComparison768 = await inspectOverviewTaskBoundary(taskDesktopPage, 'comparison-multi', 768, 1024);
    const multiComparison1199 = await inspectOverviewTaskBoundary(taskDesktopPage, 'comparison-multi', 1199);
    const multiComparison1200 = await inspectOverviewTaskBoundary(taskDesktopPage, 'comparison-multi', 1200);
    screenshots.push(await screenshot(taskDesktopPage, 'overview-multi-object-comparison-1200.png', 'overview-multi-object-comparison-1200'));
    const multiComparison1366 = await inspectOverviewTaskBoundary(taskDesktopPage, 'comparison-multi', 1366, 768);
    const multiComparison1440 = await inspectOverviewTaskBoundary(taskDesktopPage, 'comparison-multi', 1440);
    const multiComparisonViews = [
      multiComparison390,
      multiComparison768,
      multiComparison1199,
      multiComparison1200,
      multiComparison1366,
      multiComparison1440,
    ];
    check(
      checks,
      'multi-object Comparison keeps only non-Focus objects with stable inspectable identity across both presentation trees',
      multiComparisonViews.every((item) => (
        item.risk === 'none' && item.focusName === 'pppoe-wan1' &&
        item.comparisonTitle === '对象比较' && item.comparisonLandmark === 'comparison' &&
        item.comparisonLandmarkCount === 1 && item.objectDetailsLandmarkCount === 0 &&
        item.comparisonObjects.length === 3 &&
        item.comparisonObjects.map((object) => object.name).join('|') === 'bridge-lan|ether2|ether3' &&
        item.comparisonObjects.every((object) => (
          object.id && object.name !== item.focusName && !object.clipped &&
          /(?:运行|未运行|已停用|状态未记录)/.test(object.text) &&
          /(?:下 .*上 |速率未记录)/.test(object.text)
        ))
      )) && multiComparisonViews.slice(1).every((item) => (
        item.comparisonObjects.map((object) => object.id).join('|') ===
          multiComparison390.comparisonObjects.map((object) => object.id).join('|')
      )),
      { multiComparisonViews },
    );
    const fleetCoverage390 = await inspectOverviewTaskBoundary(taskDesktopPage, 'fleet-coverage', 390, 844);
    screenshots.push(await screenshot(taskDesktopPage, 'overview-fleet-coverage-390.png', 'overview-fleet-coverage-390'));
    const fleetCoverage768 = await inspectOverviewTaskBoundary(taskDesktopPage, 'fleet-coverage', 768, 1024);
    screenshots.push(await screenshot(taskDesktopPage, 'overview-fleet-handoff-768.png', 'overview-fleet-handoff-768'));
    const fleetCoverage844 = await inspectOverviewTaskBoundary(taskDesktopPage, 'fleet-coverage', 844, 1024);
    const fleetCoverage1200 = await inspectOverviewTaskBoundary(taskDesktopPage, 'fleet-coverage', 1200);
    screenshots.push(await screenshot(taskDesktopPage, 'overview-fleet-coverage-1200.png', 'overview-fleet-coverage-1200'));
    const tabletFleetCoverage = [fleetCoverage768, fleetCoverage844];
    const mobileFleetCoverageContract = (
        fleetCoverage390.scenario === 'fleet' && fleetCoverage390.risk === 'none' &&
        fleetCoverage390.proofFacts.route === '已核实' && fleetCoverage390.proofFacts.wan === '4 / 4' && fleetCoverage390.proofFacts.interfaces === '8 / 8' &&
        fleetCoverage390.focusName === 'pppoe-wan1' && fleetCoverage390.fleetScopeCount === 1 &&
        fleetCoverage390.fleetScopeTitle === '对象覆盖 · 12 项' &&
        fleetCoverage390.fleetScopeObjects.length === 12 &&
        new Set(fleetCoverage390.fleetScopeObjects.map((object) => object.id)).size === 12 &&
        fleetCoverage390.fleetScopeObjects.filter((object) => object.text.includes('WAN')).length === 4 &&
        fleetCoverage390.fleetScopeObjects.filter((object) => object.text.includes('接口')).length === 8 &&
        fleetCoverage390.fleetScopeObjects.every((object) => object.id) &&
        fleetCoverage390.fleetScopeObjects.filter((object) => object.inFirstViewport).length >= 4 &&
        fleetCoverage390.signalText.includes('24.00 Mbps') && fleetCoverage390.signalText.includes('8.00 Mbps') &&
        fleetCoverage390.signalRect && fleetCoverage390.focusObjectRect &&
        fleetCoverage390.focusObjectRect.bottom <= fleetCoverage390.signalRect.top + 1 &&
        fleetCoverage390.comparisonLandmarkCount === 0 && fleetCoverage390.objectDetailsLandmarkCount === 0 &&
        fleetCoverage390.actions.join('|') === 'interfaces' && fleetCoverage390.investigationActionRouteCount === 1 &&
        fleetCoverage390.firstInvestigationActionInFirstViewport &&
        fleetCoverage390.overflow <= 1
      ) && tabletFleetCoverage.every((item) => (
        item.scenario === 'fleet' && item.risk === 'none' &&
        item.proofFacts.route === '已核实' && item.proofFacts.wan === '4 / 4' && item.proofFacts.interfaces === '8 / 8' &&
        item.focusName === 'pppoe-wan1' && item.signalText.includes('24.00 Mbps') && item.signalText.includes('8.00 Mbps') &&
        item.fleetScopeCount === 0 &&
        item.comparisonLandmarkCount === 0 && item.objectDetailsLandmarkCount === 0 && item.objectDetailRows.length === 0 &&
        item.actions.join('|') === 'interfaces' && item.investigationActionRouteCount === 1 &&
        item.firstInvestigationActionId === 'interfaces' &&
        item.firstInvestigationActionText.includes('进入网络工作区') &&
        item.firstInvestigationActionText.includes('WAN、接口与路由对象') &&
        item.firstInvestigationActionRect?.height >= 44 && item.firstInvestigationActionInFirstViewport &&
        item.evidenceBoundaryInFirstViewport &&
        item.overflow <= 1
      )) &&
        fleetCoverage1200.scenario === 'fleet' && fleetCoverage1200.risk === 'none' &&
        fleetCoverage1200.comparisonLandmarkCount === 0 && fleetCoverage1200.objectDetailsLandmarkCount === 1 &&
        fleetCoverage1200.objectDetailRows.length === 12 && new Set(fleetCoverage1200.objectDetailRows).size === 12 &&
        fleetCoverage1200.overflow <= 1;

    async function exerciseFleetObjectEntry() {
      await inspectOverviewTaskBoundary(taskDesktopPage, 'fleet-coverage', 390, 844);
      const object = taskDesktopPage.locator('[data-overview-task-landmark="fleet-scope"] button[id]').first();
      const objectCount = await object.count();
      if (objectCount !== 1) return { available: false, objectCount };
      const objectId = await object.getAttribute('id');
      const originUrl = taskDesktopPage.url();
      await object.click();
      await taskDesktopPage.locator('[data-mobile-domain-workspace="lineStatus"] [data-mobile-object-detail]').waitFor();
      const entryUrl = taskDesktopPage.url();
      const entry = await taskDesktopPage.evaluate(() => {
        const query = new URLSearchParams(location.search);
        return {
          section: query.get('section'),
          object: query.get('object'),
          from: query.get('from'),
          evidenceAt: query.get('evidenceAt'),
          selected: document.querySelector('[data-mobile-object-detail]')?.getAttribute('data-mobile-object-detail') || '',
        };
      });
      screenshots.push(await screenshot(taskDesktopPage, 'fleet-object-detail-390.png', 'fleet-object-detail-390'));
      await taskDesktopPage.goBack();
      await taskDesktopPage.locator('[data-overview-task-landmark="fleet-scope"]').waitFor();
      const back = await taskDesktopPage.evaluate(() => ({ url: location.href, focus: document.activeElement?.id || '' }));
      await taskDesktopPage.goForward();
      await taskDesktopPage.locator('[data-mobile-domain-workspace="lineStatus"] [data-mobile-object-detail]').waitFor();
      const forwardUrl = taskDesktopPage.url();
      await taskDesktopPage.goBack();
      await taskDesktopPage.locator('[data-overview-task-landmark="fleet-scope"]').waitFor();
      return { available: true, objectId, originUrl, entryUrl, entry, back, forwardUrl };
    }

    async function exerciseFleetWorkspaceHandoff(width, height, file, stateName) {
      await inspectOverviewTaskBoundary(taskDesktopPage, 'fleet-coverage', width, height);
      const action = taskDesktopPage.locator('[data-mobile-action-route="interfaces"], .mp-actions #interfaces');
      const actionCount = await action.count();
      if (actionCount !== 1) return { available: false, width, height, actionCount };
      await action.scrollIntoViewIfNeeded();
      const actionRect = await action.boundingBox();
      const actionText = ((await action.textContent()) || (await action.getAttribute('aria-label')) || '').replace(/\s+/g, ' ').trim();
      const originUrl = taskDesktopPage.url();
      await action.click();
      await taskDesktopPage.locator('[data-mobile-domain-workspace="interfaces"]').waitFor();
      const entry = await taskDesktopPage.evaluate(() => {
        const query = new URLSearchParams(location.search);
        return {
          url: location.href,
          section: query.get('section'),
          object: query.get('object'),
          risk: query.get('risk'),
          from: query.get('from'),
          evidenceAt: query.get('evidenceAt'),
          hash: location.hash,
          tabs: [...document.querySelectorAll('.mdw-route-switcher button')]
            .map((node) => node.textContent?.trim() || '')
            .filter(Boolean),
        };
      });
      screenshots.push(await screenshot(taskDesktopPage, file, stateName));
      await taskDesktopPage.goBack();
      await taskDesktopPage.locator('[data-mobile-overview-scenario="fleet"]').waitFor();
      await taskDesktopPage.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const back = await taskDesktopPage.evaluate(() => ({
        url: location.href,
        focusedAction: document.activeElement?.id || '',
      }));
      await taskDesktopPage.goForward();
      await taskDesktopPage.locator('[data-mobile-domain-workspace="interfaces"]').waitFor();
      const forwardUrl = taskDesktopPage.url();
      await taskDesktopPage.goBack();
      await taskDesktopPage.locator('[data-mobile-overview-scenario="fleet"]').waitFor();
      return { available: true, width, height, actionRect, actionText, originUrl, entry, back, forwardUrl };
    }

    const fleetObjectEntry390 = await exerciseFleetObjectEntry();
    const fleetHandoff390 = await exerciseFleetWorkspaceHandoff(
      390, 844, 'fleet-network-workspace-390.png', 'fleet-network-workspace-390'
    );
    const fleetHandoff768 = await exerciseFleetWorkspaceHandoff(
      768, 1024, 'fleet-network-workspace-768.png', 'fleet-network-workspace-768'
    );
    check(
      checks,
      'mobile Fleet coverage judgement and canonical network handoff preserve desktop completeness and Back/Forward focus',
      mobileFleetCoverageContract &&
        fleetObjectEntry390.available && Boolean(fleetObjectEntry390.objectId) &&
        fleetObjectEntry390.entry.section === 'lineStatus' &&
        fleetObjectEntry390.entry.object === fleetObjectEntry390.objectId &&
        fleetObjectEntry390.entry.selected === fleetObjectEntry390.objectId &&
        fleetObjectEntry390.entry.from === 'overview' &&
        /^\d{4}-\d{2}-\d{2}T/.test(fleetObjectEntry390.entry.evidenceAt || '') &&
        fleetObjectEntry390.back.url === fleetObjectEntry390.originUrl &&
        fleetObjectEntry390.back.focus === fleetObjectEntry390.objectId &&
        fleetObjectEntry390.forwardUrl === fleetObjectEntry390.entryUrl &&
        [fleetHandoff390, fleetHandoff768].every((journey) => (
        journey.available && journey.actionRect?.height >= 44 &&
        journey.actionText.includes('进入网络工作区') && journey.actionText.includes('WAN、接口与路由对象') &&
        journey.entry.section === 'interfaces' && journey.entry.object === null && journey.entry.risk === null &&
        journey.entry.from === 'overview' && /^\d{4}-\d{2}-\d{2}T/.test(journey.entry.evidenceAt || '') &&
        journey.entry.hash === '' && ['接口', 'WAN', '路由'].every((label) => journey.entry.tabs.includes(label)) &&
        journey.back.url === journey.originUrl && journey.back.focusedAction === 'interfaces' &&
        journey.forwardUrl === journey.entry.url
      )),
      { fleetCoverage390, fleetCoverage768, fleetCoverage844, fleetCoverage1200, fleetObjectEntry390, fleetHandoff390, fleetHandoff768 },
    );
    check(
      checks,
      '1366/1440 Overview spends added width on the shared Focus-Signal evidence band',
      Boolean(
        normal1366.surface === 'desktop' && normal1440.surface === 'desktop' &&
        normal1366.normalTopBandRect && normal1440.normalTopBandRect &&
        normal1366.focusObjectRect && normal1440.focusObjectRect &&
        normal1366.chartRect && normal1440.chartRect &&
        normal1440.chartRect.width - normal1366.chartRect.width >= 28 &&
        normal1440.focusObjectRect.width - normal1366.focusObjectRect.width >= 12 &&
        normal1366.signalTaskOffset >= 0 && normal1366.signalTaskOffset <= 18 &&
        normal1440.signalTaskOffset >= 0 && normal1440.signalTaskOffset <= 18 &&
        normal1366.overflow <= 1 && normal1440.overflow <= 1
      ),
      { normal1366, normal1440 },
    );
    const desktopNormalDensityContract = (item) => Boolean(
      item.surface === 'desktop' && item.scenario === 'single' &&
      item.normalTopBandCount === 1 && item.normalDecisionBandCount === 1 && item.normalStackCount === 0 &&
      item.focusObjectRect && item.signalRect && item.normalTopBandRect && item.decisionRect && item.workspaceRect &&
      item.focusObjectRect.right <= item.signalRect.left + 1 &&
      Math.abs(item.focusObjectRect.top - item.signalRect.top) <= 2 &&
      item.normalTopBandRect.left === item.workspaceRect.left && item.normalTopBandRect.right === item.workspaceRect.right &&
      item.decisionParent === 'decision-band' && item.decisionRect.width >= item.workspaceRect.width - 2 &&
      item.decisionRect.top >= Math.max(item.focusObjectRect.bottom, item.signalRect.bottom) - 1 &&
      item.decisionRowCount === 3 && item.decisionRowsInFirstViewport === 3 &&
      item.verdictRect?.height <= 100 && item.overflow <= 1
    );
    check(
      checks,
      '1200/1366/1440 normal desktop follows Focus-left Signal-right then full-width current decisions',
      [normal1200, normal1366, normal1440].every(desktopNormalDensityContract),
      { normal1200, normal1366, normal1440 },
    );
    check(
      checks,
      '1366/1440 normal desktop keeps route Focus and WAN Signal in the first viewport without fabricating Comparison',
      [normal1366, normal1440].every((item) => (
        item.surface === 'desktop' && item.scenario === 'single' &&
        item.verdictInFirstViewport && item.chartInFirstViewport &&
        item.focusActionInFirstViewport && item.decisionRowsInFirstViewport === 3 &&
        item.investigationKicker === '巡检入口' && item.investigationTitle === '继续核对关键对象' &&
        item.verdictIconClass.includes('circle-alert') && !item.verdictIconClass.includes('shield-check') &&
        item.verdictAccent === 'rgb(13, 103, 139)' &&
        item.devicePixelRatio === 1 && !item.mobileUserAgent && item.pointerFine && item.hoverCapable &&
        item.investigationSurfaceCount === 1 && item.investigationActionSurfaceCount === 1 &&
        (item.investigationDirectChild === true || item.investigationNestedInNormalFocusBand === true) && item.investigationActionRouteCount > 0 &&
        item.investigationActionRouteCount === item.investigationUniqueActionRouteCount &&
        item.focusName === 'pppoe-wan1' && item.comparisonLandmarkCount === 0 &&
        item.comparisonObjects.length === 0 && item.overflow <= 1
      )),
      { normal1366, normal1440 },
    );

    const collection1366 = await inspectOverviewTaskBoundary(taskDesktopPage, 'collection-down', 1366, 768);
    screenshots.push(await screenshot(taskDesktopPage, 'overview-collection-task-1366.png', 'overview-collection-task-1366'));
    const collection1440 = await inspectOverviewTaskBoundary(taskDesktopPage, 'collection-down', 1440, 900);
    screenshots.push(await screenshot(taskDesktopPage, 'overview-collection-task-1440.png', 'overview-collection-task-1440'));
    check(
      checks,
      '1366/1440 incident desktop opens highest risk evidence and a next action in the first viewport',
      [collection1366, collection1440].every((item) => (
        item.surface === 'desktop' && item.scenario === 'collection-down' &&
        item.initialRiskObject &&
        item.initialSelectedRiskObject === item.initialRiskObject &&
        item.initialInspector === item.initialRiskObject &&
        item.riskObjectOrder.length >= 1 &&
        item.selectedRiskObject === item.riskObjectOrder[0] &&
        item.inspector === item.selectedRiskObject &&
        item.verdictInFirstViewport && item.firstScenarioItemInFirstViewport &&
        item.firstRiskObjectInFirstViewport && item.selectedRiskObjectInFirstViewport &&
        item.inspectorFirstFactInFirstViewport && item.inspectorActionInFirstViewport &&
        item.investigationKicker === '关联工作区' && item.investigationTitle === '继续核对相关证据' &&
        item.devicePixelRatio === 1 && !item.mobileUserAgent && item.pointerFine && item.hoverCapable &&
        item.investigationSurfaceCount === 1 && item.investigationActionSurfaceCount === 1 &&
        item.investigationDirectChild === true && item.investigationActionRouteCount > 0 &&
        item.investigationActionRouteCount === item.investigationUniqueActionRouteCount &&
        item.firstInvestigationActionInFirstViewport && item.overflow <= 1
      )),
      { collection1366, collection1440 },
    );

    await taskDesktopContext.close();

    mock.state.scenario = '';
    await tabletPage.setViewportSize({ width: 768, height: 1024 });
    const overviewTarget = new URL(mock.url);
    overviewTarget.searchParams.set('section', 'overview');
    await tabletPage.goto(overviewTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForPhase(tabletPage, 'current', 12000);
    await tabletPage.locator('[data-mobile-overview-risk="none"]').waitFor();

    const tabletNormalOverview = await tabletPage.evaluate(() => {
      const comparison = document.querySelector('[data-overview-task-landmark="comparison"]');
      const dossier = document.querySelector('.mp-route-dossier');
      return {
        risk: document.querySelector('[data-mobile-overview-risk]')?.getAttribute('data-mobile-overview-risk') || '',
        focusName: document.querySelector('[data-overview-task-focus-object] code')?.textContent?.trim() || '',
        signal: document.querySelector('[data-overview-task-landmark="signal"]')?.textContent?.replace(/\s+/g, ' ').trim() || '',
        objectTask: comparison?.textContent?.trim() || '',
        objectIds: [...(comparison?.querySelectorAll('button[id]') || [])]
          .map((node) => node.id)
          .filter(Boolean),
        workbenchCount: document.querySelectorAll('.mp-tablet-steady').length,
        dossierFacts: Object.fromEntries([...(dossier?.querySelectorAll('dl > div') || [])].map((row) => [
          row.querySelector('dt')?.textContent?.trim() || '',
          row.querySelector('dd')?.textContent?.replace(/\s+/g, ' ').trim() || '',
        ])),
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    check(
      checks,
      '768px single-WAN normal Overview adds a truthful route dossier without a fabricated Comparison',
      tabletNormalOverview.risk === 'none' &&
        tabletNormalOverview.focusName === 'pppoe-wan1' &&
        tabletNormalOverview.signal.includes('24.00 Mbps') && tabletNormalOverview.signal.includes('8.00 Mbps') &&
        tabletNormalOverview.workbenchCount === 1 &&
        tabletNormalOverview.dossierFacts['路由表'] === 'main' &&
        tabletNormalOverview.dossierFacts['网关'] === 'pppoe-wan1' &&
        tabletNormalOverview.dossierFacts.distance === '1' &&
        tabletNormalOverview.dossierFacts['活动候选'] === '1 条' &&
        tabletNormalOverview.objectTask === '' && tabletNormalOverview.objectIds.length === 0 &&
        tabletNormalOverview.overflow <= 1,
      tabletNormalOverview
    );
    const tabletNormalVerticalTask = await tabletPage.evaluate(() => {
      const owner = document.querySelector('[data-tablet-vertical-space-task="normal"]');
      const buttons = [...(owner?.querySelectorAll('.mp-action-list > button[id]') || [])];
      const summary = owner?.querySelector('.mp-tablet-task-summary')?.textContent?.replace(/\s+/g, ' ').trim() || '';
      const rect = owner?.getBoundingClientRect();
      return {
        present: Boolean(owner),
        purpose: owner?.getAttribute('data-tablet-space-purpose') || '',
        newDecision: owner?.getAttribute('data-tablet-space-new-decision') || '',
        actionIds: buttons.map((button) => button.id),
        summary,
        height: rect ? Math.round(rect.height) : 0,
      };
    });
    check(
      checks,
      'tablet normal vertical task surface binds a patrol sequence without metric filler',
      tabletNormalVerticalTask.present &&
        tabletNormalVerticalTask.purpose === 'patrol-sequence' &&
        tabletNormalVerticalTask.newDecision === 'true' &&
        tabletNormalVerticalTask.actionIds.length >= 1 &&
        tabletNormalVerticalTask.summary.length > 0 &&
        tabletNormalVerticalTask.height >= 120,
      tabletNormalVerticalTask
    );
    const tabletNormalNextEvidence = await tabletPage.evaluate(() => {
      const workspace = document.querySelector('[data-tablet-next-evidence-workspace="normal"]');
      const rows = [...(workspace?.querySelectorAll('[data-tablet-next-evidence-row="normal"]') || [])];
      return {
        present: Boolean(workspace),
        kind: workspace?.getAttribute('data-tablet-next-evidence-kind') || '',
        newDecision: workspace?.getAttribute('data-tablet-next-evidence-new-decision') || '',
        sourcePaths: rows.map((row) => row.getAttribute('data-tablet-next-evidence-source-path') || ''),
        title: workspace?.querySelector('h2')?.textContent?.trim() || '',
        evidenceAt: workspace?.getAttribute('data-tablet-next-evidence-at') || workspace?.querySelector('time')?.getAttribute('datetime') || '',
        duplicateMetricCount: (workspace?.textContent?.match(/24\.00 Mbps|8\.00 Mbps/g) || []).length,
      };
    });
    check(
      checks,
      'tablet normal next-evidence workspace compares object coverage without repeating traffic metrics',
      tabletNormalNextEvidence.present &&
        tabletNormalNextEvidence.kind === 'object-coverage' &&
        tabletNormalNextEvidence.newDecision === 'true' &&
        tabletNormalNextEvidence.sourcePaths.length >= 2 &&
        tabletNormalNextEvidence.sourcePaths.every(Boolean) &&
        tabletNormalNextEvidence.title.length > 0 &&
        tabletNormalNextEvidence.evidenceAt.length > 0 &&
        tabletNormalNextEvidence.duplicateMetricCount === 0,
      tabletNormalNextEvidence
    );
    await tabletPage.waitForFunction(() => Boolean(
      document.querySelector('[data-tablet-next-evidence-workspace="normal"] [data-tablet-next-evidence-selected-object]') &&
      document.querySelector('.mp-tablet-object-workspace [data-tablet-normal-comparison-inspector]')
    ));
    const tabletNormalComparisonBefore = await tabletPage.evaluate(() => {
      const workspace = document.querySelector('[data-tablet-next-evidence-workspace="normal"]');
      const rows = [...(workspace?.querySelectorAll('[data-tablet-next-evidence-row="normal"]') || [])];
      const selected = workspace?.querySelector('[data-tablet-next-evidence-selected-object]');
      const inspector = document.querySelector('.mp-tablet-object-workspace [data-tablet-normal-comparison-inspector]');
      const actionButton = inspector?.querySelector('[data-tablet-normal-object-action="shared"]');
      return {
        rowCount: rows.length,
        selectedId: selected?.getAttribute('data-tablet-next-evidence-selected-object') || '',
        inspectorId: inspector?.getAttribute('data-tablet-normal-comparison-object') || '',
        relation: inspector?.querySelector('dl dt')?.nextElementSibling?.textContent?.trim() || '',
        source: inspector?.querySelector('dl > div:nth-child(2) code')?.textContent?.trim() || '',
        action: actionButton?.textContent?.replace(/\s+/g, ' ').trim() || '',
        actionLabel: actionButton?.querySelector('b')?.textContent?.trim() || '',
        actionNote: actionButton?.querySelector('small')?.textContent?.trim() || '',
        actionRoute: actionButton?.getAttribute('data-tablet-normal-object-action-route') || '',
        actionObjectId: actionButton?.getAttribute('data-tablet-normal-object-action-object-id') || '',
        actionEvidenceAt: actionButton?.getAttribute('data-tablet-normal-object-action-evidence-at') || '',
        actionReturnRoute: actionButton?.getAttribute('data-tablet-normal-object-action-return-route') || '',
      };
    });
    const normalRows = tabletPage.locator('[data-tablet-next-evidence-workspace="normal"] [data-tablet-next-evidence-row="normal"]');
    await normalRows.nth(1).click();
    await tabletPage.waitForFunction(() => {
      const selected = document.querySelector('[data-tablet-next-evidence-workspace="normal"] [data-tablet-next-evidence-selected-object]');
      const inspector = document.querySelector('.mp-tablet-object-workspace [data-tablet-normal-comparison-inspector]');
      return Boolean(selected && inspector && selected.getAttribute('data-tablet-next-evidence-selected-object') === inspector.getAttribute('data-tablet-normal-comparison-object'));
    });
    const tabletNormalComparisonAfter = await tabletPage.evaluate(() => {
      const workspace = document.querySelector('[data-tablet-next-evidence-workspace="normal"]');
      const selected = workspace?.querySelector('[data-tablet-next-evidence-selected-object]');
      const inspector = document.querySelector('.mp-tablet-object-workspace [data-tablet-normal-comparison-inspector]');
      const actionButton = inspector?.querySelector('[data-tablet-normal-object-action="shared"]');
      return {
        selectedId: selected?.getAttribute('data-tablet-next-evidence-selected-object') || '',
        inspectorId: inspector?.getAttribute('data-tablet-normal-comparison-object') || '',
        source: inspector?.querySelector('dl > div:nth-child(2) code')?.textContent?.trim() || '',
        action: actionButton?.textContent?.replace(/\s+/g, ' ').trim() || '',
        actionLabel: actionButton?.querySelector('b')?.textContent?.trim() || '',
        actionNote: actionButton?.querySelector('small')?.textContent?.trim() || '',
        actionRoute: actionButton?.getAttribute('data-tablet-normal-object-action-route') || '',
        actionObjectId: actionButton?.getAttribute('data-tablet-normal-object-action-object-id') || '',
        actionEvidenceAt: actionButton?.getAttribute('data-tablet-normal-object-action-evidence-at') || '',
        actionReturnRoute: actionButton?.getAttribute('data-tablet-normal-object-action-return-route') || '',
      };
    });
    check(
      checks,
      'tablet normal comparison binds one real data collection to default selection, relation/source evidence and object entry',
      tabletNormalComparisonBefore.rowCount >= 2 &&
        tabletNormalComparisonBefore.selectedId === tabletNormalComparisonBefore.inspectorId &&
        tabletNormalComparisonBefore.relation.length > 0 &&
        tabletNormalComparisonBefore.source.length > 0 &&
        tabletNormalComparisonBefore.actionLabel.length > 0 &&
        tabletNormalComparisonBefore.actionNote.length > 0 &&
        tabletNormalComparisonBefore.actionRoute.length > 0 &&
        tabletNormalComparisonBefore.actionObjectId.length > 0 &&
        tabletNormalComparisonBefore.actionEvidenceAt.includes('T') &&
        tabletNormalComparisonBefore.actionReturnRoute === 'overview' &&
        !tabletNormalComparisonBefore.action.includes('进入对象工作区') &&
        tabletNormalComparisonAfter.selectedId === tabletNormalComparisonAfter.inspectorId &&
        tabletNormalComparisonAfter.selectedId !== tabletNormalComparisonBefore.selectedId &&
        tabletNormalComparisonAfter.source.length > 0 &&
        tabletNormalComparisonAfter.actionLabel.length > 0 &&
        tabletNormalComparisonAfter.actionObjectId.length > 0 &&
        tabletPage.url().includes('section=overview'),
      { tabletNormalComparisonBefore, tabletNormalComparisonAfter, url: tabletPage.url() }
    );
    const tabletNormalColumnFlow = await tabletPage.evaluate(() => {
      const left = document.querySelector('.mp-tablet-left-column');
      const right = document.querySelector('.mp-tablet-right-column');
      const signal = right?.querySelector('[data-overview-task-landmark="signal"]');
      const followup = document.querySelector('.mp-tablet-steady-followup');
      const decisions = followup?.querySelector('[data-overview-task-landmark="decision-ledger"]');
      const objectWorkspace = document.querySelector('.mp-tablet-object-workspace');
      const support = document.querySelector('.mp-tablet-steady-support');
      const relation = support?.querySelector('[data-overview-task-landmark="relation-evidence"]');
      const evidence = support?.querySelector('[data-overview-task-landmark="evidence-boundary"]');
      const bounds = (node) => {
        const value = node?.getBoundingClientRect();
        return value ? { top: Math.round(value.top), right: Math.round(value.right), bottom: Math.round(value.bottom), left: Math.round(value.left), width: Math.round(value.width), height: Math.round(value.height) } : null;
      };
      const objectRect = objectWorkspace?.getBoundingClientRect() ?? null;
      const objectTop = objectRect?.top ?? null;
      const objectBottom = objectRect?.bottom ?? null;
      const followupTop = followup?.getBoundingClientRect().top ?? null;
      const followupBottom = followup?.getBoundingClientRect().bottom ?? null;
      const relationTop = relation?.getBoundingClientRect().top ?? null;
      const relationBottom = relation?.getBoundingClientRect().bottom ?? null;
      const evidenceTop = evidence?.getBoundingClientRect().top ?? null;
      const leftRect = left?.getBoundingClientRect() ?? null;
      const rightRect = right?.getBoundingClientRect() ?? null;
      const leftTop = leftRect?.top ?? null;
      const rightTop = rightRect?.top ?? null;
      const leftBottom = leftRect?.bottom ?? null;
      const rightBottom = rightRect?.bottom ?? null;
      return {
        left: bounds(left),
        right: bounds(right),
        signal: bounds(signal),
        decisions: bounds(decisions),
        objectWorkspace: bounds(objectWorkspace),
        objectAfterPrimaryColumns: Number.isFinite(objectTop) && Number.isFinite(leftBottom) && Number.isFinite(rightBottom) && objectTop >= Math.max(leftBottom, rightBottom) - 12,
        followup: bounds(followup),
        followupAfterObject: Number.isFinite(objectBottom) && Number.isFinite(followupTop) && followupTop >= objectBottom - 12,
        support: bounds(support),
        supportExists: Boolean(support),
        relation: bounds(relation),
        evidence: bounds(evidence),
        rightOwnsOnlySignal: Boolean(right && signal && !right.querySelector('[data-overview-task-landmark="decision-ledger"], [data-overview-task-landmark="relation-evidence"]')),
        relationAfterFollowup: Number.isFinite(followupBottom) && Number.isFinite(relationTop) && relationTop >= followupBottom - 12,
        evidenceAfterRelation: Number.isFinite(relationBottom) && Number.isFinite(evidenceTop) && evidenceTop >= relationBottom - 12,
        evidenceAfterFollowup: Number.isFinite(evidenceTop) && Number.isFinite(followupBottom) && evidenceTop >= followupBottom - 12,
      };
    });
    check(
      checks,
      'tablet normal orders route/WAN, object comparison, follow-up tasks, then relation/evidence',
      Boolean(
        tabletNormalColumnFlow.left && tabletNormalColumnFlow.right &&
        tabletNormalColumnFlow.signal && tabletNormalColumnFlow.decisions &&
        tabletNormalColumnFlow.objectWorkspace && tabletNormalColumnFlow.followup && tabletNormalColumnFlow.supportExists &&
        tabletNormalColumnFlow.relation && tabletNormalColumnFlow.evidence &&
        tabletNormalColumnFlow.rightOwnsOnlySignal &&
        tabletNormalColumnFlow.objectAfterPrimaryColumns &&
        tabletNormalColumnFlow.followupAfterObject &&
        tabletNormalColumnFlow.relationAfterFollowup &&
        tabletNormalColumnFlow.evidenceAfterRelation &&
        tabletNormalColumnFlow.evidenceAfterFollowup
      ),
      tabletNormalColumnFlow,
    );
    screenshots.push(await screenshot(tabletPage, 'tablet-overview-normal-768.png', 'tablet-overview-normal-768'));

    await tabletPage.locator('[data-section="interfaces"]').click();
    await tabletPage.locator('[data-mobile-domain-workspace="interfaces"]').waitFor();

    const inspectTabletWorkspace = () => tabletPage.evaluate(() => {
      const workspace = document.querySelector('[data-mobile-domain-workspace="interfaces"]');
      const nav = document.querySelector('.panel-task-navigation');
      const layout = document.querySelector('.mdw-layout');
      const list = document.querySelector('.mdw-list-pane');
      const inspector = document.querySelector('.mdw-inspector');
      const navRect = nav?.getBoundingClientRect();
      const layoutRect = layout?.getBoundingClientRect();
      const listRect = list?.getBoundingClientRect();
      const inspectorRect = inspector?.getBoundingClientRect();
      const listStyle = list ? getComputedStyle(list) : null;
      const inspectorStyle = inspector ? getComputedStyle(inspector) : null;
      const inspectorHeader = inspector?.querySelector(':scope > header');
      const inspectorHeaderStyle = inspectorHeader ? getComputedStyle(inspectorHeader) : null;
      const relatedRail = inspector?.querySelector('[data-mobile-related-object-rail]');
      const relatedButtons = [...(relatedRail?.querySelectorAll('[data-mobile-related-object]') || [])];
      const defaultInterfaceRow = [...(workspace?.querySelectorAll('[data-mobile-row-id]') || [])]
        .find((row) => row.querySelector('.mdw-row-copy b')?.textContent?.trim() === 'pppoe-wan1');
      return {
        viewport: { width: innerWidth, height: innerHeight },
        mode: workspace?.getAttribute('data-mobile-domain-layout') || '',
        nav: navRect ? { left: navRect.left, right: navRect.right, width: navRect.width, height: navRect.height } : null,
        layout: layoutRect ? { left: layoutRect.left, right: layoutRect.right, width: layoutRect.width, top: layoutRect.top, bottom: layoutRect.bottom } : null,
        list: listRect ? { left: listRect.left, right: listRect.right, width: listRect.width, top: listRect.top, bottom: listRect.bottom } : null,
        inspector: inspectorRect ? { left: inspectorRect.left, right: inspectorRect.right, width: inspectorRect.width, top: inspectorRect.top, bottom: inspectorRect.bottom } : null,
        listOverflowY: listStyle?.overflowY || '',
        inspectorOverflowY: inspectorStyle?.overflowY || '',
        inspectorHeaderPosition: inspectorHeaderStyle?.position || '',
        inspectorHeaderTop: inspectorHeaderStyle?.top || '',
        previewObject: inspector?.querySelector('.mdi-object-heading h2')?.textContent?.trim() || '',
        previewId: inspector?.getAttribute('data-mobile-object-preview') || '',
        defaultInterfaceId: defaultInterfaceRow?.getAttribute('data-mobile-row-id') || '',
         detailId: inspector?.getAttribute('data-mobile-object-detail') || '',
         relatedRailCount: workspace?.querySelectorAll('[data-mobile-related-object-rail]').length || 0,
         relatedObjectIds: relatedButtons.map((node) => node.getAttribute('data-mobile-related-object') || '').filter(Boolean),
         relatedButtonMinHeight: relatedButtons.length
           ? Math.min(...relatedButtons.map((node) => node.getBoundingClientRect().height))
           : 0,
         objectQuery: new URLSearchParams(location.search).get('object'),
        selectedRows: workspace?.querySelectorAll('[data-mobile-row-id][aria-current="true"]').length || 0,
         metricStrip: Boolean(workspace?.querySelector('.mdw-metrics')),
         collectionSummary: Boolean(workspace?.querySelector('[data-tablet-collection-summary="true"]')),
         columns: layout ? getComputedStyle(layout).gridTemplateColumns : '',
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });

    const tablet768 = await inspectTabletWorkspace();
    check(
      checks,
      RUNTIME_CHECK_CONTRACT.tabletSparseWorkbench,
        Boolean(
        tablet768.nav && tablet768.layout && tablet768.list && tablet768.inspector &&
        tablet768.mode === 'workbench' &&
        tablet768.nav.width >= 56 && tablet768.nav.width <= 64 &&
        tablet768.nav.right <= tablet768.layout.left + 1 &&
        tablet768.list.right <= tablet768.layout.right + 1 &&
        tablet768.previewObject === 'pppoe-wan1' && Boolean(tablet768.previewId) && !tablet768.detailId &&
        tablet768.objectQuery === null && tablet768.selectedRows === 0 &&
        tablet768.metricStrip && tablet768.collectionSummary &&
       tablet768.list.width >= 268 && tablet768.inspector.width >= 420 &&
         tablet768.inspector.right <= tablet768.layout.right + 1 &&
         tablet768.overflow <= 1
      ),
      tablet768
    );
    check(
      checks,
      '768px semantic preview exposes a bounded sibling object rail without auto-selecting it',
      tablet768.relatedRailCount === 1 && tablet768.relatedObjectIds.length >= 1 &&
        tablet768.relatedObjectIds.every((id) => id !== tablet768.previewId) &&
        tablet768.relatedButtonMinHeight >= 44 && tablet768.selectedRows === 0 &&
        tablet768.objectQuery === null,
      tablet768
    );
    screenshots.push(await screenshot(tabletPage, 'tablet-network-768.png', 'tablet-network-768'));

    const relatedTargetId = tablet768.relatedObjectIds[0];
    await tabletPage.locator(`[data-mobile-related-object="${relatedTargetId}"]`).click();
    await tabletPage.locator(`[data-mobile-object-detail="${relatedTargetId}"]`).waitFor();
    const relatedSelection = await tabletPage.evaluate(() => ({
      objectQuery: new URLSearchParams(location.search).get('object'),
      detailId: document.querySelector('[data-mobile-object-detail]')?.getAttribute('data-mobile-object-detail') || '',
      selectedRows: document.querySelectorAll('[data-mobile-row-id][aria-current="true"]').length,
      previewId: document.querySelector('[data-mobile-object-preview]')?.getAttribute('data-mobile-object-preview') || '',
    }));
    check(
      checks,
      '768px related object rail opens a real sibling through the existing object history',
      relatedSelection.objectQuery === relatedTargetId && relatedSelection.detailId === relatedTargetId &&
        relatedSelection.selectedRows === 1 && !relatedSelection.previewId,
      relatedSelection
    );
    await tabletPage.goBack();
    await tabletPage.locator('[data-mobile-object-preview]').waitFor();
    const relatedBack = await tabletPage.evaluate(() => ({
      objectQuery: new URLSearchParams(location.search).get('object'),
      previewId: document.querySelector('[data-mobile-object-preview]')?.getAttribute('data-mobile-object-preview') || '',
      selectedRows: document.querySelectorAll('[data-mobile-row-id][aria-current="true"]').length,
    }));
    await tabletPage.goForward();
    await tabletPage.locator(`[data-mobile-object-detail="${relatedTargetId}"]`).waitFor();
    const relatedForward = new URL(tabletPage.url()).searchParams.get('object');
    check(
      checks,
      '768px related object rail restores preview on Back and the same sibling on Forward',
      relatedBack.objectQuery === null && relatedBack.previewId === tablet768.previewId && relatedBack.selectedRows === 0 &&
        relatedForward === relatedTargetId,
      { relatedBack, relatedForward, expectedPreview: tablet768.previewId }
    );
    await tabletPage.goBack();
    await tabletPage.locator('[data-mobile-object-preview]').waitFor();

    await tabletPage.locator('[data-mobile-row-id]').first().click();
    await tabletPage.locator('[data-mobile-object-detail]').waitFor();
    const tabletSelection = await tabletPage.evaluate(() => ({
      listVisible: getComputedStyle(document.querySelector('.mdw-list-pane')).display !== 'none',
      detailVisible: Boolean(document.querySelector('[data-mobile-object-detail]')),
      detailKind: document.querySelector('[data-mobile-object-detail]')?.getAttribute('data-domain-inspector-kind') || '',
      detailSections: document.querySelectorAll('[data-mobile-object-detail] .mdi-section').length,
    }));
    check(
      checks,
      '768px domain workbench keeps the list beside the selected inspector',
      tabletSelection.listVisible && tabletSelection.detailVisible &&
        tabletSelection.detailKind === 'interface' && tabletSelection.detailSections >= 4,
      tabletSelection
    );

    const tabletNextStep = await tabletPage.evaluate(() => {
      const detail = document.querySelector('[data-mobile-object-detail]');
      const nextStep = detail?.querySelector('[data-tablet-inspector-next-step]');
      const action = nextStep?.querySelector('button');
      const evidenceTime = detail?.querySelector('.mdi-evidence time');
      const actionRect = action?.getBoundingClientRect();
      return {
        detailId: detail?.getAttribute('data-mobile-object-detail') || '',
        nextStep: Boolean(nextStep),
        heading: nextStep?.querySelector('h3')?.textContent?.trim() || '',
        actionLabel: action?.textContent?.trim() || '',
        actionObjectId: action?.getAttribute('data-mobile-action-object-id') || '',
        actionEvidenceAt: action?.getAttribute('data-mobile-action-evidence-at') || '',
        actionFrom: action?.getAttribute('data-mobile-action-from') || '',
        evidenceAt: evidenceTime?.getAttribute('datetime') || '',
        actionHeight: actionRect?.height || 0,
      };
    });
    check(
      checks,
      '768px selected interface exposes an object-scoped next-evidence action with bound context',
      tabletNextStep.nextStep && tabletNextStep.heading === '核对默认路由' &&
        tabletNextStep.actionLabel.includes('打开路由工作区') &&
        Boolean(tabletNextStep.detailId) &&
        tabletNextStep.actionObjectId === tabletNextStep.detailId &&
        Boolean(tabletNextStep.actionEvidenceAt) &&
        tabletNextStep.actionEvidenceAt === tabletNextStep.evidenceAt &&
        tabletNextStep.actionFrom === 'interfaces' &&
        tabletNextStep.actionHeight >= 44,
      tabletNextStep
    );

    const nextStepButton = tabletPage.locator('[data-tablet-inspector-next-step] button');
    await nextStepButton.click();
    await tabletPage.waitForFunction(() => new URLSearchParams(location.search).get('section') === 'routes');
    const nextStepRoute = new URL(tabletPage.url());
    const nextStepContext = {
      section: nextStepRoute.searchParams.get('section'),
      object: nextStepRoute.searchParams.get('object'),
      from: nextStepRoute.searchParams.get('from'),
      evidenceAt: nextStepRoute.searchParams.get('evidenceAt'),
    };
    check(
      checks,
      '768px next-evidence action opens routes while preserving object, evidence and return context',
      nextStepContext.section === 'routes' &&
        nextStepContext.object === tabletNextStep.detailId &&
        nextStepContext.from === 'interfaces' &&
        nextStepContext.evidenceAt === tabletNextStep.actionEvidenceAt,
      nextStepContext
    );
    await tabletPage.goBack();
    await tabletPage.locator('[data-mobile-object-detail]').waitFor();

    await tabletPage.setViewportSize({ width: 844, height: 1024 });
    await tabletPage.waitForFunction(() => innerWidth === 844);
    await tabletPage.locator('[data-mobile-domain-workspace="interfaces"][data-mobile-domain-layout="workbench"]').waitFor();
    const tablet844 = await inspectTabletWorkspace();
    check(
      checks,
      '844px tablet keeps the object list visible beside selected evidence',
      Boolean(
        tablet844.nav && tablet844.layout && tablet844.list && tablet844.inspector &&
        tablet844.mode === 'workbench' &&
        tablet844.nav.right <= tablet844.layout.left + 1 &&
        tablet844.list.right <= tablet844.inspector.left + 1 &&
        tablet844.list.width >= 288 && tablet844.list.width <= 336 &&
        tablet844.inspector.width >= 420 &&
        Math.abs(tablet844.layout.bottom - tablet844.viewport.height) <= 3 &&
        tablet844.listOverflowY === 'auto' && tablet844.inspectorOverflowY === 'auto' &&
        tablet844.inspectorHeaderPosition === 'sticky' && tablet844.inspectorHeaderTop === '0px' &&
        tablet844.columns.split(' ').length >= 2 && tablet844.detailId && !tablet844.previewId &&
        tablet844.overflow <= 1
      ),
      tablet844
    );
    const tablet844StickyContext = await tabletPage.evaluate(async () => {
      const inspector = document.querySelector('.mdw-inspector');
      if (!(inspector instanceof HTMLElement)) return null;
      inspector.scrollTop = inspector.scrollHeight;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const header = inspector.querySelector(':scope > header');
      const evidence = inspector.querySelector(':scope > .mdi-evidence');
      const heading = inspector.querySelector(':scope > .mdi-object-heading');
      const rect = (node) => {
        if (!(node instanceof Element)) return null;
        const box = node.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom };
      };
      return {
        scrollTop: inspector.scrollTop,
        scrollRange: inspector.scrollHeight - inspector.clientHeight,
        inspector: rect(inspector),
        header: rect(header),
        evidence: rect(evidence),
        heading: rect(heading),
        headerPosition: header ? getComputedStyle(header).position : '',
        evidencePosition: evidence ? getComputedStyle(evidence).position : '',
        headingPosition: heading ? getComputedStyle(heading).position : '',
      };
    });
    check(
      checks,
      '844px tablet keeps object identity and evidence context sticky, scrolling only when content overflows',
      Boolean(
        tablet844StickyContext &&
        (tablet844StickyContext.scrollRange <= 1 || tablet844StickyContext.scrollTop > 0) &&
        tablet844StickyContext.inspector && tablet844StickyContext.header &&
        tablet844StickyContext.evidence && tablet844StickyContext.heading &&
        tablet844StickyContext.headerPosition === 'sticky' &&
        tablet844StickyContext.evidencePosition === 'sticky' &&
        tablet844StickyContext.headingPosition === 'sticky' &&
        tablet844StickyContext.header.top >= tablet844StickyContext.inspector.top - 1 &&
        tablet844StickyContext.evidence.top >= tablet844StickyContext.header.bottom - 1 &&
        tablet844StickyContext.heading.top >= tablet844StickyContext.evidence.bottom - 1 &&
        tablet844StickyContext.heading.bottom <= tablet844StickyContext.inspector.bottom + 1
      ),
      tablet844StickyContext
    );
    await tabletPage.evaluate(async () => {
      window.scrollTo(0, 0);
      const inspector = document.querySelector('.mdw-inspector');
      if (inspector instanceof HTMLElement) inspector.scrollTop = 0;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    screenshots.push(await screenshot(tabletPage, 'tablet-network-844.png', 'tablet-network-844'));

    await tabletPage.setViewportSize({ width: 768, height: 1024 });
    const denseTerminalTarget = new URL(mock.url);
    denseTerminalTarget.searchParams.set('section', 'terminals');
    await tabletPage.goto(denseTerminalTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForPhase(tabletPage, 'current');
    await tabletPage.waitForFunction(() => (
      document.querySelectorAll('[data-mobile-domain-workspace="terminals"] [data-mobile-row-id]').length === 20
    ));
    const denseTabletWorkspace = await tabletPage.evaluate(() => {
      const workspace = document.querySelector('[data-mobile-domain-workspace="terminals"]');
      const preview = workspace?.querySelector('[data-mobile-object-preview]');
      const layout = workspace?.querySelector('.mdw-layout');
      return {
        layout: workspace?.getAttribute('data-mobile-domain-layout') || '',
        rows: workspace?.querySelectorAll('[data-mobile-row-id]').length || 0,
        preview: preview?.getAttribute('data-mobile-object-preview') || '',
        previewLabel: preview?.querySelector(':scope > header > span')?.textContent?.trim() || '',
        previewName: preview?.querySelector('.mdi-object-heading h2')?.textContent?.trim() || '',
        inspector: Boolean(workspace?.querySelector('.mdw-inspector')),
        detail: workspace?.querySelector('[data-mobile-object-detail]')?.getAttribute('data-mobile-object-detail') || '',
        selectedRows: workspace?.querySelectorAll('[data-mobile-row-id][aria-current="true"]').length || 0,
        objectQuery: new URLSearchParams(location.search).get('object'),
        columns: layout ? getComputedStyle(layout).gridTemplateColumns : '',
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    check(
      checks,
       '768px tablet collections wait for a real selection when no semantic preview candidate exists',
       denseTabletWorkspace.layout === 'tablet-list' && denseTabletWorkspace.rows === 20 &&
        !denseTabletWorkspace.preview && !denseTabletWorkspace.previewLabel && !denseTabletWorkspace.inspector &&
        !denseTabletWorkspace.detail && denseTabletWorkspace.selectedRows === 0 &&
        denseTabletWorkspace.objectQuery === null &&
        (denseTabletWorkspace.columns === 'none' || denseTabletWorkspace.columns.split(' ').length === 1) &&
        denseTabletWorkspace.overflow <= 1,
      denseTabletWorkspace
    );
    const denseTerminalTrigger = tabletPage.locator('[data-mobile-domain-workspace="terminals"] [data-mobile-row-id]').first();
    const denseTerminalTriggerId = await denseTerminalTrigger.getAttribute('data-mobile-row-id');
    await denseTerminalTrigger.click();
    await tabletPage.locator('[data-mobile-domain-workspace="terminals"] [data-mobile-object-detail]').waitFor();
    const denseTabletSelection = await tabletPage.evaluate((expectedId) => {
      const workspace = document.querySelector('[data-mobile-domain-workspace="terminals"]');
      const layout = workspace?.querySelector('.mdw-layout');
      const listPane = workspace?.querySelector('.mdw-list-pane');
      const detail = workspace?.querySelector('[data-mobile-object-detail]');
      return {
        expectedId,
        layout: workspace?.getAttribute('data-mobile-domain-layout') || '',
        selectedRows: workspace?.querySelectorAll('[data-mobile-row-id][aria-current="true"]').length || 0,
        selectedId: workspace?.querySelector('[data-mobile-row-id][aria-current="true"]')?.getAttribute('data-mobile-row-id') || '',
        detailId: detail?.getAttribute('data-mobile-object-detail') || '',
        detailKind: detail?.getAttribute('data-domain-inspector-kind') || '',
        objectQuery: new URLSearchParams(location.search).get('object'),
        listVisible: listPane ? getComputedStyle(listPane).display !== 'none' : false,
        columns: layout ? getComputedStyle(layout).gridTemplateColumns : '',
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    }, denseTerminalTriggerId);
    const denseTabletColumns = denseTabletSelection.columns
      .split(/\s+/)
      .map((value) => Number.parseFloat(value))
      .filter(Number.isFinite);
    check(
      checks,
       '768px dense collection keeps a real master-detail workbench after explicit selection',
       denseTabletSelection.layout === 'workbench' && denseTabletSelection.selectedRows === 1 &&
        denseTabletSelection.expectedId && denseTabletSelection.selectedId === denseTabletSelection.expectedId &&
        denseTabletSelection.detailId === denseTabletSelection.expectedId &&
        denseTabletSelection.objectQuery === denseTabletSelection.expectedId &&
        denseTabletSelection.detailKind === 'terminal' && denseTabletSelection.listVisible &&
         denseTabletColumns.length >= 2 && denseTabletColumns[0] >= 268 && denseTabletColumns[1] >= 420 &&
        denseTabletSelection.overflow <= 1,
      denseTabletSelection
    );
    screenshots.push(await screenshot(tabletPage, 'tablet-terminals-detail-768.png', 'tablet-terminals-detail-768'));

    async function inspectCapabilityBoundary(width, height = 820) {
      await tabletPage.setViewportSize({ width, height });
      const mobile = width < 1200;
      await tabletPage.locator(mobile
        ? '[data-mobile-domain-workspace="interfaces"]'
        : '[data-desktop-domain-workspace="interfaces"]'
      ).waitFor();
      if (mobile) {
        const expectedLayout = width <= 599 || height < 700
          ? 'phone-list'
          : width <= 767
            ? 'compact-list'
            : 'workbench';
        await tabletPage.waitForFunction((expected) => (
          document.querySelector('[data-mobile-domain-workspace="interfaces"]')
            ?.getAttribute('data-mobile-domain-layout') === expected
        ), expectedLayout);
      }
      return tabletPage.evaluate(() => {
        const layoutNode = document.querySelector('.mdw-layout');
        const listNode = document.querySelector('.mdw-list-pane');
        const layoutRect = layoutNode?.getBoundingClientRect();
        const listRect = listNode?.getBoundingClientRect();
        return {
          // Compact two-layer mode deliberately does not mount an inactive
          // inspector; a missing element is therefore the expected "none".
          mobile: Boolean(document.querySelector('[data-mobile-domain-workspace="interfaces"]')),
          desktop: Boolean(document.querySelector('[data-desktop-domain-workspace="interfaces"]')),
          layout: document.querySelector('[data-mobile-domain-workspace]')?.getAttribute('data-mobile-domain-layout') || '',
          navLabels: [...document.querySelectorAll('.panel-task-navigation button span')].map((node) => node.textContent?.trim() || ''),
          rail: getComputedStyle(document.querySelector('.panel-task-navigation')).display,
          list: listNode ? getComputedStyle(listNode).display : 'none',
          inspector: document.querySelector('.mdw-inspector') ? getComputedStyle(document.querySelector('.mdw-inspector')).display : 'none',
          layoutWidth: layoutRect ? Math.round(layoutRect.width) : 0,
          listWidth: listRect ? Math.round(listRect.width) : 0,
          listFillsLayout: Boolean(
            layoutRect &&
            listRect &&
            layoutRect.width > 0 &&
            listRect.width >= layoutRect.width - 2 &&
            Math.abs(listRect.left - layoutRect.left) <= 2 &&
            Math.abs(listRect.right - layoutRect.right) <= 2
          ),
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      });
    }

    await tabletPage.goto(new URL('/?section=interfaces#interfaces', mock.url).toString(), { waitUntil: 'domcontentloaded' });
    await waitForPhase(tabletPage, 'current');
    const boundary599 = await inspectCapabilityBoundary(599);
    const boundary600 = await inspectCapabilityBoundary(600);
    const boundary767 = await inspectCapabilityBoundary(767);
    const boundary667Short = await inspectCapabilityBoundary(667, 375);
    screenshots.push(await screenshot(tabletPage, 'domain-list-667x375.png', 'domain-list-667x375'));
    const boundary844Short = await inspectCapabilityBoundary(844, 390);
    screenshots.push(await screenshot(tabletPage, 'domain-list-844x390.png', 'domain-list-844x390'));
    const boundary768 = await inspectCapabilityBoundary(768);
    const boundary771 = await inspectCapabilityBoundary(771);
    const boundary772 = await inspectCapabilityBoundary(772);
    const boundary1199 = await inspectCapabilityBoundary(1199);
    const boundary1200 = await inspectCapabilityBoundary(1200);
    const boundary1365 = await inspectCapabilityBoundary(1365);
    screenshots.push(await screenshot(tabletPage, 'desktop-continuity-1365.png', 'desktop-continuity-1365'));
    const boundary1366 = await inspectCapabilityBoundary(1366);
    screenshots.push(await screenshot(tabletPage, 'desktop-continuity-1366.png', 'desktop-continuity-1366'));
    const boundary1440 = await inspectCapabilityBoundary(1440);
    screenshots.push(await screenshot(tabletPage, 'desktop-continuity-1440.png', 'desktop-continuity-1440'));
    check(
      checks,
      'capability boundaries keep a single task grammar and do not create a 1365/1366 product cliff',
      boundary599.mobile && boundary599.layout === 'phone-list' && boundary599.rail === 'grid' &&
        boundary600.mobile && boundary600.layout === 'compact-list' && boundary600.list !== 'none' && boundary600.inspector === 'none' &&
        boundary767.mobile && boundary767.layout === 'compact-list' && boundary767.list !== 'none' && boundary767.inspector === 'none' &&
         boundary768.mobile && boundary768.layout === 'workbench' && boundary768.list !== 'none' && boundary768.inspector !== 'none' &&
         boundary771.mobile && boundary771.layout === 'workbench' && boundary771.list !== 'none' && boundary771.inspector !== 'none' &&
        boundary772.mobile && boundary772.layout === 'workbench' && boundary772.list !== 'none' && boundary772.inspector !== 'none' &&
        boundary1199.mobile && boundary1199.layout === 'workbench' && boundary1199.list !== 'none' && boundary1199.inspector !== 'none' &&
        [boundary1200, boundary1365, boundary1366, boundary1440].every((item) => item.desktop && !item.mobile && item.rail === 'grid') &&
        boundary1365.navLabels.join('|') === boundary1366.navLabels.join('|') &&
        boundary1366.navLabels.join('|') === boundary1440.navLabels.join('|') &&
        [boundary599, boundary600, boundary767, boundary768, boundary771, boundary772, boundary1199, boundary1200, boundary1365, boundary1366, boundary1440].every((item) => item.overflow <= 1),
      { boundary599, boundary600, boundary767, boundary768, boundary771, boundary772, boundary1199, boundary1200, boundary1365, boundary1366, boundary1440 }
    );
    check(
      checks,
      'short-landscape list tasks consume the workspace instead of reserving an empty inspector column',
      boundary667Short.mobile && boundary667Short.layout === 'phone-list' &&
        boundary667Short.inspector === 'none' && boundary667Short.listFillsLayout &&
        boundary844Short.mobile && boundary844Short.layout === 'phone-list' &&
        boundary844Short.inspector === 'none' && boundary844Short.listFillsLayout &&
        boundary667Short.overflow <= 1 && boundary844Short.overflow <= 1,
      { boundary667Short, boundary844Short }
    );
    await tabletPage.setViewportSize({ width: 1199, height: 820 });
    await tabletPage.locator('[data-mobile-domain-workspace="interfaces"]').waitFor();
    const mobileObjectTrigger = tabletPage.locator('[data-mobile-row-id]').first();
    const mobileObjectName = (await mobileObjectTrigger.locator('.mdw-row-copy b').textContent())?.trim() || '';
    await mobileObjectTrigger.click();
    await tabletPage.locator('[data-mobile-object-detail] .mdi-object-heading h2').filter({ hasText: mobileObjectName }).waitFor();
    const mobilePinnedUrl = tabletPage.url();
    screenshots.push(await screenshot(tabletPage, 'tablet-object-continuity-1199.png', 'tablet-object-continuity-1199'));
    await tabletPage.setViewportSize({ width: 1200, height: 820 });
    await tabletPage.locator('[data-desktop-object-detail] .ddi-heading h2').filter({ hasText: mobileObjectName }).waitFor();
    const desktopSurfaceUrl = tabletPage.url();
    const desktopBridgeTrigger = tabletPage.locator('[data-desktop-row-id]').filter({ hasText: 'bridge-lan' }).locator('button').first();
    await desktopBridgeTrigger.click();
    await tabletPage.locator('[data-desktop-object-detail] .ddi-heading h2').filter({ hasText: 'bridge-lan' }).waitFor();
    const desktopPinnedUrl = tabletPage.url();
    await tabletPage.goBack();
    await tabletPage.locator('[data-desktop-object-detail] .ddi-heading h2').filter({ hasText: mobileObjectName }).waitFor();
    await tabletPage.setViewportSize({ width: 1199, height: 820 });
    await tabletPage.locator('[data-mobile-object-detail] .mdi-object-heading h2').filter({ hasText: mobileObjectName }).waitFor();
    await tabletPage.setViewportSize({ width: 1200, height: 820 });
    await tabletPage.locator('[data-desktop-object-detail] .ddi-heading h2').filter({ hasText: mobileObjectName }).waitFor();
    await tabletPage.goForward();
    await tabletPage.locator('[data-desktop-object-detail] .ddi-heading h2').filter({ hasText: 'bridge-lan' }).waitFor();
    const desktopForwardUrl = tabletPage.url();
    check(
      checks,
      'selected object and Back/Forward stay continuous across the 1199/1200 surface transition',
      mobilePinnedUrl === desktopSurfaceUrl && desktopPinnedUrl === desktopForwardUrl &&
        new URL(desktopForwardUrl).searchParams.has('object') &&
        !await tabletPage.locator('[data-mobile-domain-workspace]').count(),
      { mobileObjectName, mobilePinnedUrl, desktopSurfaceUrl, desktopPinnedUrl, desktopForwardUrl }
    );
    await tabletPage.goBack();
    await tabletPage.locator('[data-desktop-object-detail] .ddi-heading h2').filter({ hasText: mobileObjectName }).waitFor();
    screenshots.push(await screenshot(tabletPage, 'desktop-object-continuity-1200.png', 'desktop-object-continuity-1200'));
    for (const contract of domainRouteContracts) {
      const target = new URL(mock.url);
      target.searchParams.set('section', contract.route);
      target.hash = contract.route;
      await tabletPage.goto(target.toString(), { waitUntil: 'domcontentloaded' });
      await waitForPhase(tabletPage, 'current');
      await tabletPage.locator(`[data-desktop-domain-workspace="${contract.route}"]`).waitFor();
      const automaticDetail = await tabletPage.locator('[data-desktop-object-detail]').count();
      check(
        checks,
        `desktop ${contract.route} only opens an automatic inspector for semantic evidence`,
        Boolean(automaticDetail) === Boolean(contract.autoPreview),
        { route: contract.route, automaticDetail, expected: Boolean(contract.autoPreview) }
      );
      if (contract.route === 'connections') {
        const emptyInspector = await tabletPage.evaluate(() => ({
          heading: document.querySelector('.ddw-inspector.is-empty h2')?.textContent?.trim() || '',
          message: document.querySelector('.ddw-inspector.is-empty p')?.textContent?.trim() || '',
        }));
        check(
          checks,
          'desktop generic rows prompt explicit selection instead of claiming that evidence is missing',
          emptyInspector.heading === '未选择对象' && emptyInspector.message === '从列表打开证据',
          emptyInspector
        );
        screenshots.push(await screenshot(tabletPage, 'desktop-connections-no-auto-preview.png', 'desktop-connections-no-auto-preview'));
      }
      if (!automaticDetail) {
        const desktopRows = tabletPage.locator('[data-desktop-row-id] button');
        const desktopTrigger = contract.rowText
          ? desktopRows.filter({ hasText: contract.rowText }).first()
          : desktopRows.first();
        await desktopTrigger.click();
        await tabletPage.locator('[data-desktop-object-detail]').waitFor();
      }
      const desktopDomain = await tabletPage.evaluate(() => ({
        route: document.querySelector('[data-desktop-domain-workspace]')?.getAttribute('data-desktop-domain-workspace') || '',
        kind: document.querySelector('[data-desktop-object-detail]')?.getAttribute('data-domain-inspector-kind') || '',
        blocks: document.querySelectorAll('[data-desktop-object-detail] .ddi-block').length,
        search: Boolean(document.querySelector('.ddw-search input[type="search"]')),
        filters: document.querySelectorAll('.ddw-filters button').length,
        sort: Boolean(document.querySelector('.ddw-sort select')),
        pagination: document.querySelector('.ddw-table-pane > footer span')?.textContent || '',
        mobileTree: Boolean(document.querySelector('[data-mobile-domain-workspace]')),
      }));
      check(
        checks,
        `desktop ${contract.route} opens a domain inspector with real object operations`,
        desktopDomain.route === contract.route &&
          desktopDomain.kind === (contract.desktopKind || contract.kind) &&
          desktopDomain.blocks >= 1 &&
          desktopDomain.search === (contract.searchable !== false) &&
          desktopDomain.filters >= 1 &&
          desktopDomain.sort &&
          /\d+\s*\/\s*\d+/.test(desktopDomain.pagination) &&
          !desktopDomain.mobileTree,
        desktopDomain
      );
      if (contract.route === 'logs') {
        const desktopLog = await tabletPage.evaluate(() => {
          const message = document.querySelector('[data-desktop-row-id] button b')?.textContent?.trim() || '';
          const detail = document.querySelector('[data-desktop-object-detail]');
           return {
            message,
            heading: detail?.querySelector('.ddi-heading h2')?.textContent?.trim() || '',
            headingMessageOccurrences: message && detail?.querySelector('.ddi-heading')
              ? detail.querySelector('.ddi-heading')?.textContent?.split(message).length - 1
              : 0,
            bodyMessageOccurrences: message && detail?.querySelector('.ddi-body')
              ? detail.querySelector('.ddi-body')?.textContent?.split(message).length - 1
              : 0,
            semanticBoundary: detail?.querySelector('.ddi-boundary em')?.textContent?.trim() || '',
            objectQuery: new URLSearchParams(location.search).get('object'),
          };
        });
        check(
          checks,
          'historical log preview identifies the event in its heading and keeps body evidence novel',
          desktopLog.heading === desktopLog.message && desktopLog.headingMessageOccurrences === 1 &&
            desktopLog.bodyMessageOccurrences === 0 &&
            desktopLog.semanticBoundary === '语义预览' && desktopLog.objectQuery === null,
          desktopLog
        );
        screenshots.push(await screenshot(tabletPage, 'desktop-log-semantic-preview.png', 'desktop-log-semantic-preview'));
      }
    }

    const adaptivePage = await tabletContext.newPage();
    adaptivePage.setDefaultTimeout(actionTimeout);
    adaptivePage.setDefaultNavigationTimeout(15000);
    adaptivePage.on('pageerror', (error) => pageErrors.push('adaptive-preview: ' + error.message));

    mock.state.scenario = 'collection-down';
    await adaptivePage.setViewportSize({ width: 390, height: 844 });
    const historicalLogTarget = new URL(mock.url);
    historicalLogTarget.searchParams.set('section', 'logs');
    const beforeHistoricalLog = mock.state.snapshotCalls;
    await adaptivePage.goto(historicalLogTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForCalls(mock.state, beforeHistoricalLog, 'historical log phone list', 12000);
    await waitForPhase(adaptivePage, 'current', 12000);
    await adaptivePage.locator('[data-mobile-domain-workspace="logs"]').waitFor();
    await adaptivePage.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const historicalLogList = await adaptivePage.evaluate(() => {
      const workspace = document.querySelector('[data-mobile-domain-workspace="logs"]');
      const preview = workspace?.querySelector('[data-mobile-object-preview]');
      const message = 'pppoe-wan1 link renegotiated';
      const rows = [...(workspace?.querySelectorAll('[data-mobile-row-id]') || [])];
      const firstRowRect = rows[0]?.getBoundingClientRect();
      return {
        layout: workspace?.getAttribute('data-mobile-domain-layout') || '',
        evidenceMode: workspace?.getAttribute('data-mobile-evidence-mode') || '',
        preview: Boolean(preview),
        detail: Boolean(workspace?.querySelector('[data-mobile-object-detail]')),
        firstRow: rows[0]?.getAttribute('data-mobile-row-id') || '',
        rows: rows.length,
        firstRowTop: firstRowRect?.top ?? null,
        messageOccurrences: (workspace?.textContent || '').split(message).length - 1,
        metricStrip: Boolean(workspace?.querySelector('.mdw-metrics')),
        selectedRows: workspace?.querySelectorAll('[data-mobile-row-id][aria-current="true"]').length || 0,
        objectQuery: new URLSearchParams(location.search).get('object'),
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    screenshots.push(await screenshot(adaptivePage, 'mobile-log-phone-list-390.png', 'mobile-log-phone-list-390'));
    check(
      checks,
      'phone log list compares records without an automatic preview or implicit selection',
      historicalLogList.layout === 'phone-list' && historicalLogList.evidenceMode === 'historical' &&
        !historicalLogList.preview && !historicalLogList.detail && historicalLogList.rows >= 3 &&
        historicalLogList.firstRow && historicalLogList.messageOccurrences === 1 &&
        !historicalLogList.metricStrip && historicalLogList.firstRowTop <= 210 &&
        historicalLogList.selectedRows === 0 &&
        historicalLogList.objectQuery === null && historicalLogList.overflow <= 1,
      historicalLogList
    );

    const phoneLogListWidths = [];
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 360, height: 800 },
      { width: 375, height: 667 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
    ]) {
      await adaptivePage.setViewportSize(viewport);
      await adaptivePage.waitForFunction(() => (
        document.querySelector('[data-mobile-domain-workspace="logs"]')
          ?.getAttribute('data-mobile-domain-layout') === 'phone-list'
      ));
      phoneLogListWidths.push(await adaptivePage.evaluate(({ width, height }) => {
        const workspace = document.querySelector('[data-mobile-domain-workspace="logs"]');
        const rowTargets = [...(workspace?.querySelectorAll('[data-mobile-row-id]') || [])]
          .map((row) => row.getBoundingClientRect().height);
        return {
          width,
          height,
          preview: Boolean(workspace?.querySelector('[data-mobile-object-preview]')),
          detail: Boolean(workspace?.querySelector('[data-mobile-object-detail]')),
          objectQuery: new URLSearchParams(location.search).get('object'),
          selectedRows: workspace?.querySelectorAll('[data-mobile-row-id][aria-current="true"]').length || 0,
          rows: rowTargets.length,
          minimumRowTarget: rowTargets.length ? Math.min(...rowTargets) : 0,
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      }, viewport));
    }
    check(
      checks,
      '320–430px phone log lists keep one task grammar, real row targets and no automatic detail',
      phoneLogListWidths.every((state) => (
        !state.preview && !state.detail && state.objectQuery === null && state.selectedRows === 0 &&
        state.rows >= 3 && state.minimumRowTarget >= 44 && state.overflow <= 1
      )),
      phoneLogListWidths
    );
    await adaptivePage.setViewportSize({ width: 390, height: 844 });
    await adaptivePage.waitForFunction(() => (
      document.querySelector('[data-mobile-domain-workspace="logs"]')
        ?.getAttribute('data-mobile-domain-layout') === 'phone-list'
    ));

    const historicalLogTrigger = adaptivePage.locator(`[data-mobile-row-id="${historicalLogList.firstRow}"]`);
    const historicalLogTargetHeight = await historicalLogTrigger.evaluate((node) => node.getBoundingClientRect().height);
    await historicalLogTrigger.click();
    await adaptivePage.locator('[data-mobile-object-detail][data-domain-inspector-kind="log"]').waitFor();
    const explicitHistoricalLogDetail = await adaptivePage.evaluate((message) => {
      const workspace = document.querySelector('[data-mobile-domain-workspace="logs"]');
      const detail = workspace?.querySelector('[data-mobile-object-detail][data-domain-inspector-kind="log"]');
      const heading = detail?.querySelector('#mdw-detail-title');
      const body = detail?.querySelector('.mdi-domain-body');
      const bodyRect = body?.getBoundingClientRect();
      const bodyStyle = body ? getComputedStyle(body) : null;
      const shell = workspace;
      const shellStyle = shell ? getComputedStyle(shell) : null;
      const sectionTitles = [...(body?.querySelectorAll('.mdi-section') || [])].map((section) => (
        section.querySelector(':scope > header h3')?.textContent?.trim() || ''
      ));
      const eventEvidenceSection = [...(body?.querySelectorAll('.mdi-section') || [])].find((section) => (
        section.querySelector(':scope > header h3')?.textContent?.trim() === '事件证据'
      )) || null;
      const eventBodyFact = [...(eventEvidenceSection?.querySelectorAll('.mdi-facts > div') || [])].find((fact) => (
        fact.querySelector(':scope > small')?.textContent?.trim() === '事件正文'
      )) || null;
      return {
        layout: workspace?.getAttribute('data-mobile-domain-layout') || '',
        object: detail?.getAttribute('data-mobile-object-detail') || '',
        detailOwner: detail?.getAttribute('data-mobile-log-detail') || '',
        novelEvidence: detail?.getAttribute('data-mobile-detail-novel-evidence') || '',
        objectQuery: new URLSearchParams(location.search).get('object'),
          headingText: heading?.textContent?.trim() || '',
          headingOccurrences: (heading?.textContent || '').split(message).length - 1,
          bodyOccurrences: (body?.textContent || '').split(message).length - 1,
          eventBodyText: eventBodyFact?.querySelector(':scope > b')?.textContent?.trim() || '',
        detailFocused: document.activeElement === heading,
        eventEvidencePresent: sectionTitles.includes('事件证据'),
        neighborEvidencePresent: sectionTitles.includes('相邻事件'),
        preview: Boolean(workspace?.querySelector('[data-mobile-object-preview]')),
        bodyInset: bodyRect ? bodyRect.left + (innerWidth - bodyRect.right) : Number.POSITIVE_INFINITY,
        bodyRadius: Number.parseFloat(bodyStyle?.borderTopLeftRadius || '999'),
        bodyBorder: ['Top', 'Right', 'Bottom', 'Left'].reduce((sum, side) => (
          sum + Number.parseFloat(bodyStyle?.[`border${side}Width`] || '0')
        ), 0),
        shellMinHeight: shellStyle?.minHeight || '',
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    }, 'pppoe-wan1 link renegotiated');
    screenshots.push(await screenshot(adaptivePage, 'mobile-log-explicit-detail-390.png', 'mobile-log-explicit-detail-390'));
    await adaptivePage.goBack();
    await adaptivePage.waitForFunction(() => !document.querySelector('[data-mobile-object-detail]'));
    const historicalLogBack = await adaptivePage.evaluate((id) => ({
      layout: document.querySelector('[data-mobile-domain-workspace="logs"]')?.getAttribute('data-mobile-domain-layout') || '',
      focused: document.activeElement?.getAttribute('data-mobile-row-id') === id,
      preview: Boolean(document.querySelector('[data-mobile-object-preview]')),
      objectQuery: new URLSearchParams(location.search).get('object'),
    }), historicalLogList.firstRow);
    await adaptivePage.goForward();
    await adaptivePage.locator('[data-mobile-object-detail][data-domain-inspector-kind="log"]').waitFor();
    const historicalLogForward = await adaptivePage.evaluate(() => ({
      objectQuery: new URLSearchParams(location.search).get('object'),
      detailFocused: document.activeElement?.id === 'mdw-detail-title',
    }));
    check(
      checks,
      'mobile-log-detail-surface-v1: explicit phone log detail owns novel evidence and natural height',
      historicalLogTargetHeight >= 44 && explicitHistoricalLogDetail.layout === 'phone-detail' &&
        explicitHistoricalLogDetail.object === historicalLogList.firstRow &&
        explicitHistoricalLogDetail.detailOwner === 'v1' &&
        ['time', 'topics', 'source', 'neighbors', 'identity'].every((token) => explicitHistoricalLogDetail.novelEvidence.includes(token)) &&
        explicitHistoricalLogDetail.objectQuery === historicalLogList.firstRow &&
        explicitHistoricalLogDetail.headingText === '日志事件' &&
        explicitHistoricalLogDetail.headingOccurrences === 0 && explicitHistoricalLogDetail.bodyOccurrences === 1 &&
        explicitHistoricalLogDetail.eventBodyText === 'pppoe-wan1 link renegotiated' &&
        explicitHistoricalLogDetail.detailFocused && explicitHistoricalLogDetail.eventEvidencePresent &&
        explicitHistoricalLogDetail.neighborEvidencePresent && !explicitHistoricalLogDetail.preview &&
        explicitHistoricalLogDetail.bodyInset <= 1 && explicitHistoricalLogDetail.bodyRadius === 0 &&
        explicitHistoricalLogDetail.bodyBorder === 0 &&
        ['auto', '0px'].includes(explicitHistoricalLogDetail.shellMinHeight) &&
        explicitHistoricalLogDetail.overflow <= 1 && historicalLogBack.layout === 'phone-list' &&
        historicalLogBack.focused && !historicalLogBack.preview && historicalLogBack.objectQuery === null &&
        historicalLogForward.objectQuery === historicalLogList.firstRow && historicalLogForward.detailFocused,
      { historicalLogList, historicalLogTargetHeight, explicitHistoricalLogDetail, historicalLogBack, historicalLogForward }
    );

    const diagnosticTarget = new URL(mock.url);
    diagnosticTarget.searchParams.set('section', 'readonlyDiagnostics');
    const beforeDiagnostic = mock.state.snapshotCalls;
    await adaptivePage.goto(diagnosticTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForCalls(mock.state, beforeDiagnostic, 'diagnostic evidence workspace', 12000);
    await waitForPhase(adaptivePage, 'current', 12000);
    await adaptivePage.locator('[data-mobile-domain-workspace="readonlyDiagnostics"]').waitFor();
    const diagnosticRow = adaptivePage.locator('[data-mobile-domain-workspace="readonlyDiagnostics"] [data-mobile-row-id]').first();
    const diagnosticTargetHeight = await diagnosticRow.evaluate((node) => node.getBoundingClientRect().height);
    await diagnosticRow.click();
    await adaptivePage.locator('[data-mobile-object-detail]').waitFor();
    const diagnosticDetail = await adaptivePage.evaluate(() => {
      const workspace = document.querySelector('[data-mobile-domain-workspace="readonlyDiagnostics"]');
      const detail = workspace?.querySelector('[data-mobile-object-detail]');
      const recordTimeFact = [...(detail?.querySelectorAll('.mdi-facts > div') || [])].find((node) => node.querySelector('small')?.textContent?.trim() === '记录时间');
      const clippedText = [...(detail?.querySelectorAll('h2, h3, p, small, b, em, dt, dd, span') || [])]
        .filter((node) => {
          const style = getComputedStyle(node);
          const bounds = node.getBoundingClientRect();
          if (style.display === 'none' || style.visibility === 'hidden' || bounds.width <= 0 || bounds.height <= 0) return false;
          return (node.scrollWidth > node.clientWidth + 1 && style.overflowX !== 'visible') ||
            (node.scrollHeight > node.clientHeight + 1 && style.overflowY !== 'visible');
        })
        .map((node) => (node.textContent || '').trim());
      return {
        rows: workspace?.querySelectorAll('[data-mobile-row-id]').length || 0,
        kind: detail?.getAttribute('data-domain-inspector-kind') || '',
        text: (detail?.textContent || '').replace(/\s+/g, ' ').trim(),
        heading: detail?.querySelector('.mdi-object-heading h2')?.textContent?.trim() || '',
        subtitle: detail?.querySelector('.mdi-object-heading p')?.textContent?.trim() || '',
        context: detail?.querySelector('.mdi-object-heading small')?.textContent?.trim() || '',
        state: detail?.querySelector('.mdi-object-heading > b')?.textContent?.trim() || '',
        evidenceStatus: detail?.querySelector('.mdi-evidence small')?.textContent?.trim() || '',
        recordTimeText: recordTimeFact?.querySelector('b')?.textContent?.trim() || '',
        sectionTitles: [...(detail?.querySelectorAll('.mdi-section > header h3') || [])].map((node) => node.textContent?.trim() || ''),
        warningSections: detail?.querySelectorAll('.mdi-section.is-warn, .mdi-section.is-danger').length || 0,
        objectQuery: new URLSearchParams(location.search).get('object'),
        overflow: document.documentElement.scrollWidth - innerWidth,
        clippedText,
      };
    });
    screenshots.push(await screenshot(adaptivePage, 'mobile-diagnostic-inspector-390.png', 'mobile-diagnostic-inspector-390'));
    check(
      checks,
      'diagnostic detail adds typed channel, endpoint and failure-scope evidence instead of replaying generic columns',
      diagnosticDetail.rows === 4 && diagnosticDetail.kind === 'diagnostic' &&
        diagnosticDetail.heading === 'system_resource' && diagnosticDetail.subtitle === '/rest/system/resource' &&
        diagnosticDetail.context.includes('静态 REST') && diagnosticDetail.state === '失败记录' &&
        diagnosticDetail.evidenceStatus === '历史诊断记录 · 不代表当前' &&
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [+-]\d{2}:\d{2}$/.test(diagnosticDetail.recordTimeText) &&
        diagnosticDetail.sectionTitles.join('|') === '失败记录证据|记录范围' &&
        diagnosticDetail.warningSections === 0 &&
        diagnosticDetail.text.includes('采集通道') && diagnosticDetail.text.includes('/rest/') &&
        diagnosticDetail.text.includes('不证明转发面或外部业务中断') &&
        !diagnosticDetail.text.includes('该低频对象尚未建立专用关系模型') &&
        diagnosticTargetHeight >= 44 && diagnosticDetail.objectQuery &&
        diagnosticDetail.overflow <= 1 && diagnosticDetail.clippedText.length === 0,
      { diagnosticTargetHeight, diagnosticDetail }
    );
    await adaptivePage.goBack();
    await adaptivePage.waitForFunction(() => !document.querySelector('[data-mobile-object-detail]'));
    await adaptivePage.goForward();
    await adaptivePage.locator('[data-mobile-object-detail][data-domain-inspector-kind="diagnostic"]').waitFor();
    check(
      checks,
      'diagnostic object detail participates in browser Back and Forward state',
      new URL(adaptivePage.url()).searchParams.has('object')
    );

    await adaptivePage.setViewportSize({ width: 844, height: 1024 });
    await adaptivePage.waitForFunction(() => (
      document.querySelector('[data-mobile-domain-workspace="readonlyDiagnostics"]')?.getAttribute('data-mobile-domain-layout') === 'workbench'
    ));
    const tabletDiagnostic = await adaptivePage.evaluate(() => {
      const workspace = document.querySelector('[data-mobile-domain-workspace="readonlyDiagnostics"]');
      const list = workspace?.querySelector('.mdw-list-pane');
      const detail = workspace?.querySelector('[data-mobile-object-detail][data-domain-inspector-kind="diagnostic"]');
      const recordTimeFact = [...(detail?.querySelectorAll('.mdi-facts > div') || [])].find((node) => node.querySelector('small')?.textContent?.trim() === '记录时间');
      const listRect = list?.getBoundingClientRect();
      const detailRect = detail?.getBoundingClientRect();
      return {
        layout: workspace?.getAttribute('data-mobile-domain-layout') || '',
        heading: detail?.querySelector('.mdi-object-heading h2')?.textContent?.trim() || '',
        state: detail?.querySelector('.mdi-object-heading > b')?.textContent?.trim() || '',
        evidenceStatus: detail?.querySelector('.mdi-evidence small')?.textContent?.trim() || '',
        sectionTitles: [...(detail?.querySelectorAll('.mdi-section > header h3') || [])].map((node) => node.textContent?.trim() || ''),
        recordTimeText: recordTimeFact?.querySelector('b')?.textContent?.trim() || '',
        listWidth: listRect?.width || 0,
        detailWidth: detailRect?.width || 0,
        listVisible: Boolean(list && getComputedStyle(list).display !== 'none'),
        detailVisible: Boolean(detail && getComputedStyle(detail).display !== 'none'),
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    screenshots.push(await screenshot(adaptivePage, 'tablet-diagnostic-inspector-844.png', 'tablet-diagnostic-inspector-844'));
    check(
      checks,
      'tablet diagnostic workbench keeps the endpoint list and object-first evidence visible together',
      tabletDiagnostic.layout === 'workbench' && tabletDiagnostic.heading === 'system_resource' &&
        tabletDiagnostic.state === '失败记录' && tabletDiagnostic.sectionTitles.join('|') === '失败记录证据|记录范围' &&
        tabletDiagnostic.evidenceStatus === '历史诊断记录 · 不代表当前' &&
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [+-]\d{2}:\d{2}$/.test(tabletDiagnostic.recordTimeText) &&
        tabletDiagnostic.listVisible && tabletDiagnostic.detailVisible &&
        tabletDiagnostic.listWidth >= 288 && tabletDiagnostic.detailWidth >= 420 &&
        tabletDiagnostic.overflow <= 1,
      tabletDiagnostic
    );

    await adaptivePage.setViewportSize({ width: 1366, height: 768 });
    const beforeDesktopDiagnostic = mock.state.snapshotCalls;
    await adaptivePage.goto(diagnosticTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForCalls(mock.state, beforeDesktopDiagnostic, 'desktop diagnostic evidence workspace', 12000);
    await waitForPhase(adaptivePage, 'current', 12000);
    const desktopDiagnosticWorkspace = adaptivePage.locator('[data-desktop-domain-workspace="readonlyDiagnostics"]');
    await desktopDiagnosticWorkspace.waitFor();
    await desktopDiagnosticWorkspace.locator('[data-desktop-row-id] button').first().click();
    await desktopDiagnosticWorkspace.locator('[data-desktop-object-detail][data-domain-inspector-kind="diagnostic"]').waitFor();
    const desktopDiagnosticDetail = await adaptivePage.evaluate(() => {
      const workspace = document.querySelector('[data-desktop-domain-workspace="readonlyDiagnostics"]');
      const detail = workspace?.querySelector('[data-desktop-object-detail]');
      const metricGrid = document.querySelector('.panel-section-metrics[data-metric-count="4"]');
      const historyBoundary = document.querySelector('.panel-section-status');
      const metricRects = [...(metricGrid?.children || [])].map((node) => node.getBoundingClientRect());
      const metricGridRect = metricGrid?.getBoundingClientRect();
      const detailHeading = detail?.querySelector('.ddi-heading h2');
      const detailPath = detail?.querySelector('.ddi-heading p');
      const recordTimeLabel = [...(detail?.querySelectorAll('dt') || [])].find((node) => node.textContent?.trim() === '记录时间');
      const recordTimeRow = recordTimeLabel?.parentElement;
      const clippedText = [...(detail?.querySelectorAll('h2, h3, p, small, b, em, dt, dd, span') || [])]
        .filter((node) => {
          const style = getComputedStyle(node);
          const bounds = node.getBoundingClientRect();
          if (style.display === 'none' || style.visibility === 'hidden' || bounds.width <= 0 || bounds.height <= 0) return false;
          return (node.scrollWidth > node.clientWidth + 1 && style.overflowX !== 'visible') ||
            (node.scrollHeight > node.clientHeight + 1 && style.overflowY !== 'visible');
        })
        .map((node) => node.textContent?.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      return {
        rows: workspace?.querySelectorAll('[data-desktop-row-id]').length || 0,
        kind: detail?.getAttribute('data-domain-inspector-kind') || '',
        text: (detail?.textContent || '').replace(/\s+/g, ' ').trim(),
        heading: detail?.querySelector('.ddi-heading h2')?.textContent?.trim() || '',
        subtitle: detail?.querySelector('.ddi-heading p')?.textContent?.trim() || '',
        sectionTitles: [...(detail?.querySelectorAll('.ddi-block > header h3') || [])].map((node) => node.textContent?.trim() || ''),
        historyBoundaryText: (historyBoundary?.textContent || '').replace(/\s+/g, ' ').trim(),
        runtimePhaseText: document.querySelector('.panel-runtime-phase span')?.textContent?.trim() || '',
        recordTimeText: recordTimeRow?.querySelector('dd')?.textContent?.trim() || '',
        historyBoundaryTop: historyBoundary?.getBoundingClientRect().top ?? null,
        metricCount: metricRects.length,
        metricRows: new Set(metricRects.map((rect) => Math.round(rect.top))).size,
        metricTop: metricGridRect?.top ?? null,
        metricHeight: metricGridRect?.height ?? null,
        metricDangerCount: metricGrid?.querySelectorAll('.is-danger').length || 0,
        metricWidthDelta: metricRects.length ? Math.max(...metricRects.map((rect) => rect.width)) - Math.min(...metricRects.map((rect) => rect.width)) : null,
        metricEdgeGap: metricGridRect && metricRects.length ? Math.max(Math.abs(metricRects[0].left - metricGridRect.left - 1), Math.abs(metricGridRect.right - metricRects[metricRects.length - 1].right - 1)) : null,
        detailHeadingBottom: detailHeading?.getBoundingClientRect().bottom ?? null,
        detailPathBottom: detailPath?.getBoundingClientRect().bottom ?? null,
        recordTimeBottom: recordTimeRow?.getBoundingClientRect().bottom ?? null,
        objectQuery: new URLSearchParams(location.search).get('object'),
        scrollY: window.scrollY,
        overflow: document.documentElement.scrollWidth - innerWidth,
        clippedText,
      };
    });
    screenshots.push(await screenshot(adaptivePage, 'desktop-diagnostic-inspector-1366.png', 'desktop-diagnostic-inspector-1366'));
    check(
      checks,
      'desktop diagnostic detail exposes the same typed channel, endpoint, scope and evidence boundary',
      desktopDiagnosticDetail.rows === 4 && desktopDiagnosticDetail.kind === 'diagnostic' &&
        desktopDiagnosticDetail.heading === 'system_resource' && desktopDiagnosticDetail.subtitle === '/rest/system/resource' &&
        desktopDiagnosticDetail.historyBoundaryText === '历史诊断记录 · 不代表当前' &&
        desktopDiagnosticDetail.sectionTitles.includes('失败记录证据') &&
        desktopDiagnosticDetail.runtimePhaseText.startsWith('当前快照 · ') &&
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [+-]\d{2}:\d{2}$/.test(desktopDiagnosticDetail.recordTimeText) &&
        !/[TZ]/.test(desktopDiagnosticDetail.recordTimeText) &&
        desktopDiagnosticDetail.historyBoundaryTop < desktopDiagnosticDetail.metricTop &&
        desktopDiagnosticDetail.metricCount === 4 && desktopDiagnosticDetail.metricRows === 1 &&
        desktopDiagnosticDetail.metricHeight <= 128 && desktopDiagnosticDetail.metricDangerCount === 0 &&
        desktopDiagnosticDetail.metricWidthDelta <= 1 && desktopDiagnosticDetail.metricEdgeGap <= 2 &&
        desktopDiagnosticDetail.detailHeadingBottom <= 768 && desktopDiagnosticDetail.detailPathBottom <= 768 &&
        desktopDiagnosticDetail.recordTimeBottom <= 768 &&
        desktopDiagnosticDetail.text.includes('静态 REST') && desktopDiagnosticDetail.text.includes('失败范围') &&
        desktopDiagnosticDetail.text.includes('/rest/system/resource') &&
        desktopDiagnosticDetail.text.includes('不证明转发面或外部业务中断') &&
        !desktopDiagnosticDetail.text.includes('该低频对象尚未建立专用关系模型') &&
        desktopDiagnosticDetail.objectQuery && desktopDiagnosticDetail.scrollY <= 1 && desktopDiagnosticDetail.overflow <= 1 &&
        desktopDiagnosticDetail.clippedText.length === 0,
      desktopDiagnosticDetail
    );

    mock.state.scenario = 'interface-review';
    await adaptivePage.setViewportSize({ width: 844, height: 1024 });
    const interfaceReviewTarget = new URL(mock.url);
    interfaceReviewTarget.searchParams.set('section', 'interfaces');
    const beforeInterfaceReview = mock.state.snapshotCalls;
    await adaptivePage.goto(interfaceReviewTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForCalls(mock.state, beforeInterfaceReview, 'interface review list', 12000);
    await waitForPhase(adaptivePage, 'current', 12000);
    await adaptivePage.locator('[data-mobile-domain-workspace="interfaces"]').waitFor();
    const interfaceReviewState = await adaptivePage.evaluate(() => {
      const workspace = document.querySelector('[data-mobile-domain-workspace="interfaces"]');
      const preview = workspace?.querySelector('[data-mobile-object-preview]');
      return {
        layout: workspace?.getAttribute('data-mobile-domain-layout') || '',
        rows: workspace?.querySelectorAll('[data-mobile-row-id]').length || 0,
        preview: preview?.getAttribute('data-mobile-object-preview') || '',
        previewLabel: preview?.querySelector(':scope > header > span')?.textContent?.trim() || '',
        previewName: preview?.querySelector('.mdi-object-heading h2')?.textContent?.trim() || '',
        attentionRows: workspace?.querySelectorAll('.mdw-row-state.is-attention').length || 0,
        selectedRows: workspace?.querySelectorAll('[data-mobile-row-id][aria-current="true"]').length || 0,
        objectQuery: new URLSearchParams(location.search).get('object'),
        inspector: Boolean(workspace?.querySelector('[data-mobile-object-preview], [data-mobile-object-detail]')),
        text: workspace?.textContent || '',
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    screenshots.push(await screenshot(adaptivePage, 'tablet-interface-review-844.png', 'tablet-interface-review-844'));
    check(
      checks,
      'unclassified non-running interfaces stay out of the risk queue while the verified default outlet may remain previewed',
      interfaceReviewState.rows === 5 && interfaceReviewState.layout === 'workbench' &&
        interfaceReviewState.preview && interfaceReviewState.previewLabel === '默认出口' &&
        interfaceReviewState.previewName === 'pppoe-wan1' &&
        interfaceReviewState.attentionRows === 0 && interfaceReviewState.selectedRows === 0 &&
        interfaceReviewState.objectQuery === null && interfaceReviewState.inspector &&
        interfaceReviewState.text.includes('未运行') && interfaceReviewState.text.includes('影响未判定') &&
        !interfaceReviewState.text.includes('风险对象') &&
        interfaceReviewState.overflow <= 1,
      interfaceReviewState
    );

    const shortTabletListState = await adaptivePage.evaluate(() => {
      const workspace = document.querySelector('[data-mobile-domain-workspace="interfaces"]');
      const listPane = workspace?.querySelector('.mdw-list-pane');
      const relationSurface = workspace?.querySelector('[data-tablet-interface-relations="true"]');
      const rows = workspace?.querySelectorAll('[data-mobile-row-id]').length || 0;
      const relationRows = workspace?.querySelectorAll('[data-tablet-interface-relation-row]').length || 0;
      const nextStepSurface = Boolean(workspace?.querySelector('[data-tablet-workspace-next-step="true"]'));
      const text = workspace?.textContent || '';
      const listRect = listPane?.getBoundingClientRect();
      const relationRect = relationSurface?.getBoundingClientRect();
      return {
        shortList: rows > 0 && rows <= 5,
        relationSurface: Boolean(relationSurface),
        relatedObjectSurface: relationRows > 0,
        nextStepSurface,
        novelEvidenceCount: relationRows + (nextStepSurface ? 1 : 0),
        duplicateOverviewMetrics: (text.match(/当前吞吐/g) || []).length > 0 || (text.match(/当前快照/g) || []).length > 1,
        relationRows,
        listHeight: listRect ? Math.round(listRect.height) : null,
        relationTop: relationRect ? Math.round(relationRect.top) : null,
        relationBottom: relationRect ? Math.round(relationRect.bottom) : null,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    check(
      checks,
      'tablet short-list information efficiency keeps a distinct task surface',
      shortTabletListState.shortList &&
        shortTabletListState.relationSurface &&
        shortTabletListState.novelEvidenceCount > 0 &&
        (shortTabletListState.relatedObjectSurface || shortTabletListState.nextStepSurface) &&
        !shortTabletListState.duplicateOverviewMetrics &&
        shortTabletListState.overflow <= 1,
      shortTabletListState
    );

    mock.state.scenario = 'interfaces-down';
    await adaptivePage.setViewportSize({ width: 844, height: 1024 });
    const interfaceRiskTarget = new URL(mock.url);
    interfaceRiskTarget.searchParams.set('section', 'interfaces');
    const beforeInterfaceRisk = mock.state.snapshotCalls;
    await adaptivePage.goto(interfaceRiskTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForCalls(mock.state, beforeInterfaceRisk, 'interface risk preview', 12000);
    await waitForPhase(adaptivePage, 'current', 12000);
    await adaptivePage.waitForFunction(() => (
      document.querySelector('[data-mobile-domain-workspace="interfaces"]')
        ?.getAttribute('data-mobile-domain-layout') === 'workbench'
    ));
    const interfaceRiskPreview = await adaptivePage.evaluate(() => {
      const workspace = document.querySelector('[data-mobile-domain-workspace="interfaces"]');
      const preview = workspace?.querySelector('[data-mobile-object-preview]');
      return {
        layout: workspace?.getAttribute('data-mobile-domain-layout') || '',
        rows: workspace?.querySelectorAll('[data-mobile-row-id]').length || 0,
        preview: preview?.getAttribute('data-mobile-object-preview') || '',
        previewLabel: preview?.querySelector(':scope > header > span')?.textContent?.trim() || '',
        previewName: preview?.querySelector('.mdi-object-heading h2')?.textContent?.trim() || '',
        text: preview?.textContent || '',
        selectedRows: workspace?.querySelectorAll('[data-mobile-row-id][aria-current="true"]').length || 0,
        objectQuery: new URLSearchParams(location.search).get('object'),
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    screenshots.push(await screenshot(adaptivePage, 'tablet-interface-risk-preview-844.png', 'tablet-interface-risk-preview-844'));
    check(
      checks,
      'observed interface failure outranks the healthy default outlet in the dense tablet preview',
      interfaceRiskPreview.layout === 'workbench' && interfaceRiskPreview.rows === 5 &&
        interfaceRiskPreview.preview && interfaceRiskPreview.previewLabel === '风险对象' &&
        ['ether9', 'vlan30', 'sfp-lan'].includes(interfaceRiskPreview.previewName) &&
        interfaceRiskPreview.text.includes('未运行') && interfaceRiskPreview.previewName !== 'pppoe-wan1' &&
        interfaceRiskPreview.selectedRows === 0 && interfaceRiskPreview.objectQuery === null &&
        interfaceRiskPreview.overflow <= 1,
      interfaceRiskPreview
    );

    const interfaceCollectionTarget = new URL(mock.url);
    interfaceCollectionTarget.searchParams.set('section', 'interfaces');
    interfaceCollectionTarget.searchParams.set('risk', 'interfaces');
    interfaceCollectionTarget.searchParams.set('from', 'overview');
    interfaceCollectionTarget.searchParams.set('evidenceAt', '2026-07-22T06:57:14Z');
    const beforeInterfaceCollection = mock.state.snapshotCalls;
    await adaptivePage.goto(interfaceCollectionTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForCalls(mock.state, beforeInterfaceCollection, 'interface collection context', 12000);
    await waitForPhase(adaptivePage, 'current', 12000);
    await adaptivePage.locator('[data-mobile-domain-workspace="interfaces"]').waitFor();
    const interfaceCollectionContext = await adaptivePage.evaluate(() => {
      const workspace = document.querySelector('[data-mobile-domain-workspace="interfaces"]');
      const context = workspace?.querySelector('.mdw-cl-rows')?.parentElement ||
        workspace?.querySelector('[data-mobile-collection-risk-context="interfaces"]');
      return {
        layout: workspace?.getAttribute('data-mobile-domain-layout') || '',
        contextCount: (workspace?.querySelectorAll('.mdw-cl-rows').length || 0) +
          (workspace?.querySelectorAll('[data-mobile-collection-risk-context="interfaces"]').length || 0),
        contextText: (workspace?.textContent || '').replace(/\s+/g, ' ').trim(),
        contextObjectRows: context?.querySelectorAll('[data-mobile-row-id]').length || 0,
        selectedRows: workspace?.querySelectorAll('[data-mobile-row-id][aria-current="true"]').length || 0,
        objectQuery: new URLSearchParams(location.search).get('object'),
        riskQuery: new URLSearchParams(location.search).get('risk'),
        detail: Boolean(workspace?.querySelector('[data-mobile-object-detail], [data-mobile-object-preview]')),
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    check(
      checks,
      '844px overview risk handoff focuses an explicitly matched risk object while retaining the list',
      interfaceCollectionContext.layout === 'workbench' &&
        interfaceCollectionContext.contextCount === 0 &&
        interfaceCollectionContext.contextText.includes('配置依赖接口') &&
        interfaceCollectionContext.contextText.includes('默认路由') &&
        interfaceCollectionContext.contextText.includes('风险对象') &&
        interfaceCollectionContext.contextText.includes('2026') &&
        interfaceCollectionContext.selectedRows === 0 &&
        interfaceCollectionContext.objectQuery === null &&
        interfaceCollectionContext.riskQuery === 'interfaces' &&
        interfaceCollectionContext.detail && interfaceCollectionContext.overflow <= 1,
      interfaceCollectionContext
    );

    mock.state.scenario = 'resource-full';
    await adaptivePage.setViewportSize({ width: 390, height: 844 });
    const resourceOverviewTarget = new URL(mock.url);
    resourceOverviewTarget.searchParams.set('section', 'overview');
    const beforeResourceHistory = mock.state.snapshotCalls;
    await adaptivePage.goto(resourceOverviewTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForCalls(mock.state, beforeResourceHistory, 'focused resource history', 12000);
    await waitForPhase(adaptivePage, 'current', 12000);
    await adaptivePage.locator('[data-mobile-overview-risk="resource"]').waitFor();
    const focusedResourceOwnership = await inspectCompositeRiskSurface(adaptivePage);
    contractCheck(
      checks,
      step196ContractFailures,
      '390px resource incident leads with the breached object before a distinct comparison signal',
      focusedResourceOwnership.objectBeforeSignal &&
        focusedResourceOwnership.resourceSignalTitle.includes('资源压力') &&
        !focusedResourceOwnership.resourceHistoryOpen,
      focusedResourceOwnership
    );
    contractCheck(
      checks,
      step196ContractFailures,
      '390px related resource comparison excludes the primary CPU object',
      !focusedResourceOwnership.signalText.includes('CPU') &&
        focusedResourceOwnership.signalText.includes('内存') &&
        focusedResourceOwnership.signalText.includes('磁盘'),
      focusedResourceOwnership
    );
    const focusedResourceHistory = adaptivePage.locator('[data-mobile-resource-history]');
    const focusedResourceSummary = focusedResourceHistory.locator('summary');
    if (await focusedResourceSummary.count()) await focusedResourceSummary.click();
    await focusedResourceHistory.locator('[data-section-time-series]').waitFor();
    let focusedResourceState = await inspectResourceHistorySurface(adaptivePage);
    const focusedSettleStartedAt = Date.now();
    while (!(focusedResourceState.chartWithinUsableViewport && focusedResourceState.summaryFocused)) {
      if (Date.now() - focusedSettleStartedAt > actionTimeout) break;
      await adaptivePage.waitForTimeout(20);
      focusedResourceState = await inspectResourceHistorySurface(adaptivePage);
    }
    contractCheck(
      checks,
      step196ContractFailures,
      '390px expanded resource history names a truthful local 80 to 100 percent scale',
      focusedResourceState.text.includes('局部刻度 80–100%') &&
        focusedResourceState.scaleLabels.includes('80%') && !focusedResourceState.scaleLabels.includes('0%'),
      focusedResourceState
    );
    check(
      checks,
      '390px focused resource history uses atomic time geometry without replaying the latest reading',
      focusedResourceState.chartHeight >= 96 && focusedResourceState.chartInsideViewport &&
        focusedResourceState.chartWithinUsableViewport && focusedResourceState.summaryFocused &&
        focusedResourceState.seriesCount === 3 && focusedResourceState.distinctPatterns === 3 &&
        focusedResourceState.timeRatio !== null && Math.abs(focusedResourceState.timeRatio - (1 / 5)) <= 0.01 &&
        focusedResourceState.thresholdLabels.join('|') === '85% · CPU/内存|90% · 磁盘' &&
        focusedResourceState.latestPointCount === 0 && focusedResourceState.sampleReplayCount === 0 &&
        focusedResourceState.clippedText.length === 0 && focusedResourceState.overflow <= 1,
      focusedResourceState
    );
    screenshots.push(await screenshot(
      adaptivePage,
      'mobile-resource-history-expanded-390.png',
      'mobile-resource-history-expanded-390'
    ));
    const focusedResourceAction = adaptivePage.locator('[data-mobile-resource-action]').first();
    await focusedResourceAction.click();
    await adaptivePage.locator('[data-mobile-domain-workspace="trafficLoad"]').waitFor();
    const openedFocusedResource = new URL(adaptivePage.url());
    const focusedResourceContext = {
      section: openedFocusedResource.searchParams.get('section'),
      object: openedFocusedResource.searchParams.get('object'),
      risk: openedFocusedResource.searchParams.get('risk'),
      from: openedFocusedResource.searchParams.get('from'),
      evidenceAt: openedFocusedResource.searchParams.get('evidenceAt'),
    };
    await adaptivePage.goBack();
    await adaptivePage.locator('[data-mobile-overview-risk="resource"]').waitFor();
    await adaptivePage.goForward();
    await adaptivePage.locator('[data-mobile-domain-workspace="trafficLoad"]').waitFor();
    const forwardFocusedResource = new URL(adaptivePage.url());
    check(
      checks,
      '390px focused resource action preserves metric object and evidence context through Back/Forward',
      focusedResourceContext.section === 'trafficLoad' && focusedResourceContext.risk === 'resource' &&
        Boolean(focusedResourceContext.object) && focusedResourceContext.from === 'overview' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(focusedResourceContext.evidenceAt || '') &&
        forwardFocusedResource.search === openedFocusedResource.search,
      { focusedResourceContext, forward: forwardFocusedResource.search }
    );

    await adaptivePage.setViewportSize({ width: 772, height: 1024 });
    await adaptivePage.locator('[data-mobile-domain-workspace="trafficLoad"][data-mobile-domain-layout="workbench"]').waitFor();
    const tabletResourceInvestigation = await adaptivePage.evaluate(() => {
      const workspace = document.querySelector('[data-mobile-domain-workspace="trafficLoad"]');
      const detail = workspace?.querySelector('[data-mobile-object-detail]');
      const comparison = detail?.querySelector('[aria-label="相关资源比较"]');
      const dependency = detail?.querySelector('[aria-label="依赖与来源"]');
      const relatedStatusTexts = [...(comparison?.querySelectorAll('[role="listitem"] em') || [])]
        .map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim());
      const heading = detail?.querySelector('.mdi-object-heading');
      const header = workspace?.querySelector('.mdw-header');
      const title = header?.querySelector('.mdw-title-row');
      const status = header?.querySelector('.mdw-status-row');
      const switcher = header?.querySelector('.mdw-route-switcher');
      const firstRow = workspace?.querySelector('[data-mobile-row-id]');
      const rect = (node) => node?.getBoundingClientRect() || null;
      const headerRect = rect(header);
      const titleRect = rect(title);
      const statusRect = rect(status);
      const firstRowRect = rect(firstRow);
      const tabButtons = [...(switcher?.querySelectorAll('button') || [])];
      const readableNodes = [...(header?.querySelectorAll('small, p, button') || [])];
      const rawDisclosure = [...(detail?.querySelectorAll('details') || [])]
        .find((node) => (node.textContent || '').includes('原始对象身份'));
      const resourceLayers = [...(workspace?.querySelectorAll('[data-resource-layer]') || [])]
        .map((node) => ({
          layer: node.getAttribute('data-resource-layer') || '',
          question: node.getAttribute('data-resource-layer-question') || '',
          role: node.getAttribute('data-resource-evidence-role') || ''
        }));
      return {
        layout: workspace?.getAttribute('data-mobile-domain-layout') || '',
        selectedRows: workspace?.querySelectorAll('[data-mobile-row-id][aria-current="true"]').length || 0,
        objectQuery: new URLSearchParams(location.search).get('object'),
        comparisonRows: comparison?.querySelectorAll('tbody tr, [role="row"], [role="listitem"]').length || 0,
        comparisonText: (comparison?.textContent || '').replace(/\s+/g, ' ').trim(),
        relatedStatusTexts,
        relatedStatusesAreRelative: relatedStatusTexts.length >= 2 && relatedStatusTexts.every((value) => (
          value.includes('较当前对象') || value.includes('与当前对象同值') || value.includes('相对值不可比较')
        )),
        relatedStatusesAvoidBareLatest: relatedStatusTexts.every((value) => !/^\d+(?:\.\d+)?%$/.test(value)),
        dependencyText: (dependency?.textContent || '').replace(/\s+/g, ' ').trim(),
        rowTexts: [...(workspace?.querySelectorAll('[data-mobile-row-id]') || [])]
          .map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim()),
        headingText: (heading?.textContent || '').replace(/\s+/g, ' ').trim(),
        statusText: (status?.textContent || '').replace(/\s+/g, ' ').trim(),
        headerHeight: Math.round(headerRect?.height || 0),
        chromeBeforeFirstObject: Math.round((firstRowRect?.top || 0) - (headerRect?.top || 0)),
        titleStatusSameBand: Boolean(titleRect && statusRect && Math.max(titleRect.top, statusRect.top) < Math.min(titleRect.bottom, statusRect.bottom)),
        minimumTabTarget: tabButtons.length ? Math.min(...tabButtons.map((node) => Math.min(node.getBoundingClientRect().width, node.getBoundingClientRect().height))) : 0,
        minimumHeaderText: readableNodes.length ? Math.min(...readableNodes.map((node) => parseFloat(getComputedStyle(node).fontSize))) : 0,
        headerClipped: [title, status, switcher].filter(Boolean).some((node) => {
          const nodeRect = node.getBoundingClientRect();
          return node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1 ||
            nodeRect.left < -1 || nodeRect.right > innerWidth + 1;
        }),
        rawIdentityDisclosure: Boolean(rawDisclosure),
        rawIdentityOpen: Boolean(rawDisclosure?.hasAttribute('open')),
        resourceLayers,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    contractCheck(
      checks,
      step196ContractFailures,
      '772px selected resource investigation uses tablet capacity for related comparison and dependency evidence',
      tabletResourceInvestigation.layout === 'workbench' && tabletResourceInvestigation.selectedRows === 1 &&
        Boolean(tabletResourceInvestigation.objectQuery) && tabletResourceInvestigation.comparisonRows >= 2 &&
        /内存|磁盘/.test(tabletResourceInvestigation.comparisonText) &&
        /采样来源|依赖/.test(tabletResourceInvestigation.dependencyText) &&
        tabletResourceInvestigation.overflow <= 1,
      tabletResourceInvestigation
    );
    contractCheck(
      checks,
      step196ContractFailures,
      '772px resource related comparison reports delta to selected object without replay',
      tabletResourceInvestigation.relatedStatusesAreRelative &&
        tabletResourceInvestigation.relatedStatusesAvoidBareLatest &&
        tabletResourceInvestigation.comparisonText.includes('较当前对象'),
      tabletResourceInvestigation
    );
    contractCheck(
      checks,
      step196ContractFailures,
      '772px resource queue and dossier explain the same threshold-delta priority',
      tabletResourceInvestigation.rowTexts[0]?.includes('CPU') &&
        tabletResourceInvestigation.rowTexts[0]?.includes('11') &&
        /磁盘.*7 个百分点/.test(tabletResourceInvestigation.comparisonText) &&
        /内存.*7 个百分点/.test(tabletResourceInvestigation.comparisonText) &&
        !tabletResourceInvestigation.headingText.includes('trafficLoad-resource') &&
        tabletResourceInvestigation.rawIdentityDisclosure && !tabletResourceInvestigation.rawIdentityOpen,
      tabletResourceInvestigation
    );
    contractCheck(
      checks,
      step196ContractFailures,
      '772px resource workbench puts title and evidence in one compact band before the first object',
      tabletResourceInvestigation.headerHeight > 0 && tabletResourceInvestigation.headerHeight <= 92 &&
        tabletResourceInvestigation.chromeBeforeFirstObject > 0 && tabletResourceInvestigation.chromeBeforeFirstObject <= 145 &&
        tabletResourceInvestigation.titleStatusSameBand && tabletResourceInvestigation.minimumTabTarget >= 44 &&
        tabletResourceInvestigation.minimumHeaderText >= 12 &&
        tabletResourceInvestigation.statusText.includes('当前证据') &&
        tabletResourceInvestigation.statusText.includes('当前只读证据') &&
        !tabletResourceInvestigation.headerClipped && tabletResourceInvestigation.overflow <= 1,
      tabletResourceInvestigation
    );
    contractCheck(
      checks,
      step196ContractFailures,
      '772px resource workbench exposes distinct signal, history, and object evidence ownership',
      tabletResourceInvestigation.resourceLayers.some((entry) => entry.layer === 'signal' && entry.question === 'current-threshold') &&
        tabletResourceInvestigation.resourceLayers.some((entry) => entry.layer === 'history' && entry.question === 'sustained-pressure') &&
        tabletResourceInvestigation.resourceLayers.some((entry) => entry.layer === 'object' && entry.question === 'breach-context'),
      { layers: tabletResourceInvestigation.resourceLayers }
    );
    screenshots.push(await screenshot(
      adaptivePage,
      'tablet-resource-investigation-context-772.png',
      'tablet-resource-investigation-context-772'
    ));
    await adaptivePage.setViewportSize({ width: 390, height: 844 });

    mock.state.scenario = 'resource-mismatch';
    const mismatchedResourceTarget = new URL(mock.url);
    mismatchedResourceTarget.searchParams.set('section', 'overview');
    const beforeMismatchedResource = mock.state.snapshotCalls;
    await adaptivePage.goto(mismatchedResourceTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForCalls(mock.state, beforeMismatchedResource, 'mismatched resource evidence window', 12000);
    await waitForPhase(adaptivePage, 'current', 12000);
    await adaptivePage.locator('[data-mobile-overview-risk="resource"]').waitFor();
    const mismatchedOverview = await adaptivePage.evaluate(() => {
      const root = document.querySelector('[data-mobile-overview-risk="resource"]');
      const history = root?.querySelector('[data-mobile-resource-history]');
      return {
        text: (root?.textContent || '').replace(/\s+/g, ' ').trim(),
        historyText: (history?.textContent || '').replace(/\s+/g, ' ').trim(),
        chartCount: history?.querySelectorAll('[data-section-time-series]').length || 0,
        series: [...(history?.querySelectorAll('[data-section-series]') || [])].map((node) => node.getAttribute('data-section-series')),
      };
    });
    check(
      checks,
      'mismatched resource history cannot claim current continuity',
      mismatchedOverview.text.includes('\u8fde\u7eed\u6027\u672a\u53d6\u5f97') &&
        mismatchedOverview.text.includes('96%') && mismatchedOverview.chartCount === 1 &&
        !mismatchedOverview.series.includes('cpu') && mismatchedOverview.series.includes('memory') && mismatchedOverview.series.includes('disk'),
      mismatchedOverview
    );
    await adaptivePage.locator('[data-mobile-resource-action]').first().click();
    await adaptivePage.locator('[data-mobile-domain-workspace="trafficLoad"] [data-mobile-object-detail]').waitFor();
    const mismatchedDetail = await adaptivePage.evaluate(() => {
      const detail = document.querySelector('[data-mobile-domain-workspace="trafficLoad"] [data-mobile-object-detail]');
      return {
        text: (detail?.textContent || '').replace(/\s+/g, ' ').trim(),
        series: [...document.querySelectorAll('[data-mobile-domain-workspace="trafficLoad"] [data-section-series]')].map((node) => node.getAttribute('data-section-series')),
      };
    });
    check(
      checks,
      'direct resource deep link preserves object evidence but rejects mismatched continuity',
      mismatchedDetail.text.includes('当前样本') && mismatchedDetail.text.includes('96%') &&
        mismatchedDetail.text.includes('策略阈值85%') && mismatchedDetail.text.includes('样本未取得') &&
        mismatchedDetail.text.includes('变化范围未取得') && mismatchedDetail.text.includes('连续性未取得') &&
        mismatchedDetail.text.includes('只描述资源压力，不推断网络中断') &&
        !mismatchedDetail.series.includes('cpu') && mismatchedDetail.series.includes('memory') && mismatchedDetail.series.includes('disk'),
      mismatchedDetail
    );

    mock.state.scenario = 'resource-stale';
    const staleResourceTarget = new URL(mock.url);
    staleResourceTarget.searchParams.set('section', 'overview');
    const beforeStaleResource = mock.state.snapshotCalls;
    await adaptivePage.goto(staleResourceTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForCalls(mock.state, beforeStaleResource, 'slow-poll stale resource evidence window', 12000);
    await waitForPhase(adaptivePage, 'current', 12000);
    await adaptivePage.locator('[data-mobile-overview-risk="resource"]').waitFor();
    const staleOverview = await adaptivePage.evaluate(() => {
      const root = document.querySelector('[data-mobile-overview-risk="resource"]');
      const history = root?.querySelector('[data-mobile-resource-history]');
      return {
        text: (root?.textContent || '').replace(/\s+/g, ' ').trim(),
        series: [...(history?.querySelectorAll('[data-section-series]') || [])].map((node) => node.getAttribute('data-section-series')),
      };
    });
    check(
      checks,
      'legal slow polling cannot turn ten-minute-old history into current continuity',
      staleOverview.text.includes('\u8fde\u7eed\u6027\u672a\u53d6\u5f97') && staleOverview.text.includes('96%') && staleOverview.series.length === 0,
      staleOverview
    );
    await adaptivePage.locator('[data-mobile-resource-action]').first().click();
    await adaptivePage.locator('[data-mobile-domain-workspace="trafficLoad"] [data-mobile-object-detail]').waitFor();
    const staleDetail = await adaptivePage.evaluate(() => {
      const detail = document.querySelector('[data-mobile-domain-workspace="trafficLoad"] [data-mobile-object-detail]');
      return {
        text: (detail?.textContent || '').replace(/\s+/g, ' ').trim(),
        series: [...document.querySelectorAll('[data-mobile-domain-workspace="trafficLoad"] [data-section-series]')].map((node) => node.getAttribute('data-section-series')),
      };
    });
    check(
      checks,
      'slow-poll stale history keeps the current object sample without claiming continuity',
      staleDetail.text.includes('当前样本96%') && staleDetail.text.includes('策略阈值85%') &&
        staleDetail.text.includes('样本未取得') && staleDetail.text.includes('变化范围未取得') &&
        staleDetail.text.includes('连续性未取得') && !staleDetail.text.includes('历史末值') && staleDetail.series.length === 0,
      staleDetail
    );

    mock.state.scenario = 'resource-partial';
    const partialResourceTarget = new URL(mock.url);
    partialResourceTarget.searchParams.set('section', 'overview');
    const beforePartialResource = mock.state.snapshotCalls;
    await adaptivePage.goto(partialResourceTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForCalls(mock.state, beforePartialResource, 'partial resource evidence window', 12000);
    await waitForPhase(adaptivePage, 'current', 12000);
    await adaptivePage.locator('[data-mobile-overview-risk="resource"]').waitFor();
    const partialHistory = adaptivePage.locator('[data-mobile-resource-history]');
    const partialSummary = partialHistory.locator('summary');
    if (await partialSummary.count()) await partialSummary.click();
    await partialHistory.locator('[data-section-time-series]').waitFor();
    const partialResourceState = await inspectResourceHistorySurface(adaptivePage);
    check(
      checks,
      'one missing resource metric preserves other aligned metric histories',
      partialResourceState.seriesCount === 2 &&
        partialResourceState.patterns.cpu !== '' && partialResourceState.patterns.disk !== '' &&
        partialResourceState.patterns.memory === '' && partialResourceState.sampleReplayCount === 0,
      partialResourceState
    );

    mock.state.scenario = 'composite-risk';
    const compositeOverviewTarget = new URL(mock.url);
    compositeOverviewTarget.searchParams.set('section', 'overview');
    const crossSurfaceActionLanguage = {};

    async function proveCompositeRisk(width, height, surface, screenshotFile, screenshotState, verifyContext = true) {
      await adaptivePage.setViewportSize({ width, height });
      const beforeComposite = mock.state.snapshotCalls;
      await adaptivePage.goto(compositeOverviewTarget.toString(), { waitUntil: 'domcontentloaded' });
      await waitForCalls(mock.state, beforeComposite, `${surface} composite risk`, 12000);
      await waitForPhase(adaptivePage, 'current', 12000);
      await adaptivePage.locator(surface === 'desktop'
        ? '[data-desktop-overview-risk="interfaces"]'
        : '[data-mobile-overview-risk="interfaces"]').waitFor();
      await adaptivePage.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      if (width >= 768) {
        const initialSelection = await adaptivePage.evaluate(() => ({
          firstRiskObject: document.querySelector('[data-overview-task-risk-object]')?.getAttribute('data-overview-task-risk-object') || '',
          selected: document.querySelector('[data-overview-task-risk-object][aria-current="true"]')?.getAttribute('data-overview-task-risk-object') || '',
          inspector: document.querySelector('[data-overview-task-inspector]')?.getAttribute('data-overview-task-inspector') || '',
        }));
        if (surface === 'desktop') {
          check(
            checks,
            'desktop composite incident opens highest-priority object context',
            Boolean(initialSelection.firstRiskObject) &&
              initialSelection.selected === initialSelection.firstRiskObject &&
              initialSelection.inspector === initialSelection.firstRiskObject,
            initialSelection
          );
          await adaptivePage.locator('[data-overview-task-inspector]').waitFor();
        } else {
          check(
            checks,
            `${surface} composite incident opens the highest-priority object context`,
            Boolean(initialSelection.firstRiskObject) &&
              initialSelection.selected === initialSelection.firstRiskObject &&
              initialSelection.inspector === initialSelection.firstRiskObject,
            initialSelection
          );
          await adaptivePage.locator('[data-overview-task-inspector]').waitFor();
        }
      }
      const result = await inspectCompositeRiskSurface(adaptivePage);
      await adaptivePage.evaluate(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });
      await adaptivePage.evaluate(() => document.fonts?.ready);
      await adaptivePage.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await adaptivePage.waitForTimeout(20);
      if (surface === 'mobile') {
        const captureContext = await adaptivePage.evaluate(() => {
          const navigation = document.querySelector('.panel-task-navigation');
          const navigationRect = navigation?.getBoundingClientRect();
          const style = navigation ? getComputedStyle(navigation) : null;
          return {
            scrollY: Math.round(window.scrollY),
            viewport: { width: innerWidth, height: innerHeight },
            navigationRect: navigationRect ? {
              top: Math.round(navigationRect.top),
              bottom: Math.round(navigationRect.bottom),
              width: Math.round(navigationRect.width),
              height: Math.round(navigationRect.height),
            } : null,
            navigationVisible: Boolean(
              navigationRect && navigationRect.width > 0 && navigationRect.height > 0 &&
              navigationRect.top >= -1 && navigationRect.bottom <= innerHeight + 1
            ),
            navigationPosition: style?.position || '',
          };
        });
        check(
          checks,
          `${width}px composite screenshot captures the settled phone viewport and fixed navigation`,
          captureContext.scrollY === 0 && captureContext.navigationVisible && captureContext.navigationPosition === 'fixed',
          captureContext
        );
      }
      if (surface === 'desktop') {
        const section = new URL(adaptivePage.url()).searchParams.get('section');
        screenshots.push(await isolatedScreenshot(
          adaptivePage.url(),
          screenshotFile,
          screenshotState,
          { width, height },
          section === 'overview' ? '[data-desktop-overview]' : '[data-desktop-domain-workspace]',
          executablePath
        ));
      } else {
        screenshots.push(await screenshot(adaptivePage, screenshotFile, screenshotState));
      }
      const investigationActionPriority = await adaptivePage.evaluate(() => {
        const mobile = Boolean(document.querySelector('[data-mobile-overview]'));
        const surface = document.querySelector(mobile ? '.mp-actions' : '.do-task-actions');
        const buttons = [...(surface?.querySelectorAll('button[id]') || [])];
        const priorities = buttons
          .map((button) => button.getAttribute(mobile ? 'data-mobile-action-priority' : 'data-desktop-action-priority') || '')
          .filter(Boolean);
        return {
          priorities,
          primaryCount: priorities.filter((value) => value === 'primary').length,
          secondaryCount: priorities.filter((value) => value === 'secondary').length,
          actionCount: buttons.length,
        };
      });
      const actionLanguage = await adaptivePage.evaluate((surface) => {
        const mobile = surface === 'mobile';
        const action = mobile
          ? document.querySelector('.mp-actions button[data-mobile-action-priority="primary"]')
          : document.querySelector('.do-task-inspector button[data-desktop-inspector-action-language]');
        const attr = (name) => action?.getAttribute(name) || '';
        return {
          language: mobile ? (attr('data-mobile-action-scope') ? 'shared' : 'missing') : attr('data-desktop-inspector-action-language'),
          label: action?.querySelector('b')?.textContent?.replace(/\s+/g, ' ').trim() || '',
          note: action?.querySelector('small')?.textContent?.replace(/\s+/g, ' ').trim() || '',
          route: mobile ? attr('id') : attr('data-desktop-inspector-action-route'),
          objectId: mobile ? attr('data-mobile-action-object-id') : attr('data-desktop-inspector-action-object-id'),
          evidenceAt: mobile ? attr('data-mobile-action-evidence-at') : attr('data-desktop-inspector-action-evidence-at'),
        };
      }, surface);
      if ((surface === 'mobile' && width === 390) || (surface === 'desktop' && width === 1366)) {
        crossSurfaceActionLanguage[surface] = actionLanguage;
      }
      check(
        checks,
        `${surface} composite object task uses model-bound action language`,
        actionLanguage.language === 'shared' &&
          Boolean(actionLanguage.label) && Boolean(actionLanguage.note) &&
          actionLanguage.route === 'interfaces' &&
          Boolean(actionLanguage.objectId) && Boolean(actionLanguage.evidenceAt),
        actionLanguage
      );
      check(
        checks,
        `${surface} composite task exposes one primary investigation action and keeps secondary evidence entries visible`,
        investigationActionPriority.actionCount >= 1 &&
          investigationActionPriority.primaryCount === 1 &&
          investigationActionPriority.secondaryCount === investigationActionPriority.actionCount - 1 &&
          investigationActionPriority.priorities[0] === 'primary',
        investigationActionPriority
      );
      if (surface === 'mobile' && width < 600) {
        check(
          checks,
          `${width}px mobile primary action sits between primary and secondary risk planes`,
          result.primaryActionBetweenRiskPlanes &&
            result.investigationRect?.height >= 44 &&
            result.primaryRiskRect?.bottom <= result.investigationRect?.top + 1 &&
            result.investigationRect?.bottom <= result.secondaryRiskRect?.top + 1,
          result
        );
      }
      check(
        checks,
        `${surface} composite incident keeps proved interface dependency primary and resource pressure secondary`,
        result.surface === surface && result.risk === 'interfaces' && result.count === '1' &&
          (surface === 'desktop' || result.taskRisks.join('|') === 'resource') &&
          (surface === 'desktop' || result.destinations.join('|') === 'trafficLoad') &&
          result.secondaryText.includes('资源阈值') && result.secondaryText.includes('3 / 3 超限') &&
          result.secondaryText.includes('CPU 高出 11 个百分点') &&
          !result.secondaryText.includes('配置依赖接口') && !result.resourceText,
        result
      );
      check(
        checks,
        `${surface} composite verdict, first object and first action share the auditable highest-risk rule`,
        result.risk === 'interfaces' && result.verdictTitle.includes('出口依赖接口未运行') &&
          result.riskPriority === '400' && result.primaryRiskPriority === '400' &&
          result.riskPriorityReason.includes('默认路由依赖接口未运行') &&
          result.actionRisk === 'interfaces' &&
          result.taskPriorities.join('|') === '200',
        result
      );
      check(
        checks,
        `${surface} composite task keeps the approved primary-secondary relationship without clipping or overflow`,
        (surface === 'desktop'
          ? result.desktopFactsBeforeWorkspace && result.desktopWorkspaceBeforeQueue && result.desktopQueueBeforeActions
          : result.afterPrimary && (width < 600
            ? result.withinFirstViewport
            : result.objectInFirstViewport && result.actionInFirstViewport && result.secondaryRiskReachable)) &&
          result.tabletFullWidth &&
          result.minimumTarget >= 44 &&
          result.clippedText.length === 0 && result.overflow <= 1,
        result
      );
      if (surface === 'desktop') {
        check(
          checks,
          'desktop composite incident keeps facts, primary object, secondary queue and actions in task order',
          result.desktopFactsBeforeWorkspace && result.desktopWorkspaceBeforeQueue && result.desktopQueueBeforeActions &&
            result.desktopSignalBandRect && result.desktopWorkspaceRect && result.queueRect && result.desktopActionsRect &&
            result.desktopWorkspaceRect.width >= 760 && result.queueRect.width >= 760 &&
            result.desktopWorkspaceTop <= 340 &&
            result.minimumTarget >= 44 && result.clippedText.length === 0 && result.overflow <= 1,
          result
        );
      }
      if (surface === 'mobile') {
        check(
          checks,
          `${width}px composite task keeps core proof ahead of the interface object and secondary resource/traffic evidence`,
          result.proofBeforeObject && result.objectBeforeQueue && (!result.signalRect || result.queueBeforeSignal) &&
            result.objectInFirstViewport && result.actionInFirstViewport &&
            result.objectText.includes('ether9') && result.actionRect?.height >= 44 &&
          !/CPU|内存|磁盘|策略阈值/.test(result.signalText) && !result.historyText,
          result
        );
        check(
          checks,
          'mobile-incident-rhythm-v1: primary-plus-context action rhythm is explicit and visually bounded',
          width >= 600 || (
            result.rootRhythm === 'incident-ledger-v1' && result.actionRhythm === 'primary-plus-context' &&
            result.primaryActionVisual === 'accent' && result.primaryActionColor !== '' &&
            result.secondaryDisclosureOpen === false &&
            result.secondaryDisclosureSummaryRect?.height >= 44 &&
            result.secondaryActionMinHeights.every((height) => height >= 44 && height <= 48)
          ),
          result
        );
        if (width < 600) {
          check(
            checks,
            `${width}px mobile incident primary action is fully above fixed navigation`,
            result.actionAboveNavigation === true && result.actionVisibleRatio === 1,
            result
          );
          check(
            checks,
            `${width}px mobile secondary risk is fully above fixed navigation`,
            result.secondaryRiskAboveNavigation === true,
            result
          );
          contractCheck(
            checks,
            step196ContractFailures,
            `${width}px composite incident does not expand a non-primary WAN chart`,
            !result.visibleTrafficChart,
            result
          );
        }
      }

      if (!verifyContext) return;

      const taskSelector = surface === 'desktop'
        ? '[data-desktop-object-list] .legacy-object-row button'
        : '[data-mobile-secondary-risk="resource"]';
      const contextSelector = '[data-investigation-risk="resource"]';
      await adaptivePage.locator(taskSelector).click();
      await adaptivePage.locator(surface === 'desktop'
        ? '[data-desktop-domain-workspace="trafficLoad"]'
        : '[data-mobile-domain-workspace="trafficLoad"]').waitFor();
      await adaptivePage.locator(contextSelector).waitFor();
      const openedContext = await adaptivePage.evaluate(({ contextSelector, surface }) => {
        const url = new URL(location.href);
        const context = document.querySelector(contextSelector);
        const workspace = document.querySelector(surface === 'desktop'
          ? '[data-desktop-domain-workspace="trafficLoad"]'
          : '[data-mobile-domain-workspace="trafficLoad"]');
        const contextNodes = surface === 'mobile' && context
          ? [...context.querySelectorAll(':scope > header > span:last-child, .mdi-object-heading, .mdi-object-heading > *, .mdi-object-heading small, .mdi-object-heading h2, .mdi-object-heading p')]
          : [];
        return {
          section: url.searchParams.get('section'),
          risk: url.searchParams.get('risk'),
          object: url.searchParams.get('object'),
          from: url.searchParams.get('from'),
          evidenceAt: url.searchParams.get('evidenceAt'),
          contextRisk: context?.getAttribute('data-investigation-risk') || '',
          text: ((surface === 'mobile' ? workspace : context)?.textContent || '').replace(/\s+/g, ' ').trim(),
          selectedRows: workspace?.querySelectorAll('[aria-current="true"][data-mobile-row-id], [data-desktop-row-id] button[aria-current="true"]').length || 0,
          contextClipped: contextNodes.some((node) => {
            const rect = node.getBoundingClientRect();
            return node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1 ||
              rect.left < -1 || rect.right > innerWidth + 1;
          }),
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      }, { contextSelector, surface });
      if (surface === 'mobile' && width === 390) {
        const nextEvidence = adaptivePage.locator('[data-investigation-risk="resource"] [data-domain-next-evidence="loadAudit"]');
        await nextEvidence.waitFor();
        await nextEvidence.scrollIntoViewIfNeeded();
        await adaptivePage.waitForTimeout(0);
        const actionVisibility = await adaptivePage.evaluate(() => {
          const action = document.querySelector('[data-investigation-risk="resource"] [data-domain-next-evidence="loadAudit"]');
          const target = action?.querySelector('[data-domain-next-evidence-action]');
          const navigation = document.querySelector('.panel-task-navigation');
          const shell = action?.closest('.mdw-shell');
          const rect = (node) => {
            const value = node?.getBoundingClientRect();
            return value ? {
              left: Math.round(value.left),
              right: Math.round(value.right),
              top: Math.round(value.top),
              bottom: Math.round(value.bottom),
              width: Math.round(value.width),
              height: Math.round(value.height),
            } : null;
          };
          const actionBounds = rect(action);
          const targetBounds = rect(target);
          const navigationBounds = rect(navigation);
          const intersects = (a, b) => Boolean(a && b &&
            a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
          const style = shell ? getComputedStyle(shell) : null;
          return {
            actionBounds,
            targetBounds,
            navigationBounds,
            actionInViewport: Boolean(actionBounds && actionBounds.top >= -1 && actionBounds.bottom <= innerHeight + 1),
            targetInViewport: Boolean(targetBounds && targetBounds.top >= -1 && targetBounds.bottom <= innerHeight + 1),
            actionIntersectsNavigation: intersects(actionBounds, navigationBounds),
            targetIntersectsNavigation: intersects(targetBounds, navigationBounds),
            rootPaddingBottom: style?.paddingBottom || '',
            rootHasBottomReserve: Boolean(style && /(?:74px|env\(safe-area-inset-bottom\))/.test(style.paddingBottom)),
            viewport: { width: innerWidth, height: innerHeight },
          };
        });
        check(
          checks,
          '390px resource detail next-evidence action avoids fixed navigation',
          actionVisibility.actionInViewport && actionVisibility.targetInViewport &&
            !actionVisibility.actionIntersectsNavigation &&
            !actionVisibility.targetIntersectsNavigation && actionVisibility.rootHasBottomReserve &&
            (actionVisibility.targetBounds?.height || 0) >= 44,
          actionVisibility
        );
      }
      await adaptivePage.evaluate(async () => {
        window.scrollTo(0, 0);
        const inspector = document.querySelector('.mdw-inspector');
        if (inspector instanceof HTMLElement) inspector.scrollTop = 0;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      screenshots.push(await screenshot(adaptivePage, `${surface}-secondary-resource-context-${width}.png`, `${surface}-secondary-resource-context-${width}`));
      await adaptivePage.goBack();
      await adaptivePage.locator(surface === 'desktop'
        ? '[data-desktop-overview-risk="interfaces"]'
        : '[data-mobile-overview-risk="interfaces"]').waitFor();
      await adaptivePage.goForward();
      await adaptivePage.locator(contextSelector).waitFor();
      const forwardUrl = new URL(adaptivePage.url());
      const forwardContext = {
        section: forwardUrl.searchParams.get('section'),
        risk: forwardUrl.searchParams.get('risk'),
        object: forwardUrl.searchParams.get('object'),
        from: forwardUrl.searchParams.get('from'),
        evidenceAt: forwardUrl.searchParams.get('evidenceAt'),
      };
      check(
        checks,
        `${surface} composite resource task preserves metric object and evidence context through Back/Forward`,
        openedContext.section === 'trafficLoad' && openedContext.risk === 'resource' &&
          Boolean(openedContext.object) && openedContext.from === 'overview' &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(openedContext.evidenceAt || '') &&
          openedContext.contextRisk === 'resource' && openedContext.selectedRows === 1 &&
          openedContext.text.includes('来自运行概览') &&
          (surface === 'mobile'
            ? openedContext.text.includes('当前样本96%') && openedContext.text.includes('策略阈值85%') &&
              openedContext.text.includes('变化范围88% — 96%') && openedContext.text.includes('连续性6 / 6 个样本') &&
              openedContext.text.includes('采样来源') && !openedContext.text.includes('当前越阈判断')
            : openedContext.text.includes('当前越阈判断') &&
              openedContext.text.includes('当前值') && openedContext.text.includes('策略阈值') &&
              openedContext.text.includes('样本范围')) &&
          openedContext.text.includes(openedContext.object) && !openedContext.contextClipped &&
          openedContext.overflow <= 1 &&
          JSON.stringify(forwardContext) === JSON.stringify({
            section: openedContext.section,
            risk: openedContext.risk,
            object: openedContext.object,
            from: openedContext.from,
            evidenceAt: openedContext.evidenceAt,
          }),
        { openedContext, forwardContext }
      );
      await adaptivePage.goBack();
      await adaptivePage.locator(surface === 'desktop'
        ? '[data-desktop-overview-risk="interfaces"]'
        : '[data-mobile-overview-risk="interfaces"]').waitFor();
    }

    await proveCompositeRisk(375, 667, 'mobile', 'mobile-composite-risk-375.png', 'mobile-composite-risk-375');
    await proveCompositeRisk(390, 844, 'mobile', 'mobile-composite-risk-390.png', 'mobile-composite-risk-390');
    await proveCompositeRisk(768, 1024, 'mobile', 'tablet-composite-risk-768.png', 'tablet-composite-risk-768');
    await proveCompositeRisk(1200, 800, 'desktop', 'desktop-composite-risk-1200.png', 'desktop-composite-risk-1200', false);
    await proveCompositeRisk(1366, 768, 'desktop', 'desktop-composite-risk-1366.png', 'desktop-composite-risk-1366');
    await proveCompositeRisk(1440, 900, 'desktop', 'desktop-composite-risk-1440.png', 'desktop-composite-risk-1440', false);
    check(
      checks,
      '390 mobile and 1366 desktop expose the same first interface task and context',
      crossSurfaceActionLanguage.mobile?.label === crossSurfaceActionLanguage.desktop?.label &&
        crossSurfaceActionLanguage.mobile?.note === crossSurfaceActionLanguage.desktop?.note &&
        crossSurfaceActionLanguage.mobile?.route === crossSurfaceActionLanguage.desktop?.route &&
        crossSurfaceActionLanguage.mobile?.objectId === crossSurfaceActionLanguage.desktop?.objectId &&
        /^\d{4}-\d{2}-\d{2}T/.test(crossSurfaceActionLanguage.mobile?.evidenceAt || '') &&
        /^\d{4}-\d{2}-\d{2}T/.test(crossSurfaceActionLanguage.desktop?.evidenceAt || ''),
      crossSurfaceActionLanguage
    );

    async function proveCollectionRisk(width, height, surface) {
      await adaptivePage.setViewportSize({ width, height });
      const beforeCollection = mock.state.snapshotCalls;
      await adaptivePage.goto(compositeOverviewTarget.toString(), { waitUntil: 'domcontentloaded' });
      await waitForCalls(mock.state, beforeCollection, `${surface} collection risk`, 12000);
      await waitForPhase(adaptivePage, 'current', 12000);
      await adaptivePage.locator('[data-overview-task-landmark="investigation"] #interfaces').click();
      const workspaceSelector = surface === 'desktop'
        ? '[data-desktop-domain-workspace="interfaces"]'
        : '[data-mobile-domain-workspace="interfaces"]';
      const contextSelector = surface === 'desktop'
        ? '[data-investigation-risk="interfaces"]'
        : '[data-mobile-domain-workspace="interfaces"]';
      await adaptivePage.locator(workspaceSelector).waitFor();
      await adaptivePage.locator(contextSelector).waitFor();
      const opened = await adaptivePage.evaluate(({ contextSelector, workspaceSelector, surface }) => {
        const url = new URL(location.href);
        const workspace = document.querySelector(workspaceSelector);
        const matchedContext = document.querySelector(contextSelector);
        const ledger = workspace?.querySelector('.mdw-cl-rows')?.parentElement || null;
        const context = ledger || matchedContext;
        const comparison = context?.querySelector('.mdw-cl-rows') || context?.querySelector('[aria-label="受影响对象比较"]') || context?.querySelector('[data-tablet-interface-route-evidence]');
        const dependency = context?.querySelector('[aria-label="采样来源"], [aria-label="共同依赖与来源"]') || context?.querySelector('[data-tablet-interface-route-evidence]');
        const ledgerRows = [...(ledger?.querySelectorAll('[data-mobile-row-id]') || [])];
        const rowGeometry = ledgerRows.map((row) => {
          const dependency = row.querySelector('.mdw-cl-dep');
          const identity = row.querySelector('.mdw-row-copy');
          const status = row.querySelector('.mdw-row-state');
          const chevron = row.querySelector(':scope > svg');
          const rowRect = row.getBoundingClientRect();
          const dependencyRect = dependency?.getBoundingClientRect();
          const centers = [identity, status, dependency, chevron]
            .filter(Boolean)
            .map((node) => {
              const nodeRect = node.getBoundingClientRect();
              return nodeRect.top + nodeRect.height / 2;
            });
          return {
            height: rowRect.height,
            dependencyWidth: dependencyRect?.width || 0,
            centerDelta: centers.length ? Math.max(...centers) - Math.min(...centers) : 0,
          };
        });
        const interactionRoot = ledger || (surface === 'mobile' ? context : null);
        const interactiveTargets = [...(interactionRoot?.querySelectorAll('button, a, input, select, summary') || [])];
        const readableNodes = [...(interactionRoot?.querySelectorAll('b, small, span, p') || [])]
          .filter((node) => (node.textContent || '').trim());
        const contextNodes = context ? [context, ...context.querySelectorAll('p')] : [];
        return {
          layout: workspace?.getAttribute('data-mobile-domain-layout') || '',
          section: url.searchParams.get('section'),
          risk: url.searchParams.get('risk'),
          detail: Boolean(workspace?.querySelector('[data-mobile-object-detail], [data-mobile-object-preview]')),
          tabletRiskFocus: workspace?.getAttribute('data-tablet-risk-focus') || '',
          tabletTaskSpace: workspace?.getAttribute('data-tablet-task-space') || '',
          tabletTaskFocus: workspace?.getAttribute('data-tablet-task-focus') || '',
          riskObjectId: workspace?.getAttribute('data-tablet-risk-object-id') || '',
          object: url.searchParams.get('object'),
          from: url.searchParams.get('from'),
          evidenceAt: url.searchParams.get('evidenceAt'),
          text: ((surface === 'mobile' ? workspace : context)?.textContent || '').replace(/\s+/g, ' ').trim(),
          selectedRows: workspace?.querySelectorAll('[aria-current="true"][data-mobile-row-id], [data-desktop-row-id] button[aria-current="true"]').length || 0,
          boundaryCount: workspace?.querySelectorAll('[data-mobile-collection-risk-context="interfaces"]').length || 0,
          ledgerCount: workspace?.querySelectorAll('.mdw-cl-rows').length || 0,
          ledgerRows: ledgerRows.length,
          uniqueLedgerRows: new Set(ledgerRows.map((row) => row.getAttribute('data-mobile-row-id'))).size,
          dependencyCells: ledger?.querySelectorAll('.mdw-cl-dep').length || 0,
          sharedSummaryCount: ledger?.querySelectorAll('.mdw-cl-summary').length || 0,
          minimumRowHeight: rowGeometry.length ? Math.min(...rowGeometry.map((row) => row.height)) : 0,
          maximumRowHeight: rowGeometry.length ? Math.max(...rowGeometry.map((row) => row.height)) : 0,
          minimumDependencyWidth: rowGeometry.length ? Math.min(...rowGeometry.map((row) => row.dependencyWidth)) : 0,
          maximumCenterDelta: rowGeometry.length ? Math.max(...rowGeometry.map((row) => row.centerDelta)) : 0,
          minimumTarget: interactiveTargets.length
            ? Math.min(...interactiveTargets.map((node) => node.getBoundingClientRect().height))
            : 0,
          minimumText: readableNodes.length
            ? Math.min(...readableNodes.map((node) => Number.parseFloat(getComputedStyle(node).fontSize) || 0))
            : 0,
          comparisonRows: comparison?.querySelectorAll('tbody tr, [role="row"], [role="listitem"], [data-mobile-row-id], [data-tablet-interface-relation-row]').length || 0,
          comparisonText: (comparison?.textContent || '').replace(/\s+/g, ' ').trim(),
          dependencyText: (dependency?.textContent || '').replace(/\s+/g, ' ').trim(),
          clipped: contextNodes.some((node) => {
            const rect = node.getBoundingClientRect();
            return node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1 ||
              rect.left < -1 || rect.right > innerWidth + 1;
          }),
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      }, { contextSelector, workspaceSelector, surface });
      const name = `${surface}-primary-interface-collection-context-${width}`;
      if (surface === 'desktop') {
        screenshots.push(await isolatedScreenshot(
          adaptivePage.url(),
          `${name}.png`,
          name,
          { width, height },
          workspaceSelector,
          executablePath
        ));
      } else {
        screenshots.push(await screenshot(adaptivePage, `${name}.png`, name));
      }
      await adaptivePage.goBack();
      await adaptivePage.locator(surface === 'desktop'
        ? '[data-desktop-overview-risk="interfaces"]'
        : '[data-mobile-overview-risk="interfaces"]').waitFor();
      await adaptivePage.goForward();
      await adaptivePage.locator(contextSelector).waitFor();
      const forwardUrl = new URL(adaptivePage.url());
      const forward = {
        section: forwardUrl.searchParams.get('section'),
        risk: forwardUrl.searchParams.get('risk'),
        object: forwardUrl.searchParams.get('object'),
        from: forwardUrl.searchParams.get('from'),
        evidenceAt: forwardUrl.searchParams.get('evidenceAt'),
      };
      check(
        checks,
          `${surface} multi-object concurrent risk preserves explicit matched-object focus through Back/Forward`,
          opened.section === 'interfaces' && opened.risk === 'interfaces' && opened.object === null &&
            opened.from === 'overview' &&
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(opened.evidenceAt || '') &&
            opened.selectedRows === 0 && opened.text.includes('来自运行概览') &&
            opened.text.includes('配置依赖接口') && opened.text.includes('2 个匹配对象') &&
            opened.text.includes('未自动选择') && opened.overflow <= 1 &&
            (surface === 'desktop'
              ? !opened.clipped && !opened.detail
              : opened.detail && opened.tabletRiskFocus === 'v1' && opened.tabletTaskSpace === 'master-detail' &&
                opened.tabletTaskFocus === 'selected-risk-object' && /ether9|vlan30|sfp-lan/.test(opened.riskObjectId)) &&
            JSON.stringify(forward) === JSON.stringify({
              section: opened.section,
              risk: opened.risk,
              object: opened.object,
              from: opened.from,
              evidenceAt: opened.evidenceAt,
            }),
        { opened, forward }
      );
      if (surface === 'mobile') {
        contractCheck(
          checks,
          step196ContractFailures,
          `${width}px tablet risk workspace keeps affected-object comparison and explicit focus`,
          opened.selectedRows === 0 && opened.object === null && opened.comparisonRows >= 2 &&
            opened.comparisonText.includes('ether9') &&
            opened.comparisonText.includes('默认路由') &&
            /默认路由/.test(opened.comparisonText) && /默认路由|interfaces/.test(opened.dependencyText) &&
            opened.detail && opened.tabletRiskFocus === 'v1' && opened.tabletTaskFocus === 'selected-risk-object',
          opened
        );
        contractCheck(
          checks,
          step197ContractFailures,
          `${width}px unselected interface risk uses a matched-object tablet master-detail focus`,
          opened.layout === 'workbench' && opened.boundaryCount === 0 && opened.ledgerCount === 0 &&
            opened.selectedRows === 0 && opened.object === null && opened.risk === 'interfaces' &&
            opened.detail && opened.tabletRiskFocus === 'v1' && opened.tabletTaskSpace === 'master-detail' &&
            opened.tabletTaskFocus === 'selected-risk-object' && /ether9|vlan30|sfp-lan/.test(opened.riskObjectId) &&
            opened.text.includes('风险对象') && opened.text.includes('默认路由') &&
            opened.minimumTarget >= 44 && opened.minimumText >= 12 && opened.overflow <= 1,
          opened
        );
      }
      await adaptivePage.goBack();
      await adaptivePage.locator(surface === 'desktop'
        ? '[data-desktop-overview-risk="interfaces"]'
        : '[data-mobile-overview-risk="interfaces"]').waitFor();
    }

    mock.state.scenario = 'composite-risk-collection';
    await proveCollectionRisk(844, 900, 'mobile');
    await proveCollectionRisk(1366, 768, 'desktop');
    if (step196ContractFailures.length) {
      throw new Error('Step196 red contract: ' + JSON.stringify(step196ContractFailures));
    }
    if (step197ContractFailures.length) {
      throw new Error('Step197 red contract: ' + JSON.stringify(step197ContractFailures));
    }
    mock.state.scenario = '';
    await adaptivePage.close();

    await tabletPage.setViewportSize({ width: 1366, height: 820 });
    const desktopOverviewTarget = new URL(mock.url);
    desktopOverviewTarget.searchParams.set('section', 'overview');
    await tabletPage.goto(desktopOverviewTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForPhase(tabletPage, 'current');
    await tabletPage.locator('[data-desktop-wan-evidence] .do-wan-chart').waitFor();
    await tabletPage.waitForFunction(() => {
      const label = document.querySelector('[data-chart-peak-label]');
      return label instanceof SVGGraphicsElement && label.getBBox().x >= 0;
    });
    const wanAxis = await tabletPage.evaluate(() => {
      const chart = document.querySelector('.do-wan-chart');
      const label = document.querySelector('[data-chart-peak-label]');
      const box = label instanceof SVGGraphicsElement ? label.getBBox() : null;
      return {
        label: label?.textContent || '',
        axisLeft: Number(chart?.getAttribute('data-axis-left') || 0),
        labelX: box?.x ?? -1,
        labelWidth: box?.width ?? 0,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    check(
      checks,
      'desktop WAN chart reserves measured left space for the complete peak label',
      wanAxis.label.includes('bps') && wanAxis.axisLeft >= 54 && wanAxis.labelWidth > 0 &&
        wanAxis.labelX >= 0 && wanAxis.overflow <= 1,
      wanAxis
    );
    screenshots.push(await screenshot(tabletPage, 'desktop-overview-wan-axis-1366.png', 'desktop-overview-wan-axis-1366'));
    mock.state.scenario = 'resource-full';
    const desktopResourceTarget = new URL(mock.url);
    desktopResourceTarget.searchParams.set('section', 'trafficLoad');
    const beforeDesktopResource = mock.state.snapshotCalls;
    await tabletPage.goto(desktopResourceTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForCalls(mock.state, beforeDesktopResource, 'desktop resource time-series', 12000);
    await waitForPhase(tabletPage, 'current', 12000);
    await tabletPage.locator('[data-section-time-series]').waitFor();
    const desktopResourceSeries = await tabletPage.evaluate(() => {
      const root = document.querySelector('[data-section-time-series]');
      const svg = root?.querySelector('svg');
      const rect = svg?.getBoundingClientRect();
      const decision = document.querySelector('[aria-label="资源风险决策"]');
      const decisionRect = decision?.getBoundingClientRect();
      const action = decision?.querySelector('button[data-section="loadAudit"], a[href*="section=loadAudit"]');
      const actionRect = action?.getBoundingClientRect();
      const keys = ['cpu', 'memory', 'disk'];
      const patterns = Object.fromEntries(keys.map((key) => {
        const node = root?.querySelector('[data-section-series="' + key + '"]');
        return [key, node ? getComputedStyle(node).strokeDasharray : ''];
      }));
      const cpuPoints = String(root?.querySelector('[data-section-series="cpu"]')?.getAttribute('points') || '')
        .trim().split(/\s+/).filter(Boolean).map((pair) => pair.split(',').map(Number));
      return {
        chartHeight: Math.round(rect?.height || 0),
        chartInsideViewport: Boolean(rect && rect.left >= -1 && rect.right <= innerWidth + 1),
        patterns,
        distinctPatterns: new Set(Object.values(patterns)).size,
        thresholdValues: [...(root?.querySelectorAll('[data-section-threshold]') || [])]
          .map((node) => Number(node.getAttribute('data-section-threshold'))),
        timeRatio: cpuPoints.length >= 3 && cpuPoints[cpuPoints.length - 1][0] !== cpuPoints[0][0]
          ? (cpuPoints[1][0] - cpuPoints[0][0]) / (cpuPoints[cpuPoints.length - 1][0] - cpuPoints[0][0])
          : null,
        priorityDecision: {
          visible: Boolean(decisionRect && decisionRect.width > 0 && decisionRect.height > 0),
          beforeTimeSeries: Boolean(decisionRect && rect && decisionRect.bottom <= rect.top),
          insideFirstViewport: Boolean(decisionRect && decisionRect.top >= 0 && decisionRect.bottom <= innerHeight),
          text: (decision?.textContent || '').replace(/\s+/g, ' ').trim(),
          actionVisible: Boolean(actionRect && actionRect.width >= 32 && actionRect.height >= 32),
          actionLabel: (action?.textContent || '').replace(/\s+/g, ' ').trim(),
        },
        text: (root?.textContent || '').replace(/\s+/g, ' ').trim(),
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    check(
      checks,
      '1366px resource incident composes priority object, threshold, continuity, and investigation before history',
      desktopResourceSeries.priorityDecision.visible &&
        desktopResourceSeries.priorityDecision.beforeTimeSeries &&
        desktopResourceSeries.priorityDecision.insideFirstViewport &&
        desktopResourceSeries.priorityDecision.text.includes('CPU') &&
        desktopResourceSeries.priorityDecision.text.includes('96%') &&
        desktopResourceSeries.priorityDecision.text.includes('连续 6 / 6') &&
        desktopResourceSeries.priorityDecision.text.includes('阈值 85%') &&
        desktopResourceSeries.priorityDecision.actionVisible &&
        desktopResourceSeries.priorityDecision.actionLabel.includes('资源审计'),
      desktopResourceSeries.priorityDecision
    );
    check(
      checks,
      '1366px resource detail preserves atomic time geometry and non-color series identity',
      desktopResourceSeries.chartHeight >= 150 && desktopResourceSeries.chartInsideViewport &&
        desktopResourceSeries.distinctPatterns === 3 &&
        desktopResourceSeries.thresholdValues.join('|') === '85|90' &&
        desktopResourceSeries.timeRatio !== null &&
        Math.abs(desktopResourceSeries.timeRatio - (1 / 5)) <= 0.01 &&
        desktopResourceSeries.text.includes('CPU') &&
        desktopResourceSeries.text.includes('内存') &&
        desktopResourceSeries.text.includes('磁盘') &&
        desktopResourceSeries.text.includes('85% · CPU/内存') &&
        desktopResourceSeries.text.includes('90% · 磁盘') &&
        desktopResourceSeries.overflow <= 1,
      desktopResourceSeries
    );
    screenshots.push(await screenshot(
      tabletPage,
      'desktop-resource-timeseries-1366.png',
      'desktop-resource-timeseries-1366'
    ));
    const desktopDomainLandmark = {
      ...await inspectMainLandmarkOwnership(tabletPage),
      route: await tabletPage.locator('[data-panel-app]').getAttribute('data-active-section') || '',
    };
    const desktopMoreTarget = new URL(mock.url);
    desktopMoreTarget.searchParams.set('section', 'more');
    await tabletPage.goto(desktopMoreTarget.toString(), { waitUntil: 'domcontentloaded' });
    await waitForPhase(tabletPage, 'current', 12000);
    await tabletPage.locator('#more[data-panel-route="more"]').waitFor();
    const desktopMoreLandmark = {
      ...await inspectMainLandmarkOwnership(tabletPage),
      route: await tabletPage.locator('[data-panel-app]').getAttribute('data-active-section') || '',
    };
    check(
      checks,
      'desktop domain and More routes each own exactly one non-nested main landmark',
      desktopDomainLandmark.route === 'trafficLoad' && ownsExactlyOneMain(desktopDomainLandmark) &&
        desktopMoreLandmark.route === 'more' && ownsExactlyOneMain(desktopMoreLandmark),
      { desktopDomainLandmark, desktopMoreLandmark }
    );
    mock.state.scenario = '';
    await tabletContext.close();
    if (isolatedBrowserRuntime) {
      await boundedCleanup('isolated-browser.lifecycle.close.after-tablet-batch', async () => {
        try {
          await isolatedBrowserRuntime.close();
        } finally {
          runtimeProgress.browserLifecycle.push(isolatedBrowserRuntime.diagnostics);
        }
      }, 20000);
      isolatedBrowserRuntime = null;
      isolatedBrowser = null;
    }

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
    const desktopConnectionLandmark = await inspectMainLandmarkOwnership(desktopPage);
    check(
      checks,
      'desktop connection owns exactly one non-nested main landmark',
      ownsExactlyOneMain(desktopConnectionLandmark),
      desktopConnectionLandmark
    );
    // The page has already passed its dedicated desktop connection semantics.
    // Reusing this verified page avoids a second Edge launch whose cleanup can
    // deadlock on Windows without adding product evidence.
    screenshots.push(await screenshot(desktopPage, 'desktop-connection.png', 'desktop-connection'));
    await desktopContext.close();

    mock.state.configured = false;
    mock.state.connectionStatusDelayMs = 300;
    const checkingContext = await openContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
    });
    const checkingPage = await checkingContext.newPage();
    checkingPage.setDefaultTimeout(actionTimeout);
    await checkingPage.goto(mock.url, { waitUntil: 'domcontentloaded' });
    await checkingPage.locator('[data-router-connection-status="checking"]').waitFor();
    const checkingLandmark = await inspectMainLandmarkOwnership(checkingPage);
    check(
      checks,
      'connection-status checking owns exactly one non-nested main landmark',
      ownsExactlyOneMain(checkingLandmark),
      checkingLandmark
    );
    await checkingContext.close();
    mock.state.connectionStatusDelayMs = 0;

    mock.state.connectionStatusError = true;
    const connectionErrorContext = await openContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
    });
    const connectionErrorPage = await connectionErrorContext.newPage();
    connectionErrorPage.setDefaultTimeout(actionTimeout);
    await connectionErrorPage.goto(mock.url, { waitUntil: 'domcontentloaded' });
    await connectionErrorPage.locator('[data-router-connection-status="error"]').waitFor();
    const connectionErrorLandmark = await inspectMainLandmarkOwnership(connectionErrorPage);
    check(
      checks,
      'connection-status error owns exactly one non-nested main landmark',
      ownsExactlyOneMain(connectionErrorLandmark),
      connectionErrorLandmark
    );
    await connectionErrorContext.close();
    mock.state.connectionStatusError = false;

    mock.state.configured = true;
    mock.state.nextSnapshot = 'api-error';
    const emptyContext = await openContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
    });
    const emptyPage = await emptyContext.newPage();
    emptyPage.setDefaultTimeout(actionTimeout);
    await emptyPage.goto(mock.url, { waitUntil: 'domcontentloaded' });
    await emptyPage.locator('[data-panel-runtime-empty="error"]').waitFor();
    const emptyLandmark = await inspectMainLandmarkOwnership(emptyPage);
    check(
      checks,
      'snapshot API error without cached evidence owns exactly one non-nested empty-state main landmark',
      ownsExactlyOneMain(emptyLandmark),
      emptyLandmark
    );
    await emptyContext.close();

    const malformedContext = await openContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
    });
    await malformedContext.addInitScript(() => {
      window.__PANEL_TEST_SNAPSHOT__ = { status: 'ok', updatedAt: 'without-timezone' };
    });
    const malformedPage = await malformedContext.newPage();
    malformedPage.setDefaultTimeout(actionTimeout);
    await malformedPage.goto(mock.url, { waitUntil: 'domcontentloaded' });
    await malformedPage.locator('[data-panel-snapshot-contract="malformed"]').waitFor();
    const malformedLandmark = await inspectMainLandmarkOwnership(malformedPage);
    check(
      checks,
      'malformed static snapshot owns exactly one non-nested contract-error main landmark',
      ownsExactlyOneMain(malformedLandmark),
      malformedLandmark
    );
    await malformedContext.close();
    mock.state.configured = false;

    check(checks, 'browser emitted no uncaught page errors', pageErrors.length === 0, pageErrors);

    const screenshotByState = new Map(screenshots.map((item) => [item.state, item]));
    if (screenshots.length !== RUNTIME_SCREENSHOT_CONTRACT.length || screenshotByState.size !== screenshots.length) {
      const expectedStates = new Set(RUNTIME_SCREENSHOT_CONTRACT.map((item) => item.state));
      const actualStates = screenshots.map((item) => item.state);
      const duplicateStates = [...new Set(actualStates.filter((state, index) => actualStates.indexOf(state) !== index))];
      const missingStates = [...expectedStates].filter((state) => !screenshotByState.has(state));
      const unexpectedStates = [...new Set(actualStates)].filter((state) => !expectedStates.has(state));
      throw new Error(JSON.stringify({
        message: 'runtime screenshot states must match the shared contract exactly once',
        actualCount: screenshots.length,
        expectedCount: RUNTIME_SCREENSHOT_CONTRACT.length,
        duplicateStates,
        missingStates,
        unexpectedStates,
      }));
    }
    const orderedScreenshots = RUNTIME_SCREENSHOT_CONTRACT.map((expected) => {
      const item = screenshotByState.get(expected.state);
      if (!item || item.file !== expected.file || item.viewport?.width !== expected.viewport.width || item.viewport?.height !== expected.viewport.height) {
        throw new Error('runtime screenshot does not match shared contract: ' + expected.state);
      }
      return item;
    });

    const report = {
      pass: checks.every((item) => item.pass),
      source: 'playwright-production-runtime',
      fixture: false,
      commit,
      worktreeFingerprint: runtimeIdentity.worktreeFingerprint,
      artifactKey: runtimeIdentity.artifactKey,
      worktreeClean: runtimeIdentity.worktreeClean,
      releaseEvidenceEligible: runtimeIdentity.releaseEvidenceEligible,
      frameworkAssetIdentity,
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
      screenshots: orderedScreenshots.map((item) => item.file),
      screenshotMetadata: orderedScreenshots,
    };
    await fsp.writeFile(
      path.join(outDir, 'report.json'),
      JSON.stringify(report, null, 2) + '\n',
      'utf8'
    );
    console.log(
      '[panel-runtime-browser] PASS checks=' +
        checks.length +
        ' screenshots=' +
        orderedScreenshots.length +
        ' snapshotApiCalls=' +
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

async function runRuntimeBrowserEntry() {
  let timeoutHandle;
  let stopRequested = false;
  const handleStop = (signal) => {
    if (stopRequested) return;
    stopRequested = true;
    setRuntimePhase(`signal:${signal}`);
    void cleanupRuntime().catch(() => {}).finally(() => process.exit(signal === 'SIGINT' ? 130 : 143));
  };
  process.once('SIGINT', handleStop.bind(null, 'SIGINT'));
  process.once('SIGTERM', handleStop.bind(null, 'SIGTERM'));
  const timeout = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      const phaseAgeMs = Date.now() - runtimeProgress.phaseStartedAt;
      const message = [
        'panel runtime browser contract exceeded ' + testTimeout + 'ms',
        'phase=' + runtimeProgress.phase,
        'phaseAgeMs=' + phaseAgeMs,
        'screenshots=' + runtimeProgress.screenshots,
        'snapshotCalls=' + runtimeProgress.snapshotCalls,
        'cleanupTimeouts=' + runtimeProgress.cleanupTimeouts.join(','),
        'cleanupErrors=' + runtimeProgress.cleanupErrors.join(' | '),
        'browserLifecycle=' + JSON.stringify(runtimeProgress.browserLifecycle),
        '',
      ].join('\n');
      try {
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, 'failure.log'), message, 'utf8');
      } catch {}
      void cleanupRuntime().catch(() => {});
      reject(new Error(message.trim()));
    }, testTimeout);
  });

  try {
    await Promise.race([main(), timeout]);
    if (timeoutHandle) clearTimeout(timeoutHandle);
    process.exit(0);
  } catch (error) {
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
    try {
      await cleanupRuntime();
    } catch (cleanupError) {
      console.error(cleanupError && (cleanupError.stack || cleanupError.message) || cleanupError);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  void runRuntimeBrowserEntry();
}

module.exports = { actionTimeout, startMock, browserExecutable };
