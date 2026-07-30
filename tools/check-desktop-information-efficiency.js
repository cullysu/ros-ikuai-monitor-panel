#!/usr/bin/env node

/**
 * Red/green contract for the desktop overview's information grammar.
 *
 * This is intentionally narrower than a visual sign-off: it prevents a
 * 1200–1439px desktop from hiding the source column and switching the ledger
 * into a second row grammar that only exists below 1440px.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const screenPath = path.join(ROOT, "src", "panel-framework", "overview", "desktop-overview", "DesktopOverviewScreen.tsx");
const ledgerPath = path.join(ROOT, "src", "panel-framework", "overview", "desktop-overview", "DesktopLedger.tsx");
const responsivePath = path.join(ROOT, "src", "panel-framework", "overview", "desktop-overview", "styles", "desktop-overview-responsive.css");
const basePath = path.join(ROOT, "src", "panel-framework", "overview", "desktop-overview", "styles", "desktop-overview.css");
const screen = fs.readFileSync(screenPath, "utf8");
const ledger = fs.readFileSync(ledgerPath, "utf8");
const responsive = fs.readFileSync(responsivePath, "utf8");
const base = fs.readFileSync(basePath, "utf8");

const checks = {
  rootDeclaresDesktopInformationEfficiencyV2: /data-desktop-information-efficiency="v2"/.test(screen),
  comparisonLandmarkRemainsOwned: /taskLandmark="comparison"/.test(screen),
  evidenceLandmarkRemainsOwned: /taskLandmark="evidence-boundary"/.test(screen),
  investigationLandmarkRemainsOwned: /DesktopInvestigationActions/.test(screen),
  ledgerKeepsFiveSemanticColumns: /grid-template-columns:\s*minmax\(68px,\s*0\.72fr\)\s+minmax\(112px,\s*1\.2fr\)\s+minmax\(105px,\s*1fr\)\s+minmax\(180px,\s*2\.05fr\)\s+minmax\(125px,\s*1\.35fr\)/.test(base),
  ledgerComponentRetainsSourceCell: /className="do-ledger-source"/.test(ledger),
  narrowDesktopDoesNotHideSourceColumn: !/\.do-ledger-head\s*>\s*:last-child\s*\{[\s\S]*?display:\s*none\s*;/.test(responsive),
  narrowDesktopDoesNotMoveSourceToSecondRow: !/\.do-ledger-source\s*\{[\s\S]*?grid-column:\s*2\s*\/\s*-1\s*;/.test(responsive),
};

const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const report = {
  pass: failed.length === 0,
  contract: "desktop-information-efficiency-v2",
  scope: "desktop overview 1200px+",
  files: [
    path.relative(ROOT, screenPath).replaceAll("\\", "/"),
    path.relative(ROOT, ledgerPath).replaceAll("\\", "/"),
    path.relative(ROOT, responsivePath).replaceAll("\\", "/"),
  ],
  checks,
  failed,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
