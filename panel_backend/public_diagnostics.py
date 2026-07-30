import math
import re
from urllib.parse import urlsplit, urlunsplit


_PUBLIC_MESSAGE_LIMIT = 240
_URL_PATTERN = re.compile(r"https?://[^\s;]+", re.IGNORECASE)
_BEARER_PATTERN = re.compile(r"\bbearer\s+[^\s;,]+", re.IGNORECASE)
_SENSITIVE_ASSIGNMENT_PATTERN = re.compile(
    r"\b(authorization|proxy-authorization|cookie|set-cookie|password|passwd|pwd|token|"
    r"access[_-]?token|refresh[_-]?token|api[_-]?key|apikey|secret)\b\s*[:=]\s*"
    r"(?:bearer\s+)?(?:\"[^\"]*\"|'[^']*'|[^\s;,]+)",
    re.IGNORECASE,
)


def _bounded_text(value, limit):
    text = " ".join(str(value or "").split())
    return text[:limit]


def _public_url(match):
    raw = match.group(0)
    trailing = ""
    while raw and raw[-1] in ").,]":
        trailing = raw[-1] + trailing
        raw = raw[:-1]
    try:
        parsed = urlsplit(raw)
        host = parsed.hostname
        if not host:
            return "[redacted-url]" + trailing
        host = f"[{host}]" if ":" in host and not host.startswith("[") else host
        try:
            port = parsed.port
        except ValueError:
            port = None
        netloc = f"{host}:{port}" if port else host
        return urlunsplit((parsed.scheme.lower(), netloc, parsed.path, "", "")) + trailing
    except (TypeError, ValueError):
        return "[redacted-url]" + trailing


def sanitize_public_message(value, default="端点读取失败", limit=_PUBLIC_MESSAGE_LIMIT):
    """Keep bounded diagnostic context while removing credentials and request secrets."""
    text = _bounded_text(value, max(limit * 8, limit))
    if not text:
        return default
    text = _URL_PATTERN.sub(_public_url, text)
    text = _BEARER_PATTERN.sub("Bearer [redacted]", text)
    text = _SENSITIVE_ASSIGNMENT_PATTERN.sub(lambda match: f"{match.group(1)}=[redacted]", text)
    return text[:limit] or default


def _finite_number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def _channel_test(value):
    if not isinstance(value, dict) or not isinstance(value.get("ok"), bool):
        return None
    result = {
        "ok": value["ok"],
        "error": sanitize_public_message(value.get("error"), default="", limit=240) or None,
        "elapsedMs": _finite_number(value.get("elapsedMs")),
    }
    for key, limit in (
        ("identity", 160),
        ("fingerprint", 160),
        ("expectedFingerprint", 160),
        ("algorithm", 80),
    ):
        text = _bounded_text(value.get(key), limit)
        if text:
            result[key] = text
    for key in ("confirmationRequired", "hostKeyChanged", "verifyTls"):
        if isinstance(value.get(key), bool):
            result[key] = value[key]
    status = _finite_number(value.get("status"))
    if status is not None:
        result["status"] = round(status)
    port = _finite_number(value.get("port"))
    if port is not None and 1 <= port <= 65535:
        result["port"] = round(port)
    if value.get("scheme") in {"https", "http"}:
        result["scheme"] = value["scheme"]
    return result


def sanitize_saved_connection_test(value):
    """Return the persisted/public allowlist; session-bound trust tokens are never retained."""
    if not isinstance(value, dict):
        return None
    ssh = _channel_test(value.get("ssh"))
    rest = _channel_test(value.get("rest"))
    if ssh is None or rest is None:
        return None
    return {
        "ssh": ssh,
        "rest": rest,
        "elapsedMs": _finite_number(value.get("elapsedMs")),
    }
