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
  const localhost = '127.0.0.1';
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
    assertContains(relPath, localhost, localhost);
    assertContains(relPath, port, port);
  }

  assertContains('env.example', 'ROS_PANEL_BIND=127.0.0.1');
  assertContains('env.example', 'ROS_PANEL_PORT=28646');
  assertContains('env.example', 'ROS_PANEL_TARGET_IP=127.0.0.1');

  assertContains('routeros-panel.env.example', 'ROS_PANEL_BIND=127.0.0.1');
  assertContains('routeros-panel.env.example', 'ROS_PANEL_PORT=28646');
  assertContains('routeros-panel.env.example', 'ROS_PANEL_TARGET_IP=127.0.0.1');

  assertContains('.env.docker.example', 'ROS_PANEL_PUBLISHED_ADDR=127.0.0.1');
  assertContains('.env.docker.example', 'ROS_PANEL_PUBLISHED_PORT=28646');
  assertContains('.env.docker.example', 'ROS_PANEL_TARGET_IP=127.0.0.1');
  assertContains('compose.yml', '${ROS_PANEL_PUBLISHED_ADDR:-127.0.0.1}:${ROS_PANEL_PUBLISHED_PORT:-28646}:${ROS_PANEL_PORT:-28646}');

  // Docker containers must still listen inside the container so Docker can
  // publish host-local 127.0.0.1:28646. Guard the host-side default instead.
  assertContains('compose.yml', 'ROS_PANEL_BIND: "${ROS_PANEL_BIND:-0.0.0.0}"');

  assertContains('DEPLOY_WINDOWS_EXE.md', 'ROS_PANEL_TARGET_IP=127.0.0.1');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'ROS_PANEL_BIND value=127.0.0.1');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'ROS_PANEL_TARGET_IP value=127.0.0.1');
  assertNotContains('DEPLOY_ROUTEROS_CONTAINER.md', 'ROS_PANEL_TARGET_IP value=172.18.0.2');
  assertNotContains('DEPLOY_ROUTEROS_CONTAINER.md', 'http://172.18.0.2:28646');

  console.log('[ok] localhost defaults are documented and templated');
}

main();
