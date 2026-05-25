# Docker Deployment

Docker is the recommended public deployment path for most users. It works well
on NAS boxes, small Linux hosts, home servers, OpenWrt Docker environments, and
cloud VMs without requiring a full manual systemd install.

The default Compose file publishes the panel only on `127.0.0.1:28646`. Change
that only after you have decided how access, authentication, and TLS will be
handled.

## 1. Prepare A RouterOS Read-only User

Create a dedicated RouterOS user for the panel. Do not use `admin`.

The panel is designed to read state, build risk summaries, and suggest manual
next steps. It should not be granted write access.

## 2. Create Local Docker Env

```bash
cp .env.docker.example .env.docker
```

Edit `.env.docker`:

```dotenv
ROS_MONITOR_ROUTER_HOST=192.168.88.1
ROS_MONITOR_ROUTER_USER=ros-panel-readonly
ROS_MONITOR_ROUTER_PASSWORD=CHANGE_ME
```

Keep the default listener for first run:

```dotenv
ROS_PANEL_PUBLISHED_ADDR=127.0.0.1
ROS_PANEL_PUBLISHED_PORT=28646
```

## 3. Run

```bash
docker compose --env-file .env.docker up -d --build
```

Open:

```text
http://127.0.0.1:28646/
```

## 4. Verify

```bash
docker compose ps
docker compose --env-file .env.docker exec routeros-triage python -c "import os, urllib.request; print(urllib.request.urlopen('http://127.0.0.1:%s/api/health' % os.getenv('ROS_PANEL_PORT', '28646'), timeout=3).read().decode())"
curl -fsS http://127.0.0.1:28646/api/semantic-triage
```

Expected:

- `profile` is `routeros_only`
- `publicRouterosProfile` is `true`
- `readonlyDiagnostics` is `false`
- `ipAliasWrite` is `false`
- `POST /api/ip-alias` returns `403`

## LAN Exposure

To expose the panel to trusted LAN clients, change:

```dotenv
ROS_PANEL_PUBLISHED_ADDR=0.0.0.0
ROS_PANEL_TARGET_IP=YOUR_PANEL_HOST_LAN_IP
```

Then restart:

```bash
docker compose --env-file .env.docker up -d
```

Do not expose this directly to the public internet. Put HTTPS and authentication
in front of it if access crosses a trusted LAN boundary.

## Security Shape

The included Docker setup:

- runs the app as a non-root user
- drops Linux capabilities
- enables `no-new-privileges`
- uses a read-only root filesystem
- stores mutable panel data only in the `routeros-triage-data` volume
- does not bake RouterOS credentials into the image

## Upgrade

```bash
git pull
docker compose --env-file .env.docker up -d --build
```

## Stop / Remove

Stop the service:

```bash
docker compose down
```

Remove the persistent panel data volume:

```bash
docker compose down -v
```

Only remove the volume when you intentionally want to delete local panel data
such as custom aliases.
