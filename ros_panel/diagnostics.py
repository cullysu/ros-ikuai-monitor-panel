import ipaddress
import json
import os
import re
import socket
import time
from pathlib import Path
from urllib.parse import urlparse

import requests

from ros_panel.model import CGNAT_NETWORK
from ros_panel.router_config import ROUTER_HOST
from ros_panel.util import to_bool, to_int


def env_config_rows(name):
    raw = str(os.getenv(name, "") or "").strip()
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except Exception:
        parsed = None
    if isinstance(parsed, dict):
        parsed = [parsed]
    if isinstance(parsed, list):
        return [item for item in parsed if isinstance(item, dict)]

    rows = []
    for index, part in enumerate(raw.split(","), start=1):
        item = part.strip()
        if not item:
            continue
        if "=" in item:
            label, address = item.split("=", 1)
        else:
            label, address = f"DNS {index}", item
        rows.append({"name": label.strip(), "address": address.strip()})
    return rows


def compact_config_rows(rows, *, address_key="address"):
    compacted = []
    seen = set()
    for raw in rows:
        row = raw if isinstance(raw, dict) else {}
        address = str(row.get(address_key) or row.get("url") or "").strip()
        if not address or address in seen:
            continue
        seen.add(address)
        name = str(row.get("name") or row.get("label") or address).strip() or address
        compacted.append({"name": name[:80], address_key: address})
    return compacted


READONLY_DIAGNOSTIC_CACHE_TTL = int(os.getenv("ROS_PANEL_READONLY_DIAGNOSTIC_CACHE_TTL", "45"))
READONLY_DIAGNOSTIC_DNS_TIMEOUT = float(os.getenv("ROS_PANEL_READONLY_DIAGNOSTIC_DNS_TIMEOUT", "1.2"))
READONLY_DIAGNOSTIC_HTTP_TIMEOUT = float(os.getenv("ROS_PANEL_READONLY_DIAGNOSTIC_HTTP_TIMEOUT", "2.5"))
READONLY_DIAGNOSTIC_WORKERS = int(os.getenv("ROS_PANEL_READONLY_DIAGNOSTIC_WORKERS", "24"))
READONLY_DIAGNOSTIC_TOTAL_TIMEOUT = float(os.getenv("ROS_PANEL_READONLY_DIAGNOSTIC_TOTAL_TIMEOUT", "8"))

READONLY_DNS_SERVERS = compact_config_rows(
    env_config_rows("ROS_PANEL_READONLY_DNS_SERVERS")
    or [
        {
            "name": os.getenv("ROS_PANEL_READONLY_ROUTER_DNS_NAME", "RouterOS DNS"),
            "address": os.getenv("ROS_PANEL_READONLY_ROUTER_DNS", ROUTER_HOST),
        },
        {
            "name": os.getenv("ROS_PANEL_READONLY_OPENWRT_DNS_NAME", "OpenWrt DNS"),
            "address": os.getenv("ROS_PANEL_READONLY_OPENWRT_DNS", ""),
        },
    ]
)

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
READONLY_NIKKI_CONTROLLER = os.getenv("ROS_PANEL_READONLY_NIKKI_CONTROLLER", "").strip()


CUSTOM_NAME_MAX_LENGTH = int(os.getenv("ROS_PANEL_CUSTOM_NAME_MAX_LENGTH", "48"))


def address_is_globalish(address_text):
    try:
        text = str(address_text or "").strip()
        if not text:
            return False
        ip_obj = ipaddress.ip_interface(text).ip if "/" in text else ipaddress.ip_address(text)
        if ip_obj.version == 4:
            if (
                ip_obj.is_private
                or ip_obj in CGNAT_NETWORK
                or ip_obj.is_loopback
                or ip_obj.is_link_local
                or ip_obj.is_multicast
                or ip_obj.is_unspecified
                or ip_obj.is_reserved
            ):
                return False
            return True
        if (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_multicast
            or ip_obj.is_unspecified
            or ip_obj.is_reserved
        ):
            return False
        return True
    except Exception:
        return False


def infer_wan_interface_names(rest, addresses_by_interface):
    interface_types = {row.get("name"): str(row.get("type", "")).lower() for row in rest.get("interfaces", [])}
    wan_names = {row.get("name") for row in rest.get("pppoe", []) if row.get("name")}
    wan_names.update(
        item.get("interface")
        for item in rest.get("dhcp_clients", [])
        if item.get("interface") and not to_bool(item.get("disabled"))
    )
    defaults = [
        row for row in rest.get("routes", [])
        if row.get("dst-address") == "0.0.0.0/0" and not to_bool(row.get("disabled"))
    ]
    for route in defaults:
        # `gateway` may be a plain next-hop IP; the active egress interface
        # only shows up in `immediate-gw` ("192.0.2.1%ether1"). Check both.
        for gateway_field in ("gateway", "immediate-gw"):
            gateway = str(route.get(gateway_field) or "").strip()
            if not gateway:
                continue
            gateway_name = gateway.split("%", 1)[1] if "%" in gateway else gateway
            if gateway_name in interface_types:
                wan_names.add(gateway_name)
    for iface_name, address_rows in addresses_by_interface.items():
        if not iface_name or iface_name in wan_names:
            continue
        iface_type = interface_types.get(iface_name, "")
        low_name = str(iface_name).lower()
        if iface_type in {"bridge", "loopback", "wireguard"}:
            continue
        if low_name.startswith(("bridge", "docker", "veth", "lo", "tailscale", "zerotier")):
            continue
        if any(address_is_globalish(item.get("address")) for item in address_rows):
            wan_names.add(iface_name)
    return {name for name in wan_names if name}


def build_distribution_from_lines(lines):
    rows = list(lines or [])
    total_rate = sum(max(0, to_int(row.get("upRate"))) + max(0, to_int(row.get("downRate"))) for row in rows)
    return [
        {
            "name": row.get("name", "-"),
            "share": round((((to_int(row.get("upRate")) + to_int(row.get("downRate"))) / total_rate) * 100), 2)
            if total_rate
            else 0,
            # Keep None through: a withheld rate (counter reset) must stay
            # withheld instead of posing as a 0 sample.
            "upRate": row.get("upRate"),
            "downRate": row.get("downRate"),
            "status": row.get("status", "-"),
        }
        for row in rows
    ]


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
            headers={"User-Agent": "RouterOSTriagePanel-Readonly-Diagnostics/1.0"},
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
            headers={"User-Agent": "RouterOSTriagePanel-Readonly-Diagnostics/1.0"},
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
        "disabled": False,
        "version": None,
        "providers": [],
        "providerCount": 0,
        "ruleCount": 0,
        "error": None,
    }
    if not READONLY_NIKKI_CONTROLLER:
        result["disabled"] = True
        result["error"] = "Nikki controller is not configured"
        return result
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
