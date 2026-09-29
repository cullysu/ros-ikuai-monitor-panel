"""Collector: RouterOS 采样/快照构建核心（后端拆分批次 7 自 app.py 逐字迁入）。

类体与方法体零改动；模块级常量/辅助函数为 Collector 专属（AST 自由变量审计），
与 Handler/main 共享的常量在 ros_panel/config.py。
"""

import copy
import datetime
import ipaddress
import json
import os
import re
import socket
import subprocess
import threading
import time
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor, wait
from pathlib import Path
from urllib.parse import urlparse

import paramiko
import requests

from ros_panel.endpoints import (
    DETAIL_REST_ENDPOINTS,
    EMPTY_REST_BUNDLE,
    REALTIME_REST_ENDPOINTS,
    SLOW_REST_ENDPOINTS,
    STATIC_REST_ENDPOINTS,
    TERSE_FIELD_PATTERN,
    TRACKING_FIELD_PATTERN,
)
from ros_panel.model import (
    ACTION_SEVERITY_RANK,
    arp_evidence_state,
    format_iso_now,
    interface_is_derived,
    interface_logical_pair_key,
    interface_parent_hint,
    interface_quality_group_key,
    ip_sort_key,
    line_layout_tier,
    list_scale_meta,
    make_arp_alert,
    normalize_collector_snapshot_status,
    parse_ping_latency_ms,
    rate_level,
)
from ros_panel.triage import build_semantic_triage
from ros_panel.diagnostics import (
    READONLY_DIAGNOSTIC_CACHE_TTL,
    READONLY_DIAGNOSTIC_TOTAL_TIMEOUT,
    READONLY_DIAGNOSTIC_WORKERS,
    READONLY_DNS_DOMAINS,
    READONLY_DNS_SERVERS,
    READONLY_EXIT_TARGETS,
    READONLY_HTTP_TARGETS,
    build_distribution_from_lines,
    count_pool_addresses,
    dns_query,
    exit_probe,
    file_mtime_summary,
    http_probe,
    infer_wan_interface_names,
    nikki_probe,
    normalize_custom_name,
    normalize_ip_key,
    system_dns_query,
    tcp_probe,
)
from ros_panel.router_config import (
    REST_TIMEOUT,
    SSH_TIMEOUT,
    _ROUTER_REST_PORT_SUFFIX,
    format_ssh_connect_error,
    get_ready_router_config,
    get_router_config,
    public_router_config,
    router_config_is_ready,
)
from ros_panel.util import (
    compact_exception_text,
    counter_delta,
    format_routeros_clock,
    format_routeros_uptime,
    split_connection_endpoint,
    to_bool,
    to_int,
)
# 导入顺序敏感：router_config/diagnostics 等的 import 期 env 读取必须发生在
# config 的 env 文件加载之前（与原 app.py 行为一致）。
from ros_panel.config import (
    BASE_DIR,
    DNS_STATIC_MAX_PAGE_LIMIT,
    DNS_STATIC_PAGE_LIMIT,
    EXPOSE_ADMIN_SESSIONS,
    IP_ALIAS_WRITE_ENABLED,
    PANEL_PROFILE,
    PANEL_TARGET,
    PUBLIC_DIR,
    PUBLIC_ROUTEROS_PROFILE,
    READONLY_DIAGNOSTICS_ENABLED,
)


POLL_SECONDS = max(1, int(os.getenv("ROS_MONITOR_POLL_SECONDS", "1")))
HISTORY_LIMIT = int(os.getenv("ROS_MONITOR_HISTORY_LIMIT", "60"))
RATE_ZERO_CONFIRM_SAMPLES = max(1, int(os.getenv("ROS_MONITOR_RATE_ZERO_CONFIRM_SAMPLES", "2")))
ACTIVE_CONNECTION_LIMIT = int(os.getenv("ROS_MONITOR_ACTIVE_CONNECTION_LIMIT", "80"))
STATIC_POLL_SECONDS = max(300, int(os.getenv("ROS_MONITOR_STATIC_POLL_SECONDS", "300")))
STATIC_REST_WORKERS = max(1, min(3, int(os.getenv("ROS_MONITOR_STATIC_REST_WORKERS", "1"))))
SLOW_REST_POLL_SECONDS = max(60, int(os.getenv("ROS_MONITOR_SLOW_REST_POLL_SECONDS", "60")))
SLOW_REST_WORKERS = max(1, min(3, int(os.getenv("ROS_MONITOR_SLOW_REST_WORKERS", "2"))))
CONNECTION_DETAIL_POLL_SECONDS = max(4, int(os.getenv("ROS_MONITOR_CONNECTION_DETAIL_POLL_SECONDS", "4")))
DETAIL_REST_WORKERS = max(1, min(2, int(os.getenv("ROS_MONITOR_DETAIL_REST_WORKERS", "1"))))
CONNECTION_PROTOCOL_POLL_SECONDS = max(30, int(os.getenv("ROS_MONITOR_CONNECTION_PROTOCOL_POLL_SECONDS", "30")))
CONNECTION_DETAIL_CAPTURE_SECONDS = max(4, int(os.getenv("ROS_MONITOR_CONNECTION_DETAIL_CAPTURE_SECONDS", "4")))
CONNECTION_DETAIL_SAMPLE_LIMIT = max(
    ACTIVE_CONNECTION_LIMIT,
    int(os.getenv("ROS_MONITOR_CONNECTION_DETAIL_SAMPLE_LIMIT", str(max(ACTIVE_CONNECTION_LIMIT * 4, 160)))),
)
CONNECTION_DETAIL_STREAM_MAX_BYTES = max(
    65536,
    int(os.getenv("ROS_MONITOR_CONNECTION_DETAIL_STREAM_MAX_BYTES", "131072")),
)
CONNECTION_DETAIL_OVERRUN_BACKOFF_SECONDS = max(
    CONNECTION_DETAIL_POLL_SECONDS,
    int(os.getenv("ROS_MONITOR_CONNECTION_DETAIL_OVERRUN_BACKOFF_SECONDS", "6")),
)
CONNECTION_DETAIL_OVERRUN_BACKOFF_CAP_SECONDS = max(
    CONNECTION_DETAIL_OVERRUN_BACKOFF_SECONDS,
    int(os.getenv("ROS_MONITOR_CONNECTION_DETAIL_OVERRUN_BACKOFF_CAP_SECONDS", "15")),
)
CONNECTION_DETAIL_OVERRUN_MULTIPLIER = max(
    1.0,
    float(os.getenv("ROS_MONITOR_CONNECTION_DETAIL_OVERRUN_MULTIPLIER", "1.5")),
)
CONNECTION_PROTOCOL_BREAKDOWN_INTERVAL_SECONDS = max(
    CONNECTION_PROTOCOL_POLL_SECONDS,
    int(os.getenv("ROS_MONITOR_CONNECTION_PROTOCOL_BREAKDOWN_INTERVAL_SECONDS", "300")),
)
CONNECTION_PROTOCOL_SCAN_TIMEOUT = max(120, int(os.getenv("ROS_MONITOR_CONNECTION_PROTOCOL_SCAN_TIMEOUT", "300")))
CONNECTION_TRACKING_TIMEOUT = max(12, int(os.getenv("ROS_MONITOR_CONNECTION_TRACKING_TIMEOUT", "30")))
CONNECTION_DETAIL_REST_TIMEOUT = max(8, int(os.getenv("ROS_MONITOR_CONNECTION_DETAIL_REST_TIMEOUT", "12")))
DNS_STATIC_PREVIEW_LIMIT = int(os.getenv("ROS_MONITOR_DNS_STATIC_PREVIEW_LIMIT", "12"))


DNS_STATIC_CACHE_TTL = int(os.getenv("ROS_MONITOR_DNS_STATIC_CACHE_TTL", "60"))
DNS_STATIC_FULL_REST_TIMEOUT = int(os.getenv("ROS_MONITOR_DNS_STATIC_FULL_REST_TIMEOUT", "35"))
IP_ALIAS_FILE = Path(os.getenv("ROS_PANEL_IP_ALIAS_FILE", str(BASE_DIR / "data" / "ip_aliases.json"))).expanduser()
WAN_LATENCY_TARGET = os.getenv("ROS_PANEL_WAN_LATENCY_TARGET", "www.baidu.com").strip() or "www.baidu.com"
WAN_LATENCY_POLL_SECONDS = max(1, int(os.getenv("ROS_PANEL_WAN_LATENCY_POLL_SECONDS", "10")))
WAN_LATENCY_TIMEOUT_MS = max(200, int(os.getenv("ROS_PANEL_WAN_LATENCY_TIMEOUT_MS", "1200")))


def connection_detail_sleep_seconds(elapsed):
    if elapsed < CONNECTION_DETAIL_POLL_SECONDS:
        return max(0, CONNECTION_DETAIL_POLL_SECONDS - elapsed)
    adaptive = int(elapsed * CONNECTION_DETAIL_OVERRUN_MULTIPLIER)
    adaptive = max(CONNECTION_DETAIL_OVERRUN_BACKOFF_SECONDS, adaptive)
    return min(CONNECTION_DETAIL_OVERRUN_BACKOFF_CAP_SECONDS, adaptive)


def tcp_latency_target(target=WAN_LATENCY_TARGET, timeout_ms=WAN_LATENCY_TIMEOUT_MS):
    safe_target = str(target or WAN_LATENCY_TARGET).strip() or WAN_LATENCY_TARGET
    parsed = urlparse(safe_target if "://" in safe_target else f"https://{safe_target}")
    host = parsed.hostname or safe_target
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    safe_timeout_ms = max(200, to_int(timeout_ms, WAN_LATENCY_TIMEOUT_MS))
    started_at = time.time()
    try:
        with socket.create_connection((host, port), timeout=max(0.2, safe_timeout_ms / 1000.0)):
            pass
        return {
            "ok": True,
            "target": safe_target,
            "latencyMs": max(1, int(round((time.time() - started_at) * 1000))),
            "updatedAt": format_iso_now(),
            "method": "tcp-connect-fallback",
            "error": None,
        }
    except Exception as exc:
        return {
            "ok": False,
            "target": safe_target,
            "latencyMs": None,
            "updatedAt": format_iso_now(),
            "method": "tcp-connect-fallback",
            "error": str(exc),
        }


def ping_latency_target(target=WAN_LATENCY_TARGET, timeout_ms=WAN_LATENCY_TIMEOUT_MS):
    safe_target = str(target or WAN_LATENCY_TARGET).strip() or WAN_LATENCY_TARGET
    safe_timeout_ms = max(200, to_int(timeout_ms, WAN_LATENCY_TIMEOUT_MS))
    timeout_seconds = max(1.0, safe_timeout_ms / 1000.0 + 0.8)
    if os.name == "nt":
        command = ["ping", "-n", "1", "-w", str(safe_timeout_ms), safe_target]
    else:
        command = ["ping", "-c", "1", "-W", str(max(1, int(round(safe_timeout_ms / 1000.0)))), safe_target]
    started_at = time.time()
    try:
        proc = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout_seconds,
        )
        output = f"{proc.stdout}\n{proc.stderr}"
        latency_ms = parse_ping_latency_ms(output)
        if latency_ms is None and proc.returncode == 0:
            latency_ms = max(1, int(round((time.time() - started_at) * 1000)))
        if latency_ms is None and proc.returncode != 0:
            lowered = output.lower()
            if "operation not permitted" in lowered or "permission denied" in lowered:
                fallback = tcp_latency_target(safe_target, safe_timeout_ms)
                fallback["error"] = None if fallback.get("ok") else f"ICMP ping unavailable; {fallback.get('error') or 'TCP fallback failed'}"
                return fallback
        return {
            "ok": proc.returncode == 0 and latency_ms is not None,
            "target": safe_target,
            "latencyMs": latency_ms,
            "updatedAt": format_iso_now(),
            "method": "icmp-ping",
            "error": None if proc.returncode == 0 and latency_ms is not None else (output.strip()[-240:] or f"ping exited {proc.returncode}"),
        }
    except FileNotFoundError:
        fallback = tcp_latency_target(safe_target, safe_timeout_ms)
        fallback["error"] = None if fallback.get("ok") else f"ICMP ping command not found; {fallback.get('error') or 'TCP fallback failed'}"
        return fallback
    except Exception as exc:
        return {
            "ok": False,
            "target": safe_target,
            "latencyMs": None,
            "updatedAt": format_iso_now(),
            "method": "icmp-ping",
            "error": str(exc),
        }


def dns_static_total_count_from_meta(dns_static_meta, fallback=DNS_STATIC_PREVIEW_LIMIT):
    meta = dns_static_meta if isinstance(dns_static_meta, dict) else {}
    for key in ("total_count", "totalCount", "count"):
        if key in meta:
            return to_int(meta.get(key), fallback)
    return to_int(fallback, DNS_STATIC_PREVIEW_LIMIT)


def build_panel_capabilities(wan_lines, pppoe_count):
    wan_count = len(wan_lines or [])
    return {
        "readonlyDiagnostics": READONLY_DIAGNOSTICS_ENABLED,
        "privateDiagnostics": READONLY_DIAGNOSTICS_ENABLED,
        "openwrtDiagnostics": READONLY_DIAGNOSTICS_ENABLED,
        "nikkiDiagnostics": READONLY_DIAGNOSTICS_ENABLED,
        "semanticTriage": True,
        "actionQueue": True,
        "publicRouterosProfile": PUBLIC_ROUTEROS_PROFILE,
        "ipAliasWrite": IP_ALIAS_WRITE_ENABLED,
        "adminSessions": EXPOSE_ADMIN_SESSIONS,
        "wanFallback": wan_count > 0 and to_int(pppoe_count) == 0,
        "singleWan": wan_count == 1,
        "multiWan": wan_count > 1,
    }


class Collector:
    def __init__(self):
        router_status = public_router_config()
        self.state = {
            "status": "starting" if router_status["configured"] else "needs_config",
            "updatedAt": None,
            "error": None if router_status["configured"] else "RouterOS SSH connection is not configured",
            "meta": {
                "target": PANEL_TARGET,
                "routerHost": router_status["host"],
                "routerLogin": router_status,
                "pollSeconds": POLL_SECONDS,
                "staticPollSeconds": STATIC_POLL_SECONDS,
                "slowRestPollSeconds": SLOW_REST_POLL_SECONDS,
                "connectionDetailPollSeconds": CONNECTION_DETAIL_POLL_SECONDS,
                "detailRestWorkers": DETAIL_REST_WORKERS,
                "connectionProtocolPollSeconds": CONNECTION_PROTOCOL_BREAKDOWN_INTERVAL_SECONDS,
            },
        }
        self.state = normalize_collector_snapshot_status(self.state)
        self.lock = threading.Lock()
        self.ssh_lock = threading.Lock()
        self.prev_counters = {}
        self.prev_ts = None
        self.current_rates = {}
        self.zero_rate_candidates = {}
        self.last_counter_sample_at = None
        self.rate_history_sample_count = 0
        self.last_rate_sample_ready = False
        self.last_counter_reset = False
        self.prev_quality_counters = {}
        self.current_interface_quality = {}
        self.last_quality_sample_at = None
        self.interface_quality_sample_count = 0
        self.realtime_rest = {}
        self.realtime_failures = {}
        self.realtime_updated_at = None
        self.realtime_error = None
        self.realtime_last_error_at = None
        self.realtime_duration_seconds = None
        self.slow_rest = {}
        self.slow_failures = {}
        self.slow_updated_at = None
        self.slow_error = None
        self.slow_last_error_at = None
        self.slow_duration_seconds = None
        self.detail_failures = {}
        self.static_rest = {}
        self.static_failures = {}
        self.dns_static_cache = {"rows": [], "count": 0, "fetched_at": 0.0, "updatedAt": None}
        self.connection_summary = {
            "counts": {"all": 0, "tcp": None, "udp": None, "icmp": None},
            "protocolUpdatedAt": None,
            "protocolError": None,
            "protocolLastErrorAt": None,
            "protocolDurationSeconds": None,
        }
        self.connection_detail = {
            "active_connections": [],
            "updatedAt": None,
            "detailError": None,
            "detailLastErrorAt": None,
            "detailDurationSeconds": None,
        }
        self.static_updated_at = None
        self.static_error = None
        self.static_last_error_at = None
        self.static_duration_seconds = None
        self.history = {
            "cpu": deque(maxlen=HISTORY_LIMIT),
            "memory": deque(maxlen=HISTORY_LIMIT),
            "disk": deque(maxlen=HISTORY_LIMIT),
            "uplink": deque(maxlen=HISTORY_LIMIT),
            "downlink": deque(maxlen=HISTORY_LIMIT),
            "timestamps": deque(maxlen=HISTORY_LIMIT),
        }
        self.line_history = {}
        self.ip_aliases = self.load_ip_aliases()
        self.readonly_diagnostics_cache = {"fetched_at": 0.0, "payload": None}
        self.connection_protocol_last_scan_at = 0.0
        self.wan_latency = {
            "ok": False,
            "target": WAN_LATENCY_TARGET,
            "latencyMs": None,
            "updatedAt": None,
            "method": "icmp-ping",
            "error": None,
        }
        self.wan_latency_last_probe_at = 0.0

    def reset_collection_state(self, status="starting", error=None):
        router_status = public_router_config()
        with self.lock:
            self.prev_counters = {}
            self.prev_ts = None
            self.current_rates = {}
            self.zero_rate_candidates = {}
            self.last_counter_sample_at = None
            self.rate_history_sample_count = 0
            self.last_rate_sample_ready = False
            self.last_counter_reset = False
            self.prev_quality_counters = {}
            self.current_interface_quality = {}
            self.last_quality_sample_at = None
            self.interface_quality_sample_count = 0
            self.realtime_rest = {}
            self.realtime_failures = {}
            self.realtime_updated_at = None
            self.realtime_error = None
            self.realtime_last_error_at = None
            self.realtime_duration_seconds = None
            self.slow_rest = {}
            self.slow_failures = {}
            self.slow_updated_at = None
            self.slow_error = None
            self.slow_last_error_at = None
            self.slow_duration_seconds = None
            self.detail_failures = {}
            self.static_rest = {}
            self.static_failures = {}
            self.static_updated_at = None
            self.static_error = None
            self.static_last_error_at = None
            self.static_duration_seconds = None
            self.dns_static_cache = {"rows": [], "count": 0, "fetched_at": 0.0, "updatedAt": None}
            self.connection_summary = {
                "counts": {"all": 0, "tcp": None, "udp": None, "icmp": None},
                "protocolUpdatedAt": None,
                "protocolError": None,
                "protocolLastErrorAt": None,
                "protocolDurationSeconds": None,
            }
            self.connection_detail = {
                "active_connections": [],
                "updatedAt": None,
                "detailError": None,
                "detailLastErrorAt": None,
                "detailDurationSeconds": None,
            }
            self.history = {
                "cpu": deque(maxlen=HISTORY_LIMIT),
                "memory": deque(maxlen=HISTORY_LIMIT),
                "disk": deque(maxlen=HISTORY_LIMIT),
                "uplink": deque(maxlen=HISTORY_LIMIT),
                "downlink": deque(maxlen=HISTORY_LIMIT),
                "timestamps": deque(maxlen=HISTORY_LIMIT),
            }
            self.line_history = {}
            self.readonly_diagnostics_cache = {"fetched_at": 0.0, "payload": None}
            self.connection_protocol_last_scan_at = 0.0
            self.wan_latency = {
                "ok": False,
                "target": WAN_LATENCY_TARGET,
                "latencyMs": None,
                "updatedAt": None,
                "method": "icmp-ping",
                "error": None,
            }
            self.wan_latency_last_probe_at = 0.0
            self.state = {
                "status": status,
                "updatedAt": format_iso_now(),
                "error": error,
                "meta": {
                    "target": PANEL_TARGET,
                    "routerHost": router_status["host"],
                    "routerLogin": router_status,
                    "pollSeconds": POLL_SECONDS,
                    "staticPollSeconds": STATIC_POLL_SECONDS,
                    "slowRestPollSeconds": SLOW_REST_POLL_SECONDS,
                    "connectionDetailPollSeconds": CONNECTION_DETAIL_POLL_SECONDS,
                    "detailRestWorkers": DETAIL_REST_WORKERS,
                    "connectionProtocolPollSeconds": CONNECTION_PROTOCOL_BREAKDOWN_INTERVAL_SECONDS,
                },
            }
            self.state = normalize_collector_snapshot_status(self.state)

    def require_router_config_for_collection(self):
        if router_config_is_ready(get_router_config()):
            return True
        router_status = public_router_config()
        with self.lock:
            self.state = {
                "status": "needs_config",
                "updatedAt": format_iso_now(),
                "error": "RouterOS SSH connection is not configured",
                "meta": {
                    "target": PANEL_TARGET,
                    "routerHost": router_status["host"],
                    "routerLogin": router_status,
                    "pollSeconds": POLL_SECONDS,
                    "staticPollSeconds": STATIC_POLL_SECONDS,
                    "slowRestPollSeconds": SLOW_REST_POLL_SECONDS,
                    "connectionDetailPollSeconds": CONNECTION_DETAIL_POLL_SECONDS,
                    "detailRestWorkers": DETAIL_REST_WORKERS,
                    "connectionProtocolPollSeconds": CONNECTION_PROTOCOL_BREAKDOWN_INTERVAL_SECONDS,
                },
            }
            self.state = normalize_collector_snapshot_status(self.state)
        return False

    def load_ip_aliases(self):
        try:
            if not IP_ALIAS_FILE.exists():
                return {}
            payload = json.loads(IP_ALIAS_FILE.read_text(encoding="utf-8"))
            alias_source = payload.get("aliases", {}) if isinstance(payload, dict) else {}
            if not isinstance(alias_source, dict):
                alias_source = {}
            aliases = {}
            for raw_ip, raw_name in alias_source.items():
                ip_key = normalize_ip_key(raw_ip)
                custom_name = normalize_custom_name(raw_name)
                if ip_key and custom_name:
                    aliases[ip_key] = custom_name
            return aliases
        except Exception:
            return {}

    def persist_ip_aliases(self, aliases):
        IP_ALIAS_FILE.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "updatedAt": format_iso_now(),
            "aliases": dict(sorted(aliases.items(), key=lambda item: item[0])),
        }
        IP_ALIAS_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def resolve_ip_alias(self, ip_value, alias_map=None):
        ip_key = normalize_ip_key(ip_value)
        if not ip_key:
            return ""
        aliases = alias_map if alias_map is not None else self.ip_aliases
        return aliases.get(ip_key, "")

    def apply_ip_aliases_to_snapshot(self, snapshot, alias_map=None):
        if not isinstance(snapshot, dict):
            return snapshot
        aliases = alias_map if alias_map is not None else self.ip_aliases

        def decorate_row(row, ip_value, host_key="hostname"):
            if not isinstance(row, dict):
                return
            custom_name = self.resolve_ip_alias(ip_value, aliases)
            raw_name = str(row.get(host_key) or "").strip()
            auto_name = raw_name if raw_name and raw_name != "-" else ""
            fallback_name = str(ip_value or row.get("ip") or row.get("address") or "-").strip() or "-"
            row["customName"] = custom_name
            row["displayName"] = custom_name or auto_name or fallback_name

        for row in snapshot.get("terminals", []):
            decorate_row(row, row.get("ip"))
        arp = snapshot.get("arp")
        if isinstance(arp, dict):
            for row in arp.get("items", []):
                decorate_row(row, row.get("ip"))
        dhcp = snapshot.get("dhcp")
        if isinstance(dhcp, dict):
            for row in dhcp.get("leases", []):
                decorate_row(row, row.get("address"))
        connections = snapshot.get("connections")
        if isinstance(connections, dict):
            for row in connections.get("topIps", []):
                decorate_row(row, row.get("ip"))
        return snapshot

    def update_ip_alias(self, ip_value, name_value):
        ip_key = normalize_ip_key(ip_value)
        if not ip_key:
            raise ValueError("IP 地址不能为空")
        custom_name = normalize_custom_name(name_value)
        with self.lock:
            next_aliases = dict(self.ip_aliases)
            if custom_name:
                next_aliases[ip_key] = custom_name
            else:
                next_aliases.pop(ip_key, None)
        self.persist_ip_aliases(next_aliases)
        with self.lock:
            self.ip_aliases = next_aliases
            self.state = self.apply_ip_aliases_to_snapshot(copy.deepcopy(self.state), next_aliases)
            snapshot = copy.deepcopy(self.state)
        return {"ip": ip_key, "customName": custom_name, "snapshot": snapshot}

    def rest_get(self, session, config):
        router = get_ready_router_config()
        response = session.get(
            f"http://{router['host']}{_ROUTER_REST_PORT_SUFFIX}/rest/{config['path']}",
            params=config.get("params"),
            timeout=config.get("timeout", REST_TIMEOUT),
        )
        if config.get("optional") and response.status_code == 404:
            return [] if config.get("kind") != "object" else {}
        response.raise_for_status()
        payload = response.json()
        if config.get("kind") == "object":
            return payload[0] if isinstance(payload, list) and payload else payload or {}
        return payload if isinstance(payload, list) else ([payload] if payload else [])

    def rest_post(self, session, path, payload=None, timeout=None):
        router = get_ready_router_config()
        response = session.post(
            f"http://{router['host']}{_ROUTER_REST_PORT_SUFFIX}/rest/{path.strip('/')}",
            json=payload or {},
            timeout=timeout or REST_TIMEOUT,
        )
        response.raise_for_status()
        if not response.content:
            return {}
        return response.json()

    def rest_print(self, path, proplist=None, query=None, timeout=None):
        router = get_ready_router_config()
        session = requests.Session()
        session.auth = (router["user"], router["password"])
        try:
            payload = {}
            if proplist:
                payload[".proplist"] = proplist
            if query:
                payload[".query"] = query
            result = self.rest_post(session, f"{path.strip('/')}/print", payload, timeout=timeout)
            return result if isinstance(result, list) else ([result] if result else [])
        finally:
            session.close()

    def ssh_exec(self, client, command, timeout=None):
        timeout = max(1, to_int(timeout, SSH_TIMEOUT))
        stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
        channel = stdout.channel
        try:
            channel.settimeout(timeout)
            stderr.channel.settimeout(timeout)
            output = stdout.read().decode("utf-8", errors="replace").strip()
            error = stderr.read().decode("utf-8", errors="replace").strip()
            exit_status = channel.recv_exit_status()
        except socket.timeout as exc:
            try:
                channel.close()
            except Exception:
                pass
            raise RuntimeError(f"SSH command timed out after {timeout}s: {command}") from exc
        except Exception as exc:
            try:
                channel.close()
            except Exception:
                pass
            raise RuntimeError(f"SSH command failed: {command}: {exc}") from exc
        if exit_status != 0:
            raise RuntimeError(error or f"SSH command exited with status {exit_status}: {command}")
        if error:
            raise RuntimeError(error)
        return output

    def ssh_json(self, client, expression):
        payload = self.ssh_exec(client, f":put [:serialize to=json value={expression}]")
        return json.loads(payload) if payload else []

    def ssh_capture(self, client, command, capture_seconds, max_bytes=None, quiet_window=0.75, timeout=None):
        timeout = max(1, to_int(timeout, SSH_TIMEOUT))
        capture_seconds = max(1.0, float(capture_seconds or 0))
        stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
        channel = stdout.channel
        stdout_chunks = []
        stderr_chunks = []
        total_bytes = 0
        started_at = time.time()
        first_output_at = None
        last_output_at = None
        try:
            channel.settimeout(1.0)
            while time.time() - started_at < capture_seconds:
                received = False
                while channel.recv_ready():
                    data = channel.recv(65535)
                    if not data:
                        break
                    received = True
                    now = time.time()
                    if first_output_at is None:
                        first_output_at = now
                    last_output_at = now
                    stdout_chunks.append(data)
                    total_bytes += len(data)
                    if max_bytes and total_bytes >= max_bytes:
                        break
                while channel.recv_stderr_ready():
                    data = channel.recv_stderr(65535)
                    if not data:
                        break
                    stderr_chunks.append(data)
                if max_bytes and total_bytes >= max_bytes:
                    break
                if channel.exit_status_ready():
                    break
                if first_output_at and last_output_at and (time.time() - last_output_at) >= quiet_window:
                    break
                if not received:
                    time.sleep(0.1)
            # Some servers emit exit-status ahead of the final buffered output;
            # drain briefly instead of returning an empty capture.
            if not stdout_chunks and channel.exit_status_ready():
                drain_deadline = time.time() + 0.5
                while time.time() < drain_deadline:
                    progressed = False
                    while channel.recv_ready():
                        data = channel.recv(65535)
                        if not data:
                            break
                        stdout_chunks.append(data)
                        total_bytes += len(data)
                        progressed = True
                    while channel.recv_stderr_ready():
                        data = channel.recv_stderr(65535)
                        if not data:
                            break
                        stderr_chunks.append(data)
                        progressed = True
                    if not progressed:
                        time.sleep(0.05)
            error = b"".join(stderr_chunks).decode("utf-8", errors="replace").strip()
            text = b"".join(stdout_chunks).decode("utf-8", errors="replace")
            complete = channel.exit_status_ready()
            if not text and complete:
                exit_status = channel.recv_exit_status()
                if exit_status != 0:
                    raise RuntimeError(error or f"SSH command exited with status {exit_status}: {command}")
            if not text and not complete:
                raise RuntimeError(
                    error or f"SSH stream capture produced no rows within {round(capture_seconds, 1)}s: {command}"
                )
            return {
                "text": text,
                "stderr": error,
                "complete": complete,
                "capturedBytes": total_bytes,
                "firstOutputSeconds": round((first_output_at - started_at), 2) if first_output_at else None,
            }
        finally:
            try:
                channel.close()
            except Exception:
                pass

    def fetch_rest_item(self, key, endpoint_config):
        router = get_ready_router_config()
        session = requests.Session()
        session.auth = (router["user"], router["password"])
        try:
            return key, self.rest_get(session, endpoint_config), None
        except Exception as exc:
            return key, None, compact_exception_text(exc)
        finally:
            session.close()

    def fetch_rest_bundle(self, endpoints, workers=1):
        max_workers = max(1, min(to_int(workers, 1), len(endpoints) or 1))
        if max_workers > 1 and len(endpoints) > 1:
            payload = {}
            failures = {}
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = [
                    executor.submit(self.fetch_rest_item, key, endpoint_config)
                    for key, endpoint_config in endpoints.items()
                ]
                for future in futures:
                    key, value, error = future.result()
                    endpoint_config = endpoints[key]
                    fallback = {} if endpoint_config.get("kind") == "object" else []
                    if error:
                        payload[key] = fallback
                        failures[key] = error
                    else:
                        payload[key] = value
            if failures:
                payload["_failures"] = failures
            required_keys = [key for key, endpoint_config in endpoints.items() if not endpoint_config.get("optional")]
            if failures and required_keys and all(key in failures for key in required_keys):
                joined = "; ".join(f"{key}: {message}" for key, message in failures.items())
                raise RuntimeError(joined)
            return payload

        router = get_ready_router_config()
        session = requests.Session()
        session.auth = (router["user"], router["password"])
        try:
            payload = {}
            failures = {}
            for key, endpoint_config in endpoints.items():
                fallback = {} if endpoint_config.get("kind") == "object" else []
                try:
                    payload[key] = self.rest_get(session, endpoint_config)
                except Exception as exc:
                    payload[key] = fallback
                    failures[key] = compact_exception_text(exc)
            if failures:
                payload["_failures"] = failures
            required_keys = [key for key, endpoint_config in endpoints.items() if not endpoint_config.get("optional")]
            if failures and required_keys and all(key in failures for key in required_keys):
                joined = "; ".join(f"{key}: {message}" for key, message in failures.items())
                raise RuntimeError(joined)
            return payload
        finally:
            session.close()

    def open_ssh_client(self, timeout=None):
        router = get_ready_router_config()
        timeout = max(1, to_int(timeout, SSH_TIMEOUT))
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            client.connect(
                router["host"],
                port=router["sshPort"],
                username=router["user"],
                password=router["password"],
                timeout=timeout,
                banner_timeout=timeout,
                auth_timeout=timeout,
                allow_agent=False,
                look_for_keys=False,
            )
        except Exception as exc:
            try:
                client.close()
            except Exception:
                pass
            raise RuntimeError(format_ssh_connect_error(router, exc, timeout=timeout)) from exc
        return client

    def fetch_connection_total_count(self):
        return self.fetch_connection_tracking_summary()["total"]

    def parse_connection_tracking_summary(self, fields, source="RouterOS connection tracking"):
        fields = {str(key).lower(): value for key, value in (fields or {}).items()}
        total = to_int(fields.get("total-entries"), -1)
        if total < 0:
            raise RuntimeError(f"{source} missing total-entries")
        return {
            "total": total,
            "ipv4": to_int(fields.get("total-ip4-entries"), 0),
            "ipv6": to_int(fields.get("total-ip6-entries"), 0),
        }

    def fetch_connection_tracking_summary_rest(self):
        rows = self.rest_print(
            "ip/firewall/connection/tracking",
            proplist=["total-entries", "total-ip4-entries", "total-ip6-entries"],
            timeout=CONNECTION_DETAIL_REST_TIMEOUT,
        )
        return self.parse_connection_tracking_summary(rows[0] if rows else {}, source="REST connection tracking summary")

    def fetch_connection_tracking_summary_ssh(self):
        with self.ssh_lock:
            client = self.open_ssh_client(timeout=CONNECTION_TRACKING_TIMEOUT)
            try:
                output = self.ssh_exec(
                    client,
                    "/ip/firewall/connection/tracking print without-paging",
                    timeout=CONNECTION_TRACKING_TIMEOUT,
                )
                fields = {}
                for raw_line in output.splitlines():
                    match = TRACKING_FIELD_PATTERN.match(raw_line)
                    if match:
                        fields[match.group(1).lower()] = match.group(2).strip()
                return self.parse_connection_tracking_summary(fields, source="SSH connection tracking summary")
            finally:
                client.close()

    def fetch_connection_tracking_summary(self):
        try:
            return self.fetch_connection_tracking_summary_rest()
        except Exception as rest_exc:
            try:
                return self.fetch_connection_tracking_summary_ssh()
            except Exception as ssh_exc:
                raise RuntimeError(
                    f"REST connection tracking summary failed: {rest_exc}; SSH fallback failed: {ssh_exc}"
                ) from ssh_exc

    def fetch_connection_protocol_counts(self):
        tracking = self.fetch_connection_tracking_summary()
        return {
            "tcp": None,
            "udp": None,
            "icmp": None,
            "all": tracking["total"],
        }

    def parse_connection_terse_line(self, line):
        row = {}
        for match in TERSE_FIELD_PATTERN.finditer(line):
            key = match.group(1)
            value = match.group(2).strip()
            if re.fullmatch(r"[\d.\s]+", value):
                value = value.replace(" ", "")
            row[key] = value
        return row

    def dedupe_connection_rows(self, source_rows):
        rows = []
        seen = set()
        for raw_row in source_rows or []:
            row = raw_row if isinstance(raw_row, dict) else {}
            if not row:
                continue
            identity = (
                row.get("src-address", ""),
                row.get("dst-address", ""),
                row.get("reply-src-address", ""),
                row.get("reply-dst-address", ""),
                row.get("protocol", ""),
                row.get("timeout", ""),
                row.get("connection-mark", ""),
            )
            if identity in seen:
                continue
            seen.add(identity)
            rows.append(row)
            if len(rows) >= CONNECTION_DETAIL_SAMPLE_LIMIT:
                break
        return rows

    def fetch_connection_detail_rest(self):
        proplist = [
            "src-address",
            "dst-address",
            "reply-src-address",
            "reply-dst-address",
            "protocol",
            "timeout",
            "connection-mark",
            "orig-rate",
            "repl-rate",
            "orig-bytes",
            "repl-bytes",
        ]
        rows = self.rest_print(
            "ip/firewall/connection",
            proplist=proplist,
            query=[">orig-rate=0", ">repl-rate=0", "#|"],
            timeout=CONNECTION_DETAIL_REST_TIMEOUT,
        )
        return {
            "active_connections": self.dedupe_connection_rows(rows),
            "detailTransport": "rest",
        }

    def fetch_connection_detail_ssh(self):
        with self.ssh_lock:
            client = self.open_ssh_client()
            try:
                capture = self.ssh_capture(
                    client,
                    "/ip/firewall/connection print terse without-paging "
                    "proplist=src-address,dst-address,reply-src-address,reply-dst-address,protocol,timeout,connection-mark,orig-rate,repl-rate,orig-bytes,repl-bytes "
                    "where (orig-rate>0 || repl-rate>0)",
                    capture_seconds=CONNECTION_DETAIL_CAPTURE_SECONDS,
                    max_bytes=CONNECTION_DETAIL_STREAM_MAX_BYTES,
                    timeout=max(SSH_TIMEOUT, int(CONNECTION_DETAIL_CAPTURE_SECONDS) + 8),
                )
                parsed_rows = []
                for raw_line in capture["text"].splitlines():
                    line = raw_line.strip()
                    if not line or "src-address=" not in line:
                        continue
                    row = self.parse_connection_terse_line(line)
                    if row:
                        parsed_rows.append(row)
                return {
                    "active_connections": self.dedupe_connection_rows(parsed_rows),
                    "detailTransport": "ssh",
                }
            finally:
                client.close()

    def fetch_connection_detail(self):
        try:
            return self.fetch_connection_detail_rest()
        except Exception as rest_exc:
            try:
                detail = self.fetch_connection_detail_ssh()
                detail["detailTransport"] = "ssh-fallback"
                return detail
            except Exception as ssh_exc:
                raise RuntimeError(
                    f"REST connection detail failed: {rest_exc}; SSH fallback failed: {ssh_exc}"
                ) from ssh_exc

    def fetch_dns_static_count(self):
        with self.ssh_lock:
            client = self.open_ssh_client()
            try:
                return to_int(self.ssh_exec(client, "/ip/dns/static print count-only"))
            finally:
                client.close()

    def normalize_dns_static_rows(self, rows, limit=None):
        normalized_rows = []
        for item in rows or []:
            if isinstance(item, list):
                normalized_rows.extend(item)
            elif isinstance(item, dict):
                normalized_rows.append(item)
        if limit is None:
            return normalized_rows
        return normalized_rows[:limit]

    def fetch_dns_static_full_rest(self):
        router = get_ready_router_config()
        session = requests.Session()
        session.auth = (router["user"], router["password"])
        try:
            response = session.get(
                f"http://{router['host']}{_ROUTER_REST_PORT_SUFFIX}/rest/ip/dns/static",
                params={
                    ".proplist": "name,regexp,address,cname,text,ttl,comment,disabled,type",
                },
                timeout=DNS_STATIC_FULL_REST_TIMEOUT,
            )
            response.raise_for_status()
            payload = response.json()
            rows = payload if isinstance(payload, list) else ([payload] if payload else [])
            normalized_rows = self.normalize_dns_static_rows(rows)
            fetched_at = time.time()
            with self.lock:
                self.dns_static_cache = {
                    "rows": normalized_rows,
                    "count": len(normalized_rows),
                    "fetched_at": fetched_at,
                    "updatedAt": format_iso_now(),
                }
                self.static_rest["dns_static_meta"] = {
                    **copy.deepcopy(self.static_rest.get("dns_static_meta", {})),
                    "count": len(normalized_rows),
                    "total_count": len(normalized_rows),
                    "sample": len(normalized_rows) > len(self.static_rest.get("dns_static", [])),
                    "cacheTtlSeconds": DNS_STATIC_CACHE_TTL,
                    "cachedAt": self.dns_static_cache["updatedAt"],
                }
            return normalized_rows
        finally:
            session.close()

    def get_dns_static_cached_rows(self, force_refresh=False):
        now = time.time()
        with self.lock:
            cached_rows = copy.deepcopy(self.dns_static_cache.get("rows", []))
            fetched_at = float(self.dns_static_cache.get("fetched_at") or 0.0)
        cache_valid = cached_rows and (now - fetched_at) < DNS_STATIC_CACHE_TTL
        if force_refresh or not cache_valid:
            try:
                return self.fetch_dns_static_full_rest()
            except Exception:
                if cached_rows:
                    return cached_rows
                raise
        return cached_rows

    def fetch_dns_static_preview(self, total_count=0):
        with self.ssh_lock:
            client = self.open_ssh_client()
            try:
                last_index = max(min(total_count, DNS_STATIC_PREVIEW_LIMIT) - 1, -1)
                if last_index < 0:
                    return []
                preview_script = (
                    ':local ids [/ip/dns/static/find]; '
                    ':local out [:toarray ""]; '
                    f':local last ([:len $ids] - 1); :if ($last > {last_index}) do={{ :set last {last_index} }}; '
                    ':if ($last >= 0) do={ '
                    ':for idx from=0 to=$last do={ '
                    ':local i [:pick $ids $idx]; '
                    ':set out ($out, [/ip/dns/static/print as-value where .id=$i]); '
                    '} '
                    '}; '
                    ':put [:serialize to=json value=$out]'
                )
                preview = self.ssh_exec(client, preview_script)
                rows = json.loads(preview) if preview else []
                return self.normalize_dns_static_rows(rows, DNS_STATIC_PREVIEW_LIMIT)
            finally:
                client.close()

    def fetch_dns_static_page(self, offset=0, limit=DNS_STATIC_PAGE_LIMIT):
        safe_offset = max(to_int(offset, 0), 0)
        safe_limit = max(1, min(to_int(limit, DNS_STATIC_PAGE_LIMIT), DNS_STATIC_MAX_PAGE_LIMIT))
        try:
            rows = self.get_dns_static_cached_rows()
            return rows[safe_offset : safe_offset + safe_limit]
        except Exception:
            with self.lock:
                preview_rows = copy.deepcopy(self.static_rest.get("dns_static", []))
            return preview_rows[safe_offset : safe_offset + safe_limit]

    def get_dns_static_total_count(self):
        with self.lock:
            meta = copy.deepcopy(self.static_rest.get("dns_static_meta", {}))
            preview_rows = copy.deepcopy(self.static_rest.get("dns_static", []))
            cached_count = to_int(self.dns_static_cache.get("count"), 0)
        return dns_static_total_count_from_meta(meta, cached_count or len(preview_rows))

    def merge_rest_bundle(self):
        with self.lock:
            static_rest = copy.deepcopy(self.static_rest)
            slow_rest = copy.deepcopy(self.slow_rest)
            realtime_rest = copy.deepcopy(self.realtime_rest)
        static_rest.pop("_failures", None)
        slow_rest.pop("_failures", None)
        realtime_rest.pop("_failures", None)
        merged = copy.deepcopy(EMPTY_REST_BUNDLE)
        merged.update(static_rest)
        merged.update(slow_rest)
        merged.update(realtime_rest)
        return merged

    def merge_connection_bundle(self):
        with self.lock:
            counts = copy.deepcopy(self.connection_summary["counts"])
            protocol_updated_at = self.connection_summary.get("protocolUpdatedAt")
            protocol_error = self.connection_summary.get("protocolError")
            protocol_last_error_at = self.connection_summary.get("protocolLastErrorAt")
            protocol_duration_seconds = self.connection_summary.get("protocolDurationSeconds")
            active_connections = copy.deepcopy(self.connection_detail["active_connections"])
            detail_updated_at = self.connection_detail.get("updatedAt")
            detail_error = self.connection_detail.get("detailError")
            detail_last_error_at = self.connection_detail.get("detailLastErrorAt")
            detail_duration_seconds = self.connection_detail.get("detailDurationSeconds")
        return {
            "counts": counts,
            "protocolUpdatedAt": protocol_updated_at,
            "protocolError": protocol_error,
            "protocolLastErrorAt": protocol_last_error_at,
            "protocolDurationSeconds": protocol_duration_seconds,
            "active_connections": active_connections,
            "detailUpdatedAt": detail_updated_at,
            "detailError": detail_error,
            "detailLastErrorAt": detail_last_error_at,
            "detailDurationSeconds": detail_duration_seconds,
        }

    def compute_rates(self, interfaces, fresh_counter_sample=False):
        if not fresh_counter_sample:
            with self.lock:
                return copy.deepcopy(self.current_rates)
        ts = time.time()
        with self.lock:
            previous = copy.deepcopy(self.prev_counters)
            previous_ts = self.prev_ts
            previous_rates = copy.deepcopy(self.current_rates)
            zero_candidates = copy.deepcopy(self.zero_rate_candidates)
        interval = max(ts - previous_ts, 1) if previous_ts else 1
        rates = {}
        current = {}
        sample_ready = False
        counter_reset = False

        def previous_direction_rate(interface_name, direction):
            value = previous_rates.get(interface_name, {}).get(f"{direction}Bps")
            try:
                return float(value)
            except (TypeError, ValueError):
                return 0.0

        def confirm_zero_rate(interface_name, direction, raw_rate, has_baseline, reset):
            if reset:
                zero_candidates.setdefault(interface_name, {})[direction] = 0
                return None
            previous_rate = previous_direction_rate(interface_name, direction)
            if has_baseline and raw_rate == 0 and previous_rate > 0:
                direction_counts = zero_candidates.setdefault(interface_name, {})
                direction_counts[direction] = to_int(direction_counts.get(direction), 0) + 1
                if direction_counts[direction] < RATE_ZERO_CONFIRM_SAMPLES:
                    return previous_rate
                return 0
            zero_candidates.setdefault(interface_name, {})[direction] = 0
            return raw_rate

        for item in interfaces:
            name = item.get("name")
            if not name:
                continue
            rx = to_int(item.get("rx-byte"))
            tx = to_int(item.get("tx-byte"))
            current[name] = (rx, tx)
            has_baseline = name in previous
            prev_rx, prev_tx = previous.get(name, (rx, tx))
            rx_delta = counter_delta(rx, prev_rx) if has_baseline else 0
            tx_delta = counter_delta(tx, prev_tx) if has_baseline else 0
            reset = has_baseline and (rx_delta is None or tx_delta is None)
            counter_reset = counter_reset or reset
            sample_ready = sample_ready or (has_baseline and not reset)
            raw_rx_bps = ((rx_delta or 0) / interval) if has_baseline and not reset else 0
            raw_tx_bps = ((tx_delta or 0) / interval) if has_baseline and not reset else 0
            rates[name] = {
                "rxBps": confirm_zero_rate(name, "rx", raw_rx_bps, has_baseline, reset),
                "txBps": confirm_zero_rate(name, "tx", raw_tx_bps, has_baseline, reset),
                "rateSampleReady": has_baseline and not reset,
                "counterReset": reset,
            }
        with self.lock:
            self.prev_counters = current
            self.prev_ts = ts
            self.current_rates = copy.deepcopy(rates)
            self.zero_rate_candidates = zero_candidates
            self.last_counter_sample_at = format_iso_now()
            self.last_rate_sample_ready = sample_ready
            self.last_counter_reset = counter_reset
            if sample_ready:
                self.rate_history_sample_count += 1
        return rates

    def compute_interface_quality(self, interfaces, fresh_counter_sample=False):
        if not fresh_counter_sample:
            with self.lock:
                return copy.deepcopy(self.current_interface_quality)

        updated_at = format_iso_now()
        with self.lock:
            previous = copy.deepcopy(self.prev_quality_counters)
            sample_count = self.interface_quality_sample_count + 1

        current = {}
        quality = {}
        for item in interfaces:
            name = item.get("name")
            if not name:
                continue
            counters = {
                "rxPackets": to_int(item.get("rx-packet")),
                "txPackets": to_int(item.get("tx-packet")),
                "rxDrop": to_int(item.get("rx-drop")),
                "txDrop": to_int(item.get("tx-drop")),
                "rxError": to_int(item.get("rx-error")),
                "txError": to_int(item.get("tx-error")),
            }
            current[name] = counters
            prev = previous.get(name)
            has_baseline = isinstance(prev, dict)
            counter_reset = bool(
                has_baseline
                and any(counters[key] < to_int(prev.get(key)) for key in counters)
            )
            if has_baseline and not counter_reset:
                delta = {key: max(counters[key] - to_int(prev.get(key)), 0) for key in counters}
            else:
                delta = {key: 0 for key in counters}

            packet_total = counters["rxPackets"] + counters["txPackets"]
            packet_delta = delta["rxPackets"] + delta["txPackets"]
            drop_total = counters["rxDrop"] + counters["txDrop"]
            error_total = counters["rxError"] + counters["txError"]
            drop_delta = delta["rxDrop"] + delta["txDrop"]
            error_delta = delta["rxError"] + delta["txError"]
            loss_rate = (drop_delta / packet_delta) if packet_delta > 0 else None
            error_rate = (error_delta / packet_delta) if packet_delta > 0 else None
            is_derived = interface_is_derived(name, item.get("type"))
            quality[name] = {
                "packetTotal": packet_total,
                "packetDelta": packet_delta,
                "dropTotal": drop_total,
                "errorTotal": error_total,
                "dropDelta": drop_delta,
                "errorDelta": error_delta,
                "rxDropDelta": delta["rxDrop"],
                "txDropDelta": delta["txDrop"],
                "rxErrorDelta": delta["rxError"],
                "txErrorDelta": delta["txError"],
                "lossRate": loss_rate,
                "errorRate": error_rate,
                "qualityUpdatedAt": updated_at,
                "qualitySampleCount": sample_count,
                "qualitySampleReady": has_baseline and not counter_reset,
                "qualityCounterReset": counter_reset,
                "isDerivedInterface": is_derived,
                "isLogicalInterface": is_derived,
                "qualityDisplayWeight": 0.35 if is_derived else 1.0,
                "qualityEvidenceLevel": "logical" if is_derived else "primary",
                "qualityParent": interface_parent_hint(item),
                "logicalPairKey": interface_logical_pair_key(item),
                "qualityGroupKey": interface_quality_group_key(item),
            }

        with self.lock:
            self.prev_quality_counters = current
            self.current_interface_quality = copy.deepcopy(quality)
            self.last_quality_sample_at = updated_at
            self.interface_quality_sample_count = sample_count
        return quality

    def get_wan_latency(self, force=False):
        now = time.time()
        with self.lock:
            cached = copy.deepcopy(self.wan_latency)
            last_probe_at = float(self.wan_latency_last_probe_at or 0.0)
        if not force and cached.get("updatedAt") and (now - last_probe_at) < WAN_LATENCY_POLL_SECONDS:
            return cached
        result = ping_latency_target(WAN_LATENCY_TARGET, WAN_LATENCY_TIMEOUT_MS)
        with self.lock:
            self.wan_latency = copy.deepcopy(result)
            self.wan_latency_last_probe_at = now
        return result

    def attach_wan_latency(self, rows, latency):
        latency_ms = to_int((latency or {}).get("latencyMs"), 0)
        return [
            {
                **copy.deepcopy(row),
                "latencyMs": latency_ms or None,
                "latencyTarget": (latency or {}).get("target") or WAN_LATENCY_TARGET,
                "latencyUpdatedAt": (latency or {}).get("updatedAt"),
                "latencyOk": bool((latency or {}).get("ok")),
                "latencyError": (latency or {}).get("error"),
            }
            for row in rows
        ]

    def build_maps(self, rest):
        interface_types = {row.get("name"): row.get("type", "") for row in rest["interfaces"]}
        addresses_by_interface = defaultdict(list)
        local_networks = []
        router_ips = set()
        address_rows = list(rest["ip_addresses"]) + list(rest.get("ipv6_addresses", []))
        for item in address_rows:
            iface = item.get("actual-interface") or item.get("interface")
            address = item.get("address", "").split("/")[0]
            if not address:
                continue
            addresses_by_interface[iface].append(item)
            try:
                ip_iface = ipaddress.ip_interface(item.get("address"))
                network = ip_iface.network
                if interface_types.get(iface) not in {"wireguard", "loopback"} and not str(iface).startswith("pppoe-out"):
                    if not ip_iface.ip.is_loopback and not ip_iface.ip.is_link_local:
                        local_networks.append(network)
                router_ips.add(address)
            except Exception:
                pass
        return addresses_by_interface, local_networks, router_ips

    def build_overview(self, rest, ssh, terminal_count, wan_totals, wan_latency=None):
        resource = rest["resource"]
        latency = wan_latency or {}
        latency_ms = to_int(latency.get("latencyMs"), 0)
        total_memory = to_int(resource.get("total-memory"))
        used_memory = max(total_memory - to_int(resource.get("free-memory")), 0)
        total_disk = to_int(resource.get("total-hdd-space"))
        used_disk = max(total_disk - to_int(resource.get("free-hdd-space")), 0)
        admins = []
        if EXPOSE_ADMIN_SESSIONS:
            seen = set()
            for user in rest["active_users"]:
                key = (user.get("name"), user.get("address"), user.get("via"))
                if key in seen:
                    continue
                seen.add(key)
                admins.append(
                    {
                        "name": user.get("name", "-"),
                        "address": user.get("address", "-"),
                        "via": user.get("via", "-"),
                        "when": user.get("when", "-"),
                    }
                )
        cpu_raw = to_int(resource.get("cpu-load"))
        cpu_load = min(max(cpu_raw, 0), 100)
        memory_usage = min(max(round((used_memory / total_memory) * 100, 2), 0.0), 100.0) if total_memory else 0
        disk_usage = min(max(round((used_disk / total_disk) * 100, 2), 0.0), 100.0) if total_disk else 0
        resource_anomaly = []
        if cpu_raw < 0 or cpu_raw > 100:
            resource_anomaly.append(f"CPU 负载读数 {cpu_raw}% 超出 0–100%，已按边界值显示")
        if total_memory and to_int(resource.get("free-memory")) > total_memory:
            resource_anomaly.append("内存空闲量大于总量，内存读数异常")
        if total_disk and to_int(resource.get("free-hdd-space")) > total_disk:
            resource_anomaly.append("磁盘空闲量大于总量，磁盘读数异常")
        clock_date = format_routeros_clock(rest["clock"].get("date", ""))
        clock_time = str(rest["clock"].get("time", "")).strip()
        system_time = f"{clock_date} {clock_time}".strip()
        clock_offset_seconds = None
        clock_anomaly = False
        try:
            router_clock = datetime.datetime.strptime(f"{clock_date} {clock_time}", "%Y-%m-%d %H:%M:%S")
            clock_offset_seconds = int((router_clock - datetime.datetime.now()).total_seconds())
            clock_anomaly = abs(clock_offset_seconds) > 900
        except ValueError:
            clock_anomaly = bool(system_time)
        return {
            "identity": rest["identity"].get("name", "RouterOS"),
            "version": resource.get("version", "-"),
            "boardName": resource.get("board-name", "-"),
            "architecture": resource.get("architecture-name", "-"),
            "cpuModel": resource.get("cpu", "-"),
            "cpuCount": to_int(resource.get("cpu-count")),
            "cpuFrequency": to_int(resource.get("cpu-frequency")),
            "uptime": format_routeros_uptime(resource.get("uptime", "-")),
            "systemTime": system_time,
            "ntpStatus": rest["ntp"].get("status", "unknown"),
            "admins": admins,
            "cpuLoad": cpu_load,
            "memoryUsedBytes": used_memory,
            "memoryTotalBytes": total_memory,
            "memoryUsage": memory_usage,
            "diskUsedBytes": used_disk,
            "diskTotalBytes": total_disk,
            "diskUsage": disk_usage,
            "resourceAnomaly": resource_anomaly,
            "clockAnomaly": clock_anomaly,
            "clockOffsetSeconds": clock_offset_seconds,
            "uplinkBps": wan_totals["up"],
            "downlinkBps": wan_totals["down"],
            "wanLatencyMs": latency_ms or None,
            "latencyMs": latency_ms or None,
            "wanLatencyTarget": latency.get("target") or WAN_LATENCY_TARGET,
            "wanLatencyUpdatedAt": latency.get("updatedAt"),
            "wanLatencyOk": bool(latency.get("ok")),
            "wanLatencyError": latency.get("error"),
            "onlineTerminals": terminal_count,
            "connectionTotal": ssh["counts"]["all"],
            "systemLoadLevel": rate_level(max(to_int(resource.get("cpu-load")) / 100, used_memory / total_memory if total_memory else 0)),
            "history": {key: list(values) for key, values in self.history.items()},
        }

    def build_interfaces(self, rest, rates, addresses_by_interface, quality):
        wan_names = infer_wan_interface_names(rest, addresses_by_interface)
        gateway_rows = defaultdict(list)
        for route in rest["routes"]:
            gateway_rows[route.get("gateway")].append(route)
        items = []
        for item in rest["interfaces"]:
            name = item.get("name")
            iface_type = item.get("type", "-")
            parent_hint = interface_parent_hint(item)
            group_key = interface_quality_group_key(item)
            is_derived = interface_is_derived(name, iface_type)
            drop_total = to_int(item.get("rx-drop")) + to_int(item.get("tx-drop"))
            error_total = to_int(item.get("rx-error")) + to_int(item.get("tx-error"))
            packet_total = to_int(item.get("rx-packet")) + to_int(item.get("tx-packet"))
            quality_row = copy.deepcopy(quality.get(name, {}))
            quality_row.setdefault("packetTotal", packet_total)
            quality_row.setdefault("packetDelta", 0)
            quality_row.setdefault("dropTotal", drop_total)
            quality_row.setdefault("errorTotal", error_total)
            quality_row.setdefault("dropDelta", 0)
            quality_row.setdefault("errorDelta", 0)
            quality_row.setdefault("rxDropDelta", 0)
            quality_row.setdefault("txDropDelta", 0)
            quality_row.setdefault("rxErrorDelta", 0)
            quality_row.setdefault("txErrorDelta", 0)
            quality_row.setdefault("lossRate", None)
            quality_row.setdefault("errorRate", None)
            quality_row.setdefault("qualityUpdatedAt", None)
            quality_row.setdefault("qualitySampleCount", 0)
            quality_row.setdefault("qualitySampleReady", False)
            quality_row["isDerivedInterface"] = bool(quality_row.get("isDerivedInterface", is_derived) or is_derived)
            quality_row["isLogicalInterface"] = bool(quality_row.get("isLogicalInterface", is_derived) or is_derived)
            quality_row["qualityDisplayWeight"] = 0.35 if quality_row["isDerivedInterface"] else 1.0
            quality_row["qualityEvidenceLevel"] = "logical" if quality_row["isDerivedInterface"] else "primary"
            quality_row["qualityParent"] = quality_row.get("qualityParent") or parent_hint
            quality_row["logicalPairKey"] = quality_row.get("logicalPairKey") or interface_logical_pair_key(item)
            quality_row["qualityGroupKey"] = quality_row.get("qualityGroupKey") or group_key
            items.append(
                {
                    "name": name,
                    "role": "WAN" if name in wan_names else "LAN",
                    "type": iface_type,
                    "running": to_bool(item.get("running")),
                    "disabled": to_bool(item.get("disabled")),
                    "mac": item.get("mac-address", "-"),
                    "parentInterface": parent_hint,
                    "vlanId": item.get("vlan-id"),
                    "ips": [row.get("address", "-") for row in addresses_by_interface.get(name, [])],
                    "networks": [row.get("network", "-") for row in addresses_by_interface.get(name, [])],
                    "gateways": [row.get("dst-address", "-") for row in gateway_rows.get(name, [])[:4]],
                    "rxBytes": to_int(item.get("rx-byte")),
                    "txBytes": to_int(item.get("tx-byte")),
                    "rxPackets": to_int(item.get("rx-packet")),
                    "txPackets": to_int(item.get("tx-packet")),
                    "rxDrop": to_int(item.get("rx-drop")),
                    "txDrop": to_int(item.get("tx-drop")),
                    "rxError": to_int(item.get("rx-error")),
                    "txError": to_int(item.get("tx-error")),
                    "rxRate": rates.get(name, {}).get("rxBps", 0),
                    "txRate": rates.get(name, {}).get("txBps", 0),
                    **quality_row,
                }
            )
        items.sort(key=lambda row: (row["role"] != "WAN", row.get("isDerivedInterface", False), str(row.get("name") or "")))
        return items

    def build_pppoe(self, rest, rates, addresses_by_interface, update_rate_history=False, rate_history_break=False):
        defaults = [row for row in rest["routes"] if row.get("dst-address") == "0.0.0.0/0"]
        route_by_gateway = defaultdict(list)
        for route in defaults:
            route_by_gateway[route.get("gateway")].append(route)
        rows = []
        total_rate = 0
        for item in rest["pppoe"]:
            name = item.get("name")
            metric = rates.get(name, {"rxBps": 0, "txBps": 0})
            rx_bps = metric.get("rxBps")
            tx_bps = metric.get("txBps")
            rx_bps_numeric = to_int(rx_bps)
            tx_bps_numeric = to_int(tx_bps)
            total_rate += rx_bps_numeric + tx_bps_numeric
            history = self.line_history.setdefault(name, {"up": deque(maxlen=HISTORY_LIMIT), "down": deque(maxlen=HISTORY_LIMIT)})
            if update_rate_history:
                history["up"].append(None if rate_history_break else metric.get("txBps"))
                history["down"].append(None if rate_history_break else metric.get("rxBps"))
            rows.append(
                {
                    "name": name,
                    "status": "在线" if to_bool(item.get("running")) else "离线",
                    "running": to_bool(item.get("running")),
                    "parent": item.get("interface", "-"),
                    "addresses": [row.get("address", "-") for row in addresses_by_interface.get(name, [])],
                    "upRate": tx_bps,
                    "downRate": rx_bps,
                    "rxBytes": to_int(next((iface.get("rx-byte") for iface in rest["interfaces"] if iface.get("name") == name), 0)),
                    "txBytes": to_int(next((iface.get("tx-byte") for iface in rest["interfaces"] if iface.get("name") == name), 0)),
                    "history": {"up": list(history["up"]), "down": list(history["down"])},
                    "routes": [
                        {
                            "active": to_bool(route.get("active")),
                            "distance": route.get("distance", "-"),
                            "table": route.get("routing-table", "-"),
                            "comment": route.get("comment", ""),
                        }
                        for route in route_by_gateway.get(name, [])
                    ],
                }
            )
        distribution = [
            {
                "name": row["name"],
                "share": round(((to_int(row.get("upRate")) + to_int(row.get("downRate"))) / total_rate) * 100, 2) if total_rate else 0,
                "upRate": row["upRate"],
                "downRate": row["downRate"],
                "status": row["status"],
            }
            for row in rows
        ]
        return rows, distribution

    def build_wan_lines(self, rest, pppoe_rows, interfaces, update_rate_history=False, rate_history_break=False):
        # Hybrid deployments: PPPoE lines come first, non-PPPoE WAN interfaces (DHCP /
        # static) must stay visible instead of being hidden whenever PPPoE exists.
        pppoe_names = {
            name
            for name in [str(row.get("name") or "") for row in pppoe_rows] + [str(row.get("parent") or "") for row in pppoe_rows]
            if name and name != "-"
        }
        rows = [
            {
                **copy.deepcopy(row),
                "kind": "pppoe",
                "lineId": row.get("name", "-"),
                "access": "PPPoE",
            }
            for row in pppoe_rows
        ]

        active_defaults = [
            row for row in rest.get("routes", [])
            if row.get("dst-address") == "0.0.0.0/0" and to_bool(row.get("active")) and not to_bool(row.get("disabled"))
        ]
        dhcp_clients_by_interface = {
            item.get("interface"): item
            for item in rest.get("dhcp_clients", [])
            if item.get("interface")
        }
        wan_interfaces = [row for row in interfaces if row.get("role") == "WAN" and str(row.get("name") or "") not in pppoe_names]
        for iface in wan_interfaces:
            name = iface.get("name", "-")
            history = self.line_history.setdefault(name, {"up": deque(maxlen=HISTORY_LIMIT), "down": deque(maxlen=HISTORY_LIMIT)})
            if update_rate_history:
                history["up"].append(None if rate_history_break else to_int(iface.get("txRate")))
                history["down"].append(None if rate_history_break else to_int(iface.get("rxRate")))
            dhcp_client = dhcp_clients_by_interface.get(name, {})
            running = bool(iface.get("running")) and not bool(iface.get("disabled"))
            route_rows = []
            if dhcp_client:
                route_rows.append(
                    {
                        "active": running and to_bool(dhcp_client.get("add-default-route", True)),
                        "distance": dhcp_client.get("default-route-distance", "-"),
                        "table": "main",
                        "comment": "DHCP client default route",
                    }
                )
            elif len(wan_interfaces) == 1:
                route_rows = [
                    {
                        "active": to_bool(route.get("active")),
                        "distance": route.get("distance", "-"),
                        "table": route.get("routing-table", "-"),
                        "comment": route.get("comment", ""),
                    }
                    for route in active_defaults[:4]
                ]
            rows.append(
                {
                    "name": name,
                    "status": "在线" if running else "离线",
                    "running": running,
                    "parent": iface.get("type", "-"),
                    "addresses": list(iface.get("ips") or []),
                    "upRate": to_int(iface.get("txRate")),
                    "downRate": to_int(iface.get("rxRate")),
                    "rxBytes": to_int(iface.get("rxBytes")),
                    "txBytes": to_int(iface.get("txBytes")),
                    "history": {"up": list(history["up"]), "down": list(history["down"])},
                    "routes": route_rows,
                    "kind": "interface",
                    "lineId": name,
                    "access": "DHCP" if dhcp_client else iface.get("type", "-"),
                }
            )
        return rows

    def extract_local_ip(self, conn, local_networks, router_ips):
        candidates = [
            ("src-address", "reply-src-address"),
            ("reply-src-address", "src-address"),
            ("dst-address", "reply-dst-address"),
            ("reply-dst-address", "dst-address"),
        ]
        for local_key, remote_key in candidates:
            # Connection endpoints are "ip:port" strings; parse the address part only.
            address = split_connection_endpoint(conn.get(local_key))
            if not address or address in router_ips:
                continue
            try:
                ip_obj = ipaddress.ip_address(address)
            except Exception:
                continue
            if any(ip_obj in network for network in local_networks):
                return address, conn.get(remote_key, "-"), local_key
        return None, None, None

    def build_terminals_and_connections(self, rest, ssh, local_networks, router_ips):
        leases_by_ip = {row.get("address"): row for row in rest["dhcp_leases"]}
        leases_by_mac = {row.get("mac-address"): row for row in rest["dhcp_leases"] if row.get("mac-address")}
        arp_rows = []
        ip_to_macs = defaultdict(set)
        mac_to_ips = defaultdict(set)
        ip_to_entries = defaultdict(list)
        mac_to_entries = defaultdict(list)
        arp_total_seen = 0
        arp_out_of_scope = 0
        for item in rest["arp"]:
            address = item.get("address")
            mac = item.get("mac-address")
            if not address or not mac or address in router_ips:
                continue
            try:
                ip_obj = ipaddress.ip_address(address)
            except Exception:
                continue
            arp_total_seen += 1
            if not any(ip_obj in network for network in local_networks):
                arp_out_of_scope += 1
                continue
            ip_to_macs[address].add(mac)
            mac_to_ips[mac].add(address)
            arp_entry = {"ip": address, "mac": mac, "status": item.get("status", "-"), "evidenceState": arp_evidence_state(item.get("status"))}
            ip_to_entries[address].append(arp_entry)
            mac_to_entries[mac].append(arp_entry)
            lease = leases_by_ip.get(address) or leases_by_mac.get(mac)
            arp_rows.append(
                {
                    "ip": address,
                    "mac": mac,
                    "hostname": (lease or {}).get("host-name", "-"),
                    "status": item.get("status", "-"),
                    "type": "静态" if not to_bool(item.get("dynamic", True)) else "动态",
                    "lastSeen": (lease or {}).get("last-seen", "-"),
                }
            )
        for row in arp_rows:
            row.setdefault("evidenceState", arp_evidence_state(row.get("status")))
        alerts = []
        for ip_addr, macs in ip_to_macs.items():
            if len(macs) > 1:
                alerts.append({"kind": "IP冲突", "value": ip_addr, "detail": ", ".join(sorted(macs))})
        for mac, ips in mac_to_ips.items():
            if len(ips) > 1:
                alerts.append({"kind": "MAC漂移", "value": mac, "detail": ", ".join(sorted(ips, key=ip_sort_key))})

        refined_alerts = []
        for ip_addr, entries in ip_to_entries.items():
            if len({entry["mac"] for entry in entries}) > 1:
                refined_alerts.append(make_arp_alert("IP conflict", ip_addr, entries, "mac"))
        for mac, entries in mac_to_entries.items():
            if len({entry["ip"] for entry in entries}) > 1:
                refined_alerts.append(make_arp_alert("MAC drift", mac, entries, "ip"))
        if refined_alerts:
            refined_alerts.sort(key=lambda row: (ACTION_SEVERITY_RANK.get(row.get("severity"), 3), row.get("kind", ""), str(row.get("value", ""))))
            alerts = refined_alerts

        terminal_stats = defaultdict(lambda: {"up": 0.0, "down": 0.0, "connections": 0, "sessionBytes": 0})
        active_rows = []
        for conn in ssh["active_connections"]:
            local_ip, remote_ip, local_key = self.extract_local_ip(conn, local_networks, router_ips)
            if not local_ip:
                continue
            if local_key in {"src-address", "dst-address"}:
                up_rate = to_int(conn.get("orig-rate"))
                down_rate = to_int(conn.get("repl-rate"))
            else:
                up_rate = to_int(conn.get("repl-rate"))
                down_rate = to_int(conn.get("orig-rate"))
            terminal_stats[local_ip]["up"] += up_rate
            terminal_stats[local_ip]["down"] += down_rate
            terminal_stats[local_ip]["connections"] += 1
            session_bytes = to_int(conn.get("orig-bytes")) + to_int(conn.get("repl-bytes"))
            terminal_stats[local_ip]["sessionBytes"] += session_bytes
            active_rows.append(
                {
                    "localIp": local_ip,
                    "remoteIp": remote_ip or "-",
                    "protocol": str(conn.get("protocol", "-")).upper(),
                    "upRate": up_rate,
                    "downRate": down_rate,
                    "timeout": conn.get("timeout", "-"),
                    "mark": conn.get("connection-mark", "-"),
                    "totalRate": up_rate + down_rate,
                    "sessionBytes": session_bytes,
                }
            )

        ipv6_neighbor_candidates = {}
        for item in rest.get("ipv6_neighbors", []):
            address = item.get("address")
            if not address or address in router_ips:
                continue
            try:
                ip_obj = ipaddress.ip_address(address)
            except Exception:
                continue
            if ip_obj.version != 6:
                continue
            mac = item.get("mac-address") or ""
            lease = leases_by_mac.get(mac)
            key = mac or address
            is_link_local = ip_obj.is_link_local
            status = item.get("status", "-")
            score = 0
            if not is_link_local:
                score += 10
            if status == "reachable":
                score += 4
            elif status == "stale":
                score += 2
            elif status == "delay":
                score += 1
            if mac:
                score += 1
            candidate = {
                "ip": address,
                "mac": mac or (lease or {}).get("mac-address", "-"),
                "hostname": (lease or {}).get("host-name", "-"),
                "status": status,
                "lastSeen": (lease or {}).get("last-seen", "-"),
                "score": score,
            }
            existing = ipv6_neighbor_candidates.get(key)
            if not existing or candidate["score"] > existing["score"]:
                ipv6_neighbor_candidates[key] = candidate

        arp_by_ip = {row["ip"]: row for row in arp_rows}
        terminals = []
        seen = set()
        for row in arp_rows:
            ip_addr = row["ip"]
            if ip_addr in seen:
                continue
            seen.add(ip_addr)
            stats = terminal_stats[ip_addr]
            terminals.append(
                {
                    "ip": ip_addr,
                    "mac": row["mac"],
                    "hostname": row["hostname"],
                    "status": row["status"],
                    "lastSeen": row["lastSeen"],
                    "upRate": stats["up"],
                    "downRate": stats["down"],
                    "connections": stats["connections"],
                    "sessionBytes": stats["sessionBytes"],
                }
            )
        for ip_addr, stats in terminal_stats.items():
            if ip_addr in seen:
                continue
            seen.add(ip_addr)
            arp_row = arp_by_ip.get(ip_addr, {})
            lease = leases_by_ip.get(ip_addr) or leases_by_mac.get(arp_row.get("mac"))
            terminals.append(
                {
                    "ip": ip_addr,
                    "mac": arp_row.get("mac") or (lease or {}).get("mac-address", "-"),
                    "hostname": arp_row.get("hostname") or (lease or {}).get("host-name", "-"),
                    "status": arp_row.get("status") or "active",
                    "lastSeen": arp_row.get("lastSeen") or (lease or {}).get("last-seen", "-"),
                    "upRate": stats["up"],
                    "downRate": stats["down"],
                    "connections": stats["connections"],
                    "sessionBytes": stats["sessionBytes"],
                }
            )
        for row in ipv6_neighbor_candidates.values():
            ip_addr = row["ip"]
            if ip_addr in seen:
                continue
            seen.add(ip_addr)
            stats = terminal_stats[ip_addr]
            terminals.append(
                {
                    "ip": ip_addr,
                    "mac": row["mac"],
                    "hostname": row["hostname"],
                    "status": row["status"],
                    "lastSeen": row["lastSeen"],
                    "upRate": stats["up"],
                    "downRate": stats["down"],
                    "connections": stats["connections"],
                    "sessionBytes": stats["sessionBytes"],
                }
            )
        terminals.sort(key=lambda row: (row["upRate"] + row["downRate"], row["connections"]), reverse=True)
        active_rows.sort(key=lambda row: row["totalRate"], reverse=True)
        protocol_buckets = {}
        for row in active_rows:
            protocol = str(row.get("protocol") or "-").upper()
            mark = str(row.get("mark") or "").strip()
            mark = "" if mark in {"", "-"} else mark
            bucket_key = f"{protocol}|{mark}"
            if bucket_key not in protocol_buckets:
                protocol_buckets[bucket_key] = {
                    "name": f"{protocol} / {mark}" if mark else f"{protocol} 活跃流量",
                    "protocol": protocol,
                    "mark": mark or "-",
                    "connections": 0,
                    "upRate": 0.0,
                    "downRate": 0.0,
                    "totalRate": 0.0,
                    "sessionBytes": 0,
                    "source": "active-connection-sample",
                }
            bucket = protocol_buckets[bucket_key]
            bucket["connections"] += 1
            bucket["upRate"] += to_int(row.get("upRate"))
            bucket["downRate"] += to_int(row.get("downRate"))
            bucket["totalRate"] += to_int(row.get("totalRate"))
            bucket["sessionBytes"] += to_int(row.get("sessionBytes"))
        protocol_top_rows = sorted(
            protocol_buckets.values(),
            key=lambda row: (row["totalRate"], row["connections"], row["sessionBytes"]),
            reverse=True,
        )[:20]
        arp_items = sorted(arp_rows, key=lambda row: ip_sort_key(row["ip"]))[:120]
        active_connection_items = active_rows[:ACTIVE_CONNECTION_LIMIT]
        return {
            "terminalCount": len(terminals),
            "terminals": terminals,
            "arp": arp_items,
            "arpAlerts": alerts[:20],
            "activeConnections": active_connection_items,
            "meta": {
                "terminals": list_scale_meta(len(terminals), len(terminals), sampled=False, sorted_by="traffic/connections"),
                "lanScope": {
                    "arpTotal": arp_total_seen,
                    "arpOutOfScope": arp_out_of_scope,
                    "scopeDescription": "面板只统计路由器 LAN 网段内的终端；网段外的 ARP 记录不计入",
                },
                "arp": list_scale_meta(len(arp_rows), len(arp_items), limit=120, sampled=len(arp_items) < len(arp_rows), sample_method="first 120 sorted by IP", sorted_by="ip"),
                "activeConnections": list_scale_meta(
                    len(active_rows),
                    len(active_connection_items),
                    limit=ACTIVE_CONNECTION_LIMIT,
                    sampled=True,
                    sample_method="SSH connection detail sample, active rate rows first",
                    sorted_by="totalRate",
                ),
                "protocolTop": list_scale_meta(
                    len(protocol_buckets),
                    len(protocol_top_rows),
                    limit=20,
                    sampled=bool(active_rows),
                    sample_method="active connection detail sample grouped by protocol/connection mark",
                    sorted_by="traffic/connections",
                ),
            },
            "protocolTop": protocol_top_rows,
            "topIpConnections": [
                {
                    "ip": row["ip"],
                    "hostname": row["hostname"],
                    "connections": row["connections"],
                    "upRate": row["upRate"],
                    "downRate": row["downRate"],
                }
                for row in terminals[:20]
            ],
        }

    def build_dhcp(self, rest):
        server_to_pool = {
            item.get("name"): item.get("address-pool")
            for item in rest["dhcp_servers"]
            if item.get("name") and item.get("address-pool")
        }
        used_by_pool = defaultdict(int)
        for item in rest.get("pool_used", []):
            pool_name = item.get("pool")
            if pool_name:
                used_by_pool[pool_name] += 1
        if not used_by_pool:
            for item in rest["dhcp_leases"]:
                if str(item.get("status", "")).lower() != "bound":
                    continue
                pool_name = server_to_pool.get(item.get("server"))
                if pool_name:
                    used_by_pool[pool_name] += 1
        pools = []
        for item in rest["pools"]:
            pool_name = item.get("name", "-")
            total = count_pool_addresses(item.get("ranges"))
            used = used_by_pool.get(pool_name, 0)
            available = max(total - used, 0) if total else 0
            pools.append(
                {
                    "name": pool_name,
                    "ranges": item.get("ranges", "-"),
                    "used": used,
                    "total": total,
                    "available": available,
                    "usage": round((used / total) * 100, 2) if total else 0,
                }
            )
        leases = [
            {
                "address": item.get("address", "-"),
                "hostname": item.get("host-name", "-"),
                "mac": item.get("mac-address", "-"),
                "server": item.get("server", "-"),
                "status": item.get("status", "-"),
                "lastSeen": item.get("last-seen", "-"),
                "static": not to_bool(item.get("dynamic", True)),
            }
            for item in rest["dhcp_leases"]
        ]
        leases.sort(key=lambda row: (row["status"] != "bound", ip_sort_key(row["address"])))
        servers = [
            {
                "name": item.get("name", "-"),
                "interface": item.get("interface", "-"),
                "pool": item.get("address-pool", "-"),
                "leaseTime": item.get("lease-time", "-"),
                "running": not to_bool(item.get("disabled")),
            }
            for item in rest["dhcp_servers"]
        ]
        visible_leases = leases[:120]
        return {
            "pools": pools,
            "leases": visible_leases,
            "servers": servers,
            "meta": {
                "leases": list_scale_meta(
                    len(leases),
                    len(visible_leases),
                    limit=120,
                    sampled=len(visible_leases) < len(leases),
                    sample_method="first 120 sorted by status and IP",
                    sorted_by="status/ip",
                    grouped_by=["status", "server", "static"],
                ),
                "pools": list_scale_meta(len(pools), len(pools), sampled=False),
                "servers": list_scale_meta(len(servers), len(servers), sampled=False),
            },
        }

    def build_dns(self, rest):
        dns = rest["dns"]
        dns_static_meta = rest.get("dns_static_meta", {})
        def split_values(value):
            if isinstance(value, list):
                return [str(item).strip() for item in value if str(item).strip()]
            return [item.strip() for item in str(value or "").split(",") if item.strip()]

        servers = split_values(dns.get("servers", []))
        dns_static_rows = rest["dns_static"] or dns_static_meta.get("preview") or []
        forward_rules = [
            {
                "name": item.get("name") or item.get("regexp", "-"),
                "type": item.get("type", "-"),
                "value": item.get("address") or item.get("cname") or item.get("text") or "-",
                "ttl": item.get("ttl", "-"),
                "comment": item.get("comment", ""),
                "disabled": to_bool(item.get("disabled")),
            }
            for item in dns_static_rows[:DNS_STATIC_PREVIEW_LIMIT]
        ]
        ipv6_nd = []
        for item in rest.get("ipv6_nd", []):
            ipv6_nd.append(
                {
                    "interface": item.get("interface", "-"),
                    "advertiseDns": to_bool(item.get("advertise-dns")),
                    "dnsServers": split_values(item.get("dns-servers") or item.get("dns")),
                    "managed": to_bool(item.get("managed-address-configuration")),
                    "otherConfig": to_bool(item.get("other-configuration")),
                    "raLifetime": item.get("ra-lifetime", "-"),
                }
            )
        ipv6_dhcp_clients = [
            {
                "interface": item.get("interface", "-"),
                "status": item.get("status", "-"),
                "pool": item.get("pool-name", "-"),
                "prefix": item.get("prefix") or item.get("address") or "-",
                "usePeerDns": to_bool(item.get("use-peer-dns")),
                "request": item.get("request", "-"),
                "addDefaultRoute": to_bool(item.get("add-default-route")),
                "defaultRouteDistance": item.get("default-route-distance", "-"),
                "dhcpOptions": item.get("dhcp-options", ""),
            }
            for item in rest.get("ipv6_dhcp_clients", [])
        ]
        ipv6_dhcp_clients.sort(key=lambda row: (row["status"] != "bound", row["interface"]))
        return {
            "running": to_bool(dns.get("allow-remote-requests")),
            "servers": servers,
            "cacheSize": to_int(dns.get("cache-size")),
            "cacheUsed": to_int(dns.get("cache-used")),
            "cacheEntries": 0,
            "forwardRuleCount": dns_static_total_count_from_meta(dns_static_meta, len(dns_static_rows)),
            "visibleRuleCount": len(forward_rules),
            "disabledForwardRuleCount": sum(1 for item in dns_static_rows if to_bool(item.get("disabled"))),
            "forwardRuleSample": to_bool(dns_static_meta.get("sample")),
            "forwardRules": forward_rules,
            "dohServer": dns.get("use-doh-server") or dns.get("doh-server", ""),
            "verifyDohCert": to_bool(dns.get("verify-doh-cert")),
            "ipv6Nd": ipv6_nd,
            "ipv6DhcpClients": ipv6_dhcp_clients,
        }

    def build_security(self, rest):
        filters = [
            {
                "chain": item.get("chain", "-"),
                "action": item.get("action", "-"),
                "comment": item.get("comment", ""),
                "packets": to_int(item.get("packets")),
                "bytes": to_int(item.get("bytes")),
                "disabled": to_bool(item.get("disabled")),
            }
            for item in rest["filters"]
        ]
        filters.sort(key=lambda row: (row["packets"], row["bytes"]), reverse=True)
        address_lists = []
        for item in rest["address_lists"][:100]:
            list_name = item.get("list", "-")
            category = "黑名单" if "black" in list_name.lower() else "白名单" if "white" in list_name.lower() else "地址集"
            address_lists.append(
                {
                    "list": list_name,
                    "address": item.get("address", "-"),
                    "timeout": item.get("timeout", "-"),
                    "comment": item.get("comment", ""),
                    "category": category,
                }
            )
        alerts = []
        for item in rest["logs"]:
            topics = str(item.get("topics", ""))
            message = str(item.get("message", ""))
            if any(word in topics for word in ["firewall", "warning", "error", "critical"]) or "drop" in message.lower():
                alerts.append({"time": item.get("time", "-"), "topics": topics, "message": message})
        return {
            "filters": filters[:80],
            "filterTotal": len(filters),
            "addressLists": address_lists,
            "addressListTotal": len(rest["address_lists"]),
            "alerts": alerts[:40],
        }

    def build_load_balance(self, rest, distribution):
        defaults = [item for item in rest["routes"] if item.get("dst-address") == "0.0.0.0/0"]
        active_defaults = [item for item in defaults if to_bool(item.get("active"))]
        pcc_detected = False
        mangle_rules = []
        for item in rest["mangle"]:
            comment = str(item.get("comment", ""))
            if item.get("per-connection-classifier") or "pcc" in comment.lower():
                pcc_detected = True
            if item.get("action") in {"mark-routing", "mark-connection", "accept"}:
                mangle_rules.append(
                    {
                        "chain": item.get("chain", "-"),
                        "action": item.get("action", "-"),
                        "comment": comment,
                        "newRoutingMark": item.get("new-routing-mark", "-"),
                        "packets": to_int(item.get("packets")),
                        "bytes": to_int(item.get("bytes")),
                    }
                )
        if len(active_defaults) > 1 and pcc_detected:
            mode = "多线分流 / 策略路由"
        elif len(active_defaults) > 1:
            mode = "多线路容灾 / 优先级切换"
        else:
            mode = "单线路"
        return {
            "mode": mode,
            "activeLines": len(active_defaults),
            "mangleTotal": len(mangle_rules),
            "routingRuleTotal": len(rest["routing_rules"]),
            "distribution": distribution,
            "defaultRoutes": [
                {
                    "gateway": item.get("gateway", "-"),
                    "distance": item.get("distance", "-"),
                    "table": item.get("routing-table", "-"),
                    "active": to_bool(item.get("active")),
                    "comment": item.get("comment", ""),
                }
                for item in defaults
            ],
            "mangleRules": sorted(mangle_rules, key=lambda row: (row["packets"], row["bytes"]), reverse=True)[:80],
            "routingRules": [
                {
                    "action": item.get("action", "-"),
                    "table": item.get("table", "-"),
                    "srcAddress": item.get("src-address", "-"),
                    "dstAddress": item.get("dst-address", "-"),
                    "comment": item.get("comment", ""),
                    "disabled": to_bool(item.get("disabled")),
                    "inactive": to_bool(item.get("inactive")),
                }
                for item in rest["routing_rules"][:80]
            ],
            "pccDetected": pcc_detected,
        }

    def build_routes(self, rest):
        rows = []
        for item in rest["routes"]:
            dst_address = item.get("dst-address", "-")
            is_default = dst_address in {"0.0.0.0/0", "::/0"}
            is_static = to_bool(item.get("static"))
            is_dynamic = to_bool(item.get("dynamic"))
            is_disabled = to_bool(item.get("disabled"))
            is_active = to_bool(item.get("active"))
            rows.append(
                {
                    "dstAddress": dst_address,
                    "gateway": item.get("gateway", "-"),
                    "distance": item.get("distance", "-"),
                    "table": item.get("routing-table", "-"),
                    "active": is_active,
                    "disabled": is_disabled,
                    "static": is_static,
                    "dynamic": is_dynamic,
                    "default": is_default,
                    "comment": item.get("comment", ""),
                    "family": "IPv6" if ":" in str(dst_address) else "IPv4",
                }
            )

        rows.sort(
            key=lambda row: (
                not row["default"],
                not row["static"],
                row["disabled"],
                not row["active"],
                row["table"],
                row["distance"],
                row["dstAddress"],
            )
        )
        static_rows = [row for row in rows if row["static"]]
        default_rows = [row for row in rows if row["default"]]
        tables = {row["table"] for row in rows if row["table"] not in {"", "-"}}
        return {
            "tableCount": len(tables),
            "staticCount": len(static_rows),
            "activeStaticCount": len([row for row in static_rows if row["active"] and not row["disabled"]]),
            "defaultCount": len(default_rows),
            "dynamicCount": len([row for row in rows if row["dynamic"]]),
            "items": rows[:160],
            "defaultRoutes": default_rows[:80],
            "staticRoutes": static_rows[:120],
        }

    def build_logs(self, rest):
        # RouterOS returns logs oldest-first; sample the newest window so recent
        # events stay visible on routers with large log buffers.
        groups = {"system": [], "firewall": [], "dhcp": [], "dns": [], "all": []}
        for item in rest["logs"][-200:]:
            row = {"time": item.get("time", "-"), "topics": item.get("topics", "-"), "message": item.get("message", "-")}
            groups["all"].append(row)
            topics = str(item.get("topics", ""))
            if "firewall" in topics:
                groups["firewall"].append(row)
            elif "dhcp" in topics:
                groups["dhcp"].append(row)
            elif "dns" in topics:
                groups["dns"].append(row)
            else:
                groups["system"].append(row)
        return {key: value[-60:] for key, value in groups.items()}

    def build_snapshot(self, rest, ssh, fresh_counter_sample=False):
        connection_counts = copy.deepcopy(ssh.get("counts", {}))
        counted_total = to_int(connection_counts.get("tcp")) + to_int(connection_counts.get("udp")) + to_int(connection_counts.get("icmp"))
        connection_counts["all"] = max(to_int(connection_counts.get("all")), counted_total)
        ssh = {**ssh, "counts": connection_counts}
        has_counter_sample = bool(
            fresh_counter_sample
            and any(
                item.get("name") and ("rx-byte" in item or "tx-byte" in item)
                for item in rest.get("interfaces", [])
            )
        )
        rates = self.compute_rates(rest["interfaces"], fresh_counter_sample=has_counter_sample)
        quality = self.compute_interface_quality(rest["interfaces"], fresh_counter_sample=has_counter_sample)
        with self.lock:
            rate_sample_ready = bool(self.last_rate_sample_ready)
            counter_reset = bool(self.last_counter_reset)
        update_rate_history = bool(has_counter_sample and (rate_sample_ready or counter_reset))
        rate_history_break = bool(has_counter_sample and counter_reset)
        addresses_by_interface, local_networks, router_ips = self.build_maps(rest)
        pppoe, distribution = self.build_pppoe(
            rest,
            rates,
            addresses_by_interface,
            update_rate_history=update_rate_history,
            rate_history_break=rate_history_break,
        )
        interfaces = self.build_interfaces(rest, rates, addresses_by_interface, quality)
        wan_lines = self.build_wan_lines(
            rest,
            pppoe,
            interfaces,
            update_rate_history=update_rate_history,
            rate_history_break=rate_history_break,
        )
        wan_latency = self.get_wan_latency()
        pppoe = self.attach_wan_latency(pppoe, wan_latency)
        wan_lines = self.attach_wan_latency(wan_lines, wan_latency)
        if not distribution and wan_lines:
            distribution = build_distribution_from_lines(wan_lines)
        wan_source = [row for row in wan_lines if row.get("running")] or list(wan_lines)
        wan_totals = {
            "up": sum(to_int(row.get("upRate")) for row in wan_source),
            "down": sum(to_int(row.get("downRate")) for row in wan_source),
        }
        terminals = self.build_terminals_and_connections(rest, ssh, local_networks, router_ips)
        dhcp = self.build_dhcp(rest)
        ipv6_interface_count = sum(
            1 for row in interfaces if any(":" in str(ip_addr) for ip_addr in row.get("ips", []))
        )
        ipv6_terminal_count = sum(
            1 for row in terminals["terminals"] if ":" in str(row.get("ip", ""))
        )
        capabilities = build_panel_capabilities(wan_lines, len(pppoe))
        wan_line_count = len(wan_lines)
        active_connection_shown = len(terminals.get("activeConnections", []))
        mangle_candidate_total = sum(
            1 for item in rest.get("mangle", []) if item.get("action") in {"mark-routing", "mark-connection", "accept"}
        )
        scale_meta = {
            "wan": list_scale_meta(wan_line_count, len(wan_lines), sampled=False, sorted_by="natural interface name", grouped_by=["status", "parent", "routeTable"]),
            "pppoe": list_scale_meta(len(pppoe), len(pppoe), sampled=False, sorted_by="natural interface name"),
            "interfaces": list_scale_meta(len(interfaces), len(interfaces), sampled=False, sorted_by="role/name/quality", grouped_by=["role", "type", "status", "qualityEvidenceLevel"]),
            "terminals": terminals.get("meta", {}).get("terminals", list_scale_meta(terminals["terminalCount"], len(terminals["terminals"]))),
            "arp": terminals.get("meta", {}).get("arp", list_scale_meta(len(terminals["arp"]), len(terminals["arp"]))),
            "dhcpLeases": dhcp.get("meta", {}).get("leases", list_scale_meta(len(dhcp.get("leases", [])), len(dhcp.get("leases", [])))),
            "connectionsActive": {
                **terminals.get("meta", {}).get("activeConnections", list_scale_meta(active_connection_shown, active_connection_shown, sampled=True)),
                "actualCount": ssh["counts"]["all"],
                "totalCount": ssh["counts"]["all"],
                "hasMore": active_connection_shown < ssh["counts"]["all"],
            },
            "dnsStatic": list_scale_meta(
                dns_static_total_count_from_meta(rest.get("dns_static_meta", {}), DNS_STATIC_PREVIEW_LIMIT),
                len(rest.get("dns_static", [])),
                limit=DNS_STATIC_PREVIEW_LIMIT,
                sampled=True,
                sample_method="preview rows; full browser uses /api/dns-static pagination",
                sorted_by="RouterOS order",
            ),
            "routes": list_scale_meta(
                len(rest.get("routes", [])),
                min(len(rest.get("routes", [])), 160),
                limit=160,
                sampled=len(rest.get("routes", [])) > 160,
                sample_method="first 160 after default/static/active sort",
                sorted_by="default/static/active/table/distance",
            ),
            "securityFilters": list_scale_meta(
                len(rest.get("filters", [])),
                min(len(rest.get("filters", [])), 80),
                limit=80,
                sampled=len(rest.get("filters", [])) > 80,
                sample_method="top 80 by packets/bytes",
                sorted_by="packets/bytes",
            ),
            "addressLists": list_scale_meta(
                len(rest.get("address_lists", [])),
                min(len(rest.get("address_lists", [])), 100),
                limit=100,
                sampled=len(rest.get("address_lists", [])) > 100,
                sample_method="first 100 in RouterOS order",
                sorted_by="RouterOS order",
            ),
            "mangleRules": list_scale_meta(
                mangle_candidate_total,
                min(mangle_candidate_total, 80),
                limit=80,
                sampled=mangle_candidate_total > 80,
                sample_method="top 80 by packets/bytes",
                sorted_by="packets/bytes",
            ),
            "routingRules": list_scale_meta(
                len(rest.get("routing_rules", [])),
                min(len(rest.get("routing_rules", [])), 80),
                limit=80,
                sampled=len(rest.get("routing_rules", [])) > 80,
                sample_method="first 80 in RouterOS order",
                sorted_by="RouterOS order",
            ),
        }
        resource = rest["resource"]
        total_memory = to_int(resource.get("total-memory"))
        used_memory = max(total_memory - to_int(resource.get("free-memory")), 0)
        total_disk = to_int(resource.get("total-hdd-space"))
        used_disk = max(total_disk - to_int(resource.get("free-hdd-space")), 0)
        self.history["cpu"].append(to_int(resource.get("cpu-load")))
        self.history["memory"].append(round((used_memory / total_memory) * 100, 2) if total_memory else 0)
        self.history["disk"].append(round((used_disk / total_disk) * 100, 2) if total_disk else 0)
        self.history["timestamps"].append(int(time.time()))
        if update_rate_history:
            rate_up = None if rate_history_break else wan_totals["up"]
            rate_down = None if rate_history_break else wan_totals["down"]
            self.history["uplink"].append(rate_up)
            self.history["downlink"].append(rate_down)
        with self.lock:
            rate_history_updated_at = self.last_counter_sample_at
            rate_history_sample_count = self.rate_history_sample_count
            quality_updated_at = self.last_quality_sample_at
            quality_sample_count = self.interface_quality_sample_count
        snapshot = {
            "status": "ok",
            "updatedAt": format_iso_now(),
            "error": None,
            "meta": {
                "target": PANEL_TARGET,
                "routerHost": public_router_config()["host"],
                "routerLogin": public_router_config(),
                "pollSeconds": POLL_SECONDS,
                "realtimeUpdatedAt": self.realtime_updated_at,
                "realtimeError": self.realtime_error,
                "realtimeLastErrorAt": self.realtime_last_error_at,
                "realtimeDurationSeconds": self.realtime_duration_seconds,
                "staticPollSeconds": STATIC_POLL_SECONDS,
                "staticRestWorkers": STATIC_REST_WORKERS,
                "slowRestPollSeconds": SLOW_REST_POLL_SECONDS,
                "slowRestWorkers": SLOW_REST_WORKERS,
                "slowRestUpdatedAt": self.slow_updated_at,
                "slowRestError": self.slow_error,
                "slowRestLastErrorAt": self.slow_last_error_at,
                "slowRestDurationSeconds": self.slow_duration_seconds,
                "connectionDetailPollSeconds": CONNECTION_DETAIL_POLL_SECONDS,
                "detailRestWorkers": DETAIL_REST_WORKERS,
                "connectionProtocolPollSeconds": CONNECTION_PROTOCOL_BREAKDOWN_INTERVAL_SECONDS,
                "staticUpdatedAt": self.static_updated_at,
                "staticError": self.static_error,
                "staticLastErrorAt": self.static_last_error_at,
                "staticDurationSeconds": self.static_duration_seconds,
                "staticEndpointFailures": copy.deepcopy(self.static_failures),
                "realtimeEndpointFailures": copy.deepcopy(self.realtime_failures),
                "slowRestEndpointFailures": copy.deepcopy(self.slow_failures),
                "detailEndpointFailures": copy.deepcopy(self.detail_failures),
                "connectionProtocolUpdatedAt": ssh.get("protocolUpdatedAt"),
                "connectionDetailUpdatedAt": ssh.get("detailUpdatedAt"),
                "connectionProtocolError": ssh.get("protocolError"),
                "connectionProtocolLastErrorAt": ssh.get("protocolLastErrorAt"),
                "connectionProtocolDurationSeconds": ssh.get("protocolDurationSeconds"),
                "connectionDetailError": ssh.get("detailError"),
                "connectionDetailLastErrorAt": ssh.get("detailLastErrorAt"),
                "connectionDetailDurationSeconds": ssh.get("detailDurationSeconds"),
                "ipv6AddressCount": len(rest.get("ipv6_addresses", [])),
                "ipv6NeighborCount": len(rest.get("ipv6_neighbors", [])),
                "ipv6InterfaceCount": ipv6_interface_count,
                "ipv6TerminalCount": ipv6_terminal_count,
                "profile": PANEL_PROFILE,
                "capabilities": capabilities,
                "pppoeCount": len(pppoe),
                "wanCount": wan_line_count,
                "lineCount": wan_line_count,
                "lineLayoutTier": line_layout_tier(wan_line_count),
                "wanLatency": copy.deepcopy(wan_latency),
                "freshCounterSample": bool(has_counter_sample),
                "rateSampleReady": bool(rate_sample_ready),
                "counterReset": bool(counter_reset),
                "rateHistoryBreak": bool(rate_history_break),
                "rateHistoryUpdatedAt": rate_history_updated_at,
                "rateHistorySampleCount": rate_history_sample_count,
                "qualityUpdatedAt": quality_updated_at,
                "qualitySampleCount": quality_sample_count,
                "scale": scale_meta,
            },
            "overview": self.build_overview(rest, ssh, terminals["terminalCount"], wan_totals, wan_latency),
            "interfaces": interfaces,
            "pppoe": pppoe,
            "wan": wan_lines,
            "terminals": terminals["terminals"],
            "terminalsLanScope": terminals.get("meta", {}).get("lanScope", {}),
            "arp": {"items": terminals["arp"], "alerts": terminals["arpAlerts"]},
            "dhcp": dhcp,
            "connections": {
                "total": ssh["counts"]["all"],
                "tcp": ssh["counts"]["tcp"],
                "udp": ssh["counts"]["udp"],
                "icmp": ssh["counts"]["icmp"],
                "protocolTop": terminals["protocolTop"],
                "topIps": terminals["topIpConnections"],
                "active": terminals["activeConnections"],
                "thresholdLevel": rate_level(min(ssh["counts"]["all"] / 120000, 1)),
                "protocolUpdatedAt": ssh.get("protocolUpdatedAt"),
                "detailUpdatedAt": ssh.get("detailUpdatedAt"),
                "protocolError": ssh.get("protocolError"),
                "protocolLastErrorAt": ssh.get("protocolLastErrorAt"),
                "protocolDurationSeconds": ssh.get("protocolDurationSeconds"),
                "detailError": ssh.get("detailError"),
                "detailLastErrorAt": ssh.get("detailLastErrorAt"),
                "detailDurationSeconds": ssh.get("detailDurationSeconds"),
                "meta": {
                    "active": scale_meta["connectionsActive"],
                    "topIps": list_scale_meta(len(terminals["topIpConnections"]), len(terminals["topIpConnections"]), sampled=True, sample_method="terminal traffic top list", sorted_by="connections/traffic"),
                    "protocolTop": terminals.get("meta", {}).get("protocolTop", list_scale_meta(0, 0, sampled=True, sample_method="active connection detail sample", sorted_by="traffic/connections")),
                },
            },
            "dns": self.build_dns(rest),
            "security": self.build_security(rest),
            "loadBalance": self.build_load_balance(rest, distribution),
            "routes": self.build_routes(rest),
            "logs": self.build_logs(rest),
        }
        snapshot = normalize_collector_snapshot_status(snapshot)
        snapshot = self.apply_ip_aliases_to_snapshot(snapshot, dict(self.ip_aliases))
        triage = build_semantic_triage(snapshot)
        snapshot["semanticTriage"] = triage
        snapshot["actionQueue"] = triage["queue"]
        return snapshot

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
            started_at = time.time()
            try:
                realtime_rest = self.fetch_rest_bundle(REALTIME_REST_ENDPOINTS)
                duration = round(time.time() - started_at, 2)
                now = format_iso_now()
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
                    self.realtime_last_error_at = format_iso_now()
                    self.realtime_duration_seconds = round(time.time() - started_at, 2)
                    self.state = {**copy.deepcopy(self.state), "status": "error", "updatedAt": format_iso_now(), "error": str(exc)}
            elapsed = time.time() - started_at
            time.sleep(max(0, POLL_SECONDS - elapsed))

    def slow_rest_loop(self):
        while True:
            if not self.require_router_config_for_collection():
                time.sleep(1)
                continue
            started_at = time.time()
            try:
                slow_rest = self.fetch_rest_bundle(SLOW_REST_ENDPOINTS, workers=SLOW_REST_WORKERS)
                duration = round(time.time() - started_at, 2)
                now = format_iso_now()
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
                    self.slow_last_error_at = format_iso_now()
                    self.slow_duration_seconds = round(time.time() - started_at, 2)
                self.update_state()
            elapsed = time.time() - started_at
            time.sleep(max(0, SLOW_REST_POLL_SECONDS - elapsed))

    def connection_protocol_loop(self):
        while True:
            if not self.require_router_config_for_collection():
                time.sleep(1)
                continue
            started_at = time.time()
            try:
                tracking = self.fetch_connection_tracking_summary()
                duration = round(time.time() - started_at, 2)
                now = format_iso_now()
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
                duration = round(time.time() - started_at, 2)
                with self.lock:
                    self.connection_summary["protocolError"] = str(exc)
                    self.connection_summary["protocolLastErrorAt"] = format_iso_now()
                    self.connection_summary["protocolDurationSeconds"] = duration
                self.update_state()
            elapsed = time.time() - started_at
            time.sleep(max(0, CONNECTION_PROTOCOL_POLL_SECONDS - elapsed))

    def static_loop(self):
        while True:
            if not self.require_router_config_for_collection():
                time.sleep(1)
                continue
            started_at = time.time()
            try:
                dns_static_count = 0
                static_rest = self.fetch_rest_bundle(STATIC_REST_ENDPOINTS, workers=STATIC_REST_WORKERS)
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
                    self.static_duration_seconds = round(time.time() - started_at, 2)
                    self.static_updated_at = format_iso_now()
                self.update_state()
            except Exception as exc:
                with self.lock:
                    self.static_error = str(exc)
                    self.static_last_error_at = format_iso_now()
                    self.static_duration_seconds = round(time.time() - started_at, 2)
                self.update_state()
            elapsed = time.time() - started_at
            time.sleep(max(0, STATIC_POLL_SECONDS - elapsed))

    def connection_detail_loop(self):
        while True:
            if not self.require_router_config_for_collection():
                time.sleep(1)
                continue
            started_at = time.time()
            try:
                with ThreadPoolExecutor(max_workers=2) as executor:
                    detail_future = executor.submit(self.fetch_connection_detail)
                    detail_rest_future = executor.submit(
                        self.fetch_rest_bundle,
                        DETAIL_REST_ENDPOINTS,
                        DETAIL_REST_WORKERS,
                    )
                    detail = detail_future.result()
                    detail_rest = detail_rest_future.result()
                detail_failures = detail_rest.pop("_failures", {})
                duration = round(time.time() - started_at, 2)
                now = format_iso_now()
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
                duration = round(time.time() - started_at, 2)
                with self.lock:
                    self.connection_detail["detailError"] = str(exc)
                    self.connection_detail["detailLastErrorAt"] = format_iso_now()
                    self.connection_detail["detailDurationSeconds"] = duration
                self.update_state()
            elapsed = time.time() - started_at
            time.sleep(connection_detail_sleep_seconds(elapsed))

    def start(self):
        for target in (self.slow_rest_loop, self.static_loop, self.connection_detail_loop, self.realtime_loop, self.connection_protocol_loop):
            thread = threading.Thread(target=target, daemon=True)
            thread.start()

    def get_state(self):
        with self.lock:
            snapshot = copy.deepcopy(self.state)
        snapshot = normalize_collector_snapshot_status(snapshot)
        meta = snapshot.setdefault("meta", {})
        meta.setdefault("profile", PANEL_PROFILE)
        meta.setdefault("capabilities", build_panel_capabilities(snapshot.get("wan") or [], len(snapshot.get("pppoe") or [])))
        triage = snapshot.get("semanticTriage") or build_semantic_triage(snapshot)
        snapshot["semanticTriage"] = triage
        snapshot["actionQueue"] = snapshot.get("actionQueue") or triage.get("queue", [])
        return snapshot

    def get_semantic_triage(self):
        return build_semantic_triage(self.get_state())

    def build_readonly_diagnostics(self):
        def dns_job(server_config, domain_config, qtype):
            if server_config.get("address") == "system":
                row = system_dns_query(domain_config["domain"], qtype)
            else:
                row = dns_query(server_config["address"], domain_config["domain"], qtype)
            row["service"] = domain_config["name"]
            row["expected"] = domain_config["expected"]
            row["serverName"] = server_config["name"]
            return row

        def dns_timeout_row(server_config, domain_config, qtype):
            return {
                "server": server_config["address"],
                "domain": domain_config["domain"],
                "type": "AAAA" if qtype == 28 else "A",
                "answers": [],
                "fakeIp": False,
                "rcode": None,
                "elapsedMs": round(READONLY_DIAGNOSTIC_TOTAL_TIMEOUT * 1000),
                "error": "readonly probe timeout",
                "service": domain_config["name"],
                "expected": domain_config["expected"],
                "serverName": server_config["name"],
            }

        def service_timeout_row(target):
            return {
                "name": target.get("name", "-"),
                "url": target.get("url", "-"),
                "expected": target.get("expected", "-"),
                "status": None,
                "ok": False,
                "elapsedMs": round(READONLY_DIAGNOSTIC_TOTAL_TIMEOUT * 1000),
                "finalHost": None,
                "error": "readonly probe timeout",
            }

        def exit_timeout_row(target):
            return {
                "name": target.get("name", "-"),
                "url": target.get("url", "-"),
                "ip": None,
                "raw": "",
                "elapsedMs": round(READONLY_DIAGNOSTIC_TOTAL_TIMEOUT * 1000),
                "error": "readonly probe timeout",
            }

        dns_matrix = []
        service_reachability = []
        tcp_reachability = []
        exit_checks = []
        executor = ThreadPoolExecutor(max_workers=max(1, READONLY_DIAGNOSTIC_WORKERS))
        futures = {}
        try:
            dns_servers = [
                *copy.deepcopy(READONLY_DNS_SERVERS),
                {"name": "Panel System DNS", "address": "system"},
            ]
            for domain_config in READONLY_DNS_DOMAINS:
                for server_config in dns_servers:
                    for qtype in (1, 28):
                        futures[executor.submit(dns_job, server_config, domain_config, qtype)] = (
                            "dns",
                            server_config,
                            domain_config,
                            qtype,
                        )
            for target in READONLY_HTTP_TARGETS:
                futures[executor.submit(http_probe, target)] = ("service", target)
            for target in READONLY_HTTP_TARGETS:
                futures[executor.submit(tcp_probe, target)] = ("tcp", target)
            for target in READONLY_EXIT_TARGETS:
                futures[executor.submit(exit_probe, target)] = ("exit", target)

            done, pending = wait(futures.keys(), timeout=READONLY_DIAGNOSTIC_TOTAL_TIMEOUT)
            for future in done:
                meta = futures[future]
                try:
                    result = future.result()
                except Exception as exc:
                    if meta[0] == "dns":
                        result = dns_timeout_row(meta[1], meta[2], meta[3])
                    elif meta[0] == "service":
                        result = service_timeout_row(meta[1])
                    elif meta[0] == "exit":
                        result = exit_timeout_row(meta[1])
                    else:
                        result = service_timeout_row(meta[1])
                    result["error"] = str(exc)
                if meta[0] == "dns":
                    dns_matrix.append(result)
                elif meta[0] == "service":
                    service_reachability.append(result)
                elif meta[0] == "tcp":
                    tcp_reachability.append(result)
                else:
                    exit_checks.append(result)

            for future in pending:
                meta = futures[future]
                future.cancel()
                if meta[0] == "dns":
                    dns_matrix.append(dns_timeout_row(meta[1], meta[2], meta[3]))
                elif meta[0] == "service":
                    service_reachability.append(service_timeout_row(meta[1]))
                elif meta[0] == "tcp":
                    tcp_reachability.append(service_timeout_row(meta[1]))
                else:
                    exit_checks.append(exit_timeout_row(meta[1]))
        finally:
            executor.shutdown(wait=False, cancel_futures=True)
        dns_matrix.sort(key=lambda row: (row.get("service", ""), row.get("serverName", ""), row.get("type", "")))
        service_reachability.sort(key=lambda row: row.get("name", ""))
        tcp_reachability.sort(key=lambda row: row.get("name", ""))
        exit_checks.sort(key=lambda row: row.get("name", ""))
        # 默认 index 已是 React 壳；只读诊断的面板文件清单改为真实存在的文件。
        # 不再列出的 layout-whitespace-patch.js / readonly-diagnostics.js 早已折叠进
        # panel-head.js 并随 React 迁移退役。framework 产物用未 hash 的稳定文件名
        # （构建时与 hash 版本同内容输出），避免 hash 变化导致清单常驻 exists=False。
        panel_files = [
            file_mtime_summary(BASE_DIR / "app.py"),
            file_mtime_summary(PUBLIC_DIR / "index.html"),
            file_mtime_summary(PUBLIC_DIR / "index.legacy.html"),
            file_mtime_summary(PUBLIC_DIR / "assets" / "framework" / "panel-surface-loader.js"),
            file_mtime_summary(PUBLIC_DIR / "assets" / "framework" / "panel-desktop.js"),
            file_mtime_summary(PUBLIC_DIR / "assets" / "framework" / "desktop.css"),
        ]
        nikki = nikki_probe()

        return {
            "status": "ok",
            "readOnly": True,
            "generatedAt": format_iso_now(),
            "cacheTtlSeconds": READONLY_DIAGNOSTIC_CACHE_TTL,
            "probeBudgetSeconds": READONLY_DIAGNOSTIC_TOTAL_TIMEOUT,
            "dnsServers": [*copy.deepcopy(READONLY_DNS_SERVERS), {"name": "Panel System DNS", "address": "system"}],
            "dnsDomains": copy.deepcopy(READONLY_DNS_DOMAINS),
            "dnsMatrix": dns_matrix,
            "serviceReachability": service_reachability,
            "tcpReachability": tcp_reachability,
            "exitChecks": exit_checks,
            "panelFiles": panel_files,
            "nikki": nikki,
        }

    def get_readonly_diagnostics(self, force_refresh=False):
        if not READONLY_DIAGNOSTICS_ENABLED:
            return {
                "status": "disabled",
                "readOnly": True,
                "hidden": True,
                "profile": PANEL_PROFILE,
                "generatedAt": format_iso_now(),
                "cached": False,
                "cacheAgeSeconds": 0,
                "reason": "readonly diagnostics disabled for current panel profile",
                "dnsMatrix": [],
                "serviceReachability": [],
                "tcpReachability": [],
                "exitChecks": [],
                "panelFiles": [],
                "nikki": {"ok": False, "disabled": True, "providers": []},
            }
        now = time.time()
        with self.lock:
            cached_payload = copy.deepcopy(self.readonly_diagnostics_cache.get("payload"))
            fetched_at = float(self.readonly_diagnostics_cache.get("fetched_at") or 0.0)
        if (
            not force_refresh
            and cached_payload
            and (now - fetched_at) < READONLY_DIAGNOSTIC_CACHE_TTL
        ):
            cached_payload["cached"] = True
            cached_payload["cacheAgeSeconds"] = round(now - fetched_at, 1)
            return cached_payload

        try:
            payload = self.build_readonly_diagnostics()
        except Exception as exc:
            payload = {
                "status": "error",
                "readOnly": True,
                "generatedAt": format_iso_now(),
                "error": str(exc),
                "dnsMatrix": [],
                "serviceReachability": [],
                "tcpReachability": [],
                "exitChecks": [],
                "panelFiles": [],
                "nikki": {"ok": False, "error": str(exc), "providers": []},
            }
        with self.lock:
            self.readonly_diagnostics_cache = {"fetched_at": time.time(), "payload": copy.deepcopy(payload)}
        payload["cached"] = False
        payload["cacheAgeSeconds"] = 0
        return payload
