#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const workspace = read("src/panel-framework/sections/DesktopDomainWorkspace.tsx");
const inspector = read("src/panel-framework/sections/DesktopDomainInspector.tsx");
const css = read("src/panel-framework/sections/desktop-domain.css");

const checks = {
  consumesNavigationQueryOnLoad: /query:\s*navigationQuery[\s\S]*useState\(navigationQuery \|\| ""\)/.test(workspace),
  resyncsNavigationQueryWhenContextChanges: /setQuery\(navigationQuery \|\| ""\)[\s\S]*\[definition, navigationQuery, route\]/.test(workspace),
  hidesSearchForNonSearchableRoutes: /definition\.searchable \? \([\s\S]*className="ddw-search"/.test(workspace),
  keepsSearchlessToolbarBalanced: /\.ddw-toolbar\.is-searchless\s*\{[\s\S]*grid-template-columns/.test(css),
  riskContextUsesRealMatchedRows: /const riskRows = [\s\S]*operationalImpact === "risk"/.test(workspace) &&
    /riskRows\.map\(\(item\) => item\.primary\)/.test(inspector),
  riskContextDoesNotRenderAnEmptyPromise: !/当前证据没有可查看的对象/.test(inspector),
};

const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
process.stdout.write(`${JSON.stringify({ pass: failed.length === 0, contract: "desktop-domain-workspace-v1", checks, failed }, null, 2)}\n`);
if (failed.length) process.exitCode = 1;
