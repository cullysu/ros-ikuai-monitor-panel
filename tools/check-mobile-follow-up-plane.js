const fs = require("node:fs");

const paths = {
  patrol: "src/panel-framework/mobile/mobile-patrol.css",
  forcedColors: "src/panel-framework/mobile/mobile-forced-colors.css",
};

const source = Object.fromEntries(
  Object.entries(paths).map(([key, file]) => [key, fs.readFileSync(file, "utf8")]),
);

function rule(text, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "s"))?.[1] || "";
}

function allRules(text, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...text.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "gs"))]
    .map((match) => match[1])
    .join("\n");
}

const plane = rule(source.patrol, '.mp-actions[data-mobile-incident-task-role="follow-up"]');
const primary = allRules(source.patrol, '.mp-action-list > button[data-mobile-action-priority="primary"]');
const secondary = rule(source.patrol, '.mp-action-list > button[data-mobile-action-priority="secondary"]');
const checks = [
  {
    name: "follow-up plane stays on the continuous base",
    pass: /background:\s*transparent/.test(plane),
    detail: "the full follow-up region must not become a single accent card",
  },
  {
    name: "primary action retains a selected task-rail rule",
    pass: /border-top:\s*2px\s+solid\s+var\(--mp-blue\)/.test(primary) && /background:\s*transparent/.test(primary),
    detail: "one primary action may retain a restrained rule/icon accent without becoming a filled card",
  },
  {
    name: "secondary actions do not inherit the accent wash",
    pass: !/background:\s*var\(--mp-accent-wash\)/.test(secondary),
    detail: "secondary actions must remain on the continuous plane",
  },
  {
    name: "action rows remain touch-safe",
    pass: /\.mp-action-list\s*>\s*button\s*\{[^}]*min-height:\s*(?:4[4-9]|[5-9]\d|\d{3,})px/s.test(source.patrol),
    detail: "surface reduction must not reduce the action target",
  },
  {
    name: "forced-colors keeps the follow-up plane legible",
    pass: source.forcedColors.includes('.mp-actions[data-mobile-incident-task-role="follow-up"]') &&
      /background:\s*Canvas/.test(source.forcedColors),
    detail: "the continuous plane still needs an explicit system-color fallback",
  },
  {
    name: "surface contract does not use important overrides",
    pass: !source.patrol.includes("!important"),
    detail: "surface ownership must remain explicit rather than escalation by override",
  },
];

const result = {
  pass: checks.every((check) => check.pass),
  contract: "mobile-follow-up-plane-v1",
  checks,
  failures: checks.filter((check) => !check.pass).map((check) => check.name),
};
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
