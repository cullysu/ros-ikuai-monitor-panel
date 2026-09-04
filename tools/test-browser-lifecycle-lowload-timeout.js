#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  browserExecutable,
  browserLifecycleGlobalTimeoutCeilingMs,
} = require('./acceptance/browser-lifecycle-v2/browser-lifecycle');

assert.equal(browserLifecycleGlobalTimeoutCeilingMs({}), 120_000);
assert.equal(browserLifecycleGlobalTimeoutCeilingMs({ CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS: 'invalid' }), 120_000);
assert.equal(browserLifecycleGlobalTimeoutCeilingMs({ CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS: '1' }), 120_000);
assert.equal(browserLifecycleGlobalTimeoutCeilingMs({ CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS: '89999' }), 359_996);
assert.equal(browserLifecycleGlobalTimeoutCeilingMs({ CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS: '90000' }), 360_000);
assert.equal(browserLifecycleGlobalTimeoutCeilingMs({ CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS: '999999' }), 600_000);

const browserLifecycleSource = fs.readFileSync(
  path.join(__dirname, 'acceptance', 'browser-lifecycle-v2', 'browser-lifecycle.js'),
  'utf8',
);
assert.match(browserLifecycleSource, /BROWSER_EXECUTABLE_PATH/, 'lifecycle discovery must support the explicit browser executable override');
assert.match(browserLifecycleSource, /\/usr\/bin\/google-chrome/, 'lifecycle discovery must include Linux Google Chrome');
assert.match(browserLifecycleSource, /\/usr\/bin\/chromium/, 'lifecycle discovery must include Linux Chromium');

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-lifecycle-discovery-'));
const fixtureBrowser = path.join(fixtureRoot, 'browser');
try {
  fs.writeFileSync(fixtureBrowser, '');
  assert.equal(
    browserExecutable(undefined, { CHROME_EXECUTABLE: fixtureBrowser }),
    fixtureBrowser,
    'lifecycle discovery must honor the explicit Chrome executable environment',
  );
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log('[browser-lifecycle-lowload-timeout] PASS 10/10');
