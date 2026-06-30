param(
  [string]$Profile = "public",
  [string]$Viewports = "desktop=1366x900,narrow=390x844",
  [string]$ScaleScenarios = "single,fleet,all-offline,no-snapshot,collection-down,resource-full,interfaces-down",
  [string]$Out = "",
  [switch]$SkipBackend,
  [switch]$KeepServer,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")
$predeploy = Join-Path $scriptDir "check-local-predeploy.ps1"

$argsList = @(
  "-Profile", $Profile,
  "-Sections", "overview",
  "-Viewports", $Viewports,
  "-ScaleScenarios", $ScaleScenarios
)
if ($Out) { $argsList += @("-Out", $Out) }
if ($SkipBackend) { $argsList += "-SkipBackend" }
if ($KeepServer) { $argsList += "-KeepServer" }

Write-Host "overview iKuai lite render check" -ForegroundColor Cyan
Write-Host "profile: $Profile"
Write-Host "viewports: $Viewports"
Write-Host "scale scenarios: $ScaleScenarios"
if ($DryRun) {
  $displayArgs = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $predeploy) + $argsList
  Write-Host "dry run: powershell $($displayArgs -join ' ')" -ForegroundColor Yellow
  exit 0
}

Push-Location $repoRoot
try {
  & powershell -NoProfile -ExecutionPolicy Bypass -File $predeploy @argsList
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
