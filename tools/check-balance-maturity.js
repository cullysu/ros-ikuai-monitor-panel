"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const routes = read("src/panel-framework/routes/panelRoutes.ts");
const maturity = read("src/panel-framework/routes/panelRouteMaturity.ts");
const inspector = read("src/panel-framework/mobile/mobile-inspector/BalanceInspector.tsx");
const domainInspector = read("src/panel-framework/mobile/mobile-inspector/MobileDomainInspector.tsx");

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
    name: "balance has a dedicated inspector",
    pass: /function BalanceInspector\s*\(/.test(inspector),
  },
  {
    name: "balance routes policy rows to the dedicated inspector",
    pass: domainInspector.includes('currentRoute === "balance"'),
  },
  {
    name: "balance detail exposes policy-specific evidence",
    pass: ["匹配与动作", "路由标记", "对象 ID"].every((label) => inspector.includes(label)),
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
