# RouterOS iKuai Monitor Panel

Private source repository for the RouterOS read-only monitoring panel.

## What It Is

- Python backend for RouterOS data collection
- static Web panel under `public/`
- Linux deployment via `deploy_linux.sh` and systemd units
- read-only operations UI; it is not meant to push RouterOS/OpenWrt changes

## What It Is Not

- not a RouterOS/OpenWrt backup store
- not a firewall/routing automation repo
- not a place for browser profiles, screenshots, logs, or local debug captures

## Repository Layout

- `app.py` backend entrypoint
- `public/` static frontend
- `tools/` browser verification and capture helpers
- `deploy_linux.sh` Linux deployment helper
- `routeros-panel*.service` / `ros-panel-ip*.service` systemd units
- `DEPLOY_PUBLIC_192.168.3.50.md` public RouterOS-only instance example
- `DESIGN.md` UI design rules

## Profiles

Common profiles in use:

- `private_ops`
  - full private environment flavor
- `routeros_only`
  - RouterOS-only / public-style flavor without assuming OpenWrt-private diagnostics

## Quick Start

### Local Development

```powershell
Set-Location "D:\cully\Documents\ros-ikuai-monitor-panel"
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
$env:ROS_MONITOR_ROUTER_HOST="192.168.3.1"
$env:ROS_MONITOR_ROUTER_USER="admin"
$env:ROS_MONITOR_ROUTER_PASSWORD="CHANGE_ME"
$env:ROS_PANEL_PORT="8080"
.\.venv\Scripts\python app.py
```

Then open:

- `http://127.0.0.1:8080/`

## Required Environment

At minimum, set:

- `ROS_MONITOR_ROUTER_HOST`
- `ROS_MONITOR_ROUTER_USER`
- `ROS_MONITOR_ROUTER_PASSWORD`
- `ROS_PANEL_TARGET_IP`
- `ROS_PANEL_PORT`
- `ROS_PANEL_PROFILE`

Use [env.example](./env.example) as the non-secret template.

## Linux Deployment

Two deployment modes exist:

1. legacy single-instance mode
   - units: `routeros-panel.service` + `ros-panel-ip.service`
2. instance mode
   - units: `routeros-panel@<name>.service`
   - optional: `ros-panel-ip@<name>.service`

Important behavior:

- `deploy_linux.sh` uses `rsync --delete`, so do not store persistent data inside `/opt/ros-ikuai-monitor-panel*`.
- instance mode is the safer default when you want a second panel without disturbing the main deployment.
- the IP-heal service is optional and should not be enabled casually.

For the public RouterOS-only deployment example, read:

- [DEPLOY_PUBLIC_192.168.3.50.md](./DEPLOY_PUBLIC_192.168.3.50.md)

## Validation

Typical checks:

```bash
systemctl --no-pager --full status routeros-panel.service
systemctl --no-pager --full status "routeros-panel@public50.service"
curl -fsS "http://127.0.0.1:8080/api/health"
journalctl -u routeros-panel.service -n 100 --no-pager
```

## Security Notes

- Do not commit real RouterOS credentials.
- The repository now uses `CHANGE_ME` as the default password placeholder; production deployments must provide the real value through environment or `/etc/default/routeros-panel*`.
- Keep the panel inside LAN or behind a controlled access layer.
- Treat this as a read-only observability service, not a management plane.

## Recovery / Rebuild

To rebuild the panel service from scratch:

1. restore this repository
2. restore environment variables or `/etc/default/routeros-panel*`
3. redeploy with `deploy_linux.sh`
4. verify `/api/health`

If the broader network itself is down, recover RouterOS/OpenWrt/ESXi first from:

- `cully-network-device-backups`
