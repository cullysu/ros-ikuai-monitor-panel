import copy
import hashlib
import json
import os
import threading
import time
from pathlib import Path

from .router_transport import (
    normalize_rest_port,
    normalize_rest_scheme,
    normalize_router_host,
    normalize_router_ssh_port,
    normalize_router_transport,
)


ROUTER_PROFILE_STORE_VERSION = 3
ROUTER_PROFILE_STORE_WARNING = (
    "This local file stores RouterOS connection metadata and pinned SSH fingerprints; "
    "passwords are never persisted."
)


def _now():
    return time.strftime("%Y-%m-%d %H:%M:%S")


class RouterProfileStore:
    """Atomic, password-free RouterOS connection profile storage."""

    def __init__(self, path, history_limit=32):
        self.path = Path(path)
        self.history_limit = max(1, int(history_limit))
        self.lock = threading.RLock()

    @staticmethod
    def entry_id(host, user, ssh_port):
        raw = (
            f"{normalize_router_host(host).lower()}|"
            f"{str(user or '').strip()}|{normalize_router_ssh_port(ssh_port)}"
        )
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]

    def normalize_entry(self, raw):
        if not isinstance(raw, dict):
            return None
        try:
            host = normalize_router_host(raw.get("host"))
            user = str(raw.get("user") or "").strip()
            ssh_port = normalize_router_ssh_port(raw.get("sshPort") or raw.get("port") or 22)
            transport = normalize_router_transport(
                raw.get("restScheme") or "https",
                raw.get("restPort"),
                raw.get("restVerifyTls", True) is True,
                raw.get("insecureRestConfirmed", False) is True,
                raw.get("sshHostKeyFingerprint") or "",
            )
        except Exception:
            return None
        if not user:
            return None
        now = _now()
        entry_id = str(raw.get("id") or self.entry_id(host, user, ssh_port)).strip()
        return {
            "id": entry_id,
            "host": host,
            "user": user,
            "password": "",
            "sshPort": ssh_port,
            **transport,
            "label": str(raw.get("label") or host).strip()[:80],
            "source": str(raw.get("source") or "saved").strip() or "saved",
            "createdAt": raw.get("createdAt") or raw.get("updatedAt") or now,
            "updatedAt": raw.get("updatedAt") or now,
            "lastUsedAt": raw.get("lastUsedAt") or raw.get("updatedAt") or now,
            "lastTest": copy.deepcopy(raw.get("lastTest")),
        }

    def load_unlocked(self):
        try:
            if not self.path.exists():
                return []
            payload = json.loads(self.path.read_text(encoding="utf-8-sig"))
            source = payload.get("entries", []) if isinstance(payload, dict) else []
            entries = []
            seen = set()
            for raw in source:
                entry = self.normalize_entry(raw)
                if not entry or entry["id"] in seen:
                    continue
                seen.add(entry["id"])
                entries.append(entry)
            entries.sort(key=lambda row: str(row.get("lastUsedAt") or row.get("updatedAt") or ""), reverse=True)
            return entries[: self.history_limit]
        except Exception:
            return []

    def persist_unlocked(self, entries):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        normalized = []
        seen = set()
        for raw in entries:
            entry = self.normalize_entry(raw)
            if not entry or entry["id"] in seen:
                continue
            seen.add(entry["id"])
            normalized.append(entry)
        normalized.sort(key=lambda row: str(row.get("lastUsedAt") or row.get("updatedAt") or ""), reverse=True)
        payload = {
            "version": ROUTER_PROFILE_STORE_VERSION,
            "updatedAt": _now(),
            "warning": ROUTER_PROFILE_STORE_WARNING,
            "entries": normalized[: self.history_limit],
        }
        tmp_path = self.path.with_suffix(".json.tmp")
        tmp_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        try:
            os.chmod(tmp_path, 0o600)
        except Exception:
            pass
        tmp_path.replace(self.path)
        try:
            os.chmod(self.path, 0o600)
        except Exception:
            pass

    def sanitize(self):
        with self.lock:
            if self.path.exists():
                self.persist_unlocked(self.load_unlocked())

    @staticmethod
    def public_entry(entry):
        return {
            "id": entry.get("id"),
            "host": entry.get("host") or "",
            "user": entry.get("user") or "",
            "sshPort": normalize_router_ssh_port(entry.get("sshPort")),
            "sshHostKeyFingerprint": entry.get("sshHostKeyFingerprint") or "",
            "restScheme": normalize_rest_scheme(entry.get("restScheme")),
            "restPort": normalize_rest_port(entry.get("restPort"), entry.get("restScheme")),
            "restVerifyTls": entry.get("restVerifyTls") is True,
            "insecureRestConfirmed": entry.get("insecureRestConfirmed") is True,
            "label": entry.get("label") or entry.get("host") or "",
            "source": entry.get("source") or "saved",
            "createdAt": entry.get("createdAt"),
            "updatedAt": entry.get("updatedAt"),
            "lastUsedAt": entry.get("lastUsedAt"),
            "passwordSaved": False,
            "lastTest": copy.deepcopy(entry.get("lastTest")),
        }

    def public_entries(self):
        with self.lock:
            return [self.public_entry(entry) for entry in self.load_unlocked()]

    def find(self, saved_id):
        saved_id = str(saved_id or "").strip()
        if not saved_id:
            return None
        with self.lock:
            for entry in self.load_unlocked():
                if entry.get("id") == saved_id:
                    return copy.deepcopy(entry)
        return None

    def remember(
        self,
        host,
        user,
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
        now = _now()
        entry = self.normalize_entry(
            {
                "id": self.entry_id(host, user, ssh_port),
                "host": host,
                "user": user,
                "sshPort": ssh_port,
                "restScheme": rest_scheme,
                "restPort": rest_port,
                "restVerifyTls": rest_verify_tls,
                "insecureRestConfirmed": insecure_rest_confirmed,
                "sshHostKeyFingerprint": ssh_host_key_fingerprint,
                "label": host,
                "source": source,
                "updatedAt": now,
                "lastUsedAt": now,
                "lastTest": copy.deepcopy(last_test),
            }
        )
        if not entry:
            raise ValueError("Saved RouterOS login is invalid")
        with self.lock:
            stored_entries = self.load_unlocked()
            existing = next((row for row in stored_entries if row.get("id") == entry["id"]), None)
            if existing:
                entry["createdAt"] = existing.get("createdAt") or entry["createdAt"]
            entries = [row for row in stored_entries if row.get("id") != entry["id"]]
            entries.insert(0, entry)
            self.persist_unlocked(entries)
        return copy.deepcopy(entry)

    def forget(self, saved_id):
        saved_id = str(saved_id or "").strip()
        removed = False
        with self.lock:
            entries = []
            for entry in self.load_unlocked():
                if entry.get("id") == saved_id:
                    removed = True
                    continue
                entries.append(entry)
            self.persist_unlocked(entries)
        return removed
