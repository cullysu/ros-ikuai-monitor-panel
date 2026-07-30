#!/usr/bin/env node

/**
 * Focused red/green contract for Step283.
 *
 * The production browser matrix remains the authority for geometry and history;
 * this contract only checks that the bounded sibling-task seam exists in source.
 */

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const inspector = fs.readFileSync(path.join(root, 'src/panel-framework/mobile/mobile-inspector/MobileDomainInspector.tsx'), 'utf8');
const rail = fs.readFileSync(path.join(root, 'src/panel-framework/mobile/mobile-inspector/MobileRelatedObjectRail.tsx'), 'utf8');
const workspace = fs.readFileSync(path.join(root, 'src/panel-framework/mobile/MobileDomainWorkspace.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/panel-framework/mobile/mobile-domain.css'), 'utf8');

const checks = [
  {
    name: 'inspector owns a related-object rail landmark',
    pass: rail.includes('data-mobile-related-object-rail'),
  },
  {
    name: 'related-object rail has an explicit open callback',
    pass: inspector.includes('onOpenRelated'),
  },
  {
    name: 'workspace passes siblings for both preview and selected object',
    pass: workspace.includes('relatedRows={inspectorRow ? visibleRows.filter'),
  },
  {
    name: 'related-object entries are bounded instead of dumping the full collection',
    pass: rail.includes('rows.slice(0, 4)'),
  },
  {
    name: 'related-object entries keep a real touch target',
    pass: css.includes('.mdi-related-object-list > div > button') &&
      css.includes('min-height: 46px'),
  },
  {
    name: 'rail excludes the currently inspected object',
    pass: workspace.includes('row.id !== inspectorRow?.id'),
  },
];

const failed = checks.filter((check) => !check.pass);
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
}

if (failed.length) {
  console.error(`[tablet-related-object-rail] FAIL ${failed.length}/${checks.length}`);
  process.exitCode = 1;
} else {
  console.log(`[tablet-related-object-rail] PASS ${checks.length}/${checks.length}`);
}
