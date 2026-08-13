#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "src", "panel-framework", "timeContract.ts");
const resourceHistoryPath = path.join(root, "src", "panel-framework", "overview", "evidence-model", "resourceHistorySamples.ts");
const incidentLensRoot = path.join(root, "src", "panel-framework", "overview", "mobile-overview", "incident-lens");
const mobileTimeEvidencePath = path.join(incidentLensRoot, "IncidentLens.tsx");
const mobileTimeModelPath = path.join(incidentLensRoot, "buildIncidentLensModel.ts");
const mobileTimeSupportPath = path.join(incidentLensRoot, "types.ts");
const mobileCollectionPath = mobileTimeModelPath;
const desktopTimeEvidencePath = path.join(root, "src", "panel-framework", "overview", "desktop-overview", "DesktopWanEvidence.tsx");
const sectionTimeSeriesPath = path.join(root, "src", "panel-framework", "sections", "SectionTimeSeriesChart.tsx");
const sectionModelsPath = path.join(root, "src", "panel-framework", "sections", "sectionModels.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const mobileTimeEvidenceSource = fs.readFileSync(mobileTimeEvidencePath, "utf8");
const mobileTimeModelSource = fs.readFileSync(mobileTimeModelPath, "utf8");
const mobileTimeSupportSource = fs.readFileSync(mobileTimeSupportPath, "utf8");
const mobileCollectionSource = fs.readFileSync(mobileCollectionPath, "utf8");
const desktopTimeEvidenceSource = fs.readFileSync(desktopTimeEvidencePath, "utf8");
const sectionTimeSeriesSource = fs.readFileSync(sectionTimeSeriesPath, "utf8");
const sectionModelsSource = fs.readFileSync(sectionModelsPath, "utf8");

function loadTypeScript(module, filename) {
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  });
  module._compile(compiled.outputText, filename);
}

require.extensions[".ts"] = loadTypeScript;
const { formatRfc3339Local, formatRfc3339LocalTime, isRfc3339Timestamp, parseRfc3339Timestamp } = require(sourcePath);
const { resourceHistoryPoints } = require(resourceHistoryPath);

const accepted = ["2026-08-09T12:34:56Z", "2026-08-09T20:34:56+08:00", "2024-02-29T00:00:00.123456789Z"];
const rejected = ["2026-08-09 12:34:56", "2026-08-09T12:34:56", "0000-01-01T00:00:00Z", "2026-02-29T00:00:00Z", "2026-08-09T24:00:00Z"];
for (const value of accepted) assert.equal(isRfc3339Timestamp(value), true, `${value} must be accepted`);
for (const value of rejected) {
  assert.equal(isRfc3339Timestamp(value), false, `${value} must be rejected`);
  assert.equal(parseRfc3339Timestamp(value), null, `${value} must not produce an epoch`);
  assert.equal(formatRfc3339Local(value), null, `${value} must not produce a local evidence time`);
  assert.equal(formatRfc3339LocalTime(value), null, `${value} must not produce a local axis time`);
}
assert.equal(parseRfc3339Timestamp("2026-08-09T20:34:56+08:00"), Date.UTC(2026, 7, 9, 12, 34, 56), "explicit offsets must resolve deterministically");
assert.equal(parseRfc3339Timestamp("2024-02-29T00:00:00.123456789Z"), Date.UTC(2024, 1, 29, 0, 0, 0, 123), "fractions must truncate deterministically to JavaScript precision");
assert.doesNotMatch(source, /Date\.parse/, "the public time parser must not delegate timezone interpretation to Date.parse");
assert.equal(isRfc3339Timestamp("2026-08-09T20:34:56+08:00"), true, "log observedAt must be a timezone-qualified RFC3339 timestamp");
assert.equal(isRfc3339Timestamp("12:34:56"), false, "timezone-less log time must not become public observation evidence");
assert.match(sectionModelsSource, /time: text\(item\.observedAt\)/, "log sections must render qualified observedAt evidence");
assert.doesNotMatch(sectionModelsSource, /time: text\(item\.time\)/, "log sections must not render legacy timezone-less time fields");
assert.doesNotMatch(mobileTimeEvidenceSource + mobileTimeModelSource, /(?:Date\.parse|new Date|Intl\.DateTimeFormat)/, "mobile evidence must not parse or reinterpret timestamps outside the shared RFC3339 contract");
assert.match(mobileTimeModelSource, /observedAt:\s*evidence\.evidenceAt/, "mobile evidence boundary must preserve the qualified observation timestamp from the shared evidence model");
assert.match(mobileTimeSupportSource, /observedAt:\s*string\s*\|\s*null/, "mobile command evidence must keep the qualified observation timestamp typed through the render boundary");
assert.match(mobileTimeEvidenceSource, /data-incident-lens-evidence-boundary[\s\S]{0,500}model\.command\.time/, "mobile evidence boundary must render the command time from the typed evidence model");
assert.match(mobileCollectionSource, /rest\.successAt\s*\|\|\s*"最近成功未记录"/, "mobile collection evidence must retain REST's qualified last-success timestamp without inventing a local clock");
assert.match(mobileCollectionSource, /ssh\.successAt\s*\|\|\s*"最近成功未记录"/, "mobile collection evidence must retain SSH's qualified last-success timestamp without inventing a local clock");
assert.match(mobileTimeModelSource, /currentTrafficFacts[\s\S]{0,180}evidence\.evidenceMode\s*!==\s*"current"/, "mobile current-rate measurements must require current evidence before they render");
assert.match(desktopTimeEvidenceSource, /function pathFor\([\s\S]*?timeSeriesPointX\(point\.timestamp, startTime, endTime/, "desktop WAN chart x coordinates must derive from observed sample timestamps");
assert.doesNotMatch(desktopTimeEvidenceSource, /index\s*\/\s*\(points\.length\s*-\s*1\)/, "desktop WAN chart must not pretend irregular samples are evenly spaced");
assert.match(desktopTimeEvidenceSource, /preserveAspectRatio="xMidYMid meet"/, "desktop WAN chart must preserve its aspect ratio instead of stretching evidence");
assert.match(desktopTimeEvidenceSource, /role="img"[\s\S]*?aria-labelledby=\{`\$\{titleId\} \$\{descId\}`\}/, "desktop WAN chart must expose a truthful accessible summary");
assert.match(sectionTimeSeriesSource, /timeSeriesPointX\(point\.timestamp, start, end/, "section time-series x coordinates must derive from observed sample timestamps");
assert.match(sectionTimeSeriesSource, /preserveAspectRatio="xMidYMid meet"/, "section time-series must preserve its aspect ratio");
assert.match(sectionTimeSeriesSource, /data-section-threshold=\{item\.threshold\}/, "resource time-series must render configured thresholds as explicit reference lines");
assert.deepEqual(
  resourceHistoryPoints({
    resourceSamples: [{
      timestamp: "2026-08-09T12:34:56Z",
      cpu: 20,
      memory: 30,
      disk: 40,
      source: "routeros-resource",
      evidenceMode: "current",
    }],
  }),
  [{ timestamp: Date.UTC(2026, 7, 9, 12, 34, 56), cpu: 20, memory: 30, disk: 40 }],
  "resource trends must consume atomic RFC3339 evidence samples",
);
assert.deepEqual(
  resourceHistoryPoints({
    resourceSamples: [{
      timestamp: "2026-08-09T12:34:56",
      cpu: 20,
      memory: 30,
      disk: 40,
      source: "routeros-resource",
      evidenceMode: "current",
    }],
  }),
  [],
  "resource trends must reject timezone-less sample timestamps",
);
assert.deepEqual(
  resourceHistoryPoints({
    timestamps: ["2026-08-09T12:34:56Z"],
    cpu: [20],
    memory: [30],
    disk: [40],
  }),
  [],
  "resource trends must not reconstruct evidence from parallel arrays",
);

const localTimeProbe = `
  const fs = require("node:fs");
  const ts = require("typescript");
  require.extensions[".ts"] = (module, filename) => {
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
      fileName: filename,
    });
    module._compile(compiled.outputText, filename);
  };
  const { formatRfc3339Local, formatRfc3339LocalTime } = require(process.argv[1]);
  const values = ["2026-03-08T06:30:00Z", "2026-03-08T02:30:00-05:00", "2026-11-01T06:30:00Z"];
  console.log(JSON.stringify(values.map((value) => ({ value, evidence: formatRfc3339Local(value), axis: formatRfc3339LocalTime(value) }))));
`;
const clientLocalSamples = JSON.parse(execFileSync(process.execPath, ["-e", localTimeProbe, sourcePath], {
  encoding: "utf8",
  env: { ...process.env, TZ: "America/New_York" },
}));
assert.deepEqual(clientLocalSamples, [
  { value: "2026-03-08T06:30:00Z", evidence: "2026-03-08 01:30:00 -05:00", axis: "01:30:00" },
  { value: "2026-03-08T02:30:00-05:00", evidence: "2026-03-08 03:30:00 -04:00", axis: "03:30:00" },
  { value: "2026-11-01T06:30:00Z", evidence: "2026-11-01 01:30:00 -05:00", axis: "01:30:00" },
], "RFC3339 evidence and axis time must use the same client timezone across offsets and DST");

console.log(JSON.stringify({
  pass: true,
  contract: "public-rfc3339-time-v2",
  accepted,
  rejected,
  clientLocalSamples,
  mobileEvidenceUsesSharedTimeContract: true,
  chartEvidenceUsesAtomicTimeContract: true,
}, null, 2));
