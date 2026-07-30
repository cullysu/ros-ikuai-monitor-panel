const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const focusPath = path.join(root, "src", "panel-framework", "mobile", "MobileFocusObject.tsx");
const patrolPath = path.join(root, "src", "panel-framework", "mobile", "MobilePatrolScreen.tsx");
const focus = fs.readFileSync(focusPath, "utf8");
const patrol = fs.readFileSync(patrolPath, "utf8");

const checks = [
  {
    name: "focus identity accepts explicit evidence-time ownership",
    pass: /showEvidenceTime\??:\s*boolean/.test(focus),
  },
  {
    name: "narrow focus object does not render a second visible evidence time",
    pass: /<FocusIdentity[\s\S]*?showEvidenceTime=\{false\}/.test(focus),
  },
  {
    name: "focus identity conditionally renders the time element",
    pass: /showEvidenceTime\s*\?\s*<time/.test(focus),
  },
  {
    name: "status bus remains the narrow current-evidence time owner",
    pass: /<time data-mobile-current-evidence-time-owner>\{model\.evidenceTime\}<\/time>/.test(patrol),
  },
  {
    name: "exact evidenceAt remains available to the object action",
    pass: /data-mobile-evidence-at=\{evidenceAt\}/.test(focus) && /证据 \$\{evidenceTime\}/.test(focus),
  },
];

const failures = checks.filter((check) => !check.pass).map((check) => check.name);
const report = {
  pass: failures.length === 0,
  contract: "mobile-current-evidence-ownership-v1",
  checks,
  failures,
  scope: "narrow current mobile overview; status bus owns visible evidence time, object focus keeps object/action context",
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
