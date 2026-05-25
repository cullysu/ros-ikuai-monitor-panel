# Docker Deployment

Docker is the recommended public deployment path for most users. It works on
NAS boxes, mini PCs, Linux hosts, OpenWrt Docker environments, and cloud VMs
without requiring Python, ESXi, or a manually managed systemd service.

The default install publishes the panel on `0.0.0.0:28646` and prints a LAN
URL that other devices can open without installing anything:

```text
http://<panel-host-ip>:28646/
```

On the Docker host itself, `http://127.0.0.1:28646/` also works. The localhost
alias helper is optional and only for users who insist on the same local vanity
URL on every client.

The panel reports the browser URL from the incoming HTTP `Host` header. This
avoids the common Docker bridge problem where a container can only detect its
own bridge/container address instead of the host LAN IP.

If you put the panel behind a trusted reverse proxy and want it to honor
`X-Forwarded-Host` / `X-Forwarded-Proto`, set
`ROS_PANEL_TRUST_PROXY_HEADERS=1` only on that trusted deployment.

## One-command Install

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

Open:

```text
http://<panel-host-ip>:28646/
```

For same-machine testing on the Docker host, open `http://127.0.0.1:28646/`.

Then enter the RouterOS SSH host, SSH port, read-only user, and password in the
panel login page. The installer creates `.env.docker` for listener/profile
settings, but it does not require real RouterOS credentials in that file for
first run.

Custom install directory or port:

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --dir "$HOME/routeros-panel" --port 28647
```

Install from a branch:

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --branch main
```

Default install directory:

- non-root users: `$HOME/.local/share/routeros-triage-panel`
- root: `/opt/routeros-triage-panel`

## Installer Options

```text
--lan                 Keep the default: publish the panel on all host interfaces.
--bind <addr>         Host publish address. Default: 0.0.0.0.
--port <port>         Host and in-container panel port. Default: 28646.
--name <name>         Docker container name. Default: routeros-triage-panel.
--target-ip <addr>    URL host printed by the panel. Default: detected LAN IP.
--dir <path>          Install directory.
--repo <url>          Git repository URL.
--branch <name>       Git branch to install.
--upgrade             Update the installed source before starting.
--uninstall           Stop and remove the Compose service.
--purge               With --uninstall, also remove the Docker volume and install directory.
--dry-run             Print the resolved plan without changing files.
```

## Prepare A RouterOS Read-only User

Create a dedicated RouterOS user for the panel. Do not use `admin`.

The panel is designed to read state, build risk summaries, and suggest manual
next steps. It should not be granted write access.

Make sure RouterOS SSH is reachable from the Docker host. If RouterOS restricts
SSH by `allowed-address` or firewall input rules, allow the source address that
RouterOS sees for the panel host or container.

## Manual Compose Install

Manual Compose remains useful for developers and operators who want direct file
control:

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
```

For first run, you can leave these placeholders and configure RouterOS from the
panel UI:

```dotenv
ROS_MONITOR_ROUTER_HOST=<routeros-host-or-dns>
ROS_MONITOR_ROUTER_USER=ros-panel-readonly
ROS_MONITOR_ROUTER_PASSWORD=CHANGE_ME
```

The default browser-facing target is automatic while the Docker listener remains
publishable:

```dotenv
ROS_PANEL_PUBLISHED_ADDR=0.0.0.0
ROS_PANEL_PUBLISHED_PORT=28646
ROS_PANEL_TARGET_IP=auto
```

`ROS_PANEL_TARGET_IP` is now a configured fallback for startup logs and saved
address settings. Normal browser/API status uses the request `Host` header, so
manual Compose can usually leave it as `auto`. Set
`ROS_PANEL_TARGET_IP=<panel-host-ip>` only when you want the fallback URL to be
fixed too. Use [docs/LOCALHOST_ALIAS.md](./docs/LOCALHOST_ALIAS.md) only when a
client must open `http://127.0.0.1:28646/` while the Docker host is elsewhere on
the LAN.

## Configure RouterOS Login In The UI

In the RouterOS login screen, enter:

- RouterOS host or DNS name
- SSH port, usually `22` unless you changed it on RouterOS
- the dedicated read-only username
- the matching password

The panel tests SSH first. If SSH succeeds, it also checks RouterOS REST
reachability and shows a warning when REST is unavailable. SSH is enough for the
first connection, but some dashboard data may be missing until REST is
reachable.

Use password saving only on a trusted panel host. Saved RouterOS logins live in
the Docker volume `routeros-triage-data`, under the panel data directory, and
should be treated as local secrets. Do not use password saving on shared or
untrusted hosts.

## Verify

```bash
docker compose ps
curl -fsS http://127.0.0.1:28646/api/health
curl -fsS http://127.0.0.1:28646/api/semantic-triage
docker compose logs -f --tail=100 routeros-triage
```

From another LAN device, replace `127.0.0.1` with the panel host IP.

Expected read-only public shape:

- `profile` is `routeros_only`
- `publicRouterosProfile` is `true`
- `readonlyDiagnostics` is `false`
- `ipAliasWrite` is disabled
- RouterOS credentials are not returned by status endpoints
- write-only operations such as `POST /api/ip-alias` are rejected

## Address Changes

First run is documented as the LAN URL printed by the installer:

```text
http://<panel-host-ip>:28646/
```

The container still listens on `0.0.0.0` internally so Docker can publish the
service, and the host-side published address is `0.0.0.0` by default. Client
devices that are not the Docker host should use the LAN URL. They do not need
the localhost alias helper unless you specifically want a local vanity address
on each client.

Do not expose this directly to the public internet. Put HTTPS and
authentication in front of it if access leaves a single trusted machine.

## Security Shape

The included Docker setup:

- runs the app as a non-root user
- drops Linux capabilities
- enables `no-new-privileges`
- uses a read-only root filesystem
- stores mutable panel data only in the `routeros-triage-data` volume
- does not bake RouterOS credentials into the image

## Upgrade

One-command install:

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --upgrade
```

Custom install directory:

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --upgrade --dir "$HOME/routeros-panel"
```

Manual Compose:

```bash
git pull
docker compose --env-file .env.docker up -d --build
```

Before a large upgrade, keep a copy of `.env.docker` and note the current Git
commit or tag:

```bash
git rev-parse --short HEAD
cp .env.docker ".env.docker.backup.$(date +%Y%m%d-%H%M%S)"
```

Rollback:

```bash
git checkout <previous-commit-or-tag>
docker compose --env-file .env.docker up -d --build
```

## Stop / Uninstall

One-command install:

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --uninstall
```

Remove the Docker volume and install directory too:

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --uninstall --purge
```

Manual Compose:

```bash
docker compose down
```

Remove the persistent panel data volume:

```bash
docker compose down -v
```

Only remove the volume when you intentionally want to delete saved RouterOS
logins, custom aliases, and other local panel data.

## Troubleshooting

### Page Does Not Open

```bash
docker compose ps
docker compose logs -f --tail=100 routeros-triage
curl -fsS http://127.0.0.1:28646/api/health
```

If the port is occupied, reinstall or restart with another port:

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --port 28647
```

### Another Device Cannot Open The Panel

- Use `http://<panel-host-ip>:28646/`, not that client device's own
  `127.0.0.1`.
- Confirm the Docker host is reachable from that client on TCP `28646`.
- Confirm the host OS firewall allows TCP `28646` on the trusted LAN profile.
- Common Linux examples:
  `sudo ufw allow 28646/tcp`, or
  `sudo firewall-cmd --add-port=28646/tcp --permanent && sudo firewall-cmd --reload`.
- If the client must use `http://127.0.0.1:28646/` anyway, install the optional
  localhost alias on that client device:
  [docs/LOCALHOST_ALIAS.md](./docs/LOCALHOST_ALIAS.md).

### RouterOS Login Fails

- Confirm the RouterOS SSH service is enabled.
- Confirm RouterOS firewall input rules allow the Docker host.
- If RouterOS SSH uses `allowed-address`, include the source address that
  RouterOS sees for the panel host or container.
- Confirm the user/password are real values and not `CHANGE_ME`.
- Do not use the RouterOS `admin` account for this panel.

If the UI reports "TCP connected but no SSH banner", the TCP port accepted a
connection but RouterOS did not complete an SSH login banner. In practice, this
usually means an SSH service restriction, firewall rule, connection limit, or a
non-SSH service on that port.

## Validate Local Files

```bash
bash -n install.sh
bash tools/validate-public-install.sh
docker compose --env-file .env.docker.example config --quiet
```
