"""Chaos RouterOS REST mock. Scenario is switchable at runtime via POST /_scenario {"name": ...}.

Usage: python chaos_ros.py <port>
"""
import json
import random
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1])
START = time.time()
STATE = {"name": "baseline", "t0": time.time()}
LOCK = threading.Lock()

XSS = '<img src=x onerror="window.__xss=(window.__xss||0)+1">'
XSS_ATTR = '" onmouseover="window.__xss=(window.__xss||0)+1" x="'
LONG = "超长名称" * 60 + "A" * 300
EMOJI = "宽带🚀💥👨‍👩‍👧‍👦\u202e反向\u200b零宽"


def scen():
    with LOCK:
        return STATE["name"]


def elapsed():
    return time.time() - START


def mk_iface(name, typ="pppoe-out", running=True, rx=0, tx=0, extra=None):
    row = {"name": name, "type": typ, "running": "true" if running else "false", "disabled": "false",
           "mac-address": "AA:BB:CC:00:00:01", "rx-byte": str(rx), "tx-byte": str(tx),
           "rx-packet": "1000", "tx-packet": "1000", "rx-drop": "0", "tx-drop": "0", "rx-error": "0", "tx-error": "0"}
    if extra:
        row.update(extra)
    return row


def grow(bps, i=0):
    return int(bps / 8 * elapsed()) + 1_000_000 + i


def lines_for(s):
    """Return list of (name, parent, running, down_bps, up_bps)."""
    if s in ("zero_wan", "empty_everything"):
        return []
    if s == "all_offline":
        return [(f"pppoe-out{i}", "ether2", False, 0, 0) for i in range(1, 6)]
    if s == "xss_names":
        return [(XSS, "ether2", True, 50e6, 5e6), (XSS_ATTR, "ether3", True, 40e6, 4e6),
                ("<script>window.__xss=99</script>", "ether4", True, 1e6, 1e5), ("a&b'c\"d`e", "ether5", True, 1e6, 1e5)]
    if s == "long_names":
        return [(LONG + str(i), LONG, True, 100e6, 10e6) for i in range(3)]
    if s == "unicode_names":
        return [(EMOJI + str(i), "以太网口" + str(i), True, 80e6, 8e6) for i in range(4)]
    if s == "dup_names":
        return [("pppoe-out1", "ether2", True, 100e6, 10e6)] * 3
    if s == "wan_1000":
        return [(f"pppoe-out{i}", f"vlan{i}", i % 9 != 0, (i % 50 + 1) * 1e6, (i % 7 + 1) * 1e5) for i in range(1, 1001)]
    if s == "huge_rate":
        return [("pppoe-out1", "ether2", True, 400e9, 400e9), ("pppoe-out2", "ether3", True, 1, 1)]
    if s == "hybrid_wan_all":
        # PPPoE + DHCP-client + static WAN on one router: build_wan_lines must
        # keep the non-PPPoE rows visible and put the PPPoE rows first.
        return [("pppoe-out10", "ether2", True, 60e6, 6e6), ("pppoe-out20", "ether3", True, 40e6, 4e6)]
    return [(f"pppoe-out{i}", "ether2", True, (i * 37 % 90 + 10) * 1e6, (i * 13 % 9 + 1) * 1e6) for i in range(1, 4)]


def counters(s, idx, down, up):
    if s == "counter_reset":
        # reset every 5s
        t = elapsed() % 5
        return int(down / 8 * t), int(up / 8 * t)
    if s == "counter_backwards":
        base = 10**12
        return base - grow(down, idx), base - grow(up, idx)
    if s == "counter_wrap64":
        v = (2**64 - 5_000_000 + grow(down, idx)) % (2**64)
        return v, v
    if s == "counter_frozen":
        return 123456789, 987654321
    if s == "counter_garbage":
        return "NaN", "-1e999"
    if s == "counter_negative":
        return -grow(down, idx), -grow(up, idx)
    if s == "counter_float":
        return grow(down, idx) + 0.5, "1.5e10"
    return grow(down, idx), grow(up, idx)


def interfaces(s):
    rows = [mk_iface("bridge-lan", "bridge", True, grow(10e6), grow(100e6)), mk_iface("ether1", "ether", True, grow(10e6), grow(90e6))]
    for idx, (name, parent, running, down, up) in enumerate(lines_for(s)):
        rx, tx = counters(s, idx, down, up) if running else (0, 0)
        rows.append(mk_iface(name, "pppoe-out", running, rx, tx))
    if s == "iface_missing_fields":
        rows.append({"name": "weird1"})
        rows.append({})
        rows.append({"name": None, "type": None})
    if s == "wrong_types":
        rows.append({"name": 12345, "type": ["x"], "running": {"a": 1}, "rx-byte": [1, 2], "tx-byte": {"x": 1}})
    if s == "iface_10000":
        rows += [mk_iface(f"vlan{i}", "vlan", i % 3 != 0, grow(1e5, i), grow(1e5, i)) for i in range(10000)]
    if s == "hybrid_wan_all":
        rows.append(mk_iface("ether5", "ether", True, grow(20e6), grow(2e6)))
        rows.append(mk_iface("ether6", "ether", True, grow(10e6), grow(1e6)))
    return rows


def resource(s):
    base = {"version": "7.15.3 (stable)", "board-name": "ChaosROS", "architecture-name": "arm64", "cpu": "ARM",
            "cpu-count": "4", "cpu-frequency": "1400", "cpu-load": "23", "total-memory": "1073741824",
            "free-memory": "429496729", "total-hdd-space": "134217728", "free-hdd-space": "16777216", "uptime": "3d4h5m6s"}
    if s == "resource_zero":
        base.update({"total-memory": "0", "free-memory": "0", "total-hdd-space": "0", "free-hdd-space": "0", "cpu-load": "0"})
    if s == "resource_garbage":
        base.update({"total-memory": "abc", "free-memory": "-5", "cpu-load": "250", "uptime": "garbage", "version": None})
    if s == "resource_inverted":
        base.update({"free-memory": "9999999999", "free-hdd-space": "999999999999", "cpu-load": "-40"})
    if s == "resource_empty":
        return {}
    if s == "uptime_weird":
        base.update({"uptime": "52w6d23h59m59s999ms"})
    if s == "ros_v6":
        base.update({"version": "6.49.10 (long-term)", "uptime": "1w2d03:04:05"})
    if s == "xss_names":
        base.update({"board-name": XSS, "version": XSS_ATTR, "architecture-name": "<b>x</b>"})
    if s == "long_names":
        base.update({"board-name": LONG, "version": LONG})
    return base


def clock(s):
    if s == "ros_v6":
        return {"date": "sep/28/2026", "time": "23:59:59"}
    if s == "clock_garbage":
        return {"date": "not-a-date", "time": "99:99:99"}
    if s == "clock_far_future":
        return {"date": "2099-12-31", "time": "23:59:59"}
    if s == "clock_epoch":
        return {"date": "1970-01-01", "time": "00:00:00"}
    return {"date": time.strftime("%Y-%m-%d"), "time": time.strftime("%H:%M:%S")}


def identity(s):
    if s == "xss_names":
        return {"name": XSS}
    if s == "long_names":
        return {"name": LONG}
    if s == "unicode_names":
        return {"name": EMOJI}
    return {"name": f"Chaos-{s}"}


def addresses(s):
    rows = [{"interface": "bridge-lan", "actual-interface": "bridge-lan", "address": "192.168.88.1/24", "network": "192.168.88.0"}]
    if s == "lan_20k_terminals":
        rows.append({"interface": "bridge-lan", "actual-interface": "bridge-lan", "address": "10.0.0.1/16", "network": "10.0.0.0"})
    for i, (name, parent, running, *_r) in enumerate(lines_for(s)):
        if running:
            rows.append({"interface": name, "actual-interface": name, "address": f"100.64.{i % 250}.2/32", "network": f"100.64.{i % 250}.1"})
    if s == "bad_addresses":
        rows += [{"interface": "ether1", "address": "999.1.1.1/40"}, {"interface": "ether1", "address": "not-ip"},
                 {"interface": "ether1", "address": ""}, {"interface": "ether1"}, {"address": "::1/200"}]
    if s == "dhcp_wan_mixed":
        rows.append({"interface": "ether5", "actual-interface": "ether5", "address": "203.0.113.5/24", "network": "203.0.113.0"})
    if s == "hybrid_wan_all":
        rows.append({"interface": "ether5", "actual-interface": "ether5", "address": "100.64.7.2/32", "network": "100.64.7.1"})
        rows.append({"interface": "ether6", "actual-interface": "ether6", "address": "223.255.255.6/24", "network": "223.255.255.0"})
    return rows


def routes(s):
    rows = [{"dst-address": "0.0.0.0/0", "gateway": name, "distance": "1", "routing-table": "main" if i == 0 else f"to_{name}",
             "active": "true" if running else "false", "static": "true", "dynamic": "false", "disabled": "false", "comment": name}
            for i, (name, parent, running, *_r) in enumerate(lines_for(s))]
    if s == "routes_100k":
        rows += [{"dst-address": f"10.{(i >> 16) & 255}.{(i >> 8) & 255}.{i & 255}/32", "gateway": "bridge-lan", "distance": "1",
                  "routing-table": "main", "active": "true", "static": "true", "dynamic": "false", "disabled": "false"} for i in range(100000)]
    if s == "dhcp_wan_mixed":
        rows.append({"dst-address": "0.0.0.0/0", "gateway": "203.0.113.1%ether5", "distance": "5", "routing-table": "main",
                     "active": "true", "dynamic": "true", "disabled": "false"})
    if s == "hybrid_wan_all":
        rows.append({"dst-address": "0.0.0.0/0", "gateway": "100.64.7.1%ether5", "distance": "5", "routing-table": "main",
                     "active": "true", "dynamic": "true", "disabled": "false"})
        rows.append({"dst-address": "0.0.0.0/0", "gateway": "223.255.255.1%ether6", "distance": "5", "routing-table": "main",
                     "active": "true", "static": "true", "dynamic": "false", "disabled": "false"})
    return rows


def leases(s):
    if s == "lan_20k_terminals":
        return [{"address": f"10.0.{(k >> 8) & 255}.{(k % 250) + 2}",
                 "host-name": ("TopTalker" if k == 0 else f"host-{k}"),
                 "mac-address": f"02:00:{(k >> 16) & 255:02X}:{(k >> 8) & 255:02X}:{k & 255:02X}:{(k * 3) & 255:02X}",
                 "server": "dhcp-lan", "status": "bound", "last-seen": "10s", "dynamic": "true"} for k in range(20000)]
    n = 12
    if s == "terminals_20000":
        n = 20000
    if s == "empty_everything":
        return []
    rows = [{"address": f"10.{(k >> 16) & 255}.{(k >> 8) & 255}.{k & 255}" if n > 250 else f"192.168.88.{10 + k}",
             "host-name": (XSS if s == "xss_names" else (LONG if s == "long_names" else f"host-{k}")),
             "mac-address": f"02:00:{(k >> 24) & 255:02X}:{(k >> 16) & 255:02X}:{(k >> 8) & 255:02X}:{k & 255:02X}",
             "server": "dhcp-lan", "status": "bound", "last-seen": "10s", "dynamic": "true"} for k in range(n)]
    return rows


def arp(s):
    if s == "lan_20k_terminals":
        return [{"address": f"10.0.{(k >> 8) & 255}.{(k % 250) + 2}", "mac-address": f"02:00:00:{(k >> 8) & 255:02X}:{k & 255:02X}:01",
                 "status": "reachable", "dynamic": "true"} for k in range(2000)]
    if s == "empty_everything":
        return []
    rows = [{"address": r["address"], "mac-address": r["mac-address"], "status": "reachable", "dynamic": "true"} for r in leases(s)]
    if s == "arp_conflict_storm":
        rows += [{"address": "192.168.88.50", "mac-address": f"02:AA:00:00:00:{k:02X}", "status": "reachable", "dynamic": "true"} for k in range(200)]
        rows += [{"address": f"192.168.88.{k}", "mac-address": "02:BB:00:00:00:01", "status": "stale", "dynamic": "true"} for k in range(60, 250)]
    return rows


def mangle(s):
    return [{"chain": "prerouting", "action": "mark-routing", "new-routing-mark": f"to_{n}", "comment": n, "packets": "10", "bytes": "100"}
            for n, *_r in lines_for(s)]


def logs(s):
    if s == "empty_everything":
        return []
    msg = XSS if s == "xss_names" else ("日志" * 5000 if s == "long_names" else "pppoe connected")
    n = 50000 if s == "logs_50000" else 40
    return [{"time": "12:00:%02d" % (k % 60), "topics": "system,error" if k % 5 == 0 else "pppoe,info", "message": f"{msg} #{k}"} for k in range(n)]


def dns(s):
    base = {"allow-remote-requests": "true", "servers": "223.5.5.5,119.29.29.29", "cache-size": "2048", "cache-used": "512",
            "use-doh-server": "", "verify-doh-cert": "false"}
    if s == "resource_zero":
        base.update({"cache-size": "0", "cache-used": "0"})
    if s == "xss_names":
        base.update({"servers": XSS, "use-doh-server": XSS_ATTR})
    return base


def dhcp_clients(s):
    if s in ("dhcp_wan_mixed", "hybrid_wan_all"):
        return [{"interface": "ether5", "status": "bound", "use-peer-dns": "true", "add-default-route": "true",
                 "default-route-distance": "5", "disabled": "false"}]
    return []


def filters(s):
    rows = [{"chain": "input", "action": "accept", "comment": "est", "packets": "10", "bytes": "1000", "disabled": "false"}]
    if s == "xss_names":
        rows.append({"chain": XSS, "action": "drop", "comment": XSS_ATTR, "packets": "1", "bytes": "1", "disabled": "false"})
    return rows


def dns_static(s):
    if s == "dns_static_5000":
        return [{"name": f"rule-{k}", "type": "A", "address": f"10.1.{k // 250}.{k % 250}", "ttl": "1d",
                 "comment": ("备注" * 20 if k % 7 == 0 else ""), "disabled": "true" if k % 5 == 0 else "false"} for k in range(5000)]
    return []


def user_active(s):
    if s == "xss_everything":
        return [{"name": XSS, "address": XSS_ATTR, "via": "api<img src=x onerror=window.__xss=window.__xss+1>", "when": "now"}]
    return [{"name": "admin", "address": "192.168.88.10", "via": "rest-api", "when": "now"}]


ROUTES = {
    "system/resource": resource, "system/identity": identity, "system/clock": clock,
    "system/ntp/client": lambda s: ({"status": XSS_ATTR} if s == "xss_everything" else {"status": "synchronized"}), "ip/dns": dns,
    "user/active": user_active,
    "interface": interfaces,
    "interface/pppoe-client": lambda s: [{"name": n, "running": "true" if r else "false", "interface": p, "disabled": "false"}
                                         for n, p, r, *_x in lines_for(s)],
    "ip/address": addresses, "ip/route": routes, "ip/arp": arp,
    "ip/dhcp-server": lambda s: [{"name": (XSS if s == "xss_everything" else "dhcp-lan"), "interface": "bridge-lan",
                                    "address-pool": (XSS if s == "xss_everything" else "pool-lan"), "lease-time": "1d", "disabled": "false"}],
    "ip/dhcp-server/lease": leases, "ip/dhcp-client": dhcp_clients,
    "ip/pool": lambda s: [{"name": (XSS if s == "xss_everything" else "pool-lan"), "ranges": "192.168.88.10-192.168.88.254"}], "ip/pool/used": lambda s: [],
    "ip/firewall/filter": filters,
    "ip/firewall/address-list": lambda s: ([{"list": XSS, "address": "10.9.9.9", "timeout": "1h", "comment": XSS_ATTR}]
                                            if s == "xss_everything" else []),
    "ip/firewall/mangle": mangle,
    "routing/rule": lambda s: [], "log": logs, "ip/dns/static": lambda s: [],
    # 连接跟踪/明细故意 404：逼面板回退到 SSH 通道（对应不支持这两条 REST 的 RouterOS）
}


class H(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):
        pass

    def _raw(self, code, body, ctype="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send(self, code, payload):
        self._raw(code, json.dumps(payload, ensure_ascii=False).encode())

    def _route(self):
        path = self.path.split("?", 1)[0]
        if path == "/_scenario":
            n = int(self.headers.get("Content-Length") or 0)
            body = json.loads(self.rfile.read(n) or b"{}")
            with LOCK:
                STATE["name"] = body.get("name", "baseline")
                STATE["t0"] = time.time()
            return self._send(200, {"ok": True, "name": STATE["name"]})
        if self.command == "POST":
            n = int(self.headers.get("Content-Length") or 0)
            if n:
                self.rfile.read(n)
        s = scen()
        if not path.startswith("/rest/"):
            return self._send(404, {"error": 404})
        key = path[len("/rest/"):].strip("/")
        if key.endswith("/print"):
            key = key[:-len("/print")]
        # transport-level chaos
        if s == "http_401":
            return self._send(401, {"error": 401, "message": "not authorized"})
        if s == "http_500":
            return self._send(500, {"error": 500, "message": "internal"})
        if s == "http_html":
            return self._raw(200, b"<html><body>captive portal</body></html>", "text/html")
        if s == "http_truncated_json":
            return self._raw(200, b'[{"name":"pppoe-out1","running":"tr', "application/json")
        if s == "http_empty_body":
            return self._raw(200, b"", "application/json")
        if s == "http_null":
            return self._raw(200, b"null")
        if s == "http_wrong_shape":
            return self._raw(200, b'{"unexpected": {"deeply": [1,2,3]}}')
        if s == "slow_router":
            time.sleep(15)
        if s == "slow_partial" and key in ("interface", "ip/route"):
            time.sleep(15)
        if s == "flapping" and int(elapsed()) % 4 < 2:
            return self._send(503, {"error": 503})
        if s == "hang_forever":
            time.sleep(3600)
        fn = ROUTES.get(key)
        if fn is None:
            return self._send(404, {"error": 404, "message": "no such command"})
        return self._send(200, fn(s))

    do_GET = _route
    do_POST = _route


if __name__ == "__main__":
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), H)
    srv.daemon_threads = True
    srv.serve_forever()
