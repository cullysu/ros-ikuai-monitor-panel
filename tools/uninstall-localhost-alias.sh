#!/usr/bin/env bash
set -euo pipefail

LISTEN_PORT="${ROUTEROS_PANEL_LISTEN_PORT:-28646}"
INSTALL_DIR="${ROUTEROS_PANEL_ALIAS_DIR:-$HOME/.local/share/routeros-triage-panel/localhost-alias}"
KEEP_FILES="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --listen-port)
      LISTEN_PORT="$2"
      shift 2
      ;;
    --install-dir)
      INSTALL_DIR="$2"
      shift 2
      ;;
    --keep-files)
      KEEP_FILES="1"
      shift
      ;;
    -h|--help)
      echo "Usage: bash tools/uninstall-localhost-alias.sh [--listen-port 28646]"
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

PID_FILE="$INSTALL_DIR/forwarder.pid"

if command -v systemctl >/dev/null 2>&1; then
  systemctl --user disable --now "routeros-panel-localhost-alias-$LISTEN_PORT.service" >/dev/null 2>&1 || true
  rm -f "$HOME/.config/systemd/user/routeros-panel-localhost-alias-$LISTEN_PORT.service"
  systemctl --user daemon-reload >/dev/null 2>&1 || true
fi

if [[ "$(uname -s)" == "Darwin" ]]; then
  PLIST="$HOME/Library/LaunchAgents/com.routeros-triage-panel.localhost-alias.$LISTEN_PORT.plist"
  launchctl unload "$PLIST" >/dev/null 2>&1 || true
  rm -f "$PLIST"
fi

if [[ -f "$PID_FILE" ]]; then
  kill "$(cat "$PID_FILE")" >/dev/null 2>&1 || true
  rm -f "$PID_FILE"
fi

if [[ "$KEEP_FILES" == "0" ]]; then
  rm -rf "$INSTALL_DIR"
fi

printf '[routeros-panel-alias] removed for 127.0.0.1:%s\n' "$LISTEN_PORT"
