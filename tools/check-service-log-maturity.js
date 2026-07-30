"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const readIfExists = (relativePath) => {
  const filename = path.join(root, relativePath);
  return fs.existsSync(filename) ? fs.readFileSync(filename, "utf8") : "";
};

const routes = read("src/panel-framework/routes/panelRoutes.ts");
const maturity = read("src/panel-framework/routes/panelRouteMaturity.ts");
const model = read("src/panel-framework/sections/sectionModels.ts");
const evidenceTypes = read("src/panel-framework/sections/serviceLogEvidenceTypes.ts");
const evidenceBuilder = read("src/panel-framework/sections/serviceLogEvidence.ts");
const domainInspector = read("src/panel-framework/mobile/mobile-inspector/MobileDomainInspector.tsx");
const inspector = readIfExists("src/panel-framework/mobile/mobile-inspector/ServiceLogInspector.tsx");

const checks = [
  {
    name: "serviceLogs is explicitly bounded-readonly",
    pass: /serviceLogs:\s*\{[\s\S]*?maturity:\s*"bounded-readonly"/.test(routes),
  },
  {
    name: "serviceLogs maturity binds to dedicated evidence",
    pass: /serviceLogs:\s*serviceLogEvidence\("serviceLogs"/.test(maturity),
  },
  {
    name: "serviceLogs has a route-specific model",
    pass: /function serviceLogModel\s*\(/.test(model) && /if \(route === "serviceLogs"\) return serviceLogModel\(snapshot\)/.test(model),
  },
  {
    name: "serviceLogs has a dedicated evidence type",
    pass: /interface ServiceLogRowEvidence/.test(evidenceTypes) && /serviceCategory/.test(evidenceTypes),
  },
  {
    name: "serviceLogs evidence builder preserves source collection",
    pass: /function serviceLogEvidence\s*\(/.test(evidenceBuilder) && /sourceCollection/.test(evidenceBuilder),
  },
  {
    name: "serviceLogs routes to its dedicated inspector",
    pass: /currentRoute === "serviceLogs"/.test(domainInspector) && /function ServiceLogInspector\s*\(/.test(inspector),
  },
  {
    name: "service inspector exposes category and failure boundary",
    pass: ["服务类别", "来源集合", "没有可用于当前判断的服务日志"].every((token) => inspector.includes(token)),
  },
];

const failures = checks.filter((check) => !check.pass).map((check) => check.name);
const report = {
  pass: failures.length === 0,
  contract: "service-log-maturity-v1",
  implementationState: failures.length === 0 ? "focused-green" : "expected-red-or-incomplete",
  checks: Object.fromEntries(checks.map((check) => [check.name, check.pass])),
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
