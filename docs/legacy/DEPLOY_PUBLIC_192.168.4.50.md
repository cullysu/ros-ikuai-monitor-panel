# Historical Public RouterOS-only Instance Notes

This file is kept only as a migration note for an older host-specific public
MVP deployment. It is not the recommended public install path anymore.

New public installs should use the current deployment guides:

- [README.md](./README.md)
- [DEPLOY_DOCKER.md](./DEPLOY_DOCKER.md)
- [DEPLOY_LOCAL.md](./DEPLOY_LOCAL.md)
- [DEPLOY_WINDOWS_EXE.md](./DEPLOY_WINDOWS_EXE.md)
- [DEPLOY_ROUTEROS_CONTAINER.md](./DEPLOY_ROUTEROS_CONTAINER.md)

The current documented remote browser-facing address is the panel host's LAN
URL:

```text
http://<panel-host-ip>:28646/
```

On the panel host itself, `http://127.0.0.1:28646/` also works.

For Linux/systemd instance deployments, use:

```bash
export ROS_PANEL_TARGET_IP="auto"
export ROS_PANEL_BIND="0.0.0.0"
export ROS_PANEL_PORT="28646"
export ROS_PANEL_PROFILE="routeros_only"
export ROS_PANEL_IP_ALIAS_WRITE_ENABLED="0"
export ROS_PANEL_EXPOSE_ADMIN_SESSIONS="0"

export ROS_MONITOR_ROUTER_HOST="192.168.88.1"
export ROS_MONITOR_ROUTER_USER="ros-panel-readonly"
export ROS_MONITOR_ROUTER_PASSWORD="CHANGE_ME"

./deploy_linux.sh --instance routeros-panel --disable-ip-service
```

Verify on the panel host:

```bash
curl -fsS "http://127.0.0.1:28646/api/health"
curl -fsS "http://127.0.0.1:28646/api/semantic-triage"
```

Verify from another LAN client by replacing `127.0.0.1` with the panel host IP.

Expected public shape:

- `profile` is `routeros_only`.
- `target` is the detected or configured panel host.
- `semanticTriage.readOnly` is `true`.
- `meta.capabilities.publicRouterosProfile` is `true`.
- `meta.capabilities.readonlyDiagnostics` is `false`.
- `meta.capabilities.ipAliasWrite` is `false`.

The old host-specific address is intentionally no longer a public project
default. If the panel runs on another LAN host, open
`http://<panel-host-ip>:28646/` from clients. The localhost alias in
[docs/LOCALHOST_ALIAS.md](./docs/LOCALHOST_ALIAS.md) is optional only.
