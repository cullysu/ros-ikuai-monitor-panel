# Docker Deployment

Docker is the recommended public deployment path for most users. It works on
NAS boxes, mini PCs, Linux hosts, OpenWrt Docker environments, and cloud VMs
without requiring Python, ESXi, or a manually managed systemd service.

The one-command installer builds locally by default so it works even before a
prebuilt registry image is public. A GHCR image is published by CI and can be
used as an optional acceleration path:

```text
ghcr.io/cullysu/ros-ikuai-monitor-panel:main
```

The default install publishes the panel only on `127.0.0.1:28646`:

```text
http://127.0.0.1:28646/
```

Other IP browser entrypoints are not allowed by the public installer.

The panel reports the browser URL from the incoming HTTP `Host` header. This
avoids the common Docker bridge problem where a container can only detect its
own bridge/container address instead of the host LAN IP.

The backend also guards the HTTP `Host` header so direct browser access by a
non-loopback IP is rejected even if the service is accidentally published more
broadly.

## Public Delivery Contract

Docker / Compose is one of the four public delivery modes. Its public contract
matches Windows EXE, Linux systemd/VM, and RouterOS Container at the browser
layer: use `routeros_only`, keep write guardrails disabled, and open the UI as
`http://127.0.0.1:28646/`.

In Docker specifically, `ROS_PANEL_BIND=0.0.0.0` is only the in-container
listener required for Docker port publishing. The host-side published address
stays `127.0.0.1` by default, so another device cannot browse the Docker host's
LAN IP and get a supported public panel URL.

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
http://127.0.0.1:28646/
```

Then enter the RouterOS SSH host, SSH port, read-only user, and password in the
panel login page. The installer creates `.env.docker` for listener/profile
settings, but it does not require real RouterOS credentials in that file for
first run.

Custom install directory:

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --dir "$HOME/routeros-panel"
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
--local-only          Publish only on 127.0.0.1. This is the default.
--bind <addr>         Host publish address. Only 127.0.0.1/localhost is allowed.
--port <port>         Host and in-container panel port. Default: 28646.
--name <name>         Docker container name. Default: routeros-triage-panel.
--prebuilt            Pull the prebuilt GHCR image first, then fall back to local build.
--image <image>       Image tag to use. Default: routeros-triage-panel:local.
--build-local         Build from source. This is the default public install mode.
--target-ip <addr>    URL host printed by the panel. Only 127.0.0.1/localhost is allowed.
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

For a no-build manual run after the GHCR package is public, set
`ROS_PANEL_IMAGE=ghcr.io/cullysu/ros-ikuai-monitor-panel:main` in `.env.docker`
and run:

```bash
docker compose --env-file .env.docker pull routeros-triage
docker compose --env-file .env.docker up -d
```

For first run, you can leave these placeholders and configure RouterOS from the
panel UI:

```dotenv
ROS_MONITOR_ROUTER_HOST=<routeros-host-or-dns>
ROS_MONITOR_ROUTER_USER=ros-panel-readonly
ROS_MONITOR_ROUTER_PASSWORD=CHANGE_ME
```

The default browser-facing target is localhost-only:

```dotenv
ROS_PANEL_PUBLISHED_ADDR=127.0.0.1
ROS_PANEL_PUBLISHED_PORT=28646
ROS_PANEL_IMAGE=routeros-triage-panel:local
ROS_PANEL_TARGET_IP=127.0.0.1
```

`ROS_PANEL_TARGET_IP` is now a configured fallback for startup logs and saved
address settings. Normal browser/API status uses the request `Host` header, so
manual Compose should leave it as `127.0.0.1`.

The in-panel address dialog is read-only for Docker installs
(`ROS_PANEL_NETWORK_WRITE_ENABLED=0`). This avoids writing settings that cannot
update Docker's host port mapping. Change `.env.docker`, then restart the
Compose service, if you intentionally need a different loopback port.

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

From another device or any non-loopback browser URL, access should fail.

Expected read-only public shape:

- `profile` is `routeros_only`
- `publicRouterosProfile` is `true`
- `readonlyDiagnostics` is `false`
- `ipAliasWrite` is disabled
- RouterOS credentials are not returned by status endpoints
- write-only operations such as `POST /api/ip-alias` are rejected

## Address Changes

First run is documented as the local URL:

```text
http://127.0.0.1:28646/
```

The container still listens on `0.0.0.0` internally so Docker can publish the
service, but the host-side published address is `127.0.0.1` by default. Client
devices that are not the Docker host do not get a public LAN URL from this
project.

Do not expose this directly to a LAN or the public internet.

Do not use the UI address dialog to change Docker publishing. Docker publishing
is owned by `.env.docker` plus `compose.yml`, not by a file inside the running
container.

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

If the port is occupied, stop the conflicting local service first, then restart
the panel so `http://127.0.0.1:28646/` remains the public entrypoint.

### Another Device Cannot Open The Panel

That is expected. The public Docker path is localhost-only. Run the browser on
the Docker host.

If a different management client must open the UI, use an explicit client-local
forwarder or tunnel that connects back to the Docker host's loopback endpoint,
then still open `http://127.0.0.1:28646/` on that client. Do not replace
`127.0.0.1` with the Docker host LAN IP as a public product URL.

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
