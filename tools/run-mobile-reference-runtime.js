#!/usr/bin/env node
"use strict";

const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const runtime = path.join(__dirname, "check-mobile-reference-runtime.js");
const forwardedArgs = process.argv.slice(2);

let result;
if (process.platform === "win32" && process.env.CI !== "true") {
  const lowLoad = path.join(__dirname, "run-low-load.py");
  result = spawnSync("py", ["-3", lowLoad, "--browser", process.execPath, runtime, ...forwardedArgs], {
    cwd: root,
    env: {
      ...process.env,
      MOBILE_MAX_CPU_PERCENT: "55",
      MOBILE_RUNTIME_LAUNCHER_ID: path.join(__dirname, "run-mobile-reference-runtime.js"),
      MOBILE_CPU_AFFINITY_ENFORCED: "1",
    },
    stdio: "inherit",
    windowsHide: true,
  });
} else {
  result = spawnSync(process.execPath, [runtime, ...forwardedArgs], {
    cwd: root,
    env: {
      ...process.env,
      MOBILE_RUNTIME_LAUNCHER_ID: path.join(__dirname, "run-mobile-reference-runtime.js"),
    },
    stdio: "inherit",
  });
}

if (result.error) throw result.error;
process.exitCode = Number.isInteger(result.status) ? result.status : 1;
