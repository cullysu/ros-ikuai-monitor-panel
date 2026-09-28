import os
from collections import defaultdict

from ros_panel.model import (
    ACTION_SEVERITY_RANK,
    as_dict,
    as_list,
    collector_status_message,
    compact_text,
    format_iso_now,
)
from ros_panel.util import to_int


ACTION_QUEUE_LIMIT = max(1, int(os.getenv("ROS_PANEL_ACTION_QUEUE_LIMIT", "24")))


def build_semantic_triage(snapshot):
    snapshot = as_dict(snapshot)
    meta = as_dict(snapshot.get("meta"))
    overview = as_dict(snapshot.get("overview"))
    connections = as_dict(snapshot.get("connections"))
    dns = as_dict(snapshot.get("dns"))
    routes = as_dict(snapshot.get("routes"))
    load_balance = as_dict(snapshot.get("loadBalance"))
    arp = as_dict(snapshot.get("arp"))
    dhcp = as_dict(snapshot.get("dhcp"))
    security = as_dict(snapshot.get("security"))
    actions = []
    seen_ids = set()

    def add_action(action_id, severity, domain, title, summary, next_step, source, evidence=None):
        if action_id in seen_ids:
            return
        seen_ids.add(action_id)
        actions.append(
            {
                "id": action_id,
                "severity": severity,
                "domain": domain,
                "title": title,
                "summary": compact_text(summary, 240),
                "nextStep": compact_text(next_step, 240),
                "source": source,
                "readOnly": True,
                "actionType": "manual_review",
                "priority": len(actions) + 1,
                "evidence": evidence or [],
            }
        )

    snapshot_status = snapshot.get("status")
    if snapshot_status and snapshot_status != "ok":
        status_message = collector_status_message(snapshot_status, snapshot.get("error"))
        add_action(
            "collector.snapshot_status",
            "warning" if snapshot_status == "starting" else "critical",
            "collector",
            "Snapshot collection is not healthy",
            status_message,
            "Check collection errors first; this queue does not attempt an automatic repair.",
            "snapshot.status",
            [
                {"label": "status", "value": snapshot_status},
                {"label": "message", "value": status_message},
                {"label": "error", "value": compact_text(snapshot.get("error"))},
            ],
        )

    collection_sources = [
        ("meta.realtimeError", meta.get("realtimeError"), meta.get("realtimeLastErrorAt"), "critical", "Realtime REST collection has errors"),
        ("meta.slowRestError", meta.get("slowRestError"), meta.get("slowRestLastErrorAt"), "warning", "Slow REST collection has errors"),
        ("meta.staticError", meta.get("staticError"), meta.get("staticLastErrorAt"), "warning", "Static REST collection has errors"),
        ("connections.protocolError", connections.get("protocolError"), connections.get("protocolLastErrorAt"), "warning", "Connection protocol summary has errors"),
        ("connections.detailError", connections.get("detailError"), connections.get("detailLastErrorAt"), "warning", "Connection detail collection has errors"),
    ]
    for source, error, last_error_at, severity, title in collection_sources:
        if error:
            add_action(
                source.replace(".", "_").lower(),
                severity,
                "collector",
                title,
                compact_text(error),
                "Verify the read-only collection path and credentials before trusting dependent widgets.",
                source,
                [{"label": "lastErrorAt", "value": last_error_at or "-"}, {"label": "error", "value": compact_text(error)}],
            )

    endpoint_failure_sources = [
        ("meta.realtimeEndpointFailures", "Realtime REST endpoint failures"),
        ("meta.slowRestEndpointFailures", "Slow REST endpoint failures"),
        ("meta.staticEndpointFailures", "Static REST endpoint failures"),
        ("meta.detailEndpointFailures", "Detail REST endpoint failures"),
    ]
    for source, title in endpoint_failure_sources:
        failures = as_dict(meta.get(source.split(".")[-1]))
        if failures:
            failed_names = sorted(str(name) for name in failures.keys())
            add_action(
                source.replace(".", "_").lower(),
                "warning",
                "collector",
                title,
                f"{len(failed_names)} endpoint(s) reported collection failures.",
                "Open the collector logs or endpoint failure details; keep remediation manual.",
                source,
                [{"label": "count", "value": len(failed_names)}, {"label": "sample", "value": ", ".join(failed_names[:5])}],
            )

    wan_lines = as_list(snapshot.get("wan")) or as_list(snapshot.get("pppoe"))
    running_wan = [row for row in wan_lines if as_dict(row).get("running")]
    offline_wan = [as_dict(row) for row in wan_lines if not as_dict(row).get("running")]
    if wan_lines and not running_wan:
        add_action(
            "wan.no_running_lines",
            "critical",
            "wan",
            "No WAN line is running",
            "All known WAN lines are currently reported offline.",
            "Confirm upstream link state and routing from the read-only WAN and route views.",
            "snapshot.wan",
            [{"label": "wanCount", "value": len(wan_lines)}],
        )
    elif offline_wan:
        add_action(
            "wan.offline_lines",
            "warning",
            "wan",
            "Some WAN lines are offline",
            f"{len(offline_wan)} of {len(wan_lines)} WAN line(s) are not running.",
            "Review the affected line inventory and upstream access before changing policy.",
            "snapshot.wan",
            [{"label": "offline", "value": ", ".join(compact_text(row.get("name") or row.get("lineId") or "-") for row in offline_wan[:5])}],
        )

    default_routes = as_list(routes.get("defaultRoutes"))
    active_defaults = [row for row in default_routes if as_dict(row).get("active") and not as_dict(row).get("disabled")]
    if default_routes and not active_defaults:
        add_action(
            "routes.no_active_default",
            "critical",
            "routes",
            "No active default route",
            "Default routes exist, but none are active and enabled.",
            "Use the route inventory to identify inactive gateways; do not auto-edit routes from this panel.",
            "snapshot.routes.defaultRoutes",
            [{"label": "defaultRoutes", "value": len(default_routes)}],
        )
    elif wan_lines and not default_routes:
        add_action(
            "routes.no_default_visible",
            "warning",
            "routes",
            "No default route is visible",
            "WAN lines are present but the snapshot does not include a default route.",
            "Check route collection freshness and the RouterOS route table manually.",
            "snapshot.routes.defaultRoutes",
            [{"label": "wanCount", "value": len(wan_lines)}],
        )

    distribution = [as_dict(row) for row in as_list(load_balance.get("distribution"))]
    if len(distribution) > 1 and any(to_int(row.get("share")) >= 70 for row in distribution):
        dominant = max(distribution, key=lambda row: to_int(row.get("share")))
        add_action(
            "wan.traffic_skew",
            "info",
            "wan",
            "WAN traffic distribution is skewed",
            f"{dominant.get('name', '-')} is carrying about {dominant.get('share', 0)}% of observed WAN traffic.",
            "Treat this as an observation unless it persists under representative traffic.",
            "snapshot.loadBalance.distribution",
            [{"label": "line", "value": dominant.get("name", "-")}, {"label": "share", "value": dominant.get("share", 0)}],
        )

    if dns and not dns.get("running"):
        add_action(
            "dns.remote_requests_disabled",
            "warning",
            "dns",
            "RouterOS DNS remote requests are disabled",
            "The RouterOS DNS service is not accepting remote requests according to the snapshot.",
            "Confirm whether this is intentional for the current topology before changing DNS settings.",
            "snapshot.dns.running",
            [{"label": "running", "value": dns.get("running")}],
        )
    if dns and not as_list(dns.get("servers")):
        add_action(
            "dns.no_servers",
            "warning",
            "dns",
            "No upstream DNS servers are visible",
            "The DNS snapshot does not list upstream servers.",
            "Verify DNS configuration through the normal RouterOS console if clients report resolution failures.",
            "snapshot.dns.servers",
            [],
        )
    cache_size = to_int(dns.get("cacheSize"))
    cache_used = to_int(dns.get("cacheUsed"))
    if cache_size and cache_used:
        cache_usage = (cache_used / cache_size) * 100
        if cache_usage >= 90:
            add_action(
                "dns.cache_pressure",
                "warning",
                "dns",
                "DNS cache usage is high",
                f"DNS cache usage is about {round(cache_usage, 1)}%.",
                "Observe whether resolution latency or cache evictions correlate before tuning cache size.",
                "snapshot.dns.cacheUsed",
                [{"label": "cacheUsed", "value": cache_used}, {"label": "cacheSize", "value": cache_size}],
            )

    ipv6_dhcp_unbound = [
        row for row in as_list(dns.get("ipv6DhcpClients"))
        if str(as_dict(row).get("status", "")).lower() not in {"bound", "running"}
    ]
    if ipv6_dhcp_unbound:
        add_action(
            "ipv6.dhcp_clients_unbound",
            "warning",
            "ipv6",
            "Some DHCPv6 clients are not bound",
            f"{len(ipv6_dhcp_unbound)} DHCPv6 client(s) are not bound.",
            "Review IPv6 prefix delegation and upstream state from the IPv6 diagnostics view.",
            "snapshot.dns.ipv6DhcpClients",
            [{"label": "interfaces", "value": ", ".join(str(as_dict(row).get("interface", "-")) for row in ipv6_dhcp_unbound[:5])}],
        )

    high_pools = []
    for pool in as_list(dhcp.get("pools")):
        pool = as_dict(pool)
        usage = float(pool.get("usage") or 0)
        if usage >= 85:
            high_pools.append(pool)
    if high_pools:
        max_usage = max(float(pool.get("usage") or 0) for pool in high_pools)
        add_action(
            "dhcp.pool_pressure",
            "critical" if max_usage >= 95 else "warning",
            "dhcp",
            "DHCP pool capacity is tight",
            f"{len(high_pools)} DHCP pool(s) are at or above 85% usage.",
            "Review lease inventory and pool sizing manually before making address-plan changes.",
            "snapshot.dhcp.pools",
            [{"label": "pools", "value": ", ".join(str(pool.get("name", "-")) for pool in high_pools[:5])}],
        )

    arp_alerts = as_list(arp.get("alerts"))
    if arp_alerts:
        severity_counts = defaultdict(int)
        confidence_counts = defaultdict(int)
        for alert in arp_alerts:
            alert = as_dict(alert)
            severity_counts[alert.get("severity") or "critical"] += 1
            confidence_counts[alert.get("confidence") or "unknown"] += 1
        top_severity = min(
            (str(as_dict(alert).get("severity") or "critical") for alert in arp_alerts),
            key=lambda value: ACTION_SEVERITY_RANK.get(value, 3),
        )
        critical_count = severity_counts.get("critical", 0)
        warning_count = severity_counts.get("warning", 0)
        info_count = severity_counts.get("info", 0)
        if critical_count:
            title = "Active ARP identity conflict evidence detected"
            next_step = "Investigate active duplicate-IP evidence first; confirm with switch/AP and terminal evidence before changing address plans."
        else:
            title = "ARP identity movement needs review"
            next_step = "Treat stale or failed ARP movement as lower-confidence history; look for fresh duplicate-IP evidence before declaring an active conflict."
        add_action(
            "arp.identity_conflicts",
            top_severity,
            "terminals",
            title,
            (
                f"{len(arp_alerts)} ARP alert(s): critical={critical_count}, "
                f"warning={warning_count}, info={info_count}."
            ),
            next_step,
            "snapshot.arp.alerts",
            [
                {"label": "sample", "value": compact_text(as_dict(arp_alerts[0]).get("detail") or as_dict(arp_alerts[0]).get("value"))},
                {"label": "sampleSeverity", "value": as_dict(arp_alerts[0]).get("severity", "-")},
                {"label": "sampleConfidence", "value": as_dict(arp_alerts[0]).get("confidence", "-")},
                {"label": "confidenceSummary", "value": ", ".join(f"{key}:{confidence_counts[key]}" for key in sorted(confidence_counts))},
            ],
        )

    interface_issues = []
    for row in as_list(snapshot.get("interfaces")):
        row = as_dict(row)
        drop_total = to_int(row.get("dropTotal"), to_int(row.get("rxDrop")) + to_int(row.get("txDrop")))
        error_total = to_int(row.get("errorTotal"), to_int(row.get("rxError")) + to_int(row.get("txError")))
        drop_delta = to_int(row.get("dropDelta"))
        error_delta = to_int(row.get("errorDelta"))
        packet_delta = to_int(row.get("packetDelta"))
        try:
            loss_rate = float(row.get("lossRate")) if row.get("lossRate") is not None else None
        except Exception:
            loss_rate = None
        issue_total = drop_total + error_total
        recent_total = drop_delta + error_delta
        if issue_total > 0 or recent_total > 0:
            is_derived = bool(row.get("isDerivedInterface") or row.get("qualityEvidenceLevel") == "logical")
            weighted_recent = recent_total * (0.35 if is_derived else 1.0)
            weighted_total = issue_total * (0.35 if is_derived else 1.0)
            interface_issues.append(
                {
                    "row": row,
                    "issueTotal": issue_total,
                    "dropTotal": drop_total,
                    "errorTotal": error_total,
                    "recentTotal": recent_total,
                    "dropDelta": drop_delta,
                    "errorDelta": error_delta,
                    "packetDelta": packet_delta,
                    "lossRate": loss_rate,
                    "isDerived": is_derived,
                    "sortKey": (weighted_recent, loss_rate if loss_rate is not None else -1, weighted_total),
                }
            )
    if interface_issues:
        interface_issues.sort(key=lambda item: item["sortKey"], reverse=True)
        top_issue = interface_issues[0]
        primary_count = sum(1 for item in interface_issues if not item["isDerived"])
        logical_count = len(interface_issues) - primary_count
        if top_issue["lossRate"] is None:
            loss_text = "unknown"
        else:
            loss_value_text = f"{top_issue['lossRate'] * 100:.4f}".rstrip("0").rstrip(".")
            loss_text = f"{loss_value_text}%"
        add_action(
            "interfaces.error_counters",
            "warning",
            "interfaces",
            "Interface drop/error evidence needs review",
            (
                f"{primary_count} primary interface(s) and {logical_count} logical/down-ranked interface(s) "
                f"have drop/error evidence. Top {top_issue['row'].get('name', '-')}: "
                f"cumulative drop/error={top_issue['dropTotal']}/{top_issue['errorTotal']}, "
                f"latest +{top_issue['dropDelta']}/+{top_issue['errorDelta']}, "
                f"recent loss rate={loss_text}."
            ),
            "Review recent delta and loss-rate evidence first; treat VLAN/macvlan logical pairs as lower-confidence evidence unless their parent also shows fresh deltas.",
            "snapshot.interfaces",
            [
                {"label": "topInterface", "value": top_issue["row"].get("name", "-")},
                {"label": "cumulativeDropError", "value": f"{top_issue['dropTotal']}/{top_issue['errorTotal']}"},
                {"label": "latestDropErrorDelta", "value": f"+{top_issue['dropDelta']}/+{top_issue['errorDelta']}"},
                {"label": "recentLossRate", "value": loss_text},
                {"label": "logicalDownranked", "value": logical_count},
            ],
        )

    cpu_load = to_int(overview.get("cpuLoad"))
    memory_usage = float(overview.get("memoryUsage") or 0)
    disk_usage = float(overview.get("diskUsage") or 0)
    resource_pressure = []
    if cpu_load >= 90:
        resource_pressure.append(("cpu", "critical", cpu_load))
    elif cpu_load >= 75:
        resource_pressure.append(("cpu", "warning", cpu_load))
    if memory_usage >= 90:
        resource_pressure.append(("memory", "critical", round(memory_usage, 1)))
    elif memory_usage >= 80:
        resource_pressure.append(("memory", "warning", round(memory_usage, 1)))
    if disk_usage >= 90:
        resource_pressure.append(("disk", "critical", round(disk_usage, 1)))
    elif disk_usage >= 80:
        resource_pressure.append(("disk", "warning", round(disk_usage, 1)))
    if resource_pressure:
        severity = "critical" if any(item[1] == "critical" for item in resource_pressure) else "warning"
        add_action(
            "system.resource_pressure",
            severity,
            "system",
            "Router resource pressure is elevated",
            ", ".join(f"{name}={value}%" for name, _, value in resource_pressure),
            "Correlate with traffic and logs before scheduling maintenance or tuning.",
            "snapshot.overview",
            [{"label": name, "value": value} for name, _, value in resource_pressure],
        )

    threshold_level = connections.get("thresholdLevel")
    if threshold_level in {"danger", "warning"}:
        add_action(
            "connections.tracking_pressure",
            "critical" if threshold_level == "danger" else "warning",
            "connections",
            "Connection tracking pressure is elevated",
            f"Connection total is {connections.get('total', 0)} with threshold level {threshold_level}.",
            "Use top IP and active connection views to identify heavy clients before changing limits.",
            "snapshot.connections",
            [{"label": "total", "value": connections.get("total", 0)}, {"label": "tcp", "value": connections.get("tcp")}],
        )

    top_terminal = next((as_dict(row) for row in as_list(snapshot.get("terminals")) if to_int(as_dict(row).get("connections")) >= 1000), None)
    if top_terminal:
        add_action(
            "terminals.high_connection_client",
            "info",
            "terminals",
            "A terminal has a high connection count",
            f"{top_terminal.get('displayName') or top_terminal.get('hostname') or top_terminal.get('ip')} has {top_terminal.get('connections')} tracked connection(s).",
            "Review whether this is expected workload, download software, P2P, or a noisy client.",
            "snapshot.terminals",
            [{"label": "ip", "value": top_terminal.get("ip", "-")}, {"label": "connections", "value": top_terminal.get("connections", 0)}],
        )

    security_alerts = as_list(security.get("alerts"))
    if security_alerts:
        add_action(
            "security.log_alerts",
            "warning" if len(security_alerts) >= 10 else "info",
            "security",
            "Security-related log alerts are present",
            f"{len(security_alerts)} firewall/warning/error log item(s) are visible.",
            "Review log context and rule hit counters; this endpoint only queues investigation hints.",
            "snapshot.security.alerts",
            [{"label": "sample", "value": compact_text(as_dict(security_alerts[0]).get("message"))}],
        )

    actions.sort(key=lambda row: (ACTION_SEVERITY_RANK.get(row["severity"], 99), row["priority"]))
    actions = actions[:ACTION_QUEUE_LIMIT]
    for index, action in enumerate(actions, start=1):
        action["priority"] = index
    counts = {severity: 0 for severity in ACTION_SEVERITY_RANK}
    for action in actions:
        counts[action["severity"]] = counts.get(action["severity"], 0) + 1
    status = "critical" if counts.get("critical") else "warning" if counts.get("warning") else "ok"
    return {
        "status": status,
        "readOnly": True,
        "generatedAt": format_iso_now(),
        "sourceUpdatedAt": snapshot.get("updatedAt"),
        "sourceStatus": snapshot.get("status"),
        "limit": ACTION_QUEUE_LIMIT,
        "counts": counts,
        "topPriority": actions[0] if actions else None,
        "queue": actions,
        "actionQueue": actions,
        "guardrails": {
            "routerosWrites": False,
            "usesCachedSnapshot": True,
            "mutatingEndpoints": False,
        },
    }
