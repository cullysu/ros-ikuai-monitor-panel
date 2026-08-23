from urllib.parse import urlparse


def _parse_source_url(value, label, normalize_host, normalize_port):
    raw = str(value or "").strip()
    if not raw:
        return None
    try:
        parsed = urlparse(raw)
        if parsed.scheme not in {"http", "https"}:
            return None
        if parsed.username is not None or parsed.password is not None:
            return None
        host = normalize_host(parsed.hostname or "", f"{label} host")
        port = parsed.port
        port = normalize_port(port if port is not None else (443 if parsed.scheme == "https" else 80))
    except (TypeError, ValueError):
        return None
    return parsed, (parsed.scheme, host, port)


def parse_origin_authority(value, normalize_host, normalize_port):
    if "," in str(value or ""):
        return None
    parsed_source = _parse_source_url(value, "origin", normalize_host, normalize_port)
    if not parsed_source:
        return None
    parsed, authority = parsed_source
    if parsed.path or parsed.params or parsed.query or parsed.fragment:
        return None
    return authority


def parse_referer_authority(value, normalize_host, normalize_port):
    parsed_source = _parse_source_url(value, "referer", normalize_host, normalize_port)
    if not parsed_source:
        return None
    parsed, authority = parsed_source
    if parsed.fragment:
        return None
    return authority


def source_authority_is_allowed(source, request_source, is_loopback_host):
    if not source or not request_source or source != request_source:
        return False
    _, source_host, source_port = source
    _, request_host_name, request_port = request_source
    return (
        is_loopback_host(source_host)
        and is_loopback_host(request_host_name)
        and source_port == request_port
    )
