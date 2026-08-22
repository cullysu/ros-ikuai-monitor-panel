#!/usr/bin/env python3
"""Focused contract tests for the low-load launcher policy."""

from __future__ import annotations

import importlib.util
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("run-low-load.py")
SPEC = importlib.util.spec_from_file_location("run_low_load", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def main() -> int:
    assert MODULE.BROWSER_CPU_RATE_NORMAL == 500
    assert MODULE.BROWSER_CPU_RATE_DEGRADED == 100
    assert MODULE.BROWSER_CPU_RATE_EMERGENCY == 10
    assert MODULE.BROWSER_RECOVER_LIMIT == 48.0
    assert MODULE.BROWSER_EMERGENCY_LIMIT + MODULE.BROWSER_CPU_RATE_NORMAL / 100 < 70
    assert MODULE.RUNTIME_LOG_SECONDS == 10.0

    rate, samples = MODULE.next_browser_cpu_rate(
        MODULE.BROWSER_CPU_RATE_NORMAL, 65.0, 2
    )
    assert rate == MODULE.BROWSER_CPU_RATE_EMERGENCY
    assert samples == 0

    rate, samples = MODULE.next_browser_cpu_rate(rate, 55.0, samples)
    assert rate == MODULE.BROWSER_CPU_RATE_DEGRADED
    assert samples == 0

    rate, samples = MODULE.next_browser_cpu_rate(rate, 47.0, samples)
    assert rate == MODULE.BROWSER_CPU_RATE_DEGRADED
    assert samples == 1
    rate, samples = MODULE.next_browser_cpu_rate(rate, 47.0, samples)
    assert rate == MODULE.BROWSER_CPU_RATE_DEGRADED
    assert samples == 2
    rate, samples = MODULE.next_browser_cpu_rate(rate, 47.0, samples)
    assert rate == MODULE.BROWSER_CPU_RATE_NORMAL
    assert samples == 0

    rate, samples = MODULE.next_browser_cpu_rate(
        MODULE.BROWSER_CPU_RATE_DEGRADED, 50.0, 2
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
    assert browser_owner.priority == MODULE.psutil.IDLE_PRIORITY_CLASS

    print("run-low-load policy: 19/19 passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
