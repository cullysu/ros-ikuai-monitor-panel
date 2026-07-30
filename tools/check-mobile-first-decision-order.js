#!/usr/bin/env node

/**
 * Focused red/green contract for Step282.
 *
 * This is intentionally a source-composition contract, not a product sign-off.
 * The browser runtime must still prove the resulting DOM order and screenshots.
 */

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const screen = fs.readFileSync(path.join(root, 'src/panel-framework/mobile/MobilePatrolScreen.tsx'), 'utf8');
const focus = fs.readFileSync(path.join(root, 'src/panel-framework/mobile/MobileFocusObject.tsx'), 'utf8');

const checks = [
  {
    name: 'focus object has an explicit focus-object landmark',
    pass: focus.includes('data-overview-task-landmark="focus-object"'),
  },
  {
    name: 'normal phone focus is composed as a named task surface',
    pass: screen.includes('const normalPhoneFocusObject ='),
  },
  {
    name: 'normal phone proof is composed as a separate named task surface',
    pass: screen.includes('const normalPhoneProofStrip ='),
  },
  {
    name: 'normal phone object is rendered before proof',
    pass: screen.lastIndexOf('normalPhoneFocusObject}') >= 0 &&
      screen.lastIndexOf('normalPhoneProofStrip}') >= 0 &&
      screen.lastIndexOf('normalPhoneFocusObject}') < screen.lastIndexOf('normalPhoneProofStrip}'),
  },
  {
    name: 'old root-level phone focus render is removed',
    pass: !screen.includes('{!tablet ? focusObject : null}'),
  },
];

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
}

if (failed.length) {
  console.error(`[mobile-first-decision-order] FAIL ${failed.length}/${checks.length}`);
  process.exitCode = 1;
} else {
  console.log(`[mobile-first-decision-order] PASS ${checks.length}/${checks.length}`);
}
