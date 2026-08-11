#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { readRuntimeReport, runtimeIdentityDetail } = require("./runtime-report-identity");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const css = read("src/panel-framework/overview/desktop-overview/styles/desktop-overview.css");
const runtimeBinding = readRuntimeReport(root);
const requireRuntime = process.argv.includes("--require-current-runtime");
const runtimeSkipped = !runtimeBinding.current && !requireRuntime;
const runtime = runtimeBinding.current ? runtimeBinding.report : null;
const runtimeCheck = (runtime?.checks || []).find((check) =>
  check?.detail?.normal1366?.surface === "desktop" &&
  check?.detail?.normal1440?.surface === "desktop" &&
  check.detail.normal1366.focusObjectRect &&
  check.detail.normal1366.signalRect);
const normal = runtimeCheck?.detail?.normal1366 || null;
const focusTop = normal?.focusObjectRect?.top ?? null;
const signalTop = normal?.signalRect?.top ?? null;
const topDelta = typeof focusTop === "number" && typeof signalTop === "number"
  ? Math.abs(focusTop - signalTop)
  : null;
const checks = {
  sourceDeclaresNaturalTopBandAlignment: /\.do-normal-top-band\s*\{[\s\S]*?align-items:\s*start/.test(css),
  runtimeIdentityCurrentWhenRequired: !requireRuntime || runtimeBinding.current,
  freshRuntimeIsBound: runtimeSkipped || Boolean(normal),
  focusAndSignalShareTopEdge: runtimeSkipped || (topDelta !== null && topDelta <= 12),
  noSecondDesktopRenderTree: !/DesktopOverviewScreen[\s\S]*DesktopOverviewScreen/.test(css),
};
const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failed.length === 0,
  contract: "desktop-normal-top-band-continuity-v2",
  implementationState: failed.length ? "expected-red" : runtimeBinding.current ? "focused-runtime-green" : "static-green-runtime-pending",
  runtimeEvidence: runtimeIdentityDetail(runtimeBinding),
  geometry: { focusTop, signalTop, topDelta },
  checks,
  failed,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
