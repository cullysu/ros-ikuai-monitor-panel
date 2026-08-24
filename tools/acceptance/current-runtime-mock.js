#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const fsp = fs.promises;
const http = require("node:http");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..", "..");
const publicDir = path.join(root, "public");
const fingerprint = "SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const fingerprintMock = process.env.CODEX_RUNTIME_FINGERPRINT_MOCK === "1";
const sshTrustToken = "yes-i-trust-this-host";
const configuredLowLoadTimeout = Number(process.env.CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS || 0);
const actionTimeout = Number.isFinite(configuredLowLoadTimeout) && configuredLowLoadTimeout > 0
  ? Math.min(300_000, Math.max(8_000, configuredLowLoadTimeout))
  : 8_000;

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

module.exports = { actionTimeout, startMock, browserExecutable };
