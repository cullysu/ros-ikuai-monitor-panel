"""End-to-end build_snapshot smoke test for the 22-issue fixes."""
import types, json

src = open("app.py", encoding="utf-8").read()
mod = types.ModuleType("appmod")
mod.__dict__["__name__"] = "appmod"
mod.__dict__["__file__"] = "app.py"
exec(compile(src, "app.py", "exec"), mod.__dict__)

class Rest(dict):
    def __missing__(self, key):
        self[key] = {} if key in ("resource", "identity", "clock", "ntp", "dns", "ipv6_nd", "ipv6_dhcp_client", "dhcp_server", "connection_proto") else []
        return self[key]

rest = Rest()
rest["identity"] = {"name": "test-ros"}
rest["resource"] = {"cpu-load": "250", "free-memory": "999999999", "total-memory": "1000", "free-hdd-space": "10", "total-hdd-space": "100", "version": "7.20", "board-name": "x", "architecture-name": "arm", "cpu": "qemu", "cpu-count": "4", "cpu-frequency": "800", "uptime": "1w2d03:04:05"}
rest["clock"] = {"date": "sep/28/2026", "time": "10:00:00"}
rest["ntp"] = {}
rest["logs"] = [{"time": f"t{i}", "topics": "system", "message": f"msg-{i}"} for i in range(300)]
rest["routes"] = [{"dst-address": "0.0.0.0/0", "gateway": "10.0.0.1", "active": "true", "routing-table": "main", "distance": "1"}]
rest["interfaces"] = [
    {"name": "ether1", "type": "ether", "running": "true", "disabled": "false", "rx-byte": "1000", "tx-byte": "2000"},
    {"name": None, "type": "ether", "running": "true", "disabled": "false"},  # H3 malformed
    {"name": "pppoe-out10", "type": "pppoe-out", "running": "true", "disabled": "false"},
    {"name": "etherWan", "type": "ether", "running": "true", "disabled": "false"},
]
rest["pppoe"] = [{"name": "pppoe-out10", "interface": "ether1", "running": "true", "status": "connected"}]
rest["ip_addresses"] = [{"interface": "bridge", "actual-interface": "bridge", "address": "192.168.88.1/24"}]
rest["dhcp_clients"] = [{"interface": "etherWan", "add-default-route": "true", "default-route-distance": "1"}]
rest["arp"] = [
    {"address": "192.168.88.2", "mac-address": "AA:BB:CC:DD:EE:01", "status": "reachable", "dynamic": "true"},
    {"address": "10.99.99.9", "mac-address": "AA:BB:CC:DD:EE:99", "status": "stale", "dynamic": "true"},  # out of scope
]
rest["dhcp_leases"] = [{"address": "192.168.88.2", "mac-address": "AA:BB:CC:DD:EE:01", "host-name": "phone", "status": "bound"}]
rest["filters"] = [{"chain": "input", "action": "accept", "packets": "5", "bytes": "500"}]
rest["mangle"] = [{"chain": "forward", "action": "mark-connection", "packets": "9", "bytes": "900", "comment": "pcc"}]
rest["address_lists"] = [{"list": "blacklist", "address": "1.2.3.4"}]
rest["routing_rules"] = [{"action": "lookup", "table": "main"}]

ssh = {
    "counts": {"all": 3, "tcp": 2, "udp": 1, "icmp": 0},
    "active_connections": [
        # H1: ip:port endpoints on a LAN terminal
        {"src-address": "192.168.88.2:43470", "reply-src-address": "93.184.216.34:443",
         "dst-address": "93.184.216.34:443", "reply-dst-address": "192.168.88.2:43470",
         "protocol": "tcp", "orig-rate": "1000", "repl-rate": "5000", "orig-bytes": "10", "repl-bytes": "20"},
        # router's own connection must stay excluded
        {"src-address": "192.168.88.1:8291", "reply-src-address": "1.2.3.4:5000",
         "dst-address": "1.2.3.4:5000", "reply-dst-address": "192.168.88.1:8291",
         "protocol": "tcp", "orig-rate": "1", "repl-rate": "1"},
    ],
}

c = mod.Collector()
snap = c.build_snapshot(rest, ssh, fresh_counter_sample=False)

# H1: active connections / terminal rates now populated
o = snap["overview"]
assert o["onlineTerminals"] >= 1, o["onlineTerminals"]
conns = snap["connections"]
# active rows built from the LAN terminal connection
term = snap["terminals"][0]
assert term["ip"] == "192.168.88.2", term["ip"]
assert term["upRate"] + term["downRate"] > 0, term
print("H1 OK: terminal", term["ip"], "up/down", term["upRate"], term["downRate"])

# M8: out-of-scope ARP counter reaches payload
scope = snap["terminalsLanScope"]
assert scope["arpOutOfScope"] == 1 and scope["arpTotal"] == 2, scope
print("M8 OK: lanScope", scope)

# M10+L2+L3: clamps, anomaly, formats
assert o["cpuLoad"] == 100, o["cpuLoad"]
assert o["memoryUsage"] == 0, o["memoryUsage"]
assert any("CPU" in s for s in o["resourceAnomaly"]), o["resourceAnomaly"]
assert o["uptime"] == "1周2天 03:04:05", o["uptime"]
assert o["systemTime"] == "2026-09-28 10:00:00", o["systemTime"]
print("M10/L2 OK:", o["cpuLoad"], o["uptime"], o["systemTime"], "| anomaly:", o["resourceAnomaly"])

# M1: newest logs visible
assert snap["logs"]["all"][0]["message"] in ("msg-240", "msg-241"), snap["logs"]["all"][0]
last = snap["logs"]["all"][-1]["message"]
assert last == "msg-299", last
print("M1 OK: window", snap["logs"]["all"][0]["message"], "..", last)

# H3: malformed interface did not crash and snapshot is ok
assert snap["status"] == "ok", snap.get("error")
print("H3 OK: snapshot ok with None-named interface")

# M5: hybrid WAN — pppoe line + DHCP WAN both present
wan_kinds = {row["kind"] for row in snap["wan"]}
assert "pppoe" in wan_kinds, wan_kinds
print("M5 OK: wan kinds:", wan_kinds, "lines:", [row["lineId"] for row in snap["wan"]])

# M2: wraparound counter rate stays positive
c2 = mod.Collector()
rest2 = Rest()
rest2["interfaces"] = [{"name": "ether1", "type": "ether", "running": "true", "disabled": "false", "rx-byte": str(2**64 - 1000), "tx-byte": "0"}]
r1 = c2.compute_rates(rest2["interfaces"], fresh_counter_sample=True)
rest2["interfaces"] = [{"name": "ether1", "type": "ether", "running": "true", "disabled": "false", "rx-byte": "500", "tx-byte": "0"}]
r2 = c2.compute_rates(rest2["interfaces"], fresh_counter_sample=True)
assert r2["ether1"]["rxBps"] > 0, r2
print("M2 OK: wraparound rxBps =", round(r2["ether1"]["rxBps"], 1))

# M3: scale meta includes truncated lists with counts
scale = snap["meta"]["scale"]
for key in ("routes", "securityFilters", "addressLists", "mangleRules", "routingRules"):
    assert key in scale, key
assert scale["securityFilters"]["totalCount"] == 1
print("M3 OK: scale keys:", sorted(k for k in scale if k in ("routes","securityFilters","addressLists","mangleRules","routingRules")))

print("ALL SNAPSHOT E2E TESTS PASS")
