"""Batch 7: move Collector (+ collector-only constants/helpers) out of app.py.

Mechanical line-range extraction so moved text is byte-identical to app.py.
Run from repo root:  python _scale/fixcheck/batch7_split.py
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
app_path = ROOT / "app.py"
lines = app_path.read_text(encoding="utf-8").splitlines(keepends=True)


def block(a, b):
    """1-based inclusive line range."""
    return "".join(lines[a - 1 : b])


# --- sanity: assert boundary lines are what we expect -----------------------
expect = {
    198: ")\n",
    201: "def is_frozen_app():\n",
    247: "    return True\n",
    250: "class ReusableThreadingHTTPServer(ThreadingHTTPServer):\n",
    252: "    request_queue_size = 128\n",
    255: "def load_panel_env():\n",
    261: "def detect_panel_lan_ip():\n",
    283: '    return "127.0.0.1"\n',
    286: "PANEL_ENV_FILE = load_panel_env()\n",
    292: "PANEL_BIND, PANEL_TARGET = validate_panel_public_contract(PANEL_BIND, PANEL_TARGET, PANEL_PROFILE_RAW)\n",
    293: 'POLL_SECONDS = max(1, int(os.getenv("ROS_MONITOR_POLL_SECONDS", "1")))\n',
    332: 'DNS_STATIC_PREVIEW_LIMIT = int(os.getenv("ROS_MONITOR_DNS_STATIC_PREVIEW_LIMIT", "12"))\n',
    333: 'DNS_STATIC_PAGE_LIMIT = int(os.getenv("ROS_MONITOR_DNS_STATIC_PAGE_LIMIT", "100"))\n',
    334: 'DNS_STATIC_MAX_PAGE_LIMIT = int(os.getenv("ROS_MONITOR_DNS_STATIC_MAX_PAGE_LIMIT", "300"))\n',
    340: 'WAN_LATENCY_TIMEOUT_MS = max(200, int(os.getenv("ROS_PANEL_WAN_LATENCY_TIMEOUT_MS", "1200")))\n',
    343: "def env_bool(name, default=False):\n",
    355: 'PANEL_OPEN_BROWSER = env_bool("ROS_PANEL_OPEN_BROWSER", default=is_frozen_app())\n',
    358: "def connection_detail_sleep_seconds(elapsed):\n",
    366: "def tcp_latency_target(target=WAN_LATENCY_TARGET, timeout_ms=WAN_LATENCY_TIMEOUT_MS):\n",
    395: "def ping_latency_target(target=WAN_LATENCY_TARGET, timeout_ms=WAN_LATENCY_TIMEOUT_MS):\n",
    446: "def dns_static_total_count_from_meta(dns_static_meta, fallback=DNS_STATIC_PREVIEW_LIMIT):\n",
    454: "def normalize_panel_profile(value):\n",
    495: 'EXPOSE_ADMIN_SESSIONS = env_bool("ROS_PANEL_EXPOSE_ADMIN_SESSIONS", default=not PUBLIC_ROUTEROS_PROFILE)\n',
    497: "# panel_access 的守卫/会话函数在调用时按 panel_access 模块全局读取这些 app 引导值\n",
    505: "panel_access.PUBLIC_ROUTEROS_PROFILE = PUBLIC_ROUTEROS_PROFILE\n",
    508: "def build_panel_capabilities(wan_lines, pppoe_count):\n",
    523: "    }\n",
    526: "class Collector:\n",
    3090: "        return payload\n",
    3093: "restore_last_saved_router_login()\n",
    3094: "collector = Collector()\n",
    3097: "class Handler(BaseHTTPRequestHandler):\n",
}
for ln, text in expect.items():
    actual = lines[ln - 1]
    assert actual == text, f"line {ln} mismatch:\n  expect: {text!r}\n  actual: {actual!r}"
print("boundary checks OK")


def join_blocks(blocks):
    out = []
    for text in blocks:
        out.append(text.rstrip("\n"))
    return "\n\n\n".join(out) + "\n"


# --- ros_panel/config.py ----------------------------------------------------
config_header = '''"""Panel bootstrap constants shared across app.py and ros_panel modules.

后端拆分批次 7：由 app.py 模块级引导段整体迁入（逐字保留）。
env 派生常量（ROS_MONITOR_*/ROS_PANEL_* 共享子集）与 profile/flag 派生链
集中在这里；collector.py 与 server.py 从本模块 import，app.py 重导出保持兼容。

导入顺序敏感（与原 app.py 一致）：
1. 本模块 import 的 ros_panel.panel_access / ros_panel.util 先完成各自的
   import 期 env 读取（env 文件此时还未加载）；
2. PANEL_ENV_FILE = load_panel_env() 把 env 文件合入 os.environ；
3. 之后的常量才读 os.environ。
"""'''
config_imports = '''import os
import re
import sys
from pathlib import Path

from ros_panel.panel_access import (
    DEFAULT_PANEL_BIND,
    DEFAULT_PANEL_PORT,
    DEFAULT_PANEL_TARGET,
    normalize_panel_host,
    normalize_panel_port,
    resolve_panel_access_host,
    validate_panel_public_contract,
)
from ros_panel.util import env_value
'''

config_blocks = [
    block(201, 247),   # is_frozen_app / resolve_base_dir / BASE_DIR / BUNDLE_DIR / resolve_runtime_path / load_env_file
    block(255, 258),   # load_panel_env
    block(286, 292),   # PANEL_ENV_FILE / PUBLIC_DIR / PANEL_PROFILE_RAW / PANEL_BIND / PANEL_PORT / PANEL_TARGET / validate
    block(333, 334),   # DNS_STATIC_PAGE_LIMIT / DNS_STATIC_MAX_PAGE_LIMIT (Handler 与 Collector 共享)
    block(343, 355),   # env_bool / PANEL_OPEN_BROWSER
    block(454, 495),   # profile 派生链 + PUBLIC_ROUTEROS_PROFILE / READONLY_DIAGNOSTICS_ENABLED / IP_ALIAS_WRITE_ENABLED / EXPOSE_ADMIN_SESSIONS
]
config_src = config_header + "\n\n" + config_imports + "\n\n" + join_blocks(config_blocks)
# 位置敏感的唯一定点修正：resolve_base_dir 的非冻结分支从 app.py 的 parent
#（repo 根）改为 config.py 的 parent.parent（同 ros_panel/router_config.py 先例），
# 语义与原 app.py BASE_DIR 完全一致。
config_src = config_src.replace(
    "    return Path(__file__).resolve().parent\n",
    "    # ros_panel/config.py 位于包内一层；仓库根 = 再上一层（同 router_config.py 先例）。\n"
    "    return Path(__file__).resolve().parent.parent\n",
    1,
)
(ROOT / "ros_panel" / "config.py").write_text(config_src, encoding="utf-8")

# --- ros_panel/collector.py -------------------------------------------------
collector_header = '''"""Collector: RouterOS 采样/快照构建核心（后端拆分批次 7 自 app.py 逐字迁入）。

类体与方法体零改动；模块级常量/辅助函数为 Collector 专属（AST 自由变量审计），
与 Handler/main 共享的常量在 ros_panel/config.py。
"""'''
collector_imports = '''import copy
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
'''

collector_blocks = [
    block(293, 332),   # POLL_SECONDS .. DNS_STATIC_PREVIEW_LIMIT（Collector 专属 env 常量）
    block(335, 340),   # DNS_STATIC_CACHE_TTL / FULL_REST_TIMEOUT / IP_ALIAS_FILE / WAN_LATENCY_*
    block(358, 363),   # connection_detail_sleep_seconds
    block(366, 392),   # tcp_latency_target
    block(395, 443),   # ping_latency_target
    block(446, 451),   # dns_static_total_count_from_meta
    block(508, 523),   # build_panel_capabilities
    block(526, 3090),  # class Collector
]
collector_src = collector_header + "\n\n" + collector_imports + "\n\n" + join_blocks(collector_blocks)
(ROOT / "ros_panel" / "collector.py").write_text(collector_src, encoding="utf-8")

# --- new app.py -------------------------------------------------------------
app_import_block = '''from ros_panel.config import (
    BASE_DIR,
    BUNDLE_DIR,
    DNS_STATIC_MAX_PAGE_LIMIT,
    DNS_STATIC_PAGE_LIMIT,
    EXPOSE_ADMIN_SESSIONS,
    IP_ALIAS_WRITE_ENABLED,
    PANEL_BIND,
    PANEL_ENV_FILE,
    PANEL_OPEN_BROWSER,
    PANEL_PORT,
    PANEL_PROFILE,
    PANEL_PROFILE_ALIASES,
    PANEL_PROFILE_RAW,
    PANEL_TARGET,
    PUBLIC_DIR,
    PUBLIC_ROUTEROS_PROFILE,
    READONLY_DIAGNOSTICS_ENABLED,
    env_bool,
    is_frozen_app,
    is_public_routeros_profile,
    load_env_file,
    load_panel_env,
    normalize_panel_profile,
    resolve_base_dir,
    resolve_panel_profile,
    resolve_runtime_path,
)
from ros_panel.collector import (
    ACTIVE_CONNECTION_LIMIT,
    CONNECTION_DETAIL_CAPTURE_SECONDS,
    CONNECTION_DETAIL_OVERRUN_BACKOFF_CAP_SECONDS,
    CONNECTION_DETAIL_OVERRUN_BACKOFF_SECONDS,
    CONNECTION_DETAIL_OVERRUN_MULTIPLIER,
    CONNECTION_DETAIL_POLL_SECONDS,
    CONNECTION_DETAIL_REST_TIMEOUT,
    CONNECTION_DETAIL_SAMPLE_LIMIT,
    CONNECTION_DETAIL_STREAM_MAX_BYTES,
    CONNECTION_PROTOCOL_BREAKDOWN_INTERVAL_SECONDS,
    CONNECTION_PROTOCOL_POLL_SECONDS,
    CONNECTION_PROTOCOL_SCAN_TIMEOUT,
    CONNECTION_TRACKING_TIMEOUT,
    DETAIL_REST_WORKERS,
    DNS_STATIC_CACHE_TTL,
    DNS_STATIC_FULL_REST_TIMEOUT,
    DNS_STATIC_PREVIEW_LIMIT,
    HISTORY_LIMIT,
    IP_ALIAS_FILE,
    POLL_SECONDS,
    RATE_ZERO_CONFIRM_SAMPLES,
    SLOW_REST_POLL_SECONDS,
    SLOW_REST_WORKERS,
    STATIC_POLL_SECONDS,
    STATIC_REST_WORKERS,
    WAN_LATENCY_POLL_SECONDS,
    WAN_LATENCY_TARGET,
    WAN_LATENCY_TIMEOUT_MS,
    Collector,
    build_panel_capabilities,
    connection_detail_sleep_seconds,
    dns_static_total_count_from_meta,
    ping_latency_target,
    tcp_latency_target,
)
'''

app_blocks = [
    "".join(lines[0:198]),              # imports 1-198
    app_import_block,
    block(250, 252),                    # ReusableThreadingHTTPServer（批 8 再迁 server.py）
    block(261, 283),                    # detect_panel_lan_ip
    block(497, 505),                    # panel_access 镜像回填
    "".join(lines[3092:]),              # 3093-end: restore/collector=Collector()/Handler/main/__main__
]
app_src = "\n\n\n".join(b.rstrip("\n") for b in app_blocks) + "\n"
app_path.write_text(app_src, encoding="utf-8")
print("batch7 files written")
