#!/usr/bin/env python3
"""Regression coverage for public timestamp and compressed static-asset contracts."""

from __future__ import annotations

import copy
import io
import json
import os
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import Mock, patch
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import app
from panel_backend.http_dispatcher import PanelRequestHandler, create_panel_handler
from panel_backend.static_assets import StaticAssetNotFound, _resolve_contained_file, resolve_static_asset


class PublicTimestampContractTest(unittest.TestCase):
    class Collector:
        def __init__(self) -> None:
            self.lock = threading.Lock()
            self.realtime_updated_at = "2026-08-09 12:34:56"
            self.realtime_last_error_at = "2026-08-09 12:35:56"
            self.realtime_error = "collection failed"
            self.realtime_failures = {"/rest/system/resource": "timeout"}
            self.state = {
                "status": "error",
                "updatedAt": "2026-08-09 12:34:56",
                "lastSuccessAt": "2026-08-09 12:34:56",
                "lastFailureAt": "2026-08-09 12:35:56",
                "trustExpiresAt": "2026-08-09 12:36:56",
                "expiresAt": "2026-08-09 12:37:56",
                "checkpointTimestamp": "2026-08-09 12:38:56",
                "leaseTime": "10m",
                "meta": {"qualifiedAt": "2026-08-09T20:34:56+08:00"},
            }

        def get_state(self) -> dict[str, object]:
            return copy.deepcopy(self.state)

    class Runtime:
        PANEL_PORT = 28646
        PANEL_PROFILE = "routeros_only"
        PANEL_TARGET = "127.0.0.1"

        def __init__(self) -> None:
            self.collector = PublicTimestampContractTest.Collector()

        @staticmethod
        def panel_client_address_is_allowed(client_address, headers) -> bool:
            return True

        @staticmethod
        def panel_host_header_is_allowed(headers) -> bool:
            return True

        @staticmethod
        def panel_request_access_url(headers, fallback_port) -> str:
            return f"http://127.0.0.1:{fallback_port}"

        @staticmethod
        def panel_network_payload(**kwargs) -> dict[str, object]:
            return {"currentUrl": kwargs.get("request_url")}

        @staticmethod
        def public_router_config() -> dict[str, object]:
            return {"configured": True}

        @staticmethod
        def public_saved_router_logins() -> list[object]:
            return []

    @staticmethod
    def _serialized_payload(payload: object) -> dict[str, object]:
        handler = object.__new__(PanelRequestHandler)
        handler.wfile = io.BytesIO()
        handler.send_response = lambda status: None
        handler.send_header = lambda name, value: None
        handler.end_headers = lambda: None
        handler.consume_cookie_headers = lambda: []
        PanelRequestHandler.send_json(handler, payload)
        return json.loads(handler.wfile.getvalue())

    def test_unified_response_boundary_redacts_timestamp_shaped_connection_error_fields(self) -> None:
        handler = object.__new__(PanelRequestHandler)
        captured = {}
        handler.send_json = lambda payload, status=200, headers=None: captured.update(
            self._serialized_payload(payload)
        )

        PanelRequestHandler.send_json_error(
            handler,
            "connection test failed",
            status=409,
            code="router_login_failed",
            test={
                "lastSuccessAt": "2026-08-09 12:34:56",
                "lastFailureAt": "2026-08-09 12:35:56",
                "trustExpiresAt": "2026-08-09 12:36:56",
                "expiresAt": "2026-08-09 12:37:56",
                "probeTimestamp": "2026-08-09 12:38:56",
                "verifiedAt": "2026-08-09T12:39:56Z",
                "absentAt": None,
            },
        )

        test = captured["test"]
        for key in ("lastSuccessAt", "lastFailureAt", "trustExpiresAt", "expiresAt", "probeTimestamp"):
            self.assertIsNone(test[key])
        self.assertEqual(test["verifiedAt"], "2026-08-09T12:39:56Z")
        self.assertIsNone(test["absentAt"])

    def test_snapshot_and_health_normalize_evidence_added_after_snapshot_collection(self) -> None:
        runtime = self.Runtime()
        handler = create_panel_handler(runtime)
        from http.server import HTTPServer

        server = HTTPServer(("127.0.0.1", 0), handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            payloads = {}
            for path in ("/api/snapshot", "/api/health"):
                with urlopen(f"http://127.0.0.1:{server.server_port}{path}", timeout=2) as response:
                    payloads[path] = json.loads(response.read())
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

        for payload in payloads.values():
            for key in (
                "updatedAt",
                "lastSuccessAt",
                "lastFailureAt",
                "trustExpiresAt",
                "expiresAt",
                "checkpointTimestamp",
            ):
                if key in payload:
                    self.assertIsNone(payload[key])
            self.assertIsNone(payload["collectionEvidence"]["lastSuccessAt"])
            self.assertIsNone(payload["collectionEvidence"]["lastFailureAt"])

        self.assertEqual(payloads["/api/snapshot"]["meta"]["qualifiedAt"], "2026-08-09T20:34:56+08:00")
        self.assertEqual(payloads["/api/snapshot"]["leaseTime"], "10m")

    def test_public_timestamp_rejects_a_timezone_less_value(self) -> None:
        self.assertEqual(
            app.require_rfc3339_timestamp("2026-08-09T12:34:56Z"),
            "2026-08-09T12:34:56Z",
        )
        with self.assertRaises(ValueError):
            app.require_rfc3339_timestamp("2026-08-09 12:34:56")
        with self.assertRaises(ValueError):
            app.require_rfc3339_timestamp("0000-01-01T00:00:00Z")

    def test_app_generated_timestamp_is_qualified_rfc3339(self) -> None:
        value = app.format_iso_now()
        self.assertTrue(value.endswith("Z") or value[-6:-5] in {"+", "-"})

    def test_resource_history_uses_atomic_rfc3339_samples(self) -> None:
        collector = app.Collector()
        history = collector.history

        self.assertEqual(set(history), {"resourceSamples", "trafficSamples"})
        sample = {
            "timestamp": app.format_iso_now(),
            "cpu": 12,
            "memory": 34,
            "disk": 56,
            "source": "routeros-resource",
            "evidenceMode": "current",
        }
        history["resourceSamples"].append(sample)

        self.assertEqual(list(history["resourceSamples"]), [sample])
        self.assertEqual(
            app.require_rfc3339_timestamp(sample["timestamp"]),
            sample["timestamp"],
        )

    def test_external_provider_timestamp_without_timezone_is_redacted(self) -> None:
        version_response = Mock(status_code=200, ok=True)
        version_response.json.return_value = {"version": "test"}
        providers_response = Mock(ok=True)
        providers_response.json.return_value = {
            "providers": {
                "timezone-less": {"updatedAt": "2026-08-09T12:34:56"},
                "qualified": {"updated-at": "2026-08-09T20:34:56+08:00"},
            }
        }

        with patch.object(app, "READONLY_NIKKI_CONTROLLER", "http://nikki.test"), patch.object(
            app.requests, "get", side_effect=[version_response, providers_response]
        ):
            providers = {row["name"]: row for row in app.nikki_probe()["providers"]}

        self.assertIsNone(providers["timezone-less"]["updatedAt"])
        self.assertEqual(providers["qualified"]["updatedAt"], "2026-08-09T20:34:56+08:00")

    def test_snapshot_timestamp_contract_redacts_ambiguous_nested_evidence(self) -> None:
        snapshot = app.normalize_collector_snapshot_status(
            {
                "status": "ok",
                "updatedAt": "2026-08-09 12:34:56",
                "meta": {"realtimeUpdatedAt": "2026-08-09T12:34:56Z"},
                "overview": {"systemTime": "2026-08-09T20:34:56+08:00"},
                "history": [{"timestamp": "2026-08-09T12:34:56"}],
                "findings": [{"createdAt": "2026-08-09T12:34:56Z"}],
            }
        )
        self.assertIsNone(snapshot["updatedAt"])
        self.assertEqual(snapshot["meta"]["realtimeUpdatedAt"], "2026-08-09T12:34:56Z")
        self.assertEqual(snapshot["overview"]["systemTime"], "2026-08-09T20:34:56+08:00")
        self.assertIsNone(snapshot["history"][0]["timestamp"])
        self.assertEqual(snapshot["findings"][0]["createdAt"], "2026-08-09T12:34:56Z")

    def test_log_times_are_published_only_as_qualified_observed_at_evidence(self) -> None:
        logs = app.Collector.build_logs(
            None,
            {
                "logs": [
                    {"time": "12:00:01", "topics": "system,info", "message": "ambiguous"},
                    {"time": "2026-08-09T20:34:56+08:00", "topics": "system,info", "message": "qualified"},
                ]
            },
        )

        self.assertNotIn("time", logs["all"][0])
        self.assertIsNone(logs["all"][0]["observedAt"])
        self.assertNotIn("time", logs["all"][1])
        self.assertEqual(logs["all"][1]["observedAt"], "2026-08-09T20:34:56+08:00")

    def test_uncollected_connection_protocols_do_not_invent_a_total(self) -> None:
        collector = app.Collector()
        collector.fetch_connection_tracking_summary = Mock(return_value={"total": 7})

        self.assertEqual(
            collector.fetch_connection_protocol_counts(),
            {"tcp": None, "udp": None, "icmp": None, "all": None},
        )

    def test_interface_counters_preserve_missing_and_observed_zero(self) -> None:
        rows = app.Collector.build_interfaces(
            None,
            {
                "interfaces": [
                    {"name": "missing", "type": "ether"},
                    {
                        "name": "zero",
                        "type": "ether",
                        "rx-byte": "0",
                        "tx-byte": "0",
                        "rx-packet": "0",
                        "tx-packet": "0",
                        "rx-drop": "0",
                        "tx-drop": "0",
                        "rx-error": "0",
                        "tx-error": "0",
                    },
                ],
                "routes": [],
                "pppoe": [],
                "dhcp_clients": [],
            },
            {},
            {},
            {},
        )
        by_name = {row["name"]: row for row in rows}
        self.assertIsNone(by_name["missing"]["rxBytes"])
        self.assertIsNone(by_name["missing"]["packetTotal"])
        self.assertEqual(by_name["zero"]["rxBytes"], 0)
        self.assertEqual(by_name["zero"]["packetTotal"], 0)

    def test_interface_observation_requires_complete_counter_samples(self) -> None:
        collector = app.Collector()
        incomplete = {
            "name": "ether1",
            "type": "ether",
            "rx-byte": "10",
            "rx-packet": "0",
            "tx-packet": 0,
            "rx-drop": "0",
            "tx-drop": 0,
            "tx-error": "0",
        }
        complete_zero = {
            "name": "ether1",
            "type": "ether",
            "rx-byte": "0",
            "tx-byte": 0,
            "rx-packet": "0",
            "tx-packet": 0,
            "rx-drop": "0",
            "tx-drop": 0,
            "rx-error": "0",
            "tx-error": 0,
        }

        rates = collector.compute_rates([incomplete], fresh_counter_sample=True)["ether1"]
        quality = collector.compute_interface_quality([incomplete], fresh_counter_sample=True)["ether1"]
        self.assertIsNone(rates["rxBps"])
        self.assertIsNone(rates["txBps"])
        self.assertFalse(rates["rateSampleReady"])
        self.assertIsNone(quality["packetTotal"])
        self.assertIsNone(quality["packetDelta"])
        self.assertIsNone(quality["dropTotal"])
        self.assertIsNone(quality["errorTotal"])
        self.assertIsNone(quality["dropDelta"])
        self.assertIsNone(quality["errorDelta"])
        self.assertFalse(quality["qualitySampleReady"])

        first_complete_rates = collector.compute_rates([complete_zero], fresh_counter_sample=True)["ether1"]
        first_complete_quality = collector.compute_interface_quality([complete_zero], fresh_counter_sample=True)["ether1"]
        self.assertIsNone(first_complete_rates["rxBps"])
        self.assertIsNone(first_complete_rates["txBps"])
        self.assertFalse(first_complete_rates["rateSampleReady"])
        self.assertEqual(first_complete_quality["packetTotal"], 0)
        self.assertIsNone(first_complete_quality["packetDelta"])
        self.assertFalse(first_complete_quality["qualitySampleReady"])

        second_complete_rates = collector.compute_rates([complete_zero], fresh_counter_sample=True)["ether1"]
        second_complete_quality = collector.compute_interface_quality([complete_zero], fresh_counter_sample=True)["ether1"]
        self.assertEqual(second_complete_rates["rxBps"], 0)
        self.assertEqual(second_complete_rates["txBps"], 0)
        self.assertTrue(second_complete_rates["rateSampleReady"])
        self.assertEqual(second_complete_quality["packetTotal"], 0)
        self.assertEqual(second_complete_quality["packetDelta"], 0)
        self.assertEqual(second_complete_quality["dropTotal"], 0)
        self.assertEqual(second_complete_quality["errorTotal"], 0)
        self.assertEqual(second_complete_quality["dropDelta"], 0)
        self.assertEqual(second_complete_quality["errorDelta"], 0)
        self.assertTrue(second_complete_quality["qualitySampleReady"])

    def test_snapshot_connection_total_requires_protocol_observation(self) -> None:
        collector = app.Collector()
        collector.get_wan_latency = lambda force=False: {"ok": False, "latencyMs": None, "updatedAt": None, "error": None}
        rest = copy.deepcopy(app.EMPTY_REST_BUNDLE)
        rest["identity"] = {"name": "fixture-router"}
        rest["resource"] = {}
        missing_protocols = collector.build_snapshot(
            rest,
            {"counts": {"all": 7, "tcp": None, "udp": None, "icmp": None}, "active_connections": []},
        )
        observed_summary = collector.build_snapshot(
            rest,
            {
                "counts": {"all": 7, "tcp": None, "udp": None, "icmp": None},
                "protocolUpdatedAt": "2026-08-10T01:00:00Z",
                "active_connections": [],
            },
        )
        observed_zero = collector.build_snapshot(
            rest,
            {"counts": {"all": 0, "tcp": 0, "udp": 0, "icmp": 0}, "active_connections": []},
        )

        self.assertIsNone(missing_protocols["connections"]["total"])
        self.assertIsNone(missing_protocols["overview"]["connectionTotal"])
        self.assertEqual(observed_summary["connections"]["total"], 7)
        self.assertEqual(observed_summary["overview"]["connectionTotal"], 7)
        self.assertEqual(observed_zero["connections"]["total"], 0)
        self.assertEqual(observed_zero["overview"]["connectionTotal"], 0)

    def test_connection_rate_evidence_preserves_missing_and_observed_zero(self) -> None:
        collector = app.Collector()
        rest = copy.deepcopy(app.EMPTY_REST_BUNDLE)
        rest["arp"] = [
            {"address": "192.168.88.2", "mac-address": "00:00:00:00:00:02", "status": "reachable"},
            {"address": "192.168.88.3", "mac-address": "00:00:00:00:00:03", "status": "reachable"},
            {"address": "192.168.88.4", "mac-address": "00:00:00:00:00:04", "status": "reachable"},
            {"address": "192.168.88.5", "mac-address": "00:00:00:00:00:05", "status": "reachable"},
        ]
        ssh = {
            "active_connections": [
                {"src-address": "192.168.88.2", "reply-src-address": "198.51.100.2", "protocol": "tcp", "orig-bytes": "1", "repl-bytes": "2"},
                {"src-address": "192.168.88.3", "reply-src-address": "198.51.100.3", "protocol": "udp", "orig-rate": "0", "repl-rate": "0", "orig-bytes": "3", "repl-bytes": "4"},
                {"src-address": "192.168.88.4", "reply-src-address": "198.51.100.4", "protocol": "tcp", "orig-rate": "125", "orig-bytes": "5", "repl-bytes": "6"},
                {"src-address": "192.168.88.4", "reply-src-address": "198.51.100.5", "protocol": "tcp", "orig-rate": "25", "repl-rate": "5", "orig-bytes": "7", "repl-bytes": "8"},
            ]
        }

        result = collector.build_terminals_and_connections(
            rest,
            ssh,
            [app.ipaddress.ip_network("192.168.88.0/24")],
            set(),
        )
        terminal_by_ip = {row["ip"]: row for row in result["terminals"]}
        active_by_ip = {row["localIp"]: row for row in result["activeConnections"]}
        protocol_by_name = {row["name"]: row for row in result["protocolTop"]}

        self.assertEqual((terminal_by_ip["192.168.88.3"]["upRate"], terminal_by_ip["192.168.88.3"]["downRate"]), (0, 0))
        self.assertEqual((terminal_by_ip["192.168.88.2"]["upRate"], terminal_by_ip["192.168.88.2"]["downRate"]), (None, None))
        self.assertEqual((terminal_by_ip["192.168.88.4"]["upRate"], terminal_by_ip["192.168.88.4"]["downRate"]), (150, None))
        self.assertEqual((terminal_by_ip["192.168.88.5"]["upRate"], terminal_by_ip["192.168.88.5"]["downRate"]), (None, None))
        self.assertEqual((active_by_ip["192.168.88.2"]["upRate"], active_by_ip["192.168.88.2"]["downRate"], active_by_ip["192.168.88.2"]["totalRate"]), (None, None, None))
        self.assertEqual((protocol_by_name["TCP 活跃流量"]["upRate"], protocol_by_name["TCP 活跃流量"]["downRate"], protocol_by_name["TCP 活跃流量"]["totalRate"]), (None, None, None))
        self.assertEqual((protocol_by_name["UDP 活跃流量"]["upRate"], protocol_by_name["UDP 活跃流量"]["downRate"], protocol_by_name["UDP 活跃流量"]["totalRate"]), (0, 0, 0))

    def test_mobile_object_inspector_keeps_missing_values_unavailable(self) -> None:
        inspector = (ROOT / "src" / "panel-framework" / "mobile-reference-ui" / "MobileReferenceSurface.tsx").read_text(encoding="utf-8")

        self.assertIn('value === null || value === undefined || !Number.isFinite(value)', inspector)
        self.assertIn('value || "—"', inspector)
        self.assertNotIn('value || 0', inspector)

    def test_production_history_exposes_atomic_timezone_qualified_evidence_only(self) -> None:
        collector = app.Collector()
        collector.get_wan_latency = lambda force=False: {"ok": False, "latencyMs": None, "updatedAt": None, "error": None}
        rest = copy.deepcopy(app.EMPTY_REST_BUNDLE)
        rest["identity"] = {"name": "fixture-router"}
        rest["resource"] = {
            "cpu-load": "42",
            "total-memory": "1000",
            "free-memory": "350",
            "total-hdd-space": "2000",
            "free-hdd-space": "500",
        }
        rest["interfaces"] = [{"name": "ether1", "type": "ether", "running": True, "rx-byte": "10", "tx-byte": "20"}]

        timestamps = [
            "2026-08-10T01:00:00Z",
            "2026-08-10T01:00:01Z",
            "2026-08-10T01:00:02Z",
            "2026-08-10T01:00:03Z",
            "2026-08-10T01:00:04Z",
            "2026-08-10T01:00:05Z",
            "2026-08-10T01:00:06Z",
        ]
        with patch.object(app, "format_iso_now", side_effect=timestamps):
            collector.build_snapshot(
                rest,
                {"counts": {"all": None, "tcp": None, "udp": None, "icmp": None}, "active_connections": []},
                fresh_counter_sample=True,
            )
            snapshot = collector.build_snapshot(
                rest,
                {"counts": {"all": None, "tcp": None, "udp": None, "icmp": None}, "active_connections": []},
                fresh_counter_sample=True,
            )
            non_rate_snapshot = collector.build_snapshot(
                rest,
                {"counts": {"all": None, "tcp": None, "udp": None, "icmp": None}, "active_connections": []},
                fresh_counter_sample=False,
            )

        history = snapshot["overview"]["history"]
        self.assertEqual(set(history), {"resourceSamples", "trafficSamples"})
        self.assertEqual(len(history["resourceSamples"]), 2)
        sample = history["resourceSamples"][-1]
        self.assertEqual(sample["timestamp"], snapshot["updatedAt"])
        self.assertEqual(sample["source"], "routeros-resource")
        self.assertEqual(sample["evidenceMode"], "current")
        self.assertEqual(app.require_rfc3339_timestamp(sample["timestamp"]), snapshot["updatedAt"])
        self.assertEqual(len(history["trafficSamples"]), 1)
        traffic = history["trafficSamples"][0]
        self.assertEqual(traffic["timestamp"], timestamps[3])
        self.assertNotEqual(traffic["timestamp"], snapshot["updatedAt"])
        self.assertEqual(traffic["source"], "counter-delta")
        self.assertEqual(traffic["evidenceMode"], "current")
        self.assertEqual(app.require_rfc3339_timestamp(traffic["timestamp"]), timestamps[3])
        self.assertEqual(non_rate_snapshot["updatedAt"], timestamps[6])
        self.assertEqual(non_rate_snapshot["overview"]["history"]["trafficSamples"], [traffic])

    def test_health_findings_never_repeat_an_ambiguous_source_timestamp(self) -> None:
        findings = app.build_health_findings({"status": "ok", "updatedAt": "2026-08-09 12:34:56"})
        self.assertIsNone(findings["sourceUpdatedAt"])


class CompressedStaticAssetBoundaryTest(unittest.TestCase):
    def test_out_of_root_compressed_sidecars_are_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as tempdir:
            base = Path(tempdir)
            public_dir = base / "public"
            public_dir.mkdir()
            (public_dir / "app.js").write_bytes(b"identity")
            outside = base / "outside-sidecar"
            outside.write_bytes(b"outside")

            for suffix, encoding in (("br", "br"), ("gz", "gzip")):
                sidecar = public_dir / f"app.js.{suffix}"
                try:
                    os.symlink(outside, sidecar)
                except OSError as exc:
                    # Windows can block symlink creation. The sidecar resolver
                    # delegates to this same containment primitive.
                    with self.assertRaises(StaticAssetNotFound):
                        _resolve_contained_file(public_dir.resolve(), outside, sidecar.name)
                else:
                    with self.assertRaises(StaticAssetNotFound):
                        resolve_static_asset(public_dir, "app.js", accept_encoding=encoding)
                    sidecar.unlink()

    def test_compressed_sidecar_symlinks_are_rejected_even_inside_public_root(self) -> None:
        with tempfile.TemporaryDirectory() as tempdir:
            public_dir = Path(tempdir)
            (public_dir / "app.js").write_bytes(b"identity")
            in_root_sidecar_target = public_dir / "prebuilt-sidecar"
            in_root_sidecar_target.write_bytes(b"compressed")

            for suffix, encoding in (("br", "br"), ("gz", "gzip")):
                sidecar = public_dir / f"app.js.{suffix}"
                try:
                    os.symlink(in_root_sidecar_target, sidecar)
                except OSError:
                    # Windows can block symlink creation without Developer Mode
                    # or elevation; the external-link test still covers the
                    # containment path on those hosts.
                    continue
                try:
                    with self.assertRaises(StaticAssetNotFound):
                        resolve_static_asset(public_dir, "app.js", accept_encoding=encoding)
                finally:
                    sidecar.unlink()


if __name__ == "__main__":
    unittest.main()
