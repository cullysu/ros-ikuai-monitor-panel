param(
  [Parameter(Mandatory = $true)]
  [string]$Url,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath,

  [int]$Width = 1600,
  [int]$Height = 2400,
  [int]$DelayMs = 1800,
  [string]$UserDataDir = "D:\cully\Documents\ros-ikuai-monitor-panel\_wv2_profile"
)

$ErrorActionPreference = 'Stop'

$coreDll = 'C:\Program Files (x86)\Brother\iPrint&Scan\IPSMONITOR\Microsoft.Web.WebView2.Core.dll'
$winFormsDll = 'C:\Program Files (x86)\Brother\iPrint&Scan\IPSMONITOR\Microsoft.Web.WebView2.WinForms.dll'

if (!(Test-Path $coreDll)) { throw "WebView2 Core DLL not found: $coreDll" }
if (!(Test-Path $winFormsDll)) { throw "WebView2 WinForms DLL not found: $winFormsDll" }

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Reflection.Assembly]::LoadFrom($coreDll) | Out-Null
try {
  Add-Type -Path $winFormsDll
} catch [System.Reflection.ReflectionTypeLoadException] {
  $_.Exception.LoaderExceptions | ForEach-Object { Write-Error $_.Message }
  throw
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
$resolvedUserData = [System.IO.Path]::GetFullPath($UserDataDir)

[System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($resolvedOutput)) | Out-Null
[System.IO.Directory]::CreateDirectory($resolvedUserData) | Out-Null

$form = New-Object System.Windows.Forms.Form
$form.Text = 'CodexWebView2Capture'
$form.StartPosition = 'Manual'
$form.Left = -32000
$form.Top = -32000
$form.Width = $Width
$form.Height = $Height
$form.ShowInTaskbar = $false

$webView = New-Object Microsoft.Web.WebView2.WinForms.WebView2
$creation = New-Object Microsoft.Web.WebView2.WinForms.CoreWebView2CreationProperties
$creation.UserDataFolder = $resolvedUserData
$webView.CreationProperties = $creation
$webView.Dock = [System.Windows.Forms.DockStyle]::Fill
$form.Controls.Add($webView)

$captureError = $null
$captured = $false

$webView.add_NavigationCompleted({
  param($sender, $args)
  try {
    Start-Sleep -Milliseconds $DelayMs
    $stream = New-Object System.IO.MemoryStream
    $sender.CoreWebView2.CapturePreviewAsync(
      [Microsoft.Web.WebView2.Core.CoreWebView2CapturePreviewImageFormat]::Png,
      $stream
    ).GetAwaiter().GetResult()
    [System.IO.File]::WriteAllBytes($resolvedOutput, $stream.ToArray())
    $captured = $true
  } catch {
    $captureError = $_
  } finally {
    $form.BeginInvoke([System.Action]{ $form.Close() }) | Out-Null
  }
})

$form.add_Shown({
  try {
    $webView.EnsureCoreWebView2Async($null).GetAwaiter().GetResult() | Out-Null
    $webView.CoreWebView2.Settings.AreDevToolsEnabled = $false
    $webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = $false
    $webView.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = $false
    $webView.CoreWebView2.Navigate($Url)
  } catch {
    $captureError = $_
    $form.BeginInvoke([System.Action]{ $form.Close() }) | Out-Null
  }
})

[System.Windows.Forms.Application]::Run($form)

if ($captureError) {
  throw $captureError
}

if (!$captured -or !(Test-Path $resolvedOutput)) {
  throw "Capture failed: output not created"
}

Get-Item $resolvedOutput | Select-Object FullName, Length, LastWriteTime

