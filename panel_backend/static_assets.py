from __future__ import annotations

import hashlib
import mimetypes
import os
import re
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import unquote


_HASHED_ASSET = re.compile(r"\.[0-9a-f]{12}\.[A-Za-z0-9]+$")
_CHARSET_MIME_TYPES = {
    "application/javascript",
    "application/json",
    "application/manifest+json",
    "image/svg+xml",
}


class StaticAssetNotFound(FileNotFoundError):
    pass


@dataclass(frozen=True)
class StaticAsset:
    identity_path: Path
    body_path: Path
    body: bytes
    content_type: str
    cache_control: str
    etag: str
    content_encoding: str | None
    vary_accept_encoding: bool


def static_asset_name(request_path: str) -> str:
    clean = unquote(str(request_path or "")).replace("\\", "/")
    name = clean.lstrip("/")
    return name or "index.html"


def _accepted_encoding(header: str, encoding: str) -> bool:
    wildcard_quality = None
    for raw_item in str(header or "").split(","):
        parts = [part.strip() for part in raw_item.split(";") if part.strip()]
        if not parts:
            continue
        name = parts[0].lower()
        quality = 1.0
        for parameter in parts[1:]:
            if parameter.lower().startswith("q="):
                try:
                    quality = float(parameter.split("=", 1)[1])
                except ValueError:
                    quality = 0.0
        if name == encoding:
            return quality > 0
        if name == "*":
            wildcard_quality = quality
    return bool(wildcard_quality and wildcard_quality > 0)


def _content_type(path: Path) -> str:
    mime = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    return f"{mime}; charset=utf-8" if mime.startswith("text/") or mime in _CHARSET_MIME_TYPES else mime


def _cache_control(path: Path) -> str:
    if _HASHED_ASSET.search(path.name):
        return "public, max-age=31536000, immutable"
    return "no-cache"


def _etag(body: bytes) -> str:
    return f'"sha256-{hashlib.sha256(body).hexdigest()}"'


def etag_matches(header: str | None, etag: str) -> bool:
    target = etag.removeprefix("W/")
    for candidate in str(header or "").split(","):
        value = candidate.strip()
        if value == "*" or value.removeprefix("W/") == target:
            return True
    return False


def _resolve_contained_file(root: Path, candidate: Path, name: str) -> Path:
    resolved = candidate.resolve()
    try:
        resolved.relative_to(root)
    except ValueError as exc:
        raise StaticAssetNotFound(name) from exc
    if not resolved.is_file():
        raise StaticAssetNotFound(name)
    return resolved


def _resolve_public_root(public_dir: Path) -> Path:
    """Resolve the serving root only after rejecting a root symlink."""
    candidate = Path(public_dir)
    try:
        lexical = Path(os.path.abspath(candidate))
        resolved_candidate = Path(os.path.realpath(candidate))
        if candidate.is_symlink() or os.path.normcase(lexical) != os.path.normcase(resolved_candidate) or not candidate.is_dir():
            raise StaticAssetNotFound(str(public_dir))
        root = candidate.resolve()
    except OSError as exc:
        raise StaticAssetNotFound(str(public_dir)) from exc
    if not root.is_dir():
        raise StaticAssetNotFound(str(public_dir))
    return root


def _optional_contained_sidecar(root: Path, identity_path: Path, suffix: str, name: str) -> Path | None:
    candidate = Path(f"{identity_path}.{suffix}")
    if candidate.is_symlink():
        # Sidecars are build outputs, never indirections. Reject even an
        # in-root link so a later replacement cannot redirect a compressed
        # variant after the identity asset has passed containment checks.
        raise StaticAssetNotFound(name)
    if not candidate.exists():
        return None
    return _resolve_contained_file(root, candidate, name)


def resolve_static_asset(
    public_dir: Path,
    request_path: str,
    accept_encoding: str = "",
) -> StaticAsset:
    root = _resolve_public_root(public_dir)
    name = static_asset_name(request_path)
    identity_path = _resolve_contained_file(root, root / name, name)

    available = []
    for encoding, suffix in (("br", "br"), ("gzip", "gz")):
        sidecar = _optional_contained_sidecar(root, identity_path, suffix, f"{name}.{suffix}")
        if sidecar is not None:
            available.append((encoding, sidecar))
    selected_encoding = None
    selected_path = identity_path
    for encoding, variant_path in available:
        if _accepted_encoding(accept_encoding, encoding):
            selected_encoding = encoding
            selected_path = variant_path
            break

    body = selected_path.read_bytes()
    return StaticAsset(
        identity_path=identity_path,
        body_path=selected_path,
        body=body,
        content_type=_content_type(identity_path),
        cache_control=_cache_control(identity_path),
        etag=_etag(body),
        content_encoding=selected_encoding,
        vary_accept_encoding=bool(available),
    )
