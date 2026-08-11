#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const schemaPath = path.join(root, 'src', 'panel-framework', 'runtime', 'panelRuntimeSchema.ts');
const timePath = path.join(root, 'src', 'panel-framework', 'timeContract.ts');

function compile(file) {
  return ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      strict: true,
    },
    fileName: file,
  }).outputText;
}

const timeBox = { exports: {} };
new Function('exports', 'module', 'require', compile(timePath))(timeBox.exports, timeBox, require);
const moduleBox = { exports: {} };
new Function('exports', 'module', 'require', compile(schemaPath))(
  moduleBox.exports,
  moduleBox,
  (specifier) => specifier === '../timeContract' ? timeBox.exports : require(specifier),
);
const schema = moduleBox.exports;

const now = '2026-07-16T10:00:00.000Z';
const localTime = timeBox.exports.formatRfc3339Local('2026-07-16T08:18:23Z');
assert.match(localTime, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [+-]\d{2}:\d{2}$/);
const [localDate, localClock, localOffset] = localTime.split(' ');
assert.strictEqual(
  Date.parse(`${localDate}T${localClock}${localOffset}`),
  Date.parse('2026-07-16T08:18:23Z'),
  'local formatter must preserve the exact instant'
);
assert.strictEqual(timeBox.exports.formatRfc3339Local('2026-07-16 08:18:23'), null, 'offset-free time must not be formatted');
assert.strictEqual(timeBox.exports.formatRfc3339Local('2026-02-30T08:18:23Z'), null, 'invalid calendar time must not be formatted');

const operational = {
  status: 'ok',
  updatedAt: now,
  error: null,
  meta: { pollSeconds: 1, realtimeUpdatedAt: now },
  overview: { identity: 'lab-router', cpuLoad: 0 },
  interfaces: [],
  wan: [{ name: 'wan1', running: true, upRate: 0, downRate: 0 }],
  pppoe: [],
  terminals: [],
  routes: { items: [], defaultRoutes: [] },
  connections: { total: 0 },
};

assert.deepStrictEqual(schema.validatePanelSnapshot(null), {
  ok: false,
  kind: 'malformed',
  issues: ['快照根节点必须是 JSON 对象'],
});
assert.strictEqual(schema.validatePanelSnapshot({ ...operational, interfaces: {} }).ok, false);
assert.strictEqual(schema.validatePanelSnapshot({ ...operational, updatedAt: 'not-a-date' }).ok, false);
assert.strictEqual(schema.validatePanelSnapshot({ ...operational, updatedAt: '2026-07-16 10:00:00' }).ok, false, 'offset-free top-level time must be rejected');
assert.strictEqual(schema.validatePanelSnapshot({ ...operational, updatedAt: '2026-02-30T10:00:00Z' }).ok, false, 'calendar-invalid RFC3339-looking time must be rejected');
assert.strictEqual(schema.validatePanelSnapshot({ ...operational, meta: { ...operational.meta, realtimeUpdatedAt: '2026-07-16 10:00:00' } }).ok, false, 'offset-free nested time must be rejected');
assert.strictEqual(schema.validatePanelSnapshot({ ...operational, overview: { ...operational.overview, systemTime: '2026-07-16 10:00:00' } }).ok, false, 'offset-free RouterOS device clock must be rejected');
assert.strictEqual(schema.validatePanelSnapshot({ ...operational, overview: { ...operational.overview, systemTime: '2026-07-16T10:00:00+08:00' } }).ok, true, 'timezone-qualified RouterOS device clock must pass');
assert.strictEqual(schema.validatePanelSnapshot({
  ...operational,
  collectionEvidence: { lastSuccessAt: '2026-07-16 10:00:00', lastFailureAt: null },
}).ok, false, 'offset-free late-added collection evidence must make the snapshot malformed');
assert.strictEqual(schema.validatePanelSnapshot({
  ...operational,
  collectionEvidence: { lastSuccessAt: '2026-07-16T10:00:00Z', lastFailureAt: null },
}).ok, true, 'timezone-qualified late-added collection evidence must pass');
assert.strictEqual(schema.validatePanelSnapshot({ ...operational, logs: { all: [{ time: '12:00:01' }] } }).ok, false, 'offset-free log time must be rejected');
assert.strictEqual(schema.validatePanelSnapshot({ ...operational, logs: { all: [{ observedAt: '2026-07-16 10:00:00' }] } }).ok, false, 'offset-free log observation time must be rejected');
assert.strictEqual(schema.validatePanelSnapshot({ ...operational, logs: { all: [{ observedAt: '2026-07-16T10:00:00Z' }] } }).ok, true, 'qualified log observation time must pass');
const validAtomicTrafficSample = {
  ...operational,
  overview: {
    ...operational.overview,
    history: {
      trafficSamples: [{
        timestamp: '2026-07-16T09:59:55Z',
        uplink: 0,
        downlink: 0,
        source: 'realtime',
        evidenceMode: 'current',
      }],
    },
  },
};
assert.strictEqual(schema.validatePanelSnapshot(validAtomicTrafficSample).ok, true, 'timezone-qualified atomic sample time must pass');
const missingTrafficTimestamp = JSON.parse(JSON.stringify(validAtomicTrafficSample));
delete missingTrafficTimestamp.overview.history.trafficSamples[0].timestamp;
assert.strictEqual(
  schema.validatePanelSnapshot(missingTrafficTimestamp).ok,
  false,
  'atomic traffic sample timestamp is required',
);

for (const [label, patch] of [
  ['missing traffic source', { source: '' }],
  ['unknown traffic evidence mode', { evidenceMode: 'trusted' }],
  ['missing current uplink', { uplink: null }],
  ['negative current downlink', { downlink: -1 }],
  ['unavailable traffic carrying rates', { evidenceMode: 'unavailable' }],
]) {
  const sample = { ...validAtomicTrafficSample.overview.history.trafficSamples[0], ...patch };
  const candidate = {
    ...validAtomicTrafficSample,
    overview: { ...validAtomicTrafficSample.overview, history: { trafficSamples: [sample] } },
  };
  assert.strictEqual(schema.validatePanelSnapshot(candidate).ok, false, label);
}
const validUnavailableTrafficSample = {
  ...validAtomicTrafficSample,
  overview: {
    ...validAtomicTrafficSample.overview,
    history: {
      trafficSamples: [{
        ...validAtomicTrafficSample.overview.history.trafficSamples[0],
        uplink: null,
        downlink: null,
        evidenceMode: 'unavailable',
      }],
    },
  },
};
assert.strictEqual(schema.validatePanelSnapshot(validUnavailableTrafficSample).ok, true, 'unavailable traffic sample must preserve a null counter boundary');
const validResourceHistory = {
  ...operational,
  overview: {
    ...operational.overview,
    history: {
      timestamps: ['2026-07-16T09:59:50Z', '2026-07-16T10:00:00Z'],
      cpu: [10, 20],
      memory: [30, 40],
      disk: [50, 60],
    },
  },
};
assert.strictEqual(schema.validatePanelSnapshot(validResourceHistory).ok, true, 'timezone-qualified resource history must pass');
const validAtomicResourceHistory = {
  ...operational,
  overview: {
    ...operational.overview,
    history: {
      resourceSamples: [{
        timestamp: '2026-07-16T09:59:55Z',
        cpu: 0,
        memory: 0,
        disk: 0,
        source: 'routeros-resource',
        evidenceMode: 'current',
      }],
    },
  },
};
assert.strictEqual(schema.validatePanelSnapshot(validAtomicResourceHistory).ok, true, 'complete timezone-qualified atomic resource samples must pass');
const partialAtomicResourceHistory = {
  ...validAtomicResourceHistory,
  overview: {
    ...validAtomicResourceHistory.overview,
    history: { resourceSamples: [{ ...validAtomicResourceHistory.overview.history.resourceSamples[0], cpu: null }] },
  },
};
assert.strictEqual(schema.validatePanelSnapshot(partialAtomicResourceHistory).ok, true, 'one missing metric preserves the remaining atomic resource observation');
for (const [label, patch] of [
  ['offset-free resource time', { timestamp: '2026-07-16 09:59:55' }],
  ['all current resource metrics missing', { cpu: null, memory: null, disk: null }],
  ['out-of-range memory', { memory: 101 }],
  ['missing resource source', { source: '' }],
  ['unknown evidence mode', { evidenceMode: 'trusted' }],
]) {
  const sample = { ...validAtomicResourceHistory.overview.history.resourceSamples[0], ...patch };
  const candidate = {
    ...validAtomicResourceHistory,
    overview: { ...validAtomicResourceHistory.overview, history: { resourceSamples: [sample] } },
  };
  assert.strictEqual(schema.validatePanelSnapshot(candidate).ok, false, label);
}
assert.strictEqual(schema.validatePanelSnapshot({
  ...validResourceHistory,
  overview: {
    ...validResourceHistory.overview,
    history: {
      ...validResourceHistory.overview.history,
      timestamps: [1721123990, '2026-07-16T10:00:00Z'],
    },
  },
}).ok, false, 'numeric epoch resource history must be rejected');
assert.strictEqual(schema.validatePanelSnapshot({
  ...validAtomicTrafficSample,
  overview: {
    ...validAtomicTrafficSample.overview,
    history: {
      trafficSamples: [{
        ...validAtomicTrafficSample.overview.history.trafficSamples[0],
        timestamp: '2026-07-16 09:59:55',
      }],
    },
  },
}).ok, false, 'offset-free atomic sample time must make the snapshot malformed');
assert.strictEqual(schema.validatePanelSnapshot({ ...operational, overview: { ...operational.overview, cpuLoad: 101 } }).ok, false, 'resource percentages must stay in range');
assert.strictEqual(schema.validatePanelSnapshot({ ...operational, interfaces: ['ether1'] }).ok, false, 'operational collections must contain objects');
assert.strictEqual(schema.validatePanelSnapshot({ ...operational, routes: { items: [], defaultRoutes: ['not-a-route'] } }).ok, false, 'nested route collections must contain objects');
assert.strictEqual(schema.validatePanelSnapshot({ ...operational, connections: { total: 1, active: [42] } }).ok, false, 'nested connection collections must contain objects');
assert.strictEqual(schema.validatePanelSnapshot({ ...operational, wan: [{ name: 'wan1', running: true, upRate: -1, downRate: 0 }] }).ok, false, 'observed rates must be non-negative finite numbers');
assert.strictEqual(schema.validatePanelSnapshot({ ...operational, terminals: Array.from({ length: 20001 }, () => ({})) }).ok, false, 'collection limits must be enforced');

const validOperational = schema.validatePanelSnapshot(operational);
assert.strictEqual(validOperational.ok, true);
assert.strictEqual(validOperational.kind, 'operational');
assert.strictEqual(validOperational.value.overview.cpuLoad, 0, 'observed zero must stay zero');
assert.strictEqual(validOperational.value.wan[0].upRate, 0, 'observed zero rate must stay zero');

const nullableRateOperational = schema.validatePanelSnapshot({
  ...operational,
  overview: { ...operational.overview, uplinkBps: null, downlinkBps: null },
  wan: [{ name: 'wan1', running: true, upRate: null, downRate: null }],
});
assert.strictEqual(nullableRateOperational.ok, true, 'unavailable current rates must remain schema-valid');
assert.strictEqual(nullableRateOperational.value.wan[0].upRate, null, 'unavailable rate must not be coerced to zero');

const emptyOperational = schema.validatePanelSnapshot({
  status: 'ok',
  updatedAt: now,
  meta: {},
  overview: {},
  interfaces: [],
  wan: [],
});
assert.strictEqual(emptyOperational.ok, true);
assert.strictEqual(emptyOperational.kind, 'partial', 'an empty envelope must not be promoted to operational evidence');
assert.strictEqual(
  schema.snapshotHasOperationalEvidence({ overview: {}, interfaces: [], wan: [] }),
  false,
  'empty records and collections are not operational evidence'
);
assert.strictEqual(
  schema.snapshotHasOperationalEvidence({ overview: { cpuLoad: 0 } }),
  true,
  'an explicitly observed zero remains operational evidence'
);

const validPartial = schema.validatePanelSnapshot({
  status: 'starting',
  updatedAt: now,
  meta: { pollSeconds: 5 },
});
assert.strictEqual(validPartial.ok, true);
assert.strictEqual(validPartial.kind, 'partial');

const validError = schema.validatePanelSnapshot({
  status: 'error',
  updatedAt: now,
  error: 'collector unavailable',
  meta: {},
});
assert.strictEqual(validError.ok, true);
assert.strictEqual(validError.kind, 'error');
assert.strictEqual(schema.snapshotPollSeconds(operational), 2, 'poll interval must be clamped at lower bound');
assert.strictEqual(schema.snapshotPollSeconds({ meta: { pollSeconds: 999 } }), 60, 'poll interval must be clamped at upper bound');
assert.strictEqual(schema.snapshotEvidenceTimestamp(operational), Date.parse(now));

const loginPayload = {
  ok: true,
  routerLogin: {
    configured: false,
    host: '',
    user: '',
    sshPort: 22,
    sshHostKeyFingerprint: '',
    restScheme: 'https',
    restPort: 443,
    restVerifyTls: true,
    insecureRestConfirmed: false,
    source: 'memory',
    savedId: null,
    updatedAt: null,
    passwordSet: false,
    lastTest: null,
  },
  savedLogins: [{
    id: 'router-a',
    host: '192.0.2.1',
    user: 'observer',
    sshPort: 22,
    sshHostKeyFingerprint: 'SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    restScheme: 'https',
    restPort: 443,
    restVerifyTls: true,
    insecureRestConfirmed: false,
    label: 'Lab Router',
    updatedAt: now,
    lastUsedAt: now,
    lastTest: null,
  }],
  profileStorageAvailable: true,
  csrfToken: 'csrf-test',
};

const bootstrap = schema.parseRouterLoginBootstrap(loginPayload);
assert.ok(bootstrap);
assert.strictEqual(bootstrap.routerLogin.configured, false);
assert.strictEqual(bootstrap.savedLogins[0].host, '192.0.2.1');
assert.strictEqual(bootstrap.savedLogins[0].restScheme, 'https');
assert.strictEqual(bootstrap.savedLogins[0].sshHostKeyFingerprint.startsWith('SHA256:'), true);
assert.strictEqual(schema.parseRouterLoginBootstrap({ ...loginPayload, csrfToken: '' }), null);
assert.strictEqual(schema.parseRouterLoginBootstrap({ ...loginPayload, savedLogins: [{}] }), null);
assert.strictEqual(schema.parseRouterLoginBootstrap({
  ...loginPayload,
  savedLogins: [{ ...loginPayload.savedLogins[0], updatedAt: '2026-07-16 10:00:00' }],
}), null, 'saved profile timestamps must include timezone');

const mutation = schema.parseRouterLoginMutation({
  ...loginPayload,
  routerLogin: { ...loginPayload.routerLogin, configured: true, host: '192.0.2.1', user: 'observer', passwordSet: true },
  test: {
    ssh: { ok: true, identity: 'lab-router', error: null, elapsedMs: 12, fingerprint: 'SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    rest: { ok: false, status: null, error: 'timeout', elapsedMs: 8000, scheme: 'https', port: 443, verifyTls: true },
    elapsedMs: 8001,
  },
  warning: 'REST unavailable',
});
assert.ok(mutation);
assert.strictEqual(mutation.test.ssh.ok, true);
assert.strictEqual(mutation.test.rest.ok, false);
assert.strictEqual(mutation.warning, 'REST unavailable');

const validTrustMutation = schema.parseRouterLoginMutation({
  ...loginPayload,
  routerLogin: { ...loginPayload.routerLogin, configured: true, host: '192.0.2.1', user: 'observer', passwordSet: true },
  test: {
    ssh: {
      ok: false,
      error: 'confirmation required',
      elapsedMs: 12,
      fingerprint: 'SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      confirmationRequired: true,
      trustToken: 'session-bound-token',
      trustExpiresAt: '2026-07-16T10:01:00Z',
    },
    rest: { ok: true, error: null, elapsedMs: 8, scheme: 'https', port: 443, verifyTls: true },
    elapsedMs: 13,
  },
  warning: '',
});
assert.ok(validTrustMutation, 'timezone-qualified trust expiry must pass');
assert.strictEqual(validTrustMutation.test.ssh.trustExpiresAt, '2026-07-16T10:01:00Z');
assert.strictEqual(schema.parseRouterLoginMutation({
  ...loginPayload,
  routerLogin: { ...loginPayload.routerLogin, configured: true, host: '192.0.2.1', user: 'observer', passwordSet: true },
  test: {
    ...validTrustMutation.test,
    ssh: { ...validTrustMutation.test.ssh, trustExpiresAt: '2026-07-16 10:01:00' },
  },
  warning: '',
}), null, 'offset-free trust expiry must reject the mutation envelope');

console.log('[runtime-schema] PASS malformed/error/partial/operational/login/RFC3339-history contracts');
