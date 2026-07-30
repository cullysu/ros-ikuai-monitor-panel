const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const maturity = read("src/panel-framework/routes/panelRouteMaturity.ts");
const routes = read("src/panel-framework/routes/panelRoutes.ts");
const model = read("src/panel-framework/sections/sectionModels.ts");
const evidenceTypes = read("src/panel-framework/sections/sectionRowEvidenceTypes.ts");
const evidenceBuilder = read("src/panel-framework/sections/sectionRowEvidence.ts");
const inspector = read("src/panel-framework/mobile/mobile-inspector/ResourceInspector.tsx");

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

expect(
  /loadAudit:\s*sectionEvidence\("loadAudit",\s*"ResourceInspector\.tsx"/.test(maturity),
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
  /data-resource-audit-sequence/.test(inspector) && /currentRoute\s*===\s*"loadAudit"/.test(inspector),
  "loadAudit inspector must render a route-specific timestamped sequence",
);

if (failures.length) {
  console.error(JSON.stringify({ pass: false, contract: "load-audit-maturity-v1", failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ pass: true, contract: "load-audit-maturity-v1", checks: 6 }, null, 2));
