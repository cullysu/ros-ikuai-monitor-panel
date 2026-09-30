import re


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
        fields="name,type,running,disabled,mac-address,interface,master-interface,vlan-id,rx-packet,tx-packet,rx-drop,tx-drop,rx-error,tx-error,rx-byte,tx-byte",
        timeout=8,
    ),
    "pppoe": endpoint("interface/pppoe-client", fields="name,running,interface,disabled"),
    "ip_addresses": endpoint("ip/address", fields="interface,actual-interface,address,network"),
    "ipv6_addresses": endpoint(
        "ipv6/address",
        fields="interface,actual-interface,address,disabled,dynamic,global,link-local,slave",
        optional=True,
    ),
    "routes": endpoint("ip/route", fields="dst-address,gateway,immediate-gw,distance,routing-table,active,comment,static,dynamic,disabled"),
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
    "dhcp_clients": endpoint(
        "ip/dhcp-client",
        fields="interface,status,use-peer-dns,add-default-route,default-route-distance,dhcp-options,disabled",
        optional=True,
    ),
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


DETAIL_REST_ENDPOINTS = {
    "ipv6_addresses": SLOW_REST_ENDPOINTS.pop("ipv6_addresses"),
    "ipv6_neighbors": SLOW_REST_ENDPOINTS.pop("ipv6_neighbors"),
}


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
    "dhcp_clients": [],
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

TRACKING_FIELD_PATTERN = re.compile(r"^\s*([A-Za-z0-9-]+):\s*(.*?)\s*$")
TERSE_FIELD_PATTERN = re.compile(r"([A-Za-z0-9-]+)=(.*?)(?=\s+[A-Za-z0-9-]+=|$)")
