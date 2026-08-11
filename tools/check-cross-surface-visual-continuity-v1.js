const path = require("node:path");
const { readRuntimeReport, runtimeIdentityDetail } = require("./runtime-report-identity");

const root = path.resolve(__dirname, "..");
const runtimeBinding = readRuntimeReport(root);
const requireRuntime = process.argv.includes("--require-current-runtime");
const runtimeSkipped = !runtimeBinding.current && !requireRuntime;
const report = runtimeBinding.current ? runtimeBinding.report : null;
const target = (report?.checks || []).find((item) =>
  item?.detail?.normal1199?.surface === "mobile" &&
  item?.detail?.normal1200?.surface === "desktop" &&
  item.detail.normal1199.verdictRect &&
  item.detail.normal1200.verdictRect &&
  Array.isArray(item.detail.normal1199.landmarks) &&
  Array.isArray(item.detail.normal1200.landmarks));
const detail = target?.detail || {};
const normal1199 = detail.normal1199 || {};
const normal1200 = detail.normal1200 || {};
const failures = [];
const checks = {
  runtimeIdentityCurrentWhenRequired: !requireRuntime || runtimeBinding.current,
};

if (!checks.runtimeIdentityCurrentWhenRequired) failures.push("current-runtime-identity-required");
checks.runtimeSurfaceEvidence = runtimeSkipped || (Boolean(normal1199.surface) && Boolean(normal1200.surface));
if (!checks.runtimeSurfaceEvidence) failures.push("missing fresh 1199/1200 runtime surface evidence");

const mobileVerdictHeight = normal1199.verdictRect?.height || 0;
const desktopVerdictHeight = normal1200.verdictRect?.height || 0;
checks.visibleVerdictGeometry = runtimeSkipped || (Boolean(mobileVerdictHeight) && Boolean(desktopVerdictHeight));
if (!checks.visibleVerdictGeometry) failures.push("missing visible verdict geometry at 1199/1200");
checks.verdictHeightContinuity = runtimeSkipped || Math.abs(mobileVerdictHeight - desktopVerdictHeight) <= 32;
if (!checks.verdictHeightContinuity) failures.push(`verdict height jumps from ${mobileVerdictHeight}px to ${desktopVerdictHeight}px`);

const sharedTaskLandmarks = ["focus", "freshness", "investigation", "signal", "verdict"];
const sharedLandmarks = (landmarks) => sharedTaskLandmarks.filter((landmark) => (landmarks || []).includes(landmark));
const mobileSharedLandmarks = sharedLandmarks(normal1199.landmarks);
const desktopSharedLandmarks = sharedLandmarks(normal1200.landmarks);
checks.sharedTaskLandmarkOrder = runtimeSkipped || mobileSharedLandmarks.join(String.fromCharCode(62)) === desktopSharedLandmarks.join(String.fromCharCode(62));
if (!checks.sharedTaskLandmarkOrder) failures.push("shared task landmark order changes at 1199/1200");

const result = {
  pass: failures.length === 0,
  expectedRed: failures.length > 0,
  contract: "cross-surface-visual-continuity-v1",
  implementationState: failures.length ? "expected-red" : runtimeBinding.current ? "focused-runtime-green" : "runtime-pending",
  policy: "mobile-and-desktop-render-trees-remain-independent; compare visible task rhythm only",
  runtimeEvidence: runtimeIdentityDetail(runtimeBinding),
  checks,
  observed: {
    normal1199: { surface: normal1199.surface || null, toolbar: normal1199.runtimeToolbar || null, desktopShell: Boolean(normal1199.desktopShellRect), verdictHeight: mobileVerdictHeight, landmarks: normal1199.landmarks || [], sharedLandmarks: mobileSharedLandmarks },
    normal1200: { surface: normal1200.surface || null, toolbar: normal1200.runtimeToolbar || null, desktopShell: Boolean(normal1200.desktopShellRect), verdictHeight: desktopVerdictHeight, landmarks: normal1200.landmarks || [], sharedLandmarks: desktopSharedLandmarks },
  },
  failures,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
