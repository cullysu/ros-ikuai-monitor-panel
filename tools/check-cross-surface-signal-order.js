#!/usr/bin/env node

/**
 * Focused cross-surface task-grammar contract.
 * The mobile and desktop render trees may remain separate, but a current
 * normal single-WAN patrol must expose the same first signal before secondary
 * decision rows.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const mobile = fs.readFileSync(path.join(ROOT, "src", "panel-framework", "mobile", "MobilePatrolScreen.tsx"), "utf8").replace(/\r\n/g, "\n");
const desktop = fs.readFileSync(path.join(ROOT, "src", "panel-framework", "overview", "desktop-overview", "DesktopOverviewScreen.tsx"), "utf8").replace(/\r\n/g, "\n");

function normalPrimary(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);
  return start >= 0 && end > start ? source.slice(start, end) : "";
}

const mobilePrimary = normalPrimary(mobile, '<div className="mp-workspace-primary">', '<div className="mp-workspace-context">');
const mobileSignal = mobilePrimary.indexOf("{trafficSignal}");
const mobileDecisions = mobilePrimary.indexOf("{normalPhoneSteadyDecisions}");
const desktopNormal = normalPrimary(desktop, '<div className={`do-normal-workspace', '</div>\n      )}');
const desktopSignal = desktopNormal.indexOf("<DesktopWanEvidence");
const desktopDecisions = desktopNormal.indexOf('data-desktop-normal-decision-band');

const checks = [
  {
    name: "mobile normal primary exposes one WAN signal owner",
    pass: mobileSignal >= 0,
    detail: { mobileSignal, mobileTrafficOwnerCount: (mobilePrimary.match(/\{trafficSignal\}/g) || []).length },
  },
  {
    name: "mobile current WAN signal precedes secondary decisions",
    pass: mobileSignal >= 0 && mobileDecisions >= 0 && mobileSignal < mobileDecisions,
    detail: { mobileSignal, mobileDecisions },
  },
  {
    name: "desktop current WAN signal precedes secondary decisions",
    pass: desktopSignal >= 0 && desktopDecisions >= 0 && desktopSignal < desktopDecisions,
    detail: { desktopSignal, desktopDecisions },
  },
  {
    name: "contract does not require shared responsive DOM",
    pass: !/desktop DOM|copy.*Desktop|hidden.*desktop/i.test(mobilePrimary),
    detail: "separate render trees remain allowed",
  },
];

const failures = checks.filter((check) => !check.pass).map((check) => check.name);
const result = {
  pass: failures.length === 0,
  contract: "cross-surface-signal-order-v1",
  checks,
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
