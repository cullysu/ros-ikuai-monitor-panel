#!/usr/bin/env python3
"""Focused backend regression checks for the password-free RouterOS connection contract."""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from panel_backend.config_store import RouterProfileStore, RouterProfileStoreCorruptError
from panel_backend.router_transport import normalize_router_host


def expect_value_error(value: str) -> None:
    try:
        normalize_router_host(value)
    except ValueError:
        return
    raise AssertionError(f"RouterOS address unexpectedly accepted: {value!r}")


def assert_address_contract() -> None:
    assert normalize_router_host("192.168.88.1") == "192.168.88.1"
    assert normalize_router_host("router.lan") == "router.lan"
    assert normalize_router_host("bücher.example") == "xn--bcher-kva.example"
    assert normalize_router_host("[2001:db8::1]") == "2001:db8::1"
    for value in (
        "https://router.lan",
        "admin@router.lan",
        "router.lan?debug=1",
        "router.lan#fragment",
        "router.lan/rest",
        "router.lan:8728",
        "[2001:db8::1]:8728",
        "256.0.0.1",
    ):
        expect_value_error(value)


def assert_corrupt_store_never_becomes_an_empty_profile_list() -> None:
    with tempfile.TemporaryDirectory() as tempdir:
        path = Path(tempdir) / "router-profiles.json"
        store = RouterProfileStore(path)

        path.write_text(json.dumps({"entries": [{}]}), encoding="utf-8")
        try:
            store.load_unlocked()
        except RouterProfileStoreCorruptError:
            pass
        else:
            raise AssertionError("invalid saved profile was silently treated as an empty list")

        try:
            store.persist_unlocked([{}])
        except RouterProfileStoreCorruptError:
            pass
        else:
            raise AssertionError("invalid profile write was silently discarded")


def main() -> None:
    assert_address_contract()
    assert_corrupt_store_never_becomes_an_empty_profile_list()
    print("connection public contract v2: pass")


if __name__ == "__main__":
    main()
