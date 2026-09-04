#!/usr/bin/env python3
"""Focused contract tests for the low-load launcher policy."""

from __future__ import annotations

import importlib.util
import json
import os
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("run-low-load.py")
SPEC = importlib.util.spec_from_file_location("run_low_load", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def main() -> int:
    assert MODULE.BROWSER_CPU_RATE_NORMAL == 500
    assert MODULE.BROWSER_CPU_RATE_DEGRADED == 50
    assert MODULE.ORDINARY_JOB_CPU_RATE == 500
    assert MODULE.BROWSER_RECOVER_LIMIT == 45.0
    assert MODULE.ADMISSION_LIMIT == 50.0
    assert MODULE.PAUSE_LIMIT == 55.0
    assert MODULE.HARD_LIMIT == 60.0
    assert MODULE.ADMISSION_LIMIT < MODULE.PAUSE_LIMIT < MODULE.HARD_LIMIT < 70.0
    assert MODULE.BROWSER_ADMISSION_LIMIT == 45.0
    assert MODULE.BROWSER_ADMISSION_ATTEMPTS == 120
    assert MODULE.BROWSER_ADMISSION_CONSECUTIVE == 12
    assert MODULE.BROWSER_ADMISSION_LIMIT < MODULE.ADMISSION_LIMIT
    assert MODULE.BROWSER_RUNTIME_ABORT_LIMIT == 68.0
    assert MODULE.BROWSER_RUNTIME_HARD_ABORT_LIMIT == 70.0
    assert MODULE.BROWSER_ABORT_CONSECUTIVE == 8
    assert MODULE.MIN_BROWSER_TIMEOUT_MS == 90_000
    assert MODULE.MAX_MANAGED_ACTIVE_SECONDS == 900.0
    assert MODULE.LOW_LOAD_TIMEOUT_OWNER == "run-low-load/v1"
    assert MODULE.BROWSER_RUNTIME_ABORT_LIMIT + MODULE.BROWSER_CPU_RATE_DEGRADED / 100 < 70
    assert MODULE.BROWSER_RECOVER_CONSECUTIVE == 8
    assert MODULE.RUNTIME_LOG_SECONDS == 30.0
    assert MODULE.browser_runtime_must_abort(67.9, 0) is False
    assert MODULE.browser_runtime_must_abort(68.0, 1) is False
    assert MODULE.browser_runtime_must_abort(68.0, 7) is False
    assert MODULE.browser_runtime_must_abort(68.0, 8) is True
    assert MODULE.browser_runtime_must_abort(69.9, 1) is False
    assert MODULE.browser_runtime_must_abort(70.0, 0) is True
    assert MODULE.browser_runtime_must_abort(80.0, 0) is True
    assert MODULE.browser_runtime_must_abort(float("nan"), 0) is True
    assert MODULE.browser_runtime_must_abort(float("inf"), 0) is True
    assert MODULE.is_valid_cpu_load(44.9) is True
    assert MODULE.is_valid_cpu_load(float("nan")) is False
    assert MODULE.runtime_cpu_telemetry_must_abort(44.9) is False
    assert MODULE.runtime_cpu_telemetry_must_abort(float("nan")) is True
    assert MODULE.runtime_cpu_telemetry_must_abort(float("inf")) is True
    assert MODULE.next_managed_active_seconds(10.0, 2.5, paused=False) == 12.5
    assert MODULE.next_managed_active_seconds(10.0, 120.0, paused=True) == 10.0
    assert MODULE.managed_active_runtime_expired(899.999) is False
    assert MODULE.managed_active_runtime_expired(900.0) is True
    owner_pid = 123
    job_name = f"{MODULE.WINDOWS_JOB_NAME_PREFIX}-{owner_pid}-{'a' * 32}"
    assert MODULE.windows_job_name_matches_owner(job_name, owner_pid) is True
    assert MODULE.windows_job_name_matches_owner(job_name, owner_pid + 1) is False
    assert MODULE.windows_job_name_matches_owner(f"{job_name}0", owner_pid) is False
    assert MODULE.verify_windows_timeout_owner(job_name, -1, owner_pid) is False
    if os.name == "nt" and os.environ.get("CODEX_LOW_LOAD_TIMEOUT_OWNER") == MODULE.LOW_LOAD_TIMEOUT_OWNER:
        live_owner_pid = int(os.environ["CODEX_LOW_LOAD_OWNER_PID"])
        live_job_name = os.environ["CODEX_LOW_LOAD_JOB_NAME"]
        assert MODULE.process_descends_from_owner(
            MODULE.psutil.Process(os.getpid()), live_owner_pid
        ) is True
        assert MODULE.verify_windows_timeout_owner(
            live_job_name, os.getpid(), live_owner_pid
        ) is True

    abort_samples = 0
    for expected_samples in range(1, MODULE.BROWSER_ABORT_CONSECUTIVE):
        abort_samples = MODULE.next_browser_abort_samples(68.0, abort_samples)
        assert abort_samples == expected_samples
        assert MODULE.browser_runtime_must_abort(68.0, abort_samples) is False
    abort_samples = MODULE.next_browser_abort_samples(68.0, abort_samples)
    assert abort_samples == MODULE.BROWSER_ABORT_CONSECUTIVE
    assert MODULE.browser_runtime_must_abort(68.0, abort_samples) is True
    assert MODULE.next_browser_abort_samples(67.9, abort_samples) == 0
    assert MODULE.next_browser_abort_samples(68.0, 0) == 1

    ordinary_environment = MODULE.low_load_environment(
        {"CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS": "invalid"},
        browser_mode=False,
        timeout_owner_job_name=job_name,
        timeout_owner_pid=owner_pid,
    )
    assert ordinary_environment["CODEX_LOW_LOAD_MANAGED"] == "1"
    assert ordinary_environment["CODEX_LOW_LOAD_TIMEOUT_OWNER"] == "run-low-load/v1"
    assert ordinary_environment["CODEX_LOW_LOAD_JOB_NAME"] == job_name
    assert ordinary_environment["CODEX_LOW_LOAD_OWNER_PID"] == str(owner_pid)
    assert ordinary_environment["CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS"] == "invalid"
    assert "CODEX_LOW_LOAD_TIMEOUT_OWNER" not in MODULE.low_load_environment(
        {}, browser_mode=False
    )
    browser_environment = MODULE.low_load_environment(
        {
            "CODEX_LOW_LOAD_TIMEOUT_OWNER": "stale",
            "CODEX_LOW_LOAD_JOB_NAME": job_name,
            "CODEX_LOW_LOAD_OWNER_PID": str(owner_pid),
        },
        browser_mode=True,
    )
    assert browser_environment["CODEX_LOW_LOAD_MANAGED"] == "1"
    assert "CODEX_LOW_LOAD_TIMEOUT_OWNER" not in browser_environment
    assert "CODEX_LOW_LOAD_JOB_NAME" not in browser_environment
    assert "CODEX_LOW_LOAD_OWNER_PID" not in browser_environment
    assert browser_environment["CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS"] == "90000"
    assert MODULE.low_load_environment(
        {"CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS": "89999"}, browser_mode=True
    )["CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS"] == "90000"
    assert MODULE.low_load_environment(
        {"CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS": "invalid"}, browser_mode=True
    )["CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS"] == "90000"
    assert MODULE.low_load_environment(
        {"CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS": "120000"}, browser_mode=True
    )["CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS"] == "120000"

    package_scripts = json.loads(
        Path(__file__).parent.parent.joinpath("package.json").read_text(encoding="utf-8")
    )["scripts"]
    assert package_scripts["check:route-deep-interactions-v2"] == (
        "python tools/run-low-load.py --browser node --max-old-space-size=2048 "
        "tools/check-route-deep-interactions-v2.js"
    )
    route_deep_source = Path(__file__).parent.joinpath(
        "check-route-deep-interactions-v2.js"
    ).read_text(encoding="utf-8")
    assert "require('./test-browser-lifecycle-lowload-timeout');" in route_deep_source
    assert "npm run check:route-deep-interactions-v2" in package_scripts[
        "check:runtime-browser"
    ]

    rate, samples = MODULE.next_browser_cpu_rate(
        MODULE.BROWSER_CPU_RATE_NORMAL, 55.0, 2
    )
    assert rate == MODULE.BROWSER_CPU_RATE_DEGRADED
    assert samples == 0

    for expected_samples in range(1, MODULE.BROWSER_RECOVER_CONSECUTIVE):
        rate, samples = MODULE.next_browser_cpu_rate(rate, 44.0, samples)
        assert rate == MODULE.BROWSER_CPU_RATE_DEGRADED
        assert samples == expected_samples
    rate, samples = MODULE.next_browser_cpu_rate(rate, 44.0, samples)
    assert rate == MODULE.BROWSER_CPU_RATE_NORMAL
    assert samples == 0

    rate, samples = MODULE.next_browser_cpu_rate(
        MODULE.BROWSER_CPU_RATE_DEGRADED, 50.0, 2
    )
    assert rate == MODULE.BROWSER_CPU_RATE_DEGRADED
    assert samples == 0

    rate, samples = MODULE.next_browser_cpu_rate(
        MODULE.BROWSER_CPU_RATE_NORMAL, float("nan"), 2
    )
    assert rate == MODULE.BROWSER_CPU_RATE_DEGRADED
    assert samples == 0

    class BrowserOwnerProbe:
        def __init__(self) -> None:
            self.affinity = None
            self.priority = None

        def children(self, recursive: bool = False):
            raise AssertionError("browser owner must not recursively scan descendants")

        def cpu_affinity(self, value):
            self.affinity = value

        def nice(self, value):
            self.priority = value

    browser_owner = BrowserOwnerProbe()
    MODULE.apply_limits(
        browser_owner,
        idle_priority=True,
        include_descendants=False,
    )
    assert browser_owner.affinity == [0]
    assert browser_owner.priority == MODULE.IDLE_PRIORITY_CLASS

    print("run-low-load policy: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
