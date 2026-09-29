"""HTTP server: ReusableThreadingHTTPServer / Handler / main（后端拆分批次 8 自 app.py 逐字迁入）。

Handler 类体零改动。Handler/原 app.py 模块级名字 `collector` 单例通过
configure() 注入（app.py 在 import 期构造 Collector 后回填），以解
app -> collector -> server 的循环依赖。
"""

import gzip
import ipaddress
import json
import mimetypes
import sys
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

from ros_panel.config import (
    CONNECTION_SEARCH_MAX_LIMIT,
    CONNECTION_SEARCH_MIN_INTERVAL_SECONDS,
    DNS_STATIC_MAX_PAGE_LIMIT,
    DNS_STATIC_PAGE_LIMIT,
    IP_ALIAS_WRITE_ENABLED,
    PANEL_BIND,
    PANEL_ENV_FILE,
    PANEL_OPEN_BROWSER,
    PANEL_PORT,
    PANEL_PROFILE,
    PANEL_TARGET,
    PUBLIC_DIR,
)
from ros_panel.panel_access import (
    PANEL_CSRF_COOKIE,
    PANEL_SESSION_COOKIE,
    build_panel_cookie,
    create_panel_session,
    csrf_token_matches,
    first_header_value,
    get_panel_session,
    normalize_panel_host,
    normalize_panel_port,
    panel_access_url,
    panel_client_address_is_allowed,
    panel_host_header_is_allowed,
    panel_network_payload,
    panel_origin_is_allowed,
    panel_request_access_url,
    parse_request_cookies,
    write_panel_network_env,
)
from ros_panel.health_findings import build_health_findings
from ros_panel.router_config import (
    clear_router_config,
    find_saved_router_login,
    forget_router_login,
    public_router_config,
    public_saved_router_logins,
    remember_router_login,
    set_router_config,
    test_router_credentials,
)
from ros_panel.util import to_bool, to_int


# app.py 在 import 期构造 Collector 单例后调用 configure() 注入；
# Handler/main 的方法体按模块全局 `collector` 在请求期读取（类体零改动）。
collector = None


def configure(collector_instance):
    global collector
    collector = collector_instance


class PeerRateGuard:
    """Minimal per-peer rate limit: one acquire per interval, thread-safe.

    Used for the connection-search supplement so a browser tab cannot hammer
    the point query; peers beyond max_peers are forgotten oldest-entry-first.
    """

    def __init__(self, min_interval=CONNECTION_SEARCH_MIN_INTERVAL_SECONDS, max_peers=1024, clock=time.monotonic):
        self.min_interval = max(0.0, float(min_interval))
        self.max_peers = max(1, int(max_peers))
        self.clock = clock
        self.lock = threading.Lock()
        self.last_acquire = {}

    def acquire(self, peer):
        """Return (allowed, retry_after_seconds)."""
        now = float(self.clock())
        with self.lock:
            last = self.last_acquire.get(peer)
            if last is not None and now - last < self.min_interval:
                return False, max(1, int(round(self.min_interval - (now - last))))
            if len(self.last_acquire) >= self.max_peers and peer not in self.last_acquire:
                oldest_peer = min(self.last_acquire, key=lambda key: self.last_acquire[key])
                self.last_acquire.pop(oldest_peer, None)
            self.last_acquire[peer] = now
            return True, 0


CONNECTION_SEARCH_RATE_GUARD = PeerRateGuard()


def parse_connection_search_query(params):
    """Strict query parsing: canonical target IP (target/ip/target_ip), optional
    source IP, limit 1..50. Raises ValueError for anything else."""
    if set(params) - {"target", "ip", "target_ip", "source", "source_ip", "limit"}:
        raise ValueError("unsupported connection search parameter")
    target_raw = (params.get("target") or params.get("ip") or params.get("target_ip") or [""])[0]
    source_raw = (params.get("source") or params.get("source_ip") or [""])[0]
    try:
        target = str(ipaddress.ip_address(str(target_raw).strip()))
    except ValueError:
        raise ValueError("connection search target must be a canonical IP address") from None
    source = None
    if str(source_raw).strip():
        try:
            source = str(ipaddress.ip_address(str(source_raw).strip()))
        except ValueError:
            raise ValueError("connection search source must be a canonical IP address") from None
    limit = to_int((params.get("limit") or [str(CONNECTION_SEARCH_MAX_LIMIT)])[0], 0)
    if limit < 1 or limit > CONNECTION_SEARCH_MAX_LIMIT:
        raise ValueError("connection search limit must be between 1 and 50")
    return target, source, limit


def remember_login_for_request(remember_password, remember_profile, using_saved_password, host, user, password, ssh_port, last_test=None):
    """Persist login data after a verified RouterOS login.

    rememberPassword keeps the legacy semantic: the entry is stored together
    with the password (DPAPI-protected at rest). rememberProfile (the React
    form) stores only the device profile (host/user/sshPort/label); the
    password of the current request is never persisted on this path. When the
    login came from an already-saved entry the store is left untouched so an
    existing saved password cannot be clobbered.
    """
    if remember_password:
        return remember_router_login(
            host,
            user,
            password,
            ssh_port,
            last_test=last_test,
            source="saved" if using_saved_password else "ui",
        )
    if remember_profile and not using_saved_password:
        return remember_router_login(
            host,
            user,
            "",
            ssh_port,
            last_test=last_test,
            source="ui",
        )
    return None


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True
    request_queue_size = 128


class Handler(BaseHTTPRequestHandler):
    server_version = "RouterOSTriagePanel/1.0"
    read_only_api_paths = {
        "/api/action-queue",
        "/api/connection-search",
        "/api/dns-static",
        "/api/health",
        "/api/health-findings",
        "/api/panel-network",
        "/api/readonly-diagnostics",
        "/api/router-login",
        "/api/semantic-triage",
        "/api/snapshot",
    }
    write_api_paths = {
        "/api/ip-alias",
        "/api/panel-network",
        "/api/router-login",
        "/api/router-login-forget",
        "/api/router-logout",
    }
    bootstrap_write_api_paths = {"/api/router-login"}

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
                f"Panel is localhost-only. Open {panel_access_url(PANEL_BIND, PANEL_PORT, PANEL_TARGET)}.",
                status=403,
                code="localhost_required",
            )
            return True
        access_url = panel_access_url(PANEL_BIND, PANEL_PORT, PANEL_TARGET)
        body = (
            "<!doctype html><meta charset=\"utf-8\">"
            "<title>localhost only</title>"
            f"<body>Panel is localhost-only. Open {access_url}.</body>"
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
        if parsed.path in {"/api/action-queue", "/api/semantic-triage"}:
            return self.send_json(collector.get_semantic_triage())
        if parsed.path == "/api/health-findings":
            return self.send_json(build_health_findings(collector.get_state()))
        if parsed.path == "/api/connection-search":
            params = parse_qs(parsed.query)
            try:
                target_ip, source_ip, limit = parse_connection_search_query(params)
            except ValueError:
                return self.send_json_error(
                    "Connection search requires a canonical IP address and a limit from 1 to 50.",
                    status=400,
                    code="invalid_connection_query",
                )
            peer = str(self.client_address[0]) if self.client_address else ""
            allowed, retry_after = CONNECTION_SEARCH_RATE_GUARD.acquire(peer)
            if not allowed:
                return self.send_json_error(
                    "Connection search is limited to one request every 5 seconds per client.",
                    status=429,
                    code="connection_search_rate_limited",
                    response_headers={"Retry-After": str(retry_after)},
                    retryAfterSeconds=retry_after,
                )
            return self.send_json(collector.fetch_connection_search(target_ip, source_ip=source_ip, limit=limit))
        if parsed.path == "/api/readonly-diagnostics":
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
                        test.get("rest", {}).get("error") or test.get("ssh", {}).get("error") or "RouterOS login failed",
                        status=400,
                        code="router_login_failed",
                        test=test,
                    )
                remember_raw = payload.get("rememberPassword", False)
                remember_password = remember_raw is True
                remember_profile_raw = payload.get("rememberProfile", False)
                remember_profile = remember_profile_raw is True
                remembered_entry = remember_login_for_request(
                    remember_password,
                    remember_profile,
                    using_saved_password,
                    host,
                    user,
                    password,
                    ssh_port,
                    last_test=test,
                )
                if remembered_entry:
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
                        "warning": (
                            None
                            if test.get("ssh", {}).get("ok") and test.get("rest", {}).get("ok")
                            else (
                                "REST connected, but RouterOS SSH did not respond. Live charts still work; SSH-only diagnostics may be missing."
                                if test.get("rest", {}).get("ok")
                                else "SSH connected, but RouterOS REST did not respond. Some dashboard data may be missing."
                            )
                        ),
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

    def send_json_error(self, message, status=400, code="error", response_headers=None, **extra):
        payload = {
            "ok": False,
            "error": str(message or "Request failed"),
            "code": str(code or "error"),
            "status": int(status),
        }
        payload.update(extra)
        return self.send_json(payload, status=status, response_headers=response_headers)

    def send_internal_error(self, exc):
        print(f"[panel] internal API error: {type(exc).__name__}", file=sys.stderr)
        return self.send_json_error("Internal panel error", status=500, code="internal_error")

    def send_json(self, payload, status=200, response_headers=None):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        # Large payloads (snapshot at scale) compress ~10:1 as gzip; only do it
        # when the client advertises support and the body is worth compressing.
        accept_encoding = str(self.headers.get("Accept-Encoding", ""))
        if "gzip" in accept_encoding.lower() and len(body) >= 1024:
            body = gzip.compress(body, compresslevel=6)
            self.send_header("Content-Encoding", "gzip")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for header_name, header_value in (response_headers or {}).items():
            self.send_header(str(header_name), str(header_value))
        for cookie_header in self.consume_cookie_headers():
            self.send_header("Set-Cookie", cookie_header)
        self.end_headers()
        self.wfile.write(body)

    def serve_static(self, path):
        clean = unquote(path)
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
