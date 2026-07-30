const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const targetPath = path.join(ROOT, 'tools', 'check-panel-runtime-browser.js');
const source = fs.readFileSync(targetPath, 'utf8');
const entryStart = source.indexOf('async function runRuntimeBrowserEntry');
const entry = entryStart >= 0 ? source.slice(entryStart) : '';

const checks = [
  ['runtime entry exists', entryStart >= 0],
  ['runtime entry awaits the bounded main race', /await Promise\.race\(\[main\(\), timeout\]\)/.test(entry)],
  ['runtime entry awaits shared cleanup on failure', /await cleanupRuntime\(\)/.test(entry)],
  ['runtime entry explicitly exits successfully after cleanup', /process\.exit\(0\)/.test(entry)],
  ['runtime entry explicitly exits unsuccessfully after cleanup', /process\.exit\(1\)/.test(entry)],
  ['runtime entry keeps a bounded timeout contract', /const testTimeout\s*=\s*Number\.isFinite\(configuredTestTimeout\)[\s\S]*?Math\.min\(Math\.max\(configuredTestTimeout,\s*30000\),\s*240000\)/.test(source)],
  ['runtime entry keeps isolated screenshot timeout bounded at 60000ms', source.includes('configuredScreenshotTimeout') && source.includes('Math.min(Math.max(configuredScreenshotTimeout, 5000), 60000)') && source.includes(': 60000;')],
];

const failed = checks.filter(([, pass]) => !pass).map(([name]) => name);
const report = {
  pass: failed.length === 0,
  contract: 'runtime-browser-lifecycle-v1',
  target: path.relative(ROOT, targetPath).split(path.sep).join('/'),
  checks: Object.fromEntries(checks),
  failed,
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
