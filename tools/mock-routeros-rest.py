"""Mock RouterOS REST/SSH endpoints for Android app emulator testing.

Serves realistic RouterOS 7 REST JSON with Basic auth on:
  127.0.0.1:8081  (HTTP)
  127.0.0.1:8443  (HTTPS, self-signed cert tools/mock-routeros-cert.pem)
  127.0.0.1:2222  (SSH banner only)

Credentials: paneltest / paneltest. The emulator reaches these via 10.0.2.2.
Interface byte counters scale with wall-clock time so repeated polls produce
non-zero rates.
"""
import base64
import json
import ssl
import socket
import socketserver
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

USER = "paneltest"
PASSWORD = "paneltest"
HTTP_PORT = 8081
HTTPS_PORT = 8443
SSH_PORT = 2222


def counters():
    now = int(time.time())
    return {
        "ether1": (now * 105_000_000, now * 8_000_000),
        "pppoe-out1": (now * 92_000_000, now * 6_500_000),
        "ether2": (now * 400_000, now * 900_000),
    }


def payload(path):
    counters_now = counters()
    if path == "/rest/system/resource":
        return {
            "cpu-load": "3",
            "free-memory": "419430400",
            "total-memory": "1073741824",
            "free-hdd-space": "16777216",
            "total-hdd-space": "134217728",
            "version": "7.15.3 (stable)",
            "board-name": "RB5009UG+S+",
            "architecture-name": "arm64",
            "uptime": "3d4h5m6s",
        }
    if path == "/rest/system/identity":
        return {".id": "*1", "name": "MockROS"}
    if path == "/rest/interface":
        ether1_rx, ether1_tx = counters_now["ether1"]
        pppoe_rx, pppoe_tx = counters_now["pppoe-out1"]
        ether2_rx, ether2_tx = counters_now["ether2"]
        return [
            {".id": "*1", "name": "ether1", "type": "ether", "running": True, "disabled": False,
             "mac-address": "AA:BB:CC:00:00:01", "rx-byte": str(ether1_rx), "tx-byte": str(ether1_tx)},
            {".id": "*2", "name": "pppoe-out1", "type": "pppoe-out", "running": True, "disabled": False,
             "mac-address": "", "rx-byte": str(pppoe_rx), "tx-byte": str(pppoe_tx)},
            {".id": "*3", "name": "ether2", "type": "ether", "running": False, "disabled": False,
             "mac-address": "AA:BB:CC:00:00:02", "rx-byte": str(ether2_rx), "tx-byte": str(ether2_tx)},
        ]
    if path == "/rest/interface/pppoe-client":
        return [
            {".id": "*A", "name": "pppoe-out1", "interface": "ether1", "running": True, "disabled": False},
        ]
    if path == "/rest/ip/address":
        return [
            {".id": "*2", "interface": "pppoe-out1", "actual-interface": "pppoe-out1",
             "address": "100.64.10.2/32", "network": "100.64.10.1"},
        ]
    if path == "/rest/ip/route":
        return [
            {".id": "*1", "dst-address": "0.0.0.0/0", "gateway": "100.64.10.1", "distance": "1",
             "active": True, "dynamic": True, "static": False},
        ]
    if path == "/rest/ip/arp":
        return [
            {".id": "*1", "address": "192.168.10.23", "mac-address": "11:22:33:44:55:66",
             "status": "reachable", "dynamic": True},
            {".id": "*2", "address": "192.168.10.30", "mac-address": "AA:BB:CC:DD:EE:01",
             "status": "reachable", "dynamic": True},
        ]
    if path == "/rest/ip/dhcp-server/lease":
        return [
            {".id": "*1", "address": "192.168.10.23", "host-name": "living-tv",
             "mac-address": "11:22:33:44:55:66", "status": "bound", "dynamic": True},
            {".id": "*2", "address": "192.168.10.30", "host-name": "study-pc",
             "mac-address": "AA:BB:CC:DD:EE:01", "status": "bound", "dynamic": False},
        ]
    return None


class RestHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _reply(self, status, body):
        data = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        header = self.headers.get("Authorization", "")
        expected = "Basic " + base64.b64encode(f"{USER}:{PASSWORD}".encode()).decode()
        if header != expected:
            self._reply(401, {"message": "unauthorized", "error": 401})
            return
        body = payload(self.path.split("?")[0])
        if body is None:
            self._reply(404, {"message": "not found", "error": 404})
            return
        self._reply(200, body)

    def log_message(self, fmt, *args):
        print("[mock-rest]", fmt % args, flush=True)


class SshBannerHandler(socketserver.BaseRequestHandler):
    def handle(self):
        try:
            self.request.sendall(b"SSH-2.0-OpenSSH_9.6\r\n")
            time.sleep(0.5)
        except OSError:
            pass


class SshServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    http_server = ThreadingHTTPServer(("127.0.0.1", HTTP_PORT), RestHandler)
    threading.Thread(target=http_server.serve_forever, daemon=True).start()
    print(f"[mock] HTTP REST on http://127.0.0.1:{HTTP_PORT}", flush=True)

    https_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    https_context.load_cert_chain("tools/mock-routeros-cert.pem", "tools/mock-routeros-key.pem")
    https_server = ThreadingHTTPServer(("127.0.0.1", HTTPS_PORT), RestHandler)
    https_server.socket = https_context.wrap_socket(https_server.socket, server_side=True)
    threading.Thread(target=https_server.serve_forever, daemon=True).start()
    print(f"[mock] HTTPS REST (self-signed) on https://127.0.0.1:{HTTPS_PORT}", flush=True)

    ssh_server = SshServer(("127.0.0.1", SSH_PORT), SshBannerHandler)
    threading.Thread(target=ssh_server.serve_forever, daemon=True).start()
    print(f"[mock] SSH banner on 127.0.0.1:{SSH_PORT}", flush=True)

    print("[mock] ready; press Ctrl+C to stop", flush=True)
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
