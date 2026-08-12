#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
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

console.log("package script file-reference regression: PASS source() missing-validator detection");
