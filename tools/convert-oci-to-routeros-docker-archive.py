#!/usr/bin/env python3
"""Convert an OCI image layout tar into a RouterOS-friendly Docker archive.

RouterOS Container import expects the legacy `docker save` archive shape:
top-level manifest.json plus one directory per layer containing layer.tar.
Some modern Docker/BuildKit flows produce an OCI layout tar instead
(`oci-layout`, `index.json`, `blobs/sha256/...`). This helper rewrites that
layout without requiring Docker on the conversion machine.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import shutil
import sys
import tarfile
import tempfile
from pathlib import Path
from typing import Any


DOCKER_ARCHIVE_MARKER = "manifest.json"
OCI_LAYOUT_MARKER = "oci-layout"
IMAGE_MANIFEST_MEDIA_TYPES = {
    "application/vnd.oci.image.manifest.v1+json",
    "application/vnd.docker.distribution.manifest.v2+json",
}
IMAGE_INDEX_MEDIA_TYPES = {
    "application/vnd.oci.image.index.v1+json",
    "application/vnd.docker.distribution.manifest.list.v2+json",
}


def normalize_tar_name(name: str) -> str:
    return name.lstrip("./")


def read_member_bytes(tar: tarfile.TarFile, members: dict[str, tarfile.TarInfo], name: str) -> bytes:
    normalized = normalize_tar_name(name)
    member = members.get(normalized)
    if member is None:
        raise SystemExit(f"missing tar entry: {name}")
    extracted = tar.extractfile(member)
    if extracted is None:
        raise SystemExit(f"tar entry is not a file: {name}")
    return extracted.read()


def descriptor_digest_path(descriptor: dict[str, Any]) -> str:
    digest = descriptor.get("digest", "")
    if not digest.startswith("sha256:"):
        raise SystemExit(f"unsupported descriptor digest: {digest!r}")
    return f"blobs/sha256/{digest.split(':', 1)[1]}"


def parse_platform(value: str) -> tuple[str, str, str | None]:
    parts = [part for part in value.split("/") if part]
    if len(parts) < 2:
        raise SystemExit("--platform must look like linux/amd64 or linux/arm64")
    os_name, arch = parts[0], parts[1]
    variant = parts[2] if len(parts) > 2 else None
    return os_name, arch, variant


def descriptor_matches_platform(descriptor: dict[str, Any], platform: str) -> bool:
    os_name, arch, variant = parse_platform(platform)
    actual = descriptor.get("platform") or {}
    if actual.get("os") != os_name or actual.get("architecture") != arch:
        return False
    if variant and actual.get("variant") != variant:
        return False
    return True


def try_select_manifest_descriptor(
    source: tarfile.TarFile,
    members: dict[str, tarfile.TarInfo],
    index: dict[str, Any],
    platform: str | None,
) -> dict[str, Any] | None:
    descriptors = index.get("manifests") or []
    if not descriptors:
        return None

    direct = [item for item in descriptors if item.get("mediaType") in IMAGE_MANIFEST_MEDIA_TYPES]
    if platform:
        matched = [item for item in direct if descriptor_matches_platform(item, platform)]
        if matched:
            return matched[0]
        if len(direct) == 1 and not direct[0].get("platform"):
            return direct[0]
    elif len(direct) == 1:
        return direct[0]

    for nested_descriptor in [item for item in descriptors if item.get("mediaType") in IMAGE_INDEX_MEDIA_TYPES]:
        nested_index = json.loads(read_member_bytes(source, members, descriptor_digest_path(nested_descriptor)))
        selected = try_select_manifest_descriptor(source, members, nested_index, platform)
        if selected is not None:
            return selected

    if not platform and len(direct) > 1:
        raise SystemExit("multiple image manifests found; pass --platform linux/amd64 or similar")
    return None


def select_manifest_descriptor(
    source: tarfile.TarFile,
    members: dict[str, tarfile.TarInfo],
    index: dict[str, Any],
    platform: str | None,
) -> dict[str, Any]:
    descriptors = index.get("manifests") or []
    if not descriptors:
        raise SystemExit("OCI index does not contain any manifests")

    selected = try_select_manifest_descriptor(source, members, index, platform)
    if selected is not None:
        return selected
    if platform:
        raise SystemExit(f"no image manifest matched platform {platform!r}")
    raise SystemExit("multiple image manifests found; pass --platform linux/amd64 or similar")


def split_repo_tag(tag: str) -> tuple[str, str]:
    slash = tag.rfind("/")
    colon = tag.rfind(":")
    if colon > slash:
        return tag[:colon], tag[colon + 1 :]
    return tag, "latest"


def add_bytes(output: tarfile.TarFile, name: str, data: bytes) -> None:
    info = tarfile.TarInfo(name)
    info.size = len(data)
    info.mtime = 0
    info.mode = 0o644
    output.addfile(info, io.BytesIO(data))


def add_layer(
    source: tarfile.TarFile,
    members: dict[str, tarfile.TarInfo],
    output: tarfile.TarFile,
    descriptor: dict[str, Any],
    layer_id: str,
    tempdir: Path,
) -> None:
    source_name = descriptor_digest_path(descriptor)
    member = members.get(source_name)
    if member is None:
        raise SystemExit(f"missing layer blob: {source_name}")
    extracted = source.extractfile(member)
    if extracted is None:
        raise SystemExit(f"layer blob is not a file: {source_name}")

    media_type = descriptor.get("mediaType", "")
    layer_path = f"{layer_id}/layer.tar"
    if media_type.endswith("+gzip") or media_type.endswith(".gzip"):
        tmp_path = tempdir / f"{layer_id}.tar"
        with gzip.GzipFile(fileobj=extracted) as gz, tmp_path.open("wb") as tmp:
            shutil.copyfileobj(gz, tmp)
        info = tarfile.TarInfo(layer_path)
        info.size = tmp_path.stat().st_size
        info.mtime = 0
        info.mode = 0o644
        with tmp_path.open("rb") as tmp:
            output.addfile(info, tmp)
        return

    info = tarfile.TarInfo(layer_path)
    info.size = member.size
    info.mtime = 0
    info.mode = 0o644
    output.addfile(info, extracted)


def convert_oci_archive(input_path: Path, output_path: Path, tag: str, platform: str | None) -> None:
    if input_path.resolve() == output_path.resolve():
        raise SystemExit("input and output paths must be different")

    with tarfile.open(input_path, "r:*") as source:
        members = {normalize_tar_name(member.name): member for member in source.getmembers()}

        if DOCKER_ARCHIVE_MARKER in members and OCI_LAYOUT_MARKER not in members:
            shutil.copyfile(input_path, output_path)
            print(f"input already looks like a Docker archive; copied to {output_path}")
            return

        if OCI_LAYOUT_MARKER not in members or "index.json" not in members:
            raise SystemExit("input is neither an OCI layout tar nor a legacy Docker archive")

        index = json.loads(read_member_bytes(source, members, "index.json"))
        descriptor = select_manifest_descriptor(source, members, index, platform)
        manifest = json.loads(read_member_bytes(source, members, descriptor_digest_path(descriptor)))
        config_descriptor = manifest.get("config")
        if not config_descriptor:
            raise SystemExit("image manifest is missing config descriptor")

        config_digest = config_descriptor["digest"].split(":", 1)[1]
        config_name = f"{config_digest}.json"
        config_bytes = read_member_bytes(source, members, descriptor_digest_path(config_descriptor))

        layers = manifest.get("layers") or []
        if not layers:
            raise SystemExit("image manifest does not contain layers")

        layer_ids: list[str] = []
        parent_id: str | None = None
        chain_seed = ""
        for layer in layers:
            chain_seed = hashlib.sha256(f"{chain_seed}\n{layer.get('digest', '')}".encode()).hexdigest()
            layer_ids.append(chain_seed)

        repo, tag_name = split_repo_tag(tag)
        docker_manifest = [
            {
                "Config": config_name,
                "RepoTags": [tag],
                "Layers": [f"{layer_id}/layer.tar" for layer_id in layer_ids],
            }
        ]
        repositories = {repo: {tag_name: layer_ids[-1]}}

        with tempfile.TemporaryDirectory(prefix="routeros-docker-archive-") as temp:
            tempdir = Path(temp)
            with tarfile.open(output_path, "w") as output:
                add_bytes(output, DOCKER_ARCHIVE_MARKER, json.dumps(docker_manifest, indent=2).encode() + b"\n")
                add_bytes(output, "repositories", json.dumps(repositories, indent=2).encode() + b"\n")
                add_bytes(output, config_name, config_bytes)

                for layer, layer_id in zip(layers, layer_ids):
                    layer_meta: dict[str, Any] = {"id": layer_id}
                    if parent_id:
                        layer_meta["parent"] = parent_id
                    add_bytes(output, f"{layer_id}/VERSION", b"1.0\n")
                    add_bytes(output, f"{layer_id}/json", json.dumps(layer_meta, indent=2).encode() + b"\n")
                    add_layer(source, members, output, layer, layer_id, tempdir)
                    parent_id = layer_id

    print(f"wrote RouterOS-friendly Docker archive: {output_path}")
    print("expected markers: manifest.json, repositories, <layer>/layer.tar")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Convert OCI layout tar to legacy Docker archive for RouterOS Container import."
    )
    parser.add_argument("input", type=Path, help="Input OCI layout tar or existing Docker archive.")
    parser.add_argument("output", type=Path, help="Output legacy Docker archive tar.")
    parser.add_argument("--tag", default="routeros-triage-panel:routeros", help="Repo tag to write into manifest.json.")
    parser.add_argument("--platform", help="Platform to select when the OCI index contains multiple images, for example linux/amd64.")
    args = parser.parse_args()

    if not args.input.exists():
        raise SystemExit(f"input archive not found: {args.input}")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    convert_oci_archive(args.input, args.output, args.tag, args.platform)
    return 0


if __name__ == "__main__":
    sys.exit(main())
