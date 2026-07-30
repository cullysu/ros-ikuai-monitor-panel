#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const workspacePath = path.join(root, "src", "panel-framework", "mobile", "MobileDomainWorkspace.tsx");
const runtimePath = path.join(root, "_acceptance", "panel-runtime-browser", "report.json");
const workspace = fs.readFileSync(workspacePath, "utf8");
const runtime = fs.existsSync(runtimePath)
  ? JSON.parse(fs.readFileSync(runtimePath, "utf8"))
  : null;
const failures = [];
const checks = [];

function check(name, pass, detail = "") {
  checks.push({ name, pass: Boolean(pass), detail });
  if (!pass) failures.push({ name, detail });
}

check(
  "tablet risk-focus contract declares v1",
  workspace.includes('data-tablet-risk-focus="v1"'),
  "the tablet workspace must declare the risk-focus contract",
);
check(
  "risk context derives preview from matching risk objects",
  workspace.includes("selectSemanticWorkspacePreview(matchingRows)"),
  "risk preview must be selected from rowMatchesRisk results, not from the whole route",
);
check(
  "risk preview is explicitly marked as the selected risk object",
  workspace.includes('data-tablet-task-focus={preview && risk ? "selected-risk-object" : undefined}'),
  "the inspector/list relationship must expose the current risk focus",
);
check(
  "risk preview keeps a tablet master-detail relationship",
  workspace.includes('data-tablet-task-space={tabletWorkbench && risk ? "master-detail" : undefined}') &&
    workspace.includes('data-tablet-risk-object-id={preview && risk ? preview.row.id : undefined}'),
  "risk context must preserve an explicit object id and master-detail task space",
);
check(
  "risk focus has no arbitrary first-row fallback",
  !/matchingRows\s*\[\s*0\s*\]/.test(workspace) &&
    !/rows\s*\[\s*0\s*\]/.test(workspace),
  "risk focus must use a semantic object rule rather than an array-position fallback",
);
check(
  "fresh tablet risk evidence is registered",
  Boolean(runtime?.pass === true && runtime?.screenshots?.includes("tablet-interface-investigation-context-844.png")),
  runtime ? `pass=${runtime.pass}` : "missing runtime report",
);

const report = {
  pass: failures.length === 0,
  contract: "tablet-risk-focus-v1",
  releaseEligible: false,
  failures,
  checks,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;

