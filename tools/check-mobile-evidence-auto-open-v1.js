const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const ledger = read("src/panel-framework/mobile/MobileEvidenceLedger.tsx");
const screen = read("src/panel-framework/mobile/MobilePatrolScreen.tsx");
const explicitAutoOpen = /const autoOpenEvidenceLedger\s*=/.test(screen)
  && /model\.risk !== "none"/.test(screen)
  && /model\.evidenceMode !== "current"/.test(screen);

const checks = [
  {
    name: "evidence ledger accepts an incident-priority auto-open contract",
    pass: /autoOpen\??\s*:\s*boolean/.test(ledger),
    detail: "MobileEvidenceLedger must receive explicit scenario priority rather than infer it from viewport height alone.",
  },
  {
    name: "incident and unavailable evidence request automatic expansion",
    pass: explicitAutoOpen || /<MobileEvidenceLedger[\s\S]*?autoOpen=\{model\.risk !== \"none\" \|\| model\.evidenceMode !== \"current\"\}/.test(screen),
    detail: "Risk or non-current evidence must remain inspectable even when its rows continue below the first viewport.",
  },
  {
    name: "automatic expansion is not vetoed by first-viewport fit",
    pass: /const nextOpen\s*=\s*rows\.length\s*>\s*0\s*&&\s*\(\s*autoOpen\s*\|\|\s*\(requiredHeight\s*>\s*0\s*&&\s*requiredHeight\s*\+\s*reservedTaskHeight\s*<=\s*availableHeight\)\s*\)/.test(ledger),
    detail: "Viewport fit may control normal-state progressive disclosure, but cannot collapse incident evidence solely because it is tall.",
  },
  {
    name: "manual evidence toggle remains authoritative",
    pass: /userOverrideRef\.current !== null/.test(ledger) && /userOverrideRef\.current = nextOpen/.test(ledger),
    detail: "The fix must preserve an explicit user close/open choice until the evidence context changes.",
  },
  {
    name: "legacy fit-only auto-open rule is removed",
    pass: !/const nextOpen\s*=\s*rows\.length\s*>\s*0\s*&&\s*requiredHeight\s*>\s*0\s*&&\s*requiredHeight\s*<=\s*availableHeight/.test(ledger),
    detail: "The previous rule collapsed long evidence ledgers and left an unowned lower region on resource incident screens.",
  },
];

const report = {
  contract: "mobile-evidence-auto-open-v1",
  pass: checks.every((check) => check.pass),
  checks,
};
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
