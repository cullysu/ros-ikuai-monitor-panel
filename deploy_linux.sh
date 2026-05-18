#!/usr/bin/env bash
set -euo pipefail

# This deploy script supports two modes:
# - Legacy mode (default): installs routeros-panel.service + ros-panel-ip.service and /etc/default/routeros-panel
# - Instance mode: installs template units routeros-panel@.service (+ optional ros-panel-ip@.service)
#   and writes /etc/default/routeros-panel-<instance> so multiple instances can coexist.
#
# Backward-compat: running with no args keeps the legacy behavior (private 192.168.3.5 instance).

usage() {
  cat <<'EOF'
Usage:
  ./deploy_linux.sh [--instance <name>] [--enable-ip-service|--disable-ip-service] [--app-dir <dir>]

Examples:
  # Legacy/private (keeps existing names: routeros-panel.service, ros-panel-ip.service)
  sudo ./deploy_linux.sh

  # Public/RouterOS-only instance (separate names via template units)
  sudo ./deploy_linux.sh --instance public50 --disable-ip-service

Environment overrides:
  APP_DIR, SRC_DIR, ROS_PANEL_BIND, ROS_PANEL_PORT, ROS_PANEL_TARGET_IP, ROS_PANEL_IFACE, ...
  ROS_PANEL_INSTANCE, ROS_PANEL_ENABLE_IP_SERVICE
EOF
}

INSTANCE="${ROS_PANEL_INSTANCE:-}"
ENABLE_IP_SERVICE="${ROS_PANEL_ENABLE_IP_SERVICE:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --instance)
      if [[ $# -lt 2 ]] || [[ -z "${2:-}" ]]; then
        echo "--instance requires a non-empty value" >&2
        usage >&2
        exit 2
      fi
      INSTANCE="$2"
      shift 2
      ;;
    --enable-ip-service)
      ENABLE_IP_SERVICE="1"
      shift
      ;;
    --disable-ip-service)
      ENABLE_IP_SERVICE="0"
      shift
      ;;
    --app-dir)
      if [[ $# -lt 2 ]] || [[ -z "${2:-}" ]]; then
        echo "--app-dir requires a non-empty value" >&2
        usage >&2
        exit 2
      fi
      APP_DIR="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

MODE="legacy"
if [[ -n "${INSTANCE}" ]]; then
  MODE="instance"
fi

if [[ -z "${APP_DIR:-}" ]]; then
  if [[ "${MODE}" == "instance" ]]; then
    APP_DIR="/opt/ros-ikuai-monitor-panel-${INSTANCE}"
  else
    APP_DIR="/opt/ros-ikuai-monitor-panel"
  fi
fi

SRC_DIR="${SRC_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
VENV_DIR="${APP_DIR}/.venv"

if [[ "${MODE}" == "instance" ]]; then
  ENV_FILE="/etc/default/routeros-panel-${INSTANCE}"
  SERVICE_FILE="/etc/systemd/system/routeros-panel@.service"
  IP_SERVICE_FILE="/etc/systemd/system/ros-panel-ip@.service"
  PANEL_UNIT="routeros-panel@${INSTANCE}.service"
  IP_UNIT="ros-panel-ip@${INSTANCE}.service"

  # In instance mode, default to NOT touching host IPs unless explicitly enabled.
  if [[ -z "${ENABLE_IP_SERVICE}" ]]; then
    ENABLE_IP_SERVICE="0"
  fi
else
  ENV_FILE="/etc/default/routeros-panel"
  SERVICE_FILE="/etc/systemd/system/routeros-panel.service"
  IP_SERVICE_FILE="/etc/systemd/system/ros-panel-ip.service"
  PANEL_UNIT="routeros-panel.service"
  IP_UNIT="ros-panel-ip.service"
fi

ROS_PANEL_BIND="${ROS_PANEL_BIND:-0.0.0.0}"
ROS_PANEL_PORT="${ROS_PANEL_PORT:-80}"
ROS_PANEL_TARGET_IP="${ROS_PANEL_TARGET_IP:-192.168.3.5}"
ROS_PANEL_PROFILE="${ROS_PANEL_PROFILE:-private_ops}"
ROS_PANEL_IFACE="${ROS_PANEL_IFACE:-ens192}"
ROS_PANEL_BIND_CIDR="${ROS_PANEL_BIND_CIDR:-24}"
ROS_PANEL_IP_HEAL_SECONDS="${ROS_PANEL_IP_HEAL_SECONDS:-3}"
ROS_MONITOR_ROUTER_HOST="${ROS_MONITOR_ROUTER_HOST:-192.168.3.1}"
ROS_MONITOR_ROUTER_USER="${ROS_MONITOR_ROUTER_USER:-admin}"
ROS_MONITOR_ROUTER_PASSWORD="${ROS_MONITOR_ROUTER_PASSWORD:-CHANGE_ME}"
ROS_MONITOR_POLL_SECONDS="${ROS_MONITOR_POLL_SECONDS:-1}"
ROS_MONITOR_STATIC_POLL_SECONDS="${ROS_MONITOR_STATIC_POLL_SECONDS:-300}"
ROS_MONITOR_STATIC_REST_WORKERS="${ROS_MONITOR_STATIC_REST_WORKERS:-1}"
ROS_MONITOR_SLOW_REST_POLL_SECONDS="${ROS_MONITOR_SLOW_REST_POLL_SECONDS:-60}"
ROS_MONITOR_SLOW_REST_WORKERS="${ROS_MONITOR_SLOW_REST_WORKERS:-2}"
ROS_MONITOR_CONNECTION_DETAIL_POLL_SECONDS="${ROS_MONITOR_CONNECTION_DETAIL_POLL_SECONDS:-2}"
ROS_MONITOR_DETAIL_REST_WORKERS="${ROS_MONITOR_DETAIL_REST_WORKERS:-2}"
ROS_MONITOR_CONNECTION_PROTOCOL_POLL_SECONDS="${ROS_MONITOR_CONNECTION_PROTOCOL_POLL_SECONDS:-30}"

sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y python3-venv python3-pip rsync curl

sudo mkdir -p "${APP_DIR}"
sudo rsync -a --delete \
  --exclude '.venv' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '*.log' \
  --exclude '_sample*.json' \
  "${SRC_DIR}/" "${APP_DIR}/"

sudo python3 -m venv "${VENV_DIR}"
sudo PIP_DISABLE_PIP_VERSION_CHECK=1 "${VENV_DIR}/bin/pip" install --progress-bar off --upgrade pip
sudo PIP_DISABLE_PIP_VERSION_CHECK=1 "${VENV_DIR}/bin/pip" install --progress-bar off -r "${APP_DIR}/requirements.txt"

if [[ "${MODE}" == "instance" ]]; then
  sudo install -m 0644 "${APP_DIR}/routeros-panel@.service" "${SERVICE_FILE}"
  sudo install -m 0644 "${APP_DIR}/ros-panel-ip@.service" "${IP_SERVICE_FILE}"
else
  sudo install -m 0644 "${APP_DIR}/routeros-panel.service" "${SERVICE_FILE}"
  sudo install -m 0644 "${APP_DIR}/ros-panel-ip.service" "${IP_SERVICE_FILE}"
fi

sudo tee "${ENV_FILE}" >/dev/null <<EOF
PYTHONUNBUFFERED=1
ROS_PANEL_BIND=${ROS_PANEL_BIND}
ROS_PANEL_PORT=${ROS_PANEL_PORT}
ROS_PANEL_TARGET_IP=${ROS_PANEL_TARGET_IP}
ROS_PANEL_PROFILE=${ROS_PANEL_PROFILE}
ROS_PANEL_IFACE=${ROS_PANEL_IFACE}
ROS_PANEL_BIND_CIDR=${ROS_PANEL_BIND_CIDR}
ROS_PANEL_IP_HEAL_SECONDS=${ROS_PANEL_IP_HEAL_SECONDS}
ROS_MONITOR_ROUTER_HOST=${ROS_MONITOR_ROUTER_HOST}
ROS_MONITOR_ROUTER_USER=${ROS_MONITOR_ROUTER_USER}
ROS_MONITOR_ROUTER_PASSWORD=${ROS_MONITOR_ROUTER_PASSWORD}
ROS_MONITOR_POLL_SECONDS=${ROS_MONITOR_POLL_SECONDS}
ROS_MONITOR_STATIC_POLL_SECONDS=${ROS_MONITOR_STATIC_POLL_SECONDS}
ROS_MONITOR_STATIC_REST_WORKERS=${ROS_MONITOR_STATIC_REST_WORKERS}
ROS_MONITOR_SLOW_REST_POLL_SECONDS=${ROS_MONITOR_SLOW_REST_POLL_SECONDS}
ROS_MONITOR_SLOW_REST_WORKERS=${ROS_MONITOR_SLOW_REST_WORKERS}
ROS_MONITOR_CONNECTION_DETAIL_POLL_SECONDS=${ROS_MONITOR_CONNECTION_DETAIL_POLL_SECONDS}
ROS_MONITOR_DETAIL_REST_WORKERS=${ROS_MONITOR_DETAIL_REST_WORKERS}
ROS_MONITOR_CONNECTION_PROTOCOL_POLL_SECONDS=${ROS_MONITOR_CONNECTION_PROTOCOL_POLL_SECONDS}
EOF

if [[ "${MODE}" == "instance" ]]; then
  # If the operator overrides APP_DIR, ensure the instance unit points at the right path.
  # Using a drop-in also isolates per-instance customizations.
  UNIT_OVERRIDE_DIR="/etc/systemd/system/${PANEL_UNIT}.d"
  sudo mkdir -p "${UNIT_OVERRIDE_DIR}"
  sudo tee "${UNIT_OVERRIDE_DIR}/override.conf" >/dev/null <<EOF
[Service]
WorkingDirectory=${APP_DIR}
ExecStart=
ExecStart=${VENV_DIR}/bin/python ${APP_DIR}/app.py
EOF
fi

sudo systemctl daemon-reload
if [[ "${MODE}" == "instance" ]]; then
  sudo systemctl enable "${PANEL_UNIT}"
  sudo systemctl restart "${PANEL_UNIT}"

  if [[ "${ENABLE_IP_SERVICE}" == "1" ]]; then
    sudo systemctl enable "${IP_UNIT}"
    sudo systemctl restart "${IP_UNIT}"
  else
    # Do not attempt to add/hold secondary IPs unless the operator explicitly opts in.
    sudo systemctl stop "${IP_UNIT}" >/dev/null 2>&1 || true
    sudo systemctl disable "${IP_UNIT}" >/dev/null 2>&1 || true
  fi
else
  sudo systemctl enable "${IP_UNIT}" "${PANEL_UNIT}"
  sudo systemctl restart "${IP_UNIT}"
  sudo systemctl restart "${PANEL_UNIT}"
fi

sleep 5
sudo systemctl --no-pager --full status "${IP_UNIT}" "${PANEL_UNIT}" || true
curl -fsS "http://${ROS_PANEL_TARGET_IP}/api/health"
