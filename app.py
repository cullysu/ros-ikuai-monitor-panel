import copy
import hashlib
import ipaddress
import json
import mimetypes
import os
import re
import secrets
import socket
import subprocess
import sys
import threading
import time
import webbrowser
from concurrent.futures import ThreadPoolExecutor, wait
from collections import defaultdict, deque
from http import cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

import requests

try:
    import paramiko
except ModuleNotFoundError as exc:
    paramiko = None
    PARAMIKO_IMPORT_ERROR = exc
else:
    PARAMIKO_IMPORT_ERROR = None


def is_frozen_app():
    return bool(getattr(sys, "frozen", False))


def resolve_base_dir():
    if is_frozen_app():
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


BASE_DIR = resolve_base_dir()
BUNDLE_DIR = Path(getattr(sys, "_MEIPASS", BASE_DIR)).resolve()


def resolve_runtime_path(value, base_dir=BASE_DIR):
    path = Path(value).expanduser()
    if not path.is_absolute():
        path = base_dir / path
    return path.resolve()


def load_env_file(path):
    try:
        content = path.read_text(encoding="utf-8-sig")
    except FileNotFoundError:
        return False
    except UnicodeDecodeError:
        fallback_encoding = "mbcs" if os.name == "nt" else "utf-8"
        content = path.read_text(encoding=fallback_encoding, errors="replace")

    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
            continue
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        os.environ.setdefault(key, value)
    return True


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


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True


def load_panel_env():
    configured = os.getenv("ROS_PANEL_ENV_FILE")
    env_path = resolve_runtime_path(configured) if configured else BASE_DIR / "routeros-panel.env"
    return env_path if load_env_file(env_path) else None


def env_config_rows(name):
    raw = str(os.getenv(name, "") or "").strip()
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except Exception:
        parsed = None
    if isinstance(parsed, dict):
        parsed = [parsed]
    if isinstance(parsed, list):
        return [item for item in parsed if isinstance(item, dict)]

    rows = []
    for index, part in enumerate(raw.split(","), start=1):
        item = part.strip()
        if not item:
            continue
        if "=" in item:
            label, address = item.split("=", 1)
        else:
            label, address = f"DNS {index}", item
        rows.append({"name": label.strip(), "address": address.strip()})
    return rows


def compact_config_rows(rows, *, address_key="address"):
    compacted = []
    seen = set()
    for raw in rows:
        row = raw if isinstance(raw, dict) else {}
        address = str(row.get(address_key) or row.get("url") or "").strip()
        if not address or address in seen:
            continue
        seen.add(address)
        name = str(row.get("name") or row.get("label") or address).strip() or address
        compacted.append({"name": name[:80], address_key: address})
    return compacted


def detect_panel_lan_ip():
    candidates = []
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.settimeout(0.2)
            sock.connect(("1.1.1.1", 80))
            candidates.append(sock.getsockname()[0])
    except OSError:
        pass
    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET, socket.SOCK_DGRAM):
            candidates.append(info[4][0])
    except OSError:
        pass
    for candidate in candidates:
        try:
            address = ipaddress.ip_address(candidate)
        except ValueError:
            continue
        if not (address.is_loopback or address.is_unspecified or address.is_link_local):
            return str(address)
    return "127.0.0.1"


DEFAULT_PANEL_BIND = "127.0.0.1"
DEFAULT_PANEL_PORT = 28646
DEFAULT_PANEL_TARGET = "127.0.0.1"
PANEL_NETWORK_ENV_KEYS = ("ROS_PANEL_BIND", "ROS_PANEL_PORT", "ROS_PANEL_TARGET_IP")
PANEL_NETWORK_WRITE_ENABLED_RAW = str(env_value("ROS_PANEL_NETWORK_WRITE_ENABLED", "auto")).strip().lower()
PANEL_TRUST_PROXY_HEADERS = str(env_value("ROS_PANEL_TRUST_PROXY_HEADERS", "0")).strip().lower() in {"1", "true", "yes", "on"}
PANEL_ALLOW_LOCALHOST_HOST_FORWARD = str(env_value("ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD", "0")).strip().lower() in {"1", "true", "yes", "on"}
PANEL_LOCALHOST_FORWARD_HEADER = "X-Ros-Panel-Localhost-Forward"
PANEL_LOCALHOST_FORWARD_TOKEN = str(env_value("ROS_PANEL_LOCALHOST_FORWARD_TOKEN", "")).strip()
PANEL_SESSION_COOKIE = "ros_panel_session"
PANEL_CSRF_COOKIE = "ros_panel_csrf"
PANEL_SESSION_TTL_SECONDS = 8 * 60 * 60
PANEL_SESSIONS = {}
PANEL_SESSION_LOCK = threading.RLock()
PANEL_ENV_ASSIGNMENT_RE = re.compile(r"^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_]*)(\s*=\s*)(.*)$")


def panel_env_write_path():
    configured = os.getenv("ROS_PANEL_ENV_FILE")
    return resolve_runtime_path(configured) if configured else BASE_DIR / "routeros-panel.env"


def normalize_panel_host(value, label="host"):
    raw = str(value or "").strip()
    if not raw:
        raise ValueError(f"Panel {label} is required")
    if raw.startswith("[") and raw.endswith("]"):
        raw = raw[1:-1].strip()
    if any(part in raw for part in ("://", "/", "\\", "?", "#")):
        raise ValueError(f"Panel {label} must be a host or IP, not a URL")
    if any(ch.isspace() for ch in raw):
        raise ValueError(f"Panel {label} must not contain spaces")
    try:
        ipaddress.ip_address(raw)
        return raw
    except ValueError:
        pass
    if ":" in raw:
        raise ValueError(f"Panel {label} has an invalid IPv6 address")
    if len(raw) > 253 or ".." in raw:
        raise ValueError(f"Panel {label} is not a valid host name")
    if not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9._-]{0,251}[A-Za-z0-9])?", raw):
        raise ValueError(f"Panel {label} is not a valid host name")
    return raw


def normalize_panel_port(value):
    raw = str(value or "").strip()
    if not re.fullmatch(r"\d{1,5}", raw):
        raise ValueError("Panel port must be a number")
    port = int(raw)
    if port < 1 or port > 65535:
        raise ValueError("Panel port must be between 1 and 65535")
    return port


def format_url_host(host):
    raw = str(host or "").strip()
    if raw.lower() == "auto" or raw in {"", "0.0.0.0", "::"}:
        raw = DEFAULT_PANEL_TARGET
    if ":" in raw and not raw.startswith("["):
        return f"[{raw}]"
    return raw


def resolve_panel_access_host(value):
    raw = str(value or "").strip()
    if not raw or raw.lower() == "auto":
        return DEFAULT_PANEL_TARGET
    return normalize_panel_host(raw, "access host")


def is_loopback_panel_host(value):
    raw = str(value or "").strip()
    if raw.startswith("[") and raw.endswith("]"):
        raw = raw[1:-1].strip()
    if raw.lower() == "localhost":
        return True
    try:
        return ip_address_is_loopback(ipaddress.ip_address(raw))
    except ValueError:
        return False


def is_unspecified_panel_host(value):
    raw = str(value or "").strip()
    if raw.startswith("[") and raw.endswith("]"):
        raw = raw[1:-1].strip()
    try:
        return ipaddress.ip_address(raw).is_unspecified
    except ValueError:
        return False


def panel_profile_requires_localhost_contract(profile):
    normalized = re.sub(r"[^a-z0-9]+", "_", str(profile or "").strip().lower()).strip("_")
    return normalized in {
        "public",
        "routeros_public",
        "routeros_only",
        "public_routeros",
        "routeros_public_preview",
    }


def validate_panel_public_contract(bind, target, profile="routeros_only"):
    bind = normalize_panel_host(bind, "bind")
    target = resolve_panel_access_host(target)
    if not panel_profile_requires_localhost_contract(profile):
        return bind, target
    if not (is_loopback_panel_host(bind) or is_unspecified_panel_host(bind)):
        raise ValueError("Panel bind must stay on 127.0.0.1/localhost; non-loopback IPs are not allowed")
    if not is_loopback_panel_host(target):
        raise ValueError("Panel browser URL must stay on 127.0.0.1/localhost")
    return bind, target


def panel_access_url(bind, port, target=None):
    access_host = str(target or "").strip() or str(bind or "").strip() or DEFAULT_PANEL_TARGET
    if access_host.lower() == "auto" or access_host in {"0.0.0.0", "::"}:
        access_host = DEFAULT_PANEL_TARGET
    return f"http://{format_url_host(access_host)}:{normalize_panel_port(port)}/"


def first_header_value(value):
    return str(value or "").split(",", 1)[0].strip()


def parse_ip_literal(value):
    raw = str(value or "").strip()
    if raw.startswith("[") and raw.endswith("]"):
        raw = raw[1:-1].strip()
    if "%" in raw:
        raw = raw.split("%", 1)[0]
    return ipaddress.ip_address(raw)


def ip_address_is_loopback(address):
    if getattr(address, "ipv4_mapped", None):
        return address.ipv4_mapped.is_loopback
    return address.is_loopback


def client_host_is_loopback(value):
    try:
        return ip_address_is_loopback(parse_ip_literal(value))
    except ValueError:
        return False


def panel_client_address_is_allowed(client_address, headers=None):
    if not globals().get("PUBLIC_ROUTEROS_PROFILE", True):
        return True
    peer_host = client_address[0] if client_address else ""
    if not client_host_is_loopback(peer_host):
        if PANEL_ALLOW_LOCALHOST_HOST_FORWARD:
            request_host = parse_panel_request_host(headers, fallback_port=PANEL_PORT)
            supplied_token = first_header_value((headers or {}).get(PANEL_LOCALHOST_FORWARD_HEADER))
            token_ok = bool(
                PANEL_LOCALHOST_FORWARD_TOKEN
                and supplied_token
                and secrets.compare_digest(PANEL_LOCALHOST_FORWARD_TOKEN, supplied_token)
            )
            if token_ok and request_host and is_loopback_panel_host(request_host[0]):
                return True
        return False
    if not PANEL_TRUST_PROXY_HEADERS:
        return True
    for header_name in ("X-Forwarded-For", "X-Real-IP"):
        forwarded_host = first_header_value((headers or {}).get(header_name))
        if forwarded_host and not client_host_is_loopback(forwarded_host):
            return False
    return True


def parse_panel_request_host(headers, fallback_port=None):
    if not headers:
        return None
    host_header = first_header_value(headers.get("Host"))
    if PANEL_TRUST_PROXY_HEADERS:
        host_header = first_header_value(headers.get("X-Forwarded-Host")) or host_header
    if not host_header or "@" in host_header or any(part in host_header for part in ("://", "/", "\\", "?", "#")):
        return None
    try:
        parsed = urlparse(f"//{host_header}")
        host = normalize_panel_host(parsed.hostname or "", "request host")
        port = parsed.port
    except (TypeError, ValueError):
        return None
    forwarded_port = first_header_value(headers.get("X-Forwarded-Port")) if PANEL_TRUST_PROXY_HEADERS else ""
    if port is None and forwarded_port:
        try:
            port = normalize_panel_port(forwarded_port)
        except ValueError:
            port = None
    if port is None:
        port = normalize_panel_port(fallback_port if fallback_port is not None else PANEL_PORT)
    return host, port


def parse_panel_origin(value):
    raw = str(value or "").strip()
    if not raw:
        return None
    try:
        parsed = urlparse(raw)
        if parsed.scheme not in {"http", "https"}:
            return None
        host = normalize_panel_host(parsed.hostname or "", "origin host")
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
    except (TypeError, ValueError):
        return None
    return host, normalize_panel_port(port)


def panel_origin_is_allowed(headers, value):
    origin = parse_panel_origin(value)
    request_host = parse_panel_request_host(headers, fallback_port=PANEL_PORT)
    if not origin or not request_host:
        return False
    origin_host, origin_port = origin
    request_host_name, request_port = request_host
    return (
        is_loopback_panel_host(origin_host)
        and is_loopback_panel_host(request_host_name)
        and origin_port == request_port
    )


def parse_request_cookies(cookie_header):
    jar = cookies.SimpleCookie()
    try:
        jar.load(str(cookie_header or ""))
    except cookies.CookieError:
        return {}
    return {name: morsel.value for name, morsel in jar.items()}


def prune_panel_sessions(now=None):
    now = time.time() if now is None else now
    expired = [
        token
        for token, session in PANEL_SESSIONS.items()
        if now - float(session.get("lastSeen") or session.get("created") or 0) > PANEL_SESSION_TTL_SECONDS
    ]
    for token in expired:
        PANEL_SESSIONS.pop(token, None)


def create_panel_session():
    now = time.time()
    token = secrets.token_urlsafe(32)
    session = {
        "id": token,
        "csrf": secrets.token_urlsafe(32),
        "created": now,
        "lastSeen": now,
    }
    with PANEL_SESSION_LOCK:
        prune_panel_sessions(now)
        PANEL_SESSIONS[token] = session
    return copy.deepcopy(session)


def get_panel_session(token):
    if not token:
        return None
    now = time.time()
    with PANEL_SESSION_LOCK:
        prune_panel_sessions(now)
        session = PANEL_SESSIONS.get(str(token))
        if not session:
            return None
        session["lastSeen"] = now
        return copy.deepcopy(session)


def build_panel_cookie(name, value, max_age=PANEL_SESSION_TTL_SECONDS, http_only=True):
    parts = [
        f"{name}={value}",
        "Path=/",
        f"Max-Age={int(max_age)}",
        "SameSite=Strict",
    ]
    if http_only:
        parts.append("HttpOnly")
    return "; ".join(parts)


def csrf_token_matches(session, token):
    expected = str((session or {}).get("csrf") or "")
    supplied = str(token or "")
    return bool(expected and supplied and secrets.compare_digest(expected, supplied))


def panel_host_header_is_allowed(headers):
    if not globals().get("PUBLIC_ROUTEROS_PROFILE", True):
        return True
    if not headers:
        return True
    host_header = first_header_value(headers.get("Host"))
    if PANEL_TRUST_PROXY_HEADERS:
        host_header = first_header_value(headers.get("X-Forwarded-Host")) or host_header
    if not host_header:
        return True
    if "@" in host_header or any(part in host_header for part in ("://", "/", "\\", "?", "#")):
        return False
    try:
        parsed = urlparse(f"//{host_header}")
        host = normalize_panel_host(parsed.hostname or "", "request host")
    except (TypeError, ValueError):
        return False
    return is_loopback_panel_host(host)


def panel_request_access_url(headers, fallback_port=None):
    if not headers:
        return None
    host_header = first_header_value(headers.get("Host"))
    if PANEL_TRUST_PROXY_HEADERS:
        host_header = first_header_value(headers.get("X-Forwarded-Host")) or host_header
    if not host_header or "@" in host_header or any(part in host_header for part in ("://", "/", "\\", "?", "#")):
        return None
    try:
        parsed = urlparse(f"//{host_header}")
        host = normalize_panel_host(parsed.hostname or "", "request host")
        port = parsed.port
    except (TypeError, ValueError):
        return None
    if not is_loopback_panel_host(host):
        return None
    forwarded_port = first_header_value(headers.get("X-Forwarded-Port"))
    if port is None and forwarded_port:
        try:
            port = normalize_panel_port(forwarded_port)
        except ValueError:
            port = None
    if port is None:
        port = normalize_panel_port(fallback_port if fallback_port is not None else PANEL_PORT)
    scheme = first_header_value(headers.get("X-Forwarded-Proto")).lower() if PANEL_TRUST_PROXY_HEADERS else ""
    if scheme not in {"http", "https"}:
        scheme = "http"
    return f"{scheme}://{format_url_host(host)}:{normalize_panel_port(port)}/"


def panel_network_payload(bind=None, port=None, target=None, restart_required=False, request_url=None):
    bind = normalize_panel_host(bind if bind is not None else PANEL_BIND, "bind")
    port = normalize_panel_port(port if port is not None else PANEL_PORT)
    target = resolve_panel_access_host(target if target is not None else PANEL_TARGET)
    env_path = panel_env_write_path()
    write_status = panel_env_write_status(env_path)
    configured_url = panel_access_url(bind, port, target)
    browser_url = str(request_url or "").strip() or configured_url
    return {
        "bind": bind,
        "port": port,
        "target": target,
        "currentUrl": browser_url,
        "browserUrl": browser_url,
        "configuredUrl": configured_url,
        "detectedFromRequest": bool(request_url),
        "envFile": str(env_path),
        "loadedEnvFile": str(PANEL_ENV_FILE) if PANEL_ENV_FILE else None,
        "saveSupported": write_status["writable"],
        "envWritable": write_status["writable"],
        "writeStatus": write_status,
        "restartRequired": bool(restart_required),
        "defaults": {
            "bind": DEFAULT_PANEL_BIND,
            "port": DEFAULT_PANEL_PORT,
            "target": DEFAULT_PANEL_TARGET,
            "url": panel_access_url(DEFAULT_PANEL_BIND, DEFAULT_PANEL_PORT, DEFAULT_PANEL_TARGET),
        },
    }


def quote_env_value(value):
    raw = str(value)
    if re.fullmatch(r"[A-Za-z0-9_./:@-]+", raw):
        return raw
    return json.dumps(raw, ensure_ascii=False)


def read_text_with_env_fallback(path):
    try:
        return path.read_text(encoding="utf-8-sig")
    except FileNotFoundError:
        return ""
    except UnicodeDecodeError:
        fallback_encoding = "mbcs" if os.name == "nt" else "utf-8"
        return path.read_text(encoding=fallback_encoding, errors="replace")


def panel_env_write_status(path=None):
    path = Path(path).resolve() if path else panel_env_write_path()
    if PANEL_NETWORK_WRITE_ENABLED_RAW in {"0", "false", "no", "off", "disabled", "read_only", "readonly"}:
        return {
            "envFile": str(path),
            "exists": path.exists(),
            "parent": str(path.parent),
            "writable": False,
            "mode": "disabled",
            "message": "Panel address settings are read-only in this delivery mode. Edit the installer/env file and restart the panel instead.",
        }
    parent = path.parent
    probe_parent = parent
    while not probe_parent.exists() and probe_parent != probe_parent.parent:
        probe_parent = probe_parent.parent
    writable = os.access(path, os.W_OK) if path.exists() else os.access(probe_parent, os.W_OK)
    message = (
        "Panel address settings can be saved to the local env file."
        if writable
        else "Panel address settings are read-only in this delivery mode. Edit the installer/env file and restart the panel instead."
    )
    return {
        "envFile": str(path),
        "exists": path.exists(),
        "parent": str(parent),
        "writable": bool(writable),
        "mode": "auto",
        "message": message,
    }


def write_panel_network_env(bind, port, target, env_path=None):
    bind = normalize_panel_host(bind, "bind")
    port = normalize_panel_port(port)
    target = resolve_panel_access_host(target)
    bind, target = validate_panel_public_contract(bind, target, globals().get("PANEL_PROFILE_RAW", "routeros_only"))
    path = Path(env_path).resolve() if env_path else panel_env_write_path()
    write_status = panel_env_write_status(path)
    if not write_status["writable"]:
        raise PermissionError(write_status["message"])
    updates = {
        "ROS_PANEL_BIND": bind,
        "ROS_PANEL_PORT": str(port),
        "ROS_PANEL_TARGET_IP": target,
    }
    content = read_text_with_env_fallback(path)
    lines = content.splitlines()
    found = set()
    next_lines = []
    for line in lines:
        match = PANEL_ENV_ASSIGNMENT_RE.match(line)
        if match and match.group(2) in updates:
            prefix, key, sep = match.group(1), match.group(2), match.group(3)
            next_lines.append(f"{prefix}{key}{sep}{quote_env_value(updates[key])}")
            found.add(key)
        else:
            next_lines.append(line)
    if next_lines and next_lines[-1].strip():
        next_lines.append("")
    for key in PANEL_NETWORK_ENV_KEYS:
        if key not in found:
            next_lines.append(f"{key}={quote_env_value(updates[key])}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(next_lines).rstrip() + "\n", encoding="utf-8")
    return path


PANEL_ENV_FILE = load_panel_env()
PUBLIC_DIR = resolve_runtime_path(os.getenv("ROS_PANEL_PUBLIC_DIR", str(BUNDLE_DIR / "public")))
DEFAULT_ROUTER_HOST = "192.168.88.1"
ROUTER_HOST = env_value("ROS_MONITOR_ROUTER_HOST", DEFAULT_ROUTER_HOST)
ROUTER_USER = os.getenv("ROS_MONITOR_ROUTER_USER", "ros-panel-readonly")
ROUTER_PASSWORD = os.getenv("ROS_MONITOR_ROUTER_PASSWORD", "CHANGE_ME")
ROUTER_SSH_PORT = int(os.getenv("ROS_MONITOR_ROUTER_SSH_PORT", "22"))
PANEL_PROFILE_RAW = env_value("ROS_PANEL_PROFILE", "routeros_only")
PANEL_BIND = normalize_panel_host(env_value("ROS_PANEL_BIND", DEFAULT_PANEL_BIND), "bind")
PANEL_PORT = normalize_panel_port(env_value("ROS_PANEL_PORT", str(DEFAULT_PANEL_PORT)))
PANEL_TARGET = resolve_panel_access_host(env_value("ROS_PANEL_TARGET_IP", DEFAULT_PANEL_TARGET))
PANEL_BIND, PANEL_TARGET = validate_panel_public_contract(PANEL_BIND, PANEL_TARGET, PANEL_PROFILE_RAW)
POLL_SECONDS = max(1, int(os.getenv("ROS_MONITOR_POLL_SECONDS", "1")))
HISTORY_LIMIT = int(os.getenv("ROS_MONITOR_HISTORY_LIMIT", "60"))
RATE_ZERO_CONFIRM_SAMPLES = max(1, int(os.getenv("ROS_MONITOR_RATE_ZERO_CONFIRM_SAMPLES", "2")))
ACTIVE_CONNECTION_LIMIT = int(os.getenv("ROS_MONITOR_ACTIVE_CONNECTION_LIMIT", "80"))
REST_TIMEOUT = max(8, int(os.getenv("ROS_MONITOR_REST_TIMEOUT", "12")))
SSH_TIMEOUT = max(8, int(os.getenv("ROS_MONITOR_SSH_TIMEOUT", "12")))
STATIC_POLL_SECONDS = max(300, int(os.getenv("ROS_MONITOR_STATIC_POLL_SECONDS", "300")))
STATIC_REST_WORKERS = max(1, min(3, int(os.getenv("ROS_MONITOR_STATIC_REST_WORKERS", "1"))))
SLOW_REST_POLL_SECONDS = max(60, int(os.getenv("ROS_MONITOR_SLOW_REST_POLL_SECONDS", "60")))
SLOW_REST_WORKERS = max(1, min(3, int(os.getenv("ROS_MONITOR_SLOW_REST_WORKERS", "2"))))
CONNECTION_DETAIL_POLL_SECONDS = max(4, int(os.getenv("ROS_MONITOR_CONNECTION_DETAIL_POLL_SECONDS", "4")))
DETAIL_REST_WORKERS = max(1, min(2, int(os.getenv("ROS_MONITOR_DETAIL_REST_WORKERS", "1"))))
CONNECTION_PROTOCOL_POLL_SECONDS = max(30, int(os.getenv("ROS_MONITOR_CONNECTION_PROTOCOL_POLL_SECONDS", "30")))
CONNECTION_DETAIL_CAPTURE_SECONDS = max(4, int(os.getenv("ROS_MONITOR_CONNECTION_DETAIL_CAPTURE_SECONDS", "4")))
CONNECTION_DETAIL_SAMPLE_LIMIT = max(
    ACTIVE_CONNECTION_LIMIT,
    int(os.getenv("ROS_MONITOR_CONNECTION_DETAIL_SAMPLE_LIMIT", str(max(ACTIVE_CONNECTION_LIMIT * 4, 160)))),
)
CONNECTION_DETAIL_STREAM_MAX_BYTES = max(
    65536,
    int(os.getenv("ROS_MONITOR_CONNECTION_DETAIL_STREAM_MAX_BYTES", "131072")),
)
CONNECTION_DETAIL_OVERRUN_BACKOFF_SECONDS = max(
    CONNECTION_DETAIL_POLL_SECONDS,
    int(os.getenv("ROS_MONITOR_CONNECTION_DETAIL_OVERRUN_BACKOFF_SECONDS", "6")),
)
CONNECTION_DETAIL_OVERRUN_BACKOFF_CAP_SECONDS = max(
    CONNECTION_DETAIL_OVERRUN_BACKOFF_SECONDS,
    int(os.getenv("ROS_MONITOR_CONNECTION_DETAIL_OVERRUN_BACKOFF_CAP_SECONDS", "15")),
)
CONNECTION_DETAIL_OVERRUN_MULTIPLIER = max(
    1.0,
    float(os.getenv("ROS_MONITOR_CONNECTION_DETAIL_OVERRUN_MULTIPLIER", "1.5")),
)
CONNECTION_PROTOCOL_BREAKDOWN_INTERVAL_SECONDS = max(
    CONNECTION_PROTOCOL_POLL_SECONDS,
    int(os.getenv("ROS_MONITOR_CONNECTION_PROTOCOL_BREAKDOWN_INTERVAL_SECONDS", "300")),
)
CONNECTION_PROTOCOL_SCAN_TIMEOUT = max(120, int(os.getenv("ROS_MONITOR_CONNECTION_PROTOCOL_SCAN_TIMEOUT", "300")))
CONNECTION_TRACKING_TIMEOUT = max(12, int(os.getenv("ROS_MONITOR_CONNECTION_TRACKING_TIMEOUT", "30")))
CONNECTION_DETAIL_REST_TIMEOUT = max(8, int(os.getenv("ROS_MONITOR_CONNECTION_DETAIL_REST_TIMEOUT", "12")))
CONNECTION_SEARCH_MAX_LIMIT = max(20, int(os.getenv("ROS_MONITOR_CONNECTION_SEARCH_MAX_LIMIT", "200")))
CONNECTION_SEARCH_CAPTURE_SECONDS = max(2, int(os.getenv("ROS_MONITOR_CONNECTION_SEARCH_CAPTURE_SECONDS", "4")))
CONNECTION_SEARCH_STREAM_MAX_BYTES = max(
    32768,
    int(os.getenv("ROS_MONITOR_CONNECTION_SEARCH_STREAM_MAX_BYTES", "262144")),
)
CONNECTION_SEARCH_TIMEOUT = max(8, int(os.getenv("ROS_MONITOR_CONNECTION_SEARCH_TIMEOUT", "12")))
CONNECTION_SEARCH_FIELDS = [
    "src-address",
    "dst-address",
    "reply-src-address",
    "reply-dst-address",
    "protocol",
    "timeout",
    "connection-mark",
    "orig-rate",
    "repl-rate",
    "orig-bytes",
    "repl-bytes",
]
DNS_STATIC_PREVIEW_LIMIT = int(os.getenv("ROS_MONITOR_DNS_STATIC_PREVIEW_LIMIT", "12"))
DNS_STATIC_PAGE_LIMIT = int(os.getenv("ROS_MONITOR_DNS_STATIC_PAGE_LIMIT", "100"))
DNS_STATIC_MAX_PAGE_LIMIT = int(os.getenv("ROS_MONITOR_DNS_STATIC_MAX_PAGE_LIMIT", "300"))
DNS_STATIC_CACHE_TTL = int(os.getenv("ROS_MONITOR_DNS_STATIC_CACHE_TTL", "60"))
DNS_STATIC_FULL_REST_TIMEOUT = int(os.getenv("ROS_MONITOR_DNS_STATIC_FULL_REST_TIMEOUT", "35"))
SSH_BANNER_PROBE_TIMEOUT = max(0.5, min(3.0, float(os.getenv("ROS_MONITOR_SSH_BANNER_PROBE_TIMEOUT", "1.5"))))
IP_ALIAS_FILE = Path(os.getenv("ROS_PANEL_IP_ALIAS_FILE", str(BASE_DIR / "data" / "ip_aliases.json"))).expanduser()
ROUTER_LOGIN_STORE_FILE = Path(os.getenv("ROS_PANEL_ROUTER_LOGIN_STORE_FILE", str(BASE_DIR / "data" / "router_logins.json"))).expanduser()
ROUTER_LOGIN_HISTORY_LIMIT = max(1, int(os.getenv("ROS_PANEL_ROUTER_LOGIN_HISTORY_LIMIT", "32")))
CUSTOM_NAME_MAX_LENGTH = int(os.getenv("ROS_PANEL_CUSTOM_NAME_MAX_LENGTH", "48"))
READONLY_DIAGNOSTIC_CACHE_TTL = int(os.getenv("ROS_PANEL_READONLY_DIAGNOSTIC_CACHE_TTL", "45"))
READONLY_DIAGNOSTIC_DNS_TIMEOUT = float(os.getenv("ROS_PANEL_READONLY_DIAGNOSTIC_DNS_TIMEOUT", "1.2"))
READONLY_DIAGNOSTIC_HTTP_TIMEOUT = float(os.getenv("ROS_PANEL_READONLY_DIAGNOSTIC_HTTP_TIMEOUT", "2.5"))
READONLY_DIAGNOSTIC_WORKERS = int(os.getenv("ROS_PANEL_READONLY_DIAGNOSTIC_WORKERS", "24"))
READONLY_DIAGNOSTIC_TOTAL_TIMEOUT = float(os.getenv("ROS_PANEL_READONLY_DIAGNOSTIC_TOTAL_TIMEOUT", "8"))
STATUS_FINDINGS_LIMIT = max(1, int(os.getenv("ROS_PANEL_STATUS_FINDINGS_LIMIT", "24")))
WAN_LATENCY_TARGET = os.getenv("ROS_PANEL_WAN_LATENCY_TARGET", "www.baidu.com").strip() or "www.baidu.com"
WAN_LATENCY_POLL_SECONDS = max(1, int(os.getenv("ROS_PANEL_WAN_LATENCY_POLL_SECONDS", "10")))
WAN_LATENCY_TIMEOUT_MS = max(200, int(os.getenv("ROS_PANEL_WAN_LATENCY_TIMEOUT_MS", "1200")))

READONLY_DNS_SERVERS = compact_config_rows(
    env_config_rows("ROS_PANEL_READONLY_DNS_SERVERS")
    or [
        {
            "name": os.getenv("ROS_PANEL_READONLY_ROUTER_DNS_NAME", "RouterOS DNS"),
            "address": os.getenv("ROS_PANEL_READONLY_ROUTER_DNS", ROUTER_HOST),
        },
        {
            "name": os.getenv("ROS_PANEL_READONLY_OPENWRT_DNS_NAME", "OpenWrt DNS"),
            "address": os.getenv("ROS_PANEL_READONLY_OPENWRT_DNS", ""),
        },
    ]
)

READONLY_DNS_DOMAINS = [
    {"name": "GitHub", "domain": "github.com", "expected": "proxy"},
    {"name": "YouTube", "domain": "youtube.com", "expected": "proxy"},
    {"name": "Google", "domain": "google.com", "expected": "proxy"},
    {"name": "Apple", "domain": "apple.com", "expected": "direct"},
    {"name": "Douyin", "domain": "douyin.com", "expected": "direct"},
    {"name": "Bilibili", "domain": "bilibili.com", "expected": "direct"},
    {"name": "Steam", "domain": "steampowered.com", "expected": "mixed"},
    {"name": "PayPal", "domain": "paypal.com", "expected": "direct"},
    {"name": "Cloudflare", "domain": "cloudflare.com", "expected": "proxy"},
    {"name": "OpenAI", "domain": "openai.com", "expected": "proxy"},
]

READONLY_HTTP_TARGETS = [
    {"name": "GitHub", "url": "https://github.com/", "expected": "proxy"},
    {"name": "YouTube", "url": "https://www.youtube.com/generate_204", "expected": "proxy"},
    {"name": "Google", "url": "https://www.google.com/generate_204", "expected": "proxy"},
    {"name": "Apple Store", "url": "https://apps.apple.com/", "expected": "direct"},
    {"name": "Douyin", "url": "https://www.douyin.com/", "expected": "direct"},
    {"name": "Bilibili", "url": "https://www.bilibili.com/", "expected": "direct"},
    {"name": "Steam", "url": "https://store.steampowered.com/", "expected": "mixed"},
    {"name": "PayPal", "url": "https://www.paypal.com/", "expected": "direct"},
    {"name": "Cloudflare", "url": "https://www.cloudflare.com/cdn-cgi/trace", "expected": "proxy"},
    {"name": "OpenAI API", "url": "https://api.openai.com/", "expected": "proxy"},
]

READONLY_EXIT_TARGETS = [
    {"name": "ipify", "url": "https://api.ipify.org?format=json", "type": "json_ip"},
    {"name": "ifconfig.me", "url": "https://ifconfig.me/ip", "type": "text_ip"},
    {"name": "Cloudflare Trace", "url": "https://www.cloudflare.com/cdn-cgi/trace", "type": "cloudflare_trace"},
]
READONLY_NIKKI_CONTROLLER = os.getenv("ROS_PANEL_READONLY_NIKKI_CONTROLLER", "").strip()

def endpoint(path, kind="list", fields=None, optional=False, timeout=None):
    params = {".proplist": fields} if fields else None
    config = {"path": path, "kind": kind, "params": params, "optional": optional}
    if timeout is not None:
        config["timeout"] = timeout
    return config


REALTIME_REST_ENDPOINTS = {
    "resource": endpoint(
        "system/resource",
        kind="object",
        fields="version,board-name,architecture-name,cpu,cpu-count,cpu-frequency,cpu-load,total-memory,free-memory,total-hdd-space,free-hdd-space,uptime",
        timeout=8,
    ),
    "clock": endpoint("system/clock", kind="object", fields="date,time", timeout=4),
    "ntp": endpoint("system/ntp/client", kind="object", fields="status"),
    "dns": endpoint(
        "ip/dns",
        kind="object",
        fields="allow-remote-requests,servers,cache-size,cache-used,doh-server,use-doh-server,verify-doh-cert",
    ),
    "active_users": endpoint("user/active", fields="name,address,via,when"),
    "interfaces": endpoint(
        "interface",
        fields="name,type,running,disabled,mac-address,interface,master-interface,vlan-id,rx-packet,tx-packet,rx-drop,tx-drop,rx-error,tx-error,rx-byte,tx-byte",
        timeout=8,
    ),
    "pppoe": endpoint("interface/pppoe-client", fields="name,running,interface,disabled"),
    "ip_addresses": endpoint("ip/address", fields="interface,actual-interface,address,network"),
    "ipv6_addresses": endpoint(
        "ipv6/address",
        fields="interface,actual-interface,address,disabled,dynamic,global,link-local,slave",
        optional=True,
    ),
    "routes": endpoint("ip/route", fields="dst-address,gateway,distance,routing-table,active,comment,static,dynamic,disabled"),
    "arp": endpoint("ip/arp", fields="address,mac-address,status,dynamic"),
    "ipv6_nd": endpoint(
        "ipv6/nd",
        fields="interface,dns,advertise-dns,dns-servers,managed-address-configuration,other-configuration,ra-lifetime",
        optional=True,
    ),
    "ipv6_dhcp_clients": endpoint(
        "ipv6/dhcp-client",
        fields="interface,status,pool-name,prefix,address,use-peer-dns,request,add-default-route,default-route-distance,dhcp-options",
        optional=True,
    ),
}


STATIC_REST_ENDPOINTS = {
    "identity": endpoint("system/identity", kind="object", fields="name"),
    "dns": endpoint(
        "ip/dns",
        kind="object",
        fields="allow-remote-requests,servers,cache-size,cache-used,doh-server,use-doh-server,verify-doh-cert",
    ),
    "dhcp_servers": endpoint("ip/dhcp-server", fields="name,interface,address-pool,lease-time,disabled"),
    "dhcp_leases": endpoint("ip/dhcp-server/lease", fields="address,host-name,mac-address,server,status,last-seen,dynamic"),
    "dhcp_clients": endpoint(
        "ip/dhcp-client",
        fields="interface,status,use-peer-dns,add-default-route,default-route-distance,dhcp-options,disabled",
        optional=True,
    ),
    "pools": endpoint("ip/pool", fields="name,ranges"),
    "pool_used": endpoint("ip/pool/used", fields="pool,address,owner,info", optional=True),
    "filters": endpoint(
        "ip/firewall/filter",
        fields=".id,chain,action,comment,packets,bytes,disabled,passthrough,connection-mark,packet-mark,routing-mark,in-interface,out-interface,src-address,dst-address",
    ),
    "address_lists": endpoint("ip/firewall/address-list", fields="list,address,timeout,comment"),
    "mangle": endpoint(
        "ip/firewall/mangle",
        fields=".id,chain,action,comment,passthrough,connection-mark,new-connection-mark,packet-mark,new-packet-mark,routing-mark,new-routing-mark,in-interface,out-interface,src-address,dst-address,packets,bytes,per-connection-classifier,disabled",
    ),
    "routing_rules": endpoint(
        "routing/rule",
        fields=".id,action,table,routing-mark,src-address,dst-address,interface,comment,disabled,inactive",
    ),
    "logs": endpoint("log", fields="time,topics,message"),
}

for _CONFIG_ENDPOINT_KEY in ("ipv6_nd", "ipv6_dhcp_clients"):
    STATIC_REST_ENDPOINTS[_CONFIG_ENDPOINT_KEY] = REALTIME_REST_ENDPOINTS.pop(_CONFIG_ENDPOINT_KEY)


SLOW_REST_ENDPOINTS = {}
for _SLOW_ENDPOINT_KEY in (
    "clock",
    "ntp",
    "dns",
    "active_users",
    "pppoe",
    "ip_addresses",
    "ipv6_addresses",
    "routes",
    "arp",
):
    SLOW_REST_ENDPOINTS[_SLOW_ENDPOINT_KEY] = REALTIME_REST_ENDPOINTS.pop(_SLOW_ENDPOINT_KEY)

SLOW_REST_ENDPOINTS["ipv6_neighbors"] = endpoint(
    "ipv6/neighbor",
    fields="address,mac-address,interface,status,router,complete",
    optional=True,
)


DETAIL_REST_ENDPOINTS = {
    "ipv6_addresses": SLOW_REST_ENDPOINTS.pop("ipv6_addresses"),
    "ipv6_neighbors": SLOW_REST_ENDPOINTS.pop("ipv6_neighbors"),
}


EMPTY_REST_BUNDLE = {
    "resource": {},
    "identity": {},
    "clock": {},
    "ntp": {},
    "active_users": [],
    "interfaces": [],
    "pppoe": [],
    "ip_addresses": [],
    "ipv6_addresses": [],
    "ipv6_neighbors": [],
    "routes": [],
    "arp": [],
    "dns": {},
    "dns_static": [],
    "dns_static_meta": {},
    "ipv6_nd": [],
    "ipv6_dhcp_clients": [],
    "dhcp_clients": [],
    "dhcp_servers": [],
    "dhcp_leases": [],
    "pools": [],
    "pool_used": [],
    "filters": [],
    "address_lists": [],
    "mangle": [],
    "routing_rules": [],
    "logs": [],
}

TRACKING_FIELD_PATTERN = re.compile(r"^\s*([A-Za-z0-9-]+):\s*(.*?)\s*$")
TERSE_FIELD_PATTERN = re.compile(r"([A-Za-z0-9-]+)=(.*?)(?=\s+[A-Za-z0-9-]+=|$)")
CGNAT_NETWORK = ipaddress.ip_network("100.64.0.0/10")


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


ARP_ACTIVE_STATUSES = {
    "active",
    "complete",
    "delay",
    "permanent",
    "probe",
    "published",
    "reachable",
    "static",
}
ARP_STALE_STATUSES = {"expired", "failed", "incomplete", "stale", "unreachable"}


def arp_evidence_state(status):
    text = str(status or "").strip().lower()
    if text in ARP_ACTIVE_STATUSES:
        return "active"
    if text in ARP_STALE_STATUSES:
        return "stale"
    return "unknown"


def arp_status_summary(entries):
    counts = defaultdict(int)
    for entry in entries:
        counts[str(entry.get("status") or "unknown").strip().lower() or "unknown"] += 1
    return ", ".join(f"{key}:{counts[key]}" for key in sorted(counts))


def make_arp_alert(kind, value, entries, unique_key):
    rows = [entry for entry in entries if entry.get(unique_key)]
    unique_values = sorted({str(entry.get(unique_key)) for entry in rows}, key=ip_sort_key if unique_key == "ip" else None)
    active_values = sorted(
        {str(entry.get(unique_key)) for entry in rows if entry.get("evidenceState") == "active"},
        key=ip_sort_key if unique_key == "ip" else None,
    )
    stale_count = sum(1 for entry in rows if entry.get("evidenceState") == "stale")
    unknown_count = sum(1 for entry in rows if entry.get("evidenceState") == "unknown")
    if kind == "IP conflict":
        if len(active_values) > 1:
            severity, confidence, active_conflict = "critical", "high", True
        elif active_values:
            severity, confidence, active_conflict = "warning", "medium", False
        else:
            severity, confidence, active_conflict = "info", "low", False
    else:
        if len(active_values) > 1:
            severity, confidence, active_conflict = "warning", "medium", False
        elif active_values:
            severity, confidence, active_conflict = "info", "low", False
        else:
            severity, confidence, active_conflict = "info", "low", False
    return {
        "kind": kind,
        "value": value,
        "detail": ", ".join(unique_values),
        "severity": severity,
        "confidence": confidence,
        "activeConflict": active_conflict,
        "activeEvidenceCount": len(active_values),
        "staleEvidenceCount": stale_count,
        "unknownEvidenceCount": unknown_count,
        "statusSummary": arp_status_summary(rows),
        "interpretation": "active duplicate evidence" if active_conflict else "historical or lower-confidence identity movement",
    }


def interface_is_derived(name, iface_type):
    type_text = str(iface_type or "").strip().lower()
    name_text = str(name or "").strip().lower()
    return type_text in {"vlan", "macvlan"} or name_text.startswith(("vlan", "macvlan"))


def interface_parent_hint(item):
    item = item if isinstance(item, dict) else {}
    own_name = str(item.get("name") or "").strip()
    for key in ("interface", "master-interface", "actual-interface", "parent"):
        value = str(item.get(key) or "").strip()
        if value and value != own_name:
            return value
    return None


def interface_logical_pair_key(item):
    item = item if isinstance(item, dict) else {}
    name = str(item.get("name") or "").strip().lower()
    match = re.fullmatch(r"(?:vlan|macvlan)(.+)", name)
    if match and match.group(1):
        return f"logical-pair:{match.group(1)}"
    return None


def interface_quality_group_key(item):
    item = item if isinstance(item, dict) else {}
    parent = interface_parent_hint(item)
    logical_pair = interface_logical_pair_key(item)
    iface_type = str(item.get("type") or "").strip().lower() or "interface"
    vlan_id = str(item.get("vlan-id") or "").strip()
    own_name = str(item.get("name") or "").strip()
    if parent:
        return ":".join(part for part in (parent, iface_type, vlan_id or own_name) if part)
    if logical_pair:
        return logical_pair
    return own_name or iface_type


def env_bool(name, default=False):
    raw = os.getenv(name)
    if raw is None:
        return default
    text = str(raw).strip().lower()
    if text in {"1", "true", "yes", "on", "enabled"}:
        return True
    if text in {"0", "false", "no", "off", "disabled"}:
        return False
    return default


PANEL_OPEN_BROWSER = env_bool("ROS_PANEL_OPEN_BROWSER", default=is_frozen_app())


def connection_detail_sleep_seconds(elapsed):
    if elapsed < CONNECTION_DETAIL_POLL_SECONDS:
        return max(0, CONNECTION_DETAIL_POLL_SECONDS - elapsed)
    adaptive = int(elapsed * CONNECTION_DETAIL_OVERRUN_MULTIPLIER)
    adaptive = max(CONNECTION_DETAIL_OVERRUN_BACKOFF_SECONDS, adaptive)
    return min(CONNECTION_DETAIL_OVERRUN_BACKOFF_CAP_SECONDS, adaptive)


def format_iso_now():
    return time.strftime("%Y-%m-%d %H:%M:%S")


def parse_ping_latency_ms(output):
    text = str(output or "")
    patterns = [
        r"(?:time|时间)\s*[=<]\s*<?\s*(\d+(?:\.\d+)?)\s*ms",
        r"(?:Average|平均)[^\d=]*(?:=)?\s*<?\s*(\d+(?:\.\d+)?)\s*ms",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return max(1, int(round(float(match.group(1)))))
    return None


def tcp_latency_target(target=WAN_LATENCY_TARGET, timeout_ms=WAN_LATENCY_TIMEOUT_MS):
    safe_target = str(target or WAN_LATENCY_TARGET).strip() or WAN_LATENCY_TARGET
    parsed = urlparse(safe_target if "://" in safe_target else f"https://{safe_target}")
    host = parsed.hostname or safe_target
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    safe_timeout_ms = max(200, to_int(timeout_ms, WAN_LATENCY_TIMEOUT_MS))
    started_at = time.monotonic()
    try:
        with socket.create_connection((host, port), timeout=max(0.2, safe_timeout_ms / 1000.0)):
            pass
        return {
            "ok": True,
            "target": safe_target,
            "latencyMs": max(1, int(round((time.monotonic() - started_at) * 1000))),
            "updatedAt": format_iso_now(),
            "method": "tcp-connect-fallback",
            "error": None,
        }
    except Exception as exc:
        return {
            "ok": False,
            "target": safe_target,
            "latencyMs": None,
            "updatedAt": format_iso_now(),
            "method": "tcp-connect-fallback",
            "error": str(exc),
        }


def ping_latency_target(target=WAN_LATENCY_TARGET, timeout_ms=WAN_LATENCY_TIMEOUT_MS):
    safe_target = str(target or WAN_LATENCY_TARGET).strip() or WAN_LATENCY_TARGET
    safe_timeout_ms = max(200, to_int(timeout_ms, WAN_LATENCY_TIMEOUT_MS))
    timeout_seconds = max(1.0, safe_timeout_ms / 1000.0 + 0.8)
    if os.name == "nt":
        command = ["ping", "-n", "1", "-w", str(safe_timeout_ms), safe_target]
    else:
        command = ["ping", "-c", "1", "-W", str(max(1, int(round(safe_timeout_ms / 1000.0)))), safe_target]
    started_at = time.monotonic()
    try:
        proc = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout_seconds,
        )
        output = f"{proc.stdout}\n{proc.stderr}"
        latency_ms = parse_ping_latency_ms(output)
        if latency_ms is None and proc.returncode == 0:
            latency_ms = max(1, int(round((time.monotonic() - started_at) * 1000)))
        if latency_ms is None and proc.returncode != 0:
            lowered = output.lower()
            if "operation not permitted" in lowered or "permission denied" in lowered:
                fallback = tcp_latency_target(safe_target, safe_timeout_ms)
                fallback["error"] = None if fallback.get("ok") else f"ICMP ping unavailable; {fallback.get('error') or 'TCP fallback failed'}"
                return fallback
        return {
            "ok": proc.returncode == 0 and latency_ms is not None,
            "target": safe_target,
            "latencyMs": latency_ms,
            "updatedAt": format_iso_now(),
            "method": "icmp-ping",
            "error": None if proc.returncode == 0 and latency_ms is not None else (output.strip()[-240:] or f"ping exited {proc.returncode}"),
        }
    except FileNotFoundError:
        fallback = tcp_latency_target(safe_target, safe_timeout_ms)
        fallback["error"] = None if fallback.get("ok") else f"ICMP ping command not found; {fallback.get('error') or 'TCP fallback failed'}"
        return fallback
    except Exception as exc:
        return {
            "ok": False,
            "target": safe_target,
            "latencyMs": None,
            "updatedAt": format_iso_now(),
            "method": "icmp-ping",
            "error": str(exc),
        }


ROUTER_PASSWORD_PLACEHOLDERS = {"", "CHANGE_ME", "changeme", "password"}
ROUTER_CONFIG_LOCK = threading.RLock()
ROUTER_CONFIG = {
    "host": str(ROUTER_HOST or "").strip(),
    "user": str(ROUTER_USER or "").strip(),
    "password": str(ROUTER_PASSWORD or ""),
    "sshPort": max(1, min(65535, to_int(ROUTER_SSH_PORT, 22))),
    "source": "env",
    "savedId": None,
    "updatedAt": None,
    "lastTest": None,
}
ROUTER_LOGIN_STORE_LOCK = threading.RLock()


def normalize_router_host(value):
    text = str(value or "").strip()
    if not text:
        raise ValueError("RouterOS address is required")
    if "://" in text:
        parsed = urlparse(text)
        text = parsed.hostname or ""
    text = text.strip().strip("[]")
    if not text or "/" in text or "\\" in text or any(char.isspace() for char in text):
        raise ValueError("RouterOS address must be an IP address or hostname")
    if len(text) > 253:
        raise ValueError("RouterOS address is too long")
    return text


def normalize_router_ssh_port(value):
    port = to_int(value, 22)
    if port < 1 or port > 65535:
        raise ValueError("SSH port must be between 1 and 65535")
    return port


def router_config_is_ready(config):
    password = str(config.get("password") or "").strip()
    return bool(
        str(config.get("host") or "").strip()
        and str(config.get("user") or "").strip()
        and password.strip()
        and password not in ROUTER_PASSWORD_PLACEHOLDERS
    )


def get_router_config():
    with ROUTER_CONFIG_LOCK:
        return copy.deepcopy(ROUTER_CONFIG)


def get_ready_router_config():
    config = get_router_config()
    if not router_config_is_ready(config):
        raise RuntimeError("RouterOS SSH connection is not configured")
    return config


def public_router_config(config=None):
    source = config or get_router_config()
    password = str(source.get("password") or "").strip()
    return {
        "configured": router_config_is_ready(source),
        "host": source.get("host") or "",
        "user": source.get("user") or "",
        "sshPort": to_int(source.get("sshPort"), 22),
        "source": source.get("source") or "memory",
        "savedId": source.get("savedId"),
        "updatedAt": source.get("updatedAt"),
        "passwordSet": bool(password.strip()) and password not in ROUTER_PASSWORD_PLACEHOLDERS,
        "lastTest": copy.deepcopy(source.get("lastTest")),
    }


def dns_static_total_count_from_meta(dns_static_meta, fallback=DNS_STATIC_PREVIEW_LIMIT):
    meta = dns_static_meta if isinstance(dns_static_meta, dict) else {}
    for key in ("total_count", "totalCount", "count"):
        if key in meta:
            return to_int(meta.get(key), fallback)
    return to_int(fallback, DNS_STATIC_PREVIEW_LIMIT)


def safe_ascii_preview(raw_bytes, limit=48):
    preview = bytes(raw_bytes or b"")[:limit]
    return "".join(chr(byte) if 32 <= byte < 127 else "." for byte in preview)


def describe_ssh_endpoint_probe(host, port, timeout=SSH_BANNER_PROBE_TIMEOUT):
    safe_host = str(host or "").strip() or "<empty-host>"
    safe_port = to_int(port, 22)
    safe_timeout = max(0.5, min(float(timeout or SSH_BANNER_PROBE_TIMEOUT), 3.0))
    try:
        with socket.create_connection((safe_host, safe_port), timeout=safe_timeout) as sock:
            sock.settimeout(safe_timeout)
            try:
                banner = sock.recv(64)
            except socket.timeout:
                return f"TCP connected to {safe_host}:{safe_port}, but no SSH banner arrived within {safe_timeout:.1f}s"
    except socket.timeout:
        return f"TCP connect to {safe_host}:{safe_port} timed out before SSH banner check"
    except OSError as exc:
        return f"TCP connect to {safe_host}:{safe_port} failed before SSH banner check: {exc}"

    if banner.startswith(b"SSH-"):
        return f"TCP connected to {safe_host}:{safe_port} and an SSH banner was visible"
    if not banner:
        return f"TCP connected to {safe_host}:{safe_port}, but the remote side closed before sending an SSH banner"

    lowered = banner.lower()
    if banner.startswith(b"HTTP/") or b"<html" in lowered:
        detected = "HTTP"
    elif banner.startswith(b"\x16\x03"):
        detected = "TLS/HTTPS"
    else:
        detected = "non-SSH"
    return (
        f"TCP connected to {safe_host}:{safe_port}, but the endpoint did not speak SSH "
        f"(detected {detected} banner: {safe_ascii_preview(banner)!r})"
    )


def format_ssh_connect_error(config, exc, timeout=SSH_TIMEOUT):
    host = str((config or {}).get("host") or "").strip() or "<empty-host>"
    port = to_int((config or {}).get("sshPort"), 22)
    message = str(exc)
    banner_error = "Error reading SSH protocol banner" in message
    session_error = "No existing session" in message
    if banner_error or session_error:
        probe = describe_ssh_endpoint_probe(host, port, timeout=min(float(timeout or SSH_TIMEOUT), SSH_BANNER_PROBE_TIMEOUT))
        return (
            f"RouterOS SSH connect failed for {host}:{port}: {probe}. "
            f"The configured SSH port is still {port}; the failure happened before password authentication. "
            f"Original error: {message}"
        )
    return f"RouterOS SSH connect failed for {host}:{port}: {message}"


def require_paramiko():
    if paramiko is None:
        raise RuntimeError(
            "Python dependency 'paramiko' is not installed; run `python -m pip install -r requirements.txt` "
            "before using RouterOS SSH features."
        ) from PARAMIKO_IMPORT_ERROR
    return paramiko


def ssh_capability_status():
    available = paramiko is not None
    return {
        "available": available,
        "state": "available" if available else "dependency_missing",
        "label": "SSH 可用" if available else "SSH 依赖缺失",
        "transport": "ssh" if available else "rest-degraded",
        "restTrusted": True,
        "degradedModules": [] if available else [
            "连接明细",
            "会话采样",
            "连接协议统计 SSH fallback",
            "DNS 静态计数 SSH fallback",
        ],
        "message": "" if available else "paramiko 未安装；REST 采集继续可用，依赖 SSH 的明细会降级或不可用。",
    }


def set_router_config(host, user, password, ssh_port=22, source="ui", last_test=None, saved_id=None):
    normalized = {
        "host": normalize_router_host(host),
        "user": str(user or "").strip(),
        "password": str(password or ""),
        "sshPort": normalize_router_ssh_port(ssh_port),
        "source": source,
        "savedId": saved_id,
        "updatedAt": format_iso_now(),
        "lastTest": copy.deepcopy(last_test),
    }
    if not normalized["user"]:
        raise ValueError("RouterOS username is required")
    if not normalized["password"].strip():
        raise ValueError("RouterOS password is required")
    with ROUTER_CONFIG_LOCK:
        ROUTER_CONFIG.update(normalized)
    return public_router_config(normalized)


def clear_router_config():
    with ROUTER_CONFIG_LOCK:
        ROUTER_CONFIG.update(
            {
                "password": "",
                "source": "ui",
                "savedId": None,
                "updatedAt": format_iso_now(),
                "lastTest": None,
            }
        )
    return public_router_config()


def router_login_entry_id(host, user, ssh_port):
    raw = f"{normalize_router_host(host).lower()}|{str(user or '').strip()}|{normalize_router_ssh_port(ssh_port)}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def normalize_saved_router_entry(raw):
    if not isinstance(raw, dict):
        return None
    try:
        host = normalize_router_host(raw.get("host"))
        user = str(raw.get("user") or "").strip()
        ssh_port = normalize_router_ssh_port(raw.get("sshPort") or raw.get("port") or 22)
    except Exception:
        return None
    if not user:
        return None
    entry_id = str(raw.get("id") or router_login_entry_id(host, user, ssh_port)).strip()
    password = str(raw.get("password") or "")
    return {
        "id": entry_id,
        "host": host,
        "user": user,
        "password": password,
        "sshPort": ssh_port,
        "label": str(raw.get("label") or host).strip()[:80],
        "source": str(raw.get("source") or "saved").strip() or "saved",
        "createdAt": raw.get("createdAt") or raw.get("updatedAt") or format_iso_now(),
        "updatedAt": raw.get("updatedAt") or format_iso_now(),
        "lastUsedAt": raw.get("lastUsedAt") or raw.get("updatedAt") or format_iso_now(),
        "lastTest": copy.deepcopy(raw.get("lastTest")),
    }


def load_router_login_store_unlocked():
    try:
        if not ROUTER_LOGIN_STORE_FILE.exists():
            return []
        payload = json.loads(ROUTER_LOGIN_STORE_FILE.read_text(encoding="utf-8-sig"))
        source = payload.get("entries", []) if isinstance(payload, dict) else []
        entries = []
        seen = set()
        for raw in source:
            entry = normalize_saved_router_entry(raw)
            if not entry or entry["id"] in seen:
                continue
            seen.add(entry["id"])
            entries.append(entry)
        entries.sort(key=lambda row: str(row.get("lastUsedAt") or row.get("updatedAt") or ""), reverse=True)
        return entries[:ROUTER_LOGIN_HISTORY_LIMIT]
    except Exception:
        return []


def persist_router_login_store_unlocked(entries):
    ROUTER_LOGIN_STORE_FILE.parent.mkdir(parents=True, exist_ok=True)
    normalized = []
    seen = set()
    for raw in entries:
        entry = normalize_saved_router_entry(raw)
        if not entry or entry["id"] in seen:
            continue
        seen.add(entry["id"])
        normalized.append(entry)
    normalized.sort(key=lambda row: str(row.get("lastUsedAt") or row.get("updatedAt") or ""), reverse=True)
    payload = {
        "version": 1,
        "updatedAt": format_iso_now(),
        "warning": "This local file stores RouterOS SSH passwords in clear text for this panel instance. Keep it private.",
        "entries": normalized[:ROUTER_LOGIN_HISTORY_LIMIT],
    }
    tmp_path = ROUTER_LOGIN_STORE_FILE.with_suffix(".json.tmp")
    tmp_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        os.chmod(tmp_path, 0o600)
    except Exception:
        pass
    tmp_path.replace(ROUTER_LOGIN_STORE_FILE)
    try:
        os.chmod(ROUTER_LOGIN_STORE_FILE, 0o600)
    except Exception:
        pass


def public_saved_router_entry(entry):
    password = str(entry.get("password") or "").strip()
    return {
        "id": entry.get("id"),
        "host": entry.get("host") or "",
        "user": entry.get("user") or "",
        "sshPort": to_int(entry.get("sshPort"), 22),
        "label": entry.get("label") or entry.get("host") or "",
        "source": entry.get("source") or "saved",
        "createdAt": entry.get("createdAt"),
        "updatedAt": entry.get("updatedAt"),
        "lastUsedAt": entry.get("lastUsedAt"),
        "passwordSaved": bool(password) and password not in ROUTER_PASSWORD_PLACEHOLDERS,
        "lastTest": copy.deepcopy(entry.get("lastTest")),
    }


def public_saved_router_logins():
    with ROUTER_LOGIN_STORE_LOCK:
        return [public_saved_router_entry(entry) for entry in load_router_login_store_unlocked()]


def find_saved_router_login(saved_id):
    saved_id = str(saved_id or "").strip()
    if not saved_id:
        return None
    with ROUTER_LOGIN_STORE_LOCK:
        for entry in load_router_login_store_unlocked():
            if entry.get("id") == saved_id:
                return copy.deepcopy(entry)
    return None


def remember_router_login(host, user, password, ssh_port=22, last_test=None, source="ui"):
    now = format_iso_now()
    entry = normalize_saved_router_entry(
        {
            "id": router_login_entry_id(host, user, ssh_port),
            "host": host,
            "user": user,
            "password": password,
            "sshPort": ssh_port,
            "label": host,
            "source": source,
            "updatedAt": now,
            "lastUsedAt": now,
            "lastTest": copy.deepcopy(last_test),
        }
    )
    if not entry:
        raise ValueError("Saved RouterOS login is invalid")
    with ROUTER_LOGIN_STORE_LOCK:
        stored_entries = load_router_login_store_unlocked()
        existing = next((row for row in stored_entries if row.get("id") == entry["id"]), None)
        if existing:
            entry["createdAt"] = existing.get("createdAt") or entry["createdAt"]
        entries = [row for row in stored_entries if row.get("id") != entry["id"]]
        entries.insert(0, entry)
        persist_router_login_store_unlocked(entries)
    return copy.deepcopy(entry)


def forget_router_login(saved_id):
    saved_id = str(saved_id or "").strip()
    removed = False
    with ROUTER_LOGIN_STORE_LOCK:
        entries = []
        for entry in load_router_login_store_unlocked():
            if entry.get("id") == saved_id:
                removed = True
                continue
            entries.append(entry)
        persist_router_login_store_unlocked(entries)
    with ROUTER_CONFIG_LOCK:
        if ROUTER_CONFIG.get("savedId") == saved_id:
            ROUTER_CONFIG["savedId"] = None
            ROUTER_CONFIG["source"] = "ui"
    return removed


def restore_last_saved_router_login():
    current = get_router_config()
    if router_config_is_ready(current):
        return public_router_config(current)
    with ROUTER_LOGIN_STORE_LOCK:
        entries = load_router_login_store_unlocked()
    for entry in entries:
        if router_config_is_ready(entry):
            with ROUTER_CONFIG_LOCK:
                ROUTER_CONFIG.update(
                    {
                        "host": entry["host"],
                        "user": entry["user"],
                        "password": entry["password"],
                        "sshPort": entry["sshPort"],
                        "source": "saved",
                        "savedId": entry["id"],
                        "updatedAt": entry.get("lastUsedAt") or entry.get("updatedAt"),
                        "lastTest": copy.deepcopy(entry.get("lastTest")),
                    }
                )
            return public_router_config()
    return public_router_config(current)


def test_router_credentials(host, user, password, ssh_port=22):
    config = {
        "host": normalize_router_host(host),
        "user": str(user or "").strip(),
        "password": str(password or ""),
        "sshPort": normalize_router_ssh_port(ssh_port),
    }
    if not config["user"]:
        raise ValueError("RouterOS username is required")
    if not config["password"].strip():
        raise ValueError("RouterOS password is required")

    started_at = time.time()
    test = {
        "ssh": {"ok": False, "identity": None, "error": None, "elapsedMs": None},
        "rest": {"ok": False, "status": None, "error": None, "elapsedMs": None},
    }

    ssh_started = time.time()
    client = None
    try:
        ssh = require_paramiko()
        client = ssh.SSHClient()
        client.set_missing_host_key_policy(ssh.AutoAddPolicy())
        client.connect(
            config["host"],
            port=config["sshPort"],
            username=config["user"],
            password=config["password"],
            timeout=SSH_TIMEOUT,
            banner_timeout=SSH_TIMEOUT,
            auth_timeout=SSH_TIMEOUT,
            allow_agent=False,
            look_for_keys=False,
        )
        stdin, stdout, stderr = client.exec_command(":put [/system/identity/get name]", timeout=SSH_TIMEOUT)
        stdout.channel.settimeout(SSH_TIMEOUT)
        stderr.channel.settimeout(SSH_TIMEOUT)
        identity = stdout.read().decode("utf-8", errors="replace").strip()
        error = stderr.read().decode("utf-8", errors="replace").strip()
        exit_status = stdout.channel.recv_exit_status()
        if exit_status != 0 or error:
            raise RuntimeError(error or f"SSH command exited with status {exit_status}")
        test["ssh"].update({"ok": True, "identity": identity or "RouterOS"})
    except Exception as exc:
        test["ssh"]["error"] = format_ssh_connect_error(config, exc, timeout=SSH_TIMEOUT)
    finally:
        test["ssh"]["elapsedMs"] = round((time.time() - ssh_started) * 1000)
        try:
            if client:
                client.close()
        except Exception:
            pass

    rest_started = time.time()
    session = requests.Session()
    session.auth = (config["user"], config["password"])
    try:
        response = session.get(f"http://{config['host']}/rest/system/resource", timeout=min(REST_TIMEOUT, 8))
        test["rest"]["status"] = response.status_code
        response.raise_for_status()
        test["rest"]["ok"] = True
    except Exception as exc:
        test["rest"]["error"] = str(exc)
    finally:
        test["rest"]["elapsedMs"] = round((time.time() - rest_started) * 1000)
        test["elapsedMs"] = round((time.time() - started_at) * 1000)
        session.close()

    return test


def router_login_warning(test):
    ssh_ok = (test or {}).get("ssh", {}).get("ok") is True
    rest_ok = (test or {}).get("rest", {}).get("ok") is True
    if rest_ok and not ssh_ok:
        return (
            "RouterOS REST verified, but SSH did not complete. "
            "The panel will enter read-only REST mode; SSH-only widgets may be degraded."
        )
    if ssh_ok and not rest_ok:
        return "SSH connected, but RouterOS REST did not respond. Some dashboard data may be missing."
    return None


def router_login_failure_message(test):
    test = test or {}
    ssh = test.get("ssh", {}) if isinstance(test.get("ssh"), dict) else {}
    rest = test.get("rest", {}) if isinstance(test.get("rest"), dict) else {}
    ssh_error = str(ssh.get("error") or "").strip()
    rest_error = str(rest.get("error") or "").strip()
    rest_status = rest.get("status")
    parts = []
    if rest_status == 401:
        parts.append("RouterOS REST login was rejected with HTTP 401 Unauthorized.")
    elif rest_error:
        parts.append(f"RouterOS REST check failed: {rest_error}")
    if ssh_error:
        parts.append(f"SSH check failed: {ssh_error}")
    return " ".join(parts).strip() or "RouterOS login failed"


def ip_sort_key(address):
    try:
        return ipaddress.ip_address(address)
    except Exception:
        return ipaddress.ip_address("0.0.0.0")


def rate_level(value):
    if value >= 0.85:
        return "danger"
    if value >= 0.65:
        return "warning"
    return "ok"


def normalize_panel_profile(value):
    text = re.sub(r"[^a-z0-9]+", "_", str(value or "").strip().lower()).strip("_")
    return text


PANEL_PROFILE_ALIASES = {
    "public": "routeros_only",
    "routeros_public": "routeros_only",
    "routeros_only": "routeros_only",
    "public_routeros": "routeros_only",
    "routeros_public_preview": "routeros_only",
    "private": "private_ops",
    "private_ops": "private_ops",
}


def resolve_panel_profile(value):
    normalized = normalize_panel_profile(value)
    canonical = PANEL_PROFILE_ALIASES.get(normalized)
    if not canonical:
        allowed = ", ".join(sorted(PANEL_PROFILE_ALIASES))
        raise ValueError(f"Unknown ROS_PANEL_PROFILE {value!r}; allowed values: {allowed}")
    return canonical


PANEL_PROFILE = resolve_panel_profile(PANEL_PROFILE_RAW)


def is_public_routeros_profile(profile=None):
    normalized = normalize_panel_profile(profile if profile is not None else PANEL_PROFILE)
    return PANEL_PROFILE_ALIASES.get(normalized, normalized) == "routeros_only"


PUBLIC_ROUTEROS_PROFILE = is_public_routeros_profile(PANEL_PROFILE)
READONLY_DIAGNOSTICS_ENABLED = not PUBLIC_ROUTEROS_PROFILE

# Public RouterOS-only profile is intended for localhost-only public trials.
# Keep any mutating endpoints opt-in (and default-off) for that profile.
IP_ALIAS_WRITE_ENABLED = env_bool("ROS_PANEL_IP_ALIAS_WRITE_ENABLED", default=not PUBLIC_ROUTEROS_PROFILE)

# Active admin sessions can be sensitive; default-off for public profile.
EXPOSE_ADMIN_SESSIONS = env_bool("ROS_PANEL_EXPOSE_ADMIN_SESSIONS", default=not PUBLIC_ROUTEROS_PROFILE)


def line_layout_tier(count):
    count = max(0, to_int(count))
    if count <= 0:
        return "none"
    if count == 1:
        return "single"
    if count <= 3:
        return "few"
    if count <= 6:
        return "multi"
    return "dense"


def scale_bucket(count):
    count = max(0, to_int(count))
    if count <= 0:
        return "none"
    if count == 1:
        return "single"
    if count <= 6:
        return "small"
    if count <= 24:
        return "medium"
    if count <= 100:
        return "large"
    return "fleet"


def list_scale_meta(total_count, shown_count=None, limit=None, sampled=False, sample_method="", sorted_by="", grouped_by=None):
    total = max(0, to_int(total_count))
    shown = total if shown_count is None else max(0, to_int(shown_count))
    effective_limit = limit if limit is not None else shown
    return {
        "actualCount": total,
        "totalCount": total,
        "shownCount": shown,
        "limit": max(0, to_int(effective_limit)),
        "hasMore": shown < total,
        "sampled": bool(sampled),
        "sampleMethod": sample_method,
        "sortedBy": sorted_by,
        "groupedBy": list(grouped_by or []),
        "bucket": scale_bucket(total),
    }


def build_panel_capabilities(wan_lines, pppoe_count):
    wan_count = len(wan_lines or [])
    ssh_status = ssh_capability_status()
    return {
        "routerosWrite": False,
        "localAliasWrite": IP_ALIAS_WRITE_ENABLED,
        "diagnosticProbing": READONLY_DIAGNOSTICS_ENABLED,
        "externalAccess": "localhost-only" if PUBLIC_ROUTEROS_PROFILE else "configured",
        "readonlyDiagnostics": READONLY_DIAGNOSTICS_ENABLED,
        "privateDiagnostics": READONLY_DIAGNOSTICS_ENABLED,
        "openwrtDiagnostics": READONLY_DIAGNOSTICS_ENABLED,
        "nikkiDiagnostics": READONLY_DIAGNOSTICS_ENABLED,
        "statusFindings": True,
        "healthFindings": True,
        "publicRouterosProfile": PUBLIC_ROUTEROS_PROFILE,
        "ipAliasWrite": IP_ALIAS_WRITE_ENABLED,
        "adminSessions": EXPOSE_ADMIN_SESSIONS,
        "wanFallback": wan_count > 0 and to_int(pppoe_count) == 0,
        "singleWan": wan_count == 1,
        "multiWan": wan_count > 1,
        "restRead": True,
        "sshRead": ssh_status["available"],
        "sshState": ssh_status["state"],
        "sshLabel": ssh_status["label"],
        "sshTransport": ssh_status["transport"],
        "restTrusted": ssh_status["restTrusted"],
        "degradedModules": ssh_status["degradedModules"],
        "sshMessage": ssh_status["message"],
    }


ACTION_SEVERITY_RANK = {"critical": 0, "warning": 1, "info": 2}


def as_list(value):
    return value if isinstance(value, list) else []


def as_dict(value):
    return value if isinstance(value, dict) else {}


def compact_text(value, limit=180):
    text = str(value or "").strip()
    if len(text) <= limit:
        return text
    return text[: max(0, limit - 3)] + "..."


def collector_status_message(status, error=None):
    error_text = compact_text(error, 240)
    if error_text:
        return error_text
    normalized = str(status or "").strip().lower()
    if normalized == "ok":
        return "采集正常。"
    if normalized == "starting":
        return "采集服务正在启动，正在等待首次 RouterOS 数据。"
    if normalized == "needs_config":
        return "RouterOS SSH 连接未配置，请在登录页填写 RouterOS 主机、账号和密码。"
    if normalized == "error":
        return "采集服务返回异常，但没有提供错误详情；请刷新页面或重新测试 RouterOS 连接。"
    status_label = normalized or "unknown"
    return f"采集状态为 {status_label}，但未提供错误详情；请刷新页面或重新测试 RouterOS 连接。"


def normalize_collector_snapshot_status(snapshot):
    if not isinstance(snapshot, dict):
        return snapshot
    status = str(snapshot.get("status") or "unknown").strip() or "unknown"
    message = collector_status_message(status, snapshot.get("error"))
    snapshot["status"] = status
    snapshot["statusMessage"] = message
    meta = snapshot.setdefault("meta", {})
    if isinstance(meta, dict):
        meta["collectorStatus"] = status
        meta["collectorStatusMessage"] = message
    return snapshot


def build_health_findings(snapshot):
    snapshot = as_dict(snapshot)
    meta = as_dict(snapshot.get("meta"))
    overview = as_dict(snapshot.get("overview"))
    connections = as_dict(snapshot.get("connections"))
    dns = as_dict(snapshot.get("dns"))
    routes = as_dict(snapshot.get("routes"))
    load_balance = as_dict(snapshot.get("loadBalance"))
    arp = as_dict(snapshot.get("arp"))
    dhcp = as_dict(snapshot.get("dhcp"))
    security = as_dict(snapshot.get("security"))
    actions = []
    seen_ids = set()

    def add_action(action_id, severity, domain, title, summary, next_step, source, evidence=None):
        if action_id in seen_ids:
            return
        seen_ids.add(action_id)
        actions.append(
            {
                "id": action_id,
                "severity": severity,
                "domain": domain,
                "title": title,
                "summary": compact_text(summary, 240),
                "source": source,
                "readOnly": True,
                "priority": len(actions) + 1,
                "evidence": evidence or [],
            }
        )

    snapshot_status = snapshot.get("status")
    if snapshot_status and snapshot_status != "ok":
        status_message = collector_status_message(snapshot_status, snapshot.get("error"))
        add_action(
            "collector.snapshot_status",
            "warning" if snapshot_status == "starting" else "critical",
            "collector",
            "Snapshot collection is not healthy",
            status_message,
            "Confirm collection state before trusting dependent widgets.",
            "snapshot.status",
            [
                {"label": "status", "value": snapshot_status},
                {"label": "message", "value": status_message},
                {"label": "error", "value": compact_text(snapshot.get("error"))},
            ],
        )

    collection_sources = [
        ("meta.realtimeError", meta.get("realtimeError"), meta.get("realtimeLastErrorAt"), "critical", "Realtime REST collection has errors"),
        ("meta.slowRestError", meta.get("slowRestError"), meta.get("slowRestLastErrorAt"), "warning", "Slow REST collection has errors"),
        ("meta.staticError", meta.get("staticError"), meta.get("staticLastErrorAt"), "warning", "Static REST collection has errors"),
        ("connections.protocolError", connections.get("protocolError"), connections.get("protocolLastErrorAt"), "warning", "Connection protocol summary has errors"),
        ("connections.detailError", connections.get("detailError"), connections.get("detailLastErrorAt"), "warning", "Connection detail collection has errors"),
    ]
    for source, error, last_error_at, severity, title in collection_sources:
        if error:
            add_action(
                source.replace(".", "_").lower(),
                severity,
                "collector",
                title,
                compact_text(error),
                "Verify the read-only collection path and credentials before trusting dependent widgets.",
                source,
                [{"label": "lastErrorAt", "value": last_error_at or "-"}, {"label": "error", "value": compact_text(error)}],
            )

    endpoint_failure_sources = [
        ("meta.realtimeEndpointFailures", "Realtime REST endpoint failures"),
        ("meta.slowRestEndpointFailures", "Slow REST endpoint failures"),
        ("meta.staticEndpointFailures", "Static REST endpoint failures"),
        ("meta.detailEndpointFailures", "Detail REST endpoint failures"),
    ]
    for source, title in endpoint_failure_sources:
        failures = as_dict(meta.get(source.split(".")[-1]))
        if failures:
            failed_names = sorted(str(name) for name in failures.keys())
            add_action(
                source.replace(".", "_").lower(),
                "warning",
                "collector",
                title,
                f"{len(failed_names)} endpoint(s) reported collection failures.",
                "Open the collector logs or endpoint failure details; keep remediation manual.",
                source,
                [{"label": "count", "value": len(failed_names)}, {"label": "sample", "value": ", ".join(failed_names[:5])}],
            )

    wan_lines = as_list(snapshot.get("wan")) or as_list(snapshot.get("pppoe"))
    running_wan = [row for row in wan_lines if as_dict(row).get("running")]
    offline_wan = [as_dict(row) for row in wan_lines if not as_dict(row).get("running")]
    if wan_lines and not running_wan:
        add_action(
            "wan.no_running_lines",
            "critical",
            "wan",
            "No WAN line is running",
            "All known WAN lines are currently reported offline.",
            "Confirm upstream link state and routing from the read-only WAN and route views.",
            "snapshot.wan",
            [{"label": "wanCount", "value": len(wan_lines)}],
        )
    elif offline_wan:
        add_action(
            "wan.offline_lines",
            "warning",
            "wan",
            "Some WAN lines are offline",
            f"{len(offline_wan)} of {len(wan_lines)} WAN line(s) are not running.",
            "Review the affected line inventory and upstream access before changing policy.",
            "snapshot.wan",
            [{"label": "offline", "value": ", ".join(compact_text(row.get("name") or row.get("lineId") or "-") for row in offline_wan[:5])}],
        )

    default_routes = as_list(routes.get("defaultRoutes"))
    active_defaults = [row for row in default_routes if as_dict(row).get("active") and not as_dict(row).get("disabled")]
    if default_routes and not active_defaults:
        add_action(
            "routes.no_active_default",
            "critical",
            "routes",
            "No active default route",
            "Default routes exist, but none are active and enabled.",
            "Use the route inventory to identify inactive gateways; do not auto-edit routes from this panel.",
            "snapshot.routes.defaultRoutes",
            [{"label": "defaultRoutes", "value": len(default_routes)}],
        )
    elif wan_lines and not default_routes:
        add_action(
            "routes.no_default_visible",
            "warning",
            "routes",
            "No default route is visible",
            "WAN lines are present but the snapshot does not include a default route.",
            "Check route collection freshness and the RouterOS route table manually.",
            "snapshot.routes.defaultRoutes",
            [{"label": "wanCount", "value": len(wan_lines)}],
        )

    distribution = [as_dict(row) for row in as_list(load_balance.get("distribution"))]
    if len(distribution) > 1 and any(to_int(row.get("share")) >= 70 for row in distribution):
        dominant = max(distribution, key=lambda row: to_int(row.get("share")))
        add_action(
            "wan.traffic_skew",
            "info",
            "wan",
            "WAN traffic distribution is skewed",
            f"{dominant.get('name', '-')} is carrying about {dominant.get('share', 0)}% of observed WAN traffic.",
            "Treat this as an observation unless it persists under representative traffic.",
            "snapshot.loadBalance.distribution",
            [{"label": "line", "value": dominant.get("name", "-")}, {"label": "share", "value": dominant.get("share", 0)}],
        )

    if dns and not dns.get("running"):
        add_action(
            "dns.remote_requests_disabled",
            "warning",
            "dns",
            "RouterOS DNS remote requests are disabled",
            "The RouterOS DNS service is not accepting remote requests according to the snapshot.",
            "Confirm whether this is intentional for the current topology before changing DNS settings.",
            "snapshot.dns.running",
            [{"label": "running", "value": dns.get("running")}],
        )
    if dns and not as_list(dns.get("servers")):
        add_action(
            "dns.no_servers",
            "warning",
            "dns",
            "No upstream DNS servers are visible",
            "The DNS snapshot does not list upstream servers.",
            "Verify DNS configuration through the normal RouterOS console if clients report resolution failures.",
            "snapshot.dns.servers",
            [],
        )
    cache_size = to_int(dns.get("cacheSize"))
    cache_used = to_int(dns.get("cacheUsed"))
    if cache_size and cache_used:
        cache_usage = (cache_used / cache_size) * 100
        if cache_usage >= 90:
            add_action(
                "dns.cache_pressure",
                "warning",
                "dns",
                "DNS cache usage is high",
                f"DNS cache usage is about {round(cache_usage, 1)}%.",
                "Observe whether resolution latency or cache evictions correlate before tuning cache size.",
                "snapshot.dns.cacheUsed",
                [{"label": "cacheUsed", "value": cache_used}, {"label": "cacheSize", "value": cache_size}],
            )

    ipv6_dhcp_unbound = [
        row for row in as_list(dns.get("ipv6DhcpClients"))
        if str(as_dict(row).get("status", "")).lower() not in {"bound", "running"}
    ]
    if ipv6_dhcp_unbound:
        add_action(
            "ipv6.dhcp_clients_unbound",
            "warning",
            "ipv6",
            "Some DHCPv6 clients are not bound",
            f"{len(ipv6_dhcp_unbound)} DHCPv6 client(s) are not bound.",
            "Review IPv6 prefix delegation and upstream state from the IPv6 diagnostics view.",
            "snapshot.dns.ipv6DhcpClients",
            [{"label": "interfaces", "value": ", ".join(str(as_dict(row).get("interface", "-")) for row in ipv6_dhcp_unbound[:5])}],
        )

    high_pools = []
    for pool in as_list(dhcp.get("pools")):
        pool = as_dict(pool)
        usage = float(pool.get("usage") or 0)
        if usage >= 85:
            high_pools.append(pool)
    if high_pools:
        max_usage = max(float(pool.get("usage") or 0) for pool in high_pools)
        add_action(
            "dhcp.pool_pressure",
            "critical" if max_usage >= 95 else "warning",
            "dhcp",
            "DHCP pool capacity is tight",
            f"{len(high_pools)} DHCP pool(s) are at or above 85% usage.",
            "Review lease inventory and pool sizing manually before making address-plan changes.",
            "snapshot.dhcp.pools",
            [{"label": "pools", "value": ", ".join(str(pool.get("name", "-")) for pool in high_pools[:5])}],
        )

    arp_alerts = as_list(arp.get("alerts"))
    if arp_alerts:
        severity_counts = defaultdict(int)
        confidence_counts = defaultdict(int)
        for alert in arp_alerts:
            alert = as_dict(alert)
            severity_counts[alert.get("severity") or "critical"] += 1
            confidence_counts[alert.get("confidence") or "unknown"] += 1
        top_severity = min(
            (str(as_dict(alert).get("severity") or "critical") for alert in arp_alerts),
            key=lambda value: ACTION_SEVERITY_RANK.get(value, 3),
        )
        critical_count = severity_counts.get("critical", 0)
        warning_count = severity_counts.get("warning", 0)
        info_count = severity_counts.get("info", 0)
        if critical_count:
            title = "Active ARP identity conflict evidence detected"
            next_step = "Investigate active duplicate-IP evidence first; confirm with switch/AP and terminal evidence before changing address plans."
        else:
            title = "ARP identity movement needs review"
            next_step = "Treat stale or failed ARP movement as lower-confidence history; look for fresh duplicate-IP evidence before declaring an active conflict."
        add_action(
            "arp.identity_conflicts",
            top_severity,
            "terminals",
            title,
            (
                f"{len(arp_alerts)} ARP alert(s): critical={critical_count}, "
                f"warning={warning_count}, info={info_count}."
            ),
            next_step,
            "snapshot.arp.alerts",
            [
                {"label": "sample", "value": compact_text(as_dict(arp_alerts[0]).get("detail") or as_dict(arp_alerts[0]).get("value"))},
                {"label": "sampleSeverity", "value": as_dict(arp_alerts[0]).get("severity", "-")},
                {"label": "sampleConfidence", "value": as_dict(arp_alerts[0]).get("confidence", "-")},
                {"label": "confidenceSummary", "value": ", ".join(f"{key}:{confidence_counts[key]}" for key in sorted(confidence_counts))},
            ],
        )

    interface_issues = []
    for row in as_list(snapshot.get("interfaces")):
        row = as_dict(row)
        drop_total = to_int(row.get("dropTotal"), to_int(row.get("rxDrop")) + to_int(row.get("txDrop")))
        error_total = to_int(row.get("errorTotal"), to_int(row.get("rxError")) + to_int(row.get("txError")))
        drop_delta = to_int(row.get("dropDelta"))
        error_delta = to_int(row.get("errorDelta"))
        packet_delta = to_int(row.get("packetDelta"))
        try:
            loss_rate = float(row.get("lossRate")) if row.get("lossRate") is not None else None
        except Exception:
            loss_rate = None
        issue_total = drop_total + error_total
        recent_total = drop_delta + error_delta
        if issue_total > 0 or recent_total > 0:
            is_derived = bool(row.get("isDerivedInterface") or row.get("qualityEvidenceLevel") == "logical")
            weighted_recent = recent_total * (0.35 if is_derived else 1.0)
            weighted_total = issue_total * (0.35 if is_derived else 1.0)
            interface_issues.append(
                {
                    "row": row,
                    "issueTotal": issue_total,
                    "dropTotal": drop_total,
                    "errorTotal": error_total,
                    "recentTotal": recent_total,
                    "dropDelta": drop_delta,
                    "errorDelta": error_delta,
                    "packetDelta": packet_delta,
                    "lossRate": loss_rate,
                    "isDerived": is_derived,
                    "sortKey": (weighted_recent, loss_rate if loss_rate is not None else -1, weighted_total),
                }
            )
    if interface_issues:
        interface_issues.sort(key=lambda item: item["sortKey"], reverse=True)
        top_issue = interface_issues[0]
        primary_count = sum(1 for item in interface_issues if not item["isDerived"])
        logical_count = len(interface_issues) - primary_count
        if top_issue["lossRate"] is None:
            loss_text = "unknown"
        else:
            loss_value_text = f"{top_issue['lossRate'] * 100:.4f}".rstrip("0").rstrip(".")
            loss_text = f"{loss_value_text}%"
        add_action(
            "interfaces.error_counters",
            "warning",
            "interfaces",
            "Interface drop/error evidence needs review",
            (
                f"{primary_count} primary interface(s) and {logical_count} logical/down-ranked interface(s) "
                f"have drop/error evidence. Top {top_issue['row'].get('name', '-')}: "
                f"cumulative drop/error={top_issue['dropTotal']}/{top_issue['errorTotal']}, "
                f"latest +{top_issue['dropDelta']}/+{top_issue['errorDelta']}, "
                f"recent loss rate={loss_text}."
            ),
            "Review recent delta and loss-rate evidence first; treat VLAN/macvlan logical pairs as lower-confidence evidence unless their parent also shows fresh deltas.",
            "snapshot.interfaces",
            [
                {"label": "topInterface", "value": top_issue["row"].get("name", "-")},
                {"label": "cumulativeDropError", "value": f"{top_issue['dropTotal']}/{top_issue['errorTotal']}"},
                {"label": "latestDropErrorDelta", "value": f"+{top_issue['dropDelta']}/+{top_issue['errorDelta']}"},
                {"label": "recentLossRate", "value": loss_text},
                {"label": "logicalDownranked", "value": logical_count},
            ],
        )

    cpu_load = to_int(overview.get("cpuLoad"))
    memory_usage = float(overview.get("memoryUsage") or 0)
    disk_usage = float(overview.get("diskUsage") or 0)
    resource_pressure = []
    if cpu_load >= 90:
        resource_pressure.append(("cpu", "critical", cpu_load))
    elif cpu_load >= 75:
        resource_pressure.append(("cpu", "warning", cpu_load))
    if memory_usage >= 90:
        resource_pressure.append(("memory", "critical", round(memory_usage, 1)))
    elif memory_usage >= 80:
        resource_pressure.append(("memory", "warning", round(memory_usage, 1)))
    if disk_usage >= 90:
        resource_pressure.append(("disk", "critical", round(disk_usage, 1)))
    elif disk_usage >= 80:
        resource_pressure.append(("disk", "warning", round(disk_usage, 1)))
    if resource_pressure:
        severity = "critical" if any(item[1] == "critical" for item in resource_pressure) else "warning"
        add_action(
            "system.resource_pressure",
            severity,
            "system",
            "Router resource pressure is elevated",
            ", ".join(f"{name}={value}%" for name, _, value in resource_pressure),
            "Correlate with traffic and logs before scheduling maintenance or tuning.",
            "snapshot.overview",
            [{"label": name, "value": value} for name, _, value in resource_pressure],
        )

    threshold_level = connections.get("thresholdLevel")
    if threshold_level in {"danger", "warning"}:
        add_action(
            "connections.tracking_pressure",
            "critical" if threshold_level == "danger" else "warning",
            "connections",
            "Connection tracking pressure is elevated",
            f"Connection total is {connections.get('total', 0)} with threshold level {threshold_level}.",
            "Use top IP and active connection views to identify heavy clients before changing limits.",
            "snapshot.connections",
            [{"label": "total", "value": connections.get("total", 0)}, {"label": "tcp", "value": connections.get("tcp")}],
        )

    top_terminal = next((as_dict(row) for row in as_list(snapshot.get("terminals")) if to_int(as_dict(row).get("connections")) >= 1000), None)
    if top_terminal:
        add_action(
            "terminals.high_connection_client",
            "info",
            "terminals",
            "A terminal has a high connection count",
            f"{top_terminal.get('displayName') or top_terminal.get('hostname') or top_terminal.get('ip')} has {top_terminal.get('connections')} tracked connection(s).",
            "Review whether this is expected workload, download software, P2P, or a noisy client.",
            "snapshot.terminals",
            [{"label": "ip", "value": top_terminal.get("ip", "-")}, {"label": "connections", "value": top_terminal.get("connections", 0)}],
        )

    security_alerts = as_list(security.get("alerts"))
    if security_alerts:
        add_action(
            "security.log_alerts",
            "warning" if len(security_alerts) >= 10 else "info",
            "security",
            "Security-related log alerts are present",
            f"{len(security_alerts)} firewall/warning/error log item(s) are visible.",
            "Review log context and rule hit counters as read-only evidence.",
            "snapshot.security.alerts",
            [{"label": "sample", "value": compact_text(as_dict(security_alerts[0]).get("message"))}],
        )

    actions.sort(key=lambda row: (ACTION_SEVERITY_RANK.get(row["severity"], 99), row["priority"]))
    actions = actions[:STATUS_FINDINGS_LIMIT]
    for index, action in enumerate(actions, start=1):
        action["priority"] = index
    counts = {severity: 0 for severity in ACTION_SEVERITY_RANK}
    for action in actions:
        counts[action["severity"]] = counts.get(action["severity"], 0) + 1
    status = "critical" if counts.get("critical") else "warning" if counts.get("warning") else "ok"
    return {
        "status": status,
        "readOnly": True,
        "generatedAt": format_iso_now(),
        "sourceUpdatedAt": snapshot.get("updatedAt"),
        "sourceStatus": snapshot.get("status"),
        "limit": STATUS_FINDINGS_LIMIT,
        "counts": counts,
        "topFinding": actions[0] if actions else None,
        "findings": actions,
        "guardrails": {
            "routerosWrites": False,
            "usesCachedSnapshot": True,
            "mutatingEndpoints": False,
        },
    }


def address_is_globalish(address_text):
    try:
        text = str(address_text or "").strip()
        if not text:
            return False
        ip_obj = ipaddress.ip_interface(text).ip if "/" in text else ipaddress.ip_address(text)
        if ip_obj.version == 4:
            if (
                ip_obj.is_private
                or ip_obj in CGNAT_NETWORK
                or ip_obj.is_loopback
                or ip_obj.is_link_local
                or ip_obj.is_multicast
                or ip_obj.is_unspecified
                or ip_obj.is_reserved
            ):
                return False
            return True
        if (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_multicast
            or ip_obj.is_unspecified
            or ip_obj.is_reserved
        ):
            return False
        return True
    except Exception:
        return False


def infer_wan_interface_names(rest, addresses_by_interface):
    interface_types = {row.get("name"): str(row.get("type", "")).lower() for row in rest.get("interfaces", [])}
    wan_names = {row.get("name") for row in rest.get("pppoe", []) if row.get("name")}
    wan_names.update(
        item.get("interface")
        for item in rest.get("dhcp_clients", [])
        if item.get("interface") and not to_bool(item.get("disabled"))
    )
    defaults = [
        row for row in rest.get("routes", [])
        if row.get("dst-address") == "0.0.0.0/0" and not to_bool(row.get("disabled"))
    ]
    for route in defaults:
        gateway = str(route.get("gateway") or "").strip()
        if not gateway:
            continue
        gateway_name = gateway.split("%", 1)[1] if "%" in gateway else gateway
        if gateway_name in interface_types:
            wan_names.add(gateway_name)
    for iface_name, address_rows in addresses_by_interface.items():
        if not iface_name or iface_name in wan_names:
            continue
        iface_type = interface_types.get(iface_name, "")
        low_name = str(iface_name).lower()
        if iface_type in {"bridge", "loopback", "wireguard"}:
            continue
        if low_name.startswith(("bridge", "docker", "veth", "lo", "tailscale", "zerotier")):
            continue
        if any(address_is_globalish(item.get("address")) for item in address_rows):
            wan_names.add(iface_name)
    return {name for name in wan_names if name}


def build_distribution_from_lines(lines):
    rows = list(lines or [])
    total_rate = sum(max(0, to_int(row.get("upRate"))) + max(0, to_int(row.get("downRate"))) for row in rows)
    distribution = []
    for row in rows:
        up_rate = row.get("upRate")
        down_rate = row.get("downRate")
        numeric_total = to_int(up_rate) + to_int(down_rate)
        distribution.append(
            {
                "name": row.get("name", "-"),
                "share": round(((numeric_total / total_rate) * 100), 2) if total_rate else 0,
                "upRate": up_rate,
                "downRate": down_rate,
                "status": row.get("status", "-"),
            }
        )
    return distribution


def count_pool_addresses(ranges):
    total = 0
    for raw_part in str(ranges or "").split(","):
        part = raw_part.strip()
        if not part:
            continue
        try:
            if "-" in part:
                start_text, end_text = [item.strip() for item in part.split("-", 1)]
                start_ip = ipaddress.ip_address(start_text)
                end_ip = ipaddress.ip_address(end_text)
                if start_ip.version != end_ip.version:
                    continue
                start_int = int(start_ip)
                end_int = int(end_ip)
                if end_int >= start_int:
                    total += end_int - start_int + 1
            else:
                ipaddress.ip_address(part)
                total += 1
        except Exception:
            continue
    return total


def normalize_ip_key(value):
    text = str(value or "").strip()
    if not text or text == "-":
        return ""
    if text.startswith("[") and text.endswith("]"):
        text = text[1:-1].strip()
    if "/" in text:
        text = text.split("/", 1)[0].strip()
    try:
        return str(ipaddress.ip_address(text))
    except Exception:
        return text


def normalize_custom_name(value):
    text = re.sub(r"\s+", " ", str(value or "").strip())
    if not text:
        return ""
    return text[:CUSTOM_NAME_MAX_LENGTH]


def is_fake_ip(value):
    try:
        address = ipaddress.ip_address(str(value or "").strip())
        return address.version == 4 and address in ipaddress.ip_network("198.18.0.0/15")
    except Exception:
        return False


def dns_encode_name(domain):
    parts = [part for part in str(domain or "").strip(".").split(".") if part]
    return b"".join(bytes([len(part.encode("idna"))]) + part.encode("idna") for part in parts) + b"\x00"


def dns_read_name(payload, offset, depth=0):
    if depth > 8:
        raise ValueError("DNS name compression loop")
    labels = []
    jumped = False
    next_offset = offset
    while True:
        if offset >= len(payload):
            raise ValueError("DNS name outside packet")
        length = payload[offset]
        if length == 0:
            offset += 1
            if not jumped:
                next_offset = offset
            break
        if length & 0xC0 == 0xC0:
            if offset + 1 >= len(payload):
                raise ValueError("DNS pointer outside packet")
            pointer = ((length & 0x3F) << 8) | payload[offset + 1]
            if not jumped:
                next_offset = offset + 2
            offset = pointer
            jumped = True
            depth += 1
            if depth > 8:
                raise ValueError("DNS pointer loop")
            continue
        offset += 1
        label = payload[offset : offset + length]
        try:
            labels.append(label.decode("idna"))
        except Exception:
            labels.append(label.decode("ascii", errors="replace"))
        offset += length
        if not jumped:
            next_offset = offset
    return ".".join(labels), next_offset


def dns_query(server, domain, qtype):
    qtype_name = "AAAA" if qtype == 28 else "A"
    started_at = time.time()
    transaction_id = os.urandom(2)
    question = dns_encode_name(domain) + qtype.to_bytes(2, "big") + (1).to_bytes(2, "big")
    packet = (
        transaction_id
        + b"\x01\x00"
        + (1).to_bytes(2, "big")
        + (0).to_bytes(2, "big")
        + (0).to_bytes(2, "big")
        + (0).to_bytes(2, "big")
        + question
    )
    result = {
        "server": server,
        "domain": domain,
        "type": qtype_name,
        "answers": [],
        "fakeIp": False,
        "rcode": None,
        "elapsedMs": None,
        "error": None,
    }
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(READONLY_DIAGNOSTIC_DNS_TIMEOUT)
    try:
        sock.sendto(packet, (server, 53))
        response, _ = sock.recvfrom(4096)
        elapsed_ms = round((time.time() - started_at) * 1000)
        result["elapsedMs"] = elapsed_ms
        if len(response) < 12 or response[:2] != transaction_id:
            raise ValueError("invalid DNS response")
        flags = int.from_bytes(response[2:4], "big")
        result["rcode"] = flags & 0x0F
        qdcount = int.from_bytes(response[4:6], "big")
        ancount = int.from_bytes(response[6:8], "big")
        offset = 12
        for _ in range(qdcount):
            _, offset = dns_read_name(response, offset)
            offset += 4
        answers = []
        for _ in range(ancount):
            _, offset = dns_read_name(response, offset)
            if offset + 10 > len(response):
                raise ValueError("truncated DNS answer")
            answer_type = int.from_bytes(response[offset : offset + 2], "big")
            answer_class = int.from_bytes(response[offset + 2 : offset + 4], "big")
            offset += 8
            rdlength = int.from_bytes(response[offset : offset + 2], "big")
            offset += 2
            rdata = response[offset : offset + rdlength]
            offset += rdlength
            if answer_class != 1:
                continue
            if answer_type == 1 and len(rdata) == 4:
                answers.append(socket.inet_ntop(socket.AF_INET, rdata))
            elif answer_type == 28 and len(rdata) == 16:
                answers.append(socket.inet_ntop(socket.AF_INET6, rdata))
        result["answers"] = answers
        result["fakeIp"] = any(is_fake_ip(item) for item in answers)
    except Exception as exc:
        result["elapsedMs"] = round((time.time() - started_at) * 1000)
        result["error"] = str(exc)
    finally:
        sock.close()
    return result


def system_dns_query(domain, qtype):
    qtype_name = "AAAA" if qtype == 28 else "A"
    family = socket.AF_INET6 if qtype == 28 else socket.AF_INET
    started_at = time.time()
    result = {
        "server": "system",
        "domain": domain,
        "type": qtype_name,
        "answers": [],
        "fakeIp": False,
        "rcode": None,
        "elapsedMs": None,
        "error": None,
    }
    try:
        infos = socket.getaddrinfo(str(domain), None, family, socket.SOCK_STREAM)
        answers = []
        for info in infos:
            address = info[4][0]
            if address not in answers:
                answers.append(address)
        result["answers"] = answers
        result["fakeIp"] = any(is_fake_ip(item) for item in answers)
        result["rcode"] = 0
    except Exception as exc:
        result["error"] = str(exc)
    result["elapsedMs"] = round((time.time() - started_at) * 1000)
    return result


def http_probe(target):
    started_at = time.time()
    result = {
        "name": target.get("name", "-"),
        "url": target.get("url", "-"),
        "expected": target.get("expected", "-"),
        "status": None,
        "ok": False,
        "elapsedMs": None,
        "finalHost": None,
        "error": None,
    }
    try:
        response = requests.get(
            target["url"],
            timeout=READONLY_DIAGNOSTIC_HTTP_TIMEOUT,
            allow_redirects=True,
            stream=True,
            headers={"User-Agent": "RouterOSTriagePanel-Readonly-Diagnostics/1.0"},
        )
        result["status"] = response.status_code
        result["ok"] = response.status_code < 500
        result["finalHost"] = urlparse(response.url).netloc
        response.close()
    except Exception as exc:
        result["error"] = str(exc)
    result["elapsedMs"] = round((time.time() - started_at) * 1000)
    return result


def tcp_probe(target):
    started_at = time.time()
    parsed = urlparse(target.get("url", ""))
    host = parsed.hostname or target.get("host") or target.get("name", "")
    port = int(target.get("port") or (parsed.port or 443))
    result = {
        "name": target.get("name", "-"),
        "host": host,
        "port": port,
        "expected": target.get("expected", "-"),
        "ok": False,
        "elapsedMs": None,
        "error": None,
    }
    try:
        with socket.create_connection((host, port), timeout=READONLY_DIAGNOSTIC_HTTP_TIMEOUT):
            result["ok"] = True
    except Exception as exc:
        result["error"] = str(exc)
    result["elapsedMs"] = round((time.time() - started_at) * 1000)
    return result


def exit_probe(target):
    started_at = time.time()
    result = {
        "name": target.get("name", "-"),
        "url": target.get("url", "-"),
        "ip": None,
        "raw": "",
        "elapsedMs": None,
        "error": None,
    }
    try:
        response = requests.get(
            target["url"],
            timeout=READONLY_DIAGNOSTIC_HTTP_TIMEOUT,
            headers={"User-Agent": "RouterOSTriagePanel-Readonly-Diagnostics/1.0"},
        )
        text = response.text.strip()
        result["raw"] = text[:500]
        if target.get("type") == "json_ip":
            payload = response.json()
            result["ip"] = payload.get("ip")
        elif target.get("type") == "cloudflare_trace":
            for line in text.splitlines():
                if line.startswith("ip="):
                    result["ip"] = line.split("=", 1)[1].strip()
                    break
        else:
            result["ip"] = text.split()[0] if text else None
    except Exception as exc:
        result["error"] = str(exc)
    result["elapsedMs"] = round((time.time() - started_at) * 1000)
    return result


def file_mtime_summary(path):
    try:
        stat = Path(path).stat()
        return {
            "path": str(Path(path)),
            "exists": True,
            "mtime": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(stat.st_mtime)),
            "size": stat.st_size,
        }
    except Exception as exc:
        return {
            "path": str(Path(path)),
            "exists": False,
            "mtime": None,
            "size": 0,
            "error": str(exc),
        }


def nikki_probe():
    result = {
        "controller": READONLY_NIKKI_CONTROLLER,
        "ok": False,
        "disabled": False,
        "version": None,
        "providers": [],
        "providerCount": 0,
        "ruleCount": 0,
        "error": None,
    }
    if not READONLY_NIKKI_CONTROLLER:
        result["disabled"] = True
        result["error"] = "Nikki controller is not configured"
        return result
    try:
        version_response = requests.get(
            f"{READONLY_NIKKI_CONTROLLER.rstrip('/')}/version",
            timeout=READONLY_DIAGNOSTIC_HTTP_TIMEOUT,
        )
        if version_response.status_code < 500:
            result["ok"] = version_response.ok
            try:
                version_payload = version_response.json()
                result["version"] = version_payload.get("version") or version_payload.get("meta")
            except Exception:
                result["version"] = version_response.text.strip()[:80]
        providers_response = requests.get(
            f"{READONLY_NIKKI_CONTROLLER.rstrip('/')}/providers/rules",
            timeout=READONLY_DIAGNOSTIC_HTTP_TIMEOUT,
        )
        if providers_response.ok:
            payload = providers_response.json()
            providers = payload.get("providers") if isinstance(payload, dict) else {}
            if isinstance(providers, dict):
                rows = []
                for name, provider in providers.items():
                    rules = provider.get("ruleCount") or provider.get("rule-count") or len(provider.get("rules") or [])
                    rows.append(
                        {
                            "name": name,
                            "type": provider.get("type", "-"),
                            "vehicleType": provider.get("vehicleType") or provider.get("vehicle-type") or "-",
                            "ruleCount": to_int(rules),
                            "updatedAt": provider.get("updatedAt") or provider.get("updated-at") or "-",
                        }
                    )
                rows.sort(key=lambda row: row["ruleCount"], reverse=True)
                result["providers"] = rows[:40]
                result["providerCount"] = len(rows)
                result["ruleCount"] = sum(row["ruleCount"] for row in rows)
                result["ok"] = True
    except Exception as exc:
        result["error"] = str(exc)
    return result


class Collector:
    def __init__(self):
        router_status = public_router_config()
        self.state = {
            "status": "starting" if router_status["configured"] else "needs_config",
            "updatedAt": None,
            "error": None if router_status["configured"] else "RouterOS SSH connection is not configured",
            "meta": {
                "target": PANEL_TARGET,
                "routerHost": router_status["host"],
                "routerLogin": router_status,
                "pollSeconds": POLL_SECONDS,
                "staticPollSeconds": STATIC_POLL_SECONDS,
                "slowRestPollSeconds": SLOW_REST_POLL_SECONDS,
                "connectionDetailPollSeconds": CONNECTION_DETAIL_POLL_SECONDS,
                "detailRestWorkers": DETAIL_REST_WORKERS,
                "connectionProtocolPollSeconds": CONNECTION_PROTOCOL_BREAKDOWN_INTERVAL_SECONDS,
            },
        }
        self.state = normalize_collector_snapshot_status(self.state)
        self.lock = threading.Lock()
        self.ssh_lock = threading.Lock()
        self.prev_counters = {}
        self.prev_ts = None
        self.current_rates = {}
        self.zero_rate_candidates = {}
        self.last_counter_sample_at = None
        self.rate_history_sample_count = 0
        self.last_rate_sample_ready = False
        self.last_counter_reset = False
        self.prev_quality_counters = {}
        self.current_interface_quality = {}
        self.last_quality_sample_at = None
        self.interface_quality_sample_count = 0
        self.realtime_rest = {}
        self.realtime_failures = {}
        self.realtime_updated_at = None
        self.realtime_error = None
        self.realtime_last_error_at = None
        self.realtime_duration_seconds = None
        self.slow_rest = {}
        self.slow_failures = {}
        self.slow_updated_at = None
        self.slow_error = None
        self.slow_last_error_at = None
        self.slow_duration_seconds = None
        self.detail_failures = {}
        self.static_rest = {}
        self.static_failures = {}
        self.dns_static_cache = {"rows": [], "count": 0, "fetched_at": 0.0, "updatedAt": None}
        self.connection_summary = {
            "counts": {"all": 0, "tcp": None, "udp": None, "icmp": None},
            "protocolUpdatedAt": None,
            "protocolError": None,
            "protocolLastErrorAt": None,
            "protocolDurationSeconds": None,
        }
        self.connection_detail = {
            "active_connections": [],
            "updatedAt": None,
            "detailError": None,
            "detailLastErrorAt": None,
            "detailDurationSeconds": None,
        }
        self.static_updated_at = None
        self.static_error = None
        self.static_last_error_at = None
        self.static_duration_seconds = None
        self.history = {
            "cpu": deque(maxlen=HISTORY_LIMIT),
            "memory": deque(maxlen=HISTORY_LIMIT),
            "disk": deque(maxlen=HISTORY_LIMIT),
            "uplink": deque(maxlen=HISTORY_LIMIT),
            "downlink": deque(maxlen=HISTORY_LIMIT),
            "timestamps": deque(maxlen=HISTORY_LIMIT),
        }
        self.line_history = {}
        self.ip_aliases = self.load_ip_aliases()
        self.readonly_diagnostics_cache = {"fetched_at": 0.0, "payload": None}
        self.connection_protocol_last_scan_at = 0.0
        self.wan_latency = {
            "ok": False,
            "target": WAN_LATENCY_TARGET,
            "latencyMs": None,
            "updatedAt": None,
            "method": "icmp-ping",
            "error": None,
        }
        self.wan_latency_last_probe_at = 0.0

    def reset_collection_state(self, status="starting", error=None):
        router_status = public_router_config()
        with self.lock:
            self.prev_counters = {}
            self.prev_ts = None
            self.current_rates = {}
            self.zero_rate_candidates = {}
            self.last_counter_sample_at = None
            self.rate_history_sample_count = 0
            self.last_rate_sample_ready = False
            self.last_counter_reset = False
            self.prev_quality_counters = {}
            self.current_interface_quality = {}
            self.last_quality_sample_at = None
            self.interface_quality_sample_count = 0
            self.realtime_rest = {}
            self.realtime_failures = {}
            self.realtime_updated_at = None
            self.realtime_error = None
            self.realtime_last_error_at = None
            self.realtime_duration_seconds = None
            self.slow_rest = {}
            self.slow_failures = {}
            self.slow_updated_at = None
            self.slow_error = None
            self.slow_last_error_at = None
            self.slow_duration_seconds = None
            self.detail_failures = {}
            self.static_rest = {}
            self.static_failures = {}
            self.static_updated_at = None
            self.static_error = None
            self.static_last_error_at = None
            self.static_duration_seconds = None
            self.dns_static_cache = {"rows": [], "count": 0, "fetched_at": 0.0, "updatedAt": None}
            self.connection_summary = {
                "counts": {"all": 0, "tcp": None, "udp": None, "icmp": None},
                "protocolUpdatedAt": None,
                "protocolError": None,
                "protocolLastErrorAt": None,
                "protocolDurationSeconds": None,
            }
            self.connection_detail = {
                "active_connections": [],
                "updatedAt": None,
                "detailError": None,
                "detailLastErrorAt": None,
                "detailDurationSeconds": None,
            }
            self.history = {
                "cpu": deque(maxlen=HISTORY_LIMIT),
                "memory": deque(maxlen=HISTORY_LIMIT),
                "disk": deque(maxlen=HISTORY_LIMIT),
                "uplink": deque(maxlen=HISTORY_LIMIT),
                "downlink": deque(maxlen=HISTORY_LIMIT),
                "timestamps": deque(maxlen=HISTORY_LIMIT),
            }
            self.line_history = {}
            self.readonly_diagnostics_cache = {"fetched_at": 0.0, "payload": None}
            self.connection_protocol_last_scan_at = 0.0
            self.wan_latency = {
                "ok": False,
                "target": WAN_LATENCY_TARGET,
                "latencyMs": None,
                "updatedAt": None,
                "method": "icmp-ping",
                "error": None,
            }
            self.wan_latency_last_probe_at = 0.0
            self.state = {
                "status": status,
                "updatedAt": format_iso_now(),
                "error": error,
                "meta": {
                    "target": PANEL_TARGET,
                    "routerHost": router_status["host"],
                    "routerLogin": router_status,
                    "pollSeconds": POLL_SECONDS,
                    "staticPollSeconds": STATIC_POLL_SECONDS,
                    "slowRestPollSeconds": SLOW_REST_POLL_SECONDS,
                    "connectionDetailPollSeconds": CONNECTION_DETAIL_POLL_SECONDS,
                    "detailRestWorkers": DETAIL_REST_WORKERS,
                    "connectionProtocolPollSeconds": CONNECTION_PROTOCOL_BREAKDOWN_INTERVAL_SECONDS,
                },
            }
            self.state = normalize_collector_snapshot_status(self.state)

    def require_router_config_for_collection(self):
        if router_config_is_ready(get_router_config()):
            return True
        router_status = public_router_config()
        with self.lock:
            self.state = {
                "status": "needs_config",
                "updatedAt": format_iso_now(),
                "error": "RouterOS SSH connection is not configured",
                "meta": {
                    "target": PANEL_TARGET,
                    "routerHost": router_status["host"],
                    "routerLogin": router_status,
                    "pollSeconds": POLL_SECONDS,
                    "staticPollSeconds": STATIC_POLL_SECONDS,
                    "slowRestPollSeconds": SLOW_REST_POLL_SECONDS,
                    "connectionDetailPollSeconds": CONNECTION_DETAIL_POLL_SECONDS,
                    "detailRestWorkers": DETAIL_REST_WORKERS,
                    "connectionProtocolPollSeconds": CONNECTION_PROTOCOL_BREAKDOWN_INTERVAL_SECONDS,
                },
            }
            self.state = normalize_collector_snapshot_status(self.state)
        return False

    def load_ip_aliases(self):
        try:
            if not IP_ALIAS_FILE.exists():
                return {}
            payload = json.loads(IP_ALIAS_FILE.read_text(encoding="utf-8"))
            alias_source = payload.get("aliases", {}) if isinstance(payload, dict) else {}
            if not isinstance(alias_source, dict):
                alias_source = {}
            aliases = {}
            for raw_ip, raw_name in alias_source.items():
                ip_key = normalize_ip_key(raw_ip)
                custom_name = normalize_custom_name(raw_name)
                if ip_key and custom_name:
                    aliases[ip_key] = custom_name
            return aliases
        except Exception:
            return {}

    def persist_ip_aliases(self, aliases):
        IP_ALIAS_FILE.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "updatedAt": format_iso_now(),
            "aliases": dict(sorted(aliases.items(), key=lambda item: item[0])),
        }
        IP_ALIAS_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def resolve_ip_alias(self, ip_value, alias_map=None):
        ip_key = normalize_ip_key(ip_value)
        if not ip_key:
            return ""
        aliases = alias_map if alias_map is not None else self.ip_aliases
        return aliases.get(ip_key, "")

    def apply_ip_aliases_to_snapshot(self, snapshot, alias_map=None):
        if not isinstance(snapshot, dict):
            return snapshot
        aliases = alias_map if alias_map is not None else self.ip_aliases

        def decorate_row(row, ip_value, host_key="hostname"):
            if not isinstance(row, dict):
                return
            custom_name = self.resolve_ip_alias(ip_value, aliases)
            raw_name = str(row.get(host_key) or "").strip()
            auto_name = raw_name if raw_name and raw_name != "-" else ""
            fallback_name = str(ip_value or row.get("ip") or row.get("address") or "-").strip() or "-"
            row["customName"] = custom_name
            row["displayName"] = custom_name or auto_name or fallback_name

        for row in snapshot.get("terminals", []):
            decorate_row(row, row.get("ip"))
        arp = snapshot.get("arp")
        if isinstance(arp, dict):
            for row in arp.get("items", []):
                decorate_row(row, row.get("ip"))
        dhcp = snapshot.get("dhcp")
        if isinstance(dhcp, dict):
            for row in dhcp.get("leases", []):
                decorate_row(row, row.get("address"))
        connections = snapshot.get("connections")
        if isinstance(connections, dict):
            for row in connections.get("topIps", []):
                decorate_row(row, row.get("ip"))
        return snapshot

    def update_ip_alias(self, ip_value, name_value):
        ip_key = normalize_ip_key(ip_value)
        if not ip_key:
            raise ValueError("IP 地址不能为空")
        custom_name = normalize_custom_name(name_value)
        with self.lock:
            next_aliases = dict(self.ip_aliases)
            if custom_name:
                next_aliases[ip_key] = custom_name
            else:
                next_aliases.pop(ip_key, None)
        self.persist_ip_aliases(next_aliases)
        with self.lock:
            self.ip_aliases = next_aliases
            self.state = self.apply_ip_aliases_to_snapshot(copy.deepcopy(self.state), next_aliases)
            snapshot = copy.deepcopy(self.state)
        return {"ip": ip_key, "customName": custom_name, "snapshot": snapshot}

    def rest_get(self, session, config):
        router = get_ready_router_config()
        response = session.get(
            f"http://{router['host']}/rest/{config['path']}",
            params=config.get("params"),
            timeout=config.get("timeout", REST_TIMEOUT),
        )
        if config.get("optional") and response.status_code == 404:
            return [] if config.get("kind") != "object" else {}
        response.raise_for_status()
        payload = response.json()
        if config.get("kind") == "object":
            return payload[0] if isinstance(payload, list) and payload else payload or {}
        return payload if isinstance(payload, list) else ([payload] if payload else [])

    def rest_post(self, session, path, payload=None, timeout=None):
        router = get_ready_router_config()
        response = session.post(
            f"http://{router['host']}/rest/{path.strip('/')}",
            json=payload or {},
            timeout=timeout or REST_TIMEOUT,
        )
        response.raise_for_status()
        if not response.content:
            return {}
        return response.json()

    def rest_print(self, path, proplist=None, query=None, timeout=None):
        router = get_ready_router_config()
        session = requests.Session()
        session.auth = (router["user"], router["password"])
        try:
            payload = {}
            if proplist:
                payload[".proplist"] = proplist
            if query:
                payload[".query"] = query
            result = self.rest_post(session, f"{path.strip('/')}/print", payload, timeout=timeout)
            return result if isinstance(result, list) else ([result] if result else [])
        finally:
            session.close()

    def ssh_exec(self, client, command, timeout=None):
        timeout = max(1, to_int(timeout, SSH_TIMEOUT))
        stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
        channel = stdout.channel
        try:
            channel.settimeout(timeout)
            stderr.channel.settimeout(timeout)
            output = stdout.read().decode("utf-8", errors="replace").strip()
            error = stderr.read().decode("utf-8", errors="replace").strip()
            exit_status = channel.recv_exit_status()
        except socket.timeout as exc:
            try:
                channel.close()
            except Exception:
                pass
            raise RuntimeError(f"SSH command timed out after {timeout}s: {command}") from exc
        except Exception as exc:
            try:
                channel.close()
            except Exception:
                pass
            raise RuntimeError(f"SSH command failed: {command}: {exc}") from exc
        if exit_status != 0:
            raise RuntimeError(error or f"SSH command exited with status {exit_status}: {command}")
        if error:
            raise RuntimeError(error)
        return output

    def ssh_json(self, client, expression):
        payload = self.ssh_exec(client, f":put [:serialize to=json value={expression}]")
        return json.loads(payload) if payload else []

    def ssh_capture(self, client, command, capture_seconds, max_bytes=None, quiet_window=0.75, timeout=None):
        timeout = max(1, to_int(timeout, SSH_TIMEOUT))
        capture_seconds = max(1.0, float(capture_seconds or 0))
        stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
        channel = stdout.channel
        stdout_chunks = []
        stderr_chunks = []
        total_bytes = 0
        started_at = time.time()
        first_output_at = None
        last_output_at = None
        try:
            channel.settimeout(1.0)
            while time.time() - started_at < capture_seconds:
                received = False
                while channel.recv_ready():
                    data = channel.recv(65535)
                    if not data:
                        break
                    received = True
                    now = time.time()
                    if first_output_at is None:
                        first_output_at = now
                    last_output_at = now
                    stdout_chunks.append(data)
                    total_bytes += len(data)
                    if max_bytes and total_bytes >= max_bytes:
                        break
                while channel.recv_stderr_ready():
                    data = channel.recv_stderr(65535)
                    if not data:
                        break
                    stderr_chunks.append(data)
                if max_bytes and total_bytes >= max_bytes:
                    break
                if channel.exit_status_ready():
                    break
                if first_output_at and last_output_at and (time.time() - last_output_at) >= quiet_window:
                    break
                if not received:
                    time.sleep(0.1)
            error = b"".join(stderr_chunks).decode("utf-8", errors="replace").strip()
            text = b"".join(stdout_chunks).decode("utf-8", errors="replace")
            complete = channel.exit_status_ready()
            if not text and complete:
                exit_status = channel.recv_exit_status()
                if exit_status != 0:
                    raise RuntimeError(error or f"SSH command exited with status {exit_status}: {command}")
            if not text and not complete:
                raise RuntimeError(
                    error or f"SSH stream capture produced no rows within {round(capture_seconds, 1)}s: {command}"
                )
            return {
                "text": text,
                "stderr": error,
                "complete": complete,
                "capturedBytes": total_bytes,
                "firstOutputSeconds": round((first_output_at - started_at), 2) if first_output_at else None,
            }
        finally:
            try:
                channel.close()
            except Exception:
                pass

    def fetch_rest_item(self, key, endpoint_config):
        router = get_ready_router_config()
        session = requests.Session()
        session.auth = (router["user"], router["password"])
        try:
            return key, self.rest_get(session, endpoint_config), None
        except Exception as exc:
            return key, None, str(exc)
        finally:
            session.close()

    def fetch_rest_bundle(self, endpoints, workers=1):
        max_workers = max(1, min(to_int(workers, 1), len(endpoints) or 1))
        if max_workers > 1 and len(endpoints) > 1:
            payload = {}
            failures = {}
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = [
                    executor.submit(self.fetch_rest_item, key, endpoint_config)
                    for key, endpoint_config in endpoints.items()
                ]
                for future in futures:
                    key, value, error = future.result()
                    endpoint_config = endpoints[key]
                    fallback = {} if endpoint_config.get("kind") == "object" else []
                    if error:
                        payload[key] = fallback
                        failures[key] = error
                    else:
                        payload[key] = value
            if failures:
                payload["_failures"] = failures
            required_keys = [key for key, endpoint_config in endpoints.items() if not endpoint_config.get("optional")]
            if failures and required_keys and all(key in failures for key in required_keys):
                joined = "; ".join(f"{key}: {message}" for key, message in failures.items())
                raise RuntimeError(joined)
            return payload

        router = get_ready_router_config()
        session = requests.Session()
        session.auth = (router["user"], router["password"])
        try:
            payload = {}
            failures = {}
            for key, endpoint_config in endpoints.items():
                fallback = {} if endpoint_config.get("kind") == "object" else []
                try:
                    payload[key] = self.rest_get(session, endpoint_config)
                except Exception as exc:
                    payload[key] = fallback
                    failures[key] = str(exc)
            if failures:
                payload["_failures"] = failures
            required_keys = [key for key, endpoint_config in endpoints.items() if not endpoint_config.get("optional")]
            if failures and required_keys and all(key in failures for key in required_keys):
                joined = "; ".join(f"{key}: {message}" for key, message in failures.items())
                raise RuntimeError(joined)
            return payload
        finally:
            session.close()

    def open_ssh_client(self, timeout=None):
        router = get_ready_router_config()
        timeout = max(1, to_int(timeout, SSH_TIMEOUT))
        client = None
        try:
            ssh = require_paramiko()
            client = ssh.SSHClient()
            client.set_missing_host_key_policy(ssh.AutoAddPolicy())
            client.connect(
                router["host"],
                port=router["sshPort"],
                username=router["user"],
                password=router["password"],
                timeout=timeout,
                banner_timeout=timeout,
                auth_timeout=timeout,
                allow_agent=False,
                look_for_keys=False,
            )
        except Exception as exc:
            try:
                if client:
                    client.close()
            except Exception:
                pass
            raise RuntimeError(format_ssh_connect_error(router, exc, timeout=timeout)) from exc
        return client

    def fetch_connection_total_count(self):
        return self.fetch_connection_tracking_summary()["total"]

    def parse_connection_tracking_summary(self, fields, source="RouterOS connection tracking"):
        fields = {str(key).lower(): value for key, value in (fields or {}).items()}
        total = to_int(fields.get("total-entries"), -1)
        if total < 0:
            raise RuntimeError(f"{source} missing total-entries")
        return {
            "total": total,
            "ipv4": to_int(fields.get("total-ip4-entries"), 0),
            "ipv6": to_int(fields.get("total-ip6-entries"), 0),
        }

    def fetch_connection_tracking_summary_rest(self):
        rows = self.rest_print(
            "ip/firewall/connection/tracking",
            proplist=["total-entries", "total-ip4-entries", "total-ip6-entries"],
            timeout=CONNECTION_DETAIL_REST_TIMEOUT,
        )
        return self.parse_connection_tracking_summary(rows[0] if rows else {}, source="REST connection tracking summary")

    def fetch_connection_tracking_summary_ssh(self):
        with self.ssh_lock:
            client = self.open_ssh_client(timeout=CONNECTION_TRACKING_TIMEOUT)
            try:
                output = self.ssh_exec(
                    client,
                    "/ip/firewall/connection/tracking print without-paging",
                    timeout=CONNECTION_TRACKING_TIMEOUT,
                )
                fields = {}
                for raw_line in output.splitlines():
                    match = TRACKING_FIELD_PATTERN.match(raw_line)
                    if match:
                        fields[match.group(1).lower()] = match.group(2).strip()
                return self.parse_connection_tracking_summary(fields, source="SSH connection tracking summary")
            finally:
                client.close()

    def fetch_connection_tracking_summary(self):
        try:
            return self.fetch_connection_tracking_summary_rest()
        except Exception as rest_exc:
            try:
                return self.fetch_connection_tracking_summary_ssh()
            except Exception as ssh_exc:
                raise RuntimeError(
                    f"REST connection tracking summary failed: {rest_exc}; SSH fallback failed: {ssh_exc}"
                ) from ssh_exc

    def fetch_connection_protocol_counts(self):
        tracking = self.fetch_connection_tracking_summary()
        return {
            "tcp": None,
            "udp": None,
            "icmp": None,
            "all": tracking["total"],
        }

    def parse_connection_terse_line(self, line):
        row = {}
        for match in TERSE_FIELD_PATTERN.finditer(line):
            key = match.group(1)
            value = match.group(2).strip()
            if re.fullmatch(r"[\d.\s]+", value):
                value = value.replace(" ", "")
            row[key] = value
        return row

    def dedupe_connection_rows(self, source_rows):
        rows = []
        seen = set()
        for raw_row in source_rows or []:
            row = raw_row if isinstance(raw_row, dict) else {}
            if not row:
                continue
            identity = (
                row.get("src-address", ""),
                row.get("dst-address", ""),
                row.get("reply-src-address", ""),
                row.get("reply-dst-address", ""),
                row.get("protocol", ""),
                row.get("timeout", ""),
                row.get("connection-mark", ""),
            )
            if identity in seen:
                continue
            seen.add(identity)
            rows.append(row)
            if len(rows) >= CONNECTION_DETAIL_SAMPLE_LIMIT:
                break
        return rows

    def split_connection_endpoint(self, value):
        text = str(value or "").strip()
        if not text:
            return "", ""
        if text.startswith("["):
            end = text.find("]")
            if end > 0:
                port = text[end + 2 :] if text[end + 1 : end + 2] == ":" else ""
                return text[1:end], port
        match = re.fullmatch(r"(\d{1,3}(?:\.\d{1,3}){3})(?::(\d+))?", text)
        if match:
            ip_text = match.group(1)
            try:
                ip_text = str(ipaddress.ip_address(ip_text))
            except ValueError:
                pass
            return ip_text, match.group(2) or ""
        try:
            return str(ipaddress.ip_address(text)), ""
        except ValueError:
            return text, ""

    def connection_row_matches_ip(self, row, ip_text):
        for field in ("src-address", "dst-address", "reply-src-address", "reply-dst-address"):
            endpoint_ip, _port = self.split_connection_endpoint(row.get(field))
            if endpoint_ip == ip_text:
                return True
        return False

    def normalize_connection_search_row(self, row):
        src_ip, src_port = self.split_connection_endpoint(row.get("src-address"))
        dst_ip, dst_port = self.split_connection_endpoint(row.get("dst-address"))
        reply_src_ip, reply_src_port = self.split_connection_endpoint(row.get("reply-src-address"))
        reply_dst_ip, reply_dst_port = self.split_connection_endpoint(row.get("reply-dst-address"))
        return {
            "srcAddress": row.get("src-address", ""),
            "dstAddress": row.get("dst-address", ""),
            "replySrcAddress": row.get("reply-src-address", ""),
            "replyDstAddress": row.get("reply-dst-address", ""),
            "srcIp": src_ip,
            "srcPort": src_port,
            "dstIp": dst_ip,
            "dstPort": dst_port,
            "replySrcIp": reply_src_ip,
            "replySrcPort": reply_src_port,
            "replyDstIp": reply_dst_ip,
            "replyDstPort": reply_dst_port,
            "protocol": row.get("protocol", ""),
            "timeout": row.get("timeout", ""),
            "mark": row.get("connection-mark", "-") or "-",
            "origRate": to_int(row.get("orig-rate")),
            "replRate": to_int(row.get("repl-rate")),
            "origBytes": to_int(row.get("orig-bytes")),
            "replBytes": to_int(row.get("repl-bytes")),
            "raw": {key: row.get(key, "") for key in CONNECTION_SEARCH_FIELDS},
        }

    def fetch_connection_search(self, target_ip, source_ip=None, limit=80):
        target = str(ipaddress.ip_address(str(target_ip or "").strip()))
        source = str(ipaddress.ip_address(str(source_ip or "").strip())) if source_ip else None
        safe_limit = max(1, min(to_int(limit, 80), CONNECTION_SEARCH_MAX_LIMIT))

        def ip_clause(ip_text):
            pattern = re.escape(ip_text)
            fields = ("src-address", "dst-address", "reply-src-address", "reply-dst-address")
            return "(" + " || ".join(f'{field}~"{pattern}"' for field in fields) + ")"

        where_clause = ip_clause(target)
        if source:
            where_clause = f"({where_clause} && {ip_clause(source)})"
        command = (
            "/ip/firewall/connection print terse without-paging "
            f"proplist={','.join(CONNECTION_SEARCH_FIELDS)} where {where_clause}"
        )
        with self.ssh_lock:
            client = self.open_ssh_client()
            try:
                capture = self.ssh_capture(
                    client,
                    command,
                    capture_seconds=CONNECTION_SEARCH_CAPTURE_SECONDS,
                    max_bytes=CONNECTION_SEARCH_STREAM_MAX_BYTES,
                    timeout=CONNECTION_SEARCH_TIMEOUT,
                )
            finally:
                client.close()

        rows = []
        for raw_line in capture.get("text", "").splitlines():
            line = raw_line.strip()
            if not line or "address=" not in line:
                continue
            row = self.parse_connection_terse_line(line)
            if not row or not self.connection_row_matches_ip(row, target):
                continue
            if source and not self.connection_row_matches_ip(row, source):
                continue
            rows.append(self.normalize_connection_search_row(row))
            if len(rows) >= safe_limit:
                break
        return {
            "targetIp": target,
            "sourceIp": source,
            "limit": safe_limit,
            "matchCount": len(rows),
            "rows": rows,
            "transport": "ssh",
            "readOnly": True,
            "capture": {
                "complete": capture.get("complete"),
                "capturedBytes": capture.get("capturedBytes"),
                "firstOutputSeconds": capture.get("firstOutputSeconds"),
                "truncatedByLimit": len(rows) >= safe_limit,
            },
        }

    def fetch_connection_detail_rest(self):
        proplist = [
            "src-address",
            "dst-address",
            "reply-src-address",
            "reply-dst-address",
            "protocol",
            "timeout",
            "connection-mark",
            "orig-rate",
            "repl-rate",
            "orig-bytes",
            "repl-bytes",
        ]
        rows = self.rest_print(
            "ip/firewall/connection",
            proplist=proplist,
            query=[">orig-rate=0", ">repl-rate=0", "#|"],
            timeout=CONNECTION_DETAIL_REST_TIMEOUT,
        )
        return {
            "active_connections": self.dedupe_connection_rows(rows),
            "detailTransport": "rest",
        }

    def fetch_connection_detail_ssh(self):
        with self.ssh_lock:
            client = self.open_ssh_client()
            try:
                capture = self.ssh_capture(
                    client,
                    "/ip/firewall/connection print terse without-paging "
                    "proplist=src-address,dst-address,reply-src-address,reply-dst-address,protocol,timeout,connection-mark,orig-rate,repl-rate,orig-bytes,repl-bytes "
                    "where (orig-rate>0 || repl-rate>0)",
                    capture_seconds=CONNECTION_DETAIL_CAPTURE_SECONDS,
                    max_bytes=CONNECTION_DETAIL_STREAM_MAX_BYTES,
                    timeout=max(SSH_TIMEOUT, int(CONNECTION_DETAIL_CAPTURE_SECONDS) + 8),
                )
                parsed_rows = []
                for raw_line in capture["text"].splitlines():
                    line = raw_line.strip()
                    if not line or "src-address=" not in line:
                        continue
                    row = self.parse_connection_terse_line(line)
                    if row:
                        parsed_rows.append(row)
                return {
                    "active_connections": self.dedupe_connection_rows(parsed_rows),
                    "detailTransport": "ssh",
                }
            finally:
                client.close()

    def fetch_connection_detail(self):
        try:
            return self.fetch_connection_detail_rest()
        except Exception as rest_exc:
            try:
                detail = self.fetch_connection_detail_ssh()
                detail["detailTransport"] = "ssh-fallback"
                return detail
            except Exception as ssh_exc:
                raise RuntimeError(
                    f"REST connection detail failed: {rest_exc}; SSH fallback failed: {ssh_exc}"
                ) from ssh_exc

    def fetch_dns_static_count(self):
        with self.ssh_lock:
            client = self.open_ssh_client()
            try:
                return to_int(self.ssh_exec(client, "/ip/dns/static print count-only"))
            finally:
                client.close()

    def normalize_dns_static_rows(self, rows, limit=None):
        normalized_rows = []
        for item in rows or []:
            if isinstance(item, list):
                normalized_rows.extend(item)
            elif isinstance(item, dict):
                normalized_rows.append(item)
        if limit is None:
            return normalized_rows
        return normalized_rows[:limit]

    def fetch_dns_static_full_rest(self):
        router = get_ready_router_config()
        session = requests.Session()
        session.auth = (router["user"], router["password"])
        try:
            response = session.get(
                f"http://{router['host']}/rest/ip/dns/static",
                params={
                    ".proplist": "name,regexp,address,cname,text,ttl,comment,disabled,type",
                },
                timeout=DNS_STATIC_FULL_REST_TIMEOUT,
            )
            response.raise_for_status()
            payload = response.json()
            rows = payload if isinstance(payload, list) else ([payload] if payload else [])
            normalized_rows = self.normalize_dns_static_rows(rows)
            fetched_at = time.time()
            with self.lock:
                self.dns_static_cache = {
                    "rows": normalized_rows,
                    "count": len(normalized_rows),
                    "fetched_at": fetched_at,
                    "updatedAt": format_iso_now(),
                }
                self.static_rest["dns_static_meta"] = {
                    **copy.deepcopy(self.static_rest.get("dns_static_meta", {})),
                    "count": len(normalized_rows),
                    "total_count": len(normalized_rows),
                    "sample": len(normalized_rows) > len(self.static_rest.get("dns_static", [])),
                    "cacheTtlSeconds": DNS_STATIC_CACHE_TTL,
                    "cachedAt": self.dns_static_cache["updatedAt"],
                }
            return normalized_rows
        finally:
            session.close()

    def get_dns_static_cached_rows(self, force_refresh=False):
        now = time.time()
        with self.lock:
            cached_rows = copy.deepcopy(self.dns_static_cache.get("rows", []))
            fetched_at = float(self.dns_static_cache.get("fetched_at") or 0.0)
        cache_valid = cached_rows and (now - fetched_at) < DNS_STATIC_CACHE_TTL
        if force_refresh or not cache_valid:
            try:
                return self.fetch_dns_static_full_rest()
            except Exception:
                if cached_rows:
                    return cached_rows
                raise
        return cached_rows

    def fetch_dns_static_preview(self, total_count=0):
        with self.ssh_lock:
            client = self.open_ssh_client()
            try:
                last_index = max(min(total_count, DNS_STATIC_PREVIEW_LIMIT) - 1, -1)
                if last_index < 0:
                    return []
                preview_script = (
                    ':local ids [/ip/dns/static/find]; '
                    ':local out [:toarray ""]; '
                    f':local last ([:len $ids] - 1); :if ($last > {last_index}) do={{ :set last {last_index} }}; '
                    ':if ($last >= 0) do={ '
                    ':for idx from=0 to=$last do={ '
                    ':local i [:pick $ids $idx]; '
                    ':set out ($out, [/ip/dns/static/print as-value where .id=$i]); '
                    '} '
                    '}; '
                    ':put [:serialize to=json value=$out]'
                )
                preview = self.ssh_exec(client, preview_script)
                rows = json.loads(preview) if preview else []
                return self.normalize_dns_static_rows(rows, DNS_STATIC_PREVIEW_LIMIT)
            finally:
                client.close()

    def fetch_dns_static_page(self, offset=0, limit=DNS_STATIC_PAGE_LIMIT):
        safe_offset = max(to_int(offset, 0), 0)
        safe_limit = max(1, min(to_int(limit, DNS_STATIC_PAGE_LIMIT), DNS_STATIC_MAX_PAGE_LIMIT))
        try:
            rows = self.get_dns_static_cached_rows()
            return rows[safe_offset : safe_offset + safe_limit]
        except Exception:
            with self.lock:
                preview_rows = copy.deepcopy(self.static_rest.get("dns_static", []))
            return preview_rows[safe_offset : safe_offset + safe_limit]

    def get_dns_static_total_count(self):
        with self.lock:
            meta = copy.deepcopy(self.static_rest.get("dns_static_meta", {}))
            preview_rows = copy.deepcopy(self.static_rest.get("dns_static", []))
            cached_count = to_int(self.dns_static_cache.get("count"), 0)
        return dns_static_total_count_from_meta(meta, cached_count or len(preview_rows))

    def merge_rest_bundle(self):
        with self.lock:
            static_rest = copy.deepcopy(self.static_rest)
            slow_rest = copy.deepcopy(self.slow_rest)
            realtime_rest = copy.deepcopy(self.realtime_rest)
        static_rest.pop("_failures", None)
        slow_rest.pop("_failures", None)
        realtime_rest.pop("_failures", None)
        merged = copy.deepcopy(EMPTY_REST_BUNDLE)
        merged.update(static_rest)
        merged.update(slow_rest)
        merged.update(realtime_rest)
        return merged

    def merge_connection_bundle(self):
        with self.lock:
            counts = copy.deepcopy(self.connection_summary["counts"])
            protocol_updated_at = self.connection_summary.get("protocolUpdatedAt")
            protocol_error = self.connection_summary.get("protocolError")
            protocol_last_error_at = self.connection_summary.get("protocolLastErrorAt")
            protocol_duration_seconds = self.connection_summary.get("protocolDurationSeconds")
            active_connections = copy.deepcopy(self.connection_detail["active_connections"])
            detail_updated_at = self.connection_detail.get("updatedAt")
            detail_error = self.connection_detail.get("detailError")
            detail_last_error_at = self.connection_detail.get("detailLastErrorAt")
            detail_duration_seconds = self.connection_detail.get("detailDurationSeconds")
        return {
            "counts": counts,
            "protocolUpdatedAt": protocol_updated_at,
            "protocolError": protocol_error,
            "protocolLastErrorAt": protocol_last_error_at,
            "protocolDurationSeconds": protocol_duration_seconds,
            "active_connections": active_connections,
            "detailUpdatedAt": detail_updated_at,
            "detailError": detail_error,
            "detailLastErrorAt": detail_last_error_at,
            "detailDurationSeconds": detail_duration_seconds,
        }

    def compute_rates(self, interfaces, fresh_counter_sample=False):
        if not fresh_counter_sample:
            with self.lock:
                return copy.deepcopy(self.current_rates)
        ts = time.time()
        with self.lock:
            previous = copy.deepcopy(self.prev_counters)
            previous_ts = self.prev_ts
            previous_rates = copy.deepcopy(self.current_rates)
            zero_candidates = copy.deepcopy(self.zero_rate_candidates)
        interval = max(ts - previous_ts, 1) if previous_ts else 1
        rates = {}
        current = {}
        sample_ready = False
        counter_reset = False

        def previous_direction_rate(interface_name, direction):
            value = previous_rates.get(interface_name, {}).get(f"{direction}Bps")
            try:
                return float(value)
            except (TypeError, ValueError):
                return 0.0

        def confirm_zero_rate(interface_name, direction, raw_rate, has_baseline, reset):
            if reset:
                zero_candidates.setdefault(interface_name, {})[direction] = 0
                return None
            previous_rate = previous_direction_rate(interface_name, direction)
            if has_baseline and raw_rate == 0 and previous_rate > 0:
                direction_counts = zero_candidates.setdefault(interface_name, {})
                direction_counts[direction] = to_int(direction_counts.get(direction), 0) + 1
                if direction_counts[direction] < RATE_ZERO_CONFIRM_SAMPLES:
                    return previous_rate
                return 0
            zero_candidates.setdefault(interface_name, {})[direction] = 0
            return raw_rate

        for item in interfaces:
            name = item.get("name")
            if not name:
                continue
            rx = to_int(item.get("rx-byte"))
            tx = to_int(item.get("tx-byte"))
            current[name] = (rx, tx)
            has_baseline = name in previous
            prev_rx, prev_tx = previous.get(name, (rx, tx))
            reset = has_baseline and (rx < prev_rx or tx < prev_tx)
            counter_reset = counter_reset or reset
            sample_ready = sample_ready or (has_baseline and not reset)
            raw_rx_bps = max(rx - prev_rx, 0) / interval if has_baseline and not reset else 0
            raw_tx_bps = max(tx - prev_tx, 0) / interval if has_baseline and not reset else 0
            rates[name] = {
                "rxBps": confirm_zero_rate(name, "rx", raw_rx_bps, has_baseline, reset),
                "txBps": confirm_zero_rate(name, "tx", raw_tx_bps, has_baseline, reset),
                "rateSampleReady": has_baseline and not reset,
                "counterReset": reset,
            }
        with self.lock:
            self.prev_counters = current
            self.prev_ts = ts
            self.current_rates = copy.deepcopy(rates)
            self.zero_rate_candidates = zero_candidates
            self.last_counter_sample_at = format_iso_now()
            self.last_rate_sample_ready = sample_ready
            self.last_counter_reset = counter_reset
            if sample_ready:
                self.rate_history_sample_count += 1
        return rates

    def compute_interface_quality(self, interfaces, fresh_counter_sample=False):
        if not fresh_counter_sample:
            with self.lock:
                return copy.deepcopy(self.current_interface_quality)

        updated_at = format_iso_now()
        with self.lock:
            previous = copy.deepcopy(self.prev_quality_counters)
            sample_count = self.interface_quality_sample_count + 1

        current = {}
        quality = {}
        for item in interfaces:
            name = item.get("name")
            if not name:
                continue
            counters = {
                "rxPackets": to_int(item.get("rx-packet")),
                "txPackets": to_int(item.get("tx-packet")),
                "rxDrop": to_int(item.get("rx-drop")),
                "txDrop": to_int(item.get("tx-drop")),
                "rxError": to_int(item.get("rx-error")),
                "txError": to_int(item.get("tx-error")),
            }
            current[name] = counters
            prev = previous.get(name)
            has_baseline = isinstance(prev, dict)
            counter_reset = bool(
                has_baseline
                and any(counters[key] < to_int(prev.get(key)) for key in counters)
            )
            if has_baseline and not counter_reset:
                delta = {key: max(counters[key] - to_int(prev.get(key)), 0) for key in counters}
            else:
                delta = {key: 0 for key in counters}

            packet_total = counters["rxPackets"] + counters["txPackets"]
            packet_delta = delta["rxPackets"] + delta["txPackets"]
            drop_total = counters["rxDrop"] + counters["txDrop"]
            error_total = counters["rxError"] + counters["txError"]
            drop_delta = delta["rxDrop"] + delta["txDrop"]
            error_delta = delta["rxError"] + delta["txError"]
            loss_rate = (drop_delta / packet_delta) if packet_delta > 0 else None
            error_rate = (error_delta / packet_delta) if packet_delta > 0 else None
            is_derived = interface_is_derived(name, item.get("type"))
            quality[name] = {
                "packetTotal": packet_total,
                "packetDelta": packet_delta,
                "dropTotal": drop_total,
                "errorTotal": error_total,
                "dropDelta": drop_delta,
                "errorDelta": error_delta,
                "rxDropDelta": delta["rxDrop"],
                "txDropDelta": delta["txDrop"],
                "rxErrorDelta": delta["rxError"],
                "txErrorDelta": delta["txError"],
                "lossRate": loss_rate,
                "errorRate": error_rate,
                "qualityUpdatedAt": updated_at,
                "qualitySampleCount": sample_count,
                "qualitySampleReady": has_baseline and not counter_reset,
                "qualityCounterReset": counter_reset,
                "isDerivedInterface": is_derived,
                "isLogicalInterface": is_derived,
                "qualityDisplayWeight": 0.35 if is_derived else 1.0,
                "qualityEvidenceLevel": "logical" if is_derived else "primary",
                "qualityParent": interface_parent_hint(item),
                "logicalPairKey": interface_logical_pair_key(item),
                "qualityGroupKey": interface_quality_group_key(item),
            }

        with self.lock:
            self.prev_quality_counters = current
            self.current_interface_quality = copy.deepcopy(quality)
            self.last_quality_sample_at = updated_at
            self.interface_quality_sample_count = sample_count
        return quality

    def get_wan_latency(self, force=False):
        now = time.monotonic()
        with self.lock:
            cached = copy.deepcopy(self.wan_latency)
            last_probe_at = float(self.wan_latency_last_probe_at or 0.0)
        if not force and cached.get("updatedAt") and (now - last_probe_at) < WAN_LATENCY_POLL_SECONDS:
            return cached
        result = ping_latency_target(WAN_LATENCY_TARGET, WAN_LATENCY_TIMEOUT_MS)
        with self.lock:
            self.wan_latency = copy.deepcopy(result)
            self.wan_latency_last_probe_at = now
        return result

    def attach_wan_latency(self, rows, latency):
        latency_ms = to_int((latency or {}).get("latencyMs"), 0)
        return [
            {
                **copy.deepcopy(row),
                "latencyMs": latency_ms or None,
                "latencyTarget": (latency or {}).get("target") or WAN_LATENCY_TARGET,
                "latencyUpdatedAt": (latency or {}).get("updatedAt"),
                "latencyOk": bool((latency or {}).get("ok")),
                "latencyError": (latency or {}).get("error"),
            }
            for row in rows
        ]

    def build_maps(self, rest):
        interface_types = {row.get("name"): row.get("type", "") for row in rest["interfaces"]}
        addresses_by_interface = defaultdict(list)
        local_networks = []
        router_ips = set()
        address_rows = list(rest["ip_addresses"]) + list(rest.get("ipv6_addresses", []))
        for item in address_rows:
            iface = item.get("actual-interface") or item.get("interface")
            address = item.get("address", "").split("/")[0]
            if not address:
                continue
            addresses_by_interface[iface].append(item)
            try:
                ip_iface = ipaddress.ip_interface(item.get("address"))
                network = ip_iface.network
                if interface_types.get(iface) not in {"wireguard", "loopback"} and not str(iface).startswith("pppoe-out"):
                    if not ip_iface.ip.is_loopback and not ip_iface.ip.is_link_local:
                        local_networks.append(network)
                router_ips.add(address)
            except Exception:
                pass
        return addresses_by_interface, local_networks, router_ips

    def build_overview(self, rest, ssh, terminal_count, wan_totals, wan_latency=None):
        resource = rest["resource"]
        latency = wan_latency or {}
        latency_ms = to_int(latency.get("latencyMs"), 0)
        total_memory = to_int(resource.get("total-memory"))
        used_memory = max(total_memory - to_int(resource.get("free-memory")), 0)
        total_disk = to_int(resource.get("total-hdd-space"))
        used_disk = max(total_disk - to_int(resource.get("free-hdd-space")), 0)
        admins = []
        if EXPOSE_ADMIN_SESSIONS:
            seen = set()
            for user in rest["active_users"]:
                key = (user.get("name"), user.get("address"), user.get("via"))
                if key in seen:
                    continue
                seen.add(key)
                admins.append(
                    {
                        "name": user.get("name", "-"),
                        "address": user.get("address", "-"),
                        "via": user.get("via", "-"),
                        "when": user.get("when", "-"),
                    }
                )
        return {
            "identity": rest["identity"].get("name", "RouterOS"),
            "version": resource.get("version", "-"),
            "boardName": resource.get("board-name", "-"),
            "architecture": resource.get("architecture-name", "-"),
            "cpuModel": resource.get("cpu", "-"),
            "cpuCount": to_int(resource.get("cpu-count")),
            "cpuFrequency": to_int(resource.get("cpu-frequency")),
            "uptime": resource.get("uptime", "-"),
            "systemTime": f'{rest["clock"].get("date", "")} {rest["clock"].get("time", "")}'.strip(),
            "ntpStatus": rest["ntp"].get("status", "unknown"),
            "admins": admins,
            "cpuLoad": to_int(resource.get("cpu-load")),
            "memoryUsedBytes": used_memory,
            "memoryTotalBytes": total_memory,
            "memoryUsage": round((used_memory / total_memory) * 100, 2) if total_memory else 0,
            "diskUsedBytes": used_disk,
            "diskTotalBytes": total_disk,
            "diskUsage": round((used_disk / total_disk) * 100, 2) if total_disk else 0,
            "uplinkBps": wan_totals["up"],
            "downlinkBps": wan_totals["down"],
            "wanLatencyMs": latency_ms or None,
            "latencyMs": latency_ms or None,
            "wanLatencyTarget": latency.get("target") or WAN_LATENCY_TARGET,
            "wanLatencyUpdatedAt": latency.get("updatedAt"),
            "wanLatencyOk": bool(latency.get("ok")),
            "wanLatencyError": latency.get("error"),
            "onlineTerminals": terminal_count,
            "connectionTotal": ssh["counts"]["all"],
            "systemLoadLevel": rate_level(max(to_int(resource.get("cpu-load")) / 100, used_memory / total_memory if total_memory else 0)),
            "history": {key: list(values) for key, values in self.history.items()},
        }

    def build_interfaces(self, rest, rates, addresses_by_interface, quality):
        wan_names = infer_wan_interface_names(rest, addresses_by_interface)
        gateway_rows = defaultdict(list)
        for route in rest["routes"]:
            gateway_rows[route.get("gateway")].append(route)
        items = []
        for item in rest["interfaces"]:
            name = item.get("name")
            iface_type = item.get("type", "-")
            parent_hint = interface_parent_hint(item)
            group_key = interface_quality_group_key(item)
            is_derived = interface_is_derived(name, iface_type)
            drop_total = to_int(item.get("rx-drop")) + to_int(item.get("tx-drop"))
            error_total = to_int(item.get("rx-error")) + to_int(item.get("tx-error"))
            packet_total = to_int(item.get("rx-packet")) + to_int(item.get("tx-packet"))
            quality_row = copy.deepcopy(quality.get(name, {}))
            quality_row.setdefault("packetTotal", packet_total)
            quality_row.setdefault("packetDelta", 0)
            quality_row.setdefault("dropTotal", drop_total)
            quality_row.setdefault("errorTotal", error_total)
            quality_row.setdefault("dropDelta", 0)
            quality_row.setdefault("errorDelta", 0)
            quality_row.setdefault("rxDropDelta", 0)
            quality_row.setdefault("txDropDelta", 0)
            quality_row.setdefault("rxErrorDelta", 0)
            quality_row.setdefault("txErrorDelta", 0)
            quality_row.setdefault("lossRate", None)
            quality_row.setdefault("errorRate", None)
            quality_row.setdefault("qualityUpdatedAt", None)
            quality_row.setdefault("qualitySampleCount", 0)
            quality_row.setdefault("qualitySampleReady", False)
            quality_row["isDerivedInterface"] = bool(quality_row.get("isDerivedInterface", is_derived) or is_derived)
            quality_row["isLogicalInterface"] = bool(quality_row.get("isLogicalInterface", is_derived) or is_derived)
            quality_row["qualityDisplayWeight"] = 0.35 if quality_row["isDerivedInterface"] else 1.0
            quality_row["qualityEvidenceLevel"] = "logical" if quality_row["isDerivedInterface"] else "primary"
            quality_row["qualityParent"] = quality_row.get("qualityParent") or parent_hint
            quality_row["logicalPairKey"] = quality_row.get("logicalPairKey") or interface_logical_pair_key(item)
            quality_row["qualityGroupKey"] = quality_row.get("qualityGroupKey") or group_key
            items.append(
                {
                    "name": name,
                    "role": "WAN" if name in wan_names else "LAN",
                    "type": iface_type,
                    "running": to_bool(item.get("running")),
                    "disabled": to_bool(item.get("disabled")),
                    "mac": item.get("mac-address", "-"),
                    "parentInterface": parent_hint,
                    "vlanId": item.get("vlan-id"),
                    "ips": [row.get("address", "-") for row in addresses_by_interface.get(name, [])],
                    "networks": [row.get("network", "-") for row in addresses_by_interface.get(name, [])],
                    "gateways": [row.get("dst-address", "-") for row in gateway_rows.get(name, [])[:4]],
                    "rxBytes": to_int(item.get("rx-byte")),
                    "txBytes": to_int(item.get("tx-byte")),
                    "rxPackets": to_int(item.get("rx-packet")),
                    "txPackets": to_int(item.get("tx-packet")),
                    "rxDrop": to_int(item.get("rx-drop")),
                    "txDrop": to_int(item.get("tx-drop")),
                    "rxError": to_int(item.get("rx-error")),
                    "txError": to_int(item.get("tx-error")),
                    "rxRate": rates.get(name, {}).get("rxBps", 0),
                    "txRate": rates.get(name, {}).get("txBps", 0),
                    **quality_row,
                }
            )
        items.sort(key=lambda row: (row["role"] != "WAN", row.get("isDerivedInterface", False), row["name"]))
        return items

    def build_pppoe(self, rest, rates, addresses_by_interface, update_rate_history=False, rate_history_break=False):
        defaults = [row for row in rest["routes"] if row.get("dst-address") == "0.0.0.0/0"]
        route_by_gateway = defaultdict(list)
        for route in defaults:
            route_by_gateway[route.get("gateway")].append(route)
        rows = []
        total_rate = 0
        for item in rest["pppoe"]:
            name = item.get("name")
            metric = rates.get(name, {"rxBps": 0, "txBps": 0})
            rx_bps = metric.get("rxBps")
            tx_bps = metric.get("txBps")
            rx_bps_numeric = to_int(rx_bps)
            tx_bps_numeric = to_int(tx_bps)
            total_rate += rx_bps_numeric + tx_bps_numeric
            history = self.line_history.setdefault(name, {"up": deque(maxlen=HISTORY_LIMIT), "down": deque(maxlen=HISTORY_LIMIT)})
            if update_rate_history:
                history["up"].append(None if rate_history_break else metric.get("txBps"))
                history["down"].append(None if rate_history_break else metric.get("rxBps"))
            rows.append(
                {
                    "name": name,
                    "status": "在线" if to_bool(item.get("running")) else "离线",
                    "running": to_bool(item.get("running")),
                    "parent": item.get("interface", "-"),
                    "addresses": [row.get("address", "-") for row in addresses_by_interface.get(name, [])],
                    "upRate": tx_bps,
                    "downRate": rx_bps,
                    "rxBytes": to_int(next((iface.get("rx-byte") for iface in rest["interfaces"] if iface.get("name") == name), 0)),
                    "txBytes": to_int(next((iface.get("tx-byte") for iface in rest["interfaces"] if iface.get("name") == name), 0)),
                    "history": {"up": list(history["up"]), "down": list(history["down"])},
                    "routes": [
                        {
                            "active": to_bool(route.get("active")),
                            "distance": route.get("distance", "-"),
                            "table": route.get("routing-table", "-"),
                            "comment": route.get("comment", ""),
                        }
                        for route in route_by_gateway.get(name, [])
                    ],
                }
            )
        distribution = [
            {
                "name": row["name"],
                "share": round(((to_int(row.get("upRate")) + to_int(row.get("downRate"))) / total_rate) * 100, 2) if total_rate else 0,
                "upRate": row["upRate"],
                "downRate": row["downRate"],
                "status": row["status"],
            }
            for row in rows
        ]
        return rows, distribution

    def build_wan_lines(self, rest, pppoe_rows, interfaces, update_rate_history=False, rate_history_break=False):
        active_defaults = [
            row for row in rest.get("routes", [])
            if row.get("dst-address") == "0.0.0.0/0" and to_bool(row.get("active")) and not to_bool(row.get("disabled"))
        ]
        default_routes = [
            row for row in rest.get("routes", [])
            if row.get("dst-address") == "0.0.0.0/0" and not to_bool(row.get("disabled"))
        ]
        dhcp_clients_by_interface = {
            item.get("interface"): item
            for item in rest.get("dhcp_clients", [])
            if item.get("interface")
        }
        wan_interfaces = [row for row in interfaces if row.get("role") == "WAN"]
        pppoe_names = {row.get("name") for row in pppoe_rows if row.get("name")}
        rows = [
            {
                **copy.deepcopy(row),
                "kind": "pppoe",
                "lineId": row.get("name", "-"),
                "access": "PPPoE",
            }
            for row in pppoe_rows
        ]

        def route_matches_interface(route, iface_name):
            gateway = str(route.get("gateway") or "").strip()
            if not gateway or not iface_name:
                return False
            if gateway == iface_name:
                return True
            if "%" in gateway and gateway.rsplit("%", 1)[-1] == iface_name:
                return True
            return False

        non_pppoe_wan_interfaces = [iface for iface in wan_interfaces if iface.get("name") not in pppoe_names]

        def route_rows_for_interface(iface_name):
            matched = [route for route in default_routes if route_matches_interface(route, iface_name)]
            if not matched and len(non_pppoe_wan_interfaces) == 1:
                matched = active_defaults
            return [
                {
                    "active": to_bool(route.get("active")),
                    "distance": route.get("distance", "-"),
                    "table": route.get("routing-table", "-"),
                    "comment": route.get("comment", ""),
                }
                for route in matched[:4]
            ]

        def interface_access(iface, dhcp_client):
            iface_type = str(iface.get("type") or "").lower()
            name = str(iface.get("name") or "").lower()
            if dhcp_client:
                return "DHCP"
            if iface_type == "vlan" or iface.get("vlanId") or "vlan" in name:
                return "VLAN"
            if iface.get("ips"):
                return "Static"
            return "Unknown"

        for iface in non_pppoe_wan_interfaces:
            name = iface.get("name", "-")
            history = self.line_history.setdefault(name, {"up": deque(maxlen=HISTORY_LIMIT), "down": deque(maxlen=HISTORY_LIMIT)})
            if update_rate_history:
                history["up"].append(None if rate_history_break else to_int(iface.get("txRate")))
                history["down"].append(None if rate_history_break else to_int(iface.get("rxRate")))
            dhcp_client = dhcp_clients_by_interface.get(name, {})
            running = bool(iface.get("running")) and not bool(iface.get("disabled"))
            route_rows = route_rows_for_interface(name)
            if dhcp_client:
                route_rows.insert(
                    0,
                    {
                        "active": running and to_bool(dhcp_client.get("add-default-route", True)),
                        "distance": dhcp_client.get("default-route-distance", "-"),
                        "table": "main",
                        "comment": "DHCP client default route",
                    }
                )
            access = interface_access(iface, dhcp_client)
            rows.append(
                {
                    "name": name,
                    "status": "在线" if running else "离线",
                    "running": running,
                    "parent": iface.get("type", "-"),
                    "addresses": list(iface.get("ips") or []),
                    "upRate": to_int(iface.get("txRate")),
                    "downRate": to_int(iface.get("rxRate")),
                    "rxBytes": to_int(iface.get("rxBytes")),
                    "txBytes": to_int(iface.get("txBytes")),
                    "history": {"up": list(history["up"]), "down": list(history["down"])},
                    "routes": route_rows,
                    "kind": "interface",
                    "lineId": name,
                    "access": access,
                }
            )
        return rows

    def extract_local_ip(self, conn, local_networks, router_ips):
        candidates = [
            ("src-address", "reply-src-address"),
            ("reply-src-address", "src-address"),
            ("dst-address", "reply-dst-address"),
            ("reply-dst-address", "dst-address"),
        ]
        for local_key, remote_key in candidates:
            address = conn.get(local_key)
            if not address or address in router_ips:
                continue
            try:
                ip_obj = ipaddress.ip_address(address)
            except Exception:
                continue
            if any(ip_obj in network for network in local_networks):
                return address, conn.get(remote_key, "-"), local_key
        return None, None, None

    def build_terminals_and_connections(self, rest, ssh, local_networks, router_ips):
        leases_by_ip = {row.get("address"): row for row in rest["dhcp_leases"]}
        leases_by_mac = {row.get("mac-address"): row for row in rest["dhcp_leases"] if row.get("mac-address")}
        arp_rows = []
        ip_to_macs = defaultdict(set)
        mac_to_ips = defaultdict(set)
        ip_to_entries = defaultdict(list)
        mac_to_entries = defaultdict(list)
        for item in rest["arp"]:
            address = item.get("address")
            mac = item.get("mac-address")
            if not address or not mac or address in router_ips:
                continue
            try:
                ip_obj = ipaddress.ip_address(address)
            except Exception:
                continue
            if not any(ip_obj in network for network in local_networks):
                continue
            ip_to_macs[address].add(mac)
            mac_to_ips[mac].add(address)
            arp_entry = {"ip": address, "mac": mac, "status": item.get("status", "-"), "evidenceState": arp_evidence_state(item.get("status"))}
            ip_to_entries[address].append(arp_entry)
            mac_to_entries[mac].append(arp_entry)
            lease = leases_by_ip.get(address) or leases_by_mac.get(mac)
            arp_rows.append(
                {
                    "ip": address,
                    "mac": mac,
                    "hostname": (lease or {}).get("host-name", "-"),
                    "status": item.get("status", "-"),
                    "type": "静态" if not to_bool(item.get("dynamic", True)) else "动态",
                    "lastSeen": (lease or {}).get("last-seen", "-"),
                }
            )
        for row in arp_rows:
            row.setdefault("evidenceState", arp_evidence_state(row.get("status")))
        alerts = []
        for ip_addr, macs in ip_to_macs.items():
            if len(macs) > 1:
                alerts.append({"kind": "IP冲突", "value": ip_addr, "detail": ", ".join(sorted(macs))})
        for mac, ips in mac_to_ips.items():
            if len(ips) > 1:
                alerts.append({"kind": "MAC漂移", "value": mac, "detail": ", ".join(sorted(ips, key=ip_sort_key))})

        refined_alerts = []
        for ip_addr, entries in ip_to_entries.items():
            if len({entry["mac"] for entry in entries}) > 1:
                refined_alerts.append(make_arp_alert("IP conflict", ip_addr, entries, "mac"))
        for mac, entries in mac_to_entries.items():
            if len({entry["ip"] for entry in entries}) > 1:
                refined_alerts.append(make_arp_alert("MAC drift", mac, entries, "ip"))
        if refined_alerts:
            refined_alerts.sort(key=lambda row: (ACTION_SEVERITY_RANK.get(row.get("severity"), 3), row.get("kind", ""), str(row.get("value", ""))))
            alerts = refined_alerts

        terminal_stats = defaultdict(lambda: {"up": 0.0, "down": 0.0, "connections": 0, "sessionBytes": 0})
        active_rows = []
        for conn in ssh["active_connections"]:
            local_ip, remote_ip, local_key = self.extract_local_ip(conn, local_networks, router_ips)
            if not local_ip:
                continue
            if local_key in {"src-address", "dst-address"}:
                up_rate = to_int(conn.get("orig-rate"))
                down_rate = to_int(conn.get("repl-rate"))
            else:
                up_rate = to_int(conn.get("repl-rate"))
                down_rate = to_int(conn.get("orig-rate"))
            terminal_stats[local_ip]["up"] += up_rate
            terminal_stats[local_ip]["down"] += down_rate
            terminal_stats[local_ip]["connections"] += 1
            session_bytes = to_int(conn.get("orig-bytes")) + to_int(conn.get("repl-bytes"))
            terminal_stats[local_ip]["sessionBytes"] += session_bytes
            active_rows.append(
                {
                    "localIp": local_ip,
                    "remoteIp": remote_ip or "-",
                    "protocol": str(conn.get("protocol", "-")).upper(),
                    "upRate": up_rate,
                    "downRate": down_rate,
                    "timeout": conn.get("timeout", "-"),
                    "mark": conn.get("connection-mark", "-"),
                    "totalRate": up_rate + down_rate,
                    "sessionBytes": session_bytes,
                }
            )

        ipv6_neighbor_candidates = {}
        for item in rest.get("ipv6_neighbors", []):
            address = item.get("address")
            if not address or address in router_ips:
                continue
            try:
                ip_obj = ipaddress.ip_address(address)
            except Exception:
                continue
            if ip_obj.version != 6:
                continue
            mac = item.get("mac-address") or ""
            lease = leases_by_mac.get(mac)
            key = mac or address
            is_link_local = ip_obj.is_link_local
            status = item.get("status", "-")
            score = 0
            if not is_link_local:
                score += 10
            if status == "reachable":
                score += 4
            elif status == "stale":
                score += 2
            elif status == "delay":
                score += 1
            if mac:
                score += 1
            candidate = {
                "ip": address,
                "mac": mac or (lease or {}).get("mac-address", "-"),
                "hostname": (lease or {}).get("host-name", "-"),
                "status": status,
                "lastSeen": (lease or {}).get("last-seen", "-"),
                "score": score,
            }
            existing = ipv6_neighbor_candidates.get(key)
            if not existing or candidate["score"] > existing["score"]:
                ipv6_neighbor_candidates[key] = candidate

        arp_by_ip = {row["ip"]: row for row in arp_rows}
        terminals = []
        seen = set()
        for row in arp_rows:
            ip_addr = row["ip"]
            if ip_addr in seen:
                continue
            seen.add(ip_addr)
            stats = terminal_stats[ip_addr]
            terminals.append(
                {
                    "ip": ip_addr,
                    "mac": row["mac"],
                    "hostname": row["hostname"],
                    "status": row["status"],
                    "lastSeen": row["lastSeen"],
                    "upRate": stats["up"],
                    "downRate": stats["down"],
                    "connections": stats["connections"],
                    "sessionBytes": stats["sessionBytes"],
                }
            )
        for ip_addr, stats in terminal_stats.items():
            if ip_addr in seen:
                continue
            seen.add(ip_addr)
            arp_row = arp_by_ip.get(ip_addr, {})
            lease = leases_by_ip.get(ip_addr) or leases_by_mac.get(arp_row.get("mac"))
            terminals.append(
                {
                    "ip": ip_addr,
                    "mac": arp_row.get("mac") or (lease or {}).get("mac-address", "-"),
                    "hostname": arp_row.get("hostname") or (lease or {}).get("host-name", "-"),
                    "status": arp_row.get("status") or "active",
                    "lastSeen": arp_row.get("lastSeen") or (lease or {}).get("last-seen", "-"),
                    "upRate": stats["up"],
                    "downRate": stats["down"],
                    "connections": stats["connections"],
                    "sessionBytes": stats["sessionBytes"],
                }
            )
        for row in ipv6_neighbor_candidates.values():
            ip_addr = row["ip"]
            if ip_addr in seen:
                continue
            seen.add(ip_addr)
            stats = terminal_stats[ip_addr]
            terminals.append(
                {
                    "ip": ip_addr,
                    "mac": row["mac"],
                    "hostname": row["hostname"],
                    "status": row["status"],
                    "lastSeen": row["lastSeen"],
                    "upRate": stats["up"],
                    "downRate": stats["down"],
                    "connections": stats["connections"],
                    "sessionBytes": stats["sessionBytes"],
                }
            )
        terminals.sort(key=lambda row: (row["upRate"] + row["downRate"], row["connections"]), reverse=True)
        active_rows.sort(key=lambda row: row["totalRate"], reverse=True)
        protocol_buckets = {}
        for row in active_rows:
            protocol = str(row.get("protocol") or "-").upper()
            mark = str(row.get("mark") or "").strip()
            mark = "" if mark in {"", "-"} else mark
            bucket_key = f"{protocol}|{mark}"
            if bucket_key not in protocol_buckets:
                protocol_buckets[bucket_key] = {
                    "name": f"{protocol} / {mark}" if mark else f"{protocol} 活跃流量",
                    "protocol": protocol,
                    "mark": mark or "-",
                    "connections": 0,
                    "upRate": 0.0,
                    "downRate": 0.0,
                    "totalRate": 0.0,
                    "sessionBytes": 0,
                    "source": "active-connection-sample",
                }
            bucket = protocol_buckets[bucket_key]
            bucket["connections"] += 1
            bucket["upRate"] += to_int(row.get("upRate"))
            bucket["downRate"] += to_int(row.get("downRate"))
            bucket["totalRate"] += to_int(row.get("totalRate"))
            bucket["sessionBytes"] += to_int(row.get("sessionBytes"))
        protocol_top_rows = sorted(
            protocol_buckets.values(),
            key=lambda row: (row["totalRate"], row["connections"], row["sessionBytes"]),
            reverse=True,
        )[:20]
        arp_items = sorted(arp_rows, key=lambda row: ip_sort_key(row["ip"]))[:120]
        active_connection_items = active_rows[:ACTIVE_CONNECTION_LIMIT]
        return {
            "terminalCount": len(terminals),
            "terminals": terminals,
            "arp": arp_items,
            "arpAlerts": alerts[:20],
            "activeConnections": active_connection_items,
            "meta": {
                "terminals": list_scale_meta(len(terminals), len(terminals), sampled=False, sorted_by="traffic/connections"),
                "arp": list_scale_meta(len(arp_rows), len(arp_items), limit=120, sampled=len(arp_items) < len(arp_rows), sample_method="first 120 sorted by IP", sorted_by="ip"),
                "activeConnections": list_scale_meta(
                    len(active_rows),
                    len(active_connection_items),
                    limit=ACTIVE_CONNECTION_LIMIT,
                    sampled=True,
                    sample_method="SSH connection detail sample, active rate rows first",
                    sorted_by="totalRate",
                ),
                "protocolTop": list_scale_meta(
                    len(protocol_buckets),
                    len(protocol_top_rows),
                    limit=20,
                    sampled=bool(active_rows),
                    sample_method="active connection detail sample grouped by protocol/connection mark",
                    sorted_by="traffic/connections",
                ),
            },
            "protocolTop": protocol_top_rows,
            "topIpConnections": [
                {
                    "ip": row["ip"],
                    "hostname": row["hostname"],
                    "connections": row["connections"],
                    "upRate": row["upRate"],
                    "downRate": row["downRate"],
                }
                for row in terminals[:20]
            ],
        }

    def build_dhcp(self, rest):
        server_to_pool = {
            item.get("name"): item.get("address-pool")
            for item in rest["dhcp_servers"]
            if item.get("name") and item.get("address-pool")
        }
        used_by_pool = defaultdict(int)
        for item in rest.get("pool_used", []):
            pool_name = item.get("pool")
            if pool_name:
                used_by_pool[pool_name] += 1
        if not used_by_pool:
            for item in rest["dhcp_leases"]:
                if str(item.get("status", "")).lower() != "bound":
                    continue
                pool_name = server_to_pool.get(item.get("server"))
                if pool_name:
                    used_by_pool[pool_name] += 1
        pools = []
        for item in rest["pools"]:
            pool_name = item.get("name", "-")
            total = count_pool_addresses(item.get("ranges"))
            used = used_by_pool.get(pool_name, 0)
            available = max(total - used, 0) if total else 0
            pools.append(
                {
                    "name": pool_name,
                    "ranges": item.get("ranges", "-"),
                    "used": used,
                    "total": total,
                    "available": available,
                    "usage": round((used / total) * 100, 2) if total else 0,
                }
            )
        leases = [
            {
                "address": item.get("address", "-"),
                "hostname": item.get("host-name", "-"),
                "mac": item.get("mac-address", "-"),
                "server": item.get("server", "-"),
                "status": item.get("status", "-"),
                "lastSeen": item.get("last-seen", "-"),
                "static": not to_bool(item.get("dynamic", True)),
            }
            for item in rest["dhcp_leases"]
        ]
        leases.sort(key=lambda row: (row["status"] != "bound", ip_sort_key(row["address"])))
        servers = [
            {
                "name": item.get("name", "-"),
                "interface": item.get("interface", "-"),
                "pool": item.get("address-pool", "-"),
                "leaseTime": item.get("lease-time", "-"),
                "running": not to_bool(item.get("disabled")),
            }
            for item in rest["dhcp_servers"]
        ]
        visible_leases = leases[:120]
        return {
            "pools": pools,
            "leases": visible_leases,
            "servers": servers,
            "meta": {
                "leases": list_scale_meta(
                    len(leases),
                    len(visible_leases),
                    limit=120,
                    sampled=len(visible_leases) < len(leases),
                    sample_method="first 120 sorted by status and IP",
                    sorted_by="status/ip",
                    grouped_by=["status", "server", "static"],
                ),
                "pools": list_scale_meta(len(pools), len(pools), sampled=False),
                "servers": list_scale_meta(len(servers), len(servers), sampled=False),
            },
        }

    def build_dns(self, rest):
        dns = rest["dns"]
        dns_static_meta = rest.get("dns_static_meta", {})
        def split_values(value):
            if isinstance(value, list):
                return [str(item).strip() for item in value if str(item).strip()]
            return [item.strip() for item in str(value or "").split(",") if item.strip()]

        servers = split_values(dns.get("servers", []))
        dns_static_rows = rest["dns_static"] or dns_static_meta.get("preview") or []
        forward_rules = [
            {
                "name": item.get("name") or item.get("regexp", "-"),
                "type": item.get("type", "-"),
                "value": item.get("address") or item.get("cname") or item.get("text") or "-",
                "ttl": item.get("ttl", "-"),
                "comment": item.get("comment", ""),
                "disabled": to_bool(item.get("disabled")),
            }
            for item in dns_static_rows[:DNS_STATIC_PREVIEW_LIMIT]
        ]
        ipv6_nd = []
        for item in rest.get("ipv6_nd", []):
            ipv6_nd.append(
                {
                    "interface": item.get("interface", "-"),
                    "advertiseDns": to_bool(item.get("advertise-dns")),
                    "dnsServers": split_values(item.get("dns-servers") or item.get("dns")),
                    "managed": to_bool(item.get("managed-address-configuration")),
                    "otherConfig": to_bool(item.get("other-configuration")),
                    "raLifetime": item.get("ra-lifetime", "-"),
                }
            )
        ipv6_dhcp_clients = [
            {
                "interface": item.get("interface", "-"),
                "status": item.get("status", "-"),
                "pool": item.get("pool-name", "-"),
                "prefix": item.get("prefix") or item.get("address") or "-",
                "usePeerDns": to_bool(item.get("use-peer-dns")),
                "request": item.get("request", "-"),
                "addDefaultRoute": to_bool(item.get("add-default-route")),
                "defaultRouteDistance": item.get("default-route-distance", "-"),
                "dhcpOptions": item.get("dhcp-options", ""),
            }
            for item in rest.get("ipv6_dhcp_clients", [])
        ]
        ipv6_dhcp_clients.sort(key=lambda row: (row["status"] != "bound", row["interface"]))
        return {
            "running": to_bool(dns.get("allow-remote-requests")),
            "servers": servers,
            "cacheSize": to_int(dns.get("cache-size")),
            "cacheUsed": to_int(dns.get("cache-used")),
            "cacheEntries": 0,
            "forwardRuleCount": dns_static_total_count_from_meta(dns_static_meta, len(dns_static_rows)),
            "visibleRuleCount": len(forward_rules),
            "disabledForwardRuleCount": sum(1 for item in dns_static_rows if to_bool(item.get("disabled"))),
            "forwardRuleSample": to_bool(dns_static_meta.get("sample")),
            "forwardRules": forward_rules,
            "dohServer": dns.get("use-doh-server") or dns.get("doh-server", ""),
            "verifyDohCert": to_bool(dns.get("verify-doh-cert")),
            "ipv6Nd": ipv6_nd,
            "ipv6DhcpClients": ipv6_dhcp_clients,
        }

    def build_security(self, rest):
        filters = [
            {
                "rawOrder": index + 1,
                "id": item.get(".id", ""),
                "chain": item.get("chain", "-"),
                "action": item.get("action", "-"),
                "comment": item.get("comment", ""),
                "packets": to_int(item.get("packets")),
                "bytes": to_int(item.get("bytes")),
                "disabled": to_bool(item.get("disabled")),
                "passthrough": item.get("passthrough", ""),
                "connectionMark": item.get("connection-mark", ""),
                "packetMark": item.get("packet-mark", ""),
                "routingMark": item.get("routing-mark", ""),
                "inInterface": item.get("in-interface", ""),
                "outInterface": item.get("out-interface", ""),
                "srcAddress": item.get("src-address", ""),
                "dstAddress": item.get("dst-address", ""),
            }
            for index, item in enumerate(rest["filters"])
        ]
        address_lists = []
        for item in rest["address_lists"][:100]:
            list_name = item.get("list", "-")
            category = "黑名单" if "black" in list_name.lower() else "白名单" if "white" in list_name.lower() else "地址集"
            address_lists.append(
                {
                    "list": list_name,
                    "address": item.get("address", "-"),
                    "timeout": item.get("timeout", "-"),
                    "comment": item.get("comment", ""),
                    "category": category,
                }
            )
        alerts = []
        for item in rest["logs"]:
            topics = str(item.get("topics", ""))
            message = str(item.get("message", ""))
            if any(word in topics for word in ["firewall", "warning", "error", "critical"]) or "drop" in message.lower():
                affected = topics or "firewall"
                alerts.append(
                    {
                        "abnormal": message or topics or "Firewall log event",
                        "affected": affected,
                        "firstSeen": item.get("time", "-"),
                        "lastConfirmed": item.get("time", "-"),
                        "recovered": False,
                        "time": item.get("time", "-"),
                        "topics": topics,
                        "message": message,
                    }
                )
        return {"filters": filters[:120], "addressLists": address_lists, "alerts": alerts[:40]}

    def build_load_balance(self, rest, distribution):
        defaults = [item for item in rest["routes"] if item.get("dst-address") == "0.0.0.0/0"]
        active_defaults = [item for item in defaults if to_bool(item.get("active"))]
        pcc_detected = False
        mangle_rules = []
        for index, item in enumerate(rest["mangle"]):
            comment = str(item.get("comment", ""))
            if item.get("per-connection-classifier") or "pcc" in comment.lower():
                pcc_detected = True
            if item.get("action") in {"mark-routing", "mark-connection", "accept"}:
                mangle_rules.append(
                    {
                        "rawOrder": index + 1,
                        "id": item.get(".id", ""),
                        "chain": item.get("chain", "-"),
                        "action": item.get("action", "-"),
                        "comment": comment,
                        "newRoutingMark": item.get("new-routing-mark", "-"),
                        "passthrough": item.get("passthrough", ""),
                        "connectionMark": item.get("connection-mark", ""),
                        "newConnectionMark": item.get("new-connection-mark", ""),
                        "packetMark": item.get("packet-mark", ""),
                        "newPacketMark": item.get("new-packet-mark", ""),
                        "routingMark": item.get("routing-mark", ""),
                        "inInterface": item.get("in-interface", ""),
                        "outInterface": item.get("out-interface", ""),
                        "srcAddress": item.get("src-address", ""),
                        "dstAddress": item.get("dst-address", ""),
                        "pcc": item.get("per-connection-classifier", ""),
                        "disabled": to_bool(item.get("disabled")),
                        "packets": to_int(item.get("packets")),
                        "bytes": to_int(item.get("bytes")),
                    }
                )
        if len(active_defaults) > 1 and pcc_detected:
            mode = "多线分流 / 策略路由"
        elif len(active_defaults) > 1:
            mode = "多线路容灾 / 优先级切换"
        else:
            mode = "单线路"
        return {
            "mode": mode,
            "activeLines": len(active_defaults),
            "distribution": distribution,
            "defaultRoutes": [
                {
                    "gateway": item.get("gateway", "-"),
                    "distance": item.get("distance", "-"),
                    "table": item.get("routing-table", "-"),
                    "active": to_bool(item.get("active")),
                    "comment": item.get("comment", ""),
                }
                for item in defaults
            ],
            "mangleRules": mangle_rules[:120],
            "routingRules": [
                {
                    "rawOrder": index + 1,
                    "id": item.get(".id", ""),
                    "action": item.get("action", "-"),
                    "table": item.get("table", "-"),
                    "routingMark": item.get("routing-mark", "-"),
                    "srcAddress": item.get("src-address", "-"),
                    "dstAddress": item.get("dst-address", "-"),
                    "interface": item.get("interface", "-"),
                    "comment": item.get("comment", ""),
                    "disabled": to_bool(item.get("disabled")),
                    "inactive": to_bool(item.get("inactive")),
                }
                for index, item in enumerate(rest["routing_rules"][:120])
            ],
            "pccDetected": pcc_detected,
        }

    def build_routes(self, rest):
        rows = []
        for item in rest["routes"]:
            dst_address = item.get("dst-address", "-")
            is_default = dst_address in {"0.0.0.0/0", "::/0"}
            is_static = to_bool(item.get("static"))
            is_dynamic = to_bool(item.get("dynamic"))
            is_disabled = to_bool(item.get("disabled"))
            is_active = to_bool(item.get("active"))
            rows.append(
                {
                    "dstAddress": dst_address,
                    "gateway": item.get("gateway", "-"),
                    "distance": item.get("distance", "-"),
                    "table": item.get("routing-table", "-"),
                    "active": is_active,
                    "disabled": is_disabled,
                    "static": is_static,
                    "dynamic": is_dynamic,
                    "default": is_default,
                    "comment": item.get("comment", ""),
                    "family": "IPv6" if ":" in str(dst_address) else "IPv4",
                }
            )

        rows.sort(
            key=lambda row: (
                not row["default"],
                not row["static"],
                row["disabled"],
                not row["active"],
                row["table"],
                row["distance"],
                row["dstAddress"],
            )
        )
        static_rows = [row for row in rows if row["static"]]
        default_rows = [row for row in rows if row["default"]]
        tables = {row["table"] for row in rows if row["table"] not in {"", "-"}}
        return {
            "tableCount": len(tables),
            "staticCount": len(static_rows),
            "activeStaticCount": len([row for row in static_rows if row["active"] and not row["disabled"]]),
            "defaultCount": len(default_rows),
            "dynamicCount": len([row for row in rows if row["dynamic"]]),
            "items": rows[:160],
            "defaultRoutes": default_rows[:80],
            "staticRoutes": static_rows[:120],
        }

    def build_logs(self, rest):
        groups = {"system": [], "firewall": [], "dhcp": [], "dns": [], "all": []}
        for item in rest["logs"][:200]:
            row = {"time": item.get("time", "-"), "topics": item.get("topics", "-"), "message": item.get("message", "-")}
            groups["all"].append(row)
            topics = str(item.get("topics", ""))
            if "firewall" in topics:
                groups["firewall"].append(row)
            elif "dhcp" in topics:
                groups["dhcp"].append(row)
            elif "dns" in topics:
                groups["dns"].append(row)
            else:
                groups["system"].append(row)
        return {key: value[:60] for key, value in groups.items()}

    def build_snapshot(self, rest, ssh, fresh_counter_sample=False):
        connection_counts = copy.deepcopy(ssh.get("counts", {}))
        counted_total = to_int(connection_counts.get("tcp")) + to_int(connection_counts.get("udp")) + to_int(connection_counts.get("icmp"))
        connection_counts["all"] = max(to_int(connection_counts.get("all")), counted_total)
        ssh = {**ssh, "counts": connection_counts}
        has_counter_sample = bool(
            fresh_counter_sample
            and any(
                item.get("name") and ("rx-byte" in item or "tx-byte" in item)
                for item in rest.get("interfaces", [])
            )
        )
        rates = self.compute_rates(rest["interfaces"], fresh_counter_sample=has_counter_sample)
        quality = self.compute_interface_quality(rest["interfaces"], fresh_counter_sample=has_counter_sample)
        with self.lock:
            rate_sample_ready = bool(self.last_rate_sample_ready)
            counter_reset = bool(self.last_counter_reset)
        update_rate_history = bool(has_counter_sample and (rate_sample_ready or counter_reset))
        rate_history_break = bool(has_counter_sample and counter_reset)
        addresses_by_interface, local_networks, router_ips = self.build_maps(rest)
        pppoe, distribution = self.build_pppoe(
            rest,
            rates,
            addresses_by_interface,
            update_rate_history=update_rate_history,
            rate_history_break=rate_history_break,
        )
        interfaces = self.build_interfaces(rest, rates, addresses_by_interface, quality)
        wan_lines = self.build_wan_lines(
            rest,
            pppoe,
            interfaces,
            update_rate_history=update_rate_history,
            rate_history_break=rate_history_break,
        )
        wan_latency = self.get_wan_latency()
        pppoe = self.attach_wan_latency(pppoe, wan_latency)
        wan_lines = self.attach_wan_latency(wan_lines, wan_latency)
        if wan_lines:
            distribution = build_distribution_from_lines(wan_lines)
        wan_source = [row for row in wan_lines if row.get("running")] or list(wan_lines)
        wan_totals = {
            "up": sum(to_int(row.get("upRate")) for row in wan_source),
            "down": sum(to_int(row.get("downRate")) for row in wan_source),
        }
        terminals = self.build_terminals_and_connections(rest, ssh, local_networks, router_ips)
        dhcp = self.build_dhcp(rest)
        ipv6_interface_count = sum(
            1 for row in interfaces if any(":" in str(ip_addr) for ip_addr in row.get("ips", []))
        )
        ipv6_terminal_count = sum(
            1 for row in terminals["terminals"] if ":" in str(row.get("ip", ""))
        )
        capabilities = build_panel_capabilities(wan_lines, len(pppoe))
        wan_line_count = len(wan_lines)
        active_connection_shown = len(terminals.get("activeConnections", []))
        scale_meta = {
            "wan": list_scale_meta(wan_line_count, len(wan_lines), sampled=False, sorted_by="natural interface name", grouped_by=["status", "parent", "routeTable"]),
            "pppoe": list_scale_meta(len(pppoe), len(pppoe), sampled=False, sorted_by="natural interface name"),
            "interfaces": list_scale_meta(len(interfaces), len(interfaces), sampled=False, sorted_by="role/name/quality", grouped_by=["role", "type", "status", "qualityEvidenceLevel"]),
            "terminals": terminals.get("meta", {}).get("terminals", list_scale_meta(terminals["terminalCount"], len(terminals["terminals"]))),
            "arp": terminals.get("meta", {}).get("arp", list_scale_meta(len(terminals["arp"]), len(terminals["arp"]))),
            "dhcpLeases": dhcp.get("meta", {}).get("leases", list_scale_meta(len(dhcp.get("leases", [])), len(dhcp.get("leases", [])))),
            "connectionsActive": {
                **terminals.get("meta", {}).get("activeConnections", list_scale_meta(active_connection_shown, active_connection_shown, sampled=True)),
                "actualCount": ssh["counts"]["all"],
                "totalCount": ssh["counts"]["all"],
                "hasMore": active_connection_shown < ssh["counts"]["all"],
            },
            "dnsStatic": list_scale_meta(
                dns_static_total_count_from_meta(rest.get("dns_static_meta", {}), DNS_STATIC_PREVIEW_LIMIT),
                len(rest.get("dns_static", [])),
                limit=DNS_STATIC_PREVIEW_LIMIT,
                sampled=True,
                sample_method="preview rows; full browser uses /api/dns-static pagination",
                sorted_by="RouterOS order",
            ),
            "firewallFilters": list_scale_meta(
                len(rest.get("filters", [])),
                min(len(rest.get("filters", [])), 120),
                limit=120,
                sampled=len(rest.get("filters", [])) > 120,
                sample_method="first 120 RouterOS filter rules",
                sorted_by="RouterOS raw order",
            ),
            "addressLists": list_scale_meta(
                len(rest.get("address_lists", [])),
                min(len(rest.get("address_lists", [])), 100),
                limit=100,
                sampled=len(rest.get("address_lists", [])) > 100,
                sample_method="first 100 RouterOS address-list rows",
                sorted_by="RouterOS raw order",
            ),
            "mangleRules": list_scale_meta(
                len(rest.get("mangle", [])),
                min(len(rest.get("mangle", [])), 120),
                limit=120,
                sampled=len(rest.get("mangle", [])) > 120,
                sample_method="first 120 RouterOS mangle rules",
                sorted_by="RouterOS raw order",
            ),
            "routingRules": list_scale_meta(
                len(rest.get("routing_rules", [])),
                min(len(rest.get("routing_rules", [])), 120),
                limit=120,
                sampled=len(rest.get("routing_rules", [])) > 120,
                sample_method="first 120 RouterOS routing rules",
                sorted_by="RouterOS raw order",
            ),
        }
        resource = rest["resource"]
        total_memory = to_int(resource.get("total-memory"))
        used_memory = max(total_memory - to_int(resource.get("free-memory")), 0)
        total_disk = to_int(resource.get("total-hdd-space"))
        used_disk = max(total_disk - to_int(resource.get("free-hdd-space")), 0)
        self.history["cpu"].append(to_int(resource.get("cpu-load")))
        self.history["memory"].append(round((used_memory / total_memory) * 100, 2) if total_memory else 0)
        self.history["disk"].append(round((used_disk / total_disk) * 100, 2) if total_disk else 0)
        self.history["timestamps"].append(int(time.time()))
        if update_rate_history:
            rate_up = None if rate_history_break else wan_totals["up"]
            rate_down = None if rate_history_break else wan_totals["down"]
            self.history["uplink"].append(rate_up)
            self.history["downlink"].append(rate_down)
        with self.lock:
            rate_history_updated_at = self.last_counter_sample_at
            rate_history_sample_count = self.rate_history_sample_count
            quality_updated_at = self.last_quality_sample_at
            quality_sample_count = self.interface_quality_sample_count
        snapshot = {
            "status": "ok",
            "updatedAt": format_iso_now(),
            "error": None,
            "meta": {
                "target": PANEL_TARGET,
                "routerHost": public_router_config()["host"],
                "routerLogin": public_router_config(),
                "pollSeconds": POLL_SECONDS,
                "realtimeUpdatedAt": self.realtime_updated_at,
                "realtimeError": self.realtime_error,
                "realtimeLastErrorAt": self.realtime_last_error_at,
                "realtimeDurationSeconds": self.realtime_duration_seconds,
                "staticPollSeconds": STATIC_POLL_SECONDS,
                "staticRestWorkers": STATIC_REST_WORKERS,
                "slowRestPollSeconds": SLOW_REST_POLL_SECONDS,
                "slowRestWorkers": SLOW_REST_WORKERS,
                "slowRestUpdatedAt": self.slow_updated_at,
                "slowRestError": self.slow_error,
                "slowRestLastErrorAt": self.slow_last_error_at,
                "slowRestDurationSeconds": self.slow_duration_seconds,
                "connectionDetailPollSeconds": CONNECTION_DETAIL_POLL_SECONDS,
                "detailRestWorkers": DETAIL_REST_WORKERS,
                "connectionProtocolPollSeconds": CONNECTION_PROTOCOL_BREAKDOWN_INTERVAL_SECONDS,
                "staticUpdatedAt": self.static_updated_at,
                "staticError": self.static_error,
                "staticLastErrorAt": self.static_last_error_at,
                "staticDurationSeconds": self.static_duration_seconds,
                "staticEndpointFailures": copy.deepcopy(self.static_failures),
                "realtimeEndpointFailures": copy.deepcopy(self.realtime_failures),
                "slowRestEndpointFailures": copy.deepcopy(self.slow_failures),
                "detailEndpointFailures": copy.deepcopy(self.detail_failures),
                "connectionProtocolUpdatedAt": ssh.get("protocolUpdatedAt"),
                "connectionDetailUpdatedAt": ssh.get("detailUpdatedAt"),
                "connectionProtocolError": ssh.get("protocolError"),
                "connectionProtocolLastErrorAt": ssh.get("protocolLastErrorAt"),
                "connectionProtocolDurationSeconds": ssh.get("protocolDurationSeconds"),
                "connectionDetailError": ssh.get("detailError"),
                "connectionDetailLastErrorAt": ssh.get("detailLastErrorAt"),
                "connectionDetailDurationSeconds": ssh.get("detailDurationSeconds"),
                "ipv6AddressCount": len(rest.get("ipv6_addresses", [])),
                "ipv6NeighborCount": len(rest.get("ipv6_neighbors", [])),
                "ipv6InterfaceCount": ipv6_interface_count,
                "ipv6TerminalCount": ipv6_terminal_count,
                "profile": PANEL_PROFILE,
                "capabilities": capabilities,
                "pppoeCount": len(pppoe),
                "wanCount": wan_line_count,
                "lineCount": wan_line_count,
                "lineLayoutTier": line_layout_tier(wan_line_count),
                "wanLatency": copy.deepcopy(wan_latency),
                "freshCounterSample": bool(has_counter_sample),
                "rateSampleReady": bool(rate_sample_ready),
                "counterReset": bool(counter_reset),
                "rateHistoryBreak": bool(rate_history_break),
                "rateHistoryUpdatedAt": rate_history_updated_at,
                "rateHistorySampleCount": rate_history_sample_count,
                "qualityUpdatedAt": quality_updated_at,
                "qualitySampleCount": quality_sample_count,
                "scale": scale_meta,
            },
            "overview": self.build_overview(rest, ssh, terminals["terminalCount"], wan_totals, wan_latency),
            "interfaces": interfaces,
            "pppoe": pppoe,
            "wan": wan_lines,
            "terminals": terminals["terminals"],
            "arp": {"items": terminals["arp"], "alerts": terminals["arpAlerts"]},
            "dhcp": dhcp,
            "connections": {
                "total": ssh["counts"]["all"],
                "tcp": ssh["counts"]["tcp"],
                "udp": ssh["counts"]["udp"],
                "icmp": ssh["counts"]["icmp"],
                "protocolTop": terminals["protocolTop"],
                "topIps": terminals["topIpConnections"],
                "active": terminals["activeConnections"],
                "thresholdLevel": rate_level(min(ssh["counts"]["all"] / 120000, 1)),
                "protocolUpdatedAt": ssh.get("protocolUpdatedAt"),
                "detailUpdatedAt": ssh.get("detailUpdatedAt"),
                "protocolError": ssh.get("protocolError"),
                "protocolLastErrorAt": ssh.get("protocolLastErrorAt"),
                "protocolDurationSeconds": ssh.get("protocolDurationSeconds"),
                "detailError": ssh.get("detailError"),
                "detailLastErrorAt": ssh.get("detailLastErrorAt"),
                "detailDurationSeconds": ssh.get("detailDurationSeconds"),
                "meta": {
                    "active": scale_meta["connectionsActive"],
                    "topIps": list_scale_meta(len(terminals["topIpConnections"]), len(terminals["topIpConnections"]), sampled=True, sample_method="terminal traffic top list", sorted_by="connections/traffic"),
                    "protocolTop": terminals.get("meta", {}).get("protocolTop", list_scale_meta(0, 0, sampled=True, sample_method="active connection detail sample", sorted_by="traffic/connections")),
                },
            },
            "dns": self.build_dns(rest),
            "security": self.build_security(rest),
            "loadBalance": self.build_load_balance(rest, distribution),
            "routes": self.build_routes(rest),
            "logs": self.build_logs(rest),
        }
        snapshot = normalize_collector_snapshot_status(snapshot)
        snapshot = self.apply_ip_aliases_to_snapshot(snapshot, dict(self.ip_aliases))
        findings = build_health_findings(snapshot)
        snapshot["statusFindings"] = findings
        snapshot["healthFindings"] = findings
        return snapshot

    def update_state(self, fresh_counter_sample=False):
        snapshot = self.build_snapshot(
            self.merge_rest_bundle(),
            self.merge_connection_bundle(),
            fresh_counter_sample=fresh_counter_sample,
        )
        with self.lock:
            self.state = snapshot

    def realtime_loop(self):
        while True:
            if not self.require_router_config_for_collection():
                time.sleep(1)
                continue
            started_at = time.monotonic()
            try:
                realtime_rest = self.fetch_rest_bundle(REALTIME_REST_ENDPOINTS)
                duration = round(time.monotonic() - started_at, 2)
                now = format_iso_now()
                with self.lock:
                    failures = realtime_rest.pop("_failures", {})
                    for key, value in realtime_rest.items():
                        if key not in failures:
                            self.realtime_rest[key] = value
                    self.realtime_failures = failures
                    self.realtime_updated_at = now
                    self.realtime_error = None
                    self.realtime_last_error_at = None
                    self.realtime_duration_seconds = duration
                self.update_state(fresh_counter_sample=True)
            except Exception as exc:
                with self.lock:
                    self.realtime_error = str(exc)
                    self.realtime_last_error_at = format_iso_now()
                    self.realtime_duration_seconds = round(time.monotonic() - started_at, 2)
                    self.state = {**copy.deepcopy(self.state), "status": "error", "updatedAt": format_iso_now(), "error": str(exc)}
            elapsed = time.monotonic() - started_at
            time.sleep(max(0, POLL_SECONDS - elapsed))

    def slow_rest_loop(self):
        while True:
            if not self.require_router_config_for_collection():
                time.sleep(1)
                continue
            started_at = time.monotonic()
            try:
                slow_rest = self.fetch_rest_bundle(SLOW_REST_ENDPOINTS, workers=SLOW_REST_WORKERS)
                duration = round(time.monotonic() - started_at, 2)
                now = format_iso_now()
                with self.lock:
                    failures = slow_rest.pop("_failures", {})
                    for key, value in slow_rest.items():
                        if key not in failures:
                            self.slow_rest[key] = value
                    self.slow_failures = failures
                    self.slow_updated_at = now
                    self.slow_error = None
                    self.slow_last_error_at = None
                    self.slow_duration_seconds = duration
                self.update_state()
            except Exception as exc:
                with self.lock:
                    self.slow_error = str(exc)
                    self.slow_last_error_at = format_iso_now()
                    self.slow_duration_seconds = round(time.monotonic() - started_at, 2)
                self.update_state()
            elapsed = time.monotonic() - started_at
            time.sleep(max(0, SLOW_REST_POLL_SECONDS - elapsed))

    def connection_protocol_loop(self):
        while True:
            if not self.require_router_config_for_collection():
                time.sleep(1)
                continue
            started_at = time.monotonic()
            try:
                tracking = self.fetch_connection_tracking_summary()
                duration = round(time.monotonic() - started_at, 2)
                now = format_iso_now()
                with self.lock:
                    self.connection_summary["counts"]["all"] = tracking["total"]
                    self.connection_summary["counts"]["tcp"] = None
                    self.connection_summary["counts"]["udp"] = None
                    self.connection_summary["counts"]["icmp"] = None
                    self.connection_summary["protocolUpdatedAt"] = now
                    self.connection_summary["protocolError"] = None
                    self.connection_summary["protocolLastErrorAt"] = None
                    self.connection_summary["protocolDurationSeconds"] = duration
                self.update_state()
            except Exception as exc:
                duration = round(time.monotonic() - started_at, 2)
                with self.lock:
                    self.connection_summary["protocolError"] = str(exc)
                    self.connection_summary["protocolLastErrorAt"] = format_iso_now()
                    self.connection_summary["protocolDurationSeconds"] = duration
                self.update_state()
            elapsed = time.monotonic() - started_at
            time.sleep(max(0, CONNECTION_PROTOCOL_POLL_SECONDS - elapsed))

    def static_loop(self):
        while True:
            if not self.require_router_config_for_collection():
                time.sleep(1)
                continue
            started_at = time.monotonic()
            try:
                dns_static_count = 0
                static_rest = self.fetch_rest_bundle(STATIC_REST_ENDPOINTS, workers=STATIC_REST_WORKERS)
                with self.lock:
                    failures = static_rest.pop("_failures", {})
                    for key, value in static_rest.items():
                        if key not in failures:
                            self.static_rest[key] = value
                    if failures:
                        self.static_failures = failures
                    else:
                        self.static_failures = {}
                    self.static_error = None
                    self.static_last_error_at = None
                try:
                    dns_static_count = self.fetch_dns_static_count()
                    with self.lock:
                        self.static_rest["dns_static_meta"] = {
                            "count": dns_static_count,
                            "total_count": dns_static_count,
                            "sample": dns_static_count > len(self.static_rest.get("dns_static", [])),
                        }
                except Exception:
                    pass
                try:
                    dns_static_preview = self.fetch_dns_static_preview(dns_static_count)
                    with self.lock:
                        self.static_rest["dns_static"] = dns_static_preview
                        self.static_rest["dns_static_meta"] = {
                            "count": dns_static_count or len(dns_static_preview),
                            "total_count": dns_static_count or len(dns_static_preview),
                            "sample": (dns_static_count or len(dns_static_preview)) > len(dns_static_preview),
                        }
                except Exception:
                    pass
                with self.lock:
                    self.static_duration_seconds = round(time.monotonic() - started_at, 2)
                    self.static_updated_at = format_iso_now()
                self.update_state()
            except Exception as exc:
                with self.lock:
                    self.static_error = str(exc)
                    self.static_last_error_at = format_iso_now()
                    self.static_duration_seconds = round(time.monotonic() - started_at, 2)
                self.update_state()
            elapsed = time.monotonic() - started_at
            time.sleep(max(0, STATIC_POLL_SECONDS - elapsed))

    def connection_detail_loop(self):
        while True:
            if not self.require_router_config_for_collection():
                time.sleep(1)
                continue
            started_at = time.monotonic()
            try:
                with ThreadPoolExecutor(max_workers=2) as executor:
                    detail_future = executor.submit(self.fetch_connection_detail)
                    detail_rest_future = executor.submit(
                        self.fetch_rest_bundle,
                        DETAIL_REST_ENDPOINTS,
                        DETAIL_REST_WORKERS,
                    )
                    detail = detail_future.result()
                    detail_rest = detail_rest_future.result()
                detail_failures = detail_rest.pop("_failures", {})
                duration = round(time.monotonic() - started_at, 2)
                now = format_iso_now()
                with self.lock:
                    self.connection_detail = {
                        **detail,
                        "updatedAt": now,
                        "detailError": None,
                        "detailLastErrorAt": None,
                        "detailDurationSeconds": duration,
                    }
                    for key, value in detail_rest.items():
                        if key not in detail_failures:
                            self.realtime_rest[key] = value
                    self.detail_failures = detail_failures
                self.update_state()
            except Exception as exc:
                duration = round(time.monotonic() - started_at, 2)
                with self.lock:
                    self.connection_detail["detailError"] = str(exc)
                    self.connection_detail["detailLastErrorAt"] = format_iso_now()
                    self.connection_detail["detailDurationSeconds"] = duration
                self.update_state()
            elapsed = time.monotonic() - started_at
            time.sleep(connection_detail_sleep_seconds(elapsed))

    def start(self):
        for target in (self.slow_rest_loop, self.static_loop, self.connection_detail_loop, self.realtime_loop, self.connection_protocol_loop):
            thread = threading.Thread(target=target, daemon=True)
            thread.start()

    def get_state(self):
        with self.lock:
            snapshot = copy.deepcopy(self.state)
        snapshot = normalize_collector_snapshot_status(snapshot)
        meta = snapshot.setdefault("meta", {})
        meta.setdefault("profile", PANEL_PROFILE)
        meta.setdefault("capabilities", build_panel_capabilities(snapshot.get("wan") or [], len(snapshot.get("pppoe") or [])))
        findings = snapshot.get("healthFindings") or snapshot.get("statusFindings") or build_health_findings(snapshot)
        snapshot["statusFindings"] = findings
        snapshot["healthFindings"] = findings
        return snapshot

    def get_status_findings(self):
        return build_health_findings(self.get_state())

    def build_readonly_diagnostics(self):
        def dns_job(server_config, domain_config, qtype):
            if server_config.get("address") == "system":
                row = system_dns_query(domain_config["domain"], qtype)
            else:
                row = dns_query(server_config["address"], domain_config["domain"], qtype)
            row["service"] = domain_config["name"]
            row["expected"] = domain_config["expected"]
            row["serverName"] = server_config["name"]
            return row

        def dns_timeout_row(server_config, domain_config, qtype):
            return {
                "server": server_config["address"],
                "domain": domain_config["domain"],
                "type": "AAAA" if qtype == 28 else "A",
                "answers": [],
                "fakeIp": False,
                "rcode": None,
                "elapsedMs": round(READONLY_DIAGNOSTIC_TOTAL_TIMEOUT * 1000),
                "error": "readonly probe timeout",
                "service": domain_config["name"],
                "expected": domain_config["expected"],
                "serverName": server_config["name"],
            }

        def service_timeout_row(target):
            return {
                "name": target.get("name", "-"),
                "url": target.get("url", "-"),
                "expected": target.get("expected", "-"),
                "status": None,
                "ok": False,
                "elapsedMs": round(READONLY_DIAGNOSTIC_TOTAL_TIMEOUT * 1000),
                "finalHost": None,
                "error": "readonly probe timeout",
            }

        def exit_timeout_row(target):
            return {
                "name": target.get("name", "-"),
                "url": target.get("url", "-"),
                "ip": None,
                "raw": "",
                "elapsedMs": round(READONLY_DIAGNOSTIC_TOTAL_TIMEOUT * 1000),
                "error": "readonly probe timeout",
            }

        dns_matrix = []
        service_reachability = []
        tcp_reachability = []
        exit_checks = []
        executor = ThreadPoolExecutor(max_workers=max(1, READONLY_DIAGNOSTIC_WORKERS))
        futures = {}
        try:
            dns_servers = [
                *copy.deepcopy(READONLY_DNS_SERVERS),
                {"name": "Panel System DNS", "address": "system"},
            ]
            for domain_config in READONLY_DNS_DOMAINS:
                for server_config in dns_servers:
                    for qtype in (1, 28):
                        futures[executor.submit(dns_job, server_config, domain_config, qtype)] = (
                            "dns",
                            server_config,
                            domain_config,
                            qtype,
                        )
            for target in READONLY_HTTP_TARGETS:
                futures[executor.submit(http_probe, target)] = ("service", target)
            for target in READONLY_HTTP_TARGETS:
                futures[executor.submit(tcp_probe, target)] = ("tcp", target)
            for target in READONLY_EXIT_TARGETS:
                futures[executor.submit(exit_probe, target)] = ("exit", target)

            done, pending = wait(futures.keys(), timeout=READONLY_DIAGNOSTIC_TOTAL_TIMEOUT)
            for future in done:
                meta = futures[future]
                try:
                    result = future.result()
                except Exception as exc:
                    if meta[0] == "dns":
                        result = dns_timeout_row(meta[1], meta[2], meta[3])
                    elif meta[0] == "service":
                        result = service_timeout_row(meta[1])
                    elif meta[0] == "exit":
                        result = exit_timeout_row(meta[1])
                    else:
                        result = service_timeout_row(meta[1])
                    result["error"] = str(exc)
                if meta[0] == "dns":
                    dns_matrix.append(result)
                elif meta[0] == "service":
                    service_reachability.append(result)
                elif meta[0] == "tcp":
                    tcp_reachability.append(result)
                else:
                    exit_checks.append(result)

            for future in pending:
                meta = futures[future]
                future.cancel()
                if meta[0] == "dns":
                    dns_matrix.append(dns_timeout_row(meta[1], meta[2], meta[3]))
                elif meta[0] == "service":
                    service_reachability.append(service_timeout_row(meta[1]))
                elif meta[0] == "tcp":
                    tcp_reachability.append(service_timeout_row(meta[1]))
                else:
                    exit_checks.append(exit_timeout_row(meta[1]))
        finally:
            executor.shutdown(wait=False, cancel_futures=True)
        dns_matrix.sort(key=lambda row: (row.get("service", ""), row.get("serverName", ""), row.get("type", "")))
        service_reachability.sort(key=lambda row: row.get("name", ""))
        tcp_reachability.sort(key=lambda row: row.get("name", ""))
        exit_checks.sort(key=lambda row: row.get("name", ""))
        panel_files = [
            file_mtime_summary(BASE_DIR / "app.py"),
            file_mtime_summary(PUBLIC_DIR / "index.html"),
            file_mtime_summary(PUBLIC_DIR / "layout-whitespace-patch.js"),
            file_mtime_summary(PUBLIC_DIR / "readonly-diagnostics.js"),
        ]
        nikki = nikki_probe()

        return {
            "status": "ok",
            "readOnly": True,
            "generatedAt": format_iso_now(),
            "cacheTtlSeconds": READONLY_DIAGNOSTIC_CACHE_TTL,
            "probeBudgetSeconds": READONLY_DIAGNOSTIC_TOTAL_TIMEOUT,
            "dnsServers": [*copy.deepcopy(READONLY_DNS_SERVERS), {"name": "Panel System DNS", "address": "system"}],
            "dnsDomains": copy.deepcopy(READONLY_DNS_DOMAINS),
            "dnsMatrix": dns_matrix,
            "serviceReachability": service_reachability,
            "tcpReachability": tcp_reachability,
            "exitChecks": exit_checks,
            "panelFiles": panel_files,
            "nikki": nikki,
        }

    def get_readonly_diagnostics(self, force_refresh=False):
        if not READONLY_DIAGNOSTICS_ENABLED:
            return {
                "status": "disabled",
                "readOnly": True,
                "hidden": True,
                "profile": PANEL_PROFILE,
                "generatedAt": format_iso_now(),
                "cached": False,
                "cacheAgeSeconds": 0,
                "reason": "readonly diagnostics disabled for current panel profile",
                "dnsMatrix": [],
                "serviceReachability": [],
                "tcpReachability": [],
                "exitChecks": [],
                "panelFiles": [],
                "nikki": {"ok": False, "disabled": True, "providers": []},
            }
        now = time.time()
        with self.lock:
            cached_payload = copy.deepcopy(self.readonly_diagnostics_cache.get("payload"))
            fetched_at = float(self.readonly_diagnostics_cache.get("fetched_at") or 0.0)
        if (
            not force_refresh
            and cached_payload
            and (now - fetched_at) < READONLY_DIAGNOSTIC_CACHE_TTL
        ):
            cached_payload["cached"] = True
            cached_payload["cacheAgeSeconds"] = round(now - fetched_at, 1)
            return cached_payload

        try:
            payload = self.build_readonly_diagnostics()
        except Exception as exc:
            payload = {
                "status": "error",
                "readOnly": True,
                "generatedAt": format_iso_now(),
                "error": str(exc),
                "dnsMatrix": [],
                "serviceReachability": [],
                "tcpReachability": [],
                "exitChecks": [],
                "panelFiles": [],
                "nikki": {"ok": False, "error": str(exc), "providers": []},
            }
        with self.lock:
            self.readonly_diagnostics_cache = {"fetched_at": time.time(), "payload": copy.deepcopy(payload)}
        payload["cached"] = False
        payload["cacheAgeSeconds"] = 0
        return payload


restore_last_saved_router_login()
collector = Collector()


class Handler(BaseHTTPRequestHandler):
    server_version = "RouterOSTriagePanel/1.0"
    private_public_assets = {"readonly-diagnostics.js"}
    read_only_api_paths = {
        "/api/connection-search",
        "/api/dns-static",
        "/api/health",
        "/api/health-findings",
        "/api/panel-network",
        "/api/readonly-diagnostics",
        "/api/router-login",
        "/api/snapshot",
        "/api/status-findings",
    }
    write_api_paths = {
        "/api/ip-alias",
        "/api/panel-network",
        "/api/router-login",
        "/api/router-login-forget",
        "/api/router-logout",
    }
    bootstrap_write_api_paths = {"/api/router-login"}

    def handle(self):
        try:
            return super().handle()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            return None

    def finish(self):
        try:
            return super().finish()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            return None

    def panel_network_payload(self, **kwargs):
        return panel_network_payload(
            request_url=panel_request_access_url(self.headers, fallback_port=PANEL_PORT),
            **kwargs,
        )

    def queue_cookie_header(self, value):
        pending = getattr(self, "_pending_cookie_headers", [])
        pending.append(value)
        self._pending_cookie_headers = pending

    def consume_cookie_headers(self):
        pending = getattr(self, "_pending_cookie_headers", [])
        self._pending_cookie_headers = []
        return pending

    def request_cookies(self):
        return parse_request_cookies(self.headers.get("Cookie"))

    def current_panel_session(self):
        return get_panel_session(self.request_cookies().get(PANEL_SESSION_COOKIE))

    def issue_panel_session(self):
        session = create_panel_session()
        self.queue_cookie_header(build_panel_cookie(PANEL_SESSION_COOKIE, session["id"], http_only=True))
        self.queue_cookie_header(build_panel_cookie(PANEL_CSRF_COOKIE, session["csrf"], http_only=False))
        return session

    def ensure_panel_session(self, create=False):
        session = self.current_panel_session()
        if session:
            return session
        if not create:
            return None
        return self.issue_panel_session()

    def write_request_guard_is_valid(self, session):
        for header_name in ("X-CSRF-Token", "X-Ros-Panel-CSRF"):
            if csrf_token_matches(session, self.headers.get(header_name)):
                return True
        origin = first_header_value(self.headers.get("Origin"))
        if origin:
            return panel_origin_is_allowed(self.headers, origin)
        referer = first_header_value(self.headers.get("Referer"))
        if referer:
            return panel_origin_is_allowed(self.headers, referer)
        return False

    def require_write_authorization(self, parsed):
        allow_bootstrap = parsed.path in self.bootstrap_write_api_paths
        session = self.ensure_panel_session(create=allow_bootstrap)
        if not session:
            self.send_json_error("Local panel session is required", status=403, code="local_session_required")
            return False
        if not self.write_request_guard_is_valid(session):
            self.send_json_error("CSRF, Origin, or Referer validation failed", status=403, code="csrf_validation_failed")
            return False
        return True

    def reject_non_localhost_request(self, parsed):
        if panel_client_address_is_allowed(self.client_address, self.headers) and panel_host_header_is_allowed(self.headers):
            return False
        if parsed.path.startswith("/api/"):
            self.send_json_error(
                "Panel is localhost-only. Open http://127.0.0.1:28646/.",
                status=403,
                code="localhost_required",
            )
            return True
        body = (
            "<!doctype html><meta charset=\"utf-8\">"
            "<title>localhost only</title>"
            "<body>Panel is localhost-only. Open http://127.0.0.1:28646/.</body>"
        ).encode("utf-8")
        self.send_response(403)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for cookie_header in self.consume_cookie_headers():
            self.send_header("Set-Cookie", cookie_header)
        self.end_headers()
        self.wfile.write(body)
        return True

    def do_GET(self):
        parsed = urlparse(self.path)
        if self.reject_non_localhost_request(parsed):
            return
        session = self.ensure_panel_session(create=True)
        if parsed.path == "/api/router-login":
            return self.send_json(
                {
                    "ok": True,
                    "routerLogin": public_router_config(),
                    "savedLogins": public_saved_router_logins(),
                    "savePasswordAvailable": True,
                    "csrfToken": session.get("csrf"),
                }
            )
        if parsed.path == "/api/panel-network":
            return self.send_json(
                {
                    "ok": True,
                    "panelNetwork": self.panel_network_payload(),
                    "csrfToken": session.get("csrf"),
                }
            )
        if parsed.path == "/api/snapshot":
            return self.send_json(collector.get_state())
        if parsed.path == "/api/connection-search":
            params = parse_qs(parsed.query)
            target_ip = (params.get("target") or params.get("ip") or [""])[0].strip()
            source_ip = (params.get("source") or params.get("src") or [""])[0].strip() or None
            limit = to_int((params.get("limit") or [80])[0], 80)
            if not target_ip:
                return self.send_json_error("target IP is required", status=400, code="bad_request")
            try:
                return self.send_json(collector.fetch_connection_search(target_ip, source_ip=source_ip, limit=limit))
            except ValueError as exc:
                return self.send_json_error(str(exc), status=400, code="bad_request")
            except Exception as exc:
                return self.send_json_error(str(exc), status=502, code="connection_search_failed")
        if parsed.path == "/api/dns-static":
            params = parse_qs(parsed.query)
            offset = to_int((params.get("offset") or [0])[0], 0)
            limit = to_int((params.get("limit") or [DNS_STATIC_PAGE_LIMIT])[0], DNS_STATIC_PAGE_LIMIT)
            rows = collector.fetch_dns_static_page(offset=offset, limit=limit)
            total_count = collector.get_dns_static_total_count()
            normalized_rows = [
                {
                    "name": item.get("name") or item.get("regexp", "-"),
                    "type": item.get("type", "-"),
                    "value": item.get("address") or item.get("cname") or item.get("text") or "-",
                    "ttl": item.get("ttl", "-"),
                    "comment": item.get("comment", ""),
                    "disabled": to_bool(item.get("disabled")),
                }
                for item in rows
            ]
            return self.send_json(
                {
                    "totalCount": total_count,
                    "offset": max(offset, 0),
                    "limit": max(1, min(limit, DNS_STATIC_MAX_PAGE_LIMIT)),
                    "visibleRuleCount": len(normalized_rows),
                    "rows": normalized_rows,
                }
            )
        if parsed.path == "/api/health":
            state = collector.get_state()
            return self.send_json(
                {
                    "status": state.get("status"),
                    "updatedAt": state.get("updatedAt"),
                    "profile": PANEL_PROFILE,
                    "target": PANEL_TARGET,
                    "panelNetwork": self.panel_network_payload(),
                    "routerLogin": public_router_config(),
                    "savedLoginCount": len(public_saved_router_logins()),
                }
            )
        if parsed.path in {"/api/status-findings", "/api/health-findings"}:
            return self.send_json(collector.get_status_findings())
        if parsed.path == "/api/readonly-diagnostics":
            if PUBLIC_ROUTEROS_PROFILE:
                return self.send_json_error(
                    "readonly diagnostics are private in the public RouterOS profile",
                    status=403,
                    code="private_diagnostics_disabled",
                )
            params = parse_qs(parsed.query)
            force_refresh = (params.get("refresh") or ["0"])[0] in {"1", "true", "yes"}
            return self.send_json(collector.get_readonly_diagnostics(force_refresh=force_refresh))
        if parsed.path.startswith("/api/"):
            return self.send_json_error("API route not found", status=404, code="not_found")
        self.serve_static(parsed.path)

    def do_POST(self):
        parsed = urlparse(self.path)
        if self.reject_non_localhost_request(parsed):
            return
        if parsed.path not in self.write_api_paths:
            return self.send_json_error("API route not found", status=404, code="not_found")
        if not self.require_write_authorization(parsed):
            return
        if parsed.path == "/api/router-login":
            try:
                payload = self.read_json_body()
                saved_id = str(payload.get("savedId") or "").strip()
                saved_entry = find_saved_router_login(saved_id) if saved_id else None
                password = payload.get("password")
                using_saved_password = False
                if saved_id and not saved_entry:
                    return self.send_json_error("Saved RouterOS login was not found", status=404, code="saved_login_not_found")
                if saved_entry and not str(password or "").strip():
                    host = saved_entry.get("host")
                    user = saved_entry.get("user")
                    password = saved_entry.get("password")
                    ssh_port = saved_entry.get("sshPort") or 22
                    using_saved_password = True
                else:
                    host = payload.get("host") or payload.get("ip") or payload.get("address")
                    user = payload.get("user") or payload.get("username")
                    ssh_port = payload.get("sshPort") or payload.get("port") or 22
                if saved_entry and not str(password or "").strip():
                    return self.send_json_error(
                        "Saved RouterOS login does not contain a password",
                        status=400,
                        code="saved_login_missing_password",
                    )
                test = test_router_credentials(host, user, password, ssh_port)
                ssh_ok = test.get("ssh", {}).get("ok") is True
                rest_ok = test.get("rest", {}).get("ok") is True
                if not ssh_ok and not rest_ok:
                    return self.send_json_error(
                        router_login_failure_message(test),
                        status=400,
                        code="router_login_failed",
                        test=test,
                    )
                remember_raw = payload.get("rememberPassword", False)
                remember_password = remember_raw is True
                remembered_entry = None
                if remember_password:
                    remembered_entry = remember_router_login(
                        host,
                        user,
                        password,
                        ssh_port,
                        last_test=test,
                        source="saved" if using_saved_password else "ui",
                    )
                    saved_id = remembered_entry.get("id")
                router_login = set_router_config(
                    host,
                    user,
                    password,
                    ssh_port,
                    source="saved" if using_saved_password else "ui",
                    last_test=test,
                    saved_id=(saved_id if using_saved_password or remembered_entry else None),
                )
                collector.reset_collection_state(status="starting", error=None)
                return self.send_json(
                    {
                        "ok": True,
                        "routerLogin": router_login,
                        "savedLogins": public_saved_router_logins(),
                        "test": test,
                        "warning": router_login_warning(test),
                    }
                )
            except ValueError as exc:
                return self.send_json_error(str(exc), status=400, code="bad_request")
            except Exception as exc:
                return self.send_internal_error(exc)
        if parsed.path == "/api/panel-network":
            try:
                payload = self.read_json_body()
                bind = normalize_panel_host(payload.get("bind") or payload.get("listenHost"), "bind")
                port = normalize_panel_port(payload.get("port"))
                target = normalize_panel_host(
                    payload.get("target") or payload.get("accessHost") or bind,
                    "access host",
                )
                saved_env_path = write_panel_network_env(bind, port, target)
                restart_required = bind != PANEL_BIND or port != PANEL_PORT or target != PANEL_TARGET
                active = panel_network_payload(restart_required=False)
                saved = panel_network_payload(bind=bind, port=port, target=target, restart_required=restart_required)
                saved["envFile"] = str(saved_env_path)
                return self.send_json(
                    {
                        "ok": True,
                        "panelNetwork": saved,
                        "activePanelNetwork": active,
                        "restartRequired": restart_required,
                        "nextUrl": saved["currentUrl"],
                        "message": "Saved. Restart the panel service for bind/port changes to take effect.",
                    }
                )
            except PermissionError as exc:
                return self.send_json_error(
                    str(exc),
                    status=409,
                    code="panel_network_read_only",
                    panelNetwork=self.panel_network_payload(),
                )
            except ValueError as exc:
                return self.send_json_error(str(exc), status=400, code="bad_request")
            except Exception as exc:
                return self.send_internal_error(exc)
        if parsed.path == "/api/router-logout":
            router_login = clear_router_config()
            collector.reset_collection_state(
                status="needs_config",
                error="RouterOS SSH connection is not configured",
            )
            return self.send_json({"ok": True, "routerLogin": router_login, "savedLogins": public_saved_router_logins()})
        if parsed.path == "/api/router-login-forget":
            try:
                payload = self.read_json_body()
                saved_id = payload.get("id") or payload.get("savedId")
                removed = forget_router_login(saved_id)
                return self.send_json(
                    {
                        "ok": True,
                        "removed": removed,
                        "routerLogin": public_router_config(),
                        "savedLogins": public_saved_router_logins(),
                    }
                )
            except ValueError as exc:
                return self.send_json_error(str(exc), status=400, code="bad_request")
            except Exception as exc:
                return self.send_internal_error(exc)
        if parsed.path == "/api/ip-alias":
            if not IP_ALIAS_WRITE_ENABLED:
                return self.send_json_error("ip alias write disabled", status=403, code="write_disabled")
            try:
                payload = self.read_json_body()
                result = collector.update_ip_alias(payload.get("ip"), payload.get("name"))
                return self.send_json({"ok": True, **result})
            except ValueError as exc:
                return self.send_json_error(str(exc), status=400, code="bad_request")
            except Exception as exc:
                return self.send_internal_error(exc)
        return self.send_json_error("API route not found", status=404, code="not_found")

    def log_message(self, format, *args):
        return

    def read_json_body(self):
        declared_length = to_int(self.headers.get("Content-Length"), 0)
        if declared_length > 16384:
            raise ValueError("Request body exceeds 16 KB")
        content_length = max(declared_length, 0)
        if content_length <= 0:
            return {}
        body = self.rfile.read(content_length)
        if not body:
            return {}
        try:
            return json.loads(body.decode("utf-8"))
        except Exception as exc:
            raise ValueError("Request body is not valid JSON") from exc

    def send_json_error(self, message, status=400, code="error", **extra):
        payload = {
            "ok": False,
            "error": str(message or "Request failed"),
            "code": str(code or "error"),
            "status": int(status),
        }
        payload.update(extra)
        return self.send_json(payload, status=status)

    def send_internal_error(self, exc):
        print(f"[panel] internal API error: {type(exc).__name__}", file=sys.stderr)
        return self.send_json_error("Internal panel error", status=500, code="internal_error")

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            for cookie_header in self.consume_cookie_headers():
                self.send_header("Set-Cookie", cookie_header)
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            return None

    def serve_static(self, path):
        clean = unquote(path)
        asset_name = clean.lstrip("/")
        if PUBLIC_ROUTEROS_PROFILE and asset_name in self.private_public_assets:
            self.send_response(403)
            self.send_header("Cache-Control", "no-store")
            for cookie_header in self.consume_cookie_headers():
                self.send_header("Set-Cookie", cookie_header)
            self.end_headers()
            return
        file_path = (PUBLIC_DIR / clean.lstrip("/")).resolve() if clean not in {"", "/"} else (PUBLIC_DIR / "index.html").resolve()
        try:
            if PUBLIC_DIR.resolve() not in file_path.parents and file_path != (PUBLIC_DIR / "index.html").resolve():
                raise FileNotFoundError
            if not file_path.exists() or file_path.is_dir():
                raise FileNotFoundError
            body = file_path.read_bytes()
            mime = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
            self.send_response(200)
            self.send_header("Content-Type", f"{mime}; charset=utf-8" if mime.startswith("text/") else mime)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            for cookie_header in self.consume_cookie_headers():
                self.send_header("Set-Cookie", cookie_header)
            self.end_headers()
            self.wfile.write(body)
        except FileNotFoundError:
            self.send_response(404)
            for cookie_header in self.consume_cookie_headers():
                self.send_header("Set-Cookie", cookie_header)
            self.end_headers()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            return None


def main():
    collector.start()
    server = ReusableThreadingHTTPServer((PANEL_BIND, PANEL_PORT), Handler)
    url = panel_access_url(PANEL_BIND, PANEL_PORT, PANEL_TARGET)
    print(f"RouterOS Triage Panel listening on {url}", flush=True)
    if PANEL_ENV_FILE:
        print(f"Loaded config file: {PANEL_ENV_FILE}", flush=True)
    if PANEL_OPEN_BROWSER:
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
