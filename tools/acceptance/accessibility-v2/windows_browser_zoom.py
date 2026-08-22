#!/usr/bin/env python3
"""Drive the real Microsoft Edge toolbar zoom through Windows UI Automation."""

from __future__ import annotations

import argparse
import ctypes
from ctypes import wintypes
import importlib.util
import json
from pathlib import Path
import re
import sys
import time


def emit(payload: dict, code: int) -> None:
    print(json.dumps(payload, ensure_ascii=False), flush=True)
    raise SystemExit(code)


def find_owned_window_handle(title: str, timeout_seconds: float) -> int:
    """Find the uniquely titled headed Edge window without asking UIA to scan every Edge tab."""
    user32 = ctypes.windll.user32
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        matches: list[int] = []
        callback_type = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)

        @callback_type
        def collect(hwnd, _lparam):
            if not user32.IsWindowVisible(hwnd):
                return True
            length = user32.GetWindowTextLengthW(hwnd)
            if length <= 0:
                return True
            buffer = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buffer, length + 1)
            if title in buffer.value:
                matches.append(int(hwnd))
            return True

        user32.EnumWindows(collect, 0)
        if len(matches) == 1:
            return matches[0]
        time.sleep(0.05)
    raise RuntimeError("could not find exactly one visible owned Edge window by its unique title")


def focus_owned_window(handle: int, timeout_seconds: float) -> None:
    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32
    current_thread = kernel32.GetCurrentThreadId()
    foreground = user32.GetForegroundWindow()
    process_id = ctypes.c_ulong(0)
    target_thread = user32.GetWindowThreadProcessId(handle, ctypes.byref(process_id))
    foreground_thread = user32.GetWindowThreadProcessId(foreground, ctypes.byref(process_id)) if foreground else 0
    attached: list[int] = []
    try:
        # Edge may be launched by a separate Playwright process.  Windows focus
        # lock rules reject a bare SetForegroundWindow in that situation; attach
        # only the helper thread to the current/target input queues, verify the
        # foreground HWND, then detach immediately.
        for thread_id in (foreground_thread, target_thread):
            if thread_id and thread_id != current_thread and user32.AttachThreadInput(current_thread, thread_id, True):
                attached.append(thread_id)
        user32.ShowWindow(handle, 9)  # SW_RESTORE
        user32.AllowSetForegroundWindow(-1)
        deadline = time.time() + min(timeout_seconds, 3)
        while time.time() < deadline:
            # Windows grants the foreground right to the last input queue. A
            # neutral Alt tap is the documented UI-automation bridge before
            # foregrounding a separately launched owned process.
            user32.keybd_event(0x12, 0, 0, 0)
            user32.keybd_event(0x12, 0, 0x0002, 0)
            user32.BringWindowToTop(handle)
            user32.SetForegroundWindow(handle)
            user32.SwitchToThisWindow(handle, True)
            user32.SetFocus(handle)
            if user32.GetForegroundWindow() == handle:
                return
            time.sleep(0.05)
        raise RuntimeError("owned Edge window could not be made the foreground input target")
    finally:
        for thread_id in reversed(attached):
            user32.AttachThreadInput(current_thread, thread_id, False)


def send_chord(*virtual_keys: int) -> None:
    """Send a physical virtual-key chord to the verified foreground Edge HWND."""
    user32 = ctypes.windll.user32
    for key in virtual_keys:
        user32.keybd_event(key, 0, 0, 0)
    # A zero-duration key chord is intermittently dropped by headed Edge when
    # the foreground token has just crossed from Playwright to this helper.
    # Keep the input physical and bounded, but give Edge one small key-hold
    # interval so the chord is not lost under normal desktop contention.
    time.sleep(0.04)
    for key in reversed(virtual_keys):
        user32.keybd_event(key, 0, 0x0002, 0)


def non_sensitive_window_identity(handle: int, owned_process_id: int) -> dict:
    if not handle:
        return {"coveringProcessId": 0, "coveringClass": "", "sameProcess": False}
    user32 = ctypes.windll.user32
    process_id = ctypes.c_ulong(0)
    user32.GetWindowThreadProcessId(handle, ctypes.byref(process_id))
    class_name = ctypes.create_unicode_buffer(128)
    user32.GetClassNameW(handle, class_name, len(class_name))
    return {
        "coveringProcessId": int(process_id.value),
        "coveringClass": class_name.value,
        "sameProcess": bool(process_id.value and process_id.value == owned_process_id),
    }


class Rect(ctypes.Structure):
    _fields_ = [("left", ctypes.c_long), ("top", ctypes.c_long), ("right", ctypes.c_long), ("bottom", ctypes.c_long)]


class Point(ctypes.Structure):
    _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]


class BitmapInfoHeader(ctypes.Structure):
    _fields_ = [
        ("biSize", wintypes.DWORD),
        ("biWidth", ctypes.c_long),
        ("biHeight", ctypes.c_long),
        ("biPlanes", wintypes.WORD),
        ("biBitCount", wintypes.WORD),
        ("biCompression", wintypes.DWORD),
        ("biSizeImage", wintypes.DWORD),
        ("biXPelsPerMeter", ctypes.c_long),
        ("biYPelsPerMeter", ctypes.c_long),
        ("biClrUsed", wintypes.DWORD),
        ("biClrImportant", wintypes.DWORD),
    ]


class RgbQuad(ctypes.Structure):
    _fields_ = [("rgbBlue", ctypes.c_ubyte), ("rgbGreen", ctypes.c_ubyte), ("rgbRed", ctypes.c_ubyte), ("rgbReserved", ctypes.c_ubyte)]


class BitmapInfo(ctypes.Structure):
    _fields_ = [("bmiHeader", BitmapInfoHeader), ("bmiColors", RgbQuad * 1)]


class MonitorInfo(ctypes.Structure):
    _fields_ = [
        ("cbSize", wintypes.DWORD),
        ("rcMonitor", Rect),
        ("rcWork", Rect),
        ("dwFlags", wintypes.DWORD),
    ]


def inspect_edge_visibility(handle: int) -> dict:
    """Inspect physical screen coverage without conflating off-screen pixels with product failure."""
    user32 = ctypes.windll.user32
    if user32.GetForegroundWindow() != handle:
        raise RuntimeError("owned Edge window is not foreground immediately before screen capture")
    rect = Rect()
    if not user32.GetWindowRect(handle, ctypes.byref(rect)):
        raise RuntimeError("GetWindowRect failed for owned Edge window")
    width, height = int(rect.right - rect.left), int(rect.bottom - rect.top)
    if width <= 4 or height <= 4:
        raise RuntimeError("owned Edge window has an invalid capture rectangle")
    owned_process = ctypes.c_ulong(0)
    user32.GetWindowThreadProcessId(handle, ctypes.byref(owned_process))
    samples = []
    for horizontal in (0.2, 0.5, 0.8):
        for vertical in (0.2, 0.5, 0.8):
            point = Point(int(rect.left + width * horizontal), int(rect.top + height * vertical))
            covering = user32.WindowFromPoint(point)
            root = user32.GetAncestor(covering, 2) if covering else 0  # GA_ROOT
            samples.append({
                "x": int(point.x),
                "y": int(point.y),
                "coveringRoot": int(root or 0),
                **non_sensitive_window_identity(int(root or 0), int(owned_process.value)),
            })
    blocked = [sample for sample in samples if sample["coveringRoot"] != handle]
    return {
        "foregroundHandle": handle,
        "unobscured": not blocked,
        "windowRect": {"left": int(rect.left), "top": int(rect.top), "right": int(rect.right), "bottom": int(rect.bottom)},
        "sampleCount": len(samples),
        "blockedSamples": blocked,
    }


def print_owned_window(handle: int, width: int, height: int):
    """Ask the verified HWND owner to render its complete window into a Windows DC."""
    from PIL import Image  # type: ignore

    user32 = ctypes.windll.user32
    gdi32 = ctypes.windll.gdi32
    user32.GetWindowDC.argtypes = [wintypes.HWND]
    user32.GetWindowDC.restype = ctypes.c_void_p
    user32.ReleaseDC.argtypes = [wintypes.HWND, ctypes.c_void_p]
    user32.PrintWindow.argtypes = [wintypes.HWND, ctypes.c_void_p, wintypes.UINT]
    gdi32.CreateCompatibleDC.argtypes = [ctypes.c_void_p]
    gdi32.CreateCompatibleDC.restype = ctypes.c_void_p
    gdi32.CreateCompatibleBitmap.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int]
    gdi32.CreateCompatibleBitmap.restype = ctypes.c_void_p
    gdi32.SelectObject.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
    gdi32.SelectObject.restype = ctypes.c_void_p
    gdi32.GetDIBits.argtypes = [
        ctypes.c_void_p,
        ctypes.c_void_p,
        wintypes.UINT,
        wintypes.UINT,
        ctypes.c_void_p,
        ctypes.POINTER(BitmapInfo),
        wintypes.UINT,
    ]
    gdi32.DeleteObject.argtypes = [ctypes.c_void_p]
    gdi32.DeleteDC.argtypes = [ctypes.c_void_p]

    window_dc = user32.GetWindowDC(handle)
    if not window_dc:
        raise RuntimeError("GetWindowDC failed for owned Edge window")
    memory_dc = gdi32.CreateCompatibleDC(window_dc)
    bitmap = gdi32.CreateCompatibleBitmap(window_dc, width, height) if memory_dc else 0
    old_bitmap = gdi32.SelectObject(memory_dc, bitmap) if bitmap else 0
    selected = bool(old_bitmap)
    try:
        if not memory_dc or not bitmap or not old_bitmap:
            raise RuntimeError("could not allocate a compatible Windows bitmap for owned Edge capture")
        if not user32.PrintWindow(handle, memory_dc, 0):
            raise RuntimeError("PrintWindow failed for owned Edge window")
        gdi32.SelectObject(memory_dc, old_bitmap)
        selected = False

        info = BitmapInfo()
        info.bmiHeader.biSize = ctypes.sizeof(BitmapInfoHeader)
        info.bmiHeader.biWidth = width
        info.bmiHeader.biHeight = -height
        info.bmiHeader.biPlanes = 1
        info.bmiHeader.biBitCount = 32
        info.bmiHeader.biCompression = 0  # BI_RGB
        info.bmiHeader.biSizeImage = width * height * 4
        pixels = ctypes.create_string_buffer(info.bmiHeader.biSizeImage)
        scanlines = gdi32.GetDIBits(memory_dc, bitmap, 0, height, pixels, ctypes.byref(info), 0)
        if scanlines != height:
            raise RuntimeError(f"GetDIBits returned {scanlines}/{height} scanlines for owned Edge window")
        image = Image.frombytes("RGB", (width, height), pixels.raw, "raw", "BGRX")
        probe = image.resize((64, 64)).convert("RGB")
        colors = probe.getcolors(maxcolors=4096) or []
        channel_span = sum(high - low for low, high in probe.getextrema())
        if len(colors) < 4 or channel_span < 24:
            raise RuntimeError(f"owned Edge PrintWindow capture lacks visual content (colors={len(colors)}, span={channel_span})")
        return image, {
            "success": True,
            "method": "PrintWindow",
            "sampledColorCount": len(colors),
            "channelSpan": channel_span,
            "width": width,
            "height": height,
        }
    finally:
        if selected:
            gdi32.SelectObject(memory_dc, old_bitmap)
        if bitmap:
            gdi32.DeleteObject(bitmap)
        if memory_dc:
            gdi32.DeleteDC(memory_dc)
        user32.ReleaseDC(handle, window_dc)


def capture_visible_edge_segment(handle: int, window_rect: dict):
    """Capture a substantial physical segment when the 2x window exceeds one monitor."""
    from PIL import ImageGrab  # type: ignore

    user32 = ctypes.windll.user32
    user32.MonitorFromWindow.restype = ctypes.c_void_p
    monitor = user32.MonitorFromWindow(handle, 2)  # MONITOR_DEFAULTTONEAREST
    info = MonitorInfo()
    info.cbSize = ctypes.sizeof(MonitorInfo)
    if not monitor or not user32.GetMonitorInfoW(monitor, ctypes.byref(info)):
        raise RuntimeError("could not resolve the monitor containing the owned Edge window")
    candidate = {
        "left": max(int(window_rect["left"]), int(info.rcMonitor.left)),
        "top": max(int(window_rect["top"]), int(info.rcMonitor.top)),
        "right": min(int(window_rect["right"]), int(info.rcMonitor.right)),
        "bottom": min(int(window_rect["bottom"]), int(info.rcMonitor.bottom)),
    }

    taskbars: list[dict] = []
    callback_type = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)

    @callback_type
    def collect_taskbars(hwnd, _lparam):
        if not user32.IsWindowVisible(hwnd):
            return True
        class_name = ctypes.create_unicode_buffer(128)
        user32.GetClassNameW(hwnd, class_name, len(class_name))
        if class_name.value not in {"Shell_TrayWnd", "Shell_SecondaryTrayWnd"}:
            return True
        rect = Rect()
        if user32.GetWindowRect(hwnd, ctypes.byref(rect)):
            taskbars.append({"left": int(rect.left), "top": int(rect.top), "right": int(rect.right), "bottom": int(rect.bottom)})
        return True

    user32.EnumWindows(collect_taskbars, 0)
    for taskbar in taskbars:
        overlap_left = max(candidate["left"], taskbar["left"])
        overlap_top = max(candidate["top"], taskbar["top"])
        overlap_right = min(candidate["right"], taskbar["right"])
        overlap_bottom = min(candidate["bottom"], taskbar["bottom"])
        if overlap_right <= overlap_left or overlap_bottom <= overlap_top:
            continue
        width = candidate["right"] - candidate["left"]
        height = candidate["bottom"] - candidate["top"]
        if taskbar["right"] - taskbar["left"] >= width * 0.8:
            if taskbar["top"] >= candidate["top"] + height / 2:
                candidate["bottom"] = min(candidate["bottom"], taskbar["top"])
            else:
                candidate["top"] = max(candidate["top"], taskbar["bottom"])
        elif taskbar["bottom"] - taskbar["top"] >= height * 0.8:
            if taskbar["left"] >= candidate["left"] + width / 2:
                candidate["right"] = min(candidate["right"], taskbar["left"])
            else:
                candidate["left"] = max(candidate["left"], taskbar["right"])

    width = candidate["right"] - candidate["left"]
    height = candidate["bottom"] - candidate["top"]
    full_width = int(window_rect["right"] - window_rect["left"])
    full_height = int(window_rect["bottom"] - window_rect["top"])
    coverage_ratio = (width * height) / max(1, full_width * full_height)
    if width <= 200 or height <= 200 or coverage_ratio < 0.5:
        raise RuntimeError(f"owned Edge visible monitor segment is too small (width={width}, height={height}, coverage={coverage_ratio:.3f})")

    owned_process = ctypes.c_ulong(0)
    user32.GetWindowThreadProcessId(handle, ctypes.byref(owned_process))
    samples = []
    for horizontal in (0.2, 0.5, 0.8):
        for vertical in (0.2, 0.5, 0.8):
            point = Point(int(candidate["left"] + width * horizontal), int(candidate["top"] + height * vertical))
            covering = user32.WindowFromPoint(point)
            root = user32.GetAncestor(covering, 2) if covering else 0
            samples.append({
                "x": int(point.x),
                "y": int(point.y),
                "coveringRoot": int(root or 0),
                **non_sensitive_window_identity(int(root or 0), int(owned_process.value)),
            })
    blocked = [sample for sample in samples if sample["coveringRoot"] != handle]
    if blocked:
        raise RuntimeError("owned Edge visible monitor segment is obscured: " + json.dumps(blocked[:3]))

    image = ImageGrab.grab(
        bbox=(candidate["left"], candidate["top"], candidate["right"], candidate["bottom"]),
        all_screens=True,
    )
    probe = image.resize((64, 64)).convert("RGB")
    colors = probe.getcolors(maxcolors=4096) or []
    channel_span = sum(high - low for low, high in probe.getextrema())
    if len(colors) < 4 or channel_span < 24:
        raise RuntimeError(f"owned Edge visible segment lacks visual content (colors={len(colors)}, span={channel_span})")
    return image, {
        "success": True,
        "method": "physical-screen-segment",
        "unobscured": True,
        "captureRect": candidate,
        "monitorRect": {
            "left": int(info.rcMonitor.left),
            "top": int(info.rcMonitor.top),
            "right": int(info.rcMonitor.right),
            "bottom": int(info.rcMonitor.bottom),
        },
        "coverageRatio": coverage_ratio,
        "sampleCount": len(samples),
        "samples": samples,
        "sampledColorCount": len(colors),
        "channelSpan": channel_span,
    }


def capture_owned_edge(handle: int, target: Path, focus_timeout_seconds: float) -> tuple[dict, dict]:
    from PIL import ImageGrab  # type: ignore

    # Edge can lose the foreground token while the caller waits for toolbar and
    # layout settling. Reclaim only the uniquely owned HWND at the last possible
    # moment, then fail closed if another process repeatedly takes it back.
    user32 = ctypes.windll.user32
    get_window_long = getattr(user32, "GetWindowLongW", user32.GetWindowLongA)
    set_window_pos = user32.SetWindowPos
    set_window_pos.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int, wintypes.UINT]
    set_window_pos.restype = wintypes.BOOL
    original_topmost = bool(get_window_long(handle, -20) & 0x00000008)  # WS_EX_TOPMOST
    z_flags = 0x0001 | 0x0002 | 0x0010 | 0x0040  # NOSIZE | NOMOVE | NOACTIVATE | SHOWWINDOW
    if not original_topmost and not set_window_pos(ctypes.c_void_p(handle), ctypes.c_void_p(-1), 0, 0, 0, 0, z_flags):  # HWND_TOPMOST
        raise RuntimeError("could not temporarily prioritize the owned Edge window for capture")
    try:
        deadline = time.time() + min(max(focus_timeout_seconds, 0.1), 3.0)
        foreground_stabilization_attempts = 0
        while True:
            foreground_stabilization_attempts += 1
            focus_owned_window(handle, max(0.1, deadline - time.time()))
            try:
                state = inspect_edge_visibility(handle)
                break
            except RuntimeError as error:
                if "not foreground immediately before screen capture" not in str(error) or time.time() >= deadline:
                    raise
                time.sleep(0.02)
        state["foregroundStabilizationAttempts"] = foreground_stabilization_attempts
        state["capturePriority"] = "temporary-topmost" if not original_topmost else "preexisting-topmost"
        rect = state["windowRect"]
        width = int(rect["right"] - rect["left"])
        height = int(rect["bottom"] - rect["top"])
        if state["unobscured"]:
            image = ImageGrab.grab(
                bbox=(int(rect["left"]), int(rect["top"]), int(rect["right"] ), int(rect["bottom"])),
                all_screens=True,
            )
            state["captureMode"] = "screen-unobscured"
            state["ownedWindowRender"] = None
            state["visibleSegment"] = None
        else:
            try:
                image, render = print_owned_window(handle, width, height)
                state["captureMode"] = "owned-window-render"
                state["ownedWindowRender"] = render
                state["visibleSegment"] = None
            except Exception as error:
                image, segment = capture_visible_edge_segment(handle, rect)
                state["captureMode"] = "screen-visible-segment"
                state["ownedWindowRender"] = {"success": False, "error": str(error)}
                state["visibleSegment"] = segment
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, format="PNG")
        return state, {"path": str(target), "width": int(image.width), "height": int(image.height)}
    finally:
        if not original_topmost:
            set_window_pos(ctypes.c_void_p(handle), ctypes.c_void_p(-2), 0, 0, 0, 0, z_flags)  # HWND_NOTOPMOST


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--title", required=True)
    parser.add_argument("--action", choices=("reset", "oem-plus", "numpad-plus", "menu-plus"), default="reset")
    parser.add_argument("--timeout-seconds", type=float, default=20)
    parser.add_argument("--settle-milliseconds", type=int, default=300)
    parser.add_argument("--capture-path")
    parser.add_argument("--capture-only", action="store_true")
    parser.add_argument("--window-handle", type=int)
    args = parser.parse_args()

    if sys.platform != "win32":
        emit({"pass": False, "code": "WINDOWS_REQUIRED", "message": "actual Edge toolbar zoom acceptance only runs on Windows"}, 2)
    if args.capture_only and not args.capture_path:
        emit({"pass": False, "code": "CAPTURE_PATH_REQUIRED", "message": "capture-only requires --capture-path"}, 2)

    if args.capture_only and args.window_handle:
        started_at = time.time()
        try:
            user32 = ctypes.windll.user32
            handle = int(args.window_handle)
            if not user32.IsWindow(handle):
                raise RuntimeError("owned Edge window handle is no longer valid")
            focus_owned_window(handle, args.timeout_seconds)
            send_chord(0x1B)  # Dismiss any Edge chrome menu left by the real Zoom control.
            time.sleep(0.1)
            focus_owned_window(handle, args.timeout_seconds)
            time.sleep(args.settle_milliseconds / 1000)
            target = Path(args.capture_path).resolve()
            capture_state, capture = capture_owned_edge(handle, target, args.timeout_seconds)
            emit({
                "pass": True,
                "contract": "windows-edge-toolbar-zoom-v1",
                "title": args.title,
                "windowHandle": handle,
                "increments": 0,
                "captureOnly": True,
                "captureState": capture_state,
                "capture": capture,
                "elapsedMs": round((time.time() - started_at) * 1000),
            }, 0)
        except Exception as error:
            emit({
                "pass": False,
                "code": "EDGE_WINDOW_CAPTURE_FAILED",
                "message": str(error),
                "title": args.title,
                "windowHandle": args.window_handle,
                "elapsedMs": round((time.time() - started_at) * 1000),
            }, 1)

    if importlib.util.find_spec("pywinauto") is None:
        # No protocol/CDP fallback: the real Edge menu path remains a required
        # capability even when the physical key path works for a given step.
        emit({"pass": False, "code": "PYWINAUTO_REQUIRED", "message": "pywinauto is not installed"}, 2)

    started_at = time.time()
    try:
        handle = find_owned_window_handle(args.title, args.timeout_seconds)
        focus_owned_window(handle, args.timeout_seconds)
        if not args.capture_only:
            # This helper performs one real toolbar operation at a time.  The
            # Node gate observes page DPR/layout after every invocation; a UIA
            # success result alone is never treated as browser-zoom proof.
            if args.action == "reset":
                send_chord(0x11, 0x30)  # Ctrl + 0
            elif args.action == "oem-plus":
                # The physical '=' key needs Shift to become '+'.  Ctrl+Plus
                # is not equivalent to Ctrl+=' on layouts where '+' is shifted.
                send_chord(0x11, 0x10, 0xBB)  # Ctrl + Shift + OEM_PLUS
            elif args.action == "numpad-plus":
                send_chord(0x11, 0x6B)  # Ctrl + Numpad Add
            elif args.action == "menu-plus":
                from pywinauto import Desktop  # type: ignore

                # UIA is deliberately only used once a verified key path did
                # not change page geometry; handle lookup/focus stay bounded
                # Win32 operations rather than a global UIA desktop scan.
                desktop = Desktop(backend="uia")
                window = desktop.window(handle=handle)
                process_id = ctypes.c_ulong(0)
                ctypes.windll.user32.GetWindowThreadProcessId(handle, ctypes.byref(process_id))
                owned_process_id = int(process_id.value)
                more_tokens = ("settings and more", "settings", "设置及更多", "设置和更多", "更多")
                zoom_in_tokens = ("zoom in", "放大", "增大")

                def find_button(containers, tokens):
                    for container in containers:
                        try:
                            buttons = [
                                *container.descendants(control_type="Button"),
                                *container.descendants(control_type="MenuItem"),
                            ]
                        except Exception:
                            continue
                        for button in buttons:
                            try:
                                name = str(button.window_text() or "").strip().lower()
                            except Exception:
                                continue
                            if name and any(token in name for token in tokens):
                                return button
                    return None

                more = None
                for auto_id in ("SettingsAndMoreButton", "MoreButton", "AppMenuButton"):
                    try:
                        candidate = window.child_window(auto_id=auto_id).wrapper_object()
                        if candidate.exists(timeout=0.5):
                            more = candidate
                            break
                    except Exception:
                        continue
                if more is None:
                    more = find_button((window,), more_tokens)
                if more is None:
                    observed = []
                    try:
                        for control in window.descendants()[:80]:
                            info = control.element_info
                            name = str(getattr(info, "name", "") or "").strip()
                            automation_id = str(getattr(info, "automation_id", "") or "").strip()
                            if name or automation_id:
                                observed.append({"type": getattr(info, "control_type", ""), "name": name[:80], "id": automation_id[:80]})
                    except Exception as inspect_error:
                        observed.append({"inspectError": str(inspect_error)[:120]})
                    raise RuntimeError("could not locate the real Edge Settings and more button for menu zoom fallback; observed=" + json.dumps(observed[:30], ensure_ascii=False))
                more.click_input()
                time.sleep(args.settle_milliseconds / 1000)
                # Do not scan every visible UIA window on the desktop here.
                # A headed Edge run can coexist with many unrelated Edge
                # windows/processes, and a global UIA enumeration can stall
                # long enough for the Node owner to misclassify the tool as a
                # product failure.  The menu popup is owned by the same Edge
                # process, so keep the search bounded to that process and the
                # already-owned window.
                owned_windows = desktop.windows(process=owned_process_id, visible_only=True)
                zoom_in = find_button((window, *owned_windows), zoom_in_tokens)
                if zoom_in is None:
                    raise RuntimeError("could not locate the real Edge Zoom in menu button for menu zoom fallback")
                zoom_in.click_input()
                send_chord(0x1B)
            time.sleep(args.settle_milliseconds / 1000)

        capture = None
        if args.capture_path:
            target = Path(args.capture_path).resolve()
            # Playwright's page screenshot is rasterized at the context scale,
            # which can crop a page after toolbar zoom changes Edge's DPR.  A
            # Windows-owned capture records what the focused headed Edge window
            # actually displays and is therefore the visual acceptance proof.
            focus_owned_window(handle, args.timeout_seconds)
            capture_state, capture_file = capture_owned_edge(handle, target, args.timeout_seconds)
            capture = {
                **capture_file,
                "captureState": capture_state,
            }
        emit({
            "pass": True,
            "contract": "windows-edge-toolbar-zoom-v1",
            "title": args.title,
            "windowHandle": handle,
            "increments": 0,
            "action": "capture" if args.capture_only else args.action,
            "captureOnly": bool(args.capture_only),
            "capture": capture,
            "elapsedMs": round((time.time() - started_at) * 1000),
        }, 0)
    except Exception as error:
        emit({
            "pass": False,
            "code": "EDGE_WINDOW_AUTOMATION_FAILED",
            "message": str(error),
            "title": args.title,
            "elapsedMs": round((time.time() - started_at) * 1000),
        }, 1)


if __name__ == "__main__":
    main()
