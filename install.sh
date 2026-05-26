#!/usr/bin/env bash
set -euo pipefail

DEFAULT_REPO_URL="https://github.com/cullysu/ros-ikuai-monitor-panel.git"
DEFAULT_BRANCH="main"
DEFAULT_PORT="28646"
DEFAULT_LOCAL_IMAGE="routeros-triage-panel:local"
DEFAULT_PREBUILT_IMAGE="ghcr.io/cullysu/ros-ikuai-monitor-panel:main"

usage() {
  cat <<'EOF'
RouterOS Triage Panel public Docker installer

Usage:
  curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash
  curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --dir "$HOME/routeros-panel"

Options:
  --local-only          Publish only on 127.0.0.1. This is the default.
  --bind <addr>         Host publish address. Only 127.0.0.1/localhost is allowed.
  --port <port>         Host and in-container panel port. Default: 28646.
  --name <name>         Docker container name. Default: routeros-triage-panel.
  --prebuilt            Pull the prebuilt GHCR image first, then fall back to local build.
  --image <image>       Image tag to use. Default: routeros-triage-panel:local; with --prebuilt: ghcr.io/cullysu/ros-ikuai-monitor-panel:main.
  --build-local         Build from the checked-out source. This is the default public install mode.
  --target-ip <addr>    URL host printed by the panel. Only 127.0.0.1/localhost is allowed.
  --dir <path>          Install directory. Default: ~/.local/share/routeros-triage-panel, or /opt/routeros-triage-panel as root.
  --repo <url>          Git repository URL. Default: https://github.com/cullysu/ros-ikuai-monitor-panel.git
  --branch <name>       Git branch or tag to install. Default: main.
  --source-dir <path>   Copy from a local source tree instead of cloning. Useful for development/testing.
  --upgrade             Update the install directory before starting.
  --uninstall           Stop and remove the Compose service from the install directory.
  --purge               With --uninstall, also remove the Docker volume and install directory.
  --dry-run             Print the resolved plan without changing files.
  -h, --help            Show this help.

First run:
  Open http://127.0.0.1:28646/ on the panel host. Enter the RouterOS SSH host,
  user, and password in the panel UI. You do not need to put RouterOS
  credentials in .env.docker.

If another LAN device cannot connect:
  That is expected. The public installer is localhost-only and does not publish
  a LAN browser URL.
EOF
}

log() {
  printf '[routeros-panel] %s\n' "$*"
}

die() {
  printf '[routeros-panel] ERROR: %s\n' "$*" >&2
  exit 1
}

default_install_dir() {
  if [[ "$(id -u)" -eq 0 ]]; then
    printf '/opt/routeros-triage-panel\n'
  else
    printf '%s/routeros-triage-panel\n' "${XDG_DATA_HOME:-${HOME}/.local/share}"
  fi
}

repo_archive_url() {
  local repo="$1"
  local branch="$2"
  if [[ "$repo" =~ ^https://github.com/([^/]+)/([^/.]+)(\.git)?$ ]]; then
    printf 'https://github.com/%s/%s/archive/refs/heads/%s.tar.gz\n' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" "$branch"
    return 0
  fi
  return 1
}

detect_lan_ip() {
  local candidate=""
  if command -v ip >/dev/null 2>&1; then
    candidate="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i=1; i<=NF; i++) if ($i=="src") {print $(i+1); exit}}' || true)"
  fi
  if [[ -z "$candidate" ]] && command -v hostname >/dev/null 2>&1; then
    candidate="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  fi
  if [[ -z "$candidate" ]] && command -v ipconfig.exe >/dev/null 2>&1; then
    candidate="$(
      ipconfig.exe 2>/dev/null |
        tr -d '\r' |
        awk -F: '/IPv4/ {gsub(/^[ \t]+|[ \t]+$/, "", $2); if ($2 != "" && $2 !~ /^127\./) {print $2; exit}}' ||
        true
    )"
  fi
  printf '%s\n' "${candidate:-127.0.0.1}"
}

validate_port() {
  local port="$1"
  [[ "$port" =~ ^[0-9]+$ ]] || die "--port must be a number"
  (( port >= 1 && port <= 65535 )) || die "--port must be between 1 and 65535"
}

validate_bind() {
  local bind_addr="$1"
  [[ -n "$bind_addr" ]] || die "--bind must not be empty"
  [[ ! "$bind_addr" =~ [[:space:]/] ]] || die "--bind must be a host or IP address, not a URL or CIDR"
}

normalize_loopback_host() {
  local host="$1"
  case "$host" in
    127.0.0.1|localhost|::1|'[::1]')
      printf '127.0.0.1\n'
      ;;
    *)
      return 1
      ;;
  esac
}

validate_container_name() {
  local name="$1"
  [[ "$name" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]*$ ]] || die "--name must be a valid Docker container name"
}

COMPOSE_CMD=()

require_runtime() {
  command -v docker >/dev/null 2>&1 || die "Docker was not found. Install Docker first: https://docs.docker.com/engine/install/"
  docker info >/dev/null 2>&1 || die "Docker is installed but the daemon is not reachable. Start Docker or fix user permissions."
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1 && docker-compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
  else
    die "Docker Compose was not found. Install the Docker Compose plugin so 'docker compose version' works."
  fi
}

copy_source_tree() {
  local src="$1"
  local dest="$2"
  [[ -f "$src/compose.yml" && -f "$src/Dockerfile" ]] || die "--source-dir must point to the repository root"
  mkdir -p "$dest"
  if [[ "$(cd "$src" && pwd)" == "$(cd "$dest" && pwd)" ]]; then
    return 0
  fi
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete \
      --exclude '.git' \
      --exclude '.env' \
      --exclude '.env.docker' \
      --exclude 'routeros-panel.env' \
      --exclude 'docker.env' \
      --exclude '.venv' \
      --exclude '.venv-*' \
      --exclude 'build' \
      --exclude 'dist' \
      --exclude '__pycache__' \
      --exclude '_*' \
      --exclude '*.log' \
      --exclude '*.out.log' \
      --exclude '*.err.log' \
      --exclude 'public/*.bak-*' \
      --exclude 'public/_preview*.html' \
      --exclude 'public/*.pre-*.js' \
      --exclude 'public/index.extracted.js' \
      "$src/" "$dest/"
  else
    command -v tar >/dev/null 2>&1 || die "rsync or tar is required to copy from --source-dir."
    (
      cd "$src"
      tar \
        --exclude='.git' \
        --exclude='.env' \
        --exclude='.env.docker' \
        --exclude='routeros-panel.env' \
        --exclude='docker.env' \
        --exclude='.venv' \
        --exclude='.venv-*' \
        --exclude='build' \
        --exclude='dist' \
        --exclude='__pycache__' \
        --exclude='_*' \
        --exclude='*.log' \
        --exclude='*.out.log' \
        --exclude='*.err.log' \
        --exclude='public/*.bak-*' \
        --exclude='public/_preview*.html' \
        --exclude='public/*.pre-*.js' \
        --exclude='public/index.extracted.js' \
        -cf - .
    ) | (
      cd "$dest"
      tar -xf -
    )
  fi
}

clone_or_download() {
  local repo="$1"
  local branch="$2"
  local dest="$3"
  if command -v git >/dev/null 2>&1; then
    git clone --depth 1 --branch "$branch" "$repo" "$dest"
    return 0
  fi
  command -v curl >/dev/null 2>&1 || die "Neither git nor curl is available to download the project."
  command -v tar >/dev/null 2>&1 || die "tar is required when git is unavailable."
  local archive_url
  archive_url="$(repo_archive_url "$repo" "$branch")" || die "git is unavailable and this repository URL cannot be downloaded as a GitHub archive."
  local tmp
  tmp="$(mktemp -d)"
  curl -fsSL "$archive_url" -o "$tmp/source.tar.gz"
  tar -xzf "$tmp/source.tar.gz" -C "$tmp"
  local extracted
  extracted="$(find "$tmp" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  [[ -n "$extracted" ]] || die "Downloaded archive did not contain a source directory."
  mv "$extracted" "$dest"
  rm -rf "$tmp"
}

compose_service_image() {
  local image="$1"
  [[ -n "$image" ]] || die "--image must not be empty"
  [[ ! "$image" =~ [[:space:]] ]] || die "--image must not contain whitespace"
}

update_existing_repo() {
  local dir="$1"
  local branch="$2"
  if [[ -d "$dir/.git" ]]; then
    git -C "$dir" fetch --depth 1 origin "$branch"
    git -C "$dir" checkout -q FETCH_HEAD
  else
    log "Install directory is not a Git checkout; keeping existing source tree."
  fi
}

set_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp
  tmp="$(mktemp)"
  awk -v key="$key" -v value="$value" '
    BEGIN { done = 0 }
    $0 ~ "^" key "=" {
      print key "=" value
      done = 1
      next
    }
    { print }
    END {
      if (!done) {
        print key "=" value
      }
    }
  ' "$file" > "$tmp"
  mv "$tmp" "$file"
}

configure_env() {
  local dir="$1"
  local env_file="$dir/.env.docker"
  if [[ ! -f "$env_file" ]]; then
    cp "$dir/.env.docker.example" "$env_file"
    chmod 600 "$env_file" || true
  fi
  set_env_value "$env_file" "ROS_PANEL_PUBLISHED_ADDR" "$PUBLISHED_ADDR"
  set_env_value "$env_file" "ROS_PANEL_PUBLISHED_PORT" "$PUBLISHED_PORT"
  set_env_value "$env_file" "ROS_PANEL_CONTAINER_NAME" "$CONTAINER_NAME"
  set_env_value "$env_file" "ROS_PANEL_IMAGE" "$PANEL_IMAGE"
  set_env_value "$env_file" "ROS_PANEL_BIND" "0.0.0.0"
  set_env_value "$env_file" "ROS_PANEL_PORT" "$PUBLISHED_PORT"
  set_env_value "$env_file" "ROS_PANEL_TARGET_IP" "$TARGET_IP"
  set_env_value "$env_file" "ROS_PANEL_PROFILE" "routeros_only"
  set_env_value "$env_file" "ROS_PANEL_IP_ALIAS_WRITE_ENABLED" "0"
  set_env_value "$env_file" "ROS_PANEL_EXPOSE_ADMIN_SESSIONS" "0"
}

compose_up() {
  local dir="$1"
  if [[ "$BUILD_LOCAL" == "1" || -n "$SOURCE_DIR" ]]; then
    (cd "$dir" && "${COMPOSE_CMD[@]}" --env-file .env.docker up -d --build)
    return
  fi

  if (cd "$dir" && "${COMPOSE_CMD[@]}" --env-file .env.docker pull routeros-triage); then
    (cd "$dir" && "${COMPOSE_CMD[@]}" --env-file .env.docker up -d)
  else
    log "Prebuilt image pull failed; falling back to local Docker build."
    (cd "$dir" && "${COMPOSE_CMD[@]}" --env-file .env.docker up -d --build)
  fi
}

compose_down() {
  local dir="$1"
  local volume_flag=()
  if [[ "$PURGE" == "1" ]]; then
    volume_flag=(-v)
  fi
  if [[ -f "$dir/compose.yml" ]]; then
    (cd "$dir" && "${COMPOSE_CMD[@]}" --env-file .env.docker down "${volume_flag[@]}")
  else
    die "No compose.yml found in $dir"
  fi
}

remove_install_dir() {
  local dir="$1"
  local parent
  local base
  local resolved

  [[ -n "$dir" && "$dir" != "/" ]] || die "Refusing to remove an unsafe install directory: $dir"
  parent="$(cd "$(dirname "$dir")" && pwd -P)" || die "Cannot resolve install directory parent: $dir"
  base="$(basename "$dir")"
  resolved="$parent/$base"

  case "$resolved" in
    "/"|"/root"|"/home"|"/opt"|"/tmp"|"$HOME")
      die "Refusing to remove broad system/user directory: $resolved"
      ;;
  esac

  [[ -f "$resolved/compose.yml" && -f "$resolved/.env.docker" ]] || die "Refusing to purge $resolved because it does not look like a panel install directory."
  rm -rf "$resolved"
}

REPO_URL="${ROS_PANEL_INSTALL_REPO:-$DEFAULT_REPO_URL}"
BRANCH="${ROS_PANEL_INSTALL_BRANCH:-$DEFAULT_BRANCH}"
INSTALL_DIR="${ROS_PANEL_INSTALL_DIR:-$(default_install_dir)}"
PUBLISHED_ADDR="127.0.0.1"
PUBLISHED_PORT="$DEFAULT_PORT"
CONTAINER_NAME="${ROS_PANEL_CONTAINER_NAME:-routeros-triage-panel}"
PANEL_IMAGE="${ROS_PANEL_IMAGE:-$DEFAULT_LOCAL_IMAGE}"
PANEL_IMAGE_EXPLICIT="0"
TARGET_IP="127.0.0.1"
TARGET_IP_EXPLICIT="0"
SOURCE_DIR="${ROS_PANEL_INSTALL_SOURCE_DIR:-}"
BUILD_LOCAL="${ROS_PANEL_BUILD_LOCAL:-1}"
PREBUILT_REQUESTED="0"
UPGRADE="0"
UNINSTALL="0"
PURGE="0"
DRY_RUN="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --lan)
      die "--lan is not supported by the public installer. Open http://127.0.0.1:28646/."
      ;;
    --local-only)
      PUBLISHED_ADDR="127.0.0.1"
      shift
      ;;
    --bind)
      [[ $# -ge 2 && -n "${2:-}" ]] || die "--bind requires an address"
      validate_bind "$2"
      PUBLISHED_ADDR="$(normalize_loopback_host "$2")" || die "--bind must be 127.0.0.1 or localhost for the public installer"
      shift 2
      ;;
    --port)
      [[ $# -ge 2 && -n "${2:-}" ]] || die "--port requires a value"
      PUBLISHED_PORT="$2"
      validate_port "$PUBLISHED_PORT"
      shift 2
      ;;
    --name)
      [[ $# -ge 2 && -n "${2:-}" ]] || die "--name requires a container name"
      CONTAINER_NAME="$2"
      shift 2
      ;;
    --image)
      [[ $# -ge 2 && -n "${2:-}" ]] || die "--image requires an image reference"
      PANEL_IMAGE="$2"
      PANEL_IMAGE_EXPLICIT="1"
      shift 2
      ;;
    --prebuilt)
      PREBUILT_REQUESTED="1"
      BUILD_LOCAL="0"
      shift
      ;;
    --build-local)
      BUILD_LOCAL="1"
      shift
      ;;
    --target-ip)
      [[ $# -ge 2 && -n "${2:-}" ]] || die "--target-ip requires an address"
      TARGET_IP="$(normalize_loopback_host "$2")" || die "--target-ip must be 127.0.0.1 or localhost for the public installer"
      TARGET_IP_EXPLICIT="1"
      shift 2
      ;;
    --dir)
      [[ $# -ge 2 && -n "${2:-}" ]] || die "--dir requires a path"
      INSTALL_DIR="$2"
      shift 2
      ;;
    --repo)
      [[ $# -ge 2 && -n "${2:-}" ]] || die "--repo requires a URL"
      REPO_URL="$2"
      shift 2
      ;;
    --branch)
      [[ $# -ge 2 && -n "${2:-}" ]] || die "--branch requires a branch or tag"
      BRANCH="$2"
      shift 2
      ;;
    --source-dir)
      [[ $# -ge 2 && -n "${2:-}" ]] || die "--source-dir requires a path"
      SOURCE_DIR="$2"
      shift 2
      ;;
    --upgrade)
      UPGRADE="1"
      shift
      ;;
    --uninstall)
      UNINSTALL="1"
      shift
      ;;
    --purge)
      PURGE="1"
      shift
      ;;
    --dry-run)
      DRY_RUN="1"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

validate_port "$PUBLISHED_PORT"
validate_bind "$PUBLISHED_ADDR"
validate_container_name "$CONTAINER_NAME"
if [[ "$PREBUILT_REQUESTED" == "1" && "$PANEL_IMAGE_EXPLICIT" == "0" ]]; then
  PANEL_IMAGE="$DEFAULT_PREBUILT_IMAGE"
fi
compose_service_image "$PANEL_IMAGE"
INSTALL_DIR="${INSTALL_DIR/#\~/$HOME}"
if [[ -n "$SOURCE_DIR" ]]; then
  SOURCE_DIR="${SOURCE_DIR/#\~/$HOME}"
fi

if [[ "$PUBLISHED_ADDR" == "127.0.0.1" && "$TARGET_IP_EXPLICIT" == "0" ]]; then
  TARGET_IP="127.0.0.1"
fi

if [[ "$DRY_RUN" == "1" ]]; then
  cat <<EOF
Install plan:
  repo:       $REPO_URL
  branch:     $BRANCH
  source-dir: ${SOURCE_DIR:-<clone/download>}
  dir:        $INSTALL_DIR
  image:      $PANEL_IMAGE
  mode:       $([[ "$BUILD_LOCAL" == "1" || -n "$SOURCE_DIR" ]] && printf 'local-build' || printf 'pull-then-build-fallback')
  bind:       $PUBLISHED_ADDR
  port:       $PUBLISHED_PORT
  name:       $CONTAINER_NAME
  target-ip:  $TARGET_IP
  local-url:  http://127.0.0.1:$PUBLISHED_PORT/
  browser-url: http://127.0.0.1:$PUBLISHED_PORT/
  exposure:   localhost-only
  upgrade:    $UPGRADE
  uninstall:  $UNINSTALL
  purge:      $PURGE
EOF
  exit 0
fi

if [[ "$UNINSTALL" == "1" ]]; then
  require_runtime
  compose_down "$INSTALL_DIR"
  if [[ "$PURGE" == "1" ]]; then
    remove_install_dir "$INSTALL_DIR"
    log "Removed $INSTALL_DIR"
  else
    log "Stopped panel. Install files and Docker volume were kept."
  fi
  exit 0
fi

require_runtime

if [[ -d "$INSTALL_DIR" && ! -f "$INSTALL_DIR/compose.yml" ]]; then
  die "$INSTALL_DIR exists but does not look like a panel install directory."
fi

if [[ -n "$SOURCE_DIR" ]]; then
  copy_source_tree "$SOURCE_DIR" "$INSTALL_DIR"
elif [[ ! -d "$INSTALL_DIR" ]]; then
  clone_or_download "$REPO_URL" "$BRANCH" "$INSTALL_DIR"
elif [[ "$UPGRADE" == "1" ]]; then
  update_existing_repo "$INSTALL_DIR" "$BRANCH"
fi

[[ -f "$INSTALL_DIR/compose.yml" ]] || die "compose.yml was not found in $INSTALL_DIR"
[[ -f "$INSTALL_DIR/.env.docker.example" ]] || die ".env.docker.example was not found in $INSTALL_DIR"

configure_env "$INSTALL_DIR"
compose_up "$INSTALL_DIR"

log "Installed in: $INSTALL_DIR"
log "Open: http://127.0.0.1:$PUBLISHED_PORT/"
log "Network exposure: localhost-only. Other IP browser entrypoints are not enabled by this installer."
log "Enter the RouterOS SSH host, user, and password in the panel login page."
log "Upgrade later: curl -fsSL https://raw.githubusercontent.com/cullysu/ros-ikuai-monitor-panel/main/install.sh | bash -s -- --upgrade --dir '$INSTALL_DIR'"
