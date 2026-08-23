const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const maturity = read("src/panel-framework/routes/panelRouteMaturity.ts");
const routes = read("src/panel-framework/routes/panelRoutes.ts");
const model = read("src/panel-framework/sections/sectionModels.ts");
const evidenceTypes = read("src/panel-framework/sections/sectionRowEvidenceTypes.ts");
const evidenceBuilder = read("src/panel-framework/sections/sectionRowEvidence.ts");
const routeSurface = read("src/panel-framework/mobile-reference-ui/MobileReferenceSurface.tsx");
const routeAssembly = read("src/panel-framework/mobile-reference-ui/MobileReferenceSurface.tsx");

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

expect(
  /loadAudit:\s*sectionEvidence\("loadAudit"/.test(maturity),
  "loadAudit must have its own bounded-readonly evidence record instead of fallbackEvidence",
);
expect(
  /loadAudit:\s*\{[^\n]*maturity:\s*"bounded-readonly"/.test(routes),
  "loadAudit route definition must be bounded-readonly, not fallback",
);
expect(
  /route === "loadAudit"\s*\?\s*"采样审计"/.test(model),
  "loadAudit must own a route-specific sampling-audit title",
);
expect(
  /samples:\s*Array<\{\s*timestamp:\s*string;\s*value:\s*number;\s*\}>/.test(evidenceTypes),
  "resource evidence must carry timestamped samples as an atomic sequence",
);
expect(
  /sampleTimes|timestampedSamples/.test(evidenceBuilder),
  "resource evidence builder must preserve timestamped samples",
);
expect(
  /buildSectionModel\(route, snapshot\)/.test(routeAssembly)
    && /data-mobile-reference-workspace=\{route\}/.test(routeSurface)
    && /rows\.map/.test(routeSurface),
  "loadAudit detail must expose the selected resource object's raw evidence without duplicating a synthetic audit summary",
);

if (failures.length) {
  console.error(JSON.stringify({ pass: false, contract: "load-audit-maturity-v1", failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ pass: true, contract: "load-audit-maturity-v1", checks: 6 }, null, 2));
