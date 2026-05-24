# Local predeploy checks

This repository has a local-only predeploy smoke runner for changes that should
not touch RouterOS, OpenWrt, or any other network device.

## Run

From the repository root on Windows:

```powershell
.\tools\check-local-predeploy.ps1
```

Equivalent direct Node command:

```powershell
node .\tools\local-predeploy-check.js
```

The default command starts `app.py` on `127.0.0.1` with:

- `ROS_MONITOR_ROUTER_HOST=127.0.0.1`
- `ROS_PANEL_TARGET_IP=127.0.0.1`
- `ROS_PANEL_PROFILE=routeros_only`
- `ROS_MONITOR_ROUTER_PASSWORD=CHANGE_ME`

It does not deploy, run `deploy_linux.sh`, call systemd, or contact real
network devices.

## Useful options

```powershell
.\tools\check-local-predeploy.ps1 -Profile public
.\tools\check-local-predeploy.ps1 -Profile private
.\tools\check-local-predeploy.ps1 -SkipBrowser
.\tools\check-local-predeploy.ps1 -StrictResponsive
.\tools\check-local-predeploy.ps1 -Url http://127.0.0.1:8080/
```

`-Url` is intentionally local-only. The runner refuses non-local hosts.

## What it covers

- Python syntax check for `app.py`.
- Safe local backend startup.
- `/api/health`, `/api/snapshot`, and static panel asset availability.
- Public-profile guard rails: readonly diagnostics are disabled, and
  `/api/ip-alias` writes are rejected.
- Browser boot with deterministic injected snapshots, so UI checks do not
  require live RouterOS data.
- Public and private fixture profiles by default.
- Desktop, laptop, tablet, and narrow viewport probes.
- Section navigation smoke checks for overview, interfaces, terminals, DHCP,
  DNS, routes, line status, balance, traffic load, logs, and private diagnostic
  sections when the private profile is enabled.
- Runtime exception and console error detection.
- Desktop/tablet horizontal overflow and shell overlap detection.
- Narrow viewport overflow is reported as a warning by default because the
  current shell deliberately keeps a desktop layout on small screens. Use
  `-StrictResponsive` to turn that into a failing check.

## Outputs

Reports and screenshots are written under:

```text
_acceptance/local-predeploy-<timestamp>/
```

The important file is `report.json`. Screenshots are captured for each overview
viewport/profile and for failing sections.
