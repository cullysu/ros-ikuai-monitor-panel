param(
  [int]$ListenPort = 28646,
  [string]$InstallDir = (Join-Path $env:LOCALAPPDATA "RouterOSTriagePanel\localhost-alias"),
  [switch]$KeepFiles
)

$ErrorActionPreference = "SilentlyContinue"

$startupDir = [Environment]::GetFolderPath("Startup")
$startupFile = Join-Path $startupDir "RouterOSPanelLocalhostAlias-$ListenPort.cmd"
$pidPath = Join-Path $InstallDir "forwarder.pid"

if (Test-Path -LiteralPath $pidPath) {
  $pidText = Get-Content -LiteralPath $pidPath -Raw
  $pidValue = 0
  if ([int]::TryParse($pidText.Trim(), [ref]$pidValue)) {
    Stop-Process -Id $pidValue -Force
  }
  Remove-Item -LiteralPath $pidPath -Force
}

$listeners = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $ListenPort -State Listen
foreach ($listener in @($listeners)) {
  $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)").CommandLine
  if ($cmd -and $cmd.Contains("routeros-panel-localhost-forwarder")) {
    Stop-Process -Id $listener.OwningProcess -Force
  }
}

Remove-Item -LiteralPath $startupFile -Force
if (-not $KeepFiles) {
  Remove-Item -LiteralPath $InstallDir -Recurse -Force
}

Write-Host "RouterOS panel localhost alias removed for 127.0.0.1:$ListenPort."
