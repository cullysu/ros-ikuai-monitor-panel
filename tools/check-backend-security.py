import base64
import ast
import hashlib
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
    ssh_key_fingerprint,
    validate_rest_security,
)
from panel_backend.config_store import RouterProfileStore  # noqa: E402
from panel_backend.collector_transport import RouterCollectorTransport  # noqa: E402
from panel_backend.session_security import SessionStore, SlidingWindowRateLimiter  # noqa: E402

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
    fingerprint = "SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
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
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )
        store = RouterProfileStore(path, history_limit=2)
        store.sanitize()
        assert secret not in path.read_text(encoding="utf-8")
        legacy = store.public_entries()
        assert len(legacy) == 1
        assert legacy[0]["passwordSaved"] is False
        assert "password" not in legacy[0]

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
            "rememberPassword": True,
        }
    )
    assert fresh.host == "router.lan"
    assert fresh.user == "monitor"
    assert fresh.rest_scheme == "https"
    assert fresh.rest_verify_tls is True
    assert fresh.remember_profile is True
    assert fresh.using_saved_profile is False

    saved = parse_router_login_request(
        {
            "savedId": "profile-1",
            "password": "secret",
            "sshHostKeyFingerprint": "SHA256:NEW",
        },
        {
            "host": "saved-router.lan",
            "user": "saved-user",
            "sshPort": 2222,
            "restScheme": "https",
            "restPort": 8443,
            "restVerifyTls": True,
            "insecureRestConfirmed": False,
            "sshHostKeyFingerprint": "SHA256:OLD",
        },
    )
    assert saved.host == "saved-router.lan"
    assert saved.user == "saved-user"
    assert saved.ssh_port == 2222
    assert saved.rest_port == 8443
    assert saved.ssh_host_key_fingerprint == "SHA256:NEW"
    assert saved.remember_profile is False
    assert saved.using_saved_profile is True


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
    assert "AutoAddPolicy" not in source
    assert "f\"http://{router['host']}/rest/" not in source
    assert "f\"http://{config['host']}/rest/" not in source
    assert "frame-ancestors 'none'" in source
    assert '"X-Content-Type-Options", "nosniff"' in source
    assert '"Referrer-Policy", "no-referrer"' in source
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


def assert_live_http_boundary():
    original_public_dir = app.PUBLIC_DIR
    original_bootstrap_limit = app.PANEL_SESSION_BOOTSTRAP_LIMIT
    with tempfile.TemporaryDirectory() as temp_dir:
        public_dir = pathlib.Path(temp_dir)
        (public_dir / "index.html").write_text("<!doctype html><title>fixture</title>", encoding="utf-8")
        (public_dir / "asset.js").write_text("console.log('fixture')", encoding="utf-8")
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

            first_client = app.requests.Session()
            first = first_client.get(f"{base}/api/router-login", timeout=3)
            assert first.status_code == 200, first.text
            assert app.PANEL_SESSION_STORE.size() == 1
            repeat = first_client.get(f"{base}/api/router-login", timeout=3)
            assert repeat.status_code == 200
            assert app.PANEL_SESSION_STORE.size() == 1

            invalid_shape = first_client.post(
                f"{base}/api/router-login",
                json=[],
                headers={"X-CSRF-Token": first.json()["csrfToken"]},
                timeout=3,
            )
            assert invalid_shape.status_code == 400, invalid_shape.text
            assert invalid_shape.json().get("code") == "bad_request"

            second = app.requests.get(f"{base}/api/router-login", timeout=3)
            assert second.status_code == 200
            assert app.PANEL_SESSION_STORE.size() == 2
            limited = app.requests.get(f"{base}/api/router-login", timeout=3)
            assert limited.status_code == 429, limited.text
            assert int(limited.headers.get("Retry-After", "0")) >= 1

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
            app.PANEL_SESSION_STORE.clear()
            app.PANEL_REQUEST_RATE_LIMITER.clear()


def main():
    assert_rest_transport_contract()
    assert_ssh_fingerprint_contract()
    assert_session_and_rate_limit_contract()
    assert_router_profile_store_contract()
    assert_api_schema_contract()
    assert_collector_transport_contract()
    assert_app_security_contract()
    assert_live_http_boundary()
    print(
        "backend security contract: PASS https-default explicit-risk ssh-pin bounded-sessions "
        "password-free-profiles api-schema collector-transport headers"
    )


if __name__ == "__main__":
    main()
