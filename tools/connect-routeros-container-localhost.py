#!/usr/bin/env python3
"""Forward 127.0.0.1:28646 to a RouterOS Container panel target."""

from __future__ import annotations

import argparse
import select
import socket
import threading


def pipe(left: socket.socket, right: socket.socket) -> None:
    sockets = [left, right]
    try:
        while True:
            readable, _, _ = select.select(sockets, [], [])
            for src in readable:
                data = src.recv(65536)
                if not data:
                    return
                dst = right if src is left else left
                dst.sendall(data)
    finally:
        for sock in sockets:
            try:
                sock.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            sock.close()


def handle(client: socket.socket, target_host: str, target_port: int) -> None:
    try:
        upstream = socket.create_connection((target_host, target_port), timeout=10)
    except OSError:
        client.close()
        return
    pipe(client, upstream)


def main() -> None:
    parser = argparse.ArgumentParser(description="Expose a RouterOS Container panel on local loopback.")
    parser.add_argument("--listen-host", default="127.0.0.1")
    parser.add_argument("--listen-port", type=int, default=28646)
    parser.add_argument("--target-host", default="172.18.0.2")
    parser.add_argument("--target-port", type=int, default=28646)
    args = parser.parse_args()

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((args.listen_host, args.listen_port))
    server.listen(50)
    print(
        f"RouterOS panel localhost forwarder: http://{args.listen_host}:{args.listen_port}/ "
        f"-> {args.target_host}:{args.target_port}",
        flush=True,
    )
    try:
        while True:
            client, _ = server.accept()
            thread = threading.Thread(
                target=handle,
                args=(client, args.target_host, args.target_port),
                daemon=True,
            )
            thread.start()
    except KeyboardInterrupt:
        pass
    finally:
        server.close()


if __name__ == "__main__":
    main()
