import ipaddress
import os
import re
from datetime import datetime, timezone
from pathlib import Path

COUNTER_WRAP_MODULUS = 1 << 64
RFC3339_TIMESTAMP_PATTERN = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$"
)
_ROUTER_OS_MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}


def to_int(value, default=0):
    try:
        if value in ("", None):
            return default
        if isinstance(value, (int, float)):
            return int(value)
        text = str(value).strip().replace(" ", "")
        if not text:
            return default
        match = re.fullmatch(r"(-?\d+(?:\.\d+)?)([A-Za-z]+)?", text)
        if match:
            number = float(match.group(1))
            unit = (match.group(2) or "").upper()
            factors = {
                "BPS": 1,
                "K": 1024,
                "KB": 1000,
                "KIB": 1024,
                "KBPS": 1000,
                "M": 1024**2,
                "MB": 1000**2,
                "MIB": 1024**2,
                "MBPS": 1000**2,
                "G": 1024**3,
                "GB": 1000**3,
                "GIB": 1024**3,
                "GBPS": 1000**3,
                "T": 1024**4,
                "TB": 1000**4,
                "TIB": 1024**4,
                "TBPS": 1000**4,
            }
            if unit in factors:
                return int(number * factors[unit])
        return int(float(text))
    except Exception:
        return default


def to_bool(value):
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).lower() in {"true", "yes", "on", "running", "bound", "active", "enabled"}


def utc_now_rfc3339():
    """Timezone-qualified UTC instant for strict public evidence envelopes."""
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def public_rfc3339_timestamp(value):
    """Normalize a snapshot timestamp for strict public evidence envelopes.

    Vanilla snapshots carry naive local clocks ("YYYY-MM-DD HH:MM:SS"); interpret
    those as local time and publish the timezone-qualified UTC instant. Values
    that already carry an explicit offset pass through unchanged, and anything
    else stays unavailable instead of being invented.
    """
    text = str(value or "").strip()
    if not text:
        return None
    if RFC3339_TIMESTAMP_PATTERN.fullmatch(text):
        return text
    try:
        naive = datetime.strptime(text, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None
    return naive.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def split_connection_endpoint(value):
    """RouterOS connection rows carry endpoints like 192.0.2.7:43470 or [2001:db8::1]:443;
    return the address part so it can be parsed as an IP."""
    text = str(value or "").strip()
    if not text:
        return None
    try:
        ipaddress.ip_address(text)
        return text
    except ValueError:
        pass
    if text.startswith("["):
        inner, bracket, tail = text.partition("]")
        if bracket and tail.startswith(":"):
            candidate = inner[1:]
            try:
                ipaddress.ip_address(candidate)
                return candidate
            except ValueError:
                return None
    head, sep, tail = text.rpartition(":")
    if sep and head and tail.isdigit() and len(tail) <= 5 and int(tail) <= 65535:
        try:
            ipaddress.ip_address(head)
            return head
        except ValueError:
            return None
    return None


def counter_delta(current, previous):
    """64-bit counter delta; None means the counter was reset, not wrapped around."""
    if current >= previous:
        return current - previous
    if (previous - current) > (COUNTER_WRAP_MODULUS >> 1):
        return current + COUNTER_WRAP_MODULUS - previous
    return None


def compact_exception_text(exc):
    """Error text for the UI: drop the full REST URL that requests appends and keep it short."""
    status = getattr(getattr(exc, "response", None), "status_code", None)
    if status is not None:
        return f"REST 返回 HTTP {status}"
    text = " ".join(str(exc).split())
    for marker in (" for url:", " with url: "):
        if marker in text:
            text = text.split(marker, 1)[0].rstrip(" ,;")
    if len(text) > 200:
        text = text[:200] + "…"
    return text


def format_routeros_uptime(value):
    """'1w2d03:04:05' -> '1周2天 03:04:05'; passthrough when it does not match."""
    text = str(value or "").strip()
    match = re.fullmatch(r"(?:(\d+)w)?(?:(\d+)d)?(\d{1,2}:\d{2}:\d{2})", text)
    if not match:
        return text or "-"
    weeks, days, clock = match.groups()
    parts = []
    if weeks:
        parts.append(f"{weeks}周")
    if days:
        parts.append(f"{days}天")
    if not parts:
        return clock
    return "".join(parts) + " " + clock


def format_routeros_clock(value):
    """'sep/28/2026' -> '2026-09-28'; passthrough otherwise."""
    text = str(value or "").strip()
    match = re.fullmatch(r"([a-z]{3})/(\d{1,2})/(\d{4})", text, re.IGNORECASE)
    if not match:
        return text
    month = _ROUTER_OS_MONTHS.get(match.group(1).lower())
    return f"{match.group(3)}-{month:02d}-{int(match.group(2)):02d}" if month else text


def env_value(name, default=None):
    value = os.environ.get(name)
    if os.name == "posix":
        try:
            environ = Path("/proc/self/environ").read_bytes()
        except OSError:
            environ = b""
        if environ:
            prefix = f"{name}=".encode()
            matches = [entry[len(prefix):] for entry in environ.split(b"\0") if entry.startswith(prefix)]
            if matches:
                value = matches[-1].decode(errors="replace")
    return default if value is None else value
