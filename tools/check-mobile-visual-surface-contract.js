#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const owner = path.join(root, "src", "panel-framework", "mobile-reference-ui");
const failures = [];
const read = (...segments) => {
  const file = path.join(root, ...segments);
  if (!fs.existsSync(file)) { failures.push(`missing mobile reference surface: ${path.relative(root, file).replace(/\\/g, "/")}`); return ""; }
  return fs.readFileSync(file, "utf8");
};
const check = (condition, name, detail) => { if (!condition) failures.push(`${name}: ${detail}`); };
const every = (source, expressions) => expressions.every((expression) => expression.test(source));
const files = {
  surface: read("src", "panel-framework", "mobile-reference-ui", "MobileReferenceSurface.tsx"),
  connection: read("src", "panel-framework", "mobile-reference-ui", "MobileReferenceConnection.tsx"),
  styles: read("src", "panel-framework", "mobile-reference-ui", "mobile-reference.css"),
};
const presentation = Object.values(files).join("\n");
const retired = /MobileInspection|mobile-inspection-ui|data-mobile-inspection|MobileFlow|mobile-flow-ui|MobileNative|mobile-native-ui|MobileOps|mobile-ops-ui/;
const fontSizes = [...files.styles.matchAll(/font-size\s*:\s*([0-9]+(?:\.[0-9]+)?)px\b/gi)].map((match) => Number(match[1]));
check(fs.existsSync(owner), "owner", "mobile-reference-ui must be the sole active phone presentation owner");
for (const name of ["mobile-inspection-ui", "mobile-flow-ui", "mobile-native-ui", "mobile-ops-ui", "mobile-pulse-ui", "mobile-patrol"]) check(!fs.existsSync(path.join(root, "src", "panel-framework", name)), `retired-${name}`, "rejected mobile presentation must be physically absent");
check(every(files.surface, [/data-mobile-reference-home/, /data-mobile-reference-scene/, /ref-wan/, /ref-resources/, /ref-interfaces/, /TrafficChart/]), "scene ownership", "normal WAN, resource pressure, interface failure and evidence failure need distinct structures");
check(every(files.surface, [/preserveAspectRatio="xMidYMid meet"/, /ref-chart__down/, /ref-chart__up/, /traffic\.points/, /traffic\.unit/]), "traffic instrument", "dual traffic lines need units, time labels and proportional SVG geometry");
check(every(files.surface, [/evidenceMode === "current"/, /traffic/, /routeEvidence/]) && !/(?:rows|defaultRoutes)\s*\[\s*0\s*\]/.test(files.surface), "truth boundary", "historical and unavailable evidence must not become current values or arbitrary route fallbacks");
check(every(files.surface, [/data-mobile-reference-navigation/, /aria-current/, /概览/, /网络/, /设备/, /日志/]), "navigation", "four real task roots must expose selected state");
check(every(files.styles, [/repeat\(4/, /min-height:\s*(?:4[4-9]|[5-9][0-9])px/, /backdrop-filter/, /prefers-reduced-motion/, /prefers-reduced-transparency/, /forced-colors/]), "navigation material", "touch targets and preference fallbacks must be explicit");
check(every(files.surface, [/data-mobile-reference-workspace/, /ref-object-list/, /rows\.map/]), "object workspace", "phone-owned bounded route object inspection must be real");
check(every(files.connection, [/data-mobile-reference-connection/, /REST/, /SSH/, /TLS/]), "connection boundary", "REST and SSH identity evidence remain independent");
check(!retired.test(presentation), "retired markers", "active mobile presentation may not import rejected owners");
check(!/!important\b/i.test(files.styles) && !/transition\s*:\s*all(?:\s|,|;|$)|transition-property\s*:\s*all\b/i.test(files.styles), "css hygiene", "mobile styling must not depend on priority escape hatches");
check(fontSizes.length > 0 && Math.min(...fontSizes) >= 12, "type floor", "operational text must remain at least 12px");
check(/@media\s*\(max-width:\s*360px\)/.test(files.styles) && /orientation:\s*landscape/.test(files.styles) && /min-width:\s*600px/.test(files.styles) && /data-panel-large-text="true"/.test(files.styles), "adaptive ownership", "small phone, landscape, tablet and large-text layouts must reflow intentionally");
const entryCss = read("src", "panel-framework", "mobile", "mobile-entry.css");
check(/mobile-reference-ui/.test(entryCss) || /mobile-reference\.css/.test(files.surface), "shell", "mobile reference stylesheet must be loaded by the mobile owner");
if (failures.length) { console.error("mobile-reference-ui visual surface gate: FAIL"); failures.forEach((failure) => console.error(`- ${failure}`)); process.exit(1); }
console.log("mobile-reference-ui visual surface gate: PASS");
