param(
    [string]$Python = "python",
    [string]$PackageName = "RouterOS-Triage-Panel-Windows",
    [switch]$NoZip
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BuildVenv = Join-Path $RepoRoot ".venv-build"
$BuildPython = Join-Path $BuildVenv "Scripts\python.exe"
$DistDir = Join-Path $RepoRoot "dist\routeros-triage-panel"
$ZipPath = Join-Path $RepoRoot ("dist\{0}.zip" -f $PackageName)

if (-not (Test-Path -LiteralPath $BuildPython)) {
    & $Python -m venv $BuildVenv
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create build venv with exit code ${LASTEXITCODE}"
    }
}

& $BuildPython -m pip --version
if ($LASTEXITCODE -ne 0) {
    throw "pip is unavailable in build venv; exit code ${LASTEXITCODE}"
}
& $BuildPython -m pip install -r (Join-Path $RepoRoot "requirements.txt") -r (Join-Path $RepoRoot "requirements-build.txt")
if ($LASTEXITCODE -ne 0) {
    throw "dependency install failed with exit code ${LASTEXITCODE}"
}

Push-Location $RepoRoot
try {
    & $BuildPython -m PyInstaller (Join-Path $RepoRoot "routeros-triage-panel.spec") --noconfirm --clean
    if ($LASTEXITCODE -ne 0) {
        throw "PyInstaller failed with exit code ${LASTEXITCODE}"
    }
}
finally {
    Pop-Location
}

if (-not (Test-Path -LiteralPath $DistDir)) {
    throw "Build output not found: $DistDir"
}

$EnvTemplate = Join-Path $RepoRoot "routeros-panel.env.example"
$EnvRuntime = Join-Path $DistDir "routeros-panel.env"
Copy-Item -LiteralPath $EnvTemplate -Destination $EnvRuntime -Force
Copy-Item -LiteralPath $EnvTemplate -Destination (Join-Path $DistDir "routeros-panel.env.example") -Force
Copy-Item -LiteralPath (Join-Path $RepoRoot "README.md") -Destination (Join-Path $DistDir "README.md") -Force
Copy-Item -LiteralPath (Join-Path $RepoRoot "DEPLOY_WINDOWS_EXE.md") -Destination (Join-Path $DistDir "DEPLOY_WINDOWS_EXE.md") -Force
Copy-Item -LiteralPath (Join-Path $RepoRoot "SECURITY.md") -Destination (Join-Path $DistDir "SECURITY.md") -Force

$EnvText = Get-Content -LiteralPath $EnvRuntime -Raw
foreach ($Marker in @(
    "ROS_PANEL_BIND=127.0.0.1",
    "ROS_PANEL_TARGET_IP=127.0.0.1",
    "ROS_PANEL_TRUST_PROXY_HEADERS=0",
    "ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD=0",
    "ROS_PANEL_LOCALHOST_FORWARD_TOKEN=",
    "ROS_PANEL_PROFILE=routeros_only",
    "ROS_PANEL_IP_ALIAS_WRITE_ENABLED=0",
    "ROS_PANEL_EXPOSE_ADMIN_SESSIONS=0",
    "ROS_PANEL_NETWORK_WRITE_ENABLED=1"
)) {
    if (-not $EnvText.Contains($Marker)) {
        throw "Windows EXE env default is missing $Marker"
    }
}

$AliasDir = Join-Path $DistDir "localhost-alias"
New-Item -ItemType Directory -Force -Path $AliasDir | Out-Null
Copy-Item -LiteralPath (Join-Path $RepoRoot "tools\install-localhost-alias.ps1") -Destination (Join-Path $AliasDir "install-localhost-alias.ps1") -Force
Copy-Item -LiteralPath (Join-Path $RepoRoot "tools\uninstall-localhost-alias.ps1") -Destination (Join-Path $AliasDir "uninstall-localhost-alias.ps1") -Force
Copy-Item -LiteralPath (Join-Path $RepoRoot "docs\LOCALHOST_ALIAS.md") -Destination (Join-Path $AliasDir "README.md") -Force

if (-not $NoZip) {
    if (Test-Path -LiteralPath $ZipPath) {
        Remove-Item -LiteralPath $ZipPath -Force
    }
    Compress-Archive -Path (Join-Path $DistDir "*") -DestinationPath $ZipPath -Force
}

Write-Host "EXE directory: $DistDir"
if (-not $NoZip) {
    Write-Host "ZIP package: $ZipPath"
}
