param(
  [string]$InstallScript = "install.sh",
  [string]$EnvFile = ".env.docker.example",
  [switch]$StrictInstall,
  [switch]$SkipDocker,
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")
$checks = New-Object System.Collections.Generic.List[object]

function Add-Check {
  param(
    [ValidateSet("PASS", "FAIL", "SKIP")]
    [string]$Status,
    [string]$Name,
    [string]$Detail
  )

  $checks.Add([pscustomobject]@{
    Status = $Status
    Name = $Name
    Detail = $Detail
  }) | Out-Null

  Write-Host ("[{0}] {1} - {2}" -f $Status, $Name, $Detail)
}

function Invoke-CapturedCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $output = $null
  try {
    $output = & $FilePath @Arguments 2>&1
    $exitCode = $LASTEXITCODE
  }
  catch {
    $output = @($_.Exception.Message)
    $exitCode = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 1 }
  }
  if ($null -eq $exitCode) {
    $exitCode = 0
  }

  return [pscustomobject]@{
    ExitCode = $exitCode
    Output = (($output | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine)
  }
}

function Test-UsageOutput {
  param([string]$Text)
  return (-not [string]::IsNullOrWhiteSpace($Text)) -and ($Text -match "(?i)(usage|options|help|install|dry-run)")
}

function Get-UsableBash {
  $candidates = @(
    "C:\Program Files\Git\bin\bash.exe",
    "C:\Program Files\Git\usr\bin\bash.exe",
    "C:\Program Files (x86)\Git\bin\bash.exe"
  )

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return [pscustomobject]@{ Source = $candidate }
    }
  }

  return Get-Command bash -ErrorAction SilentlyContinue | Select-Object -First 1
}

Push-Location $repoRoot
try {
  Write-Host "Packaging preflight checks"
  Write-Host ("Repository: {0}" -f $repoRoot)
  Write-Host "Local-only: no container start, deployment, or network-device access."
  Write-Host ""

  if ($SkipDocker) {
    Add-Check "SKIP" "docker compose config" "Skipped by -SkipDocker."
  }
  else {
    $composePath = Join-Path $repoRoot "compose.yml"
    $envPath = Join-Path $repoRoot $EnvFile
    $docker = Get-Command docker -ErrorAction SilentlyContinue

    if (-not (Test-Path -LiteralPath $composePath)) {
      Add-Check "FAIL" "docker compose config" "compose.yml was not found."
    }
    elseif (-not (Test-Path -LiteralPath $envPath)) {
      Add-Check "FAIL" "docker compose config" "$EnvFile was not found."
    }
    elseif (-not $docker) {
      Add-Check "FAIL" "docker compose config" "docker CLI was not found on PATH."
    }
    else {
      $composeResult = Invoke-CapturedCommand $docker.Source @("compose", "--env-file", $EnvFile, "config", "--quiet")
      if ($composeResult.ExitCode -eq 0) {
        Add-Check "PASS" "docker compose config" "docker compose --env-file $EnvFile config --quiet completed."
      }
      else {
        $detail = $composeResult.Output.Trim()
        if ([string]::IsNullOrWhiteSpace($detail)) {
          $detail = "exit code $($composeResult.ExitCode)"
        }
        Add-Check "FAIL" "docker compose config" $detail
      }
    }
  }

  if ($SkipInstall) {
    Add-Check "SKIP" "install script checks" "Skipped by -SkipInstall."
  }
  else {
    $installPath = Join-Path $repoRoot $InstallScript
    if (-not (Test-Path -LiteralPath $installPath)) {
      $status = if ($StrictInstall) { "FAIL" } else { "SKIP" }
      Add-Check $status "install.sh presence" "$InstallScript was not found; syntax/help/dry-run checks are not applicable."
    }
    else {
      $bash = Get-UsableBash
      if (-not $bash) {
        Add-Check "FAIL" "install script checks" "bash was not found on PATH, so $InstallScript cannot be validated."
      }
      else {
        $installText = Get-Content -Raw -LiteralPath $installPath

        $syntaxResult = Invoke-CapturedCommand $bash.Source @("-n", $InstallScript)
        if ($syntaxResult.ExitCode -eq 0) {
          Add-Check "PASS" "bash syntax" "bash -n $InstallScript completed."
        }
        else {
          $detail = $syntaxResult.Output.Trim()
          if ([string]::IsNullOrWhiteSpace($detail)) {
            $detail = "exit code $($syntaxResult.ExitCode)"
          }
          Add-Check "FAIL" "bash syntax" $detail
        }

        $advertisesHelp = $installText -match "(?i)(--help|-h\b|usage)"
        if (-not $advertisesHelp) {
          Add-Check "FAIL" "install help" "$InstallScript does not advertise --help/-h; help command was not executed to avoid side effects."
        }
        else {
          $helpResult = Invoke-CapturedCommand $bash.Source @($InstallScript, "--help")
          if (($helpResult.ExitCode -eq 0) -and (Test-UsageOutput $helpResult.Output)) {
            Add-Check "PASS" "install help" "bash $InstallScript --help returned usage-like output."
          }
          else {
            $detail = $helpResult.Output.Trim()
            if ([string]::IsNullOrWhiteSpace($detail)) {
              $detail = "exit code $($helpResult.ExitCode) or empty/non-usage output"
            }
            Add-Check "FAIL" "install help" $detail
          }
        }

        $advertisesDryRun = ($installText -match "(?i)(--dry-run|dry_run)") -or ($helpResult -and ($helpResult.Output -match "(?i)--dry-run"))
        if (-not $advertisesDryRun) {
          $status = if ($StrictInstall) { "FAIL" } else { "SKIP" }
          Add-Check $status "install dry-run" "$InstallScript does not advertise --dry-run; command was not executed."
        }
        else {
          $dryRunResult = Invoke-CapturedCommand $bash.Source @($InstallScript, "--dry-run")
          if ($dryRunResult.ExitCode -eq 0) {
            Add-Check "PASS" "install dry-run" "bash $InstallScript --dry-run completed."
            if ($dryRunResult.Output -match "bind:\s+0\.0\.0\.0" -and
                $dryRunResult.Output -match "port:\s+28646" -and
                $dryRunResult.Output -match "target-ip:\s+\S+") {
              Add-Check "PASS" "LAN install defaults" "install dry-run resolved 0.0.0.0:28646 with a printable access host."
            }
            else {
              Add-Check "FAIL" "LAN install defaults" "install dry-run did not resolve 0.0.0.0:28646 with a printable access host."
            }
          }
          else {
            $detail = $dryRunResult.Output.Trim()
            if ([string]::IsNullOrWhiteSpace($detail)) {
              $detail = "exit code $($dryRunResult.ExitCode)"
            }
            Add-Check "FAIL" "install dry-run" $detail
          }
        }

        $node = Get-Command node -ErrorAction SilentlyContinue
        $lanCheckPath = Join-Path $repoRoot "tools/check-lan-defaults.js"
        if (-not (Test-Path -LiteralPath $lanCheckPath)) {
          Add-Check "FAIL" "LAN defaults" "tools/check-lan-defaults.js was not found."
        }
        elseif (-not $node) {
          Add-Check "SKIP" "LAN defaults" "node was not found on PATH."
        }
        else {
          $lanResult = Invoke-CapturedCommand $node.Source @("tools/check-lan-defaults.js")
          if ($lanResult.ExitCode -eq 0) {
            Add-Check "PASS" "LAN defaults" "tools/check-lan-defaults.js passed."
          }
          else {
            $detail = $lanResult.Output.Trim()
            if ([string]::IsNullOrWhiteSpace($detail)) {
              $detail = "exit code $($lanResult.ExitCode)"
            }
            Add-Check "FAIL" "LAN defaults" $detail
          }
        }
      }
    }
  }

  Write-Host ""
  $failed = @($checks | Where-Object { $_.Status -eq "FAIL" }).Count
  $skipped = @($checks | Where-Object { $_.Status -eq "SKIP" }).Count
  $passed = @($checks | Where-Object { $_.Status -eq "PASS" }).Count
  Write-Host ("Summary: {0} passed, {1} skipped, {2} failed." -f $passed, $skipped, $failed)

  if ($failed -gt 0) {
    exit 1
  }
  exit 0
}
finally {
  Pop-Location
}
