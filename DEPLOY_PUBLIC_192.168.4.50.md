# Deploy Public RouterOS-only Instance To 192.168.4.50

This guide deploys an isolated read-only panel instance at `192.168.4.50`.

It does not change RouterOS, OpenWrt, ESXi, Nikki/Mihomo, DNS, DHCP, NAT,
firewall, routing, UPnP, or port forwards.

## Current State To Confirm

- The target Linux host already owns `192.168.4.50`.
- Port `80` is free or intentionally assigned to this panel.
- The existing private panel, if any, is not this instance.
- You have a dedicated RouterOS read-only user.
- You are not using RouterOS `admin` for the panel.

## Target State

- App directory: `/opt/ros-ikuai-monitor-panel-public450`
- Env file: `/etc/default/routeros-panel-public450`
- Unit: `routeros-panel@public450.service`
- IP-heal unit disabled: `ros-panel-ip@public450.service`
- Profile: `routeros_only`
- Panel URL: `http://192.168.4.50/`

## Preflight

Run on the target host:

```bash
ip addr | grep '192.168.4.50' || true
ss -lntp | grep ':80 ' || true
systemctl --no-pager --full status 'routeros-panel@public450.service' || true
systemctl --no-pager --full status 'ros-panel-ip@public450.service' || true
```

Stop if `192.168.4.50` belongs to another host, or if port `80` is an unrelated
production service.

## Backup Before Deploy

```bash
TS="$(date +%Y%m%d-%H%M%S)"
sudo mkdir -p "/root/ros-panel-public450-backup-${TS}"

sudo systemctl --no-pager --full status 'routeros-panel@public450.service' > "/root/ros-panel-public450-backup-${TS}/panel.status.txt" 2>&1 || true
sudo systemctl --no-pager --full status 'ros-panel-ip@public450.service' > "/root/ros-panel-public450-backup-${TS}/ip.status.txt" 2>&1 || true

sudo cp -a /etc/default/routeros-panel-public450 "/root/ros-panel-public450-backup-${TS}/" 2>/dev/null || true
sudo cp -a /etc/systemd/system/routeros-panel@public450.service.d "/root/ros-panel-public450-backup-${TS}/" 2>/dev/null || true
sudo cp -a /opt/ros-ikuai-monitor-panel-public450 "/root/ros-panel-public450-backup-${TS}/" 2>/dev/null || true
```

## Deploy

Run from the repository directory on the target host:

```bash
export ROS_PANEL_TARGET_IP="192.168.4.50"
export ROS_PANEL_BIND="0.0.0.0"
export ROS_PANEL_PORT="80"
export ROS_PANEL_PROFILE="routeros_only"
export ROS_PANEL_IP_ALIAS_WRITE_ENABLED="0"
export ROS_PANEL_EXPOSE_ADMIN_SESSIONS="0"

export ROS_MONITOR_ROUTER_HOST="192.168.3.1"
export ROS_MONITOR_ROUTER_USER="ros-panel-readonly"
export ROS_MONITOR_ROUTER_PASSWORD="CHANGE_ME"

./deploy_linux.sh --instance public450 --disable-ip-service
```

## Verify

```bash
systemctl --no-pager --full status 'routeros-panel@public450.service'
systemctl is-enabled 'ros-panel-ip@public450.service' || true
curl -fsS 'http://192.168.4.50/api/health'
curl -fsS 'http://192.168.4.50/api/semantic-triage'
curl -fsS 'http://192.168.4.50/api/snapshot' | head -c 1000
```

Expected:

- `profile` is `routeros_only`.
- `target` is `192.168.4.50`.
- `semanticTriage.readOnly` is `true`.
- `meta.capabilities.publicRouterosProfile` is `true`.
- `meta.capabilities.readonlyDiagnostics` is `false`.
- `meta.capabilities.ipAliasWrite` is `false`.
- `/etc/default/routeros-panel-public450` mode is `600`.
- `/opt/ros-ikuai-monitor-panel-public450` does not contain `.git`, `_edge*`,
  `_chrome*`, `_backup`, browser profiles, screenshots, or local logs.

Also verify write guard:

```bash
curl -i -X POST 'http://192.168.4.50/api/ip-alias' \
  -H 'Content-Type: application/json' \
  --data '{"ip":"192.0.2.10","name":"should-not-write"}'
```

Expected: HTTP `403`.

## Rollback

If this was a new instance:

```bash
sudo systemctl disable --now 'routeros-panel@public450.service' || true
sudo systemctl disable --now 'ros-panel-ip@public450.service' || true
```

If replacing a previous instance:

```bash
sudo systemctl stop 'routeros-panel@public450.service'
sudo rm -rf /opt/ros-ikuai-monitor-panel-public450
sudo cp -a "/root/ros-panel-public450-backup-${TS}/ros-ikuai-monitor-panel-public450" /opt/ 2>/dev/null || true
sudo cp -a "/root/ros-panel-public450-backup-${TS}/routeros-panel-public450" /etc/default/routeros-panel-public450 2>/dev/null || true
sudo systemctl daemon-reload
sudo systemctl restart 'routeros-panel@public450.service'
```

Do not enable IP-heal unless the host is intentionally responsible for adding
and holding `192.168.4.50`.
