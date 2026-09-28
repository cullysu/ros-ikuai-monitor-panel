"""Fake RouterOS REST endpoint that serves N PPPoE WAN lines.

Usage: python fake_ros.py <port> <wan_count>
Counters grow every request so the real panel computes non-zero rates.
"""
import json
import random
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1])
N = int(sys.argv[2])
START = time.time()
rng = random.Random(N)

LINES = []
for i in range(1, N + 1):
    LINES.append({
        "name": f"pppoe-out{i}",
        "parent": f"ether{(i % 8) + 2}" if N <= 8 else f"vlan{100 + i}",
        "down_bps": rng.randint(5, 900) * 125_000,   # 5-900 Mbps
        "up_bps": rng.randint(1, 120) * 125_000,
        "running": not (i % 7 == 0),                 # every 7th line offline
    })

LAN_IFACES = ["ether1", "bridge-lan"]


def counter(bps, i):
    t = time.time() - START
    wobble = 1 + 0.25 * ((int(t) + i) % 5) / 4
    return int(bps / 8 * t * wobble) + 10_000_000


def interfaces():
    rows = []
    for idx, name in enumerate(LAN_IFACES):
        rows.append({"name": name, "type": "bridge" if "bridge" in name else "ether",
                     "running": "true", "disabled": "false", "mac-address": f"AA:BB:CC:00:00:0{idx}",
                     "rx-byte": str(counter(40_000_000, idx)), "tx-byte": str(counter(300_000_000, idx)),
                     "rx-packet": "1000000", "tx-packet": "1000000", "rx-drop": "0", "tx-drop": "0",
                     "rx-error": "0", "tx-error": "0"})
    parents = sorted({l["parent"] for l in LINES})
    for p in parents:
        rows.append({"name": p, "type": "vlan" if p.startswith("vlan") else "ether", "running": "true",
                     "disabled": "false", "mac-address": "AA:BB:CC:11:22:33",
                     "rx-byte": "0", "tx-byte": "0", "rx-packet": "0", "tx-packet": "0",
                     "rx-drop": "0", "tx-drop": "0", "rx-error": "0", "tx-error": "0"})
    for i, l in enumerate(LINES):
        on = l["running"]
        rows.append({"name": l["name"], "type": "pppoe-out", "running": "true" if on else "false",
                     "disabled": "false",
                     "rx-byte": str(counter(l["down_bps"], i) if on else 0),
                     "tx-byte": str(counter(l["up_bps"], i) if on else 0),
                     "rx-packet": "500000", "tx-packet": "400000", "rx-drop": "0", "tx-drop": "0",
                     "rx-error": "0", "tx-error": "0"})
    return rows


def routes():
    rows = [{".id": f"*{i}", "dst-address": "0.0.0.0/0", "gateway": l["name"], "distance": "1",
             "routing-table": "main" if i == 0 else f"to_{l['name']}", "active": "true" if l["running"] else "false",
             "static": "true", "dynamic": "false", "disabled": "false", "comment": ""} for i, l in enumerate(LINES)]
    rows.append({"dst-address": "192.168.88.0/24", "gateway": "bridge-lan", "distance": "0", "routing-table": "main",
                 "active": "true", "static": "false", "dynamic": "true", "disabled": "false"})
    return rows


def addresses():
    rows = [{"interface": "bridge-lan", "actual-interface": "bridge-lan", "address": "192.168.88.1/24",
             "network": "192.168.88.0"}]
    for i, l in enumerate(LINES):
        if l["running"]:
            rows.append({"interface": l["name"], "actual-interface": l["name"],
                         "address": f"100.{64 + i // 250}.{i % 250}.2/32", "network": f"100.{64 + i // 250}.{i % 250}.1"})
    return rows


def mangle():
    rows = []
    for i, l in enumerate(LINES):
        rows.append({"chain": "prerouting", "action": "mark-connection", "comment": f"pcc {l['name']}",
                     "per-connection-classifier": f"both-addresses:{N}/{i}", "packets": "1000", "bytes": "100000"})
        rows.append({"chain": "prerouting", "action": "mark-routing", "new-routing-mark": f"to_{l['name']}",
                     "comment": f"route {l['name']}", "packets": "1000", "bytes": "100000"})
    return rows


def dhcp_leases():
    return [{"address": f"192.168.88.{10 + k}", "host-name": f"host-{k}", "mac-address": f"02:00:00:00:00:{k:02X}",
             "server": "dhcp-lan", "status": "bound", "last-seen": "10s", "dynamic": "true"} for k in range(12)]


def arp():
    return [{"address": f"192.168.88.{10 + k}", "mac-address": f"02:00:00:00:00:{k:02X}", "status": "reachable",
             "dynamic": "true"} for k in range(12)]


def resource():
    return {"version": "7.15.3 (stable)", "board-name": "ScaleTestROS", "architecture-name": "arm64", "cpu": "ARM",
            "cpu-count": "4", "cpu-frequency": "1400", "cpu-load": str(10 + int(time.time()) % 20),
            "total-memory": "1073741824", "free-memory": "429496729", "total-hdd-space": "134217728",
            "free-hdd-space": "16777216", "uptime": "3d4h5m6s"}


def logs():
    return [{"time": "12:00:%02d" % (k % 60), "topics": "pppoe,info", "message": f"pppoe-out{(k % N) + 1}: connected"}
            for k in range(40)]


ROUTES = {
    "system/resource": resource,
    "system/identity": lambda: {"name": f"ScaleTest-{N}WAN"},
    "system/clock": lambda: {"date": "2026-09-28", "time": time.strftime("%H:%M:%S")},
    "system/ntp/client": lambda: {"status": "synchronized"},
    "ip/dns": lambda: {"allow-remote-requests": "true", "servers": "223.5.5.5,119.29.29.29", "cache-size": "2048",
                       "cache-used": "512", "use-doh-server": "", "verify-doh-cert": "false"},
    "user/active": lambda: [{"name": "admin", "address": "192.168.88.10", "via": "rest-api", "when": "now"}],
    "interface": interfaces,
    "interface/pppoe-client": lambda: [{"name": l["name"], "running": "true" if l["running"] else "false",
                                        "interface": l["parent"], "disabled": "false"} for l in LINES],
    "ip/address": addresses,
    "ip/route": routes,
    "ip/arp": arp,
    "ip/dhcp-server": lambda: [{"name": "dhcp-lan", "interface": "bridge-lan", "address-pool": "pool-lan",
                                "lease-time": "1d", "disabled": "false"}],
    "ip/dhcp-server/lease": dhcp_leases,
    "ip/dhcp-client": lambda: [],
    "ip/pool": lambda: [{"name": "pool-lan", "ranges": "192.168.88.10-192.168.88.254"}],
    "ip/pool/used": lambda: [],
    "ip/firewall/filter": lambda: [{"chain": "input", "action": "accept", "comment": "established", "packets": "10",
                                    "bytes": "1000", "disabled": "false"}],
    "ip/firewall/address-list": lambda: [],
    "ip/firewall/mangle": mangle,
    "routing/rule": lambda: [],
    "log": logs,
    "ip/dns/static": lambda: [],
}


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, payload):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _route(self):
        path = self.path.split("?", 1)[0]
        if not path.startswith("/rest/"):
            return self._send(404, {"error": 404})
        key = path[len("/rest/"):].strip("/")
        if key.endswith("/print"):
            key = key[:-len("/print")]
        fn = ROUTES.get(key)
        if fn is None:
            return self._send(404, {"error": 404, "message": "no such command"})
        return self._send(200, fn())

    do_GET = _route
    do_POST = _route


if __name__ == "__main__":
    ThreadingHTTPServer((sys.argv[3] if len(sys.argv) > 3 else "127.0.0.1", PORT), H).serve_forever()
