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
  const fixedUrl = 'http://127.0.0.1:28646/';

  const browserDocs = [
    'README.md',
    'README.zh-CN.md',
    'DEPLOY_DOCKER.md',
    'DEPLOY_WINDOWS_EXE.md',
    'DEPLOY_ROUTEROS_CONTAINER.md',
    'DEPLOY_LOCAL.md',
    'DEPLOY_PUBLIC_192.168.3.50.md',
    'DEPLOY_PUBLIC_192.168.3.50.zh-CN.md',
    'DEPLOY_PUBLIC_192.168.4.50.md',
    'docs/LOCALHOST_ALIAS.md',
    'docs/superpowers/specs/2026-04-18-ros-monitor-panel-ikuai-1to1-design.md',
  ];

  for (const relPath of [
    ...browserDocs,
    'env.example',
    'routeros-panel.env.example',
    '.env.docker.example',
  ]) {
    assertContains(relPath, '28646');
  }

  assertContains('app.py', 'DEFAULT_PANEL_BIND = "0.0.0.0"');
  assertContains('app.py', 'DEFAULT_PANEL_TARGET = "127.0.0.1"');

  assertContains('install.sh', 'PUBLISHED_ADDR="0.0.0.0"');
  assertContains('install.sh', 'TARGET_IP="127.0.0.1"');
  assertContains('install.sh', 'ALIAS_TARGET_IP="$(detect_lan_ip)"');
  assertContains('install.sh', 'Open: http://127.0.0.1:$PUBLISHED_PORT/');

  assertContains('env.example', 'ROS_PANEL_BIND=0.0.0.0');
  assertContains('env.example', 'ROS_PANEL_PORT=28646');
  assertContains('env.example', 'ROS_PANEL_TARGET_IP=127.0.0.1');

  assertContains('routeros-panel.env.example', 'ROS_PANEL_BIND=0.0.0.0');
  assertContains('routeros-panel.env.example', 'ROS_PANEL_PORT=28646');
  assertContains('routeros-panel.env.example', 'ROS_PANEL_TARGET_IP=127.0.0.1');

  assertContains('.env.docker.example', 'ROS_PANEL_PUBLISHED_ADDR=0.0.0.0');
  assertContains('.env.docker.example', 'ROS_PANEL_PUBLISHED_PORT=28646');
  assertContains('.env.docker.example', 'ROS_PANEL_TARGET_IP=127.0.0.1');
  assertContains('compose.yml', '${ROS_PANEL_PUBLISHED_ADDR:-0.0.0.0}:${ROS_PANEL_PUBLISHED_PORT:-28646}:${ROS_PANEL_PORT:-28646}');
  assertContains('compose.yml', 'ROS_PANEL_BIND: "${ROS_PANEL_BIND:-0.0.0.0}"');
  assertContains('compose.yml', 'ROS_PANEL_TARGET_IP: "${ROS_PANEL_TARGET_IP:-127.0.0.1}"');

  assertContains('deploy_linux.sh', 'DEFAULT_PANEL_BIND="0.0.0.0"');
  assertContains('deploy_linux.sh', 'DEFAULT_PANEL_TARGET_IP="127.0.0.1"');

  for (const relPath of browserDocs) {
    assertContains(relPath, fixedUrl);
    assertNotContains(relPath, 'http://<panel-host-ip>:28646/');
    assertNotContains(relPath, 'http://<windows-host-ip>:28646/');
    assertNotContains(relPath, 'ROS_PANEL_TARGET_IP=auto');
    assertNotContains(relPath, 'Default: detected LAN IP');
    assertNotContains(relPath, 'http://172.18.0.2:28646/');
    assertNotContains(relPath, 'http://192.168.3.5');
    assertNotContains(relPath, 'http://192.168.3.50');
    assertNotContains(relPath, 'http://192.168.4.50');
  }

  assertContains('tools/install-localhost-alias.ps1', 'RouterOS panel localhost alias installed.');
  assertContains('tools/install-localhost-alias.sh', 'http://127.0.0.1:28646/');
  assertContains('tools/build-windows-exe.ps1', 'localhost-alias');

  console.log('[ok] fixed localhost access defaults are documented and templated');
}

main();
