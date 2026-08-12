"""Evidence-backed public health findings, isolated from the app entrypoint."""

from collections import defaultdict
import re

from panel_backend.time_contract import (
    enforce_public_timestamp_contract,
    optional_rfc3339_timestamp,
    utc_now_rfc3339,
)


def to_int(value, default=0):
    try:
        if value in ("", None):
            return default
        if isinstance(value, (int, float)):
            return int(value)
        text = str(value).strip().replace(" ", "")
        if not text:
            return default
        match = re.fullmatch(r"(-?\d+(?:\.\d+)?)([A-Za-z]+)?", text)
        if match:
            number = float(match.group(1))
            unit = (match.group(2) or "").upper()
            factors = {
                "BPS": 1,
                "K": 1024,
                "KB": 1000,
                "KIB": 1024,
                "KBPS": 1000,
                "M": 1024**2,
                "MB": 1000**2,
                "MIB": 1024**2,
                "MBPS": 1000**2,
                "G": 1024**3,
                "GB": 1000**3,
                "GIB": 1024**3,
                "GBPS": 1000**3,
                "T": 1024**4,
                "TB": 1000**4,
                "TIB": 1024**4,
                "TBPS": 1000**4,
            }
            if unit in factors:
                return int(number * factors[unit])
        return int(float(text))
    except Exception:
        return default


def format_iso_now():
    return utc_now_rfc3339()


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


HEALTH_PUBLIC_TEXT_BLOCKLIST = re.compile(
    r"(?:https?://|\b(?:password|passwd|token|secret|authorization)\s*[=:]|\btraceback\b|\bexception\b|\bstack\b|/ip/[a-z0-9_/-]+)",
    re.IGNORECASE,
)


def health_public_text(value, limit=160):
    """Keep health findings operational without publishing raw collector diagnostics."""
    if value is None or isinstance(value, (int, float, bool)):
        return value
    text = " ".join(str(value).replace("\x00", "").split())
    if HEALTH_PUBLIC_TEXT_BLOCKLIST.search(text):
        return "Redacted internal diagnostic detail."
    return compact_text(text, limit)


def health_public_evidence(evidence):
    safe = []
    for item in as_list(evidence)[:6]:
        row = as_dict(item)
        label = compact_text(row.get("label"), 80)
        if not label:
            continue
        value = health_public_text(row.get("value"), 160)
        if value is None:
            continue
        safe.append({"label": label, "value": value})
    return safe


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
    snapshot = enforce_public_timestamp_contract(snapshot)
    status = str(snapshot.get("status") or "unknown").strip() or "unknown"
    message = collector_status_message(status, snapshot.get("error"))
    snapshot["status"] = status
    snapshot["statusMessage"] = message
    meta = snapshot.setdefault("meta", {})
    if isinstance(meta, dict):
        meta["collectorStatus"] = status
        meta["collectorStatusMessage"] = message
    return snapshot


def build_health_findings(snapshot, *, findings_limit=20):
    snapshot = as_dict(enforce_public_timestamp_contract(snapshot))
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
                "title": health_public_text(title, 120),
                "summary": health_public_text(summary, 240),
                "source": health_public_text(source, 120),
                "readOnly": True,
                "priority": len(actions) + 1,
                "evidence": health_public_evidence(evidence),
            }
        )

    snapshot_status = snapshot.get("status")
    if snapshot_status and snapshot_status != "ok":
        status_message = (
            collector_status_message(snapshot_status)
            if snapshot_status == "starting"
            else "采集器报告只读采集状态异常。"
        )
        add_action(
            "collector.snapshot_status",
            "warning" if snapshot_status == "starting" else "critical",
            "collector",
            "快照采集状态异常",
            status_message,
            "确认采集状态后，再判断依赖此快照的指标。",
            "snapshot.status",
            [
                {"label": "采集状态", "value": snapshot_status},
                {"label": "状态说明", "value": status_message},
                {"label": "内部错误", "value": "内部细节已隐藏" if snapshot.get("error") else None},
            ],
        )

    collection_sources = [
        ("meta.realtimeError", meta.get("realtimeError"), meta.get("realtimeLastErrorAt"), "critical", "实时 REST 采集异常"),
        ("meta.slowRestError", meta.get("slowRestError"), meta.get("slowRestLastErrorAt"), "warning", "低频 REST 采集异常"),
        ("meta.staticError", meta.get("staticError"), meta.get("staticLastErrorAt"), "warning", "静态 REST 采集异常"),
        ("connections.protocolError", connections.get("protocolError"), connections.get("protocolLastErrorAt"), "warning", "连接协议汇总采集异常"),
        ("connections.detailError", connections.get("detailError"), connections.get("detailLastErrorAt"), "warning", "连接明细采集异常"),
    ]
    for source, error, last_error_at, severity, title in collection_sources:
        if error:
            add_action(
                source.replace(".", "_").lower(),
                severity,
                "collector",
                title,
                "只读采集通道报告失败；内部诊断细节已隐藏。",
                "先核对只读采集路径和凭据，再判断依赖该通道的指标。",
                source,
                [
                    {"label": "最近失败", "value": last_error_at or "-"},
                    {"label": "内部错误", "value": "内部细节已隐藏"},
                ],
            )

    endpoint_failure_sources = [
        ("meta.realtimeEndpointFailures", "实时 REST 端点采集失败"),
        ("meta.slowRestEndpointFailures", "低频 REST 端点采集失败"),
        ("meta.staticEndpointFailures", "静态 REST 端点采集失败"),
        ("meta.detailEndpointFailures", "明细 REST 端点采集失败"),
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
                f"{len(failed_names)} 个端点报告采集失败。",
                "查看采集日志或端点失败明细；修复操作保持人工执行。",
                source,
                [{"label": "失败端点", "value": len(failed_names)}],
            )

    wan_lines = as_list(snapshot.get("wan")) or as_list(snapshot.get("pppoe"))
    running_wan = [row for row in wan_lines if as_dict(row).get("running")]
    offline_wan = [as_dict(row) for row in wan_lines if not as_dict(row).get("running")]
    if wan_lines and not running_wan:
        add_action(
            "wan.no_running_lines",
            "critical",
            "wan",
            "没有 WAN 线路处于运行状态",
            "当前所有已知 WAN 线路均报告离线。",
            "从只读 WAN 与路由视图核对上联链路和默认路由。",
            "snapshot.wan",
            [{"label": "WAN 线路", "value": len(wan_lines)}],
        )
    elif offline_wan:
        add_action(
            "wan.offline_lines",
            "warning",
            "wan",
            "部分 WAN 线路离线",
            f"{len(wan_lines)} 条 WAN 中有 {len(offline_wan)} 条未运行。",
            "调整策略前，先核对受影响线路和上联接入。",
            "snapshot.wan",
            [{"label": "离线线路", "value": ", ".join(compact_text(row.get("name") or row.get("lineId") or "-") for row in offline_wan[:5])}],
        )

    default_routes = as_list(routes.get("defaultRoutes"))
    active_defaults = [row for row in default_routes if as_dict(row).get("active") and not as_dict(row).get("disabled")]
    if default_routes and not active_defaults:
        add_action(
            "routes.no_active_default",
            "critical",
            "routes",
            "没有活动默认路由",
            "快照中存在默认路由，但没有任何一条同时处于活动且启用状态。",
            "从路由清单定位未活动网关；本面板不会自动修改路由。",
            "snapshot.routes.defaultRoutes",
            [{"label": "默认路由", "value": len(default_routes)}],
        )
    elif wan_lines and not default_routes:
        add_action(
            "routes.no_default_visible",
            "warning",
            "routes",
            "快照中未见默认路由",
            "WAN 线路存在，但快照没有包含默认路由。",
            "核对路由采集鲜度，并在 RouterOS 路由表中人工确认。",
            "snapshot.routes.defaultRoutes",
            [{"label": "WAN 线路", "value": len(wan_lines)}],
        )

    distribution = [as_dict(row) for row in as_list(load_balance.get("distribution"))]
    if len(distribution) > 1 and any(to_int(row.get("share")) >= 70 for row in distribution):
        dominant = max(distribution, key=lambda row: to_int(row.get("share")))
        add_action(
            "wan.traffic_skew",
            "info",
            "wan",
            "WAN 流量分布明显偏斜",
            f"{dominant.get('name', '-')} 承载了约 {dominant.get('share', 0)}% 的已观测 WAN 流量。",
            "只有在代表性业务流量下持续出现，才将其视为异常。",
            "snapshot.loadBalance.distribution",
            [{"label": "线路", "value": dominant.get("name", "-")}, {"label": "流量占比", "value": dominant.get("share", 0)}],
        )

    if dns and not dns.get("running"):
        add_action(
            "dns.remote_requests_disabled",
            "warning",
            "dns",
            "RouterOS DNS 远程请求未启用",
            "根据当前快照，RouterOS DNS 服务未接受远程请求。",
            "修改 DNS 设置前，先确认这是否符合当前拓扑设计。",
            "snapshot.dns.running",
            [{"label": "远程请求", "value": dns.get("running")}],
        )
    if dns and not as_list(dns.get("servers")):
        add_action(
            "dns.no_servers",
            "warning",
            "dns",
            "快照中未见上游 DNS 服务器",
            "DNS 快照没有列出上游服务器。",
            "若客户端报告解析失败，请在 RouterOS 控制台核对 DNS 配置。",
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
                "DNS 缓存占用偏高",
                f"DNS 缓存使用率约为 {round(cache_usage, 1)}%。",
                "调整缓存大小前，先观察解析时延和缓存淘汰是否同步异常。",
                "snapshot.dns.cacheUsed",
                [{"label": "已使用缓存", "value": cache_used}, {"label": "缓存容量", "value": cache_size}],
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
            "部分 DHCPv6 客户端未绑定",
            f"有 {len(ipv6_dhcp_unbound)} 个 DHCPv6 客户端未绑定。",
            "从 IPv6 诊断视图核对前缀委派和上游状态。",
            "snapshot.dns.ipv6DhcpClients",
            [{"label": "接口", "value": ", ".join(str(as_dict(row).get("interface", "-")) for row in ipv6_dhcp_unbound[:5])}],
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
            "DHCP 地址池容量紧张",
            f"有 {len(high_pools)} 个 DHCP 地址池使用率达到或超过 85%。",
            "修改地址规划前，先人工核对租约清单和地址池容量。",
            "snapshot.dhcp.pools",
            [{"label": "地址池", "value": ", ".join(str(pool.get("name", "-")) for pool in high_pools[:5])}],
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
            title = "检测到活动 ARP 身份冲突证据"
            next_step = "优先核对活动重复 IP 证据；修改地址规划前，再与交换机、AP 和终端证据交叉确认。"
        else:
            title = "ARP 身份漂移需要复核"
            next_step = "将陈旧或失败的 ARP 漂移视为低置信历史；确认存在新鲜重复 IP 证据后，再判定活动冲突。"
        add_action(
            "arp.identity_conflicts",
            top_severity,
            "terminals",
            title,
            (
                f"共 {len(arp_alerts)} 条 ARP 告警：严重 {critical_count}，"
                f"警告 {warning_count}，提示 {info_count}。"
            ),
            next_step,
            "snapshot.arp.alerts",
            [
                {"label": "样本", "value": compact_text(as_dict(arp_alerts[0]).get("detail") or as_dict(arp_alerts[0]).get("value"))},
                {"label": "样本级别", "value": as_dict(arp_alerts[0]).get("severity", "-")},
                {"label": "样本置信度", "value": as_dict(arp_alerts[0]).get("confidence", "-")},
                {"label": "置信度汇总", "value": ", ".join(f"{key}:{confidence_counts[key]}" for key in sorted(confidence_counts))},
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
            loss_text = "未取得"
        else:
            loss_value_text = f"{top_issue['lossRate'] * 100:.4f}".rstrip("0").rstrip(".")
            loss_text = f"{loss_value_text}%"
        add_action(
            "interfaces.error_counters",
            "warning",
            "interfaces",
            "接口丢包与错误证据需要复核",
            (
                f"{primary_count} 个主接口和 {logical_count} 个降级排序的逻辑接口存在丢包或错误证据。"
                f"最高项 {top_issue['row'].get('name', '-')}：累计丢包/错误 "
                f"{top_issue['dropTotal']}/{top_issue['errorTotal']}，最近增量 "
                f"+{top_issue['dropDelta']}/+{top_issue['errorDelta']}，近期丢包率 {loss_text}。"
            ),
            "优先核对最近增量和丢包率；若父接口没有新鲜增量，将 VLAN/macvlan 逻辑对视为低置信证据。",
            "snapshot.interfaces",
            [
                {"label": "最高风险接口", "value": top_issue["row"].get("name", "-")},
                {"label": "累计丢包/错误", "value": f"{top_issue['dropTotal']}/{top_issue['errorTotal']}"},
                {"label": "最近丢包/错误增量", "value": f"+{top_issue['dropDelta']}/+{top_issue['errorDelta']}"},
                {"label": "近期丢包率", "value": loss_text},
                {"label": "降级逻辑接口", "value": logical_count},
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
            "路由器资源压力偏高",
            ", ".join(f"{name}={value}%" for name, _, value in resource_pressure),
            "安排维护或调优前，先与流量和日志证据交叉确认。",
            "snapshot.overview",
            [{"label": name, "value": value} for name, _, value in resource_pressure],
        )

    threshold_level = connections.get("thresholdLevel")
    if threshold_level in {"danger", "warning"}:
        add_action(
            "connections.tracking_pressure",
            "critical" if threshold_level == "danger" else "warning",
            "connections",
            "连接跟踪压力偏高",
            f"当前连接总数为 {connections.get('total', 0)}，阈值级别为 {threshold_level}。",
            "修改限制前，先从终端排行和活动连接中定位高负载客户端。",
            "snapshot.connections",
            [{"label": "连接总数", "value": connections.get("total", 0)}, {"label": "TCP", "value": connections.get("tcp")}],
        )

    top_terminal = next((as_dict(row) for row in as_list(snapshot.get("terminals")) if to_int(as_dict(row).get("connections")) >= 1000), None)
    if top_terminal:
        add_action(
            "terminals.high_connection_client",
            "info",
            "terminals",
            "终端连接数偏高",
            f"{top_terminal.get('displayName') or top_terminal.get('hostname') or top_terminal.get('ip')} 有 {top_terminal.get('connections')} 条跟踪连接。",
            "核对这是预期负载、下载软件、P2P，还是异常终端。",
            "snapshot.terminals",
            [{"label": "IP", "value": top_terminal.get("ip", "-")}, {"label": "连接数", "value": top_terminal.get("connections", 0)}],
        )

    security_alerts = as_list(security.get("alerts"))
    if security_alerts:
        add_action(
            "security.log_alerts",
            "warning" if len(security_alerts) >= 10 else "info",
            "security",
            "存在安全相关日志告警",
            f"当前可见 {len(security_alerts)} 条防火墙、警告或错误日志。",
            "以只读方式核对日志上下文和规则命中计数。",
            "snapshot.security.alerts",
            [{"label": "样本", "value": compact_text(as_dict(security_alerts[0]).get("message"))}],
        )

    actions.sort(key=lambda row: (ACTION_SEVERITY_RANK.get(row["severity"], 99), row["priority"]))
    actions = actions[: min(findings_limit, 20)]
    for index, action in enumerate(actions, start=1):
        action["priority"] = index
    counts = {severity: 0 for severity in ACTION_SEVERITY_RANK}
    for action in actions:
        counts[action["severity"]] = counts.get(action["severity"], 0) + 1
    status = "critical" if counts.get("critical") else "warning" if counts.get("warning") else "ok"
    observed_at = optional_rfc3339_timestamp(snapshot.get("updatedAt"))
    snapshot_status = str(snapshot.get("status") or "").strip().lower()
    source_status = (
        "ok"
        if snapshot_status == "ok"
        else "degraded"
        if observed_at
        else "failed"
        if snapshot_status == "error"
        else "unknown"
    )
    evidence_mode = "current" if source_status == "ok" and observed_at else "historical" if observed_at else "unavailable"
    return {
        "schemaVersion": 1,
        "kind": "health-findings",
        "status": status,
        "readOnly": True,
        "generatedAt": format_iso_now(),
        "observedAt": observed_at,
        "sourceUpdatedAt": observed_at,
        "source": "snapshot-health-analysis",
        "evidenceMode": evidence_mode,
        "coverage": "bounded-sample" if observed_at else "unavailable",
        "sourceStatus": source_status,
        "limit": min(findings_limit, 20),
        "counts": counts,
        "topFinding": actions[0] if actions else None,
        "findings": actions,
        "guardrails": {
            "routerosWrites": False,
            "usesCachedSnapshot": True,
            "mutatingEndpoints": False,
        },
    }
