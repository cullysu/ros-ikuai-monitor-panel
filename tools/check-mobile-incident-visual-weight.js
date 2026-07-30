const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const incident = read('src/panel-framework/mobile/MobilePatrolIncidentCenter.tsx');
const scenarioFocus = read('src/panel-framework/mobile/MobileScenarioFocus.tsx');
const styles = read('src/panel-framework/mobile/mobile-patrol.css');

const checks = [
  ['primary incident declares the primary visual level', /data-mobile-visual-level="primary"/.test(incident)],
  ['scenario focus declares the secondary visual level', /data-mobile-visual-level="secondary"/.test(scenarioFocus)],
  ['secondary scenario is owned by the mobile style tree', /@media \(max-width: 599px\)/.test(styles) && !/DesktopOverview/.test(styles)],
  ['secondary scenario header is shorter than the primary incident header', /\.mp-scenario-focus > header[\s\S]*?min-height:\s*52px/.test(styles)],
  ['secondary scenario rows are denser than primary incident rows', /\.mp-scenario-focus-item\s*\{[\s\S]*?min-height:\s*52px/.test(styles)],
  ['secondary scenario does not use a separate raised surface', /\.mp-scenario-focus\s*\{[\s\S]*?background:\s*transparent/.test(styles)],
  ['secondary scenario heading stays subordinate', /\.mp-scenario-focus h2\s*\{[\s\S]*?font-size:\s*16px/.test(styles)],
];

const failed = checks.filter(([, pass]) => !pass).map(([name]) => name);
const report = {
  pass: failed.length === 0,
  contract: 'mobile-incident-visual-weight-v1',
  checks: Object.fromEntries(checks),
  failed,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
