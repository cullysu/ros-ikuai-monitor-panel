const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const reportPath = path.join(root, "_acceptance", "panel-runtime-browser", "report.json");
const report = fs.existsSync(reportPath)
  ? JSON.parse(fs.readFileSync(reportPath, "utf8"))
  : null;
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const namedCheck = (name) => report?.checks?.find((check) => check.name === name) || null;
const boundaryCheck = namedCheck("capability boundaries keep a single task grammar and do not create a 1365/1366 product cliff");
const historyCheck = namedCheck("selected object and Back/Forward stay continuous across the 1199/1200 surface transition");
const boundary = boundaryCheck?.detail || {};
const desktop = ["boundary1200", "boundary1365", "boundary1366", "boundary1440"].map((key) => boundary[key]);
const desktopLabels = desktop.map((item) => item?.navLabels?.join("|") || "");
const requiredScreenshots = ["desktop-continuity-1365.png", "desktop-continuity-1366.png", "desktop-continuity-1440.png"];

expect(Boolean(report), "current panel runtime report is missing");
expect(report?.pass === true, "current panel runtime report is not green");
expect(boundaryCheck?.pass === true, "named 1365/1366 no-cliff runtime check is missing or red");
expect(historyCheck?.pass === true, "1199/1200 selected-object Back/Forward continuity check is missing or red");
expect(desktop.every((item) => item?.desktop === true && item?.mobile === false && item?.rail === "grid"), "desktop boundary cells do not share one desktop task surface");
expect(new Set(desktopLabels).size === 1 && desktopLabels[0], "desktop boundary cells do not share one navigation vocabulary");
expect(desktop.every((item) => Number(item?.overflow) <= 1), "a desktop boundary cell has horizontal overflow");
for (const screenshot of requiredScreenshots) {
  expect(fs.existsSync(path.join(root, "_acceptance", "panel-runtime-browser", screenshot)), `required boundary screenshot is missing: ${screenshot}`);
}

const result = {
  pass: failures.length === 0,
  contract: "responsive-1365-1366-boundary-v1",
  reportPath: path.relative(root, reportPath),
  failures,
  checks: {
    report: Boolean(report) && report.pass === true,
    noCliff: boundaryCheck?.pass === true,
    historyContinuity: historyCheck?.pass === true,
    sharedDesktopSurface: desktop.every((item) => item?.desktop === true && item?.mobile === false && item?.rail === "grid"),
    sharedNavigation: new Set(desktopLabels).size === 1 && Boolean(desktopLabels[0]),
    noOverflow: desktop.every((item) => Number(item?.overflow) <= 1),
    screenshots: requiredScreenshots.every((screenshot) => fs.existsSync(path.join(root, "_acceptance", "panel-runtime-browser", screenshot))),
  },
};

console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
