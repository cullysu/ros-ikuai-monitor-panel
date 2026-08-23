#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { processExists } = require('./acceptance/browser-lifecycle-v2/browser-lifecycle');
const { PlaywrightSession } = require('./local-predeploy-check');

const ROOT = path.resolve(__dirname, '..');
const outputDir = path.join(
  ROOT,
  '_acceptance',
  `local-predeploy-browser-lifecycle-${new Date().toISOString().replace(/[:.]/g, '-')}`,
);

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: { ...process.env, CODEX_MEMORY_LIMIT_MB: '2048', NODE_OPTIONS: '--max-old-space-size=2048' },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

async function assertTargetCloseFailureIsVisible() {
  const page = {
    isClosed: () => false,
    on: () => {},
    close: async () => { throw new Error('Target page already closed'); },
  };
  const context = { close: async () => {} };
  const session = new PlaywrightSession(context, page);
  try {
    await session.closeTarget();
    return false;
  } catch (error) {
    return error?.code === 'TARGET_CLOSE_FAILED' &&
      Array.isArray(error?.detail?.failures) &&
      error.detail.failures.some((item) => item.target === 'page' && /closed/i.test(item.message));
  }
}

async function main() {
  const targetCloseFailureVisible = await assertTargetCloseFailureIsVisible();
  const result = await run(process.execPath, [
    'tools/local-predeploy-check.js',
    '--profile', 'public',
    '--sections', 'overview',
    '--scale-scenarios', 'single',
    '--viewports', 'lifecycle=390x844',
    '--bounded-matrix',
    '--skip-backend',
    '--out', outputDir,
  ]);
  const reportPath = path.join(outputDir, 'report.json');
  let report;
  try {
    report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  } catch (error) {
    throw new Error(
      `bounded matrix did not produce a report (exit=${result.code}): ${error.message}; stderr=${result.stderr.slice(-1200)}`,
    );
  }
  const lifecycle = report.browser?.lifecycle;
  const cleanup = Array.isArray(lifecycle?.cleanup) ? lifecycle.cleanup : [];
  const browserBoot = (report.checks || []).find((check) => check.name === 'browser boot public/single/lifecycle');
  const targetClose = (report.checks || []).find((check) => check.name === 'close browser target public/single/lifecycle');
  const processClose = (report.checks || []).find((check) => check.name === 'browser managed lifecycle closes owned process tree');
  const ownedBrowserPid = lifecycle?.ownedBrowserPid || report.browser?.ownedBrowserPid || null;
  const assertions = {
    childHonorsIncompleteMatrixExit: result.code === 1 && report.pass === false && report.matrix?.requestedComplete === false,
    oneBoundedCellObserved: Array.isArray(report.browserChecks) && report.browserChecks.length === 1,
    browserBootedBeforeCleanup: browserBoot?.pass === true,
    managedDriver: report.browser?.driver === 'playwright-core-managed-v2',
    targetCloseFailureVisible,
    targetClosed: targetClose?.pass === true,
    processTreeClosed: processClose?.pass === true,
    cleanupDiagnosticPresent: cleanup.length > 0,
    cleanupReportedSuccessful: cleanup.every((entry) => entry.status === 'ok'),
    residualProcessAbsent: !processExists(ownedBrowserPid),
    noLegacyCloseWarning: !(report.warnings || []).some((warning) => String(warning.name || '').includes('browser target close timed out')),
  };
  const pass = Object.values(assertions).every(Boolean);
  const output = {
    contract: 'local-predeploy-managed-browser-lifecycle-v1',
    pass,
    outputDir,
    reportPath,
    child: { code: result.code, stderr: result.stderr.slice(-2000) },
    assertions,
    ownedBrowserPid,
    cleanup,
  };
  await fs.writeFile(path.join(outputDir, 'lifecycle-regression.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(output, null, 2));
  process.exitCode = pass ? 0 : 1;
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exitCode = 1;
});
