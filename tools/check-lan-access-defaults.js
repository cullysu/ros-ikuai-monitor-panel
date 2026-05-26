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
  const localUrl = 'http://127.0.0.1:28646/';

  const browserDocs = [
    'README.md',
    'README.zh-CN.md',
    'DEPLOY_DOCKER.md',
    'DEPLOY_WINDOWS_EXE.md',
    'DEPLOY_ROUTEROS_CONTAINER.md',
    'DEPLOY_LOCAL.md',
    'docs/legacy/DEPLOY_PUBLIC_192.168.3.50.md',
    'docs/legacy/DEPLOY_PUBLIC_192.168.3.50.zh-CN.md',
    'docs/legacy/DEPLOY_PUBLIC_192.168.4.50.md',
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

  assertContains('app.py', 'DEFAULT_PANEL_BIND = "127.0.0.1"');
  assertContains('app.py', 'DEFAULT_PANEL_TARGET = "127.0.0.1"');
  assertContains('app.py', 'def validate_panel_public_contract(bind, target):');
  assertContains('app.py', 'def panel_host_header_is_allowed(headers):');
  assertContains('app.py', 'Panel is localhost-only. Open http://127.0.0.1:28646/.');
  assertContains('app.py', 'def panel_request_access_url(headers, fallback_port=None):');
  assertContains('app.py', 'PANEL_TRUST_PROXY_HEADERS');
  assertContains('app.py', 'headers.get("Host")');
  assertContains('app.py', 'headers.get("X-Forwarded-Host")');
  assertContains('app.py', '"browserUrl": browser_url');
  assertContains('app.py', '"configuredUrl": configured_url');

  assertContains('install.sh', 'PUBLISHED_ADDR="127.0.0.1"');
  assertContains('install.sh', 'TARGET_IP="127.0.0.1"');
  assertContains('install.sh', 'Open: http://127.0.0.1:$PUBLISHED_PORT/');
  assertContains('install.sh', '--lan is not supported by the public installer');
  assertContains('install.sh', 'Network exposure: localhost-only');
  assertContains('install.sh', 'browser-url: http://127.0.0.1:$PUBLISHED_PORT/');
  assertContains('install.sh', 'exposure:   localhost-only');
  assertNotContains('install.sh', 'Open from other LAN devices');
  assertNotContains('install.sh', 'lan-url:');
  assertNotContains('install.sh', 'allow inbound TCP $PUBLISHED_PORT');
  assertNotContains('install.sh', 'alias-to:');

  assertContains('env.example', 'ROS_PANEL_BIND=127.0.0.1');
  assertContains('env.example', 'ROS_PANEL_PORT=28646');
  assertContains('env.example', 'ROS_PANEL_TARGET_IP=127.0.0.1');
  assertContains('env.example', 'ROS_PANEL_TRUST_PROXY_HEADERS=0');

  assertContains('routeros-panel.env.example', 'ROS_PANEL_BIND=127.0.0.1');
  assertContains('routeros-panel.env.example', 'ROS_PANEL_PORT=28646');
  assertContains('routeros-panel.env.example', 'ROS_PANEL_TARGET_IP=127.0.0.1');
  assertContains('routeros-panel.env.example', 'ROS_PANEL_TRUST_PROXY_HEADERS=0');

  assertContains('.env.docker.example', 'ROS_PANEL_PUBLISHED_ADDR=127.0.0.1');
  assertContains('.env.docker.example', 'ROS_PANEL_PUBLISHED_PORT=28646');
  assertContains('.env.docker.example', 'ROS_PANEL_IMAGE=routeros-triage-panel:local');
  assertContains('.env.docker.example', 'ROS_PANEL_TARGET_IP=127.0.0.1');
  assertContains('.env.docker.example', 'ROS_PANEL_TRUST_PROXY_HEADERS=0');
  assertContains('Dockerfile', 'ROS_PANEL_TARGET_IP=127.0.0.1');
  assertContains('Dockerfile', 'ROS_PANEL_TRUST_PROXY_HEADERS=0');
  assertContains('compose.yml', '${ROS_PANEL_IMAGE:-routeros-triage-panel:local}');
  assertContains('compose.yml', '${ROS_PANEL_PUBLISHED_ADDR:-127.0.0.1}:${ROS_PANEL_PUBLISHED_PORT:-28646}:${ROS_PANEL_PORT:-28646}');
  assertContains('compose.yml', 'ROS_PANEL_BIND: "${ROS_PANEL_BIND:-0.0.0.0}"');
  assertContains('compose.yml', 'ROS_PANEL_TARGET_IP: "${ROS_PANEL_TARGET_IP:-127.0.0.1}"');
  assertContains('compose.yml', 'ROS_PANEL_TRUST_PROXY_HEADERS: "${ROS_PANEL_TRUST_PROXY_HEADERS:-0}"');

  assertContains('deploy_linux.sh', 'DEFAULT_PANEL_BIND="127.0.0.1"');
  assertContains('deploy_linux.sh', 'DEFAULT_PANEL_TARGET_IP="127.0.0.1"');
  assertContains('deploy_linux.sh', 'ROS_PANEL_TRUST_PROXY_HEADERS="${ROS_PANEL_TRUST_PROXY_HEADERS:-0}"');

  for (const relPath of browserDocs) {
    assertContains(relPath, '127.0.0.1');
    assertNotContains(relPath, '<panel-host-ip>:28646');
    assertNotContains(relPath, '--lan');
    assertNotContains(relPath, '--bind 0.0.0.0');
    assertNotContains(relPath, 'browser-facing address is always');
    assertNotContains(relPath, 'documented browser-facing address is fixed');
    assertNotContains(relPath, 'same fixed URL while the Docker host is elsewhere');
    assertNotContains(relPath, 'client devices should install the localhost alias');
  }

  assertContains('README.md', localUrl);
  assertContains('DEPLOY_DOCKER.md', localUrl);
  assertContains('DEPLOY_WINDOWS_EXE.md', localUrl);
  assertContains('DEPLOY_LOCAL.md', localUrl);
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', localUrl);
  assertContains('docs/LOCALHOST_ALIAS.md', localUrl);
  assertContains('docs/LOCALHOST_ALIAS.md', 'optional');
  assertContains('tools/connect-routeros-container-localhost.ps1', '127.0.0.1');
  assertContains('tools/connect-routeros-container-localhost.py', '127.0.0.1');

  assertContains('tools/install-localhost-alias.ps1', 'RouterOS panel localhost alias installed.');
  assertContains('tools/install-localhost-alias.sh', localUrl);
  assertContains('tools/build-windows-exe.ps1', 'localhost-alias');

  console.log('[ok] strict localhost-only defaults are documented, templated, and guarded');
}

main();
