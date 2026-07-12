# Windows EXE Deployment

This path is for people who do not want to install Python on the machine that
runs the panel.

## Release Status

Official Windows ZIP packages are published from tagged GitHub Releases with a
SHA-256 checksum asset.

The project does not yet provide code signing. If Windows Defender or
SmartScreen warns, verify the ZIP checksum against the GitHub Release before
running it.

## Public Delivery Contract

Windows EXE is one of the four public delivery modes. It should match the
Docker, Linux systemd/VM, and RouterOS Container public defaults: RouterOS-only
profile, loopback browser entrypoint, proxy-header trust off, IP-alias writes
off, and admin-session exposure off.

The EXE listens on the Windows host only. `http://127.0.0.1:28646/` means the
Windows machine running the browser; it is not a LAN URL for other devices.

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
2. Double-click `RouterOS Triage Panel.exe`.
3. The browser should open `http://127.0.0.1:28646/` automatically. Other IP
   browser entrypoints are not allowed by the public defaults.
4. Enter the RouterOS SSH host, SSH port, read-only user, and password on the
   login page. The panel tests SSH before entering the dashboard.
5. Optional: prefill credentials in `routeros-panel.env` before starting the
   EXE if you prefer file-based configuration:
   - `ROS_MONITOR_ROUTER_HOST`
   - `ROS_MONITOR_ROUTER_USER`
   - `ROS_MONITOR_ROUTER_PASSWORD`
6. Keep these defaults for a first local trial:
   - `ROS_PANEL_BIND=127.0.0.1`
   - `ROS_PANEL_PORT=28646`
   - `ROS_PANEL_TARGET_IP=127.0.0.1`
   - `ROS_PANEL_TRUST_PROXY_HEADERS=0`
   - `ROS_PANEL_PROFILE=routeros_only`
   - `ROS_PANEL_IP_ALIAS_WRITE_ENABLED=0`

The console window is intentional. It shows startup errors such as a wrong
RouterOS address, bad password, or a port conflict.

The in-panel address dialog can save loopback-only settings to
`routeros-panel.env` when the ZIP is extracted to a user-writable folder. Restart
the EXE after saving. Non-loopback addresses remain blocked by the public
profile.
This write capability is limited to the panel's local sidecar environment file;
it never writes RouterOS configuration. The controlling variable is
`ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED=1`, and its writable allowlist is exactly
`ROS_PANEL_BIND`, `ROS_PANEL_PORT`, and `ROS_PANEL_TARGET_IP`. The legacy
`ROS_PANEL_NETWORK_WRITE_ENABLED` name is accepted only for compatibility with
existing private installs.

## Troubleshooting

- If the browser does not open, visit `http://127.0.0.1:28646/` on the Windows
  host itself.
- If another device cannot connect, that is expected with the public
  localhost-only configuration.
- If port `28646` is already in use, stop the conflicting local service first,
  then restart the EXE so the public entrypoint remains fixed.
- If login reports that TCP connected but no SSH banner was received, keep the
  SSH port you entered and verify the RouterOS SSH service allows this Windows
  host to complete an SSH handshake. The failure happens before password
  authentication.
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
