# RouterOS Read-only Semantic Triage Console

[English](./README.md) | [简体中文](./README.zh-CN.md)

Read-only RouterOS operations panel for people who need fast triage of WAN,
routing, DNS, DHCP, firewall, interface, traffic, and log state without giving a
dashboard write access to the router.

The product wedge is semantic triage: turn RouterOS state into risk summaries,
evidence entry points, and next manual review steps. It is not a replacement for
WinBox/WebFig, Grafana, Zabbix, LibreNMS, The Dude, or backup/diff tools.

## Install Paths

Install paths are deployment choices, not product versions. Capability modes are
documented separately in [PRODUCT_MODEL.md](./PRODUCT_MODEL.md).

| Path | Best for | Status |
|------|----------|--------|
| Windows EXE | Non-Python Windows users who want unzip, edit config, double-click | Recommended first trial |
| Docker / Compose | NAS, mini PC, Linux host, OpenWrt Docker, cloud VM | Recommended deployment |
| Local run | Developers or users comfortable with Python | Supported |
| Linux systemd / VM | Operators who want a managed production service | Professional |
| RouterOS Container | Advanced RouterOS users who want one-box deployment | Beta / advanced |

## Capability Modes

The panel adapts to the observed RouterOS scale instead of assuming a fixed
number of WAN lines. A small home router, a multi-WAN/PCDN box, and a larger
professional network should all keep their real counts visible while the UI
switches from cards to grouped summaries and paged details as lists grow.

| Mode | Best for | Default behavior |
|------|----------|------------------|
| Home/simple | Simple LANs and first-time users | Risk/action summary, router health, WAN, DNS/DHCP basics |
| Multi-WAN/PCDN | Operators with multiple WANs or inbound-readiness concerns | WAN binding, route/PCC evidence, CGNAT/UPnP/readiness evidence |
| Scale-adaptive | Any deployment with large lists | Search, grouping, paging, sampling labels, export-ready evidence |
| Private ops | Explicit private environments | Optional OpenWrt/Nikki/private diagnostics |

Public/product-style deployments should use `routeros_only` unless you
intentionally enable private diagnostics.

## Quick Start: Windows EXE

1. Extract `RouterOS-Triage-Panel-Windows.zip`.
2. Edit `routeros-panel.env` and set your RouterOS host, read-only user, and
   password.
3. Double-click `RouterOS Triage Panel.exe`.
4. Open `http://127.0.0.1:8080/` if the browser does not open automatically.

Read [DEPLOY_WINDOWS_EXE.md](./DEPLOY_WINDOWS_EXE.md) for build and
troubleshooting details.

## Quick Start: Local Python

```powershell
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
$env:ROS_MONITOR_ROUTER_HOST="192.168.88.1"
$env:ROS_MONITOR_ROUTER_USER="ros-panel-readonly"
$env:ROS_MONITOR_ROUTER_PASSWORD="CHANGE_ME"
$env:ROS_PANEL_BIND="127.0.0.1"
$env:ROS_PANEL_PORT="8080"
$env:ROS_PANEL_TARGET_IP="127.0.0.1"
$env:ROS_PANEL_PROFILE="routeros_only"
.\.venv\Scripts\python app.py
```

Open `http://127.0.0.1:8080/`.

Read [DEPLOY_LOCAL.md](./DEPLOY_LOCAL.md) for Windows, macOS, and Linux details.

## Quick Start: Docker

```bash
cp .env.docker.example .env.docker
# edit .env.docker and set ROS_MONITOR_ROUTER_HOST / USER / PASSWORD
docker compose --env-file .env.docker up -d --build
```

Open `http://127.0.0.1:8080/`.

Docker is the default public deployment recommendation because it does not
require ESXi or a dedicated VM, and it keeps the panel isolated from RouterOS.
Read [DEPLOY_DOCKER.md](./DEPLOY_DOCKER.md) before exposing it beyond localhost.

## RouterOS Container

RouterOS Container is supported as an advanced/Beta deployment route. It is not
the default path because it changes RouterOS container, storage, veth, and
possibly API/firewall access state.

Read [DEPLOY_ROUTEROS_CONTAINER.md](./DEPLOY_ROUTEROS_CONTAINER.md) and make a
RouterOS backup before trying it.

## Linux systemd / VM

The Linux helper remains useful for operators who want an instance managed by
systemd:

```bash
export ROS_PANEL_TARGET_IP="127.0.0.1"
export ROS_PANEL_BIND="127.0.0.1"
export ROS_PANEL_PORT="80"
export ROS_PANEL_PROFILE="routeros_only"
export ROS_MONITOR_ROUTER_HOST="192.168.88.1"
export ROS_MONITOR_ROUTER_USER="ros-panel-readonly"
export ROS_MONITOR_ROUTER_PASSWORD="CHANGE_ME"

./deploy_linux.sh --instance routeros-panel --disable-ip-service
```

Bind to a LAN address only after you have decided the access boundary. Older
`.3.50/.4.50` deployment notes remain historical examples, not product defaults.

## What It Does

- Collects RouterOS data through read-only API/SSH paths.
- Serves a static web UI from `public/`.
- Builds semantic triage from the latest snapshot:
  - collector errors
  - WAN and default-route risks
  - DNS/DHCP pressure
  - ARP conflicts
  - interface drops/errors
  - RouterOS resource and connection pressure
  - security-log hints
- Keeps public-profile write paths disabled by default.
- Exposes scale metadata so large lists can show actual totals, visible rows,
  `hasMore`, and sampled-data labels instead of silently truncating data.

## What It Does Not Do

- It does not change RouterOS configuration.
- It does not change OpenWrt, Nikki/Mihomo, ESXi, DNS, DHCP, NAT, firewall,
  routing, UPnP, or port forwards.
- It does not include built-in user authentication or TLS termination.
- It does not replace RouterOS backups or config diff tooling.

## Repository Layout

- `app.py`: backend entrypoint and RouterOS snapshot collector.
- `public/`: static frontend.
- `Dockerfile`: container image build.
- `compose.yml`: recommended Docker Compose deployment.
- `.env.docker.example`: non-secret Docker environment template.
- `routeros-panel.env.example`: non-secret Windows EXE sidecar config template.
- `routeros-triage-panel.spec`: PyInstaller build spec.
- `deploy_linux.sh`: Linux systemd deployment helper.
- `routeros-panel*.service`: systemd units.
- `tools/`: local smoke and browser verification helpers.
- `DEPLOY_WINDOWS_EXE.md`: Windows EXE deployment and build path.
- `DEPLOY_LOCAL.md`: local trial path.
- `DEPLOY_DOCKER.md`: Docker deployment path.
- `DEPLOY_ROUTEROS_CONTAINER.md`: RouterOS Container Beta path.
- `docs/local-predeploy-checks.md`: local-only predeployment checks.

## Required Environment

At minimum, set:

- `ROS_MONITOR_ROUTER_HOST`
- `ROS_MONITOR_ROUTER_USER`
- `ROS_MONITOR_ROUTER_PASSWORD`
- `ROS_PANEL_BIND`
- `ROS_PANEL_PORT`
- `ROS_PANEL_TARGET_IP`
- `ROS_PANEL_PROFILE`

Use [env.example](./env.example) or [.env.docker.example](./.env.docker.example)
as non-secret templates.

## Security Baseline

- Create a dedicated least-privilege RouterOS user for the panel.
- Do not use the RouterOS `admin` account.
- Keep `ROS_PANEL_BIND=127.0.0.1` for local runs.
- Keep Docker publishing on `127.0.0.1` until LAN access is intentional.
- Do not expose the panel directly to the public internet.
- Put HTTPS and authentication in front of the panel if it leaves a trusted LAN.
- Use `routeros_only` for public/product-style deployments.
- In public profile, private OpenWrt/Nikki diagnostics are disabled and
  IP-alias writes should remain off unless explicitly reviewed.

## Validation

```bash
python -m py_compile app.py
powershell -ExecutionPolicy Bypass -File .\tools\build-windows-exe.ps1
docker compose --env-file .env.docker.example config --quiet
curl -fsS http://127.0.0.1:8080/api/health
curl -fsS http://127.0.0.1:8080/api/semantic-triage
```

Expected public-profile guardrails:

- `profile=routeros_only`
- `publicRouterosProfile=true`
- `readonlyDiagnostics=false`
- `ipAliasWrite=false`
- `POST /api/ip-alias` returns `403`

## Current Status

This is an early public MVP / packaging draft. It is useful for controlled LAN
testing and read-only operations review, but it should not be exposed directly
to the public internet.

## License

No open-source license has been selected yet. Until a license is added, all
rights are reserved.
