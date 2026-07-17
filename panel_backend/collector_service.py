import copy
import threading
import time
from concurrent.futures import ThreadPoolExecutor


_runtime = None


def bind_collector_runtime(runtime):
    global _runtime
    _runtime = runtime


class CollectorServiceMixin:
    def update_state(self, fresh_counter_sample=False):
        snapshot = self.build_snapshot(
            self.merge_rest_bundle(),
            self.merge_connection_bundle(),
            fresh_counter_sample=fresh_counter_sample,
        )
        with self.lock:
            self.state = snapshot

    def realtime_loop(self):
        while True:
            if not self.require_router_config_for_collection():
                time.sleep(1)
                continue
            started_at = time.monotonic()
            try:
                realtime_rest = self.fetch_rest_bundle(_runtime.REALTIME_REST_ENDPOINTS)
                duration = round(time.monotonic() - started_at, 2)
                now = _runtime.format_iso_now()
                with self.lock:
                    failures = realtime_rest.pop("_failures", {})
                    for key, value in realtime_rest.items():
                        if key not in failures:
                            self.realtime_rest[key] = value
                    self.realtime_failures = failures
                    self.realtime_updated_at = now
                    self.realtime_error = None
                    self.realtime_last_error_at = None
                    self.realtime_duration_seconds = duration
                self.update_state(fresh_counter_sample=True)
            except Exception as exc:
                with self.lock:
                    self.realtime_error = str(exc)
                    self.realtime_last_error_at = _runtime.format_iso_now()
                    self.realtime_duration_seconds = round(time.monotonic() - started_at, 2)
                    self.state = {**copy.deepcopy(self.state), "status": "error", "updatedAt": _runtime.format_iso_now(), "error": str(exc)}
            elapsed = time.monotonic() - started_at
            time.sleep(max(0, _runtime.POLL_SECONDS - elapsed))

    def slow_rest_loop(self):
        while True:
            if not self.require_router_config_for_collection():
                time.sleep(1)
                continue
            started_at = time.monotonic()
            try:
                slow_rest = self.fetch_rest_bundle(_runtime.SLOW_REST_ENDPOINTS, workers=_runtime.SLOW_REST_WORKERS)
                duration = round(time.monotonic() - started_at, 2)
                now = _runtime.format_iso_now()
                with self.lock:
                    failures = slow_rest.pop("_failures", {})
                    for key, value in slow_rest.items():
                        if key not in failures:
                            self.slow_rest[key] = value
                    self.slow_failures = failures
                    self.slow_updated_at = now
                    self.slow_error = None
                    self.slow_last_error_at = None
                    self.slow_duration_seconds = duration
                self.update_state()
            except Exception as exc:
                with self.lock:
                    self.slow_error = str(exc)
                    self.slow_last_error_at = _runtime.format_iso_now()
                    self.slow_duration_seconds = round(time.monotonic() - started_at, 2)
                self.update_state()
            elapsed = time.monotonic() - started_at
            time.sleep(max(0, _runtime.SLOW_REST_POLL_SECONDS - elapsed))

    def connection_protocol_loop(self):
        while True:
            if not self.require_router_config_for_collection():
                time.sleep(1)
                continue
            started_at = time.monotonic()
            try:
                tracking = self.fetch_connection_tracking_summary()
                duration = round(time.monotonic() - started_at, 2)
                now = _runtime.format_iso_now()
                with self.lock:
                    self.connection_summary["counts"]["all"] = tracking["total"]
                    self.connection_summary["counts"]["tcp"] = None
                    self.connection_summary["counts"]["udp"] = None
                    self.connection_summary["counts"]["icmp"] = None
                    self.connection_summary["protocolUpdatedAt"] = now
                    self.connection_summary["protocolError"] = None
                    self.connection_summary["protocolLastErrorAt"] = None
                    self.connection_summary["protocolDurationSeconds"] = duration
                self.update_state()
            except Exception as exc:
                duration = round(time.monotonic() - started_at, 2)
                with self.lock:
                    self.connection_summary["protocolError"] = str(exc)
                    self.connection_summary["protocolLastErrorAt"] = _runtime.format_iso_now()
                    self.connection_summary["protocolDurationSeconds"] = duration
                self.update_state()
            elapsed = time.monotonic() - started_at
            time.sleep(max(0, _runtime.CONNECTION_PROTOCOL_POLL_SECONDS - elapsed))

    def static_loop(self):
        while True:
            if not self.require_router_config_for_collection():
                time.sleep(1)
                continue
            started_at = time.monotonic()
            try:
                dns_static_count = 0
                static_rest = self.fetch_rest_bundle(_runtime.STATIC_REST_ENDPOINTS, workers=_runtime.STATIC_REST_WORKERS)
                with self.lock:
                    failures = static_rest.pop("_failures", {})
                    for key, value in static_rest.items():
                        if key not in failures:
                            self.static_rest[key] = value
                    if failures:
                        self.static_failures = failures
                    else:
                        self.static_failures = {}
                    self.static_error = None
                    self.static_last_error_at = None
                try:
                    dns_static_count = self.fetch_dns_static_count()
                    with self.lock:
                        self.static_rest["dns_static_meta"] = {
                            "count": dns_static_count,
                            "total_count": dns_static_count,
                            "sample": dns_static_count > len(self.static_rest.get("dns_static", [])),
                        }
                except Exception:
                    pass
                try:
                    dns_static_preview = self.fetch_dns_static_preview(dns_static_count)
                    with self.lock:
                        self.static_rest["dns_static"] = dns_static_preview
                        self.static_rest["dns_static_meta"] = {
                            "count": dns_static_count or len(dns_static_preview),
                            "total_count": dns_static_count or len(dns_static_preview),
                            "sample": (dns_static_count or len(dns_static_preview)) > len(dns_static_preview),
                        }
                except Exception:
                    pass
                with self.lock:
                    self.static_duration_seconds = round(time.monotonic() - started_at, 2)
                    self.static_updated_at = _runtime.format_iso_now()
                self.update_state()
            except Exception as exc:
                with self.lock:
                    self.static_error = str(exc)
                    self.static_last_error_at = _runtime.format_iso_now()
                    self.static_duration_seconds = round(time.monotonic() - started_at, 2)
                self.update_state()
            elapsed = time.monotonic() - started_at
            time.sleep(max(0, _runtime.STATIC_POLL_SECONDS - elapsed))

    def connection_detail_loop(self):
        while True:
            if not self.require_router_config_for_collection():
                time.sleep(1)
                continue
            started_at = time.monotonic()
            try:
                with ThreadPoolExecutor(max_workers=2) as executor:
                    detail_future = executor.submit(self.fetch_connection_detail)
                    detail_rest_future = executor.submit(
                        self.fetch_rest_bundle,
                        _runtime.DETAIL_REST_ENDPOINTS,
                        _runtime.DETAIL_REST_WORKERS,
                    )
                    detail = detail_future.result()
                    detail_rest = detail_rest_future.result()
                detail_failures = detail_rest.pop("_failures", {})
                duration = round(time.monotonic() - started_at, 2)
                now = _runtime.format_iso_now()
                with self.lock:
                    self.connection_detail = {
                        **detail,
                        "updatedAt": now,
                        "detailError": None,
                        "detailLastErrorAt": None,
                        "detailDurationSeconds": duration,
                    }
                    for key, value in detail_rest.items():
                        if key not in detail_failures:
                            self.realtime_rest[key] = value
                    self.detail_failures = detail_failures
                self.update_state()
            except Exception as exc:
                duration = round(time.monotonic() - started_at, 2)
                with self.lock:
                    self.connection_detail["detailError"] = str(exc)
                    self.connection_detail["detailLastErrorAt"] = _runtime.format_iso_now()
                    self.connection_detail["detailDurationSeconds"] = duration
                self.update_state()
            elapsed = time.monotonic() - started_at
            time.sleep(_runtime.connection_detail_sleep_seconds(elapsed))

    def start(self):
        for target in (self.slow_rest_loop, self.static_loop, self.connection_detail_loop, self.realtime_loop, self.connection_protocol_loop):
            thread = threading.Thread(target=target, daemon=True)
            thread.start()

    def get_state(self):
        with self.lock:
            snapshot = copy.deepcopy(self.state)
        snapshot = _runtime.normalize_collector_snapshot_status(snapshot)
        meta = snapshot.setdefault("meta", {})
        meta.setdefault("profile", _runtime.PANEL_PROFILE)
        meta.setdefault("capabilities", _runtime.build_panel_capabilities(snapshot.get("wan") or [], len(snapshot.get("pppoe") or [])))
        findings = snapshot.get("healthFindings") or snapshot.get("statusFindings") or _runtime.build_health_findings(snapshot)
        snapshot["statusFindings"] = findings
        snapshot["healthFindings"] = findings
        return snapshot

    def get_status_findings(self):
        return _runtime.build_health_findings(self.get_state())
