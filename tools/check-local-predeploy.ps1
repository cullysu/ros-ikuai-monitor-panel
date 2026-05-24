param(
  [string]$Url = "",
  [int]$Port = 0,
  [string]$Python = "python",
  [string]$Out = "",
  [ValidateSet("public", "private", "both")]
  [string]$Profile = "both",
  [string]$Viewports = "",
  [string]$Sections = "",
  [string]$ScaleScenarios = "",
  [switch]$SkipBrowser,
  [switch]$SkipBackend,
  [switch]$KeepServer,
  [switch]$StrictResponsive
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")
$nodeScript = Join-Path $scriptDir "local-predeploy-check.js"

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  throw "node was not found on PATH. Install Node 18+ or run the JS script with an explicit node executable."
}

$argsList = @($nodeScript, "--python", $Python, "--profile", $Profile)
if ($Url) { $argsList += @("--url", $Url) }
if ($Port -gt 0) { $argsList += @("--port", [string]$Port) }
if ($Out) { $argsList += @("--out", $Out) }
if ($Viewports) { $argsList += @("--viewports", $Viewports) }
if ($Sections) { $argsList += @("--sections", $Sections) }
if ($ScaleScenarios) { $argsList += @("--scale-scenarios", $ScaleScenarios) }
if ($SkipBrowser) { $argsList += "--skip-browser" }
if ($SkipBackend) { $argsList += "--skip-backend" }
if ($KeepServer) { $argsList += "--keep-server" }
if ($StrictResponsive) { $argsList += "--strict-responsive" }

Push-Location $repoRoot
try {
  & $node.Source @argsList
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
