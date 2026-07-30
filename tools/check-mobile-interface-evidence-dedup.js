const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const focus = read('src', 'panel-framework', 'mobile', 'MobileInterfaceFocusContext.tsx');
const route = read('src', 'panel-framework', 'mobile', 'MobileInterfaceRouteEvidence.tsx');
const workspace = read('src', 'panel-framework', 'mobile', 'MobileDomainWorkspace.tsx');
const failures = [];
const check = (name, pass, detail) => {
  if (!pass) failures.push({ name, detail });
};

check('single direct selector is shared', /export function singleDirectInterfaceId\s*\(/.test(focus), 'focus owner must expose one canonical direct-object selector');
check('focus context uses shared selector', /singleDirectInterfaceId\s*\(rows\)/.test(focus), 'focus UI must not maintain a second direct-object selection rule');
check('route evidence accepts focus exclusion', /excludeObjectId\??:\s*string \| null/.test(route), 'route evidence needs an explicit object ownership boundary');
check('route evidence excludes focused object', /filter\(\(row\)\s*=>\s*row\.id\s*!==\s*excludeObjectId\)/.test(route), 'route evidence must not render the object already owned by focus context');
check('empty remaining relation set is omitted', /if\s*\(!evidenceRows\.length\)\s*return null/.test(route), 'an empty remainder must not leave a heading-only shell');
check('workspace derives one focus id', /singleDirectInterfaceId\s*\(visibleRows\)/.test(workspace), 'workspace must pass one canonical focused object id');
check('workspace passes focus ownership', /excludeObjectId=\{interfaceFocusObjectId\}/.test(workspace), 'workspace must connect focus ownership to route evidence');

const result = { pass: failures.length === 0, contract: 'mobile-interface-evidence-dedup-v1', checks: 7 - failures.length, total: 7, failures };
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
