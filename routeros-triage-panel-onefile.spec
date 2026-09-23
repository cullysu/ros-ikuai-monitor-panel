# -*- mode: python ; coding: utf-8 -*-
# Single-file Windows build: one double-clickable EXE with the public UI
# assets bundled inside. Used by tools/build-windows-exe.ps1 -OneFile.

from pathlib import Path


project_root = Path(SPECPATH)
public_root = project_root / "public"


def public_datas():
    excluded_names = {"index.extracted.js"}
    excluded_prefixes = ("_preview",)
    excluded_fragments = (".bak-", ".pre-")
    rows = []
    for path in sorted(public_root.rglob("*")):
        if not path.is_file():
            continue
        name = path.name
        if (
            name in excluded_names
            or name.startswith(excluded_prefixes)
            or any(fragment in name for fragment in excluded_fragments)
        ):
            continue
        target_dir = Path("public") / path.relative_to(public_root).parent
        rows.append((str(path), str(target_dir)))
    return rows


a = Analysis(
    [str(project_root / "app.py")],
    pathex=[str(project_root)],
    binaries=[],
    datas=public_datas(),
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="RouterOS Triage Panel",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
