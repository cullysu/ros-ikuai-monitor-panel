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
  const ghcrImage = 'ghcr.io/cullysu/ros-ikuai-monitor-panel:main';

  assertContains('.github/workflows/container-image.yml', 'packages: write');
  assertContains('.github/workflows/container-image.yml', 'docker/build-push-action@v6');
  assertContains('.github/workflows/container-image.yml', 'platforms: linux/amd64,linux/arm64');
  assertContains('.github/workflows/container-image.yml', 'ghcr.io/${{ github.repository }}');

  assertContains('compose.yml', '${ROS_PANEL_IMAGE:-ghcr.io/cullysu/ros-ikuai-monitor-panel:main}');
  assertContains('.env.docker.example', `ROS_PANEL_IMAGE=${ghcrImage}`);
  assertContains('install.sh', `PANEL_IMAGE="\${ROS_PANEL_IMAGE:-${ghcrImage}}"`);
  assertContains('install.sh', 'pull routeros-triage');
  assertContains('install.sh', 'falling back to local Docker build');
  assertContains('install.sh', '--build-local');
  assertContains('install.sh', '--local-only');
  assertContains('install.sh', '<disabled: bind is 127.0.0.1>');

  assertContains('DEPLOY_DOCKER.md', ghcrImage);
  assertContains('README.md', ghcrImage);
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', ghcrImage);
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'routeros-triage container panel LAN exposure');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', '/tool/fetch url="http://172.18.0.2:28646/api/health"');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', '/ip/firewall/nat/add chain=dstnat');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', '/ip/firewall/nat/remove [find where comment="routeros-triage container panel LAN exposure"]');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', '/container/start [find where root-dir="disk1/routeros-triage"]');
  assertNotContains('DEPLOY_ROUTEROS_CONTAINER.md', 'YOUR_ORG/routeros-triage-panel:TAG');
  assertNotContains('DEPLOY_ROUTEROS_CONTAINER.md', 'remote-image~"routeros-triage-panel"');

  console.log('[ok] public release readiness markers are present');
}

main();
