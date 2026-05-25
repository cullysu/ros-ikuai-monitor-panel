param(
  [string]$PanelHost = $env:ROUTEROS_PANEL_HOST,
  [int]$PanelPort = $(if ($env:ROUTEROS_PANEL_PORT) { [int]$env:ROUTEROS_PANEL_PORT } else { 28646 }),
  [string]$ListenHost = "127.0.0.1",
  [int]$ListenPort = 28646,
  [string]$InstallDir = (Join-Path $env:LOCALAPPDATA "RouterOSTriagePanel\localhost-alias"),
  [switch]$NoStartup,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

function Fail($Message) {
  Write-Error $Message
  exit 1
}

function Test-HostValue($Value) {
  return -not [string]::IsNullOrWhiteSpace($Value) -and
    $Value -notmatch "://" -and
    $Value -notmatch "[/\\?#\s]"
}

if (-not (Test-HostValue $PanelHost)) {
  Fail "Set -PanelHost <panel-server-host>, or set ROUTEROS_PANEL_HOST before running this installer."
}

if ($PanelPort -lt 1 -or $PanelPort -gt 65535 -or $ListenPort -lt 1 -or $ListenPort -gt 65535) {
  Fail "Ports must be between 1 and 65535."
}

[void][System.Net.IPAddress]::Parse($ListenHost)

$startupDir = [Environment]::GetFolderPath("Startup")
$startupFile = Join-Path $startupDir "RouterOSPanelLocalhostAlias-$ListenPort.cmd"
$forwarderExe = Join-Path $InstallDir "routeros-panel-localhost-forwarder.exe"
$configPath = Join-Path $InstallDir "config.json"
$pidPath = Join-Path $InstallDir "forwarder.pid"
$logPath = Join-Path $InstallDir "forwarder.log"

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

$existing = Get-NetTCPConnection -LocalAddress $ListenHost -LocalPort $ListenPort -State Listen -ErrorAction SilentlyContinue
if ($existing) {
  $owned = $false
  foreach ($row in @($existing)) {
    $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($row.OwningProcess)" -ErrorAction SilentlyContinue).CommandLine
    if ($cmd -and $cmd.Contains("routeros-panel-localhost-forwarder")) {
      $owned = $true
    }
  }
  if (-not $owned -and -not $Force) {
    Fail "$ListenHost`:$ListenPort is already in use. Stop that app or rerun with -Force only if it is the old alias forwarder."
  }
}

if (Test-Path -LiteralPath $pidPath) {
  $pidText = Get-Content -LiteralPath $pidPath -Raw
  $pidValue = 0
  if ([int]::TryParse($pidText.Trim(), [ref]$pidValue)) {
    Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
  }
  Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
}

$ownedListeners = Get-NetTCPConnection -LocalAddress $ListenHost -LocalPort $ListenPort -State Listen -ErrorAction SilentlyContinue
foreach ($listener in @($ownedListeners)) {
  $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" -ErrorAction SilentlyContinue).CommandLine
  if ($cmd -and $cmd.Contains("routeros-panel-localhost-forwarder")) {
    Stop-Process -Id $listener.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}

$config = [ordered]@{
  listenHost = $ListenHost
  listenPort = $ListenPort
  panelHost = $PanelHost
  panelPort = $PanelPort
  logPath = $logPath
  pidPath = $pidPath
}
$config | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding utf8

$source = @'
using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading.Tasks;

public static class RouterOSPanelLocalhostForwarder
{
    private static string panelHost = "";
    private static int panelPort = 28646;
    private static string logPath = "";

    private static void Log(string message)
    {
        if (String.IsNullOrWhiteSpace(logPath)) return;
        try
        {
            File.AppendAllText(logPath, DateTimeOffset.Now.ToString("o") + " " + message + Environment.NewLine);
        }
        catch {}
    }

    private static async Task CopyEitherWay(TcpClient client)
    {
        using (client)
        using (var target = new TcpClient())
        {
            try
            {
                client.NoDelay = true;
                target.NoDelay = true;
                await target.ConnectAsync(panelHost, panelPort).ConfigureAwait(false);
                using (var clientStream = client.GetStream())
                using (var targetStream = target.GetStream())
                {
                    var toTarget = clientStream.CopyToAsync(targetStream);
                    var toClient = targetStream.CopyToAsync(clientStream);
                    await Task.WhenAny(toTarget, toClient).ConfigureAwait(false);
                }
            }
            catch (Exception ex)
            {
                Log("connection failed: " + ex.GetType().Name + ": " + ex.Message);
            }
        }
    }

    public static void Main(string[] args)
    {
        if (args.Length < 6)
        {
            Console.Error.WriteLine("usage: <listenHost> <listenPort> <panelHost> <panelPort> <logPath> <pidPath>");
            Environment.Exit(2);
        }

        var listenHost = args[0];
        var listenPort = Int32.Parse(args[1]);
        panelHost = args[2];
        panelPort = Int32.Parse(args[3]);
        logPath = args[4];
        var pidPath = args[5];

        Directory.CreateDirectory(Path.GetDirectoryName(logPath));
        File.WriteAllText(pidPath, Process.GetCurrentProcess().Id.ToString());
        Log("starting " + listenHost + ":" + listenPort + " -> " + panelHost + ":" + panelPort);

        var listener = new TcpListener(IPAddress.Parse(listenHost), listenPort);
        listener.Start(128);
        while (true)
        {
            var client = listener.AcceptTcpClient();
            Task.Run(() => CopyEitherWay(client));
        }
    }
}
'@

if (-not (Test-Path -LiteralPath $forwarderExe)) {
  Add-Type -TypeDefinition $source -Language CSharp -OutputAssembly $forwarderExe -OutputType WindowsApplication
}

$arguments = @($ListenHost, [string]$ListenPort, $PanelHost, [string]$PanelPort, $logPath, $pidPath)

if (-not $NoStartup) {
  $quotedArgs = ($arguments | ForEach-Object { '"' + ($_ -replace '"', '\"') + '"' }) -join " "
  $startup = "@echo off`r`nstart `"`" /min `"$forwarderExe`" $quotedArgs`r`n"
  Set-Content -LiteralPath $startupFile -Encoding ascii -Value $startup
}

$process = Start-Process -FilePath $forwarderExe -ArgumentList $arguments -WindowStyle Hidden -PassThru

Start-Sleep -Milliseconds 900
$listenerReady = Get-NetTCPConnection -LocalAddress $ListenHost -LocalPort $ListenPort -State Listen -ErrorAction SilentlyContinue
if (-not $listenerReady) {
  Fail "Localhost alias did not start on $ListenHost`:$ListenPort. See $logPath."
}

try {
  Invoke-WebRequest -UseBasicParsing -TimeoutSec 8 "http://$ListenHost`:$ListenPort/api/health" | Out-Null
}
catch {
  Write-Warning "Alias started, but health check failed: $($_.Exception.Message)"
}

Write-Host "RouterOS panel localhost alias installed."
Write-Host "Open: http://$ListenHost`:$ListenPort/"
Write-Host "Target: http://$PanelHost`:$PanelPort/"
Write-Host "Process: $($process.Id)"
if (-not $NoStartup) {
  Write-Host "Startup: $startupFile"
}
