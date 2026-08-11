#!/usr/bin/env node

/**
 * Product/Design write-ahead contract for the mobile overview surface.
 *
 * This is deliberately narrower than visual sign-off: it prevents a CSS
 * implementation from collapsing every state into the same blue wash and
 * prevents the navigation from advertising a decorative selection line.
 * Human Product/Design/Visual review remains a separate gate.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const opticalRoot = path.join(ROOT, "src/panel-framework/overview/mobile-overview/optical-patrol");
const patrolCss = [
  "styles/tokens.css",
  "styles/shell.css",
  "styles/claims.css",
  "styles/workbench.css",
  "styles/responsive.css",
  "styles/motion.css",
].map((file) => fs.readFileSync(path.join(opticalRoot, file), "utf8")).join("\n");

function block(source, selector) {
  const start = source.indexOf(selector);
  if (start < 0) return "";
  const end = source.indexOf("}", start);
  return end < 0 ? source.slice(start) : source.slice(start, end + 1);
}

const evidenceBoundary = block(patrolCss, ".op__evidence-boundary");
const selectedClaim = block(patrolCss, ".op__claim-state");
const activeTask = block(patrolCss, ".op__task-nav li[aria-current=\"page\"]");
const checks = [
  {
    name: "Optical Patrol declares a restrained surface and state token system",
    pass: ["--op-canvas:", "--op-canvas-raised:", "--op-line:", "--op-state:", "--op-target:"].every((token) => patrolCss.includes(token)),
    detail: "current mobile owner must declare canvas, raised surface, boundary, state, and target tokens",
  },
  {
    name: "evidence boundary uses a compact neutral reading surface",
    pass: Boolean(evidenceBoundary) && /font-variant-numeric\s*:\s*tabular-nums/.test(evidenceBoundary) && !/background\s*:/.test(evidenceBoundary),
    detail: evidenceBoundary || "Optical Patrol evidence boundary rule is missing",
  },
  {
    name: "selected object state is state-led rather than a decorative wash",
    pass: Boolean(selectedClaim) && /color\s*:\s*var\(--op-state\)/.test(selectedClaim) && !/background\s*:/.test(selectedClaim),
    detail: selectedClaim || "Optical Patrol selected-claim state rule is missing",
  },
  {
    name: "active task owns a selected surface",
    pass: Boolean(activeTask) && /background\s*:\s*rgba\(255\s*,\s*255\s*,\s*255\s*,\s*0\.62\)/.test(activeTask) && /border-color\s*:/.test(activeTask),
    detail: activeTask || "Optical Patrol active task rule is missing",
  },
  {
    name: "mobile content has no legacy Patrol namespace",
    pass: !/\b(?:mp__|mp-|mobile-patrol|MobilePatrol)\b/.test(patrolCss),
    detail: "the current mobile surface must not retain the retired Patrol namespace",
  },
];

const failed = checks.filter((check) => !check.pass);
const report = {
  pass: failed.length === 0,
  contract: "mobile-visual-surface-v2-optical-patrol",
  checks,
  failures: failed.map((check) => check.name),
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exitCode = 1;
