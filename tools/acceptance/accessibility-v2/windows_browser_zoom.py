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


def window_text(handle: int) -> str:
    user32 = ctypes.windll.user32
    length = user32.GetWindowTextLengthW(handle)
    if length <= 0:
        return ""
    buffer = ctypes.create_unicode_buffer(length + 1)
    user32.GetWindowTextW(handle, buffer, length + 1)
    return buffer.value


def window_class_name(handle: int) -> str:
    buffer = ctypes.create_unicode_buffer(256)
    ctypes.windll.user32.GetClassNameW(handle, buffer, len(buffer))
    return buffer.value


def process_image_name(process_id: int) -> str:
    kernel32 = ctypes.windll.kernel32
    kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
    kernel32.OpenProcess.restype = wintypes.HANDLE
    kernel32.QueryFullProcessImageNameW.argtypes = [wintypes.HANDLE, wintypes.DWORD, wintypes.LPWSTR, ctypes.POINTER(wintypes.DWORD)]
    kernel32.QueryFullProcessImageNameW.restype = wintypes.BOOL
    kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
    kernel32.CloseHandle.restype = wintypes.BOOL
    process = kernel32.OpenProcess(0x1000, False, process_id)  # PROCESS_QUERY_LIMITED_INFORMATION
    if not process:
        raise RuntimeError("could not open the owned Edge process for identity verification")
    try:
        size = wintypes.DWORD(32768)
        buffer = ctypes.create_unicode_buffer(size.value)
        if not kernel32.QueryFullProcessImageNameW(process, 0, buffer, ctypes.byref(size)):
            raise RuntimeError("could not read the owned Edge process image")
        return Path(buffer.value).name.lower()
    finally:
        kernel32.CloseHandle(process)


def validate_owned_edge_window(handle: int, title: str) -> int:
    user32 = ctypes.windll.user32
    if not user32.IsWindow(handle) or not user32.IsWindowVisible(handle):
        raise RuntimeError("owned Edge window handle is no longer valid and visible")
    if title not in window_text(handle):
        raise RuntimeError("owned Edge window title no longer matches the unique task title")
    if not window_class_name(handle).startswith("Chrome_WidgetWin"):
        raise RuntimeError("owned window is not an Edge Chromium top-level window")
    process_id = owned_process_id_for_window(handle)
    if process_image_name(process_id) != "msedge.exe":
        raise RuntimeError("owned window process image is not msedge.exe")
    return process_id


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
            try:
                validate_owned_edge_window(int(hwnd), title)
                matches.append(int(hwnd))
            except RuntimeError:
                pass
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


def owned_process_id_for_window(handle: int) -> int:
    process_id = ctypes.c_ulong(0)
    ctypes.windll.user32.GetWindowThreadProcessId(handle, ctypes.byref(process_id))
    value = int(process_id.value)
    if value <= 0:
        raise RuntimeError("could not resolve the owned Edge process")
    return value


def require_owned_foreground_process(
    owned_process_id: int,
    owned_window_handle: int,
    allowed_popup_handle: int = 0,
    allowed_process_ids: tuple[int, ...] = (),
) -> int:
    """Fail closed unless foreground is the original Edge owner chain."""
    user32 = ctypes.windll.user32
    foreground = int(user32.GetForegroundWindow())
    if foreground <= 0:
        raise RuntimeError("no foreground window is available for the owned Edge UIA action")
    foreground_process_id = owned_process_id_for_window(foreground)
    accepted_process_ids = {owned_process_id, *(int(value) for value in allowed_process_ids if int(value) > 0)}
    original_chain = window_is_owned_by(foreground, owned_window_handle)
    selected_popup = bool(
        allowed_popup_handle
        and foreground == allowed_popup_handle
        and foreground_process_id in accepted_process_ids
        and user32.IsWindowVisible(foreground)
    )
    if not original_chain and not selected_popup:
        raise RuntimeError("foreground ownership moved outside the original Edge HWND chain")
    if foreground_process_id not in accepted_process_ids:
        raise RuntimeError("foreground ownership changed outside the verified Edge owner processes")
    return foreground


def window_is_owned_by(candidate_handle: int, owned_window_handle: int) -> bool:
    if candidate_handle == owned_window_handle:
        return True
    if candidate_handle <= 0:
        return False
    user32 = ctypes.windll.user32
    if int(user32.GetAncestor(candidate_handle, 3) or 0) == owned_window_handle:  # GA_ROOTOWNER
        return True
    current = candidate_handle
    for _ in range(8):
        current = int(user32.GetWindow(current, 4) or 0)  # GW_OWNER
        if current == owned_window_handle:
            return True
        if current <= 0:
            break
    return False


def ui_control_names(control) -> tuple[str, ...]:
    """Read the UIA Name property first, then the Win32 text projection."""
    names: list[str] = []
    try:
        element_name = str(getattr(control.element_info, "name", "") or "").strip()
    except Exception:
        element_name = ""
    try:
        legacy_name = str(getattr(control.element_info, "legacy_name", "") or "").strip()
    except Exception:
        legacy_name = ""
    try:
        rich_text = str(getattr(control.element_info, "rich_text", "") or "").strip()
    except Exception:
        rich_text = ""
    try:
        window_name = str(control.window_text() or "").strip()
    except Exception:
        window_name = ""
    for candidate in (element_name, legacy_name, rich_text, window_name):
        normalized = " ".join(candidate.lower().split())
        if normalized and normalized not in names:
            names.append(normalized)
    return tuple(names)


EDGE_ACCELERATOR_SUFFIX = re.compile(
    r"\s+\((?:alt|ctrl|shift|meta|win)(?:\s*\+[a-z0-9]+)+\)\s*$",
    re.IGNORECASE,
)


def canonical_ui_name(name: str) -> str:
    """Normalize one visible name and remove only a known accelerator suffix."""
    normalized = " ".join(str(name or "").strip().lower().split())
    return EDGE_ACCELERATOR_SUFFIX.sub("", normalized).strip()


def ui_name_matches(name: str, tokens: tuple[str, ...], exact: bool = False) -> bool:
    """Match a visible UIA name without reopening broad substring ambiguity."""
    normalized_name = canonical_ui_name(name)
    normalized_tokens = tuple(canonical_ui_name(token) for token in tokens)
    if not normalized_name:
        return False
    if exact:
        return normalized_name in normalized_tokens
    return any(token in normalized_name for token in normalized_tokens)


def safe_exception_message(error: BaseException) -> str:
    """Keep failure diagnostics useful without serializing UIA control metadata."""
    message = str(error).strip()
    return message or type(error).__name__


def trace_stage(label: str) -> None:
    """Emit a bounded diagnostic channel that never contaminates JSON stdout."""
    print(f"[edge-uia-stage] {label}", file=sys.stderr, flush=True)

def raw_view_descendants(control, max_depth: int = 8, max_nodes: int = 512) -> list:
    """Walk one already-bound UIA tree through RawView, never the desktop root."""
    from pywinauto.controls.uiawrapper import UIAWrapper  # type: ignore
    from pywinauto.uia_defines import IUIA  # type: ignore
    from pywinauto.uia_element_info import UIAElementInfo  # type: ignore

    root_element = getattr(control.element_info, "element", None)
    if root_element is None:
        return []
    walker = IUIA().iuia.RawViewWalker
    found = []
    stack = [(root_element, 0)]
    while stack and len(found) < max_nodes:
        parent, depth = stack.pop()
        if depth >= max_depth:
            continue
        try:
            child = walker.GetFirstChildElement(parent)
        except Exception:
            continue
        while child is not None and len(found) < max_nodes:
            try:
                wrapper = UIAWrapper(UIAElementInfo(child))
                found.append(wrapper)
                if depth + 1 < max_depth:
                    stack.append((child, depth + 1))
                child = walker.GetNextSiblingElement(child)
            except Exception:
                break
    return found


def control_view_descendants(control, max_depth: int = 8, max_nodes: int = 512) -> list:
    """Walk one already-bound UIA tree through ControlView with hard bounds."""
    from pywinauto.controls.uiawrapper import UIAWrapper  # type: ignore
    from pywinauto.uia_defines import IUIA  # type: ignore
    from pywinauto.uia_element_info import UIAElementInfo  # type: ignore

    root_element = getattr(control.element_info, "element", None)
    if root_element is None:
        return []
    walker = IUIA().iuia.ControlViewWalker
    found = []
    stack = [(root_element, 0)]
    while stack and len(found) < max_nodes:
        parent, depth = stack.pop()
        if depth >= max_depth:
            continue
        try:
            child = walker.GetFirstChildElement(parent)
        except Exception:
            continue
        while child is not None and len(found) < max_nodes:
            try:
                wrapper = UIAWrapper(UIAElementInfo(child))
                found.append(wrapper)
                if depth + 1 < max_depth:
                    stack.append((child, depth + 1))
                child = walker.GetNextSiblingElement(child)
            except Exception:
                break
    return found


def edge_owner_process_ids(owned_process_id: int, owned_window_handle: int) -> tuple[int, ...]:
    """Collect only msedge.exe processes that own a window in the exact Edge owner chain."""
    user32 = ctypes.windll.user32
    process_ids = {int(owned_process_id)}
    callback_type = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)

    @callback_type
    def collect(hwnd, _lparam):
        handle = int(hwnd)
        if handle <= 0 or handle == owned_window_handle or not user32.IsWindowVisible(handle):
            return True
        if not window_is_owned_by(handle, owned_window_handle):
            return True
        try:
            process_id = owned_process_id_for_window(handle)
            if process_image_name(process_id) == "msedge.exe":
                process_ids.add(process_id)
        except Exception:
            pass
        return True

    user32.EnumWindows(collect, 0)
    return tuple(sorted(process_ids))


def owned_uia_windows(desktop, owned_process_id: int, owned_window_handle: int, allowed_process_ids: tuple[int, ...] = ()) -> list:
    """Return UIA roots for the original Edge HWND and bounded Edge owner-chain menus."""
    user32 = ctypes.windll.user32
    containers = []
    seen: set[int] = set()
    accepted_process_ids = {owned_process_id, *(int(value) for value in allowed_process_ids if int(value) > 0)}

    def add_window(handle: int) -> None:
        if handle <= 0 or handle in seen:
            return
        try:
            process_id = owned_process_id_for_window(handle)
            if process_id not in accepted_process_ids:
                return
            if (
                handle != owned_window_handle
                and process_id != owned_process_id
                and not window_is_owned_by(handle, owned_window_handle)
            ):
                return
            containers.append(desktop.window(handle=handle))
            seen.add(handle)
        except Exception:
            return

    add_window(owned_window_handle)
    callback_type = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)

    @callback_type
    def collect(hwnd, _lparam):
        add_window(int(hwnd))
        return True

    user32.EnumWindows(collect, 0)
    # Edge menu projections can be child HWNDs instead of top-level popup
    # windows. Discover only a bounded child set below the already-owned Edge
    # HWND; this avoids the expensive desktop/UIA tree enumeration that caused
    # the previous CI hangs while still covering the real menu surface.
    child_count = 0

    @callback_type
    def collect_child(hwnd, _lparam):
        nonlocal child_count
        if child_count >= 256:
            return False
        child_count += 1
        add_window(int(hwnd))
        return True

    user32.EnumChildWindows(owned_window_handle, collect_child, 0)
    # Do not call Desktop.windows(process=...) here.  That asks UIA to enumerate
    # every window in the Edge process and can block behind a transient popup for
    # tens of seconds on hosted Windows runners.  The bounded Win32 enumeration
    # above is enough to discover a visible menu root while preserving the exact
    # HWND/process boundary; the original Edge window remains the first search
    # container.
    return containers

def control_top_level_handle(control) -> int:
    try:
        return int(control.top_level_parent().handle or 0)
    except Exception as error:
        raise RuntimeError(f"could not resolve UIA control top-level HWND: {error}") from error


def invoke_owned_control(
    control,
    owned_process_id: int,
    owned_window_handle: int,
    label: str,
    allow_stale_enabled: bool = False,
    allowed_process_ids: tuple[int, ...] = (),
) -> None:
    """Activate one UIA control only after binding it to the exact Edge window."""
    control_process_id = int(getattr(control.element_info, "process_id", 0) or 0)
    accepted_process_ids = {owned_process_id, *(int(value) for value in allowed_process_ids if int(value) > 0)}
    if control_process_id not in accepted_process_ids:
        raise RuntimeError(f"{label} is not owned by the verified Edge owner processes")
    control_window_handle = control_top_level_handle(control)
    if not window_is_owned_by(control_window_handle, owned_window_handle):
        if (
            owned_process_id_for_window(control_window_handle) not in accepted_process_ids
            or not ctypes.windll.user32.IsWindowVisible(control_window_handle)
        ):
            raise RuntimeError(f"{label} is not owned by the original Edge process")
    require_owned_foreground_process(
        owned_process_id,
        owned_window_handle,
        allowed_popup_handle=control_window_handle,
        allowed_process_ids=tuple(accepted_process_ids),
    )
    # Prefer the semantic UIA Invoke/Select patterns. UIAWrapper.click can fall
    # back to input simulation on some pywinauto versions, which is both less
    # deterministic and less appropriate for a headed CI runner.
    if not allow_stale_enabled and not control.is_enabled():
        raise RuntimeError(f"{label} is disabled")
    from pywinauto.uia_defines import NoPatternInterfaceError  # type: ignore
    invoke = getattr(control, "invoke", None)
    select = getattr(control, "select", None)
    semantic_action = invoke if callable(invoke) else select if callable(select) else None
    if semantic_action is None:
        import pywinauto.uia_defines as uia_defs  # type: ignore
        legacy_interface = uia_defs.get_elem_interface(control.element_info.element, "LegacyIAccessible")
        legacy_interface.DoDefaultAction()
    else:
        try:
            semantic_action()
        except NoPatternInterfaceError:
            import pywinauto.uia_defines as uia_defs  # type: ignore
            legacy_interface = uia_defs.get_elem_interface(control.element_info.element, "LegacyIAccessible")
            legacy_interface.DoDefaultAction()
    require_owned_foreground_process(
        owned_process_id,
        owned_window_handle,
        allowed_process_ids=tuple(accepted_process_ids),
    )


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
    parser.add_argument("--action", choices=("inspect", "menu-plus"), default="inspect")
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
            validate_owned_edge_window(handle, args.title)
            if find_owned_window_handle(args.title, args.timeout_seconds) != handle:
                raise RuntimeError("capture handle differs from the uniquely titled original Edge window")
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

    if args.action == "menu-plus" and importlib.util.find_spec("pywinauto") is None:
        # No protocol/CDP or global-input fallback: the process-owned Edge
        # UI Automation path is the required zoom capability.
        emit({"pass": False, "code": "PYWINAUTO_REQUIRED", "message": "pywinauto is not installed"}, 2)

    started_at = time.time()
    stage = "find-owned-window"
    try:
        trace_stage(stage)
        handle = find_owned_window_handle(args.title, args.timeout_seconds)
        stage = "validate-owned-window"
        trace_stage(stage)
        validate_owned_edge_window(handle, args.title)
        if args.window_handle and int(args.window_handle) != handle:
            raise RuntimeError("UIA action handle differs from the original Edge window")
        stage = "focus-owned-window"
        trace_stage(stage)
        focus_owned_window(handle, args.timeout_seconds)
        if not args.capture_only:
            # This helper performs one process-owned toolbar operation at a
            # time. The Node gate observes DPR/layout after every invocation;
            # UIA success alone is never accepted as browser-zoom proof.
            if args.action == "menu-plus":
                from pywinauto import Desktop  # type: ignore

                # Handle lookup and control invocation stay bound to the
                # uniquely titled Edge window and its owning process. Never
                # emit global keyboard or physical mouse input.
                desktop = Desktop(backend="uia")
                window = desktop.window(handle=handle)
                owned_process_id = owned_process_id_for_window(handle)
                allowed_process_ids = edge_owner_process_ids(owned_process_id, handle)
                if int(window.process_id()) != owned_process_id:
                    raise RuntimeError("UIA window is not bound to the expected Edge process")
                more_tokens = ("settings and more", "设置及更多", "设置和更多", "更多")
                more_automation_ids = ("SettingsAndMoreButton", "MoreButton", "AppMenuButton")
                zoom_in_tokens = ("zoom in", "increase zoom", "zoom plus", "放大", "增大")
                zoom_in_automation_ids = (
                    "ZoomInButton",
                    "zoomInButton",
                    "zoomIn",
                    "zoom_in",
                    "IncreaseZoomButton",
                    "increaseZoom",
                    "ZoomIn",
                    "ZoomPlusButton",
                    "zoomPlusButton",
                )

                def ui_control_is_visible_and_enabled(control):
                    try:
                        if not bool(control.is_enabled()):
                            return False
                        if bool(control.is_visible()):
                            return True
                        # Edge's transient menu projections can report a stale
                        # UIA Visible=false during/after the popup animation.
                        # Keep the fallback bounded to a non-empty rectangle
                        # inside the already process-owned visible top-level
                        # window; never turn this into a desktop-wide search.
                        rect = control.rectangle()
                        top_level = control_top_level_handle(control)
                        return (
                            int(rect.right) > int(rect.left)
                            and int(rect.bottom) > int(rect.top)
                            and bool(ctypes.windll.user32.IsWindowVisible(top_level))
                        )
                    except Exception:
                        return False

                def control_rect_key(control):
                    try:
                        rect = control.rectangle()
                        return (int(rect.left), int(rect.top), int(rect.right), int(rect.bottom))
                    except Exception:
                        return ()

                def has_visible_bounds(control):
                    try:
                        rect = control.rectangle()
                        top_level = control_top_level_handle(control)
                        return (
                            int(rect.right) > int(rect.left)
                            and int(rect.bottom) > int(rect.top)
                            and bool(ctypes.windll.user32.IsWindowVisible(top_level))
                        )
                    except Exception:
                        return False

                def find_buttons(containers, tokens, exact=False, automation_ids=(), include_raw=False, allow_known_automation_ids=False):
                    matches = {}
                    normalized_tokens = {" ".join(token.lower().split()) for token in tokens}
                    normalized_automation_ids = {" ".join(str(token).lower().split()) for token in automation_ids}
                    for container in containers:
                        try:
                            buttons = list(container.descendants())
                            if include_raw:
                                buttons.extend(raw_view_descendants(container))
                        except Exception:
                            continue
                        for button in buttons:
                            names = ui_control_names(button)
                            matched = any(
                                ui_name_matches(candidate, tuple(normalized_tokens), exact=exact)
                                for candidate in names
                            )
                            automation_id = " ".join(str(getattr(button.element_info, "automation_id", "") or "").lower().split())
                            matched_id = bool(automation_id and automation_id in normalized_automation_ids)
                            if not matched and not matched_id:
                                continue
                            if not ui_control_is_visible_and_enabled(button):
                                # Transient Edge flyouts can report a stale
                                # Visible/Enabled projection while their
                                # matched button still has a real on-screen
                                # rectangle. The caller enables this only for
                                # the selected popup-root fallback, never for
                                # the full browser window.
                                if not (allow_known_automation_ids and has_visible_bounds(button)):
                                    continue
                            name = names[0] if names else automation_id
                            if not name:
                                continue
                            info = button.element_info
                            rect_key = control_rect_key(button)
                            key = (
                                int(getattr(info, "process_id", 0) or 0),
                                automation_id,
                                name,
                                rect_key,
                            )
                            if not rect_key:
                                key += (tuple(getattr(info, "runtime_id", ()) or ()),)
                            matches[key] = button
                    return list(matches.values())

                def find_direct_automation_id_matches(containers, automation_ids):
                    """Resolve a known Edge menu control with bounded direct lookups."""
                    matches = {}
                    normalized_ids = {" ".join(str(value).lower().split()) for value in automation_ids}
                    for container in containers:
                        for automation_id in automation_ids:
                            try:
                                specification = container.child_window(auto_id=automation_id)
                                # Probe the WindowSpecification before resolving
                                # a wrapper. wrapper_object() performs its own
                                # default wait and can block on a transient Edge
                                # popup even though this lookup is intended to
                                # be zero-wait and bounded.
                                if not specification.exists(timeout=0):
                                    continue
                                candidate = specification.wrapper_object()
                                actual_id = " ".join(str(getattr(candidate.element_info, "automation_id", "") or "").lower().split())
                                if actual_id not in normalized_ids or not has_visible_bounds(candidate):
                                    continue
                                info = candidate.element_info
                                rect_key = control_rect_key(candidate)
                                key = (
                                    int(getattr(info, "process_id", 0) or 0),
                                    actual_id,
                                    rect_key,
                                )
                                matches[key] = candidate
                            except Exception:
                                continue
                    return list(matches.values())

                def find_bounded_raw_matches(containers, tokens, automation_ids=(), exact=False):
                    """Search only bounded RawView descendants of already-owned roots."""
                    matches = {}
                    normalized_automation_ids = {" ".join(str(value).lower().split()) for value in automation_ids}
                    for container in containers:
                        for control in raw_view_descendants(container, max_depth=8, max_nodes=512):
                            names = ui_control_names(control)
                            automation_id = " ".join(str(getattr(control.element_info, "automation_id", "") or "").lower().split())
                            matched_name = any(ui_name_matches(name, tokens, exact=exact) for name in names)
                            matched_id = bool(automation_id and automation_id in normalized_automation_ids)
                            if not matched_name and not matched_id:
                                continue
                            if not ui_control_is_visible_and_enabled(control):
                                if not (matched_id and has_visible_bounds(control)):
                                    continue
                            info = control.element_info
                            key = (
                                int(getattr(info, "process_id", 0) or 0),
                                automation_id,
                                names[0] if names else "",
                                control_rect_key(control),
                            )
                            matches[key] = control
                    return list(matches.values())

                def is_original_edge_shell_control(control):
                    try:
                        return control_top_level_handle(control) == handle
                    except Exception:
                        return False

                def find_bounded_control_matches(containers, tokens, automation_ids=(), exact=False):
                    """Search bounded ControlView descendants for semantic Edge controls."""
                    matches = {}
                    normalized_automation_ids = {" ".join(str(value).lower().split()) for value in automation_ids}
                    for container in containers:
                        for control in control_view_descendants(container, max_depth=8, max_nodes=512):
                            names = ui_control_names(control)
                            automation_id = " ".join(str(getattr(control.element_info, "automation_id", "") or "").lower().split())
                            matched_name = any(ui_name_matches(name, tokens, exact=exact) for name in names)
                            matched_id = bool(automation_id and automation_id in normalized_automation_ids)
                            if not matched_name and not matched_id:
                                continue
                            if not ui_control_is_visible_and_enabled(control):
                                if not (matched_id and has_visible_bounds(control)):
                                    continue
                            info = control.element_info
                            key = (
                                int(getattr(info, "process_id", 0) or 0),
                                automation_id,
                                names[0] if names else "",
                                control_rect_key(control),
                            )
                            matches[key] = control
                    return list(matches.values())

                def bounded_root_diagnostic(containers):
                    """Emit a small, non-sensitive view of bounded Edge roots on failure."""
                    roots = []
                    for container in containers:
                        handle_value = int(getattr(container, "handle", 0) or 0)
                        entries = []
                        try:
                            controls = raw_view_descendants(container, max_depth=5, max_nodes=96)
                        except Exception:
                            controls = []
                        for control in controls[:48]:
                            names = ui_control_names(control)
                            automation_id = str(getattr(control.element_info, "automation_id", "") or "").strip()
                            control_type = str(getattr(control.element_info, "control_type", "") or "").strip()
                            if names or automation_id or control_type:
                                entries.append({
                                    "name": names[0] if names else "",
                                    "automationId": automation_id,
                                    "controlType": control_type,
                                })
                        roots.append({
                            "handle": handle_value,
                            "class": window_class_name(handle_value) if handle_value else "",
                            "text": window_text(handle_value) if handle_value else "",
                            "visible": bool(handle_value and ctypes.windll.user32.IsWindowVisible(handle_value)),
                            "entries": entries[:24],
                        })
                    diagnostic = json.dumps(roots, ensure_ascii=False, separators=(",", ":"))
                    trace_stage(f"zoom-root-diagnostic:{diagnostic[:12000]}")

                stage = "find-settings-and-more"
                trace_stage(stage)
                more = None
                for auto_id in more_automation_ids:
                    try:
                        candidate = window.child_window(auto_id=auto_id).wrapper_object()
                        if (
                            candidate.exists(timeout=0)
                            and is_original_edge_shell_control(candidate)
                            and ui_control_is_visible_and_enabled(candidate)
                        ):
                            more = candidate
                            break
                    except Exception:
                        continue
                if more is None:
                    more_matches = find_bounded_raw_matches(
                        (window,),
                        more_tokens,
                        exact=True,
                        automation_ids=more_automation_ids,
                    )
                    more_matches = [candidate for candidate in more_matches if is_original_edge_shell_control(candidate)]
                    if len(more_matches) != 1:
                        raise RuntimeError(f"expected exactly one Edge Settings and more control, found {len(more_matches)}")
                    more = more_matches[0]
                try:
                    more_info = more.element_info
                    trace_stage(
                        "settings-and-more-control:"
                        + json.dumps(
                            {
                                "name": ui_control_names(more)[:2],
                                "automationId": str(getattr(more_info, "automation_id", "") or ""),
                                "topLevel": control_top_level_handle(more),
                                "window": handle,
                            },
                            ensure_ascii=False,
                            separators=(",", ":"),
                        )
                    )
                except Exception:
                    trace_stage("settings-and-more-control:unavailable")
                stage = "invoke-settings-and-more"
                trace_stage(stage)
                invoke_owned_control(more, owned_process_id, handle, "Edge Settings and more control")
                time.sleep(args.settle_milliseconds / 1000)
                # Do not scan every visible UIA window on the desktop here.
                # A headed Edge run can coexist with many unrelated Edge
                # windows/processes, and a global UIA enumeration can stall
                # long enough for the Node owner to misclassify the tool as a
                # product failure.  The menu popup is owned by the same Edge
                # process, so keep the search bounded to that process and the
                # already-owned window.
                stage = "find-zoom-in"
                trace_stage(stage)
                # The transient menu is normally a small same-process popup.
                # Do not probe the original Edge UIA tree first: that call can
                # block on the full browser accessibility tree while the menu is
                # already available in its popup HWND.
                zoom_search_attempts = 1
                popup_windows = []
                owned_windows = [window]
                foreground_handle = 0
                for discovery_round in range(2):
                    trace_stage(f"zoom-popup-roots-start:{discovery_round + 1}")
                    all_owned_windows = owned_uia_windows(desktop, owned_process_id, handle, allowed_process_ids)
                    foreground_handle = int(ctypes.windll.user32.GetForegroundWindow() or 0)
                    popup_windows = [
                        candidate for candidate in all_owned_windows
                        if (
                            int(getattr(candidate, "handle", 0) or 0) != handle
                            and (
                                bool(ctypes.windll.user32.IsWindowVisible(int(getattr(candidate, "handle", 0) or 0)))
                                or window_is_owned_by(int(getattr(candidate, "handle", 0) or 0), handle)
                            )
                        )
                    ]
                    popup_windows.sort(
                        key=lambda candidate: (
                            0 if bool(ctypes.windll.user32.IsWindowVisible(int(getattr(candidate, "handle", 0) or 0))) else 1,
                            0 if int(getattr(candidate, "handle", 0) or 0) == foreground_handle else 1,
                            0 if window_is_owned_by(int(getattr(candidate, "handle", 0) or 0), handle) else 1,
                        )
                    )
                    popup_windows = popup_windows[:4]
                    if popup_windows:
                        zoom_search_attempts = discovery_round + 1
                        break
                    if discovery_round == 0:
                        time.sleep(0.15)
                owned_windows = popup_windows or [window]
                trace_stage(f"zoom-popup-roots-end:popup={len(popup_windows)};search={len(owned_windows)}")
                zoom_search_attempts = 2
                trace_stage("zoom-direct-popup-start")
                # Chromium Edge often exposes the menu button's AutomationId
                # on a popup root even when its RawView projection omits the
                # localized label. A direct AutomationId lookup is bounded to
                # the already discovered same-process roots and does not touch
                # the potentially expensive original browser tree.
                zoom_matches = find_direct_automation_id_matches(
                    tuple(owned_windows),
                    zoom_in_automation_ids,
                )
                trace_stage(f"zoom-direct-popup-end:{len(zoom_matches)}")
                if not zoom_matches:
                    # Chromium Edge can keep the menu projection under the
                    # original browser root. The zero-wait existence probe is
                    # safe here; wrapper resolution is attempted only after
                    # Edge reports a matching AutomationId.
                    trace_stage("zoom-direct-browser-start")
                    zoom_matches = find_direct_automation_id_matches(
                        (window,),
                        zoom_in_automation_ids,
                    )
                    trace_stage(f"zoom-direct-browser-end:{len(zoom_matches)}")
                zoom_search_attempts = 3
                trace_stage("zoom-raw-bounded-start")
                if not zoom_matches:
                    raw_search_containers = tuple(owned_windows)
                    if window not in raw_search_containers:
                        # The flyout can be projected as a child of the main
                        # Edge HWND rather than as its own top-level popup. The
                        # original root is allowed only through the bounded
                        # RawView walker; never reopen an unbounded UIA tree
                        # query against the browser window.
                        raw_search_containers += (window,)
                    zoom_matches = find_bounded_raw_matches(
                        raw_search_containers,
                        zoom_in_tokens,
                        automation_ids=zoom_in_automation_ids,
                    )
                trace_stage(f"zoom-raw-bounded-end:{len(zoom_matches)}")
                if not zoom_matches:
                    trace_stage("zoom-control-bounded-start")
                    zoom_matches = find_bounded_control_matches(
                        raw_search_containers,
                        zoom_in_tokens,
                        automation_ids=zoom_in_automation_ids,
                    )
                    trace_stage(f"zoom-control-bounded-end:{len(zoom_matches)}")
                if not zoom_matches and popup_windows:
                    # Some Edge builds expose the flyout through the popup's
                    # ControlView descendants but do not expose it through
                    # either direct AutomationId lookup or the RawView walker.
                    # This is still bounded to the already selected visible
                    # popup roots; the original browser tree is never passed
                    # to descendants().
                    trace_stage("zoom-popup-descendants-start")
                    zoom_matches = find_buttons(
                        tuple(popup_windows),
                        zoom_in_tokens,
                        automation_ids=zoom_in_automation_ids,
                        allow_known_automation_ids=True,
                    )
                    trace_stage(f"zoom-popup-descendants-end:{len(zoom_matches)}")
                if len(zoom_matches) != 1:
                    bounded_root_diagnostic(tuple(owned_windows))
                    raise RuntimeError(
                        f"expected exactly one real Edge Zoom in menu button, found {len(zoom_matches)} "
                        f"after {zoom_search_attempts} bounded UIA searches across {len(owned_windows)} same-process roots"
                    )
                zoom_control = zoom_matches[0]
                stage = "invoke-zoom-in"
                trace_stage(stage)
                invoke_owned_control(
                    zoom_control,
                    owned_process_id,
                    handle,
                    "Edge Zoom in control",
                    allow_stale_enabled=True,
                    allowed_process_ids=allowed_process_ids,
                )
                time.sleep(args.settle_milliseconds / 1000)
                # Edge normally keeps its Settings menu open after the Zoom
                # in control is invoked. Close it through the same owned UIA
                # toolbar control so the next increment and the Windows
                # capture never inherit a stale popup. No global Escape key
                # or physical mouse event is emitted.
                try:
                    menu_remains_open = bool(zoom_control.is_visible())
                except Exception:
                    menu_remains_open = False
                if menu_remains_open:
                    invoke_owned_control(more, owned_process_id, handle, "Edge Settings and more close control")
            time.sleep(args.settle_milliseconds / 1000)

        capture = None
        stage = "capture-owned-edge"
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
            "message": f"{stage}: {safe_exception_message(error)}",
            "stage": stage,
            "title": args.title,
            "elapsedMs": round((time.time() - started_at) * 1000),
        }, 1)


if __name__ == "__main__":
    main()
