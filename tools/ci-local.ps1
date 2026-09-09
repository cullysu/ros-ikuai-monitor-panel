param(
  [switch]$FullBrowser,
  [switch]$SkipWindowsBuild
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $RepoRoot
try {
  python -m py_compile app.py tools/check-collector-regressions.py
  python tools/check-collector-regressions.py
  node tools/check-lan-access-defaults.js
  docker compose --env-file .env.docker.example config --quiet
  powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\check-packaging-preflight.ps1 -StrictInstall

  if (-not $SkipWindowsBuild) {
    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\build-windows-exe.ps1 -NoZip
  }

  if ($FullBrowser) {
    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\check-local-predeploy.ps1 -Profile public -Sections overview -Viewports desktop=1366x900,narrow=390x844 -ScaleScenarios multi
  }
}
finally {
  Pop-Location
}
