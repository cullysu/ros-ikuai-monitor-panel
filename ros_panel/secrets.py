import base64
import os

ROUTER_LOGIN_SECRET_PREFIX = "dpapi:v1:"


def dpapi_protect_secret(value):
    """Best-effort DPAPI protection on Windows; returns the input unchanged elsewhere."""
    if os.name != "nt" or not value:
        return value
    try:
        import ctypes
        from ctypes import wintypes

        # pbData must stay c_void_p: a c_char_p field hands LocalFree a copy of the
        # buffer instead of the allocated blob, which corrupts the process heap.
        class DataBlob(ctypes.Structure):
            _fields_ = [("cbData", wintypes.DWORD), ("pbData", ctypes.c_void_p)]

        raw = value.encode("utf-8")
        buffer = ctypes.create_string_buffer(raw, len(raw))
        blob_in = DataBlob(len(raw), ctypes.cast(buffer, ctypes.c_void_p))
        blob_out = DataBlob()
        if not ctypes.windll.crypt32.CryptProtectData(
            ctypes.byref(blob_in), "ros-panel-router-login", None, None, None, 0, ctypes.byref(blob_out)
        ):
            return value
        try:
            encoded = base64.b64encode(ctypes.string_at(blob_out.pbData, blob_out.cbData)).decode("ascii")
            return ROUTER_LOGIN_SECRET_PREFIX + encoded
        finally:
            ctypes.windll.kernel32.LocalFree(ctypes.c_void_p(blob_out.pbData))
    except Exception:
        return value


def dpapi_unprotect_secret(value):
    """Reverse of dpapi_protect_secret; None when a protected value cannot be opened."""
    text = str(value or "")
    if not text:
        return None
    if not text.startswith(ROUTER_LOGIN_SECRET_PREFIX):
        return text
    if os.name != "nt":
        return None
    try:
        import ctypes
        from ctypes import wintypes

        class DataBlob(ctypes.Structure):
            _fields_ = [("cbData", wintypes.DWORD), ("pbData", ctypes.c_void_p)]

        raw = base64.b64decode(text[len(ROUTER_LOGIN_SECRET_PREFIX):])
        buffer = ctypes.create_string_buffer(raw, len(raw))
        blob_in = DataBlob(len(raw), ctypes.cast(buffer, ctypes.c_void_p))
        blob_out = DataBlob()
        if not ctypes.windll.crypt32.CryptUnprotectData(
            ctypes.byref(blob_in), None, None, None, None, 0, ctypes.byref(blob_out)
        ):
            return None
        try:
            return ctypes.string_at(blob_out.pbData, blob_out.cbData).decode("utf-8")
        finally:
            ctypes.windll.kernel32.LocalFree(ctypes.c_void_p(blob_out.pbData))
    except Exception:
        return None
