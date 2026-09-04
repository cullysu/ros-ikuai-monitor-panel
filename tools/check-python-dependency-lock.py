#!/usr/bin/env python3
"""Verify hash-locked Python runtime and Windows packaging dependencies.

``--verify-platforms`` intentionally performs two download-only resolver runs.
It proves that the committed hashes accept a CPython 3.12 binary distribution
for the two GHCR target architectures without installing anything.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BASE_IMAGE = "python:3.12.10-slim-bookworm@sha256:fd95fa221297a88e1cf49c55ec1828edd7c5a428187e67b5d1805692d11588db"
LOCK_NAME = "requirements.lock"
BUILD_LOCK_NAME = "requirements-build.lock"
DIRECT_REQUIREMENTS = {"paramiko", "requests", "psutil"}
BUILD_REQUIREMENTS = {
    "altgraph",
    "packaging",
    "pefile",
    "pyinstaller",
    "pyinstaller-hooks-contrib",
    "pywin32-ctypes",
    "setuptools",
}
PLATFORMS = ("manylinux_2_17_x86_64", "manylinux_2_17_aarch64")
PINNED_REQUIREMENT = re.compile(r"^([a-z0-9][a-z0-9_.-]*)==([^\s]+)\s*\\$", re.IGNORECASE)
HASH = re.compile(r"^\s+--hash=sha256:[a-f0-9]{64}\s*(?:\\)?$", re.IGNORECASE)


class LockContractError(RuntimeError):
    pass


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def parse_lock(path: Path) -> dict[str, int]:
    packages: dict[str, int] = {}
    current: str | None = None
    hash_count = 0
    for raw in read_text(path).splitlines():
        match = PINNED_REQUIREMENT.match(raw)
        if match:
            if current is not None and hash_count == 0:
                raise LockContractError(f"{current} has no hashes")
            current = match.group(1).lower().replace("_", "-")
            if current in packages:
                raise LockContractError(f"duplicate locked package {current}")
            packages[current] = 0
            hash_count = 0
            continue
        if current is not None and HASH.match(raw):
            hash_count += 1
            packages[current] += 1
            continue
        if current is not None and raw.strip() and not raw.lstrip().startswith("#"):
            if raw.rstrip().endswith("\\"):
                raise LockContractError(f"invalid lock continuation for {current}")
            current = None
            hash_count = 0
    if current is not None and hash_count == 0:
        raise LockContractError(f"{current} has no hashes")
    if not packages:
        raise LockContractError("lock has no pinned packages")
    return packages


def verify_static(root: Path = ROOT) -> dict[str, object]:
    dockerfile = read_text(root / "Dockerfile")
    if dockerfile.count(f"FROM {BASE_IMAGE}") != 2:
        raise LockContractError("Dockerfile must pin both Python stages to the approved multi-arch digest")
    if "--require-hashes --wheel-dir /wheels -r requirements.txt" not in dockerfile:
        raise LockContractError("wheel stage must enforce dependency hashes")
    if "--require-hashes --no-index --find-links=/wheels -r requirements.txt" not in dockerfile:
        raise LockContractError("runtime stage must enforce dependency hashes")
    if read_text(root / "requirements.txt").strip() != f"--require-hashes\n-r {LOCK_NAME}":
        raise LockContractError("requirements.txt must enforce hashes and delegate only to the immutable lock")
    if read_text(root / "requirements-build.txt").strip() != f"--require-hashes\n-r {BUILD_LOCK_NAME}":
        raise LockContractError("requirements-build.txt must enforce hashes and delegate only to the immutable build lock")
    source = read_text(root / "requirements.in")
    if (
        "paramiko>=3.4,<4" not in source
        or "requests>=2.32,<3" not in source
        or "psutil>=7.1,<8" not in source
    ):
        raise LockContractError("requirements.in must retain the reviewed direct dependency bounds")
    packages = parse_lock(root / LOCK_NAME)
    missing = sorted(DIRECT_REQUIREMENTS - set(packages))
    if missing:
        raise LockContractError(f"lock omits direct dependencies: {', '.join(missing)}")
    build_packages = parse_lock(root / BUILD_LOCK_NAME)
    missing_build = sorted(BUILD_REQUIREMENTS - set(build_packages))
    if missing_build:
        raise LockContractError(f"build lock omits packaging dependencies: {', '.join(missing_build)}")
    build_script = read_text(root / "tools" / "build-windows-exe.ps1")
    runtime_install = '& $BuildPython -m pip install --require-hashes -r (Join-Path $RepoRoot "requirements.txt")'
    build_install = '& $BuildPython -m pip install -r (Join-Path $RepoRoot "requirements-build.txt")'
    if runtime_install not in build_script or build_install not in build_script:
        raise LockContractError("Windows packaging must install both runtime and build hash-lock entrypoints")
    return {
        "pass": True,
        "contract": "python-runtime-and-windows-build-lock-v2",
        "baseImage": BASE_IMAGE,
        "packages": len(packages),
        "buildPackages": len(build_packages),
        "hashLocked": True,
        "windowsBuildHashLocked": True,
        "platformTargets": ["linux/amd64", "linux/arm64"],
        "windowsBuildTarget": "windows/amd64-cpython312",
    }


def verify_platform_downloads(root: Path = ROOT) -> list[str]:
    verified: list[str] = []
    for platform in PLATFORMS:
        with tempfile.TemporaryDirectory(prefix="router-panel-lock-") as destination:
            command = [
                sys.executable,
                "-m",
                "pip",
                "download",
                "--disable-pip-version-check",
                "--require-hashes",
                "--only-binary=:all:",
                "--implementation=cp",
                "--python-version=312",
                "--platform",
                platform,
                "--dest",
                destination,
                "-r",
                str(root / "requirements.txt"),
            ]
            result = subprocess.run(command, cwd=root, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=120, check=False)
            if result.returncode != 0:
                raise LockContractError(f"hash-locked CPython 3.12 download failed for {platform}: {result.stdout[-1200:]}")
            if not any(Path(destination).iterdir()):
                raise LockContractError(f"hash-locked CPython 3.12 download produced no files for {platform}")
            verified.append(platform)
    return verified


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify-platforms", action="store_true")
    args = parser.parse_args()
    report = verify_static()
    if args.verify_platforms:
        report["verifiedPlatforms"] = verify_platform_downloads()
    print(json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    try:
        main()
    except (LockContractError, subprocess.TimeoutExpired) as error:
        print(f"LOCK_CONTRACT_FAILED: {error}", file=sys.stderr)
        raise SystemExit(1)
