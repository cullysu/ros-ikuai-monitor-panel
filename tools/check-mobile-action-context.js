const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const typeSource = read('src/panel-framework/overview/evidence-model/overviewEvidenceTypes.ts');
const builderSource = read('src/panel-framework/overview/evidence-model/buildOverviewInvestigationActions.ts');
const mobileSource = read('src/panel-framework/mobile/MobilePatrolActions.tsx');
const desktopSource = read('src/panel-framework/overview/desktop-overview/DesktopOverviewTask.tsx');

const failures = [];
function requireSource(source, pattern, label) {
  if (!pattern.test(source)) failures.push(label);
}

requireSource(
  typeSource,
  /type OverviewInvestigationActionScope\s*=\s*"object"\s*\|\s*"collection"[\s\S]*?interface OverviewInvestigationAction[\s\S]*?scope:\s*OverviewInvestigationActionScope/,
  'action type must declare object/collection scope',
);
requireSource(builderSource, /scope:\s*"collection"/, 'workspace actions must be collection-scoped');
requireSource(builderSource, /scope:\s*"object"/, 'investigation actions must be object-scoped');
requireSource(builderSource, /进入 WAN 工作区|查看 WAN 集合/, 'ambiguous WAN action must use collection wording');
requireSource(builderSource, /进入接口工作区|查看接口集合/, 'ambiguous interface action must use collection wording');
requireSource(builderSource, /进入资源工作区|查看资源集合/, 'ambiguous resource action must use collection wording');
for (const staleWorkspaceCall of [
  /workspace\("lineStatus",\s*"检查 WAN 对象"/,
  /workspace\(\s*"interfaces",\s*"检查接口对象"/,
  /workspace\("trafficLoad",\s*"进入资源负载"/,
]) {
  if (staleWorkspaceCall.test(builderSource)) failures.push(`collection action still uses object wording: ${staleWorkspaceCall}`);
}
requireSource(mobileSource, /data-mobile-action-scope=/, 'mobile action must expose scope');
requireSource(mobileSource, /data-mobile-action-object-id=/, 'mobile action must expose object id when present');
requireSource(mobileSource, /data-mobile-action-evidence-at=/, 'mobile action must expose evidence time when present');
requireSource(mobileSource, /data-mobile-action-from=/, 'mobile action must expose origin route when present');
requireSource(mobileSource, /对象级调查|集合工作区/, 'mobile action accessible context must distinguish scope');
requireSource(desktopSource, /data-desktop-action-scope=/, 'desktop action must consume the same scope semantics');

const result = {
  pass: failures.length === 0,
  checks: 9,
  failed: failures,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
