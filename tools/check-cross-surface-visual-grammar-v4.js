#!/usr/bin/env node
"use strict";

/**
 * Write-ahead contract for the cross-surface visual grammar slice.
 *
 * Mobile and desktop intentionally keep separate render trees. The shared
 * contract is the semantic vocabulary and visual-level inheritance, not a
 * hidden shared DOM tree. This is an engineering/product-design boundary
 * check; it is not an independent Product, Design, or Visual QA sign-off.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const tokens = read("src/panel-framework/network-console-visual-tokens.css");
const mobile = read("src/panel-framework/mobile/mobile-patrol.css");
const mobileFoundation = read("src/panel-framework/mobile/mobile-patrol-foundation.css");
const desktopTokens = read("src/panel-framework/overview/desktop-overview/styles/desktop-overview-tokens.css");
const desktop = read("src/panel-framework/overview/desktop-overview/styles/desktop-overview.css");
const mobileScreen = read("src/panel-framework/mobile/MobilePatrolScreen.tsx");
const mobileEvidence = read("src/panel-framework/mobile/MobileEvidenceLedger.tsx");
const desktopScreen = read("src/panel-framework/overview/desktop-overview/DesktopOverviewScreen.tsx");

const hasToken = (source, token) => new RegExp(`${token}\\s*:`).test(source);
const canonicalTokens = [
  "--mp-blue",
  "--do-blue",
  "--mp-danger",
  "--do-danger",
  "--nc-surface-primary",
  "--nc-surface",
];

const checks = [
  ["canonical tone and visual-level vocabulary exists", canonicalTokens.every((token) => hasToken(tokens, token))],
  ["mobile state roles resolve through the shared owner", [
    tokens.includes("--mp-blue:"),
    tokens.includes("--mp-danger:"),
    mobileFoundation.includes("--mp-warn:"),
    mobileFoundation.includes("--mp-trust:"),
    mobileFoundation.includes("--mp-missing:"),
  ].every(Boolean)],
  ["desktop state roles resolve through the shared owner", [
    tokens.includes("--do-blue:"),
    tokens.includes("--do-danger:"),
    desktopTokens.includes("--do-warn:"),
    desktopTokens.includes("--do-trust:"),
    desktopTokens.includes("--do-missing:"),
  ].every(Boolean)],
  ["shared visual levels are inherited by mobile primary surfaces", [
    mobile.includes('data-overview-visual-level="primary"') || mobileScreen.includes('data-overview-visual-level="primary"'),
    mobile.includes("background: var(--nc-surface)"),
  ].every(Boolean)],
  ["shared visual levels are inherited by desktop primary surfaces", [
    desktopScreen.includes('data-overview-visual-level="primary"'),
    desktop.includes("background: var(--nc-surface)"),
  ].every(Boolean)],
  ["support remains visibly subordinate on both surfaces", [
    tokens.includes("--nc-surface:transparent"),
    mobileScreen.includes('data-overview-visual-level="support"') || mobileEvidence.includes('data-overview-visual-level="support"'),
    desktopScreen.includes('data-overview-visual-level="support"'),
  ].every(Boolean)],
  ["separate render owners remain explicit", [
    mobileScreen.includes('data-mobile-visual-grammar="ledger-v2"'),
    desktopScreen.includes('data-desktop-visual-grammar="network-console-v1"') || desktopScreen.includes("data-desktop-overview"),
  ].every(Boolean)],
];

const failures = checks.filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failures.length === 0,
  contract: "cross-surface-visual-grammar-v4",
  implementationState: failures.length === 0 ? "focused-engineering-green" : "expected-red",
  scope: "shared semantic tones and visual-level inheritance with separate mobile and desktop render trees",
  failures,
  checks: Object.fromEntries(checks),
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
