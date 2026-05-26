#!/usr/bin/env python3
"""Expose a RouterOS Container panel through a client-local HTTP forwarder."""

from __future__ import annotations

import argparse
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
}


def build_handler(target_host: str, target_port: int, listen_host: str, listen_port: int, forward_token: str):
    class RouterOsPanelForwarder(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"
        server_version = "RouterOSPanelLocalForwarder/1.0"

        def proxy(self) -> None:
            length = int(self.headers.get("Content-Length") or 0)
            body = self.rfile.read(length) if length else None
            headers = {
                key: value
                for key, value in self.headers.items()
                if key.lower() not in HOP_BY_HOP_HEADERS and key.lower() not in {"host", "content-length"}
            }
            headers["Host"] = f"{listen_host}:{listen_port}"
            headers["X-Ros-Panel-Localhost-Forward"] = forward_token
            if body is not None:
                headers["Content-Length"] = str(len(body))

            conn = http.client.HTTPConnection(target_host, target_port, timeout=30)
            try:
                conn.request(self.command, self.path, body=body, headers=headers)
                response = conn.getresponse()
                payload = response.read()
                self.send_response(response.status, response.reason)
                for key, value in response.getheaders():
                    if key.lower() not in HOP_BY_HOP_HEADERS and key.lower() != "content-length":
                        self.send_header(key, value)
                self.send_header("Content-Length", str(len(payload)))
                self.send_header("Connection", "close")
                self.end_headers()
                self.wfile.write(payload)
            finally:
                conn.close()

        def do_GET(self) -> None:
            self.proxy()

        def do_HEAD(self) -> None:
            self.proxy()

        def do_POST(self) -> None:
            self.proxy()

        def do_PUT(self) -> None:
            self.proxy()

        def do_DELETE(self) -> None:
            self.proxy()

        def log_message(self, fmt: str, *args) -> None:
            print(f"{self.address_string()} - {fmt % args}", flush=True)

    return RouterOsPanelForwarder


def main() -> None:
    parser = argparse.ArgumentParser(description="Expose a RouterOS Container panel on local loopback.")
    parser.add_argument("--listen-host", default="127.0.0.1")
    parser.add_argument("--listen-port", type=int, default=28646)
    parser.add_argument("--target-host", default="172.18.0.2")
    parser.add_argument("--target-port", type=int, default=28646)
    parser.add_argument("--forward-token", required=True, help="Must match ROS_PANEL_LOCALHOST_FORWARD_TOKEN in the RouterOS container envlist.")
    args = parser.parse_args()

    handler = build_handler(args.target_host, args.target_port, args.listen_host, args.listen_port, args.forward_token)
    server = ThreadingHTTPServer((args.listen_host, args.listen_port), handler)
    print(
        f"RouterOS panel localhost forwarder: http://{args.listen_host}:{args.listen_port}/ "
        f"-> {args.target_host}:{args.target_port}",
        flush=True,
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
