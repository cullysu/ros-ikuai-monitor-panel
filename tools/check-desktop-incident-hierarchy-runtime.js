const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = process.cwd();
const outputStem = process.env.CODEX_RUNTIME_ARTIFACT_STEM || 'codex_tmp_desktopIncidentHierarchy';
const keepArtifacts = process.env.CODEX_KEEP_RUNTIME_ARTIFACTS === '1';
const env = {
  ...process.env,
  CODEX_MEMORY_LIMIT_MB: '2048',
  NODE_OPTIONS: '--max-old-space-size=2048'
};
const cases = [
  { name: 'all-offline', section: 'desktopAllOfflineHierarchy' },
  { name: 'resource-full', section: 'desktopResourceHierarchy' }
];

function artifactPath(name, extension) {
  const resolved = path.resolve(root, `${outputStem}-${name}.${extension}`);
  const relative = path.relative(root, resolved);
  if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Runtime artifact must stay inside workspace: ${resolved}`);
  }
  return resolved;
}

function removeQuietly(file) {
  try { fs.rmSync(file, { force: true }); } catch {}
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runCase(item) {
  return new Promise((resolve, reject) => {
    const jsonFile = artifactPath(item.name, 'json');
    const pngFile = artifactPath(item.name, 'png');
    removeQuietly(jsonFile);
    removeQuietly(pngFile);
    const child = spawn(process.execPath, [
      '--max-old-space-size=2048',
      'tools/check-resource-trend-balance.js',
      '--section', item.section,
      '--width', '1440',
      '--height', '900',
      '--json', path.relative(root, jsonFile),
      '--png', path.relative(root, pngFile),
      '--wait', '3600'
    ], {
      cwd: root,
      env,
      stdio: 'inherit'
    });
    child.on('exit', (code) => {
      let resultError = null;
      try {
        if (code !== 0) throw new Error(`${item.name} hierarchy check exited ${code}`);
        if (!fs.existsSync(jsonFile) || !fs.existsSync(pngFile)) {
          throw new Error(`${item.name} hierarchy check exited 0 without fresh runtime artifacts`);
        }
        const report = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        if (report.pass !== true || report.incidentWorkspaceCompactOk !== true) {
          throw new Error(`${item.name} hierarchy report did not pass: ${JSON.stringify(report)}`);
        }
        console.log(`[desktop-incident-hierarchy] PASS ${item.name} risk=${report.risk} incidentRows=${report.incidentRowCount}`);
      } catch (error) {
        resultError = error;
      }
      if (!keepArtifacts) {
        removeQuietly(jsonFile);
        removeQuietly(pngFile);
      }
      if (resultError) reject(resultError);
      else resolve();
    });
    child.on('error', reject);
  });
}

async function runWithRetries(item) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      if (attempt > 1) {
        console.log(`[desktop-incident-hierarchy] retry ${item.name} (${attempt}/4)`);
        await delay(1800 + attempt * 700);
      }
      await runCase(item);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function main() {
  for (const item of cases) await runWithRetries(item);
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
