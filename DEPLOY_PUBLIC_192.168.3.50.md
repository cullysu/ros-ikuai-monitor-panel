# Public RouterOS-only MVP Deployment: 192.168.3.50

[English](./DEPLOY_PUBLIC_192.168.3.50.md) | [简体中文](./DEPLOY_PUBLIC_192.168.3.50.zh-CN.md)

This historical document describes an older public MVP deployment path for the read-only RouterOS semantic triage console. It is written for a separate RouterOS-only instance on `192.168.3.50`; it is not a private `.3.5` panel clone and it does not deploy or change RouterOS/OpenWrt configuration. New installs should start from the Docker or instance-mode systemd guides and then choose their own listener address.

## Scope

Use this path when you want:

- a public-product style RouterOS-only console
- read-only RouterOS state collection and semantic triage
- a separate systemd instance that avoids overwriting the existing legacy deployment
- no automatic host secondary-IP management by default

Do not use this path as:

- a RouterOS configuration editor
- an OpenWrt/Nikki/private diagnostics bundle
- an internet-facing service without external access control
- a replacement for backups, NMS, alerting, or recovery tooling

## Read-only Safety

- Run with `ROS_PANEL_PROFILE=routeros_only`.
- Use a RouterOS user with the least read permissions needed for API/SSH collection.
- Public profile disables private OpenWrt/Nikki diagnostics and defaults IP alias writes off.
- The panel has no RouterOS config mutation endpoint. Local-only conveniences, such as IP alias naming, must be explicitly enabled and do not write to RouterOS.
- Keep credentials out of git; provide them through environment variables or `/etc/default/routeros-panel-public50`.

## Demo / Verification Path

Before touching a deployment host, use local fixture checks if you only need a demo or review artifact:

```powershell
.\tools\check-local-predeploy.ps1 -Profile public -SkipBackend
```

For a local smoke check that starts the safe local backend:

```powershell
.\tools\check-local-predeploy.ps1 -Profile public
```

When the script starts the backend itself, it forces `ROS_MONITOR_ROUTER_HOST=127.0.0.1` and `ROS_PANEL_PROFILE=routeros_only`, so it does not call network devices.

## 0) Preflight on the 192.168.3.50 Host

1. Confirm the host already owns `192.168.3.50/24` on the intended NIC:
   - `ip addr`
2. Confirm port `80` is free if you plan to use `ROS_PANEL_PORT=80`:
   - `ss -lntp | grep ':80 ' || true`
3. Confirm you have RouterOS read-only credentials available outside git.

## 1) Deploy as a Separate Instance

From the project directory on the target Linux host:

```bash
# Choose an instance name. Use ASCII only; avoid spaces and slashes.
INSTANCE="public50"

# Public MVP console config.
export ROS_PANEL_TARGET_IP="192.168.3.50"
export ROS_PANEL_BIND="0.0.0.0"
export ROS_PANEL_PORT="80"
export ROS_PANEL_PROFILE="routeros_only"
export ROS_PANEL_IP_ALIAS_WRITE_ENABLED="0"

# RouterOS read-only connection. Replace placeholders outside git.
export ROS_MONITOR_ROUTER_HOST="192.168.88.1"
export ROS_MONITOR_ROUTER_USER="readonly-user"
export ROS_MONITOR_ROUTER_PASSWORD="CHANGE_ME"

# Deploy without IP-heal. Recommended for the public .3.50 instance.
./deploy_linux.sh --instance "${INSTANCE}" --disable-ip-service
```

Installed host artifacts:

- App dir: `/opt/ros-ikuai-monitor-panel-${INSTANCE}`
- Env file: `/etc/default/routeros-panel-${INSTANCE}`
- Template units:
  - `/etc/systemd/system/routeros-panel@.service`
  - `/etc/systemd/system/ros-panel-ip@.service`
- Enabled panel instance: `routeros-panel@${INSTANCE}.service`
- Disabled by default: `ros-panel-ip@${INSTANCE}.service`

## 2) Verify

```bash
systemctl --no-pager --full status "routeros-panel@${INSTANCE}.service"
curl -fsS "http://192.168.3.50/api/health"
journalctl -u "routeros-panel@${INSTANCE}.service" -n 100 --no-pager
```

Expected health response includes:

- `profile` matching `routeros_only`
- `target` matching `192.168.3.50`
- `status` moving from `starting` to `ok` after collection succeeds

## 3) Optional IP-heal

Keep IP-heal disabled unless you intentionally need the host to add or hold a secondary panel IP on an interface.

If you explicitly choose that model:

```bash
systemctl enable --now "ros-panel-ip@${INSTANCE}.service"
```

Warning: enabling IP-heal for an address already used elsewhere can create an IP conflict.

## 4) RouterOS-only WAN Adaptation

The public `routeros_only` profile does not assume `8x PPPoE`. It auto-detects logical WAN lines from:

- `interface/pppoe-client`
- `ip/dhcp-client`
- active default-route gateways
- global/public-ish addresses on WAN-like interfaces

The UI adapts by line count:

- `1 WAN`: single-line focus; no fake load-balance cards
- `2 WAN`: side-by-side comparison
- `3 WAN`: card-based tri-line comparison
- `4 WAN`: 2x2 matrix
- `5~6 WAN`: high-density card matrix
- `7~8 WAN`: denser table dispatch mode
- `9~10 WAN`: operations mode with key summaries and dense tables

Backend layout tiers:

- `single`: `1`
- `few`: `2~3`
- `multi`: `4~6`
- `dense`: `7~10`

Relevant snapshot fields:

- `meta.profile`
- `meta.capabilities`
- `meta.wanCount`
- `meta.lineCount`
- `meta.lineLayoutTier`
- top-level `wan`
- `semanticTriage`
- `actionQueue`

## Public MVP Notes

- This is a public-product packaging draft, not a final hosted demo.
- Use instance mode for public RouterOS-only review so legacy private deployment files are not overwritten.
- Keep deployment and rollback under the operator's normal Linux/service-management process; this repo does not deploy to network devices.
