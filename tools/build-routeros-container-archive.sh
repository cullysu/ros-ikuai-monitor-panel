#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLATFORM="linux/amd64"
TAG="routeros-triage-panel:routeros"
OUTPUT="$ROOT_DIR/routeros-triage-panel-routeros.tar"
BUILD_ARGS=()

usage() {
  cat <<'EOF'
Usage: tools/build-routeros-container-archive.sh [options]

Build a RouterOS-friendly Docker archive from the local source tree.

Options:
  --platform <platform>  Image platform to build. Default: linux/amd64.
  --tag <tag>            Local Docker image tag. Default: routeros-triage-panel:routeros.
  --output <path>        Output tar path. Default: ./routeros-triage-panel-routeros.tar.
  --no-cache             Disable Docker build cache.
  -h, --help             Show this help.

The script does not push to any registry. Upload the output tar to RouterOS
storage and use /container/add file=<tar> after reading DEPLOY_ROUTEROS_CONTAINER.md.
EOF
}

die() {
  echo "error: $*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform)
      [[ $# -ge 2 && -n "${2:-}" ]] || die "--platform requires a value"
      PLATFORM="$2"
      shift 2
      ;;
    --tag)
      [[ $# -ge 2 && -n "${2:-}" ]] || die "--tag requires a value"
      TAG="$2"
      shift 2
      ;;
    --output)
      [[ $# -ge 2 && -n "${2:-}" ]] || die "--output requires a path"
      OUTPUT="$2"
      shift 2
      ;;
    --no-cache)
      BUILD_ARGS+=(--no-cache)
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown option: $1"
      ;;
  esac
done

command -v docker >/dev/null 2>&1 || die "docker CLI was not found"
command -v python >/dev/null 2>&1 || command -v python3 >/dev/null 2>&1 || die "python or python3 was not found"

PYTHON_BIN="python"
if ! command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python3"
fi

case "$PLATFORM" in
  linux/amd64|linux/arm64|linux/arm/v7)
    ;;
  *)
    die "--platform must be one of linux/amd64, linux/arm64, or linux/arm/v7"
    ;;
esac

OUTPUT_DIR="$(dirname "$OUTPUT")"
mkdir -p "$OUTPUT_DIR"
OUTPUT="$(cd "$OUTPUT_DIR" && pwd)/$(basename "$OUTPUT")"
TMP_ARCHIVE="$(mktemp "${TMPDIR:-/tmp}/routeros-triage-panel.XXXXXX.tar")"
trap 'rm -f "$TMP_ARCHIVE"' EXIT

echo "[build] platform: $PLATFORM"
echo "[build] tag:      $TAG"
echo "[build] output:   $OUTPUT"

docker buildx build \
  --platform "$PLATFORM" \
  --tag "$TAG" \
  --provenance=false \
  --sbom=false \
  --load \
  "${BUILD_ARGS[@]}" \
  "$ROOT_DIR"

docker save --output "$TMP_ARCHIVE" "$TAG"
"$PYTHON_BIN" "$ROOT_DIR/tools/convert-oci-to-routeros-docker-archive.py" \
  "$TMP_ARCHIVE" \
  "$OUTPUT" \
  --tag "$TAG" \
  --platform "$PLATFORM"

echo "[ok] RouterOS archive ready: $OUTPUT"
echo "[next] Upload the tar to RouterOS storage, then import it with:"
echo "      /container/add file=$(basename "$OUTPUT") interface=veth-routeros-triage root-dir=disk1/routeros-triage mounts=routeros-triage-data envlist=routeros-triage-env logging=yes"
