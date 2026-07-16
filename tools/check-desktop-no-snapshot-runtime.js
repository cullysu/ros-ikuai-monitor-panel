const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const root = process.cwd();
const publicRoot = path.join(root, 'public');
const defaultOutputFiles = {
  json: 'codex_tmp_desktopNoSnapshot.json',
  png: 'codex_tmp_desktopNoSnapshot.png'
};
const defaultOutputStem = path.basename(defaultOutputFiles.json, '.json');
const outputStem = process.env.CODEX_RUNTIME_ARTIFACT_STEM || defaultOutputStem;
const keepArtifacts = process.env.CODEX_KEEP_RUNTIME_ARTIFACTS === '1';
const env = {
  ...process.env,
  CODEX_MEMORY_LIMIT_MB: '2048',
  NODE_OPTIONS: '--max-old-space-size=2048'
};

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

function runOnce(url) {
  return new Promise((resolve, reject) => {
    const jsonArtifact = outputStem === defaultOutputStem ? defaultOutputFiles.json : `${outputStem}.json`;
    const pngArtifact = outputStem === defaultOutputStem ? defaultOutputFiles.png : `${outputStem}.png`;
    const jsonFile = resolveArtifact(jsonArtifact);
    const pngFile = resolveArtifact(pngArtifact);
    removeQuietly(jsonFile);
    removeQuietly(pngFile);
    const child = spawn(process.execPath, [
      '--max-old-space-size=2048',
      'tools/check-resource-trend-balance.js',
      '--url', url,
      '--section', 'desktopNoSnapshot',
      '--width', '1528',
      '--height', '980',
      '--json', jsonArtifact,
      '--png', pngArtifact,
      '--wait', '3600'
    ], {
      cwd: root,
      env,
      stdio: 'inherit'
    });
    child.on('exit', (code) => {
      let resultError = null;
      try {
        if (code !== 0) {
          throw new Error(`desktop no-snapshot exited ${code}`);
        }
        if (!fs.existsSync(jsonFile) || !fs.existsSync(pngFile)) {
          throw new Error('desktop no-snapshot exited 0 without fresh runtime artifacts');
        }
        const report = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        if (report.pass !== true || report.section !== 'desktopNoSnapshot') {
          throw new Error(`desktop no-snapshot report did not pass: ${JSON.stringify(report)}`);
        }
        console.log('[desktop-no-snapshot] PASS');
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

async function main() {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const url = `http://127.0.0.1:${server.address().port}/`;
  try {
    await runOnce(url);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  try { server.close(); } catch {}
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
