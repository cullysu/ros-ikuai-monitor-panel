#!/usr/bin/env python3
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from panel_backend.config_store import RouterProfileStore
from panel_backend.api_schema import parse_router_login_request
from panel_backend.router_transport import normalize_router_host
from panel_backend.time_contract import is_rfc3339_timestamp, utc_now_rfc3339


def expect_value_error(value):
    try:
        normalize_router_host(value)
    except ValueError:
        return
    raise AssertionError(f"unsafe router host accepted: {value!r}")


for unsafe in (
    "router.example@attacker.test",
    "router.example?next=attacker",
    "router.example#fragment",
    "router.example:443",
    "user:pass@router.example",
):
    expect_value_error(unsafe)

assert normalize_router_host("192.0.2.1") == "192.0.2.1"
assert normalize_router_host("[2001:db8::1]") == "2001:db8::1"
assert normalize_router_host("router-01.example.test") == "router-01.example.test"

with tempfile.TemporaryDirectory() as directory:
    store_path = Path(directory) / "router-profiles.json"
    store_path.write_text("{broken", encoding="utf-8")
    store = RouterProfileStore(store_path)
    try:
        store.public_entries()
    except Exception as error:
        assert error.__class__.__name__ == "RouterProfileStoreCorruptError", error
        assert store_path.exists(), "corrupt profile store must be preserved"
    else:
        raise AssertionError("corrupt profile store was silently rewritten as an empty list")

with tempfile.TemporaryDirectory() as directory:
    store_path = Path(directory) / "router-profiles.json"
    store_path.write_text(
        '{"entries":[{"host":"192.0.2.1","user":"observer","sshPort":22,'
        '"updatedAt":"2026-07-16 10:00:00"}]}',
        encoding="utf-8",
    )
    store = RouterProfileStore(store_path)
    try:
        store.public_entries()
    except Exception as error:
        assert error.__class__.__name__ == "RouterProfileStoreCorruptError", error
    else:
        raise AssertionError("offset-free stored timestamp was accepted")

app_source = (ROOT / "app.py").read_text(encoding="utf-8")
assert 'return time.strftime("%Y-%m-%d %H:%M:%S")' not in app_source
stamp = utc_now_rfc3339()
assert stamp.endswith("Z")
assert "T" in stamp
assert is_rfc3339_timestamp(stamp)
assert is_rfc3339_timestamp("2026-07-16T18:00:00+08:00")
assert not is_rfc3339_timestamp("2026-07-16 18:00:00")

legacy_password_label = parse_router_login_request(
    {
        "host": "192.0.2.1",
        "user": "observer",
        "password": "ephemeral",
        "rememberPassword": True,
    }
)
assert legacy_password_label.remember_profile is False
profile_label = parse_router_login_request(
    {
        "host": "192.0.2.1",
        "user": "observer",
        "password": "ephemeral",
        "rememberProfile": True,
    }
)
assert profile_label.remember_profile is True

print("[backend-release-blocker] PASS host, corrupt-store, password-free profile, and RFC3339 contracts")
