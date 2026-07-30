'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const readJson = (relative) => JSON.parse(read(relative));
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const currentState = read('docs/decision-system/current-state.md');
const decisionIndex = read('docs/decision-system/README.md');
const handoff = read('docs/product-loop-current.md');
const journal = read('docs/panel-redesign-decision-log.md');
const fullContract = read('docs/full-console-product-contract.md');
const mobileContract = read('docs/mobile-product-contract.md');
const machine = readJson('.product-loop/state.json');

const latestStep = Number(machine.latest_decision_step);
const latestOutcome = String(machine.latest_decision_outcome || '');
const first = (source, pattern) => source.match(pattern)?.[1] || null;
const top = (source, lines) => source.split(/\r?\n/).slice(0, lines).join('\n');
const gate = (name) => machine.gates?.[name]?.status;

expect(Number.isSafeInteger(latestStep) && latestStep > 0, 'machine latest_decision_step must be a positive integer');
expect(latestOutcome.startsWith(`${latestStep}:`), 'machine latest_decision_outcome must be bound to latest_decision_step');
expect(machine.current_surface_step === latestStep, 'machine current_surface_step must equal latest_decision_step');

expect(first(currentState, /^- currentConclusionForStep:\s*`(\d+)`/m) === String(latestStep), 'current-state top pointer is stale');
expect(first(decisionIndex, /^- latestRecordedStep:\s*`(\d+)`/m) === String(latestStep), 'decision index top pointer is stale');
expect(first(handoff, /^- currentHandoffForStep:\s*`(\d+)`/m) === String(latestStep), 'product-loop top pointer is stale');
expect(first(decisionIndex, /^- currentBoundaryForStep:\s*`(\d+)`/m) === String(latestStep), 'decision index current boundary is stale');

const currentTop = top(currentState, 100);
const handoffTop = top(handoff, 100);
const journalTop = top(journal, 20);
expect(/\*\*FAIL\s+overall/.test(currentTop), 'current-state top must state FAIL overall');
expect(/\*\*FAIL overall/.test(handoffTop), 'product-loop top must state FAIL overall');
expect(/\| Current product release \| `fail` \|/.test(handoff), 'product-loop must keep current product release fail-closed');
expect(!/\| Current product release \| `pass` \|/.test(handoff), 'product-loop contains a current product release PASS claim');

expect(/status:\s*`historical-journal`/.test(journalTop), 'decision log must remain explicitly historical');
expect(/supersededBy:\s*`docs\/decision-system\/current-state\.md`/.test(journalTop), 'decision log must point to current-state authority');
expect(/当前产品结论：\*\*FAIL/.test(journalTop), 'decision log must keep the current product conclusion FAIL');
expect(/当前权威来源：`docs\/decision-system\/current-state\.md`/.test(journalTop), 'decision log must identify current-state authority');

expect(gate('product') === 'failed', 'machine Product gate must remain failed');
expect(gate('design') === 'failed', 'machine Design gate must remain failed');
expect(gate('visual-qa') === 'failed', 'machine Visual QA gate must remain failed');
expect(gate('state-matrix') === 'pending', 'machine State Matrix gate must remain pending');
expect(gate('release-hygiene') === 'pending', 'machine release hygiene gate must remain pending');

expect(/status:\s*`current-contract\s*\/\s*acceptance-failed`/.test(fullContract), 'full product contract must remain acceptance-failed');
expect(/Product release gate:\s*\*\*FAIL/.test(fullContract), 'full product contract must keep product release FAIL');
expect(/status:\s*`current-contract\s*\/\s*acceptance-failed`/.test(mobileContract), 'mobile product contract must remain acceptance-failed');
expect(/Product\/design\/visual gate:\s*\*\*FAIL/.test(mobileContract), 'mobile product contract must keep Product/Design/Visual FAIL boundary');

expect(/validForCommit:.*uncommitted/i.test(top(currentState, 12)), 'current-state must not advertise a clean release candidate');
expect(/not a release candidate/i.test(top(handoff, 12)), 'product-loop must not advertise a release candidate');
expect(/historical.*engineering distribution|历史工程发行事实/i.test(journalTop), 'historical engineering distribution must remain labelled historical');

const report = {
  pass: failures.length === 0,
  contract: 'current-release-boundary-v1',
  latestStep,
  latestOutcome,
  failures,
  checks: {
    pointers: failures.filter((failure) => /pointer|boundary|latest_decision|current_surface|outcome/.test(failure)).length === 0,
    currentFail: /\*\*FAIL\s+overall/.test(currentTop) && /\*\*FAIL overall/.test(handoffTop),
    historicalBoundary: /historical-journal/.test(journalTop) && /supersededBy/.test(journalTop),
    productDesignVisualFailed: gate('product') === 'failed' && gate('design') === 'failed' && gate('visual-qa') === 'failed',
    contractsFailClosed: /acceptance-failed/.test(fullContract) && /acceptance-failed/.test(mobileContract),
    candidateClosed: /not a release candidate/i.test(top(handoff, 12)),
  },
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
