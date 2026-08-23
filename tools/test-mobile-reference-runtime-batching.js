#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "tools", "check-mobile-reference-runtime.js"), "utf8");
const wrapper = fs.readFileSync(path.join(root, "tools", "run-mobile-reference-cell-low-load.cmd"), "utf8");
const scenarioWrapper = fs.readFileSync(path.join(root, "tools", "run-mobile-reference-scenario-low-load.cmd"), "utf8");
const { cpuLoadBetween } = require(path.join(root, "tools", "check-mobile-reference-runtime.js"));

assert.match(source, /process\.env\.MOBILE_SCENARIO/);
assert.match(source, /process\.env\.MOBILE_VIEWPORT/);
assert.match(source, /const append = process\.argv\.includes\("--append"\)/);
assert.match(source, /const skipInteractions = process\.argv\.includes\("--skip-interactions"\)/);
assert.match(source, /const requiredTargets = scenarios\.flatMap/, "the required matrix must remain global even for a filtered run");
assert.doesNotMatch(source, /const requiredTargets = selectedScenarios\.flatMap/, "a scenario subset must never redefine matrix completeness");
assert.match(source, /assert\(sameIdentity\(previous, identityStart\)/, "incremental evidence must reject a different worktree identity");
assert.match(source, /const complete = !smoke && fullCellSet && workflowsComplete/, "top-level completion must require all cells and interaction workflows");
assert.match(source, /const pass = complete;/, "top-level pass must remain false for every incomplete batch");
assert.match(source, /partialRequest \? runPass : pass/, "a valid partial batch may exit successfully without claiming matrix completion");
assert.match(source, /remaining: Math\.max\(0, requiredTargets\.length - cells\.length\)/, "partial reports must expose their remaining cell count");
assert.match(source, /Math\.min\(55,/, "the runtime CPU limit must never be configurable above 55 percent");
assert.match(source, /waitForCpuBudget\("runtime-launch"\)/, "browser launch must be guarded by a whole-system CPU sample");
assert.match(source, /waitForCpuBudget\(`\$\{scenario\[0\]\}-\$\{viewport\[0\]\}`\)/, "every matrix cell must be CPU guarded");
assert.match(source, /os\.setPriority\(0, os\.constants\.priority\.PRIORITY_BELOW_NORMAL\)/, "the acceptance coordinator must run below normal priority");
assert.match(source, /MOBILE_CPU_AFFINITY_ENFORCED === "1"/, "local Windows browser acceptance must reject direct unbounded launch");
assert.match(wrapper, /\/affinity 1 \/belownormal \/wait \/b node/, "the low-load wrapper must constrain the complete browser process tree to one logical processor");
assert.match(wrapper, /if %NUMBER_OF_PROCESSORS% LSS 8/, "the one-core envelope must fail closed on small machines");
assert.match(wrapper, /set MOBILE_MAX_CPU_PERCENT=55/, "the wrapper must reserve at least 15 percent whole-system headroom");
assert.match(wrapper, /set MOBILE_CPU_AFFINITY_ENFORCED=1/, "the wrapper must mark the enforced local launch path");
assert.match(scenarioWrapper, /MOBILE_SCENARIO is required/, "the serial scenario wrapper must reject an unbounded all-scenario launch");
assert.match(scenarioWrapper, /set MOBILE_VIEWPORT=/, "the serial scenario wrapper must select every required viewport for one scenario");
assert.match(scenarioWrapper, /\/affinity 1 \/belownormal \/wait \/b node/, "the serial scenario wrapper must constrain the complete browser process tree to one logical processor");
assert.match(scenarioWrapper, /set MOBILE_MAX_CPU_PERCENT=55/, "the serial scenario wrapper must preserve the whole-system headroom gate");
assert.match(scenarioWrapper, /--skip-interactions/, "scenario batches must defer interaction workflows until the complete cell set exists");
assert.match(scenarioWrapper, /MOBILE_BATCH_MODE%"=="first"/, "the serial scenario wrapper must support a clean identity-bound first batch");
assert.equal(cpuLoadBetween({ total: 1000, idle: 400 }, { total: 2000, idle: 700 }), 70);
assert.equal(cpuLoadBetween({ total: 1000, idle: 400 }, { total: 2000, idle: 800 }), 60);

console.log(JSON.stringify({ pass: true, contract: "mobile-reference-runtime-batching-v1", requiredCells: 56, maxCpuPercent: 55, localWindowsAffinityCores: 1 }));
