import copy
import math
import secrets
import threading
import time
from collections import deque


class SessionStore:
    def __init__(self, ttl_seconds, max_sessions, clock=time.time):
        self.ttl_seconds = max(1, int(ttl_seconds))
        self.max_sessions = max(1, int(max_sessions))
        self.clock = clock
        self.lock = threading.RLock()
        self.sessions = {}

    def _prune_unlocked(self, now):
        expired = [
            token
            for token, session in self.sessions.items()
            if now - float(session.get("lastSeen") or session.get("created") or 0) > self.ttl_seconds
        ]
        for token in expired:
            self.sessions.pop(token, None)

    def _evict_oldest_unlocked(self):
        if not self.sessions:
            return
        token = min(
            self.sessions,
            key=lambda item: float(
                self.sessions[item].get("lastSeen") or self.sessions[item].get("created") or 0
            ),
        )
        self.sessions.pop(token, None)

    def create(self):
        now = self.clock()
        session = {
            "id": secrets.token_urlsafe(32),
            "csrf": secrets.token_urlsafe(32),
            "created": now,
            "lastSeen": now,
        }
        with self.lock:
            self._prune_unlocked(now)
            while len(self.sessions) >= self.max_sessions:
                self._evict_oldest_unlocked()
            self.sessions[session["id"]] = session
        return copy.deepcopy(session)

    def get(self, token):
        if not token:
            return None
        now = self.clock()
        with self.lock:
            self._prune_unlocked(now)
            session = self.sessions.get(str(token))
            if not session:
                return None
            session["lastSeen"] = now
            return copy.deepcopy(session)

    def size(self):
        now = self.clock()
        with self.lock:
            self._prune_unlocked(now)
            return len(self.sessions)

    def clear(self):
        with self.lock:
            self.sessions.clear()


class SlidingWindowRateLimiter:
    def __init__(self, max_keys=1024, clock=time.time):
        self.max_keys = max(1, int(max_keys))
        self.clock = clock
        self.lock = threading.RLock()
        self.events = {}

    def _remove_empty_unlocked(self):
        empty = [key for key, events in self.events.items() if not events]
        for key in empty:
            self.events.pop(key, None)

    def _evict_oldest_unlocked(self):
        if not self.events:
            return
        key = min(self.events, key=lambda item: self.events[item][-1] if self.events[item] else float("-inf"))
        self.events.pop(key, None)

    def consume(self, scope, identity, limit, window_seconds):
        now = self.clock()
        safe_limit = max(1, int(limit))
        safe_window = max(1, int(window_seconds))
        key = (str(scope or "default"), str(identity or "unknown"))
        cutoff = now - safe_window
        with self.lock:
            for events in self.events.values():
                while events and events[0] <= cutoff:
                    events.popleft()
            self._remove_empty_unlocked()
            if key not in self.events:
                while len(self.events) >= self.max_keys:
                    self._evict_oldest_unlocked()
                self.events[key] = deque()
            events = self.events[key]
            if len(events) >= safe_limit:
                return max(1, int(math.ceil(events[0] + safe_window - now)))
            events.append(now)
            return 0

    def clear(self):
        with self.lock:
            self.events.clear()
