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

  assertContains('compose.yml', '${ROS_PANEL_IMAGE:-routeros-triage-panel:local}');
  assertContains('.env.docker.example', 'ROS_PANEL_IMAGE=routeros-triage-panel:local');
  assertContains('.env.docker.example', `# ROS_PANEL_IMAGE=${ghcrImage}`);
  assertContains('install.sh', 'DEFAULT_LOCAL_IMAGE="routeros-triage-panel:local"');
  assertContains('install.sh', `DEFAULT_PREBUILT_IMAGE="${ghcrImage}"`);
  assertContains('install.sh', 'pull routeros-triage');
  assertContains('install.sh', 'falling back to local Docker build');
  assertContains('install.sh', '--prebuilt');
  assertContains('install.sh', '--build-local');
  assertContains('install.sh', '--local-only');
  assertContains('install.sh', 'PUBLISHED_ADDR="127.0.0.1"');
  assertContains('install.sh', '--lan is not supported by the public installer');
  assertContains('install.sh', 'exposure:   localhost-only');
  assertContains('install.sh', 'ROS_PANEL_TRUST_PROXY_HEADERS');
  assertContains('install.sh', 'ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD');
  assertContains('install.sh', 'ROS_PANEL_IP_ALIAS_WRITE_ENABLED');
  assertContains('install.sh', 'ROS_PANEL_EXPOSE_ADMIN_SESSIONS');
  assertContains('install.sh', 'ROS_PANEL_NETWORK_WRITE_ENABLED');

  assertContains('PRODUCT_MODEL.md', '## Public Delivery Contract');
  assertContains('PRODUCT_MODEL.md', 'Docker / Compose');
  assertContains('PRODUCT_MODEL.md', 'Windows EXE');
  assertContains('PRODUCT_MODEL.md', 'Linux systemd / VM');
  assertContains('PRODUCT_MODEL.md', 'RouterOS Container');
  assertContains('README.md', '## Public Delivery Matrix');
  assertContains('README.zh-CN.md', '## 公开交付矩阵');
  assertContains('DEPLOY_DOCKER.md', 'Docker / Compose is one of the four public delivery modes');
  assertContains('DEPLOY_WINDOWS_EXE.md', 'Windows EXE is one of the four public delivery modes');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'RouterOS Container is one of the four public delivery modes');
  assertContains('DEPLOY_LOCAL.md', 'Local Python is a development and trial path');

  assertContains('tools/build-routeros-container-archive.sh', 'docker buildx build');
  assertContains('tools/build-routeros-container-archive.sh', 'docker save');
  assertContains('tools/build-routeros-container-archive.sh', '--provenance=false');
  assertContains('tools/build-routeros-container-archive.sh', 'convert-oci-to-routeros-docker-archive.py');
  assertContains('tools/build-routeros-container-archive.sh', 'Use a client-local forwarder');
  assertContains('tools/convert-oci-to-routeros-docker-archive.py', 'IMAGE_INDEX_MEDIA_TYPES');
  assertContains('.gitignore', '/*.tar');
  assertContains('DEPLOY_DOCKER.md', ghcrImage);
  assertContains('README.md', ghcrImage);
  assertContains('README.md', 'Default public path: build a RouterOS-friendly archive locally');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', ghcrImage);
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'The default public path is to build a RouterOS-friendly archive locally');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'Local archive, default public path');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'Optional registry image, only after the GHCR package is public');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'connect-routeros-container-localhost.ps1');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'http://127.0.0.1:28646/');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'Host header guard');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD=1');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'ROS_PANEL_LOCALHOST_FORWARD_TOKEN');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', '--forward-token');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'Host: 127.0.0.1:28646');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', '/container/start [find where root-dir="disk1/routeros-triage"]');
  assertNotContains('DEPLOY_ROUTEROS_CONTAINER.md', 'YOUR_ORG/routeros-triage-panel:TAG');
  assertNotContains('DEPLOY_ROUTEROS_CONTAINER.md', 'remote-image~"routeros-triage-panel"');

  assertContains('Dockerfile', 'USER panel');
  assertContains('Dockerfile', 'ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD=0');
  assertNotContains('Dockerfile', 'ROS_PANEL_LOCALHOST_FORWARD_TOKEN=', 'forward token baked into image defaults');
  assertContains('Dockerfile', 'ROS_PANEL_NETWORK_WRITE_ENABLED=0');
  assertContains('Dockerfile', 'chown -R root:root /app');
  assertContains('Dockerfile', 'chown panel:panel /app/data');
  assertContains('Dockerfile', 'chmod 0750 /app/data');
  assertContains('compose.yml', 'read_only: true');
  assertContains('compose.yml', 'ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD: "${ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD:-0}"');
  assertContains('compose.yml', 'ROS_PANEL_LOCALHOST_FORWARD_TOKEN: "${ROS_PANEL_LOCALHOST_FORWARD_TOKEN:-}"');
  assertContains('compose.yml', 'ROS_PANEL_NETWORK_WRITE_ENABLED: "${ROS_PANEL_NETWORK_WRITE_ENABLED:-0}"');
  assertContains('compose.yml', 'no-new-privileges:true');
  assertContains('deploy_linux.sh', 'useradd --system --user-group');
  assertContains('deploy_linux.sh', 'ROS_PANEL_NETWORK_WRITE_ENABLED="${ROS_PANEL_NETWORK_WRITE_ENABLED:-0}"');
  assertContains('deploy_linux.sh', 'sudo chown -R root:root "${APP_DIR}"');
  assertContains('deploy_linux.sh', 'sudo chown -R "${PANEL_RUNTIME_USER}:${PANEL_RUNTIME_GROUP}" "${APP_DIR}/data"');
  assertContains('deploy_linux.sh', 'curl -fsS "http://127.0.0.1:${ROS_PANEL_PORT}/api/health"');
  assertContains('routeros-panel.service', 'User=routeros-panel');
  assertContains('routeros-panel.service', 'Group=routeros-panel');
  assertNotContains('routeros-panel.service', 'ros-panel-ip.service', 'implicit IP helper dependency');
  assertContains('routeros-panel@.service', 'User=routeros-panel');
  assertContains('routeros-panel@.service', 'Group=routeros-panel');
  assertNotContains('routeros-panel@.service', 'ros-panel-ip@.service', 'implicit template IP helper dependency');
  assertContains('tools/build-windows-exe.ps1', 'ROS_PANEL_BIND=127.0.0.1');
  assertContains('tools/build-windows-exe.ps1', 'ROS_PANEL_NETWORK_WRITE_ENABLED=1');
  assertContains('.github/workflows/ci.yml', 'Windows env is missing loopback bind default');
  assertContains('.github/workflows/ci.yml', 'Windows env is missing panel address write default');

  console.log('[ok] public release readiness markers are present');
}

main();
