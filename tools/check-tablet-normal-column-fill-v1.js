const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const screen = read('src/panel-framework/mobile/MobilePatrolScreen.tsx');
const css = read('src/panel-framework/mobile/mobile-tablet-layout.css');
const reportPath = path.join(root, '_acceptance', 'panel-runtime-browser', 'report.json');
const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;
const runtime = report?.checks?.find((item) => item.name === 'tablet normal puts object comparison before supporting columns and keeps relation/evidence after the task workspace');
const detail = runtime?.detail || {};
const rightColumnBlock = screen.match(/<div className="mp-tablet-right-column"[\s\S]*?<\/div>\s*\{tabletNextEvidence\}/)?.[0] || '';

const checks = {
  leftColumnOwner: /mp-tablet-left-column/.test(screen),
  rightColumnOwner: /mp-tablet-right-column/.test(screen),
  rightColumnDoesNotOwnRelation: !rightColumnBlock.includes('MobileTabletRelationRail'),
  supportOwnsRelation: /mp-tablet-steady-support[\s\S]{0,500}MobileTabletRelationRail/.test(screen),
  independentColumnCss: /\.mp-tablet-left-column[\s\S]{0,1200}\.mp-tablet-right-column/.test(css),
  runtimeRecordPresent: Boolean(runtime),
  runtimePass: runtime?.pass === true,
  relationFollowsObjectWorkspace: detail.relationAfterObjectWorkspace === true,
  evidenceFollowsRelation: detail.evidenceAfterRelation === true && detail.evidenceAfterColumns === true,
};

const pass = Object.values(checks).every(Boolean);
console.log(JSON.stringify({
  pass,
  contract: 'tablet-normal-column-fill-v1',
  implementationState: pass ? 'focused-green' : 'expected-red',
  checks,
  runtime: runtime ? { pass: runtime.pass, detail } : null,
  failures: Object.entries(checks).filter(([, value]) => !value).map(([name]) => name),
}, null, 2));
process.exitCode = pass ? 0 : 1;
