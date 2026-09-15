#!/usr/bin/env python3
"""Copy an aapt2-linked APK and add classes.dex at the archive root."""

from __future__ import annotations

import argparse
import shutil
import zipfile
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apk", required=True)
    parser.add_argument("--dex", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    apk = Path(args.apk)
    dex = Path(args.dex)
    out = Path(args.out)
    if not apk.is_file():
        raise SystemExit(f"missing APK: {apk}")
    if not dex.is_file():
        raise SystemExit(f"missing DEX: {dex}")

    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(apk, out)
    with zipfile.ZipFile(out, "a", compression=zipfile.ZIP_DEFLATED) as archive:
        names = set(archive.namelist())
        if "classes.dex" in names:
            raise SystemExit("classes.dex already exists in APK")
        archive.write(dex, "classes.dex")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
