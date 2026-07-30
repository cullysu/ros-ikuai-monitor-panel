const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const workspace = read('src/panel-framework/sections/DesktopDomainWorkspace.tsx');
const css = read('src/panel-framework/sections/desktop-domain.css');
const helperPath = path.join(root, 'src/panel-framework/sections/interfaceRouteRelation.ts');
const helper = fs.existsSync(helperPath) ? fs.readFileSync(helperPath, 'utf8') : '';

const checks = {
  desktopWorkspaceRendersRelationSurface: /data-desktop-interface-relations/.test(workspace),
  currentInterfacesOnly: /route === ["']interfaces["']/.test(workspace) && /evidenceMode === ["']current["']/.test(workspace),
  relationSurfaceUsesExistingEvidence: /defaultRouteRelation|defaultRoutes/.test(workspace + helper),
  relationSurfaceShowsGatewayAndDistance: /gateway|distance/.test(workspace + helper),
  missingRelationRemainsExplicit: /待核对|未取得|未记录/.test(workspace + helper),
  relationSurfaceHasScopedDesktopCss: /\.ddi-block/.test(css) && /className="ddi-block ddw-interface-relations"/.test(workspace),
  relationDoesNotReplayTrafficOrAddresses: !/ddw-interface-relations[\s\S]{0,1200}(rxRate|txRate|rxBytes|txBytes|addresses)/.test(workspace + helper),
};

const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = { pass: failed.length === 0, contract: 'desktop-interface-relations-v1', checks, failed };
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (failed.length) process.exitCode = 1;
