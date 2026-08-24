"use strict";

const { execFile } = require("child_process");
const { promisify } = require("util");
const {
  LifecycleError,
  bounded,
  launchManagedBrowser,
} = require("../browser-lifecycle-v2/browser-lifecycle");
const { startMock, browserExecutable } = require("../current-runtime-mock");

const VIEWPORT = { width: 390, height: 844 };
const configuredLowLoadTimeout = Number(process.env.CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS || 0);
const LOW_LOAD_BROWSER_TIMEOUT_MS = Number.isFinite(configuredLowLoadTimeout) && configuredLowLoadTimeout > 0
  ? Math.min(300_000, Math.max(8_000, configuredLowLoadTimeout))
  : 0;
// Keep ordinary acceptance failures fast, but allow the CPU-capped launcher to
// trade wall-clock time for a much smaller machine impact. This changes only
// infrastructure timing; every product and accessibility assertion is intact.
const ACTION_TIMEOUT_MS = Math.max(8_000, LOW_LOAD_BROWSER_TIMEOUT_MS);
// Windows can take longer to create a fresh Playwright pipe under sustained
// validation load. Keep the launch bounded, but do not confuse a slow spawn
// with a product failure.
const LAUNCH_TIMEOUT_MS = Math.max(30_000, LOW_LOAD_BROWSER_TIMEOUT_MS);
const CLEANUP_TIMEOUT_MS = Math.max(4_000, Math.min(30_000, LOW_LOAD_BROWSER_TIMEOUT_MS));
const ABORT_CLEANUP_TIMEOUT_MS = 30_000;
const activeRuntimes = new Set();
const execFileAsync = promisify(execFile);

function errorDetail(error) {
  return {
    name: error?.name || "Error",
    code: error?.code || null,
    message: String(error?.message || error),
  };
}

function processExists(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

async function terminateOwnedBrowser(runtime) {
  const pid = runtime?.managedBrowser?.diagnostics?.ownedBrowserPid;
  if (!processExists(pid)) {
    return { pid: pid || null, attempted: false, verifiedStopped: true, reason: "owned-process-not-present" };
  }
  const startedAt = Date.now();
  const attempts = [];
  const deadline = startedAt + CLEANUP_TIMEOUT_MS;
  while (processExists(pid) && Date.now() < deadline) {
    let commandError = null;
    try {
      await execFileAsync("taskkill", ["/PID", String(pid), "/T", "/F"], {
        windowsHide: true,
        timeout: Math.max(250, deadline - Date.now()),
        maxBuffer: 64 * 1024,
      });
    } catch (error) {
      commandError = errorDetail(error);
    }
    attempts.push({ commandError });
    if (!processExists(pid)) break;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  const verifiedStopped = !processExists(pid);
  return { pid, attempted: true, verifiedStopped, elapsedMs: Date.now() - startedAt, attempts };
}

function timeoutError(label, timeoutMs, cleanupError) {
  return new LifecycleError(
    cleanupError ? "GLOBAL_TIMEOUT_CLEANUP_FAILED" : "GLOBAL_TIMEOUT",
    `${label} exceeded ${timeoutMs}ms${cleanupError ? "; abort cleanup failed" : ""}`,
    { label, timeoutMs, cleanupError: cleanupError ? errorDetail(cleanupError) : null },
  );
}

async function withTimeout(label, operation, timeoutMs = ACTION_TIMEOUT_MS) {
  let settled = false;
  let timer = null;
  let abortPromise = null;
  const abort = () => {
    if (!abortPromise) {
      abortPromise = boundedAbortCleanup(closeActiveRuntimes, ABORT_CLEANUP_TIMEOUT_MS);
    }
    return abortPromise;
  };
  return new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      abort().then(
        () => reject(timeoutError(label, timeoutMs)),
        (cleanupError) => reject(timeoutError(label, timeoutMs, cleanupError)),
      );
    }, timeoutMs);
    Promise.resolve().then(operation).then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function boundedAbortCleanup(operation, timeoutMs) {
  let timer = null;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new LifecycleError(
          "ABORT_CLEANUP_TIMEOUT",
          `accessibility abort cleanup exceeded ${timeoutMs}ms`,
          { timeoutMs },
        )), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function cleanupStep(runtime, label, operation, timeoutMs = CLEANUP_TIMEOUT_MS) {
  const startedAt = Date.now();
  try {
    await bounded(`a11y.cleanup.${label}`, operation, timeoutMs);
    runtime.cleanup.push({ label, status: "ok", timeoutMs, elapsedMs: Date.now() - startedAt });
  } catch (error) {
    runtime.cleanup.push({ label, status: "failed", timeoutMs, elapsedMs: Date.now() - startedAt, error: errorDetail(error) });
    throw error;
  }
}

async function launchRuntime(options = {}) {
  const executablePath = browserExecutable();
  if (!executablePath) throw new LifecycleError("BROWSER_UNAVAILABLE", "Edge/Chrome executable not found");
  const runtime = {
    browser: null,
    context: null,
    managedBrowser: null,
    mock: null,
    page: null,
    executablePath,
    cleanup: [],
    closed: false,
    closePromise: null,
  };
  activeRuntimes.add(runtime);
  try {
    const {
      browserArgs = [],
      headless = true,
      mockTransport = process.platform === "win32" ? "pipe" : "tcp",
      mockPreferIpv4 = false,
      ...contextOptions
    } = options;
    runtime.mock = (await bounded("a11y.mock.start", () => startMock({ transport: mockTransport, preferIpv4: mockPreferIpv4 }), LAUNCH_TIMEOUT_MS)).value;
    runtime.managedBrowser = (await bounded("a11y.browser.launch", () => launchManagedBrowser({
      executablePath,
      headless,
      args: [...(process.platform === "linux" ? ["--no-sandbox"] : []), ...browserArgs],
      connectionMode: process.platform === "win32" ? "pipe" : "server",
      launchTimeoutMs: LAUNCH_TIMEOUT_MS,
      cleanupTimeoutMs: CLEANUP_TIMEOUT_MS,
    }), LAUNCH_TIMEOUT_MS)).value;
    runtime.browser = runtime.managedBrowser.browser;
    runtime.context = (await bounded("a11y.context.create", () => runtime.managedBrowser.openContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      ...contextOptions,
    }), LAUNCH_TIMEOUT_MS)).value;
    if (typeof runtime.mock.installRoute === "function") {
      await bounded("a11y.mock.route", () => runtime.mock.installRoute(runtime.context), LAUNCH_TIMEOUT_MS);
    }
    runtime.page = (await bounded("a11y.page.create", () => runtime.context.newPage(), LAUNCH_TIMEOUT_MS)).value;
    runtime.page.setDefaultTimeout(ACTION_TIMEOUT_MS);
    runtime.page.setDefaultNavigationTimeout(ACTION_TIMEOUT_MS);
    return runtime;
  } catch (error) {
    let cleanupError = null;
    try {
      await closeRuntime(runtime);
    } catch (closeFailure) {
      cleanupError = closeFailure;
    }
    if (cleanupError) error.lifecycleCleanupError = errorDetail(cleanupError);
    throw error;
  }
}

async function closeRuntime(runtime) {
  if (!runtime) return;
  if (!runtime.closePromise) {
    runtime.closePromise = (async () => {
      const errors = [];
      runtime.mock?.beginStop?.();
      if (runtime.context) {
        try { await cleanupStep(runtime, "context.close", () => runtime.context.close()); }
        catch (error) { errors.push(error); }
      }
      if (runtime.managedBrowser) {
        let closeError = null;
        try { await cleanupStep(runtime, "managed-browser.close", () => runtime.managedBrowser.close(), CLEANUP_TIMEOUT_MS * 3); }
        catch (error) { closeError = error; }
        const recovery = await terminateOwnedBrowser(runtime);
        runtime.cleanup.push({
          label: "managed-browser.verify-stopped",
          status: recovery.verifiedStopped ? (closeError ? "recovered" : "ok") : "failed",
          timeoutMs: CLEANUP_TIMEOUT_MS,
          ...recovery,
        });
        if (!recovery.verifiedStopped) errors.push(closeError || new LifecycleError(
          "OWNED_BROWSER_STILL_RUNNING",
          "owned accessibility browser process remained after close",
          recovery,
        ));
      }
      if (runtime.mock) {
        try { await cleanupStep(runtime, "mock.stop", () => runtime.mock.stop()); }
        catch (error) { errors.push(error); }
      }
      activeRuntimes.delete(runtime);
      runtime.closed = true;
      if (errors.length) {
        throw new LifecycleError("RUNTIME_CLEANUP_FAILED", "accessibility runtime cleanup failed", { errors: errors.map(errorDetail), cleanup: runtime.cleanup });
      }
    })();
  }
  return runtime.closePromise;
}

async function closeActiveRuntimes() {
  const settled = await Promise.allSettled([...activeRuntimes].map((runtime) => closeRuntime(runtime)));
  const errors = settled.filter((result) => result.status === "rejected").map((result) => result.reason);
  if (errors.length) throw new LifecycleError("ABORT_CLEANUP_FAILED", "timed out accessibility runtimes could not be closed", { errors: errors.map(errorDetail) });
}

async function waitForPhase(page, phase) {
  await page.waitForFunction(
    (expectedPhase) => document.querySelector("[data-panel-runtime-phase]")?.getAttribute("data-panel-runtime-phase") === expectedPhase,
    phase,
    { timeout: LAUNCH_TIMEOUT_MS },
  );
}

async function waitForCurrent(page) {
  await waitForPhase(page, "current");
}

async function gotoWithAbortRetry(page, url, options) {
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await page.goto(url, options);
    } catch (error) {
      lastError = error;
      if (!String(error?.message || error).includes("ERR_ABORTED") || attempt === 1) throw error;
      await page.waitForTimeout(400);
    }
  }
  throw lastError;
}

async function login(page, baseUrl) {
  await gotoWithAbortRetry(page, baseUrl, { waitUntil: "domcontentloaded" });
  const form = page.locator('[data-router-login-form], [data-mobile-native-connection="flow"] form, [data-mobile-reference-connection="form"] form').first();
  await form.waitFor();
  await page.locator('input[name="host"]').fill("192.0.2.1");
  await page.locator('input[name="user"]').fill("observer");
  await page.locator('input[name="password"]').fill("correct-horse");
  const submit = form.locator('button[type="submit"]');
  const submitWhenReady = async () => {
    await form.locator('button[type="submit"]:not([disabled])').waitFor({ timeout: LAUNCH_TIMEOUT_MS });
    await page.waitForFunction(() => {
      const button = document.querySelector('[data-router-login-form] button[type="submit"], [data-mobile-native-connection="flow"] button[type="submit"], [data-mobile-reference-connection="form"] button[type="submit"]');
      return button instanceof HTMLButtonElement && !button.disabled;
    }, null, { timeout: LAUNCH_TIMEOUT_MS });
    // Login is test setup rather than the interaction under review. Dispatch
    // through the enabled DOM control so forced-colors rendering stability does
    // not turn a valid setup state into an actionability timeout.
    await submit.evaluate((button) => button.click());
  };
  await submitWhenReady();
  const hostKey = page.locator(".router-host-key-confirmation, .ikuai4-connect-fingerprint, .ref-connect__identity[data-kind=\"confirmation-required\"]").first();
  const nextStepHandle = await page.waitForFunction(() => {
    const current = document.querySelector("[data-panel-runtime-phase]")?.getAttribute("data-panel-runtime-phase") === "current";
    if (current) return "current";
    const confirmation = document.querySelector(".router-host-key-confirmation, .ikuai4-connect-fingerprint, .ref-connect__identity[data-kind=\"confirmation-required\"]");
    if (confirmation instanceof HTMLElement) {
      const style = getComputedStyle(confirmation);
      if (style.display !== "none" && style.visibility !== "hidden") return "host-key";
    }
    return null;
  }, null, { timeout: LAUNCH_TIMEOUT_MS });
  const nextStep = await nextStepHandle.jsonValue();
  if (nextStep === "host-key") {
    await hostKey.locator('input[type="checkbox"]').check();
    await submitWhenReady();
  }
  await waitForCurrent(page);
}

async function visitRoute(page, baseUrl, route, { requireWorkspace = true, runtimePhase = "current" } = {}) {
  const target = new URL(baseUrl);
  target.searchParams.set("section", route);
  target.hash = "";
  await gotoWithAbortRetry(page, target.toString(), { waitUntil: "domcontentloaded" });
  await waitForPhase(page, runtimePhase);
  const canonical = await page.evaluate(() => ({
    hash: location.hash,
    section: new URLSearchParams(location.search).get("section"),
  }));
  if (canonical.hash || canonical.section !== route) {
    throw new Error(`route did not settle on canonical ?section= URL: ${JSON.stringify({ route, canonical })}`);
  }
  if (!requireWorkspace) return null;
  // iKuai 4 owns mobile routes directly; desktop keeps the shared route marker.
  const workspace = page.locator(`[data-mobile-native-workspace="${route}"], [data-panel-route-content="${route}"]`).first();
  await workspace.waitFor();
  return workspace;
}

module.exports = {
  ACTION_TIMEOUT_MS,
  ABORT_CLEANUP_TIMEOUT_MS,
  CLEANUP_TIMEOUT_MS,
  boundedAbortCleanup,
  closeRuntime,
  launchRuntime,
  login,
  visitRoute,
  waitForPhase,
  waitForCurrent,
  withTimeout,
};
