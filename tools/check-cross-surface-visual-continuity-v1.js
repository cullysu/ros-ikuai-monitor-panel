const fs = require("fs");
const path = require("path");
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const report = JSON.parse(read("_acceptance/panel-runtime-browser/report.json"));
const target = report.checks.find((item) => item.name === "1199/1200 normal Overview preserves the same evidence-first task landmarks");
const detail = target?.detail || {};
const normal1199 = detail.normal1199 || {};
const normal1200 = detail.normal1200 || {};
const failures = [];
if (!normal1199.surface || !normal1200.surface) failures.push("missing fresh 1199/1200 runtime surface evidence");
const mobileVerdictHeight = normal1199.verdictRect?.height || 0;
const desktopVerdictHeight = normal1200.verdictRect?.height || 0;
if (!mobileVerdictHeight || !desktopVerdictHeight) failures.push("missing visible verdict geometry at 1199/1200");
if (Math.abs(mobileVerdictHeight - desktopVerdictHeight) > 32) failures.push("verdict height jumps from " + mobileVerdictHeight + "px to " + desktopVerdictHeight + "px");
const sharedTaskLandmarks = ["focus", "freshness", "investigation", "signal", "verdict"];
const sharedLandmarks = (landmarks) => sharedTaskLandmarks.filter((landmark) => (landmarks || []).includes(landmark));
const mobileSharedLandmarks = sharedLandmarks(normal1199.landmarks);
const desktopSharedLandmarks = sharedLandmarks(normal1200.landmarks);
if (mobileSharedLandmarks.join(String.fromCharCode(62)) !== desktopSharedLandmarks.join(String.fromCharCode(62))) failures.push("shared task landmark order changes at 1199/1200");
const result = {
  pass: failures.length === 0,
  expectedRed: failures.length > 0,
  contract: "cross-surface-visual-continuity-v1",
  policy: "mobile-and-desktop-render-trees-remain-independent; compare visible task rhythm only",
  observed: {
    normal1199: {
      surface: normal1199.surface || null,
      toolbar: normal1199.runtimeToolbar || null,
      desktopShell: Boolean(normal1199.desktopShellRect),
      verdictHeight: mobileVerdictHeight,
      landmarks: normal1199.landmarks || [],
      sharedLandmarks: mobileSharedLandmarks,
    },
    normal1200: {
      surface: normal1200.surface || null,
      toolbar: normal1200.runtimeToolbar || null,
      desktopShell: Boolean(normal1200.desktopShellRect),
      verdictHeight: desktopVerdictHeight,
      landmarks: normal1200.landmarks || [],
      sharedLandmarks: desktopSharedLandmarks,
    },
  },
  failures,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
