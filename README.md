# RouterOS Read-only Status Panel

[English](./README.md) | [简体中文](./README.zh-CN.md)

Read-only RouterOS status panel for people who need to quickly confirm whether
the router is online, WAN lines are healthy, traffic or resources are abnormal,
and the displayed data is fresh, complete, and trustworthy.

The product focus is status visibility, not configuration management or
troubleshooting automation. It reads RouterOS state through API/SSH and presents
the current facts clearly. It is not a replacement for WinBox/WebFig, Grafana,
Zabbix, LibreNMS, The Dude, backups, or config diff tools.

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
| Home/simple | Simple LANs and first-time users | Device state, WAN state, resource state, DNS/DHCP basics |
| Multi-WAN/PCDN | Operators with multiple WANs or inbound-readiness concerns | WAN binding, route/PCC state, CGNAT/UPnP/readiness facts |
| Scale-adaptive | Any deployment with large lists | Search, grouping, paging, sampling labels, export-ready evidence |
| Private ops | Explicit private environments | Optional OpenWrt/Nikki/private probes, not public defaults |

Public deployments should use `routeros_only` unless you intentionally enable
private probes.

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
The RouterOS Container env template enables a localhost Host-forward guard with
a random forward token. The client-local forwarder injects that token; direct
browser entry by container/veth/LAN IP continues to be rejected.

When the panel is opened in a browser, the backend reports the actual URL from
the HTTP `Host` header. Manual Docker Compose no longer depends on a container
guessing the host LAN IP correctly; `ROS_PANEL_TARGET_IP` is only a configured
fallback for logs and address settings.

## Public Delivery Matrix

The public product is released through four delivery modes with the same
RouterOS-only, localhost-only security stance:

| Delivery mode | Runtime default | Browser entrypoint |
|---------------|-----------------|--------------------|
| Docker / Compose | container listens on `0.0.0.0`; host publishes `127.0.0.1:28646` | Docker host opens `http://127.0.0.1:28646/` |
| Windows EXE | EXE listens on `127.0.0.1:28646` | Windows host opens `http://127.0.0.1:28646/` |
| Linux systemd / VM | non-root systemd service listens on `127.0.0.1:28646` | systemd host opens `http://127.0.0.1:28646/` |
| RouterOS Container | container listens inside RouterOS container networking | client opens `http://127.0.0.1:28646/` through a client-local forwarder |

For Docker / Compose, `ROS_PANEL_ALLOW_DOCKER_HOST_FORWARD=1` recognizes only
the container's exact default bridge gateway together with a loopback `Host`.
It does not turn arbitrary bridge, LAN, or container-IP access into a supported
entrypoint.

Across all four modes, keep `routeros_only`, proxy-header trust off unless a
trusted reverse proxy design is reviewed, IP-alias writes off, and admin-session
exposure off. Remember that `127.0.0.1` belongs to the browser machine; it does
not cross devices without an explicit local forwarder or tunnel on that device.
The in-panel address dialog is a status view in Docker, Linux systemd/VM, and
RouterOS Container installs; edit the installer/env file and restart for those
modes. The Windows EXE sidecar env file is user-writable, so the dialog may save
loopback-only address settings there. `ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED`
controls only that local sidecar save operation; it never writes RouterOS routes,
firewall rules, interfaces, or any other RouterOS configuration. The old
`ROS_PANEL_NETWORK_WRITE_ENABLED` name remains only as a compatibility alias for
existing private installs and should not be used in new deployments.

## Quick Start: Docker One-command

The installer builds locally by default so the public one-command path does not
depend on registry visibility. CI also publishes optional immutable GHCR images
for prebuilt installs. Select a published commit SHA; mutable tags are not part
of the public install contract:

```text
ghcr.io/cullysu/ros-ikuai-monitor-panel:sha-<40-hex-commit-sha>
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

Then enter the RouterOS address, REST transport, SSH port, read-only user, and
password in the connection page. REST defaults to verified HTTPS on port `443`.
The first SSH contact stops before password authentication so the displayed
SHA-256 host-key fingerprint can be verified and pinned. The installer does not
require real RouterOS credentials in `.env.docker` for first run.

Custom directory:

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --dir "$HOME/routeros-panel"
```

Force a local build from the checked-out source:

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --build-local
```

Use a published immutable prebuilt GHCR image when anonymous pulls are enabled.
Replace the placeholder with the exact 40-character commit SHA selected for the
install; `--prebuilt` rejects missing, `main`, and `latest` tags:

```bash
IMAGE=ghcr.io/cullysu/ros-ikuai-monitor-panel:sha-<40-hex-commit-sha>
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --prebuilt --image "$IMAGE"
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
defaults, upgrade, uninstall, and RouterOS SSH `allowed-address` notes.

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

The Windows template sets `ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED=1`. That permits
only the local `bind / port / target` sidecar fields to be saved, while the public
profile still enforces loopback. It grants no RouterOS configuration-write access.

Read [DEPLOY_WINDOWS_EXE.md](./DEPLOY_WINDOWS_EXE.md) for EXE usage, build, and
status/error details.

## Quick Start: Local Python

```powershell
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
$env:ROS_MONITOR_ROUTER_HOST="<routeros-host-or-dns>"
$env:ROS_MONITOR_ROUTER_USER="ros-panel-readonly"
$env:ROS_MONITOR_ROUTER_PASSWORD="CHANGE_ME"
$env:ROS_MONITOR_ROUTER_REST_SCHEME="https"
$env:ROS_MONITOR_ROUTER_REST_PORT="443"
$env:ROS_MONITOR_ROUTER_REST_VERIFY_TLS="1"
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

Compose keeps the panel bounded to **1.5 GiB memory**, **1.50 CPUs**, and
**256 PIDs** while retaining its read-only root filesystem and dropped Linux
capabilities. A local `--source-dir` install preserves unrelated destination
files by default; add `--upgrade` only when intentionally replacing stale
source files.

Read [DEPLOY_DOCKER.md](./DEPLOY_DOCKER.md) for UI-based RouterOS login,
localhost-only defaults, upgrade, uninstall, env-file settings, and RouterOS SSH
`allowed-address` notes.

## RouterOS Container

RouterOS Container is supported as an advanced/Beta deployment route. It is not
the default path because it changes RouterOS container, storage, veth, and
possibly API/firewall access state.

Default public path: build a RouterOS-friendly archive locally, upload it to
RouterOS storage, and import it with `/container/add file=...`:

```bash
bash tools/build-routeros-container-archive.sh --platform linux/amd64
```

The GHCR image is an optional fast path only after anonymous pulls work. Use an
immutable tag for the exact selected commit:

```text
ghcr.io/cullysu/ros-ikuai-monitor-panel:sha-<40-hex-commit-sha>
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
export ROS_MONITOR_ROUTER_REST_SCHEME="https"
export ROS_MONITOR_ROUTER_REST_PORT="443"
export ROS_MONITOR_ROUTER_REST_VERIFY_TLS="1"

./deploy_linux.sh --instance routeros-panel --disable-ip-service
```

Open `http://127.0.0.1:28646/` on the systemd host. Older LAN-bound
deployment notes are historical examples, not product defaults.

## What It Does

- Collects RouterOS data through read-only API/SSH paths.
- Serves a static web UI from `public/`.
- Shows a read-only status bus with collection state, last refresh time,
  RouterOS connection state, WAN online count, highest current risk indicator,
  and data completeness.
- Preserves RouterOS rule semantics with summary views plus raw-field expansion
  for rule-heavy pages.
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
- Saved RouterOS profiles contain connection metadata and a pinned SSH
  fingerprint, never the RouterOS password. Protect any deployment environment
  or secret file that supplies a password.
- RouterOS REST defaults to certificate-verified HTTPS and never silently
  downgrades to HTTP. Unknown or changed SSH host keys are blocking.
- Use `routeros_only` for public deployments.
- In public profile, private OpenWrt/Nikki probes are disabled and
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
- `ROS_MONITOR_ROUTER_REST_SCHEME` (secure default: `https`)
- `ROS_MONITOR_ROUTER_REST_PORT` (secure default: `443`)
- `ROS_MONITOR_ROUTER_REST_VERIFY_TLS` (secure default: `1`)
- `ROS_MONITOR_SSH_HOST_KEY_FINGERPRINT` (blank until first-use confirmation)
- `ROS_PANEL_BIND`
- `ROS_PANEL_PORT`
- `ROS_PANEL_TARGET_IP`
- `ROS_PANEL_PROFILE`

Use [env.example](./env.example) or [.env.docker.example](./.env.docker.example)
as non-secret templates.

For the public Docker installer, real RouterOS credentials can be configured
from the panel UI after the container starts. The UI never silently falls back
from HTTPS to HTTP. HTTP or disabled certificate verification requires an
explicit risk acknowledgement. SSH displays and pins a SHA256 host-key
fingerprint before sending the SSH password on first contact.

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
curl -fsS http://127.0.0.1:28646/api/snapshot
```

Expected public-profile guardrails:

- `profile=routeros_only`
- `publicRouterosProfile=true`
- `readonlyDiagnostics=false`
- `ipAliasWrite=false`
- `POST /api/ip-alias` returns `403`

## License

MIT. See [LICENSE](./LICENSE).
