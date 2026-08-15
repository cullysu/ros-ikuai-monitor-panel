"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const readOptional = (relativePath) => {
  try {
    return read(relativePath);
  } catch (error) {
    if (error && error.code === "ENOENT") return "";
    throw error;
  }
};
const routes = read("src/panel-framework/routes/panelRoutes.ts");
const maturity = read("src/panel-framework/routes/panelRouteMaturity.ts");
const routeSurface = read("src/panel-framework/mobile-flow-ui/workspace/MobileFlowWorkspace.tsx");

const checks = [
  {
    name: "trafficAudit remains an explicitly bounded route",
    pass: /trafficAudit:\s*\{[\s\S]*?maturity:\s*"bounded-readonly"/.test(routes),
  },
  {
    name: "trafficAudit maturity binds to its own evidence record",
    pass: /trafficAudit:\s*sectionEvidence\("trafficAudit"/.test(maturity),
  },
  {
    name: "trafficAudit remains below complete maturity until it has a dedicated inspector",
    pass: !/trafficAudit:\s*\{[\s\S]*?maturity:\s*"complete"/.test(routes),
  },
  {
    name: "trafficAudit uses the Mobile Flow object destination",
    pass: /useObjectHistory\(route\)/.test(routeSurface) && /open\(row\.id\)/.test(routeSurface) && /data-mobile-flow-detail=\{row\.id\}/.test(routeSurface),
  },
  {
    name: "bounded trafficAudit detail exposes Mobile Flow identity and complete raw fields",
    pass: /mflow-detail__identity/.test(routeSurface) && /const fields = row\.columns\.map/.test(routeSurface) && /row\.evidence\.sourceTable \|\| row\.table/.test(routeSurface) && /对象证据/.test(routeSurface),
  },
];

const failures = checks.filter((check) => !check.pass).map((check) => check.name);
const report = {
  pass: failures.length === 0,
  contract: "traffic-audit-maturity-v1",
  checks: Object.fromEntries(checks.map((check) => [check.name, check.pass])),
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
