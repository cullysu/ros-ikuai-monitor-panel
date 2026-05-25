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
printf '%s\n' "$dry_run_output" | grep -F "bind:       127.0.0.1" >/dev/null
printf '%s\n' "$dry_run_output" | grep -F "port:       28646" >/dev/null
printf '%s\n' "$dry_run_output" | grep -F "target-ip:  127.0.0.1" >/dev/null

if command -v node >/dev/null 2>&1; then
  echo "[check] localhost defaults"
  node tools/check-localhost-defaults.js
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
