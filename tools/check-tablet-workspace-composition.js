#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const cssPath = path.join(root, "src", "panel-framework", "mobile", "mobile-domain.css");
const componentPath = path.join(root, "src", "panel-framework", "mobile", "MobileDomainWorkspace.tsx");
const capabilityPath = path.join(root, "docs", "decision-system", "responsive-capabilities.md");
const runtimePath = path.join(root, "_acceptance", "panel-runtime-browser", "report.json");
const css = fs.readFileSync(cssPath, "utf8");
const component = fs.readFileSync(componentPath, "utf8");
const capability = fs.readFileSync(capabilityPath, "utf8");
const failures = [];

function check(name, condition, detail) {
  if (!condition) failures.push({ name, detail });
}

const workbench = css.match(/\.mdw-shell\.is-tablet-workbench \.mdw-layout\s*\{([\s\S]*?)\n\s*\}/)?.[1] || "";
const listPane = css.match(/\.mdw-shell\.is-tablet-workbench \.mdw-list-pane\s*\{([\s\S]*?)\n\s*\}/)?.[1] || "";
const inspector = css.match(/\.mdw-shell\.is-tablet-workbench \.mdw-inspector\s*\{([\s\S]*?)\n\s*\}/)?.[1] || "";

check(
  "tablet parent ends at natural content height",
  /height:\s*fit-content/.test(workbench) &&
    /align-content:\s*start/.test(workbench) &&
    !/flex:\s*1\s+1\s+auto/.test(workbench),
  "the 768–1199px parent workbench must not fill the remaining viewport"
);
check(
  "grid children align to their own content",
  /align-items:\s*start/.test(workbench) && /align-self:\s*start/.test(listPane) && /align-self:\s*start/.test(inspector),
  "list and inspector must not stretch to the taller sibling"
);
check(
  "both tablet panes own long-content scrolling",
  /max-height:\s*calc\(100dvh\s*-\s*153px\)/.test(listPane) &&
    /overflow-y:\s*auto/.test(listPane) &&
    /max-height:\s*calc\(100dvh\s*-\s*153px\)/.test(inspector) &&
    /overflow-y:\s*auto/.test(inspector),
  "long evidence must scroll inside its owner instead of making the parent a blank filler"
);
check(
  "compact two-layer fallback remains explicit",
  /COMPACT_TASK_QUERY/.test(component) &&
    /@media \(min-width: 600px\) and \(max-width: 767px\)/.test(css) &&
    /768–1199/.test(capability) &&
    /600–767/.test(capability),
  "600–767px must retain the compact fallback while 768–1199px owns master/detail"
);
check(
  "no count-driven or decorative filler workaround",
  !/short-stack|visibleRows\.length\s*(?:<=|>=|===|!==)/.test(component + css) &&
    !/filler|装饰时间线|重复指标/.test(component + css),
  "do not restore count-driven stacking or fill empty space with repeated content"
);
if (fs.existsSync(runtimePath)) {
  const runtime = JSON.parse(fs.readFileSync(runtimePath, "utf8"));
  const names = new Set((runtime.screenshots || []).map((item) => typeof item === "string" ? item : item.name));
  check(
    "runtime artifact binds both tablet screenshots",
    names.has("tablet-network-768.png") && names.has("tablet-network-844.png"),
    "current runtime evidence must include 768px and 844px tablet workbench screenshots"
  );
} else {
  check("runtime report exists", false, "missing current production runtime report");
}

if (failures.length) {
  console.error(JSON.stringify({ pass: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ pass: true, checks: 6, contract: "tablet-workspace-composition-v1" }, null, 2));
