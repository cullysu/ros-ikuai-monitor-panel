const fs = require("node:fs");

const files = {
  primary: "src/panel-framework/mobile/MobilePatrolIncidentCenter.tsx",
  secondary: "src/panel-framework/mobile/MobileConcurrentRiskQueue.tsx",
  followUp: "src/panel-framework/mobile/MobilePatrolActions.tsx",
  styles: "src/panel-framework/mobile/mobile-patrol.css",
  forcedColors: "src/panel-framework/mobile/mobile-forced-colors.css",
};

const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, "utf8")]));
const checks = [
  {
    name: "primary task declares a primary-risk role",
    pass: source.primary.includes('data-mobile-incident-task-role="primary-risk"'),
    detail: "the highest-risk object surface must identify itself as primary-risk",
  },
  {
    name: "secondary task declares a secondary-risk role",
    pass: source.secondary.includes('data-mobile-incident-task-role="secondary-risk"'),
    detail: "concurrent risks must remain context rather than competing with the primary risk",
  },
  {
    name: "follow-up task declares a follow-up role",
    pass: source.followUp.includes('data-mobile-incident-task-role="follow-up"'),
    detail: "investigation actions must remain the next visual level",
  },
  {
    name: "primary risk owns a restrained top state boundary",
    pass: /\.mp-incident\[data-mobile-incident-task-role=["']primary-risk["']\][^{]*\{[^}]*border-top:\s*2px\s+solid\s+var\(--mp-danger\)/s.test(source.styles),
    detail: "primary risk must have a horizontal non-card state boundary, not a thick colored side rail",
  },
  {
    name: "primary risk owns the single base surface",
    pass: /\.mp-incident\[data-mobile-incident-task-role=["']primary-risk["']\][^{]*\{[^}]*background:\s*var\(--mp-surface-base\)/s.test(source.styles),
    detail: "primary state owns the continuous surface while its top rule carries the state",
  },
  {
    name: "secondary risk remains a transparent context plane",
    pass: /\.mp-risk-queue\[data-mobile-incident-task-role=["']secondary-risk["']\][^{]*\{[^}]*background:\s*transparent/s.test(source.styles),
    detail: "secondary context must not become a second card",
  },
  {
    name: "follow-up actions remain a next surface",
    pass: /\.mp-actions\[data-mobile-incident-task-role=["']follow-up["']\][^{]*\{[^}]*background:\s*transparent/s.test(source.styles) &&
      /\.mp-action-list\s*>\s*button\[data-mobile-action-priority=["']primary["']\][^{]*\{[^}]*border-top:\s*2px\s+solid\s+var\(--mp-blue\)[^}]*background:\s*transparent/s.test(source.styles),
    detail: "the investigation region stays continuous while its primary entry uses a restrained task-rail rule instead of a filled card",
  },
  {
    name: "forced-colors keeps the primary top boundary visible",
    pass: /\.mp-incident\[data-mobile-incident-task-role=["']primary-risk["']\][^{]*\{[^}]*border-top:\s*2px\s+solid\s+ButtonText/s.test(source.forcedColors),
    detail: "state ownership must survive forced-colors mode",
  },
  {
    name: "large-text keeps primary/context/next ownership",
    pass: source.styles.includes(".mp-shell.is-large-text") && source.styles.includes("data-mobile-action-priority=\"primary\""),
    detail: "text enlargement must not collapse the task hierarchy",
  },
];

const result = {
  pass: checks.every((check) => check.pass),
  contract: "mobile-primary-secondary-surface-v4",
  checks,
  failures: checks.filter((check) => !check.pass).map((check) => check.name),
};
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
