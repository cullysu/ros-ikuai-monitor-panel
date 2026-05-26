#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[check] install.sh syntax"
bash -n install.sh

echo "[check] install.sh help"
bash install.sh --help >/dev/null

echo "[check] install.sh dry-run"
dry_run_output="$(bash install.sh --dry-run --source-dir "$ROOT_DIR" --dir "${TMPDIR:-/tmp}/routeros-panel-install-check")"
printf '%s\n' "$dry_run_output" | grep -F "bind:       0.0.0.0" >/dev/null
printf '%s\n' "$dry_run_output" | grep -F "image:      routeros-triage-panel:local" >/dev/null
printf '%s\n' "$dry_run_output" | grep -F "mode:       local-build" >/dev/null
printf '%s\n' "$dry_run_output" | grep -F "port:       28646" >/dev/null
printf '%s\n' "$dry_run_output" | grep -E "target-ip:  ([0-9]{1,3}\.){3}[0-9]{1,3}|target-ip:  [A-Za-z0-9._-]+" >/dev/null
printf '%s\n' "$dry_run_output" | grep -F "local-url:  http://127.0.0.1:28646/" >/dev/null
printf '%s\n' "$dry_run_output" | grep -E "lan-url:    http://[^[:space:]]+:28646/" >/dev/null
printf '%s\n' "$dry_run_output" | grep -F "firewall:   allow inbound TCP 28646" >/dev/null

echo "[check] install.sh public pull dry-run"
pull_dry_run_output="$(bash install.sh --dry-run --prebuilt --dir "${TMPDIR:-/tmp}/routeros-panel-pull-check")"
printf '%s\n' "$pull_dry_run_output" | grep -F "image:      ghcr.io/cullysu/ros-ikuai-monitor-panel:main" >/dev/null
printf '%s\n' "$pull_dry_run_output" | grep -F "mode:       pull-then-build-fallback" >/dev/null

echo "[check] install.sh local-only dry-run"
local_only_output="$(bash install.sh --dry-run --local-only --source-dir "$ROOT_DIR" --dir "${TMPDIR:-/tmp}/routeros-panel-local-only-check")"
printf '%s\n' "$local_only_output" | grep -F "bind:       127.0.0.1" >/dev/null
printf '%s\n' "$local_only_output" | grep -F "lan-url:    <disabled: bind is 127.0.0.1>" >/dev/null
printf '%s\n' "$local_only_output" | grep -F "firewall:   not applicable until --bind 0.0.0.0 or --lan is used" >/dev/null

if command -v node >/dev/null 2>&1; then
  echo "[check] LAN access defaults"
  node tools/check-lan-access-defaults.js
else
  echo "[skip] node is not available"
fi

if docker compose version >/dev/null 2>&1; then
  echo "[check] docker compose config"
  docker compose --env-file .env.docker.example config --quiet
elif command -v docker-compose >/dev/null 2>&1; then
  echo "[check] docker-compose config"
  docker-compose --env-file .env.docker.example config --quiet
else
  echo "[skip] docker compose is not available"
fi

echo "[ok] public install checks passed"
