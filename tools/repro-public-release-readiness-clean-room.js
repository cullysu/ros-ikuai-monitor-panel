#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function usage() {
  return `
Usage:
  node tools/repro-public-release-readiness-clean-room.js [--keep-temp]

Options:
  --keep-temp   Keep the temporary clone for inspection.
  --help        Show this help.
`.trim();
}

function run(command, args, cwd) {
  return spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
}

function main(argv = process.argv.slice(2)) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage());
    return 0;
  }

  const keepTemp = argv.includes('--keep-temp');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ros-release-clean-room-'));
  const cloneRoot = path.join(tempRoot, 'repo');
  let preserveTemp = keepTemp;

  try {
    console.log(`[clean-room] cloning HEAD into ${cloneRoot}`);
    const clone = run('git', ['clone', '--quiet', '--local', '--no-hardlinks', ROOT, cloneRoot], ROOT);
    if (clone.status !== 0) {
      throw new Error((clone.stderr || clone.stdout || 'git clone failed').trim());
    }

    fs.rmSync(path.join(cloneRoot, '_acceptance'), { recursive: true, force: true });
    console.log('[clean-room] removed _acceptance to simulate a clean artifact tree');

    const staticChecker = run(process.execPath, ['tools/check-public-release-readiness.js', '--static-only'], cloneRoot);
    if (staticChecker.status !== 0) {
      preserveTemp = true;
      const output = `${staticChecker.stdout || ''}${staticChecker.stderr || ''}`.trim();
      throw new Error(`static-only checker failed in a clean-artifact clone:\n${output || '(no output)'}`);
    }
    console.log('[ok] static-only readiness passes without release-matrix artifacts');

    const checker = run(process.execPath, ['tools/check-public-release-readiness.js'], cloneRoot);
    const output = `${checker.stdout || ''}${checker.stderr || ''}`.trim();
    const expected = /No release matrix report\.json for current HEAD/;

    if (checker.status === 0) {
      preserveTemp = true;
      throw new Error('checker unexpectedly passed in a clean-artifact clone');
    }

    if (!expected.test(output)) {
      preserveTemp = true;
      throw new Error(`checker failed for the wrong reason:\n${output || '(no output)'}`);
    }

    console.log(output);
    console.log('[ok] reproduced the missing release-matrix report failure');
    return 0;
  } catch (error) {
    console.error(error && error.stack ? error.stack : String(error));
    return 1;
  } finally {
    if (preserveTemp) {
      console.log(`[clean-room] temp clone kept at ${tempRoot}`);
    } else {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }
}

process.exitCode = main();
