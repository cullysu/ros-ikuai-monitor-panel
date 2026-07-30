const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const desktop = read("src/panel-framework/overview/desktop-overview/DesktopOverviewTask.tsx");
const mobile = read("src/panel-framework/mobile/MobilePatrolActions.tsx");

const checks = {
  desktopDeclaresActionPriority: /data-desktop-action-priority=\{action\.priority\}/.test(desktop),
  desktopPrimaryMapsToNextVisualLevel: /data-overview-visual-level=\{action\.priority\s*===\s*"primary"\s*\?\s*"next"\s*:\s*"context"\}/.test(desktop),
  desktopSecondaryMapsToContext: /action\.priority\s*===\s*"primary"\s*\?\s*"next"\s*:\s*"context"/.test(desktop),
  desktopDoesNotHardcodeAllActionsAsContext: !/<button\b[^>]*data-overview-visual-level="context"/.test(desktop),
  mobilePrimaryHasNextVisualLevel: /data-overview-visual-level=\{action\.priority\s*===\s*"primary"\s*\?\s*"next"\s*:\s*"context"\}/.test(mobile),
};

const failed = Object.entries(checks)
  .filter(([, pass]) => !pass)
  .map(([name]) => name);

const report = {
  pass: failed.length === 0,
  contract: "cross-surface-action-visual-level-v1",
  checks,
  failed,
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failed.length) process.exitCode = 1;
