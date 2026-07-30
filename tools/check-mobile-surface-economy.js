const fs = require("node:fs");

const paths = {
  styles: "src/panel-framework/mobile/mobile-patrol.css",
  forcedColors: "src/panel-framework/mobile/mobile-forced-colors.css",
};

const source = Object.fromEntries(
  Object.entries(paths).map(([key, file]) => [key, fs.readFileSync(file, "utf8")]),
);
const styles = source.styles;

function rule(selector, haystack = styles) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = haystack.match(new RegExp(`[^{}]*${escaped}[^{}]*\\{([^}]*)\\}`, "s"));
  return match ? match[1] : "";
}

// These high-frequency surfaces have an explicit priority-surface owner. Read
// that owner directly so a later large-text override cannot hide the contract.
const priorityCount = rule(".mp-shell .mp-incident > header > b");
const riskState = rule(".mp-shell .mp-incident-copy em");
const actionIcon = rule(".mp-shell .mp-action-icon");
const forcedCount = source.forcedColors.includes(".mp-incident > header > b");
const forcedState = source.forcedColors.includes(".mp-incident-copy em");
const forcedAction = source.forcedColors.includes(".mp-action-icon");

const checks = [
  {
    name: "incident count uses a flat typographic surface",
    pass: /border-radius:\s*0/.test(priorityCount) && /background:\s*transparent/.test(priorityCount),
    detail: "the primary risk count should be read as typography, not a rounded alert chip",
  },
  {
    name: "incident state uses a flat text surface",
    pass: /border-radius:\s*0/.test(riskState) && /background:\s*transparent/.test(riskState),
    detail: "state meaning must remain visible without a repeated rounded pill",
  },
  {
    name: "follow-up icon is not a decorative rounded tile",
    pass: /border:\s*0/.test(actionIcon) && /border-radius:\s*0/.test(actionIcon) && /background:\s*transparent/.test(actionIcon),
    detail: "frequent investigation actions should use a line icon column rather than a mini-card",
  },
  {
    name: "primary risk uses a full-width top state rule",
    pass: /\.mp-incident\[data-mobile-incident-task-role=["']primary-risk["']\][^{]*\{[^}]*border-top:\s*2px\s+solid\s+var\(--mp-danger\)/s.test(styles)
      && !/\.mp-incident\[data-mobile-incident-task-role=["']primary-risk["']\][^{]*\{[^}]*border-(?:left|right):\s*(?:[2-9]|\d{2,})px/s.test(styles),
    detail: "the primary incident scan anchor should span the surface horizontally, not become a thick colored side rail",
  },
  {
    name: "incident rows retain a touch-safe target",
    pass: /\.mp-incident-row\s*\{[^}]*min-height:\s*(?:4[4-9]|[5-9]\d|\d{3,})px/s.test(styles),
    detail: "flat surfaces must not reduce the row below the touch contract",
  },
  {
    name: "action rows retain a touch-safe target",
    pass: /\.mp-action-list\s*>\s*button\s*\{[^}]*min-height:\s*(?:4[4-9]|[5-9]\d|\d{3,})px/s.test(styles),
    detail: "removing icon containers must not reduce the action target",
  },
  {
    name: "forced-colors owns the count boundary",
    pass: forcedCount,
    detail: "the typographic count still needs a visible forced-colors boundary",
  },
  {
    name: "forced-colors owns the state boundary",
    pass: forcedState,
    detail: "the flat state label still needs a visible forced-colors boundary",
  },
  {
    name: "forced-colors owns the action icon boundary",
    pass: forcedAction,
    detail: "the line icon must remain distinguishable when authored colors are removed",
  },
];

const result = {
  pass: checks.every((check) => check.pass),
  contract: "mobile-incident-surface-rule-v2",
  checks,
  failures: checks.filter((check) => !check.pass).map((check) => check.name),
};
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
