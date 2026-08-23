import copy
import ipaddress
import math
import re
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from .endpoint_failures import normalize_endpoint_failures


_runtime = None


def _finite_resource_number(value):
    if value is None or isinstance(value, bool):
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        number = float(text)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _observed_counter(value):
    """Keep missing RouterOS counters unknown while preserving an observed zero."""
    number = _finite_resource_number(value)
    if number is None or number < 0:
        return None
    return int(number)


def _observed_counter_total(*values):
    observed = [_observed_counter(value) for value in values]
    return sum(observed) if all(value is not None for value in observed) else None


def _resource_observation(resource):
    cpu = _finite_resource_number(resource.get("cpu-load"))
    total_memory = _finite_resource_number(resource.get("total-memory"))
    free_memory = _finite_resource_number(resource.get("free-memory"))
    total_disk = _finite_resource_number(resource.get("total-hdd-space"))
    free_disk = _finite_resource_number(resource.get("free-hdd-space"))

    cpu = cpu if cpu is not None and 0 <= cpu <= 100 else None
    memory_valid = (
        total_memory is not None and total_memory > 0 and
        free_memory is not None and 0 <= free_memory <= total_memory
    )
    disk_valid = (
        total_disk is not None and total_disk > 0 and
        free_disk is not None and 0 <= free_disk <= total_disk
    )
    memory_used = total_memory - free_memory if memory_valid else None
    disk_used = total_disk - free_disk if disk_valid else None
    return {
        "cpu": cpu,
        "memory": round((memory_used / total_memory) * 100, 2) if memory_valid else None,
        "disk": round((disk_used / total_disk) * 100, 2) if disk_valid else None,
        "memoryUsedBytes": int(memory_used) if memory_used is not None else None,
        "memoryTotalBytes": int(total_memory) if memory_valid else None,
        "diskUsedBytes": int(disk_used) if disk_used is not None else None,
        "diskTotalBytes": int(total_disk) if disk_valid else None,
    }


_ROUTEROS_MONTHS = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}


def _router_clock_local_datetime(clock):
    clock = clock if isinstance(clock, dict) else {}
    date_text = str(clock.get("date") or "").strip()
    time_text = str(clock.get("time") or "").strip()
    if not date_text or not time_text:
        return None
    try:
        iso_match = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", date_text)
        routeros_match = re.fullmatch(r"([A-Za-z]{3})/(\d{1,2})/(\d{4})", date_text)
        if iso_match:
            year, month, day = (int(value) for value in iso_match.groups())
        elif routeros_match:
            month = _ROUTEROS_MONTHS[routeros_match.group(1).lower()]
            day = int(routeros_match.group(2))
            year = int(routeros_match.group(3))
        else:
            return None
        parsed_time = datetime.strptime(time_text, "%H:%M:%S").time()
        return datetime(year, month, day, parsed_time.hour, parsed_time.minute, parsed_time.second)
    except (KeyError, TypeError, ValueError):
        return None


def _router_clock_offset(clock):
    clock = clock if isinstance(clock, dict) else {}
    raw_offset = str(clock.get("gmt-offset") or "").strip()
    if raw_offset:
        match = re.fullmatch(r"([+-]?)(\d{2}):(\d{2})", raw_offset)
        if not match:
            return None
        sign, hours_text, minutes_text = match.groups()
        hours = int(hours_text)
        minutes = int(minutes_text)
        if hours > 23 or minutes > 59:
            return None
        delta = timedelta(hours=hours, minutes=minutes)
        return -delta if sign == "-" else delta

    zone_name = str(clock.get("time-zone-name") or "").strip()
    if not zone_name or zone_name.lower() == "manual":
        return None
    try:
        return ZoneInfo(zone_name)
    except ZoneInfoNotFoundError:
        return None


def _router_clock_timestamp(clock):
    """Return a qualified device-clock timestamp, or None when its zone is unknown."""
    local_datetime = _router_clock_local_datetime(clock)
    zone = _router_clock_offset(clock)
    if local_datetime is None or zone is None:
        return None
    try:
        qualified = local_datetime.replace(tzinfo=timezone(zone) if isinstance(zone, timedelta) else zone)
        return qualified.isoformat(timespec="seconds").replace("+00:00", "Z")
    except (OverflowError, TypeError, ValueError):
        return None


def bind_snapshot_runtime(runtime):
    global _runtime
    _runtime = runtime


class SnapshotBuilderMixin:
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
        latency_ms = _runtime.to_int(latency.get("latencyMs"), 0)
        observation = _resource_observation(resource)
        observed_pressures = [value for value in (observation["cpu"], observation["memory"]) if value is not None]
        admins = []
        if _runtime.EXPOSE_ADMIN_SESSIONS:
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
            "cpuCount": _runtime.to_int(resource.get("cpu-count")),
            "cpuFrequency": _runtime.to_int(resource.get("cpu-frequency")),
            "uptime": resource.get("uptime", "-"),
            "systemTime": _router_clock_timestamp(rest.get("clock", {})),
            "ntpStatus": rest["ntp"].get("status", "unknown"),
            "admins": admins,
            "cpuLoad": observation["cpu"],
            "memoryUsedBytes": observation["memoryUsedBytes"],
            "memoryTotalBytes": observation["memoryTotalBytes"],
            "memoryUsage": observation["memory"],
            "diskUsedBytes": observation["diskUsedBytes"],
            "diskTotalBytes": observation["diskTotalBytes"],
            "diskUsage": observation["disk"],
            "uplinkBps": wan_totals["up"],
            "downlinkBps": wan_totals["down"],
            "wanLatencyMs": latency_ms or None,
            "latencyMs": latency_ms or None,
            "wanLatencyTarget": latency.get("target") or _runtime.WAN_LATENCY_TARGET,
            "wanLatencyUpdatedAt": latency.get("updatedAt"),
            "wanLatencyOk": bool(latency.get("ok")),
            "wanLatencyError": latency.get("error"),
            "onlineTerminals": terminal_count,
            "connectionTotal": ssh["counts"]["all"],
            "systemLoadLevel": _runtime.rate_level(max(observed_pressures) / 100) if observed_pressures else "unknown",
            # Public trend evidence is intentionally atomic.  The collector may
            # retain implementation-local state, but the panel must never have
            # to zip parallel metric arrays with timestamps and guess whether
            # they still describe the same observation.
            "history": {
                "resourceSamples": list(self.history["resourceSamples"]),
                "trafficSamples": list(self.history["trafficSamples"]),
            },
        }

    def build_interfaces(self, rest, rates, addresses_by_interface, quality):
        wan_names = _runtime.infer_wan_interface_names(rest, addresses_by_interface)
        gateway_rows = defaultdict(list)
        for route in rest["routes"]:
            gateway_rows[route.get("gateway")].append(route)
        items = []
        for item in rest["interfaces"]:
            name = item.get("name")
            iface_type = item.get("type", "-")
            parent_hint = _runtime.interface_parent_hint(item)
            group_key = _runtime.interface_quality_group_key(item)
            is_derived = _runtime.interface_is_derived(name, iface_type)
            rx_drop = _observed_counter(item.get("rx-drop"))
            tx_drop = _observed_counter(item.get("tx-drop"))
            rx_error = _observed_counter(item.get("rx-error"))
            tx_error = _observed_counter(item.get("tx-error"))
            rx_packets = _observed_counter(item.get("rx-packet"))
            tx_packets = _observed_counter(item.get("tx-packet"))
            drop_total = _observed_counter_total(item.get("rx-drop"), item.get("tx-drop"))
            error_total = _observed_counter_total(item.get("rx-error"), item.get("tx-error"))
            packet_total = _observed_counter_total(item.get("rx-packet"), item.get("tx-packet"))
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
            quality_row["logicalPairKey"] = quality_row.get("logicalPairKey") or _runtime.interface_logical_pair_key(item)
            quality_row["qualityGroupKey"] = quality_row.get("qualityGroupKey") or group_key
            items.append(
                {
                    "name": name,
                    "role": "WAN" if name in wan_names else "LAN",
                    "type": iface_type,
                    "running": _runtime.to_bool(item.get("running")),
                    "disabled": _runtime.to_bool(item.get("disabled")),
                    "mac": item.get("mac-address", "-"),
                    "parentInterface": parent_hint,
                    "vlanId": item.get("vlan-id"),
                    "ips": [row.get("address", "-") for row in addresses_by_interface.get(name, [])],
                    "networks": [row.get("network", "-") for row in addresses_by_interface.get(name, [])],
                    "gateways": [row.get("dst-address", "-") for row in gateway_rows.get(name, [])[:4]],
                    "rxBytes": _observed_counter(item.get("rx-byte")),
                    "txBytes": _observed_counter(item.get("tx-byte")),
                    "rxPackets": rx_packets,
                    "txPackets": tx_packets,
                    "rxDrop": rx_drop,
                    "txDrop": tx_drop,
                    "rxError": rx_error,
                    "txError": tx_error,
                    "rxRate": rates.get(name, {}).get("rxBps"),
                    "txRate": rates.get(name, {}).get("txBps"),
                    **quality_row,
                }
            )
        items.sort(key=lambda row: (row["role"] != "WAN", row.get("isDerivedInterface", False), row["name"]))
        return items

    def build_pppoe(self, rest, rates, addresses_by_interface):
        defaults = [row for row in rest["routes"] if row.get("dst-address") == "0.0.0.0/0"]
        route_by_gateway = defaultdict(list)
        for route in defaults:
            route_by_gateway[route.get("gateway")].append(route)
        rows = []
        for item in rest["pppoe"]:
            name = item.get("name")
            metric = rates.get(name, {"rxBps": None, "txBps": None})
            rx_bps = metric.get("rxBps")
            tx_bps = metric.get("txBps")
            rows.append(
                {
                    "name": name,
                    "status": "在线" if _runtime.to_bool(item.get("running")) else "离线",
                    "running": _runtime.to_bool(item.get("running")),
                    "parent": item.get("interface", "-"),
                    "addresses": [row.get("address", "-") for row in addresses_by_interface.get(name, [])],
                    "upRate": tx_bps,
                    "downRate": rx_bps,
                    "rxBytes": _runtime.to_int(next((iface.get("rx-byte") for iface in rest["interfaces"] if iface.get("name") == name), 0)),
                    "txBytes": _runtime.to_int(next((iface.get("tx-byte") for iface in rest["interfaces"] if iface.get("name") == name), 0)),
                    "routes": [
                        {
                            "active": _runtime.to_bool(route.get("active")),
                            "distance": route.get("distance", "-"),
                            "table": route.get("routing-table", "-"),
                            "comment": route.get("comment", ""),
                        }
                        for route in route_by_gateway.get(name, [])
                    ],
                }
            )
        distribution = _runtime.build_distribution_from_lines(rows)
        return rows, distribution

    def build_wan_lines(self, rest, pppoe_rows, interfaces):
        active_defaults = [
            row for row in rest.get("routes", [])
            if row.get("dst-address") in {"0.0.0.0/0", "::/0"} and _runtime.to_bool(row.get("active")) and not _runtime.to_bool(row.get("disabled"))
        ]
        default_routes = [
            row for row in rest.get("routes", [])
            if row.get("dst-address") in {"0.0.0.0/0", "::/0"} and not _runtime.to_bool(row.get("disabled"))
        ]
        dhcp_clients_by_interface = {
            item.get("interface"): item
            for item in rest.get("dhcp_clients", [])
            if item.get("interface")
        }
        wan_interfaces = [row for row in interfaces if row.get("role") == "WAN"]
        pppoe_names = {row.get("name") for row in pppoe_rows if row.get("name")}
        interface_networks = {
            row.get("name"): [value for value in (row.get("ips") or []) if value and value != "-"]
            for row in interfaces
            if row.get("name")
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

        def route_matches_interface(route, iface_name):
            gateway = str(route.get("gateway") or "").strip()
            if not gateway or not iface_name:
                return False
            if gateway == iface_name:
                return True
            if "%" in gateway and gateway.rsplit("%", 1)[-1] == iface_name:
                return True
            return _runtime.gateway_matches_address_rows(gateway, [{"address": value} for value in interface_networks.get(iface_name, [])])

        non_pppoe_wan_interfaces = [iface for iface in wan_interfaces if iface.get("name") not in pppoe_names]

        def route_rows_for_interface(iface_name):
            matched = [route for route in default_routes if route_matches_interface(route, iface_name)]
            if not matched and len(non_pppoe_wan_interfaces) == 1:
                matched = active_defaults
            return [
                {
                    "active": _runtime.to_bool(route.get("active")),
                    "distance": route.get("distance", "-"),
                    "table": route.get("routing-table", "-"),
                    "comment": route.get("comment", ""),
                }
                for route in matched[:4]
            ]

        def interface_access(iface, dhcp_client):
            iface_type = str(iface.get("type") or "").lower()
            name = str(iface.get("name") or "").lower()
            if iface_type == "vlan" or iface.get("vlanId") or "vlan" in name:
                return "VLAN"
            if dhcp_client:
                return "DHCP"
            if iface.get("ips"):
                return "Static"
            return "Unknown"

        for iface in non_pppoe_wan_interfaces:
            name = iface.get("name", "-")
            dhcp_client = dhcp_clients_by_interface.get(name, {})
            running = bool(iface.get("running")) and not bool(iface.get("disabled"))
            route_rows = route_rows_for_interface(name)
            if dhcp_client:
                route_rows.insert(
                    0,
                    {
                        "active": running and _runtime.to_bool(dhcp_client.get("add-default-route", True)),
                        "distance": dhcp_client.get("default-route-distance", "-"),
                        "table": "main",
                        "comment": "DHCP client default route",
                    }
                )
            access = interface_access(iface, dhcp_client)
            rows.append(
                {
                    "name": name,
                    "status": "在线" if running else "离线",
                    "running": running,
                    "parent": iface.get("parentInterface") or iface.get("type", "-"),
                    "addresses": list(iface.get("ips") or []),
                    "upRate": iface.get("txRate"),
                    "downRate": iface.get("rxRate"),
                    "rxBytes": _runtime.to_int(iface.get("rxBytes")),
                    "txBytes": _runtime.to_int(iface.get("txBytes")),
                    "routes": route_rows,
                    "kind": "interface",
                    "lineId": name,
                    "access": access,
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
        ip_to_entries = defaultdict(list)
        mac_to_entries = defaultdict(list)
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
            arp_entry = {"ip": address, "mac": mac, "status": item.get("status", "-"), "evidenceState": _runtime.arp_evidence_state(item.get("status"))}
            ip_to_entries[address].append(arp_entry)
            mac_to_entries[mac].append(arp_entry)
            lease = leases_by_ip.get(address) or leases_by_mac.get(mac)
            arp_rows.append(
                {
                    "ip": address,
                    "mac": mac,
                    "hostname": (lease or {}).get("host-name", "-"),
                    "status": item.get("status", "-"),
                    "type": "静态" if not _runtime.to_bool(item.get("dynamic", True)) else "动态",
                    "lastSeen": (lease or {}).get("last-seen", "-"),
                }
            )
        for row in arp_rows:
            row.setdefault("evidenceState", _runtime.arp_evidence_state(row.get("status")))
        alerts = []
        for ip_addr, macs in ip_to_macs.items():
            if len(macs) > 1:
                alerts.append({"kind": "IP冲突", "value": ip_addr, "detail": ", ".join(sorted(macs))})
        for mac, ips in mac_to_ips.items():
            if len(ips) > 1:
                alerts.append({"kind": "MAC漂移", "value": mac, "detail": ", ".join(sorted(ips, key=_runtime.ip_sort_key))})

        refined_alerts = []
        for ip_addr, entries in ip_to_entries.items():
            if len({entry["mac"] for entry in entries}) > 1:
                refined_alerts.append(_runtime.make_arp_alert("IP conflict", ip_addr, entries, "mac"))
        for mac, entries in mac_to_entries.items():
            if len({entry["ip"] for entry in entries}) > 1:
                refined_alerts.append(_runtime.make_arp_alert("MAC drift", mac, entries, "ip"))
        if refined_alerts:
            refined_alerts.sort(key=lambda row: (_runtime.ACTION_SEVERITY_RANK.get(row.get("severity"), 3), row.get("kind", ""), str(row.get("value", ""))))
            alerts = refined_alerts

        # A connection-rate field is an observation, not a counter.  In
        # particular, a missing RouterOS ``*-rate`` field must remain unknown:
        # treating it as zero makes an unavailable measurement look idle.
        terminal_stats = defaultdict(
            lambda: {
                "up": 0,
                "down": 0,
                "upComplete": True,
                "downComplete": True,
                "rateRows": 0,
                "connections": 0,
                "sessionBytes": 0,
            }
        )

        def complete_terminal_rate(stats, direction):
            if not stats["rateRows"] or not stats[f"{direction}Complete"]:
                return None
            return stats[direction]

        active_rows = []
        for conn in ssh["active_connections"]:
            local_ip, remote_ip, local_key = self.extract_local_ip(conn, local_networks, router_ips)
            if not local_ip:
                continue
            if local_key in {"src-address", "dst-address"}:
                up_rate = _observed_counter(conn.get("orig-rate"))
                down_rate = _observed_counter(conn.get("repl-rate"))
            else:
                up_rate = _observed_counter(conn.get("repl-rate"))
                down_rate = _observed_counter(conn.get("orig-rate"))
            stats = terminal_stats[local_ip]
            stats["rateRows"] += 1
            if up_rate is None:
                stats["upComplete"] = False
            else:
                stats["up"] += up_rate
            if down_rate is None:
                stats["downComplete"] = False
            else:
                stats["down"] += down_rate
            stats["connections"] += 1
            session_bytes = _runtime.to_int(conn.get("orig-bytes")) + _runtime.to_int(conn.get("repl-bytes"))
            stats["sessionBytes"] += session_bytes
            active_rows.append(
                {
                    "localIp": local_ip,
                    "remoteIp": remote_ip or "-",
                    "protocol": str(conn.get("protocol", "-")).upper(),
                    "upRate": up_rate,
                    "downRate": down_rate,
                    "timeout": conn.get("timeout", "-"),
                    "mark": conn.get("connection-mark", "-"),
                    "totalRate": up_rate + down_rate if up_rate is not None and down_rate is not None else None,
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
            up_rate = complete_terminal_rate(stats, "up")
            down_rate = complete_terminal_rate(stats, "down")
            terminals.append(
                {
                    "ip": ip_addr,
                    "mac": row["mac"],
                    "hostname": row["hostname"],
                    "status": row["status"],
                    "lastSeen": row["lastSeen"],
                    "upRate": up_rate,
                    "downRate": down_rate,
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
            up_rate = complete_terminal_rate(stats, "up")
            down_rate = complete_terminal_rate(stats, "down")
            terminals.append(
                {
                    "ip": ip_addr,
                    "mac": arp_row.get("mac") or (lease or {}).get("mac-address", "-"),
                    "hostname": arp_row.get("hostname") or (lease or {}).get("host-name", "-"),
                    "status": arp_row.get("status") or "active",
                    "lastSeen": arp_row.get("lastSeen") or (lease or {}).get("last-seen", "-"),
                    "upRate": up_rate,
                    "downRate": down_rate,
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
            up_rate = complete_terminal_rate(stats, "up")
            down_rate = complete_terminal_rate(stats, "down")
            terminals.append(
                {
                    "ip": ip_addr,
                    "mac": row["mac"],
                    "hostname": row["hostname"],
                    "status": row["status"],
                    "lastSeen": row["lastSeen"],
                    "upRate": up_rate,
                    "downRate": down_rate,
                    "connections": stats["connections"],
                    "sessionBytes": stats["sessionBytes"],
                }
            )
        terminals.sort(
            key=lambda row: (
                row["upRate"] is not None or row["downRate"] is not None,
                (row["upRate"] or 0) + (row["downRate"] or 0),
                row["connections"],
            ),
            reverse=True,
        )
        active_rows.sort(key=lambda row: (row["totalRate"] is not None, row["totalRate"] or 0), reverse=True)
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
                    "upRate": 0,
                    "downRate": 0,
                    "upComplete": True,
                    "downComplete": True,
                    "rateRows": 0,
                    "sessionBytes": 0,
                    "source": "active-connection-sample",
                }
            bucket = protocol_buckets[bucket_key]
            bucket["connections"] += 1
            bucket["rateRows"] += 1
            if row.get("upRate") is None:
                bucket["upComplete"] = False
            else:
                bucket["upRate"] += row["upRate"]
            if row.get("downRate") is None:
                bucket["downComplete"] = False
            else:
                bucket["downRate"] += row["downRate"]
            bucket["sessionBytes"] += _runtime.to_int(row.get("sessionBytes"))
        for bucket in protocol_buckets.values():
            if not bucket["upComplete"]:
                bucket["upRate"] = None
            if not bucket["downComplete"]:
                bucket["downRate"] = None
            bucket["totalRate"] = (
                bucket["upRate"] + bucket["downRate"]
                if bucket["upRate"] is not None and bucket["downRate"] is not None
                else None
            )
            del bucket["upComplete"]
            del bucket["downComplete"]
            del bucket["rateRows"]
        protocol_top_rows = sorted(
            protocol_buckets.values(),
            key=lambda row: (row["totalRate"] is not None, row["totalRate"] or 0, row["connections"], row["sessionBytes"]),
            reverse=True,
        )[:20]
        arp_items = sorted(arp_rows, key=lambda row: _runtime.ip_sort_key(row["ip"]))[:120]
        active_connection_items = active_rows[:_runtime.ACTIVE_CONNECTION_LIMIT]
        return {
            "terminalCount": len(terminals),
            "terminals": terminals,
            "arp": arp_items,
            "arpAlerts": alerts[:20],
            "activeConnections": active_connection_items,
            "meta": {
                "terminals": _runtime.list_scale_meta(len(terminals), len(terminals), sampled=False, sorted_by="traffic/connections"),
                "arp": _runtime.list_scale_meta(len(arp_rows), len(arp_items), limit=120, sampled=len(arp_items) < len(arp_rows), sample_method="first 120 sorted by IP", sorted_by="ip"),
                "activeConnections": _runtime.list_scale_meta(
                    len(active_rows),
                    len(active_connection_items),
                    limit=_runtime.ACTIVE_CONNECTION_LIMIT,
                    sampled=True,
                    sample_method="SSH connection detail sample, active rate rows first",
                    sorted_by="totalRate",
                ),
                "protocolTop": _runtime.list_scale_meta(
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
            total = _runtime.count_pool_addresses(item.get("ranges"))
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
                "static": not _runtime.to_bool(item.get("dynamic", True)),
            }
            for item in rest["dhcp_leases"]
        ]
        leases.sort(key=lambda row: (row["status"] != "bound", _runtime.ip_sort_key(row["address"])))
        servers = [
            {
                "name": item.get("name", "-"),
                "interface": item.get("interface", "-"),
                "pool": item.get("address-pool", "-"),
                "leaseTime": item.get("lease-time", "-"),
                "running": not _runtime.to_bool(item.get("disabled")),
            }
            for item in rest["dhcp_servers"]
        ]
        clients = [
            {
                "interface": item.get("interface", "-"),
                "status": item.get("status", "-"),
                "usePeerDns": _runtime.to_bool(item.get("use-peer-dns")),
                "addDefaultRoute": _runtime.to_bool(item.get("add-default-route")),
                "defaultRouteDistance": item.get("default-route-distance", "-"),
                "dhcpOptions": item.get("dhcp-options", ""),
                "disabled": _runtime.to_bool(item.get("disabled")),
            }
            for item in rest.get("dhcp_clients", [])
        ]
        clients.sort(key=lambda row: (row["disabled"], row["status"] != "bound", row["interface"]))
        visible_leases = leases[:120]
        return {
            "pools": pools,
            "leases": visible_leases,
            "servers": servers,
            "clients": clients,
            "meta": {
                "leases": _runtime.list_scale_meta(
                    len(leases),
                    len(visible_leases),
                    limit=120,
                    sampled=len(visible_leases) < len(leases),
                    sample_method="first 120 sorted by status and IP",
                    sorted_by="status/ip",
                    grouped_by=["status", "server", "static"],
                ),
                "pools": _runtime.list_scale_meta(len(pools), len(pools), sampled=False),
                "servers": _runtime.list_scale_meta(len(servers), len(servers), sampled=False),
                "clients": _runtime.list_scale_meta(len(clients), len(clients), sampled=False),
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
                "disabled": _runtime.to_bool(item.get("disabled")),
            }
            for item in dns_static_rows[:_runtime.DNS_STATIC_PREVIEW_LIMIT]
        ]
        ipv6_nd = []
        for item in rest.get("ipv6_nd", []):
            ipv6_nd.append(
                {
                    "interface": item.get("interface", "-"),
                    "advertiseDns": _runtime.to_bool(item.get("advertise-dns")),
                    "dnsServers": split_values(item.get("dns-servers") or item.get("dns")),
                    "managed": _runtime.to_bool(item.get("managed-address-configuration")),
                    "otherConfig": _runtime.to_bool(item.get("other-configuration")),
                    "raLifetime": item.get("ra-lifetime", "-"),
                }
            )
        ipv6_dhcp_clients = [
            {
                "interface": item.get("interface", "-"),
                "status": item.get("status", "-"),
                "pool": item.get("pool-name", "-"),
                "prefix": item.get("prefix") or item.get("address") or "-",
                "usePeerDns": _runtime.to_bool(item.get("use-peer-dns")),
                "request": item.get("request", "-"),
                "addDefaultRoute": _runtime.to_bool(item.get("add-default-route")),
                "defaultRouteDistance": item.get("default-route-distance", "-"),
                "dhcpOptions": item.get("dhcp-options", ""),
            }
            for item in rest.get("ipv6_dhcp_clients", [])
        ]
        ipv6_dhcp_clients.sort(key=lambda row: (row["status"] != "bound", row["interface"]))
        return {
            "running": _runtime.to_bool(dns.get("allow-remote-requests")),
            "servers": servers,
            "cacheSize": _runtime.to_int(dns.get("cache-size")),
            "cacheUsed": _runtime.to_int(dns.get("cache-used")),
            "cacheEntries": 0,
            "forwardRuleCount": _runtime.dns_static_total_count_from_meta(dns_static_meta, len(dns_static_rows)),
            "visibleRuleCount": len(forward_rules),
            "disabledForwardRuleCount": sum(1 for item in dns_static_rows if _runtime.to_bool(item.get("disabled"))),
            "forwardRuleSample": _runtime.to_bool(dns_static_meta.get("sample")),
            "forwardRules": forward_rules,
            "dohServer": dns.get("use-doh-server") or dns.get("doh-server", ""),
            "verifyDohCert": _runtime.to_bool(dns.get("verify-doh-cert")),
            "ipv6Nd": ipv6_nd,
            "ipv6DhcpClients": ipv6_dhcp_clients,
        }

    def build_security(self, rest):
        filters = [
            {
                "rawOrder": index + 1,
                "id": item.get(".id", ""),
                "chain": item.get("chain", "-"),
                "action": item.get("action", "-"),
                "comment": item.get("comment", ""),
                "packets": _runtime.to_int(item.get("packets")),
                "bytes": _runtime.to_int(item.get("bytes")),
                "disabled": _runtime.to_bool(item.get("disabled")),
                "passthrough": item.get("passthrough", ""),
                "connectionMark": item.get("connection-mark", ""),
                "packetMark": item.get("packet-mark", ""),
                "routingMark": item.get("routing-mark", ""),
                "inInterface": item.get("in-interface", ""),
                "outInterface": item.get("out-interface", ""),
                "srcAddress": item.get("src-address", ""),
                "dstAddress": item.get("dst-address", ""),
            }
            for index, item in enumerate(rest["filters"])
        ]
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
                affected = topics or "firewall"
                alerts.append(
                    {
                        "abnormal": message or topics or "Firewall log event",
                        "affected": affected,
                        "firstSeen": item.get("time", "-"),
                        "lastConfirmed": item.get("time", "-"),
                        "recovered": False,
                        "time": item.get("time", "-"),
                        "topics": topics,
                        "message": message,
                    }
                )
        return {"filters": filters[:120], "addressLists": address_lists, "alerts": alerts[:40]}

    def build_load_balance(self, rest, distribution):
        defaults = [item for item in rest["routes"] if item.get("dst-address") == "0.0.0.0/0"]
        active_defaults = [item for item in defaults if _runtime.to_bool(item.get("active"))]
        pcc_detected = False
        mangle_rules = []
        for index, item in enumerate(rest["mangle"]):
            comment = str(item.get("comment", ""))
            if item.get("per-connection-classifier") or "pcc" in comment.lower():
                pcc_detected = True
            if item.get("action") in {"mark-routing", "mark-connection", "accept"}:
                mangle_rules.append(
                    {
                        "rawOrder": index + 1,
                        "id": item.get(".id", ""),
                        "chain": item.get("chain", "-"),
                        "action": item.get("action", "-"),
                        "comment": comment,
                        "newRoutingMark": item.get("new-routing-mark", "-"),
                        "passthrough": item.get("passthrough", ""),
                        "connectionMark": item.get("connection-mark", ""),
                        "newConnectionMark": item.get("new-connection-mark", ""),
                        "packetMark": item.get("packet-mark", ""),
                        "newPacketMark": item.get("new-packet-mark", ""),
                        "routingMark": item.get("routing-mark", ""),
                        "inInterface": item.get("in-interface", ""),
                        "outInterface": item.get("out-interface", ""),
                        "srcAddress": item.get("src-address", ""),
                        "dstAddress": item.get("dst-address", ""),
                        "pcc": item.get("per-connection-classifier", ""),
                        "disabled": _runtime.to_bool(item.get("disabled")),
                        "packets": _runtime.to_int(item.get("packets")),
                        "bytes": _runtime.to_int(item.get("bytes")),
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
            "distribution": distribution,
            "defaultRoutes": [
                {
                    "gateway": item.get("gateway", "-"),
                    "distance": item.get("distance", "-"),
                    "table": item.get("routing-table", "-"),
                    "active": _runtime.to_bool(item.get("active")),
                    "comment": item.get("comment", ""),
                }
                for item in defaults
            ],
            "mangleRules": mangle_rules[:120],
            "routingRules": [
                {
                    "rawOrder": index + 1,
                    "id": item.get(".id", ""),
                    "action": item.get("action", "-"),
                    "table": item.get("table", "-"),
                    "routingMark": item.get("routing-mark", "-"),
                    "srcAddress": item.get("src-address", "-"),
                    "dstAddress": item.get("dst-address", "-"),
                    "interface": item.get("interface", "-"),
                    "comment": item.get("comment", ""),
                    "disabled": _runtime.to_bool(item.get("disabled")),
                    "inactive": _runtime.to_bool(item.get("inactive")),
                }
                for index, item in enumerate(rest["routing_rules"][:120])
            ],
            "pccDetected": pcc_detected,
        }

    def build_routes(self, rest):
        rows = []
        for item in rest["routes"]:
            dst_address = item.get("dst-address", "-")
            is_default = dst_address in {"0.0.0.0/0", "::/0"}
            is_static = _runtime.to_bool(item.get("static"))
            is_dynamic = _runtime.to_bool(item.get("dynamic"))
            is_disabled = _runtime.to_bool(item.get("disabled"))
            is_active = _runtime.to_bool(item.get("active"))
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
            row = {
                "observedAt": _runtime.optional_rfc3339_timestamp(item.get("observedAt") or item.get("time")),
                "topics": item.get("topics", "-"),
                "message": item.get("message", "-"),
            }
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

    def build_snapshot(self, rest, ssh, fresh_counter_sample=False):
        connection_counts = copy.deepcopy(ssh.get("counts", {}))
        reported_total = _observed_counter(connection_counts.get("all"))
        protocol_counts = {
            protocol: _observed_counter(connection_counts.get(protocol))
            for protocol in ("tcp", "udp", "icmp")
        }
        connection_counts.update(protocol_counts)
        breakdown_total = sum(protocol_counts.values()) if all(value is not None for value in protocol_counts.values()) else None
        protocol_summary_observed = _runtime.optional_rfc3339_timestamp(ssh.get("protocolUpdatedAt")) is not None
        connection_counts["all"] = (
            max(reported_total, breakdown_total)
            if reported_total is not None and breakdown_total is not None
            else breakdown_total
            if breakdown_total is not None
            else reported_total
            if protocol_summary_observed
            else None
        )
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
        )
        interfaces = self.build_interfaces(rest, rates, addresses_by_interface, quality)
        wan_lines = self.build_wan_lines(
            rest,
            pppoe,
            interfaces,
        )
        wan_latency = self.get_wan_latency()
        pppoe = self.attach_wan_latency(pppoe, wan_latency)
        wan_lines = self.attach_wan_latency(wan_lines, wan_latency)
        if wan_lines:
            distribution = _runtime.build_distribution_from_lines(wan_lines)
        wan_source = [row for row in wan_lines if row.get("running")] or list(wan_lines)
        wan_totals = {
            "up": _runtime.complete_rate_total(wan_source, "upRate"),
            "down": _runtime.complete_rate_total(wan_source, "downRate"),
        }
        terminals = self.build_terminals_and_connections(rest, ssh, local_networks, router_ips)
        dhcp = self.build_dhcp(rest)
        ipv6_interface_count = sum(
            1 for row in interfaces if any(":" in str(ip_addr) for ip_addr in row.get("ips", []))
        )
        ipv6_terminal_count = sum(
            1 for row in terminals["terminals"] if ":" in str(row.get("ip", ""))
        )
        capabilities = _runtime.build_panel_capabilities(wan_lines, len(pppoe))
        wan_line_count = len(wan_lines)
        active_connection_shown = len(terminals.get("activeConnections", []))
        scale_meta = {
            "wan": _runtime.list_scale_meta(wan_line_count, len(wan_lines), sampled=False, sorted_by="natural interface name", grouped_by=["status", "parent", "routeTable"]),
            "pppoe": _runtime.list_scale_meta(len(pppoe), len(pppoe), sampled=False, sorted_by="natural interface name"),
            "interfaces": _runtime.list_scale_meta(len(interfaces), len(interfaces), sampled=False, sorted_by="role/name/quality", grouped_by=["role", "type", "status", "qualityEvidenceLevel"]),
            "terminals": terminals.get("meta", {}).get("terminals", _runtime.list_scale_meta(terminals["terminalCount"], len(terminals["terminals"]))),
            "arp": terminals.get("meta", {}).get("arp", _runtime.list_scale_meta(len(terminals["arp"]), len(terminals["arp"]))),
            "dhcpLeases": dhcp.get("meta", {}).get("leases", _runtime.list_scale_meta(len(dhcp.get("leases", [])), len(dhcp.get("leases", [])))),
            "connectionsActive": {
                **terminals.get("meta", {}).get("activeConnections", _runtime.list_scale_meta(active_connection_shown, active_connection_shown, sampled=True)),
                "actualCount": ssh["counts"]["all"],
                "totalCount": ssh["counts"]["all"],
                "hasMore": active_connection_shown < ssh["counts"]["all"] if ssh["counts"]["all"] is not None else None,
            },
            "dnsStatic": _runtime.list_scale_meta(
                _runtime.dns_static_total_count_from_meta(rest.get("dns_static_meta", {}), _runtime.DNS_STATIC_PREVIEW_LIMIT),
                len(rest.get("dns_static", [])),
                limit=_runtime.DNS_STATIC_PREVIEW_LIMIT,
                sampled=True,
                sample_method="preview rows; full browser uses /api/dns-static pagination",
                sorted_by="RouterOS order",
            ),
            "firewallFilters": _runtime.list_scale_meta(
                len(rest.get("filters", [])),
                min(len(rest.get("filters", [])), 120),
                limit=120,
                sampled=len(rest.get("filters", [])) > 120,
                sample_method="first 120 RouterOS filter rules",
                sorted_by="RouterOS raw order",
            ),
            "addressLists": _runtime.list_scale_meta(
                len(rest.get("address_lists", [])),
                min(len(rest.get("address_lists", [])), 100),
                limit=100,
                sampled=len(rest.get("address_lists", [])) > 100,
                sample_method="first 100 RouterOS address-list rows",
                sorted_by="RouterOS raw order",
            ),
            "mangleRules": _runtime.list_scale_meta(
                len(rest.get("mangle", [])),
                min(len(rest.get("mangle", [])), 120),
                limit=120,
                sampled=len(rest.get("mangle", [])) > 120,
                sample_method="first 120 RouterOS mangle rules",
                sorted_by="RouterOS raw order",
            ),
            "routingRules": _runtime.list_scale_meta(
                len(rest.get("routing_rules", [])),
                min(len(rest.get("routing_rules", [])), 120),
                limit=120,
                sampled=len(rest.get("routing_rules", [])) > 120,
                sample_method="first 120 RouterOS routing rules",
                sorted_by="RouterOS raw order",
            ),
        }
        resource = rest["resource"]
        observation = _resource_observation(resource)
        snapshot_timestamp = _runtime.format_iso_now()
        if all(observation[key] is not None for key in ("cpu", "memory", "disk")):
            self.history["resourceSamples"].append(
                {
                    "timestamp": snapshot_timestamp,
                    "cpu": observation["cpu"],
                    "memory": observation["memory"],
                    "disk": observation["disk"],
                    "source": "routeros-resource",
                    "evidenceMode": "current",
                }
            )
        if update_rate_history:
            # This observation belongs to the counter delta, not to later
            # resource/static work in this snapshot build.  Keeping its own
            # qualified timestamp prevents any non-rate refresh from being
            # mistaken for another traffic sample.
            with self.lock:
                rate_history_timestamp = _runtime.require_rfc3339_timestamp(self.last_counter_sample_at)
            self.history["trafficSamples"].append(
                {
                    "timestamp": rate_history_timestamp,
                    "uplink": None if rate_history_break else wan_totals["up"],
                    "downlink": None if rate_history_break else wan_totals["down"],
                    "source": "counter-delta",
                    "evidenceMode": "unavailable" if rate_history_break else "current",
                }
            )
        with self.lock:
            rate_history_updated_at = self.last_counter_sample_at
            rate_history_sample_count = self.rate_history_sample_count
            quality_updated_at = self.last_quality_sample_at
            quality_sample_count = self.interface_quality_sample_count
        endpoint_failures = {
            "realtimeEndpointFailures": normalize_endpoint_failures(
                self.realtime_failures,
                channel="realtime-rest",
                group="实时 REST",
                endpoints=_runtime.REALTIME_REST_ENDPOINTS,
                observed_at=self.realtime_updated_at,
                fallback_at=snapshot_timestamp,
            ),
            "slowRestEndpointFailures": normalize_endpoint_failures(
                self.slow_failures,
                channel="slow-rest",
                group="慢速 REST",
                endpoints=_runtime.SLOW_REST_ENDPOINTS,
                observed_at=self.slow_updated_at,
                fallback_at=snapshot_timestamp,
            ),
            "staticEndpointFailures": normalize_endpoint_failures(
                self.static_failures,
                channel="static-rest",
                group="静态 REST",
                endpoints=_runtime.STATIC_REST_ENDPOINTS,
                observed_at=self.static_updated_at,
                fallback_at=snapshot_timestamp,
            ),
            "detailEndpointFailures": normalize_endpoint_failures(
                self.detail_failures,
                channel="detail-rest",
                group="连接明细 REST",
                endpoints=_runtime.DETAIL_REST_ENDPOINTS,
                observed_at=ssh.get("detailUpdatedAt"),
                fallback_at=snapshot_timestamp,
            ),
        }
        snapshot = {
            "status": "ok",
            "updatedAt": snapshot_timestamp,
            "error": None,
            "meta": {
                "target": _runtime.PANEL_TARGET,
                "routerHost": _runtime.public_router_config()["host"],
                "configuredIdentity": rest.get("identity", {}).get("name") or _runtime.public_router_config()["host"],
                "routerLogin": _runtime.public_router_config(),
                "pollSeconds": _runtime.POLL_SECONDS,
                "realtimeUpdatedAt": self.realtime_updated_at,
                "realtimeError": self.realtime_error,
                "realtimeLastErrorAt": self.realtime_last_error_at,
                "realtimeDurationSeconds": self.realtime_duration_seconds,
                "staticPollSeconds": _runtime.STATIC_POLL_SECONDS,
                "staticRestWorkers": _runtime.STATIC_REST_WORKERS,
                "slowRestPollSeconds": _runtime.SLOW_REST_POLL_SECONDS,
                "slowRestWorkers": _runtime.SLOW_REST_WORKERS,
                "slowRestUpdatedAt": self.slow_updated_at,
                "slowRestError": self.slow_error,
                "slowRestLastErrorAt": self.slow_last_error_at,
                "slowRestDurationSeconds": self.slow_duration_seconds,
                "connectionDetailPollSeconds": _runtime.CONNECTION_DETAIL_POLL_SECONDS,
                "detailRestWorkers": _runtime.DETAIL_REST_WORKERS,
                "connectionProtocolPollSeconds": _runtime.CONNECTION_PROTOCOL_BREAKDOWN_INTERVAL_SECONDS,
                "staticUpdatedAt": self.static_updated_at,
                "staticError": self.static_error,
                "staticLastErrorAt": self.static_last_error_at,
                "staticDurationSeconds": self.static_duration_seconds,
                **endpoint_failures,
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
                "profile": _runtime.PANEL_PROFILE,
                "capabilities": capabilities,
                "pppoeCount": len(pppoe),
                "wanCount": wan_line_count,
                "lineCount": wan_line_count,
                "lineLayoutTier": _runtime.line_layout_tier(wan_line_count),
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
                "thresholdLevel": _runtime.rate_level(min(ssh["counts"]["all"] / 120000, 1)) if ssh["counts"]["all"] is not None else "unknown",
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
                    "topIps": _runtime.list_scale_meta(len(terminals["topIpConnections"]), len(terminals["topIpConnections"]), sampled=True, sample_method="terminal traffic top list", sorted_by="connections/traffic"),
                    "protocolTop": terminals.get("meta", {}).get("protocolTop", _runtime.list_scale_meta(0, 0, sampled=True, sample_method="active connection detail sample", sorted_by="traffic/connections")),
                },
            },
            "dns": self.build_dns(rest),
            "security": self.build_security(rest),
            "loadBalance": self.build_load_balance(rest, distribution),
            "routes": self.build_routes(rest),
            "logs": self.build_logs(rest),
        }
        snapshot = _runtime.normalize_collector_snapshot_status(snapshot)
        snapshot = self.apply_ip_aliases_to_snapshot(snapshot, dict(self.ip_aliases))
        findings = _runtime.build_health_findings(snapshot)
        snapshot["statusFindings"] = findings
        snapshot["healthFindings"] = findings
        return snapshot
