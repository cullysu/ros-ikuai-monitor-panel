#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function assertContains(relPath, needle, label = needle) {
  const text = read(relPath);
  if (!text.includes(needle)) {
    throw new Error(`${relPath} is missing ${label}`);
  }
}

function assertNotContains(relPath, needle, label = needle) {
  const text = read(relPath);
  if (text.includes(needle)) {
    throw new Error(`${relPath} still contains ${label}`);
  }
}

function main() {
  const port = '28646';

  for (const relPath of [
    'README.md',
    'README.zh-CN.md',
    'DEPLOY_DOCKER.md',
    'DEPLOY_WINDOWS_EXE.md',
    'DEPLOY_ROUTEROS_CONTAINER.md',
    'DEPLOY_LOCAL.md',
    'env.example',
    'routeros-panel.env.example',
    '.env.docker.example',
  ]) {
    assertContains(relPath, port, port);
  }

  assertContains('app.py', 'DEFAULT_PANEL_BIND = "0.0.0.0"');
  assertContains('app.py', 'DEFAULT_PANEL_TARGET = detect_panel_lan_ip()');

  assertContains('install.sh', 'PUBLISHED_ADDR="0.0.0.0"');
  assertContains('install.sh', 'TARGET_IP="$(detect_lan_ip)"');

  assertContains('env.example', 'ROS_PANEL_BIND=0.0.0.0');
  assertContains('env.example', 'ROS_PANEL_PORT=28646');
  assertContains('env.example', 'ROS_PANEL_TARGET_IP=auto');

  assertContains('routeros-panel.env.example', 'ROS_PANEL_BIND=0.0.0.0');
  assertContains('routeros-panel.env.example', 'ROS_PANEL_PORT=28646');
  assertContains('routeros-panel.env.example', 'ROS_PANEL_TARGET_IP=auto');

  assertContains('.env.docker.example', 'ROS_PANEL_PUBLISHED_ADDR=0.0.0.0');
  assertContains('.env.docker.example', 'ROS_PANEL_PUBLISHED_PORT=28646');
  assertContains('.env.docker.example', 'ROS_PANEL_TARGET_IP=auto');
  assertContains('compose.yml', '${ROS_PANEL_PUBLISHED_ADDR:-0.0.0.0}:${ROS_PANEL_PUBLISHED_PORT:-28646}:${ROS_PANEL_PORT:-28646}');
  assertContains('compose.yml', 'ROS_PANEL_BIND: "${ROS_PANEL_BIND:-0.0.0.0}"');
  assertContains('compose.yml', 'ROS_PANEL_TARGET_IP: "${ROS_PANEL_TARGET_IP:-auto}"');

  assertContains('deploy_linux.sh', 'DEFAULT_PANEL_BIND="0.0.0.0"');
  assertContains('deploy_linux.sh', 'DEFAULT_PANEL_TARGET_IP="$(detect_lan_ip)"');

  assertContains('README.md', 'http://<panel-host-ip>:28646/');
  assertContains('DEPLOY_DOCKER.md', 'http://<panel-host-ip>:28646/');
  assertContains('DEPLOY_WINDOWS_EXE.md', 'ROS_PANEL_BIND=0.0.0.0');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'ROS_PANEL_BIND value=0.0.0.0');

  assertNotContains('README.md', 'All install paths start local-only at `127.0.0.1:28646`');
  assertNotContains('DEPLOY_DOCKER.md', 'The default install publishes the panel only on `127.0.0.1:28646`');
  assertNotContains('DEPLOY_DOCKER.md', 'This is expected with the default install');
  assertNotContains('DEPLOY_WINDOWS_EXE.md', 'Keep `ROS_PANEL_BIND=127.0.0.1`');

  console.log('[ok] LAN-direct defaults are documented and templated');
}

main();
