#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'tools/check-panel-runtime-browser.js'), 'utf8');
const helper = fs.readFileSync(path.join(root, 'tools/capture-runtime-screenshot.js'), 'utf8');
const lifecycle = fs.readFileSync(
  path.join(root, 'tools/acceptance/browser-lifecycle-v2/browser-lifecycle.js'),
  'utf8'
);
const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });

function after(haystack, before, needle) {
  const start = haystack.indexOf(before);
  return start >= 0 ? haystack.indexOf(needle, start + before.length) : -1;
}

check(
  'screenshot-has-per-shot-timeout',
  /page\.screenshot\(\{[\s\S]*?timeout:\s*[A-Za-z_$][\w$]*/.test(source),
  'each production screenshot must have an explicit bounded timeout'
);
check(
  'screenshot-writes-phase-diagnostic',
  /screenshotFailure|screenshot-failure|failure-screenshot/.test(source) &&
    /fileName[\s\S]*state[\s\S]*phase[\s\S]*viewport[\s\S]*browser/.test(source),
  'a stuck screenshot must retain file/state/phase/viewport/browser evidence'
);
check(
  'global-runtime-bound-remains-fail-closed',
  /Math\.min\(Math\.max\(configuredTestTimeout,\s*30000\),\s*480000\)[\s\S]*:\s*480000/.test(source),
  'per-shot diagnostics must not replace or loosen the global runtime gate'
);
check(
  'long-screenshot-batch-uses-isolated-browser',
  (() => {
    const isolatedFactory = source.indexOf('const openIsolatedContext = async (options) => {');
    const isolatedLaunch = after(source, 'const openIsolatedContext = async (options) => {', 'isolatedBrowserRuntime = await launchBrowser();');
    const isolatedContext = after(source, 'isolatedBrowserRuntime = await launchBrowser();', 'isolatedBrowserRuntime.openContext(options)');
    const tabletBatch = source.indexOf('const tabletContext = await openIsolatedContext({');
    const taskBatch = source.indexOf('const taskDesktopContext = await openIsolatedContext({');
    const closeContext = source.indexOf('await tabletContext.close();');
    const closeBatch = source.indexOf("boundedCleanup('isolated-browser.lifecycle.close.after-tablet-batch'");
    const closeRuntime = after(source, "boundedCleanup('isolated-browser.lifecycle.close.after-tablet-batch'", 'await isolatedBrowserRuntime.close();');
    const returnsToPrimary = source.indexOf("await page.locator('.panel-runtime-actions button').nth(1).click();");
    const managedLaunch = source.indexOf('const launchBrowser = () => launchManagedBrowser({');
    const ownsServerProcess = /chromium\.launchServer\([\s\S]*ownedBrowserPid[\s\S]*browserServer\.process/.test(lifecycle);
    const verifiedTreeCleanup = /terminateOwnedProcessTree\([\s\S]*process-tree\.verify/.test(lifecycle);
    const lateTreeCleanupIsAwaited = /const termination = await terminateOwnedProcessTree\(latePid, cleanupTimeoutMs\)/.test(lifecycle);

    return isolatedFactory >= 0 && managedLaunch >= 0 &&
      isolatedLaunch > isolatedFactory && isolatedContext > isolatedLaunch &&
      tabletBatch > isolatedContext && taskBatch > tabletBatch &&
      closeContext > taskBatch && closeBatch > closeContext && closeRuntime > closeBatch &&
      returnsToPrimary > closeRuntime && ownsServerProcess && verifiedTreeCleanup && lateTreeCleanupIsAwaited;
  })(),
  'the tablet/task batch launches an owned browser-server process, uses it only for the isolated contexts, verifies its process tree on close, and closes it before returning to the primary browser'
);
check(
  'connection-tail-uses-process-isolation',
  /isolatedScreenshot\([\s\S]*desktop-connection\.png/.test(source) &&
    fs.existsSync(path.join(root, 'tools/capture-runtime-screenshot.js')),
  'the known connection screenshot tail must be capturable outside the long-lived browser process'
);
check(
  'parent-passes-one-bounded-timeout-to-helper',
  /selector,\s*browser:\s*browserPath,\s*timeout:\s*screenshotTimeout/.test(source),
  'the parent runner and isolated helper must share one bounded screenshot timeout'
);
check(
  'helper-uses-configured-timeout-for-launch-navigation-wait-and-shot',
  /config\.timeout/.test(helper) &&
    /timeout,\s*\n\s*\}\);/.test(helper) &&
    /goto\([^\n]*timeout\s*\}/.test(helper) &&
    /waitFor\(\{\s*timeout\s*\}\)/.test(helper) &&
    /screenshot\(\{[\s\S]*?timeout\s*\}\)/.test(helper),
  'the helper must not hard-code a different timeout for browser launch, navigation, selector wait, or screenshot'
);
check(
  'helper-closes-context-and-browser-in-finally',
  /let context\s*=\s*null/.test(helper) &&
    /finally\s*\{[\s\S]*closeWithin\(context[\s\S]*closeWithin\(browser/.test(helper),
  'the isolated helper must close its context and browser even after a timeout or screenshot error'
);

const pass = checks.every((entry) => entry.pass);
console.log(JSON.stringify({ pass, checks, contract: 'runtime-screenshot-bound-v1' }, null, 2));
process.exitCode = pass ? 0 : 1;
