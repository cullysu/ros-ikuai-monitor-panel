#!/usr/bin/env node
'use strict';

const path = require('node:path');
const {
  browserExecutable,
  launchManagedBrowser,
  processExists,
  runBrowserLifecycle,
  writeDiagnostic,
} = require('./browser-lifecycle');

const configuredLowLoadTimeoutMs = Number(process.env.CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS);
const lowLoadTimeoutMs = Number.isFinite(configuredLowLoadTimeoutMs)
  ? Math.min(Math.max(configuredLowLoadTimeoutMs, 8_000), 120_000)
  : 8_000;
const lowLoadCleanupTimeoutMs = Number.isFinite(configuredLowLoadTimeoutMs)
  ? Math.min(lowLoadTimeoutMs, 30_000)
  : 8_000;
const lowLoadGlobalTimeoutMs = Number.isFinite(configuredLowLoadTimeoutMs) ? 120_000 : 24_000;

const artifactPath = path.join(__dirname, '.artifacts', 'latest-report.json');

async function exercise(round, name, options, task, expectation, requireForcedRecovery = false) {
  const startedAt = Date.now();
  const outcome = await runBrowserLifecycle(options, task);
  const elapsedMs = Date.now() - startedAt;
  const cleanupLabels = outcome.diagnostics.cleanup.map((entry) => entry.label);
  const managedCleanup = outcome.diagnostics.browserLifecycle?.cleanup || [];
  const managedCleanupLabels = managedCleanup.map((entry) => entry.label);
  const ownedBrowserPid = outcome.diagnostics.ownedBrowserPid;
  const pass = expectation(outcome) &&
    cleanupLabels.includes('context.close') &&
    cleanupLabels.includes('managed-browser.close') &&
    outcome.diagnostics.cleanup.every((entry) => entry.status === 'ok') &&
    managedCleanupLabels.includes('browser.close') &&
    managedCleanupLabels.includes('browser-server.close') &&
    managedCleanupLabels.includes('process-tree.terminate') &&
    managedCleanup.every((entry) => entry.status === 'ok') &&
    managedCleanup.some((entry) => entry.label === 'process-tree.verify' && entry.status === 'ok') &&
    (!requireForcedRecovery || managedCleanup.some((entry) => entry.label === 'browser-server.close' && entry.mode === 'forced-recovery')) &&
    (!requireForcedRecovery || managedCleanup.some((entry) => entry.label === 'process-tree.terminate' && entry.mode === 'forced' && entry.status === 'ok')) &&
    !processExists(ownedBrowserPid) &&
    elapsedMs <= options.globalTimeoutMs + 1_500;
  return {
    name: `${name}:round-${round}`,
    pass,
    elapsedMs,
    outcome: {
      ok: outcome.ok,
      error: outcome.error,
      pageErrors: outcome.diagnostics.pageErrors,
      cleanup: outcome.diagnostics.cleanup,
      browserLifecycle: outcome.diagnostics.browserLifecycle || null,
      steps: outcome.diagnostics.steps,
      diagnosticsElapsedMs: outcome.diagnostics.elapsedMs,
    },
  };
}

async function exerciseDeferredManagedClose() {
  const cleanupTimeoutMs = 500;
  const managed = await launchManagedBrowser({
    executablePath: browserExecutable(),
    launchTimeoutMs: lowLoadTimeoutMs,
    cleanupTimeoutMs: Number.isFinite(configuredLowLoadTimeoutMs) ? lowLoadCleanupTimeoutMs : cleanupTimeoutMs,
  });
  let diagnostics;
  try {
    const context = await managed.openContext({ viewport: { width: 320, height: 568 } });
    const page = await context.newPage();
    await page.setContent('<main>deferred managed close</main>');
    await new Promise((resolve) => setTimeout(resolve, cleanupTimeoutMs * 3 + 100));
  } finally {
    diagnostics = await managed.close();
  }
  const cleanup = diagnostics.cleanup || [];
  const pass = cleanup.length > 0 &&
    cleanup.every((entry) => entry.status === 'ok') &&
    cleanup.every((entry) => entry.mode !== 'deadline-exhausted') &&
    cleanup.some((entry) => entry.label === 'process-tree.verify' && entry.detail?.residual === false) &&
    !processExists(diagnostics.ownedBrowserPid);
  return {
    name: 'managed-close-deadline-starts-at-close',
    pass,
    elapsedMs: cleanup.reduce((sum, entry) => sum + Number(entry.elapsedMs || 0), 0),
    outcome: { cleanup, cleanupStartedAt: diagnostics.cleanupStartedAt, cleanupDeadlineAt: diagnostics.cleanupDeadlineAt },
  };
}

async function main() {
  const common = {
    launchTimeoutMs: lowLoadTimeoutMs,
    setupTimeoutMs: lowLoadTimeoutMs,
    stepTimeoutMs: 8_000,
    cleanupTimeoutMs: lowLoadCleanupTimeoutMs,
  };
  const cases = [];
  for (const round of [1, 2]) {
    cases.push(await exercise(
      round,
      'success',
      { ...common, globalTimeoutMs: lowLoadGlobalTimeoutMs, testForceServerCloseTimeout: true },
      async ({ page }) => {
        await page.setContent('<main data-state="ready">browser lifecycle v2</main>');
        return page.getAttribute('main', 'data-state');
      },
      (outcome) => outcome.ok && outcome.result === 'ready',
      true,
    ));
    cases.push(await exercise(
      round,
      'page-exception',
      { ...common, globalTimeoutMs: lowLoadGlobalTimeoutMs },
      async ({ page, delay }) => {
        await page.setContent('<script>setTimeout(() => { throw new Error("v2 page exception"); }, 30)</script>');
        await delay(180);
      },
      (outcome) => !outcome.ok && outcome.error && outcome.error.code === 'PAGE_RUNTIME_ERROR' && outcome.diagnostics.pageErrors.length === 1
    ));
    cases.push(await exercise(
      round,
      'timeout',
      { ...common, globalTimeoutMs: lowLoadGlobalTimeoutMs },
      async ({ delay }) => delay(8_500),
      (outcome) => !outcome.ok && outcome.error && outcome.error.code === 'STEP_TIMEOUT'
    ));
  }
  cases.push(await exerciseDeferredManagedClose());

  const report = {
    contract: 'browser-lifecycle-v2-self-test',
    startedAt: new Date().toISOString(),
    cases,
    pass: cases.every((item) => item.pass),
  };
  writeDiagnostic(artifactPath, report);
  console.log(JSON.stringify({ pass: report.pass, artifactPath, cases: cases.map((item) => ({ name: item.name, pass: item.pass, elapsedMs: item.elapsedMs })) }, null, 2));
  process.exitCode = report.pass ? 0 : 1;
}

main().catch((error) => {
  const report = {
    contract: 'browser-lifecycle-v2-self-test',
    pass: false,
    fatal: {
      name: error?.name || 'Error',
      code: error?.code || null,
      message: String(error?.message || error),
      detail: error?.detail || null,
      lifecycleDiagnostics: error?.lifecycleDiagnostics || null,
      stack: String(error?.stack || '').split('\n').slice(0, 12).join('\n'),
    },
  };
  writeDiagnostic(artifactPath, report);
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
});
