#!/usr/bin/env python3
from __future__ import annotations

import gzip
import hashlib
import json
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from panel_backend.static_assets import StaticAssetNotFound, etag_matches, resolve_static_asset


def assert_unit_contract() -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        public = Path(temp_dir)
        (public / "index.html").write_text("<!doctype html>", encoding="utf-8")
        identity = b"console.log('hashed asset')\n"
        hashed = public / "panel-framework.0123456789ab.js"
        hashed.write_bytes(identity)
        Path(f"{hashed}.gz").write_bytes(gzip.compress(identity, compresslevel=9))
        brotli_fixture = b"brotli-sidecar-fixture"
        Path(f"{hashed}.br").write_bytes(brotli_fixture)
        (public / "asset.js").write_bytes(identity)

        index = resolve_static_asset(public, "/")
        assert index.identity_path.name == "index.html"
        assert index.cache_control == "no-cache"
        assert index.content_encoding is None

        compressed = resolve_static_asset(public, f"/{hashed.name}", "gzip, br;q=0")
        assert compressed.content_encoding == "gzip"
        assert compressed.cache_control == "public, max-age=31536000, immutable"
        assert compressed.vary_accept_encoding is True
        assert gzip.decompress(compressed.body) == identity
        assert etag_matches(compressed.etag, compressed.etag)
        assert etag_matches(f"W/{compressed.etag}", compressed.etag)

        brotli_asset = resolve_static_asset(public, f"/{hashed.name}", "br, gzip;q=0")
        assert brotli_asset.content_encoding == "br"
        assert brotli_asset.body == brotli_fixture
        assert brotli_asset.etag != compressed.etag

        plain = resolve_static_asset(public, "/asset.js", "br, gzip")
        assert plain.content_encoding is None
        assert plain.cache_control == "no-cache"

        try:
            resolve_static_asset(public, "/../outside.txt")
        except StaticAssetNotFound:
            pass
        else:
            raise AssertionError("path traversal escaped the public directory")


def assert_built_assets() -> None:
    output = ROOT / "public" / "assets" / "framework"
    manifest_path = output / "manifest.json"
    assert manifest_path.is_file(), "framework asset manifest is missing"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    index = (ROOT / "public" / "index.html").read_text(encoding="utf-8")
    for kind in ("script", "style"):
        record = manifest["assets"][kind]
        path = output / record["file"]
        body = path.read_bytes()
        assert hashlib.sha256(body).hexdigest() == record["sha256"]
        assert record["file"] in index
        gzip_body = Path(f"{path}.gz").read_bytes()
        assert gzip.decompress(gzip_body) == body
        assert gzip_body[:3] == b"\x1f\x8b\x08"
        assert gzip_body[4:8] == b"\x00\x00\x00\x00"
        assert gzip_body[9] == 255, "gzip OS header must be platform-neutral"
        assert Path(f"{path}.br").stat().st_size > 0
        assert record["gzipBytes"] == Path(f"{path}.gz").stat().st_size
        assert record["brotliBytes"] == Path(f"{path}.br").stat().st_size
    assert "Cache-Control" not in index
    assert "Pragma" not in index


if __name__ == "__main__":
    assert_unit_contract()
    assert_built_assets()
    print("[static-assets] PASS hashed URLs + immutable cache + br/gzip + ETag contract")
