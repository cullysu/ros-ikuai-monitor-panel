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
}

& $BuildPython -m pip install --upgrade pip
& $BuildPython -m pip install -r (Join-Path $RepoRoot "requirements.txt") -r (Join-Path $RepoRoot "requirements-build.txt")

Push-Location $RepoRoot
try {
    & $BuildPython -m PyInstaller (Join-Path $RepoRoot "routeros-triage-panel.spec") --noconfirm --clean
}
finally {
    Pop-Location
}

if (-not (Test-Path -LiteralPath $DistDir)) {
    throw "Build output not found: $DistDir"
}

Copy-Item -LiteralPath (Join-Path $RepoRoot "routeros-panel.env.example") -Destination (Join-Path $DistDir "routeros-panel.env") -Force
Copy-Item -LiteralPath (Join-Path $RepoRoot "routeros-panel.env.example") -Destination (Join-Path $DistDir "routeros-panel.env.example") -Force
Copy-Item -LiteralPath (Join-Path $RepoRoot "README.md") -Destination (Join-Path $DistDir "README.md") -Force
Copy-Item -LiteralPath (Join-Path $RepoRoot "DEPLOY_WINDOWS_EXE.md") -Destination (Join-Path $DistDir "DEPLOY_WINDOWS_EXE.md") -Force
Copy-Item -LiteralPath (Join-Path $RepoRoot "SECURITY.md") -Destination (Join-Path $DistDir "SECURITY.md") -Force

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
