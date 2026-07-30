#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const css = read("src/panel-framework/overview/desktop-overview/styles/desktop-overview.css");
const runtime = JSON.parse(read("_acceptance/panel-runtime-browser/report.json"));
const runtimeCheck = (runtime.checks || []).find(
  (check) => check.name === "1200/1366/1440 normal desktop follows Focus-left Signal-right then full-width current decisions",
);
const normal = runtimeCheck?.detail?.normal1366 || null;
const focusTop = normal?.focusObjectRect?.top ?? null;
const signalTop = normal?.signalRect?.top ?? null;
const topDelta = typeof focusTop === "number" && typeof signalTop === "number"
  ? Math.abs(focusTop - signalTop)
  : null;
const checks = {
  sourceDeclaresNaturalTopBandAlignment: /\.do-normal-top-band\s*\{[\s\S]*?align-items:\s*start/.test(css),
  freshRuntimeIsBound: Boolean(normal),
  focusAndSignalShareTopEdge: topDelta !== null && topDelta <= 12,
  noSecondDesktopRenderTree: !/DesktopOverviewScreen[\s\S]*DesktopOverviewScreen/.test(css),
};
const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failed.length === 0,
  contract: "desktop-normal-top-band-continuity-v2",
  implementationState: failed.length === 0 ? "focused-runtime-green" : "expected-red",
  geometry: { focusTop, signalTop, topDelta },
  checks,
  failed,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
