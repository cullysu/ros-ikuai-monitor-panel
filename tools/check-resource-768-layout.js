const fs = require("node:fs");
const path = require("node:path");

const file = path.resolve(__dirname, "../src/panel-framework/mobile/mobile-domain.css");
const source = fs.readFileSync(file, "utf8");
const workbenchStart = source.indexOf("@media (min-width: 768px) and (max-width: 1199px)");
const nextMedia = source.indexOf("@media (prefers-reduced-motion", workbenchStart);
const band = workbenchStart >= 0 && nextMedia > workbenchStart ? source.slice(workbenchStart, nextMedia) : "";

const checks = [
  ["768-1199px workbench band found", band.length > 0],
  ["resource preview and selection share the workbench owner", band.includes(".mdw-shell.is-tablet-workbench .mdw-layout")],
  ["resource workbench keeps two bounded columns", band.includes("grid-template-columns: minmax(268px") && band.includes("minmax(420px")],
  ["narrow resource stack override is removed", !/@media \(min-width: 768px\) and \(max-width: 799px\)[\s\S]{0,1800}trafficLoad[\s\S]{0,700}display:\s*flex[\s\S]{0,220}flex-direction:\s*column/.test(source)],
  ["selection-only resource rule is removed", !source.includes(".is-resource.is-tablet-workbench.has-selection .mdw-layout")],
];

const failed = checks.filter(([, pass]) => !pass);
for (const [name, pass] of checks) console.log((pass ? "PASS " : "FAIL ") + name);
if (failed.length) {
  console.error("resource tablet layout contract: FAIL " + failed.length + "/" + checks.length);
  process.exit(1);
}
console.log("resource tablet layout contract: PASS " + checks.length + "/" + checks.length);
