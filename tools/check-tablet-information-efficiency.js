const fs = require("node:fs");
const path = require("node:path");
const { readRuntimeReport, runtimeIdentityDetail } = require("./runtime-report-identity");

const ROOT = path.resolve(__dirname, "..");
const runtimeBinding = readRuntimeReport(ROOT);
const reportPath = runtimeBinding.reportPath;
const report = runtimeBinding.current ? runtimeBinding.report : null;

const checks = [];
const requireCheck = (name, pass, detail) => {
  checks.push({ name, pass: Boolean(pass), detail });
};

requireCheck("production browser report belongs to the current worktree artifact", runtimeBinding.current, {
  ...runtimeIdentityDetail(runtimeBinding),
});
requireCheck("current production browser report is green", report?.pass === true, {
  reportPath: path.relative(ROOT, reportPath).replaceAll("\\", "/"),
  runtimeIdentity: runtimeIdentityDetail(runtimeBinding),
  reportPass: report?.pass ?? null,
});

const runtimeChecks = new Map(
  (report?.checks ?? []).map((check) => [check.name, check]),
);
const screenshotNames = new Set(report?.screenshots ?? []);
const requiredScreenshots = [
  "tablet-overview-master-detail-768.png",
  "tablet-overview-master-detail-844.png",
  "tablet-interface-review-844.png",
];

requireCheck(
  "768 and 844 tablet evidence screenshots are registered",
  requiredScreenshots.every((name) => screenshotNames.has(name)),
  { requiredScreenshots, registered: requiredScreenshots.filter((name) => screenshotNames.has(name)) },
);

const tabletWorkspaceChecks = [
  "768px tablet domain workspace exposes a split object task with semantic preview",
  "844px tablet keeps the object list visible beside selected evidence",
];
for (const name of tabletWorkspaceChecks) {
  const entry = runtimeChecks.get(name);
  const detail = entry?.detail ?? null;
  requireCheck(`${name} remains a current runtime contract`, entry?.pass === true, {
    present: Boolean(entry),
    pass: entry?.pass ?? null,
    viewport: detail?.viewport ?? null,
    mode: detail?.mode ?? null,
    selectedRows: detail?.selectedRows ?? null,
    overflow: detail?.overflow ?? null,
  });
}

const shortListEntry = runtimeChecks.get(
  "tablet short-list information efficiency keeps a distinct task surface",
);
const shortListDetail = shortListEntry?.detail ?? null;
requireCheck(
  "short tablet lists have a semantic contract instead of visual filler",
  shortListEntry?.pass === true &&
    shortListDetail?.shortList === true &&
    Number(shortListDetail?.novelEvidenceCount) > 0 &&
    (shortListDetail?.relatedObjectSurface === true || shortListDetail?.nextStepSurface === true) &&
    shortListDetail?.duplicateOverviewMetrics === false,
  {
    present: Boolean(shortListEntry),
    pass: shortListEntry?.pass ?? null,
    detail: shortListDetail,
  },
);

const selectedContextEntry = runtimeChecks.get(
  "844px tablet keeps object identity and evidence context sticky, scrolling only when content overflows",
);
requireCheck(
  "selected tablet context remains bounded and independently scrollable",
  selectedContextEntry?.pass === true &&
    Number(selectedContextEntry?.detail?.scrollRange) >= 0 &&
    Number(selectedContextEntry?.detail?.header?.bottom) > Number(selectedContextEntry?.detail?.header?.top),
  {
    present: Boolean(selectedContextEntry),
    pass: selectedContextEntry?.pass ?? null,
    detail: selectedContextEntry?.detail ?? null,
  },
);

const failed = checks.filter((check) => !check.pass).map((check) => check.name);
const result = {
  pass: failed.length === 0,
  contract: "tablet-information-efficiency-v1",
  reportPath: path.relative(ROOT, reportPath).replaceAll("\\", "/"),
  checks,
  failed,
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
