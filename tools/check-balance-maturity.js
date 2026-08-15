"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const routes = read("src/panel-framework/routes/panelRoutes.ts");
const maturity = read("src/panel-framework/routes/panelRouteMaturity.ts");
const routeSurface = read("src/panel-framework/mobile-flow-ui/workspace/MobileFlowWorkspace.tsx");

const checks = [
  {
    name: "balance remains an explicitly bounded route",
    pass: /balance:\s*\{[\s\S]*?maturity:\s*"bounded-readonly"/.test(routes),
  },
  {
    name: "balance maturity binds to its own evidence record",
    pass: /balance:\s*sectionEvidence\("balance"/.test(maturity),
  },
  {
    name: "balance remains below complete maturity until it has a dedicated inspector",
    pass: !/balance:\s*\{[\s\S]*?maturity:\s*"complete"/.test(routes),
  },
  {
    name: "balance uses the Mobile Flow object destination",
    pass: /useObjectHistory\(route\)/.test(routeSurface) && /open\(row\.id\)/.test(routeSurface) && /data-mobile-flow-detail=\{row\.id\}/.test(routeSurface),
  },
  {
    name: "bounded balance detail exposes Mobile Flow identity and complete raw fields",
    pass: /mflow-detail__identity/.test(routeSurface) && /const fields = row\.columns\.map/.test(routeSurface) && /row\.evidence\.sourceTable \|\| row\.table/.test(routeSurface) && /对象证据/.test(routeSurface),
  },
];

const failures = checks.filter((check) => !check.pass).map((check) => check.name);
const report = {
  pass: failures.length === 0,
  contract: "balance-maturity-v1",
  checks: Object.fromEntries(checks.map((check) => [check.name, check.pass])),
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
