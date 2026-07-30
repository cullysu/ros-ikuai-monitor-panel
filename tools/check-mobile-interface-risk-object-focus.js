#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const workspacePath = path.join(root, "src", "panel-framework", "mobile", "MobileDomainWorkspace.tsx");
const focusPath = path.join(root, "src", "panel-framework", "mobile", "MobileInterfaceFocusContext.tsx");
const workspace = fs.readFileSync(workspacePath, "utf8");
const focus = fs.readFileSync(focusPath, "utf8");
const failures = [];

function check(name, condition, detail) {
  if (!condition) failures.push({ name, detail });
}

check(
  "interface risk rows are derived before rendering",
  /const matchingRows = risk \? allRows\.filter\(\(row\) => rowMatchesRisk\(risk, row\)\) : \[\];/.test(workspace),
  "the route must keep one typed risk-matching subset as the source of the default risk object"
);
check(
  "phone interface focus receives the risk-matched subset",
  /<MobileInterfaceFocusContext[\s\S]*?rows=\{risk \? matchingRows : visibleRows\}/.test(workspace),
  "when risk context exists, the focus context must not fall back to every visible interface"
);
check(
  "focus context exposes a stable selected-object identity",
  /data-mobile-interface-focus-object=\{focusRow\.id\}/.test(focus)
    && /data-mobile-interface-focus-object-id=\{focusRow\.id\}/.test(focus),
  "runtime acceptance needs the selected interface object identity"
);
check(
  "unknown relation remains explicit",
  /data-mobile-interface-focus-state=\{directRows\.length === 1 \? "single" : directRows\.length > 1 \? "multiple" : "unknown"\}/.test(focus)
    && /当前对象未确认/.test(focus),
  "an unverified route relation must not become a guessed default object"
);

const report = {
  pass: failures.length === 0,
  contract: "mobile-interface-risk-object-focus-v1",
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(1);
