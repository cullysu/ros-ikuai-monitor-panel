import base64
import hashlib
import ipaddress
import re
import secrets


REST_SCHEMES = {"https", "http"}
SSH_SHA256_FINGERPRINT_RE = re.compile(r"^SHA256:[A-Za-z0-9+/]{43}$")


class SshHostKeyConfirmationRequired(Exception):
    def __init__(self, hostname, fingerprint, algorithm):
        self.hostname = str(hostname or "")
        self.fingerprint = fingerprint
        self.algorithm = algorithm
        super().__init__(f"SSH host key confirmation required for {self.hostname}: {algorithm} {fingerprint}")


class SshHostKeyMismatch(Exception):
    def __init__(self, hostname, expected, actual, algorithm):
        self.hostname = str(hostname or "")
        self.expected = expected
        self.actual = actual
        self.algorithm = algorithm
        super().__init__(
            f"SSH host key changed for {self.hostname}: expected {expected}, received {actual} ({algorithm})"
        )


def normalize_router_host(value):
    raw = str(value or "").strip()
    if not raw:
        raise ValueError("RouterOS address is required")
    if "://" in raw:
        raise ValueError("RouterOS address must not include a URL scheme; choose REST HTTPS or HTTP separately")
    if any(char.isspace() for char in raw) or any(char in raw for char in "/\\@?#"):
        raise ValueError("RouterOS address must be an IP address or hostname")

    bracketed = raw.startswith("[") and raw.endswith("]")
    if "[" in raw or "]" in raw:
        if not bracketed or raw.count("[") != 1 or raw.count("]") != 1:
            raise ValueError("RouterOS IPv6 address has invalid brackets")
        raw = raw[1:-1]

    try:
        return ipaddress.ip_address(raw).compressed
    except ValueError:
        if bracketed or ":" in raw:
            raise ValueError("RouterOS address must not include a port")
        try:
            hostname = raw.encode("idna").decode("ascii").lower()
        except UnicodeError as exc:
            raise ValueError("RouterOS hostname is invalid") from exc
        if len(hostname) > 253 or hostname.endswith("."):
            raise ValueError("RouterOS hostname is invalid")
        labels = hostname.split(".")
        if any(
            not label
            or len(label) > 63
            or label.startswith("-")
            or label.endswith("-")
            or not re.fullmatch(r"[a-z0-9-]+", label)
            for label in labels
        ):
            raise ValueError("RouterOS hostname is invalid")
        return hostname


def normalize_router_ssh_port(value):
    raw = str(value or "").strip()
    if not raw:
        return 22
    if not re.fullmatch(r"\d{1,5}", raw):
        raise ValueError("SSH port must be a number")
    port = int(raw)
    if port < 1 or port > 65535:
        raise ValueError("SSH port must be between 1 and 65535")
    return port


def normalize_rest_scheme(value):
    scheme = str(value or "https").strip().lower()
    if scheme not in REST_SCHEMES:
        raise ValueError("REST scheme must be https or http")
    return scheme


def normalize_rest_port(value, scheme="https"):
    normalized_scheme = normalize_rest_scheme(scheme)
    raw = str(value or "").strip()
    if not raw:
        return 443 if normalized_scheme == "https" else 80
    if not re.fullmatch(r"\d{1,5}", raw):
        raise ValueError("REST port must be a number")
    port = int(raw)
    if port < 1 or port > 65535:
        raise ValueError("REST port must be between 1 and 65535")
    return port


def normalize_ssh_fingerprint(value):
    fingerprint = str(value or "").strip()
    if not fingerprint:
        return ""
    if fingerprint.lower().startswith("sha256:"):
        fingerprint = f"SHA256:{fingerprint.split(':', 1)[1].rstrip('=')}"
    if not SSH_SHA256_FINGERPRINT_RE.fullmatch(fingerprint):
        raise ValueError("SSH host key fingerprint must use SHA256:<base64> format")
    return fingerprint


def format_url_host(host):
    value = str(host or "").strip().strip("[]")
    return f"[{value}]" if ":" in value else value


def build_rest_url(config, path=""):
    source = config or {}
    scheme = normalize_rest_scheme(source.get("restScheme"))
    port = normalize_rest_port(source.get("restPort"), scheme)
    host = format_url_host(source.get("host"))
    if not host:
        raise ValueError("RouterOS address is required")
    clean_path = str(path or "").strip().strip("/")
    suffix = f"/{clean_path}" if clean_path else ""
    return f"{scheme}://{host}:{port}/rest{suffix}"


def validate_rest_security(scheme, verify_tls=True, insecure_confirmed=False):
    normalized_scheme = normalize_rest_scheme(scheme)
    verify_tls = bool(verify_tls) if normalized_scheme == "https" else False
    insecure = normalized_scheme == "http" or not verify_tls
    if insecure and insecure_confirmed is not True:
        if normalized_scheme == "http":
            raise ValueError("HTTP REST exposes RouterOS credentials; explicit risk confirmation is required")
        raise ValueError("Disabling HTTPS certificate verification requires explicit risk confirmation")
    return {
        "restScheme": normalized_scheme,
        "restVerifyTls": verify_tls,
        "insecureRestConfirmed": bool(insecure_confirmed) if insecure else False,
        "insecure": insecure,
    }


def normalize_router_transport(
    rest_scheme="https",
    rest_port=None,
    rest_verify_tls=True,
    insecure_rest_confirmed=False,
    ssh_host_key_fingerprint="",
):
    security = validate_rest_security(rest_scheme, rest_verify_tls, insecure_rest_confirmed)
    return {
        **security,
        "restPort": normalize_rest_port(rest_port, security["restScheme"]),
        "sshHostKeyFingerprint": normalize_ssh_fingerprint(ssh_host_key_fingerprint),
    }


def configure_rest_session(session, config):
    source = config or {}
    security = validate_rest_security(
        source.get("restScheme"),
        source.get("restVerifyTls", True),
        source.get("insecureRestConfirmed", False),
    )
    session.auth = (str(source.get("user") or ""), str(source.get("password") or ""))
    session.verify = security["restVerifyTls"] if security["restScheme"] == "https" else True
    session.headers.update({"Accept": "application/json"})
    return session


def ssh_key_fingerprint(key):
    digest = hashlib.sha256(key.asbytes()).digest()
    encoded = base64.b64encode(digest).decode("ascii").rstrip("=")
    return f"SHA256:{encoded}"


class PinnedHostKeyPolicy:
    """Accept exactly one profile-pinned key; never persist or auto-add unknown keys."""

    def __init__(self, expected_fingerprint):
        self.expected = normalize_ssh_fingerprint(expected_fingerprint)

    def missing_host_key(self, client, hostname, key):
        del client
        actual = ssh_key_fingerprint(key)
        algorithm = str(key.get_name() or "unknown")
        if not self.expected:
            raise SshHostKeyConfirmationRequired(hostname, actual, algorithm)
        if not secrets.compare_digest(self.expected, actual):
            raise SshHostKeyMismatch(hostname, self.expected, actual, algorithm)
