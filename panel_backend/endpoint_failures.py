from .time_contract import is_rfc3339_timestamp
from .public_diagnostics import sanitize_public_message


def _rest_path(endpoint_config):
    if not isinstance(endpoint_config, dict):
        return ""
    path = str(endpoint_config.get("path") or "").strip().lstrip("/")
    return f"/rest/{path}" if path else ""


def _observed_at(value, fallback):
    if is_rfc3339_timestamp(value):
        return value
    return fallback if is_rfc3339_timestamp(fallback) else None


def normalize_endpoint_failures(failures, *, channel, group, endpoints, observed_at, fallback_at):
    """Return the public endpoint-failure contract without carrying collector internals."""
    endpoint_map = endpoints if isinstance(endpoints, dict) else {}
    if isinstance(failures, dict):
        source = [
            {"name": name, "message": message}
            for name, message in failures.items()
        ]
    elif isinstance(failures, list):
        source = [item for item in failures if isinstance(item, dict)]
    else:
        source = []

    result = []
    for item in source:
        name = str(item.get("name") or "").strip()
        if not name:
            continue
        endpoint = str(item.get("endpoint") or "").strip() or _rest_path(endpoint_map.get(name))
        message = sanitize_public_message(item.get("message"))
        entry = {
            "channel": channel,
            "group": group,
            "name": name,
            "endpoint": endpoint,
            "message": message,
        }
        at = _observed_at(item.get("at"), _observed_at(observed_at, fallback_at))
        if at:
            entry["at"] = at
        result.append(entry)
    return result
