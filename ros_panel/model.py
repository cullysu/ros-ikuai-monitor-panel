import ipaddress
import re
import time
from collections import defaultdict

from ros_panel.util import to_int

CGNAT_NETWORK = ipaddress.ip_network("100.64.0.0/10")


ARP_ACTIVE_STATUSES = {
    "active",
    "complete",
    "delay",
    "permanent",
    "probe",
    "published",
    "reachable",
    "static",
}
ARP_STALE_STATUSES = {"expired", "failed", "incomplete", "stale", "unreachable"}


def arp_evidence_state(status):
    text = str(status or "").strip().lower()
    if text in ARP_ACTIVE_STATUSES:
        return "active"
    if text in ARP_STALE_STATUSES:
        return "stale"
    return "unknown"


def arp_status_summary(entries):
    counts = defaultdict(int)
    for entry in entries:
        counts[str(entry.get("status") or "unknown").strip().lower() or "unknown"] += 1
    return ", ".join(f"{key}:{counts[key]}" for key in sorted(counts))


def make_arp_alert(kind, value, entries, unique_key):
    rows = [entry for entry in entries if entry.get(unique_key)]
    unique_values = sorted({str(entry.get(unique_key)) for entry in rows}, key=ip_sort_key if unique_key == "ip" else None)
    active_values = sorted(
        {str(entry.get(unique_key)) for entry in rows if entry.get("evidenceState") == "active"},
        key=ip_sort_key if unique_key == "ip" else None,
    )
    stale_count = sum(1 for entry in rows if entry.get("evidenceState") == "stale")
    unknown_count = sum(1 for entry in rows if entry.get("evidenceState") == "unknown")
    if kind == "IP conflict":
        if len(active_values) > 1:
            severity, confidence, active_conflict = "critical", "high", True
        elif active_values:
            severity, confidence, active_conflict = "warning", "medium", False
        else:
            severity, confidence, active_conflict = "info", "low", False
    else:
        if len(active_values) > 1:
            severity, confidence, active_conflict = "warning", "medium", False
        elif active_values:
            severity, confidence, active_conflict = "info", "low", False
        else:
            severity, confidence, active_conflict = "info", "low", False
    return {
        "kind": kind,
        "value": value,
        "detail": ", ".join(unique_values),
        "severity": severity,
        "confidence": confidence,
        "activeConflict": active_conflict,
        "activeEvidenceCount": len(active_values),
        "staleEvidenceCount": stale_count,
        "unknownEvidenceCount": unknown_count,
        "statusSummary": arp_status_summary(rows),
        "interpretation": "active duplicate evidence" if active_conflict else "historical or lower-confidence identity movement",
    }


def interface_is_derived(name, iface_type):
    type_text = str(iface_type or "").strip().lower()
    name_text = str(name or "").strip().lower()
    return type_text in {"vlan", "macvlan"} or name_text.startswith(("vlan", "macvlan"))


def interface_parent_hint(item):
    item = item if isinstance(item, dict) else {}
    own_name = str(item.get("name") or "").strip()
    for key in ("interface", "master-interface", "actual-interface", "parent"):
        value = str(item.get(key) or "").strip()
        if value and value != own_name:
            return value
    return None


def interface_logical_pair_key(item):
    item = item if isinstance(item, dict) else {}
    name = str(item.get("name") or "").strip().lower()
    match = re.fullmatch(r"(?:vlan|macvlan)(.+)", name)
    if match and match.group(1):
        return f"logical-pair:{match.group(1)}"
    return None


def interface_quality_group_key(item):
    item = item if isinstance(item, dict) else {}
    parent = interface_parent_hint(item)
    logical_pair = interface_logical_pair_key(item)
    iface_type = str(item.get("type") or "").strip().lower() or "interface"
    vlan_id = str(item.get("vlan-id") or "").strip()
    own_name = str(item.get("name") or "").strip()
    if parent:
        return ":".join(part for part in (parent, iface_type, vlan_id or own_name) if part)
    if logical_pair:
        return logical_pair
    return own_name or iface_type


def format_iso_now():
    return time.strftime("%Y-%m-%d %H:%M:%S")


def parse_ping_latency_ms(output):
    text = str(output or "")
    patterns = [
        r"(?:time|时间)\s*[=<]\s*<?\s*(\d+(?:\.\d+)?)\s*ms",
        r"(?:Average|平均)[^\d=]*(?:=)?\s*<?\s*(\d+(?:\.\d+)?)\s*ms",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return max(1, int(round(float(match.group(1)))))
    return None


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


def line_layout_tier(count):
    count = max(0, to_int(count))
    if count <= 0:
        return "none"
    if count == 1:
        return "single"
    if count <= 3:
        return "few"
    if count <= 6:
        return "multi"
    return "dense"


def scale_bucket(count):
    count = max(0, to_int(count))
    if count <= 0:
        return "none"
    if count == 1:
        return "single"
    if count <= 6:
        return "small"
    if count <= 24:
        return "medium"
    if count <= 100:
        return "large"
    return "fleet"


def list_scale_meta(total_count, shown_count=None, limit=None, sampled=False, sample_method="", sorted_by="", grouped_by=None):
    total = max(0, to_int(total_count))
    shown = total if shown_count is None else max(0, to_int(shown_count))
    effective_limit = limit if limit is not None else shown
    return {
        "actualCount": total,
        "totalCount": total,
        "shownCount": shown,
        "limit": max(0, to_int(effective_limit)),
        "hasMore": shown < total,
        "sampled": bool(sampled),
        "sampleMethod": sample_method,
        "sortedBy": sorted_by,
        "groupedBy": list(grouped_by or []),
        "bucket": scale_bucket(total),
    }


ACTION_SEVERITY_RANK = {"critical": 0, "warning": 1, "info": 2}


def as_list(value):
    return value if isinstance(value, list) else []


def as_dict(value):
    return value if isinstance(value, dict) else {}


def compact_text(value, limit=180):
    text = str(value or "").strip()
    if len(text) <= limit:
        return text
    return text[: max(0, limit - 3)] + "..."


def collector_status_message(status, error=None):
    error_text = compact_text(error, 240)
    if error_text:
        return error_text
    normalized = str(status or "").strip().lower()
    if normalized == "ok":
        return "采集正常。"
    if normalized == "starting":
        return "采集服务正在启动，正在等待首次 RouterOS 数据。"
    if normalized == "needs_config":
        return "RouterOS SSH 连接未配置，请在登录页填写 RouterOS 主机、账号和密码。"
    if normalized == "error":
        return "采集服务返回异常，但没有提供错误详情；请刷新页面或重新测试 RouterOS 连接。"
    status_label = normalized or "unknown"
    return f"采集状态为 {status_label}，但未提供错误详情；请刷新页面或重新测试 RouterOS 连接。"


def normalize_collector_snapshot_status(snapshot):
    if not isinstance(snapshot, dict):
        return snapshot
    status = str(snapshot.get("status") or "unknown").strip() or "unknown"
    message = collector_status_message(status, snapshot.get("error"))
    snapshot["status"] = status
    snapshot["statusMessage"] = message
    meta = snapshot.setdefault("meta", {})
    if isinstance(meta, dict):
        meta["collectorStatus"] = status
        meta["collectorStatusMessage"] = message
    return snapshot
