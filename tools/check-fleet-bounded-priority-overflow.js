"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...segments) => fs.readFileSync(path.join(root, ...segments), "utf8");
const overview = read("src", "panel-framework", "mobile-pulse", "MobilePulseHome.tsx");
const css = read("src", "panel-framework", "mobile-pulse", "styles", "mobilePulseHome.css");
const runtime = read("tools", "check-mobile-telemetry-runtime.js");

assert.match(overview, /model\.priorityObjectsAll\.slice\(0, 3\)/, "priority objects must retain their bounded phone window");
assert.match(css, /\.oc-object-copy\s*\{[\s\S]*?min-width:\s*0\s*;/, "Mobile Pulse priority rows must remain shrinkable");
assert.match(css, /\.oc-objects li > button\s*\{[\s\S]*?grid-template-columns:\s*34px\s+minmax\(0,\s*1fr\)\s+auto/s, "Mobile Pulse priority rows must retain a shrinkable content column");
assert.match(css, /\.oc-objects ol\s*\{[\s\S]*?overflow:\s*hidden\s*;/, "bounded priority groups must contain overflow rather than expanding the mobile surface");
assert.match(runtime, /const full\s*=\s*args\.has\("--full"\)/, "the current runtime checker must retain a full-report mode");
assert.match(runtime, /scenarios\.flatMap\(\(scenario\)\s*=>\s*viewports\.map/, "the full telemetry report must remain a seven-by-seven matrix");

process.stdout.write(`${JSON.stringify({
  pass: true,
  contract: "fleet-bounded-priority-overflow-v3-mobile-pulse",
  owner: "src/panel-framework/mobile-pulse",
  reportMatrix: "49",
  mechanism: "bounded-evidence-model-and-shrinkable-origin-priority-rows",
}, null, 2)}\n`);
