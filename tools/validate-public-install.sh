#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
IMMUTABLE_GHCR_IMAGE="ghcr.io/cullysu/ros-ikuai-monitor-panel:sha-0123456789abcdef0123456789abcdef01234567"

echo "[check] install.sh syntax"
bash -n install.sh

echo "[check] install.sh help"
bash install.sh --help >/dev/null

echo "[check] install.sh dry-run"
dry_run_output="$(bash install.sh --dry-run --source-dir "$ROOT_DIR" --dir "${TMPDIR:-/tmp}/routeros-panel-install-check")"
printf '%s\n' "$dry_run_output" | grep -F "bind:       127.0.0.1" >/dev/null
printf '%s\n' "$dry_run_output" | grep -F "image:      routeros-triage-panel:local" >/dev/null
printf '%s\n' "$dry_run_output" | grep -F "mode:       local-build" >/dev/null
printf '%s\n' "$dry_run_output" | grep -F "port:       28646" >/dev/null
printf '%s\n' "$dry_run_output" | grep -F "target-ip:  127.0.0.1" >/dev/null
printf '%s\n' "$dry_run_output" | grep -F "local-url:  http://127.0.0.1:28646/" >/dev/null
printf '%s\n' "$dry_run_output" | grep -F "browser-url: http://127.0.0.1:28646/" >/dev/null
printf '%s\n' "$dry_run_output" | grep -F "exposure:   localhost-only" >/dev/null

echo "[check] install.sh public pull dry-run"
pull_dry_run_output="$(bash install.sh --dry-run --prebuilt --image "$IMMUTABLE_GHCR_IMAGE" --dir "${TMPDIR:-/tmp}/routeros-panel-pull-check")"
printf '%s\n' "$pull_dry_run_output" | grep -F "image:      $IMMUTABLE_GHCR_IMAGE" >/dev/null
printf '%s\n' "$pull_dry_run_output" | grep -F "mode:       pull-prebuilt" >/dev/null

echo "[check] install.sh rejects mutable or missing prebuilt image tags"
for invalid_image in \
  "ghcr.io/cullysu/ros-ikuai-monitor-panel:main" \
  "ghcr.io/cullysu/ros-ikuai-monitor-panel:latest" \
  "ghcr.io/cullysu/ros-ikuai-monitor-panel:sha-0123456789abcdef"; do
  if bash install.sh --dry-run --prebuilt --image "$invalid_image" --dir "${TMPDIR:-/tmp}/routeros-panel-invalid-image-check" >/dev/null 2>&1; then
    echo "install.sh unexpectedly accepted mutable or malformed prebuilt image: $invalid_image" >&2
    exit 1
  fi
done
if bash install.sh --dry-run --prebuilt --dir "${TMPDIR:-/tmp}/routeros-panel-missing-image-check" >/dev/null 2>&1; then
  echo "install.sh unexpectedly accepted --prebuilt without an immutable --image" >&2
  exit 1
fi
if grep -F "falling back to local Docker build" install.sh >/dev/null; then
  echo "install.sh still permits a prebuilt-image build fallback" >&2
  exit 1
fi

echo "[check] install.sh local-only dry-run"
local_only_output="$(bash install.sh --dry-run --local-only --source-dir "$ROOT_DIR" --dir "${TMPDIR:-/tmp}/routeros-panel-local-only-check")"
printf '%s\n' "$local_only_output" | grep -F "bind:       127.0.0.1" >/dev/null
printf '%s\n' "$local_only_output" | grep -F "exposure:   localhost-only" >/dev/null

echo "[check] install.sh rejects non-localhost exposure"
if bash install.sh --dry-run --lan --source-dir "$ROOT_DIR" --dir "${TMPDIR:-/tmp}/routeros-panel-lan-check" >/dev/null 2>&1; then
  echo "install.sh unexpectedly accepted --lan" >&2
  exit 1
fi
if bash install.sh --dry-run --bind 0.0.0.0 --source-dir "$ROOT_DIR" --dir "${TMPDIR:-/tmp}/routeros-panel-bind-check" >/dev/null 2>&1; then
  echo "install.sh unexpectedly accepted --bind 0.0.0.0" >&2
  exit 1
fi
if bash install.sh --dry-run --target-ip 192.168.88.2 --source-dir "$ROOT_DIR" --dir "${TMPDIR:-/tmp}/routeros-panel-target-check" >/dev/null 2>&1; then
  echo "install.sh unexpectedly accepted --target-ip 192.168.88.2" >&2
  exit 1
fi

echo "[check] source-dir sync preserves unmanaged files unless --upgrade is explicit"
install_check_tmp="$(mktemp -d)"
trap 'rm -rf "$install_check_tmp"' EXIT
fixture_source="$install_check_tmp/source"
fixture_dest="$install_check_tmp/destination"
fixture_bin="$install_check_tmp/bin"
rsync_log="$install_check_tmp/rsync.args"
mkdir -p "$fixture_source" "$fixture_dest" "$fixture_bin"
printf 'services: {}\n' > "$fixture_source/compose.yml"
printf 'FROM scratch\n' > "$fixture_source/Dockerfile"
printf 'ROS_PANEL_PUBLISHED_PORT=28646\n' > "$fixture_source/.env.docker.example"
printf 'services: {}\n' > "$fixture_dest/compose.yml"
printf 'ROS_PANEL_PUBLISHED_PORT=28646\n' > "$fixture_dest/.env.docker"
printf 'keep me\n' > "$fixture_dest/unmanaged.keep"

cat > "$fixture_bin/docker" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
cat > "$fixture_bin/rsync" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\0' "$@" >> "$RSYNC_LOG"
delete_mode=0
for arg in "$@"; do
  [[ "$arg" == "--delete" ]] && delete_mode=1
done
src="${@: -2:1}"
dest="${@: -1}"
if [[ "$delete_mode" == "1" ]]; then
  find "$dest" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
fi
mkdir -p "$dest"
cp -a "$src/." "$dest/"
EOF
chmod +x "$fixture_bin/docker" "$fixture_bin/rsync"

PATH="$fixture_bin:$PATH" RSYNC_LOG="$rsync_log" bash install.sh --source-dir "$fixture_source" --dir "$fixture_dest" >/dev/null
if tr '\0' '\n' < "$rsync_log" | grep -Fx -- '--delete' >/dev/null; then
  echo "ordinary --source-dir install unexpectedly invoked rsync --delete" >&2
  exit 1
fi
test -f "$fixture_dest/unmanaged.keep"

: > "$rsync_log"
PATH="$fixture_bin:$PATH" RSYNC_LOG="$rsync_log" bash install.sh --source-dir "$fixture_source" --upgrade --dir "$fixture_dest" >/dev/null
tr '\0' '\n' < "$rsync_log" | grep -Fx -- '--delete' >/dev/null
if test -f "$fixture_dest/unmanaged.keep"; then
  echo "explicit --upgrade did not perform requested source replacement" >&2
  exit 1
fi

if command -v node >/dev/null 2>&1; then
  echo "[check] LAN access defaults"
  node tools/check-lan-access-defaults.js
else
  echo "[skip] node is not available"
fi

if docker compose version >/dev/null 2>&1; then
  echo "[check] docker compose config"
  docker compose --env-file .env.docker.example config --quiet
elif command -v docker-compose >/dev/null 2>&1; then
  echo "[check] docker-compose config"
  docker-compose --env-file .env.docker.example config --quiet
else
  echo "[skip] docker compose is not available"
fi

echo "[ok] public install checks passed"
