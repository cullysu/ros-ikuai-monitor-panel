#!/usr/bin/env node
"use strict";

/**
 * Write-ahead contract for the narrow mobile verdict surface.
 *
 * The verdict is the first decision a patrol user needs to scan. It may own
 * one quiet cool-blue surface, but it must remain a compact status band rather
 * than becoming another rounded card or a saturated alert block.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "src/panel-framework/mobile/mobile-patrol.css"), "utf8");
const screen = fs.readFileSync(path.join(root, "src/panel-framework/mobile/MobilePatrolScreen.tsx"), "utf8");
const command = css.match(/\.mp-command\s*\{([\s\S]*?)\}/)?.[1] || "";
const quietSurface = /background:\s*(?:var\(--mp-surface-quiet\)|var\(--nc-surface\));/.test(command);
const restrainedRule = /border-bottom:\s*1px\s+solid\s+(?:var\(--mp-line\)|var\(--nc-border\));/.test(command);

const checks = [
  ["verdict has an explicit visual owner", /data-mobile-visual-layer="verdict"/.test(screen)],
  ["verdict owns a quiet cool-blue surface", quietSurface],
  ["verdict surface is separated by one restrained rule", restrainedRule],
  ["verdict does not become a rounded card", !/border-radius:\s*(?!0)/.test(command)],
  ["verdict does not use a gradient or saturated fill", !/(?:linear-gradient|radial-gradient|#(?:f|e|d)[0-9a-f]{5,6})/i.test(command)],
  ["verdict remains inside the mobile style tree", !/desktop-overview|DesktopOverview|panel-framework\/overview\/desktop/.test(css)],
];

const failures = checks.filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failures.length === 0,
  contract: "mobile-verdict-surface-v1",
  implementationState: failures.length === 0 ? "focused-green" : "expected-red",
  failures,
  checks: Object.fromEntries(checks),
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
