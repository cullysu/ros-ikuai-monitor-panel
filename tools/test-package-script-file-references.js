#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { collectToolReadPaths, missingToolReadFailures } = require("./check-package-script-file-references");

const missingName = "tools/package-reference-fixture-does-not-exist.js";
const fixture = `
  function source(relativePath) { return relativePath; }
  const validator = source("${missingName}");
`;
const paths = collectToolReadPaths(fixture, "source-wrapper-fixture.js");
assert.equal(paths.length, 1, "source() literal reads must be discovered");
assert.equal(paths[0].endsWith(path.normalize(missingName)), true, "the missing validator path must be resolved inside the repository");

const failures = missingToolReadFailures(fixture, "source-wrapper-fixture.js");
assert.deepEqual(
  failures,
  [`source-wrapper-fixture.js reads missing repository file: ${missingName}`],
  "a missing validator reached through source() must fail closed",
);

const root = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const focusedEvidenceScript = "node --max-old-space-size=2048 tools/test-source-runtime-report-identity.js && node --max-old-space-size=2048 tools/test-focused-source-runtime-readiness.js && node --max-old-space-size=2048 tools/test-wan-axis-report-identity.js";
assert.equal(
  packageJson.scripts["test:focused-source-runtime-evidence"],
  focusedEvidenceScript,
  "focused source-runtime evidence must run each static identity/readiness fixture exactly once",
);
for (const relative of [
  "tools/test-source-runtime-report-identity.js",
  "tools/test-focused-source-runtime-readiness.js",
  "tools/test-wan-axis-report-identity.js",
]) {
  assert.equal(fs.existsSync(path.join(root, relative)), true, `${relative} must remain present`);
}
const releaseAggregate = packageJson.scripts["check:release-gates"] || "";
const evidenceIndex = releaseAggregate.indexOf("npm run test:focused-source-runtime-evidence");
assert.ok(evidenceIndex >= 0, "release aggregate must run focused source-runtime evidence");
for (const consumer of ["npm run check:desktop-resource-density-v2", "npm run check:wan-axis-label-integrity-v1"]) {
  assert.ok(releaseAggregate.indexOf(consumer) > evidenceIndex, `${consumer} must run after focused source-runtime evidence`);
}
const ci = fs.readFileSync(path.join(root, ".github", "workflows", "ci.yml"), "utf8");
assert.ok(
  ci.indexOf("npm run check:release-gates") < ci.indexOf("node tools/check-public-release-readiness.js --static-only"),
  "the release aggregate (and its focused evidence fixtures) must precede public readiness",
);

console.log("package script file-reference regression: PASS source() detection and focused source-runtime evidence ordering");
