#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..", "..");
const helperRelative = "tools/acceptance/current-runtime-mock.js";
const helperPath = path.join(root, helperRelative);
const retiredNames = [
  "check-panel-runtime-browser.js",
  "check-runtime-browser-lifecycle.js",
  "check-runtime-screenshot-bound.js",
  "runtime-screenshot-contract.js",
  "capture-runtime-screenshot.js",
  "check-cross-surface-incident-priority.js",
  "check-cross-surface-status-grammar-v1.js",
  "check-cross-surface-visual-continuity-v1.js",
];

const consumers = new Map([
  ["tools/acceptance/accessibility-v2/runtime.js", "../current-runtime-mock"],
  ["tools/capture-desktop-ipad-baseline.js", "./acceptance/current-runtime-mock"],
  ["tools/check-desktop-interface-relations-runtime.js", "./acceptance/current-runtime-mock"],
  ["tools/check-desktop-ipad-runtime.js", "./acceptance/current-runtime-mock"],
  ["tools/check-mobile-interface-route-evidence-runtime.js", "./acceptance/current-runtime-mock"],
  ["tools/check-resource-tablet-flow-runtime.js", "./acceptance/current-runtime-mock"],
  ["tools/check-supplemental-route-runtime.js", "./acceptance/current-runtime-mock"],
  ["tools/check-tablet-interface-relations-runtime.js", "./acceptance/current-runtime-mock"],
  ["tools/check-tablet-resource-fallback-v1.js", "./acceptance/current-runtime-mock"],
  ["tools/check-tablet-resource-first-inspection-v1.js", "./acceptance/current-runtime-mock"],
  ["tools/check-tablet-resource-trend-readability-v1.js", "./acceptance/current-runtime-mock"],
  ["tools/test-browser-toolbar-zoom200-readiness.js", "./acceptance/current-runtime-mock"],
]);

assert.equal(fs.existsSync(helperPath), true, `${helperRelative} must exist`);
const helper = fs.readFileSync(helperPath, "utf8");
assert.match(helper, /module\.exports\s*=\s*\{\s*actionTimeout,\s*startMock,\s*browserExecutable\s*\}/, "helper must expose only the bounded shared runtime primitives");
assert.match(helper, /const fsp = fs\.promises;/, "helper must retain the async static-file dependency");
assert.match(helper, /const fingerprint = ["']SHA256:/, "helper must retain the SSH fingerprint fixture");
assert.doesNotMatch(helper, /\b(?:async\s+)?function\s+main\b|require\.main\s*===\s*module/, "helper must not contain an executable main");
assert.doesNotMatch(helper, /screenshot\s*\(|RUNTIME_SCREENSHOT_CONTRACT|panel-runtime-browser|data-mobile-overview|data-mobile-domain-workspace/, "helper must not carry the retired screenshot matrix or owner markers");
assert.ok(helper.split(/\r?\n/).length < 1500, "shared mock helper must remain a bounded fixture, not another giant runner");

for (const [relative, request] of consumers) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  assert.match(source, new RegExp(`require\\(["']${request.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']\\)`), `${relative} must import the shared current runtime mock`);
  assert.doesNotMatch(source, /require\(["'][^"']*check-panel-runtime-browser["']\)/, `${relative} must not import the retired runner`);
}

const listed = spawnSync("git", ["ls-files", "tools", "package.json", ".github"], {
  cwd: root,
  encoding: "utf8",
  windowsHide: true,
});
assert.equal(listed.status, 0, listed.stderr || "git ls-files failed");
const activeFiles = listed.stdout.split(/\r?\n/).filter(Boolean).filter((relative) => relative !== helperRelative && relative !== "tools/acceptance/test-current-runtime-mock-architecture.js");
const activeReferences = [];
for (const relative of activeFiles) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute) || fs.statSync(absolute).isDirectory()) continue;
  const source = fs.readFileSync(absolute, "utf8");
  for (const name of retiredNames) {
    if (source.includes(name)) activeReferences.push(`${relative} -> ${name}`);
  }
}
assert.deepEqual(activeReferences, [], `active package/CI/tooling must not reference retired gates:\n${activeReferences.join("\n")}`);

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const scripts = JSON.stringify(packageJson.scripts || {});
for (const name of retiredNames) assert.equal(scripts.includes(name), false, `package scripts must not reference ${name}`);

console.log("current runtime mock architecture: PASS bounded helper and no active retired-runner references");
