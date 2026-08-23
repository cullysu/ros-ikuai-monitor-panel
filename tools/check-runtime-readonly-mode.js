#!/usr/bin/env node

/**
 * Read-only mode must be visible in the runtime chrome, not only hidden in a
 * button title or in the overview's non-runtime presentation tree.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const sourcePath = path.join(ROOT, "src", "panel-framework", "runtime", "PanelRuntimeChrome.tsx");
const stylePath = path.join(ROOT, "src", "panel-framework", "runtime", "panel-runtime.css");
const source = fs.readFileSync(sourcePath, "utf8");
const styles = fs.readFileSync(stylePath, "utf8");

const checks = [
  {
    name: "mobile runtime chrome renders a visible readonly mode label",
    pass: /panel-runtime-mode/.test(source) && /只读/.test(source),
    detail: "the mobile runtime bar must expose the monitoring boundary as visible content",
  },
  {
    name: "desktop runtime chrome renders the same readonly mode label",
    pass: (source.match(/panel-runtime-mode/g) || []).length >= 2,
    detail: "desktop and mobile must share the same read-only boundary language",
  },
  {
    name: "readonly mode has a stable visual owner",
    pass: /\.panel-runtime-mode\s*\{/.test(styles)
      && /min-height:\s*\d+px/.test(styles)
      && /border/.test(styles),
    detail: "the label cannot depend on an invisible title attribute or incidental text flow",
  },
];

const failures = checks.filter((check) => !check.pass);
const report = {
  pass: failures.length === 0,
  contract: "runtime-readonly-mode-v1",
  checks,
  failures: failures.map((check) => check.name),
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
