#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'tools/check-panel-runtime-browser.js'), 'utf8');
const helper = fs.readFileSync(path.join(root, 'tools/capture-runtime-screenshot.js'), 'utf8');
const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });

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
    /openIsolatedContext[\s\S]*isolatedBrowser[\s\S]*const tabletContext = await openIsolatedContext/.test(source) &&
    /isolated-browser\.close\.after-tablet-batch/.test(source),
  'the long tablet/task screenshot batch must run in a separately closed browser process'
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
    /finally\s*\{[\s\S]*context\.close\([\s\S]*browser\.close/.test(helper),
  'the isolated helper must close its context and browser even after a timeout or screenshot error'
);

const pass = checks.every((entry) => entry.pass);
console.log(JSON.stringify({ pass, checks, contract: 'runtime-screenshot-bound-v1' }, null, 2));
process.exitCode = pass ? 0 : 1;
