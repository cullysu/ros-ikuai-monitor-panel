#!/usr/bin/env bash
set -euo pipefail

PANEL_HOST="${ROUTEROS_PANEL_HOST:-}"
PANEL_PORT="${ROUTEROS_PANEL_PORT:-28646}"
LISTEN_HOST="${ROUTEROS_PANEL_LISTEN_HOST:-127.0.0.1}"
LISTEN_PORT="${ROUTEROS_PANEL_LISTEN_PORT:-28646}"
INSTALL_DIR="${ROUTEROS_PANEL_ALIAS_DIR:-$HOME/.local/share/routeros-triage-panel/localhost-alias}"
NO_STARTUP="0"

usage() {
  cat <<'EOF'
Install a client-local alias so this device can open:
  http://127.0.0.1:28646/

Usage:
  ROUTEROS_PANEL_HOST=<panel-server-host> bash tools/install-localhost-alias.sh
  bash tools/install-localhost-alias.sh --panel-host <panel-server-host>

Options:
  --panel-host <host>   Panel server LAN host/IP. Required unless ROUTEROS_PANEL_HOST is set.
  --panel-port <port>   Panel server port. Default: 28646.
  --listen-port <port>  Local loopback port. Default: 28646.
  --install-dir <path>  Install directory.
  --no-startup          Start now but do not install a user service/LaunchAgent.
  -h, --help            Show help.
EOF
}

die() {
  printf '[routeros-panel-alias] ERROR: %s\n' "$*" >&2
  exit 1
}

validate_port() {
  local port="$1"
  [[ "$port" =~ ^[0-9]+$ ]] || die "port must be a number"
  (( port >= 1 && port <= 65535 )) || die "port must be between 1 and 65535"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --panel-host)
      [[ $# -ge 2 && -n "${2:-}" ]] || die "--panel-host requires a value"
      PANEL_HOST="$2"
      shift 2
      ;;
    --panel-port)
      [[ $# -ge 2 && -n "${2:-}" ]] || die "--panel-port requires a value"
      PANEL_PORT="$2"
      shift 2
      ;;
    --listen-port)
      [[ $# -ge 2 && -n "${2:-}" ]] || die "--listen-port requires a value"
      LISTEN_PORT="$2"
      shift 2
      ;;
    --install-dir)
      [[ $# -ge 2 && -n "${2:-}" ]] || die "--install-dir requires a value"
      INSTALL_DIR="$2"
      shift 2
      ;;
    --no-startup)
      NO_STARTUP="1"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac
done

[[ -n "$PANEL_HOST" ]] || die "set --panel-host <panel-server-host> or ROUTEROS_PANEL_HOST"
[[ "$PANEL_HOST" != *"://"* && "$PANEL_HOST" != *"/"* && "$PANEL_HOST" != *" "* ]] || die "panel host must be a host/IP, not a URL"
validate_port "$PANEL_PORT"
validate_port "$LISTEN_PORT"
command -v python3 >/dev/null 2>&1 || die "python3 is required for the client-local alias"

mkdir -p "$INSTALL_DIR"
FORWARDER="$INSTALL_DIR/routeros-panel-localhost-forwarder.py"
CONFIG="$INSTALL_DIR/config.env"
PID_FILE="$INSTALL_DIR/forwarder.pid"
LOG_FILE="$INSTALL_DIR/forwarder.log"

if command -v ss >/dev/null 2>&1 && ss -ltn "( sport = :$LISTEN_PORT )" | grep -q "$LISTEN_PORT"; then
  if [[ -f "$PID_FILE" ]]; then
    kill "$(cat "$PID_FILE")" >/dev/null 2>&1 || true
    rm -f "$PID_FILE"
  else
    die "$LISTEN_HOST:$LISTEN_PORT is already in use"
  fi
fi

cat > "$CONFIG" <<EOF
PANEL_HOST=$PANEL_HOST
PANEL_PORT=$PANEL_PORT
LISTEN_HOST=$LISTEN_HOST
LISTEN_PORT=$LISTEN_PORT
PID_FILE=$PID_FILE
LOG_FILE=$LOG_FILE
EOF

cat > "$FORWARDER" <<'PY'
import os
import select
import socket
import threading
import time


def load_env(path):
    values = {}
    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key] = value
    return values


CONFIG = load_env(os.environ["ROUTEROS_PANEL_ALIAS_CONFIG"])
LISTEN_HOST = CONFIG.get("LISTEN_HOST", "127.0.0.1")
LISTEN_PORT = int(CONFIG.get("LISTEN_PORT", "28646"))
PANEL_HOST = CONFIG["PANEL_HOST"]
PANEL_PORT = int(CONFIG.get("PANEL_PORT", "28646"))
PID_FILE = CONFIG.get("PID_FILE")
LOG_FILE = CONFIG.get("LOG_FILE")


def log(message):
    if not LOG_FILE:
        return
    with open(LOG_FILE, "a", encoding="utf-8") as handle:
        handle.write(f"{time.strftime('%Y-%m-%dT%H:%M:%S%z')} {message}\n")


def pipe(left, right):
    sockets = [left, right]
    try:
        while True:
            readable, _, _ = select.select(sockets, [], [], 60)
            for source in readable:
                data = source.recv(65536)
                if not data:
                    return
                destination = right if source is left else left
                destination.sendall(data)
    except OSError:
        return
    finally:
        for sock in sockets:
            try:
                sock.close()
            except OSError:
                pass


def handle(client):
    try:
        target = socket.create_connection((PANEL_HOST, PANEL_PORT), timeout=8)
    except OSError as exc:
        log(f"connect target failed: {exc}")
        try:
            client.close()
        except OSError:
            pass
        return
    pipe(client, target)


def main():
    if PID_FILE:
        with open(PID_FILE, "w", encoding="ascii") as handle:
            handle.write(str(os.getpid()))
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((LISTEN_HOST, LISTEN_PORT))
    server.listen(128)
    log(f"starting {LISTEN_HOST}:{LISTEN_PORT} -> {PANEL_HOST}:{PANEL_PORT}")
    while True:
        client, _ = server.accept()
        threading.Thread(target=handle, args=(client,), daemon=True).start()


if __name__ == "__main__":
    main()
PY

chmod +x "$FORWARDER"

start_now() {
  if [[ -f "$PID_FILE" ]]; then
    kill "$(cat "$PID_FILE")" >/dev/null 2>&1 || true
    rm -f "$PID_FILE"
  fi
  ROUTEROS_PANEL_ALIAS_CONFIG="$CONFIG" nohup python3 "$FORWARDER" >>"$LOG_FILE" 2>&1 &
  printf '%s\n' "$!" > "$PID_FILE"
}

if [[ "$NO_STARTUP" == "0" && "$(uname -s)" == "Darwin" ]]; then
  PLIST_DIR="$HOME/Library/LaunchAgents"
  PLIST="$PLIST_DIR/com.routeros-triage-panel.localhost-alias.$LISTEN_PORT.plist"
  mkdir -p "$PLIST_DIR"
  cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.routeros-triage-panel.localhost-alias.$LISTEN_PORT</string>
  <key>ProgramArguments</key>
  <array>
    <string>$(command -v python3)</string>
    <string>$FORWARDER</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict><key>ROUTEROS_PANEL_ALIAS_CONFIG</key><string>$CONFIG</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$LOG_FILE</string>
  <key>StandardErrorPath</key><string>$LOG_FILE</string>
</dict>
</plist>
EOF
  launchctl unload "$PLIST" >/dev/null 2>&1 || true
  launchctl load "$PLIST" >/dev/null 2>&1 || start_now
elif [[ "$NO_STARTUP" == "0" && -n "${XDG_RUNTIME_DIR:-}" ]] && command -v systemctl >/dev/null 2>&1 && systemctl --user status >/dev/null 2>&1; then
  UNIT_DIR="$HOME/.config/systemd/user"
  UNIT="$UNIT_DIR/routeros-panel-localhost-alias-$LISTEN_PORT.service"
  mkdir -p "$UNIT_DIR"
  cat > "$UNIT" <<EOF
[Unit]
Description=RouterOS Panel localhost alias on 127.0.0.1:$LISTEN_PORT

[Service]
Environment=ROUTEROS_PANEL_ALIAS_CONFIG=$CONFIG
ExecStart=$(command -v python3) $FORWARDER
Restart=always
RestartSec=2

[Install]
WantedBy=default.target
EOF
  systemctl --user daemon-reload
  systemctl --user enable --now "routeros-panel-localhost-alias-$LISTEN_PORT.service"
else
  start_now
fi

sleep 1
if command -v curl >/dev/null 2>&1; then
  curl -fsS "http://$LISTEN_HOST:$LISTEN_PORT/api/health" >/dev/null || true
fi

printf '[routeros-panel-alias] installed\n'
printf 'Open: http://%s:%s/\n' "$LISTEN_HOST" "$LISTEN_PORT"
printf 'Target: http://%s:%s/\n' "$PANEL_HOST" "$PANEL_PORT"
