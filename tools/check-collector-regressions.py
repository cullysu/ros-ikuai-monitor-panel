import json
import os
import pathlib
import socket
import sys
import tempfile
import threading
import time
import copy


ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

os.environ.setdefault("ROS_PANEL_PROFILE", "routeros_only")
os.environ.setdefault("ROS_MONITOR_ROUTER_HOST", "127.0.0.1")
os.environ.setdefault("ROS_MONITOR_ROUTER_USER", "smoke")
os.environ.setdefault("ROS_MONITOR_ROUTER_PASSWORD", "CHANGE_ME")
os.environ.setdefault(
    "ROS_PANEL_ROUTER_LOGIN_STORE_FILE",
    str(pathlib.Path(tempfile.gettempdir()) / "ros-panel-regression-router-logins.json"),
)

import app  # noqa: E402


def make_rate_rest(
    rx_bytes,
    tx_bytes,
    *,
    name="pppoe-out1",
    iface_type="pppoe-out",
    cpu_load=12,
    free_memory=600000,
    free_hdd=800000,
    rx_packets=10,
    tx_packets=20,
    rx_drop=0,
    tx_drop=0,
    rx_error=0,
    tx_error=0,
):
    rest = copy.deepcopy(app.EMPTY_REST_BUNDLE)
    rest["identity"] = {"name": "fixture-router"}
    rest["resource"] = {
        "version": "7.19.0",
        "board-name": "fixture",
        "architecture-name": "x86_64",
        "cpu": "fixture-cpu",
        "cpu-count": "2",
        "cpu-frequency": "2000",
        "cpu-load": str(cpu_load),
        "total-memory": "1000000",
        "free-memory": str(free_memory),
        "total-hdd-space": "1000000",
        "free-hdd-space": str(free_hdd),
        "uptime": "1d",
    }
    rest["clock"] = {"date": "2026-05-25", "time": "11:00:00"}
    rest["ntp"] = {"status": "synchronized"}
    rest["interfaces"] = [
        {
            "name": name,
            "type": iface_type,
            "running": "true",
            "disabled": "false",
            "mac-address": "00:11:22:33:44:55",
            "rx-packet": str(rx_packets),
            "tx-packet": str(tx_packets),
            "rx-drop": str(rx_drop),
            "tx-drop": str(tx_drop),
            "rx-error": str(rx_error),
            "tx-error": str(tx_error),
            "rx-byte": str(rx_bytes),
            "tx-byte": str(tx_bytes),
        }
    ]
    rest["pppoe"] = [{"name": name, "running": "true", "interface": "ether1", "disabled": "false"}]
    rest["ip_addresses"] = [
        {
            "interface": name,
            "actual-interface": name,
            "address": "198.51.100.2/32",
            "network": "198.51.100.1",
        }
    ]
    rest["routes"] = [
        {
            "dst-address": "0.0.0.0/0",
            "gateway": name,
            "distance": "1",
            "routing-table": "main",
            "active": "true",
            "static": "false",
            "dynamic": "true",
            "disabled": "false",
        }
    ]
    return rest


def assert_wan_model_combines_pppoe_and_dhcp_lines():
    collector = app.Collector()
    collector.get_wan_latency = lambda force=False: {"ok": True, "latencyMs": 1, "updatedAt": "fixture"}
    rest = make_rate_rest(1000000, 2000000, name="pppoe-out1", iface_type="pppoe-out")
    rest["interfaces"].append(
        {
            "name": "ether-dhcp-wan",
            "type": "ether",
            "running": "true",
            "disabled": "false",
            "mac-address": "00:11:22:33:44:66",
            "rx-packet": "100",
            "tx-packet": "80",
            "rx-drop": "0",
            "tx-drop": "0",
            "rx-error": "0",
            "tx-error": "0",
            "rx-byte": "3000000",
            "tx-byte": "4000000",
        }
    )
    rest["dhcp_clients"] = [
        {"interface": "ether-dhcp-wan", "status": "bound", "disabled": "false", "add-default-route": "true", "default-route-distance": "5"}
    ]
    rest["ip_addresses"].append(
        {"interface": "ether-dhcp-wan", "actual-interface": "ether-dhcp-wan", "address": "203.0.113.10/24", "network": "203.0.113.0"}
    )
    rest["routes"].append(
        {
            "dst-address": "0.0.0.0/0",
            "gateway": "ether-dhcp-wan",
            "distance": "5",
            "routing-table": "main",
            "active": "true",
            "static": "false",
            "dynamic": "true",
            "disabled": "false",
        }
    )
    snapshot = collector.build_snapshot(rest, make_empty_ssh(), fresh_counter_sample=True)
    access_by_name = {row["name"]: row.get("access") for row in snapshot["wan"]}
    assert access_by_name.get("pppoe-out1") == "PPPoE", snapshot["wan"]
    assert access_by_name.get("ether-dhcp-wan") == "DHCP", snapshot["wan"]
    assert len(snapshot["wan"]) == 2, snapshot["wan"]
    assert snapshot["meta"]["wanCount"] == 2, snapshot["meta"]


def make_empty_ssh():
    return {
        "counts": {"all": 0, "tcp": 0, "udp": 0, "icmp": 0},
        "active_connections": [],
        "protocolUpdatedAt": None,
        "detailUpdatedAt": None,
    }


def make_active_connection(index):
    host_octet = (index % 240) + 2
    return {
        "src-address": f"10.20.0.{host_octet}",
        "reply-src-address": f"203.0.113.{(index % 200) + 1}",
        "dst-address": f"203.0.113.{(index % 200) + 1}",
        "reply-dst-address": f"10.20.0.{host_octet}",
        "protocol": "tcp",
        "orig-rate": str(1000 + index),
        "repl-rate": str(2000 + index),
        "orig-bytes": str(10000 + index),
        "repl-bytes": str(20000 + index),
        "timeout": "59s",
        "connection-mark": "",
    }


def make_arbitrary_scale_rest(interface_count=125):
    rest = copy.deepcopy(app.EMPTY_REST_BUNDLE)
    rest["identity"] = {"name": "non-cully-router"}
    rest["resource"] = {
        "version": "7.19.0",
        "board-name": "generic",
        "architecture-name": "arm64",
        "cpu": "generic",
        "cpu-count": "4",
        "cpu-frequency": "1400",
        "cpu-load": "18",
        "total-memory": "2000000",
        "free-memory": "1200000",
        "total-hdd-space": "4000000",
        "free-hdd-space": "3000000",
        "uptime": "2d",
    }
    rest["clock"] = {"date": "2026-05-25", "time": "12:30:00"}
    rest["ntp"] = {"status": "synchronized"}
    interfaces = [
        {
            "name": "ether-wan",
            "type": "ether",
            "running": "true",
            "disabled": "false",
            "mac-address": "02:00:00:00:00:01",
            "rx-byte": "1000000",
            "tx-byte": "2000000",
            "rx-packet": "1000",
            "tx-packet": "2000",
            "rx-drop": "0",
            "tx-drop": "0",
            "rx-error": "0",
            "tx-error": "0",
        },
        {
            "name": "bridge-lan",
            "type": "bridge",
            "running": "true",
            "disabled": "false",
            "mac-address": "02:00:00:00:00:02",
            "rx-byte": "500000",
            "tx-byte": "600000",
            "rx-packet": "500",
            "tx-packet": "600",
            "rx-drop": "0",
            "tx-drop": "0",
            "rx-error": "0",
            "tx-error": "0",
        },
    ]
    for index in range(max(0, interface_count - len(interfaces))):
        interfaces.append(
            {
                "name": f"tenant-vlan-{index + 1}",
                "type": "vlan",
                "interface": "bridge-lan",
                "vlan-id": str(index + 1),
                "running": "true",
                "disabled": "false",
                "mac-address": f"02:00:01:00:{index // 256:02x}:{index % 256:02x}",
                "rx-byte": str(1000 + index),
                "tx-byte": str(2000 + index),
                "rx-packet": str(100 + index),
                "tx-packet": str(120 + index),
                "rx-drop": "0",
                "tx-drop": "0",
                "rx-error": "0",
                "tx-error": "0",
            }
        )
    rest["interfaces"] = interfaces
    rest["pppoe"] = []
    rest["dhcp_clients"] = [{"interface": "ether-wan", "status": "bound", "disabled": "false", "add-default-route": "true"}]
    rest["ip_addresses"] = [
        {"interface": "ether-wan", "actual-interface": "ether-wan", "address": "198.51.100.10/24", "network": "198.51.100.0"},
        {"interface": "bridge-lan", "actual-interface": "bridge-lan", "address": "10.20.0.1/24", "network": "10.20.0.0"},
    ]
    rest["routes"] = [
        {
            "dst-address": "0.0.0.0/0",
            "gateway": "ether-wan",
            "distance": "1",
            "routing-table": "main",
            "active": "true",
            "disabled": "false",
        }
    ]
    rest["arp"] = [
        {
            "address": f"10.20.0.{index + 2}",
            "mac-address": f"02:00:02:00:00:{index + 2:02x}",
            "status": "reachable",
            "dynamic": "true",
        }
        for index in range(20)
    ]
    return rest


def run_fake_banner_server(payload):
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("127.0.0.1", 0))
    server.listen(1)
    port = server.getsockname()[1]

    def serve_once():
        try:
            conn, _ = server.accept()
            with conn:
                conn.sendall(payload)
        finally:
            server.close()

    thread = threading.Thread(target=serve_once, daemon=True)
    thread.start()
    return port, thread


def assert_dns_static_count_meta():
    assert app.dns_static_total_count_from_meta({"count": 7}, 12) == 7
    assert app.dns_static_total_count_from_meta({"total_count": 8}, 12) == 8
    assert app.dns_static_total_count_from_meta({"totalCount": 9}, 12) == 9
    assert app.dns_static_total_count_from_meta({}, 12) == 12


def assert_ssh_banner_diagnostic():
    port, thread = run_fake_banner_server(b"HTTP/1.1 400 Bad Request\r\n\r\n")
    message = app.describe_ssh_endpoint_probe("127.0.0.1", port, timeout=1.0)
    thread.join(timeout=2)
    assert "did not speak SSH" in message, message
    assert "HTTP" in message, message
    assert "127.0.0.1" in message, message


def assert_latency_tcp_fallback_probe():
    port, thread = run_fake_banner_server(b"HTTP/1.1 204 No Content\r\n\r\n")
    result = app.tcp_latency_target(f"http://127.0.0.1:{port}", timeout_ms=1000)
    thread.join(timeout=2)
    assert result["ok"] is True, result
    assert result["method"] == "tcp-connect-fallback", result
    assert result["latencyMs"] >= 1, result


def assert_panel_network_config_helpers():
    assert app.DEFAULT_ROUTER_HOST == "192.168.88.1"
    assert app.DEFAULT_PANEL_BIND == "127.0.0.1"
    assert app.DEFAULT_PANEL_PORT == 28646
    assert app.DEFAULT_PANEL_TARGET == "127.0.0.1"
    assert app.normalize_panel_host(app.DEFAULT_PANEL_TARGET, "access host") == app.DEFAULT_PANEL_TARGET
    assert app.resolve_panel_access_host("auto") == app.DEFAULT_PANEL_TARGET
    assert app.READONLY_NIKKI_CONTROLLER == ""
    assert app.nikki_probe()["disabled"] is True
    assert all(row["address"] != "192.168.3.2" for row in app.READONLY_DNS_SERVERS)
    assert app.normalize_panel_host("127.0.0.1", "bind") == "127.0.0.1"
    assert app.normalize_panel_host("[::1]", "bind") == "::1"
    assert app.normalize_panel_port("28646") == 28646
    assert app.panel_access_url("127.0.0.1", 28646, "127.0.0.1") == "http://127.0.0.1:28646/"
    assert app.panel_access_url("::", 28646, "::1") == "http://[::1]:28646/"
    assert app.validate_panel_public_contract("192.168.3.5", "192.168.3.5", "private_ops") == ("192.168.3.5", "192.168.3.5")
    try:
        app.validate_panel_public_contract("192.168.3.5", "192.168.3.5", "routeros_only")
    except ValueError:
        pass
    else:
        raise AssertionError("public RouterOS profile accepted LAN bind/target")
    assert app.panel_request_access_url({"Host": "127.0.0.1:28646"}, 28646) == "http://127.0.0.1:28646/"
    assert app.panel_request_access_url({"Host": "192.168.3.50:28646"}, 28646) is None
    assert app.panel_host_header_is_allowed({"Host": "127.0.0.1:28646"}) is True
    assert app.panel_host_header_is_allowed({"Host": "192.168.3.50:28646"}) is False
    original_public_profile = app.PUBLIC_ROUTEROS_PROFILE
    try:
        app.PUBLIC_ROUTEROS_PROFILE = False
        assert app.panel_client_address_is_allowed(("192.168.3.20", 52344), {"Host": "192.168.3.5:28646"})
        assert app.panel_host_header_is_allowed({"Host": "192.168.3.5:28646"})
    finally:
        app.PUBLIC_ROUTEROS_PROFILE = original_public_profile
    original_trust_proxy = app.PANEL_TRUST_PROXY_HEADERS
    try:
        app.PANEL_TRUST_PROXY_HEADERS = True
        assert app.panel_request_access_url(
            {"X-Forwarded-Host": "panel.lan", "X-Forwarded-Proto": "https", "X-Forwarded-Port": "443"},
            28646,
        ) is None
    finally:
        app.PANEL_TRUST_PROXY_HEADERS = original_trust_proxy
    assert app.panel_request_access_url({"Host": "http://bad.example"}, 28646) is None
    request_payload = app.panel_network_payload(request_url="http://127.0.0.1:28646/")
    assert request_payload["currentUrl"] == "http://127.0.0.1:28646/"
    assert request_payload["browserUrl"] == "http://127.0.0.1:28646/"
    assert request_payload["configuredUrl"] == app.panel_access_url(app.PANEL_BIND, app.PANEL_PORT, app.PANEL_TARGET)
    assert request_payload["detectedFromRequest"] is True
    for bad_port in ("0", "65536", "abc", ""):
        try:
            app.normalize_panel_port(bad_port)
        except ValueError:
            pass
        else:
            raise AssertionError(f"invalid port accepted: {bad_port!r}")
    for bad_host in ("http://127.0.0.1:28646", "bad host", "127.0.0.1/path", ""):
        try:
            app.normalize_panel_host(bad_host, "bind")
        except ValueError:
            pass
        else:
                raise AssertionError(f"invalid host accepted: {bad_host!r}")

    with tempfile.TemporaryDirectory() as temp_dir:
        env_path = pathlib.Path(temp_dir) / "routeros-panel.env"
        env_path.write_text(
            "# keep this comment\n"
            "ROS_PANEL_PORT=8080\n"
            "OTHER_SETTING=keep-me\n"
            "ROS_MONITOR_ROUTER_PASSWORD=must-not-change\n"
            "export ROS_PANEL_BIND=0.0.0.0\n",
            encoding="utf-8",
        )
        app.write_panel_local_settings_env("0.0.0.0", 28646, "127.0.0.1", env_path=env_path)
        content = env_path.read_text(encoding="utf-8")
        assert "# keep this comment" in content
        assert "OTHER_SETTING=keep-me" in content
        assert "ROS_MONITOR_ROUTER_PASSWORD=must-not-change" in content
        assert "ROS_PANEL_PORT=28646" in content
        assert "export ROS_PANEL_BIND=0.0.0.0" in content
        assert "ROS_PANEL_TARGET_IP=127.0.0.1" in content
        status = app.panel_local_settings_write_status(env_path)
        assert status["scope"] == "panel-local-listen-address-only"
        assert status["routerosConfigWrites"] is False
        assert status["setting"] == "ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED"
        original_write_mode = app.PANEL_LOCAL_SETTINGS_WRITE_ENABLED_RAW
        try:
            app.PANEL_LOCAL_SETTINGS_WRITE_ENABLED_RAW = "0"
            disabled_status = app.panel_local_settings_write_status(env_path)
            assert disabled_status["writable"] is False
            assert disabled_status["mode"] == "disabled"
            assert disabled_status["routerosConfigWrites"] is False
        finally:
            app.PANEL_LOCAL_SETTINGS_WRITE_ENABLED_RAW = original_write_mode


def assert_counter_rate_history_semantics():
    collector = app.Collector()
    collector.get_wan_latency = lambda force=False: {
        "ok": True,
        "target": "www.baidu.com",
        "latencyMs": 8,
        "updatedAt": "2026-05-25 11:00:00",
        "method": "fixture",
        "error": None,
    }

    first = collector.build_snapshot(make_rate_rest(1000, 2000), make_empty_ssh(), fresh_counter_sample=True)
    assert first["meta"]["freshCounterSample"] is True, first["meta"]
    assert first["overview"]["history"]["uplink"] == [], first["overview"]["history"]
    assert first["overview"]["history"]["downlink"] == [], first["overview"]["history"]
    assert first["wan"][0]["history"]["up"] == [], first["wan"][0]["history"]
    assert first["wan"][0]["history"]["down"] == [], first["wan"][0]["history"]
    assert first["overview"]["history"]["cpu"] == [12], first["overview"]["history"]
    assert first["overview"]["history"]["memory"] == [40.0], first["overview"]["history"]
    assert first["overview"]["history"]["disk"] == [20.0], first["overview"]["history"]

    collector.prev_ts = time.time() - 1
    second = collector.build_snapshot(
        make_rate_rest(1800, 3200, cpu_load=18, free_memory=550000, free_hdd=760000),
        make_empty_ssh(),
        fresh_counter_sample=True,
    )
    second_rate = second["wan"][0]["upRate"]
    assert second_rate > 0, second["wan"][0]
    second_overview_history = second["overview"]["history"]["uplink"][:]
    second_overview_down_history = second["overview"]["history"]["downlink"][:]
    second_line_history = second["wan"][0]["history"]["up"][:]
    second_line_down_history = second["wan"][0]["history"]["down"][:]
    assert len(second_overview_history) == 1, second["overview"]["history"]
    assert second_overview_history[-1] > 0, second["overview"]["history"]
    assert second_line_history[-1] == second_rate, second["wan"][0]["history"]
    assert second["overview"]["history"]["cpu"] == [12, 18], second["overview"]["history"]
    assert second["overview"]["history"]["memory"] == [40.0, 45.0], second["overview"]["history"]
    assert second["overview"]["history"]["disk"] == [20.0, 24.0], second["overview"]["history"]

    stale_refresh = collector.build_snapshot(
        make_rate_rest(1800, 3200, cpu_load=33, free_memory=500000, free_hdd=700000),
        make_empty_ssh(),
        fresh_counter_sample=False,
    )
    assert stale_refresh["wan"][0]["upRate"] == second_rate, stale_refresh["wan"][0]
    assert stale_refresh["overview"]["history"]["uplink"] == second_overview_history, stale_refresh["overview"]["history"]
    assert stale_refresh["overview"]["history"]["downlink"] == second_overview_down_history, stale_refresh["overview"]["history"]
    assert stale_refresh["wan"][0]["history"]["up"] == second_line_history, stale_refresh["wan"][0]["history"]
    assert stale_refresh["wan"][0]["history"]["down"] == second_line_down_history, stale_refresh["wan"][0]["history"]
    assert stale_refresh["meta"]["freshCounterSample"] is False, stale_refresh["meta"]
    assert stale_refresh["overview"]["history"]["cpu"] == [12, 18, 33], stale_refresh["overview"]["history"]
    assert stale_refresh["overview"]["history"]["memory"] == [40.0, 45.0, 50.0], stale_refresh["overview"]["history"]
    assert stale_refresh["overview"]["history"]["disk"] == [20.0, 24.0, 30.0], stale_refresh["overview"]["history"]

    empty_counter_rest = make_rate_rest(1800, 3200, cpu_load=44, free_memory=450000, free_hdd=660000)
    empty_counter_rest["interfaces"] = []
    empty_counter_rest["pppoe"] = []
    empty_counter = collector.build_snapshot(empty_counter_rest, make_empty_ssh(), fresh_counter_sample=True)
    assert empty_counter["meta"]["freshCounterSample"] is False, empty_counter["meta"]
    assert empty_counter["overview"]["history"]["uplink"] == second_overview_history, empty_counter["overview"]["history"]
    assert empty_counter["wan"] == [], empty_counter["wan"]
    assert empty_counter["overview"]["history"]["cpu"] == [12, 18, 33, 44], empty_counter["overview"]["history"]

    collector.prev_ts = time.time() - 1
    first_zero_candidate = collector.build_snapshot(
        make_rate_rest(1800, 3200, cpu_load=21, free_memory=580000, free_hdd=790000),
        make_empty_ssh(),
        fresh_counter_sample=True,
    )
    assert first_zero_candidate["meta"]["freshCounterSample"] is True, first_zero_candidate["meta"]
    assert int(first_zero_candidate["wan"][0]["upRate"]) == second_overview_history[-1], first_zero_candidate["wan"][0]
    assert int(first_zero_candidate["wan"][0]["downRate"]) == second_overview_down_history[-1], first_zero_candidate["wan"][0]
    assert first_zero_candidate["overview"]["history"]["uplink"][-1] == second_overview_history[-1], first_zero_candidate["overview"]["history"]
    assert first_zero_candidate["overview"]["history"]["downlink"][-1] == second_overview_down_history[-1], first_zero_candidate["overview"]["history"]
    assert first_zero_candidate["wan"][0]["history"]["up"][-1] == second_line_history[-1], first_zero_candidate["wan"][0]["history"]
    assert first_zero_candidate["wan"][0]["history"]["down"][-1] == second_line_down_history[-1], first_zero_candidate["wan"][0]["history"]
    assert len(first_zero_candidate["overview"]["history"]["uplink"]) == len(second_overview_history) + 1
    assert len(first_zero_candidate["wan"][0]["history"]["up"]) == len(second_line_history) + 1

    collector.prev_ts = time.time() - 1
    true_zero = collector.build_snapshot(
        make_rate_rest(1800, 3200, cpu_load=22, free_memory=570000, free_hdd=785000),
        make_empty_ssh(),
        fresh_counter_sample=True,
    )
    assert true_zero["meta"]["freshCounterSample"] is True, true_zero["meta"]
    assert true_zero["wan"][0]["upRate"] == 0, true_zero["wan"][0]
    assert true_zero["wan"][0]["downRate"] == 0, true_zero["wan"][0]
    assert true_zero["overview"]["history"]["uplink"][-1] == 0, true_zero["overview"]["history"]
    assert true_zero["overview"]["history"]["downlink"][-1] == 0, true_zero["overview"]["history"]
    assert true_zero["wan"][0]["history"]["up"][-1] == 0, true_zero["wan"][0]["history"]
    assert true_zero["wan"][0]["history"]["down"][-1] == 0, true_zero["wan"][0]["history"]
    true_zero_uplink_history = true_zero["overview"]["history"]["uplink"][:]
    true_zero_line_history = true_zero["wan"][0]["history"]["up"][:]

    collector.prev_ts = time.time() - 1
    rollback = collector.build_snapshot(
        make_rate_rest(900, 1700, cpu_load=25, free_memory=560000, free_hdd=780000),
        make_empty_ssh(),
        fresh_counter_sample=True,
    )
    assert rollback["meta"]["freshCounterSample"] is True, rollback["meta"]
    assert rollback["overview"]["history"]["uplink"][-1] is None, rollback["overview"]["history"]
    assert rollback["overview"]["history"]["downlink"][-1] is None, rollback["overview"]["history"]
    assert rollback["wan"][0]["history"]["up"][-1] is None, rollback["wan"][0]["history"]
    assert rollback["wan"][0]["history"]["down"][-1] is None, rollback["wan"][0]["history"]
    assert rollback["pppoe"][0]["upRate"] is None, rollback["pppoe"][0]
    assert rollback["pppoe"][0]["downRate"] is None, rollback["pppoe"][0]
    assert rollback["loadBalance"]["distribution"][0]["share"] == 0, rollback["loadBalance"]["distribution"]
    assert rollback["loadBalance"]["distribution"][0]["upRate"] is None, rollback["loadBalance"]["distribution"]
    assert rollback["loadBalance"]["distribution"][0]["downRate"] is None, rollback["loadBalance"]["distribution"]
    assert rollback["overview"]["history"]["uplink"][:-1] == true_zero_uplink_history, rollback["overview"]["history"]
    assert rollback["wan"][0]["history"]["up"][:-1] == true_zero_line_history, rollback["wan"][0]["history"]
    assert rollback["overview"]["history"]["cpu"][-1] == 25, rollback["overview"]["history"]


def assert_interface_quality_metrics_track_recent_samples():
    collector = app.Collector()
    collector.get_wan_latency = lambda force=False: {
        "ok": True,
        "target": "www.baidu.com",
        "latencyMs": 8,
        "updatedAt": "2026-05-25 11:00:00",
        "method": "fixture",
        "error": None,
    }

    first = collector.build_snapshot(
        make_rate_rest(
            1000,
            2000,
            rx_packets=100,
            tx_packets=100,
            rx_drop=5,
            tx_drop=0,
            rx_error=1,
            tx_error=0,
        ),
        make_empty_ssh(),
        fresh_counter_sample=True,
    )
    first_iface = first["interfaces"][0]
    assert first_iface["dropTotal"] == 5, first_iface
    assert first_iface["errorTotal"] == 1, first_iface
    assert first_iface["dropDelta"] == 0, first_iface
    assert first_iface["errorDelta"] == 0, first_iface
    assert first_iface["lossRate"] is None, first_iface
    assert first_iface["qualitySampleReady"] is False, first_iface

    second = collector.build_snapshot(
        make_rate_rest(
            1800,
            3200,
            rx_packets=200,
            tx_packets=300,
            rx_drop=6,
            tx_drop=2,
            rx_error=1,
            tx_error=1,
        ),
        make_empty_ssh(),
        fresh_counter_sample=True,
    )
    second_iface = second["interfaces"][0]
    assert second_iface["packetDelta"] == 300, second_iface
    assert second_iface["dropTotal"] == 8, second_iface
    assert second_iface["errorTotal"] == 2, second_iface
    assert second_iface["dropDelta"] == 3, second_iface
    assert second_iface["errorDelta"] == 1, second_iface
    assert abs(second_iface["lossRate"] - 0.01) < 0.000001, second_iface
    assert abs(second_iface["errorRate"] - (1 / 300)) < 0.000001, second_iface
    assert second_iface["qualitySampleReady"] is True, second_iface

    stale = collector.build_snapshot(
        make_rate_rest(
            1800,
            3200,
            rx_packets=200,
            tx_packets=300,
            rx_drop=6,
            tx_drop=2,
            rx_error=1,
            tx_error=1,
        ),
        make_empty_ssh(),
        fresh_counter_sample=False,
    )
    stale_iface = stale["interfaces"][0]
    assert stale["meta"]["freshCounterSample"] is False, stale["meta"]
    assert stale_iface["dropDelta"] == 3, stale_iface
    assert stale_iface["errorDelta"] == 1, stale_iface
    assert abs(stale_iface["lossRate"] - 0.01) < 0.000001, stale_iface
    assert abs(stale_iface["errorRate"] - (1 / 300)) < 0.000001, stale_iface

    vlan_rest = make_rate_rest(1000, 1000, name="vlan10", iface_type="vlan")
    vlan_snapshot = collector.build_snapshot(vlan_rest, make_empty_ssh(), fresh_counter_sample=True)
    vlan_iface = vlan_snapshot["interfaces"][0]
    assert vlan_iface["isDerivedInterface"] is True, vlan_iface
    assert vlan_iface["qualityEvidenceLevel"] == "logical", vlan_iface
    assert vlan_iface["qualityDisplayWeight"] < 1, vlan_iface
    assert vlan_iface["logicalPairKey"] == "logical-pair:10", vlan_iface
    assert vlan_iface["qualityGroupKey"] == "logical-pair:10", vlan_iface


def assert_arp_alerts_are_confidence_classified():
    collector = app.Collector()
    collector.get_wan_latency = lambda force=False: {
        "ok": True,
        "target": "www.baidu.com",
        "latencyMs": 8,
        "updatedAt": "2026-05-25 12:40:00",
        "method": "fixture",
        "error": None,
    }

    stale_rest = make_rate_rest(1000, 2000)
    stale_rest["interfaces"].append(
        {
            "name": "bridge-lan",
            "type": "bridge",
            "running": "true",
            "disabled": "false",
            "mac-address": "02:aa:00:00:00:01",
            "rx-byte": "100",
            "tx-byte": "200",
            "rx-packet": "10",
            "tx-packet": "20",
            "rx-drop": "0",
            "tx-drop": "0",
            "rx-error": "0",
            "tx-error": "0",
        }
    )
    stale_rest["ip_addresses"].append(
        {"interface": "bridge-lan", "actual-interface": "bridge-lan", "address": "10.30.0.1/24", "network": "10.30.0.0"}
    )
    stale_rest["arp"] = [
        {"address": "10.30.0.10", "mac-address": "02:aa:bb:cc:dd:ee", "status": "reachable", "dynamic": "true"},
        {"address": "10.30.0.11", "mac-address": "02:aa:bb:cc:dd:ee", "status": "failed", "dynamic": "true"},
    ]
    stale_snapshot = collector.build_snapshot(stale_rest, make_empty_ssh(), fresh_counter_sample=True)
    stale_alert = stale_snapshot["arp"]["alerts"][0]
    assert stale_alert["kind"] == "MAC drift", stale_alert
    assert stale_alert["severity"] == "info", stale_alert
    stale_finding = next(row for row in stale_snapshot["healthFindings"]["findings"] if row["id"] == "arp.identity_conflicts")
    assert stale_finding["severity"] != "critical", stale_finding

    active_rest = copy.deepcopy(stale_rest)
    active_rest["arp"] = [
        {"address": "10.30.0.20", "mac-address": "02:aa:bb:cc:00:01", "status": "reachable", "dynamic": "true"},
        {"address": "10.30.0.20", "mac-address": "02:aa:bb:cc:00:02", "status": "complete", "dynamic": "true"},
    ]
    active_snapshot = collector.build_snapshot(active_rest, make_empty_ssh(), fresh_counter_sample=True)
    active_alert = active_snapshot["arp"]["alerts"][0]
    assert active_alert["kind"] == "IP conflict", active_alert
    assert active_alert["severity"] == "critical", active_alert
    assert active_alert["activeConflict"] is True, active_alert
    active_finding = next(row for row in active_snapshot["healthFindings"]["findings"] if row["id"] == "arp.identity_conflicts")
    assert active_finding["severity"] == "critical", active_finding


def assert_arbitrary_scale_snapshot_contract():
    collector = app.Collector()
    collector.get_wan_latency = lambda force=False: {
        "ok": True,
        "target": "www.baidu.com",
        "latencyMs": 8,
        "updatedAt": "2026-05-25 12:45:00",
        "method": "fixture",
        "error": None,
    }
    ssh = make_empty_ssh()
    ssh["counts"] = {"all": 250, "tcp": 0, "udp": 0, "icmp": 0}
    ssh["active_connections"] = [make_active_connection(index) for index in range(120)]
    snapshot = collector.build_snapshot(make_arbitrary_scale_rest(125), ssh, fresh_counter_sample=True)
    scale = snapshot["meta"]["scale"]
    assert snapshot["meta"]["capabilities"]["wanFallback"] is True, snapshot["meta"]["capabilities"]
    assert scale["wan"]["actualCount"] == 1, scale["wan"]
    assert scale["pppoe"]["actualCount"] == 0, scale["pppoe"]
    assert scale["interfaces"]["actualCount"] == 125, scale["interfaces"]
    assert scale["interfaces"]["bucket"] == "fleet", scale["interfaces"]
    assert scale["connectionsActive"]["actualCount"] == 250, scale["connectionsActive"]
    assert scale["connectionsActive"]["shownCount"] == app.ACTIVE_CONNECTION_LIMIT, scale["connectionsActive"]
    assert scale["connectionsActive"]["hasMore"] is True, scale["connectionsActive"]
    assert scale["connectionsActive"]["sampled"] is True, scale["connectionsActive"]
    protocol_top = snapshot["connections"]["protocolTop"]
    assert protocol_top, snapshot["connections"]
    assert protocol_top[0]["protocol"] == "TCP", protocol_top[0]
    assert protocol_top[0]["connections"] == 120, protocol_top[0]
    assert protocol_top[0]["upRate"] > 0 and protocol_top[0]["downRate"] > 0, protocol_top[0]
    assert snapshot["connections"]["meta"]["protocolTop"]["shownCount"] == 1, snapshot["connections"]["meta"]["protocolTop"]
    assert all(not str(row.get("name", "")).startswith("pppoe-out") for row in snapshot["wan"]), snapshot["wan"]


def assert_deploy_defaults_are_project_safe():
    service_text = (ROOT / "ros-panel-ip.service").read_text(encoding="utf-8")
    template_text = (ROOT / "ros-panel-ip@.service").read_text(encoding="utf-8")
    deploy_text = (ROOT / "deploy_linux.sh").read_text(encoding="utf-8")
    install_text = (ROOT / "install.sh").read_text(encoding="utf-8")
    windows_spec = (ROOT / "routeros-triage-panel.spec").read_text(encoding="utf-8")
    assert "192.168.3.5" not in service_text
    assert "192.168.3.5" not in template_text
    assert 'PANEL_IP="$${ROS_PANEL_TARGET_IP:-}"' in service_text
    assert 'PANEL_IP="$${ROS_PANEL_TARGET_IP:-}"' in template_text
    assert 'DEFAULT_PANEL_BIND="127.0.0.1"' in deploy_text
    assert 'DEFAULT_PANEL_TARGET_IP="127.0.0.1"' in deploy_text
    assert 'DEFAULT_ROUTER_USER="admin"' not in deploy_text
    for stale_public_pattern in (
        "public/*.bak-*",
        "public/_preview*.html",
        "public/*.pre-*.js",
        "public/index.extracted.js",
    ):
        assert stale_public_pattern in deploy_text
        assert stale_public_pattern in install_text
    assert "def public_datas()" in windows_spec
    assert "index.extracted.js" in windows_spec
    assert '".bak-"' in windows_spec
    assert '".pre-"' in windows_spec


def assert_frontend_charts_skip_missing_values():
    index_source = (ROOT / "public" / "index.html").read_text(encoding="utf-8")
    framework_shell = (
        'data-app-shell="ikuai"' in index_source
        and 'data-overview-framework-asset="script"' in index_source
    )
    if framework_shell:
        overview_components_dir = ROOT / "src" / "panel-framework" / "overview" / "components"
        overview_source = "\n".join(
            [
                (ROOT / "src" / "panel-framework" / "overview" / "OverviewPanel.tsx").read_text(encoding="utf-8"),
                (ROOT / "src" / "panel-framework" / "overview" / "desktopOverviewVisuals.tsx").read_text(encoding="utf-8"),
                *[
                    component_path.read_text(encoding="utf-8")
                    for component_path in sorted(overview_components_dir.glob("*.tsx"))
                ],
            ]
        )
        overview_css_parts = [
            (ROOT / "src" / "panel-framework" / "overview" / "OverviewPanel.css").read_text(encoding="utf-8")
        ]
        overview_styles_dir = ROOT / "src" / "panel-framework" / "overview" / "styles"
        if overview_styles_dir.exists():
            overview_css_parts.extend(
                css_path.read_text(encoding="utf-8")
                for css_path in sorted(overview_styles_dir.glob("*.css"))
            )
        overview_css = "\n".join(overview_css_parts)
        derive_source = (ROOT / "src" / "panel-framework" / "overview" / "deriveOverviewState.ts").read_text(encoding="utf-8")
        for marker in (
            'data-overview-chart-has-current="true"',
            'data-overview-chart-has-peak="true"',
            'data-overview-chart-has-mean="true"',
            'data-overview-chart-has-threshold="true"',
            'data-overview-y-axis="overview-y-axis"',
            "data-overview-rank-grid",
        ):
            assert marker in overview_source, f"{marker} not found in framework overview"
        assert ".ro-chart-axis" in overview_css
        assert "Number(value || 0)" not in overview_source
        assert "Number(item || 0)" not in overview_source
        assert "export function toNumber" in derive_source
        assert "return Number.isFinite(n) ? n : fallback;" in derive_source
        return
    for function_name in ("lineChart", "rateAxisLineChart", "resourcePercentChart"):
        marker = f"function {function_name}"
        start = index_source.find(marker)
        assert start >= 0, f"{function_name} not found"
        body = index_source[start : index_source.find("\n    function ", start + len(marker))]
        if not body:
            body = index_source[start : start + 2400]
        assert "Number(value || 0)" not in body, f"{function_name} still coerces missing values to 0"
        assert "Number(item || 0)" not in body, f"{function_name} still coerces missing values to 0"
    assert "function chartValue" in index_source
    assert "function smoothRateNeedleZeros" in index_source
    assert "smoothRateNeedleZeros(rawValues, options)" in index_source
    assert "smoothRateNeedleZeros(rawValues, { ...options" in index_source
    assert "function chartSegmentElements" in index_source
    assert "function smoothSvgPath" in index_source
    assert "<path fill=\"none\"" in index_source
    assert "panel-professional-redesign" not in index_source
    assert "scale-adaptive-patch" not in index_source
    assert "Number(value || 0)" not in index_source[index_source.find("function smoothNumericSeries") : index_source.find("function chartSegmentElements")]
    assert "if (value === null || value === undefined || value === '') return null;" in index_source
    assert "return Number.isFinite(numeric) ? numeric : null;" in index_source
    layout_patch_path = ROOT / "public" / "layout-whitespace-patch.js"
    if layout_patch_path.exists():
        layout_patch_source = layout_patch_path.read_text(encoding="utf-8")
        ops_chart_start = layout_patch_source.find("function opsPercentMiniChart")
        ops_chart_body = layout_patch_source[ops_chart_start : ops_chart_start + 2200]
        assert "function opsChartNumber" in layout_patch_source
        assert "function opsSmoothPercentValues" in layout_patch_source
        assert "function opsSmoothPath" in layout_patch_source
        assert "Number(value || 0)" not in ops_chart_body
    else:
        assert "layout-whitespace-patch" not in index_source


def assert_frontend_wan_aggregate_default():
    index_source = (ROOT / "public" / "index.html").read_text(encoding="utf-8")
    framework_shell = (
        'data-app-shell="ikuai"' in index_source
        and 'data-overview-framework-asset="script"' in index_source
    )
    if framework_shell:
        rows_source = (ROOT / "src" / "panel-framework" / "overview" / "desktopOverviewTrafficRows.ts").read_text(encoding="utf-8")
        visuals_source = (ROOT / "src" / "panel-framework" / "overview" / "desktopOverviewVisuals.tsx").read_text(encoding="utf-8")
        desktop_scene_source = (ROOT / "src" / "panel-framework" / "overview" / "desktopOverviewDefaultScene.tsx").read_text(encoding="utf-8")
        assert "export function trafficTotals" in rows_source
        assert "const rows = collectWanRows(snapshot);" in rows_source
        assert "up: rows.reduce((total, row) => total + toNumber(row.upRate), 0)" in rows_source
        assert "down: rows.reduce((total, row) => total + toNumber(row.downRate), 0)" in rows_source
        assert 'trendDatum("traffic-down", "总下行", totals.down' in rows_source
        assert 'trendDatum("traffic-up", "总上行", totals.up' in rows_source
        assert "const trafficChartRowsData = trafficChartRows(snapshot, state);" in desktop_scene_source
        assert "<DesktopWanIntegratedVisual snapshot={snapshot} state={state} rows={trafficChartRowsData} />" in desktop_scene_source
        assert '<WanTrend key="compact-network"' in desktop_scene_source
        assert 'className="ro-wan-integrated-decision"' in visuals_source
        assert "desktopWanDecisionRail(snapshot, state, rows)" in visuals_source
        assert "scale-adaptive-patch" not in index_source
        assert "panel-professional-redesign" not in index_source
        assert "layout-whitespace-patch" not in index_source
        return

    patch_path = ROOT / "public" / "scale-adaptive-patch.js"
    assert patch_path.exists(), "legacy WAN aggregate patch is missing outside framework shell"
    source = patch_path.read_text(encoding="utf-8")
    assert "const AGGREGATE_WAN_KEY = '__all_wan__';" in source
    assert "function wanAggregateLine(lines, overview = {})" in source
    assert "isAggregateWan: true" in source
    assert "const aggregateWan = wanAggregateLine(lines, overview);" in source
    assert "const selectedWan = selectedWanLine(lines, aggregateWan);" in source
    assert "renderWanLineOptions(lines, selectedWan, aggregateWan)" in source
    assert '<option value="${AGGREGATE_WAN_KEY}"' in source
    assert '<div class="ikuai-wan-chart">${wanChart}</div>' in source
    assert 'data-monitor-split-charts="true"' in source
    assert 'data-monitor-chart="up"' in source
    assert 'data-monitor-chart="down"' in source
    assert '<div class="ikuai-chart-box">${monitorUpChart}</div>' in source
    assert '<div class="ikuai-chart-box">${monitorDownChart}</div>' in source
    assert "rate(selectedWan?.upRate)" in source
    assert "rate(selectedWan?.downRate)" in source
    assert "const selectedWan = selectedWanLine(lines);" not in source


def assert_router_login_password_save_is_opt_in():
    index_source = (ROOT / "public" / "index.html").read_text(encoding="utf-8")
    app_source = (ROOT / "app.py").read_text(encoding="utf-8")
    checkbox_marker = '<input id="routerLoginRememberPassword" name="rememberPassword" type="checkbox">'
    if checkbox_marker in index_source:
        assert '<input id="routerLoginRememberPassword" name="rememberPassword" type="checkbox" checked>' not in index_source
        assert "routerLoginRememberPasswordEl ? routerLoginRememberPasswordEl.checked : false" in index_source
    assert 'payload.get("rememberPassword", False)' in app_source
    assert "remember_password = remember_raw is True" in app_source
    assert "True if remember_raw is None else to_bool(remember_raw)" not in app_source
    assert 'payload.get("rememberPassword", True)' not in app_source
    assert "restore_last_saved_router_login" not in app_source
    assert 'password = saved_entry.get("password")' not in app_source
    assert '"password": password,' not in app_source
    assert "passwords are never persisted" in app_source

    try:
        app.ROUTER_LOGIN_STORE_FILE.unlink()
    except FileNotFoundError:
        pass

    sample_password = "12" + "3456"
    legacy_payload = {
        "version": 1,
        "entries": [{"host": "127.0.0.1", "user": "smoke", "password": sample_password, "sshPort": 22}],
    }
    app.ROUTER_LOGIN_STORE_FILE.parent.mkdir(parents=True, exist_ok=True)
    app.ROUTER_LOGIN_STORE_FILE.write_text(json.dumps(legacy_payload), encoding="utf-8")
    app.sanitize_router_login_store_passwords()
    migrated = json.loads(app.ROUTER_LOGIN_STORE_FILE.read_text(encoding="utf-8"))
    assert migrated["version"] == 2
    assert migrated["entries"] and migrated["entries"][0].get("password") == ""

    saved = app.remember_router_login("127.0.0.1", "smoke", sample_password, 22)
    payload = json.loads(app.ROUTER_LOGIN_STORE_FILE.read_text(encoding="utf-8"))
    assert payload["version"] == 2
    assert "clear text" not in payload.get("warning", "")
    assert payload["entries"] and payload["entries"][0].get("password") == ""
    public_entries = app.public_saved_router_logins()
    assert public_entries and public_entries[0]["passwordSaved"] is False
    assert app.find_saved_router_login(saved["id"])["password"] == ""
    app.ROUTER_LOGIN_STORE_FILE.unlink(missing_ok=True)


def assert_frontend_handles_partial_snapshots():
    index_source = (ROOT / "public" / "index.html").read_text(encoding="utf-8")
    framework_shell = (
        'data-app-shell="ikuai"' in index_source
        and 'data-overview-framework-asset="script"' in index_source
    )
    if framework_shell:
        derive_source = (ROOT / "src" / "panel-framework" / "overview" / "deriveOverviewState.ts").read_text(encoding="utf-8")
        assert "const meta = snapshot.meta || {};" in derive_source
        assert "const device = snapshot.overview || {};" in derive_source
        assert "snapshot.routes?.defaultRoutes || snapshot.routes?.items || []" in derive_source
        assert "Array.isArray(snapshot.wan) && snapshot.wan.length" in derive_source
        assert "Array.isArray(snapshot.interfaces) ? snapshot.interfaces : []" in derive_source
        return
    assert "const o = snapshot.overview || {};" in index_source
    assert "const history = o.history || {};" in index_source
    assert "const meta = snapshot.meta || {};" in index_source
    assert "history.uplink || []" in index_source
    assert "history.downlink || []" in index_source


def assert_collector_status_messages_are_specific():
    starting = app.normalize_collector_snapshot_status({"status": "starting", "updatedAt": None, "error": None, "meta": {}})
    assert "正在启动" in starting["statusMessage"], starting
    assert "未知错误" not in starting["statusMessage"], starting
    assert starting["meta"]["collectorStatusMessage"] == starting["statusMessage"], starting

    needs_config = app.normalize_collector_snapshot_status({"status": "needs_config", "error": None, "meta": {}})
    assert "RouterOS SSH 连接未配置" in needs_config["statusMessage"], needs_config
    assert "未知错误" not in needs_config["statusMessage"], needs_config

    real_error = app.normalize_collector_snapshot_status({"status": "error", "error": "REST timeout from RouterOS", "meta": {}})
    assert real_error["statusMessage"] == "REST timeout from RouterOS", real_error

    ok = app.normalize_collector_snapshot_status({"status": "ok", "error": None, "meta": {}})
    assert ok["statusMessage"] == "采集正常。", ok

    findings = app.build_health_findings(starting)
    issue = next(row for row in findings["findings"] if row["id"] == "collector.snapshot_status")
    assert "正在启动" in issue["summary"], issue
    assert "未知错误" not in issue["summary"], issue

    index_source = (ROOT / "public" / "index.html").read_text(encoding="utf-8")
    render_start = index_source.find("function renderApp")
    render_body = index_source[render_start : render_start + 1200]
    if "function collectorStatusMessage" in index_source:
        assert "collectorStatusMessage(snapshot)" in render_body
        assert "snapshot.error || '未知错误'" not in render_body


def assert_health_findings_distinguishes_quality_display_values():
    findings = app.build_health_findings(
        {
            "status": "ok",
            "updatedAt": "2026-05-25 12:15:00",
            "interfaces": [
                {
                    "name": "vlan40",
                    "dropTotal": 395361,
                    "errorTotal": 2,
                    "dropDelta": 4,
                    "errorDelta": 1,
                    "packetDelta": 6801,
                    "lossRate": 0.000588,
                    "errorRate": 1 / 6801,
                    "isDerivedInterface": True,
                    "qualityEvidenceLevel": "logical",
                }
            ],
        }
    )
    issue = next(row for row in findings["findings"] if row["id"] == "interfaces.error_counters")
    assert "%%" not in issue["summary"], issue["summary"]
    assert "cumulative drop/error=395361/2" in issue["summary"], issue["summary"]
    assert "latest +4/+1" in issue["summary"], issue["summary"]
    assert "recent loss rate=0.0588%." in issue["summary"], issue["summary"]
    cumulative = next(row for row in issue["evidence"] if row["label"] == "cumulativeDropError")
    assert cumulative["value"] == "395361/2", cumulative
    latest = next(row for row in issue["evidence"] if row["label"] == "latestDropErrorDelta")
    assert latest["value"] == "+4/+1", latest
    recent_loss = next(row for row in issue["evidence"] if row["label"] == "recentLossRate")
    assert recent_loss["value"] == "0.0588%", recent_loss

    unknown_findings = app.build_health_findings(
        {
            "status": "ok",
            "updatedAt": "2026-05-25 12:16:00",
            "interfaces": [
                {
                    "name": "ether1",
                    "dropTotal": 8,
                    "errorTotal": 2,
                    "dropDelta": 0,
                    "errorDelta": 0,
                    "packetDelta": 0,
                    "lossRate": None,
                    "errorRate": None,
                    "isDerivedInterface": False,
                    "qualityEvidenceLevel": "primary",
                }
            ],
        }
    )
    unknown_issue = next(row for row in unknown_findings["findings"] if row["id"] == "interfaces.error_counters")
    assert "cumulative drop/error=8/2" in unknown_issue["summary"], unknown_issue["summary"]
    assert "latest +0/+0" in unknown_issue["summary"], unknown_issue["summary"]
    assert "recent loss rate=unknown." in unknown_issue["summary"], unknown_issue["summary"]
    unknown_loss = next(row for row in unknown_issue["evidence"] if row["label"] == "recentLossRate")
    assert unknown_loss["value"] == "unknown", unknown_loss


def assert_localhost_host_forward_guard_supports_routeros_container():
    loopback_headers = {"Host": "127.0.0.1:28646"}
    token_headers = {"Host": "127.0.0.1:28646", app.PANEL_LOCALHOST_FORWARD_HEADER: "fixture-forward-token"}
    direct_ip_headers = {"Host": "172.18.0.2:28646"}
    remote_peer = ("192.0.2.10", 52344)
    assert app.panel_host_header_is_allowed(loopback_headers)
    assert not app.panel_host_header_is_allowed(direct_ip_headers)
    assert app.panel_client_address_is_allowed(("127.0.0.1", 52344), direct_ip_headers)
    assert not app.panel_client_address_is_allowed(remote_peer, loopback_headers)
    original = app.PANEL_ALLOW_LOCALHOST_HOST_FORWARD
    original_token = app.PANEL_LOCALHOST_FORWARD_TOKEN
    try:
        app.PANEL_ALLOW_LOCALHOST_HOST_FORWARD = True
        app.PANEL_LOCALHOST_FORWARD_TOKEN = "fixture-forward-token"
        assert not app.panel_client_address_is_allowed(remote_peer, loopback_headers)
        assert app.panel_client_address_is_allowed(remote_peer, token_headers)
        assert not app.panel_client_address_is_allowed(remote_peer, direct_ip_headers)
    finally:
        app.PANEL_ALLOW_LOCALHOST_HOST_FORWARD = original
        app.PANEL_LOCALHOST_FORWARD_TOKEN = original_token


def main():
    assert_wan_model_combines_pppoe_and_dhcp_lines()
    assert_dns_static_count_meta()
    assert_ssh_banner_diagnostic()
    assert_latency_tcp_fallback_probe()
    assert_panel_network_config_helpers()
    assert_counter_rate_history_semantics()
    assert_interface_quality_metrics_track_recent_samples()
    assert_arp_alerts_are_confidence_classified()
    assert_arbitrary_scale_snapshot_contract()
    assert_deploy_defaults_are_project_safe()
    assert_frontend_charts_skip_missing_values()
    assert_frontend_wan_aggregate_default()
    assert_router_login_password_save_is_opt_in()
    assert_frontend_handles_partial_snapshots()
    assert_collector_status_messages_are_specific()
    assert_health_findings_distinguishes_quality_display_values()
    assert_localhost_host_forward_guard_supports_routeros_container()
    print(
        json.dumps(
            {
                "status": "pass",
                "checks": [
                    "dns_static_total_count_from_meta supports count/total_count/totalCount",
                    "WAN model combines PPPoE and DHCP lines into snapshot.wan with access types",
                    "ssh banner diagnostic classifies HTTP endpoint as non-SSH",
                    "latency probing has a TCP fallback for Docker/minimal runtimes without ping",
                    "panel network defaults, validation, URL formatting, and env updates are safe",
                    "counter rate history skips first baselines, preserves stale rates, marks counter rollback as chart breaks, and keeps resource history independent",
                    "interface quality metrics expose cumulative totals, fresh deltas, loss/error rates, stale reuse, and VLAN down-ranking",
                    "ARP alerts classify active conflicts separately from stale identity movement",
                    "arbitrary-scale non-PPPoE fixtures preserve scale metadata, protocol ranking, and WAN fallback semantics",
                    "deploy defaults avoid private IP/admin assumptions unless explicitly configured",
                    "frontend chart helpers skip missing values instead of drawing zeros",
                    "frontend WAN selector defaults to an all-line aggregate traffic option",
                    "RouterOS login password saving is opt-in for public deployments",
                    "frontend renderers tolerate partial snapshots and missing history collections",
                    "collector startup/config/error states expose specific status messages instead of unknown-error banners",
                    "health findings distinguish cumulative totals, latest deltas, numeric loss rates, and unknown loss-rate displays",
                    "RouterOS Container localhost Host-forward guard allows client-local tunnels without allowing direct veth/LAN browser hosts",
                ],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
