const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const cssPath = path.join(ROOT, "src", "panel-framework", "mobile", "mobile-domain.css");
const css = fs.readFileSync(cssPath, "utf8");

function blockFor(source, selector, startAt = 0) {
  const selectorAt = source.indexOf(selector, startAt);
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

const tabletAt = css.indexOf("@media (min-width: 768px) and (max-width: 1199px)");
const tabletCss = tabletAt >= 0 ? css.slice(tabletAt) : "";
const checks = {
  tabletBand: tabletAt >= 0,
  unselectedShellOwnsNaturalHeight: false,
  unselectedLayoutDoesNotGrow: false,
  workbenchListOwnsRowHeight: false,
  workbenchInspectorRemainsScrollable: false,
};

const workbenchLayout = blockFor(tabletCss, ".mdw-shell.is-tablet-workbench .mdw-layout");
checks.unselectedShellOwnsNaturalHeight = /height:\s*fit-content\s*;/.test(workbenchLayout)
  && /align-content:\s*start\s*;/.test(workbenchLayout);

const unselectedLayout = workbenchLayout;
checks.unselectedLayoutDoesNotGrow = /height:\s*fit-content\s*;/.test(unselectedLayout)
  && !/flex:\s*1\s+1\s+auto\s*;/.test(unselectedLayout);

const workbenchList = blockFor(tabletCss, ".mdw-shell.is-tablet-workbench .mdw-list-pane");
checks.workbenchListOwnsRowHeight = /align-self:\s*start\s*;/.test(workbenchList)
  && /height:\s*fit-content\s*;/.test(workbenchList);

const workbenchInspector = blockFor(tabletCss, ".mdw-shell.is-tablet-workbench .mdw-inspector");
checks.workbenchInspectorRemainsScrollable = /overflow-y:\s*auto\s*;/.test(workbenchInspector);

const failed = Object.entries(checks).filter(([, value]) => !value).map(([name]) => name);
const report = {
  pass: failed.length === 0,
  cssPath: path.relative(ROOT, cssPath).replaceAll("\\", "/"),
  checks,
  failed,
  contract: "tablet-density-space-ownership-v1",
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
