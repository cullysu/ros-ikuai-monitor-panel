"""Small, fail-closed contracts for public supplemental read-only APIs."""

from __future__ import annotations

import ipaddress
import math
import threading
import time
from collections import deque


CONNECTION_SEARCH_MAX_LIMIT = 50
CONNECTION_SEARCH_REQUESTS_PER_WINDOW = 6
CONNECTION_SEARCH_WINDOW_SECONDS = 60
DNS_STATIC_MAX_PAGE_SIZE = 50
DNS_STATIC_MAX_VISIBLE_ROWS = 1000
DNS_STATIC_MAX_VISIBLE_PAGES = 20


def bounded_public_text(value, *, limit, fallback=""):
    """Normalize RouterOS-owned display text without preserving controls or unbounded payloads."""
    text = "".join(character for character in str(value or "") if character >= " " and character != "\x7f")
    text = " ".join(text.split())
    if not text:
        text = str(fallback or "")
    return text[: max(0, int(limit))]


def _single_value(params, key, *, required=False):
    values = params.get(key, [])
    if len(values) > 1:
        raise ValueError(f"{key} must be supplied once")
    if not values:
        if required:
            raise ValueError(f"{key} is required")
        return None
    return str(values[0]).strip()


def canonical_ip(value, label):
    raw = str(value or "").strip()
    if not raw:
        raise ValueError(f"{label} is required")
    try:
        parsed = ipaddress.ip_address(raw)
    except ValueError as exc:
        raise ValueError(f"{label} must be an IPv4 or IPv6 address") from exc
    canonical = str(parsed)
    if raw != canonical:
        raise ValueError(f"{label} must use canonical notation")
    return canonical


def strict_positive_int(value, label, minimum, maximum):
    raw = str(value or "").strip()
    if not raw or not raw.isascii() or not raw.isdecimal():
        raise ValueError(f"{label} must be an integer")
    parsed = int(raw)
    if parsed < minimum or parsed > maximum:
        raise ValueError(f"{label} is out of range")
    return parsed


def parse_connection_query(params):
    if set(params) - {"target", "source", "limit"}:
        raise ValueError("unsupported connection query parameter")
    target = canonical_ip(_single_value(params, "target", required=True), "target")
    source_raw = _single_value(params, "source")
    source = canonical_ip(source_raw, "source") if source_raw else None
    limit = strict_positive_int(
        _single_value(params, "limit") or str(CONNECTION_SEARCH_MAX_LIMIT),
        "limit",
        1,
        CONNECTION_SEARCH_MAX_LIMIT,
    )
    return target, source, limit


def parse_dns_page_query(params):
    if set(params) - {"offset", "pageSize", "limit"}:
        raise ValueError("unsupported DNS page parameter")
    page_size_raw = _single_value(params, "pageSize")
    legacy_limit_raw = _single_value(params, "limit")
    if page_size_raw and legacy_limit_raw and page_size_raw != legacy_limit_raw:
        raise ValueError("pageSize and limit disagree")
    page_size = strict_positive_int(
        page_size_raw or legacy_limit_raw or str(DNS_STATIC_MAX_PAGE_SIZE),
        "pageSize",
        1,
        DNS_STATIC_MAX_PAGE_SIZE,
    )
    offset_raw = _single_value(params, "offset") or "0"
    offset = strict_positive_int(offset_raw, "offset", 0, DNS_STATIC_MAX_VISIBLE_ROWS)
    if offset >= DNS_STATIC_MAX_VISIBLE_ROWS:
        raise ValueError("offset exceeds public DNS window")
    if offset % page_size:
        raise ValueError("offset must align to pageSize")
    if offset // page_size >= DNS_STATIC_MAX_VISIBLE_PAGES:
        raise ValueError("page exceeds public DNS window")
    return offset, page_size


class SupplementalConnectionGuard:
    """Bounded per-peer rate and in-flight guard for slow SSH searches."""

    def __init__(self, max_peers=1024, clock=time.monotonic):
        self.max_peers = max(1, int(max_peers))
        self.clock = clock
        self.lock = threading.RLock()
        self.peers = {}

    def _prune_unlocked(self, now):
        cutoff = now - CONNECTION_SEARCH_WINDOW_SECONDS
        for peer, state in list(self.peers.items()):
            events = state["events"]
            while events and events[0] <= cutoff:
                events.popleft()
            if not events and not state["inFlight"]:
                self.peers.pop(peer, None)

    def _evict_oldest_idle_unlocked(self):
        candidates = [(state["lastSeen"], peer) for peer, state in self.peers.items() if not state["inFlight"]]
        if candidates:
            self.peers.pop(min(candidates)[1], None)

    def acquire(self, peer):
        now = self.clock()
        identity = str(peer or "unknown")
        with self.lock:
            self._prune_unlocked(now)
            state = self.peers.get(identity)
            if state is None:
                while len(self.peers) >= self.max_peers:
                    before = len(self.peers)
                    self._evict_oldest_idle_unlocked()
                    if len(self.peers) == before:
                        return False, "rate_limited", 1
                state = {"events": deque(), "inFlight": False, "lastSeen": now}
                self.peers[identity] = state
            state["lastSeen"] = now
            if state["inFlight"]:
                return False, "connection_search_in_flight", 1
            events = state["events"]
            if len(events) >= CONNECTION_SEARCH_REQUESTS_PER_WINDOW:
                retry_after = max(1, int(math.ceil(events[0] + CONNECTION_SEARCH_WINDOW_SECONDS - now)))
                return False, "rate_limited", retry_after
            events.append(now)
            state["inFlight"] = True
            return True, None, 0

    def release(self, peer):
        identity = str(peer or "unknown")
        now = self.clock()
        with self.lock:
            state = self.peers.get(identity)
            if not state:
                return
            state["inFlight"] = False
            state["lastSeen"] = now
            self._prune_unlocked(now)
