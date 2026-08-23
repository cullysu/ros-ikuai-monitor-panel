from datetime import datetime, timezone
import re


RFC3339_WITH_TIMEZONE = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$"
)

PUBLIC_TIMESTAMP_FIELDS = {
    "observedAt",
    "timestamp",
    "updatedAt",
    "generatedAt",
    "sourceUpdatedAt",
    "cachedAt",
    "lastUsedAt",
    "createdAt",
    "systemTime",
}

# Public payloads use camelCase, snake_case, or kebab-case names.  Keep the
# explicit list above for well-known fields, but do not let a newly added
# timestamp-shaped field silently bypass the boundary just because it was not
# added to that list first. Duration fields such as leaseTime are deliberately
# excluded; the case-sensitive At/Timestamp suffixes describe instants.
PUBLIC_TIMESTAMP_SUFFIXES = (
    "At",
    "Timestamp",
    "_at",
    "_timestamp",
    "-at",
    "-timestamp",
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


def require_rfc3339_timestamp(value):
    """Return a public timestamp only when its timezone is explicit."""
    timestamp = str(value or "").strip()
    if not is_rfc3339_timestamp(timestamp):
        raise ValueError("Public timestamps must use timezone-qualified RFC3339")
    return timestamp


def optional_rfc3339_timestamp(value):
    """Normalize untrusted optional timestamps without inventing a timezone."""
    try:
        return require_rfc3339_timestamp(value)
    except ValueError:
        return None


def is_public_timestamp_field(key):
    """Match the timestamp field family consumed by the public panel contract."""
    key = str(key or "")
    return key in PUBLIC_TIMESTAMP_FIELDS or key.endswith(PUBLIC_TIMESTAMP_SUFFIXES)


def enforce_public_timestamp_contract(value, path=()):
    """Redact ambiguous public times instead of letting clients guess a timezone.

    RouterOS and optional upstream integrations can provide local-looking clocks.
    Public JSON may carry only timezone-qualified RFC3339 for known time fields;
    a missing or ambiguous value remains unavailable rather than becoming evidence.
    """
    if isinstance(value, list):
        return [enforce_public_timestamp_contract(item, path) for item in value]
    if not isinstance(value, dict):
        return value
    normalized = {}
    for key, item in value.items():
        is_log_time = key == "time" and "logs" in path
        normalized[key] = (
            optional_rfc3339_timestamp(item)
            if is_public_timestamp_field(key) or is_log_time
            else enforce_public_timestamp_contract(item, (*path, key))
        )
    return normalized
