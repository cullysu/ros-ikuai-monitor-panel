# Android App

The Android client wraps the Codex mobile-reference UI (accepted four-screen
baseline: 概览 / 网络 / 设备 / 日志, plus 资源告警 / 接口告警 / WAN 详情
scenarios) in a WebView. A loopback HTTP server inside the app serves that UI
and bridges `/api/*` to RouterOS REST directly. The Windows panel port
(192.168.3.243:28647) is never used.

## Install

Built APK:

```text
C:\Users\cully\Documents\ros-ikuai-monitor-panel-ikuai-ios\dist\RouterOS-Monitor-debug.apk
```

A copy is also written to:

```text
C:\Users\cully\Documents\RouterOS-Monitor-debug.apk
```

Copy the APK to the phone, then:

1. Allow installing from this source / unknown apps.
2. Open the APK and install `RouterOS Monitor`.
3. Launch the app. Do not open `http://192.168.3.243:28647/` in a phone browser.

This APK is debug-signed with a keystore kept at
`android-app/debug.keystore` (gitignored), so rebuilds keep the same
signature and `adb install -r` updates work. Android will still warn about an
unknown developer until a release keystore is added.

## First connection — read this before typing

1. **The phone must be on the home Wi-Fi.** The status bar must show Wi-Fi,
   not LTE. A phone on cellular data cannot reach `192.168.3.1` at all — this
   is the most common cause of "HTTPS 和 HTTP 都过不去".
2. **REST defaults to HTTP port 80.** RouterOS serves REST over the `www`
   service (port 80). The `www-ssl` service (443) is usually NOT enabled, so
   HTTPS will fail with 连接被拒绝 unless you enabled it yourself. The form
   switches the default port automatically when you tap HTTP/HTTPS.
3. **Self-signed HTTPS needs the toggle off.** If your router only has the
   self-signed certificate, use HTTPS 443 AND turn off 校验 TLS 证书, then
   confirm the risk checkbox. Certificate verification ON will always fail
   against a self-signed certificate.
4. **The account must be allowed by `/ip service` address whitelist.** If
   `www`/`ssh` services restrict addresses, the phone's LAN IP must be
   included, otherwise connections time out.
5. Use a dedicated read-only user when possible, not `admin`.

The 通道回执 card shows the live result of each channel separately: REST
(成功 with elapsed time and router identity, or the exact failure reason) and
SSH (banner probe only — the Android client never performs a full SSH login).

## Credentials

The password lives in process memory only. The app does not persist host,
user, password, or tokens anywhere (no Keystore, no storage) — clearing the
app or rebooting the phone requires signing in again.

## Rebuild

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build-android-apk.ps1
```

The script uses the local Android SDK under
`codex_network_incident_20260712\android-sdk` (API 35, JDK 21) and rebuilds
`dist\RouterOS-Monitor-debug.apk`.

## UI bundle

The WebView assets in `android-app/app/src/main/assets/www` come from the
Codex repo `ros-ikuai-monitor-panel-mobile-native-release`
(`npm run build` there, then copy `panel-mobile.<hash>.js`,
`mobile.<hash>.css`, `panel-surface-loader.<hash>.js` and update
`index.html`). The mobile connection screen was redesigned there (stacked
fields, real channel results, scheme-aware default ports) on 2026-09-13.

## Mock testing

`tools/mock-routeros-rest.py` serves a fake RouterOS REST/SSH stack on the
host (HTTP 8081, HTTPS 8443 with self-signed `tools/mock-routeros-cert.pem`,
SSH banner 2222; user `paneltest` / password `paneltest`). Start it, then
connect the app to `10.0.2.2` from the emulator.

## Verified 2026-09-13 (emulator net-x86, Pixel 4 @ 440dpi)

- HTTP 80 login → panel renders, live poll every 10s
- Wrong password → REST row red: RouterOS 拒绝登录（401）
- HTTPS + TLS verify ON + self-signed → red cert-failure message
- HTTPS + TLS verify OFF + risk confirmed → login succeeds
- Real router 192.168.3.1 HTTP 80 → 40 interfaces, live rates, 10s polling
- Bottom navigation 概览/网络/设备/日志 at phone density (440dpi)
- Tablet density (720dp viewport) renders the side-rail layout

## Security

- Public desktop defaults remain localhost-only (`routeros_only`).
- The in-app server binds `127.0.0.1:28648` only.
- Cleartext HTTP is allowed because home RouterOS REST is plain HTTP.
- Do not put this debug APK on a public store.
