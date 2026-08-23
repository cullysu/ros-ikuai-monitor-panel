"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const surface = read("src/panel-framework/responsive/panelSurface.ts");
const boundary = read("tools/check-responsive-boundary-contract.js");
const toolbar = read("tools/check-browser-toolbar-zoom200.js");
const lowLoad = read("tools/run-low-load.py");

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(surface.includes('MOBILE_PANEL_QUERY = "(max-width: 1199px) and (orientation: portrait), (max-width: 599px)"'), "mobile owner must be portrait-bounded plus narrow-phone fallback");
expect(!surface.includes('MOBILE_PANEL_QUERY = "(max-width: 1199px)"'), "mobile owner must not claim every sub-1200 landscape viewport");
expect(boundary.includes('id: "landscape667", width: 667, height: 375, owner: "desktop"'), "667px landscape boundary must use desktop owner");
expect(boundary.includes('id: "landscape844", width: 844, height: 390, owner: "desktop"'), "844px landscape boundary must use desktop owner");
expect(toolbar.includes("const DESKTOP_ORIGIN_OWNER"), "Edge 200% verifier must have a desktop landscape owner");
expect(toolbar.includes('browserSurface === "desktop"'), "Edge 200% verifier must select owner by viewport surface");
expect(lowLoad.includes('env.setdefault("CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS", "90000")'), "low-load launcher must preserve caller browser timeout overrides");

const report = { pass: failures.length === 0, contract: "responsive-surface-policy-v1", failures };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.pass) process.exitCode = 1;
