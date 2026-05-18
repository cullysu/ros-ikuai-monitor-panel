param(
  [Parameter(Mandatory = $true)]
  [string]$Section,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath,

  [Parameter(Mandatory = $true)]
  [string]$StatePath,

  [int]$ScrollY = 360,
  [int]$Port = 9233,
  [int]$WaitMs = 3000,
  [int]$SettleMs = 1200,
  [string]$BaseUrl = 'http://192.168.3.5/',
  [string]$EdgePath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
  [string]$UserDataDir = "D:\cully\Documents\ros-ikuai-monitor-panel\_edge_headless_compact_capture_$Section"
)

$ErrorActionPreference = 'Stop'

if (!(Test-Path $EdgePath)) {
  throw "Edge not found: $EdgePath"
}

$browserProcessName = [System.IO.Path]::GetFileNameWithoutExtension($EdgePath)

$outputDir = Split-Path -Parent $OutputPath
if ($outputDir) {
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}
$stateDir = Split-Path -Parent $StatePath
if ($stateDir) {
  New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
}
New-Item -ItemType Directory -Force -Path $UserDataDir | Out-Null

$url = if ($BaseUrl.Contains('?')) {
  '{0}&section={1}' -f $BaseUrl, $Section
} else {
  '{0}?section={1}' -f $BaseUrl, $Section
}

$existing = Get-CimInstance Win32_Process -Filter "Name = '$browserProcessName.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like "*--remote-debugging-port=$Port*" }
if ($existing) {
  $existing | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

$proc = Start-Process -FilePath $EdgePath -PassThru -ArgumentList @(
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  "--remote-debugging-port=$Port",
  "--user-data-dir=$UserDataDir",
  '--window-size=1400,900',
  $url
)

$enc = [System.Text.Encoding]::UTF8
$cts = [System.Threading.CancellationTokenSource]::new()
$ws = $null

function Send-Cdp {
  param(
    [Parameter(Mandatory = $true)]$Socket,
    [Parameter(Mandatory = $true)][int]$Id,
    [Parameter(Mandatory = $true)][string]$Method,
    $Params
  )
  $payload = @{ id = $Id; method = $Method }
  if ($null -ne $Params) {
    $payload.params = $Params
  }
  $json = $payload | ConvertTo-Json -Depth 10 -Compress
  $bytes = $enc.GetBytes($json)
  $segment = [System.ArraySegment[byte]]::new($bytes)
  [void]$Socket.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token).GetAwaiter().GetResult()
}

function Receive-Cdp {
  param(
    [Parameter(Mandatory = $true)]$Socket,
    [Parameter(Mandatory = $true)][int]$ExpectedId
  )
  $buffer = New-Object byte[] 262144
  while ($true) {
    $ms = New-Object System.IO.MemoryStream
    do {
      $segment = [System.ArraySegment[byte]]::new($buffer)
      $result = $Socket.ReceiveAsync($segment, $cts.Token).GetAwaiter().GetResult()
      if ($result.Count -gt 0) {
        $ms.Write($buffer, 0, $result.Count)
      }
    } while (-not $result.EndOfMessage)

    $message = $enc.GetString($ms.ToArray())
    if (-not $message) {
      continue
    }

    $obj = $message | ConvertFrom-Json
    if ($obj.id -eq $ExpectedId) {
      return $obj
    }
  }
}

try {
  $targets = $null
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    try {
      $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json" -TimeoutSec 2
      if ($targets) { break }
    } catch {
    }
  }

  if (-not $targets) {
    throw 'CDP targets not available'
  }

  $target = $targets | Where-Object { $_.type -eq 'page' -and $_.url -like 'http://192.168.3.5/*' } | Select-Object -First 1
  if (-not $target) {
    $target = $targets | Where-Object { $_.type -eq 'page' } | Select-Object -First 1
  }
  if (-not $target.websocketDebuggerUrl) {
    throw 'No websocket debugger URL found'
  }

  $ws = [System.Net.WebSockets.ClientWebSocket]::new()
  [void]$ws.ConnectAsync([Uri]$target.websocketDebuggerUrl, $cts.Token).GetAwaiter().GetResult()

  Send-Cdp $ws 1 'Page.enable' @{}
  [void](Receive-Cdp $ws 1)
  Send-Cdp $ws 2 'Runtime.enable' @{}
  [void](Receive-Cdp $ws 2)

  Start-Sleep -Milliseconds $WaitMs

  Send-Cdp $ws 3 'Runtime.evaluate' @{
    expression = "window.scrollTo(0, $ScrollY); window.dispatchEvent(new Event('scroll')); 'scrolled'"
    returnByValue = $true
    awaitPromise = $true
  }
  [void](Receive-Cdp $ws 3)

  Start-Sleep -Milliseconds $SettleMs

  $expr = @"
JSON.stringify((() => {
  const frame = document.querySelector('.frame');
  const topbar = document.querySelector('.topbar');
  const pageTitle = document.querySelector('.page-title');
  const topMetrics = document.getElementById('topMetrics');
  const sticky = document.querySelector('.section#$Section .section-summary-sticky, .section#$Section .arp-summary-sticky');
  const fixedSummary = document.getElementById('compactSummaryPinnedHost');
  const rootStyle = getComputedStyle(document.documentElement);
  const topbarStyle = topbar ? getComputedStyle(topbar) : null;
  const fixedSummaryStyle = fixedSummary ? getComputedStyle(fixedSummary) : null;
  const titleRect = pageTitle ? pageTitle.getBoundingClientRect() : null;
  const topbarRect = topbar ? topbar.getBoundingClientRect() : null;
  const stickyRect = sticky ? sticky.getBoundingClientRect() : null;
  const fixedSummaryRect = fixedSummary ? fixedSummary.getBoundingClientRect() : null;
  return {
    currentSection: typeof currentSection === 'string' ? currentSection : null,
    scrollY: Math.round(window.scrollY || 0),
    frameClassName: frame ? frame.className : null,
    frameClasses: frame ? Array.from(frame.classList) : [],
    hasSticky: Boolean(sticky),
    stickyTop: stickyRect ? Math.round(stickyRect.top) : null,
    stickyBottom: stickyRect ? Math.round(stickyRect.bottom) : null,
    stickyHeight: stickyRect ? Math.round(stickyRect.height) : null,
    stickyTextLength: sticky ? (sticky.innerText || '').trim().length : 0,
    fixedSummaryDisplay: fixedSummaryStyle ? fixedSummaryStyle.display : null,
    fixedSummaryTop: fixedSummaryRect ? Math.round(fixedSummaryRect.top) : null,
    fixedSummaryBottom: fixedSummaryRect ? Math.round(fixedSummaryRect.bottom) : null,
    fixedSummaryHeight: fixedSummaryRect ? Math.round(fixedSummaryRect.height) : null,
    fixedSummaryTextLength: fixedSummary ? (fixedSummary.innerText || '').trim().length : 0,
    topbarHeightVar: rootStyle.getPropertyValue('--topbar-height').trim(),
    topbarDisplay: topbarStyle ? topbarStyle.display : null,
    topbarVisibility: topbarStyle ? topbarStyle.visibility : null,
    topbarOpacity: topbarStyle ? topbarStyle.opacity : null,
    topbarMaxHeight: topbarStyle ? topbarStyle.maxHeight : null,
    topbarTop: topbarRect ? Math.round(topbarRect.top) : null,
    topbarBottom: topbarRect ? Math.round(topbarRect.bottom) : null,
    pageTitleTop: titleRect ? Math.round(titleRect.top) : null,
    pageTitleBottom: titleRect ? Math.round(titleRect.bottom) : null,
    topMetricsDisplay: topMetrics ? getComputedStyle(topMetrics).display : null
  };
})())
"@

  Send-Cdp $ws 4 'Runtime.evaluate' @{
    expression = $expr
    returnByValue = $true
    awaitPromise = $true
  }
  $stateResp = Receive-Cdp $ws 4
  $stateJson = $stateResp.result.result.value
  $stateJson | Set-Content -Path $StatePath -Encoding UTF8
  $state = $stateJson | ConvertFrom-Json

  Send-Cdp $ws 5 'Page.captureScreenshot' @{
    format = 'png'
    fromSurface = $true
    captureBeyondViewport = $false
  }
  $shotResp = Receive-Cdp $ws 5
  [IO.File]::WriteAllBytes($OutputPath, [Convert]::FromBase64String($shotResp.result.data))

  $fixedSummaryVisible = $state.fixedSummaryDisplay -ne 'none' `
    -and ($null -ne $state.fixedSummaryTop) `
    -and ([int]$state.fixedSummaryTop -ge 0) `
    -and ([int]$state.fixedSummaryTop -le 4) `
    -and ($null -ne $state.fixedSummaryBottom) `
    -and ([int]$state.fixedSummaryBottom -gt 0) `
    -and ($state.fixedSummaryTextLength -gt 0)
  $stickyVisible = $state.hasSticky `
    -and ($null -ne $state.stickyTop) `
    -and ([int]$state.stickyTop -ge 0) `
    -and ([int]$state.stickyTop -le 4) `
    -and ($null -ne $state.stickyBottom) `
    -and ([int]$state.stickyBottom -gt 0) `
    -and ($state.stickyTextLength -gt 0)
  $isCompact = $state.hasSticky `
    -and ($state.frameClasses -contains 'page-compact-topbar') `
    -and ($Section -ne 'arp' -or ($state.frameClasses -contains 'arp-compact')) `
    -and ($state.topbarHeightVar -eq '0px') `
    -and ($state.topMetricsDisplay -eq 'none') `
    -and ($fixedSummaryVisible -or $stickyVisible) `
    -and ($null -ne $state.pageTitleBottom) `
    -and ([int]$state.pageTitleBottom -le 0)

  [PSCustomObject]@{
    Section = $Section
    Url = $url
    CompactOk = $isCompact
    StatePath = $StatePath
    OutputPath = $OutputPath
  }
  $state

  if (-not $isCompact) {
    exit 2
  }
} finally {
  if ($ws) {
    $ws.Dispose()
  }
  if ($cts) {
    $cts.Dispose()
  }
  if ($proc -and -not $proc.HasExited) {
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  }
}
