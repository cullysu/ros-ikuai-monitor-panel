# Local Run

This is the lowest-friction way to try the RouterOS read-only semantic triage
console. It does not install a service and does not change RouterOS
configuration.

## When To Use This Path

- You want to test the project before deploying it anywhere.
- You have a desktop or laptop that can reach RouterOS.
- You accept that history is only collected while the local process is running.

## RouterOS Requirement

Create a dedicated least-privilege RouterOS user for the panel. Do not use
`admin`.

At minimum, the app needs read access to the RouterOS API and SSH paths it
collects from. Keep the account scoped to read-only policy wherever possible.

## Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt

$env:ROS_MONITOR_ROUTER_HOST="192.168.88.1"
$env:ROS_MONITOR_ROUTER_USER="ros-panel-readonly"
$env:ROS_MONITOR_ROUTER_PASSWORD="CHANGE_ME"
$env:ROS_PANEL_BIND="127.0.0.1"
$env:ROS_PANEL_PORT="28646"
$env:ROS_PANEL_TARGET_IP="127.0.0.1"
$env:ROS_PANEL_PROFILE="routeros_only"
$env:ROS_PANEL_IP_ALIAS_WRITE_ENABLED="0"
$env:ROS_PANEL_EXPOSE_ADMIN_SESSIONS="0"

.\.venv\Scripts\python app.py
```

Open:

```text
http://127.0.0.1:28646/
```

## macOS / Linux

```bash
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt

export ROS_MONITOR_ROUTER_HOST="192.168.88.1"
export ROS_MONITOR_ROUTER_USER="ros-panel-readonly"
export ROS_MONITOR_ROUTER_PASSWORD="CHANGE_ME"
export ROS_PANEL_BIND="127.0.0.1"
export ROS_PANEL_PORT="28646"
export ROS_PANEL_TARGET_IP="127.0.0.1"
export ROS_PANEL_PROFILE="routeros_only"
export ROS_PANEL_IP_ALIAS_WRITE_ENABLED="0"
export ROS_PANEL_EXPOSE_ADMIN_SESSIONS="0"

./.venv/bin/python app.py
```

Open:

```text
http://127.0.0.1:28646/
```

## Verify

```bash
curl -fsS http://127.0.0.1:28646/api/health
curl -fsS http://127.0.0.1:28646/api/semantic-triage
```

Expected:

- `profile` is `routeros_only`
- `publicRouterosProfile` is `true`
- `ipAliasWrite` is disabled

## Stop

Press `Ctrl+C` in the terminal running `app.py`.
