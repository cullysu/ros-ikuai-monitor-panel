# Deploy (Public RouterOS-only) to 192.168.3.50

This repo currently ships a legacy single-instance deployment (`routeros-panel.service` + `ros-panel-ip.service`)
that targets `192.168.3.5` by default.

To avoid impacting the existing private `.3.5` install, use the new systemd template instance mode.

## Goals

- Run a separate instance on `192.168.3.50`
- Do not overwrite `/etc/default/routeros-panel`, `routeros-panel.service`, `ros-panel-ip.service`
- Default to NOT adding/holding secondary IPs on the host (prevents accidental IP conflicts)

## 0) Preflight on the 192.168.3.50 host

1. Confirm the host already owns `192.168.3.50/24` on the intended NIC (example):
   - `ip addr`
2. Confirm port `80` is free (if you plan to use `ROS_PANEL_PORT=80`):
   - `ss -lntp | grep ':80 ' || true`

## 1) Deploy (instance mode)

From the project directory on the target Linux host:

```bash
# Choose an instance name (ASCII only, avoid spaces/slashes)
INSTANCE="public50"

# Minimal required config for the panel
export ROS_PANEL_TARGET_IP="192.168.3.50"
export ROS_PANEL_BIND="0.0.0.0"
export ROS_PANEL_PORT="80"
# Important: enable the public RouterOS-only backend profile (disables OpenWrt/Nikki/private diagnostics).
# Accepted aliases: routeros_only, routeros_public, public_routeros, public
export ROS_PANEL_PROFILE="routeros_only"

# RouterOS connection (adjust for your public/RouterOS-only config)
export ROS_MONITOR_ROUTER_HOST="192.168.3.1"
export ROS_MONITOR_ROUTER_USER="admin"
export ROS_MONITOR_ROUTER_PASSWORD="change-me"

# Deploy without IP-heal service (recommended for .3.50)
./deploy_linux.sh --instance "${INSTANCE}" --disable-ip-service
```

What gets installed on the host:

- App dir: `/opt/ros-ikuai-monitor-panel-${INSTANCE}`
- Env file: `/etc/default/routeros-panel-${INSTANCE}`
- Units:
  - `/etc/systemd/system/routeros-panel@.service`
  - `/etc/systemd/system/ros-panel-ip@.service`
  - Enabled instance: `routeros-panel@${INSTANCE}.service`

## 2) Verify

```bash
systemctl --no-pager --full status "routeros-panel@${INSTANCE}.service"
curl -fsS "http://192.168.3.50/api/health"
```

## 3) Optional: enable IP-heal (only if you really need a virtual IP)

If you intentionally want the host to add/hold a secondary panel IP on an interface, enable:

```bash
systemctl enable --now "ros-panel-ip@${INSTANCE}.service"
```

Warning: enabling IP-heal with an IP that is already used elsewhere will cause a network conflict.

## 4) 1~10 WAN adaptive behavior

The public RouterOS-only profile no longer assumes `8x PPPoE`.
It auto-detects logical WAN lines from:

- `interface/pppoe-client`
- `ip/dhcp-client`
- active default-route gateways
- global/public-ish addresses on WAN-like interfaces

The UI behavior is intentionally different by line count:

- `1 WAN`: single-line focus. Overview shows a single WAN profile card instead of fake load-balance cards. Balance focuses on default route and policy visibility.
- `2 WAN`: dual-line compare. Overview and traffic pages keep side-by-side comparison cards.
- `3 WAN`: tri-line compare. Three lines stay in card form so each line keeps enough readable context.
- `4 WAN`: 2x2 matrix. Avoids a thin 4-across strip and keeps readability.
- `5~6 WAN`: high-density card matrix. Keeps per-line cards but compresses secondary copy.
- `7~8 WAN`: dispatch mode. Overview and balance switch to denser tables for line summaries.
- `9~10 WAN`: operations mode. Home page keeps only key summaries; dense tables carry most line details.

Layout tiers exposed by the backend:

- `single`: `1`
- `few`: `2~3`
- `multi`: `4~6`
- `dense`: `7~10`

Relevant snapshot fields for the frontend:

- `meta.profile`
- `meta.capabilities`
- `meta.wanCount`
- `meta.lineCount`
- `meta.lineLayoutTier`
- top-level `wan`

This means the same public build can be deployed for most RouterOS users without hardcoding PPPoE names or requiring OpenWrt/Nikki.
