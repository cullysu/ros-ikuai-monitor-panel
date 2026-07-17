import json
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from panel_backend.api_schema import (
    MAX_REQUEST_BODY_BYTES,
    READ_ONLY_API_PATHS,
    SESSION_BOOTSTRAP_PATHS,
    WRITE_API_PATHS,
    decode_json_object,
    parse_router_login_request,
)
from panel_backend.config_store import RouterProfileStoreCorruptError
from panel_backend.static_assets import (
    StaticAssetNotFound,
    etag_matches,
    resolve_static_asset,
    static_asset_name,
)


class PanelRequestHandler(BaseHTTPRequestHandler):
    runtime = None
    server_version = "RouterOSPanel"
    sys_version = ""
    private_public_assets = {"readonly-diagnostics.js"}
    read_only_api_paths = READ_ONLY_API_PATHS
    write_api_paths = WRITE_API_PATHS
    session_bootstrap_paths = SESSION_BOOTSTRAP_PATHS

    def version_string(self):
        return self.server_version

    def end_headers(self):
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; "
            "object-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
            "font-src 'self' data:; connect-src 'self'; manifest-src 'self'; worker-src 'none'",
        )
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        super().end_headers()

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
        return self.runtime.panel_network_payload(
            request_url=self.runtime.panel_request_access_url(self.headers, fallback_port=self.runtime.PANEL_PORT),
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
        return self.runtime.parse_request_cookies(self.headers.get("Cookie"))

    def current_panel_session(self):
        return self.runtime.get_panel_session(self.request_cookies().get(self.runtime.PANEL_SESSION_COOKIE))

    def rate_limit_identity(self):
        return str(self.client_address[0] if self.client_address else "local")

    def enforce_rate_limit(self, scope, limit):
        retry_after = self.runtime.PANEL_REQUEST_RATE_LIMITER.consume(
            scope,
            self.rate_limit_identity(),
            limit=limit,
            window_seconds=self.runtime.PANEL_RATE_LIMIT_WINDOW_SECONDS,
        )
        if retry_after <= 0:
            return True
        self.send_json_error(
            "请求过于频繁，请稍后重试。",
            status=429,
            code="rate_limited",
            response_headers={"Retry-After": str(retry_after)},
            retryAfterSeconds=retry_after,
        )
        return False

    def issue_panel_session(self):
        if not self.enforce_rate_limit("session-bootstrap", self.runtime.PANEL_SESSION_BOOTSTRAP_LIMIT):
            return None
        session = self.runtime.create_panel_session()
        self.queue_cookie_header(self.runtime.build_panel_cookie(self.runtime.PANEL_SESSION_COOKIE, session["id"], http_only=True))
        self.queue_cookie_header(self.runtime.build_panel_cookie(self.runtime.PANEL_CSRF_COOKIE, session["csrf"], http_only=False))
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
            if self.runtime.csrf_token_matches(session, self.headers.get(header_name)):
                return True
        origin = self.runtime.first_header_value(self.headers.get("Origin"))
        if origin:
            return self.runtime.panel_origin_is_allowed(self.headers, origin)
        referer = self.runtime.first_header_value(self.headers.get("Referer"))
        if referer:
            return self.runtime.panel_origin_is_allowed(self.headers, referer)
        return False

    def require_write_authorization(self, parsed):
        session = self.ensure_panel_session(create=False)
        if not session:
            self.send_json_error("Local panel session is required", status=403, code="local_session_required")
            return False
        if not self.write_request_guard_is_valid(session):
            self.send_json_error("CSRF, Origin, or Referer validation failed", status=403, code="csrf_validation_failed")
            return False
        return True

    def reject_non_localhost_request(self, parsed):
        if self.runtime.panel_client_address_is_allowed(self.client_address, self.headers) and self.runtime.panel_host_header_is_allowed(self.headers):
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
        session = None
        if parsed.path in self.session_bootstrap_paths:
            session = self.ensure_panel_session(create=True)
            if not session:
                return
        if parsed.path == "/api/router-login":
            try:
                saved_logins = self.runtime.public_saved_router_logins()
            except RouterProfileStoreCorruptError as exc:
                return self.send_json_error(
                    "RouterOS 连接配置文件损坏；原文件已保留，请检查后重试。",
                    status=500,
                    code="router_profile_store_corrupt",
                    detail=str(exc),
                )
            return self.send_json(
                {
                    "ok": True,
                    "routerLogin": self.runtime.public_router_config(),
                    "savedLogins": saved_logins,
                    "profileStorageAvailable": True,
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
            return self.send_json(self.runtime.collector.get_state())
        if parsed.path == "/api/connection-search":
            params = parse_qs(parsed.query)
            target_ip = (params.get("target") or params.get("ip") or [""])[0].strip()
            source_ip = (params.get("source") or params.get("src") or [""])[0].strip() or None
            limit = self.runtime.to_int((params.get("limit") or [80])[0], 80)
            if not target_ip:
                return self.send_json_error("target IP is required", status=400, code="bad_request")
            try:
                return self.send_json(self.runtime.collector.fetch_connection_search(target_ip, source_ip=source_ip, limit=limit))
            except ValueError as exc:
                return self.send_json_error(str(exc), status=400, code="bad_request")
            except Exception as exc:
                return self.send_json_error(str(exc), status=502, code="connection_search_failed")
        if parsed.path == "/api/dns-static":
            params = parse_qs(parsed.query)
            offset = self.runtime.to_int((params.get("offset") or [0])[0], 0)
            limit = self.runtime.to_int((params.get("limit") or [self.runtime.DNS_STATIC_PAGE_LIMIT])[0], self.runtime.DNS_STATIC_PAGE_LIMIT)
            rows = self.runtime.collector.fetch_dns_static_page(offset=offset, limit=limit)
            total_count = self.runtime.collector.get_dns_static_total_count()
            normalized_rows = [
                {
                    "name": item.get("name") or item.get("regexp", "-"),
                    "type": item.get("type", "-"),
                    "value": item.get("address") or item.get("cname") or item.get("text") or "-",
                    "ttl": item.get("ttl", "-"),
                    "comment": item.get("comment", ""),
                    "disabled": self.runtime.to_bool(item.get("disabled")),
                }
                for item in rows
            ]
            return self.send_json(
                {
                    "totalCount": total_count,
                    "offset": max(offset, 0),
                    "limit": max(1, min(limit, self.runtime.DNS_STATIC_MAX_PAGE_LIMIT)),
                    "visibleRuleCount": len(normalized_rows),
                    "rows": normalized_rows,
                }
            )
        if parsed.path == "/api/health":
            state = self.runtime.collector.get_state()
            return self.send_json(
                {
                    "status": state.get("status"),
                    "updatedAt": state.get("updatedAt"),
                    "profile": self.runtime.PANEL_PROFILE,
                    "target": self.runtime.PANEL_TARGET,
                    "panelNetwork": self.panel_network_payload(),
                    "routerLogin": self.runtime.public_router_config(),
                    "savedLoginCount": len(self.runtime.public_saved_router_logins()),
                }
            )
        if parsed.path in {"/api/status-findings", "/api/health-findings"}:
            return self.send_json(self.runtime.collector.get_status_findings())
        if parsed.path == "/api/readonly-diagnostics":
            if self.runtime.PUBLIC_ROUTEROS_PROFILE:
                return self.send_json_error(
                    "readonly diagnostics are private in the public RouterOS profile",
                    status=403,
                    code="private_diagnostics_disabled",
                )
            params = parse_qs(parsed.query)
            force_refresh = (params.get("refresh") or ["0"])[0] in {"1", "true", "yes"}
            return self.send_json(self.runtime.collector.get_readonly_diagnostics(force_refresh=force_refresh))
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
            if not self.enforce_rate_limit("router-login", self.runtime.PANEL_LOGIN_ATTEMPT_LIMIT):
                return
            try:
                payload = self.read_json_body()
                saved_id = str(payload.get("savedId") or "").strip()
                saved_entry = self.runtime.find_saved_router_login(saved_id) if saved_id else None
                if saved_id and not saved_entry:
                    return self.send_json_error("Saved RouterOS login was not found", status=404, code="saved_login_not_found")
                request = parse_router_login_request(payload, saved_entry)
                if request.using_saved_profile and not str(request.password or "").strip():
                    return self.send_json_error(
                        "Saved RouterOS login profile requires entering the password",
                        status=400,
                        code="saved_login_password_required",
                    )
                test = self.runtime.test_router_credentials(
                    request.host,
                    request.user,
                    request.password,
                    request.ssh_port,
                    rest_scheme=request.rest_scheme,
                    rest_port=request.rest_port,
                    rest_verify_tls=request.rest_verify_tls,
                    insecure_rest_confirmed=request.insecure_rest_confirmed,
                    ssh_host_key_fingerprint=request.ssh_host_key_fingerprint,
                )
                ssh_ok = test.get("ssh", {}).get("ok") is True
                rest_ok = test.get("rest", {}).get("ok") is True
                if test.get("ssh", {}).get("hostKeyChanged") is True:
                    return self.send_json_error(
                        "SSH 主机密钥与已固定指纹不一致；已在发送密码前阻断连接。",
                        status=409,
                        code="ssh_host_key_changed",
                        test=test,
                    )
                if test.get("ssh", {}).get("confirmationRequired") is True:
                    return self.send_json_error(
                        "首次连接必须确认 RouterOS SSH 主机密钥指纹。确认前不会发送 SSH 密码。",
                        status=409,
                        code="ssh_host_key_confirmation_required",
                        test=test,
                    )
                if not ssh_ok and not rest_ok:
                    return self.send_json_error(
                        self.runtime.router_login_failure_message(test),
                        status=400,
                        code="router_login_failed",
                        test=test,
                    )
                remembered_entry = None
                if request.remember_profile:
                    remembered_entry = self.runtime.remember_router_login(
                        request.host,
                        request.user,
                        request.password,
                        request.ssh_port,
                        rest_scheme=request.rest_scheme,
                        rest_port=request.rest_port,
                        rest_verify_tls=request.rest_verify_tls,
                        insecure_rest_confirmed=request.insecure_rest_confirmed,
                        ssh_host_key_fingerprint=request.ssh_host_key_fingerprint,
                        last_test=test,
                        source="saved" if request.using_saved_profile else "ui",
                    )
                    saved_id = remembered_entry.get("id")
                router_login = self.runtime.set_router_config(
                    request.host,
                    request.user,
                    request.password,
                    request.ssh_port,
                    rest_scheme=request.rest_scheme,
                    rest_port=request.rest_port,
                    rest_verify_tls=request.rest_verify_tls,
                    insecure_rest_confirmed=request.insecure_rest_confirmed,
                    ssh_host_key_fingerprint=request.ssh_host_key_fingerprint,
                    source="saved" if request.using_saved_profile else "ui",
                    last_test=test,
                    saved_id=(saved_id if request.using_saved_profile or remembered_entry else None),
                )
                self.runtime.collector.reset_collection_state(status="starting", error=None)
                return self.send_json(
                    {
                        "ok": True,
                        "routerLogin": router_login,
                        "savedLogins": self.runtime.public_saved_router_logins(),
                        "test": test,
                        "warning": self.runtime.router_login_warning(test),
                    }
                )
            except ValueError as exc:
                return self.send_json_error(str(exc), status=400, code="bad_request")
            except Exception as exc:
                return self.send_internal_error(exc)
        if parsed.path == "/api/panel-network":
            try:
                payload = self.read_json_body()
                bind = self.runtime.normalize_panel_host(payload.get("bind") or payload.get("listenHost"), "bind")
                port = self.runtime.normalize_panel_port(payload.get("port"))
                target = self.runtime.normalize_panel_host(
                    payload.get("target") or payload.get("accessHost") or bind,
                    "access host",
                )
                saved_env_path = self.runtime.write_panel_local_settings_env(bind, port, target)
                restart_required = bind != self.runtime.PANEL_BIND or port != self.runtime.PANEL_PORT or target != self.runtime.PANEL_TARGET
                active = self.runtime.panel_network_payload(restart_required=False)
                saved = self.runtime.panel_network_payload(bind=bind, port=port, target=target, restart_required=restart_required)
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
            router_login = self.runtime.clear_router_config()
            self.runtime.collector.reset_collection_state(
                status="needs_config",
                error="RouterOS SSH connection is not configured",
            )
            return self.send_json({"ok": True, "routerLogin": router_login, "savedLogins": self.runtime.public_saved_router_logins()})
        if parsed.path == "/api/router-login-forget":
            try:
                payload = self.read_json_body()
                saved_id = payload.get("id") or payload.get("savedId")
                removed = self.runtime.forget_router_login(saved_id)
                return self.send_json(
                    {
                        "ok": True,
                        "removed": removed,
                        "routerLogin": self.runtime.public_router_config(),
                        "savedLogins": self.runtime.public_saved_router_logins(),
                    }
                )
            except ValueError as exc:
                return self.send_json_error(str(exc), status=400, code="bad_request")
            except Exception as exc:
                return self.send_internal_error(exc)
        if parsed.path == "/api/ip-alias":
            if not self.runtime.IP_ALIAS_WRITE_ENABLED:
                return self.send_json_error("ip alias write disabled", status=403, code="write_disabled")
            try:
                payload = self.read_json_body()
                result = self.runtime.collector.update_ip_alias(payload.get("ip"), payload.get("name"))
                return self.send_json({"ok": True, **result})
            except ValueError as exc:
                return self.send_json_error(str(exc), status=400, code="bad_request")
            except Exception as exc:
                return self.send_internal_error(exc)
        return self.send_json_error("API route not found", status=404, code="not_found")

    def log_message(self, format, *args):
        return

    def read_json_body(self):
        declared_length = self.runtime.to_int(self.headers.get("Content-Length"), 0)
        if declared_length > MAX_REQUEST_BODY_BYTES:
            raise ValueError("Request body exceeds 16 KB")
        content_length = max(declared_length, 0)
        if content_length <= 0:
            return {}
        body = self.rfile.read(content_length)
        return decode_json_object(body)

    def send_json_error(self, message, status=400, code="error", response_headers=None, **extra):
        payload = {
            "ok": False,
            "error": str(message or "Request failed"),
            "code": str(code or "error"),
            "status": int(status),
        }
        payload.update(extra)
        return self.send_json(payload, status=status, headers=response_headers)

    def is_expected_disconnect_error(self, exc):
        return isinstance(exc, (BrokenPipeError, ConnectionResetError, ConnectionAbortedError))

    def log_service_error(self, exc, context):
        if getattr(self, "_service_error_logged", False):
            return
        self._service_error_logged = True
        print(f"[panel] {context}: {type(exc).__name__}: {exc}", file=sys.stderr)

    def send_internal_error(self, exc):
        if self.is_expected_disconnect_error(exc):
            return None
        self.log_service_error(exc, "internal API error")
        return self.send_json_error("Internal panel error", status=500, code="internal_error")

    def send_json(self, payload, status=200, headers=None):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            for name, value in (headers or {}).items():
                self.send_header(str(name), str(value))
            for cookie_header in self.consume_cookie_headers():
                self.send_header("Set-Cookie", cookie_header)
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError) as exc:
            if not self.is_expected_disconnect_error(exc):
                self.log_service_error(exc, "unexpected response disconnect")
            return None

    def serve_static(self, path):
        asset_name = static_asset_name(path).rsplit("/", 1)[-1]
        if self.runtime.PUBLIC_ROUTEROS_PROFILE and asset_name in self.private_public_assets:
            self.send_response(403)
            self.send_header("Content-Length", "0")
            self.send_header("Cache-Control", "no-store")
            for cookie_header in self.consume_cookie_headers():
                self.send_header("Set-Cookie", cookie_header)
            self.end_headers()
            return
        try:
            asset = resolve_static_asset(
                self.runtime.PUBLIC_DIR,
                path,
                accept_encoding=self.headers.get("Accept-Encoding", ""),
            )
            not_modified = etag_matches(self.headers.get("If-None-Match"), asset.etag)
            self.send_response(304 if not_modified else 200)
            self.send_header("ETag", asset.etag)
            self.send_header("Cache-Control", asset.cache_control)
            if asset.vary_accept_encoding:
                self.send_header("Vary", "Accept-Encoding")
            if asset.content_encoding:
                self.send_header("Content-Encoding", asset.content_encoding)
            if not_modified:
                for cookie_header in self.consume_cookie_headers():
                    self.send_header("Set-Cookie", cookie_header)
                self.end_headers()
                return
            self.send_header("Content-Type", asset.content_type)
            self.send_header("Content-Length", str(len(asset.body)))
            for cookie_header in self.consume_cookie_headers():
                self.send_header("Set-Cookie", cookie_header)
            self.end_headers()
            self.wfile.write(asset.body)
        except StaticAssetNotFound:
            self.send_response(404)
            self.send_header("Content-Length", "0")
            self.send_header("Cache-Control", "no-store")
            for cookie_header in self.consume_cookie_headers():
                self.send_header("Set-Cookie", cookie_header)
            self.end_headers()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError) as exc:
            if not self.is_expected_disconnect_error(exc):
                self.log_service_error(exc, "unexpected static response disconnect")
            return None

def create_panel_handler(runtime):
    class Handler(PanelRequestHandler):
        pass

    Handler.runtime = runtime
    return Handler
