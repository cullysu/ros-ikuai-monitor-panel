const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const workspace = read('src/panel-framework/mobile/MobileDomainWorkspace.tsx');
const css = read('src/panel-framework/mobile/mobile-domain.css');
const relationCss = read('src/panel-framework/mobile/mobile-tablet-interface-relations.css');
const componentPath = path.join(root, 'src/panel-framework/mobile/MobileTabletInterfaceRelations.tsx');
const component = fs.existsSync(componentPath) ? fs.readFileSync(componentPath, 'utf8') : '';

const failed = [];
function requireText(source, pattern, label) {
  if (!pattern.test(source)) failed.push(label);
}

requireText(workspace, /MobileTabletInterfaceRelations/, 'workspace must render the tablet interface relation component');
requireText(component, /data-tablet-interface-relations=/, 'relation area must expose a semantic tablet landmark');
requireText(workspace, /route === "interfaces"/, 'relation area must be bound to the interfaces route');
requireText(workspace, /model\.evidenceMode === "current"/, 'relation area must be bound to current evidence');
requireText(component, /InterfaceRowEvidence|defaultRouteRelation/, 'relation component must consume interface evidence');
requireText(component, /defaultRoutes|gateway|distance/, 'relation component must expose route relationship fields');
requireText(component, /待核对|未记录/, 'missing relationship evidence must remain explicit');
requireText(component, /mdw-tablet-interface-relations/, 'relation component must own a dedicated visual surface');
requireText(`${css}\n${relationCss}`, /\.mdw-tablet-interface-relations/, 'tablet relation surface must have scoped CSS');
if (component && /rxRate|txRate|rxBytes|txBytes|addresses/.test(component)) {
  failed.push('relation component must not replay object traffic/address facts');
}
if (/\.mdw-shell\.is-tablet-workbench \.mdw-list-pane[\s\S]{0,250}height:\s*100%/.test(css)) {
  failed.push('tablet list must remain content-owned instead of being stretched to fill empty space');
}

const result = { pass: failed.length === 0, checks: 10, failed };
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (failed.length) process.exitCode = 1;
