"""Snapshot payload-boundary row caps (M7): WAN/derived retention + meta.scale truthfulness.

_apply_snapshot_row_caps 只裁剪最终 payload 的 interfaces/terminals 行数；
内部派生计数（overview.onlineTerminals、ipv6 计数、semantic triage）保持全量口径。
Run: python -m unittest discover -s tests -t .
"""
import os
import tempfile
import unittest
from unittest import mock

# The login-store path is read from the environment at import time; isolate it
# before app.py is imported so tests never touch a real store.
os.environ["ROS_PANEL_ROUTER_LOGIN_STORE_FILE"] = os.path.join(
    tempfile.gettempdir(), "ros-panel-unit-test-logins.json"
)

import app  # noqa: E402  (repo root is on sys.path via unittest -t .)
import ros_panel.collector as collector_mod  # noqa: E402


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
    rest["ip_addresses"] = [{"interface": "bridge", "actual-interface": "bridge", "address": "10.0.0.1/8"}]
    rest.update(overrides)
    return rest


EMPTY_SSH = {"counts": {"all": 0, "tcp": 0, "udp": 0, "icmp": 0}, "active_connections": []}


def scale_entry(snapshot, key):
    return snapshot["meta"]["scale"][key]


class SnapshotRowCapEnvTest(unittest.TestCase):
    def test_default_is_500(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("ROS_PANEL_SNAPSHOT_ROW_CAP", None)
            self.assertEqual(collector_mod.snapshot_row_cap_from_env(), 500)
            self.assertEqual(collector_mod.SNAPSHOT_ROW_CAP_MAX, 20000)

    def test_cap_max_never_exceeds_react_validator_limit(self):
        with open(os.path.join("src", "panel-framework", "runtime", "panelRuntimeSchema.ts"), encoding="utf-8") as fh:
            src = fh.read()
        self.assertIn("MAX_SNAPSHOT_COLLECTION_ROWS = 20_000", src)
        self.assertLessEqual(collector_mod.SNAPSHOT_ROW_CAP_MAX, 20000)

    def test_valid_override_wins(self):
        with mock.patch.dict(os.environ, {"ROS_PANEL_SNAPSHOT_ROW_CAP": "2000"}):
            self.assertEqual(collector_mod.snapshot_row_cap_from_env(), 2000)

    def test_upper_bound_accepted(self):
        with mock.patch.dict(os.environ, {"ROS_PANEL_SNAPSHOT_ROW_CAP": "20000"}):
            self.assertEqual(collector_mod.snapshot_row_cap_from_env(), 20000)

    def test_invalid_or_out_of_range_fall_back_to_default(self):
        for raw in ("abc", "0", "-5", "20001", "", "   "):
            with mock.patch.dict(os.environ, {"ROS_PANEL_SNAPSHOT_ROW_CAP": raw}):
                self.assertEqual(collector_mod.snapshot_row_cap_from_env(), 500, raw)


def iface_row(name, role="LAN", derived=False):
    return {"name": name, "role": role, "isDerivedInterface": derived}


def terminal_row(ip):
    return {"ip": ip, "upRate": 0, "downRate": 0, "connections": 0}


def synthetic_snapshot(interfaces, terminals):
    return {
        "status": "ok",
        "meta": {"scale": {
            "interfaces": app.list_scale_meta(len(interfaces), len(interfaces), sampled=False, sorted_by="role/name/quality"),
            "terminals": app.list_scale_meta(len(terminals), len(terminals), sampled=False, sorted_by="traffic/connections"),
        }},
        "interfaces": interfaces,
        "terminals": terminals,
    }


class ApplySnapshotRowCapsTest(unittest.TestCase):
    def test_interfaces_capped_with_wan_fully_retained(self):
        interfaces = []
        for i in range(10500):
            if i % 1000 == 0:
                interfaces.append(iface_row(f"wan{i}", role="WAN"))
            elif i % 500 == 7:
                interfaces.append(iface_row(f"vlan{i}", derived=True))
            else:
                interfaces.append(iface_row(f"ether{i}"))
        snapshot = synthetic_snapshot(interfaces, [])
        capped = collector_mod._apply_snapshot_row_caps(snapshot, cap=500)
        rows = capped["interfaces"]
        self.assertEqual(len(rows), 500)
        kept_names = [row["name"] for row in rows]
        # All WAN rows survive regardless of position.
        for i in range(0, 10500, 1000):
            self.assertIn(f"wan{i}", kept_names)
        # Remaining budget filled from the head of the existing input order.
        self.assertEqual(kept_names[:11], [f"wan{i}" for i in range(0, 10500, 1000)])
        self.assertEqual(kept_names[11:14], ["ether1", "ether2", "ether3"])
        meta = scale_entry(capped, "interfaces")
        self.assertEqual(meta["totalCount"], 10500)
        self.assertEqual(meta["actualCount"], 10500)
        self.assertEqual(meta["shownCount"], 500)
        self.assertEqual(meta["limit"], 500)
        self.assertTrue(meta["hasMore"])
        self.assertTrue(meta["sampled"])
        self.assertIn("WAN", meta["sampleMethod"])

    def test_wan_exceeding_cap_are_all_kept(self):
        interfaces = [iface_row(f"wan{i}", role="WAN") for i in range(30)]
        interfaces += [iface_row(f"ether{i}") for i in range(100)]
        snapshot = synthetic_snapshot(interfaces, [])
        capped = collector_mod._apply_snapshot_row_caps(snapshot, cap=10)
        self.assertEqual(len(capped["interfaces"]), 30)
        meta = scale_entry(capped, "interfaces")
        self.assertEqual(meta["totalCount"], 130)
        self.assertEqual(meta["shownCount"], 30)
        self.assertTrue(meta["hasMore"])
        self.assertTrue(meta["sampled"])

    def test_terminals_capped_first_n_kept_in_order(self):
        terminals = [terminal_row(f"10.0.{i}.1") for i in range(2000)]
        snapshot = synthetic_snapshot([], terminals)
        capped = collector_mod._apply_snapshot_row_caps(snapshot, cap=500)
        self.assertEqual([row["ip"] for row in capped["terminals"]], [f"10.0.{i}.1" for i in range(500)])
        meta = scale_entry(capped, "terminals")
        self.assertEqual(meta["totalCount"], 2000)
        self.assertEqual(meta["shownCount"], 500)
        self.assertEqual(meta["limit"], 500)
        self.assertTrue(meta["hasMore"])
        self.assertTrue(meta["sampled"])
        self.assertEqual(meta["sortedBy"], "traffic/connections")

    def test_under_cap_snapshot_untouched(self):
        interfaces = [iface_row(f"ether{i}") for i in range(100)]
        terminals = [terminal_row(f"10.0.{i}.1") for i in range(100)]
        snapshot = synthetic_snapshot(interfaces, terminals)
        capped = collector_mod._apply_snapshot_row_caps(snapshot, cap=500)
        self.assertEqual(len(capped["interfaces"]), 100)
        self.assertEqual(len(capped["terminals"]), 100)
        self.assertFalse(scale_entry(capped, "interfaces")["sampled"])
        self.assertFalse(scale_entry(capped, "terminals")["sampled"])
        self.assertEqual(scale_entry(capped, "interfaces")["shownCount"], 100)


class BuildSnapshotSamplingTest(unittest.TestCase):
    def _scale_rest(self, iface_total=10500, wan_stride=1000, arp_total=10500):
        interfaces = []
        for i in range(iface_total):
            if i == 0:
                name, iface_type = "ether1", "ether"
            elif i % wan_stride == 0:
                name, iface_type = f"wanUplink{i}", "ether"
            elif i % 500 == 7:
                name, iface_type = f"vlanDerived{i}", "vlan"
            else:
                name, iface_type = f"etherLan{i}", "ether"
            interfaces.append({"name": name, "type": iface_type, "running": "true", "disabled": "false"})
        rest = base_rest()
        rest["interfaces"] = interfaces
        # Default routes make ether1 + wanUplink* infer as WAN role.
        rest["routes"] = [{"dst-address": "0.0.0.0/0", "gateway": "ether1", "active": "true", "distance": "1"}]
        rest["routes"] += [
            {"dst-address": "0.0.0.0/0", "gateway": f"wanUplink{i}", "active": "true", "distance": "2"}
            for i in range(wan_stride, iface_total, wan_stride)
        ]
        # A wide LAN scope so every ARP address yields a distinct terminal.
        rest["arp"] = [
            {
                "address": f"10.{(i // 62500) % 250}.{(i // 250) % 250}.{(i % 250) + 2}",
                "mac-address": f"AA:BB:CC:DD:{(i >> 8) & 0xFF:02X}:{i & 0xFF:02X}",
                "status": "reachable",
            }
            for i in range(arp_total)
        ]
        # IPv6 on an interface that never survives the cap: proves ipv6 counting stays full-scope.
        rest["ipv6_addresses"] = [
            {"interface": "etherLan10300", "actual-interface": "etherLan10300", "address": "2001:db8::1030/64"}
        ]
        return rest

    def test_large_snapshot_rows_capped_and_meta_truthful(self):
        collector = app.Collector()
        snapshot = collector.build_snapshot(self._scale_rest(), EMPTY_SSH)
        wan_names = {"ether1"} | {f"wanUplink{i}" for i in range(1000, 10500, 1000)}
        derived_names = {f"vlanDerived{i}" for i in range(7, 10500, 500)}
        rows = snapshot["interfaces"]
        self.assertLessEqual(len(rows), 500)
        self.assertEqual(len(rows), 500)
        kept_names = {row["name"] for row in rows}
        self.assertTrue(wan_names <= kept_names)
        # LAN logical rows sort last in the existing order, so the cap cuts them first.
        self.assertTrue(derived_names.isdisjoint(kept_names))
        meta = scale_entry(snapshot, "interfaces")
        self.assertEqual(meta["totalCount"], 10500)
        self.assertEqual(meta["shownCount"], 500)
        self.assertTrue(meta["hasMore"])
        self.assertTrue(meta["sampled"])
        self.assertIn("WAN", meta["sampleMethod"])
        terminals = snapshot["terminals"]
        self.assertEqual(len(terminals), 500)
        tmeta = scale_entry(snapshot, "terminals")
        self.assertEqual(tmeta["totalCount"], 10500)
        self.assertEqual(tmeta["shownCount"], 500)
        self.assertTrue(tmeta["hasMore"])
        self.assertTrue(tmeta["sampled"])
        # Derived counts stay on the full-data scale.
        self.assertEqual(snapshot["overview"]["onlineTerminals"], 10500)
        self.assertEqual(snapshot["meta"]["ipv6InterfaceCount"], 1)
        self.assertEqual(snapshot["meta"]["ipv6TerminalCount"], 0)
        # React validator hard limit never tripped at the default cap.
        self.assertLessEqual(len(rows), 20000)
        self.assertLessEqual(len(terminals), 20000)

    def test_small_snapshot_not_sampled(self):
        collector = app.Collector()
        rest = base_rest()
        rest["arp"] = [{"address": "10.0.0.2", "mac-address": "AA:BB:CC:DD:EE:01", "status": "reachable"}]
        snapshot = collector.build_snapshot(rest, EMPTY_SSH)
        self.assertFalse(scale_entry(snapshot, "interfaces")["sampled"])
        self.assertFalse(scale_entry(snapshot, "terminals")["sampled"])
        self.assertEqual(scale_entry(snapshot, "interfaces")["shownCount"], 1)
        self.assertEqual(scale_entry(snapshot, "terminals")["shownCount"], 1)


if __name__ == "__main__":
    unittest.main()
