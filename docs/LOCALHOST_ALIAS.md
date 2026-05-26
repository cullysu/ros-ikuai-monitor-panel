# Optional Localhost Alias For Client Devices

This helper is optional for Docker, Windows EXE, and Linux systemd/VM installs
because those paths default to running on the same host that opens the browser.
Use this guide only when a client device must type `http://127.0.0.1:28646/`
and you have also provided an explicit TCP path to the real panel endpoint,
such as an SSH tunnel, a local forwarder, or a RouterOS Container forwarding
path.

The panel server can run on Docker, Windows EXE, Linux systemd/VM, or RouterOS
Container. Client devices that should always type the same local address can
install a local alias:

```text
http://127.0.0.1:28646/
```

Install the alias on each client device that should use that address. The alias
listens on the client device and forwards traffic to the configured upstream.
It does not make another machine's `127.0.0.1` reachable by itself, and it does
not turn a Docker/Windows/systemd localhost-only install into a LAN service.

## Windows Client

Run PowerShell as the normal user:

```powershell
$env:ROUTEROS_PANEL_HOST="<panel-server-host>"
iwr https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/tools/install-localhost-alias.ps1 -OutFile "$env:TEMP\install-localhost-alias.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:TEMP\install-localhost-alias.ps1"
```

Open:

```text
http://127.0.0.1:28646/
```

The Windows installer uses a user-mode forwarder and a Startup-folder entry. It
does not require administrator permission.

Uninstall:

```powershell
iwr https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/tools/uninstall-localhost-alias.ps1 -OutFile "$env:TEMP\uninstall-localhost-alias.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:TEMP\uninstall-localhost-alias.ps1"
```

## Linux Or macOS Client

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/tools/install-localhost-alias.sh -o /tmp/install-localhost-alias.sh
bash /tmp/install-localhost-alias.sh --panel-host <panel-server-host>
```

Open:

```text
http://127.0.0.1:28646/
```

The script uses `systemd --user` on Linux when available, LaunchAgent on macOS,
and falls back to a current-session background process.

Uninstall:

```bash
curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/tools/uninstall-localhost-alias.sh -o /tmp/uninstall-localhost-alias.sh
bash /tmp/uninstall-localhost-alias.sh
```

## Packaged Windows ZIP

The Windows ZIP includes the same scripts in `localhost-alias\`. From the
extracted folder:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\localhost-alias\install-localhost-alias.ps1 -PanelHost <panel-server-host>
```

## When The Panel Host Changes

Run the installer again with the new panel host:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\localhost-alias\install-localhost-alias.ps1 -PanelHost <new-panel-host-ip> -Force
```

or:

```bash
bash tools/install-localhost-alias.sh --panel-host <new-panel-host-ip>
```

## Notes

- If a device already uses `127.0.0.1:28646`, change that app's port or install
  this alias on another local port.
- Phones and tablets need an OS-supported local proxy/VPN/client app to do the
  same thing. The project scripts cover Windows, Linux, and macOS clients.
- Do not expose the panel directly to a LAN or the public internet.
