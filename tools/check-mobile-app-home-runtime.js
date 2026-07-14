const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const root = process.cwd();
const publicRoot = path.join(root, 'public');
const env = {
  ...process.env,
  CODEX_MEMORY_LIMIT_MB: '2048',
  NODE_OPTIONS: '--max-old-space-size=2048'
};
const keepArtifacts = process.env.CODEX_KEEP_RUNTIME_ARTIFACTS === '1';
const maxAttempts = Math.max(
  1,
  Math.min(4, Number(process.env.CODEX_MOBILE_RUNTIME_ATTEMPTS || '4') || 4)
);

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.png') return 'image/png';
  if (ext === '.svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

function isPathInside(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === '' || (
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function safeFile(reqUrl) {
  const parsed = new URL(reqUrl, 'http://127.0.0.1');
  const raw = decodeURIComponent(parsed.pathname === '/' ? '/index.html' : parsed.pathname);
  const resolved = path.resolve(publicRoot, `.${raw}`);
  if (!isPathInside(publicRoot, resolved)) return null;
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) return path.join(resolved, 'index.html');
  return resolved;
}

const server = http.createServer((req, res) => {
  const file = safeFile(req.url || '/');
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': contentType(file), 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

function resolveArtifact(item) {
  const resolved = path.resolve(root, item);
  if (resolved === root || !isPathInside(root, resolved)) {
    throw new Error(`Runtime artifact must stay inside workspace: ${item}`);
  }
  return resolved;
}

function removeQuietly(item) {
  const resolved = resolveArtifact(item);
  try { fs.rmSync(resolved, { recursive: true, force: true }); } catch {}
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runOnce(label, args, cleanup) {
  return new Promise((resolve, reject) => {
    console.log(`\n[mobile-app-home] ${label}`);
    for (const item of cleanup) removeQuietly(item);
    const child = spawn(process.execPath, ['--max-old-space-size=2048', ...args], {
      cwd: root,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
    child.on('exit', (code) => {
      const outputText = Buffer.concat(stdout).toString('utf8');
      const errorText = Buffer.concat(stderr).toString('utf8');
      let resultError = null;
      try {
        if (code !== 0) {
          throw new Error(`${label} exited ${code}`);
        }
        const missingArtifacts = cleanup.filter((item) => !fs.existsSync(path.resolve(root, item)));
        if (missingArtifacts.length > 0) {
          throw new Error(`${label} exited 0 without fresh runtime artifacts: ${missingArtifacts.join(', ')}`);
        }
        const reportItem = cleanup.find((item) => item.endsWith('.json'));
        const report = JSON.parse(fs.readFileSync(path.resolve(root, reportItem), 'utf8'));
        if (report.pass !== true) {
          throw new Error(`${label} report did not pass: ${JSON.stringify(report)}`);
        }
        if (outputText) process.stdout.write(outputText);
        if (errorText) process.stderr.write(errorText);
        console.log(`[mobile-app-home] PASS ${label}`);
      } catch (error) {
        resultError = error;
        resultError.outputText = outputText;
        resultError.errorText = errorText;
      }
      if (!keepArtifacts) {
        for (const item of cleanup) removeQuietly(item);
      }
      if (resultError) reject(resultError);
      else resolve();
    });
    child.on('error', reject);
  });
}

async function run(label, args, cleanup) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (attempt > 1) {
        console.log(`[mobile-app-home] retry ${label} (${attempt}/${maxAttempts})`);
        await delay(1800 + attempt * 700);
      }
      await runOnce(label, args, cleanup);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        if (lastError?.outputText) process.stdout.write(lastError.outputText);
        if (lastError?.errorText) process.stderr.write(lastError.errorText);
      }
    }
  }
  if (lastError?.outputText) process.stdout.write(lastError.outputText);
  if (lastError?.errorText) process.stderr.write(lastError.errorText);
  throw lastError;
}

async function main() {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const url = `http://127.0.0.1:${server.address().port}/`;
  const mobileChecks = [
    [
      'normal compact app home',
      ['tools/check-resource-trend-balance.js', '--url', url, '--section', 'mobileNormalHome', '--width', '390', '--height', '844', '--json', 'codex_tmp_mobileNormalHome.json', '--png', 'codex_tmp_mobileNormalHome.png', '--wait', '3600'],
      ['codex_tmp_mobileNormalHome.json', 'codex_tmp_mobileNormalHome.png']
    ],
    [
      'fleet mobile app home',
      ['tools/check-resource-trend-balance.js', '--url', url, '--section', 'mobileFleetHome', '--width', '390', '--height', '844', '--json', 'codex_tmp_mobileFleetHome.json', '--png', 'codex_tmp_mobileFleetHome.png', '--wait', '3600'],
      ['codex_tmp_mobileFleetHome.json', 'codex_tmp_mobileFleetHome.png']
    ],
    [
      'wan offline p0 app home',
      ['tools/check-resource-trend-balance.js', '--url', url, '--section', 'mobileAppHome', '--width', '390', '--height', '844', '--json', 'codex_tmp_mobileAppHome.json', '--png', 'codex_tmp_mobileAppHome.png', '--wait', '3600'],
      ['codex_tmp_mobileAppHome.json', 'codex_tmp_mobileAppHome.png']
    ],
    [
      'no snapshot trust boundary app home',
      ['tools/check-resource-trend-balance.js', '--url', url, '--section', 'mobileNoSnapshotHome', '--width', '390', '--height', '844', '--json', 'codex_tmp_mobileNoSnapshotHome.json', '--png', 'codex_tmp_mobileNoSnapshotHome.png', '--wait', '3600'],
      ['codex_tmp_mobileNoSnapshotHome.json', 'codex_tmp_mobileNoSnapshotHome.png']
    ],
    [
      'resource pressure p1 app home',
      ['tools/check-resource-trend-balance.js', '--url', url, '--section', 'mobileResourceHome', '--width', '390', '--height', '844', '--json', 'codex_tmp_mobileResourceHome.json', '--png', 'codex_tmp_mobileResourceHome.png', '--wait', '3600'],
      ['codex_tmp_mobileResourceHome.json', 'codex_tmp_mobileResourceHome.png']
    ],
    [
      'interface carrier p1 app home',
      ['tools/check-resource-trend-balance.js', '--url', url, '--section', 'mobileInterfaceHome', '--width', '390', '--height', '844', '--json', 'codex_tmp_mobileInterfaceHome.json', '--png', 'codex_tmp_mobileInterfaceHome.png', '--wait', '3600'],
      ['codex_tmp_mobileInterfaceHome.json', 'codex_tmp_mobileInterfaceHome.png']
    ],
    [
      'collection degraded p2 app home',
      ['tools/check-resource-trend-balance.js', '--url', url, '--section', 'mobileCollectionHome', '--width', '390', '--height', '844', '--json', 'codex_tmp_mobileCollectionHome.json', '--png', 'codex_tmp_mobileCollectionHome.png', '--wait', '3600'],
      ['codex_tmp_mobileCollectionHome.json', 'codex_tmp_mobileCollectionHome.png']
    ],
    [
      'bottom tabs navigate to real modules',
      ['tools/check-resource-trend-balance.js', '--url', url, '--section', 'mobileNavigation', '--width', '390', '--height', '844', '--json', 'codex_tmp_mobileNavigation.json', '--png', 'codex_tmp_mobileNavigation.png', '--wait', '3600'],
      ['codex_tmp_mobileNavigation.json', 'codex_tmp_mobileNavigation.png']
    ],
    [
      'bottom tabs preserve no-snapshot credibility boundary',
      ['tools/check-resource-trend-balance.js', '--url', url, '--section', 'mobileNavigationNoSnapshot', '--width', '390', '--height', '844', '--json', 'codex_tmp_mobileNavigationNoSnapshot.json', '--png', 'codex_tmp_mobileNavigationNoSnapshot.png', '--wait', '3600'],
      ['codex_tmp_mobileNavigationNoSnapshot.json', 'codex_tmp_mobileNavigationNoSnapshot.png']
    ],
    [
      'normal home exposes compact evidence rows',
      ['tools/check-resource-trend-balance.js', '--url', url, '--section', 'mobileDetailDrilldown', '--width', '390', '--height', '844', '--json', 'codex_tmp_mobileDetailDrilldown.json', '--png', 'codex_tmp_mobileDetailDrilldown.png', '--wait', '3600'],
      ['codex_tmp_mobileDetailDrilldown.json', 'codex_tmp_mobileDetailDrilldown.png']
    ],
    [
      'incident home exposes primary evidence rows',
      ['tools/check-resource-trend-balance.js', '--url', url, '--section', 'mobileIncidentDrilldown', '--width', '390', '--height', '844', '--json', 'codex_tmp_mobileIncidentDrilldown.json', '--png', 'codex_tmp_mobileIncidentDrilldown.png', '--wait', '3600'],
      ['codex_tmp_mobileIncidentDrilldown.json', 'codex_tmp_mobileIncidentDrilldown.png']
    ],
    [
      'resource incident next step opens connection view',
      ['tools/check-resource-trend-balance.js', '--url', url, '--section', 'mobileIncidentActionNavigation', '--width', '390', '--height', '844', '--json', 'codex_tmp_mobileIncidentActionNavigation.json', '--png', 'codex_tmp_mobileIncidentActionNavigation.png', '--wait', '3600'],
      ['codex_tmp_mobileIncidentActionNavigation.json', 'codex_tmp_mobileIncidentActionNavigation.png']
    ],
    [
      'WAN outage next step opens WAN detail',
      ['tools/check-resource-trend-balance.js', '--url', url, '--section', 'mobileWanIncidentAction', '--width', '390', '--height', '844', '--json', 'codex_tmp_mobileWanIncidentAction.json', '--png', 'codex_tmp_mobileWanIncidentAction.png', '--wait', '3600'],
      ['codex_tmp_mobileWanIncidentAction.json', 'codex_tmp_mobileWanIncidentAction.png']
    ],
    [
      'interface incident next step opens interface detail',
      ['tools/check-resource-trend-balance.js', '--url', url, '--section', 'mobileInterfaceIncidentAction', '--width', '390', '--height', '844', '--json', 'codex_tmp_mobileInterfaceIncidentAction.json', '--png', 'codex_tmp_mobileInterfaceIncidentAction.png', '--wait', '3600'],
      ['codex_tmp_mobileInterfaceIncidentAction.json', 'codex_tmp_mobileInterfaceIncidentAction.png']
    ],
    [
      'collection incident next step opens collection detail',
      ['tools/check-resource-trend-balance.js', '--url', url, '--section', 'mobileCollectionIncidentAction', '--width', '390', '--height', '844', '--json', 'codex_tmp_mobileCollectionIncidentAction.json', '--png', 'codex_tmp_mobileCollectionIncidentAction.png', '--wait', '3600'],
      ['codex_tmp_mobileCollectionIncidentAction.json', 'codex_tmp_mobileCollectionIncidentAction.png']
    ],
    [
      'no-snapshot next step opens trust boundary detail',
      ['tools/check-resource-trend-balance.js', '--url', url, '--section', 'mobileNoSnapshotIncidentAction', '--width', '390', '--height', '844', '--json', 'codex_tmp_mobileNoSnapshotIncidentAction.json', '--png', 'codex_tmp_mobileNoSnapshotIncidentAction.png', '--wait', '3600'],
      ['codex_tmp_mobileNoSnapshotIncidentAction.json', 'codex_tmp_mobileNoSnapshotIncidentAction.png']
    ]
  ];
  const landscapeChecks = [
    [
      'compact landscape app home',
      ['tools/check-resource-trend-balance.js', '--url', url, '--section', 'mobileNormalHome', '--width', '844', '--height', '390', '--json', 'codex_tmp_mobileLandscapeHome.json', '--png', 'codex_tmp_mobileLandscapeHome.png', '--wait', '3600'],
      ['codex_tmp_mobileLandscapeHome.json', 'codex_tmp_mobileLandscapeHome.png']
    ],
    [
      'resource pressure landscape keeps the conclusion visible',
      ['tools/check-resource-trend-balance.js', '--url', url, '--section', 'mobileResourceHome', '--width', '844', '--height', '390', '--json', 'codex_tmp_mobileLandscapeResource.json', '--png', 'codex_tmp_mobileLandscapeResource.png', '--wait', '3600'],
      ['codex_tmp_mobileLandscapeResource.json', 'codex_tmp_mobileLandscapeResource.png']
    ]
  ];
  if (process.env.CODEX_MOBILE_WIDTH || process.env.CODEX_MOBILE_HEIGHT) {
    const requestedWidth = String(Math.max(320, Number(process.env.CODEX_MOBILE_WIDTH || 390) || 390));
    const requestedHeight = String(Math.max(320, Number(process.env.CODEX_MOBILE_HEIGHT || 844) || 844));
    for (const [, args] of mobileChecks) {
      const widthIndex = args.indexOf('--width');
      const heightIndex = args.indexOf('--height');
      if (widthIndex >= 0) args[widthIndex + 1] = requestedWidth;
      if (heightIndex >= 0) args[heightIndex + 1] = requestedHeight;
    }
  }

  const requiredMobileSections = new Set([
    'mobileNormalHome',
    'mobileFleetHome',
    'mobileAppHome',
    'mobileNoSnapshotHome',
    'mobileResourceHome',
    'mobileInterfaceHome',
    'mobileCollectionHome',
    'mobileNavigation',
    'mobileNavigationNoSnapshot'
  ]);
  const currentMobileChecks = mobileChecks.filter(([, args]) => requiredMobileSections.has(args[args.indexOf('--section') + 1]));
  const requestedSections = new Set(
    String(process.env.CODEX_MOBILE_SECTIONS || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );
  const selectedChecks = requestedSections.size === 0
    ? [...currentMobileChecks, ...landscapeChecks]
    : currentMobileChecks.filter(([, args]) => {
      const sectionIndex = args.indexOf('--section');
      return sectionIndex >= 0 && requestedSections.has(args[sectionIndex + 1]);
    });
  if (requestedSections.size > 0 && selectedChecks.length !== requestedSections.size) {
    const selectedSections = selectedChecks.map(([, args]) => args[args.indexOf('--section') + 1]);
    const missingSections = [...requestedSections].filter((section) => !selectedSections.includes(section));
    throw new Error(`Unknown mobile runtime section(s): ${missingSections.join(', ')}`);
  }

  for (const [label, args, cleanup] of selectedChecks) {
    await run(label, args, cleanup);
  }
}

main()
  .then(() => {
    server.close();
  })
  .catch((error) => {
    server.close();
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
