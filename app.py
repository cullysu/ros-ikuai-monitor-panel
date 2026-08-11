import copy
import hashlib
import ipaddress
import json
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
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

import requests

from panel_backend.collector_transport import RouterCollectorTransport
from panel_backend.collector_service import CollectorServiceMixin, bind_collector_runtime
from panel_backend.collector_evidence import ConnectionEvidenceParser
from panel_backend.config_store import RouterProfileStore, RouterProfileStoreCorruptError
from panel_backend.public_diagnostics import sanitize_saved_connection_test
from panel_backend.request_source import (
    parse_origin_authority,
    parse_referer_authority,
    source_authority_is_allowed,
)
from panel_backend.router_transport import (
    PinnedHostKeyPolicy,
    SshHostKeyConfirmationRequired,
    SshHostKeyMismatch,
    build_rest_url,
    configure_rest_session,
    normalize_rest_port,
    normalize_rest_scheme,
    normalize_router_host,
    normalize_router_ssh_port,
    normalize_router_transport,
    normalize_ssh_fingerprint,
    rest_channel_has_verified_identity,
    validate_rest_security,
)
from panel_backend.session_security import SessionStore, SlidingWindowRateLimiter
from panel_backend.supplemental_contract import (
    CONNECTION_SEARCH_MAX_LIMIT as PUBLIC_CONNECTION_SEARCH_MAX_LIMIT,
    DNS_STATIC_MAX_PAGE_SIZE as PUBLIC_DNS_STATIC_MAX_PAGE_SIZE,
    SupplementalConnectionGuard,
)
from panel_backend.trust_binding import (
    SshTrustChallengeError,
    issue_ssh_trust_challenge,
    verify_ssh_trust_challenge,
)
from panel_backend.http_dispatcher import create_panel_handler
from panel_backend.interface_metrics import (
    InterfaceMetricsMixin,
    bind_interface_metrics_runtime,
    interface_is_derived,
    interface_logical_pair_key,
    interface_parent_hint,
    interface_quality_group_key,
)
from panel_backend.rate_evidence import complete_rate_total, observed_rate
from panel_backend.snapshot_builder import SnapshotBuilderMixin, bind_snapshot_runtime
from panel_backend.time_contract import (
    enforce_public_timestamp_contract,
    optional_rfc3339_timestamp,
    require_rfc3339_timestamp,
    unix_timestamp_rfc3339,
    utc_now_rfc3339,
)

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


def bounded_config_int(value, default, minimum, maximum):
    if minimum > maximum:
        raise ValueError("Invalid bounded integer range")
    raw = default if value in (None, "") else value
    parsed = int(raw)
    return max(minimum, min(maximum, parsed))


def read_bounded_json_response(response, max_bytes, label="RouterOS"):
    safe_max = bounded_config_int(max_bytes, 1, 1, 64 * 1024 * 1024)
    content_length = response.headers.get("Content-Length")
    if content_length not in (None, ""):
        try:
            declared_length = int(content_length)
        except (TypeError, ValueError) as exc:
            raise RuntimeError(f"{label} returned an invalid Content-Length") from exc
        if declared_length < 0 or declared_length > safe_max:
            raise RuntimeError(f"{label} exceeded the safe response limit of {safe_max} bytes")

    chunks = []
    total = 0
    for chunk in response.iter_content(chunk_size=min(65536, safe_max)):
        if not chunk:
            continue
        total += len(chunk)
        if total > safe_max:
            raise RuntimeError(f"{label} exceeded the safe response limit of {safe_max} bytes")
        chunks.append(chunk)
    try:
        return json.loads(b"".join(chunks).decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"{label} returned invalid JSON") from exc


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True

    def handle_error(self, request, client_address):
        exc = sys.exc_info()[1]
        if isinstance(exc, (BrokenPipeError, ConnectionResetError, ConnectionAbortedError)):
            return
        super().handle_error(request, client_address)


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
PANEL_LOCAL_SETTINGS_ENV_KEYS = ("ROS_PANEL_BIND", "ROS_PANEL_PORT", "ROS_PANEL_TARGET_IP")


def parse_linux_default_gateway_hosts(route_text):
    gateways = set()
    for line in str(route_text or "").splitlines()[1:]:
        fields = line.split()
        if len(fields) < 4 or fields[1] != "00000000":
            continue
        try:
            flags = int(fields[3], 16)
            gateway_bytes = bytes.fromhex(fields[2])
            gateway = ipaddress.IPv4Address(gateway_bytes[::-1])
        except (ValueError, IndexError):
            continue
        if flags & 0x3 == 0x3 and not gateway.is_unspecified:
            gateways.add(str(gateway))
    # Docker host-forward is a narrow trust exception. If the namespace has
    # more than one distinct default gateway, there is no single peer we can
    # safely identify as the host-side forwarder, so fail closed.
    return frozenset(gateways) if len(gateways) == 1 else frozenset()


def discover_linux_default_gateway_hosts(route_path="/proc/net/route"):
    if os.name != "posix":
        return frozenset()
    try:
        route_text = Path(route_path).read_text(encoding="ascii")
    except (OSError, UnicodeError):
        return frozenset()
    return parse_linux_default_gateway_hosts(route_text)


# The public name describes the actual boundary: this permits writing only the
# panel's local sidecar address settings. Keep the old, ambiguous name as a
# compatibility fallback for existing private installs.
PANEL_LOCAL_SETTINGS_WRITE_ENABLED_RAW = str(
    env_value(
        "ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED",
        env_value("ROS_PANEL_NETWORK_WRITE_ENABLED", "auto"),
    )
).strip().lower()
PANEL_TRUST_PROXY_HEADERS = str(env_value("ROS_PANEL_TRUST_PROXY_HEADERS", "0")).strip().lower() in {"1", "true", "yes", "on"}
PANEL_ALLOW_LOCALHOST_HOST_FORWARD = str(env_value("ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD", "0")).strip().lower() in {"1", "true", "yes", "on"}
PANEL_LOCALHOST_FORWARD_HEADER = "X-Ros-Panel-Localhost-Forward"
PANEL_LOCALHOST_FORWARD_TOKEN = str(env_value("ROS_PANEL_LOCALHOST_FORWARD_TOKEN", "")).strip()
PANEL_ALLOW_DOCKER_HOST_FORWARD = str(env_value("ROS_PANEL_ALLOW_DOCKER_HOST_FORWARD", "0")).strip().lower() in {"1", "true", "yes", "on"}
PANEL_DOCKER_HOST_FORWARD_PEERS = discover_linux_default_gateway_hosts()


def validate_panel_forwarding_contract(docker_host_forward, proxy_headers, token_forward):
    if docker_host_forward and proxy_headers:
        raise ValueError("Docker host-forward mode cannot trust proxy headers")
    if docker_host_forward and token_forward:
        raise ValueError("Docker host-forward mode and token-forward mode are mutually exclusive")


validate_panel_forwarding_contract(
    PANEL_ALLOW_DOCKER_HOST_FORWARD,
    PANEL_TRUST_PROXY_HEADERS,
    PANEL_ALLOW_LOCALHOST_HOST_FORWARD,
)
PANEL_SESSION_COOKIE = "ros_panel_session"
PANEL_CSRF_COOKIE = "ros_panel_csrf"
PANEL_SESSION_TTL_SECONDS = 8 * 60 * 60
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
        request_host = None
        if PANEL_ALLOW_DOCKER_HOST_FORWARD or PANEL_ALLOW_LOCALHOST_HOST_FORWARD:
            request_host = parse_panel_request_host(headers, fallback_port=PANEL_PORT)
        if PANEL_ALLOW_DOCKER_HOST_FORWARD:
            try:
                normalized_peer = str(parse_ip_literal(peer_host))
            except ValueError:
                normalized_peer = ""
            if (
                normalized_peer in PANEL_DOCKER_HOST_FORWARD_PEERS
                and request_host
                and is_loopback_panel_host(request_host[0])
            ):
                return True
        if PANEL_ALLOW_LOCALHOST_HOST_FORWARD:
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
    return parse_origin_authority(value, normalize_panel_host, normalize_panel_port)


def parse_panel_referer(value):
    return parse_referer_authority(value, normalize_panel_host, normalize_panel_port)


def parse_panel_request_source(headers):
    request_host = parse_panel_request_host(headers, fallback_port=PANEL_PORT)
    if not request_host:
        return None
    scheme = first_header_value((headers or {}).get("X-Forwarded-Proto")).lower() if PANEL_TRUST_PROXY_HEADERS else ""
    if scheme and scheme not in {"http", "https"}:
        return None
    return (scheme or "http"), *request_host


def panel_source_authority_is_allowed(headers, source):
    return source_authority_is_allowed(source, parse_panel_request_source(headers), is_loopback_panel_host)


def panel_origin_is_allowed(headers, value):
    return panel_source_authority_is_allowed(headers, parse_panel_origin(value))


def panel_referer_is_allowed(headers, value):
    return panel_source_authority_is_allowed(headers, parse_panel_referer(value))


def parse_request_cookies(cookie_header):
    jar = cookies.SimpleCookie()
    try:
        jar.load(str(cookie_header or ""))
    except cookies.CookieError:
        return {}
    return {name: morsel.value for name, morsel in jar.items()}


def prune_panel_sessions(now=None):
    del now
    return PANEL_SESSION_STORE.size()


def create_panel_session():
    return PANEL_SESSION_STORE.create()


def get_panel_session(token):
    return PANEL_SESSION_STORE.get(token)


def issue_panel_ssh_trust_challenge(session_id, host, ssh_port, fingerprint, *, rest_scheme="https"):
    return issue_ssh_trust_challenge(
        PANEL_SSH_TRUST_CHALLENGE_SECRET,
        session_id,
        host,
        ssh_port,
        fingerprint,
        rest_scheme=rest_scheme,
        ttl_seconds=PANEL_SSH_TRUST_CHALLENGE_TTL_SECONDS,
    )


def verify_panel_ssh_trust_challenge(session_id, token, host, ssh_port, fingerprint, *, rest_scheme="https"):
    return verify_ssh_trust_challenge(
        PANEL_SSH_TRUST_CHALLENGE_SECRET,
        token,
        session_id,
        host,
        ssh_port,
        fingerprint,
        rest_scheme=rest_scheme,
    )


def build_panel_cookie(name, value, max_age=None, http_only=True):
    if max_age is None:
        max_age = PANEL_SESSION_TTL_SECONDS
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
    write_status = panel_local_settings_write_status(env_path)
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


def panel_local_settings_write_status(path=None):
    path = Path(path).resolve() if path else panel_env_write_path()
    if PANEL_LOCAL_SETTINGS_WRITE_ENABLED_RAW in {"0", "false", "no", "off", "disabled", "read_only", "readonly"}:
        return {
            "envFile": str(path),
            "exists": path.exists(),
            "parent": str(path.parent),
            "writable": False,
            "mode": "disabled",
            "scope": "panel-local-listen-address-only",
            "routerosConfigWrites": False,
            "setting": "ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED",
            "message": "Panel address settings are read-only in this delivery mode. Edit the installer/env file and restart the panel instead. This setting never writes RouterOS configuration.",
        }
    parent = path.parent
    probe_parent = parent
    while not probe_parent.exists() and probe_parent != probe_parent.parent:
        probe_parent = probe_parent.parent
    writable = os.access(path, os.W_OK) if path.exists() else os.access(probe_parent, os.W_OK)
    message = (
        "Panel address settings can be saved to the local env file. This changes only the panel's local listen address and never writes RouterOS configuration."
        if writable
        else "Panel address settings are read-only in this delivery mode. Edit the installer/env file and restart the panel instead. This setting never writes RouterOS configuration."
    )
    return {
        "envFile": str(path),
        "exists": path.exists(),
        "parent": str(parent),
        "writable": bool(writable),
        "scope": "panel-local-listen-address-only",
        "routerosConfigWrites": False,
        "setting": "ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED",
        "mode": "auto",
        "message": message,
    }


def write_panel_local_settings_env(bind, port, target, env_path=None):
    bind = normalize_panel_host(bind, "bind")
    port = normalize_panel_port(port)
    target = resolve_panel_access_host(target)
    bind, target = validate_panel_public_contract(bind, target, globals().get("PANEL_PROFILE_RAW", "routeros_only"))
    path = Path(env_path).resolve() if env_path else panel_env_write_path()
    write_status = panel_local_settings_write_status(path)
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
    for key in PANEL_LOCAL_SETTINGS_ENV_KEYS:
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
ROUTER_SSH_HOST_KEY_FINGERPRINT = normalize_ssh_fingerprint(
    env_value("ROS_MONITOR_SSH_HOST_KEY_FINGERPRINT", "")
)
ROUTER_REST_SCHEME = normalize_rest_scheme(env_value("ROS_MONITOR_ROUTER_REST_SCHEME", "https"))
ROUTER_REST_PORT = normalize_rest_port(
    env_value("ROS_MONITOR_ROUTER_REST_PORT", ""),
    ROUTER_REST_SCHEME,
)
ROUTER_REST_VERIFY_TLS = env_bool("ROS_MONITOR_ROUTER_REST_VERIFY_TLS", default=True)
ROUTER_INSECURE_REST_CONFIRMED = env_bool("ROS_MONITOR_INSECURE_REST_CONFIRMED", default=False)
validate_rest_security(ROUTER_REST_SCHEME, ROUTER_REST_VERIFY_TLS, ROUTER_INSECURE_REST_CONFIRMED)
PANEL_PROFILE_RAW = env_value("ROS_PANEL_PROFILE", "routeros_only")
PANEL_BIND = normalize_panel_host(env_value("ROS_PANEL_BIND", DEFAULT_PANEL_BIND), "bind")
PANEL_PORT = normalize_panel_port(env_value("ROS_PANEL_PORT", str(DEFAULT_PANEL_PORT)))
PANEL_TARGET = resolve_panel_access_host(env_value("ROS_PANEL_TARGET_IP", DEFAULT_PANEL_TARGET))
PANEL_BIND, PANEL_TARGET = validate_panel_public_contract(PANEL_BIND, PANEL_TARGET, PANEL_PROFILE_RAW)
PANEL_SESSION_TTL_SECONDS = max(300, int(env_value("ROS_PANEL_SESSION_TTL_SECONDS", str(8 * 60 * 60))))
PANEL_SESSION_MAX = max(8, min(4096, int(env_value("ROS_PANEL_SESSION_MAX", "128"))))
PANEL_SESSION_BOOTSTRAP_LIMIT = max(2, int(env_value("ROS_PANEL_SESSION_BOOTSTRAP_LIMIT", "30")))
PANEL_LOGIN_ATTEMPT_LIMIT = max(2, int(env_value("ROS_PANEL_LOGIN_ATTEMPT_LIMIT", "8")))
PANEL_RATE_LIMIT_WINDOW_SECONDS = max(10, int(env_value("ROS_PANEL_RATE_LIMIT_WINDOW_SECONDS", "60")))
PANEL_SESSION_STORE = SessionStore(PANEL_SESSION_TTL_SECONDS, PANEL_SESSION_MAX)
PANEL_REQUEST_RATE_LIMITER = SlidingWindowRateLimiter(max_keys=1024)
SUPPLEMENTAL_CONNECTION_GUARD = SupplementalConnectionGuard(max_peers=1024)
PANEL_SSH_TRUST_CHALLENGE_TTL_SECONDS = max(
    30,
    min(600, int(env_value("ROS_PANEL_SSH_TRUST_CHALLENGE_TTL_SECONDS", "180"))),
)
PANEL_SSH_TRUST_CHALLENGE_SECRET = secrets.token_bytes(32)
POLL_SECONDS = bounded_config_int(os.getenv("ROS_MONITOR_POLL_SECONDS"), 1, 1, 3600)
HISTORY_LIMIT = bounded_config_int(os.getenv("ROS_MONITOR_HISTORY_LIMIT"), 60, 1, 3600)
RATE_ZERO_CONFIRM_SAMPLES = bounded_config_int(os.getenv("ROS_MONITOR_RATE_ZERO_CONFIRM_SAMPLES"), 2, 1, 10)
ACTIVE_CONNECTION_LIMIT = bounded_config_int(os.getenv("ROS_MONITOR_ACTIVE_CONNECTION_LIMIT"), 80, 1, 2000)
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
    bounded_config_int(
        os.getenv("ROS_MONITOR_CONNECTION_DETAIL_SAMPLE_LIMIT"),
        max(ACTIVE_CONNECTION_LIMIT * 4, 160),
        ACTIVE_CONNECTION_LIMIT,
        8000,
    ),
)
CONNECTION_DETAIL_STREAM_MAX_BYTES = bounded_config_int(
    os.getenv("ROS_MONITOR_CONNECTION_DETAIL_STREAM_MAX_BYTES"),
    131072,
    65536,
    16 * 1024 * 1024,
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
CONNECTION_SEARCH_MAX_LIMIT = PUBLIC_CONNECTION_SEARCH_MAX_LIMIT
CONNECTION_SEARCH_CAPTURE_SECONDS = max(2, int(os.getenv("ROS_MONITOR_CONNECTION_SEARCH_CAPTURE_SECONDS", "4")))
CONNECTION_SEARCH_STREAM_MAX_BYTES = bounded_config_int(
    os.getenv("ROS_MONITOR_CONNECTION_SEARCH_STREAM_MAX_BYTES"),
    262144,
    32768,
    16 * 1024 * 1024,
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
DNS_STATIC_PREVIEW_LIMIT = bounded_config_int(os.getenv("ROS_MONITOR_DNS_STATIC_PREVIEW_LIMIT"), 12, 1, 100)
DNS_STATIC_MAX_PAGE_LIMIT = PUBLIC_DNS_STATIC_MAX_PAGE_SIZE
DNS_STATIC_PAGE_LIMIT = min(
    bounded_config_int(os.getenv("ROS_MONITOR_DNS_STATIC_PAGE_LIMIT"), 50, 1, DNS_STATIC_MAX_PAGE_LIMIT),
    DNS_STATIC_MAX_PAGE_LIMIT,
)
DNS_STATIC_CACHE_TTL = int(os.getenv("ROS_MONITOR_DNS_STATIC_CACHE_TTL", "60"))
DNS_STATIC_FULL_REST_TIMEOUT = int(os.getenv("ROS_MONITOR_DNS_STATIC_FULL_REST_TIMEOUT", "35"))
DNS_STATIC_FULL_REST_MAX_BYTES = bounded_config_int(
    os.getenv("ROS_MONITOR_DNS_STATIC_FULL_MAX_BYTES"), 4 * 1024 * 1024, 65536, 16 * 1024 * 1024
)
SSH_BANNER_PROBE_TIMEOUT = max(0.5, min(3.0, float(os.getenv("ROS_MONITOR_SSH_BANNER_PROBE_TIMEOUT", "1.5"))))
IP_ALIAS_FILE = Path(os.getenv("ROS_PANEL_IP_ALIAS_FILE", str(BASE_DIR / "data" / "ip_aliases.json"))).expanduser()
ROUTER_LOGIN_STORE_FILE = Path(os.getenv("ROS_PANEL_ROUTER_LOGIN_STORE_FILE", str(BASE_DIR / "data" / "router_logins.json"))).expanduser()
ROUTER_LOGIN_HISTORY_LIMIT = bounded_config_int(os.getenv("ROS_PANEL_ROUTER_LOGIN_HISTORY_LIMIT"), 32, 1, 256)
ROUTER_PROFILE_STORE = RouterProfileStore(ROUTER_LOGIN_STORE_FILE, ROUTER_LOGIN_HISTORY_LIMIT)
CUSTOM_NAME_MAX_LENGTH = int(os.getenv("ROS_PANEL_CUSTOM_NAME_MAX_LENGTH", "48"))
READONLY_DIAGNOSTIC_CACHE_TTL = int(os.getenv("ROS_PANEL_READONLY_DIAGNOSTIC_CACHE_TTL", "45"))
READONLY_DIAGNOSTIC_DNS_TIMEOUT = float(os.getenv("ROS_PANEL_READONLY_DIAGNOSTIC_DNS_TIMEOUT", "1.2"))
READONLY_DIAGNOSTIC_HTTP_TIMEOUT = float(os.getenv("ROS_PANEL_READONLY_DIAGNOSTIC_HTTP_TIMEOUT", "2.5"))
READONLY_DIAGNOSTIC_WORKERS = bounded_config_int(os.getenv("ROS_PANEL_READONLY_DIAGNOSTIC_WORKERS"), 24, 1, 64)
READONLY_DIAGNOSTIC_TOTAL_TIMEOUT = float(os.getenv("ROS_PANEL_READONLY_DIAGNOSTIC_TOTAL_TIMEOUT", "8"))
STATUS_FINDINGS_LIMIT = bounded_config_int(os.getenv("ROS_PANEL_STATUS_FINDINGS_LIMIT"), 24, 1, 100)
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
    "clock": endpoint("system/clock", kind="object", fields="date,time,time-zone-name,gmt-offset,dst-active", timeout=4),
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


PANEL_OPEN_BROWSER = env_bool("ROS_PANEL_OPEN_BROWSER", default=is_frozen_app())


def connection_detail_sleep_seconds(elapsed):
    if elapsed < CONNECTION_DETAIL_POLL_SECONDS:
        return max(0, CONNECTION_DETAIL_POLL_SECONDS - elapsed)
    adaptive = int(elapsed * CONNECTION_DETAIL_OVERRUN_MULTIPLIER)
    adaptive = max(CONNECTION_DETAIL_OVERRUN_BACKOFF_SECONDS, adaptive)
    return min(CONNECTION_DETAIL_OVERRUN_BACKOFF_CAP_SECONDS, adaptive)


def format_iso_now():
    return require_rfc3339_timestamp(utc_now_rfc3339())


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
    "sshHostKeyFingerprint": ROUTER_SSH_HOST_KEY_FINGERPRINT,
    "restScheme": ROUTER_REST_SCHEME,
    "restPort": ROUTER_REST_PORT,
    "restVerifyTls": ROUTER_REST_VERIFY_TLS,
    "insecureRestConfirmed": ROUTER_INSECURE_REST_CONFIRMED,
    "source": "env",
    "savedId": None,
    "updatedAt": None,
    "lastTest": None,
}
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
        "sshHostKeyFingerprint": source.get("sshHostKeyFingerprint") or "",
        "restScheme": normalize_rest_scheme(source.get("restScheme")),
        "restPort": normalize_rest_port(source.get("restPort"), source.get("restScheme")),
        "restVerifyTls": source.get("restVerifyTls") is True,
        "insecureRestConfirmed": source.get("insecureRestConfirmed") is True,
        "source": source.get("source") or "memory",
        "savedId": source.get("savedId"),
        "updatedAt": source.get("updatedAt"),
        "passwordSet": bool(password.strip()) and password not in ROUTER_PASSWORD_PLACEHOLDERS,
        "lastTest": sanitize_saved_connection_test(source.get("lastTest")),
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
    if isinstance(exc, SshHostKeyConfirmationRequired):
        return (
            f"RouterOS SSH host key must be confirmed before password authentication for {host}:{port}: "
            f"{exc.algorithm} {exc.fingerprint}"
        )
    if isinstance(exc, SshHostKeyMismatch):
        return (
            f"RouterOS SSH host key changed for {host}:{port}; connection blocked before password authentication. "
            f"Expected {exc.expected}, received {exc.actual}."
        )
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


def open_pinned_ssh_client(config, timeout=SSH_TIMEOUT):
    ssh = require_paramiko()
    client = ssh.SSHClient()
    client.set_missing_host_key_policy(PinnedHostKeyPolicy(config.get("sshHostKeyFingerprint")))
    try:
        client.connect(
            config["host"],
            port=config["sshPort"],
            username=config["user"],
            password=config["password"],
            timeout=timeout,
            banner_timeout=timeout,
            auth_timeout=timeout,
            allow_agent=False,
            look_for_keys=False,
        )
    except Exception:
        client.close()
        raise
    return client


def ssh_capability_status():
    available = paramiko is not None
    router = get_router_config()
    rest_trusted = router.get("restScheme") == "https" and router.get("restVerifyTls") is True
    return {
        "available": available,
        "state": "available" if available else "dependency_missing",
        "label": "SSH 可用" if available else "SSH 依赖缺失",
        "transport": "ssh" if available else "rest-degraded",
        "restTrusted": rest_trusted,
        "degradedModules": [] if available else [
            "连接明细",
            "会话采样",
            "连接协议统计 SSH fallback",
            "DNS 静态计数 SSH fallback",
        ],
        "message": "" if available else "paramiko 未安装；REST 采集继续可用，依赖 SSH 的明细会降级或不可用。",
    }


def set_router_config(
    host,
    user,
    password,
    ssh_port=22,
    *,
    rest_scheme="https",
    rest_port=None,
    rest_verify_tls=True,
    insecure_rest_confirmed=False,
    ssh_host_key_fingerprint="",
    source="ui",
    last_test=None,
    saved_id=None,
):
    transport = normalize_router_transport(
        rest_scheme,
        rest_port,
        rest_verify_tls,
        insecure_rest_confirmed,
        ssh_host_key_fingerprint,
    )
    normalized = {
        "host": normalize_router_host(host),
        "user": str(user or "").strip(),
        "password": str(password or ""),
        "sshPort": normalize_router_ssh_port(ssh_port),
        **transport,
        "source": source,
        "savedId": saved_id,
        "updatedAt": format_iso_now(),
        "lastTest": sanitize_saved_connection_test(last_test),
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


def sanitize_router_login_store_passwords():
    ROUTER_PROFILE_STORE.sanitize()


def public_saved_router_logins():
    return ROUTER_PROFILE_STORE.public_entries()


def find_saved_router_login(saved_id):
    return ROUTER_PROFILE_STORE.find(saved_id)


def remember_router_login(
    host,
    user,
    password,
    ssh_port=22,
    *,
    rest_scheme="https",
    rest_port=None,
    rest_verify_tls=True,
    insecure_rest_confirmed=False,
    ssh_host_key_fingerprint="",
    last_test=None,
    source="ui",
):
    del password
    return ROUTER_PROFILE_STORE.remember(
        host,
        user,
        ssh_port,
        rest_scheme=rest_scheme,
        rest_port=rest_port,
        rest_verify_tls=rest_verify_tls,
        insecure_rest_confirmed=insecure_rest_confirmed,
        ssh_host_key_fingerprint=ssh_host_key_fingerprint,
        last_test=last_test,
        source=source,
    )


def forget_router_login(saved_id):
    saved_id = str(saved_id or "").strip()
    removed = ROUTER_PROFILE_STORE.forget(saved_id)
    with ROUTER_CONFIG_LOCK:
        if ROUTER_CONFIG.get("savedId") == saved_id:
            ROUTER_CONFIG["savedId"] = None
            ROUTER_CONFIG["source"] = "ui"
    return removed



def test_router_credentials(
    host,
    user,
    password,
    ssh_port=22,
    *,
    rest_scheme="https",
    rest_port=None,
    rest_verify_tls=True,
    insecure_rest_confirmed=False,
    ssh_host_key_fingerprint="",
):
    transport = normalize_router_transport(
        rest_scheme,
        rest_port,
        rest_verify_tls,
        insecure_rest_confirmed,
        ssh_host_key_fingerprint,
    )
    config = {
        "host": normalize_router_host(host),
        "user": str(user or "").strip(),
        "password": str(password or ""),
        "sshPort": normalize_router_ssh_port(ssh_port),
        **transport,
    }
    if not config["user"]:
        raise ValueError("RouterOS username is required")
    if not config["password"].strip():
        raise ValueError("RouterOS password is required")

    started_at = time.time()
    test = {
        "ssh": {
            "ok": False,
            "identity": None,
            "error": None,
            "elapsedMs": None,
            "fingerprint": config["sshHostKeyFingerprint"] or None,
            "expectedFingerprint": config["sshHostKeyFingerprint"] or None,
            "algorithm": None,
            "confirmationRequired": False,
            "hostKeyChanged": False,
        },
        "rest": {
            "ok": False,
            "status": None,
            "error": None,
            "elapsedMs": None,
            "scheme": config["restScheme"],
            "port": config["restPort"],
            "verifyTls": config["restVerifyTls"],
        },
    }

    ssh_started = time.time()
    client = None
    try:
        client = open_pinned_ssh_client(config, timeout=SSH_TIMEOUT)
        stdin, stdout, stderr = client.exec_command(":put [/system/identity/get name]", timeout=SSH_TIMEOUT)
        stdout.channel.settimeout(SSH_TIMEOUT)
        stderr.channel.settimeout(SSH_TIMEOUT)
        identity = stdout.read().decode("utf-8", errors="replace").strip()
        error = stderr.read().decode("utf-8", errors="replace").strip()
        exit_status = stdout.channel.recv_exit_status()
        if exit_status != 0 or error:
            raise RuntimeError(error or f"SSH command exited with status {exit_status}")
        test["ssh"].update({"ok": True, "identity": identity or "RouterOS"})
    except SshHostKeyConfirmationRequired as exc:
        test["ssh"].update(
            {
                "error": format_ssh_connect_error(config, exc, timeout=SSH_TIMEOUT),
                "fingerprint": exc.fingerprint,
                "algorithm": exc.algorithm,
                "confirmationRequired": True,
            }
        )
    except SshHostKeyMismatch as exc:
        test["ssh"].update(
            {
                "error": format_ssh_connect_error(config, exc, timeout=SSH_TIMEOUT),
                "fingerprint": exc.actual,
                "expectedFingerprint": exc.expected,
                "algorithm": exc.algorithm,
                "hostKeyChanged": True,
            }
        )
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
    configure_rest_session(session, config)
    try:
        response = session.get(
            build_rest_url(config, "system/resource"),
            timeout=min(REST_TIMEOUT, 8),
            allow_redirects=False,
        )
        test["rest"]["status"] = response.status_code
        if 300 <= response.status_code < 400:
            raise RuntimeError("RouterOS REST redirect was refused; configure the exact HTTPS endpoint")
        response.raise_for_status()
        test["rest"]["ok"] = True
    except Exception as exc:
        test["rest"]["error"] = str(exc)
    finally:
        test["rest"]["elapsedMs"] = round((time.time() - rest_started) * 1000)
        test["elapsedMs"] = round((time.time() - started_at) * 1000)
        session.close()

    return sanitize_saved_connection_test(test)


def router_login_warning(test):
    ssh = (test or {}).get("ssh", {})
    ssh_ok = ssh.get("ok") is True
    rest_ok = (test or {}).get("rest", {}).get("ok") is True
    rest = (test or {}).get("rest", {})
    warnings = []
    if rest.get("scheme") == "http":
        warnings.append("REST 正在使用已明确确认的 HTTP 风险模式，RouterOS 凭据不会被加密。")
    elif rest.get("verifyTls") is False:
        warnings.append("REST 使用 HTTPS，但证书校验已被明确关闭，无法验证设备身份。")
    if rest_ok and not ssh_ok:
        if ssh.get("hostKeyChanged") is True:
            warnings.append("SSH 主机密钥与已固定指纹冲突；SSH 已阻断，旧指纹未更改，当前仅使用已验证 HTTPS REST。")
        elif ssh.get("confirmationRequired") is True:
            warnings.append("SSH 主机密钥尚未固定；SSH 未使用，当前仅使用已验证 HTTPS REST。")
        else:
            warnings.append("REST 管理通道本次请求成功，但 SSH 未完成；依赖 SSH 的明细会降级。")
    elif ssh_ok and not rest_ok:
        warnings.append("SSH 已连接，但 RouterOS REST 未响应；部分面板数据会缺失。")
    return " ".join(warnings) or None


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


HEALTH_PUBLIC_TEXT_BLOCKLIST = re.compile(
    r"(?:https?://|\b(?:password|passwd|token|secret|authorization)\s*[=:]|\btraceback\b|\bexception\b|\bstack\b|/ip/[a-z0-9_/-]+)",
    re.IGNORECASE,
)


def health_public_text(value, limit=160):
    """Keep health findings operational without publishing raw collector diagnostics."""
    if value is None or isinstance(value, (int, float, bool)):
        return value
    text = " ".join(str(value).replace("\x00", "").split())
    if HEALTH_PUBLIC_TEXT_BLOCKLIST.search(text):
        return "Redacted internal diagnostic detail."
    return compact_text(text, limit)


def health_public_evidence(evidence):
    safe = []
    for item in as_list(evidence)[:6]:
        row = as_dict(item)
        label = compact_text(row.get("label"), 80)
        if not label:
            continue
        value = health_public_text(row.get("value"), 160)
        if value is None:
            continue
        safe.append({"label": label, "value": value})
    return safe


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
    snapshot = enforce_public_timestamp_contract(snapshot)
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
    snapshot = as_dict(enforce_public_timestamp_contract(snapshot))
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
                "title": health_public_text(title, 120),
                "summary": health_public_text(summary, 240),
                "source": health_public_text(source, 120),
                "readOnly": True,
                "priority": len(actions) + 1,
                "evidence": health_public_evidence(evidence),
            }
        )

    snapshot_status = snapshot.get("status")
    if snapshot_status and snapshot_status != "ok":
        status_message = (
            collector_status_message(snapshot_status)
            if snapshot_status == "starting"
            else "采集器报告只读采集状态异常。"
        )
        add_action(
            "collector.snapshot_status",
            "warning" if snapshot_status == "starting" else "critical",
            "collector",
            "快照采集状态异常",
            status_message,
            "确认采集状态后，再判断依赖此快照的指标。",
            "snapshot.status",
            [
                {"label": "采集状态", "value": snapshot_status},
                {"label": "状态说明", "value": status_message},
                {"label": "内部错误", "value": "内部细节已隐藏" if snapshot.get("error") else None},
            ],
        )

    collection_sources = [
        ("meta.realtimeError", meta.get("realtimeError"), meta.get("realtimeLastErrorAt"), "critical", "实时 REST 采集异常"),
        ("meta.slowRestError", meta.get("slowRestError"), meta.get("slowRestLastErrorAt"), "warning", "低频 REST 采集异常"),
        ("meta.staticError", meta.get("staticError"), meta.get("staticLastErrorAt"), "warning", "静态 REST 采集异常"),
        ("connections.protocolError", connections.get("protocolError"), connections.get("protocolLastErrorAt"), "warning", "连接协议汇总采集异常"),
        ("connections.detailError", connections.get("detailError"), connections.get("detailLastErrorAt"), "warning", "连接明细采集异常"),
    ]
    for source, error, last_error_at, severity, title in collection_sources:
        if error:
            add_action(
                source.replace(".", "_").lower(),
                severity,
                "collector",
                title,
                "只读采集通道报告失败；内部诊断细节已隐藏。",
                "先核对只读采集路径和凭据，再判断依赖该通道的指标。",
                source,
                [
                    {"label": "最近失败", "value": last_error_at or "-"},
                    {"label": "内部错误", "value": "内部细节已隐藏"},
                ],
            )

    endpoint_failure_sources = [
        ("meta.realtimeEndpointFailures", "实时 REST 端点采集失败"),
        ("meta.slowRestEndpointFailures", "低频 REST 端点采集失败"),
        ("meta.staticEndpointFailures", "静态 REST 端点采集失败"),
        ("meta.detailEndpointFailures", "明细 REST 端点采集失败"),
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
                f"{len(failed_names)} 个端点报告采集失败。",
                "查看采集日志或端点失败明细；修复操作保持人工执行。",
                source,
                [{"label": "失败端点", "value": len(failed_names)}],
            )

    wan_lines = as_list(snapshot.get("wan")) or as_list(snapshot.get("pppoe"))
    running_wan = [row for row in wan_lines if as_dict(row).get("running")]
    offline_wan = [as_dict(row) for row in wan_lines if not as_dict(row).get("running")]
    if wan_lines and not running_wan:
        add_action(
            "wan.no_running_lines",
            "critical",
            "wan",
            "没有 WAN 线路处于运行状态",
            "当前所有已知 WAN 线路均报告离线。",
            "从只读 WAN 与路由视图核对上联链路和默认路由。",
            "snapshot.wan",
            [{"label": "WAN 线路", "value": len(wan_lines)}],
        )
    elif offline_wan:
        add_action(
            "wan.offline_lines",
            "warning",
            "wan",
            "部分 WAN 线路离线",
            f"{len(wan_lines)} 条 WAN 中有 {len(offline_wan)} 条未运行。",
            "调整策略前，先核对受影响线路和上联接入。",
            "snapshot.wan",
            [{"label": "离线线路", "value": ", ".join(compact_text(row.get("name") or row.get("lineId") or "-") for row in offline_wan[:5])}],
        )

    default_routes = as_list(routes.get("defaultRoutes"))
    active_defaults = [row for row in default_routes if as_dict(row).get("active") and not as_dict(row).get("disabled")]
    if default_routes and not active_defaults:
        add_action(
            "routes.no_active_default",
            "critical",
            "routes",
            "没有活动默认路由",
            "快照中存在默认路由，但没有任何一条同时处于活动且启用状态。",
            "从路由清单定位未活动网关；本面板不会自动修改路由。",
            "snapshot.routes.defaultRoutes",
            [{"label": "默认路由", "value": len(default_routes)}],
        )
    elif wan_lines and not default_routes:
        add_action(
            "routes.no_default_visible",
            "warning",
            "routes",
            "快照中未见默认路由",
            "WAN 线路存在，但快照没有包含默认路由。",
            "核对路由采集鲜度，并在 RouterOS 路由表中人工确认。",
            "snapshot.routes.defaultRoutes",
            [{"label": "WAN 线路", "value": len(wan_lines)}],
        )

    distribution = [as_dict(row) for row in as_list(load_balance.get("distribution"))]
    if len(distribution) > 1 and any(to_int(row.get("share")) >= 70 for row in distribution):
        dominant = max(distribution, key=lambda row: to_int(row.get("share")))
        add_action(
            "wan.traffic_skew",
            "info",
            "wan",
            "WAN 流量分布明显偏斜",
            f"{dominant.get('name', '-')} 承载了约 {dominant.get('share', 0)}% 的已观测 WAN 流量。",
            "只有在代表性业务流量下持续出现，才将其视为异常。",
            "snapshot.loadBalance.distribution",
            [{"label": "线路", "value": dominant.get("name", "-")}, {"label": "流量占比", "value": dominant.get("share", 0)}],
        )

    if dns and not dns.get("running"):
        add_action(
            "dns.remote_requests_disabled",
            "warning",
            "dns",
            "RouterOS DNS 远程请求未启用",
            "根据当前快照，RouterOS DNS 服务未接受远程请求。",
            "修改 DNS 设置前，先确认这是否符合当前拓扑设计。",
            "snapshot.dns.running",
            [{"label": "远程请求", "value": dns.get("running")}],
        )
    if dns and not as_list(dns.get("servers")):
        add_action(
            "dns.no_servers",
            "warning",
            "dns",
            "快照中未见上游 DNS 服务器",
            "DNS 快照没有列出上游服务器。",
            "若客户端报告解析失败，请在 RouterOS 控制台核对 DNS 配置。",
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
                "DNS 缓存占用偏高",
                f"DNS 缓存使用率约为 {round(cache_usage, 1)}%。",
                "调整缓存大小前，先观察解析时延和缓存淘汰是否同步异常。",
                "snapshot.dns.cacheUsed",
                [{"label": "已使用缓存", "value": cache_used}, {"label": "缓存容量", "value": cache_size}],
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
            "部分 DHCPv6 客户端未绑定",
            f"有 {len(ipv6_dhcp_unbound)} 个 DHCPv6 客户端未绑定。",
            "从 IPv6 诊断视图核对前缀委派和上游状态。",
            "snapshot.dns.ipv6DhcpClients",
            [{"label": "接口", "value": ", ".join(str(as_dict(row).get("interface", "-")) for row in ipv6_dhcp_unbound[:5])}],
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
            "DHCP 地址池容量紧张",
            f"有 {len(high_pools)} 个 DHCP 地址池使用率达到或超过 85%。",
            "修改地址规划前，先人工核对租约清单和地址池容量。",
            "snapshot.dhcp.pools",
            [{"label": "地址池", "value": ", ".join(str(pool.get("name", "-")) for pool in high_pools[:5])}],
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
            title = "检测到活动 ARP 身份冲突证据"
            next_step = "优先核对活动重复 IP 证据；修改地址规划前，再与交换机、AP 和终端证据交叉确认。"
        else:
            title = "ARP 身份漂移需要复核"
            next_step = "将陈旧或失败的 ARP 漂移视为低置信历史；确认存在新鲜重复 IP 证据后，再判定活动冲突。"
        add_action(
            "arp.identity_conflicts",
            top_severity,
            "terminals",
            title,
            (
                f"共 {len(arp_alerts)} 条 ARP 告警：严重 {critical_count}，"
                f"警告 {warning_count}，提示 {info_count}。"
            ),
            next_step,
            "snapshot.arp.alerts",
            [
                {"label": "样本", "value": compact_text(as_dict(arp_alerts[0]).get("detail") or as_dict(arp_alerts[0]).get("value"))},
                {"label": "样本级别", "value": as_dict(arp_alerts[0]).get("severity", "-")},
                {"label": "样本置信度", "value": as_dict(arp_alerts[0]).get("confidence", "-")},
                {"label": "置信度汇总", "value": ", ".join(f"{key}:{confidence_counts[key]}" for key in sorted(confidence_counts))},
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
            loss_text = "未取得"
        else:
            loss_value_text = f"{top_issue['lossRate'] * 100:.4f}".rstrip("0").rstrip(".")
            loss_text = f"{loss_value_text}%"
        add_action(
            "interfaces.error_counters",
            "warning",
            "interfaces",
            "接口丢包与错误证据需要复核",
            (
                f"{primary_count} 个主接口和 {logical_count} 个降级排序的逻辑接口存在丢包或错误证据。"
                f"最高项 {top_issue['row'].get('name', '-')}：累计丢包/错误 "
                f"{top_issue['dropTotal']}/{top_issue['errorTotal']}，最近增量 "
                f"+{top_issue['dropDelta']}/+{top_issue['errorDelta']}，近期丢包率 {loss_text}。"
            ),
            "优先核对最近增量和丢包率；若父接口没有新鲜增量，将 VLAN/macvlan 逻辑对视为低置信证据。",
            "snapshot.interfaces",
            [
                {"label": "最高风险接口", "value": top_issue["row"].get("name", "-")},
                {"label": "累计丢包/错误", "value": f"{top_issue['dropTotal']}/{top_issue['errorTotal']}"},
                {"label": "最近丢包/错误增量", "value": f"+{top_issue['dropDelta']}/+{top_issue['errorDelta']}"},
                {"label": "近期丢包率", "value": loss_text},
                {"label": "降级逻辑接口", "value": logical_count},
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
            "路由器资源压力偏高",
            ", ".join(f"{name}={value}%" for name, _, value in resource_pressure),
            "安排维护或调优前，先与流量和日志证据交叉确认。",
            "snapshot.overview",
            [{"label": name, "value": value} for name, _, value in resource_pressure],
        )

    threshold_level = connections.get("thresholdLevel")
    if threshold_level in {"danger", "warning"}:
        add_action(
            "connections.tracking_pressure",
            "critical" if threshold_level == "danger" else "warning",
            "connections",
            "连接跟踪压力偏高",
            f"当前连接总数为 {connections.get('total', 0)}，阈值级别为 {threshold_level}。",
            "修改限制前，先从终端排行和活动连接中定位高负载客户端。",
            "snapshot.connections",
            [{"label": "连接总数", "value": connections.get("total", 0)}, {"label": "TCP", "value": connections.get("tcp")}],
        )

    top_terminal = next((as_dict(row) for row in as_list(snapshot.get("terminals")) if to_int(as_dict(row).get("connections")) >= 1000), None)
    if top_terminal:
        add_action(
            "terminals.high_connection_client",
            "info",
            "terminals",
            "终端连接数偏高",
            f"{top_terminal.get('displayName') or top_terminal.get('hostname') or top_terminal.get('ip')} 有 {top_terminal.get('connections')} 条跟踪连接。",
            "核对这是预期负载、下载软件、P2P，还是异常终端。",
            "snapshot.terminals",
            [{"label": "IP", "value": top_terminal.get("ip", "-")}, {"label": "连接数", "value": top_terminal.get("connections", 0)}],
        )

    security_alerts = as_list(security.get("alerts"))
    if security_alerts:
        add_action(
            "security.log_alerts",
            "warning" if len(security_alerts) >= 10 else "info",
            "security",
            "存在安全相关日志告警",
            f"当前可见 {len(security_alerts)} 条防火墙、警告或错误日志。",
            "以只读方式核对日志上下文和规则命中计数。",
            "snapshot.security.alerts",
            [{"label": "样本", "value": compact_text(as_dict(security_alerts[0]).get("message"))}],
        )

    actions.sort(key=lambda row: (ACTION_SEVERITY_RANK.get(row["severity"], 99), row["priority"]))
    actions = actions[: min(STATUS_FINDINGS_LIMIT, 20)]
    for index, action in enumerate(actions, start=1):
        action["priority"] = index
    counts = {severity: 0 for severity in ACTION_SEVERITY_RANK}
    for action in actions:
        counts[action["severity"]] = counts.get(action["severity"], 0) + 1
    status = "critical" if counts.get("critical") else "warning" if counts.get("warning") else "ok"
    observed_at = optional_rfc3339_timestamp(snapshot.get("updatedAt"))
    snapshot_status = str(snapshot.get("status") or "").strip().lower()
    source_status = (
        "ok"
        if snapshot_status == "ok"
        else "degraded"
        if observed_at
        else "failed"
        if snapshot_status == "error"
        else "unknown"
    )
    evidence_mode = "current" if source_status == "ok" and observed_at else "historical" if observed_at else "unavailable"
    return {
        "schemaVersion": 1,
        "kind": "health-findings",
        "status": status,
        "readOnly": True,
        "generatedAt": format_iso_now(),
        "observedAt": observed_at,
        "sourceUpdatedAt": observed_at,
        "source": "snapshot-health-analysis",
        "evidenceMode": evidence_mode,
        "coverage": "bounded-sample" if observed_at else "unavailable",
        "sourceStatus": source_status,
        "limit": min(STATUS_FINDINGS_LIMIT, 20),
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


def gateway_matches_address_rows(gateway, address_rows):
    gateway_text = str(gateway or "").strip()
    if not gateway_text:
        return False
    if "%" in gateway_text:
        gateway_text = gateway_text.rsplit("%", 1)[0].strip()
    try:
        gateway_ip = ipaddress.ip_address(gateway_text)
    except ValueError:
        return False
    for row in address_rows or []:
        row = row if isinstance(row, dict) else {}
        address_text = str(row.get("address") or row.get("network") or "").strip()
        if not address_text:
            continue
        try:
            network = ipaddress.ip_interface(address_text).network
        except ValueError:
            try:
                network = ipaddress.ip_network(address_text, strict=False)
            except ValueError:
                continue
        if gateway_ip in network:
            return True
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
        if row.get("dst-address") in {"0.0.0.0/0", "::/0"} and not to_bool(row.get("disabled"))
    ]
    for route in defaults:
        gateway = str(route.get("gateway") or "").strip()
        if not gateway:
            continue
        gateway_name = gateway.split("%", 1)[1] if "%" in gateway else gateway
        if gateway_name in interface_types:
            wan_names.add(gateway_name)
            continue
        if gateway_matches_address_rows(gateway, addresses_by_interface.get(gateway_name, [])):
            wan_names.add(gateway_name)
            continue
        for iface_name, address_rows in addresses_by_interface.items():
            if not iface_name or iface_name in wan_names:
                continue
            iface_type = interface_types.get(iface_name, "")
            low_name = str(iface_name).lower()
            if iface_type in {"bridge", "loopback", "wireguard"}:
                continue
            if low_name.startswith(("bridge", "docker", "veth", "lo", "tailscale", "zerotier")):
                continue
            if gateway_matches_address_rows(gateway, address_rows):
                wan_names.add(iface_name)
                break
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
    observed_totals = []
    complete = bool(rows)
    for row in rows:
        up_rate = row.get("upRate")
        down_rate = row.get("downRate")
        if not observed_rate(up_rate) or not observed_rate(down_rate):
            complete = False
            break
        observed_totals.append(up_rate + down_rate)
    total_rate = sum(observed_totals) if complete else None
    distribution = []
    for index, row in enumerate(rows):
        up_rate = row.get("upRate")
        down_rate = row.get("downRate")
        numeric_total = observed_totals[index] if complete else None
        distribution.append(
            {
                "name": row.get("name", "-"),
                "share": round(((numeric_total / total_rate) * 100), 2) if total_rate else (0 if complete else None),
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
            "mtime": unix_timestamp_rfc3339(stat.st_mtime),
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
                    provider_updated_at = optional_rfc3339_timestamp(provider.get("updatedAt") or provider.get("updated-at"))
                    rows.append(
                        {
                            "name": name,
                            "type": provider.get("type", "-"),
                            "vehicleType": provider.get("vehicleType") or provider.get("vehicle-type") or "-",
                            "ruleCount": to_int(rules),
                            "updatedAt": provider_updated_at,
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


bind_snapshot_runtime(sys.modules[__name__])
bind_collector_runtime(sys.modules[__name__])
bind_interface_metrics_runtime(sys.modules[__name__])


class Collector(SnapshotBuilderMixin, CollectorServiceMixin):
    compute_rates = InterfaceMetricsMixin.compute_rates
    compute_interface_quality = InterfaceMetricsMixin.compute_interface_quality

    def __init__(self):
        self.router_transport = RouterCollectorTransport(
            get_ready_router_config,
            open_pinned_ssh_client,
            format_ssh_connect_error,
            to_int,
            rest_timeout=REST_TIMEOUT,
            ssh_timeout=SSH_TIMEOUT,
        )
        self.connection_evidence = ConnectionEvidenceParser(
            to_int,
            detail_sample_limit=CONNECTION_DETAIL_SAMPLE_LIMIT,
            search_fields=CONNECTION_SEARCH_FIELDS,
        )
        router_status = public_router_config()
        self.state = {
            "status": "starting" if router_status["configured"] else "needs_config",
            "updatedAt": None,
            "error": None if router_status["configured"] else "RouterOS SSH connection is not configured",
            "meta": {
                "target": PANEL_TARGET,
                "routerHost": router_status["host"],
                "configuredIdentity": router_status["host"],
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
        self.dns_static_cache = {
            "rows": [],
            "count": 0,
            "fetched_at": 0.0,
            "updatedAt": None,
            "revision": None,
        }
        self.dns_static_refresh_lock = threading.Lock()
        self.connection_summary = {
            "counts": {"all": None, "tcp": None, "udp": None, "icmp": None},
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
            "resourceSamples": deque(maxlen=HISTORY_LIMIT),
            "trafficSamples": deque(maxlen=HISTORY_LIMIT),
        }
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
            self.dns_static_cache = {
                "rows": [],
                "count": 0,
                "fetched_at": 0.0,
                "updatedAt": None,
                "revision": None,
            }
            self.connection_summary = {
                "counts": {"all": None, "tcp": None, "udp": None, "icmp": None},
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
                "resourceSamples": deque(maxlen=HISTORY_LIMIT),
                "trafficSamples": deque(maxlen=HISTORY_LIMIT),
            }
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
                    "configuredIdentity": router_status["host"],
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
                    "configuredIdentity": router_status["host"],
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
        return self.router_transport.rest_get(session, config)

    def rest_post(self, session, path, payload=None, timeout=None):
        return self.router_transport.rest_post(session, path, payload, timeout)

    def rest_print(self, path, proplist=None, query=None, timeout=None):
        return self.router_transport.rest_print(path, proplist, query, timeout)

    def ssh_exec(self, client, command, timeout=None):
        return self.router_transport.ssh_exec(client, command, timeout)

    def ssh_json(self, client, expression):
        return self.router_transport.ssh_json(client, expression)

    def ssh_capture(self, client, command, capture_seconds, max_bytes=None, quiet_window=0.75, timeout=None):
        return self.router_transport.ssh_capture(
            client,
            command,
            capture_seconds,
            max_bytes=max_bytes,
            quiet_window=quiet_window,
            timeout=timeout,
        )

    def fetch_rest_item(self, key, endpoint_config):
        return self.router_transport.fetch_rest_item(key, endpoint_config)

    def fetch_rest_bundle(self, endpoints, workers=1):
        return self.router_transport.fetch_rest_bundle(endpoints, workers)

    def open_ssh_client(self, timeout=None):
        return self.router_transport.open_ssh_client(timeout)

    def fetch_connection_total_count(self):
        return self.fetch_connection_tracking_summary()["total"]

    def parse_connection_tracking_summary(self, fields, source="RouterOS connection tracking"):
        return self.connection_evidence.parse_tracking_summary(fields, source)

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
                fields = self.connection_evidence.parse_tracking_text(output)
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
        return {
            "tcp": None,
            "udp": None,
            "icmp": None,
            "all": None,
        }

    def parse_connection_terse_line(self, line):
        return self.connection_evidence.parse_terse_line(line)

    def dedupe_connection_rows(self, source_rows):
        return self.connection_evidence.dedupe_rows(source_rows)

    def split_connection_endpoint(self, value):
        return self.connection_evidence.split_endpoint(value)

    def connection_row_matches_ip(self, row, ip_text):
        return self.connection_evidence.row_matches_ip(row, ip_text)

    def normalize_connection_search_row(self, row):
        return self.connection_evidence.normalize_search_row(row)

    def fetch_connection_search(self, target_ip, source_ip=None, limit=CONNECTION_SEARCH_MAX_LIMIT):
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
            normalized = self.normalize_connection_search_row(row)
            rows.append(
                {
                    "srcIp": normalized.get("srcIp") or "",
                    "dstIp": normalized.get("dstIp") or "",
                    "protocol": normalized.get("protocol") or "other",
                    "timeout": normalized.get("timeout") or "",
                    "origRateBps": normalized.get("origRate"),
                    "replRateBps": normalized.get("replRate"),
                }
            )
            if len(rows) >= safe_limit:
                break
        truncated_by_rows = len(rows) >= safe_limit
        transport_complete = bool(capture.get("complete"))
        captured_bytes = to_int(capture.get("capturedBytes"), 0)
        truncated_by_bytes = captured_bytes >= CONNECTION_SEARCH_STREAM_MAX_BYTES
        complete = transport_complete and not truncated_by_rows and not truncated_by_bytes
        observed_at = format_iso_now()
        return {
            "schemaVersion": 1,
            "kind": "connection-search",
            "targetIp": target,
            "sourceIp": source,
            "limit": safe_limit,
            "query": {"targetIp": target, "sourceIp": source},
            "page": {
                "requestedLimit": safe_limit,
                "returnedCount": len(rows),
                "maxLimit": CONNECTION_SEARCH_MAX_LIMIT,
            },
            "matchCount": len(rows),
            "rows": rows,
            "transport": "ssh",
            "readOnly": True,
            "generatedAt": observed_at,
            "observedAt": observed_at,
            "evidenceMode": "current",
            "source": "routeros-ssh",
            "sourceStatus": "ok" if transport_complete else "degraded",
            # This endpoint is a point-in-time, row-bounded query.  Even when
            # the SSH stream reports a clean end, it is not an inventory or a
            # durable claim about all connections after the observation.
            "coverage": "bounded-sample",
            "capture": {
                "complete": complete,
                "capturedBytes": capture.get("capturedBytes"),
                "firstOutputSeconds": capture.get("firstOutputSeconds"),
                "truncatedByRows": truncated_by_rows,
                "truncatedByBytes": truncated_by_bytes,
                # ssh_capture does not expose a reliable distinction between
                # a quiet-window stop and a timeout.  Preserve that unknown
                # instead of inventing a timeout cause.
                "timedOut": False if transport_complete or truncated_by_bytes else None,
                "incompleteTransport": not transport_complete,
                # Retain the legacy field while consumers move to the
                # explicit row/byte/timeout boundary above.
                "truncatedByLimit": truncated_by_rows,
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
        return self.connection_evidence.normalize_dns_rows(rows, limit)

    def fetch_dns_static_full_rest(self):
        router = get_ready_router_config()
        session = requests.Session()
        configure_rest_session(session, router)
        try:
            response = session.get(
                build_rest_url(router, "ip/dns/static"),
                params={
                    ".proplist": "name,regexp,address,cname,text,ttl,comment,disabled,type",
                },
                timeout=DNS_STATIC_FULL_REST_TIMEOUT,
                allow_redirects=False,
                stream=True,
            )
            try:
                if 300 <= response.status_code < 400:
                    raise RuntimeError("RouterOS REST redirect was refused; configure the exact HTTPS endpoint")
                response.raise_for_status()
                payload = read_bounded_json_response(
                    response,
                    max_bytes=DNS_STATIC_FULL_REST_MAX_BYTES,
                    label="RouterOS DNS static REST response",
                )
            finally:
                response.close()
            rows = payload if isinstance(payload, list) else ([payload] if payload else [])
            normalized_rows = self.normalize_dns_static_rows(rows)
            fetched_at = time.time()
            observed_at = format_iso_now()
            revision = hashlib.sha256(
                json.dumps(normalized_rows, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
            ).hexdigest()
            with self.lock:
                self.dns_static_cache = {
                    "rows": normalized_rows,
                    "count": len(normalized_rows),
                    "fetched_at": fetched_at,
                    "updatedAt": observed_at,
                    "revision": revision,
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
        cache_valid = fetched_at > 0 and (now - fetched_at) < DNS_STATIC_CACHE_TTL
        if force_refresh or not cache_valid:
            # A cache miss can be triggered by many concurrent browser page
            # requests.  Recheck under one narrow refresh lock so only one
            # full RouterOS REST enumeration is in flight.
            with self.dns_static_refresh_lock:
                now = time.time()
                with self.lock:
                    cached_rows = copy.deepcopy(self.dns_static_cache.get("rows", []))
                    fetched_at = float(self.dns_static_cache.get("fetched_at") or 0.0)
                cache_valid = fetched_at > 0 and (now - fetched_at) < DNS_STATIC_CACHE_TTL
                if not force_refresh and cache_valid:
                    return cached_rows
                try:
                    return self.fetch_dns_static_full_rest()
                except Exception:
                    if fetched_at > 0:
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

    def fetch_dns_static_evidence_page(self, offset=0, page_size=DNS_STATIC_PAGE_LIMIT):
        """Return a page plus its collection generation; never infer inventory completeness."""
        safe_offset = max(to_int(offset, 0), 0)
        safe_page_size = max(1, min(to_int(page_size, DNS_STATIC_PAGE_LIMIT), DNS_STATIC_MAX_PAGE_LIMIT))
        now = time.time()
        with self.lock:
            cache = copy.deepcopy(self.dns_static_cache)
        cache_fetched_at = float(cache.get("fetched_at") or 0.0)
        cache_valid = cache_fetched_at > 0 and (now - cache_fetched_at) < DNS_STATIC_CACHE_TTL
        source = "rest-cache" if cache_valid else None
        rows = cache.get("rows", []) if cache_valid else None

        if rows is None:
            try:
                with self.dns_static_refresh_lock:
                    now = time.time()
                    with self.lock:
                        cache = copy.deepcopy(self.dns_static_cache)
                    cache_fetched_at = float(cache.get("fetched_at") or 0.0)
                    cache_valid = cache_fetched_at > 0 and (now - cache_fetched_at) < DNS_STATIC_CACHE_TTL
                    if cache_valid:
                        rows = cache.get("rows", [])
                        source = "rest-cache"
                    else:
                        rows = self.fetch_dns_static_full_rest()
                        with self.lock:
                            cache = copy.deepcopy(self.dns_static_cache)
                        source = "rest-live"
            except Exception:
                try:
                    preview_rows = self.fetch_dns_static_preview(self.get_dns_static_total_count())
                except Exception:
                    preview_rows = []
                if preview_rows:
                    rows = preview_rows
                    source = "ssh-preview"
                    cache = {"updatedAt": None, "revision": None, "count": len(rows)}
                else:
                    rows = []
                    source = "unavailable"
                    cache = {"updatedAt": None, "revision": None, "count": None}

        observed_at = optional_rfc3339_timestamp(cache.get("updatedAt"))
        evidence_mode = "current" if source == "rest-live" and observed_at else "historical" if observed_at else "unavailable"
        total_count = cache.get("count") if source in {"rest-live", "rest-cache"} else len(rows)
        return {
            "schemaVersion": 1,
            "kind": "dns-static",
            "readOnly": True,
            "generatedAt": format_iso_now(),
            "observedAt": observed_at,
            "evidenceMode": evidence_mode,
            "sourceStatus": "ok" if source == "rest-live" else "degraded" if source in {"rest-cache", "ssh-preview"} else "failed",
            "source": source,
            # Even a live REST inventory is returned to the browser as a page;
            # only the server has seen the full enumeration.
            "coverage": "page" if source in {"rest-live", "rest-cache"} else "preview" if source == "ssh-preview" else "unavailable",
            "revision": cache.get("revision") if source in {"rest-live", "rest-cache"} else None,
            "totalCount": total_count,
            "offset": safe_offset,
            "limit": safe_page_size,
            "visibleRuleCount": len(rows[safe_offset : safe_offset + safe_page_size]),
            "page": {
                "offset": safe_offset,
                "pageSize": safe_page_size,
                "returnedCount": len(rows[safe_offset : safe_offset + safe_page_size]),
                "totalCount": total_count,
                # Bind each page to the same immutable collection generation
                # exposed at the response root.  Clients can then reject a
                # mixed-generation page instead of silently combining rows
                # from different refreshes.
                "revision": cache.get("revision") if source in {"rest-live", "rest-cache"} else None,
                "maxPageSize": DNS_STATIC_MAX_PAGE_LIMIT,
                "maxVisibleRows": 1000,
                "maxVisiblePages": 20,
            },
            "rows": rows[safe_offset : safe_offset + safe_page_size],
        }

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


ROUTER_PROFILE_STORE_ERROR = ""
try:
    sanitize_router_login_store_passwords()
except RouterProfileStoreCorruptError as exc:
    ROUTER_PROFILE_STORE_ERROR = str(exc)
collector = Collector()


Handler = create_panel_handler(sys.modules[__name__])


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
