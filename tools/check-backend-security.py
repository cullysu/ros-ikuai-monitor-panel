import base64
import ast
import gzip
import hashlib
import http.client
import json
import os
import pathlib
import sys
import tempfile
import threading


ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

os.environ.setdefault("ROS_PANEL_PROFILE", "routeros_only")
os.environ.setdefault("ROS_MONITOR_ROUTER_HOST", "127.0.0.1")
os.environ.setdefault("ROS_MONITOR_ROUTER_USER", "security-check")
os.environ.setdefault("ROS_MONITOR_ROUTER_PASSWORD", "CHANGE_ME")
os.environ.setdefault(
    "ROS_PANEL_ROUTER_LOGIN_STORE_FILE",
    str(pathlib.Path(tempfile.gettempdir()) / "ros-panel-security-check-logins.json"),
)

from panel_backend.api_schema import (  # noqa: E402
    READ_ONLY_API_PATHS,
    SESSION_BOOTSTRAP_PATHS,
    WRITE_API_PATHS,
    decode_json_object,
    parse_router_login_request,
)
from panel_backend.router_transport import (  # noqa: E402
    PinnedHostKeyPolicy,
    SshHostKeyConfirmationRequired,
    SshHostKeyMismatch,
    build_rest_url,
    normalize_rest_scheme,
    normalize_rest_port,
    rest_channel_has_verified_identity,
    ssh_key_fingerprint,
    validate_rest_security,
)
from panel_backend.config_store import RouterProfileStore, RouterProfileStoreCorruptError  # noqa: E402
from panel_backend.collector_transport import RouterCollectorTransport  # noqa: E402
from panel_backend.session_security import SessionStore, SlidingWindowRateLimiter  # noqa: E402
from panel_backend.trust_binding import (  # noqa: E402
    SshTrustChallengeError,
    issue_ssh_trust_challenge,
    verify_ssh_trust_challenge,
)

import app  # noqa: E402


class FakeKey:
    def __init__(self, payload=b"fixture-router-host-key", name="ssh-ed25519"):
        self.payload = payload
        self.name = name

    def asbytes(self):
        return self.payload

    def get_name(self):
        return self.name


class FakeRestResponse:
    def __init__(self, status_code=200, payload=None, content=b"json"):
        self.status_code = status_code
        self.payload = payload
        self.content = content

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self):
        return self.payload


class FakeRestSession:
    def __init__(self, response):
        self.response = response
        self.calls = []

    def get(self, url, **kwargs):
        self.calls.append((url, kwargs))
        return self.response


def assert_rest_transport_contract():
    assert app.normalize_router_host("router.lan") == "router.lan"
    assert app.normalize_router_host("[2001:db8::1]") == "2001:db8::1"
    assert app.normalize_router_host("2001:db8::1") == "2001:db8::1"
    for unsafe_host in (
        "router.lan/path",
        r"router.lan\path",
        "user@router.lan",
        "router.lan?x=1",
        "router.lan#frag",
        "[2001:db8::1]:443",
    ):
        try:
            app.normalize_router_host(unsafe_host)
        except ValueError:
            pass
        else:
            raise AssertionError(f"Router address delimiter was accepted: {unsafe_host!r}")
    try:
        app.normalize_router_host("https://router.lan")
    except ValueError as exc:
        assert "must not include a URL scheme" in str(exc)
    else:
        raise AssertionError("Router address URLs must not be silently reinterpreted")

    assert normalize_rest_scheme(None) == "https"
    assert normalize_rest_port(None, "https") == 443
    assert normalize_rest_port(None, "http") == 80
    assert build_rest_url(
        {"host": "192.0.2.1", "restScheme": "https", "restPort": 443},
        "system/resource",
    ) == "https://192.0.2.1:443/rest/system/resource"
    assert build_rest_url(
        {"host": "2001:db8::1", "restScheme": "https", "restPort": 8443},
        "/ip/dns/static",
    ) == "https://[2001:db8::1]:8443/rest/ip/dns/static"
    assert rest_channel_has_verified_identity(
        {"ok": True, "scheme": "https", "verifyTls": True}
    ) is True
    for unverified in (
        {"ok": False, "scheme": "https", "verifyTls": True},
        {"ok": True, "scheme": "https", "verifyTls": False},
        {"ok": True, "scheme": "http", "verifyTls": False},
        {"ok": True},
        None,
    ):
        assert rest_channel_has_verified_identity(unverified) is False

    validate_rest_security("https", True, False)
    for scheme, verify_tls in (("http", False), ("https", False)):
        try:
            validate_rest_security(scheme, verify_tls, False)
        except ValueError:
            pass
        else:
            raise AssertionError(f"insecure REST accepted without explicit confirmation: {scheme=} {verify_tls=}")
        validate_rest_security(scheme, verify_tls, True)


def assert_ssh_fingerprint_contract():
    key = FakeKey()
    digest = base64.b64encode(hashlib.sha256(key.asbytes()).digest()).decode("ascii").rstrip("=")
    expected = f"SHA256:{digest}"
    assert ssh_key_fingerprint(key) == expected

    try:
        PinnedHostKeyPolicy("").missing_host_key(None, "router.lan", key)
    except SshHostKeyConfirmationRequired as exc:
        assert exc.fingerprint == expected
        assert exc.algorithm == "ssh-ed25519"
    else:
        raise AssertionError("unknown SSH key was accepted before confirmation")

    PinnedHostKeyPolicy(expected).missing_host_key(None, "router.lan", key)
    try:
        PinnedHostKeyPolicy("SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA").missing_host_key(
            None, "router.lan", key
        )
    except SshHostKeyMismatch as exc:
        assert exc.actual == expected
    else:
        raise AssertionError("changed SSH host key was accepted")


def assert_ssh_trust_challenge_contract():
    secret = b"0123456789abcdef0123456789abcdef"
    fingerprint = "SHA256:" + "A" * 43
    issued = issue_ssh_trust_challenge(
        secret,
        "session-one",
        "router.lan",
        2222,
        fingerprint,
        rest_scheme="https",
        ttl_seconds=120,
        now=1000,
    )
    assert issued["token"]
    assert issued["expiresAt"] == "1970-01-01T00:18:40Z"
    verified = verify_ssh_trust_challenge(
        secret,
        issued["token"],
        "session-one",
        "router.lan",
        2222,
        fingerprint,
        rest_scheme="https",
        now=1119,
    )
    assert verified["host"] == "router.lan"
    assert verified["sshPort"] == 2222
    assert verified["restScheme"] == "https"
    assert verified["fingerprint"] == fingerprint

    invalid_bindings = (
        ("session-two", "router.lan", 2222, "https", fingerprint, 1010),
        ("session-one", "other.lan", 2222, "https", fingerprint, 1010),
        ("session-one", "router.lan", 22, "https", fingerprint, 1010),
        ("session-one", "router.lan", 2222, "http", fingerprint, 1010),
        ("session-one", "router.lan", 2222, "https", "SHA256:" + "B" * 43, 1010),
        ("session-one", "router.lan", 2222, "https", fingerprint, 1120),
    )
    for session_id, host, port, rest_scheme, candidate, now in invalid_bindings:
        try:
            verify_ssh_trust_challenge(
                secret,
                issued["token"],
                session_id,
                host,
                port,
                candidate,
                rest_scheme=rest_scheme,
                now=now,
            )
        except SshTrustChallengeError:
            pass
        else:
            raise AssertionError("SSH trust challenge escaped its session, endpoint, fingerprint, or expiry binding")

    tampered = issued["token"][:-1] + ("A" if issued["token"][-1] != "A" else "B")
    try:
        verify_ssh_trust_challenge(
            secret,
            tampered,
            "session-one",
            "router.lan",
            2222,
            fingerprint,
            rest_scheme="https",
            now=1010,
        )
    except SshTrustChallengeError:
        pass
    else:
        raise AssertionError("tampered SSH trust challenge was accepted")


def assert_session_and_rate_limit_contract():
    now = [1000.0]
    sessions = SessionStore(ttl_seconds=60, max_sessions=2, clock=lambda: now[0])
    first = sessions.create()
    now[0] += 1
    second = sessions.create()
    assert sessions.size() == 2
    now[0] += 0.25
    assert sessions.get(first["id"])["id"] == first["id"]
    now[0] += 1
    third = sessions.create()
    assert sessions.size() == 2
    assert sessions.get(second["id"]) is None
    assert sessions.get(first["id"])["id"] == first["id"]
    assert sessions.get(third["id"])["id"] == third["id"]
    now[0] += 61
    assert sessions.size() == 0

    limiter = SlidingWindowRateLimiter(max_keys=8, clock=lambda: now[0])
    assert limiter.consume("login", "127.0.0.1", limit=2, window_seconds=30) == 0
    assert limiter.consume("login", "127.0.0.1", limit=2, window_seconds=30) == 0
    retry_after = limiter.consume("login", "127.0.0.1", limit=2, window_seconds=30)
    assert 1 <= retry_after <= 30
    now[0] += 31
    assert limiter.consume("login", "127.0.0.1", limit=2, window_seconds=30) == 0


def assert_router_profile_store_contract():
    secret = "must-not-survive"
    nested_secret = "nested-last-test-secret"
    fingerprint = "SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    polluted_test = {
        "ssh": {
            "ok": False,
            "error": f"password={nested_secret}",
            "headers": {"Authorization": f"Bearer {nested_secret}"},
        },
        "rest": {
            "ok": False,
            "error": f"https://monitor:{nested_secret}@router.lan/rest/system/resource?token={nested_secret}",
        },
        "elapsedMs": 12,
        "password": nested_secret,
    }
    with tempfile.TemporaryDirectory() as temp_dir:
        path = pathlib.Path(temp_dir) / "router-logins.json"
        path.write_text(
            json.dumps(
                {
                    "version": 1,
                    "entries": [
                        {
                            "host": "router.lan",
                            "user": "monitor",
                            "password": secret,
                            "sshPort": 22,
                            "lastTest": polluted_test,
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )
        store = RouterProfileStore(path, history_limit=2)
        store.sanitize()
        assert secret not in path.read_text(encoding="utf-8")
        assert nested_secret not in path.read_text(encoding="utf-8")
        legacy = store.public_entries()
        assert nested_secret not in json.dumps(legacy)
        assert len(legacy) == 1
        assert legacy[0]["passwordSaved"] is False
        assert "password" not in legacy[0]
        public_config = app.public_router_config({"host": "router.lan", "user": "monitor", "lastTest": polluted_test})
        assert nested_secret not in json.dumps(public_config)

        saved = store.remember(
            "router.lan",
            "monitor",
            22,
            rest_scheme="https",
            rest_port=8443,
            rest_verify_tls=True,
            ssh_host_key_fingerprint=fingerprint,
        )
        assert saved["password"] == ""
        assert saved["restPort"] == 8443
        assert saved["sshHostKeyFingerprint"] == fingerprint
        assert store.find(saved["id"])["password"] == ""

        unsafe = store.remember(
            "unsafe.lan",
            "monitor",
            22,
            rest_scheme="http",
            rest_port=80,
            rest_verify_tls=False,
            insecure_rest_confirmed=True,
        )
        assert unsafe["insecureRestConfirmed"] is False
        assert store.find(unsafe["id"])["insecureRestConfirmed"] is False
        assert next(row for row in store.public_entries() if row["id"] == unsafe["id"])["insecureRestConfirmed"] is False

        revoked = store.remember(
            "revoke-router.lan",
            "monitor",
            22,
            ssh_host_key_fingerprint=fingerprint,
        )
        assert store.find(revoked["id"])["sshHostKeyFingerprint"] == fingerprint
        assert store.forget(revoked["id"]) is True
        assert store.find(revoked["id"]) is None

        store.remember("backup.lan", "monitor", 22)
        store.remember("third.lan", "monitor", 22)
        assert len(store.public_entries()) == 2
        assert not path.with_suffix(".json.tmp").exists()
        assert store.forget(saved["id"]) is False

        try:
            store.remember(
                "unsafe.lan",
                "monitor",
                22,
                rest_scheme="http",
                rest_verify_tls=False,
                insecure_rest_confirmed=False,
            )
        except ValueError:
            pass
        else:
            raise AssertionError("insecure saved transport accepted without explicit confirmation")


def assert_router_profile_store_corruption_contract():
    invalid_payloads = ("{", "[]", json.dumps({"entries": {}}))
    with tempfile.TemporaryDirectory() as temp_dir:
        path = pathlib.Path(temp_dir) / "router-logins.json"
        for payload in invalid_payloads:
            path.write_text(payload, encoding="utf-8")
            store = RouterProfileStore(path)
            try:
                store.load_unlocked()
            except RouterProfileStoreCorruptError as exc:
                assert exc.path == path
            else:
                raise AssertionError("corrupt RouterOS profile store was silently accepted")
            assert path.read_text(encoding="utf-8") == payload


def assert_api_schema_contract():
    assert "/api/snapshot" in READ_ONLY_API_PATHS
    assert "/api/router-login" in WRITE_API_PATHS
    assert SESSION_BOOTSTRAP_PATHS == frozenset({"/api/router-login", "/api/panel-network"})
    assert decode_json_object(b"") == {}
    assert decode_json_object(b'{"host":"router.lan"}') == {"host": "router.lan"}
    for invalid_body in (b"[]", b"null", b"not-json", b"\xff"):
        try:
            decode_json_object(invalid_body)
        except ValueError:
            pass
        else:
            raise AssertionError("non-object or malformed JSON crossed the API schema boundary")

    fresh = parse_router_login_request(
        {
            "host": "router.lan",
            "username": "monitor",
            "password": "secret",
            "rememberProfile": True,
            "continueWithVerifiedRestOnly": True,
        }
    )
    assert fresh.host == "router.lan"
    assert fresh.user == "monitor"
    assert fresh.rest_scheme == "https"
    assert fresh.rest_verify_tls is True
    assert fresh.remember_profile is True
    assert fresh.continue_with_verified_rest_only is True
    assert fresh.using_saved_profile is False

    saved = parse_router_login_request(
        {
            "savedId": "profile-1",
            "password": "secret",
            "sshHostKeyFingerprint": "SHA256:" + "A" * 43,
        },
        {
            "host": "saved-router.lan",
            "user": "saved-user",
            "sshPort": 2222,
            "restScheme": "https",
            "restPort": 8443,
            "restVerifyTls": True,
            "insecureRestConfirmed": True,
            "sshHostKeyFingerprint": "SHA256:" + "A" * 43,
        },
    )
    assert saved.host == "saved-router.lan"
    assert saved.user == "saved-user"
    assert saved.ssh_port == 2222
    assert saved.rest_port == 8443
    assert saved.ssh_host_key_fingerprint == "SHA256:" + "A" * 43
    assert saved.insecure_rest_confirmed is False
    assert saved.remember_profile is False
    assert saved.continue_with_verified_rest_only is False
    assert saved.using_saved_profile is True

    try:
        parse_router_login_request(
            {
                "savedId": "profile-1",
                "password": "secret",
                "sshHostKeyFingerprint": "SHA256:" + "B" * 43,
            },
            {
                "host": "saved-router.lan",
                "user": "saved-user",
                "sshPort": 2222,
                "restScheme": "https",
                "restPort": 8443,
                "restVerifyTls": True,
                "sshHostKeyFingerprint": "SHA256:" + "A" * 43,
            },
        )
    except ValueError:
        pass
    else:
        raise AssertionError("saved SSH trust anchor was replaced by a normal login request")

    first_trust = parse_router_login_request(
        {
            "savedId": "profile-2",
            "password": "secret",
            "sshHostKeyFingerprint": "SHA256:" + "B" * 43,
            "sshHostKeyTrustToken": "short-lived-challenge",
            "insecureRestConfirmed": True,
        },
        {
            "host": "untrusted-router.lan",
            "user": "saved-user",
            "sshPort": 22,
            "restScheme": "http",
            "restPort": 80,
            "restVerifyTls": False,
            "insecureRestConfirmed": True,
            "sshHostKeyFingerprint": "",
        },
    )
    assert first_trust.ssh_host_key_fingerprint == "SHA256:" + "B" * 43
    assert first_trust.ssh_host_key_trust_token == "short-lived-challenge"
    assert first_trust.insecure_rest_confirmed is True


def assert_collector_transport_contract():
    config = {
        "host": "router.lan",
        "user": "monitor",
        "password": "secret",
        "restScheme": "https",
        "restPort": 443,
        "restVerifyTls": True,
        "insecureRestConfirmed": False,
        "sshPort": 22,
        "sshHostKeyFingerprint": "",
    }
    transport = RouterCollectorTransport(
        lambda: config,
        lambda router, timeout: (router, timeout),
        lambda router, exc, timeout: f"{router['host']}:{timeout}: {exc}",
        lambda value, default: int(value if value not in (None, "") else default),
        rest_timeout=8,
        ssh_timeout=10,
    )

    list_session = FakeRestSession(FakeRestResponse(payload={"name": "ether1"}))
    assert transport.rest_get(list_session, {"path": "interface"}) == [{"name": "ether1"}]
    url, request_options = list_session.calls[0]
    assert url == "https://router.lan:443/rest/interface"
    assert request_options["allow_redirects"] is False

    object_session = FakeRestSession(FakeRestResponse(payload=[{"cpu-load": "8"}]))
    assert transport.rest_get(object_session, {"path": "system/resource", "kind": "object"}) == {"cpu-load": "8"}
    optional_session = FakeRestSession(FakeRestResponse(status_code=404, payload=None))
    assert transport.rest_get(optional_session, {"path": "missing", "optional": True}) == []

    redirect_session = FakeRestSession(FakeRestResponse(status_code=302, payload=None))
    try:
        transport.rest_get(redirect_session, {"path": "redirect"})
    except RuntimeError as exc:
        assert "redirect was refused" in str(exc)
    else:
        raise AssertionError("collector REST transport followed or accepted a redirect")

    try:
        transport.raise_if_all_required_failed(
            {"required": {"optional": False}, "optional": {"optional": True}},
            {"required": "offline", "optional": "missing"},
        )
    except RuntimeError as exc:
        assert "required: offline" in str(exc)
    else:
        raise AssertionError("collector accepted failure of every required REST endpoint")


def assert_app_security_contract():
    config = app.public_router_config()
    assert config["restScheme"] == "https"
    assert config["restPort"] == 443
    assert config["restVerifyTls"] is True
    assert config["insecureRestConfirmed"] is False
    assert config["sshHostKeyFingerprint"] == ""

    source = (ROOT / "app.py").read_text(encoding="utf-8")
    dispatcher_source = (ROOT / "panel_backend" / "http_dispatcher.py").read_text(encoding="utf-8")
    collector_service_source = (ROOT / "panel_backend" / "collector_service.py").read_text(encoding="utf-8")
    snapshot_builder_source = (ROOT / "panel_backend" / "snapshot_builder.py").read_text(encoding="utf-8")
    assert "AutoAddPolicy" not in source
    assert "f\"http://{router['host']}/rest/" not in source
    assert "f\"http://{config['host']}/rest/" not in source
    assert "frame-ancestors 'none'" in dispatcher_source
    assert '"X-Content-Type-Options", "nosniff"' in dispatcher_source
    assert '"Referrer-Policy", "no-referrer"' in dispatcher_source
    assert "class Handler(BaseHTTPRequestHandler)" not in source
    assert "Handler = create_panel_handler(sys.modules[__name__])" in source
    assert "class PanelRequestHandler(BaseHTTPRequestHandler)" in dispatcher_source
    assert "self.self.runtime" not in dispatcher_source
    assert "class Collector(SnapshotBuilderMixin, CollectorServiceMixin)" in source
    assert "def build_maps(self, rest):" not in source
    assert "def update_state(self, fresh_counter_sample=False):" not in source
    assert "class SnapshotBuilderMixin" in snapshot_builder_source
    assert "def build_snapshot(self, rest, ssh, fresh_counter_sample=False):" in snapshot_builder_source
    assert "class CollectorServiceMixin" in collector_service_source
    assert "def update_state(self, fresh_counter_sample=False):" in collector_service_source
    assert "def start(self):" in collector_service_source
    assert len(source.splitlines()) <= 3900, "app.py must not absorb HTTP, snapshot builder, or collector service responsibilities again"
    assert "Python/" not in app.Handler.version_string(app.Handler)

    profile_source = (ROOT / "panel_backend" / "config_store.py").read_text(encoding="utf-8")
    assert "from panel_backend.config_store import RouterProfileStore" in source
    assert "ROUTER_PROFILE_STORE = RouterProfileStore" in source
    assert "def load_router_login_store" not in source
    assert "def write_router_login_store" not in source
    assert "passwords are never persisted" in profile_source
    assert '"password": ""' in profile_source
    assert "del password" in source

    tree = ast.parse(source)
    collector = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "Collector")
    transport_method_names = {
        "rest_get",
        "rest_post",
        "rest_print",
        "ssh_exec",
        "ssh_json",
        "ssh_capture",
        "fetch_rest_item",
        "fetch_rest_bundle",
        "open_ssh_client",
    }
    transport_methods = {
        node.name: node
        for node in collector.body
        if isinstance(node, ast.FunctionDef) and node.name in transport_method_names
    }
    assert set(transport_methods) == transport_method_names
    assert all((node.end_lineno - node.lineno) <= 10 for node in transport_methods.values())


def assert_source_header_contract():
    port = app.PANEL_PORT
    expected_authority = ("http", "127.0.0.1", port)
    exact_origin = f"http://127.0.0.1:{port}"
    assert app.parse_panel_origin(exact_origin) == expected_authority

    malformed_origins = (
        f"http://user@127.0.0.1:{port}",
        f"http://user:pass@127.0.0.1:{port}",
        f"http://127.0.0.1:{port}/",
        f"http://127.0.0.1:{port}/network",
        f"http://127.0.0.1:{port}?section=network",
        f"http://127.0.0.1:{port}#network",
        f"http://127.0.0.1:{port}, https://evil.example",
        "http://127.0.0.1:0",
    )
    parsed_malformed_origins = {
        value: app.parse_panel_origin(value) for value in malformed_origins
    }
    assert all(value is None for value in parsed_malformed_origins.values()), parsed_malformed_origins

    exact_referer = f"http://127.0.0.1:{port}/network?section=interfaces"
    assert app.parse_panel_referer(exact_referer) == expected_authority
    malformed_referers = (
        f"http://user@127.0.0.1:{port}/network",
        f"http://user:pass@127.0.0.1:{port}/network",
        f"http://127.0.0.1:{port}/network#interfaces",
        "http://127.0.0.1:0/network",
    )
    parsed_malformed_referers = {
        value: app.parse_panel_referer(value) for value in malformed_referers
    }
    assert all(value is None for value in parsed_malformed_referers.values()), parsed_malformed_referers

    headers = {"Host": f"127.0.0.1:{port}"}
    assert app.panel_origin_is_allowed(headers, exact_origin) is True
    assert app.panel_referer_is_allowed(headers, exact_referer) is True
    assert app.panel_origin_is_allowed(headers, f"http://localhost:{port}") is False
    assert app.panel_origin_is_allowed(headers, f"https://127.0.0.1:{port}") is False
    assert app.panel_origin_is_allowed(headers, f"http://127.0.0.1:{port + 1}") is False
    assert app.panel_referer_is_allowed(headers, f"http://localhost:{port}/network") is False
    assert app.panel_referer_is_allowed(headers, f"https://127.0.0.1:{port}/network") is False
    assert app.panel_origin_is_allowed({"Host": f"localhost:{port}"}, f"http://localhost:{port}") is True


def assert_live_http_boundary():
    original_public_dir = app.PUBLIC_DIR
    original_bootstrap_limit = app.PANEL_SESSION_BOOTSTRAP_LIMIT
    original_test_router_credentials = app.test_router_credentials
    original_router_config = app.get_router_config()
    with tempfile.TemporaryDirectory() as temp_dir:
        public_dir = pathlib.Path(temp_dir)
        (public_dir / "index.html").write_text("<!doctype html><title>fixture</title>", encoding="utf-8")
        plain_body = b"console.log('fixture')"
        (public_dir / "asset.js").write_bytes(plain_body)
        hashed_body = b"console.log('content-addressed fixture')\n"
        hashed_name = f"panel-framework.{hashlib.sha256(hashed_body).hexdigest()[:12]}.js"
        hashed_path = public_dir / hashed_name
        hashed_path.write_bytes(hashed_body)
        pathlib.Path(f"{hashed_path}.gz").write_bytes(gzip.compress(hashed_body, compresslevel=9))
        app.PUBLIC_DIR = public_dir
        app.PANEL_SESSION_STORE.clear()
        app.PANEL_REQUEST_RATE_LIMITER.clear()
        app.PANEL_SESSION_BOOTSTRAP_LIMIT = 2
        server = app.ReusableThreadingHTTPServer(("127.0.0.1", 0), app.Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f"http://127.0.0.1:{server.server_address[1]}"
        try:
            public = app.requests.get(f"{base}/asset.js", timeout=3)
            assert public.status_code == 200
            assert app.PANEL_SESSION_STORE.size() == 0
            assert "Python" not in public.headers.get("Server", "")
            assert "frame-ancestors 'none'" in public.headers.get("Content-Security-Policy", "")
            assert public.headers.get("X-Content-Type-Options") == "nosniff"
            assert public.headers.get("Referrer-Policy") == "no-referrer"
            assert public.headers.get("X-Frame-Options") == "DENY"
            assert public.headers.get("Cache-Control") == "no-cache"

            index = app.requests.get(f"{base}/", timeout=3)
            assert index.status_code == 200
            assert index.headers.get("Cache-Control") == "no-cache"

            compressed = app.requests.get(
                f"{base}/{hashed_name}",
                headers={"Accept-Encoding": "gzip"},
                timeout=3,
            )
            assert compressed.status_code == 200
            assert compressed.content == hashed_body
            assert compressed.headers.get("Content-Encoding") == "gzip"
            assert compressed.headers.get("Vary") == "Accept-Encoding"
            assert compressed.headers.get("Cache-Control") == "public, max-age=31536000, immutable"
            etag = compressed.headers.get("ETag")
            assert etag and etag.startswith('"sha256-')
            conditional = app.requests.get(
                f"{base}/{hashed_name}",
                headers={"Accept-Encoding": "gzip", "If-None-Match": etag},
                timeout=3,
            )
            assert conditional.status_code == 304
            assert conditional.content == b""

            first_client = app.requests.Session()
            first = first_client.get(f"{base}/api/router-login", timeout=3)
            assert first.status_code == 200, first.text
            assert first.headers.get("Cache-Control") == "no-store"
            assert app.PANEL_SESSION_STORE.size() == 1
            repeat = first_client.get(f"{base}/api/router-login", timeout=3)
            assert repeat.status_code == 200
            assert app.PANEL_SESSION_STORE.size() == 1

            malformed_origin_statuses = {
                value: first_client.post(
                    f"{base}/api/router-login",
                    headers={"Origin": value},
                    timeout=3,
                ).status_code
                for value in (
                    f"http://user@127.0.0.1:{server.server_address[1]}",
                    f"http://user:pass@127.0.0.1:{server.server_address[1]}",
                    f"{base}/",
                    f"{base}/network",
                    f"{base}?section=network",
                    f"{base}#network",
                    f"http://localhost:{server.server_address[1]}",
                    f"https://127.0.0.1:{server.server_address[1]}",
                    f"{base}, https://evil.example",
                )
            }
            malformed_referer_statuses = {
                value: first_client.post(
                    f"{base}/api/router-login",
                    headers={"Referer": value},
                    timeout=3,
                ).status_code
                for value in (
                    f"http://user@127.0.0.1:{server.server_address[1]}/network",
                    f"http://user:pass@127.0.0.1:{server.server_address[1]}/network",
                    f"{base}/network#interfaces",
                )
            }
            assert all(status == 403 for status in malformed_origin_statuses.values()), malformed_origin_statuses
            assert all(status == 403 for status in malformed_referer_statuses.values()), malformed_referer_statuses

            no_origin_fallback = first_client.post(
                f"{base}/api/router-login",
                headers={
                    "Origin": f"{base}, https://evil.example",
                    "Referer": f"{base}/network?section=interfaces",
                },
                timeout=3,
            )
            assert no_origin_fallback.status_code == 403, no_origin_fallback.text

            duplicate_origin = http.client.HTTPConnection(
                "127.0.0.1", server.server_address[1], timeout=3
            )
            duplicate_origin.putrequest("POST", "/api/router-logout")
            duplicate_origin.putheader("Host", f"127.0.0.1:{server.server_address[1]}")
            duplicate_origin.putheader(
                "Cookie", f"{app.PANEL_SESSION_COOKIE}={first_client.cookies.get(app.PANEL_SESSION_COOKIE)}"
            )
            duplicate_origin.putheader("Origin", base)
            duplicate_origin.putheader("Origin", base)
            duplicate_origin.endheaders()
            duplicate_response = duplicate_origin.getresponse()
            duplicate_body = duplicate_response.read().decode("utf-8", errors="replace")
            duplicate_origin.close()
            assert duplicate_response.status == 403, duplicate_body

            duplicate_referer = http.client.HTTPConnection(
                "127.0.0.1", server.server_address[1], timeout=3
            )
            duplicate_referer.putrequest("POST", "/api/router-logout")
            duplicate_referer.putheader("Host", f"127.0.0.1:{server.server_address[1]}")
            duplicate_referer.putheader(
                "Cookie", f"{app.PANEL_SESSION_COOKIE}={first_client.cookies.get(app.PANEL_SESSION_COOKIE)}"
            )
            duplicate_referer.putheader("Referer", f"{base}/network?section=interfaces")
            duplicate_referer.putheader("Referer", f"{base}/network?section=interfaces")
            duplicate_referer.endheaders()
            duplicate_referer_response = duplicate_referer.getresponse()
            duplicate_referer_body = duplicate_referer_response.read().decode("utf-8", errors="replace")
            duplicate_referer.close()
            assert duplicate_referer_response.status == 403, duplicate_referer_body

            panel_network = first_client.get(f"{base}/api/panel-network", timeout=3)
            assert panel_network.status_code == 200, panel_network.text
            assert panel_network.json().get("panelNetwork", {}).get("currentUrl")
            health = first_client.get(f"{base}/api/health", timeout=3)
            assert health.status_code == 200, health.text
            assert health.json().get("panelNetwork", {}).get("currentUrl")

            invalid_shape = first_client.post(
                f"{base}/api/router-login",
                json=[],
                headers={"X-CSRF-Token": first.json()["csrfToken"]},
                timeout=3,
            )
            assert invalid_shape.status_code == 400, invalid_shape.text
            assert invalid_shape.json().get("code") == "bad_request"

            trust_fingerprint = "SHA256:" + "C" * 43
            changed_fingerprint = "SHA256:" + "D" * 43

            def fake_test_router_credentials(
                host,
                user,
                password,
                ssh_port=22,
                *,
                ssh_host_key_fingerprint="",
                **kwargs,
            ):
                del host, user, ssh_port
                password_text = str(password or "")
                host_key_changed = password_text == "changed-key"
                confirmation_required = not ssh_host_key_fingerprint and not host_key_changed
                rest_scheme = str(kwargs.get("rest_scheme") or "https").lower()
                rest_verify_tls = rest_scheme == "https" and kwargs.get("rest_verify_tls") is True
                return {
                    "ssh": {
                        "ok": not confirmation_required and not host_key_changed,
                        "error": (
                            "host key changed" if host_key_changed
                            else "confirmation required" if confirmation_required
                            else None
                        ),
                        "elapsedMs": 1,
                        "fingerprint": changed_fingerprint if host_key_changed else trust_fingerprint,
                        "expectedFingerprint": trust_fingerprint if host_key_changed else None,
                        "algorithm": "ssh-ed25519",
                        "confirmationRequired": confirmation_required,
                        "hostKeyChanged": host_key_changed,
                    },
                    "rest": {
                        "ok": True,
                        "error": None,
                        "elapsedMs": 1,
                        "scheme": rest_scheme,
                        "verifyTls": rest_verify_tls,
                    },
                    "elapsedMs": 2,
                }

            app.test_router_credentials = fake_test_router_credentials
            trust_payload = {
                "host": "router.lan",
                "user": "monitor",
                "password": "secret",
                "sshPort": 22,
                "restScheme": "https",
                "restPort": 443,
                "restVerifyTls": True,
                "insecureRestConfirmed": False,
                "rememberProfile": False,
            }
            trust_probe = first_client.post(
                f"{base}/api/router-login",
                json=trust_payload,
                headers={"X-CSRF-Token": first.json()["csrfToken"]},
                timeout=3,
            )
            assert trust_probe.status_code == 409, trust_probe.text
            trust_test = trust_probe.json().get("test", {}).get("ssh", {})
            trust_token = trust_test.get("trustToken")
            assert trust_token
            assert trust_test.get("trustExpiresAt", "").endswith("Z")

            rest_only = first_client.post(
                f"{base}/api/router-login",
                json={**trust_payload, "continueWithVerifiedRestOnly": True},
                headers={"X-CSRF-Token": first.json()["csrfToken"]},
                timeout=3,
            )
            assert rest_only.status_code == 200, rest_only.text
            assert rest_only.json().get("test", {}).get("ssh", {}).get("confirmationRequired") is True
            assert "SSH" in str(rest_only.json().get("warning") or "")

            unverified_rest_only = first_client.post(
                f"{base}/api/router-login",
                json={
                    **trust_payload,
                    "restScheme": "http",
                    "restPort": 80,
                    "restVerifyTls": False,
                    "insecureRestConfirmed": True,
                    "continueWithVerifiedRestOnly": True,
                },
                headers={"X-CSRF-Token": first.json()["csrfToken"]},
                timeout=3,
            )
            assert unverified_rest_only.status_code == 409, unverified_rest_only.text
            assert unverified_rest_only.json().get("code") == "verified_rest_only_unavailable"

            changed_probe = first_client.post(
                f"{base}/api/router-login",
                json={**trust_payload, "password": "changed-key"},
                headers={"X-CSRF-Token": first.json()["csrfToken"]},
                timeout=3,
            )
            assert changed_probe.status_code == 409, changed_probe.text
            assert changed_probe.json().get("code") == "ssh_host_key_changed"

            changed_rest_only = first_client.post(
                f"{base}/api/router-login",
                json={
                    **trust_payload,
                    "password": "changed-key",
                    "continueWithVerifiedRestOnly": True,
                },
                headers={"X-CSRF-Token": first.json()["csrfToken"]},
                timeout=3,
            )
            assert changed_rest_only.status_code == 200, changed_rest_only.text
            assert changed_rest_only.json().get("test", {}).get("ssh", {}).get("hostKeyChanged") is True
            assert "旧指纹" in str(changed_rest_only.json().get("warning") or "")

            wrong_endpoint = first_client.post(
                f"{base}/api/router-login",
                json={
                    **trust_payload,
                    "host": "other.lan",
                    "sshHostKeyFingerprint": trust_fingerprint,
                    "sshHostKeyTrustToken": trust_token,
                },
                headers={"X-CSRF-Token": first.json()["csrfToken"]},
                timeout=3,
            )
            assert wrong_endpoint.status_code == 409, wrong_endpoint.text
            assert wrong_endpoint.json().get("code") == "ssh_trust_binding_mismatch"

            confirmed = first_client.post(
                f"{base}/api/router-login",
                json={
                    **trust_payload,
                    "sshHostKeyFingerprint": trust_fingerprint,
                    "sshHostKeyTrustToken": trust_token,
                },
                headers={"X-CSRF-Token": first.json()["csrfToken"]},
                timeout=3,
            )
            assert confirmed.status_code == 200, confirmed.text

            second = app.requests.get(f"{base}/api/router-login", timeout=3)
            assert second.status_code == 200
            assert app.PANEL_SESSION_STORE.size() == 2
            limited = app.requests.get(f"{base}/api/router-login", timeout=3)
            assert limited.status_code == 429, limited.text
            assert int(limited.headers.get("Retry-After", "0")) >= 1

            valid_referer = first_client.post(
                f"{base}/api/router-logout",
                headers={"Referer": f"{base}/network?section=interfaces"},
                timeout=3,
            )
            assert valid_referer.status_code == 200, valid_referer.text
            valid_origin = first_client.post(
                f"{base}/api/router-logout",
                headers={"Origin": base},
                timeout=3,
            )
            assert valid_origin.status_code == 200, valid_origin.text

            app.PANEL_SESSION_STORE.clear()
            unauthenticated_write = app.requests.post(
                f"{base}/api/router-login",
                json={},
                headers={"Origin": base},
                timeout=3,
            )
            assert unauthenticated_write.status_code == 403
            assert app.PANEL_SESSION_STORE.size() == 0
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=3)
            app.PUBLIC_DIR = original_public_dir
            app.PANEL_SESSION_BOOTSTRAP_LIMIT = original_bootstrap_limit
            app.test_router_credentials = original_test_router_credentials
            with app.ROUTER_CONFIG_LOCK:
                app.ROUTER_CONFIG.clear()
                app.ROUTER_CONFIG.update(original_router_config)
            app.PANEL_SESSION_STORE.clear()
            app.PANEL_REQUEST_RATE_LIMITER.clear()


def main():
    assert_rest_transport_contract()
    assert_ssh_fingerprint_contract()
    assert_ssh_trust_challenge_contract()
    assert_session_and_rate_limit_contract()
    assert_router_profile_store_contract()
    assert_router_profile_store_corruption_contract()
    assert_api_schema_contract()
    assert_collector_transport_contract()
    assert_app_security_contract()
    assert_live_http_boundary()
    assert_source_header_contract()
    print(
        "backend security contract: PASS https-default explicit-risk ssh-pin bounded-sessions "
        "password-free-profiles api-schema collector-transport headers"
    )


if __name__ == "__main__":
    main()
