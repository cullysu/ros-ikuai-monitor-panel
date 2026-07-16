const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = process.cwd();
const outDir = path.join(root, '_acceptance', 'mobile-native-runtime');
const reportFile = path.join(outDir, 'report.json');
const matrixTimeoutMs = 180000;
const scenarios = ['single', 'fleet', 'all-offline', 'no-snapshot', 'collection-down', 'resource-full', 'interfaces-down'];
const viewports = {
  p320: '320x568',
  p360: '360x800',
  p375: '375x667',
  p390: '390x844',
  p430: '430x932',
  tablet: '768x1024',
  l667: '667x375',
  l844: '844x390',
};
function resolvePythonExecutable() {
  const explicit = [process.env.CODEX_PYTHON_PATH, process.env.PYTHON].filter(Boolean);
  for (const candidate of explicit) {
    if (!path.isAbsolute(candidate) || fs.existsSync(candidate)) return candidate;
  }
  const localCandidates = process.platform === 'win32'
    ? [
        path.join(root, '.venv', 'Scripts', 'python.exe'),
        path.join(
          process.env.USERPROFILE || '',
          '.cache',
          'codex-runtimes',
          'codex-primary-runtime',
          'dependencies',
          'python',
          'python.exe',
        ),
      ]
    : [
        path.join(root, '.venv', 'bin', 'python'),
      ];
  return localCandidates.find((candidate) => fs.existsSync(candidate)) ||
    (process.platform === 'win32' ? 'python' : 'python3');
}

const pythonExecutable = resolvePythonExecutable();
const localPythonDeps = path.join(root, '_acceptance', 'python-deps');
const pythonPath = [
  fs.existsSync(localPythonDeps) ? localPythonDeps : '',
  process.env.PYTHONPATH || '',
].filter(Boolean).join(path.delimiter);
const env = {
  ...process.env,
  CODEX_MEMORY_LIMIT_MB: '2048',
  NODE_OPTIONS: '--max-old-space-size=2048',
};
if (pythonPath) env.PYTHONPATH = pythonPath;

function runMatrix() {
  return new Promise((resolve, reject) => {
    fs.rmSync(outDir, { recursive: true, force: true });
    const child = spawn(process.execPath, [
      '--max-old-space-size=2048',
      'tools/local-predeploy-check.js',
      '--python', pythonExecutable,
      '--profile', 'public',
      '--viewports', Object.entries(viewports).map(([name, dimensions]) => `${name}=${dimensions}`).join(','),
      '--sections', 'overview',
      '--scale-scenarios', scenarios.join(','),
      '--strict-responsive',
      '--out', path.relative(root, outDir),
    ], { cwd: root, env, stdio: 'inherit' });
    let finished = false;
    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill();
      reject(new Error(`mobile matrix exceeded ${matrixTimeoutMs}ms`));
    }, matrixTimeoutMs);
    child.on('error', (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.on('exit', (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(`mobile matrix exited ${code}`));
    });
  });
}

function verifyReport() {
  if (!fs.existsSync(reportFile)) throw new Error('mobile matrix did not produce report.json');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  const expectedCells = scenarios.flatMap((scenario) => Object.entries(viewports).map(([viewport, dimensions]) =>
    `public::${scenario}::overview::${viewport}=${dimensions}`));
  const passedCells = new Set(report.matrix?.passedCells || []);
  const missing = expectedCells.filter((cell) => !passedCells.has(cell));
  const screenshots = fs.readdirSync(outDir).filter((name) => name.endsWith('.png'));
  if (report.pass !== true || report.matrix?.complete !== true || missing.length || screenshots.length < expectedCells.length) {
    throw new Error(JSON.stringify({
      pass: report.pass,
      complete: report.matrix?.complete,
      missing,
      screenshots: screenshots.length,
      failures: (report.failures || []).map((failure) => failure.name || failure.message || String(failure)),
    }, null, 2));
  }
  console.log(`[mobile-native] PASS cells=${expectedCells.length} screenshots=${screenshots.length}`);
}

async function main() {
  await runMatrix();
  verifyReport();
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
