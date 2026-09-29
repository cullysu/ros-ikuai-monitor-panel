"""Panel address/origin/session guard primitives (backend split batch 6).

Owns the panel bind/target defaults, proxy/localhost-forward flags, the
in-memory session store, and every guard that decides which panel requests
are allowed. app.py re-exports all public names via from-import.
"""
import copy
import ipaddress
import json
import os
import re
import secrets
import sys
import threading
import time
from http import cookies
from pathlib import Path
from urllib.parse import urlparse

from ros_panel.util import env_value


# Same base-dir resolution as app.py BASE_DIR (frozen executables keep data files next to the
# executable); ros_panel modules must not import app, so it is restated here.
if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys.executable).resolve().parent
else:
    BASE_DIR = Path(__file__).resolve().parent.parent


def resolve_runtime_path(value, base_dir=BASE_DIR):
    path = Path(value).expanduser()
    if not path.is_absolute():
        path = base_dir / path
    return path.resolve()


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

# App 级派生值的镜像绑定：env 文件加载与 profile 派生链只能发生在 app.py（导入顺序敏感），
# app.py 在引导完成后把真实值回填到这里；守卫函数按本模块全局在调用时读取，
# tests/tools 对这些 flag 的 patch 靶即 ros_panel.panel_access 模块对象。
# 下方默认值与无 env 环境的引导结果一致，仅作回填前的保守占位。
PANEL_PROFILE_RAW = "routeros_only"
PUBLIC_ROUTEROS_PROFILE = True
PANEL_BIND = DEFAULT_PANEL_BIND
PANEL_PORT = DEFAULT_PANEL_PORT
PANEL_TARGET = DEFAULT_PANEL_TARGET
PANEL_ENV_FILE = None


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
