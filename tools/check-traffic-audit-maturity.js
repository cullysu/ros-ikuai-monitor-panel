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
const inspector = readOptional("src/panel-framework/mobile/mobile-inspector/TrafficAuditInspector.tsx");
const domainInspector = read("src/panel-framework/mobile/mobile-inspector/MobileDomainInspector.tsx");

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
    name: "trafficAudit has a dedicated inspector",
    pass: /function TrafficAuditInspector\s*\(/.test(inspector),
  },
  {
    name: "trafficAudit routes flow rows to the dedicated inspector",
    pass: domainInspector.includes('currentRoute === "trafficAudit"'),
  },
  {
    name: "trafficAudit detail exposes audit-specific evidence",
    pass: ["流量对象", "审计读数", "审计范围", "对象 ID"].every((label) => inspector.includes(label)),
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
