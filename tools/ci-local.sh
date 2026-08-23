#!/usr/bin/env bash
set -euo pipefail

export CODEX_MEMORY_LIMIT_MB=2048
export NODE_OPTIONS=--max-old-space-size=2048

full_browser=0
lite_browser=0
skip_docker=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --full-browser)
      full_browser=1
      shift
      ;;
    --lite-browser)
      lite_browser=1
      shift
      ;;
    --skip-docker)
      skip_docker=1
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Usage: bash tools/ci-local.sh [--full-browser] [--lite-browser] [--skip-docker]" >&2
      exit 2
      ;;
  esac
done

cd "$(dirname "$0")/.."

npm ci

python -m py_compile app.py panel_backend/rate_evidence.py tools/check-collector-regressions.py tools/check-decision-ledger-sync.py tools/test-decision-ledger-sync.py .agents/skills/router-panel-product-loop/scripts/merge_matrix_reports.py .agents/skills/router-panel-product-loop/scripts/release_checkpoint.py .agents/skills/router-panel-product-loop/tests/test_merge_matrix_reports.py .agents/skills/router-panel-product-loop/tests/test_release_checkpoint.py
python tools/check-collector-regressions.py
python tools/test-decision-ledger-sync.py -v
python tools/check-decision-ledger-sync.py
node tools/check-current-state-authority.js
node tools/check-current-release-boundary.js
node tools/check-review-adjudication.js
node tools/check-decision-truth-integration.js
node tools/check-responsive-doc-authority.js
node tools/check-canonical-route.js
python tools/check-decision-repository-current-pointer.py
python .agents/skills/router-panel-product-loop/tests/test_merge_matrix_reports.py -v
python .agents/skills/router-panel-product-loop/tests/test_release_checkpoint.py -v
node tools/check-lan-access-defaults.js
node tools/check-overview-ikuai-static.js
node tools/check-report-truth.js
node tools/check-acceptance-report-quarantine.js
node tools/check-report-completeness-quarantine.js
node tools/check-acceptance-artifact-identity.js
node tools/test-framework-asset-budget.js
node tools/test-local-predeploy-matrix-contract.js
node tools/test-public-release-semantic-gates.js
npm run check:release-gates
bash -n install.sh
bash -n deploy_linux.sh
bash tools/validate-public-install.sh

if [[ "$skip_docker" != "1" ]]; then
  docker compose --env-file .env.docker.example config --quiet
fi

if [[ "$full_browser" == "1" ]]; then
  node tools/local-predeploy-check.js \
    --profile public \
    --viewports desktop=1366x768,narrow=390x844 \
    --sections overview \
    --scale-scenarios single,fleet,all-offline,no-snapshot,collection-down,resource-full,interfaces-down \
    --strict-responsive \
    --out _acceptance/ci-local-full-browser
fi

if [[ "$lite_browser" == "1" ]]; then
  node tools/local-predeploy-check.js \
    --profile public \
    --viewports desktop=1366x768,narrow=390x844 \
    --sections overview \
    --scale-scenarios single,fleet,all-offline,no-snapshot,collection-down,resource-full,interfaces-down \
    --out _acceptance/ci-local-lite-browser
fi
