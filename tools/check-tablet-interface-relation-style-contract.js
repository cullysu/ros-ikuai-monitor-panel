#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const componentPath = path.join(root, "src", "panel-framework", "mobile", "MobileTabletInterfaceRelations.tsx");
const stylePath = path.join(root, "src", "panel-framework", "mobile", "mobile-tablet-interface-relations.css");
const runtimePath = path.join(root, "tools", "check-tablet-interface-relations-runtime.js");
const reportPath = path.join(root, "_acceptance", "tablet-interface-relation-runtime", "report.json");

const component = fs.readFileSync(componentPath, "utf8");
const style = fs.existsSync(stylePath) ? fs.readFileSync(stylePath, "utf8") : "";
const runtime = fs.readFileSync(runtimePath, "utf8");
const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, "utf8")) : null;
const failures = [];

if (!component.includes('import "./mobile-tablet-interface-relations.css"')) {
  failures.push("relation component must load its dedicated stylesheet");
}
if (!fs.existsSync(stylePath)) {
  failures.push("dedicated relation stylesheet must exist");
}
for (const selector of [
  ".mdw-tablet-interface-relations",
]) {
  if (!style.includes(selector)) failures.push(`stylesheet must own ${selector}`);
}
if (!/data-tablet-interface-relations/.test(component)) {
  failures.push("relation surface must retain a semantic landmark");
}
if (!/defaultRouteRelation|defaultRoutes|gateway|distance/.test(component)) {
  failures.push("relation surface must retain route evidence fields");
}
if (!/待核对|未记录/.test(component)) {
  failures.push("missing route evidence must remain explicit");
}
if (!runtime.includes("for (const width of [768, 844])") || !runtime.includes("outputFor(width)")) {
  failures.push("runtime contract must capture both 768px and 844px relation screenshots");
}
for (const width of [768, 844]) {
  const artifact = report?.screenshots?.some((item) =>
    path.basename(typeof item === "string" ? item : item?.name || "") === `tablet-interface-relations-${width}.png`,
  );
  if (!artifact) failures.push(`current report must bind the ${width}px relation screenshot`);
}

const result = {
  pass: failures.length === 0,
  contract: "tablet-interface-relation-style-v1",
  checks: 12,
  failures,
  files: [componentPath, stylePath, runtimePath, reportPath],
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
