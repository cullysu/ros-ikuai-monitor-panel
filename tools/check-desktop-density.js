const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const cssPath = path.join(ROOT, "src", "panel-framework", "sections", "desktop-domain.css");
const css = fs.readFileSync(cssPath, "utf8");

function blockFor(source, selector) {
  const selectorAt = source.indexOf(`${selector} {`);
  if (selectorAt < 0) return "";
  const openAt = source.indexOf("{", selectorAt + selector.length);
  if (openAt < 0) return "";
  let depth = 0;
  for (let index = openAt; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(selectorAt, index + 1);
    }
  }
  return "";
}

const body = blockFor(css, ".ddw-body");
const tablePane = blockFor(css, ".ddw-table-pane");
const inspector = blockFor(css, ".ddw-inspector");
const checks = {
  bodyAlignsContentAtStart: /align-items:\s*start\s*;/.test(body),
  tablePaneOwnsNaturalHeight: /align-self:\s*start\s*;/.test(tablePane)
    && /height:\s*fit-content\s*;/.test(tablePane),
  inspectorOwnsItsContent: /align-self:\s*start\s*;/.test(inspector),
};
const failed = Object.entries(checks).filter(([, value]) => !value).map(([name]) => name);
const report = {
  pass: failed.length === 0,
  cssPath: path.relative(ROOT, cssPath).replaceAll("\\", "/"),
  checks,
  failed,
  contract: "desktop-density-space-ownership-v1",
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
