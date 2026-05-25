#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[check] install.sh syntax"
bash -n install.sh

echo "[check] install.sh help"
bash install.sh --help >/dev/null

echo "[check] install.sh dry-run"
bash install.sh --dry-run --source-dir "$ROOT_DIR" --dir "${TMPDIR:-/tmp}/routeros-panel-install-check" --lan --port 28647 >/dev/null

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
