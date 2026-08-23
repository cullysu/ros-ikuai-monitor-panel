#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const workflowDirectory = path.join(root, '.github', 'workflows');
const workflowFiles = fs.readdirSync(workflowDirectory)
  .filter((file) => /\.ya?ml$/i.test(file))
  .sort();
const workflows = new Map(workflowFiles.map((file) => [file, read(path.join('.github', 'workflows', file))]));
const ci = workflows.get('ci.yml') || '';
const container = workflows.get('container-image.yml') || '';
const localWindows = read('tools/ci-local.ps1');
const localLinux = read('tools/ci-local.sh');

const workflowSources = [...workflows.values()];
const actionRefs = workflowSources.flatMap((source) => [...source.matchAll(/^\s*uses:\s*([^\s#]+)/gm)].map((match) => match[1]));
const exactCandidateTag = 'type=raw,value=sha-${{ github.event.workflow_run.head_sha }}';
const immutableImageReference = 'ghcr.io/cullysu/ros-ikuai-monitor-panel:sha-<40-hex-commit-sha>';
const publicPrebuiltSources = new Map([
  ['README.md', read('README.md')],
  ['README.zh-CN.md', read('README.zh-CN.md')],
  ['DEPLOY_DOCKER.md', read('DEPLOY_DOCKER.md')],
  ['.env.docker.example', read('.env.docker.example')],
]);
const triggerBlock = container.match(/^on:\s*\n([\s\S]*?)^permissions:/m)?.[1] || '';
const topLevelTriggers = [...triggerBlock.matchAll(/^ {2}([A-Za-z_][A-Za-z0-9_-]*):/gm)].map((match) => match[1]);
const tagsBlock = container.match(/^\s{10}tags:\s*\|\s*\n([\s\S]*?)^\s{10}labels:/m)?.[1] || '';
const imageTags = tagsBlock.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const verificationStep = container.indexOf('Verify exact-main CI success');
const reverifyStep = container.indexOf('Re-verify main immediately before GHCR push');
const publishStep = container.indexOf('Build and push exact CI candidate');
const checks = {
  'all third-party actions are pinned to immutable 40-character commits':
    actionRefs.length > 0 && actionRefs.every((reference) => /@[0-9a-f]{40}$/.test(reference)),
  'GHCR has no manual dispatch or caller-supplied evidence bypass':
    !/workflow_dispatch:/.test(container) &&
    !/inputs\.(candidate_sha|evidence_digest)/.test(container) &&
    !/EVIDENCE_DIGEST/.test(container) &&
    topLevelTriggers.length === 1 && topLevelTriggers[0] === 'workflow_run',
  'GHCR is triggered only by successful push CI runs for main':
    /workflows:\s*\[CI\]/.test(container) &&
    /types:\s*\[completed\]/.test(container) &&
    /branches:\s*\[main\]/.test(container) &&
    /github\.event\.workflow_run\.conclusion\s*==\s*'success'/.test(container) &&
    /github\.event\.workflow_run\.event\s*==\s*'push'/.test(container) &&
    /github\.event\.workflow_run\.head_branch\s*==\s*'main'/.test(container),
  'GHCR validates and checks out the exact CI candidate':
    /CANDIDATE_SHA:\s*\$\{\{\s*github\.event\.workflow_run\.head_sha\s*\}\}/.test(container) &&
    /\[\[\s*"\$CANDIDATE_SHA"\s*=~\s*\^\[0-9a-f\]\{40\}\$\s*\]\]/.test(container) &&
    /ref:\s*\$\{\{\s*github\.event\.workflow_run\.head_sha\s*\}\}/.test(container) &&
    /test "\$\(git rev-parse HEAD\)" = "\$CANDIDATE_SHA"/.test(container),
  'GHCR checks the triggering CI run and its Linux and Windows jobs on that exact SHA':
    /actions\/runs\/\$\{CI_RUN_ID\}"/.test(container) &&
    /\.head_sha == env\.CANDIDATE_SHA/.test(container) &&
    /actions\/runs\/\$\{CI_RUN_ID\}\/jobs/.test(container) &&
    /for check_name in "Linux validation" "Windows packaging"/.test(container) &&
    /test "\$conclusion" = "success"/.test(container) &&
    verificationStep >= 0 && publishStep > verificationStep,
  'GHCR image tags contain only the exact candidate SHA':
    imageTags.length === 1 && imageTags[0] === exactCandidateTag,
  'public prebuilt documentation advertises immutable SHA image tags only':
    [...publicPrebuiltSources.values()].every((source) =>
      source.includes(immutableImageReference) &&
      !/ghcr\.io\/cullysu\/ros-ikuai-monitor-panel:(?:main|latest)\b/.test(source)),
  'prebuilt installer requires an explicit immutable GHCR SHA tag without a build fallback':
    /validate_prebuilt_image\(\)[\s\S]*\^ghcr\\\.io\/cullysu\/ros-ikuai-monitor-panel:sha-\[0-9a-f\]\{40\}\$/.test(read('install.sh')) &&
    /\[\[ "\$PANEL_IMAGE_EXPLICIT" == "1" \]\][\s\S]*validate_prebuilt_image "\$PANEL_IMAGE"/.test(read('install.sh')) &&
    !/Prebuilt image pull failed; falling back to local Docker build\./.test(read('install.sh')),
  'GHCR labels carry exact CI revision without caller-supplied evidence':
    /org\.opencontainers\.image\.revision=\$\{\{\s*github\.event\.workflow_run\.head_sha\s*\}\}/.test(container) &&
    !/release-evidence/.test(container),
  'GHCR re-reads main immediately before push':
    reverifyStep > verificationStep && publishStep > reverifyStep &&
    /Re-verify main immediately before GHCR push[\s\S]*git fetch --no-tags origin main[\s\S]*git rev-parse origin\/main\)" = "\$CANDIDATE_SHA"/.test(container),
  'Windows packaging installs Node dependencies before preflight':
    /windows-packaging:[\s\S]*Set up Node\.js[\s\S]*npm ci[\s\S]*Packaging preflight/.test(ci),
  'Windows packaging enforces the 2GB Node ceiling':
    /windows-packaging:[\s\S]*CODEX_MEMORY_LIMIT_MB:\s*"2048"[\s\S]*NODE_OPTIONS:\s*--max-old-space-size=2048/.test(ci),
  'Windows packaging validates manifest-v3 dual-surface assets instead of a retired single bundle':
    ci.includes('node --check public/assets/framework/panel-surface-loader.js') &&
    ci.includes('node --check public/assets/framework/panel-mobile.js') &&
    ci.includes('node --check public/assets/framework/panel-desktop.js') &&
    /\$manifest\.version -ne 3/.test(ci) &&
    /\$manifest\.assets\.loader/.test(ci) &&
    /\$manifest\.assets\.mobile\.script/.test(ci) &&
    /\$manifest\.assets\.mobile\.style/.test(ci) &&
    /\$manifest\.assets\.desktop\.script/.test(ci) &&
    /\$manifest\.assets\.desktop\.style/.test(ci) &&
    /foreach \(\$asset in \$requiredFrameworkAssets\)[\s\S]*node --check[\s\S]*\$LASTEXITCODE -ne 0/.test(ci) &&
    /data-overview-framework-asset="surface-loader"/.test(ci) &&
    !/data-overview-framework-asset="style"/.test(ci) &&
    !/data-overview-framework-asset="script"/.test(ci) &&
    !/Join-Path \$publicRoot "assets\\framework\\style\.css"/.test(ci) &&
    !/Join-Path \$publicRoot "assets\\framework\\panel-framework\.js"/.test(ci),
  'Linux release gates run only portable Edge-toolbar fixtures, while Windows packaging runs and uploads real Edge toolbar evidence':
    !/check:release-gates[^\n]*check:browser-toolbar-zoom200/.test(read('package.json')) &&
    /windows-packaging:[\s\S]*npm ci[\s\S]*pip install pywinauto==0\.6\.9 Pillow==10\.4\.0[\s\S]*Real Edge toolbar 200 percent matrix[\s\S]*npm run check:browser-toolbar-zoom200[\s\S]*Get-ChildItem -LiteralPath \$source -Force \| ForEach-Object[\s\S]*Copy-Item -LiteralPath \$_.FullName[\s\S]*ci-windows-edge-toolbar-zoom200-\$\{\{ github\.sha \}\}/.test(ci) &&
    !/Copy-Item -LiteralPath \(Join-Path \$source "\*"\)/.test(ci),
  'local Linux and Windows CI enforce the 2GB Node ceiling':
    /CODEX_MEMORY_LIMIT_MB=2048/.test(localLinux) && /NODE_OPTIONS=--max-old-space-size=2048/.test(localLinux) &&
    /CODEX_MEMORY_LIMIT_MB\s*=\s*'2048'/.test(localWindows) && /NODE_OPTIONS\s*=\s*'--max-old-space-size=2048'/.test(localWindows),
  'local Linux and Windows CI install lockfile dependencies before checks':
    /cd "\$\(dirname "\$0"\)\/\.\."[\s\S]*\nnpm ci\n[\s\S]*check:release-gates/.test(localLinux) &&
    /Push-Location \$RepoRoot[\s\S]*\bnpm ci\b[\s\S]*check:release-gates/.test(localWindows),
};
const failures = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const report = { pass: failures.length === 0, contract: 'workflow-release-integrity-v1', actionRefs, checks, failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
