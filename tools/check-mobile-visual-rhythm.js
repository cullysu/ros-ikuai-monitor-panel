#!/usr/bin/env node

/**
 * Narrow Product/Design red contract for the mobile patrol surface.
 *
 * This does not claim visual sign-off. It only prevents the mobile surface
 * from drifting back into heavy table-like separators and a single undiffer-
 * entiated wash while preserving the existing evidence hierarchy contract.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(ROOT, "src/panel-framework/mobile/mobile-patrol-foundation.css"), "utf8")
  + "\n"
  + fs.readFileSync(path.join(ROOT, "src/panel-framework/mobile/mobile-patrol.css"), "utf8");
const sharedTokenCss = fs.readFileSync(path.join(ROOT, "src/panel-framework/network-console-visual-tokens.css"), "utf8");

function tokenValue(name) {
  const match = css.match(new RegExp(`${name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*:\\s*([^;]+)`));
  return match ? match[1].trim() : null;
}

function resolveToken(value) {
  const match = value && value.match(/^var\((--[\w-]+)\)$/);
  if (!match) return value;
  const shared = sharedTokenCss.match(new RegExp(`${match[1]}\\s*:\\s*([^;]+)`));
  return shared ? shared[1].trim() : value;
}

function alpha(value) {
  const match = value && value.match(/rgba?\([^)]*,\s*([0-9.]+)\s*\)$/);
  return match ? Number(match[1]) : null;
}

const line = resolveToken(tokenValue("--mp-line"));
const strongLine = resolveToken(tokenValue("--mp-line-strong"));
const base = tokenValue("--mp-surface-base");
const raised = tokenValue("--mp-surface-raised");
const quiet = tokenValue("--mp-surface-quiet");
const accent = tokenValue("--mp-accent-wash");

const checks = [
  {
    name: "ordinary separators are restrained",
    pass: alpha(line) !== null && alpha(line) <= 0.12,
    detail: `--mp-line=${line || "missing"}; expected rgba alpha <= 0.12`,
  },
  {
    name: "strong separators remain subordinate to content",
    pass: alpha(strongLine) !== null && alpha(strongLine) <= 0.2,
    detail: `--mp-line-strong=${strongLine || "missing"}; expected rgba alpha <= 0.20`,
  },
  {
    name: "surface tiers are materially distinct",
    pass: [base, raised, quiet, accent].every(Boolean) && new Set([base, raised, quiet, accent]).size >= 3,
    detail: `base=${base || "missing"}; raised=${raised || "missing"}; quiet=${quiet || "missing"}; accent=${accent || "missing"}`,
  },
  {
    name: "normal decision rows remain neutral",
    pass: /\.mp-decision-ledger-row\s*\{[\s\S]*?background\s*:\s*(?:none|var\(--mp-surface-(?:base|raised|quiet)\)|transparent)/.test(css),
    detail: "normal decision rows must not use danger/warn wash",
  },
  {
    name: "phone canvas does not become a closed desktop card",
    pass: /@media\s*\(max-width:\s*599px\)[\s\S]*?\.mp-patrol-canvas\s*\{[\s\S]*?border\s*:\s*0[;\s]/.test(css),
    detail: "<=599px must retain an edge-to-edge native list surface",
  },
  {
    name: "visual rhythm contract stays inside the mobile tree",
    pass: !/desktop-overview|DesktopOverview|panel-framework\/overview\/desktop/.test(css),
    detail: "mobile rhythm changes must not reach the desktop render tree",
  },
];

const failed = checks.filter((check) => !check.pass);
const report = {
  pass: failed.length === 0,
  contract: "mobile-visual-rhythm-v1",
  checks,
  failures: failed.map((check) => check.name),
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exitCode = 1;
