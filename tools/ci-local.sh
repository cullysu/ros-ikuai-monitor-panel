#!/usr/bin/env bash
set -euo pipefail

full_browser=0
skip_docker=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --full-browser)
      full_browser=1
      shift
      ;;
    --skip-docker)
      skip_docker=1
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Usage: bash tools/ci-local.sh [--full-browser] [--skip-docker]" >&2
      exit 2
      ;;
  esac
done

cd "$(dirname "$0")/.."

python -m py_compile app.py tools/check-collector-regressions.py
python tools/check-collector-regressions.py
node tools/check-lan-access-defaults.js
bash -n install.sh
bash -n deploy_linux.sh
bash tools/validate-public-install.sh

if [[ "$skip_docker" != "1" ]]; then
  docker compose --env-file .env.docker.example config --quiet
fi

if [[ "$full_browser" == "1" ]]; then
  powershell -NoProfile -ExecutionPolicy Bypass -File ./tools/check-local-predeploy.ps1 -Profile public -Sections overview -Viewports desktop=1366x900,narrow=390x844 -ScaleScenarios multi
fi
