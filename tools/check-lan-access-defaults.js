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
  assertContains('app.py', 'def validate_panel_public_contract(bind, target, profile="routeros_only"):');
  assertContains('app.py', 'def panel_profile_requires_localhost_contract(profile):');
  assertContains('app.py', 'def panel_host_header_is_allowed(headers):');
  assertContains('panel_backend/http_dispatcher.py', 'Panel is localhost-only. Open http://127.0.0.1:28646/.');
  assertContains('app.py', 'def panel_request_access_url(headers, fallback_port=None):');
  assertContains('app.py', 'PANEL_TRUST_PROXY_HEADERS');
  assertContains('app.py', 'PANEL_ALLOW_DOCKER_HOST_FORWARD');
  assertContains('app.py', 'PANEL_DOCKER_HOST_FORWARD_PEERS');
  assertContains('app.py', 'def validate_panel_forwarding_contract(docker_host_forward, proxy_headers, token_forward):');
  assertContains('app.py', 'Docker host-forward mode cannot trust proxy headers');
  assertContains('app.py', 'Docker host-forward mode and token-forward mode are mutually exclusive');
  assertContains('app.py', 'PANEL_ALLOW_LOCALHOST_HOST_FORWARD');
  assertContains('app.py', 'PANEL_LOCALHOST_FORWARD_TOKEN');
  assertContains('app.py', 'PANEL_LOCAL_SETTINGS_WRITE_ENABLED_RAW');
  assertContains('app.py', '"ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED",');
  assertContains('app.py', 'env_value("ROS_PANEL_NETWORK_WRITE_ENABLED", "auto")');
  assertContains('app.py', 'PANEL_LOCAL_SETTINGS_ENV_KEYS = ("ROS_PANEL_BIND", "ROS_PANEL_PORT", "ROS_PANEL_TARGET_IP")');
  assertContains('app.py', 'def write_panel_local_settings_env(bind, port, target, env_path=None):');
  assertContains('app.py', '"scope": "panel-local-listen-address-only"');
  assertContains('app.py', '"routerosConfigWrites": False');
  assertContains('app.py', '"setting": "ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED"');
  assertContains('app.py', 'never writes RouterOS configuration');
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
  assertContains('install.sh', 'set_env_value "$env_file" "ROS_PANEL_TRUST_PROXY_HEADERS" "0"');
  assertContains('install.sh', 'set_env_value "$env_file" "ROS_PANEL_ALLOW_DOCKER_HOST_FORWARD" "1"');
  assertContains('install.sh', 'set_env_value "$env_file" "ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD" "0"');
  assertContains('install.sh', 'set_env_value "$env_file" "ROS_PANEL_LOCALHOST_FORWARD_TOKEN" ""');
  assertContains('install.sh', 'set_env_value "$env_file" "ROS_PANEL_IP_ALIAS_WRITE_ENABLED" "0"');
  assertContains('install.sh', 'set_env_value "$env_file" "ROS_PANEL_EXPOSE_ADMIN_SESSIONS" "0"');
  assertContains('install.sh', 'set_env_value "$env_file" "ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED" "0"');
  assertNotContains('install.sh', 'Open from other LAN devices');
  assertNotContains('install.sh', 'lan-url:');
  assertNotContains('install.sh', 'allow inbound TCP $PUBLISHED_PORT');
  assertNotContains('install.sh', 'alias-to:');

  assertContains('env.example', 'ROS_PANEL_BIND=127.0.0.1');
  assertContains('env.example', 'ROS_PANEL_PORT=28646');
  assertContains('env.example', 'ROS_PANEL_TARGET_IP=127.0.0.1');
  assertContains('env.example', 'ROS_PANEL_TRUST_PROXY_HEADERS=0');
  assertContains('env.example', 'ROS_PANEL_ALLOW_DOCKER_HOST_FORWARD=0');
  assertContains('env.example', 'ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD=0');
  assertContains('env.example', 'ROS_PANEL_LOCALHOST_FORWARD_TOKEN=');
  assertContains('env.example', 'ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED=auto');

  assertContains('routeros-panel.env.example', 'ROS_PANEL_BIND=127.0.0.1');
  assertContains('routeros-panel.env.example', 'ROS_PANEL_PORT=28646');
  assertContains('routeros-panel.env.example', 'ROS_PANEL_TARGET_IP=127.0.0.1');
  assertContains('routeros-panel.env.example', 'ROS_PANEL_TRUST_PROXY_HEADERS=0');
  assertContains('routeros-panel.env.example', 'ROS_PANEL_ALLOW_DOCKER_HOST_FORWARD=0');
  assertContains('routeros-panel.env.example', 'ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD=0');
  assertContains('routeros-panel.env.example', 'ROS_PANEL_LOCALHOST_FORWARD_TOKEN=');
  assertContains('routeros-panel.env.example', 'ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED=1');
  assertContains('routeros-panel.env.example', 'never enables RouterOS configuration writes');

  assertContains('.env.docker.example', 'ROS_PANEL_PUBLISHED_PORT=28646');
  assertContains('.env.docker.example', 'ROS_PANEL_IMAGE=routeros-triage-panel:local');
  assertContains('.env.docker.example', 'ROS_PANEL_TARGET_IP=127.0.0.1');
  assertContains('.env.docker.example', 'ROS_PANEL_TRUST_PROXY_HEADERS=0');
  assertContains('.env.docker.example', 'ROS_PANEL_ALLOW_DOCKER_HOST_FORWARD=1');
  assertContains('.env.docker.example', 'ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD=0');
  assertContains('.env.docker.example', 'ROS_PANEL_LOCALHOST_FORWARD_TOKEN=');
  assertContains('.env.docker.example', 'ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED=0');
  assertContains('Dockerfile', 'ROS_PANEL_TARGET_IP=127.0.0.1');
  assertContains('Dockerfile', 'ROS_PANEL_TRUST_PROXY_HEADERS=0');
  assertContains('Dockerfile', 'ROS_PANEL_ALLOW_DOCKER_HOST_FORWARD=0');
  assertContains('Dockerfile', 'ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD=0');
  assertNotContains('Dockerfile', 'ROS_PANEL_LOCALHOST_FORWARD_TOKEN=', 'forward token baked into image defaults');
  assertContains('Dockerfile', 'ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED=0');
  assertContains('compose.yml', '${ROS_PANEL_IMAGE:-routeros-triage-panel:local}');
  assertContains('compose.yml', '127.0.0.1:${ROS_PANEL_PUBLISHED_PORT:-28646}:${ROS_PANEL_PORT:-28646}');
  assertNotContains('compose.yml', '${ROS_PANEL_PUBLISHED_ADDR:-', 'overridable Docker host bind');
  assertContains('compose.yml', 'ROS_PANEL_BIND: "${ROS_PANEL_BIND:-0.0.0.0}"');
  assertContains('compose.yml', 'ROS_PANEL_TARGET_IP: "${ROS_PANEL_TARGET_IP:-127.0.0.1}"');
  assertContains('compose.yml', 'ROS_PANEL_TRUST_PROXY_HEADERS: "${ROS_PANEL_TRUST_PROXY_HEADERS:-0}"');
  assertContains('compose.yml', 'ROS_PANEL_ALLOW_DOCKER_HOST_FORWARD: "${ROS_PANEL_ALLOW_DOCKER_HOST_FORWARD:-1}"');
  assertContains('compose.yml', 'ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD: "${ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD:-0}"');
  assertContains('compose.yml', 'ROS_PANEL_LOCALHOST_FORWARD_TOKEN: "${ROS_PANEL_LOCALHOST_FORWARD_TOKEN:-}"');
  assertContains('compose.yml', 'ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED: "${ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED:-0}"');
  assertContains('compose.yml', 'mem_limit: 1536m', 'bounded 1.5 GiB container memory limit');
  assertContains('compose.yml', 'cpus: 1.50', 'bounded 1.50 CPU container limit');
  assertContains('compose.yml', 'pids_limit: 256', 'bounded process-count limit');

  assertContains('deploy_linux.sh', 'DEFAULT_PANEL_BIND="127.0.0.1"');
  assertContains('deploy_linux.sh', 'DEFAULT_PANEL_TARGET_IP="127.0.0.1"');
  assertContains('deploy_linux.sh', 'ROS_PANEL_TRUST_PROXY_HEADERS="${ROS_PANEL_TRUST_PROXY_HEADERS:-0}"');
  assertContains('deploy_linux.sh', 'ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD="${ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD:-0}"');
  assertContains('deploy_linux.sh', 'ROS_PANEL_LOCALHOST_FORWARD_TOKEN="${ROS_PANEL_LOCALHOST_FORWARD_TOKEN:-}"');
  assertContains('deploy_linux.sh', 'ROS_PANEL_IP_ALIAS_WRITE_ENABLED="${ROS_PANEL_IP_ALIAS_WRITE_ENABLED:-0}"');
  assertContains('deploy_linux.sh', 'ROS_PANEL_EXPOSE_ADMIN_SESSIONS="${ROS_PANEL_EXPOSE_ADMIN_SESSIONS:-0}"');
  assertContains('deploy_linux.sh', 'ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED="${ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED:-0}"');
  assertContains('deploy_linux.sh', 'curl -fsS "http://127.0.0.1:${ROS_PANEL_PORT}/api/health"');
  assertContains('routeros-panel.service', 'User=routeros-panel');
  assertContains('routeros-panel.service', 'Group=routeros-panel');
  assertNotContains('routeros-panel.service', 'User=root');
  assertContains('routeros-panel@.service', 'User=routeros-panel');
  assertContains('routeros-panel@.service', 'Group=routeros-panel');
  assertNotContains('routeros-panel@.service', 'User=root');

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
  assertContains('tools/connect-routeros-container-localhost.ps1', 'ForwardToken');
  assertContains('tools/connect-routeros-container-localhost.ps1', 'X-Ros-Panel-Localhost-Forward');
  assertContains('tools/connect-routeros-container-localhost.py', '127.0.0.1');
  assertContains('tools/connect-routeros-container-localhost.py', '--forward-token');
  assertContains('tools/connect-routeros-container-localhost.py', 'X-Ros-Panel-Localhost-Forward');

  assertContains('tools/install-localhost-alias.ps1', 'RouterOS panel localhost alias installed.');
  assertContains('tools/install-localhost-alias.sh', localUrl);
  assertContains('tools/build-windows-exe.ps1', 'localhost-alias');

  console.log('[ok] strict localhost-only defaults are documented, templated, and guarded');
}

main();
