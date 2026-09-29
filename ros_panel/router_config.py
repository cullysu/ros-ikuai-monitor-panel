import copy
import hashlib
import json
import os
import socket
import sys
import threading
import time
from pathlib import Path
from urllib.parse import urlparse

import paramiko
import requests

from ros_panel.model import format_iso_now
from ros_panel.secrets import dpapi_protect_secret, dpapi_unprotect_secret
from ros_panel.util import compact_exception_text, env_value, to_int


# Same base-dir resolution as app.py BASE_DIR (frozen executables keep data files next to the
# executable); ros_panel modules must not import app, so it is restated here.
if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys.executable).resolve().parent
else:
    BASE_DIR = Path(__file__).resolve().parent.parent


ROUTER_REST_PORT = max(1, min(65535, int(os.getenv("ROS_MONITOR_ROUTER_REST_PORT", "80") or 80)))
_ROUTER_REST_PORT_SUFFIX = "" if ROUTER_REST_PORT == 80 else f":{ROUTER_REST_PORT}"
DEFAULT_ROUTER_HOST = "192.168.88.1"
ROUTER_HOST = env_value("ROS_MONITOR_ROUTER_HOST", DEFAULT_ROUTER_HOST)
ROUTER_USER = os.getenv("ROS_MONITOR_ROUTER_USER", "ros-panel-readonly")
ROUTER_PASSWORD = os.getenv("ROS_MONITOR_ROUTER_PASSWORD", "CHANGE_ME")
ROUTER_SSH_PORT = int(os.getenv("ROS_MONITOR_ROUTER_SSH_PORT", "22"))

REST_TIMEOUT = max(8, int(os.getenv("ROS_MONITOR_REST_TIMEOUT", "12")))
SSH_TIMEOUT = max(8, int(os.getenv("ROS_MONITOR_SSH_TIMEOUT", "12")))

SSH_BANNER_PROBE_TIMEOUT = max(0.5, min(3.0, float(os.getenv("ROS_MONITOR_SSH_BANNER_PROBE_TIMEOUT", "1.5"))))
ROUTER_LOGIN_STORE_FILE = Path(os.getenv("ROS_PANEL_ROUTER_LOGIN_STORE_FILE", str(BASE_DIR / "data" / "router_logins.json"))).expanduser()
ROUTER_LOGIN_HISTORY_LIMIT = max(1, int(os.getenv("ROS_PANEL_ROUTER_LOGIN_HISTORY_LIMIT", "32")))


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
        # This generation's REST client is plain HTTP on port 80 by design.
        "restScheme": "http",
        "restPort": 80,
        "source": source.get("source") or "memory",
        "savedId": source.get("savedId"),
        "updatedAt": source.get("updatedAt"),
        "passwordSet": bool(password.strip()) and password not in ROUTER_PASSWORD_PLACEHOLDERS,
        "lastTest": copy.deepcopy(source.get("lastTest")),
    }


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
                banner = b""
    except socket.timeout:
        return f"TCP connect to {safe_host}:{safe_port} timed out before SSH banner check"
    except OSError as exc:
        return f"TCP connect to {safe_host}:{safe_port} failed before SSH banner check: {exc}"

    if banner.startswith(b"SSH-"):
        return f"TCP connected to {safe_host}:{safe_port} and an SSH banner was visible"
    if not banner:
        return f"TCP connected to {safe_host}:{safe_port}, but no SSH banner arrived within {safe_timeout:.1f}s"

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
        return f"RouterOS SSH connect failed for {host}:{port}: {probe}. Original error: {message}"
    return f"RouterOS SSH connect failed for {host}:{port}: {message}"


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
            if entry.get("password"):
                entry["password"] = dpapi_unprotect_secret(entry.get("password")) or ""
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
        password = str(entry.get("password") or "")
        if password and password not in ROUTER_PASSWORD_PLACEHOLDERS:
            entry = {**entry, "password": dpapi_protect_secret(password)}
        normalized.append(entry)
    normalized.sort(key=lambda row: str(row.get("lastUsedAt") or row.get("updatedAt") or ""), reverse=True)
    payload = {
        "version": 1,
        "updatedAt": format_iso_now(),
        "passwordProtection": "dpapi" if os.name == "nt" else "plain",
        "warning": (
            "Passwords are DPAPI-protected per Windows user."
            if os.name == "nt"
            else "This local file stores RouterOS SSH passwords in clear text for this panel instance. Keep it private."
        ),
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
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
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
            client.close()
        except Exception:
            pass

    rest_started = time.time()
    session = requests.Session()
    session.auth = (config["user"], config["password"])
    try:
        response = session.get(f"http://{config['host']}{_ROUTER_REST_PORT_SUFFIX}/rest/system/resource", timeout=min(REST_TIMEOUT, 8))
        test["rest"]["status"] = response.status_code
        response.raise_for_status()
        # A 200 here can still be the WebFig shell (routers without the REST
        # API serve HTML for /rest/*); only JSON proves the REST handler.
        content_type = response.headers.get("Content-Type", "")
        body = (response.text or "").lstrip()
        if "json" not in content_type.lower() and not body.startswith("{") and not body.startswith("["):
            test["rest"]["error"] = "REST endpoint returned non-JSON payload (WebFig shell?)"
        else:
            test["rest"]["ok"] = True
    except Exception as exc:
        test["rest"]["error"] = compact_exception_text(exc)
    finally:
        test["rest"]["elapsedMs"] = round((time.time() - rest_started) * 1000)
        test["elapsedMs"] = round((time.time() - started_at) * 1000)
        session.close()

    return test
