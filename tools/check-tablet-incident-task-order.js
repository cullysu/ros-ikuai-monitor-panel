const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/panel-framework/mobile/MobilePatrolScreen.tsx'), 'utf8');
const failures = [];
const branchStart = source.indexOf('tablet && incident');
const branchEnd = branchStart >= 0 ? source.indexOf(') : (', branchStart) : -1;
const branch = branchStart >= 0 && branchEnd > branchStart ? source.slice(branchStart, branchEnd) : '';
const evidenceIndex = branch.indexOf('{evidenceLedger}');
const taskIndex = branch.indexOf('{tabletVerticalTask}');
const pass = branchStart >= 0 && branchEnd > branchStart && evidenceIndex >= 0 && taskIndex >= 0 && taskIndex < evidenceIndex;
if (!pass) failures.push('tablet incident follow-up task must precede the evidence ledger');
const report = { pass, contract: 'tablet-incident-task-order-v1', failures, detail: { branchFound: branch.length > 0, evidenceIndex, taskIndex } };
console.log(JSON.stringify(report, null, 2));
process.exitCode = pass ? 0 : 1;
