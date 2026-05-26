# Windows EXE Deployment

This path is for people who do not want to install Python on the machine that
runs the panel.

## Release Status

No official signed binary is published yet. Until a release ZIP exists in
GitHub Releases with a checksum, treat the Windows EXE as a build-from-source
path.

If you receive a ZIP from another source, verify that you trust the source. The
project does not yet provide code signing.

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

## Run The EXE

1. Extract `RouterOS-Triage-Panel-Windows.zip` to a normal user-writable folder,
   for example `C:\RouterOS-Triage-Panel`.
2. Open `routeros-panel.env` in Notepad.
3. Set:
   - `ROS_MONITOR_ROUTER_HOST`
   - `ROS_MONITOR_ROUTER_USER`
   - `ROS_MONITOR_ROUTER_PASSWORD`
4. Keep these defaults for a first local trial:
   - `ROS_PANEL_BIND=127.0.0.1`
   - `ROS_PANEL_PORT=28646`
   - `ROS_PANEL_TARGET_IP=127.0.0.1`
   - `ROS_PANEL_TRUST_PROXY_HEADERS=0`
   - `ROS_PANEL_PROFILE=routeros_only`
   - `ROS_PANEL_IP_ALIAS_WRITE_ENABLED=0`
5. Double-click `RouterOS Triage Panel.exe`.
6. The browser should open `http://127.0.0.1:28646/` automatically. Other IP
   browser entrypoints are not allowed by the public defaults.

The console window is intentional. It shows startup errors such as a wrong
RouterOS address, bad password, or a port conflict.

## Troubleshooting

- If the browser does not open, visit `http://127.0.0.1:28646/` on the Windows
  host itself.
- If another device cannot connect, that is expected with the public
  localhost-only configuration.
- If port `28646` is already in use, stop the conflicting local service first,
  then restart the EXE so the public entrypoint remains fixed.
- If Windows Defender or SmartScreen warns, inspect the folder and run from a
  trusted local path. This project does not yet provide code signing.
- If the EXE starts but data is empty, confirm the RouterOS read-only user can
  access API and SSH from the Windows PC.

## Security Notes

- Use a dedicated least-privilege RouterOS user.
- Do not use the RouterOS `admin` account.
- Do not expose this EXE directly to a LAN or the public internet.
- The default listener is `127.0.0.1:28646`, and non-loopback browser
  entrypoints are rejected.
- Do not commit or share your edited `routeros-panel.env` file.
- Saved RouterOS logins are local secrets on the Windows host. Do not enable
  password saving on shared or untrusted machines.
