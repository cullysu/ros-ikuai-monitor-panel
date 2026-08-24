#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "tools", "check-mobile-reference-runtime.js"), "utf8");
const wrapper = fs.readFileSync(path.join(root, "tools", "run-mobile-reference-cell-low-load.cmd"), "utf8");
const scenarioWrapper = fs.readFileSync(path.join(root, "tools", "run-mobile-reference-scenario-low-load.cmd"), "utf8");
const runtimeLauncher = fs.readFileSync(path.join(root, "tools", "run-mobile-reference-runtime.js"), "utf8");
const runtimeWrapper = fs.readFileSync(path.join(root, "tools", "run-mobile-reference-runtime-low-load.cmd"), "utf8");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const { cpuLoadBetween, scenarios, viewports } = require(path.join(root, "tools", "check-mobile-reference-runtime.js"));
const { decodePngIdentity, verifyCellPngEvidence } = require(path.join(root, "tools", "png-evidence-identity"));
const { assertRuntimeLaunchContract, captureRuntimeIdentity, sameRuntimeCore } = require(path.join(root, "tools", "runtime-process-identity"));

assert.match(source, /process\.env\.MOBILE_SCENARIO/);
assert.match(source, /process\.env\.MOBILE_VIEWPORT/);
assert.match(source, /const append = process\.argv\.includes\("--append"\)/);
assert.match(source, /const skipInteractions = process\.argv\.includes\("--skip-interactions"\)/);
assert.match(source, /const requiredTargets = scenarios\.flatMap/, "the required matrix must remain global even for a filtered run");
assert.doesNotMatch(source, /const requiredTargets = selectedScenarios\.flatMap/, "a scenario subset must never redefine matrix completeness");
assert.match(source, /assert\(sameIdentity\(previous, identityStart\)/, "incremental evidence must reject a different worktree identity");
assert.match(source, /const output = path\.join\(root, "_acceptance", smoke \? "mobile-reference-runtime-smoke" : "mobile-reference-runtime"\)/, 'smoke and full evidence must use isolated directories');
assert.match(source, /decodePngIdentity\(file\)/, 'every captured cell must be structurally decoded');
assert.match(source, /png: \{ width: png\.width, height: png\.height, bytes: png\.bytes, sha256: png\.sha256 \}/, 'cell evidence must retain real dimensions, bytes, and SHA-256');
assert.match(source, /assertAppendCellsAreFresh\(previous\)/, 'append mode must revalidate every historical PNG');
assert.match(source, /evidenceErrors\.length === 0/, 'final pass must require fresh decoded evidence for all retained cells');
assert.match(source, /verifiedCellCount === requiredTargets\.length/, 'matrix completeness must require exactly 49 verified passing cells');
assert.match(source, /sameRuntimeCore\(previous\.runtimeEnd, runtimeStart\)/, 'append batches must reject a different runtime producer');
assert.match(source, /const runtimeStart = assertRuntimeLaunchContract\(root\)/, 'producer identity must fail closed before browser launch');
assert.match(
  fs.readFileSync(path.join(root, 'tools', 'run-mobile-reference-runtime.js'), 'utf8'),
  /MOBILE_RUNTIME_LAUNCHER_ID: path\.join\(__dirname, "run-mobile-reference-runtime\.js"\)/,
  'the bounded launcher must stamp its absolute identity into every child',
);
assert.match(source, /const pass = complete;/, "top-level pass must remain false for every incomplete batch");
assert.equal(scenarios.length, 7, "mobile runtime must retain exactly seven truthful scenarios");
assert.deepEqual(
  viewports.map(([id, width, height]) => [id, width, height]),
  [
    ["phone320", 320, 568], ["phone360", 360, 800], ["phone375", 375, 667],
    ["phone390", 390, 844], ["phone430", 430, 932], ["landscape568", 568, 320],
    ["tablet768", 768, 1024],
  ],
  "mobile runtime must own the exact seven-viewports list and exclude 600px-plus landscapes",
);
assert.equal(scenarios.length * viewports.length, 49, "mobile runtime release matrix must remain exactly 7 x 7 = 49 cells");
assert.doesNotMatch(source, /viewport\[2\] <= 500/, "short viewport height must not force a phone landscape into the retired side rail");
assert.match(source, /viewport\[0\] === "landscape568"/, "568px landscape must have a dedicated bottom-navigation assertion");
assert.match(source, /partialRequest \? runPass : pass/, "a valid partial batch may exit successfully without claiming matrix completion");
assert.match(source, /completed: verifiedCellCount/, "reports must count only cells whose PNG evidence re-decodes successfully");
assert.match(source, /remaining: Math\.max\(0, requiredTargets\.length - verifiedCellCount\)/, "partial reports must expose their truthfully verified remaining cell count");
assert.match(source, /Math\.min\(55,/, "the runtime CPU limit must never be configurable above 55 percent");
assert.match(source, /waitForCpuBudget\("runtime-launch"\)/, "browser launch must be guarded by a whole-system CPU sample");
assert.match(source, /waitForCpuBudget\(`\$\{scenario\[0\]\}-\$\{viewport\[0\]\}`\)/, "every matrix cell must be CPU guarded");
assert.match(source, /os\.setPriority\(0, os\.constants\.priority\.PRIORITY_BELOW_NORMAL\)/, "the acceptance coordinator must run below normal priority");
assert.match(source, /MOBILE_CPU_AFFINITY_ENFORCED === "1"/, "local Windows browser acceptance must reject direct unbounded launch");
assert.match(wrapper, /node tools\\run-mobile-reference-runtime\.js/, "the low-load wrapper must enter through the identity-stamping runtime launcher");
assert.doesNotMatch(wrapper, /check-mobile-reference-runtime\.js/, "the low-load wrapper must never bypass the portable launcher");
assert.doesNotMatch(wrapper, /\bstart\b/i, "the low-load wrapper must never use cmd start or create a detached popup");
assert.match(wrapper, /if %NUMBER_OF_PROCESSORS% LSS 8/, "the one-core envelope must fail closed on small machines");
assert.match(wrapper, /set MOBILE_MAX_CPU_PERCENT=55/, "the wrapper must reserve at least 15 percent whole-system headroom");
assert.match(wrapper, /set MOBILE_CPU_AFFINITY_ENFORCED=1/, "the wrapper must mark the enforced local launch path");
assert.match(scenarioWrapper, /MOBILE_SCENARIO is required/, "the serial scenario wrapper must reject an unbounded all-scenario launch");
assert.match(scenarioWrapper, /set MOBILE_VIEWPORT=/, "the serial scenario wrapper must select every required viewport for one scenario");
assert.match(scenarioWrapper, /node tools\\run-mobile-reference-runtime\.js/, "the serial scenario wrapper must enter through the identity-stamping runtime launcher");
assert.doesNotMatch(scenarioWrapper, /check-mobile-reference-runtime\.js/, "the serial scenario wrapper must never bypass the portable launcher");
assert.doesNotMatch(scenarioWrapper, /\bstart\b/i, "the serial scenario wrapper must never use cmd start");
assert.match(scenarioWrapper, /set MOBILE_MAX_CPU_PERCENT=55/, "the serial scenario wrapper must preserve the whole-system headroom gate");
assert.match(scenarioWrapper, /--skip-interactions/, "scenario batches must defer interaction workflows until the complete cell set exists");
assert.match(scenarioWrapper, /MOBILE_BATCH_MODE%"=="first"/, "the serial scenario wrapper must support a clean identity-bound first batch");
assert.match(runtimeLauncher, /process\.platform === "win32" && process\.env\.CI !== "true"/, "the portable launcher must route only local Windows runs through the affinity wrapper");
assert.match(runtimeLauncher, /run-low-load\.py/, "the portable launcher must own the local Windows low-load handoff directly");
assert.match(runtimeLauncher, /"--browser", process\.execPath, runtime/, "the portable launcher must invoke the runtime through the browser Job Object envelope");
assert.doesNotMatch(runtimeLauncher, /ComSpec|run-mobile-reference-runtime-low-load\.cmd/, "the portable launcher must not re-enter cmd or a detached wrapper");
assert.match(runtimeWrapper, /node tools\\run-mobile-reference-runtime\.js/, "the whole-runtime wrapper must enter through the identity-stamping runtime launcher");
assert.doesNotMatch(runtimeWrapper, /check-mobile-reference-runtime\.js/, "the whole-runtime wrapper must never bypass the portable launcher");
assert.doesNotMatch(runtimeWrapper, /\bstart\b/i, "the whole-runtime wrapper must never use cmd start");
assert.match(runtimeWrapper, /set MOBILE_CPU_AFFINITY_ENFORCED=1/, "the whole-runtime wrapper must mark the enforced launch path");
assert.match(runtimeWrapper, /%\*/, "the whole-runtime wrapper must forward smoke and full-matrix arguments");
for (const scriptName of ["check:mobile-telemetry", "check:mobile-telemetry:full", "check:mobile-reference-runtime"]) {
  assert.match(packageJson.scripts[scriptName], /tools\/run-mobile-reference-runtime\.js/, `${scriptName} must use the portable bounded launcher`);
}
assert.equal(cpuLoadBetween({ total: 1000, idle: 400 }, { total: 2000, idle: 700 }), 70);
assert.equal(cpuLoadBetween({ total: 1000, idle: 400 }, { total: 2000, idle: 800 }), 60);

{
  const oneByOnePng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  );
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mobile-png-evidence-'));
  const pngPath = path.join(tempRoot, 'one.png');
  try {
    fs.writeFileSync(pngPath, oneByOnePng);
    const decoded = decodePngIdentity(pngPath);
    assert.equal(decoded.width, 1);
    assert.equal(decoded.height, 1);
    assert.equal(decoded.bytes, oneByOnePng.length);
    const cell = { scenario: 'single', viewport: { id: 'one', width: 1, height: 1 }, file: pngPath, pass: true, png: decoded };
    assert.deepEqual(verifyCellPngEvidence(cell, tempRoot, 1, 1), []);
    const tampered = { ...cell, png: { ...decoded, sha256: '0'.repeat(64) } };
    assert(
      verifyCellPngEvidence(tampered, tempRoot, 1, 1).some((error) => error.includes('sha256')),
      'a stale screenshot hash must fail release validation',
    );
    fs.writeFileSync(pngPath, Buffer.from('not-a-png'));
    assert.throws(() => decodePngIdentity(pngPath), /file is not a PNG/);

    const runtime = captureRuntimeIdentity(root);
    assert.throws(
      () => assertRuntimeLaunchContract(root),
      /mobile runtime evidence must be launched by tools\/run-mobile-reference-runtime\.js/,
    );
    assert.equal(sameRuntimeCore(runtime, { ...runtime, pid: runtime.pid + 1 }), true);
    assert.equal(sameRuntimeCore(runtime, { ...runtime, execPath: '/other/node' }), false);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

console.log(JSON.stringify({ pass: true, contract: "mobile-reference-runtime-batching-v1", requiredCells: 49, maxCpuPercent: 55, localWindowsAffinityCores: 1 }));
