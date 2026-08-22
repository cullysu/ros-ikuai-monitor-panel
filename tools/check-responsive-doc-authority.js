#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const has = (text, pattern) => pattern.test(text);

const currentPath = "docs/decision-system/responsive-capabilities.md";
const current = read(currentPath);
const mobileBaselinePath = "docs/mobile-reference-baseline.md";
const mobileBaseline = read(mobileBaselinePath);
const historicalIndex = read("docs/decision-system/historical-index.md");
const legacyPaths = [
  "docs/desktop-overview-redesign-directions.md",
  "docs/overview-framework-migration.md",
  "docs/overview-ikuai40-completion-audit.md",
];

const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });

check(
  "current-table-is-active",
  /^- status:\s*`active[^`]*`/m.test(current),
  currentPath,
);
check(
  "current-table-is-sole-direction",
  /This is the only current responsive direction\./.test(current),
  "current table must explicitly own the live direction",
);
check(
  "current-table-binds-boundary-continuity",
  /1199\/1200[\s\S]*1365\/1366/.test(current),
  "the live table must bind both continuity pairs",
);
check(
  "mobile-baseline-is-current",
  /^- status:\s*`current-contract\s*\/\s*acceptance-failed`/m.test(mobileBaseline),
  mobileBaselinePath,
);
check(
  "mobile-baseline-binds-the-user-reference",
  /_design\/accepted-mobile-reference\/accepted-four-screen\.png/.test(mobileBaseline) &&
    /不得恢复或引用已删除的其他手机设计树/.test(mobileBaseline),
  "the live mobile contract must bind only the user-selected four-screen reference",
);

for (const relativePath of legacyPaths) {
  const text = read(relativePath);
  check(
    `${relativePath}:superseded`,
    /^- status:\s*`superseded`/m.test(text),
    "historical direction must not be an active implementation authority",
  );
}

const desktopDirections = read("docs/desktop-overview-redesign-directions.md");
check(
  "desktop-directions-point-to-current-table",
  /docs\/decision-system\/responsive-capabilities\.md/.test(desktopDirections),
  "desktop historical directions must name the live replacement",
);
check(
  "desktop-directions-do-not-say-table-pending",
  !/pending unified responsive capability table/i.test(desktopDirections),
  "a superseded document cannot imply that the live table is still pending",
);
check(
  "historical-index-calls-table-active",
  /responsive-capabilities\.md[^\n]*active current authority/i.test(historicalIndex),
  "historical index must distinguish active table from historical proposals",
);
check(
  "historical-index-does-not-call-table-proposed",
  !/responsive-capabilities\.md[^\n]*remains proposed/i.test(historicalIndex),
  "the live table cannot remain described as proposed",
);

const pass = checks.every((entry) => entry.pass);
const report = {
  pass,
  currentPath,
  legacyPaths,
  checks,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = pass ? 0 : 1;
