# Windows EXE Deployment

This is the simplest path for people who do not want to install Python.

## Use The Prebuilt ZIP

1. Extract `RouterOS-Triage-Panel-Windows.zip` to a normal user-writable folder, for example `C:\RouterOS-Triage-Panel`.
2. Open `routeros-panel.env` in Notepad.
3. Set:
   - `ROS_MONITOR_ROUTER_HOST`
   - `ROS_MONITOR_ROUTER_USER`
   - `ROS_MONITOR_ROUTER_PASSWORD`
4. Keep these defaults for a first local trial:
   - `ROS_PANEL_BIND=127.0.0.1`
   - `ROS_PANEL_PORT=28646`
   - `ROS_PANEL_PROFILE=routeros_only`
   - `ROS_PANEL_IP_ALIAS_WRITE_ENABLED=0`
5. Double-click `RouterOS Triage Panel.exe`.
6. The browser should open `http://127.0.0.1:28646/` automatically.

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

- If the browser does not open, visit `http://127.0.0.1:28646/` manually.
- If port `28646` is already in use, change `ROS_PANEL_PORT` in `routeros-panel.env` or use the panel address setting after opening the UI.
- If Windows Defender or SmartScreen warns, inspect the folder and run from a
  trusted local path. This project does not yet provide code signing.
- If the EXE starts but data is empty, confirm the RouterOS read-only user can
  access API and SSH from the Windows PC.

## Security Notes

- Use a dedicated least-privilege RouterOS user.
- Do not use the RouterOS `admin` account.
- Do not expose this EXE directly to the public internet.
- Keep `ROS_PANEL_BIND=127.0.0.1` unless LAN exposure has been reviewed.
- Do not commit or share your edited `routeros-panel.env` file.
