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
        "cpu-load": "12",
        "total-memory": "1000000",
        "free-memory": "600000",
        "total-hdd-space": "1000000",
        "free-hdd-space": "800000",
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
    assert app.DEFAULT_PANEL_BIND == "0.0.0.0"
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
            "export ROS_PANEL_BIND=0.0.0.0\n",
            encoding="utf-8",
        )
        app.write_panel_network_env("0.0.0.0", 28646, "192.168.50.10", env_path=env_path)
        content = env_path.read_text(encoding="utf-8")
        assert "# keep this comment" in content
        assert "OTHER_SETTING=keep-me" in content
        assert "ROS_PANEL_PORT=28646" in content
        assert "export ROS_PANEL_BIND=0.0.0.0" in content
        assert "ROS_PANEL_TARGET_IP=192.168.50.10" in content


def assert_rate_history_only_advances_on_fresh_counter_samples():
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
    assert first["overview"]["history"]["uplink"] == [0], first["overview"]["history"]
    assert first["wan"][0]["history"]["up"] == [0], first["wan"][0]["history"]

    collector.prev_ts = time.time() - 1
    second = collector.build_snapshot(make_rate_rest(1800, 3200), make_empty_ssh(), fresh_counter_sample=True)
    second_rate = second["wan"][0]["upRate"]
    assert second_rate > 0, second["wan"][0]
    second_overview_history = second["overview"]["history"]["uplink"][:]
    second_line_history = second["wan"][0]["history"]["up"][:]

    stale_refresh = collector.build_snapshot(make_rate_rest(1800, 3200), make_empty_ssh(), fresh_counter_sample=False)
    assert stale_refresh["wan"][0]["upRate"] == second_rate, stale_refresh["wan"][0]
    assert stale_refresh["overview"]["history"]["uplink"] == second_overview_history, stale_refresh["overview"]["history"]
    assert stale_refresh["wan"][0]["history"]["up"] == second_line_history, stale_refresh["wan"][0]["history"]
    assert stale_refresh["meta"]["freshCounterSample"] is False, stale_refresh["meta"]

    empty_counter_rest = make_rate_rest(1800, 3200)
    empty_counter_rest["interfaces"] = []
    empty_counter_rest["pppoe"] = []
    empty_counter = collector.build_snapshot(empty_counter_rest, make_empty_ssh(), fresh_counter_sample=True)
    assert empty_counter["meta"]["freshCounterSample"] is False, empty_counter["meta"]
    assert empty_counter["overview"]["history"]["uplink"] == second_overview_history, empty_counter["overview"]["history"]

    collector.prev_ts = time.time() - 1
    true_zero = collector.build_snapshot(make_rate_rest(1800, 3200), make_empty_ssh(), fresh_counter_sample=True)
    assert true_zero["meta"]["freshCounterSample"] is True, true_zero["meta"]
    assert true_zero["wan"][0]["upRate"] == 0, true_zero["wan"][0]
    assert true_zero["wan"][0]["downRate"] == 0, true_zero["wan"][0]
    assert true_zero["overview"]["history"]["uplink"][-1] == 0, true_zero["overview"]["history"]
    assert true_zero["overview"]["history"]["downlink"][-1] == 0, true_zero["overview"]["history"]
    assert true_zero["wan"][0]["history"]["up"][-1] == 0, true_zero["wan"][0]["history"]
    assert true_zero["wan"][0]["history"]["down"][-1] == 0, true_zero["wan"][0]["history"]
    assert len(true_zero["overview"]["history"]["uplink"]) == len(second_overview_history) + 1
    assert len(true_zero["wan"][0]["history"]["up"]) == len(second_line_history) + 1


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
    stale_queue_item = next(row for row in stale_snapshot["semanticTriage"]["queue"] if row["id"] == "arp.identity_conflicts")
    assert stale_queue_item["severity"] != "critical", stale_queue_item

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
    active_queue_item = next(row for row in active_snapshot["semanticTriage"]["queue"] if row["id"] == "arp.identity_conflicts")
    assert active_queue_item["severity"] == "critical", active_queue_item


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
    assert all(not str(row.get("name", "")).startswith("pppoe-out") for row in snapshot["wan"]), snapshot["wan"]


def assert_deploy_defaults_are_project_safe():
    service_text = (ROOT / "ros-panel-ip.service").read_text(encoding="utf-8")
    template_text = (ROOT / "ros-panel-ip@.service").read_text(encoding="utf-8")
    deploy_text = (ROOT / "deploy_linux.sh").read_text(encoding="utf-8")
    assert "192.168.3.5" not in service_text
    assert "192.168.3.5" not in template_text
    assert 'PANEL_IP="$${ROS_PANEL_TARGET_IP:-}"' in service_text
    assert 'PANEL_IP="$${ROS_PANEL_TARGET_IP:-}"' in template_text
    assert 'DEFAULT_PANEL_BIND="0.0.0.0"' in deploy_text
    assert 'DEFAULT_PANEL_TARGET_IP="127.0.0.1"' in deploy_text
    assert 'DEFAULT_ROUTER_USER="admin"' not in deploy_text


def assert_frontend_charts_skip_missing_values():
    index_source = (ROOT / "public" / "index.html").read_text(encoding="utf-8")
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
    assert "function chartSegmentElements" in index_source
    assert "if (value === null || value === undefined || value === '') return null;" in index_source
    assert "return Number.isFinite(numeric) ? numeric : null;" in index_source


def assert_frontend_wan_aggregate_default():
    source = (ROOT / "public" / "scale-adaptive-patch.js").read_text(encoding="utf-8")
    assert "const AGGREGATE_WAN_KEY = '__all_wan__';" in source
    assert "function wanAggregateLine(lines, overview = {})" in source
    assert "isAggregateWan: true" in source
    assert "const aggregateWan = wanAggregateLine(lines, overview);" in source
    assert "const selectedWan = selectedWanLine(lines, aggregateWan);" in source
    assert "renderWanLineOptions(lines, selectedWan, aggregateWan)" in source
    assert '<option value="${AGGREGATE_WAN_KEY}"' in source
    assert '<div class="ikuai-chart-box">${wanChart}</div>' in source
    assert "rate(selectedWan?.upRate)" in source
    assert "rate(selectedWan?.downRate)" in source
    assert "const selectedWan = selectedWanLine(lines);" not in source


def assert_semantic_triage_formats_loss_rate_once():
    triage = app.build_semantic_triage(
        {
            "status": "ok",
            "updatedAt": "2026-05-25 12:15:00",
            "interfaces": [
                {
                    "name": "vlan40",
                    "dropTotal": 395361,
                    "errorTotal": 0,
                    "dropDelta": 4,
                    "errorDelta": 0,
                    "packetDelta": 6801,
                    "lossRate": 0.000588,
                    "isDerivedInterface": True,
                    "qualityEvidenceLevel": "logical",
                }
            ],
        }
    )
    issue = next(row for row in triage["queue"] if row["id"] == "interfaces.error_counters")
    assert "%%" not in issue["summary"], issue["summary"]
    assert "recent loss rate=0.0588%." in issue["summary"], issue["summary"]
    recent_loss = next(row for row in issue["evidence"] if row["label"] == "recentLossRate")
    assert recent_loss["value"] == "0.0588%", recent_loss


def main():
    assert_dns_static_count_meta()
    assert_ssh_banner_diagnostic()
    assert_latency_tcp_fallback_probe()
    assert_panel_network_config_helpers()
    assert_rate_history_only_advances_on_fresh_counter_samples()
    assert_interface_quality_metrics_track_recent_samples()
    assert_arp_alerts_are_confidence_classified()
    assert_arbitrary_scale_snapshot_contract()
    assert_deploy_defaults_are_project_safe()
    assert_frontend_charts_skip_missing_values()
    assert_frontend_wan_aggregate_default()
    assert_semantic_triage_formats_loss_rate_once()
    print(
        json.dumps(
            {
                "status": "pass",
                "checks": [
                    "dns_static_total_count_from_meta supports count/total_count/totalCount",
                    "ssh banner diagnostic classifies HTTP endpoint as non-SSH",
                    "latency probing has a TCP fallback for Docker/minimal runtimes without ping",
                    "panel network defaults, validation, URL formatting, and env updates are safe",
                    "rate history advances only on fresh interface counter samples and preserves true fresh zero samples",
                    "interface quality metrics expose cumulative totals, fresh deltas, stale reuse, and VLAN down-ranking",
                    "ARP alerts classify active conflicts separately from stale identity movement",
                    "arbitrary-scale non-PPPoE fixtures preserve scale metadata and WAN fallback semantics",
                    "deploy defaults avoid private IP/admin assumptions unless explicitly configured",
                    "frontend chart helpers skip missing values instead of drawing zeros",
                    "frontend WAN selector defaults to an all-line aggregate traffic option",
                    "semantic triage formats recent loss-rate percentages once",
                ],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
