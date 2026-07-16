from datetime import datetime, timezone
import re


RFC3339_WITH_TIMEZONE = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$"
)


def utc_now_rfc3339():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def unix_timestamp_rfc3339(value):
    return (
        datetime.fromtimestamp(float(value), timezone.utc)
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z")
    )


def is_rfc3339_timestamp(value):
    if not isinstance(value, str) or not RFC3339_WITH_TIMEZONE.fullmatch(value.strip()):
        return False
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        return False
    return parsed.tzinfo is not None and parsed.utcoffset() is not None
