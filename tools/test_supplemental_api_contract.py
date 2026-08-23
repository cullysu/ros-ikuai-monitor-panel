#!/usr/bin/env python3
"""Focused public contracts for bounded supplemental read-only evidence."""

from __future__ import annotations

import copy
import contextlib
import io
import json
import sys
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import app
from panel_backend.collector_evidence import ConnectionEvidenceParser
from panel_backend.http_dispatcher import create_panel_handler
from panel_backend.supplemental_contract import SupplementalConnectionGuard


class SupplementalCollector:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.realtime_updated_at = "2026-08-12T12:00:00Z"
        self.realtime_last_error_at = None
        self.realtime_error = None
        self.realtime_failures = {}
        self.connection_started = threading.Event()
        self.connection_release = threading.Event()
        self.block_connections = False

    def get_state(self):
        return {
            "status": "ok",
            "updatedAt": "2026-08-12T12:00:00Z",
            "meta": {},
        }

    def fetch_connection_search(self, target_ip, source_ip=None, limit=80):
        if target_ip == "198.51.100.250":
            raise RuntimeError("ssh://router.internal failed with password=not-for-public")
        if self.block_connections:
            self.connection_started.set()
            self.connection_release.wait(timeout=2)
        observed_at = "2026-08-12T12:00:00Z"
        return {
            "schemaVersion": 1,
            "kind": "connection-search",
            "targetIp": target_ip,
            "sourceIp": source_ip,
            "limit": limit,
            "query": {"targetIp": target_ip, "sourceIp": source_ip},
            "page": {"requestedLimit": limit, "returnedCount": 1, "maxLimit": 50},
            "matchCount": 1,
            "transport": "ssh",
            "readOnly": True,
            "generatedAt": observed_at,
            "observedAt": observed_at,
            "evidenceMode": "current",
            "source": "routeros-ssh",
            "sourceStatus": "ok",
            "coverage": "bounded-sample",
            "capture": {
                "complete": True,
                "capturedBytes": 32,
                "firstOutputSeconds": 0.01,
                "truncatedByRows": False,
                "truncatedByBytes": False,
                "timedOut": False,
            },
            "rows": [{
                "srcIp": target_ip,
                "dstIp": "1.1.1.1",
                "protocol": "tcp",
                "timeout": "1m",
                "origRateBps": None,
                "replRateBps": 0,
            }],
        }

    def fetch_dns_static_page(self, offset=0, limit=100):
        return [{
            "name": "a.example",
            "type": "A",
            "address": "192.0.2.10",
            "comment": "operator\x00\n" + ("x" * 300),
            "disabled": False,
        }]

    def get_dns_static_total_count(self):
        return 1

    def get_status_findings(self):
        return app.build_health_findings(
            {
                "status": "error",
                "updatedAt": "2026-08-12T12:00:00Z",
                "error": "ssh://admin:password@router.internal /ip/firewall print",
            }
        )

    def fetch_dns_static_evidence_page(self, offset=0, page_size=50):
        observed_at = "2026-08-12T12:00:00Z"
        rows = self.fetch_dns_static_page(offset=offset, limit=page_size)
        return {
            "schemaVersion": 1,
            "kind": "dns-static",
            "readOnly": True,
            "generatedAt": observed_at,
            "observedAt": observed_at,
            "evidenceMode": "current",
            "sourceStatus": "ok",
            "source": "rest-live",
            "coverage": "page",
            "revision": "f" * 64,
            "totalCount": 1,
            "offset": offset,
            "limit": page_size,
            "visibleRuleCount": len(rows),
            "page": {
                "offset": offset,
                "pageSize": page_size,
                "returnedCount": len(rows),
                "totalCount": 1,
                "revision": "f" * 64,
                "maxPageSize": 50,
                "maxVisibleRows": 1000,
                "maxVisiblePages": 20,
            },
            "rows": rows,
        }


class SupplementalRuntime:
    PANEL_PORT = 28646
    PANEL_PROFILE = "routeros_only"
    PANEL_TARGET = "127.0.0.1"
    PUBLIC_ROUTEROS_PROFILE = True
    DNS_STATIC_PAGE_LIMIT = 50
    DNS_STATIC_MAX_PAGE_LIMIT = 50
    to_int = staticmethod(app.to_int)
    to_bool = staticmethod(app.to_bool)

    def __init__(self) -> None:
        self.collector = SupplementalCollector()
        self.SUPPLEMENTAL_CONNECTION_GUARD = SupplementalConnectionGuard()

    @staticmethod
    def panel_client_address_is_allowed(client_address, headers):
        return True

    @staticmethod
    def panel_host_header_is_allowed(headers):
        return True


class SupplementalApiContractTest(unittest.TestCase):
    def setUp(self):
        self.runtime = SupplementalRuntime()
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), create_panel_handler(self.runtime))
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.runtime.collector.connection_release.set()
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def request(self, path):
        url = f"http://127.0.0.1:{self.server.server_port}{path}"
        try:
            with urlopen(url, timeout=3) as response:
                return response.status, json.loads(response.read())
        except HTTPError as error:
            return error.code, json.loads(error.read())

    def test_connection_query_is_strict_bounded_and_never_echoes_transport_errors(self):
        for path in (
            "/api/connection-search?target=router.local",
            "/api/connection-search?target=192.0.2.42&limit=51",
            "/api/connection-search?target=192.0.2.42&source=not-an-ip",
            "/api/connection-search?ip=192.0.2.42",
        ):
            status, payload = self.request(path)
            self.assertEqual(status, 400, payload)
            self.assertEqual(payload["code"], "invalid_connection_query", payload)

        service_log = io.StringIO()
        with contextlib.redirect_stderr(service_log):
            status, payload = self.request("/api/connection-search?target=198.51.100.250")
        self.assertEqual(status, 502, payload)
        self.assertEqual(payload["code"], "connection_search_unavailable", payload)
        self.assertNotIn("router.internal", json.dumps(payload))
        self.assertNotIn("not-for-public", json.dumps(payload))
        self.assertIn("RuntimeError", service_log.getvalue())
        self.assertNotIn("router.internal", service_log.getvalue())
        self.assertNotIn("not-for-public", service_log.getvalue())

        status, payload = self.request("/api/connection-search?target=192.0.2.42&limit=50")
        self.assertEqual(status, 200, payload)
        self.assertEqual(payload["schemaVersion"], 1)
        self.assertEqual(payload["kind"], "connection-search")
        self.assertEqual(payload["source"], "routeros-ssh")
        self.assertEqual(payload["query"], {"targetIp": "192.0.2.42", "sourceIp": None})
        self.assertEqual(payload["page"]["maxLimit"], 50)
        self.assertTrue(payload["readOnly"])
        self.assertEqual(payload["coverage"], "bounded-sample")
        self.assertTrue(payload["generatedAt"].endswith("Z"))
        self.assertEqual(payload["observedAt"], payload["generatedAt"])

    def test_connection_search_is_peer_rate_limited_and_single_flight(self):
        for _ in range(6):
            status, payload = self.request("/api/connection-search?target=192.0.2.42")
            self.assertEqual(status, 200, payload)
        status, payload = self.request("/api/connection-search?target=192.0.2.42")
        self.assertEqual(status, 429, payload)
        self.assertEqual(payload["code"], "rate_limited", payload)

        self.tearDown()
        self.setUp()
        self.runtime.collector.block_connections = True
        first = threading.Thread(target=self.request, args=("/api/connection-search?target=192.0.2.42",), daemon=True)
        first.start()
        self.assertTrue(self.runtime.collector.connection_started.wait(timeout=1))
        status, payload = self.request("/api/connection-search?target=192.0.2.43")
        self.assertEqual(status, 429, payload)
        self.assertEqual(payload["code"], "connection_search_in_flight", payload)
        self.runtime.collector.connection_release.set()
        first.join(timeout=2)

    def test_connection_search_rows_preserve_missing_rates_and_minimize_public_fields(self):
        collector = object.__new__(app.Collector)
        collector.ssh_lock = threading.Lock()
        collector.connection_evidence = ConnectionEvidenceParser(
            app.to_int,
            detail_sample_limit=10,
            search_fields=app.CONNECTION_SEARCH_FIELDS,
        )

        class Client:
            def close(self):
                return None

        collector.open_ssh_client = lambda: Client()
        collector.ssh_capture = lambda *args, **kwargs: {
            "text": "src-address=192.0.2.42:51844 dst-address=1.1.1.1:443 protocol=tcp timeout=1m",
            "complete": True,
            "capturedBytes": 96,
            "firstOutputSeconds": 0.01,
        }
        payload = collector.fetch_connection_search("192.0.2.42", limit=40)
        self.assertEqual(payload["coverage"], "bounded-sample")
        self.assertEqual(
            payload["rows"],
            [{
                "srcIp": "192.0.2.42",
                "dstIp": "1.1.1.1",
                "protocol": "tcp",
                "timeout": "1m",
                "origRateBps": None,
                "replRateBps": None,
            }],
        )

        collector.ssh_capture = lambda *args, **kwargs: {
            "text": "src-address=192.0.2.42:51844 dst-address=1.1.1.1:443 protocol=tcp timeout=1m orig-rate=0 repl-rate=1250",
            "complete": True,
            "capturedBytes": app.CONNECTION_SEARCH_STREAM_MAX_BYTES,
            "firstOutputSeconds": 0.01,
        }
        bounded = collector.fetch_connection_search("192.0.2.42", limit=40)
        self.assertEqual(bounded["rows"][0]["origRateBps"], 0)
        self.assertEqual(bounded["rows"][0]["replRateBps"], 1250)
        self.assertEqual(bounded["coverage"], "bounded-sample")
        self.assertFalse(bounded["capture"]["complete"])

    def test_dns_page_contract_enforces_safe_page_boundaries_and_envelope(self):
        for path in (
            "/api/dns-static?offset=-1&pageSize=20",
            "/api/dns-static?offset=1&pageSize=20",
            "/api/dns-static?offset=1000&pageSize=50",
            "/api/dns-static?offset=0&pageSize=51",
        ):
            status, payload = self.request(path)
            self.assertEqual(status, 400, payload)
            self.assertEqual(payload["code"], "invalid_dns_page", payload)

        status, payload = self.request("/api/dns-static?offset=0&pageSize=20")
        self.assertEqual(status, 200, payload)
        self.assertEqual(payload["schemaVersion"], 1)
        self.assertEqual(payload["kind"], "dns-static")
        self.assertEqual(payload["source"], "rest-live")
        self.assertEqual(payload["coverage"], "page")
        self.assertEqual(payload["page"]["pageSize"], 20)
        self.assertEqual(payload["page"]["maxVisibleRows"], 1000)
        self.assertEqual(payload["page"]["maxVisiblePages"], 20)
        self.assertTrue(payload["observedAt"].endswith("Z"))
        self.assertLessEqual(len(payload["rows"][0]["comment"]), 256)
        self.assertNotIn("\x00", payload["rows"][0]["comment"])
        self.assertNotIn("\n", payload["rows"][0]["comment"])

        status, payload = self.request("/api/dns-static?offset=50&pageSize=50")
        self.assertEqual(status, 409, payload)
        self.assertEqual(payload["code"], "dns_page_out_of_range", payload)
        self.assertEqual(payload["totalCount"], 1)
        self.assertEqual(payload["lastPage"], 1)
        self.assertEqual(payload["revision"], "f" * 64)

    def test_health_findings_are_bounded_redacted_and_time_qualified(self):
        snapshot = {
            "status": "error",
            "updatedAt": "2026-08-12T12:00:00Z",
            "error": "Traceback: ssh://admin:password@router.internal /ip/firewall print",
            "meta": {
                "realtimeError": "https://router.internal/rest failed token=secret",
                "realtimeLastErrorAt": "2026-08-12T12:00:01Z",
            },
        }
        payload = app.build_health_findings(copy.deepcopy(snapshot))
        serialized = json.dumps(payload)
        self.assertEqual(payload["schemaVersion"], 1)
        self.assertEqual(payload["kind"], "health-findings")
        self.assertTrue(payload["readOnly"])
        self.assertEqual(payload["source"], "snapshot-health-analysis")
        self.assertEqual(payload["evidenceMode"], "historical")
        self.assertEqual(payload["sourceStatus"], "degraded")
        self.assertEqual(payload["coverage"], "bounded-sample")
        self.assertTrue(payload["generatedAt"].endswith("Z"))
        self.assertEqual(payload["observedAt"], "2026-08-12T12:00:00Z")
        self.assertLessEqual(len(payload["findings"]), 20)
        for finding in payload["findings"]:
            self.assertLessEqual(len(finding["title"]), 120)
            self.assertLessEqual(len(finding["summary"]), 240)
            self.assertLessEqual(len(finding["evidence"]), 6)
            self.assertTrue(all(fact["value"] is not None for fact in finding["evidence"]))
        for secret in ("router.internal", "password", "token=secret", "Traceback", "/ip/firewall"):
            self.assertNotIn(secret, serialized)

        unavailable = app.build_health_findings({"status": "error", "updatedAt": "2026-08-12 12:00:00"})
        self.assertEqual(unavailable["observedAt"], None)
        self.assertEqual(unavailable["evidenceMode"], "unavailable")
        self.assertEqual(unavailable["sourceStatus"], "failed")
        self.assertEqual(unavailable["coverage"], "unavailable")

        starting = app.build_health_findings({"status": "starting", "updatedAt": None})
        self.assertEqual(starting["evidenceMode"], "unavailable")
        self.assertEqual(starting["sourceStatus"], "unknown")
        self.assertEqual(starting["coverage"], "unavailable")

        status, endpoint_payload = self.request("/api/health-findings")
        self.assertEqual(status, 200, endpoint_payload)
        self.assertEqual(endpoint_payload["kind"], "health-findings")
        self.assertNotIn("router.internal", json.dumps(endpoint_payload))

    def test_dns_cache_miss_is_single_flight_and_never_claims_complete_inventory(self):
        collector = object.__new__(app.Collector)
        collector.lock = threading.Lock()
        collector.dns_static_refresh_lock = threading.Lock()
        collector.dns_static_cache = {"rows": [], "count": 0, "fetched_at": 0.0, "updatedAt": None, "revision": None}
        calls = []
        started = threading.Event()
        release = threading.Event()

        def fetch_live():
            calls.append(True)
            started.set()
            release.wait(timeout=2)
            rows = [{"name": "a.example", "address": "192.0.2.10"}]
            with collector.lock:
                collector.dns_static_cache = {
                    "rows": rows,
                    "count": 1,
                    "fetched_at": app.time.time(),
                    "updatedAt": "2026-08-12T12:00:00Z",
                    "revision": "r1",
                }
            return rows

        collector.fetch_dns_static_full_rest = fetch_live
        collector.fetch_dns_static_preview = lambda count: []
        results = []
        first = threading.Thread(target=lambda: results.append(collector.fetch_dns_static_evidence_page(0, 20)))
        second = threading.Thread(target=lambda: results.append(collector.fetch_dns_static_evidence_page(0, 20)))
        first.start()
        self.assertTrue(started.wait(timeout=1))
        second.start()
        release.set()
        first.join(timeout=2)
        second.join(timeout=2)

        self.assertEqual(len(calls), 1)
        self.assertEqual(len(results), 2)
        self.assertTrue(all(item["coverage"] == "page" for item in results))
        self.assertTrue(all(item["coverage"] != "complete" for item in results))
        self.assertTrue(all(item["source"] in {"rest-live", "rest-cache"} for item in results))
        self.assertTrue(all(item["page"]["revision"] == item["revision"] for item in results))

    def test_connection_capture_that_stops_early_is_only_a_bounded_sample(self):
        collector = object.__new__(app.Collector)
        collector.ssh_lock = threading.Lock()
        collector.open_ssh_client = lambda: type("Client", (), {"close": lambda self: None})()
        collector.ssh_capture = lambda *args, **kwargs: {
            "text": "address=192.0.2.42:12345",
            "complete": False,
            "capturedBytes": 31,
            "firstOutputSeconds": 0.01,
        }
        collector.parse_connection_terse_line = lambda line: {"src-address": "192.0.2.42:12345"}
        collector.connection_row_matches_ip = lambda row, address: True
        collector.normalize_connection_search_row = lambda row: row

        payload = collector.fetch_connection_search("192.0.2.42", limit=50)
        self.assertFalse(payload["capture"]["complete"])
        self.assertTrue(payload["capture"]["incompleteTransport"])
        self.assertEqual(payload["coverage"], "bounded-sample")
        self.assertNotEqual(payload["coverage"], "complete")


if __name__ == "__main__":
    unittest.main()
