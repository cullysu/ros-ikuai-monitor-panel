param(
  [Parameter(Mandatory = $true)]
  [string]$Url,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath,

  [int]$Width = 1600,
  [int]$Height = 2200,
  [int]$WaitMs = 2200,
  [int]$Port = 9242,
  [string]$UserDataDir = "D:\cully\Documents\ros-ikuai-monitor-panel\_edge_cdp_capture"
)

$ErrorActionPreference = 'Stop'

$edgePath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$captureScript = 'D:\cully\Documents\ros-ikuai-monitor-panel\tools\cdp-capture.js'

if (!(Test-Path $edgePath)) { throw "Edge not found: $edgePath" }
if (!(Test-Path $captureScript)) { throw "Capture script not found: $captureScript" }

New-Item -ItemType Directory -Force -Path $UserDataDir | Out-Null
$outputDir = Split-Path -Parent $OutputPath
if ($outputDir) {
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

$edge = Start-Process -FilePath $edgePath -ArgumentList @(
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  "--remote-debugging-port=$Port",
  "--user-data-dir=$UserDataDir",
  $Url
) -PassThru

try {
  $versionJson = ''
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    try {
      $versionJson = curl.exe -s "http://127.0.0.1:$Port/json/version"
      if ($versionJson) { break }
    } catch {
    }
  }

  if (!$versionJson) {
    throw "CDP version endpoint not ready on port $Port"
  }

  $pageWs = $null
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 300
    try {
      $targetsJson = curl.exe -s "http://127.0.0.1:$Port/json/list"
      if ($targetsJson) {
        $targets = $targetsJson | ConvertFrom-Json
        $pageTarget = $targets | Where-Object { $_.type -eq 'page' } | Select-Object -First 1
        if ($pageTarget -and $pageTarget.webSocketDebuggerUrl) {
          $pageWs = $pageTarget.webSocketDebuggerUrl.Trim()
          break
        }
      }
    } catch {
    }
  }

  if (!$pageWs) {
    throw 'Page websocket URL missing'
  }

  & node $captureScript --ws $pageWs --url $Url --out $OutputPath --width $Width --height $Height --wait $WaitMs
  if ($LASTEXITCODE -ne 0) {
    throw "Capture script failed with exit code $LASTEXITCODE"
  }

  Get-Item -LiteralPath $OutputPath | Select-Object FullName, Length, LastWriteTime
} finally {
  if ($edge -and !$edge.HasExited) {
    Stop-Process -Id $edge.Id -Force -ErrorAction SilentlyContinue
  }
}

