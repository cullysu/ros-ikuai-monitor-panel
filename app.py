import base64
import copy
import datetime
import hashlib
import ipaddress
import json
import mimetypes
import os
import re
import secrets
import socket
import subprocess
import sys
import threading
import time
import webbrowser
from concurrent.futures import ThreadPoolExecutor, wait
from collections import defaultdict, deque
from http import cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

import paramiko
import requests

_APP_DIR = str(Path(__file__).resolve().parent)
if _APP_DIR not in sys.path:
    sys.path.insert(0, _APP_DIR)
from ros_panel.secrets import ROUTER_LOGIN_SECRET_PREFIX, dpapi_protect_secret, dpapi_unprotect_secret
from ros_panel.util import (
    COUNTER_WRAP_MODULUS,
    _ROUTER_OS_MONTHS,
    compact_exception_text,
    counter_delta,
    env_value,
    format_routeros_clock,
    format_routeros_uptime,
    public_rfc3339_timestamp,
    split_connection_endpoint,
    to_bool,
    to_int,
    utc_now_rfc3339,
)
from ros_panel.model import (
    ACTION_SEVERITY_RANK,
    ARP_ACTIVE_STATUSES,
    ARP_STALE_STATUSES,
    CGNAT_NETWORK,
    arp_evidence_state,
    arp_status_summary,
    as_dict,
    as_list,
    collector_status_message,
    compact_text,
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
    scale_bucket,
)
from ros_panel.endpoints import (
    DETAIL_REST_ENDPOINTS,
    EMPTY_REST_BUNDLE,
    REALTIME_REST_ENDPOINTS,
    SLOW_REST_ENDPOINTS,
    STATIC_REST_ENDPOINTS,
    TERSE_FIELD_PATTERN,
    TRACKING_FIELD_PATTERN,
    endpoint,
)
from ros_panel.triage import ACTION_QUEUE_LIMIT, build_semantic_triage
from ros_panel.health_findings import build_health_findings
from ros_panel.diagnostics import (
    CUSTOM_NAME_MAX_LENGTH,
    READONLY_DIAGNOSTIC_CACHE_TTL,
    READONLY_DIAGNOSTIC_DNS_TIMEOUT,
    READONLY_DIAGNOSTIC_HTTP_TIMEOUT,
    READONLY_DIAGNOSTIC_WORKERS,
    READONLY_DIAGNOSTIC_TOTAL_TIMEOUT,
    READONLY_DNS_DOMAINS,
    READONLY_DNS_SERVERS,
    READONLY_EXIT_TARGETS,
    READONLY_HTTP_TARGETS,
    READONLY_NIKKI_CONTROLLER,
    address_is_globalish,
    build_distribution_from_lines,
    compact_config_rows,
    count_pool_addresses,
    dns_encode_name,
    dns_read_name,
    dns_query,
    env_config_rows,
    exit_probe,
    file_mtime_summary,
    http_probe,
    infer_wan_interface_names,
    is_fake_ip,
    nikki_probe,
    normalize_custom_name,
    normalize_ip_key,
    system_dns_query,
    tcp_probe,
)
from ros_panel.router_config import (
    DEFAULT_ROUTER_HOST,
    REST_TIMEOUT,
    ROUTER_CONFIG,
    ROUTER_CONFIG_LOCK,
    ROUTER_HOST,
    ROUTER_LOGIN_HISTORY_LIMIT,
    ROUTER_LOGIN_STORE_FILE,
    ROUTER_LOGIN_STORE_LOCK,
    ROUTER_PASSWORD,
    ROUTER_PASSWORD_PLACEHOLDERS,
    ROUTER_REST_PORT,
    ROUTER_SSH_PORT,
    ROUTER_USER,
    SSH_BANNER_PROBE_TIMEOUT,
    SSH_TIMEOUT,
    _ROUTER_REST_PORT_SUFFIX,
    clear_router_config,
    describe_ssh_endpoint_probe,
    find_saved_router_login,
    format_ssh_connect_error,
    forget_router_login,
    get_ready_router_config,
    get_router_config,
    load_router_login_store_unlocked,
    normalize_router_host,
    normalize_router_ssh_port,
    normalize_saved_router_entry,
    persist_router_login_store_unlocked,
    public_router_config,
    public_saved_router_entry,
    public_saved_router_logins,
    remember_router_login,
    restore_last_saved_router_login,
    router_config_is_ready,
    router_login_entry_id,
    safe_ascii_preview,
    set_router_config,
    test_router_credentials,
)
from ros_panel import panel_access
from ros_panel.panel_access import (
    DEFAULT_PANEL_BIND,
    DEFAULT_PANEL_PORT,
    DEFAULT_PANEL_TARGET,
    PANEL_ALLOW_LOCALHOST_HOST_FORWARD,
    PANEL_CSRF_COOKIE,
    PANEL_ENV_ASSIGNMENT_RE,
    PANEL_LOCALHOST_FORWARD_HEADER,
    PANEL_LOCALHOST_FORWARD_TOKEN,
    PANEL_NETWORK_ENV_KEYS,
    PANEL_NETWORK_WRITE_ENABLED_RAW,
    PANEL_SESSIONS,
    PANEL_SESSION_COOKIE,
    PANEL_SESSION_LOCK,
    PANEL_SESSION_TTL_SECONDS,
    PANEL_TRUST_PROXY_HEADERS,
    build_panel_cookie,
    client_host_is_loopback,
    create_panel_session,
    csrf_token_matches,
    first_header_value,
    format_url_host,
    get_panel_session,
    ip_address_is_loopback,
    is_loopback_panel_host,
    is_unspecified_panel_host,
    normalize_panel_host,
    normalize_panel_port,
    panel_access_url,
    panel_client_address_is_allowed,
    panel_env_write_path,
    panel_env_write_status,
    panel_host_header_is_allowed,
    panel_network_payload,
    panel_origin_is_allowed,
    panel_profile_requires_localhost_contract,
    panel_request_access_url,
    parse_ip_literal,
    parse_panel_origin,
    parse_panel_request_host,
    parse_request_cookies,
    prune_panel_sessions,
    quote_env_value,
    read_text_with_env_fallback,
    resolve_panel_access_host,
    validate_panel_public_contract,
    write_panel_network_env,
)


from ros_panel.config import (
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


# Handler/HTTP 入口在 ros_panel/server.py（批 8 迁出）；
# collector 单例注入见下方 configure() 调用。
from ros_panel.server import (
    Handler,
    PeerRateGuard,
    ReusableThreadingHTTPServer,
    configure,
    main,
    parse_connection_search_query,
)


def detect_panel_lan_ip():
    candidates = []
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.settimeout(0.2)
            sock.connect(("1.1.1.1", 80))
            candidates.append(sock.getsockname()[0])
    except OSError:
        pass
    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET, socket.SOCK_DGRAM):
            candidates.append(info[4][0])
    except OSError:
        pass
    for candidate in candidates:
        try:
            address = ipaddress.ip_address(candidate)
        except ValueError:
            continue
        if not (address.is_loopback or address.is_unspecified or address.is_link_local):
            return str(address)
    return "127.0.0.1"


# panel_access 的守卫/会话函数在调用时按 panel_access 模块全局读取这些 app 引导值
# （env 文件加载与 profile 派生链只能发生在 app.py，导入顺序敏感），这里回填镜像绑定；
# tests/tools 对这些 flag 的 patch 靶也统一指向 ros_panel.panel_access 模块对象。
panel_access.PANEL_ENV_FILE = PANEL_ENV_FILE
panel_access.PANEL_BIND = PANEL_BIND
panel_access.PANEL_PORT = PANEL_PORT
panel_access.PANEL_TARGET = PANEL_TARGET
panel_access.PANEL_PROFILE_RAW = PANEL_PROFILE_RAW
panel_access.PUBLIC_ROUTEROS_PROFILE = PUBLIC_ROUTEROS_PROFILE


restore_last_saved_router_login()
collector = Collector()


# server 模块的 Handler 按其模块全局 `collector` 在请求期读取；
# 单例在本模块 import 期构造后立即注入（循环依赖解耦）。
configure(collector)


if __name__ == "__main__":
    main()
