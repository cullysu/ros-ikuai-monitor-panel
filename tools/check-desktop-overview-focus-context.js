#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const componentPath = path.join(root, 'src', 'panel-framework', 'overview', 'desktop-overview', 'DesktopOverviewTask.tsx');
const component = fs.readFileSync(componentPath, 'utf8');
const failures = [];

function check(name, condition, detail) {
  if (!condition) failures.push({ name, detail });
}

check(
  'desktop incident workspace has one explicit owner',
  /export function DesktopIncidentWorkspace/.test(component) && /data-overview-task-landmark="risk-objects"/.test(component),
  'the composite-risk desktop task needs a named master-detail owner'
);
check(
  'default selection comes from canonical priority objects',
  /const defaultObjectId\s*=\s*model\.priorityObjectsAll\[0\]\?\.id/.test(component),
  'the first item may only be used as the already-ranked priority object supplied by the evidence model'
);
check(
  'state starts with the canonical priority object',
  /useState\(defaultObjectId\)/.test(component),
  'initial desktop load must not leave the highest-risk inspector empty'
);
check(
  'selection remains stable when the evidence model changes',
  /useEffect/.test(component) && /defaultObjectId/.test(component) && /setSelectedId/.test(component),
  'a refreshed snapshot must preserve a valid selection or move to the new canonical priority object'
);
check(
  'selected inspector is rendered from the real selected object',
  /data-overview-task-inspector=\{selected\.id\}/.test(component) && /selected\.attributes/.test(component),
  'the initial inspector must expose the selected object facts rather than a generic placeholder'
);
check(
  'selected action carries object and evidence context',
  /objectId:\s*selected\.targetObjectId/.test(component) && /evidenceAt:\s*model\.evidenceAt/.test(component),
  'the next investigation must retain the object identity and evidence time'
);
check(
  'no empty state is used for an available priority object',
  !/useState\(\s*["']{2}\s*\)/.test(component),
  'an available composite-risk object must not begin as an unselected empty inspector'
);
check(
  'no arbitrary row fallback exists',
  !/rows\s*\[0\]/.test(component) && !/priorityObjectsAll\s*\[0\]\?\.id\s*\|\|\s*objects\[0\]/.test(component),
  'selection must remain bound to the evidence model, not a second unranked fallback'
);

if (failures.length) {
  console.error(JSON.stringify({ pass: false, contract: 'desktop-overview-focus-context-v1', failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ pass: true, checks: 8, contract: 'desktop-overview-focus-context-v1' }, null, 2));
