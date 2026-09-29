"""Unit tests for the core parsing/building functions in app.py.

These guard the boundary between raw RouterOS data and the panel's internal
model — the exact places where the four high-severity bugs of the
2026-09-28 audit lived. Run: python -m unittest discover -s tests -t .
"""
import datetime
import ipaddress
import json
import os
import tempfile
import unittest

# The login-store path is read from the environment at import time; isolate it
# before app.py is imported so tests never touch a real store.
os.environ["ROS_PANEL_ROUTER_LOGIN_STORE_FILE"] = os.path.join(
    tempfile.gettempdir(), "ros-panel-unit-test-logins.json"
)

import app  # noqa: E402  (repo root is on sys.path via unittest -t .)


class Rest(dict):
    """REST bundle fixture: unknown keys default to [] ({} for object endpoints)."""

    def __missing__(self, key):
        self[key] = {} if key in ("resource", "identity", "clock", "ntp", "dns") else []
        return self[key]


def base_rest(**overrides):
    rest = Rest()
    rest["identity"] = {"name": "unit-test-ros"}
    rest["resource"] = {
        "cpu-load": "10", "free-memory": "500", "total-memory": "1000",
        "free-hdd-space": "10", "total-hdd-space": "100",
        "version": "7.20", "board-name": "x", "architecture-name": "arm",
        "cpu": "qemu", "cpu-count": "4", "cpu-frequency": "800", "uptime": "1w2d03:04:05",
    }
    rest["clock"] = {"date": "sep/28/2026", "time": "10:00:00"}
    rest["interfaces"] = [{"name": "ether1", "type": "ether", "running": "true", "disabled": "false"}]
    rest["ip_addresses"] = [{"interface": "bridge", "actual-interface": "bridge", "address": "192.168.88.1/24"}]
    rest.update(overrides)
    return rest


class SplitConnectionEndpointTest(unittest.TestCase):
    def test_ipv4_with_port(self):
        self.assertEqual(app.split_connection_endpoint("192.168.88.2:43470"), "192.168.88.2")

    def test_bare_ipv4(self):
        self.assertEqual(app.split_connection_endpoint("192.168.88.2"), "192.168.88.2")

    def test_ipv6_bracket_with_port(self):
        self.assertEqual(app.split_connection_endpoint("[2001:db8::1]:443"), "2001:db8::1")

    def test_bare_ipv6(self):
        self.assertEqual(app.split_connection_endpoint("2001:db8::1"), "2001:db8::1")

    def test_garbage_and_invalid_port(self):
        self.assertIsNone(app.split_connection_endpoint("garbage"))
        self.assertIsNone(app.split_connection_endpoint("192.168.88.2:99999"))
        self.assertIsNone(app.split_connection_endpoint(""))
        self.assertIsNone(app.split_connection_endpoint(None))


class ExtractLocalIpTest(unittest.TestCase):
    def setUp(self):
        self.collector = app.Collector()
        self.networks = [ipaddress.ip_network("192.168.88.0/24")]
        self.router_ips = {"192.168.88.1"}

    def test_lan_terminal_with_port_is_parsed(self):
        conn = {
            "src-address": "192.168.88.2:43470", "reply-src-address": "93.184.216.34:443",
            "dst-address": "93.184.216.34:443", "reply-dst-address": "192.168.88.2:43470",
        }
        local, remote, key = self.collector.extract_local_ip(conn, self.networks, self.router_ips)
        self.assertEqual((local, key), ("192.168.88.2", "src-address"))
        self.assertEqual(remote, "93.184.216.34:443")

    def test_router_own_connection_excluded(self):
        conn = {
            "src-address": "192.168.88.1:8291", "reply-src-address": "1.2.3.4:5000",
            "dst-address": "1.2.3.4:5000", "reply-dst-address": "192.168.88.1:8291",
        }
        self.assertEqual(self.collector.extract_local_ip(conn, self.networks, self.router_ips), (None, None, None))

    def test_garbage_address_skipped(self):
        conn = {"src-address": "not-an-address", "reply-src-address": "1.2.3.4:80"}
        self.assertEqual(self.collector.extract_local_ip(conn, self.networks, self.router_ips), (None, None, None))


class CounterDeltaTest(unittest.TestCase):
    def test_forward(self):
        self.assertEqual(app.counter_delta(100, 50), 50)

    def test_reset(self):
        self.assertIsNone(app.counter_delta(50, 100))

    def test_wrap64(self):
        wrap = 1 << 64
        self.assertEqual(app.counter_delta(10, wrap - 5), 15)
        self.assertEqual(app.counter_delta(0, wrap - 1), 1)


class ComputeRatesWrapTest(unittest.TestCase):
    def test_wraparound_rate_stays_positive(self):
        collector = app.Collector()
        first = [{"name": "ether1", "rx-byte": str(2**64 - 1000), "tx-byte": "0"}]
        collector.compute_rates(first, fresh_counter_sample=True)
        second = [{"name": "ether1", "rx-byte": "500", "tx-byte": "0"}]
        rates = collector.compute_rates(second, fresh_counter_sample=True)
        self.assertGreater(rates["ether1"]["rxBps"], 0)


class BuildLogsTest(unittest.TestCase):
    def test_newest_window_visible(self):
        collector = app.Collector()
        rest = Rest()
        rest["logs"] = [{"time": f"t{i}", "topics": "system", "message": f"msg-{i}"} for i in range(300)]
        logs = collector.build_logs(rest)
        self.assertEqual(logs["all"][0]["message"], "msg-240")
        self.assertEqual(logs["all"][-1]["message"], "msg-299")
        self.assertLessEqual(len(logs["all"]), 60)


class BuildInterfacesSortTest(unittest.TestCase):
    def test_malformed_names_do_not_crash(self):
        collector = app.Collector()
        rest = base_rest()
        rest["interfaces"] = [
            {"name": "ether1", "type": "ether", "running": "true", "disabled": "false"},
            {"name": None, "type": "ether", "running": "true", "disabled": "false"},
            {"name": 12345, "type": "ether", "running": "true", "disabled": "false"},
        ]
        _, _, _ = collector.build_maps(rest)
        quality = {}
        items = collector.build_interfaces(rest, {}, collector.build_maps(rest)[0], quality)
        self.assertEqual(len(items), 3)

    def test_snapshot_survives_malformed_interface(self):
        collector = app.Collector()
        rest = base_rest()
        rest["interfaces"].append({"name": None, "type": "ether", "running": "true", "disabled": "false"})
        snapshot = collector.build_snapshot(rest, {"counts": {"all": 0, "tcp": 0, "udp": 0, "icmp": 0}, "active_connections": []})
        self.assertEqual(snapshot["status"], "ok")


class BuildOverviewTest(unittest.TestCase):
    def test_cpu_clamped_and_anomaly_reported(self):
        collector = app.Collector()
        rest = base_rest(resource={"cpu-load": "250", "free-memory": "500", "total-memory": "1000",
                                   "free-hdd-space": "10", "total-hdd-space": "100"})
        overview = collector.build_overview(rest, {"counts": {"all": 0, "tcp": 0, "udp": 0, "icmp": 0}}, 0, {"up": 0, "down": 0})
        self.assertEqual(overview["cpuLoad"], 100)
        self.assertTrue(any("CPU" in item for item in overview["resourceAnomaly"]))

    def test_routeros_v6_formats_normalized(self):
        collector = app.Collector()
        rest = base_rest()
        overview = collector.build_overview(rest, {"counts": {"all": 0, "tcp": 0, "udp": 0, "icmp": 0}}, 0, {"up": 0, "down": 0})
        self.assertEqual(overview["uptime"], "1周2天 03:04:05")
        self.assertEqual(overview["systemTime"], "2026-09-28 10:00:00")

    def test_clock_far_future_flagged(self):
        collector = app.Collector()
        rest = base_rest(clock={"date": "jan/01/2099", "time": "00:00:00"})
        overview = collector.build_overview(rest, {"counts": {"all": 0, "tcp": 0, "udp": 0, "icmp": 0}}, 0, {"up": 0, "down": 0})
        self.assertTrue(overview["clockAnomaly"])
        self.assertIsNotNone(overview["clockOffsetSeconds"])


class FormatterTest(unittest.TestCase):
    def test_uptime_variants(self):
        self.assertEqual(app.format_routeros_uptime("1w2d03:04:05"), "1周2天 03:04:05")
        self.assertEqual(app.format_routeros_uptime("2d05:00:00"), "2天 05:00:00")
        self.assertEqual(app.format_routeros_uptime("03:04:05"), "03:04:05")
        self.assertEqual(app.format_routeros_uptime("weird"), "weird")

    def test_clock_variants(self):
        self.assertEqual(app.format_routeros_clock("sep/28/2026"), "2026-09-28")
        self.assertEqual(app.format_routeros_clock("garbage"), "garbage")


class CompactExceptionTextTest(unittest.TestCase):
    class FakeResponse:
        def __init__(self, code):
            self.status_code = code

    class FakeError(Exception):
        def __init__(self, message, code=None):
            super().__init__(message)
            self.response = CompactExceptionTextTest.FakeResponse(code) if code else None

    def test_http_status_preferred(self):
        text = app.compact_exception_text(self.FakeError("401 Client Error: Unauthorized for url: http://10.0.0.1/rest/x", 401))
        self.assertEqual(text, "REST 返回 HTTP 401")

    def test_url_stripped_and_truncated(self):
        text = app.compact_exception_text(self.FakeError("HTTPConnectionPool(host='r', port=80): Max retries exceeded with url: /rest/x (Caused by boom) " * 5))
        self.assertNotIn("url:", text)
        self.assertLessEqual(len(text), 210)


class BuildWanLinesTest(unittest.TestCase):
    def test_hybrid_pppoe_and_dhcp_both_present(self):
        collector = app.Collector()
        rest = Rest()
        rest["routes"] = [{"dst-address": "0.0.0.0/0", "active": "true"}]
        rest["dhcp_clients"] = [{"interface": "etherWan", "add-default-route": "true", "default-route-distance": "1"}]
        pppoe = [{"name": "pppoe-out10", "parent": "ether1", "running": True, "status": "在线"}]
        interfaces = [
            {"name": "etherWan", "role": "WAN", "running": True, "disabled": False, "type": "ether"},
            {"name": "pppoe-out10", "role": "WAN", "running": True, "disabled": False, "type": "pppoe-out"},
        ]
        lines = collector.build_wan_lines(rest, pppoe, interfaces)
        kinds = {row["kind"] for row in lines}
        self.assertEqual(kinds, {"pppoe", "interface"})
        self.assertEqual([row["lineId"] for row in lines], ["pppoe-out10", "etherWan"])

    def test_pppoe_parent_not_duplicated(self):
        collector = app.Collector()
        rest = Rest()
        rest["routes"] = []
        rest["dhcp_clients"] = []
        pppoe = [{"name": "pppoe-out10", "parent": "ether1", "running": True}]
        interfaces = [{"name": "pppoe-out10", "role": "WAN", "running": True, "disabled": False, "type": "pppoe-out"},
                      {"name": "ether1", "role": "WAN", "running": True, "disabled": False, "type": "ether"}]
        lines = collector.build_wan_lines(rest, pppoe, interfaces)
        self.assertEqual([row["lineId"] for row in lines], ["pppoe-out10"])


class TerminalsLanScopeTest(unittest.TestCase):
    def test_out_of_scope_arp_counted(self):
        collector = app.Collector()
        rest = base_rest()
        rest["arp"] = [
            {"address": "192.168.88.2", "mac-address": "AA:BB:CC:DD:EE:01", "status": "reachable"},
            {"address": "10.99.99.9", "mac-address": "AA:BB:CC:DD:EE:99", "status": "stale"},
        ]
        networks = collector.build_maps(rest)[1]
        result = collector.build_terminals_and_connections(rest, {"counts": {}, "active_connections": []}, networks, collector.build_maps(rest)[2])
        self.assertEqual(result["meta"]["lanScope"]["arpTotal"], 2)
        self.assertEqual(result["meta"]["lanScope"]["arpOutOfScope"], 1)


class ScaleMetaTest(unittest.TestCase):
    def test_truncated_lists_report_has_more(self):
        collector = app.Collector()
        rest = base_rest()
        rest["routes"] = [{"dst-address": f"10.{i}.0.0/24", "gateway": "10.0.0.1"} for i in range(200)]
        snapshot = collector.build_snapshot(rest, {"counts": {"all": 0, "tcp": 0, "udp": 0, "icmp": 0}, "active_connections": []})
        scale = snapshot["meta"]["scale"]
        self.assertEqual(scale["routes"]["totalCount"], 200)
        self.assertEqual(scale["routes"]["shownCount"], 160)
        self.assertTrue(scale["routes"]["hasMore"])
        self.assertFalse(scale["pppoe"]["hasMore"])


class LoginStoreTest(unittest.TestCase):
    def test_roundtrip_and_legacy_plaintext(self):
        entry = {"id": "t1", "host": "192.0.2.1", "user": "probe", "password": "秘密-P@ss", "sshPort": 22,
                 "label": "t", "source": "saved", "createdAt": "2026-09-28T00:00:00", "updatedAt": "2026-09-28T00:00:00"}
        with app.ROUTER_LOGIN_STORE_LOCK:
            app.persist_router_login_store_unlocked([entry])
            loaded = app.load_router_login_store_unlocked()
        self.assertEqual(loaded[0]["password"], "秘密-P@ss")
        raw = json.loads(open(os.environ["ROS_PANEL_ROUTER_LOGIN_STORE_FILE"], encoding="utf-8").read())
        stored = raw["entries"][0]["password"]
        if os.name == "nt":
            self.assertTrue(stored.startswith(app.ROUTER_LOGIN_SECRET_PREFIX), "windows store must not hold plaintext")
        else:
            self.assertEqual(stored, "秘密-P@ss")

    @unittest.skipUnless(os.name == "nt", "DPAPI is Windows-only")
    def test_dpapi_roundtrip(self):
        protected = app.dpapi_protect_secret("s3cret-密码")
        self.assertTrue(protected.startswith(app.ROUTER_LOGIN_SECRET_PREFIX))
        self.assertEqual(app.dpapi_unprotect_secret(protected), "s3cret-密码")
        self.assertEqual(app.dpapi_unprotect_secret("plain"), "plain")
        self.assertIsNone(app.dpapi_unprotect_secret(""))


class HealthFindingsTest(unittest.TestCase):
    def _snapshot(self, **rest_overrides):
        collector = app.Collector()
        rest = base_rest(**rest_overrides)
        ssh = {"counts": {"all": 0, "tcp": 0, "udp": 0, "icmp": 0}, "active_connections": []}
        return collector.build_snapshot(rest, ssh)

    def test_envelope_matches_strict_readonly_contract(self):
        payload = app.build_health_findings(self._snapshot())
        self.assertEqual(payload["kind"], "health-findings")
        self.assertEqual(payload["schemaVersion"], 1)
        self.assertIs(payload["readOnly"], True)
        self.assertEqual(payload["source"], "snapshot-health-analysis")
        self.assertEqual(payload["evidenceMode"], "current")
        self.assertEqual(payload["sourceStatus"], "ok")
        self.assertEqual(payload["coverage"], "bounded-sample")
        self.assertRegex(payload["generatedAt"], r"Z$")
        self.assertRegex(payload["observedAt"], r"Z$")
        self.assertEqual(payload["sourceUpdatedAt"], payload["observedAt"])
        self.assertIsInstance(payload["findings"], list)
        for row in payload["findings"]:
            self.assertIn(row["severity"], {"critical", "warning", "info"})
            self.assertLessEqual(len(row["id"]), 128)
            self.assertLessEqual(len(row["evidence"]), 6)
            for item in row["evidence"]:
                self.assertLessEqual(len(item["label"]), 64)
                self.assertIsInstance(item["value"], (str, int, float, bool))

    def test_resource_pressure_becomes_critical_finding(self):
        rest = base_rest(resource={
            "cpu-load": "95", "free-memory": "500", "total-memory": "1000",
            "free-hdd-space": "10", "total-hdd-space": "100",
            "version": "7.20", "board-name": "x", "architecture-name": "arm",
        })
        payload = app.build_health_findings(self._snapshot(**{"resource": rest["resource"]}))
        self.assertEqual(payload["status"], "critical")
        self.assertEqual(payload["counts"]["critical"], 1)
        self.assertEqual(payload["topFinding"]["id"], "system.resource_pressure")
        self.assertEqual(payload["findings"][0]["severity"], "critical")

    def test_naive_snapshot_clock_becomes_rfc3339(self):
        snapshot = self._snapshot()
        # build_snapshot stamps naive local clocks; the envelope must not leak them.
        self.assertNotIn("T", snapshot["updatedAt"])
        payload = app.build_health_findings(snapshot)
        converted = app.public_rfc3339_timestamp(snapshot["updatedAt"])
        self.assertIsNotNone(converted)
        self.assertEqual(payload["observedAt"], converted)
        self.assertTrue(converted.endswith("Z"))


def _connection_row(local_ip="192.168.88.2", remote_ip="93.184.216.34:443", up=100, down=200):
    return {
        "localIp": local_ip, "remoteIp": remote_ip, "protocol": "TCP",
        "upRate": up, "downRate": down, "timeout": "4w2d", "mark": "-",
        "totalRate": up + down, "sessionBytes": up * 10,
    }


class ConnectionSearchTest(unittest.TestCase):
    def _collector_with_rows(self, rows, detail_error=None):
        collector = app.Collector()
        collector.state = {
            "status": "ok",
            "updatedAt": "2026-09-29 09:25:50",
            "error": None,
            "meta": {},
            "connections": {"active": rows, "detailError": detail_error},
        }
        return collector

    def test_empty_match_keeps_envelope_valid(self):
        collector = self._collector_with_rows([_connection_row()])
        payload = collector.fetch_connection_search("192.168.88.99", limit=20)
        self.assertEqual(payload["kind"], "connection-search")
        self.assertEqual(payload["schemaVersion"], 1)
        self.assertIs(payload["readOnly"], True)
        self.assertEqual(payload["source"], "routeros-ssh")
        self.assertEqual(payload["evidenceMode"], "current")
        self.assertEqual(payload["sourceStatus"], "ok")
        self.assertEqual(payload["coverage"], "bounded-sample")
        self.assertEqual(payload["targetIp"], "192.168.88.99")
        self.assertEqual(payload["matchCount"], 0)
        self.assertEqual(payload["rows"], [])
        self.assertIsNone(payload["capture"]["timedOut"])
        self.assertFalse(payload["capture"]["truncatedByRows"])
        self.assertFalse(payload["capture"]["incompleteTransport"])
        self.assertRegex(payload["observedAt"], r"Z$")

    def test_match_by_local_ip_respects_limit_and_truncation(self):
        collector = self._collector_with_rows([_connection_row(remote_ip=f"93.184.216.{i}:443") for i in range(5)])
        payload = collector.fetch_connection_search("192.168.88.2", limit=3)
        self.assertEqual(payload["matchCount"], 3)
        self.assertEqual(payload["limit"], 3)
        self.assertTrue(payload["capture"]["truncatedByRows"])
        self.assertEqual({row["srcIp"] for row in payload["rows"]}, {"192.168.88.2"})
        self.assertTrue(all(row["dstIp"].startswith("93.184.216.") for row in payload["rows"]))
        self.assertEqual(payload["rows"][0]["origRateBps"], 100)
        self.assertEqual(payload["rows"][0]["replRateBps"], 200)

    def test_match_by_remote_ip_and_source_pair_filter(self):
        collector = self._collector_with_rows([
            _connection_row(local_ip="192.168.88.2", remote_ip="93.184.216.34:443"),
            _connection_row(local_ip="192.168.88.3", remote_ip="93.184.216.34:443"),
        ])
        payload = collector.fetch_connection_search("93.184.216.34", source_ip="192.168.88.3", limit=20)
        self.assertEqual(payload["matchCount"], 1)
        self.assertEqual(payload["rows"][0]["srcIp"], "192.168.88.3")
        self.assertEqual(payload["sourceIp"], "192.168.88.3")

    def test_degraded_channel_marks_source_status(self):
        collector = self._collector_with_rows([], detail_error="REST failed; SSH fallback failed")
        payload = collector.fetch_connection_search("192.168.88.2", limit=20)
        self.assertEqual(payload["sourceStatus"], "degraded")
        self.assertTrue(payload["capture"]["incompleteTransport"])

    def test_query_parser_rejects_bad_input(self):
        with self.assertRaises(ValueError):
            app.parse_connection_search_query({"target": ["not-an-ip"]})
        with self.assertRaises(ValueError):
            app.parse_connection_search_query({"target": ["192.168.88.2"], "limit": ["0"]})
        with self.assertRaises(ValueError):
            app.parse_connection_search_query({"target": ["192.168.88.2"], "limit": ["51"]})
        with self.assertRaises(ValueError):
            app.parse_connection_search_query({"target": ["192.168.88.2"], "bogus": ["1"]})
        target, source, limit = app.parse_connection_search_query({"ip": ["192.168.88.2"], "limit": ["40"]})
        self.assertEqual((target, source, limit), ("192.168.88.2", None, 40))


class PeerRateGuardTest(unittest.TestCase):
    def test_second_call_within_interval_rejected(self):
        now = [1000.0]
        guard = app.PeerRateGuard(min_interval=5.0, clock=lambda: now[0])
        allowed, _ = guard.acquire("10.0.0.1")
        self.assertTrue(allowed)
        allowed, retry_after = guard.acquire("10.0.0.1")
        self.assertFalse(allowed)
        self.assertGreaterEqual(retry_after, 1)
        self.assertLessEqual(retry_after, 5)
        now[0] += 6.0
        allowed, _ = guard.acquire("10.0.0.1")
        self.assertTrue(allowed)
        allowed, _ = guard.acquire("10.0.0.2")
        self.assertTrue(allowed, "different peer must not share the interval")


class RememberProfileTest(unittest.TestCase):
    def _clear_store(self):
        store = os.environ["ROS_PANEL_ROUTER_LOGIN_STORE_FILE"]
        with app.ROUTER_LOGIN_STORE_LOCK:
            if os.path.exists(store):
                os.remove(store)

    def setUp(self):
        self._clear_store()

    def tearDown(self):
        self._clear_store()

    def _stored_entries(self):
        with app.ROUTER_LOGIN_STORE_LOCK:
            return app.load_router_login_store_unlocked()

    def test_remember_profile_saves_device_profile_without_password(self):
        entry = app.remember_login_for_request(False, True, False, "192.0.2.7", "admin", "typed-secret", 22)
        self.assertIsNotNone(entry)
        self.assertEqual(entry["password"], "")
        stored = self._stored_entries()
        self.assertEqual(len(stored), 1)
        self.assertEqual(stored[0]["host"], "192.0.2.7")
        self.assertEqual(stored[0]["user"], "admin")
        self.assertEqual(stored[0]["sshPort"], 22)
        self.assertEqual(stored[0]["password"], "")
        raw = json.loads(open(os.environ["ROS_PANEL_ROUTER_LOGIN_STORE_FILE"], encoding="utf-8").read())
        self.assertEqual(raw["entries"][0]["password"], "", "rememberProfile must never persist the typed password")

    def test_remember_profile_false_saves_nothing(self):
        entry = app.remember_login_for_request(False, False, False, "192.0.2.7", "admin", "typed-secret", 22)
        self.assertIsNone(entry)
        self.assertEqual(self._stored_entries(), [])

    def test_profile_only_never_clobbers_saved_password(self):
        app.remember_login_for_request(True, False, False, "192.0.2.7", "admin", "typed-secret", 22)
        entry = app.remember_login_for_request(False, True, True, "192.0.2.7", "admin", "typed-secret", 22)
        self.assertIsNone(entry)
        stored = self._stored_entries()
        self.assertEqual(len(stored), 1)
        self.assertEqual(stored[0]["password"], "typed-secret")

    def test_remember_password_keeps_legacy_semantics(self):
        entry = app.remember_login_for_request(True, False, False, "192.0.2.7", "admin", "typed-secret", 22)
        self.assertIsNotNone(entry)
        stored = self._stored_entries()
        self.assertEqual(stored[0]["password"], "typed-secret")
        raw = json.loads(open(os.environ["ROS_PANEL_ROUTER_LOGIN_STORE_FILE"], encoding="utf-8").read())
        if os.name == "nt":
            self.assertTrue(raw["entries"][0]["password"].startswith(app.ROUTER_LOGIN_SECRET_PREFIX))
        else:
            self.assertEqual(raw["entries"][0]["password"], "typed-secret")


if __name__ == "__main__":
    unittest.main()
