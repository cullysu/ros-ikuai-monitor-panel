#!/usr/bin/env python3
"""Run one command inside the repository's strict low-load envelope.

Ordinary commands retain the conservative admission and pause envelope.
Browser acceptance runs are different: suspending Chromium also advances its
wall-clock request timers and creates false timeouts.  Browser mode therefore
starts suspended only long enough to bind a Windows Job Object, then keeps
making progress at idle priority under a small hard CPU quota. Browser work
requires a stable low-load admission window, degrades its quota as the host
gets busy, and terminates the managed tree at the conservative runtime abort
line. This limits this task's contribution without pretending that it can
control unrelated user processes.
"""

from __future__ import annotations

import os
import math
import secrets
import subprocess
import sys
import time
from pathlib import Path

import psutil


# psutil exposes Windows priority constants only on Windows.  The browser
# launcher also runs in Linux CI, where the equivalent conservative nice
# values must be supplied explicitly instead of importing Windows-only names.
IDLE_PRIORITY_CLASS = getattr(psutil, "IDLE_PRIORITY_CLASS", 19)
BELOW_NORMAL_PRIORITY_CLASS = getattr(psutil, "BELOW_NORMAL_PRIORITY_CLASS", 10)


# Keep ordinary work conservative: the managed tree is one-core and below
# normal priority, and is paused well before the user's 70% whole-machine
# ceiling because this launcher cannot control unrelated system processes.
ADMISSION_LIMIT = 50.0
PAUSE_LIMIT = 55.0
RESUME_LIMIT = 48.0
# Browser startup needs sustained headroom; a brief dip below the ordinary
# admission line is not enough to protect launch from an immediate CPU spike.
BROWSER_ADMISSION_LIMIT = 45.0
HARD_LIMIT = 60.0
BROWSER_RUNTIME_ABORT_LIMIT = 68.0
BROWSER_RUNTIME_HARD_ABORT_LIMIT = 70.0
BROWSER_ABORT_CONSECUTIVE = 8
MIN_BROWSER_TIMEOUT_MS = 90_000
ADMISSION_ATTEMPTS = 40
ADMISSION_CONSECUTIVE = 3
BROWSER_ADMISSION_ATTEMPTS = 120
BROWSER_ADMISSION_CONSECUTIVE = 12
# Keep at least five percentage points of modeled headroom below the user's
# 70% whole-machine ceiling.  The former 1.00% / 0.25% rates made real Edge
# toolbar interaction miss its wall-clock gate even while the host sat near
# 40% load.  These rates remain small, dynamic hard caps on the complete Job
# Object rather than soft priority hints.
BROWSER_CPU_RATE_NORMAL = 500  # 5.00% of total CPU, in 1/100 percent units.
BROWSER_CPU_RATE_DEGRADED = 50  # 0.50% while the rest of the machine is busy.
ORDINARY_JOB_CPU_RATE = 500  # 5.00% hard cap across the complete ordinary tree.
BROWSER_DEGRADE_LIMIT = 50.0
BROWSER_RECOVER_LIMIT = 45.0
BROWSER_RECOVER_CONSECUTIVE = 8
BROWSER_MEMBER_REFRESH_SECONDS = 1.0
RESUME_CONSECUTIVE = 3
MAX_PAUSE_SECONDS = 120.0
MAX_MANAGED_ACTIVE_SECONDS = 900.0
SAMPLE_SECONDS = 0.25
RUNTIME_LOG_SECONDS = 30.0
LOW_LOAD_TIMEOUT_OWNER = "run-low-load/v1"
WINDOWS_JOB_NAME_PREFIX = "Local\\CodexLowLoad"


def sample_cpu() -> float:
    try:
        return float(psutil.cpu_percent(interval=SAMPLE_SECONDS))
    except (TypeError, ValueError, OSError):
        return float("nan")


def is_valid_cpu_load(load: float) -> bool:
    return math.isfinite(load) and 0.0 <= load <= 100.0


def runtime_cpu_telemetry_must_abort(load: float) -> bool:
    """A missing or impossible whole-system sample cannot safely govern work."""
    return not is_valid_cpu_load(load)


def next_managed_active_seconds(
    current: float, elapsed: float, *, paused: bool
) -> float:
    """Charge only time in which an ordinary managed tree could execute."""
    if not math.isfinite(current) or current < 0.0:
        raise ValueError("current active runtime must be finite and non-negative")
    if not math.isfinite(elapsed) or elapsed < 0.0:
        raise ValueError("elapsed runtime must be finite and non-negative")
    return current if paused else current + elapsed


def managed_active_runtime_expired(active_seconds: float) -> bool:
    return active_seconds >= MAX_MANAGED_ACTIVE_SECONDS


def new_windows_job_name(owner_pid: int) -> str:
    if owner_pid <= 0:
        raise ValueError("owner PID must be positive")
    return f"{WINDOWS_JOB_NAME_PREFIX}-{owner_pid}-{secrets.token_hex(16)}"


def windows_job_name_matches_owner(job_name: str, owner_pid: int) -> bool:
    if owner_pid <= 0 or not isinstance(job_name, str):
        return False
    prefix = f"{WINDOWS_JOB_NAME_PREFIX}-{owner_pid}-"
    suffix = job_name[len(prefix) :] if job_name.startswith(prefix) else ""
    return len(suffix) == 32 and all(character in "0123456789abcdef" for character in suffix)


def next_browser_cpu_rate(
    current_rate: int, load: float, recovery_samples: int
) -> tuple[int, int]:
    """Return the next task quota without ever pausing browser wall-clock time."""
    if not is_valid_cpu_load(load):
        return BROWSER_CPU_RATE_DEGRADED, 0
    if load >= BROWSER_DEGRADE_LIMIT:
        return BROWSER_CPU_RATE_DEGRADED, 0
    if current_rate == BROWSER_CPU_RATE_NORMAL:
        return current_rate, 0
    recovery_samples = recovery_samples + 1 if load < BROWSER_RECOVER_LIMIT else 0
    if recovery_samples >= BROWSER_RECOVER_CONSECUTIVE:
        return BROWSER_CPU_RATE_NORMAL, 0
    return current_rate, recovery_samples


def browser_runtime_must_abort(load: float, consecutive_high_samples: int) -> bool:
    """Fail closed, hard-stop at 70%, or stop after sustained 68% samples."""
    return (
        not is_valid_cpu_load(load)
        or load >= BROWSER_RUNTIME_HARD_ABORT_LIMIT
        or (
            load >= BROWSER_RUNTIME_ABORT_LIMIT
            and consecutive_high_samples >= BROWSER_ABORT_CONSECUTIVE
        )
    )


def next_browser_abort_samples(load: float, consecutive_high_samples: int) -> int:
    """Count only uninterrupted samples at the browser abort line."""
    if is_valid_cpu_load(load) and load >= BROWSER_RUNTIME_ABORT_LIMIT:
        return consecutive_high_samples + 1
    return 0


def browser_timeout_ms(value: str | None) -> int:
    """Preserve a larger browser timeout, but never inherit a weaker one."""
    try:
        configured = int(value) if value is not None else 0
    except (TypeError, ValueError):
        configured = 0
    return max(MIN_BROWSER_TIMEOUT_MS, configured)


def low_load_environment(
    source_env: dict[str, str],
    *,
    browser_mode: bool,
    timeout_owner_job_name: str | None = None,
    timeout_owner_pid: int | None = None,
) -> dict[str, str]:
    """Build the child environment without changing ordinary caller values."""
    env = source_env.copy()
    env.update(
        {
            "CODEX_MEMORY_LIMIT_MB": "2048",
            "CODEX_LOW_LOAD_MANAGED": "1",
            "NODE_OPTIONS": "--max-old-space-size=2048",
            "GOMAXPROCS": "1",
            "UV_THREADPOOL_SIZE": "2",
        }
    )
    for key in (
        "CODEX_LOW_LOAD_TIMEOUT_OWNER",
        "CODEX_LOW_LOAD_JOB_NAME",
        "CODEX_LOW_LOAD_OWNER_PID",
    ):
        env.pop(key, None)
    if browser_mode:
        env["CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS"] = str(
            browser_timeout_ms(env.get("CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS"))
        )
    elif timeout_owner_job_name is not None or timeout_owner_pid is not None:
        if timeout_owner_pid is None or not windows_job_name_matches_owner(
            timeout_owner_job_name or "", timeout_owner_pid
        ):
            raise ValueError("timeout owner requires a valid named Windows Job")
        env["CODEX_LOW_LOAD_TIMEOUT_OWNER"] = LOW_LOAD_TIMEOUT_OWNER
        env["CODEX_LOW_LOAD_JOB_NAME"] = timeout_owner_job_name
        env["CODEX_LOW_LOAD_OWNER_PID"] = str(timeout_owner_pid)
    return env


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
                IDLE_PRIORITY_CLASS
                if idle_priority
                else BELOW_NORMAL_PRIORITY_CLASS
            )
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue


def set_windows_job_cpu_cap(job, cpu_rate: int) -> None:
    import ctypes
    from ctypes import wintypes

    class JobCpuRateControlInformation(ctypes.Structure):
        _fields_ = [
            ("ControlFlags", ctypes.c_ulong),
            ("CpuRate", ctypes.c_ulong),
        ]

    cpu_limits = JobCpuRateControlInformation(
        ControlFlags=0x1 | 0x4,
        CpuRate=cpu_rate,
    )
    kernel32 = ctypes.windll.kernel32
    kernel32.SetInformationJobObject.argtypes = [
        wintypes.HANDLE,
        ctypes.c_int,
        ctypes.c_void_p,
        wintypes.DWORD,
    ]
    kernel32.SetInformationJobObject.restype = wintypes.BOOL
    configured = kernel32.SetInformationJobObject(
        wintypes.HANDLE(int(job)),
        15,  # JobObjectCpuRateControlInformation
        ctypes.byref(cpu_limits),
        ctypes.sizeof(cpu_limits),
    )
    if not configured:
        raise ctypes.WinError()


def windows_job_process_ids(job) -> list[int]:
    """Read the bounded Job Object member list without scanning all processes."""
    if os.name != "nt" or job is None:
        return []

    import ctypes
    from ctypes import wintypes

    capacity = 1024

    class JobProcessIdList(ctypes.Structure):
        _fields_ = [
            ("NumberOfAssignedProcesses", wintypes.DWORD),
            ("NumberOfProcessIdsInList", wintypes.DWORD),
            ("ProcessIdList", ctypes.c_size_t * capacity),
        ]

    kernel32 = ctypes.windll.kernel32
    kernel32.QueryInformationJobObject.argtypes = [
        wintypes.HANDLE,
        ctypes.c_int,
        ctypes.c_void_p,
        wintypes.DWORD,
        ctypes.POINTER(wintypes.DWORD),
    ]
    kernel32.QueryInformationJobObject.restype = wintypes.BOOL
    payload = JobProcessIdList()
    returned = wintypes.DWORD(0)
    queried = kernel32.QueryInformationJobObject(
        wintypes.HANDLE(int(job)),
        3,  # JobObjectBasicProcessIdList
        ctypes.byref(payload),
        ctypes.sizeof(payload),
        ctypes.byref(returned),
    )
    if not queried:
        raise ctypes.WinError()
    count = min(int(payload.NumberOfProcessIdsInList), capacity)
    return [int(payload.ProcessIdList[index]) for index in range(count) if int(payload.ProcessIdList[index]) > 0]


def apply_windows_job_member_limits(job) -> list[int]:
    """Add one-core/idle limits to every current member already bound by the Job."""
    process_ids = windows_job_process_ids(job)
    for process_id in process_ids:
        try:
            apply_limits(
                psutil.Process(process_id),
                idle_priority=True,
                include_descendants=False,
            )
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return process_ids


def apply_windows_job_cpu_cap(process_id: int, cpu_rate: int, job_name: str = ""):
    if os.name != "nt":
        return None

    import win32api
    import win32con
    import win32job

    job = win32job.CreateJobObject(None, job_name)
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
    if process_id not in windows_job_process_ids(job):
        raise RuntimeError("managed process is not present in its Job Object")
    return job


def owner_command_is_this_runner(owner: psutil.Process) -> bool:
    expected = Path(__file__).resolve()
    try:
        owner_cwd = Path(owner.cwd())
        command_line = owner.cmdline()
    except (psutil.NoSuchProcess, psutil.AccessDenied, OSError):
        return False
    for argument in command_line:
        try:
            candidate = Path(argument)
            if not candidate.is_absolute():
                candidate = owner_cwd / candidate
            if candidate.resolve() == expected:
                return True
        except (OSError, ValueError):
            continue
    return False


def process_descends_from_owner(process: psutil.Process, owner_pid: int) -> bool:
    current = process
    for _ in range(32):
        try:
            parent_pid = current.ppid()
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return False
        if parent_pid == owner_pid:
            return True
        if parent_pid <= 0 or parent_pid == current.pid:
            return False
        try:
            current = psutil.Process(parent_pid)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return False
    return False


def verify_windows_timeout_owner(job_name: str, process_id: int, owner_pid: int) -> bool:
    if os.name != "nt" or process_id <= 0 or owner_pid <= 0:
        return False
    if not windows_job_name_matches_owner(job_name, owner_pid):
        return False
    try:
        process = psutil.Process(process_id)
        owner = psutil.Process(owner_pid)
        if not process_descends_from_owner(process, owner_pid) or not owner_command_is_this_runner(owner):
            return False
        import win32api
        import win32job

        job = win32job.OpenJobObject(0x0004, False, job_name)  # JOB_OBJECT_QUERY
        try:
            limits = win32job.QueryInformationJobObject(
                job, win32job.JobObjectExtendedLimitInformation
            )
            kill_on_close = bool(
                limits["BasicLimitInformation"]["LimitFlags"]
                & win32job.JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
            )
            return kill_on_close and process_id in windows_job_process_ids(job)
        finally:
            win32api.CloseHandle(job)
    except (psutil.NoSuchProcess, psutil.AccessDenied, OSError):
        return False
    except Exception:
        return False


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


def terminate_managed_tree(process: psutil.Process, job) -> None:
    if os.name == "nt" and job is not None:
        try:
            import win32job

            win32job.TerminateJobObject(job, 1)
            return
        except Exception:
            pass
    terminate_tree(process)


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
    if len(sys.argv) > 1 and sys.argv[1] == "--verify-timeout-owner":
        if len(sys.argv) != 5:
            return 2
        try:
            process_id = int(sys.argv[3])
            owner_pid = int(sys.argv[4])
        except ValueError:
            return 2
        return 0 if verify_windows_timeout_owner(sys.argv[2], process_id, owner_pid) else 1

    browser_mode = len(sys.argv) > 1 and sys.argv[1] == "--browser"
    command = sys.argv[2:] if browser_mode else sys.argv[1:]
    if not command:
        print(
            "usage: py -3 tools/run-low-load.py [--browser] <command> [args...]",
            file=sys.stderr,
        )
        return 2

    if browser_mode:
        consecutive = 0
        admission_load = 100.0
        for attempt in range(1, BROWSER_ADMISSION_ATTEMPTS + 1):
            admission_load = sample_cpu()
            consecutive = (
                consecutive + 1
                if is_valid_cpu_load(admission_load) and admission_load < BROWSER_ADMISSION_LIMIT
                else 0
            )
            if (
                attempt == 1
                or attempt == BROWSER_ADMISSION_ATTEMPTS
                or attempt % 20 == 0
            ):
                print(
                    f"browser cpu admission {admission_load:.1f}% "
                    f"limit {BROWSER_ADMISSION_LIMIT:.0f}% "
                    f"attempt {attempt}/{BROWSER_ADMISSION_ATTEMPTS} "
                    f"stable {consecutive}/{BROWSER_ADMISSION_CONSECUTIVE}",
                    flush=True,
                )
            if consecutive >= BROWSER_ADMISSION_CONSECUTIVE:
                print(
                    f"browser cpu admission accepted at {admission_load:.1f}% "
                    f"after {attempt} attempts",
                    flush=True,
                )
                break
        else:
            print(
                "Browser CPU admission refused; command was not started.",
                file=sys.stderr,
            )
            return 55
    else:
        consecutive = 0
        for attempt in range(1, ADMISSION_ATTEMPTS + 1):
            load = sample_cpu()
            consecutive = consecutive + 1 if is_valid_cpu_load(load) and load < ADMISSION_LIMIT else 0
            if (
                attempt == 1
                or attempt == ADMISSION_ATTEMPTS
                or attempt % 20 == 0
            ):
                print(
                    f"cpu admission {load:.1f}% limit {ADMISSION_LIMIT:.0f}% "
                    f"attempt {attempt}/{ADMISSION_ATTEMPTS} "
                    f"stable {consecutive}/{ADMISSION_CONSECUTIVE}",
                    flush=True,
                )
            if consecutive >= ADMISSION_CONSECUTIVE:
                print(
                    f"cpu admission accepted at {load:.1f}% after {attempt} attempts",
                    flush=True,
                )
                break
        else:
            print("CPU admission refused; command was not started.", file=sys.stderr)
            return 55

    creationflags = 0
    start_suspended = os.name == "nt"
    job_name = new_windows_job_name(os.getpid()) if start_suspended else None
    env = low_load_environment(
        os.environ,
        browser_mode=browser_mode,
        timeout_owner_job_name=job_name if start_suspended and not browser_mode else None,
        timeout_owner_pid=os.getpid() if start_suspended and not browser_mode else None,
    )
    if start_suspended:
        creationflags = getattr(subprocess, "CREATE_SUSPENDED", 0x00000004)
        priority_flag = (
            getattr(subprocess, "IDLE_PRIORITY_CLASS", 0x00000040)
            if browser_mode
            else getattr(subprocess, "BELOW_NORMAL_PRIORITY_CLASS", 0x00004000)
        )
        creationflags |= priority_flag

    try:
        child = subprocess.Popen(command, env=env, creationflags=creationflags)
    except OSError as error:
        print(
            f"Low-load command could not be launched directly: {error}",
            file=sys.stderr,
            flush=True,
        )
        return 74
    managed = psutil.Process(child.pid)
    # The owner starts suspended, so it cannot have descendants before the
    # named Windows Job Object owns the complete future process tree.
    apply_limits(
        managed,
        idle_priority=browser_mode,
        include_descendants=not browser_mode,
    )
    job_handle = None
    browser_cpu_rate = BROWSER_CPU_RATE_NORMAL
    if start_suspended:
        if browser_mode:
            browser_cpu_rate = (
                BROWSER_CPU_RATE_DEGRADED
                if admission_load >= BROWSER_DEGRADE_LIMIT
                else BROWSER_CPU_RATE_NORMAL
            )
        job_cpu_rate = browser_cpu_rate if browser_mode else ORDINARY_JOB_CPU_RATE
        try:
            job_handle = apply_windows_job_cpu_cap(child.pid, job_cpu_rate, job_name or "")
            print(
                f"managed job CPU hard cap {job_cpu_rate / 100:.2f}% applied "
                f"mode {'browser' if browser_mode else 'ordinary'}",
                flush=True,
            )
        except Exception as error:
            print(
                f"managed Job Object unavailable; command refused: {error}",
                file=sys.stderr,
                flush=True,
            )
            terminate_managed_tree(managed, job_handle)
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
    browser_abort_samples = 0
    last_browser_member_refresh = 0.0
    browser_job_members: list[int] = []
    managed_active_seconds = 0.0
    total_paused_seconds = 0.0
    last_runtime_accounted_at = time.monotonic()
    while child.poll() is None:
        # Browser descendants are already governed by the Job Object. A
        # recursive psutil walk every 250 ms can stall for minutes on a busy
        # Windows host and prevent the verifier's own wall-clock timeout from
        # being observed. Ordinary commands retain the existing tree refresh.
        if not paused and not browser_mode:
            apply_limits(managed, idle_priority=browser_mode)
        interval_was_paused = paused
        load = sample_cpu()
        runtime_accounted_at = time.monotonic()
        if not browser_mode:
            managed_active_seconds = next_managed_active_seconds(
                managed_active_seconds,
                runtime_accounted_at - last_runtime_accounted_at,
                paused=interval_was_paused,
            )
        last_runtime_accounted_at = runtime_accounted_at
        if child.poll() is not None:
            break
        if runtime_cpu_telemetry_must_abort(load):
            print(
                "Whole-system CPU telemetry became invalid; terminating the "
                "managed process tree fail closed.",
                file=sys.stderr,
                flush=True,
            )
            terminate_managed_tree(managed, job_handle)
            child.wait()
            return 77
        if not browser_mode and managed_active_runtime_expired(managed_active_seconds):
            print(
                "Managed active-runtime budget exhausted; terminating the "
                "managed process tree without classifying a child product result.",
                file=sys.stderr,
                flush=True,
            )
            terminate_managed_tree(managed, job_handle)
            child.wait()
            return 76
        maximum_runtime_load = max(maximum_runtime_load, load)
        if browser_mode:
            now = time.monotonic()
            if os.name == "nt" and now - last_browser_member_refresh >= BROWSER_MEMBER_REFRESH_SECONDS:
                browser_job_members = apply_windows_job_member_limits(job_handle)
                if managed.pid not in browser_job_members:
                    # The owner may exit normally between the poll above and
                    # this bounded Job query. Recheck before classifying the
                    # missing PID as an escape from the Job Object.
                    if child.poll() is not None:
                        break
                    print(
                        "Browser owner escaped the bounded Job Object; terminating.",
                        file=sys.stderr,
                        flush=True,
                    )
                    terminate_managed_tree(managed, job_handle)
                    child.wait()
                    return 75
                last_browser_member_refresh = now
            next_rate, browser_recover_samples = next_browser_cpu_rate(
                browser_cpu_rate, load, browser_recover_samples
            )
            if next_rate != browser_cpu_rate:
                if os.name == "nt":
                    set_windows_job_cpu_cap(job_handle, next_rate)
                browser_cpu_rate = next_rate
                if next_rate == BROWSER_CPU_RATE_DEGRADED:
                    action = "system busy; browser task quota reduced"
                else:
                    action = "system recovered; browser task quota restored"
                print(
                    f"{action} to {browser_cpu_rate / 100:.2f}%",
                    flush=True,
                )
            browser_abort_samples = next_browser_abort_samples(
                load, browser_abort_samples
            )
            if browser_runtime_must_abort(load, browser_abort_samples):
                if load >= BROWSER_RUNTIME_HARD_ABORT_LIMIT:
                    diagnostic = (
                        f"whole-system CPU reached the "
                        f"{BROWSER_RUNTIME_HARD_ABORT_LIMIT:.0f}% single-sample "
                        f"hard abort line at {load:.1f}%; no further managed "
                        "browser load will be contributed."
                    )
                else:
                    diagnostic = (
                        f"whole-system CPU remained at or above the "
                        f"{BROWSER_RUNTIME_ABORT_LIMIT:.0f}% early abort line for "
                        f"{browser_abort_samples}/{BROWSER_ABORT_CONSECUTIVE} "
                        "consecutive samples."
                    )
                print(
                    f"{diagnostic} Terminating the managed browser tree.",
                    file=sys.stderr,
                    flush=True,
                )
                terminate_managed_tree(managed, job_handle)
                child.wait()
                return 73
            if browser_abort_samples > 0:
                print(
                    f"whole-system CPU high sample {browser_abort_samples}/"
                    f"{BROWSER_ABORT_CONSECUTIVE} at {load:.1f}%; browser task "
                    f"remains capped at {browser_cpu_rate / 100:.2f}% across "
                    f"{len(browser_job_members)} Job members",
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
                total_paused_seconds += time.monotonic() - paused_at
                paused = False
                print("CPU recovered; managed tree resumed.", flush=True)
            elif time.monotonic() - paused_at >= MAX_PAUSE_SECONDS:
                print(
                    "CPU did not recover within the pause budget; terminating "
                    "the managed process tree.",
                    file=sys.stderr,
                    flush=True,
                )
                terminate_managed_tree(managed, job_handle)
                child.wait()
                return 71

    # Keep the Job Object handle alive until the complete managed tree exits.
    _ = job_handle
    print(
        f"cpu managed command complete max-observed {maximum_runtime_load:.1f}% "
        f"active-seconds {managed_active_seconds:.1f} "
        f"paused-seconds {total_paused_seconds:.1f} "
        f"timeout-owner {'named-job' if job_handle is not None and not browser_mode else 'nested'}",
        flush=True,
    )
    return int(child.returncode or 0)


if __name__ == "__main__":
    raise SystemExit(main())
