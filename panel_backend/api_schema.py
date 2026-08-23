import json
from dataclasses import dataclass


MAX_REQUEST_BODY_BYTES = 16 * 1024

READ_ONLY_API_PATHS = frozenset(
    {
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
)

WRITE_API_PATHS = frozenset(
    {
        "/api/ip-alias",
        "/api/panel-network",
        "/api/router-login",
        "/api/router-login-forget",
        "/api/router-logout",
    }
)

SESSION_BOOTSTRAP_PATHS = frozenset({"/api/router-login", "/api/panel-network"})


@dataclass(frozen=True)
class RouterLoginRequest:
    saved_id: str
    password: object
    host: object
    user: object
    ssh_port: object
    rest_scheme: object
    rest_port: object
    rest_verify_tls: bool
    insecure_rest_confirmed: bool
    ssh_host_key_fingerprint: object
    ssh_host_key_trust_token: str
    continue_with_verified_rest_only: bool
    remember_profile: bool
    using_saved_profile: bool


def decode_json_object(body):
    if not body:
        return {}
    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("Request body is not valid JSON") from exc
    if not isinstance(payload, dict):
        raise ValueError("Request JSON body must be an object")
    return payload


def parse_router_login_request(payload, saved_entry=None):
    if not isinstance(payload, dict):
        raise ValueError("Router login request must be an object")

    saved_id = str(payload.get("savedId") or "").strip()
    password = payload.get("password")
    using_saved_profile = isinstance(saved_entry, dict)
    if using_saved_profile:
        submitted_fingerprint = str(payload.get("sshHostKeyFingerprint") or "").strip()
        stored_fingerprint = str(saved_entry.get("sshHostKeyFingerprint") or "").strip()
        if stored_fingerprint and submitted_fingerprint and submitted_fingerprint != stored_fingerprint:
            raise ValueError(
                "Saved SSH host-key fingerprint cannot be replaced during login; forget the device profile before trusting a new key"
            )
        return RouterLoginRequest(
            saved_id=saved_id,
            password=password,
            host=saved_entry.get("host"),
            user=saved_entry.get("user"),
            ssh_port=saved_entry.get("sshPort") or 22,
            rest_scheme=saved_entry.get("restScheme") or "https",
            rest_port=saved_entry.get("restPort"),
            rest_verify_tls=saved_entry.get("restVerifyTls") is True,
            insecure_rest_confirmed=payload.get("insecureRestConfirmed", False) is True,
            ssh_host_key_fingerprint=stored_fingerprint or submitted_fingerprint,
            ssh_host_key_trust_token=str(payload.get("sshHostKeyTrustToken") or "").strip(),
            continue_with_verified_rest_only=payload.get("continueWithVerifiedRestOnly", False) is True,
            remember_profile=payload.get("rememberProfile", False) is True,
            using_saved_profile=True,
        )

    return RouterLoginRequest(
        saved_id=saved_id,
        password=password,
        host=payload.get("host") or payload.get("ip") or payload.get("address"),
        user=payload.get("user") or payload.get("username"),
        ssh_port=payload.get("sshPort") or payload.get("port") or 22,
        rest_scheme=payload.get("restScheme") or "https",
        rest_port=payload.get("restPort"),
        rest_verify_tls=payload.get("restVerifyTls", True) is True,
        insecure_rest_confirmed=payload.get("insecureRestConfirmed", False) is True,
        ssh_host_key_fingerprint=payload.get("sshHostKeyFingerprint") or "",
        ssh_host_key_trust_token=str(payload.get("sshHostKeyTrustToken") or "").strip(),
        continue_with_verified_rest_only=payload.get("continueWithVerifiedRestOnly", False) is True,
        remember_profile=payload.get("rememberProfile", False) is True,
        using_saved_profile=False,
    )
