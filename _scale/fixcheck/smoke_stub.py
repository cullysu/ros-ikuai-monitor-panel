"""Smoke stub: fake RouterOS REST API on :8721 and instant-reset SSH socket on :8722."""
import json
import socket
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

REST_PORT = 8721
SSH_PORT = 8722

OBJECTS = {
    "system/resource": {
        "version": "7.19.0", "board-name": "stub", "architecture-name": "x86_64",
        "cpu": "stub", "cpu-count": "2", "cpu-frequency": "2000", "cpu-load": "5",
        "total-memory": "1000000", "free-memory": "500000",
        "total-hdd-space": "1000000", "free-hdd-space": "500000", "uptime": "1d",
    },
    "system/clock": {"date": "sep/29/2026", "time": "10:00:00"},
    "system/ntp/client": {"status": "synchronized"},
    "ip/dns": {"allow-remote-requests": "true", "servers": "", "cache-size": "0", "cache-used": "0"},
    "system/identity": {"name": "stub-ros"},
}

LISTS = {
    "user/active": [],
    "interface": [
        {"name": "ether1", "type": "ether", "running": "true", "disabled": "false",
         "mac-address": "00:11:22:33:44:55", "rx-byte": "1000", "tx-byte": "2000",
         "rx-packet": "10", "tx-packet": "20", "rx-drop": "0", "tx-drop": "0",
         "rx-error": "0", "tx-error": "0"},
    ],
    "interface/pppoe-client": [],
    "ip/address": [{"interface": "bridge", "actual-interface": "bridge", "address": "192.168.88.1/24", "network": "192.168.88.0"}],
    "ipv6/address": [],
    "ip/route": [{"dst-address": "0.0.0.0/0", "gateway": "192.168.88.254", "distance": "1", "routing-table": "main", "active": "true"}],
    "ip/arp": [],
    "ipv6/nd": [],
    "ipv6/dhcp-client": [],
    "ip/dhcp-server": [],
    "ip/dhcp-server/lease": [],
    "ip/dhcp-client": [],
    "ip/pool": [],
    "ip/pool/used": [],
    "ip/firewall/filter": [],
    "ip/firewall/address-list": [],
    "ip/firewall/mangle": [],
    "ip/firewall/connection": [],
    "routing/rule": [],
    "log": [],
    "ip/dns/static": [],
}


class RestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?")[0].strip("/")
        rest_path = path[len("rest/"):] if path.startswith("rest/") else path
        if rest_path in OBJECTS:
            body = OBJECTS[rest_path]
        elif rest_path in LISTS:
            body = LISTS[rest_path]
        else:
            body = []
        data = json.dumps(body).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


def ssh_stub():
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(("127.0.0.1", SSH_PORT))
    srv.listen(8)
    while True:
        try:
            conn, _ = srv.accept()
            conn.close()  # instant reset: SSH probe fails fast
        except OSError:
            return


if __name__ == "__main__":
    threading.Thread(target=ssh_stub, daemon=True).start()
    httpd = ThreadingHTTPServer(("127.0.0.1", REST_PORT), RestHandler)
    print(f"stub ready rest=:{REST_PORT} ssh=:{SSH_PORT}", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        sys.exit(0)
