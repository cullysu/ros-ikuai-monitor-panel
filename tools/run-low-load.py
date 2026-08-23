#!/usr/bin/env python3
"""Run one command inside the repository's strict low-load envelope.

Ordinary commands retain the conservative admission and pause envelope.
Browser acceptance runs are different: suspending Chromium also advances its
wall-clock request timers and creates false timeouts.  Browser mode therefore
starts suspended only long enough to bind a Windows Job Object, then keeps
making progress at idle priority under a small hard CPU quota.  When the whole
machine is busy, that quota is reduced dynamically instead of stopping the
test.  This limits this task's contribution without pretending that it can
control unrelated user processes.
"""

from __future__ import annotations

import os
import subprocess
import sys
import time

import psutil


# Keep ordinary work conservative: the managed tree is one-core and below
# normal priority, and is paused well before the user's 70% whole-machine
# ceiling because this launcher cannot control unrelated system processes.
ADMISSION_LIMIT = 45.0
PAUSE_LIMIT = 55.0
RESUME_LIMIT = 45.0
BROWSER_ADMISSION_LIMIT = 50.0
HARD_LIMIT = 60.0
ADMISSION_ATTEMPTS = 40
ADMISSION_CONSECUTIVE = 3
# Keep at least five percentage points of modeled headroom below the user's
# 70% whole-machine ceiling.  The former 1.00% / 0.25% rates made real Edge
# toolbar interaction miss its wall-clock gate even while the host sat near
# 40% load.  These rates remain small, dynamic hard caps on the complete Job
# Object rather than soft priority hints.
BROWSER_CPU_RATE_NORMAL = 500  # 5.00% of total CPU, in 1/100 percent units.
BROWSER_CPU_RATE_DEGRADED = 100  # 1.00% while the rest of the machine is busy.
BROWSER_CPU_RATE_EMERGENCY = 10  # 0.10% during an external system spike.
BROWSER_DEGRADE_LIMIT = 50.0
BROWSER_EMERGENCY_LIMIT = 60.0
BROWSER_RECOVER_LIMIT = 48.0
BROWSER_RECOVER_CONSECUTIVE = 3
RESUME_CONSECUTIVE = 3
MAX_PAUSE_SECONDS = 120.0
SAMPLE_SECONDS = 0.25
RUNTIME_LOG_SECONDS = 10.0


def sample_cpu() -> float:
    return float(psutil.cpu_percent(interval=SAMPLE_SECONDS))


def next_browser_cpu_rate(
    current_rate: int, load: float, recovery_samples: int
) -> tuple[int, int]:
    """Return the next task quota without ever pausing browser wall-clock time."""
    if load >= BROWSER_EMERGENCY_LIMIT:
        return BROWSER_CPU_RATE_EMERGENCY, 0
    if load >= BROWSER_DEGRADE_LIMIT:
        return BROWSER_CPU_RATE_DEGRADED, 0
    if current_rate == BROWSER_CPU_RATE_NORMAL:
        return current_rate, 0
    recovery_samples = recovery_samples + 1 if load < BROWSER_RECOVER_LIMIT else 0
    if recovery_samples >= BROWSER_RECOVER_CONSECUTIVE:
        return BROWSER_CPU_RATE_NORMAL, 0
    return current_rate, recovery_samples


def apply_limits(
    process: psutil.Process,
    *,
    idle_priority: bool = False,
    include_descendants: bool = True,
) -> None:
    candidates = [process]
    if include_descendants:
        try:
            candidates.extend(process.children(recursive=True))
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return

    for candidate in candidates:
        try:
            candidate.cpu_affinity([0])
            candidate.nice(
                psutil.IDLE_PRIORITY_CLASS
                if idle_priority
                else psutil.BELOW_NORMAL_PRIORITY_CLASS
            )
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue


def set_windows_job_cpu_cap(job, cpu_rate: int) -> None:
    import ctypes

    class JobCpuRateControlInformation(ctypes.Structure):
        _fields_ = [
            ("ControlFlags", ctypes.c_ulong),
            ("CpuRate", ctypes.c_ulong),
        ]

    cpu_limits = JobCpuRateControlInformation(
        ControlFlags=0x1 | 0x4,
        CpuRate=cpu_rate,
    )
    configured = ctypes.windll.kernel32.SetInformationJobObject(
        int(job),
        15,  # JobObjectCpuRateControlInformation
        ctypes.byref(cpu_limits),
        ctypes.sizeof(cpu_limits),
    )
    if not configured:
        raise ctypes.WinError()


def apply_windows_job_cpu_cap(process_id: int, cpu_rate: int):
    if os.name != "nt":
        return None

    import win32api
    import win32con
    import win32job

    job = win32job.CreateJobObject(None, "")
    limits = win32job.QueryInformationJobObject(
        job, win32job.JobObjectExtendedLimitInformation
    )
    limits["BasicLimitInformation"]["LimitFlags"] |= (
        win32job.JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
    )
    win32job.SetInformationJobObject(
        job, win32job.JobObjectExtendedLimitInformation, limits
    )
    set_windows_job_cpu_cap(job, cpu_rate)
    process_handle = win32api.OpenProcess(
        win32con.PROCESS_ALL_ACCESS, False, process_id
    )
    try:
        win32job.AssignProcessToJobObject(job, process_handle)
    finally:
        win32api.CloseHandle(process_handle)
    return job


def terminate_tree(process: psutil.Process) -> None:
    try:
        descendants = process.children(recursive=True)
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        descendants = []

    for candidate in reversed(descendants):
        try:
            candidate.terminate()
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    try:
        process.terminate()
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        pass

    _, alive = psutil.wait_procs(descendants + [process], timeout=3)
    for candidate in alive:
        try:
            candidate.kill()
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass


def tree_members(process: psutil.Process) -> list[psutil.Process]:
    try:
        descendants = process.children(recursive=True)
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        descendants = []
    return [process, *descendants]


def suspend_tree(process: psutil.Process) -> None:
    # Suspend the owner first so it cannot create more children while the
    # already-created descendants are being stopped.
    for candidate in tree_members(process):
        try:
            candidate.suspend()
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue


def resume_tree(process: psutil.Process) -> None:
    # Resume descendants first and the owner last, preserving the no-new-work
    # guarantee until the managed tree is ready to continue.
    for candidate in reversed(tree_members(process)):
        try:
            candidate.resume()
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue


def main() -> int:
    browser_mode = len(sys.argv) > 1 and sys.argv[1] == "--browser"
    command = sys.argv[2:] if browser_mode else sys.argv[1:]
    if not command:
        print(
            "usage: py -3 tools/run-low-load.py [--browser] <command> [args...]",
            file=sys.stderr,
        )
        return 2

    if browser_mode:
        admission_load = sample_cpu()
        print(
            f"browser cpu observation {admission_load:.1f}% "
            "(informational; work continues under a hard task quota)",
            flush=True,
        )
    else:
        consecutive = 0
        for attempt in range(1, ADMISSION_ATTEMPTS + 1):
            load = sample_cpu()
            consecutive = consecutive + 1 if load < ADMISSION_LIMIT else 0
            if (
                attempt == 1
                or attempt == ADMISSION_ATTEMPTS
                or attempt % 10 == 0
                or consecutive > 0
            ):
                print(
                    f"cpu admission {load:.1f}% limit {ADMISSION_LIMIT:.0f}% "
                    f"attempt {attempt}/{ADMISSION_ATTEMPTS} "
                    f"stable {consecutive}/{ADMISSION_CONSECUTIVE}",
                    flush=True,
                )
            if consecutive >= ADMISSION_CONSECUTIVE:
                break
        else:
            print("CPU admission refused; command was not started.", file=sys.stderr)
            return 55

    env = os.environ.copy()
    env.update(
        {
            "CODEX_MEMORY_LIMIT_MB": "2048",
            "NODE_OPTIONS": "--max-old-space-size=2048",
            "GOMAXPROCS": "1",
            "UV_THREADPOOL_SIZE": "2",
        }
    )
    if browser_mode:
        # Keep the conservative default, but allow a caller to extend only
        # the bounded browser-action timeout when low-load pausing makes a
        # headed check slower. This must never change the CPU quota policy.
        env.setdefault("CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS", "90000")

    creationflags = 0
    start_suspended = os.name == "nt"
    if start_suspended:
        creationflags = getattr(subprocess, "CREATE_SUSPENDED", 0x00000004)
        priority_flag = (
            getattr(subprocess, "IDLE_PRIORITY_CLASS", 0x00000040)
            if browser_mode
            else getattr(subprocess, "BELOW_NORMAL_PRIORITY_CLASS", 0x00004000)
        )
        creationflags |= priority_flag

    child = subprocess.Popen(command, env=env, creationflags=creationflags)
    managed = psutil.Process(child.pid)
    # The browser owner starts suspended, so it cannot have descendants yet.
    # Avoid psutil's system-wide recursive PPID walk here; the Windows Job
    # Object below applies the hard CPU quota to every future descendant.
    apply_limits(
        managed,
        idle_priority=browser_mode,
        include_descendants=not browser_mode,
    )
    job_handle = None
    browser_cpu_rate = BROWSER_CPU_RATE_NORMAL
    if browser_mode and start_suspended:
        browser_cpu_rate = (
            BROWSER_CPU_RATE_DEGRADED
            if admission_load >= BROWSER_DEGRADE_LIMIT
            else BROWSER_CPU_RATE_NORMAL
        )
        try:
            job_handle = apply_windows_job_cpu_cap(child.pid, browser_cpu_rate)
            print(
                f"browser job CPU hard cap {browser_cpu_rate / 100:.2f}% applied",
                flush=True,
            )
        except Exception as error:
            print(
                f"browser CPU hard cap unavailable; command refused: {error}",
                file=sys.stderr,
                flush=True,
            )
            terminate_tree(managed)
            child.wait()
            return 72
    if start_suspended:
        managed.resume()

    paused = False
    paused_at = 0.0
    resume_samples = 0
    last_runtime_log_at = 0.0
    maximum_runtime_load = 0.0
    browser_recover_samples = 0
    while child.poll() is None:
        # Browser descendants are already governed by the Job Object. A
        # recursive psutil walk every 250 ms can stall for minutes on a busy
        # Windows host and prevent the verifier's own wall-clock timeout from
        # being observed. Ordinary commands retain the existing tree refresh.
        if not paused and not browser_mode:
            apply_limits(managed, idle_priority=browser_mode)
        load = sample_cpu()
        maximum_runtime_load = max(maximum_runtime_load, load)
        if browser_mode:
            next_rate, browser_recover_samples = next_browser_cpu_rate(
                browser_cpu_rate, load, browser_recover_samples
            )
            if next_rate != browser_cpu_rate:
                set_windows_job_cpu_cap(job_handle, next_rate)
                browser_cpu_rate = next_rate
                if next_rate == BROWSER_CPU_RATE_EMERGENCY:
                    action = "external CPU spike; browser task quota minimized"
                elif next_rate == BROWSER_CPU_RATE_DEGRADED:
                    action = "system busy; browser task quota reduced"
                else:
                    action = "system recovered; browser task quota restored"
                print(
                    f"{action} to {browser_cpu_rate / 100:.2f}%",
                    flush=True,
                )

            now = time.monotonic()
            if now - last_runtime_log_at >= RUNTIME_LOG_SECONDS:
                print(
                    f"cpu runtime {load:.1f}% browser-task-cap "
                    f"{browser_cpu_rate / 100:.2f}% state running",
                    flush=True,
                )
                last_runtime_log_at = now
            continue

        state = "paused" if paused else "running"
        now = time.monotonic()
        threshold_event = not paused and (load >= HARD_LIMIT or load >= PAUSE_LIMIT)
        if threshold_event or now - last_runtime_log_at >= RUNTIME_LOG_SECONDS:
            print(
                f"cpu runtime {load:.1f}% pause {PAUSE_LIMIT:.0f}% "
                f"hard {HARD_LIMIT:.0f}% state {state}",
                flush=True,
            )
            last_runtime_log_at = now
        if load >= HARD_LIMIT and not paused:
            suspend_tree(managed)
            paused = True
            paused_at = time.monotonic()
            resume_samples = 0
            print(
                "CPU hard limit reached; managed tree emergency-suspended.",
                file=sys.stderr,
                flush=True,
            )
            continue

        if not paused and load >= PAUSE_LIMIT:
            suspend_tree(managed)
            paused = True
            paused_at = time.monotonic()
            resume_samples = 0
            print("CPU pause limit reached; managed tree suspended.", flush=True)
            continue

        if paused:
            resume_samples = resume_samples + 1 if load < RESUME_LIMIT else 0
            if resume_samples >= RESUME_CONSECUTIVE:
                resume_tree(managed)
                paused = False
                print("CPU recovered; managed tree resumed.", flush=True)
            elif time.monotonic() - paused_at >= MAX_PAUSE_SECONDS:
                print(
                    "CPU did not recover within the pause budget; terminating "
                    "the managed process tree.",
                    file=sys.stderr,
                    flush=True,
                )
                terminate_tree(managed)
                child.wait()
                return 71

    # Keep the Job Object handle alive until the complete managed tree exits.
    _ = job_handle
    print(
        f"cpu managed command complete max-observed {maximum_runtime_load:.1f}%",
        flush=True,
    )
    return int(child.returncode or 0)


if __name__ == "__main__":
    raise SystemExit(main())
