#!/usr/bin/env node
"use strict";

const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const runtime = path.join(__dirname, "check-mobile-reference-runtime.js");
const forwardedArgs = process.argv.slice(2);

let result;
if (process.platform === "win32" && process.env.CI !== "true") {
  const wrapper = path.join(__dirname, "run-mobile-reference-runtime-low-load.cmd");
  result = spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/c", wrapper, ...forwardedArgs], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  });
} else {
  result = spawnSync(process.execPath, [runtime, ...forwardedArgs], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
}

if (result.error) throw result.error;
process.exitCode = Number.isInteger(result.status) ? result.status : 1;
