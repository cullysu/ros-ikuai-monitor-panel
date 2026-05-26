# RouterOS Read-only Semantic Triage Console

[English](./README.md) | [简体中文](./README.zh-CN.md)

Read-only RouterOS operations panel for people who need fast triage of WAN,
routing, DNS, DHCP, firewall, interface, traffic, resource, and log state
without granting a dashboard write access to the router.

The product wedge is semantic triage: turn RouterOS state into risk summaries,
evidence entry points, and next manual review steps. It is not a replacement for
WinBox/WebFig, Grafana, Zabbix, LibreNMS, The Dude, backups, or config diff
tools.

## Status

This is an early public MVP. It is suitable for controlled localhost trials and
read-only operational review. Do not expose it directly to a LAN or the public
internet.

## Install Paths

Install paths are deployment choices, not product versions. Capability modes
are documented separately in [PRODUCT_MODEL.md](./PRODUCT_MODEL.md).

| Path | Best for | Status |
|------|----------|--------|
| Docker one-command | Most Linux/NAS/VM users who want the fastest install | Recommended default |
| Windows EXE | Non-Python Windows users who want unzip, edit config, double-click | Recommended first trial |
| Docker / Compose | NAS, mini PC, Linux host, OpenWrt Docker, cloud VM | Recommended deployment |
| Local Python | Developers or users comfortable with Python | Supported |
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

Public deployments should use `routeros_only` unless you intentionally enable
private diagnostics.

## Access URL

The public default first-run URL is localhost:

```text
http://127.0.0.1:28646/
```

Docker, Windows EXE, local Python, and Linux systemd/VM installs default to
localhost-only access. Other IP browser entrypoints are not part of the public
deployment contract.

RouterOS Container is different because the panel runs inside RouterOS. The
browser still opens `http://127.0.0.1:28646/`, but that requires a local
forwarder on the client. Do not treat the container veth address as a browser
URL.

When the panel is opened in a browser, the backend reports the actual URL from
the HTTP `Host` header. Manual Docker Compose no longer depends on a container
guessing the host LAN IP correctly; `ROS_PANEL_TARGET_IP` is only a configured
fallback for logs and address settings.

## Quick Start: Docker One-command

The installer builds locally by default so the public one-command path does not
depend on registry visibility. CI also publishes an optional GHCR image for
prebuilt installs:

```text
ghcr.io/cullysu/ros-ikuai-monitor-panel:main
```

Safest first run: download, review, dry-run, then install.

```bash
curl -fsSLO https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh
bash install.sh --dry-run
bash install.sh
```

Short form:

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash
```

Open `http://127.0.0.1:28646/` on the panel host.

Then enter the RouterOS SSH host, SSH port, read-only user, and password in the
panel login page. The panel tests SSH first, then checks RouterOS REST
reachability. The installer does not require real RouterOS credentials in
`.env.docker` for first run.

Custom directory:

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --dir "$HOME/routeros-panel"
```

Force a local build from the checked-out source:

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --build-local
```

Use the prebuilt GHCR image when package visibility allows anonymous pulls:

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --prebuilt
```

Upgrade:

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --upgrade
```

Stop the installed service while keeping local panel data:

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --uninstall
```

Read [DEPLOY_DOCKER.md](./DEPLOY_DOCKER.md) for manual Compose, localhost-only
defaults, upgrade, uninstall, and RouterOS SSH `allowed-address`
troubleshooting.

## Quick Start: Windows EXE

No official signed binary is published yet. Until releases are cut, build the
EXE from source on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build-windows-exe.ps1
```

Outputs:

- `dist\routeros-triage-panel\RouterOS Triage Panel.exe`
- `dist\routeros-triage-panel\routeros-panel.env`
- `dist\RouterOS-Triage-Panel-Windows.zip`

Run from a trusted local folder. The project does not yet provide code signing.

Read [DEPLOY_WINDOWS_EXE.md](./DEPLOY_WINDOWS_EXE.md) for EXE usage, build, and
troubleshooting details.

## Quick Start: Local Python

```powershell
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
$env:ROS_MONITOR_ROUTER_HOST="<routeros-host-or-dns>"
$env:ROS_MONITOR_ROUTER_USER="ros-panel-readonly"
$env:ROS_MONITOR_ROUTER_PASSWORD="CHANGE_ME"
$env:ROS_PANEL_BIND="127.0.0.1"
$env:ROS_PANEL_PORT="28646"
$env:ROS_PANEL_TARGET_IP="127.0.0.1"
$env:ROS_PANEL_PROFILE="routeros_only"
.\.venv\Scripts\python app.py
```

Open `http://127.0.0.1:28646/` on the same machine.

Read [DEPLOY_LOCAL.md](./DEPLOY_LOCAL.md) for Windows, macOS, and Linux details.

## Manual Docker / Compose

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
```

Open `http://127.0.0.1:28646/` on the Docker host. Other IP browser entrypoints
are not enabled by the public Compose defaults.

Read [DEPLOY_DOCKER.md](./DEPLOY_DOCKER.md) for UI-based RouterOS login,
localhost-only defaults, upgrade, uninstall, env-file settings, and RouterOS SSH
`allowed-address` troubleshooting.

## RouterOS Container

RouterOS Container is supported as an advanced/Beta deployment route. It is not
the default path because it changes RouterOS container, storage, veth, and
possibly API/firewall access state.

Default public path: build a RouterOS-friendly archive locally, upload it to
RouterOS storage, and import it with `/container/add file=...`:

```bash
bash tools/build-routeros-container-archive.sh --platform linux/amd64
```

The GHCR image is an optional fast path only after anonymous pulls work:

```text
ghcr.io/cullysu/ros-ikuai-monitor-panel:main
```

Read [DEPLOY_ROUTEROS_CONTAINER.md](./DEPLOY_ROUTEROS_CONTAINER.md) and make a
RouterOS backup before trying it. Do not call the deployment complete until the
local forwarder URL `http://127.0.0.1:28646/` passes.

## Linux systemd / VM

The Linux helper remains useful for operators who want an instance managed by
systemd:

```bash
export ROS_PANEL_TARGET_IP="127.0.0.1"
export ROS_PANEL_BIND="127.0.0.1"
export ROS_PANEL_PORT="28646"
export ROS_PANEL_PROFILE="routeros_only"
export ROS_MONITOR_ROUTER_HOST="<routeros-host-or-dns>"
export ROS_MONITOR_ROUTER_USER="ros-panel-readonly"
export ROS_MONITOR_ROUTER_PASSWORD="CHANGE_ME"

./deploy_linux.sh --instance routeros-panel --disable-ip-service
```

Open `http://127.0.0.1:28646/` on the systemd host. Older `.3.50/.4.50`
deployment notes are historical examples, not product defaults.

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

## Security Baseline

- Create a dedicated least-privilege RouterOS user for the panel.
- Do not use the RouterOS `admin` account.
- The default public install listens on `127.0.0.1:28646` only.
- Do not expose the panel directly to a LAN or the public internet.
- Saved RouterOS logins are local secrets on the panel host or container data
  volume. Treat that host as trusted.
- Use `routeros_only` for public deployments.
- In public profile, private OpenWrt/Nikki diagnostics are disabled and
  IP-alias writes should remain off unless explicitly reviewed.

## Repository Layout

- `.github/`: public issue forms, pull request template, and CI workflow.
- `app.py`: backend entrypoint and RouterOS snapshot collector.
- `public/`: static frontend.
- `Dockerfile`: container image build.
- `compose.yml`: recommended Docker Compose deployment.
- `.env.docker.example`: non-secret Docker environment template.
- `install.sh`: public Docker one-command installer.
- `routeros-panel.env.example`: non-secret Windows EXE sidecar config template.
- `routeros-triage-panel.spec`: PyInstaller build spec.
- `deploy_linux.sh`: Linux systemd deployment helper.
- `routeros-panel*.service`: systemd units.
- `tools/`: local smoke and browser verification helpers.
- `docs/README.md`: documentation index.
- `docs/LOCALHOST_ALIAS.md`: optional fixed `127.0.0.1:28646` client alias guide.
- `DEPLOY_WINDOWS_EXE.md`: Windows EXE deployment and build path.
- `DEPLOY_LOCAL.md`: local trial path.
- `DEPLOY_DOCKER.md`: Docker deployment path.
- `DEPLOY_ROUTEROS_CONTAINER.md`: RouterOS Container Beta path.

## Required Environment

For manual runs, the main bootstrap variables are:

- `ROS_MONITOR_ROUTER_HOST`
- `ROS_MONITOR_ROUTER_USER`
- `ROS_MONITOR_ROUTER_PASSWORD`
- `ROS_PANEL_BIND`
- `ROS_PANEL_PORT`
- `ROS_PANEL_TARGET_IP`
- `ROS_PANEL_PROFILE`

Use [env.example](./env.example) or [.env.docker.example](./.env.docker.example)
as non-secret templates.

For the public Docker installer, real RouterOS credentials can be configured
from the panel UI after the container starts.

## Community And Support

- Read [SUPPORT.md](./SUPPORT.md) before filing install, login, or data-quality
  issues.
- Read [PRIVACY.md](./PRIVACY.md) and
  [docs/security/CREDENTIALS.md](./docs/security/CREDENTIALS.md) before sharing
  logs, screenshots, or saved-login environments.
- Read [DISCLAIMER.md](./DISCLAIMER.md) for the project boundary and
  [ROADMAP.md](./ROADMAP.md) for direction.
- Use GitHub issue forms for redacted bug reports and feature requests.
- Follow [CONTRIBUTING.md](./CONTRIBUTING.md) for local checks and the
  read-only product boundary.
- Follow [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) in project discussions.
- Security-sensitive reports should follow [SECURITY.md](./SECURITY.md), not
  public issues.

## Validation

```bash
bash -n install.sh
bash install.sh --help
bash tools/validate-public-install.sh
python tools/check-collector-regressions.py
node tools/check-lan-access-defaults.js
python -m py_compile app.py
docker compose --env-file .env.docker.example config --quiet
curl -fsS http://127.0.0.1:28646/api/health
curl -fsS http://127.0.0.1:28646/api/semantic-triage
```

Expected public-profile guardrails:

- `profile=routeros_only`
- `publicRouterosProfile=true`
- `readonlyDiagnostics=false`
- `ipAliasWrite=false`
- `POST /api/ip-alias` returns `403`

## License

MIT. See [LICENSE](./LICENSE).
