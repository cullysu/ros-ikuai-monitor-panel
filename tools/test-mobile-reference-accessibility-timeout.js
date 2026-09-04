#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const {
  accessibilityGlobalTimeoutMs,
} = require("./check-mobile-reference-accessibility-runtime");
const { withTimeout } = require("./acceptance/accessibility-v2/runtime");

assert.equal(accessibilityGlobalTimeoutMs({}), 210_000);
assert.equal(accessibilityGlobalTimeoutMs({ CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS: "invalid" }), 210_000);
assert.equal(accessibilityGlobalTimeoutMs({ CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS: "1" }), 210_000);
assert.equal(accessibilityGlobalTimeoutMs({ CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS: "90000" }), 360_000);
assert.equal(accessibilityGlobalTimeoutMs({ CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS: "999999" }), 600_000);

(async () => {
  let aborted = false;
  await withTimeout("abort-signal-regression", async (signal) => {
    signal.addEventListener("abort", () => { aborted = true; }, { once: true });
    await new Promise((resolve) => setTimeout(resolve, 25));
    signal.throwIfAborted();
  }, 5).then(
    () => assert.fail("withTimeout must reject after the bounded deadline"),
    (error) => assert.equal(error.code, "GLOBAL_TIMEOUT"),
  );
  assert.equal(aborted, true);
  console.log("[mobile-reference-accessibility-timeout] PASS 6/6");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
