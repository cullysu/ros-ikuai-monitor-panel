import base64
import hashlib
import hmac
import json
import re
import time

from panel_backend.router_transport import (
    normalize_router_host,
    normalize_router_ssh_port,
    normalize_ssh_fingerprint,
    normalize_rest_scheme,
)
from panel_backend.time_contract import unix_timestamp_rfc3339


TOKEN_PART_RE = re.compile(r"^[A-Za-z0-9_-]+$")
SSH_TRUST_CHALLENGE_KIND = "ssh-host-key"
SSH_TRUST_CHALLENGE_VERSION = 2
SSH_TRUST_CHALLENGE_MAX_TTL_SECONDS = 600


class SshTrustChallengeError(ValueError):
    def __init__(self, message, code="invalid_ssh_trust_challenge"):
        self.code = str(code or "invalid_ssh_trust_challenge")
        super().__init__(message)


def _secret_bytes(secret):
    value = secret.encode("utf-8") if isinstance(secret, str) else bytes(secret or b"")
    if len(value) < 32:
        raise ValueError("SSH trust challenge secret must contain at least 32 bytes")
    return value


def _encode_part(value):
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _decode_part(value):
    text = str(value or "")
    if not text or not TOKEN_PART_RE.fullmatch(text):
        raise SshTrustChallengeError("SSH host-key confirmation token is malformed")
    try:
        return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))
    except (ValueError, TypeError) as exc:
        raise SshTrustChallengeError("SSH host-key confirmation token is malformed") from exc


def _session_digest(session_id):
    value = str(session_id or "").encode("utf-8")
    if not value:
        raise ValueError("Panel session is required for SSH host-key confirmation")
    return hashlib.sha256(value).hexdigest()


def _canonical_binding(session_id, host, ssh_port, fingerprint, rest_scheme):
    return {
        "session": _session_digest(session_id),
        "host": normalize_router_host(host),
        "sshPort": normalize_router_ssh_port(ssh_port),
        "restScheme": normalize_rest_scheme(rest_scheme),
        "fingerprint": normalize_ssh_fingerprint(fingerprint),
    }


def issue_ssh_trust_challenge(
    secret,
    session_id,
    host,
    ssh_port,
    fingerprint,
    *,
    rest_scheme="https",
    ttl_seconds=180,
    now=None,
):
    issued_at = int(time.time() if now is None else float(now))
    ttl = max(1, min(int(ttl_seconds), SSH_TRUST_CHALLENGE_MAX_TTL_SECONDS))
    payload = {
        "v": SSH_TRUST_CHALLENGE_VERSION,
        "kind": SSH_TRUST_CHALLENGE_KIND,
        **_canonical_binding(session_id, host, ssh_port, fingerprint, rest_scheme),
        "iat": issued_at,
        "exp": issued_at + ttl,
    }
    encoded_payload = _encode_part(
        json.dumps(payload, ensure_ascii=True, sort_keys=True, separators=(",", ":")).encode("utf-8")
    )
    signature = hmac.new(_secret_bytes(secret), encoded_payload.encode("ascii"), hashlib.sha256).digest()
    return {
        "token": f"{encoded_payload}.{_encode_part(signature)}",
        "expiresAt": unix_timestamp_rfc3339(payload["exp"]),
    }


def verify_ssh_trust_challenge(
    secret,
    token,
    session_id,
    host,
    ssh_port,
    fingerprint,
    *,
    rest_scheme="https",
    now=None,
):
    parts = str(token or "").split(".")
    if len(parts) != 2:
        raise SshTrustChallengeError("SSH host-key confirmation token is missing or malformed")
    encoded_payload, encoded_signature = parts
    supplied_signature = _decode_part(encoded_signature)
    expected_signature = hmac.new(
        _secret_bytes(secret),
        encoded_payload.encode("ascii"),
        hashlib.sha256,
    ).digest()
    if not hmac.compare_digest(expected_signature, supplied_signature):
        raise SshTrustChallengeError("SSH host-key confirmation token signature is invalid")
    try:
        payload = json.loads(_decode_part(encoded_payload).decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise SshTrustChallengeError("SSH host-key confirmation token payload is invalid") from exc
    if not isinstance(payload, dict):
        raise SshTrustChallengeError("SSH host-key confirmation token payload is invalid")
    if payload.get("v") != SSH_TRUST_CHALLENGE_VERSION or payload.get("kind") != SSH_TRUST_CHALLENGE_KIND:
        raise SshTrustChallengeError("SSH host-key confirmation token version is unsupported")

    current_time = int(time.time() if now is None else float(now))
    try:
        issued_at = int(payload.get("iat"))
        expires_at = int(payload.get("exp"))
    except (TypeError, ValueError) as exc:
        raise SshTrustChallengeError("SSH host-key confirmation token time boundary is invalid") from exc
    if issued_at > current_time + 5 or expires_at <= issued_at:
        raise SshTrustChallengeError("SSH host-key confirmation token time boundary is invalid")
    if expires_at - issued_at > SSH_TRUST_CHALLENGE_MAX_TTL_SECONDS:
        raise SshTrustChallengeError("SSH host-key confirmation token lifetime is invalid")
    if current_time >= expires_at:
        raise SshTrustChallengeError(
            "SSH host-key confirmation has expired; probe the device again",
            code="ssh_trust_challenge_expired",
        )

    expected_binding = _canonical_binding(session_id, host, ssh_port, fingerprint, rest_scheme)
    for key, expected in expected_binding.items():
        actual = payload.get(key)
        if not isinstance(actual, type(expected)) or not hmac.compare_digest(str(actual), str(expected)):
            raise SshTrustChallengeError(
                "SSH host-key confirmation does not match this session or device endpoint",
                code="ssh_trust_binding_mismatch",
            )
    return payload
