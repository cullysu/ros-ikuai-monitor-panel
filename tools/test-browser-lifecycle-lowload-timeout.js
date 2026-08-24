#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const {
  browserLifecycleGlobalTimeoutCeilingMs,
} = require('./acceptance/browser-lifecycle-v2/browser-lifecycle');

assert.equal(browserLifecycleGlobalTimeoutCeilingMs({}), 120_000);
assert.equal(browserLifecycleGlobalTimeoutCeilingMs({ CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS: 'invalid' }), 120_000);
assert.equal(browserLifecycleGlobalTimeoutCeilingMs({ CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS: '1' }), 120_000);
assert.equal(browserLifecycleGlobalTimeoutCeilingMs({ CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS: '89999' }), 359_996);
assert.equal(browserLifecycleGlobalTimeoutCeilingMs({ CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS: '90000' }), 360_000);
assert.equal(browserLifecycleGlobalTimeoutCeilingMs({ CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS: '999999' }), 600_000);

console.log('[browser-lifecycle-lowload-timeout] PASS 6/6');
