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
  const lanUrl = 'http://<panel-host-ip>:28646/';
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

  assertContains('app.py', 'DEFAULT_PANEL_BIND = "0.0.0.0"');
  assertContains('app.py', 'DEFAULT_PANEL_TARGET = detect_panel_lan_ip()');
  assertContains('app.py', 'def panel_request_access_url(headers, fallback_port=None):');
  assertContains('app.py', 'PANEL_TRUST_PROXY_HEADERS');
  assertContains('app.py', 'headers.get("Host")');
  assertContains('app.py', 'headers.get("X-Forwarded-Host")');
  assertContains('app.py', '"browserUrl": browser_url');
  assertContains('app.py', '"configuredUrl": configured_url');

  assertContains('install.sh', 'PUBLISHED_ADDR="0.0.0.0"');
  assertContains('install.sh', 'TARGET_IP="$(detect_lan_ip)"');
  assertContains('install.sh', 'Open from other LAN devices: http://$TARGET_IP:$PUBLISHED_PORT/');
  assertContains('install.sh', 'No client localhost alias helper is required for normal LAN access.');
  assertContains('install.sh', 'allow inbound TCP $PUBLISHED_PORT');
  assertNotContains('install.sh', 'alias-to:');

  assertContains('env.example', 'ROS_PANEL_BIND=0.0.0.0');
  assertContains('env.example', 'ROS_PANEL_PORT=28646');
  assertContains('env.example', 'ROS_PANEL_TARGET_IP=auto');
  assertContains('env.example', 'ROS_PANEL_TRUST_PROXY_HEADERS=0');

  assertContains('routeros-panel.env.example', 'ROS_PANEL_BIND=0.0.0.0');
  assertContains('routeros-panel.env.example', 'ROS_PANEL_PORT=28646');
  assertContains('routeros-panel.env.example', 'ROS_PANEL_TARGET_IP=auto');
  assertContains('routeros-panel.env.example', 'ROS_PANEL_TRUST_PROXY_HEADERS=0');

  assertContains('.env.docker.example', 'ROS_PANEL_PUBLISHED_ADDR=0.0.0.0');
  assertContains('.env.docker.example', 'ROS_PANEL_PUBLISHED_PORT=28646');
  assertContains('.env.docker.example', 'ROS_PANEL_IMAGE=ghcr.io/cullysu/ros-ikuai-monitor-panel:main');
  assertContains('.env.docker.example', 'ROS_PANEL_TARGET_IP=auto');
  assertContains('.env.docker.example', 'ROS_PANEL_TRUST_PROXY_HEADERS=0');
  assertContains('Dockerfile', 'ROS_PANEL_TARGET_IP=auto');
  assertContains('Dockerfile', 'ROS_PANEL_TRUST_PROXY_HEADERS=0');
  assertContains('compose.yml', '${ROS_PANEL_IMAGE:-ghcr.io/cullysu/ros-ikuai-monitor-panel:main}');
  assertContains('compose.yml', '${ROS_PANEL_PUBLISHED_ADDR:-0.0.0.0}:${ROS_PANEL_PUBLISHED_PORT:-28646}:${ROS_PANEL_PORT:-28646}');
  assertContains('compose.yml', 'ROS_PANEL_BIND: "${ROS_PANEL_BIND:-0.0.0.0}"');
  assertContains('compose.yml', 'ROS_PANEL_TARGET_IP: "${ROS_PANEL_TARGET_IP:-auto}"');
  assertContains('compose.yml', 'ROS_PANEL_TRUST_PROXY_HEADERS: "${ROS_PANEL_TRUST_PROXY_HEADERS:-0}"');

  assertContains('deploy_linux.sh', 'DEFAULT_PANEL_BIND="0.0.0.0"');
  assertContains('deploy_linux.sh', 'DEFAULT_PANEL_TARGET_IP="$(detect_lan_ip)"');
  assertContains('deploy_linux.sh', 'ROS_PANEL_TRUST_PROXY_HEADERS="${ROS_PANEL_TRUST_PROXY_HEADERS:-0}"');

  for (const relPath of browserDocs) {
    assertContains(relPath, '127.0.0.1');
    if (relPath !== 'docs/LOCALHOST_ALIAS.md') {
      assertContains(relPath, '<panel-host-ip>');
    }
    assertNotContains(relPath, 'browser-facing address is always');
    assertNotContains(relPath, 'documented browser-facing address is fixed');
    assertNotContains(relPath, 'same fixed URL while the Docker host is elsewhere');
    assertNotContains(relPath, 'client devices should install the localhost alias');
  }

  assertContains('README.md', lanUrl);
  assertContains('DEPLOY_DOCKER.md', lanUrl);
  assertContains('DEPLOY_WINDOWS_EXE.md', lanUrl);
  assertContains('DEPLOY_LOCAL.md', lanUrl);
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', lanUrl);
  assertContains('docs/LOCALHOST_ALIAS.md', localUrl);
  assertContains('docs/LOCALHOST_ALIAS.md', 'optional');

  assertContains('tools/install-localhost-alias.ps1', 'RouterOS panel localhost alias installed.');
  assertContains('tools/install-localhost-alias.sh', localUrl);
  assertContains('tools/build-windows-exe.ps1', 'localhost-alias');

  console.log('[ok] LAN access defaults are documented and templated; localhost alias is optional');
}

main();
