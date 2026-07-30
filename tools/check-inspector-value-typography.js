const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const primitives = fs.readFileSync(path.join(root, "src/panel-framework/mobile/mobile-inspector/InspectorPrimitives.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "src/panel-framework/mobile/mobile-domain-foundation.css"), "utf8")
  + "\n"
  + fs.readFileSync(path.join(root, "src/panel-framework/mobile/mobile-domain.css"), "utf8");

function block(source, selector) {
  const start = source.indexOf(selector);
  if (start < 0) return "";
  const end = source.indexOf("\n  }", start);
  return end >= 0 ? source.slice(start, end + 4) : source.slice(start);
}

const factBlock = block(css, ".mdi-facts b {");
const relationBlock = block(css, ".mdi-relations b {");
const monoToken = /--mono:\s*ui-monospace/.test(css);
const monoFamily = /font-family:\s*(?:ui-monospace|var\(--mono\))/.test(css);
const checks = {
  factValueKindContract: /valueKind/.test(primitives) && /is-value-\$\{/.test(primitives),
  relationValueKindContract: /primaryKind|valueKind/.test(primitives) && /is-value-\$\{/.test(primitives),
  semanticFactsDefaultToBodyFont: /font-family:\s*inherit/.test(factBlock) && !/font-family:\s*ui-monospace/.test(factBlock),
  machineFactsRemainScoped: /\.mdi-facts\s*>\s*\.is-value-machine\s+b/.test(css) && monoToken && monoFamily,
  semanticRelationsDefaultToBodyFont: /font-family:\s*inherit/.test(relationBlock) && !/font-family:\s*ui-monospace/.test(relationBlock),
  numericReadingsRemainTabular: /\.mdi-readings\s+\.is-value-(?:machine|numeric)\s+b[\s\S]*font-family:\s*(?:ui-monospace|var\(--mono\))/.test(css),
};

const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const report = {
  pass: failed.length === 0,
  checks,
  failed,
  contract: "mobile-inspector-value-typography-v1",
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
