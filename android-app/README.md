# RouterOS Monitor Android App

Native Android shell (WebView + loopback server) around the Codex
mobile-reference UI. Talks to RouterOS REST directly — no Windows panel,
browser, or LAN web server involved.

The login screen keeps the password in memory only. Nothing (host, user,
password, token) is persisted — there is no Keystore storage in this app.
See `../DEPLOY_ANDROID.md` for install steps, first-connection requirements
(home Wi-Fi, HTTP port 80, self-signed HTTPS handling), the verified test
matrix, and rebuild instructions.

## Build

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build-android-apk.ps1
```

Output: `dist\RouterOS-Monitor-debug.apk`. The debug keystore lives at
`android-app/debug.keystore` (gitignored) so rebuilds keep the same signature.

## RouterOS requirements

- Enable the RouterOS REST service (`www` on port 80, or `www-ssl` on 443).
- Create a dedicated read-only user; do not use `admin` on a shared router.
- Allow the phone's LAN address in the user/service `allowed-address` if that
  restriction is enabled.
- Self-signed `www-ssl` certificates require turning off 校验 TLS 证书 in the
  app and confirming the risk checkbox.
