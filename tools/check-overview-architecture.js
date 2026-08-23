"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const child = spawnSync(process.execPath, [path.join(__dirname, "check-mobile-reference-architecture.js")], {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, CODEX_MEMORY_LIMIT_MB: "2048", NODE_OPTIONS: "--max-old-space-size=2048" },
});
if (child.stdout) process.stdout.write(child.stdout);
if (child.stderr) process.stderr.write(child.stderr);
if (child.status !== 0) process.exit(child.status || 1);

const overviewPath = path.join(root, "src", "panel-framework", "overview", "OverviewPanel.tsx");
const overviewSource = fs.readFileSync(overviewPath, "utf8");
const desktopEntryPath = path.join(root, "src", "panel-framework", "overview", "desktop-overview", "DesktopOverviewScreen.tsx");
const desktopOwnerPath = path.join(root, "src", "panel-framework", "overview", "desktop-overview", "LegacyDesktopOverview.tsx");
const desktopEntrySource = fs.readFileSync(desktopEntryPath, "utf8");
const desktopOwnerSource = fs.readFileSync(desktopOwnerPath, "utf8");
const failures = [];
if (!/DesktopOverviewScreen/.test(overviewSource)) failures.push("OverviewPanel does not preserve the independent 192.168.3.5 desktop entry");
if (/MobileInspection|mobile-inspection-ui|data-mobile-inspection/.test(overviewSource)) failures.push("OverviewPanel is coupled to the independent mobile owner");
if (!/import \{ LegacyDesktopOverview \} from "\.\/LegacyDesktopOverview"/.test(desktopEntrySource) || !/return <LegacyDesktopOverview \{\.\.\.props\} \/>/.test(desktopEntrySource)) {
  failures.push("DesktopOverviewScreen is not a thin delegate to the accepted 192.168.3.5 desktop owner");
}
if (!/data-visual-grammar="ikuai-4-ipad"/.test(desktopOwnerSource) || !/data-overview-task-contract="legacy-desktop-task-v1"/.test(desktopOwnerSource)) {
  failures.push("LegacyDesktopOverview does not declare the accepted iKuai 4.0 iPad visual/task contract");
}
if (/DesktopLedger|DesktopOverviewTask|DesktopIncidentDocket|DesktopWanEvidence|DesktopResourceEvidence/.test(desktopEntrySource + desktopOwnerSource)) {
  failures.push("accepted desktop ownership still references a rejected later presentation owner");
}
if (failures.length) {
  console.error("overview architecture gate: FAIL");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("overview architecture gate: PASS");
console.log("Checked isolated Mobile Inspection ownership and independent legacy iPad desktop composition.");
