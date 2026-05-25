# Preflight validation checks

These checks are local-only packaging and install readiness probes. They do not
start containers, deploy services, call `deploy_linux.sh`, or contact RouterOS,
iKuai, OpenWrt, or other network devices.

## Run

From the repository root on Windows:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\check-packaging-preflight.ps1
```

Strict install mode turns a missing `install.sh` or missing installer dry-run
support into a failing check:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\check-packaging-preflight.ps1 -StrictInstall
```

## What it covers

- Docker Compose syntax and interpolation using:

```powershell
docker compose --env-file .env.docker.example config --quiet
```

- `install.sh` Bash syntax with `bash -n install.sh`, when `install.sh` exists.
- `install.sh --help` output, when the script advertises help support.
- `install.sh --dry-run`, only when the script advertises dry-run support.
- Localhost-first packaging defaults through `tools/check-localhost-defaults.js`:
  deployment docs and templates should keep the first-run panel endpoint at
  `127.0.0.1:28646`.

## Current repository state

This repository includes `install.sh`, so strict mode should pass before a
public packaging change is released:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\check-packaging-preflight.ps1 -StrictInstall
```

## Risk coverage

- Catches broken Compose interpolation, missing `.env.docker.example`, or a
  missing local Docker Compose plugin before deployment.
- Catches Bash parse errors before an installer is published.
- Avoids executing a dry-run or help command unless the install script advertises
  that mode, reducing accidental side-effect risk.
