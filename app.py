import copy
import ipaddress
import json
import mimetypes
import os
import re
import socket
import threading
import time
from concurrent.futures import ThreadPoolExecutor, wait
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

import paramiko
import requests


BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"
ROUTER_HOST = os.getenv("ROS_MONITOR_ROUTER_HOST", "192.168.3.1")
ROUTER_USER = os.getenv("ROS_MONITOR_ROUTER_USER", "admin")
ROUTER_PASSWORD = os.getenv("ROS_MONITOR_ROUTER_PASSWORD", "<REDACTED_ROUTER_PASSWORD>")
PANEL_BIND = os.getenv("ROS_PANEL_BIND", "0.0.0.0")
PANEL_PORT = int(os.getenv("ROS_PANEL_PORT", "80"))
PANEL_TARGET = os.getenv("ROS_PANEL_TARGET_IP", "192.168.3.5")
POLL_SECONDS = max(1, int(os.getenv("ROS_MONITOR_POLL_SECONDS", "1")))
HISTORY_LIMIT = int(os.getenv("ROS_MONITOR_HISTORY_LIMIT", "60"))
ACTIVE_CONNECTION_LIMIT = int(os.getenv("ROS_MONITOR_ACTIVE_CONNECTION_LIMIT", "80"))
REST_TIMEOUT = max(8, int(os.getenv("ROS_MONITOR_REST_TIMEOUT", "12")))
SSH_TIMEOUT = max(8, int(os.getenv("ROS_MONITOR_SSH_TIMEOUT", "12")))
STATIC_POLL_SECONDS = max(300, int(os.getenv("ROS_MONITOR_STATIC_POLL_SECONDS", "300")))
STATIC_REST_WORKERS = max(1, min(3, int(os.getenv("ROS_MONITOR_STATIC_REST_WORKERS", "1"))))
SLOW_REST_POLL_SECONDS = max(60, int(os.getenv("ROS_MONITOR_SLOW_REST_POLL_SECONDS", "60")))
SLOW_REST_WORKERS = max(1, min(3, int(os.getenv("ROS_MONITOR_SLOW_REST_WORKERS", "2"))))
CONNECTION_DETAIL_POLL_SECONDS = max(30, int(os.getenv("ROS_MONITOR_CONNECTION_DETAIL_POLL_SECONDS", "30")))
CONNECTION_PROTOCOL_POLL_SECONDS = max(30, int(os.getenv("ROS_MONITOR_CONNECTION_PROTOCOL_POLL_SECONDS", "30")))
DNS_STATIC_PREVIEW_LIMIT = int(os.getenv("ROS_MONITOR_DNS_STATIC_PREVIEW_LIMIT", "12"))
DNS_STATIC_PAGE_LIMIT = int(os.getenv("ROS_MONITOR_DNS_STATIC_PAGE_LIMIT", "100"))
DNS_STATIC_MAX_PAGE_LIMIT = int(os.getenv("ROS_MONITOR_DNS_STATIC_MAX_PAGE_LIMIT", "300"))
DNS_STATIC_CACHE_TTL = int(os.getenv("ROS_MONITOR_DNS_STATIC_CACHE_TTL", "60"))
DNS_STATIC_FULL_REST_TIMEOUT = int(os.getenv("ROS_MONITOR_DNS_STATIC_FULL_REST_TIMEOUT", "35"))
IP_ALIAS_FILE = Path(os.getenv("ROS_PANEL_IP_ALIAS_FILE", str(BASE_DIR / "data" / "ip_aliases.json"))).expanduser()
CUSTOM_NAME_MAX_LENGTH = int(os.getenv("ROS_PANEL_CUSTOM_NAME_MAX_LENGTH", "48"))
READONLY_DIAGNOSTIC_CACHE_TTL = int(os.getenv("ROS_PANEL_READONLY_DIAGNOSTIC_CACHE_TTL", "45"))
READONLY_DIAGNOSTIC_DNS_TIMEOUT = float(os.getenv("ROS_PANEL_READONLY_DIAGNOSTIC_DNS_TIMEOUT", "1.2"))
READONLY_DIAGNOSTIC_HTTP_TIMEOUT = float(os.getenv("ROS_PANEL_READONLY_DIAGNOSTIC_HTTP_TIMEOUT", "2.5"))
READONLY_DIAGNOSTIC_WORKERS = int(os.getenv("ROS_PANEL_READONLY_DIAGNOSTIC_WORKERS", "24"))
READONLY_DIAGNOSTIC_TOTAL_TIMEOUT = float(os.getenv("ROS_PANEL_READONLY_DIAGNOSTIC_TOTAL_TIMEOUT", "8"))

READONLY_DNS_SERVERS = [
    {"name": "RouterOS DNS", "address": "192.168.3.1"},
    {"name": "OpenWrt DNS", "address": "192.168.3.2"},
]

READONLY_DNS_DOMAINS = [
    {"name": "GitHub", "domain": "github.com", "expected": "proxy"},
    {"name": "YouTube", "domain": "youtube.com", "expected": "proxy"},
    {"name": "Google", "domain": "google.com", "expected": "proxy"},
    {"name": "Apple", "domain": "apple.com", "expected": "direct"},
    {"name": "Douyin", "domain": "douyin.com", "expected": "direct"},
    {"name": "Bilibili", "domain": "bilibili.com", "expected": "direct"},
    {"name": "Steam", "domain": "steampowered.com", "expected": "mixed"},
    {"name": "PayPal", "domain": "paypal.com", "expected": "direct"},
    {"name": "Cloudflare", "domain": "cloudflare.com", "expected": "proxy"},
    {"name": "OpenAI", "domain": "openai.com", "expected": "proxy"},
]

READONLY_HTTP_TARGETS = [
    {"name": "GitHub", "url": "https://github.com/", "expected": "proxy"},
    {"name": "YouTube", "url": "https://www.youtube.com/generate_204", "expected": "proxy"},
    {"name": "Google", "url": "https://www.google.com/generate_204", "expected": "proxy"},
    {"name": "Apple Store", "url": "https://apps.apple.com/", "expected": "direct"},
    {"name": "Douyin", "url": "https://www.douyin.com/", "expected": "direct"},
    {"name": "Bilibili", "url": "https://www.bilibili.com/", "expected": "direct"},
    {"name": "Steam", "url": "https://store.steampowered.com/", "expected": "mixed"},
    {"name": "PayPal", "url": "https://www.paypal.com/", "expected": "direct"},
    {"name": "Cloudflare", "url": "https://www.cloudflare.com/cdn-cgi/trace", "expected": "proxy"},
    {"name": "OpenAI API", "url": "https://api.openai.com/", "expected": "proxy"},
]

READONLY_EXIT_TARGETS = [
    {"name": "ipify", "url": "https://api.ipify.org?format=json", "type": "json_ip"},
    {"name": "ifconfig.me", "url": "https://ifconfig.me/ip", "type": "text_ip"},
    {"name": "Cloudflare Trace", "url": "https://www.cloudflare.com/cdn-cgi/trace", "type": "cloudflare_trace"},
]
READONLY_NIKKI_CONTROLLER = os.getenv("ROS_PANEL_READONLY_NIKKI_CONTROLLER", "http://192.168.3.2:9090")

def endpoint(path, kind="list", fields=None, optional=False, timeout=None):
    params = {".proplist": fields} if fields else None
    config = {"path": path, "kind": kind, "params": params, "optional": optional}
    if timeout is not None:
        config["timeout"] = timeout
    return config


REALTIME_REST_ENDPOINTS = {
    "resource": endpoint(
        "system/resource",
        kind="object",
        fields="version,board-name,architecture-name,cpu,cpu-count,cpu-frequency,cpu-load,total-memory,free-memory,total-hdd-space,free-hdd-space,uptime",
        timeout=8,
    ),
    "clock": endpoint("system/clock", kind="object", fields="date,time", timeout=4),
    "ntp": endpoint("system/ntp/client", kind="object", fields="status"),
    "dns": endpoint(
        "ip/dns",
        kind="object",
        fields="allow-remote-requests,servers,cache-size,cache-used,doh-server,use-doh-server,verify-doh-cert",
    ),
    "active_users": endpoint("user/active", fields="name,address,via,when"),
    "interfaces": endpoint(
        "interface",
        fields="name,type,running,disabled,mac-address,rx-packet,tx-packet,rx-drop,tx-drop,rx-error,tx-error,rx-byte,tx-byte",
        timeout=8,
    ),
    "pppoe": endpoint("interface/pppoe-client", fields="name,running,interface,disabled"),
    "ip_addresses": endpoint("ip/address", fields="interface,actual-interface,address,network"),
    "ipv6_addresses": endpoint(
        "ipv6/address",
        fields="interface,actual-interface,address,disabled,dynamic,global,link-local,slave",
        optional=True,
    ),
    "routes": endpoint("ip/route", fields="dst-address,gateway,distance,routing-table,active,comment,static,dynamic,disabled"),
    "arp": endpoint("ip/arp", fields="address,mac-address,status,dynamic"),
    "ipv6_nd": endpoint(
        "ipv6/nd",
        fields="interface,dns,advertise-dns,dns-servers,managed-address-configuration,other-configuration,ra-lifetime",
        optional=True,
    ),
    "ipv6_dhcp_clients": endpoint(
        "ipv6/dhcp-client",
        fields="interface,status,pool-name,prefix,address,use-peer-dns,request,add-default-route,default-route-distance,dhcp-options",
        optional=True,
    ),
}


STATIC_REST_ENDPOINTS = {
    "identity": endpoint("system/identity", kind="object", fields="name"),
    "dns": endpoint(
        "ip/dns",
        kind="object",
        fields="allow-remote-requests,servers,cache-size,cache-used,doh-server,use-doh-server,verify-doh-cert",
    ),
    "dhcp_servers": endpoint("ip/dhcp-server", fields="name,interface,address-pool,lease-time,disabled"),
    "dhcp_leases": endpoint("ip/dhcp-server/lease", fields="address,host-name,mac-address,server,status,last-seen,dynamic"),
    "pools": endpoint("ip/pool", fields="name,ranges"),
    "pool_used": endpoint("ip/pool/used", fields="pool,address,owner,info", optional=True),
    "filters": endpoint("ip/firewall/filter", fields="chain,action,comment,packets,bytes,disabled"),
    "address_lists": endpoint("ip/firewall/address-list", fields="list,address,timeout,comment"),
    "mangle": endpoint("ip/firewall/mangle", fields="chain,action,comment,new-routing-mark,packets,bytes,per-connection-classifier"),
    "routing_rules": endpoint("routing/rule", fields="action,table,src-address,dst-address,comment,disabled,inactive"),
    "logs": endpoint("log", fields="time,topics,message"),
}

for _CONFIG_ENDPOINT_KEY in ("ipv6_nd", "ipv6_dhcp_clients"):
    STATIC_REST_ENDPOINTS[_CONFIG_ENDPOINT_KEY] = REALTIME_REST_ENDPOINTS.pop(_CONFIG_ENDPOINT_KEY)


SLOW_REST_ENDPOINTS = {}
for _SLOW_ENDPOINT_KEY in (
    "clock",
    "ntp",
    "dns",
    "active_users",
    "pppoe",
    "ip_addresses",
    "ipv6_addresses",
    "routes",
    "arp",
):
    SLOW_REST_ENDPOINTS[_SLOW_ENDPOINT_KEY] = REALTIME_REST_ENDPOINTS.pop(_SLOW_ENDPOINT_KEY)

SLOW_REST_ENDPOINTS["ipv6_neighbors"] = endpoint(
    "ipv6/neighbor",
    fields="address,mac-address,interface,status,router,complete",
    optional=True,
)


DETAIL_REST_ENDPOINTS = {}


EMPTY_REST_BUNDLE = {
    "resource": {},
    "identity": {},
    "clock": {},
    "ntp": {},
    "active_users": [],
    "interfaces": [],
    "pppoe": [],
    "ip_addresses": [],
    "ipv6_addresses": [],
    "ipv6_neighbors": [],
    "routes": [],
    "arp": [],
    "dns": {},
    "dns_static": [],
    "dns_static_meta": {},
    "ipv6_nd": [],
    "ipv6_dhcp_clients": [],
    "dhcp_servers": [],
    "dhcp_leases": [],
    "pools": [],
    "pool_used": [],
    "filters": [],
    "address_lists": [],
    "mangle": [],
    "routing_rules": [],
    "logs": [],
}


def to_int(value, default=0):
    try:
        if value in ("", None):
            return default
        if isinstance(value, (int, float)):
            return int(value)
        text = str(value).strip()
        match = re.fullmatch(r"(-?\d+(?:\.\d+)?)([A-Za-z]+)?", text)
        if match:
            number = float(match.group(1))
            unit = (match.group(2) or "").upper()
            factors = {
                "K": 1024,
                "KB": 1000,
                "KIB": 1024,
                "M": 1024**2,
                "MB": 1000**2,
                "MIB": 1024**2,
                "G": 1024**3,
                "GB": 1000**3,
                "GIB": 1024**3,
                "T": 1024**4,
                "TB": 1000**4,
                "TIB": 1024**4,
            }
            if unit in factors:
                return int(number * factors[unit])
        return int(float(value))
    except Exception:
        return default


def to_bool(value):
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).lower() in {"true", "yes", "on", "running", "bound", "active", "enabled"}


def format_iso_now():
    return time.strftime("%Y-%m-%d %H:%M:%S")


def ip_sort_key(address):
    try:
        return ipaddress.ip_address(address)
    except Exception:
        return ipaddress.ip_address("0.0.0.0")


def rate_level(value):
    if value >= 0.85:
        return "danger"
    if value >= 0.65:
        return "warning"
    return "ok"


def count_pool_addresses(ranges):
    total = 0
    for raw_part in str(ranges or "").split(","):
        part = raw_part.strip()
        if not part:
            continue
        try:
            if "-" in part:
                start_text, end_text = [item.strip() for item in part.split("-", 1)]
                start_ip = ipaddress.ip_address(start_text)
                end_ip = ipaddress.ip_address(end_text)
                if start_ip.version != end_ip.version:
                    continue
                start_int = int(start_ip)
                end_int = int(end_ip)
                if end_int >= start_int:
                    total += end_int - start_int + 1
            else:
                ipaddress.ip_address(part)
                total += 1
        except Exception:
            continue
    return total


def normalize_ip_key(value):
    text = str(value or "").strip()
    if not text or text == "-":
        return ""
    if text.startswith("[") and text.endswith("]"):
        text = text[1:-1].strip()
    if "/" in text:
        text = text.split("/", 1)[0].strip()
    try:
        return str(ipaddress.ip_address(text))
    except Exception:
        return text


def normalize_custom_name(value):
    text = re.sub(r"\s+", " ", str(value or "").strip())
    if not text:
        return ""
    return text[:CUSTOM_NAME_MAX_LENGTH]


def is_fake_ip(value):
    try:
        address = ipaddress.ip_address(str(value or "").strip())
        return address.version == 4 and address in ipaddress.ip_network("198.18.0.0/15")
    except Exception:
        return False


def dns_encode_name(domain):
    parts = [part for part in str(domain or "").strip(".").split(".") if part]
    return b"".join(bytes([len(part.encode("idna"))]) + part.encode("idna") for part in parts) + b"\x00"


def dns_read_name(payload, offset, depth=0):
    if depth > 8:
        raise ValueError("DNS name compression loop")
    labels = []
    jumped = False
    next_offset = offset
    while True:
        if offset >= len(payload):
            raise ValueError("DNS name outside packet")
        length = payload[offset]
        if length == 0:
            offset += 1
            if not jumped:
                next_offset = offset
            break
        if length & 0xC0 == 0xC0:
            if offset + 1 >= len(payload):
                raise ValueError("DNS pointer outside packet")
            pointer = ((length & 0x3F) << 8) | payload[offset + 1]
            if not jumped:
                next_offset = offset + 2
            offset = pointer
            jumped = True
            depth += 1
            if depth > 8:
                raise ValueError("DNS pointer loop")
            continue
        offset += 1
        label = payload[offset : offset + length]
        try:
            labels.append(label.decode("idna"))
        except Exception:
            labels.append(label.decode("ascii", errors="replace"))
        offset += length
        if not jumped:
            next_offset = offset
    return ".".join(labels), next_offset


def dns_query(server, domain, qtype):
    qtype_name = "AAAA" if qtype == 28 else "A"
    started_at = time.time()
    transaction_id = os.urandom(2)
    question = dns_encode_name(domain) + qtype.to_bytes(2, "big") + (1).to_bytes(2, "big")
    packet = (
        transaction_id
        + b"\x01\x00"
        + (1).to_bytes(2, "big")
        + (0).to_bytes(2, "big")
        + (0).to_bytes(2, "big")
        + (0).to_bytes(2, "big")
        + question
    )
    result = {
        "server": server,
        "domain": domain,
        "type": qtype_name,
        "answers": [],
        "fakeIp": False,
        "rcode": None,
        "elapsedMs": None,
        "error": None,
    }
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(READONLY_DIAGNOSTIC_DNS_TIMEOUT)
    try:
        sock.sendto(packet, (server, 53))
        response, _ = sock.recvfrom(4096)
        elapsed_ms = round((time.time() - started_at) * 1000)
        result["elapsedMs"] = elapsed_ms
        if len(response) < 12 or response[:2] != transaction_id:
            raise ValueError("invalid DNS response")
        flags = int.from_bytes(response[2:4], "big")
        result["rcode"] = flags & 0x0F
        qdcount = int.from_bytes(response[4:6], "big")
        ancount = int.from_bytes(response[6:8], "big")
        offset = 12
        for _ in range(qdcount):
            _, offset = dns_read_name(response, offset)
            offset += 4
        answers = []
        for _ in range(ancount):
            _, offset = dns_read_name(response, offset)
            if offset + 10 > len(response):
                raise ValueError("truncated DNS answer")
            answer_type = int.from_bytes(response[offset : offset + 2], "big")
            answer_class = int.from_bytes(response[offset + 2 : offset + 4], "big")
            offset += 8
            rdlength = int.from_bytes(response[offset : offset + 2], "big")
            offset += 2
            rdata = response[offset : offset + rdlength]
            offset += rdlength
            if answer_class != 1:
                continue
            if answer_type == 1 and len(rdata) == 4:
                answers.append(socket.inet_ntop(socket.AF_INET, rdata))
            elif answer_type == 28 and len(rdata) == 16:
                answers.append(socket.inet_ntop(socket.AF_INET6, rdata))
        result["answers"] = answers
        result["fakeIp"] = any(is_fake_ip(item) for item in answers)
    except Exception as exc:
        result["elapsedMs"] = round((time.time() - started_at) * 1000)
        result["error"] = str(exc)
    finally:
        sock.close()
    return result


def system_dns_query(domain, qtype):
    qtype_name = "AAAA" if qtype == 28 else "A"
    family = socket.AF_INET6 if qtype == 28 else socket.AF_INET
    started_at = time.time()
    result = {
        "server": "system",
        "domain": domain,
        "type": qtype_name,
        "answers": [],
        "fakeIp": False,
        "rcode": None,
        "elapsedMs": None,
        "error": None,
    }
    try:
        infos = socket.getaddrinfo(str(domain), None, family, socket.SOCK_STREAM)
        answers = []
        for info in infos:
            address = info[4][0]
            if address not in answers:
                answers.append(address)
        result["answers"] = answers
        result["fakeIp"] = any(is_fake_ip(item) for item in answers)
        result["rcode"] = 0
    except Exception as exc:
        result["error"] = str(exc)
    result["elapsedMs"] = round((time.time() - started_at) * 1000)
    return result


def http_probe(target):
    started_at = time.time()
    result = {
        "name": target.get("name", "-"),
        "url": target.get("url", "-"),
        "expected": target.get("expected", "-"),
        "status": None,
        "ok": False,
        "elapsedMs": None,
        "finalHost": None,
        "error": None,
    }
    try:
        response = requests.get(
            target["url"],
            timeout=READONLY_DIAGNOSTIC_HTTP_TIMEOUT,
            allow_redirects=True,
            stream=True,
            headers={"User-Agent": "ROSiKuaiPanel-Readonly-Diagnostics/1.0"},
        )
        result["status"] = response.status_code
        result["ok"] = response.status_code < 500
        result["finalHost"] = urlparse(response.url).netloc
        response.close()
    except Exception as exc:
        result["error"] = str(exc)
    result["elapsedMs"] = round((time.time() - started_at) * 1000)
    return result


def tcp_probe(target):
    started_at = time.time()
    parsed = urlparse(target.get("url", ""))
    host = parsed.hostname or target.get("host") or target.get("name", "")
    port = int(target.get("port") or (parsed.port or 443))
    result = {
        "name": target.get("name", "-"),
        "host": host,
        "port": port,
        "expected": target.get("expected", "-"),
        "ok": False,
        "elapsedMs": None,
        "error": None,
    }
    try:
        with socket.create_connection((host, port), timeout=READONLY_DIAGNOSTIC_HTTP_TIMEOUT):
            result["ok"] = True
    except Exception as exc:
        result["error"] = str(exc)
    result["elapsedMs"] = round((time.time() - started_at) * 1000)
    return result


def exit_probe(target):
    started_at = time.time()
    result = {
        "name": target.get("name", "-"),
        "url": target.get("url", "-"),
        "ip": None,
        "raw": "",
        "elapsedMs": None,
        "error": None,
    }
    try:
        response = requests.get(
            target["url"],
            timeout=READONLY_DIAGNOSTIC_HTTP_TIMEOUT,
            headers={"User-Agent": "ROSiKuaiPanel-Readonly-Diagnostics/1.0"},
        )
        text = response.text.strip()
        result["raw"] = text[:500]
        if target.get("type") == "json_ip":
            payload = response.json()
            result["ip"] = payload.get("ip")
        elif target.get("type") == "cloudflare_trace":
            for line in text.splitlines():
                if line.startswith("ip="):
                    result["ip"] = line.split("=", 1)[1].strip()
                    break
        else:
            result["ip"] = text.split()[0] if text else None
    except Exception as exc:
        result["error"] = str(exc)
    result["elapsedMs"] = round((time.time() - started_at) * 1000)
    return result


def file_mtime_summary(path):
    try:
        stat = Path(path).stat()
        return {
            "path": str(Path(path)),
            "exists": True,
            "mtime": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(stat.st_mtime)),
            "size": stat.st_size,
        }
    except Exception as exc:
        return {
            "path": str(Path(path)),
            "exists": False,
            "mtime": None,
            "size": 0,
            "error": str(exc),
        }


def nikki_probe():
    result = {
        "controller": READONLY_NIKKI_CONTROLLER,
        "ok": False,
        "version": None,
        "providers": [],
        "providerCount": 0,
        "ruleCount": 0,
        "error": None,
    }
    try:
        version_response = requests.get(
            f"{READONLY_NIKKI_CONTROLLER.rstrip('/')}/version",
            timeout=READONLY_DIAGNOSTIC_HTTP_TIMEOUT,
        )
        if version_response.status_code < 500:
            result["ok"] = version_response.ok
            try:
                version_payload = version_response.json()
                result["version"] = version_payload.get("version") or version_payload.get("meta")
            except Exception:
                result["version"] = version_response.text.strip()[:80]
        providers_response = requests.get(
            f"{READONLY_NIKKI_CONTROLLER.rstrip('/')}/providers/rules",
            timeout=READONLY_DIAGNOSTIC_HTTP_TIMEOUT,
        )
        if providers_response.ok:
            payload = providers_response.json()
            providers = payload.get("providers") if isinstance(payload, dict) else {}
            if isinstance(providers, dict):
                rows = []
                for name, provider in providers.items():
                    rules = provider.get("ruleCount") or provider.get("rule-count") or len(provider.get("rules") or [])
                    rows.append(
                        {
                            "name": name,
                            "type": provider.get("type", "-"),
                            "vehicleType": provider.get("vehicleType") or provider.get("vehicle-type") or "-",
                            "ruleCount": to_int(rules),
                            "updatedAt": provider.get("updatedAt") or provider.get("updated-at") or "-",
                        }
                    )
                rows.sort(key=lambda row: row["ruleCount"], reverse=True)
                result["providers"] = rows[:40]
                result["providerCount"] = len(rows)
                result["ruleCount"] = sum(row["ruleCount"] for row in rows)
                result["ok"] = True
    except Exception as exc:
        result["error"] = str(exc)
    return result


class Collector:
    def __init__(self):
        self.state = {
            "status": "starting",
            "updatedAt": None,
            "error": None,
            "meta": {
                "target": PANEL_TARGET,
                "routerHost": ROUTER_HOST,
                "pollSeconds": POLL_SECONDS,
                "staticPollSeconds": STATIC_POLL_SECONDS,
                "slowRestPollSeconds": SLOW_REST_POLL_SECONDS,
                "connectionDetailPollSeconds": CONNECTION_DETAIL_POLL_SECONDS,
                "connectionProtocolPollSeconds": CONNECTION_PROTOCOL_POLL_SECONDS,
            },
        }
        self.lock = threading.Lock()
        self.prev_counters = {}
        self.prev_ts = None
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
            raise ValueError("IP 鍦板潃涓嶈兘涓虹┖")
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
        response = session.get(
            f"http://{ROUTER_HOST}/rest/{config['path']}",
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

    def ssh_exec(self, client, command):
        stdin, stdout, stderr = client.exec_command(command, timeout=SSH_TIMEOUT)
        channel = stdout.channel
        try:
            channel.settimeout(SSH_TIMEOUT)
            stderr.channel.settimeout(SSH_TIMEOUT)
            output = stdout.read().decode("utf-8", errors="replace").strip()
            error = stderr.read().decode("utf-8", errors="replace").strip()
            exit_status = channel.recv_exit_status()
        except socket.timeout as exc:
            try:
                channel.close()
            except Exception:
                pass
            raise RuntimeError(f"SSH command timed out after {SSH_TIMEOUT}s: {command}") from exc
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

    def fetch_rest_item(self, key, endpoint_config):
        session = requests.Session()
        session.auth = (ROUTER_USER, ROUTER_PASSWORD)
        try:
            return key, self.rest_get(session, endpoint_config), None
        except Exception as exc:
            return key, None, str(exc)
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

        session = requests.Session()
        session.auth = (ROUTER_USER, ROUTER_PASSWORD)
        try:
            payload = {}
            failures = {}
            for key, endpoint_config in endpoints.items():
                fallback = {} if endpoint_config.get("kind") == "object" else []
                try:
                    payload[key] = self.rest_get(session, endpoint_config)
                except Exception as exc:
                    payload[key] = fallback
                    failures[key] = str(exc)
            if failures:
                payload["_failures"] = failures
            required_keys = [key for key, endpoint_config in endpoints.items() if not endpoint_config.get("optional")]
            if failures and required_keys and all(key in failures for key in required_keys):
                joined = "; ".join(f"{key}: {message}" for key, message in failures.items())
                raise RuntimeError(joined)
            return payload
        finally:
            session.close()

    def open_ssh_client(self):
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            ROUTER_HOST,
            username=ROUTER_USER,
            password=ROUTER_PASSWORD,
            timeout=SSH_TIMEOUT,
            banner_timeout=SSH_TIMEOUT,
            auth_timeout=SSH_TIMEOUT,
            allow_agent=False,
            look_for_keys=False,
        )
        return client

    def fetch_connection_total_count(self):
        client = self.open_ssh_client()
        try:
            return to_int(self.ssh_exec(client, "/ip/firewall/connection print count-only"))
        finally:
            client.close()

    def fetch_connection_protocol_counts(self):
        client = self.open_ssh_client()
        counts = {"tcp": 0, "udp": 0, "icmp": 0}
        try:
            counts["tcp"] = to_int(self.ssh_exec(client, "/ip/firewall/connection print count-only where protocol=tcp"))
            counts["udp"] = to_int(self.ssh_exec(client, "/ip/firewall/connection print count-only where protocol=udp"))
            counts["icmp"] = to_int(self.ssh_exec(client, "/ip/firewall/connection print count-only where protocol=icmp"))
            counts["all"] = counts["tcp"] + counts["udp"] + counts["icmp"]
            return counts
        finally:
            client.close()

    def fetch_connection_detail(self):
        client = self.open_ssh_client()
        try:
            return {
                "active_connections": self.ssh_json(
                    client,
                    "[/ip/firewall/connection/print as-value where (orig-rate>0 || repl-rate>0)]",
                )
            }
        finally:
            client.close()

    def fetch_dns_static_count(self):
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
        session = requests.Session()
        session.auth = (ROUTER_USER, ROUTER_PASSWORD)
        try:
            response = session.get(
                f"http://{ROUTER_HOST}/rest/ip/dns/static",
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
        return to_int(meta.get("count"), cached_count or len(preview_rows))

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

    def compute_rates(self, interfaces):
        ts = time.time()
        interval = max(ts - self.prev_ts, 1) if self.prev_ts else 1
        rates = {}
        current = {}
        for item in interfaces:
            name = item.get("name")
            rx = to_int(item.get("rx-byte"))
            tx = to_int(item.get("tx-byte"))
            current[name] = (rx, tx)
            prev_rx, prev_tx = self.prev_counters.get(name, (rx, tx))
            rates[name] = {
                "rxBps": max(rx - prev_rx, 0) / interval,
                "txBps": max(tx - prev_tx, 0) / interval,
            }
        self.prev_counters = current
        self.prev_ts = ts
        return rates

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

    def build_overview(self, rest, ssh, terminal_count, wan_totals):
        resource = rest["resource"]
        total_memory = to_int(resource.get("total-memory"))
        used_memory = max(total_memory - to_int(resource.get("free-memory")), 0)
        total_disk = to_int(resource.get("total-hdd-space"))
        used_disk = max(total_disk - to_int(resource.get("free-hdd-space")), 0)
        admins = []
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
        return {
            "identity": rest["identity"].get("name", "RouterOS"),
            "version": resource.get("version", "-"),
            "boardName": resource.get("board-name", "-"),
            "architecture": resource.get("architecture-name", "-"),
            "cpuModel": resource.get("cpu", "-"),
            "cpuCount": to_int(resource.get("cpu-count")),
            "cpuFrequency": to_int(resource.get("cpu-frequency")),
            "uptime": resource.get("uptime", "-"),
            "systemTime": f'{rest["clock"].get("date", "")} {rest["clock"].get("time", "")}'.strip(),
            "ntpStatus": rest["ntp"].get("status", "unknown"),
            "admins": admins,
            "cpuLoad": to_int(resource.get("cpu-load")),
            "memoryUsedBytes": used_memory,
            "memoryTotalBytes": total_memory,
            "memoryUsage": round((used_memory / total_memory) * 100, 2) if total_memory else 0,
            "diskUsedBytes": used_disk,
            "diskTotalBytes": total_disk,
            "diskUsage": round((used_disk / total_disk) * 100, 2) if total_disk else 0,
            "uplinkBps": wan_totals["up"],
            "downlinkBps": wan_totals["down"],
            "onlineTerminals": terminal_count,
            "connectionTotal": ssh["counts"]["all"],
            "systemLoadLevel": rate_level(max(to_int(resource.get("cpu-load")) / 100, used_memory / total_memory if total_memory else 0)),
            "history": {key: list(values) for key, values in self.history.items()},
        }

    def build_interfaces(self, rest, rates, addresses_by_interface):
        pppoe_names = {row.get("name") for row in rest["pppoe"]}
        gateway_rows = defaultdict(list)
        for route in rest["routes"]:
            gateway_rows[route.get("gateway")].append(route)
        items = []
        for item in rest["interfaces"]:
            name = item.get("name")
            items.append(
                {
                    "name": name,
                    "role": "WAN" if name in pppoe_names else "LAN",
                    "type": item.get("type", "-"),
                    "running": to_bool(item.get("running")),
                    "disabled": to_bool(item.get("disabled")),
                    "mac": item.get("mac-address", "-"),
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
                }
            )
        items.sort(key=lambda row: (row["role"] != "WAN", row["name"]))
        return items

    def build_pppoe(self, rest, rates, addresses_by_interface):
        defaults = [row for row in rest["routes"] if row.get("dst-address") == "0.0.0.0/0"]
        route_by_gateway = defaultdict(list)
        for route in defaults:
            route_by_gateway[route.get("gateway")].append(route)
        rows = []
        total_rate = 0
        for item in rest["pppoe"]:
            name = item.get("name")
            metric = rates.get(name, {"rxBps": 0, "txBps": 0})
            total_rate += metric["rxBps"] + metric["txBps"]
            history = self.line_history.setdefault(name, {"up": deque(maxlen=HISTORY_LIMIT), "down": deque(maxlen=HISTORY_LIMIT)})
            history["up"].append(metric["txBps"])
            history["down"].append(metric["rxBps"])
            rows.append(
                {
                    "name": name,
                    "status": "鍦ㄧ嚎" if to_bool(item.get("running")) else "绂荤嚎",
                    "running": to_bool(item.get("running")),
                    "parent": item.get("interface", "-"),
                    "addresses": [row.get("address", "-") for row in addresses_by_interface.get(name, [])],
                    "upRate": metric["txBps"],
                    "downRate": metric["rxBps"],
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
                "share": round(((row["upRate"] + row["downRate"]) / total_rate) * 100, 2) if total_rate else 0,
                "upRate": row["upRate"],
                "downRate": row["downRate"],
                "status": row["status"],
            }
            for row in rows
        ]
        return rows, distribution

    def extract_local_ip(self, conn, local_networks, router_ips):
        candidates = [
            ("src-address", "reply-src-address"),
            ("reply-src-address", "src-address"),
            ("dst-address", "reply-dst-address"),
            ("reply-dst-address", "dst-address"),
        ]
        for local_key, remote_key in candidates:
            address = conn.get(local_key)
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
        for item in rest["arp"]:
            address = item.get("address")
            mac = item.get("mac-address")
            if not address or not mac or address in router_ips:
                continue
            try:
                ip_obj = ipaddress.ip_address(address)
            except Exception:
                continue
            if not any(ip_obj in network for network in local_networks):
                continue
            ip_to_macs[address].add(mac)
            mac_to_ips[mac].add(address)
            lease = leases_by_ip.get(address) or leases_by_mac.get(mac)
            arp_rows.append(
                {
                    "ip": address,
                    "mac": mac,
                    "hostname": (lease or {}).get("host-name", "-"),
                    "status": item.get("status", "-"),
                    "type": "闈欐€? if not to_bool(item.get("dynamic", True)) else "鍔ㄦ€?,
                    "lastSeen": (lease or {}).get("last-seen", "-"),
                }
            )
        alerts = []
        for ip_addr, macs in ip_to_macs.items():
            if len(macs) > 1:
                alerts.append({"kind": "IP鍐茬獊", "value": ip_addr, "detail": ", ".join(sorted(macs))})
        for mac, ips in mac_to_ips.items():
            if len(ips) > 1:
                alerts.append({"kind": "MAC婕傜Щ", "value": mac, "detail": ", ".join(sorted(ips, key=ip_sort_key))})

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
            terminal_stats[local_ip]["sessionBytes"] += to_int(conn.get("orig-bytes")) + to_int(conn.get("repl-bytes"))
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
        return {
            "terminalCount": len(terminals),
            "terminals": terminals,
            "arp": sorted(arp_rows, key=lambda row: ip_sort_key(row["ip"]))[:120],
            "arpAlerts": alerts[:20],
            "activeConnections": active_rows[:ACTIVE_CONNECTION_LIMIT],
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
        return {"pools": pools, "leases": leases[:120], "servers": servers}

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
            "forwardRuleCount": to_int(dns_static_meta.get("count"), len(dns_static_rows)),
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
            category = "榛戝悕鍗? if "black" in list_name.lower() else "鐧藉悕鍗? if "white" in list_name.lower() else "鍦板潃闆?
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
        return {"filters": filters[:80], "addressLists": address_lists, "alerts": alerts[:40]}

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
            mode = "澶氱嚎鍒嗘祦 / 绛栫暐璺敱"
        elif len(active_defaults) > 1:
            mode = "澶氱嚎璺鐏?/ 浼樺厛绾у垏鎹?
        else:
            mode = "鍗曠嚎璺?
        return {
            "mode": mode,
            "activeLines": len(active_defaults),
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
        groups = {"system": [], "firewall": [], "dhcp": [], "dns": [], "all": []}
        for item in rest["logs"][:200]:
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
        return {key: value[:60] for key, value in groups.items()}

    def build_snapshot(self, rest, ssh):
        connection_counts = copy.deepcopy(ssh.get("counts", {}))
        counted_total = to_int(connection_counts.get("tcp")) + to_int(connection_counts.get("udp")) + to_int(connection_counts.get("icmp"))
        connection_counts["all"] = max(to_int(connection_counts.get("all")), counted_total)
        ssh = {**ssh, "counts": connection_counts}
        rates = self.compute_rates(rest["interfaces"])
        addresses_by_interface, local_networks, router_ips = self.build_maps(rest)
        pppoe, distribution = self.build_pppoe(rest, rates, addresses_by_interface)
        wan_totals = {"up": sum(row["upRate"] for row in pppoe if row["running"]), "down": sum(row["downRate"] for row in pppoe if row["running"])}
        terminals = self.build_terminals_and_connections(rest, ssh, local_networks, router_ips)
        interfaces = self.build_interfaces(rest, rates, addresses_by_interface)
        ipv6_interface_count = sum(
            1 for row in interfaces if any(":" in str(ip_addr) for ip_addr in row.get("ips", []))
        )
        ipv6_terminal_count = sum(
            1 for row in terminals["terminals"] if ":" in str(row.get("ip", ""))
        )
        resource = rest["resource"]
        total_memory = to_int(resource.get("total-memory"))
        used_memory = max(total_memory - to_int(resource.get("free-memory")), 0)
        total_disk = to_int(resource.get("total-hdd-space"))
        used_disk = max(total_disk - to_int(resource.get("free-hdd-space")), 0)
        self.history["cpu"].append(to_int(resource.get("cpu-load")))
        self.history["memory"].append(round((used_memory / total_memory) * 100, 2) if total_memory else 0)
        self.history["disk"].append(round((used_disk / total_disk) * 100, 2) if total_disk else 0)
        self.history["uplink"].append(wan_totals["up"])
        self.history["downlink"].append(wan_totals["down"])
        self.history["timestamps"].append(int(time.time()))
        snapshot = {
            "status": "ok",
            "updatedAt": format_iso_now(),
            "error": None,
            "meta": {
                "target": PANEL_TARGET,
                "routerHost": ROUTER_HOST,
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
                "connectionProtocolPollSeconds": CONNECTION_PROTOCOL_POLL_SECONDS,
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
            },
            "overview": self.build_overview(rest, ssh, terminals["terminalCount"], wan_totals),
            "interfaces": interfaces,
            "pppoe": pppoe,
            "terminals": terminals["terminals"],
            "arp": {"items": terminals["arp"], "alerts": terminals["arpAlerts"]},
            "dhcp": self.build_dhcp(rest),
            "connections": {
                "total": ssh["counts"]["all"],
                "tcp": ssh["counts"]["tcp"],
                "udp": ssh["counts"]["udp"],
                "icmp": ssh["counts"]["icmp"],
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
            },
            "dns": self.build_dns(rest),
            "security": self.build_security(rest),
            "loadBalance": self.build_load_balance(rest, distribution),
            "routes": self.build_routes(rest),
            "logs": self.build_logs(rest),
        }
        return self.apply_ip_aliases_to_snapshot(snapshot, dict(self.ip_aliases))

    def update_state(self):
        snapshot = self.build_snapshot(self.merge_rest_bundle(), self.merge_connection_bundle())
        with self.lock:
            self.state = snapshot

    def realtime_loop(self):
        while True:
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
                self.update_state()
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
            started_at = time.time()
            try:
                protocol_counts = self.fetch_connection_protocol_counts()
                duration = round(time.time() - started_at, 2)
                now = format_iso_now()
                with self.lock:
                    self.connection_summary["counts"].update(protocol_counts)
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
            elapsed = time.time() - started_at
            time.sleep(max(0, CONNECTION_PROTOCOL_POLL_SECONDS - elapsed))

    def static_loop(self):
        while True:
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
            started_at = time.time()
            try:
                detail = self.fetch_connection_detail()
                detail_rest = self.fetch_rest_bundle(DETAIL_REST_ENDPOINTS)
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
            elapsed = time.time() - started_at
            time.sleep(max(0, CONNECTION_DETAIL_POLL_SECONDS - elapsed))

    def start(self):
        for target in (self.slow_rest_loop, self.static_loop, self.connection_detail_loop, self.realtime_loop, self.connection_protocol_loop):
            thread = threading.Thread(target=target, daemon=True)
            thread.start()

    def get_state(self):
        with self.lock:
            return copy.deepcopy(self.state)

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
        panel_files = [
            file_mtime_summary(BASE_DIR / "app.py"),
            file_mtime_summary(PUBLIC_DIR / "index.html"),
            file_mtime_summary(PUBLIC_DIR / "layout-whitespace-patch.js"),
            file_mtime_summary(PUBLIC_DIR / "readonly-diagnostics.js"),
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


collector = Collector()


class Handler(BaseHTTPRequestHandler):
    server_version = "ROSiKuaiPanel/1.0"

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/snapshot":
            return self.send_json(collector.get_state())
        if parsed.path == "/api/dns-static":
            params = parse_qs(parsed.query)
            offset = to_int((params.get("offset") or [0])[0], 0)
            limit = to_int((params.get("limit") or [DNS_STATIC_PAGE_LIMIT])[0], DNS_STATIC_PAGE_LIMIT)
            rows = collector.fetch_dns_static_page(offset=offset, limit=limit)
            total_count = collector.get_dns_static_total_count()
            normalized_rows = [
                {
                    "name": item.get("name") or item.get("regexp", "-"),
                    "type": item.get("type", "-"),
                    "value": item.get("address") or item.get("cname") or item.get("text") or "-",
                    "ttl": item.get("ttl", "-"),
                    "comment": item.get("comment", ""),
                    "disabled": to_bool(item.get("disabled")),
                }
                for item in rows
            ]
            return self.send_json(
                {
                    "totalCount": total_count,
                    "offset": max(offset, 0),
                    "limit": max(1, min(limit, DNS_STATIC_MAX_PAGE_LIMIT)),
                    "visibleRuleCount": len(normalized_rows),
                    "rows": normalized_rows,
                }
            )
        if parsed.path == "/api/health":
            state = collector.get_state()
            return self.send_json({"status": state.get("status"), "updatedAt": state.get("updatedAt")})
        if parsed.path == "/api/readonly-diagnostics":
            params = parse_qs(parsed.query)
            force_refresh = (params.get("refresh") or ["0"])[0] in {"1", "true", "yes"}
            return self.send_json(collector.get_readonly_diagnostics(force_refresh=force_refresh))
        self.serve_static(parsed.path)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/ip-alias":
            try:
                payload = self.read_json_body()
                result = collector.update_ip_alias(payload.get("ip"), payload.get("name"))
                return self.send_json({"ok": True, **result})
            except ValueError as exc:
                return self.send_json({"ok": False, "error": str(exc)}, status=400)
            except Exception as exc:
                return self.send_json({"ok": False, "error": str(exc)}, status=500)
        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        return

    def read_json_body(self):
        content_length = min(to_int(self.headers.get("Content-Length"), 0), 16384)
        if content_length <= 0:
            return {}
        body = self.rfile.read(content_length)
        if not body:
            return {}
        try:
            return json.loads(body.decode("utf-8"))
        except Exception as exc:
            raise ValueError("璇锋眰浣撲笉鏄悎娉?JSON") from exc

    def send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def serve_static(self, path):
        clean = unquote(path)
        file_path = (PUBLIC_DIR / clean.lstrip("/")).resolve() if clean not in {"", "/"} else (PUBLIC_DIR / "index.html").resolve()
        try:
            if PUBLIC_DIR.resolve() not in file_path.parents and file_path != (PUBLIC_DIR / "index.html").resolve():
                raise FileNotFoundError
            if not file_path.exists() or file_path.is_dir():
                raise FileNotFoundError
            body = file_path.read_bytes()
            mime = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
            self.send_response(200)
            self.send_header("Content-Type", f"{mime}; charset=utf-8" if mime.startswith("text/") else mime)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
        except FileNotFoundError:
            self.send_response(404)
            self.end_headers()


def main():
    collector.start()
    server = ThreadingHTTPServer((PANEL_BIND, PANEL_PORT), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()

