const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src/panel-framework/mobile/mobile-patrol.css"), "utf8");
const priority = fs.readFileSync(path.join(root, "src/panel-framework/mobile/mobile-patrol.css"), "utf8");

const checks = {
  "follow-up remains a transparent context plane": /\.mp-actions\[data-mobile-incident-task-role="follow-up"\][\s\S]*?background:\s*transparent/.test(priority),
  "follow-up header is compact": /\.mp-actions\s*>\s*header\s*\{[\s\S]*?min-height:\s*(?:3[0-9]|40)px/.test(source),
  "follow-up heading stays subordinate to primary": /\.mp-actions\[data-mobile-incident-task-role="follow-up"\]\s*h2\s*\{[\s\S]*?font-size:\s*16px/.test(source) && /\.mp-incident\[data-mobile-incident-task-role="primary-risk"\][\s\S]*?font-size:\s*19px/.test(priority),
  "action targets remain touchable": /\.mp-action-list\s*>\s*button\s*\{[\s\S]*?min-height:\s*44px/.test(source),
  "primary action retains the next-step rule": /\.mp-action-list > button\[data-mobile-action-priority="primary"\][\s\S]*?border-top:\s*2px solid var\(--mp-blue\)/.test(priority),
};

const failures = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const report = {
  pass: failures.length === 0,
  contract: "mobile-incident-follow-up-rhythm-v1",
  checks,
  failures,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
