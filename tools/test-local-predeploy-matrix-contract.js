'use strict';

const assert = require('assert/strict');
const {
  OVERVIEW_RELEASE_SCALE_SCENARIOS,
  analyzeScreenshotAnchorPixels,
  buildSnapshot,
  buildMatrixSummary,
  matrixArtifactKey,
  refreshOverviewWanRates,
  setSnapshotFresh,
  scenarioMatrixGate,
} = require('./local-predeploy-check');

const RELEASE_SCENARIOS = [
  'single',
  'fleet',
  'all-offline',
  'no-snapshot',
  'collection-down',
  'resource-full',
  'interfaces-down',
];
const RELEASE_VIEWPORTS = [
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'desktop1440', width: 1440, height: 900 },
  { name: 'wide', width: 844, height: 390 },
  { name: 'narrow', width: 390, height: 844 },
];

function args(overrides = {}) {
  return {
    profile: 'public',
    sections: ['overview'],
    scaleScenarios: ['all-offline'],
    scaleScenariosExplicit: true,
    viewports: [{ name: 'narrow', width: 390, height: 844 }],
    viewportsExplicit: true,
    sectionsExplicit: true,
    boundedMatrix: false,
    ...overrides,
  };
}

function check(scenario, viewport, pass = true) {
  return {
    profile: 'public',
    scaleScenario: scenario,
    requestedSection: 'overview',
    viewport,
    pass,
  };
}

function testMergeableShardIsExplicitlyNotApplicable() {
  const options = args();
  const matrix = buildMatrixSummary([check('all-offline', options.viewports[0])], options);
  const gate = scenarioMatrixGate(options, matrix);

  assert.equal(matrix.requestedComplete, true);
  assert.equal(matrix.complete, false);
  assert.equal(gate.applicable, false);
  assert.equal(gate.pass, null);
  assert.match(gate.reason, /bounded scenario shard/i);
}

function testRealShardFailureRemainsApplicableAndFalse() {
  const options = args();
  const matrix = buildMatrixSummary([check('all-offline', options.viewports[0], false)], options);
  const gate = scenarioMatrixGate(options, matrix);

  assert.equal(matrix.failed, 1);
  assert.equal(matrix.requestedComplete, false);
  assert.equal(gate.applicable, true);
  assert.equal(gate.pass, false);
}

function testClaimedRequiredMatrixMissingViewportFails() {
  const options = args({
    scaleScenarios: RELEASE_SCENARIOS,
    viewports: [{ name: 'narrow', width: 390, height: 844 }],
  });
  const matrix = buildMatrixSummary(
    RELEASE_SCENARIOS.map((scenario) => check(scenario, options.viewports[0])),
    options,
  );
  const gate = scenarioMatrixGate(options, matrix);

  assert.equal(matrix.requestedComplete, true);
  assert.equal(matrix.complete, false);
  assert.equal(gate.applicable, true);
  assert.equal(gate.pass, false);
}

function testCompleteRequiredMatrixPasses() {
  const options = args({
    scaleScenarios: RELEASE_SCENARIOS,
    viewports: RELEASE_VIEWPORTS,
  });
  const checks = RELEASE_SCENARIOS.flatMap((scenario) => (
    RELEASE_VIEWPORTS.map((viewport) => check(scenario, viewport))
  ));
  const matrix = buildMatrixSummary(checks, options);
  const gate = scenarioMatrixGate(options, matrix);

  assert.equal(matrix.requestedComplete, true);
  assert.equal(matrix.complete, true);
  assert.equal(gate.applicable, true);
  assert.equal(gate.pass, true);
}

function testBoundedCapabilityMatrixIsExplicitlyNotApplicable() {
  const mobileViewports = [
    { name: 'p320', width: 320, height: 568 },
    { name: 'narrow', width: 390, height: 844 },
  ];
  const options = args({
    scaleScenarios: RELEASE_SCENARIOS,
    viewports: mobileViewports,
    boundedMatrix: true,
  });
  const checks = RELEASE_SCENARIOS.flatMap((scenario) => (
    mobileViewports.map((viewport) => check(scenario, viewport))
  ));
  const matrix = buildMatrixSummary(checks, options);
  const gate = scenarioMatrixGate(options, matrix);

  assert.equal(matrix.requestedComplete, true);
  assert.equal(matrix.complete, false);
  assert.equal(gate.applicable, false);
  assert.equal(gate.pass, null);
  assert.equal(gate.boundedMatrix, true);
  assert.match(gate.reason, /bounded capability matrix/i);
}

function testBoundedCapabilityMatrixFailureStillBlocks() {
  const options = args({
    scaleScenarios: RELEASE_SCENARIOS,
    viewports: [{ name: 'p320', width: 320, height: 568 }],
    boundedMatrix: true,
  });
  const checks = RELEASE_SCENARIOS.map((scenario, index) => (
    check(scenario, options.viewports[0], index !== 0)
  ));
  const matrix = buildMatrixSummary(checks, options);
  const gate = scenarioMatrixGate(options, matrix);

  assert.equal(matrix.failed, 1);
  assert.equal(gate.applicable, true);
  assert.equal(gate.pass, false);
  assert.equal(gate.boundedMatrix, true);
}

function testReleaseScenarioDenominatorHasOneOwner() {
  assert.deepEqual(
    OVERVIEW_RELEASE_SCALE_SCENARIOS,
    RELEASE_SCENARIOS,
    'the matrix producer and focused contract must share the same seven-scenario denominator',
  );
}

function testBrowserFixturesUseAtomicTimezoneQualifiedTraffic() {
  assert.equal(typeof buildSnapshot, 'function', 'browser fixture builder must be testable as a contract producer');
  const rfc3339WithTimezone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
  for (const scenario of RELEASE_SCENARIOS) {
    const snapshot = buildSnapshot('public', scenario);
    const samples = snapshot.overview?.history?.trafficSamples || [];
    if (scenario === 'no-snapshot') {
      assert.equal(samples.length, 0, 'no-snapshot must not retain business traffic points');
      continue;
    }
    assert.ok(samples.length >= 2, `${scenario} must expose an atomic traffic sequence`);
    for (const sample of samples) {
      assert.match(sample.timestamp, rfc3339WithTimezone, `${scenario} traffic timestamps require an explicit timezone`);
      assert.equal(typeof sample.source, 'string');
    }
    const snapshotTime = Date.parse(snapshot.updatedAt);
    const finalSampleTime = Date.parse(samples[samples.length - 1].timestamp);
    assert.ok(
      Number.isFinite(snapshotTime) && Number.isFinite(finalSampleTime) && Math.abs(snapshotTime - finalSampleTime) <= 120_000,
      `${scenario} final traffic sample must belong to the current snapshot window`,
    );
    if (scenario === 'collection-down') {
      assert.ok(samples.every((sample) => sample.evidenceMode === 'historical'));
      continue;
    }
    assert.ok(samples.every((sample) => sample.evidenceMode === 'current'));
    const activeWan = (snapshot.wan || []).filter((row) => row.running !== false && row.disabled !== true);
    const expectedDown = activeWan.reduce((sum, row) => sum + Number(row.downRate || 0), 0);
    const expectedUp = activeWan.reduce((sum, row) => sum + Number(row.upRate || 0), 0);
    const last = samples[samples.length - 1];
    assert.equal(last.downlink, expectedDown, `${scenario} final downlink sample must match active WAN`);
    assert.equal(last.uplink, expectedUp, `${scenario} final uplink sample must match active WAN`);
  }
}

function testMissingWanRatesRemainUnavailable() {
  const snapshot = buildSnapshot('public', 'single');
  const activeWan = snapshot.wan.find((row) => row.running !== false && row.disabled !== true);
  assert.ok(activeWan, 'single fixture must contain an active WAN row');
  activeWan.upRate = undefined;
  activeWan.downRate = null;
  refreshOverviewWanRates(snapshot);
  assert.equal(snapshot.overview.uplinkBps, null, 'missing upload observation must remain unavailable');
  assert.equal(snapshot.overview.downlinkBps, null, 'missing download observation must remain unavailable');
  setSnapshotFresh(snapshot);
  const samples = snapshot.overview.history.trafficSamples;
  assert.ok(samples.length >= 2, 'fixture should retain the atomic sample sequence');
  assert.ok(samples.every((sample) => sample.uplink === null && sample.downlink === null), 'missing WAN rates must not become zero-valued samples');
  assert.ok(samples.every((sample) => sample.evidenceMode === 'unavailable'), 'missing WAN rates must carry unavailable evidence');
}

function testTrafficAccumulatingIsDiagnosticAndAtomic() {
  const snapshot = buildSnapshot('public', 'traffic-accumulating');
  const samples = snapshot.overview?.history?.trafficSamples || [];
  assert.equal(samples.length, 1, 'diagnostic fixture must retain exactly one atomic WAN sample');
  assert.match(samples[0].timestamp, /(?:Z|[+-]\d{2}:\d{2})$/);
  assert.equal(samples[0].evidenceMode, 'current');
  assert.equal(snapshot.meta?.scaleScenario, 'traffic-accumulating');
  assert.equal(RELEASE_SCENARIOS.includes('traffic-accumulating'), false, 'diagnostic lifecycle state must not change the seven-scenario release denominator');
}

function testScreenshotAnchorAnalyzerRejectsMissingLayers() {
  assert.equal(
    typeof analyzeScreenshotAnchorPixels,
    'function',
    'screenshot anchor analysis must remain independently testable',
  );
  const width = 220;
  const height = 140;
  const surface = () => {
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let index = 0; index < pixels.length; index += 4) {
      pixels[index] = 242;
      pixels[index + 1] = 247;
      pixels[index + 2] = 249;
      pixels[index + 3] = 255;
    }
    return pixels;
  };
  const anchors = [
    { name: 'desktop-toolbar', present: true, rect: { x: 10, y: 8, width: 200, height: 30 } },
    { name: 'task-navigation', present: true, rect: { x: 0, y: 44, width: 42, height: 92 } },
    { name: 'status-bus', present: true, rect: { x: 48, y: 44, width: 162, height: 72 } },
  ];
  const paint = (pixels, rect, color = [34, 82, 104]) => {
    const setPixel = (x, y) => {
      const offset = (y * width + x) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
    };
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      setPixel(x, rect.y);
      setPixel(x, rect.y + rect.height - 1);
    }
    for (let y = rect.y + 5; y < rect.y + rect.height - 3; y += 9) {
      for (let x = rect.x + 6; x < Math.min(rect.x + rect.width - 5, rect.x + 42); x += 1) {
        setPixel(x, y);
        setPixel(x, y + 1);
      }
    }
  };

  const healthyPixels = surface();
  for (const anchor of anchors) paint(healthyPixels, anchor.rect);
  const healthy = analyzeScreenshotAnchorPixels({ pixels: healthyPixels, width, height, anchors });
  assert.equal(healthy.pass, true, 'text and boundary strokes must satisfy each visual anchor');

  const blank = analyzeScreenshotAnchorPixels({ pixels: surface(), width, height, anchors });
  assert.equal(blank.pass, false, 'a stable but blank compositor result must fail');
  assert.ok(blank.anchors.every((anchor) => anchor.pass === false));

  const uniformPixels = surface();
  for (let y = 8; y < 38; y += 1) {
    for (let x = 10; x < 210; x += 1) {
      const offset = (y * width + x) * 4;
      uniformPixels[offset] = 30;
      uniformPixels[offset + 1] = 30;
      uniformPixels[offset + 2] = 30;
    }
  }
  const uniform = analyzeScreenshotAnchorPixels({ pixels: uniformPixels, width, height, anchors });
  assert.equal(uniform.pass, false, 'a solid dark corruption must not pass as rendered text');
  assert.equal(uniform.anchors.find((anchor) => anchor.name === 'desktop-toolbar')?.pass, false);
}

function testDirtyWorktreeArtifactsCannotUseCommitReleaseKey() {
  const commit = '0123456789abcdef0123456789abcdef01234567';
  assert.equal(
    matrixArtifactKey({ commit, worktreeClean: true, worktreeFingerprint: 'a'.repeat(64) }),
    commit,
  );
  const dirtyA = matrixArtifactKey({ commit, worktreeClean: false, worktreeFingerprint: 'a'.repeat(64) });
  const dirtyB = matrixArtifactKey({ commit, worktreeClean: false, worktreeFingerprint: 'b'.repeat(64) });
  assert.match(dirtyA, /^worktree-0123456789ab-a{12}$/);
  assert.notEqual(dirtyA, dirtyB);
  assert.notEqual(dirtyA, commit);
}

testMergeableShardIsExplicitlyNotApplicable();
testRealShardFailureRemainsApplicableAndFalse();
testClaimedRequiredMatrixMissingViewportFails();
testCompleteRequiredMatrixPasses();
testBoundedCapabilityMatrixIsExplicitlyNotApplicable();
testBoundedCapabilityMatrixFailureStillBlocks();
testReleaseScenarioDenominatorHasOneOwner();
testBrowserFixturesUseAtomicTimezoneQualifiedTraffic();
testTrafficAccumulatingIsDiagnosticAndAtomic();
testMissingWanRatesRemainUnavailable();
testScreenshotAnchorAnalyzerRejectsMissingLayers();
testDirtyWorktreeArtifactsCannotUseCommitReleaseKey();
console.log('local-predeploy matrix contract: 11/11 passed');
