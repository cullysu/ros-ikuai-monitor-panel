param(
  [Parameter(Mandatory = $true)]
  [string]$Url,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath,

  [int]$Width = 1600,
  [int]$Height = 1200,
  [int]$WaitMs = 5000,
  [int]$Left = 40,
  [int]$Top = 40,
  [ValidateSet('window', 'app')]
  [string]$Mode = 'window',
  [ValidateSet('edge', 'chrome')]
  [string]$Browser = 'edge',
  [string]$UserDataDir = "D:\cully\Documents\ros-ikuai-monitor-panel\_edge_visible_capture"
)

$ErrorActionPreference = 'Stop'

$browserPath = if ($Browser -eq 'chrome') {
  'C:\Program Files\Google\Chrome\Application\chrome.exe'
} else {
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
}
if (!(Test-Path $browserPath)) {
  throw "Browser not found: $browserPath"
}

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class NativeWindowCapture {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }

  [DllImport("user32.dll")]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

New-Item -ItemType Directory -Force -Path $UserDataDir | Out-Null
$outputDir = Split-Path -Parent $OutputPath
if ($outputDir) {
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

$edgeArgs = @(
  "--user-data-dir=$UserDataDir",
  '--new-window',
  "--window-size=$Width,$Height",
  "--window-position=$Left,$Top",
  '--no-first-run',
  '--no-default-browser-check'
)
if ($Mode -eq 'app') {
  $edgeArgs += "--app=$Url"
} else {
  $edgeArgs += $Url
}

$process = Start-Process -FilePath $browserPath -PassThru -ArgumentList $edgeArgs
$processName = [System.IO.Path]::GetFileNameWithoutExtension($browserPath)
$launchTime = Get-Date

try {
  $deadline = (Get-Date).AddMilliseconds([Math]::Max($WaitMs, 3000))
  $handle = [IntPtr]::Zero
  do {
    Start-Sleep -Milliseconds 300
    try { $process.Refresh() } catch {}
    $handle = if ($null -ne $process.MainWindowHandle -and "$($process.MainWindowHandle)" -ne '') { [IntPtr]$process.MainWindowHandle } else { [IntPtr]::Zero }
    if ($handle -eq [IntPtr]::Zero) {
      $taggedProcessId = Get-CimInstance Win32_Process -Filter "Name = '$processName.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like "*$UserDataDir*" } |
        Sort-Object ProcessId -Descending |
        Select-Object -ExpandProperty ProcessId -First 1
      if ($taggedProcessId) {
        $taggedProcess = Get-Process -Id $taggedProcessId -ErrorAction SilentlyContinue
        if ($taggedProcess) {
          $process = $taggedProcess
          $handle = if ($null -ne $taggedProcess.MainWindowHandle -and "$($taggedProcess.MainWindowHandle)" -ne '') { [IntPtr]$taggedProcess.MainWindowHandle } else { [IntPtr]::Zero }
        }
      }
    }
    if ($handle -eq [IntPtr]::Zero) {
      $candidate = Get-Process -Name $processName -ErrorAction SilentlyContinue |
        Where-Object {
          $_.StartTime -ge $launchTime.AddSeconds(-2) -and $_.MainWindowHandle -ne 0
        } |
        Sort-Object StartTime -Descending |
        Select-Object -First 1
      if ($candidate) {
        $process = $candidate
        $handle = if ($null -ne $candidate.MainWindowHandle -and "$($candidate.MainWindowHandle)" -ne '') { [IntPtr]$candidate.MainWindowHandle } else { [IntPtr]::Zero }
      }
    }
  } while ($handle -eq [IntPtr]::Zero -and (Get-Date) -lt $deadline)
  Start-Sleep -Milliseconds $WaitMs
  $captureLeft = $Left
  $captureTop = $Top
  $captureWidth = $Width
  $captureHeight = $Height

  if ($handle -ne [IntPtr]::Zero) {
    [NativeWindowCapture]::ShowWindow($handle, 5) | Out-Null
    [NativeWindowCapture]::SetForegroundWindow($handle) | Out-Null
    Start-Sleep -Milliseconds 1200

    $rect = New-Object NativeWindowCapture+RECT
    if ([NativeWindowCapture]::GetWindowRect($handle, [ref]$rect)) {
      $captureLeft = $rect.Left
      $captureTop = $rect.Top
      $captureWidth = [Math]::Max(1, $rect.Right - $rect.Left)
      $captureHeight = [Math]::Max(1, $rect.Bottom - $rect.Top)
    }
  }

  $bitmap = New-Object System.Drawing.Bitmap $captureWidth, $captureHeight
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.CopyFromScreen($captureLeft, $captureTop, 0, 0, $bitmap.Size)
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }

  Get-Item -LiteralPath $OutputPath | Select-Object FullName, Length, LastWriteTime
} finally {
  if ($process -and !$process.HasExited) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
  }
}

