#!/usr/bin/env python3
"""Fail-closed contract for RouterOS device-clock timestamps."""

from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from panel_backend.snapshot_builder import _router_clock_timestamp
from panel_backend.time_contract import is_rfc3339_timestamp


ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / "app.py").read_text(encoding="utf-8")
BUILDER = (ROOT / "panel_backend" / "snapshot_builder.py").read_text(encoding="utf-8")
failures: list[str] = []


def expect(condition: bool, message: str) -> None:
    if not condition:
        failures.append(message)


expect(
    re.search(
        r'"clock":\s*endpoint\(\s*"system/clock"[\s\S]{0,220}fields="[^"]*date,time[^"]*time-zone-name[^"]*gmt-offset[^"]*"',
        APP,
    ) is not None,
    "system/clock must request date, time, time-zone-name and gmt-offset",
)
expect("_router_clock_timestamp" in BUILDER, "snapshot builder must use the timezone-aware clock parser")
expect(
    re.search(r'"systemTime":\s*_router_clock_timestamp\(', BUILDER) is not None,
    "overview.systemTime must come from the timezone-aware parser",
)
expect(
    'f\'{rest["clock"].get("date", "")} {rest["clock"].get("time", "")}\'' not in BUILDER,
    "raw date/time concatenation must not remain in the production builder",
)

missing_zone = _router_clock_timestamp({"date": "2026-05-25", "time": "11:00:00"})
qualified_offset = _router_clock_timestamp(
    {"date": "2026-05-25", "time": "11:00:00", "gmt-offset": "+08:00"}
)
qualified_name = _router_clock_timestamp(
    {
        "date": "2026-05-25",
        "time": "11:00:00",
        "time-zone-name": "Asia/Taipei",
        "gmt-offset": "+08:00",
    }
)
routeros_date = _router_clock_timestamp(
    {"date": "may/25/2026", "time": "11:00:00", "gmt-offset": "+08:00"}
)
bad_zone = _router_clock_timestamp(
    {"date": "2026-05-25", "time": "11:00:00", "gmt-offset": "local"}
)

expect(missing_zone is None, "missing timezone must remain unavailable")
expect(qualified_offset == "2026-05-25T11:00:00+08:00", "explicit GMT offset must preserve the device local clock")
expect(qualified_name == "2026-05-25T11:00:00+08:00", "named timezone must produce a qualified timestamp")
expect(routeros_date == "2026-05-25T11:00:00+08:00", "RouterOS mmm/DD/YYYY date format must be supported")
expect(bad_zone is None, "invalid timezone metadata must remain unavailable")
for label, value in (
    ("qualified offset", qualified_offset),
    ("qualified name", qualified_name),
    ("RouterOS date", routeros_date),
):
    expect(value is not None and is_rfc3339_timestamp(value), f"{label} must be RFC3339 with timezone")

if failures:
    print(f"FAIL RouterOS clock timezone contract ({len(failures)})")
    for failure in failures:
        print(f"- {failure}")
    raise SystemExit(1)

print("PASS RouterOS clock timezone contract")
