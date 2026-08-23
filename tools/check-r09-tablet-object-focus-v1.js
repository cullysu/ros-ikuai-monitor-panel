#!/usr/bin/env node
"use strict";

/**
 * R09 write-ahead product/design contract.
 *
 * This deliberately measures the normal 768px tablet patrol surface, rather
 * than counting DOM nodes or forcing a screenshot-specific selector. The
 * current product review says that the first object-comparison decision is
 * still too low in the vertical task sequence. The contract is expected-red
 * until the task owner is moved earlier without deleting evidence.
 */
const fs = require("node:fs");
const path = require("node:path");
const { readRuntimeReport, runtimeIdentityDetail } = require("./runtime-report-identity");

const ROOT = path.resolve(__dirname, "..");
const runtimeBinding = readRuntimeReport(ROOT);
const REPORT_PATH = runtimeBinding.reportPath;
const report = runtimeBinding.current ? runtimeBinding.report : null;

const runtime = new Map((report?.checks || []).map((entry) => [entry.name, entry]));
const geometry = runtime.get(
  "tablet normal orders route/WAN, object comparison, follow-up tasks, then relation/evidence",
)?.detail || null;

const viewportHeight = 1024;
const maximumObjectStartRatio = 0.72;
const objectStart = Number(geometry?.objectWorkspace?.top);
const objectStartRatio = objectStart / viewportHeight;
const objectWorkspace = geometry?.objectWorkspace || null;

const checks = [
  {
    name: "runtime report belongs to the current worktree artifact",
    pass: runtimeBinding.current,
    detail: runtimeIdentityDetail(runtimeBinding),
  },
  {
    name: "current 768px normal tablet geometry exists",
    pass: Boolean(report?.pass === true && geometry && objectWorkspace),
    detail: { reportPass: report?.pass ?? null, objectWorkspace },
  },
  {
    name: "normal tablet object comparison begins within the first 72 percent of the patrol viewport",
    pass: Number.isFinite(objectStartRatio) && objectStartRatio <= maximumObjectStartRatio,
    detail: {
      objectStart,
      viewportHeight,
      objectStartRatio,
      maximumObjectStartRatio,
    },
  },
  {
    name: "normal tablet keeps relation evidence after the object workspace",
    pass: Number(geometry?.relation?.top) >= Number(objectWorkspace?.bottom),
    detail: {
      objectBottom: objectWorkspace?.bottom ?? null,
      relationTop: geometry?.relation?.top ?? null,
    },
  },
  {
    name: "normal tablet keeps the evidence boundary after relation evidence",
    pass: Number(geometry?.evidence?.top) >= Number(geometry?.relation?.bottom),
    detail: {
      relationBottom: geometry?.relation?.bottom ?? null,
      evidenceTop: geometry?.evidence?.top ?? null,
    },
  },
  {
    name: "contract does not authorize filler, duplicate metrics, or unreadable text as the fix",
    pass: true,
    detail: "The intended fix is task ordering/ownership; no min-height filler, repeated metrics, or smaller type is accepted.",
  },
];

const failed = checks.filter((entry) => !entry.pass).map((entry) => entry.name);
const result = {
  pass: failed.length === 0,
  contract: "r09-tablet-object-focus-v1",
  status: failed.length === 0 ? "focused-green" : "expected-red",
  expectedRedBeforeImplementation: true,
  releaseEligible: false,
  reportPath: path.relative(ROOT, REPORT_PATH).replaceAll("\\", "/"),
  runtimeIdentity: runtimeIdentityDetail(runtimeBinding),
  checks,
  failed,
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
