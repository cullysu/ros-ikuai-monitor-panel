#!/usr/bin/env python3
from __future__ import annotations

import gzip
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from panel_backend.static_assets import (
    StaticAssetNotFound,
    _resolve_contained_file,
    _resolve_public_root,
    etag_matches,
    resolve_static_asset,
)


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

        outside = public.parent / "outside-sidecar"
        outside.write_bytes(b"must-not-be-served")
        for suffix, encoding in (("gz", "gzip"), ("br", "br")):
            sidecar = Path(f"{hashed}.{suffix}")
            sidecar.unlink()
            try:
                sidecar.symlink_to(outside)
            except OSError:
                # Windows can forbid symlink creation without Developer Mode or elevation.
                # Exercise the same containment helper so this test remains executable there.
                try:
                    _resolve_contained_file(public.resolve(), outside, f"{hashed.name}.{suffix}")
                except StaticAssetNotFound:
                    pass
                else:
                    raise AssertionError("external sidecar target bypassed root containment")
            else:
                try:
                    resolve_static_asset(public, f"/{hashed.name}", encoding)
                except StaticAssetNotFound:
                    pass
                else:
                    raise AssertionError(f"external .{suffix} sidecar was served")
            finally:
                if sidecar.is_symlink() or sidecar.exists():
                    sidecar.unlink()

        in_root_sidecar_target = public / "prebuilt-sidecar"
        in_root_sidecar_target.write_bytes(b"must-not-be-served-through-a-link")
        for suffix, encoding in (("gz", "gzip"), ("br", "br")):
            sidecar = Path(f"{hashed}.{suffix}")
            try:
                sidecar.symlink_to(in_root_sidecar_target)
            except OSError:
                # Windows can forbid symlink creation without Developer Mode or elevation.
                continue
            try:
                try:
                    resolve_static_asset(public, f"/{hashed.name}", encoding)
                except StaticAssetNotFound:
                    pass
                else:
                    raise AssertionError(f"symlinked .{suffix} sidecar was served")
            finally:
                if sidecar.is_symlink() or sidecar.exists():
                    sidecar.unlink()

        # public-root symlink must not become a trusted root after resolve().
        external_public = public.parent / f"external-public-root-{public.name}"
        external_public.mkdir()
        (external_public / "index.html").write_text("external", encoding="utf-8")
        public_link = public.parent / "public-root-link"
        try:
            public_link.symlink_to(external_public, target_is_directory=True)
        except OSError:
            pass
        else:
            try:
                try:
                    resolve_static_asset(public_link, "/")
                except StaticAssetNotFound:
                    pass
                else:
                    raise AssertionError("public-root symlink escaped the trusted asset root")
            finally:
                if public_link.is_symlink() or public_link.exists():
                    public_link.unlink()
                (external_public / "index.html").unlink(missing_ok=True)
                external_public.rmdir()


def assert_built_assets() -> None:
    output = ROOT / "public" / "assets" / "framework"
    manifest_path = output / "manifest.json"
    assert manifest_path.is_file(), "framework asset manifest is missing"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["version"] == 3
    assert manifest["inputs"]["algorithm"] == "sha256"
    assert manifest["inputs"]["schema"] == "framework-inputs-v1"
    assert len(manifest["inputs"]["digest"]) == 64
    assert manifest["inputs"]["files"] > 0
    index = (ROOT / "public" / "index.html").read_text(encoding="utf-8")
    records = [
        manifest["assets"]["mobile"]["script"],
        manifest["assets"]["mobile"]["style"],
        manifest["assets"]["desktop"]["script"],
        manifest["assets"]["desktop"]["style"],
        manifest["assets"]["loader"],
    ]
    loader_source = (output / manifest["assets"]["loader"]["file"]).read_text(encoding="utf-8")
    for record in records:
        path = output / record["file"]
        body = path.read_bytes()
        assert hashlib.sha256(body).hexdigest() == record["sha256"]
        if record is manifest["assets"]["loader"]:
            assert record["file"] in index
        else:
            assert record["file"] in loader_source
            assert record["file"] not in index
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


def assert_framework_input_identity() -> None:
    environment = os.environ.copy()
    environment["CODEX_MEMORY_LIMIT_MB"] = "2048"
    environment["NODE_OPTIONS"] = "--max-old-space-size=2048"
    result = subprocess.run(
        ["node", str(ROOT / "tools" / "check-framework-asset-identity.js")],
        cwd=ROOT,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, (
        "framework source/public identity mismatch\n" + result.stdout + result.stderr
    )


def assert_framework_asset_budget() -> None:
    environment = os.environ.copy()
    environment["CODEX_MEMORY_LIMIT_MB"] = "2048"
    environment["NODE_OPTIONS"] = "--max-old-space-size=2048"
    result = subprocess.run(
        ["node", str(ROOT / "tools" / "check-framework-asset-budget.js")],
        cwd=ROOT,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, (
        "framework asset budget mismatch\n" + result.stdout + result.stderr
    )


if __name__ == "__main__":
    assert_unit_contract()
    assert_framework_input_identity()
    assert_framework_asset_budget()
    assert_built_assets()
    print("[static-assets] PASS hashed URLs + immutable cache + br/gzip + ETag contract")
