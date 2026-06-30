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

function ConvertTo-BashSingleQuoted {
  param([string]$Text)
  return "'$($Text -replace "'", "'\''")'"
}

function Invoke-BashLoginCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$BashPath,
    [Parameter(Mandatory = $true)]
    [string]$Command
  )

  return Invoke-CapturedCommand $BashPath @("-lc", $Command)
}

function Get-UsableBash {
  $candidates = @(
    "C:\Program Files\Git\usr\bin\bash.exe",
    "C:\Program Files\Git\bin\bash.exe",
    "C:\Program Files (x86)\Git\usr\bin\bash.exe",
    "C:\Program Files (x86)\Git\bin\bash.exe"
  )

  $available = @()
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      $available += $candidate
    }
  }

  $pathBash = Get-Command bash -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($pathBash) {
    $available += $pathBash.Source
  }
  $available = @($available | Select-Object -Unique)

  foreach ($candidate in $available) {
    $probe = Invoke-CapturedCommand $candidate @("-lc", "command -v id >/dev/null 2>&1 && id -u >/dev/null 2>&1")
    if ($probe.ExitCode -eq 0) {
      return [pscustomobject]@{ Source = $candidate }
    }
  }

  foreach ($candidate in $available) {
    $probe = Invoke-CapturedCommand $candidate @("-lc", "true")
    if ($probe.ExitCode -eq 0) {
      return [pscustomobject]@{ Source = $candidate }
    }
  }

  return $null
}

Push-Location $repoRoot
try {
  Write-Host "Packaging preflight checks"
  Write-Host ("Repository: {0}" -f $repoRoot)
  Write-Host "Local-only: no container start, deployment, or network-device access."
  Write-Host ""

  $indexPath = Join-Path $repoRoot "public/index.html"
  $frameworkStylePath = Join-Path $repoRoot "public/assets/framework/style.css"
  $frameworkScriptPath = Join-Path $repoRoot "public/assets/framework/panel-framework.js"
  if (-not (Test-Path -LiteralPath $indexPath)) {
    Add-Check "FAIL" "frontend framework assets" "public/index.html was not found."
  }
  else {
    $indexText = Get-Content -Raw -LiteralPath $indexPath
    $frameworkShell = (
      $indexText -match 'data-app-shell="ikuai"' -and
      $indexText -match '<div class="app ik-shell">' -and
      $indexText -match 'data-overview-framework-asset="style"' -and
      $indexText -match 'data-overview-framework-asset="script"'
    )
    $frameworkAssetsPresent = (Test-Path -LiteralPath $frameworkStylePath) -and (Test-Path -LiteralPath $frameworkScriptPath)
    if ($frameworkShell -and $frameworkAssetsPresent) {
      Add-Check "PASS" "frontend framework assets" "Framework shell markers and framework asset files are present in public assets."
    }
    else {
      Add-Check "FAIL" "frontend framework assets" "Framework shell markers or framework asset files are missing from public assets."
    }
  }

  $specPath = Join-Path $repoRoot "routeros-triage-panel.spec"
  $dockerfilePath = Join-Path $repoRoot "Dockerfile"
  $composePath = Join-Path $repoRoot "compose.yml"
  $linuxDeployPath = Join-Path $repoRoot "deploy_linux.sh"
  $sharedChecks = @(
    (Test-Path -LiteralPath $specPath) -and ((Get-Content -Raw -LiteralPath $specPath) -match 'public"\),\s*"public"'),
    (Test-Path -LiteralPath $dockerfilePath) -and ((Get-Content -Raw -LiteralPath $dockerfilePath) -match '(?m)^COPY\s+public\s+\./public'),
    (Test-Path -LiteralPath $composePath) -and ((Get-Content -Raw -LiteralPath $composePath) -match 'dockerfile:\s*Dockerfile'),
    (Test-Path -LiteralPath $linuxDeployPath) -and ((Get-Content -Raw -LiteralPath $linuxDeployPath) -match 'rsync -a --delete')
  )
  if (($sharedChecks | Where-Object { -not $_ }).Count -eq 0) {
    Add-Check "PASS" "shared public deployment paths" "Windows EXE, Docker/Compose, RouterOS Container image, and Linux/systemd paths all use the repository public assets."
  }
  else {
    Add-Check "FAIL" "shared public deployment paths" "One or more deployment paths no longer prove they use the repository public assets."
  }

  $routerosDocPath = Join-Path $repoRoot "DEPLOY_ROUTEROS_CONTAINER.md"
  $routerosArchiveBuildPath = Join-Path $repoRoot "tools/build-routeros-container-archive.sh"
  $converterPath = Join-Path $repoRoot "tools/convert-oci-to-routeros-docker-archive.py"
  if (-not (Test-Path -LiteralPath $routerosDocPath)) {
    Add-Check "FAIL" "RouterOS Container install guidance" "DEPLOY_ROUTEROS_CONTAINER.md was not found."
  }
  else {
    $routerosDocText = Get-Content -Raw -LiteralPath $routerosDocPath
    if ($routerosDocText -match "/container/envs/add\s+list=" -and
        $routerosDocText -notmatch "/container/envs/add\s+name=" -and
        $routerosDocText -match "oci-layout" -and
        $routerosDocText -match "manifest\.json" -and
        $routerosDocText -match "Local archive, default public path" -and
        $routerosDocText -match "convert-oci-to-routeros-docker-archive\.py") {
      Add-Check "PASS" "RouterOS Container install guidance" "RouterOS env syntax and Docker/OCI archive guidance are documented."
    }
    else {
      Add-Check "FAIL" "RouterOS Container install guidance" "RouterOS env syntax or Docker/OCI archive guidance is missing or stale."
    }
  }

  if (-not (Test-Path -LiteralPath $routerosArchiveBuildPath)) {
    Add-Check "FAIL" "RouterOS archive builder" "tools/build-routeros-container-archive.sh was not found."
  }
  else {
    $archiveBuilderText = Get-Content -Raw -LiteralPath $routerosArchiveBuildPath
    if ($archiveBuilderText -match "docker buildx build" -and
        $archiveBuilderText -match "docker save" -and
        $archiveBuilderText -match "--provenance=false" -and
        $archiveBuilderText -match "convert-oci-to-routeros-docker-archive\.py" -and
        $archiveBuilderText -match "does not push to any registry") {
      Add-Check "PASS" "RouterOS archive builder" "Local RouterOS Container archive build path avoids registry dependency."
    }
    else {
      Add-Check "FAIL" "RouterOS archive builder" "Archive builder is missing local build/save/conversion markers."
    }
  }

  if (-not (Test-Path -LiteralPath $converterPath)) {
    Add-Check "FAIL" "RouterOS archive converter" "tools/convert-oci-to-routeros-docker-archive.py was not found."
  }
  else {
    $converterText = Get-Content -Raw -LiteralPath $converterPath
    if ($converterText -match "oci-layout" -and
        $converterText -match "manifest\.json" -and
        $converterText -match "layer\.tar" -and
        $converterText -match "gzip") {
      Add-Check "PASS" "RouterOS archive converter" "Converter contains OCI, legacy Docker archive, and gzip layer handling markers."
    }
    else {
      Add-Check "FAIL" "RouterOS archive converter" "Converter is missing expected archive compatibility markers."
    }
  }

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

        $quotedInstallScript = ConvertTo-BashSingleQuoted $InstallScript
        $syntaxResult = Invoke-BashLoginCommand $bash.Source "bash -n $quotedInstallScript"
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
          $helpResult = Invoke-BashLoginCommand $bash.Source "bash $quotedInstallScript --help"
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
          $dryRunResult = Invoke-BashLoginCommand $bash.Source "bash $quotedInstallScript --dry-run"
          if ($dryRunResult.ExitCode -eq 0) {
            Add-Check "PASS" "install dry-run" "bash $InstallScript --dry-run completed."
            if ($dryRunResult.Output -match "bind:\s+127\.0\.0\.1" -and
                $dryRunResult.Output -match "port:\s+28646" -and
                $dryRunResult.Output -match "target-ip:\s+127\.0\.0\.1" -and
                $dryRunResult.Output -match "local-url:\s+http://127\.0\.0\.1:28646/" -and
                $dryRunResult.Output -match "browser-url:\s+http://127\.0\.0\.1:28646/" -and
                $dryRunResult.Output -match "exposure:\s+localhost-only") {
              Add-Check "PASS" "localhost install defaults" "install dry-run resolved strict 127.0.0.1:28646 exposure."
            }
            else {
              Add-Check "FAIL" "localhost install defaults" "install dry-run did not resolve localhost-only defaults."
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
        $lanCheckPath = Join-Path $repoRoot "tools/check-lan-access-defaults.js"
        if (-not (Test-Path -LiteralPath $lanCheckPath)) {
          Add-Check "FAIL" "localhost access defaults" "tools/check-lan-access-defaults.js was not found."
        }
        elseif (-not $node) {
          Add-Check "SKIP" "localhost access defaults" "node was not found on PATH."
        }
        else {
          $lanResult = Invoke-CapturedCommand $node.Source @("tools/check-lan-access-defaults.js")
          if ($lanResult.ExitCode -eq 0) {
            Add-Check "PASS" "localhost access defaults" "tools/check-lan-access-defaults.js passed."
          }
          else {
            $detail = $lanResult.Output.Trim()
            if ([string]::IsNullOrWhiteSpace($detail)) {
              $detail = "exit code $($lanResult.ExitCode)"
            }
            Add-Check "FAIL" "localhost access defaults" $detail
          }

          $releaseCheckPath = Join-Path $repoRoot "tools/check-public-release-readiness.js"
          if (-not (Test-Path -LiteralPath $releaseCheckPath)) {
            Add-Check "FAIL" "public release readiness" "tools/check-public-release-readiness.js was not found."
          }
          else {
            $releaseResult = Invoke-CapturedCommand $node.Source @("tools/check-public-release-readiness.js", "--static-only")
            if ($releaseResult.ExitCode -eq 0) {
              Add-Check "PASS" "public release readiness" "tools/check-public-release-readiness.js --static-only passed."
            }
            else {
              $detail = $releaseResult.Output.Trim()
              if ([string]::IsNullOrWhiteSpace($detail)) {
                $detail = "exit code $($releaseResult.ExitCode)"
              }
              Add-Check "FAIL" "public release readiness" $detail
            }
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
