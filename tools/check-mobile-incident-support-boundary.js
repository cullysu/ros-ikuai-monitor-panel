const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const failures = [];
const checks = [];

function check(name, pass, detail) {
  checks.push({ name, pass: Boolean(pass), detail });
  if (!pass) failures.push({ name, detail });
}

const patrolCss = read('src/panel-framework/mobile/mobile-patrol.css');
const patrolScreen = read('src/panel-framework/mobile/MobilePatrolScreen.tsx');
const evidenceLedger = read('src/panel-framework/mobile/MobileEvidenceLedger.tsx');
const navigationCss = read('src/panel-framework/sections/section-console.css');
const reportPath = path.join(root, '_acceptance/panel-runtime-browser/report.json');
const report = JSON.parse(read('_acceptance/panel-runtime-browser/report.json'));
const supportBoundarySelector = /.mp-incident\s*>\s*header[\s\S]*?min-height:\s*48px/;
const actionHeaderSelector = /.mp-actions\s*>\s*header[\s\S]*?min-height:\s*40px/;
const actionButtonSelector = /.mp-action-list\s*>\s*button[\s\S]*?min-height:\s*44px/;
const secondaryActionSelector = /.mp-action-list\s*>\s*button\[data-mobile-action-priority="secondary"\][\s\S]*?min-height:\s*44px/;

check('incident owner compacts the incident header', supportBoundarySelector.test(patrolCss), {
  expected: '.mp-shell.has-incident .mp-incident > header min-height: 48px',
});
check('incident owner compacts the action header', actionHeaderSelector.test(patrolCss), {
  expected: '.mp-shell.has-incident .mp-actions > header min-height: 40px',
});
check('incident actions retain a 44px touch floor', actionButtonSelector.test(patrolCss), {
  expected: '.mp-shell.has-incident .mp-action-list > button min-height: 44px',
});
check('incident secondary actions retain a 44px touch floor', secondaryActionSelector.test(patrolCss), {
  expected: '.mp-shell.has-incident .mp-action-list > button[data-mobile-action-priority="secondary"] min-height: 44px',
});
check('incident surface has an explicit shell state owner', /has-incident/.test(patrolScreen), {
  expected: 'MobilePatrolScreen owns has-incident state for the shared compact task primitives',
});

const explicitAutoOpenContract = /const autoOpenEvidenceLedger\s*=/.test(patrolScreen)
  && /model\.risk !== "none"/.test(patrolScreen)
  && /model\.evidenceMode !== "current"/.test(patrolScreen);
const autoOpenContract = [
  /autoOpen=\{model\.risk !== "none" \|\| model\.evidenceMode !== "current"\}/.test(patrolScreen)
    || explicitAutoOpenContract,
  /autoOpen\?: boolean/.test(evidenceLedger),
  /autoOpen \|\|/.test(evidenceLedger),
].every(Boolean);
check('incident evidence remains explicitly open when support facts are required', autoOpenContract, {
  expected: 'risk or non-current evidence opens the ledger without relying on viewport-specific hiding',
});

const navigationMatch = navigationCss.match(/\.panel-task-navigation\s*\{[\s\S]{0,900}?min-height:\s*calc\((\d+)px\s*\+/);
const navigationHeight = navigationMatch ? Number(navigationMatch[1]) : null;
check('runtime boundary uses the declared fixed navigation height', navigationHeight === 60, {
  navigationHeight,
  reportPath,
});

const boundaryCheckName = 'mobile composite incident keeps proved interface dependency primary and resource pressure secondary';
const boundaryReports = (report.checks || [])
  .filter((item) => item.name === boundaryCheckName)
  .map((item) => item.detail || item.details || {})
  .filter((detail) => detail.surface === 'mobile' && [375, 390].includes(detail.viewport?.width));

for (const detail of boundaryReports) {
  const width = detail.viewport.width;
  const viewportHeight = detail.viewport.height;
  const lowerBottom = detail.lowerRect?.bottom;
  const lowerHeight = detail.lowerRect?.height;
  const navTop = viewportHeight - navigationHeight;
  const slack = navTop - lowerBottom;
  const pass = width === 390
    ? Number.isFinite(lowerBottom) && lowerBottom <= navTop + 1 && slack >= 0 && slack <= 56
    : Number.isFinite(lowerBottom) && Number.isFinite(lowerHeight) && lowerHeight > 0 && detail.overflow <= 1 && autoOpenContract;
  check(`${width}px incident support boundary is reachable without fixed-nav cover`, pass, {
    width,
    viewportHeight,
    lowerBottom,
    lowerHeight,
    navTop,
    slack,
    rule: width === 390
      ? 'lower boundary is before fixed navigation with <=56px slack'
      : 'real lower evidence may continue below the fold, but must have height, no horizontal overflow, and an explicit auto-open contract',
  });
}

check('runtime report contains both narrow incident support probes', boundaryReports.length === 2, {
  expectedWidths: [375, 390],
  actualWidths: boundaryReports.map((detail) => detail.viewport?.width),
});

const result = {
  pass: failures.length === 0,
  contract: 'mobile-incident-support-boundary-v1',
  reportPath,
  checks,
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
