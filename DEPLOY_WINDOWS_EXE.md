# Windows EXE Deployment

This is the simplest path for people who do not want to install Python.

## Use The Prebuilt ZIP

1. Extract `RouterOS-Triage-Panel-Windows.zip` to a normal user-writable folder, for example `C:\RouterOS-Triage-Panel`.
2. Open `routeros-panel.env` in Notepad.
3. Set:
   - `ROS_MONITOR_ROUTER_HOST`
   - `ROS_MONITOR_ROUTER_USER`
   - `ROS_MONITOR_ROUTER_PASSWORD`
4. Keep these defaults for a first LAN trial:
   - `ROS_PANEL_BIND=0.0.0.0`
   - `ROS_PANEL_PORT=28646`
   - `ROS_PANEL_TARGET_IP=auto`
   - `ROS_PANEL_PROFILE=routeros_only`
   - `ROS_PANEL_IP_ALIAS_WRITE_ENABLED=0`
5. Double-click `RouterOS Triage Panel.exe`.
6. The browser should open the detected panel URL automatically. On the Windows
   host, `http://127.0.0.1:28646/` also works. Other LAN devices should open
   `http://<panel-host-ip>:28646/` using the Windows host's LAN IP.

The console window is intentional. It shows startup errors such as a wrong
RouterOS address, bad password, or a port conflict.

## Build From Source

Run this from the repository root on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build-windows-exe.ps1
```

Outputs:

- `dist\routeros-triage-panel\RouterOS Triage Panel.exe`
- `dist\routeros-triage-panel\routeros-panel.env`
- `dist\RouterOS-Triage-Panel-Windows.zip`

The build script uses a local `.venv-build` folder and installs build-time
dependencies there.

## Troubleshooting

- If the browser does not open, visit `http://127.0.0.1:28646/` on the Windows
  host itself, or use `http://<panel-host-ip>:28646/` from another LAN device.
- If another LAN device cannot connect, confirm it is using the Windows host IP,
  not its own `127.0.0.1`.
- If another LAN device must use `http://127.0.0.1:28646/` anyway, run the
  optional alias installer from `localhost-alias\` on that device and point it
  at the Windows panel host.
- If port `28646` is already in use, change `ROS_PANEL_PORT` in `routeros-panel.env` or use the panel address setting after opening the UI.
- If Windows Defender or SmartScreen warns, inspect the folder and run from a
  trusted local path. This project does not yet provide code signing.
- If the EXE starts but data is empty, confirm the RouterOS read-only user can
  access API and SSH from the Windows PC.

## Security Notes

- Use a dedicated least-privilege RouterOS user.
- Do not use the RouterOS `admin` account.
- Do not expose this EXE directly to the public internet.
- The default listener is `0.0.0.0:28646` so the Windows host can serve other
  trusted LAN devices at `http://<panel-host-ip>:28646/`.
- `http://127.0.0.1:28646/` is only same-machine access unless the optional
  localhost alias helper is installed on that client.
- Do not commit or share your edited `routeros-panel.env` file.
