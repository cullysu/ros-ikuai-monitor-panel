#!/usr/bin/env node

/**
 * Step314 red/green contract for directory-level static-asset containment.
 * This is a source/test ownership contract; the Python and Node regressions
 * must still execute against temporary filesystem fixtures.
 */

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const runtime = read("panel_backend/static_assets.py");
const identity = read("tools/framework-asset-identity.js");
const staticTests = read("tools/check-static-assets.py");
const identityTests = read("tools/test-framework-asset-identity.js");

const checks = [
  {
    name: "runtime validates the public root before resolving assets",
    pass: runtime.includes("def _resolve_public_root(") && runtime.includes("_resolve_public_root(public_dir)"),
  },
  {
    name: "build identity validates the framework directory chain",
    pass: identity.includes("function assertOwnedDirectory") && identity.includes("assertOwnedDirectory(resolvedRoot, outputRoot"),
  },
  {
    name: "filesystem regressions cover directory symlink boundaries",
    pass: staticTests.includes("public-root symlink") && identityTests.includes("framework output directory symlink"),
  },
];

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name}`);
}

const failed = checks.filter((check) => !check.pass);
if (failed.length) {
  console.error(`[directory-sidecar-containment] FAIL ${failed.length}/${checks.length}`);
  process.exitCode = 1;
} else {
  console.log(`[directory-sidecar-containment] PASS ${checks.length}/${checks.length}`);
}
