#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright-core');

const MIN_GLOBAL_TIMEOUT_MS = 3_000;
const DEFAULT_MAX_GLOBAL_TIMEOUT_MS = 120_000;
const MAX_LOW_LOAD_GLOBAL_TIMEOUT_MS = 600_000;
const MIN_STEP_TIMEOUT_MS = 100;
// Low-load headed Edge acceptance may need a longer bounded step while the
// managed browser is deliberately restricted to a tiny CPU quota. Ordinary
// callers still use their existing defaults; this only permits an explicit
// low-load timeout to remain effective instead of being silently clipped.
const MAX_STEP_TIMEOUT_MS = 300_000;
const MIN_CLEANUP_TIMEOUT_MS = 250;
// Ordinary callers still request the existing 8s cleanup window. Low-load
// acceptance runs deliberately throttle the complete browser process tree,
// including taskkill, so they may opt into a longer bounded cleanup window.
const MAX_CLEANUP_TIMEOUT_MS = 30_000;
const MAX_REGISTERED_CLEANUPS = 12;
const MANAGED_CLOSE_GRACE_MS = 1_250;
const MIN_PROCESS_TREE_TERMINATION_BUDGET_MS = 5_000;

class LifecycleError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.name = 'LifecycleError';
    this.code = code;
    this.detail = detail || null;
  }
}

function clamp(value, minimum, maximum, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, minimum), maximum) : fallback;
}

function browserLifecycleGlobalTimeoutCeilingMs(env = process.env) {
  const configured = Number(env.CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS || 0);
  if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_MAX_GLOBAL_TIMEOUT_MS;
  return Math.min(
    MAX_LOW_LOAD_GLOBAL_TIMEOUT_MS,
    Math.max(DEFAULT_MAX_GLOBAL_TIMEOUT_MS, configured * 4),
  );
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function nowIso() {
  return new Date().toISOString();
}

function browserExecutable(configuredPath) {
  const candidates = [
    configuredPath,
    process.env.BROWSER_EXECUTABLE,
    process.env.EDGE_EXECUTABLE,
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || '';
}

function reportDetachedCleanup(label, operation) {
  if (typeof operation !== 'function') return;
  // A timeout must settle the caller immediately.  Cleanup is deliberately
  // detached: awaiting it here would turn a nominal timeout into an unbounded
  // wait whenever the cleanup callback itself stalls.
  void Promise.resolve()
    .then(operation)
    .catch((cleanupError) => {
      process.stderr.write(`${label} detached cleanup failed: ${cleanupError && (cleanupError.stack || cleanupError.message) || cleanupError}\n`);
    });
}

function bounded(label, operation, timeoutMs, onLateResolution, onTimeout) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const startedAt = Date.now();
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      const timeout = new LifecycleError('STEP_TIMEOUT', `${label} exceeded ${timeoutMs}ms`, { label, timeoutMs });
      reject(timeout);
      reportDetachedCleanup(`${label} timeout`, onTimeout);
    }, timeoutMs);

    Promise.resolve()
      .then(operation)
      .then(
        (value) => {
          if (settled) {
            reportDetachedCleanup(`${label} late-result`, () => onLateResolution && onLateResolution(value));
            return;
          }
          settled = true;
          clearTimeout(timer);
          resolve({ value, elapsedMs: Date.now() - startedAt });
        },
        (error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(error);
        }
      );
  });
}

function errorDetail(error) {
  if (!error) return null;
  return {
    name: error.name || 'Error',
    code: error.code || null,
    message: String(error.message || error),
    stack: String(error.stack || '').split('\n').slice(0, 8).join('\n'),
  };
}

async function bestEffortPageState(page) {
  if (!page || page.isClosed()) return { available: false };
  const state = { available: true, url: page.url() };
  try {
    state.title = (await bounded('diagnostic.title', () => page.title(), 500)).value;
  } catch (error) {
    state.titleError = errorDetail(error);
  }
  return state;
}

async function terminateOwnedProcessTree(pid, timeoutMs) {
  if (!Number.isInteger(pid) || pid <= 0) return { attempted: false, reason: 'owned browser PID unavailable' };
  const startedAt = Date.now();
  const verifyDeadlineAt = startedAt + Math.max(1, timeoutMs);
  let taskkill = null;
  let status = null;
  let signal = null;
  let taskkillError = null;
  let taskkillFinished = false;
  let taskkillTimedOut = false;
  let stdout = '';
  let stderr = '';
  const appendOutput = (current, chunk) => `${current}${String(chunk)}`.slice(0, 800);

  try {
    taskkill = spawn('taskkill', ['/pid', String(pid), '/t', '/f'], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    taskkill.stdout.on('data', (chunk) => { stdout = appendOutput(stdout, chunk); });
    taskkill.stderr.on('data', (chunk) => { stderr = appendOutput(stderr, chunk); });
    taskkill.once('error', (error) => {
      taskkillError = error;
      taskkillFinished = true;
    });
    taskkill.once('close', (code, closeSignal) => {
      status = code;
      signal = closeSignal || null;
      taskkillFinished = true;
    });
  } catch (error) {
    taskkillError = error;
    taskkillFinished = true;
  }

  // Do not use spawnSync's timeout here. On Windows it terminates taskkill
  // itself, which can leave taskkill /t /f without enough time to reach the
  // browser's child tree. Polling the owned PID and the command completion
  // against one deadline keeps the cleanup bounded without treating a
  // still-running process as success.
  while (Date.now() < verifyDeadlineAt) {
    const residual = processExists(pid);
    if ((!residual && taskkillFinished) || taskkillError) break;
    await delay(Math.min(50, Math.max(1, verifyDeadlineAt - Date.now())));
  }
  if (!taskkillFinished && taskkill) {
    taskkillTimedOut = true;
    taskkill.stdout.destroy();
    taskkill.stderr.destroy();
    taskkill.unref();
    try {
      taskkill.kill();
    } catch (error) {
      taskkillError = error;
    }
  }
  const residual = processExists(pid);
  return {
    attempted: true,
    pid,
    status,
    signal,
    timedOut: taskkillTimedOut,
    error: taskkillError ? String(taskkillError.message || taskkillError) : null,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    residual,
    verifiedStopped: !residual,
    outcome: !residual ? (status === 0 ? 'terminated' : 'already-exited') : 'residual',
  };
}

function processExists(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error && error.code !== 'ESRCH';
  }
}

async function launchManagedBrowser(options) {
  const settings = options || {};
  // Keep CI and all existing callers headless by default. A focused Windows
  // acceptance may opt into a headed browser when it needs a real Edge toolbar.
  const headless = settings.headless !== false;
  const executablePath = browserExecutable(settings.executablePath);
  const launchTimeoutMs = clamp(settings.launchTimeoutMs, MIN_STEP_TIMEOUT_MS, MAX_STEP_TIMEOUT_MS, 15_000);
  const cleanupTimeoutMs = clamp(settings.cleanupTimeoutMs, MIN_CLEANUP_TIMEOUT_MS, MAX_CLEANUP_TIMEOUT_MS, 3_000);
  const connectionMode = settings.connectionMode || 'server';
  if (connectionMode !== 'server' && connectionMode !== 'pipe') {
    throw new LifecycleError('BROWSER_CONNECTION_MODE_UNSUPPORTED', `Unsupported browser connection mode: ${connectionMode}`, { connectionMode });
  }
  const configuredCleanupDeadlineAt = Number.isFinite(settings.cleanupDeadlineAt)
    ? settings.cleanupDeadlineAt
    : null;
  let cleanupDeadlineAt = configuredCleanupDeadlineAt;
  // Windows taskkill /t may need several seconds to enumerate and reap an
  // Edge process tree. Keep that bounded budget separate from each graceful
  // close timeout; otherwise a slow browserServer.close() consumes the only
  // time in which forced cleanup could prove that the owned PID stopped.
  const forcedTerminationReserveMs = Math.min(
    MIN_PROCESS_TREE_TERMINATION_BUDGET_MS,
    Math.max(3_000, cleanupTimeoutMs),
  );
  const diagnostics = {
    contract: 'browser-lifecycle-v2-managed-browser',
    executablePath: executablePath || null,
    headless,
    connectionMode,
    ownedBrowserPid: null,
    cleanup: [],
  };
  if (!executablePath) {
    throw new LifecycleError('BROWSER_UNAVAILABLE', 'Microsoft Edge executable was not found', { searched: 'BROWSER_EXECUTABLE, EDGE_EXECUTABLE, standard Edge locations' });
  }

  let browserServer = null;
  let browser = null;
  let closePromise = null;
  const contexts = new Set();

  const closeOne = async (label, operation) => {
    const startedAt = Date.now();
    const available = Math.max(0, cleanupDeadlineAt - startedAt - forcedTerminationReserveMs);
    if (available < MIN_CLEANUP_TIMEOUT_MS) {
      const error = new LifecycleError('CLEANUP_DEADLINE_EXCEEDED', `${label} skipped because the managed cleanup deadline is exhausted`, { label, cleanupDeadlineAt });
      const entry = { label, status: 'degraded', mode: 'deadline-exhausted', elapsedMs: 0, timeoutMs: 0, error: errorDetail(error) };
      diagnostics.cleanup.push(entry);
      return { error, entry };
    }
    const timeoutMs = Math.min(cleanupTimeoutMs, available);
    try {
      await bounded(`managed.${label}`, operation, timeoutMs);
      const entry = { label, status: 'ok', mode: 'graceful', elapsedMs: Date.now() - startedAt, timeoutMs };
      diagnostics.cleanup.push(entry);
      return { error: null, entry };
    } catch (error) {
      const entry = { label, status: 'degraded', mode: 'graceful-failed', elapsedMs: Date.now() - startedAt, timeoutMs, error: errorDetail(error) };
      diagnostics.cleanup.push(entry);
      return { error, entry };
    }
  };

  const close = () => {
    if (!closePromise) {
      if (cleanupDeadlineAt === null) {
        cleanupDeadlineAt = Date.now() + cleanupTimeoutMs * 3 + MIN_PROCESS_TREE_TERMINATION_BUDGET_MS;
      }
      diagnostics.cleanupStartedAt = nowIso();
      diagnostics.cleanupDeadlineAt = new Date(cleanupDeadlineAt).toISOString();
      closePromise = (async () => {
        const gracefulFailures = [];
        const failedEntries = [];
        for (const [index, context] of [...contexts].entries()) {
          const outcome = await closeOne(`context.close:${index}`, () => context.close());
          if (outcome.error) {
            gracefulFailures.push(outcome.error);
            failedEntries.push(outcome.entry);
          }
        }
        const browserOutcome = browser ? await closeOne('browser.close', () => browser.close()) : { error: null, entry: null };
        if (browserOutcome.error) {
          gracefulFailures.push(browserOutcome.error);
          failedEntries.push(browserOutcome.entry);
        }
        let serverOutcome = { error: null, entry: null };
        if (browserServer && processExists(diagnostics.ownedBrowserPid)) {
          serverOutcome = await closeOne(
            'browser-server.close',
            () => settings.testForceServerCloseTimeout ? new Promise(() => {}) : browserServer.close(),
          );
        } else if (browserServer) {
          diagnostics.cleanup.push({
            label: 'browser-server.close',
            status: 'ok',
            mode: 'not-needed',
            elapsedMs: 0,
            timeoutMs: cleanupTimeoutMs,
            detail: { skipped: true, reason: 'browser.close already ended the owned process' },
          });
        }
        if (serverOutcome.error) {
          gracefulFailures.push(serverOutcome.error);
          failedEntries.push(serverOutcome.entry);
        }
        const residualAfterServerClose = processExists(diagnostics.ownedBrowserPid);
        let processTree = { attempted: false, reason: 'owned browser server closed its process tree', verifiedStopped: true };
        if (gracefulFailures.length || residualAfterServerClose) {
          const forceBudget = Math.max(1, cleanupDeadlineAt - Date.now());
          processTree = await terminateOwnedProcessTree(diagnostics.ownedBrowserPid, forceBudget);
          diagnostics.cleanup.push({
            label: 'process-tree.terminate',
            status: processTree.verifiedStopped ? 'ok' : 'failed',
            mode: 'forced',
            detail: processTree,
          });
        } else {
          diagnostics.cleanup.push({ label: 'process-tree.terminate', status: 'ok', mode: 'not-needed', detail: processTree });
        }
        const residualAfterCleanup = processExists(diagnostics.ownedBrowserPid);
        diagnostics.cleanup.push({
          label: 'process-tree.verify',
          status: residualAfterCleanup ? 'failed' : 'ok',
          detail: { pid: diagnostics.ownedBrowserPid, residual: residualAfterCleanup },
        });
        if (residualAfterCleanup) {
          throw new LifecycleError('PROCESS_TREE_RESIDUAL', 'owned browser process remains after cleanup', { pid: diagnostics.ownedBrowserPid, gracefulFailures: gracefulFailures.map(errorDetail), processTree });
        }
        if (gracefulFailures.length) {
          for (const entry of failedEntries) {
            entry.status = 'ok';
            entry.mode = 'forced-recovery';
            entry.detail = { gracefulError: entry.error, recovery: processTree };
            delete entry.error;
          }
        }
        return diagnostics;
      })();
    }
    return closePromise;
  };

  try {
    if (connectionMode === 'pipe') {
      browser = (await bounded(
        'managed.browser.launch',
        () => chromium.launch({ executablePath, headless, args: settings.args || [] }),
        launchTimeoutMs,
        async (lateBrowser) => {
          if (lateBrowser) await lateBrowser.close();
        },
      )).value;
    } else {
      browserServer = (await bounded(
        'managed.browser-server.launch',
        () => chromium.launchServer({ executablePath, headless, args: settings.args || [] }),
        launchTimeoutMs,
        async (lateServer) => {
          if (!lateServer) return;
          const latePid = typeof lateServer.process === 'function' ? lateServer.process()?.pid : null;
          let closeError = null;
          try {
            await lateServer.close();
          } catch (error) {
            closeError = error;
          }
          const termination = await terminateOwnedProcessTree(latePid, cleanupTimeoutMs);
          if (closeError) throw closeError;
          if (termination.error || termination.timedOut || termination.verifiedStopped !== true) {
            throw new LifecycleError('LATE_PROCESS_TREE_CLEANUP_FAILED', 'late browser server process tree could not be terminated', termination);
          }
        }
      )).value;
      diagnostics.ownedBrowserPid = typeof browserServer.process === 'function' ? browserServer.process()?.pid || null : null;
      browser = (await bounded('managed.browser.connect', () => chromium.connect(browserServer.wsEndpoint()), launchTimeoutMs)).value;
    }
  } catch (error) {
    let cleanupError = null;
    try {
      await close();
    } catch (closeFailure) {
      cleanupError = closeFailure;
    }
    error.lifecycleDiagnostics = diagnostics;
    if (cleanupError) error.lifecycleCleanupError = errorDetail(cleanupError);
    throw error;
  }

  return {
    browser,
    diagnostics,
    async openContext(contextOptions) {
      const context = (await bounded('managed.context.create', () => browser.newContext(contextOptions), launchTimeoutMs)).value;
      contexts.add(context);
      context.on('close', () => contexts.delete(context));
      return context;
    },
    close,
  };
}

async function runBrowserLifecycle(options, task) {
  const settings = options || {};
  const maxGlobalTimeoutMs = browserLifecycleGlobalTimeoutCeilingMs();
  const globalTimeoutMs = clamp(settings.globalTimeoutMs, MIN_GLOBAL_TIMEOUT_MS, maxGlobalTimeoutMs, 12_000);
  const stepTimeoutMs = clamp(settings.stepTimeoutMs, MIN_STEP_TIMEOUT_MS, MAX_STEP_TIMEOUT_MS, 4_000);
  const launchTimeoutMs = clamp(settings.launchTimeoutMs, MIN_STEP_TIMEOUT_MS, MAX_STEP_TIMEOUT_MS, stepTimeoutMs);
  const setupTimeoutMs = clamp(settings.setupTimeoutMs, MIN_STEP_TIMEOUT_MS, MAX_STEP_TIMEOUT_MS, stepTimeoutMs);
  const cleanupTimeoutMs = clamp(settings.cleanupTimeoutMs, MIN_CLEANUP_TIMEOUT_MS, MAX_CLEANUP_TIMEOUT_MS, 1_200);
  const startedAt = Date.now();
  const deadline = startedAt + globalTimeoutMs;
  const teardownReserveMs = Math.min(
    cleanupTimeoutMs,
    Math.max(MIN_CLEANUP_TIMEOUT_MS, Math.floor(globalTimeoutMs / 3)),
  );
  const executablePath = browserExecutable(settings.executablePath);
  const diagnostics = {
    contract: 'browser-lifecycle-v2',
    startedAt: nowIso(),
    globalTimeoutMs,
    stepTimeoutMs,
    launchTimeoutMs,
    setupTimeoutMs,
    cleanupTimeoutMs,
    executablePath: executablePath || null,
    steps: [],
    pageErrors: [],
    cleanup: [],
    page: null,
    error: null,
  };

  let browser = null;
  let managedBrowser = null;
  let context = null;
  let page = null;
  let result;
  let failure;
  let resolvePageError;
  const pageErrorSeen = new Promise((resolve) => {
    resolvePageError = resolve;
  });
  const registeredCleanups = [];
  const abortController = new AbortController();

  const remaining = () => Math.max(0, deadline - Date.now());
  const runStep = async (label, operation, requestedTimeoutMs = stepTimeoutMs, onLateResolution) => {
    const available = remaining() - teardownReserveMs;
    if (available <= 0) {
      throw new LifecycleError('GLOBAL_TIMEOUT', `global lifecycle deadline exceeded before ${label}`, { label, globalTimeoutMs });
    }
    const timeoutMs = Math.min(clamp(requestedTimeoutMs, MIN_STEP_TIMEOUT_MS, MAX_STEP_TIMEOUT_MS, stepTimeoutMs), available);
    const stepStartedAt = Date.now();
    try {
      const outcome = await bounded(
        label,
        () => operation(abortController.signal),
        timeoutMs,
        onLateResolution,
        () => {
          abortController.abort(new LifecycleError('STEP_ABORTED', `${label} timed out`));
        },
      );
      diagnostics.steps.push({ label, status: 'ok', elapsedMs: outcome.elapsedMs });
      return outcome.value;
    } catch (error) {
      diagnostics.steps.push({ label, status: 'failed', elapsedMs: Date.now() - stepStartedAt, error: errorDetail(error) });
      throw error;
    }
  };

  const cleanup = async (label, operation, requestedTimeoutMs = cleanupTimeoutMs, allowFullRemaining = false) => {
    const cleanupStartedAt = Date.now();
    const available = remaining();
    if (available < MIN_CLEANUP_TIMEOUT_MS) {
      const error = new LifecycleError('GLOBAL_TIMEOUT', `global lifecycle deadline exceeded before cleanup.${label}`, { label, globalTimeoutMs });
      diagnostics.cleanup.push({ label, status: 'failed', elapsedMs: 0, timeoutMs: 0, error: errorDetail(error) });
      return error;
    }
    const timeoutMs = Math.min(
      clamp(
        requestedTimeoutMs,
        MIN_CLEANUP_TIMEOUT_MS,
        allowFullRemaining ? maxGlobalTimeoutMs : MAX_CLEANUP_TIMEOUT_MS + MANAGED_CLOSE_GRACE_MS,
        cleanupTimeoutMs,
      ),
      available,
    );
    try {
      await bounded(`cleanup.${label}`, operation, timeoutMs);
      diagnostics.cleanup.push({ label, status: 'ok', elapsedMs: Date.now() - cleanupStartedAt, timeoutMs });
      return null;
    } catch (error) {
      diagnostics.cleanup.push({ label, status: 'failed', elapsedMs: Date.now() - cleanupStartedAt, timeoutMs, error: errorDetail(error) });
      return error;
    }
  };

  try {
    if (!executablePath) {
      throw new LifecycleError('BROWSER_UNAVAILABLE', 'Microsoft Edge executable was not found', { searched: 'BROWSER_EXECUTABLE, EDGE_EXECUTABLE, standard Edge locations' });
    }
    managedBrowser = await runStep('browser.managed.launch', () => launchManagedBrowser({
      executablePath,
      args: ['--disable-background-networking', '--disable-component-update'],
      launchTimeoutMs,
      cleanupTimeoutMs,
      cleanupDeadlineAt: deadline,
      testForceServerCloseTimeout: settings.testForceServerCloseTimeout === true,
    }), launchTimeoutMs);
    browser = managedBrowser.browser;
    diagnostics.ownedBrowserPid = managedBrowser.diagnostics.ownedBrowserPid;
    context = await runStep('context.create', () => managedBrowser.openContext({ viewport: { width: 640, height: 480 } }), setupTimeoutMs);
    page = await runStep('page.create', () => context.newPage(), setupTimeoutMs);
    page.on('pageerror', (error) => {
      diagnostics.pageErrors.push(errorDetail(error));
      resolvePageError();
    });

    result = await runStep('scenario.run', () => task({
      browser,
      context,
      page,
      delay: (milliseconds) => runStep(`scenario.delay.${milliseconds}`, () => delay(milliseconds), Math.min(stepTimeoutMs, milliseconds + 500)),
      remainingMs: remaining,
      signal: abortController.signal,
      registerCleanup: (label, operation, timeoutMs = cleanupTimeoutMs) => {
        if (typeof operation !== 'function') {
          throw new LifecycleError('INVALID_CLEANUP', `cleanup ${label} must be a function`);
        }
        if (registeredCleanups.length >= MAX_REGISTERED_CLEANUPS) {
          throw new LifecycleError('CLEANUP_LIMIT_EXCEEDED', `at most ${MAX_REGISTERED_CLEANUPS} lifecycle cleanups may be registered`, { label, limit: MAX_REGISTERED_CLEANUPS });
        }
        registeredCleanups.push({ label, operation, timeoutMs });
      },
    }), stepTimeoutMs);

    // Playwright may deliver a pageerror protocol event just after the task's
    // final awaited operation resolves. Give that event a bounded turn before
    // deciding the scenario passed; otherwise cleanup can observe the error
    // after the success result has already been committed.
    await runStep(
      'page.runtime.settle',
      () => Promise.race([pageErrorSeen, delay(125)]),
      Math.min(stepTimeoutMs, 250),
    );

    if (diagnostics.pageErrors.length) {
      throw new LifecycleError('PAGE_RUNTIME_ERROR', 'page emitted uncaught runtime errors', { pageErrors: diagnostics.pageErrors });
    }
  } catch (error) {
    failure = error;
    diagnostics.error = errorDetail(error);
  } finally {
    const cleanupErrors = [];
    diagnostics.page = await bestEffortPageState(page);
    for (const registered of registeredCleanups.reverse()) {
      const error = await cleanup(registered.label, registered.operation, registered.timeoutMs);
      if (error) cleanupErrors.push(error);
    }
    if (context) {
      const error = await cleanup('context.close', () => context.close());
      if (error) cleanupErrors.push(error);
    }
    if (managedBrowser) {
      const error = await cleanup('managed-browser.close', () => managedBrowser.close(), remaining(), true);
      if (error) cleanupErrors.push(error);
      diagnostics.browserLifecycle = managedBrowser.diagnostics;
    }
    if (!failure && cleanupErrors.length) {
      failure = new LifecycleError('CLEANUP_FAILED', 'browser lifecycle cleanup failed', { errors: cleanupErrors.map(errorDetail) });
      diagnostics.error = errorDetail(failure);
    }
    diagnostics.finishedAt = nowIso();
    diagnostics.elapsedMs = Date.now() - startedAt;
  }

  return {
    ok: !failure,
    result: failure ? null : result,
    error: failure ? errorDetail(failure) : null,
    diagnostics,
  };
}

function writeDiagnostic(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

module.exports = {
  LifecycleError,
  bounded,
  browserLifecycleGlobalTimeoutCeilingMs,
  browserExecutable,
  launchManagedBrowser,
  processExists,
  runBrowserLifecycle,
  terminateOwnedProcessTree,
  writeDiagnostic,
};
