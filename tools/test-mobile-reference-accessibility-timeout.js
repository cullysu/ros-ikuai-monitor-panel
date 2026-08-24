#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const {
  accessibilityGlobalTimeoutMs,
} = require("./check-mobile-reference-accessibility-runtime");

assert.equal(accessibilityGlobalTimeoutMs({}), 210_000);
assert.equal(accessibilityGlobalTimeoutMs({ CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS: "invalid" }), 210_000);
assert.equal(accessibilityGlobalTimeoutMs({ CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS: "1" }), 210_000);
assert.equal(accessibilityGlobalTimeoutMs({ CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS: "90000" }), 360_000);
assert.equal(accessibilityGlobalTimeoutMs({ CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS: "999999" }), 600_000);

console.log("[mobile-reference-accessibility-timeout] PASS 5/5");
