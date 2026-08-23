param(
  [switch]$FullBrowser,
  [switch]$LiteBrowser,
  [switch]$SkipWindowsBuild
)

$ErrorActionPreference = 'Stop'
$env:CODEX_MEMORY_LIMIT_MB = '2048'
$env:NODE_OPTIONS = '--max-old-space-size=2048'
$RepoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $RepoRoot
try {
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
  node tools/test-local-predeploy-matrix-contract.js
  npm run check:release-gates
  docker compose --env-file .env.docker.example config --quiet
  powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\check-packaging-preflight.ps1 -StrictInstall

  if (-not $SkipWindowsBuild) {
    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\build-windows-exe.ps1 -NoZip
  }

  if ($FullBrowser) {
    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\check-local-predeploy.ps1 -Profile public -Sections overview -Viewports desktop=1366x768,narrow=390x844 -ScaleScenarios single,fleet,all-offline,no-snapshot,collection-down,resource-full,interfaces-down
  }

  if ($LiteBrowser) {
    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\check-overview-ikuai-lite.ps1
  }
}
finally {
  Pop-Location
}
