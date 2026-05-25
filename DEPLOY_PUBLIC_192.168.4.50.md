# Historical Public RouterOS-only Instance Notes

This file is kept only as a migration note for an older host-specific public
MVP deployment. It is not the recommended public install path anymore.

New public installs should use the current deployment guides:

- [README.md](./README.md)
- [DEPLOY_DOCKER.md](./DEPLOY_DOCKER.md)
- [DEPLOY_LOCAL.md](./DEPLOY_LOCAL.md)
- [DEPLOY_WINDOWS_EXE.md](./DEPLOY_WINDOWS_EXE.md)
- [DEPLOY_ROUTEROS_CONTAINER.md](./DEPLOY_ROUTEROS_CONTAINER.md)

The current documented browser-facing address is fixed:

```text
http://127.0.0.1:28646/
```

For Linux/systemd instance deployments, use:

```bash
export ROS_PANEL_TARGET_IP="127.0.0.1"
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

Verify from a client that has direct access to the panel service or has the
localhost alias installed:

```bash
curl -fsS "http://127.0.0.1:28646/api/health"
curl -fsS "http://127.0.0.1:28646/api/semantic-triage"
```

Expected public shape:

- `profile` is `routeros_only`.
- `target` is `127.0.0.1`.
- `semanticTriage.readOnly` is `true`.
- `meta.capabilities.publicRouterosProfile` is `true`.
- `meta.capabilities.readonlyDiagnostics` is `false`.
- `meta.capabilities.ipAliasWrite` is `false`.

The old host-specific address is intentionally no longer a public project
default. If the panel runs on another LAN host, install the client alias from
[docs/LOCALHOST_ALIAS.md](./docs/LOCALHOST_ALIAS.md) and keep the browser URL
as `http://127.0.0.1:28646/`.
