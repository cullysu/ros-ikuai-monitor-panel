#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import tempfile
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("check-python-dependency-lock.py")
SPEC = importlib.util.spec_from_file_location("python_dependency_lock", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def main() -> None:
    report = MODULE.verify_static()
    assert report["hashLocked"] is True
    with tempfile.TemporaryDirectory(prefix="lock-fixture-") as temporary:
        lock = Path(temporary) / "requirements.lock"
        lock.write_text("requests==2.34.2 \\\n    # missing hash\n", encoding="utf-8")
        try:
            MODULE.parse_lock(lock)
        except MODULE.LockContractError:
            pass
        else:
            raise AssertionError("a hashless package must fail closed")
    print("python dependency lock tests passed")


if __name__ == "__main__":
    main()
